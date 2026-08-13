// Every marketing route is prerendered — see svelte.config.js for why that is
// faster than a serverless render for content that never varies per request.
// /type has no per-request data (the poster machine's canvas work happens
// entirely client-side, after prerendered HTML has already shipped).
export const prerender = true
