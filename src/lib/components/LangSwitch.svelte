<!--
  The Arabic/English switcher. One component, two mount points — the desktop
  nav bar (`.nav-cta`) and the mobile drawer (`.menu-meta`) — because both
  are named explicitly in the brief and a `<select>` is not: this is two
  real `<a href>` pills (EN / عربي), not a JS-only toggle, so it works with
  JS off, is crawlable, and never needs a click handler to "know" the other
  URL — the href already says exactly what it is (`localeHref`, from
  `$lib/i18n.svelte.js`) before any script runs.

  `variant`: 'nav' (compact, sits in the header) or 'drawer' (bigger,
  44px+ touch targets, matches the drawer's own type scale).
-->
<script>
  import { i18n, localeSwitchHref } from '$lib/i18n.svelte.js'
  import { SWITCHER_UI } from '$data/chrome.js'
  import { t } from '$lib/i18n.svelte.js'

  let { variant = 'nav', onnavigate = null } = $props()
</script>

<div class="lang-switch lang-switch--{variant}" role="group" aria-label="Language">
  {#each ['en', 'ar'] as loc (loc)}
    <a
      href={localeSwitchHref(loc)}
      class="lang-switch-opt {i18n.locale === loc ? 'is-current' : ''}"
      aria-current={i18n.locale === loc ? 'true' : undefined}
      aria-label={t(SWITCHER_UI[loc].switchTo)}
      hreflang={loc}
      lang={loc}
      onclick={() => onnavigate?.()}
    >
      {SWITCHER_UI[loc].short}
    </a>
  {/each}
</div>

<style>
  /* Genuinely new rules — PORTING.md rule 5 asks for a comment saying why:
     nothing in the 16k lines of ported CSS styled a language switcher
     before this, so there is no existing selector to extend. Physical
     properties on purpose, matching the rest of the (deliberately
     LTR-structured) shell — see the plan doc's §2 "hybrid, not mirror"
     call — this control is UI chrome, not Arabic prose, so it does not get
     a `dir="rtl"` scope of its own either. */
  .lang-switch {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 1px solid rgba(51, 36, 61, 0.16);
    border-radius: 999px;
    padding: 2px;
    flex: none;
  }
  .lang-switch-opt {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: var(--ink-dim);
    font-weight: 640;
    text-decoration: none;
    transition: background 0.25s var(--ease), color 0.25s var(--ease);
    white-space: nowrap;
  }
  .lang-switch-opt.is-current {
    background: var(--ink);
    color: var(--bg);
  }
  .lang-switch-opt:not(.is-current):hover {
    color: var(--ink);
  }

  /* Desktop bar — compact, sits beside the burger inside .nav-cta. */
  .lang-switch--nav {
    margin-inline-end: 4px;
  }
  .lang-switch--nav .lang-switch-opt {
    min-width: 34px;
    height: 28px;
    padding: 0 10px;
    font-size: 0.72rem;
    letter-spacing: 0.02em;
  }
  @media (max-width: 480px) {
    .lang-switch--nav .lang-switch-opt {
      min-width: 30px;
      height: 26px;
      padding: 0 8px;
      font-size: 0.66rem;
    }
  }

  /* Drawer — full 44px+ touch target per the brief, larger type to match
     `.menu-meta`'s own links. */
  .lang-switch--drawer {
    border-color: rgba(51, 36, 61, 0.16);
    padding: 3px;
    align-self: flex-start;
  }
  .lang-switch--drawer .lang-switch-opt {
    min-width: 64px;
    min-height: 44px;
    padding: 0 18px;
    font-size: 0.92rem;
  }
</style>
