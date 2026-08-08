# LOOM for Clients — iOS app

A client-facing iOS app on top of LOOM ENGINE (`../../engine`). The client logs in,
sees the month LOOM made for them, approves or rejects it post by post, sees what
the advertising delivered, their invoices, and a message thread to LOOM — in Arabic
or English, on their own phone.

`../CONTRACT.md` is the binding spec for both this app and the engine's client API.
Read it before changing anything here.

## Build

**Node is not on PATH.** Every shell needs `export PATH="$HOME/.local/node/bin:$PATH"`.

```bash
xcodegen generate                       # project.yml globs directories — adding a file needs no project edit
./install-on-phone.sh                   # build + install on the iPhone 14 Pro
```

Compile gate (no simulator, no signing, cheap):

```bash
xcodebuild -project LOOMClient.xcodeproj -scheme LOOMClient \
  -destination 'generic/platform=iOS' -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build
```

**Do not use the iOS Simulator on this machine.** Direct user instruction, and the
reason is disk: this Mac runs at 96–99% on `/System/Volumes/Data` and has been
filled to zero before, which broke a running app mid-write. CoreSimulator alone was
6.4 GB. Always `df -h /System/Volumes/Data` before building; stop under 3 GB.
Reuse the shared DerivedData rather than passing `-derivedDataPath ./build`, which
silently duplicates the whole cache.

## Signing — already solved, don't re-derive it

Signed builds work and **no Apple password is required**. `-allowProvisioningUpdates`
provisioned `com.loom.client` against team `6JW6JNN28V` automatically.
Verified: `Identifier=com.loom.client`, `TeamIdentifier=6JW6JNN28V`, embedded
provisioning profile present in the built `.app`.

If signing ever does demand interactive auth, **stop** — do not type the user's
Apple password. Route it to them.

The `morphic.keychain` / `errSecInternalComponent` trap that has bitten other apps
on this Mac is currently disarmed — that keychain is not in the search list.

## The state as of the first night

The app **compiles clean and is signed**, but has **never run**. It was never
installed, because the iPhone 14 Pro was paired-but-not-attached
(`tunnelState: unavailable`, last connection 05:42). Nothing about how it *looks or
behaves at runtime* has been verified by anyone. Treat every visual claim as
unproven until someone opens it.

## Two traps that already cost time here

**SourceKit diagnostics in this project are mostly noise.** It analyses files
standalone without module context, so it reports every cross-file symbol
(`LoomColor`, `L10n`, `APIClient`…) as "cannot find in scope". Hundreds of those
were phantom; exactly one was real (a missing closing brace that pushed a `private
func` inside `var body`). **Only `xcodebuild` is authoritative.**

**"Database is locked — possibly two concurrent builds"** means exactly that: two
xcodebuild processes in the same DerivedData. Stop the other one; it is not a
corruption.

## The typeface rule — enforced in code, not by convention

**LOOM Bloom is 67 Latin glyphs and draws no Arabic**, and no `→ … × ·`. Setting
Arabic in it fills the UI with tofu. `Core/Design/LoomFont` picks the face from the
active language and the string's script, so the wrong thing is impossible rather
than merely documented. Never bypass it with a raw `.custom("LOOMBloom…")`.

## The backend is one constant

The base URL appears in **exactly one place** across the whole app:

```
Sources/Core/Net/APIClient.swift  ->  init(baseURL: URL = URL(string: "http://localhost:4950")!)
```

Firebase (`loom-clients`) was written but **never deployed**, so there is no hosted
URL yet. When there is one, change that constant — nothing else. Features talk to
the transport abstraction, never to `URLSession` or a URL directly. Keep it that way.

Because there is no reachable backend, **the offline/error state is the first screen
a user reaches.** It is the app's front door, not a fallback — give it that weight.

## The privacy rule

The client app must never receive or display `qaSeconds`, `regenerations`,
generation/platform/operator cost, margin, gross, `adSpendJod`, `costJod`, CPC, the
creative library, or any other client's data. The engine builds every client
response by **explicitly picking allowed fields** — never by deleting keys from a
store record, because the next field added would then leak by default.
`engine/fixtures/clientapi-selftest.mjs` enforces this with a recursive forbidden-key
scan, and it has real negative controls, so its pass means something.

## A pattern worth watching

Twice on this project, parallel agents built a capability and nobody connected it:
generated post images were never persisted (the job hardcoded `image: null`), and
the bespoke woven empty/error artwork was generated, given an `imageName:` parameter,
and then wired into **zero** call sites — so every screen fell through to a generic
SF Symbol. Both passed every "build succeeded" check. **When work is split across
agents, audit the seams, not the pieces.**
