// A byte-for-byte twin of /configurator's page contract — see that route's
// +page.js for the reasoning. Prerendered, unlisted, noindex.
//
// This route USED to be a live reverse proxy onto diaaz-konfigurator.web.app
// (the Diaaz-branded copy of this same Textura build, sidebar and all). That
// meant a page whose every byte came from a deployment this repo does not
// control, held together by an HTML/JS/CSS rewriter, a second proxy route at
// /table.html and three vercel.json rewrites. All of it is gone: /diaaz is now
// the same self-hosted configurator /configurator serves, from this repo's own
// static/loom-table.html.
export const prerender = true
