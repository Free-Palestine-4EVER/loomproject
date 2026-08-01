// Rich.jsx — small animated diagrams that give the information-heavy
// sections a visual layer: capability visuals, process glyphs, a woven
// section divider, sparkline stats and a live-status pill.
// Pure SVG/CSS — no external assets. All loops are transform/opacity only
// and freeze to a complete, settled frame under prefers-reduced-motion.
import { useReducedMotion } from 'motion/react'
import './rich.css'

/* ————————————————— 1. ServiceVisual ————————————————— */

function SV01() {
  // AI & Automation — nodes wired into a loop, a pulse traveling the circuit
  const pts = [[30, 40], [130, 40], [150, 80], [130, 120], [30, 120], [10, 80]]
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path
        d="M30 40 L130 40 L150 80 L130 120 L30 120 L10 80 Z"
        stroke="var(--line)" strokeWidth="1.4"
      />
      <rect x="68" y="68" width="24" height="24" rx="5" className="rc-sv01-core" stroke="var(--violet)" strokeWidth="1.6" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" className="rc-sv01-node" fill="var(--bg-3)" stroke="var(--cyan)" strokeWidth="1.5" />
      ))}
      <circle r="4" fill="var(--magenta)" className="rc-sv01-pulse" />
    </svg>
  )
}

function SV02() {
  // Branding — a mark constructed from guide lines/grid
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      {[32, 64, 96, 128].map((v) => (
        <g key={v}>
          <line x1={v} y1="16" x2={v} y2="144" stroke="var(--line)" strokeWidth="1" />
          <line x1="16" y1={v} x2="144" y2={v} stroke="var(--line)" strokeWidth="1" />
        </g>
      ))}
      <path className="rc-sv02-seg" d="M40 40 V120" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
      <path className="rc-sv02-seg" d="M40 40 H108" stroke="var(--magenta)" strokeWidth="4" strokeLinecap="round" />
      <path className="rc-sv02-seg" d="M64 80 H108" stroke="var(--cyan)" strokeWidth="4" strokeLinecap="round" />
      <circle className="rc-sv02-dot" cx="108" cy="40" r="5" fill="var(--gold)" />
    </svg>
  )
}

function SV03() {
  // Social & Content — stack of post cards fanning + rising engagement line
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <g className="rc-sv03-card" transform="rotate(-8 46 78)">
        <rect x="20" y="42" width="52" height="70" rx="8" fill="var(--bg-3)" stroke="var(--line)" strokeWidth="1.4" />
      </g>
      <g className="rc-sv03-card" transform="rotate(2 46 78)">
        <rect x="26" y="36" width="52" height="70" rx="8" fill="var(--bg-3)" stroke="var(--line)" strokeWidth="1.4" />
      </g>
      <g className="rc-sv03-card" transform="rotate(11 46 78)">
        <rect x="32" y="30" width="52" height="70" rx="8" fill="var(--bg-2)" stroke="var(--magenta)" strokeWidth="1.6" />
        <line x1="40" y1="46" x2="76" y2="46" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="56" x2="66" y2="56" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(96 88)">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} className="rc-sv03-bar" x={i * 12} y={40 - (14 + i * 8)} width="7" height={14 + i * 8} rx="2" fill="var(--cyan)" />
        ))}
      </g>
    </svg>
  )
}

function SV04() {
  // Web & App — browser frame + phone frame, content blocks assembling
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <rect x="14" y="24" width="98" height="76" rx="8" fill="var(--bg-3)" stroke="var(--line)" strokeWidth="1.4" />
      <line x1="14" y1="40" x2="112" y2="40" stroke="var(--line)" strokeWidth="1.4" />
      {[20, 26, 32].map((cx) => <circle key={cx} cx={cx} cy="32" r="2" fill="var(--ink-faint)" className="rc-sv04-dot" />)}
      <rect className="rc-sv04-block" x="24" y="50" width="66" height="10" rx="3" fill="var(--violet)" opacity="0.55" />
      <rect className="rc-sv04-block" x="24" y="66" width="46" height="8" rx="3" fill="var(--ink-faint)" opacity="0.4" />
      <rect className="rc-sv04-block" x="24" y="80" width="56" height="8" rx="3" fill="var(--ink-faint)" opacity="0.4" />
      <g transform="translate(92 74)">
        <rect width="46" height="66" rx="10" fill="var(--bg-2)" stroke="var(--cyan)" strokeWidth="1.5" />
        <rect className="rc-sv04-block" x="8" y="12" width="30" height="10" rx="3" fill="var(--magenta)" opacity="0.6" />
        <rect className="rc-sv04-block" x="8" y="28" width="30" height="8" rx="3" fill="var(--ink-faint)" opacity="0.4" />
        <rect className="rc-sv04-block" x="8" y="42" width="20" height="8" rx="3" fill="var(--ink-faint)" opacity="0.4" />
      </g>
    </svg>
  )
}

