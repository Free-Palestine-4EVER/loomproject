/**
 * maps.js — the photographed texture sets.
 *
 * Until now every surface was synthesised at runtime, which kept the folder
 * asset-free but hit a ceiling: a real Calacatta slab has structure at
 * frequencies that are not worth reproducing by hand, and a photographed one is
 * simply better. Stone and floor now load real maps; everything else — paint,
 * fluting, brushed metal, plaster, glass — stays procedural, because for those
 * the generator genuinely is as good and costs nothing to download.
 *
 * TWO CONVERSIONS HAPPEN HERE, and both are the kind of thing that silently
 * ruins a render if skipped:
 *
 *  1. COLOUR SPACE. Colour maps are sRGB. Normal, roughness and AO maps are
 *     measurements, not colour — tagging them sRGB gamma-shifts the numbers and
 *     every surface comes out wrong (typically far too glossy).
 *
 *  2. GLOSS IS NOT ROUGHNESS. These sets ship a GLOSS map, which is roughness
 *     inverted. Handing it to three as `roughnessMap` makes polished areas matt
 *     and matt areas polished — a subtle, maddening wrongness that reads as
 *     "bad lighting". It is inverted once here, on a canvas, at load.
 */

import * as THREE from 'three'

const BASE = './assets/'

/** Loaded sets, keyed by name. Empty until `loadMaps()` resolves. */
export const MAPS = {}

function invert(image) {
  const cv = document.createElement('canvas')
  cv.width = image.width
  cv.height = image.height
  const ctx = cv.getContext('2d')
  ctx.drawImage(image, 0, 0)
  // 'difference' against white is a per-channel 255 - x, which is exactly the
  // gloss -> roughness conversion and costs one composite.
  ctx.globalCompositeOperation = 'difference'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, cv.width, cv.height)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 16
  return t
}

function load(loader, file, { srgb = false } = {}) {
  return new Promise((resolve, reject) => {
    loader.load(
      BASE + file,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
        t.anisotropy = 16
        resolve(t)
      },
      undefined,
      reject
    )
  })
}

/**
 * Resolves once every map is decoded. Deliberately awaited before the first
 * build: a material built before its map arrives keeps the fallback forever,
 * so the kitchen would render procedural on load and only pick up the real
 * stone if you happened to change something.
 *
 * Failure is not fatal — a missing file leaves that set undefined and the
 * procedural path takes over.
 */
export async function loadMaps(onProgress) {
  const loader = new THREE.TextureLoader()
  const jobs = [
    ['marble', 'marble-color.jpg', 'marble-normal.jpg', 'marble-gloss.jpg'],
    ['floor', 'floor-color.jpg', 'floor-normal.jpg', 'floor-gloss.jpg', 'floor-ao.jpg'],
  ]

  let done = 0
  await Promise.all(jobs.map(async ([name, color, normal, gloss, ao]) => {
    try {
      const [map, normalMap, glossTex, aoMap] = await Promise.all([
        load(loader, color, { srgb: true }),
        load(loader, normal),
        load(loader, gloss),
        ao ? load(loader, ao) : Promise.resolve(null),
      ])
      MAPS[name] = {
        map,
        normalMap,
        roughnessMap: invert(glossTex.image),
        aoMap,
      }
      glossTex.dispose()
    } catch {
      // Left undefined on purpose — materials.js falls back to procedural.
    }
    done++
    onProgress?.(done / jobs.length)
  }))
  return MAPS
}

/**
 * Clones a set and tiles it to a real-world size. The source photographs are
 * roughly 2 m square of material, so `metres` says how much of the world one
 * tile should cover — that is what keeps a slab reading as a slab rather than
 * as wallpaper.
 */
export function tiled(name, repeatX, repeatY, rotation = 0) {
  const set = MAPS[name]
  if (!set) return null
  const out = {}
  for (const [k, v] of Object.entries(set)) {
    if (!v) continue
    const t = v.clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    if (rotation) { t.center.set(0.5, 0.5); t.rotation = rotation }
    out[k] = t
  }
  return out
}
