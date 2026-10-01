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
  ]

  const AR_PIXEL =
    'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

  let platform = $state('unknown')
  let feedback = $state('')
  let feedbackTimer

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

  function openAR(item) {
    if (platform === 'ios') {
      // Quick Look only intercepts a rel="ar" anchor whose only child is an image.
      const anchor = document.createElement('a')
      anchor.setAttribute('rel', 'ar')
      anchor.href = new URL(item.usdz, location.origin).href
      const image = document.createElement('img')
      image.src = AR_PIXEL
      image.alt = ''
      image.style.cssText = 'width:1px;height:1px;opacity:0'
      anchor.appendChild(image)
      anchor.style.cssText = 'position:absolute;left:-9999px'
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => anchor.remove(), 2000)
      return
    }

    if (platform === 'android') {
      const modelUrl = new URL(item.glb, location.origin).href
      location.href =
        'intent://arvr.google.com/scene-viewer/1.0?file=' +
        encodeURIComponent(modelUrl) +
        '&mode=ar_preferred&resizable=false&title=' +
        encodeURIComponent(item.arTitle) +
        '#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;' +
        'S.browser_fallback_url=' +
        encodeURIComponent(location.href) +
        ';end;'
      return
    }

    if (platform === 'ios-other') {
      announce('On iPhone and iPad, open this page in Safari to start AR.')
      return
    }

    announce('Open this page on iPhone or iPad Safari, or on an ARCore-ready Android phone, to use AR.')
  }

  onMount(() => {
    platform = detectPlatform()
  })
</script>

<svelte:head>
  <title>Za Neru — See it in your space</title>
  <meta
    name="description"
    content="Explore food and furniture in augmented reality. Choose a piece and see it in your own space."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="za-neru">
  <div class="zn-shell">
    <div class="zn-topbar">
      <a class="zn-topbar__brand" href="/" aria-label="LOOM Studio home">LOOM</a>
      <span class="zn-topbar__label">LOOM STUDIO / SPATIAL PREVIEW</span>
      <span class="zn-topbar__edition">ZA NERU <i aria-hidden="true">·</i> AR COLLECTION</span>
    </div>

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
      <div class="zn-intro__rule" aria-hidden="true"><span>01 — 04</span></div>
    </header>

    {#each groups as group}
      <section class="zn-group" aria-labelledby={`zn-${group.id}-title`}>
        <div class="zn-group__heading">
          <span class="zn-group__number">{group.number}</span>
          <h2 id={`zn-${group.id}-title`}>{group.title}</h2>
          <span class="zn-group__line" aria-hidden="true"></span>
          <span class="zn-group__count">{String(group.products.length).padStart(2, '0')} PIECES</span>
        </div>

        <div class="zn-grid">
          {#each group.products as item, index}
            <article class="zn-card">
              <div class="zn-card__image">
                <img
                  src={item.image}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  class:zn-card__photo--contain={item.fit === 'contain'}
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
                <button
                  class="zn-ar-button"
                  type="button"
                  onclick={() => openAR(item)}
                  aria-label={`View ${item.title} in augmented reality`}
                >
                  <span>VIEW IN AR</span>
                  <span class="zn-ar-button__icon" aria-hidden="true">↗</span>
                </button>
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
  </div>
</div>
