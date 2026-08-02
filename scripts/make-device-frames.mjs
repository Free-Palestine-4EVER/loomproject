/* make-device-frames.mjs — turn the two stock mockup JPEGs in
   scripts/device-mockups/ into the transparent-background device frames the
   Apps grid and the 3D Lab wear, and print where the display sits inside each
   one so the live UI can be pinned to it in CSS.

     node scripts/make-device-frames.mjs

   Writes public/img/devices/{iphone,macbook}-frame.png, then prints a
   `screen %` block per device. Those four numbers are hand-copied into
   `.app-phone`/`.app-screen` (src/styles.css) and `.lab-mac`/
   `.lab-preview-wrap` (src/components/products-showcase.css) — if you swap the
   artwork, re-run this and update them, or the UI drifts off the glass.

   Source art: rawpixel.com / Freepik (see device-mockups/LICENSE-*.txt).
   The free licence requires attribution; the premium one does not. */
import sharp from 'sharp'

// RGBA at source resolution — every routine below indexes pixels as p * 4.
const read = async (f) => {
  const img = sharp(f).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  return { W: info.width, H: info.height, d: data }
}
const lum = (d, i) => (d[i] + d[i + 1] + d[i + 2]) / 3
/** The backdrop colour, read off a corner rather than hard-coded: JPEG
 *  decoders disagree by a few levels on these files (sharp lands ~6 below
 *  jpeg-js), and every threshold below is expressed relative to this. */
const corner = ({ W, d }) => [d[(2 * W + 2) * 4], d[(2 * W + 2) * 4 + 1], d[(2 * W + 2) * 4 + 2]]
const pixel = ({ W, d }, x, y) => [d[(y * W + x) * 4], d[(y * W + x) * 4 + 1], d[(y * W + x) * 4 + 2]]

/** Flood-fill from the image border, knocking out everything within `t0` of
 *  the background colour and ramping alpha back in between t0 and t1 so the
 *  device silhouette keeps its antialiased edge. Returns Float32 alpha. */
function keyBackground({ W, H, d }, bg, t0, t1, seeds) {
  const alpha = new Float32Array(W * H).fill(1)
  const seen = new Uint8Array(W * H)
  const dist = (i) =>
    Math.max(Math.abs(d[i * 4] - bg[0]), Math.abs(d[i * 4 + 1] - bg[1]), Math.abs(d[i * 4 + 2] - bg[2]))

  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const p = y * W + x
    if (seen[p]) return
    if (dist(p) > t1) return
    seen[p] = 1
    stack.push(p)
  }
  if (seeds) {
    for (const [x, y] of seeds) push(x, y)
  } else {
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1) }
    for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y) }
  }

  while (stack.length) {
    const p = stack.pop()
    const x = p % W, y = (p / W) | 0
    const dd = dist(p)
    alpha[p] = dd <= t0 ? 0 : Math.min(1, (dd - t0) / (t1 - t0))
    if (alpha[p] >= 1) continue // hit the device edge — stop spreading
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1)
  }
  return alpha
}

/** Flood-fill a near-uniform region from a seed; returns its bounding box. */
function regionBBox({ W, H, d }, sx, sy, tol) {
  const seed = [d[(sy * W + sx) * 4], d[(sy * W + sx) * 4 + 1], d[(sy * W + sx) * 4 + 2]]
  const seen = new Uint8Array(W * H)
  const stack = [sy * W + sx]
  seen[sy * W + sx] = 1
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const p = y * W + x
    if (seen[p]) return
    const i = p * 4
    if (Math.max(Math.abs(d[i] - seed[0]), Math.abs(d[i + 1] - seed[1]), Math.abs(d[i + 2] - seed[2])) > tol) return
    seen[p] = 1
    stack.push(p)
  }
  while (stack.length) {
    const p = stack.pop()
    const x = p % W, y = (p / W) | 0
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1)
  }
  return { x0, y0, x1, y1 }
}

/** Crop to `box`, apply the computed alpha, resize to `outW`, write a PNG.
 *  The resize runs on premultiplied alpha so the mockup's white display and
 *  light backdrop can't bleed a halo into the enclosure's antialiased edge. */
async function emit(src, alpha, box, outW, file) {
  const { W, d } = src
  const cw = box.x1 - box.x0 + 1
  const ch = box.y1 - box.y0 + 1
  const cut = Buffer.allocUnsafe(cw * ch * 4)

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (box.y0 + y) * W + (box.x0 + x)
      const o = (y * cw + x) * 4
      cut[o] = d[p * 4]; cut[o + 1] = d[p * 4 + 1]; cut[o + 2] = d[p * 4 + 2]
      cut[o + 3] = Math.round(alpha[p] * 255)
    }
  }

  const outH = Math.max(1, Math.round(ch / (cw / outW)))
  await sharp(cut, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(outW, outH, { kernel: 'lanczos3', fit: 'fill' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(file)
  return { outW, outH }
}

/** The device is the largest opaque blob; anything else the key left behind
 *  (the stock file's baked-in contact shadow) is discarded outright — the site
 *  paints its own shadow, in its own colour. Mutates `alpha`, returns the bbox. */
function keepLargestBlob(alpha, W, H, thresh = 0.12) {
  const label = new Int32Array(W * H).fill(-1)
  let best = -1, bestN = 0, bestBox = null
  let id = 0
  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const sp = sy * W + sx
      if (alpha[sp] <= thresh || label[sp] !== -1) continue
      const stack = [sp]
      label[sp] = id
      let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0
      while (stack.length) {
        const p = stack.pop()
        const x = p % W, y = (p / W) | 0
        n++
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          const np = ny * W + nx
          if (label[np] !== -1 || alpha[np] <= thresh) continue
          label[np] = id
          stack.push(np)
        }
      }
      if (n > bestN) { bestN = n; best = id; bestBox = { x0, y0, x1, y1 } }
      id++
    }
  }
  // Grown by 2px so the blob's own antialiased fringe survives the crop.
  return {
    x0: Math.max(0, bestBox.x0 - 2), y0: Math.max(0, bestBox.y0 - 2),
    x1: Math.min(W - 1, bestBox.x1 + 2), y1: Math.min(H - 1, bestBox.y1 + 2),
  }
}

