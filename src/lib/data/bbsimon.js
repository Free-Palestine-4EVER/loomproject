/*
  B.B. SIMON — PITCH DEMO DATA
  ============================

  Two of B.B. Simon's real product pages, rebuilt so we can show them what a
  3D preview and an in-room AR try-on would do for a catalogue where every
  piece is a hand-set crystal one-off that nobody can judge from a 600px PNG.

  Sources, scraped 2026-08-18:
    https://bbsimononline.com/product/tb-108-lt-colorado/
    https://bbsimononline.com/product/hh-101/

  EVERY FACT HERE IS THEIRS. Titles, prices, stock counts, the related-product
  rails and the attribute table were read off their own pages, and the prices
  were re-parsed per product card (not as two parallel lists) so a name can
  never end up against its neighbour's figure. Quoting a client their own
  catalogue back at them with a wrong number is the one mistake a pitch does
  not survive. If their catalogue moves, re-scrape — do not hand-edit.

  The prose in `pitch` and `blurb` is OURS. Their pages ship no description at
  all, which is half of why this deck is worth showing them.

  ── The `attrs` / `ar` split, which is the one thing to read before editing ──

  `attrs` is what WooCommerce currently returns: "16 oz", "6 × 6 × 6 in" — on
  BOTH products, a $48,500 dining table and a bust alike. It is placeholder
  data left over from a store template, not a measurement, and it is reproduced
  here verbatim because the demo is a clone of what they ship today.

  `ar.heightM` is what the model is actually built at, and it is a DIFFERENT
  KIND OF CLAIM. AR is only worth having if the thing lands at the size it
  really is, so the GLB and the USDZ both have a real-world scale baked into
  their geometry (model-viewer's `scale` attribute would not do it — Scene
  Viewer and Quick Look read the file's own units, not the page's). Those
  heights are OUR PLAUSIBLE ESTIMATES from the photographs — a dining table at
  standard height, a bust at mantel scale — because their own dimension field
  does not contain a real number to use.

  So `ar.estimated` is true on both, and the page says so on the page, next to
  the AR button. When B.B. Simon send real dimensions, set `heightM`, flip
  `estimated` to false, and re-run scripts/build-bbsimon-assets.sh — the number
  lives in one place on purpose.
*/

const IMG = '/img/bbsimon'
const MODELS = '/models/bbsimon'

