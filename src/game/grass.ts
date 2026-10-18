import * as THREE from 'three';

const RADIUS = 24;
const CELL = 0.5;

const hash = (x: number, z: number, k: number): number => {
  const s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Büschel um den Helden, die im Wind wiegen. Werden bei Bewegung auf einem Raster neu verteilt. */
export class Grass {
  readonly mesh: THREE.InstancedMesh;
  private uTime = { value: 0 };
  private cx = Infinity;
  private cz = Infinity;
  private color = new THREE.Color();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(
    private heightAt: (x: number, z: number) => number,
    private colorAt: (x: number, z: number, out: THREE.Color) => void,
    private skip: (x: number, z: number) => number,
    max = 9000,
  ) {
    const geo = new THREE.BufferGeometry();
    // Drei Halme pro Büschel, jeweils beidseitig (Gegenwinkel) damit das Licht nicht kippt.
    const v: number[] = [];
    const col: number[] = [];
    const n: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI;
      const c = Math.cos(a) * 0.05, s = Math.sin(a) * 0.05;
      for (const f of [1, -1]) {
        v.push(-c * f, 0, -s * f, c * f, 0, s * f, 0.02 * f, 1, 0.02 * f);
        col.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.1, 1.1, 1.1);
        n.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = position;
         float sway = sin(uTime * 1.7 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.7) + 0.5 * sin(uTime * 3.1 + instanceMatrix[3].z * 1.9);
         transformed.x += sway * 0.22 * position.y * position.y;
         transformed.z += sway * 0.12 * position.y * position.y;`,
      );
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.count = 0;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  }

  update(x: number, z: number, t: number, visible: boolean): void {
    this.mesh.visible = visible;
    if (!visible) return;
    this.uTime.value = t;
    const gx = Math.round(x / 2) * 2, gz = Math.round(z / 2) * 2;
    if (gx === this.cx && gz === this.cz) return;
    this.cx = gx;
    this.cz = gz;
    const max = (this.mesh.instanceMatrix as THREE.BufferAttribute).count;
    let n = 0;
    const r = Math.ceil(RADIUS / CELL);
    for (let i = -r; i <= r && n < max; i++) {
      for (let j = -r; j <= r && n < max; j++) {
        const ix = Math.round(gx / CELL) + i, iz = Math.round(gz / CELL) + j;
        const wx = ix * CELL + (hash(ix, iz, 1) - 0.5) * CELL * 0.9;
        const wz = iz * CELL + (hash(ix, iz, 2) - 0.5) * CELL * 0.9;
        const d = Math.hypot(wx - gx, wz - gz);
        if (d > RADIUS || hash(ix, iz, 3) < 0.35) continue;
        const clear = this.skip(wx, wz);
        if (clear < 0) continue;
        const fade = Math.min(1, (RADIUS - d) / 6) * Math.min(1, clear / 1.5);
        const h = (0.3 + hash(ix, iz, 4) * 0.35) * fade;
        this.p.set(wx, this.heightAt(wx, wz), wz);
        this.s.set(1, h, 1);
        this.q.setFromEuler(this.e.set(0, hash(ix, iz, 5) * 6.28, 0));
        this.m.compose(this.p, this.q, this.s);
        this.mesh.setMatrixAt(n, this.m);
        this.colorAt(wx, wz, this.color);
        this.color.multiplyScalar(0.75 + hash(ix, iz, 6) * 0.5);
        this.mesh.setColorAt(n, this.color);
        n++;
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }
}
