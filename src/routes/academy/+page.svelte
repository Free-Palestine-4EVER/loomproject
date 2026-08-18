<!--
  /academy — LOOM ACADEMY. Program 01, FIRST CLIENT, is what is open in it.

  This page is not like the rest of the site and is deliberately built apart
  from it, the same way /ai-workshops and /type are: its own hero, its own
  section rhythm, its own CSS file. Everything else on loomstudio-jo.com sells
  agency work to a company. This sells a program to one person, and a person
  reading a sales page needs a different shape — one argument, repeated CTAs,
  the objections answered before they are asked.

  ── THE PAGE IS BILINGUAL AND THE REST OF THE SITE IS NOT ──────────────────
  The program is taught in Arabic. Its buyer is an Arabic speaker who wants to
  make money building websites, and selling that in English throws away most
  of the market. So `lang` is a rune, every string comes out of $data/academy.js
  as { en, ar }, and the whole wrapper flips `dir`. See the header of that file.

  The Arabic is set in the system Arabic stack, not in Clash Display — Clash
  and Satoshi carry no Arabic glyphs and an Arabic h1 in Clash renders as
  fallback tofu at 96px. academy.css does that switch on :lang(ar); the same
  problem and the same fix as journal/[slug]/post-page.css.

  SplitWords is used on the ENGLISH headline only. It splits on spaces and
  wraps each word in its own inline-block mask, which is fine for Latin and
  needless risk for Arabic — an Arabic headline renders as one plain, joined
  string instead.

  ── THE BUY BUTTON IS HONEST ──────────────────────────────────────────────
  WHOP_URL in $data/academy.js is empty until the Whop product exists. While it
  is empty this page renders the WAITLIST (WhatsApp + email, the same two
  routes every other CTA on the site uses) and says the program opens soon,
  rather than a "Buy now" that 404s. Paste the checkout URL into that constant
  and every CTA on this page becomes a real buy button — nothing else changes.
