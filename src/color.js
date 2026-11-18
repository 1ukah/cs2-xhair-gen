import { $, $$, dialog } from './ui.js';
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
export function pickColor(label, current, apply) {
  let rgba = [...current], hsv = toHSV(rgba);
  const chips = ['00FF00', '56FFAE', '54EAFF', 'FFF652', 'FF79CE', 'CF9DFF', 'FFFFFF', '000000'];
  const d = dialog('Style settings', label, `
    <div class="color-work">
      <div class="sv" id="sv" tabindex="0" role="slider" aria-label="Saturation and brightness; use arrow keys" aria-valuemin="0" aria-valuemax="100"><span></span></div>
      <div class="color-sliders"><label>Hue<input id="hue" type="range" min="0" max="360" step="1"></label><label>Transparency<input id="opacity" type="range" min="0" max="255" step="1"></label></div>
    </div>
    <div class="rgba-fields">${['R', 'G', 'B', 'A'].map((s, i) => `<label>${s}<input class="entry" data-channel="${i}" type="number" min="0" max="255" step="1" required></label>`).join('')}<label class="hex-label">Hex<input class="entry" id="hex" type="text" maxlength="7" spellcheck="false" required></label></div>
    <div class="color-samples">${chips.map(c => `<button style="--chip:#${c}" data-preset="${c}" aria-label="Use color #${c}"></button>`).join('')}</div>
    <div class="compare"><span>Current <i id="old-color"></i></span><span>New <i id="new-color"></i></span></div>`,
    '<button class="btn secondary" data-close>Cancel</button><button class="btn primary" id="accept-color">Accept</button>');
  const sv = $('#sv', d), h = $('#hue', d), a = $('#opacity', d), code = $('#hex', d);
  function paint(source) {
    const [H, S, V] = hsv;
    sv.style.setProperty('--hue', H);
    $('span', sv).style.cssText = `left:${S * 100}%;top:${(1 - V) * 100}%`;
    sv.setAttribute('aria-valuenow', Math.round(S * 100));
    sv.setAttribute('aria-valuetext', `${Math.round(S * 100)}% saturation, ${Math.round(V * 100)}% brightness`);
    h.value = Math.round(H); a.value = rgba[3]; a.style.setProperty('--ink', hex(rgba));
    $$('[data-channel]', d).forEach((el, i) => { if (el !== source) el.value = rgba[i]; });
    if (code !== source) code.value = hex(rgba);
    $('#old-color', d).style.setProperty('--swatch', `rgba(${current.slice(0, 3)},${current[3] / 255})`);
    $('#new-color', d).style.setProperty('--swatch', `rgba(${rgba.slice(0, 3)},${rgba[3] / 255})`);
    $('#accept-color', d).disabled = !fromHex(code.value) || $$('[data-channel]', d).some(i => !i.validity.valid);
  }
  function fromHSV() { rgba = [...toRGB(hsv), rgba[3]]; paint(); }
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
  h.oninput = () => { hsv[0] = +h.value; fromHSV(); }; a.oninput = () => { rgba[3] = +a.value; paint(); };
  for (const el of $$('[data-channel]', d)) {
    el.oninput = () => {
      if (el.validity.valid) { rgba[+el.dataset.channel] = bounded(+el.value, 0, 255); hsv = toHSV(rgba, hsv[0]); }
      paint(el);
    };
  }
  code.oninput = () => { const c = fromHex(code.value); if (c) { rgba = [...c, rgba[3]]; hsv = toHSV(rgba, hsv[0]); } paint(code); };
  for (const el of $$('[data-preset]', d)) el.onclick = () => { rgba = [...fromHex(el.dataset.preset), rgba[3]]; hsv = toHSV(rgba, hsv[0]); paint(); };
  $('#accept-color', d).onclick = () => { d.close(); apply(rgba); };
  paint();
}
