import { TIERS, drawItem, favoritesFirst, generate, odds, prune, tierById, uniform } from './collection.js';
import { decode, encode, styleName } from './settings.js';
import { specimen } from './reticle.js';
import { $, $$, copyText, dialog, icon, load, modal, notice, reduced, store, tone, unlockAudio } from './ui.js';

const LIMIT = 300;
const count = n => String(n).padStart(2, '0');
const REEL = { tiles: 44, start: 6, winner: 38, duration: 6000, ease: 'cubic-bezier(0.075, 0.82, 0.165, 1)' };
const TICKS = [...Array.from({ length: 23 }, (_, i) => Math.round(i * 62.5)), 1351, 1483, 1620, 1701, 1786, 1872, 2003, 2154, 2313, 2466, 2615, 2773, 2941, 3104, 3339, 3630, 3953, 4385, 5004];
const palette = t => `--rarity:${t.color}`;
const title = d => styleName(d.core.style);
const offset = (index, fraction) => `translateX(${-100 * (index + fraction) / REEL.tiles}%)`;
const star = (d, cls) => `<button type="button" class="${cls} fav" data-fav="${d.id}" aria-pressed="${d.fav}" aria-label="Favorite">${icon('star', 17)}</button>`;
function tile(d, picking, picked) {
  const t = tierById(d.tier);
  return `<div class="item-card${picked ? ' picked' : ''}" style="${palette(t)}"><button type="button" class="item-main" data-drop="${d.id}"${picking ? ` aria-pressed="${picked}"` : ''}><span class="item-art">${specimen(d.core, 46)}</span><strong>${title(d)}</strong><span class="item-grade">${t.label}</span></button>${star(d, 'item-fav')}</div>`;
}
function reelTile(d) {
  return `<div class="reel-slot"><div class="reel-card" style="${palette(tierById(d.tier))}">${d.tier === 'gold' ? icon('star', 38) : specimen(d.core, 54)}</div></div>`;
}
function dropRow(d) {
  const t = tierById(d.tier);
  return `<li class="drop" style="${palette(t)}"><button type="button" class="drop-main" data-drop="${d.id}"><span class="drop-art">${specimen(d.core, 30)}</span><span class="drop-text"><strong>${title(d)}</strong><small>${t.label}</small></span></button><button type="button" class="drop-use" data-equip="${d.id}" aria-label="Equip">${icon('target', 19)}</button></li>`;
}
export function initCase(equip) {
  const raw = load('case', {}), drops = [];
  let serial = 0;
  for (const d of Array.isArray(raw?.drops) ? raw.drops.slice(0, LIMIT) : []) {
    if (!tierById(d?.tier) || typeof d.code !== 'string') continue;
    try { drops.push({ id: ++serial, tier: d.tier, fav: d.fav === true, core: decode(d.code) }); } catch { }
  }
  const view = { tier: '', picking: false, picked: new Set(), armed: false };
  let result = raw?.pending === true && drops.length ? drops[0] : null;
  let pending = false, run = null, cycle = 0, turn = 0, auto = false, next = 0;
  const reel = $('#reel'), track = $('.reel-track', reel), reward = $('#reward'), actions = $('#case-actions');
  const byId = id => drops.find(d => d.id === +id);
  const persist = () => store('case', { drops: drops.map(d => ({ tier: d.tier, code: encode(d.core), ...(d.fav && { fav: true }) })), pending });
  function remove(list) {
    for (const d of list) { const i = drops.indexOf(d); if (i >= 0 && !(run && i === 0)) drops.splice(i, 1); }
    persist(); badge();
  }
  const badge = () => { $('#inventory-count').textContent = count(drops.length); $('#inventory').setAttribute('aria-label', `Inventory, ${drops.length} drops`); };
  const openButton = `<button type="button" class="btn go" data-open>${icon('key')}Open</button>`;
  function controls() {
    const toggle = `<button type="button" class="btn secondary" data-auto aria-pressed="${auto}">${icon('repeat', 17)}Auto</button>`;
    const held = actions.contains(document.activeElement) && document.activeElement.hasAttribute('data-auto');
    if (run) actions.innerHTML = `${toggle}<button type="button" class="btn secondary" data-skip>Skip${icon('chevrons')}</button>`;
    else actions.innerHTML = `${result ? `<button type="button" class="icon-btn" data-copy-drop aria-label="Copy share code">${icon('copy')}</button><button type="button" class="btn secondary" data-equip>${icon('target', 17)}Equip</button>` : ''}${toggle}${openButton}`;
    if (held) $('[data-auto]', actions).focus();
  }
  function fill(winner) {
    const tiles = Array.from({ length: REEL.tiles }, () => drawItem());
    if (winner) tiles[REEL.winner] = winner;
    track.innerHTML = tiles.map(reelTile).join('');
  }
  function idle() {
    reward.hidden = true; reel.hidden = false;
    fill(); track.style.transform = offset(REEL.start, 0.5);
    controls();
  }
  function use(d) {
    if (modal().open) modal().close();
    equip(d.core); location.hash = 'editor'; notice('Equipped');
  }
  function inspect(d) {
    const t = tierById(d.tier), code = encode(d.core);
    const box = dialog(t.label, title(d),
      `<div class="inspect-art" style="${palette(t)}">${specimen(d.core, 120)}</div><div class="code-row"><input class="entry code-entry" aria-label="Share code" readonly spellcheck="false" value="${code}"><button type="button" class="btn secondary compact" id="inspect-copy">${icon('copy', 15)}Copy</button></div>`,
      `<button class="text-btn mr-auto" id="inventory-back">Back</button>${star(d, 'icon-btn')}<button type="button" class="icon-btn danger" id="inspect-delete" aria-label="Delete">${icon('trash')}</button><button class="btn primary" id="inspect-equip">${icon('target')}Equip</button>`);
    box.onclick = null;
    $('.code-entry', box).onclick = e => e.target.select();
    $('#inspect-copy', box).onclick = () => copyText(code);
    $('#inspect-equip', box).onclick = () => use(d);
    $('#inventory-back', box).onclick = inventory;
    $('.fav', box).onclick = e => { d.fav = !d.fav; persist(); e.currentTarget.setAttribute('aria-pressed', d.fav); };
    $('#inspect-delete', box).onclick = e => {
      if (!e.currentTarget.classList.contains('armed')) { e.currentTarget.classList.add('armed'); return; }
      remove([d]); inventory();
    };
  }
  function inventory() {
    const panel = modal().open ? $('.main-panel', modal()) : null, top = panel ? [panel.scrollTop, modal().scrollTop] : [0, 0];
    const owned = run ? drops.slice(1) : drops;
    const shown = favoritesFirst(owned.filter(d => !view.tier || d.tier === view.tier));
    view.picked = new Set(shown.filter(d => view.picked.has(d.id)).map(d => d.id));
    const doomed = shown.filter(d => view.picking ? view.picked.has(d.id) : !d.fav);
    const most = Math.max(1, ...TIERS.map(t => owned.filter(d => d.tier === t.id).length));
    const recent = `<h3>Recent</h3><ul class="drop-list">${owned.slice(0, 12).map(dropRow).join('')}</ul>`;
    const rarities = `<h3>Collection</h3>${TIERS.map(t => {
      const have = owned.filter(d => d.tier === t.id).length;
      return `<div class="tier-row" style="${palette(t)}"><span>${t.label}</span><b>${have}</b><span class="tier-bar"><i style="width:${have * 100 / most}%"></i></span></div>`;
    }).join('')}`;
    const chip = (id, label, color) => `<button type="button" class="chip" data-tier="${id}" aria-pressed="${view.tier === id}"${color ? ` style="--rarity:${color}"` : ''}>${label}</button>`;
    const bar = `<div class="inventory-bar"><div class="chips">${chip('', 'All')}${TIERS.map(t => chip(t.id, t.label, t.color)).join('')}</div><div class="bar-actions"><button type="button" class="text-btn" data-pick aria-pressed="${view.picking}">Select</button><button type="button" class="text-btn danger${view.armed ? ' armed' : ''}" data-delete${doomed.length ? '' : ' disabled'}>${icon('trash', 16)}${view.armed ? 'Confirm' : 'Delete'} ${doomed.length || ''}</button></div></div>`;
    const box = dialog('', 'Inventory', `${bar}<div class="item-grid inventory-grid">${shown.map(d => tile(d, view.picking, view.picked.has(d.id))).join('')}</div>`, '', true, [recent, rarities]);
    $('.main-panel', box).scrollTop = top[0]; box.scrollTop = top[1];
    box.onclick = e => {
      const hit = selector => e.target.closest(selector), armed = view.armed;
      const target = hit('[data-equip],[data-fav],[data-tier],[data-pick],[data-delete],[data-drop]');
      view.armed = false;
      if (!target) { if (armed) inventory(); return; }
      const d = byId(target.dataset.equip ?? target.dataset.fav ?? target.dataset.drop);
      if (target.hasAttribute('data-equip')) { if (d) use(d); return; }
      if (target.hasAttribute('data-drop') && d && !view.picking && !e.ctrlKey && !e.metaKey) return inspect(d);
      if (target.hasAttribute('data-fav') && d) { d.fav = !d.fav; persist(); }
      else if (target.hasAttribute('data-tier')) { view.tier = target.dataset.tier; $('.main-panel', box).scrollTop = box.scrollTop = 0; }
      else if (target.hasAttribute('data-pick')) { view.picking = !view.picking; view.picked.clear(); }
      else if (target.hasAttribute('data-delete')) {
        if (armed) { remove(doomed); view.picking = false; view.picked.clear(); } else view.armed = true;
      } else if (d) {
        view.picking = true;
        if (!view.picked.delete(d.id)) view.picked.add(d.id);
      }
      inventory();
    };
  }
  function showResult() {
    if (!result) return idle();
    const t = tierById(result.tier);
    reel.hidden = true; reward.hidden = false;
    reward.style.setProperty('--rarity', t.color);
    reward.innerHTML = `<div class="reward-art">${specimen(result.core, 94)}</div><div class="reward-banner"><h2>${title(result)}</h2><p>${t.label}</p></div>`;
    controls();
  }
  function finish(audible = true) {
    if (!run) return;
    const previous = run; run = null;
    previous.timers.forEach(clearTimeout); previous.animation?.cancel();
    pending = false; persist(); showResult();
    if (audible) { const base = 320 + TIERS.indexOf(tierById(result.tier)) * 90; tone(base, 0.18); tone(base * 1.5, 0.25, 'sine', 0.10); }
    if (auto) next = setTimeout(open, 1300);
  }
  function open() {
    clearTimeout(next);
    if (run) return;
    result = { id: ++serial, ...drawItem() };
    drops.unshift(result); prune(drops, LIMIT);
    pending = true; persist(); badge(); unlockAudio();
    run = { timers: [], animation: null };
    controls();
    if (reduced()) { finish(); return; }
    reward.hidden = true; reel.hidden = false; fill(result);
    const final = offset(REEL.winner, (10 + uniform(81)) / 100);
    track.style.transform = final;
    run.animation = track.animate([{ transform: offset(REEL.start, 0.5) }, { transform: final }], { duration: REEL.duration, easing: REEL.ease, fill: 'both' });
    for (const ms of TICKS) run.timers.push(setTimeout(() => tone(930, 0.028, 'triangle'), ms));
    run.animation.finished.then(() => finish(), () => {});
  }
  actions.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-open')) open();
    else if (b.hasAttribute('data-skip')) finish();
    else if (b.hasAttribute('data-auto')) {
      auto = !auto; clearTimeout(next);
      if (auto && !run) open(); else controls();
    }
    if (b.hasAttribute('data-equip') && result) use(result);
    if (b.hasAttribute('data-copy-drop') && result) copyText(encode(result.core));
  };
  $('#inventory').onclick = () => { Object.assign(view, { tier: '', picking: false, armed: false }); view.picked.clear(); inventory(); };
  modal().addEventListener('close', () => { modal().onclick = null; });
  $('#chance-list').innerHTML = TIERS.map(t => `<div class="chance" style="${palette(t)}"><span class="chance-art" data-sample="${t.id}"></span><span class="chance-row"><span>${t.label}</span><b>${odds(t)}</b></span></div>`).join('');
  const samples = $$('[data-sample]');
  const resample = el => { el.innerHTML = specimen(generate(el.dataset.sample).core, 52); };
  samples.forEach(resample);
  function animate(on) {
    clearInterval(cycle); cycle = 0;
    if (on && !reduced()) cycle = setInterval(() => { if (!document.hidden) resample(samples[turn++ % samples.length]); }, 280);
  }
  badge();
  if (result) { persist(); showResult(); } else idle();
  return {
    activate() { animate(true); },
    deactivate() {
      const was = auto; auto = false; clearTimeout(next);
      if (run) finish(false); else if (was) controls();
      animate(false);
    },
  };
}
