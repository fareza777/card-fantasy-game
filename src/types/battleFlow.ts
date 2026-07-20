/** MTG-inspired turn steps (Rune Vault names). No imports from card.ts (avoid cycles). */

export type TurnStep =
  | 'untap'
  | 'upkeep'
  | 'draw'
  | 'main1'
  | 'combat_begin'
  | 'combat_attackers'
  | 'combat_blockers'
  | 'combat_damage'
  | 'combat_end'
  | 'main2'
  | 'end'
  | 'cleanup'
  | 'gameover';

/** @deprecated Use TurnStep */
export type BattlePhase = TurnStep | 'ready' | 'main' | 'strike';

export interface CombatState {
  attackers: string[];
  blockers: Record<string, string>;
  selectedAttackerForBlock: string | null;
}

export type StackKind = 'rite' | 'trigger';

export interface StackItem {
  id: string;
  kind: StackKind;
  controller: 'player' | 'enemy';
  cardId: string;
  handIndex?: number;
  label: string;
  /** Pending resolve target — flushed on Pass Priority (real stack). */
  pendingTarget?: { type: 'unit'; id: string } | { type: 'face' } | null;
}

export const STEP_LABELS: Record<TurnStep, string> = {
  untap: 'Ready',
  upkeep: 'Upkeep',
  draw: 'Draw',
  main1: 'Main Phase 1',
  combat_begin: 'Begin Combat',
  combat_attackers: 'Declare Attackers',
  combat_blockers: 'Declare Blockers',
  combat_damage: 'Combat Damage',
  combat_end: 'End Combat',
  main2: 'Main Phase 2',
  end: 'End Step',
  cleanup: 'Cleanup',
  gameover: 'Game Over',
};

export const SORCERY_STEPS: TurnStep[] = ['main1', 'main2'];

export const INSTANT_STEPS: TurnStep[] = [
  'upkeep',
  'draw',
  'main1',
  'combat_begin',
  'combat_attackers',
  'combat_blockers',
  'combat_damage',
  'combat_end',
  'main2',
  'end',
];

export function isMainStep(step: string): boolean {
  return step === 'main1' || step === 'main2';
}

export function canPlayType(
  type: string,
  step: string,
  opts?: { flash?: boolean },
): boolean {
  if (step === 'gameover') return false;
  // Sigil = instant; Canticle = sorcery; legacy Rite treated as instant
  if (type === 'Sigil' || type === 'Rite') return (INSTANT_STEPS as string[]).includes(step);
  if (type === 'Canticle') return (SORCERY_STEPS as string[]).includes(step);
  if (opts?.flash && type === 'Unit') {
    return (
      (INSTANT_STEPS as string[]).includes(step) || (SORCERY_STEPS as string[]).includes(step)
    );
  }
  return (SORCERY_STEPS as string[]).includes(step);
}

export function canActivateDomain(step: string): boolean {
  return (INSTANT_STEPS as string[]).includes(step) || step === 'untap';
}

export function emptyCombat(): CombatState {
  return { attackers: [], blockers: {}, selectedAttackerForBlock: null };
}
