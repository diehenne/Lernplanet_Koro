import * as THREE from 'three';

function rng(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTexture(size: number, paint: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  paint(g, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Helle Basis mit Grashalmen, Flecken und Blümchen; wird mit der Vertexfarbe multipliziert. */
export function groundTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (g, r) => {
    g.fillStyle = '#dcdcdc';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      const x = r() * 256, y = r() * 256, rad = 8 + r() * 22;
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(90,90,90,0.05)';
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
        g.beginPath();
        g.arc(x + ox, y + oy, rad, 0, 7);
        g.fill();
      }
    }
    for (let i = 0; i < 1400; i++) {
      const x = r() * 256, y = r() * 256, len = 3 + r() * 5, lean = (r() - 0.5) * 3;
      g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(60,60,60,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + lean, y - len);
      g.stroke();
    }
    for (let i = 0; i < 22; i++) {
      g.fillStyle = ['#ffffff', '#fff3a0', '#ffd0e6'][i % 3];
      g.beginPath();
      g.arc(r() * 256, r() * 256, 1.4, 0, 7);
      g.fill();
    }
  }, 7);
}

/** Feine Körnung für Figuren, Häuser, Felsen und Bäume. */
export function grainTexture(): THREE.CanvasTexture {
  return canvasTexture(64, (g, r) => {
    g.fillStyle = '#f2f2f2';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 260; i++) {
      const v = 200 + Math.floor(r() * 55);
      g.fillStyle = `rgba(${v},${v},${v},0.6)`;
      g.fillRect(r() * 64, r() * 64, 2, 2);
    }
    g.strokeStyle = 'rgba(90,90,90,0.15)';
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.moveTo(r() * 64, r() * 64);
      g.lineTo(r() * 64, r() * 64);
      g.stroke();
    }
  }, 11);
}

let grain: THREE.CanvasTexture | null = null;
export const sharedGrain = (): THREE.CanvasTexture => (grain ??= grainTexture());

/** Gröbere Bodenwellen für Tiefe (als Bump-Map, wirkt unter schrägem Licht). */
export function groundBump(): THREE.CanvasTexture {
  const t = canvasTexture(256, (g, r) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      const x = r() * 256, y = r() * 256, rad = 6 + r() * 20;
      const v = r() < 0.5 ? 255 : 0;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
        gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = gr;
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
    for (let i = 0; i < 1800; i++) {
      const x = r() * 256, y = r() * 256;
      g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - 3 - r() * 4); g.stroke();
    }
  }, 21);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Gepflasterter/erdiger Weg: helle Basis mit Fugen und Steinchen (wird mit Wegfarbe multipliziert). */
let pathTex: THREE.CanvasTexture | null = null;
export function pathTexture(): THREE.CanvasTexture {
  return (pathTex ??= canvasTexture(256, (g, r) => {
    g.fillStyle = '#f0f0f0';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      if (r() < 0.45) continue;
      const v = 215 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.roundRect(i * 16 + 1.5 + r() * 2, j * 16 + 1.5 + r() * 2, 12 + r() * 2, 12 + r() * 2, 4);
      g.fill();
    }
    for (let i = 0; i < 600; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(120,100,70,0.2)';
      g.fillRect(r() * 256, r() * 256, 2, 2);
    }
  }, 33));
}
