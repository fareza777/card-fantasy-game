import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { palette } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';

const { width: W } = Dimensions.get('window');
const DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const UI = Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' });

const PAGES = [
  {
    kicker: 'THE VAULT',
    title: 'Five Essences\nbound in stone',
    body: 'Dawn, Tide, Shade, Ember, and Thorn wait behind sealed Domains. Exhaust them for Essence — then spend it to summon Units and shape the duel.',
  },
  {
    kicker: 'SPELLCRAFT',
    title: 'Sigils flash.\nCanticles chant.',
    body: 'Sigils are instant — cast in combat or as a response. Canticles are sorcery — only on your Main phases. Timing is half the victory.',
  },
  {
    kicker: 'THE DUEL',
    title: 'Coin. Combat.\nCatalog.',
    body: 'Skirmishes begin with a Vault Coin. Declare attackers, assign blockers, and send spent runes to the Ashwell. Story chapters teach the Hollow Archivist’s war.',
  },
];

export function OnboardingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const setOnboardingDone = useGameStore((s) => s.setOnboardingDone);
  const [page, setPage] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  // ambient disabled (noop provider)

  const go = (next: number) => {
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setPage(next);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const finish = () => {
    setOnboardingDone();
    nav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  };

  const p = PAGES[page];
  const last = page === PAGES.length - 1;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#141018', '#0A0C10', '#080A0E']} style={StyleSheet.absoluteFill} />
      <View style={[styles.runeRing, { top: insets.top + 40 }]} />
      <Animated.View
        style={[
          styles.body,
          {
            paddingTop: insets.top + 72,
            paddingBottom: insets.bottom + 24,
            opacity: fade,
          },
        ]}
      >
        <Text style={styles.kicker}>{p.kicker}</Text>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.copy}>{p.body}</Text>

        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>

        <View style={styles.row}>
          {!last ? (
            <Pressable onPress={finish} style={styles.ghost}>
              <Text style={styles.ghostText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={{ width: 72 }} />
          )}
          <Pressable
            onPress={() => (last ? finish() : go(page + 1))}
            style={styles.next}
          >
            <LinearGradient colors={['#E8C878', '#C9A84C']} style={styles.nextInner}>
              <Text style={styles.nextText}>{last ? 'Enter the Vault' : 'Continue'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0C10' },
  runeRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: W * 0.72,
    height: W * 0.72,
    borderRadius: W,
    borderWidth: 1,
    borderColor: '#C9A84C33',
  },
  body: { flex: 1, paddingHorizontal: 28, justifyContent: 'flex-end' },
  kicker: {
    color: palette.gold,
    letterSpacing: 3,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: UI,
    marginBottom: 12,
  },
  title: {
    color: '#F4EBD4',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: DISPLAY,
    fontWeight: '700',
    marginBottom: 16,
  },
  copy: {
    color: '#B8B0A0',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: UI,
    maxWidth: 340,
    marginBottom: 28,
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A4252',
  },
  dotOn: { backgroundColor: palette.gold, width: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ghost: { paddingVertical: 14, paddingHorizontal: 8 },
  ghostText: { color: palette.textMuted, fontWeight: '700', fontFamily: UI },
  next: { borderRadius: 14, overflow: 'hidden', minWidth: 168 },
  nextInner: { paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
  nextText: { color: '#1A1200', fontWeight: '900', fontSize: 15, fontFamily: DISPLAY },
});
