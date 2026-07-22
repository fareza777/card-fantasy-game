/**
 * Rune Vault battle engine — MTG-inspired turn structure.
 *
 * Turn: Ready → Upkeep → Draw → Main 1 → Combat → Main 2 → End → Cleanup
 * Combat: Begin → Attackers → Blockers → Damage → End
 * Zones: Hand, Deck, Battlefield (units/domains/bonds/relics), Graveyard (discard)
 * Speed: Domain/Unit/Bond/Relic/Canticle = sorcery (Main only); Sigil = instant
 */
import { getCard, tryGetCard, emptyEssence, totalCost, factionEssenceKey } from './cardDb';
import {
  BattleState,
  CastTarget,
  EssenceCost,
  EssencePool,
  FieldUnit,
  Keyword,
  PendingTarget,
  PlayerId,
  PlayerState,
  TurnStep,
  isSpellType,
  isInstantSpell,
} from '../types/card';
import {
  canPlayType,
  canActivateDomain,
  isMainStep,
  emptyCombat,
} from '../types/battleFlow';
import {
  firstLegalEnemyUnit,
  forceGuardBlocks,
  guardBlocksLegal,
  hasWard,
  validateCastTarget,
} from './combatRules';

let _uid = 0;
const uid = () => `i-${++_uid}`;
const logId = () => `l-${++_uid}`;

function cloneState<T>(state: T): T {
  try {
    return structuredClone(state);
  } catch {
    return JSON.parse(JSON.stringify(state)) as T;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makePlayer(id: PlayerId, deck: string[]): PlayerState {
  const shuffled = shuffle(deck);
  return {
    id,
    life: 20,
    hand: shuffled.slice(0, 5),
    deck: shuffled.slice(5),
    discard: [],
    domains: [],
    units: [],
    bonds: [],
    relics: [],
    essence: emptyEssence(),
    domainsPlayedThisTurn: 0,
    extraDomainsAllowed: 0,
    ritesCastThisTurn: 0,
    cardsDrawnThisTurn: 0,
  };
}

export function createBattle(
  playerDeck: string[],
  enemyDeck: string[],
  opts?: { firstPlayer?: PlayerId },
): BattleState {
  _uid = 0;
  const first = opts?.firstPlayer ?? 'player';
  const state: BattleState = {
    turn: 1,
    active: first,
    phase: 'main1',
    players: {
      player: makePlayer('player', playerDeck),
      enemy: makePlayer('enemy', enemyDeck),
    },
    log: [
      {
        id: logId(),
        text:
          first === 'player'
            ? 'Coin favors you — you go first (no draw on turn 1).'
            : 'Coin favors the foe — they go first (no draw on turn 1).',
      },
    ],
    winner: null,
    selectedHandIndex: null,
    selectedAttackerId: null,
    combat: emptyCombat(),
    stack: [],
    priority: first,
    skippedFirstDraw: true,
    pendingTarget: null,
    responseWindow: false,
  };
  beginTurnKeepHand(state, first, true);
  return state;
}

function opponent(id: PlayerId): PlayerId {
  return id === 'player' ? 'enemy' : 'player';
}

function pushLog(state: BattleState, text: string) {
  state.log = [{ id: logId(), text }, ...state.log].slice(0, 80);
}

/** Rites that require choosing a target before resolving. */
export function riteNeedsTarget(
  cardId: string,
  ctx?: { state: BattleState; who: PlayerId },
): 'enemyUnit' | 'enemyUnitOrFace' | 'ownUnit' | null {
  const card = tryGetCard(cardId);
  if (card?.rite) {
    const r = card.rite;
    if (r.grantWard || r.buffOwn) return 'ownUnit';
    if (r.damageUnit || r.bounceAny || r.bounceMaxCost != null) return 'enemyUnit';
  }
  switch (cardId) {
    case 'rv-042':
    case 'rv-052':
      return 'ownUnit';
    case 'rv-043':
    case 'rv-046':
    case 'rv-048':
      return 'enemyUnit';
    case 'rv-049':
    case 'rv-051': {
      // "Deal N to target Unit. Pierce." — must hit a Unit whenever one exists.
      // Only an empty enemy board lets Pierce carry straight to face (no target
      // needed), so the card never offers a face option while Units are up.
      if (ctx) {
        const foe = ctx.state.players[opponent(ctx.who)];
        return foe.units.some((u) => !hasWard(u)) ? 'enemyUnit' : null;
      }
      return 'enemyUnit';
    }
    default:
      return null;
  }
}

function autoPickTarget(
  state: BattleState,
  who: PlayerId,
  mode: 'enemyUnit' | 'enemyUnitOrFace' | 'ownUnit',
): CastTarget | null {
  const p = state.players[who];
  const o = state.players[opponent(who)];
  if (mode === 'ownUnit') {
    const u = p.units[0];
    return u ? { type: 'unit', id: u.instanceId } : null;
  }
  // Prefer killable / highest power among legal (non-Ward) targets
  const legal = o.units.filter((u) => !hasWard(u));
  if (legal.length) {
    const scored = [...legal].sort((a, b) => {
      const aKill = a.resolve <= 3 ? 20 : 0;
      return b.power + b.tempPower + aKill - (a.power + a.tempPower);
    });
    return { type: 'unit', id: scored[0].instanceId };
  }
  if (mode === 'enemyUnitOrFace') return { type: 'face' };
  return null;
}

function pushStackRite(
  state: BattleState,
  who: PlayerId,
  cardId: string,
  pendingTarget?: CastTarget | null,
) {
  state.stack.push({
    id: uid(),
    kind: 'rite',
    controller: who,
    cardId,
    label: getCard(cardId).name,
    pendingTarget: pendingTarget === undefined ? undefined : pendingTarget,
  });
}

function flushStack(state: BattleState) {
  while (state.stack.length) {
    const top = state.stack.pop()!;
    if (top.kind !== 'rite') continue;
    if (top.pendingTarget === undefined) continue; // already resolved / log-only
    pushLog(state, `Stack resolves → ${top.label}`);
    resolveRite(state, top.controller, top.cardId, top.pendingTarget);
    top.pendingTarget = undefined;
  }
}

function resolveStackTop(
  state: BattleState,
  who: PlayerId,
  cardId: string,
  target: CastTarget | null,
  opts?: { defer?: boolean },
) {
  if (opts?.defer) {
    pushStackRite(state, who, cardId, target);
    pushLog(state, `Stack: ${getCard(cardId).name} (waiting for priority).`);
    return;
  }
  pushStackRite(state, who, cardId, undefined);
  const top = state.stack.pop();
  if (top) pushLog(state, `Stack → ${top.label}`);
  resolveRite(state, who, cardId, target);
}

function canPay(pool: EssencePool, cost: EssenceCost): boolean {
  const p = { ...pool };
  const colored: (keyof EssenceCost)[] = ['dawn', 'tide', 'shade', 'ember', 'thorn'];
  for (const k of colored) {
    if (p[k] < cost[k]) return false;
    p[k] -= cost[k];
  }
  let anyNeeded = cost.any;
  for (const k of colored) {
    while (anyNeeded > 0 && p[k] > 0) {
      p[k]--;
      anyNeeded--;
    }
  }
  if (anyNeeded > 0 && p.any >= anyNeeded) anyNeeded = 0;
  return anyNeeded === 0;
}

function payCost(pool: EssencePool, cost: EssenceCost): EssencePool {
  const p = { ...pool };
  const colored: (keyof EssenceCost)[] = ['dawn', 'tide', 'shade', 'ember', 'thorn'];
  for (const k of colored) p[k] -= cost[k];
  let anyNeeded = cost.any;
  for (const k of colored) {
    while (anyNeeded > 0 && p[k] > 0) {
      p[k]--;
      anyNeeded--;
    }
  }
  if (anyNeeded > 0) p.any -= anyNeeded;
  return p;
}

function effectiveCost(cardId: string, p: PlayerState): EssenceCost {
  const card = getCard(cardId);
  const cost = { ...card.cost };
  if (card.id === 'rv-039') {
    const extra = Math.min(2, Math.max(0, p.domains.length - 1));
    let reduce = extra;
    const keys: (keyof EssenceCost)[] = ['any', 'thorn', 'dawn', 'tide', 'shade', 'ember'];
    for (const k of keys) {
      const take = Math.min(reduce, cost[k]);
      cost[k] -= take;
      reduce -= take;
    }
  }
  if (isSpellType(card.type) && p.bonds.some((b) => b.cardId === 'rv-054' || b.cardId === 'rv-124' || b.cardId === 'rv-179')) {
    if (cost.any > 0) cost.any -= 1;
    else {
      const keys: (keyof EssenceCost)[] = ['dawn', 'tide', 'shade', 'ember', 'thorn'];
      for (const k of keys) {
        if (cost[k] > 0) {
          cost[k] -= 1;
          break;
        }
      }
    }
    if (totalCost(cost) < 1) cost.any = 1;
  }
  return cost;
}

function drawCard(state: BattleState, who: PlayerId, n = 1) {
  const p = state.players[who];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      p.life = 0;
      state.winner = opponent(who);
      state.phase = 'gameover';
      pushLog(state, `${who === 'player' ? 'You' : 'Enemy'} milled out and loses.`);
      return;
    }
    p.hand.push(p.deck.shift()!);
    p.cardsDrawnThisTurn += 1;
    for (const u of p.units) {
      if (u.cardId === 'rv-024') {
        u.tempPower += 1;
        u.resolve += 1;
      }
    }
  }
}

