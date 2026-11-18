import { $, $$ } from './ui.js';

export function initRail() {
  const rail = $('#rail'), toggle = $('#rail-toggle'), opener = $('#rail-open'), scrim = $('#rail-scrim');
  const heads = $$('[data-rail-sec]', rail), shell = [$('#main'), $('.topbar')];
  const drawer = matchMedia('(max-width: 900px)'), tight = matchMedia('(max-width: 1480px)');
  let open = false, section = null;
  const api = { prefer: () => null, show, hide, dismiss, isOpen: () => open };
  function paint() {
    const sec = open ? section : null, modalMode = open && drawer.matches;
    rail.classList.toggle('open', open);
    if (sec) rail.dataset.sec = sec; else delete rail.dataset.sec;
    for (const b of [toggle, opener]) b.setAttribute('aria-expanded', String(open));
    for (const h of heads) {
      const on = h.dataset.railSec === sec;
      h.setAttribute('aria-expanded', String(on));
      h.closest('.rail-sec').classList.toggle('on', on);
      $(`#${h.getAttribute('aria-controls')}`).hidden = !on;
    }
    $('#rail-all').hidden = !open;
    $('#rail-close').hidden = !modalMode;
    scrim.hidden = !modalMode;
    for (const el of shell) el.inert = modalMode;
  }
  function show(sec = api.prefer()) {
    open = true; section = sec || null; paint();
    if (drawer.matches && !rail.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  }
  function hide(restore = true) {
    if (!open) return;
    const inside = rail.contains(document.activeElement), wasDrawer = drawer.matches;
    open = false; paint();
    if (restore && (inside || wasDrawer)) (wasDrawer ? opener : toggle).focus({ preventScroll: true });
  }
  function dismiss() { if (open && tight.matches) hide(false); }
  toggle.onclick = opener.onclick = () => (open ? hide() : show());
  $('#rail-close').onclick = scrim.onclick = () => hide();
  for (const h of heads) {
    h.onclick = () => {
      const sec = h.dataset.railSec;
      if (!open) show(sec); else { section = section === sec ? null : sec; paint(); }
    };
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open || e.defaultPrevented || document.querySelector('dialog[open]')) return;
    if (drawer.matches || rail.contains(document.activeElement)) { e.preventDefault(); hide(); }
  });
  document.addEventListener('pointerdown', e => {
    if (!open || !tight.matches || drawer.matches || !(e.target instanceof Element)) return;
    if (!e.target.closest('#rail, dialog')) hide(false);
  });
  drawer.addEventListener('change', paint);
  paint();
  return api;
}
