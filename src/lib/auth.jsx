// ————————————————————————————————————————————————————————
// Shared account context — a thin React wrapper around lib/forge.js.
//
// There is exactly ONE account system on this site: Firebase Auth
// (email/password, via Google Identity Toolkit) plus the `forge` Cloud
// Function's `forgeusers` doc. `lib/forge.js` already talks to both — this
// module does not reimplement that, it only lifts it into a context so
// things outside Forge.jsx (the nav, /dashboard) can read "who is signed in"
// without each wiring its own copy of the boot/refresh dance Forge.jsx's
// `ForgeTool` already does locally. Forge.jsx itself is untouched: it keeps
// calling lib/forge.js directly today, and can be pointed at this context
// later without either side changing behaviour, because both read and write
// the exact same localStorage-backed session.
//
// API surface (kept deliberately small):
//
//   const { user, loading, register, signIn, signOut, token, refresh } = useAuth()
//
//   user     — null when signed out. Otherwise { uid, email, profile }, where
//              `profile` is exactly the forge function's /me response
//              (freeUsed, credits, canGenerate, nextIsFree, modelsMade,
//              priceJod, email, uid) — the SAME shape Forge.jsx's `profile`
//              state already renders from. Nothing here computes a credits
//              figure or a job count itself; it is read from the server or
//              it is not shown.
//   loading  — true until the first check (an existing session's /me call,
//              or the absence of one) has resolted. Callers should render a
//              loading state, not assume signed-out, while this is true.
//   register(email, password) / signIn(email, password) — identical calls to
//              the ones Forge.jsx's AuthPanel already makes; they throw an
//              Error with a message meant to be shown to a reader.
//   signOut() — clears the session. Affects every consumer at once, Forge.jsx
//              included, since it is the same localStorage key.
//   token()   — a live Firebase ID token (async), refreshed on demand. For
//              any future caller that wants to hit the forge API directly
//              instead of going through `api()` in lib/forge.js.
//   refresh() — re-reads /me. The dashboard calls this after actions that
//              change the account's entitlement server-side.
// ————————————————————————————————————————————————————————
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as Forge from './forge.js'

const AuthContext = createContext(null)

function toUser(profile) {
  if (!profile) return null
  return { uid: profile.uid, email: profile.email, profile }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Re-checkable on demand (also runs once on mount, below) — a stale
  // `credits` here is the same failure mode Forge.jsx's own boot effect
  // guards against: showing an account state the server no longer agrees with.
  const refresh = useCallback(async () => {
    if (!Forge.isSignedIn()) {
      setUser(null)
      return null
    }
    try {
      const r = await Forge.me()
      const u = toUser(r.profile)
      setUser(u)
      return u
    } catch {
      // A dead refresh token or a 401 reads as signed-out, not as an error
      // banner — nothing left in localStorage to retry with either way.
      Forge.signOut()
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let alive = true
    refresh().finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [refresh])

  const register = useCallback(async (email, password) => {
    const r = await Forge.register(email, password)
    const u = toUser(r.profile)
    setUser(u)
    return u
  }, [])

  const signIn = useCallback(async (email, password) => {
    const r = await Forge.signIn(email, password)
    const u = toUser(r.profile)
    setUser(u)
    return u
  }, [])

  const signOut = useCallback(() => {
    Forge.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, register, signIn, signOut, token: Forge.token, refresh }),
    [user, loading, register, signIn, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be called inside <AuthProvider>.')
  return ctx
}
