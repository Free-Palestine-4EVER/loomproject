<!--
  THE PREVIEW GATE — 11 Aug 2026, added at the client's request while the
  rebuild is unfinished ("my friend wants to show the website to a client and I
  don't want to until it's finished").

  WHAT THIS IS AND IS NOT. This is a CURTAIN, not security. The password is in
  the client bundle, every route is prerendered static HTML, and anyone who
  opens devtools or fetches the page directly can read the whole site without
  ever seeing this screen. It stops a colleague opening the link in front of a
  client. It does not stop anyone who is trying.

  If real protection is ever needed, it has to happen before the HTML is
  served — Vercel's own Deployment Protection on the project, or a middleware
  check. Do not harden this file and believe it; the honest fix is server-side.

  Mechanics: the answer is held in localStorage, not sessionStorage — asked
  once per browser rather than once per TAB. sessionStorage was tried first and
  is the wrong trade here: it is scoped per tab, so opening any link in a new
  tab re-prompted, which for a curtain is pure friction. Clearing it is
  `localStorage.removeItem('loom.preview.v1')`.

  Rendering is gated on `ready` so the prerendered HTML never flashes the site
  before hydration decides — the curtain is painted by the server, and removed
  on the client only once the stored answer is confirmed.
-->
<script>
  import { onMount } from 'svelte'

  const KEY = 'loom.preview.v1'
  const ANSWER = 'partner'

  let { children } = $props()

  let ready = $state(false)
  let open = $state(false)
  let value = $state('')
  let wrong = $state(false)
  let inputEl = $state(null)

  onMount(() => {
    try {
      if (localStorage.getItem(KEY) === ANSWER) open = true
    } catch {
      /* private mode — the gate simply asks again */
    }
    ready = true
    if (!open) queueMicrotask(() => inputEl?.focus())
  })

  function submit(e) {
    e.preventDefault()
    if (value.trim().toLowerCase() !== ANSWER) {
      wrong = true
      value = ''
      inputEl?.focus()
      return
    }
    try { localStorage.setItem(KEY, ANSWER) } catch { /* private mode — this tab only */ }
    open = true
  }
</script>

{#if ready && open}
  {@render children()}
{:else}
  <!-- The site is not rendered at all until the gate opens: no flash of
       content, and nothing below is in the DOM to be read off the page. -->
  <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
    <form class="gate-card" onsubmit={submit}>
      <p class="gate-mark">LOOM</p>
      <h1 id="gate-title" class="gate-title">This build isn’t finished yet.</h1>
      <p class="gate-sub">It’s being worked on right now. Enter the password to take a look.</p>

      <label class="gate-label" for="gate-input">Password</label>
      <input
        id="gate-input"
        class="gate-input{wrong ? ' is-wrong' : ''}"
        type="password"
        autocomplete="current-password"
        spellcheck="false"
        bind:this={inputEl}
        bind:value
        oninput={() => (wrong = false)}
        aria-describedby={wrong ? 'gate-error' : undefined}
        aria-invalid={wrong ? 'true' : undefined}
      />
      {#if wrong}
        <p class="gate-error" id="gate-error" role="alert">That isn’t it. Try again.</p>
      {/if}

      <button class="gate-go" type="submit">Enter</button>
      <p class="gate-foot">LOOM — Amman × Sarajevo</p>
    </form>
  </div>
{/if}

<style>
  .gate {
    position: fixed;
    inset: 0;
    z-index: 200; /* above everything, including the loader (100) */
    display: grid;
    place-items: center;
    padding: 24px;
    background:
      radial-gradient(120% 90% at 50% -10%, #ffd9e8, transparent 62%),
      linear-gradient(160deg, #ffe9f2, #f6e6f5 60%, #efe2f3);
  }
  .gate-card {
    width: min(100%, 420px);
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(51, 36, 61, 0.1);
    border-radius: 22px;
    padding: clamp(26px, 5vw, 40px);
    box-shadow: 0 30px 80px -30px rgba(51, 36, 61, 0.4);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .gate-mark {
    margin: 0 0 22px;
    font-size: 0.72rem;
    letter-spacing: 0.32em;
    font-weight: 700;
    color: #d6247e;
  }
  .gate-title {
    margin: 0 0 10px;
    font-size: clamp(1.35rem, 4.4vw, 1.7rem);
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: #33243d;
  }
  .gate-sub {
    margin: 0 0 26px;
    font-size: 0.95rem;
    line-height: 1.5;
    color: rgba(51, 36, 61, 0.72);
  }
  .gate-label {
    font-size: 0.66rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(51, 36, 61, 0.6);
    margin-bottom: 8px;
  }
  .gate-input {
    font: inherit;
    font-size: 1rem;
    padding: 13px 15px;
    border-radius: 12px;
    border: 1.5px solid rgba(51, 36, 61, 0.16);
    background: #fff;
    color: #33243d;
    transition: border-color 0.2s;
  }
  .gate-input:focus-visible {
    outline: none;
    border-color: #d6247e;
    box-shadow: 0 0 0 3px rgba(214, 36, 126, 0.16);
  }
  .gate-input.is-wrong { border-color: #c2185b; }
  .gate-error {
    margin: 9px 0 0;
    font-size: 0.85rem;
    color: #b3126a;
  }
  .gate-go {
    margin-top: 18px;
    font: inherit;
    font-weight: 650;
    font-size: 0.98rem;
    padding: 13px 20px;
    border: 0;
    border-radius: 12px;
    background: #d6247e;
    color: #fff;
    cursor: pointer;
    transition: transform 0.18s, background 0.18s;
  }
  .gate-go:hover { background: #b3126a; transform: translateY(-1px); }
  .gate-go:active { transform: translateY(0); }
  .gate-foot {
    margin: 22px 0 0;
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(51, 36, 61, 0.42);
  }
  @media (prefers-reduced-motion: reduce) {
    .gate-go { transition: none; }
    .gate-go:hover { transform: none; }
  }
</style>
