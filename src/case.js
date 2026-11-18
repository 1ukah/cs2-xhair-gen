import { ITEMS, TIERS, TOTAL, drawItem, odds, tierOf, uniform } from './collection.js';
import { encode, styleName } from './settings.js';
import { specimen } from './reticle.js';
import { $, $$, activeSection, copyText, dialog, icon, load, modal, notice, reduced, scrollToSection, store, tone, unlockAudio } from './ui.js';

const count = n => String(n).padStart(2, '0');
const byId = id => ITEMS.find(i => i.id === id);
const REEL = { tiles: 38, start: 2, winner: 34, duration: 6000, ease: 'cubic-bezier(0.075, 0.82, 0.165, 1)' };
const TICKS = [...Array.from({ length: 23 }, (_, i) => Math.round(i * 62.5)), 1351, 1483, 1620, 1701, 1786, 1872, 2003, 2154, 2313, 2466, 2615, 2773, 2941, 3104, 3339, 3630, 3953, 4385, 5004];
const palette = t => `--rarity:${t.color}`;
const mystery = i => i.tier === 'gold';
function art(i, size, hiddenGold) { return hiddenGold && mystery(i) ? icon('star', size * 0.68) : specimen(i.core, size); }
function tile(i, index, qty) {
  const t = tierOf(i), concealed = qty === undefined && mystery(i);
  return `<button type="button" class="item-card" style="${palette(t)}" data-item="${i.id}"><span class="item-art">${art(i, 46, concealed)}</span><span class="item-top">${qty !== undefined ? `×${qty}` : `Nº ${count(index + 1)}`}</span><strong>${concealed ? '★ Special item' : i.name}</strong><span class="item-grade"><i></i>${t.label}</span></button>`;
}
function reelTile(i) {
  const t = tierOf(i);
  return `<div class="reel-slot"><div class="reel-card" style="${palette(t)}"><span>${art(i, 50, true)}</span><b>${mystery(i) ? '★ Special item' : i.name}</b></div></div>`;
}
export function initCase(equip, rail) {
  const raw = load('case', {}), owned = {};
  for (const i of ITEMS) if (Number.isSafeInteger(raw?.owned?.[i.id]) && raw.owned[i.id] > 0) owned[i.id] = raw.owned[i.id];
  const order = [...new Set([...(Array.isArray(raw?.order) ? raw.order : []), ...Object.keys(owned)])].filter(id => typeof id === 'string' && byId(id) && owned[id]);
  let pending = byId(raw?.pending)?.id || null, result = pending && owned[pending] ? byId(pending) : null;
  let phase = 'idle', run = null;
  const stage = $('#case-stage'), reel = $('#reel'), reward = $('#reward'), actions = $('#case-actions');
  const persist = () => store('case', { owned, order, pending });
  const totalOwned = () => Object.values(owned).reduce((s, n) => s + n, 0);
  const badge = () => { $('#inventory-count').textContent = count(totalOwned()); $('#inventory').setAttribute('aria-label', `Inventory, ${totalOwned()} drops`); };
  function setPhase(s) { phase = s; stage.dataset.phase = s; }
  function setCaption(kicker, status) { $('#case-kicker').textContent = kicker; $('#case-status').textContent = status; }
  function idle() {
    setPhase('idle'); reel.hidden = true; reward.hidden = true;
    setCaption('Ready to open', 'xhairgen Case');
    actions.innerHTML = `<button type="button" class="btn go" data-open>${icon('key')}Open case</button>`;
  }
  function use(i) {
    if (modal().open) modal().close();
    rail?.dismiss();
    equip(i.core); location.hash = 'editor'; notice(`Equipped · ${i.name}`);
  }
  function inspect(i, fromInventory = false) {
    const t = tierOf(i), concealed = mystery(i) && !fromInventory && !owned[i.id];
    const singleChance = (t.weight / TOTAL * 100 / ITEMS.filter(other => other.tier === i.tier).length).toFixed(3);
    const d = dialog(fromInventory ? 'Local inventory' : 'Series 01 · Case contents', concealed ? 'Rare Special Item' : i.name,
      `<div class="inspect-art" style="${palette(t)}">${art(i, 108, concealed)}</div><div class="inspect-details"><span class="rarity-pill" style="${palette(t)}">${t.label}</span><span>${concealed ? 'Special drop' : styleName(i.core.style)}</span></div><p class="form-note">${singleChance}% chance per opening · ${owned[i.id] || 0} in your inventory</p>`,
      `${fromInventory ? '<button class="text-btn mr-auto" id="inventory-back">Back to inventory</button>' : ''}<button class="btn secondary" data-close>Close</button>${owned[i.id] ? `<button class="btn primary" id="inspect-equip">${icon('target')}Use in editor</button>` : ''}`);
    if ($('#inspect-equip', d)) $('#inspect-equip', d).onclick = () => use(i);
    if ($('#inventory-back', d)) $('#inventory-back', d).onclick = inventory;
  }
  function inventory() {
    const total = totalOwned(), d = dialog('Collection', 'Your inventory', total
      ? `<div class="inventory-summary">${total} ${total === 1 ? 'drop' : 'drops'} <b>/</b> ${order.length} of ${ITEMS.length} designs collected</div><div class="item-grid inventory-grid">${order.map((id, n) => tile(byId(id), n, owned[id])).join('')}</div>`
      : `<div class="empty"><img src="./assets/case.svg" width="172" alt=""><h3>No drops yet</h3><p>Open an xhairgen Case to add your first reticle.</p></div>`,
      `<button class="btn secondary" data-close>Close</button>${total ? '' : `<button class="btn primary" id="visit-case">${icon('case')}Inspect case</button>`}`, true);
    const grid = $('.inventory-grid', d);
    if (grid) grid.onclick = e => { const el = e.target.closest('[data-item]'); if (el) inspect(byId(el.dataset.item), true); };
    if ($('#visit-case', d)) $('#visit-case', d).onclick = () => { d.close(); location.hash = 'case'; };
  }
  function dropRow(id) {
    const i = byId(id), t = tierOf(i);
    return `<li class="drop" style="${palette(t)}"><button type="button" class="drop-main" data-item="${id}" title="Inspect ${i.name}"><span class="drop-art">${specimen(i.core, 30)}</span><span class="drop-text"><strong>${i.name}</strong><small><i></i>${t.label}<b>×${owned[id]}</b></small></span></button><button type="button" class="drop-use" data-equip="${id}" aria-label="Use ${i.name} in editor" title="Use in editor">${icon('target', 19)}</button></li>`;
  }
  function renderRail() {
    const total = totalOwned(), visit = `<a class="box-btn" href="#case">${icon('case', 15)}Open a case</a>`;
    $('#rail-recent-count').textContent = total; $('#rail-collection-count').textContent = order.length;
    $('#rail-summary').textContent = total ? `${total} ${total === 1 ? 'drop' : 'drops'} · ${order.length} of ${ITEMS.length} designs collected.` : 'Nothing unsealed yet.';
    $('#rail-tip').textContent = total ? 'Pick a drop to inspect it, or use its target button to load it into the editor.' : 'Open an xhairgen Case to add your first reticle. Drops are kept in this browser.';
    $('#rail-recent').innerHTML = total
      ? `<ul class="drop-list">${order.slice(0, 12).map(dropRow).join('')}</ul><div class="rail-foot"><button type="button" class="box-btn" data-rail-all>${icon('grid', 15)}Full inventory</button></div>`
      : `<p class="rail-empty">No drops yet.</p><div class="rail-foot">${visit}</div>`;
    $('#rail-collection').innerHTML = TIERS.map(t => {
      const all = ITEMS.filter(i => i.tier === t.id), have = all.filter(i => owned[i.id]).length;
      return `<div class="tier-row" style="${palette(t)}"><span><i></i>${t.label}</span><b>${have} / ${all.length}</b><span class="tier-bar"><i style="width:${have * 100 / all.length}%"></i></span></div>`;
    }).join('') + `<div class="rail-foot">${total ? `<button type="button" class="box-btn" data-rail-all>${icon('grid', 15)}Full inventory</button>` : ''}${visit}</div>`;
  }
  function showResult() {
    if (!result) return idle();
    const i = result, t = tierOf(i);
    setPhase('revealed'); reel.hidden = true; reward.hidden = false;
    reward.style.setProperty('--rarity', t.color);
    reward.innerHTML = `<div class="reward-art">${specimen(i.core, 94)}</div><div class="reward-banner"><h2>${i.name}</h2><p><span class="rarity-pill" style="${palette(t)}">${t.label}</span>${styleName(i.core.style)}</p></div>`;
    setCaption('Added to inventory', i.name);
    actions.innerHTML = `<button type="button" class="icon-btn" data-copy-drop aria-label="Copy drop share code" title="Copy share code">${icon('copy')}</button><button type="button" class="btn secondary compact" data-open>Open another</button><button type="button" class="btn primary compact" data-equip>${icon('target', 16)}Use in editor</button>`;
  }
  function finish(audible = true) {
    if (!run) return;
    const previous = run; run = null;
    previous.timers.forEach(clearTimeout); previous.animations.forEach(a => a.cancel());
    pending = null; persist(); showResult(); renderRail();
    if (audible) { const base = 320 + TIERS.indexOf(tierOf(result)) * 90; tone(base, 0.18); tone(base * 1.5, 0.25, 'sine', 0.10); }
  }
  function later(cb, ms) { run.timers.push(setTimeout(cb, ms)); }
  function spin() {
    if (!run) return;
    const tiles = Array.from({ length: REEL.tiles }, () => drawItem());
    tiles[REEL.winner] = result;
    const html = tiles.map(reelTile).join('');
    const offset = (index, fraction) => `translateX(${-100 * (index + fraction) / REEL.tiles}%)`;
    const first = offset(REEL.start, 0.5), final = offset(REEL.winner, (10 + uniform(81)) / 100);
    setPhase('rolling'); reel.hidden = false;
    setCaption('Opening container', 'Finding your reticle…');
    for (const track of $$('.reel-track', reel)) {
      track.innerHTML = html; track.style.transform = final;
      const anim = track.animate([{ transform: first }, { transform: final }], { duration: REEL.duration, easing: REEL.ease, fill: 'both' });
      run.animations.push(anim);
    }
    TICKS.forEach(ms => later(() => tone(930, 0.028, 'triangle'), ms));
    run.animations[0].finished.then(() => finish(), () => {});
  }
  function open() {
    if (run) return;
    result = drawItem(); pending = result.id;
    owned[pending] = (owned[pending] || 0) + 1;
    const idx = order.indexOf(pending); if (idx >= 0) order.splice(idx, 1); order.unshift(pending);
    persist(); badge(); unlockAudio();
    run = { timers: [], animations: [] }; setPhase('unlocking');
    reward.hidden = true; reel.hidden = true; setCaption('Opening container', 'Unlocking case…');
    actions.innerHTML = `<button type="button" class="btn secondary" data-skip>Skip animation${icon('chevrons')}</button>`;
    if (reduced()) { finish(); return; }
    tone(195, 0.12, 'triangle'); later(() => tone(310, 0.08, 'triangle'), 750); later(spin, 2000);
  }
  actions.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-open')) open();
    if (b.hasAttribute('data-skip')) finish();
    if (b.hasAttribute('data-equip') && result) use(result);
    if (b.hasAttribute('data-copy-drop') && result) copyText(encode(result.core));
  };
  $('#inventory').onclick = inventory;
  $('#rail').addEventListener('click', e => {
    const equipBtn = e.target.closest('[data-equip]'), itemBtn = e.target.closest('[data-item]');
    if (equipBtn) use(byId(equipBtn.dataset.equip));
    else if (itemBtn) inspect(byId(itemBtn.dataset.item), true);
    else if (e.target.closest('[data-rail-all], #rail-all')) inventory();
  });
  if (rail) rail.prefer = () => (run ? order.length > 1 || owned[order[0]] > 1 : order.length) ? 'recent' : null;
  $('#items').innerHTML = ITEMS.map((i, n) => tile(i, n)).join('');
  $('#items').onclick = e => { const el = e.target.closest('[data-item]'); if (el) inspect(byId(el.dataset.item)); };
  $('#contents-count').textContent = `${ITEMS.length} possible drops`;
  $('#chance-list').innerHTML = TIERS.map(t => `<div class="chance-row" style="${palette(t)}"><span><i></i>${t.label}</span><b>${odds(t)}</b></div>`).join('');
  $('#odds-bar').innerHTML = TIERS.map(t => `<i style="background:${t.color};flex:${t.weight}"></i>`).join('');
  const scroller = $('#main'), page = $('#case-page'), tabs = $$('#case-tabs [data-jump]'), secs = tabs.map(b => document.getElementById(b.dataset.jump));
  let hold = 0, spyFrame = 0;
  const bandHeight = () => $('.band', page).offsetHeight;
  function markTab(id) { for (const b of tabs) { if (b.dataset.jump === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); } }
  function spy() {
    if (page.hidden || performance.now() < hold) return;
    const current = activeSection(scroller, secs, bandHeight() + 18); if (current) markTab(current.id);
  }
  scroller.addEventListener('scroll', () => { spyFrame ||= requestAnimationFrame(() => { spyFrame = 0; spy(); }); }, { passive: true });
  $('#case-tabs').onclick = e => {
    const b = e.target.closest('[data-jump]'); if (!b) return;
    const n = tabs.indexOf(b);
    hold = performance.now() + (reduced() ? 120 : 700); markTab(b.dataset.jump);
    scrollToSection(scroller, n ? secs[n] : null, bandHeight() + 8);
    (n ? $('.group-title', secs[n]) : $('button', actions))?.focus({ preventScroll: true });
  };
  badge(); renderRail();
  if (result) { pending = null; persist(); showResult(); } else idle();
  return { deactivate() { if (run) finish(false); } };
}
