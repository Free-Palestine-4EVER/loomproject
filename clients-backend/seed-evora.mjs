#!/usr/bin/env node
// clients-backend/seed-evora.mjs
//
// Publish EVORA FUTURE HOME into the hosted client backend as LOOM's pitch
// client, so the iOS app opens onto a real business instead of an invented one.
//
//   node seed-evora.mjs --dry-run     # print what would be written
//   node seed-evora.mjs               # upload images + write Firestore
//   node seed-evora.mjs --no-images   # Firestore only, skip Storage
//
// CREDENTIALS: needs a service-account key for loom-clients.
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
//
// ── Three standing rules this file obeys ───────────────────────────────────
//
// 1. REAL BUSINESS ONLY. Every fact below (address, handle, hours, follower
//    count, founding year) is read from the real Evora brand constants, not
//    invented. Nothing here states a product price — Evora's site deliberately
//    quotes none, and a fake price in a demo is a fake price.
//
// 2. NO ALCOHOL, anywhere in an Evora asset. The five photographs shipped here
//    were each opened and looked at before being listed; none contains a
//    bottle, a glass, a bar or a decanter. Do not add an image to IMAGES that
//    you have not personally viewed — one of Evora's own client renders hides
//    a wine column, so the filename is not evidence.
//
// 3. ARABIC IS WRITTEN NATIVELY, not translated from the English line. The two
//    captions on each post are two originals in one voice. Never run these
//    through a translator "to sync them up".

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const EVORA_PUBLIC = path.resolve(process.env.HOME, 'Desktop/evorafuture/public/evora')

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry-run')
const NO_IMAGES = args.has('--no-images')

const PROJECT = 'loom-clients'
const BUCKET = process.env.LOOM_BUCKET || `${PROJECT}.firebasestorage.app`

const CLIENT_ID = 'evora-future-home'
const HANDLE = 'evorafuturehome'
const LOGIN_CODE = '424242'

// ── the five photographs, each viewed before being listed ──────────────────
// caption pairs are written per image, because a caption that could belong to
// any photograph is the tell of generated filler.
const IMAGES = [
  {
    file: 'room-kitchen.jpg',
    en: 'A kitchen built around how the family actually cooks — the island seats three, and the run behind it keeps every working surface clear.',
    ar: 'مطبخ مبني على طريقة العائلة في الطبخ فعلاً — الجزيرة تتسع لثلاثة، والوحدة خلفها تُبقي كل سطح عمل فاضي.',
  },
  {
    file: 'room-living.jpg',
    en: 'Amman out one wall, an olive tree in the corner, and nothing in the middle of the room fighting the view.',
    ar: 'عمّان من جدار كامل، وزيتونة في الزاوية، ولا شي بنص الغرفة بزاحم الإطلالة.',
  },
  {
    file: 'room-dining.jpg',
    en: 'Ten seats, one walnut top, and enough width down the centre that the table still works on an ordinary Tuesday.',
    ar: 'عشر كراسي وطاولة جوز وحدة، وعرض كافي بالنص يخلّي الطاولة تشتغل حتى بيوم ثلاثاء عادي.',
  },
  {
    file: 'ig-chesterfield.jpg',
    en: 'The reading chair. Put it where the morning light lands and it becomes the most used seat in the house.',
    ar: 'كرسي القراءة. حطّه بمطرح ما بتوقع شمس الصبح، وبصير أكثر كرسي بينستخدم بالبيت.',
  },
  {
    file: 'ig-lounge.jpg',
    en: 'A full living room, delivered and placed. Handover means you walk in and sit down — not that the boxes arrived.',
    ar: 'غرفة معيشة كاملة، توصيل وتركيب. التسليم يعني تفوت وتقعد — مش إنه الكراتين وصلت.',
  },
]

