<script>
  import { onMount } from 'svelte'
  import './za-neru.css'

  const groups = [
    {
      id: 'table',
      number: '01',
      title: 'From the table',
      products: [
        {
          title: 'Cevapi platter',
          note: 'A closer look at a local favorite',
          image: '/img/za-neru/cevapi.webp',
          alt: 'Grilled cevapi with flatbread and chopped onion on a metal tray',
          glb: '/models/za-neru/cevapi.glb',
          usdz: '/models/za-neru/cevapi.usdz',
          arTitle: 'Cevapi platter',
          width: 480,
          height: 480,
        },
        {
          title: 'Margherita pizza',
          note: 'Fresh from the oven',
          image: '/img/za-neru/pizza.webp',
          alt: 'Tomato, basil and melted cheese pizza',
          glb: '/models/za-neru/pizza.glb',
          usdz: '/models/za-neru/pizza.usdz',
          arTitle: 'Margherita pizza',
          width: 738,
          height: 369,
          fit: 'contain',
        },
      ],
    },
    {
      id: 'home',
      number: '02',
      title: 'At home',
      products: [
        {
          title: 'Ornate blue armchair',
          note: 'A little old-world character',
          image: '/img/za-neru/blue-armchair.webp',
          alt: 'Blue tufted armchair with carved gold trim in a classic interior',
          glb: '/models/za-neru/blue-armchair.glb',
          usdz: '/models/za-neru/blue-armchair.usdz',
          arTitle: 'Ornate blue armchair',
          width: 387,
          height: 516,
          fit: 'contain',
        },
        {
          title: 'Green tufted sofa',
          note: 'A soft statement for the room',
          image: '/img/za-neru/green-sofa.webp',
          alt: 'Rounded emerald green tufted sofa in a bright living room',
          glb: '/models/za-neru/green-sofa.glb',
          usdz: '/models/za-neru/green-sofa.usdz',
          arTitle: 'Green tufted sofa',
          width: 1024,
          height: 894,
        },
      ],
    },
    {
      id: 'wear',
      number: '03',
      title: 'On you',
      products: [
        {
          title: 'Pavé screen sunglasses',
          note: 'Blue crystal pavé, made to stand out',
          image: '/img/za-neru/pave-sunglasses.webp?v=pave-blue-1',
          alt: 'Blue pavé sunglasses with dark lenses, shown at a three-quarter angle',
          tryOnModel: '/assets/pave-screen-sunglasses-blue.glb',
          arTitle: 'Pavé Blue',
          width: 1440,
          height: 810,
          fit: 'contain',
          blend: 'natural',
          tryOn: true,
        },
      ],
    },
  ]

  let platform = $state('unknown')
  let feedback = $state('')
  let activeTryOn = $state(null)
  let feedbackTimer
  let previousBodyOverflow = ''

  function detectPlatform() {
    const ua = navigator.userAgent
    if (/Android/i.test(ua)) return 'android'

    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!isIOS) return 'desktop'

    const isSafari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua)
    return isSafari ? 'ios' : 'ios-other'
  }

  function announce(message) {
    feedback = message
    clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => (feedback = ''), 4200)
  }

  function sceneViewerIntent(item) {
    const modelUrl = new URL(item.glb, location.origin).href
    return (
      'intent://arvr.google.com/scene-viewer/1.0?file=' +
      encodeURIComponent(modelUrl) +
      '&mode=ar_only&resizable=true&title=' +
      encodeURIComponent(item.arTitle) +
      '#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;' +
      'S.browser_fallback_url=' +
      encodeURIComponent(location.href) +
      ';end;'
    )
  }

  function launchAR(item) {
    if (platform === 'ios') {
      const quickLookUrl = new URL(item.usdz, location.origin)
      quickLookUrl.hash = 'allowsContentScaling=1'

      const anchor = document.createElement('a')
      // SvelteKit otherwise intercepts this same-origin USDZ click as a route
      // navigation, which makes iOS open it as a regular 3D file instead of AR.
      anchor.setAttribute('rel', 'ar external')
      anchor.href = quickLookUrl.href

      const image = document.createElement('img')
      image.src = new URL(item.image, location.origin).href
      image.alt = item.alt
      anchor.appendChild(image)
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => anchor.remove(), 600)
      return
    }

    if (platform === 'ios-other') {
      announce('On iPhone and iPad, open this page in Safari to start AR.')
      return
    }

    announce('Open this page on iPhone or iPad Safari, or on an ARCore-ready Android phone, to use AR.')
  }

  function openTryOn(item) {
    const tryOnUrl = new URL('https://tryon-glasses-2026.web.app/ar')
    tryOnUrl.searchParams.set('embed', '1')
    tryOnUrl.searchParams.set('model', item.tryOnModel)
    tryOnUrl.searchParams.set('name', item.arTitle)
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    activeTryOn = { ...item, src: tryOnUrl.href }
  }

  function closeTryOn() {
    activeTryOn = null
    document.body.style.overflow = previousBodyOverflow
  }

  function portalToBody(node) {
    document.body.appendChild(node)
    return { destroy: () => node.remove() }
  }

  onMount(() => {
    platform = detectPlatform()
  })
