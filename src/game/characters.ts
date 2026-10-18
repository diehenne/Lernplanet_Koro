import * as THREE from 'three';
import { sharedGrain } from './textures';
import { createBush, createFlower, createHouse, createTree } from './nature';
export { createHouse, createCactus, createDeadTree, createTree, createFruitTree, createMushroom, createRock, createMountain, createLily } from './nature';
import { itemById } from '../core/shop';
import type { Op } from '../core/types';

export function toon(color: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, bumpMap: sharedGrain(), bumpScale: 1.2 });
  m.onBeforeCompile = (sh) => {
    // Weiches Randlicht (Fresnel) und aufgehellte Schatten für den Cartoon-Look.
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rim = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
       outgoingLight += diffuseColor.rgb * rim * 0.35 + diffuseColor.rgb * 0.04;
       #include <opaque_fragment>`,
    );
  };
  return m;
}

const outlineCache = new Map<number, THREE.ShaderMaterial>();
function outlineMat(t: number): THREE.ShaderMaterial {
  const k = Math.round(t * 1000);
  let m = outlineCache.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { t: { value: t } },
      vertexShader: 'uniform float t; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * t, 1.0); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.16, 0.1, 0.07, 1.0); }',
    });
    outlineCache.set(k, m);
  }
  return m;
}

/** Dunkle Kontur (Inverted-Hull) um alle Körperteile – typischer Cartoon-Look. */
export function outline<T extends THREE.Object3D>(root: T): T {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh && !m.userData.noOutline) meshes.push(m);
  });
  for (const m of meshes) {
    const mat = m.material as THREE.Material;
    if (mat.transparent) continue;
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere?.radius ?? 0.2;
    const o = new THREE.Mesh(m.geometry, outlineMat(Math.min(0.03, Math.max(0.006, r * 0.05))));
    o.userData.noOutline = true;
    o.castShadow = false;
    o.receiveShadow = false;
    m.add(o);
  }
  return root;
}

/** Backt eine weiche Verschattung (unten dunkler, oben heller) in die Vertexfarben. */
function bakeShade(geo: THREE.BufferGeometry): void {
  const n = geo.attributes.normal;
  if (!n || geo.attributes.color) return;
  const cols = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const k = 0.8 + 0.28 * (n.getY(i) * 0.5 + 0.5);
    cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}

export function mesh(geo: THREE.BufferGeometry, color: number): THREE.Mesh {
  bakeShade(geo);
  const mat = toon(color);
  mat.vertexColors = true;
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

function ellipsoid(r: number, sx: number, sy: number, sz: number, color: number): THREE.Mesh {
  const m = mesh(new THREE.SphereGeometry(r, 32, 24), color);
  m.scale.set(sx, sy, sz);
  return m;
}

/** Perlenkette aus kleiner werdenden Kugeln entlang einer Kurve: wirkt wie ein weich auslaufender Zipfel. */
function taper(pts: [number, number, number][], r0: number, r1: number, color: number): THREE.Group {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const grp = new THREE.Group();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sp = mesh(new THREE.SphereGeometry(r0 + (r1 - r0) * t, 20, 16), color);
    sp.position.copy(curve.getPoint(t));
    grp.add(sp);
  }
  return grp;
}

function eyeBall(r: number, color: number): THREE.Mesh {
  const e = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), new THREE.MeshBasicMaterial({ color }));
  e.userData.noOutline = true;
  // Glanzpunkt, damit der Blick lebendig wirkt (nur an dunklen Pupillen).
  if (color < 0x404040) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(r * 0.3, r * 0.38, r * 0.82);
    hl.userData.noOutline = true;
    e.add(hl);
  }
  return e;
}

export interface HeroParts {
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  acc: Record<string, THREE.Object3D>;
}

export const DEFAULT_COLORS: Record<string, number> = { tunic: 0x2fa7b8, cap: 0xf08a3c };

interface AnimalLook { fur: number; light: number; dark: number }
const ANIMALS: Record<string, AnimalLook> = {
  '🦊': { fur: 0xe8782a, light: 0xfff1e0, dark: 0x3a2418 },
  '🐻': { fur: 0x9a6a3e, light: 0xe8c9a0, dark: 0x3a2418 },
  '🐰': { fur: 0xe9e4e0, light: 0xffffff, dark: 0xf2a0b0 },
  '🐸': { fur: 0x6cc24a, light: 0xd8f0a8, dark: 0x2f6d2a },
  '🦉': { fur: 0xa8794a, light: 0xf3e3c3, dark: 0x5a3a1e },
  '🐧': { fur: 0x2c3a52, light: 0xffffff, dark: 0xf2a02a },
};

