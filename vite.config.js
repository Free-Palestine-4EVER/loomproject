import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Everything under public/ is copied into dist/ wholesale, including assets only
// the dev-only *-lab.html turntables ever ask for. The labs are not build inputs
// and no mounted component imports BeeField / CuratedField / ButterflyField, so
// these 13 MB of GLBs were shipping to every visitor's CDN origin for nothing.
// They stay in public/ (the labs still need them under `npm run dev`) and are
// dropped from the production output instead.
const DEV_ONLY_ASSETS = ['models']

const stripDevOnlyAssets = () => ({
  name: 'loom-strip-dev-only-assets',
  apply: 'build',
  async closeBundle() {
    for (const dir of DEV_ONLY_ASSETS) {
      await rm(resolve(__dirname, 'dist', dir), { recursive: true, force: true })
    }
  },
})

export default defineConfig({
  plugins: [react(), stripDevOnlyAssets()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // react/react-dom/motion/lenis change on a dependency bump, not a
        // copy edit — keep them in their own chunk so a content change
        // doesn't invalidate the browser cache for the framework too.
        // three.js stays out of this: it's already isolated via the
        // dynamic import() in Sections.jsx and must keep loading lazily.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('node_modules/three')) return
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor'
          if (/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'vendor'
          if (id.includes('node_modules/lenis')) return 'vendor'
        },
      },
    },
  },
  server: { port: 4930 },
  preview: { port: 4931 },
})
