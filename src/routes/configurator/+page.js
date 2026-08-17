// Prerendered like every other marketing route — see svelte.config.js. Nothing
// here is per-request; the demo itself is an iframe onto a separately deployed
// build, so this page is finished HTML on the CDN.
//
// UNLISTED, NOT PRIVATE. There is no link to this route from the nav, the
// footer or any other page, it is excluded from sitemap.xml, and it carries a
// noindex robots tag — so it is reachable only by someone we hand the URL to.
// That is a "don't index it" guarantee, not a security one: anyone with the
// link can open it. Nothing confidential belongs on this page.
export const prerender = true