-->
<script>
  import { onMount } from 'svelte'
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SplitWords from '$lib/components/SplitWords.svelte'
  import CountUp from '$lib/components/CountUp.svelte'
  import { BRAND } from '$data/site.js'
  import {
    ACADEMY, PROGRAM, PRICE, WHOP_URL, FOR_WHO, NOT_FOR_WHO, OUTCOMES,
    MODULES, BONUSES, FAQ, LESSON_COUNT, MODULE_COUNT, TOTAL_HOURS, emblemFor,
    HERO_ART, OG_IMAGE,
  } from '$data/academy.js'
  import Pic from '$lib/components/Pic.svelte'
  import './academy.css'

  /* ── language ───────────────────────────────────────────────────────────
     Default 'en' so the SERVER renders English: the page is prerendered, the
     canonical URL is one URL, and an Arabic-first prerender would hand Google
     a page whose <html lang> says en and whose body does not. The client
     switches to Arabic on mount for an Arabic browser, and a manual choice is
     remembered — so an Arabic speaker sees Arabic without a flash of layout
     (the swap is text only; the grid does not reflow between the two). */
  let lang = $state('en')
  const t = (o) => (o && o[lang]) || ''
  const isAr = $derived(lang === 'ar')

  onMount(() => {
    let saved = null
    try { saved = localStorage.getItem('loom-academy-lang') } catch { /* private mode */ }
    if (saved === 'ar' || saved === 'en') { lang = saved; return }
    if (navigator.language && navigator.language.toLowerCase().startsWith('ar')) lang = 'ar'
  })

  function setLang(next) {
    lang = next
    try { localStorage.setItem('loom-academy-lang', next) } catch { /* private mode */ }
  }

  /* ── the curriculum accordion ───────────────────────────────────────────
     One module open at a time, the first open on arrival. A closed accordion
     on a sales page hides the single strongest thing it has to show, so the
     lesson list is real markup at all times — {#if} would remove 54 lesson
     titles from the HTML a crawler and an AI answer engine read. It is
     `hidden` by max-height instead, and `aria-hidden` is NOT set on it: the
     titles stay available to search, and the button carries the state. */
  let open = $state(MODULES[0].id)
  const toggle = (id) => { open = open === id ? '' : id }

  /* ── CTA target ─────────────────────────────────────────────────────────
     One derived href used by all four CTAs on the page, so there is no way
     for one of them to keep pointing somewhere stale. */
  const live = $derived(Boolean(WHOP_URL))
  const waitBrief = $derived(
    isAr
      ? `مرحبا LOOM! بدي أعرف لما يفتح برنامج «${PROGRAM.name.ar}» بأكاديمية LOOM.`
      : `Hi LOOM! I want to know when ${PROGRAM.name.en} at LOOM Academy opens.`
  )
  const waHref = $derived(`${BRAND.whatsapp}?text=${encodeURIComponent(waitBrief)}`)
  const mailHref = $derived(
    `mailto:${BRAND.email}?subject=${encodeURIComponent(`LOOM Academy — ${PROGRAM.name.en} waitlist`)}&body=${encodeURIComponent(waitBrief)}`
  )
  const ctaHref = $derived(live ? WHOP_URL : waHref)
  const ctaLabel = $derived(
    live
      ? (isAr ? `سجّل — $${PRICE.launch}` : `Enrol — $${PRICE.launch}`)
      : (isAr ? 'سجّلني بقائمة الانتظار' : 'Join the waitlist')
  )

  /* ── hero parallax — the same rAF-throttled scroll listener /ai-workshops
     and /type use, rather than a second implementation of the same idea ─── */
  let heroEl = $state(null)
  let heroInnerEl = $state(null)
  onMount(() => {
    let raf = null
    const update = () => {
      raf = null
      if (!heroEl || !heroInnerEl) return
      const rect = heroEl.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)))
      heroInnerEl.style.transform = `translateY(${(p * 70).toFixed(2)}px)`
      heroInnerEl.style.opacity = String(p >= 0.85 ? 0 : 1 - p / 0.85)
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  })

  const TITLE = 'LOOM Academy — build websites with AI and sell them, in Arabic'
  const DESC =
    'LOOM Academy, Program 01: FIRST CLIENT. A practical program in Arabic — build a real website with AI without writing code, '
    + 'then find the business that needs one, say the right thing to the owner, price it and get paid. '
    + `${MODULE_COUNT} modules, ${LESSON_COUNT} lessons, by the studio behind loomstudio-jo.com.`
  const CANONICAL = 'https://www.loomstudio-jo.com/academy'

  /* Course structured data. `offers` quotes PRICE, so the number in Google's
     rich result cannot drift from the number on the page. Only emitted with a
     real checkout URL — advertising a price for something nobody can buy yet
     is exactly the kind of thing that earns a manual action. */
  const jsonLd = $derived(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${PROGRAM.name.en} — ${PROGRAM.tagline.en}`,
    description: DESC,
    inLanguage: 'ar',
    url: CANONICAL,
    provider: {
      '@type': 'Organization',
      name: 'LOOM Academy',
      parentOrganization: { '@type': 'Organization', name: 'LOOM', url: 'https://www.loomstudio-jo.com' },
      url: CANONICAL,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${TOTAL_HOURS}H`,
    },
    ...(live ? {
      offers: {
        '@type': 'Offer',
        price: String(PRICE.launch),
        priceCurrency: PRICE.currency,
        availability: 'https://schema.org/InStock',
        url: WHOP_URL,
      },
    } : {}),
  }))
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href={CANONICAL} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={CANONICAL} />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content={OG_IMAGE} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESC} />
  <meta name="twitter:image" content={OG_IMAGE} />
  {@html `<script type="application/ld+json">${jsonLd}<` + `/script>`}
</svelte:head>

