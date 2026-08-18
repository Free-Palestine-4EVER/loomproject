/* Bake a real-world scale into a Meshy GLB.
   Meshy normalises every export into a ~2-unit box, so a model dropped into AR
   lands at an arbitrary size. model-viewer's `scale` attribute fixes the on-page
   render only — Scene Viewer and Quick Look both read the file's own units — so
   the factor has to live in the geometry. */
import { NodeIO } from '@gltf-transform/core'
const [, , src, dst, targetHeightM] = process.argv
const io = new NodeIO()
const doc = await io.read(src)
const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]

// Measure the scene's current height from raw POSITION accessor bounds.
let lo = Infinity, hi = -Infinity
for (const mesh of doc.getRoot().listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    if (!pos) continue
    const min = [], max = []
    pos.getMinNormalized(min); pos.getMaxNormalized(max)
    lo = Math.min(lo, min[1]); hi = Math.max(hi, max[1])
  }
const factor = Number(targetHeightM) / (hi - lo)
for (const node of scene.listChildren()) {
  const s = node.getScale()
  node.setScale([s[0] * factor, s[1] * factor, s[2] * factor])
  const t = node.getTranslation()
  node.setTranslation([t[0] * factor, t[1] * factor, t[2] * factor])
}
await io.write(dst, doc)
console.log(`${dst.split('/').pop()}: ${(hi - lo).toFixed(3)}u -> ${targetHeightM}m (x${factor.toFixed(4)})`)
