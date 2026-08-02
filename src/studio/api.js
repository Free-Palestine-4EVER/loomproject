// Thin client for the local Studio server (studio/server.mjs).
// It runs on its own port, so every call is absolute.

const BASE = `http://127.0.0.1:${import.meta.env.VITE_STUDIO_PORT || 4931}`

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { data, status: res.status })
  return data
}

async function get(path) {
  const res = await fetch(BASE + path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { data })
  return data
}

export const api = {
  health: () => get('/api/health'),
  saveText: (payload) => post('/api/text', payload),
  undo: () => post('/api/undo'),
  history: () => get('/api/history'),
  getComments: () => get('/api/comments'),
  putComments: (comments) => post('/api/comments', { comments }),
  asks: () => get('/api/asks'),
  cancelAsk: (id) => post('/api/ask/cancel', { id }),

  /**
   * Stream a `claude -p` run. `onEvent` gets each parsed SSE payload.
   * Returns an abort function.
   */
  ask(prompt, context, onEvent) {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(BASE + '/api/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt, context }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          let i
          while ((i = buf.indexOf('\n\n')) !== -1) {
            const frame = buf.slice(0, i)
            buf = buf.slice(i + 2)
            const line = frame.split('\n').find((l) => l.startsWith('data: '))
            if (!line) continue
            try { onEvent(JSON.parse(line.slice(6))) } catch {}
          }
        }
        onEvent({ type: 'closed' })
      } catch (e) {
        if (e.name !== 'AbortError') onEvent({ type: 'error', message: e.message })
        onEvent({ type: 'closed' })
      }
    })()
    return () => controller.abort()
  },
}

export const STUDIO_BASE = BASE
