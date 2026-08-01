# LOOM Campaign Prompt Packs — Master Index

Four QA'd image-generation prompt packs for the LOOM brand, ready for Nano Banana / Nano Banana Pro
generation via the Higgsfield MCP. Every pack was validated for JSON integrity, prompt uniqueness,
and forbidden/trademarked terms — see [QA status](#qa-status) below.

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

### 2. UI/UX Website Elements
- **Slug:** `ui-ux-website-elements`
- **Concept:** Buttons, toggles, cards, navigation, modals and other interface components rendered
  in the woven-thread brand language, for use as design-system reference art on the LOOM site.
- **Prompt count:** 300
- **JSON:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/ui-ux-website-elements.json`
- **MD:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/ui-ux-website-elements.md`
- **Reference images:** none required — original UI concept art.

### 3. Icon & Glyph Sets
- **Slug:** `icon-and-glyph-sets`
- **Concept:** Service icons, industry-niche icon grids, app/tool glyphs and utility UI icons, all
  embroidered from brand-colored thread for consistent iconography across the site.
- **Prompt count:** 300
- **JSON:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/icon-and-glyph-sets.json`
- **MD:** `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/icon-and-glyph-sets.md`
- **Reference images:** none required — original icon art.

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

## Grand total

**1,200 prompts** across all 4 packs (300 each).

## QA status

Each JSON was parsed and checked against the full 300-prompt set:

| Pack | Valid JSON | Prompt count | Unique | Forbidden studio/franchise terms | Trademark client names |
|---|---|---|---|---|---|
| mascot-character-sheets | pass | 300 | 300/300 unique | 0 hits | 0 hits |
| ui-ux-website-elements | pass | 300 | 300/300 unique | 0 hits | 0 hits |
| icon-and-glyph-sets | pass | 300 | 300/300 unique | 0 hits | 0 hits |
| brand-key-visuals-and-worlds | pass | 300 | 300/300 unique | 0 hits | 0 hits |

Forbidden-term scan covered (case-insensitive, whole-word/phrase): pixar, disney, dreamworks,
illumination, ghibli, marvel, nintendo, warner, sony pictures, sanrio, hello kitty, hasbro, lego.
Trademark scan covered: Benetton, UNICEF, Vodafone, MAC, Max Factor, Espresso Lab. No occurrences
of any of these terms were found in any prompt string, so no edits were required in this QA pass.

## How to generate

- **Model:** Nano Banana (1 credit/image) or Nano Banana Pro (2 credits/image at 1k/2k resolution).
  Pick Pro when a scene needs sharper detail or a larger canvas (key visuals, hero shots); Nano
  Banana is fine for most icon/UI/mascot sheets.
- **Tool:** Higgsfield MCP `generate_image`. Any prompt that lists `references` must first have
  each reference file uploaded via `media_upload`/`media_confirm` to get a `media_id` — set
  `medias[].value` to that uploaded **media_id**, never a raw file path or URL. Set each media's
  `role` from the chosen model's `medias.roles` (check via `models_explore` / the model's schema
  before the first call in a session).
- **Batching:** Generate in batches of up to 4 images at a time using the `count` param on
  `generate_image`. Do not submit more than 4 per call.
- **Resume protocol:** After each successful batch, append the completed prompt `id`s (from the
  `id` field on each prompt object, e.g. `mascot-character-sheets-000`) to
  `/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/progress.json`. Before starting or
  resuming a run, read `progress.json` first and skip any `id` already recorded there, so a
  restarted session picks up exactly where the last one left off instead of re-spending credits.
  Suggested shape for `progress.json`:

  ```json
  {
    "mascot-character-sheets": ["mascot-character-sheets-000", "mascot-character-sheets-001"],
    "ui-ux-website-elements": [],
    "icon-and-glyph-sets": [],
    "brand-key-visuals-and-worlds": []
  }
  ```

- **Credits reminder:** this README and the underlying prompt packs are text-only artifacts — no
  image generation or credit spend happens until `generate_image` is actually invoked against
  these prompts.