const pct = (v) => Math.round(v * 10000) / 100

/* ───────────────────────── iPhone ───────────────────────── */
{
  const src = await read('scripts/device-mockups/iphone-14-pro.jpg')
  // t0 is set past the drop shadow's darkest step so the shadow disappears
  // entirely — the site paints its own, in its own colour.
  const alpha = keyBackground(src, corner(src), 30, 62)
  const box = keepLargestBlob(alpha, src.W, src.H)
  const screen = regionBBox(src, src.W >> 1, src.H >> 1, 12) // the blank white display
  // Punch the display out too, so live UI shows through from behind while the
  // Dynamic Island — drawn black, so the fill stops at it — stays on top.
  const hole = keyBackground(src, pixel(src, src.W >> 1, src.H >> 1), 8, 26, [[src.W >> 1, src.H >> 1]])
  for (let p = 0; p < alpha.length; p++) alpha[p] = Math.min(alpha[p], hole[p])
  const out = await emit(src, alpha, box, 900, 'public/img/devices/iphone-frame.png')
  const cw = box.x1 - box.x0 + 1, ch = box.y1 - box.y0 + 1
  console.log('PHONE', out, 'crop', box)
  console.log('  screen %:', {
    left: pct((screen.x0 - box.x0) / cw),
    top: pct((screen.y0 - box.y0) / ch),
    width: pct((screen.x1 - screen.x0 + 1) / cw),
    height: pct((screen.y1 - screen.y0 + 1) / ch),
  })
}

/* ───────────────────────── MacBook ───────────────────────── */
{
  const src = await read('scripts/device-mockups/macbook-pro.jpg')
  const { W, H, d } = src
  const bg = corner(src)
  const alpha = keyBackground(src, bg, 3, 12)
  const box = keepLargestBlob(alpha, W, H)

  // The lid: everything meaningfully darker than the backdrop.
  let lx0 = W, ly0 = H, lx1 = 0, ly1 = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (d[i] < bg[0] - 6) {
        if (x < lx0) lx0 = x; if (x > lx1) lx1 = x
        if (y < ly0) ly0 = y; if (y > ly1) ly1 = y
      }
    }
  }
  // The display is a smooth near-black gradient and the bezel a flat dark grey,
  // so absolute values can't separate them — the gradient crosses the bezel's
  // own value partway across the panel. The *step* at the boundary can: walk out
  // from the middle of the display and stop at the first place the value jumps
  // faster than the gradient ever does. The trip point scales with the backdrop
  // because the whole file's dynamic range moves with the JPEG decoder.
  const STEP = bg[0] * 0.075
  const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1]
  const at = (x, y) => {
    let s = 0
    for (let k = -2; k <= 2; k++) s += lum(d, (y * W + Math.min(W - 1, Math.max(0, x + k))) * 4)
    return s / 5
  }
  const ray = (cx, cy, dx, dy) => {
    let x = cx, y = cy
    for (let n = 0; n < 4000; n++) {
      const nx = x + dx, ny = y + dy
      if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) break
      if (Math.abs(at(nx + dx * 3, ny + dy * 3) - at(nx - dx * 3, ny - dy * 3)) > STEP) return { x: nx, y: ny }
      x = nx; y = ny
    }
    return null
  }
  const cx = (lx0 + lx1) >> 1
  const cy = (ly0 + ly1) >> 1
  const scan = (dx, dy, along) => {
    const hits = []
    for (let k = -6; k <= 6; k++) {
      const ox = along === 'x' ? Math.round(((lx1 - lx0) * k) / 40) : 0
      const oy = along === 'y' ? Math.round(((ly1 - ly0) * k) / 40) : 0
      const h = ray(cx + ox, cy + oy, dx, dy)
      if (h) hits.push(dx ? h.x : h.y)
    }
    return med(hits)
  }
  const s = {
    x0: scan(-1, 0, 'y'), x1: scan(1, 0, 'y'),
    y0: scan(0, -1, 'x'), y1: scan(0, 1, 'x'),
  }
  // The base's soft bottom edge fades below the alpha threshold — extend the
  // crop to the lid/base silhouette so the machine isn't cut off at the foot.
  box.y1 = Math.min(H - 1, Math.max(box.y1, ly1 + 4))
  const out = await emit(src, alpha, box, 1600, 'public/img/devices/macbook-frame.png')
  const cw = box.x1 - box.x0 + 1, ch = box.y1 - box.y0 + 1
  console.log('MACBOOK', out, 'crop', box, 'lid', { lx0, ly0, lx1, ly1 })
  console.log('  screen %:', {
    left: pct((s.x0 - box.x0) / cw),
    top: pct((s.y0 - box.y0) / ch),
    width: pct((s.x1 - s.x0 + 1) / cw),
    height: pct((s.y1 - s.y0 + 1) / ch),
  })
}
