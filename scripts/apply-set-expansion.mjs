/**
 * Balance nerfs/buffs on rv-001..060, then append 70 story-aligned cards (rv-061..130).
 * Domains use Exhaust text so the battle engine works without new Domain logic.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cardsPath = path.join(__dirname, '../src/data/cards.json');

/** @type {import('../src/types/card').CardDef[]} */
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

function patch(id, partial) {
  const c = byId[id];
  if (!c) throw new Error(`missing ${id}`);
  Object.assign(c, partial);
}

// ── Balance audit ──────────────────────────────────────────────────────────
patch('rv-016', {
  power: 2,
  resolve: 1,
  text: 'Raid. When this Unit Strikes, restore 1 life to your face.',
});
patch('rv-018', { power: 3, resolve: 4 });
patch('rv-021', {
  power: 1,
  resolve: 2,
  text: 'Raid. When this Unit enters, draw a card, then discard a card.',
});
patch('rv-022', { power: 2, resolve: 3 });
patch('rv-024', {
  power: 4,
  resolve: 5,
  text: 'Ward. Whenever you draw a card, this Unit gets +1/+1 until end of turn.',
});
patch('rv-026', {
  name: 'Ashwell Pilferer',
  power: 1,
  resolve: 1,
  keywords: ['Raid'],
  text: 'Raid.',
  flavor: "What's spent in the Ashwell isn't always done being useful.",
});
patch('rv-027', { power: 2, resolve: 1 });
patch('rv-028', {
  power: 2,
  resolve: 2,
  keywords: ['Drain'],
  text: 'Drain. When this Unit enters, deal 1 damage to target enemy Unit.',
});
patch('rv-029', {
  power: 3,
  resolve: 4,
  keywords: ['Drain'],
  text: 'Drain. Whenever this Unit deals combat damage to a Unit, target opponent discards a card.',
});
patch('rv-032', {
  power: 2,
  resolve: 1,
  keywords: ['Raid'],
  text: 'Raid.',
});
patch('rv-037', { power: 2, resolve: 3 });
patch('rv-039', {
  power: 5,
  resolve: 5,
  text: 'This Unit costs 1 less Essence for each Domain you control beyond your first (maximum 2 less).',
});

const empty = () => ({ dawn: 0, tide: 0, shade: 0, ember: 0, thorn: 0, any: 0 });
const cost = (partial) => ({ ...empty(), ...partial });

function domain(id, name, faction, rarity, flavor) {
  return {
    id,
    name,
    type: 'Domain',
    faction,
    rarity,
    cost: empty(),
    power: null,
    resolve: null,
    keywords: [],
    text: `Exhaust: Gain 1 Essence of ${faction}.`,
    flavor,
    artPrompt: `${name}, atmospheric ${faction} sanctum landscape, runes, no human faces.`,
    etb: null,
  };
}

function unit(id, name, faction, rarity, c, power, resolve, keywords, text, flavor, etb = null) {
  return {
    id,
    name,
    type: 'Unit',
    faction,
    rarity,
    cost: cost(c),
    power,
    resolve,
    keywords,
    text,
    flavor,
    artPrompt: `${name}, ${faction} fantasy unit, hood/helmet/silhouette, no faces, modest covering.`,
    etb,
  };
}

function rite(id, name, faction, rarity, c, text, flavor, riteFx) {
  return {
    id,
    name,
    type: 'Rite',
    faction,
    rarity,
    cost: cost(c),
    power: null,
    resolve: null,
    keywords: [],
    text,
    flavor,
    artPrompt: `${name}, ${faction} ritual magic effect, abstract, no faces.`,
    rite: riteFx,
  };
}

function bond(id, name, faction, rarity, c, text, flavor) {
  return {
    id,
    name,
    type: 'Bond',
    faction,
    rarity,
    cost: cost(c),
    power: null,
    resolve: null,
    keywords: [],
    text,
    flavor,
    artPrompt: `${name}, glowing pact rune, abstract, no faces.`,
  };
}

function relic(id, name, rarity, c, text, flavor, etb = null) {
  return {
    id,
    name,
    type: 'Relic',
    faction: 'Neutral',
    rarity,
    cost: cost(c),
    power: null,
    resolve: null,
    keywords: [],
    text,
    flavor,
    artPrompt: `${name}, ancient vault relic artifact, no faces.`,
    etb,
  };
}

const neu = [];