function clampLife(state: BattleState) {
  state.players.player.life = Math.max(0, Math.min(20, state.players.player.life));
  state.players.enemy.life = Math.max(0, Math.min(20, state.players.enemy.life));
}

/** All life gain must go through here so Sunblade Paladin (rv-019) triggers. */
function restoreLife(state: BattleState, who: PlayerId, amount: number) {
  if (amount <= 0) return;
  const p = state.players[who];
  const before = p.life;
  p.life = Math.min(20, p.life + amount);
  const gained = p.life - before;
  if (gained <= 0) return;
  for (const u of p.units) {
    if (u.cardId !== 'rv-019') continue;
    const o = state.players[opponent(who)];
    const t = firstLegalEnemyUnit(o);
    if (t) dealDamageToUnit(state, opponent(who), t.instanceId, 1);
  }
}

function checkWinner(state: BattleState) {
  clampLife(state);
  if (state.players.player.life <= 0) {
    state.winner = 'enemy';
    state.phase = 'gameover';
    pushLog(state, 'Defeat. Your life reached 0.');
  } else if (state.players.enemy.life <= 0) {
    state.winner = 'player';
    state.phase = 'gameover';
    pushLog(state, 'Victory! Enemy life reached 0.');
  }
}

function destroyUnit(state: BattleState, owner: PlayerId, instanceId: string) {
  const p = state.players[owner];
  const idx = p.units.findIndex((u) => u && u.instanceId === instanceId);
  if (idx < 0) return;
  const dead = p.units[idx];
  if (!dead?.cardId) {
    p.units.splice(idx, 1);
    return;
  }
  p.units.splice(idx, 1);
  p.discard.push(dead.cardId);
  const deadName = tryGetCard(dead.cardId)?.name ?? dead.cardId;
  pushLog(state, `${deadName} → Ashwell.`);

  const killer = state.players[opponent(owner)];
  if (killer.units.some((u) => u?.cardId === 'rv-030')) {
    killer.essence.shade += 1;
    pushLog(state, 'Malvora harvests Shade Essence.');
  }
  if (p.bonds.some((b) => b?.cardId === 'rv-055')) {
    const opp = state.players[opponent(owner)];
    if (opp.hand.length) {
      const di = Math.floor(Math.random() * opp.hand.length);
      const discarded = opp.hand.splice(di, 1)[0];
      if (discarded) opp.discard.push(discarded);
    }
    restoreLife(state, owner, 1);
  }
  if (p.bonds.some((b) => b?.cardId === 'rv-122' || b?.cardId === 'rv-180')) {
    restoreLife(state, owner, 1);
  }
}

function dealDamageToUnit(
  state: BattleState,
  owner: PlayerId,
  instanceId: string,
  amount: number,
  opts: { drain?: boolean; piercerOwner?: PlayerId } = {},
) {
  const p = state.players[owner];
  const u = p.units.find((x) => x.instanceId === instanceId);
  if (!u) return;
  u.resolve -= amount;
  u.damageMarked += amount;
  if (opts.drain && opts.piercerOwner) {
    restoreLife(state, opts.piercerOwner, amount);
  }
  if (u.resolve <= 0) destroyUnit(state, owner, instanceId);
}

/** Untap / ready + upkeep triggers; optionally skip draw */
function beginTurnKeepHand(state: BattleState, who: PlayerId, skipDraw: boolean) {
  const p = state.players[who];
  p.essence = emptyEssence();
  p.domainsPlayedThisTurn = 0;
  p.extraDomainsAllowed = 0;
  p.ritesCastThisTurn = 0;
  p.cardsDrawnThisTurn = 0;
  state.combat = emptyCombat();
  state.stack = [];
  state.responseWindow = false;
  state.selectedHandIndex = null;
  state.selectedAttackerId = null;
  state.priority = who;

  // —— Untap / Ready ——
  state.phase = 'untap';
  for (const u of p.units) {
    u.exhausted = false;
    u.tempPower = 0;
    u.canStrike = true;
  }
  for (const d of p.domains) d.exhausted = false;
  for (const r of p.relics) r.exhausted = false;

  // —— Upkeep ——
  state.phase = 'upkeep';
  // Clear "until your next turn" buffs (Aegis Ward, etc.)
  for (const u of p.units) {
    if (u.lingeringKeywords?.length) {
      for (const k of u.lingeringKeywords) {
        u.keywords = u.keywords.filter((x) => x !== k);
      }
      u.lingeringKeywords = [];
    }
  }
  if (p.bonds.some((b) => b.cardId === 'rv-053')) {
    if (p.life >= 20) drawCard(state, who, 1);
    else restoreLife(state, who, 1);
  }
  if (p.bonds.some((b) => b.cardId === 'rv-121' || b.cardId === 'rv-178')) {
    restoreLife(state, who, 1);
  }
  if (p.bonds.some((b) => b.cardId === 'rv-123') && p.life >= 18) {
    drawCard(state, who, 1);
  }
  if (p.relics.some((r) => r.cardId === 'rv-060')) {
    if (p.deck.length >= 2) {
      const top = p.deck.splice(0, 2);
      p.hand.push(top[0]);
      p.deck.push(top[1]);
      p.cardsDrawnThisTurn += 1;
    } else if (p.deck.length === 1) {
      p.hand.push(p.deck.shift()!);
      p.cardsDrawnThisTurn += 1;
    }
  }
  for (const u of p.units) {
    if (u.cardId === 'rv-025') drawCard(state, who, 1);
    if (u.cardId === 'rv-040') p.extraDomainsAllowed += 1;
  }

  // —— Draw ——
  state.phase = 'draw';
  if (!skipDraw) {
    drawCard(state, who, 1);
    pushLog(state, `${who === 'player' ? 'You' : 'Enemy'} draw for turn.`);
  } else {
    pushLog(state, 'Draw step skipped (first player).');
  }

  state.phase = 'main1';
  pushLog(state, `${who === 'player' ? 'Your' : 'Enemy'} Main Phase 1 — Turn ${state.turn}.`);
}

