#!/usr/bin/env node
// clients-backend/sync-to-firestore.mjs
//
// Push the operator engine's local data up to Firestore, so the hosted API has
// something to serve. THE ENGINE REMAINS THE SOURCE OF TRUTH — this is a
// one-way publish, laptop -> cloud. Nothing here reads back down, and running
// it twice is safe.
//
//   node sync-to-firestore.mjs                 # publish real data
//   node sync-to-firestore.mjs --demo          # also seed the App Store review client
//   node sync-to-firestore.mjs --demo --only-demo   # seed ONLY the demo client
//   node sync-to-firestore.mjs --dry-run       # print what would be written
//
// CREDENTIALS: needs a service-account key, because the Admin SDK cannot use
// the firebase CLI's user login.
//   1. https://console.firebase.google.com/project/loom-clients/settings/serviceaccounts/adminsdk
//   2. "Generate new private key" -> save it OUTSIDE the repo
//   3. export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
// That file is a full admin credential for the project. Do not commit it.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(HERE, '..', 'engine', 'data')

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry-run')
const WITH_DEMO = args.has('--demo')
const ONLY_DEMO = args.has('--only-demo')

// Which collections the hosted client API actually reads. Deliberately NOT
// every collection the engine has: creatives, campaigns and approvals are
// operator-side only and have no business leaving the laptop.
//
// `posts` and `invoices` DO carry LOOM's cost and margin fields, and they are
// uploaded whole — that is safe only because firestore.rules denies every
// client-SDK read and the API field-picks through clientapi.mjs. If anyone ever
// opens Firestore to direct client reads, this upload becomes a data leak. See
// the long comment in firestore.rules.
const COLLECTIONS = ['clients', 'posts', 'invoices', 'conversations', 'settings']

async function readLocal(name) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${name}.json`), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.items) ? parsed.items : []
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

if (!DRY) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS is not set — see the header of this file.')
    process.exit(1)
  }
  initializeApp({ credential: applicationDefault(), projectId: 'loom-clients' })
}

const db = () => getFirestore()

/** Write items into `name`, chunked into batches Firestore will accept (500 ops). */
async function publish(name, items) {
  if (DRY) {
    console.log(`  [dry-run] ${name}: ${items.length} document(s)`)
    return
  }
  const col = db().collection(name)
  for (let i = 0; i < items.length; i += 450) {
    const batch = db().batch()
    for (const item of items.slice(i, i + 450)) {
      const id = String(item.id || crypto.randomUUID())
      const { id: _omit, ...body } = item
      // merge:true so a re-run updates rather than churning documents, and so a
      // field the engine has since dropped is not silently resurrected as null.
      batch.set(col.doc(id), body, { merge: true })
    }
    await batch.commit()
  }
  console.log(`  ${name}: ${items.length} document(s)`)
}

// ---------------------------------------------------------------------------
// the App Store review demo client
// ---------------------------------------------------------------------------
// Apple rejects login-gated apps that a reviewer cannot sign into (guideline
// 2.1). LOOM's real auth is an operator-issued 6-digit code that expires in ten
// minutes and is read out over the phone — a reviewer in Cupertino has no way
// in. So we seed ONE client with a code that does not expire and is not
// consumed on use (see the `permanent` flag in engine/lib/clientauth.mjs).
//
// This is the only hole in the auth model and it is deliberately shaped to be
// the smallest possible one: the attempt limiter, the timing-safe compare and
// the client-scoping all still apply, so it is a reusable password for a single
// fake client holding fake data — not a bypass. It reaches no real client's
// records, because every API route scopes by the clientId on the token.

const DEMO_HANDLE = 'loomdemo'
const DEMO_CODE = '424242'
const DEMO_CLIENT_ID = 'demo-client-appstore-review'

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

function demoRecords() {
  const month = new Date().toISOString().slice(0, 7)
  const client = {
    id: DEMO_CLIENT_ID,
    name: 'Demo Roastery',
    nameAr: 'محمصة ديمو',
    handle: DEMO_HANDLE,
    category: 'cafe',
    city: 'Amman',
    plan: { content: true, ads: true },
    price: { perConversationJod: 1.75 },
    archivedAt: null,
  }

  // A month of plausible posts in mixed states, so the reviewer sees the
  // approve/reject flow with something to actually decide on rather than an
  // empty list. Captions are bilingual because the app is.
  const posts = Array.from({ length: 20 }, (_, i) => {
    const status = i < 6 ? 'approved' : i < 9 ? 'rejected' : i < 14 ? 'draft' : 'scheduled'
    return {
      id: `${DEMO_CLIENT_ID}-post-${String(i + 1).padStart(2, '0')}`,
      clientId: DEMO_CLIENT_ID,
      month,
      slot: i + 1,
      kind: i % 5 === 0 ? 'carousel' : 'single',
      status,
      captionEn: `Fresh roast, every morning. Visit us downtown. (demo post ${i + 1})`,
      captionAr: `قهوة محمصة طازجة كل صباح. زورونا في وسط البلد. (منشور تجريبي ${i + 1})`,
      hashtags: ['#amman', '#coffee', '#specialtycoffee'],
      image: null,
      carousel: null,
      scheduledAt: status === 'scheduled' ? `${month}-28T09:00:00.000Z` : null,
      postedAt: null,
      rejectionNote: status === 'rejected' ? 'Please use the new logo.' : null,
    }
  })

  const invoices = [{
    id: `${DEMO_CLIENT_ID}-invoice-${month}`,
    clientId: DEMO_CLIENT_ID,
    month,
    lines: [
      { label: 'Content plan — 20 posts', qty: 1, unitJod: 89, totalJod: 89 },
      { label: 'Conversations delivered', qty: 118, unitJod: 1.75, totalJod: 206.5 },
    ],
    totalJod: 295.5,
    status: 'issued',
    issuedAt: `${month}-01T00:00:00.000Z`,
  }]

  // Conversations drive the Performance screen. Spread across the month so the
  // by-day chart has a shape instead of one spike.
  const conversations = Array.from({ length: 118 }, (_, i) => ({
    id: `${DEMO_CLIENT_ID}-cv-${i}`,
    clientId: DEMO_CLIENT_ID,
    at: `${month}-${String((i % 27) + 1).padStart(2, '0')}T12:00:00.000Z`,
  }))

  const authCode = {
    id: `${DEMO_CLIENT_ID}-permanent-code`,
    handle: DEMO_HANDLE,
    clientId: DEMO_CLIENT_ID,
    codeHash: hashCode(DEMO_CODE),
    createdAt: new Date().toISOString(),
    expiresAt: '2099-12-31T23:59:59.000Z',
    consumedAt: null,
    permanent: true,
  }

  return { client, posts, invoices, conversations, authCode }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(DRY ? 'DRY RUN — nothing will be written\n' : 'Publishing to loom-clients\n')

  if (!ONLY_DEMO) {
    for (const name of COLLECTIONS) {
      await publish(name, await readLocal(name))
    }
  }

  if (WITH_DEMO || ONLY_DEMO) {
    const d = demoRecords()
    console.log('\nDemo client for App Store review:')
    await publish('clients', [d.client])
    await publish('posts', d.posts)
    await publish('invoices', d.invoices)
    await publish('conversations', d.conversations)
    await publish('clientauthcodes', [d.authCode])
    console.log(`\n  Hand these to Apple in the review notes:`)
    console.log(`    handle: ${DEMO_HANDLE}`)
    console.log(`    code:   ${DEMO_CODE}`)
  }

  console.log('\ndone.')
}

main().catch((err) => {
  console.error('sync failed:', err)
  process.exit(1)
})
