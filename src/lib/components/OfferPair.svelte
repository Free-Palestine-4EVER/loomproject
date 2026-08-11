<!--
  LOOM — the banner layer, part 2: THE FORK.

  Third full rebuild — rejected twice before this, and the note below records
  why neither fix was actually a different idea.

  V1 was two knitted panels on the near-black page. V2 replaced them with
  paper wish tags flanking the bloom tree on a pink sky — legible only because
  the tree stood between them. The tree has since moved to the footer, where
  it closes the page instead of dividing one, so that ground is gone. V3 kept
  the sky's lesson (put the section back on the site's own dark) but not its
  shape: two full-bleed woven panels on a yarn seam, `1fr 1fr` at rest, one
  taking the room on `:hover`/`:focus-within` while the other gave it up.
  Rejected a third time.

  All three are the SAME complaint answered three different ways: every
  version put up two coloured blocks and asked the visitor to pick a side of
  the page. That is a shape (a fork in a literal hallway), not a question, and
  changing the material each panel is cut from — knit, then paper, then knit
  again — never changed the shape being rejected. So this version does not
  have two of anything on screen at once.

  It's a SWITCH: one small toggle, two felt lozenges on a stitched track,
  sitting above ONE answer card. Press a side and the thumb sews itself across
  the track; the card below crossfades to that answer.

  REDESIGNED 10 Aug 2026: both branches, side by side, filling the band. The
  visitor does not operate a control — they read two sentences and pick the
  one that is them, which is the actual job. Hovering or focusing a branch
  grows it and dims the other, so the choosing is felt rather than
  administered; the seam between them is the loom thread, which is the one
  place this page's motif belongs.

  NO active state, NO crossfade any more. There is nothing to swap any more —
  two static articles, each with its own heading and its own CTA, which is
  also two landmarks for a screen reader instead of one live region
  announcing replacements.

  MATERIAL: staying IN the wool language on purpose, not departing from it —
  a physical two-position toggle is exactly the kind of small hardware object
  the site already owns (the counter's felted medallions, the bolt's dashed
  rivet), so the felt track and `.blk` dye on the answer card read as the
  same material family the rest of the page is cut from.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolIcon from './WoolIcon.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import './banners.css'

  const OFFER = [
    {
      id: 'studio',
      ord: '01',
      // magenta is the house key and goes to the option most visitors are in
      dye: 'magenta',
      mark: 'tag',
      eyebrow: 'Already trading',
      title: 'I have a business already.',
      body: 'It runs — it just doesn’t land. We take what already sells and rebuild the brand, the site and the campaign around it, in one frame.',
      cta: 'Book a call',
      note: 'I have a business already',
      link: { href: '#work', label: 'See the work' },
    },
    {
      id: 'lab',
      ord: '02',
      dye: 'violet',
      mark: 'plus',
      eyebrow: 'Starting out',
      title: 'I have a business idea.',
      body: 'Nothing exists yet, which is the easiest place to start — name, identity, site, launch, in the order that gets you trading fastest.',
      cta: 'Start from zero',
      note: 'I have a business idea',
      // the CTA already opens the wizard, so the secondary link carries the
      // other half of the claim ("apps in stores, tools in the lab") instead
      // of duplicating it
      link: { href: '#apps', label: 'See the apps' },
    },
  ]
</script>

<section class="ofk" id="offer" aria-label="Already trading, or starting from an idea">
  <div class="ofk-head">
    <p class="kicker"><span>—</span> Two ways in</p>
    <SplitWords as="h2" class="h2 ofk-h2" text="Which one is you?" />
  </div>

  <div class="ofk-wrap" use:reveal={{ y: 26 }}>
    <div class="ofk-fork">
      {#each OFFER as o (o.id)}
        <article class="ofk-branch blk blk--{o.dye}" data-cursor>
          <!-- the shared four-yarn stripe every dyed shape on this page
               paints with — not a new one for this section -->
          <i class="blk-rail" aria-hidden="true"></i>

          <header class="ofk-top">
            <span class="ofk-mark"><WoolIcon name={o.mark} /></span>
            <span class="ofk-eyebrow">{o.eyebrow}</span>
            <span class="ofk-ord" aria-hidden="true">{o.ord}</span>
          </header>

          <h3 class="ofk-h">{o.title}</h3>
          <p class="ofk-body">{o.body}</p>

          <div class="ofk-foot">
            <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
              <button type="button" class="ofk-cta" onclick={() => wizard.open({ note: o.note })}>
                {o.cta}
              </button>
            </div>
            <a class="ofk-link" href={o.link.href}>{o.link.label} <span aria-hidden="true">→</span></a>
          </div>
        </article>
      {/each}

      <!-- THE SEAM. One thread down the join, and the only thing between the
           two branches — a border would make them two boxes, which is what
           the card layout already was. Decorative and pointer-events none so
           it never eats a click meant for a branch. -->
      <i class="ofk-seam" aria-hidden="true"></i>
    </div>
  </div>
</section>
