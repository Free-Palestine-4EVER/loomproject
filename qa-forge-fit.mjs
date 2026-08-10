// Does the FORGE pitch step actually fit, with both actions reachable?
import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-angle=metal','--enable-gpu'] })
const sizes = [[1440,700],[1440,900],[1280,800],[390,844],[390,667]]
let bad = 0
for (const [w,h] of sizes) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, isMobile:w<768, hasTouch:w<768 })
  const p = await ctx.newPage()
  await p.goto('http://localhost:4930/',{waitUntil:'load'}); await p.waitForTimeout(2800)
  await p.evaluate(()=>document.querySelector('.fg-side-tab')?.click())
  await p.waitForTimeout(1000)
  const r = await p.evaluate(()=>{
    const panel=document.querySelector('.fg-panel')
    const find=(re)=>[...document.querySelectorAll('.fg-scrim button, .fg-scrim a')]
      .find(e=>re.test((e.textContent||'').trim()))
    const box=(e)=>{ if(!e) return null; const q=e.getBoundingClientRect()
      return {top:Math.round(q.top), bottom:Math.round(q.bottom), h:Math.round(q.height)} }
    const pr=panel?panel.getBoundingClientRect():null
    return { panel: pr?{top:Math.round(pr.top),bottom:Math.round(pr.bottom),h:Math.round(pr.height)}:null,
      clipped: panel? panel.scrollHeight>panel.clientHeight : null,
      start: box(find(/start now/i)), signin: box(find(/sign in/i)), vh: window.innerHeight }
  })
  const inside=(e)=> e && r.panel && e.top>=r.panel.top-1 && e.bottom<=r.panel.bottom+1 && e.bottom<=r.vh
  const okS=inside(r.start), okI=inside(r.signin)
  if(!okS||!okI) bad++
  console.log(`${w}x${h}  panel ${r.panel?.h}px (bottom ${r.panel?.bottom}/${r.vh})  start ${r.start?.top}-${r.start?.bottom} ${okS?'OK':'OUT'}  signin ${r.signin?.top}-${r.signin?.bottom} ${okI?'OK':'OUT'}  clipped=${r.clipped}`)
  await p.screenshot({path:`qa-forge-${w}x${h}.png`})
  await ctx.close()
}
console.log(bad===0 ? '\nALL SIZES PASS' : `\n${bad} SIZE(S) FAIL`)
await b.close()
