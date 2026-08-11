<!--
  Home-page promo for /ai-workshops. One section, one job: land the
  positioning line and hand the reader to the dedicated page — the booking
  form itself lives there, not here, the same split TypeShowcase/Typeface.jsx
  already uses for the type specimen.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { MODULES, MIN_MODULES, MAX_MODULES } from '$data/workshops.js'

  import './workshops.css'

  // Four of the eight modules, enough to signal breadth without repeating the
  // whole curriculum a click away on the real page.
  const PREVIEW = MODULES.slice(0, 4).map((m) => m.title)
</script>

<section class="wkp" id="ai-workshops" aria-label="AI Workshops by LOOM">
  <div class="wkp-media" aria-hidden="true">
    <!-- Same art-direction contract as the /ai-workshops hero and Banners'
         need tiles: -wide panorama under 719px, -pc above it, onerror drops a
         failed decode rather than leaving a hole — the CSS gradient behind
         this layer is the fallback either way. -->
    <picture style="display: contents">
      <source media="(max-width: 719px)" srcset="/img/workshops/section-wide.webp" />
      <img
        src="/img/workshops/section-pc.webp"
        alt=""
        width="1400"
        height="1000"
        loading="lazy"
        decoding="async"
        onerror={(e) => { e.currentTarget.style.display = 'none' }}
      />
    </picture>
  </div>
  <div class="wkp-inner">
    <p class="wk-kicker"><span>—</span> Corporate training</p>
    <!-- Plain heading, not SplitWords — styles.css's `.sw { display: inline }`
         overrides even an `as="h2"` tag, and an inline element ignores
         `max-width`/`margin:auto` centering. Fine for the hero's two SHORT
         SplitWords lines above (each its own masked span with no wrap), but
         this headline is long enough to wrap to two lines here, and an inline
         box wrapping two lines threw its height off enough to overlap the
         paragraph right under it. `use:reveal`'s fade-rise reads close enough
         to SplitWords' reveal for one section-opening line. -->
    <h2 class="wk-h2 wkp-h2" use:reveal>
      AI won’t replace your employees. A company that uses it will replace one that doesn’t.
    </h2>
    <p class="wkp-body" use:reveal={{ delay: 0.15 }}>
      LOOM trains the team you already have to run AI agents day to day —
      sales, marketing, finance, ops, HR and support. {MIN_MODULES}–{MAX_MODULES}
      modules, picked to fit the department, priced per employee.
    </p>
    <div class="wkp-preview" use:reveal={{ delay: 0.22 }}>
      <ul>
        {#each PREVIEW as t (t)}<li>{t}</li>{/each}
      </ul>
    </div>
    <div class="wkp-cta" use:reveal={{ delay: 0.3 }}>
      <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
        <a class="wk-btn wk-btn--fill" href="/ai-workshops">See AI Workshops by LOOM</a>
      </div>
    </div>
  </div>
</section>
