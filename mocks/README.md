# mocks/ — the source of the app screenshots on the stage

Every `<app-key>-<n>.html` in here is ONE iPhone screen, authored as real
HTML/CSS and rendered to `static/img/suite/<app-key>[-n].webp` by

    node scripts/mockshots.mjs            # all of them
    node scripts/mockshots.mjs lume tarz  # only these keys

Why HTML and not an image model: these are UI screenshots. Generated imagery
garbles interface type — labels, numbers, Arabic — and the stage shows the
screens at a size where that is visible. Rendering the interface is exact,
re-runnable, and free.

## The contract every file must keep

- Standalone. No external CSS, JS, fonts, or images — inline SVG, CSS
  gradients and system fonts only. The renderer loads the file over
  `file://` with no network.
- The page is exactly **540 x 1174 CSS px** (the size of the existing KwaKwa
  captures) and is captured at `deviceScaleFactor: 2`, then written out 720px
  wide. Nothing may overflow that box.
- It draws its own **status bar** — time at the left, the black dynamic-island
  pill centred, wifi + battery at the right — because the existing real
  captures do. The stage's CSS island lands on top of the drawn one.
- Square corners. The stage's `.dv-screen` does the rounding.

`<app-key>-icon.html` is the same deal at **128 x 128** and renders to
`static/img/suite/<app-key>-icon.webp`.

## Which of these are real products

`evora-scan`, `quran-noor` and `kwakwa` are real LOOM apps; their screens here
reproduce the real interface. `lume`, `tarz` and `naqi` are **concepts** — the
interface is invented. `suite.js` carries the status that says so.
