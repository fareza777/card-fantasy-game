import { FieldUnit, PlayerState, BattleState, PlayerId, CastTarget } from '../types/card';

export function hasWard(u: FieldUnit): boolean {
  return u.keywords.includes('Ward');
}

export function hasGuard(u: FieldUnit): boolean {
  return u.keywords.includes('Guard');
}

/** Ward blocks being chosen as a spell/ability target (combat damage still hits). */
export function isLegalSpellTarget(
  units: FieldUnit[],
  instanceId: string,
  opts?: { ignoreWard?: boolean },
): boolean {
  const u = units.find((x) => x.instanceId === instanceId);
  if (!u) return false;
  if (!opts?.ignoreWard && hasWard(u)) return false;
  return true;
}

export function firstLegalEnemyUnit(o: PlayerState): FieldUnit | undefined {
  return o.units.find((u) => !hasWard(u));
}

export function validateCastTarget(
  state: BattleState,
  who: PlayerId,
  mode: 'enemyUnit' | 'enemyUnitOrFace' | 'ownUnit',
  target: CastTarget,
): boolean {
  if (target.type === 'face') return mode === 'enemyUnitOrFace';
  const opp = who === 'player' ? 'enemy' : 'player';
  if (mode === 'ownUnit') {
    return !!state.players[who].units.find((u) => u.instanceId === target.id);
  }
  return isLegalSpellTarget(state.players[opp].units, target.id);
}

/**
 * Guard rule: if you control an untapped Guard that is not already blocking,
 * you may not leave attackers unblocked (must assign that Guard if able).
 */
export function guardBlocksLegal(state: BattleState): { ok: boolean; reason?: string } {
  if (state.phase !== 'combat_blockers') return { ok: true };
  const defender = state.active === 'player' ? 'enemy' : 'player';
  const def = state.players[defender];
  const assigned = new Set(Object.values(state.combat.blockers));
  const freeGuards = def.units.filter(
    (u) => hasGuard(u) && !u.exhausted && !assigned.has(u.instanceId),
  );
  const unblocked = state.combat.attackers.filter((a) => !state.combat.blockers[a]);
  if (freeGuards.length > 0 && unblocked.length > 0) {
    return {
      ok: false,
      reason: `${freeGuards.length} Guard(s) must block — assign them or they cannot idle while attackers are open.`,
    };
  }
  return { ok: true };
}

/** Auto-force free Guards onto unblocked attackers (AI / sync fallback). */
export function forceGuardBlocks(state: BattleState) {
  const defender = state.active === 'player' ? 'enemy' : 'player';
  const def = state.players[defender];
  const assigned = new Set(Object.values(state.combat.blockers));
  const freeGuards = def.units.filter(
    (u) => hasGuard(u) && !u.exhausted && !assigned.has(u.instanceId),
  );
  const unblocked = state.combat.attackers.filter((a) => !state.combat.blockers[a]);
  for (let i = 0; i < unblocked.length && i < freeGuards.length; i++) {
    state.combat.blockers[unblocked[i]] = freeGuards[i].instanceId;
  }
}