function startOpponentTurn(state: BattleState, who: PlayerId) {
  beginTurnKeepHand(state, who, false);
}

// ─── Domain activate (mana ability) ─────────────────────────────────────────

export function exhaustDomain(state: BattleState, who: PlayerId, instanceId: string): BattleState {
  const next = cloneState(state);
  const p = next.players[who];
  const d = p.domains.find((x) => x.instanceId === instanceId);
  if (!d || d.exhausted || next.winner) return state;
  // Mana ability: only the controller on their turn (or with priority)
  if (next.active !== who && next.priority !== who) return state;
  if (!canActivateDomain(next.phase) && next.phase !== 'main1' && next.phase !== 'main2') {
    return state;
  }
  const card = getCard(d.cardId);
  const key = factionEssenceKey(card.faction);
  if (key) p.essence[key] += 1;
  d.exhausted = true;
  pushLog(next, `${who === 'player' ? 'You' : 'Enemy'}: ${card.name} → +1 Essence.`);
  return next;
}

export function exhaustVault(
  state: BattleState,
  who: PlayerId,
  instanceId: string,
  faction: keyof EssencePool,
): BattleState {
  const next = cloneState(state);
  const p = next.players[who];
  const r = p.relics.find((x) => x.instanceId === instanceId);
  if (!r || r.cardId !== 'rv-059' || r.exhausted || next.active !== who) return state;
  if (faction === 'any') p.essence.any += 1;
  else p.essence[faction] += 1;
  r.exhausted = true;
  return next;
}

function applyCardEtb(state: BattleState, who: PlayerId, cardId: string) {
  const card = tryGetCard(cardId);
  const etb = card?.etb;
  if (!etb) return;
  const p = state.players[who];
  const o = state.players[opponent(who)];
  if (etb.heal) restoreLife(state, who, etb.heal);
  if (etb.draw) drawCard(state, who, etb.draw);
  if (etb.extraDomain) p.extraDomainsAllowed += etb.extraDomain;
  if (etb.discardOpp && o.hand.length) {
    const i = Math.floor(Math.random() * o.hand.length);
    o.discard.push(o.hand.splice(i, 1)[0]);
    pushLog(state, `${card!.name} forces a discard.`);
  }
  if (etb.damageEnemyUnit) {
    const t = firstLegalEnemyUnit(o);
    if (t) dealDamageToUnit(state, opponent(who), t.instanceId, etb.damageEnemyUnit);
  }
  if (etb.bounceMaxCost != null) {
    const target = o.units.find(
      (u) => !hasWard(u) && totalCost(getCard(u.cardId).cost) <= etb.bounceMaxCost!,
    );
    if (target) {
      o.hand.push(target.cardId);
      o.units = o.units.filter((u) => u.instanceId !== target.instanceId);
      pushLog(state, `${getCard(target.cardId).name} returned to hand.`);
    }
  }
}

function onEnterTriggers(state: BattleState, who: PlayerId, unit: FieldUnit) {
  const card = getCard(unit.cardId);
  const opp = opponent(who);
  const p = state.players[who];
  const o = state.players[opp];

  // Everburning Brand / Emberash Kinship: Raid until end of turn
  if (
    p.bonds.some((b) => b.cardId === 'rv-056' || b.cardId === 'rv-125' || b.cardId === 'rv-181') &&
    !unit.keywords.includes('Raid')
  ) {
    unit.keywords = [...unit.keywords, 'Raid'];
    unit.tempKeywords = [...(unit.tempKeywords ?? []), 'Raid'];
    unit.canStrike = true;
  }
  if (unit.keywords.includes('Raid')) unit.canStrike = true;
  else unit.canStrike = false;

  if (card.id === 'rv-018') restoreLife(state, who, 3);
  if (card.id === 'rv-036') p.extraDomainsAllowed += 1;
  if (card.id === 'rv-027' && o.hand.length) {
    const i = Math.floor(Math.random() * o.hand.length);
    o.discard.push(o.hand.splice(i, 1)[0]);
    pushLog(state, 'Crypt Stalker forces a discard.');
  }
  if (card.id === 'rv-023') {
    const target = o.units.find((u) => totalCost(getCard(u.cardId).cost) <= 2);
    if (target) {
      o.hand.push(target.cardId);
      o.units = o.units.filter((u) => u.instanceId !== target.instanceId);
      pushLog(state, `${getCard(target.cardId).name} returned to hand.`);
    }
  }
  if (card.id === 'rv-028') {
    const t = firstLegalEnemyUnit(o);
    if (t) dealDamageToUnit(state, opp, t.instanceId, 1);
  }
  if (card.id === 'rv-034') {
    const t = firstLegalEnemyUnit(o);
    if (t) dealDamageToUnit(state, opp, t.instanceId, 2);
  }
  if (card.id === 'rv-038') {
    const idx = p.deck.findIndex((id) => getCard(id).type === 'Domain');
    if (idx >= 0) {
      const [dom] = p.deck.splice(idx, 1);
      p.hand.push(dom);
      pushLog(state, 'Grovewarden finds a Domain.');
    }
  }
  if (card.id === 'rv-021') {
    drawCard(state, who, 1);
    if (p.hand.length) p.discard.push(p.hand.pop()!);
  }
  if (card.id === 'rv-022' && p.deck.length) {
    const top = p.deck.shift()!;
    p.hand.push(top);
    p.cardsDrawnThisTurn += 1;
  }

  applyCardEtb(state, who, unit.cardId);
}

