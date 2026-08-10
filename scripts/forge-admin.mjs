#!/usr/bin/env node
// FORGE's operator desk — the other half of the CliQ flow.
//
// A customer picks a quantity in the popup, gets a reference, and sends you a
// CliQ transfer. This is what you run when it lands.
//
//   node scripts/forge-admin.mjs orders            # who owes what, oldest first
//   node scripts/forge-admin.mjs paid FRG-A3F91    # settle one — credits the account
//   node scripts/forge-admin.mjs who name@mail.com # what does this account have
//   node scripts/forge-admin.mjs grant name@mail.com 3    # goodwill / correction
//   node scripts/forge-admin.mjs grant name@mail.com -1   # take one back
//
// `paid` is the command to reach for. It reads the account and the quantity off
// the ORDER, so it cannot credit the wrong person or the wrong number, and it
// refuses an order that is already settled — running it twice after a flaky
// connection is the natural mistake and it is not a mistake you can make here.
// `grant` is the escape hatch for everything else.
//
// The admin key is read from $FORGE_ADMIN_KEY, or pulled from Secret Manager
// with the firebase CLI if that is unset. It is never written to disk.

import { execFileSync } from 'node:child_process'

const API = 'https://europe-west1-loom-clients.cloudfunctions.net/forge'

function adminKey() {
  if (process.env.FORGE_ADMIN_KEY) return process.env.FORGE_ADMIN_KEY.trim()
  try {
    return execFileSync(
      'firebase',
      ['functions:secrets:access', 'FORGE_ADMIN_KEY', '--project', 'loom-clients'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
  } catch {
    die('Could not read FORGE_ADMIN_KEY.\nSet it in the environment, or make sure the firebase CLI is logged in.')
  }
}

const die = (msg) => { console.error(`\n  ${msg}\n`); process.exit(1) }
const jod = (n) => `${n} JOD`

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-forge-admin-key': adminKey(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) die(`${payload?.error?.code || res.status}: ${payload?.error?.message || 'request failed'}`)
  return payload
}

// ---------------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2)

if (!cmd || cmd === 'help' || cmd === '--help') {
  console.log(`
  FORGE operator desk

    orders                    unpaid orders, oldest first
    orders paid               orders already settled
    paid <FRG-XXXXXX>         mark an order paid and credit the account
    cancel <FRG-XXXXXX>       drop an order nobody is going to pay
    who <email>               show an account's balance
    grant <email> <n>         add (or with a negative n, remove) models

  Payment is CliQ over WhatsApp; 'paid' is the command for a transfer that landed.
`)
  process.exit(0)
}

if (cmd === 'orders') {
  const status = rest[0] === 'paid' ? 'paid' : 'awaiting_payment'
  const { orders } = await call(`/admin/orders?status=${status}`)
  if (!orders.length) {
    console.log(`\n  Nothing ${status === 'paid' ? 'settled yet' : 'awaiting payment'}.\n`)
    process.exit(0)
  }
  // Oldest first: the one that has been waiting longest is the one to chase.
  orders.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  console.log()
  for (const o of orders) {
    const when = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 16).replace('T', ' ') : '—'
    console.log(`  ${o.ref}   ${String(o.quantity).padStart(2)} model(s)   ${jod(o.amountJod).padEnd(8)}  ${when}  ${o.email || ''}`)
  }
  console.log(`\n  ${orders.length} order(s). Settle one with:  node scripts/forge-admin.mjs paid ${orders[0].ref}\n`)
  process.exit(0)
}

if (cmd === 'paid') {
  const ref = (rest[0] || '').trim().toUpperCase()
  if (!/^FRG-[A-F0-9]{6}$/.test(ref)) die('Pass a reference like FRG-A3F91C.')
  const { order, profile } = await call('/admin/grant', { method: 'POST', body: { ref } })
  console.log(`\n  Settled ${order.ref} — ${order.quantity} model(s), ${jod(order.amountJod)}.`)
  console.log(`  ${profile.email} now has ${profile.credits} model(s) in credit.\n`)
  process.exit(0)
}

if (cmd === 'cancel') {
  const ref = (rest[0] || '').trim().toUpperCase()
  if (!/^FRG-[A-F0-9]{6}$/.test(ref)) die('Pass a reference like FRG-A3F91C.')
  const { order } = await call(`/admin/orders/${ref}/cancel`, { method: 'POST' })
  console.log(`\n  ${order.ref} cancelled. Nobody's credit changed.\n`)
  process.exit(0)
}

if (cmd === 'who') {
  const email = (rest[0] || '').trim()
  if (!email) die('Pass an email.')
  // No read-only lookup route exists on purpose — the API surface stays as
  // small as the job needs. A zero-credit grant is a no-op the server rejects,
  // so ask by adding one and taking it straight back.
  const up = await call('/admin/grant', { method: 'POST', body: { email, credits: 1 } })
  const down = await call('/admin/grant', { method: 'POST', body: { email, credits: -1 } })
  const p = down.profile
  console.log(`\n  ${p.email}`)
  console.log(`  free model used: ${p.freeUsed ? 'yes' : 'no'}`)
  console.log(`  credit:          ${p.credits} model(s)`)
  console.log(`  models made:     ${p.modelsMade}`)
  console.log(`  can generate:    ${p.canGenerate ? 'yes' : 'no'}\n`)
  void up
  process.exit(0)
}

if (cmd === 'grant') {
  const email = (rest[0] || '').trim()
  const n = Math.floor(Number(rest[1]))
  if (!email || !Number.isFinite(n) || n === 0) die('Usage: grant <email> <non-zero integer>')
  const { profile } = await call('/admin/grant', { method: 'POST', body: { email, credits: n } })
  console.log(`\n  ${n > 0 ? 'Added' : 'Removed'} ${Math.abs(n)} model(s).`)
  console.log(`  ${profile.email} now has ${profile.credits} model(s) in credit.\n`)
  process.exit(0)
}

die(`Unknown command "${cmd}". Run with no arguments for help.`)
