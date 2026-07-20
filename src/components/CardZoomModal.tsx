import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardDef } from '../types/card';
import { CardView, cardZoomWidth } from './CardView';
import { VaultButton } from './VaultButton';
import { palette, factionColors, rarityColors } from '../theme/colors';
import { type, fonts } from '../theme/typography';

type Props = {
  card: CardDef | null;
  visible: boolean;
  onClose: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function CardZoomModal({
  card,
  visible,
  onClose,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  if (!card) return null;
  const f = factionColors[card.faction];
  const w = cardZoomWidth();
  const topPad = Math.max(insets.top, 12) + 16;
  const bottomPad = Math.max(insets.bottom, 16) + 12;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['#000000F2', '#0B0E14F8', '#000000F2']}
          style={[styles.sheet, { paddingTop: topPad, paddingBottom: bottomPad }]}
        >
          <Text style={[styles.kicker, { color: f.main }]} numberOfLines={1}>
            {card.faction.toUpperCase()} · {card.type}
          </Text>

          <ScrollView
            style={{ maxHeight: height - topPad - bottomPad - 140 }}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <CardView card={card} width={w} showcase />
            <Text style={[styles.rarity, { color: rarityColors[card.rarity] }]}>
              {card.rarity}
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            {!!onPrimary && !!primaryLabel && (
              <VaultButton
                label={primaryLabel}
                onPress={() => {
                  onPrimary();
                  onClose();
                }}
              />
            )}
            {!!onSecondary && !!secondaryLabel && (
              <VaultButton
                label={secondaryLabel}
                variant="secondary"
                onPress={() => {
                  onSecondary();
                  onClose();
                }}
              />
            )}
            <VaultButton label="Close" variant="ghost" onPress={onClose} />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000DD',
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  kicker: {
    ...type.kicker,
    textAlign: 'center',
    marginBottom: 10,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  rarity: {
    marginTop: 10,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
});
