// ————————————————————————————————————————————————————————
// LOOM FORGE — "send a photo, get a 3D model", 2 JOD each, first one free.
//
// TWO SURFACES, ONE FLOW. `<Forge />` renders a small band on the long page
// (#forge, in the SELL run) and owns the popup that does the actual work. The
// band's job is the pitch and the price; every interactive step — account,
// upload, progress, download, payment — happens inside the modal. That split
// is deliberate: the whole feature is one narrow funnel, and a funnel spread
// across a section AND a dialog gives the visitor two places to be half way
// through it.
//
// WHAT IS AND IS NOT AUTHORITATIVE HERE. Nothing in this file decides whether
// a model is free. `profile.nextIsFree` / `canGenerate` come from the server
// and are used ONLY to pick which panel to paint; the forge function re-checks
// the entitlement inside a Firestore transaction on every generate, and a 402
// coming back is the real answer. Editing this file cannot give anyone a free
// model, which is the property that matters.
//
// The modal reuses the site's overlay contract rather than inventing a second
// one — `.overlay-open` on <html> (App.jsx watches it and stops Lenis),
// Escape to close, a Tab focus trap, and the shared bottom sheet on phones.
// See NeedModal.jsx's long note on why two contracts is how a site ends up
// with one of them scrolling the body behind it.
// ————————————————————————————————————————————————————————
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { EASE, Reveal, Magnetic } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import { useBottomSheet, useIsMobile, SheetHandle, useSheetScrollHandoff } from '../lib/sheet.jsx'
import { BRAND, CLIQ } from '../data/site.js'
import {
  register, signIn, signOut, sendReset, isSignedIn,
  me, startJob, jobStatus, createOrder, fileToDataUrl, ForgeError,
} from '../lib/forge.js'

import './forge.css'

const PRICE_JOD = 2

/** Meshy takes roughly 40-90s. Poll often enough that the bar moves, rarely
 *  enough that a tab left open overnight is not a thousand function calls:
 *  every 4s, and give up displaying progress after 6 minutes. */
const POLL_MS = 4000
const POLL_GIVE_UP_MS = 6 * 60 * 1000

const STEPS = [
  { n: '01', t: 'Send one photo', d: 'A product, a chair, a bottle, a shoe. One clear shot, plain background, whole object in frame.' },
  { n: '02', t: 'We rebuild it', d: 'Our pipeline reads the shape and the texture and reconstructs it as real geometry — not a flat card.' },
  { n: '03', t: 'Take the files', d: 'GLB, FBX, OBJ and USDZ. Yours to drop into a site, a game, an AR view or a render.' },
]

// ---------------------------------------------------------------------------
// the section
// ---------------------------------------------------------------------------

export function Forge() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {/* The woven side tab — the OTHER explicit way in, next to the section's
          own CTA. Fixed-position, so it renders here (Forge.jsx never touches
          App.jsx/Sections.jsx) but reads as parked beside the hero at the top
          of the page on both phone and desktop. See forge.css for why its
          vertical slot clears the WhatsApp FAB and .mobile-cta-pill. */}
      <button
        type="button"
        className="fg-side-tab"
        onClick={() => setOpen(true)}
        aria-label="Try 2D to 3D — send a photo, get a 3D model back"
      >
        <span>Try 2D to 3D</span>
      </button>

      <section className="forge" id="forge" aria-labelledby="forge-title">
        <div className="forge-inner">
          <div className="forge-copy">
            <p className="forge-kicker"><span>—</span> New from the 3D Lab</p>
            <Reveal>
              <h2 className="forge-h2" id="forge-title">
                Send a photo. Get a 3D model back.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="forge-lede">
                One picture of the thing — a chair, a bottle, a shoe, a part — and our
                pipeline rebuilds it as real geometry you can spin, light and drop into
                a website, a game or an AR view. About a minute per model.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="forge-price">
                <strong>{PRICE_JOD} JOD</strong> a model — <em>your first one is free.</em>
              </p>
            </Reveal>
            <Reveal delay={0.24} className="forge-cta">
              <Magnetic strength={0.25}>
                <WoolButton label="Make one free" onClick={() => setOpen(true)} />
              </Magnetic>
              <span className="forge-formats">GLB · FBX · OBJ · USDZ</span>
            </Reveal>
          </div>

          <div className="forge-media">
            {/* Same art-direction contract as WorkshopsPromo and the need
                tiles: onError drops a failed decode rather than leaving a
                hole, and the CSS gradient behind the layer is the fallback. */}
            <img
              src="/img/forge/forge-mascots.webp"
              alt="Two LOOM wool mascots — one holding a flat printed photo of an armchair, the other holding the same chair rebuilt as a glowing 3D wireframe"
              width={1400}
              height={781}
              loading="lazy"
              decoding="async"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </div>
      </section>

      <ForgeModal open={open} onClose={close} />
    </>
  )
}

