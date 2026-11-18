import { cs2CrosshairToConVars, decodeCs2CrosshairShareCode, encodeCs2Crosshair, isCs2ShareCode } from '../vendor/csgo-sharecode/crosshair.js';

export const STYLES = [
  [4, 'Static Cross'], [3, 'Static Circle'], [8, 'Static Square'], [6, 'Dot Only'],
  [9, 'Static Quadrant'], [0, 'Dynamic Cross'], [1, 'Dynamic Circle'],
  [2, 'Dynamic Cross (Classic)'], [5, 'Dynamic Cross (Legacy/Shot Feedback)'], [7, 'Dynamic Quadrant'],
];
export const styleName = id => STYLES.find(([v]) => v === id)?.[1] ?? 'Crosshair';
export const MAPS = [
  ['dust2', 'Dust II'], ['nuke', 'Nuke'], ['mirage', 'Mirage'], ['ancient', 'Ancient'],
  ['anubis', 'Anubis'], ['cache', 'Cache'], ['inferno', 'Inferno'],
];
export const DEFAULT = Object.freeze({
  format: 'cs2-v1', style: 7, red: 0, green: 255, blue: 0, alpha: 255,
  outlineMode: 1, outlineRed: 0, outlineGreen: 0, outlineBlue: 0, outlineAlpha: 255,
  thickness: 2, centerDotEnabled: false, length: 8, gap: 4, tStyleEnabled: false,
  dynamicSpreadLimit: 255, splitDistance: 3, innerSplitAlpha: 0, outerSplitAlpha: 1,
  splitSizeRatio: 1, scopeDotUseCrosshairColor: false, scopeDotScale: 1,
  followRecoil: true, screenHeight: 1080,
});
const grenades = [
  ['flash', 'Flashbangs'], ['explosive', 'HE grenades'], ['fire', 'Molotov cocktails / Incendiary grenades'],
  ['smoke', 'Smoke grenades'], ['decoy', 'Decoy grenades'],
];
export const EXTRA_DEFAULT = Object.freeze({
  friendly: 1, observer: 2, bots: 2, keepRegular: true, delayUnscope: false,
  sniperInaccuracy: true, autoRezoom: true, sniperWidth: 1,
  ...Object.fromEntries(grenades.flatMap(([id]) => [[`${id}Enabled`, true], [`${id}Delay`, 2]])),
});
export const GROUPS = [
  ['style', 'Style', 'Style Settings'], ['general', 'General', 'Crosshair Settings'],
  ['grenades', 'Grenades', 'Grenade Line-up'], ['sniper', 'Sniper', 'Sniper Sights'],
];
const choose = (key, label, options, when) => ({ key, label, type: 'select', options, when });
const toggle = (key, label, when) => ({ key, label, type: 'toggle', when });
const range = (key, label, min, max, step = 1, when, unit = '') => ({ key, label, type: 'range', min, max, step, when, unit });
const hasStyle = (...ids) => c => ids.includes(c.style);
const bars = hasStyle(0, 2, 4, 5, 7);
export const FIELDS = {
  style: [
    choose('style', 'Style', STYLES),
    { type: 'color', key: 'color', label: 'Color and Transparency' },
    choose('outlineMode', 'Outline', [[1, 'Full Outline'], [2, 'Half Outline'], [0, 'No Outline']]),
    { type: 'color', key: 'outlineColor', label: 'Outline Color and Transparency', when: c => c.outlineMode !== 0 },
    range('thickness', 'Thickness', 0, 32, 1, null, 'px'),
    toggle('centerDotEnabled', 'Center Dot', c => c.style !== 6),
    range('length', 'Length', 0, 255, 1, bars, 'px'),
    range('gap', 'Gap', c => c.style === 2 ? -10 : 0, 128, 1, hasStyle(0, 2, 3, 4, 5, 7, 8, 9), 'px'),
    range('dynamicSpreadLimit', 'Dynamic Spread Limit', 0, 255, 1, hasStyle(0, 1, 7), 'px'),
    range('splitDistance', 'Split Distance', 0, 127, 1, hasStyle(2), 'px'),
    range('innerSplitAlpha', 'Inner Split Alpha', 0, 1, 0.01, hasStyle(2)),
    range('outerSplitAlpha', 'Outer Split Alpha', 0.3, 1, 0.01, hasStyle(2)),
    range('splitSizeRatio', 'Split Size Ratio', 0, 1, 0.01, hasStyle(2)),
    range('splitSizeRatio', 'Quadrant Size', 0, 1, 0.01, hasStyle(9)),
    toggle('tStyleEnabled', 'T Style', bars),
    toggle('scopeDotUseCrosshairColor', 'Use crosshair color for scope dot'),
    range('scopeDotScale', 'Scope dot scale', 0.1, 2, 0.01),
    toggle('followRecoil', 'Follow Recoil'),
  ],
  general: [
    choose('friendly', 'Friendly Fire Reticle Warning', [[0, 'Always Off'], [1, 'Always On']]),
    choose('observer', 'Show Player Crosshairs', [[0, 'No'], [1, 'Friends and Party'], [2, 'Everyone']]),
    choose('bots', 'Show my crosshair when spectating bots', [[0, 'Always'], [1, 'When I can take over bot'], [2, 'Never']], (_c, e) => e.observer === 2),
  ],
  grenades: [
    toggle('keepRegular', 'Keep Regular Crosshair'),
    ...grenades.map(([id, label]) => ({ ...range(`${id}Delay`, label, 0, 5, 0.01, null, 's'), enableKey: `${id}Enabled` })),
  ],
  sniper: [
    toggle('delayUnscope', 'Delay Sniper Rifle Un-Scope after Shot'),
    toggle('sniperInaccuracy', 'Show Scoped Sniper Rifle Inaccuracy'),
    toggle('autoRezoom', 'Auto Re-Zoom Sniper Rifle after Shot'),
    range('sniperWidth', 'Sniper crosshair thickness', 1, 6, 1, null, 'px'),
  ],
};
export const visibleFields = (group, core, extra) => FIELDS[group].filter(f => !f.when || f.when(core, extra));
export const lowerBound = (field, core) => typeof field.min === 'function' ? field.min(core) : field.min;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export function bounded(n, min, max, step = 1) {
  const precision = step === 1 ? 0 : 2;
  return +clamp(Math.round(n / step) * step, min, max).toFixed(precision);
}
export function colorChannels(outline = false) {
  return outline ? ['outlineRed', 'outlineGreen', 'outlineBlue', 'outlineAlpha'] : ['red', 'green', 'blue', 'alpha'];
}
export const hex = rgb => '#' + rgb.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
export const fromHex = str => /^[\da-f]{6}$/i.test(str.replace(/^#/, ''))
  ? str.replace(/^#/, '').match(/../g).map(s => parseInt(s, 16)) : null;
export const encode = encodeCs2Crosshair;
export function decode(text) {
  const code = text.trim();
  if (/^CSGO-/i.test(code)) throw new Error('This is an older CSGO- code. Use a CS code from the current Crosshair/Scopes menu.');
  if (!isCs2ShareCode(code)) throw new Error('Paste a complete CS2 crosshair code: CS followed by 44 characters, without dashes.');
  try { return decodeCs2CrosshairShareCode(code); }
  catch { throw new Error('The code did not pass the CS2 format or checksum check. Copy it again from the game.'); }
}
const extraVars = {
  friendly: 'cl_crosshair_friendly_warning', observer: 'cl_show_observer_crosshair', bots: 'cl_observed_bot_crosshair',
  keepRegular: 'cl_grenadecrosshair_keepusercrosshair', delayUnscope: 'cl_sniper_delay_unscope',
  sniperInaccuracy: 'cl_sniper_show_inaccuracy', autoRezoom: 'cl_sniper_auto_rezoom', sniperWidth: 'cl_crosshair_sniper_width',
  ...Object.fromEntries(grenades.flatMap(([id]) => [[`${id}Enabled`, `cl_grenadecrosshair_${id}`], [`${id}Delay`, `cl_grenadecrosshairdelay_${id}`]])),
};
export function configText(c, e) {
  return '// Crosshair / Scopes\n' + cs2CrosshairToConVars(c).trim() + '\n\n'
    + Object.entries(extraVars).map(([k, cmd]) => `${cmd} "${Number(e[k])}"`).join('\n') + '\n';
}
export function restoreExtras(saved) {
  const e = { ...EXTRA_DEFAULT };
  for (const f of [...FIELDS.general, ...FIELDS.grenades, ...FIELDS.sniper]) {
    const v = saved?.[f.key];
    if (f.enableKey && typeof saved?.[f.enableKey] === 'boolean') e[f.enableKey] = saved[f.enableKey];
    if (f.type === 'toggle' && typeof v === 'boolean') e[f.key] = v;
    if (f.type === 'range' && Number.isFinite(v)) e[f.key] = bounded(v, f.min, f.max, f.step);
    if (f.type === 'select' && f.options.some(([n]) => n === v)) e[f.key] = v;
  }
  return e;
}
