# LOOM Campaign Prompt Packs — Master Index

Four QA'd image-generation prompt packs for the LOOM brand, ready for Nano Banana Pro generation
via Higgsfield. Every pack was validated for JSON integrity, prompt uniqueness, and
forbidden/trademarked terms — see [QA status](#qa-status) below.

## Packs

### 1. Mascot Character Sheets
- **Slug:** `mascot-character-sheets`
- **Concept:** Turnarounds, expression grids, action poses and group scenes for the four LOOM
  mascots (Spooly, Flick, Nexo, Prism), for consistent use across the site and marketing.
- **Prompt count:** 300
- **JSON:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/mascot-character-sheets.json`
- **MD:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/mascot-character-sheets.md`
- **Reference images:** `lineup.webp`, `spooly.webp`, `flick.webp`, `nexo.webp`, `prism.webp`
  (in `public/img/crew/`) — attach the mascot(s) relevant to each scene.
- **Brand-marked:** yes — every prompt carries the LOOM wordmark instruction.

### 2. UI/UX Website Elements
- **Slug:** `ui-ux-website-elements`
- **Concept:** Buttons, toggles, cards, navigation, modals and other interface components rendered
  in the woven-thread brand language, for use as design-system reference art on the LOOM site.
- **Prompt count:** 300
- **JSON:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/ui-ux-website-elements.json`
- **MD:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/ui-ux-website-elements.md`
- **Reference images:** none required — original UI concept art.
- **Brand-marked:** yes — every prompt carries the LOOM wordmark instruction (plus in-scene
  button/label text), which is why this pack especially needs Nano Banana Pro's text rendering.

### 3. Icon & Glyph Sets
- **Slug:** `icon-and-glyph-sets`
- **Concept:** Service icons, industry-niche icon grids, app/tool glyphs and utility UI icons, all
  embroidered from brand-colored thread for consistent iconography across the site.
- **Prompt count:** 300
- **JSON:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/icon-and-glyph-sets.json`
- **MD:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/icon-and-glyph-sets.md`
- **Reference images:** none required — original icon art.
- **Brand-marked:** no — icons intentionally stay textless/logo-free (small functional glyphs, not
  brand key art), so this pack does not carry the LOOM wordmark sentence.

### 4. Brand Key Visuals & Worlds
- **Slug:** `brand-key-visuals-and-worlds`
- **Concept:** Environment shots, abstract textures, OOH mockups, social templates and
  studio-culture vignettes establishing the LOOM visual world for hero sections, social content
  and pitch decks.
- **Prompt count:** 300
- **JSON:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/brand-key-visuals-and-worlds.json`
- **MD:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/brand-key-visuals-and-worlds.md`
- **Reference images:** most scenes need none. The one mascot scene (city-street composite) uses
  `lineup.webp` + `nexo.webp`.
- **Brand-marked:** yes — every prompt carries the LOOM wordmark instruction.

## Grand total

**1,200 prompts** across all 4 packs (300 each).

## QA status

Each JSON was parsed and checked against the full 300-prompt set:

| Pack | Valid JSON | Prompt count | Unique | Forbidden studio/franchise terms | Trademark client names | LOOM brand-mark sentence |
|---|---|---|---|---|---|---|
| mascot-character-sheets | pass | 300 | 300/300 unique | 0 hits | 0 hits | 300/300 present |
| ui-ux-website-elements | pass | 300 | 300/300 unique | 0 hits | 0 hits | 300/300 present |
| icon-and-glyph-sets | pass | 300 | 300/300 unique | 0 hits | 0 hits | n/a (textless by design) |
| brand-key-visuals-and-worlds | pass | 300 | 300/300 unique | 0 hits | 0 hits | 300/300 present |

Forbidden-term scan covered (case-insensitive, whole-word/phrase): pixar, disney, dreamworks,
illumination, ghibli, marvel, nintendo, warner, sony pictures, sanrio, hello kitty, hasbro, lego.
Trademark scan covered: Benetton, UNICEF, Vodafone, MAC, Max Factor, Espresso Lab. No occurrences
of any of these terms were found in any prompt string, so no edits were required in this QA pass.
The three brand-marked packs (mascot-character-sheets, ui-ux-website-elements,
brand-key-visuals-and-worlds) were also checked for the LOOM wordmark instruction sentence on
every prompt — all 900 already had it, so nothing needed to be appended.

## How to generate

- **Model: Nano Banana Pro.** Use Nano Banana Pro for all four packs — it has the best
  text-rendering quality of the available models, and that quality is required for the LOOM
  wordmark, in-scene product labels, and UI button text (e.g. "Start weaving") to render as sharp,
  correctly spelled text instead of garbled glyphs. Do **not** use base Nano Banana for the
  brand-marked campaigns (mascot-character-sheets, ui-ux-website-elements,
  brand-key-visuals-and-worlds) — its text rendering is meaningfully less reliable and will produce
  misspelled or illegible wordmarks/labels. icon-and-glyph-sets is textless by design, but staying
  on Nano Banana Pro for all four packs keeps output quality consistent across the whole brand set.

- **Primary path — Higgsfield web app "Unlimited" toggle (free, no credits).** The Higgsfield
  **web app** Image creation panel (not just the MCP tool) has its own "Unlimited" toggle sitting
  next to the model / aspect-ratio / resolution controls. Switching it on makes generation free —
  it does not consume credits or count against the paid balance. Constraints:
  - Only **one** Unlimited generation runs at a time (no parallel unlimited jobs).
  - Batches of up to 4 images per call must still be **submitted and waited on sequentially** — do
    not fire off multiple batches concurrently expecting them to run in parallel; submit a batch,
    wait for it to finish, then submit the next.
  - This is the preferred path for burning through all 1,200 prompts in this pack set, since it
    avoids spending credits entirely.

- **Fallback path — Higgsfield MCP `generate_image` (spends credits intentionally).** Use this
  when credits are deliberately being spent (e.g. no web-app access in the current session, or a
  final high-priority batch that needs the paid pipeline). Key details:
  - Any prompt that lists `references` must first have each reference file uploaded via
    `media_upload` / `media_confirm` to obtain a `media_id`.
  - Set `medias[].value` to that uploaded **`media_id`** — never a raw file path or a URL.
  - Set each media's `role` from the chosen model's `medias.roles` (check via `models_explore` or
    the model's schema before the first call in a session — roles vary by model).
  - Generate in batches of up to 4 images at a time using the `count` param on `generate_image`.
    Do not submit more than 4 per call.

- **Resume protocol.** After each successful batch (either path), append the completed prompt
  `id`s (from the `id` field on each prompt object, e.g. `mascot-character-sheets-000`) to
  `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/progress.json`. Before starting or
  resuming a run, read `progress.json` first and skip any `id` already recorded there, so a
  restarted session picks up exactly where the last one left off instead of re-generating or
  re-spending credits on completed work. Suggested shape for `progress.json`:

  ```json
  {
    "mascot-character-sheets": ["mascot-character-sheets-000", "mascot-character-sheets-001"],
    "ui-ux-website-elements": [],
    "icon-and-glyph-sets": [],
    "brand-key-visuals-and-worlds": []
  }
  ```

  If `progress.json` does not exist yet, create it with all four slugs mapped to empty arrays
  before the first batch of a run.

- **Credits reminder:** this README and the underlying prompt packs are text-only artifacts — no
  image generation or credit spend happens until `generate_image` (or the web app's generate
  action) is actually invoked against these prompts.
