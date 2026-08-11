<script>
  // ——— THE LAB — three designs per section, side by side, for picking ———
  //
  // The registry is a glob, not a hand-written list: every agent that adds a
  // section drops files at src/lib/lab/<Section>/V<n>.svelte and they appear
  // here on the next build with nothing to wire up. Eager, because this page
  // is a gallery — everything on it is meant to be seen, so there is no
  // laziness to win and a lazy import would only add a flash per variant.
  //
  // (Globbing *source* is fine. The prohibition in machineWork.js is about
  // globbing anything under public/ — that double-bundles the asset. These are
  // components Vite already owns.)
  const modules = import.meta.glob('$lib/lab/*/V*.svelte', { eager: true })

  // The homepage's real running order, so the lab reads top-to-bottom the way
  // the site does rather than alphabetically.
  const ORDER = [
    'Hero', 'Proof', 'TypeShowcase', 'Work', 'Solutions', 'OfferPair',
    'Pricing', 'TheMachine', 'AnswerEngine', 'WorkshopsPromo', 'Forge',
    'AppsShowcase', 'LoomMcp', 'Studios', 'Bolt', 'Faq', 'Contact', 'Hiring',
  ]

  const sections = (() => {
    const bag = new Map()
    for (const [path, mod] of Object.entries(modules)) {
      const m = path.match(/\/lab\/([^/]+)\/V(\d+)\.svelte$/)
      if (!m) continue
      const [, name, n] = m
      if (!bag.has(name)) bag.set(name, [])
      bag.get(name).push({ n: Number(n), Component: mod.default })
    }
    for (const list of bag.values()) list.sort((a, b) => a.n - b.n)
    return [...bag.entries()]
      .map(([name, variants]) => ({ name, variants }))
      .sort((a, b) => {
        const ia = ORDER.indexOf(a.name), ib = ORDER.indexOf(b.name)
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
      })
  })()

  // View mode. `stack` shows all three of one section for comparing; `single`
  // walks the whole page in one direction so you can judge a language as a
  // language, which is the thing three isolated sections can never tell you.
  let mode = $state('stack')
  let dir = $state(1)
  let active = $state(sections[0]?.name ?? '')

  // The picks. Survive a reload because choosing 18 sections is not a
  // one-sitting job, and losing the sheet halfway would be maddening.
  const KEY = 'loom-lab-picks'
  let picks = $state({})
  $effect(() => {
    try { picks = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { picks = {} }
  })
  const save = (next) => {
    picks = next
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }
  const pick = (section, n) => save({ ...picks, [section]: picks[section] === n ? undefined : n })

  const chosen = $derived(sections.filter((s) => picks[s.name]).length)

  const copySheet = async () => {
    const lines = sections.map((s) => `${s.name.padEnd(16)} ${picks[s.name] ? 'V' + picks[s.name] : '—'}`)
    try { await navigator.clipboard.writeText(lines.join('\n')) } catch {}
  }

  const go = (name) => {
    active = name
    document.getElementById('sec-' + name)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
</script>

<svelte:head><title>LOOM — the lab</title></svelte:head>

<div class="lab">
  <header class="bar">
    <div class="bar-l">
      <strong>THE LAB</strong>
      <span class="count">{sections.length} sections · {sections.reduce((a, s) => a + s.variants.length, 0)} designs</span>
    </div>

    <div class="bar-c">
      <button class:on={mode === 'stack'} onclick={() => (mode = 'stack')}>Compare 3</button>
      <button class:on={mode === 'single'} onclick={() => (mode = 'single')}>Walk one</button>
      {#if mode === 'single'}
        <span class="dirs">
          {#each [1, 2, 3] as n}
            <button class="dot" class:on={dir === n} onclick={() => (dir = n)}>{n}</button>
          {/each}
        </span>
      {/if}
    </div>

    <div class="bar-r">
      <span class="count">{chosen}/{sections.length} picked</span>
      <button onclick={copySheet}>Copy sheet</button>
    </div>
  </header>

  <nav class="rail">
    {#each sections as s}
      <button class:on={active === s.name} class:done={picks[s.name]} onclick={() => go(s.name)}>
        <span>{s.name}</span>
        {#if picks[s.name]}<b>V{picks[s.name]}</b>{/if}
      </button>
    {/each}
  </nav>

  <main>
    {#if !sections.length}
      <p class="empty">No variants on disk yet.</p>
    {/if}

    {#each sections as s (s.name)}
      <section id="sec-{s.name}" class="sec">
        <h2 class="sec-h">
          {s.name}
          {#if picks[s.name]}<em>chose V{picks[s.name]}</em>{/if}
        </h2>

        {#each s.variants.filter((v) => mode === 'stack' || v.n === dir) as v (v.n)}
          {@const Variant = v.Component}
          <article class="slot" class:picked={picks[s.name] === v.n}>
            <div class="slot-h">
              <span class="tag">V{v.n}</span>
              <button class="choose" onclick={() => pick(s.name, v.n)}>
                {picks[s.name] === v.n ? '✓ chosen' : 'choose this'}
              </button>
            </div>
            <!-- Each variant renders at full width in the real page context —
                 real fonts, real background, real data. A scaled-down preview
                 would flatter every one of them equally and tell you nothing. -->
            <div class="stage"><Variant /></div>
          </article>
        {/each}
      </section>
    {/each}
  </main>
</div>

<style>
  .lab { min-height: 100vh; }

  .bar {
    position: sticky; top: 0; z-index: 90;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 0.6rem 1rem;
    background: color-mix(in oklab, var(--ink, #1a1024) 88%, transparent);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid color-mix(in oklab, currentColor 14%, transparent);
    color: #fff; font: 500 0.78rem/1 'Satoshi', system-ui, sans-serif;
    flex-wrap: wrap;
  }
  .bar strong { letter-spacing: 0.16em; font-size: 0.8rem; }
  .bar-l, .bar-c, .bar-r { display: flex; align-items: center; gap: 0.5rem; }
  .count { opacity: 0.55; font-variant-numeric: tabular-nums; }

  .bar button, .rail button {
    font: inherit; cursor: pointer; color: inherit;
    background: color-mix(in oklab, #fff 8%, transparent);
    border: 1px solid color-mix(in oklab, #fff 16%, transparent);
    border-radius: 999px; padding: 0.4rem 0.8rem;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .bar button:hover, .rail button:hover { background: color-mix(in oklab, #fff 16%, transparent); }
  .bar button.on { background: var(--thread, #ff2f92); border-color: transparent; color: #fff; }
  .dirs { display: inline-flex; gap: 0.25rem; margin-left: 0.25rem; }
  .dot { width: 2rem; padding: 0.4rem 0 !important; text-align: center; }

  .rail {
    position: sticky; top: 3rem; z-index: 89;
    display: flex; gap: 0.35rem; overflow-x: auto; padding: 0.5rem 1rem;
    background: color-mix(in oklab, var(--ink, #1a1024) 80%, transparent);
    backdrop-filter: blur(14px);
    scrollbar-width: none;
  }
  .rail::-webkit-scrollbar { display: none; }
  .rail button {
    white-space: nowrap; font-size: 0.72rem; padding: 0.3rem 0.7rem;
    display: inline-flex; align-items: center; gap: 0.4rem; color: #fff;
  }
  .rail button.on { border-color: var(--thread, #ff2f92); }
  .rail button.done { background: color-mix(in oklab, var(--thread, #ff2f92) 26%, transparent); }
  .rail b { color: var(--thread, #ff2f92); font-size: 0.68rem; }

  .sec { scroll-margin-top: 6rem; padding-top: 2rem; }
  .sec-h {
    position: sticky; top: 5.6rem; z-index: 40;
    margin: 0 0 0.75rem; padding: 0.35rem 1rem;
    font: 600 0.8rem/1 'Satoshi', system-ui, sans-serif; letter-spacing: 0.2em;
    text-transform: uppercase; color: #fff; opacity: 0.9; pointer-events: none;
  }
  .sec-h em { font-style: normal; color: var(--thread, #ff2f92); letter-spacing: 0.06em; margin-left: 0.5rem; }

  .slot { margin: 0 0 3rem; }
  .slot-h {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0 1rem 0.5rem;
    font: 500 0.72rem/1 'Satoshi', system-ui, sans-serif; color: #fff;
  }
  .tag { opacity: 0.5; letter-spacing: 0.14em; }
  .choose {
    font: inherit; cursor: pointer; color: inherit;
    background: transparent; border: 1px solid color-mix(in oklab, #fff 22%, transparent);
    border-radius: 999px; padding: 0.3rem 0.75rem;
  }
  .slot.picked .choose { background: var(--thread, #ff2f92); border-color: transparent; }

  /* The frame is the only thing separating one design from the next, so it is
     deliberately thin and neutral — a heavier chrome would start competing
     with the work it is meant to present. */
  .stage {
    border: 1px solid color-mix(in oklab, #fff 12%, transparent);
    border-radius: 14px; overflow: hidden;
    margin: 0 1rem;
  }
  .slot.picked .stage { border-color: var(--thread, #ff2f92); }

  .empty { color: #fff; opacity: 0.6; padding: 4rem 1rem; text-align: center; font-family: 'Satoshi', system-ui, sans-serif; }

  @media (max-width: 640px) {
    .bar { font-size: 0.7rem; }
    .stage, .sec-h { margin-inline: 0.5rem; }
  }
</style>
