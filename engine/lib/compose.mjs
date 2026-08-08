// engine/lib/compose.mjs — honest local image composition with sharp.
// Crops a client product photo to 4:5, lays a brand-colour wash/plate, then a text
// plate with the headline. If a client has no usable photo, produces a typographic
// post from brand colours instead. Never calls out to an image model.

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

export const POST_WIDTH = 1080;
export const POST_HEIGHT = 1350; // 4:5

const FALLBACK_PALETTE = ["#130A1B", "#1D1027", "#FF3D9A"];

const ARABIC_RANGE = /[؀-ۿݐ-ݿ]/;

function isArabicText(s) {
  return typeof s === "string" && ARABIC_RANGE.test(s);
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Very rough glyph-width heuristic (no text-measurement lib available offline). */
function estCharWidth(fontSize, arabic) {
  return fontSize * (arabic ? 0.56 : 0.58);
}

/**
 * Greedy word-wrap by estimated pixel width. Works for both Latin and Arabic —
 * word order in the source string is already correct logical order, wrapping just
 * decides where line breaks fall; the SVG renderer handles bidi shaping per line.
 */
function wrapText(text, { maxWidth, fontSize, arabic }) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const charW = estCharWidth(fontSize, arabic);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charW > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Builds an SVG text block. Arabic renders right-to-left correctly by leaning on
 * the Unicode bidi algorithm + HarfBuzz shaping that librsvg already applies to
 * Arabic codepoints — explicit direction="rtl" attributes fight that shaping and
 * mis-position the run, so we deliberately do NOT set them. text-anchor placement
 * (end = right edge for Arabic, start = left edge for English) is what controls
 * visual alignment.
 */
function textBlockSvg({ lines, x, fontSize, lineHeight, fill, anchor, fontFamily, weight = 700, startY }) {
  const tspans = lines
    .map((line, i) => `<tspan x="${x}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<text font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${tspans}</text>`;
}

function fontStackFor(arabic) {
  // sharp/librsvg resolves through fontconfig; give it a wide fallback stack so
  // whatever Arabic-capable face the host has (Geeza Pro / Al Bayan / Noto on
  // most machines this ships to) gets picked automatically.
  return arabic
    ? "'Geeza Pro', 'Al Bayan', 'Noto Sans Arabic', 'Arial', sans-serif"
    : "'Helvetica Neue', 'Arial', sans-serif";
}

/**
 * Renders the bilingual headline text plate as a PNG buffer at POST_WIDTH x plateHeight.
 * English sits first (top), Arabic peer line under it, each block laid out for its
 * own script direction. Either may be omitted.
 */
async function renderTextPlate({ headlineEn, headlineAr, width = POST_WIDTH, ink = "#F4EAF8", padding = 64 }) {
  const fontSizeEn = 52;
  const fontSizeAr = 56;
  const lineHeightEn = Math.round(fontSizeEn * 1.18);
  const lineHeightAr = Math.round(fontSizeAr * 1.3);
  const maxTextWidth = width - padding * 2;

  const linesEn = headlineEn ? wrapText(headlineEn, { maxWidth: maxTextWidth, fontSize: fontSizeEn, arabic: false }) : [];
  const linesAr = headlineAr ? wrapText(headlineAr, { maxWidth: maxTextWidth, fontSize: fontSizeAr, arabic: true }) : [];

  const blockGap = linesEn.length && linesAr.length ? 28 : 0;
  const enHeight = linesEn.length * lineHeightEn;
  const arHeight = linesAr.length * lineHeightAr;
  const height = padding * 2 + enHeight + blockGap + arHeight || 1;

  // blockTop tracks the top (not baseline) of each language block; the first
  // line's baseline sits one lineHeight below that top, which keeps ascenders
  // clear of the block's top edge without any fragile cross-block correction.
  let blockTop = padding;
  const parts = [];
  if (linesEn.length) {
    parts.push(
      textBlockSvg({
        lines: linesEn,
        x: padding,
        fontSize: fontSizeEn,
        lineHeight: lineHeightEn,
        fill: ink,
        anchor: "start",
        fontFamily: fontStackFor(false),
        startY: blockTop + lineHeightEn,
      })
    );
    blockTop += enHeight + blockGap;
  }
  if (linesAr.length) {
    parts.push(
      textBlockSvg({
        lines: linesAr,
        x: width - padding,
        fontSize: fontSizeAr,
        lineHeight: lineHeightAr,
        fill: ink,
        anchor: "end",
        fontFamily: fontStackFor(true),
        startY: blockTop + lineHeightAr,
      })
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(height)}">
    ${parts.join("\n")}
  </svg>`;

  return { buffer: Buffer.from(svg), width, height: Math.round(height) };
}

/**
 * Crops/covers a source photo to POST_WIDTH x POST_HEIGHT (4:5).
 */
async function cropToPost(input) {
  return sharp(input)
    .resize(POST_WIDTH, POST_HEIGHT, { fit: "cover", position: "attention" })
    .toBuffer();
}

/**
 * Flat brand-colour wash overlay (bottom-weighted gradient so a text plate sitting
 * at the bottom stays legible over a busy photo) as an SVG buffer.
 */
function washSvg({ width, height, color, opacity = 0.55 }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0" />
        <stop offset="55%" stop-color="${color}" stop-opacity="0" />
        <stop offset="100%" stop-color="${color}" stop-opacity="${opacity}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#wash)" />
  </svg>`);
}

function solidPlateSvg({ width, height, color, opacity = 0.92 }) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}" fill-opacity="${opacity}" /></svg>`
  );
}

