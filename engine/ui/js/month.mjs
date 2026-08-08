// engine/ui/js/month.mjs — Month screen: kick a generation job, poll it, render the post grid

import { api } from "./api.mjs";
import { mountNav, toast } from "./nav.mjs";
import { currentMonthKey, escapeHtml, dateShort } from "./format.mjs";

mountNav("month.html");

const params = new URLSearchParams(location.search);
const clientSel = document.getElementById("m-client");
const monthInput = document.getElementById("m-month");
const jobEl = document.getElementById("m-job");
const gridEl = document.getElementById("m-grid");
const countEl = document.getElementById("m-count");

monthInput.value = currentMonthKey();
let clients = [];

async function loadClients() {
  try {
    ({ items: clients } = await api.clients());
  } catch (err) {
    toast(`could not load clients — ${err.message}`, "error");
    return;
  }
  clients = clients.filter((c) => !c.archivedAt);
  clientSel.innerHTML = clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  const pre = params.get("clientId");
  if (pre) clientSel.value = pre;
  await loadGrid();
}

function statusChip(status) {
  return `<span class="chip ${status}">${status}</span>`;
}

async function loadGrid() {
  const clientId = clientSel.value;
  const month = monthInput.value;
  if (!clientId) { gridEl.innerHTML = `<div class="empty-state">no clients yet.</div>`; return; }
  gridEl.innerHTML = `<div class="skeleton">loading posts…</div>`;
  let posts = [];
  try {
    ({ items: posts } = await api.posts({ clientId, month }));
  } catch (err) {
    gridEl.innerHTML = `<div class="empty-state">could not load posts — ${escapeHtml(err.message)}</div>`;
    return;
  }
  posts.sort((a, b) => a.slot - b.slot);
  countEl.textContent = `${posts.length} posts`;

  if (!posts.length) {
    gridEl.innerHTML = `<div class="empty-state">nothing generated for this month yet.</div>`;
    return;
  }

  gridEl.innerHTML = `
    <div class="grid-auto">
      ${posts.map((p) => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="mono muted" style="font-size:11px;">#${p.slot} · ${escapeHtml(p.kind)}</span>
            ${statusChip(p.status)}
          </div>
          <div style="aspect-ratio:4/5;background:var(--panel-2);border:1px solid var(--line);border-radius:4px;display:grid;place-items:center;margin-bottom:8px;overflow:hidden;">
            ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<span class="muted" style="font-size:11px;">no image</span>`}
          </div>
          <div style="font-size:12px;color:var(--muted);max-height:3.6em;overflow:hidden;">${escapeHtml(p.captionEn || "").slice(0, 120)}</div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
            <span class="muted" style="font-size:11px;">${p.regenerations || 0} regen</span>
            <a class="btn" href="qa.html?clientId=${clientId}&month=${month}&postId=${p.id}">Open in QA</a>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

clientSel.addEventListener("change", loadGrid);
monthInput.addEventListener("change", loadGrid);

let pollTimer = null;

async function pollJob(jobId) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    let job;
    try {
      job = await api.job(jobId);
    } catch (err) {
      jobEl.innerHTML = `<div class="bad-text mono">job poll failed — ${escapeHtml(err.message)}</div>`;
      clearInterval(pollTimer);
      return;
    }
    renderJob(job);
    if (job.state === "done" || job.state === "error") {
      clearInterval(pollTimer);
      if (job.state === "done") { toast("month generated"); loadGrid(); }
      else toast("generation job errored", "error");
    }
  }, 1200);
}

function renderJob(job) {
  const pct = Math.round((job.progress || 0) * 100);
  jobEl.innerHTML = `
    <div class="panel" style="background:var(--panel-2);">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
        <span class="mono">job ${escapeHtml(job.id)} — ${escapeHtml(job.state)}</span>
        <span class="mono num">${pct}%</span>
      </div>
      <div style="height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-bottom:10px;">
        <div style="height:100%;width:${pct}%;background:var(--accent);"></div>
      </div>
      <div class="mono" style="font-size:11px;color:var(--muted);max-height:160px;overflow:auto;white-space:pre-wrap;">${(job.log || []).map(escapeHtml).join("\n")}</div>
    </div>
  `;
}

document.getElementById("m-go").addEventListener("click", async () => {
  const clientId = clientSel.value;
  const month = monthInput.value;
  if (!clientId || !month) { toast("pick a client and month", "error"); return; }
  const counts = {
    single: Number(document.getElementById("m-single").value) || 0,
    carousel: Number(document.getElementById("m-carousel").value) || 0,
    reel: Number(document.getElementById("m-reel").value) || 0,
  };
  try {
    const { jobId } = await api.generateMonth({ clientId, month, counts });
    toast(`job ${jobId} started`);
    pollJob(jobId);
  } catch (err) {
    toast(err.message, "error");
  }
});

loadClients();
