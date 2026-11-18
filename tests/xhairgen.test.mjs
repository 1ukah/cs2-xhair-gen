import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT, EXTRA_DEFAULT, configText, decode, encode, lowerBound, restoreExtras, visibleFields } from '../src/settings.js';
import { TIERS, TOTAL, drawItem, generate, odds, randomCrosshair, tierForTicket } from '../src/collection.js';

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

test('every rarity generates valid, visible, equipable crosshairs within its own rules', () => {
  const sample = (tier, n = 300) => Array.from({ length: n }, () => generate(tier).core);
  for (const t of TIERS) {
    for (const c of sample(t.id)) {
      assert.deepEqual(decode(encode(c)), c);
      assert.ok(c.thickness > 0 && c.alpha > 0 && (c.style === 2 || c.gap >= 0));
      assert.ok(![0, 2, 4, 5].includes(c.style) || c.length > 0 || c.centerDotEnabled);
    }
  }
  const blue = sample('blue');
  assert.ok(blue.every(c => [2, 4, 6].includes(c.style) && c.thickness <= 4 && (c.style === 6 || c.length <= 5) && c.alpha === 255));
  assert.ok(sample('purple').every(c => [0, 3, 4, 6, 8, 9].includes(c.style) && c.thickness <= 5));
  assert.ok(sample('pink').every(c => [1, 2, 3, 5, 7, 8, 9].includes(c.style) && c.outlineMode !== 0));
  assert.ok(sample('red').every(c => c.outlineMode !== 0 && c.scopeDotUseCrosshairColor));
  assert.ok(new Set(sample('gold').map(c => c.style)).size === 10);
  assert.ok(new Set(sample('blue', 60).map(encode)).size > 20);
});

test('case draws carry a known rarity and random generation respects the reference resolution', () => {
  for (let n = 0; n < 200; n++) { const d = drawItem(); assert.ok(TIERS.some(t => t.id === d.tier)); assert.deepEqual(decode(encode(d.core)), d.core); }
  for (let n = 0; n < 100; n++) {
    const c = randomCrosshair(1440);
    assert.equal(c.screenHeight, 1440); assert.deepEqual(decode(encode(c)), c);
    assert.ok(c.thickness > 0 && c.alpha > 0 && (c.style === 2 || c.gap >= 0));
  }
});
