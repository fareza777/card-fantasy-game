import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Emphasized panel with a gold hairline — for hero content. */
  elevated?: boolean;
};

/**
 * Standard surface: subtle vertical gradient + hairline border.
 * Replaces the flat bgPanel rectangle pattern across all screens.
 */
export function Panel({ children, style, elevated = false }: Props) {
  return (
    <View
      style={[
        styles.base,
        elevated && styles.elevated,
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(30,39,56,0.85)', 'rgba(18,24,34,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radii.lg }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.14)',
    overflow: 'hidden',
  },
  elevated: {
    borderColor: 'rgba(212,168,75,0.28)',
  },
});