/** Baut Gesicht und Ohren des gewählten Tiers an den Kopf; gibt ggf. einen Schwanz für den Körper zurück. */
function buildAnimalHead(avatar: string, head: THREE.Group, a: AnimalLook): THREE.Object3D | null {
  const eyes = (y = 0.03, spread = 0.15, r = 0.085) => {
    for (const s of [-1, 1]) {
      const eye = eyeBall(r, 0xffffff);
      eye.scale.set(0.9, 1.2, 0.5);
      eye.position.set(s * spread, y, 0.34);
      const iris = eyeBall(r * 0.62, 0x1d130c);
      iris.position.set(0, 0, 0.05);
      eye.add(iris);
      head.add(eye);
    }
  };
  const cheeks = () => {
    for (const s of [-1, 1]) head.add(at(mesh(new THREE.SphereGeometry(0.055, 14, 12), 0xf2a08c), s * 0.27, -0.1, 0.27));
  };
  const nose = (y: number, z: number, c = 0x2b1b12) => head.add(at(ellipsoid(0.045, 1.3, 0.85, 1, c), 0, y, z));
  const muzzle = (y: number, z: number, c: number) => head.add(at(ellipsoid(0.15, 1.1, 0.8, 0.95, c), 0, y, z));
  const ear = (s: number, x: number, y: number, rz: number, geo: THREE.BufferGeometry, c: number, z = -0.02) => {
    const m = at(mesh(geo, c), s * x, y, z);
    m.rotation.z = s * rz;
    head.add(m);
    return m;
  };
  switch (avatar) {
    case '🐻': {
      for (const s of [-1, 1]) {
        ear(s, 0.28, 0.3, 0, new THREE.SphereGeometry(0.13, 20, 16), a.fur);
        head.add(at(mesh(new THREE.SphereGeometry(0.075, 16, 12), a.light), s * 0.28, 0.3, 0.07));
      }
      eyes(0.06, 0.15, 0.065);
      muzzle(-0.1, 0.32, a.light);
      nose(-0.04, 0.45);
      cheeks();
      return at(mesh(new THREE.SphereGeometry(0.1, 16, 12), a.fur), 0, 0.62, -0.36);
    }
    case '🐰': {
      for (const s of [-1, 1]) {
        const e = ear(s, 0.14, 0.62, 0.15, new THREE.CapsuleGeometry(0.075, 0.38, 8, 16), a.fur);
        e.add(at(mesh(new THREE.CapsuleGeometry(0.04, 0.3, 6, 12), a.dark), 0, 0, 0.045));
      }
      eyes(0.04, 0.15, 0.08);
      muzzle(-0.1, 0.31, a.light);
      nose(-0.06, 0.44, 0xf08aa0);
      cheeks();
      return at(mesh(new THREE.SphereGeometry(0.13, 16, 12), 0xffffff), 0, 0.62, -0.38);
    }
    case '🐸': {
      for (const s of [-1, 1]) {
        head.add(at(mesh(new THREE.SphereGeometry(0.13, 20, 16), a.fur), s * 0.17, 0.36, 0.12));
        const eye = eyeBall(0.095, 0xffffff);
        eye.position.set(s * 0.17, 0.38, 0.2);
        const iris = eyeBall(0.055, 0x1d130c);
        iris.position.set(0, 0, 0.07);
        eye.add(iris);
        head.add(eye);
        head.add(at(mesh(new THREE.SphereGeometry(0.06, 14, 12), 0xf2a08c), s * 0.27, -0.1, 0.27));
        head.add(at(mesh(new THREE.SphereGeometry(0.018, 8, 8), a.dark), s * 0.05, 0.1, 0.38));
      }
      const mouth = at(mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 24, Math.PI), a.dark), 0, -0.1, 0.34);
      mouth.rotation.z = Math.PI;
      mouth.scale.set(1.1, 0.6, 1);
      head.add(mouth);
      return null;
    }
    case '🦉': {
      for (const s of [-1, 1]) {
        ear(s, 0.24, 0.36, 0.45, new THREE.ConeGeometry(0.1, 0.24, 14), a.dark);
        head.add(at(ellipsoid(0.17, 1, 1, 0.5, a.light), s * 0.16, 0.04, 0.33));
        const eye = eyeBall(0.1, 0xffe27a);
        eye.position.set(s * 0.16, 0.04, 0.38);
        const iris = eyeBall(0.055, 0x1d130c);
        iris.position.set(0, 0, 0.09);
        eye.add(iris);
        head.add(eye);
      }
      const beak = at(mesh(new THREE.ConeGeometry(0.06, 0.13, 12), 0xf2a02a), 0, -0.08, 0.42);
      beak.rotation.x = Math.PI / 2;
      head.add(beak);
      return null;
    }
    case '🐧': {
      head.add(at(ellipsoid(0.3, 1.05, 1.0, 0.9, a.light), 0, -0.05, 0.14));
      eyes(0.04, 0.14, 0.075);
      const beak = at(ellipsoid(0.07, 1.4, 0.7, 1.3, a.dark), 0, -0.08, 0.42);
      head.add(beak);
      cheeks();
      return null;
    }
    default: {
      for (const s of [-1, 1]) {
        ear(s, 0.24, 0.36, 0.35, new THREE.ConeGeometry(0.13, 0.32, 16), a.fur);
        ear(s, 0.24, 0.34, 0.35, new THREE.ConeGeometry(0.08, 0.22, 12), a.dark, 0.03);
        head.add(at(ellipsoid(0.13, 1, 0.9, 0.8, a.light), s * 0.2, -0.1, 0.27));
      }
      eyes(0.05, 0.15, 0.08);
      muzzle(-0.1, 0.31, a.light);
      nose(-0.06, 0.45);
      cheeks();
      const tail = taper([[0, 0.5, -0.4], [0, 0.45, -0.62], [0, 0.55, -0.8]], 0.1, 0.05, a.fur);
      tail.add(at(mesh(new THREE.SphereGeometry(0.075, 14, 12), a.light), 0, 0.57, -0.82));
      return tail;
    }
  }
}

