<!--
  The long page.

  ORDER IS A CONVERSION DECISION, NOT A TASTE ONE (reordered 9 Aug 2026,
  extended 10 Aug, reorganised 10 Aug; Voices and Process REMOVED 10 Aug 2026
  at the client's request; OPENING REORDERED 11 Aug 2026, also at the client's
  request). Bands; nothing may be inserted without picking one:

    OPEN      hero → client wall → the free typeface
    PROOF     cases
    QUALIFY   thirty industries (pinned tour) → the fork
    SELL      the floor, then everything buyable
    CAPABLE   what LOOM builds, including for itself
    CLOSE     who and where → why → FAQ → contact → careers

  Three rules drove the 10 Aug reorganisation: nothing that cannot be bought
  today may sit above something that can; no claim sits above its own evidence;
  and ALL the evidence goes first.

  THE 11 AUG 2026 OPENING WENT THROUGH TWO MOVES IN ONE DAY, both on the
  client's explicit instruction. First Manifesto (from slot 14) and
  TypeShowcase (from slot 11) were pulled up under the hero, opening the page
  VOICE-first. Then MANIFESTO WAS CUT FROM THE PAGE ALTOGETHER and Proof took
  its slot, which is where things stand: hero → client wall → free typeface.

  So the "no claim sits above its own evidence" rule is BACK IN FORCE at the
  top — Proof is evidence and it now opens — while "nothing that cannot be
  bought today may sit above something that can" is still overridden, by
  TypeShowcase at slot 3. That one is the client's call, not a conversion
  argument, and the 10 Aug reasoning for putting it low (a free typeface is the
  purest craft flex LOOM has and converts nobody; it also pulls heavy display
  cuts into the top of the page) is still written at its seam below and is
  still what a rebuttal should start from.

  Manifesto is no longer mounted anywhere. Its component and stylesheet remain
  in the tree, so bringing it back is a one-line import + mount, but #manifesto
  does not resolve. Nothing else moved: Work and everything after it keep their
  10 Aug relative order.

  What moved and why is annotated at each seam below.
-->
<script>
  import Hero from '$lib/components/Hero.svelte'
  import Proof from '$lib/components/Proof.svelte'
  import Work from '$lib/components/Work.svelte'
  import Counter from '$lib/components/Counter.svelte'
  import Solutions from '$lib/components/Solutions.svelte'
  import OfferPair from '$lib/components/OfferPair.svelte'
  import Pricing from '$lib/components/Pricing.svelte'
  import TheMachine from '$lib/components/TheMachine.svelte'
  import AnswerEngine from '$lib/components/AnswerEngine.svelte'
  import WorkshopsPromo from '$lib/components/WorkshopsPromo.svelte'
  import Forge from '$lib/components/Forge.svelte'
  import AppsShowcase from '$lib/components/AppsShowcase.svelte'
  import LoomMcp from '$lib/components/LoomMcp.svelte'
  import TypeShowcase from '$lib/components/TypeShowcase.svelte'
  import Studios from '$lib/components/Studios.svelte'
  import Bolt from '$lib/components/Bolt.svelte'
  import Faq from '$lib/components/Faq.svelte'
  import Contact from '$lib/components/Contact.svelte'
  import Hiring from '$lib/components/Hiring.svelte'
</script>

