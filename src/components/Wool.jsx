// Wool UI — the knitted button + felt icon primitives.
//
// 29 button labels exist as real photographed knit. When a button's label is
// one of them we render the photograph; anything else falls back to a CSS knit
// pill built from the same yarn textures, so the site stays consistent without
// inventing a render that was never shot. The label is always in the DOM.
// wool.css is loaded from main.jsx (last, so it wins on ties) — not here,
// where the import graph would inject it before styles.css.

// label (normalised) -> rendered asset
const RENDERED = {
  'start weaving': 'start-weaving',
  'get started': 'get-started',
  'book a call': 'book-a-call',
  'contact us': 'contact-us',
  'request a quote': 'request-a-quote',
  'start free trial': 'start-free-trial',
  'send message': 'send-message',
  'sign up': 'sign-up',
  'log in': 'log-in',
  'log out': 'log-out',
  submit: 'submit',
  confirm: 'confirm',
  save: 'save',
  cancel: 'cancel',
  delete: 'delete',
  edit: 'edit',
  'add new': 'add-new',
  download: 'download',
  share: 'share',
  next: 'next',
  back: 'back',
  review: 'review',
  // the site's own CTAs, shot to the same recipe as the UI-kit set above
  'open the 3d lab': 'open-the-3d-lab',
  'put ai in my brand': 'put-ai-in-my-brand',
  'put the crew on my brand': 'put-the-crew-on-my-brand',
  'start the ascent': 'start-the-ascent',
  'book a floor': 'book-a-floor',
  'send via whatsapp': 'send-via-whatsapp',
  'send as email': 'send-as-email',
  whatsapp: 'whatsapp',
  'see the work': 'see-the-work',
  'next case': 'next-case',
}

// intrinsic width/height of each render, so the browser reserves the right box
// and nothing reflows when the image lands
const RATIO = {
  'start-weaving': 720 / 295, 'get-started': 720 / 348, 'book-a-call': 720 / 403,
  'contact-us': 720 / 367, 'request-a-quote': 720 / 309, 'start-free-trial': 720 / 347,
  'send-message': 720 / 329, 'sign-up': 720 / 377, 'log-in': 720 / 372,
  'log-out': 720 / 335, submit: 720 / 377, confirm: 720 / 431, save: 720 / 428,
  cancel: 720 / 394, delete: 720 / 373, edit: 720 / 394, 'add-new': 720 / 387,
  download: 720 / 343, share: 720 / 339, next: 720 / 329, back: 720 / 390,
  review: 720 / 321, 'open-the-3d-lab': 720 / 380, 'put-ai-in-my-brand': 720 / 419,
  'put-the-crew-on-my-brand': 720 / 366, 'start-the-ascent': 720 / 341,
  'book-a-floor': 720 / 374, 'send-via-whatsapp': 720 / 319, 'send-as-email': 720 / 327,
  whatsapp: 720 / 314, 'see-the-work': 720 / 336, 'next-case': 720 / 307,
}

export const WOOL_ICONS = [
  'arrow-right', 'plus', 'list', 'user', 'trash', 'settings', 'home', 'lock',
  'unlock', 'eye', 'search', 'heart', 'cart', 'tag', 'phone', 'pin', 'calendar',
  'upload', 'share-nodes', 'copy',
]

const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ')

/** A knitted button. `label` decides whether it can be photographic.
 *  `yarn` picks the CSS fallback's colour (magenta by default). */
export function WoolButton({
  label,
  onClick,
  size = 'md',
  yarn = 'magenta',
  href,
  className = '',
  type = 'button',
  ...rest
}) {
  const asset = RENDERED[norm(label)]
  const sizeClass = size === 'big' ? ' is-big' : size === 'small' ? ' is-small' : ''
  const Tag = href ? 'a' : 'button'
  const tagProps = href ? { href } : { type }

  const src = asset ? `/img/wool/buttons/${asset}.webp` : null
  const h = asset ? Math.round(720 / RATIO[asset]) : 0

  // Both variants are built from the same three layers, so hover/press feel
  // identical whether the pill is a photograph or cut from yarn slices:
  //   halo  — the fibre bloom that lifts off the dark on hover
  //   plate — the wool itself
  //   sheen — a light pass travelling over the nap
  // The halo is a plain tinted gradient, NOT a blurred copy of the wool.
  // A blurred duplicate looked marginally better and cost 36 permanently
  // rasterised blur layers across the page — it stalled scrolling outright.
  const inner = asset ? (
    <>
      <span className="wool-btn-halo" aria-hidden="true" />
      <img src={src} alt="" width={720} height={h} loading="lazy" decoding="async" />
      <span className="wool-btn-label">{label}</span>
    </>
  ) : (
    <>
      <span className="wool-btn-halo" aria-hidden="true" />
      <span className="wool-btn-plate" aria-hidden="true" />
      <span className="wool-btn-text">{label}</span>
    </>
  )

  return (
    <Tag
      {...tagProps}
      onClick={onClick}
      className={
        `wool-btn ${asset ? 'wool-btn--photo' : `wool-btn--css wool-btn--${yarn}`}` +
        `${sizeClass} ${className}`.trimEnd()
      }
      {...rest}
    >
      {inner}
    </Tag>
  )
}

/** A felted icon medallion. Falls back to nothing rather than a broken image
 *  if an unknown name is passed. */
export function WoolIcon({ name, size = 'md', className = '', alt = '' }) {
  if (!WOOL_ICONS.includes(name)) return null
  const sizeClass = size === 'lg' ? ' wool-icon--lg' : size === 'sm' ? ' wool-icon--sm' : ''
  return (
    <img
      src={`/img/wool/icons/${name}.webp`}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      className={`wool-icon${sizeClass} ${className}`.trimEnd()}
      width={320}
      height={320}
      loading="lazy"
      decoding="async"
    />
  )
}
