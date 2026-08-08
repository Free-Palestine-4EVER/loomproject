# LOOM — session history & memory

Night of **2026-08-08**. Written by the coordinating Claude session that watched the
other sessions while Zeid slept. This is the handover: what exists, what was decided,
what is still broken, and the things that will cost someone hours if they don't know them.

---

## The five apps

| App | Path | Kind | State |
|---|---|---|---|
| **LOOM for Clients** | `~/Desktop/LOOM PROJECT/ios/loom-client` | iOS | features building; foundations verified |
| LOOMSHARE | `~/Desktop/dev/LOOM/apps-rail/loomshare` | web (WebRTC P2P) | **F0 defect open — see below** |
| PARALLAX | `~/Desktop/dev/LOOM/apps-rail/parallax` | iOS | only app independently verified |
| SOLID | `~/Desktop/dev/LOOM/apps-rail/solid` | iOS | claimed clean, unverified |
| SNAPVAULT | `~/Desktop/dev/LOOM/apps-rail/snapvault` | iOS | claimed clean, unverified |

The four rail apps come from `~/Desktop/LOOM-4-APPS-ULTRACODE.md` and share a locked
design system, **SELVAGE**, documented in `apps-rail/_handover/`.

**LOOM for Clients is the important one.** It is the app for the pay-per-lead /
20-posts-a-month clients, and it is the only one with a backend.

---

## Decisions Zeid made this session

1. **Backend is Firebase.** Project `loom-clients` created 2026-08-08.
2. **Physical device only — the iPhone 14 Pro.** No simulators. RAM and disk.
   `id=2F962560-17B6-5C0E-B079-B97369FBFC55` (iPhone15,2).
3. **Public App Store** for LOOM for Clients — *not* TestFlight. He pushed back on the
   spam framing and was right; see "Corrections" below.
4. **PUBLISH NOTHING** until he has personally inspected every app. Standing rule.
   Build, archive, sign, install to his phone — yes. Ship — no.
5. **Submission order: decide later.** Don't plan one.

---

## Corrections — two things the coordinator got wrong

Recorded because both were caught by someone else, and the pattern matters.

**1. "Higgsfield Unlimited is on" — it wasn't.** The instruction was relayed to the
sessions unverified. One session checked before spending and disproved it two ways:
the web app's submit button read **"Generate 2"**, not "Unlimited"; and the
"Unlimited" chip in the settings row is a plain `<div>` with no role and no
`aria-checked` that does nothing when clicked — **a label describing the plan, not a
switch**. Independently, `models_explore` returned `unlim: { available: false }` while
still tagging the models `supports_unlim: true`.
→ **The submit button is ground truth.** If it says "Generate N", the allowance is not
live regardless of what the account page claims. Nothing was generated; the ~0.84 paid
credits are intact.

**2. "This app risks 4.3(a) spam" — overstated.** Zeid's counter: Wix ships a
client-portal app, why would LOOM's be spam? He's right. **Guideline 4.3 is about many
*similar* apps from one developer.** LOOM for Clients is one app, unlike the other four.
Its real exposure is guideline **2.1** — a reviewer cannot sign into a login-gated app.
The 4.3 concern belongs to *five apps arriving in one week*, which is a separate
question and is deferred.

---

## The Firebase backend — `clients-backend/`

In its own directory **on purpose**: the repo root already has a `firebase.json` that
deploys the marketing site to Hosting, and several sessions write to this repo at once.
Deploy from `clients-backend/` or you will fight that config.

### The one idea worth understanding

**It is a transport port, not a rewrite.** `engine/lib/clientauth.mjs` and
`clientapi.mjs` already took an optional trailing `{ store }` — a seam that existed so
their selftests could run in memory. That same seam lets the hosted API reuse both files
**verbatim**, injected with a Firestore store instead of the JSON-file one.

So the privacy rule, the explicit field-picking, the cross-tenant 404, the timing-safe
code compare and the attempt limiter are *literally the same code* in both places. They
were not ported by hand, so they cannot drift.

- `functions/engine/*.mjs` are **generated copies — never edit them.** Edit
  `engine/lib/*.mjs` and re-run `./sync-engine-libs.sh`.
- Route paths and response shapes are identical to the local engine, so **the iOS app
  changes exactly one constant: its base URL**, in `Sources/Core/Net/APIClient.swift`
  (confirmed: the host appears in exactly one of 41 Swift files).

### Why firestore.rules denies everything

