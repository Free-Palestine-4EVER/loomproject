// engine/fixtures/ads-selftest.mjs — verification harness for the BY RESULT
// ads module (csv.mjs / ads.mjs / invoices.mjs). Builds a realistic
// multi-month, multi-client, two-category dataset in an in-memory temp
// store (never touches engine/data/*.json, so it can't race the other
// agents working in this repo), then asserts:
//
//   1. importMetaCsv maps a messy real-shaped Meta export correctly,
//      including delimiter auto-detection, quoted embedded commas,
//      currency-formatted numbers, and explicit row-skip reasons.
//   2. learningCurve(category) genuinely falls month over month.
//   3. promoteWinner refuses on thin data (even when thin data has the best
//      CPC) and picks correctly once conversations clear the threshold —
//      including the single-creative-in-category case.
//   4. billing() floors at the minimum as a visible line item, and handles
//      zero conversations, no campaign that month, ads-off, and an unknown
//      client.
//
// Run: node engine/fixtures/ads-selftest.mjs
//
// Pricing note: engine/lib/pricing.mjs's resolvePricing() reads the REAL
// engine/data/settings.json, which the other agents working in this repo in
// parallel may be editing live. To keep this selftest fully isolated (and
// deterministic regardless of what settings overrides exist on disk right
// now), every call below passes an explicit `pricing: TEST_PRICING` — the
// same DI seam ads.mjs/invoices.mjs use for `store`.

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { importMetaCsv, cpc, learningCurve, promoteWinner, round2 } from '../lib/ads.mjs'
import { billing, generateMonth } from '../lib/invoices.mjs'
import { DEFAULT_PRICING } from '../lib/pricing.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEST_PRICING = DEFAULT_PRICING

// ---------------------------------------------------------------------------
// A tiny in-memory store implementing the same surface as lib/store.mjs
// (list/get/insert/update), so ads.mjs and invoices.mjs run unmodified
// against it via their `{ store }` dependency-injection parameter.
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
    dump(name) {
      return coll(name).slice()
    },
  }
}

// ---------------------------------------------------------------------------
// Assertion bookkeeping
// ---------------------------------------------------------------------------

let pass = 0
let fail = 0
function assert(cond, msg) {
  if (cond) {
    pass += 1
    console.log(`  ok   ${msg}`)
  } else {
    fail += 1
    console.log(`  FAIL ${msg}`)
  }
}
function section(title) {
  console.log(`\n== ${title} ==`)
}

