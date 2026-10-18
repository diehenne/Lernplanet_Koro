import { AREAS, areaById, DOG_STATION, WALL_STATION, HALF, X0, X1, Z0, Z1, CELL, HUB_SPAWN, biomeAt, areaStations, AREA_STATION, portalStations, extraStations, heightAt, villageOf } from './core/layout';
import { balance } from './core/money';
import { rewardChips } from './ui/coins';
import { itemById } from './core/shop';
import { runDash } from './ui/dash';
import { createProfile, deleteProfile, exportProfiles, importProfiles, loadProfiles, saveProfiles } from './core/storage';
import { MAX_LEVEL, MAX_STARS, OPS, type Op, type Profile } from './core/types';
import { createInput, type Cmd } from './game/input';
import { runRound, type RoundResult, type Variant } from './game/minigames/round';
import { World, type ActionKind } from './game/world';
import { avatars, de } from './i18n/de';
import { openChest, openInventory } from './ui/inventory';
import { sfx } from './ui/sfx';
import { musicOn, setMusic, setTheme, sfxLoss, startMusic, type Theme } from './ui/music';
import { setSpeech, speak, speechOn } from './ui/speech';
import { openTrade } from './ui/trade';
import { openTalk } from './ui/riddle';
import { runEnglishRound, speakEnglish } from './ui/english';
import { areaLevel } from './core/riddles';
import { runSudoku } from './ui/sudoku';
import { runWall } from './ui/wall';
import type { RiddleKind } from './core/riddles';
import { ENGLISH_KINDS } from './core/riddles';

const ui = document.getElementById('ui')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;

ui.innerHTML = `<div id="screen"></div><div id="overlay"></div><div id="toast" class="hidden"></div><div id="hurt"></div><canvas id="minimap" width="120" height="120"></canvas>
  <div id="joystick"><div class="knob"></div></div>`;
const screen = document.getElementById('screen')!;
const overlay = document.getElementById('overlay')!;
const toastEl = document.getElementById('toast')!;
const GEM = '<span class="gem"></span>';

const input = createInput(document.getElementById('joystick')!);
const world = new World(canvas, input);
input.onCommand = (c) => world.command(c);
const profiles: Profile[] = loadProfiles();
let current: Profile | null = null;
let region: Op = 'add';
let inGame = false;
const save = () => saveProfiles(profiles);

const TOOLS = ['shovel', 'axe', 'sword'];
const ACTION_ICON: Record<Exclude<ActionKind, null>, string> = { place: '📍', open: '🧰', sword: '🗡️', axe: '🪓', shovel: '⛏️', talk: '💬' };

let toastTimer: number | undefined;
function toast(text: string): void {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.add('hidden'), 2600);
}

const modalOpen = (): boolean => !!overlay.querySelector('.panel:not(.speech)');

