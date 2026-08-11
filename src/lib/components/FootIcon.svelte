<!--
  The footer's own icon set — INLINE SVG, not WoolIcon.

  The wool medallions are photographs of felted discs: gorgeous at 44px beside
  a heading, mud at 16px beside a phone number, and they cannot take the ink
  colour of the light footer because they carry their own baked-in lighting.
  Everything below is one stroked path on `currentColor`, so a link and its
  icon change colour together on hover and the whole set costs no requests.

  The brand glyphs (linkedin / x / facebook / whatsapp) are FILLED paths with
  the stroke switched off — a logo drawn as a 1.7px outline stops being the
  logo, and those are recognised by their silhouette or not at all.

  The markup below is a set of trusted, author-written constants rendered with
  {@html}. Nothing here is ever built from user input or remote data.
-->
<script module>
  export const FOOT_ICONS = {
    whatsapp:
      '<path fill="currentColor" stroke="none" d="M12.04 2A9.9 9.9 0 0 0 2.13 11.9c0 1.75.46 3.46 1.34 4.97L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.1h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.26-4.38 8.23 8.23 0 0 1 14.06-5.82 8.18 8.18 0 0 1 2.42 5.83 8.23 8.23 0 0 1-8.23 8.24Zm4.52-6.17c-.25-.13-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12s-.63.8-.78.97c-.14.16-.28.19-.53.06a6.76 6.76 0 0 1-1.99-1.23 7.5 7.5 0 0 1-1.37-1.71c-.15-.25-.02-.38.11-.5.11-.12.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.13-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42h-.47a.9.9 0 0 0-.66.31c-.22.25-.86.85-.86 2.06s.88 2.39 1 2.56c.13.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />',
    mail:
      '<rect x="2.6" y="4.8" width="18.8" height="14.4" rx="2.4" />' +
      '<path d="m3.4 7.2 7.5 5.3a2 2 0 0 0 2.2 0l7.5-5.3" />',
    pin:
      '<path d="M12 21.4s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />' +
      '<circle cx="12" cy="10.2" r="2.6" />',
    clock:
      '<circle cx="12" cy="12" r="9" /><path d="M12 7.2V12l3.2 2" />',
    arrowUp: '<path d="M12 19.5v-15m0 0-6.2 6.2M12 4.5l6.2 6.2" />',
    arrowUpRight: '<path d="M7 17 17 7m0 0H8.6M17 7v8.4" />',
    spark: '<path d="M12 3.2 13.9 9 20 10.9 13.9 12.8 12 18.6 10.1 12.8 4 10.9 10.1 9 12 3.2Z" />',
    linkedin:
      '<path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />',
    x:
      '<path fill="currentColor" stroke="none" d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />',
    facebook:
      '<path fill="currentColor" stroke="none" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />',
    link:
      '<path d="M10.5 13.5a4 4 0 0 0 5.66 0l2.55-2.55a4 4 0 1 0-5.66-5.66l-1.27 1.28" />' +
      '<path d="M13.5 10.5a4 4 0 0 0-5.66 0l-2.55 2.55a4 4 0 1 0 5.66 5.66l1.27-1.28" />',
    check: '<path d="m4.8 12.6 4.7 4.7L19.2 7" />',
  }
</script>

<script>
  let { name, class: className = '' } = $props()
  const glyph = $derived(FOOT_ICONS[name])
</script>

{#if glyph}
  <svg
    class={`foot-i ${className}`.trimEnd()}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >{@html glyph}</svg>
{/if}
