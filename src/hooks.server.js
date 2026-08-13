/**
 * ONE JOB: make sure the byte on the wire — `<html lang="…">` — is correct
 * for the locale before a single line of client JS has run. `app.html` still
 * has to say `lang="en"` literally (a real, static attribute, not a
 * template hole SvelteKit can leave empty), because this hook only ever
 * REPLACES that exact string; it never invents the attribute.
 *
 * Deliberately does not set `dir`. The brief is explicit: this is a hybrid
 * site (see PORTING.md-adjacent plan doc) — Arabic prose gets `dir="rtl"`
 * scoped to the paragraph that holds it (the `.mo-arabic` pattern this
 * project inherits from machine-offer.css), not a page-level mirror. Setting
 * `dir="rtl"` here would flip the whole physically-positioned, scroll-pinned
 * layout that PORTING.md rule 5 and the plan doc both say not to touch.
 *
 * WHY PATHNAME, NOT `event.params.lang`: hooks run before SvelteKit has
 * matched a route (and therefore before route params exist), so the only
 * signal available this early is the URL itself. `+layout.server.js` (see
 * that file) does the equivalent job downstream, from the matched param,
 * once params exist — the two are kept in obvious agreement (same rule:
 * "/ar or /ar/…" means Arabic) rather than one importing the other.
 *
 * THE COOKIE IS A BEST-EFFORT "REMEMBER ME", NOT THE SOURCE OF TRUTH — and on
 * this site that comes with a real caveat worth stating rather than
 * discovering later: every marketing route is prerendered (svelte.config.js)
 * and served as static HTML from Vercel's CDN, so this hook does NOT run on
 * a real visitor's repeat visit to a prerendered page — there is no server
 * in that path to run it. It runs at build time (once per crawled URL, which
 * is exactly how the correct `lang` gets baked into the static bytes for
 * both '/' and '/ar') and it runs on every request in `vite dev` / `vite
 * preview`, which is where cookie persistence is actually observable while
 * working on this feature. The client-side half of "remember me" — the tiny
 * inline script in app.html that redirects a bare '/' to '/ar' when the
 * cookie says so — is what covers the static-hosting gap; see app.html.
 */
export async function handle({ event, resolve }) {
  const isAr = event.url.pathname === '/ar' || event.url.pathname.startsWith('/ar/')
  const locale = isAr ? 'ar' : 'en'

  event.locals.locale = locale

  // `httpOnly: false` on purpose — the inline app.html script (a plain
  // document.cookie read, no fetch) is what actually acts on this between
  // visits to a statically-hosted page, so JS has to be able to see it.
  event.cookies.set('loom_locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  })

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('<html lang="en">', `<html lang="${locale}">`),
  })
}
