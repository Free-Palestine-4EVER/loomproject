<!--
  BBSimonProduct — one B.B. Simon product page, rebuilt with a 3D preview and
  an in-room AR try-on. Driven entirely by an entry from $data/bbsimon.js, so
  /bbsimon1 and /bbsimon2 are the same component twice and a fix to either is a
  fix to both.

  WHY THE PAGE LOOKS LIKE THEIR SHOP AND NOT LIKE OURS
  ----------------------------------------------------
  This is a sales artefact: it has to read, on first glance, as B.B. Simon's own
  product page with something new in it — not as a LOOM page that happens to
  mention them. So the whole LOOM shell (nav, footer, loader, butterfly, the
  floating WhatsApp bubble) is switched off for these two routes in
  +layout.svelte, and the chrome here is a restrained copy of their store's.

  It is still labelled. A ribbon across the top says whose concept it is and
  that nothing transacts, and the bottom of the page is openly ours. A demo that
  hides who made it is worthless the moment someone forwards the link.

  WHAT IS AND IS NOT REAL
  -----------------------
  Real, read off their live pages on 2026-08-18: titles, SKUs, prices, stock
  counts, the attribute table, the related rails, the photography.
  Ours: the descriptive copy, the 3D models, the whole media stage.
  Inert on purpose: search, cart, wishlist, quantity, "add to cart", and every
  nav label. They are rendered because the clone would look wrong without them,
  and they are marked `data-inert` and disabled rather than wired to a dead
  href — a pitch that 404s on a click has made the wrong point.

  THE MODELS
  ----------
  Generated from their product photography, then scaled so AR is honest — see
  the long note in $data/bbsimon.js about `ar.heightM`, and the disclosure that
  renders next to the AR button. The GLB is meshopt + WebP for the web viewer;
  the USDZ is a separate, harder-simplified build because Quick Look downloads
  the whole file over cellular before it shows anything.

  <model-viewer> is loaded from /vendor/model-viewer.min.js — the standalone
  bundle, which carries its own three.js inside it. That is deliberate: this
  repo pins three 0.171 for the /configurator build, model-viewer 4.x wants
  three ^0.183, and no pitch page is worth putting a version bump under a
  shipped configurator. Self-hosted rather than CDN so the demo still works on
  a hotel wifi that blocks unpkg.
-->
<script>
  import { onMount } from 'svelte'
  import { BB_NAV } from '$data/bbsimon.js'
  import './bbsimon.css'

  let { product } = $props()

  /* The stage shows either a photograph or the model, never both. `view` is
     'photo' | 'model'; `photoIndex` survives a trip through the 3D view so
     coming back does not reset the gallery to the first shot. */
  let view = $state('photo')
  let photoIndex = $state(0)

  let viewerReady = $state(false) // custom element defined
  let canAR = $state(false) // this device can actually place the model
  let arChecked = $state(false) // …and we have asked, so the QR can appear
  let viewer = $state(null)

  const m = $derived(product.model)

  /* Load the element once per document. Two of these pages could in principle
     be open in one SPA session, and defining a custom element twice throws. */
  onMount(() => {
    const SRC = '/vendor/model-viewer.min.js'

    const ready = () => {
      customElements.whenDefined('model-viewer').then((El) => {
        /* THE MESHOPT DECODER, WHICH IS NOT OPTIONAL.

           Both GLBs are meshopt-compressed — it is what takes the table from
           159 MB to 6.6 MB, so it is not something to give up. But the
           standalone model-viewer bundle ships WITHOUT a meshopt decoder, and
           three's GLTFLoader does not fail softly when it meets one: it throws
           "setMeshoptDecoder must be called before loading compressed files"
           and the viewer sits on its poster forever, looking exactly like a
           slow network. The page appears to work. It shows a photograph.

           model-viewer's default decoder location is a CDN URL, which would
           put the one feature this pitch exists to show behind someone else's
           uptime and behind whatever wifi the meeting is on. So the decoder is
           self-hosted next to the bundle and pointed at here.

           IT MUST BE THE UMD BUILD, NOT THE ES MODULE. model-viewer loads this
           by injecting a plain <script> tag — no type="module" — and then
           reading a `MeshoptDecoder` global. Handed meshoptimizer's .mjs, the
           browser throws "Unexpected token 'export'", the script's load event
           fires anyway, and the failure surfaces later and somewhere else. So
           this is meshopt_decoder.cjs, whose UMD tail assigns the global when
           there is no module system, copied in as .js so it is served with a
           JavaScript MIME type.

           This MUST happen before the element gets a src — hence setting it
           before `viewerReady` lets the element render at all. */
        El.meshoptDecoderLocation = '/vendor/meshopt_decoder.js'
        viewerReady = true

        // canActivateAR settles asynchronously — it depends on the UA, the
        // WebXR session check and, on iOS, on Quick Look being available. Read
        // it after the element upgrades, not before.
        queueMicrotask(() => {
          canAR = !!viewer?.canActivateAR
          arChecked = true
        })
      })
    }

    if (customElements.get('model-viewer')) {
      ready()
      return
    }
    let tag = document.querySelector(`script[data-mv]`)
    if (!tag) {
      tag = document.createElement('script')
      tag.type = 'module'
      tag.src = SRC
      tag.dataset.mv = ''
      document.head.appendChild(tag)
    }
    tag.addEventListener('load', ready, { once: true })
    // If the bundle fails outright, say so rather than leaving a dead frame.
    tag.addEventListener('error', () => { arChecked = true }, { once: true })
  })

  function showModel() {
    view = 'model'
    // reveal="manual" — nothing has been downloaded until this call. See the
    // note on the element itself.
    viewer?.dismissPoster?.()
  }
  function showPhoto(i) {
    photoIndex = i
    view = 'photo'
  }
  /* The AR button lives in model-viewer's own `ar-button` slot, so the element
     handles activation itself. This is only for the duplicate CTA in the buy
     column, which is outside the element. */
  function activateAR() {
    if (view !== 'model') view = 'model'
    viewer?.activateAR?.()
  }
