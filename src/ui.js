export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const solid = d => `<path fill="currentColor" stroke="none" fill-rule="evenodd" d="${d}"/>`;
const paths = {
  sliders: '<path d="M3 6h7m5 0h6M3 12h2m5 0h11M3 18h11m5 0h2"/><circle cx="12.5" cy="6" r="2.5"/><circle cx="7.5" cy="12" r="2.5"/><circle cx="16.5" cy="18" r="2.5"/>',
  case: '<rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12h18M7 11v3m10-3v3"/>',
  inventory: '<path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
  sound: '<path fill="currentColor" d="M3 9h4l5-5v16l-5-5H3z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path fill="currentColor" d="M3 9h4l5-5v16l-5-5H3z"/><path d="M16 9l5 6m0-6-5 6"/>',
  shuffle: '<path d="M3 6h3c4.5 0 7.5 12 12 12h3m-4-4 4 4-4 4M3 18h3c1.8 0 3-1.8 4-3.5M14 9.5C15.6 7 16.3 6 18 6h3m-4-4 4 4-4 4"/>',
  import: '<path d="M12 2v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',
  export: '<path d="M12 15V3m-5 5 5-5 5 5M4 14v6h16v-6"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="14" rx="1.3"/><path d="M8 21h8m-4-3v3"/>',
  target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>',
  frame: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  left: '<path d="m15 5-7 7 7 7"/>', right: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>', arrow: '<path d="M3 12h17m-7-7 7 7-7 7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="1.5"/><path d="M16 8V3H3v13h5"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1.5 7M3 4v6h6"/>',
  undo: '<path d="m8 3-6 6 6 6M3 9h11a7 7 0 0 1 0 14"/>',
  check: '<path d="m4 12 5 5L20 6"/>', close: '<path d="m5 5 14 14M19 5 5 19"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 3v6"/>',
  motion: '<path d="M2 7h8m-6 5h5m-7 5h5m7-12 7 7-7 7m-3-7h10"/>',
  zoom: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M3 17v4h18v-4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  key: '<circle cx="8" cy="8" r="4.5"/><path d="m11 11 9 9 2-2-2-2 1.5-1.5-2-2-1.5 1.5"/>',
  star: '<path d="m12 2 2.6 6.5 7 .5-5.4 4.7 1.6 7-5.8-3.8-5.8 3.8 1.6-7L2.4 9l7-.5z"/>',
  chevrons: '<path d="m5 5 7 7-7 7m7-14 7 7-7 7"/>',
  chart: '<path d="M3 20h18M5 16v-4m6 4V8m6 8V4"/>',
  link: '<path d="m10 14 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 1 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  search: '<circle cx="10" cy="10" r="6.2" stroke-width="2.3"/><path stroke-width="2.6" d="m15 15 6 6"/>',
  history: '<path stroke-width="2" d="M4 12a8 8 0 1 0 2.4-5.7M3.5 3.5v4h4M12 7.8V12l3 2"/>',
  home: solid('M12 3 2 12h3v8.5h5.2v-6h3.6v6H19V12h3z'),
  user: solid('M12 3.5a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zM4 20.5c0-4.1 3.5-6.4 8-6.4s8 2.3 8 6.4z'),
  info: solid('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.3 5h2.6v2.6h-2.6zm0 4.2h2.6V17h-2.6z'),
  grid: solid('M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z'),
};
export function icon(name, size = 18) {
  return `<svg class="icon" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}
export function fillIcons(root = document) {
  for (const e of $$('[data-icon]', root)) e.innerHTML = icon(e.dataset.icon, Number(e.dataset.size || 18));
}
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`xhairgen.1.${key}`)) ?? fallback; }
  catch { return fallback; }
}
export function store(key, value) {
  try { localStorage.setItem(`xhairgen.1.${key}`, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function activeSection(scroller, sections, offset = 14) {
  if (!sections.length) return null;
  if (scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) return sections.at(-1);
  const line = scroller.getBoundingClientRect().top + offset;
  let current = sections[0];
  for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
  return current;
}
export function scrollToSection(scroller, section, pad = 0) {
  const top = section ? scroller.scrollTop + section.getBoundingClientRect().top - scroller.getBoundingClientRect().top - pad : 0;
  scroller.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
}
let toastTimer;
export function notice(text) {
  const e = $('#toast'); e.textContent = text; e.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => e.classList.remove('visible'), 2600);
}
export const modal = () => $('#dialog');
export function dialog(kicker, title, body, actions = '', wide = false, sides = null) {
  const d = modal();
  const main = `<header class="dialog-header"><div>${kicker ? `<p class="eyebrow">${kicker}</p>` : ''}<h2 id="dialog-title">${title}</h2></div><button class="icon-btn" data-close aria-label="Close dialog">${icon('close')}</button></header><div class="dialog-body">${body}</div>${actions ? `<footer class="dialog-actions">${actions}</footer>` : ''}`;
  d.className = `modal${wide ? ' wide' : ''}${sides ? ' trio' : ''}`;
  d.innerHTML = sides ? `<aside class="side-panel">${sides[0]}</aside><div class="main-panel">${main}</div><aside class="side-panel">${sides[1]}</aside>` : main;
  if (!d.open) d.showModal();
  d.tabIndex = -1; d.focus({ preventScroll: true });
  return d;
}
export async function copyText(text, message = 'Crosshair code copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text; el.style.cssText = 'position:fixed;left:-9999px;top:0';
    (modal().open ? modal() : document.body).append(el); el.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; } finally { el.remove(); }
    if (!ok) {
      const d = dialog('Clipboard', 'Copy manually', '<p>Select the text below and copy it.</p><textarea class="entry manual-copy" aria-label="Text to copy" readonly></textarea>');
      $('textarea', d).value = text; $('textarea', d).select(); return false;
    }
  }
  notice(message); return true;
}
let audio, sound = load('sound', true) !== false;
export const soundOn = () => sound;
export function toggleSound() { sound = !sound; store('sound', sound); if (sound) tone(680, 0.08); }
export function unlockAudio() {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { }
}
export function tone(hz = 850, duration = 0.036, type = 'sine', delay = 0) {
  if (!sound || document.hidden) return;
  unlockAudio();
  if (!audio || audio.state !== 'running') return;
  const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + delay;
  osc.type = type; osc.frequency.setValueAtTime(hz, at);
  gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.05, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(audio.destination); osc.start(at); osc.stop(at + duration + 0.01);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
