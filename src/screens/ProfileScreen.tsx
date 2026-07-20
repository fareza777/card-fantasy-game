import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { ALL_CARDS } from '../engine/cardDb';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { ScreenHeader } from '../components/ScreenHeader';
import { Panel } from '../components/Panel';
import { Icon, IconName } from '../components/Icon';
import { palette } from '../theme/colors';
import { type, fonts } from '../theme/typography';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    gold,
    dust,
    wins,
    losses,
    packsOpened,
    owned,
    deck,
    storyCleared,
    lastGoldGain,
    milestonesClaimed,
  } = useGameStore();
  const unique = Object.keys(owned).filter((id) => (owned[id] ?? 0) > 0).length;

  const nextGoalText = !milestonesClaimed.includes('unique50')
    ? `50 unique (${unique}/50)`
    : !milestonesClaimed.includes('unique100')
      ? `100 unique (${unique}/100)`
      : 'All claimed';

  return (
    <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.root, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader kicker="THE VAULT" title="Profile" meta="Rune Vault: Fantasy Card Battle" />

        <Panel style={styles.card}>
          <Row icon="gold" label="Gold" value={String(gold)} />
          <Row icon="dust" label="Dust" value={String(dust)} />
          <Row icon="trophy" label="Wins — Losses" value={`${wins}–${losses}`} />
          <Row icon="pack" label="Packs opened" value={String(packsOpened)} />
          <Row icon="collection" label="Collection" value={`${unique} / ${ALL_CARDS.length}`} />
          <Row icon="deck" label="Active deck" value={`${deck.length} cards`} />
          <Row icon="story" label="Story" value={`${storyCleared.length}/9`} />
          <Row icon="stats" label="Next milestone" value={nextGoalText} accent={palette.goldBright} />
          {lastGoldGain > 0 && (
            <Row icon="gold" label="Last win" value={`+${lastGoldGain}`} accent="#9EE8C4" last />
          )}
        </Panel>

        <View style={styles.noteRow}>
          <Icon name="shield" size={13} color={palette.goldDim} />
          <Text style={styles.note}>
            Progress saves on this device. Origins set: 185 cards. More sets planned for live
            seasons.
          </Text>
        </View>
      </ScrollView>
    </VaultScreenShell>
  );
}

function Row({
  icon,
  label,
  value,
  accent,
  last,
}: {
  icon: IconName;
  label: string;
  value: string;
  accent?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <Icon name={icon} size={14} color={palette.goldDim} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18, paddingBottom: 24 },
  card: { paddingHorizontal: 16, paddingVertical: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,140,170,0.16)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { ...type.caption, fontSize: 13.5, color: '#B8BEC9' },
  value: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.text },
  noteRow: { flexDirection: 'row', gap: 8, marginTop: 20, alignItems: 'flex-start', paddingHorizontal: 4 },
  note: { ...type.caption, flex: 1, lineHeight: 19 },
});
