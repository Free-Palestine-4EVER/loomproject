// ————————————————————————————————————————————————————————
// LOOM FORGE — the browser half of the 2D-photo-to-3D tool.
//
// Two servers, and it matters which does what:
//
//   Google Identity Toolkit  — accounts. Email + password, self-serve. Talked
//     to over its REST API rather than through the Firebase JS SDK, because
//     the SDK is ~130KB gzipped for four endpoints, and this site ships no
//     runtime dependency it does not need (see CLAUDE.md: nothing here fetches
//     from a CDN, and `three` is the only heavy import, lazily). The Web API
//     key below is PUBLIC by design — it identifies the project, it does not
//     authorise anything. What protects the data is firestore.rules plus the
//     forge function's own token verification.
//
//   the `forge` Cloud Function — everything else. The Meshy API key lives
//     there and only there; this file never sees it. The entitlement (one free
//     model per account, then 2 JOD each) is likewise decided there, inside a
//     transaction, on every single generate. Nothing in this file is a check —
//     it is all display. Treat the flags it returns as a hint about which UI to
//     paint, never as permission.
//
// Tokens: an ID token lasts an hour, a refresh token does not expire. Only the
// refresh token is worth persisting, so that is what `localStorage` holds; the
// ID token is minted from it on demand and kept in memory. `idToken()` below
// is the only thing anything else should call.
// ————————————————————————————————————————————————————————

const API_KEY = 'AIzaSyD41DZYBbm716ZOvtuoqaZMSt392CdeRXM'
const IDENTITY = 'https://identitytoolkit.googleapis.com/v1/accounts'
const SECURETOKEN = 'https://securetoken.googleapis.com/v1/token'
export const FORGE_API = 'https://europe-west1-loom-clients.cloudfunctions.net/forge'

const STORE_KEY = 'loom.forge.auth.v1'

/** In-memory only. An ID token in localStorage is an hour-long bearer token
 *  sitting in a place every script on the page can read; the refresh token is
 *  there because it has to be, this does not. */
let session = null // { refreshToken, idToken, expiresAt, uid, email }

function load() {
  if (session) return session
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!saved?.refreshToken) return null
    session = { ...saved, idToken: null, expiresAt: 0 }
    return session
  } catch {
    return null
  }
}

function save(next) {
  session = next
  try {
    if (!next) localStorage.removeItem(STORE_KEY)
    else localStorage.setItem(STORE_KEY, JSON.stringify({ refreshToken: next.refreshToken, uid: next.uid, email: next.email }))
  } catch {
    /* private mode — the session still works for this tab, it just won't survive a reload */
  }
}

/** Identity Toolkit's errors arrive as `EMAIL_EXISTS`, `INVALID_LOGIN_CREDENTIALS`
 *  and friends. None of them are sentences, and several are actively misleading
 *  to a non-technical reader, so every one the flow can actually produce gets a
 *  line of its own here. */
const AUTH_MESSAGES = {
  EMAIL_EXISTS: 'That email already has an account — sign in instead.',
  INVALID_LOGIN_CREDENTIALS: 'Wrong email or password.',
  EMAIL_NOT_FOUND: 'Wrong email or password.',
  INVALID_PASSWORD: 'Wrong email or password.',
  INVALID_EMAIL: 'That email address does not look right.',
  WEAK_PASSWORD: 'Use at least 6 characters.',
  MISSING_PASSWORD: 'Enter a password.',
  USER_DISABLED: 'This account has been disabled. Message us and we will sort it.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many tries. Wait a minute and try again.',
  OPERATION_NOT_ALLOWED: 'Email sign-in is not switched on for this project.',
}

function authError(body) {
  const raw = body?.error?.message || 'UNKNOWN'
  const key = raw.split(' :')[0].trim()
  return new Error(AUTH_MESSAGES[key] || 'Could not sign you in. Try again in a moment.')
}

