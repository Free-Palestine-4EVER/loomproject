#!/usr/bin/env node
// engine/server.mjs — LOOM ENGINE operator API + UI host.
//
// Plain node:http, no framework. Binds all interfaces on port 4950 (--port
// to override). Serves the operator UI statically from engine/ui/, and the
// no-login client approval page at /a/:token -> engine/ui/approve.html.
//
// Routes that depend on another agent's module (generate.mjs, carousel.mjs,
// ads.mjs, invoices.mjs) import it lazily inside the handler, wrapped in
// try/catch, so this server always boots and every other route works even
// while those files don't exist yet. Missing-module routes answer 503 with
// a clear message instead of crashing.
//
//   GET    /api/health
//   GET|POST|PATCH|DELETE /api/clients(/:id)
//   GET|POST|PATCH|DELETE /api/products(/:id)
//   GET|POST|PATCH|DELETE /api/posts(/:id)         POST /api/posts/:id/regenerate
//   POST   /api/generate/month                     GET /api/jobs/:id
//   POST   /api/carousel/cut
//   POST   /api/approvals   GET /api/approvals/:token   POST /api/approvals/:token/decide
//   GET|POST|PATCH /api/creatives(/:id)             GET /api/creatives/best
//   GET|POST|PATCH /api/campaigns(/:id)
//   GET|POST /api/conversations                     POST /api/conversations/import
//   GET /api/invoices    POST /api/invoices/generate    PATCH /api/invoices/:id
//   GET|PATCH /api/settings
//   GET    /api/ops?month=
//   GET    /a/:token                                -> engine/ui/approve.html
//   *      static files under engine/ui/
//
//   Client app (ios/CONTRACT.md Part 1) — one-time-code auth + client-scoped
//   API. Every /api/client/* route below /auth is Bearer-protected and
//   derives clientId from the token via clientauth.authenticate(), NEVER
//   from a query/body field — that's the whole cross-tenant safety model.
//   POST   /api/client/auth/request                 { handle } -> always 200
//   POST   /api/client/auth/verify                  { handle, code } -> { token, client }
//   POST   /api/client/auth/logout                  (Bearer)
//   GET    /api/client/me                           (Bearer)
//   GET    /api/client/months                       (Bearer)
//   GET    /api/client/months/:month/posts          (Bearer)
//   POST   /api/client/posts/:id/decide             (Bearer) { verdict, note }
//   GET    /api/client/performance?month=           (Bearer)
//   GET    /api/client/invoices                     (Bearer)
//   GET|POST /api/client/requests                   (Bearer)
//   GET    /api/operator/client-codes                -> pending one-time codes, for readout
//   GET    /api/operator/client-requests              PATCH /api/operator/client-requests/:id
// ————————————————————————————————————————————————————————————

import http from 'node:http'
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import * as store from './lib/store.mjs'
import { resolvePricing, DEFAULT_PRICING } from './lib/pricing.mjs'
import { computeOps } from './lib/ops.mjs'
import * as clientAuth from './lib/clientauth.mjs'
import * as clientApi from './lib/clientapi.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const UI_DIR = path.join(HERE, 'ui')

const argPort = process.argv.find((a) => a.startsWith('--port'))
const PORT = Number(
  (argPort && (argPort.split('=')[1] || process.argv[process.argv.indexOf(argPort) + 1])) ||
  process.env.PORT || 4950
)

const VERSION = '0.1.0'

// ——— tiny helpers (match studio/server.mjs house style) ——————————————

const json = (res, code, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

const fail = (res, code, message, extra) => json(res, code, { error: { code, message, ...extra } })

const readBody = (req, limit = 5_000_000) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch { reject(new Error('invalid JSON body')) }
    })
    req.on('error', reject)
  })

/**
 * Lazily import an engine/lib module owned by another agent. Never throws —
 * returns null if the file is missing or fails to load, so callers can
 * answer a clear 503 instead of crashing the server.
 */
async function tryImport(relPath) {
  try {
    return await import(new URL(relPath, import.meta.url))
  } catch (e) {
    return null
  }
}

const moduleUnavailable = (res, name) =>
  fail(res, 503, `${name} is not available yet — this route will work once engine/lib/${name} exists.`)

// ——— job runner (in-memory) for /api/generate/month ————————————————
//
// generate.mjs (agent B) exports `generateMonth(client, products, counts,
// onProgress)` — a pure content-generation function with no knowledge of the
// store. It returns `{ posts: [{ kind, product, captions }], log }`. This
// job runner drives it, mirrors its progress/log into the job, and is the
// one that actually persists the results as real post records (that part is
// server.mjs's job, not generate.mjs's).

const jobs = new Map()

function newJob() {
  const id = crypto.randomUUID()
  const job = { id, state: 'queued', progress: 0, log: [], result: null, createdAt: new Date().toISOString() }
  jobs.set(id, job)
  return job
}