export function playHandCard(
  state: BattleState,
  who: PlayerId,
  handIndex: number,
  target?: CastTarget | null,
): BattleState {
  const next = cloneState(state);
  if (next.winner) return state;
  if (next.priority !== who) return state;
  if (next.pendingTarget && who === 'player' && target == null) return state;
  const p = next.players[who];
  if (handIndex < 0 || handIndex >= p.hand.length) return state;
  const cardId = p.hand[handIndex];
  const card = getCard(cardId);

  if (!canPlayType(card.type, next.phase, { flash: card.keywords.includes('Flash') })) return state;

  // Domains / permanents only on your turn (Flash Units / Sigils may answer at instant speed)
  const isFlashUnit = card.type === 'Unit' && card.keywords.includes('Flash');
  if (!isInstantSpell(card.type) && !isFlashUnit && next.active !== who) return state;
  if (!isSpellType(card.type) && card.type !== 'Domain' && !isFlashUnit && !isMainStep(next.phase)) {
    return state;
  }
  if (card.type === 'Domain' && !isMainStep(next.phase)) return state;

  const maxDomains = 1 + p.extraDomainsAllowed;

  if (card.type === 'Domain') {
    if (p.domainsPlayedThisTurn >= maxDomains) return state;
    p.hand.splice(handIndex, 1);
    p.domains.push({ instanceId: uid(), cardId, exhausted: false });
    p.domainsPlayedThisTurn += 1;
    if (p.bonds.some((b) => b.cardId === 'rv-057' || b.cardId === 'rv-126' || b.cardId === 'rv-182') && p.units.length) {
      p.units[0].power += 1;
      p.units[0].resolve += 1;
      p.units[0].maxResolve += 1;
    }
    for (const u of p.units) {
      if (u.cardId === 'rv-040') {
        u.power += 1;
        u.resolve += 1;
        u.maxResolve += 1;
      }
    }
    pushLog(next, `Domain: ${card.name}.`);
    next.pendingTarget = null;
    return next;
  }

  const cost = effectiveCost(cardId, p);
  if (!canPay(p.essence, cost)) return state;

  // Player must aim targeted spells; AI auto-picks
  if (isSpellType(card.type)) {
    const mode = riteNeedsTarget(cardId, { state: next, who });
    if (mode) {
      let aim = target ?? null;
      if (!aim && who === 'enemy') aim = autoPickTarget(next, who, mode);
      if (!aim && who === 'player') {
        next.pendingTarget = { handIndex, cardId, mode };
        next.selectedHandIndex = handIndex;
        pushLog(next, `Choose a target for ${card.name}.`);
        return next;
      }
      if (!aim) {
        pushLog(next, `${card.name} fizzles — no legal target.`);
        return state;
      }
      p.essence = payCost(p.essence, cost);
      p.hand.splice(handIndex, 1);
      p.ritesCastThisTurn += 1;
      // Enemy spells sit on the stack until Pass Priority; player spells resolve now
      resolveStackTop(next, who, cardId, aim, { defer: who === 'enemy' });
      p.discard.push(cardId);
      for (const u of p.units) {
        if (u.cardId === 'rv-035') u.tempPower += 2;
        if (u.cardId === 'rv-025') p.essence.any += 1;
      }
      next.pendingTarget = null;
      next.selectedHandIndex = null;
      checkWinner(next);
      return next;
    }
  }

  p.essence = payCost(p.essence, cost);
  p.hand.splice(handIndex, 1);

  if (card.type === 'Unit') {
    const keywords = [...card.keywords] as Keyword[];
    const unit: FieldUnit = {
      instanceId: uid(),
      cardId,
      power: card.power ?? 0,
      resolve: card.resolve ?? 1,
      maxResolve: card.resolve ?? 1,
      exhausted: false,
      keywords,
      canStrike: keywords.includes('Raid'),
      tempPower: 0,
      damageMarked: 0,
      tempKeywords: [],
      lingeringKeywords: [],
    };
    p.units.push(unit);
    if (
      p.units.some((u) => u.cardId === 'rv-020' && u.instanceId !== unit.instanceId) &&
      card.faction === 'Dawn'
    ) {
      if (!unit.keywords.includes('Guard')) unit.keywords.push('Guard');
    }
    if (card.id === 'rv-020') {
      for (const u of p.units) {
        if (
          u.instanceId !== unit.instanceId &&
          getCard(u.cardId).faction === 'Dawn' &&
          !u.keywords.includes('Guard')
        ) {
          u.keywords.push('Guard');
        }
      }
    }
    onEnterTriggers(next, who, unit);
    pushLog(next, `Summon ${card.name} (${unit.power}/${unit.resolve}).`);
  } else if (card.type === 'Bond') {
    p.bonds.push({ instanceId: uid(), cardId });
    applyCardEtb(next, who, cardId);
    pushLog(next, `Bond: ${card.name}.`);
  } else if (card.type === 'Relic') {
    p.relics.push({ instanceId: uid(), cardId, exhausted: false });
    applyCardEtb(next, who, cardId);
    pushLog(next, `Relic: ${card.name}.`);
  } else if (isSpellType(card.type)) {
    p.ritesCastThisTurn += 1;
    resolveStackTop(next, who, cardId, null, { defer: who === 'enemy' });
    p.discard.push(cardId);
    for (const u of p.units) {
      if (u.cardId === 'rv-035') u.tempPower += 2;
      if (u.cardId === 'rv-025') p.essence.any += 1;
    }
  }

  next.pendingTarget = null;
  checkWinner(next);
  return next;
}

export function cancelPendingTarget(state: BattleState): BattleState {
  if (!state.pendingTarget) return state;
  const next = cloneState(state);
  pushLog(next, 'Targeting cancelled.');
  next.pendingTarget = null;
  return next;
}

export function confirmPendingTarget(state: BattleState, target: CastTarget): BattleState {
  const pending = state.pendingTarget;
  if (!pending || state.priority !== 'player') return state;
  if (!validateCastTarget(state, 'player', pending.mode, target)) {
    const next = cloneState(state);
    pushLog(next, 'Illegal target — Ward cannot be chosen by spells.');
    return next;
  }
  return playHandCard(state, 'player', pending.handIndex, target);
}

