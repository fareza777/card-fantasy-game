import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_CARDS, getCard, totalCost } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { useGameStore, validateDeck } from '../store/gameStore';
import { buildStarterDeck } from '../engine/packs';
import { palette, factionColors } from '../theme/colors';
import { CardType, Faction } from '../types/card';

const CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];
const CURVE_FACTIONS: Faction[] = ['Dawn', 'Tide', 'Shade', 'Ember', 'Thorn', 'Neutral'];
const FILTER_FACTIONS: (Faction | 'All')[] = ['All', 'Dawn', 'Tide', 'Shade', 'Ember', 'Thorn', 'Neutral'];
const FILTER_TYPES: (CardType | 'All')[] = ['All', 'Unit', 'Sigil', 'Canticle', 'Domain', 'Bond', 'Relic'];

export function DeckScreen() {
  const insets = useSafeAreaInsets();
  const { owned, deck, setDeck, activeDeckSlot, swapDeckSlot } = useGameStore();
  const [draft, setDraft] = useState<string[]>(deck);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof FILTER_TYPES)[number]>('All');
  const [factionFilter, setFactionFilter] = useState<(typeof FILTER_FACTIONS)[number]>('All');

  useFocusEffect(
    useCallback(() => {
      setDraft(useGameStore.getState().deck);
    }, []),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const id of draft) c[id] = (c[id] ?? 0) + 1;
    return c;
  }, [draft]);

  const curve = useMemo(() => {
    const buckets = new Array(CURVE_BUCKETS.length).fill(0);
    for (const id of draft) {
      const card = getCard(id);
      if (card.type === 'Domain') continue;
      const cost = Math.min(totalCost(card.cost), 7);
      buckets[cost] += 1;
    }
    return buckets;
  }, [draft]);
  const curveMax = Math.max(1, ...curve);

  const factionCounts = useMemo(() => {
    const c: Record<Faction, number> = {
      Dawn: 0,
      Tide: 0,
      Shade: 0,
      Ember: 0,
      Thorn: 0,
      Neutral: 0,
    };
    for (const id of draft) {
      const card = getCard(id);
      c[card.faction] += 1;
    }
    return c;
  }, [draft]);

  const ownedList = useMemo(
    () =>
      ALL_CARDS.filter((c) => {
        if ((owned[c.id] ?? 0) <= 0) return false;
        if (typeFilter !== 'All' && c.type !== typeFilter) return false;
        if (factionFilter !== 'All' && c.faction !== factionFilter) return false;
        if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [owned, typeFilter, factionFilter, q],
  );

  const add = (id: string) => {
    const card = getCard(id);
    const max = card.type === 'Domain' ? 4 : 3;
    const have = owned[id] ?? 0;
    const inDeck = counts[id] ?? 0;
    if (draft.length >= 40) return Alert.alert('Deck full', '40 cards maximum.');
    if (inDeck >= max) return Alert.alert('Copy limit', `Max ${max} of ${card.name}.`);
    if (inDeck >= have) return Alert.alert('Not owned', 'Open packs to get more copies.');
    setDraft([...draft, id]);
  };

  const remove = (id: string) => {
    const idx = draft.lastIndexOf(id);
    if (idx < 0) return;
    const next = [...draft];
    next.splice(idx, 1);
    setDraft(next);
  };

  const save = () => {
    const err = validateDeck(draft, owned);
    if (err) return Alert.alert('Invalid deck', err);
    setDeck(draft);
    Alert.alert('Saved', 'Deck ready for battle.');
  };

  const resetStarter = () => {
    Alert.alert('Reset deck?', 'Load the starter Ember/Thorn deck (40 cards).', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          const d = buildStarterDeck();
          setDraft(d);
          setDeck(d);
        },
      },
    ]);
  };

  const doSwapSlot = () => {
    const targetSlot = activeDeckSlot === 'A' ? 'B' : 'A';
    Alert.alert(
      `Switch to Slot ${targetSlot}?`,
      'Your current draft will be saved to its slot before switching.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Load Slot ${targetSlot}`,
          onPress: () => {
            setDeck(draft);
            swapDeckSlot();
            setDraft(useGameStore.getState().deck);
          },
        },
      ],
    );
  };

  const valid = !validateDeck(draft, owned);

  return (
    <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
        <View>
          <Text style={styles.title}>Deck Builder</Text>
          <Text style={[styles.meta, { color: valid ? palette.success : palette.danger }]}>
            {draft.length}/40 · {valid ? 'Legal' : 'Incomplete'}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          <Pressable onPress={resetStarter} style={styles.reset}>
            <Text style={styles.resetText}>Starter</Text>
          </Pressable>
          <Pressable onPress={save} style={styles.save}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={doSwapSlot} style={styles.slotBtn}>
        <Text style={styles.slotBtnText}>
          Slot {activeDeckSlot} active · tap for Slot {activeDeckSlot === 'A' ? 'B' : 'A'}
        </Text>
      </Pressable>

      <View style={styles.curveBox}>
        <Text style={styles.section}>Essence curve (non-Domain)</Text>
        <View style={styles.curveRow}>
          {curve.map((n, i) => (
            <View key={i} style={styles.curveCol}>
              <View style={styles.curveBarTrack}>
                <View
                  style={[
                    styles.curveBar,
                    { height: Math.max(2, (n / curveMax) * 56) },
                  ]}
                />
              </View>
              <Text style={styles.curveCount}>{n}</Text>
              <Text style={styles.curveLabel}>{CURVE_BUCKETS[i]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.factionChipRow}>
          {CURVE_FACTIONS.filter((f) => factionCounts[f] > 0).map((f) => (
            <View key={f} style={[styles.factionChip, { borderColor: factionColors[f].main }]}>
              <Text style={[styles.factionChipText, { color: factionColors[f].main }]}>
                {f} {factionCounts[f]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.section}>In deck (tap to remove)</Text>
      <FlatList
        horizontal
        data={Object.keys(counts)}
        keyExtractor={(id) => id}
        style={{ maxHeight: 168, marginBottom: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>Deck empty — add cards below</Text>}
        renderItem={({ item }) => (
          <CardView
            card={getCard(item)}
            width={100}
            compact
            count={counts[item]}
            onPress={() => remove(item)}
          />
        )}
      />

      <Text style={styles.section}>Owned (tap to add)</Text>
      <TextInput
        placeholder="Search owned cards..."
        placeholderTextColor={palette.textMuted}
        value={q}
        onChangeText={setQ}
        style={styles.search}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {FILTER_TYPES.map((item) => (
          <Pressable
            key={item}
            onPress={() => setTypeFilter(item)}
            style={[styles.chipSm, typeFilter === item && styles.chipSmActive]}
          >
            <Text
              style={[styles.chipSmText, typeFilter === item && styles.chipSmTextActive]}
              numberOfLines={1}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {FILTER_FACTIONS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setFactionFilter(item)}
            style={[
              styles.chip,
              factionFilter === item && {
                backgroundColor: item === 'All' ? palette.gold : factionColors[item as Faction].main,
              },
            ]}
          >
            <Text
              style={[styles.chipText, factionFilter === item && { color: '#111' }]}
              numberOfLines={1}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={ownedList}
        keyExtractor={(c) => c.id}
        numColumns={2}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>No owned cards match these filters.</Text>}
        renderItem={({ item }) => (
          <CardView card={item} width={150} count={owned[item.id]} onPress={() => add(item.id)} />
        )}
      />
      </View>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: palette.text, fontSize: 26, fontWeight: '800' },
  meta: { fontWeight: '700', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  reset: {
    backgroundColor: palette.bgPanel,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  resetText: { color: palette.text, fontWeight: '700' },
  save: {
    backgroundColor: palette.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: '#1A1200', fontWeight: '800' },
  slotBtn: {
    backgroundColor: palette.bgPanel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.gold + '66',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  slotBtnText: { color: palette.goldBright, fontWeight: '800', fontSize: 13 },
  section: { color: palette.gold, fontWeight: '700', marginVertical: 8, paddingHorizontal: 4 },
  empty: { color: palette.textMuted, padding: 12 },
  search: {
    backgroundColor: palette.bgPanel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  chipScroll: { maxHeight: 44, marginBottom: 8, flexGrow: 0 },
  chipRow: { alignItems: 'center', paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: palette.bgPanel,
    marginRight: 8,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: palette.text, fontWeight: '700', fontSize: 12 },
  chipSm: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#12161ECC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSmActive: { backgroundColor: palette.gold + '22', borderColor: palette.gold },
  chipSmText: { color: palette.textMuted, fontWeight: '700', fontSize: 11 },
  chipSmTextActive: { color: palette.goldBright },
  curveBox: {
    backgroundColor: palette.bgPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    marginBottom: 4,
  },
  curveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  curveCol: { alignItems: 'center', flex: 1 },
  curveBarTrack: {
    height: 56,
    width: 14,
    justifyContent: 'flex-end',
  },
  curveBar: {
    width: 14,
    borderRadius: 3,
    backgroundColor: palette.gold,
  },
  curveCount: { color: palette.text, fontSize: 10, fontWeight: '800', marginTop: 4 },
  curveLabel: { color: palette.textMuted, fontSize: 9, marginTop: 1 },
  factionChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  factionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#00000033',
  },
  factionChipText: { fontSize: 11, fontWeight: '700' },
});
