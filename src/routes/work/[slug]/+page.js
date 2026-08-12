import { error } from '@sveltejs/kit'
import { CASES } from '$data/site.js'

export const prerender = true

/* The crawler cannot reach these from the index: the grid opens each case in a
   dialog, so there is no <a href="/work/x"> anywhere for it to follow. Without
   `entries()` the build would emit the route and prerender none of it, and the
   pages would 404 on a static host. Listing them from CASES means a new case
   gets its page by existing, not by anyone remembering this file. */
export function entries() {
  return CASES.map((c) => ({ slug: c.slug }))
}

export function load({ params }) {
  const i = CASES.findIndex((c) => c.slug === params.slug)
  if (i < 0) error(404, 'No such case')
  return {
    kase: CASES[i],
    // Wrap rather than clamp: from the last case, "next" is the first one.
    // A dead end at either end of the archive is a worse answer than a loop.
    prev: CASES[(i - 1 + CASES.length) % CASES.length],
    next: CASES[(i + 1) % CASES.length],
  }
}
