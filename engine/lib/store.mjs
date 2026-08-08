// engine/lib/store.mjs — atomic JSON collection store for engine/data/*.json.
// Each collection file is `{ items: [...] }`. Writes are serialised per
// collection (an in-process queue) and land via write-.tmp-then-rename, so a
// crash or overlapping request can never truncate or interleave a file.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.resolve(HERE, '..', 'data')

const COLLECTIONS = new Set([
  'clients', 'products', 'posts', 'approvals', 'creatives',
  'campaigns', 'conversations', 'invoices', 'settings',
  // client-app additions (ios/CONTRACT.md Part 1) — one-time login codes,
  // bearer tokens, attempt-limiter log, and the client requests thread.
  'clientauthcodes', 'clientauthattempts', 'clienttokens', 'clientrequests',
])

// One write-queue per collection name, so concurrent handlers never race
// on the same file's read-modify-write cycle.
const queues = new Map()

function enqueue(name, fn) {
  const prev = queues.get(name) || Promise.resolve()
  const next = prev.then(fn, fn) // run fn even if the previous op rejected
  queues.set(name, next.catch(() => {})) // keep the chain alive after errors
  return next
}

function fileFor(name) {
  if (!COLLECTIONS.has(name)) throw Object.assign(new Error(`unknown collection: ${name}`), { code: 'BAD_COLLECTION' })
  return path.join(DATA_DIR, `${name}.json`)
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readCollectionRaw(name) {
  const file = fileFor(name)
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] }
    return parsed
  } catch (e) {
    if (e.code === 'ENOENT') return { items: [] }
    // Corrupt file: don't lose the rest of the store, just treat as empty
    // and let the next write repair it.
    return { items: [] }
  }
}

async function writeCollectionRaw(name, data) {
  await ensureDataDir()
  const file = fileFor(name)
  const tmp = path.join(DATA_DIR, `.${name}.${process.pid}.${Date.now()}.tmp`)
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

/** Read a whole collection: `{ items: [...] }`. Creates nothing on disk. */
export async function readCollection(name) {
  return readCollectionRaw(name)
}

/** All items in a collection, optionally filtered by a predicate or a plain field-match object. */
export async function list(name, match) {
  const { items } = await readCollectionRaw(name)
  if (!match) return items
  if (typeof match === 'function') return items.filter(match)
  const keys = Object.keys(match)
  return items.filter((it) => keys.every((k) => match[k] === undefined || it[k] === match[k]))
}

export async function get(name, id) {
  const { items } = await readCollectionRaw(name)
  return items.find((it) => it.id === id) || null
}

/** Insert a new item. Adds `id` (unless present) and returns the stored record. */
export function insert(name, fields) {
  return enqueue(name, async () => {
    const data = await readCollectionRaw(name)
    const record = { id: crypto.randomUUID(), ...fields }
    data.items.push(record)
    await writeCollectionRaw(name, data)
    return record
  })
}

/** Merge `patch` into the item with `id`. Returns the updated record, or null if not found. */
export function update(name, id, patch) {
  return enqueue(name, async () => {
    const data = await readCollectionRaw(name)
    const idx = data.items.findIndex((it) => it.id === id)
    if (idx === -1) return null
    data.items[idx] = { ...data.items[idx], ...patch, id: data.items[idx].id }
    await writeCollectionRaw(name, data)
    return data.items[idx]
  })
}

/** Apply a function(record) -> record to the item with `id`. Lets callers do read-modify-write (e.g. qaSeconds +=) atomically. */
export function mutate(name, id, fn) {
  return enqueue(name, async () => {
    const data = await readCollectionRaw(name)
    const idx = data.items.findIndex((it) => it.id === id)
    if (idx === -1) return null
    const next = fn(data.items[idx])
    data.items[idx] = { ...next, id: data.items[idx].id }
    await writeCollectionRaw(name, data)
    return data.items[idx]
  })
}

/** Hard delete. Returns true if a record was removed. */
export function remove(name, id) {
  return enqueue(name, async () => {
    const data = await readCollectionRaw(name)
    const before = data.items.length
    data.items = data.items.filter((it) => it.id !== id)
    if (data.items.length === before) return false
    await writeCollectionRaw(name, data)
    return true
  })
}

/** Overwrite a whole collection's items array (used for singleton-ish files like settings, or bulk seed). */
export function replaceAll(name, items) {
  return enqueue(name, async () => {
    const data = { items }
    await writeCollectionRaw(name, data)
    return data
  })
}

/** Settings is conceptually a singleton `{ items:[{...}] }` with one row. Helpers for that shape. */
export async function getSettings() {
  const { items } = await readCollectionRaw('settings')
  return items[0] || null
}

export function saveSettings(patch) {
  return enqueue('settings', async () => {
    const data = await readCollectionRaw('settings')
    const existing = data.items[0] || { id: crypto.randomUUID() }
    const merged = { ...existing, ...patch, id: existing.id }
    data.items = [merged]
    await writeCollectionRaw('settings', data)
    return merged
  })
}

export async function counts() {
  const out = {}
  for (const name of COLLECTIONS) {
    const { items } = await readCollectionRaw(name)
    out[name] = items.length
  }
  return out
}

export { COLLECTIONS }
