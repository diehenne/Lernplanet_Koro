import { duckMusic } from './music';
import { fileFor, type Seg, segmentsOf } from './speechText';

let enabled = true;
let ctx: AudioContext | null = null;
let token = 0;
let playing: AudioBufferSourceNode[] = [];
const cache = new Map<string, Promise<AudioBuffer | null>>();

export function setSpeech(on: boolean): void {
  enabled = on;
  if (!on) stop();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') stop();
});
window.addEventListener('pagehide', stop);

export function speechOn(): boolean {
  return enabled;
}

function stop(): void {
  token++;
  for (const s of playing) {
    try { s.stop(); } catch { /* bereits beendet */ }
  }
  playing = [];
}

/** Normal per Netz geladen; in der Ein-Datei-Version aus dem eingebetteten Paket. */
async function bytesOf(file: string): Promise<ArrayBuffer> {
  if (__SINGLE__) {
    const pack = (await import('virtual:audio-pack')).default;
    const b64 = pack[file];
    if (!b64) throw new Error('fehlt');
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  const r = await fetch(`${import.meta.env.BASE_URL}audio/${file}.mp3`);
  if (!r.ok) throw new Error(String(r.status));
  return r.arrayBuffer();
}

function load(file: string): Promise<AudioBuffer | null> {
  let p = cache.get(file);
  if (!p) {
    p = bytesOf(file)
      .then((buf) => ctx!.decodeAudioData(buf))
      .catch(() => {
        console.warn('Audio-Baustein fehlt:', file);
        return null;
      });
    cache.set(file, p);
  }
  return p;
}

function gapAfter(seg: Seg): number {
  return seg.type === 'text' ? 0.14 : 0.06;
}

/** Liest einen Satz mit der vorab erzeugten KI-Stimme vor (Bausteine werden nahtlos aneinandergereiht). */
export async function speak(text: string): Promise<void> {
  if (!enabled) return;
  ctx ??= new AudioContext();
  void ctx.resume();
  stop();
  const id = token;
  const segs = segmentsOf(text);
  const buffers = await Promise.all(segs.map((s) => load(fileFor(s))));
  if (id !== token || !enabled) return;
  let t = ctx.currentTime + 0.05;
  segs.forEach((seg, i) => {
    const buf = buffers[i];
    if (!buf) return;
    const src = ctx!.createBufferSource();
    src.buffer = buf;
    src.connect(ctx!.destination);
    src.start(t);
    playing.push(src);
    t += buf.duration + gapAfter(seg);
  });
  duckMusic(t - ctx.currentTime + 0.3);
}
