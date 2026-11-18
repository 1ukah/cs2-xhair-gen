import { DEFAULT, STYLES, fromHex } from './settings.js';

export const TIERS = [
  { id: 'blue', label: 'Mil-Spec', color: '#4b69ff', weight: 625 },
  { id: 'purple', label: 'Restricted', color: '#8847ff', weight: 125 },
  { id: 'pink', label: 'Classified', color: '#d32ce6', weight: 25 },
  { id: 'red', label: 'Covert', color: '#eb4b4b', weight: 5 },
  { id: 'gold', label: 'Rare Special Item', color: '#e4ae39', weight: 2 },
];
export const TOTAL = TIERS.reduce((s, t) => s + t.weight, 0);
export const odds = t => (t.weight * 100 / TOTAL).toFixed(2) + '%';
export const tierOf = item => TIERS.find(t => t.id === item.tier);

export function uniform(limit) {
  const buf = new Uint32Array(1), cutoff = 2 ** 32 - (2 ** 32 % limit);
  do { crypto.getRandomValues(buf); } while (buf[0] >= cutoff);
  return buf[0] % limit;
}
const pick = a => a[uniform(a.length)];
export function tierForTicket(ticket) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= TOTAL) throw new RangeError('Invalid case ticket');
  for (const t of TIERS) {
    if (ticket < t.weight) return t;
    ticket -= t.weight;
  }
}
function rgb(value) {
  const [red, green, blue] = fromHex(value);
  return { red, green, blue };
}
const cyan = '54EBFC';
function item(id, name, tier, style, color, spec) {
  return { id, name, tier, core: { ...DEFAULT, followRecoil: false, style, ...rgb(color), ...spec } };
}
export const ITEMS = [
  item('field', 'Field Issue', 'blue', 4, '9DFF76', { length: 6, thickness: 2, gap: 3, outlineMode: 0 }),
  item('pin', 'Pinpoint', 'blue', 6, 'ECF4FF', { thickness: 4 }),
  item('vector', 'Vector', 'blue', 0, cyan, { length: 9, gap: 3, thickness: 2, dynamicSpreadLimit: 12 }),
  item('relay', 'Relay', 'blue', 4, 'FFB868', { length: 7, gap: 3, tStyleEnabled: true, outlineMode: 2 }),
  item('aperture', 'Aperture', 'blue', 3, 'AEE4F7', { thickness: 2, gap: 6 }),
  item('surveyor', 'Surveyor', 'blue', 8, 'D0ED99', { thickness: 2, gap: 5, outlineMode: 0 }),
  item('cadence', 'Cadence', 'blue', 5, '8BAEFF', { length: 5, gap: 3, centerDotEnabled: true }),
  item('afterglow', 'Afterglow', 'purple', 9, 'BD94FF', { gap: 8, splitSizeRatio: 0.62, thickness: 3 }),
  item('pulse', 'Pulse Check', 'purple', 1, '4EEFC8', { centerDotEnabled: true, dynamicSpreadLimit: 21, thickness: 2 }),
  item('parallax', 'Parallax', 'purple', 2, 'C5A4FF', { length: 10, gap: 2, splitSizeRatio: 0.48, innerSplitAlpha: 1, outerSplitAlpha: 0.6 }),
  item('switch', 'Switchback', 'purple', 4, 'B6C7FF', { length: 9, gap: 2, thickness: 3, tStyleEnabled: true, outlineMode: 2 }),
  item('ultraviolet', 'Ultraviolet', 'purple', 3, 'CE91FF', { gap: 6, thickness: 3, centerDotEnabled: true }),
  item('bloom', 'Neon Bloom', 'pink', 7, 'FF78CC', { gap: 4, length: 7, centerDotEnabled: true, dynamicSpreadLimit: 18 }),
  item('prism', 'Prism Shift', 'pink', 8, 'FFBBEA', { gap: 7, thickness: 2, centerDotEnabled: true, outlineRed: 175, outlineBlue: 126 }),
  item('orchid', 'Orchid', 'pink', 9, 'FF66E4', { gap: 9, thickness: 3, splitSizeRatio: 0.38, centerDotEnabled: true }),
  item('redline', 'Redline', 'red', 2, 'FF6E65', { gap: -1, length: 11, splitDistance: 5, splitSizeRatio: 0.58, innerSplitAlpha: 1, outerSplitAlpha: 0.8, thickness: 2 }),
  item('sunspot', 'Sunspot', 'red', 3, 'FFA253', { gap: 8, thickness: 3, centerDotEnabled: true, outlineRed: 157, outlineGreen: 30 }),
  item('solstice', 'Solstice', 'gold', 9, 'FFDA68', { gap: 9, thickness: 3, splitSizeRatio: 0.72, centerDotEnabled: true, outlineRed: 113, outlineGreen: 67, outlineBlue: 8 }),
];
export function drawItem() {
  const tier = tierForTicket(uniform(TOTAL));
  return pick(ITEMS.filter(i => i.tier === tier.id));
}
export function randomCrosshair(screenHeight = DEFAULT.screenHeight) {
  const style = pick(STYLES)[0], outlineMode = uniform(3);
  return {
    ...DEFAULT, screenHeight, style, outlineMode,
    ...randomColor(), alpha: 190 + uniform(66),
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
function randomColor() {
  const base = fromHex(pick(['00FF80', '55EBFF', 'FFFF62', 'FF77D2', 'A498FF', 'FFAF5C', 'F5FCFF', '83FF4F']));
  const [red, green, blue] = base.map(n => Math.min(255, Math.max(0, n + uniform(33) - 16)));
  return { red, green, blue };
}
