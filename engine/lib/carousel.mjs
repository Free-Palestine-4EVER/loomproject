// engine/lib/carousel.mjs — the seam-aware carousel cutter.
// A carousel is one wide board (a camera pan), not N separate photos: this module
// slices `1080*N x 1350` boards into N 4:5 slides along caller-supplied cut fractions,
// snapping any cut that would land inside a text box to the nearest legal gutter.

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350; // 4:5

/** True if pixel x falls strictly inside box's horizontal span (touching an edge is legal). */
function insideBoxX(x, box) {
  return x > box.x && x < box.x + box.w;
}

function isLegalCut(x, textBoxes) {
  return !textBoxes.some((box) => insideBoxX(x, box));
}

/**
 * Snaps an illegal cut (in pixels) to the nearest legal x, scanning outward in both
 * directions simultaneously so the closer legal gutter always wins. Ties (equal
 * distance both sides) resolve to the left (earlier) gutter, deterministically.
 * Returns { x, shiftedPx } — shiftedPx is 0 if the original cut was already legal.
 */
function snapCutPixel(originalX, textBoxes, boardWidth) {
  const clampedOriginal = Math.max(0, Math.min(boardWidth, originalX));
  if (isLegalCut(clampedOriginal, textBoxes)) {
    return { x: clampedOriginal, shiftedPx: 0 };
  }
  const maxScan = Math.ceil(boardWidth);
  for (let d = 1; d <= maxScan; d++) {
    const left = clampedOriginal - d;
    const right = clampedOriginal + d;
    const leftOk = left >= 0 && isLegalCut(left, textBoxes);
    const rightOk = right <= boardWidth && isLegalCut(right, textBoxes);
    if (leftOk && rightOk) {
      // exact tie in distance — prefer left (earlier) gutter, deterministic.
      return { x: left, shiftedPx: left - clampedOriginal };
    }
    if (leftOk) return { x: left, shiftedPx: left - clampedOriginal };
    if (rightOk) return { x: right, shiftedPx: right - clampedOriginal };
  }
  // No legal gutter anywhere on the board (pathological input) — give back the
  // original position; caller will see a warning either way since nothing moved
  // safely. This should not happen with sane text boxes.
  return { x: clampedOriginal, shiftedPx: 0 };
}

/**
 * Cuts a wide carousel board into N 4:5 slides.
 *
 * @param {object} opts
 * @param {string} [opts.boardPath] - path to the board image (1080*N x 1350).
 * @param {Buffer} [opts.boardBuffer] - board image bytes, alternative to boardPath.
 * @param {number} [opts.N] - number of slides. Inferred from board width / 1080 if omitted.
 * @param {number[]} [opts.cuts] - N-1 interior cut fractions (0..1, exclusive of the
 *   board edges), left to right. Defaults to an even split (i/N) if omitted.
 * @param {{x:number,y:number,w:number,h:number}[]} [opts.textBoxes] - illegal zones,
 *   in board pixel space.
 * @param {string} [opts.outDir] - directory slides are written to. Defaults to a
 *   `slides/` folder next to the board (or a temp-ish sibling when using boardBuffer).
 * @param {string} [opts.baseName] - slide filename stem. Default "slide".
 * @returns {Promise<{slides: string[], adjustedCuts: number[], warnings: string[]}>}
 */
