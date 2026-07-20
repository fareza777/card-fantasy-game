import type { TurnStep, CombatState, StackItem } from './battleFlow';

export type { TurnStep, CombatState, StackItem, BattlePhase } from './battleFlow';

export type Faction = 'Dawn' | 'Tide' | 'Shade' | 'Ember' | 'Thorn' | 'Neutral';
export type CardType = 'Domain' | 'Unit' | 'Sigil' | 'Canticle' | 'Bond' | 'Relic';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
export type Keyword = 'Raid' | 'Ward' | 'Guard' | 'Drain' | 'Pierce' | 'Flash';

/** Instant-speed spell (most steps + response). */
export const SPELL_INSTANT = 'Sigil' as const;
/** Sorcery-speed spell (your Main only). */
export const SPELL_SORCERY = 'Canticle' as const;

export function isSpellType(type: string): boolean {
  return type === 'Sigil' || type === 'Canticle' || type === 'Rite';
}

export function isInstantSpell(type: string): boolean {
  return type === 'Sigil' || type === 'Rite';
}

export interface EssenceCost {
  dawn: number;
  tide: number;
  shade: number;
  ember: number;
  thorn: number;
  any: number;
}

export interface CardEtb {
  heal?: number;
  draw?: number;
  discardOpp?: boolean;
  extraDomain?: number;
  damageEnemyUnit?: number;
  bounceMaxCost?: number;
}

export interface CardRiteFx {
  heal?: number;
  draw?: number;
  discardOpp?: boolean;
  discardSelf?: number;
  damageUnit?: number;
  aoeEnemy?: number;
  extraDomain?: number;
  buffOwn?: number;
  bounceAny?: boolean;
  bounceMaxCost?: number;
  grantWard?: boolean;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  faction: Faction;
  rarity: Rarity;
  cost: EssenceCost;
  power: number | null;
  resolve: number | null;
  keywords: Keyword[];
  text: string;
  flavor: string;
  artPrompt: string;
  /** Optional structured enter-the-battlefield / relic enter effects (set expansion). */
  etb?: CardEtb | null;
  /** Optional structured Rite resolution (set expansion). */
  rite?: CardRiteFx | null;
}

export interface EssencePool {
  dawn: number;
  tide: number;
  shade: number;
  ember: number;
  thorn: number;
  any: number;
}

export interface FieldUnit {
  instanceId: string;
  cardId: string;
  power: number;
  resolve: number;
  maxResolve: number;
  exhausted: boolean;
  keywords: Keyword[];
  canStrike: boolean;
  tempPower: number;
  damageMarked: number;
  /** Keywords granted until end of turn (cleared on cleanup). */
  tempKeywords: Keyword[];
  /** Keywords granted until controller's next upkeep (e.g. Aegis). */
  lingeringKeywords: Keyword[];
}

export interface FieldPermanent {
  instanceId: string;
  cardId: string;
  exhausted?: boolean;
}

export type PlayerId = 'player' | 'enemy';

export interface PlayerState {
  id: PlayerId;
  life: number;
  hand: string[];
  deck: string[];
  discard: string[];
  domains: FieldPermanent[];
  units: FieldUnit[];
  bonds: FieldPermanent[];
  relics: FieldPermanent[];
  essence: EssencePool;
  domainsPlayedThisTurn: number;
  extraDomainsAllowed: number;
  ritesCastThisTurn: number;
  cardsDrawnThisTurn: number;
}

export interface BattleLogEntry {
  id: string;
  text: string;
}

export type CastTarget =
  | { type: 'unit'; id: string }
  | { type: 'face' };

export type PendingTarget = {
  handIndex: number;
  cardId: string;
  mode: 'enemyUnit' | 'enemyUnitOrFace' | 'ownUnit';
} | null;

export interface BattleState {
  turn: number;
  active: PlayerId;
  phase: TurnStep;
  players: Record<PlayerId, PlayerState>;
  log: BattleLogEntry[];
  winner: PlayerId | null;
  selectedHandIndex: number | null;
  selectedAttackerId: string | null;
  combat: CombatState;
  stack: StackItem[];
  priority: PlayerId;
  skippedFirstDraw: boolean;
  pendingTarget: PendingTarget;
  /** Player may cast instant Rites before the active player continues. */
  responseWindow: boolean;
}
