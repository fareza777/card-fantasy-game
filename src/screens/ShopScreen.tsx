import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGameStore, PACK_PRICE } from '../store/gameStore';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { ALL_CARDS } from '../engine/cardDb';
import {
  DISENCHANT_DUST,
  FORGE_COST,
  forgeCost,
  maxDisenchantable,
} from '../engine/forge';
import { palette, rarityColors } from '../theme/colors';
import { CardDef, Rarity } from '../types/card';
import { RootStackParamList } from '../navigation/types';

const MULTI_PRICE = PACK_PRICE * 3;

export function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { gold, dust, owned, deck, openPackMulti, forgeCard, disenchantCard } = useGameStore();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [forgeQ, setForgeQ] = useState('');
  const [mode, setMode] = useState<'forge' | 'dust'>('forge');

  const buy = (n: 1 | 3) => {
    const ok = openPackMulti(n);
    if (!ok) {
      Alert.alert(
        'Not enough gold',
        `Boosters cost ${PACK_PRICE} gold each.\nCasual duels earn +50 · Story scenarios pay 40–100 gold.`,
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nav.navigate('PackReveal');
  };

  const craftable = useMemo(() => {
    const q = forgeQ.trim().toLowerCase();
    return ALL_CARDS.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (mode === 'forge') {
        // Legendaries forgeable but expensive; show if searchable or affordable
        return dust >= forgeCost(c.id) || !!q;
      }
      return maxDisenchantable(c.id, owned, deck) > 0;
    }).slice(0, 40);
  }, [forgeQ, dust, owned, deck, mode]);

  const onForge = (c: CardDef) => {
    const cost = forgeCost(c.id);
    Alert.alert(`Forge ${c.name}?`, `Spend ${cost} dust to craft 1 copy.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forge',
        onPress: () => {
          if (!forgeCard(c.id)) {
            Alert.alert('Cannot forge', 'Not enough dust.');
            return;
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const onDust = (c: CardDef) => {
    const gain = DISENCHANT_DUST[c.rarity];
    Alert.alert(`Disenchant ${c.name}?`, `Destroy 1 spare copy for ${gain} dust.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disenchant',
        style: 'destructive',
        onPress: () => {
          const got = disenchantCard(c.id);
          if (got == null) {
            Alert.alert('Cannot disenchant', 'No spare copies (deck copies are protected).');
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  return (
    <VaultScreenShell
      bgImage={require('../../assets/ui/bg-home-vault.png')}
      gradientColors={['#0B0E14EE', '#122018CC', '#0B0E14F5']}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Shop</Text>
        <Text style={styles.gold}>
          {gold} gold · {dust} dust
        </Text>

        <View style={styles.packCard}>
          <Image
            source={require('../../assets/ui/booster-pack-origins.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient colors={['#2A1F0A', '#1A2230']} style={styles.packInner}>
            <Text style={styles.packLabel}>ORIGINS BOOSTER</Text>
            <Text style={styles.packName}>Rune Vault Pack</Text>
            <Text style={styles.packDesc}>
              11 cards per pack{'\n'}
              7 Common · 3 Uncommon · 1 Rare+{'\n'}
              (~3% chance the rare slot is Legendary){'\n'}
              5 duds in a row? Next pack guarantees a new card.
            </Text>
            <View style={styles.buyRow}>
              <Pressable
                onPress={() => buy(1)}
                style={[styles.buyBtn, gold < PACK_PRICE && styles.buyDisabled]}
              >
                <Text style={styles.buyText}>Open ×1</Text>
                <Text style={styles.buySub}>{PACK_PRICE} Gold</Text>
              </Pressable>
              <Pressable
                onPress={() => buy(3)}
                style={[styles.buyBtn, styles.buyBtnAlt, gold < MULTI_PRICE && styles.buyDisabled]}
              >
                <Text style={styles.buyText}>Open ×3</Text>
                <Text style={styles.buySub}>{MULTI_PRICE} Gold</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Rune Forge</Text>
        <Text style={styles.sectionHint}>
          Disenchant spare copies for dust · Forge missing cards (Legendaries cost {FORGE_COST.Legendary} dust).
        </Text>
        <Text style={styles.rates}>
          Dust: C{DISENCHANT_DUST.Common}/U{DISENCHANT_DUST.Uncommon}/R{DISENCHANT_DUST.Rare}/L
          {DISENCHANT_DUST.Legendary} · Forge: C{FORGE_COST.Common}/U{FORGE_COST.Uncommon}/R
          {FORGE_COST.Rare}
        </Text>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('forge')}
            style={[styles.modeChip, mode === 'forge' && styles.modeChipOn]}
          >
            <Text style={[styles.modeText, mode === 'forge' && styles.modeTextOn]}>Forge</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('dust')}
            style={[styles.modeChip, mode === 'dust' && styles.modeChipOn]}
          >
            <Text style={[styles.modeText, mode === 'dust' && styles.modeTextOn]}>Disenchant</Text>
          </Pressable>
        </View>

        <TextInput
          placeholder={mode === 'forge' ? 'Search cards to forge…' : 'Search cards to dust…'}
          placeholderTextColor={palette.textMuted}
          value={forgeQ}
          onChangeText={setForgeQ}
          style={styles.search}
        />

        {craftable.map((c) => {
          const qty = owned[c.id] ?? 0;
          const cost = forgeCost(c.id);
          const spare = maxDisenchantable(c.id, owned, deck);
          return (
            <Pressable
              key={c.id}
              onPress={() => (mode === 'forge' ? onForge(c) : onDust(c))}
              style={styles.forgeRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.forgeName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[styles.forgeMeta, { color: rarityColors[c.rarity as Rarity] }]}>
                  {c.rarity} · {c.faction} · owned ×{qty}
                  {mode === 'dust' ? ` · spare ×${spare}` : ''}
                </Text>
              </View>
              <Text style={styles.forgeCost}>
                {mode === 'forge' ? `−${cost}` : `+${DISENCHANT_DUST[c.rarity]}`}
              </Text>
            </Pressable>
          );
        })}
        {!craftable.length && (
          <Text style={styles.emptyForge}>
            {mode === 'forge'
              ? 'No affordable forge targets — earn dust by disenchanting extras.'
              : 'No spare copies to disenchant (deck copies stay protected).'}
          </Text>
        )}

        <Text style={styles.note}>
          Tip: Casual duel +50 · Story scenarios 40–100 gold. Packs expand your collection for stronger
          decks.
        </Text>
      </ScrollView>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  title: { color: palette.text, fontSize: 28, fontWeight: '800' },
  gold: { color: palette.goldBright, fontSize: 16, marginBottom: 24, marginTop: 4 },
  packCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: palette.gold },
  heroImage: { width: '100%', height: 160 },
  packInner: { padding: 24 },
  packLabel: { color: palette.gold, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  packName: { color: palette.text, fontSize: 26, fontWeight: '800', marginVertical: 8 },
  packDesc: { color: palette.textMuted, lineHeight: 22, marginBottom: 16 },
  buyRow: { flexDirection: 'row', gap: 10 },
  buyBtn: {
    flex: 1,
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyBtnAlt: { backgroundColor: palette.goldBright },
  buyDisabled: { backgroundColor: '#5A5040' },
  buyText: { color: '#1A1200', fontWeight: '800', fontSize: 15 },
  buySub: { color: '#1A1200AA', fontWeight: '700', fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 6,
  },
  sectionHint: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  rates: { color: '#8A919C', fontSize: 11, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.bgPanel,
  },
  modeChipOn: { borderColor: palette.gold, backgroundColor: palette.gold + '22' },
  modeText: { color: palette.textMuted, fontWeight: '700', fontSize: 13 },
  modeTextOn: { color: palette.goldBright },
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
  forgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff14',
    gap: 10,
  },
  forgeName: { color: palette.text, fontWeight: '700', fontSize: 14 },
  forgeMeta: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  forgeCost: { color: palette.goldBright, fontWeight: '800', fontSize: 14 },
  emptyForge: { color: palette.textMuted, fontSize: 13, paddingVertical: 16 },
  note: { color: palette.textMuted, marginTop: 24, lineHeight: 20, fontSize: 13 },
});
