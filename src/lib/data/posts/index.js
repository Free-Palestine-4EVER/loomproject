// ————————————————————————————————————————————
// The journal's index — one module per post, aggregated here so the route
// files never import individual posts by hand.
//
// WHY .js FILES INSTEAD OF MARKDOWN. Every other content surface on this site
// (site.js, pricing.js, faq.js, workshops.js…) is a plain JS data module, not
// a markdown file with frontmatter — there is no markdown parser anywhere in
// this repo and adding one for a three-post journal would be a dependency
// pulled in for one route. A post's `body` is an array of typed blocks
// ({ type: 'p' | 'h2' | 'h3' | 'ul', ... }) rendered by [slug]/+page.svelte's
// own switch — structured data in, structured markup out, the same shape
// every other array-of-objects on this site already takes.
//
// SORTING: newest first, by `publishedAt`. Computed once, at module load, not
// re-sorted per render.
// ————————————————————————————————————————————
import { post as websiteCostJordan } from './website-cost-jordan.js'
import { post as aiSearchVisibility } from './ai-search-visibility.js'
import { post as googleBusinessProfileAmman } from './google-business-profile-amman.js'
import { post as arabicWebsiteTypography } from './arabic-website-typography.js'
import { post as aiNativeAgency } from './ai-native-agency.js'

/* website-cost-jordan-ar.js is deliberately NOT imported here. It is a
   finished Arabic draft with nowhere correct to render: /journal/[slug] has no
   per-post dir/lang mechanism and no Arabic-capable webfont, so listing it
   would publish an RTL post into an LTR shell. Tracked as task 19d in the
   growth board; the file stays out of ALL until that lands. */
const ALL = [
  websiteCostJordan,
  aiSearchVisibility,
  googleBusinessProfileAmman,
  arabicWebsiteTypography,
  aiNativeAgency,
]

export const POSTS = [...ALL].sort(
  (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
)

export const postBySlug = (slug) => POSTS.find((p) => p.slug === slug) || null

// ————————————————————————————————————————————
// SITEMAP: src/routes/sitemap.xml/+server.js DOES exist and already imports
// POSTS from this file (POST_ROUTES) to emit /journal and every post slug —
// nothing further to wire up here. A new post gets a sitemap row the same
// way it gets a prerendered page: by being added to ALL above.
// ————————————————————————————————————————————
