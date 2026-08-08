#!/bin/bash
# install-on-phone.sh — put LOOM for Clients on the iPhone 14 Pro.
#
# The app is already built and signed (com.loom.client, team 6JW6JNN28V).
# The ONLY thing missing is the phone being connected — it was last seen at
# 05:42 and is currently paired but not attached, so nothing can install.
#
#   1. Plug the iPhone 14 Pro in with a cable
#   2. Unlock it (and tap Trust if asked)
#   3. Run:  ./install-on-phone.sh
#
# No Apple password is needed. Signing already succeeded.
set -uo pipefail

DEVICE="2F962560-17B6-5C0E-B079-B97369FBFC55"   # Zeid — iPhone 14 Pro (iPhone15,2)
BUNDLE="com.loom.client"
cd "$(dirname "$0")"

echo "── checking the phone ─────────────────────────────────"
STATE=$(xcrun devicectl device info details --device "$DEVICE" 2>&1 | grep -i "tunnelState" | head -1)
echo "  $STATE"
if echo "$STATE" | grep -qi "unavailable"; then
  echo
  echo "  The phone is not connected. Plug it in, unlock it, then run this again."
  echo "  (Paired-but-not-attached is what 'tunnelState: unavailable' means.)"
  exit 1
fi

APP=$(ls -d ~/Library/Developer/Xcode/DerivedData/LOOMClient-*/Build/Products/Debug-iphoneos/LOOM.app 2>/dev/null | head -1)
if [ -z "$APP" ] || [ ! -e "$APP/embedded.mobileprovision" ]; then
  echo "── no signed build found, building one ────────────────"
  export PATH="$HOME/.local/node/bin:$PATH"
  xcodegen generate >/dev/null
  xcodebuild -project LOOMClient.xcodeproj -scheme LOOMClient \
    -destination "id=$DEVICE" -allowProvisioningUpdates build 2>&1 | tail -5
  APP=$(ls -d ~/Library/Developer/Xcode/DerivedData/LOOMClient-*/Build/Products/Debug-iphoneos/LOOM.app | head -1)
fi
echo "  app: $APP"

echo "── installing ─────────────────────────────────────────"
xcrun devicectl device install app --device "$DEVICE" "$APP" || exit 1

echo "── launching ──────────────────────────────────────────"
xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE"

cat <<'NOTE'

Done. Two things to expect, both deliberate:

  · There is no backend yet (Firebase was never deployed), so the app cannot
    reach a server. It will show its OFFLINE state — LOOM's own woven artwork,
    not a crash and not a system error glyph. That screen is the thing to judge.

  · To see real data instead, run the engine on this Mac and point the app at
    it. The base URL lives in exactly one place:
      Sources/Core/Net/APIClient.swift  ->  init(baseURL:)
    Change that one constant when the Firebase URL exists.

NOTE
