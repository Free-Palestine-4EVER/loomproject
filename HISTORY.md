# The night of 8 August 2026 — what got built, and what is actually true

A record of one overnight session: two businesses turned into working software, and
an iOS app for LOOM's clients. Written so none of it has to be re-derived.

The rule throughout: **verified, or labelled unverified.** Where something was only
compiled and never run, this file says so.

---

## What exists now

| Thing | Where | State |
|---|---|---|
| LOOM ENGINE — operator platform | `engine/` | Working, verified end to end |
| Client API + one-time-code auth | `engine/lib/clientapi.mjs`, `clientauth.mjs` | Working, 66 assertions passing |
| LOOM for Clients — iOS app | `ios/loom-client/` | **Compiles and is signed. Never run.** |
| Two offerings on the website | `src/components/TheMachine.jsx`, `ByResult.jsx` | Built, site builds clean |
| Firebase backend | `clients-backend/` (another session) | Written, **never deployed** |

---

## Why any of this exists

Three decks were rejected before the fourth landed. The first two proposed **tools**,
and the note was blunt: boring. The insight that changed it —

> A tool in this market sells for $29/month to people who won't pay $29/month.
> The software isn't the product; it's the **cost structure**. An Amman agency
> delivers social with salaries. Deliver it with machines and you can price where
> nobody can follow you.

That produced two businesses, and everything below is their operating system.

**THE MACHINE** (المصنع) — a content subscription. ~20 posts + 4 reels a month,
bilingual, delivered, from ~89 JOD against a market at 250–600. The whole thing
turns on **one number: QA minutes per client per month.** At 20 minutes it's a 90%
margin business. At 50 it isn't a business. So the app times QA honestly.

**BY RESULT** (بالنتيجة) — results-priced ads. ~1.75 JOD per WhatsApp conversation
delivered, minimum 100. Margin *grows* because cost-per-conversation falls as a
category is learned while the price stays fixed. The creative library is the asset:
a new furniture client starts on the creative that already won for four others.

**Every price and cost in this repo is an assumption**, marked as such and editable
in the UI. The honest first move is still: run five clients manually, let the QA
timer report the real minutes, then decide whether 89 JOD is right or has to be 129.

---

## Verification evidence — the real numbers

**QA timer honesty** (the number the content business rests on). Tested against real
wall-clock, not simulated: 6s focused + 4s blurred + 3s refocused wrote exactly
**9 seconds, not 13**. 65s idle wrote **60, not 65**. It does not inflate.

**Ads model compounding.** Furniture cost-per-conversation across three months:
**2.71 → 2.43 → 1.98 JOD**, falling. `promoteWinner` correctly refused a creative
with the best raw CPC (1.00) on only 10 conversations — no crowning on thin data.

**Billing floor is visible, not hidden.** 55 conversations bills as
`96.25 + 78.75 top-up` on its own line, never folded into the delivered count.

**Client privacy: 66 assertions, 0 failures.** The result means something because
the suite has **negative controls** — it plants a poisoned invoice carrying
`grossJod`/`generationCostJod`/`spendJod` and proves the scanner catches them. So
"26 forbidden keys absent from every client payload" is a working detector, not a
test that always passes. Cross-tenant reads 404. Unknown and known handles are
indistinguishable from outside.

**Seed data honestly shows a loss.** Ads gross runs **−1.16 JOD, −2.29% margin** at
CPC 1.79 against a 1.75 price. That is the instrument being truthful: month one on
cold creative loses money, and the model only works once the category is learned.

---

## Decisions, and why

**The engine is operator-only, like `studio/`.** The site is a no-backend Vite SPA
where `dist/` is the whole deliverable, so a server cannot ship with it.

**Storage is plain JSON files, zero new dependencies.** Also dodges the two Firebase
traps this account has hit before (Firestore resolving empty from cache offline, and
Auth silently never enabled).

**Text generation shells out to the local `claude` CLI.** No API key, no per-token
cost. Degrades to clearly-labelled placeholders if the CLI is missing rather than
failing a demo.

**The client approval page has no login, on purpose.** It opens from a WhatsApp link
on a phone. Adding auth would kill the thing that makes it work. The iOS app is the
*addition*, not the replacement.

**Client responses pick allowed fields explicitly.** Never "record minus keys" —
that leaks by default the moment someone adds a field.

