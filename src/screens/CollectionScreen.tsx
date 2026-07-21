import React, { useCallback, useMemo, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ALL_CARDS } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { CardZoomModal } from '../components/CardZoomModal';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { ScreenHeader } from '../components/ScreenHeader';
import { FilterChip } from '../components/FilterChip';
import { Icon, IconName } from '../components/Icon';
import { useGameStore } from '../store/gameStore';
import { palette, factionColors, rarityColors } from '../theme/colors';
import { type as typo, fonts } from '../theme/typography';
import { radii } from '../theme/tokens';
import { CardDef, CardType, Faction, Rarity } from '../types/card';
import { RootStackParamList } from '../navigation/types';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 14;
const GRID_GAP = 10;
/** Aim for ~3 columns on phones, ~4 on wide screens; keep cards readable. */
const COLUMNS = SCREEN_W >= 620 ? 4 : 3;
const CARD_W = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);

const factions: (Faction | 'All')[] = ['All', 'Dawn', 'Tide', 'Shade', 'Ember', 'Thorn', 'Neutral'];
const cardTypes: (CardType | 'All')[] = ['All', 'Unit', 'Sigil', 'Canticle', 'Domain', 'Bond', 'Relic'];
const rarities: { key: Rarity | 'All'; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Common', label: 'Common' },
  { key: 'Uncommon', label: 'Uncommon' },
  { key: 'Rare', label: 'Rare' },
  { key: 'Legendary', label: 'Legendary' },
];

