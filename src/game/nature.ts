import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from './characters';

const fract = (x: number): number => x - Math.floor(x);
const h3 = (x: number, y: number, z: number, s: number): number => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.19) * 43758.5453);

/** Weiches 3D-Value-Noise. */
function noise(x: number, y: number, z: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const fx = f(x - xi), fy = f(y - yi), fz = f(z - zi);
  const l = THREE.MathUtils.lerp;
  const c = (a: number, b: number, d: number) => h3(xi + a, yi + b, zi + d, s);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

function setup<T extends THREE.Mesh>(m: T, shadow = true): T {
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function vcolMat(color: number): THREE.MeshStandardMaterial {
  const m = toon(color);
  m.vertexColors = true;
  return m;
}

/** Unregelmäßiger, weicher Klumpen (Laub, Büsche, Felsen) mit Farbverlauf unten dunkel → oben hell. */
export function blob(radius: number, color: number, seed: number, opts: { lump?: number; squash?: number; flat?: boolean; detail?: number } = {}): THREE.Mesh {
  const { lump = 0.28, squash = 1, flat = false, detail = 3 } = opts;
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(radius, detail);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = noise(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6, seed) * 0.7 + noise(v.x * 3.7, v.y * 3.7 + seed, v.z * 3.7, seed) * 0.3;
    const r = radius * (1 + (n - 0.5) * 2 * lump);
    p.setXYZ(i, v.x * r, v.y * r * squash, v.z * r);
    const k = 0.72 + 0.4 * (v.y * 0.5 + 0.5) + (n - 0.5) * 0.2;
    cols.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  if (flat) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return setup(new THREE.Mesh(geo, vcolMat(color)));
}

const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => { o.position.set(x, y, z); return o; };

/** Gekrümmter, nach oben verjüngter Stamm mit Wurzelanlauf. */
function trunk(h: number, r0: number, r1: number, color: number, bend = 0.12): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r1, r0, h, 14, 8, true);
  const p = geo.attributes.position;
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + h / 2) / h;
    const flare = 1 + Math.pow(1 - t, 6) * 0.9;
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const rough = 1 + (noise(a * 2, t * 6, 0, 3) - 0.5) * 0.18;
    p.setX(i, p.getX(i) * flare * rough + Math.sin(t * Math.PI) * bend);
    p.setZ(i, p.getZ(i) * flare * rough);
    const k = 0.8 + t * 0.25 + (noise(a * 3, t * 10, 1, 5) - 0.5) * 0.25;
    cols.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return setup(new THREE.Mesh(geo, vcolMat(color)));
}

export function createTree(rng: () => number, snow = false): THREE.Group {
  const g = new THREE.Group();
  const seed = Math.floor(rng() * 1000);
  const h = 1.3 + rng() * 0.8;
  g.add(put(trunk(h, 0.3, 0.16, 0x7d5230), 0, h / 2, 0));
  const greens = snow ? [0x4f8f6a, 0x5aa078, 0x3f7f5a] : [0x3f9e4a, 0x52b85c, 0x2f8a52];
  // Lockere, gestufte Tannenform aus mehreren Laubklumpen.
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = 1.5 - t * 0.95;
    const y = h + 0.1 + i * 0.58;
    const n = i === tiers - 1 ? 1 : 3;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2 + i * 1.1 + rng() * 0.5;
      const off = n === 1 ? 0 : r * 0.38;
      const b = blob(r * (n === 1 ? 0.8 : 0.72), greens[(i + j) % 3], seed + i * 7 + j, { lump: 0.22, squash: 0.62 });
      g.add(put(b, Math.cos(a) * off, y + rng() * 0.1, Math.sin(a) * off));
      if (snow) {
        const cap = blob(r * 0.6, 0xffffff, seed + i * 11 + j, { lump: 0.15, squash: 0.35 });
        g.add(put(cap, Math.cos(a) * off, y + r * 0.32, Math.sin(a) * off));
      }
    }
  }
  return g;
}

export function createFruitTree(): THREE.Group {
  const g = new THREE.Group();
  g.add(put(trunk(1.7, 0.36, 0.2, 0x7d5230, 0.2), 0, 0.85, 0));
  const spots: [number, number, number, number][] = [[0, 2.5, 0, 1.0], [0.8, 2.15, 0.2, 0.75], [-0.75, 2.2, -0.15, 0.75], [0.1, 2.2, 0.8, 0.7], [-0.1, 2.3, -0.8, 0.7], [0.1, 3.05, 0.1, 0.6]];
  spots.forEach(([x, y, z, r], i) => g.add(put(blob(r, [0x4fb35a, 0x5ec06a, 0x44a552][i % 3], 40 + i, { lump: 0.2, squash: 0.85 }), x, y, z)));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, rr = 0.9 + (i % 3) * 0.15;
    const f = blob(0.14, i % 2 ? 0xe8546b : 0xffc94d, i, { lump: 0.05, detail: 2 });
    g.add(put(f, Math.cos(a) * rr, 1.9 + (i % 4) * 0.3, Math.sin(a) * rr));
  }
  return g;
}

