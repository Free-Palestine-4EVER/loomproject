# LOOM ENGINE — build contract

The operating system for two LOOM businesses:

1. **THE MACHINE** (`المصنع`) — a content subscription. 89 JOD/month per client for
   ~20 posts + 4 reels, bilingual, delivered. Margin comes from machines doing the
   work and one operator doing QA. **The number that decides the business is QA
   minutes per client per month** — the whole app exists to drive it down and to
   measure it honestly.
2. **BY RESULT** (`بالنتيجة`) — results-priced ads. 1.75 JOD per WhatsApp
   conversation delivered. Margin comes from cost-per-conversation falling as the
   category is learned, while the price stays fixed. **The asset is the category
   creative library** — a new client in a known category starts on the winning
   creative instead of from zero.

## Hard rules — all agents

- Node: `export PATH="$HOME/.local/node/bin:$PATH"` first, every shell. Node 24.
- **Do not `npm install` anything.** Available already: `sharp`, `playwright`,
  `ffmpeg-static` (devDeps) and Node builtins. Everything else is hand-rolled.
- The engine is **dev/operator-only**, exactly like `studio/`. It must never end up
  in `dist/` and must never be imported by `src/`.
- Storage is **JSON files under `engine/data/`**, one file per collection, written
  atomically (write to `.tmp` then `rename`). No database, no cloud, no env vars
  required to boot.
- All money is **JOD**, stored as numbers with 2 decimals. Never format money in
  the data layer; format at the edge.
- All dates are ISO-8601 strings, UTC. Month keys are `"2026-08"`.
- Arabic is a first-class citizen, never a translation of the English. Any record
  holding copy holds `*Ar` and `*En` as peers.
- Every file you create gets a one-line header comment saying what it is.

## Money constants — `engine/lib/pricing.mjs` (agent A owns)

```
CONTENT_PRICE_JOD        = 89.00   // per client per month
PER_CONVERSATION_JOD     = 1.75    // what we bill
CONVERSATION_MINIMUM     = 100     // per client per month
OPERATOR_COST_PER_MIN    = 0.195   // 700 JOD salary / (30 d * ~2h/d) — assumption
GENERATION_COST_JOD      = 4.20    // per client per month, assumption
PLATFORM_COST_JOD        = 1.10    // scheduling/storage/API, assumption
COMMISSION_RATE          = 0.02    // reserved, not built yet
```

These are **assumptions and must be editable in the UI**, surfaced as such. Never
present them to the operator as facts.

## Data model — `engine/data/*.json`

Each file is `{ "items": [...] }`. Ids are `crypto.randomUUID()`.

**clients.json**
```
{ id, name, nameAr, handle, category, city,
  brand: { colors: [hex], voiceEn, voiceAr, fontHint },
  plan:  { content: bool, ads: bool },
  price: { contentJod, perConversationJod },   // overridable per client
  createdAt, archivedAt|null }
```
`category` is the join key for the ads creative library — lowercase slug
(`furniture`, `restaurant`, `clinic`, `retail`).

**products.json** — `{ id, clientId, nameEn, nameAr, priceJod|null, photos: [path], notes }`

**posts.json**
```
{ id, clientId, month, slot,               // slot = 1..24 ordering within the month
  kind: "single"|"carousel"|"reel",
  status: "draft"|"qa"|"approved"|"rejected"|"scheduled"|"posted",
  captionEn, captionAr, hashtags: [],
  image: path|null,                         // single/reel cover
  carousel: { boardPath, cuts: [number], slides: [path] } | null,
  scheduledAt|null, postedAt|null,
  qaSeconds: number,                        // accumulated, drives the economics
  regenerations: number,
  rejectionNote|null, createdAt }
```

**approvals.json** — `{ token, clientId, month, createdAt, expiresAt, decisions: [{postId, verdict:"yes"|"no", note, at}] }`
Token is a 22-char urlsafe random string. The approval page needs **no login** —
that is the product decision, do not add one.

**creatives.json** (ads)
```
{ id, category, headlineEn, headlineAr, bodyEn, bodyAr, imagePath|null,
  stats: { spendJod, conversations }, // cpc derived, never stored
  status: "testing"|"winner"|"retired", clientIdOrigin, createdAt }
```