export const PRODUCTS = {
  /* ---------------------------------------------------------------- table -- */
  bbsimon1: {
    slug: 'bbsimon1',
    sku: 'TB-108-LT.COLORADO',
    title: 'TB-108-LT.COLORADO',
    price: '$48,500.00',
    stock: '100 in stock',
    breadcrumb: ['Home', 'Home Collection', 'Tables'],
    source: 'https://bbsimononline.com/product/tb-108-lt-colorado/',

    blurb:
      'A round dining table built the way B.B. Simon builds a belt: a scrolled ' +
      'metal frame hand-set with Light Colorado crystal, stone by stone, over a ' +
      'gilded cabriole base.',

    pitch:
      'Six photographs of a mirror-finish object, all lit the same way. Nothing ' +
      'in that gallery tells a buyer how the crystal moves when they walk past ' +
      'it, or whether 53 inches clears their dining room.',

    attrs: [
      ['Weight', '16 oz'],
      ['Dimensions', '6 × 6 × 6 in'],
    ],

    images: [1, 2, 3, 7, 10, 11].map((n) => ({
      src: `${IMG}/products-tb-108-ltcolorado-${n}.png`,
      alt: `TB-108-LT.COLORADO crystal-set dining table, view ${n}`,
    })),

    model: {
      glb: `${MODELS}/tb108-table.glb`,
      usdz: `${MODELS}/tb108-table.usdz`,
      alt: 'Interactive 3D model of the TB-108-LT.COLORADO crystal-set dining table',
      // Framing for the idle orbit. Slightly above eye level so the tabletop
      // reads as a surface rather than as an edge-on ellipse.
      cameraOrbit: '25deg 72deg 2.4m',
      fieldOfView: '32deg',
      poster: `${IMG}/products-tb-108-ltcolorado-1.png`,
    },

    ar: {
      heightM: 0.76, // standard dining height
      estimated: true,
      note: 'Placed at 76 cm high, 135 cm across — standard dining height, scaled from the product photography pending B.B. Simon’s own measurements.',
      placement: 'floor',
    },

    related: [
      { name: 'TB-105-CLEAR', price: '$11,835.00', img: `${IMG}/products-tb-105-clear-1.png` },
      { name: 'TB-101-CLEAR', price: '$16,500.00', img: `${IMG}/products-tb-101-clear-1.png` },
      {
        name: 'TB-106-BLACK DIAMOND-CLEAR B.B.SIMON TABLE',
        price: '$2,420.00',
        img: `${IMG}/products-tb-106-black-diamond-clear-bbsimon-table-1.png`,
      },
      { name: 'TB-102-JET', price: '$18,200.00', img: `${IMG}/products-tb-102-jet-1.png` },
    ],
  },

  /* ----------------------------------------------------------------- bust -- */
  bbsimon2: {
    slug: 'bbsimon2',
    sku: 'HH-101',
    title: 'HH-101',
    price: '$13,090.00',
    stock: '100 in stock',
    breadcrumb: ['Home', 'Home Collection', 'Sculpture'],
    source: 'https://bbsimononline.com/product/hh-101/',

    blurb:
      'A horse’s head in mosaic and crystal — a pale tessellated coat against a ' +
      'mane worked entirely in set stones, standing on a pebbled and beaded plinth.',

    pitch:
      'The whole piece is texture: mosaic against crystal against river stone. ' +
      'That is exactly what a flat product shot flattens, and exactly what a ' +
      'buyer spending $13,090 wants to turn over in their hands first.',

    attrs: [
      ['Weight', '16 oz'],
      ['Dimensions', '6 × 6 × 6 in'],
    ],

    images: [1, 3, 4, 5, 6].map((n) => ({
      src: `${IMG}/products-hh-101-${n}.png`,
      alt: `HH-101 crystal and mosaic horse head sculpture, view ${n}`,
    })),

    model: {
      glb: `${MODELS}/hh101-horse.glb`,
      usdz: `${MODELS}/hh101-horse.usdz`,
      alt: 'Interactive 3D model of the HH-101 crystal and mosaic horse head sculpture',
      cameraOrbit: '-30deg 78deg 1.6m',
      fieldOfView: '30deg',
      poster: `${IMG}/products-hh-101-1.png`,
    },

    ar: {
      heightM: 0.55, // mantel / console scale
      estimated: true,
      note: 'Placed at 55 cm high — console and mantel scale, scaled from the product photography pending B.B. Simon’s own measurements.',
      placement: 'floor',
    },

    related: [
      {
        name: 'CO-201-18 B.B.SIMON COW HEAD',
        price: '$6,380.00',
        img: `${IMG}/products-co-201-18-bbsimon-cow-head-1.png`,
      },
      { name: 'MB-100', price: '$250.00', img: `${IMG}/products-mb-100-1.png` },
      { name: 'SCL-102', price: '$4,000.00', img: `${IMG}/products-scl-102-1.png` },
      { name: 'A-200-27-L B.B.SIMON', price: '$7,790.00', img: `${IMG}/products-a-200-27-l-bbsimon-1.png` },
    ],
  },
}

// The nav on their live store, reproduced so the clone reads as their shop
// rather than as our page. Flat labels only — none of these are wired up, and
// the demo says as much rather than shipping links that go nowhere.
export const BB_NAV = [
  'Belts', 'Accessories', 'Bags', 'Footwear', 'Apparel',
  'Home', 'Pets', 'New', 'Custom', 'Wedding', 'Wholesale',
]
