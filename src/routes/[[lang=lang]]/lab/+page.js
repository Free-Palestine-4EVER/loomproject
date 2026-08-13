// The variant gallery. Prerendered like every other route, but CSR-only on
// purpose: the lab renders 51 experimental components that are not yet held to
// the site's standards, and a single one of them touching `window` at module
// scope would take the whole production build down with it. Turning SSR off
// here contains that blast radius to the lab itself — /lab is an internal
// picking tool, not a page that needs to be in the HTML for a crawler.
export const prerender = true
export const ssr = false
