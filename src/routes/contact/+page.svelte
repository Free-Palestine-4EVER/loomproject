<!--
  /contact — how to reach the studio.

  WHY THIS IS NOT JUST `<Contact />`. The route used to mount the home page's
  contact band and the hiring band and stop. That is not a page: it is the
  bottom of the home page with a URL. What a contact page owes a visitor is
  everything AROUND the form — which channel to use, who is at the other end
  of it, what happens after they press send, and where to go if they are here
  to be hired rather than to hire.

  THE FORM ITSELF IS STILL THE HOME PAGE'S. `<Contact />` is mounted whole,
  unmodified, because the four-step wizard inside it is the site's single
  conversion surface and there must be exactly one implementation of it —
  ContactWizard composes a structured brief and hands it to wa.me or mailto,
  and a second copy of that logic is a second thing to get wrong. So this page
  is built around that mount, not instead of it.

  THE ORDER IS THE VISITOR'S OWN QUESTION ORDER:

    1. HOW DO I REACH YOU    hero, the three direct routes, the fast path
    2. WHO IS AT THE OTHER   the two studios, their cities, roles and hours
       END
    3. THE BRIEF             <Contact /> — the wizard, mounted as-is
    4. WHAT HAPPENS NEXT     the four beats between send and start
    5. NOT A CLIENT          <Hiring /> — the other reason to write

  NOTHING IS INVENTED. The number, the WhatsApp link and the address are
  BRAND in $data/site.js. The two cities, their countries, their roles and the
  "by appointment" line are the same strings Studios.svelte renders — quoted,
  not restated differently. Every claim under "what happens next" is a quote
  from FAQ.timeline, FAQ.payment or NEEDS['Not sure yet'], attributed on the
  card, and the send mechanics are simply what ContactWizard actually does.
  No response-time promise is made anywhere on this page, because no data file
  states one.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { BRAND } from '$data/site.js'
  import { FAQ } from '$data/faq.js'
  import { NEEDS } from '$data/needs.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import Contact from '$components/Contact.svelte'
  import Hiring from '$components/Hiring.svelte'
  import '../route-page.css'
  import './contact-page.css'

  const faqBy = Object.fromEntries(FAQ.map((f) => [f.id, f]))

  /* ——— 1. THE DIRECT ROUTES ———
     Three, and all three are the same two facts in BRAND: the WhatsApp link
     (which is the phone number) and the email address. The third is the form
     below, which is a route to the same two — ContactWizard's two submit
     buttons are wa.me and mailto — so it is described as what it is: the same
     inbox, with the questions asked for you. */
  const ROUTES = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      value: BRAND.phoneJO,
      href: BRAND.whatsapp,
      external: true,
      accent: 'var(--yarn-pink)',
      body: 'The fastest route, and the one most work here starts on. Send a voice note if it is easier than typing it.',
    },
    {
      id: 'email',
      label: 'Email',
      value: BRAND.email,
      href: `mailto:${BRAND.email}`,
      external: false,
      accent: 'var(--yarn-blue)',
      body: 'For anything with an attachment — a deck, a brand book, a tender document, a set of photographs.',
    },
    {
      id: 'brief',
      label: 'The brief form',
      value: 'Four steps',
      href: '#contact',
      external: false,
      accent: 'var(--yarn-violet)',
      body: 'Answers the questions we would have asked anyway, then sends itself to WhatsApp or email — the same two inboxes, with the awkward part already done.',
    },
  ]

  /* ——— 2. THE TWO STUDIOS ———
     City, country and role are quoted from Studios.svelte's own array; the
     time zones are the ones its clocks are built on (Asia/Amman, GMT+3;
     Europe/Sarajevo, GMT+2 — the pair the footer already prints). Nothing
     here asserts an address, an opening hour or a headcount, because no data
     file carries one. */
  const STUDIOS = [
    {
      city: 'Amman',
      country: 'Jordan',
      role: 'HQ — strategy, AI & production',
      zone: 'GMT+3',
      contact: BRAND.phoneJO,
      href: BRAND.whatsapp,
      action: 'WhatsApp us',
      external: true,
      accent: 'var(--yarn-pink)',
    },
    {
      city: 'Sarajevo',
      country: 'Bosnia & Herzegovina',
      role: 'Design & campaign studio',
      zone: 'GMT+2',
      contact: 'By appointment',
      href: `mailto:${BRAND.email}`,
      action: 'Email the studio',
      external: false,
      accent: 'var(--yarn-violet)',
    },
  ]

  /* ——— 4. WHAT HAPPENS NEXT ———
     Four beats. Beat 01 is a description of the mechanism (what the form
     literally does); 02, 03 and 04 each carry a `src` naming the file the
     claim comes from, and the sentence under it is that file's own words.
     If a beat cannot cite something, it does not appear. */
  const notSure = NEEDS['Not sure yet']
  const NEXT = [
    {
      n: '01',
      title: 'It lands in a real inbox',
      body: 'Nothing is stored on this site and there is no ticket queue. The form composes your brief and opens it in WhatsApp or your mail app, so what arrives is a message from you to a person — you can read it, and edit it, before it sends.',
      src: 'How the form actually works',
    },
    {
      n: '02',
      title: 'A call about the business',
      body: `${notSure.deliverables[0]}. Then ${notSure.deliverables[1].toLowerCase()} — yours to keep, and to take elsewhere if you want.`,
      src: 'From “Not sure yet” in the eight needs',
    },
    {
      n: '03',
      title: 'Dates and a price, in writing',
      body: 'You get the actual dates in writing with the quote, before anything starts. Project work is a fixed price agreed in writing before it starts, split across milestones — never billed by the hour.',
      src: 'From the FAQ: timelines and payment',
    },
    {
      n: '04',
      title: 'Then it starts',
      body: `${notSure.deliverables[2]}. Nothing is committed before that shape is agreed, and the first station of the process is Intent — the brief gets interrogated until the real problem shows itself.`,
      src: 'From “Not sure yet” in the eight needs',
    },
  ]

  const DESC = `Reach LOOM directly — WhatsApp ${BRAND.phoneJO}, ${BRAND.email}, or the four-step brief form. Two studios, Amman and Sarajevo, and exactly what happens between sending a brief and starting work.`

  // `@id` matches the node the home page defines in full (src/routes/+page.svelte)
  // — same entity, asserted again here with the fields THIS page's content
  // backs up (the contact channels and the two studios), rather than a
  // disconnected second Organization a crawler has no reason to treat as
  // the same business.
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.loomstudio-jo.com/#organization',
    name: BRAND.name,
    url: 'https://www.loomstudio-jo.com',
    email: BRAND.email,
    telephone: BRAND.phoneJO,
    slogan: BRAND.tagline,
    description: BRAND.positioning,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: BRAND.phoneJO,
        email: BRAND.email,
        availableLanguage: ['en', 'ar', 'bs'],
      },
    ],
    location: STUDIOS.map((s) => ({
      '@type': 'Place',
      name: `LOOM — ${s.city}`,
      address: { '@type': 'PostalAddress', addressLocality: s.city, addressCountry: s.country },
    })),
  })
