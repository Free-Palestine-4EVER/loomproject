// ————————————————————————————————————————————————————————
// What LOOM has built for itself — apps and software, ONE list.
//
// This replaced two sections (AppsShowcase's seven app cards and ToolsLab's
// lab tools) with six, at the client's instruction on 10 Aug 2026. The old
// pair was the heaviest run on the page: dozens of images plus AppScreens'
// live animated device mockups, all of it painting whether or not anybody
// scrolled to it.
//
// STATUS IS NOT DECORATION. Only ONE of these is downloadable by a stranger
// today — Quran Noor, verified against the iTunes lookup API. KwaKwa is
// TestFlight, Ellie is submitted and waiting on review, Evora Scan is built
// and blocked on a DNS record, and 2D3D and KUN are internal tools with no
// public build at all. `status` says which, and `href` exists ONLY where a
// link actually resolves — a store badge that 404s costs more trust than the
// badge ever earned. If one of these goes live, add its href here and nowhere
// else; the component renders a link only when it finds one.
//
// `fit` is a layout fact, not a preference: the phone captures are tall
// portraits and the desktop tools are wide landscapes, so they cannot share
// one object-fit. Portraits are contained on the plate's gradient; landscapes
// cover it.
// ————————————————————————————————————————————————————————

export const SUITE = [
  {
    key: 'evora-scan',
    name: 'Evora Scan',
    tag: 'iOS · LiDAR & AR',
    status: 'Built — in review',
    blurb: 'Point a phone at a room and walk out with a 3D model, a measured floor plan and walk-in AR. Built on the iPhone’s own LiDAR.',
    art: '/img/suite/evora-scan.webp',
    icon: '/img/suite/evora-scan-icon.webp',
    fit: 'contain',
    grad: ['#59e6ff', '#7b2fbe'],
  },
  {
    key: '2d3d',
    name: '2D3D',
    tag: 'Web · Floor plans',
    status: 'In the lab',
    blurb: 'Drop in a flat floor plan and it reads the walls, finds the rooms and stands the whole thing up in 3D — furniture placed, no drawing by hand.',
    art: '/img/suite/2d3d.webp',
    fit: 'cover',
    grad: ['#f21c8c', '#59e6ff'],
  },
  {
    key: 'quran-noor',
    name: 'Quran Noor',
    tag: 'iOS · Read & listen',
    status: 'On the App Store',
    href: 'https://apps.apple.com/jo/app/quran-noor-read-listen/id6791463100',
    blurb: 'The full mushaf in Uthmani script with translation, transliteration and recitation — plus prayer times and qibla, offline anywhere in the world.',
    art: '/img/suite/quran-noor.webp',
    icon: '/img/suite/quran-noor-icon.webp',
    fit: 'contain',
    grad: ['#ffc740', '#2e7d5b'],
  },
  {
    key: 'kun',
    name: 'KUN',
    tag: 'Software · Generative 3D',
    status: 'In the lab',
    blurb: 'Describe a scene and watch it assemble. A conversational 3D studio — say what you want in the room and the room builds itself.',
    art: '/img/suite/kun.webp',
    fit: 'cover',
    grad: ['#f21c8c', '#7b2fbe'],
  },
  {
    key: 'kwakwa',
    name: 'KwaKwa',
    tag: 'iOS · Couples',
    status: 'TestFlight',
    blurb: 'A private little world for two — messages, voice quacks and a duck that reacts to both of you. Silly on purpose, and used daily.',
    art: '/img/suite/kwakwa.webp',
    icon: '/img/suite/kwakwa-icon.webp',
    fit: 'contain',
    grad: ['#ffc740', '#f21c8c'],
  },
  {
    key: 'ellie',
    name: 'Ellie لُبّ',
    tag: 'iOS · Pet passport',
    status: 'Submitted',
    blurb: 'Every pet’s papers in one place — vaccinations, weight, family tree and an NFC tag on the collar that opens the whole passport on a stranger’s phone.',
    art: '/img/suite/ellie.webp',
    icon: '/img/suite/ellie-icon.webp',
    fit: 'contain',
    grad: ['#7b2fbe', '#f21c8c'],
  },
]
