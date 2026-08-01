// LabPreviews — six live, looping SVG/CSS previews for the 3D Lab tool cards.
// Pure CSS-driven (transform/opacity/stroke-dashoffset only) so they stay cheap
// and honor prefers-reduced-motion via CSS media query: the base (non-animated)
// styling below IS the finished/settled state; animation is only layered on
// top inside `@media (prefers-reduced-motion: no-preference)` in labpreviews.css.
import './labpreviews.css'

const VB = '0 0 460 260'

/* ───────── KUN — talk-to-3D ───────── */
const KUN_PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const r = 66 + (i % 3) * 20
  return { dx: (Math.cos(a) * r * 1.35).toFixed(1), dy: (Math.sin(a) * r).toFixed(1) }
})

function KunPreview() {
  return (
    <svg className="lpk" viewBox={VB} preserveAspectRatio="xMidYMid meet">
      <g className="lpk-terminal" transform="translate(46,50)">
        <circle className="lpk-dot" cx="0" cy="-4" r="3" />
        <text className="lpk-word lpk-word-0" x="16" y="0">design</text>
        <text className="lpk-word lpk-word-1" x="88" y="0">a</text>
        <text className="lpk-word lpk-word-2" x="106" y="0">floating</text>
        <text className="lpk-word lpk-word-3" x="182" y="0">chair</text>
        <rect className="lpk-caret" x="230" y="-15" width="2" height="17" />
      </g>
      <g className="lpk-particles" transform="translate(230,172)">
        {KUN_PARTICLES.map((p, i) => (
          <circle
            key={i}
            className="lpk-p"
            r="2.2"
            style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${(i * 0.02).toFixed(2)}s` }}
          />
        ))}
      </g>
      <g className="lpk-wire" transform="translate(230,172)">
        <path className="lpk-line" pathLength="100" d="M0,-56 L46,-19 L46,35 L0,72 L-46,35 L-46,-19 Z" />
        <path className="lpk-line" pathLength="100" d="M0,-56 L0,72" />
        <path className="lpk-line" pathLength="100" d="M-46,-19 L46,35" />
        <path className="lpk-line" pathLength="100" d="M46,-19 L-46,35" />
      </g>
    </svg>
  )
}

/* ───────── ORBIT — 3D site editor ───────── */
function OrbitPreview() {
  const markers = [30, 130, 230, 330, 430]
  return (
    <svg className="lpo" viewBox={VB} preserveAspectRatio="xMidYMid meet">
      <rect className="lpo-viewport" x="30" y="18" width="400" height="160" rx="10" />
      <g className="lpo-wire" style={{ '--ox': '230px', '--oy': '96px' }}>
        <path className="lpo-line" d="M230,42 L282,74 L282,130 L230,162 L178,130 L178,74 Z" />
        <path className="lpo-line" d="M230,42 L282,130" />
        <path className="lpo-line" d="M230,42 L178,130" />
        <path className="lpo-line" d="M178,74 L282,74" />
        <path className="lpo-line" d="M178,130 L282,130" />
        <path className="lpo-line" d="M230,42 L230,162" />
      </g>
      <line className="lpo-track" x1="30" y1="212" x2="430" y2="212" />
      {markers.map((x, i) => (
        <rect
          key={x}
          className="lpo-marker"
          x={x - 5} y="207" width="10" height="10"
          transform={`rotate(45 ${x} 212)`}
          style={{ animationDelay: `${i * 0.28}s` }}
        />
      ))}
      <g className="lpo-playhead">
        <line x1="30" y1="198" x2="30" y2="226" />
        <circle cx="30" cy="198" r="4.4" />
      </g>
    </svg>
  )
}

/* ───────── ATELIER — AI interior design ───────── */
function AtelierPreview() {
  return (
    <svg className="lpa" viewBox={VB} preserveAspectRatio="xMidYMid meet">
      <rect className="lpa-room" x="70" y="34" width="320" height="176" rx="4" />
      <line className="lpa-room" x1="230" y1="34" x2="230" y2="210" strokeDasharray="3 6" />

      <g className="lpa-item" style={{ '--tx': '130px', '--ty': '150px', animationDelay: '0.1s' }}>
        <rect x="-38" y="-14" width="76" height="28" rx="9" />
        <line x1="-38" y1="-14" x2="38" y2="-14" />
      </g>
      <g className="lpa-item" style={{ '--tx': '330px', '--ty': '90px', animationDelay: '0.55s' }}>
        <rect x="-30" y="-22" width="60" height="44" rx="4" />
        <line x1="-30" y1="0" x2="30" y2="0" />
      </g>
      <g className="lpa-item" style={{ '--tx': '300px', '--ty': '166px', animationDelay: '1s' }}>
        <circle r="20" />
        <circle r="7" />
      </g>
      <g className="lpa-item" style={{ '--tx': '120px', '--ty': '70px', animationDelay: '1.45s' }}>
        <circle r="8" />
        <path d="M0,-8 Q14,-20 4,-30 M0,-8 Q-16,-16 -10,-28 M0,-8 Q2,-24 14,-24" />
      </g>
    </svg>
  )
}

/* ───────── SPLAT LAB — gaussian splatting ───────── */
const SPLAT_POINTS = Array.from({ length: 54 }, (_, i) => {
  const golden = 2.399963
  const angle = i * golden
  const t = Math.sqrt(i / 54)
  const cx = 230 + Math.cos(angle) * t * 128
  const cy = 130 + Math.sin(angle) * t * 88
  const hash = Math.sin(i * 12.9898) * 43758.5453
  const frac = hash - Math.floor(hash)
  const nAngle = frac * Math.PI * 2
  const nMag = 34 + frac * 68
  return {
    cx: cx.toFixed(1),
    cy: cy.toFixed(1),
    dx: (Math.cos(nAngle) * nMag).toFixed(1),
    dy: (Math.sin(nAngle) * nMag).toFixed(1),
    delay: (frac * 2.3).toFixed(2),
    c: i % 3,
  }
})

function SplatPreview() {
  return (
    <svg className="lps" viewBox={VB} preserveAspectRatio="xMidYMid meet">
      {SPLAT_POINTS.map((p, i) => (
        <circle
          key={i}
          className={`lps-p lps-c${p.c}`}
          cx={p.cx} cy={p.cy} r="1.7"
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </svg>
  )
}

/* ───────── 2D→3D STUDIO — plans to rooms ───────── */
function StudioPreview() {
  return (
    <svg className="lpst" viewBox={VB} preserveAspectRatio="xMidYMid meet">
      <rect className="lpst-floor" x="130" y="170" width="200" height="66" />
      <line className="lpst-floor" x1="230" y1="170" x2="230" y2="236" strokeDasharray="3 5" />

      <polygon
        className="lpst-wall lpst-wall-l"
        style={{ '--ox': '130px', '--oy': '170px' }}
        points="130,170 130,72 92,92 92,190"
      />
      <polygon
        className="lpst-wall lpst-wall-r"
        style={{ '--ox': '330px', '--oy': '170px' }}
        points="330,170 330,72 368,92 368,190"
      />
      <rect
        className="lpst-wall lpst-wall-b"
        style={{ '--ox': '230px', '--oy': '170px' }}
        x="130" y="72" width="200" height="98"
      />
    </svg>
  )
}

/* ───────── TESSERA — pattern engine ───────── */
const HEX_R = 34
function hexPoints(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i)
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}
const HEX_DX = HEX_R * 1.5
const HEX_DY = HEX_R * 1.732
const HEX_TILES = []
for (let col = 0; col < 7; col++) {
  for (let row = 0; row < 3; row++) {
    const cx = 60 + col * HEX_DX
    const cy = 52 + row * HEX_DY + (col % 2 ? HEX_DY / 2 : 0)
    if (cx > 420 || cy > 226) continue
    HEX_TILES.push({ cx, cy, col, row })
  }
}

function TesseraPreview() {
  return (
    <svg className="lpt" viewBox={VB} preserveAspectRatio="xMidYMid meet">
      {HEX_TILES.map(({ cx, cy, col, row }, i) => {
        const c0 = (col + row) % 3
        const c1 = (c0 + 1) % 3
        const pts = hexPoints(cx, cy, HEX_R - 2)
        const delay = `${((col + row) * 0.11).toFixed(2)}s`
        return (
          <g key={i} className="lpt-tile" style={{ '--ox': `${cx}px`, '--oy': `${cy}px`, '--wd': delay }}>
            <polygon className={`lpt-back lpt-c${c1}`} points={pts} />
            <polygon className={`lpt-front lpt-c${c0}`} points={pts} />
          </g>
        )
      })}
    </svg>
  )
}

const PREVIEWS = {
  KUN: KunPreview,
  ORBIT: OrbitPreview,
  ATELIER: AtelierPreview,
  'SPLAT LAB': SplatPreview,
  '2D→3D STUDIO': StudioPreview,
  TESSERA: TesseraPreview,
}

export const LAB_PREVIEWS = ['KUN', 'ORBIT', 'ATELIER', 'SPLAT LAB', '2D→3D STUDIO', 'TESSERA']

export function LabPreview({ name, className = '' }) {
  const Comp = PREVIEWS[name]
  if (!Comp) return null
  return (
    <div className={`labprev ${className}`.trim()} aria-hidden="true">
      <Comp />
    </div>
  )
}