/** Tierkind-Entdecker: das gewählte Tier mit Kapuzenjacke, Rucksack, Schal und Turnschuhen. */
export function createHero(avatar = '🦊'): THREE.Group & { userData: HeroParts } {
  const g = new THREE.Group() as THREE.Group & { userData: HeroParts };
  const look = ANIMALS[avatar] ?? ANIMALS['🦊'];
  const skin = look.fur, jacket = DEFAULT_COLORS.tunic, pants = 0x3d4f8c, shoes = 0xf2f2f2;
  const legs: THREE.Object3D[] = [];
  const arms: THREE.Object3D[] = [];
  const slot = <T extends THREE.Object3D>(o: T, name: string): T => {
    o.userData.slot = name;
    return o;
  };

  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.16, 0.5, 0);
    leg.add(at(mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 20), pants), 0, -0.22, 0));
    leg.add(at(ellipsoid(0.15, 0.95, 0.72, 1.4, shoes), 0, -0.45, 0.06));
    leg.add(at(ellipsoid(0.145, 1.02, 0.2, 1.5, 0xc9c2b4), 0, -0.53, 0.07));
    leg.add(at(ellipsoid(0.08, 1.25, 0.8, 0.9, 0xe8546b), 0, -0.45, 0.2));
    g.add(leg);
    legs.push(leg);

    const arm = new THREE.Group();
    arm.position.set(s * 0.36, 1.0, 0);
    arm.add(slot(at(mesh(new THREE.CapsuleGeometry(0.085, 0.2, 8, 16), jacket), 0, -0.14, 0), 'tunic'));
    arm.add(at(mesh(new THREE.SphereGeometry(0.09, 20, 16), skin), 0, -0.34, 0));
    g.add(arm);
    arms.push(arm);
  }

  // Rumpf: weich gerundete Kapuzenjacke mit Saum
  const prof = [[0.0, 0.5], [0.33, 0.5], [0.39, 0.56], [0.36, 0.74], [0.3, 0.9], [0.32, 1.02], [0.2, 1.12], [0.1, 1.15], [0.0, 1.15]];
  g.add(slot(mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40), jacket), 'tunic'));
  g.add(at(ellipsoid(0.17, 1.2, 0.75, 0.3, 0xf2f2f2), 0, 0.68, 0.34));
  // Schal
  const scarf = mesh(new THREE.TorusGeometry(0.2, 0.07, 14, 32), 0xe8546b);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.14;
  g.add(scarf);
  g.add(at(ellipsoid(0.07, 1, 2.2, 0.6, 0xe8546b), 0.12, 0.98, 0.2));

  const head = new THREE.Group();
  head.position.y = 1.42;
  head.add(mesh(new THREE.SphereGeometry(0.4, 40, 32), skin));
  const tail = buildAnimalHead(avatar, head, look);
  if (tail) g.add(tail);
  // Mütze (nur über den Shop): runde Bommelmütze mit Umschlag
  const dome = slot(mesh(new THREE.SphereGeometry(0.45, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.46), DEFAULT_COLORS.cap), 'cap');
  dome.position.set(0, 0.1, -0.02);
  dome.rotation.x = -0.15;
  head.add(dome);
  const band = slot(mesh(new THREE.TorusGeometry(0.43, 0.06, 14, 40), DEFAULT_COLORS.cap), 'cap');
  band.rotation.x = Math.PI / 2 - 0.15;
  band.position.set(0, 0.13, -0.02);
  head.add(band);
  const pom = at(mesh(new THREE.SphereGeometry(0.12, 20, 16), 0xffffff), 0, 0.57, -0.06);
  pom.userData.hat = true;
  head.add(pom);
  head.children.forEach((c) => { if (c.userData.slot === 'cap' || c.userData.hat) c.visible = false; });
  g.add(head);

  // Rucksack
  g.add(at(ellipsoid(0.26, 1, 1.25, 0.8, 0xe8a23d), 0, 0.85, -0.36));
  g.add(at(ellipsoid(0.14, 1, 0.8, 0.5, 0xc7821f), 0, 0.72, -0.5));
  for (const s of [-1, 1]) g.add(at(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), 0xc7821f), s * 0.16, 0.9, 0.26));

  const crown = new THREE.Group();
  crown.add(at(mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.14, 28), 0xffc83a), 0, 0.44, 0.02));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    crown.add(at(mesh(new THREE.ConeGeometry(0.06, 0.2, 12), 0xffc83a), Math.sin(a) * 0.26, 0.58, Math.cos(a) * 0.26 + 0.02));
  }
  crown.add(at(mesh(new THREE.SphereGeometry(0.05, 16, 16), 0xe0384a), 0, 0.46, 0.3));
  const glasses = new THREE.Group();
  for (const s of [-1, 1]) {
    const lens = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 28), 0x1a1a22);
    lens.rotation.x = Math.PI / 2;
    glasses.add(at(lens, s * 0.15, 0.02, 0.41));
  }
  glasses.add(at(mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), 0x1a1a22), 0, 0.03, 0.42));
  const cape = mesh(new THREE.BoxGeometry(0.7, 0.95, 0.05), 0xd8443a);
  cape.position.set(0, 0.78, -0.62);
  cape.rotation.x = 0.12;
  head.add(crown, glasses);
  g.add(cape);
  const acc = { 'acc-crown': crown, 'acc-glasses': glasses, 'acc-cape': cape };
  Object.values(acc).forEach((a) => (a.visible = false));

  g.userData = { legs, arms, acc };
  return outline(g);
}