function SV05() {
  // Campaigns — storyboard strip advancing
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <g transform="translate(20 52)">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={i * 56} y="0" width="46" height="56" rx="6" fill="var(--bg-3)" stroke="var(--line)" strokeWidth="1.4" />
        ))}
        <line x1="8" y1="12" x2="30" y2="34" stroke="var(--ink-faint)" strokeWidth="1.4" />
        <line x1="64" y1="34" x2="86" y2="12" stroke="var(--ink-faint)" strokeWidth="1.4" />
        <circle cx="141" cy="14" r="5" fill="none" stroke="var(--ink-faint)" strokeWidth="1.4" />
        <rect className="rc-sv05-highlight" x="4" y="-4" width="52" height="64" rx="8" fill="none" stroke="var(--magenta)" strokeWidth="2.2" />
      </g>
      <g transform="translate(20 122)">
        {[0, 24, 48, 72, 96, 120].map((x, i) => (
          <rect key={x} className="rc-sv05-play" x={x} y="0" width="14" height="4" rx="2" fill={i % 2 ? 'var(--cyan)' : 'var(--ink-faint)'} />
        ))}
      </g>
    </svg>
  )
}

function SV06() {
  // AR & Emerging — wireframe object rotating inside camera brackets
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path d="M20 20 V38 M20 20 H38" stroke="var(--magenta)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M140 20 V38 M140 20 H122" stroke="var(--magenta)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 140 V122 M20 140 H38" stroke="var(--magenta)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M140 140 V122 M140 140 H122" stroke="var(--magenta)" strokeWidth="2.4" strokeLinecap="round" />
      {[[26, 26], [134, 26], [26, 134], [134, 134]].map(([x, y], i) => (
        <circle key={i} className="rc-sv06-tick" cx={x} cy={y} r="2.2" fill="var(--cyan)" />
      ))}
    </svg>
  )
}

const SERVICE_VISUALS = { '01': SV01, '02': SV02, '03': SV03, '04': SV04, '05': SV05, '06': SV06 }

