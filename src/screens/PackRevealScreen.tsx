import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getCard } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { CardZoomModal } from '../components/CardZoomModal';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { VaultButton } from '../components/VaultButton';
import { Icon } from '../components/Icon';
import { useGameStore } from '../store/gameStore';
import { palette } from '../theme/colors';
import { type, fonts } from '../theme/typography';
import { radii, shadows, motion } from '../theme/tokens';
import { CardDef } from '../types/card';

const W = Dimensions.get('window').width;

/** Fades + rises each card as it is revealed. */
function RevealIn({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function PackRevealScreen() {
  const insets = useSafeAreaInsets();
  const lastPack = useGameStore((s) => s.lastPack);
  const lastPackIsNew = useGameStore((s) => s.lastPackIsNew);
  const nav = useNavigation();
  const [stage, setStage] = useState<'pack' | 'opening' | 'cards'>('pack');
  const [revealed, setRevealed] = useState(0);
  const [zoom, setZoom] = useState<CardDef | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setStage('pack');
    setRevealed(0);
    spin.setValue(0);
    scale.setValue(1);
    tilt.setValue(0);
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    idle.start();
    return () => idle.stop();
  }, [lastPack, spin, scale, tilt]);

  const openPack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStage('opening');
    Animated.parallel([
      Animated.timing(spin, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.2, duration: 420, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setStage('cards');
      if (!lastPack?.length) return;
      let i = 0;
      const t = setInterval(() => {
        i += 1;
        setRevealed(i);
        if (i >= lastPack.length) clearInterval(t);
      }, 380);
    });
  };

  if (!lastPack?.length) {
    return (
      <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
        <View style={[styles.root, styles.emptyRoot, { paddingTop: insets.top + 24 }]}>
          <Icon name="pack" size={30} color={palette.goldDim} />
          <Text style={styles.emptyTitle}>No pack</Text>
          <VaultButton label="Back" variant="secondary" onPress={() => nav.goBack()} />
        </View>
      </VaultScreenShell>
    );
  }

  const cards = lastPack.map(getCard);
  const done = stage === 'cards' && revealed >= cards.length;
  const rotateY = tilt.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] });
  const openRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] });

  return (
    <VaultScreenShell
      bgImage={require('../../assets/ui/bg-home-vault.png')}
      bgOpacity={0.2}
      gradientColors={['rgba(7,10,15,0.90)', 'rgba(16,12,20,0.85)', 'rgba(7,10,15,0.97)']}
    >
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <Text style={[type.kicker, styles.headerKicker]}>ORIGINS SET</Text>
        <Text style={styles.title}>Booster Pack</Text>
        <Text style={styles.sub}>
          {stage === 'pack'
            ? 'Tap the pack to tear the seal'
            : stage === 'opening'
              ? 'Breaking the seal…'
              : 'Hold a card to inspect'}
        </Text>

        {(stage === 'pack' || stage === 'opening') && (
          <Pressable onPress={stage === 'pack' ? openPack : undefined} style={styles.packStage}>
            <View style={styles.packGlow} pointerEvents="none" />
            <Animated.View
              style={{
                transform: [
                  { perspective: 900 },
                  { rotateY: stage === 'pack' ? rotateY : openRotate },
                  { scale },
                ],
              }}
            >
              <Image
                source={require('../../assets/ui/booster-pack-origins.png')}
                style={styles.packArt}
                resizeMode="contain"
              />
              <LinearGradient colors={['transparent', '#D4A84B33', 'transparent']} style={styles.packSheen} />
            </Animated.View>
            {stage === 'pack' && (
              <View style={styles.tapHintRow}>
                <Icon name="pack" size={13} color={palette.goldDim} />
                <Text style={styles.tapHint}>Tap to open</Text>
              </View>
            )}
          </Pressable>
        )}

        {stage === 'cards' && (
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {cards.map((c, idx) =>
              idx < revealed ? (
                <RevealIn key={`${c.id}-${idx}`}>
                  <View style={styles.cardSlot}>
                    <CardView card={c} width={(W - 48) / 2} onLongPress={() => setZoom(c)} />
                    {lastPackIsNew?.[idx] && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                </RevealIn>
              ) : (
                <View key={`back-${idx}`} style={[styles.back, { width: (W - 48) / 2 }]}>
                  <LinearGradient
                    colors={['#241D2E', '#14101C']}
                    style={[StyleSheet.absoluteFill, { borderRadius: radii.md }]}
                  />
                  <Icon name="dust" size={22} color={palette.goldDim} />
                  <Text style={styles.backText}>RV</Text>
                </View>
              ),
            )}
          </ScrollView>
        )}

        {done && (
          <VaultButton
            label="Add to Vault"
            icon="check"
            onPress={() => nav.goBack()}
            style={styles.addBtn}
          />
        )}
        <CardZoomModal card={zoom} visible={!!zoom} onClose={() => setZoom(null)} />
      </View>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14 },
  emptyRoot: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyTitle: { ...type.title },
  headerKicker: { textAlign: 'center' },
  title: {
    fontFamily: fonts.displayBlack,
    color: palette.text,
    fontSize: 27,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  sub: { ...type.caption, color: palette.gold, textAlign: 'center', marginBottom: 12, marginTop: 6 },
  packStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  packGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(212,168,75,0.10)',
  },
  packArt: {
    width: Math.min(W - 48, 280),
    height: Math.min(W - 48, 280) * 1.35,
    borderRadius: radii.lg,
  },
  packSheen: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.28)',
    backgroundColor: 'rgba(16,21,30,0.8)',
  },
  tapHint: {
    color: palette.gold,
    letterSpacing: 2,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 20 },
  cardSlot: { position: 'relative' },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 5,
    elevation: 5,
    ...shadows.goldGlow,
  },
  newBadgeText: {
    color: '#1A1200',
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  back: {
    height: ((W - 48) / 2) * 1.55,
    margin: 4,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: palette.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  backText: {
    color: palette.goldDim,
    fontSize: 22,
    fontFamily: fonts.displayBlack,
    letterSpacing: 6,
  },
  addBtn: { marginHorizontal: 4, marginBottom: 4 },
});
