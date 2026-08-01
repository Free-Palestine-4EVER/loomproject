// LOOM icon system — one hand-drawn set, one visual language.
// 24x24, 1.5px round-capped strokes, woven/thread/lattice motifs where the
// subject allows it. Single dispatcher: <Icon name="..." />.

const ICONS = {
  // ───────── App / product marks ─────────
  'heart-frame': () => (
    <>
      <path d="M12 19.2c-2.9-2-6.2-4.6-6.2-8.1a3.9 3.9 0 0 1 6.2-3.1 3.9 3.9 0 0 1 6.2 3.1c0 3.5-3.3 6.1-6.2 8.1Z" />
      <path d="M4 7V4.5h2.5" />
      <path d="M17.5 4.5H20V7" />
      <path d="M20 17v2.5h-2.5" />
      <path d="M6.5 19.5H4V17" />
    </>
  ),
  'scan-room': () => (
    <>
      <path d="M4 8.5V4.5h4" />
      <path d="M15.5 4.5h4v4" />
      <path d="M19.5 15.5v4h-4" />
      <path d="M8.5 19.5h-4v-4" />
      <circle cx="12" cy="12.4" r="1.15" fill="currentColor" stroke="none" />
      <path d="M9.4 12.4a2.6 2.6 0 0 1 5.2 0" />
      <path d="M7.7 10.2a5.1 5.1 0 0 1 8.6 0" />
    </>
  ),
  'sparkle-face': () => (
    <>
      <circle cx="11.3" cy="13" r="6" />
      <circle cx="9.1" cy="12.2" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="12.2" r="0.5" fill="currentColor" stroke="none" />
      <path d="M9 15.4c.8.9 1.5 1.3 2.3 1.3s1.6-.4 2.4-1.3" />
      <path d="M17.6 3.6v3M16.1 5.1h3" />
    </>
  ),
  receipt: () => (
    <>
      <path d="M6 3h12v16.5l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V3Z" />
      <path d="M9 7.5h6M9 10.5h6M9 13.5h3.5" />
    </>
  ),
  'cube-ar': () => (
    <>
      <path d="M12 3.2 19.2 7.3v8.2L12 19.6 4.8 15.5V7.3L12 3.2Z" />
      <path d="M12 11.4V19.6M12 11.4 4.8 7.3M12 11.4l7.2-4.1" />
      <path d="M2.2 4.6V2.4h2.2" />
      <path d="M19.6 21.6h2.2v-2.2" />
    </>
  ),
  'face-morph': () => (
    <>
      <path d="M12 3.6c3.6 0 6 3 6 6.8 0 4.6-2.8 7.7-6 10-3.2-2.3-6-5.4-6-10 0-3.8 2.4-6.8 6-6.8Z" />
      <path d="M12 4v15.6" strokeDasharray="2 2.6" />
      <path d="M8.6 9.4 12 12.4l3.4-3" />
    </>
  ),

  // ───────── Wizard intent icons ─────────
  idea: () => (
    <>
      <path d="M8 9.3a4 4 0 0 1 8 0c0 2.3-1.4 3.4-2.1 5.1h-3.8C9.4 12.7 8 11.6 8 9.3Z" />
      <path d="M9 8c1.4 1.1 4.6 1.1 6 0" />
      <path d="M10 16.4h4M10.6 18.1h2.8" />
    </>
  ),
  building: () => (
    <>
      <path d="M6 21V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15" />
      <path d="M4 21h16" />
      <path d="M9.4 9h1.4M13.2 9h1.4M9.4 12.6h1.4M13.2 12.6h1.4" />
      <path d="M10.4 21v-3.6a1.6 1.6 0 0 1 3.2 0V21" />
    </>
  ),
  'refresh-brand': () => (
    <>
      <path d="M4.6 12a7.4 7.4 0 0 1 12.5-5.4" />
      <path d="M19.4 12a7.4 7.4 0 0 1-12.5 5.4" />
      <path d="M17.4 4.4v3.2h-3.2" />
      <path d="M6.6 19.6v-3.2h3.2" />
    </>
  ),
  compass: () => (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M14.7 9.3 12.7 13l-3.7 2 2-3.7 3.7-2Z" />
      <path d="M12 4.8v1.5M12 17.7v1.5M4.8 12h1.5M17.7 12h1.5" />
    </>
  ),

  // ───────── Utility ─────────
  'arrow-right': () => (
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  'arrow-up-right': () => (
    <>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </>
  ),
  close: () => (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: () => <path d="M5 13l4.5 4.5L19 8" />,
  thread: () => <path d="M3 14c3-7 6-7 9 0s6 7 9 0" />,
  loom: () => (
    <>
      <path d="M5 4v13a4 4 0 0 0 4 4h11" />
      <path d="M10 4v8a4 4 0 0 0 4 4h6" />
      <circle cx="19" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  spark: () => (
    <path d="M12 3.5 13.4 8.6 18.5 10l-5.1 1.4L12 16.5l-1.4-5.1L5.5 10l5.1-1.4L12 3.5Z" />
  ),
  globe: () => (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <ellipse cx="12" cy="12" rx="3.5" ry="8.3" />
      <path d="M3.8 12h16.4" />
    </>
  ),
  phone: () => (
    <path d="M8.4 4.3c.8 1.6 1.4 2.7 2.4 3.8.3.4.3.9-.1 1.3L9.2 10.9c1 2 2.7 3.7 4.7 4.7l1.5-1.5c.4-.4.9-.4 1.3-.1 1.1.9 2.2 1.6 3.8 2.4.6.3.8 1 .4 1.6l-1.5 1.9c-.3.4-.8.6-1.3.5C13.2 19 4.9 10.7 3.6 5.8c-.1-.5.1-1 .5-1.3l1.9-1.5c.6-.4 1.3-.2 1.6.4Z" />
  ),
  mail: () => (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M4.8 7.4 12 13l7.2-5.6" />
    </>
  ),
  whatsapp: () => (
    <>
      <path d="M4 12.3C4 7.7 7.8 4 12.4 4s8.4 3.7 8.4 8.3c0 4.6-3.8 8.3-8.4 8.3-1.3 0-2.5-.3-3.6-.8L4 21l1.3-4.4C4.5 15.4 4 13.9 4 12.3Z" />
      <circle cx="9.3" cy="12.3" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="12.3" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12.3" r="0.55" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: () => <path d="M6 9l6 6 6-6" />,
}

export const ICON_NAMES = Object.keys(ICONS)

export function Icon({ name, className = '', size = 24 }) {
  const draw = ICONS[name]
  if (!draw) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {draw()}
    </svg>
  )
}
