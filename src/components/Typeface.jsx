// /type — the specimen and download page for LOOM Bloom, the studio's own
// display face. The fonts are self-hosted in public/fonts/loom-bloom/ and the
// @font-face rules live in styles.css, so every sample on this page is set in
// the real font, not a picture of it.
import { useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { EASE, Reveal, Magnetic } from '../lib/motion.jsx'
import { PosterMachine } from './PosterMachine.jsx'
import './typeface.css'

const DIR = '/fonts/loom-bloom'
const ZIP_SIZE = '1.05 MB'

// One plain cut and four planted ones. Every cut shares the Regular's metrics
// exactly, so a line of text lines up character for character across all five.
const CUTS = [
  { id: 'regular', label: 'Regular', family: 'LOOM Bloom', ps: 'LOOMBloom', species: 'no ornament — the face itself' },
  { id: 'rose', label: 'Rose', family: 'LOOM Bloom Rose', ps: 'LOOMBloomRose', species: 'roses, leaves and a curling vine' },
  { id: 'daisy', label: 'Daisy', family: 'LOOM Bloom Daisy', ps: 'LOOMBloomDaisy', species: 'twelve-petal daisies and sprigs' },
  { id: 'tulip', label: 'Tulip', family: 'LOOM Bloom Tulip', ps: 'LOOMBloomTulip', species: 'tulips on their necks, long leaves' },
  { id: 'ivy', label: 'Ivy', family: 'LOOM Bloom Ivy', ps: 'LOOMBloomIvy', species: 'trailing ivy — tendrils, no bloom' },
]

const SIZES = {
  LOOMBloom: ['25 KB', '27 KB', '11 KB'],
  LOOMBloomRose: ['1.2 MB', '1.1 MB', '68 KB'],
  LOOMBloomDaisy: ['277 KB', '281 KB', '27 KB'],
  LOOMBloomTulip: ['501 KB', '475 KB', '35 KB'],
  LOOMBloomIvy: ['260 KB', '243 KB', '24 KB'],
}

const FORMATS = [
  { fmt: 'OTF', ext: 'otf', use: 'Desktop — macOS, Windows, Linux' },
  { fmt: 'TTF', ext: 'ttf', use: 'Desktop — older apps' },
  { fmt: 'WOFF2', ext: 'woff2', use: 'Web' },
]

const FILES = CUTS.flatMap((c) =>
  FORMATS.map((f, i) => ({
    cut: c.label, fmt: f.fmt, use: f.use,
    file: `${c.ps}-Regular.${f.ext}`, size: SIZES[c.ps][i],
  }))
)

const GLYPHS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
  // [ and ] are drawn from the same two glyphs as ( and ), so they are not
  // listed twice here — they still type.
  ...'.,:;!?\'"()/\\-–—_&@%#+=*~°•',
  ...'ČĆŽŠĐ',
  ...'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇÝ',
  '❀', '✿', '❦',
]

const WATERFALL = [
  { px: 128, text: 'BRUTAL' },
  { px: 92, text: 'CONDENSED' },
  { px: 64, text: 'FLAT TERMINALS' },
  { px: 44, text: 'MITRED JOINS, NO SOFT EDGES' },
  { px: 30, text: 'ONE STEM WEIGHT — 178 UNITS AT A 700 CAP' },
  { px: 20, text: 'AMMAN × SARAJEVO · WOVEN ON A LOOM · 2026 ❀' },
]