</script>

<svelte:head>
  <title>Za Neru — See it in your space</title>
  <meta
    name="description"
    content="Explore food, furniture and accessories in augmented reality. Choose a piece and see it in your own space."
  />
</svelte:head>

<div class="za-neru">
  <div class="zn-shell">
    <header class="zn-intro">
      <div class="zn-intro__lead">
        <p class="zn-eyebrow"><span class="zn-eyebrow__dot"></span> LOOM STUDIO · SPATIAL PREVIEW</p>
        <h1>Za Neru<span class="zn-intro__period">.</span></h1>
      </div>
      <div class="zn-intro__aside">
        <p class="zn-intro__title">See it in your space.</p>
        <p class="zn-intro__copy">
          Explore a small collection, from the table to the living room. Choose a piece and tap
          <strong>View in AR</strong> to place it around you.
        </p>
        <span class="zn-scroll-note"><span>SCROLL TO EXPLORE</span><i aria-hidden="true">↓</i></span>
      </div>
      <div class="zn-intro__rule" aria-hidden="true"><span>01 — 05</span></div>
    </header>

    {#each groups as group}
      <section class="zn-group" aria-labelledby={`zn-${group.id}-title`}>
        <div class="zn-group__heading">
          <span class="zn-group__number">{group.number}</span>
          <h2 id={`zn-${group.id}-title`}>{group.title}</h2>
          <span class="zn-group__line" aria-hidden="true"></span>
          <span class="zn-group__count">{String(group.products.length).padStart(2, '0')} PIECES</span>
        </div>

        <div class="zn-grid" class:zn-grid--single={group.products.length === 1}>
          {#each group.products as item, index}
            <article class="zn-card">
              <div class="zn-card__image">
                <img
                  src={item.image}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  class:zn-card__photo--contain={item.fit === 'contain'}
                  class:zn-card__photo--natural={item.blend === 'natural'}
                  loading={index === 0 && group.id === 'table' ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <span class="zn-card__index">{group.number} / 0{index + 1}</span>
              </div>
              <div class="zn-card__body">
                <div class="zn-card__title-row">
                  <h3>{item.title}</h3>
                  <span class="zn-card__note">{item.note}</span>
                </div>
                {#if item.tryOn}
                  <button
                    class="zn-ar-button"
                    type="button"
                    onclick={() => openTryOn(item)}
                    aria-label={`Try on ${item.title} with live face tracking`}
                  >
                    <span>TRY ON IN AR</span>
                    <span class="zn-ar-button__icon" aria-hidden="true">↗</span>
                  </button>
                {:else if platform === 'android'}
                  <a
                    class="zn-ar-button zn-ar-button--scene"
                    href={sceneViewerIntent(item)}
                    aria-label={`View ${item.title} in augmented reality`}
                  >
                    <span>VIEW IN AR</span>
                    <span class="zn-ar-button__icon" aria-hidden="true">↗</span>
                  </a>
                {:else}
                  <button
                    class="zn-ar-button"
                    type="button"
                    onclick={() => launchAR(item)}
                    aria-label={`View ${item.title} in augmented reality`}
                    disabled={platform === 'unknown'}
                  >
                    <span>VIEW IN AR</span>
                    <span class="zn-ar-button__icon" aria-hidden="true">↗</span>
                  </button>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}

    <aside class="zn-footnote">
      <span class="zn-footnote__mark" aria-hidden="true">✳</span>
      <p>AR sizing is illustrative. Final product dimensions may vary.</p>
      <span class="zn-footnote__credit">A LOOM STUDIO EXPERIENCE</span>
    </aside>

    {#if feedback}
      <p class="zn-feedback" role="status" aria-live="polite">{feedback}</p>
    {/if}

    {#if activeTryOn}
      <div class="zn-tryon-overlay" use:portalToBody>
        <div class="zn-tryon-overlay__shade" aria-hidden="true"></div>
        <section
          class="zn-tryon-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`Live try-on for ${activeTryOn.title}`}
        >
          <header class="zn-tryon-dialog__bar">
            <span>LIVE SUNGLASSES TRY-ON</span>
            <button type="button" onclick={closeTryOn} aria-label="Close try-on">×</button>
          </header>
          <iframe
            src={activeTryOn.src}
            title={`Live face-tracking try-on for ${activeTryOn.title}`}
            allow="camera; autoplay; fullscreen"
            allowfullscreen
          ></iframe>
        </section>
      </div>
    {/if}
  </div>
</div>
