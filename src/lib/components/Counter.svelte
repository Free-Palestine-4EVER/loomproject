<!--
  LOOM — the banner layer, part 1: THE COUNTER.

  Petbarn's three promo shapes (category tile grid / split promo pair /
  full-width claim) cut from real photographed wool. Counter, OfferPair and
  Bolt (this file, OfferPair.svelte, Bolt.svelte) share ONE material recipe,
  `.blk`, in banners.css — see that file's header for the recipe itself.

  One dye + one felted medallion per need. Every icon name is in WOOL_ICONS.
  knit-cream is deliberately unused: a cream band directly above a cream felt
  strip has no value jump and the tile loses its two-part anatomy. 'Launch
  campaign' takes a second magenta instead — colour here is rhythm, not a key.
  'Not sure yet' is the only tile with no dye in it: dark felt, the blank
  swatch. `photo` is a knitted-wool still shot for that need (Nano Banana Pro,
  one shared style block + the woven logo as reference, so all eight read as
  one set). The dye + medallion stay as the paint-in and the fallback: a tile
  whose photo has not decoded yet is still a finished LOOM tile, never a white
  hole.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { WIZARD } from '$data/site.js'
  import { hasNeedDetail } from '$data/needs.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import WoolIcon from './WoolIcon.svelte'
  import NeedModal from './NeedModal.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import './banners.css'

  let { children = null } = $props()

  const NEED_BLOCK = {
    'Brand identity': { dye: 'magenta', mark: 'tag', photo: 'brand-identity' },
    'Website': { dye: 'violet', mark: 'home', photo: 'website' },
    'Mobile app': { dye: 'blue', mark: 'phone', photo: 'mobile-app' },
    'Social content': { dye: 'crimson', mark: 'share-nodes', photo: 'social-content' },
    'AI systems': { dye: 'grey', mark: 'settings', photo: 'ai-systems' },
    '3D / AR experience': { dye: 'gold', mark: 'eye', photo: 'ar-experience' },
    'Launch campaign': { dye: 'magenta', mark: 'upload', photo: 'launch-campaign' },
    'Not sure yet': { dye: 'felt', mark: 'search', photo: 'not-sure' },
  }

  // NEED_BLOCK is the gate, not WIZARD.needs. The questionnaire may carry more
  // options than the grid, and banners.css's tile grid is a hard constraint: 8
  // tiles form a rectangle, 9 form a ragged 3x3-1. A need earns a tile by
  // being given a block.
  const tiles = WIZARD.needs.filter((n) => NEED_BLOCK[n])

  // Which need's panel is showing, or null. The tile used to call open()
  // straight through to the contact wizard; it now opens the detail panel and
  // the panel's own CTA carries the same seed on to the wizard. A need with no
  // entry in NEEDS still goes direct, so the panel is an upgrade rather than a
  // gate on the eight tiles.
  let openNeed = $state(null)
  function pick(need) {
    if (hasNeedDetail(need)) openNeed = need
    else wizard.open({ note: need })
  }

  function onPhotoLoad(e) {
    e.currentTarget.closest('.cnt-tile')?.classList.add('has-photo')
  }
  function onPhotoError(e) {
    e.currentTarget.style.display = 'none'
  }
</script>

