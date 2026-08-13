<!--
  THE FOOTER — the bloom tree is the last thing on the page.

  It used to stand between the two cards of #offer, where it was competing with
  them: the tree is the most beautiful object on the site and it was being asked
  to be a divider. Down here it has nothing to compete with, so it can be the
  closing image instead — the page ends in blossom rather than in a dark
  sitemap.

  The move brings the pink ground with it, which is what makes the footer read
  as an ending and not as another dark band: `.foot-sky` is the same masked
  watercolour `.offer` used to carry, bleeding UP past the footer's own top edge
  so the dark contact section above dissolves into it instead of butting against
  a rule. Everything from `.footer--bloom` down is therefore dark ink on light
  paper — the inverse of the rest of the site, stated once here and scoped so
  nothing else inherits it.
-->
<script>
  import { BRAND } from '$data/site.js'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { navigate } from '$lib/scroll.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import { FOOT_COLS } from './nav-links.js'
  import FootIcon from './FootIcon.svelte'
  import LoomMark from './LoomMark.svelte'
  import { webpSrcset, variantsFor } from './Pic.svelte'
  import { t, localeHref } from '$lib/i18n.svelte.js'
  import { NAV_LABELS, FOOTER_UI, FOOT_COL_TITLES } from '$data/chrome.js'

  const label = (l) => t(NAV_LABELS[l.href] ?? { en: l.label, ar: l.label })
  const href = (l) => localeHref(l.href)

  // avif equivalent of webpSrcset (Pic.svelte only exports the webp helper —
  // this tree is the one caller on the page still hand-writing a two-format
  // <picture> instead of using <Pic>, because the wrapper carries a
  // `media="(max-width: 767px)"` sibling <source> pair ahead of these that
  // <Pic> has no prop for).
  const avifSrcset = (src) => {
    const set = variantsFor(src)
    return set ? set.variants.map((v) => `${v.avif} ${v.w}w`).join(', ') : undefined
  }

  /* SHARE, not follow. LOOM has no social handles anywhere in the repo, and a
     footer that links to an Instagram account nobody has typed in is a broken
     promise on the last row of the page. These four hand the CURRENT url to a
     share intent instead — they need no account to exist, and they are the
     thing a visitor who liked the work actually wants. `url()` is read at click
     time, not at module scope, so a share from /type shares /type. */
  const SHARE = [
    { id: 'whatsapp', label: FOOTER_UI.shareWhatsapp, to: (u, txt) => `https://wa.me/?text=${encodeURIComponent(`${txt} ${u}`)}` },
    { id: 'linkedin', label: FOOTER_UI.shareLinkedin, to: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
    { id: 'x', label: FOOTER_UI.shareX, to: (u, txt) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(txt)}` },
    { id: 'facebook', label: FOOTER_UI.shareFacebook, to: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  ]

  const title = `${BRAND.name} — ${BRAND.positioning}. ${BRAND.tagline}`
  const url = () => window.location.href

  let copied = $state(false)

  // The timeout is cleared on teardown: a 1.8s state write into a footer the
  // reader has already routed away from is a real leak.
  $effect(() => {
    if (!copied) return
    const t = setTimeout(() => { copied = false }, 1800)
    return () => clearTimeout(t)
  })

  async function copy() {
    try {
      await navigator.clipboard.writeText(url())
      copied = true
    } catch {
      // clipboard is permission-gated and absent over plain http on a phone.
      // Falling back to the OS sheet is better than a button that does nothing.
      if (navigator.share) navigator.share({ title, url: url() }).catch(() => {})
    }
  }

  function toTop() {
    window.scrollTo({ top: 0, behavior: reducedMotion.current ? 'auto' : 'smooth' })
  }

  // Same rule as Nav's go(): only hash links are scroll targets. Path links are
  // left alone entirely so SvelteKit's router handles them.
  function footGo(e, href) {
    if (!href.startsWith('#')) return
    e.preventDefault()
    navigate(href)
  }

  /* THE DRIFT — petals over the WHOLE footer, not just the canopy. They used to
     live inside `.foot-bloom`, which is a 560px box in the middle of the page,
     so the fall read as a leak from the tree rather than as weather. Lifted to a
     footer-level layer that spans the full box; the tree is still where they
     start, but the column they fall in is the page.

     Lane, size, drift, duration and delay are all derived from the index by the
     same integer hash, so 18 petals never resolve into a visible cycle and the
     set is identical on every render — no Math.random, so nothing shifts
     between the server render and hydration.

     The layer clips its OWN overflow: `.footer--bloom` is `clip visible` on Y,
     so a petal falling past the hem would otherwise be free to lengthen the
     document at the very bottom of the page. */
  const petals = Array.from({ length: 18 }, (_, i) => {
    const h = ((i * 2654435761) % 1000) / 1000
    const g = ((i * 40503) % 997) / 997
    return {
      leaf: i % 3 === 0,
      style:
        `--x:${3 + ((i * 5.6) % 94)}%;--s:${0.62 + h * 0.85};--dx:${-90 + g * 150}px;` +
        `--rot:${180 + h * 420}deg;--dur:${11 + h * 9}s;--delay:${-(g * 20).toFixed(2)}s;` +
        `--o:${0.45 + g * 0.45}`,
    }
  })

  const year = new Date().getFullYear()
</script>

<footer class="footer footer--bloom">
  <!-- the sky. Same file, same phone cut, same reasoning as `.offer` used:
       media query, NOT a `w` descriptor, so a DPR-3 phone cannot talk itself
       into the 2200px original for a blurred watercolour behind a mask. -->
  <picture style="display: contents">
    <source media="(max-width: 767px)" type="image/webp" srcset="/img/tree/bloom-sky-sm.webp" />
    <img
      class="foot-sky"
      src="/img/tree/bloom-sky.webp"
      alt=""
      width="2200"
      height="1228"
      loading="lazy"
      decoding="async"
      aria-hidden="true"
    />
  </picture>

  {#if !reducedMotion.current}
    <div class="foot-petals" aria-hidden="true">
      {#each petals as p}<span class={p.leaf ? 'is-leaf' : ''} style={p.style}></span>{/each}
    </div>
  {/if}

  <!-- THREE COLUMNS, THE TREE IN THE MIDDLE: words left, blossom centre,
       contact right. The tree is the reason this footer exists, and stacking it
       above a four-up row of copy made it a header for a table. Standing it
       between the two halves puts it back where the eye ends and gives both
       columns a reason to be short. -->
  <div class="footer-grid">
    <div class="foot-side foot-side--l">
      <div class="foot-brand">
        <LoomMark class="footer-mark" />
        <p class="foot-tag">{t(FOOTER_UI.tagLine1)}<br />{t(FOOTER_UI.tagLine2)}</p>
        <p class="foot-cities"><FootIcon name="pin" />{t(FOOTER_UI.cities)}</p>
      </div>

      <div class="foot-cols">
        {#each FOOT_COLS as col (col.title)}
          <nav class="foot-col" aria-label={t(FOOT_COL_TITLES[col.title] ?? { en: col.title, ar: col.title })}>
            <h3 class="foot-col-t">{t(FOOT_COL_TITLES[col.title] ?? { en: col.title, ar: col.title })}</h3>
            <ul>
              {#each col.links as l (l.href)}
                <li><a href={href(l)} onclick={(e) => footGo(e, l.href)}><span>{label(l)}</span></a></li>
              {/each}
            </ul>
          </nav>
        {/each}
      </div>
    </div>

    <!-- THE TREE, IN THE MIDDLE COLUMN. It was a full-width flow item above the
         copy; it is a grid cell now, standing between the two columns with the
         brand on its left and the contact on its right. Being a CELL rather
         than a background is the whole trick — the columns sit beside it by the
         grid's own maths, so no text can ever land on the canopy and nothing
         needs a scrim to stay readable.

         aria-hidden, no alt: it says nothing the copy beside it does not. One
         <img> and composited transforms only — the page already runs two WebGL
         layers and the footer does not open a third to be pretty.

         `-hq` art, re-exported from the 1860px original: the shipped pair was
         downscaled to 1600 and encoded for a 560px slot, and this column shows
         it larger. New filenames, because the bytes changed and the caches
         would otherwise keep serving the small ones. -->
    <div class="foot-bloom" aria-hidden="true">
      <i class="foot-halo"></i>
      <picture style="display: contents">
        <source media="(max-width: 767px)" type="image/avif" srcset="/img/tree/bloom-tree-hq-sm.avif" />
        <source media="(max-width: 767px)" type="image/webp" srcset="/img/tree/bloom-tree-hq-sm.webp" />
        <!-- >767px only (the branch above wins below that): the box is
             min(560px, 100%) between 767-1180px and 620px above — never the
             full 1860px original, which was the single biggest oversized
             file on the page (236 KB avif into a ~437px box measured at
             1440/DPR2). A width-ladder srcset + sizes replaces the flat
             full-size source so the browser picks the rung the box actually
             needs. -->
        <source
          type="image/avif"
          srcset={avifSrcset('/img/tree/bloom-tree-hq.webp')}
          sizes="(max-width: 1180px) 560px, 620px"
        />
        <source
          type="image/webp"
          srcset={webpSrcset('/img/tree/bloom-tree-hq.webp')}
          sizes="(max-width: 1180px) 560px, 620px"
        />
        <img
          class="foot-tree"
          src="/img/tree/bloom-tree-hq.webp"
          alt=""
          width="1860"
          height="1723"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
        />
      </picture>
    </div>

    <div class="foot-side foot-side--r">
      <div class="footer-contact">
        <h3 class="foot-col-t">{t(FOOTER_UI.startProject)}</h3>

        <a class="foot-c-row is-lead" href={BRAND.whatsapp} target="_blank" rel="noreferrer">
          <span class="foot-c-ico"><FootIcon name="whatsapp" /></span>
          <span class="foot-c-txt"><em>{t(FOOTER_UI.whatsapp)}</em><b>{BRAND.phoneJO}</b></span>
          <FootIcon name="arrowUpRight" class="foot-c-go" />
        </a>

        <a class="foot-c-row" href="mailto:{BRAND.email}">
          <span class="foot-c-ico"><FootIcon name="mail" /></span>
          <span class="foot-c-txt"><em>{t(FOOTER_UI.email)}</em><b>{BRAND.email}</b></span>
          <FootIcon name="arrowUpRight" class="foot-c-go" />
        </a>

        <p class="foot-hours"><FootIcon name="clock" />{t(FOOTER_UI.hours)}</p>

        <button type="button" class="foot-cta" onclick={() => wizard.open({})}>
          <FootIcon name="spark" />{t(FOOTER_UI.getStarted)}
        </button>
      </div>

      <div class="foot-share">
        <h3 class="foot-col-t">{t(FOOTER_UI.shareStudio)}</h3>
        <div class="foot-share-row">
          {#each SHARE as s (s.id)}
            <!-- the href carries the canonical url so the link is real with JS
                 off and on a middle-click; the click swaps in the page the
                 reader is actually on before the tab opens. -->
            <a
              class="foot-sh"
              href={s.to('https://www.loomstudio-jo.com/', title)}
              aria-label={t(s.label)}
              title={t(s.label)}
              target="_blank"
              rel="noreferrer"
              onclick={(e) => { e.currentTarget.href = s.to(url(), title) }}
            >
              <FootIcon name={s.id} />
            </a>
          {/each}

          <button
            type="button"
            class="foot-sh foot-sh--copy {copied ? 'is-copied' : ''}"
            onclick={copy}
            aria-label={t(copied ? FOOTER_UI.linkCopied : FOOTER_UI.copyLink)}
            title={t(copied ? FOOTER_UI.linkCopied : FOOTER_UI.copyLink)}
          >
            <FootIcon name={copied ? 'check' : 'link'} />
            <span class="foot-sh-say" aria-live="polite">{copied ? t(FOOTER_UI.copiedSay) : ''}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-base">
    <span>© {year} LOOM. {t(FOOTER_UI.rights)}</span>
    <span class="foot-edge">{t(FOOTER_UI.edgeIntentional)}</span>
    <button type="button" class="foot-top" onclick={toTop} aria-label={t(FOOTER_UI.backToTop)}>
      <FootIcon name="arrowUp" />
    </button>
  </div>
</footer>
