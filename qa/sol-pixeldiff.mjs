import { PNG } from 'pngjs'
import fs from 'node:fs'

const [, , dir, prefix, engine, width, nFrames] = process.argv
const n = parseInt(nFrames, 10)

function loadPng(path) {
  return PNG.sync.read(fs.readFileSync(path))
}

function diffScore(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { error: `size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}` }
  let sum = 0
  let maxDiff = 0
  const total = a.width * a.height
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i])
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1])
    const db = Math.abs(a.data[i + 2] - b.data[i + 2])
    const d = (dr + dg + db) / 3
    sum += d
    if (d > maxDiff) maxDiff = d
  }
  return { meanAbsDiff: +(sum / total).toFixed(4), maxAbsDiff: maxDiff, pixels: total }
}

const results = []
for (let i = 0; i < n - 1; i++) {
  const pa = `${dir}/${prefix}-${engine}-${width}-frame${i}.png`
  const pb = `${dir}/${prefix}-${engine}-${width}-frame${i + 1}.png`
  if (!fs.existsSync(pa) || !fs.existsSync(pb)) continue
  const a = loadPng(pa)
  const b = loadPng(pb)
  results.push({ pair: `${i}->${i + 1}`, ...diffScore(a, b) })
}
console.log(JSON.stringify({ engine, width, results }, null, 2))
