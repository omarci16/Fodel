/**
 * Contrast check for the design tokens.
 *
 * The prototype used rgba(cream, .25–.55) on the ink ground, which measures
 * 2.0:1–4.3:1 and fails WCAG AA. This asserts the replacement values actually
 * clear 4.5:1, so the fix cannot silently regress.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const tokensFile = path.join(root, 'src/styles/tokens.css');

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Composite an rgba layer over an opaque background. */
const over = ([r, g, b], alpha, bg) =>
  [r, g, b].map((c, i) => Math.round(bg[i] + alpha * (c - bg[i])));

const css = await fs.readFile(tokensFile, 'utf8');
const value = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
const alphaOf = (name) => Number(value(name).match(/,\s*([\d.]+)\s*\)/)?.[1]);

const INK = hex(value('ink'));
const CREAM_BG = hex(value('cream'));
const CREAM_FG = [244, 244, 242];
const TAUPE = hex(value('taupe'));

const AA = 4.5;
const AA_LARGE = 3.0;

const checks = [
  // Light surfaces
  ['body text — taupe on cream', contrast(TAUPE, CREAM_BG), AA],
  ['headings — ink on cream', contrast(INK, CREAM_BG), AA],
  ['accent rule — ink on linen', contrast(INK, hex(value('linen'))), AA_LARGE],

  // Dark surfaces — these are the values the prototype got wrong
  ['on-dark strong', contrast(over(CREAM_FG, alphaOf('on-dark-strong'), INK), INK), AA],
  ['on-dark body', contrast(over(CREAM_FG, alphaOf('on-dark-body'), INK), INK), AA],
  ['on-dark muted (was .45 → 3.8:1)', contrast(over(CREAM_FG, alphaOf('on-dark-muted'), INK), INK), AA],
  ['on-dark faint (was .25 → 2.0:1)', contrast(over(CREAM_FG, alphaOf('on-dark-faint'), INK), INK), AA],
];

console.log('\nContrast — WCAG 2.2 AA\n');
let failures = 0;

for (const [label, ratio, threshold] of checks) {
  const ok = ratio >= threshold;
  if (!ok) failures++;
  console.log(
    `  ${ok ? '✓' : '✗'} ${label.padEnd(36)} ${ratio.toFixed(2)}:1  (min ${threshold.toFixed(1)})`
  );
}

// Regression guard: the prototype's old alphas must never come back.
const REGRESSED = [0.25, 0.3, 0.45];
const dark = ['on-dark-muted', 'on-dark-faint', 'on-dark-body', 'on-dark-strong'];
for (const token of dark) {
  const a = alphaOf(token);
  if (REGRESSED.includes(a)) {
    console.error(`  ✗ --${token} is back to ${a}, which fails AA on --ink`);
    failures++;
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} contrast failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
