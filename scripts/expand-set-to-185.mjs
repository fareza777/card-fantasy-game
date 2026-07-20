/**
 * Append 55 story-aligned cards (rv-131..rv-185) to src/data/cards.json,
 * growing the set from 130 to 185 cards.
 *
 * Faction balance target: ~35/35/35/35/34 (Dawn/Tide/Shade/Ember/Thorn) + 11 Neutral.
 * Split: 5 Domains (1/faction), 28 Units, 14 Rites, 5 Bonds (1/faction), 3 Neutral Relics.
 * Domains use Exhaust text so the battle engine works without new Domain logic.
 * Units/Relics use structured `etb` (see CardEtb); Rites use structured `rite` (see CardRiteFx).
 * Bonds describe passive effects mirroring existing faction identities (rv-053/121,
 * rv-054/124, rv-055/122, rv-056/125, rv-057/126); wiring new Bond ids into
 * src/engine/battle.ts is a separate follow-up and is NOT done by this script.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cardsPath = path.join(__dirname, '../src/data/cards.json');

/** @type {import('../src/types/card').CardDef[]} */
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

if (cards.length !== 130) {
  console.error(`Expected 130 existing cards, found ${cards.length}. Aborting.`);
  process.exit(1);
}

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

// ── Domains rv-131..135 (1 per faction) ─────────────────────────────────────
neu.push(domain('rv-131', 'Oathlight Sanctum', 'Dawn', 'Common', 'Vault Runners kneel here before the final descent.'));
neu.push(domain('rv-132', 'Archive Deep Cistern', 'Tide', 'Common', 'The Drowned Archive keeps its oldest ledgers here.'));
neu.push(domain('rv-133', "Malvora's Antechamber", 'Shade', 'Common', 'Ash gathers where her throne once stood.'));
neu.push(domain('rv-134', 'Forgeheart Vault', 'Ember', 'Common', 'Tools for the Descent are tempered here.'));
neu.push(domain('rv-135', 'Wardroot Cellar', 'Thorn', 'Common', "Roots coil tight around the Vault's last door."));

// ── Units rv-136..163 (28) ───────────────────────────────────────────────────
// Dawn 136-141
neu.push(unit('rv-136', 'Vaultbound Initiate', 'Dawn', 'Common', { dawn: 1 }, 1, 2, [], 'When this Unit enters, restore 1 life.', 'Every Runner starts with one small oath.', { heal: 1 }));
neu.push(unit('rv-137', 'Oathguard Sentry', 'Dawn', 'Common', { dawn: 1, any: 1 }, 2, 3, ['Guard'], 'Guard.', 'She swore to the door before she swore to herself.'));
neu.push(unit('rv-138', "Archivist's Beacon", 'Dawn', 'Uncommon', { dawn: 2 }, 2, 3, [], 'When this Unit enters, draw a card.', 'Light finds the page you needed.', { draw: 1 }));
neu.push(unit('rv-139', 'Sanctum Marshal', 'Dawn', 'Uncommon', { dawn: 2, any: 1 }, 3, 4, ['Ward'], 'Ward.', 'No oath breaks while she stands watch.'));
neu.push(unit('rv-140', 'Dawnwell Custodian', 'Dawn', 'Rare', { dawn: 2, any: 2 }, 3, 5, ['Guard'], 'Guard. When this Unit enters, restore 3 life.', 'She has closed more wounds than the Vault has doors.', { heal: 3 }));
neu.push(unit('rv-141', 'Highpriest of the Descent', 'Dawn', 'Rare', { dawn: 3, any: 2 }, 4, 5, ['Ward'], 'Ward. When this Unit enters, restore 2 life and draw a card.', 'He blesses every Runner who still has breath to spare.', { heal: 2, draw: 1 }));

