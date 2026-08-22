<!--
  /diaaz — Diaaz's own "Kreiraj svoj sto" page, with a configurator that works.

  WHAT THIS IS. https://diaaz.ba/kreiraj-svoj-sto/ is a long WordPress form:
  eight questions answered with thumbnails, and at the end a request for a
  quote. The customer never sees the table they just described. This page is
  that page — their chrome, their wording, their order of questions, their own
  option photography — with the form wired to a live 3D table instead of a
  static list of pictures. Every choice on the right redraws the table on the
  left, and the quote that leaves at the end is the exact configuration on
  screen.

  It is a LOOM concept for Diaaz and is labelled as one: the ribbon above the
  page says so and links to their original. Same rule the /bbsimon pitch pages
  follow — reproducing a client's page to show what it could do is only honest
  while it is signed and while nothing on it pretends to transact. The "Pošalji
  upit" button opens a mail draft to Diaaz's own address; it does not post to
  their site, take payment, or claim to have booked anything.

  HOW THE 3D IS DRIVEN. The configurator is the same build /configurator ships
  (static/loom-table.html) in an iframe, loaded with ?legs=1&panel=0&bridge=1:
  legs on, its own bottom panel hidden, postMessage bridge open. The rail here
  sends {type:'set', group, id} and the frame answers with the group/variant
  list the model really has. Nothing about the 3D build was forked for this
  page — see static/diaaz-legs/boot.js.

  WHY THE RAIL IS THE PAGE'S OWN UI AND NOT THE EMBED'S PANEL. The embed's
  panel is a strip of swatches across the bottom of the frame, sized for five
  groups of three. Diaaz asks eight questions, one of them with thirty answers,
  and three of them the 3D cannot draw at all. That does not fit a strip, and
  it should not: on their page these are form fields, so here they are a form —
  down the right, in their order, with the table always in view beside them.