const FACTION_ICONS: Record<string, IconName> = {
  Dawn: 'dawn',
  Tide: 'tide',
  Shade: 'shade',
  Ember: 'ember',
  Thorn: 'thorn',
  Neutral: 'neutral',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CollectionCard = memo(function CollectionCard({
  item,
  qty,
  onPress,
  onLongPress,
}: {
  item: CardDef;
  qty: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <View style={styles.cardCell}>
      <CardView
        card={item}
        width={CARD_W}
        compact
        count={qty}
        unowned={qty <= 0}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    </View>
  );
});

/** One compact filter line: small left label + horizontal scrolling chips. */
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function CollectionScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const androidStatus = Platform.OS === 'android' ? StatusBar.currentHeight ?? 28 : 0;
  const topPad = Math.max(insets.top, androidStatus) + 14;
  const owned = useGameStore((s) => s.owned);
  const [faction, setFaction] = useState<(typeof factions)[number]>('All');
  const [typeFilter, setTypeFilter] = useState<(typeof cardTypes)[number]>('All');
  const [rarity, setRarity] = useState<Rarity | 'All'>('All');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [q, setQ] = useState('');
  const [zoom, setZoom] = useState<CardDef | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const data = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ALL_CARDS.filter((c) => {
      if (faction !== 'All' && c.faction !== faction) return false;
      if (typeFilter !== 'All' && c.type !== typeFilter) return false;
      if (rarity !== 'All' && c.rarity !== rarity) return false;
      if (ownedOnly && (owned[c.id] ?? 0) <= 0) return false;
      if (qq && !c.name.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [faction, typeFilter, rarity, ownedOnly, q, owned]);

  const ownedCount = Object.values(owned).reduce((a, b) => a + b, 0);
  const unique = Object.keys(owned).filter((id) => (owned[id] ?? 0) > 0).length;
  const activeFilters =
    (faction !== 'All' ? 1 : 0) +
    (typeFilter !== 'All' ? 1 : 0) +
    (rarity !== 'All' ? 1 : 0) +
    (ownedOnly ? 1 : 0);

  const clearFilters = () => {
    setFaction('All');
    setTypeFilter('All');
    setRarity('All');
    setOwnedOnly(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: CardDef }) => {
      const qty = owned[item.id] ?? 0;
      return (
        <CollectionCard
          item={item}
          qty={qty}
          onPress={() => nav.navigate('CardDetail', { cardId: item.id })}
          onLongPress={() => setZoom(item)}
        />
      );
    },
    [owned, nav],
  );

  return (
    <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        <ScreenHeader
          kicker="THE VAULT"
          title="Collection"
          meta={`${unique}/${ALL_CARDS.length} unique · ${ownedCount} copies`}
        />

        <View style={styles.searchWrap}>
          <Icon name="search" size={15} color={palette.textMuted} />
          <TextInput
            placeholder="Search cards..."
            placeholderTextColor="#8A93A3"
            value={q}
            onChangeText={setQ}
            style={styles.search}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Icon name="close" size={14} color={palette.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter toggle — collapses the filter block so the grid stays tall. */}
        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            style={[styles.filterToggle, (filtersOpen || activeFilters > 0) && styles.filterToggleOn]}
          >
            <Icon
              name="settings"
              size={13}
              color={filtersOpen || activeFilters > 0 ? palette.goldBright : palette.textMuted}
            />
            <Text
              style={[
                styles.filterToggleText,
                (filtersOpen || activeFilters > 0) && { color: palette.goldBright },
              ]}
            >
              Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}
            </Text>
            <Icon name={filtersOpen ? 'remove' : 'add'} size={13} color={palette.textMuted} />
          </Pressable>
          <Text style={styles.resultCount}>{data.length} shown</Text>
          {activeFilters > 0 && (
            <Pressable onPress={clearFilters} hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {filtersOpen && (
          <View style={styles.filtersBlock}>
            <FilterRow label="Faction">
              {factions.map((item) => (
                <FilterChip
                  key={item}
                  label={item}
                  active={faction === item}
                  onPress={() => setFaction(item)}
                  icon={FACTION_ICONS[item]}
                  accent={item === 'All' ? palette.gold : factionColors[item as Faction].main}
                />
              ))}
            </FilterRow>

            <FilterRow label="Type">
              {cardTypes.map((item) => (
                <FilterChip
                  key={item}
                  label={item}
                  active={typeFilter === item}
                  onPress={() => setTypeFilter(item)}
                />
              ))}
            </FilterRow>

            <FilterRow label="Rarity">
              {rarities.map((r) => (
                <FilterChip
                  key={r.key}
                  label={r.label}
                  active={rarity === r.key}
                  onPress={() => setRarity(r.key)}
                  accent={r.key === 'All' ? palette.gold : rarityColors[r.key as Rarity]}
                />
              ))}
              <FilterChip
                label="Owned"
                icon="check"
                active={ownedOnly}
                onPress={() => setOwnedOnly((v) => !v)}
                accent={palette.success}
              />
            </FilterRow>
          </View>
        )}

        <FlatList
          data={data}
          key={COLUMNS}
          keyExtractor={(c) => c.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 72,
            paddingTop: 6,
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="cards" size={26} color={palette.goldDim} />
              <Text style={styles.emptyText}>No cards match these filters.</Text>
            </View>
          }
          renderItem={renderItem}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />
        <CardZoomModal card={zoom} visible={!!zoom} onClose={() => setZoom(null)} />
      </View>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: H_PAD },
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
    paddingVertical: 11,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(180,190,210,0.28)',
    backgroundColor: 'rgba(20,26,36,0.85)',
  },
  filterToggleOn: {
    borderColor: 'rgba(212,168,75,0.55)',
    backgroundColor: 'rgba(212,168,75,0.12)',
  },
  filterToggleText: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: palette.textMuted },
  resultCount: { ...typo.caption, fontSize: 12, color: '#9AA3B5', flex: 1 },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.gold },
  filtersBlock: {
    backgroundColor: 'rgba(14,18,26,0.9)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 4,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  filterLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.gold,
    width: 52,
  },
  chipRow: { alignItems: 'center', paddingRight: 8, gap: 8, paddingVertical: 3 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  cardCell: { width: CARD_W },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { ...typo.caption, fontSize: 13, color: '#C0C6D0' },
});
