<!--
  LOOM — THE FORK. "Two ways in / Which one is you?"

  ─────────────────────────────────────────────────────────────────────────
  SIXTH BUILD, 11 Aug 2026 — CLARITY PASS. The client on the fifth: "this
  section is retarded and still not CLEAR."

  He is right, and the fifth build's own file header explains exactly how it
  got there. It set out to make the two branches "opposite MATERIALS" and
  then spent the whole card on saying so: a woven plank under both, a fine
  twill and a ruled graph on top of that, warp threads off a beam, a selvedge
  fringe, finished rows, a weft pass on hover, a dashed cut-line that marched,
  four crop marks, a plotted first-thread curve, two threads crossing in the
  seam — and, over all of it, ONE WORD per side set 70px high in a pattern
  typeface.

  THE ONE THING THAT BROKE IT: those display words. EXISTING and STARTING
  were set in LOOM Organic, a face whose pattern fills the letterform. At
  70px on a dark twill, "EXISTING" is not a word you read, it is a texture
  you look at — the pattern in the glyph and the pattern in the ground are
  the same visual event. The word that was supposed to tell a stranger which
  door is theirs was the least legible thing on the screen.

  So the display words are GONE, and with them everything that was decoration
  rather than meaning. What is left is the answer that was already on the
  card and already plain:

      I have a business already.        I have a business idea.

  Those are the client's own sentences, they are unambiguous, and they are
  now the hero of each half at full display size. A visitor picks their door
  by reading one line, not by decoding a specimen.

  WHAT MAKES THEM TWO DOORS, still, and at a glance:
    01  a business that exists   → the INK plane: dark, solid, warm-lit,
        a filled numeral plate, a cream pill.
    02  a business that doesn't  → the PAPER plane: pale, open, cool-lit,
        a filled numeral plate in the other dye, an ink pill.
  Dark against pale is the whole distinction now, and it lands before a word
  is read. NEITHER IS THE BETTER ONE: identical geometry, identical type
  scale, identical numeral, identical CTA weight — the only difference is
  polarity and dye. There is no "primary" half.

  WHAT WAS STRIPPED, and why each one was noise:
    · both pattern-face display words (illegible at size — see above)
    · the plank/bed, its warp tile and the two dye pools (a dark plank under
      a dark card erased the very contrast that tells the halves apart)
    · the ruled graph tile, the dashed cut-line, the four crop marks and the
      plotted first-thread curve (drawing-office props; none of them helps
      anyone choose, and the grid sat directly under the body copy)
    · the comb, the fringe, the finished rows and the weft pass
    · the crossing-threads seam (a decorative join between two things whose
      whole job is to be apart)
  A single faint twill survives on 01 — it is the one texture that says
  "cloth" without competing with type — and nothing at all on 02, which is
  the point of 02.

  MOTION is now one idea instead of six: pointing at a door brings it forward
  and settles the other back, so the choice is echoed rather than illustrated.
  Dropped wholesale under prefers-reduced-motion and at touch widths.

  COPY IS UNTOUCHED AND COMPLETE: the kicker "Two ways in", the headline
  "Which one is you?", both headings, both paragraphs, both buttons (and the
  note strings they open the wizard with) and both secondary links with their
  destinations. The only strings removed are the two the STUDIO wrote —
  EXISTING and STARTING — which were never the client's.

  No remote assets. The one remaining texture is generated line-work already
  in the tree (/img/fork/cloth.svg). This section no longer loads a pattern
  typeface at all.
  ─────────────────────────────────────────────────────────────────────────
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import './fork.css'

  const OFFER = [
    {
      id: 'studio',
      ord: '01',
      // `mat` is the material, and it drives everything: ground, composition,
      // type treatment, pill polarity and hover choreography.
      mat: 'cloth',
      // No `eyebrow`. The two display words the studio wrote — EXISTING and
      // STARTING — are gone; `title` is the door now. See the file header.
      title: 'I have a business already.',
      body: 'It runs — it just doesn’t land. We take what already sells and rebuild the brand, the site and the campaign around it, in one frame.',
      cta: 'Book a call',
      note: 'I have a business already',
      link: { href: '/work', label: 'See the work' },
    },
    {
      id: 'lab',
      ord: '02',
      mat: 'paper',
      title: 'I have a business idea.',
      body: 'Nothing exists yet, which is the easiest place to start — name, identity, site, launch, in the order that gets you trading fastest.',
      cta: 'Start from zero',
      note: 'I have a business idea',
      // the CTA already opens the wizard, so the secondary link carries the
      // other half of the claim ("apps in stores, tools in the lab") instead
      // of duplicating it
      link: { href: '/apps', label: 'See the apps' },
    },
  ]
</script>

<section class="fk" id="offer" aria-label="Two ways in: a business that is already running, or a business idea">
  <div class="fk-head">
    <p class="kicker"><span>—</span> Two ways in</p>
    <SplitWords as="h2" class="h2 fk-h2" text="Which one is you?" />
  </div>

  <div class="fk-wrap" use:reveal={{ y: 26 }}>
    <!-- TWO DOORS, NO STAGE. There is no plank under them any more: a dark bed
         under a dark card erased the one contrast that tells the halves apart.
         The grid is the whole composition — equal columns, equal gap. -->
    <div class="fk-grid">
      {#each OFFER as o, i (o.id)}
        <article class="fk-card fk-card--{o.mat}" data-cursor style="--fk-i:{i}">
          <!-- The one surviving texture, and only on 01: a faint twill that
               says "cloth" without competing with a single glyph. 02 gets
               nothing at all, which is the point of 02. -->
          {#if o.mat === 'cloth'}
            <i class="fk-tex" aria-hidden="true"></i>
          {/if}

          <header class="fk-top">
            <!-- the numeral, as a PLATE: filled, small, in the half's own dye.
                 Filled on both sides at the same size — the numbering says
                 "first / second", never "better / worse". -->
            <span class="fk-plate" aria-hidden="true">{o.ord}</span>
            <span class="fk-mark" aria-hidden="true">
              {#if o.mat === 'cloth'}
                <!-- ALREADY TRADING: a bolt of cloth already on the loom —
                     two warp threads with the weft run through them. -->
                <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <path d="M8 3v22M20 3v22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
                  <path d="M3 9h22M3 14h22M3 19h22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              {:else}
                <!-- STARTING OUT: the first cross — one thread laid over
                     another, which is where cloth begins. -->
                <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <path d="M14 3v22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
                  <path d="M3 14h22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  <circle cx="14" cy="14" r="3.6" stroke="currentColor" stroke-width="1.6" />
                </svg>
              {/if}
            </span>
            <span class="fk-tick" aria-hidden="true"></span>
          </header>

          <!-- THE DOOR. The client's own sentence, at display size, in the
               body-adjacent display face — plain, instantly readable, and the
               largest thing in the half. This is what replaced the two
               pattern-face display words; see the file header. -->
          <h3 class="fk-h">{o.title}</h3>

          <i class="fk-rule" aria-hidden="true"></i>

          <p class="fk-body">{o.body}</p>

          <div class="fk-foot">
            <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
              <button type="button" class="fk-cta" onclick={() => wizard.open({ note: o.note })}>
                {o.cta}
              </button>
            </div>
            <a class="fk-link" href={o.link.href}>{o.link.label} <span aria-hidden="true">→</span></a>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