export function ServiceVisual({ n }) {
  const reduced = useReducedMotion()
  const Inner = SERVICE_VISUALS[n] || SV01
  return (
    <div className={`rc-visual ${reduced ? 'rc-reduced' : ''}`}>
      <Inner />
      {n === '06' && (
        <div className="rc-sv06-stage">
          <div className="rc-sv06-cube">
            <div className="rc-sv06-face rc-sv06-face--front" />
            <div className="rc-sv06-face rc-sv06-face--back" />
            <div className="rc-sv06-face rc-sv06-face--right" />
            <div className="rc-sv06-face rc-sv06-face--left" />
            <div className="rc-sv06-face rc-sv06-face--top" />
            <div className="rc-sv06-face rc-sv06-face--bottom" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ————————————————— 2. ProcessGlyph ————————————————— */

function PG01() {
  // Intent — compass settling on a target
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="34" stroke="var(--line)" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="20" stroke="var(--line)" strokeWidth="1.4" />
      <g className="rc-pg01-needle">
        <path d="M50 50 L50 20" stroke="var(--magenta)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M50 50 L50 64" stroke="var(--ink-faint)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <circle className="rc-pg01-core" cx="50" cy="50" r="4.5" fill="var(--cyan)" />
    </svg>
  )
}

function PG02() {
  // Weave — a shuttle passing through interlaced threads
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {[26, 42, 58, 74].map((x) => (
        <line key={x} x1={x} y1="18" x2={x} y2="82" stroke="var(--ink-faint)" strokeWidth="1.4" opacity="0.5" />
      ))}
      {[30, 46, 62, 78].map((y, i) => (
        <line key={y} x1="18" y1={y} x2="82" y2={y} stroke="var(--violet)" strokeWidth="1.6" strokeDasharray={i % 2 ? '5 4' : '0'} />
      ))}
      <rect className="rc-pg02-shuttle" x="16" y="46" width="14" height="8" rx="2" fill="var(--magenta)" />
    </svg>
  )
}

function PG03() {
  // Craft — a faceted gem catching light as it's shaped
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g className="rc-pg03-gem">
        <path d="M50 22 L74 42 L64 78 L36 78 L26 42 Z" stroke="var(--cyan)" strokeWidth="1.8" />
        <path d="M50 22 L50 78 M26 42 L74 42 M36 78 L50 42 L64 78" stroke="var(--line)" strokeWidth="1" />
      </g>
      <g className="rc-pg03-facet">
        <path d="M50 46 L58 30" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  )
}

function PG04() {
  // Perform — ascending bars with a pulsing growth arrow
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <line x1="20" y1="80" x2="84" y2="80" stroke="var(--line)" strokeWidth="1.4" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i} className="rc-pg04-bar"
          x={28 + i * 14} y={80 - (16 + i * 12)} width="8" height={16 + i * 12}
          rx="2" fill={i === 3 ? 'var(--magenta)' : 'var(--violet)'}
        />
      ))}
      <g className="rc-pg04-arrow">
        <path d="M70 30 L82 18 M82 18 H74 M82 18 V26" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

const PROCESS_GLYPHS = { '01': PG01, '02': PG02, '03': PG03, '04': PG04 }

export function ProcessGlyph({ n }) {
  const reduced = useReducedMotion()
  const Inner = PROCESS_GLYPHS[n] || PG01
  return (
    <div className={`rc-glyph ${reduced ? 'rc-reduced' : ''}`}>
      <Inner />
    </div>
  )
}

/* ————————————————— 3. ThreadDivider ————————————————— */

export function ThreadDivider({ flip = false }) {
  const reduced = useReducedMotion()
  return (
    <div className={`rc-thread ${flip ? 'rc-flip' : ''} ${reduced ? 'rc-reduced' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rc-thread-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--magenta)" stopOpacity="0.55" />
            <stop offset="50%" stopColor="var(--violet)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 C180,10 360,110 540,60 C720,10 900,110 1080,60 C1260,10 1440,60 1440,60"
          stroke="url(#rc-thread-grad)" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke"
        />
        <path
          d="M0,60 C180,10 360,110 540,60 C720,10 900,110 1080,60 C1260,10 1440,60 1440,60"
          stroke="var(--line)" strokeWidth="1" strokeDasharray="1 10" fill="none" vectorEffect="non-scaling-stroke" transform="translate(0 10)"
        />
        <circle r="5" fill="var(--cyan)" className="rc-thread-pulse" opacity="0.9" />
      </svg>
    </div>
  )
}

/* ————————————————— 4. StatSpark ————————————————— */

export function StatSpark({ seed = 1 }) {
  const reduced = useReducedMotion()
  const s = Math.max(1, Math.abs(seed | 0))
  const bars = Array.from({ length: 7 }, (_, i) => {
    const x = (s * (i + 7) * 2654435761) % 1000
    return 0.3 + (x / 1000) * 0.7 // 0.3 – 1.0
  })
  return (
    <div className={`rc-spark ${reduced ? 'rc-reduced' : ''}`} aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="rc-spark-bar"
          style={{ height: `${h * 100}%`, animationDelay: `${(s + i) % 5 * 0.15}s` }}
        />
      ))}
    </div>
  )
}

/* ————————————————— 5. LiveBadge ————————————————— */

export function LiveBadge({ label = 'Live' }) {
  const reduced = useReducedMotion()
  return (
    <span className={`rc-live ${reduced ? 'rc-reduced' : ''}`}>
      <span className="rc-live-dot-wrap">
        <span className="rc-live-ring" />
        <span className="rc-live-dot" />
      </span>
      {label}
    </span>
  )
}
