/**
 * One array, three renderers (desktop header, mobile menu, footer). A hash is
 * a section on the long page; a path is a dedicated route.
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
 */
export const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#solutions', label: 'Solutions' },
  /* Added 10 Aug 2026 with the section. Not `extra`: of the thirteen tabs this
     is the one a stranger is most likely to be hunting for, and the whole
     argument for the section was that a visitor who cannot find a floor
     assumes the ceiling — burying its tab in the burger between 1100 and 1360
     would re-open exactly that hole for laptop traffic. */
  { href: '#pricing', label: 'Pricing' },
  /* The Machine took the Crew slot on the page, so it takes the tab too —
     Crew and Ascent are gone, and #crew/#ascent no longer resolve. */
  { href: '#the-machine', label: 'Machine' },
  /* `extra` = shown everywhere EXCEPT the desktop bar between 1100 and 1360.
     Ten labels do not fit between the wordmark and the "Get started" pill
     until ~1360px, and the burger does not take over until 1100 — so a tenth
     tab buys 260px of a nav row sitting under the CTA. The mobile menu and the
     footer render it unconditionally; only `.nav-links a.is-extra` drops out,
     and only in that band. */
  { href: '#aeo', label: 'AI Search', extra: true },
  /* A path, not a hash. The home page's own WorkshopsPromo (#ai-workshops)
     sits exactly here in the scroll, which is why the tab does too. */
  { href: '/ai-workshops', label: 'AI Workshops' },
  { href: '#apps', label: 'Apps' },
  /* Demoted to `extra` on 10 Aug, when Pricing and FAQ took the list from
     eleven tabs to thirteen. Something had to leave the 1100–1360 bar and this
     is the most niche label on it — a private-beta developer protocol,
     addressed to an audience that arrives by link rather than by scanning a
     nav. It still renders in the burger and in the footer sitemap. */
  { href: '#mcp', label: 'MCP', extra: true },
  /* Same: a route, sitting where #typeface sits in the scroll. */
  { href: '/type', label: 'Typeface' },
  /* Sits between #bolt and #contact in the scroll, which is where it sits
     here. `extra` because a visitor who wants the FAQ is already reading the
     page and will reach it; the tab is for the one who came back looking for
     the ownership answer specifically. */
  { href: '#faq', label: 'FAQ', extra: true },
  { href: '#contact', label: 'Contact' },
]

/* THE SITEMAP, split into two short columns instead of one ten-item run.
   The second column is the REMAINDER, not a second hand-written list. The
   footer is the sitemap: a tab added to LINKS for a new page has to turn up
   down here without anyone having to remember to add it in two places — which
   is exactly what did not happen the last three times a tab was added. Only
   the first column is curated; everything else lands in `Craft`, in LINKS
   order, and both columns are LINKS entries themselves so a renamed label or
   href follows automatically. */
const EXPLORE = ['#work', '#pricing', '#the-machine', '#solutions', '#apps', '#contact']
export const FOOT_COLS = [
  { title: 'Explore', links: LINKS.filter((l) => EXPLORE.includes(l.href)) },
  { title: 'Craft', links: LINKS.filter((l) => !EXPLORE.includes(l.href)) },
]