function jobCtx(job) {
  return {
    log(msg) { job.log.push({ at: new Date().toISOString(), msg: String(msg) }) },
    progress(pct) { job.progress = Math.max(0, Math.min(100, Number(pct) || 0)) },
  }
}

async function runGenerateMonthJob(job, payload) {
  job.state = 'running'
  const ctx = jobCtx(job)
  try {
    const mod = await tryImport('./lib/generate.mjs')
    if (!mod || typeof mod.generateMonth !== 'function') {
      ctx.log('engine/lib/generate.mjs is not available yet — nothing was generated.')
      job.state = 'error'
      job.result = { error: 'generate.mjs missing' }
      return
    }
    const client = await store.get('clients', payload.clientId)
    if (!client) {
      ctx.log(`no such client ${payload.clientId}`)
      job.state = 'error'
      job.result = { error: 'client not found' }
      return
    }
    const products = await store.list('products', { clientId: payload.clientId })
    ctx.log(`starting generation for ${client.name} / ${payload.month} — counts=${JSON.stringify(payload.counts)}`)

    const { posts: plannedPosts = [], log: genLog = [] } = await mod.generateMonth(
      client, products, payload.counts,
      (update) => {
        const pct = update.total > 0 ? Math.round((update.done / update.total) * 100) : 100
        ctx.progress(pct)
        ctx.log(`(${update.done}/${update.total}) ${update.kind} ${update.ok ? 'ok' : 'placeholder'}`)
      }
    )
    for (const entry of genLog) ctx.log(`[generate:${entry.level}] ${entry.message}`)

    const existing = await store.list('posts', { clientId: client.id, month: payload.month })
    let nextSlot = existing.length + 1
    const created = []
    for (const rawItem of plannedPosts) {
      const item = { ...rawItem, ...mediaUrlsForPost(rawItem) }
      const placeholder = !!item.captions?._placeholder
      const record = await store.insert('posts', {
        clientId: client.id,
        month: payload.month,
        slot: nextSlot++,
        kind: item.kind,
        // productId is beyond the SPEC's posts schema, but without it a later
        // regenerate has no idea which product the post was about and silently
        // degrades to a client-name headline.
        productId: item.product?.id ?? null,
        status: placeholder ? 'draft' : 'qa',
        captionEn: item.captions?.captionEn ?? '',
        captionAr: item.captions?.captionAr ?? '',
        hashtags: item.captions?.hashtags ?? [],
        image: item.image ?? null,
        carousel: item.carousel ?? null,
        scheduledAt: null,
        postedAt: null,
        qaSeconds: 0,
        regenerations: 0,
        rejectionNote: placeholder ? `generation placeholder: ${item.captions._reason}` : null,
        createdAt: new Date().toISOString(),
      })
      created.push(record)
    }

    job.result = { created: created.map((p) => p.id), count: created.length, posts: created }
    job.progress = 100
    job.state = 'done'
    ctx.log(`done — created ${created.length} posts`)
  } catch (e) {
    ctx.log(`error: ${e?.message || e}`)
    job.state = 'error'
    job.result = { error: e?.message || String(e) }
  }
}

