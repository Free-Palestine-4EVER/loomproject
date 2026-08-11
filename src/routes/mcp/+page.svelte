<!--
  /mcp — The LOOM Protocol, as its own page.

  WHY THIS IS NOT `<LoomMcp />` ANY MORE. The route used to mount the home
  page's section and close with the shuttle band and the contact form. The
  section is a COMPACT CARD GRID by explicit instruction — it was reworked on
  11 Aug 2026 because as a full-width rack it "ate several screens" of the home
  page, so each server is now a 56px thumb, two lines of copy, four tool chips
  whose descriptions live in a `title` attribute, and one small CTA.

  That is the right object inside a long page and the wrong one here. This is
  the page a technical reader opens BECAUSE they want the detail: so each
  server gets a full block, and the four tool descriptions that are a tooltip
  in the section are a visible column here — a `title` attribute is invisible
  on a touch screen and to most assistive tech, which makes it the wrong place
  for the only text explaining what a tool does.

  And it opens with the thing a reader who has never met the acronym needs:
  what an MCP server actually is, in plain language, before a single product
  name.

  ───────────────────────────────────────────────────────────────────────────
  THE HONESTY RULES ARE THE SECTION'S, KEPT WORD FOR WORD:

    · PRIVATE BETA, ISSUED BY HAND. Every server block carries the label, the
      page says it in the hero, in the access section and in the meta
      description, and NOTHING on this page is self-serve. There is no signup,
      no "get started", no console, no key in any state.
    · NOTHING LINKS TO AN ENDPOINT. The host is redacted with a visible
      placeholder (•) that could never be mistaken for a token, exactly as the
      section renders it. There is no copy button, because there is nothing
      here to paste.
    · NO SEAT COUNTS, NO QUEUE POSITIONS, NO UPTIME FIGURES, NO TESTIMONIALS,
      no launch date and no roadmap. The only status any server has on this
      page is "private beta".
    · ACCESS IS A CONVERSATION. The two routes out are the studio's existing
      ones — WhatsApp and email, both from $data/site.js — and both are
      composed messages, not form posts. There is no backend on this site and
      this page does not pretend otherwise.

  THE SERVER DATA IS THE SECTION'S, VERBATIM. LoomMcp.svelte holds SERVERS in
  a local const rather than exporting it, and that component is not this
  page's to edit; if it ever exports it, this array becomes the import. Every
  name, role, sentence, tool and tool description below is copied unchanged —
  nothing is added, and in particular no tool exists here that does not exist
  there.
  ───────────────────────────────────────────────────────────────────────────
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { BRAND } from '$data/site.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import Bolt from '$components/Bolt.svelte'
  import Contact from '$components/Contact.svelte'
  import '../route-page.css'
  import './mcp-page.css'

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

  /* ——— WHAT AN MCP IS, FOR SOMEBODY WHO HAS NEVER MET THE ACRONYM ———
     Three plain paragraphs describing the protocol itself, not LOOM's use of
     it. Nothing here is a claim about the studio, and nothing about the
     protocol is asserted beyond what the section already states: MCP is how
     an AI client — Claude, Cursor, an agent a client already runs — plugs
     into an outside system, a server exposes named tools that the assistant
     can call, and pointing a client at one is a line of configuration. */
  const PRIMER = [
    {
      n: '01',
      q: 'What it is',
      a: 'MCP stands for Model Context Protocol. It is a common way for an AI client — Claude, Cursor, or an agent your own team runs — to plug into a system that sits outside it. Before a protocol like this, connecting an assistant to anything meant writing a bespoke integration per assistant.',
    },
    {
      n: '02',
      q: 'What a server does',
      a: 'A server publishes a small set of named tools. The assistant can see what each one is for, decide when to call it, pass it arguments and read what comes back — so “make me the January grid” becomes a real call against a real system rather than a paragraph of plausible text.',
    },
    {
      n: '03',
      q: 'What you do with one',
      a: 'You point your client at the server’s address and give it a key. From then on the tools appear inside the assistant you already use — nothing is installed, nothing moves to a new interface, and the work happens where your team is already working.',
    },
  ]

  // Composed, not posted — there is no backend on this site. Both routes are
  // the studio's existing ones, from $data/site.js.
  const SUBJECT = 'LOOM Protocol — MCP access request'
  const BODY = [
    'LOOM Protocol — MCP access request',
    '',
    'Server(s) of interest:',
    'Name:',
    'Company:',
    'Wiring it to (Claude, Cursor, your own agent…):',
  ].join('\n')
  const mailHref = `mailto:${BRAND.email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`
  const waHref = `${BRAND.whatsapp}?text=${encodeURIComponent(BODY)}`

  const DESC = `The LOOM Protocol is ${SERVERS.length} MCP servers — brand context, content production, and 3D & AR — that put the studio's tools inside the AI client your team already uses. Private beta: keys are issued by hand, there is no self-serve signup.`
