<!--
  /ai-workshops — corporate AI training, sold to the company, not to one
  employee. The argument the whole page is built to land: AI will not
  replace your staff, but a competitor who has trained theirs will replace
  you. Structure mirrors /type (the site's other dedicated sub-page): its own
  hero, its own section rhythm, its own CSS file — no wool material, no
  case-study wall, because this page's whole job is one booking form. Ported
  from src/components/Workshops.jsx.
-->
<script>
  import { onMount } from 'svelte'
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SplitWords from '$lib/components/SplitWords.svelte'
  import CountUp from '$lib/components/CountUp.svelte'
  import { BRAND } from '$data/site.js'
  import {
    MODULES, MODULE_INCLUDES, MIN_MODULES, MAX_MODULES, RECOMMENDED_MIN_SEATS,
    ENTERPRISE_MIN_SEATS, PRICE_PER_SEAT_BY_MODULE_COUNT, VOLUME_TIERS,
    INDUSTRIES, START_WINDOWS, estimate,
  } from '$data/workshops.js'
  import '$components/workshops.css'

  const fmt = (n) => n.toLocaleString('en-US')

  // Same sentence the <title>/<meta description> below used to carry alone —
  // pulled into a constant so canonical/og:description/twitter:description
  // quote it instead of each hand-typing a slightly different version.
  const TITLE = 'AI Workshops for Teams — LOOM'
  const DESC =
    'Corporate AI training in Amman, priced per employee and per module. LOOM trains the team you already have to run AI agents day to day — sales, marketing, finance, ops, HR and support — with a live per-seat price.'
  const CANONICAL = 'https://www.loomstudio-jo.com/ai-workshops'

  // The worked example in the pricing section — a plausible mid-size cohort,
  // computed through the exact same estimate() the live form uses. Change the
  // two numbers below and every figure on the page that quotes this example
  // updates with them; nothing here is typed twice.
  const EXAMPLE_SEATS = 12
  const EXAMPLE_MODULES = 5
  const example = estimate({ seats: EXAMPLE_SEATS, moduleCount: EXAMPLE_MODULES })

  // ─── hero scroll parallax — same rAF-throttled scroll listener Hero.svelte
  // and /type's hero use, replacing Framer's useScroll/useTransform pair ───
  let heroEl = $state(null)
  let heroInnerEl = $state(null)
  onMount(() => {
    let raf = null
    const update = () => {
      raf = null
      if (!heroEl || !heroInnerEl) return
      const rect = heroEl.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)))
      heroInnerEl.style.transform = `translateY(${(progress * 90).toFixed(2)}px)`
      const fade = progress >= 0.85 ? 0 : 1 - progress / 0.85
      heroInnerEl.style.opacity = String(fade)
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  })

  function onHeroImgError(e) {
    e.currentTarget.style.display = 'none'
  }

  // ─── the form ───────────────────────────────────────────────────────────
  let company = $state('')
  let contactName = $state('')
  let email = $state('')
  let phone = $state('')
  let seats = $state('')
  let industry = $state('')
  let startWindow = $state('')
  let notes = $state('')

  let selected = $state(['prompting', 'agents', 'security'])
  let maxHit = $state(false)
  let touched = $state(false)

  function toggleModule(id) {
    if (selected.includes(id)) {
      maxHit = false
      selected = selected.filter((x) => x !== id)
      return
    }
    if (selected.length >= MAX_MODULES) { maxHit = true; return }
    maxHit = false
    selected = [...selected, id]
  }

  const seatsNum = $derived(Number(seats) || 0)
  // The single source of truth for the live estimate panel, the worked
  // example above, and the WhatsApp/email brief below — none of them compute
  // a JOD figure of their own; all three call estimate().
  const est = $derived(estimate({ seats: seatsNum, moduleCount: selected.length }))
  const underRecommended = $derived(seatsNum > 0 && seatsNum < RECOMMENDED_MIN_SEATS)
  const belowMinModules = $derived(selected.length < MIN_MODULES)
  const atMaxModules = $derived(selected.length >= MAX_MODULES)

  const detailsValid = $derived(
    company.trim().length > 1 && contactName.trim().length > 1
    && email.trim().length > 3 && seatsNum > 0
  )
  const canSubmit = $derived(detailsValid && !belowMinModules)

  const selectedTitles = $derived(MODULES.filter((m) => selected.includes(m.id)).map((m) => m.title))

  const brief = $derived.by(() => {
    const lines = [
      'Hi LOOM! We’d like to book an AI Workshop.',
      company ? `Company: ${company}` : null,
      contactName ? `Contact: ${contactName}` : null,
      email ? `Email: ${email}` : null,
      phone ? `Phone: ${phone}` : null,
      seats ? `Employees to train: ${seats}` : null,
      industry ? `Industry: ${industry}` : null,
      startWindow ? `Preferred start: ${startWindow}` : null,
      `Modules (${selected.length}): ${selectedTitles.join(', ') || 'none picked yet'}`,
      est && !est.enterprise
        ? `Estimate: ${fmt(est.discountedPerSeat)} JOD/employee × ${est.seats} = ${fmt(est.total)} JOD (${est.tier.label})`
        : est?.enterprise ? 'Enterprise tier — please send a custom quote.' : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean)
    return lines.join('\n')
  })

  const waHref = $derived(`${BRAND.whatsapp}?text=${encodeURIComponent(brief)}`)
  const mailHref = $derived(`mailto:${BRAND.email}?subject=${encodeURIComponent(`AI Workshops — ${company || 'inquiry'}`)}&body=${encodeURIComponent(brief)}`)
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href={CANONICAL} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={CANONICAL} />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESC} />
</svelte:head>

