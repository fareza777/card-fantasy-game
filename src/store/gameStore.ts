import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BattleState, CastTarget, isInstantSpell } from '../types/card';
import {
  advancePhase,
  assignBlocker,
  cancelPendingTarget,
  confirmPendingTarget,
  createBattle,
  declareStrike,
  endTurn,
  enemyDeclareAttackers,
  enemyPlayOnce,
  exhaustDomain,
  exhaustVault,
  enemyEndTurnCleanup,
  offerResponseWindow,
  passPriority,
  playHandCard,
  selectAttackerForBlock,
  skipCombat,
  toggleAttacker,
} from '../engine/battle';
import {
  PACK_PRICE,
  STARTER_DUST,
  STARTER_GOLD,
  buildAiDeck,
  buildStarterDeck,
  openBooster,
  openBoosterWithPity,
  starterOwnedCounts,
} from '../engine/packs';
import { disenchantValue, forgeCost, maxDisenchantable } from '../engine/forge';
import { getCard, tryGetCard } from '../engine/cardDb';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Cancels overlapping enemy-turn animations when a new battle starts. */
let enemyTurnToken = 0;

const UNIQUE_MILESTONES: { id: string; threshold: number; gold: number }[] = [
  { id: 'unique50', threshold: 50, gold: 100 },
  { id: 'unique100', threshold: 100, gold: 200 },
  { id: 'unique150', threshold: 150, gold: 300 },
];

/** Grants one-time gold rewards for hitting unique-card collection thresholds. */
function checkMilestones(
  owned: Record<string, number>,
  claimed: string[],
): { claimed: string[]; bonusGold: number } {
  const unique = Object.keys(owned).filter((id) => (owned[id] ?? 0) > 0).length;
  let next = claimed;
  let bonusGold = 0;
  for (const m of UNIQUE_MILESTONES) {
    if (unique >= m.threshold && !next.includes(m.id)) {
      next = [...next, m.id];
      bonusGold += m.gold;
    }
  }
  return { claimed: next, bonusGold };
}

function applyMatchResult(
  get: () => GameStore,
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  next: BattleState,
) {
  const prev = get().battle;
  if (!next.winner || prev?.winner) {
    set({ battle: next });
    return;
  }
  if (next.winner === 'player') {
    const scenarioId = get().activeScenarioId;
    let goldGain = 50;
    const prevCleared = get().storyCleared;
    let cleared = prevCleared;
    let firstClear = false;
    if (scenarioId) {
      try {
        const { getScenario } = require('../data/storyScenarios') as typeof import('../data/storyScenarios');
        const sc = getScenario(scenarioId);
        if (sc) goldGain = sc.rewardGold;
      } catch {
        /* ignore */
      }
      if (!prevCleared.includes(scenarioId)) {
        cleared = [...prevCleared, scenarioId];
        firstClear = true;
      }
    }

    let owned = get().owned;
    let lastPack = get().lastPack;
    let lastPackIsNew = get().lastPackIsNew;
    let packsOpened = get().packsOpened;

    // First-time scenario clear: grant a free booster on top of the gold reward.
    if (firstClear) {
      const pack = openBooster();
      const nextOwned = { ...owned };
      const isNewFlags = pack.map((c) => (nextOwned[c.id] ?? 0) <= 0);
      for (const c of pack) nextOwned[c.id] = (nextOwned[c.id] ?? 0) + 1;
      owned = nextOwned;
      lastPack = pack.map((c) => c.id);
      lastPackIsNew = isNewFlags;
      packsOpened = packsOpened + 1;
    }

    const { claimed, bonusGold } = checkMilestones(owned, get().milestonesClaimed);
    const totalGoldGain = goldGain + bonusGold;

    set({
      battle: next,
      wins: get().wins + 1,
      gold: get().gold + totalGoldGain,
      lastGoldGain: totalGoldGain,
      storyCleared: cleared,
      activeScenarioId: null,
      scenarioFoeName: null,
      owned,
      lastPack,
      lastPackIsNew,
      packsOpened,
      milestonesClaimed: claimed,
    });
  } else {
    set({
      battle: next,
      losses: get().losses + 1,
      lastGoldGain: 0,
      activeScenarioId: null,
      scenarioFoeName: null,
    });
  }
}

