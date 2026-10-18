import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS (selbstsigniert) nur für den Handy-Test im WLAN: npm run dev:lan
export default defineConfig({
  plugins: process.env.LAN_HTTPS ? [basicSsl()] : [],
});
