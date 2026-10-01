#!/bin/zsh
# Build the four Za Neru AR pairs from the original GLBs in ~/Downloads.
# The public GLBs use meshopt + WebP for Android Scene Viewer; the USDZ files
# use Quick Look-compatible geometry and textures for iPhone/iPad Safari.
setopt NULL_GLOB
set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"
SRC="${ZANERU_SRC:-$HOME/Downloads}"
OUT="$ROOT/static/models/za-neru"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

if command -v gltf-transform >/dev/null 2>&1; then
  TRANSFORM=(gltf-transform)
else
  TRANSFORM=(npx --yes @gltf-transform/cli)
fi

build() { # source, slug, uniform real-world scale factor
  local source="$1" slug="$2" factor="$3"
  local scaled="$WORK/${slug}-scaled.glb"
  local ar_glb="$WORK/${slug}-ar.glb"
  local usdz_source="$WORK/${slug}-usdz-source"

  python3 - "$source" "$scaled" "$factor" <<'PY'
import json, struct, sys
src, dst, factor_text = sys.argv[1:]
factor = float(factor_text)
data = open(src, 'rb').read()
magic, version, total = struct.unpack_from('<4sII', data, 0)
if magic != b'glTF' or version != 2:
    raise SystemExit(f'Unsupported GLB header: {src}')
json_length, chunk_type = struct.unpack_from('<II', data, 12)
if chunk_type != 0x4E4F534A:
    raise SystemExit(f'Missing JSON chunk: {src}')
doc = json.loads(data[20:20 + json_length])
scene_index = doc.get('scene', 0)
roots = doc['scenes'][scene_index]['nodes']
for index in roots:
    node = doc['nodes'][index]
    scale = node.get('scale', [1, 1, 1])
    node['scale'] = [value * factor for value in scale]
    translation = node.get('translation', [0, 0, 0])
    node['translation'] = [value * factor for value in translation]
json_bytes = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
padding = (-len(json_bytes)) % 4
json_bytes += b' ' * padding
remainder = data[20 + json_length:]
new_total = 12 + 8 + len(json_bytes) + len(remainder)
with open(dst, 'wb') as out:
    out.write(struct.pack('<4sII', magic, version, new_total))
    out.write(struct.pack('<II', len(json_bytes), chunk_type))
    out.write(json_bytes)
    out.write(remainder)
PY

  "${TRANSFORM[@]}" optimize "$scaled" "$OUT/$slug.glb" \
    --compress meshopt --texture-compress webp --texture-size 1024 \
    --simplify true --simplify-error 0.0008 --instance false --join false >/dev/null

  "${TRANSFORM[@]}" optimize "$scaled" "$ar_glb" \
    --compress false --texture-compress auto --texture-size 1024 \
    --simplify true --simplify-error 0.0008 --instance false --join false >/dev/null

  mkdir -p "$usdz_source"
  usdextract "$ar_glb" -o "$usdz_source" >/dev/null
  (
    cd "$usdz_source"
    usdzip "$OUT/$slug.usdz" *.usdc *.jpg *.png >/dev/null
  )

  printf '  %-12s GLB %6.2f MiB   USDZ %6.2f MiB\n' "$slug" \
    "$(( $(stat -f%z "$OUT/$slug.glb") / 1048576.0 ))" \
    "$(( $(stat -f%z "$OUT/$slug.usdz") / 1048576.0 ))"
}

# The food models are placed at a roughly 34 cm table scale; the chair is about
# 1 m tall; the rounded sofa is about 1.9 m wide. These are illustrative sizes.
build "$SRC/cevapi.glb" cevapi 0.3466
build "$SRC/pizza 3d model.glb" pizza 0.3473
build "$SRC/ornate blue armchair 3d model.glb" blue-armchair 1.0193
build "$SRC/green tufted sofa 3d model.glb" green-sofa 1.9386
