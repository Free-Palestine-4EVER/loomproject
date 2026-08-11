import { chromium } from 'playwright'

const BASE = 'http://localhost:4941'
const ROUTES = ['/', '/type', '/ai-workshops', '/dashboard']
const VALID_ROUTES = new Set(['/', '/type', '/ai-workshops', '/dashboard'])

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const report = {}

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const data = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
    const ids = new Set(Array.from(document.querySelectorAll('[id]')).map((e) => e.id))
    return {
      links: anchors.map((a) => ({
        href: a.getAttribute('href'),
        text: (a.textContent || '').trim().slice(0, 60),
      })),
      ids: Array.from(ids),
    }
  })

  const problems = []
  for (const { href, text } of data.links) {
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('wa.me')) continue
    if (href.startsWith('#')) {
      const id = href.slice(1)
      if (id && !data.ids.includes(id)) {
        problems.push(`DEAD HASH: href="${href}" text="${text}" — no #${id} on this page`)
      }
    } else if (href.startsWith('/')) {
      const [path, hash] = href.split('#')
      const normPath = path === '' ? '/' : path
      if (!VALID_ROUTES.has(normPath)) {
        problems.push(`DEAD PATH: href="${href}" text="${text}" — route ${normPath} does not exist`)
      }
      // hash on a different page: can't validate ids there without navigating; note separately
    } else {
      problems.push(`UNRECOGNISED: href="${href}" text="${text}"`)
    }
  }

  report[route] = { totalLinks: data.links.length, problems }
}

await browser.close()
console.log(JSON.stringify(report, null, 2))
