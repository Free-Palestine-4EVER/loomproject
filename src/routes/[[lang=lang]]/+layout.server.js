// The one place `params.lang` gets turned into a locale. Every route under
// this folder inherits this load, so `data.locale` (and, through SvelteKit's
// data-merging, `page.data.locale` anywhere on the site — see
// `$lib/i18n.svelte.js`) is correct before a single component renders,
// server or client. See PORTING.md rule 4 and src/hooks.server.js, which
// does the matching job for the `<html lang>` byte itself.
export function load({ params }) {
  const locale = params.lang === 'ar' ? 'ar' : 'en'
  return { locale }
}
