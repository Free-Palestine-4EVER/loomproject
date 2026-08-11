/**
 * Shared account state — a thin rune wrapper around lib/forge.js.
 *
 * There is exactly ONE account system on this site: Firebase Auth
 * (email/password, via Google Identity Toolkit) plus the `forge` Cloud
 * Function's `forgeusers` doc. `lib/forge.js` already talks to both — this
 * module does not reimplement that, it only lifts it into shared state so
 * things outside Forge (the nav, /dashboard) can read "who is signed in"
 * without each wiring its own copy of the boot/refresh dance.
 *
 * NOTHING ABOUT THE SERVER HALF CHANGES IN THE SVELTE PORT. Same Firebase
 * project (`loom-clients`), same `forge` function in europe-west1, same
 * `forgeusers` / `forgejobs` / `forgeorders` collections, same ID-token
 * scheme, same localStorage key. The Meshy API key stays where it has to stay
 * — in Secret Manager, read only by the function — because it is a spending
 * credential on a shared balance and a browser that could see it could drain
 * it. This file never sees a secret and never should.
 *
 * SSR NOTE: `loading` starts true and stays true through the server render, so
 * the nav's account control renders nothing rather than flashing "Sign in"
 * before an existing session resolves. That was already the React behaviour;
 * under SSR it is also what stops the server (which has no localStorage and no
 * session) from baking a signed-out state into prerendered HTML that a
 * signed-in visitor would then see flicker.
 */

import { browser } from '$app/environment'
import * as Forge from './forge.js'

function toUser(profile) {
  if (!profile) return null
  return { uid: profile.uid, email: profile.email, profile }
}

class Auth {
  /** null when signed out. Otherwise { uid, email, profile }, where `profile`
   *  is exactly the forge function's /me response (freeUsed, credits,
   *  canGenerate, nextIsFree, modelsMade, priceJod, email, uid). Nothing here
   *  computes a credits figure or a job count itself; it is read from the
   *  server or it is not shown. */
  user = $state(null)

  /** true until the first check has resolved. Callers must render a loading
   *  state, not assume signed-out, while this is true. */
  loading = $state(true)

  /** Runs once on the client. On the server it is never called, so `loading`
   *  stays true and no account UI is prerendered. */
  async start() {
    if (!browser) return
    try { await this.refresh() } finally { this.loading = false }
  }

  /** Re-read /me. The dashboard calls this after actions that change the
   *  account's entitlement server-side. */
  async refresh() {
    if (!Forge.isSignedIn()) { this.user = null; return null }
    try {
      const r = await Forge.me()
      this.user = toUser(r.profile)
      return this.user
    } catch {
      // A dead refresh token or a 401 reads as signed-out, not as an error
      // banner — there is nothing left in localStorage to retry with either way.
      Forge.signOut()
      this.user = null
      return null
    }
  }

  /** Throws an Error whose message is meant to be shown to a reader. */
  async register(email, password) {
    const r = await Forge.register(email, password)
    this.user = toUser(r.profile)
    return this.user
  }

  async signIn(email, password) {
    const r = await Forge.signIn(email, password)
    this.user = toUser(r.profile)
    return this.user
  }

  /** Affects every consumer at once, Forge included — it is the same
   *  localStorage key. */
  signOut() {
    Forge.signOut()
    this.user = null
  }

  /** A live Firebase ID token (async), refreshed on demand. */
  token = Forge.token
}

export const auth = new Auth()
