/**
 * Generate short looping ambient WAV drones (no external deps).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../assets/audio');
fs.mkdirSync(outDir, { recursive: true });

function writeWav(file, samples, sampleRate = 22050) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}

function drone(opts) {
  const secs = opts.secs;
  const freqs = opts.freqs;
  const tremolo = opts.tremolo ?? 0;
  const vol = opts.vol ?? 0.12;
  const sampleRate = opts.sampleRate ?? 22050;
  const n = Math.floor(secs * sampleRate);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    v /= freqs.length;
    const env = Math.min(1, t * 2) * Math.min(1, (secs - t) * 2);
    const trem = 1 - tremolo * 0.5 + tremolo * 0.5 * Math.sin(2 * Math.PI * 0.35 * t);
    samples[i] = v * env * trem * vol;
  }
  return samples;
}

writeWav(path.join(outDir, 'ambient-home.wav'), drone({ secs: 8, freqs: [55, 82.5, 110], tremolo: 0.15, vol: 0.1 }));
writeWav(path.join(outDir, 'ambient-battle.wav'), drone({ secs: 8, freqs: [48, 72, 96, 144], tremolo: 0.35, vol: 0.11 }));
writeWav(path.join(outDir, 'ambient-story.wav'), drone({ secs: 10, freqs: [65, 98, 130], tremolo: 0.2, vol: 0.09 }));
writeWav(path.join(outDir, 'ambient-shop.wav'), drone({ secs: 8, freqs: [60, 90, 120], tremolo: 0.12, vol: 0.08 }));

console.log('Wrote ambient WAVs to', outDir);
