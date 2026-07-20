import React from 'react';
import { Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCard, totalCost } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { palette, factionColors, rarityColors } from '../theme/colors';
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
      >
        <CardView card={card} width={cardW} showcase />
        <Text style={[styles.name, { color: f.main }]}>{card.name}</Text>
        <Text style={styles.line}>
          {card.type} · {card.faction} ·{' '}
          <Text style={{ color: rarityColors[card.rarity] }}>{card.rarity}</Text>
        </Text>
        <Text style={styles.owned}>Owned: {owned}</Text>
        {card.type !== 'Domain' && (
          <Text style={styles.meta}>Essence cost total: {totalCost(card.cost)}</Text>
        )}
        {card.type === 'Unit' && (
          <Text style={styles.meta}>
            Power / Resolve: {card.power}/{card.resolve}
          </Text>
        )}
        {!!card.keywords.length && (
          <Text style={styles.keywords}>{card.keywords.join(' · ')}</Text>
        )}
        <Text style={styles.rules}>{card.text || 'No additional rules text.'}</Text>
        <Text style={styles.flavor}>“{card.flavor}”</Text>
      </ScrollView>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, alignItems: 'center' },
  name: { fontSize: 26, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  line: { color: palette.textMuted, marginTop: 6, fontSize: 14 },
  owned: { color: palette.gold, marginTop: 10, fontWeight: '700' },
  meta: { color: palette.textMuted, marginTop: 6 },
  keywords: { color: palette.goldBright, marginTop: 12, fontWeight: '800' },
  rules: { color: palette.text, marginTop: 12, lineHeight: 22, textAlign: 'center' },
  flavor: { color: palette.textMuted, fontStyle: 'italic', marginTop: 16, textAlign: 'center' },
});
