// Encode the LOOM HQ film clips for the web.
//
// Seedance hands back ~20 Mbps 1080p masters (35-45 MB for 15 seconds) — fine as
// masters, unshippable as page weight. This builds the ladder the HQ section
// actually loads: a 1080p desktop cut, a 720p cut for coarse pointers, and a
// poster frame so the stage never flashes black before the first frame decodes.
//
//   node scripts/encode-hq.mjs            # encode anything missing
//   node scripts/encode-hq.mjs --force    # re-encode everything
//
// Masters live in gen-videos/ (git-ignored, they are huge). Output lands in
// public/video/hq/ and is what ships.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'gen-videos')
const OUT = path.join(ROOT, 'public', 'video', 'hq')
const FORCE = process.argv.includes('--force')

// ffmpeg is not on this machine's PATH; ffmpeg-static drops a binary in
// node_modules and that is what the pipeline uses.
const ffmpeg = (await import('ffmpeg-static')).default

// Master filename -> the id the site uses. Keeping this table explicit means a
// master can be re-rendered or renamed without silently changing a public URL.
const SLUGS = {
  '01-crew-weaving-brand-on-loom': 'weave-room',
  '02-nexo-3am-customer-messages': 'ops-3am',
  '03-flick-product-hero-shot': 'the-stage',
  '04-crew-riding-thread-to-moon': 'ascent',
}

const LADDER = [
  { suffix: '', w: 1920, h: 1080, crf: 26, maxrate: '3M', bufsize: '6M' },
  { suffix: '-720', w: 1280, h: 720, crf: 28, maxrate: '1600k', bufsize: '3200k' },
]

async function encode(src, dest, rung) {
  await run(ffmpeg, [
    '-y', '-i', src,
    '-vf', `scale=${rung.w}:${rung.h}:flags=lanczos`,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow',
    '-crf', String(rung.crf), '-maxrate', rung.maxrate, '-bufsize', rung.bufsize,
    '-pix_fmt', 'yuv420p',
    // Two-second keyframe interval: the HQ stage seeks to 0 on every floor
    // change, and sparse keyframes make that seek visibly stutter.
    '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
    // faststart moves the moov atom to the front so playback can begin before
    // the whole file has landed.
    '-movflags', '+faststart',
    dest,
  ])
}

async function poster(src, dest) {
  // 1.2s in — far enough past the opening frame that the shot has resolved and
  // the lighting has settled, close enough that it matches what you see on load.
  await run(ffmpeg, [
    '-y', '-ss', '1.2', '-i', src, '-frames:v', '1',
    '-vf', 'scale=1280:-2', '-q:v', '4', dest,
  ])
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`

async function main() {
  if (!existsSync(SRC)) {
    console.error(`No masters directory at ${SRC}`)
    process.exit(1)
  }
  await mkdir(OUT, { recursive: true })

  const masters = (await readdir(SRC)).filter((f) => f.endsWith('.mp4'))
  if (!masters.length) {
    console.log('No masters to encode.')
    return
  }

  let saved = 0
  for (const file of masters) {
    const base = path.basename(file, '.mp4')
    const slug = SLUGS[base] || base
    const src = path.join(SRC, file)
    const srcSize = (await stat(src)).size

    for (const rung of LADDER) {
      const dest = path.join(OUT, `${slug}${rung.suffix}.mp4`)
      if (existsSync(dest) && !FORCE) {
        console.log(`skip  ${path.basename(dest)}`)
        continue
      }
      process.stdout.write(`enc   ${path.basename(dest)} … `)
      await encode(src, dest, rung)
      const size = (await stat(dest)).size
      console.log(`${mb(size)}`)
      if (!rung.suffix) saved += srcSize - size
    }

    const posterDest = path.join(OUT, `${slug}.jpg`)
    if (!existsSync(posterDest) || FORCE) {
      await poster(src, posterDest)
      console.log(`post  ${path.basename(posterDest)} ${mb((await stat(posterDest)).size)}`)
    }
  }

  console.log(`\nDone. ${mb(saved)} shaved off the 1080p rung versus the masters.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