-->
<script>
  import { onMount, onDestroy } from 'svelte'
  import { SECTIONS, DIMENSIONS, NAV, CONTACT } from './options.js'
  import './diaaz.css'

  const FRAME = '/loom-table.html?legs=1&panel=0&bridge=1'

  // What the customer has chosen, keyed by section. Seeded with each section's
  // first option, which is also what the model opens on.
  let choice = $state(
    Object.fromEntries(SECTIONS.map((s) => [s.key, s.initial || s.options[0].id]))
  )
  let dims = $state(Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.value])))

  // Variants the model actually reports, per group. Until the frame answers,
  // every option is offered; after that, anything the model does not have is
  // dropped rather than left as a chip that does nothing. See `usable`.
  let live = $state(null)
  let ready = $state(false)
  let frameEl
  let stageEl
  let contact = $state({ name: '', email: '', phone: '', note: '' })

  /*
    THE FRAME IS RENDERED BIG AND SCALED DOWN, and that is not a cosmetic
    choice. The configurator composes its shot against its OWN viewport: the
    camera dollies in across the scroll of a section that is one viewport tall,
    and the landing script stops when the option panel reaches the bottom edge.
    Drop that viewport to the ~590px this column leaves and the camera never
    finishes its approach — the table stays small, hazy and far away, exactly
    the frame the build is designed never to show anyone.

    So the iframe is given the viewport it was tuned for and scaled to fit the
    column. The stage's height follows from the same scale, so the box is
    always the frame's true aspect with no letterboxing, and rendering at
    1440 and displaying at ~960 supersamples the 3D into the bargain.

    Portrait below 1180px, where the stage is a wide short band above the rail
    and a landscape frame would scale down to a postage stamp.
  */
  /* 1440x700 is the /configurator window this build's framing was composed
     in — roughly 2:1. The camera's framing follows the viewport's ASPECT, so a
     squarer box (1440x900 was tried) puts the table high in frame with a floor
     under it; matching the aspect reproduces the shot exactly. */
  const DESIGN = { wide: [1440, 760], narrow: [900, 1100] }

  /* THE PAGE SCROLLS THROUGH THE QUESTIONS, and the table does not move while
     it does. The stage is sticky and nearly a full screen tall; the ten
     questions run past it on the right. A one-question-at-a-time stepper was
     tried and rejected — scrolling is how their customers read the original
     page, so what this had to be was a nicer scroll, not a different
     interaction: the scroll is tracked (see `active`), and the stage carries a
     caption and a progress bar that follow it. */

  /*
    ...and then punched in. The build frames the table for a full browser
    window, where it sits small and centred with a lot of room around it. In a
    column beside a form that reads as a photograph of a table across a hall.
    ZOOM crops into the frame — the vignette at its edges goes with the crop —
    and the offsets keep the table's own centre in the middle of the box.
    Cropping rather than moving the camera is what keeps this page from forking
    the 3D build: the frame is untouched, we just look at less of it.
  */
  const ZOOM = 1.0
  const FOCUS = [0.5, 0.44] // where the table sits inside the frame

  let scale = $state(1)
  let design = $state(DESIGN.wide)
  let offset = $state([0, 0])

  /* The stage's height now comes from the layout (it fills the workspace), so
     the frame is COVER-fitted into it rather than sized off the width. */
  function fit() {
    if (!stageEl) return
    design = window.innerWidth <= 1180 ? DESIGN.narrow : DESIGN.wide
    const w = stageEl.clientWidth
    const h = stageEl.clientHeight
    if (!w || !h) return
    const base = Math.max(w / design[0], h / design[1])
    scale = base * ZOOM
    offset = [
      Math.round(w / 2 - design[0] * scale * FOCUS[0]),
      Math.round(h / 2 - design[1] * scale * FOCUS[1]),
    ]
  }

  /* The dimensions question is Diaaz's sixth, and it is a row of number
     inputs rather than chips, so it is rendered inline after the resin
     section instead of living in SECTIONS. Everything after it therefore
     carries a number one higher than its index — computed here so that adding
     or moving a question can never leave two steps both called "06". */
  const DIMS_AT = SECTIONS.findIndex((s) => s.key === 'resin') + 1

  /* The ten steps, in Diaaz's order: their eight questions with the dimensions
     row slotted into sixth place where their form asks for it, and the quote
     as the last panel. Built from SECTIONS so a question can be added or moved
     in options.js without renumbering anything by hand. */
  const STEPS = [
    ...SECTIONS.slice(0, DIMS_AT).map((s) => ({ kind: 'sec', section: s, title: s.title })),
    { kind: 'dims', title: 'Dimenzije stola', quoteOnly: true, note: 'Mjere po Vašoj želji — izrađujemo po mjeri.' },
    ...SECTIONS.slice(DIMS_AT).map((s) => ({ kind: 'sec', section: s, title: s.title })),
    { kind: 'quote', title: 'Vaši podaci', note: 'Provjerite konfiguraciju i pošaljite upit.' },
  ]

  const no = (i) => String(i + 1).padStart(2, '0')

  /* Which question the scroll is on: the one crossing the middle of the
     viewport. An IntersectionObserver squeezed to a 10%-tall band down the
     centre answers that without a scroll handler doing arithmetic on every
     frame. */
  let active = $state(0)
  let stepEls = $state([])

  /* What the customer has picked for a step, in their own words — shown under
     the step title and in the little rail of dots, so the panel never hides
     what has already been decided. */
  function chosen(s) {
    if (s.kind === 'sec') return choice[s.section.key]
    if (s.kind === 'dims') return `${dims.length} × ${dims.width} × ${dims.height} cm`
    return ''
  }


  function usable(section) {
    if (!section.group || !live) return section.options
    const have = live[section.group]
    if (!have) return section.options
    return section.options.filter((o) => have.includes(o.set))
  }

  function send(group, id) {
    frameEl?.contentWindow?.postMessage(
      { channel: 'diaaz-cfg', type: 'set', group, id },
      location.origin
    )
  }

  function pick(section, option) {
    choice[section.key] = option.id
    if (option.set && section.group) send(section.group, option.set)

    /* A resin colour on a solid top changes nothing you can see, because there
       is no pour to colour. Picking one moves the plate to epoxy — the choice
       the customer was clearly making — rather than leaving them tapping a
       swatch that appears to be broken. */
    if (section.needsEpoxy) {
      const plate = SECTIONS.find((s) => s.key === 'plate')
      const epoxy = plate.options.find((o) => o.set === 'Epoxy')
      if (epoxy && choice.plate !== epoxy.id) {
        choice.plate = epoxy.id
        send(plate.group, epoxy.set)
      }
    }
  }

  function onMessage(e) {
    if (e.origin !== location.origin) return
    const d = e.data
    if (!d || d.channel !== 'diaaz-cfg') return
    if (d.type === 'ready') {
      live = Object.fromEntries(d.groups.map((g) => [g.group, g.options]))
      ready = true
      // Push the rail's own opening state into the model, so the two agree
      // from the first frame even where a default differs.
      for (const section of SECTIONS) {
        if (!section.group) continue
        const option = section.options.find((o) => o.id === choice[section.key])
        if (option?.set) send(section.group, option.set)
      }
    }
  }

  let ro
  let spy
  onMount(() => {
    window.addEventListener('message', onMessage)
    fit()
    window.addEventListener('resize', fit)

    spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = stepEls.indexOf(e.target)
          if (i >= 0) active = i
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    for (const el of stepEls) if (el) spy.observe(el)

    /* The stage is sized by the layout now, and a viewport resize is not the
       only thing that changes it (dynamic toolbars, a font landing). Watch the
       box itself. */
    ro = new ResizeObserver(fit)
    if (stageEl) ro.observe(stageEl)
  })
  onDestroy(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('message', onMessage)
    window.removeEventListener('resize', fit)
    ro?.disconnect()
    spy?.disconnect()
  })

  // ── the quote ────────────────────────────────────────────────────────────
  const summary = $derived(
    SECTIONS.map((s) => `${s.title}: ${choice[s.key]}`).concat(
      `Dimenzije: ${dims.length} x ${dims.width} x ${dims.height} cm`
    )
  )

  const mailto = $derived(
    'mailto:' +
      CONTACT.email +
      '?subject=' +
      encodeURIComponent('Upit za ponudu — konfigurator stola') +
      '&body=' +
      encodeURIComponent(
        ['Poštovani,', '', 'Želim ponudu za sljedeći stol:', '']
          .concat(summary.map((line) => '· ' + line))
          .concat([
            '',
            contact.note ? 'Napomena: ' + contact.note : '',
            '',
            contact.name ? 'Ime: ' + contact.name : '',
            contact.email ? 'E-mail: ' + contact.email : '',
            contact.phone ? 'Telefon: ' + contact.phone : '',
          ])
          .filter(Boolean)
          .join('\n')
      )
  )

  const DESC =
    'Kreirajte svoj vlastiti stol po svojim željama i mjerama — uživo u 3D, ' +
    'sa svim Diaaz oblicima ploče, vrstama drveta, bojama smole i cijelim katalogom nogu.'