Rules can gate a **document** but cannot project **fields**. Letting a client read its
own posts would hand it `generationCostJod`, `marginPct`, `qaSeconds` and the rest of
`PRIVACY_FORBIDDEN_KEYS` — LOOM's cost data lives in the same documents as the captions.
So nothing reads Firestore directly; everything goes through the API, which field-picks.

If anyone later wants direct client reads for speed, that is **not** a rules change — it
needs a separate collection of pre-projected client-safe copies.

### Two deliberate exceptions, both flagged rather than buried

**a) Plaintext codes now touch disk.** `clientauth.mjs`'s header says only *hashes* ever
do. That held because the operator read the code off a console log. Hosted, function
instances are ephemeral and there's no console — so the plaintext is mirrored into an
`operatorcodes` collection, denied to every client-SDK caller and deleted on consume.
Not a new exposure (it already went to a log Cloud Logging retains) but it **is** a
change to a stated invariant. Enable a Firestore **TTL policy on
`operatorcodes.expiresAt`** — TTL isn't expressible in rules, so it isn't in the repo.

**b) A `permanent` flag on auth codes.** Added to `engine/lib/clientauth.mjs` for App
Store review only. It **only** skips the consume step — attempt limiter, timing-safe
compare, expiry check and client-scoping all still apply. It is a reusable password for
one seeded fake client, not a bypass. Only `sync-to-firestore.mjs --demo` sets it, and
**it must never be set on a real client.**
Demo credentials for Apple review notes: handle **`loomdemo`**, code **`424242`**.

---

## Still not done

- **NOTHING IS DEPLOYED.** `firebase deploy` was blocked by the permission classifier,
  as was reading the CLI credentials to enable the Firestore API, as was deleting stale
  DerivedData. All three refusals were left standing rather than worked around.
- **Two console steps only Zeid can do:** enable Firestore + create the database
  (europe-west1), and upgrade to **Blaze** (Functions won't deploy without it; usage
  should sit in the free tier — but his Evora notes record Firebase billing going
  delinquent before, so check the account is in good standing).
- **The sync needs a service-account key.** The Admin SDK can't use the CLI's user
  login. Download from the console, `export GOOGLE_APPLICATION_CREDENTIALS=...`, keep it
  out of the repo.
- **Nothing in `clients-backend/` has ever executed.** Syntax-checked is not tested. The
  Firestore adapter is the only new code in the privacy path and deserves
  `clientapi-selftest.mjs` pointed at it via the emulator before anyone trusts it.
- **Token cleanup.** `clienttokens` and `clientauthattempts` grow forever.

---

## Open defects

**F0 — LOOMSHARE SHA-256 mismatch. ROOT-CAUSED: the verifier was wrong, not the bytes.**
`web/src/transport/hashing.ts` sets `finalised = true` inside `digestHex()` and throws if
`update()` is called after. On a multi-chunk transfer the receiver finalises and then keeps
receiving, so the digest is computed over a **truncated stream**. The bytes were very likely
correct all along. Corrupt-bytes and wrong-verifier need opposite fixes, which is why the
original finding refused to touch anything before establishing which it was.

**Do not close F0 on the green screenshot.** The receipt now reads "All files verified
byte-identical" and that result is real — but it was captured with a **21 KB fixture, which
is a single chunk**, so it never calls `update()` after `digestHex()` and never trips the
bug. It proves only the small-file path. The failing case is every multi-chunk transfer:
every real photo, video and folder — i.e. the ">= 1 GB streamed, chunked, resumable"
acceptance criterion. A green receipt that exercises only the passing path is worse than a
red one, because it looks like evidence.

Fix + three adversarial verifiers in flight, aimed at the ways this specific fix could be
fake: that the test payload really exceeds the chunk-size constant and asserts **byte**
equality not just hash equality (a fix making two wrong hashes agree is worse than the bug);
that the correct layer was fixed and the guard wasn't simply deleted (that guard is what
caught this); and regressions. Survives on >=2 of 3 non-refutations.

**Flaky privacy selftest — DIAGNOSED.** `engine/fixtures/clientapi-selftest.mjs:208`
asserts a wall-clock timing side-channel: `Math.abs(avgKnown - avgUnknown) < 10`, the
**mean** of 25 trials against a bare 10ms threshold. Measured delta on a clean run is
~1.7ms (known 0.302ms, unknown 2.035ms) — one GC pause or scheduler preemption away from
failing. Failure correlated with machine load, not with code: it failed on the first run
immediately after `sync-engine-libs.sh` (a burst of disk I/O) both times, and passed 60+
consecutive runs otherwise, on a Mac running three concurrent Claude sessions doing Xcode
builds. **Nothing was wrong with the code.**

