// engine/ui/js/qa.mjs — QA queue: one post at a time, honest attention timer, keyboard-first review.

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { currentMonthKey, escapeHtml, mmss } from "./format.mjs";
import { QaTimer } from "./timer.mjs";

mountNav("qa.html");

const params = new URLSearchParams(location.search);
const body = document.getElementById("qa-body");
const clientSel = document.getElementById("q-client");
const monthInput = document.getElementById("q-month");
monthInput.value = params.get("month") || currentMonthKey();

let clients = [];
let queue = [];       // posts with status "qa" for the current client/month, sorted by slot
let cursor = 0;        // index into queue
let editing = false;
let timer = null;
let baseSeconds = 0;   // post.qaSeconds as last known from server, snapshotted on open
let sentDelta = 0;     // seconds successfully flushed to the server this viewing session
let pendingDelta = 0;  // seconds accrued locally, not yet sent
let flushHandle = null;

async function loadClients() {
  try {
    ({ items: clients } = await api.clients());
  } catch (err) {
    body.innerHTML = `<div class="empty-state">could not load clients — ${escapeHtml(err.message)}</div>`;
    return;
  }
  clients = clients.filter((c) => !c.archivedAt);
  clientSel.innerHTML = clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  const pre = params.get("clientId");
  if (pre) clientSel.value = pre;
  await loadQueue();
}

async function loadQueue() {
  stopTimer();
  const clientId = clientSel.value;
  const month = monthInput.value;
  if (!clientId) { body.innerHTML = `<div class="empty-state">no clients yet.</div>`; return; }
  body.innerHTML = `<div class="skeleton">loading queue…</div>`;
  let posts;
  try {
    ({ items: posts } = await api.posts({ clientId, month, status: "qa" }));
  } catch (err) {
    body.innerHTML = `<div class="empty-state">could not load queue — ${escapeHtml(err.message)}</div>`;
    return;
  }
  queue = posts.sort((a, b) => a.slot - b.slot);

  const wantId = params.get("postId");
  cursor = wantId ? Math.max(0, queue.findIndex((p) => p.id === wantId)) : 0;

  render();
}

function currentPost() {
  return queue[cursor] || null;
}

function render() {
  if (!queue.length) {
    body.innerHTML = `<div class="empty-state">queue is empty. nothing waiting on QA for this month.</div>`;
    return;
  }
  const post = currentPost();
  editing = false;
  body.innerHTML = `
    <div class="qa-layout">
      <div class="qa-stage">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span class="mono muted" style="font-size:12px;">post ${cursor + 1} / ${queue.length} · slot #${post.slot} · ${escapeHtml(post.kind)}</span>
          <span class="chip qa">qa</span>
        </div>

        <div class="qa-timer-box">
          <span class="qa-timer-dot" id="qa-dot"></span>
          <span class="mono num" id="qa-clock" style="font-size:15px;">00:00</span>
          <span class="muted" id="qa-state" style="font-size:11px;">starting…</span>
          <span class="muted" style="font-size:11px;margin-left:auto;">total on this post: <span class="num" id="qa-total">${mmss(post.qaSeconds)}</span></span>
        </div>

        <div class="qa-media">
          ${post.image
            ? `<img src="${escapeHtml(post.image)}" alt="" onerror="this.parentElement.innerHTML='<span class=&quot;muted&quot;>image missing</span>'">`
            : `<span class="muted">no image — ${escapeHtml(post.kind)}</span>`}
        </div>

        <label>Caption EN</label>
        <div class="qa-caption" id="cap-en" data-lang="en">${escapeHtml(post.captionEn || "")}</div>
        <label>Caption AR</label>
        <div class="qa-caption" id="cap-ar" dir="rtl" data-lang="ar">${escapeHtml(post.captionAr || "")}</div>

        ${post.hashtags?.length ? `<div class="muted mono" style="font-size:11px;margin-bottom:8px;">${post.hashtags.map(escapeHtml).join(" ")}</div>` : ""}

        <div class="qa-actions">
          <button id="act-approve" class="primary">Approve <span class="kbd">a</span></button>
          <button id="act-regen-all">Regenerate <span class="kbd">r</span></button>
          <button id="act-regen-caption" class="ghost">Regen caption only</button>
          <button id="act-regen-image" class="ghost">Regen image only</button>
          <button id="act-edit" class="ghost">Edit caption <span class="kbd">e</span></button>
          <button id="act-reject" class="danger">Reject</button>
        </div>

        <div class="kbd-row">
          <span><span class="kbd">a</span> approve</span>
          <span><span class="kbd">r</span> regenerate</span>
          <span><span class="kbd">j</span> / <span class="kbd">k</span> next / prev</span>
          <span><span class="kbd">e</span> edit caption</span>
        </div>
      </div>

      <div class="qa-queue-strip" id="qa-strip"></div>
    </div>
  `;

  renderStrip();
  bindActions(post);
  startTimer(post);
  document.getElementById("qa-clock").focus?.();
}