// Tide 142-147
neu.push(unit('rv-142', 'Driftvault Scout', 'Tide', 'Common', { tide: 1 }, 2, 1, ['Raid'], 'Raid.', 'First through the flooded corridor, first to the slip.'));
neu.push(unit('rv-143', 'Cistern Reader', 'Tide', 'Common', { tide: 1, any: 1 }, 1, 2, [], 'When this Unit enters, draw a card.', 'The water shows her the next page before she asks.', { draw: 1 }));
neu.push(unit('rv-144', 'Undertow Warden', 'Tide', 'Uncommon', { tide: 2 }, 2, 4, ['Guard'], 'Guard.', 'The current itself stands at her back.'));
neu.push(unit('rv-145', 'Slipcatcher Adept', 'Tide', 'Uncommon', { tide: 2, any: 1 }, 2, 3, [], 'When this Unit enters, return an enemy Unit with cost 1 or less to hand.', 'She unwrites the smallest mistakes first.', { bounceMaxCost: 1 }));
neu.push(unit('rv-146', 'Depths Cartographer', 'Tide', 'Rare', { tide: 2, any: 2 }, 3, 4, ['Ward'], 'Ward. When this Unit enters, draw a card.', 'She has mapped corridors the Archive forgot it built.', { draw: 1 }));
neu.push(unit('rv-147', 'Undertow Marshal', 'Tide', 'Rare', { tide: 3, any: 2 }, 4, 5, ['Raid'], 'Raid. When this Unit enters, return an enemy Unit with cost 2 or less to hand.', 'The Drowned Archive answers to her tide alone.', { bounceMaxCost: 2 }));

// Shade 148-152
neu.push(unit('rv-148', 'Ashwell Initiate', 'Shade', 'Common', { shade: 1 }, 2, 1, ['Drain'], 'Drain.', 'First lesson: the well always drinks back.'));
neu.push(unit('rv-149', 'Catalog Whisperer', 'Shade', 'Common', { shade: 1, any: 1 }, 1, 2, [], 'When this Unit enters, target opponent discards a card.', 'She reads your slip before the ink sets.', { discardOpp: true }));
neu.push(unit('rv-150', 'Hollow Ledgerkeeper', 'Shade', 'Uncommon', { shade: 2 }, 2, 3, [], 'When this Unit enters, deal 1 damage to an enemy Unit.', 'Every debt in the Hollow Catalog comes due eventually.', { damageEnemyUnit: 1 }));
neu.push(unit('rv-151', "Malvora's Acolyte", 'Shade', 'Uncommon', { shade: 2, any: 1 }, 3, 3, ['Drain'], 'Drain.', 'She kneels to ash, not to any living queen.'));
neu.push(unit('rv-152', 'Ashwell Reaper', 'Shade', 'Rare', { shade: 2, any: 2 }, 4, 4, ['Drain'], 'Drain. When this Unit enters, deal 2 damage to an enemy Unit.', 'It harvests what the well leaves unfinished.', { damageEnemyUnit: 2 }));

// Ember 153-157
neu.push(unit('rv-153', 'Cinderpath Vanguard', 'Ember', 'Common', { ember: 1 }, 2, 1, ['Raid'], 'Raid.', 'Runs the forge road before the coals cool.'));
neu.push(unit('rv-154', 'Forgeheart Stoker', 'Ember', 'Common', { ember: 1, any: 1 }, 2, 2, [], 'When this Unit enters, deal 1 damage to an enemy Unit.', 'Feeds the flame with whatever stands closest.', { damageEnemyUnit: 1 }));
neu.push(unit('rv-155', 'Ledgerburn Marshal', 'Ember', 'Uncommon', { ember: 2 }, 3, 2, ['Raid'], 'Raid.', 'Burns through excuses as fast as parchment.'));
neu.push(unit('rv-156', 'Ashquake Skirmisher', 'Ember', 'Uncommon', { ember: 2, any: 1 }, 3, 2, ['Pierce'], 'Pierce.', 'Waits in the cinder-drift for the seal to crack.'));
neu.push(unit('rv-157', 'Vault Incinerator', 'Ember', 'Rare', { ember: 2, any: 2 }, 4, 3, ['Raid', 'Pierce'], 'Raid. Pierce. When this Unit enters, deal 2 damage to an enemy Unit.', 'Some doors only open after they burn.', { damageEnemyUnit: 2 }));

