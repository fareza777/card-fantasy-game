import { Rarity } from '../types/card';
import { getCard } from './cardDb';

/** Dust gained when disenchanting one copy. */
export const DISENCHANT_DUST: Record<Rarity, number> = {
  Common: 5,
  Uncommon: 20,
  Rare: 100,
  Legendary: 400,
};

/** Dust required to forge one copy. */
export const FORGE_COST: Record<Rarity, number> = {
  Common: 40,
  Uncommon: 100,
  Rare: 400,
  Legendary: 1600,
};

export function disenchantValue(cardId: string): number {
  return DISENCHANT_DUST[getCard(cardId).rarity];
}

export function forgeCost(cardId: string): number {
  return FORGE_COST[getCard(cardId).rarity];
}

/**
 * How many copies can safely be dusted: keep enough for the active deck,
 * and never dust below 0. Players can dust extras freely.
 */
export function maxDisenchantable(
  cardId: string,
  owned: Record<string, number>,
  deck: string[],
): number {
  const have = owned[cardId] ?? 0;
  if (have <= 0) return 0;
  const inDeck = deck.filter((id) => id === cardId).length;
  return Math.max(0, have - inDeck);
}
