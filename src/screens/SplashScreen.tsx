import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Platform, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { palette } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';

const DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const UI = Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' });

/**
 * Minimal splash — no ImageBackground (avoids native decode crashes on some devices).
 * Navigates once to Onboarding or MainTabs after a short delay.
 */
export function SplashScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const onboardingDone = useGameStore((s) => s.onboardingDone);
  const hydrated = useGameStore((s) => s.hydrated);
  const fade = useRef(new Animated.Value(0)).current;
  const left = useRef(false);

  const goNext = () => {
    if (left.current) return;
    left.current = true;
    const target: keyof RootStackParamList = onboardingDone ? 'MainTabs' : 'Onboarding';
    try {
      nav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: target }],
        }),
      );
    } catch (e) {
      console.warn('splash nav failed', e);
      left.current = false;
      try {
        nav.replace(target);
      } catch (e2) {
        console.warn('splash replace failed', e2);
      }
    }
  };

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);

  useEffect(() => {
    const delay = hydrated ? 900 : 1800;
    const t = setTimeout(goNext, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboardingDone]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#141018', '#0A0C10', '#080A0E']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.center,
          { paddingTop: insets.top + 40, opacity: fade },
        ]}
      >
        <Text style={styles.kicker}>THE SEALED ARCHIVE</Text>
        <Text style={styles.title}>RUNE{'\n'}VAULT</Text>
        <Text style={styles.sub}>Origins · Five Essences</Text>
      </Animated.View>
      <Pressable style={[styles.skip, { bottom: insets.bottom + 28 }]} onPress={goNext}>
        <Text style={styles.skipText}>Tap to enter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0C10' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  kicker: {
    color: palette.gold,
    letterSpacing: 4,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: UI,
    marginBottom: 14,
  },
  title: {
    color: '#F4EBD4',
    fontSize: 56,
    lineHeight: 58,
    fontFamily: DISPLAY,
    fontWeight: '700',
  },
  sub: { color: '#B8B0A0', marginTop: 14, fontSize: 15, fontFamily: UI },
  skip: { position: 'absolute', alignSelf: 'center' },
  skipText: { color: '#C9A84C', fontWeight: '700', letterSpacing: 1, fontFamily: UI },
});
