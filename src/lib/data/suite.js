// ————————————————————————————————————————————————————————
// What LOOM has built for itself — apps and software, ONE list.
//
// This replaced two sections (AppsShowcase's seven app cards and ToolsLab's
// lab tools) with one, at the client's instruction on 10 Aug 2026 (six items
// then, eight now — see the 12 Aug note below). The count
// is read off SUITE.length everywhere it appears — never hard-code it. The old
// pair was the heaviest run on the page: dozens of images plus AppScreens'
// live animated device mockups, all of it painting whether or not anybody
// scrolled to it.
//
// ——— THE LIST IS THE SCREENSHOT FOLDER, 12 Aug 2026 ———
// Rebuilt at the client's instruction: the stage shows the apps he has real
// device captures for, and nothing else. Eight, all `kind: 'app'`.
//
// IN, and new to this list: Lahza, Glowbar, My Fairy Trail, AJNIHA.
// OUT: 2D3D and KUN — the two `kind: 'software'` entries. They are internal
// tools with no app to screenshot, and there is now no MacBook branch left on
// the stage. They are not deleted from the site's story, they are simply not
// products with captures; if either ever gets a real UI worth showing, it
// comes back with real screens and the 'software' branch comes back with it.
//
// STATUS IS NOT DECORATION. Only ONE of these is downloadable by a stranger
// today — Quran Noor, verified against the iTunes lookup API. `status` says
// where each of the others actually is, and `href` exists ONLY where a link
// resolves — a store badge that 404s costs more trust than the badge ever
// earned. If one goes live, add its href here and nowhere else; the component
// renders a link only when it finds one.
//
// ——— WHERE THE SCREENSHOTS COME FROM ———
// EVERY screen in `shots` is a genuine capture of a real app, taken off a
// real device or simulator — no drawn interface anywhere. All 24 were
// re-cut on 12 Aug 2026 from ~/Desktop/LOOM APPS SCRENSHOTS, resized to 720
// wide (webp q88 + avif q62). Three invented concept products (LUME, TARZ,
// NAQI) were built for this section on 11 Aug 2026 and CUT the same day at
// the client's instruction: their screens had to be drawn, and a drawn screen
// next to a real one reads as fake. If a ninth product is ever added here it
// needs real captures first.
// Re-run `node scripts/responsive.mjs` after adding one, or the new original
// ships unscaled.
//
// ——— `bg`: the scene behind the card (12 Aug 2026) ———
// Each product's stage now sits on its own photograph rather than on the
// shared page ground, so the eight read as eight places instead of one card
// with the nouns swapped. Generated in Higgsfield at 21:9, and every one of
// them is deliberately FAR OUT OF FOCUS, dark and low in contrast: it is a
// ground for white type and three phones, not a picture anyone is meant to
// look at. products-stage.css lays a scrim over it on top of that — see
// `.stg-bg`. A background that competes with the screenshots is a failed
// background; if a re-run comes back sharp, punchy or bright, it is unusable
// here however handsome it is. None of them contains lettering, a mark, or a
// recognisable person, and none depicts a client's actual premises.
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