/** Kleiner Hund, der um die Hauptfigur herumläuft. */
export function createPuppy(): THREE.Group {
  const g = new THREE.Group();
  const fur = 0xd9a05b, light = 0xf3dcb4, dark = 0x7a4a24;
  g.add(at(ellipsoid(0.2, 0.85, 0.8, 1.45, fur), 0, 0.3, 0));
  g.add(at(ellipsoid(0.14, 0.9, 0.5, 1.2, light), 0, 0.22, 0.05));
  const head = new THREE.Group();
  head.add(ellipsoid(0.15, 1, 0.92, 0.95, fur));
  head.add(at(ellipsoid(0.08, 1, 0.75, 1.1, light), 0, -0.04, 0.12));
  head.add(at(ellipsoid(0.03, 1.2, 0.8, 1, 0x2b1b12), 0, -0.01, 0.2));
  for (const x of [-0.06, 0.06]) {
    head.add(at(eyeBall(0.022, 0x2b1b12), x, 0.04, 0.13));
    const ear = ellipsoid(0.06, 0.6, 1.6, 0.5, dark);
    ear.rotation.z = x < 0 ? 0.3 : -0.3;
    head.add(at(ear, x * 2.1, 0.0, -0.01));
  }
  g.add(at(head, 0, 0.5, 0.26));
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.09, 0.14], [0.09, 0.14], [-0.09, -0.14], [0.09, -0.14]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.2, z);
    leg.add(at(mesh(new THREE.CapsuleGeometry(0.04, 0.1, 6, 10), light), 0, -0.1, 0));
    g.add(leg);
    legs.push(leg);
  }
  const tail = taper([[0, 0.34, -0.26], [0, 0.46, -0.36], [0, 0.56, -0.34]], 0.045, 0.025, fur);
  g.add(tail);
  g.userData = { head, tail, legs };
  return outline(g);
}