**campaigns.json** — `{ id, clientId, creativeId, startedAt, endedAt|null, status:"live"|"paused"|"ended", budgetJod }`

**conversations.json** — `{ id, clientId, campaignId|null, at, source:"whatsapp"|"dm"|"comment", costJod, billedJod, note }`
`costJod` is our ad spend attributed to it; `billedJod` is what the client owes.

**invoices.json** — `{ id, clientId, month, lines: [{label, qty, unitJod, totalJod}], totalJod, status:"draft"|"sent"|"paid", issuedAt }`

**settings.json** — `{ pricing: {...overrides}, operatorName, updatedAt }`

## HTTP API — `engine/server.mjs` (agent A owns)

Plain `node:http`, no framework. JSON in, JSON out. Port **4950**
(`--port` to override). Serves the operator UI from `engine/ui/` as static files.

```
GET    /api/health                  -> { ok, version, counts }
GET    /api/clients                 -> { items }
POST   /api/clients                 -> created client
PATCH  /api/clients/:id
DELETE /api/clients/:id             -> soft archive

GET    /api/products?clientId=
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id

GET    /api/posts?clientId=&month=&status=
POST   /api/posts                   -> manual post
PATCH  /api/posts/:id               -> status, captions, schedule, qaSeconds (+=)
DELETE /api/posts/:id
POST   /api/posts/:id/regenerate    -> body { what: "caption"|"image"|"all", note }

POST   /api/generate/month          -> body { clientId, month, counts:{single,carousel,reel} }
                                       kicks a job, returns { jobId }
GET    /api/jobs/:id                -> { id, state, progress, log[], result }

POST   /api/carousel/cut            -> body { boardPath, cuts:[0..1 fractions], clientId }
                                    -> { slides: [path] }

POST   /api/approvals               -> body { clientId, month } -> { token, url }
GET    /api/approvals/:token        -> client-safe payload (no costs, no internals)
POST   /api/approvals/:token/decide -> body { postId, verdict, note }

GET    /api/creatives?category=
POST   /api/creatives
PATCH  /api/creatives/:id
GET    /api/creatives/best?category= -> the current winner for a category

GET    /api/campaigns?clientId=
POST   /api/campaigns
PATCH  /api/campaigns/:id

GET    /api/conversations?clientId=&month=
POST   /api/conversations           -> single manual entry
POST   /api/conversations/import    -> body { clientId, csv } (Meta export paste)

GET    /api/invoices?month=
POST   /api/invoices/generate       -> body { month } -> invoices for every active client
PATCH  /api/invoices/:id

GET    /api/ops?month=              -> the economics snapshot (see below)
GET    /api/settings  |  PATCH /api/settings
```

Errors: `{ error: { code, message } }` with a real status code. Never 200-with-error.

## The economics snapshot — `GET /api/ops`

This is the screen that tells the operator whether the business works. Computed,
never stored:

```
{ month,
  content: { clients, revenueJod, generationCostJod, platformCostJod,
             qaMinutesTotal, qaCostJod, grossJod, marginPct,
             qaMinutesPerClient, breakEvenClients },
  ads:     { clients, conversations, revenueJod, adSpendJod, grossJod, marginPct,
             cpcJod, cpcByCategory: { [cat]: jod } },
  total:   { revenueJod, costJod, grossJod, marginPct },
  capacity:{ qaMinutesUsed, qaMinutesAvailable, clientsHeadroom } }
```

`breakEvenClients` = ceil(fixedMonthlyCost / contentGrossPerClient).
`clientsHeadroom` uses observed QA minutes/client against an operator's available
minutes — if QA per client is drifting up, this number falls, and that is the
single most important early warning in the business. Surface it prominently.

## Generation — `engine/lib/generate.mjs` (agent B owns)

Text goes through the **local `claude` CLI**, never an API key:

```
claude -p "<prompt>" --output-format json
```

Spawn via `node:child_process.execFile`, 120s timeout, and **always** handle the
case where `claude` is missing or errors — fall back to a clearly-labelled
placeholder so the app never hard-fails in a demo. Log the failure to the job log.

Rules for generated copy:
- Arabic is written natively for the Jordanian market, not translated. No MSA
  stiffness in captions, no invented product facts, no prices unless the product
  record has one.
- Never write claims the client did not supply (no "best in Jordan", no awards).
- English is a peer caption, not a translation of the Arabic.