// ---------------------------------------------------------------------------
// the popup
// ---------------------------------------------------------------------------

function ForgeModal({ open, onClose }) {
  const reduced = useReducedMotion()
  const panelRef = useRef(null)
  const bodyRef = useRef(null)
  const isMobile = useIsMobile()
  const sheet = useBottomSheet({ onDismiss: onClose })
  const triggerRef = useRef(null)
  const handoff = useSheetScrollHandoff(sheet.bind, bodyRef)

  const requestClose = useCallback(() => {
    if (isMobile && !sheet.reduced) sheet.animateOut()
    else onClose()
  }, [isMobile, sheet, onClose])

  useEffect(() => {
    if (open && isMobile) sheet.animateIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key !== 'Tab') return
      const f = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!f || !f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.documentElement.classList.add('overlay-open')
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panelRef.current?.querySelector('.fg-close')?.focus(), 60)
    return () => {
      document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      const el = triggerRef.current
      if (el && document.contains(el)) el.focus()
    }
  }, [open, requestClose])

  const panelProps = isMobile
    ? {
        className: 'fg-panel is-sheet',
        style: { y: sheet.y },
        ref: (el) => { panelRef.current = el; sheet.panelRef.current = el },
      }
    : {
        className: 'fg-panel',
        ref: panelRef,
        initial: reduced ? false : { y: 42, opacity: 0, scale: 0.985 },
        animate: { y: 0, opacity: 1, scale: 1 },
        exit: reduced ? { opacity: 0 } : { y: 26, opacity: 0, scale: 0.99 },
        transition: { duration: reduced ? 0.01 : 0.5, ease: EASE },
      }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fg-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.35, ease: EASE }}
          onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}
        >
          <motion.div {...panelProps} role="dialog" aria-modal="true" aria-labelledby="fg-title">
            {isMobile && <SheetHandle bind={sheet.bind} />}

            <button type="button" className="fg-close" onClick={requestClose} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="fg-body" data-lenis-prevent ref={bodyRef} {...(isMobile ? handoff : {})}>
              <ForgeTool onRequestClose={requestClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// the hero + 01/02/03 explainer — shared between the pitch step and the
// authenticated tool view (that layout was fine; only the ENTRY flow around
// it needed rework, per the client's own note that the content is good and
// it is the layout/flow that needed the work).
// ---------------------------------------------------------------------------

function ForgeHero({ titleId }) {
  return (
    <>
      <div className="fg-hero">
        <img
          className="fg-hero-img"
          src="/img/forge/forge-mascots.webp"
          alt="Two LOOM wool mascots — one holding a flat printed photo of an armchair, the other holding the same chair rebuilt as a glowing 3D wireframe"
          width={1400}
          height={781}
          decoding="async"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div className="fg-hero-ink">
          <p className="fg-kicker">2D → 3D</p>
          <h2 className="fg-title" id={titleId}>Turn a photo into a 3D model</h2>
        </div>
      </div>

      <ol className="fg-steps">
        {STEPS.map((s) => (
          <li key={s.n}>
            <span className="fg-step-n">{s.n}</span>
            <h3 className="fg-step-t">{s.t}</h3>
            <p className="fg-step-d">{s.d}</p>
          </li>
        ))}
      </ol>
    </>
  )
}

// ---------------------------------------------------------------------------
// the working half — account, upload, progress, result, payment
// ---------------------------------------------------------------------------

// Two-step ENTRY for a visitor who is not signed in yet: 'pitch' (Start now)
// then 'auth' (register or sign in). Once `profile` exists — either from a
// fresh sign-in/register or from an already-live session found on mount —
// neither step renders again; see the render switch below.
function ForgeTool() {
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(isSignedIn())
  const [entryStep, setEntryStep] = useState('pitch') // 'pitch' | 'auth'
  const [authMode, setAuthMode] = useState('register')
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [order, setOrder] = useState(null)

  // Refresh the profile on mount for an already-signed-in visitor. A stale
  // `credits` here is the difference between showing somebody the upload panel
  // and showing them a payment wall they already cleared.
  useEffect(() => {
    if (!isSignedIn()) return
    let alive = true
    me()
      .then((r) => { if (alive) setProfile(r.profile) })
      .catch(() => { if (alive) signOut() })
      .finally(() => { if (alive) setBooting(false) })
    return () => { alive = false }
  }, [])

  // Poll a running job. Cleared on unmount, on completion and on give-up, so
  // closing the popup mid-generation does not leave an interval running for
  // the rest of the session.
  useEffect(() => {
    if (!job || job.status === 'SUCCEEDED' || job.status === 'FAILED') return
    const startedAt = Date.now()
    const id = setInterval(async () => {
      if (Date.now() - startedAt > POLL_GIVE_UP_MS) { clearInterval(id); return }
      try {
        const r = await jobStatus(job.id)
        setJob(r.job)
        if (r.job.status === 'FAILED') {
          setError(r.job.error || 'That one failed. Nothing was used — try another photo.')
          // A failed job is refunded server-side; re-read so the panel shows it.
          me().then((p) => setProfile(p.profile)).catch(() => {})
        }
      } catch (err) {
        // A transient poll failure is not worth tearing the panel down over —
        // the next tick will very likely succeed.
        if (err instanceof ForgeError && err.code === 'UNAUTHENTICATED') {
          clearInterval(id)
          setError('Your session expired — sign in again.')
          setProfile(null)
        }
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [job])

  // A brand-new registration is the client's requested handoff: "start now,
  // then register, then redirect to the user dashboard" — so a fresh account
  // leaves the popup entirely rather than landing on the upload panel here.
  //
  // A SIGN-IN does not redirect. Two reasons: an account that already exists
  // is exactly the "returning signed-in user" case the brief says must not be
  // shoved through onboarding again, and the CliQ pay panel + upload/poll/
  // download flow living in THIS popup is still the only shipped, QA'd way to
  // reach them (`qa-forge-pay.mjs` signs in through this exact form and
  // expects the paywall to render right here). Sending every successful sign-
  // in offsite would strand that flow with nothing to replace it.
  //
  // INTEGRATION POINT — `src/lib/auth.jsx` (`AuthProvider`/`useAuth`) and the
  // real `/dashboard` page both exist now, built by a second agent working the
  // same brief. This file was deliberately NOT switched over to `useAuth()`:
  // `lib/auth.jsx`'s own header says it "reads and writes the exact same
  // localStorage-backed session" as the direct `lib/forge.js` calls below, so
  // `register()` here already leaves the account signed in exactly the way
  // `/dashboard` expects to find it on the very next navigation — no
  // behaviour changes by switching later, and switching now would mean
  // re-plumbing the job-poll effect, the paywall panel and the dropzone's
  // profile shape onto a context this file did not need to touch to ship.
  // Do it when Forge.jsx's own account state next needs real work.
  const onAuthed = useCallback((r, mode) => {
    setError(null)
    if (mode === 'register') {
      window.location.href = '/dashboard'
      return
    }
    setProfile(r.profile)
  }, [])

  const onPick = useCallback(async (file) => {
    setError(null)
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setPreview(dataUrl)
      const r = await startJob(dataUrl, file.name?.slice(0, 60) || null)
      setJob(r.job)
      setProfile(r.profile)
    } catch (err) {
      if (err instanceof ForgeError && err.code === 'PAYMENT_REQUIRED') {
        // Not an error state — it is the paywall, and it has its own panel.
        setProfile((p) => (p ? { ...p, canGenerate: false, nextIsFree: false } : p))
      } else {
        setError(err.message || 'That did not work.')
      }
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }, [])

  const again = useCallback(() => { setJob(null); setPreview(null); setError(null) }, [])

  if (booting) {
    return (
      <>
        <ForgeHero titleId="fg-title" />
        <div className="fg-tool"><p className="fg-note">Checking your account…</p></div>
      </>
    )
  }

  // --- signed out: two-step entry ----------------------------------------
  // Step 1 — the pitch, one unmistakable primary action ("Start now").
  if (!profile && entryStep === 'pitch') {
    return (
      <>
        <ForgeHero titleId="fg-title" />
        <div className="fg-tool">
          <PitchStep
            onStart={() => { setAuthMode('register'); setEntryStep('auth') }}
            onSignIn={() => { setAuthMode('signin'); setEntryStep('auth') }}
          />
        </div>
      </>
    )
  }

  // Step 2 — register or sign in. Deliberately no hero/steps repeated here:
  // that content already did its job on step 1, and a second copy of it is
  // exactly the "everything at once" the client asked to move away from.
  if (!profile) {
    return (
      <>
        <div className="fg-compact-head">
          <button type="button" className="fg-back" onClick={() => setEntryStep('pitch')}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            Back
          </button>
          <p className="fg-stepnav" aria-hidden="true"><i /><i className="is-on" /></p>
        </div>
        <div className="fg-tool">
          <h2 className="fg-auth-title" id="fg-title">
            {authMode === 'register' ? 'Make your account' : 'Welcome back'}
          </h2>
          <AuthPanel mode={authMode} onModeChange={setAuthMode} onAuthed={onAuthed} />
        </div>
      </>
    )
  }

  // --- signed in: unchanged from the shipped tool ------------------------
  return (
    <>
      <ForgeHero titleId="fg-title" />
      {job ? (
        <div className="fg-tool">
          <JobPanel job={job} preview={preview} error={error} onAgain={again} profile={profile} />
        </div>
      ) : !profile.canGenerate ? (
        <div className="fg-tool">
          <PayPanel profile={profile} order={order} setOrder={setOrder} setError={setError} error={error} />
          <AccountLine profile={profile} onSignOut={() => { signOut(); setProfile(null) }} />
        </div>
      ) : (
        <div className="fg-tool">
          <Dropzone onPick={onPick} busy={busy} nextIsFree={profile.nextIsFree} credits={profile.credits} />
          {error && <p className="fg-error" role="alert">{error}</p>}
          <AccountLine profile={profile} onSignOut={() => { signOut(); setProfile(null) }} />
        </div>
      )}
    </>
  )
}

function AccountLine({ profile, onSignOut }) {
  return (
    <p className="fg-account">
      Signed in as <strong>{profile.email}</strong>
      {' · '}
      <button type="button" className="fg-link" onClick={onSignOut}>Sign out</button>
    </p>
  )
}

// ---------------------------------------------------------------------------

// Step 1 of 2 — the pitch. Everything a visitor needs to decide "yes" (the
// hero + 01/02/03 render above this, in `ForgeHero`) plus ONE unmistakable
// primary action. `onSignIn` is a small, deliberately secondary escape hatch
// for someone who already has an account — it lands on step 2 with the Sign
// in tab pre-selected rather than making them notice a tab switch after the
// fact.
function PitchStep({ onStart, onSignIn }) {
  return (
    <div className="fg-pitch">
      <p className="fg-pitch-price">
        Make an account, your first model is free. After that it's <strong>{PRICE_JOD} JOD</strong> each.
      </p>
      <WoolButton label="Start now" onClick={onStart} />
      <p className="fg-pitch-signin">
        Already have an account? <button type="button" className="fg-link" onClick={onSignIn}>Sign in</button>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AuthPanel({ mode, onModeChange, onAuthed }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = mode === 'register' ? await register(email, password) : await signIn(email, password)
      onAuthed(r, mode)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setError(null)
    if (!email.trim()) { setError('Type your email first, then tap this.'); return }
    try {
      await sendReset(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const setMode = (next) => { onModeChange(next); setError(null) }

  return (
    <form className="fg-auth" onSubmit={submit}>
      <p className="fg-auth-lede">
        {mode === 'register'
          ? <>One more step — email and a password, and your first model is on us.</>
          : <>Welcome back — sign in to pick up where you left off.</>}
      </p>

      <div className="fg-tabs" role="tablist" aria-label="Account">
        <button
          type="button" role="tab" aria-selected={mode === 'register'}
          className={mode === 'register' ? 'is-on' : ''}
          onClick={() => setMode('register')}
        >Create account</button>
        <button
          type="button" role="tab" aria-selected={mode === 'signin'}
          className={mode === 'signin' ? 'is-on' : ''}
          onClick={() => setMode('signin')}
        >Sign in</button>
      </div>

      <label className="fg-field">
        <span>Email</span>
        <input
          type="email" required autoComplete="email" value={email} placeholder="you@company.com"
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="fg-field">
        <span>Password</span>
        <input
          type="password" required minLength={6} value={password} placeholder="At least 6 characters"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && <p className="fg-error" role="alert">{error}</p>}
      {sent && <p className="fg-note">Reset link sent — check your inbox.</p>}

      <div className="fg-auth-actions">
        <WoolButton
          label={mode === 'register' ? 'Sign up' : 'Log in'}
          type="submit"
          onClick={undefined}
          disabled={busy}
          className={busy ? 'is-busy' : ''}
        />
        {mode === 'signin' && (
          <button type="button" className="fg-link" onClick={reset}>Forgot password?</button>
        )}
      </div>

      <p className="fg-fine">
        We only store your email and how many models you have made. Nothing is shared,
        and the photo you send is used to build your model and nothing else.
      </p>
    </form>
  )
}

// ---------------------------------------------------------------------------

function Dropzone({ onPick, busy, nextIsFree, credits }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  return (
    <div
      className={`fg-drop ${over ? 'is-over' : ''} ${busy ? 'is-busy' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!busy) onPick(e.dataTransfer?.files?.[0])
      }}
    >
      <p className="fg-drop-badge">
        {nextIsFree ? 'Your first model is free' : `${credits} paid model${credits === 1 ? '' : 's'} left`}
      </p>
      <p className="fg-drop-lead">{busy ? 'Sending your photo…' : 'Drop a photo here'}</p>
      <p className="fg-drop-sub">or</p>
      <button
        type="button"
        className="fg-pick"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        Choose a photo
      </button>
      {/* `capture` is deliberately NOT set: on a phone the file picker still
          offers the camera, and forcing it would take away the photo library,
          which is where the product shot the visitor actually wants already
          lives. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }}
      />
      <p className="fg-fine">One object, filling the frame, plain background. JPEG, PNG or WebP.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function JobPanel({ job, preview, error, onAgain, profile }) {
  const done = job.status === 'SUCCEEDED'
  const failed = job.status === 'FAILED'
  const pct = Math.max(3, Math.min(100, Number(job.progress) || 0))

  return (
    <div className="fg-job">
      <div className="fg-job-art">
        {done && job.thumbnailUrl
          ? <img src={job.thumbnailUrl} alt="Your finished 3D model" loading="lazy" decoding="async" />
          : preview
            ? <img src={preview} alt="The photo you sent" className={failed ? '' : 'is-working'} />
            : null}
      </div>

      {!done && !failed && (
        <>
          <p className="fg-job-status">Rebuilding your model — this takes about a minute.</p>
          <div className="fg-bar"><i style={{ width: `${pct}%` }} /></div>
          <p className="fg-fine">You can close this and come back; it keeps running.</p>
        </>
      )}

      {failed && (
        <>
          <p className="fg-error" role="alert">{error || 'That one failed.'}</p>
          <p className="fg-fine">Nothing was used — your model is still yours to spend.</p>
          <button type="button" className="fg-pick" onClick={onAgain}>Try another photo</button>
        </>
      )}

      {done && (
        <>
          <p className="fg-job-status">Done. Here are your files.</p>
          <div className="fg-files">
            {['glb', 'usdz', 'fbx', 'obj'].map((k) => (
              job.modelUrls?.[k]
                ? <a key={k} className="fg-file" href={job.modelUrls[k]} download target="_blank" rel="noreferrer">{k.toUpperCase()}</a>
                : null
            ))}
          </div>
          <p className="fg-fine">
            GLB drops straight into a website, USDZ opens in AR on an iPhone.
          </p>
          {profile.canGenerate
            ? <button type="button" className="fg-pick" onClick={onAgain}>Make another</button>
            : <p className="fg-note">That was your free one. Another is {PRICE_JOD} JOD — reopen this panel to top up.</p>}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

// PAYMENT IS CLIQ, BY HAND. No processor is wired and none is planned for this
// price point: a 2 JOD top-up does not survive a card fee, and every Jordanian
// buyer already has CliQ in their banking app. So the panel's whole job is to
// produce an unambiguous instruction — how much, to whom, quoting what — and
// get the visitor into WhatsApp with all three already typed out. An operator
// confirms the transfer landed and runs /admin/grant.
//
// The reference is the load-bearing part. Two customers topping up 5 models on
// the same evening are two identical 10 JOD transfers, and the CliQ receipt
// carries the payer's name, not their FORGE account. `FRG-XXXXXX` is minted
// server-side against the uid, so crediting the right account is a lookup and
// never a guess.
function PayPanel({ profile, order, setOrder, setError, error }) {
  const [quantity, setQuantity] = useState(5)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)

  const hasAlias = Boolean(CLIQ.alias)

  const make = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await createOrder(quantity)
      setOrder(r.order)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (value, which) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The value is on screen either way — this button is a convenience, and
      // a failed copy must not look like a failed payment step.
    }
  }

  const wa = order
    ? `${BRAND.whatsapp}?text=${encodeURIComponent(
        [
          `Hi LOOM — I'd like to top up my 3D models.`,
          `Reference: ${order.ref}`,
          `Models: ${order.quantity}`,
          `Total: ${order.amountJod} JOD`,
          `Account: ${profile.email}`,
          hasAlias ? `\nI'm sending it on CliQ now.` : `\nPlease send me the CliQ details.`,
        ].join('\n')
      )}`
    : null

  return (
    <div className="fg-pay">
      <p className="fg-pay-lead">You have used your free model.</p>
      <p className="fg-fine">
        Each further model is {PRICE_JOD} JOD, paid by <strong>CliQ</strong>. Pick how
        many you want and we will confirm on WhatsApp — your models land on this
        account as soon as the transfer shows up.
      </p>

      {!order ? (
        <>
          <div className="fg-qty">
            {[1, 5, 10, 25].map((n) => (
              <button
                key={n} type="button"
                className={quantity === n ? 'is-on' : ''}
                onClick={() => setQuantity(n)}
              >
                {n} <span>{n * PRICE_JOD} JOD</span>
              </button>
            ))}
          </div>
          {error && <p className="fg-error" role="alert">{error}</p>}
          <button type="button" className="fg-pick" onClick={make} disabled={busy}>
            {busy ? 'One moment…' : `Continue — ${quantity * PRICE_JOD} JOD`}
          </button>
        </>
      ) : (
        <div className="fg-order">
          <p className="fg-order-total">
            {order.quantity} model{order.quantity === 1 ? '' : 's'} · <strong>{order.amountJod} JOD</strong>
          </p>

          <dl className="fg-paylines">
            {hasAlias && (
              <div className="fg-payline">
                <dt>CliQ alias</dt>
                <dd>
                  <span>{CLIQ.alias}</span>
                  <button type="button" className="fg-copy" onClick={() => copy(CLIQ.alias, 'alias')}>
                    {copied === 'alias' ? 'Copied' : 'Copy'}
                  </button>
                </dd>
              </div>
            )}
            {hasAlias && CLIQ.name && (
              <div className="fg-payline">
                <dt>Account name</dt>
                <dd><span>{CLIQ.name}</span></dd>
              </div>
            )}
            <div className="fg-payline">
              <dt>Reference</dt>
              <dd>
                <span className="fg-ref">{order.ref}</span>
                <button type="button" className="fg-copy" onClick={() => copy(order.ref, 'ref')}>
                  {copied === 'ref' ? 'Copied' : 'Copy'}
                </button>
              </dd>
            </div>
          </dl>

          <p className="fg-fine">
            {hasAlias
              ? <>Send {order.amountJod} JOD by CliQ to the alias above, put <strong>{order.ref}</strong> in the transfer note, then send us the receipt on WhatsApp.</>
              : <>Message us on WhatsApp and we will send you the CliQ alias. Quote <strong>{order.ref}</strong> so we credit the right account.</>}
          </p>

          <a className="fg-pick" href={wa} target="_blank" rel="noreferrer">
            {hasAlias ? 'Send the receipt on WhatsApp' : 'Get the CliQ details on WhatsApp'}
          </a>
        </div>
      )}
    </div>
  )
}