function showStart(): void {
  inGame = false;
  world.paused = true;
  overlay.innerHTML = '';
  const cards = profiles
    .map(
      (p, i) => `<div class="save"><button class="avatar" data-i="${i}" title="${p.name}">${p.avatar}<br><small>${p.name}</small>
        <small class="meta">⭐ ${p.stars} · ${GEM} ${balance(p)}</small></button>
        <button class="alt del" data-i="${i}" title="${de.save.delete}">🗑️</button></div>`,
    )
    .join('');
  screen.innerHTML = `<div class="panel center"><h1>🌳 ${de.title}</h1><p>${de.subtitle}</p>
    <h2>${de.whoPlays}</h2><div class="saves">${cards}</div><button class="alt" id="new">➕ ${de.newPlayer}</button>
    <p class="files"><button class="alt" id="export">💾 ${de.save.export}</button> <button class="alt" id="import">📂 ${de.save.import}</button>
    <input type="file" id="file" accept="application/json,.json" hidden /></p><p class="hint">${de.save.auto}</p></div>`;
  screen.querySelectorAll<HTMLElement>('button.avatar').forEach((b) =>
    b.addEventListener('click', () => selectProfile(profiles[Number(b.dataset.i)])),
  );
  screen.querySelectorAll<HTMLElement>('button.del').forEach((b) =>
    b.addEventListener('click', () => confirmDelete(profiles[Number(b.dataset.i)])),
  );
  document.getElementById('new')!.addEventListener('click', showNewPlayer);
  document.getElementById('export')!.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportProfiles(profiles)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `koro-spielstaende.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(de.save.exported);
  });
  const file = document.getElementById('file') as HTMLInputElement;
  document.getElementById('import')!.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    try {
      const n = importProfiles(profiles, await file.files![0].text());
      toast(de.save.imported(n));
      showStart();
    } catch {
      toast(de.save.badFile);
    }
  });
}

function confirmDelete(p: Profile): void {
  screen.innerHTML = `<div class="panel center"><h2>🗑️ ${de.save.confirm(p.name)}</h2><p>${de.save.confirmText}</p>
    <div><button class="alt" id="no">${de.back}</button><button id="yes" class="danger">${de.save.delete}</button></div></div>`;
  document.getElementById('no')!.addEventListener('click', showStart);
  document.getElementById('yes')!.addEventListener('click', () => {
    deleteProfile(profiles, p.id);
    showStart();
  });
}

function selectProfile(p: Profile): void {
  current = p;
  world.setProfile(p);
  showRegions();
}

function showNewPlayer(): void {
  let avatar = avatars[0];
  screen.innerHTML = `<div class="panel center"><h2>${de.pickAvatar}</h2>
    <div id="av">${avatars.map((a, i) => `<button class="avatar ${i === 0 ? 'sel' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
    <p>${de.yourName}</p><input id="name" maxlength="12" autocomplete="off" />
    <div id="kb">${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'].map((c) => `<button class="key" data-k="${c}">${c}</button>`).join('')}<button class="key wide" data-k=" ">␣</button><button class="key wide" data-k="⌫">⌫</button></div>
    <div><button class="alt" id="back">${de.back}</button><button id="go">${de.start}</button></div></div>`;
  screen.querySelectorAll<HTMLElement>('#av button').forEach((b) =>
    b.addEventListener('click', () => {
      avatar = b.dataset.a!;
      screen.querySelectorAll('#av button').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
    }),
  );
  const nameEl = document.getElementById('name') as HTMLInputElement;
  screen.querySelectorAll<HTMLElement>('#kb button').forEach((b) =>
    b.addEventListener('click', () => {
      const k = b.dataset.k!;
      if (k === '⌫') nameEl.value = nameEl.value.slice(0, -1);
      else if (nameEl.value.length < 12) {
        const first = nameEl.value.length === 0 || nameEl.value.endsWith(' ');
        nameEl.value += first ? k : k.toLowerCase();
      }
    }),
  );
  document.getElementById('back')!.addEventListener('click', showStart);
  document.getElementById('go')!.addEventListener('click', () => {
    const name = (document.getElementById('name') as HTMLInputElement).value.trim() || 'Held';
    selectProfile(createProfile(profiles, name, avatar));
  });
}

/** Weltkarte: Reiseziel wählen; die Stufe jeder Rechenart lässt sich von Hand anpassen. */
const MAP_COLORS: Record<string, [number, number, number]> = { add: [120, 190, 90], sub: [110, 190, 220], mul: [150, 200, 90], div: [190, 150, 100], north: [127, 197, 102] };

/** Farbe eines Kartenfeldes: Marktplatz, Bereiche im Norden oder Mathe-Welt. */
function mapRGB(x: number, z: number): [number, number, number] {
  if (Math.abs(x) < 8 && Math.abs(z) < 8) return [200, 190, 150];
  if (Math.abs(x) > HALF || z < -HALF) {
    const a = AREAS.find((q) => Math.hypot(x - q.center.x, z - q.center.z) < q.radius - 6);
    return a ? a.map : MAP_COLORS.north;
  }
  return MAP_COLORS[biomeAt(x, z)];
}

function showRegions(): void {
  world.paused = true;
  overlay.innerHTML = '';
  const p = current!;
  const cards = OPS.map((op) => {
    const r = de.regions[op];
    return `<div class="region ${op}"><button class="go" data-op="${op}"><span class="big">${r.emoji}</span><br>${r.name}<br><small>${r.blurb}</small></button>
      <div class="stepper"><button class="alt" data-op="${op}" data-d="-1">−</button><span>${de.level} ${p.levels[op]}</span><button class="alt" data-op="${op}" data-d="1">+</button></div></div>`;
  }).join('');
  screen.innerHTML = `<div class="hud"><span class="chip">${p.avatar} ${p.name}</span><span><span class="chip">${GEM} ${balance(p)}</span>
    ${inGame ? `<button class="alt" id="resume">▶</button>` : ''}<button class="alt" id="home">🏠</button></span></div>
    <div class="panel center"><h2>${de.pickRegion}</h2><div class="regions">${cards}</div>
    <button class="hubgo alt" data-op="hub">${de.hub.emoji} ${de.hub.name}</button>
    ${AREAS.filter((a) => p.areas.includes(a.id)).map((a) => `<div class="areacard"><button class="hubgo" data-op="${a.id}">${a.emoji} ${a.name}<br><small>${de.areas[a.id].blurb}</small></button>
      <div class="stepper"><button class="alt" data-area="${a.id}" data-d="-1">−</button><span>${de.level} ${areaLevel(p, a.id)}</span><button class="alt" data-area="${a.id}" data-d="1">+</button></div></div>`).join('') || `<p class="hint">${de.areaHint}</p>`}
    ${inGame ? `<button id="resume2">▶ ${de.resume}</button>` : ''}</div>`;
  screen.querySelectorAll<HTMLElement>('button.go, button.hubgo').forEach((b) =>
    b.addEventListener('click', () => enterWorld(b.dataset.op as string)),
  );
  screen.querySelectorAll<HTMLElement>('.stepper button[data-area]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.area!;
      p.areaLevels[id] = Math.min(MAX_LEVEL, Math.max(1, areaLevel(p, id) + Number(b.dataset.d)));
      save();
      showRegions();
    }),
  );
  screen.querySelectorAll<HTMLElement>('.stepper button[data-op]').forEach((b) =>
    b.addEventListener('click', () => {
      const op = b.dataset.op as Op;
      p.levels[op] = Math.min(MAX_LEVEL, Math.max(1, p.levels[op] + Number(b.dataset.d)));
      p.recent[op] = [];
      save();
      showRegions();
    }),
  );
  const resume = (): void => {
    hud();
    world.paused = false;
  };
  document.getElementById('resume')?.addEventListener('click', resume);
  document.getElementById('resume2')?.addEventListener('click', resume);
  document.getElementById('home')!.addEventListener('click', showStart);
}

