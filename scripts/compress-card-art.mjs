/**
 * Resize + JPEG-compress card arts so Android does not OOM on cold start.
 * Target: ~640×960, ~80–150KB each (was ~3MB PNG).
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../assets/cards');
const MAX_W = 640;
const files = fs.readdirSync(dir).filter((f) => /^rv-\d+\.png$/i.test(f)).sort();

let before = 0;
let after = 0;

for (const f of files) {
  const pngPath = path.join(dir, f);
  const id = f.replace(/\.png$/i, '');
  const jpgPath = path.join(dir, `${id}.jpg`);
  const buf = fs.readFileSync(pngPath);
  before += buf.length;

  const jpg = await sharp(buf)
    .rotate()
    .resize({
      width: MAX_W,
      height: Math.round(MAX_W * 1.5),
      fit: 'cover',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  fs.writeFileSync(jpgPath, jpg);
  fs.unlinkSync(pngPath);
  after += jpg.length;
  console.log(`${id}: ${Math.round(buf.length / 1024)}KB png -> ${Math.round(jpg.length / 1024)}KB jpg`);
}

console.log(
  `DONE ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(1)}MB (${(((before - after) / before) * 100).toFixed(0)}% smaller)`,
);