interface GameStore {
  gold: number;
  /** Crafting currency from disenchanting extras. */
  dust: number;
  owned: Record<string, number>;
  deck: string[];
  /** Second deck slot ("Slot B"). Empty until first swap. */
  deckAlt: string[];
  /** Which slot is currently loaded into `deck`. */
  activeDeckSlot: 'A' | 'B';
  packsOpened: number;
  wins: number;
  losses: number;
  battle: BattleState | null;
  lastPack: string[] | null;
  /** Parallel to `lastPack` — true where that slot's card was not owned before this pack. */
  lastPackIsNew: boolean[] | null;
  /** Gold earned from the most recently won battle (0 after a loss). */
  lastGoldGain: number;
  /** Whether the player has dismissed the first-run tutorial hint. */
  tutorialSeen: boolean;
  hydrated: boolean;
  /** True while enemy Ready/Draw/Main/Combat animation is running. */
  enemyBusy: boolean;
  activeScenarioId: string | null;
  storyCleared: string[];
  scenarioFoeName: string | null;
  /** One-time collection-size milestones already paid out (e.g. 'unique50'). */
  milestonesClaimed: string[];
  /** Soft-pity counter: consecutive packs opened with zero new unique cards. */
  packsSinceNewUnique: number;
  /** First-run cinematic onboarding completed. */
  onboardingDone: boolean;
  /** Opts used to start the most recent battle, so Rematch can repeat it exactly. */
  lastBattleOpts: { enemyDeck?: string[]; scenarioId?: string; foeName?: string; firstPlayer?: 'player' | 'enemy' } | null;

  addGold: (n: number) => void;
  openPack: () => string[] | null;
  openPackMulti: (n: 1 | 3) => boolean;
  /** Dust one spare copy → gain dust. Returns dust gained or null. */
  disenchantCard: (cardId: string) => number | null;
  /** Spend dust to craft one copy. Returns false if unaffordable / unknown. */
  forgeCard: (cardId: string) => boolean;
  setDeck: (deck: string[]) => void;
  swapDeckSlot: () => void;
  setTutorialSeen: () => void;
  setOnboardingDone: () => void;
  passResponse: () => void;
  startBattle: (opts?: {
    enemyDeck?: string[];
    scenarioId?: string;
    foeName?: string;
    firstPlayer?: 'player' | 'enemy';
  }) => boolean;
  clearBattle: () => void;
  concedeBattle: () => void;
  rematchBattle: () => boolean;
  playCard: (handIndex: number) => void;
  confirmCastTarget: (target: CastTarget) => void;
  cancelCastTarget: () => void;
  tapDomain: (instanceId: string) => void;
  tapVault: (instanceId: string) => void;
  strike: (attackerId: string, target: { type: 'face' } | { type: 'unit'; id: string }) => void;
  passTurn: () => void;
  nextPhase: () => void;
  skipToMain2: () => void;
  toggleAttack: (unitId: string) => void;
  pickBlockTarget: (attackerId: string) => void;
  setBlocker: (blockerId: string) => void;
  selectHand: (index: number | null) => void;
  selectAttacker: (id: string | null) => void;
}

