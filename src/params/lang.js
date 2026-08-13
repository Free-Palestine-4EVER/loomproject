/**
 * Route param matcher for the locale segment used by
 * `src/routes/[[lang=lang]]/…`.
 *
 * Only the literal string 'ar' matches. That single fact is what keeps this
 * an OPTIONAL, additive prefix rather than a rewrite of every URL on the
 * site: SvelteKit tries an optional param `[[lang]]` both present and
 * absent when it resolves a path, and a matcher is what stops it from ever
 * treating an ordinary first path segment — 'work', 'pricing', a work/[slug]
 * case-study slug — as a locale by accident. '/work' resolves with
 * `lang` absent because 'work' fails this matcher; '/ar/work' resolves with
 * `lang: 'ar'` because 'ar' passes it. There is no 'en' segment on purpose —
 * English is the unprefixed default, exactly as the brief asked for, so this
 * never needs to match anything but the one Arabic case.
 */
export function match(param) {
  return param === 'ar'
}
