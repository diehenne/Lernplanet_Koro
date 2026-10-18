import * as THREE from 'three';
import { createBuildItem, createKorok, toon } from './characters';
import { blob, soft } from './nature';
import { plankTexture } from './textures';

export interface Obstacle {
  x: number;
  z: number;
  r: number;
  h: number;
  kind?: 'tree' | 'solid';
  obj?: THREE.Object3D;
}

export interface Interior {
  group: THREE.Group;
  obstacles: Obstacle[];
  /** Begehbarer Bereich (Mitte ± Halbbreite). */
  bounds: { x0: number; x1: number; z0: number; z1: number };
  spawn: { x: number; z: number };
  exit: { x: number; z: number };
  chest: { id: string; x: number; z: number };
}

const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
  o.position.set(x, y, z);
  return o;
};

/** Innenraum eines Hauses; die Vorderseite bleibt offen, damit die Kamera hineinsehen kann. */
export function buildInterior(ox: number, key: string): Interior {
  const group = new THREE.Group();
  const obstacles: Obstacle[] = [];
  const solid = (x: number, z: number, r: number, h = 1) => obstacles.push({ x, z, r, h, kind: 'solid' });

  const wood = 0x8a5a2b, cream = 0xf2e2b8;
  const add = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => { group.add(at(o, x, y, z)); return o; };

  // Dielenboden
  const floorMat = toon(0xd2a468);
  const tex = plankTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(2, 1.6);
  floorMat.map = tex;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 7), floorMat);
  floor.receiveShadow = true;
  add(floor, ox, -0.1, 0);

  // Runder Teppich mit Rand
  // Deutlich gestaffelte Höhen, sonst flackern gleich hohe Flächen (Z-Fighting)
  ([[1.9, 0x8f2f2a], [1.7, 0xc2453a], [1.25, 0xe8b04a], [1.1, 0xc2453a]] as [number, number][]).forEach(([r, c], k) => {
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 36), toon(c));
    rug.receiveShadow = true;
    add(rug, ox, 0.03 + k * 0.02, 0.4);
  });

  // Wände mit Holzsockel, Leisten und Balken
  add(soft(9.4, 2.8, 0.3, cream, 0.05), ox, 1.4, -3.65);
  add(soft(0.3, 2.8, 7.3, 0xe6d3a0, 0.05), ox - 4.65, 1.4, 0);
  add(soft(0.3, 2.8, 7.3, 0xe6d3a0, 0.05), ox + 4.65, 1.4, 0);
  add(soft(9.0, 0.9, 0.1, 0xb98a55, 0.03), ox, 0.45, -3.45);
  add(soft(9.0, 0.08, 0.14, wood, 0.02), ox, 0.92, -3.42);
  add(soft(9.0, 0.12, 0.14, wood, 0.02), ox, 2.72, -3.45);
  for (const dx of [-4.4, -1.5, 1.5, 4.4]) add(soft(0.16, 2.6, 0.12, wood, 0.02), ox + dx, 1.4, -3.45);
  add(soft(0.1, 0.9, 6.8, 0xb98a55, 0.03), ox - 4.45, 0.45, 0);
  add(soft(0.1, 0.9, 6.8, 0xb98a55, 0.03), ox + 4.45, 0.45, 0);

  // Fenster mit Rahmen, Scheibe (leuchtend), Kreuz und Gardinen
  add(soft(1.6, 1.3, 0.1, 0xfff4dc, 0.04), ox + 1.2, 1.65, -3.42);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, 0.06), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x9ad8ff, emissiveIntensity: 0.7, roughness: 0.25 }));
  add(glass, ox + 1.2, 1.65, -3.38);
  add(soft(0.07, 1.05, 0.06, 0xfff4dc, 0.01), ox + 1.2, 1.65, -3.33);
  add(soft(1.35, 0.07, 0.06, 0xfff4dc, 0.01), ox + 1.2, 1.65, -3.33);
  for (const s of [-1, 1]) add(soft(0.38, 1.4, 0.05, 0xe8546b, 0.02), ox + 1.2 + s * 0.85, 1.65, -3.3);
  add(soft(1.9, 0.06, 0.1, wood, 0.02), ox + 1.2, 2.4, -3.3);

  // Bett mit Gestell, Decke, Kissen
  add(soft(2.3, 0.4, 1.3, wood, 0.05), ox - 3.3, 0.25, -2.7);
  add(soft(0.16, 1.1, 1.3, wood, 0.04), ox - 4.35, 0.6, -2.7);
  add(blob(0.55, 0x6fb4e8, 3, { lump: 0.08, squash: 0.35, detail: 2 }), ox - 3.0, 0.62, -2.7).scale.x = 1.7;
  add(blob(0.3, 0xffffff, 4, { lump: 0.1, squash: 0.55, detail: 2 }), ox - 4.0, 0.72, -2.7).scale.z = 1.4;
  solid(ox - 3.3, -2.7, 1.2, 0.7);

  // Tisch mit Tuch, Hocker, Kerze und Blume
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 28), toon(0xb97a3e)), ox - 1.0, 0.8, -1.2).castShadow = true;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.02, 28), toon(0xfff4dc)), ox - 1.0, 0.85, -1.2);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 12), toon(wood)), ox - 1.0, 0.4, -1.2).castShadow = true;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20), toon(wood)), ox - 1.0, 0.03, -1.2);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.14, 14), toon(0x6fb4e8)), ox - 0.8, 0.93, -1.2);
  add(blob(0.07, 0xff6b9a, 8, { lump: 0.1, detail: 1 }), ox - 0.8, 1.06, -1.2);
  for (const dx of [-1.15, 0.2]) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.44, 16), toon(wood)), ox - 1.0 + dx, 0.22, -0.4).castShadow = true;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), toon(0xe8546b)), ox - 1.0 + dx, 0.46, -0.4);
  }
  solid(ox - 1.0, -1.2, 0.85, 0.9);

  // Bücherregal an der Seitenwand
  add(soft(0.1, 2.2, 1.6, 0x7d5230, 0.03), ox + 4.38, 1.1, 0.8);
  for (const z of [0.0, 1.6]) add(soft(0.5, 2.2, 0.08, 0x7d5230, 0.02), ox + 4.2, 1.1, z);
  add(soft(0.5, 0.08, 1.7, 0x7d5230, 0.02), ox + 4.2, 2.2, 0.8);
  for (const y of [0.55, 1.05, 1.55]) add(soft(0.46, 0.05, 1.5, 0x9a6a3e, 0.01), ox + 4.2, y, 0.8);
  const bookColors = [0xe8546b, 0x4f9ee8, 0xffd24d, 0x6cc24a, 0xb070e0];
  for (const [i, y] of [0.3, 0.8, 1.3, 1.8].entries()) {
    for (let k = 0; k < 6; k++) add(soft(0.3, 0.32 + (k % 3) * 0.04, 0.1, bookColors[(i + k) % 5], 0.01), ox + 4.2, y + 0.2, 0.2 + k * 0.22);
  }
  solid(ox + 4.0, 0.8, 0.8, 1.5);

  // Hängelampe mit warmem Licht
  const lamp = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshBasicMaterial({ color: 0xffe9a8 })), ox, 2.4, 0.4);
  lamp.userData.noOutline = true;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), toon(0x333333)), ox, 2.7, 0.4);
  const light = new THREE.PointLight(0xffd9a0, 6, 9, 1.6);
  add(light, ox, 2.2, 0.4);

  // Topfpflanze
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.3, 14), toon(0xc2653a)), ox - 4.1, 0.15, 1.8).castShadow = true;
  add(blob(0.3, 0x4fb35a, 12, { lump: 0.3, squash: 1.1, detail: 2 }), ox - 4.1, 0.55, 1.8);

  // Truhe und Bewohner
  const chest = createBuildItem('chest');
  chest.position.set(ox + 3.2, 0, -2.8);
  group.add(chest);
  solid(ox + 3.2, -2.8, 0.55, 0.6);
  const korok = createKorok(2);
  korok.position.set(ox + 0.3, 0, -2.6);
  korok.userData.interior = true;
  group.add(korok);
  solid(ox + 0.3, -2.6, 0.4, 1);

  // Fußmatte mit Ausgangsring
  add(soft(1.8, 0.04, 0.9, 0x7a4a22, 0.01), ox, 0.02, 3.0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 28), new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(ox, 0.06, 3.0);
  group.add(ring);

  return {
    group,
    obstacles,
    bounds: { x0: ox - 4.2, x1: ox + 4.2, z0: -3.2, z1: 3.3 },
    spawn: { x: ox, z: 1.2 },
    exit: { x: ox, z: 3.0 },
    chest: { id: `hk-${key}`, x: ox + 3.2, z: -2.8 },
  };
}
