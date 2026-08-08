// engine/ui/js/money.mjs — Money screen: /api/ops rendered as real unit economics, every
// constant editable inline and visibly marked as an assumption (see engine/SPEC.md "Money constants").

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { jod, num, pct, minutes, currentMonthKey, escapeHtml, monthLabel } from "./format.mjs";

mountNav("money.html");

// Defaults mirror engine/lib/pricing.mjs — shown until /api/settings supplies overrides.
// These are guesses about the business, not facts, which is why every one is editable here.
const ASSUMPTIONS = [
  { key: "contentPriceJod", label: "Content price / client / mo", def: 89.0, unit: "JOD" },
  { key: "perConversationJod", label: "Price per conversation", def: 1.75, unit: "JOD" },
  { key: "conversationMinimum", label: "Conversation minimum / mo", def: 100, unit: "" },
  { key: "operatorCostPerMin", label: "Operator cost / QA minute", def: 0.195, unit: "JOD" },
  { key: "generationCostJod", label: "Generation cost / client / mo", def: 4.20, unit: "JOD" },
  { key: "platformCostJod", label: "Platform cost / client / mo", def: 1.10, unit: "JOD" },
  { key: "commissionRate", label: "Commission rate (reserved)", def: 0.02, unit: "" },
];

const monthInput = document.getElementById("mo-month");
monthInput.value = currentMonthKey();

let settings = null;

async function loadSettings() {
  try {
    settings = await api.settings();
  } catch (err) {
    settings = { pricing: {} };
    toast(`could not load settings, using defaults — ${err.message}`, "error");
  }
  renderAssumptions();
}

function currentValue(a) {
  const v = settings?.pricing?.[a.key];
  return v === undefined || v === null ? a.def : v;
}

function renderAssumptions() {
  const el = document.getElementById("mo-assumptions");
  el.innerHTML = ASSUMPTIONS.map((a) => `
    <div class="assumption-row assumption">
      <span>${escapeHtml(a.label)}<span class="assumption-tag">assumption</span></span>
      <span>
        <input type="number" step="any" id="as-${a.key}" value="${currentValue(a)}" />
        <span class="muted" style="font-size:10px;">${a.unit}</span>
      </span>
    </div>
  `).join("");
  ASSUMPTIONS.forEach((a) => {
    document.getElementById(`as-${a.key}`).addEventListener("change", (e) => {
      saveAssumption(a.key, Number(e.target.value));
    });
  });
}

async function saveAssumption(key, value) {
  const pricing = { ...(settings.pricing || {}), [key]: value };
  try {
    settings = await api.patchSettings({ pricing });
    toast(`${key} updated`);
    loadOps();
  } catch (err) {
    toast(err.message, "error");
  }
}

function stat(k, v, extra = "") {
  return `<div class="stat"><span class="k">${escapeHtml(k)}</span><span class="v num">${v}${extra}</span></div>`;
}

