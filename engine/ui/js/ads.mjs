// engine/ui/js/ads.mjs — Ads screen: campaigns, conversation ledger, CPC by category, creative library.

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { jod, num, currentMonthKey, escapeHtml, dateShort, timeShort } from "./format.mjs";

mountNav("ads.html");

const cpcEl = document.getElementById("ads-cpc");
const campaignsEl = document.getElementById("ads-campaigns");
const conversationsEl = document.getElementById("ads-conversations");
const creativesEl = document.getElementById("ads-creatives");
const convClientSel = document.getElementById("conv-client");
const convMonthInput = document.getElementById("conv-month");
convMonthInput.value = currentMonthKey();

let clients = [];

async function loadClients() {
  try {
    ({ items: clients } = await api.clients());
  } catch (err) {
    toast(`could not load clients — ${err.message}`, "error");
    return;
  }
  clients = clients.filter((c) => !c.archivedAt);
  convClientSel.innerHTML = `<option value="">all clients</option>` + clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

function clientName(id) {
  return clients.find((c) => c.id === id)?.name || id;
}

async function loadOps() {
  cpcEl.innerHTML = `<div class="skeleton">loading…</div>`;
  try {
    const ops = await api.ops(currentMonthKey());
    const byCat = ops.ads?.cpcByCategory || {};
    const cats = Object.keys(byCat);
    if (!cats.length) {
      cpcEl.innerHTML = `<div class="empty-state">no conversation data yet this month.</div>`;
      return;
    }
    cpcEl.innerHTML = `
      <div class="grid-auto">
        ${cats.map((cat) => `
          <div class="card">
            <div class="mono muted" style="font-size:11px;text-transform:uppercase;">${escapeHtml(cat)}</div>
            <div class="num" style="font-size:22px;margin-top:4px;">${jod(byCat[cat])}</div>
            <div class="muted" style="font-size:11px;">per conversation</div>
          </div>
        `).join("")}
        <div class="card">
          <div class="mono muted" style="font-size:11px;text-transform:uppercase;">Overall</div>
          <div class="num" style="font-size:22px;margin-top:4px;">${jod(ops.ads?.cpcJod)}</div>
          <div class="muted" style="font-size:11px;">${num(ops.ads?.conversations)} conversations · ${jod(ops.ads?.adSpendJod)} spend</div>
        </div>
      </div>
    `;
  } catch (err) {
    cpcEl.innerHTML = `<div class="empty-state">could not load ops — ${escapeHtml(err.message)}</div>`;
  }
}

async function loadCampaigns() {
  campaignsEl.innerHTML = `<div class="skeleton">loading…</div>`;
  try {
    const { items } = await api.campaigns();
    if (!items.length) { campaignsEl.innerHTML = `<div class="empty-state">no campaigns yet.</div>`; return; }
    campaignsEl.innerHTML = `
      <table>
        <thead><tr><th>Client</th><th>Status</th><th class="num">Budget</th><th>Started</th></tr></thead>
        <tbody>
          ${items.map((c) => `
            <tr>
              <td>${escapeHtml(clientName(c.clientId))}</td>
              <td><span class="chip ${c.status}">${c.status}</span></td>
              <td class="num">${jod(c.budgetJod)}</td>
              <td class="muted">${dateShort(c.startedAt)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    campaignsEl.innerHTML = `<div class="empty-state">could not load campaigns — ${escapeHtml(err.message)}</div>`;
  }
}

async function loadConversations() {
  conversationsEl.innerHTML = `<div class="skeleton">loading…</div>`;
  const params = {};
  if (convClientSel.value) params.clientId = convClientSel.value;
  if (convMonthInput.value) params.month = convMonthInput.value;
  try {
    const { items } = await api.conversations(params);
    if (!items.length) { conversationsEl.innerHTML = `<div class="empty-state">no conversations logged.</div>`; return; }
    items.sort((a, b) => new Date(b.at) - new Date(a.at));
    conversationsEl.innerHTML = `
      <table>
        <thead><tr><th>Client</th><th>Source</th><th class="num">Cost</th><th class="num">Billed</th><th>When</th></tr></thead>
        <tbody>
          ${items.slice(0, 50).map((c) => `
            <tr>
              <td>${escapeHtml(clientName(c.clientId))}</td>
              <td class="muted">${escapeHtml(c.source)}</td>
              <td class="num">${jod(c.costJod)}</td>
              <td class="num">${jod(c.billedJod)}</td>
              <td class="muted">${dateShort(c.at)} ${timeShort(c.at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    conversationsEl.innerHTML = `<div class="empty-state">could not load conversations — ${escapeHtml(err.message)}</div>`;
  }
}

async function loadCreatives(category) {
  creativesEl.innerHTML = `<div class="skeleton">loading…</div>`;
  try {
    const { items } = await api.creatives(category || undefined);
    if (!items.length) { creativesEl.innerHTML = `<div class="empty-state">no creatives in the library yet.</div>`; return; }
    creativesEl.innerHTML = `
      <div class="grid-auto">
        ${items.map((c) => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span class="mono muted" style="font-size:11px;text-transform:uppercase;">${escapeHtml(c.category)}</span>
              <span class="chip ${c.status}">${escapeHtml(c.status)}</span>
            </div>
            ${c.imagePath ? `<div style="aspect-ratio:4/5;background:var(--panel-2);border:1px solid var(--line);border-radius:4px;overflow:hidden;margin-bottom:8px;"><img src="${escapeHtml(c.imagePath)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.display='none'"></div>` : ""}
            <div style="font-weight:600;font-size:13px;">${escapeHtml(c.headlineEn || "")}</div>
            <div class="muted" style="font-size:12px;margin:4px 0;">${escapeHtml(c.bodyEn || "")}</div>
            <div class="muted" dir="rtl" style="font-size:12px;">${escapeHtml(c.headlineAr || "")}</div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11px;" class="num">
              <span class="muted">${num(c.stats?.conversations)} conv</span>
              <span class="muted">${jod(c.stats?.spendJod)} spend</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    creativesEl.innerHTML = `<div class="empty-state">could not load creatives — ${escapeHtml(err.message)}</div>`;
  }
}

document.getElementById("cr-filter").addEventListener("click", () => {
  loadCreatives(document.getElementById("cr-category").value.trim().toLowerCase());
});

document.getElementById("conv-import").addEventListener("click", async () => {
  const csv = document.getElementById("conv-csv").value.trim();
  const resultEl = document.getElementById("conv-import-result");
  if (!csv) { toast("paste a CSV export first", "error"); return; }
  const clientId = convClientSel.value;
  if (!clientId) { toast("pick a client to import into", "error"); return; }
  try {
    const result = await api.importConversations({ clientId, csv });
    resultEl.textContent = JSON.stringify(result, null, 0);
    toast("import complete");
    loadConversations();
  } catch (err) {
    toast(err.message, "error");
  }
});

convClientSel.addEventListener("change", loadConversations);
convMonthInput.addEventListener("change", loadConversations);

async function init() {
  await loadClients();
  loadOps();
  loadCampaigns();
  loadConversations();
  loadCreatives();
}

init();