// Domains rv-061..070
neu.push(domain('rv-061', 'Sunwell Sanctum', 'Dawn', 'Common', 'Vault Runners kneel here before the Oathbound Descent.'));
neu.push(domain('rv-062', 'Chapel of the Oathbound', 'Dawn', 'Common', 'Every Runner swears before its broken altar.'));
neu.push(domain('rv-063', 'Tidewatch Cistern', 'Tide', 'Common', 'Still water remembers every slip dropped into the Vault.'));
neu.push(domain('rv-064', 'Drowned Archive Pool', 'Tide', 'Common', 'Sunken shelves of the Hollow Catalog drift beneath.'));
neu.push(domain('rv-065', 'Ashwell Threshold', 'Shade', 'Common', 'The Ashwell drinks light and answers in whispers.'));
neu.push(domain('rv-066', 'Catalog of Whispers', 'Shade', 'Common', 'Every slip filed here is a secret kept sealed.'));
neu.push(domain('rv-067', 'Emberforge Hearth', 'Ember', 'Common', 'The forge has burned since before the first seal.'));
neu.push(domain('rv-068', 'Cinder Ledger Hall', 'Ember', 'Common', 'Pages that never finish burning.'));
neu.push(domain('rv-069', 'Thornroot Terrace', 'Thorn', 'Common', 'Roots older than the seals still push toward ash.'));
neu.push(domain('rv-070', 'Bramblevault Walk', 'Thorn', 'Common', 'Brambles climb toward the Ash Threshold.'));

// Dawn units 071-076
neu.push(unit('rv-071', 'Dawnwarden Acolyte', 'Dawn', 'Common', { dawn: 1 }, 1, 3, ['Guard'], 'Guard.', 'She stands between the ledger and the last door.'));
neu.push(unit('rv-072', 'Lightkeeper Novice', 'Dawn', 'Common', { dawn: 1, any: 1 }, 2, 2, [], 'When this Unit enters, restore 1 life.', 'Oathbound Descent begins with one candle.', { heal: 1 }));
neu.push(unit('rv-073', 'Sanctum Sentinel', 'Dawn', 'Uncommon', { dawn: 2 }, 2, 4, ['Guard', 'Ward'], 'Guard. Ward.', "The Vault's oldest wall wears armor."));
neu.push(unit('rv-074', 'Chaplain of the Vault', 'Dawn', 'Uncommon', { dawn: 2, any: 1 }, 2, 3, [], 'When this Unit enters, restore 3 life.', 'Chants seal wounds the way they seal doors.', { heal: 3 }));
neu.push(unit('rv-075', 'Radiant Oathkeeper', 'Dawn', 'Rare', { dawn: 2, any: 2 }, 4, 5, ['Guard'], 'Guard. When this Unit enters, restore 4 life.', 'Her oath outlasted the first Hollow Catalog.', { heal: 4 }));
neu.push(unit('rv-076', 'Solenne, Sealkeeper', 'Dawn', 'Legendary', { dawn: 3, any: 3 }, 5, 7, ['Guard', 'Ward'], 'Guard. Ward. When this Unit enters, restore 4 life.', 'First to seal an Essence; last to abandon it.', { heal: 4 }));

// Tide 077-082
neu.push(unit('rv-077', 'Tidecaller Initiate', 'Tide', 'Common', { tide: 1 }, 1, 2, [], 'When this Unit enters, draw a card.', 'She reads the tide before it reads the ledger.', { draw: 1 }));
neu.push(unit('rv-078', 'Driftwake Scout', 'Tide', 'Common', { tide: 1, any: 1 }, 2, 1, ['Raid'], 'Raid.', 'Gone before the Archivist ink dries.'));
neu.push(unit('rv-079', 'Cistern Diver', 'Tide', 'Uncommon', { tide: 2 }, 2, 3, [], 'When this Unit enters, return an enemy Unit with cost 2 or less to hand.', 'She hides the weak in the current.', { bounceMaxCost: 2 }));
neu.push(unit('rv-080', 'Tideslip Raider', 'Tide', 'Uncommon', { tide: 2, any: 1 }, 3, 2, ['Raid'], 'Raid. When this Unit enters, draw a card.', 'Steals the slip and vanishes.', { draw: 1 }));
neu.push(unit('rv-081', 'Archive Undertow', 'Tide', 'Rare', { tide: 2, any: 2 }, 3, 4, ['Ward'], 'Ward. When this Unit enters, return an enemy Unit with cost 3 or less to hand.', 'The Hollow Catalog only sank deeper.', { bounceMaxCost: 3 }));
neu.push(unit('rv-082', 'Maris, Tideless Ledger', 'Tide', 'Legendary', { tide: 3, any: 3 }, 4, 6, ['Ward'], 'Ward. When this Unit enters, draw 2 cards.', 'A ledger the tide cannot erase.', { draw: 2 }));

