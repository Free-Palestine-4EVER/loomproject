// engine/lib/generate.mjs — text generation via the local `claude` CLI (never an API key),
// PLUS the image side of a post: after captions come back, this module composes the
// real image (or, for carousels, the real board + cut slides) via compose.mjs and
// carousel.mjs so a generated post is never text-only. Same never-throw discipline
// throughout — one bad photo or a missing `claude` binary degrades a single post, it
// never kills a month.

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captionPrompt } from "./prompts.mjs";
import { composePost, composeCarouselBoard } from "./compose.mjs";
import { cutCarousel } from "./carousel.mjs";

const CLAUDE_BIN = process.env.LOOM_CLAUDE_BIN || path.join(os.homedir(), ".local", "bin", "claude");
const TIMEOUT_MS = 120_000;
const MAX_BUFFER = 20 * 1024 * 1024;

// engine/data/media/<clientId>/ — same "under engine/data/" convention store.mjs
// uses for JSON collections, resolved relative to this file so it's correct
// regardless of the caller's cwd.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MEDIA_ROOT = path.resolve(HERE, "..", "data", "media");
const DEFAULT_CAROUSEL_SLIDES = 3;

/** Clearly-labelled placeholder captions, used whenever generation fails for any reason. */
function placeholderCaptions(client, product, kind, reason) {
  const name = product?.nameEn || product?.nameAr || "this product";
  const nameAr = product?.nameAr || product?.nameEn || "المنتج";
  return {
    captionEn: `[PLACEHOLDER — generation failed: ${reason}] ${name} — caption pending, needs a human pass.`,
    captionAr: `[نص مؤقت — فشل التوليد: ${reason}] ${nameAr} — بانتظار كتابة يدوية.`,
    hashtags: ["placeholder"],
    _placeholder: true,
    _reason: reason,
    _kind: kind,
  };
}

/**
 * Runs `claude -p <prompt> --output-format json` and returns the raw stdout string.
 * Rejects with a short, human-readable reason string (never throws an Error object
 * the caller has to inspect) so callers can log it directly.
 */
function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = execFile(
        CLAUDE_BIN,
        ["-p", prompt, "--output-format", "json"],
        { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] },
        (err, stdout) => {
          if (err) {
            if (err.killed || err.signal === "SIGTERM") {
              reject(`timeout after ${TIMEOUT_MS}ms`);
            } else if (err.code === "ENOENT") {
              reject("claude CLI not found");
            } else {
              reject(`claude exited with error: ${String(err.message || err).slice(0, 300)}`);
            }
            return;
          }
          resolve(stdout);
        }
      );
    } catch (spawnErr) {
      reject(`spawn failed: ${String(spawnErr?.message || spawnErr).slice(0, 300)}`);
      return;
    }
    if (child && typeof child.on === "function") {
      child.on("error", (e) => {
        // ENOENT and similar surface here when execFile can't even launch the binary.
        reject(e?.code === "ENOENT" ? "claude CLI not found" : `spawn error: ${String(e?.message || e).slice(0, 300)}`);
      });
    }
  });
}

/**
 * Defensively parses the `claude --output-format json` envelope and pulls out the
 * inner JSON payload the prompt asked for. Handles: missing `result` field, `result`
 * wrapped in markdown code fences, and non-JSON `result` text.
 */
function parseClaudeOutput(stdout) {
  let envelope;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error("outer output was not valid JSON");
  }
  if (envelope && envelope.is_error) {
    throw new Error(`claude reported is_error: ${envelope.result || "unknown"}`);
  }
  const resultText = typeof envelope?.result === "string" ? envelope.result : null;
  if (!resultText) {
    throw new Error("no result field in claude output");
  }
  const cleaned = resultText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("inner result was not valid JSON");
  }
}

/**
 * Generates captions for one product/kind. Never throws — on any failure returns a
 * placeholder object with `_placeholder: true` and `_reason` set, and appends a
 * structured entry to `log` if a log array is passed in.
 */
