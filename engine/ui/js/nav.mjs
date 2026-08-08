// engine/ui/js/nav.mjs — shared top bar + health check, mounted on every operator screen

import { api } from "./api.mjs";

const SCREENS = [
  { href: "index.html", label: "Roster" },
  { href: "month.html", label: "Month" },
  { href: "qa.html", label: "QA Queue" },
  { href: "grid.html", label: "Grid" },
  { href: "approval.html", label: "Approval" },
  { href: "codes.html", label: "Codes" },
  { href: "ads.html", label: "Ads" },
  { href: "money.html", label: "Money" },
];

export function mountNav(activeHref) {
  const bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = `
    <div class="brand">LOOM ENGINE</div>
    <nav>
      ${SCREENS.map(s => `<a href="${s.href}" class="${s.href === activeHref ? "active" : ""}">${s.label}</a>`).join("")}
    </nav>
    <div class="health" id="engine-health"><span class="dot"></span>checking…</div>
  `;
  document.body.prepend(bar);

  const healthEl = bar.querySelector("#engine-health");
  api.health().then((h) => {
    healthEl.innerHTML = `<span class="dot ok"></span>engine ok · v${h.version ?? "?"}`;
  }).catch((err) => {
    healthEl.innerHTML = `<span class="dot bad"></span>engine unreachable`;
    healthEl.title = err.message;
  });
}

export function toast(message, kind = "ok") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