/** Rotes Aufblitzen, Wackeln und Ton, wenn ein Stern verloren geht. */
function starLossSignal(): void {
  sfxLoss();
  const flash = document.getElementById('hurt')!;
  flash.classList.remove('on');
  void flash.offsetWidth;
  flash.classList.add('on');
  const st = document.getElementById('stars');
  st?.classList.remove('shake');
  void st?.offsetWidth;
  st?.classList.add('shake');
  if (navigator.vibrate) navigator.vibrate(120);
}

const mini = document.getElementById('minimap') as HTMLCanvasElement;
const MINI_R = 45;
/** Alle bekannten Orte; Bereiche erscheinen erst nach der Entdeckung. */
function allStations() {
  const found = current!.areas;
  return [
    ...OPS.flatMap((op) => [...villageOf(op).stations, ...extraStations(op)]),
    DOG_STATION,
    ...(found.includes('sudoku') ? [WALL_STATION] : []),
    ...portalStations().filter((st) => !st.area || found.includes(st.area)),
    ...AREAS.filter((a) => found.includes(a.id)).flatMap(areaStations),
  ];
}
function drawMinimap(): void {
  const show = !!current && inGame && !world.paused;
  mini.style.display = current && inGame && !world.inside ? 'block' : 'none';
  if (!show || world.inside) return;
  const g = mini.getContext('2d')!;
  const p = world.hero.position;
  const n = 45, px = mini.width / n, span = (MINI_R * 2) / n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = p.x - MINI_R + (i + 0.5) * span, z = p.z - MINI_R + (j + 0.5) * span;
      let col = '#1d262c';
      if (x >= X0 && x <= X1 && z >= Z0 && z <= Z1 && world.seen(x, z)) {
        const base = mapRGB(x, z);
        const k = 0.75 + Math.min(1, heightAt(x, z) / 5) * 0.4;
        col = `rgb(${Math.min(255, base[0] * k)},${Math.min(255, base[1] * k)},${Math.min(255, base[2] * k)})`;
      }
      g.fillStyle = col;
      g.fillRect(i * px, j * px, px + 0.5, px + 0.5);
    }
  }
  const stations = allStations();
  for (const st of stations) {
    const dx = ((st.x - p.x) / (MINI_R * 2)) * mini.width + mini.width / 2, dy = ((st.z - p.z) / (MINI_R * 2)) * mini.height + mini.height / 2;
    if (dx < 0 || dy < 0 || dx > mini.width || dy > mini.height) continue;
    g.fillStyle = st.id === 'shop' ? '#3b82f6' : st.id === 'dog' ? '#fb923c' : st.id === 'portal' ? '#c084fc' : '#facc15';
    g.beginPath();
    g.arc(dx, dy, 3, 0, 7);
    g.fill();
  }
  // Blickrichtung des Helden
  g.save();
  g.translate(mini.width / 2, mini.height / 2);
  g.rotate(-world.hero.rotation.y + Math.PI);
  g.fillStyle = '#ef4444';
  g.strokeStyle = '#fff';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5, 5);
  g.lineTo(-5, 5);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}
