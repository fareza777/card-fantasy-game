import { ALL_CARDS, cardsByRarity } from './cardDb';
import { CardDef, Rarity } from '../types/card';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Rare+ slot: ~3% Legendary (was 15%). */
function weightedRareSlot(): Rarity {
  return Math.random() < 0.03 ? 'Legendary' : 'Rare';
}

/**
 * Origins booster: 11 cards —
 * 7 Common · 3 Uncommon · 1 Rare-or-Legendary (~3% Legendary).
 */
export function openBooster(): CardDef[] {
  const commons = cardsByRarity('Common');
  const uncommons = cardsByRarity('Uncommon');
  const rares = cardsByRarity('Rare');
  const legendaries = cardsByRarity('Legendary');

  const pack: CardDef[] = [];
  for (let i = 0; i < 7; i++) pack.push(pickRandom(commons));
  for (let i = 0; i < 3; i++) pack.push(pickRandom(uncommons));

  const rareSlot = weightedRareSlot();
  if (rareSlot === 'Legendary' && legendaries.length) {
    pack.push(pickRandom(legendaries));
  } else if (rares.length) {
    pack.push(pickRandom(rares));
  } else {
    pack.push(pickRandom(ALL_CARDS));
  }
  return pack;
}

function pickMissingCard(owned: Record<string, number>): CardDef | null {
  const missing = ALL_CARDS.filter((c) => (owned[c.id] ?? 0) <= 0);
  if (!missing.length) return null;
  return missing[Math.floor(Math.random() * missing.length)];
}

/**
 * Opens a booster with a soft pity rule: once 5 packs in a row have added no
 * new unique card, the next pack is guaranteed at least one card not owned.
 */
export function openBoosterWithPity(
  owned: Record<string, number>,
  pitySoFar: number,
): { pack: CardDef[]; newPity: number } {
  let pack = openBooster();
  const hasNewNaturally = pack.some((c) => (owned[c.id] ?? 0) <= 0);
  if (pitySoFar >= 5 && !hasNewNaturally) {
    const filler = pickMissingCard(owned);
    if (filler) {
      pack = [...pack];
      pack[pack.length - 1] = filler;
    }
  }
  const gotNew = pack.some((c) => (owned[c.id] ?? 0) <= 0);
  return { pack, newPity: gotNew ? 0 : pitySoFar + 1 };
}

export const PACK_PRICE = 100;
export const STARTER_GOLD = 500;
export const STARTER_DUST = 80;

/** Starter collection: enough to build a legal Ember or mixed deck */
export function starterOwnedCounts(): Record<string, number> {
  const owned: Record<string, number> = {};
  const give = (id: string, n: number) => {
    owned[id] = (owned[id] ?? 0) + n;
  };

  for (let i = 1; i <= 15; i++) {
    give(`rv-${String(i).padStart(3, '0')}`, 4);
  }

  give('rv-031', 3);
  give('rv-032', 3);
  give('rv-033', 2);
  give('rv-034', 1);
  give('rv-049', 3);
  give('rv-050', 2);
  give('rv-056', 1);
  give('rv-016', 2);
  give('rv-017', 2);
  give('rv-018', 1);
  give('rv-041', 2);
  give('rv-043', 2);
  give('rv-046', 2);
  give('rv-058', 1);
  give('rv-036', 2);
  give('rv-037', 2);

  return owned;
}

export function buildStarterDeck(): string[] {
  const deck: string[] = [];
  const add = (id: string, n: number) => {
    for (let i = 0; i < n; i++) deck.push(id);
  };

  add('rv-010', 4);
  add('rv-011', 4);
  add('rv-012', 4);
  add('rv-013', 4);
  add('rv-031', 3);
  add('rv-032', 3);
  add('rv-033', 2);
  add('rv-034', 1);
  add('rv-049', 3);
  add('rv-050', 2);
  add('rv-056', 1);
  add('rv-036', 2);
  add('rv-037', 2);
  add('rv-046', 2);
  add('rv-058', 1);
  add('rv-016', 2);
  return deck;
}

export type AiArchetype = 'shade' | 'ember' | 'dawn' | 'tide';

/** Casual AI decks respect Domain ×4 copy limits (same as players). */
export function buildAiDeck(archetype?: AiArchetype): string[] {
  const pick =
    archetype ??
    (['shade', 'ember', 'dawn', 'tide'] as AiArchetype[])[Math.floor(Math.random() * 4)];
  const deck: string[] = [];
  const add = (id: string, n: number) => {
    for (let i = 0; i < n; i++) deck.push(id);
  };

  if (pick === 'ember') {
    add('rv-010', 4);
    add('rv-011', 4);
    add('rv-012', 4);
    add('rv-031', 3);
    add('rv-032', 3);
    add('rv-033', 2);
    add('rv-034', 2);
    add('rv-049', 3);
    add('rv-050', 2);
    add('rv-051', 2);
    add('rv-056', 2);
    add('rv-035', 2);
    add('rv-036', 2);
    add('rv-013', 4);
    add('rv-058', 1);
  } else if (pick === 'dawn') {
    add('rv-001', 4);
    add('rv-002', 4);
    add('rv-003', 4);
    add('rv-016', 3);
    add('rv-017', 3);
    add('rv-018', 2);
    add('rv-019', 2);
    add('rv-020', 1);
    add('rv-041', 3);
    add('rv-042', 2);
    add('rv-053', 2);
    add('rv-043', 2);
    add('rv-004', 4);
    add('rv-058', 1);
    add('rv-059', 1);
    add('rv-021', 2);
  } else if (pick === 'tide') {
    add('rv-004', 4);
    add('rv-005', 4);
    add('rv-006', 4);
    add('rv-021', 3);
    add('rv-022', 3);
    add('rv-023', 2);
    add('rv-024', 2);
    add('rv-025', 2);
    add('rv-043', 3);
    add('rv-044', 2);
    add('rv-054', 2);
    add('rv-045', 2);
    add('rv-001', 4);
    add('rv-058', 1);
    add('rv-046', 2);
  } else {
    // shade (default Hollow-ish)
    add('rv-007', 4);
    add('rv-008', 4);
    add('rv-009', 4);
    add('rv-026', 3);
    add('rv-027', 3);
    add('rv-028', 2);
    add('rv-029', 2);
    add('rv-030', 1);
    add('rv-046', 3);
    add('rv-047', 2);
    add('rv-048', 2);
    add('rv-055', 2);
    add('rv-004', 4);
    add('rv-043', 2);
    add('rv-058', 1);
    add('rv-021', 1);
  }

  // Pad / trim to 40
  while (deck.length > 40) deck.pop();
  while (deck.length < 40) deck.push(pick === 'ember' ? 'rv-031' : 'rv-026');
  return deck.slice(0, 40);
}
