<!--
  THE LOOM PROTOCOL — three MCP servers, private beta, access by request.

  MCP (Model Context Protocol) is how an AI client — Claude, Cursor, an agent
  a client already runs — plugs into an outside system. This section presents
  three LOOM servers as the studio's most technical product shelf: a brand
  server, the Machine as tools, and the 3D/AR room server.

  IT IS A GATE, NOT A DOWNLOAD. Nothing here links to an endpoint. Every card
  shows the shape of the config with the host and the key redacted, and the
  only action is "Request access", which opens an inline signup (name, work
  email, company, what they'd wire it to) and hands the request to the studio's
  existing contact routes — WhatsApp deep link, mailto fallback. There is no
  backend on this site and this section does not pretend otherwise: the form
  composes a message, it does not POST anywhere.

  HONESTY RULES kept here deliberately:
    - every card is labelled "Private beta" — none claims general availability
    - no seat counts, no queue positions, no uptime figures, no testimonials
    - the redacted key is visibly a placeholder (•), never a plausible token

  REWORK — 11 Aug 2026, "it eats several screens":
  The rack (three full-width units, each a big photographic plate + paragraph +
  endpoint + CTA + a bordered TOOLS column) ran to three viewports and the
  flipped unit's TOOLS rail landed on top of the PRIVATE BETA badge. It is now
  a COMPACT CARD GRID — two across on desktop, one on a phone — where every
  card is the same shape, so nothing alternates and nothing can collide.

  REWORK 2 — 12 Aug 2026, "make the images bigger and the section needs lil
  redesign" (client). What changed and why:

    - THE PLATE WAS A DECORATION PRETENDING TO BE AN ILLUSTRATION. A 56px
      square thumbnail with a numeral badge in its corner reads as an icon,
      not a picture. It is now a full-bleed 16:9 header on every card (the
      -480 variant, not -160 — a card this wide earns the bigger asset) with
      the numeral surviving as a large mark burned into the image itself
      instead of a corner tag, so the photograph is the first thing the eye
      lands on, the way the client asked.
    - HIERARCHY WAS FLAT: logo row, blurb, chips, URL, button all reading at
      the same weight. The endpoint line — the most technical, most credible
      fact on the card — used to sit as a dashed-border footnote below the
      chips. It now sits directly under the blurb, boxed solid, bold slug,
      ahead of the chips: the thing that proves this is a real server leads,
      the tool list (already legible as chip titles) follows quieter.
    - THE REDACTION LOOKED LIKE A RENDERING BUG (a faint see-through rectangle)
      rather than a deliberate act. It is now a diagonal hatch fill — the
      universal "this is classified, on purpose" mark — so it reads as the
      studio choosing to withhold the host, not as broken CSS.
    - THE FOURTH PANEL IS A DIFFERENT KIND OF THING. Three cards are servers
      with a photographed product; the fourth is an invitation with nothing to
      photograph. Giving it a header block anyway — the section's own
      three-yarn stripe (the same repeating-linear-gradient the top rail
      uses) instead of a photograph — keeps the 2×2 square while making the
      difference visible at a glance: three plates, one signature.

  The plates survive as the header photograph, the tool descriptions survive
  as each chip's title, and the "need one that doesn't exist yet?" strip is
  still the fourth cell of the same grid. Every factual claim in the copy is
  the claim it was before — nothing reworded, nothing new asserted.

  LEAD STATEMENT ON TOP (client, explicit): "WE HAVE OUR OWN MCP" is the very
  first thing in the section, above the headline, with the section's own name
  demoted to the eyebrow beside it.

  COST: no @keyframes at rest. Entry is one-shot (SplitWords / use:reveal);
  the card lift, the chip hover, the lock-lift and the gate's state swap are
  transitions, played once per change, never looping. The page already carries
  two WebGL layers — see CLAUDE.md.
-->
<script>
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { BRAND } from '$data/site.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import './loommcp.css'

  const SERVERS = [
    {
      id: 'atelier',
      n: '01',
      name: 'ATELIER',
      slug: 'loom-atelier',
      role: 'Brand context server',
      line: 'The brand as data, not a style guide to remind it of — tokens, tone and approved lockups, read live. A model that drifts gets corrected by the source.',
      tools: [
        ['brand.tokens', 'colour, type and spacing, as data'],
        ['brand.voice', 'tone rules + the banned-words list'],
        ['asset.find', 'the right lockup for the placement'],
        ['copy.check', 'flags a line that is off-brand, and why'],
      ],
      photo: 'atelier',
      accent: 'var(--yarn-pink)',
      yarn: 'magenta',
    },
    {
      id: 'machine',
      n: '02',
      name: 'MACHINE',
      slug: 'loom-machine',
      role: 'Content production server',
      line: 'The Machine, exposed as tools — plan, draft, render, queue, from wherever you already sit. Nothing ships until an editor releases it.',
      tools: [
        ['month.plan', 'a month of posts from one brief'],
        ['post.draft', 'AR + EN copy for a single slot'],
        ['post.render', 'the frame, at the brand’s art direction'],
        ['queue.release', 'ships only what an editor approved'],
      ],
      photo: 'machine',
      accent: 'var(--yarn-violet)',
      yarn: 'violet',
    },
    {
      id: 'room',
      n: '03',
      name: 'ROOM',
      slug: 'loom-room',
      role: '3D & AR server',
      line: 'A photo goes in, a mesh comes out — staged in a room the customer can walk around on their phone. Ask for it in a sentence instead of booking a render.',
      tools: [
        ['mesh.from_photo', 'one still → a clean, scaled mesh'],
        ['room.stage', 'places the piece, lights it, frames it'],
        ['ar.link', 'a shareable AR view, no app'],
        ['catalogue.sync', 'pushes the set to the store'],
      ],
      photo: 'room',
      accent: 'var(--yarn-blue)',
      yarn: 'blue',
    },
  ]

  // Gate state per server (shut → form → sent) and its form fields — keyed by
  // server id rather than one shared object, since the three units are
  // independent: opening ATELIER's form must not touch MACHINE's.
  let states = $state(Object.fromEntries(SERVERS.map((s) => [s.id, { value: 'shut', email: '' }])))
  let forms = $state(Object.fromEntries(SERVERS.map((s) => [s.id, { name: '', email: '', company: '', use: '' }])))

  // Svelte 5's useId equivalent — one stable id per component instance, then
  // namespaced per server below so three units on the page never collide.
  const uid = $props.id()
</script>

<!-- The config every MCP client takes, with the two things access buys — the
     host and the key — struck out. Rendered as text, not a copy target:
     there is nothing here to paste yet, and a copy button would say
     otherwise. ONE LINE, not the nine-line mcpServers block this started as:
     a redacted config cannot be pasted, so its only job is to say "this is a
     real MCP endpoint", and the slug plus the host says that in a fifth of
     the height. -->
{#snippet configBlock(s)}
  <p class="mcp-config" aria-label="Endpoint for {s.slug}, host redacted until access is granted">
    <code class="mcp-config-slug">{s.slug}</code>
    <span class="mcp-config-arrow" aria-hidden="true">→</span>
    <code class="mcp-config-url">
      https://<i class="mcp-redact">••••••</i>.loomstudio-jo.com/mcp
    </code>
  </p>
{/snippet}

{#snippet accessForm(s, fieldUid, onDone)}
  {@const f = forms[s.id]}
  {@const submit = (e) => {
    e.preventDefault()
    const body = [
      `LOOM ${s.name} — MCP access request`,
      ``,
      `Server:  ${s.slug}`,
      `Name:    ${f.name}`,
      `Email:   ${f.email}`,
      `Company: ${f.company || '—'}`,
      ``,
      `Wiring it to: ${f.use || '—'}`,
    ].join('\n')
    // No backend on this site — the request leaves through the same two
    // routes every other CTA uses. WhatsApp in a new tab, mailto as the
    // fallback for anyone who blocks it.
    window.open(`${BRAND.whatsapp}?text=${encodeURIComponent(body)}`, '_blank', 'noopener')
    onDone(f.email)
  }}
  <form class="mcp-form" onsubmit={submit}>
    <div class="mcp-field">
      <label for="{fieldUid}-n">Name</label>
      <input id="{fieldUid}-n" required bind:value={f.name} autocomplete="name" placeholder="Who's asking" />
    </div>
    <div class="mcp-field">
      <label for="{fieldUid}-e">Work email</label>
      <input id="{fieldUid}-e" required type="email" bind:value={f.email} autocomplete="email" placeholder="you@company.com" />
    </div>
    <div class="mcp-field">
      <label for="{fieldUid}-c">Company</label>
      <input id="{fieldUid}-c" bind:value={f.company} autocomplete="organization" placeholder="Optional" />
    </div>
    <div class="mcp-field">
      <label for="{fieldUid}-u">Wire it to</label>
      <input id="{fieldUid}-u" bind:value={f.use} placeholder="Claude, Cursor, your own agent…" />
    </div>
    <div class="mcp-form-foot">
      <div class="magnetic" use:magnetic>
        <WoolButton label="Request access" yarn={s.yarn} type="submit" size="small" />
      </div>
      <p class="mcp-form-note">
        Goes straight to the studio — no list, no drip. Keys are issued by hand.
      </p>
    </div>
  </form>
{/snippet}

<!--
  ——— a server card ———
  ONE SHAPE, repeated, now in two blocks: a full-bleed photograph (the media
  the client asked to see bigger) and a padded body. The head inside the body
  is a two-item flex row — titles, badge — instead of the old three-column
  grid, because the thumb that used to need its own track lives in the media
  block now; PRIVATE BETA still cannot land on top of anything since it has
  nothing beside it but the (short, single-line) role.

  ORDER INSIDE THE BODY changed too: line → config → chips, not line → chips
  → config. The endpoint is the card's one fact nobody could dispute, so it
  now outranks the tool-name chips instead of sitting under them.

  EVERYTHING FUNCTIONAL IS UNTOUCHED — configBlock, accessForm, the three gate
  states and their swap keep their markup and class names, so the honesty
  rules at the top of this file (redacted host, private-beta label, no
  endpoint) survive this rework exactly as written.
-->
{#snippet serverCard(s, i)}
  {@const state = states[s.id]}
  <article
    class="mcp-card is-{state.value}"
    style="--accent: {s.accent}"
    use:reveal={{ delay: i * 0.05, y: 28 }}
  >
    <!-- THE MEDIA. Full-bleed 16:9, not a 56px corner thumbnail — this is the
         card's lead element now. It still degrades honestly: a dyed tile in
         the server's own accent sits underneath so a render that is missing,
         blocked or still loading reads as a coloured plate, not a hole. The
         -480 variant replaces -160 — a header this wide earns the bigger
         asset; -160 was sized for a 56px box that no longer exists. -->
    <div class="mcp-media">
      <picture>
        <source type="image/avif" srcset="/img/mcp/{s.photo}-480.avif" />
        <img
          class="mcp-media-img"
          src="/img/mcp/{s.photo}-480.webp"
          alt=""
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          onerror={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </picture>
      <span class="mcp-media-n" aria-hidden="true">{s.n}</span>
    </div>

    <div class="mcp-body">
      <header class="mcp-card-head">
        <div class="mcp-titles">
          <h3 class="mcp-name">
            <span class="mcp-name-pre">LOOM</span>{s.name}
          </h3>
          <p class="mcp-role">{s.role}</p>
        </div>

        <span class="mcp-beta">Private beta</span>
      </header>

      <p class="mcp-line">{s.line}</p>

      {@render configBlock(s)}

      <ul class="mcp-chips" aria-label="Tools {s.name} exposes">
        {#each s.tools as [t, d] (t)}
          <li><code title={d}>{t}</code></li>
        {/each}
      </ul>

      <div class="mcp-gate">
        {#if state.value === 'shut'}
          <button
            type="button"
            class="mcp-unlock"
            onclick={() => (state.value = 'form')}
            in:fly={{ y: 6, duration: 300, easing: cubicOut }}
            out:fly={{ y: -6, duration: 300, easing: cubicOut }}
          >
            <span class="mcp-unlock-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7">
                <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
                <path class="mcp-shackle" d="M8 10.5V7.6a4 4 0 0 1 7.8-1.3" />
              </svg>
            </span>
            Request access
          </button>
        {:else if state.value === 'form'}
          <div in:fly={{ y: 6, duration: 300, easing: cubicOut }} out:fly={{ y: -6, duration: 300, easing: cubicOut }}>
            {@render accessForm(s, `${uid}-${s.id}`, (email) => { state.email = email; state.value = 'sent' })}
          </div>
        {:else}
          <p class="mcp-sent" role="status" in:fly={{ y: 0, duration: 350, easing: cubicOut }}>
            <b>Request in.</b> If it fits, the key and the real host come back
            to {state.email || 'your inbox'} by hand — usually the same week.
          </p>
        {/if}
      </div>
    </div>
  </article>
{/snippet}

<section class="mcp" id="mcp">
  <span class="mcp-rail" aria-hidden="true"></span>

  <div class="mcp-head">
    <!-- THE LEAD STATEMENT, first thing in the section (client, explicit).
         The section's own name is the eyebrow beside it, not above it. -->
    <p class="mcp-claim-row" use:reveal={{ delay: 0, y: 14 }}>
      <span class="mcp-claim"><i aria-hidden="true"></i>We have our own MCP</span>
      <span class="mcp-eyebrow">The LOOM Protocol</span>
    </p>
    <SplitWords as="h2" class="h2 mcp-shout" text="PLUG YOUR AI INTO THE STUDIO" />
    <p class="lede mcp-lede" use:reveal={{ delay: 0.1 }}>
      Three servers. Point Claude, Cursor or your own agent at one and the
      studio's tools show up inside it — private beta, issued by hand.
    </p>
  </div>

  <!-- Two across on desktop, one on a phone. The "need one that doesn't
       exist yet?" card is the fourth cell of this same grid, which is what
       squares the 2×2 off and what removed the full-width strip that used to
       sit under it. -->
  <div class="mcp-grid">
    {#each SERVERS as s, i (s.id)}
      {@render serverCard(s, i)}
    {/each}

    <!-- THE FOURTH PANEL IS NOT A SERVER — an invitation has nothing to
         photograph, so instead of a plate it wears the section's own mark:
         the same three-yarn repeating-linear-gradient the top rail runs.
         Three photographed products, one studio signature — the difference
         between "server" and "come talk to us" is visible before either
         panel is read. -->
    <article class="mcp-card mcp-card--ask" use:reveal={{ delay: 0.15, y: 28 }}>
      <div class="mcp-ask-media" aria-hidden="true">
        <span class="mcp-ask-plus">+</span>
      </div>
      <div class="mcp-body">
        <h3 class="mcp-ask-h">Need one that doesn’t exist yet?</h3>
        <p class="mcp-ask-p">
          Half of what the studio builds started as “can it just talk to our
          system?” Tell us what your team asks for twice a week and we will
          tell you whether it is a server.
        </p>
        <a
          class="mcp-mail"
          href="mailto:{BRAND.email}?subject={encodeURIComponent('LOOM — MCP access')}"
        >
          {BRAND.email}
        </a>
      </div>
    </article>
  </div>
</section>
