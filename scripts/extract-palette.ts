import * as fs from 'fs';
import * as path from 'path';

type Rgb = [number, number, number];
type RgbLike = Rgb | { _r: number; _g: number; _b: number } | { r: number; g: number; b: number };

interface ColorThiefLike {
  getColor: (input: string, quality?: number) => Promise<RgbLike>;
  getPalette: (input: string, colorCount?: number, quality?: number) => Promise<RgbLike[]>;
}

function toHex([r, g, b]: Rgb): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function normalizeColor(color: RgbLike): Rgb {
  if (Array.isArray(color) && color.length >= 3) {
    return [Number(color[0]), Number(color[1]), Number(color[2])];
  }

  if (typeof color === 'object' && color !== null) {
    if ('_r' in color && '_g' in color && '_b' in color) {
      return [Number(color._r), Number(color._g), Number(color._b)];
    }

    if ('r' in color && 'g' in color && 'b' in color) {
      return [Number(color.r), Number(color.g), Number(color.b)];
    }
  }

  throw new Error('Unexpected color format from colorthief.');
}

function parseColorCount(raw: string | undefined): number {
  if (!raw) {
    return 8;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.max(2, Math.min(12, Math.trunc(parsed)));
}

function resolveImagePath(input: string | undefined): string {
  const fallback = path.join('content-files', 'music', 'albums', 'hectors-house', 'artwork.png');
  return path.resolve(process.cwd(), input || fallback);
}

function dedupePalette(colors: Rgb[]): Rgb[] {
  const seen = new Set<string>();
  const unique: Rgb[] = [];

  for (const color of colors) {
    const key = color.join(',');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(color);
  }

  return unique;
}

function printCssVariables(colors: string[]): void {
  console.log('\nSuggested CSS variables:');
  console.log(':root {');
  colors.forEach((hex, index) => {
    console.log(`  --album-color-${String(index + 1).padStart(2, '0')}: ${hex};`);
  });
  console.log('}');
}

async function main(): Promise<void> {
  const [imageArg, countArg] = process.argv.slice(2);
  const imagePath = resolveImagePath(imageArg);
  const colorCount = parseColorCount(countArg);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const imported = require('colorthief') as ColorThiefLike | (new () => ColorThiefLike);
  const colorThief: ColorThiefLike = typeof imported === 'function' ? new imported() : imported;

  if (typeof colorThief.getPalette !== 'function' || typeof colorThief.getColor !== 'function') {
    throw new Error('Unsupported colorthief export shape.');
  }

  const dominant = normalizeColor(await colorThief.getColor(imagePath, 10));
  const palette = (await colorThief.getPalette(imagePath, colorCount, 10)).map(normalizeColor);
  const combined = dedupePalette([dominant, ...palette]);
  const hexPalette = combined.map(toHex);

  console.log(`Image: ${imagePath}`);
  console.log(`Color count requested: ${colorCount}`);
  console.log(`Dominant: ${toHex(dominant)}`);
  console.log('\nPalette:');
  hexPalette.forEach((hex, index) => {
    console.log(`${String(index + 1).padStart(2, '0')}: ${hex}`);
  });

  printCssVariables(hexPalette);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exit(1);
});
