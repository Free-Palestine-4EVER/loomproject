import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })
const p = await ctx.newPage()
await p.goto('http://localhost:4941',{waitUntil:'networkidle'})
await p.evaluate(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=800){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}})
await p.waitForTimeout(3500)
const r = await p.evaluate(() => {
  const out={}
  for (const i of document.querySelectorAll('img')) {
    if (!i.naturalWidth) continue
    const w = i.getBoundingClientRect().width
    if (!w) continue
    const ratio = i.naturalWidth/(w*2)
    if (ratio <= 1.3) continue
    // walk up to the nearest ancestor with a meaningful class
    let el=i, path=[]
    while (el && el !== document.body && path.length<4){ if(el.className && typeof el.className==='string') path.unshift(el.className.split(' ')[0]); el=el.parentElement }
    const sec = i.closest('section,[id]')?.id || '?'
    const key = `#${sec}  ${path.join(' > ')}`
    out[key] = out[key]||{n:0,shown:Math.round(w),nat:i.naturalWidth}
    out[key].n++
  }
  return out
})
Object.entries(r).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v])=>console.log(`${String(v.n).padStart(3)}x  shown ${String(v.shown).padStart(4)}px  nat ${String(v.nat).padStart(5)}px   ${k}`))
await b.close()
