import adapter from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/**
 * LOOM — SvelteKit rebuild.
 *
 * RENDERING STRATEGY, and why it is not what "serverless rendering" first
 * sounds like.
 *
 * Every route on this site except /dashboard renders from static data files
 * (src/lib/data/*.js). Nothing is per-request: no user, no database, no
 * personalisation. For content like that, a serverless function that renders
 * the same bytes on every invocation is strictly SLOWER than shipping those
 * bytes to the CDN once at build time — you pay a cold start and a render for
 * an answer that never changes.
 *
 * So the marketing routes are PRERENDERED (see each +page.js). They come off
 * Vercel's edge network as finished HTML with no function in the path at all.
 * That is the fastest thing this stack can do, and it is a superset of what
 * SSR buys us: same server-rendered markup, zero TTFB variance, no cold start.
 *
 * The adapter still matters. /dashboard is a signed-in FORGE account's page —
 * genuinely per-request — and it runs as a real serverless function on the
 * Node runtime, because the Firebase Admin path it will eventually want does
 * not run on Edge. Kit routes each page to the right one; that split is the
 * point of using the adapter rather than adapter-static.
 */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // Node, not Edge: /dashboard's auth path needs real Node built-ins.
      // The prerendered routes never touch this runtime anyway.
      runtime: 'nodejs22.x',
      regions: ['fra1'], // Frankfurt — nearest Vercel region to Amman
    }),
    prerender: {
      // A dead internal link should fail the build, not ship. The React SPA
      // could not enforce this: every path resolved to index.html, so a typo
      // in an href rendered the home page instead of a 404 and nobody noticed.
      handleHttpError: 'fail',
      // Hash anchors point at sections rendered inside the long page; the
      // crawler cannot resolve them from the route table alone.
      handleMissingId: 'ignore',
    },
    alias: {
      $data: 'src/lib/data',
      $components: 'src/lib/components',
      $three: 'src/lib/three',
    },
  },
}
