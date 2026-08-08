#!/usr/bin/env node
// make-assets.mjs — generates every raster asset in Resources/Assets.xcassets
// from scratch, procedurally, with sharp. No stock, no designer, no mystery
// binaries: every pixel here is drawn by the SVG builders below and rasterized
// at build time. Re-run any time the mark needs to change:
//
//   export PATH="$HOME/.local/node/bin:$PATH"
//   node ios/loom-client/Tools/make-assets.mjs
//
// LOOM's identity is textile — warp + weft, over and under. Every mark in this
// file is built from the same idea: straight bars that visibly interlace.

import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "..", "Resources", "Assets.xcassets");

// ---- palette (verbatim from src/styles.css / LoomColor.swift) ----------
const BG = "#0D0716";
const BG2 = "#120A1F";
const BG3 = "#1A1029";
const INK = "#F2F0F7";
const INK_DIM = "#A89FC0";
const INK_FAINT = "#857C9E";
const MAGENTA = "#F21C8C";
const VIOLET = "#7B2FBE";
const GOLD = "#FFC740";
const CYAN = "#59E6FF";
// yarn colours (surfaces)
const YARN_PINK = "#D6247E";
const YARN_VIOLET = "#9B55C9";
const YARN_BLUE = "#5CC0E8";
const YARN_GOLD = "#E0A82F";
const YARN_CREAM = "#EFE7DA";

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writePng(svg, size, outPath) {
  const buf = Buffer.from(svg);
  await sharp(buf, { density: 384 })
    .resize(size, size, { fit: "fill" })
    .png()
    .toFile(outPath);
}

async function writeContents(dir, images, extra = {}) {
  await fs.writeFile(
    path.join(dir, "Contents.json"),
    JSON.stringify(
      {
        images,
        info: { author: "xcode", version: 1 },
        ...extra,
      },
      null,
      2
    ) + "\n"
  );
}

// =========================================================================
// THE MARK — three warp threads, two weft threads, woven over/under.
// This is the one shape every asset in this file is built from: the app
// icon, the brand mark and the empty/error illustrations all read as the
// same family because they share this function.
// =========================================================================

/**
 * @param {object} opts
 * @param {boolean} opts.background - paint an opaque bg rect (true for the icon)
 * @param {number}  opts.pad - inset from the 0..1024 canvas edge
 */
function weaveMark({ background = false, pad = 150 } = {}) {
  const cx = 512;
  const vGap = 190;
  const vHalf = 60;
  const vTop = pad + 110;
  const vBottom = 1024 - pad - 110;
  const vCenters = [cx - vGap, cx, cx + vGap];
  const vColors = [MAGENTA, GOLD, CYAN];

  const hHalf = 60;
  const hLeft = vCenters[0] - vHalf;
  const hRight = vCenters[2] + vHalf;
  const weft = [
    { y: cx - 140, color: YARN_CREAM, coverIdx: [1] }, // over mag, UNDER gold, over cyan
    { y: cx + 140, color: YARN_VIOLET, coverIdx: [0, 2] }, // UNDER mag, over gold, UNDER cyan
  ];

  const rBar = 26;

  let s = "";

  if (background) {
    s += `<defs>
      <radialGradient id="bgGlow" cx="72%" cy="26%" r="85%">
        <stop offset="0%" stop-color="${BG3}"/>
        <stop offset="55%" stop-color="${BG2}"/>
        <stop offset="100%" stop-color="${BG}"/>
      </radialGradient>
    </defs>`;
    s += `<rect x="0" y="0" width="1024" height="1024" fill="url(#bgGlow)"/>`;
  }

  // 1. verticals (warp), bottom layer
  vCenters.forEach((vc, i) => {
    s += `<rect x="${vc - vHalf}" y="${vTop}" width="${vHalf * 2}" height="${
      vBottom - vTop
    }" rx="${rBar}" fill="${vColors[i]}"/>`;
  });

  // 2. each weft bar drawn over everything, then the verticals it passes
  //    UNDER are redrawn on top at that crossing only — that's the interlace.
  weft.forEach((w) => {
    s += `<rect x="${hLeft}" y="${w.y - hHalf}" width="${
      hRight - hLeft
    }" height="${hHalf * 2}" rx="${rBar}" fill="${w.color}"/>`;
    w.coverIdx.forEach((i) => {
      const vc = vCenters[i];
      s += `<rect x="${vc - vHalf}" y="${w.y - hHalf}" width="${
        vHalf * 2
      }" height="${hHalf * 2}" fill="${vColors[i]}"/>`;
    });
  });

  return s;
}