async function runEnemyTurnStepped(
  get: () => GameStore,
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  token: number,
) {
  const alive = () => {
    const b = get().battle;
    return !!b && !b.winner && b.active === 'enemy' && token === enemyTurnToken;
  };

  set({ enemyBusy: true });
  try {
    const base = get().battle;
    if (!base || !alive()) return;

    // Visual beat: Ready → Draw → Main 1 (beginTurn already applied these)
    applyMatchResult(get, set, { ...base, phase: 'untap', priority: 'enemy' });
    await sleep(520);
    if (!alive()) return;
    applyMatchResult(get, set, { ...get().battle!, phase: 'draw', priority: 'enemy' });
    await sleep(620);
    if (!alive()) return;
    applyMatchResult(get, set, { ...get().battle!, phase: 'main1', priority: 'enemy' });
    await sleep(520);
    if (!alive()) return;

    for (let i = 0; i < 12; i++) {
      const cur = get().battle;
      if (!cur || !alive()) return;
      const played = enemyPlayOnce({ ...cur, phase: 'main1', priority: 'enemy', responseWindow: false });
      if (!played) break;
      applyMatchResult(get, set, played);
      // Deliberate beat so the player can read each enemy play in the hint line.
      await sleep(850);
      if (!alive()) return;

      // Priority window: player may cast instant Rites if they left Essence open
      const offered = offerResponseWindow(get().battle!);
      if (offered.responseWindow) {
        applyMatchResult(get, set, offered);
        set({ enemyBusy: false });
        for (let w = 0; w < 100; w++) {
          await sleep(200);
          const b = get().battle;
          if (!b || b.winner || token !== enemyTurnToken) return;
          if (!b.responseWindow) break;
        }
        const after = get().battle;
        if (after?.responseWindow) {
          applyMatchResult(get, set, passPriority(after));
        }
        set({ enemyBusy: true });
        if (!alive()) return;
      }
    }

    if (!alive()) return;
    const afterMain = enemyDeclareAttackers(get().battle!);
    applyMatchResult(get, set, afterMain);
    // Hold on declared attackers so the player sees who is swinging before blocking.
    await sleep(800);
    if (!alive()) return;

    // Wait for player to declare blockers (MTG)
    if (afterMain.phase === 'combat_blockers' && afterMain.priority === 'player') {
      set({ enemyBusy: false });
      return;
    }

    await finishEnemyMain2Stepped(get, set, token);
  } catch (e) {
    console.warn('enemy turn failed', e);
    const b = get().battle;
    if (b && b.active === 'enemy' && !b.winner) {
      applyMatchResult(get, set, {
        ...b,
        active: 'player',
        phase: 'main1',
        priority: 'player',
      });
    }
    set({ enemyBusy: false });
  }
}

async function finishEnemyMain2Stepped(
  get: () => GameStore,
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  token: number,
) {
  const alive = () => {
    const b = get().battle;
    return !!b && !b.winner && b.active === 'enemy' && token === enemyTurnToken;
  };

  set({ enemyBusy: true });
  let cur = get().battle;
  if (!cur || !alive()) {
    set({ enemyBusy: false });
    return;
  }

  if (cur.phase !== 'main2') {
    applyMatchResult(get, set, {
      ...cur,
      phase: 'main2',
      priority: 'enemy',
      log: [
        { id: `l-m2-${Date.now()}`, text: '— Enemy Main Phase 2 —' },
        ...cur.log,
      ],
    });
    await sleep(450);
  } else {
    applyMatchResult(get, set, {
      ...cur,
      log: [
        { id: `l-m2-${Date.now()}`, text: '— Enemy Main Phase 2 —' },
        ...cur.log,
      ],
    });
    await sleep(420);
  }

  for (let i = 0; i < 6; i++) {
    cur = get().battle;
    if (!cur || !alive()) return;
    const played = enemyPlayOnce({ ...cur, phase: 'main2', priority: 'enemy' });
    if (!played) break;
    applyMatchResult(get, set, played);
    await sleep(850);
    if (!alive()) return;
  }

  cur = get().battle;
  if (!cur || !alive()) return;
  applyMatchResult(get, set, enemyEndTurnCleanup(cur));
  set({ enemyBusy: false });
}