function resolveRite(state: BattleState, who: PlayerId, cardId: string, target: CastTarget | null) {
  const p = state.players[who];
  const o = state.players[opponent(who)];
  const card = getCard(cardId);
  pushLog(state, `${card.type}: ${card.name}.`);

  const resolveUnitId = (side: PlayerId, preferred?: string) => {
    const pl = state.players[side];
    if (preferred) {
      const hit = pl.units.find((u) => u.instanceId === preferred);
      if (hit) {
        // Targeted spells cannot choose Ward unless it's our own unit buff
        if (side !== who && hasWard(hit)) return firstLegalEnemyUnit(pl);
        return hit;
      }
    }
    if (side !== who) return firstLegalEnemyUnit(pl);
    return pl.units[0];
  };

  const damageAimed = (amount: number, drain = false, pierce = false) => {
    if (target?.type === 'face') {
      if (!pierce && o.units.length) {
        pushLog(state, `${card.name} needs a Unit target.`);
        return;
      }
      o.life -= amount;
      if (drain) restoreLife(state, who, amount);
      pushLog(state, `${card.name} deals ${amount} to face.`);
      return;
    }
    const t = resolveUnitId(opponent(who), target?.type === 'unit' ? target.id : undefined);
    if (!t) {
      if (pierce) {
        o.life -= amount;
        if (drain) restoreLife(state, who, amount);
        pushLog(state, `${card.name} pierces for ${amount} to face.`);
      } else {
        pushLog(state, `${card.name} finds no target.`);
      }
      return;
    }
    const name = getCard(t.cardId).name;
    const before = t.resolve;
    t.resolve -= amount;
    if (drain) restoreLife(state, who, Math.min(amount, before));
    pushLog(state, `${card.name} deals ${amount} to ${name}.`);
    if (t.resolve <= 0) {
      const excess = -t.resolve;
      destroyUnit(state, opponent(who), t.instanceId);
      if (pierce && excess > 0) {
        o.life -= excess;
        if (drain) restoreLife(state, who, excess);
        pushLog(state, `Pierce spills ${excess} to face.`);
      }
    }
  };

  switch (cardId) {
    case 'rv-041':
      restoreLife(state, who, 4);
      pushLog(state, 'Blessing restores 4 life.');
      if (p.life > 15) drawCard(state, who, 1);
      break;
    case 'rv-042': {
      const u = resolveUnitId(who, target?.type === 'unit' ? target.id : undefined);
      if (u) {
        u.lingeringKeywords = u.lingeringKeywords ?? [];
        if (!u.keywords.includes('Ward')) {
          u.keywords.push('Ward');
          u.lingeringKeywords.push('Ward');
        }
        if (!u.keywords.includes('Guard')) {
          u.keywords.push('Guard');
          u.lingeringKeywords.push('Guard');
        }
        pushLog(state, `${getCard(u.cardId).name} gains Ward & Guard.`);
      }
      break;
    }
    case 'rv-043': {
      const t = resolveUnitId(opponent(who), target?.type === 'unit' ? target.id : undefined);
      if (t) {
        pushLog(state, `${getCard(t.cardId).name} returns to hand.`);
        o.hand.push(t.cardId);
        o.units = o.units.filter((u) => u.instanceId !== t.instanceId);
      }
      break;
    }
    case 'rv-044': {
      drawCard(state, who, 2);
      if (p.ritesCastThisTurn >= 2) drawCard(state, who, 1);
      pushLog(state, 'Deep Insight draws cards.');
      break;
    }
    case 'rv-045':
      for (const side of [who, opponent(who)] as PlayerId[]) {
        const pl = state.players[side];
        const stay: FieldUnit[] = [];
        for (const u of pl.units) {
          if (totalCost(getCard(u.cardId).cost) <= 3) pl.hand.push(u.cardId);
          else stay.push(u);
        }
        pl.units = stay;
      }
      pushLog(state, 'Riptide returns small Units to hand.');
      break;
    case 'rv-046':
      damageAimed(2, true, false);
      break;
    case 'rv-047':
      if (o.hand.length) {
        o.discard.push(o.hand.splice(Math.floor(Math.random() * o.hand.length), 1)[0]);
        pushLog(state, 'Soul Siphon forces a discard.');
      }
      restoreLife(state, who, o.hand.length);
      break;
    case 'rv-048': {
      let left = 4;
      const firstId = target?.type === 'unit' ? target.id : undefined;
      const ordered = [...o.units].sort((a, b) => {
        if (a.instanceId === firstId) return -1;
        if (b.instanceId === firstId) return 1;
        return 0;
      });
      for (const u of ordered) {
        if (left <= 0) break;
        const dmg = Math.min(2, left);
        dealDamageToUnit(state, opponent(who), u.instanceId, dmg, {
          drain: true,
          piercerOwner: who,
        });
        pushLog(state, `Harvest deals ${dmg} to ${getCard(u.cardId).name}.`);
        left -= dmg;
      }
      break;
    }
    case 'rv-049':
      damageAimed(3, false, true);
      break;
    case 'rv-050':
      for (const u of [...o.units]) dealDamageToUnit(state, opponent(who), u.instanceId, 1);
      pushLog(state, 'Wildfire Rush scorches all enemy Units.');
      break;
    case 'rv-051':
      damageAimed(5, false, true);
      break;
    case 'rv-052': {
      p.extraDomainsAllowed += 1;
      const u = resolveUnitId(who, target?.type === 'unit' ? target.id : undefined);
      if (u) {
        u.tempPower += 2;
        u.resolve += 2;
        pushLog(state, `${getCard(u.cardId).name} gets +2/+2 this turn.`);
      }
      pushLog(state, 'Overgrowth: +1 Domain this turn.');
      break;
    }
    default: {
      const fx = getCard(cardId).rite;
      if (!fx) break;
      if (fx.heal) restoreLife(state, who, fx.heal);
      if (fx.draw) drawCard(state, who, fx.draw);
      if (fx.extraDomain) p.extraDomainsAllowed += fx.extraDomain;
      if (fx.discardOpp && o.hand.length) {
        o.discard.push(o.hand.splice(Math.floor(Math.random() * o.hand.length), 1)[0]);
        pushLog(state, `${card.name}: discard.`);
      }
      if (fx.discardSelf) {
        for (let i = 0; i < fx.discardSelf && p.hand.length; i++) {
          p.discard.push(p.hand.pop()!);
        }
      }
      if (fx.aoeEnemy) {
        for (const u of [...o.units]) dealDamageToUnit(state, opponent(who), u.instanceId, fx.aoeEnemy);
        pushLog(state, `${card.name} scorches the field.`);
      }
      if (fx.damageUnit) damageAimed(fx.damageUnit, false, false);
      if (fx.bounceAny || fx.bounceMaxCost != null) {
        const t = resolveUnitId(opponent(who), target?.type === 'unit' ? target.id : undefined);
        if (t) {
          const ok =
            fx.bounceAny || totalCost(getCard(t.cardId).cost) <= (fx.bounceMaxCost ?? 99);
          if (ok) {
            pushLog(state, `${getCard(t.cardId).name} returns to hand.`);
            o.hand.push(t.cardId);
            o.units = o.units.filter((u) => u.instanceId !== t.instanceId);
          }
        }
      }
      if (fx.grantWard) {
        const u = resolveUnitId(who, target?.type === 'unit' ? target.id : undefined);
        if (u) {
          u.lingeringKeywords = u.lingeringKeywords ?? [];
          if (!u.keywords.includes('Ward')) {
            u.keywords.push('Ward');
            u.lingeringKeywords.push('Ward');
          }
          pushLog(state, `${getCard(u.cardId).name} gains Ward.`);
        }
      }
      if (fx.buffOwn) {
        const u = resolveUnitId(who, target?.type === 'unit' ? target.id : undefined);
        if (u) {
          u.tempPower += fx.buffOwn;
          u.resolve += fx.buffOwn;
          pushLog(state, `${getCard(u.cardId).name} gets +${fx.buffOwn}/+${fx.buffOwn}.`);
        }
      }
      break;
    }
  }
  checkWinner(state);
}

// ─── Phase machine ──────────────────────────────────────────────────────────

const ADVANCE: Partial<Record<TurnStep, TurnStep>> = {
  main1: 'combat_begin',
  combat_begin: 'combat_attackers',
  combat_attackers: 'combat_blockers',
  combat_blockers: 'combat_damage',
  combat_damage: 'combat_end',
  combat_end: 'main2',
  main2: 'end',
  end: 'cleanup',
};

export function advancePhase(state: BattleState): BattleState {
  const next = cloneState(state);
  if (next.winner || next.phase === 'gameover') return state;

  const step = next.phase;

  if (step === 'main1') {
    next.phase = 'combat_begin';
    next.combat = emptyCombat();
    pushLog(next, '— Begin Combat —');
    next.phase = 'combat_attackers';
    next.priority = next.active;
    pushLog(next, 'Declare attackers (or pass combat).');
    return next;
  }

  if (step === 'combat_attackers') {
    if (next.combat.attackers.length === 0) {
      next.combat = emptyCombat();
      next.phase = 'main2';
      next.priority = next.active;
      pushLog(next, 'No attackers → Main Phase 2.');
      return next;
    }
    // Confirm attackers → declare blockers (MTG-style; do NOT resolve damage yet)
    const atk = next.players[next.active];
    for (const id of next.combat.attackers) {
      const u = atk.units.find((x) => x.instanceId === id);
      if (u) u.exhausted = true;
    }
    next.phase = 'combat_blockers';
    next.priority = opponent(next.active);
    next.combat.selectedAttackerForBlock = next.combat.attackers[0] ?? null;
    pushLog(next, 'Declare blockers (or leave unblocked).');
    // AI defender: assign blockers, then hand priority back so the player can review & resolve
    if (next.priority === 'enemy') {
      autoAssignBlockers(next);
      const blocked = Object.keys(next.combat.blockers).length;
      pushLog(
        next,
        blocked
          ? `Enemy declares ${blocked} blocker(s). Confirm to deal damage.`
          : 'Enemy declines to block. Confirm to deal damage.',
      );
      next.priority = 'player';
    }
    return next;
  }

  if (step === 'combat_blockers') {
    const guardCheck = guardBlocksLegal(next);
    if (!guardCheck.ok) {
      if (next.active === 'enemy') {
        // Player is defending — refuse Confirm until Guards are assigned
        pushLog(next, guardCheck.reason ?? 'Guards must block.');
        return next;
      }
      // Enemy defending — force remaining Guards onto open attackers
      forceGuardBlocks(next);
    }
    next.phase = 'combat_damage';
    resolveCombatDamage(next);
    if (next.winner) return next;
    next.phase = 'main2';
    next.priority = next.active;
    next.combat = emptyCombat();
    pushLog(next, '— Main Phase 2 —');
    return next;
  }

  if (step === 'main2') {
    next.phase = 'end';
    pushLog(next, '— End Step —');
    next.phase = 'cleanup';
    return finishCleanupAndPass(next);
  }

  if (step === 'end' || step === 'cleanup') {
    return finishCleanupAndPass(next);
  }

  // Skip combat entirely from main1 alternative handled by skipCombat
  const mapped = ADVANCE[step];
  if (mapped) {
    next.phase = mapped;
    next.priority = next.active;
  }
  return next;
}

