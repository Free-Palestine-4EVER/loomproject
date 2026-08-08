#!/usr/bin/env node
// engine/seed.mjs — demo data so the operator UI is never empty on first
// run. ONE believable Amman furniture client, 4 products, a part-generated
// month of posts, and an approval link. Every record below is clearly
// marked as demo data (see `demo: true` / DEMO_* prefixes) so it's obvious
// this is not a real client and safe to wipe.
//
// Run explicitly:  node engine/seed.mjs   — never runs automatically.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as store from './lib/store.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MONTH = new Date().toISOString().slice(0, 7)

async function main() {
  console.log(`[seed] writing demo data into ${store.DATA_DIR}`)

  const client = await store.insert('clients', {
    name: 'Dar Al Khait Furniture',
    nameAr: 'دار الخيط للأثاث',
    handle: '@daralkhait.jo',
    category: 'furniture',
    city: 'Amman',
    brand: {
      colors: ['#3A2449', '#E3BC72', '#F4EAF8'],
      voiceEn: 'Warm, unhurried, proud of the wood — never shouty, never "SALE SALE SALE".',
      voiceAr: 'دافئة، هادئة، فخورة بالخشب — بدون صراخ، بدون "تخفيضات تخفيضات".',
      fontHint: 'serif display + plain sans body',
    },
    plan: { content: true, ads: true },
    price: { contentJod: 89.00, perConversationJod: 1.75 },
    createdAt: new Date().toISOString(),
    archivedAt: null,
    demo: true,
  })

  const productSpecs = [
    {
      nameEn: 'Yarmouk Oak Dining Table',
      nameAr: 'طاولة سفرة يارموك بلوط',
      priceJod: 415,
      notes: 'Solid oak, seats 6, hand-oiled finish — the piece we lead with.',
    },
    {
      nameEn: 'Rabieh Linen Sofa — 3 Seat',
      nameAr: 'كنبة الرابية كتان — ٣ مقاعد',
      priceJod: 590,
      notes: 'Natural linen, walnut legs, made to order in 3 weeks.',
    },
    {
      nameEn: 'Weibdeh Reading Chair',
      nameAr: 'كرسي القراءة الويبدة',
      priceJod: 175,
      notes: 'Bouclé upholstery, brass-capped legs, one-person favourite for small salons.',
    },
    {
      nameEn: 'Jabal Amman Console',
      nameAr: 'كونسول جبل عمان',
      priceJod: 240,
      notes: 'Entryway console, two drawers, matches the dining table finish.',
    },
  ]

  const products = []
  for (const spec of productSpecs) {
    const product = await store.insert('products', {
      clientId: client.id,
      nameEn: spec.nameEn,
      nameAr: spec.nameAr,
      priceJod: spec.priceJod,
      photos: [],
      notes: spec.notes,
      demo: true,
    })
    products.push(product)
  }

  // A part-generated month: a mix of statuses so every screen (QA queue,
  // grid planner, approvals) has something to show on first run.
  const postSpecs = [
    {
      slot: 1, kind: 'single', status: 'posted',
      captionEn: 'Oak holds a room the way memory holds a family dinner.',
      captionAr: 'البلوط يمسك الغرفة متل ما الذاكرة بتمسك عشا العيلة.',
      hashtags: ['#DarAlKhait', '#عمان', '#أثاث_خشب'],
      image: null, qaSeconds: 145, regenerations: 0,
    },
    {
      slot: 2, kind: 'single', status: 'approved',
      captionEn: 'Linen softens with every season it sits through.',
      captionAr: 'الكتان بينعّم مع كل موسم بيقعد فيه.',
      hashtags: ['#الرابية', '#كنب'],
      image: null, qaSeconds: 98, regenerations: 1,
    },
    {
      slot: 3, kind: 'reel', status: 'qa',
      captionEn: 'Thirty seconds in the Weibdeh workshop — what bouclé actually feels like.',
      captionAr: 'ثلاثين ثانية بورشة الويبدة — شو حسّة قماش البوكليه فعلاً.',
      hashtags: ['#ورشة', '#كرسي_قراءة'],
      image: null, qaSeconds: 40, regenerations: 0,
    },
    {
      slot: 4, kind: 'carousel', status: 'draft',
      captionEn: 'A console is the first handshake a house gives its guests.',
      captionAr: 'الكونسول أول مصافحة يعطيها البيت لضيوفه.',
      hashtags: ['#جبل_عمان', '#مدخل_البيت'],
      image: null, carousel: null, qaSeconds: 0, regenerations: 0,
    },
    {
      slot: 5, kind: 'single', status: 'rejected',
      captionEn: 'Best dining table in Jordan, period.',
      captionAr: 'أفضل طاولة سفرة بالأردن، خلص.',
      hashtags: ['#طاولة_سفرة'],
      image: null, qaSeconds: 62, regenerations: 2,
      rejectionNote: 'Client flagged: we never claim "best in Jordan" — no evidence, rewrite without the superlative.',
    },
  ]

  const posts = []
  for (const spec of postSpecs) {
    const post = await store.insert('posts', {
      clientId: client.id,
      month: MONTH,
      slot: spec.slot,
      kind: spec.kind,
      status: spec.status,
      captionEn: spec.captionEn,
      captionAr: spec.captionAr,
      hashtags: spec.hashtags,
      image: spec.image ?? null,
      carousel: spec.carousel ?? null,
      scheduledAt: null,
      postedAt: spec.status === 'posted' ? new Date().toISOString() : null,
      qaSeconds: spec.qaSeconds,
      regenerations: spec.regenerations,
      rejectionNote: spec.rejectionNote ?? null,
      createdAt: new Date().toISOString(),
      demo: true,
    })
    posts.push(post)
  }

  // An approval link for the month, with one decision already recorded —
  // demonstrates the client-safe payload and the decision trail together.
  const approval = await store.insert('approvals', {
    token: 'DEMOdemoDEMOdemoDEMOde'.slice(0, 22),
    clientId: client.id,
    month: MONTH,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    decisions: [
      { postId: posts[0].id, verdict: 'yes', note: '', at: new Date().toISOString() },
    ],
    demo: true,
  })

  // A couple of ads-side records so the Ads screen and /api/ops "ads" block
  // aren't empty either.
  const creative = await store.insert('creatives', {
    category: 'furniture',
    headlineEn: 'The table that outlasts the lease',
    headlineAr: 'الطاولة يلي بتضل بعد ما يخلص عقد الإيجار',
    bodyEn: 'Solid oak dining tables, Amman-made.',
    bodyAr: 'طاولات سفرة بلوط صلب، صناعة عمان.',
    imagePath: null,
    stats: { spendJod: 62.5, conversations: 35 },
    status: 'testing',
    clientIdOrigin: client.id,
    createdAt: new Date().toISOString(),
    demo: true,
  })

  const campaign = await store.insert('campaigns', {
    clientId: client.id,
    creativeId: creative.id,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'live',
    budgetJod: 150,
    demo: true,
  })

  const conversationCount = 35
  for (let i = 0; i < conversationCount; i++) {
    await store.insert('conversations', {
      clientId: client.id,
      campaignId: campaign.id,
      at: new Date(Date.now() - i * 1000 * 60 * 60 * 6).toISOString(),
      source: i % 3 === 0 ? 'dm' : 'whatsapp',
      costJod: 1.79, // ~62.5 / 35
      billedJod: 1.75,
      note: 'demo conversation',
      demo: true,
    })
  }

  console.log(`[seed] done. client=${client.name} (${client.id}), products=${products.length}, posts=${posts.length}`)
  console.log(`[seed] approval link: /a/${approval.token}`)
  console.log('[seed] this is demo data — every record is tagged demo:true')
}

main().catch((e) => {
  console.error('[seed] failed:', e)
  process.exit(1)
})
