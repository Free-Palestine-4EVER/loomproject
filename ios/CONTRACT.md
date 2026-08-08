# LOOM for Clients — iOS app build contract

A client-facing iOS app sitting on top of LOOM ENGINE (`../engine`). The client
logs in, sees the month LOOM made for them, approves or rejects it post by post,
sees what the advertising actually delivered, and can ask for changes — in Arabic
or English, on their own phone.

This is the mobile-native replacement for the no-login approval link. **That link
must keep working** — it is what wins clients who will not install an app.

Read `../engine/SPEC.md` for the data model. This file governs the app and the
client-facing API.

---

## THE PRIVACY RULE — the one that must never be broken

The client app may **never** receive, cache, or display any of:

`qaSeconds` · `regenerations` · generation cost · platform cost · operator cost ·
margin · gross · `adSpendJod` · `costJod` · CPC · the creative library ·
`cpcByCategory` · `clientsHeadroom` · `breakEvenClients` · any other client's data

The client sees **what they got and what they owe**. They never see how it was
made, what it cost us, or how much we made. A single leaked field here is a
business-ending screenshot. Every client endpoint must build its response by
**explicitly picking allowed fields** — never by taking a store record and
deleting keys, because the next added field then leaks by default.

Cross-tenant safety: every client route derives `clientId` from the auth token,
**never** from a query parameter or body field. A client asking for another
client's month must get a 404, not that month.

---

## Part 1 — Engine: client auth + client API

New files: `engine/lib/clientauth.mjs`, `engine/lib/clientapi.mjs`. Routes wired
in `engine/server.mjs`. Keep the existing `/a/:token` approval page working and
untouched.

### Auth

Small businesses in Amman do not want passwords. Use a one-time code:

```
POST /api/client/auth/request   { handle }      // @instagram handle, email, or phone
  -> 200 { ok: true, delivery: "operator" }     // ALWAYS 200, even for unknown handles
POST /api/client/auth/verify    { handle, code }
  -> 200 { token, client: <client-safe> }  |  401 { error }
GET  /api/client/me             (Bearer)  -> client-safe client
POST /api/client/auth/logout    (Bearer)  -> revokes the token
```

- `request` must return the same shape and timing for a known and an unknown
  handle — it must not become a way to enumerate LOOM's client list.
- There is no SMS provider. The code is delivered **by the operator**: it appears
  in the operator UI and the server log. Say so plainly in the app's UI
  ("LOOM will send you your code") rather than pretending an SMS was sent.
- Codes: 6 digits, single use, expire in 10 minutes, **max 5 attempts per handle
  per 15 minutes**, then locked out. Store a hash, not the code.
- Tokens: 32-byte random, stored hashed in `engine/data/clienttokens.json`,
  60-day expiry, revocable. Bearer header.

### Client routes (all Bearer, all scoped to the token's client)

```
GET  /api/client/months                  -> [{ month, total, pending, approved, rejected }]
GET  /api/client/months/:month/posts     -> [client-safe post]
POST /api/client/posts/:id/decide        { verdict: "yes"|"no", note } -> updated post
GET  /api/client/performance?month=      -> what the ads delivered (see below)
GET  /api/client/invoices                -> [client-safe invoice]
GET  /api/client/requests                -> [{ id, text, at, from, status }]
POST /api/client/requests                { text } -> created
```

**client-safe post** — exactly these fields, nothing more:
`{ id, month, slot, kind, status, captionEn, captionAr, hashtags, image,
   carousel: { slides }, scheduledAt, postedAt, decision }`

**client-safe invoice**: `{ id, month, lines: [{label, qty, unitJod, totalJod}], totalJod, status, issuedAt }`
Invoice lines are already client-facing wording — but assert no line label leaks
internal cost language.

**performance** — this is where it is easiest to leak. Allowed:
`{ month, conversationsDelivered, billedJod, perConversationJod, byDay: [{date, count}] }`
Forbidden: our spend, our CPC, our margin, the creative that produced them.

`POST /api/client/requests` items must surface in the operator UI so a real
request is not lost. Add them to the operator Roster/Month screen.

### Verification required
A test script `engine/fixtures/clientapi-selftest.mjs` that, at minimum:
- proves an unknown handle and a known handle are indistinguishable from outside,
- proves the attempt limiter locks out,
- proves client A cannot read client B's month, posts, invoices or performance,
  including by passing B's id explicitly in every place an id could be accepted,
- **walks every client endpoint's JSON recursively and fails if any forbidden key
  name from the privacy list appears anywhere in the payload.**
Run it and report real output.

---

## Part 2 — the iOS app

Location: `ios/loom-client/`. Generated with **xcodegen** (`project.yml`), no
CocoaPods, no SPM dependencies — everything hand-rolled. iOS 17+, SwiftUI,
Swift 6. Bundle id `com.loom.client`. Development team `6JW6JNN28V`.

