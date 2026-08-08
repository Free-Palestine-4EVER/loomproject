# LOOM ENGINE

The operating system for two LOOM businesses. Operator-only — it runs on your
machine, never on the live site, and is never part of `dist/`.

Read `SPEC.md` for the build contract. This file is for running it.

## Start

```bash
export PATH="$HOME/.local/node/bin:$PATH"   # Node is not on PATH on this machine
npm run engine                              # http://localhost:4950
```

First run has an empty store. To see it populated with one believable demo client:

```bash
node engine/seed.mjs
```

That data is **fake and clearly labelled**. Delete `engine/data/*.json` to get back
to empty.

## The two businesses

**THE MACHINE** — 89 JOD/month per client for ~20 posts + 4 reels, bilingual.
Machines do the work, one operator does QA. Everything hinges on one number:
**QA minutes per client per month.** At 20 minutes it's a 90% margin business. At
50 it isn't a business. The QA queue times itself honestly so you find out which
one is true before you scale.

**BY RESULT** — 1.75 JOD per WhatsApp conversation delivered, minimum 100/month.
Our cost is the ad spend behind it. The margin grows because cost-per-conversation
falls as a category is learned while the price stays fixed. The creative library is
the asset: a new furniture client starts on the creative that already won for four
others.

## Where the truth lives

| Question | Screen |
|---|---|
| Is this actually profitable? | **Money** — the `/api/ops` snapshot |
| How much operator time is a client eating? | **QA queue** timer → `qaSeconds` |
| Can we take more clients? | **Money** → `clientsHeadroom` |
| Is the ads model compounding? | **Ads** → CPC by month for the category |
| What does the client see? | The approval link — no login, on their phone |

## Every number here is an assumption

The prices, the generation cost, the operator cost, the ad spend — all of them are
estimates, editable in Settings and marked as assumptions in the UI. Nothing in
this app should be quoted to a client as a fact until it has been observed for a
real month.

The honest way to use this: **run five clients manually first**, let the QA timer
tell you the real minutes-per-client, and only then decide whether 89 JOD is the
right price or whether it needs to be 129.

## Storage

JSON files under `engine/data/`, written atomically. No database, no cloud, no env
vars. `engine/data/*.json` is gitignored — operator and client data never gets
committed.

## Boundaries

- Never imported by `src/`. Never in `dist/`.
- The client approval page has **no login** on purpose. It is opened from a
  WhatsApp link on a phone; adding auth would kill the thing that makes it work.
- Text generation shells out to the local `claude` CLI — no API key, no per-token
  cost. If the CLI is missing the app degrades to labelled placeholders rather
  than failing.