/** Skip combat → Main 2 */
export function skipCombat(state: BattleState): BattleState {
  const next = cloneState(state);
  if (next.winner) return state;
  if (next.phase !== 'main1' && next.phase !== 'combat_attackers' && next.phase !== 'combat_begin') {
    return state;
  }
  next.combat = emptyCombat();
  next.phase = 'main2';
  next.priority = next.active;
  pushLog(next, 'Combat skipped → Main Phase 2.');
  return next;
}

function finishCleanupAndPass(state: BattleState): BattleState {
  const who = state.active;
  const p = state.players[who];
  // Cleanup: discard to 7
  while (p.hand.length > 7) {
    p.discard.push(p.hand.pop()!);
    pushLog(state, 'Cleanup: discarded to 7.');
  }
  // Cleanup: clear EOT buffs, remove damage markers
  for (const u of p.units) {
    u.tempPower = 0;
    if (u.tempKeywords?.length) {
      for (const k of u.tempKeywords) {
        u.keywords = u.keywords.filter((x) => x !== k);
      }
      u.tempKeywords = [];
    }
    // Printed Raid keeps haste next turn via beginTurn; brand Raid already stripped
    if (!u.keywords.includes('Raid')) u.canStrike = false;
    u.resolve = u.maxResolve;
    u.damageMarked = 0;
  }
  for (const u of state.players[opponent(who)].units) {
    u.resolve = u.maxResolve;
    u.damageMarked = 0;
  }
  // Empty essence (mana burn removed in modern MTG — just empty)
  p.essence = emptyEssence();

  state.active = opponent(who);
  if (state.active === 'player') state.turn += 1;
  startOpponentTurn(state, state.active);
  return state;
}

export function endTurn(state: BattleState): BattleState {
  const next = cloneState(state);
  if (next.winner || next.phase === 'gameover') return state;
  // From any main / combat attackers (no attack) → cleanup pass
  if (isMainStep(next.phase) || next.phase === 'combat_attackers' || next.phase === 'combat_begin') {
    next.phase = 'cleanup';
    return finishCleanupAndPass(next);
  }
  if (next.phase === 'combat_blockers') {
    // Must resolve damage first
    next.phase = 'combat_damage';
    resolveCombatDamage(next);
    if (next.winner) return next;
  }
  next.phase = 'cleanup';
  return finishCleanupAndPass(next);
}

// ─── Combat declarations ────────────────────────────────────────────────────

export function toggleAttacker(state: BattleState, unitId: string): BattleState {
  const next = cloneState(state);
  if (next.phase !== 'combat_attackers' || next.priority !== next.active) return state;
  const p = next.players[next.active];
  const u = p.units.find((x) => x.instanceId === unitId);
  if (!u || !u.canStrike || u.exhausted) return state;
  const idx = next.combat.attackers.indexOf(unitId);
  if (idx >= 0) next.combat.attackers.splice(idx, 1);
  else next.combat.attackers.push(unitId);
  next.selectedAttackerId = unitId;
  return next;
}

export function selectAttackerForBlock(state: BattleState, attackerId: string): BattleState {
  const next = cloneState(state);
  if (next.phase !== 'combat_blockers') return state;
  if (!next.combat.attackers.includes(attackerId)) return state;
  next.combat.selectedAttackerForBlock = attackerId;
  return next;
}

export function assignBlocker(state: BattleState, blockerId: string): BattleState {
  const next = cloneState(state);
  if (next.phase !== 'combat_blockers') return state;
  const defender = opponent(next.active);
  if (next.priority !== defender) return state;
  const atkId = next.combat.selectedAttackerForBlock;
  if (!atkId) return state;
  const def = next.players[defender];
  const blocker = def.units.find((u) => u.instanceId === blockerId);
  if (!blocker || blocker.exhausted) return state;
  // Tap same pair again to clear
  if (next.combat.blockers[atkId] === blockerId) {
    delete next.combat.blockers[atkId];
    pushLog(next, `${getCard(blocker.cardId).name} stands down.`);
    return next;
  }
  // One blocker per attacker; one block assignment per blocker
  for (const [a, b] of Object.entries(next.combat.blockers)) {
    if (b === blockerId) delete next.combat.blockers[a];
  }
  next.combat.blockers[atkId] = blockerId;
  pushLog(next, `${getCard(blocker.cardId).name} blocks.`);
  return next;
}

function autoAssignBlockers(state: BattleState) {
  const defender = opponent(state.active);
  const def = state.players[defender];
  const guards = def.units.filter((u) => u.keywords.includes('Guard') && !u.exhausted);
  const others = def.units.filter((u) => !u.keywords.includes('Guard') && !u.exhausted);
  const pool = [...guards, ...others];
  let pi = 0;
  for (const atkId of state.combat.attackers) {
    if (pi >= pool.length) break;
    // Prefer blocking with Guard if any attackers would hit face
    state.combat.blockers[atkId] = pool[pi].instanceId;
    pi += 1;
  }
  // If Guards exist and some attackers unblocked, force Guard on first unblocked
  const unblocked = state.combat.attackers.filter((a) => !state.combat.blockers[a]);
  const freeGuards = def.units.filter(
    (u) => u.keywords.includes('Guard') && !Object.values(state.combat.blockers).includes(u.instanceId),
  );
  for (let i = 0; i < unblocked.length && i < freeGuards.length; i++) {
    state.combat.blockers[unblocked[i]] = freeGuards[i].instanceId;
  }
}

function resolveCombatDamage(state: BattleState) {
  const atkPlayer = state.active;
  const defPlayer = opponent(atkPlayer);
  const atk = state.players[atkPlayer];
  const def = state.players[defPlayer];

  pushLog(state, '— Combat Damage —');

  for (const atkId of state.combat.attackers) {
    const attacker = atk.units.find((u) => u.instanceId === atkId);
    if (!attacker) continue;
    const power = attacker.power + attacker.tempPower;
    const blockerId = state.combat.blockers[atkId];

    if (!blockerId) {
      // Unblocked → face
      def.life -= power;
      if (attacker.keywords.includes('Drain')) restoreLife(state, atkPlayer, power);
      pushLog(state, `${getCard(attacker.cardId).name} deals ${power} to player.`);
      if (attacker.cardId === 'rv-016') restoreLife(state, atkPlayer, 1);
      if (attacker.cardId === 'rv-020') restoreLife(state, atkPlayer, 3);
      if (attacker.cardId === 'rv-033') def.life -= 1;
      if (attacker.cardId === 'rv-029' && def.hand.length) {
        def.discard.push(def.hand.splice(Math.floor(Math.random() * def.hand.length), 1)[0]);
      }
    } else {
      const blocker = def.units.find((u) => u.instanceId === blockerId);
      if (!blocker) {
        def.life -= power;
        continue;
      }
      const bPower = blocker.power + blocker.tempPower;
      const before = blocker.resolve;
      blocker.resolve -= power;
      attacker.resolve -= bPower;
      if (attacker.keywords.includes('Drain')) {
        restoreLife(state, atkPlayer, Math.min(power, before));
      }
      if (atk.relics.some((r) => r.cardId === 'rv-058')) blocker.resolve -= 1;
      if (attacker.cardId === 'rv-033') def.life -= 1;
      if (attacker.cardId === 'rv-029' && def.hand.length) {
        def.discard.push(def.hand.splice(Math.floor(Math.random() * def.hand.length), 1)[0]);
      }
      pushLog(
        state,
        `${getCard(attacker.cardId).name} vs ${getCard(blocker.cardId).name}.`,
      );
      if (blocker.resolve <= 0) {
        const excess = -blocker.resolve;
        destroyUnit(state, defPlayer, blocker.instanceId);
        if (attacker.keywords.includes('Pierce') && excess > 0) {
          def.life -= excess;
          if (attacker.keywords.includes('Drain')) restoreLife(state, atkPlayer, excess);
        }
      }
      if (attacker.resolve <= 0) destroyUnit(state, atkPlayer, attacker.instanceId);
    }
  }

  // Clear attackers list after damage
  for (const id of state.combat.attackers) {
    const u = atk.units.find((x) => x.instanceId === id);
    if (u) {
      u.exhausted = true;
      u.canStrike = false;
    }
  }
  checkWinner(state);
}

