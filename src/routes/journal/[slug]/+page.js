import { error } from '@sveltejs/kit'
import { POSTS } from '$data/posts/index.js'

export const prerender = true

// The crawler cannot reach these from the index by URL alone if entries() is
// missing — SvelteKit needs every dynamic slug enumerated up front to
// prerender it as a static file. Listing them from POSTS means a new post
// gets its page by being added to $data/posts/index.js, not by anyone
// remembering to edit this file too.
export function entries() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export function load({ params }) {
  const post = POSTS.find((p) => p.slug === params.slug)
  if (!post) error(404, 'No such post')
  const i = POSTS.indexOf(post)
  return {
    post,
    // Wrap rather than clamp, same reasoning as /work/[slug]: from the last
    // post, "next" is the first one, so there is never a dead end.
    prev: POSTS[(i - 1 + POSTS.length) % POSTS.length],
    next: POSTS[(i + 1) % POSTS.length],
  }
}
