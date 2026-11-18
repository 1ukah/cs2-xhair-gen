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
  if (isCase) container.activate(); else container.deactivate();
  $('#editor-page').hidden = isCase; $('#case-page').hidden = !isCase;
  editor.activate(!isCase);
  $$('[data-page]').forEach(el => {
    if (el.dataset.page === id) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  document.title = isCase ? 'Series 1 Case · CS2 Crosshair Generator' : 'CS2 Crosshair Generator';
  rail.dismiss();
  if (scroll && location.hash !== '#main') {
    $('#main').scrollTop = 0; $('#main').focus({ preventScroll: true });
  }
}
function soundButton() {
  const b = $('#sound'); b.innerHTML = icon(soundOn() ? 'sound' : 'mute', 22);
  b.setAttribute('aria-pressed', String(soundOn())); b.setAttribute('aria-label', `Sound ${soundOn() ? 'on' : 'off'}`);
}
$('#sound').onclick = () => { toggleSound(); soundButton(); };
function about() {
  dialog('', 'How it works', `<ol class="steps">
      <li>Tune the rows. Hold the preview to test fire.</li>
      <li><b>Copy</b> the code and paste it in CS2: <b>Settings › Crosshair/Scopes › Share or Import</b>.</li>
      <li><b>.cfg</b> also keeps the grenade and sniper rows: put <code>crosshair.cfg</code> in <code>game/csgo/cfg/</code> and run <code>exec crosshair</code>.</li>
      <li>Case drops are random per rarity and stay in this browser.</li>
    </ol><p class="form-note">Fan tool. Counter-Strike belongs to Valve.</p>`);
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
