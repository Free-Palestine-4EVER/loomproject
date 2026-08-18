/* Prerendered like every other marketing route (see svelte.config.js) — the
   page is static markup plus one custom element that does its work in the
   browser, so there is nothing per-request to render.

   UNLISTED, NOT PRIVATE — same standing as /configurator. Nothing links here,
   it is excluded from sitemap.xml, and it carries a noindex robots tag, so it
   reaches only whoever we hand the URL to. That is a "keep it out of Google"
   guarantee and not a security one: it is a client pitch, and anyone with the
   link can open it. It also carries B.B. Simon's own product photography and
   prices, which is a second reason it must not be indexed — a LOOM URL ranking
   for their SKU would be a problem we created for a client we are courting. */
export const prerender = true
