const MODULE_ID = "cinematic-combat-timeline";
const ROOT_ID = `${MODULE_ID}-root`;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ensureBootBadge(label = "CCT 0.1.6", status = "entrypoint-loaded") {
  if (!document.body) return;
  const root = document.getElementById(ROOT_ID) ?? document.createElement("aside");
  root.id = ROOT_ID;
  root.className = `${MODULE_ID} cct-root cct-entrypoint-boot`;
  root.dataset.status = status;
  root.setAttribute("aria-live", "polite");
  Object.assign(root.style, {
    position: "fixed",
    top: "140px",
    right: "18px",
    zIndex: "10000",
    display: "block",
    width: "64px",
    minHeight: "48px",
    pointerEvents: "auto"
  });
  root.innerHTML = `<button type="button"
    style="display:grid;place-items:center;width:60px;height:48px;border:2px solid #ff3b3b;border-radius:7px;background:#111;color:#ffd8d8;font-weight:800;font-size:11px;box-shadow:0 0 0 2px rgba(0,0,0,.55),0 0 18px rgba(255,59,59,.55);"
    title="Cinematic Combat Timeline ${escapeHtml(label)}"
    aria-label="Cinematic Combat Timeline ${escapeHtml(label)}">${escapeHtml(label)}</button>`;
  if (!root.isConnected) document.body.appendChild(root);
}

if (document.body) ensureBootBadge();
else window.addEventListener("DOMContentLoaded", () => ensureBootBadge(), { once: true });

import("./main.js").catch((error) => {
  console.error("Cinematic Combat Timeline | Main module import failed.", error);
  ensureBootBadge("CCT ERR", "entrypoint-import-error");
});