// Shade 083-088 — Drain OK without Raid on commons
neu.push(unit('rv-083', 'Ashwell Skulker', 'Shade', 'Common', { shade: 1 }, 2, 1, ['Drain'], 'Drain.', 'Feeds on what the Ashwell forgot to swallow.'));
neu.push(unit('rv-084', 'Hollow Slip Reader', 'Shade', 'Common', { shade: 1, any: 1 }, 1, 2, [], 'When this Unit enters, opponent discards a card.', 'Reads your slip before you drop it.', { discardOpp: true }));
neu.push(unit('rv-085', 'Catalog Leech', 'Shade', 'Uncommon', { shade: 2 }, 2, 3, [], 'When this Unit enters, deal 2 damage to an enemy Unit.', 'The Catalog always finds a page to bleed.', { damageEnemyUnit: 2 }));
neu.push(unit('rv-086', 'Ashwell Warden', 'Shade', 'Uncommon', { shade: 2, any: 1 }, 2, 3, ['Drain'], 'Drain.', 'Guards the well by feeding it.'));
neu.push(unit('rv-087', "Malvora's Collector", 'Shade', 'Rare', { shade: 2, any: 2 }, 3, 4, ['Drain'], 'Drain. When this Unit enters, deal 2 damage to an enemy Unit.', 'Gathers ash for a mistress never gone.', { damageEnemyUnit: 2 }));
neu.push(unit('rv-088', 'Vesk, Hollow Ledger', 'Shade', 'Legendary', { shade: 3, any: 3 }, 5, 6, ['Drain', 'Ward'], 'Drain. Ward. When this Unit enters, opponent discards a card and you draw a card.', 'Files every Runner name — and ending.', { discardOpp: true, draw: 1 }));

// Ember 089-094
neu.push(unit('rv-089', 'Cinderpath Raider', 'Ember', 'Common', { ember: 1 }, 2, 1, ['Raid'], 'Raid.', 'Runs the cinder path before the forge cools.'));
neu.push(unit('rv-090', 'Emberforge Whelp', 'Ember', 'Common', { ember: 1, any: 1 }, 2, 2, [], 'When this Unit enters, deal 1 damage to an enemy Unit.', 'Small, hot, hungrier than allowed.', { damageEnemyUnit: 1 }));
neu.push(unit('rv-091', 'Ledgerburn Skirmisher', 'Ember', 'Uncommon', { ember: 2 }, 3, 2, ['Raid'], 'Raid.', 'Burns through the ledger to the truth.'));
neu.push(unit('rv-092', 'Ashcinder Stalker', 'Ember', 'Uncommon', { ember: 2, any: 1 }, 3, 2, ['Pierce'], 'Pierce.', 'Waits in cinder-drift until seals weaken.'));
neu.push(unit('rv-093', 'Cinder Archivist Hunter', 'Ember', 'Rare', { ember: 2, any: 2 }, 4, 3, ['Raid', 'Pierce'], 'Raid. Pierce. When this Unit enters, deal 2 damage to an enemy Unit.', "Hunts the Hollow's scouts in burning stacks.", { damageEnemyUnit: 2 }));
neu.push(unit('rv-094', 'Kaelth, Emberash Warlord', 'Ember', 'Legendary', { ember: 3, any: 3 }, 6, 5, ['Raid', 'Pierce'], 'Raid. Pierce. When this Unit enters, deal 3 damage to an enemy Unit.', 'Swore to burn the Catalog unfinished.', { damageEnemyUnit: 3 }));