function svgDoc(inner, viewBoxSize = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${viewBoxSize}" height="${viewBoxSize}">${inner}</svg>`;
}

// =========================================================================
// 1. APP ICON — one strong mark, opaque, no transparency. Single 1024x1024
//    source (modern Xcode single-size app icon — the system derives every
//    other size and applies its own corner mask, so we bleed full-bleed).
// =========================================================================

async function buildAppIcon() {
  const dir = path.join(ASSETS, "AppIcon.appiconset");
  await ensureDir(dir);
  const svg = svgDoc(weaveMark({ background: true, pad: 128 }));
  const outFile = "AppIcon-1024.png";
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(1024, 1024, { fit: "fill" })
    .flatten({ background: BG }) // guarantee zero alpha — App Store requires opaque icons
    .png()
    .toFile(path.join(dir, outFile));

  await writeContents(dir, [
    { idiom: "universal", platform: "ios", size: "1024x1024", filename: outFile },
  ]);
  return path.join(dir, outFile);
}

// =========================================================================
// 2a. BRAND MARK — the same weave, transparent background, for splash /
//     loading / auth-screen use over LoomColor.bg.
// =========================================================================

async function buildBrandMark() {
  const dir = path.join(ASSETS, "BrandMark.imageset");
  await ensureDir(dir);
  const pointSize = 120;
  const svg = svgDoc(weaveMark({ background: false, pad: 40 }));
  const files = [];
  for (const [suffix, scale] of [["", 1], ["@2x", 2], ["@3x", 3]]) {
    const name = `BrandMark${suffix}.png`;
    await writePng(svg, pointSize * scale, path.join(dir, name));
    files.push(name);
  }
  await writeContents(dir, [
    { idiom: "universal", filename: files[0], scale: "1x" },
    { idiom: "universal", filename: files[1], scale: "2x" },
    { idiom: "universal", filename: files[2], scale: "3x" },
  ]);
}

// =========================================================================
// 2b. WEAVE TEXTURE — seamless tileable crosshatch, very low contrast, for
//     subtle background fills. Diagonal line families at +-45deg tile
//     perfectly on a square because the period divides the tile edge.
// =========================================================================