</script>

<svelte:head>
  <title>Konfigurator stola — Diaaz</title>
  <meta name="description" content={DESC} />
  <!-- A concept page for one client, handed over by link. -->
  <meta name="robots" content="noindex, nofollow" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600;700&family=Kumbh+Sans:wght@400;500;600&display=swap"
  />
</svelte:head>

<!-- Whose concept this is, and that nothing here transacts. -->
<div class="dz-ribbon">
  <span class="dz-ribbon__mark">LOOM</span>
  <span class="dz-ribbon__text">
    Koncept za Diaaz — njihova stranica „Kreiraj svoj sto“ sa konfiguratorom koji radi uživo.
    Ništa se ovdje ne naplaćuje.
  </span>
  <a class="dz-ribbon__link" href={CONTACT.source} target="_blank" rel="noopener noreferrer">
    Originalna stranica ↗
  </a>
</div>

<div class="dz">
  <!-- ── their chrome ──────────────────────────────────────────────────── -->
  <div class="dz-topbar">
    <div class="dz-topbar__in">
      <span class="dz-topbar__social" aria-hidden="true">
        {#each ['facebook', 'instagram', 'youtube', 'pinterest', 'tiktok'] as icon}
          <span class="dz-topbar__dot" data-icon={icon}></span>
        {/each}
      </span>
      <span class="dz-topbar__contact">
        <a href="mailto:{CONTACT.email}">{CONTACT.email}</a>
        <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
      </span>
    </div>
  </div>

  <header class="dz-head">
    <div class="dz-head__in">
      <a class="dz-head__logo" href="https://diaaz.ba/" target="_blank" rel="noopener noreferrer">
        <img src="/diaaz-assets/diaaz-logo.svg" alt="Diaaz — handmade wood table" width="250" height="59" />
      </a>
      <nav class="dz-nav" aria-label="Diaaz">
        {#each NAV as item}
          <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
        {/each}
      </nav>
      <span class="dz-head__cta" aria-current="page">Konfigurator stola</span>
    </div>
  </header>

  <!-- ── their words, in one band ──────────────────────────────────────── -->
  <section class="dz-hero">
    <div class="dz-hero__in">
      <h1>Kreirajte svoj vlastiti stol po svojim željama i mjerama.</h1>
      <p class="dz-hero__lead">
        Nudimo Vam mogućnost online konfiguracije svih detalja stola. Sada i uživo u 3D — svaki
        odabir odmah mijenja stol pored Vas, a na kraju Vam kreiramo detaljnu
        <strong>ponudu</strong>.
      </p>
    </div>
  </section>

  <!-- ── the configurator ──────────────────────────────────────────────── -->
  <div class="dz-work">
    <div class="dz-stage">
      <div class="dz-stage__frame" bind:this={stageEl}>
        <iframe
          bind:this={frameEl}
          title="Diaaz konfigurator stola — 3D"
          src={FRAME}
          loading="eager"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          style="width:{design[0]}px;height:{design[1]}px;transform:translate({offset[0]}px,{offset[1]}px) scale({scale})"
        ></iframe>
        {#if !ready}
          <div class="dz-stage__wait"><span></span>Učitavanje 3D stola…</div>
        {/if}

        <!-- The stage says which question the scroll is on and what is
             currently answered, so the table is never a picture you have lost
             the caption to. -->
        <div class="dz-now">
          <span class="dz-now__no">{no(active)}</span>
          <span class="dz-now__t">
            <em>{STEPS[active].title}</em>
            {#if chosen(STEPS[active])}<b>{chosen(STEPS[active])}</b>{/if}
          </span>
        </div>

        <p class="dz-stage__hint">Povucite za rotaciju · skrolajte za zumiranje</p>

        <div class="dz-stage__bar" aria-hidden="true">
          <span style="width:{((active + 1) / STEPS.length) * 100}%"></span>
        </div>
      </div>
    </div>

    <form class="dz-rail" onsubmit={(e) => e.preventDefault()}>
      {#each STEPS as s, i}
        <fieldset
          class="dz-sec"
          class:dz-sec--on={active === i}
          class:dz-sec--quote={s.kind === 'quote'}
          bind:this={stepEls[i]}
        >
          <legend>
            <span class="dz-sec__no">{no(i)}</span>
            <span class="dz-sec__title">{s.title}</span>
            {#if s.quoteOnly || s.section?.quoteOnly}
              <span class="dz-sec__tag" title="Ide na ponudu — 3D prikaz ostaje isti">za ponudu</span>
            {/if}
          </legend>

          {#if s.kind === 'sec'}
            {#if s.section.note}<p class="dz-sec__note">{s.section.note}</p>{/if}
            <div class="dz-chips" class:dz-chips--wide={s.section.key === 'legs'}>
              {#each usable(s.section) as option}
                <button
                  type="button"
                  class="dz-chip"
                  class:dz-chip--on={choice[s.section.key] === option.id}
                  onclick={() => pick(s.section, option)}
                  aria-pressed={choice[s.section.key] === option.id}
                >
                  {#if option.img || option.swatch}
                    <span
                      class="dz-chip__art"
                      style={option.img
                        ? `background-image:url(${option.img})`
                        : `background:${option.swatch}`}
                      class:dz-chip__art--img={!!option.img}
                    ></span>
                  {/if}
                  <span class="dz-chip__label">{option.id}</span>
                </button>
              {/each}
            </div>
          {:else if s.kind === 'dims'}
            <p class="dz-sec__note">{s.note}</p>
            <div class="dz-dims">
              {#each DIMENSIONS as d}
                <label class="dz-dim">
                  <span>{d.label}</span>
                  <input type="number" min={d.min} max={d.max} bind:value={dims[d.key]} />
                  <em>{d.unit}</em>
                </label>
              {/each}
            </div>
          {:else}
            <p class="dz-sec__note">{s.note}</p>
            <ul class="dz-summary">
              {#each summary as line}
                <li>{line}</li>
              {/each}
            </ul>
            <div class="dz-fields">
              <label><span>Ime i prezime</span><input type="text" bind:value={contact.name} /></label>
              <label><span>E-mail</span><input type="email" bind:value={contact.email} /></label>
              <label><span>Telefon</span><input type="tel" bind:value={contact.phone} /></label>
              <label class="dz-fields__wide">
                <span>Napomena</span>
                <textarea rows="2" bind:value={contact.note}></textarea>
              </label>
            </div>
            <div class="dz-actions">
              <a class="dz-btn" href={mailto}>Pošaljite upit za ponudu</a>
              <a class="dz-btn dz-btn--ghost" href={CONTACT.phoneHref}>{CONTACT.phone}</a>
            </div>
            <p class="dz-actions__note">
              Otvara se e-mail sa Vašom konfiguracijom pripremljenom za slanje na {CONTACT.email}.
            </p>
          {/if}
        </fieldset>
      {/each}
    </form>
  </div>

  <footer class="dz-foot">
    <img src="/diaaz-assets/diaaz-logo.svg" alt="Diaaz" width="180" height="43" />
    <p>
      100% ručna izrada. Proizvod od punog drveta i epoxy smole. ·
      <a href="mailto:{CONTACT.email}">{CONTACT.email}</a> ·
      <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
    </p>
    <p class="dz-foot__by">
      Konfigurator: <a href="https://www.loomstudio-jo.com" target="_blank" rel="noopener noreferrer">LOOM</a>
    </p>
  </footer>
</div>
