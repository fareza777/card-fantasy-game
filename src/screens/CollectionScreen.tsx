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
import { useGameStore } from '../store/gameStore';
import { palette, factionColors, rarityColors } from '../theme/colors';
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
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.meta}>
          {unique}/{ALL_CARDS.length} owned · {ownedCount} copies · grey = locked · hold to zoom
        </Text>
        <TextInput
          placeholder="Search cards..."
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
          {factions.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFaction(item)}
              style={[
                styles.chip,
                faction === item && {
                  backgroundColor: item === 'All' ? palette.gold : factionColors[item as Faction].main,
                },
              ]}
            >
              <Text
                style={[styles.chipText, faction === item && { color: '#111' }]}
                allowFontScaling={false}
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
          {types.map((item) => (
            <Pressable
              key={item}
              onPress={() => setType(item)}
              style={[styles.chipSm, type === item && styles.chipSmActive]}
            >
              <Text
                style={[styles.chipSmText, type === item && styles.chipSmTextActive]}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.rarityRow}>
          <View style={styles.rarityChips}>
            {rarities.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setRarity(r.key)}
                style={[
                  styles.rarityChip,
                  rarity === r.key && {
                    backgroundColor: r.key === 'All' ? palette.gold : rarityColors[r.key as Rarity],
                    borderColor: r.key === 'All' ? palette.gold : rarityColors[r.key as Rarity],
                  },
                ]}
              >
                <Text
                  style={[styles.rarityChipText, rarity === r.key && { color: '#111' }]}
                  allowFontScaling={false}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => setOwnedOnly((v) => !v)}
            style={[styles.ownedToggle, ownedOnly && styles.ownedToggleActive]}
          >
            <Text
              style={[styles.ownedToggleText, ownedOnly && styles.ownedToggleTextActive]}
              numberOfLines={1}
            >
              {ownedOnly ? '✓ Owned only' : 'Owned only'}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 72, alignItems: 'center' }}
          ListEmptyComponent={<Text style={styles.empty}>No cards match these filters.</Text>}
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
  root: { flex: 1, paddingHorizontal: 12 },
  title: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '800',
    paddingHorizontal: 4,
    lineHeight: 34,
    marginBottom: 2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  meta: {
    color: palette.textMuted,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  search: {
    backgroundColor: palette.bgPanel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  chipScroll: { maxHeight: 48, marginBottom: 8, flexGrow: 0 },
  chipRow: { alignItems: 'center', paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: palette.bgPanel,
    marginRight: 8,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  chipSm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 34,
    borderRadius: 16,
    backgroundColor: '#12161ECC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSmActive: {
    backgroundColor: palette.gold + '22',
    borderColor: palette.gold,
  },
  chipSmText: {
    color: palette.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  chipSmTextActive: { color: palette.goldBright },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  rarityChips: { flexDirection: 'row', gap: 6 },
  rarityChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityChipText: { color: palette.text, fontWeight: '800', fontSize: 12 },
  ownedToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.bgPanel,
  },
  ownedToggleActive: {
    backgroundColor: palette.success + '33',
    borderColor: palette.success,
  },
  ownedToggleText: { color: palette.textMuted, fontWeight: '700', fontSize: 12 },
  ownedToggleTextActive: { color: '#9EE8C4' },
  empty: { color: palette.textMuted, padding: 24, textAlign: 'center' },
});
