import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { type } from '../theme/typography';
import { palette } from '../theme/colors';

type Props = {
  /** Small gold uppercase label above the title, e.g. "THE VAULT". */
  kicker?: string;
  title: string;
  /** Muted meta line under the title. */
  meta?: string;
  /** Right-aligned slot (balances, buttons, etc). */
  right?: React.ReactNode;
  style?: ViewStyle;
};

/** Standard screen header: kicker → Cinzel title → optional meta, with hairline rule. */
export function ScreenHeader({ kicker, title, meta, right, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textCol}>
        {kicker ? <Text style={type.kicker}>{kicker}</Text> : null}
        <View style={styles.titleRow}>
          <Text style={[type.title, styles.title]}>{title}</Text>
          {right}
        </View>
        {meta ? <Text style={[type.caption, styles.meta]}>{meta}</Text> : null}
      </View>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  textCol: { gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { flexShrink: 1 },
  meta: { marginTop: 2 },
  rule: {
    height: 1,
    marginTop: 12,
    backgroundColor: 'rgba(212,168,75,0.16)',
  },
});
