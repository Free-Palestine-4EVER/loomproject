import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { Loader, Nav, Cursor, ScrollProgress, Footer } from './components/Chrome.jsx'
import { Hero, Manifesto, Studios, Contact } from './components/Sections.jsx'
import { Proof } from './components/Proof.jsx'
import { Work } from './components/Work.jsx'
import { AppsShowcase } from './components/Products.jsx'
import { LoomMcp } from './components/LoomMcp.jsx'
import { AnswerEngine } from './components/AnswerEngine.jsx'
import { Solutions } from './components/Solutions.jsx'
import { TheMachine } from './components/TheMachine.jsx'
import { Hiring } from './components/Hiring.jsx'
import { Counter, OfferPair, Bolt } from './components/Banners.jsx'
import { MobileChrome } from './components/MobileChrome.jsx'
import { Flyer } from './components/Flyer.jsx'
import { WhatsAppFab } from './components/WhatsAppFab.jsx'
import { StartProject } from './components/StartProject.jsx'
import { WizardProvider } from './lib/wizard.jsx'
import { WizardModal } from './components/WizardModal.jsx'
import { mountInteractions } from './lib/interactions.js'
import { mountFx } from './lib/fx.js'
import { mountViewportBudget } from './lib/viewportBudget.js'
import { Typeface } from './components/Typeface.jsx'
import { TypeShowcase } from './components/TypeShowcase.jsx'
import { Workshops } from './components/Workshops.jsx'
import { WorkshopsPromo } from './components/WorkshopsPromo.jsx'
import { Pricing } from './components/Pricing.jsx'
import { Faq } from './components/Faq.jsx'
import { Forge } from './components/Forge.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { Dashboard } from './components/Dashboard.jsx'

// firebase.json rewrites ** -> /index.html, so every path already boots this
// SPA. A real URL therefore costs one pathname check, not a router dependency
// or a second Vite entry: /type renders the typeface specimen, /ai-workshops
// renders the workshops booking page, everything else renders the long page.
// Trailing slash tolerated (cleanUrls is on). PAGES is also the allow-list
// for the in-page link interceptor below.
// '/dashboard' added 11 Aug 2026 with the shared account context (lib/auth.jsx)
// — the signed-in FORGE account's own page: entitlement state + past jobs,
// reached from the nav's account control rather than from a fourteenth tab.
const PAGES = ['/type', '/ai-workshops', '/dashboard']

// index.html carries exactly one <title>, and firebase.json serves that same
// file for every path — so before this table, /type and /ai-workshops both
// announced themselves as the home page: wrong tab, wrong bookmark, wrong
// history entry, wrong first thing a screen reader reads, and a WCAG 2.4.2
// (level A) failure on every sub-page. One entry per route in PAGES, plus '/'
// which must stay byte-identical to index.html's <title> so returning home
// restores it exactly. No helmet, no dependency — the title of an SPA is one
// assignment in an effect keyed on the route.
const TITLES = {
  '/': 'LOOM — AI-Native Creative Agency · Amman × Sarajevo',
  '/type': 'LOOM Bloom — a free display typeface by LOOM',
  '/ai-workshops': 'AI Workshops for Teams — LOOM',
  '/dashboard': 'Your Account — LOOM',
}