</script>

<svelte:head>
  <title>The LOOM Protocol — MCP Servers for Agencies and Brands</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/mcp" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/mcp" />
  <meta property="og:title" content="The LOOM Protocol — MCP Servers for Agencies and Brands" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="The LOOM Protocol — MCP Servers for Agencies and Brands" />
  <meta name="twitter:description" content={DESC} />
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. THE CLAIM ════════════════════════════════════════════════ -->
  <header class="mp-hero">
    <div class="mp-hero-in">
      <p class="mp-claim-row" use:reveal={{ delay: 0, y: 14 }}>
        <span class="mp-claim"><i aria-hidden="true"></i>We have our own MCP</span>
        <span class="mp-eyebrow">The LOOM Protocol</span>
      </p>
      <SplitWords as="h1" class="h2 mp-h1" text="Plug your AI into the studio" />
      <p class="lede mp-hero-lede" use:reveal={{ delay: 0.1 }}>
        {SERVERS.length} servers. Point Claude, Cursor or your own agent at one
        and the studio’s tools show up inside it — a brand that answers back,
        a content machine you can call, and a 3D room you can ask for in a
        sentence.
      </p>

      <p class="mp-gate-line" use:reveal={{ delay: 0.16 }}>
        <span class="mp-beta">Private beta</span>
        <span>
          Keys are issued by hand. There is no signup on this page, no console
          and no free tier — you ask, a person reads it, and if it fits you get
          the host and a key back.
        </span>
      </p>

      <ul class="mp-jump" use:reveal={{ delay: 0.2 }}>
        {#each SERVERS as s (s.id)}
          <li style="--accent: {s.accent}">
            <a href="#srv-{s.id}">
              <b>LOOM{s.name}</b>
              <span>{s.role}</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </header>

  <!-- ═══ 2. WHAT AN MCP IS ═══════════════════════════════════════════ -->
  <section class="mp-primer" aria-labelledby="mp-primer-h">
    <div class="mp-sec-head">
      <p class="kicker"><span>—</span> Plain language</p>
      <h2 class="h2 mp-h2" id="mp-primer-h">If you have never met the acronym</h2>
      <p class="mp-sec-lede">
        Nothing below is about LOOM. It is what the protocol is, so the three
        servers after it are readable without a glossary.
      </p>
    </div>

    <div class="mp-primer-grid">
      {#each PRIMER as p, i (p.n)}
        <article class="mp-primer-card" use:reveal={{ delay: i * 0.05, y: 20 }}>
          <p class="mp-primer-n">{p.n}</p>
          <h3 class="mp-primer-q">{p.q}</h3>
          <p class="mp-primer-a">{p.a}</p>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══ 3. THE SERVERS ══════════════════════════════════════════════ -->
  <section class="mp-servers" aria-labelledby="mp-servers-h">
    <div class="mp-sec-head">
      <p class="kicker"><span>—</span> The servers</p>
      <h2 class="h2 mp-h2" id="mp-servers-h">Three, and what each one is for</h2>
      <p class="mp-sec-lede">
        Every tool is listed with what it does — no tooltips, nothing behind a
        hover. The address each server answers on is shown with the host
        struck out, because the host and the key are the two things access
        actually buys.
      </p>
    </div>

    {#each SERVERS as s, i (s.id)}
      <article
        class="mp-server"
        id="srv-{s.id}"
        style="--accent: {s.accent}"
        use:reveal={{ delay: Math.min(i, 3) * 0.05, y: 24 }}
      >
        <header class="mp-server-head">
          <!-- The photograph degrades honestly: a dyed square in the server's
               own accent sits underneath, so a render that is missing or
               blocked reads as a coloured tile rather than a hole. -->
          <span class="mp-thumb">
            <picture>
              <source type="image/avif" srcset="/img/mcp/{s.photo}-160.avif" />
              <img
                class="mp-thumb-img"
                src="/img/mcp/{s.photo}-160.webp"
                alt=""
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                onerror={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </picture>
            <span class="mp-thumb-n" aria-hidden="true">{s.n}</span>
          </span>

          <div class="mp-titles">
            <h3 class="mp-name"><span class="mp-name-pre">LOOM</span>{s.name}</h3>
            <p class="mp-role">{s.role}</p>
          </div>

          <span class="mp-beta mp-beta--card">Private beta</span>
        </header>

        <p class="mp-line">{s.line}</p>

        <div class="mp-tools">
          <p class="mp-tools-h">Tools it exposes <b>{s.tools.length}</b></p>
          <dl class="mp-tool-list">
            {#each s.tools as [t, d] (t)}
              <div class="mp-tool">
                <dt><code>{t}</code></dt>
                <dd>{d}</dd>
              </div>
            {/each}
          </dl>
        </div>

        <div class="mp-meta">
          <p class="mp-meta-block">
            <span class="mp-meta-label">Endpoint</span>
            <!-- Text, not a copy target: a redacted config cannot be pasted,
                 and a copy button would say otherwise. -->
            <span class="mp-config" aria-label="Endpoint for {s.slug}, host redacted until access is granted">
              <code class="mp-config-slug">{s.slug}</code>
              <span class="mp-config-arrow" aria-hidden="true">→</span>
              <code class="mp-config-url">https://<i class="mp-redact">••••••</i>.loomstudio-jo.com/mcp</code>
            </span>
          </p>

          <p class="mp-meta-block">
            <span class="mp-meta-label">Status</span>
            <span class="mp-status">
              <i aria-hidden="true"></i>
              Private beta — access issued by hand, one key at a time.
            </span>
          </p>
        </div>

        <div class="mp-server-foot">
          <a class="mp-ask" href={waHref} target="_blank" rel="noopener">
            Ask for LOOM{s.name} <span aria-hidden="true">→</span>
          </a>
          <span class="mp-server-foot-note">Goes to the studio on WhatsApp — no list, no drip.</span>
        </div>
      </article>
    {/each}
  </section>

  <!-- ═══ 4. HOW TO GET ONE ═══════════════════════════════════════════ -->
  <section class="mp-access" aria-labelledby="mp-access-h">
    <div class="mp-access-in">
      <div class="mp-access-copy" use:reveal>
        <p class="kicker"><span>—</span> Access</p>
        <h2 class="h2 mp-h2" id="mp-access-h">You ask, a person answers</h2>
        <p class="mp-sec-lede">
          There is no self-serve path and there is not going to be one while
          this is a beta. Tell us who you are and what you would wire it to;
          if it fits, the host and the key come back by hand.
        </p>

        <ol class="mp-steps">
          <li><b>Send a message</b> — WhatsApp or email, whichever you prefer.</li>
          <li><b>Say what you would wire it to</b> — Claude, Cursor, your own agent.</li>
          <li><b>A key comes back by hand</b>, with the real host, if it fits.</li>
        </ol>

        <div class="mp-access-cta">
          <a class="mp-btn mp-btn--wa" href={waHref} target="_blank" rel="noopener">
            Request access on WhatsApp
          </a>
          <a class="mp-btn" href={mailHref}>{BRAND.email}</a>
        </div>
        <p class="mp-access-note">
          Both open a message you can read before you send it. Nothing on this
          page posts anywhere — this site has no backend, and it is not going
          to pretend it does.
        </p>
      </div>

      <aside class="mp-ask-card" use:reveal={{ delay: 0.08 }}>
        <h3 class="mp-ask-h">Need one that doesn’t exist yet?</h3>
        <p class="mp-ask-p">
          Half of what the studio builds started as “can it just talk to our
          system?” Tell us what your team asks for twice a week and we will
          tell you whether it is a server.
        </p>
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label="Start a project"
            yarn="violet"
            onclick={() => wizard.open({ note: 'The LOOM Protocol — a server that does not exist yet' })}
          />
        </div>
      </aside>
    </div>
  </section>

  <Bolt />

  <Contact />
</div>
