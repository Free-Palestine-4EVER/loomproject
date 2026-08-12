<!--
  SOFTWARE — `#software`, the desktop half of "we ship it".

  RESTORED ON INSTRUCTION (12 Aug 2026): "instead of the 3d section place the
  mobile apps section and remove the 3d section totally, and below the mobile
  apps section put softwares section — the old one with the MacBook mockups."

  So: Forge (the 2D→3D band) is off the page entirely, AppsShowcase now sits in
  its slot, and this is the section directly under it. The pairing is the point
  — the stage above is eight products on phones, this is the two that are not
  phone products at all, on the hardware they actually run on. A desktop tool
  shown in a phone bezel is a lie about what it is, which is why these two were
  cut from SUITE rather than squeezed into that stage.

  WHY IT IS A PLAIN GRID AND NOT A SECOND SCROLL-DRIVEN STAGE. There are two
  items. The stage above earns its rail, its pinning and its scroll driver by
  having eight; running the same machinery for two would be a second scroll
  hijack on one page for a third of the content, and the reader has just come
  out of one. Two laptops side by side, both visible at once, nothing to
  operate — this section's job is "there is also this", not "explore this".

  THE MACBOOK IS THE SAME ONE THE STAGE USED TO DRAW: `.dv-mac` / `.dv-lid` /
  `.dv-base` from appscreens.css, CSS only, no frame image. Those rules never
  left the stylesheet when the software branch was cut from the component, so
  this restores the original mockup rather than inventing a new one — and it
  costs zero bytes of new asset.

  NOTHING HERE IS A CLAIM. `status` is "In the lab" for both because neither is
  downloadable by anyone; there is no store badge, no link, no user count. The
  two screenshots are the real tools' own captures (see suite.js's SOFTWARE
  note). If either ships, the link goes in the data and nowhere else.
-->
<script>
  import { SOFTWARE } from '$lib/data/suite.js'
  import SplitWords from '$lib/components/SplitWords.svelte'
  import { reveal } from '$lib/motion.svelte.js'
  import './appscreens.css'
</script>

<section class="sw" id="software" aria-label="Software LOOM is building">
  <div class="section-head">
    <p class="kicker"><span>—</span> Also in the studio</p>
    <SplitWords as="h2" class="h2" text="And the software behind them." />
    <div use:reveal={{ delay: 0.15 }}>
      <p class="lede" style="margin-top:22px">
        Not everything we build fits on a phone. These two are the tools the
        studio runs on — still in the lab, no downloads, shown exactly as they
        are.
      </p>
    </div>
  </div>

  <ul class="sw-grid">
    {#each SOFTWARE as it, i}
      <li class="sw-item" use:reveal={{ delay: 0.1 + i * 0.08 }}>
        <!-- The aura is the product's own two-colour gradient, the same pair
             the stage uses for this key — it is what ties a card here to the
             same product's tile up there without repeating its icon. -->
        <div
          class="sw-glow"
          aria-hidden="true"
          style="--a:{it.grad[0]}; --b:{it.grad[1]}"
        ></div>

        <div class="dv-mac">
          <div class="dv-lid">
            <span class="dv-cam" aria-hidden="true"></span>
            <div class="dv-screen">
              <img
                src={it.shot.src}
                width={it.shot.w}
                height={it.shot.h}
                loading="lazy"
                decoding="async"
                alt="{it.name} — desktop screenshot"
              />
            </div>
          </div>
          <div class="dv-base" aria-hidden="true"></div>
        </div>

        <div class="sw-meta">
          <h3 class="sw-name">{it.name}</h3>
          <p class="sw-tag">{it.tag}</p>
          <p class="sw-blurb">{it.blurb}</p>
          <p class="sw-status"><span aria-hidden="true"></span>{it.status}</p>
        </div>
      </li>
    {/each}
  </ul>
</section>

<style>
  .sw {
    position: relative;
    padding: clamp(56px, 7vw, 104px) clamp(20px, 5vw, 72px) clamp(64px, 8vw, 120px);
  }

  /* `--dv-h` is the token every device in appscreens.css sizes itself from
     (see that file's header — one token, so a resize never reflows the page
     around it). The stage sets its own; this section is a two-up grid rather
     than one centred hero, so it sets a smaller one. */
  .sw-grid {
    --dv-h: clamp(200px, 26vw, 320px);
    max-width: 1180px;
    margin: clamp(32px, 4vw, 56px) auto 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(28px, 4vw, 64px);
  }

  .sw-item { position: relative; }

  /* Behind the laptop, not around it: a soft bloom of the product's own
     colours so the two cards read as different products at a glance, without
     giving either a border, a panel or a card surface. */
  .sw-glow {
    position: absolute;
    z-index: -1;
    left: 50%;
    top: 8%;
    width: 92%;
    height: 78%;
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(60% 60% at 40% 40%, var(--a), transparent 70%),
      radial-gradient(60% 60% at 70% 65%, var(--b), transparent 72%);
    opacity: 0.28;
    filter: blur(38px);
    pointer-events: none;
  }

  .sw-meta { margin-top: clamp(16px, 2vw, 26px); }
  .sw-name {
    margin: 0;
    font-family: var(--bloom);
    font-weight: 620;
    font-size: clamp(1.2rem, 1.8vw, 1.55rem);
    line-height: 1.1;
    color: var(--ink);
  }
  .sw-tag {
    margin: 0.3rem 0 0;
    font-family: var(--display);
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .sw-blurb {
    margin: 0.65rem 0 0;
    max-width: 46ch;
    font-size: clamp(0.95rem, 1.1vw, 1.02rem);
    line-height: 1.55;
    color: var(--ink-dim);
  }
  /* The status is the only claim either card makes, so it is marked as one:
     a dot and a label, in ink range — never a store badge, because there is
     no store listing behind it. */
  .sw-status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0.8rem 0 0;
    padding: 0.22rem 0.6rem 0.22rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-family: var(--display);
    font-size: 0.64rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }
  .sw-status span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gold); /* amber, not green: neither of these is live, and a green dot on an unreleased tool is the smallest possible lie */
  }

  /* One column under 760px — two laptops side by side on a phone would put
     each screenshot at ~160px wide, which is smaller than the UI inside it. */
  @media (max-width: 760px) {
    .sw-grid {
      grid-template-columns: minmax(0, 1fr);
      --dv-h: clamp(180px, 52vw, 300px);
      max-width: 460px;
    }
  }
</style>