export async function cutCarousel(opts) {
  const {
    boardPath = null,
    boardBuffer = null,
    N: nOpt = null,
    cuts: cutsOpt = null,
    textBoxes = [],
    outDir: outDirOpt = null,
    baseName = "slide",
  } = opts || {};

  if (!boardPath && !boardBuffer) {
    throw new Error("cutCarousel requires boardPath or boardBuffer");
  }

  const warnings = [];
  const image = sharp(boardPath || boardBuffer);
  const meta = await image.metadata();
  const boardWidth = meta.width;
  const boardHeight = meta.height;

  if (!boardWidth || !boardHeight) {
    throw new Error("could not read board dimensions");
  }
  if (boardHeight !== SLIDE_HEIGHT) {
    warnings.push(`board height ${boardHeight}px is not the expected ${SLIDE_HEIGHT}px — slides will be resized to fit 4:5`);
  }

  const inferredN = nOpt || Math.max(1, Math.round(boardWidth / SLIDE_WIDTH));
  if (!nOpt && Math.abs(boardWidth - inferredN * SLIDE_WIDTH) > 2) {
    warnings.push(`board width ${boardWidth}px is not an exact multiple of ${SLIDE_WIDTH}px — inferred N=${inferredN}`);
  }
  const N = inferredN;

  let cutFractions;
  if (Array.isArray(cutsOpt) && cutsOpt.length) {
    cutFractions = [...cutsOpt];
  } else {
    cutFractions = [];
    for (let i = 1; i < N; i++) cutFractions.push(i / N);
  }
  cutFractions.sort((a, b) => a - b);

  // Resolve every interior cut to a snapped pixel position.
  const adjustedPixels = [];
  const adjustedCuts = [];
  for (const frac of cutFractions) {
    const originalPx = frac * boardWidth;
    const { x, shiftedPx } = snapCutPixel(originalPx, textBoxes, boardWidth);
    if (shiftedPx !== 0) {
      const newFrac = x / boardWidth;
      warnings.push(
        `cut at ${frac.toFixed(4)} (${Math.round(originalPx)}px) landed inside a text box — snapped to ${newFrac.toFixed(4)} (${Math.round(x)}px, shift ${shiftedPx > 0 ? "+" : ""}${Math.round(shiftedPx)}px)`
      );
    }
    adjustedPixels.push(x);
    adjustedCuts.push(x / boardWidth);
  }

  // Guard against snapping crossing neighbouring cuts (pathological dense text boxes).
  for (let i = 1; i < adjustedPixels.length; i++) {
    if (adjustedPixels[i] <= adjustedPixels[i - 1]) {
      warnings.push(
        `cut ${i} collided with cut ${i - 1} after snapping (${adjustedPixels[i - 1]}px >= ${adjustedPixels[i]}px) — forcing 1px minimum gap`
      );
      adjustedPixels[i] = adjustedPixels[i - 1] + 1;
      adjustedCuts[i] = adjustedPixels[i] / boardWidth;
    }
  }

  const boundaries = [0, ...adjustedPixels, boardWidth];

  // Resolve output directory.
  let outDir = outDirOpt;
  if (!outDir) {
    outDir = boardPath ? path.join(path.dirname(boardPath), "slides") : path.join(process.cwd(), "engine", "data", "carousel-slides");
  }
  await fs.mkdir(outDir, { recursive: true });

  const ext = (meta.format === "jpeg" ? "jpg" : meta.format) || "png";
  const slides = [];
  const sourceBuffer = boardBuffer || (await fs.readFile(boardPath));

  for (let i = 0; i < boundaries.length - 1; i++) {
    const left = Math.round(boundaries[i]);
    const right = Math.round(boundaries[i + 1]);
    const segmentWidth = Math.max(1, right - left);

    let pipeline = sharp(sourceBuffer).extract({
      left,
      top: 0,
      width: Math.min(segmentWidth, boardWidth - left),
      height: boardHeight,
    });

    // Guarantee a true 4:5 output regardless of segment width (camera-pan cuts
    // are not always exactly 1080px wide).
    if (segmentWidth !== SLIDE_WIDTH || boardHeight !== SLIDE_HEIGHT) {
      pipeline = pipeline.resize(SLIDE_WIDTH, SLIDE_HEIGHT, { fit: "cover", position: "centre" });
    }

    const outPath = path.join(outDir, `${baseName}-${i + 1}.${ext}`);
    if (ext === "jpg") {
      await pipeline.jpeg({ quality: 92 }).toFile(outPath);
    } else {
      await pipeline.toFile(outPath);
    }
    slides.push(outPath);
  }

  return { slides, adjustedCuts, warnings };
}
