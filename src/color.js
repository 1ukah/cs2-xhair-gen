import { $, $$, closeFloat, float } from './ui.js';
import { bounded, clamp, fromHex, hex } from './settings.js';

function toHSV([r, g, b], oldHue = 0) {
  r /= 255; g /= 255; b /= 255;
  const hi = Math.max(r, g, b), d = hi - Math.min(r, g, b);
  const h = d ? (hi === r ? (g - b) / d : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 : oldHue;
  return [(h + 360) % 360, hi ? d / hi : 0, hi];
}
function toRGB([h, s, v]) {
  return [5, 3, 1].map(n => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  });
}
const CHIPS = ['00FF00', '56FFAE', '54EAFF', 'FFF652', 'FF79CE', 'CF9DFF', 'FFFFFF', '000000'];
export function pickColor(anchor, label, current, apply) {
  if (anchor.getAttribute('aria-expanded') === 'true') return closeFloat();
  let rgba = [...current], hsv = toHSV(rgba);
  const d = document.createElement('div');
  d.className = 'color-pop'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', label);
  d.innerHTML = `<div class="sv" tabindex="0" role="slider" aria-label="Saturation and brightness" aria-valuemin="0" aria-valuemax="100"><span></span></div>
    <input class="hue" type="range" min="0" max="360" step="1" aria-label="Hue">
    <input class="opacity" type="range" min="0" max="255" step="1" aria-label="Transparency">
    <div class="rgba-fields"><label>Hex<input class="entry" data-hex type="text" maxlength="7" spellcheck="false"></label>${['R', 'G', 'B', 'A'].map((s, i) => `<label>${s}<input class="entry" data-channel="${i}" type="number" min="0" max="255" step="1" required></label>`).join('')}</div>
    <div class="color-samples">${CHIPS.map(c => `<button type="button" style="--chip:#${c}" data-preset="${c}" aria-label="#${c}"></button>`).join('')}</div>`;
  const { close, on } = float(anchor, d, '.preview');
  const sv = $('.sv', d), h = $('.hue', d), a = $('.opacity', d), code = $('[data-hex]', d);
  function paint(source) {
    const [H, S, V] = hsv;
    sv.style.setProperty('--hue', H);
    $('span', sv).style.cssText = `left:${S * 100}%;top:${(1 - V) * 100}%`;
    sv.setAttribute('aria-valuenow', Math.round(S * 100));
    sv.setAttribute('aria-valuetext', `${Math.round(S * 100)}% saturation, ${Math.round(V * 100)}% brightness`);
    if (h !== source) h.value = Math.round(H);
    a.value = rgba[3]; a.style.setProperty('--ink', hex(rgba));
    $$('[data-channel]', d).forEach((el, i) => { if (el !== source) el.value = rgba[i]; });
    if (code !== source) code.value = hex(rgba);
    if (source !== null) apply(rgba);
  }
  function fromHSV(source) { rgba = [...toRGB(hsv), rgba[3]]; paint(source); }
  function fromRGB(rgb, source) { rgba = [...rgb, rgba[3]]; hsv = toHSV(rgba, hsv[0]); paint(source); }
  function position(e) {
    const b = sv.getBoundingClientRect();
    hsv[1] = clamp((e.clientX - b.left) / b.width, 0, 1); hsv[2] = 1 - clamp((e.clientY - b.top) / b.height, 0, 1);
    fromHSV();
  }
  sv.onpointerdown = e => { sv.setPointerCapture(e.pointerId); position(e); };
  sv.onpointermove = e => { if (sv.hasPointerCapture(e.pointerId)) position(e); };
  sv.onkeydown = e => {
    const k = { ArrowLeft: [1, -1], ArrowRight: [1, 1], ArrowDown: [2, -1], ArrowUp: [2, 1] }[e.key];
    if (k) { e.preventDefault(); hsv[k[0]] = clamp(hsv[k[0]] + k[1] * (e.shiftKey ? 0.1 : 0.01), 0, 1); fromHSV(); }
  };
  h.oninput = () => { hsv[0] = +h.value; fromHSV(h); };
  a.oninput = () => { rgba[3] = +a.value; paint(); };
  for (const el of $$('[data-channel]', d)) {
    el.oninput = () => {
      if (!el.validity.valid) return;
      const i = +el.dataset.channel, v = bounded(+el.value, 0, 255);
      if (i === 3) { rgba[3] = v; paint(el); } else fromRGB(rgba.slice(0, 3).with(i, v), el);
    };
  }
  code.oninput = () => { const c = fromHex(code.value); if (c) fromRGB(c, code); };
  for (const el of $$('[data-preset]', d)) el.onclick = () => fromRGB(fromHex(el.dataset.preset));
  on(d, 'keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); anchor.focus({ preventScroll: true }); } });
  paint(null);
  if (!matchMedia('(max-width:700px)').matches) {
    const b = anchor.getBoundingClientRect(), view = $('.preview').getBoundingClientRect(), w = d.offsetWidth, cap = innerHeight - d.offsetHeight - 8;
    const beside = cap < view.bottom + 6 && innerWidth - view.right >= w + 16;
    d.style.left = `${beside ? view.right + 8 : Math.max(8, Math.min(b.right - w, innerWidth - w - 8))}px`;
    d.style.top = `${beside ? Math.max(8, Math.min(view.top, cap)) : Math.max(8, Math.min(Math.max(b.bottom + 4, view.bottom + 6), cap))}px`;
  }
  sv.focus({ preventScroll: true });
}
