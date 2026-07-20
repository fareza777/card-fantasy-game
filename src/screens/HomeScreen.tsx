import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Easing,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageBackground, ScrollView } from 'react-native';
import { useGameStore, validateDeck } from '../store/gameStore';
import { palette } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { STORY_CHAPTERS } from '../data/story';

const DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const UI = Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' });

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
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const beginBattle = () => {
    const err = validateDeck(safeDeck, safeOwned);
    if (err) {
      Alert.alert('Deck not ready', err + '\n\nOpen Deck Builder to fix it.');
      return;
    }
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
        colors={['#0A0C1044', '#0A0C10AA', '#080A0EF5']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 28,
            paddingBottom: Math.max(insets.bottom, 20) + 36,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Text style={styles.kicker}>ORIGINS SET</Text>
          <Text style={styles.title}>RUNE{'\n'}VAULT</Text>
          <Text style={styles.subtitle}>Five Essences. One sealed vault.</Text>

          <View style={styles.ctaBlock}>
            <Pressable
              onPress={beginBattle}
              style={({ pressed }) => [styles.ctaPrimary, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel="Enter Battle"
            >
              <LinearGradient colors={['#E8C878', '#C9A84C', '#8A6A28']} style={styles.ctaPrimaryInner}>
                <Text style={styles.ctaPrimaryText}>Enter Battle</Text>
                <Text style={styles.ctaPrimaryHint}>Skirmish · coin decides who leads</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => nav.navigate('Story')}
              style={({ pressed }) => [styles.ctaSecondary, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Continue Story"
            >
              <Text style={styles.ctaSecondaryText}>Continue Story</Text>
              <Text style={styles.ctaSecondaryHint}>
                {clearedCount}/{STORY_CHAPTERS.length} chapters sealed
              </Text>
            </Pressable>
          </View>

          {!!deckErr && <Text style={styles.deckWarning}>{deckErr}</Text>}

          <Text style={styles.stats}>
            {gold} gold · {wins}–{losses} · {packsOpened} packs · {safeDeck.length}/40
          </Text>
        </Animated.View>
      </ScrollView>

      <Modal visible={coinOpen} transparent animationType="fade">
        <View style={styles.coinBackdrop}>
          <LinearGradient colors={['#121820F2', '#0A0C12F8']} style={styles.coinCard}>
            <Text style={styles.coinTitle}>Vault Coin</Text>
            <Text style={styles.coinHint}>Who breaks the seal first?</Text>
            <Animated.View style={[styles.coinDisk, { transform: [{ rotate }] }]}>
              <LinearGradient colors={['#F0D78A', '#C9A84C', '#8A6A28']} style={styles.coinFace}>
                <Text style={styles.coinGlyph}>✦</Text>
              </LinearGradient>
            </Animated.View>
            {coinResult ? (
              <>
                <Text style={styles.coinResult}>
                  {coinResult === 'player' ? 'You lead the duel' : 'The foe leads the duel'}
                </Text>
                <Pressable onPress={confirmCoin} style={styles.coinBtn}>
                  <Text style={styles.coinBtnText}>Begin</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.coinSpinning}>The coin turns…</Text>
            )}
          </LinearGradient>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0C10' },
  bgImage: { opacity: 0.92 },
  content: { paddingHorizontal: 22, justifyContent: 'center' },
  kicker: {
    color: palette.gold,
    letterSpacing: 4,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: UI,
    marginBottom: 10,
  },
  title: {
    color: '#F4EBD4',
    fontSize: 52,
    lineHeight: 54,
    fontFamily: DISPLAY,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  subtitle: {
    color: '#B8B0A0',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: DISPLAY,
    marginBottom: 36,
    maxWidth: 280,
  },
  ctaBlock: { gap: 12, marginBottom: 22 },
  ctaPrimary: { borderRadius: 14, overflow: 'hidden' },
  ctaPrimaryInner: { paddingVertical: 18, paddingHorizontal: 22, alignItems: 'flex-start' },
  ctaPrimaryText: {
    color: '#1A1200',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: DISPLAY,
    letterSpacing: 0.5,
  },
  ctaPrimaryHint: { color: '#3A2E10', fontSize: 12, marginTop: 4, fontFamily: UI },
  ctaSecondary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9A84C66',
    backgroundColor: '#12161ACC',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  ctaSecondaryText: {
    color: palette.goldBright,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: DISPLAY,
  },
  ctaSecondaryHint: { color: palette.textMuted, fontSize: 12, marginTop: 4, fontFamily: UI },
  deckWarning: {
    color: '#E8A090',
    fontSize: 12,
    marginBottom: 14,
    fontFamily: UI,
  },
  stats: {
    color: '#6A7280',
    fontSize: 12,
    fontFamily: UI,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  coinBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  coinCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.gold + '66',
    padding: 28,
    alignItems: 'center',
  },
  coinTitle: {
    color: palette.goldBright,
    fontSize: 22,
    fontFamily: DISPLAY,
    fontWeight: '800',
  },
  coinHint: { color: palette.textMuted, marginTop: 6, marginBottom: 22, fontFamily: UI },
  coinDisk: { width: 110, height: 110, marginBottom: 20 },
  coinFace: {
    flex: 1,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF4C8',
  },
  coinGlyph: { fontSize: 42, color: '#1A1200' },
  coinSpinning: { color: palette.textMuted, fontFamily: UI },
  coinResult: {
    color: '#F4EBD4',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: DISPLAY,
    marginBottom: 16,
    textAlign: 'center',
  },
  coinBtn: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingHorizontal: 36,
    paddingVertical: 12,
  },
  coinBtnText: { color: '#1A1200', fontWeight: '900', fontSize: 15 },
});
