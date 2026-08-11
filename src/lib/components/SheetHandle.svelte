<!-- Visible drag handle — 44px+ hit area, small bar indicator. CSS lives in
     $lib/styles/sheet.css, already imported once from +layout.svelte. -->
<script>
  let { bind, class: className = '' } = $props()
</script>

<div class="sheet-handle-wrap {className}" {...bind}>
  <span class="sheet-handle" aria-hidden="true"></span>
</div>