export async function generateCaptions(client, product, kind = "single", opts = {}) {
  const { log = null } = opts;
  const prompt = captionPrompt(client, product, kind);

  let stdout;
  try {
    stdout = await runClaude(prompt);
  } catch (reason) {
    log?.push({ at: new Date().toISOString(), level: "error", message: `generateCaptions spawn failed: ${reason}`, clientId: client?.id, kind });
    return placeholderCaptions(client, product, kind, reason);
  }

  let parsed;
  try {
    parsed = parseClaudeOutput(stdout);
  } catch (parseErr) {
    const reason = parseErr?.message || "unparseable output";
    log?.push({ at: new Date().toISOString(), level: "error", message: `generateCaptions parse failed: ${reason}`, clientId: client?.id, kind });
    return placeholderCaptions(client, product, kind, reason);
  }

  if (typeof parsed?.captionEn !== "string" || typeof parsed?.captionAr !== "string") {
    const reason = "missing captionEn/captionAr in parsed JSON";
    log?.push({ at: new Date().toISOString(), level: "error", message: `generateCaptions shape invalid: ${reason}`, clientId: client?.id, kind });
    return placeholderCaptions(client, product, kind, reason);
  }

  return {
    captionEn: parsed.captionEn,
    captionAr: parsed.captionAr,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((h) => typeof h === "string") : [],
    _placeholder: false,
  };
}

/** First few words of `text`, used as the short on-image headline. Never invents
 * anything — it is a truncation of already-generated (or already-approved, for
 * regeneration) copy, not a new claim. */
function shortHeadline(text, maxWords = 7) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words.slice(0, maxWords).join(" ");
}

/** Picks the headline pair to put on a freshly-generated post's image. If caption
 * generation itself fell back to a placeholder, the placeholder's bracketed error
 * text ("[PLACEHOLDER — generation failed: ...]") must never end up rendered on
 * the image — fall back to the product/client name instead, which is real. */
function headlineForCaptions(captions, product, client) {
  if (!captions || captions._placeholder) {
    return {
      headlineEn: product?.nameEn || client?.name || "New post",
      headlineAr: product?.nameAr || client?.nameAr || "منشور جديد",
    };
  }
  return {
    headlineEn: shortHeadline(captions.captionEn) || product?.nameEn || client?.name || "New post",
    headlineAr: shortHeadline(captions.captionAr) || product?.nameAr || client?.nameAr || "منشور جديد",
  };
}