// Thorn 158-163
neu.push(unit('rv-158', 'Rootbound Initiate', 'Thorn', 'Common', { thorn: 1 }, 1, 3, [], '', 'It has never once let go of what it holds.'));
neu.push(unit('rv-159', 'Bramblevault Warden', 'Thorn', 'Common', { thorn: 1, any: 1 }, 2, 3, ['Guard'], 'Guard.', 'The oldest doors grew guards instead of locks.'));
neu.push(unit('rv-160', 'Grovekeeper Adept', 'Thorn', 'Uncommon', { thorn: 2 }, 2, 3, [], 'When this Unit enters, you may play an additional Domain this turn.', 'She plants a door wherever the roots allow.', { extraDomain: 1 }));
neu.push(unit('rv-161', 'Thornweave Guardian', 'Thorn', 'Uncommon', { thorn: 2, any: 1 }, 3, 5, ['Guard'], 'Guard.', 'Bramble and bark, woven into a wall that breathes.'));
neu.push(unit('rv-162', 'Ashroot Warden', 'Thorn', 'Rare', { thorn: 3, any: 1 }, 5, 6, ['Guard'], 'Guard.', 'Grew from ash where a Runner refused to fall.'));
neu.push(unit('rv-163', 'Wardroot Colossus', 'Thorn', 'Rare', { thorn: 3, any: 2 }, 5, 6, [], 'When this Unit enters, you may play an additional Domain this turn.', 'Every step opens a root, and every root opens a door.', { extraDomain: 1 }));

// ── Rites rv-164..177 (14) ───────────────────────────────────────────────────
// Dawn 164-166
neu.push(rite('rv-164', 'Vow of the Descent', 'Dawn', 'Common', { dawn: 1 }, 'Restore 2 life.', 'Spoken by every Runner before the last stair.', { heal: 2 }));
neu.push(rite('rv-165', 'Ward of the Oathbound', 'Dawn', 'Uncommon', { dawn: 1, any: 1 }, 'Target Unit you control gains Ward until your next turn.', 'The oath becomes armor, briefly.', { grantWard: true }));
neu.push(rite('rv-166', 'Radiant Absolution', 'Dawn', 'Rare', { dawn: 2, any: 1 }, 'Restore 4 life. Draw a card.', 'Even the Hollow Archivist looked away from this light.', { heal: 4, draw: 1 }));

// Tide 167-168
neu.push(rite('rv-167', 'Archive Retrieval', 'Tide', 'Common', { tide: 1 }, 'Draw a card.', 'The Drowned Archive always keeps a spare copy.', { draw: 1 }));
neu.push(rite('rv-168', 'Depths Recall', 'Tide', 'Uncommon', { tide: 1, any: 1 }, 'Return target Unit with cost 2 or less to hand. Draw a card.', 'What the current takes, the ledger returns.', { bounceMaxCost: 2, draw: 1 }));

// Shade 169-171
neu.push(rite('rv-169', 'Hollow Slip', 'Shade', 'Common', { shade: 1 }, 'Target opponent discards a card.', 'A page torn out before it could be read.', { discardOpp: true }));
neu.push(rite('rv-170', 'Ashwell Bargain', 'Shade', 'Uncommon', { shade: 1, any: 1 }, 'Deal 2 damage to target Unit. Restore 2 life.', 'The well takes a life, gives back a little.', { damageUnit: 2, heal: 2 }));
neu.push(rite('rv-171', "Malvora's Toll", 'Shade', 'Rare', { shade: 2, any: 1 }, 'Deal 4 damage to target Unit. Restore 4 life.', 'She never left the Ashwell without payment.', { damageUnit: 4, heal: 4 }));

// Ember 172-174
neu.push(rite('rv-172', 'Cinder Lash', 'Ember', 'Common', { ember: 1 }, 'Deal 2 damage to target Unit.', 'A spark with somewhere specific to be.', { damageUnit: 2 }));
neu.push(rite('rv-173', 'Forgeflare', 'Ember', 'Uncommon', { ember: 1, any: 1 }, 'Deal 1 damage to all enemy Units.', "The forge doesn't aim. It just spreads.", { aoeEnemy: 1 }));
neu.push(rite('rv-174', 'Vault Combustion', 'Ember', 'Rare', { ember: 2, any: 1 }, 'Deal 3 damage to all enemy Units.', 'Some seals only open once everything else has burned.', { aoeEnemy: 3 }));

