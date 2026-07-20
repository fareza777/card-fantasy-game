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
import { type, fonts } from '../theme/typography';
import { radii } from '../theme/tokens';
import { CardDef, CardType, Faction, Rarity } from '../types/card';
import { RootStackParamList } from '../navigation/types';

const factions: (Faction | 'All')[] = ['All', 'Dawn', 'Tide', 'Shade', 'Ember', 'Thorn', 'Neutral'];
const types: (CardType | 'All')[] = ['All', 'Unit', 'Sigil', 'Canticle', 'Domain', 'Bond', 'Relic'];
const rarities: { key: Rarity | 'All'; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Common', label: 'C' },
  { key: 'Uncommon', label: 'U' },
  { key: 'Rare', label: 'R' },
  { key: 'Legendary', label: 'L' },
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
    <CardView
      card={item}
      width={156}
      count={qty}
      unowned={qty <= 0}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
});

export function CollectionScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const androidStatus = Platform.OS === 'android' ? StatusBar.currentHeight ?? 28 : 0;
  const topPad = Math.max(insets.top, androidStatus) + 14;
  const owned = useGameStore((s) => s.owned);
  const [faction, setFaction] = useState<(typeof factions)[number]>('All');
  const [type, setType] = useState<(typeof types)[number]>('All');
  const [rarity, setRarity] = useState<Rarity | 'All'>('All');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [q, setQ] = useState('');
  const [zoom, setZoom] = useState<CardDef | null>(null);

  const data = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ALL_CARDS.filter((c) => {
      if (faction !== 'All' && c.faction !== faction) return false;
      if (type !== 'All' && c.type !== type) return false;
      if (rarity !== 'All' && c.rarity !== rarity) return false;
      if (ownedOnly && (owned[c.id] ?? 0) <= 0) return false;
      if (qq && !c.name.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [faction, type, rarity, ownedOnly, q, owned]);

  const ownedCount = Object.values(owned).reduce((a, b) => a + b, 0);
  const unique = Object.keys(owned).filter((id) => (owned[id] ?? 0) > 0).length;

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
          meta={`${unique}/${ALL_CARDS.length} unique · ${ownedCount} copies · hold a card to inspect`}
        />

        <View style={styles.searchWrap}>
          <Icon name="search" size={15} color={palette.textMuted} />
          <TextInput
            placeholder="Search cards..."
            placeholderTextColor="#5F6B7E"
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
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
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {types.map((item) => (
            <FilterChip
              key={item}
              label={item}
              active={type === item}
              onPress={() => setType(item)}
            />
          ))}
        </ScrollView>

        <View style={styles.rarityRow}>
          <View style={styles.rarityChips}>
            {rarities.map((r) => (
              <FilterChip
                key={r.key}
                label={r.label}
                active={rarity === r.key}
                onPress={() => setRarity(r.key)}
                accent={r.key === 'All' ? palette.gold : rarityColors[r.key as Rarity]}
                style={styles.rarityChip}
              />
            ))}
          </View>
          <FilterChip
            label="Owned"
            icon="check"
            active={ownedOnly}
            onPress={() => setOwnedOnly((v) => !v)}
            accent={palette.success}
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 72, alignItems: 'center' }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="cards" size={26} color={palette.goldDim} />
              <Text style={styles.emptyText}>No cards match these filters.</Text>
            </View>
          }
          renderItem={renderItem}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
        <CardZoomModal card={zoom} visible={!!zoom} onClose={() => setZoom(null)} />
      </View>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(16,21,30,0.85)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  search: {
    flex: 1,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 11,
  },
  chipScroll: { maxHeight: 44, marginBottom: 8, flexGrow: 0 },
  chipRow: { alignItems: 'center', paddingRight: 8, gap: 8 },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  rarityChips: { flexDirection: 'row', gap: 6 },
  rarityChip: { paddingHorizontal: 11 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { ...type.caption, fontSize: 13 },
});
