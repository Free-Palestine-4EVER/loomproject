// engine/ui/js/approval.mjs — Approval screen: mint a client link, build a WhatsApp message, poll decisions.

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { currentMonthKey, escapeHtml, monthLabel, dateShort, timeShort } from "./format.mjs";

mountNav("approval.html");

const clientSel = document.getElementById("a-client");
const monthInput = document.getElementById("a-month");
const linkBox = document.getElementById("a-link-box");
const urlInput = document.getElementById("a-url");
const waText = document.getElementById("a-wa");
const decisionsEl = document.getElementById("a-decisions");

monthInput.value = currentMonthKey();

let clients = [];
let currentToken = null;
let postIndex = {}; // postId -> post, for labeling decisions
let pollHandle = null;

async function loadClients() {
  try {
    ({ items: clients } = await api.clients());
  } catch (err) {
    toast(`could not load clients — ${err.message}`, "error");
    return;
  }
  clients = clients.filter((c) => !c.archivedAt);
  clientSel.innerHTML = clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

document.getElementById("a-go").addEventListener("click", async () => {
  const clientId = clientSel.value;
  const month = monthInput.value;
  if (!clientId || !month) { toast("pick a client and month", "error"); return; }
  try {
    const { token, url } = await api.createApproval({ clientId, month });
    currentToken = token;
    const fullUrl = url || `${location.origin}/approve.html?token=${token}`;
    urlInput.value = fullUrl;

    const client = clients.find((c) => c.id === clientId);
    const label = client?.nameAr || client?.name || "client";
    waText.value = `مرحبا ${label} 👋\nمحتوى شهر ${monthLabel(month)} جاهز للمراجعة.\nراجعوا وحطوا ✓ أو ✗ من هنا:\n${fullUrl}`;

    linkBox.style.display = "block";
    document.getElementById("a-open-wa").href = `https://wa.me/?text=${encodeURIComponent(waText.value)}`;

    try {
      const { items: posts } = await api.posts({ clientId, month });
      postIndex = Object.fromEntries(posts.map((p) => [p.id, p]));
    } catch {
      postIndex = {};
    }

    toast("approval link generated");
    startPolling();
  } catch (err) {
    toast(err.message, "error");
  }
});

document.getElementById("a-copy").addEventListener("click", () => copy(urlInput.value, "link copied"));
document.getElementById("a-copy-wa").addEventListener("click", () => copy(waText.value, "message copied"));
document.getElementById("a-refresh").addEventListener("click", () => loadDecisions());

function copy(text, msg) {
  navigator.clipboard?.writeText(text).then(() => toast(msg)).catch(() => toast("copy failed — select manually", "error"));
}

function startPolling() {
  clearInterval(pollHandle);
  loadDecisions();
  pollHandle = setInterval(loadDecisions, 5000);
}

async function loadDecisions() {
  if (!currentToken) return;
  let payload;
  try {
    payload = await api.approval(currentToken);
  } catch (err) {
    decisionsEl.innerHTML = `<div class="empty-state">could not load decisions — ${escapeHtml(err.message)}</div>`;
    return;
  }
  const decisions = payload.decisions || [];
  if (!decisions.length) {
    decisionsEl.innerHTML = `<div class="empty-state">no decisions yet. waiting on the client.</div>`;
    return;
  }
  decisionsEl.innerHTML = `<div class="panel" style="padding:0;">${decisions.map((d) => {
    const post = postIndex[d.postId];
    const label = post ? `#${post.slot} · ${escapeHtml(post.kind)}` : d.postId;
    const verdictChip = d.verdict === "yes" ? `<span class="chip approved">yes</span>` : `<span class="chip rejected">no</span>`;
    return `
      <div class="decision-row">
        <span class="mono">${label}</span>
        ${verdictChip}
        <span class="muted" style="flex:1;">${escapeHtml(d.note || "")}</span>
        <span class="muted mono">${dateShort(d.at)} ${timeShort(d.at)}</span>
      </div>
    `;
  }).join("")}</div>`;
}

loadClients();
