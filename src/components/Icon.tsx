import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

/**
 * Curated icon set for Rune Vault. Only these names are used across the app —
 * keeps iconography consistent instead of scattered magic strings.
 */
const ICON_MAP = {
  // Tabs
  home: 'home',
  collection: 'layers',
  deck: 'albums',
  shop: 'storefront',
  profile: 'person',
  // Actions
  play: 'play',
  search: 'search',
  close: 'close',
  back: 'chevron-back',
  forward: 'chevron-forward',
  add: 'add',
  remove: 'remove',
  check: 'checkmark',
  refresh: 'refresh',
  // Game concepts
  battle: 'flash',
  story: 'book',
  rules: 'information-circle',
  trophy: 'trophy',
  gold: 'diamond',
  dust: 'sparkles',
  pack: 'gift',
  heart: 'heart',
  shield: 'shield',
  skull: 'skull',
  timer: 'hourglass',
  warning: 'warning',
  settings: 'settings',
  stats: 'stats-chart',
  cards: 'albums-outline',
  // Factions
  dawn: 'sunny',
  tide: 'water',
  shade: 'moon',
  ember: 'flame',
  thorn: 'leaf',
  neutral: 'ellipse',
} as const;

export type IconName = keyof typeof ICON_MAP;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 18, color = palette.textMuted }: Props) {
  return <Ionicons name={ICON_MAP[name]} size={size} color={color} />;
}
