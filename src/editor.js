import { DEFAULT, EXTRA_DEFAULT, GROUPS, MAPS, bounded, clamp, colorChannels, configText, decode, encode, hex, lowerBound, restoreExtras, styleName, visibleFields } from './settings.js';
import { randomCrosshair } from './collection.js';
import { reticle } from './reticle.js';
import { pickColor } from './color.js';
import { $, $$, activeSection, copyText, dialog, icon, load, notice, reduced, scrollToSection, store, tone } from './ui.js';

const num = (value, step) => step === 1 ? String(value) : value.toFixed(2);
const options = (pairs, current) => pairs.map(([v, s]) => `<option value="${v}"${v === current ? ' selected' : ''}>${s}</option>`).join('');
const select = (attrs, opts) => `<span class="select-shell"><select ${attrs}>${opts}</select>${icon('down', 16)}</span>`;
const FIRST = GROUPS[0][0];
export function initEditor() {
  const saved = load('profile', {}), prefs = load('preview', {});
  let core = { ...DEFAULT }, extra = restoreExtras(saved?.extra);
  if (typeof saved?.code === 'string') { try { core = decode(saved.code); } catch { /* Start with Valve defaults. */ } }
  let group = FIRST, mapIndex = MAPS.findIndex(([m]) => m === prefs?.map), zoom = [1, 2, 4].includes(prefs?.zoom) ? prefs.zoom : 1;
  if (mapIndex < 0) mapIndex = 0;
  let active = true, moving = false, firing = false, startFire = 0, endFire = -Infinity, frame = 0, pendingSave = 0;
  let sight = 'primary', gesture = null, query = '', hold = 0, spyFrame = 0;
  const history = [], scroller = $('#settings-scroll'), settings = $('#settings'), aim = $('#aim'), fireArea = $('#fire-area');
  const searchBtn = $('#search-toggle'), searchBox = $('#settings-search');
  function remember() {
    history.push([{ ...core }, { ...extra }]); if (history.length > 40) history.shift();
    $('#undo').disabled = false;
  }
  function save() {
    clearTimeout(pendingSave); pendingSave = 0;
    const ok = store('profile', { code: encode(core), extra });
    $('#save-status').textContent = ok ? 'Saved on this device' : 'Session only';
  }
  window.addEventListener('pagehide', () => { if (pendingSave) save(); });
  function preview(t = performance.now()) {
    cancelAnimationFrame(frame); frame = 0; if (!active) return;
    const still = reduced(), elapsed = Math.max(0, t - startFire);
    const shot = firing ? (still ? 0.8 : 0.55 + 0.45 * Math.exp(-(elapsed % 135) / 65)) : still ? 0 : clamp(1 - (t - endFire) / 210, 0, 1);
    const motion = moving ? (still ? 0.7 : 0.62 + 0.25 * Math.sin(t / 390)) : 0;
    const dx = core.followRecoil && shot && !still && sight === 'primary' ? Math.sin(elapsed / 150) * 5 * shot : 0;
    const dy = core.followRecoil && shot && !still && sight === 'primary' ? -shot * 14 : 0;
    const ink = hex([core.red, core.green, core.blue]);
    if (sight === 'primary') aim.innerHTML = reticle(core, motion, shot);
    else if (sight === 'scope') aim.innerHTML = `<circle r="${2.6 * core.scopeDotScale}" fill="${core.scopeDotUseCrosshairColor ? ink : '#ed4744'}"/>`;
    else {
      const gap = extra.sniperInaccuracy ? Math.round((motion + shot) * 7) : 0;
      aim.innerHTML = `<path d="M-180 0H${-gap}M${gap} 0H180M0 -180V${-gap}M0 ${gap}V180" stroke="#161719" stroke-width="${extra.sniperWidth}"/>`;
    }
    aim.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${zoom})`;
    if (!still && !document.hidden && (moving || firing || shot > 0)) frame = requestAnimationFrame(preview);
  }
  function refreshCode() {
    $('#share-code').value = encode(core); $('#hud-ref').textContent = `REF / ${core.screenHeight}P`;
    $('#hud-ref').setAttribute('aria-label', `Preview setup, reference height ${core.screenHeight} pixels`);
    preview();
  }
  function changed() {
    refreshCode(); clearTimeout(pendingSave); pendingSave = setTimeout(save, 120);
  }
  function selectMap(delta = 0, persist = true) {
    mapIndex = (mapIndex + delta + MAPS.length) % MAPS.length;
    const [id, name] = MAPS[mapIndex], img = $('#map-image');
    img.src = `./assets/maps/${id}.webp`; img.alt = `${name} crosshair preview`;
    $('#map-name').textContent = name; $('#map-id').textContent = `DE_${id.toUpperCase()}`;
    $('#map-count').textContent = `${mapIndex + 1} / ${MAPS.length}`;
    // The frosted page backdrop follows the scene in the preview.
    document.documentElement.style.setProperty('--map', `url("./assets/maps/${id}.webp")`);
    if (persist) store('preview', { map: id, zoom });
  }
  function setZoom(value, persist = true) {
    zoom = value; $$('[data-zoom]').forEach(el => el.setAttribute('aria-pressed', String(+el.dataset.zoom === value)));
    if (persist) store('preview', { map: MAPS[mapIndex][0], zoom });
    preview();
  }
  // One continuous list, as in the game menu. The band tabs jump between its sections.
  const fields = () => GROUPS.flatMap(([id]) => visibleFields(id, core, extra));
  const needle = () => query.trim().toLowerCase();
  function sections() {
    const q = needle();
    return GROUPS.map(([id, short, title]) => {
      const all = visibleFields(id, core, extra), whole = q && `${short} ${title}`.toLowerCase().includes(q);
      return { id, title, rows: !q || whole ? all : all.filter(f => f.label.toLowerCase().includes(q)) };
    }).filter(s => s.rows.length);
  }
  const model = key => Object.hasOwn(core, key) ? core : extra;
  function row(f) {
    const key = f.key, val = model(key)[key], label = f.label, id = `field-${key}`;
    const lbl = `<label for="${id}">${label}</label>`;
    const attr = `id="${id}" data-key="${key}"`;
    if (f.type === 'select' || f.type === 'toggle') {
      return `<div class="setting-row${key === 'style' ? ' style-row' : ''}">${lbl}${select(attr, f.type === 'select' ? options(f.options, val) : options([[1, 'Yes'], [0, 'No']], +val))}</div>`;
    }
    if (f.type === 'color') {
      const keys = colorChannels(key === 'outlineColor'), rgba = keys.map(k => core[k]);
      return `<div class="setting-row">${lbl}<button type="button" class="color-btn" id="${id}" data-color="${key}" aria-label="${label}, ${hex(rgba)}"><i style="--swatch:rgba(${rgba.slice(0, 3)},${rgba[3] / 255})"></i><span>${hex(rgba)}</span>${icon('down', 16)}</button></div>`;
    }
    const min = lowerBound(f, core), percent = clamp((val - min) * 100 / (f.max - min), 0, 100);
    const limits = `min="${min}" max="${f.max}" step="${f.step}"`;
    const enabled = !f.enableKey || extra[f.enableKey];
    return `<div class="setting-row range-row${f.enableKey ? ' grenade-row' : ''}"><div class="range-label">${f.enableKey ? `<input class="enable" type="checkbox" data-enable="${f.enableKey}" aria-label="Enable ${label}" ${enabled ? 'checked' : ''}>` : ''}${lbl}</div><div class="range-pair">
      <input type="range" data-key="${key}" aria-label="${label} slider" ${limits} value="${val}" style="--fill:${percent}%" ${enabled ? '' : 'disabled'}>
      <span class="numeric"><input type="number" ${attr} ${limits} value="${num(val, f.step)}" ${enabled ? '' : 'disabled'}>${f.unit ? `<small>${f.unit}</small>` : ''}</span></div></div>`;
  }
  function mark(id) {
    group = id;
    for (const b of $$('#groups [data-group]')) { if (b.dataset.group === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
  }
  function spy() {
    if (performance.now() < hold) return;
    const current = activeSection(scroller, $$('.set-group', settings));
    if (current && current.dataset.sec !== group) mark(current.dataset.sec);
  }
  function renderSettings(focusKey) {
    const q = needle(), top = scroller.scrollTop;
    let hinted = false;
    settings.innerHTML = sections().map(s => {
      const hint = s.id === FIRST || hinted ? '' : `<p class="cfg-hint">${icon('info', 16)}<span>The rows from here on are not part of a share code. They travel with your <b>Full config .cfg</b> export.</span></p>`;
      hinted ||= Boolean(hint);
      return `<section class="set-group" id="sec-${s.id}" data-sec="${s.id}" aria-labelledby="sec-title-${s.id}"><h2 class="group-title${s.id === FIRST && !q ? ' sr-only' : ''}" id="sec-title-${s.id}" tabindex="-1">${s.title}</h2>${hint}${s.rows.map(row).join('')}</section>`;
    }).join('') || '<p class="no-match" role="status">No settings match <q></q>. Press Esc to clear the search.</p>';
    const echo = $('.no-match q', settings); if (echo) echo.textContent = query.trim();
    scroller.scrollTop = top;
    if (focusKey) document.getElementById(`field-${focusKey}`)?.focus({ preventScroll: true });
    spy();
  }
  function closeSearch() {
    searchBox.hidden = true; searchBox.value = ''; searchBtn.setAttribute('aria-expanded', 'false');
    if (query) { query = ''; scroller.scrollTop = 0; renderSettings(); }
  }
  function openSearch() { searchBox.hidden = false; searchBtn.setAttribute('aria-expanded', 'true'); searchBox.focus(); }
  function setGroup(id, focus = false) {
    gesture = null; if (query) closeSearch();
    const el = document.getElementById(`sec-${id}`);
    hold = performance.now() + (reduced() ? 120 : 700); mark(id);
    scrollToSection(scroller, id === FIRST ? null : el);
    if (focus && el) $('.group-title', el).focus({ preventScroll: true });
  }
  $('#groups').innerHTML = GROUPS.map(([id, title]) => `<button type="button" id="group-${id}" data-group="${id}">${title}</button>`).join('');
  $('#groups').onclick = e => { const el = e.target.closest('[data-group]'); if (el) setGroup(el.dataset.group, true); };
  scroller.addEventListener('scroll', () => { spyFrame ||= requestAnimationFrame(() => { spyFrame = 0; spy(); }); }, { passive: true });
  searchBtn.onclick = () => { if (searchBox.hidden) openSearch(); else closeSearch(); };
  searchBox.oninput = () => { query = searchBox.value; hold = 0; scroller.scrollTop = 0; renderSettings(); };
  searchBox.onkeydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); searchBtn.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); $('select,input,button', settings)?.focus(); }
  };
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || !active || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    if (document.querySelector('dialog[open]') || $('#main').inert || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
    e.preventDefault(); openSearch();
  });
  function assign(key, value, source) {
    const m = model(key); if (m[key] === value) return false;
    if (!source || gesture !== source) remember();
    gesture = source || null; m[key] = value;
    if (key === 'style' && core.style !== 2 && core.gap < 0) core.gap = 0;
    changed(); return true;
  }
  function syncRange(el, final) {
    const f = fields().find(x => x.key === el.dataset.key);
    if (!f || f.type !== 'range') return;
    const min = lowerBound(f, core), v = el.valueAsNumber;
    if (Number.isFinite(v) && (final || (v >= min && v <= f.max))) assign(f.key, bounded(v, min, f.max, f.step), el);
    const val = model(f.key)[f.key];
    for (const peer of $$(`[data-key="${f.key}"]`, settings)) {
      if (peer.type === 'range') { peer.value = val; peer.style.setProperty('--fill', `${clamp((val - min) * 100 / (f.max - min), 0, 100)}%`); }
      else if (peer !== el || final) peer.value = num(val, f.step);
    }
    if (final) gesture = null;
  }
  settings.oninput = e => { if (['range', 'number'].includes(e.target.type)) syncRange(e.target, false); };
  settings.onchange = e => {
    const el = e.target;
    if (['range', 'number'].includes(el.type)) { syncRange(el, true); return; }
    if (el.dataset.enable) {
      assign(el.dataset.enable, el.checked); renderSettings(); $(`[data-enable="${el.dataset.enable}"]`, settings)?.focus({ preventScroll: true }); return;
    }
    const f = fields().find(f => f.key === el.dataset.key);
    if (f) { assign(f.key, f.type === 'toggle' ? Boolean(+el.value) : +el.value); renderSettings(f.key); }
  };
  settings.onclick = e => {
    const el = e.target.closest('[data-color]'); if (!el) return;
    const outline = el.dataset.color === 'outlineColor', keys = colorChannels(outline);
    pickColor(outline ? 'Outline Color and Transparency' : 'Color and Transparency', keys.map(k => core[k]), values => {
      if (keys.some((k, i) => core[k] !== values[i])) { remember(); keys.forEach((k, i) => { core[k] = values[i]; }); changed(); }
      renderSettings(el.dataset.color);
    });
  };
  function replace(nextCore, nextExtra = extra) {
    remember(); gesture = null; core = { ...nextCore }; extra = { ...nextExtra };
    renderSettings(); changed();
  }
  $('#random').onclick = () => { replace(randomCrosshair(core.screenHeight)); setGroup(FIRST); tone(730); notice(`Randomized · ${styleName(core.style)}`); };
  $('#reset').onclick = () => { replace(DEFAULT, EXTRA_DEFAULT); notice('Game defaults restored'); };
  $('#undo').onclick = () => { if (!history.length) return; [core, extra] = history.pop(); gesture = null; $('#undo').disabled = !history.length; renderSettings(); changed(); notice('Change undone'); };
  $('#copy').onclick = () => copyText(encode(core));
  $('#share-code').onclick = e => e.target.select();
  $('#download').onclick = () => {
    const blob = new Blob([configText(core, extra)], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'xhairgen.cfg'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Full config exported');
  };
  $('#import').onclick = () => {
    const code = encode(core);
    const d = dialog('Crosshair / Scopes', 'Share or Import', `<label class="stack-label" for="share-current">Your crosshair code</label><div class="code-row"><input id="share-current" class="entry code-entry" readonly spellcheck="false" value="${code}"><button type="button" class="btn secondary compact" id="share-copy">${icon('copy', 15)}<span>Copy code</span></button></div><form id="import-form"><label class="stack-label spaced" for="import-input">Import a code</label><input id="import-input" class="entry code-entry" autocomplete="off" spellcheck="false" placeholder="CS…" maxlength="100" required><p class="form-note">Copy a code from Share or Import in the CS2 Crosshair/Scopes menu.</p><p class="error" role="alert" id="import-error"></p></form>`, '<button class="btn secondary" data-close>Cancel</button><button type="submit" form="import-form" class="btn primary">Import code</button>');
    $('#import-input', d).focus();
    $('#share-current', d).onclick = e => e.target.select();
    $('#share-copy', d).onclick = async e => { const label = $('span', e.currentTarget); if (await copyText(code)) label.textContent = 'Copied'; };
    $('#import-form', d).onsubmit = e => {
      e.preventDefault(); let next;
      try { next = decode($('#import-input', d).value); }
      catch (err) { $('#import-error', d).textContent = err.message; return; }
      replace(next); setGroup(FIRST); d.close(); notice('Crosshair imported');
    };
  };
  $('#hud-ref').onclick = () => {
    const d = dialog('Live preview', 'Preview setup', `<form id="preview-form"><label class="stack-label" for="sight">Sight</label>${select('id="sight" class="wide-select"', options([['primary', 'Primary crosshair'], ['scope', 'Scoped rifle dot'], ['sniper', 'Sniper scope']], sight))}<label class="stack-label spaced" for="ref-height">Reference screen height (px)</label><input class="entry" type="number" id="ref-height" min="240" max="65535" step="1" required value="${core.screenHeight}"><p class="form-note">Use the vertical resolution you play at. CS2 stores it in the code and scales your reticle at other resolutions. At 1×, one reference pixel is one preview pixel.</p></form>`, '<button class="btn secondary" data-close>Cancel</button><button class="btn primary" type="submit" form="preview-form">Apply</button>');
    $('#preview-form', d).onsubmit = e => { e.preventDefault(); sight = $('#sight', d).value; assign('screenHeight', +$('#ref-height', d).value); $('#viewport').classList.toggle('scoped', sight !== 'primary'); d.close(); preview(); };
  };
  $('#prev-map').onclick = () => selectMap(-1); $('#next-map').onclick = () => selectMap(1);
  $$('[data-zoom]').forEach(el => { el.onclick = () => setZoom(+el.dataset.zoom); });
  $('#movement').onclick = e => {
    const b = e.currentTarget; moving = !moving;
    b.setAttribute('aria-pressed', String(moving)); $('[data-state]', b).textContent = moving ? 'Stop' : 'Start'; preview();
  };
  function fire(on) {
    if (firing === on) return;
    firing = on; if (on) startFire = performance.now(); else endFire = performance.now(); preview();
  }
  fireArea.onpointerdown = e => { if (e.button === 0) { fireArea.setPointerCapture(e.pointerId); fire(true); } };
  fireArea.onpointerup = fireArea.onpointercancel = fireArea.onlostpointercapture = () => fire(false);
  fireArea.onkeydown = e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); fire(true); } };
  fireArea.onkeyup = e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); fire(false); } };
  fireArea.onblur = () => fire(false);
  document.addEventListener('visibilitychange', () => { if (document.hidden) fire(false); preview(); });
  selectMap(0, false); setZoom(zoom, false); renderSettings(); mark(FIRST); refreshCode();
  return {
    equip(c) { sight = 'primary'; $('#viewport').classList.remove('scoped'); replace(c); setGroup(FIRST); },
    activate(on) { active = on; if (!on) { fire(false); cancelAnimationFrame(frame); } else { preview(); hold = 0; spy(); } },
  };
}
