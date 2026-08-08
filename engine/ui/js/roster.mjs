// engine/ui/js/roster.mjs — Roster screen logic: client list, plan chips, month progress ring, QA minutes

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { minutes, currentMonthKey, escapeHtml } from "./format.mjs";

mountNav("index.html");

const body = document.getElementById("roster-body");
const month = currentMonthKey();

async function load() {
  body.innerHTML = `<div class="skeleton">loading roster…</div>`;
  let clients;
  try {
    ({ items: clients } = await api.clients());
  } catch (err) {
    body.innerHTML = `<div class="empty-state">could not load clients — ${escapeHtml(err.message)}</div>`;
    return;
  }
  clients = clients.filter((c) => !c.archivedAt);

  if (!clients.length) {
    body.innerHTML = `<div class="empty-state">no clients yet. add one above.</div>`;
    return;
  }

  const rows = await Promise.all(clients.map(async (c) => {
    let posts = [];
    try {
      ({ items: posts } = await api.posts({ clientId: c.id, month }));
    } catch {
      posts = [];
    }
    const total = posts.length;
    const approved = posts.filter((p) => ["approved", "scheduled", "posted"].includes(p.status)).length;
    const qaSeconds = posts.reduce((s, p) => s + (p.qaSeconds || 0), 0);
    const pct = total ? Math.round((approved / total) * 100) : 0;
    return { client: c, total, approved, pct, qaSeconds };
  }));

  body.innerHTML = `
    <div class="grid-auto">
      ${rows.map(({ client: c, total, approved, pct, qaSeconds }) => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div>
              <div style="font-weight:600;font-size:15px;">${escapeHtml(c.name)}</div>
              <div class="muted" dir="rtl" style="font-size:12px;">${escapeHtml(c.nameAr || "")}</div>
              <div class="muted" style="font-size:12px;margin-top:2px;">${escapeHtml(c.handle || "")} · ${escapeHtml(c.city || "")}</div>
            </div>
            <div class="ring" style="--pct:${pct};" data-label="${pct}%" title="${approved}/${total} approved this month"></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;">
            <span class="chip ${c.plan?.content ? "approved" : "draft"}">machine ${c.plan?.content ? "on" : "off"}</span>
            <span class="chip ${c.plan?.ads ? "approved" : "draft"}">ads ${c.plan?.ads ? "on" : "off"}</span>
            <span class="chip draft">${escapeHtml(c.category || "uncategorized")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;" class="num">
            <span class="muted">QA this month</span>
            <span>${minutes(qaSeconds)}</span>
          </div>
          <div style="margin-top:12px;display:flex;gap:6px;">
            <a class="btn" href="month.html?clientId=${c.id}">Month</a>
            <a class="btn" href="qa.html?clientId=${c.id}">QA</a>
            <a class="btn" href="grid.html?clientId=${c.id}">Grid</a>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// --- new client dialog ---

const dialog = document.getElementById("new-client-dialog");
document.getElementById("new-client-btn").addEventListener("click", () => dialog.showModal());
document.getElementById("nc-cancel").addEventListener("click", () => dialog.close());

document.getElementById("new-client-form").addEventListener("submit", async (e) => {
  const name = document.getElementById("nc-name").value.trim();
  if (!name) { e.preventDefault(); return; }
  try {
    await api.createClient({
      name,
      nameAr: document.getElementById("nc-nameAr").value.trim(),
      handle: document.getElementById("nc-handle").value.trim(),
      category: document.getElementById("nc-category").value.trim().toLowerCase(),
      city: document.getElementById("nc-city").value.trim(),
      brand: { colors: [], voiceEn: "", voiceAr: "", fontHint: "" },
      plan: { content: true, ads: false },
      price: { contentJod: 89.0, perConversationJod: 1.75 },
    });
    toast(`${name} added`);
    document.getElementById("new-client-form").reset();
    await load();
  } catch (err) {
    toast(err.message, "error");
  }
});

load();
