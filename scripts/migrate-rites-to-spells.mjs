/**
 * Migrate legacy type "Rite" → Sigil (instant) or Canticle (sorcery).
 * Damage / AOE / combat buffs → Canticle; reactive utility → Sigil.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cardsPath = path.join(__dirname, '../src/data/cards.json');
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

function isCanticle(c) {
  const r = c.rite || {};
  if (r.damageUnit || r.aoeEnemy || r.buffOwn || r.bounceAny || r.bounceMaxCost != null) return true;
  const t = (c.text || '').toLowerCase();
  if (/deal \d+ damage/.test(t)) return true;
  if (/gets \+\d+\/\+\d+/.test(t) && /until end of turn/.test(t)) return true;
  return false;
}

let sigil = 0;
let canticle = 0;
for (const c of cards) {
  if (c.type !== 'Rite' && c.type !== 'Sigil' && c.type !== 'Canticle') continue;
  if (c.type === 'Rite' || c.type === 'Sigil' || c.type === 'Canticle') {
    if (isCanticle(c)) {
      c.type = 'Canticle';
      canticle++;
    } else {
      c.type = 'Sigil';
      sigil++;
    }
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards));
console.log(`Migrated spells → Sigil ${sigil}, Canticle ${canticle}`);