const ANATOMY = [
  {
    k: 'Flat terminals',
    d: 'Every stroke is cut square. No round caps anywhere in the face — a stroke stops dead where the glyph box does.',
    svg: (
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <rect x="18" y="14" width="26" height="62" fill="currentColor" />
        <rect x="60" y="14" width="42" height="20" fill="currentColor" />
        <path d="M16 14h30M16 76h30" stroke="var(--magenta)" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  {
    k: 'Mitred joins',
    d: 'A, M, W, K and Z are stroked along a polyline with mitred corners, so an apex comes to a point instead of two bars overlapping.',
    svg: (
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <path d="M22 78 L60 14 L98 78" stroke="currentColor" strokeWidth="22" fill="none" strokeLinejoin="miter" strokeMiterlimit="9" />
        <circle cx="60" cy="14" r="5" fill="var(--magenta)" />
      </svg>
    ),
  },
  {
    k: 'One radius',
    d: 'B, D, O, C, G, S and every figure sit on the same rounded-rectangle skeleton: straight sides, one corner radius, rectangular counters.',
    svg: (
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <path d="M26 14h40a22 22 0 0 1 22 22v18a22 22 0 0 1-22 22H26z" fill="currentColor" />
        <path d="M44 32h20a10 10 0 0 1 10 10v6a10 10 0 0 1-10 10H44z" fill="var(--bg)" />
        <path d="M66 14a22 22 0 0 1 22 22" stroke="var(--magenta)" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
]

const FACTS = [
  ['5', 'cuts — one plain, four planted'],
  ['93', 'glyphs per cut'],
  ['156', 'characters mapped'],
  ['31', 'accented letters — Č Ć Ž Š Đ included'],
  ['178', 'stem, at a 700 cap'],
  ['168', 'one corner radius'],
]

const SNIPPET = `@font-face {
  font-family: 'LOOM Bloom';
  src: url('/fonts/loom-bloom/LOOMBloom-Regular.woff2') format('woff2');
  font-display: swap;
}

h1 { font-family: 'LOOM Bloom', sans-serif; }`

function Band({ family, text, dir = 1, dim }) {
  return (
    <div className={`tf-band ${dim ? 'tf-band--dim' : ''}`} aria-hidden="true">
      <motion.div
        className="tf-band-track"
        style={{ fontFamily: family }}
        animate={{ x: dir > 0 ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
      >
        <span>{text}</span><span>{text}</span>
      </motion.div>
    </div>
  )
}

export function Typeface() {
  const [cut, setCut] = useState('regular')
  const [size, setSize] = useState(120)
  const [text, setText] = useState('Brutal bloom')
  const [copied, setCopied] = useState(false)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const heroFade = useTransform(scrollYProgress, [0, 0.9], [1, 0])

  const family = useMemo(() => CUTS.find((c) => c.id === cut).family, [cut])
  const cutLabel = useMemo(() => CUTS.find((c) => c.id === cut).label, [cut])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked — the snippet is selectable on the page */ }
  }

  return (
    <div className="tf">
      {/* ——————————————————————————— hero */}
      <section className="tf-hero" ref={heroRef}>
        <motion.div className="tf-hero-inner" style={{ y: heroY, opacity: heroFade }}>
          <div className="tf-hero-meta">
            <span className="tf-tag">The LOOM typeface</span>
            <span>v1.100</span>
            <span>Free — personal &amp; commercial</span>
          </div>
          <h1 className="tf-hero-word">
            {['LOOM', 'BLOOM'].map((line, i) => (
              <span className="tf-hero-mask" key={line}>
                <motion.span
                  className={`tf-hero-line ${i ? 'tf-hero-line--floral' : ''}`}
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.05, ease: EASE, delay: 0.15 + i * 0.12 }}
                >{line}</motion.span>
              </span>
            ))}
          </h1>
          <div className="tf-hero-foot">
            <p className="tf-hero-sub">
              A condensed brutal display face. Flat terminals, mitred joins, one
              corner radius — drawn from scratch in our own type pipeline, not
              licensed from anyone. Five cuts: the plain face, and four planted
              ones — Rose, Daisy, Tulip and Ivy — each with a different flower
              cut out of the letterforms. The ornament is real Art Nouveau and
              Victorian vector work, all public domain, and every piece is placed
              by measuring the letter itself — one flower per part thick enough
              to hold one, sized to the room it has.
            </p>
            <div className="tf-hero-cta">
              <Magnetic strength={0.2}>
                <a className="tf-btn tf-btn--fill" href={`${DIR}/LOOM-Bloom.zip`} download>
                  Download the family<span>{ZIP_SIZE}</span>
                </a>
              </Magnetic>
              <a className="tf-btn" href="#tf-files">All formats</a>
            </div>
          </div>
        </motion.div>
      </section>

      <Band family="LOOM Bloom" text="ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 " />
      <Band family="LOOM Bloom Daisy" text="ROSE ❀ DAISY ✿ TULIP ❦ IVY ❀ " dir={-1} dim />

      {/* ——————————————————————————— tester */}
      <section className="tf-section">
        <header className="tf-head">
          <h2 className="tf-h2">Type in it</h2>
          <div className="tf-controls">
            <div className="tf-switch" role="group" aria-label="Choose a cut">
              {CUTS.map((c) => (
                <button
                  key={c.id}
                  className={`tf-switch-btn ${cut === c.id ? 'is-on' : ''}`}
                  onClick={() => setCut(c.id)}
                  aria-pressed={cut === c.id}
                >{c.label}</button>
              ))}
            </div>
            <label className="tf-slider">
              <input
                type="range" min="28" max="240" value={size}
                onChange={(e) => setSize(+e.target.value)}
                aria-label="Preview size"
              />
              <span>{size}px</span>
            </label>
          </div>
        </header>
        <div className="tf-canvas">
          <input
            className="tf-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck="false"
            aria-label="Preview text"
            style={{ fontFamily: family, fontSize: `${size}px` }}
          />
        </div>
        <p className="tf-note">Caps only, by design — lowercase types as capitals.</p>
      </section>

      {/* ——————————————————————————— waterfall */}
      <section className="tf-section">
        <h2 className="tf-h2">Waterfall</h2>
        <div className="tf-fall">
          {WATERFALL.map((w) => (
            <Reveal key={w.px} y={24}>
              <div className="tf-fall-row">
                <span className="tf-fall-px">{w.px}</span>
                <span className="tf-fall-line" style={{ fontFamily: family, fontSize: `${w.px}px` }}>
                  {w.text}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——————————————————————————— the poster machine */}
      <PosterMachine />

      {/* ——————————————————————————— anatomy */}
      <section className="tf-section">
        <h2 className="tf-h2">How it is drawn</h2>
        <div className="tf-anatomy">
          {ANATOMY.map((a, i) => (
            <Reveal key={a.k} delay={0.06 * i}>
              <article className="tf-anat">
                <div className="tf-anat-fig">{a.svg}</div>
                <h3>{a.k}</h3>
                <p>{a.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——————————————————————————— the four planted cuts */}
      <section className="tf-poster">
        <div className="tf-poster-inner">
          <Reveal><p className="tf-tag tf-tag--light">Four gardens, one skeleton</p></Reveal>
          <Reveal delay={0.05}>
            <p className="tf-poster-copy tf-poster-copy--lead">
              The motif is <em>subtracted</em> from the letter, never added — so a
              petal that hangs past a stem disappears into the page instead of
              leaving a blob behind. Every planted cut keeps the Regular's metrics
              exactly, so the same line sets identically in all five.
            </p>
          </Reveal>
          <div className="tf-species">
            {CUTS.filter((c) => c.id !== 'regular').map((c, i) => (
              <Reveal key={c.id} delay={0.05 + i * 0.06}>
                <figure className="tf-spec">
                  <p className="tf-spec-word" style={{ fontFamily: c.family }}>{c.label.toUpperCase()}</p>
                  <figcaption>
                    <strong>{c.label}</strong>
                    <span>{c.species}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <p className="tf-poster-orn" style={{ fontFamily: family }}>❀ ✿ ❦</p>
          </Reveal>
        </div>
      </section>

      {/* ——————————————————————————— charset */}
      <section className="tf-section">
        <header className="tf-head">
          <h2 className="tf-h2">The character set</h2>
          <p className="tf-note tf-note--inline">93 glyphs · 156 codepoints · showing {cutLabel}</p>
        </header>
        <div className="tf-grid" style={{ fontFamily: family }}>
          {GLYPHS.map((g, i) => (
            <motion.span
              key={`${g}-${i}`}
              className="tf-cell"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.006, 0.35) }}
              title={`U+${g.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`}
            >{g}</motion.span>
          ))}
        </div>
      </section>

      {/* ——————————————————————————— facts */}
      <section className="tf-section">
        <div className="tf-facts">
          {FACTS.map(([n, label], i) => (
            <Reveal key={label} delay={0.04 * i}>
              <div className="tf-fact">
                <span className="tf-fact-n">{n}</span>
                <span className="tf-fact-l">{label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——————————————————————————— downloads */}
      <section className="tf-section" id="tf-files">
        <header className="tf-head">
          <h2 className="tf-h2">Download</h2>
          <Magnetic strength={0.2}>
            <a className="tf-btn tf-btn--fill" href={`${DIR}/LOOM-Bloom.zip`} download>
              Everything, zipped<span>{ZIP_SIZE}</span>
            </a>
          </Magnetic>
        </header>
        <div className="tf-files">
          {FILES.map((f, i) => (
            <Reveal key={f.file} delay={0.03 * i} y={18}>
              <a className="tf-file" href={`${DIR}/${f.file}`} download>
                <span className="tf-file-cut">{f.cut}</span>
                <span className="tf-file-fmt">{f.fmt}</span>
                <span className="tf-file-use">{f.use}</span>
                <span className="tf-file-size">{f.size}</span>
                <span className="tf-file-arrow" aria-hidden="true">↓</span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——————————————————————————— use + licence */}
      <section className="tf-section">
        <div className="tf-use-grid">
          <div>
            <h2 className="tf-h2">Use it on the web</h2>
            <div className="tf-code">
              <pre><code>{SNIPPET}</code></pre>
              <button className="tf-copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          <div className="tf-licence">
            <h2 className="tf-h2">Licence</h2>
            <p>
              Free to use, embed and modify for personal and commercial work, print
              and screen. Don't resell the font files themselves or claim authorship
              of the typeface. The ornament inside the planted cuts is redrawn
              from public-domain and CC0 vector artwork (1899–1913 Art Nouveau
              and Victorian ornament, plus CC0 ornament sets); every source is
              recorded in the project. Full terms ship inside the zip.
            </p>
            <p className="tf-licence-meta">
              LOOM Bloom v1.100<br />© {new Date().getFullYear()} LOOM · Amman × Sarajevo
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
