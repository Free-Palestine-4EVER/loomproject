#!/usr/bin/env node
// Runs the Vite dev server and the Studio edit server side by side.
// No concurrently/npm-run-all dependency — just two child processes.

import { spawn } from 'node:child_process'
import path from 'node:path'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')

const C = {
  vite: '\x1b[38;5;110m',
  studio: '\x1b[38;5;179m',
  dim: '\x1b[2m',
  off: '\x1b[0m',
}

/**
 * Is something already listening on this port?
 *
 * Probed by connecting, not by binding: Vite listens on [::1] only, so a
 * successful bind to 127.0.0.1 proves nothing — that mistake starts a second
 * dev server that then squats the Studio port on the other address family.
 * Both families are checked.
 */
const portTaken = (port) =>
  Promise.all(['127.0.0.1', '::1'].map((host) =>
    new Promise((resolve) => {
      const sock = net.connect({ port, host })
      const done = (v) => { sock.destroy(); resolve(v) }
      sock.setTimeout(400)
      sock.once('connect', () => done(true))
      sock.once('timeout', () => done(false))
      sock.once('error', () => done(false))
    })
  )).then((r) => r.some(Boolean))

const children = []

function run(name, cmd, args) {
  const child = spawn(cmd, args, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  children.push(child)
  const tag = `${C[name] || ''}${name.padEnd(6)}${C.off} ${C.dim}│${C.off} `
  const pipe = (stream) => {
    let buf = ''
    stream.on('data', (c) => {
      buf += c.toString('utf8')
      let nl
      while ((nl = buf.indexOf('\n')) !== -1) {
        process.stdout.write(tag + buf.slice(0, nl) + '\n')
        buf = buf.slice(nl + 1)
      }
    })
  }
  pipe(child.stdout)
  pipe(child.stderr)
  child.on('exit', (code) => {
    process.stdout.write(`${tag}exited (${code})\n`)
    shutdown(code ?? 0)
  })
  return child
}

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const c of children) { try { c.kill('SIGTERM') } catch {} }
  setTimeout(() => process.exit(code), 150)
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => shutdown(0))

const STUDIO_PORT = Number(process.env.STUDIO_PORT || 4931)

if (await portTaken(STUDIO_PORT)) {
  console.error(`\nPort ${STUDIO_PORT} is busy — the Studio server is probably already running.`)
  console.error(`Close it first, or run:  STUDIO_PORT=4932 npm run studio\n`)
  process.exit(1)
}

run('studio', process.execPath, [path.join(HERE, 'server.mjs')])

if (await portTaken(4930)) {
  console.log(`${C.vite}vite  ${C.off} ${C.dim}│${C.off} already running on http://localhost:4930 — reusing it`)
} else {
  run('vite', process.execPath, [path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')])
}

console.log(`\n  LOOM Studio ready → ${C.studio}http://localhost:4930${C.off}   (press E on the page)\n`)