// Thorn 175-177
neu.push(rite('rv-175', 'Rootcall', 'Thorn', 'Common', { thorn: 1 }, 'Play an additional Domain this turn.', 'A word to the roots, and another door grows.', { extraDomain: 1 }));
neu.push(rite('rv-176', 'Growth Ledger', 'Thorn', 'Uncommon', { thorn: 1, any: 1 }, 'Play an additional Domain this turn. Draw a card.', 'Every root the Vault grows gets written down somewhere.', { extraDomain: 1, draw: 1 }));
neu.push(rite('rv-177', 'Wardroot Bloom', 'Thorn', 'Rare', { thorn: 2, any: 1 }, 'Target Unit you control gets +2/+2 until end of turn. Play an additional Domain this turn.', 'The Cellar answers faster than the roots above it.', { buffOwn: 2, extraDomain: 1 }));

// ── Bonds rv-178..182 (1 per faction) ───────────────────────────────────────
neu.push(bond('rv-178', 'Chapel of the Unbroken Vow', 'Dawn', 'Uncommon', { dawn: 2 }, 'At the start of your turn, restore 1 life.', 'The vow renews itself, whether or not you remember making it.'));
neu.push(bond('rv-179', "Archivist's Undercurrent", 'Tide', 'Uncommon', { tide: 2 }, 'Rites you cast cost 1 less Essence (any type), to a minimum of 1.', 'The current does half the casting for you.'));
neu.push(bond('rv-180', "Malvora's Ashen Pact", 'Shade', 'Rare', { shade: 2, any: 1 }, 'Whenever a Unit you control dies, restore 1 life.', 'Nothing given to the ash is ever wholly lost.'));
neu.push(bond('rv-181', 'Forgeheart Brand', 'Ember', 'Uncommon', { ember: 2 }, 'Whenever you play a Unit, it gains Raid until end of turn.', 'Fresh off the anvil, and already moving.'));
neu.push(bond('rv-182', 'Wardroot Covenant', 'Thorn', 'Rare', { thorn: 2, any: 1 }, 'Whenever you play a Domain, target Unit you control gets +1/+1 permanently.', 'Every door you open, the roots grow stronger.'));

// ── Relics rv-183..185 (Neutral) ────────────────────────────────────────────
neu.push(relic('rv-183', "Runner's Vault Key", 'Common', { any: 1 }, 'When this Relic enters, draw a card.', 'Opens exactly one door. Chooses which one itself.', { draw: 1 }));
neu.push(relic('rv-184', 'Hollow Catalog Fragment', 'Uncommon', { any: 2 }, 'When this Relic enters, you may play an additional Domain this turn.', 'A torn page that still remembers where it belonged.', { extraDomain: 1 }));
neu.push(relic('rv-185', 'Ashwell Sigil', 'Rare', { any: 3 }, 'When this Relic enters, restore 3 life and draw a card.', 'Carved by a hand that no longer needed to be seen.', { heal: 3, draw: 1 }));

if (neu.length !== 55) {
  console.error('Expected 55 new cards, got', neu.length);
  process.exit(1);
}

const expectedIds = [];
for (let i = 131; i <= 185; i++) expectedIds.push(`rv-${String(i).padStart(3, '0')}`);
const actualIds = neu.map((c) => c.id);
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
  console.error('IDs are not a contiguous rv-131..rv-185 sequence.');
  console.error('Expected:', expectedIds.join(','));
  console.error('Actual:  ', actualIds.join(','));
  process.exit(1);
}

const out = [...cards, ...neu];
fs.writeFileSync(cardsPath, JSON.stringify(out, null, 0));
console.log('Wrote', out.length, 'cards. New:', neu.map((c) => c.id).join(','));

const counts = (arr, key) =>
  arr.reduce((acc, c) => {
    acc[c[key]] = (acc[c[key]] || 0) + 1;
    return acc;
  }, {});
console.log('Faction totals:', counts(out, 'faction'));
console.log('Rarity totals:', counts(out, 'rarity'));
console.log('Type totals:', counts(out, 'type'));