/**
 * Legacy API — no longer resolves damage instantly (that skipped blockers).
 * Maps to MTG declare-attackers toggle only.
 */
export function declareStrike(
  state: BattleState,
  who: PlayerId,
  attackerId: string,
  _target: { type: 'face' } | { type: 'unit'; id: string },
): BattleState {
  let next = cloneState(state);
  if (next.active !== who || next.winner) return state;
  if (isMainStep(next.phase)) {
    next.phase = 'combat_attackers';
    next.combat = emptyCombat();
    next.priority = who;
  }
  if (next.phase !== 'combat_attackers') return state;
  return toggleAttacker(next, attackerId);
}

/** Play one AI card if possible; null when finished Main actions. */
export function enemyPlayOnce(state: BattleState): BattleState | null {
  if (state.active !== 'enemy' || state.winner) return null;
  if (state.phase !== 'main1' && state.phase !== 'main2') return null;
  return aiPlayOnce(state, 'enemy');
}

/**
 * Enemy declares attackers then waits for the player to assign blockers (MTG).
 * If no attackers, advances to Main 2.
 */
/**
 * Enemy declares attackers with trade/lethal awareness (not always all-in).
 */
export function enemyDeclareAttackers(state: BattleState): BattleState {
  const s = cloneState(state);
  if (s.active !== 'enemy' || s.winner) return state;
  s.phase = 'combat_attackers';
  s.priority = 'enemy';
  s.combat = emptyCombat();

  const atk = s.players.enemy;
  const def = s.players.player;
  const ready = atk.units.filter((u) => u.canStrike && !u.exhausted);
  const defGuards = def.units.filter((u) => u.keywords.includes('Guard') && !u.exhausted);
  const defPower = def.units.reduce((n, u) => n + u.power + u.tempPower, 0);
  const atkTotal = ready.reduce((n, u) => n + u.power + u.tempPower, 0);
  const lethal = atkTotal >= def.life && defGuards.length === 0;

  for (const u of ready) {
    const power = u.power + u.tempPower;
    if (lethal) {
      s.combat.attackers.push(u.instanceId);
      continue;
    }
    // Skip tiny bodies into a wall of Guards if we would die for free
    if (defGuards.length && power <= 1 && !u.keywords.includes('Drain') && !u.keywords.includes('Raid')) {
      continue;
    }
    // Hold back if alone and would die to a bigger blocker without Drain
    const biggestBlock = Math.max(0, ...def.units.map((b) => b.power + b.tempPower));
    if (
      ready.length === 1 &&
      biggestBlock >= u.resolve &&
      !u.keywords.includes('Drain') &&
      power < def.life &&
      defPower >= 4
    ) {
      continue;
    }
    s.combat.attackers.push(u.instanceId);
  }

  if (!s.combat.attackers.length) {
    pushLog(s, 'Enemy declines to attack.');
    s.phase = 'main2';
    s.priority = 'enemy';
    return s;
  }
  pushLog(s, `Enemy attacks with ${s.combat.attackers.length} Unit(s).`);
  for (const id of s.combat.attackers) {
    const u = s.players.enemy.units.find((x) => x.instanceId === id);
    if (u) u.exhausted = true;
  }
  s.phase = 'combat_blockers';
  s.priority = 'player';
  s.combat.selectedAttackerForBlock = s.combat.attackers[0] ?? null;
  pushLog(s, 'Declare blockers — tap attacker, then your blocker (Guards must block if able).');
  return s;
}

/** After combat resolves on the enemy's turn: Main 2 plays + pass turn. */
export function finishEnemyTurnFromMain2(state: BattleState): BattleState {
  let s = cloneState(state);
  if (s.active !== 'enemy' || s.winner) return state;
  if (s.phase !== 'main2') {
    s.phase = 'main2';
    s.priority = 'enemy';
  }
  pushLog(s, '— Enemy Main Phase 2 —');
  for (let attempt = 0; attempt < 6; attempt++) {
    const n = aiPlayOnce(s, 'enemy');
    if (!n) break;
    s = n;
    if (s.winner) return s;
  }
  return enemyEndTurnCleanup(s);
}

/** Cleanup + pass priority to the player (enemy turn over). */
export function enemyEndTurnCleanup(state: BattleState): BattleState {
  const s = cloneState(state);
  if (s.active !== 'enemy' || s.winner) return state;
  s.phase = 'cleanup';
  pushLog(s, 'Enemy ends turn.');
  return finishCleanupAndPass(s);
}

/** Resolve one Main 2 play for stepped UI; null when done playing. */
export function enemyMain2PlayOnce(state: BattleState): BattleState | null {
  if (state.active !== 'enemy' || state.winner) return null;
  const s = state.phase === 'main2' ? state : { ...cloneState(state), phase: 'main2' as const, priority: 'enemy' as const };
  return aiPlayOnce(s, 'enemy');
}

/** Keep sync AI for tests / fallback — prefers stepped store flow in UI. */
export function runEnemyTurn(state: BattleState): BattleState {
  let s = cloneState(state);
  if (s.active !== 'enemy' || s.winner) return state;

  s.priority = 'enemy';
  s.phase = 'main1';
  pushLog(s, '— Enemy Main Phase 1 —');

  for (let attempt = 0; attempt < 12; attempt++) {
    const n = aiPlayOnce(s, 'enemy');
    if (!n) break;
    s = n;
    if (s.winner) return s;
  }

  s = enemyDeclareAttackers(s);
  if (s.phase === 'combat_blockers') {
    // Sync fallback: auto-block then resolve (UI uses stepped flow instead)
    autoAssignBlockersForPlayer(s);
    s.phase = 'combat_damage';
    resolveCombatDamage(s);
    if (s.winner) return s;
    s.phase = 'main2';
    s.priority = 'enemy';
  }

  return finishEnemyTurnFromMain2(s);
}

// ─── AI ─────────────────────────────────────────────────────────────────────

function aiTapEssence(state: BattleState, who: PlayerId): BattleState {
  let s = state;
  for (const d of [...s.players[who].domains]) {
    if (!d.exhausted) s = exhaustDomain(s, who, d.instanceId);
  }
  for (const r of s.players[who].relics) {
    if (r.cardId === 'rv-059' && !r.exhausted) {
      s = exhaustVault(s, who, r.instanceId, who === 'enemy' ? 'shade' : 'any');
    }
  }
  return s;
}

