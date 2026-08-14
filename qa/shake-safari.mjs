/**
 * THE SHAKE, MEASURED IN REAL SAFARI.
 *
 * Playwright's WebKit reports this section as perfectly still — 0px of spread
 * on every box, at dpr 1 and dpr 2. Real Safari is where the client sees it,
 * and the two are not the same build: Playwright's WebKit has neither Safari's
 * async scrolling thread nor its compositor, which is precisely the layer a
 * 1px scroll-linked judder would live in. So this drives actual Safari over
 * WebDriver (`safaridriver -p <port>`, Develop ▸ Allow Remote Automation).
 *
 * It samples the same boxes as qa/shake.mjs, per animation frame, while
 * scrolling in fractional steps — and additionally reports each box's offset
 * from the sticky box, which is what isolates "the pin is judder" from
 * "something inside the pin is moving relative to it".
 *
 * Usage:  safaridriver -p 4599 &   then   node qa/shake-safari.mjs [url]
 */
const URL = process.argv[2] || 'http://localhost:5199'
const PORT = process.argv[3] || 4599
const BASE = `http://localhost:${PORT}`

const call = async (method, path, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json()
  if (j.value?.error) throw new Error(`${j.value.error}: ${j.value.message}`)
  return j.value
}

const session = await call('POST', '/session', {
  capabilities: { alwaysMatch: { browserName: 'safari' } },
})
const sid = session.sessionId
const cleanup = () => call('DELETE', `/session/${sid}`).catch(() => {})
process.on('exit', cleanup)

try {
  await call('POST', `/session/${sid}/timeouts`, { script: 120000 })
  await call('POST', `/session/${sid}/url`, { url: URL })
  await new Promise((r) => setTimeout(r, 3000))

  const probe = `
    const cb = arguments[arguments.length - 1];
    const TARGETS = {
      'pin track':        '.sol-pin',
      'pin-inner(sticky)':'.sol-pin-inner',
      'search bar':       '.sol-bar',
      'stage':            '.sol-stage',
      'card slot':        '.sol-answer-slot',
      'rail':             '.sol-tour',
    };
    const els = {};
    for (const k in TARGETS) { const e = document.querySelector(TARGETS[k]); if (e) els[k] = e; }
    const pin = document.querySelector('.sol-pin');
    if (!pin) { cb(JSON.stringify({error:'no .sol-pin'})); }
    else {
      window.scrollTo(0, pin.getBoundingClientRect().top + window.scrollY + 60);
      const rows = [];
      let i = 0;
      const tick = () => {
        const row = { y: window.scrollY, dpr: window.devicePixelRatio };
        for (const k in els) {
          const r = els[k].getBoundingClientRect();
          row[k] = { t: r.top, h: r.height };
        }
        rows.push(row);
        window.scrollBy(0, 6 + (i % 4) * 0.41);
        i++;
        if (i < 150) requestAnimationFrame(tick);
        else {
          const keys = Object.keys(els);
          const parked = rows.filter(r => r['pin-inner(sticky)'] && Math.abs(r['pin-inner(sticky)'].t) < 300);
          const sum = { frames: rows.length, parked: parked.length, dpr: rows[0].dpr, boxes: {} };
          for (const k of keys) {
            const tops = parked.map(r => r[k].t), hs = parked.map(r => r[k].h);
            // offset from the sticky box: isolates the pin juddering as a whole
            // from a child drifting inside a pin that is itself rock solid
            const rel = parked.map(r => +(r[k].t - r['pin-inner(sticky)'].t).toFixed(3));
            sum.boxes[k] = {
              topSpread: +(Math.max.apply(null,tops) - Math.min.apply(null,tops)).toFixed(3),
              hSpread:   +(Math.max.apply(null,hs)   - Math.min.apply(null,hs)).toFixed(3),
              relSpread: +(Math.max.apply(null,rel)  - Math.min.apply(null,rel)).toFixed(3),
              distinctTops: new Set(tops.map(v=>v.toFixed(2))).size,
              distinctHeights: new Set(hs.map(v=>v.toFixed(2))).size,
            };
          }
          cb(JSON.stringify(sum));
        }
      };
      requestAnimationFrame(tick);
    }
  `

  const raw = await call('POST', `/session/${sid}/execute/async`, { script: probe, args: [] })
  const out = JSON.parse(raw)
  if (out.error) { console.log('FAILED:', out.error); process.exit(1) }

  console.log(`\nREAL SAFARI · ${out.parked} parked frames of ${out.frames} · dpr ${out.dpr}\n`)
  console.log('box                    top spread   height spread   vs sticky box   distinct tops')
  for (const [k, v] of Object.entries(out.boxes)) {
    const warn = v.topSpread > 0.5 || v.hSpread > 0.5 || v.relSpread > 0.5 ? '  <-- MOVES' : ''
    console.log(
      `${k.padEnd(22)} ${String(v.topSpread).padStart(9)}   ${String(v.hSpread).padStart(13)}   ${String(v.relSpread).padStart(13)}   ${String(v.distinctTops).padStart(13)}${warn}`
    )
  }
} finally {
  await cleanup()
}
