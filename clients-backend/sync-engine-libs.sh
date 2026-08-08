#!/bin/bash
# clients-backend/sync-engine-libs.sh
#
# Copy the engine's client-facing modules into functions/engine/ so the deployed
# bundle is self-contained (firebase deploy packages one directory; it will not
# follow a symlink out to ../../engine).
#
# THESE COPIES ARE GENERATED. Never edit functions/engine/*.mjs by hand — edit
# engine/lib/*.mjs and re-run this script. The whole point of reusing these
# files rather than porting them is that the privacy rule and the auth logic
# cannot drift between the operator engine and the hosted API; hand-editing a
# copy is exactly how that guarantee would be lost.
#
# The list below is the transitive import closure of clientauth.mjs and
# clientapi.mjs. Everything past csv.mjs bottoms out in node builtins.
#   clientauth -> store
#   clientapi  -> store, pricing, ads
#   pricing    -> store
#   ads        -> store, pricing, csv
#
# store.mjs and ads.mjs ship but are never executed: every call site injects the
# Firestore store, and performance() is always handed a resolved `pricing`, so
# pricing.mjs's file-reading resolvePricing() short-circuits before it runs.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/../engine/lib"
DEST="$HERE/functions/engine"

MODULES=(clientauth clientapi pricing ads store csv)

mkdir -p "$DEST"

for m in "${MODULES[@]}"; do
  if [ ! -f "$SRC/$m.mjs" ]; then
    echo "missing source module: $SRC/$m.mjs" >&2
    exit 1
  fi
  {
    echo "// GENERATED COPY — do not edit. Source: engine/lib/$m.mjs"
    echo "// Regenerate with clients-backend/sync-engine-libs.sh"
    cat "$SRC/$m.mjs"
  } > "$DEST/$m.mjs"
  echo "  synced $m.mjs"
done

echo "engine libs synced -> $DEST"
