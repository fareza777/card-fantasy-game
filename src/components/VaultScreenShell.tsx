import React from 'react';
import { View, StyleSheet, ImageBackground, ImageSourcePropType, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../theme/colors';

type Props = {
  children: React.ReactNode;
  /** Background art, e.g. require('../../assets/ui/bg-home-vault.png'). Omit for a flat vault fill. */
  bgImage?: ImageSourcePropType;
  /** Opacity of the background art (the gradient still tints on top). */
  bgOpacity?: number;
  /** Gradient tint drawn over the background, top → bottom. */
  gradientColors?: readonly [string, string, ...string[]];
  /** Convenience — usually `insets.top + N`. */
  paddingTop?: number;
  style?: ViewStyle;
};

/**
 * Reusable vault-tone shell: optional background art + LinearGradient fill + content.
 * Default scrim keeps art readable up top and melts into deep vault black at the
 * bottom so content always sits on a quiet surface.
 */
export function VaultScreenShell({
  children,
  bgImage,
  bgOpacity = 0.35,
  gradientColors = ['rgba(7,10,15,0.62)', 'rgba(7,10,15,0.85)', 'rgba(7,10,15,0.97)'],
  paddingTop = 0,
  style,
}: Props) {
  const content = (
    <>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[styles.content, { paddingTop }, style]}>{children}</View>
    </>
  );

  if (bgImage) {
    return (
      <ImageBackground source={bgImage} style={styles.root} imageStyle={{ opacity: bgOpacity }}>
        {content}
      </ImageBackground>
    );
  }

  return <View style={[styles.root, { backgroundColor: palette.bgDeep }]}>{content}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
