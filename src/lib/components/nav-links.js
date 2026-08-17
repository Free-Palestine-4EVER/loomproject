/**
 * One array, three renderers (desktop header, mobile menu, footer). A hash is
 * a section on the long page; a path is a dedicated route.
 *
 * ── EVERY TAB IS A ROUTE NOW (11 Aug 2026, at the client's request) ────────
 * The client's note: "anything that's on the menu — I don't like how it works,
 * it's just an anchor on the page and the homepage scrolls up and down for
 * every item on the menu. Make a dedicated page for it."
 *
 * So nine tabs stopped being hashes and became paths: /work, /solutions,
 * /pricing, /machine, /ai-search, /apps, /mcp, /faq, /contact. Each of those
 * routes MOUNTS THE SAME SECTION COMPONENT the long page mounts — there is no
 * second copy of any section anywhere — and closes with the shuttle band and
 * the contact form, the way the home page closes. See src/routes/<name>/.
 *
 * THE HOME PAGE IS UNCHANGED. Every section still sits on it in its curated
 * order and every id it ever had still resolves, so a bookmarked `/#pricing`
 * still lands on the right band of the long page. The routes are an ADDITIONAL
 * way in, not a replacement: what changed is that clicking a menu item no
 * longer throws the reader twenty screens down a page they did not ask to
 * scroll.
 *
 * ONE TAB IS STILL A HASH: Home, '#top'. It is not a section-page candidate —
 * it IS the long page — and the reasoning under its entry below (a hash always
 * scrolls you to the hero, a router navigation to the route you are already on
 * lands you at whatever offset the browser restores) is the reason it stays
 * one. It is also now the only hash left in this list, which is what lets
 * Nav's active-state check be "pathname, or the home page" rather than a
 * scroll-spy; see interactions.js, where the spy that used to own `is-current`
 * was removed for exactly that reason.
 *
 * The ORDER and the `extra` flags below are untouched by the conversion — the
 * labels a reader sees and the widths the nav-fit check measured are the same
 * strings in the same sequence; only their destinations changed.
 *
 * THE TAB ORDER MIRRORS THE PAGE ORDER (see the band comments in
 * routes/+page.svelte) — a nav that lists sections in a different sequence
 * than the scroll does makes every tab feel like a jump backwards. Proof, then
 * the qualifier, then the three things a visitor can buy, then capability.
 *
 * Re-synced 9 Aug 2026 after the reorder. Two tabs had been left behind by it
 * and read as jumps backwards: "AI Search" (#aeo) sat last-but-three while its
 * section is the eighth thing on the page, so clicking it after MCP threw the
 * reader 13,000px back UP; and "Typeface" (/type) sat above "AI Workshops"
 * while TypeShowcase moved down to the R&D band and WorkshopsPromo closes the
 * sell band. Verified against the rendered DOM — the long page's ordered ids
 * are (re-verified 10 Aug 2026, after Voices and Process were REMOVED from the
 * page at the client's request): top, work, counter(#solutions), offer,
 * pricing, the-machine, aeo, ai-workshops, apps, mcp, typeface, studio, bolt,
 * faq, contact, hiring. This list is that sequence, filtered to the tabs.
 * Neither #voices nor #process ever had a tab — a testimonial and a "how we
 * work" argument were both things you scrolled past on the way to the form,
 * not destinations — and now neither id resolves on the page at all.
 *
 * #lab (ToolsLab, "3D Lab") dropped out of the sequence the same day: it
 * merged into #apps and no longer has its own tab or its own section. Twelve
 * tabs remain, not thirteen — the counts quoted below are from before that
 * merge and still describe the live breakpoint math, since removing one tab
 * only gives the bar more room, never less.
 *
 * RE-VERIFIED 11 Aug 2026, after Manifesto and TypeShowcase were pulled up
 * under the hero at the client's request and "Home" was added. The page's
 * ordered ids are now: top, typeface, work, counter(#solutions), offer,
 * pricing, the-machine, aeo, ai-workshops, apps, mcp, studio, bolt, faq,
 * contact, hiring.
 *
 * ONE TAB IS NOW DELIBERATELY OUT OF SCROLL ORDER: "Typeface". It points at
 * /type (the route, not the section), and the section it mirrors is now the
 * third thing on the page — but the tab stays down between MCP and FAQ.
 * Hoisting it to slot 2 of the bar would put a free font above WORK and
 * PRICING in the one list on this site that reads as a ranking, and the tab
 * goes to a standalone page anyway, so nobody clicking it is being thrown
 * "backwards" through the long page at all. Manifesto has no tab and never
 * had one.
 */