export function createMushroom(color = 0xe8546b): THREE.Group {
  const g = new THREE.Group();
  const one = (s: number, x: number, z: number, tilt: number): THREE.Group => {
    const m = new THREE.Group();
    const stem = setup(new THREE.Mesh(new THREE.LatheGeometry([[0.17, 0], [0.12, 0.08], [0.1, 0.25], [0.12, 0.4], [0, 0.4]].map(([x, y]) => new THREE.Vector2(x, y)), 18), toon(0xfff0d0)));
    m.add(stem);
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 0.5;
      pts.push(new THREE.Vector2(Math.sin(a) * 0.42 * (1 + 0.1 * Math.sin(a * 2)), Math.cos(a) * 0.26));
    }
    pts.push(new THREE.Vector2(0.4, -0.01), new THREE.Vector2(0.1, 0.0));
    const cap = setup(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), toon(color)));
    cap.position.y = 0.36;
    m.add(cap);
    for (let i = 0; i < 6; i++) {
      const a = i * 2.2, pol = 0.35 + (i % 3) * 0.3;
      const sp = setup(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), toon(0xffffff)), false);
      sp.scale.y = 0.4;
      sp.position.set(Math.cos(a) * 0.38 * Math.sin(pol * 1.2), 0.36 + Math.cos(pol * 1.2) * 0.26, Math.sin(a) * 0.38 * Math.sin(pol * 1.2));
      m.add(sp);
    }
    m.scale.setScalar(s);
    m.position.set(x, 0, z);
    m.rotation.set(tilt, 0, -tilt);
    return m;
  };
  g.add(one(1, 0, 0, 0.05), one(0.6, 0.38, 0.12, 0.2), one(0.45, -0.3, 0.25, -0.15));
  return g;
}

export function createRock(rng: () => number, color = 0x9aa6b5): THREE.Group {
  const g = new THREE.Group();
  const s = 0.6 + rng() * 0.9;
  const seed = Math.floor(rng() * 1000);
  const r = blob(s, color, seed, { lump: 0.38, squash: 0.75, flat: true, detail: 1 });
  r.position.y = s * 0.45;
  r.rotation.y = rng() * 6;
  g.add(r);
  const moss = blob(s * 0.55, 0x6fae4a, seed + 3, { lump: 0.3, squash: 0.3, detail: 2 });
  g.add(put(moss, s * 0.1, s * 0.78, 0));
  const small = blob(s * 0.35, color, seed + 9, { lump: 0.35, squash: 0.7, flat: true, detail: 1 });
  g.add(put(small, s * 1.05, s * 0.15, s * 0.3));
  return g;
}

export function createMountain(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const h = 4 + rng() * 4;
  const seed = Math.floor(rng() * 1000);
  let geo: THREE.BufferGeometry = new THREE.ConeGeometry(2.6 + rng(), h, 9, 10, true);
  const p = geo.attributes.position;
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + h / 2) / h;
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const k = 1 + (noise(a * 1.5 + seed, t * 4, 0, seed) - 0.5) * 0.55 * (1 - t);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
    p.setY(i, p.getY(i) + (noise(a * 2, t * 5, 4, seed) - 0.5) * 0.5 * (1 - t));
    const snow = t > 0.68 ? 1 : 0;
    const c = new THREE.Color(0x8d9bb0).lerp(new THREE.Color(0xffffff), snow * Math.min(1, (t - 0.68) * 8)).multiplyScalar(0.85 + t * 0.2);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const m = toon(0xffffff);
  m.vertexColors = true;
  g.add(put(setup(new THREE.Mesh(geo, m)), 0, h / 2, 0));
  return g;
}

export function createLily(): THREE.Group {
  const g = new THREE.Group();
  const pad = setup(new THREE.Mesh(new THREE.CircleGeometry(0.55, 28, 0.4, Math.PI * 2 - 0.4), toon(0x3f9e6a)), false);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.04;
  g.add(pad);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pet = setup(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon(i % 2 ? 0xff9ecb : 0xffc2dd)), false);
    pet.scale.set(0.5, 1.1, 0.25);
    pet.position.set(Math.cos(a) * 0.1 + 0.1, 0.16, Math.sin(a) * 0.1 + 0.05);
    pet.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
    g.add(pet);
  }
  g.add(put(blob(0.05, 0xffd24d, 1, { lump: 0.05, detail: 1 }), 0.1, 0.14, 0.05));
  return g;
}

export function createFlower(): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xff6b9a, 0xffd24d, 0xffffff, 0xb58cff];
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.28, z = ((i * 7) % 3 - 1) * 0.12, h = 0.4 + (i % 3) * 0.1;
    const f = new THREE.Group();
    const stem = setup(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, h, 8), toon(0x3f9e4a)), false);
    stem.position.y = h / 2;
    f.add(stem);
    const leaf = setup(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0x4fb35a)), false);
    leaf.scale.set(1.6, 0.3, 0.7);
    leaf.position.set(0.09, h * 0.35, 0);
    leaf.rotation.z = 0.5;
    f.add(leaf);
    const petals = 6;
    for (let k = 0; k < petals; k++) {
      const a = (k / petals) * Math.PI * 2;
      const pet = setup(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), toon(colors[i])), false);
      pet.scale.set(1.1, 0.35, 0.6);
      pet.position.set(Math.cos(a) * 0.09, h + 0.02, Math.sin(a) * 0.09);
      pet.rotation.y = -a;
      f.add(pet);
    }
    f.add(put(setup(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), toon(0xffb020)), false), 0, h + 0.04, 0));
    f.position.set(x, 0, z);
    f.rotation.z = (i % 2 ? 1 : -1) * 0.06;
    g.add(f);
  }
  return g;
}

export function createBush(): THREE.Group {
  const g = new THREE.Group();
  const spots: [number, number, number][] = [[0, 0, 0.5], [0.42, 0.1, 0.38], [-0.38, 0.08, 0.4], [0.05, -0.3, 0.32]];
  spots.forEach(([x, z, r], i) => g.add(put(blob(r, [0x3f9e4a, 0x4fb35a, 0x35934a][i % 3], 70 + i, { lump: 0.25, squash: 0.85 }), x, r * 0.7, z)));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.7;
    g.add(put(blob(0.05, 0xe8546b, i, { lump: 0.05, detail: 1 }), Math.cos(a) * 0.45, 0.4 + (i % 3) * 0.1, Math.sin(a) * 0.45));
  }
  return g;
}
