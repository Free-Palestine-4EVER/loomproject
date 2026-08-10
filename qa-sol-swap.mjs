// Does the industry photo actually swap without a gap on the FIRST pass?
// Also: is anything covering the section's own CTA on a phone?
import { webkit } from 'playwright'
const b = await webkit.launch()
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
const req = new Map(), fin = new Map()
p.on('request', r => { if (/\/img\/niches\//.test(r.url())) req.set(r.url(), Date.now()) })
p.on('requestfinished', r => { if (/\/img\/niches\//.test(r.url())) fin.set(r.url(), Date.now()) })
await p.goto('http://localhost:4930/', { waitUntil:'load' }); await p.waitForTimeout(3500)
const y = await p.evaluate(()=>{const el=document.querySelector('.sol-pin');return Math.round(el.getBoundingClientRect().top+window.scrollY+window.innerHeight*0.55)})
await p.evaluate((y)=>window.__lenis?window.__lenis.scrollTo(y,{immediate:true}):window.scrollTo(0,y), y)
await p.waitForTimeout(1500)

// walk six industries, sampling whether the stage img is decoded at each step
const H = await p.evaluate(()=>window.innerHeight)
const steps = []
for (let i=1;i<=6;i++){
  await p.evaluate((v)=>window.__lenis?window.__lenis.scrollTo(window.scrollY+v,{immediate:true}):window.scrollBy(0,v), H*0.17)
  await p.waitForTimeout(120)   // deliberately SHORT: this is the gap the eye sees
  steps.push(await p.evaluate(()=>{
    const img=document.querySelector('.sol-stage-bg')
    return { name:document.querySelector('.sol-answer-name')?.textContent,
             src:img?.currentSrc.split('/').pop(), complete:img?.complete, w:img?.naturalWidth }
  }))
}
console.log('FIRST PASS — is the photo decoded 120ms after each change?')
steps.forEach(s=>console.log(`  ${String(s.name).padEnd(22)} ${s.complete && s.w>0 ? 'READY' : 'BLANK'}  ${s.src}`))
console.log('\nniche images fetched:', req.size, ' finished:', fin.size)

// what overlaps the section CTA?
console.log('\nOVERLAP CHECK')
console.log(JSON.stringify(await p.evaluate(()=>{
  const cta=document.querySelector('.sol-pin .sol-cta')?.getBoundingClientRect()
  const hit=(sel)=>{const e=document.querySelector(sel); if(!e||!cta) return null
    const r=e.getBoundingClientRect(); const st=getComputedStyle(e)
    const over=!(r.right<=cta.left||r.left>=cta.right||r.bottom<=cta.top||r.top>=cta.bottom)
    return {over, opacity:st.opacity, visible:st.display!=='none'}}
  return { cta: cta?{top:Math.round(cta.top),bottom:Math.round(cta.bottom)}:null,
    fabStack:hit('.wa-fab-stack'), fab:hit('.wa-fab'), bubble:hit('.wa-fab-bubble'), pill:hit('.mobile-cta-pill') }
}), null, 1))
await p.screenshot({path:'qa-sol-overlap.png'})
await b.close()