<svelte:head>
  <title>LOOM — AI-Native Creative Agency · Amman × Sarajevo</title>
  <meta
    name="description"
    content="LOOM is an AI-native creative agency in Amman and Sarajevo. Branding, campaigns, social content, AI systems, web and CGI for brands across the Gulf, the Balkans and beyond."
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="LOOM — AI-Native Creative Agency" />
  <meta property="og:description" content="We weave brands on the edge of creativity. Amman × Sarajevo." />
  <meta property="og:image" content="/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Measured with a PerformanceObserver('largest-contentful-paint') at
       390×844 (throttled): the LCP element there is Hero's own "See the
       work" WoolButton photograph, not the headline text (which wins at
       tablet/desktop widths instead — nothing to preload for a text node).
       It has no responsive ladder (img/wool is excluded from
       scripts/responsive.mjs — see that file), so this href is the exact
       and only file the <img> ever requests; no imagesrcset/imagesizes
       needed because there is no srcset to match. `media` keeps the
       preload off the desktop/tablet document, where a different element
       is LCP and this bytes would be pure waste. -->
  <link
    rel="preload"
    as="image"
    href="/img/wool/buttons/see-the-work.webp"
    media="(max-width: 767px)"
    fetchpriority="high"
  />

  <!-- The hero headline is set in LOOM Linear (the pattern family), and at
       tablet/desktop widths it IS the LCP element — the note above says there
       was "nothing to preload for a text node", which stopped being true when
       the headline moved off a system-adjacent stack onto a drawn face.
       Without this the font is discovered three hops late: HTML -> the CSS
       bundle -> parse -> @font-face -> fetch. These two are the subsets built
       by scripts/subset-patterns-home.mjs (22.3 KB + 20.2 KB, 19 glyphs each,
       exactly the characters of "WE WEAVE BRANDS ON THE EDGE OF CREATIVITY.")
       — not the 161 KB full faces, which is the whole reason preloading them
       is affordable at all.

       No `media` filter, unlike the image above: the headline is the same
       drawn face at 390 as at 1440, so a phone needs these bytes too even
       though its LCP element is the wool button. Both are needed for the
       first paint of one three-line headline (fill for lines 1 and 3, outline
       for the accent line), so preloading one and not the other would just
       move the late discovery onto the middle line. `crossorigin` is
       mandatory even same-origin — fonts are fetched in CORS mode, and a
       preload without it is a second, unshared request rather than a hit. -->
  <link
    rel="preload"
    as="font"
    type="font/woff2"
    href="/fonts/loom-patterns/LOOMLinear-Home.woff2"
    crossorigin
  />
  <link
    rel="preload"
    as="font"
    type="font/woff2"
    href="/fonts/loom-patterns/LOOMLinearOutline-Home.woff2"
    crossorigin
  />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LOOM',
    description: 'AI-native creative agency — branding, campaigns, AI systems, apps, web and CGI.',
    email: 'mofakhori@gmail.com',
    telephone: '+962791792129',
    location: [
      { '@type': 'Place', name: 'Amman, Jordan' },
      { '@type': 'Place', name: 'Sarajevo, Bosnia and Herzegovina' },
    ],
  })}<\/script>`}
</svelte:head>

<Hero />

<!-- PROOF OPENS THE PAGE — 11 Aug 2026, at the client's request, taking the
     slot Manifesto held for the few hours between the earlier reorder and this
     one.

     MANIFESTO IS REMOVED ENTIRELY, same instruction. It was moved up to slot 2
     earlier today and cut from the page later the same day; it is no longer
     mounted by anything. The component and its stylesheet are left in the tree
     rather than deleted, so restoring it is a one-line import + mount — but
     nothing renders it now, and #manifesto no longer resolves.

     The argument that put it there in the first place is the argument that
     took it out: "Trends don't lead our work. Thinking does." is a CLAIM, and
     a claim read second, with nothing underneath it, is just an assertion.
     Proof is evidence, and evidence is the stronger opening — the client list
     and the four numbers do the qualifying work before the visitor is asked to
     believe anything.

     PROOF — one section where Marquee and Stats used to be two. The marquee
     slid the most valuable words on the page (UNICEF, Vodafone, Benetton) past
     at a speed nobody reads them at, and the numbers band under it was four
     CountUps with no claim attached. They are now the evidence and the summary
     of one argument. Marquee and Stats are not ported — they are mounted by
     nothing. -->
<Proof />

<!-- TypeShowcase holds slot 3, where it landed in the earlier 11 Aug reorder.
     It was slot 2 originally, went down to the R&D band on 9 Aug ("it was the
     second thing a buyer saw, before one client name"), and is high again now.
     The two costs of it sitting this high are unchanged and worth restating
     rather than quietly re-incurring: a free typeface is the purest craft flex
     LOOM has and converts nobody, and the section pulls heavy display font
     cuts into the top of the page. It now reads as craft evidence directly
     under commercial evidence, which is a weaker pairing than it had under the
     manifesto — flagged, not acted on. /type still carries it in the nav for
     anyone who came for the font. -->
<TypeShowcase />

<!-- Work came up from slot 7. It was behind the typeface, the manifesto and two
     "start here" modules — the visitor was asked to choose a service before
     being shown a single thing LOOM had finished. -->
<Work />

<!-- Voices (testimonials) used to sit here, brought up in the 10 Aug 2026
     reorganisation for the same reason Studios was: evidence belongs before the
     ask, not after four sections of R&D. REMOVED FROM THE PAGE later the same
     day at the client's request, and dropped from the tree in this rebuild
     along with data/voices.js. #voices no longer resolves.

     STUDIOS WENT BACK DOWN the same day. Bringing it up here with Voices was
     right about the reason and wrong about the slot: "who and where we are" is
     not evidence of the same kind as a client list or a case study. It now sits
     in the close, where an about-us answers a question the visitor has by then
     started asking.

     Process (#process, the four-station "why AI-native" argument) also used to
     sit here. REMOVED at the client's request — it was the entire HOW band,
     which is why that band is gone from the ORDER comment above rather than
     left describing nothing. Not ported. -->

<!-- QUALIFY. Now that the proof has landed, the visitor places themselves:
     eight needs, then the fork, then their own industry.

     MERGED, 9 Aug 2026. Solutions came up from slot 15 first — a qualifier is
     worthless after seven product pitches — and then straight into the Counter,
     because they were never two questions. "Which of these eight do you need?"
     and "which industry are you in?" are one ask with two doors, and running
     them as two full sections meant two kickers, two display headlines and two
     CTAs for a single decision. One section, one quote button at the end of it.
     See Solutions' `merged` prop for the tag swap. -->
<Counter>
  <Solutions merged />
</Counter>

<!-- Now AFTER the merged qualifier rather than between its halves. The fork is
     the fallback for the visitor who found themselves in neither the eight
     needs nor the thirty industries. -->
<OfferPair />

<!-- SELL — the offerings with a price and a way in, ranked by what LOOM
     actually wants sold.

     Pricing opens the band (10 Aug 2026). The page previously named a number in
     exactly two places — 89 JOD inside The Machine's own pitch, and a live
     per-seat figure behind /ai-workshops — and named none at all for the three
     things LOOM is asked for most: a site, an app, a piece of software. In this
     market a visitor who cannot find a floor assumes the ceiling. This band
     states the floor once, up front, and two of its six cards point down at the
     sections below rather than replacing them. -->
<Pricing />

<!-- The Machine is the recurring subscription and opens the pitches instead of
     arriving at 13, under two things nobody can buy. -->
<TheMachine />

<!-- Same shelf, one step lighter: the Protocol puts LOOM inside the client's
     AI; this puts the CLIENT inside everyone else's. -->
<AnswerEngine />

<!-- AI LOOM runs FOR a client, then AI LOOM teaches the client's own team to
     run. Has its own booking page with a live price, so it closes the sell band
     rather than trailing the capability one. -->
<WorkshopsPromo />

<!-- FORGE closes the SELL band (10 Aug 2026) — the smallest, cheapest and only
     instantly self-serve thing LOOM sells: 2 JOD a model, first one free, no
     brief and no call. It sits LAST in SELL and immediately above CAPABLE on
     purpose. Last, because the band is ranked by what LOOM wants sold and a
     2 JOD self-serve tool does not outrank a subscription; immediately above
     CAPABLE, because AppsShowcase (#apps) is the section directly under it and
     this is that lab with a price on it.

     It is a SMALL band by instruction — the pitch and the price only. Every
     interactive step lives in the popup it owns, which also carries the fixed
     side tab. The popup NEVER opens itself: two explicit clicks, no timer, no
     seen-flag. -->
<Forge />

<!-- CAPABLE — everything that answers "can they actually build it?" rather than
     "what am I buying?". AppsShowcase (#apps) and ToolsLab (#lab, the 3D Lab)
     merged into one section on 10 Aug 2026: the old pair was the heaviest run
     on the page — dozens of images plus live animated device mockups, all
     painting whether or not anyone scrolled to it. The client then rejected the
     flat card-grid replacement the same day ("not designed... make it change on
     scroll like it used to do"), so this is back to the scroll-driven "one
     product centre stage, an icon rail of tabs" design, WITHOUT the live
     mockups. #lab no longer resolves and its nav tab is gone. -->
<AppsShowcase />

<!-- OwnApps ("We build our own products too") was REMOVED FROM THE PAGE on
     10 Aug 2026 at the client's request; not ported. #own-apps no longer
     resolves and its "Software" nav tab is gone.

     The Protocol came DOWN from slot 11: it is private beta issued by hand, and
     a dev-tool waitlist does not outrank the subscription. -->
<LoomMcp />

<!-- TypeShowcase used to close the R&D band here — it had come down from slot 2
     on 9 Aug because it was the second thing a buyer saw, before one client
     name. IT WENT BACK UP UNDER THE MANIFESTO on 11 Aug 2026 at the client's
     request; see its seam at the top of the page. The Protocol (#mcp) above is
     now the last thing in CAPABLE. -->

<!-- CLOSE — an unbroken ramp to the ask. How it works, why it works, who does
     it, one last offer, then the form. Nothing new is introduced past this
     point.

     Two studios, named and placed, immediately before the ask. (Until 11 Aug
     2026 this read "before the belief and the ask" — the belief, Manifesto, now
     opens the page.) By here the visitor has seen what LOOM sells and what it
     costs, so "who is this and where are they" is a live question rather than
     an interruption.
     Amman and Sarajevo also do real work for a Jordanian buyer this late on the
     page: the studio is local. -->
<Studios />

<!-- Manifesto sat here from 9 Aug (it had come down from slot 4) so that it read
     as the conclusion of the page rather than its opening assertion. MOVED TO
     SLOT 2, directly under the hero, on 11 Aug 2026 at the client's request —
     see its seam at the top of this file for the full note. Studios now runs
     straight into Bolt, which is the same close it always was minus one beat.

     BY RESULT (1.75 JOD per WhatsApp conversation) was retired 8 Aug 2026: LOOM
     cannot promise an outcome that depends on the client's own replies and
     market. Not ported. -->
<Bolt />

<!-- Last section before the ask. The only band on the page whose job is
     removing reasons to leave rather than adding reasons to stay — timelines,
     who owns the AI output, which language, how payment works. It introduces no
     new fact (data/faq.js forbids it) and carries its own FAQPage JSON-LD,
     because #aeo above sells exactly that markup and the studio should not fail
     its own pitch on its own home page. -->
<Faq />

<Contact />

<!-- Last section on the page, just above the footer — the client asked for this
     literally ("just above the footer"). Contact carries the sales CTA; this is
     a different ask entirely (careers, not a lead), short enough that it reads
     as a footnote to the page rather than a second pitch competing with
     Contact's. -->
<Hiring />
