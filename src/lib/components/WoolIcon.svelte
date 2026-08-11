<!--
  A felted icon medallion. Falls back to rendering nothing rather than a
  broken image if an unknown name is passed.
-->
<script>
  import { WOOL_ICONS } from './wool.js'

  let { name, size = 'md', class: className = '', alt = '' } = $props()

  const known = $derived(WOOL_ICONS.includes(name))
  const sizeClass = $derived(size === 'lg' ? ' wool-icon--lg' : size === 'sm' ? ' wool-icon--sm' : '')
  const cls = $derived(`wool-icon${sizeClass} ${className}`.trimEnd())
</script>

{#if known}
  <img
    src="/img/wool/icons/{name}.webp"
    alt={alt}
    aria-hidden={alt ? undefined : 'true'}
    class={cls}
    width="160"
    height="160"
    loading="lazy"
    decoding="async"
    fetchpriority="low"
  />
{/if}
