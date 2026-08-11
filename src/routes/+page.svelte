<!--
  The long page.

  ORDER IS A CONVERSION DECISION, NOT A TASTE ONE (reordered 9 Aug 2026,
  extended 10 Aug, reorganised 10 Aug; Voices and Process REMOVED 10 Aug 2026
  at the client's request). Four bands; nothing may be inserted without picking
  one:

    PROOF     hero → client wall → cases → who and where the studio is
    QUALIFY   thirty industries (pinned tour) → the fork
    SELL      the floor, then everything buyable
    CAPABLE   what LOOM builds, including for itself
    CLOSE     why → offer → FAQ → contact → careers

  Three rules drove the 10 Aug reorganisation: nothing that cannot be bought
  today may sit above something that can; no claim sits above its own evidence;
  and ALL the evidence goes first.

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
  import Manifesto from '$lib/components/Manifesto.svelte'
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

<!-- PROOF — one section where Marquee and Stats used to be two. The marquee
     slid the most valuable words on the page (UNICEF, Vodafone, Benetton) past
     at a speed nobody reads them at, and the numbers band under it was four
     CountUps with no claim attached. They are now the evidence and the summary
     of one argument. Marquee and Stats are not ported — they are mounted by
     nothing. -->
<Proof />

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

<!-- TypeShowcase came down from slot 2 — it was the second thing a buyer saw,
     before one client name. A free typeface is the purest craft flex LOOM has
     and converts nobody; it belongs with the rest of the R&D, where it also
     stops pulling four heavy planted font cuts into the top of the page. /type
     still carries it in the nav for anyone who came for the font. -->
<TypeShowcase />

<!-- CLOSE — an unbroken ramp to the ask. How it works, why it works, who does
     it, one last offer, then the form. Nothing new is introduced past this
     point.

     Two studios, named and placed, immediately before the belief and the ask.
     By here the visitor has seen what LOOM sells and what it costs, so "who is
     this and where are they" is a live question rather than an interruption.
     Amman and Sarajevo also do real work for a Jordanian buyer this late on the
     page: the studio is local. -->
<Studios />

<!-- Manifesto came down from slot 4. "Trends don't lead our work. Thinking
     does." is a claim, and a claim only pays once there is evidence behind it —
     it now reads as the conclusion of the page rather than its opening
     assertion. -->
<Manifesto />

<!-- BY RESULT (1.75 JOD per WhatsApp conversation) was retired 8 Aug 2026: LOOM
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
