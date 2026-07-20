import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCard, totalCost } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { Icon } from '../components/Icon';
import { palette, factionColors, rarityColors } from '../theme/colors';
import { type, fonts } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';
import { useGameStore } from '../store/gameStore';

export function CardDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CardDetail'>>();
  const insets = useSafeAreaInsets();
  const card = getCard(route.params.cardId);
  const owned = useGameStore((s) => s.owned[card.id] ?? 0);
  const f = factionColors[card.faction];
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 48, 320);

  return (
    <VaultScreenShell bgImage={require('../../assets/ui/bg-home-vault.png')}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <CardView card={card} width={cardW} showcase />

        <Text style={[styles.name, { color: f.main }]}>{card.name}</Text>
        <Text style={styles.line}>
          {card.type} · {card.faction} ·{' '}
          <Text style={{ color: rarityColors[card.rarity] }}>{card.rarity}</Text>
        </Text>

        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Icon name="collection" size={12} color={palette.gold} />
            <Text style={styles.pillText}>Owned ×{owned}</Text>
          </View>
          {card.type !== 'Domain' && (
            <View style={styles.pill}>
              <Icon name="dust" size={12} color={palette.gold} />
              <Text style={styles.pillText}>Cost {totalCost(card.cost)}</Text>
            </View>
          )}
          {card.type === 'Unit' && (
            <View style={styles.pill}>
              <Icon name="battle" size={12} color={palette.gold} />
              <Text style={styles.pillText}>
                {card.power}/{card.resolve}
              </Text>
            </View>
          )}
        </View>

        {!!card.keywords.length && <Text style={styles.keywords}>{card.keywords.join(' · ')}</Text>}

        <View style={styles.ruleBox}>
          <Text style={styles.rules}>{card.text || 'No additional rules text.'}</Text>
        </View>

        <Text style={styles.flavor}>“{card.flavor}”</Text>
      </ScrollView>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, alignItems: 'center' },
  name: {
    fontFamily: fonts.displayBlack,
    fontSize: 24,
    letterSpacing: 0.8,
    marginTop: 18,
    textAlign: 'center',
  },
  line: {
    ...type.caption,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.3)',
    backgroundColor: 'rgba(212,168,75,0.07)',
  },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.goldBright },
  keywords: {
    fontFamily: fonts.bodySemi,
    color: palette.goldBright,
    marginTop: 14,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  ruleBox: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(120,140,170,0.18)',
  },
  rules: {
    ...type.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  flavor: {
    fontFamily: fonts.displayMedium,
    color: palette.textMuted,
    fontStyle: 'italic',
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
});