async function ensureMediaDir(clientId) {
  const dir = path.join(MEDIA_ROOT, String(clientId || "unassigned"));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Shared image-composition core for one post. Never throws: on any failure it
 * logs the reason and returns `{ image: null, carousel: null, ok: false, reason }`
 * so the caller can leave the post as a draft with a documented cause instead of
 * losing the whole batch.
 */
async function composeImageForPost({ client, product, kind, headline, mediaDir, stamp, carouselSlides, log }) {
  const at = () => new Date().toISOString();
  if (kind === "carousel") {
    try {
      const boardPath = path.join(mediaDir, `carousel-${stamp}-board.png`);
      const board = await composeCarouselBoard({ client, product, headline, N: carouselSlides, outPath: boardPath });
      const cut = await cutCarousel({
        boardPath,
        N: carouselSlides,
        textBoxes: board.textBoxes,
        outDir: path.join(mediaDir, `carousel-${stamp}-slides`),
        baseName: "slide",
      });
      if (cut.warnings.length) {
        log?.push({ at: at(), level: "warn", message: `carousel seam-snap: ${cut.warnings.join("; ")}`, clientId: client?.id, stamp });
      }
      return { image: null, carousel: { boardPath, cuts: cut.adjustedCuts, slides: cut.slides }, ok: true, reason: null };
    } catch (err) {
      const reason = String(err?.message || err).slice(0, 300);
      log?.push({ at: at(), level: "error", message: `carousel composition failed: ${reason}`, clientId: client?.id, stamp });
      return { image: null, carousel: null, ok: false, reason };
    }
  }

  try {
    const outPath = path.join(mediaDir, `${kind}-${stamp}.png`);
    const res = await composePost(client, product, headline, outPath);
    return { image: res.path, carousel: null, ok: true, reason: null };
  } catch (err) {
    const reason = String(err?.message || err).slice(0, 300);
    log?.push({ at: at(), level: "error", message: `image composition failed: ${reason}`, clientId: client?.id, kind, stamp });
    return { image: null, carousel: null, ok: false, reason };
  }
}

/**
 * Generates a month's worth of posts — captions AND images — across a product list.
 * counts: { single: n, carousel: n, reel: n } — how many posts of each kind to make,
 * cycling through `products` (round-robin) so every product gets coverage.
 * onProgress(update) is called after every post:
 *   { done, total, kind, productId, ok, imageOk, imageReason }
 * `ok` reports caption success, `imageOk` reports image/carousel composition
 * success (they're independent — a placeholder caption still gets a real composed
 * image, and a bad photo still gets real captions).
 * Returns { posts: [{ kind, product, captions, image, carousel }], log: [...] } —
 * never throws.
 */
export async function generateMonth(client, products, counts = {}, onProgress = () => {}) {
  const log = [];
  const plan = [];
  const kinds = ["single", "carousel", "reel"];
  for (const kind of kinds) {
    const n = Number(counts[kind]) || 0;
    for (let i = 0; i < n; i++) plan.push(kind);
  }

  if (!Array.isArray(products) || products.length === 0) {
    log.push({ at: new Date().toISOString(), level: "warn", message: "generateMonth called with no products — will use null product for every post (typographic fallback territory)" });
  }

  const mediaDir = await ensureMediaDir(client?.id);

  const posts = [];
  const total = plan.length;
  for (let i = 0; i < plan.length; i++) {
    const kind = plan[i];
    const product = products && products.length ? products[i % products.length] : null;
    const captions = await generateCaptions(client, product, kind, { log });
    const headline = headlineForCaptions(captions, product, client);
    const stamp = `${String(i + 1).padStart(2, "0")}-${randomUUID().slice(0, 8)}`;

    const img = await composeImageForPost({
      client,
      product,
      kind,
      headline,
      mediaDir,
      stamp,
      carouselSlides: DEFAULT_CAROUSEL_SLIDES,
      log,
    });

    posts.push({ kind, product, captions, image: img.image, carousel: img.carousel });
    onProgress({
      done: i + 1,
      total,
      kind,
      productId: product?.id ?? null,
      ok: !captions._placeholder,
      imageOk: img.ok,
      imageReason: img.reason,
    });
  }

  return { posts, log };
}

/**
 * Regenerates just the image (or carousel) for one existing post — what the
 * server's `POST /api/posts/:id/regenerate` route with `what:"image"` calls.
 * Reads `post.captionEn`/`post.captionAr` (already-generated/approved copy) to
 * derive the on-image headline, so it never needs another `claude` call.
 *
 * @param {object} client
 * @param {object|null} product
 * @param {object} post - existing post record; needs at least { kind, captionEn, captionAr, id? }
 * @param {{log?: object[], carouselSlides?: number}} [opts]
 * @returns {Promise<{image: string|null, carousel: object|null, ok: boolean, reason: string|null}>}
 *   Never throws.
 */
export async function regenerateImage(client, product, post, opts = {}) {
  const { log = null, carouselSlides = DEFAULT_CAROUSEL_SLIDES } = opts;
  const kind = post?.kind || "single";
  const headline = {
    headlineEn: shortHeadline(post?.captionEn) || product?.nameEn || client?.name || "New post",
    headlineAr: shortHeadline(post?.captionAr) || product?.nameAr || client?.nameAr || "منشور جديد",
  };

  let mediaDir;
  try {
    mediaDir = await ensureMediaDir(client?.id);
  } catch (err) {
    const reason = `could not create media dir: ${String(err?.message || err).slice(0, 300)}`;
    log?.push({ at: new Date().toISOString(), level: "error", message: `regenerateImage: ${reason}`, clientId: client?.id, postId: post?.id });
    return { image: null, carousel: null, ok: false, reason };
  }

  const stamp = post?.id ? `${post.id}-${randomUUID().slice(0, 6)}` : randomUUID().slice(0, 8);
  return composeImageForPost({ client, product, kind, headline, mediaDir, stamp, carouselSlides, log });
}
