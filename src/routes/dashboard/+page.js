// /dashboard is a signed-in FORGE account's own page — genuinely per-request,
// and it depends on a localStorage session the server can never see. Every
// other route in this app is prerendered (see svelte.config.js's top comment
// for why that split exists); this is the one route that opts back out and
// runs as a real serverless function instead.
export const prerender = false
export const ssr = false
