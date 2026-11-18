// Immersive in-game HUD preview.
// Moves the live #viewport (map image, fire area and reticle rendered by editor.js) into a
// full-window modal layer and draws a simulated spectator HUD around it. Nothing here renders
// the crosshair: zoom, recoil, movement and style stay owned by the editor.
// All match data below is invented locally. No real players, no network, no screenshots.

const FLAG = 'xlabHud';
const SHOT_MS = 135; // Same cadence the editor uses for its firing pulse.
const byId = id => document.getElementById(id);
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = n => Math.floor(Math.random() * n);
const pick = list => list[rand(list.length)];
const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const hash = text => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const GUN = '<svg class="hud-gun" viewBox="0 0 48 16" aria-hidden="true"><path d="M1 6h6l2-2h17V3h3v1h9v2h9v2h-9v1h-7l-1 2h-4l-2 5h-4l1-5h-9l-2 4H6l1-5H1z"/></svg>';
const SKULL = '<svg class="hud-skull" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3ZM7.4 11.6a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Zm5.4 0a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Z"/></svg>';
const SHIELD = '<svg viewBox="0 0 32 36" aria-hidden="true"><path d="M16 2 4 6v11c0 8 5 13 12 17 7-4 12-9 12-17V6z"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg>';

// team, callsign, weapon, magazine, reserve, health, armour, money, radar position, callout, avatar hue
const SEED = [
  ['ct', 'Halcyon', 'FAMAS', 25, 90, 100, 100, 1850, [20, 24], 'B Site', 188],
  ['ct', 'Brisk', 'MP9', 30, 120, 74, 100, 950, [80, 24], 'A Site', 24],
  ['ct', 'Onyx', 'AUG', 30, 90, 100, 100, 5450, [48, 14], 'CT Spawn', 262],
  ['ct', 'Marlow', 'M4A1-S', 20, 80, 51, 100, 3400, [70, 61], 'Connector', 322],
  ['ct', 'Vesper', 'M4A4', 30, 90, 68, 92, 8650, [50, 48], 'Mid', 52],
  ['t', 'Kestrel', 'AK-47', 30, 90, 100, 100, 4100, [17, 66], 'B Tunnel', 12],
  ['t', 'Dune', 'Galil AR', 35, 90, 88, 100, 2250, [50, 74], 'Lower Mid', 140],
  ['t', 'Sable', 'MAC-10', 30, 100, 100, 0, 700, [83, 70], 'A Long', 288],
  ['t', 'Rook', 'SG 553', 30, 90, 100, 100, 6300, [44, 87], 'T Spawn', 206],
  ['t', 'Tallow', 'AK-47', 30, 90, 62, 100, 3050, [77, 86], 'Outside Long', 84],
];
const RADIO = [['Smoke!', 'smoke'], ['Flashbang!', 'flash'], ['HE Grenade!', 'he'], ['Incendiary!', 'fire']];
// Original abstract three-lane layout on a 100×100 grid. It is not any real map's radar; the
// current map name only picks one of eight mirrored/rotated variants.
const FLOOR = [
  [34, 82, 32, 10], [12, 82, 22, 8], [12, 40, 10, 42], [8, 14, 26, 26], [45, 36, 10, 46], [34, 26, 32, 10],
  [66, 82, 22, 8], [78, 44, 10, 38], [66, 12, 26, 32], [38, 8, 24, 12], [34, 16, 4, 6], [62, 14, 4, 6],
  [47, 20, 6, 6], [22, 52, 23, 7], [55, 58, 23, 7],
];
const SITES = [['A', [70, 17, 18, 16]], ['B', [12, 18, 18, 16]]];
const SPAWNS = [['ct', [40, 9, 20, 9]], ['t', [38, 84, 24, 7]]];
const SYM = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0], [-1, 0, 0, 1], [1, 0, 0, -1], [0, 1, 1, 0], [0, -1, -1, 0]];
const turn = (m, [x, y]) => [50 + m[0] * (x - 50) + m[1] * (y - 50), 50 + m[2] * (x - 50) + m[3] * (y - 50)];

let api = null;

