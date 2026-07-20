import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { palette } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/tokens';
import { Icon, IconName } from './Icon';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Accent override (e.g. faction color). Defaults to gold. */
  accent?: string;
  style?: ViewStyle;
};

/** Pill filter used across Collection / Deck / Shop. */
export function FilterChip({ label, active, onPress, icon, accent = palette.gold, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && {
          borderColor: accent,
          backgroundColor: `${accent}1F`,
        },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={13} color={active ? accent : palette.textMuted} />
      ) : null}
      <Text style={[styles.label, active && { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(180,190,210,0.35)',
    backgroundColor: 'rgba(28,36,50,0.92)',
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    letterSpacing: 0.3,
    color: '#D2D8E4',
  },
});
