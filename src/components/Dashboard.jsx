// /dashboard — a signed-in FORGE account's own page: entitlement state and
// past jobs, read straight from the same `forge` Cloud Function Forge.jsx
// already trusts (`lib/auth.jsx` wraps the exact same `lib/forge.js` calls).
// Nothing on this page is invented: the three stats come verbatim off
// `user.profile` (the /me response) and the job list is a live GET /jobs —
// no placeholder row, no guessed count. Signed out, this renders a sign-in
// prompt rather than an empty shell; App.jsx never mounts this route without
// checking `route === '/dashboard'` either, so there is no blank flash before
// AuthProvider's first /me check resolves — `loading` covers that gap.
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { jobs as fetchJobs, ForgeError } from '../lib/forge.js'
import { WoolButton } from './Wool.jsx'
import './dashboard.css'

const PRICE_JOD = 2 // same figure Forge.jsx's own copy quotes — marketing copy, not an entitlement value

function Avatar({ email }) {
  const initial = (email || '?').trim().charAt(0).toUpperCase() || '?'
  return <div className="dash-avatar" aria-hidden="true">{initial}</div>
}

const JOB_LABEL = { PENDING: 'Queued', IN_PROGRESS: 'Rebuilding', SUCCEEDED: 'Done', FAILED: 'Failed' }

function JobRow({ job }) {
  const done = job.status === 'SUCCEEDED'
  const failed = job.status === 'FAILED'
  const when = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <li className={`dash-job ${done ? 'is-done' : failed ? 'is-failed' : 'is-running'}`}>
      <div className="dash-job-thumb">
        {job.thumbnailUrl
          ? <img src={job.thumbnailUrl} alt="" loading="lazy" decoding="async" />
          : <span className="dash-job-ph" aria-hidden="true" />}
      </div>
      <div className="dash-job-meta">
        <p className="dash-job-name">{job.name || 'Untitled model'}</p>
        <p className="dash-job-sub">
          {when && <span>{when}</span>}
          <span className={`dash-job-status dash-job-status--${job.status?.toLowerCase() || 'pending'}`}>
            {JOB_LABEL[job.status] || job.status}
          </span>
        </p>
      </div>
      {done && job.modelUrls && (
        <div className="dash-job-files">
          {['glb', 'usdz', 'fbx', 'obj'].map((k) =>
            job.modelUrls[k]
              ? <a key={k} href={job.modelUrls[k]} download target="_blank" rel="noreferrer">{k.toUpperCase()}</a>
              : null,
          )}
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// signed out — a real sign-in form, not a redirect that loses the visitor's
// reason for being here. Same two calls Forge.jsx's AuthPanel makes, through
// the shared context rather than lib/forge.js directly.
// ---------------------------------------------------------------------------

function SignInPrompt() {
  const { register, signIn } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') await register(email, password)
      else await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Could not sign you in. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash-page">
      <div className="dash-wrap dash-wrap--auth">
        <a className="dash-back" href="/">← Return to the site</a>
        <div className="dash-auth-card">
          <p className="dash-kicker"><span>—</span> Your account</p>
          <h1 className="dash-h1">Sign in to see your models</h1>
          <p className="dash-lede">
            One account for FORGE, the 2D→3D tool — your first model is free, then it's{' '}
            {PRICE_JOD} JOD each. Sign in to see what you've made and what's left.
          </p>

          <div className="dash-tabs" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={mode === 'signin'}
              className={mode === 'signin' ? 'is-on' : ''}
              onClick={() => { setMode('signin'); setError(null) }}
            >Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'}
              className={mode === 'register' ? 'is-on' : ''}
              onClick={() => { setMode('register'); setError(null) }}
            >Create account</button>
          </div>

          <form onSubmit={submit}>
            <label className="dash-field">
              <span>Email</span>
              <input
                type="email" required autoComplete="email" value={email} placeholder="you@company.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="dash-field">
              <span>Password</span>
              <input
                type="password" required minLength={6} value={password} placeholder="At least 6 characters"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="dash-error" role="alert">{error}</p>}

            <WoolButton
              label={mode === 'register' ? 'Sign up' : 'Log in'}
              type="submit"
              disabled={busy}
              className={busy ? 'is-busy' : ''}
            />
          </form>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// signed in
// ---------------------------------------------------------------------------

function SignedInDashboard({ user, signOut }) {
  const [jobList, setJobList] = useState(null)
  const [jobsError, setJobsError] = useState(null)

  useEffect(() => {
    let alive = true
    fetchJobs()
      .then((r) => { if (alive) setJobList(r.jobs || []) })
      .catch((err) => {
        if (!alive) return
        setJobsError(err instanceof ForgeError ? err.message : 'Could not load your models.')
      })
    return () => { alive = false }
  }, [])

  const p = user.profile

  return (
    <div className="dash-page">
      <div className="dash-wrap">
        <a className="dash-back" href="/">← Return to the site</a>

        <header className="dash-head">
          <Avatar email={user.email} />
          <div className="dash-head-copy">
            <p className="dash-kicker"><span>—</span> Your account</p>
            <h1 className="dash-h1">{user.email}</h1>
          </div>
          <button type="button" className="dash-signout" onClick={signOut}>Sign out</button>
        </header>

        <section className="dash-stats" aria-label="Account status">
          <div className="dash-stat">
            <span className="dash-stat-n">{p.freeUsed ? 'Used' : 'Ready'}</span>
            <span className="dash-stat-l">Free model</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-n">{p.credits}</span>
            <span className="dash-stat-l">Paid model{p.credits === 1 ? '' : 's'} left</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-n">{p.modelsMade}</span>
            <span className="dash-stat-l">Model{p.modelsMade === 1 ? '' : 's'} made</span>
          </div>
        </section>

        {!p.canGenerate && (
          <p className="dash-note dash-note--warn">
            You're out of free and paid models. Top up from the FORGE panel on the home page —{' '}
            {p.priceJod || PRICE_JOD} JOD gets you another.
          </p>
        )}

        <section className="dash-jobs">
          <h2 className="dash-h2">Your models</h2>

          {jobsError && <p className="dash-error" role="alert">{jobsError}</p>}

          {jobList === null && !jobsError && <p className="dash-note">Loading your models…</p>}

          {jobList && jobList.length === 0 && (
            <p className="dash-empty">
              You haven't made a model yet. <a href="/">Make one on the home page</a>.
            </p>
          )}

          {jobList && jobList.length > 0 && (
            <ul className="dash-job-list">
              {jobList.map((j) => <JobRow key={j.id} job={j} />)}
            </ul>
          )}
        </section>

        <a className="dash-back dash-back--bottom" href="/">← Return to the site</a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function Dashboard() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-wrap dash-wrap--loading">
          <p className="dash-note">Checking your account…</p>
        </div>
      </div>
    )
  }

  if (!user) return <SignInPrompt />

  return <SignedInDashboard user={user} signOut={signOut} />
}
