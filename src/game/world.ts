import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { groundTexture, groundBump, pathTexture } from './textures';
import { sfx } from '../ui/sfx';
import type { Op, Profile } from '../core/types';
import { OPS } from '../core/types';
import { AREAS, BIOME_CENTER, DOG_STATION, WALL_STATION, ENGLISH, GRID, GRID_Z, X0, X1, Z0, Z1, areaAt, areaById, areaStations, portalStations, HUB_SPAWN, biomeAt, cellOf, extraStations, heightAt, villageOf, type Station } from '../core/layout';
import { chestLoot, treasureLoot, type Loot } from '../core/loot';
import { earn } from '../core/money';
import { addItem, bagSize, itemById, pickUp, place } from '../core/shop';
import { de } from '../i18n/de';
import type { Cmd, InputState } from './input';
import {
  createBridgeSign, createBuilder, createBuildItem, createCactus, createDeadTree, createDog, createPuppy, createFruitTree, createHero, createHole, createKorok,
  createLily, createMountain, createMushroom, createRock, createSignpost, createSlime, createSparkle, createStall,
  createTablet, createTool, createTree, createHouse, applyOutfit, toon,
} from './characters';
import { createFlower, createBush, createLantern, createBunting } from './nature';
import { PostFX } from './post';
import { Grass } from './grass';
import { buildInterior, type Interior, type Obstacle } from './interior';

const SKY_TINT = new THREE.Color(0.62, 0.8, 1.15);
export type { Station } from '../core/layout';
export type ActionKind = 'place' | 'open' | 'talk' | 'sword' | 'axe' | 'shovel' | null;
export interface Ctx {
  action: ActionKind;
  pickup: boolean;
}

interface Theme {
  ground: number;
  sky: number;
  sun: number;
}
const THEMES: Record<Op, Theme> = {
  add: { ground: 0x7fcf6a, sky: 0xbfe8ff, sun: 0xfff2cc },
  sub: { ground: 0xe3edf5, sky: 0xcfe0f2, sun: 0xeaf2ff },
  mul: { ground: 0xf0d58a, sky: 0xffe3b0, sun: 0xffe0a0 },
  div: { ground: 0x6a9a74, sky: 0xc9dcc4, sun: 0xe8f5d0 },
};
const INTERIOR_SKY = 0xf6e7c8;
const INTERIOR_X = 1000;

const WALK = 5;
const RUN = 9;
const JUMP_V = 7.8;
const GRAVITY = 22;
const HERO_R = 0.4;
const CULL = 58;
const BUILD_R: Record<string, number> = { flower: 0.2, fence: 0.7, bush: 0.5, lantern: 0.3, tree: 0.6, flag: 0.3, chest: 0.55, statue: 0.5, fountain: 1.1, house: 1.3 };
const BUILD_H: Record<string, number> = { flower: 0.3, fence: 0.8, bush: 0.7, lantern: 99, tree: 99, flag: 99, chest: 0.6, statue: 99, fountain: 99, house: 99 };
const SLIME_COLORS: Record<Op, number> = { add: 0x66cc55, sub: 0x7ac8ff, mul: 0xffb347, div: 0xb070e0 };

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function disposeTree(o: THREE.Object3D): void {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose();
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
    }
  });
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Mischt die vier Weltfarben nach Position (Quadranten mit weichem Übergang). */
const NORTH_GREEN = new THREE.Color(0x7fc566);
const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function blend(x: number, z: number, pick: (op: Op) => THREE.Color, out: THREE.Color, width = 8): THREE.Color {
  const wx = smooth(-width, width, x), wz = smooth(-width, width, z);
  const top = pick('add').clone().lerp(pick('sub'), wx);
  const bottom = pick('mul').clone().lerp(pick('div'), wx);
  return out.copy(top).lerp(bottom, wz);
}

