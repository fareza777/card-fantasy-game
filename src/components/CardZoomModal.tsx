import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardDef } from '../types/card';
import { CardView, cardZoomWidth } from './CardView';
import { palette, factionColors, rarityColors } from '../theme/colors';

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
            <Text style={[styles.rarity, { color: rarityColors[card.rarity] }]}>{card.rarity}</Text>
          </ScrollView>

          <View style={styles.actions}>
            {!!onPrimary && !!primaryLabel && (
              <Pressable
                onPress={() => {
                  onPrimary();
                  onClose();
                }}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              </Pressable>
            )}
            {!!onSecondary && !!secondaryLabel && (
              <Pressable
                onPress={() => {
                  onSecondary();
                  onClose();
                }}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
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
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 10,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  rarity: {
    marginTop: 10,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 13,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  primary: {
    backgroundColor: palette.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#1A1200', fontWeight: '900', fontSize: 16 },
  secondary: {
    backgroundColor: palette.bgPanel,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.gold,
  },
  secondaryText: { color: palette.goldBright, fontWeight: '800', fontSize: 15 },
  close: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: { color: palette.textMuted, fontWeight: '700', fontSize: 14 },
});
