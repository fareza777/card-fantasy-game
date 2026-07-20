import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { ALL_CARDS } from '../engine/cardDb';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { palette } from '../theme/colors';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    gold,
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
    ? `Next: 50 unique (${unique}/50)`
    : !milestonesClaimed.includes('unique100')
      ? `Next: 100 unique (${unique}/100)`
      : 'Claimed milestones';

  return (
    <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Vault Profile</Text>
        <Text style={styles.brand}>Rune Vault: Fantasy Card Battle</Text>

        <View style={styles.card}>
          <Row label="Gold" value={String(gold)} />
          <Row label="Wins — Losses" value={`${wins}–${losses}`} />
          <Row label="Packs opened" value={String(packsOpened)} />
          <Row label="Collection" value={`${unique} / ${ALL_CARDS.length}`} />
          <Row label="Active deck" value={`${deck.length} cards`} />
          <Row label="Story" value={`${storyCleared.length}/9`} />
          <Row label="Milestone" value={nextGoalText} accent={palette.gold} />
          {lastGoldGain > 0 && (
            <Row label="Last win" value={`+${lastGoldGain}`} accent={palette.success} />
          )}
        </View>

        <Text style={styles.note}>
          Progress saves on this device. Origins set: 185 cards. More sets planned for live seasons.
        </Text>
      </View>
    </VaultScreenShell>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  title: { color: palette.text, fontSize: 28, fontWeight: '800' },
  brand: { color: palette.gold, marginBottom: 20, marginTop: 4 },
  card: {
    backgroundColor: palette.bgPanel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  label: { color: palette.textMuted },
  value: { color: palette.text, fontWeight: '800' },
  note: { color: palette.textMuted, marginTop: 20, lineHeight: 20 },
});
