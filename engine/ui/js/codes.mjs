// engine/ui/js/codes.mjs — Client codes screen: pending one-time login codes
// (for readout) and the incoming client-requests thread.

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { escapeHtml, timeShort, dateShort } from "./format.mjs";

mountNav("codes.html");

const codesBody = document.getElementById("codes-body");
const requestsBody = document.getElementById("requests-body");

function timeLeft(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s left`;
}

async function loadCodes() {
  let items;
  try {
    ({ items } = await api.clientCodes());
  } catch (err) {
    codesBody.innerHTML = `<div class="empty-state">could not load codes — ${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!items.length) {
    codesBody.innerHTML = `<div class="empty-state">no pending codes — nobody is mid-login right now.</div>`;
    return;
  }
  codesBody.innerHTML = `
    <table>
      <thead><tr><th>Client</th><th>Handle</th><th>Code</th><th>Expires</th></tr></thead>
      <tbody>
        ${items.map((c) => `
          <tr>
            <td>${escapeHtml(c.clientName)}</td>
            <td class="mono">${escapeHtml(c.clientHandle || c.handle)}</td>
            <td class="num" style="font-size:20px;letter-spacing:0.12em;font-weight:700;">${escapeHtml(c.code)}</td>
            <td class="muted">${timeLeft(c.expiresAt)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadRequests() {
  let items;
  try {
    ({ items } = await api.clientRequests());
  } catch (err) {
    requestsBody.innerHTML = `<div class="empty-state">could not load requests — ${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!items.length) {
    requestsBody.innerHTML = `<div class="empty-state">no requests from clients yet.</div>`;
    return;
  }
  requestsBody.innerHTML = `
    <table>
      <thead><tr><th>Client</th><th>Message</th><th>When</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${items.map((r) => `
          <tr data-id="${r.id}">
            <td>${escapeHtml(r.clientName)}</td>
            <td>${escapeHtml(r.text)}</td>
            <td class="muted">${dateShort(r.at)} ${timeShort(r.at)}</td>
            <td><span class="chip ${r.status === "open" ? "qa" : "approved"}">${escapeHtml(r.status)}</span></td>
            <td>${r.status === "open" ? `<button class="btn done-btn">Mark done</button>` : ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  requestsBody.querySelectorAll(".done-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("tr").dataset.id;
      try {
        await api.patchClientRequest(id, { status: "done" });
        toast("marked done");
        await loadRequests();
      } catch (err) {
        toast(err.message, "error");
      }
    });
  });
}

async function loadAll() {
  await Promise.all([loadCodes(), loadRequests()]);
}

loadAll();
setInterval(loadAll, 15000); // codes carry a countdown — keep the panel live
