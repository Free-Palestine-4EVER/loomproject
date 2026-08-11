import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [name, url] of [['REACT','http://localhost:4931'],['SVELTE','http://localhost:4941']]) {
  const ctx = await b.newContext({ viewport:{width:1440,height:900} })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:(1.6*1024*1024)/8,uploadThroughput:96000})
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
  await p.goto(url,{waitUntil:'load'})
  await p.waitForTimeout(5000)
  const r = await p.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')]
    const loaded=performance.getEntriesByType('resource').filter(e=>/\.(webp|avif|png|jpg)/.test(e.name))
    return {
      inDom: imgs.length,
      eager: imgs.filter(i=>i.loading!=='lazy').length,
      lazy: imgs.filter(i=>i.loading==='lazy').length,
      noDims: imgs.filter(i=>!i.getAttribute('width')||!i.getAttribute('height')).length,
      fetched: loaded.length,
      bytes: Math.round(loaded.reduce((s,e)=>s+(e.encodedBodySize||0),0)/1024),
      top5: loaded.sort((a,b)=>b.encodedBodySize-a.encodedBodySize).slice(0,5).map(e=>e.name.split('/').slice(-2).join('/')+' '+Math.round(e.encodedBodySize/1024)+'KB')
    }
  })
  console.log(name, JSON.stringify(r,null,1))
  await ctx.close()
}
await b.close()
