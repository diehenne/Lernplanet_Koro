export type Cmd = 'jump' | 'action' | 'pickup' | 'rotate' | 'inventory' | 'map' | `tool:${string}`;

export interface InputState {
  x: number;
  y: number;
  run: boolean;
  /** Kamera drehen (rechter Stick / Tasten C, V): lookX = links/rechts, lookY = hoch/runter. */
  lookX: number;
  lookY: number;
  /** Wird für Tasten- und Controller-Befehle aufgerufen (nur bei Neudruck). */
  onCommand: (c: Cmd) => void;
  setTouchRun: (on: boolean) => void;
}

const KEY_CMDS: Record<string, Cmd> = {
  ' ': 'jump',
  e: 'action',
  r: 'pickup',
  q: 'rotate',
  i: 'inventory',
  tab: 'inventory',
  m: 'map',
  '1': 'tool:shovel',
  '2': 'tool:axe',
  '3': 'tool:sword',
  '0': 'tool:',
};

/** Tastatur (WASD/Pfeile, Shift = rennen) + Touch-Joystick + Controller. y>0 = nach vorne. */
export function createInput(joystick: HTMLElement): InputState {
  const state: InputState = { x: 0, y: 0, run: false, lookX: 0, lookY: 0, onCommand: () => {}, setTouchRun: () => {} };
  const keys = new Set<string>();
  let stick = { x: 0, y: 0 };
  let pad = { x: 0, y: 0, run: false, lookX: 0, lookY: 0 };
  let touchRun = false;

  const update = () => {
    const kx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    const ky = (keys.has('arrowup') || keys.has('w') ? 1 : 0) - (keys.has('arrowdown') || keys.has('s') ? 1 : 0);
    state.x = kx || stick.x || pad.x;
    state.y = ky || stick.y || pad.y;
    state.lookX = (keys.has('v') ? 1 : 0) - (keys.has('c') ? 1 : 0) || pad.lookX || touchLook.x;
    state.lookY = (keys.has('n') ? 1 : 0) - (keys.has('b') ? 1 : 0) || pad.lookY || touchLook.y;
    state.run = keys.has('shift') || pad.run || touchRun;
  };
  state.setTouchRun = (on) => {
    touchRun = on;
    update();
  };
  const typing = (e: Event) => (e.target as HTMLElement | null)?.tagName === 'INPUT';
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    const k = e.key.toLowerCase();
    keys.add(k);
    update();
    const cmd = KEY_CMDS[k];
    if (cmd && !e.repeat) {
      state.onCommand(cmd);
      if (k === ' ' || k === 'tab') e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); update(); });
  window.addEventListener('blur', () => { keys.clear(); update(); });

  const knob = joystick.querySelector<HTMLElement>('.knob')!;
  const R = 46;
  let active: number | null = null;
  const move = (e: PointerEvent) => {
    const r = joystick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stick = { x: dx / R, y: -dy / R };
    update();
  };
  joystick.addEventListener('pointerdown', (e) => { active = e.pointerId; joystick.setPointerCapture(e.pointerId); move(e); });
  joystick.addEventListener('pointermove', (e) => { if (e.pointerId === active) move(e); });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    active = null;
    knob.style.transform = '';
    stick = { x: 0, y: 0 };
    update();
  };
  joystick.addEventListener('pointerup', end);
  joystick.addEventListener('pointercancel', end);

  // Kamera per Wischen auf der Spielfläche (Touch/Stift); Wischweg → Drehrate
  const canvas = document.querySelector<HTMLElement>('canvas');
  let swipe: number | null = null;
  let last = { x: 0, y: 0 };
  let acc = { x: 0, y: 0 };
  let touchLook = { x: 0, y: 0 };
  if (canvas) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || swipe !== null) return;
      swipe = e.pointerId;
      last = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== swipe) return;
      acc.x += e.clientX - last.x;
      acc.y += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
    });
    const stop = (e: PointerEvent) => { if (e.pointerId === swipe) swipe = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }
  let lastT = performance.now();

  const gamepad = createGamepadNav((c) => state.onCommand(c));
  const poll = () => {
    const now = performance.now();
    const dt = Math.max(0.005, Math.min(0.1, (now - lastT) / 1000));
    lastT = now;
    touchLook = { x: (acc.x * 0.006) / (dt * 2.4), y: (acc.y * 0.005) / (dt * 1.6) };
    acc = { x: 0, y: 0 };
    pad = gamepad.poll();
    update();
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
  return state;
}

const DEADZONE = 0.25;

/**
 * Controller-Unterstützung (Gamepad API, z. B. PS5 DualSense).
 * Spiel: linker Stick laufen, ✕ springen, □ Aktion, ◯ aufnehmen/abbrechen, R1/R2 rennen,
 * L1 Werkzeug wechseln bzw. Gegenstand drehen, △ Rucksack, Options Weltkarte.
 * Menü: Stick/Steuerkreuz wählen, L1/R1 vor/zurück, ✕ bestätigen, ◯ zurück.
 */