export function initPreviewHud() {
  if (api) return api;
  const viewport = byId('viewport'), fireArea = byId('fire-area'), aim = byId('aim'), mapImage = byId('map-image');
  const toggleEl = () => byId('hud-toggle');
  if (!viewport || !fireArea || !aim || !mapImage || typeof HTMLDialogElement !== 'function' || !HTMLDialogElement.prototype.showModal) {
    const t = toggleEl(); if (t) t.hidden = true;
    return null;
  }

  const roster = SEED.map(([team, name, weapon, mag, cap, hp, armor, money, pos, zone, hue]) =>
    ({ team, name, weapon, mag, cap, hp, armor, money, pos, zone, hue, ammo: mag, reserve: cap, alive: true, shots: 0 }));
  let watched = 4, seconds = 89, score = { ct: 4, t: 2 }, round = 7, pause = 0, ticks = 0;
  let feed = [], chat = [];
  let isOpen = false, stage = null, ui = {}, slots = [], placeholder = null, concealed = [];
  let opener = null, scrollPos = [0, 0], session = null, watcher = null;
  let firing = false, fireTimer = 0, reloadTimer = 0, simTimer = 0;
  const me = () => roster[watched];
  const side = team => team === 'ct' ? 'Counter-Terrorist' : 'Terrorist';
  const flagged = state => Boolean(state && typeof state === 'object' && state[FLAG]);
  const mapLabel = () => (byId('map-name')?.textContent || '').trim() || 'Preview map';

  function build() {
    if (stage) return;
    stage = document.createElement('dialog');
    stage.id = 'hud-stage'; stage.className = 'hud-stage';
    stage.setAttribute('aria-label', 'In-game HUD preview, simulated match');
    const slot = (p, i) => `<li><button type="button" class="hud-player" data-player="${i}" aria-pressed="false">
      <span class="hp-name">${p.name}</span><span class="hud-ava" style="--h:${p.hue}"><b>${p.name[0]}</b>${SKULL}</span>
      <span class="hp-bar"><i></i><b></b></span><span class="hp-money"></span>${GUN}</button></li>`;
    const team = t => roster.map((p, i) => p.team === t ? slot(p, i) : '').join('');
    stage.innerHTML = `<div class="hud-layer">
      <button type="button" class="hud-close" data-act="close" aria-label="Close HUD preview">${CLOSE}<kbd>Esc</kbd></button>
      <p class="hud-mode"><b>HUD preview</b><span>Simulated match</span></p>
      <div class="hud-radar"><svg viewBox="0 0 100 100" role="img" data-hud="radar"></svg>
        <p class="hud-callout"><strong data-hud="callout"></strong><span data-hud="map"></span></p></div>
      <div class="hud-score">
        <ol class="hud-team ct" aria-label="Counter-Terrorists, simulated">${team('ct')}</ol>
        <div class="hud-clock"><time data-hud="time"></time><p class="hud-rounds"><b class="ct" data-hud="score-ct"></b><b class="t" data-hud="score-t"></b></p>
          <p class="hud-alive"><span data-hud="alive-ct"></span><span data-hud="alive-t"></span></p></div>
        <ol class="hud-team t" aria-label="Terrorists, simulated">${team('t')}</ol>
      </div>
      <div class="hud-banner" data-hud="banner" hidden><strong></strong><span></span></div>
      <ul class="hud-feed" data-hud="feed" aria-hidden="true"></ul>
      <div class="hud-bottom">
        <div class="hud-left"><ul class="hud-chat" data-hud="chat" aria-hidden="true"></ul><p class="hud-money" data-hud="money"></p></div>
        <div class="hud-center">
          <div class="hud-status">
            <div class="hud-vitals"><span class="hud-armor">${SHIELD}<b data-hud="armor"></b></span>
              <span class="hud-health"><b data-hud="health"></b><i><u data-hud="health-bar"></u></i></span></div>
            <div class="hud-plate"><p class="hud-who"><strong data-hud="name"></strong><span>Shots <b data-hud="shots"></b></span></p>
              <span class="hud-face" data-hud="face"><small>SIM</small><b></b></span>
              <p class="hud-weapon"><strong data-hud="weapon"></strong><span>Practice ammo</span></p></div>
            <div class="hud-ammo"><span class="hud-mag"><b data-hud="ammo"></b><i><u></u></i></span><span class="hud-reserve" data-hud="reserve"></span>
              <em>Reloading</em></div>
          </div>
          <div class="hud-keys" role="group" aria-label="Preview controls">
            <span class="hud-hint"><kbd>Mouse1</kbd><kbd>Space</kbd>Fire</span>
            <button type="button" data-act="reload"><kbd>R</kbd><span>Reload</span></button>
            <button type="button" data-act="move" aria-pressed="false"><kbd>M</kbd><span>Movement</span></button>
            <button type="button" data-act="zoom"><kbd>Z</kbd><span data-hud="zoom">Zoom</span></button>
            <span class="hud-pair" data-hud="map-pair"><button type="button" data-act="map-prev" aria-label="Previous map"><kbd>←</kbd><i>‹</i></button><span>Map</span><button type="button" data-act="map-next" aria-label="Next map"><kbd>→</kbd><i>›</i></button></span>
            <span class="hud-pair"><button type="button" data-act="player-prev" aria-label="Previous player"><kbd>Q</kbd><i>‹</i></button><span>Player</span><button type="button" data-act="player-next" aria-label="Next player"><kbd>E</kbd><i>›</i></button></span>
            <span class="hud-hint"><kbd>Esc</kbd>Close</span>
          </div>
        </div>
        <div class="hud-right" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <p class="hud-sr" role="status" aria-live="polite" data-hud="say"></p>
    </div>`;
    for (const el of stage.querySelectorAll('[data-hud]')) ui[el.dataset.hud] = el;
    slots = [...stage.querySelectorAll('[data-player]')].sort((a, b) => a.dataset.player - b.dataset.player);
    document.body.append(stage);

    stage.addEventListener('cancel', e => { e.preventDefault(); close(); });
    stage.addEventListener('close', () => close());
    stage.addEventListener('contextmenu', e => { if (e.target === fireArea) e.preventDefault(); });
    stage.addEventListener('click', e => {
      const player = e.target.closest('[data-player]'), act = e.target.closest('[data-act]');
      if (player) watch(+player.dataset.player); else if (act) run(act.dataset.act); else return;
      // After a pointer click hand focus back to the range so Space/Enter keep firing.
      if (e.detail && isOpen) fireArea.focus({ preventScroll: true });
    });
    // Block trigger input while the magazine is being swapped (capture runs before editor.js).
    const gate = e => {
      if (reloadTimer && e.target === fireArea && (e.type === 'pointerdown' || e.key === ' ' || e.key === 'Enter')) { e.stopImmediatePropagation(); e.preventDefault(); }
    };
    stage.addEventListener('pointerdown', gate, true); stage.addEventListener('keydown', gate, true);
    stage.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea')) return;
      const act = { r: 'reload', m: 'move', z: 'zoom', q: 'player-prev', e: 'player-next', arrowleft: 'map-prev', arrowright: 'map-next' }[e.key.toLowerCase()];
      if (!act || (e.repeat && !act.startsWith('player') && !act.startsWith('map'))) return;
      e.preventDefault(); run(act);
    });
  }

  const say = text => { ui.say.textContent = ''; ui.say.textContent = text; };
  const proxy = id => { const el = byId(id); return el && !stage.contains(el) ? el : null; };
  const zoomButtons = () => [...document.querySelectorAll('[data-zoom]')].filter(b => !stage.contains(b));
  function syncControls() {
    const move = proxy('movement'), zooms = zoomButtons(), moveBtn = stage.querySelector('[data-act="move"]');
    moveBtn.hidden = !move; if (move) moveBtn.setAttribute('aria-pressed', String(move.getAttribute('aria-pressed') === 'true'));
    const current = zooms.find(b => b.getAttribute('aria-pressed') === 'true');
    stage.querySelector('[data-act="zoom"]').hidden = !zooms.length;
    ui.zoom.textContent = `Zoom ${current ? current.dataset.zoom : 1}×`;
    ui['map-pair'].hidden = !(proxy('prev-map') && proxy('next-map'));
  }
  function run(act) {
    if (act === 'close') return close();
    if (act === 'reload') return reload();
    if (act === 'player-prev' || act === 'player-next') {
      const step = act === 'player-next' ? 1 : -1;
      for (let i = 1; i <= roster.length; i++) {
        const next = (watched + step * i + roster.length * i) % roster.length;
        if (roster[next].alive) return watch(next);
      }
      return;
    }
    if (act === 'move') { proxy('movement')?.click(); syncControls(); say(`Movement ${stage.querySelector('[data-act="move"]').getAttribute('aria-pressed') === 'true' ? 'on' : 'off'}`); return; }
    if (act === 'zoom') {
      const zooms = zoomButtons(); if (!zooms.length) return;
      zooms[(zooms.findIndex(b => b.getAttribute('aria-pressed') === 'true') + 1) % zooms.length].click();
      syncControls(); say(ui.zoom.textContent); return;
    }
    if (act === 'map-prev') proxy('prev-map')?.click();
    if (act === 'map-next') proxy('next-map')?.click();
  }

  /* Rendering */
  function drawRadar() {
    const label = mapLabel(), m = SYM[hash(label) % SYM.length], p = me();
    const box = ([x, y, w, h], cls) => {
      const [ax, ay] = turn(m, [x, y]), [bx, by] = turn(m, [x + w, y + h]);
      return `<rect class="${cls}" x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}"/>`;
    };
    let out = FLOOR.map(r => box(r, 'rf')).join('') + SPAWNS.map(([t, r]) => box(r, `rs ${t}`)).join('');
    for (const [name, r] of SITES) {
      const [cx, cy] = turn(m, [r[0] + r[2] / 2, r[1] + r[3] / 2]);
      out += `${box(r, 'site')}<text x="${cx}" y="${cy + 3.4}" text-anchor="middle">${name}</text>`;
    }
    const face = (p.team === 'ct' ? 90 : 270) * Math.PI / 180;
    const cone = [p.pos, ...[-0.5, 0.5].map(d => [p.pos[0] + 19 * Math.cos(face + d), p.pos[1] + 19 * Math.sin(face + d)])].map(pt => turn(m, pt).map(n => n.toFixed(1)).join(',')).join(' ');
    out += `<polygon class="cone" points="${cone}"/>`;
    roster.forEach((q, i) => {
      const [x, y] = turn(m, q.pos);
      if (!q.alive) out += `<path class="gone ${q.team}" d="M${x - 1.6} ${y - 1.6}l3.2 3.2m0-3.2-3.2 3.2"/>`;
      else out += `<circle class="dot ${q.team}${i === watched ? ' me' : ''}" cx="${x}" cy="${y}" r="${i === watched ? 2.9 : 2.3}"/>`;
    });
    ui.radar.innerHTML = out;
    ui.radar.setAttribute('aria-label', `Simulated radar for ${label}. Watching ${p.name} at ${p.zone}.`);
    ui.callout.textContent = p.zone; ui.map.textContent = `${label} · simulated`;
  }
  function renderSlots() {
    roster.forEach((p, i) => {
      const b = slots[i];
      b.classList.toggle('is-dead', !p.alive);
      b.setAttribute('aria-pressed', String(i === watched)); b.setAttribute('aria-disabled', String(!p.alive));
      b.setAttribute('aria-label', p.alive ? `Watch ${p.name}, ${side(p.team)}, ${p.hp} health` : `${p.name}, ${side(p.team)}, eliminated`);
      b.querySelector('.hp-bar i').style.width = `${p.hp}%`; b.querySelector('.hp-bar b').textContent = p.alive ? p.hp : '';
      b.querySelector('.hp-money').textContent = `$${p.money}`;
    });
    for (const t of ['ct', 't']) ui[`alive-${t}`].textContent = roster.filter(p => p.team === t && p.alive).length;
  }
  function renderClock() {
    ui.time.textContent = clock(Math.max(0, seconds)); ui.time.classList.toggle('is-low', seconds <= 10);
    ui['score-ct'].textContent = score.ct; ui['score-t'].textContent = score.t;
  }
  function renderAmmo() {
    const p = me();
    ui.ammo.textContent = p.ammo; ui.reserve.textContent = p.reserve; ui.shots.textContent = p.shots;
    stage.classList.toggle('is-low-ammo', p.ammo <= Math.ceil(p.mag / 5));
  }
  function renderStatus() {
    const p = me();
    stage.dataset.team = p.team;
    ui.armor.textContent = p.armor; ui.health.textContent = p.hp; ui['health-bar'].style.width = `${p.hp}%`;
    ui.health.parentElement.classList.toggle('is-low', p.hp < 30);
    ui.name.textContent = p.name; ui.weapon.textContent = p.weapon; ui.money.textContent = `$${p.money}`;
    ui.face.style.setProperty('--h', p.hue); ui.face.querySelector('b').textContent = p.name[0];
    renderAmmo();
  }
  const tag = p => `<b class="${p.team}">${p.name}</b>`;
  function renderFeed() {
    ui.feed.innerHTML = feed.map(f => `<li>${tag(f.killer)}${GUN}${SKULL}${tag(f.victim)}</li>`).join('');
    ui.chat.innerHTML = chat.map(c => `<li><b class="${c.p.team}">[${c.p.team.toUpperCase()}] ● ${c.p.name}</b><i>@${c.p.zone}</i>: <u class="${c.kind}">${c.text}</u></li>`).join('');
  }
  function renderAll() { renderSlots(); renderClock(); renderStatus(); renderFeed(); drawRadar(); syncControls(); }

  /* Local simulation: a looping, invented round. The watched player is never a casualty. */
  function tick() {
    if (document.hidden) return;
    ticks++;
    if (pause) { if (--pause === 0) newRound(); return; }
    feed = feed.filter(f => ticks - f.at < 7); chat = chat.filter(c => ticks - c.at < 10);
    if (--seconds <= 0) { endRound(); return; }
    const roll = Math.random();
    if (roll < 0.1) duel(); else if (roll < 0.22) radio();
    renderClock(); renderFeed();
  }
  function duel() {
    const free = roster.filter((p, i) => p.alive && i !== watched), killer = pick(free);
    if (!killer) return;
    const targets = free.filter(p => p.team !== killer.team);
    if (!targets.length || roster.filter(p => p.alive && p.team !== killer.team).length <= 2) return;
    const victim = pick(targets);
    victim.alive = false; victim.hp = 0;
    killer.hp = Math.max(9, killer.hp - rand(46)); killer.money += 300;
    feed = [...feed, { killer, victim, at: ticks }].slice(-4);
    renderSlots(); drawRadar();
  }
  function radio() {
    const [text, kind] = pick(RADIO), p = pick(roster.filter(q => q.alive && q.team === me().team));
    chat = [...chat, { p, text, kind, at: ticks }].slice(-3);
  }
  function endRound() {
    const winner = Math.random() < 0.5 ? 'ct' : 't';
    score[winner]++; pause = 4; seconds = 0;
    const b = ui.banner;
    b.dataset.side = winner; b.hidden = false;
    b.querySelector('strong').textContent = winner === me().team ? 'Round won' : 'Round lost';
    b.querySelector('span').textContent = `Simulated round ${round} · ${side(winner)}s take it`;
    renderClock();
  }
  function newRound() {
    if (score.ct >= 13 || score.t >= 13) { score = { ct: 0, t: 0 }; round = 0; }
    round++; seconds = 115; feed = []; chat = [];
    for (const p of roster) { p.alive = true; p.hp = 100; p.armor = 100; p.ammo = p.mag; p.reserve = p.cap; p.money = Math.min(16000, p.money + 1400 + rand(5) * 450); }
    endReload(); ui.banner.hidden = true; renderAll();
  }
  function watch(index) {
    const p = roster[index];
    if (!p || !p.alive || index === watched) return;
    releaseFire(); endReload(); watched = index;
    renderSlots(); renderStatus(); drawRadar();
    say(`Watching ${p.name}, ${side(p.team)}, ${p.weapon}`);
  }

  /* Test fire: mirrors the editor's trigger so ammo, the shot counter and view punch follow real input. */
  function shot() {
    const p = me();
    if (p.ammo <= 0) return reload();
    p.ammo--; p.shots++; renderAmmo();
    if (!still()) ui.ammo.animate?.([{ transform: 'translateY(-.07em) scale(1.1)' }, { transform: 'none' }], { duration: 110, easing: 'ease-out' });
    if (p.ammo === 0) reload();
  }
  function startFire() {
    if (firing || reloadTimer || !isOpen) return;
    firing = true; stage.classList.add('is-firing'); shot();
    if (firing) fireTimer = setInterval(shot, SHOT_MS);
  }
  function stopFire() {
    firing = false; clearInterval(fireTimer); fireTimer = 0; stage?.classList.remove('is-firing');
  }
  function releaseFire() {
    // Tell editor.js the trigger was let go (its own pointercancel handler ends the recoil pulse).
    if (firing) fireArea.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    stopFire();
  }
  function endReload() { clearTimeout(reloadTimer); reloadTimer = 0; stage?.classList.remove('is-reloading'); }
  function reload() {
    const p = me();
    if (reloadTimer || p.ammo >= p.mag) return;
    releaseFire(); stage.classList.add('is-reloading'); say('Reloading');
    reloadTimer = setTimeout(() => {
      const need = p.mag - p.ammo;
      if (p.reserve < need) p.reserve = p.cap; // Practice range: the reserve never runs dry.
      p.reserve -= need; p.ammo = p.mag; endReload(); renderAmmo(); say(`${p.weapon} loaded, ${p.ammo} rounds`);
    }, still() ? 500 : 1500);
  }

  /* Open / close */
  function open({ fromHistory = false } = {}) {
    if (isOpen) return true;
    if (!viewport.isConnected || !viewport.getClientRects().length) return false;
    build();
    const active = document.activeElement;
    opener = active instanceof HTMLElement && active !== document.body ? active : toggleEl();
    scrollPos = [window.scrollX, window.scrollY];
    // Hold the editor layout open while the real viewport is away.
    placeholder = document.createElement('div'); placeholder.className = 'hud-placeholder'; placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.height = `${viewport.getBoundingClientRect().height}px`;
    viewport.before(placeholder);
    // Hide the editor's own overlay chrome so no invisible control can be hit or focused.
    const core = [mapImage, fireArea, aim];
    concealed = [...viewport.children].filter(c => !core.some(n => c === n || c.contains(n)) && !(c.classList.contains('view-shade') && viewport.classList.contains('scoped')));
    for (const c of concealed) c.setAttribute('data-hud-hidden', '');
    stage.prepend(viewport);
    document.documentElement.classList.add('hud-lock');
    isOpen = true;
    try { stage.showModal(); } catch { isOpen = false; restore(); return false; }

    session = new AbortController();
    const on = (target, type, fn, capture = false) => target.addEventListener(type, fn, { signal: session.signal, capture });
    on(fireArea, 'pointerdown', e => { if (e.button === 0) startFire(); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) on(fireArea, type, stopFire);
    on(fireArea, 'keydown', e => { if (e.key === ' ' || e.key === 'Enter') startFire(); });
    on(fireArea, 'keyup', e => { if (e.key === ' ' || e.key === 'Enter') stopFire(); });
    on(document, 'visibilitychange', () => { if (document.hidden) stopFire(); });
    on(window, 'hashchange', () => close({ fromHistory: true }));
    const nameNode = byId('map-name');
    if (nameNode) { watcher = new MutationObserver(() => { drawRadar(); say(`Map: ${mapLabel()}`); }); watcher.observe(nameNode, { childList: true, characterData: true, subtree: true }); }
    simTimer = setInterval(tick, 1000);

    renderAll();
    toggleEl()?.setAttribute('aria-expanded', 'true');
    fireArea.focus({ preventScroll: true });
    say(`HUD preview on ${mapLabel()}. Simulated match. Hold Space or the mouse to fire, Escape to close.`);
    if (!fromHistory && !flagged(history.state)) {
      try { history.pushState({ ...(history.state && typeof history.state === 'object' ? history.state : {}), [FLAG]: true }, ''); } catch { /* History is optional. */ }
    }
    document.dispatchEvent(new CustomEvent('hud:open'));
    return true;
  }
  function restore() {
    if (placeholder?.isConnected) placeholder.replaceWith(viewport);
    placeholder = null;
    for (const c of concealed) c.removeAttribute('data-hud-hidden');
    concealed = [];
    document.documentElement.classList.remove('hud-lock');
    window.scrollTo(scrollPos[0], scrollPos[1]);
  }
  function close({ fromHistory = false } = {}) {
    if (!isOpen) return;
    isOpen = false;
    releaseFire(); endReload(); clearInterval(simTimer); simTimer = 0;
    session?.abort(); session = null; watcher?.disconnect(); watcher = null;
    if (stage.open) stage.close();
    restore();
    const toggle = toggleEl(), target = opener?.isConnected && opener.getClientRects().length ? opener : toggle;
    toggle?.setAttribute('aria-expanded', 'false');
    target?.focus({ preventScroll: true }); opener = null;
    document.dispatchEvent(new CustomEvent('hud:close'));
    if (!fromHistory && flagged(history.state)) history.back();
  }

  // A reload must not restore into the overlay: drop a stale marker left on this history entry.
  if (flagged(history.state)) { try { const { [FLAG]: _, ...rest } = history.state; history.replaceState(rest, ''); } catch { /* History is optional. */ } }
  window.addEventListener('popstate', e => {
    if (!flagged(e.state)) close({ fromHistory: true });
    else if (!isOpen && !document.querySelector('dialog[open]')) open({ fromHistory: true });
  });
  window.addEventListener('pagehide', () => { if (isOpen) { releaseFire(); } });
  document.addEventListener('click', e => {
    const t = e.target instanceof Element && e.target.closest('#hud-toggle');
    if (!t || t.disabled) return;
    e.preventDefault(); if (isOpen) close(); else open();
  });
  const t = toggleEl();
  if (t) { t.setAttribute('aria-haspopup', 'dialog'); t.setAttribute('aria-expanded', 'false'); }

  api = { open: () => open(), close: () => close(), toggle: () => (isOpen ? close() : open()), isOpen: () => isOpen };
  return api;
}
