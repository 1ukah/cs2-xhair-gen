import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT, EXTRA_DEFAULT, configText, decode, encode, lowerBound, restoreExtras, visibleFields } from '../src/settings.js';
import { ITEMS, TIERS, TOTAL, odds, randomCrosshair, tierForTicket } from '../src/collection.js';

test('known current-format CS2 code imports and exports byte-for-byte', () => {
  const code = 'CSvbPubOq37zTGqtsPTP5QTrp5CB4xFXiKRLfzJsm49ZRe';
  const c = decode(` ${code}\n`);
  assert.equal(c.style, 2);
  assert.equal(c.screenHeight, 768);
  assert.deepEqual([c.red, c.green, c.blue, c.centerDotEnabled, c.outerSplitAlpha], [255, 0, 0, true, 0.35]);
  assert.equal(encode(c), code);
  assert.throws(() => decode(code.replace('vbP', 'bbP')), /checksum/);
  assert.throws(() => decode('CSGO-Ynf4q-ejr8p-PyL8X-9mtrS-J6afE'), /older/);
});

test('classic negative gaps, independently colored outlines, scope flags and hundredths survive export', () => {
  const c = { ...DEFAULT, style: 2, gap: -10, outlineMode: 2, outlineRed: 238, outlineGreen: 177, outlineBlue: 51,
    outlineAlpha: 127, alpha: 0, innerSplitAlpha: 0.29, outerSplitAlpha: 0.31, scopeDotUseCrosshairColor: true,
    scopeDotScale: 1.17, splitSizeRatio: 0.73, screenHeight: 960 };
  assert.deepEqual(decode(encode(c)), c);
});

test('style-specific menu rules and bounds match Panorama', () => {
  const fields = style => visibleFields('style', { ...DEFAULT, style }, EXTRA_DEFAULT);
  const keys = style => fields(style).map(f => f.key);
  for (const s of [1, 6]) assert.ok(!keys(s).includes('gap'));
  assert.ok(!keys(6).includes('centerDotEnabled'));
  assert.ok(fields(9).some(f => f.label === 'Quadrant Size'));
  assert.ok(!keys(9).includes('length'));
  assert.equal(lowerBound(fields(2).find(f => f.key === 'gap'), { style: 2 }), -10);
  assert.equal(lowerBound(fields(4).find(f => f.key === 'gap'), { style: 4 }), 0);
  assert.deepEqual(Array.from({ length: 10 }, (_, n) => n).filter(n => keys(n).includes('dynamicSpreadLimit')), [0, 1, 7]);
  assert.ok(!visibleFields('style', { ...DEFAULT, outlineMode: 0 }, EXTRA_DEFAULT).some(f => f.key === 'outlineColor'));
  assert.ok(!visibleFields('general', DEFAULT, { ...EXTRA_DEFAULT, observer: 1 }).some(f => f.key === 'bots'));
});

test('full config preserves menu preferences excluded from the CS2 share code', () => {
  const e = restoreExtras({ ...EXTRA_DEFAULT, smokeEnabled: false, smokeDelay: 4.07, observer: 1, sniperWidth: 6 });
  const cfg = configText(DEFAULT, e);
  for (const s of ['cl_grenadecrosshair_smoke "0"', 'cl_grenadecrosshairdelay_smoke "4.07"', 'cl_show_observer_crosshair "1"', 'cl_crosshair_sniper_width "6"', 'cl_ironsight_dot_scale "1"']) assert.ok(cfg.includes(s));
  assert.equal(cfg.split('\n').filter(line => line.startsWith('cl_')).length, 42);
  assert.doesNotMatch(cfg, /undefined|NaN/);
});

test('enumerating every possible ticket exactly reproduces the published rarity ratio', () => {
  const counts = new Map(TIERS.map(t => [t.id, 0]));
  for (let k = 0; k < TOTAL; k++) { const id = tierForTicket(k).id; counts.set(id, counts.get(id) + 1); }
  assert.deepEqual([...counts.values()], [625, 125, 25, 5, 2]);
  assert.deepEqual(TIERS.map(odds), ['79.92%', '15.98%', '3.20%', '0.64%', '0.26%']);
  assert.throws(() => tierForTicket(TOTAL), RangeError);
});

test('all drops are unique equipable codes and random generation respects the reference resolution', () => {
  assert.equal(new Set(ITEMS.map(i => encode(i.core))).size, ITEMS.length);
  for (const i of ITEMS) assert.deepEqual(decode(encode(i.core)), i.core);
  for (let n = 0; n < 100; n++) {
    const c = randomCrosshair(1440);
    assert.equal(c.screenHeight, 1440); assert.deepEqual(decode(encode(c)), c);
    assert.ok(c.thickness > 0 && c.alpha > 0 && (c.style === 2 || c.gap >= 0));
  }
});