setInterval(drawMinimap, 200);

function updateHud(): void {
  const p = current!;
  const s = document.getElementById('stars');
  const r = document.getElementById('rupees');
  const t = document.getElementById('tool');
  if (s) {
    s.textContent = `⭐ ${p.stars}/${MAX_STARS}`;
    s.classList.toggle('warn', idle >= WARN_AT);
  }
  if (r) r.innerHTML = `${GEM} ${balance(p)}`;
  if (t) t.textContent = p.tool ? itemById(p.tool).emoji : '✋';
}

function setRegionChip(): void {
  const chip = document.getElementById('region');
  if (!chip) return;
  const here = areaById(world.areaId ?? '');
  if (here && !world.inside) { chip.textContent = `${here.emoji} ${here.name}`; return; }
  chip.textContent = world.inside ? `🏠 ${de.houseName}` : `${de.regions[region].emoji} ${de.regions[region].name}`;
}

const GFX: Record<string, string> = { low: '🔋', med: '🌤️', high: '✨' };

function hud(): void {
  const p = current!;
  screen.innerHTML = `<div class="hud"><span><span class="chip">${p.avatar} ${p.name}</span>
    <span class="chip" id="region"></span></span>
    <span><span class="chip" id="rupees">${GEM} ${balance(p)}</span><span class="chip" id="stars">⭐ ${p.stars}/${MAX_STARS}</span>
    <span class="chip" id="tool" title="${de.inv.inHand}"></span>
    <button class="alt" id="bag" title="${de.inv.title}">🎒<span class="g tri">△</span></button>
    <button class="alt" id="mute" title="${de.mute}">${speechOn() ? '🔊' : '🔇'}</button>
    <button class="alt" id="music" title="${de.musicToggle}">${musicOn() ? '🎵' : '🔕'}</button>
    <button class="alt" id="gfx" title="Grafik">${GFX[world.quality] ?? '✨'}</button>
    <button class="alt" id="map" title="${de.map.title}">🗺️<span class="g">Options</span></button></span></div>
    <div id="actions"><button class="alt hidden" id="a-pick" title="${de.actions.pickup}">✋</button>
    <button id="a-act" class="hidden"></button>
    <button class="alt" id="a-run" title="${de.actions.run}">🏃<span class="g">R1</span></button>
    <button id="a-jump" title="${de.actions.jump}">⤒<span class="g x">✕</span></button></div>`;
  document.getElementById('mute')!.addEventListener('click', (e) => {
    setSpeech(!speechOn());
    (e.currentTarget as HTMLElement).textContent = speechOn() ? '🔊' : '🔇';
  });
  document.getElementById('music')!.addEventListener('click', (e) => {
    setMusic(!musicOn());
    (e.currentTarget as HTMLElement).textContent = musicOn() ? '🎵' : '🔕';
  });
  document.getElementById('gfx')!.addEventListener('click', (e) => {
    const order = ['low', 'med', 'high'] as const;
    const next = order[(order.indexOf(world.quality as 'low') + 1) % 3];
    world.setQuality(next);
    (e.currentTarget as HTMLElement).textContent = GFX[next];
  });
  document.getElementById('map')!.addEventListener('click', () => command('map'));
  document.getElementById('bag')!.addEventListener('click', () => command('inventory'));
  const press = (id: string, c: Cmd): void => {
    const el = document.getElementById(id)!;
    el.addEventListener('mousedown', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      world.command(c);
    });
  };
  press('a-jump', 'jump');
  press('a-act', 'action');
  press('a-pick', 'pickup');
  let run = false;
  document.getElementById('a-run')!.addEventListener('click', (e) => {
    run = !run;
    input.setTouchRun(run);
    (e.currentTarget as HTMLElement).classList.toggle('on', run);
  });
  updateHud();
  setRegionChip();
  if (lastCtx) applyContext(lastCtx);
}

