import raw from '../data/cards.json';
import { CardDef, EssenceCost, Faction } from '../types/card';

export const ALL_CARDS = raw as CardDef[];

export const cardById = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c])) as Record<string, CardDef>;

export function getCard(id: string): CardDef {
  const card = cardById[id];
  if (card) return card;
  // Never throw during battle/UI — missing IDs used to crash the whole app.
  console.warn(`[cardDb] Unknown card id: ${id}`);
  return {
    id: id || 'unknown',
    name: 'Broken Seal',
    type: 'Unit',
    faction: 'Neutral',
    rarity: 'Common',
    cost: { dawn: 0, tide: 0, shade: 0, ember: 0, thorn: 0, any: 0 },
    power: 0,
    resolve: 1,
    keywords: [],
    text: 'This rune failed to resolve.',
    flavor: '',
    artPrompt: '',
  };
}

/** Safe lookup — never throws (UI / navigation paths). */
export function tryGetCard(id: string | null | undefined): CardDef | null {
  if (!id) return null;
  return cardById[id] ?? null;
}

export function totalCost(cost: EssenceCost): number {
  return cost.dawn + cost.tide + cost.shade + cost.ember + cost.thorn + cost.any;
}

export function factionEssenceKey(faction: Faction): keyof EssenceCost | null {
  switch (faction) {
    case 'Dawn':
      return 'dawn';
    case 'Tide':
      return 'tide';
    case 'Shade':
      return 'shade';
    case 'Ember':
      return 'ember';
    case 'Thorn':
      return 'thorn';
    default:
      return null;
  }
}

export function emptyEssence() {
  return { dawn: 0, tide: 0, shade: 0, ember: 0, thorn: 0, any: 0 };
}

export function cardsByRarity(rarity: CardDef['rarity']) {
  return ALL_CARDS.filter((c) => c.rarity === rarity);
}

export function basicDomains() {
  return ALL_CARDS.filter((c) => c.type === 'Domain');
}
