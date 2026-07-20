import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CardDef, EssenceCost } from '../types/card';
import { factionColors, rarityColors, palette } from '../theme/colors';
import { totalCost } from '../engine/cardDb';
import { getCardArt } from '../data/cardArt';

/** Generated card arts are 1024×1536 (2:3). */
const ART_RATIO = 1536 / 1024;
/** TCG Claude / Shardfall board aspect (≈ classic TCG). */
const BOARD_RATIO = 88 / 63;

type Props = {
  card: CardDef;
  width?: number;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
  count?: number;
  showcase?: boolean;
  /** Full mini card for battlefield (like TCG Claude CardWidget). */
  board?: boolean;
  /** Rotated / tapped (exerted). */
  exerted?: boolean;
  /** Live power/resolve override for board units. */
  power?: number;
  resolve?: number;
  /** Collection: grey out cards you do not own. */
  unowned?: boolean;
};

function CostPips({ cost, large, tiny }: { cost: EssenceCost; large?: boolean; tiny?: boolean }) {
  const pips: { color: string; key: string }[] = [];
  const map: [keyof EssenceCost, string][] = [
    ['dawn', factionColors.Dawn.main],
    ['tide', factionColors.Tide.main],
    ['shade', factionColors.Shade.main],
    ['ember', factionColors.Ember.main],
    ['thorn', factionColors.Thorn.main],
    ['any', '#C5CBD6'],
  ];
  for (const [k, color] of map) {
    for (let i = 0; i < cost[k]; i++) pips.push({ color, key: `${k}-${i}` });
  }
  const size = large ? 13 : tiny ? 6 : 9;
  if (!pips.length) {
    return <Text style={[styles.domainTag, large && { fontSize: 10 }, tiny && { fontSize: 7 }]}>DOM</Text>;
  }
  return (
    <View style={styles.pips}>
      {pips.map((p) => (
        <View
          key={p.key}
          style={[styles.pip, { backgroundColor: p.color, width: size, height: size, borderRadius: size / 2 }]}
        />
      ))}
    </View>
  );
}

function CardArtImage({
  cardId,
  width,
  height,
  fallback,
}: {
  cardId: string;
  width: number;
  height: number;
  fallback: React.ReactNode;
}) {
  const src = getCardArt(cardId);
  if (!src) return <>{fallback}</>;
  const naturalH = width * ART_RATIO;
  const imgH = Math.max(naturalH, height);
  return (
    <View style={[styles.artFrame, { width, height }]}>
      <Image
        source={src}
        style={{ width, height: imgH, position: 'absolute', top: 0, left: 0 }}
        resizeMode="cover"
      />
    </View>
  );
}