<section class="counter" id="counter">
  <div class="section-head">
    <!-- unnumbered, following the rest of the page: 01-12 is fully allocated -->
    <p class="kicker"><span>—</span> Start here</p>
    <SplitWords as="h2" class="h2" text="We can help you in any phase of your business journey." />
    <p class="lede" style="margin-top: 22px" use:reveal={{ delay: 0.15 }}>
      Day one or year ten — pick what you need and we’ll shape the rest with you.
    </p>
  </div>

  <div class="cnt-grid">
    {#each tiles as need, i (need)}
      {@const b = NEED_BLOCK[need]}
      <!-- modulo stagger by COLUMN COUNT — each row restarts at 0 instead of
           waiting on the one above it. Two columns now, not four. -->
      <div class="cnt-cell" use:reveal={{ delay: (i % 2) * 0.06, y: 22 }}>
        <button
          type="button"
          class="cnt-tile"
          onclick={() => pick(need)}
          aria-haspopup="dialog"
          aria-label={`${need} — what LOOM delivers`}
        >
          <span class="cnt-band blk blk--{b.dye}">
            <!-- the four yarns — the same stripe .kicker::after and
                 .progress already run. One static gradient, never animated. -->
            <i class="blk-rail" aria-hidden="true"></i>
            <!-- anchored top-left: a maker's stamp, never a centred sticker.
                 It stays in the tree under the photo, so a need whose still
                 has not been shot yet is still a finished LOOM tile. -->
            <WoolIcon name={b.mark} class="cnt-medal" />
            {#if b.photo}
              <!-- Eight of these mount together and they are the densest
                   screenful on the page, so the decode budget is the thing
                   being managed here, not the file size. Decoded RAM is
                   width x height x 4 regardless of codec, and the phones this
                   is for run at DPR 3 — which is exactly why there is no
                   srcset: a `w` descriptor lets a DPR-3 phone ask for, and
                   get, the largest cut on offer. A single fixed source is the
                   only thing that puts a hard CEILING on the pixels.
                   1100x471 is 2.07 MB decoded, 16.6 MB for the grid.

                   ONE cut at every width now: the 21:9 `-wide` panorama. The
                   tile used to swap art direction at 719px — a 2:3 `-pc`
                   portrait above it, the panorama below — and the media query
                   had to sit exactly on banners.css's aspect-ratio switch or
                   the source would letterbox in the gap. Desktop went 21:9
                   too (2 columns instead of 4), so the switch has nothing
                   left to switch and the whole class of mismatch bugs goes
                   with it. The `-pc` portraits stay on disk, referenced by
                   nothing.

                   `display: contents` so the <picture> adds no box: the img
                   is absolutely positioned against `.cnt-band` by `.counter
                   .cnt-photo`, and a wrapper with a layout box would become
                   its containing block instead. Same reason everywhere else
                   this file wraps an img. -->
              <picture style="display: contents">
                <source type="image/avif" srcset={`/img/needs/${b.photo}-wide.avif`} />
                <img
                  class="cnt-photo"
                  src={`/img/needs/${b.photo}-wide.webp`}
                  alt=""
                  width="1100"
                  height="471"
                  loading="lazy"
                  decoding="async"
                  onload={onPhotoLoad}
                  onerror={onPhotoError}
                />
              </picture>
            {/if}
          </span>
          <!-- The button and the peel are siblings of the strip, not
               children of it. Both are positioned against the TILE — the
               button to the top-right corner, the peel to the bottom-right —
               and the strip is now a bare label with no box of its own, so
               it cannot serve as their containing block. -->
          <span class="cnt-strip">
            <span class="cnt-label">{need}</span>
          </span>
          <i class="cnt-arrow" aria-hidden="true"></i>
          <i class="cnt-peel" aria-hidden="true"></i>
        </button>
      </div>
    {/each}
  </div>

  <!-- Act two, mounted by the page as <Counter>{#snippet children()}<Solutions merged />{/snippet}</Counter>.
       It sits between the grid and the CTA on purpose: "pick what you need"
       and "pick your industry" are the same question asked two ways, and the
       quote button has to close BOTH of them rather than land between them.
       Nothing else is ever passed here. -->
  {@render children?.()}

  <NeedModal need={openNeed} onClose={() => (openNeed = null)} />

  <div class="cnt-foot" use:reveal={{ delay: 0.1 }}>
    <!-- 'Request a quote' is one of the 21 photographed spools and is unused
         elsewhere on the site. It sits on bare --bg, so it cannot clash with
         a block — the label was chosen before the colour, because WoolButton
         gives the `yarn` prop no effect on a photographed pill. -->
    <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
      <WoolButton label="Request a quote" size="big" onclick={() => wizard.open({})} />
    </div>
    <!-- Points DOWN, not back up. Work used to sit below this section, so
         "see the work" was the forward move; since the reorder the cases are
         already read by the time anyone gets here, and sending them back up
         is a leak. The Machine is the next thing to sell. -->
    <a class="cnt-foot-link" href="#the-machine" data-scroll>or see what we sell →</a>
  </div>
</section>

<!-- THE TREE — moved. The bloom tree used to stand here, between the needs
     grid and the fork. It is now the closing image of the page: markup in
     the footer component, styles in styles.css under `.footer--bloom`.
     `.treebreak` / `.tb-*` are gone from this file and from banners.css — the
     tree was never a divider, it was the site's best object being spent as
     one. -->
