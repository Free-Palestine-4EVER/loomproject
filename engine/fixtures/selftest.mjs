// engine/fixtures/selftest.mjs — self-test for carousel.mjs (seam-snap) and
// compose.mjs (photo + typographic composition). Generates all fixture images
// itself with sharp; nothing is downloaded. Run with:
//   node engine/fixtures/selftest.mjs
// Exits non-zero on any assertion failure.

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { cutCarousel, SLIDE_WIDTH, SLIDE_HEIGHT } from "../lib/carousel.mjs";
import { composeProductPost, composeTypographicPost, composePost } from "../lib/compose.mjs";

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

async function makeTestBoard(N = 3) {
  const width = SLIDE_WIDTH * N;
  const height = SLIDE_HEIGHT;
  // Three colour bands so it's visually obvious where each slide's content sits,
  // plus a vertical marker line at each even 1/N gutter for reference.
  const bands = [];
  const colors = ["#2C5F7A", "#7A5F2C", "#5F2C7A", "#2C7A5F", "#7A2C5F"];
  for (let i = 0; i < N; i++) {
    bands.push(
      `<rect x="${i * SLIDE_WIDTH}" y="0" width="${SLIDE_WIDTH}" height="${height}" fill="${colors[i % colors.length]}" />`
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${bands.join("\n")}
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, width, height };
}

async function makeTestPhoto() {
  // Stand-in "client product photo": a warm gradient with a soft circular
  // highlight, big enough to exercise the 4:5 cover-crop.
  const w = 1600, h = 1200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="g" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stop-color="#E9C7A0" />
        <stop offset="100%" stop-color="#6B3F2A" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <circle cx="${w * 0.5}" cy="${h * 0.42}" r="${h * 0.22}" fill="#F4EAF8" opacity="0.35" />
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function testCarouselSeamSnap() {
  console.log("\n-- carousel.mjs: seam-aware cutter --");
  const N = 3;
  const { buffer, width, height } = await makeTestBoard(N);
  const boardPath = path.join(OUT_DIR, "board.png");
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(boardPath, buffer);
  assert(width === SLIDE_WIDTH * N, `test board width is ${SLIDE_WIDTH}*${N} = ${SLIDE_WIDTH * N}px (got ${width})`);
  assert(height === SLIDE_HEIGHT, `test board height is ${SLIDE_HEIGHT}px (got ${height})`);

  // Even split would put an interior cut at 1/3 and 2/3. Deliberately place a
  // text box straddling the 1/3 gutter (x in board pixels) so that cut is illegal.
  const illegalCutFraction = 1 / 3;
  const illegalCutPx = illegalCutFraction * width; // 1080px
  const textBox = { x: illegalCutPx - 120, y: 900, w: 240, h: 300 }; // spans 960..1200px, straddles 1080px
  const legalCutFraction = 2 / 3;

  const result = await cutCarousel({
    boardPath,
    N,
    cuts: [illegalCutFraction, legalCutFraction],
    textBoxes: [textBox],
    outDir: path.join(OUT_DIR, "slides"),
    baseName: "test",
  });

  console.log("cutCarousel result:", JSON.stringify({ adjustedCuts: result.adjustedCuts, warnings: result.warnings }, null, 2));

  assert(result.slides.length === N, `cutCarousel returned ${N} slides (got ${result.slides.length})`);
  assert(result.warnings.length >= 1, "at least one seam-safety warning was recorded for the illegal cut");
  assert(
    Math.abs(result.adjustedCuts[0] - illegalCutFraction) > 1e-6,
    `first cut was moved off its illegal original fraction (was ${illegalCutFraction}, now ${result.adjustedCuts[0]})`
  );
  const adjustedPx0 = result.adjustedCuts[0] * width;
  const stillInsideBox = adjustedPx0 > textBox.x && adjustedPx0 < textBox.x + textBox.w;
  assert(!stillInsideBox, `adjusted first cut (${adjustedPx0.toFixed(1)}px) is now OUTSIDE the illegal text box [${textBox.x}, ${textBox.x + textBox.w}]`);
  assert(
    Math.abs(result.adjustedCuts[1] - legalCutFraction) < 1e-6,
    `second (already-legal) cut was left untouched (was ${legalCutFraction}, now ${result.adjustedCuts[1]})`
  );

  for (const slidePath of result.slides) {
    const meta = await sharp(slidePath).metadata();
    assert(
      meta.width === SLIDE_WIDTH && meta.height === SLIDE_HEIGHT,
      `slide ${path.basename(slidePath)} is ${SLIDE_WIDTH}x${SLIDE_HEIGHT} (got ${meta.width}x${meta.height})`
    );
  }

  return result;
}

async function testComposePhoto() {
  console.log("\n-- compose.mjs: product photo composition --");
  const photoBuffer = await makeTestPhoto();
  const photoPath = path.join(OUT_DIR, "product-photo.jpg");
  await fs.writeFile(photoPath, photoBuffer);

  const client = {
    name: "Sundus Home",
    nameAr: "بيت سندس",
    brand: { colors: ["#130A1B", "#3A2449", "#FF3D9A"] },
  };
  const headline = {
    headlineEn: "The chair that finishes the room",
    headlineAr: "الكرسي يلي بيكمل الصالة",
  };

  const outPath = path.join(OUT_DIR, "compose-photo.png");
  const res = await composeProductPost({ photo: photoPath, client, headline, outPath });
  const meta = await sharp(res.path).metadata();
  assert(meta.width === 1080 && meta.height === 1350, `photo post is 1080x1350 (got ${meta.width}x${meta.height})`);
  assert(res.kind === "photo", "composeProductPost reports kind:photo");
  console.log("wrote", outPath);
  return res;
}

async function testComposeTypographic() {
  console.log("\n-- compose.mjs: typographic fallback (no photo) --");
  const client = {
    name: "Sundus Home",
    nameAr: "بيت سندس",
    brand: { colors: ["#1D1027", "#3A2449", "#E3BC72"] },
  };
  const headline = {
    headlineEn: "New this week",
    headlineAr: "جديدنا هالأسبوع",
  };
  const outPath = path.join(OUT_DIR, "compose-typographic.png");
  const res = await composeTypographicPost({ client, headline, outPath });
  const meta = await sharp(res.path).metadata();
  assert(meta.width === 1080 && meta.height === 1350, `typographic post is 1080x1350 (got ${meta.width}x${meta.height})`);
  assert(res.kind === "typographic", "composeTypographicPost reports kind:typographic");
  console.log("wrote", outPath);

  // composePost dispatcher with a product that has no photos at all must also
  // fall back to typographic, never throw.
  const dispatchOut = path.join(OUT_DIR, "compose-dispatch-nophoto.png");
  const dispatchRes = await composePost(client, { photos: [] }, headline, dispatchOut);
  assert(dispatchRes.kind === "typographic", "composePost falls back to typographic when product has no photos");
  return res;
}

async function main() {
  await testCarouselSeamSnap();
  await testComposePhoto();
  await testComposeTypographic();

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  console.log(`fixtures written to ${OUT_DIR}`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("selftest crashed:", err);
  process.exit(1);
});
