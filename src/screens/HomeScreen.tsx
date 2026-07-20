import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ImageBackground, ScrollView } from 'react-native';
import { useGameStore, validateDeck } from '../store/gameStore';
import { palette } from '../theme/colors';
import { type, fonts } from '../theme/typography';
import { radii, shadows, motion } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Panel } from '../components/Panel';
import { VaultButton } from '../components/VaultButton';
import { RootStackParamList } from '../navigation/types';
import { STORY_CHAPTERS } from '../data/story';

export function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { gold, wins, losses, packsOpened, startBattle, deck, owned, storyCleared } = useGameStore();
  const safeDeck = Array.isArray(deck) ? deck : [];
  const safeOwned = owned && typeof owned === 'object' ? owned : {};
  const deckErr = validateDeck(safeDeck, safeOwned);
  const clearedCount = Array.isArray(storyCleared) ? storyCleared.length : 0;
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const [coinOpen, setCoinOpen] = useState(false);
  const [coinResult, setCoinResult] = useState<'player' | 'enemy' | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: motion.slow + 280, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: motion.slow + 280, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const beginBattle = () => {
    const err = validateDeck(safeDeck, safeOwned);
    if (err) {
      Alert.alert('Deck not ready', err + '\n\nOpen Deck Builder to fix it.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCoinResult(null);
    setCoinOpen(true);
    spin.setValue(0);
    const winner: 'player' | 'enemy' = Math.random() < 0.5 ? 'player' : 'enemy';
    Animated.timing(spin, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCoinResult(winner);
    });
  };

  const confirmCoin = () => {
    if (!coinResult) return;
    const firstPlayer = coinResult;
    setCoinOpen(false);
    const ok = startBattle({ firstPlayer });
    if (!ok) {
      Alert.alert('Cannot start', 'Battle failed to start. Try again or rebuild your deck.');
      return;
    }
    nav.navigate('Battle');
  };

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <ImageBackground
      source={require('../../assets/ui/bg-home-vault.png')}
      style={styles.root}
      imageStyle={styles.bgImage}
    >
      <LinearGradient
        colors={['rgba(7,10,15,0.30)', 'rgba(7,10,15,0.68)', 'rgba(7,10,15,0.96)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar — vault mark + how-to-play + gold balance */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => nav.navigate('Rules')}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="How to Play"
          >
            <Icon name="rules" size={17} color={palette.textMuted} />
          </Pressable>
          <View style={styles.goldPill}>
            <Icon name="gold" size={14} color={palette.goldBright} />
            <Text style={styles.goldPillText}>{gold}</Text>
          </View>
        </View>

        <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: rise }] }]}>
          <Text style={styles.kicker}>ORIGINS SET</Text>
          <Text style={styles.title}>RUNE{'\n'}VAULT</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Five Essences. One sealed vault.</Text>

          <View style={styles.ctaBlock}>
            <VaultButton label="Enter Battle" icon="battle" onPress={beginBattle} style={styles.ctaPrimary} />
            <Text style={styles.ctaHint}>Skirmish · the coin decides who leads</Text>

            <Pressable
              onPress={() => nav.navigate('Story')}
              style={({ pressed }) => [styles.storyCard, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel="Continue Story"
            >
              <LinearGradient
                colors={['rgba(30,39,56,0.9)', 'rgba(16,21,30,0.94)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.storyIconWrap}>
                <Icon name="story" size={18} color={palette.gold} />
              </View>
              <View style={styles.storyTextCol}>
                <Text style={styles.storyTitle}>Continue Story</Text>
                <Text style={styles.storyMeta}>
                  {clearedCount}/{STORY_CHAPTERS.length} chapters sealed
                </Text>
              </View>
              <Icon name="forward" size={16} color={palette.goldDim} />
            </Pressable>
          </View>

          {!!deckErr && (
            <View style={styles.warningChip}>
              <Icon name="warning" size={14} color={palette.danger} />
              <Text style={styles.warningText}>{deckErr}</Text>
            </View>
          )}

          <Panel style={styles.statsStrip}>
            <StatItem label="Gold" value={String(gold)} icon="gold" />
            <View style={styles.statDivider} />
            <StatItem label="Record" value={`${wins}–${losses}`} icon="trophy" />
            <View style={styles.statDivider} />
            <StatItem label="Packs" value={String(packsOpened)} icon="pack" />
            <View style={styles.statDivider} />
            <StatItem label="Deck" value={`${safeDeck.length}/40`} icon="deck" />
          </Panel>
        </Animated.View>
      </ScrollView>

      <Modal visible={coinOpen} transparent animationType="fade">
        <View style={styles.coinBackdrop}>
          <View style={styles.coinCard}>
            <LinearGradient
              colors={['rgba(30,39,56,0.97)', 'rgba(10,13,18,0.99)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={type.kicker}>THE VAULT DECIDES</Text>
            <Text style={styles.coinTitle}>Vault Coin</Text>
            <Text style={styles.coinHint}>Who breaks the seal first?</Text>
            <Animated.View style={[styles.coinDisk, { transform: [{ rotate }] }]}>
              <LinearGradient colors={['#F0D78A', '#C9A84C', '#8A6A28']} style={styles.coinFace}>
                <Icon name="dust" size={38} color="#1A1200" />
              </LinearGradient>
            </Animated.View>
            {coinResult ? (
              <>
                <Text style={styles.coinResult}>
                  {coinResult === 'player' ? 'You lead the duel' : 'The foe leads the duel'}
                </Text>
                <VaultButton label="Begin" icon="play" onPress={confirmCoin} style={styles.coinBtn} />
              </>
            ) : (
              <Text style={styles.coinSpinning}>The coin turns…</Text>
            )}
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: 'gold' | 'trophy' | 'pack' | 'deck' }) {
  return (
    <View style={styles.statItem}>
      <Icon name={icon} size={13} color={palette.goldDim} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgDeep },
  bgImage: { opacity: 0.92 },
  content: { paddingHorizontal: 22 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.22)',
    backgroundColor: 'rgba(16,21,30,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.30)',
    backgroundColor: 'rgba(16,21,30,0.7)',
  },
  goldPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: palette.goldBright,
  },
  hero: { flex: 1, justifyContent: 'center', paddingTop: 20 },
  kicker: {
    ...type.kicker,
    letterSpacing: 4,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.displayBlack,
    color: '#F4EBD4',
    fontSize: 54,
    lineHeight: 53,
    letterSpacing: 2,
  },
  titleRule: {
    width: 64,
    height: 2,
    backgroundColor: palette.gold,
    marginTop: 16,
    marginBottom: 14,
    opacity: 0.8,
  },
  subtitle: {
    fontFamily: fonts.displayMedium,
    color: '#CFC6B2',
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 34,
    maxWidth: 280,
  },
  ctaBlock: { gap: 10, marginBottom: 18 },
  ctaPrimary: { paddingVertical: 17 },
  ctaHint: {
    ...type.caption,
    textAlign: 'center',
    marginTop: -2,
    marginBottom: 6,
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.24)',
    paddingVertical: 14,
    paddingHorizontal: 15,
    overflow: 'hidden',
  },
  storyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.30)',
    backgroundColor: 'rgba(212,168,75,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyTextCol: { flex: 1 },
  storyTitle: {
    fontFamily: fonts.display,
    color: palette.goldBright,
    fontSize: 16,
    letterSpacing: 0.6,
  },
  storyMeta: { ...type.caption, marginTop: 2 },
  warningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(196,69,54,0.45)',
    backgroundColor: 'rgba(196,69,54,0.10)',
    marginBottom: 14,
  },
  warningText: {
    fontFamily: fonts.bodyMedium,
    color: '#E8A090',
    fontSize: 12,
    flexShrink: 1,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  statItem: { alignItems: 'center', gap: 3, flex: 1 },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: palette.text,
  },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textMuted,
  },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(120,140,170,0.16)' },
  coinBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  coinCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.4)',
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.deep,
  },
  coinTitle: {
    fontFamily: fonts.displayBlack,
    color: palette.goldBright,
    fontSize: 24,
    letterSpacing: 1,
    marginTop: 6,
  },
  coinHint: { ...type.caption, marginTop: 6, marginBottom: 22 },
  coinDisk: { width: 110, height: 110, marginBottom: 20 },
  coinFace: {
    flex: 1,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF4C8',
    ...shadows.goldGlow,
  },
  coinSpinning: { ...type.caption },
  coinResult: {
    fontFamily: fonts.display,
    color: '#F4EBD4',
    fontSize: 17,
    letterSpacing: 0.6,
    marginBottom: 16,
    textAlign: 'center',
  },
  coinBtn: { paddingHorizontal: 40 },
});