function createGamepadNav(emit: (c: Cmd) => void) {
  const down = new Set<number>();
  let focused: HTMLElement | null = null;
  let heldDir = '';
  let heldSince = 0;
  // Merkt sich Position und Fenster, damit der Cursor nach einem Neuaufbau (Stufe ändern, bezahlen) am selben Platz bleibt
  let lastIdx = 0;
  let lastKey = '';
  const panelKey = (): string => document.querySelector('#overlay .panel h2, #screen .panel h2')?.textContent ?? '';
  window.addEventListener('padfocus', (e) => {
    const el = (e as CustomEvent<HTMLElement>).detail;
    if (el) setFocus(el);
  });

  const buttons = (): HTMLElement[] => {
    const root = document.querySelector('#overlay .panel button') ? '#overlay' : '#screen';
    const ring = document.querySelectorAll<HTMLElement>('#numring button');
    const sel = ring.length ? `${root} .panel #numring button` : `${root} .panel button`;
    return [...document.querySelectorAll<HTMLElement>(sel)].filter((b) => b.offsetParent !== null && !(b as HTMLButtonElement).disabled);
  };

  const setFocus = (el: HTMLElement | null) => {
    focused?.classList.remove('padfocus');
    focused = el;
    if (el) lastIdx = buttons().indexOf(el);
    el?.classList.add('padfocus');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const move = (dir: string, list: HTMLElement[]) => {
    if (!focused || !list.includes(focused)) return setFocus(list[0] ?? null);
    const c = focused.getBoundingClientRect();
    const horiz = dir === 'left' || dir === 'right';
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === focused) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - (c.left + c.width / 2), dy = r.top + r.height / 2 - (c.top + c.height / 2);
      const [main, side] = dir === 'left' ? [-dx, dy] : dir === 'right' ? [dx, dy] : dir === 'up' ? [-dy, dx] : [dy, dx];
      // strikt in Pfeilrichtung: das Ziel muss wirklich dahinter liegen (Mitte jenseits der Mitte, ohne Überlappung der Kanten)
      if (main <= 4) continue;
      const overlap = horiz
        ? Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top)
        : Math.min(c.right, r.right) - Math.max(c.left, r.left);
      const aligned = overlap > Math.min(horiz ? c.height : c.width, horiz ? r.height : r.width) * 0.3;
      // zuerst Buttons in derselben Zeile/Spalte (nächster zuerst), sonst der in Richtung nächstliegende
      const score = (aligned ? 0 : 1e6) + main + Math.abs(side) * (aligned ? 0.2 : 4);
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) setFocus(best);
  };

  const click = (sel: string): boolean => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el || el.offsetParent === null) return false;
    el.click();
    return true;
  };

  return {
    poll(): { x: number; y: number; run: boolean; lookX: number; lookY: number } {
      const gp = [...(navigator.getGamepads?.() ?? [])].find((g) => g && g.connected);
      if (!gp) { setFocus(null); down.clear(); return { x: 0, y: 0, run: false, lookX: 0, lookY: 0 }; }
      const b = (i: number) => !!gp.buttons[i]?.pressed;
      const edge = (i: number) => {
        const now = b(i), was = down.has(i);
        if (now) down.add(i); else down.delete(i);
        return now && !was;
      };

      let ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
      if (Math.hypot(ax, ay) < DEADZONE) { ax = 0; ay = 0; }
      if (b(14)) ax = -1; else if (b(15)) ax = 1;
      if (b(12)) ay = -1; else if (b(13)) ay = 1;

      // Create/Share: Sprache an/aus, Touchpad: Musik an/aus (überall)
      if (edge(8)) click('#mute');
      if (edge(17)) click('#music');

      const list = buttons();
      if (list.length > 0) {
        let dir = '';
        if (Math.abs(ax) > Math.abs(ay)) dir = ax < -0.5 ? 'left' : ax > 0.5 ? 'right' : '';
        else dir = ay < -0.5 ? 'up' : ay > 0.5 ? 'down' : '';
        const now = performance.now();
        if (dir && (dir !== heldDir || now - heldSince > 280)) {
          move(dir, list);
          heldSince = dir !== heldDir ? now + 200 : now;
        }
        heldDir = dir;
        if (!focused || !list.includes(focused)) {
          const key = panelKey();
          setFocus(key === lastKey && lastIdx >= 0 ? list[Math.min(lastIdx, list.length - 1)] : list[0]);
        }
        lastKey = panelKey();
        const i = list.indexOf(focused!);
        if (edge(5)) setFocus(list[(i + 1) % list.length]);
        if (edge(4)) setFocus(list[(i + list.length - 1) % list.length]);
        if (edge(0)) focused?.click();
        if (edge(1) && window.dispatchEvent(new CustomEvent('padback', { cancelable: true }))) click('#abort, #back, #close, #home, #resume');
        edge(2); edge(3); edge(9); edge(7);
        return { x: 0, y: 0, run: false, lookX: 0, lookY: 0 };
      }

      setFocus(null);
      heldDir = '';
      if (edge(0)) emit('jump');
      if (edge(2)) emit('action');
      if (edge(1)) emit('pickup');
      if (edge(4)) emit('rotate');
      if (edge(3)) emit('inventory');
      if (edge(9)) emit('map');
      edge(5); edge(7);
      let rx = gp.axes[2] ?? 0, ry = gp.axes[gp.mapping === 'standard' || gp.axes.length < 6 ? 3 : 5] ?? 0;
      if (Math.hypot(rx, ry) < DEADZONE) { rx = 0; ry = 0; }
      return { x: ax, y: -ay, run: b(5) || b(7), lookX: rx, lookY: ry };
    },
  };
}