let lastCtx: { action: ActionKind; pickup: boolean } | null = null;
function applyContext(c: { action: ActionKind; pickup: boolean }): void {
  lastCtx = c;
  const act = document.getElementById('a-act');
  const pick = document.getElementById('a-pick');
  if (act) {
    act.classList.toggle('hidden', !c.action);
    if (c.action) act.innerHTML = `${ACTION_ICON[c.action]} ${de.actions[c.action]}<span class="g sq">□</span>`;
  }
  if (pick) {
    pick.classList.toggle('hidden', !c.pickup);
    pick.innerHTML = `${world.isPlacing ? `✖ ${de.actions.cancel}` : `✋ ${de.actions.pickup}`}<span class="g ci">◯</span>`;
  }
}

function say(text: string, ms = 8000): void {
  if (modalOpen()) return;
  overlay.innerHTML = `<div class="panel speech"><span class="face">🌱</span><p>${text}</p></div>`;
  // Englische Begrüßung mit englischer Stimme, der deutsche Rest mit der deutschen
  const m = /^Welcome! /.exec(text);
  if (m) {
    speakEnglish('Welcome!');
    setTimeout(() => void speak(text.slice(m[0].length)), 1000);
  } else void speak(text);
  setTimeout(() => {
    if (overlay.querySelector('.speech')) overlay.innerHTML = '';
  }, ms);
}

function enterWorld(where: string): void {
  if (musicOn()) startMusic();
  inGame = true;
  world.setProfile(current!);
  world.teleportTo(where);
  const isMath = (OPS as string[]).includes(where);
  if (isMath) region = where as Op;
  setTheme(isMath ? (where as Op) : where === 'hub' ? 'add' : (where as Theme));
  hud();
  world.paused = false;
  say(where === 'hub' ? de.welcomeHub : isMath ? de.welcome[where as Op] : de.areas[where].welcome);
}

const MAP_S = 2;
const MAP_CW = (X1 - X0) * MAP_S;
const MAP_CH = (Z1 - Z0) * MAP_S;