// ——— static file serving of engine/ui/ ————————————————————————————

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const NO_UI_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>LOOM ENGINE</title></head>
<body style="background:#130A1B;color:#F4EAF8;font-family:monospace;padding:3rem">
<h1>UI not built yet</h1><p>engine/ui/ does not exist yet. The API is live at /api/*.</p>
</body></html>`

// Generated images live on disk under engine/data/media/, but the browser can
// only load them over HTTP — an absolute filesystem path in an <img src> never
// loads, and the UI's onerror handlers hide that as a benign "no image". So the
// store keeps portable /media/... URLs and this route serves the bytes.
const MEDIA_DIR = path.resolve(HERE, 'data', 'media')

function toMediaUrl(p) {
  if (typeof p !== 'string' || !p) return p
  const abs = path.resolve(p)
  if (!abs.startsWith(MEDIA_DIR)) return p
  return '/media/' + path.relative(MEDIA_DIR, abs).split(path.sep).map(encodeURIComponent).join('/')
}

// Walks the shapes the generator returns: { image, carousel: { boardPath, slides[] } }
function mediaUrlsForPost(media) {
  if (!media) return media
  return {
    ...media,
    image: toMediaUrl(media.image),
    carousel: media.carousel
      ? {
          ...media.carousel,
          boardPath: toMediaUrl(media.carousel.boardPath),
          slides: Array.isArray(media.carousel.slides) ? media.carousel.slides.map(toMediaUrl) : media.carousel.slides,
        }
      : media.carousel,
  }
}

async function serveMedia(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.slice('/media/'.length).split('?')[0])
  const abs = path.normalize(path.join(MEDIA_DIR, rel))
  if (!abs.startsWith(MEDIA_DIR)) return fail(res, 400, 'bad path')
  try {
    const contents = await fs.readFile(abs)
    res.writeHead(200, {
      'content-type': MIME[path.extname(abs)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    })
    res.end(contents)
  } catch {
    fail(res, 404, 'media not found')
  }
}

async function serveStatic(req, res, urlPath) {
  const uiExists = fssync.existsSync(UI_DIR)
  if (!uiExists) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(NO_UI_HTML)
  }
  let rel = urlPath === '/' ? '/index.html' : urlPath
  rel = rel.split('?')[0]
  const abs = path.normalize(path.join(UI_DIR, rel))
  if (!abs.startsWith(UI_DIR)) return fail(res, 400, 'bad path')
  try {
    const stat = await fs.stat(abs)
    const filePath = stat.isDirectory() ? path.join(abs, 'index.html') : abs
    const contents = await fs.readFile(filePath)
    const ext = path.extname(filePath)
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
    res.end(contents)
  } catch {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(NO_UI_HTML)
  }
}

async function serveApprovePage(res, token) {
  const abs = path.join(UI_DIR, 'approve.html')
  try {
    const contents = await fs.readFile(abs)
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(contents)
  } catch {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Approve</title></head>
<body style="background:#130A1B;color:#F4EAF8;font-family:monospace;padding:3rem">
<h1>UI not built yet</h1><p>engine/ui/approve.html does not exist yet. Token: ${token}</p>
</body></html>`)
  }
}

// ——— validation helpers ——————————————————————————————————————————

function requireFields(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body?.[f] === null || body?.[f] === '')
  return missing
}

const nowIso = () => new Date().toISOString()

// ——— route handlers ——————————————————————————————————————————————

async function handleHealth(res) {
  const counts = await store.counts()
  json(res, 200, { ok: true, version: VERSION, counts })
}

// clients ------------------------------------------------------------

async function listClients(req, res, query) {
  const items = await store.list('clients')
  json(res, 200, { items })
}

async function createClient(req, res, body) {
  const missing = requireFields(body, ['name', 'nameAr', 'handle', 'category'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const record = await store.insert('clients', {
    name: body.name,
    nameAr: body.nameAr,
    handle: body.handle,
    category: String(body.category).toLowerCase(),
    city: body.city ?? '',
    brand: {
      colors: body.brand?.colors ?? [],
      voiceEn: body.brand?.voiceEn ?? '',
      voiceAr: body.brand?.voiceAr ?? '',
      fontHint: body.brand?.fontHint ?? '',
    },
    plan: { content: !!body.plan?.content, ads: !!body.plan?.ads },
    price: {
      contentJod: body.price?.contentJod ?? DEFAULT_PRICING.CONTENT_PRICE_JOD,

    },
    createdAt: nowIso(),
    archivedAt: null,
  })
  json(res, 201, record)
}

async function patchClient(req, res, id, body) {
  const updated = await store.update('clients', id, body)
  if (!updated) return fail(res, 404, 'client not found')
  json(res, 200, updated)
}

async function archiveClient(req, res, id) {
  const updated = await store.update('clients', id, { archivedAt: nowIso() })
  if (!updated) return fail(res, 404, 'client not found')
  json(res, 200, updated)
}

// products ------------------------------------------------------------

async function listProducts(req, res, query) {
  const match = {}
  if (query.clientId) match.clientId = query.clientId
  const items = await store.list('products', match)
  json(res, 200, { items })
}

async function createProduct(req, res, body) {
  const missing = requireFields(body, ['clientId', 'nameEn', 'nameAr'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const record = await store.insert('products', {
    clientId: body.clientId,
    nameEn: body.nameEn,
    nameAr: body.nameAr,
    priceJod: body.priceJod ?? null,
    photos: Array.isArray(body.photos) ? body.photos : [],
    notes: body.notes ?? '',
  })
  json(res, 201, record)
}

async function patchProduct(req, res, id, body) {
  const updated = await store.update('products', id, body)
  if (!updated) return fail(res, 404, 'product not found')
  json(res, 200, updated)
}

async function deleteProduct(req, res, id) {
  const removed = await store.remove('products', id)
  if (!removed) return fail(res, 404, 'product not found')
  json(res, 200, { ok: true })
}

// posts ------------------------------------------------------------

async function listPosts(req, res, query) {
  const match = {}
  if (query.clientId) match.clientId = query.clientId
  if (query.month) match.month = query.month
  if (query.status) match.status = query.status
  const items = await store.list('posts', match)
  json(res, 200, { items })
}

async function createPost(req, res, body) {
  const missing = requireFields(body, ['clientId', 'month', 'kind'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const siblings = await store.list('posts', { clientId: body.clientId, month: body.month })
  const record = await store.insert('posts', {
    clientId: body.clientId,
    month: body.month,
    slot: body.slot ?? siblings.length + 1,
    kind: body.kind,
    status: body.status ?? 'draft',
    captionEn: body.captionEn ?? '',
    captionAr: body.captionAr ?? '',
    hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
    image: body.image ?? null,
    carousel: body.carousel ?? null,
    scheduledAt: body.scheduledAt ?? null,
    postedAt: body.postedAt ?? null,
    qaSeconds: 0,
    regenerations: 0,
    rejectionNote: null,
    createdAt: nowIso(),
  })
  json(res, 201, record)
}

async function patchPost(req, res, id, body) {
  // qaSeconds is accumulated, never overwritten, so a QA timer flush can
  // safely POST repeatedly without losing time from a race.
  if (typeof body.qaSeconds === 'number') {
    const patch = { ...body }
    delete patch.qaSeconds
    const updated = await store.mutate('posts', id, (post) => ({
      ...post,
      ...patch,
      qaSeconds: (Number(post.qaSeconds) || 0) + body.qaSeconds,
    }))
    if (!updated) return fail(res, 404, 'post not found')
    return json(res, 200, updated)
  }
  const updated = await store.update('posts', id, body)
  if (!updated) return fail(res, 404, 'post not found')
  json(res, 200, updated)
}

async function deletePost(req, res, id) {
  const removed = await store.remove('posts', id)
  if (!removed) return fail(res, 404, 'post not found')
  json(res, 200, { ok: true })
}

async function regeneratePost(req, res, id, body) {
  const what = body?.what
  if (!['caption', 'image', 'all'].includes(what)) return fail(res, 400, 'body.what must be caption|image|all')
  const post = await store.get('posts', id)
  if (!post) return fail(res, 404, 'post not found')
  const mod = await tryImport('./lib/generate.mjs')
  if (!mod) return moduleUnavailable(res, 'generate.mjs')

  const wantsCaption = what === 'caption' || what === 'all'
  const wantsImage = what === 'image' || what === 'all'
  if (wantsCaption && typeof mod.generateCaptions !== 'function') return moduleUnavailable(res, 'generate.mjs')
  if (wantsImage && typeof mod.regenerateImage !== 'function') return moduleUnavailable(res, 'generate.mjs')

  try {
    const client = await store.get('clients', post.clientId)
    const product = post.productId ? await store.get('products', post.productId) : null
    const log = []

    let captions = null
    if (wantsCaption) {
      captions = await mod.generateCaptions(client, product, post.kind, { log })
    }

    // regenerateImage derives its headline from the post's copy, so hand it the
    // freshly-written captions when we just regenerated them.
    let media = null
    if (wantsImage) {
      const forHeadline = captions && !captions._placeholder
        ? { ...post, captionEn: captions.captionEn, captionAr: captions.captionAr }
        : post
      media = mediaUrlsForPost(await mod.regenerateImage(client, product, forHeadline, { log }))
    }

    const updated = await store.mutate('posts', id, (p) => ({
      ...p,
      ...(captions ? {
        captionEn: captions.captionEn,
        captionAr: captions.captionAr,
        hashtags: captions.hashtags,
      } : {}),
      // A failed composition keeps the old image rather than blanking the post.
      ...(media?.ok ? { image: media.image, carousel: media.carousel } : {}),
      status: captions?._placeholder ? p.status : 'qa',
      rejectionNote: body?.note ?? p.rejectionNote,
      regenerations: (Number(p.regenerations) || 0) + 1,
    }))

    json(res, 200, {
      post: updated,
      placeholder: captions ? captions._placeholder : false,
      imageOk: media ? media.ok : null,
      imageReason: media ? media.reason : null,
      log,
    })
  } catch (e) {
    fail(res, 502, `generate.mjs regeneration failed: ${e?.message || e}`)
  }
}

// generate/month + jobs ------------------------------------------------

async function generateMonthRoute(req, res, body) {
  const missing = requireFields(body, ['clientId', 'month'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const mod = await tryImport('./lib/generate.mjs')
  if (!mod || typeof mod.generateMonth !== 'function') return moduleUnavailable(res, 'generate.mjs')
  const job = newJob()
  json(res, 202, { jobId: job.id })
  // fire and forget — progress/result are polled via GET /api/jobs/:id
  runGenerateMonthJob(job, {
    clientId: body.clientId,
    month: body.month,
    counts: body.counts || { single: 0, carousel: 0, reel: 0 },
  })
}

async function getJob(req, res, id) {
  const job = jobs.get(id)
  if (!job) return fail(res, 404, 'job not found')
  json(res, 200, job)
}

// carousel ------------------------------------------------------------

async function carouselCut(req, res, body) {
  const missing = requireFields(body, ['boardPath', 'cuts'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const mod = await tryImport('./lib/carousel.mjs')
  if (!mod || typeof mod.cutCarousel !== 'function') return moduleUnavailable(res, 'carousel.mjs')
  try {
    const result = await mod.cutCarousel({
      boardPath: body.boardPath,
      cuts: body.cuts,
      textBoxes: Array.isArray(body.textBoxes) ? body.textBoxes : [],
    })
    json(res, 200, result)
  } catch (e) {
    fail(res, 502, `carousel.mjs cutCarousel failed: ${e?.message || e}`)
  }
}

// approvals ------------------------------------------------------------

function randomToken() {
  return crypto.randomBytes(16).toString('base64url').slice(0, 22)
}

async function createApproval(req, res, body) {
  const missing = requireFields(body, ['clientId', 'month'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const token = randomToken()
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // 30 days
  const record = await store.insert('approvals', {
    token, clientId: body.clientId, month: body.month, createdAt, expiresAt, decisions: [],
  })
  json(res, 201, { token: record.token, url: `/a/${record.token}` })
}

async function getApprovalByToken(req, res, token) {
  const approvals = await store.list('approvals', { token })
  const approval = approvals[0]
  if (!approval) return fail(res, 404, 'approval link not found')
  const client = await store.get('clients', approval.clientId)
  const posts = await store.list('posts', { clientId: approval.clientId, month: approval.month })
  // client-safe payload: no costs, no internals (qaSeconds, regenerations, rejectionNote are ours)
  const safePosts = posts
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((p) => ({
      id: p.id, slot: p.slot, kind: p.kind, status: p.status,
      captionEn: p.captionEn, captionAr: p.captionAr, hashtags: p.hashtags,
      image: p.image, carousel: p.carousel ? { slides: p.carousel.slides } : null,
      scheduledAt: p.scheduledAt,
    }))
  json(res, 200, {
    token: approval.token,
    month: approval.month,
    client: client ? { name: client.name, nameAr: client.nameAr, handle: client.handle, brand: client.brand } : null,
    posts: safePosts,
    decisions: approval.decisions,
    expiresAt: approval.expiresAt,
  })
}

async function decideApproval(req, res, token, body) {
  const missing = requireFields(body, ['postId', 'verdict'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  if (!['yes', 'no'].includes(body.verdict)) return fail(res, 400, 'verdict must be yes|no')
  const approvals = await store.list('approvals', { token })
  const approval = approvals[0]
  if (!approval) return fail(res, 404, 'approval link not found')
  const decision = { postId: body.postId, verdict: body.verdict, note: body.note ?? '', at: nowIso() }
  const updated = await store.update('approvals', approval.id, { decisions: [...approval.decisions, decision] })
  await store.update('posts', body.postId, {
    status: body.verdict === 'yes' ? 'approved' : 'rejected',
    rejectionNote: body.verdict === 'no' ? (body.note ?? '') : null,
  })
  json(res, 200, updated)
}

// creatives ------------------------------------------------------------

async function listCreatives(req, res, query) {
  const match = {}
  if (query.category) match.category = query.category
  const items = await store.list('creatives', match)
  json(res, 200, { items })
}

async function createCreative(req, res, body) {
  const missing = requireFields(body, ['category', 'headlineEn', 'headlineAr'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const record = await store.insert('creatives', {
    category: String(body.category).toLowerCase(),
    headlineEn: body.headlineEn, headlineAr: body.headlineAr,
    bodyEn: body.bodyEn ?? '', bodyAr: body.bodyAr ?? '',
    imagePath: body.imagePath ?? null,
    stats: { spendJod: 0, conversations: 0 },
    status: body.status ?? 'testing',
    clientIdOrigin: body.clientIdOrigin ?? null,
    createdAt: nowIso(),
  })
  json(res, 201, record)
}

async function patchCreative(req, res, id, body) {
  const updated = await store.update('creatives', id, body)
  if (!updated) return fail(res, 404, 'creative not found')
  json(res, 200, updated)
}

async function bestCreative(req, res, query) {
  if (!query.category) return fail(res, 400, 'category is required')
  const category = String(query.category).toLowerCase()
  const items = await store.list('creatives', { category })
  let winner = items.find((c) => c.status === 'winner')
  if (!winner) {
    // no promoted winner yet — best guess is the lowest CPC among those with data
    const withData = items.filter((c) => (c.stats?.conversations || 0) > 0)
    withData.sort((a, b) => (a.stats.spendJod / a.stats.conversations) - (b.stats.spendJod / b.stats.conversations))
    winner = withData[0] || null
  }
  json(res, 200, { category, winner })
}

// campaigns ------------------------------------------------------------

async function listCampaigns(req, res, query) {
  const match = {}
  if (query.clientId) match.clientId = query.clientId
  const items = await store.list('campaigns', match)
  json(res, 200, { items })
}

async function createCampaign(req, res, body) {
  const missing = requireFields(body, ['clientId', 'creativeId', 'budgetJod'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const record = await store.insert('campaigns', {
    clientId: body.clientId, creativeId: body.creativeId,
    startedAt: body.startedAt ?? nowIso(), endedAt: null,
    status: body.status ?? 'live', budgetJod: body.budgetJod,
  })
  json(res, 201, record)
}

async function patchCampaign(req, res, id, body) {
  const updated = await store.update('campaigns', id, body)
  if (!updated) return fail(res, 404, 'campaign not found')
  json(res, 200, updated)
}

// conversations ------------------------------------------------------------

async function listConversations(req, res, query) {
  let items = await store.list('conversations', query.clientId ? { clientId: query.clientId } : undefined)
  if (query.month) items = items.filter((c) => typeof c.at === 'string' && c.at.slice(0, 7) === query.month)
  json(res, 200, { items })
}

async function createConversation(req, res, body) {
  const missing = requireFields(body, ['clientId', 'at', 'source'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const record = await store.insert('conversations', {
    clientId: body.clientId, campaignId: body.campaignId ?? null,
    at: body.at, source: body.source,
    costJod: Number(body.costJod) || 0, billedJod: Number(body.billedJod) || 0,
    note: body.note ?? '',
  })
  json(res, 201, record)
}

async function importConversations(req, res, body) {
  const missing = requireFields(body, ['clientId', 'csv'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const mod = await tryImport('./lib/ads.mjs')
  if (!mod || typeof mod.importMetaCsv !== 'function') return moduleUnavailable(res, 'ads.mjs')
  try {
    const result = await mod.importMetaCsv(body.clientId, body.csv)
    json(res, 200, result)
  } catch (e) {
    fail(res, 502, `ads.mjs importMetaCsv failed: ${e?.message || e}`)
  }
}

// invoices ------------------------------------------------------------

async function listInvoices(req, res, query) {
  const items = await store.list('invoices', query.month ? { month: query.month } : undefined)
  json(res, 200, { items })
}

async function generateInvoices(req, res, body) {
  const missing = requireFields(body, ['month'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const mod = await tryImport('./lib/invoices.mjs')
  if (!mod || typeof mod.generateMonth !== 'function') return moduleUnavailable(res, 'invoices.mjs')
  try {
    const result = await mod.generateMonth(body.month)
    json(res, 200, { month: result.month, count: result.count, items: result.invoices })
  } catch (e) {
    fail(res, 502, `invoices.mjs generateMonth failed: ${e?.message || e}`)
  }
}

async function patchInvoice(req, res, id, body) {
  const updated = await store.update('invoices', id, body)
  if (!updated) return fail(res, 404, 'invoice not found')
  json(res, 200, updated)
}

// settings + ops ------------------------------------------------------------

async function getSettingsRoute(req, res) {
  const settings = await store.getSettings()
  json(res, 200, settings || { pricing: {}, operatorName: '', updatedAt: null })
}

async function patchSettingsRoute(req, res, body) {
  const saved = await store.saveSettings({ ...body, updatedAt: nowIso() })
  json(res, 200, saved)
}

async function opsRoute(req, res, query) {
  const snapshot = await computeOps(query.month)
  json(res, 200, snapshot)
}

// ——— client app: auth + client-scoped API (ios/CONTRACT.md Part 1) ————
//
// requireClient() is the ONE place a client route may learn its clientId —
// from the Bearer token, via clientauth.authenticate(). No handler below
// ever reads clientId from a query string or request body.

function bearerToken(req) {
  const h = req.headers['authorization']
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice('Bearer '.length).trim()
}

async function requireClient(req, res) {
  const token = bearerToken(req)
  const clientId = token ? await clientAuth.authenticate(token) : null
  if (!clientId) {
    fail(res, 401, 'missing or invalid client session')
    return null
  }
  return clientId
}

async function clientAuthRequest(req, res, body) {
  if (!body?.handle) return fail(res, 400, 'handle is required')
  const result = await clientAuth.requestCode(body.handle)
  json(res, 200, result)
}

async function clientAuthVerify(req, res, body) {
  const missing = requireFields(body, ['handle', 'code'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const result = await clientAuth.verifyCode(body.handle, body.code)
  if (!result.ok) return fail(res, result.status || 401, result.error?.message || 'invalid code', { code: result.error?.code })
  json(res, 200, { token: result.token, client: result.client })
}

async function clientAuthLogout(req, res) {
  await clientAuth.revoke(bearerToken(req))
  json(res, 200, { ok: true })
}

async function clientMe(req, res) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  const client = await store.get('clients', clientId)
  if (!client) return fail(res, 404, 'client not found')
  json(res, 200, clientAuth.clientSafe(client))
}

async function clientMonths(req, res) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  json(res, 200, { items: await clientApi.listMonths(clientId) })
}

async function clientMonthPosts(req, res, month) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  json(res, 200, { items: await clientApi.listPosts(clientId, month) })
}

async function clientDecidePost(req, res, postId, body) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  const missing = requireFields(body, ['verdict'])
  if (missing.length) return fail(res, 400, `missing fields: ${missing.join(', ')}`)
  const result = await clientApi.decidePost(clientId, postId, body.verdict, body.note)
  if (!result.ok) return fail(res, result.status, result.error?.message, { code: result.error?.code })
  json(res, 200, result.post)
}

async function clientPerformance(req, res, query) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  const month = query.month || new Date().toISOString().slice(0, 7)
  json(res, 200, await clientApi.performance(clientId, month))
}

async function clientInvoices(req, res) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  json(res, 200, { items: await clientApi.listInvoices(clientId) })
}

async function clientRequestsList(req, res) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  json(res, 200, { items: await clientApi.listRequests(clientId) })
}

async function clientRequestsCreate(req, res, body) {
  const clientId = await requireClient(req, res)
  if (!clientId) return
  const result = await clientApi.createRequest(clientId, body?.text)
  if (!result.ok) return fail(res, result.status, result.error?.message, { code: result.error?.code })
  json(res, 201, result.request)
}

// operator-facing (local UI, no client Bearer): read out pending codes and
// see incoming client requests so a real request is never lost.

async function operatorClientCodes(req, res) {
  json(res, 200, { items: clientAuth.listPendingCodesForOperator() })
}

async function operatorClientRequests(req, res) {
  const [items, clients] = await Promise.all([store.list('clientrequests'), store.list('clients')])
  const clientById = new Map(clients.map((c) => [c.id, c]))
  const out = items
    .slice()
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    .map((r) => ({
      id: r.id, text: r.text, at: r.at, from: r.from, status: r.status,
      clientId: r.clientId,
      clientName: clientById.get(r.clientId)?.name || '(unknown client)',
    }))
  json(res, 200, { items: out })
}

async function operatorPatchClientRequest(req, res, id, body) {
  const updated = await store.update('clientrequests', id, { status: body?.status })
  if (!updated) return fail(res, 404, 'request not found')
  json(res, 200, updated)
}

// ——— router ——————————————————————————————————————————————————

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const route = url.pathname
  const query = Object.fromEntries(url.searchParams)
  const segs = route.split('/').filter(Boolean) // e.g. ['api','clients','abc']

  try {
    // static / approve page
    if (route.startsWith('/a/') && segs.length === 2) return serveApprovePage(res, segs[1])
    if (route.startsWith('/media/')) return serveMedia(req, res, route)
    if (!route.startsWith('/api/')) return serveStatic(req, res, route)

    // health
    if (route === '/api/health' && req.method === 'GET') return handleHealth(res)

    // ops
    if (route === '/api/ops' && req.method === 'GET') return opsRoute(req, res, query)

    // settings
    if (route === '/api/settings' && req.method === 'GET') return getSettingsRoute(req, res)
    if (route === '/api/settings' && req.method === 'PATCH') return patchSettingsRoute(req, res, await readBody(req))

    // clients: /api/clients[/:id]
    if (segs[0] === 'api' && segs[1] === 'clients') {
      if (segs.length === 2) {
        if (req.method === 'GET') return listClients(req, res, query)
        if (req.method === 'POST') return createClient(req, res, await readBody(req))
      } else if (segs.length === 3) {
        if (req.method === 'PATCH') return patchClient(req, res, segs[2], await readBody(req))
        if (req.method === 'DELETE') return archiveClient(req, res, segs[2])
      }
    }

    // products: /api/products[/:id]
    if (segs[0] === 'api' && segs[1] === 'products') {
      if (segs.length === 2) {
        if (req.method === 'GET') return listProducts(req, res, query)
        if (req.method === 'POST') return createProduct(req, res, await readBody(req))
      } else if (segs.length === 3) {
        if (req.method === 'PATCH') return patchProduct(req, res, segs[2], await readBody(req))
        if (req.method === 'DELETE') return deleteProduct(req, res, segs[2])
      }
    }

    // posts: /api/posts[/:id] and /api/posts/:id/regenerate
    if (segs[0] === 'api' && segs[1] === 'posts') {
      if (segs.length === 2) {
        if (req.method === 'GET') return listPosts(req, res, query)
        if (req.method === 'POST') return createPost(req, res, await readBody(req))
      } else if (segs.length === 3) {
        if (req.method === 'PATCH') return patchPost(req, res, segs[2], await readBody(req))
        if (req.method === 'DELETE') return deletePost(req, res, segs[2])
      } else if (segs.length === 4 && segs[3] === 'regenerate' && req.method === 'POST') {
        return regeneratePost(req, res, segs[2], await readBody(req))
      }
    }

    // generate/month + jobs
    if (route === '/api/generate/month' && req.method === 'POST') return generateMonthRoute(req, res, await readBody(req))
    if (segs[0] === 'api' && segs[1] === 'jobs' && segs.length === 3 && req.method === 'GET') return getJob(req, res, segs[2])

    // carousel
    if (route === '/api/carousel/cut' && req.method === 'POST') return carouselCut(req, res, await readBody(req))

    // approvals
    if (route === '/api/approvals' && req.method === 'POST') return createApproval(req, res, await readBody(req))
    if (segs[0] === 'api' && segs[1] === 'approvals' && segs.length === 3 && req.method === 'GET') return getApprovalByToken(req, res, segs[2])
    if (segs[0] === 'api' && segs[1] === 'approvals' && segs.length === 4 && segs[3] === 'decide' && req.method === 'POST')
      return decideApproval(req, res, segs[2], await readBody(req))

    // creatives
    if (route === '/api/creatives/best' && req.method === 'GET') return bestCreative(req, res, query)
    if (segs[0] === 'api' && segs[1] === 'creatives') {
      if (segs.length === 2) {
        if (req.method === 'GET') return listCreatives(req, res, query)
        if (req.method === 'POST') return createCreative(req, res, await readBody(req))
      } else if (segs.length === 3 && req.method === 'PATCH') {
        return patchCreative(req, res, segs[2], await readBody(req))
      }
    }

    // campaigns
    if (segs[0] === 'api' && segs[1] === 'campaigns') {
      if (segs.length === 2) {
        if (req.method === 'GET') return listCampaigns(req, res, query)
        if (req.method === 'POST') return createCampaign(req, res, await readBody(req))
      } else if (segs.length === 3 && req.method === 'PATCH') {
        return patchCampaign(req, res, segs[2], await readBody(req))
      }
    }

    // conversations
    if (route === '/api/conversations/import' && req.method === 'POST') return importConversations(req, res, await readBody(req))
    if (route === '/api/conversations') {
      if (req.method === 'GET') return listConversations(req, res, query)
      if (req.method === 'POST') return createConversation(req, res, await readBody(req))
    }

    // invoices
    if (route === '/api/invoices/generate' && req.method === 'POST') return generateInvoices(req, res, await readBody(req))
    if (route === '/api/invoices' && req.method === 'GET') return listInvoices(req, res, query)
    if (segs[0] === 'api' && segs[1] === 'invoices' && segs.length === 3 && req.method === 'PATCH')
      return patchInvoice(req, res, segs[2], await readBody(req))

    // client auth (one-time code) ---------------------------------------
    if (route === '/api/client/auth/request' && req.method === 'POST') return clientAuthRequest(req, res, await readBody(req))
    if (route === '/api/client/auth/verify' && req.method === 'POST') return clientAuthVerify(req, res, await readBody(req))
    if (route === '/api/client/auth/logout' && req.method === 'POST') return clientAuthLogout(req, res)
    if (route === '/api/client/me' && req.method === 'GET') return clientMe(req, res)

    // client-scoped API (Bearer) -----------------------------------------
    if (route === '/api/client/months' && req.method === 'GET') return clientMonths(req, res)
    if (segs[0] === 'api' && segs[1] === 'client' && segs[2] === 'months' && segs.length === 5 && segs[4] === 'posts' && req.method === 'GET')
      return clientMonthPosts(req, res, segs[3])
    if (segs[0] === 'api' && segs[1] === 'client' && segs[2] === 'posts' && segs.length === 5 && segs[4] === 'decide' && req.method === 'POST')
      return clientDecidePost(req, res, segs[3], await readBody(req))
    if (route === '/api/client/performance' && req.method === 'GET') return clientPerformance(req, res, query)
    if (route === '/api/client/invoices' && req.method === 'GET') return clientInvoices(req, res)
    if (route === '/api/client/requests') {
      if (req.method === 'GET') return clientRequestsList(req, res)
      if (req.method === 'POST') return clientRequestsCreate(req, res, await readBody(req))
    }

    // operator surface for client-app auth codes + client requests -------
    if (route === '/api/operator/client-codes' && req.method === 'GET') return operatorClientCodes(req, res)
    if (route === '/api/operator/client-requests' && req.method === 'GET') return operatorClientRequests(req, res)
    if (segs[0] === 'api' && segs[1] === 'operator' && segs[2] === 'client-requests' && segs.length === 4 && req.method === 'PATCH')
      return operatorPatchClientRequest(req, res, segs[3], await readBody(req))

    return fail(res, 404, `no route ${req.method} ${route}`)
  } catch (e) {
    if (!res.headersSent) fail(res, 500, e?.message || String(e))
    else { try { res.end() } catch {} }
  }
})

server.listen(PORT, () => {
  console.log(`[engine] LOOM ENGINE listening on http://localhost:${PORT}`)
  if (!fssync.existsSync(UI_DIR)) console.log('[engine] engine/ui/ not found yet — serving a plain placeholder page')
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[engine] port ${PORT} is already in use. Pass --port <n> to use another.`)
    process.exit(1)
  }
  throw e
})
