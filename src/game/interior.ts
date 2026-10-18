import * as THREE from 'three';
import { createBuildItem, createKorok, mesh, toon } from './characters';

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

  const floor = mesh(new THREE.BoxGeometry(9, 0.2, 7), 0xc79a5b);
  floor.position.set(ox, -0.1, 0);
  floor.receiveShadow = true;
  group.add(floor);
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.03, 24), toon(0xc2453a));
  rug.position.set(ox, 0.02, 0.4);
  rug.receiveShadow = true;
  group.add(rug);

  group.add(at(mesh(new THREE.BoxGeometry(9.4, 2.8, 0.3), 0xf2e2b8), ox, 1.4, -3.65));
  group.add(at(mesh(new THREE.BoxGeometry(0.3, 2.8, 7.3), 0xe6d3a0), ox - 4.65, 1.4, 0));
  group.add(at(mesh(new THREE.BoxGeometry(0.3, 2.8, 7.3), 0xe6d3a0), ox + 4.65, 1.4, 0));
  group.add(at(mesh(new THREE.BoxGeometry(1.3, 1.0, 0.1), 0x9ad8ff), ox + 1.2, 1.6, -3.46));
  group.add(at(mesh(new THREE.BoxGeometry(1.5, 1.2, 0.08), 0x8a5a2b), ox + 1.2, 1.6, -3.5));

  // Bett
  group.add(at(mesh(new THREE.BoxGeometry(2.2, 0.4, 1.2), 0x8a5a2b), ox - 3.3, 0.25, -2.7));
  group.add(at(mesh(new THREE.BoxGeometry(2.0, 0.25, 1.1), 0x6fb4e8), ox - 3.3, 0.55, -2.7));
  group.add(at(mesh(new THREE.BoxGeometry(0.6, 0.18, 0.9), 0xffffff), ox - 4.0, 0.76, -2.7));
  solid(ox - 3.3, -2.7, 1.2, 0.7);

  // Tisch mit Hockern
  group.add(at(mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16), 0xb97a3e), ox - 1.0, 0.8, -1.2));
  group.add(at(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8), 0x8a5a2b), ox - 1.0, 0.4, -1.2));
  for (const dx of [-1.15, 0.2]) group.add(at(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.45, 10), 0x8a5a2b), ox - 1.0 + dx, 0.22, -0.4));
  solid(ox - 1.0, -1.2, 0.85, 0.9);

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
  group.add(at(mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), 0x7a4a22), ox, 0.02, 3.0));
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
