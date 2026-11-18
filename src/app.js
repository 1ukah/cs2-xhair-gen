import { initEditor } from './editor.js';
import { initCase } from './case.js';
import { initRail } from './rail.js';
import { initPreviewHud } from './preview-hud.js';
import { $, $$, dialog, fillIcons, icon, modal, soundOn, toggleSound } from './ui.js';

fillIcons();
const rail = initRail();
const editor = initEditor();
try { initPreviewHud(); } catch (err) { console.error('HUD preview could not start', err); }
const container = initCase(c => editor.equip(c), rail);
function route(scroll) {
  const isCase = location.hash === '#case', id = isCase ? 'case' : 'editor';
  if (!isCase) container.deactivate();
  $('#editor-page').hidden = isCase; $('#case-page').hidden = !isCase;
  editor.activate(!isCase);
  $$('[data-page]').forEach(el => {
    if (el.dataset.page === id) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  document.title = `xhairgen · ${isCase ? 'Case' : 'CS2 Crosshair Generator'}`;
  rail.dismiss();
  if (scroll && location.hash !== '#main') {
    $('#main').scrollTop = 0; $('#main').focus({ preventScroll: true });
  }
}
function soundButton() {
  const b = $('#sound'); b.innerHTML = icon(soundOn() ? 'sound' : 'mute', 22);
  b.setAttribute('aria-pressed', String(soundOn())); b.setAttribute('aria-label', `Sound ${soundOn() ? 'on' : 'off'}`);
  b.title = `${soundOn() ? 'Mute' : 'Enable'} case sounds`;
}
$('#sound').onclick = () => { toggleSound(); soundButton(); };
function about() {
  dialog('xhairgen', 'How it works', `<ol class="steps">
      <li><b>Tune it.</b> Every Crosshair/Scopes row updates the map preview. Hold the preview to test fire, start the dynamic preview for movement, or open <b>HUD preview</b> for a full-window view.</li>
      <li><b>Take it into CS2.</b> Use <b>Copy code</b>, then paste it in <b>Settings › Crosshair/Scopes › Share or Import</b>.</li>
      <li><b>Keep the rest.</b> Spectator, grenade and sniper rows are not part of a share code. <b>Full config .cfg</b> exports them: put <code>xhairgen.cfg</code> in <code>game/csgo/cfg/</code> and run <code>exec xhairgen</code> in the console.</li>
      <li><b>Open cases.</b> Each xhairgen Case drop is rolled before the animation starts and lands in your inventory, ready to equip.</li>
    </ol><p class="form-note">Settings, drops and sound preference stay in this browser. Independent fan tool; Counter-Strike belongs to Valve.</p>`,
    '<button class="btn secondary" data-close>Close</button>');
}
for (const b of $$('[data-about]')) b.onclick = about;
const d = modal();
d.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) d.close();
  else if (e.target === d) {
    const b = d.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) d.close();
  }
});
$('.skip').onclick = e => { e.preventDefault(); $('#main').focus(); };
window.addEventListener('hashchange', () => route(true));
route(false); soundButton();
