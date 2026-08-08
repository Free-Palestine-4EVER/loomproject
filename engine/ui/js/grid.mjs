// engine/ui/js/grid.mjs — Grid planner: 3-wide feed, drag to reorder, posting times derived from position.

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { currentMonthKey, escapeHtml, timeShort, dateShort } from "./format.mjs";

mountNav("grid.html");

const clientSel = document.getElementById("g-client");
const monthInput = document.getElementById("g-month");
const timeInput = document.getElementById("g-time");
const perDayInput = document.getElementById("g-perday");
const feedEl = document.getElementById("g-feed");
const detailEl = document.getElementById("g-detail");

monthInput.value = currentMonthKey();

let posts = [];
let dragIdx = null;

async function loadClients() {
  let clients;
  try {
    ({ items: clients } = await api.clients());
  } catch (err) {
    feedEl.innerHTML = `<div class="empty-state">could not load clients — ${escapeHtml(err.message)}</div>`;
    return;
  }
  clients = clients.filter((c) => !c.archivedAt);
  clientSel.innerHTML = clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  const params = new URLSearchParams(location.search);
  const pre = params.get("clientId");
  if (pre) clientSel.value = pre;
  await loadGrid();
}

async function loadGrid() {
  const clientId = clientSel.value;
  const month = monthInput.value;
  if (!clientId) { feedEl.innerHTML = `<div class="empty-state">no clients yet.</div>`; return; }
  feedEl.innerHTML = `<div class="skeleton">loading grid…</div>`;
  try {
    ({ items: posts } = await api.posts({ clientId, month }));
  } catch (err) {
    feedEl.innerHTML = `<div class="empty-state">could not load posts — ${escapeHtml(err.message)}</div>`;
    return;
  }
  posts.sort((a, b) => a.slot - b.slot);
  renderFeed();
}

function previewTime(index) {
  const perDay = Math.max(1, Number(perDayInput.value) || 1);
  const [hh, mm] = (timeInput.value || "09:00").split(":").map(Number);
  const day = Math.floor(index / perDay) + 1;
  const [y, m] = monthInput.value.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day, hh, mm));
  return d;
}

function renderFeed() {
  if (!posts.length) {
    feedEl.innerHTML = `<div class="empty-state">nothing generated for this month yet.</div>`;
    return;
  }
  feedEl.innerHTML = `<div class="feed" id="feed-grid"></div>`;
  const grid = document.getElementById("feed-grid");
  posts.forEach((p, i) => {
    const cell = document.createElement("div");
    cell.className = "feed-cell";
    cell.draggable = true;
    cell.dataset.idx = String(i);
    const when = p.scheduledAt ? new Date(p.scheduledAt) : previewTime(i);
    cell.innerHTML = `
      ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" onerror="this.style.display='none'">` : ""}
      <span class="slot-tag">#${p.slot}</span>
      <span class="kind-tag">${escapeHtml(p.kind)}</span>
      <span class="time-tag">${p.scheduledAt ? "" : "~"}${dateShort(when.toISOString())} ${timeShort(when.toISOString())}</span>
    `;
    cell.addEventListener("click", () => selectPost(p));
    cell.addEventListener("dragstart", () => { dragIdx = i; cell.classList.add("dragging"); });
    cell.addEventListener("dragend", () => { cell.classList.remove("dragging"); grid.querySelectorAll(".drop-target").forEach((c) => c.classList.remove("drop-target")); });
    cell.addEventListener("dragover", (e) => { e.preventDefault(); cell.classList.add("drop-target"); });
    cell.addEventListener("dragleave", () => cell.classList.remove("drop-target"));
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("drop-target");
      const dropIdx = Number(cell.dataset.idx);
      if (dragIdx === null || dragIdx === dropIdx) return;
      const [moved] = posts.splice(dragIdx, 1);
      posts.splice(dropIdx, 0, moved);
      persistOrder();
    });
    grid.appendChild(cell);
  });
}

async function persistOrder() {
  // reassign slots to match visual order, persist only what changed
  const updates = [];
  posts.forEach((p, i) => {
    const newSlot = i + 1;
    if (p.slot !== newSlot) {
      p.slot = newSlot;
      updates.push(api.patchPost(p.id, { slot: newSlot }));
    }
  });
  renderFeed();
  try {
    await Promise.all(updates);
    if (updates.length) toast(`reordered ${updates.length} post${updates.length === 1 ? "" : "s"}`);
  } catch (err) {
    toast(`reorder save failed — ${err.message}`, "error");
  }
}

function selectPost(p) {
  detailEl.innerHTML = `
    <h2>Selected post</h2>
    <div style="font-size:12px;" class="mono muted">#${p.slot} · ${escapeHtml(p.kind)} · <span class="chip ${p.status}">${p.status}</span></div>
    <div style="margin-top:10px;font-size:12px;white-space:pre-wrap;">${escapeHtml(p.captionEn || "(no caption)")}</div>
    <div style="margin-top:10px;font-size:12px;color:var(--muted);">scheduled: ${p.scheduledAt ? new Date(p.scheduledAt).toUTCString() : "not yet scheduled"}</div>
    <div style="margin-top:14px;">
      <a class="btn" href="qa.html?clientId=${clientSel.value}&month=${monthInput.value}&postId=${p.id}">Open in QA</a>
    </div>
  `;
}

document.getElementById("g-apply").addEventListener("click", async () => {
  const updates = posts.map((p, i) => {
    const when = previewTime(i);
    p.scheduledAt = when.toISOString();
    return api.patchPost(p.id, { scheduledAt: p.scheduledAt });
  });
  try {
    await Promise.all(updates);
    toast(`schedule applied to ${posts.length} posts`);
    renderFeed();
  } catch (err) {
    toast(`schedule save failed — ${err.message}`, "error");
  }
});

clientSel.addEventListener("change", loadGrid);
monthInput.addEventListener("change", loadGrid);
timeInput.addEventListener("change", renderFeed);
perDayInput.addEventListener("change", renderFeed);

loadClients();
