// Every marketing route is prerendered — see svelte.config.js. The journal
// index renders entirely from $data/posts, which is static at build time, so
// there is nothing per-request here.
export const prerender = true
