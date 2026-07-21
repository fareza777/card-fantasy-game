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
import { ScreenHeader } from '../components/ScreenHeader';
import { Panel } from '../components/Panel';
import { Icon } from '../components/Icon';
import { ALL_CARDS } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import {
  DISENCHANT_DUST,
  FORGE_COST,
  forgeCost,
  maxDisenchantable,
} from '../engine/forge';
import { palette, rarityColors } from '../theme/colors';
import { type, fonts } from '../theme/typography';
import { radii, shadows } from '../theme/tokens';
import { CardDef, Rarity } from '../types/card';
import { RootStackParamList } from '../navigation/types';

const MULTI_PRICE = PACK_PRICE * 3;

function BalancePill({ icon, value, tint }: { icon: 'gold' | 'dust'; value: number; tint: string }) {
  return (
    <View style={[styles.balancePill, { borderColor: tint + '55' }]}>
      <Icon name={icon} size={13} color={tint} />
      <Text style={[styles.balanceText, { color: tint }]}>{value}</Text>
    </View>
  );
}

function BuyButton({
  label,
  price,
  disabled,
  onPress,
}: {
  label: string;
  price: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buyBtn,
        !disabled && shadows.goldGlow,
        pressed && !disabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
      ]}
    >
      <LinearGradient
        colors={disabled ? ['#5A5040', '#4A4238'] : ['#F0C75E', '#D4A84B', '#C09A3E']}
        style={styles.buyBtnGrad}
      >
        <Text style={[styles.buyText, disabled && { color: '#2A241A' }]}>{label}</Text>
        <View style={styles.buyPriceRow}>
          <Icon name="gold" size={11} color={disabled ? '#2A241A' : '#1A1200'} />
          <Text style={[styles.buySub, disabled && { color: '#2A241A' }]}>{price}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

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
      gradientColors={['rgba(7,10,15,0.66)', 'rgba(10,14,20,0.86)', 'rgba(7,10,15,0.97)']}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          kicker="MARKET"
          title="Shop"
          right={
            <View style={styles.balanceRow}>
              <BalancePill icon="gold" value={gold} tint={palette.goldBright} />
              <BalancePill icon="dust" value={dust} tint="#B8C7FF" />
            </View>
          }
        />

        <Panel elevated style={styles.packCard}>
          <View>
            <Image
              source={require('../../assets/ui/booster-pack-origins.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10,13,18,0.92)']}
              style={styles.heroFade}
              pointerEvents="none"
            />
          </View>
          <View style={styles.packInner}>
            <Text style={type.kicker}>ORIGINS BOOSTER</Text>
            <Text style={styles.packName}>Rune Vault Pack</Text>
            <View style={styles.oddsList}>
              <OddsRow icon="cards" text="11 cards per pack" />
              <OddsRow icon="check" text="7 Common · 3 Uncommon · 1 Rare+" />
              <OddsRow icon="dust" text="~3% chance the rare slot is Legendary" />
              <OddsRow icon="shield" text="5 duds in a row? Next pack guarantees new" />
            </View>
            <View style={styles.buyRow}>
              <BuyButton label="Open ×1" price={PACK_PRICE} disabled={gold < PACK_PRICE} onPress={() => buy(1)} />
              <BuyButton label="Open ×3" price={MULTI_PRICE} disabled={gold < MULTI_PRICE} onPress={() => buy(3)} />
            </View>
          </View>
        </Panel>

        <View style={styles.forgeHeader}>
          <Text style={styles.forgeTitle}>Rune Forge</Text>
          <Text style={styles.sectionHint}>
            Disenchant spare copies into Dust, then Forge the exact cards you're missing — no luck
            required.
          </Text>
          <RateLegend />
        </View>

        <View style={styles.modeToggle}>
          {(['forge', 'dust'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeSeg, active && styles.modeSegActive]}
              >
                <Icon
                  name={m === 'forge' ? 'dust' : 'refresh'}
                  size={13}
                  color={active ? palette.goldBright : palette.textMuted}
                />
                <Text style={[styles.modeText, active && styles.modeTextOn]}>
                  {m === 'forge' ? 'Forge' : 'Disenchant'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchWrap}>
          <Icon name="search" size={15} color={palette.textMuted} />
          <TextInput
            placeholder={mode === 'forge' ? 'Search cards to forge…' : 'Search cards to dust…'}
            placeholderTextColor="#5F6B7E"
            value={forgeQ}
            onChangeText={setForgeQ}
            style={styles.search}
          />
        </View>

        <Panel style={styles.forgeList}>
          {craftable.map((c, idx) => {
            const qty = owned[c.id] ?? 0;
            const cost = forgeCost(c.id);
            const spare = maxDisenchantable(c.id, owned, deck);
            const gain = DISENCHANT_DUST[c.rarity];
            const rc = rarityColors[c.rarity as Rarity];
            const canAfford = mode === 'forge' ? dust >= cost : spare > 0;
            return (
              <Pressable
                key={c.id}
                onPress={() => (mode === 'forge' ? onForge(c) : onDust(c))}
                style={({ pressed }) => [
                  styles.forgeRow,
                  idx > 0 && styles.forgeRowBorder,
                  pressed && { backgroundColor: 'rgba(212,168,75,0.06)' },
                  !canAfford && { opacity: 0.55 },
                ]}
              >
                <CardView card={c} width={64} compact />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.forgeName} numberOfLines={2}>
                    {c.name}
                  </Text>
                  <Text style={styles.forgeMeta}>
                    <Text style={{ color: rc }}>{c.rarity}</Text>
                    {` · ${c.type} · ${c.faction}`}
                  </Text>
                  <Text style={styles.forgeOwned}>
                    Owned ×{qty}
                    {mode === 'dust' ? ` · spare ×${spare}` : ''}
                  </Text>
                </View>
                <View style={styles.forgeActionCol}>
                  <View style={[styles.costBadge, mode === 'dust' && styles.costBadgeGain]}>
                    <Icon
                      name="dust"
                      size={12}
                      color={mode === 'forge' ? palette.goldBright : '#9EE8C4'}
                    />
                    <Text style={[styles.forgeCost, mode === 'dust' && { color: '#9EE8C4' }]}>
                      {mode === 'forge' ? cost : `+${gain}`}
                    </Text>
                  </View>
                  <Text style={styles.forgeActionHint}>
                    {mode === 'forge' ? (canAfford ? 'Tap to forge' : 'Need dust') : 'Tap to dust'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {!craftable.length && (
            <Text style={styles.emptyForge}>
              {mode === 'forge'
                ? 'No forge targets — earn dust by disenchanting extras.'
                : 'No spare copies to disenchant (deck copies stay protected).'}
            </Text>
          )}
        </Panel>

        <View style={styles.noteRow}>
          <Icon name="rules" size={13} color={palette.goldDim} />
          <Text style={styles.note}>
            Casual duel +50 gold · Story scenarios 40–100 gold. Packs expand your collection for
            stronger decks.
          </Text>
        </View>
      </ScrollView>
    </VaultScreenShell>
  );
}

function OddsRow({ icon, text }: { icon: 'cards' | 'check' | 'dust' | 'shield'; text: string }) {
  return (
    <View style={styles.oddsRow}>
      <Icon name={icon} size={13} color={palette.goldDim} />
      <Text style={styles.oddsText}>{text}</Text>
    </View>
  );
}

const LEGEND_RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Legendary'];

/** Compact table: what you gain by disenchanting vs. what it costs to forge, per rarity. */
function RateLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendHeadRow}>
        <Text style={[styles.legendCell, styles.legendCellName, styles.legendHead]}>Rarity</Text>
        <Text style={[styles.legendCell, styles.legendHead]}>Disenchant</Text>
        <Text style={[styles.legendCell, styles.legendHead]}>Forge</Text>
      </View>
      {LEGEND_RARITIES.map((r) => (
        <View key={r} style={styles.legendRow}>
          <View style={[styles.legendCellName, styles.legendNameWrap]}>
            <View style={[styles.legendDot, { backgroundColor: rarityColors[r] }]} />
            <Text style={[styles.legendName, { color: rarityColors[r] }]}>{r}</Text>
          </View>
          <Text style={[styles.legendCell, styles.legendGain]}>+{DISENCHANT_DUST[r]}</Text>
          <Text style={[styles.legendCell, styles.legendCost]}>{FORGE_COST[r]}</Text>
        </View>
      ))}
      <Text style={styles.legendFoot}>Values in Dust. Deck copies are always protected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18 },
  balanceRow: { flexDirection: 'row', gap: 8 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(16,21,30,0.85)',
  },
  balanceText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  packCard: { marginBottom: 8 },
  heroImage: { width: '100%', height: 168 },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  packInner: { padding: 20, paddingTop: 16 },
  packName: {
    fontFamily: fonts.displayBlack,
    color: palette.text,
    fontSize: 24,
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 12,
  },
  oddsList: { gap: 7, marginBottom: 18 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  oddsText: { ...type.caption, fontSize: 12.5, color: '#B8BEC9' },
  buyRow: { flexDirection: 'row', gap: 10 },
  buyBtn: { flex: 1, borderRadius: radii.md, overflow: 'hidden' },
  buyBtnGrad: { paddingVertical: 13, alignItems: 'center', gap: 3 },
  buyText: { fontFamily: fonts.display, color: '#1A1200', fontSize: 15, letterSpacing: 0.8 },
  buyPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  buySub: { fontFamily: fonts.bodyBold, color: '#1A1200', fontSize: 12, opacity: 0.85 },
  forgeHeader: { marginTop: 26, marginBottom: 14 },
  forgeTitle: {
    fontFamily: fonts.display,
    color: palette.text,
    fontSize: 20,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionHint: { ...type.caption, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  legend: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.16)',
    backgroundColor: 'rgba(12,16,24,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legendHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  legendCell: { flex: 1, textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 12 },
  legendCellName: { flex: 1.4, textAlign: 'left' },
  legendHead: {
    color: '#7A8494',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: fonts.bodySemi,
  },
  legendNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  legendName: { fontFamily: fonts.bodySemi, fontSize: 12.5 },
  legendGain: { color: '#9EE8C4' },
  legendCost: { color: palette.goldBright },
  legendFoot: {
    fontFamily: fonts.bodyMedium,
    color: '#6B7484',
    fontSize: 10.5,
    marginTop: 7,
    fontStyle: 'italic',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(16,21,30,0.85)',
    padding: 3,
    gap: 3,
    marginBottom: 10,
  },
  modeSeg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  modeSegActive: { backgroundColor: 'rgba(212,168,75,0.16)' },
  modeText: { fontFamily: fonts.bodySemi, color: palette.textMuted, fontSize: 13 },
  modeTextOn: { color: palette.goldBright },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(16,21,30,0.85)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  search: { flex: 1, color: palette.text, fontFamily: fonts.body, fontSize: 14, paddingVertical: 10 },
  forgeList: { paddingHorizontal: 6, paddingVertical: 4 },
  forgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: radii.sm,
  },
  forgeRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  forgeName: { color: palette.text, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 18 },
  forgeMeta: { fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 3, color: '#A8B0C0' },
  forgeOwned: { fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 3, color: palette.goldDim },
  forgeActionCol: { alignItems: 'flex-end', gap: 5, minWidth: 78 },
  forgeActionHint: { fontFamily: fonts.bodyMedium, fontSize: 10, color: '#8A93A3' },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.4)',
    backgroundColor: 'rgba(212,168,75,0.10)',
  },
  costBadgeGain: {
    borderColor: 'rgba(61,139,110,0.5)',
    backgroundColor: 'rgba(61,139,110,0.12)',
  },
  forgeCost: { color: palette.goldBright, fontFamily: fonts.bodyBold, fontSize: 14 },
  emptyForge: { ...type.caption, fontSize: 13, padding: 18 },
  noteRow: { flexDirection: 'row', gap: 8, marginTop: 22, alignItems: 'flex-start' },
  note: { ...type.caption, flex: 1, lineHeight: 19 },
});