// Thorn 095-100
neu.push(unit('rv-095', 'Bramblevault Sprout', 'Thorn', 'Common', { thorn: 1 }, 1, 3, [], 'When this Unit enters, you may play an additional Domain this turn.', 'Grows faster each time a seal cracks.', { extraDomain: 1 }));
neu.push(unit('rv-096', 'Rootbound Guard', 'Thorn', 'Common', { thorn: 1, any: 1 }, 2, 4, ['Guard'], 'Guard.', 'Roots need not be told twice to hold.'));
neu.push(unit('rv-097', 'Thornweave Colossus', 'Thorn', 'Uncommon', { thorn: 2, any: 1 }, 4, 5, [], '', "The Vault's oldest walls grew arms."));
neu.push(unit('rv-098', 'Grovekeeper Ledgerman', 'Thorn', 'Uncommon', { thorn: 2 }, 2, 3, [], 'When this Unit enters, you may play an additional Domain this turn.', 'Tends roots the way others tend ledgers.', { extraDomain: 1 }));
neu.push(unit('rv-099', 'Ashroot Behemoth', 'Thorn', 'Rare', { thorn: 3, any: 2 }, 6, 7, ['Guard'], 'Guard. When this Unit enters, you may play an additional Domain this turn.', 'Rose from ash where a Runner fell.', { extraDomain: 1 }));
neu.push(unit('rv-100', 'Sorrowbark, Vault Root', 'Thorn', 'Legendary', { thorn: 4, any: 2 }, 8, 9, ['Guard'], 'Guard. When this Unit enters, you may play two additional Domains this turn.', 'Roots hold the last seal together.', { extraDomain: 2 }));

// Rites 101-120
neu.push(rite('rv-101', 'Oath of First Light', 'Dawn', 'Common', { dawn: 1 }, 'Restore 3 life.', 'Spoken at every Oathbound Descent.', { heal: 3 }));
neu.push(rite('rv-102', 'Vowbound Ward', 'Dawn', 'Common', { dawn: 1, any: 1 }, 'Target Unit you control gains Ward until your next turn.', 'Ink becomes a shield of light.', { grantWard: true }));
neu.push(rite('rv-103', 'Rite of the Unbroken Seal', 'Dawn', 'Uncommon', { dawn: 1, any: 1 }, 'Restore 5 life.', 'Someone always steps in front of the seal.', { heal: 5 }));
neu.push(rite('rv-104', "Aurora's Absolution", 'Dawn', 'Rare', { dawn: 2, any: 2 }, 'Restore 6 life. Draw a card.', 'Even the Hollow paused for this light.', { heal: 6, draw: 1 }));
neu.push(rite('rv-105', 'Slipstream Recall', 'Tide', 'Common', { tide: 1 }, 'Return target Unit to its owner\'s hand.', 'The current takes back what it lent.', { bounceAny: true }));
neu.push(rite('rv-106', 'Ledger Reading', 'Tide', 'Common', { tide: 1 }, 'Draw a card.', 'Every slip has already happened once.', { draw: 1 }));
neu.push(rite('rv-107', 'Undertow Rite', 'Tide', 'Uncommon', { tide: 1, any: 1 }, 'Return target Unit with cost 3 or less to hand. Draw a card.', 'What undertow takes, the ledger records.', { bounceMaxCost: 3, draw: 1 }));
neu.push(rite('rv-108', "Maris' Deep Catalog", 'Tide', 'Rare', { tide: 2, any: 2 }, 'Draw 3 cards, then discard 1.', 'Keeps secrets the Hollow Catalog lost.', { draw: 3, discardSelf: 1 }));
neu.push(rite('rv-109', 'Slip of Hollow Ink', 'Shade', 'Common', { shade: 1 }, 'Target opponent discards a card.', 'Ink dries when the secret is spent.', { discardOpp: true }));
neu.push(rite('rv-110', 'Ashwell Siphon', 'Shade', 'Common', { shade: 1 }, 'Deal 2 damage to target Unit. Restore 2 life.', 'The Ashwell gives nothing free.', { damageUnit: 2, heal: 2 }));
neu.push(rite('rv-111', 'Rite of the Hollow Ledger', 'Shade', 'Uncommon', { shade: 1, any: 1 }, 'Deal 3 damage to target Unit. Restore 3 life.', 'Every debt is collected.', { damageUnit: 3, heal: 3 }));
neu.push(rite('rv-112', "Malvora's Reckoning", 'Shade', 'Rare', { shade: 2, any: 2 }, 'Deal 5 damage to target Unit. Restore 5 life.', "Malvora's Ash still hungers here.", { damageUnit: 5, heal: 5 }));
neu.push(rite('rv-113', 'Cinder Slip', 'Ember', 'Common', { ember: 1 }, 'Deal 2 damage to target Unit.', 'A spark filed for the right moment.', { damageUnit: 2 }));
neu.push(rite('rv-114', 'Ashcinder Flare', 'Ember', 'Common', { ember: 1, any: 1 }, 'Deal 1 damage to all enemy Units.', 'Ash falls the same on every line.', { aoeEnemy: 1 }));
neu.push(rite('rv-115', 'Vault Incineration', 'Ember', 'Uncommon', { ember: 1, any: 1 }, 'Deal 4 damage to target Unit.', 'Some doors burn open easier than unseal.', { damageUnit: 4 }));
neu.push(rite('rv-116', "Kaelth's Ashquake", 'Ember', 'Rare', { ember: 2, any: 2 }, 'Deal 3 damage to all enemy Units.', 'Rage salts the ground with ash.', { aoeEnemy: 3 }));
neu.push(rite('rv-117', 'Rootcall Slip', 'Thorn', 'Common', { thorn: 1 }, 'Play an additional Domain this turn.', 'A word to the roots; another door grows.', { extraDomain: 1 }));
neu.push(rite('rv-118', 'Ledger of Roots', 'Thorn', 'Common', { thorn: 1 }, 'Draw a card.', 'Oldest roots remember every Runner.', { draw: 1 }));
neu.push(rite('rv-119', 'Thornroot Convergence', 'Thorn', 'Uncommon', { thorn: 1, any: 1 }, 'Play an additional Domain this turn. Draw a card.', 'Where roots converge, a path opens.', { extraDomain: 1, draw: 1 }));
neu.push(rite('rv-120', "Sorrowbark's Growth", 'Thorn', 'Rare', { thorn: 2, any: 2 }, 'Play two additional Domains this turn. Target Unit you control gets +2/+2 until end of turn.', 'Roots do not wait for permission.', { extraDomain: 2, buffOwn: 2 }));