/** Zieht dem Helden die gewählte Kleidung an (Standard: türkise Jacke und orange Mütze). */
export function applyOutfit(hero: THREE.Group, outfit: Record<string, string>): void {
  const acc = (hero.userData as HeroParts).acc;
  const color = (slot: string) => {
    const id = outfit[slot];
    return id ? itemById(id).color : undefined;
  };
  hero.traverse((o) => {
    const slot = o.userData.slot as string | undefined;
    if (!(o instanceof THREE.Mesh) || !slot) return;
    (o.material as THREE.MeshStandardMaterial).color.setHex(color(slot) ?? DEFAULT_COLORS[slot] ?? 0xffffff);
    if (slot === 'cap') o.visible = !!outfit.cap && outfit.acc !== 'acc-crown';
  });
  hero.traverse((o) => {
    if (o.userData.hat) o.visible = !!outfit.cap && outfit.acc !== 'acc-crown';
  });
  for (const [id, obj] of Object.entries(acc)) obj.visible = outfit.acc === id;
}

const LEAF_COLORS = [0x58b848, 0xa8cf4a, 0xe8a23d, 0x6fcf9a];

/** Korok: kleiner Waldgeist mit Holzkörper, heller Maske und großem Blatt auf dem Kopf. */
export function createKorok(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x9b7a45;
  g.add(at(mesh(new THREE.SphereGeometry(0.22, 24, 20), wood), 0, 0.28, 0));
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12), wood);
    arm.position.set(s * 0.26, 0.3, 0);
    arm.rotation.z = s * 0.7;
    g.add(arm);
    g.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), wood), s * 0.09, 0.07, 0));
  }
  const head = new THREE.Group();
  head.position.y = 0.72;
  head.add(mesh(new THREE.SphereGeometry(0.4, 36, 28), 0xf3efdc));
  const dark = 0x222222;
  const v = variant % 3;
  for (const s of [-1, 1]) {
    const eye = eyeBall(v === 1 ? 0.045 : 0.07, dark);
    eye.scale.set(1, v === 1 ? 0.35 : 1.5, 0.4);
    eye.position.set(s * 0.15, 0.06, 0.36);
    head.add(eye);
  }
  const mouth = eyeBall(0.07, dark);
  mouth.scale.set(v === 2 ? 1.8 : 1, v === 2 ? 0.7 : 1.3, 0.4);
  mouth.position.set(0, -0.15, 0.36);
  head.add(mouth);
  // Blatt oben auf dem Kopf (dreht sich leicht wie ein Windrad)
  const leaf = new THREE.Group();
  leaf.position.y = 0.38;
  const color = LEAF_COLORS[variant % LEAF_COLORS.length];
  for (let i = 0; i < 3; i++) {
    const blade = mesh(new THREE.SphereGeometry(0.2, 20, 16), color);
    blade.scale.set(1.5, 0.15, 0.7);
    blade.position.set(Math.cos((i * 2 * Math.PI) / 3) * 0.2, 0, Math.sin((i * 2 * Math.PI) / 3) * 0.2);
    blade.rotation.y = -(i * 2 * Math.PI) / 3;
    leaf.add(blade);
  }
  head.add(leaf);
  g.add(head);
  g.userData = { leaf, head };
  return outline(g);
}

