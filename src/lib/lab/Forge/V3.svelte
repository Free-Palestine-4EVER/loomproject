<!--
  V3 — "THE FIELD", and the one the client chose.

  THIS FILE IS A WRAPPER, NOT A COPY. The design shipped: it lives at
  src/lib/components/ForgeBand.svelte and is what the real #forge band on the
  long page renders. The gallery mounts that same component rather than a
  duplicate of it, so /lab can never drift from what the site actually shows —
  which is the failure mode a variant gallery is one copy-paste away from, and
  the reason the other two variants in this folder are still standalone: they
  were never chosen, so there is nothing for them to drift from.

  Mounted with no `onmake`, so its CTA is inert here. The band's ONE action
  opens the FORGE popup, and the popup is owned by Forge.svelte — the gallery
  has no business opening a payment funnel.
-->
<script>
  import ForgeBand from '$lib/components/ForgeBand.svelte'
</script>

<ForgeBand />
