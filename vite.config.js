import { sveltekit } from '@sveltejs/kit/vite'

export default {
  plugins: [sveltekit()],
  server: { port: 4940, strictPort: true },
  preview: { port: 4941, strictPort: true },
  build: {
    // Match the React build's target so we are comparing like with like when
    // the two bundles get measured against each other.
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // three MUST stay out of any eagerly-loaded chunk. It is ~500KB and
          // it is dynamically imported by the butterfly layer, which itself
          // waits for the main thread to go quiet. Rolling it into a shared
          // vendor chunk would drag all of it into the critical path and undo
          // the entire reason that layer is lazy. The React build's
          // vite.config.js carries the same early return for the same reason.
          if (id.includes('node_modules/three')) return undefined
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
}