</script>

<!-- Who made this, and that it does not sell anything. -->
<div class="bbs-ribbon">
  <span class="bbs-ribbon__mark">LOOM</span>
  <span class="bbs-ribbon__text">
    Concept for B.B. Simon — a live 3D preview and in-room AR on an existing product page.
    Nothing here transacts.
  </span>
  <a class="bbs-ribbon__link" href={product.source} target="_blank" rel="noopener noreferrer">
    Original page ↗
  </a>
</div>

<div class="bbs">
  <!-- ── their store chrome, reproduced ─────────────────────────────────── -->
  <header class="bbs-head">
    <div class="bbs-head__bar">
      <img class="bbs-head__logo" src="/img/bbsimon/bbsimon-logo.png" alt="B.B. Simon" />
      <div class="bbs-head__search" data-inert>
        <input type="text" placeholder="Search" disabled aria-label="Search (inactive in this demo)" />
      </div>
      <div class="bbs-head__icons" data-inert aria-hidden="true">
        <span>Account</span><span>Wishlist</span><span>Cart (0)</span>
      </div>
    </div>
    <nav class="bbs-head__nav" aria-label="Store categories (inactive in this demo)">
      {#each BB_NAV as item}
        <span class="bbs-head__navitem" data-inert>{item}</span>
      {/each}
    </nav>
  </header>

  <div class="bbs-crumb">
    {#each product.breadcrumb as crumb}
      <span>{crumb}</span><span class="bbs-crumb__sep">/</span>
    {/each}
    <span class="bbs-crumb__here">{product.title}</span>
  </div>

  <!-- ── the product itself ─────────────────────────────────────────────── -->
  <div class="bbs-product">
    <!-- media stage -->
    <div class="bbs-media">
      <div class="bbs-stage" class:bbs-stage--model={view === 'model'}>
        {#if view === 'photo'}
          <img
            class="bbs-stage__img"
            src={product.images[photoIndex].src}
            alt={product.images[photoIndex].alt}
            width="600"
            height="600"
          />
        {/if}

        <!--
          THE VIEWER IS MOUNTED FOR THE WHOLE PAGE, NOT ONLY IN 3D MODE.

          Two things depend on it being in the DOM early. `canActivateAR` is a
          property of the upgraded element, so probing it before the element
          exists returns false — which on a PHONE would disable the AR button
          on exactly the device that can do AR, and show the desktop QR
          fallback instead. And Quick Look needs the `ios-src` in the document.

          Mounted is not loaded. `reveal="manual"` means not one byte of the
          6.6 MB GLB is fetched until showModel() calls dismissPoster(), so a
          visitor who never opens the 3D view pays nothing for it. It is hidden
          with visibility rather than `display: none` so the element keeps a
          real size and does not have to re-measure its canvas on reveal.
        -->
        {#if viewerReady}
          <!-- svelte-ignore element_invalid_self_closing_tag -->
          <model-viewer
            bind:this={viewer}
            class="bbs-stage__viewer"
            class:is-hidden={view !== 'model'}
            reveal="manual"
            src={m.glb}
            ios-src={m.usdz}
            poster={m.poster}
            alt={m.alt}
            camera-controls
            touch-action="pan-y"
            interaction-prompt="auto"
            auto-rotate
            auto-rotate-delay="2200"
            rotation-per-second="14deg"
            camera-orbit={m.cameraOrbit}
            field-of-view={m.fieldOfView}
            min-field-of-view="12deg"
            max-field-of-view="45deg"
            environment-image="neutral"
            shadow-intensity="1.1"
            shadow-softness="0.9"
            exposure="1.05"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-placement={product.ar.placement}
            ar-scale="fixed"
          >
            <button class="bbs-ar-btn" slot="ar-button">
              <span class="bbs-ar-btn__icon" aria-hidden="true">◈</span>
              Try it in your home
            </button>
            <div class="bbs-stage__progress" slot="progress-bar"></div>
          </model-viewer>
        {:else if view === 'model'}
          <!-- Only while the bundle itself is still in flight, and only once
               the visitor has actually asked for 3D. -->
          <div class="bbs-stage__loading">Loading the 3D view…</div>
        {/if}

        <!-- Which mode the stage is in, and the way back out of 3D. -->
        {#if view === 'model'}
          <button class="bbs-stage__exit" onclick={() => showPhoto(photoIndex)}>
            ← Photos
          </button>
          <span class="bbs-stage__hint">Drag to rotate · scroll to zoom</span>
        {/if}
      </div>

      <!-- thumbnails: the photographs, then the model -->
      <div class="bbs-thumbs">
        {#each product.images as img, i}
          <button
            class="bbs-thumb"
            class:is-active={view === 'photo' && photoIndex === i}
            onclick={() => showPhoto(i)}
            aria-label={`View ${img.alt}`}
          >
            <img src={img.src} alt="" width="100" height="100" loading="lazy" />
          </button>
        {/each}
        <button
          class="bbs-thumb bbs-thumb--3d"
          class:is-active={view === 'model'}
          onclick={showModel}
          aria-label="View the interactive 3D model"
        >
          <img src={m.poster} alt="" width="100" height="100" loading="lazy" />
          <span class="bbs-thumb__badge">3D</span>
        </button>
      </div>
    </div>

    <!-- buy column -->
    <div class="bbs-buy">
      <h1 class="bbs-buy__title">{product.title}</h1>
      <div class="bbs-buy__price">{product.price}</div>
      <p class="bbs-buy__blurb">{product.blurb}</p>

      <dl class="bbs-buy__meta">
        <dt>SKU</dt><dd>{product.sku}</dd>
        <dt>Availability</dt><dd>{product.stock}</dd>
      </dl>

      <!-- The two things this page exists to demonstrate. -->
      <div class="bbs-cta">
        <button class="bbs-cta__3d" onclick={showModel}>
          <span aria-hidden="true">◐</span> View in 3D
        </button>
        <button class="bbs-cta__ar" onclick={activateAR} disabled={arChecked && !canAR}>
          <span aria-hidden="true">◈</span> Try it in your home
        </button>
      </div>

      <!--
        AR cannot work on the desktop this deck gets reviewed on: WebXR is
        Android, Quick Look is iOS, and a laptop has neither. Rather than a
        greyed-out button with no explanation, hand over the QR — it is the
        difference between the reviewer reading about AR and using it.
      -->
      {#if arChecked && !canAR}
        <div class="bbs-arfall">
          <img class="bbs-arfall__qr" src={`/img/bbsimon/qr-${product.slug}.svg`} alt="" width="96" height="96" />
          <div>
            <strong>Scan to place it in your room.</strong>
            AR runs on the phone — iPhone opens it in Quick Look, Android in Scene Viewer.
            The 3D view above works right here.
          </div>
        </div>
      {/if}

      <!-- The honesty note about scale. See $data/bbsimon.js. -->
      <p class="bbs-scale">
        <span class="bbs-scale__tag">Scale</span>
        {product.ar.note}
      </p>

      <div class="bbs-buy__form" data-inert>
        <label class="bbs-buy__qty">
          Qty
          <input type="number" value="1" min="1" disabled aria-label="Quantity (inactive in this demo)" />
        </label>
        <button class="bbs-buy__add" disabled>Add to cart</button>
      </div>
      <p class="bbs-buy__inert">Checkout is inactive in this concept.</p>
    </div>
  </div>

  <!-- ── why this page changes anything ─────────────────────────────────── -->
  <section class="bbs-pitch">
    <h2>Why this piece needs more than photographs</h2>
    <p>{product.pitch}</p>
    <ul>
      <li><strong>Rotate it.</strong> The crystal reads as crystal only when the light moves across it.</li>
      <li><strong>Place it.</strong> AR drops the piece into the buyer's own room at its true size.</li>
      <li><strong>One model, every surface.</strong> The same asset feeds the product page, the AR view, email and social.</li>
    </ul>
  </section>

  <!-- ── their tabs, reproduced ─────────────────────────────────────────── -->
  <section class="bbs-info">
    <h2>Additional information</h2>
    <table>
      <tbody>
        {#each product.attrs as [k, v]}
          <tr><th scope="row">{k}</th><td>{v}</td></tr>
        {/each}
      </tbody>
    </table>
    <p class="bbs-info__note">
      Reproduced from the live product page. Both listings currently return the same
      placeholder figures — one of the smaller things worth fixing alongside the 3D.
    </p>
  </section>

  <section class="bbs-related">
    <h2>Related products</h2>
    <div class="bbs-related__grid">
      {#each product.related as item}
        <div class="bbs-related__card" data-inert>
          <img src={item.img} alt={item.name} width="300" height="300" loading="lazy" />
          <div class="bbs-related__name">{item.name}</div>
          <div class="bbs-related__price">{item.price}</div>
        </div>
      {/each}
    </div>
  </section>

  <footer class="bbs-foot">
    <div class="bbs-foot__mark">LOOM</div>
    <p>
      Built for B.B. Simon by LOOM. The product photography, names and prices are
      B.B. Simon's own; the 3D models, the AR and this page are ours.
    </p>
    <a href="https://www.loomstudio-jo.com" target="_blank" rel="noopener noreferrer">loomstudio-jo.com</a>
  </footer>
</div>
