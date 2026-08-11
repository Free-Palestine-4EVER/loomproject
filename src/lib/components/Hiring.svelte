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

  const ROLES = [
    { id: 'dyer', n: '01', role: 'The Dyer', owns: 'Motion & Colour', accent: 'var(--yarn-pink)' },
    { id: 'prompter', n: '02', role: 'The Prompter', owns: 'Generative Image & Film', accent: 'var(--yarn-violet)' },
    { id: 'stitcher', n: '03', role: 'The Stitcher', owns: 'Web & App Engineering', accent: 'var(--yarn-blue)' },
    { id: 'carver', n: '04', role: 'The Carver', owns: '3D, AR & CGI', accent: 'var(--yarn-gold)' },
  ]

  const apply = (r) => wizard.open({ note: `Reel — ${r.role} (${r.owns})` })
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
        <article class="hire-card" style="--accent: {r.accent}">
          <span class="hire-open">Open</span>

          <!-- The empty stage: a lit mark with the felted `user` medallion on
               it instead of a person, the role's number ghosted behind as the
               backdrop, and the warp thread still hanging with nothing tied
               on. Decorative — the role is named in the heading below. -->
          <div class="hire-stage" aria-hidden="true">
            <span class="hire-glow"></span>
            <span class="hire-ghost">{r.n}</span>
            <span class="hire-warp"></span>
            <span class="hire-ring">
              <WoolIcon name="user" size="lg" />
            </span>
            <span class="hire-ground"></span>
          </div>

          <div class="hire-meta">
            <span class="hire-index">{r.n}</span>
            <h3 class="hire-name">{r.role}</h3>
            <p class="hire-owns">{r.owns}</p>
          </div>

          <div class="hire-foot">
            <button type="button" class="hire-apply" onclick={() => apply(r)}>
              Send reel for {r.role}
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
