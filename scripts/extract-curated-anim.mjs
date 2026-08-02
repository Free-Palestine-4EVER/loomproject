/* extract-curated-anim.mjs — pull curated.media's scroll choreography out of
   the clone's scene-state and write it as a flat, samplable JSON.

     node scripts/extract-curated-anim.mjs

   Their engine drives the scene with Theatre.js: one sequence, normalised
   0..1 across the page scroll, with a BasicKeyframedTrack per animated
   property. Each keyframe carries a value, a position on that 0..1 line, and
   four bezier handle numbers — [rightX, rightY, leftX, leftY] — where a
   keyframe's first two are the outgoing control point and the NEXT keyframe's
   last two are the incoming one, together forming a cubic-bezier easing
   between the pair.

   Output: public/models/curated/scene-anim.json
     { length, tracks: { "<objectId>": { "position.y": [[pos, value, rx, ry, lx, ly], ...] } } }

   Object ids match engineState.pwObjects, so CuratedField can bind each track
   to the node it already built. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = '/Users/hideyourkids/Desktop/dev/Web Clones/curated-clone/scene-state/a2be68de-75b9-45eb-b89f-cac9fd6cde5c.json'
const OUT = resolve(HERE, '../public/models/curated/scene-anim.json')

const state = JSON.parse(readFileSync(SRC, 'utf8'))
const seq = state.animations.sheetsById.DEFAULT_ANIMATION_SHEET_NAME.sequence

const tracks = {}
let keyframeCount = 0

for (const [objectId, obj] of Object.entries(seq.tracksByObject)) {
  const out = {}
  for (const [propPathJson, trackId] of Object.entries(obj.trackIdByPropPath || {})) {
    const data = obj.trackData?.[trackId]
    if (!data?.keyframes?.byId) continue

    // ["position","y"] -> "position.y";  ["color"] -> "color"
    const prop = JSON.parse(propPathJson).join('.')

    const frames = Object.values(data.keyframes.byId)
      .sort((a, b) => a.position - b.position)
      .map((k) => {
        const h = k.handles || [1, 1, 0, 0]
        // Colours and other non-numeric values are carried through as-is;
        // everything else is a plain number on a bezier.
        return typeof k.value === 'number'
          ? [round(k.position), round(k.value), round(h[0]), round(h[1]), round(h[2]), round(h[3])]
          : [round(k.position), k.value, round(h[0]), round(h[1]), round(h[2]), round(h[3])]
      })

    if (frames.length < 2) continue      // a single key is just a static value
    if (frames.every((f) => f[1] === frames[0][1])) continue   // flat track, no motion
    out[prop] = frames
    keyframeCount += frames.length
  }
  if (Object.keys(out).length) tracks[objectId] = out
}

function round(v) {
  return typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ length: seq.length ?? 1, tracks }))

const objects = Object.keys(tracks)
console.log(`wrote ${OUT}`)
console.log(`  ${objects.length} animated objects, ${keyframeCount} keyframes, sequence length ${seq.length}`)
for (const id of objects) {
  const props = Object.keys(tracks[id])
  console.log(`  ${id.slice(0, 8)}  ${props.length.toString().padStart(2)} props  ${props.join(' ')}`)
}