export function createTablet(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(1.6, 2.2, 0.35), 0x9a9aa6), 0, 1.1, 0));
  g.add(at(mesh(new THREE.BoxGeometry(1.9, 0.3, 0.6), 0x80808c), 0, 0.15, 0));
  const rune = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 16, 40), new THREE.MeshBasicMaterial({ color: 0x66e0ff }));
  rune.position.set(0, 1.3, 0.2);
  g.add(rune);
  return g;
}

export function createBridgeSign(): THREE.Group {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 12), 0x8a5a2b), s * 1.1, 0.75, 0));
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue;
    g.add(at(mesh(new THREE.BoxGeometry(0.42, 0.1, 1.2), 0xc58b4a), -0.9 + i * 0.45, 0.2, 0));
  }
  return g;
}

/** Baubare Objekte des Rubin-Ladens. */
export function createBuildItem(id: string): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x8a5a2b;
  switch (id) {
    case 'flower':
      return createFlower();
    case 'fence':
      for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), wood), -0.9 + i * 0.6, 0.4, 0));
      for (const y of [0.3, 0.6]) g.add(at(mesh(new THREE.BoxGeometry(1.9, 0.1, 0.08), 0xc58b4a), 0, y, 0));
      break;
    case 'bush':
      return createBush();
    case 'lantern':
      g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 12), 0x555555), 0, 0.7, 0));
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffe066 })), 0, 1.55, 0));
      break;
    case 'tree':
      return createTree(() => 0.5);
    case 'flag':
      g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 12), wood), 0, 1, 0));
      g.add(at(mesh(new THREE.BoxGeometry(0.8, 0.5, 0.03), 0xe8546b), 0.4, 1.7, 0));
      break;
    case 'chest':
      g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), 0x9a5a2b), 0, 0.25, 0));
      {
        const lid = at(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 24, 1, false, 0, Math.PI), 0xb06a33), 0, 0.5, 0);
        lid.rotation.z = Math.PI / 2;
        g.add(lid);
      }
      g.add(at(mesh(new THREE.BoxGeometry(0.1, 0.14, 0.06), 0xffd24d), 0, 0.5, 0.29));
      break;
    case 'statue': {
      g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), 0x9a9aa6), 0, 0.15, 0));
      const k = createKorok(0);
      k.scale.setScalar(1.3);
      k.position.y = 0.3;
      k.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) o.material.color.setHex(0xb8b8c4);
      });
      g.add(k);
      break;
    }
    case 'fountain':
      g.add(at(mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.4, 32), 0x9a9aa6), 0, 0.2, 0));
      g.add(at(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.42, 32), 0x66c8ff), 0, 0.22, 0));
      g.add(at(mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.0, 16), 0x9a9aa6), 0, 0.7, 0));
      g.add(at(mesh(new THREE.SphereGeometry(0.28, 20, 16), 0x9ad8ff), 0, 1.3, 0));
      break;
    case 'house':
      return createHouse();
  }
  return g;
}

export function createTool(id: string): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x8a5a2b, steel = 0xd7dde6;
  if (id === 'sword') {
    g.add(at(mesh(new THREE.BoxGeometry(0.09, 0.75, 0.025), steel), 0, 0.5, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), 0x2a4b9b), 0, 0.12, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), wood), 0, 0, 0));
  } else if (id === 'axe') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12), wood), 0, 0.35, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.34, 0.24, 0.05), steel), 0.15, 0.72, 0));
  } else {
    g.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12), wood), 0, 0.35, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.26, 0.3, 0.04), steel), 0, 0.85, 0));
  }
  return g;
}

/** Gallert-Gegner im Stil kleiner Schleimwesen. */
export function createSlime(color: number): THREE.Group & { userData: { body: THREE.Mesh } } {
  const g = new THREE.Group() as THREE.Group & { userData: { body: THREE.Mesh } };
  const mat = toon(color);
  mat.transparent = true;
  mat.opacity = 0.88;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), mat);
  body.castShadow = true;
  body.position.y = 0.45;
  body.scale.set(1, 0.85, 1);
  g.add(body);
  g.add(at(mesh(new THREE.ConeGeometry(0.14, 0.3, 16), color), 0, 1.05, 0));
  for (const s of [-1, 1]) {
    const eye = eyeBall(0.1, 0xffffff);
    eye.position.set(s * 0.2, 0.55, 0.45);
    const pupil = eyeBall(0.05, 0x222222);
    pupil.position.set(0, 0, 0.07);
    eye.add(pupil);
    g.add(eye);
  }
  g.userData = { body };
  return g;
}