<div class="cr" lang={lang} dir={isAr ? 'rtl' : 'ltr'} class:cr--ar={isAr}>

  <!-- ═══════════════════════════════════════════════════ hero -->
  <section class="cr-hero" bind:this={heroEl}>
    <!-- THE SIGNATURE OF THE PAGE: two threads, woven.
         The program's whole argument is that the build half and the sell half
         are taught apart and are worthless apart. So the hero draws them as
         two yarns that cross into one braid — the LOOM mark's own logic used
         to state the offer, rather than an ornament sitting next to it. Pure
         SVG, no image, no library: two paths whose stroke-dashoffset animates
         in, and a third that is the merged thread they become. -->
    <svg class="cr-weave" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
      <path class="cr-weave-a" d="M0 60 C 150 60, 180 160, 330 160 S 510 60, 660 60 S 840 160, 990 160 1200 110 1200 110" />
      <path class="cr-weave-b" d="M0 160 C 150 160, 180 60, 330 60 S 510 160, 660 160 S 840 60, 990 60 1200 110 1200 110" />
    </svg>

    <!-- Commissioned art slot. Absolutely positioned and decorative, so the
         page is complete without it and gains depth when it lands — no layout
         moves either way. `aria-hidden` because it says nothing the headline
         does not already say. -->
    {#if HERO_ART}
      <div class="cr-hero-art" aria-hidden="true">
        <Pic src={HERO_ART} alt="" width="1100" height="1100" loading="eager" fetchpriority="high" decoding="async" sizes="(max-width: 900px) 60vw, 46vw" />
      </div>
    {/if}

    <div class="cr-hero-inner" bind:this={heroInnerEl}>
      <div class="cr-langbar" role="group" aria-label="Language">
        <button type="button" class="cr-lang" class:is-on={!isAr} onclick={() => setLang('en')} lang="en">English</button>
        <button type="button" class="cr-lang" class:is-on={isAr} onclick={() => setLang('ar')} lang="ar">العربية</button>
      </div>

      <p class="cr-tag">
        {isAr ? `أكاديمية LOOM · ${PROGRAM.codeAr} · بالعربي` : `LOOM Academy · ${PROGRAM.code} · Taught in Arabic`}
        <span class="cr-status">{t(PROGRAM.status)}</span>
      </p>

      <h1 class="cr-h1">
        {#if isAr}
          <span class="cr-h1-name">{PROGRAM.name.ar}</span>
          <span class="cr-h1-line">{PROGRAM.promise.ar}</span>
        {:else}
          <span class="cr-h1-name">{PROGRAM.name.en}</span>
          <SplitWords as="span" class="cr-h1-line" text={PROGRAM.promise.en} delay={0.2} />
        {/if}
      </h1>

      <p class="cr-hero-sub" use:reveal={{ delay: 0.5 }}>{t(PROGRAM.sub)}</p>

      <div class="cr-hero-cta" use:reveal={{ delay: 0.62 }}>
        <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
          <a class="cr-btn cr-btn--fill" href={ctaHref} target={live ? '_blank' : undefined} rel={live ? 'noreferrer' : undefined}>
            {ctaLabel}
          </a>
        </div>
        <a class="cr-btn" href="#cr-curriculum">
          {isAr ? 'شوف المنهاج' : 'See the curriculum'}
        </a>
      </div>

      <p class="cr-hero-meta" use:reveal={{ delay: 0.7 }}>{t(PROGRAM.language)}</p>
    </div>

    <!-- The four facts, in the hero, because they are the specification of
         the thing being sold and a buyer should not have to scroll for it. -->
    <ul class="cr-facts">
      <li use:reveal={{ delay: 0.05 }}><span class="cr-fact-n"><CountUp value={MODULE_COUNT} /></span><span class="cr-fact-l">{isAr ? 'وحدات' : 'modules'}</span></li>
      <li use:reveal={{ delay: 0.1 }}><span class="cr-fact-n"><CountUp value={LESSON_COUNT} /></span><span class="cr-fact-l">{isAr ? 'درس' : 'lessons'}</span></li>
      <li use:reveal={{ delay: 0.15 }}><span class="cr-fact-n"><CountUp value={TOTAL_HOURS} suffix="h" /></span><span class="cr-fact-l">{isAr ? 'فيديو' : 'of video'}</span></li>
      <li use:reveal={{ delay: 0.2 }}><span class="cr-fact-n">∞</span><span class="cr-fact-l">{isAr ? 'وصول مدى الحياة' : 'lifetime access'}</span></li>
    </ul>
  </section>

  <!-- ═══════════════════════════════════════════════════ the academy
       The band that makes this an academy rather than a course page: it
       introduces the institution before the program argues for itself. It is
       deliberately short — three lines and the studio's own credential — 
       because a reader who came for the program should be able to scroll past
       it in two seconds. -->
  <section class="cr-section cr-academy">
    <div class="cr-academy-grid" use:reveal>
      <div>
        <p class="cr-kicker"><span>—</span> {isAr ? 'الأكاديمية' : 'The academy'}</p>
        <h2 class="cr-h2 cr-academy-h2">{t(ACADEMY.line)}</h2>
      </div>
      <p class="cr-academy-body">{t(ACADEMY.intro)}</p>
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ the argument -->
  <section class="cr-section cr-argument">
    <div class="cr-arg-grid">
      <div use:reveal>
        <p class="cr-kicker"><span>—</span> {isAr ? 'ليش هالكورس موجود' : 'Why this exists'}</p>
        <h2 class="cr-h2">
          {isAr
            ? 'في ألف فيديو بيعلّمك تبني موقع. وما في حدا بيعلّمك تبيعه.'
            : 'A thousand videos teach you to build a website. Almost none teach you to sell one.'}
        </h2>
      </div>
      <div class="cr-arg-body" use:reveal={{ delay: 0.1 }}>
        {#if isAr}
          <p>
            هاي المشكلة الحقيقية. بتقعد شهرين تتعلم، وبتصير تعرف تبني موقع أحسن من نص
            المواقع اللي حواليك — وبعدين بتوقف. لأنه ما حدا علّمك مين اللي محتاج موقع،
            ولا شو بتحكيله، ولا شو بتجاوب لما يسألك «قديش بدها».
          </p>
          <p>
            الجزء التقني صار أسهل شي بالمعادلة. الذكاء الاصطناعي بيبني معك بساعات شغل
            كان بدّه أسابيع. اللي ما تغيّر إنه لسا في محل جنبك عم يخسر زباين كل يوم لأنه
            ما إله موقع — وإنت الوحيد اللي بيقدر يفوت ويحكي معه.
          </p>
          <p class="cr-arg-punch">
            هالبرنامج بيعلّمك النصّين سوا. لأنه واحد بدون التاني ما بيساوي إشي.
          </p>
        {:else}
          <p>
            That is the real gap. You spend two months learning, you get good enough to
            build something better than half the sites around you — and then you stop.
            Because nobody taught you who needs one, what to say to them, or what to
            answer when he asks what it costs.
          </p>
          <p>
            The technical half is now the easy half. AI builds with you in hours what
            used to take weeks. What has not changed is that there is a business down
            your street losing customers every day because it has no website — and you
            are the only one who can walk in and say so.
          </p>
          <p class="cr-arg-punch">
            This program teaches both halves. Because either one alone is worth nothing.
          </p>
        {/if}
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ outcomes -->
  <section class="cr-section">
    <div class="cr-head">
      <p class="cr-kicker"><span>—</span> {isAr ? 'شو بتطلع فيه' : 'What you walk away with'}</p>
      <h2 class="cr-h2">
        {isAr ? 'مش «معرفة». أشياء بتملكها لما تخلّص.' : 'Not “knowledge”. Five things you own by the end.'}
      </h2>
    </div>
    <ol class="cr-outcomes">
      {#each OUTCOMES as o, i (o.n)}
        <li use:reveal={{ delay: 0.05 * i, y: 20 }}>
          <span class="cr-out-n" aria-hidden="true">{o.n}</span>
          <p>{t(o)}</p>
        </li>
      {/each}
    </ol>
  </section>

  <!-- ═══════════════════════════════════════════════════ curriculum -->
  <section class="cr-section cr-curriculum" id="cr-curriculum">
    <div class="cr-head">
      <p class="cr-kicker"><span>—</span> {isAr ? 'المنهاج' : 'The curriculum'}</p>
      <h2 class="cr-h2">
        {isAr
          ? `${MODULE_COUNT} وحدات، ${LESSON_COUNT} درس، بالترتيب اللي بتحتاجهم فيه.`
          : `${MODULE_COUNT} modules, ${LESSON_COUNT} lessons, in the order you need them.`}
      </h2>
      <p class="cr-lede">
        {isAr
          ? 'الترتيب مقصود. «العين» — كيف تلاقي مين محتاج موقع — إجت قبل البناء، لأنه اللي عنده قائمة أسماء حقيقية بيبني بشكل مختلف تماماً عن اللي عم يبني بالفراغ.'
          : 'The order is the argument. The Eye — finding who needs a site — comes before you build anything, because someone holding a list of twelve real businesses builds differently from someone building into a void.'}
      </p>
    </div>

    <div class="cr-mods">
      {#each MODULES as m, i (m.id)}
        {@const on = open === m.id}
        <article class="cr-mod" class:is-open={on} use:reveal={{ delay: 0.03 * i, y: 18 }}>
          <h3>
            <button type="button" class="cr-mod-head" aria-expanded={on} onclick={() => toggle(m.id)}>
              {#if emblemFor(m.id)}
                <!-- Only rendered for a module whose art exists; see EMBLEMS
                     in $data/academy.js for why this is a set and not a flag. -->
                <span class="cr-mod-emblem" aria-hidden="true">
                  <Pic src={emblemFor(m.id)} alt="" width="120" height="120" loading="lazy" decoding="async" sizes="64px" />
                </span>
              {:else}
                <span class="cr-mod-n" aria-hidden="true">{m.n}</span>
              {/if}
              <span class="cr-mod-title">{t(m.title)}</span>
              <span class="cr-mod-meta">
                {m.lessons.length} {isAr ? 'دروس' : 'lessons'}
                <span class="cr-mod-dot" aria-hidden="true">·</span>
                {m.hours}{isAr ? ' ساعة' : 'h'}
              </span>
              <span class="cr-mod-chev" aria-hidden="true"></span>
            </button>
          </h3>
          <div class="cr-mod-body">
            <div class="cr-mod-body-in">
              <p class="cr-mod-blurb">{t(m.blurb)}</p>
              <ol class="cr-lessons">
                {#each m.lessons as l, j (j)}
                  <li><span class="cr-lesson-n" aria-hidden="true">{m.n}.{j + 1}</span>{t(l)}</li>
                {/each}
              </ol>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ for / not for -->
  <section class="cr-section cr-fit">
    <div class="cr-fit-col" use:reveal>
      <p class="cr-kicker"><span>—</span> {isAr ? 'هاد الكورس إلك إذا' : 'This is for you if'}</p>
      <ul class="cr-fit-list cr-fit-list--yes">
        {#each FOR_WHO as f, i (i)}<li>{t(f)}</li>{/each}
      </ul>
    </div>
    <div class="cr-fit-col" use:reveal={{ delay: 0.08 }}>
      <p class="cr-kicker"><span>—</span> {isAr ? 'ومش إلك إذا' : 'And not for you if'}</p>
      <ul class="cr-fit-list cr-fit-list--no">
        {#each NOT_FOR_WHO as f, i (i)}<li>{t(f)}</li>{/each}
      </ul>
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ bonuses -->
  <section class="cr-section">
    <div class="cr-head">
      <p class="cr-kicker"><span>—</span> {isAr ? 'وكمان بيجي معه' : 'It also comes with'}</p>
      <h2 class="cr-h2">
        {isAr ? 'الأشياء اللي بتستخدمها يوم ما تبدأ تشتغل.' : 'The things you use the day you start working.'}
      </h2>
    </div>
    <div class="cr-bonuses">
      {#each BONUSES as b, i (i)}
        <article class="cr-bonus" use:reveal={{ delay: 0.04 * i, y: 18 }}>
          <h3>{t(b.title)}</h3>
          <p>{t(b.body)}</p>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ the offer -->
  <section class="cr-section cr-offer-section" id="cr-buy">
    <div class="cr-offer" use:reveal>
      <p class="cr-kicker"><span>—</span> {isAr ? 'السعر' : 'The price'}</p>
      <h2 class="cr-h2 cr-offer-h2">
        {isAr
          ? 'أول موقع بتبيعه بيرجّعلك سعر الكورس كذا مرة.'
          : 'The first site you sell pays for this several times over.'}
      </h2>

      <div class="cr-price">
        <span class="cr-price-now">${PRICE.launch}</span>
        <span class="cr-price-was" aria-label={isAr ? 'السعر بعد فترة الإطلاق' : 'price after launch'}>${PRICE.full}</span>
      </div>
      <p class="cr-price-note">{t(PRICE.note)}</p>

      <div class="cr-offer-cta">
        <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
          <a class="cr-btn cr-btn--fill cr-btn--lg" href={ctaHref} target={live ? '_blank' : undefined} rel={live ? 'noreferrer' : undefined}>
            {ctaLabel}
          </a>
        </div>
        {#if !live}
          <a class="cr-btn" href={mailHref}>{isAr ? 'أو بالإيميل' : 'Or by email'}</a>
        {/if}
      </div>

      {#if !live}
        <!-- Shown only while WHOP_URL is empty. The moment a checkout URL is
             pasted into $data/academy.js this whole block disappears on its
             own — there is no second flag to remember to flip. -->
        <p class="cr-offer-soon" role="status">
          {isAr
            ? 'البرنامج بيفتح قريباً بسعر المؤسسين. اترك رقمك ورح تكون أول من يعرف — وبتاخد السعر المخفّض حتى لو ارتفع بعدين.'
            : 'Program 01 opens shortly at the founding price. Join the list and you get that price when it opens, even after it goes up.'}
        </p>
      {/if}
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ faq -->
  <section class="cr-section cr-faq-section">
    <div class="cr-head">
      <p class="cr-kicker"><span>—</span> {isAr ? 'أسئلة' : 'Questions'}</p>
      <h2 class="cr-h2">{isAr ? 'الأسئلة اللي بتسألها قبل ما تدفع.' : 'The ones you ask before paying.'}</h2>
    </div>
    <div class="cr-faq">
      {#each FAQ as f, i (i)}
        <details class="cr-faq-item" open={i === 0} use:reveal={{ delay: 0.03 * i, y: 14 }}>
          <summary>{t(f.q)}</summary>
          <p>{t(f.a)}</p>
        </details>
      {/each}
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════ close -->
  <section class="cr-section cr-close">
    <div use:reveal>
      <h2 class="cr-h2 cr-close-h2">
        {isAr
          ? 'في محل جنبك، اليوم، عم يخسر زباين لأنه ما إله موقع.'
          : 'There is a business near you, today, losing customers because it has no website.'}
      </h2>
      <p class="cr-close-sub">
        {isAr
          ? 'الفرق الوحيد بين اللي بيوصله واللي بيضل يتفرج، إنه واحد فيهم تعلّم شو يحكي.'
          : 'The only difference between the person who reaches them and the person who watches is that one of them learned what to say.'}
      </p>
      <div class="cr-hero-cta cr-close-cta">
        <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
          <a class="cr-btn cr-btn--fill cr-btn--lg" href={ctaHref} target={live ? '_blank' : undefined} rel={live ? 'noreferrer' : undefined}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  </section>
</div>
