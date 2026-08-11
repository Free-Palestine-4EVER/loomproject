import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })
const p = await ctx.newPage()
await p.goto('http://localhost:4941',{waitUntil:'networkidle'})
await p.waitForTimeout(2000)
// scroll the whole page so every lazy image resolves, then compare intrinsic vs displayed
await p.evaluate(async () => {
  const h = document.documentElement.scrollHeight
  for (let y=0; y<h; y+=800){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,60)) }
})
await p.waitForTimeout(4000)
const rows = await p.evaluate(() => [...document.querySelectorAll('img')]
  .filter(i => i.naturalWidth && i.getBoundingClientRect().width)
  .map(i => {
    const r = i.getBoundingClientRect()
    return { src: i.currentSrc.split('/').slice(-2).join('/'), nat: i.naturalWidth, shown: Math.round(r.width), ratio: +(i.naturalWidth/(r.width*2)).toFixed(2) }
  })
  .filter(x => x.ratio > 1.3)
  .sort((a,b)=>b.ratio-a.ratio))
console.log('images whose intrinsic width exceeds 2x their displayed CSS width:')
console.log('(ratio 2.0 = four times the pixels actually needed at DPR2)\n')
rows.slice(0,20).forEach(r=>console.log(`  ${String(r.ratio).padStart(5)}x  nat ${String(r.nat).padStart(5)}  shown ${String(r.shown).padStart(4)}  ${r.src}`))
console.log(`\n${rows.length} oversized images of ${await p.evaluate(()=>document.querySelectorAll('img').length)} total`)
await b.close()
