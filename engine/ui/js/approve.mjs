// engine/ui/js/approve.mjs — client approval page logic. No auth: the token in the URL is the
// entire access control, per product decision in engine/SPEC.md. Renders only what a client
// should see — never cost, margin, or how the content was produced.

import { api } from "./api.mjs";
import { monthLabel, escapeHtml } from "./format.mjs";

const STR = {
  ar: {
    loading: "...جاري التحميل",
    notFound: "الرابط غير صالح أو منتهي",
    error: "تعذر تحميل المحتوى",
    empty: "لا يوجد محتوى لهذا الشهر بعد",
    intro: "راجعوا محتوى هذا الشهر — اضغطوا على أي منشور لعرضه ثم وافقوا أو اعترضوا",
    reviewed: (done, total) => `تمت مراجعة ${done} من ${total}`,
    yes: "موافق",
    no: "اعتراض",
    notePlaceholder: "ملاحظة (اختياري)",
    saved: "تم الحفظ",
    saving: "...جاري الحفظ",
    saveFailed: "تعذر الحفظ، حاول مجددًا",
    close: "إغلاق",
    slide: "شريحة",
  },
  en: {
    loading: "loading…",
    notFound: "this link is invalid or has expired",
    error: "could not load this month's content",
    empty: "nothing to review for this month yet",
    intro: "Review this month's content — tap a post to open it, then approve or flag it",
    reviewed: (done, total) => `${done} of ${total} reviewed`,
    yes: "Approve",
    no: "Flag",
    notePlaceholder: "note (optional)",
    saved: "saved",
    saving: "saving…",
    saveFailed: "could not save, try again",
    close: "Close",
    slide: "slide",
  },
};

// The real product link is path-based — engine/server.mjs serves this exact
// file at GET /a/:token (see engine/SPEC.md). Support that as the primary
// case, with ?token= as a fallback for local testing straight off the file.
function resolveToken() {
  const params = new URLSearchParams(location.search);
  if (params.get("token")) return params.get("token");
  const m = location.pathname.match(/\/a\/([^/]+)\/?$/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}
const token = resolveToken();

const bodyEl = document.getElementById("ap-body");
const monthEl = document.getElementById("ap-month");
const html = document.documentElement;
const body = document.body;

let lang = "ar";
let payload = null;
let posts = [];
let decisions = {}; // postId -> {verdict, note}

function t(key, ...args) {
  const v = STR[lang][key];
  return typeof v === "function" ? v(...args) : v;
}

function applyLang() {
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
  body.dir = html.dir;
  document.getElementById("lang-ar").classList.toggle("active", lang === "ar");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
}

document.getElementById("lang-ar").addEventListener("click", () => { lang = "ar"; applyLang(); render(); });
document.getElementById("lang-en").addEventListener("click", () => { lang = "en"; applyLang(); render(); });

async function load() {
  if (!token) {
    bodyEl.className = "error-state";
    bodyEl.textContent = t("notFound");
    return;
  }
  try {
    payload = await api.approval(token);
  } catch (err) {
    bodyEl.className = "error-state";
    bodyEl.textContent = err.status === 404 ? t("notFound") : t("error");
    return;
  }
  posts = payload.posts || payload.items || [];
  posts.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  (payload.decisions || []).forEach((d) => { decisions[d.postId] = { verdict: d.verdict, note: d.note }; });

  monthEl.textContent = payload.month ? monthLabel(payload.month) : "";
  render();
}

function render() {
  applyLang();
  if (!posts.length) {
    bodyEl.className = "empty-state";
    bodyEl.textContent = t("empty");
    return;
  }
  const done = Object.keys(decisions).length;
  bodyEl.className = "";
  const client = payload.client || {};
  bodyEl.innerHTML = `
    <div class="intro">
      <h1>${escapeHtml(lang === "ar" ? (client.nameAr || client.name || "") : (client.name || client.nameAr || ""))}</h1>
      <p>${t("intro")}</p>
    </div>
    <div class="progress-line">${t("reviewed", done, posts.length)}</div>
    <div class="grid" id="ap-grid"></div>
  `;
  const grid = document.getElementById("ap-grid");
  posts.forEach((p, i) => {
    const d = decisions[p.id];
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
      ${d ? `<span class="mark ${d.verdict === "yes" ? "yes" : "no"}">${d.verdict === "yes" ? "✓" : "✗"}</span>` : ""}
    `;
    tile.addEventListener("click", () => openStage(i));
    grid.appendChild(tile);
  });
}

function openStage(index) {
  const p = posts[index];
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const d = decisions[p.id] || {};
  overlay.innerHTML = `
    <button class="close" aria-label="${t("close")}">×</button>
    <div class="stage">
      <div class="media">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" onerror="this.parentElement.style.display='none'">` : ""}
      </div>
      <div class="caption">${escapeHtml(lang === "ar" ? (p.captionAr || p.captionEn || "") : (p.captionEn || p.captionAr || ""))}</div>
      <div class="decide-row">
        <button class="yes ${d.verdict === "yes" ? "chosen" : ""}" data-verdict="yes">${t("yes")}</button>
        <button class="no ${d.verdict === "no" ? "chosen" : ""}" data-verdict="no">${t("no")}</button>
      </div>
      <textarea class="note-field" placeholder="${t("notePlaceholder")}">${escapeHtml(d.note || "")}</textarea>
      <div class="saved-tag" id="stage-status"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector(".close").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  const status = overlay.querySelector("#stage-status");
  const noteField = overlay.querySelector(".note-field");

  overlay.querySelectorAll(".decide-row button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      overlay.querySelectorAll(".decide-row button").forEach((b) => b.classList.remove("chosen"));
      btn.classList.add("chosen");
      status.textContent = t("saving");
      status.style.color = "var(--muted)";
      try {
        await api.decide(token, { postId: p.id, verdict: btn.dataset.verdict, note: noteField.value || "" });
        decisions[p.id] = { verdict: btn.dataset.verdict, note: noteField.value || "" };
        status.textContent = t("saved");
        status.style.color = "var(--good)";
      } catch {
        status.textContent = t("saveFailed");
        status.style.color = "var(--bad)";
      }
    });
  });

  noteField.addEventListener("change", async () => {
    const existing = decisions[p.id];
    if (!existing) return; // no verdict yet, nothing to attach the note to
    try {
      await api.decide(token, { postId: p.id, verdict: existing.verdict, note: noteField.value || "" });
      decisions[p.id].note = noteField.value || "";
      status.textContent = t("saved");
      status.style.color = "var(--good)";
    } catch {
      status.textContent = t("saveFailed");
      status.style.color = "var(--bad)";
    }
  });
}

load();