**project.yml must glob directories** (`sources: [Sources, Resources]`) so that
adding a file never requires editing a shared project file — this is what lets
several agents work at once without conflicts. Nobody edits `project.yml` except
the scaffold owner.

### Structure — one owner per folder

```
ios/loom-client/
  project.yml                     scaffold owner only
  Sources/App/                    scaffold owner only (entry point, tab shell, routing)
  Sources/Core/                   scaffold owner only
    Design/      colours, type, spacing, components (LoomButton, LoomCard, StatusChip…)
    Net/         APIClient, endpoints, decoding, error model, offline cache
    Auth/        Keychain token store, session object
    Models/      Codable models mirroring the client-safe shapes above
    I18n/        Strings, language selection, RTL helpers
  Sources/Features/Auth/          feature agent
  Sources/Features/Month/         feature agent  (the core screen)
  Sources/Features/Performance/   feature agent
  Sources/Features/Invoices/      feature agent
  Sources/Features/Requests/      feature agent
  Sources/Features/Settings/      feature agent
  Resources/Fonts/                LOOM Bloom .otf files
  Resources/Assets.xcassets/
```

### The typeface trap — read this twice

**LOOM Bloom is 67 glyphs. It draws no Arabic at all**, and no `→ … × ·`. Using it
as the app font fills the Arabic UI with tofu.

- LOOM Bloom is for **short Latin display text only** — screen titles, numerals,
  the wordmark. Never for body copy, never for any Arabic string.
- Arabic uses the system face (`.system` / SF Arabic), which is excellent.
- Build one `LoomFont` API in Core/Design that **picks the face from the string's
  script and the active language**, so a feature agent cannot accidentally set
  Arabic in Bloom. Make the wrong thing impossible rather than documented.
- Fonts must be listed in `UIAppFonts` in the generated Info.plist, and there must
  be a runtime assertion in debug that each expected family actually registered —
  a silently-missing font is the classic iOS failure.

### Design

Dark, from the site's real tokens (`src/styles.css`):

```
bg #0d0716   bg2 #120a1f   bg3 #1a1029
ink #f2f0f7  inkDim #a89fc0  inkFaint #857c9e
magenta #f21c8c   violet #7b2fbe   gold #ffc740   cyan #59e6ff
line rgba(242,240,247,0.10)   radius 18
```

This is a client-facing product, not an internal tool — it should feel like the
LOOM site: confident, dark, textile-warm, unhurried. Motion is purposeful and
few: a considered transition when a post is approved, nothing that bounces for
its own sake. Respect Reduce Motion. Dynamic Type must not break layouts.

### Bilingual, properly

- Full AR/EN. Arabic is the **default when the phone's locale is Arabic**.
- Real RTL: `environment(\.layoutDirection, .rightToLeft)` at the root, and every
  chevron/arrow/progress direction mirrors. Test both directions on every screen.
- Numbers: Arabic-Indic digits (`٠١٢٣`) in Arabic, Latin in English. Currency is
  `JOD` / `دينار`.
- No string is hardcoded in a view. Everything through `Core/I18n`.

### Screens

1. **Auth** — enter handle → "LOOM will send your code" → 6-digit entry → in.
   Handles a locked-out state and a wrong code with real, kind copy.
2. **Month** (the core) — the month as the client's own grid. Tap a post: big
   image, both captions, carousel swipes through its slides. Approve or ask for a
   change with a note. Progress ("4 of 24 reviewed"). This screen is the reason
   the app exists — it should be the best thing in it.
3. **Performance** — conversations delivered this month, a simple honest by-day
   chart, and what that costs them. No vanity metrics, no invented insight.
4. **Invoices** — months, lines, totals, status. The 100-conversation floor line
   must read clearly, not as a mystery charge.
5. **Requests** — a plain thread to LOOM.
6. **Settings** — language, notifications toggle (local only), sign out, and a
   visible "this is what LOOM can see" honesty note.

### Offline

Amman connections drop. The app must open to the **last cached month** and show a
quiet "showing your last update" state rather than a spinner or an error wall.
Decisions taken offline queue and sync when connectivity returns; a queued
decision must be visibly marked as not-yet-sent, never silently lost.

### Verification required — no agent may claim done without this

- `xcodegen generate` then
  `xcodebuild -scheme LOOMClient -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build`
  succeeds with **zero errors** (warnings reported).
- Boot the simulator, install, launch, and **screenshot every screen in both
  languages**. Look at the screenshots. Arabic screens must show real Arabic, not
  tofu boxes, and must be laid out right-to-left.
- The app must run against a live engine on `http://localhost:4950` and be
  demonstrated doing a real approval that changes the record in the engine.
- Report the actual xcodebuild tail, the screenshot paths, and anything you could
  not verify.

Never claim a build passes without pasting the real result. This project has a
standing rule: verify, then claim.
