<!--
  Home-page promo for /ai-workshops. One section, one job: land the
  positioning line and hand the reader to the dedicated page — the booking
  form itself lives there, not here, the same split TypeShowcase/Typeface.jsx
  already uses for the type specimen.

  ── THE 2026-08 REDESIGN ───────────────────────────────────────────────────
  This used to be a centred column — kicker, headline, paragraph, four pill
  chips and a button — floating on the /ai-workshops hero photograph pushed
  down to 16% opacity. At that opacity the picture read as a printing
  accident rather than a decision, and a centre-stacked column of four
  identical pills is what every "we do training too" band on the internet
  looks like. The client's note was exactly that: it needs real design.

  What replaced it:

    1. TWO REAL PHOTOGRAPHS, COMMITTED TO. The washed background layer is
       gone. In its place is a media cluster — the wide boardroom shot as the
       main plate, the tall flip-chart shot as a portrait card overlapping its
       lower-left corner. Both sit in frames with their own shadow and hairline
       so they read as photographs the studio chose, not wallpaper. Nothing is
       set behind live type any more, so there is no legibility tax to pay for
       committing to them at full strength.

    2. AN ASYMMETRIC COMPOSITION. Copy left, flush left, at a size the
       positioning line deserves; pictures right; the curriculum as a
       full-width strip underneath. Statement → evidence → what you actually
       get, which is the order a training buyer reads in.

    3. THE MODULES ARE CONTENT NOW. Four numbered rows carrying the module
       number and its contact hours straight from $data/workshops.js — the
       same source of truth /ai-workshops prices from — instead of four
       equal-weight pills that said nothing about scale or shape.

  ── THE TWO NEW PHOTOGRAPHS ────────────────────────────────────────────────
  /img/workshops/training-wide.webp   2000x1080 landscape — the boardroom
  /img/workshops/training-tall.webp   1100x1900 portrait  — the flip chart

  Both paths currently hold BRAND-TINTED PLACEHOLDER PANELS (generated, they
  say "PHOTO PENDING") so the layout can be judged and so a visitor never eats
  a 404. Dropping the real files in at the same two paths and the same two
  aspect ratios is the whole handover — no markup change. On top of that,
  `onerror` still hides a failed decode and the frame's own brand gradient is
  what stays behind it, so a deleted file degrades to a tinted panel rather
  than a broken-image glyph.

  Art direction, per slot: the wide plate is cropped to 16:9 on desktop and
  the tall card to 3:4, both `object-fit: cover` and centred, so keep the
  subject away from the extreme edges of each frame.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { MODULES, MIN_MODULES, MAX_MODULES } from '$data/workshops.js'
  import Pic, { webpSrcset, variantsFor } from './Pic.svelte'

  /* AVIF twin of `webpSrcset`. Pic.svelte only exports the webp helper, and
     the wide/tall pair above needs a hand-written <picture> because it carries
     `media` art-direction sources that <Pic> has no prop for — the same reason
     Footer.svelte hand-rolls this for the bloom tree. */
  const avifSrcset = (src) => {
    const set = variantsFor(src)
    return set ? set.variants.map((v) => `${v.avif} ${v.w}w`).join(', ') : undefined
  }

  import './workshops.css'

  // Four of the eight modules, enough to signal breadth without repeating the
  // whole curriculum a click away on the real page. Number and hours ride
  // along now — they are what turn a list of four names into a curriculum.
  const PREVIEW = MODULES.slice(0, 4).map((m) => ({ n: m.n, title: m.title, hours: m.hours }))
</script>

