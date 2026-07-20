import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../theme/colors';
import { type } from '../theme/typography';
import { radii, shadows } from '../theme/tokens';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

/**
 * The one button system for the whole app.
 * primary   — gold gradient, dark engraved label (main CTAs)
 * secondary — hairline gold outline (supporting actions)
 * ghost     — quiet text button (tertiary)
 * danger    — desaturated red outline (concede, disenchant)
 */
export function VaultButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  small = false,
}: Props) {
  const padV = small ? 9 : 14;
  const padH = small ? 14 : 22;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && shadows.goldGlow,
        { paddingVertical: padV, paddingHorizontal: padH },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {
        variant === 'primary' ? (
          <LinearGradient
            colors={disabled ? ['#5A5040', '#4A4238'] : ['#F0C75E', '#D4A84B', '#C09A3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radii.md }]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.fill,
              variant === 'secondary' && styles.secondaryFill,
              variant === 'danger' && styles.dangerFill,
            ]}
          />
        )
      }
      <View style={styles.row}>
        {icon ? (
          <Icon
            name={icon}
            size={small ? 14 : 16}
            color={iconColor(variant, disabled)}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            variant === 'primary' ? type.button : type.buttonGhost,
            small && { fontSize: 12.5 },
            variant === 'danger' && { color: palette.danger },
            variant === 'ghost' && { color: palette.textMuted },
            disabled && variant !== 'primary' && { color: '#5A5040' },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function iconColor(variant: Variant, disabled: boolean): string {
  if (disabled) return '#3A3428';
  switch (variant) {
    case 'primary':
      return '#1A1200';
    case 'danger':
      return palette.danger;
    case 'ghost':
      return palette.textMuted;
    default:
      return palette.gold;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { borderRadius: radii.md },
  secondaryFill: {
    borderWidth: 1,
    borderColor: palette.goldDim,
    backgroundColor: 'rgba(212,168,75,0.06)',
  },
  dangerFill: {
    borderWidth: 1,
    borderColor: 'rgba(196,69,54,0.55)',
    backgroundColor: 'rgba(196,69,54,0.08)',
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  disabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
