import { Faction, Rarity } from '../types/card';

export const palette = {
  bg: '#0B0E14',
  bgDeep: '#070A0F',
  bgElevated: '#141A24',
  bgPanel: '#1A2230',
  border: '#2A3548',
  borderGold: '#4A3B1E',
  text: '#F2E8D5',
  textMuted: '#9AA3B5',
  gold: '#D4A84B',
  goldBright: '#F0C75E',
  goldDim: '#8A6E35',
  danger: '#C44536',
  success: '#3D8B6E',
  white: '#FFFFFF',
};

export const factionColors: Record<Faction, { main: string; deep: string; soft: string; label: string }> = {
  Dawn: { main: '#E8C547', deep: '#8A6B1A', soft: '#F5E6A8', label: 'Dawn' },
  Tide: { main: '#3B8FD9', deep: '#1A4A7A', soft: '#A8D4F5', label: 'Tide' },
  Shade: { main: '#8B5CF6', deep: '#4C1D95', soft: '#D4C4F7', label: 'Shade' },
  Ember: { main: '#E85D3B', deep: '#7A2410', soft: '#F5B8A8', label: 'Ember' },
  Thorn: { main: '#4CAF6A', deep: '#1F5C32', soft: '#B8E6C4', label: 'Thorn' },
  Neutral: { main: '#A0A8B8', deep: '#3A4252', soft: '#D8DCE4', label: 'Neutral' },
};

export const rarityColors: Record<Rarity, string> = {
  Common: '#9AA3B5',
  Uncommon: '#3D8B6E',
  Rare: '#3B8FD9',
  Legendary: '#D4A84B',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
