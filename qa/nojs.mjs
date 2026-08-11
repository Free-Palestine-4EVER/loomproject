import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [name,url] of [['react','http://localhost:4931'],['svelte','http://localhost:4941']]) {
  const ctx = await b.newContext({ viewport:{width:1280,height:800}, javaScriptEnabled:false })
  const p = await ctx.newPage()
  await p.goto(url,{waitUntil:'load'}).catch(()=>{})
  await p.waitForTimeout(2500)
  await p.screenshot({ path:`qa/shots/nojs-${name}.png` })
  const txt = await p.evaluate(()=>document.body.innerText.trim().length)
  console.log(`${name.padEnd(7)} visible text with JS off: ${txt} chars`)
  await ctx.close()
}
await b.close()
