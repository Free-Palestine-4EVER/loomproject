#!/bin/zsh
#
# Rebuilds the four B.B. Simon pitch assets from the original Meshy exports:
#   static/models/bbsimon/{tb108-table,hh101-horse}.{glb,usdz}
#
# Run from the repo root:  ./scripts/build-bbsimon-assets.sh
#
# WHY THERE ARE TWO BUILDS OF EACH MODEL, NOT ONE
# -----------------------------------------------
# The web viewer and iOS AR cannot share a file.
#   .glb  — meshopt geometry + WebP textures. Smallest by a wide margin
#           (159 MB -> 6.6 MB for the table) but it needs a decoder, which is
#           why the page self-hosts /vendor/meshopt_decoder.js. See the note in
#           BBSimonProduct.svelte.
#   .usdz — Quick Look's format. Apple's usdextract reads NEITHER meshopt NOR
#           WebP, so this one is uncompressed geometry with textures left in
#           their original format, and simplified harder to make up for it —
#           Quick Look downloads the whole file before it shows anything.
#
# SCALE. Meshy normalises every export into a ~2-unit box, so untouched these
# models land in AR at an arbitrary size. bbsimon-scale.mjs bakes a real-world
# scale into the geometry BEFORE either build, because Scene Viewer and Quick
# Look read the file's own units — model-viewer's `scale` attribute would fix
# the on-page render and leave AR wrong. The heights below are estimates from
# the product photography and are disclosed as such on the page; when B.B.
# Simon send real dimensions, change them here and in $data/bbsimon.js.
#
# Requires: gltf-transform (npx), and Apple's usdextract/usdzip (macOS).
setopt NULL_GLOB
set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"
SRC="${BBSIMON_SRC:-$HOME/Downloads}"
OUT="$ROOT/static/models/bbsimon"
WORK="$(mktemp -d)"
mkdir -p "$OUT"
trap 'rm -rf "$WORK"' EXIT

build() {  # $1=source glb  $2=slug  $3=height(m)  $4=web simplify err  $5=AR simplify err
  local scaled="$WORK/$2_scaled.glb"
  node "$ROOT/scripts/bbsimon-scale.mjs" "$1" "$scaled" "$3"

  npx --yes @gltf-transform/cli optimize "$scaled" "$OUT/$2.glb" \
    --compress meshopt --texture-compress webp --texture-size 2048 \
    --simplify true --simplify-error "$4" --instance false --join false >/dev/null

  local arglb="$WORK/$2_ar.glb"
  npx --yes @gltf-transform/cli optimize "$scaled" "$arglb" \
    --compress false --texture-compress auto --texture-size 1024 \
    --simplify true --simplify-error "$5" >/dev/null
  usdextract "$arglb" -o "$WORK/$2_x" >/dev/null
  ( cd "$WORK/$2_x" && usdzip "$OUT/$2.usdz" *.usdc *.jpg *.png >/dev/null )

  printf '  %-12s glb %5.1f MB   usdz %5.1f MB\n' "$2" \
    "$(( $(stat -f%z "$OUT/$2.glb") / 1048576.0 ))" \
    "$(( $(stat -f%z "$OUT/$2.usdz") / 1048576.0 ))"
}

build "$SRC/Meshy_AI_Ornate_Gold_Filigree__0818044200_texture.glb" tb108-table 0.76 0.0008 0.004
build "$SRC/Meshy_AI_Beaded_Horse_Bust_0818044014_texture.glb"     hh101-horse 0.55 0.0008 0.002