function weaveTextureSvg(size, period) {
  const half = size / 2;
  let lines = "";
  // one family of parallel 45deg lines, one of parallel -45deg lines
  for (let c = -size; c <= size * 2; c += period) {
    // slope +1 family: x - y = c  -> long segment through (c-2S,-2S)..(c+2S,2S)
    lines += `<line x1="${c - 2 * size}" y1="${-2 * size}" x2="${
      c + 2 * size
    }" y2="${2 * size}" stroke="${INK}" stroke-opacity="0.05" stroke-width="${
      period * 0.34
    }"/>`;
    // slope -1 family: x + y = c
    lines += `<line x1="${c + 2 * size}" y1="${-2 * size}" x2="${
      c - 2 * size
    }" y2="${2 * size}" stroke="${INK}" stroke-opacity="0.035" stroke-width="${
      period * 0.34
    }"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs><clipPath id="tile"><rect x="0" y="0" width="${size}" height="${size}"/></clipPath></defs>
    <g clip-path="url(#tile)">${lines}</g>
  </svg>`;
}

async function buildWeaveTexture() {
  const dir = path.join(ASSETS, "WeaveTexture.imageset");
  await ensureDir(dir);
  const baseSize = 96; // point size of one repeating tile
  const period = 24; // divides baseSize evenly at every scale -> seamless
  const files = [];
  for (const [suffix, scale] of [["", 1], ["@2x", 2], ["@3x", 3]]) {
    const name = `WeaveTexture${suffix}.png`;
    const px = baseSize * scale;
    const svg = weaveTextureSvg(px, period * scale);
    await sharp(Buffer.from(svg), { density: 384 })
      .resize(px, px, { fit: "fill" })
      .png()
      .toFile(path.join(dir, name));
    files.push(name);
  }
  await writeContents(dir, [
    { idiom: "universal", filename: files[0], scale: "1x" },
    { idiom: "universal", filename: files[1], scale: "2x" },
    { idiom: "universal", filename: files[2], scale: "3x" },
  ]);
}

// =========================================================================
// 3. EMPTY / ERROR ARTWORK — a loom frame with warp threads. Empty = nothing
//    woven yet (threads strung, waiting). Error = a dropped weft thread,
//    snapped mid-span, echoing ErrorState's existing gold accent.
// =========================================================================

function loomFrameSvg({ broken }) {
  const S = 200;
  const pad = 22;
  const frameColor = INK_FAINT;
  const warpColor = INK_DIM;
  const weftColor = broken ? GOLD : INK_FAINT;

  let s = `<rect x="${pad}" y="${pad}" width="${S - pad * 2}" height="${
    S - pad * 2
  }" rx="20" fill="none" stroke="${frameColor}" stroke-width="7"/>`;

  // three warp threads, evenly spaced, full height inside the frame
  const warpXs = [S * 0.35, S * 0.5, S * 0.65];
  const top = pad + 14;
  const bottom = S - pad - 14;
  warpXs.forEach((x) => {
    s += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${warpColor}" stroke-width="6" stroke-linecap="round"/>`;
  });

  const midY = S / 2;
  const left = pad + 14;
  const right = S - pad - 14;

  if (!broken) {
    // empty: one faint dashed weft, suggested but not yet woven
    s += `<line x1="${left}" y1="${midY}" x2="${right}" y2="${midY}" stroke="${weftColor}" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" stroke-opacity="0.55"/>`;
  } else {
    // error: the weft thread snapped in the middle, two frayed dangling ends
    const gap = 16;
    s += `<line x1="${left}" y1="${midY}" x2="${
      S / 2 - gap
    }" y2="${midY}" stroke="${weftColor}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<line x1="${
      S / 2 + gap
    }" y1="${midY}" x2="${right}" y2="${midY}" stroke="${weftColor}" stroke-width="6" stroke-linecap="round"/>`;
    // frayed dangling ends, drooping slightly — sells "broken", not just "gap"
    s += `<path d="M ${S / 2 - gap} ${midY} q 4 14 -3 24" fill="none" stroke="${weftColor}" stroke-width="3.5" stroke-linecap="round"/>`;
    s += `<path d="M ${S / 2 + gap} ${midY} q -4 14 3 24" fill="none" stroke="${weftColor}" stroke-width="3.5" stroke-linecap="round"/>`;
    // a small warning dot where the break is
    s += `<circle cx="${S / 2}" cy="${midY - 34}" r="4.5" fill="${GOLD}"/>`;
  }

  return svgDoc(s, S);
}

async function buildStateArt(name, broken) {
  const dir = path.join(ASSETS, `${name}.imageset`);
  await ensureDir(dir);
  const pointSize = 64;
  const svg = loomFrameSvg({ broken });
  const files = [];
  for (const [suffix, scale] of [["", 1], ["@2x", 2], ["@3x", 3]]) {
    const fname = `${name}${suffix}.png`;
    await writePng(svg, pointSize * scale, path.join(dir, fname));
    files.push(fname);
  }
  await writeContents(dir, [
    { idiom: "universal", filename: files[0], scale: "1x" },
    { idiom: "universal", filename: files[1], scale: "2x" },
    { idiom: "universal", filename: files[2], scale: "3x" },
  ]);
}

// =========================================================================

async function main() {
  const iconPath = await buildAppIcon();
  await buildBrandMark();
  await buildWeaveTexture();
  await buildStateArt("EmptyWoven", false);
  await buildStateArt("ErrorWoven", true);
  console.log("Generated:");
  console.log(" -", iconPath);
  console.log(" -", path.join(ASSETS, "BrandMark.imageset"));
  console.log(" -", path.join(ASSETS, "WeaveTexture.imageset"));
  console.log(" -", path.join(ASSETS, "EmptyWoven.imageset"));
  console.log(" -", path.join(ASSETS, "ErrorWoven.imageset"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