function pickBrandColors(client) {
  const colors = client?.brand?.colors;
  return Array.isArray(colors) && colors.length ? colors : FALLBACK_PALETTE;
}

/** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb hex colour by `amt` (0..1). */
function shadeHex(hex, amt) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
  if (!m) return hex || "#888888";
  const target = amt >= 0 ? 255 : 0;
  const blend = (c) => Math.round(c + (target - c) * Math.abs(amt));
  const toHex = (n) => n.toString(16).padStart(2, "0");
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => blend(parseInt(h, 16)));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Flat-colour panel (diagonal two-tone) used as a slide filler when no photo exists. */
function panelSvg({ width, height, colorA, colorB }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colorA}" />
        <stop offset="100%" stop-color="${colorB}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#panel)" />
  </svg>`);
}

/**
 * Composes a post from a client product photo: crop to 4:5, brand-colour wash,
 * text plate with the headline at the bottom.
 *
 * @param {object} opts
 * @param {string|Buffer} opts.photo - path or buffer of the source product photo.
 * @param {object} opts.client - client record (used for brand colours).
 * @param {{headlineEn?:string, headlineAr?:string}} opts.headline
 * @param {string} [opts.outPath] - if given, write PNG here and return the path too.
 */
export async function composeProductPost({ photo, client, headline = {}, outPath }) {
  if (!photo) throw new Error("composeProductPost requires a photo");
  const [washColor, plateColor] = pickBrandColors(client);

  const cropped = await cropToPost(photo);
  const wash = washSvg({ width: POST_WIDTH, height: POST_HEIGHT, color: washColor || FALLBACK_PALETTE[0] });

  const plate = await renderTextPlate({
    headlineEn: headline.headlineEn,
    headlineAr: headline.headlineAr,
  });
  const plateBg = solidPlateSvg({ width: plate.width, height: plate.height, color: plateColor || FALLBACK_PALETTE[1] });

  const composited = sharp(cropped).composite([
    { input: wash, top: 0, left: 0 },
    { input: plateBg, top: POST_HEIGHT - plate.height, left: 0 },
    { input: plate.buffer, top: POST_HEIGHT - plate.height, left: 0 },
  ]);

  return finalize(composited, outPath, "photo");
}

/**
 * Composes a typographic post (no product photo available): a flat/gradient brand
 * background with the headline set large and centred.
 */
export async function composeTypographicPost({ client, headline = {}, outPath }) {
  const colors = pickBrandColors(client);
  const bg = colors[0] || FALLBACK_PALETTE[0];
  const ink = colors[2] || colors[1] || FALLBACK_PALETTE[2];
  const accent = colors[1] || FALLBACK_PALETTE[1];

  const bgSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${POST_WIDTH}" height="${POST_HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}" />
        <stop offset="100%" stop-color="${accent}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)" />
  </svg>`);

  const plate = await renderTextPlate({
    headlineEn: headline.headlineEn,
    headlineAr: headline.headlineAr,
    ink,
    padding: 80,
  });

  const top = Math.max(0, Math.round((POST_HEIGHT - plate.height) / 2));
  const composited = sharp(bgSvg).composite([{ input: plate.buffer, top, left: 0 }]);

  return finalize(composited, outPath, "typographic");
}

async function finalize(pipeline, outPath, kind) {
  const buffer = await pipeline.png().toBuffer();
  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, buffer);
    return { path: outPath, buffer, kind, width: POST_WIDTH, height: POST_HEIGHT };
  }
  return { path: null, buffer, kind, width: POST_WIDTH, height: POST_HEIGHT };
}

