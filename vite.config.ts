import { defineConfig, type Plugin } from 'vite';
import { readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { viteSingleFile } from 'vite-plugin-singlefile';

const SINGLE = !!process.env.SINGLE_FILE;

/** Sprachbausteine als Base64 direkt in die Ein-Datei-Version einbetten. */
function audioPack(): Plugin {
  const id = 'virtual:audio-pack';
  return {
    name: 'audio-pack',
    resolveId: (s) => (s === id ? '\0' + id : undefined),
    load(s) {
      if (s !== '\0' + id) return;
      const pack: Record<string, string> = {};
      if (SINGLE) {
        for (const f of readdirSync('public/audio').filter((n) => n.endsWith('.mp3'))) {
          pack[f.slice(0, -4)] = readFileSync(`public/audio/${f}`).toString('base64');
        }
      }
      return `export default ${JSON.stringify(pack)};`;
    },
  };
}

/** Klassisches Skript am Ende von body: läuft auch in Datei-Viewern ohne Modul-Unterstützung (z. B. iPad). */
function classicScript(): Plugin {
  return {
    name: 'classic-script',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const f = 'dist-single/index.html';
      let h = readFileSync(f, 'utf8');
      const m = h.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/);
      if (!m) return;
      h = h.replace(m[0], '');
      const code = m[1].replace(/<\/script/gi, '<\\/script');
      h = h.replace('</body>', () => `<script>${code}</script>\n</body>`);
      writeFileSync(f, h);
      renameSync(f, 'dist-single/lernplanet.html');
    },
  };
}

// HTTPS (selbstsigniert) nur für den Handy-Test im WLAN: npm run dev:lan
// Ein-Datei-Version für Tablets ohne Server: npm run build:single
export default defineConfig({
  base: './',
  define: { __SINGLE__: JSON.stringify(SINGLE) },
  publicDir: SINGLE ? false : 'public',
  build: SINGLE
    ? {
        outDir: 'dist-single',
        assetsInlineLimit: 100000000,
        chunkSizeWarningLimit: 100000,
        rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
      }
    : {},
  plugins: [audioPack(), ...(process.env.LAN_HTTPS ? [basicSsl()] : []), ...(SINGLE ? [viteSingleFile(), classicScript()] : [])],
});
