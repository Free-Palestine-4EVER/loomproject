// Check 1: <html lang> correct in the SERVER HTML, JS disabled — plain fetch,
// not a browser, so there's no chance of JS mutating it after the fact.
const BASE = 'http://localhost:4955'
const routes = ['/', '/ar']

for (const r of routes) {
  const res = await fetch(BASE + r)
  const html = await res.text()
  const m = html.match(/<html[^>]*>/)
  console.log(r, '->', res.status, m ? m[0] : 'NO <html> TAG FOUND')
}