/**
 * Top-level dispatcher: uses the client's first available product photo if one
 * exists and is readable on disk, otherwise falls back to a typographic post.
 * Never throws for a missing photo — that's the expected, documented fallback.
 *
 * @param {object} client
 * @param {object|null} product - product record with `photos: [path]`, or null.
 * @param {{headlineEn?:string, headlineAr?:string}} headline
 * @param {string} [outPath]
 */
export async function composePost(client, product, headline = {}, outPath) {
  const candidate = product?.photos?.[0];
  if (candidate) {
    try {
      await fs.access(candidate);
      return await composeProductPost({ photo: candidate, client, headline, outPath });
    } catch {
      // fall through to typographic — file listed but not readable is still
      // "no usable photo" from this module's point of view.
    }
  }
  return composeTypographicPost({ client, headline, outPath });
}

/**
 * Builds the wide carousel board a carousel post's slides get cut from — the
 * "camera pan" board, `POST_WIDTH*N x POST_HEIGHT`. Each of the N slots is filled
 * from the product's own photos (cycling if there are fewer photos than slots);
 * with no usable photos at all it falls back to brand-colour panels, one shade
 * pair per slot, so the pan still reads as a sequence rather than a repeat. A
 * single headline text plate sits on the first slot (board-space pixels), and
 * its bounding box is returned as `textBoxes` so the caller can hand it straight
 * to `cutCarousel`'s seam-safety check.
 *
 * A single bad/missing photo degrades that one slot to a colour panel rather
 * than failing the whole board — this function does not throw for photo I/O
 * errors, only for genuinely fatal sharp/IO failures (e.g. an unwritable outPath).
 *
 * @param {object} opts
 * @param {object} opts.client
 * @param {object|null} opts.product - product record with `photos: [path]`, or null.
 * @param {{headlineEn?:string, headlineAr?:string}} [opts.headline]
 * @param {number} [opts.N] - number of slides. Default 3.
 * @param {string} [opts.outPath] - if given, write the board PNG here.
 * @returns {Promise<{path:string|null, buffer:Buffer, width:number, height:number, textBoxes:{x:number,y:number,w:number,h:number}[]}>}
 */
export async function composeCarouselBoard({ client, product, headline = {}, N = 3, outPath }) {
  const slides = Math.max(2, Math.round(N) || 3);
  const colors = pickBrandColors(client);
  const boardWidth = POST_WIDTH * slides;
  const boardHeight = POST_HEIGHT;
  const photos = Array.isArray(product?.photos) ? product.photos.filter(Boolean) : [];

  const sliceBuffers = [];
  for (let i = 0; i < slides; i++) {
    let sliceBuffer = null;
    if (photos.length) {
      const candidate = photos[i % photos.length];
      try {
        sliceBuffer = await cropToPost(candidate);
      } catch {
        sliceBuffer = null; // one bad photo -> this slot falls back to a panel below
      }
    }
    if (!sliceBuffer) {
      const base = colors[i % colors.length] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
      const alt = shadeHex(base, i % 2 === 0 ? 0.16 : -0.16);
      sliceBuffer = await sharp(panelSvg({ width: POST_WIDTH, height: POST_HEIGHT, colorA: base, colorB: alt })).png().toBuffer();
    }
    sliceBuffers.push(sliceBuffer);
  }

  const composites = sliceBuffers.map((buf, i) => ({ input: buf, left: i * POST_WIDTH, top: 0 }));

  // Brand wash across the whole board for text legibility over photo content.
  composites.push({
    input: washSvg({ width: boardWidth, height: boardHeight, color: colors[0] || FALLBACK_PALETTE[0] }),
    left: 0,
    top: 0,
  });

  const plate = await renderTextPlate({ headlineEn: headline.headlineEn, headlineAr: headline.headlineAr });
  const plateTop = boardHeight - plate.height;
  const textBoxes = [];
  if (plate.height > 0 && (headline.headlineEn || headline.headlineAr)) {
    const plateBg = solidPlateSvg({ width: plate.width, height: plate.height, color: colors[1] || FALLBACK_PALETTE[1] });
    composites.push({ input: plateBg, left: 0, top: plateTop });
    composites.push({ input: plate.buffer, left: 0, top: plateTop });
    textBoxes.push({ x: 0, y: plateTop, w: plate.width, h: plate.height });
  }

  const board = sharp({
    create: { width: boardWidth, height: boardHeight, channels: 4, background: colors[0] || FALLBACK_PALETTE[0] },
  }).composite(composites);

  const buffer = await board.png().toBuffer();

  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, buffer);
    return { path: outPath, buffer, width: boardWidth, height: boardHeight, textBoxes };
  }
  return { path: null, buffer, width: boardWidth, height: boardHeight, textBoxes };
}

export { isArabicText, wrapText };