**App Store: advised against, then corrected.** The initial recommendation was
TestFlight (login-gated B2B app, and this account already took a 4.3(a) spam
rejection). The user pushed back — Wix ships a client-portal app; one app unlike the
other four is not 4.3 spam. **They were right**; 4.3(a) is about many similar apps
from one developer. Target is the public App Store. Standing instruction as of
tonight: **publish nothing until they inspect every app personally.** Nothing was
submitted, uploaded, or given an ASC record.

---

## Traps found (each cost real time)

**Generated images were never saved.** The month job hardcoded `image: null`, so the
entire image-composition pipeline was dead on arrival while every check passed.

**Images could never display.** Paths were absolute filesystem paths rendered as
`<img src="/Users/…">`, with no `/media` route. The UI's `onerror` handlers
*disguised* the failure as a benign "no image". Fixed with portable `/media/...`
URLs and a real route, verified by fetching actual PNG bytes over HTTP.

**Woven artwork wired to nothing.** The design pass generated `EmptyWoven` and
`ErrorWoven`, added an `imageName:` parameter to display them — and passed it at
**zero** call sites. Every screen fell through to a generic SF Symbol. With no
backend, that glyph was the first thing a user would see. Now wired across Month,
Performance, Invoices and Requests. Deliberately *not* in Settings, whose ErrorState
is a small inline "notifications denied" row where a 64px graphic would be worse.

**Successful logins could lock you out.** The rate limiter counted every attempt, so
the **6th correct sign-in inside 15 minutes was refused** — proven, then fixed to
count only failures. Brute force still locks after 5 wrong guesses, and a success
does not launder accumulated failures (both proven). This also rescues the App Store
demo account, which a reviewer would otherwise lock on the 6th try.

**A handle-enumeration timing oracle.** `findClientByHandle` used `.find()`, which
short-circuits on a match — so a known handle returned early while an unknown one
scanned every client. Measurable, and it widens as the client list grows. Now scans
fully either way.

**A flaky privacy test.** It compared *mean* timings over 25 trials with a 10ms
threshold; one GC pause during a concurrent Xcode build blew it up. Now uses the
**median** with a warmup — 25/25 passes under the same load. The threshold was
deliberately *not* widened: loose enough to never flake is loose enough to miss a
real oracle. A first attempt at a ratio check was one-directional and read "fine"
while the gap was 4x the other way; it is now symmetric and only asserts above a
1ms noise floor.

**`sharp`/librsvg mangles Arabic.** Setting `direction="rtl"` with
`text-anchor="end"` pushes most of the string off canvas. Omit `direction` and let
HarfBuzz shape it.

**LOOM Bloom is 67 Latin glyphs and draws no Arabic.** Using it as the app font
fills the Arabic UI with tofu. The font API picks the face from the script, so the
wrong thing is impossible rather than documented.

**SourceKit diagnostics are noise here.** It analyses files standalone without
module context and reports every cross-file symbol as missing. Hundreds were
phantom; exactly one was real. Only `xcodebuild` is authoritative.

**The repo is a symlink.** `~/Desktop/dev/LOOM/loom-agency` → `~/Desktop/LOOM PROJECT`,
same inode. Paths resolve to the second, which looks alarming and is fine.

---

## The pattern worth remembering

Three times tonight, **a capability was built and nobody connected it**: images
generated but not persisted, images persisted but not servable, artwork drawn but
not wired. Each passed every "build succeeded" check, because each piece was correct
in isolation.

When work is split across parallel agents, **every agent verifies its own half
honestly and the seam between them is where the bugs live.** Audit seams, not pieces.

---

## What is NOT verified — read this before trusting anything visual

- **The iOS app has never run.** Not once, on any device or simulator. It compiles
  clean and is signed (`com.loom.client`, team `6JW6JNN28V`, embedded profile), but
  the iPhone 14 Pro was paired-but-not-attached all night
  (`tunnelState: unavailable`, last connection 05:42), so it could not be installed.
  Every claim about how it *looks or behaves* is unproven.
- **No screenshots exist of the app.** This machine has no way to capture a physical
  device screen — `devicectl` has no screenshot verb, `idevicescreenshot` isn't
  installed, and simulators were banned for disk. QuickTime mirroring needs a wired
  phone, and there wasn't one.
- **Firebase was never deployed**, so the app has no reachable backend and will open
  to its offline state.
- **The engine's own UI** was verified by the agent that built it, including a real
  QA-timer test; I re-verified the API, the economics arithmetic and the privacy
  suite myself, but not every operator screen by eye.
- **Every price, cost and margin** in the system is an assumption.

To install: plug the phone in, unlock it, run `ios/loom-client/install-on-phone.sh`.
No Apple password needed — signing already succeeded.