async function loadOps() {
  const month = monthInput.value;
  const ids = ["mo-headroom", "mo-capacity", "mo-content", "mo-ads", "mo-total"];
  let ops;
  try {
    ops = await api.ops(month);
  } catch (err) {
    ids.forEach((id) => { document.getElementById(id).innerHTML = `<div class="empty-state">could not load /api/ops — ${escapeHtml(err.message)}</div>`; });
    return;
  }

  const cap = ops.capacity || {};
  const headroom = cap.clientsHeadroom ?? null;
  const headroomEl = document.getElementById("mo-headroom");
  if (headroom !== null) {
    const level = headroom <= 0 ? "bad" : headroom <= 2 ? "warn" : "good";
    const colors = { bad: "var(--bad)", warn: "var(--warn)", good: "var(--good)" };
    headroomEl.innerHTML = `
      <div class="headroom-banner" style="border-color:${colors[level]};color:${colors[level]};">
        <strong class="num">${num(headroom)}</strong> client${headroom === 1 ? "" : "s"} of headroom left at current QA minutes/client
        (<span class="num">${minutes((cap.qaMinutesUsed || 0) * 60)}</span> used of <span class="num">${minutes((cap.qaMinutesAvailable || 0) * 60)}</span> available this month).
        ${level !== "good" ? " QA time per client is eating capacity — this is the early warning." : ""}
      </div>
    `;
  } else {
    headroomEl.innerHTML = "";
  }

  document.getElementById("mo-capacity").innerHTML = [
    stat("QA minutes used", num(cap.qaMinutesUsed, 1)),
    stat("QA minutes available", num(cap.qaMinutesAvailable, 1)),
    stat("Clients headroom", num(cap.clientsHeadroom)),
  ].join("");

  const c = ops.content || {};
  document.getElementById("mo-content").innerHTML = [
    stat("Clients", num(c.clients)),
    stat("Revenue", jod(c.revenueJod)),
    stat("Generation cost", jod(c.generationCostJod)),
    stat("Platform cost", jod(c.platformCostJod)),
    stat("QA minutes total", num(c.qaMinutesTotal, 1)),
    stat("QA cost", jod(c.qaCostJod)),
    stat("Gross", jod(c.grossJod)),
    stat("Margin", pct(c.marginPct)),
    stat("QA minutes / client", num(c.qaMinutesPerClient, 1)),
    stat("Break-even clients", num(c.breakEvenClients)),
  ].join("");

  const ads = ops.ads || {};
  document.getElementById("mo-ads").innerHTML = [
    stat("Clients", num(ads.clients)),
    stat("Conversations", num(ads.conversations)),
    stat("Revenue", jod(ads.revenueJod)),
    stat("Ad spend", jod(ads.adSpendJod)),
    stat("Gross", jod(ads.grossJod)),
    stat("Margin", pct(ads.marginPct)),
    stat("CPC (overall)", jod(ads.cpcJod)),
  ].join("");

  const t = ops.total || {};
  document.getElementById("mo-total").innerHTML = `
    <div class="grid-3">
      <div class="card"><div class="k muted" style="font-size:11px;">Revenue</div><div class="num" style="font-size:22px;">${jod(t.revenueJod)}</div></div>
      <div class="card"><div class="k muted" style="font-size:11px;">Cost</div><div class="num" style="font-size:22px;">${jod(t.costJod)}</div></div>
      <div class="card"><div class="k muted" style="font-size:11px;">Gross · margin</div><div class="num" style="font-size:22px;">${jod(t.grossJod)} <span class="muted" style="font-size:13px;">(${pct(t.marginPct)})</span></div></div>
    </div>
  `;
}

async function loadInvoices() {
  const el = document.getElementById("mo-invoices");
  el.innerHTML = `<div class="skeleton">loading…</div>`;
  try {
    const { items } = await api.invoices(monthInput.value);
    if (!items.length) { el.innerHTML = `<div class="empty-state">no invoices for ${monthLabel(monthInput.value)} yet.</div>`; return; }
    el.innerHTML = `
      <table>
        <thead><tr><th>Client</th><th>Status</th><th class="num">Total</th><th>Issued</th></tr></thead>
        <tbody>
          ${items.map((inv) => `
            <tr>
              <td class="mono">${escapeHtml(inv.clientId)}</td>
              <td><span class="chip ${inv.status === "paid" ? "approved" : inv.status === "sent" ? "qa" : "draft"}">${escapeHtml(inv.status)}</span></td>
              <td class="num">${jod(inv.totalJod)}</td>
              <td class="muted">${inv.issuedAt ? new Date(inv.issuedAt).toDateString() : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">could not load invoices — ${escapeHtml(err.message)}</div>`;
  }
}

document.getElementById("mo-reload").addEventListener("click", () => { loadOps(); loadInvoices(); });
document.getElementById("mo-gen-invoices").addEventListener("click", async () => {
  try {
    await api.generateInvoices(monthInput.value);
    toast("invoices generated");
    loadInvoices();
  } catch (err) {
    toast(err.message, "error");
  }
});

loadSettings();
loadOps();
loadInvoices();
