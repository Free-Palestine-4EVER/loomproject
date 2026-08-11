// ————————————————————————————————————————————————————————
// What LOOM has built for itself — apps and software, ONE list.
//
// This replaced two sections (AppsShowcase's seven app cards and ToolsLab's
// lab tools) with six, at the client's instruction on 10 Aug 2026. The count
// is read off SUITE.length everywhere it appears — never hard-code it. The old
// pair was the heaviest run on the page: dozens of images plus AppScreens'
// live animated device mockups, all of it painting whether or not anybody
// scrolled to it.
//
// STATUS IS NOT DECORATION. Only ONE of these is downloadable by a stranger
// today — Quran Noor, verified against the iTunes lookup API. KwaKwa is
// TestFlight, Ellie is submitted and waiting on review, Evora Scan is built
// and blocked on a DNS record, 2D3D and KUN are internal tools with no public
// build at all. `status` says which, and `href` exists ONLY where a link actually resolves
// — a store badge that 404s costs more trust than the badge ever earned. If
// one of these goes live, add its href here and nowhere else; the component
// renders a link only when it finds one.
//
// ——— WHERE THE SCREENSHOTS COME FROM (11 Aug 2026) ———
// Every screen in `shots` is rendered from a hand-authored HTML file in
// EVERY screen on this stage is now a genuine capture of a real app, taken
// off a real device — no drawn interface anywhere. Three invented concept
// products (LUME, TARZ, NAQI) were built for this section on 11 Aug 2026 and
// CUT the same day at the client's instruction: their screens had to be
// drawn, and a drawn screen next to a real one reads as fake. If a fourth
// product is ever added here it needs real captures first.
// Re-run
// `node scripts/responsive.mjs` after, or the new original ships unscaled.
//
// ——— `kind` and `shots`: the two facts the stage's imagery is built from ———
//
// `kind` is a HARDWARE fact, not a preference. It decides which mockup the
// stage draws, and the mockups are pure CSS (see appscreens.css) — no frame
// PNG is loaded for either:
//
//   'app'      → THREE phones in a fan. shots[0] is the hero and stands in
//                the centre, slightly larger and forward; shots[1] and
//                shots[2] flank it, smaller, rotated and set back.
//   'software' → ONE MacBook. shots[0] sits in the display.
//
// `shots` is ALWAYS a fixed-length array — 3 for an app, 1 for software —
// and every entry is either `{ src, w, h }` or `null`. A `null` is not a
// bug: the stage draws a brand-tinted placeholder panel carrying the
// product's initial inside the frame, so a missing capture costs nothing —
// no broken image, no 404 in the console. `w`/`h` are the file's REAL pixel
// dimensions (read off the files, never guessed); they only exist to reserve
// the right box while the image decodes.
//
// TO ADD A MISSING SCREENSHOT: drop the file at the exact path named in the
// `null` comment beside it, then swap the `null` for its `{ src, w, h }`.
// Nothing else in the codebase needs to change.
// ————————————————————————————————————————————————————————

export const SUITE = [
  {
    key: 'evora-scan',
    name: 'Evora Scan',
    tag: 'iOS · LiDAR & AR',
    status: 'Built — in review',
    blurb: 'Point a phone at a room and walk out with a 3D model, a measured floor plan and walk-in AR. Built on the iPhone’s own LiDAR.',
    icon: '/img/suite/evora-scan-icon.webp',
    kind: 'app',
    grad: ['#59e6ff', '#7b2fbe'],
    shots: [
      { src: '/img/suite/evora-scan.webp', w: 440, h: 977 },
      { src: '/img/suite/evora-scan-2.webp', w: 720, h: 1565 },
      { src: '/img/suite/evora-scan-3.webp', w: 720, h: 1565 },
    ],
  },
  {
    key: '2d3d',
    name: '2D3D',
    tag: 'Web · Floor plans',
    status: 'In the lab',
    blurb: 'Drop in a flat floor plan and it reads the walls, finds the rooms and stands the whole thing up in 3D — furniture placed, no drawing by hand.',
    kind: 'software',
    grad: ['#f21c8c', '#59e6ff'],
    shots: [{ src: '/img/suite/2d3d.webp', w: 720, h: 325 }],
  },
  {
    key: 'quran-noor',
    name: 'Quran Noor',
    tag: 'iOS · Read & listen',
    status: 'On the App Store',
    href: 'https://apps.apple.com/jo/app/quran-noor-read-listen/id6791463100',
    blurb: 'The full mushaf in Uthmani script with translation, transliteration and recitation — plus prayer times and qibla, offline anywhere in the world.',
    icon: '/img/suite/quran-noor-icon.webp',
    kind: 'app',
    grad: ['#ffc740', '#2e7d5b'],
    shots: [
      { src: '/img/suite/quran-noor.webp', w: 720, h: 1561 },
      { src: '/img/suite/quran-noor-2.webp', w: 720, h: 1561 },
      { src: '/img/suite/quran-noor-3.webp', w: 720, h: 1561 },
    ],
  },
  {
    key: 'kun',
    name: 'KUN',
    tag: 'Software · Generative 3D',
    status: 'In the lab',
    blurb: 'Describe a scene and watch it assemble. A conversational 3D studio — say what you want in the room and the room builds itself.',
    kind: 'software',
    grad: ['#f21c8c', '#7b2fbe'],
    shots: [{ src: '/img/suite/kun.webp', w: 720, h: 325 }],
  },
  {
    key: 'kwakwa',
    name: 'KwaKwa',
    tag: 'iOS · Couples',
    status: 'TestFlight',
    blurb: 'A private little world for two — messages, voice quacks and a duck that reacts to both of you. Silly on purpose, and used daily.',
    icon: '/img/suite/kwakwa-icon.webp',
    kind: 'app',
    grad: ['#ffc740', '#f21c8c'],
    // Re-shot from mocks/ on 11 Aug 2026 so the whole rail shares one art
    // direction. The original simulator captures are still on disk under
    // /img/apps/kwakwa*.webp and are what these reproduce.
    shots: [
      { src: '/img/suite/kwakwa.webp', w: 720, h: 1565 },
      { src: '/img/suite/kwakwa-2.webp', w: 720, h: 1565 },
      { src: '/img/suite/kwakwa-3.webp', w: 720, h: 1565 },
    ],
  },
  {
    key: 'ellie',
    name: 'Ellie لُبّ',
    tag: 'iOS · Pet passport',
    status: 'Submitted',
    blurb: 'Every pet’s papers in one place — vaccinations, weight, family tree and an NFC tag on the collar that opens the whole passport on a stranger’s phone.',
    icon: '/img/suite/ellie-icon.webp',
    kind: 'app',
    grad: ['#7b2fbe', '#f21c8c'],
    shots: [
      { src: '/img/suite/ellie.webp', w: 720, h: 1565 },
      { src: '/img/suite/ellie-2.webp', w: 720, h: 1565 },
      { src: '/img/suite/ellie-3.webp', w: 720, h: 1565 },
    ],
  },

]