/** Weltkarte mit entdeckten Feldern und Orten. */
function showMap(): void {
  world.paused = true;
  const p = current!;
  overlay.innerHTML = `<div class="panel center"><h2>🗺️ ${de.map.title}</h2><div id="mapwrap" style="border-radius:12px"><canvas id="mapc" width="${MAP_CW}" height="${MAP_CH}" style="width:100%;max-width:560px;height:auto;display:block;margin:auto"></canvas></div>
    <p class="hint">${de.map.legend} · 📍 Du</p><div><button class="alt" id="resume">▶ ${de.resume}</button><button id="travel">${de.map.travel}</button><button class="alt" id="quit">🚪 ${de.save.quit}</button></div>
    <p class="hint">${p.areas.length ? AREAS.filter((a) => p.areas.includes(a.id)).map((a) => `${a.emoji} ${a.name}`).join(' · ') : de.areaHint}</p></div>`;
  const cv = document.getElementById('mapc') as HTMLCanvasElement;
  const g = cv.getContext('2d')!;
  const mx = (x: number): number => (x - X0) * MAP_S;
  const mz = (z: number): number => (z - Z0) * MAP_S;
  for (let z = Z0; z < Z1; z += CELL) {
    for (let x = X0; x < X1; x += CELL) {
      const cx = x + CELL / 2, cz = z + CELL / 2;
      if (!world.seen(cx, cz)) {
        g.fillStyle = '#26323a';
      } else {
        const c = mapRGB(cx, cz);
        const k = 0.75 + Math.min(1, heightAt(cx, cz) / 5) * 0.4;
        g.fillStyle = `rgb(${Math.min(255, c[0] * k)},${Math.min(255, c[1] * k)},${Math.min(255, c[2] * k)})`;
      }
      g.fillRect(mx(x), mz(z), CELL * MAP_S + 0.5, CELL * MAP_S + 0.5);
    }
  }
  g.textAlign = 'left';
  const heroP = world.hero.position;
  const dot = (x: number, z: number, col: string, r = 3): void => {
    if (!world.seen(x, z)) return;
    g.fillStyle = col;
    g.beginPath();
    g.arc(mx(x), mz(z), r * 1.6, 0, 7);
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = '#fff';
    g.stroke();
  };
  for (const op of OPS) {
    const v = villageOf(op);
    dot(v.house.x, v.house.z, '#8b5a2b');
    dot(v.chest.x, v.chest.z, '#a855f7');
  }
  for (const st of allStations()) dot(st.x, st.z, st.id === 'shop' ? '#3b82f6' : st.id === 'dog' ? '#fb923c' : st.id === 'portal' ? '#c084fc' : '#facc15', st.id === 'portal' ? 5 : 3);
  {
    const hx = mx(heroP.x), hy = mz(heroP.z);
    const glow = g.createRadialGradient(hx, hy, 4, hx, hy, 34);
    glow.addColorStop(0, 'rgba(255,60,60,0.65)');
    glow.addColorStop(1, 'rgba(255,60,60,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(hx, hy, 34, 0, 7);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(hx, hy, 19, 0, 7);
    g.stroke();
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(hx, hy, 11, 0, 7);
    g.fill();
    g.stroke();
    g.font = '24px sans-serif';
    g.textAlign = 'center';
    g.fillText('📍', hx, hy - 24);
    g.textAlign = 'left';
  }
  document.getElementById('resume')!.addEventListener('click', closeModal);
  document.getElementById('travel')!.addEventListener('click', showRegions);
  document.getElementById('quit')!.addEventListener('click', () => { save(); showStart(); });
}

/** Weltportal: Ziele sind der Marktplatz und alle entdeckten Bereiche. */
function showPortal(): void {
  world.paused = true;
  const h = world.hero.position;
  const near = (sp: { x: number; z: number }): boolean => Math.hypot(h.x - sp.x, h.z - sp.z) < 30;
  const dests = [
    { id: 'hub', label: `${de.hub.emoji} ${de.hub.name}`, spawn: HUB_SPAWN },
    ...AREAS.filter((a) => current!.areas.includes(a.id)).map((a) => ({ id: a.id, label: `${a.emoji} ${a.name}`, spawn: a.spawn })),
  ].filter((d) => !near(d.spawn));
  overlay.innerHTML = `<div class="panel center"><h2>🌀 ${de.portal.title}</h2><p class="hint">${de.portal.hint}</p>
    <div class="regions">${dests.map((d) => `<button class="hubgo" data-op="${d.id}">${d.label}</button>`).join('') || `<p>${de.portal.none}</p>`}</div>
    <br><button class="alt" id="resume">${de.toWorld}</button></div>`;
  overlay.querySelectorAll<HTMLElement>('button.hubgo').forEach((b) =>
    b.addEventListener('click', () => {
      overlay.innerHTML = '';
      enterWorld(b.dataset.op as string);
    }),
  );
  document.getElementById('resume')!.addEventListener('click', closeModal);
}

function closeModal(): void {
  overlay.innerHTML = '';
  updateHud();
  world.paused = false;
}

function equip(id: string | null): void {
  const p = current!;
  if (id && !p.inventory[id]) {
    toast(de.notice.noToolOwned);
    return;
  }
  world.setTool(id);
  save();
  updateHud();
  if (id) toast(de.notice.equipped(itemById(id).name));
}

function command(c: Cmd): void {
  if (!current || !inGame) return;
  if (c === 'inventory') {
    if (modalOpen()) return;
    world.cancelPlacing();
    world.paused = true;
    openInventory({
      root: overlay,
      profile: current,
      save,
      onEquip: equip,
      onOutfit: () => {
        world.refreshOutfit();
        sfx('equip');
        save();
        updateHud();
      },
      onClose: closeModal,
      onPlace: (id) => {
        world.paused = false;
        if (world.startPlacing(id)) toast(de.notice.placeHelp);
      },
    });
  } else if (c === 'map') {
    if (!modalOpen()) showMap();
  } else if (c === 'rotate') {
    // ohne Aufstell-Modus wechselt L1/Q das Werkzeug
    const owned = TOOLS.filter((t) => current!.inventory[t]);
    if (!owned.length) return;
    const i = current.tool ? owned.indexOf(current.tool) : -1;
    equip(i + 1 >= owned.length ? null : owned[i + 1]);
  } else if (c.startsWith('tool:')) {
    const id = c.slice(5) || null;
    equip(id === current.tool ? null : id);
  }
}

world.onCommand = command;
world.onContext = applyContext;
world.onNotice = toast;
world.onChange = () => {
  save();
  updateHud();
};
world.onBiome = (op) => {
  const changed = op !== region;
  region = op;
  if (!world.inside) setTheme(op);
  setRegionChip();
  if (changed && !world.paused) say(de.enter[op], 4000);
};
world.onIsland = (id) => {
  if (!world.inside) setTheme((id as Theme | null) ?? region);
  setRegionChip();
  if (id && !world.paused) say(de.areas[id].welcome, 5000);
};
world.onHouse = (inside) => {
  setTheme(inside ? 'house' : ((world.areaId as Theme | null) ?? region));
  setRegionChip();
  if (inside) say(de.houseWelcome, 3500);
};
world.onChest = (id) => {
  world.paused = true;
  openChest({ root: overlay, profile: current!, chestId: id, save, onClose: closeModal });
};

function finishRound(r: RoundResult): void {
  idle = 0;
  updateHud();
  const bonus = r.perfect ? `<p>🎉 ${de.perfect}</p>` : '';
  overlay.innerHTML = `<div class="panel center"><h2>🎉</h2><div class="stars">${'⭐'.repeat(r.stars) || '🌱'}</div>
    <p>${de.roundDone(r.stars)}</p>${bonus}<p class="chip">${rewardChips(r.earned)}</p><br><button id="ok">${de.toWorld}</button></div>`;
  void speak(`${de.roundDone(r.stars)} ${r.perfect ? de.perfect : ''} ${de.earned(r.earned)}`);
  document.getElementById('ok')!.addEventListener('click', closeModal);
}

world.onArea = (id) => {
  const a = areaById(id);
  if (a) { toast(`${a.emoji} ${de.areaFound(a.name)}`); sfx('discover'); }
  save();
};
world.onStation = (s) => {
  if (!current) return;
  world.paused = true;
  if (s.id === 'shop') {
    openTrade({ root: overlay, profile: current, save, onChange: updateHud, onClose: closeModal });
    return;
  }
  if (s.id === 'portal') { sfx('portal'); return showPortal(); }
  if (s.id === 'dog') {
    runDash({ root: overlay, profile: current, save, onChange: updateHud, onClose: closeModal });
    return;
  }
  if (s.id === 'wall') {
    runWall({
      root: overlay,
      profile: current,
      save,
      onChange: updateHud,
      onDone: (r) => {
        if (r) idle = 0;
        if (!r) return closeModal();
        overlay.innerHTML = `<div class="panel center"><h2>🧱</h2><p>${de.wall.solved}</p>
          <p class="chip">${rewardChips(r.earned)}${r.star ? ' · +1 ⭐' : ''}</p><br><button id="ok">${de.toWorld}</button></div>`;
        document.getElementById('ok')!.addEventListener('click', closeModal);
      },
    });
    return;
  }
  if (s.id === 'sud') {
    runSudoku({
      root: overlay,
      profile: current,
      save,
      onChange: updateHud,
      onDone: (r) => {
        if (r) idle = 0;
        if (!r) return closeModal();
        overlay.innerHTML = `<div class="panel center"><h2>🔢</h2><p>${de.sudoku.solved}</p>
          <p class="chip">${rewardChips(r.earned)}${r.star ? ' · +1 ⭐' : ''}</p><br><button id="ok">${de.toWorld}</button></div>`;
        document.getElementById('ok')!.addEventListener('click', closeModal);
      },
    });
    return;
  }
  const lessonArea = Object.entries(AREA_STATION).find(([, id]) => id === s.id)?.[0];
  if (lessonArea) {
    const SUBJECTS: Record<string, { emoji: string; kinds: RiddleKind[] }> = {
      english: { emoji: '🇬🇧', kinds: ENGLISH_KINDS },
      german: { emoji: '📚', kinds: ['german', 'german', 'german', 'spell', 'gap', 'opposite'] },
      general: { emoji: '🌍', kinds: ['general', 'general', 'general', 'fact', 'order'] },
      puzzle: { emoji: '🧩', kinds: ['puzzle'] },
    };
    const sub = SUBJECTS[lessonArea];
    runEnglishRound({
      root: overlay,
      profile: current,
      save,
      onChange: updateHud,
      area: lessonArea,
      subject: { emoji: sub.emoji, title: de.lesson[lessonArea] ?? 'English', kinds: sub.kinds },
      onDone: (r) => {
        if (r) idle = 0;
        if (!r) return closeModal();
        overlay.innerHTML = `<div class="panel center"><h2>${sub.emoji}</h2><p>${de.englishDone(r.right, 5)}</p>
          <p class="chip">${rewardChips(r.earned)}${r.star ? ' · +1 ⭐' : ''}</p><br><button id="ok">${de.toWorld}</button></div>`;
        document.getElementById('ok')!.addEventListener('click', closeModal);
      },
    });
    return;
  }
  runRound({
    onAbort: closeModal,
    root: overlay,
    profile: current,
    op: s.op,
    variant: s.id as Variant,
    save,
    onChange: updateHud,
    onDone: finishRound,
  });
};

world.onTalk = (kid) => {
  if (!current) return;
  world.paused = true;
  openTalk({ root: overlay, profile: current, kid, save, onChange: () => { idle = 0; updateHud(); }, onClose: closeModal });
};

world.onHurt = () => {
  if (!current || current.stars <= 1) return;
  current.stars--;
  save();
  updateHud();
  starLossSignal();
  toast(de.notice.slimeHit);
};

// Sterne sind Lebensenergie: ohne gelöste Aufgabe (egal welches Fach) schwinden sie
const WARN_AT = 180;
const LOSE_AT = WARN_AT + 15;
let idle = 0;
setInterval(() => {
  if (!current || !inGame || world.paused || world.inside) return;
  idle++;
  if (idle === WARN_AT) {
    toast(de.starWarn);
    void speak(de.starWarn);
    updateHud();
  }
  if (idle >= LOSE_AT && (idle - LOSE_AT) % 15 === 0) {
    current.stars--;
    toast(de.notice.starLost);
    starLossSignal();
    if (current.stars <= 0) {
      current.stars = 3;
      idle = 0;
      world.teleportTo('hub');
      say(de.faint, 9000);
    }
    save();
    updateHud();
  }
}, 1000);

// Controller-Symbole nur anzeigen, wenn ein Pad verbunden ist
setInterval(() => {
  const on = [...(navigator.getGamepads?.() ?? [])].some((g) => g && g.connected);
  document.body.classList.toggle('pad', on);
}, 500);

showStart();

// Für automatisierte Tests
(window as unknown as { __game: unknown }).__game = { world, get profile() { return current; } };

// Browser erlauben Ton erst nach Klick/Taste; Controller-Tasten zählen dafür nicht
const unlockAudio = (): void => {
  if (musicOn() && current) startMusic();
};
addEventListener('pointerdown', unlockAudio);
addEventListener('keydown', unlockAudio);
