import { createBattle, playHandCard, exhaustDomain, declareStrike, endTurn, runEnemyTurn } from '../src/engine/battle';
import { buildStarterDeck, buildAiDeck } from '../src/engine/packs';
import { getCard } from '../src/engine/cardDb';

let b = createBattle(buildStarterDeck(), buildAiDeck());
console.log('OK start hand', b.players.player.hand.length, 'life', b.players.player.life);

const domIdx = b.players.player.hand.findIndex((id) => getCard(id).type === 'Domain');
if (domIdx < 0) throw new Error('No domain in opening hand — flaky but rare');
b = playHandCard(b, 'player', domIdx);
b = exhaustDomain(b, 'player', b.players.player.domains[0].instanceId);
console.log('essence after exhaust', b.players.player.essence);

let guard = 0;
while (!b.winner && guard++ < 50) {
  if (b.active === 'player') {
    for (const d of [...b.players.player.domains]) {
      if (!d.exhausted) b = exhaustDomain(b, 'player', d.instanceId);
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      let played = false;
      for (let hi = 0; hi < b.players.player.hand.length; hi++) {
        const before = b.players.player.hand.length;
        const next = playHandCard(b, 'player', hi);
        if (next.players.player.hand.length < before) {
          b = next;
          played = true;
          break;
        }
      }
      if (!played) break;
    }
    for (const u of [...b.players.player.units]) {
      if (!u.canStrike || u.exhausted) continue;
      const guards = b.players.enemy.units.filter((x) => x.keywords.includes('Guard'));
      if (guards.length) {
        b = declareStrike(b, 'player', u.instanceId, { type: 'unit', id: guards[0].instanceId });
      } else if (b.players.enemy.units.length) {
        b = declareStrike(b, 'player', u.instanceId, {
          type: 'unit',
          id: b.players.enemy.units[0].instanceId,
        });
      } else {
        b = declareStrike(b, 'player', u.instanceId, { type: 'face' });
      }
      if (b.winner) break;
    }
    if (b.winner) break;
    b = endTurn(b);
    if (b.active === 'enemy' && !b.winner) b = runEnemyTurn(b);
  } else {
    b = runEnemyTurn(b);
  }
}

console.log('RESULT turn', b.turn, 'winner', b.winner, 'P', b.players.player.life, 'E', b.players.enemy.life);
if (!b.winner) console.log('WARN: no winner in 50 turns');
else console.log('PASS battle resolves');
