import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ALL_CARDS, getCard, tryGetCard, totalCost } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { ScreenHeader } from '../components/ScreenHeader';
import { FilterChip } from '../components/FilterChip';
import { VaultButton } from '../components/VaultButton';
import { Icon, IconName } from '../components/Icon';
import { useGameStore, validateDeck } from '../store/gameStore';
import { buildStarterDeck } from '../engine/packs';
import { palette, factionColors } from '../theme/colors';
import { type as typo, fonts } from '../theme/typography';
import { radii } from '../theme/tokens';
import { CardType, Faction } from '../types/card';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 14;
const GRID_GAP = 10;
const COLUMNS = SCREEN_W >= 620 ? 4 : 3;
const OWNED_CARD_W = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
const DECK_CARD_W = 74;

const CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];
const CURVE_FACTIONS: Faction[] = ['Dawn', 'Tide', 'Shade', 'Ember', 'Thorn', 'Neutral'];
const FILTER_FACTIONS: (Faction | 'All')[] = ['All', 'Dawn', 'Tide', 'Shade', 'Ember', 'Thorn', 'Neutral'];
const FILTER_TYPES: (CardType | 'All')[] = ['All', 'Unit', 'Sigil', 'Canticle', 'Domain', 'Bond', 'Relic'];

const FACTION_ICONS: Record<string, IconName> = {
  Dawn: 'dawn',
  Tide: 'tide',
  Shade: 'shade',
  Ember: 'ember',
  Thorn: 'thorn',
  Neutral: 'neutral',
};