/** Gemütlicher, sitzender Hund auf einem Kissen. */
export function createDog(): THREE.Group {
  const g = new THREE.Group();
  const fur = 0xd9a05b, light = 0xf3dcb4, dark = 0x7a4a24;
  const cushion = ellipsoid(0.7, 1, 0.22, 1, 0xc4524a);
  g.add(at(cushion, 0, 0.12, 0));
  g.add(at(ellipsoid(0.42, 1, 1.15, 0.95, fur), 0, 0.62, 0));
  g.add(at(ellipsoid(0.28, 1, 1.1, 0.7, light), 0, 0.58, 0.28));
  for (const x of [-0.2, 0.2]) {
    g.add(at(ellipsoid(0.13, 0.9, 1.5, 1.2, fur), x, 0.32, 0.38));
    g.add(at(ellipsoid(0.12, 1, 0.6, 1.5, light), x, 0.2, 0.46));
  }
  const head = new THREE.Group();
  head.add(ellipsoid(0.33, 1, 0.92, 0.95, fur));
  head.add(at(ellipsoid(0.17, 1, 0.75, 1.1, light), 0, -0.09, 0.27));
  head.add(at(ellipsoid(0.065, 1.2, 0.8, 1, 0x2b1b12), 0, -0.02, 0.43));
  for (const x of [-0.12, 0.12]) {
    head.add(at(eyeBall(0.045, 0x2b1b12), x, 0.07, 0.29));
    const ear = ellipsoid(0.12, 0.7, 1.7, 0.5, dark);
    ear.rotation.z = x < 0 ? 0.25 : -0.25;
    head.add(at(ear, x * 2.4, 0.05, -0.02));
  }
  g.add(at(head, 0, 1.12, 0.12));
  const tail = taper([[0, 0.25, -0.4], [0.3, 0.2, -0.65], [0.55, 0.4, -0.55]], 0.09, 0.05, fur);
  g.add(tail);
  g.userData = { head, tail };
  return outline(g);
}

/** Bauarbeiter mit Helm und kleiner Zahlenmauer. */
export function createBuilder(): THREE.Group {
  const g = new THREE.Group();
  const skin = 0xf0c39a;
  g.add(at(ellipsoid(0.42, 1, 1.2, 0.85, 0xf2a22e), 0, 0.85, 0));
  g.add(at(ellipsoid(0.44, 1.02, 0.35, 0.88, 0x3b5bc4), 0, 0.35, 0));
  for (const x of [-0.2, 0.2]) g.add(at(ellipsoid(0.14, 1, 1.5, 1, 0x3b5bc4), x, 0.2, 0.02));
  for (const x of [-0.5, 0.5]) g.add(at(ellipsoid(0.12, 0.9, 1.6, 0.9, 0xf2a22e), x, 0.9, 0.05));
  const head = new THREE.Group();
  head.add(ellipsoid(0.32, 1, 0.95, 0.95, skin));
  head.add(at(ellipsoid(0.36, 1, 0.6, 1, 0xffd23a), 0, 0.17, 0));
  head.add(at(ellipsoid(0.42, 1, 0.12, 1.1, 0xffd23a), 0, 0.1, 0.05));
  head.add(at(ellipsoid(0.07, 1, 0.8, 0.8, 0xd98a6a), 0, -0.04, 0.3));
  for (const x of [-0.12, 0.12]) head.add(at(eyeBall(0.045, 0x2b1b12), x, 0.0, 0.27));
  head.add(at(ellipsoid(0.2, 1.1, 0.45, 0.6, 0x6b4a2b), 0, -0.2, 0.2));
  g.add(at(head, 0, 1.65, 0));
  const bricks: [number, number, number, number][] = [[-0.42, 0.1, 0xd1644a, 0], [0.0, 0.1, 0xe0795c, 0], [-0.21, 0.32, 0xc4523a, 0]];
  const wall = new THREE.Group();
  for (const [x, y, col] of bricks) wall.add(at(mesh(new THREE.BoxGeometry(0.4, 0.2, 0.25), col), x, y, 0));
  g.add(at(wall, 1.0, 0, 0.3));
  g.userData = { head };
  return outline(g);
}