</script>

<svelte:head>
  <title>Contact LOOM — WhatsApp, Email or a Four-Step Brief</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/contact" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/contact" />
  <meta property="og:title" content="Contact LOOM — WhatsApp, Email or a Four-Step Brief" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Contact LOOM — WhatsApp, Email or a Four-Step Brief" />
  <meta name="twitter:description" content={DESC} />
  {@html `<script type="application/ld+json">${schema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. HOW DO I REACH YOU ═══════════════════════════════════════ -->
  <header class="ct-hero">
    <div class="ct-hero-in">
      <p class="kicker"><span>—</span> Contact</p>
      <SplitWords as="h1" class="h2 ct-h1" text="Three ways in, two studios, one person reading" />
      <p class="lede ct-hero-lede" use:reveal={{ delay: 0.1 }}>
        {BRAND.tagline} Pick whichever route suits what you have to say — a
        half-formed idea on WhatsApp is as welcome here as a tender document
        by email.
      </p>

      <ul class="ct-routes">
        {#each ROUTES as r, i (r.id)}
          <li class="ct-route" style="--accent: {r.accent}" use:reveal={{ delay: 0.12 + i * 0.05, y: 20 }}>
            <a
              class="ct-route-a"
              href={r.href}
              target={r.external ? '_blank' : null}
              rel={r.external ? 'noreferrer' : null}
            >
              <p class="ct-route-label">{r.label}</p>
              <p class="ct-route-value">{r.value}</p>
              <span class="ct-route-arrow" aria-hidden="true">→</span>
            </a>
            <p class="ct-route-body">{r.body}</p>
          </li>
        {/each}
      </ul>

      <div class="ct-hero-cta" use:reveal={{ delay: 0.28 }}>
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label="Start a project"
            onclick={() => wizard.open({ note: 'From the contact page' })}
          />
        </div>
        <p class="ct-hero-note">
          Or scroll — the same four steps are on this page, open, no modal.
        </p>
      </div>
    </div>
  </header>

  <!-- ═══ 2. WHO IS AT THE OTHER END ══════════════════════════════════ -->
  <section class="ct-studios" aria-labelledby="ct-studios-h">
    <div class="ct-sec-head">
      <p class="kicker"><span>—</span> The studios</p>
      <h2 class="h2 ct-h2" id="ct-studios-h">{BRAND.cities.join(' and ')}, an hour apart on the clock</h2>
      <p class="ct-sec-lede">
        Two rooms, one studio. In practice it means a note sent at the end of
        one working day is picked up at the start of another, and that a Gulf
        brief and a European one both land somewhere that has shipped in that
        market.
        <span class="ct-src">From the FAQ: “Where are you, and does it matter?”</span>
      </p>
    </div>

    <div class="ct-studio-grid">
      {#each STUDIOS as s, i (s.city)}
        <article class="ct-studio" style="--accent: {s.accent}" use:reveal={{ delay: i * 0.06, y: 20 }}>
          <p class="ct-studio-city">{s.city}</p>
          <p class="ct-studio-country">{s.country} · {s.zone}</p>
          <p class="ct-studio-role">{s.role}</p>
          <p class="ct-studio-contact">{s.contact}</p>
          <a
            class="ct-studio-a"
            href={s.href}
            target={s.external ? '_blank' : null}
            rel={s.external ? 'noreferrer' : null}
          >{s.action} <span aria-hidden="true">→</span></a>
        </article>
      {/each}
    </div>

    <div class="ct-wrap">
    <p class="ct-studio-foot" use:reveal={{ delay: 0.1 }}>
      Most work runs remotely; both cities take meetings in person. Arabic and
      English come out of Amman, Bosnian and English out of Sarajevo — written
      in the language, not translated into it.
      <span class="ct-src">From the FAQ: “Do you actually work in Arabic, or just translate?”</span>
    </p>
    </div>
  </section>

  <!-- ═══ 3. THE BRIEF ════════════════════════════════════════════════
       The home page's own section, mounted whole. Everything on this page is
       arranged around it; nothing here reimplements any part of it. -->
  <Contact />

  <!-- ═══ 4. WHAT HAPPENS NEXT ════════════════════════════════════════ -->
  <section class="ct-next" aria-labelledby="ct-next-h">
    <div class="ct-sec-head">
      <p class="kicker"><span>—</span> After you send</p>
      <h2 class="h2 ct-h2" id="ct-next-h">Four things happen, and none of them is an invoice</h2>
      <p class="ct-sec-lede">
        The gap between sending a brief and starting work is where most studios
        go quiet. Here is the whole of it, in order, with the source of every
        promise named underneath.
      </p>
    </div>

    <ol class="ct-flow">
      {#each NEXT as s, i (s.n)}
        <li class="ct-flow-step" use:reveal={{ delay: i * 0.05, y: 18 }}>
          <p class="ct-flow-n">{s.n}</p>
          <h3 class="ct-flow-h">{s.title}</h3>
          <p class="ct-flow-b">{s.body}</p>
          <p class="ct-flow-src">{s.src}</p>
        </li>
      {/each}
    </ol>

    <div class="ct-terms" use:reveal={{ delay: 0.08 }}>
      <div class="ct-term">
        <p class="ct-term-h">You will not be quoted by the hour</p>
        <p class="ct-term-b">{faqBy.payment.a}</p>
      </div>
      <div class="ct-term">
        <p class="ct-term-h">You will not be sold a rebuild you do not need</p>
        <p class="ct-term-b">{faqBy.existing.a}</p>
      </div>
    </div>

    <div class="ct-wrap">
      <p class="ct-next-foot">
        More of the awkward questions are answered on the
        <a href="/faq">FAQ</a> — ownership of AI-generated work, minimums, and
        what “AI-native” actually means about the standard of the output.
      </p>
    </div>
  </section>

  <!-- ═══ 5. NOT A CLIENT ═════════════════════════════════════════════
       A one-line hand-off, deliberately NOT a headed section: <Hiring />
       immediately below opens with its own "Careers" kicker and its own
       headline, and two of those in a row is a page arguing with itself. -->
  <div class="ct-careers">
    <div class="ct-wrap">
      <p class="ct-careers-p" use:reveal={{ y: 14 }}>
        Writing to join rather than to hire? Same two addresses, different
        subject line — the open roles are directly below.
      </p>
    </div>
  </div>

  <Hiring />
</div>