/** Skip dead Rites (no target / no value) so AI develops the board instead. */
function aiRiteWorthCasting(state: BattleState, who: PlayerId, cardId: string): boolean {
  const p = state.players[who];
  const o = state.players[opponent(who)];
  const legalEnemy = o.units.filter((u) => !hasWard(u));
  switch (cardId) {
    case 'rv-041':
      return p.life <= 16;
    case 'rv-042':
      return p.units.length > 0;
    case 'rv-043':
    case 'rv-046':
    case 'rv-048':
    case 'rv-050':
      return legalEnemy.length > 0;
    case 'rv-049':
    case 'rv-051':
      // Pierce: face when empty / only Ward; else hit units
      return true;
    case 'rv-045':
      return legalEnemy.some((u) => totalCost(getCard(u.cardId).cost) <= 3);
    case 'rv-047':
      return o.hand.length > 0;
    case 'rv-044':
    case 'rv-052':
      return true;
    default: {
      const fx = getCard(cardId).rite;
      if (fx?.damageUnit || fx?.bounceAny || fx?.bounceMaxCost != null) return legalEnemy.length > 0;
      if (fx?.heal) return p.life <= 17;
      if (fx?.aoeEnemy) return o.units.length > 0;
      return true;
    }
  }
}

function aiTryPlayIndex(state: BattleState, who: PlayerId, idx: number): BattleState | null {
  const before = state.players[who].hand.length;
  const n = playHandCard(state, who, idx);
  if (n.players[who].hand.length >= before) return null;
  return aiTapEssence(n, who);
}

function aiPlayOnce(state: BattleState, who: PlayerId): BattleState | null {
  let s = aiTapEssence(state, who);
  const hand = s.players[who].hand;
  if (!hand.length) return null;
  const me = s.players[who];

  // 1) Domain first (mana development)
  const maxDom = 1 + me.extraDomainsAllowed;
  if (me.domainsPlayedThisTurn < maxDom) {
    const needed = new Set<string>();
    for (const id of hand) {
      const c = getCard(id);
      if (c.type === 'Domain') continue;
      const cost = effectiveCost(id, me);
      for (const k of ['dawn', 'tide', 'shade', 'ember', 'thorn'] as const) {
        if (cost[k] > 0) needed.add(k);
      }
    }
    let di = hand.findIndex((id) => {
      const c = getCard(id);
      if (c.type !== 'Domain') return false;
      const key = factionEssenceKey(c.faction);
      return key != null && needed.has(key);
    });
    if (di < 0) di = hand.findIndex((id) => getCard(id).type === 'Domain');
    if (di >= 0) {
      const played = aiTryPlayIndex(s, who, di);
      if (played) return played;
    }
  }

  // Refresh after domain attempt
  s = aiTapEssence(s, who);
  const hand2 = s.players[who].hand;
  const pool = s.players[who].essence;

  type Cand = { idx: number; score: number };
  const cands: Cand[] = [];
  for (let idx = 0; idx < hand2.length; idx++) {
    const id = hand2[idx];
    const c = getCard(id);
    if (c.type === 'Domain') continue;
    const cost = effectiveCost(id, s.players[who]);
    if (!canPay(pool, cost)) continue;
    if (isSpellType(c.type) && !aiRiteWorthCasting(s, who, id)) continue;

    let score = 100 - totalCost(c.cost) * 10;
    if (c.type === 'Unit') score += 50 + (c.power ?? 0) * 3 + (c.resolve ?? 0);
    else if (c.type === 'Bond') score += 25;
    else if (c.type === 'Relic') score += 15;
    else if (isSpellType(c.type)) {
      score += 8;
      const opp = s.players[opponent(who)];
      const me2 = s.players[who];
      if (c.id === 'rv-041' || c.rite?.heal) score += me2.life <= 12 ? 40 : 5;
      if ((c.id === 'rv-049' || c.id === 'rv-051') && opp.units.length === 0) score += 35;
      if ((c.id === 'rv-046' || c.id === 'rv-048' || c.rite?.damageUnit) && opp.units.some((u) => u.power >= 3)) {
        score += 30;
      }
    }
    if (c.type === 'Unit' && c.keywords.includes('Raid') && s.players[opponent(who)].units.length === 0) {
      score += 20;
    }
    if (c.type === 'Unit' && c.keywords.includes('Guard') && me.life <= 12) score += 18;
    cands.push({ idx, score });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const { idx } of cands) {
    const played = aiTryPlayIndex(s, who, idx);
    if (played) return played;
  }
  return null;
}

function autoAssignBlockersForPlayer(state: BattleState) {
  // Sync fallback when AI attacks and we resolve in one shot
  const def = state.players.player;
  const guards = def.units.filter((u) => u.keywords.includes('Guard') && !u.exhausted);
  const others = def.units.filter((u) => !u.keywords.includes('Guard') && !u.exhausted);
  const pool = [...guards, ...others];
  let pi = 0;
  state.combat.blockers = {};
  for (const atkId of state.combat.attackers) {
    if (pi >= pool.length) break;
    state.combat.blockers[atkId] = pool[pi].instanceId;
    pi += 1;
  }
  forceGuardBlocks(state);
}

/** True if the player has a castable instant spell right now. */
export function playerCanRespond(state: BattleState): boolean {
  const p = state.players.player;
  // Include essence after tapping open domains (check raw + potential)
  let pool = { ...p.essence };
  for (const d of p.domains) {
    if (d.exhausted) continue;
    const card = getCard(d.cardId);
    const key = factionEssenceKey(card.faction);
    if (key) pool = { ...pool, [key]: pool[key] + 1 };
  }
  for (let i = 0; i < p.hand.length; i++) {
    const id = p.hand[i];
    const c = getCard(id);
    const flash = c.type === 'Unit' && c.keywords.includes('Flash');
    if (!isInstantSpell(c.type) && !flash) continue;
    if (!canPlayType(c.type, state.phase, { flash })) continue;
    if (!canPay(pool, effectiveCost(id, p))) continue;
    if (isSpellType(c.type)) {
      const mode = riteNeedsTarget(id, { state, who: 'player' });
      if (mode === 'enemyUnit' && !firstLegalEnemyUnit(state.players.enemy)) continue;
      if (mode === 'ownUnit' && !p.units.length) continue;
    }
    return true;
  }
  return false;
}

/**
 * Open a brief response window so the player can cast instant Sigils / Flash
 * with leftover Essence only — never Ready Domains mid-enemy-turn.
 */
export function offerResponseWindow(state: BattleState): BattleState {
  if (state.winner || state.responseWindow) return state;
  const next = cloneState(state);

  const probe = { ...next, priority: 'player' as const };
  const canCast = playerCanRespond(probe);
  const hasStack = next.stack.some((s) => s.pendingTarget !== undefined);
  if (!canCast && !hasStack) return state;

  next.responseWindow = true;
  next.priority = 'player';
  pushLog(
    next,
    hasStack
      ? 'Priority — respond, then Pass to resolve the stack.'
      : 'Priority — cast a Sigil/Flash with open Essence, or Pass.',
  );
  return next;
}

/** End player response; resolve pending stack; return priority to the active player. */
export function passPriority(state: BattleState): BattleState {
  if (!state.responseWindow) return state;
  const next = cloneState(state);
  next.responseWindow = false;
  next.pendingTarget = null;
  flushStack(next);
  next.priority = next.active;
  pushLog(next, 'You pass priority.');
  checkWinner(next);
  return next;
}

export { canPay, effectiveCost, totalCost, isMainStep, canPlayType, guardBlocksLegal };