function renderStrip() {
  const strip = document.getElementById("qa-strip");
  strip.innerHTML = queue.map((p, i) => `
    <div class="qa-queue-item ${i === cursor ? "current" : ""}" data-idx="${i}">
      <div class="thumb">${p.image ? `<img src="${escapeHtml(p.image)}" onerror="this.style.display='none'">` : ""}</div>
      <div>
        <div class="mono">#${p.slot} ${escapeHtml(p.kind)}</div>
        <div class="muted" style="font-size:10px;">${mmss(p.qaSeconds)} qa</div>
      </div>
    </div>
  `).join("");
  strip.querySelectorAll(".qa-queue-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.idx);
      goTo(idx);
    });
  });
}

// ---------- timer ----------

function startTimer(post) {
  baseSeconds = post.qaSeconds || 0;
  sentDelta = 0;
  pendingDelta = 0;
  timer = new QaTimer((wholeSeconds) => {
    pendingDelta += wholeSeconds;
    updateClock();
    scheduleFlush();
  });
  timer.attach();
  updateClock();
  clearInterval(flushHandle);
  flushHandle = setInterval(() => refreshDot(), 400);
}

function updateClock() {
  const clock = document.getElementById("qa-clock");
  const total = document.getElementById("qa-total");
  if (!clock) return;
  clock.textContent = mmss(sentDelta + pendingDelta);
  if (total) total.textContent = mmss(baseSeconds + sentDelta + pendingDelta);
  refreshDot();
}

function refreshDot() {
  const dot = document.getElementById("qa-dot");
  const state = document.getElementById("qa-state");
  if (!dot || !timer) return;
  dot.className = "qa-timer-dot " + (timer.running ? "running" : "paused");
  if (state) {
    if (timer.running) state.textContent = "running";
    else if (timer.idlePaused) state.textContent = "paused — idle";
    else if (!timer.windowFocused) state.textContent = "paused — window blurred";
    else if (!timer.visible) state.textContent = "paused — tab hidden";
    else state.textContent = "paused";
  }
}

let flushDebounce = null;
function scheduleFlush() {
  clearTimeout(flushDebounce);
  flushDebounce = setTimeout(() => flushNow(), 4000);
}

async function flushNow() {
  const post = currentPost();
  if (!post || pendingDelta <= 0) return;
  const delta = pendingDelta;
  pendingDelta = 0;
  try {
    await api.patchPost(post.id, { qaSeconds: delta });
    sentDelta += delta;
    post.qaSeconds = baseSeconds + sentDelta; // keep local record in sync
  } catch (err) {
    // give it back — never lose measured time, never invent it either
    pendingDelta += delta;
    console.error("qa flush failed", err);
  }
}

function stopTimer() {
  clearTimeout(flushDebounce);
  clearInterval(flushHandle);
  if (timer) {
    timer.flush();
    timer.detach();
    timer = null;
  }
  flushNow();
}

window.addEventListener("beforeunload", () => { if (timer) { timer.flush(); } flushNow(); });