<div class="wk">
  <!-- ——————————————————————————— hero -->
  <section class="wk-hero" bind:this={heroEl}>
    <div class="wk-hero-media" aria-hidden="true">
      <!-- Art-directed exactly like the long page's need tiles: a `-wide`
           panorama for phones under the same 719px switch banners.css uses,
           a `-pc` portrait for everything above it, and a display:contents
           wrapper so the <picture> adds no box of its own. Neither file
           exists yet — the gradient behind this layer (workshops.css) is the
           whole picture until they ship, and onerror keeps a failed decode
           from leaving a hole. -->
      <picture style="display: contents">
        <source media="(max-width: 719px)" srcset="/img/workshops/hero-wide.webp" />
        <img
          src="/img/workshops/hero-pc.webp"
          alt=""
          width="1600"
          height="2000"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          onerror={onHeroImgError}
        />
      </picture>
    </div>
    <div class="wk-hero-inner" bind:this={heroInnerEl}>
      <p class="wk-tag">AI Workshops by LOOM · Corporate training, Amman</p>
      <h1 class="wk-h1">
        <SplitWords as="span" text="AI will not replace your employees." />
        <SplitWords as="span" class="wk-h1-line2" text="But a company that uses it will replace one that doesn’t." delay={0.35} />
      </h1>
      <p class="wk-hero-sub" use:reveal={{ delay: 0.55 }}>
        This is not a headcount play. LOOM trains the team you already have
        to run AI agents day to day — inside sales, marketing, finance,
        ops, HR and support — until they are the reason your company moves
        faster than the one down the street that never sent anyone to a
        workshop.
      </p>
      <div class="wk-hero-cta" use:reveal={{ delay: 0.68 }}>
        <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
          <a class="wk-btn wk-btn--fill" href="#wk-form">Book a cohort</a>
        </div>
        <a class="wk-btn" href="#wk-curriculum">See the curriculum</a>
      </div>
    </div>
  </section>

  <!-- ——————————————————————————— positioning / super-employees -->
  <section class="wk-section wk-position">
    <div class="wk-position-grid">
      <div use:reveal>
        <p class="wk-kicker"><span>—</span> Not fewer people. Sharper ones.</p>
        <h2 class="wk-h2">
          The company that wins isn’t the one that cuts staff for AI. It’s the
          one that hands AI to the staff it already trusts.
        </h2>
      </div>
      <p class="wk-position-body" use:reveal={{ delay: 0.1 }}>
        Every AI headline sold this backwards: robots taking jobs, teams
        shrinking, headcount as the metric that matters. In practice the
        companies pulling ahead right now did the opposite — they kept
        their people and made each one capable of the output that used to
        take three. A salesperson who can build their own follow-up agent.
        A finance lead who can reconcile a whole ledger by lunch. An ops
        manager who redesigns a workflow instead of just watching it
        break slower. That is what LOOM builds in a workshop room: not
        headcount reduction, <em>super employees</em> — your own team,
        with the same judgment and client relationships they already
        have, now moving at the speed of the tool instead of around it.
      </p>
    </div>
    <div class="wk-facts">
      <div class="wk-fact" use:reveal={{ delay: 0.05 }}><span class="wk-fact-n"><CountUp value={MODULES.length} /></span><span class="wk-fact-l">curriculum modules to choose from</span></div>
      <div class="wk-fact" use:reveal={{ delay: 0.1 }}><span class="wk-fact-n"><CountUp value={MIN_MODULES} suffix={`–${MAX_MODULES}`} /></span><span class="wk-fact-l">modules picked per cohort</span></div>
      <div class="wk-fact" use:reveal={{ delay: 0.15 }}><span class="wk-fact-n"><CountUp value={RECOMMENDED_MIN_SEATS} suffix="+" /></span><span class="wk-fact-l">employees is where a cohort runs best</span></div>
      <div class="wk-fact" use:reveal={{ delay: 0.2 }}><span class="wk-fact-n">14</span><span class="wk-fact-l">days of post-workshop support, every module</span></div>
    </div>
  </section>

  <!-- ——————————————————————————— curriculum -->
  <section class="wk-section" id="wk-curriculum">
    <div class="wk-head">
      <p class="wk-kicker"><span>—</span> The curriculum</p>
      <h2 class="wk-h2">Eight modules. Your company picks three to ten.</h2>
      <p class="wk-lede">
        No two teams need the same training — a boutique agency and a
        logistics company are not solving the same problem. The catalogue
        below is fixed; the cohort is not. Pick what your departments
        actually need in the form further down and the price adjusts with it.
      </p>
    </div>
    <div class="wk-mods">
      {#each MODULES as m, i (m.id)}
        <article class="wk-mod wk-mod-cell" use:reveal={{ delay: 0.04 * i, y: 22 }}>
          <span class="wk-mod-n" aria-hidden="true">{m.n}</span>
          <h3 class="wk-mod-title">{m.title}</h3>
          <p class="wk-mod-hours">{m.hours} contact hours</p>
          <p class="wk-mod-blurb">{m.blurb}</p>
        </article>
      {/each}
    </div>
    <div class="wk-includes" use:reveal={{ delay: 0.1 }}>
      <p class="wk-includes-kicker">Every module includes</p>
      <ul>
        {#each MODULE_INCLUDES as line (line)}
          <li>{line}</li>
        {/each}
      </ul>
    </div>
  </section>

  <!-- ——————————————————————————— pricing -->
  <section class="wk-section wk-pricing">
    <div class="wk-head">
      <p class="wk-kicker"><span>—</span> Pricing, in the open</p>
      <h2 class="wk-h2">Priced per employee, per module — with the maths shown.</h2>
      <p class="wk-lede">
        This is senior corporate training, delivered on-site, and priced
        like it — not a webinar sold by the seat. Every figure below comes
        out of one table; nothing is quoted that isn’t derived from it.
      </p>
    </div>

    <div class="wk-price-grid">
      <div class="wk-price-table-wrap" use:reveal>
        <table class="wk-price-table">
          <caption>JOD per employee, by modules picked</caption>
          <thead>
            <tr><th>Modules</th><th>JOD / employee</th></tr>
          </thead>
          <tbody>
            {#each Object.entries(PRICE_PER_SEAT_BY_MODULE_COUNT) as [n, price] (n)}
              <tr>
                <td>{n}</td>
                <td>{fmt(price)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wk-price-table-wrap" use:reveal={{ delay: 0.06 }}>
        <table class="wk-price-table">
          <caption>Volume breaks, by headcount</caption>
          <thead>
            <tr><th>Employees</th><th>Discount</th></tr>
          </thead>
          <tbody>
            {#each VOLUME_TIERS as t (t.id)}
              <tr>
                <td>{t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`}</td>
                <td>{t.discount ? `${Math.round(t.discount * 100)}% off` : '—'}</td>
              </tr>
            {/each}
            <tr>
              <td>{ENTERPRISE_MIN_SEATS}+</td>
              <td>Enterprise — talk to us</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {#if example && !example.enterprise}
      <div class="wk-example" use:reveal={{ delay: 0.1 }}>
        <p class="wk-example-kicker">Worked example</p>
        <p class="wk-example-body">
          <strong>{example.seats} employees</strong>, <strong>{example.moduleCount} modules</strong> picked
          → <strong>{fmt(example.perSeat)} JOD</strong> per employee at standard rate
          {#if example.tier.discount > 0}
            ({Math.round(example.tier.discount * 100)}% {example.tier.label} volume break applied → <strong>{fmt(example.discountedPerSeat)} JOD</strong>)
          {/if}
          × {example.seats} employees =
          <strong class="wk-example-total">{fmt(example.total)} JOD</strong> for the whole cohort.
        </p>
      </div>
    {/if}
  </section>

  <!-- ——————————————————————————— the form -->
  <section class="wk-section wk-form-section" id="wk-form">
    <div class="wk-head">
      <p class="wk-kicker"><span>—</span> Book a cohort</p>
      <h2 class="wk-h2">Pick your modules. See your price. Send it our way.</h2>
    </div>

    <div class="wk-form-grid">
      <div class="wk-form-main">
        <div class="wk-fields">
          <label>
            <span>Company name *</span>
            <input value={company} oninput={(e) => (company = e.target.value)} placeholder="e.g. Evora Future Home" />
          </label>
          <label>
            <span>Contact name *</span>
            <input value={contactName} oninput={(e) => (contactName = e.target.value)} placeholder="e.g. Rania Haddad" />
          </label>
          <label>
            <span>Work email *</span>
            <input
              type="email"
              value={email}
              oninput={(e) => (email = e.target.value)}
              onblur={() => (touched = true)}
              placeholder="you@company.com"
              aria-invalid={touched && email.trim().length <= 3}
            />
          </label>
          <label>
            <span>Phone</span>
            <input value={phone} oninput={(e) => (phone = e.target.value)} placeholder="+962 ..." />
          </label>
          <label>
            <span>Employees to train *</span>
            <input
              type="number" min="1" inputmode="numeric"
              value={seats} oninput={(e) => (seats = e.target.value)} placeholder="e.g. 12"
            />
          </label>
          <label>
            <span>Industry</span>
            <select value={industry} onchange={(e) => (industry = e.target.value)}>
              <option value="">Select one</option>
              {#each INDUSTRIES as i (i)}<option value={i}>{i}</option>{/each}
            </select>
          </label>
          <label>
            <span>Preferred start window</span>
            <select value={startWindow} onchange={(e) => (startWindow = e.target.value)}>
              <option value="">Not sure yet</option>
              {#each START_WINDOWS as w (w)}<option value={w}>{w}</option>{/each}
            </select>
          </label>
          <label class="wk-full">
            <span>Anything else we should know</span>
            <textarea
              rows="3" value={notes} oninput={(e) => (notes = e.target.value)}
              placeholder="Current tools, specific pain points, a department this is really for — anything that helps us shape the room."
            ></textarea>
          </label>
        </div>

        <!-- The soft floor: shown, never enforced. A 4-person company still
             gets a real form and a real price — it is just steered toward
             the cheaper route instead of a dedicated in-house cohort. -->
        {#if underRecommended}
          <p class="wk-note wk-note--info" role="status">
            Cohorts run best at {RECOMMENDED_MIN_SEATS}+ employees — enough
            in the room for the department exercises to actually work. At
            {seatsNum}, you’ll get the same modules either through our next
            open cohort (mixed companies, same curriculum) or a 1-on-1
            track. Send this anyway — we’ll tell you which fits better.
          </p>
        {/if}

        <div class="wk-picker">
          <div class="wk-picker-head">
            <p class="wk-picker-label">Choose your modules</p>
            <p class="wk-picker-count {belowMinModules ? 'is-under' : ''}">
              {selected.length} / {MAX_MODULES} selected — minimum {MIN_MODULES}
            </p>
          </div>
          <div class="wk-chips" role="group" aria-label="Workshop modules">
            {#each MODULES as m (m.id)}
              {@const on = selected.includes(m.id)}
              {@const disabled = !on && atMaxModules}
              <button
                type="button"
                class="wk-chip {on ? 'is-on' : ''} {disabled ? 'is-disabled' : ''}"
                aria-pressed={on}
                {disabled}
                onclick={() => toggleModule(m.id)}
              >
                <span class="wk-chip-title">{m.title}</span>
                <span class="wk-chip-hours">{m.hours}h</span>
              </button>
            {/each}
          </div>
          {#if belowMinModules}
            <p class="wk-note wk-note--warn">Pick at least {MIN_MODULES} modules to price a cohort.</p>
          {/if}
          {#if maxHit}
            <p class="wk-note wk-note--warn">
              Maximum {MAX_MODULES} modules per cohort — remove one to add a different one.
            </p>
          {/if}
        </div>
      </div>

      <!-- the live estimate — recomputes from the exact same estimate()
           the pricing table and the worked example use -->
      <aside class="wk-estimate" aria-live="polite">
        <p class="wk-estimate-kicker">Your estimate</p>
        {#if !est}
          <p class="wk-estimate-empty">
            Enter your employee count and pick at least {MIN_MODULES} modules to see a price.
          </p>
        {/if}
        {#if est && est.enterprise}
          <p class="wk-estimate-total">Enterprise tier</p>
          <p class="wk-estimate-sub">
            At {est.seats} employees this is a multi-cohort engagement —
            send the form and we’ll come back with a custom quote and schedule.
          </p>
        {/if}
        {#if est && !est.enterprise}
          <p class="wk-estimate-perseat">
            {fmt(est.discountedPerSeat)} <span>JOD / employee</span>
          </p>
          {#if est.tier.discount > 0}
            <p class="wk-estimate-tier">{Math.round(est.tier.discount * 100)}% {est.tier.label} discount applied</p>
          {/if}
          <div class="wk-estimate-line">
            <span>{fmt(est.discountedPerSeat)} JOD × {est.seats} employees</span>
          </div>
          <p class="wk-estimate-total">
            {fmt(est.total)} <span>JOD total</span>
          </p>
        {/if}

        <div class="wk-send">
          {#if canSubmit}
            <div class="magnetic" use:magnetic>
              <a class="wk-btn wk-btn--fill" href={waHref} target="_blank" rel="noreferrer">
                Send via WhatsApp
              </a>
            </div>
            <a class="wk-btn" href={mailHref}>Send as email</a>
          {:else}
            <button class="wk-btn wk-btn--fill" type="button" disabled aria-disabled="true">
              Send via WhatsApp
            </button>
            <button class="wk-btn" type="button" disabled aria-disabled="true">
              Send as email
            </button>
          {/if}
        </div>
        {#if !canSubmit}
          <p class="wk-note wk-note--muted">
            {belowMinModules
              ? `Pick at least ${MIN_MODULES} modules to enable sending.`
              : 'Fill in company, contact, work email and employee count to enable sending.'}
          </p>
        {/if}
      </aside>
    </div>
  </section>
</div>