export function DeckScreen() {
  const insets = useSafeAreaInsets();
  const { owned, deck, setDeck, activeDeckSlot, swapDeckSlot } = useGameStore();
  const [draft, setDraft] = useState<string[]>(deck);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof FILTER_TYPES)[number]>('All');
  const [factionFilter, setFactionFilter] = useState<(typeof FILTER_FACTIONS)[number]>('All');
  const [statsOpen, setStatsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const deckIds = useMemo(() => Object.keys(counts), [counts]);

  const curve = useMemo(() => {
    const buckets = new Array(CURVE_BUCKETS.length).fill(0);
    for (const id of draft) {
      const card = tryGetCard(id);
      if (!card || card.type === 'Domain') continue;
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
      const card = tryGetCard(id);
      if (card) c[card.faction] += 1;
    }
    return c;
  }, [draft]);

  const domainCount = useMemo(
    () => draft.filter((id) => tryGetCard(id)?.type === 'Domain').length,
    [draft],
  );

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

  const activeFilters =
    (typeFilter !== 'All' ? 1 : 0) + (factionFilter !== 'All' ? 1 : 0);

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

  const listHeader = (
    <View>
      {/* Status + slot */}
      <View style={styles.statusRow}>
        <View style={[styles.statusPill, valid ? styles.statusOk : styles.statusBad]}>
          <Icon name={valid ? 'check' : 'warning'} size={12} color={valid ? '#9EE8C4' : '#E8A090'} />
          <Text style={[styles.statusText, { color: valid ? '#9EE8C4' : '#E8A090' }]}>
            {draft.length}/40 · {valid ? 'Legal' : 'Incomplete'}
          </Text>
        </View>
        <View style={styles.slotToggle}>
          {(['A', 'B'] as const).map((slot) => {
            const active = activeDeckSlot === slot;
            return (
              <Pressable
                key={slot}
                onPress={() => !active && doSwapSlot()}
                style={[styles.slotSeg, active && styles.slotSegActive]}
              >
                <Text style={[styles.slotSegText, active && styles.slotSegTextActive]}>Deck {slot}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Deck strip */}
      <View style={styles.deckSection}>
        <Pressable style={styles.sectionRow} onPress={() => setStatsOpen((v) => !v)}>
          <Text style={styles.sectionLabel}>Your deck</Text>
          <View style={styles.sectionRowRight}>
            <Text style={styles.domainTag}>{domainCount} Domain</Text>
            <View style={styles.statsToggle}>
              <Icon name="stats" size={12} color={palette.gold} />
              <Text style={styles.statsToggleText}>Stats</Text>
              <Icon name={statsOpen ? 'remove' : 'add'} size={11} color={palette.textMuted} />
            </View>
          </View>
        </Pressable>

        {statsOpen && (
          <View style={styles.statsBox}>
            <View style={styles.curveRow}>
              {curve.map((n, i) => (
                <View key={i} style={styles.curveCol}>
                  <View style={styles.curveBarTrack}>
                    <LinearGradient
                      colors={['#F0C75E', '#B8902F']}
                      style={[styles.curveBar, { height: Math.max(2, (n / curveMax) * 34) }]}
                    />
                  </View>
                  <Text style={styles.curveCount}>{n}</Text>
                  <Text style={styles.curveLabel}>{CURVE_BUCKETS[i]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.factionChipRow}>
              {CURVE_FACTIONS.filter((f) => factionCounts[f] > 0).map((f) => (
                <View key={f} style={[styles.factionChip, { borderColor: factionColors[f].main + '88' }]}>
                  <Icon name={FACTION_ICONS[f]} size={11} color={factionColors[f].main} />
                  <Text style={[styles.factionChipText, { color: factionColors[f].main }]}>
                    {factionCounts[f]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deckScrollContent}
        >
          {deckIds.length === 0 ? (
            <View style={styles.emptyInline}>
              <Icon name="deck" size={18} color={palette.goldDim} />
              <Text style={styles.empty}>Empty — add cards from your collection below</Text>
            </View>
          ) : (
            deckIds.map((id) => {
              const card = tryGetCard(id);
              if (!card) return null;
              return (
                <View key={id} style={styles.deckCardWrap}>
                  <CardView
                    card={card}
                    width={DECK_CARD_W}
                    compact
                    count={counts[id]}
                    onPress={() => remove(id)}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Collection header + filters */}
      <View style={styles.collectionHead}>
        <Text style={styles.sectionLabel}>Your collection</Text>
        <Text style={styles.sectionRight}>tap card to add</Text>
      </View>
      <View style={styles.searchWrap}>
        <Icon name="search" size={15} color={palette.textMuted} />
        <TextInput
          placeholder="Search owned cards..."
          placeholderTextColor="#8A93A3"
          value={q}
          onChangeText={setQ}
          style={styles.search}
        />
        <Pressable
          onPress={() => setFiltersOpen((v) => !v)}
          hitSlop={6}
          style={[styles.filterBtn, (filtersOpen || activeFilters > 0) && styles.filterBtnOn]}
        >
          <Icon
            name="settings"
            size={13}
            color={filtersOpen || activeFilters > 0 ? palette.goldBright : palette.textMuted}
          />
          {activeFilters > 0 && <Text style={styles.filterBtnCount}>{activeFilters}</Text>}
        </Pressable>
      </View>

      {filtersOpen && (
        <View style={styles.filtersBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FILTER_TYPES.map((item) => (
              <FilterChip
                key={item}
                label={item}
                active={typeFilter === item}
                onPress={() => setTypeFilter(item)}
              />
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 6 }}
            contentContainerStyle={styles.chipRow}
          >
            {FILTER_FACTIONS.map((item) => (
              <FilterChip
                key={item}
                label={item}
                active={factionFilter === item}
                onPress={() => setFactionFilter(item)}
                icon={FACTION_ICONS[item]}
                accent={item === 'All' ? palette.gold : factionColors[item as Faction].main}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
      <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
        <ScreenHeader
          kicker="ARMORY"
          title="Deck Builder"
          right={
            <View style={styles.headerBtns}>
              <VaultButton label="Starter" variant="secondary" small onPress={resetStarter} />
              <VaultButton label="Save" icon="check" small onPress={save} />
            </View>
          }
        />

        <FlatList
          data={ownedList}
          key={COLUMNS}
          keyExtractor={(c) => c.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 72 }}
          ListEmptyComponent={<Text style={styles.empty}>No owned cards match these filters.</Text>}
          renderItem={({ item }) => {
            const inDeck = counts[item.id] ?? 0;
            return (
              <View style={styles.ownedCell}>
                <CardView
                  card={item}
                  width={OWNED_CARD_W}
                  compact
                  count={owned[item.id]}
                  onPress={() => add(item.id)}
                />
                {inDeck > 0 && (
                  <View style={styles.inDeckBadge}>
                    <Text style={styles.inDeckBadgeText}>×{inDeck}</Text>
                  </View>
                )}
              </View>
            );
          }}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
        />
      </View>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: H_PAD },
  headerBtns: { flexDirection: 'row', gap: 8 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusOk: { borderColor: 'rgba(61,139,110,0.5)', backgroundColor: 'rgba(61,139,110,0.12)' },
  statusBad: { borderColor: 'rgba(196,69,54,0.5)', backgroundColor: 'rgba(196,69,54,0.10)' },
  statusText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  slotToggle: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.28)',
    backgroundColor: 'rgba(16,21,30,0.9)',
    padding: 3,
    gap: 3,
  },
  slotSeg: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radii.sm },
  slotSegActive: { backgroundColor: 'rgba(212,168,75,0.18)' },
  slotSegText: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#A8B0C0' },
  slotSegTextActive: { color: palette.goldBright },
  deckSection: {
    backgroundColor: 'rgba(12,16,24,0.92)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.22)',
    paddingTop: 8,
    paddingBottom: 10,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  sectionRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  domainTag: { ...typo.caption, fontSize: 11, color: '#A8B0C0' },
  statsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.3)',
    backgroundColor: 'rgba(212,168,75,0.08)',
  },
  statsToggleText: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.gold },
  statsBox: {
    marginHorizontal: 10,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.14)',
  },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.gold,
  },
  sectionRight: { ...typo.caption, fontSize: 11, color: '#A8B0C0' },
  curveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  curveCol: { alignItems: 'center', flex: 1 },
  curveBarTrack: { height: 34, width: 12, justifyContent: 'flex-end' },
  curveBar: { width: 12, borderRadius: 3 },
  curveCount: { color: palette.text, fontSize: 10, fontFamily: fonts.bodyBold, marginTop: 3 },
  curveLabel: { color: '#9AA3B5', fontSize: 9, fontFamily: fonts.bodyMedium },
  factionChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  factionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  factionChipText: { fontSize: 11, fontFamily: fonts.bodySemi },
  deckScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignItems: 'flex-start',
    gap: 8,
  },
  deckCardWrap: { marginRight: 2 },
  emptyInline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  empty: { ...typo.caption, padding: 12, color: '#B8C0CC' },
  collectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(20,26,36,0.92)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.28)',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  search: {
    flex: 1,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  filterBtnOn: { backgroundColor: 'rgba(212,168,75,0.14)' },
  filterBtnCount: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.goldBright },
  filtersBlock: {
    backgroundColor: 'rgba(14,18,26,0.9)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  chipRow: { alignItems: 'center', paddingRight: 8, gap: 8 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  ownedCell: { width: OWNED_CARD_W },
  inDeckBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(212,168,75,0.92)',
    borderWidth: 1,
    borderColor: '#fff6',
  },
  inDeckBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#1A1200',
  },
});