// Ordered by how far each one has actually got, most-shipped first. That is a
// deliberate reading order and not a ranking of the work: the first card a
// visitor lands on should be the one they can go and download.
export const SUITE = [
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
    bg: '/img/suite/bg/quran-noor.webp',
    shots: [
      { src: '/img/suite/quran-noor.webp', w: 1320, h: 2868 },
      { src: '/img/suite/quran-noor-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/quran-noor-3.webp', w: 1320, h: 2868 },
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
    bg: '/img/suite/bg/ellie.webp',
    shots: [
      { src: '/img/suite/ellie.webp', w: 1320, h: 2868 },
      { src: '/img/suite/ellie-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/ellie-3.webp', w: 1320, h: 2868 },
    ],
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
    bg: '/img/suite/bg/kwakwa.webp',
    shots: [
      { src: '/img/suite/kwakwa.webp', w: 1320, h: 2868 },
      { src: '/img/suite/kwakwa-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/kwakwa-3.webp', w: 1320, h: 2868 },
    ],
  },
  {
    key: 'evora-scan',
    name: 'Evora Scan',
    tag: 'iOS · LiDAR & AR',
    status: 'Built — in review',
    blurb: 'Point a phone at a room and walk out with a 3D model, a measured floor plan and walk-in AR. Built on the iPhone’s own LiDAR.',
    icon: '/img/suite/evora-scan-icon.webp',
    kind: 'app',
    grad: ['#59e6ff', '#7b2fbe'],
    bg: '/img/suite/bg/evora-scan.webp',
    shots: [
      { src: '/img/suite/evora-scan.webp', w: 1320, h: 2868 },
      { src: '/img/suite/evora-scan-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/evora-scan-3.webp', w: 1320, h: 2868 },
    ],
  },
  // ——— the four added 12 Aug 2026 ———
  // Every blurb below describes only what its own screenshots show and what
  // the build actually does. NO status here is a guess: each is the state the
  // project is in, and none of them is on a store, so none of them carries an
  // href. See the STATUS note at the top of this file before changing one.
  {
    key: 'lahza',
    name: 'Lahza لحظة',
    tag: 'iOS · Weddings',
    status: 'TestFlight',
    blurb: 'Guests scan one code at the door and every photo they take lands in the couple’s live album — no app store trip, no chasing anyone for pictures afterwards.',
    icon: '/img/apps/lahza-icon.webp',
    kind: 'app',
    grad: ['#f21c8c', '#7b2fbe'],
    bg: '/img/suite/bg/lahza.webp',
    shots: [
      { src: '/img/suite/lahza.webp', w: 1206, h: 2622 },
      { src: '/img/suite/lahza-2.webp', w: 1206, h: 2622 },
      { src: '/img/suite/lahza-3.webp', w: 1206, h: 2622 },
    ],
  },
  {
    key: 'glowbar',
    name: 'Glowbar',
    tag: 'iOS · Beauty studio',
    status: 'Built — not submitted',
    blurb: 'A face-pilates studio in an app — pick a ritual, book the slot, shop the shelf and watch the points add up. Built in French for a Swiss studio.',
    icon: '/img/apps/glowbar-icon.webp',
    kind: 'app',
    grad: ['#ffc740', '#f21c8c'],
    bg: '/img/suite/bg/glowbar.webp',
    shots: [
      { src: '/img/suite/glowbar.webp', w: 1320, h: 2868 },
      { src: '/img/suite/glowbar-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/glowbar-3.webp', w: 1320, h: 2868 },
    ],
  },
  {
    key: 'myfairytrail',
    name: 'My Fairy Trail',
    tag: 'iOS · Travel',
    status: 'Built — not submitted',
    blurb: 'Bespoke Jordan and Egypt itineraries, built around what you actually want out of the week — browse the trails, or answer five questions and get your own.',
    icon: '/img/suite/myfairytrail-icon.webp',
    kind: 'app',
    grad: ['#7b2fbe', '#ffc740'],
    bg: '/img/suite/bg/myfairytrail.webp',
    shots: [
      { src: '/img/suite/myfairytrail.webp', w: 1320, h: 2868 },
      { src: '/img/suite/myfairytrail-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/myfairytrail-3.webp', w: 1320, h: 2868 },
    ],
  },
  {
    key: 'ajniha',
    name: 'AJNIHA',
    tag: 'iOS · Helicopter tours',
    status: 'Built — not submitted',
    // Deliberately says "booking request", not "book": there is no payment
    // processor and no reservation backend behind this app, and the flow it
    // actually ships produces a reference the operator confirms by hand. See
    // the same note in the project itself — mispricing and fake confirmations
    // are the two worst bugs this product can have.
    blurb: 'Every helicopter tour flying over Jordan in one place — the route, the landmarks, the group size and the price, then a booking request straight to the operator.',
    icon: '/img/suite/ajniha-icon.webp',
    kind: 'app',
    grad: ['#ffc740', '#1e3a5f'],
    bg: '/img/suite/bg/ajniha.webp',
    shots: [
      { src: '/img/suite/ajniha.webp', w: 1320, h: 2868 },
      { src: '/img/suite/ajniha-2.webp', w: 1320, h: 2868 },
      { src: '/img/suite/ajniha-3.webp', w: 1320, h: 2868 },
    ],
  },
]