async function identity(path, payload) {
  const res = await fetch(`${IDENTITY}:${path}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw authError(body)
  return body
}

function adopt(body) {
  const next = {
    refreshToken: body.refreshToken,
    idToken: body.idToken,
    // 60s of slack: a token that expires while the request is in flight is a
    // 401 the user reads as "it logged me out for no reason".
    expiresAt: Date.now() + (Number(body.expiresIn) || 3600) * 1000 - 60_000,
    uid: body.localId || body.user_id || session?.uid || null,
    email: body.email || session?.email || null,
  }
  save(next)
  return next
}

// ---------------------------------------------------------------------------
// accounts
// ---------------------------------------------------------------------------

export const currentEmail = () => load()?.email || null
export const isSignedIn = () => Boolean(load()?.refreshToken)

export async function register(email, password) {
  adopt(await identity('signUp', { email: email.trim().toLowerCase(), password, returnSecureToken: true }))
  return api('/register', { method: 'POST', body: {} })
}

export async function signIn(email, password) {
  adopt(await identity('signInWithPassword', { email: email.trim().toLowerCase(), password, returnSecureToken: true }))
  // /register is idempotent and returns the existing profile, so calling it on
  // every sign-in also repairs an account whose Firestore document never got
  // written — a signUp that succeeded followed by a failed first API call.
  return api('/register', { method: 'POST', body: {} })
}

export async function sendReset(email) {
  await identity('sendOobCode', { requestType: 'PASSWORD_RESET', email: email.trim().toLowerCase() })
}

export function signOut() {
  save(null)
  session = null
}

/** A live ID token, refreshed if the one in memory is stale or missing. */
async function idToken() {
  const s = load()
  if (!s?.refreshToken) return null
  if (s.idToken && Date.now() < s.expiresAt) return s.idToken

  const res = await fetch(`${SECURETOKEN}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.refreshToken)}`,
  })
  if (!res.ok) {
    // The refresh token is dead — the password changed, or the account is
    // gone. Anything but a full sign-out here leaves the UI insisting the
    // visitor is logged in while every call 401s.
    signOut()
    return null
  }
  const body = await res.json()
  return adopt({
    refreshToken: body.refresh_token,
    idToken: body.id_token,
    expiresIn: body.expires_in,
    localId: body.user_id,
    email: s.email,
  }).idToken
}

// ---------------------------------------------------------------------------
// the forge API
// ---------------------------------------------------------------------------

export class ForgeError extends Error {
  constructor(code, message, extra) {
    super(message)
    this.code = code
    Object.assign(this, extra || {})
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = await idToken()
  if (!token) throw new ForgeError('UNAUTHENTICATED', 'Sign in to keep going.')

  const res = await fetch(`${FORGE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    const e = payload?.error || {}
    throw new ForgeError(e.code || 'HTTP_' + res.status, e.message || 'Something went wrong.', e)
  }
  return payload
}

export const me = () => api('/me')
export const startJob = (image, name) => api('/jobs', { method: 'POST', body: { image, name } })
export const jobStatus = (id) => api(`/jobs/${id}`)
export const createOrder = (quantity) => api('/orders', { method: 'POST', body: { quantity } })

// ---------------------------------------------------------------------------
// the photo
// ---------------------------------------------------------------------------

/** Downscale and re-encode a picked file to a JPEG data URL.
 *
 *  This is not an optimisation, it is what makes the feature work on a phone.
 *  A modern handset shoots 12MP HEIC/JPEG at 4-8MB; posting that straight at a
 *  Cloud Function is slow on Jordanian mobile data and lands near the request
 *  limit. Meshy reconstructs from a single view and gains nothing above ~1024px
 *  on the long edge.
 *
 *  `createImageBitmap` handles EXIF orientation itself where supported, which
 *  is the difference between a chair and a chair lying on its side — and a
 *  sideways input produces a sideways model, silently.
 */
export async function fileToDataUrl(file, max = 1024) {
  if (!file) throw new Error('No file.')
  if (!/^image\//.test(file.type)) throw new Error('That is not an image.')

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    bitmap = await createImageBitmap(file)
  }

  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  // Photos of products are usually shot on white; a transparent PNG dropped
  // onto a black canvas loses the subject outright. Paint a ground first.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return canvas.toDataURL('image/jpeg', 0.88)
}
