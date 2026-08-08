# LOOM Clients — hosted backend

The client iOS app's backend, on Firebase. This replaces `http://localhost:4950`
(the operator-local engine) with something a real client's phone can reach.

**Firebase project: `loom-clients`** — created 2026-08-08, console at
<https://console.firebase.google.com/project/loom-clients/overview>.

It lives in its own directory with its own `firebase.json` and `.firebaserc`
**on purpose**: the repo root already has a `firebase.json` that deploys the
marketing site to Hosting, and several sessions write to this repo at once.
Deploy from *this* directory or you will fight that config.

---

## The one idea

This is a **transport port, not a rewrite.**

`engine/lib/clientauth.mjs` and `engine/lib/clientapi.mjs` already take an
optional trailing `{ store }` — a dependency-injection seam that exists so their
selftests can run against an in-memory store. That same seam is what lets the
hosted API reuse both files **verbatim**, injected with a Firestore-backed store
instead of the JSON-file one.

So the things that actually matter — the privacy rule, the explicit
field-picking, the cross-tenant 404, the timing-safe code comparison, the
attempt limiter — are *literally the same code* running in both places. They
were not ported by hand, so they cannot drift apart later.

Consequences worth internalising:

- `functions/engine/*.mjs` are **generated copies**. Never edit them. Edit
  `engine/lib/*.mjs` and re-run `./sync-engine-libs.sh`.
- The route paths and response shapes are byte-identical to the local engine, so
  **the iOS app changes exactly one constant: its base URL.**
- Adding a field to `posts.json` still does not leak it to a client, for the same
  reason it didn't before — `clientSafePost()` has to be edited deliberately.

## Layout

```
clients-backend/
  firebase.json            functions + firestore config
  .firebaserc              -> project loom-clients
  firestore.rules          deny-all (read the file, the reasoning matters)
  firestore.indexes.json   posts(clientId, month)
  sync-engine-libs.sh      engine/lib/*.mjs -> functions/engine/
  functions/
    index.mjs              the router; the only hand-written server code
    firestore-store.mjs    store.mjs's interface, backed by Firestore
    engine/                GENERATED copies — do not edit
```

## Why the rules deny everything

Firestore rules can gate a **document** but cannot project **fields**. A rule
letting a client read its own posts would hand it the entire post record —
including `qaSeconds`, `generationCostJod`, `marginPct` and the rest of
`PRIVACY_FORBIDDEN_KEYS`. LOOM's cost and margin data sits in the same documents
as the captions.

So: nothing reads Firestore directly. Everything goes through the Functions API,
which runs the real `clientapi.mjs` and returns field-picked payloads. The Admin
SDK bypasses rules by design, which is exactly what we want.

If someone later wants the app to read Firestore directly for speed, that is
**not** a rules change — it needs a separate collection of pre-projected
client-safe copies.

## The one thing hosting genuinely changed

There is no SMS provider. **The delivery mechanism is the operator**, who reads
six digits out to the client. On the laptop that worked because
`requestCode()` logs the plaintext and parks it in an in-process `Map`.

Neither survives hosting — function instances are ephemeral, and there is no
console to tail. So the plaintext is mirrored into an `operatorcodes`
collection, denied to every client-SDK caller and deleted the moment the code is
consumed.

**Be honest about what this costs.** `clientauth.mjs`'s own header says only
*hashes* ever touch disk. Hosted, that is no longer strictly true. It is not a
new exposure — the plaintext already went to a console log that Cloud Logging
would retain anyway — but it **is** a change to a stated invariant, and it was a
deliberate decision, not an oversight. The engine's own data files still hold
hashes only. The alternative is paying for a real SMS provider.

Enable a Firestore **TTL policy on `operatorcodes.expiresAt`** in the console —
TTL is not expressible in rules, so it is not in this repo, and without it
consumed-but-unverified codes linger.

## DEPLOYED AND LIVE — 2026-08-08

**Base URL: `https://europe-west1-loom-clients.cloudfunctions.net/api`**

Firestore database (europe-west1, native mode), rules and indexes are deployed. The
Cloud Functions API is deployed on Blaze. Firebase Auth and Storage are enabled.

Smoke-tested at deploy time:

| check | result |
|---|---|
| `GET /health` | `200 {"ok":true}` |
| `POST /api/client/auth/request` with an unknown handle | `200 {"ok":true,"delivery":"operator"}` — byte-identical to a known handle, so it cannot be used to enumerate LOOM's client list |
| `GET /api/client/months` with no token | `401 UNAUTHENTICATED` |

**Two things are still true and matter:**

1. **Firestore holds no production data yet.** The engine → Firestore sync
   (`sync-to-firestore.mjs`) has never been run — it needs a service-account key.
   So the API answers correctly and returns empty collections.
2. **The iOS app still points at `http://localhost:4950`** and falls back to its
   compiled-in seed data. Switching it is a one-constant change in
   `Sources/Core/Net/APIClient.swift`, and should happen *after* real data is synced,
   not before — otherwise the app trades working seed content for empty screens.

### Re-deploying

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd "$HOME/Desktop/LOOM PROJECT/clients-backend"

./sync-engine-libs.sh
(cd functions && npm install)

firebase deploy --only firestore --project loom-clients
firebase deploy --only functions --project loom-clients
```

### Original staging notes (kept for context)

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd "$HOME/Desktop/LOOM PROJECT/clients-backend"

./sync-engine-libs.sh
(cd functions && npm install)

firebase deploy --only firestore --project loom-clients
firebase deploy --only functions --project loom-clients
```

Three things stand between this and a live URL, all requiring a human:

1. **The Cloud Firestore API is not enabled** on `loom-clients`. Enable it once
   at
   <https://console.cloud.google.com/apis/api/firestore.googleapis.com/overview?project=loom-clients>,
   or just open the Firestore tab in the Firebase console and create the
   database (`europe-west1`) — that enables it as a side effect.
2. **Cloud Functions requires the Blaze plan.** At this app's scale the bill
   should sit inside the free tier, but Blaze needs a card on file and that is
   the user's decision. Note the user's Evora notes record Firebase billing
   having gone delinquent before — worth checking the account is in good
   standing first.
3. **Data.** Firestore starts empty. The operator engine remains the source of
   truth; it needs a sync path that pushes `clients`, `posts`, `invoices`,
   `conversations` and `settings` up. That is not written yet — see below.

## Not done yet

- **The engine → Firestore sync.** Without it the hosted API returns empty
  collections and the app looks broken rather than failing loudly.
- **A hosted selftest.** `engine/fixtures/clientapi-selftest.mjs` already proves
  this logic against an in-memory store, and it is the same logic — but it has
  never run against `firestore-store.mjs`, so the *adapter* is unverified. The
  adapter is the only new code in the privacy path; it deserves that test
  pointed at the emulator before anyone trusts it.
- **Token cleanup.** `clienttokens` and `clientauthattempts` grow forever. They
  want a TTL policy too, or a scheduled function.
- Nothing here has ever executed. Syntax-checked is not tested.
