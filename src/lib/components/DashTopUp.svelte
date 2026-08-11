<!--
  DashTopUp — buy more model credits from the workspace.

  This is `createOrder(quantity)` and nothing else. The function mints an order
  document and returns { ref, quantity, amountJod }; payment itself is a CliQ
  transfer a human at LOOM reconciles against that reference, exactly as the
  FORGE popup already does it. So this panel never claims to have taken money —
  it produces a reference and hands the visitor to WhatsApp.

  The only arithmetic on screen before the order exists is `quantity × the
  server's own priceJod`, and it is labelled as an estimate. Once the order
  comes back, `order.amountJod` — the server's figure — replaces it.
-->
<script>
  import { createOrder } from '$lib/forge.js'
  import { BRAND, CLIQ } from '$data/site.js'

  let { profile, onclose = null } = $props()

  const OPTIONS = [1, 3, 5, 10]

  let quantity = $state(3)
  let order = $state(null)
  let busy = $state(false)
  let error = $state(null)
  let copied = $state(null)

  const price = $derived(Number(profile?.priceJod) || null)
  const estimate = $derived(price == null ? null : (price * quantity).toFixed(price % 1 ? 2 : 0))
  const hasAlias = Boolean(CLIQ.alias)

  async function place() {
    busy = true
    error = null
    try {
      const r = await createOrder(quantity)
      order = r.order
    } catch (err) {
      error = err?.message || 'Could not start that order. Try again in a moment.'
    } finally {
      busy = false
    }
  }

  async function copy(value, which) {
    try {
      await navigator.clipboard.writeText(value)
      copied = which
      setTimeout(() => { copied = null }, 1800)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The value is on screen either way — a failed copy is not a failed order.
    }
  }

  const waHref = $derived(
    order
      ? `${BRAND.whatsapp}?text=${encodeURIComponent(
          [
            `Hi LOOM — I'd like to top up my 3D models.`,
            `Reference: ${order.ref}`,
            `Models: ${order.quantity}`,
            `Total: ${order.amountJod} JOD`,
            `Account: ${profile?.email ?? ''}`,
            hasAlias ? `\nI'm sending it on CliQ now.` : `\nPlease send me the CliQ details.`,
          ].join('\n'),
        )}`
      : null,
  )
</script>

<section class="dt" aria-labelledby="dt-title">
  <header class="dt-head">
    <h2 class="dt-title" id="dt-title">Add models</h2>
    {#if onclose}
      <button type="button" class="dt-x" onclick={onclose} aria-label="Hide the top-up panel">
        <span aria-hidden="true">×</span>
      </button>
    {/if}
  </header>

  {#if !order}
    <p class="dt-lede">
      Credits never expire and are used one per generated model.
      {#if price != null}Each one is {price} JOD.{/if}
    </p>

    <fieldset class="dt-qty">
      <legend>How many</legend>
      {#each OPTIONS as n (n)}
        <label class="dt-qty-opt" class:is-on={quantity === n}>
          <input
            type="radio"
            name="dt-quantity"
            value={n}
            checked={quantity === n}
            onchange={() => (quantity = n)}
          />
          <span>{n}</span>
        </label>
      {/each}
    </fieldset>

    {#if estimate}
      <p class="dt-total">
        <span>Estimate</span>
        <strong>{estimate} JOD</strong>
      </p>
    {/if}

    {#if error}<p class="dt-error" role="alert">{error}</p>{/if}

    <button type="button" class="dt-go" onclick={place} disabled={busy}>
      {busy ? 'Making your reference…' : 'Get a payment reference'}
    </button>
  {:else}
    <div class="dt-order">
      <p class="dt-order-line">
        {order.quantity} model{order.quantity === 1 ? '' : 's'} ·
        <strong>{order.amountJod} JOD</strong>
      </p>

      <dl class="dt-lines">
        {#if hasAlias}
          <div class="dt-line">
            <dt>CliQ alias</dt>
            <dd>
              <span class="dt-mono">{CLIQ.alias}</span>
              <button type="button" class="dt-copy" onclick={() => copy(CLIQ.alias, 'alias')}>
                {copied === 'alias' ? 'Copied' : 'Copy'}
              </button>
            </dd>
          </div>
          <div class="dt-line">
            <dt>Name</dt>
            <dd><span class="dt-mono">{CLIQ.name}</span></dd>
          </div>
        {/if}
        <div class="dt-line">
          <dt>Reference</dt>
          <dd>
            <span class="dt-mono">{order.ref}</span>
            <button type="button" class="dt-copy" onclick={() => copy(order.ref, 'ref')}>
              {copied === 'ref' ? 'Copied' : 'Copy'}
            </button>
          </dd>
        </div>
      </dl>

      <p class="dt-lede">
        {#if hasAlias}
          Send {order.amountJod} JOD by CliQ to the alias above, put
          <strong>{order.ref}</strong> in the transfer note, then send us the receipt.
        {:else}
          Message us and we will send the CliQ details. Quote <strong>{order.ref}</strong>
          so the right account gets credited.
        {/if}
      </p>

      <a class="dt-go dt-go--wa" href={waHref} target="_blank" rel="noreferrer">
        Send the receipt on WhatsApp
      </a>
      <button type="button" class="dt-again" onclick={() => { order = null }}>
        Start a different amount
      </button>
    </div>
  {/if}
</section>