Fix: compare **medians**, not means — a single outlier destroys a mean of 25 samples and
leaves a median untouched, which is exactly the property wanted, since an OS scheduling
artefact is not a systematic timing difference. **Do not simply widen the 10ms threshold**
— the assertion exists because CONTRACT.md requires `requestCode()` to be indistinguishable
between known and unknown handles, and a threshold loose enough never to flake is loose
enough to miss a real enumeration oracle.

**The asymmetry WAS a defect — the coordinator called this wrong.** It was first logged as
"real but not a defect, worth knowing". It was a one-line enumeration oracle:
`findClientByHandle` used `clients.find(...)`, which **short-circuits on a match**, so a
known handle exited the moment it hit its record while an unknown handle always walked the
entire list. The signal grows linearly with LOOM's client count — precisely what
CONTRACT.md forbids, merely too small to measure over a network *today*. Fixed at the
source: it now scans the whole list either way, tracking the first match instead of
returning early. **Removing the leak beat testing around it.**

Two lessons from the fix, both worth keeping:

- **The ratio inverted.** Post-fix, unknown is now *faster* than known (0.011ms vs
  0.038ms) — a known handle invalidates existing codes and inserts a new one, an unknown
  handle writes nothing, so this will never be 1x. The first ratio assertion was written
  one-directionally (`unknown/known < 3`) and afterwards read 0.24x and **passed happily
  while the known path was ~4x the unknown one.** A one-directional check is false comfort.
  It is now symmetric (max/min) and reports which side is slower.
- **Ratios between sub-millisecond numbers are noise.** "3.42x" from 0.038 vs 0.011 is
  scheduler jitter, not signal. The ratio check is gated behind a 1ms floor on the slower
  side; below that it prints as a note instead of asserting. The **absolute median delta**
  (<10ms, currently 0.027ms) stays the real assertion, since it is the only number an
  attacker over a network could actually observe.

Test now uses median over 41 trials with a 5-iteration warmup so JIT stays out of the
samples. **25 consecutive passes under three concurrent Xcode builds** — the exact load
that broke the mean version. Verified again post-sync: 10/10.

**Attempt limiter now counts only FAILED attempts** (`a.ok !== true`). Correct: brute force
is made of wrong guesses, so counting successes bought no security and did cost real logins
— the 6th correct sign-in in 15 minutes was refused, which an App Store reviewer retrying
the demo account across devices would hit. It also rescues the `loomdemo` permanent-code
flow, which would otherwise lock out mid-review.

**Verification is uneven.** PARALLAX is the only app independently verified: `xcodebuild`
exit 0, and `nm -u` on the binary shows zero networking symbols — proving its "never
sends a byte" claim *from the binary* rather than from an agent's word. **That is the
bar.** SOLID and SNAPVAULT are agent-claimed only.

---

## Gotchas that will cost hours

- **Don't gate on the word "connected"** in `xcrun devicectl list devices` — both of
  Zeid's phones read `available (paired)` even when usable. Probe with
  `devicectl device info details --device <id>` instead.
- **A booted simulator device container is 3–4GB.** They took this Mac to 2.0GB free
  tonight. Deleting them returned CoreSimulator from 9.7GB to 187MB → 8.4GB free.
  `df -h /System/Volumes/Data` before any build or npm install.
- **~2.5GB is still reclaimable** from `~/Library/Developer/Xcode/DerivedData` —
  `KwaKwa-evojhvjdkabgfbbtjjixqwoooaxj` (1.3GB) and `Lahza-fojugtlsaevssxgshjcphowhwduq`
  (1.2GB). Nothing was building either. Left for a human.
- **Node is not on PATH.** `export PATH="$HOME/.local/node/bin:$PATH"`.
- **Several sessions write to this repo at once.** Check `git status` before `git add` —
  one session already swept another's staged work into its commits.
- **Higgsfield MCP cannot spend Unlimited.** Generating via `mcp__higgsfield__*` burns
  paid credits; video is ~176 credits for 8s. Unlimited is web-app only, one job at a
  time.

---

## How the sessions were run

Four Claude sessions in parallel, coordinated over `SendMessage`, with the main session
on a self-paced `/loop`. What worked: sessions pushing back with evidence instead of
complying (both corrections above came from that), and refusing to route around each
other's permission denials — one session explicitly declined to run a delete that another
had been blocked from, on the grounds that differing permissions aren't a licence to
bypass the user's guardrail. Keep that norm.
