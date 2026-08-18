/*
  Pre-renders the two "open this on your phone" QR codes for the B.B. Simon
  pitch pages, as static SVG in static/img/bbsimon/.

  Built here rather than in the browser for one reason: AR is the whole point
  of those pages, and AR does not exist on the laptop the pitch gets shown on.
  WebXR is Android-only and Quick Look is iOS-only, so on a desktop the AR
  button can never light up — without a QR the reviewer has to type a URL into
  a phone by hand, and in practice simply does not, which means the one feature
  we are selling never gets seen.

  Run after any change to the deployed origin or the route names:
    node scripts/build-bbsimon-qr.mjs
*/
import QRCode from 'qrcode'
import { writeFile, mkdir } from 'node:fs/promises'

const ORIGIN = 'https://www.loomstudio-jo.com'
const OUT = new URL('../static/img/bbsimon/', import.meta.url)

await mkdir(OUT, { recursive: true })

for (const route of ['bbsimon1', 'bbsimon2']) {
  const svg = await QRCode.toString(`${ORIGIN}/${route}`, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#00000000' }, // transparent ground
  })
  await writeFile(new URL(`qr-${route}.svg`, OUT), svg)
  console.log(`qr-${route}.svg -> ${ORIGIN}/${route}`)
}
