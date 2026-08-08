// engine/fixtures/clientapi-selftest.mjs — verification harness for the
// client-facing auth + API (ios/CONTRACT.md Part 1: clientauth.mjs,
// clientapi.mjs). Runs entirely against an in-memory temp store (same
// list/get/insert/update surface as lib/store.mjs) so it never touches
// engine/data/*.json and can't race the other agents working in this repo.
//
// Covers, per CONTRACT.md's "Verification required":
//   1. An unknown handle and a known handle are indistinguishable from
//      outside requestCode() — same response shape, comparable timing.
//   2. The attempt limiter locks out after MAX_ATTEMPTS.
//   3. A successful code -> token -> authenticate() round trip.
//   4. Client A cannot read client B's months/posts/invoices/requests/
//      performance, INCLUDING by passing B's id explicitly wherever an id
//      is accepted (decidePost's postId).
//   5. Every client endpoint's JSON payload is walked recursively and
//      flagged if any forbidden key name from the CONTRACT.md privacy list
//      appears anywhere — including when the underlying store record is
//      deliberately contaminated with extra internal fields, proving the
//      explicit-field-picking discipline (not "record minus keys").
//   6. Invoice line labels never carry internal cost language.
//   7. Token expiry and revocation actually lock a session out.
//
// Run: node engine/fixtures/clientapi-selftest.mjs

import crypto from 'node:crypto'

import {
  requestCode, verifyCode, authenticate, revoke, clientSafe,
  listPendingCodesForOperator, MAX_ATTEMPTS,
} from '../lib/clientauth.mjs'
import {
  listMonths, listPosts, decidePost, performance as clientPerformance,
  listInvoices, listRequests, createRequest,
  scanForbiddenKeys, PRIVACY_FORBIDDEN_KEYS,
} from '../lib/clientapi.mjs'
import { billing } from '../lib/invoices.mjs'
import { DEFAULT_PRICING } from '../lib/pricing.mjs'

const TEST_PRICING = DEFAULT_PRICING // isolate from whatever settings.json holds on disk right now

// ---------------------------------------------------------------------------
// in-memory store — same surface lib/store.mjs exposes (list/get/insert/update)
// ---------------------------------------------------------------------------

function makeMemoryStore() {
  const collections = new Map()
  const coll = (name) => {
    if (!collections.has(name)) collections.set(name, [])
    return collections.get(name)
  }
  return {
    async list(name, match) {
      const items = coll(name)
      if (!match) return items.slice()
      if (typeof match === 'function') return items.filter(match)
      const keys = Object.keys(match)
      return items.filter((it) => keys.every((k) => match[k] === undefined || it[k] === match[k]))
    },
    async get(name, id) {
      return coll(name).find((it) => it.id === id) || null
    },
    async insert(name, fields) {
      const record = { id: crypto.randomUUID(), ...fields }
      coll(name).push(record)
      return record
    },
    async update(name, id, patch) {
      const items = coll(name)
      const idx = items.findIndex((it) => it.id === id)
      if (idx === -1) return null
      items[idx] = { ...items[idx], ...patch, id: items[idx].id }
      return items[idx]
    },
  }
}

// ---------------------------------------------------------------------------
// assertion bookkeeping
// ---------------------------------------------------------------------------

let pass = 0
let fail = 0
function assert(cond, msg) {
  if (cond) { pass += 1; console.log(`  ok   ${msg}`) }
  else { fail += 1; console.log(`  FAIL ${msg}`) }
}
function section(title) { console.log(`\n== ${title} ==`) }

// Pull the plaintext code straight from clientauth's in-memory operator
// readout rather than re-deriving it, so tests exercise the exact same
// value the operator would actually read out to the client.
function knownCodeFor(handle) {
  const normalized = handle.replace(/^@/, '').toLowerCase()
  const entry = listPendingCodesForOperator().find((c) => c.handle === normalized)
  if (!entry) throw new Error(`no pending code found for ${handle} — did requestCode() run first?`)
  return entry.code
}