export const LINKS = [
  /* HOME — added 11 Aug 2026 at the client's request, first in the list
     because it is first in the scroll (#top is the hero's own id, the same
     target the wordmark has always used, so it goes through navigate() with
     every other hash tab and needs no special case in Nav.go()). A path of
     '/' would have been the other option and is worse from the long page: it
     is a router navigation to the route you are already on, which lands you at
     whatever scroll offset the browser decides to restore, whereas '#top'
     always scrolls you to the hero from wherever you are.

     NOT `extra`: it renders in the desktop bar at every width, and the fit
     math says it can. The warnings in this file's header and in Nav.svelte are
     about THIRTEEN tabs / ten visible; the list as it actually stands is
     eleven entries, three of them `extra`, so the bar between 1100 and 1860
     was carrying EIGHT labels, not ten. Home makes nine — still under the
     verified ceiling, and it is the shortest label in the list. Re-measure
     with the nav-fit check before adding a tenth.

     It does duplicate the wordmark's own target, which is why it was never in
     this list before; the client asked for the word HOME specifically. */
  { href: '#top', label: 'Home' },
  { href: '/work', label: 'Work' },
  { href: '/solutions', label: 'Solutions' },
  /* Added 10 Aug 2026 with the section. Not `extra`: of the thirteen tabs this
     is the one a stranger is most likely to be hunting for, and the whole
     argument for the section was that a visitor who cannot find a floor
     assumes the ceiling — burying its tab in the burger between 1100 and 1360
     would re-open exactly that hole for laptop traffic. */
  { href: '/pricing', label: 'Pricing' },
  /* The Machine took the Crew slot on the page, so it takes the tab too —
     Crew and Ascent are gone, and #crew/#ascent no longer resolve. */
  { href: '/machine', label: 'Machine' },
  /* `extra` = shown everywhere EXCEPT the desktop bar between 1100 and 1360.
     Ten labels do not fit between the wordmark and the "Get started" pill
     until ~1360px, and the burger does not take over until 1100 — so a tenth
     tab buys 260px of a nav row sitting under the CTA. The mobile menu and the
     footer render it unconditionally; only `.nav-links a.is-extra` drops out,
     and only in that band. */
  { href: '/ai-search', label: 'AI Search', extra: true },
  /* A path, not a hash. The home page's own WorkshopsPromo (#ai-workshops)
     sits exactly here in the scroll, which is why the tab does too. */
  { href: '/ai-workshops', label: 'AI Workshops' },
  /* Added 17 Aug 2026 with /academy. `extra`, and deliberately so: this is the
     only thing on the site sold to a PERSON rather than to a company, and the
     1100–1360 bar is where a company's decision-maker on a laptop reads the
     nav. It renders unconditionally in the mobile drawer — which is where its
     buyer actually is — and in the footer sitemap. It sits directly after
     AI Workshops because the two are the same shelf: what LOOM teaches, as
     opposed to what LOOM builds for you. */
  { href: '/academy', label: 'Academy', extra: true },
  { href: '/apps', label: 'Apps' },
  /* Demoted to `extra` on 10 Aug, when Pricing and FAQ took the list from
     eleven tabs to thirteen. Something had to leave the 1100–1360 bar and this
     is the most niche label on it — a private-beta developer protocol,
     addressed to an audience that arrives by link rather than by scanning a
     nav. It still renders in the burger and in the footer sitemap. */
  { href: '/mcp', label: 'MCP', extra: true },
  /* Same: a route, sitting where #typeface sits in the scroll. */
  { href: '/type', label: 'Typeface' },
  /* Sits between #bolt and #contact in the scroll, which is where it sits
     here. `extra` because a visitor who wants the FAQ is already reading the
     page and will reach it; the tab is for the one who came back looking for
     the ownership answer specifically. */
  { href: '/faq', label: 'FAQ', extra: true },
  /* Added 14 Aug 2026 with the journal. `extra`, same reasoning as MCP and
     FAQ above: this is a route a visitor finds by searching (a "how much
     does a website cost" query, an AI-search query) and lands on directly
     from Google or an AI answer, not one they hunt for in the header bar —
     so it costs nothing to keep out of the fitted 1100–1360 band and it
     still renders unconditionally in the mobile drawer and the footer
     sitemap below. */
  { href: '/journal', label: 'Journal', extra: true },
  { href: '/contact', label: 'Contact' },
]

/* THE SITEMAP, split into two short columns instead of one ten-item run.
   The second column is the REMAINDER, not a second hand-written list. The
   footer is the sitemap: a tab added to LINKS for a new page has to turn up
   down here without anyone having to remember to add it in two places — which
   is exactly what did not happen the last three times a tab was added. Only
   the first column is curated; everything else lands in `Craft`, in LINKS
   order, and both columns are LINKS entries themselves so a renamed label or
   href follows automatically. */
const EXPLORE = ['#top', '/work', '/pricing', '/machine', '/solutions', '/apps', '/contact']
export const FOOT_COLS = [
  { title: 'Explore', links: LINKS.filter((l) => EXPLORE.includes(l.href)) },
  { title: 'Craft', links: LINKS.filter((l) => !EXPLORE.includes(l.href)) },
]
