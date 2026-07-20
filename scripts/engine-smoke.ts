/**
 * Lightweight engine smoke tests (no jest). Run: npx --yes tsx scripts/engine-smoke.ts
 */
import {
  firstLegalEnemyUnit,
  guardBlocksLegal,
  hasWard,
  validateCastTarget,
} from '../src/engine/combatRules';
import { canPlayType } from '../src/types/battleFlow';
import { FieldUnit, PlayerState } from '../src/types/card';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function unit(partial: Partial<FieldUnit> & { instanceId: string; cardId: string }): FieldUnit {
  return {
    power: 2,
    resolve: 2,
    maxResolve: 2,
    exhausted: false,
    keywords: [],
    canStrike: true,
    tempPower: 0,
    damageMarked: 0,
    tempKeywords: [],
    lingeringKeywords: [],
    ...partial,
  };
}

const warded = unit({ instanceId: 'w1', cardId: 'rv-x', keywords: ['Ward'] });
const open = unit({ instanceId: 'o1', cardId: 'rv-y' });
const guard = unit({ instanceId: 'g1', cardId: 'rv-g', keywords: ['Guard'] });

assert(hasWard(warded), 'Ward detect');
assert(!hasWard(open), 'non-Ward');
assert(firstLegalEnemyUnit({ units: [warded, open] } as PlayerState)?.instanceId === 'o1', 'skip Ward');
assert(firstLegalEnemyUnit({ units: [warded] } as PlayerState) === undefined, 'only Ward → none');

assert(canPlayType('Rite', 'main1'), 'Rite main');
assert(canPlayType('Unit', 'combat_blockers', { flash: true }), 'Flash unit instant');
assert(!canPlayType('Unit', 'combat_blockers'), 'normal unit not instant');

const fakeState: any = {
  phase: 'combat_blockers',
  active: 'enemy',
  combat: { attackers: ['a1'], blockers: {}, selectedAttackerForBlock: 'a1' },
  players: {
    player: { units: [guard] },
    enemy: { units: [] },
  },
};
assert(!guardBlocksLegal(fakeState).ok, 'Guard must block');
fakeState.combat.blockers = { a1: 'g1' };
assert(guardBlocksLegal(fakeState).ok, 'Guard assigned ok');

const battleStub: any = {
  players: {
    player: { units: [open] },
    enemy: { units: [warded, open] },
  },
};
assert(
  !validateCastTarget(battleStub, 'player', 'enemyUnit', { type: 'unit', id: 'w1' }),
  'cannot target Ward',
);
assert(
  validateCastTarget(battleStub, 'player', 'enemyUnit', { type: 'unit', id: 'o1' }),
  'can target open',
);

console.log('engine-smoke: all passed');
