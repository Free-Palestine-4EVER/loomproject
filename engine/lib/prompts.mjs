// engine/lib/prompts.mjs — prompt templates fed to the local `claude` CLI for caption generation.
// Arabic is written natively for the Jordanian market (never translated from English);
// English is a peer caption, not a translation of the Arabic. No invented facts.

/**
 * Shared rules block injected into every caption prompt. Keeps the "never invent
 * facts" constraint in one place so it can't drift between kinds.
 */
function factsBlock(product) {
  const facts = [];
  if (product?.nameEn || product?.nameAr) {
    facts.push(`Product name: ${product?.nameEn || "(no English name given)"} / ${product?.nameAr || "(no Arabic name given)"}`);
  }
  if (product?.priceJod != null) {
    facts.push(`Price: ${product.priceJod} JOD — only mention this price, never invent or round a different one.`);
  } else {
    facts.push(`No price was supplied — do NOT state or imply a price.`);
  }
  if (product?.notes) {
    facts.push(`Notes from the client (only verified source of extra facts): ${product.notes}`);
  }
  return facts.join("\n");
}

const HARD_RULES = `Hard rules, no exceptions:
- Do not invent product facts, specs, materials, prices, awards, ratings, or claims of any kind
  that are not explicitly present in the product record or notes below.
- Never write superlatives implying rank or comparison ("the best in Jordan", "#1", "award-winning",
  "most trusted") unless that exact claim appears in the supplied notes.
- If a price is not supplied, never state or imply one (not "affordable", not "cheap", not a number).
- Arabic must be written natively for a Jordanian audience — colloquial Ammani-inflected register
  is fine, not stiff Modern Standard Arabic, and NOT a literal translation of the English caption.
- English is its own peer caption speaking to the same product — it should feel independently
  written, not a translation of the Arabic line either.
- Keep captions postable as-is: no placeholder brackets, no "[insert X]", no markdown.
- Output ONLY the JSON object described — no preamble, no explanation, no code fences.`;

/**
 * generateCaptions prompt — client + product + post kind -> a single post's captions.
 * kind: "single" | "carousel" | "reel"
 */
export function captionPrompt(client, product, kind = "single") {
  const brand = client?.brand || {};
  const voiceEn = brand.voiceEn || "warm, direct, no corporate filler";
  const voiceAr = brand.voiceAr || "لهجة أردنية طبيعية، ودودة ومباشرة";
  const category = client?.category || "general";

  const kindNote = {
    single: "This is a single-image feed post. One clear idea, one clear line.",
    carousel: "This is a multi-slide carousel. Write a hook-style opening caption that works " +
      "standalone (do not reference 'swipe' mechanics unless natural) — slide copy is handled elsewhere.",
    reel: "This is a short-form video reel. Caption should read as a hook + short payoff, " +
      "written for a feed scroll, not a paragraph.",
  }[kind] || "This is a feed post.";

  return `You are writing one Instagram post's bilingual caption for a Jordanian brand, as part of
LOOM's content pipeline ("${"المصنع"}"). You write real, postable captions — not templates.

Brand: ${client?.name || "(unnamed)"} / ${client?.nameAr || ""}
Category: ${category}
Brand voice (English direction): ${voiceEn}
Brand voice (Arabic direction): ${voiceAr}
Post kind: ${kind} — ${kindNote}

Product record (the ONLY source of facts you may use):
${factsBlock(product)}

${HARD_RULES}

Return exactly this JSON shape:
{
  "captionEn": "the English caption, ready to post",
  "captionAr": "the Arabic caption, ready to post, written natively not translated",
  "hashtags": ["lowercase", "no # symbol", "5 to 8 tags mixing brand, category, city"]
}`;
}

/**
 * generateMonth prompt-building is just repeated captionPrompt calls per product/kind —
 * no separate template needed; generate.mjs drives the loop and calls captionPrompt.
 */

/**
 * Typographic-post headline prompt — used by compose.mjs's caller when a client has no
 * product photos and we need a short on-brand headline instead of a photo caption.
 */
export function headlinePrompt(client, product) {
  const brand = client?.brand || {};
  return `Write a very short on-brand headline pair for a typographic Instagram post (no photo,
just brand colours and type) for a Jordanian brand.

Brand: ${client?.name || "(unnamed)"} / ${client?.nameAr || ""}
Category: ${client?.category || "general"}
Brand voice (English direction): ${brand.voiceEn || "warm, direct, no corporate filler"}
Brand voice (Arabic direction): ${brand.voiceAr || "لهجة أردنية طبيعية، ودودة ومباشرة"}

Product record (the ONLY source of facts you may use):
${factsBlock(product)}

${HARD_RULES}
Additional rule: headlines must be SHORT — under 6 words English, under 6 words Arabic. This is
type on a coloured plate, not a caption.

Return exactly this JSON shape:
{
  "headlineEn": "short headline",
  "headlineAr": "short headline, written natively not translated"
}`;
}
