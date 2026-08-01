import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
