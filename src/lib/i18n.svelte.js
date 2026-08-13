/**
 * Site-wide locale. Modelled on `$lib/wizard.svelte.js` in spirit — one
 * singleton, no context provider, every component imports the same object —
 * but NOT in mechanism, and the difference is deliberate, not an oversight.
 *
 * `wizard.svelte.js` holds a `$state` field because the wizard's open/closed
 * state is genuinely client-only, mutated by a click, and never part of what
 * the server renders. Locale is the opposite: it has to be right in the
 * server-rendered bytes (PORTING.md rule 4, and the whole reason this
 * project chose /ar URLs over a client-only toggle — see the plan doc). A
 * plain `$state` field set from a load function would work for exactly one
 * request and then keep that value, because SvelteKit's Node adapter reuses
 * the same module instance across requests in the same process — that's the
 * "shared mutable state" trap: two requests racing (or, concretely here, the
 * prerender crawler visiting '/' and '/ar' in the same worker) can read or
 * write each other's locale. See the memory note on this exact class of bug.
 *
 * The fix is to hold no state at all. `locale` below is a GETTER that reads
 * `page.data.locale` (from `$app/state`) fresh on every access. `page` is
 * SvelteKit's own per-request/per-render reactive value — that's the same
 * guarantee Nav.svelte already leans on for `page.url.pathname` — so this
 * object is safe to import from anywhere, on the server or the client,
 * without ever becoming the thing that leaks one visitor's language into
 * another visitor's HTML.
 */
import { page } from '$app/state'

class I18n {
  /** 'en' | 'ar' — never anything else. Falls back to reading the URL
   *  directly so this still answers correctly the one render where
   *  `+layout.server.js`'s `data.locale` has not landed yet (there isn't
   *  one in practice on this site, since prerendering always resolves load
   *  functions before render, but a getter that can't be wrong costs
   *  nothing). */
  get locale() {
    const fromData = page.data?.locale
    if (fromData === 'ar' || fromData === 'en') return fromData
    return page.url?.pathname?.startsWith('/ar') ? 'ar' : 'en'
  }

  get isAr() {
    return this.locale === 'ar'
  }

  get other() {
    return this.isAr ? 'en' : 'ar'
  }
}

export const i18n = new I18n()

/**
 * Dictionary lookup. `dict` is always a `{ en, ar }` pair — the same shape
 * `machine.js` already established ("two originals, not a source and a
 * copy"). Every chrome string in `$lib/data/chrome.js` is one of these
 * pairs, or an object of them; this is the one function that reads them, so
 * a missing Arabic entry fails visibly (falls back to English, never to
 * `undefined`) instead of silently.
 */
export function t(dict, locale = i18n.locale) {
  if (!dict) return ''
  return dict[locale] ?? dict.en ?? ''
}

/**
 * Turns a same-site path into the equivalent path for `locale`. Leaves
 * everything that is not a same-site absolute path alone — hash targets
 * (`#work`), `mailto:`/`tel:`/`https?://` links, and anything already
 * relative — because those are never locale-prefixed and re-writing them
 * would break them.
 *
 * This is the ONLY place '/ar' gets prepended or stripped anywhere in the
 * app; Nav.svelte and Footer.svelte (via nav-links.js) both call through
 * this rather than each growing their own string-surgery.
 */
export function localeHref(path, locale = i18n.locale) {
  if (typeof path !== 'string' || path === '') return path
  if (path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('tel:') || /^[a-z]+:/i.test(path)) {
    return path
  }
  if (!path.startsWith('/')) return path

  const isAr = path === '/ar' || path.startsWith('/ar/')
  const bare = isAr ? (path.slice(3) || '/') : path

  if (locale === 'ar') return bare === '/' ? '/ar' : `/ar${bare}`
  return bare
}

/** The current page's own URL, re-targeted at `locale` — what the switcher
 *  link and the `hreflang` alternates both point at, so "go to the other
 *  language" always means "this same page, the other language," not "back
 *  to the home page." Pathname only, deliberately: `page.url.search` throws
 *  during prerendering ("Cannot access url.search on a page with
 *  prerendering enabled" — SvelteKit's own guard against baking one
 *  visitor's query string into every prerendered visitor's static HTML),
 *  and every route on this site is prerendered (svelte.config.js). None of
 *  this site's routes are meaningfully parameterised by a query string
 *  anyway, so dropping it costs nothing real. */
export function localeSwitchHref(locale) {
  return localeHref(page.url.pathname, locale)
}