const currentRoute = () => {
  if (typeof window === 'undefined') return '/'
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return PAGES.includes(path) ? path : '/'
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const lenisRef = useRef(null)
  // Read once at mount, then keep in sync with back/forward — the in-page links
  // below use pushState, so popstate is the only way back without a reload.
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => {
    const onPop = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Runs on first paint too, not just on a hop, because a sub-page reached by
  // typing the URL or following an external link never changes `route` at all
  // — it simply mounts at it.
  useEffect(() => { document.title = TITLES[route] || TITLES['/'] }, [route])
  // Read live, not just at mount — a user who flips reduced-motion mid-session
  // (OS setting or Chrome's Battery Saver) must lose Lenis/FX immediately, not
  // just on next reload. Mirrors useIsMobile in lib/sheet.jsx.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Lenis smooth scroll — disabled for reduced-motion users
  useEffect(() => {
    if (reducedMotion) return
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.02 })
    lenisRef.current = lenis
    window.__lenis = lenis // programmatic scroll hook (QA + integrations)
    let raf
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
      delete window.__lenis
    }
  }, [reducedMotion])

  // Pause smooth scroll while the menu or any overlay locks the page
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const locked = document.documentElement.classList.contains('overlay-open')
        || document.documentElement.classList.contains('menu-open')
      const lenis = lenisRef.current
      if (!lenis) return
      locked ? lenis.stop() : lenis.start()
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1100)
    return () => clearTimeout(t)
  }, [])

  // pointer spotlight, card tilt, thread trail, active-section nav — both
  // mount fns re-read the media query internally, so re-invoking on toggle
  // picks up the new state instead of leaving stale listeners mounted
  useEffect(() => mountInteractions(), [reducedMotion])

  // FX pack — velocity marquee, nav scramble, stat glitch, confetti threads, edge glow, hero shimmer
  useEffect(() => mountFx(), [reducedMotion])

  // What the page may spend off-screen: parks the showcase's 23 looping
  // animations, and on touch devices evicts far-off image bitmaps so a fast
  // flick cannot walk the tab into iOS Safari's memory ceiling.
  useEffect(() => mountViewportBudget(), [])

  // The sticky header's height is not a constant: it shrinks once the page is
  // scrolled, and the mobile bar is a different size again. A hardcoded -70
  // left five of the eight nav targets landing with their kicker and the top of
  // their h2 tucked behind a 96px header. Measure it at click time instead, and
  // keep a small breath below it. `styles.css:221` mirrors this for the
  // CSS-only path (`section[id] { scroll-margin-top: 114px }`, used by the
  // reduced-motion fallback and by a hash typed straight into the address bar).
  //
  // LENIS ALREADY READS `scroll-margin-top` — DO NOT ADD IT TWICE.
  // Since lenis 1.3 `scrollTo(element)` subtracts the target's own computed
  // `scroll-margin-top` before it scrolls, and styles.css:221 gives every
  // `section[id]` 114px (92px under 900px) for exactly the CSS-only path
  // above. Handing it the measured header gap on top of that applied the inset
  // twice: every <section> anchor parked ~114px too low, so the kicker landed
  // in the middle of the viewport under a header-sized hole. Measured on the
  // real page: eight of the nine nav anchors landed at rect.top 228 with an
  // 86px header; the ninth, `#solutions`, is a DIV (merged mode) with no
  // scroll-margin and was the only one landing correctly at 114. Add the
  // element's own scroll-margin back so both paths agree at one gap.
  const anchorOffset = (el) => {
    const h = document.querySelector('header')?.getBoundingClientRect().height || 70
    const sm = el?.nodeType === 1 ? parseFloat(getComputedStyle(el).scrollMarginTop) || 0 : 0
    return -(Math.round(h) + 18) + sm
  }

  const navigate = useCallback((href) => {
    // A hash link clicked from a sub-page has no target in the DOM — the long
    // page is not mounted. Return to / first, then scroll on the commit after
    // the sections exist.
    if (href.startsWith('#') && currentRoute() !== '/') {
      window.history.pushState({}, '', '/')
      setRoute('/')
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const t = href === '#top' ? document.body : document.querySelector(href)
        if (!t) return
        if (lenisRef.current) lenisRef.current.scrollTo(href === '#top' ? 0 : t, { offset: href === '#top' ? 0 : anchorOffset(t), duration: 1.2 })
        else t.scrollIntoView({ behavior: 'smooth' })
      }))
      return
    }
    const el = href === '#top' ? document.body : document.querySelector(href)
    if (!el) return
    const run = () => {
      if (lenisRef.current) lenisRef.current.scrollTo(href === '#top' ? 0 : el, { offset: href === '#top' ? 0 : anchorOffset(el), duration: 1.4 })
      else el.scrollIntoView({ behavior: 'smooth' })
    }
    // The menu/overlay lock is released in the SAME commit as this click, and
    // lenis.start() runs reset() -> animate.stop(), which cancels any in-flight
    // scrollTo. Wait for the unlock to land before scrolling.
    const root = document.documentElement
    if (root.classList.contains('menu-open') || root.classList.contains('overlay-open'))
      requestAnimationFrame(() => requestAnimationFrame(run))
    else run()
  }, [])

  // In-page anchors marked [data-scroll] (the hero "See the work" CTA) had no
  // handler at all and fell through to the browser's native hash jump, landing
  // the target 86px under the fixed nav instead of at the Lenis offset of -70.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[data-scroll]')
      const href = a?.getAttribute('href')
      if (!href?.startsWith('#')) return
      e.preventDefault()
      navigate(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])

  // Client-side hop between / and the sub-pages. Same-origin, plain-left-click
  // only — modified clicks and new-tab middle clicks must stay native so
  // "open in new tab" on a link keeps working, and [download] must never be
  // intercepted or the font files would navigate instead of saving.
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (href !== '/' && !PAGES.includes(href)) return
      e.preventDefault()
      window.history.pushState({}, '', href)
      setRoute(href === '/' ? '/' : href)
      window.scrollTo(0, 0)
      if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <AuthProvider>
    <WizardProvider>
      {/* the loom never stops running — a fixed, compositor-only backdrop
          behind every section (see loom-bg.css) */}
      <div className="loom-bg" aria-hidden="true">
        <div className="loom-bg-warp" />
        <div className="loom-bg-dye"><i /><i /><i /></div>
        <div className="loom-bg-weft" />
        <div className="loom-bg-weft loom-bg-weft--low" />
      </div>
      <Loader done={loaded} />
      <Cursor />
      <ScrollProgress />
      <Nav onNavigate={navigate} />
      <main>
        {route === '/type' ? (
          /* /type — the specimen and download page for LOOM Bloom, the
             studio's own display face. Contact stays off it on purpose: the
             page's job is the download, not a lead. */
          <Typeface />
        ) : route === '/ai-workshops' ? (
          /* /ai-workshops — corporate AI training. Its own page because the
             booking form (module picker + live price) needs room the long
             page's sections don't have; the home page only pitches and links
             here via WorkshopsPromo, below. */
          <Workshops />
        ) : route === '/dashboard' ? (
          /* /dashboard — a signed-in FORGE account's own page. Reached from
             the nav's account control (Chrome.jsx), never from a nav tab —
             the bar is at its documented 13-tab limit. Renders straight from
             the shared AuthProvider below; signed out, it shows a sign-in
             prompt rather than an empty shell. */
          <Dashboard />
        ) : (
        <>
        {/* ORDER IS A CONVERSION DECISION, NOT A TASTE ONE (reordered 9 Aug
            2026, extended 10 Aug, reorganised 10 Aug; Voices and Process
            REMOVED 10 Aug 2026 at the client's request). Four bands; nothing
            may be inserted without picking one:

              PROOF     hero → client wall → cases → who and where the
                        studio is
              QUALIFY   thirty industries (pinned tour) → the fork
              SELL      the floor, then everything buyable
              CAPABLE   what LOOM builds, including for itself
              CLOSE     why → offer → FAQ → contact → careers

            Three rules drove the 10 Aug reorganisation this comment still
            describes: nothing that cannot be bought today may sit above
            something that can; no claim sits above its own evidence; and ALL
            the evidence goes first. Voices (testimonials, `#voices`) and
            Process (`#process`, the four-station "why AI-native" argument)
            were both part of that evidence run. Both were removed from the
            page entirely on 10 Aug 2026 at the client's request — the HOW
            band that Process alone made up is gone with it, folded into
            PROOF. Neither component was deleted: `Voices.jsx` / `data/voices.js`
            and the `Process` export in `Sections.jsx` are still in the tree,
            mounted by nothing, same treatment as Crew/Ascent/OwnApps/ByResult.

            What moved and why (as of the reorganisation that preceded the
            10 Aug removal) is annotated at each seam below. */}
        <Hero />
        {/* PROOF — one section where Marquee and Stats used to be two.
            The marquee slid the most valuable words on the page (UNICEF,
            Vodafone, Benetton) past at a speed nobody reads them at, and the
            numbers band under it was four CountUps with no claim attached.
            They are now the evidence and the summary of one argument; see
            Proof.jsx. Marquee and Stats are still exported from Sections.jsx
            and mounted by nothing. */}
        <Proof />
        {/* Work came up from slot 7. It was behind the typeface, the manifesto
            and two "start here" modules — the visitor was asked to choose a
            service before being shown a single thing LOOM had finished. */}
        <Work />
        {/* Voices (testimonials, `#voices`) used to sit here, brought up in
            the 10 Aug 2026 reorganisation for the same reason Studios was:
            evidence belongs before the ask, not after four sections of R&D.
            REMOVED FROM THE PAGE on 10 Aug 2026, later the same day, at the
            client's request. `components/Voices.jsx` and `data/voices.js`
            are still in the tree, mounted by nothing — same treatment as
            Crew/Ascent/OwnApps/ByResult. `#voices` no longer resolves. */}
        {/* STUDIOS WENT BACK DOWN (10 Aug 2026, later the same day). Bringing
            it up here with Voices was right about the reason and wrong about
            the slot: "who and where we are" is not evidence of the same kind
            as a client list or a case study, and dropping it into the middle
            of that run broke an adjacency Process depended on at the time
            (Process has since been removed too — see below). It now sits in
            the close, where an about-us answers a question the visitor has
            by then started asking. */}
        {/* Process (`#process`, the four-station "why AI-native" argument —
            brief, weave, craft, perform) used to sit here, having come UP
            from the CLOSE band on 10 Aug 2026 to sit directly under the case
            studies it was arguing for. REMOVED FROM THE PAGE on 10 Aug 2026,
            later the same day, at the client's request — it was the entire
            HOW band, which is why that band is gone from the ORDER comment
            above rather than left describing nothing. The `Process` export
            in `components/Sections.jsx` is untouched and still exported,
            mounted by nothing. `#process` no longer resolves and never had a
            nav tab to clean up. */}
        {/* QUALIFY. Now that the proof has landed, the visitor places
            themselves: eight needs, then the fork ("I have a business" / "I
            have an idea"), then their own industry. Three self-selection
            beats in a row, all pointing at the SELL band under them. */}
        {/* MERGED, 9 Aug 2026. Solutions came up from slot 15 first — a
            qualifier is worthless after seven product pitches — and then
            straight into the Counter, because they were never two questions.
            "Which of these eight do you need?" and "which industry are you
            in?" are one ask with two doors, and running them as two full
            sections meant two kickers, two display headlines and two CTAs
            for a single decision. One section, one quote button at the end
            of it. See Solutions.jsx's `merged` prop for the tag swap. */}
        <Counter>
          <Solutions merged />
        </Counter>
        {/* Now AFTER the merged qualifier rather than between its halves. The
            fork is the fallback for the visitor who found themselves in
            neither the eight needs nor the thirty industries. */}
        <OfferPair />
        {/* SELL — the offerings with a price and a way in, ranked by what
            LOOM actually wants sold. */}
        {/* Pricing opens the band (10 Aug 2026). The page previously named a
            number in exactly two places — 89 JOD inside The Machine's own
            pitch, and a live per-seat figure behind the /ai-workshops route —
            and named none at all for the three things LOOM is asked for most:
            a site, an app, a piece of software. In this market a visitor who
            cannot find a floor assumes the ceiling. This band states the floor
            once, up front, and two of its six cards point down at the
            sections below rather than replacing them. */}
        <Pricing />
        {/* The Machine is the recurring subscription and opens the pitches
            instead of arriving at 13, under two things nobody can buy. */}
        <TheMachine />
        {/* Same shelf, one step lighter: the Protocol puts LOOM inside the
            client's AI; this puts the CLIENT inside everyone else's. Four
            deliverables, one demo, one CTA. */}
        <AnswerEngine />
        {/* AI LOOM runs FOR a client, then AI LOOM teaches the client's own
            team to run. Has its own booking page with a live price, so it
            closes the sell band rather than trailing the capability one. */}
        <WorkshopsPromo />
        {/* FORGE closes the SELL band (10 Aug 2026) — the smallest, cheapest
            and only instantly self-serve thing LOOM sells: 2 JOD a model,
            first one free, no brief and no call. It sits LAST in SELL and
            immediately above CAPABLE on purpose. Last, because the band is
            ranked by what LOOM wants sold and a 2 JOD self-serve tool does
            not outrank a subscription; immediately above CAPABLE, because
            AppsShowcase (#apps) is the section directly under it and this is
            that lab with a price on it.

            It is a SMALL band by instruction — the pitch and the price only.
            Every interactive step lives in the popup it owns, which also
            auto-opens once per visitor. Forge.jsx's header explains why the
            funnel is not split across both. */}
        <Forge />
        {/* CAPABLE — everything that answers "can they actually build it?"
            rather than "what am I buying?". AppsShowcase (#apps, seven app
            cards) and ToolsLab (#lab, the 3D Lab) MERGED into one section,
            "Suite", on 10 Aug 2026 at the client's instruction: the old pair
            was the heaviest run on the page — dozens of images plus
            AppScreens' live animated device mockups, all painting whether or
            not anyone scrolled to it. The client then REJECTED Suite's flat
            card-grid design the same day ("not designed... make it change on
            scroll like it used to do"), so `AppsShowcase` in
            `components/Products.jsx` was rebuilt: same six honest items from
            `data/suite.js`, but back to the scroll-driven "one product centre
            stage, an icon rail of tabs" design — WITHOUT AppScreens' live
            mockups or the old per-app shot cycle, since SUITE only ever
            carries one image per item. Only ONE of the six is publicly
            downloadable today (Quran Noor) — see data/suite.js for why the
            rest carry a status instead of a store badge.
            `components/Suite.jsx` + `suite.css` are still in the tree,
            mounted by nothing — same treatment as OwnApps, ByResult and
            Agents. `#lab` no longer resolves and its nav tab is gone. */}
        <AppsShowcase />
        {/* OwnApps ("We build our own products too" — four in-development
            iOS apps) was REMOVED FROM THE PAGE on 10 Aug 2026 at the client's
            request. `components/OwnApps.jsx` and its CSS are still in the
            tree, mounted by nothing — same treatment as ByResult and Agents.
            `#own-apps` no longer resolves and its "Software" nav tab is gone.

            The Protocol came DOWN from slot 11: it is private beta issued by
            hand, and a dev-tool waitlist does not outrank the subscription.
            The old note claiming it must precede The Machine is retired. */}
        <LoomMcp />
        {/* TypeShowcase came down from slot 2 — it was the second thing a
            buyer saw, before one client name. A free typeface is the purest
            craft flex LOOM has and converts nobody; it belongs with the rest
            of the R&D, where it also stops pulling four heavy planted font
            cuts into the top of the page. /type still carries it in the nav
            for anyone who came for the font. */}
        <TypeShowcase />
        {/* CLOSE — an unbroken ramp to the ask. How it works, why it works,
            who does it, one last offer, then the form. Nothing new is
            introduced past this point. */}
        {/* Two studios, named and placed, immediately before the belief and
            the ask. By here the visitor has seen what LOOM sells and what it
            costs, so "who is this and where are they" is a live question
            rather than an interruption — which is exactly what it was up in
            the evidence run above. Amman and Sarajevo also do real work for
            a Jordanian buyer this late on the page: the studio is local. */}
        <Studios />
        {/* Manifesto came down from slot 4. "Trends don't lead our work.
            Thinking does." is a claim, and a claim only pays once there is
            evidence behind it — it now reads as the conclusion of the page
            rather than its opening assertion. */}
        <Manifesto />
        {/* BY RESULT (1.75 JOD per WhatsApp conversation) was retired 8 Aug 2026:
            LOOM cannot promise an outcome that depends on the client's own
            replies and market. `components/ByResult.jsx` is still in the tree,
            mounted by nothing. */}
        <Bolt />
        {/* Last section before the ask. The only band on the page whose job
            is removing reasons to leave rather than adding reasons to stay —
            timelines, who owns the AI output, which language, how payment
            works. It introduces no new fact (data/faq.js forbids it) and
            carries its own FAQPage JSON-LD, because #aeo above sells exactly
            that markup and the studio should not fail its own pitch on its
            own home page. */}
        <Faq />
        <Contact />
        {/* Last section on the page, just above the footer — the client asked
            for this literally ("just above the footer"). Contact carries the
            sales CTA; this is a different ask entirely (careers, not a lead),
            short enough that it reads as a footnote to the page rather than a
            second pitch competing with Contact's. */}
        <Hiring />
        </>
        )}
      </main>
      <Footer onNavigate={navigate} />
      {/* the butterfly rides the whole page, above the copy and under the nav */}
      <Flyer />
      <MobileChrome />
      {/* The persistent CTA. MobileChrome already carries an identical pill
          below 768px, so this one mounts only above it — one per viewport.
          Bottom-centre, because WhatsAppFab owns the right corner and the
          client asked for both to stay. */}
      <StartProject />
      <WhatsAppFab />
      <WizardModal />
    </WizardProvider>
    </AuthProvider>
  )
}