// ---------- actions ----------

function bindActions(post) {
  document.getElementById("act-approve").addEventListener("click", () => decide("approved"));
  document.getElementById("act-reject").addEventListener("click", () => decide("rejected"));
  document.getElementById("act-regen-all").addEventListener("click", () => regenerate("all"));
  document.getElementById("act-regen-caption").addEventListener("click", () => regenerate("caption"));
  document.getElementById("act-regen-image").addEventListener("click", () => regenerate("image"));
  document.getElementById("act-edit").addEventListener("click", () => enterEdit(post));
}

async function decide(status) {
  const post = currentPost();
  if (!post) return;
  stopTimer();
  await flushNow();
  try {
    let rejectionNote = null;
    if (status === "rejected") {
      rejectionNote = prompt("Rejection note (optional):") || null;
    }
    await api.patchPost(post.id, { status, ...(rejectionNote ? { rejectionNote } : {}) });
    toast(status === "approved" ? "approved" : "rejected");
    queue.splice(cursor, 1);
    if (cursor >= queue.length) cursor = Math.max(0, queue.length - 1);
    render();
  } catch (err) {
    toast(err.message, "error");
    startTimer(post);
  }
}

async function regenerate(what) {
  const post = currentPost();
  if (!post) return;
  const note = what === "all" ? "" : (prompt(`Note for ${what} regeneration (optional):`) || "");
  try {
    toast(`regenerating ${what}…`);
    await api.regeneratePost(post.id, { what, note });
    // reload this single post's fresh state from the queue
    const { items } = await api.posts({ clientId: clientSel.value, month: monthInput.value, status: "qa" });
    const fresh = items.find((p) => p.id === post.id);
    if (fresh) queue[cursor] = fresh;
    toast(`${what} regenerated`);
    render();
  } catch (err) {
    toast(err.message, "error");
  }
}

function enterEdit(post) {
  editing = true;
  const enBox = document.getElementById("cap-en");
  const arBox = document.getElementById("cap-ar");
  enBox.innerHTML = `<textarea id="edit-en">${escapeHtml(post.captionEn || "")}</textarea>`;
  arBox.innerHTML = `<textarea id="edit-ar" dir="rtl">${escapeHtml(post.captionAr || "")}</textarea>`;
  const actions = document.querySelector(".qa-actions");
  const saveBar = document.createElement("div");
  saveBar.style.cssText = "display:flex;gap:8px;margin-top:8px;";
  saveBar.innerHTML = `<button id="edit-save" class="primary">Save</button><button id="edit-cancel" class="ghost">Cancel</button>`;
  actions.before(saveBar);
  document.getElementById("edit-en").focus();

  document.getElementById("edit-save").addEventListener("click", async () => {
    const captionEn = document.getElementById("edit-en").value;
    const captionAr = document.getElementById("edit-ar").value;
    try {
      await api.patchPost(post.id, { captionEn, captionAr });
      post.captionEn = captionEn;
      post.captionAr = captionAr;
      toast("caption saved");
      editing = false;
      render();
    } catch (err) {
      toast(err.message, "error");
    }
  });
  document.getElementById("edit-cancel").addEventListener("click", () => { editing = false; render(); });
}

function goTo(idx) {
  if (idx < 0 || idx >= queue.length) return;
  stopTimer();
  cursor = idx;
  render();
}

// ---------- keyboard ----------

document.addEventListener("keydown", (e) => {
  if (editing) return; // don't hijack typing in the edit textareas
  const tag = document.activeElement?.tagName;
  if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
  if (!queue.length) return;
  switch (e.key) {
    case "a": decide("approved"); break;
    case "r": regenerate("all"); break;
    case "j": goTo(cursor + 1); break;
    case "k": goTo(cursor - 1); break;
    case "e": enterEdit(currentPost()); break;
    default: return;
  }
  e.preventDefault();
});

clientSel.addEventListener("change", loadQueue);
monthInput.addEventListener("change", loadQueue);

loadClients();
