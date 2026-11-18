import { DEFAULT, STYLES, fromHex } from './settings.js';

export const TIERS = [
  { id: 'blue', label: 'Mil-Spec', color: '#4b69ff', weight: 625 },
  { id: 'purple', label: 'Restricted', color: '#8847ff', weight: 125 },
  { id: 'pink', label: 'Classified', color: '#d32ce6', weight: 25 },
  { id: 'red', label: 'Covert', color: '#eb4b4b', weight: 5 },
  { id: 'gold', label: 'Rare Special', color: '#e4ae39', weight: 2 },
];
export const TOTAL = TIERS.reduce((s, t) => s + t.weight, 0);
export const odds = t => (t.weight * 100 / TOTAL).toFixed(2) + '%';
export const tierById = id => TIERS.find(t => t.id === id);

export function uniform(limit) {
  const buf = new Uint32Array(1), cutoff = 2 ** 32 - (2 ** 32 % limit);
  do { crypto.getRandomValues(buf); } while (buf[0] >= cutoff);
  return buf[0] % limit;
}
const pick = a => a[uniform(a.length)];
const chance = percent => uniform(100) < percent;
const between = (min, max) => min + uniform(max - min + 1);
const hundredths = (min, max) => between(min, max) / 100;
export function tierForTicket(ticket) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= TOTAL) throw new RangeError('Invalid case ticket');
  for (const t of TIERS) {
    if (ticket < t.weight) return t;
    ticket -= t.weight;
  }
}

const PRO = ['00FF00', '00FF00', '00FFFF', 'FFFFFF', 'FFFF00', 'FF00FF', '00FFAA', '32FF64'];
const VIVID = ['56FFAE', '54EAFF', 'FFF652', 'FF79CE', 'CF9DFF', 'FFB868', '9DFF76', '8BAEFF', 'FF6E65', 'F5FCFF'];
const ink = ([red, green, blue], alpha = 255) => ({ red, green, blue, alpha });
const edge = ([outlineRed, outlineGreen, outlineBlue], outlineAlpha = 255) => ({ outlineRed, outlineGreen, outlineBlue, outlineAlpha });
const shift = (rgb, amount) => rgb.map(n => Math.min(255, Math.max(0, n + uniform(amount * 2 + 1) - amount)));
const shade = (rgb, factor) => rgb.map(n => Math.round(n * factor));
function hue(saturation = 100, value = 100) {
  const h = uniform(360), s = saturation / 100, v = value / 100;
  return [5, 3, 1].map(n => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  });
}
function anyColor() {
  const rgb = [uniform(256), uniform(256), uniform(256)];
  if (Math.max(...rgb) < 110) rgb[uniform(3)] = 255;
  return rgb;
}
function finish(spec) {
  const c = { ...DEFAULT, followRecoil: false, ...spec };
  if (c.style !== 2 && c.gap < 0) c.gap = 0;
  if (c.thickness < 1) c.thickness = 1;
  if ([0, 2, 4, 5].includes(c.style) && c.length === 0) c.centerDotEnabled = true;
  return c;
}

