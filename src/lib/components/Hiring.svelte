<!--
  WE ARE HIRING — the ninth chair.

  Client brief, verbatim: shorter and simpler, moved to just above the footer,
  and reframed around a reel instead of a CV — "show us your projects then
  what you studied." That ask sets the whole shape of this file: one short ask
  (reel first, big; education second, small), four roles reduced to name +
  discipline (the old per-card blurb + three-bullet "needs" list is gone —
  that was the CV instinct this section now argues against), and one visible
  way to actually send something.

  The empty-stage visual survives untouched: four lit stages, a felted `user`
  medallion standing in for the missing hire, the warp thread still hanging.
  That is the section's one piece of art direction and cutting copy around it
  only sharpens it — less to read before the eye lands on the empty mark.

  Roles are the studio's actual disciplines (motion, generative, web & app,
  3D/AR). Nothing here claims a salary, a headcount, a benefit or a funding
  fact — the only company facts used are BRAND's two cities and its real
  contact routes.

  COST: zero animations at rest — no @keyframes in hiring.css at all. Entry is
  one-shot (reveal / SplitWords) and every other move is a hover/focus
  transition. The page already carries two WebGL layers.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import WoolIcon from './WoolIcon.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import { BRAND } from '$data/site.js'
  import './hiring.css'

  // The four roles the client is actually hiring for. Named plainly, and each
  // line describes THAT job — nothing here states a salary, a seniority, a
  // contract or a benefit, because none of those are decided or published.
  //
  // REDESIGN (Aug 2026). The four cards used to be four copies of one object:
  // the same `user` medallion hung on the same dashed thread over the same
  // ghosted numeral, on the same washed pale-gradient panel. Four postings that
  // look identical say "template", which is the opposite of what a careers
  // section has to say. Each role now carries its own MATERIAL — one of the
  // four photographed knits, already in the asset set — and its own felted
  // tool: a phone for the one who calls, an eye for the one who looks, a
  // settings cog for the one who builds, a share graph for the one who spreads
  // it. `tex` and `icon` are what make card 3 not card 1.
  const ROLES = [
    {
      id: 'sales', n: '01', role: 'Sales', owns: 'New business', accent: 'var(--yarn-pink)',
      tex: 'knit-magenta', icon: 'phone',
      line: 'You find the people who need this and get them talking to us. Listening beats pitching.',
    },
    {
      id: 'designer', n: '02', role: 'Designer', owns: 'Brand, web & campaign', accent: 'var(--yarn-violet)',
      tex: 'knit-violet', icon: 'eye',
      line: 'You design brands, sites and campaigns end to end — and you can say why every choice is there.',
    },
    {
      id: 'engineer', n: '03', role: 'Software Engineer', owns: 'Web & app engineering', accent: 'var(--yarn-blue)',
      tex: 'knit-blue', icon: 'settings',
      line: 'You ship things people use. Front end, back end, whatever the build needs — and it has to feel right, not only run.',
    },
    {
      id: 'marketing', n: '04', role: 'Marketing Genius', owns: 'Content & growth', accent: 'var(--yarn-gold)',
      tex: 'knit-gold', icon: 'share-nodes',
      line: 'You know why one post travels and the next one dies. Bring the accounts you grew.',
    },
  ]

  const apply = (r) => wizard.open({ note: `Application — ${r.role} (${r.owns})` })
</script>

<section class="hire" id="hiring">
  <span class="hire-rail" aria-hidden="true"></span>

  <div class="hire-head">
    <p class="kicker"><span>—</span> Careers</p>
    <!-- The client's own words, set in the studio's own display face.
         A real <h2>: SplitWords keeps the aria-label intact. -->
    <SplitWords as="h2" class="h2 hire-shout" text="WE ARE HIRING" />

    <!-- The ask, in the order the client gave it: the reel is the big line,
         what you studied is the small one under it — not two ideas of
         equal weight, one instruction with a footnote. -->
    <div class="hire-ask" use:reveal={{ delay: 0.15 }}>
      <p class="hire-ask-primary">
        <b>Show us what you’ve made.</b> A reel, three links, whatever proves it —
        that comes first.
      </p>
      <p class="hire-ask-secondary">Then tell us what you studied.</p>
    </div>

    <p class="hire-count">
      <b>{String(ROLES.length).padStart(2, '0')}</b>
      <span>open roles</span>
      <i aria-hidden="true"></i>
      <span>{BRAND.cities[0]} &amp; {BRAND.cities[1]}</span>
    </p>
  </div>

  <div class="hire-grid">
    {#each ROLES as r, i (r.id)}
      <div class="hire-cell" use:reveal={{ delay: i * 0.06 }}>
        <article
          class="hire-card"
          style="--accent: {r.accent}; --tex: url('/img/wool/tex/{r.tex}.webp')"
        >
          <!-- THE MATERIAL. A band of this role's own knit, photographed, with
               the felted tool of the job pinned on the seam. No text sits on
               the knit — the only thing over it is the OPEN tag and the
               medallion, both of which paint their own opaque ground. -->
          <div class="hire-swatch" aria-hidden="true">
            <span class="hire-weft"></span>
          </div>

          <!-- outside .hire-swatch on purpose: the swatch clips its own
               texture layer, and the medallion has to hang past the seam -->
          <span class="hire-medal" aria-hidden="true">
            <WoolIcon name={r.icon} size="lg" />
          </span>

          <p class="hire-open"><i aria-hidden="true"></i>Open</p>

          <div class="hire-meta">
            <p class="hire-tag">
              <b>{r.n}</b>
              <span>{r.owns}</span>
            </p>
            <h3 class="hire-name">{r.role}</h3>
            <p class="hire-line">{r.line}</p>
          </div>

          <div class="hire-foot">
            <button type="button" class="hire-apply" onclick={() => apply(r)}>
              <span>Apply for {r.role}</span>
              <i aria-hidden="true">→</i>
            </button>
          </div>
        </article>
      </div>
    {/each}
  </div>

  <div class="hire-strip" use:reveal={{ delay: 0.1 }}>
    <div class="hire-strip-copy">
      <h3 class="hire-strip-h">None of the four? Send it anyway.</h3>
      <p class="hire-strip-p">One link to the work beats a page of adjectives.</p>
    </div>
    <div class="hire-strip-cta">
      <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
        <WoolButton
          label="Send your reel"
          yarn="violet"
          onclick={() => wizard.open({ note: 'Send your reel — LOOM crew' })}
        />
      </div>
      <a class="hire-mail" href="mailto:{BRAND.email}?subject={encodeURIComponent('LOOM — my reel')}">
        {BRAND.email}
      </a>
    </div>
  </div>
</section>
