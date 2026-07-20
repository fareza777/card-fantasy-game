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
import { getCard } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { CardZoomModal } from '../components/CardZoomModal';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { useGameStore } from '../store/gameStore';
import { palette } from '../theme/colors';
import { CardDef } from '../types/card';

const W = Dimensions.get('window').width;

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
        <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.title}>No pack</Text>
          <Pressable onPress={() => nav.goBack()} style={styles.btn}>
            <Text style={styles.btnText}>Back</Text>
          </Pressable>
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
      gradientColors={['#0A0C10EE', '#141018CC', '#0A0C10F5']}
    >
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <Text style={styles.title}>Origins Booster</Text>
        <Text style={styles.sub}>
          {stage === 'pack' ? 'Tap the pack to tear the seal' : stage === 'opening' ? 'Breaking the seal…' : 'Hold a card to inspect'}
        </Text>

        {(stage === 'pack' || stage === 'opening') && (
          <Pressable onPress={stage === 'pack' ? openPack : undefined} style={styles.packStage}>
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
            {stage === 'pack' && <Text style={styles.tapHint}>Tap to open</Text>}
          </Pressable>
        )}

        {stage === 'cards' && (
          <ScrollView contentContainerStyle={styles.grid}>
            {cards.map((c, idx) =>
              idx < revealed ? (
                <View key={`${c.id}-${idx}`} style={styles.cardSlot}>
                  <CardView card={c} width={(W - 48) / 2} onLongPress={() => setZoom(c)} />
                  {lastPackIsNew?.[idx] && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View key={`back-${idx}`} style={[styles.back, { width: (W - 48) / 2 }]}>
                  <Text style={styles.backText}>RV</Text>
                </View>
              ),
            )}
          </ScrollView>
        )}

        {done && (
          <Pressable onPress={() => nav.goBack()} style={styles.btn}>
            <Text style={styles.btnText}>Add to Vault</Text>
          </Pressable>
        )}
        <CardZoomModal card={zoom} visible={!!zoom} onClose={() => setZoom(null)} />
      </View>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12 },
  title: { color: palette.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: palette.gold, textAlign: 'center', marginBottom: 12, marginTop: 4, fontSize: 13 },
  packStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  packArt: {
    width: Math.min(W - 48, 280),
    height: Math.min(W - 48, 280) * 1.35,
    borderRadius: 16,
  },
  packSheen: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  tapHint: {
    marginTop: 18,
    color: palette.textMuted,
    letterSpacing: 1,
    fontWeight: '700',
    fontSize: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 20 },
  cardSlot: { position: 'relative' },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    backgroundColor: palette.danger,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 5,
    elevation: 5,
  },
  newBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  back: {
    height: ((W - 48) / 2) * 1.55,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#1A1520',
    borderWidth: 2,
    borderColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: palette.gold, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  btn: {
    marginHorizontal: 4,
    marginBottom: 4,
    backgroundColor: palette.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#1A1200', fontWeight: '900', fontSize: 16 },
});