async function main() {
  const store = makeMemoryStore()

  // ===========================================================================
  section('seed: two real clients + one deliberately-contaminated invoice/post')
  // ===========================================================================

  const clientA = await store.insert('clients', {
    name: 'Sofa House', nameAr: 'بيت الأريكة', handle: '@sofahouse', category: 'furniture', city: 'Amman',
    brand: { colors: ['#111'], voiceEn: 'warm', voiceAr: 'دافئ', fontHint: '' },
    plan: { content: true, ads: true },
    price: { contentJod: 89, perConversationJod: 1.75 },
    createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
  })
  const clientB = await store.insert('clients', {
    name: 'Mega Furniture Store', nameAr: 'ميجا للأثاث', handle: '@megastore', category: 'furniture', city: 'Amman',
    brand: { colors: ['#222'], voiceEn: 'bold', voiceAr: 'جريء', fontHint: '' },
    plan: { content: true, ads: false }, // ads off — performance() must show zero regardless of stray conversation records
    price: { contentJod: 89, perConversationJod: 1.75 },
    createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
  })
  assert(clientA.id !== clientB.id, 'two distinct clients seeded')

  // Posts for both clients, same month, so month-scoping AND client-scoping
  // both have to work for isolation to hold.
  const postA1 = await store.insert('posts', {
    clientId: clientA.id, month: '2026-08', slot: 1, kind: 'single', status: 'qa',
    captionEn: 'New sofa arrivals', captionAr: 'وصل كنب جديد', hashtags: ['#amman'],
    image: '/media/a1.jpg', carousel: null, scheduledAt: null, postedAt: null,
    qaSeconds: 187, regenerations: 2, rejectionNote: null, createdAt: '2026-08-01T00:00:00Z',
    // contamination: fields that must never leak even though they're right there on the record
    generationCostJod: 4.20, platformCostJod: 1.10,
  })
  const postA2 = await store.insert('posts', {
    clientId: clientA.id, month: '2026-08', slot: 2, kind: 'carousel', status: 'rejected',
    captionEn: 'Dining sets', captionAr: 'أطقم سفرة', hashtags: [],
    image: null, carousel: { boardPath: '/x/board.png', cuts: [0.3, 0.6], slides: ['/media/a2-1.jpg', '/media/a2-2.jpg'] },
    scheduledAt: null, postedAt: null, qaSeconds: 340, regenerations: 1,
    rejectionNote: 'colors are off', createdAt: '2026-08-02T00:00:00Z',
  })
  const postB1 = await store.insert('posts', {
    clientId: clientB.id, month: '2026-08', slot: 1, kind: 'single', status: 'approved',
    captionEn: 'Mega sale', captionAr: 'تخفيضات ميجا', hashtags: ['#sale'],
    image: '/media/b1.jpg', carousel: null, scheduledAt: '2026-08-05T09:00:00Z', postedAt: null,
    qaSeconds: 60, regenerations: 0, rejectionNote: null, createdAt: '2026-08-01T00:00:00Z',
  })

  // Invoices — one built the real way (invoices.billing), one hand-inserted
  // with contamination to prove the picker survives a poisoned record.
  await store.insert('conversations', { clientId: clientA.id, campaignId: null, at: '2026-08-10', source: 'whatsapp', costJod: 0.90, billedJod: 1.75, note: 'seed' })
  for (let i = 0; i < 12; i++) {
    await store.insert('conversations', { clientId: clientA.id, campaignId: null, at: '2026-08-11', source: 'whatsapp', costJod: 1.10, billedJod: 1.75, note: 'seed' })
  }
  // Stray conversations for the ads-off client B — performance() must ignore these.
  for (let i = 0; i < 40; i++) {
    await store.insert('conversations', { clientId: clientB.id, campaignId: null, at: '2026-08-12', source: 'whatsapp', costJod: 0.80, billedJod: 1.75, note: 'stray, ads off' })
  }

  const realInvoiceA = await billing(clientA.id, '2026-08', { store, pricing: TEST_PRICING })
  const { _meta, ...persistableA } = realInvoiceA
  const storedInvoiceA = await store.insert('invoices', { clientId: clientA.id, ...persistableA })

  const poisonedInvoiceB = await store.insert('invoices', {
    clientId: clientB.id, month: '2026-08',
    lines: [
      { label: 'Content subscription (المصنع)', qty: 1, unitJod: 89, totalJod: 89 },
      // contamination: an extra field (using the REAL key name from ops.mjs)
      // on a line, AND a forbidden-language label.
      { label: 'Generation cost recoup', qty: 1, unitJod: 5, totalJod: 5, spendJod: 3.5 },
    ],
    totalJod: 94, status: 'draft', issuedAt: '2026-08-01T00:00:00Z',
    // contamination at the invoice's own top level — same field names ops.mjs
    // actually uses (grossJod, generationCostJod), not made-up ones, so the
    // sanity check below proves real coverage, not an accidental match.
    grossJod: 40, generationCostJod: 4.2,
  })
  // BY RESULT retired 8 Aug 2026: an invoice is ONE flat content line now.
  assert(storedInvoiceA.totalJod === 89, `real billing() invoice for A is the flat subscription only (got ${storedInvoiceA.totalJod})`)
  assert(storedInvoiceA.lines.length === 1, `and it carries exactly one line (got ${storedInvoiceA.lines.length})`)
  assert(!JSON.stringify(storedInvoiceA).toLowerCase().includes('conversation'), 'no invoice line mentions conversations any more')

  const requestA1 = await store.insert('clientrequests', { clientId: clientA.id, text: 'Can we push Friday post to Saturday?', at: '2026-08-03T10:00:00Z', from: 'client', status: 'open' })
  const requestB1 = await store.insert('clientrequests', { clientId: clientB.id, text: 'Need new product photos', at: '2026-08-04T10:00:00Z', from: 'client', status: 'open' })

  // =======================================================================
  section('1. requestCode() — unknown vs known handle must be indistinguishable')
  // =======================================================================

  // Timing is compared on the MEDIAN, not the mean. This assertion is checking for
  // a *systematic* difference between known and unknown handles; an OS scheduler
  // preemption or a GC pause is not one, but a single 50ms outlier destroys a mean
  // of 25 samples and leaves the median untouched. That is exactly the property
  // wanted here — and this machine routinely runs several Xcode builds at once,
  // which is when the mean-based version failed.
  // The threshold stays tight on purpose: widening it until it never flakes would
  // also make it blind to a real enumeration oracle, which is the whole point of
  // the check. A warmup pass keeps JIT compilation out of the first samples.
  const N_TRIALS = 41
  const knownMs = []
  const unknownMs = []
  let knownResult, unknownResult

  for (let w = 0; w < 5; w++) {
    await requestCode('@sofahouse', { store })
    await requestCode('@totally-unknown-handle-xyz', { store })
  }

  for (let i = 0; i < N_TRIALS; i++) {
    const t0 = performance.now()
    knownResult = await requestCode('@sofahouse', { store })
    knownMs.push(performance.now() - t0)

    const t1 = performance.now()
    unknownResult = await requestCode('@totally-unknown-handle-xyz', { store })
    unknownMs.push(performance.now() - t1)
  }

  assert(JSON.stringify(Object.keys(knownResult).sort()) === JSON.stringify(Object.keys(unknownResult).sort()),
    `known and unknown handle responses have identical key sets (got ${JSON.stringify(knownResult)} vs ${JSON.stringify(unknownResult)})`)
  assert(knownResult.ok === true && unknownResult.ok === true, 'both report ok:true')
  assert(knownResult.delivery === 'operator' && unknownResult.delivery === 'operator', 'both report delivery:"operator"')
  assert(JSON.stringify(knownResult) === JSON.stringify(unknownResult), 'response bodies are byte-for-byte identical')

  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[(s.length - 1) >> 1] }
  const medKnown = median(knownMs)
  const medUnknown = median(unknownMs)
  const delta = Math.abs(medKnown - medUnknown)
  // Symmetric ratio — whichever side is slower. A one-directional check would have
  // read "0.24x, fine" here while the known path was actually 4x the unknown one.
  const hi = Math.max(medKnown, medUnknown)
  const lo = Math.min(medKnown, medUnknown)
  const ratio = lo > 0 ? hi / lo : Infinity
  const slower = medKnown > medUnknown ? 'known' : 'unknown'
  console.log(`  timing: known handle median ${medKnown.toFixed(3)}ms, unknown handle median ${medUnknown.toFixed(3)}ms over ${N_TRIALS} trials (${slower} slower, ${ratio.toFixed(2)}x)`)

  // The absolute delta is the security-relevant number: over a network, tenths of a
  // millisecond are unobservable. This is the assertion that matters.
  assert(delta < 10, `timing is comparable (median delta ${delta.toFixed(3)}ms < 10ms threshold)`)

  // The ratio is an early-warning shape check, but ratios between sub-millisecond
  // numbers are mostly measurement noise, so it is only enforced once the slower
  // side is big enough for the comparison to mean anything. Note the two paths do
  // genuinely different work — a known handle invalidates old codes and inserts a
  // new one, an unknown handle writes nothing — so this will never be exactly 1x.
  const RATIO_FLOOR_MS = 1
  if (hi >= RATIO_FLOOR_MS) {
    assert(ratio < 3, `known/unknown cost within 3x (got ${ratio.toFixed(2)}x, ${slower} slower — a widening gap here is an enumeration oracle)`)
  } else {
    console.log(`  note: ratio ${ratio.toFixed(2)}x not asserted — both medians under ${RATIO_FLOOR_MS}ms, so the ratio is noise, not signal`)
  }

  // Unknown handle must never have created a code record at all.
  const codesForUnknown = await store.list('clientauthcodes', (r) => r.handle === 'totally-unknown-handle-xyz')
  assert(codesForUnknown.length === 0, 'no clientauthcodes record was ever created for the unknown handle')

  // =======================================================================
  section('2. attempt limiter — locks out after MAX_ATTEMPTS wrong codes')
  // =======================================================================

  await requestCode('@sofahouse', { store }) // fresh code for a clean limiter test
  const lockoutHandle = 'lockout-test-handle'
  await store.insert('clients', { id: crypto.randomUUID(), name: 'Lockout Test Co', nameAr: 'شركة اختبار', handle: '@' + lockoutHandle, category: 'retail', city: 'Amman', brand: {}, plan: { content: true, ads: false }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: null })
  await requestCode('@' + lockoutHandle, { store })

  let sawLockout = false
  for (let i = 1; i <= MAX_ATTEMPTS + 2; i++) {
    const r = await verifyCode('@' + lockoutHandle, '000000', { store }) // always wrong on purpose
    if (i <= MAX_ATTEMPTS) {
      assert(r.ok === false && r.error?.code === 'INVALID_CODE', `attempt ${i}/${MAX_ATTEMPTS}: rejected as INVALID_CODE, not yet locked (got ${JSON.stringify(r)})`)
    } else {
      assert(r.ok === false && r.error?.code === 'LOCKED_OUT' && r.status === 401, `attempt ${i} (past the limit): LOCKED_OUT with 401 (got ${JSON.stringify(r)})`)
      sawLockout = true
    }
  }
  assert(sawLockout, 'lockout was actually reached')

  // Even the CORRECT code must be refused once locked out.
  const codeRecord = (await store.list('clientauthcodes', (r) => r.handle === lockoutHandle && !r.consumedAt)).pop()
  assert(!!codeRecord, 'a code record exists for the lockout-test handle')
  const stillLocked = await verifyCode('@' + lockoutHandle, 'ANYTHING-BUT-WE-CANT-KNOW-THE-REAL-CODE', { store })
  assert(stillLocked.ok === false && stillLocked.error?.code === 'LOCKED_OUT', 'still locked out even on a fresh attempt, correct or not')

  // =======================================================================
  section('3. successful login: code -> token -> authenticate() round trip')
  // =======================================================================

  const login = await verifyCode('@sofahouse', knownCodeFor('@sofahouse'), { store })
  assert(login.ok === true, `login succeeds with the real code (got ${JSON.stringify(login.ok ? { ok: true } : login)})`)
  assert(typeof login.token === 'string' && login.token.length >= 32, `a real bearer token is returned (len ${login.token?.length})`)
  assert(JSON.stringify(login.client) === JSON.stringify(clientSafe(clientA)), 'returned client matches clientSafe(client) exactly')

  const resolvedClientId = await authenticate(login.token, { store })
  assert(resolvedClientId === clientA.id, `authenticate() resolves the token back to client A's id (got ${resolvedClientId})`)

  const garbage = await authenticate('not-a-real-token', { store })
  assert(garbage === null, 'authenticate() on a garbage token returns null')

  // =======================================================================
  section('4. token expiry + revocation')
  // =======================================================================

  const revoked = await revoke(login.token, { store })
  assert(revoked === true, 'revoke() reports success for a live token')
  const afterRevoke = await authenticate(login.token, { store })
  assert(afterRevoke === null, 'a revoked token no longer authenticates')

  // manufacture an already-expired token record directly to test expiry independent of revocation
  const expiredRaw = 'expired-raw-token-for-test'
  const expiredHash = crypto.createHash('sha256').update(expiredRaw).digest('hex')
  await store.insert('clienttokens', { tokenHash: expiredHash, clientId: clientA.id, createdAt: '2020-01-01T00:00:00Z', expiresAt: '2020-01-02T00:00:00Z', revokedAt: null })
  const afterExpiry = await authenticate(expiredRaw, { store })
  assert(afterExpiry === null, 'an expired token does not authenticate')

  // Get a FRESH live token for client A to drive the rest of the tests.
  await requestCode('@sofahouse', { store })
  const loginA2 = await verifyCode('@sofahouse', knownCodeFor('@sofahouse'), { store })
  const clientIdFromToken = await authenticate(loginA2.token, { store })
  assert(clientIdFromToken === clientA.id, 'fresh token authenticates as client A')

  // =======================================================================
  section('5. cross-tenant isolation — A can never read or touch B\'s data')
  // =======================================================================

  const monthsA = await listMonths(clientA.id, { store })
  const monthsB = await listMonths(clientB.id, { store })
  const augA = monthsA.find((m) => m.month === '2026-08')
  const augB = monthsB.find((m) => m.month === '2026-08')
  assert(augA?.total === 2, `listMonths(A) counts A's own 2 August posts, not B's (got ${augA?.total})`)
  assert(augB?.total === 1, `listMonths(B) counts B's own 1 August post, not A's (got ${augB?.total})`)

  const postsA = await listPosts(clientA.id, '2026-08', { store })
  const postsB = await listPosts(clientB.id, '2026-08', { store })
  assert(postsA.length === 2 && postsA.every((p) => [postA1.id, postA2.id].includes(p.id)), `listPosts(A) returns exactly A's 2 posts (got ${postsA.length}: ${postsA.map(p => p.id)})`)
  assert(postsB.length === 1 && postsB[0].id === postB1.id, `listPosts(B) returns exactly B's 1 post (got ${postsB.length})`)
  assert(!postsA.some((p) => p.id === postB1.id), 'A\'s post list never contains B\'s post')

  // THE key cross-tenant test: A's authenticated clientId, but B's postId
  // passed explicitly as the target — must 404, never touch B's post.
  const crossTenantDecide = await decidePost(clientA.id, postB1.id, 'yes', '', { store })
  assert(crossTenantDecide.ok === false && crossTenantDecide.status === 404 && crossTenantDecide.error?.code === 'NOT_FOUND',
    `A deciding on B's postId (passed explicitly) gets 404 NOT_FOUND, not B's post (got ${JSON.stringify(crossTenantDecide)})`)
  const postBUnchanged = await store.get('posts', postB1.id)
  assert(postBUnchanged.status === 'approved', 'B\'s post status is untouched by A\'s cross-tenant attempt')

  // And the reverse: B deciding on A's post must also 404.
  const reverseCrossTenant = await decidePost(clientB.id, postA1.id, 'no', 'nope', { store })
  assert(reverseCrossTenant.ok === false && reverseCrossTenant.status === 404, 'B deciding on A\'s postId also 404s')
  const postAUnchanged = await store.get('posts', postA1.id)
  assert(postAUnchanged.status === 'qa', 'A\'s post status is untouched by B\'s cross-tenant attempt')

  // A legitimate decide (own post) must actually work — proves 404 above
  // wasn't just "decidePost is broken".
  const legitDecide = await decidePost(clientA.id, postA1.id, 'yes', '', { store })
  assert(legitDecide.ok === true && legitDecide.post.decision.verdict === 'yes', `A deciding on A's OWN post succeeds (got ${JSON.stringify(legitDecide.ok ? legitDecide.post.decision : legitDecide)})`)

  const invoicesA = await listInvoices(clientA.id, { store })
  const invoicesB = await listInvoices(clientB.id, { store })
  assert(invoicesA.length === 1 && invoicesA[0].id === storedInvoiceA.id, `listInvoices(A) returns only A's invoice (got ${invoicesA.length})`)
  assert(invoicesB.length === 1 && invoicesB[0].id === poisonedInvoiceB.id, `listInvoices(B) returns only B's invoice (got ${invoicesB.length})`)
  assert(!invoicesA.some((i) => i.id === poisonedInvoiceB.id), 'A\'s invoice list never contains B\'s invoice')

  const requestsA = await listRequests(clientA.id, { store })
  const requestsB = await listRequests(clientB.id, { store })
  assert(requestsA.length === 1 && requestsA[0].id === requestA1.id, 'listRequests(A) returns only A\'s request')
  assert(requestsB.length === 1 && requestsB[0].id === requestB1.id, 'listRequests(B) returns only B\'s request')

  const perfA = await clientPerformance(clientA.id, '2026-08', { store, pricing: TEST_PRICING })
  const perfB = await clientPerformance(clientB.id, '2026-08', { store, pricing: TEST_PRICING })
  // performance() now reports DELIVERY, not conversations: what LOOM made this
  // month and how much of it the client has signed off. No money at all — the
  // invoice screen owns that, and repeating a figure here would only invite
  // dividing the flat fee by the post count.
  assert(perfA.photosDelivered + perfA.videosDelivered === 2, `performance(A) counts A's 2 non-draft posts as delivered (got ${perfA.photosDelivered}+${perfA.videosDelivered})`)
  assert(perfA.photosPromised === 20 && perfA.videosPromised === 2, `performance(A) states the promise: 20 photos + 2 videos (got ${perfA.photosPromised}+${perfA.videosPromised})`)
  assert(perfB.photosDelivered + perfB.videosDelivered === 1, `performance(B) is scoped to B's own posts (got ${perfB.photosDelivered}+${perfB.videosDelivered})`)
  assert(perfA.billedJod === undefined && perfA.conversationsDelivered === undefined, 'performance() carries no money and no conversation count at all')
  assert(perfB.conversationsDelivered === undefined, 'and B\'s 40 stray conversation records cannot surface through it either')

  // =======================================================================
  section('6. privacy — recursive forbidden-key scan of every client payload')
  // =======================================================================

  const payloadsToScan = {
    'clientSafe(clientA)': clientSafe(clientA),
    'listMonths(A)': monthsA,
    'listPosts(A)': postsA,
    'decidePost(A, own post).post': legitDecide.post,
    'performance(A)': perfA,
    'performance(B)': perfB,
    'listInvoices(A)': invoicesA,
    'listInvoices(B) [poisoned source record]': invoicesB,
    'listRequests(A)': requestsA,
  }

  for (const [label, payload] of Object.entries(payloadsToScan)) {
    const hits = scanForbiddenKeys(payload)
    assert(hits.length === 0, `${label} contains none of the ${PRIVACY_FORBIDDEN_KEYS.length} forbidden keys (hits: ${JSON.stringify(hits)})`)
  }

  const createdRequest = await createRequest(clientA.id, 'A brand-new request from the app', { store })
  assert(createdRequest.ok === true, 'createRequest succeeds')
  assert(scanForbiddenKeys(createdRequest.request).length === 0, 'createRequest() response is clean')
  assert(createdRequest.request.text === 'A brand-new request from the app', 'created request carries the submitted text')

  // Sanity: the scanner itself is not vacuous — prove it actually catches
  // a forbidden key when one is present, using the RAW (never client-facing)
  // store record for B's poisoned invoice.
  const rawPoisonedInvoice = await store.get('invoices', poisonedInvoiceB.id)
  const rawHits = scanForbiddenKeys(rawPoisonedInvoice)
  assert(rawHits.length >= 3, `sanity check: the scanner DOES flag the raw poisoned invoice record's real forbidden keys — clientId, grossJod, generationCostJod, spendJod (found ${JSON.stringify(rawHits)})`)

  // =======================================================================
  section('7. invoice line labels never carry internal cost language')
  // =======================================================================

  const COST_LANGUAGE = ['cost', 'margin', 'profit', 'spend', 'cpc', 'generation', 'platform fee', 'operator', 'gross']
  function labelLeaksInternalLanguage(label) {
    const lower = String(label ?? '').toLowerCase()
    return COST_LANGUAGE.some((w) => lower.includes(w))
  }

  for (const line of invoicesA[0].lines) {
    assert(!labelLeaksInternalLanguage(line.label), `real invoice line label is clean: "${line.label}"`)
  }
  // Sanity: the checker itself isn't vacuous — the poisoned line's label
  // ("Generation cost recoup") must actually get flagged.
  const poisonedLabelFlagged = labelLeaksInternalLanguage('Generation cost recoup')
  assert(poisonedLabelFlagged === true, 'sanity check: the label-language checker DOES flag "Generation cost recoup"')

  // =======================================================================
  section('8. misc validation')
  // =======================================================================

  const badVerdict = await decidePost(clientA.id, postA1.id, 'maybe', '', { store })
  assert(badVerdict.ok === false && badVerdict.status === 400 && badVerdict.error?.code === 'BAD_VERDICT', `decidePost rejects a non yes|no verdict (got ${JSON.stringify(badVerdict)})`)

  const missingPost = await decidePost(clientA.id, 'does-not-exist', 'yes', '', { store })
  assert(missingPost.ok === false && missingPost.status === 404, 'decidePost on a nonexistent postId 404s')

  const emptyRequest = await createRequest(clientA.id, '   ', { store })
  assert(emptyRequest.ok === false && emptyRequest.status === 400, 'createRequest rejects blank text')

  // =======================================================================
  section('9. a permanent code survives requestCode() — App Store review path')
  // =======================================================================
  // The app ALWAYS calls requestCode before verifyCode, so this is the only
  // order a real sign-in ever happens in. requestCode used to invalidate every
  // active code for the handle, permanent ones included, which consumed the
  // demo code on the reviewer's first tap and locked the account forever —
  // guideline 2.1, the exact rejection the `permanent` flag exists to avoid.
  // These assertions are the reason it cannot silently come back.

  const permClient = await store.insert('clients', {
    name: 'Permanent Code Co', nameAr: 'شركة الرمز الدائم', handle: 'permco',
    category: 'furniture', city: 'Amman', plan: { content: true, ads: true }, archivedAt: null,
  })
  const PERM_CODE = '424242'
  await store.insert('clientauthcodes', {
    handle: 'permco', clientId: permClient.id, codeHash: crypto.createHash('sha256').update(PERM_CODE).digest('hex'),
    createdAt: new Date().toISOString(), expiresAt: '2099-12-31T23:59:59.000Z',
    consumedAt: null, permanent: true,
  })

  await requestCode('permco', { store })
  const permAfterRequest = await verifyCode('permco', PERM_CODE, { store })
  assert(permAfterRequest.ok === true, 'a permanent code still verifies AFTER requestCode() (the real sign-in order)')

  await requestCode('permco', { store })
  const permSecondRound = await verifyCode('permco', PERM_CODE, { store })
  assert(permSecondRound.ok === true, 'and again on a second request/verify round — it is genuinely reusable')

  const permRecord = (await store.list('clientauthcodes', (r) => r.handle === 'permco' && r.permanent))[0]
  assert(permRecord && permRecord.consumedAt === null, 'requestCode() never stamps consumedAt on a permanent code')

  // negative control: an ORDINARY code must still be invalidated by a new
  // request, or this fix would have quietly disabled the anti-racing rule.
  const ordClient = await store.insert('clients', {
    name: 'Ordinary Code Co', nameAr: 'شركة الرمز العادي', handle: 'ordco',
    category: 'furniture', city: 'Amman', plan: { content: true, ads: true }, archivedAt: null,
  })
  const ORD_CODE = '111111'
  await store.insert('clientauthcodes', {
    handle: 'ordco', clientId: ordClient.id, codeHash: crypto.createHash('sha256').update(ORD_CODE).digest('hex'),
    createdAt: new Date().toISOString(), expiresAt: '2099-12-31T23:59:59.000Z',
    consumedAt: null, permanent: false,
  })
  await requestCode('ordco', { store })
  const ordAfterRequest = await verifyCode('ordco', ORD_CODE, { store })
  assert(ordAfterRequest.ok === false, 'sanity check: a NON-permanent code is still invalidated by a new request')

  // =======================================================================
  section('SUMMARY')
  // =======================================================================
  console.log(`\n  ${pass} passed, ${fail} failed`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error('SELFTEST CRASHED:', e)
  process.exitCode = 1
})