async function main() {
  const store = makeMemoryStore()

  // ---------------------------------------------------------------------
  // Seed: clients
  // ---------------------------------------------------------------------
  section('seed: clients')

  const clients = {
    sofahouse: await store.insert('clients', {
      name: 'Sofa House', nameAr: 'بيت الأريكة', handle: '@sofahouse', category: 'furniture', city: 'Amman',
      plan: { content: true, ads: true }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
    }),
    megastore: await store.insert('clients', {
      name: 'Mega Furniture Store', nameAr: 'ميجا للأثاث', handle: '@megastore', category: 'furniture', city: 'Amman',
      plan: { content: true, ads: true }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
    }),
    brightsmile: await store.insert('clients', {
      name: 'Bright Smile Clinic', nameAr: 'عيادة بترايت سمايل', handle: '@brightsmile', category: 'clinic', city: 'Amman',
      plan: { content: true, ads: true }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
    }),
    nodata: await store.insert('clients', {
      name: 'No Data Yet Co', nameAr: 'بدون بيانات بعد', handle: '@nodatayet', category: 'retail', city: 'Amman',
      plan: { content: true, ads: true }, price: {}, createdAt: '2026-06-01T00:00:00Z', archivedAt: null,
    }),
    contentonly: await store.insert('clients', {
      name: 'Content Only Cafe', nameAr: 'مقهى المحتوى فقط', handle: '@contentonlycafe', category: 'restaurant', city: 'Amman',
      plan: { content: true, ads: false }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
    }),
    adsonly: await store.insert('clients', {
      name: 'Ads Only Boutique', nameAr: 'بوتيك الإعلانات فقط', handle: '@adsonlyboutique', category: 'boutique', city: 'Amman',
      plan: { content: false, ads: true }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: null,
    }),
    archived: await store.insert('clients', {
      name: 'Closed Shop', nameAr: 'محل مغلق', handle: '@closedshop', category: 'retail', city: 'Amman',
      plan: { content: true, ads: true }, price: {}, createdAt: '2026-01-01T00:00:00Z', archivedAt: '2026-05-01T00:00:00Z',
    }),
    // Dedicated, otherwise-unused clients for the CSV-import tests below, so
    // those imported conversations can't contaminate the billing/cpc/
    // learning-curve assertions made against sofahouse/brightsmile.
    csvtest: await store.insert('clients', {
      name: 'CSV Import Test Furniture Co', nameAr: 'شركة اختبار استيراد الأثاث', handle: '@csvtestfurniture', category: 'furniture', city: 'Amman',
      plan: { content: false, ads: false }, price: {}, createdAt: '2026-06-01T00:00:00Z', archivedAt: null,
    }),
    csvtest2: await store.insert('clients', {
      name: 'CSV Import Test Clinic Co', nameAr: 'شركة اختبار استيراد العيادة', handle: '@csvtestclinic', category: 'clinic', city: 'Amman',
      plan: { content: false, ads: false }, price: {}, createdAt: '2026-07-01T00:00:00Z', archivedAt: null,
    }),
  }
  assert(Object.keys(clients).length === 9, '9 seed clients created')

  // ---------------------------------------------------------------------
  // Seed: creatives (two proven categories: furniture, clinic; plus a
  // thin-data category and a no-creatives category for edge cases)
  // ---------------------------------------------------------------------
  section('seed: creatives')

  const creativeA = await store.insert('creatives', {
    category: 'furniture', headlineEn: 'Sofa Sets, Delivered This Week', headlineAr: 'أطقم كنب، توصيل هالأسبوع',
    bodyEn: '', bodyAr: '', imagePath: null, stats: { spendJod: 0, conversations: 0 },
    status: 'testing', clientIdOrigin: clients.sofahouse.id, createdAt: '2026-03-01T00:00:00Z',
  })
  const creativeB = await store.insert('creatives', {
    category: 'furniture', headlineEn: 'Modern Living Room Deals', headlineAr: 'عروض غرف معيشة عصرية',
    bodyEn: '', bodyAr: '', imagePath: null, stats: { spendJod: 0, conversations: 0 },
    status: 'testing', clientIdOrigin: clients.sofahouse.id, createdAt: '2026-03-01T00:00:00Z',
  })
  const creativeC = await store.insert('creatives', {
    category: 'furniture', headlineEn: 'Flash Sale — New Angle', headlineAr: 'تخفيض سريع — زاوية جديدة',
    bodyEn: '', bodyAr: '', imagePath: null, stats: { spendJod: 0, conversations: 0 },
    status: 'testing', clientIdOrigin: clients.sofahouse.id, createdAt: '2026-06-01T00:00:00Z',
  })
  const creativeClinic = await store.insert('creatives', {
    category: 'clinic', headlineEn: 'Free Whitening Consult', headlineAr: 'استشارة تبييض مجانية',
    bodyEn: '', bodyAr: '', imagePath: null, stats: { spendJod: 0, conversations: 0 },
    status: 'testing', clientIdOrigin: clients.brightsmile.id, createdAt: '2026-04-01T00:00:00Z',
  })
  const creativeBoutiqueThin = await store.insert('creatives', {
    category: 'boutique', headlineEn: 'New Drop Friday', headlineAr: 'إصدار جديد كل جمعة',
    bodyEn: '', bodyAr: '', imagePath: null, stats: { spendJod: 0, conversations: 0 },
    status: 'testing', clientIdOrigin: clients.adsonly.id, createdAt: '2026-06-01T00:00:00Z',
  })
  assert(true, '5 creatives across 3 categories (furniture x3, clinic x1, boutique x1); "unicorn" category left with none')

  // ---------------------------------------------------------------------
  // Seed: campaigns (client x creative)
  // ---------------------------------------------------------------------
  section('seed: campaigns')

  const campA = await store.insert('campaigns', { clientId: clients.sofahouse.id, creativeId: creativeA.id, startedAt: '2026-04-01', endedAt: null, status: 'live', budgetJod: 500 })
  const campB = await store.insert('campaigns', { clientId: clients.sofahouse.id, creativeId: creativeB.id, startedAt: '2026-04-01', endedAt: null, status: 'live', budgetJod: 500 })
  const campC = await store.insert('campaigns', { clientId: clients.sofahouse.id, creativeId: creativeC.id, startedAt: '2026-06-01', endedAt: null, status: 'live', budgetJod: 100 })
  const campClinic = await store.insert('campaigns', { clientId: clients.brightsmile.id, creativeId: creativeClinic.id, startedAt: '2026-05-01', endedAt: null, status: 'live', budgetJod: 300 })
  const campBoutique = await store.insert('campaigns', { clientId: clients.adsonly.id, creativeId: creativeBoutiqueThin.id, startedAt: '2026-06-01', endedAt: null, status: 'live', budgetJod: 80 })

  // ---------------------------------------------------------------------
  // Seed: conversations — hand-built so the learning curve genuinely falls
  // and the promote-winner threshold math is exact and checkable by hand.
  // ---------------------------------------------------------------------
  section('seed: conversations')

  async function seedConversations({ clientId, campaignId, month, count, costJod }) {
    for (let i = 0; i < count; i++) {
      await store.insert('conversations', {
        clientId, campaignId, at: `${month}-15`, source: 'whatsapp',
        costJod, billedJod: 1.75, note: 'seed',
      })
    }
  }

  // Creative A (furniture): 60 conversations total, cost/conversation falls
  // 2.50 -> 2.00 -> 1.20. This is the eventual winner.
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campA.id, month: '2026-04', count: 20, costJod: 2.50 })
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campA.id, month: '2026-05', count: 20, costJod: 2.00 })
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campA.id, month: '2026-06', count: 20, costJod: 1.20 })

  // Creative B (furniture): 55 conversations total, flat cost 3.00 — worse
  // CPC than A throughout, but still over the eligibility threshold.
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campB.id, month: '2026-04', count: 15, costJod: 3.00 })
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campB.id, month: '2026-05', count: 15, costJod: 3.00 })
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campB.id, month: '2026-06', count: 25, costJod: 3.00 })

  // Creative C (furniture): only 10 conversations, cost 1.00 each — the
  // BEST raw CPC of the three, but far under the 50-conversation threshold.
  // This is the trap: promoteWinner must refuse to crown it anyway.
  await seedConversations({ clientId: clients.sofahouse.id, campaignId: campC.id, month: '2026-06', count: 10, costJod: 1.00 })

  // Clinic: single creative in its category, 60 conversations, falling CPC.
  await seedConversations({ clientId: clients.brightsmile.id, campaignId: campClinic.id, month: '2026-05', count: 30, costJod: 1.50 })
  await seedConversations({ clientId: clients.brightsmile.id, campaignId: campClinic.id, month: '2026-06', count: 30, costJod: 1.30 })

  // Boutique: thin data only (20 conversations, under threshold).
  await seedConversations({ clientId: clients.adsonly.id, campaignId: campBoutique.id, month: '2026-06', count: 20, costJod: 2.00 })

  // Mega Furniture Store: a client with a healthy conversation count in
  // June, deliberately NOT tied to any creative/campaign (manual/no-CSV
  // conversations, campaignId null) — exists purely to exercise billing()
  // above the minimum without touching the category math above.
  for (let i = 0; i < 120; i++) {
    await store.insert('conversations', { clientId: clients.megastore.id, campaignId: null, at: '2026-06-20', source: 'whatsapp', costJod: 0.90, billedJod: 1.75, note: 'manual' })
  }

  // Ads-only Boutique client also needs a billing-month conversation count
  // (10, well under the 100 minimum) distinct from the campaign-level ones
  // above — reuse the same 20 seeded above (clientId already set), fine as-is.

  console.log(`  seeded ${(await store.list('conversations')).length} conversation records`)

  // =======================================================================
  // 1. CSV import
  // =======================================================================
  section('1. importMetaCsv — furniture fixture (comma-delimited, BOM, quoted comma, currency)')

  const csvClientId = clients.csvtest.id
  const furnitureCsv = await fs.readFile(path.join(HERE, 'meta-export-furniture-2026-06.csv'), 'utf8')
  const reportFurniture = await importMetaCsv(csvClientId, furnitureCsv, { store, pricing: TEST_PRICING })

  assert(reportFurniture.ok === true, 'import reports ok:true')
  assert(reportFurniture.delimiter === ',', `delimiter auto-detected as comma (got ${JSON.stringify(reportFurniture.delimiter)})`)
  assert(reportFurniture.mapping.conversations === 'Messaging conversations started', `conversations column mapped (got ${reportFurniture.mapping.conversations})`)
  assert(reportFurniture.mapping.spend === 'Amount spent (JOD)', `spend column mapped (got ${reportFurniture.mapping.spend})`)
  assert(reportFurniture.mapping.date === 'Reporting starts', `date column mapped (got ${reportFurniture.mapping.date})`)
  assert(reportFurniture.mapping.campaign === 'Campaign name', `campaign column mapped (got ${reportFurniture.mapping.campaign})`)
  assert(reportFurniture.rowsTotal === 7, `7 data rows read (got ${reportFurniture.rowsTotal})`)
  // Row 4 (1,240.00 spend, 0 conversations) -> unattributed spend, no conversation records.
  // Row 7 (blank spend) -> skipped as unparseable.
  assert(reportFurniture.rowsImported === 5, `5 rows produced conversation records (got ${reportFurniture.rowsImported})`)
  assert(reportFurniture.skipped.length === 2, `2 rows skipped (got ${reportFurniture.skipped.length}: ${JSON.stringify(reportFurniture.skipped)})`)
  assert(reportFurniture.skipped.some((s) => s.reason.includes('zero conversations')), 'skip reason names the zero-conversation row')
  assert(reportFurniture.skipped.some((s) => s.reason.includes('unparseable spend')), 'skip reason names the blank-spend row')
  assert(reportFurniture.spendJodUnattributed === 1240, `1240 JOD tracked as unattributed spend, not dropped (got ${reportFurniture.spendJodUnattributed})`)
  assert(reportFurniture.campaignsCreated.length === 2, `2 campaigns created — quoted "Sofa Set - Amman, Ras Al Ain" parsed as ONE campaign name despite the embedded comma (got ${reportFurniture.campaignsCreated.length}: ${reportFurniture.campaignsCreated.map(c => c.name).join(' | ')})`)
  assert(reportFurniture.campaignsCreated.some((c) => c.name === 'Sofa Set - Amman, Ras Al Ain'), 'embedded-comma campaign name preserved intact')
  // 18+20+22 (sofa, 3 valid rows) + 14+15 (dining table, 2 valid rows) = 89
  assert(reportFurniture.conversationsCreated === 89, `89 individual conversation records created from the aggregate rows (got ${reportFurniture.conversationsCreated})`)

  section('1b. importMetaCsv — clinic fixture (semicolon-delimited, reordered/uppercase headers, junk values)')

  const clinicCsv = await fs.readFile(path.join(HERE, 'meta-export-clinic-2026-07.csv'), 'utf8')
  const reportClinic = await importMetaCsv(clients.csvtest2.id, clinicCsv, { store, pricing: TEST_PRICING })

  assert(reportClinic.delimiter === ';', `delimiter auto-detected as semicolon (got ${JSON.stringify(reportClinic.delimiter)})`)
  assert(reportClinic.mapping.campaign === 'CAMPAIGN NAME', 'uppercase "CAMPAIGN NAME" header matched case-insensitively')
  assert(reportClinic.rowsTotal === 6, `6 data rows read (got ${reportClinic.rowsTotal})`)
  assert(reportClinic.rowsImported === 4, `4 valid rows imported (got ${reportClinic.rowsImported})`)
  assert(reportClinic.skipped.length === 2, `2 junk rows skipped (got ${reportClinic.skipped.length})`)
  assert(reportClinic.skipped.some((s) => s.reason.includes('unparseable conversations')), 'non-numeric "abc" conversations value skipped with reason, not treated as 0')
  assert(reportClinic.skipped.some((s) => s.reason.includes('unparseable spend')), '"not a number" spend value skipped with reason, not treated as 0')
  // 9+11+10 (Whitening) + 5 (Braces, only 1 of 3 rows valid) = 35
  assert(reportClinic.conversationsCreated === 35, `35 conversation records created (got ${reportClinic.conversationsCreated})`)

  section('1c. importMetaCsv — unmapped required column is a reported error, never a silent zero')

  const badCsv = 'Some Column,Another Column\nfoo,bar\n'
  const reportBad = await importMetaCsv(clients.sofahouse.id, badCsv, { store, pricing: TEST_PRICING })
  assert(reportBad.ok === false, 'import with no recognizable columns reports ok:false')
  assert(reportBad.unmapped.length === 3, `all 3 required fields reported unmapped (got ${JSON.stringify(reportBad.unmapped)})`)
  assert(reportBad.errors.length > 0, 'a human-readable error is present')

  // =======================================================================
  // 2. cpc()
  // =======================================================================
  section('2. cpc()')

  const cpcFurnitureJune = await cpc({ category: 'furniture' }, { from: '2026-06-01', to: '2026-06-30' }, { store })
  console.log(`  furniture, June 2026 window: ${JSON.stringify(cpcFurnitureJune)}`)
  // June, from seeded data only (A:20@1.20 + B:25@3.00 + C:10@1.00) = 55 conv, 24+75+10=109 spend -> 109/55
  assert(cpcFurnitureJune.conversations >= 55, `June furniture window includes at least the 55 seeded June conversations (got ${cpcFurnitureJune.conversations})`)
  assert(cpcFurnitureJune.cpcJod !== null, 'cpc computed (not null) when conversations exist')

  const cpcNoData = await cpc({ category: 'unicorn-empty-category' }, {}, { store })
  assert(cpcNoData.conversations === 0 && cpcNoData.cpcJod === null && cpcNoData.insufficientData === true, `cpc on a category with zero conversations returns null cpc, not NaN/Infinity (got ${JSON.stringify(cpcNoData)})`)

  const cpcClient = await cpc({ clientId: clients.brightsmile.id }, {}, { store })
  console.log(`  brightsmile all-time cpc: ${JSON.stringify(cpcClient)}`)
  assert(cpcClient.conversations === 60, `client-scoped cpc counts all 60 brightsmile conversations (got ${cpcClient.conversations})`)
  assert(cpcClient.cpcJod === round2((30 * 1.5 + 30 * 1.3) / 60), `client-scoped cpc value correct (got ${cpcClient.cpcJod})`)

  // =======================================================================
  // 3. learningCurve()
  // =======================================================================
  section('3. learningCurve("furniture")')

  const curve = await learningCurve('furniture', { store })
  console.log('  months:', JSON.stringify(curve.months, null, 2))
  assert(curve.months.length === 3, `3 months of data (got ${curve.months.length})`)
  assert(curve.months[0].month === '2026-04' && curve.months[2].month === '2026-06', 'months sorted chronologically')
  assert(curve.months[0].cpcJod === round2((20 * 2.5 + 15 * 3.0) / 35), `April cpc correct (got ${curve.months[0].cpcJod})`)
  assert(curve.months[1].cpcJod === round2((20 * 2.0 + 15 * 3.0) / 35), `May cpc correct (got ${curve.months[1].cpcJod})`)
  assert(curve.months[2].cpcJod === round2((20 * 1.2 + 25 * 3.0 + 10 * 1.0) / 55), `June cpc correct (got ${curve.months[2].cpcJod})`)
  assert(curve.months[0].cpcJod > curve.months[1].cpcJod && curve.months[1].cpcJod > curve.months[2].cpcJod, 'cpc genuinely falls month over month (April > May > June)')
  assert(curve.falling === true, 'falling flag is true')

  section('3b. learningCurve("clinic") — single-creative category still produces a real curve')
  const clinicCurve = await learningCurve('clinic', { store })
  assert(clinicCurve.months.length === 2, `2 months of clinic data (got ${clinicCurve.months.length})`)
  assert(clinicCurve.falling === true, 'clinic cpc also falls (1.50 -> 1.30)')

  // =======================================================================
  // 4. promoteWinner()
  // =======================================================================
  section('4. promoteWinner("furniture") — the trap: creative C has the best raw CPC but thin data')

  const promoFurniture = await promoteWinner('furniture', { store })
  console.log('  totals:', JSON.stringify(promoFurniture.totals, null, 2))
  assert(promoFurniture.status === 'promoted', `status is "promoted" (got ${promoFurniture.status})`)
  assert(promoFurniture.winner.id === creativeA.id, `creative A (lowest CPC among eligible) wins (got winner id ${promoFurniture.winner.id})`)
  assert(promoFurniture.winner.status === 'winner', 'winning creative record updated to status:"winner"')
  assert(promoFurniture.retired.length === 1 && promoFurniture.retired[0].id === creativeB.id, `creative B retired (got ${JSON.stringify(promoFurniture.retired.map(r => r?.id))})`)
  const creativeCAfter = await store.get('creatives', creativeC.id)
  assert(creativeCAfter.status === 'testing', `creative C — best raw CPC (1.00) but only 10 conversations — is left untouched at "testing" (got ${creativeCAfter.status})`)

  section('4b. promoteWinner("clinic") — single creative in category')
  const promoClinic = await promoteWinner('clinic', { store })
  assert(promoClinic.status === 'promoted', 'single eligible creative still promotes cleanly')
  assert(promoClinic.winner.id === creativeClinic.id, 'the solo clinic creative is the winner')
  assert(promoClinic.retired.length === 0, 'nothing left to retire in a single-creative category')

  section('4c. promoteWinner("boutique") — thin data only, must refuse')
  const promoBoutiqueBefore = await store.get('creatives', creativeBoutiqueThin.id)
  const promoBoutique = await promoteWinner('boutique', { store })
  assert(promoBoutique.status === 'insufficient-data', `refuses to promote on 20 conversations (< 50) (got status ${promoBoutique.status})`)
  const promoBoutiqueAfter = await store.get('creatives', creativeBoutiqueThin.id)
  assert(promoBoutiqueAfter.status === promoBoutiqueBefore.status, 'thin-data creative status left unmutated')

  section('4d. promoteWinner("unicorn") — category with zero creatives')
  const promoUnicorn = await promoteWinner('unicorn', { store })
  assert(promoUnicorn.status === 'no-creatives', `status is "no-creatives" (got ${promoUnicorn.status})`)

  // =======================================================================
  // 5. billing()
  // =======================================================================
  section('5. billing() — worked examples')

  const billSofahouseJune = await billing(clients.sofahouse.id, '2026-06', { store, pricing: TEST_PRICING })
  console.log('  sofahouse 2026-06 invoice:', JSON.stringify(billSofahouseJune, null, 2))
  // June conversations for sofahouse = 20 (A) + 25 (B) + 10 (C) = 55, below the 100 minimum.
  assert(billSofahouseJune._meta.conversationsDelivered === 55, `sofahouse delivered 55 conversations in June (got ${billSofahouseJune._meta.conversationsDelivered})`)
  const deliveredLine = billSofahouseJune.lines.find((l) => l.label.includes('delivered'))
  const topupLine = billSofahouseJune.lines.find((l) => l.label.includes('top-up'))
  assert(deliveredLine.qty === 55 && deliveredLine.totalJod === round2(55 * 1.75), `delivered line = 55 x 1.75 (got qty ${deliveredLine.qty}, total ${deliveredLine.totalJod})`)
  assert(topupLine.qty === 45 && topupLine.totalJod === round2(45 * 1.75), `top-up line = 45 x 1.75 to reach the 100 floor, as its OWN visible line (got qty ${topupLine.qty}, total ${topupLine.totalJod})`)
  assert(billSofahouseJune.totalJod === round2(89 + 100 * 1.75), `total = content (89) + full 100-conversation floor at 1.75 (got ${billSofahouseJune.totalJod})`)

  const billMegastoreJune = await billing(clients.megastore.id, '2026-06', { store, pricing: TEST_PRICING })
  const megaDelivered = billMegastoreJune.lines.find((l) => l.label.includes('delivered'))
  const megaTopup = billMegastoreJune.lines.find((l) => l.label.includes('top-up'))
  assert(megaDelivered.qty === 120, `megastore delivered 120 conversations, above the minimum (got ${megaDelivered.qty})`)
  assert(!megaTopup, 'no top-up line at all when above the minimum (not a zero-qty line — absent entirely)')
  assert(billMegastoreJune.totalJod === round2(89 + 120 * 1.75), `megastore total = content + 120 x 1.75, no floor applied (got ${billMegastoreJune.totalJod})`)

  const billNodataJune = await billing(clients.nodata.id, '2026-06', { store, pricing: TEST_PRICING })
  const nodataDelivered = billNodataJune.lines.find((l) => l.label.includes('delivered'))
  const nodataTopup = billNodataJune.lines.find((l) => l.label.includes('top-up'))
  assert(nodataDelivered.qty === 0 && nodataDelivered.totalJod === 0, `zero conversations / no campaign that month -> delivered line qty 0, total 0 (got ${JSON.stringify(nodataDelivered)})`)
  assert(nodataTopup.qty === 100 && nodataTopup.totalJod === round2(100 * 1.75), `top-up line covers the FULL minimum when nothing was delivered (got ${JSON.stringify(nodataTopup)})`)
  assert(billNodataJune.totalJod === round2(89 + 100 * 1.75), 'nodata client billed content + full floor')

  const billContentOnly = await billing(clients.contentonly.id, '2026-06', { store, pricing: TEST_PRICING })
  assert(billContentOnly.lines.length === 1 && billContentOnly.lines[0].label.includes('Content'), `plan.ads:false -> no conversation lines at all, not even a zero (got ${JSON.stringify(billContentOnly.lines)})`)
  assert(billContentOnly.totalJod === 89, 'content-only total is just the content price')

  const billAdsOnly = await billing(clients.adsonly.id, '2026-06', { store, pricing: TEST_PRICING })
  assert(!billAdsOnly.lines.some((l) => l.label.includes('Content')), 'plan.content:false -> no content line')
  assert(billAdsOnly._meta.conversationsDelivered === 20, `adsonly delivered 20 conversations (got ${billAdsOnly._meta.conversationsDelivered})`)
  assert(billAdsOnly.totalJod === round2(100 * 1.75), 'adsonly billed the full 100-floor at 1.75, no content line')

  let threwForUnknownClient = false
  try {
    await billing('does-not-exist', '2026-06', { store, pricing: TEST_PRICING })
  } catch (e) {
    threwForUnknownClient = true
    console.log(`  billing() on an unknown client threw as expected: ${e.message}`)
  }
  assert(threwForUnknownClient, 'billing() on an unknown client throws a visible error, not a blank invoice')

  // =======================================================================
  // 6. generateMonth()
  // =======================================================================
  section('6. generateMonth("2026-06")')

  const gen1 = await generateMonth('2026-06', { store, pricing: TEST_PRICING })
  console.log(`  generateMonth first run: ${gen1.count} invoices`)
  // Active clients with a plan: sofahouse, megastore, brightsmile, nodata, contentonly, adsonly = 6 (archived excluded)
  assert(gen1.count === 6, `6 invoices generated (archived client excluded) (got ${gen1.count})`)
  assert(!gen1.invoices.some((inv) => inv.clientId === clients.archived.id), 'archived client is excluded from generateMonth')

  const storedInvoicesAfterFirst = await store.list('invoices', { month: '2026-06' })
  assert(storedInvoicesAfterFirst.length === 6, `6 invoice records persisted to the store (got ${storedInvoicesAfterFirst.length})`)

  const gen2 = await generateMonth('2026-06', { store, pricing: TEST_PRICING })
  const storedInvoicesAfterSecond = await store.list('invoices', { month: '2026-06' })
  assert(storedInvoicesAfterSecond.length === 6, `re-running generateMonth upserts, does not duplicate (still 6, got ${storedInvoicesAfterSecond.length})`)
  const idsStable = gen1.invoices.every((inv) => gen2.invoices.some((inv2) => inv2.clientId === inv.clientId && inv2.id === inv.id))
  assert(idsStable, 'invoice ids are stable across re-generation (update, not insert-again)')

  // =======================================================================
  // Report
  // =======================================================================
  section('SUMMARY')
  console.log(`  ${pass} passed, ${fail} failed`)

  console.log('\n== Worked example: full sofahouse 2026-06 invoice ==')
  console.log(JSON.stringify(billSofahouseJune, null, 2))

  if (fail > 0) {
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('SELFTEST CRASHED:', e)
  process.exitCode = 1
})