// Bonds 121-126
neu.push(bond('rv-121', "Runner's Oathbond", 'Neutral', 'Uncommon', { any: 2 }, 'At the start of your turn, restore 1 life.', 'Every Runner carries this promise.'));
neu.push(bond('rv-122', 'Hollow Ink Pact', 'Shade', 'Uncommon', { shade: 2 }, 'Whenever a Unit you control dies, restore 1 life.', 'Written in ink that never fully dries.'));
neu.push(bond('rv-123', "Dawn's Vigil Bond", 'Dawn', 'Uncommon', { dawn: 2 }, 'At the start of your turn, if you are at 18+ life, draw a card.', 'Vigil rewards those who tend the wounded.'));
neu.push(bond('rv-124', 'Tideslip Bond', 'Tide', 'Uncommon', { tide: 2 }, 'Rites you cast cost 1 less (min 1).', 'What the tide takes, the ledger rewrites.'));
neu.push(bond('rv-125', 'Emberash Kinship', 'Ember', 'Rare', { ember: 2, any: 1 }, 'Whenever you play a Unit, it gains Raid until end of turn.', 'Kinship forged in cinder.'));
neu.push(bond('rv-126', 'Thornroot Pact', 'Thorn', 'Rare', { thorn: 2, any: 1 }, 'Whenever you play a Domain, target Unit you control gets +1/+1 permanently.', 'Roots remember every pact.'));

// Relics 127-130
neu.push(relic('rv-127', "Archivist's Broken Seal", 'Common', { any: 1 }, 'When this Relic enters, draw a card.', 'Shattered, it still opens a page.', { draw: 1 }));
neu.push(relic('rv-128', 'Ledger of Lost Vaults', 'Uncommon', { any: 2 }, 'When this Relic enters, you may play an additional Domain this turn.', 'Lists vaults that no longer exist — or not yet.', { extraDomain: 1 }));
neu.push(relic('rv-129', 'Ashwell Reliquary', 'Rare', { any: 3 }, 'When this Relic enters, restore 3 life.', 'Holds a shard of the well that never stopped drinking.', { heal: 3 }));
neu.push(relic('rv-130', "Malvora's Ashen Crown", 'Legendary', { any: 5 }, 'When this Relic enters, restore 4 life and draw a card.', 'They say she still wears it past the Threshold.', { heal: 4, draw: 1 }));

if (neu.length !== 70) {
  console.error('Expected 70 new cards, got', neu.length);
  process.exit(1);
}

// Strip null etb/rite for cleanliness optional — keep for engine
const existing = cards.filter((c) => {
  const n = parseInt(c.id.replace('rv-', ''), 10);
  return n <= 60;
});

// Add etb:null to old cards? Not needed. Engine checks optional fields.
const out = [...existing, ...neu];
fs.writeFileSync(cardsPath, JSON.stringify(out, null, 0));
console.log('Wrote', out.length, 'cards. New:', neu.map((c) => c.id).join(','));
