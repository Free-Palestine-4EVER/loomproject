// <Pic> — one <img>, plus an AVIF source when one actually exists.
//
// The site ships ~280 webp files and, after `scripts/to-avif.mjs`, an AVIF
// sibling for the 142 of them where AVIF beat webp by at least 12%. This
// component is how a page spends that: it emits
//
//   <picture><source type="image/avif" srcSet="…"><img src="…the webp"></picture>
//
// and falls back to a bare <img> untouched when there is no sibling.
//
// WHY A MANIFEST AND NOT A NAMING CONVENTION. The obvious version — "swap the
// extension and always emit the source" — costs a 404 on every image that has
// no AVIF, on every page load, for every visitor. 138 files did NOT clear the
// 12% gate (flat UI chrome, small icons, anything already near the floor), so
// that convention would trade a real byte saving for ~138 failed requests.
// `avif-manifest.json` is written by the same script that writes the files, so
// the two cannot drift: a file that is not on disk is not in the manifest, and
// a <source> is only emitted for a path the encoder actually kept.
//
// The manifest is a flat array of absolute public paths, ~5.7 KB of JSON that
// gzips to well under a kilobyte and is turned into a Set once at module scope.
// It is NOT re-derived per render.
import MANIFEST from './avif-manifest.json'

const HAS_AVIF = new Set(MANIFEST)

/** `/img/x/y.webp` -> `/img/x/y.avif`, or null when no sibling was kept. */
export function avifFor(src) {
  if (!src || typeof src !== 'string') return null
  const i = src.lastIndexOf('.')
  if (i < 0) return null
  const cand = src.slice(0, i) + '.avif'
  return HAS_AVIF.has(cand) ? cand : null
}

/**
 * Drop-in replacement for <img>. Every prop passes through to the <img>, so
 * width/height/loading/decoding/className/onLoad/ref all behave exactly as they
 * did — this only ever ADDS a source ahead of it.
 *
 * `display: contents` on the <picture> is load-bearing and is the same reason
 * Banners.jsx and Chrome.jsx use it: several of these images are absolutely
 * positioned against an ancestor, and a wrapper with a layout box of its own
 * would become their containing block instead.
 */
export function Pic({ src, media, ...rest }) {
  const avif = avifFor(src)
  if (!avif) return <img src={src} {...rest} />
  return (
    <picture style={{ display: 'contents' }}>
      <source type="image/avif" srcSet={avif} media={media} />
      <img src={src} {...rest} />
    </picture>
  )
}