<section class="wkp" id="ai-workshops" aria-label="AI Workshops by LOOM">
  <!-- A soft brand field, not a photograph: the pictures below carry the
       image weight now, and this only keeps the band from reading as a flat
       slab of page ground. -->
  <div class="wkp-field" aria-hidden="true"></div>

  <div class="wkp-inner">
    <div class="wkp-copy">
      <p class="wk-kicker"><span>—</span> Corporate training</p>
      <!-- Plain heading, not SplitWords — styles.css's `.sw { display: inline }`
           overrides even an `as="h2"` tag, and an inline element ignores
           `max-width`/`margin:auto` centering. Fine for the hero's two SHORT
           SplitWords lines above (each its own masked span with no wrap), but
           this headline is long enough to wrap here, and an inline box
           wrapping several lines threw its height off enough to overlap the
           paragraph right under it. `use:reveal`'s fade-rise reads close
           enough to SplitWords' reveal for one section-opening line. -->
      <h2 class="wk-h2 wkp-h2" use:reveal>
        AI won’t replace your employees. A company that uses it will replace one that doesn’t.
      </h2>
      <p class="wkp-body" use:reveal={{ delay: 0.12 }}>
        LOOM trains the team you already have to run AI agents day to day —
        sales, marketing, finance, ops, HR and support. {MIN_MODULES}–{MAX_MODULES}
        modules, picked to fit the department, priced per employee.
      </p>
      <!-- THE STAKES, MADE LITERAL.
           The headline states the argument but leaves the reader to do the
           arithmetic. This is the same sentence as two columns they can stand
           in: the team that was trained against the team that was not. Side by
           side, "stays behind" is a position on the page, not a warning. -->
      <div class="wkp-stakes" use:reveal={{ delay: 0.16 }}>
        <div class="wkp-stake wkp-stake--no">
          <span class="wkp-stake-tag">Untrained team</span>
          <ul>
            <li>Every task still costs a whole person-hour</li>
            <li>AI used in secret, badly, with your client data in it</li>
            <li>Your competitor quotes in a day; you quote in a week</li>
          </ul>
        </div>
        <span class="wkp-stake-vs" aria-hidden="true">vs</span>
        <div class="wkp-stake wkp-stake--yes">
          <span class="wkp-stake-tag">Trained team</span>
          <ul>
            <li>The same headcount clears several times the work</li>
            <li>One agreed way of working, and data that stays yours</li>
            <li>You answer first — and that is usually who wins it</li>
          </ul>
        </div>
      </div>

      <p class="wkp-kicker-warn" use:reveal={{ delay: 0.18 }}>
        The tools are already free. The advantage is not the software —
        it is the team that knows what to ask it.
      </p>

      <div class="wkp-cta" use:reveal={{ delay: 0.2 }}>
        <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
          <a class="wk-btn wk-btn--fill" href="/ai-workshops">See AI Workshops by LOOM</a>
        </div>
      </div>
    </div>

    <div class="wkp-stage" use:reveal={{ delay: 0.1, y: 24 }}>
      <figure class="wkp-shot wkp-shot--wide">
        <!-- Art direction, same contract as the /ai-workshops hero and
             Banners' need tiles: the portrait scene is the better frame on a
             phone, the boardroom panorama on anything wider. -->
        <!-- SIZED VARIANTS ADDED 14 Aug 2026. The art direction below was
             already right; what was missing is that neither branch carried a
             `srcset`, so the 2000px panorama went into a 515px box on desktop
             (1.94x at DPR2) and the 1100px portrait into a 348px one on a
             phone. Both `-160…-1024` sets already exist in responsive.json.
             The phone <source> keeps the SAME media query as before — the
             portrait crop is an art-direction decision and is not up for
             renegotiation by the browser's size picker; only which WIDTH of
             that crop it fetches is. -->
        <picture style="display: contents">
          <source
            media="(max-width: 719px)"
            type="image/avif"
            srcset={avifSrcset('/img/workshops/training-tall.webp')}
            sizes="92vw"
          />
          <source
            media="(max-width: 719px)"
            srcset={webpSrcset('/img/workshops/training-tall.webp')}
            sizes="92vw"
          />
          <source
            type="image/avif"
            srcset={avifSrcset('/img/workshops/training-wide.webp')}
            sizes="(max-width: 1199px) 86vw, 530px"
          />
          <source
            srcset={webpSrcset('/img/workshops/training-wide.webp')}
            sizes="(max-width: 1199px) 86vw, 530px"
          />
          <img
            src="/img/workshops/training-wide.webp"
            alt="A LOOM workshop in session — the team around a boardroom table, laptops open"
            width="2000"
            height="1080"
            loading="lazy"
            decoding="async"
            onerror={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </picture>
      </figure>

      <!-- The inset. `loading="lazy"` is doing double duty: below 900px this
           card is display:none, and a lazy image inside a hidden box never
           intersects anything, so the phone never pays for the second file. -->
      <figure class="wkp-shot wkp-shot--tall" aria-hidden="true">
        <!-- 188px wide on desktop, 148 on a tablet, and it was fetching the
             full 1100px file — 2.93x at DPR2, the worst ratio on the page after
             the app captures. Fixed px in `sizes` because the inset is a fixed
             card, and it does not render at all below 900px (see the note
             above), so there is no mobile term to describe. -->
        <Pic
          src="/img/workshops/training-tall.webp"
          sizes="(max-width: 1199px) 150px, 190px"
          alt=""
          width="1100"
          height="1900"
          loading="lazy"
          decoding="async"
          onerror={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </figure>
    </div>
  </div>

  <ol class="wkp-modules" use:reveal={{ delay: 0.24, y: 24 }}>
    {#each PREVIEW as m (m.title)}
      <li class="wkp-module">
        <span class="wkp-module-n">{m.n}</span>
        <span class="wkp-module-t">{m.title}</span>
        <span class="wkp-module-h">{m.hours} hrs</span>
      </li>
    {/each}
  </ol>
</section>