Images: composite locally with `sharp` from the client's own product photos plus
brand colours — a real, honest pipeline (crop, colour-wash, text plate). If a
client has no photos, generate a typographic post instead. **Do not fake an image
model.** If nothing can be made, mark the post `draft` with a reason.

## Carousel cutter — `engine/lib/carousel.mjs` (agent B owns)

One wide board in, N slides out. This is the idea that a carousel is a camera pan,
not a slideshow:
- Board is `1080*N × 1350`. Cuts are fractions 0..1 along the width.
- Slice with `sharp.extract`, export 4:5 slides.
- **Seam safety**: given text boxes (`{x,y,w,h}` in board space), a cut that lands
  inside one is illegal — snap to the nearest legal gutter and report the shift.
  Return `{ slides, adjustedCuts, warnings[] }`.

## Operator UI — `engine/ui/` (agent C owns)

Plain HTML/CSS/ES modules, no build step, no framework, no CDN. Served by
`server.mjs`. Screens:

- **Roster** — clients, plan chips, this month's progress ring, QA minutes to date.
- **Month** — generate a month, watch the job log, grid of posts.
- **QA queue** — the money screen. One post at a time, big. Approve / regenerate /
  edit caption. **A timer runs while a post is open and is written back as
  `qaSeconds`** — this is how the business measures itself, so it must be honest:
  pause on blur, stop on idle > 60s.
- **Grid planner** — the 3-wide feed as the client will see it, drag to reorder,
  posting times derived from position.
- **Approval** — generate the link, copy a WhatsApp-ready message, watch decisions
  land.
- **Ads** — campaigns, conversation ledger, CPC by category, creative library with
  the current winner per category.
- **Money** — invoices for the month, and the `/api/ops` snapshot rendered as the
  real unit economics, with every assumption editable inline and visibly marked as
  an assumption.

Visual language: this is a LOOM internal tool, dark, monospace labels, tabular
numerals for every figure, no emoji. Match the site's palette:
`--ground:#130A1B --panel:#1D1027 --line:#3A2449 --ink:#F4EAF8 --muted:#A084B4
--accent:#FF3D9A --thread:#E3BC72`. Keyboard-first where it matters (QA queue:
`a` approve, `r` regenerate, `j/k` move).

## Client approval page — `engine/ui/approve.html` (agent C owns)

Opens from the token link on a phone, no login. Shows the month as a grid, tap a
post to see it big, ✓ or ✗ with an optional note. Bilingual, RTL when Arabic.
Shows **nothing** about cost, margin, or how the content was made.

## Ads module — `engine/lib/ads.mjs` (agent D owns)

- CSV import accepts a pasted Meta Ads export. Be liberal: detect the delimiter,
  match columns case-insensitively on likely names (`Messaging conversations
  started`, `Amount spent`, `Reporting starts`, `Campaign name`), and report what
  it mapped rather than guessing silently.
- `cpc(categoryOrClient, window)` — cost per conversation over a window.
- `learningCurve(category)` — CPC by month for the category, which is the proof
  the model works; it should visibly fall.
- `promoteWinner(category)` — the creative with the lowest CPC over ≥ 50
  conversations becomes `winner`; everything else in that category with ≥ 50
  conversations and worse CPC becomes `retired`. Never promote on thin data.
- `billing(clientId, month)` — conversations × price, floored at the minimum,
  returns invoice lines.

## Marketing surfaces on the site — `src/` (agent E owns)

Two new sections on the LOOM long page presenting these as offerings. Content
lives in `src/data/`, components in `src/components/`, mounted in
`src/components/Sections.jsx`. Follow the existing section conventions exactly —
read two neighbouring sections before writing one. Motion via the existing
`src/lib/motion.jsx` primitives only.

**Never state a price on the site as a promise.** Show the shape of the pricing
("from 89 JOD"), because the numbers in this spec are assumptions.

## What "done" means

- `npm run engine` boots on 4950 with an empty store and no crash.
- Seed data for **one** believable client exists so the UI is never empty on first
  run (`engine/seed.mjs`, run explicitly, clearly marked as demo data).
- Every route in this file exists and returns the documented shape.
- The QA timer actually writes `qaSeconds`, and `/api/ops` reflects it.
- `npm run build` still succeeds and `dist/` contains no engine code.
