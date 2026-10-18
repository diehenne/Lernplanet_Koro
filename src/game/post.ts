import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type Quality = 'low' | 'med' | 'high';

// Farbkorrektur: warme Lichter, kühle Schatten, etwas mehr Sättigung, weiche Vignette.
const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, 1.18);
      c.rgb *= mix(vec3(0.94, 0.98, 1.06), vec3(1.06, 1.02, 0.94), smoothstep(0.1, 0.9, l));
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - smoothstep(0.45, 0.95, d) * 0.28;
      gl_FragColor = c;
    }`,
};

export class PostFX {
  private composer: EffectComposer;
  private ao: GTAOPass;
  private bloom: UnrealBloomPass;
  private quality: Quality;
  private slow = 0;
  private fast = 0;
  private ratio: number;

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const saved = localStorage.getItem('koro.quality') as Quality | null;
    this.quality = saved === 'low' || saved === 'med' || saved === 'high' ? saved : 'high';
    this.ratio = Math.min(devicePixelRatio, 2);
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new GTAOPass(scene, camera, 1, 1);
    this.ao.output = GTAOPass.OUTPUT.Default;
    this.ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.5, scale: 1.1, samples: 12 });
    this.ao.blendIntensity = 0.85;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new ShaderPass(GradeShader));
    this.composer.addPass(new OutputPass());
    this.apply();
  }

  setQuality(q: Quality): void {
    this.quality = q;
    localStorage.setItem('koro.quality', q);
    this.apply();
  }

  private apply(): void {
    this.ao.enabled = this.quality === 'high';
    this.bloom.enabled = this.quality !== 'low';
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(this.quality === 'low' ? 1 : this.ratio);
    this.resize(innerWidth, innerHeight);
  }

  resize(w: number, h: number): void {
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
  }

  // Schlechte Bildrate -> Qualität/Auflösung automatisch senken.
  render(dt: number): void {
    if (dt > 0.034) { this.slow++; this.fast = 0; } else if (dt < 0.02) { this.fast++; this.slow = Math.max(0, this.slow - 1); }
    if (this.slow > 90) {
      this.slow = 0;
      if (this.quality === 'high') this.setQuality('med');
      else if (this.ratio > 1.25) { this.ratio = Math.max(1, this.ratio - 0.5); this.apply(); }
      else if (this.quality === 'med') this.setQuality('low');
    }
    this.composer.render(dt);
  }
}
