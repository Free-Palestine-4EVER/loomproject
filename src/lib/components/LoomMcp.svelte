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

  REWORK (client: "smaller, more direct, more animation"): the pitch used to
  run two paragraphs before a reader reached the cards — cut to one line, and
  the second paragraph's job (private beta, hand-issued) now doubles as the
  tail of that same sentence instead of a separate block. Card `line` copy is
  trimmed the same way — same claims, fewer words carrying them.

  THE CONNECTOR (<Connector>, below) replaces the cut paragraph with a
  picture of the claim instead of a restatement of it: "your agent" branching
  into the three servers. It is why the section needed less text, not just
  smaller text. Ported but, exactly as in the React build, mounted by
  nothing — see the comment above `.mcp-rack` at the bottom of this file.

  COST: no @keyframes at rest. Entry is one-shot (SplitWords / use:reveal /
  Connector's branches); the card's lock-lift and the gate's state swap are
  transitions, played once per state change, never looping. The page already
  carries two WebGL layers — see CLAUDE.md.
-->
<script>
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { BRAND } from '$data/site.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import { webpSrcset, variantsFor } from './Pic.svelte'

  const avifSrcset = (src) => {
    const set = variantsFor(src)
    return set ? set.variants.map((v) => `${v.avif} ${v.w}w`).join(', ') : undefined
  }
  // `.mcp-plate` never exceeds ~320px even on a wide desktop (it is a fixed
  // fraction of a max-width card, not the viewport); measured 900px source
  // into a 280px box at 1440/DPR2. Same >720px-only caveat as the footer
  // tree: the `-sm` <source> above wins under that width.
  const PLATE_SIZES = '(max-width: 1000px) 40vw, 320px'
  import './loommcp.css'

  const SERVERS = [
    {
      id: 'atelier',
      n: '01',
      name: 'ATELIER',
      slug: 'loom-atelier',
      role: 'Brand context server',
      line: 'The brand as data, not a style guide to remind it of — tokens, tone, approved lockups, read live. A model that drifts gets corrected by the source.',
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
      line: 'The Machine, exposed as tools — plan, draft, render, queue, from wherever the client already sits. Nothing ships until an editor releases it.',
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
      line: 'A photo goes in, a mesh comes out, staged in a room the customer can walk around on their phone — ask for it in a sentence instead of booking a render.',
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

<!--
  ——— the connector ——————————————————————————————————————————
  Replaces the paragraph the earlier rework cut: instead of telling a reader
  "point your agent at one and it becomes tools inside it", this SHOWS it — a
  node for the reader's agent, branching into the three servers below,
  coloured to match each card's accent so the line the eye follows down is
  the same colour the card lands in. One-shot on scroll-into-view.

  scaleX only (never width/flex-basis): a growing line is a transform, which
  is the one thing this section is allowed to animate at scroll-cost. The dot
  at the end is a static ::after — nothing about it moves independently, it
  just appears where the line's edge stops.

  Kept, exactly as the React file kept it, mounted by nothing — see the note
  above `.mcp-rack` below.
-->
{#snippet connector()}
  <div class="mcp-connector" aria-hidden="true">
    <span class="mcp-connector-node">your agent</span>
    <div class="mcp-connector-branches">
      {#each SERVERS as s, i (s.id)}
        <span
          class="mcp-connector-branch"
          style="--accent: {s.accent}"
          use:reveal={{ delay: 0.1 + i * 0.03, y: 0 }}
        ></span>
      {/each}
    </div>
  </div>
{/snippet}

<!-- The config every MCP client takes, with the two things access buys — the
     host and the key — struck out. Rendered as text, not a copy target:
     there is nothing here to paste yet, and a copy button would say
     otherwise. -->
{#snippet configBlock(s)}
  <!-- ONE LINE, not the nine-line mcpServers block this started as. That
       block was the tallest thing in the card and pushed the section past a
       viewport and a half on 1440x900 — which is the "make it smaller" note.
       Nothing is lost: a redacted config cannot be pasted, so its only job
       was to say "this is a real MCP endpoint", and the slug plus the host
       says that in a fifth of the height. -->
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
    <div class="mcp-field mcp-field--wide">
      <label for="{fieldUid}-u">What would you wire it to?</label>
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
  ——— a rack unit ———
  Was one of three identical outlined cards in a 3-up grid — the same shape as
  Studios, the Lab, Apps and the old Process, and the reason this section read
  as templated. Each server is a full-width unit in a rack: a photographed
  plate, the name at display scale, and its four tools as a real monospace
  list rather than a bulleted one. Units alternate which side the plate sits
  on, so three of them read as a stack rather than as a repeated row.

  EVERYTHING FUNCTIONAL IS UNTOUCHED from the React build — ConfigBlock,
  AccessForm, the three gate states and their state swap all keep their
  markup and class names, so the honesty rules at the top of this file
  (redacted host, private-beta label, no endpoint) survive the port exactly
  as written.
-->
{#snippet serverCard(s, i)}
  {@const state = states[s.id]}
  <article
    class="mcp-unit is-{state.value} {i % 2 ? 'is-flipped' : ''}"
    style="--accent: {s.accent}"
    use:reveal={{ delay: i * 0.03, y: 44 }}
  >
    <!-- THE PLATE. The photograph degrades honestly: the plate carries a
         dyed gradient of the server's own accent underneath, so a missing or
         still-loading render reads as a coloured plate rather than as a
         broken box. AVIF first, then WebP, in BOTH the phone and the desktop
         branch: one <source> per format per breakpoint, since a browser
         takes the first <source> whose media AND type it can use.
         Width/height are the real encoded dimensions, so the plate reserves
         its box before the bytes land instead of reflowing the unit beside
         it. -->
    <div class="mcp-plate">
      <picture>
        <source media="(max-width: 720px)" type="image/avif" srcset="/img/mcp/{s.photo}-sm.avif" />
        <source media="(max-width: 720px)" type="image/webp" srcset="/img/mcp/{s.photo}-sm.webp" />
        <source type="image/avif" srcset={avifSrcset(`/img/mcp/${s.photo}.webp`)} sizes={PLATE_SIZES} />
        <source type="image/webp" srcset={webpSrcset(`/img/mcp/${s.photo}.webp`)} sizes={PLATE_SIZES} />
        <img
          class="mcp-plate-img"
          src="/img/mcp/{s.photo}.webp"
          alt=""
          width={900}
          height={502}
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          onerror={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </picture>
      <span class="mcp-plate-n" aria-hidden="true">{s.n}</span>
    </div>

    <div class="mcp-main">
      <header class="mcp-unit-head">
        <h3 class="mcp-name">
          <span class="mcp-name-pre">LOOM</span> {s.name}
        </h3>
        <p class="mcp-role">{s.role}</p>
        <span class="mcp-beta">Private beta</span>
      </header>

      <p class="mcp-line">{s.line}</p>

      <div>{@render configBlock(s)}</div>

      <div class="mcp-gate">
        {#if state.value === 'shut'}
          <button
            type="button"
            class="mcp-unlock"
            onclick={() => (state.value = 'form')}
            in:fly={{ y: 8, duration: 350, easing: cubicOut }}
            out:fly={{ y: -8, duration: 350, easing: cubicOut }}
          >
            <span class="mcp-unlock-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
                <path class="mcp-shackle" d="M8 10.5V7.6a4 4 0 0 1 7.8-1.3" />
              </svg>
            </span>
            Request access
          </button>
        {:else if state.value === 'form'}
          <div in:fly={{ y: 8, duration: 350, easing: cubicOut }} out:fly={{ y: -8, duration: 350, easing: cubicOut }}>
            {@render accessForm(s, `${uid}-${s.id}`, (email) => { state.email = email; state.value = 'sent' })}
          </div>
        {:else}
          <p class="mcp-sent" role="status" in:fly={{ y: 0, duration: 400, easing: cubicOut }}>
            <b>Request in.</b> If it fits, the key and the real host come back
            to {state.email || 'your inbox'} by hand — usually the same week.
          </p>
        {/if}
      </div>
    </div>

    <!-- the tools, as a rack label rather than a bulleted list -->
    <div class="mcp-toolwrap">
      <p class="mcp-tools-label">Tools</p>
      <ul class="mcp-tools">
        {#each s.tools as [t, d] (t)}
          <li>
            <code>{t}</code>
            <span>{d}</span>
          </li>
        {/each}
      </ul>
    </div>
  </article>
{/snippet}

<section class="mcp" id="mcp">
  <span class="mcp-rail" aria-hidden="true"></span>

  <div class="mcp-head">
    <p class="kicker"><span>—</span> The LOOM Protocol</p>
    <SplitWords as="h2" class="h2 mcp-shout" text="PLUG YOUR AI INTO THE STUDIO" />
    <p class="lede mcp-lede" use:reveal={{ delay: 0.15 }}>
      Three MCP servers. Point Claude, Cursor or your own agent at one and
      the studio's tools show up inside it — private beta, issued by hand.
    </p>
  </div>

  <!-- The <Connector> branch diagram (the `connector` snippet above) was
       removed from the page with the redesign: it existed to picture "your
       agent branches into three servers" in place of a paragraph the earlier
       rework cut. The rack does that on its own — three units, each with its
       own endpoint line — and keeping both meant two diagrams of one idea
       stacked on each other. The snippet is still defined above, rendered by
       nothing, exactly as the React file's <Connector> function was still
       defined but unmounted. -->
  <div class="mcp-rack">
    {#each SERVERS as s, i (s.id)}
      {@render serverCard(s, i)}
    {/each}
  </div>

  <div class="mcp-strip" use:reveal={{ delay: 0.1 }}>
    <div class="mcp-strip-copy">
      <h3 class="mcp-strip-h">Need one that doesn’t exist yet?</h3>
      <p class="mcp-strip-p">
        Half of what the studio builds started as “can it just talk to our
        system?” Tell us what your team asks for twice a week and we will
        tell you whether it is a server.
      </p>
    </div>
    <div class="mcp-strip-cta">
      <a
        class="mcp-mail"
        href="mailto:{BRAND.email}?subject={encodeURIComponent('LOOM — MCP access')}"
      >
        {BRAND.email}
      </a>
    </div>
  </div>
</section>