/** Baustelle: Platte, fertige Wände, eine halb gemauerte Wand, Gerüst und Material. Vorderseite = +z. */
export function createConstructionSite(): THREE.Group {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, col: number, x: number, y: number, z: number): void => {
    g.add(at(mesh(new THREE.BoxGeometry(w, h, d), col), x, y, z));
  };
  box(6.4, 0.2, 5.2, 0xb8b4aa, 0, 0.1, 0);
  box(6, 2.4, 0.35, 0xe8d8b8, 0, 1.4, -2.3);
  box(0.35, 1.9, 4.4, 0xe8d8b8, -2.9, 1.15, 0);
  box(1.4, 0.5, 0.36, 0x6a8fb8, -1.2, 1.5, -2.3);
  // Unfertige Wand rechts: unten fest, darüber Ziegelreihen, die nach vorn treppenartig enden
  box(0.35, 0.8, 4.4, 0xc4523a, 2.9, 0.6, 0);
  const rows = [8, 6, 4, 2];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const off = r % 2 ? 0.22 : 0;
      g.add(at(mesh(new THREE.BoxGeometry(0.35, 0.22, 0.5), i % 3 ? 0xd1644a : 0xc4523a), 2.9, 1.11 + r * 0.23, -2.1 + i * 0.52 + off));
    }
  });
  // Gerüst an der Vorderseite
  for (const x of [-2.6, 0.2, 2.6]) g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), 0x9a9a9a), x, 1.8, 2.9));
  for (const y of [1.2, 2.4]) {
    box(5.6, 0.1, 0.1, 0x9a9a9a, 0, y, 2.9);
    box(5.8, 0.12, 0.9, 0xb98a4a, 0, y + 0.06, 2.45);
  }
  // Dachbalken und Material
  for (const x of [-1.6, 0, 1.6]) box(0.18, 0.18, 4.6, 0x9a6a3a, x, 2.7, 0);
  box(1.0, 0.25, 0.7, 0xb98a4a, 1.0, 0.32, 1.5);
  for (let k = 0; k < 3; k++) box(0.8, 0.22, 0.45, 0xd1644a, 1.0, 0.56 + k * 0.22, 1.5);
  g.add(at(mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.4, 12), 0x4a7ab8), -1.5, 0.4, 1.8));
  return outline(g);
}

export function createStall(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(2.2, 0.8, 0.8), 0xb97a3e), 0, 0.4, 0.6));
  for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.BoxGeometry(0.56, 0.08, 1.6), i % 2 ? 0xffffff : 0x3f9e4a), -0.82 + i * 0.55, 2.0, 0.2));
  for (const x of [-1.05, 1.05]) g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 12), 0x8a5a2b), x, 1.0, -0.4));
  g.add(at(mesh(new THREE.OctahedronGeometry(0.22), 0x38d46b), -0.5, 0.95, 0.6));
  g.add(at(mesh(new THREE.OctahedronGeometry(0.22), 0x4aa8ff), 0, 0.95, 0.6));
  g.add(at(mesh(new THREE.OctahedronGeometry(0.22), 0xe8546b), 0.5, 0.95, 0.6));
  return g;
}

/** Wegweiser auf dem Marktplatz: ein Brett je Welt. */
export function createSignpost(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 16), 0x8a5a2b), 0, 1.3, 0));
  const boards: [number, number][] = [[0xe8f0ff, 1], [0x58b848, -1], [0xf0b84a, 1], [0x8a6ab0, -1]];
  boards.forEach(([c, dir], i) => {
    const b = at(mesh(new THREE.BoxGeometry(1.2, 0.3, 0.06), c), dir * 0.5, 2.3 - i * 0.42, 0.1);
    g.add(b);
  });
  return g;
}

export function createSparkle(): THREE.Mesh {
  return new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
}

export function createHole(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 28), new THREE.MeshBasicMaterial({ color: 0x2c1e12 })), 0, 0.03, 0));
  const rim = mesh(new THREE.TorusGeometry(0.55, 0.12, 12, 28), 0x7a5230);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  g.add(rim);
  return g;
}

export type Biome = Op;