function blue() {
  const style = pick([4, 4, 4, 4, 4, 2, 2, 6]), color = fromHex(pick(PRO));
  const base = { style, ...ink(color), outlineMode: pick([0, 0, 1]), ...edge([0, 0, 0]) };
  if (style === 6) return finish({ ...base, thickness: between(2, 4) });
  if (style === 2) return finish({ ...base, thickness: 1, length: between(2, 5), gap: between(-3, -1), splitDistance: 7, innerSplitAlpha: 1, outerSplitAlpha: 1, splitSizeRatio: 1 });
  return finish({ ...base, thickness: pick([1, 1, 1, 2]), length: between(1, 4), gap: between(0, 2), centerDotEnabled: chance(12), tStyleEnabled: chance(6) });
}
function purple() {
  const style = pick([3, 8, 9, 6, 4, 4, 0]), color = fromHex(pick(VIVID));
  const base = { style, ...ink(color, between(220, 255)), outlineMode: pick([0, 1, 2, 2]), ...edge(chance(50) ? [0, 0, 0] : shade(color, 0.25)) };
  if (style === 6) return finish({ ...base, thickness: between(3, 5), outlineMode: 2 });
  if (style === 9) return finish({ ...base, thickness: between(2, 3), gap: between(4, 8), splitSizeRatio: hundredths(40, 75), centerDotEnabled: chance(35) });
  if (style === 3 || style === 8) return finish({ ...base, thickness: between(1, 2), gap: between(3, 7), centerDotEnabled: chance(40) });
  if (style === 0) return finish({ ...base, thickness: between(1, 2), length: between(4, 8), gap: between(2, 4), dynamicSpreadLimit: between(8, 20) });
  return finish({ ...base, thickness: between(1, 2), length: between(3, 7), gap: between(1, 4), outlineMode: 2, tStyleEnabled: chance(30) });
}
function pink() {
  const style = pick([7, 9, 1, 3, 8, 2, 5]), color = shift(fromHex(pick(VIVID)), 20);
  const base = {
    style, ...ink(color, between(170, 255)), outlineMode: pick([1, 2, 2]), ...edge(chance(60) ? shade(hue(90, 100), 0.55) : [0, 0, 0], between(160, 255)),
    centerDotEnabled: chance(55), tStyleEnabled: chance(35), scopeDotUseCrosshairColor: chance(60), scopeDotScale: hundredths(70, 140),
  };
  if (style === 7) return finish({ ...base, thickness: between(1, 3), length: between(4, 9), gap: between(3, 7), dynamicSpreadLimit: between(10, 30) });
  if (style === 9) return finish({ ...base, thickness: between(2, 4), gap: between(5, 11), splitSizeRatio: hundredths(25, 90) });
  if (style === 1) return finish({ ...base, thickness: between(1, 3), dynamicSpreadLimit: between(10, 35) });
  if (style === 2) return finish({ ...base, thickness: between(1, 2), length: between(6, 12), gap: between(-4, 2), splitDistance: between(3, 9), innerSplitAlpha: hundredths(50, 100), outerSplitAlpha: hundredths(30, 90), splitSizeRatio: hundredths(30, 80) });
  if (style === 5) return finish({ ...base, thickness: between(1, 3), length: between(4, 9), gap: between(2, 5) });
  return finish({ ...base, thickness: between(2, 4), gap: between(5, 10) });
}
function red() {
  const style = pick(STYLES)[0];
  return finish({
    style, ...ink(hue(between(55, 100), 100), between(150, 255)), outlineMode: pick([1, 2]), ...edge(hue(100, between(35, 90)), between(180, 255)),
    thickness: between(2, 5), length: between(6, 16), gap: style === 2 ? between(-6, 6) : between(3, 12),
    centerDotEnabled: chance(70), tStyleEnabled: chance(40), followRecoil: chance(50), dynamicSpreadLimit: between(15, 60),
    splitDistance: between(4, 14), innerSplitAlpha: hundredths(40, 100), outerSplitAlpha: hundredths(30, 100), splitSizeRatio: hundredths(20, 90),
    scopeDotUseCrosshairColor: true, scopeDotScale: hundredths(50, 180),
  });
}
function gold() {
  const style = pick(STYLES)[0];
  return finish({
    style, ...ink(anyColor(), between(110, 255)), outlineMode: uniform(3), ...edge([uniform(256), uniform(256), uniform(256)], between(60, 255)),
    thickness: between(1, 10), length: between(0, 40), gap: style === 2 ? between(-10, 20) : between(0, 24),
    centerDotEnabled: chance(50), tStyleEnabled: chance(50), followRecoil: chance(50), dynamicSpreadLimit: between(0, 120),
    splitDistance: between(0, 30), innerSplitAlpha: hundredths(0, 100), outerSplitAlpha: hundredths(30, 100), splitSizeRatio: hundredths(0, 100),
    scopeDotUseCrosshairColor: chance(50), scopeDotScale: hundredths(10, 200),
  });
}
const MAKERS = { blue, purple, pink, red, gold };
export function generate(tier) {
  return { tier, core: MAKERS[tier]() };
}
export function drawItem() {
  return generate(tierForTicket(uniform(TOTAL)).id);
}
export function randomCrosshair(screenHeight = DEFAULT.screenHeight) {
  const style = pick(STYLES)[0], outlineMode = uniform(3);
  return {
    ...DEFAULT, screenHeight, style, outlineMode,
    ...ink(shift(fromHex(pick(['00FF80', '55EBFF', 'FFFF62', 'FF77D2', 'A498FF', 'FFAF5C', 'F5FCFF', '83FF4F'])), 16), 190 + uniform(66)),
    length: 3 + uniform(12), thickness: 1 + uniform(4),
    gap: style === 2 ? uniform(13) - 3 : 2 + uniform(8),
    centerDotEnabled: uniform(3) === 0, tStyleEnabled: uniform(5) === 0,
    followRecoil: uniform(4) === 0, dynamicSpreadLimit: 5 + uniform(39),
    splitDistance: 2 + uniform(10), innerSplitAlpha: (60 + uniform(41)) / 100,
    outerSplitAlpha: (30 + uniform(71)) / 100, splitSizeRatio: (25 + uniform(70)) / 100,
    outlineRed: uniform(46), outlineGreen: uniform(46), outlineBlue: uniform(46), outlineAlpha: 180 + uniform(76),
    scopeDotUseCrosshairColor: uniform(2) === 1, scopeDotScale: (65 + uniform(81)) / 100,
  };
}