// posts without a photograph are typographic, exactly as the engine's own
// compose.mjs falls back when a product has no image on file.
const TYPOGRAPHIC = [
  {
    en: 'Wall units, wardrobes and full interiors. One team from the drawing to the day you move in.',
    ar: 'خزائن حائطية، دواليب، وتصاميم داخلية كاملة. فريق واحد من الرسمة لليوم اللي بتفوت فيه.',
  },
  {
    en: 'Since 2017, in Khalda. Wasfi Al-Tal Street, opposite Paradise Bakeries.',
    ar: 'من ٢٠١٧، في خلدا. شارع وصفي التل، مقابل أفران الجنّة.',
  },
  {
    en: 'Bring the floor plan. We will tell you what actually fits before anything is ordered.',
    ar: 'جيب مخطط الشقة. مننصحك شو بظبط فعلياً قبل ما ينطلب إشي.',
  },
  {
    en: 'Saturday to Thursday, ten in the morning until ten at night. Friday by appointment.',
    ar: 'من السبت للخميس، من العشرة الصبح للعشرة بالليل. الجمعة بموعد مسبق.',
  },
  {
    en: 'Measured, made and fitted. If a wall is out of true, the unit is built to the wall — not to the catalogue.',
    ar: 'قياس وتصنيع وتركيب. إذا الحيط مش مظبوط، الوحدة بتنعمل على الحيط — مش على الكتالوج.',
  },
]

const HASHTAGS = ['#evorafuturehome', '#امان', '#اثاث_منزلي', '#خلدا', '#interiordesign', '#amman']

// ── helpers ────────────────────────────────────────────────────────────────

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7)
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

let app = null
if (!DRY) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS is not set — see the header of this file.')
    process.exit(1)
  }
  app = initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT,
    storageBucket: BUCKET,
  })
}

const db = () => getFirestore()

/**
 * Upload one photograph and return a stable, public https URL.
 * Uses a download token rather than makePublic(), so the object is reachable
 * by the app without opening the whole bucket to listing.
 */
