import { redirect } from '@sveltejs/kit'

/**
 * /course -> /academy, permanently.
 *
 * The page shipped as /course on 17 Aug 2026 and was restructured into
 * LOOM ACADEMY the same day, so the old URL has a real (if short) life: it is
 * in the sitemap Google already fetched, in this session's own notes, and in
 * whatever the client pasted to anyone in between. A 308 costs one file and
 * removes the entire class of "the link you sent me is dead" — the alternative
 * is a 404 on the one URL the client is most likely to have shared first.
 *
 * `prerender = true` so it is a static redirect at the edge like every other
 * marketing route, not a serverless invocation.
 *
 * DELETE THIS ROUTE once the old URL stops appearing in analytics — a redirect
 * kept forever is a URL nobody can ever reuse.
 */
export const prerender = true

export function load() {
  redirect(308, '/academy')
}