export const CardView = React.memo(function CardView({
  card,
  width = 148,
  selected,
  onPress,
  onLongPress,
  compact,
  count,
  showcase,
  board,
  exerted,
  power,
  resolve,
  unowned,
}: Props) {
  const faction = factionColors[card.faction] ?? factionColors.Neutral;

  // ── Board mode (TCG Claude style): complete mini card, fixed aspect ──
  if (board) {
    const h = Math.round(width * BOARD_RATIO);
    const nameH = Math.max(18, Math.round(width * 0.24));
    const src = getCardArt(card.id);
    const p = power ?? card.power ?? 0;
    const r = resolve ?? card.resolve ?? 0;
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        style={[
          styles.boardWrap,
          { width, height: h, transform: [{ rotate: exerted ? '12deg' : '0deg' }] },
          selected && styles.boardSelected,
        ]}
      >
        <LinearGradient colors={['#E6CE96', '#B9995C', '#6E5527', '#B9995C']} style={styles.boardGold}>
          <View style={[styles.boardInner, { borderColor: faction.main }]}>
            <View style={[styles.boardHeader, { height: nameH, minHeight: nameH }]}>
              <Text style={styles.boardName} numberOfLines={1} allowFontScaling={false}>
                {card.name}
              </Text>
              <CostPips cost={card.cost} tiny />
            </View>
            <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#05070A' }}>
              {src ? (
                <Image
                  source={src}
                  style={{ width: width - 8, height: (width - 8) * ART_RATIO, position: 'absolute', top: 0 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ flex: 1, backgroundColor: faction.deep }} />
              )}
            </View>
            {card.type === 'Unit' && (
              <View style={styles.boardStats}>
                <Text style={styles.boardStatText} allowFontScaling={false}>
                  {p}/{r}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // Collection: reserve real space for 2-line names (was clipping into overflow:hidden).
  const artH = showcase
    ? Math.round(width * ART_RATIO)
    : compact
      ? Math.round(width * 1.05)
      : Math.round(width * 0.82);
  const bodyMin = showcase ? 128 : compact ? 0 : 102;
  const headerH = showcase ? 48 : compact ? 28 : 46;
  const height = showcase
    ? headerH + artH + bodyMin
    : compact
      ? headerH + artH + 18
      : headerH + artH + bodyMin;

  const artSeed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < card.id.length; i++) h = (h * 31 + card.id.charCodeAt(i)) >>> 0;
    return h;
  }, [card.id]);
  const artAngle = (artSeed % 60) + 120;
  const motif =
    card.type === 'Domain' ? '◈' : card.type === 'Unit' ? '⚔' : card.type === 'Sigil' ? '✧' : card.type === 'Canticle' ? '✦' : card.type === 'Bond' ? '◎' : '⬡';
  const nameSize = showcase ? 15 : compact ? 10 : 11;

  const fallback = (
    <LinearGradient colors={['#0A0E14', faction.deep + 'AA', '#0A0E14']} style={[styles.artFallback, { height: artH }]}>
      <Text style={[styles.motif, { transform: [{ rotate: `${artAngle}deg` }] }]}>{motif}</Text>
      <Text style={styles.artFaction}>{card.faction}</Text>
    </LinearGradient>
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        { width, height },
        selected && styles.selected,
        unowned && styles.unownedWrap,
      ]}
    >
      <LinearGradient
        colors={unowned ? ['#3A3F48', '#1A1D22', '#0A0C10'] : [faction.main, faction.deep, '#0A0C10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.outerGlow}
      >
        <View style={[styles.frame, { borderColor: unowned ? '#4A5160' : rarityColors[card.rarity] }]}>
          <View style={styles.inner}>
            <View style={[styles.header, { height: headerH, minHeight: headerH }, showcase && styles.headerLg]}>
              <Text
                style={[styles.name, { fontSize: nameSize }, unowned && styles.unownedText]}
                numberOfLines={compact ? 1 : 2}
                allowFontScaling={false}
              >
                {card.name}
              </Text>
              <CostPips cost={card.cost} large={showcase} />
            </View>

            <View style={{ width: '100%', height: artH, overflow: 'hidden', backgroundColor: '#05070A' }}>
              <CardArtImage cardId={card.id} width={width - 5} height={artH} fallback={fallback} />
              <LinearGradient colors={['transparent', '#0B0E1488']} style={styles.artVignette} pointerEvents="none" />
              <View style={[styles.rarityGem, { backgroundColor: unowned ? '#555' : rarityColors[card.rarity] }]} />
              {compact && (
                <View style={styles.compactTypeStrip}>
                  <Text style={styles.compactType} numberOfLines={1}>
                    {card.type}
                    {card.faction !== 'Neutral' ? ` · ${card.faction}` : ''}
                  </Text>
                </View>
              )}
              {unowned && <View style={styles.unownedVeil} pointerEvents="none" />}
            </View>

            {!compact && (
              <>
                <View style={styles.typeLine}>
                  <Text
                    style={[styles.typeText, showcase && { fontSize: 11 }, unowned && styles.unownedText]}
                    numberOfLines={1}
                  >
                    {card.type}
                    {card.faction !== 'Neutral' ? ` — ${card.faction}` : ''}
                  </Text>
                  <Text
                    style={[
                      styles.rarityText,
                      { color: unowned ? '#6A7280' : rarityColors[card.rarity] },
                      showcase && { fontSize: 11 },
                    ]}
                    numberOfLines={1}
                  >
                    {card.rarity}
                  </Text>
                </View>
                <View
                  style={[styles.textBox, showcase && styles.textBoxLg, card.type === 'Unit' && styles.textBoxStats]}
                >
                  {!!card.keywords.length && (
                    <Text
                      style={[styles.keywords, showcase && { fontSize: 12 }, unowned && styles.unownedText]}
                      numberOfLines={1}
                    >
                      {card.keywords.join(' · ')}
                    </Text>
                  )}
                  {!!card.text && (
                    <Text
                      style={[
                        styles.rules,
                        showcase && { fontSize: 12, lineHeight: 17 },
                        unowned && styles.unownedText,
                      ]}
                      numberOfLines={showcase ? 12 : 6}
                    >
                      {card.text}
                    </Text>
                  )}
                  {!!card.flavor && showcase && (
                    <Text style={[styles.flavor, { fontSize: 11 }]} numberOfLines={2}>
                      “{card.flavor}”
                    </Text>
                  )}
                </View>
              </>
            )}

            {card.type === 'Unit' && (
              <View style={[styles.stats, showcase && styles.statsLg, compact && styles.statsCompact]}>
                <Text
                  style={[
                    styles.statText,
                    showcase && { fontSize: 15 },
                    compact && { fontSize: 12 },
                    unowned && styles.unownedText,
                  ]}
                >
                  {card.power}/{card.resolve}
                </Text>
              </View>
            )}
            {count != null && count > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>×{count}</Text>
              </View>
            )}
            {unowned && (
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedText}>Locked</Text>
              </View>
            )}
            {card.type !== 'Domain' && compact && (
              <View style={styles.compactCostPill}>
                <Text style={styles.compactCost}>{totalCost(card.cost)}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, margin: 4 },
  wrapCompact: { margin: 0, borderRadius: 10 },
  selected: {
    transform: [{ translateY: -10 }],
    shadowColor: palette.goldBright,
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 12,
  },
  outerGlow: { flex: 1, borderRadius: 12, padding: 2.5 },
  frame: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#0B0E14',
  },
  inner: { flex: 1, backgroundColor: '#10141C' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingTop: Platform.OS === 'android' ? 4 : 6,
    paddingBottom: 4,
    flexShrink: 0,
    zIndex: 2,
    backgroundColor: '#0B0E14F2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff22',
  },
  headerLg: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  name: {
    flex: 1,
    color: palette.text,
    fontWeight: '800',
    marginRight: 4,
    letterSpacing: 0.15,
    lineHeight: 15,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  pips: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 58, justifyContent: 'flex-end' },
  pip: { margin: 1, borderWidth: 1, borderColor: '#0008' },
  domainTag: { color: palette.gold, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  artFrame: { overflow: 'hidden', backgroundColor: '#05070A' },
  artFallback: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  artVignette: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '55%' },
  motif: { fontSize: 40, opacity: 0.35, color: '#fff' },
  artFaction: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.9,
  },
  rarityGem: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: '#fff5',
  },
  compactTypeStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B0E14CC',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  compactType: { color: palette.textMuted, fontSize: 8, fontWeight: '700' },
  typeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff18',
    backgroundColor: '#0E1218',
  },
  typeText: { flex: 1, color: palette.textMuted, fontSize: 9, fontWeight: '700' },
  rarityText: { fontSize: 9, fontWeight: '800', flexShrink: 0 },
  textBox: { flexGrow: 1, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 10, minHeight: 88 },
  textBoxLg: { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 10, minHeight: 110 },
  textBoxStats: { paddingBottom: 40 },
  keywords: { color: palette.goldBright, fontSize: 9, fontWeight: '800', marginBottom: 3 },
  rules: { color: palette.text, fontSize: 10, lineHeight: 14 },
  flavor: { color: palette.textMuted, fontSize: 8, fontStyle: 'italic', marginTop: 6 },
  stats: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    backgroundColor: '#0B0E14F0',
    borderWidth: 1.5,
    borderColor: palette.gold,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statsLg: { paddingHorizontal: 11, paddingVertical: 5 },
  statsCompact: { right: 5, bottom: 5, paddingHorizontal: 5, paddingVertical: 2 },
  statText: { color: palette.goldBright, fontWeight: '900', fontSize: 12 },
  countBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    backgroundColor: palette.gold,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: { color: '#1A1200', fontWeight: '900', fontSize: 11 },
  unownedWrap: { opacity: 0.72 },
  unownedText: { color: '#8A919C' },
  unownedVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0C10AA',
  },
  lockedBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    backgroundColor: '#2A3038EE',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#5A6270',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockedText: { color: '#A8B0BC', fontWeight: '800', fontSize: 10, letterSpacing: 0.4 },
  compactCostPill: {
    position: 'absolute',
    right: 5,
    top: 32,
    backgroundColor: '#0B0E14EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gold + '88',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  compactCost: { color: palette.text, fontWeight: '800', fontSize: 11 },

  // Board (Claude-style)
  boardWrap: {
    borderRadius: 10,
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  boardSelected: {
    shadowColor: palette.goldBright,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
    borderRadius: 10,
  },
  boardGold: { flex: 1, borderRadius: 10, padding: 2 },
  boardInner: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#0A0C10',
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#0B0E14F5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff22',
  },
  boardName: {
    flex: 1,
    color: palette.text,
    fontSize: 8,
    fontWeight: '800',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  boardStats: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: '#0A0C12F5',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: palette.gold + 'AA',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  boardStatText: { color: palette.goldBright, fontSize: 10, fontWeight: '900' },
});

export function cardZoomWidth() {
  const { width, height } = Dimensions.get('window');
  const maxByH = (height - 200) / (ART_RATIO + 0.38);
  return Math.min(width - 40, maxByH, 320);
}
