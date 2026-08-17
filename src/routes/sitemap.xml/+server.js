import { CASES } from '$data/site.js'
import { POSTS } from '$data/posts/index.js'
import { statSync } from 'node:fs'
import { join } from 'node:path'

// Prerendered like every other marketing route (see svelte.config.js) — a
// sitemap that only exists behind a serverless function is a sitemap a
// crawler waits on for nothing; this one is a static file on the CDN by the
// time anything asks for it.
export const prerender = true

const ORIGIN = 'https://www.loomstudio-jo.com'

/* ROUTE DISCOVERY IS A GLOB, NOT A HAND-WRITTEN LIST — same reasoning as
   work/[slug]'s own entries() and /lab's section registry: a route that
   exists because a file exists cannot silently fall out of the sitemap
   because whoever added it forgot a second place to list it. `eager: false`
   — nothing here needs the component, only the fact that the file exists at
   that path, so the module bodies are never loaded. */
const pages = import.meta.glob('/src/routes/**/+page.svelte')

/* Path segments that are implementation detail, not public routes:
     - anything with a `[param]` segment — those are templates, not pages;
       the real URLs they stand for are expanded below from the actual data
       source, not guessed.
     - /lab — the internal variant-picking tool. Its own +page.js says so
       directly ("not a page that needs to be in the HTML for a crawler")
       and it renders nothing server-side (`ssr = false`), so a crawler
       would index an empty shell even if it were listed. */
const EXCLUDE = (route) => route.includes('[') || route === '/lab'

function routeFromFile(file) {
  // '/src/routes/work/+page.svelte' -> '/work'
  // '/src/routes/+page.svelte'      -> ''  (becomes '/' below)
  const route = file.replace(/^\/src\/routes/, '').replace(/\/\+page\.svelte$/, '')
  return route === '' ? '/' : route
}

// mtime of the file that actually defines a route's content, used as
// <lastmod>. This is a real, checkable fact (the filesystem's own timestamp
// for the source the build just read) rather than a guess — see the note at
// the bottom of this file for why a made-up date is worse than none.
function mtimeOf(rootRelativePath) {
  try {
    return statSync(join(process.cwd(), rootRelativePath)).mtime.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

// Static routes, each with the page.svelte that would need to change for the
// content to change (case-page slugs use their own function, below, since
// their content lives in site.js rather than in the shared template file).
const STATIC = Object.keys(pages)
  .map(routeFromFile)
  .filter((route) => !EXCLUDE(route))
  .map((route) => {
    const file = route === '/' ? '/src/routes/+page.svelte' : `/src/routes${route}/+page.svelte`
    return { loc: route, lastmod: mtimeOf(file) }
  })

// /work/[slug] expanded from the real slug source (CASES in $data/site.js),
// the same list work/[slug]/+page.js's own entries() reads — so a new case
// gets a sitemap row the same way it gets a page: by being added to CASES,
// not by anyone remembering this file too.
const CASE_ROUTES = CASES.map((c) => ({
  loc: `/work/${c.slug}`,
  lastmod: mtimeOf('/src/lib/data/site.js'),
}))

// /journal/[slug] expanded the same way — from POSTS, the same list
// journal/[slug]/+page.js's own entries() reads, so a new post gets a
// sitemap row by being added to $data/posts/index.js and nowhere else.
// `lastmod` is the post's own `updatedAt`, a real editorial fact rather than
// a filesystem timestamp, since a post's content can change without its
// source file's mtime being the thing anyone means to check.
const POST_ROUTES = POSTS.map((p) => ({
  loc: `/journal/${p.slug}`,
  lastmod: p.updatedAt,
}))

// changefreq/priority are editorial judgement, not derived facts, so they
// are hand-set here (unlike loc and lastmod). The home page and the two
// pages that argue the strongest commercial case (/work as the proof, /work
// case pages as the evidence under it) sit highest; utility pages (FAQ,
// pricing, contact) are high because they are exactly what an AI answer
// engine or a bottom-of-funnel searcher wants; /lab is excluded above and
// /type and /ai-workshops are lower-priority because they are not the
// commercial spine of the site.
const WEIGHT = {
  '/': { changefreq: 'weekly', priority: '1.0' },
  '/work': { changefreq: 'weekly', priority: '0.9' },
  '/solutions': { changefreq: 'monthly', priority: '0.8' },
  '/pricing': { changefreq: 'monthly', priority: '0.8' },
  '/machine': { changefreq: 'monthly', priority: '0.8' },
  '/ai-search': { changefreq: 'monthly', priority: '0.8' },
  '/contact': { changefreq: 'monthly', priority: '0.7' },
  '/faq': { changefreq: 'monthly', priority: '0.7' },
  '/apps': { changefreq: 'monthly', priority: '0.6' },
  '/mcp': { changefreq: 'monthly', priority: '0.6' },
  '/ai-workshops': { changefreq: 'monthly', priority: '0.6' },
  // High: it is a product with its own buying intent ("build websites with AI
  // course arabic"), it carries the site's only Course structured data, and
  // it is meant to be landed on from a reel or a search rather than browsed to.
  '/academy': { changefreq: 'weekly', priority: '0.8' },
  '/type': { changefreq: 'monthly', priority: '0.5' },
  // Same tier as /faq and /contact — this is exactly what a bottom-of-funnel
  // searcher or an AI answer engine wants, and it is meant to be found
  // straight from Google rather than reached by browsing the site.
  '/journal': { changefreq: 'weekly', priority: '0.7' },
}
const CASE_WEIGHT = { changefreq: 'monthly', priority: '0.6' }
const POST_WEIGHT = { changefreq: 'monthly', priority: '0.6' }

function weightOf(loc) {
  if (WEIGHT[loc]) return WEIGHT[loc]
  if (loc.startsWith('/journal/')) return POST_WEIGHT
  return CASE_WEIGHT
}

function urlEntry({ loc, lastmod }) {
  const { changefreq, priority } = weightOf(loc)
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  return `  <url>
    <loc>${ORIGIN}${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export function GET() {
  const entries = [...STATIC, ...CASE_ROUTES, ...POST_ROUTES].map(urlEntry).join('\n')
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