async function uploadImage(file) {
  const src = path.join(EVORA_PUBLIC, file)
  await fs.access(src)
  if (DRY) return `https://[dry-run]/${file}`

  const token = crypto.randomUUID()
  const dest = `clients/${CLIENT_ID}/posts/${file}`
  await getStorage().bucket(BUCKET).upload(src, {
    destination: dest,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`
}

async function publish(name, items) {
  if (DRY) {
    console.log(`  [dry-run] ${name}: ${items.length} document(s)`)
    return
  }
  const col = db().collection(name)
  for (let i = 0; i < items.length; i += 450) {
    const batch = db().batch()
    for (const item of items.slice(i, i + 450)) {
      const { id, ...body } = item
      batch.set(col.doc(String(id)), body, { merge: true })
    }
    await batch.commit()
  }
  console.log(`  ${name}: ${items.length} document(s)`)
}

// ── the records ────────────────────────────────────────────────────────────

function client() {
  return {
    id: CLIENT_ID,
    name: 'Evora Future Home',
    nameAr: 'إيفورا',
    handle: HANDLE,
    category: 'furniture',
    city: 'Amman',
    brand: {
      colors: ['#0f0f0f', '#c9a227', '#f5f1ea'],
      voiceEn: 'Plain, confident, specific. Never salesy, never a superlative.',
      voiceAr: 'لهجة أردنية بسيطة وواثقة. بدون مبالغة وبدون كلام إعلانات.',
      fontHint: 'Evora wordmark — geometric sans',
    },
    plan: { content: true, ads: true },
    price: { contentJod: 89, perConversationJod: 1.75 },
    createdAt: new Date().toISOString(),
    archivedAt: null,
  }
}

async function posts(month) {
  const out = []
  let slot = 0

  // resolve the photographs first so a failure surfaces before any write
  const uploaded = []
  for (const img of IMAGES) {
    const url = NO_IMAGES ? null : await uploadImage(img.file)
    uploaded.push({ ...img, url })
    if (!NO_IMAGES) console.log(`  uploaded ${img.file}`)
  }

  // A believable month in mixed states, so the app's Month screen shows the
  // real approve/reject flow rather than twenty identical drafts.
  //  6 approved · 2 rejected · 7 draft (awaiting the client) · 5 scheduled
  const plan = [
    ...Array(6).fill('approved'),
    ...Array(2).fill('rejected'),
    ...Array(7).fill('draft'),
    ...Array(5).fill('scheduled'),
  ]

  for (const status of plan) {
    slot += 1
    const withPhoto = slot % 4 !== 0
    const src = withPhoto
      ? uploaded[slot % uploaded.length]
      : TYPOGRAPHIC[slot % TYPOGRAPHIC.length]

    out.push({
      id: `${CLIENT_ID}-${month}-${String(slot).padStart(2, '0')}`,
      clientId: CLIENT_ID,
      month,
      slot,
      kind: slot % 7 === 0 ? 'reel' : 'single',
      status,
      captionEn: src.en,
      captionAr: src.ar,
      hashtags: HASHTAGS,
      image: withPhoto ? src.url : null,
      carousel: null,
      scheduledAt: status === 'scheduled'
        ? `${month}-${String(20 + (slot % 8)).padStart(2, '0')}T09:00:00.000Z`
        : null,
      postedAt: null,
      rejectionNote: status === 'rejected'
        ? 'Use the newer showroom photograph on this one, not the render.'
        : null,
      createdAt: new Date().toISOString(),
    })
  }
  return out
}

// Conversations drive the Performance screen. 143 across the month, weighted
// toward the weekend, so the by-day chart has a real shape instead of a flat
// line — and so the invoice sits above the 100 floor rather than on it.
function conversations(month) {
  const out = []
  let n = 0
  for (let day = 1; day <= 28; day++) {
    const dow = (day + 2) % 7            // rough weekday offset
    const count = dow === 5 || dow === 6 ? 8 : 4
    for (let i = 0; i < count; i++) {
      out.push({
        id: `${CLIENT_ID}-cv-${month}-${day}-${i}`,
        clientId: CLIENT_ID,
        campaignId: null,
        at: `${month}-${String(day).padStart(2, '0')}T${String(10 + (i % 9)).padStart(2, '0')}:00:00.000Z`,
        source: 'whatsapp',
        billedJod: 1.75,
        note: '',
      })
      n++
    }
  }
  console.log(`  (${n} conversations)`)
  return out
}

function invoice(month, conversationCount) {
  const perConv = 1.75
  const delivered = conversationCount * perConv
  const lines = [
    { label: 'Content subscription (المصنع)', qty: 1, unitJod: 89, totalJod: 89 },
    { label: 'Conversations delivered (WhatsApp)', qty: conversationCount, unitJod: perConv, totalJod: Number(delivered.toFixed(2)) },
  ]
  const total = lines.reduce((s, l) => s + l.totalJod, 0)
  return [{
    id: `${CLIENT_ID}-invoice-${month}`,
    clientId: CLIENT_ID,
    month,
    lines,
    totalJod: Number(total.toFixed(2)),
    status: 'sent',
    issuedAt: `${month}-01T00:00:00.000Z`,
  }]
}

// The login. This is a PITCH DEMO credential, not the production auth path:
// `permanent` means it neither expires nor is consumed on use. The attempt
// limiter, the timing-safe compare and the client-scoping all still apply, so
// it is a reusable password for one client record — not a bypass. Swap it for
// the normal operator-issued code before Evora is a paying client.
function authCode() {
  return [{
    id: `${CLIENT_ID}-pitch-code`,
    handle: HANDLE,
    clientId: CLIENT_ID,
    codeHash: hashCode(LOGIN_CODE),
    createdAt: new Date().toISOString(),
    expiresAt: '2099-12-31T23:59:59.000Z',
    consumedAt: null,
    permanent: true,
  }]
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const month = monthKey()
  console.log(DRY ? 'DRY RUN — nothing will be written\n' : `Publishing Evora to ${PROJECT}\n`)
  console.log(`  month: ${month}`)
  console.log(`  bucket: ${BUCKET}\n`)

  const p = await posts(month)
  const cv = conversations(month)

  await publish('clients', [client()])
  await publish('posts', p)
  await publish('conversations', cv)
  await publish('invoices', invoice(month, cv.length))
  await publish('clientauthcodes', authCode())

  console.log('\n  Sign in on the phone with:')
  console.log(`    handle: ${HANDLE}`)
  console.log(`    code:   ${LOGIN_CODE}`)
  console.log('\ndone.')
}

main().catch((err) => {
  console.error('seed failed:', err)
  process.exit(1)
})
