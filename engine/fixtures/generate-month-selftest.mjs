// engine/fixtures/generate-month-selftest.mjs — integration self-test for the
// generate.mjs <-> compose.mjs/carousel.mjs wiring: generateMonth() must return
// every post with either a real composed image on disk (right dimensions) or,
// for carousels, a real board+slides set — never a text-only post. Runs once
// against whatever `claude` binary is configured (real, by default) and is also
// meant to be re-run with LOOM_CLAUDE_BIN pointed at a nonexistent path to prove
// captions degrade to placeholders while images still get composed for real.
//
//   node engine/fixtures/generate-month-selftest.mjs
//   LOOM_CLAUDE_BIN=/nonexistent node engine/fixtures/generate-month-selftest.mjs
//
// Exits non-zero on any assertion failure.

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateMonth } from "../lib/generate.mjs";
import { POST_WIDTH, POST_HEIGHT } from "../lib/compose.mjs";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../lib/carousel.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "out");

let failures = 0;
function assert(cond, message) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok   ${message}`);
  }
}

async function makePhoto(name, seed) {
  const w = 1500, h = 1100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="g" cx="${40 + seed * 10}%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#F0D9B5" />
        <stop offset="100%" stop-color="#4A2E1F" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <rect x="${w * 0.2}" y="${h * 0.55}" width="${w * 0.6}" height="${h * 0.3}" rx="24" fill="#2C1B12" opacity="0.5" />
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
  const outPath = path.join(OUT_DIR, name);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(outPath, buffer);
  return outPath;
}

async function assertPostHasRealMedia(post, label) {
  console.log(`\n  post: ${label} — kind=${post.kind} caption._placeholder=${post.captions._placeholder}`);
  if (post.kind === "carousel") {
    if (post.carousel) {
      assert(typeof post.carousel.boardPath === "string", `${label}: carousel.boardPath is a path`);
      const boardMeta = await sharp(post.carousel.boardPath).metadata();
      const n = post.carousel.slides.length;
      assert(boardMeta.width === SLIDE_WIDTH * n && boardMeta.height === SLIDE_HEIGHT, `${label}: board is ${SLIDE_WIDTH}*${n}x${SLIDE_HEIGHT} (got ${boardMeta.width}x${boardMeta.height})`);
      assert(Array.isArray(post.carousel.slides) && post.carousel.slides.length >= 2, `${label}: carousel has >=2 slides (got ${post.carousel.slides?.length})`);
      for (const slidePath of post.carousel.slides) {
        const meta = await sharp(slidePath).metadata();
        assert(meta.width === SLIDE_WIDTH && meta.height === SLIDE_HEIGHT, `${label}: slide ${path.basename(slidePath)} is ${SLIDE_WIDTH}x${SLIDE_HEIGHT} (got ${meta.width}x${meta.height})`);
      }
      assert(post.image === null, `${label}: carousel post leaves top-level image null (per posts.json schema)`);
      console.log(`    board: ${post.carousel.boardPath} (${boardMeta.width}x${boardMeta.height})`);
      console.log(`    cuts: ${JSON.stringify(post.carousel.cuts)}`);
      console.log(`    slides: ${post.carousel.slides.join(", ")}`);
    } else {
      assert(false, `${label}: carousel composition produced neither a carousel object nor a logged reason (should never happen — see log)`);
    }
  } else {
    if (post.image) {
      const meta = await sharp(post.image).metadata();
      assert(meta.width === POST_WIDTH && meta.height === POST_HEIGHT, `${label}: image is ${POST_WIDTH}x${POST_HEIGHT} (got ${meta.width}x${meta.height})`);
      console.log(`    image: ${post.image} (${meta.width}x${meta.height})`);
    } else {
      assert(false, `${label}: image is null with no way to verify a logged reason from here (checked separately against job log)`);
    }
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const photoPath = await makePhoto("month-product-photo.jpg", 1);

  const clientWithPhotos = {
    id: "selftest-client-photos",
    name: "Sundus Home",
    nameAr: "بيت سندس",
    category: "furniture",
    brand: {
      colors: ["#130A1B", "#3A2449", "#FF3D9A"],
      voiceEn: "warm, direct, proud of the craftsmanship",
      voiceAr: "لهجة أردنية دافئة ومباشرة",
    },
  };
  const productWithPhotos = {
    id: "selftest-product-photos",
    nameEn: "Amman Oak Dining Chair",
    nameAr: "كرسي سفرة عمّان",
    priceJod: 65,
    notes: "Solid oak frame, hand-finished, made in a small Amman workshop.",
    photos: [photoPath],
  };

  const clientNoPhotos = {
    id: "selftest-client-nophotos",
    name: "Nur Ceramics",
    nameAr: "نور للسيراميك",
    category: "retail",
    brand: {
      colors: ["#1D1027", "#3A2449", "#E3BC72"],
      voiceEn: "quiet, tactile, understated",
      voiceAr: "هادية وبسيطة",
    },
  };
  const productNoPhotos = {
    id: "selftest-product-nophotos",
    nameEn: "Hand-thrown Mug",
    nameAr: "كوب فخار مصنوع باليد",
    priceJod: 12,
    notes: "Stoneware, food-safe glaze, made locally.",
    photos: [],
  };

  const counts = { single: 1, carousel: 1, reel: 1 };

  console.log("=== generateMonth: client WITH photos ===");
  const progressWith = [];
  const resWith = await generateMonth(clientWithPhotos, [productWithPhotos], counts, (p) => progressWith.push(p));
  console.log("progress:", JSON.stringify(progressWith));
  for (const post of resWith.posts) await assertPostHasRealMedia(post, `withPhotos/${post.kind}`);
  if (resWith.log.length) console.log("log:", JSON.stringify(resWith.log, null, 2));

  console.log("\n=== generateMonth: client WITH NO photos (typographic + colour-panel carousel) ===");
  const progressNo = [];
  const resNo = await generateMonth(clientNoPhotos, [productNoPhotos], counts, (p) => progressNo.push(p));
  console.log("progress:", JSON.stringify(progressNo));
  for (const post of resNo.posts) await assertPostHasRealMedia(post, `noPhotos/${post.kind}`);
  if (resNo.log.length) console.log("log:", JSON.stringify(resNo.log, null, 2));

  // Whichever posts DID fail image composition must have an explicit, discoverable
  // reason in the job log (never a silent null) — cross-check imageOk against the log.
  for (const [label, progress, res] of [["withPhotos", progressWith, resWith], ["noPhotos", progressNo, resNo]]) {
    for (const p of progress) {
      if (!p.imageOk) {
        assert(!!p.imageReason, `${label}/${p.kind}: imageOk=false carries a non-empty imageReason ("${p.imageReason}")`);
      }
    }
  }

  console.log("\nCLAUDE_BIN in effect (from env LOOM_CLAUDE_BIN or default):", process.env.LOOM_CLAUDE_BIN || "(default ~/.local/bin/claude)");
  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("generate-month-selftest crashed:", err);
  process.exit(1);
});
