import { clamp, hex } from './settings.js';

let maskSerial = 0;
// Geometry is shared by the map monitor, inventory, inspection and both reel layers.
// Units are pixels at the profile's reference height. Movement is a visual sample.
export function reticle(c, movement = 0, shot = 0) {
  const t = Math.max(1, c.thickness), style = c.style, gap = c.gap;
  const spread = Math.min(64 + c.dynamicSpreadLimit, Math.max(24 * movement, 80 * shot));
  const parts = [];
  const rect = (x, y, w, h, a = 1) => {
    if (w > 0 && h > 0 && a > 0) parts.push({ tag: 'rect', geo: `x="${Math.round(x)}" y="${Math.round(y)}" width="${w}" height="${h}" shape-rendering="crispEdges"`, a });
  };
  function bars(distance, length, a = 1) {
    const g = Math.round(distance), l = Math.round(length), edge = -Math.floor(t / 2);
    rect(g, edge, l, t, a); rect(-g - l, edge, l, t, a); rect(edge, g, t, l, a);
    if (!c.tStyleEnabled) rect(edge, -g - l, t, l, a);
  }
  const ring = r => parts.push({ tag: 'circle', geo: `cx="0" cy="0" r="${r}"`, line: true, a: 1 });
  function arcs(r, fraction) {
    if (fraction <= 0) return;
    const half = Math.PI / 4 * Math.min(0.99, fraction);
    for (let i = 0; i < 4; i++) {
      const mid = Math.PI / 4 + i * Math.PI / 2, start = mid - half, end = mid + half;
      const xy = a => `${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`;
      parts.push({ tag: 'path', geo: `d="M${xy(start)} A${r} ${r} 0 0 1 ${xy(end)}"`, line: true, a: 1 });
    }
  }
  const radius = Math.max(0, gap) + t / 2;
  switch (style) {
    case 0: bars(gap + spread, c.length); break;
    case 1: ring(t / 2 + 3 + spread); break;
    case 2: {
      const offset = Math.round(22 * Math.max(movement, shot));
      if (offset <= c.splitDistance) bars(gap + offset, c.length);
      else {
        const outer = Math.round(c.length * c.splitSizeRatio), inner = c.length - outer;
        bars(gap + c.splitDistance, inner, c.innerSplitAlpha);
        bars(gap + offset + inner, outer, c.outerSplitAlpha);
      }
      break;
    }
    case 3: ring(radius); break;
    case 4: bars(gap, c.length); break;
    case 5: bars(gap + shot * 14, c.length); break;
    case 6: break;
    case 7: bars(gap, c.length); arcs(radius + spread, 0.57); break;
    case 8: parts.push({ tag: 'rect', geo: `x="${-radius}" y="${-radius}" width="${2 * radius}" height="${2 * radius}" shape-rendering="crispEdges"`, line: true, a: 1 }); break;
    case 9: arcs(radius, c.splitSizeRatio); break;
  }
  if (style === 6 || c.centerDotEnabled) rect(-Math.floor(t / 2), -Math.floor(t / 2), t, t);
  const ink = hex([c.red, c.green, c.blue]), edge = hex([c.outlineRed, c.outlineGreen, c.outlineBlue]);
  function layer(color, outline, solid = false) {
    const full = outline && c.outlineMode === 1;
    return parts.map(p => `<${p.tag} ${p.geo} opacity="${solid ? 1 : p.a}" fill="${p.line ? 'none' : color}" stroke="${p.line || full ? color : 'none'}" stroke-width="${p.line ? t + (full ? 2 : 0) : full ? 2 : 0}"/>`).join('');
  }
  let outline = '';
  if (c.outlineMode && c.outlineAlpha) {
    const edgeShapes = layer(edge, true);
    const border = c.outlineMode === 2 ? [[-1, 0], [0, -1], [-1, -1]].map(([x,y]) => `<g transform="translate(${x} ${y})">${edgeShapes}</g>`).join('') : edgeShapes;
    let mask = '';
    if (c.alpha < 255 || parts.some(p => p.a < 1)) {
      // Punch out the ink area so a transparent fill never exposes a solid outline backing.
      const id = `reticle-edge-${++maskSerial}`, r = Math.ceil(Math.abs(gap) + c.length + t + Math.max(24, spread) + 4);
      const box = `x="${-r}" y="${-r}" width="${2*r}" height="${2*r}"`;
      outline = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="white"/>${layer('black', false, true)}</mask></defs>`;
      mask = ` mask="url(#${id})"`;
    }
    outline += `<g opacity="${c.outlineAlpha / 255}"${mask}>${border}</g>`;
  }
  return `${outline}<g opacity="${c.alpha / 255}">${layer(ink, false)}</g>`;
}
export function specimen(c, size = 50, movement = 0) {
  const extent = [3, 8, 9].includes(c.style) ? c.gap + c.thickness : c.style === 6 ? c.thickness : c.length + Math.abs(c.gap) + c.thickness;
  const r = clamp(extent + 3, 12, 400);
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="${-r} ${-r} ${2 * r} ${2 * r}">${reticle(c, movement)}</svg>`;
}
