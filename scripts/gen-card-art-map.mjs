import fs from 'fs';

let cases = '';
for (let i = 1; i <= 185; i++) {
  const id = `rv-${String(i).padStart(3, '0')}`;
  cases += `    case '${id}':\n      return require('../../assets/cards/${id}.jpg');\n`;
}

const out = `import { ImageSourcePropType } from 'react-native';

/**
 * Lazy art lookup — do NOT eagerly require all PNGs at module load
 * (that can OOM / crash on cold start on Android).
 */
export function getCardArt(id: string): ImageSourcePropType | undefined {
  switch (id) {
${cases}    default:
      return undefined;
  }
}

/** @deprecated Prefer getCardArt(id) */
export const cardArt: Record<string, ImageSourcePropType> = new Proxy(
  {},
  {
    get: (_t, prop: string | symbol) =>
      typeof prop === 'string' ? getCardArt(prop) : undefined,
  },
) as Record<string, ImageSourcePropType>;
`;

fs.writeFileSync(new URL('../src/data/cardArt.ts', import.meta.url), out);
console.log('cardArt.ts updated to rv-185');