function kickEnemyTurn(
  get: () => GameStore,
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
) {
  const token = ++enemyTurnToken;
  void runEnemyTurnStepped(get, set, token);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gold: STARTER_GOLD,
      dust: STARTER_DUST,
      owned: starterOwnedCounts(),
      deck: buildStarterDeck(),
      deckAlt: [],
      activeDeckSlot: 'A',
      packsOpened: 0,
      wins: 0,
      losses: 0,
      battle: null,
      lastPack: null,
      lastPackIsNew: null,
      lastGoldGain: 0,
      tutorialSeen: false,
      onboardingDone: false,
      hydrated: false,
      enemyBusy: false,
      activeScenarioId: null,
      storyCleared: [],
      scenarioFoeName: null,
      milestonesClaimed: [],
      packsSinceNewUnique: 0,
      lastBattleOpts: null,

      addGold: (n) => set({ gold: get().gold + n }),

      disenchantCard: (cardId) => {
        const { owned, deck, dust } = get();
        if (!tryGetCard(cardId)) return null;
        if (maxDisenchantable(cardId, owned, deck) < 1) return null;
        const gain = disenchantValue(cardId);
        const nextOwned = { ...owned };
        nextOwned[cardId] = (nextOwned[cardId] ?? 0) - 1;
        if (nextOwned[cardId] <= 0) delete nextOwned[cardId];
        set({ owned: nextOwned, dust: dust + gain });
        return gain;
      },

      forgeCard: (cardId) => {
        const { dust, owned } = get();
        if (!tryGetCard(cardId)) return false;
        const cost = forgeCost(cardId);
        if (dust < cost) return false;
        const nextOwned = { ...owned };
        nextOwned[cardId] = (nextOwned[cardId] ?? 0) + 1;
        const { claimed, bonusGold } = checkMilestones(nextOwned, get().milestonesClaimed);
        set({
          dust: dust - cost,
          owned: nextOwned,
          gold: get().gold + bonusGold,
          milestonesClaimed: claimed,
        });
        return true;
      },

      setTutorialSeen: () => set({ tutorialSeen: true }),
      setOnboardingDone: () => set({ onboardingDone: true }),

      swapDeckSlot: () => {
        const { deck, deckAlt, activeDeckSlot } = get();
        const incoming = deckAlt.length === 40 ? deckAlt : buildStarterDeck();
        set({
          deck: incoming,
          deckAlt: deck,
          activeDeckSlot: activeDeckSlot === 'A' ? 'B' : 'A',
        });
      },

      passResponse: () => {
        const b = get().battle;
        if (!b?.responseWindow) return;
        set({ battle: passPriority(b) });
      },

      openPack: () => {
        const { gold, owned, packsSinceNewUnique, milestonesClaimed } = get();
        if (gold < PACK_PRICE) return null;
        const { pack, newPity } = openBoosterWithPity(owned, packsSinceNewUnique);
        const nextOwned = { ...owned };
        const isNewFlags = pack.map((c) => (nextOwned[c.id] ?? 0) <= 0);
        for (const c of pack) {
          nextOwned[c.id] = (nextOwned[c.id] ?? 0) + 1;
        }
        const { claimed, bonusGold } = checkMilestones(nextOwned, milestonesClaimed);
        set({
          gold: gold - PACK_PRICE + bonusGold,
          owned: nextOwned,
          packsOpened: get().packsOpened + 1,
          lastPack: pack.map((c) => c.id),
          lastPackIsNew: isNewFlags,
          packsSinceNewUnique: newPity,
          milestonesClaimed: claimed,
        });
        return pack.map((c) => c.id);
      },

      openPackMulti: (n) => {
        const { gold, owned, packsSinceNewUnique, packsOpened, milestonesClaimed } = get();
        const cost = n * PACK_PRICE;
        if (gold < cost) return false;
        const nextOwned = { ...owned };
        let pity = packsSinceNewUnique;
        const allIds: string[] = [];
        const allNewFlags: boolean[] = [];
        for (let i = 0; i < n; i++) {
          const { pack, newPity } = openBoosterWithPity(nextOwned, pity);
          pity = newPity;
          for (const c of pack) {
            allNewFlags.push((nextOwned[c.id] ?? 0) <= 0);
            nextOwned[c.id] = (nextOwned[c.id] ?? 0) + 1;
            allIds.push(c.id);
          }
        }
        const { claimed, bonusGold } = checkMilestones(nextOwned, milestonesClaimed);
        set({
          gold: gold - cost + bonusGold,
          owned: nextOwned,
          packsOpened: packsOpened + n,
          lastPack: allIds,
          lastPackIsNew: allNewFlags,
          packsSinceNewUnique: pity,
          milestonesClaimed: claimed,
        });
        return true;
      },

      setDeck: (deck) => set({ deck }),

      startBattle: (opts) => {
        try {
          enemyTurnToken += 1;
          const err = validateDeck(get().deck, get().owned);
          if (err) return false;
          const enemyDeck = opts?.enemyDeck?.length ? opts.enemyDeck : buildAiDeck();
          const firstPlayer = opts?.firstPlayer ?? 'player';
          const battle = createBattle(get().deck, enemyDeck, { firstPlayer });
          if (!battle?.combat) {
            battle.combat = { attackers: [], blockers: {}, selectedAttackerForBlock: null };
          }
          if (opts?.foeName) {
            battle.log = [
              { id: `l-sc-${Date.now()}`, text: `Scenario: ${opts.foeName}` },
              ...battle.log,
            ];
          }
          set({
            battle,
            activeScenarioId: opts?.scenarioId ?? null,
            scenarioFoeName: opts?.foeName ?? null,
            enemyBusy: false,
            lastBattleOpts: opts ?? { firstPlayer },
          });
          if (firstPlayer === 'enemy' && !battle.winner) {
            kickEnemyTurn(get, set);
          }
          return true;
        } catch (e) {
          console.warn('startBattle failed', e);
          return false;
        }
      },

      clearBattle: () => {
        enemyTurnToken += 1;
        set({ battle: null, activeScenarioId: null, scenarioFoeName: null, enemyBusy: false });
      },

      concedeBattle: () => {
        const b = get().battle;
        if (!b || b.winner) return;
        enemyTurnToken += 1;
        applyMatchResult(get, set, { ...b, winner: 'enemy' });
      },

      rematchBattle: () => {
        const opts = get().lastBattleOpts;
        return get().startBattle(opts ?? undefined);
      },

      playCard: (handIndex) => {
        const b = get().battle;
        if (!b || b.winner) return;
        if (b.pendingTarget) return;
        const card = tryGetCard(b.players.player.hand[handIndex]);
        if (!card) return;
        if (b.priority !== 'player') return;
        const flash = card.type === 'Unit' && card.keywords.includes('Flash');
        if (!isInstantSpell(card.type) && !flash && b.active !== 'player') return;
        const next = playHandCard(b, 'player', handIndex);
        applyMatchResult(get, set, {
          ...next,
          selectedHandIndex: next.pendingTarget ? handIndex : null,
        });
      },

      confirmCastTarget: (target) => {
        const b = get().battle;
        if (!b || b.winner || !b.pendingTarget) return;
        applyMatchResult(get, set, confirmPendingTarget(b, target));
      },

      cancelCastTarget: () => {
        const b = get().battle;
        if (!b || !b.pendingTarget) return;
        set({ battle: cancelPendingTarget(b) });
      },

      tapDomain: (instanceId) => {
        const b = get().battle;
        if (!b || b.winner || b.priority !== 'player') return;
        set({ battle: exhaustDomain(b, 'player', instanceId) });
      },

      tapVault: (instanceId) => {
        const b = get().battle;
        if (!b || b.winner || b.active !== 'player') return;
        set({ battle: exhaustVault(b, 'player', instanceId, 'any') });
      },

      strike: (attackerId, target) => {
        const b = get().battle;
        if (!b || b.winner || b.active !== 'player') return;
        applyMatchResult(get, set, {
          ...declareStrike(b, 'player', attackerId, target),
          selectedAttackerId: null,
        });
      },

      passTurn: () => {
        const b = get().battle;
        if (!b || b.winner || get().enemyBusy) return;
        if (b.active !== 'player' || b.priority !== 'player') return;
        const next = endTurn(b);
        applyMatchResult(get, set, next);
        if (next.active === 'enemy' && !next.winner) kickEnemyTurn(get, set);
      },

      nextPhase: () => {
        const b = get().battle;
        if (!b || b.winner || get().enemyBusy) return;
        if (b.priority !== 'player') return;

        // Confirming blockers while defending against the enemy
        if (b.active === 'enemy' && b.phase === 'combat_blockers') {
          const resolved = advancePhase(b);
          applyMatchResult(get, set, resolved);
          if (!resolved.winner && resolved.active === 'enemy') {
            void finishEnemyMain2Stepped(get, set, enemyTurnToken);
          }
          return;
        }

        if (b.active !== 'player') return;
        const next = advancePhase(b);
        applyMatchResult(get, set, next);
        if (next.active === 'enemy' && !next.winner) kickEnemyTurn(get, set);
      },

      skipToMain2: () => {
        const b = get().battle;
        if (!b || b.winner || b.active !== 'player') return;
        applyMatchResult(get, set, skipCombat(b));
      },

      toggleAttack: (unitId) => {
        const b = get().battle;
        if (!b || b.winner) return;
        set({ battle: toggleAttacker(b, unitId) });
      },

      pickBlockTarget: (attackerId) => {
        const b = get().battle;
        if (!b || b.winner) return;
        set({ battle: selectAttackerForBlock(b, attackerId) });
      },

      setBlocker: (blockerId) => {
        const b = get().battle;
        if (!b || b.winner) return;
        set({ battle: assignBlocker(b, blockerId) });
      },

      selectHand: (index) => {
        const b = get().battle;
        if (!b || b.winner) return;
        set({ battle: { ...b, selectedHandIndex: index, selectedAttackerId: null } });
      },

      selectAttacker: (id) => {
        const b = get().battle;
        if (!b || b.winner) return;
        set({ battle: { ...b, selectedAttackerId: id, selectedHandIndex: null } });
      },
    }),
    {
      name: 'rune-vault-save',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        gold: s.gold,
        dust: s.dust,
        owned: s.owned,
        deck: s.deck,
        deckAlt: s.deckAlt,
        activeDeckSlot: s.activeDeckSlot,
        packsOpened: s.packsOpened,
        wins: s.wins,
        losses: s.losses,
        storyCleared: s.storyCleared,
        tutorialSeen: s.tutorialSeen,
        onboardingDone: s.onboardingDone,
        milestonesClaimed: s.milestonesClaimed,
        packsSinceNewUnique: s.packsSinceNewUnique,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStore>;
        const owned =
          p.owned && typeof p.owned === 'object' && !Array.isArray(p.owned)
            ? (p.owned as Record<string, number>)
            : current.owned;
        const deck = Array.isArray(p.deck) && p.deck.every((id) => typeof id === 'string')
          ? p.deck
          : current.deck;
        const deckAlt = Array.isArray(p.deckAlt) ? p.deckAlt.filter((id) => typeof id === 'string') : [];
        const storyCleared = Array.isArray(p.storyCleared)
          ? p.storyCleared.filter((id) => typeof id === 'string')
          : [];
        const milestonesClaimed = Array.isArray(p.milestonesClaimed)
          ? p.milestonesClaimed.filter((id) => typeof id === 'string')
          : [];
        return {
          ...current,
          gold: typeof p.gold === 'number' ? p.gold : current.gold,
          dust: typeof p.dust === 'number' ? p.dust : STARTER_DUST,
          owned,
          deck,
          deckAlt,
          activeDeckSlot: p.activeDeckSlot === 'B' ? 'B' : 'A',
          packsOpened: typeof p.packsOpened === 'number' ? p.packsOpened : 0,
          wins: typeof p.wins === 'number' ? p.wins : 0,
          losses: typeof p.losses === 'number' ? p.losses : 0,
          storyCleared,
          tutorialSeen: !!p.tutorialSeen,
          onboardingDone: typeof p.onboardingDone === 'boolean' ? p.onboardingDone : false,
          milestonesClaimed,
          packsSinceNewUnique:
            typeof p.packsSinceNewUnique === 'number' ? p.packsSinceNewUnique : 0,
          // Never restore in-flight battle from disk
          battle: null,
          enemyBusy: false,
          hydrated: false,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn('persist rehydrate failed', error);
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function validateDeck(deck: string[], owned: Record<string, number>): string | null {
  if (deck.length !== 40) return 'Deck must contain exactly 40 cards.';
  const counts: Record<string, number> = {};
  for (const id of deck) {
    counts[id] = (counts[id] ?? 0) + 1;
    const card = tryGetCard(id);
    if (!card) return `Unknown card in deck (${id}). Rebuild your deck.`;
    const have = owned[id] ?? 0;
    if (counts[id] > have) return `Not enough copies of ${card.name}.`;
    const max = card.type === 'Domain' ? 4 : 3;
    if (counts[id] > max) return `Max ${max} copies of ${card.name}.`;
  }
  return null;
}

export { PACK_PRICE };