type Hero = ReturnType<typeof createHero>;
type DecorEntry = { obj: THREE.Object3D; x: number; z: number };
interface Enemy {
  obj: ReturnType<typeof createSlime>;
  op: Op;
  x: number;
  z: number;
  hx: number;
  hz: number;
  tx: number;
  tz: number;
  wait: number;
  hp: number;
  dead: number;
  kx: number;
  kz: number;
}
interface HouseDef {
  key: string;
  x: number;
  z: number;
  ry: number;
}
interface ChestDef {
  id: string;
  x: number;
  z: number;
}
interface Spot {
  id: string;
  x: number;
  z: number;
  y: number;
  obj: THREE.Mesh;
}
interface Regrow {
  obj: THREE.Object3D;
  o: Obstacle;
  x: number;
  z: number;
  scale: number;
  t: number;
  grow: number;
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 220);
  readonly hero: Hero = createHero();
  private heroAvatar = '🦊';
  readonly companion = createPuppy();
  paused = true;
  biome: Op = 'add';
  inside: string | null = null;
  profile!: Profile;

  onStation: (s: Station) => void = () => {};
  onBiome: (op: Op) => void = () => {};
  onChest: (id: string) => void = () => {};
  onContext: (c: Ctx) => void = () => {};
  onNotice: (text: string) => void = () => {};
  onHouse: (inside: boolean) => void = () => {};
  onChange: () => void = () => {};
  onCommand: (c: Cmd) => void = () => {};
  onIsland: (areaId: string | null) => void = () => {};
  /** Lernbereich, in dem der Held gerade steht (null = Mathe-Welten). */
  areaId: string | null = null;
  onArea: (id: string) => void = () => {};
  private spinners: THREE.Object3D[] = [];
  onTalk: (kid: string) => void = () => {};
  onHurt: () => void = () => {};

  private worldGroup = new THREE.Group();
  private builtGroup = new THREE.Group();
  private holeGroup = new THREE.Group();
  private interiorGroup = new THREE.Group();
  private decor: DecorEntry[] = [];
  private obstacles: Obstacle[] = [];
  private builtObs = new Map<number, { obs: Obstacle; obj: THREE.Object3D }>();
  private stations: Station[] = [];
  private rings: THREE.Mesh[] = [];
  private dog: THREE.Group | null = null;
  private koroks: THREE.Group[] = [];
  private houses: HouseDef[] = [];
  private chests: ChestDef[] = [];
  private spots: Spot[] = [];
  private enemies: Enemy[] = [];
  private holes: THREE.Object3D[] = [];
  private falling: { obj: THREE.Object3D; t: number; regrow: Regrow }[] = [];
  private regrow: Regrow[] = [];
  private gy = 0;
  private camYaw = 0;
  private camElev = 0.8;
  private air = false;
  private peak = 0;
  private expl = new Uint8Array(GRID * GRID_Z);
  private explDirty = 0;
  private interiors = new Map<string, { int: Interior; ox: number }>();
  private armed = new Set<string>();
  private returnPos = { x: 0, z: 0 };
  private clock = new THREE.Clock();
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private t = 0;
  private frameNo = 0;
  private vy = 0;
  private swing = 0;
  private invuln = 0;
  private knock = { x: 0, z: 0 };
  private toolObj: THREE.Object3D | null = null;
  private placing: { id: string; ry: number; ghost: THREE.Object3D; ok: boolean } | null = null;
  private lastCtx = '';
  private snapCamera = true;
  private skyColor = new THREE.Color(0xbfe8ff);
  private tmp = new THREE.Color();
  private tmp2 = new THREE.Vector3();
  private heroPrev = new THREE.Vector3();
  private companionAng = 0;
  private post!: PostFX;
  private grass!: Grass;
  private motes!: THREE.Points;
  private skyDome!: THREE.Mesh;
  private shafts!: THREE.Group;
  private skyU = { time: { value: 0 }, horizon: { value: new THREE.Color() }, zenith: { value: new THREE.Color() } };
  private moteBase = new Float32Array(150 * 3);

  constructor(canvas: HTMLCanvasElement, private input: InputState) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.fog = new THREE.Fog(0xbfe8ff, 28, 62);
    this.scene.background = this.skyColor;

    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    Object.assign(this.sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, far: 70 });
    this.hemi = new THREE.HemisphereLight(0xcfeaff, 0x8aa874, 0.6);
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.scene.add(this.worldGroup, this.builtGroup, this.holeGroup, this.interiorGroup);
    this.interiorGroup.visible = false;

    this.buildWorld();

    this.hero.position.set(HUB_SPAWN.x, 0, HUB_SPAWN.z);
    this.companion.position.set(HUB_SPAWN.x + 1.5, 0, HUB_SPAWN.z - 1);
    this.scene.add(this.hero, this.companion);

    this.buildMotes();
    this.buildSky();
    this.buildShafts();
    this.grass = new Grass(heightAt, (x, z, out) => {
      blend(x, z, (op) => new THREE.Color(THEMES[op].ground), out, 14);
      out.multiplyScalar(1.3);
    }, (x, z) => {
      let m = Math.hypot(x, z) - 11;
      for (const op of OPS) { const c = BIOME_CENTER[op]; m = Math.min(m, Math.hypot(x - c.x, z - c.z) - 11); }
      return m;
    });
    this.scene.add(this.grass.mesh);
    this.post = new PostFX(this.renderer, this.scene, this.camera);
    addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // Schwebende Pollen/Glühwürmchen rund um den Helden.
  private buildMotes(): void {
    const n = 150;
    for (let i = 0; i < n; i++) {
      this.moteBase[i * 3] = (Math.random() - 0.5) * 30;
      this.moteBase[i * 3 + 1] = Math.random() * 5;
      this.moteBase[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.PointsMaterial({ color: 0xfff3b0, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.scene.add(this.motes);
  }

  private buildSky(): void {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 horizon; uniform vec3 zenith; uniform float time; varying vec3 vP;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0.5, v = 0.0; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
        void main(){
          vec3 d = normalize(vP);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(horizon, zenith, pow(h, 0.55));
          vec2 uv = d.xz / (d.y + 0.35) * 1.6 + vec2(time * 0.012, 0.0);
          float c = smoothstep(0.52, 0.78, fbm(uv));
          float fade = smoothstep(0.04, 0.3, d.y);
          vec3 cloud = mix(vec3(1.0), horizon * 0.9 + 0.1, 0.25);
          col = mix(col, cloud, c * fade * 0.85);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), mat);
    this.skyDome.renderOrder = -1;
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);
  }

  private buildShafts(): void {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,244,200,0.9)');
    grad.addColorStop(1, 'rgba(255,244,200,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 128);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.shafts = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + (i % 3) * 0.6, 14), mat);
      m.userData.a = i * 1.05;
      this.shafts.add(m);
    }
    this.scene.add(this.shafts);
  }

  private updateShafts(): void {
    const on = !this.inside && this.biome === 'add' && this.post.quality !== 'low';
    this.shafts.visible = on;
    if (!on) return;
    const hp = this.hero.position;
    for (const m of this.shafts.children) {
      const a = m.userData.a as number;
      m.position.set(hp.x + Math.cos(a * 2.3) * 7, this.gy + 6, hp.z + Math.sin(a * 2.3) * 7 - 2);
      m.rotation.set(0, a, 0.35);
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(this.t * 0.5 + a) * 0.05;
    }
  }

  private updateSky(): void {
    this.skyDome.position.copy(this.camera.position);
    this.skyU.time.value = this.t;
    this.skyU.horizon.value.copy(this.skyColor);
    this.skyU.zenith.value.copy(this.skyColor).multiply(SKY_TINT);
  }

  private updateMotes(): void {
    const pos = this.motes.geometry.attributes.position as THREE.BufferAttribute;
    const hp = this.hero.position;
    const t = this.t;
    this.motes.visible = !this.inside;
    for (let i = 0; i < pos.count; i++) {
      const b = this.moteBase;
      const x = ((b[i * 3] + t * 0.15 - hp.x + 15) % 30 + 30) % 30 - 15;
      const z = ((b[i * 3 + 2] + t * 0.1 - hp.z + 15) % 30 + 30) % 30 - 15;
      pos.setXYZ(i, hp.x + x + Math.sin(t * 0.7 + i) * 0.4, this.gy + 0.4 + b[i * 3 + 1] + Math.sin(t * 0.9 + i * 1.7) * 0.3, hp.z + z + Math.cos(t * 0.6 + i) * 0.4);
    }
    pos.needsUpdate = true;
  }

  setQuality(q: 'low' | 'med' | 'high'): void { this.post.setQuality(q); }
  get quality(): string { return this.post.quality; }

  private resize(): void {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.post?.resize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- Aufbau

  private buildWorld(): void {
    const g = this.worldGroup;
    const size = X1 - X0 + 24;
    const depth = Z1 - Z0 + 24;
    const geo = new THREE.PlaneGeometry(size, depth, Math.round(size), Math.round(depth));
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const hx = pos.getX(i), hz = pos.getZ(i);
      const h = heightAt(hx, hz);
      pos.setY(i, h);
      blend(hx, hz, (op) => new THREE.Color(THEMES[op].ground), c);
      c.lerp(NORTH_GREEN, smoothstep(62, 92, Math.max(Math.abs(hx), Math.abs(hz))));
      for (const ar of AREAS) {
        if (ar.id === 'english') continue;
        const d = Math.hypot(hx - ar.center.x, hz - ar.center.z);
        if (d < 40) c.lerp(this.tmp.setHex(ar.ground).multiplyScalar(0.8), 0.55 * (1 - smoothstep(24, 40, d)));
      }
      // Höhen heller, Täler dunkler
      const k = 1 + Math.max(-0.2, Math.min(0.25, h * 0.05));
      c.multiplyScalar(k);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const tex = groundTexture();
    tex.repeat.set(size / 5, depth / 5);
    const bump = groundBump();
    bump.repeat.set(size / 5, depth / 5);
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, bumpMap: bump, bumpScale: 2.2, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true;
    g.add(ground);

    const flat = (r: number, x: number, z: number, color: number) => {
      const geo = new THREE.RingGeometry(0.01, r, 40, 6);
      geo.rotateX(-Math.PI / 2);
      this.conform(geo, x, z, 0.03);
      const p = geo.attributes.position;
      const edge = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) edge[i] = Math.min(1, Math.max(0, (r - Math.hypot(p.getX(i) - x, p.getZ(i) - z)) / 1.4));
      g.add(this.groundPatch(geo, color, edge));
      this.pebbleRing(x, z, r, color);
    };
    flat(7.5, 0, 0, 0xcfc8b8);
    for (const op of OPS) {
      const v = BIOME_CENTER[op];
      flat(10, v.x, v.z, 0xd9c48a);
      this.road(0, 0, v.x, v.z, 6, Math.hypot(v.x, v.z) - 8, 2.8, 0xd9c48a);
    }

    const sign = createSignpost();
    sign.position.set(0, 0, -1);
    g.add(sign);
    this.obstacles.push({ x: 0, z: -1, r: 0.4, h: 99, kind: 'solid' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const k = createKorok(i);
      k.userData.kid = `hub-${i}`;
      this.addDecor(k, Math.cos(a) * 5.5, Math.sin(a) * 5.5, 1, 0.4, 99);
      this.koroks.push(k);
    }

    this.buildPlaza();
    for (const op of OPS) this.buildBiome(op);
    this.buildBorder();
    for (const st of portalStations()) this.buildPortal(st);
    this.addStationRing(DOG_STATION);
    const dog = createDog();
    this.dog = dog;
    this.addDecor(dog, DOG_STATION.x - 1.7, DOG_STATION.z - 1.0, 1.3, 0.7, 99, 'solid', 0.5);
    this.buildNorthStrip();
    this.buildAreas();
    this.addStationRing(WALL_STATION);
    this.addDecor(createBuilder(), WALL_STATION.x - 1.7, WALL_STATION.z - 1.0, 1.3, 0.7, 99, 'solid', 0.5);
    this.addDecor(createHouse(), WALL_STATION.x - 9, WALL_STATION.z - 2, 1, 3.2, 99, 'solid', 0.6);
  }

  private buildPlaza(): void {
    const rng = seeded(4242);
    const N = 8, R = 6.9;
    const pt = (i: number) => [Math.cos((i / N) * Math.PI * 2 + 0.2) * R, Math.sin((i / N) * Math.PI * 2 + 0.2) * R] as const;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.2;
      const [x, z] = pt(i);
      this.addDecor(createLantern(), x, z, 1, 0.2, 99, 'solid', Math.PI - a);
      const [x2, z2] = pt(i + 1);
      if (i % 2 === 0) {
        const b = createBunting(Math.hypot(x2 - x, z2 - z));
        b.position.set((x + x2) / 2, heightAt((x + x2) / 2, (z + z2) / 2) - 0.2, (z + z2) / 2);
        b.rotation.y = -Math.atan2(z2 - z, x2 - x);
        this.worldGroup.add(b);
      }
      const am = a + Math.PI / N;
      for (let k = 0; k < 4; k++) {
        const f = k % 3 === 2 ? createBush() : createFlower();
        const rr = R - 0.3 + (rng() - 0.5) * 0.9, aa = am + (rng() - 0.5) * 0.3;
        this.addDecor(f, Math.cos(aa) * rr, Math.sin(aa) * rr, 0.7 + rng() * 0.5, 0, 99, undefined, rng() * 6);
      }
    }
  }

  private addDecor(obj: THREE.Object3D, x: number, z: number, scale = 1, r = 0, h = 99, kind?: 'tree' | 'solid', rot = 0): Obstacle | null {
    obj.position.set(x, heightAt(x, z), z);
    obj.scale.setScalar(scale);
    obj.rotation.y = rot;
    this.worldGroup.add(obj);
    this.decor.push({ obj, x, z });
    if (r <= 0) return null;
    const o: Obstacle = { x, z, r: r * scale, h, kind: kind ?? 'solid', obj };
    this.obstacles.push(o);
    return o;
  }

  private buildBorder(): void {
    const rng = seeded(777);
    const step = 6.5;
    const put = (x: number, z: number) => this.addDecor(createMountain(rng), x, z, 1.4 + rng() * 0.6, 2.6, 99);
    for (let t = X0; t <= X1; t += step) {
      put(t, Z0 - 1.5);
      put(t, Z1 + 1.5);
    }
    for (let t = Z0; t <= Z1; t += step) {
      put(X0 - 1.5, t);
      put(X1 + 1.5, t);
    }
  }

  /** Legt die Vertices auf das Gelände (plus kleiner Abstand gegen Z-Fighting). */
  private conform(geo: THREE.BufferGeometry, cx: number, cz: number, lift: number): void {
    geo.translate(cx, 0, cz);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) + lift);
    geo.computeVertexNormals();
  }

  private groundPatch(geo: THREE.BufferGeometry, color: number, edge?: Float32Array): THREE.Mesh {
    const mat = toon(color);
    mat.side = THREE.DoubleSide;
    mat.map = pathTexture();
    if (edge) {
      geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));
      mat.transparent = true;
      mat.depthWrite = false;
    }
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aEdge;\nvarying float vEdge;\nvarying vec3 vWp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = aEdge;\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vEdge;\nvarying vec3 vWp;')
        .replace('#include <map_fragment>', `diffuseColor *= texture2D(map, vWp.xz * 0.22);
${edge ? 'diffuseColor.a *= smoothstep(0.0, 1.0, vEdge);' : ''}`);
    };
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    m.renderOrder = 1;
    return m;
  }

  private pebbles(list: { x: number; z: number; s: number; r: number }[], color: number): void {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), toon(color), list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    list.forEach((o, i) => {
      m.compose(new THREE.Vector3(o.x, heightAt(o.x, o.z) + o.s * 0.15, o.z), q.setFromEuler(e.set(o.r, o.r * 3, 0)), new THREE.Vector3(o.s, o.s * 0.6, o.s));
      im.setMatrixAt(i, m);
      im.setColorAt(i, c.setHex(color).multiplyScalar(0.8 + ((o.r * 7) % 1) * 0.3));
    });
    im.castShadow = true;
    im.receiveShadow = true;
    this.worldGroup.add(im);
  }

  private pebbleRing(cx: number, cz: number, r: number, color: number): void {
    const rng = seeded(Math.floor(cx * 31 + cz * 17 + r));
    const list: { x: number; z: number; s: number; r: number }[] = [];
    const n = Math.round(r * 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.2, d = r - 0.3 - rng() * 0.5;
      list.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, s: 0.12 + rng() * 0.16, r: rng() * 6 });
    }
    this.pebbles(list, new THREE.Color(color).multiplyScalar(0.8).getHex());
  }

  /** Weg zwischen zwei Punkten, folgt der Geländehöhe. */
  private road(ax: number, az: number, bx: number, bz: number, from: number, to: number, width: number, color: number): void {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const a = from, b = to;
    const n = Math.max(2, Math.round((b - a) / 1.5));
    const pos: number[] = [], idx: number[] = [], edge: number[] = [];
    const rng = seeded(Math.floor(bx * 13 + bz * 7));
    const list: { x: number; z: number; s: number; r: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const d = a + ((b - a) * i) / n;
      const cx = ax + ux * d, cz = az + uz * d;
      for (const side of [-1, 0, 1]) {
        const x = cx - uz * side * (width / 2), z = cz + ux * side * (width / 2);
        pos.push(x, heightAt(x, z) + 0.04, z);
        edge.push(side === 0 ? 1 : 0.15);
      }
      if (i > 0) {
        const k = i * 3;
        idx.push(k - 3, k - 2, k, k - 2, k + 1, k, k - 2, k - 1, k + 1, k - 1, k + 2, k + 1);
      }
      for (const side of [-1, 1]) {
        if (rng() < 0.6) continue;
        const off = (width / 2 + (rng() - 0.3) * 0.5) * side;
        list.push({ x: cx - uz * off, z: cz + ux * off, s: 0.1 + rng() * 0.18, r: rng() * 6 });
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.worldGroup.add(this.groundPatch(geo, color, new Float32Array(edge)));
    this.pebbles(list, new THREE.Color(color).multiplyScalar(0.7).getHex());
  }

  private buildBiome(op: Op): void {
    const c = BIOME_CENTER[op];
    const v = villageOf(op);
    const rng = seeded(40 + OPS.indexOf(op) * 13);
    const g = this.worldGroup;

    // Dorf
    const extras = extraStations(op);
    for (const st of [...v.stations, ...extras]) this.addStationRing(st);
    const [calc, gap, shop] = v.stations;
    this.addDecor(op === 'add' ? createFruitTree() : createTablet(), calc.x, calc.z - 1.9, 1, 0.9);
    this.addDecor(createBridgeSign(), gap.x, gap.z - 1.8, 1, 0.7);
    this.addDecor(createStall(), shop.x, shop.z - 2.0, 1, 1.15);
    extras.forEach((e, i) => this.addDecor(i === 1 ? createTablet() : createBridgeSign(), e.x, e.z - 1.9, 1, 0.7));
    const merchant = createKorok(3);
    this.addDecor(merchant, shop.x + 1.9, shop.z - 2.0, 1.1, 0.4);
    this.koroks.push(merchant);
    this.addHouse({ ...v.house });
    this.chests.push(v.chest);
    this.addChestModel(v.chest);

    const keepOut: { x: number; z: number; d: number }[] = [
      { x: c.x, z: c.z, d: 14 },
      { x: 0, z: 0, d: 10 },
    ];

    // Weltkisten
    const sx = c.x < 0 ? 1 : -1, sz = c.z < 0 ? 1 : -1;
    const extra: ChestDef[] = [
      { id: `w-${op}-1`, x: c.x + sx * 19, z: c.z + sz * -14 },
      { id: `w-${op}-2`, x: c.x - sx * 17, z: c.z - sz * 20 },
    ];
    for (const ch of extra) {
      this.chests.push(ch);
      this.addChestModel(ch);
      keepOut.push({ x: ch.x, z: ch.z, d: 3 });
    }

    // Schatzstellen
    for (let i = 0; i < 6; i++) {
      let p = { x: 0, z: 0 };
      for (let tries = 0; tries < 30; tries++) {
        p = { x: c.x + (rng() - 0.5) * 50, z: c.z + (rng() - 0.5) * 50 };
        if (keepOut.every((k) => Math.hypot(k.x - p.x, k.z - p.z) > k.d)) break;
      }
      keepOut.push({ ...p, d: 3 });
      const sp = createSparkle();
      const py = heightAt(p.x, p.z);
      sp.position.set(p.x, py + 0.5, p.z);
      g.add(sp);
      this.decor.push({ obj: sp, x: p.x, z: p.z });
      this.spots.push({ id: `t-${op}-${i}`, x: p.x, z: p.z, y: py, obj: sp });
    }

    // Landschaft
    const free = (p: { x: number; z: number }, extraD = 0) => keepOut.every((k) => Math.hypot(k.x - p.x, k.z - p.z) > k.d + extraD);
    const rnd = (): { x: number; z: number } => ({ x: c.x + (rng() - 0.5) * 58, z: c.z + (rng() - 0.5) * 58 });
    for (let i = 0; i < 60; i++) {
      const p = rnd();
      if (!free(p)) continue;
      const rot = rng() * Math.PI * 2;
      if (op === 'add') this.addDecor(createTree(rng), p.x, p.z, 0.8 + rng() * 0.7, 0.6, 99, 'tree', rot);
      else if (op === 'sub') {
        if (i % 3 === 0) this.addDecor(createMountain(rng), p.x, p.z, 1 + rng(), 2.2, 99, 'solid', rot);
        else this.addDecor(createTree(rng, true), p.x, p.z, 0.8 + rng() * 0.5, 0.6, 99, 'tree', rot);
      } else if (op === 'mul') this.addDecor(createCactus(rng), p.x, p.z, 0.8 + rng() * 0.7, 0.5, 99, 'solid', rot);
      else this.addDecor(createDeadTree(rng), p.x, p.z, 0.8 + rng() * 0.6, 0.5, 99, 'tree', rot);
    }
    for (let i = 0; i < 40; i++) {
      const p = rnd();
      if (!free(p)) continue;
      const rot = rng() * Math.PI * 2;
      if (op === 'add') this.addDecor(createMushroom(), p.x, p.z, 0.8 + rng(), 0.4, 0.5, 'solid', rot);
      else if (op === 'sub') { const s = 0.7 + rng() * 0.6; this.addDecor(createRock(rng, 0xa9b4c4), p.x, p.z, s, 0.9, 0.7 * s, 'solid', rot); }
      else if (op === 'mul') { const s = 0.6 + rng() * 0.8; this.addDecor(createRock(rng, 0xd9a35a), p.x, p.z, s, 0.9, 0.7 * s, 'solid', rot); }
      else if (i % 2) this.addDecor(createLily(), p.x, p.z, 0.9 + rng() * 0.8, 0, 0, undefined, rot);
      else this.addDecor(createMushroom(0xb070e0), p.x, p.z, 0.9 + rng() * 0.8, 0.4, 0.5, 'solid', rot);
    }
    for (let i = 0; i < 6; i++) {
      const p = rnd();
      if (!free(p)) continue;
      const k = createKorok(i + 1);
      k.userData.kid = `${op}-${i}`;
      this.addDecor(k, p.x, p.z, 0.9 + rng() * 0.4, 0.4, 99, 'solid', rng() * 6);
      this.koroks.push(k);
    }

    // Gegner
    for (let i = 0; i < 4; i++) {
      let p = rnd();
      for (let tries = 0; tries < 20 && !free(p, 4); tries++) p = rnd();
      const obj = createSlime(SLIME_COLORS[op]);
      obj.position.set(p.x, heightAt(p.x, p.z), p.z);
      g.add(obj);
      this.enemies.push({ obj, op, x: p.x, z: p.z, hx: p.x, hz: p.z, tx: p.x, tz: p.z, wait: rng() * 2, hp: 2, dead: 0, kx: 0, kz: 0 });
    }
  }

  /** Weltportal: Steinbogen mit leuchtendem Ring. */
  private buildPortal(st: Station): void {
    this.addStationRing(st);
    const gate = new THREE.Group();
    const stone = toon(0x8d8a99);
    for (const sx of [-1.5, 1.5]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.7), stone);
      pillar.position.set(sx, 1.7, 0);
      pillar.castShadow = true;
      gate.add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.6, 0.8), stone);
    lintel.position.y = 3.6;
    lintel.castShadow = true;
    const orb = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 8, 28), new THREE.MeshBasicMaterial({ color: 0xcc77ff }));
    orb.position.y = 1.9;
    gate.add(lintel, orb);
    this.spinners.push(orb);
    this.addDecor(gate, st.x, st.z - 1.6, 1, 0, 99);
    this.obstacles.push({ x: st.x - 1.5, z: st.z - 1.6, r: 0.5, h: 99, kind: 'solid' }, { x: st.x + 1.5, z: st.z - 1.6, r: 0.5, h: 99, kind: 'solid' });
  }

  /** Wege vom Marktplatz zu den Bereichen und zwischen den Bereichen, dazu Wildnis dazwischen. */
  private buildNorthStrip(): void {
    const rng = seeded(555);
    const segs: [number, number, number, number][] = [];
    const link = (ax: number, az: number, bx: number, bz: number, from: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      this.road(ax, az, bx, bz, from, len - 14, 4, 0xd8c79a);
      segs.push([ax, az, bx, bz]);
    };
    const by = (id: string) => AREAS.find((a) => a.id === id)!.center;
    const [en, ge, gn, su, pu] = ['english', 'german', 'general', 'sudoku', 'puzzle'].map(by);
    link(0, 0, en.x, en.z, 9);
    link(0, 0, su.x, su.z, 9);
    link(0, 0, pu.x, pu.z, 9);
    link(en.x, en.z, ge.x, ge.z, 14);
    link(en.x, en.z, gn.x, gn.z, 14);
    link(su.x, su.z, ge.x, ge.z, 14);
    link(pu.x, pu.z, gn.x, gn.z, 14);
    const near = (x: number, z: number): boolean => segs.some(([ax, az, bx, bz]) => {
      const vx = bx - ax, vz = bz - az;
      const t = Math.min(1, Math.max(0, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      return Math.hypot(x - ax - vx * t, z - az - vz * t) < 5;
    });
    for (let i = 0; i < 320; i++) {
      const x = X0 + 6 + rng() * (X1 - X0 - 12), z = Z0 + 6 + rng() * (Z1 - Z0 - 12);
      if (Math.abs(x) < 68 && z > -68) continue;
      if (AREAS.some((a) => Math.hypot(x - a.center.x, z - a.center.z) < a.radius + 2) || near(x, z)) continue;
      const k = i % 4;
      if (k === 0) this.addDecor(createRock(rng, 0xa9b0a0), x, z, 0.8 + rng() * 0.7, 0.9, 0.7, 'solid', rng() * 6);
      else if (k === 1) this.addDecor(createMushroom(), x, z, 0.8 + rng(), 0.4, 0.5, 'solid', rng() * 6);
      else this.addDecor(createFruitTree(), x, z, 0.9 + rng() * 0.5, 0.7, 99, 'tree', rng() * 6);
    }
  }

  private labelMat(text: string, bg: string): THREE.MeshStandardMaterial {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 8;
    g.strokeRect(6, 6, 116, 116);
    g.fillStyle = '#ffffff';
    g.font = 'bold 84px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  }

  /** Wahrzeichen jeder Lernstelle, passend zum Fachgebiet. */
  private areaLandmark(kind: string, i: number): THREE.Group {
    const m = new THREE.Group();
    if (kind === 'english') {
      const red = toon(0xd62828), dark = toon(0x333333), glass = toon(0xbfe6ff);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.1), red);
      body.position.y = 1.2;
      body.castShadow = true;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 1.14), glass);
      win.position.y = 1.4;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.3), dark);
      top.position.y = 2.45;
      m.add(body, win, top);
    } else if (kind === 'german') {
      const cols = [0xd64545, 0x3b82c4, 0x4aa564, 0xe0a82e];
      for (let k = 0; k < 4; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.5 - k * 0.12, 0.34, 1.1), toon(cols[(k + i) % 4]));
        b.position.set((k % 2 ? 0.08 : -0.06), 0.17 + k * 0.34, 0);
        b.rotation.y = k * 0.35 - 0.4;
        b.castShadow = true;
        m.add(b);
      }
      const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), toon(0xf2c94c));
      pencil.position.set(0.2, 1.9, 0);
      pencil.rotation.z = 0.5;
      m.add(pencil);
    } else if (kind === 'general') {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 1.2, 8), toon(0x8a5a2b));
      stand.position.y = 0.6;
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.5 }));
      globe.position.y = 1.9;
      globe.castShadow = true;
      m.add(stand, globe);
      for (let k = 0; k < 4; k++) {
        const land = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), toon(0x4aa564));
        const a = k * 1.7 + i, y = (k - 1.5) * 0.4;
        const rr = Math.sqrt(0.85 * 0.85 - y * y) * 0.98;
        land.position.set(Math.cos(a) * rr, 1.9 + y, Math.sin(a) * rr);
        m.add(land);
      }
      this.spinners.push(globe);
    } else if (kind === 'sudoku') {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), toon(0x9a86c8));
      plinth.position.y = 0.25;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), this.labelMat(String([3, 1, 4, 2, 3][i % 5]), ['#7c5cc4', '#c45c8a', '#3b82c4', '#4aa564', '#e0a82e'][i % 5]));
      cube.position.y = 1.15;
      cube.rotation.y = 0.3;
      cube.castShadow = plinth.castShadow = true;
      m.add(plinth, cube);
    } else {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.2, 10), toon(0xc8776a));
      pillar.position.y = 1.1;
      const q = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), this.labelMat('?', '#e0a82e'));
      q.position.y = 2.9;
      q.castShadow = pillar.castShadow = true;
      m.add(pillar, q);
      this.spinners.push(q);
    }
    return m;
  }

  /** Bauplan eines Lernbereichs: Wiese, Stellen mit Wahrzeichen, Gelände-Deko und Koroks. */
  private buildArea(a: (typeof AREAS)[number], seed: number): void {
    const g = this.worldGroup;
    const rng = seeded(seed);
    const { x: cx, z: cz } = a.center;
    const r = a.id === 'english' ? ENGLISH.r : 30;
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(15, 36), toon(a.ground));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cx, heightAt(cx, cz + 2) + 0.03, cz + 2);
    lawn.receiveShadow = true;
    g.add(lawn);
    const stations = areaStations(a);
    for (const st of stations) this.addStationRing(st);
    stations.forEach((st, i) => this.addDecor(this.areaLandmark(a.id, i), st.x + (i % 2 ? 1.8 : -1.8), st.z - 1.6, 1, 0.7));
    for (let i = 0; i < 70; i++) {
      const ang = rng() * Math.PI * 2, d = 6 + rng() * (r - 8);
      const x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d;
      if (Math.abs(x - cx) < 3.2 || stations.some((s) => Math.hypot(s.x - x, s.z - z) < 4) || (a.id === 'sudoku' && Math.hypot(WALL_STATION.x - 5 - x, WALL_STATION.z - z) < 12) || Math.hypot(x - a.spawn.x, z - a.spawn.z) < 3.5) continue;
      if (i % 5 === 0) this.addDecor(createRock(rng, 0xb8c0c8), x, z, 0.8 + rng() * 0.6, 0.9, 0.7, 'solid', rng() * 6);
      else if (i % 5 === 1) this.addDecor(createMushroom(), x, z, 0.8 + rng(), 0.4, 0.5, 'solid', rng() * 6);
      else this.addDecor(createFruitTree(), x, z, 0.9 + rng() * 0.5, 0.7, 99, 'tree', rng() * 6);
    }
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.3;
      const k = createKorok(i + 2);
      k.userData.kid = `${a.id === 'english' ? 'en' : a.id}-${i}`;
      this.addDecor(k, cx + Math.cos(ang) * 7, cz + 2 + Math.sin(ang) * 6, 1, 0.4, 99, 'solid', ang + 3);
      this.koroks.push(k);
    }
  }

  private buildAreas(): void {
    AREAS.forEach((a, i) => this.buildArea(a, 2024 + i * 97));
  }

  private addStationRing(s: Station): void {
    this.stations.push(s);
    const geo = new THREE.RingGeometry(1.1, 1.5, 40, 3);
    // lokales z = Weltvertikale: der Ring schmiegt sich an das Gelände an und wird nicht angeschnitten
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, heightAt(s.x + pos.getX(i), s.z - pos.getY(i)) + 0.07);
    const ring = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: s.id === 'shop' ? 0x66ddff : s.id === 'portal' ? 0xcc66ff : s.id === 'eng' ? 0xff6677 : s.id === 'ger' ? 0xffaa44 : s.id === 'gen' ? 0x44ddaa : s.id === 'sud' ? 0xaa88ff : s.id === 'puz' ? 0xff7799 : s.id === 'dog' ? 0xffb066 : s.id === 'wall' ? 0xff8844 : 0xffe066, side: THREE.DoubleSide, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, 0, s.z);
    this.worldGroup.add(ring);
    this.rings.push(ring);
  }

  private addChestModel(ch: ChestDef): void {
    const m = createBuildItem('chest');
    this.addDecor(m, ch.x, ch.z, 1, 0.55, 0.6);
  }

  private addHouse(h: HouseDef): void {
    this.houses.push(h);
    const m = createHouse();
    m.userData.houseKey = h.key;
    this.addDecor(m, h.x, h.z, 1, 1.3, 99, 'solid', h.ry);
  }

  // ---------------------------------------------------------------- Profil

  private setAvatar(avatar: string): void {
    if (this.heroAvatar === avatar) return;
    this.heroAvatar = avatar;
    this.toolObj = null;
    for (const c of [...this.hero.children]) { this.hero.remove(c); disposeTree(c); }
    const fresh = createHero(avatar);
    for (const c of [...fresh.children]) this.hero.add(c);
    this.hero.userData = fresh.userData;
  }

  setProfile(p: Profile): void {
    this.profile = p;
    this.setAvatar(p.avatar);
    for (const { obj } of this.builtObs.values()) { disposeTree(obj); this.builtGroup.remove(obj); }
    this.builtObs.clear();
    // gebaute Häuser sind betretbar
    this.houses = this.houses.filter((h) => !h.key.startsWith('b'));
    for (const b of p.built) this.addBuilt(b);
    for (const s of this.spots) s.obj.visible = !p.found.includes(s.id);
    this.setTool(p.tool);
    applyOutfit(this.hero, p.outfit);
    this.expl.fill(0);
    for (let i = 0; i < Math.min(p.explored.length, this.expl.length); i++) this.expl[i] = p.explored[i] === '1' ? 1 : 0;
    this.cancelPlacing();
  }

  refreshOutfit(): void {
    applyOutfit(this.hero, this.profile.outfit);
  }

  addBuilt(b: { uid: number; item: string; x: number; z: number; ry: number }): void {
    const obj = createBuildItem(b.item);
    obj.position.set(b.x, heightAt(b.x, b.z), b.z);
    obj.rotation.y = b.ry;
    this.builtGroup.add(obj);
    const obs: Obstacle = { x: b.x, z: b.z, r: BUILD_R[b.item] ?? 0.6, h: BUILD_H[b.item] ?? 99, kind: 'solid' };
    this.builtObs.set(b.uid, { obs, obj });
    if (b.item === 'house') this.houses.push({ key: `b${b.uid}`, x: b.x, z: b.z, ry: b.ry });
  }

  private removeBuilt(uid: number, item: string): void {
    const e = this.builtObs.get(uid);
    if (e) { disposeTree(e.obj); this.builtGroup.remove(e.obj); this.builtObs.delete(uid); }
    if (item === 'house') this.houses = this.houses.filter((h) => h.key !== `b${uid}`);
  }

  setTool(id: string | null): void {
    this.profile.tool = id;
    const hand = this.hero.userData.arms[1];
    if (this.toolObj) { hand.remove(this.toolObj); disposeTree(this.toolObj); this.toolObj = null; }
    if (id) {
      const t = createTool(id);
      t.position.set(0, -0.34, 0.02);
      t.rotation.x = 1.0;
      hand.add(t);
      this.toolObj = t;
    }
  }

  // ---------------------------------------------------------------- Zonen

  private houseInfo(key: string) {
    let e = this.interiors.get(key);
    if (!e) {
      const idx = key.startsWith('v-') ? OPS.indexOf(key.slice(2) as Op) : 4 + Number(key.slice(1));
      const ox = INTERIOR_X + idx * 40;
      const int = buildInterior(ox, key);
      int.group.visible = false;
      this.interiorGroup.add(int.group);
      e = { int, ox };
      this.interiors.set(key, e);
    }
    return e;
  }

  private doorPoint(h: HouseDef) {
    return { x: h.x + Math.sin(h.ry) * 1.9, z: h.z + Math.cos(h.ry) * 1.9 };
  }

  private current() {
    return this.inside ? this.houseInfo(this.inside) : null;
  }

  private enter(h: HouseDef): void {
    const info = this.houseInfo(h.key);
    this.returnPos = { x: h.x + Math.sin(h.ry) * 3.4, z: h.z + Math.cos(h.ry) * 3.4 };
    this.inside = h.key;
    sfx('door');
    for (const e of this.interiors.values()) e.int.group.visible = e === info;
    this.interiorGroup.visible = true;
    this.hero.position.set(info.int.spawn.x, 0, info.int.spawn.z);
    this.air = false;
    this.hero.rotation.y = Math.PI;
    this.armed.add('exit');
    this.skyColor.setHex(INTERIOR_SKY);
    (this.scene.fog as THREE.Fog).color.setHex(INTERIOR_SKY);
    this.snapCamera = true;
    this.cancelPlacing();
    this.onHouse(true);
  }

  private leave(): void {
    this.inside = null;
    this.interiorGroup.visible = false;
    this.hero.position.set(this.returnPos.x, heightAt(this.returnPos.x, this.returnPos.z), this.returnPos.z);
    this.air = false;
    this.snapCamera = true;
    this.cancelPlacing();
    for (const h of this.houses) {
      const d = this.doorPoint(h);
      if (Math.hypot(d.x - this.hero.position.x, d.z - this.hero.position.z) < 2.6) this.armed.add(`door:${h.key}`);
    }
    this.onHouse(false);
  }

  teleportTo(where: string): void {
    if (this.inside) { this.inside = null; this.interiorGroup.visible = false; this.onHouse(false); }
    const area = areaById(where);
    const p = where === 'hub' ? HUB_SPAWN : area ? area.spawn : villageOf(where as Op).spawn;
    this.hero.position.set(p.x, heightAt(p.x, p.z), p.z);
    this.vy = 0;
    this.air = false;
    this.snapCamera = true;
    this.cancelPlacing();
    this.armed.clear();
    const toArea = area?.id ?? null;
    if (toArea !== this.areaId) { this.areaId = toArea; this.onIsland(toArea); }
    if (toArea) return;
    const op = biomeAt(p.x, p.z);
    this.biome = op;
    this.onBiome(op);
  }

  // ---------------------------------------------------------------- Befehle

  command(c: Cmd): void {
    if (this.paused) return;
    if (c === 'jump') { if (!this.air) { this.vy = JUMP_V; this.peak = this.hero.position.y; sfx('jump'); } }
    else if (c === 'action') this.action();
    else if (c === 'pickup') this.pickupCmd();
    else if (c === 'rotate') { if (this.placing) { this.placing.ry += Math.PI / 2; } else this.onCommand(c); }
    else if (c.startsWith('tool:')) this.onCommand(c);
    else this.onCommand(c);
  }

  private forward(d: number) {
    const ry = this.hero.rotation.y;
    return { x: this.hero.position.x + Math.sin(ry) * d, z: this.hero.position.z + Math.cos(ry) * d };
  }

  private active(): Obstacle[] {
    const int = this.current();
    const out: Obstacle[] = [];
    if (int) out.push(...int.int.obstacles);
    else out.push(...this.obstacles);
    for (const { obs } of this.builtObs.values()) if ((obs.x > INTERIOR_X / 2) === !!int) out.push(obs);
    return out;
  }

  startPlacing(id: string): boolean {
    if (!this.profile.inventory[id]) return false;
    this.cancelPlacing();
    const ghost = createBuildItem(id);
    ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { m.transparent = true; m.opacity = 0.65; });
      }
    });
    this.scene.add(ghost);
    this.placing = { id, ry: this.hero.rotation.y + Math.PI, ghost, ok: false };
    return true;
  }

  cancelPlacing(): void {
    if (!this.placing) return;
    this.scene.remove(this.placing.ghost);
    disposeTree(this.placing.ghost);
    this.placing = null;
  }

  get isPlacing(): boolean {
    return !!this.placing;
  }

  private canPlace(id: string, x: number, z: number): boolean {
    const r = BUILD_R[id] ?? 0.6;
    const int = this.current();
    if (int) {
      const b = int.int.bounds;
      if (x - r < b.x0 || x + r > b.x1 || z - r < b.z0 || z + r > b.z1) return false;
      if (Math.hypot(x - int.int.exit.x, z - int.int.exit.z) < 1.6) return false;
    } else {
      if (x > X1 - 2 || x < X0 + 2 || z > Z1 - 2 || z < Z0 + 2) return false;
      if (this.stations.some((s) => Math.hypot(s.x - x, s.z - z) < 2.4 + r)) return false;
      if (this.houses.some((h) => { const d = this.doorPoint(h); return Math.hypot(d.x - x, d.z - z) < 1.8 + r; })) return false;
    }
    return !this.active().some((o) => o.h > 0.25 && Math.hypot(o.x - x, o.z - z) < o.r + r - 0.05);
  }

  private chestNear(range = 1.9): ChestDef | null {
    const p = this.hero.position;
    let best: ChestDef | null = null;
    let bd = range;
    const consider = (c: ChestDef) => {
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < bd) { bd = d; best = c; }
    };
    const int = this.current();
    if (int) consider(int.int.chest);
    else {
      this.chests.forEach(consider);
      for (const b of this.profile.built) if (b.item === 'chest' && b.x < INTERIOR_X / 2) consider({ id: `b${b.uid}`, x: b.x, z: b.z });
    }
    if (int) for (const b of this.profile.built) if (b.item === 'chest' && b.x > INTERIOR_X / 2) consider({ id: `b${b.uid}`, x: b.x, z: b.z });
    return best;
  }

  private korokNear(range = 2.4): string | null {
    if (this.inside) return null;
    const p = this.hero.position;
    let best: string | null = null;
    let bd = range;
    for (const k of this.koroks) {
      const kid = k.userData.kid as string | undefined;
      if (!kid || !k.visible) continue;
      const d = Math.hypot(k.position.x - p.x, k.position.z - p.z);
      if (d < bd) { bd = d; best = kid; }
    }
    return best;
  }

  private builtNear(range = 2.4) {
    const p = this.hero.position;
    let best = null as (typeof this.profile.built)[number] | null;
    let bd = range;
    for (const b of this.profile.built) {
      if ((b.x > INTERIOR_X / 2) !== !!this.inside) continue;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private notice(text: string): void {
    this.onNotice(text);
  }

  private lootText(l: Loot): string {
    const parts = [de.notice.rupees(l.rupees), ...Object.entries(l.items).map(([id, n]) => `${n}× ${itemById(id).emoji}`)];
    return parts.join('  ');
  }

  private applyLoot(l: Loot, into?: Record<string, number>): void {
    earn(this.profile, l.rupees);
    for (const [id, n] of Object.entries(l.items)) addItem(into ?? this.profile.inventory, id, n);
  }

  private action(): void {
    if (this.placing) {
      const p = this.placing;
      if (!p.ok) return this.notice(de.notice.noSpace);
      const spot = p.ghost.position;
      const b = place(this.profile, p.id, spot.x, spot.z, p.ry);
      if (b) {
        sfx('place');
        this.addBuilt(b);
        this.onChange();
      }
      this.cancelPlacing();
      return;
    }
    const chest = this.chestNear();
    if (chest) {
      if (chest.id.startsWith('w-') && !this.profile.found.includes(chest.id)) {
        const l = chestLoot(chest.id);
        this.profile.found.push(chest.id);
        earn(this.profile, l.rupees);
        sfx('chest');
        this.profile.chests[chest.id] = { ...l.items };
        this.notice(de.notice.chestFound(l.rupees));
        this.onChange();
      }
      sfx('chest');
      this.onChest(chest.id);
      return;
    }
    const talk = this.korokNear();
    if (talk) { this.onTalk(talk); return; }
    const tool = this.profile.tool;
    if (!tool) return this.notice(de.notice.noTool);
    this.swing = 0.001;
    if (tool !== 'shovel') sfx('swing');
    if (tool === 'sword') this.hitEnemies();
    else if (tool === 'axe') this.chop();
    else this.dig();
  }

  private hitEnemies(): void {
    const p = this.hero.position;
    const f = this.forward(1);
    const fx = f.x - p.x, fz = f.z - p.z;
    for (const e of this.enemies) {
      if (e.dead > 0 || e.hp <= 0) continue;
      const dx = e.x - p.x, dz = e.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.4 || (dx * fx + dz * fz) / (d || 1) < -0.2) continue;
      e.hp -= 1;
      sfx('hit');
      e.kx = (dx / (d || 1)) * 6;
      e.kz = (dz / (d || 1)) * 6;
      if (e.hp <= 0) {
        e.dead = 25;
        e.obj.visible = false;
        earn(this.profile, 2);
        sfx('slime');
        setTimeout(() => sfx('coin'), 200);
        this.notice(de.notice.slimeDown(2));
        this.onChange();
      }
    }
  }

  private chop(): void {
    const p = this.hero.position;
    let best: Obstacle | null = null;
    let bd = 2.6;
    for (const o of this.obstacles) {
      if (o.kind !== 'tree' || !o.obj) continue;
      const d = Math.hypot(o.x - p.x, o.z - p.z) - o.r;
      if (d < bd) { bd = d; best = o; }
    }
    if (!best?.obj) return this.notice(de.notice.noTree);
    this.obstacles.splice(this.obstacles.indexOf(best), 1);
    this.decor = this.decor.filter((d) => d.obj !== best!.obj);
    const regrow: Regrow = { obj: best.obj, o: best, x: best.x, z: best.z, scale: best.obj.scale.x, t: 90, grow: 0 };
    this.falling.push({ obj: best.obj, t: 0, regrow });
    sfx('chop');
    setTimeout(() => sfx('treefall'), 250);
    addItem(this.profile.inventory, 'wood', 2);
    this.notice(de.notice.wood(2));
    this.onChange();
  }

  private dig(): void {
    if (this.inside) return this.notice(de.notice.noDigInside);
    const p = this.hero.position;
    sfx('dig');
    const spot = this.spots.find((s) => !this.profile.found.includes(s.id) && Math.hypot(s.x - p.x, s.z - p.z) < 2.2);
    if (spot) {
      const l = treasureLoot(spot.id);
      this.applyLoot(l);
      setTimeout(() => sfx('treasure'), 250);
      this.profile.found.push(spot.id);
      spot.obj.visible = false;
      this.dropHole(spot.x, spot.z);
      this.notice(de.notice.found(this.lootText(l)));
      this.onChange();
      return;
    }
    const f = this.forward(1.3);
    const near = this.holes.find((h) => Math.hypot(h.position.x - f.x, h.position.z - f.z) < 1.0);
    if (near) {
      this.holeGroup.remove(near);
      disposeTree(near);
      this.holes.splice(this.holes.indexOf(near), 1);
      return;
    }
    if (this.active().some((o) => o.h > 0.25 && Math.hypot(o.x - f.x, o.z - f.z) < o.r + 0.4)) return this.notice(de.notice.noSpace);
    this.dropHole(f.x, f.z);
  }

  private dropHole(x: number, z: number): void {
    const h = createHole();
    h.position.set(x, heightAt(x, z) + 0.02, z);
    this.holeGroup.add(h);
    this.holes.push(h);
    if (this.holes.length > 30) {
      const old = this.holes.shift()!;
      this.holeGroup.remove(old);
      disposeTree(old);
    }
  }

  private pickupCmd(): void {
    if (this.placing) return this.cancelPlacing();
    const b = this.builtNear();
    if (!b) return;
    if (b.item === 'chest' && bagSize(this.profile.chests[`b${b.uid}`] ?? {}) > 0) return this.notice(de.notice.notEmpty);
    if (b.item === 'house') {
      const info = this.houseInfo(`b${b.uid}`);
      const busy = this.profile.built.some((o) => Math.abs(o.x - info.ox) < 6) || bagSize(this.profile.chests[`hk-b${b.uid}`] ?? {}) > 0;
      if (busy) return this.notice(de.notice.houseNotEmpty);
    }
    delete this.profile.chests[`b${b.uid}`];
    const done = pickUp(this.profile, b.uid);
    if (done) {
      this.removeBuilt(done.uid, done.item);
      this.notice(de.notice.pickedUp(itemById(done.item).emoji));
      this.onChange();
    }
  }

  // ---------------------------------------------------------------- Frame

  frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.t += dt;
    this.frameNo++;
    const hero = this.hero;
    const p = hero.position;
    let moving = false;
    const int = this.current();

    if (!this.paused && this.profile) {
      const { x, y, run } = this.input;
      if (!this.inside) {
        this.camYaw -= this.input.lookX * dt * 2.4;
        this.camElev = Math.min(1.35, Math.max(-0.15, this.camElev + this.input.lookY * dt * 1.6));
      }
      const mx = x;
      const len = Math.hypot(mx, y);
      const kx = this.knock.x, kz = this.knock.z;
      if (len > 0.05 || kx || kz) {
        const yaw = this.inside ? 0 : this.camYaw;
        const sy = Math.sin(yaw), cy = Math.cos(yaw), nx = mx / Math.max(len, 1), ny = y / Math.max(len, 1);
        const ux = len > 0.05 ? nx * cy - ny * sy : 0;
        const uz = len > 0.05 ? -nx * sy - ny * cy : 0;
        // bergauf geht es langsamer (Klettern)
        const up = this.inside ? 0 : Math.max(0, (heightAt(p.x + ux * 0.3, p.z + uz * 0.3) - this.gy) / 0.3);
        const speed = (run ? RUN : WALK) * Math.min(len, 1) * Math.max(0.45, 1 - 0.55 * up);
        const vx = ux * speed * dt + kx * dt;
        const vz = uz * speed * dt + kz * dt;
        this.tryMove(p, vx, vz);
        this.knock.x *= 0.88;
        this.knock.z *= 0.88;
        if (Math.abs(this.knock.x) < 0.1) this.knock.x = 0;
        if (Math.abs(this.knock.z) < 0.1) this.knock.z = 0;
        this.collide(p);
        if (len > 0.05) {
          moving = true;
          hero.rotation.y = Math.atan2(ux, uz);
        }
      }
      if (int) {
        const b = int.int.bounds;
        p.x = Math.min(b.x1, Math.max(b.x0, p.x));
        p.z = Math.min(b.z1, Math.max(b.z0, p.z));
      } else {
        p.x = Math.min(X1 - 0.6, Math.max(X0 + 0.6, p.x));
        p.z = Math.min(Z1 - 0.6, Math.max(Z0 + 0.6, p.z));
      }

      // Sprung, Fallen und Bodenfolgen
      this.gy = heightAt(p.x, p.z);
      const g = this.standHeight(p, this.gy);
      if (this.vy > 0 || p.y > g + 0.3 || (this.air && p.y > g)) {
        this.air = true;
        this.peak = Math.max(this.peak, p.y);
        this.vy -= GRAVITY * dt;
        p.y += this.vy * dt;
        if (p.y <= g && this.vy <= 0) {
          p.y = g;
          this.vy = 0;
          this.air = false;
          if (this.peak - g > 2.5) this.onNotice(de.notice.fell);
          if (this.peak - g > 0.5) sfx('land');
          this.peak = g;
        }
      } else {
        p.y = g;
        this.peak = g;
        if (moving) p.y = g + Math.abs(Math.sin(this.t * (run ? 16 : 12))) * 0.08;
      }
      this.revealMap(dt);

      this.updateZones();
      this.updateEnemies(dt);
      this.updatePlacing();
    }

    this.animate(dt, moving);
    this.updateEnvironment(dt);
    this.updateContext();
    this.post.render(dt);
  }

  /** Bewegt den Helden; zu steile Hänge (Felswände) sind unpassierbar, an Kanten wird entlanggerutscht. */
  private tryMove(p: THREE.Vector3, vx: number, vz: number): void {
    const L = Math.hypot(vx, vz);
    if (L < 1e-6) return;
    if (this.inside) { p.x += vx; p.z += vz; return; }
    const dx = (vx / L) * 0.3, dz = (vz / L) * 0.3;
    const ok = (nx: number, nz: number) => heightAt(nx + dx, nz + dz) - p.y <= 0.34;
    if (ok(p.x + vx, p.z + vz)) { p.x += vx; p.z += vz; }
    else if (Math.abs(vx) > 1e-6 && ok(p.x + vx, p.z)) p.x += vx;
    else if (Math.abs(vz) > 1e-6 && ok(p.x, p.z + vz)) p.z += vz;
  }

  /** Deckt Kartenfelder um den Helden auf. */
  /** Sofort sichtbar, ohne auf das Speichern zu warten. */
  seen(x: number, z: number): boolean {
    return this.expl[cellOf(x, z)] === 1;
  }

  private revealMap(dt: number): void {
    if (this.inside || !this.profile) return;
    const p = this.hero.position;
    if (this.frameNo % 3 === 0) {
      const R = 14;
      for (let dz = -R; dz <= R; dz += 4) {
        for (let dx = -R; dx <= R; dx += 4) {
          if (dx * dx + dz * dz > R * R) continue;
          const i = cellOf(p.x + dx, p.z + dz);
          if (!this.expl[i]) { this.expl[i] = 1; this.explDirty = 1.5; }
        }
      }
    }
    if (this.explDirty > 0) {
      this.explDirty -= dt;
      if (this.explDirty <= 0) {
        this.profile.explored = Array.from(this.expl, (v) => (v ? '1' : '0')).join('');
        this.onChange();
      }
    }
  }

  private collide(p: THREE.Vector3): void {
    const list = this.active();
    for (let pass = 0; pass < 2; pass++) {
      for (const o of list) {
        if (p.y - this.gy > o.h - 0.05) continue;
        const dx = p.x - o.x, dz = p.z - o.z;
        if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
        const min = o.r + HERO_R;
        const d = Math.hypot(dx, dz);
        if (d < min) {
          if (d > 1e-4) { p.x = o.x + (dx / d) * min; p.z = o.z + (dz / d) * min; }
          else p.x = o.x + min;
        }
      }
    }
  }

  /** Niedrige Hindernisse (Steine, Zäune …) kann man erklimmen: Boden = Oberkante. */
  private standHeight(p: THREE.Vector3, ground: number): number {
    let top = ground;
    for (const o of this.active()) {
      if (o.h > 1.6 || o.kind === 'tree') continue;
      if (Math.abs(p.x - o.x) > o.r + HERO_R || Math.abs(p.z - o.z) > o.r + HERO_R) continue;
      if (Math.hypot(p.x - o.x, p.z - o.z) > o.r + HERO_R + 0.05) continue;
      const t = ground + o.h;
      if (p.y >= t - 0.35 && t > top) top = t;
    }
    return top;
  }

  private discoverAreas(p: THREE.Vector3): void {
    const a = areaAt(p.x, p.z);
    if (!a || this.profile.areas.includes(a.id)) return;
    this.profile.areas.push(a.id);
    this.onChange();
    this.onArea(a.id);
  }

  private updateZones(): void {
    const p = this.hero.position;
    if (this.inside) {
      const ex = this.current()!.int.exit;
      const d = Math.hypot(p.x - ex.x, p.z - ex.z);
      if (d < 0.95) {
        if (!this.armed.has('exit')) this.leave();
      } else if (d > 1.6) this.armed.delete('exit');
      return;
    }
    const here = areaAt(p.x, p.z)?.id ?? null;
    if (here !== this.areaId) { this.areaId = here; this.onIsland(here); }
    this.discoverAreas(p);
    const next = here ? this.biome : biomeAt(p.x, p.z, this.biome);
    if (next !== this.biome) {
      this.biome = next;
      this.onBiome(next);
    }
    for (const s of this.stations) {
      const key = `${s.op}:${s.id}:${Math.round(s.x)}:${Math.round(s.z)}`;
      if (Math.hypot(p.x - s.x, p.z - s.z) < 1.3) {
        if (!this.armed.has(key)) { this.armed.add(key); this.onStation(s); }
      } else this.armed.delete(key);
    }
    for (const h of this.houses) {
      const key = `door:${h.key}`;
      const d = this.doorPoint(h);
      const dist = Math.hypot(p.x - d.x, p.z - d.z);
      if (dist < 0.9 && p.y - this.gy < 0.5) {
        if (!this.armed.has(key)) { this.armed.add(key); this.enter(h); return; }
      } else if (dist > 1.8) this.armed.delete(key);
    }
  }

  private updateEnemies(dt: number): void {
    if (this.inside) return;
    const p = this.hero.position;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hero.visible = this.invuln <= 0 || Math.floor(this.t * 20) % 2 === 0;
    for (const e of this.enemies) {
      if (e.dead > 0) {
        e.dead -= dt;
        if (e.dead <= 0) { e.hp = 2; e.x = e.hx; e.z = e.hz; e.obj.visible = true; }
        continue;
      }
      if (Math.abs(e.x - p.x) > 45 || Math.abs(e.z - p.z) > 45) continue;
      const dh = Math.hypot(p.x - e.x, p.z - e.z);
      let speed = 0;
      if (dh < 7 && !this.paused) {
        e.tx = p.x; e.tz = p.z;
        speed = 2.2;
      } else {
        e.wait -= dt;
        if (e.wait <= 0) {
          e.tx = e.hx + (Math.random() - 0.5) * 10;
          e.tz = e.hz + (Math.random() - 0.5) * 10;
          e.wait = 2 + Math.random() * 3;
        }
        speed = 0.9;
      }
      const dx = e.tx - e.x, dz = e.tz - e.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3) {
        e.x += (dx / d) * speed * dt;
        e.z += (dz / d) * speed * dt;
        e.obj.rotation.y = Math.atan2(dx, dz);
      }
      e.x += e.kx * dt; e.z += e.kz * dt;
      e.kx *= 0.85; e.kz *= 0.85;
      e.obj.position.set(e.x, heightAt(e.x, e.z), e.z);
      const b = e.obj.userData.body;
      b.scale.y = 0.85 + Math.sin(this.t * 5 + e.hx) * 0.1;
      if (dh < 0.95 && this.invuln <= 0 && p.y - this.gy < 0.4) {
        this.invuln = 1.2;
        this.onHurt();
        const k = dh || 1;
        this.knock.x = ((p.x - e.x) / k) * 9;
        this.knock.z = ((p.z - e.z) / k) * 9;
        e.kx = -this.knock.x * 0.4;
        e.kz = -this.knock.z * 0.4;
      }
    }
  }

  private updatePlacing(): void {
    const pl = this.placing;
    if (!pl) return;
    const f = this.forward(2.2);
    pl.ghost.position.set(f.x, heightAt(f.x, f.z), f.z);
    pl.ghost.rotation.y = pl.ry;
    pl.ok = this.canPlace(pl.id, f.x, f.z);
    pl.ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          const mm = m as THREE.MeshStandardMaterial;
          if (mm.emissive) mm.emissive.setHex(pl.ok ? 0x114411 : 0x992222);
        });
      }
    });
  }

  private animate(dt: number, moving: boolean): void {
    for (const o of this.spinners) o.rotation.z += dt * 1.5;
    const hero = this.hero;
    const { legs, arms } = hero.userData;
    const rate = this.input.run ? 16 : 12;
    const air = this.air;
    const sw = air ? 0.9 : moving ? Math.sin(this.t * rate) * (this.input.run ? 0.95 : 0.7) : 0;
    legs[0].rotation.x = air ? 0.5 : sw;
    legs[1].rotation.x = air ? -0.4 : -sw;
    arms[0].rotation.x = air ? -2.4 : -sw * 0.8;
    arms[1].rotation.x = air ? -2.4 : this.toolObj ? -0.35 : sw * 0.8;
    if (this.swing > 0) {
      this.swing += dt / 0.35;
      if (this.swing >= 1) this.swing = 0;
      else arms[1].rotation.x = -0.35 - 1.5 * Math.sin(this.swing * Math.PI);
    }
    // Hündchen umkreist die Hauptfigur nur, solange diese läuft, und läuft immer vorwärts
    const hv = Math.hypot(hero.position.x - this.heroPrev.x, hero.position.z - this.heroPrev.z) / Math.max(dt, 1e-3);
    this.heroPrev.copy(hero.position);
    if (hv > 0.3) this.companionAng += dt * 1.3;
    const cx = this.companion.position.x, cz = this.companion.position.z;
    const tx = hero.position.x + Math.cos(this.companionAng) * 1.7;
    const tz = hero.position.z + Math.sin(this.companionAng) * 1.7;
    let dx = tx - cx, dz = tz - cz;
    const dist = Math.hypot(dx, dz);
    let speed = 0;
    if (this.snapCamera || dist > 8) {
      this.companion.position.x = tx;
      this.companion.position.z = tz;
    } else if (dist > 0.12) {
      speed = Math.min(dist * 5, Math.max(hv * 1.4, 2.5), 7);
      const step = Math.min(dist, speed * dt);
      dx = (dx / dist) * step;
      dz = (dz / dist) * step;
      const cp = this.tmp2.set(cx + dx, hero.position.y, cz + dz);
      this.collide(cp);
      this.companion.position.x = cp.x;
      this.companion.position.z = cp.z;
      const want = Math.atan2(dx, dz);
      let d = want - this.companion.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.companion.rotation.y += d * Math.min(1, dt * 12);
    }
    const pupMoving = speed > 0.3;
    this.companion.position.y = heightAt(this.companion.position.x, this.companion.position.z);
    const run = pupMoving ? Math.sin(this.t * 14) * 0.7 : 0;
    this.companion.userData.legs.forEach((l: THREE.Object3D, i: number) => (l.rotation.x = i === 0 || i === 3 ? run : -run));
    this.companion.userData.tail.rotation.y = Math.sin(this.t * (pupMoving ? 12 : 4)) * (pupMoving ? 0.5 : 0.3);
    if (this.dog) {
      this.dog.userData.tail.rotation.y = Math.sin(this.t * 6) * 0.35;
      this.dog.userData.head.rotation.z = Math.sin(this.t * 1.3) * 0.08;
    }

    if (this.frameNo % 3 === 0) {
      this.koroks.forEach((k, i) => {
        if (!k.visible) return;
        k.userData.leaf.rotation.y += dt * 3 * (2 + (i % 3));
        k.userData.head.rotation.z = Math.sin(this.t * 2 + i) * 0.08;
      });
    }
    this.rings.forEach((r, i) => {
      const k = 1 + Math.sin(this.t * 3 + i) * 0.08;
      r.scale.set(k, k, 1);
    });
    for (const s of this.spots) {
      s.obj.rotation.y += dt * 2;
      s.obj.position.y = s.y + 0.5 + Math.sin(this.t * 3 + s.x) * 0.12;
    }
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      f.obj.rotation.z = Math.min(1, f.t / 0.5) * 1.5;
      f.obj.position.y = heightAt(f.regrow.x, f.regrow.z) - f.t * 0.5;
      if (f.t > 0.7) {
        f.obj.visible = false;
        this.regrow.push(f.regrow);
        this.falling.splice(i, 1);
      }
    }
    // gefällte Bäume wachsen nach
    for (let i = this.regrow.length - 1; i >= 0; i--) {
      const r = this.regrow[i];
      if (this.inside) continue;
      r.t -= dt;
      if (r.t > 0) continue;
      if (r.grow === 0) {
        const p = this.hero.position;
        if (Math.hypot(p.x - r.x, p.z - r.z) < r.o.r + HERO_R + 0.3) { r.t = 1; continue; }
        r.obj.visible = true;
        r.obj.rotation.z = 0;
        r.obj.position.y = heightAt(r.x, r.z);
      }
      r.grow += dt;
      const grow = Math.min(1, r.grow / 4);
      r.obj.scale.setScalar(Math.max(0.05, r.scale * grow));
      if (grow >= 1) {
        this.obstacles.push(r.o);
        this.decor.push({ obj: r.obj, x: r.x, z: r.z });
        this.regrow.splice(i, 1);
      }
    }
  }

  private updateEnvironment(dt: number): void {
    const p = this.hero.position;
    if (this.frameNo % 6 === 0 && !this.inside) {
      for (const d of this.decor) d.obj.visible = Math.abs(d.x - p.x) < CULL && Math.abs(d.z - p.z) < CULL && Math.hypot(d.x - p.x, d.z - p.z) < CULL;
      for (const s of this.spots) if (this.profile?.found.includes(s.id)) s.obj.visible = false;
    }
    this.grass.update(p.x, p.z, this.t, !this.inside && this.post.quality !== 'low');
    if (!this.inside) {
      this.updateMotes();
      for (const o of this.obstacles) {
        if (o.kind !== 'tree' || !o.obj || !o.obj.visible) continue;
        o.obj.rotation.z = Math.sin(this.t * 1.3 + o.x * 0.7) * 0.02;
        o.obj.rotation.x = Math.cos(this.t * 1.1 + o.z * 0.6) * 0.02;
      }
    }
    this.updateSky();
    this.updateShafts();
    this.sun.position.set(p.x + 10, 18, p.z + 8);
    this.sun.target.position.set(p.x, this.gy, p.z);

    if (this.inside) {
      const fog = this.scene.fog as THREE.Fog;
      fog.near = 60; fog.far = 200;
    } else {
      const fog = this.scene.fog as THREE.Fog;
      fog.near = 28; fog.far = 62;
      blend(p.x, p.z, (op) => new THREE.Color(THEMES[op].sky), this.tmp, 14);
      this.skyColor.lerp(this.tmp, Math.min(1, dt * 3));
      fog.color.copy(this.skyColor);
      blend(p.x, p.z, (op) => new THREE.Color(THEMES[op].sun), this.tmp, 14);
      this.sun.color.copy(this.tmp);
    }

    const cp = this.hero.position;
    const goal = this.inside
      ? new THREE.Vector3(this.current()!.ox + (cp.x - this.current()!.ox) * 0.3, 6.6, 7.6)
      : new THREE.Vector3(cp.x + Math.sin(this.camYaw) * Math.cos(this.camElev) * 12.5, Math.max(this.gy + 0.6, this.gy + 1 + Math.sin(this.camElev) * 12.5), cp.z + Math.cos(this.camYaw) * Math.cos(this.camElev) * 12.5);
    if (this.snapCamera) { this.camera.position.copy(goal); this.snapCamera = false; if (!this.inside) this.skyColor.copy(this.tmp); }
    else this.camera.position.lerp(goal, Math.min(1, dt * 4));
    if (this.inside) this.camera.lookAt(goal.x, 0.6, 0.3);
    else this.camera.lookAt(cp.x, 1 + this.gy, cp.z);
  }

  private updateContext(): void {
    if (!this.profile) return;
    let action: ActionKind = null;
    if (this.placing) action = 'place';
    else if (this.chestNear()) action = 'open';
    else if (this.korokNear()) action = 'talk';
    else if (this.profile.tool) action = this.profile.tool as ActionKind;
    const pickup = !!this.placing || !!this.builtNear();
    const key = `${action}|${pickup}`;
    if (key !== this.lastCtx) {
      this.lastCtx = key;
      this.onContext({ action, pickup });
    }
  }
}
