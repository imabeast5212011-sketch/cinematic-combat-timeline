import { ANCHORS, MODULE_ID, SELECTOR, SETTINGS, TIE_PLACEMENTS, ZERO_BEHAVIORS, clampNumber, localize } from "./constants.js?v=0.1.14";
import { reportError } from "./foundry-compat.js?v=0.1.14";
import {
  getCombatTurns,
  getCurrentTurnIndex,
  getViewedCombat,
  openCombatantActor,
  panToCombatantToken,
  selectCombatantToken
} from "./combat-adapter.js?v=0.1.14";
import { getTimelineSettings, setClientSetting } from "./settings.js?v=0.1.14";
import {
  adjustCountdown,
  createCountdown,
  deleteCountdown,
  getCountdowns,
  resetCountdown,
  setCountdownActive,
  setCountdownTriggered,
  updateCountdown
} from "./countdown-service.js?v=0.1.14";
import { processCountdownProgression } from "./countdown-authority.js?v=0.1.14";
import { buildTimelineState } from "./timeline-state.js?v=0.1.14";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/timeline.hbs`;
const ANCHOR_ORDER = [
  ANCHORS.MIDDLE_RIGHT,
  ANCHORS.UPPER_RIGHT,
  ANCHORS.MIDDLE_LEFT,
  ANCHORS.UPPER_LEFT
];

function errorText(error, maxLength = 90) {
  const text = error?.message || error?.stack || String(error ?? "Unknown error");
  return String(text).replace(/\s+/g, " ").slice(0, maxLength);
}

function diagnosticPillHtml(label, details = "") {
  const title = details ? `${label}: ${details}` : label;
  return `<div
    class="cct-render-diagnostic"
    style="display:grid;place-items:center;width:96px;min-height:24px;margin:0 auto;padding:2px 4px;border:1px solid rgba(255,216,216,.7);border-radius:6px;background:rgba(17,17,17,.9);color:#ffd8d8;font-weight:800;font-size:10px;line-height:1.15;text-align:center;overflow-wrap:anywhere;"
    title="${escapeHtml(title)}"
    aria-hidden="true">${escapeHtml(title)}</div>`;
}

function ensureRenderShell(root) {
  if (!root) return null;
  root.querySelector("[data-cct-debug-badge]")?.remove();

  let slot = root.querySelector("[data-cct-render-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "cct-render-slot";
    slot.dataset.cctRenderSlot = "";
    Object.assign(slot.style, {
      display: "grid",
      placeItems: "start center",
      minWidth: "60px"
    });
    root.appendChild(slot);
  }
  return slot;
}

function setRenderSlot(root, html) {
  try {
    const slot = ensureRenderShell(root);
    if (slot) slot.innerHTML = html;
  } catch (error) {
    reportError("Render slot update failed.", error);
    try {
      const slot = ensureRenderShell(root);
      if (slot) slot.textContent = `SLOT ${errorText(error, 60)}`;
    } catch (_fallbackError) {
      if (root) root.textContent = `CCT SLOT ${errorText(error, 60)}`;
    }
  }
}

function minimalEntryHtml(entry) {
  if (entry.isDivider) {
    return `<li style="height:1px;width:40px;margin:2px auto;border-top:1px dashed rgba(155,216,255,.7);"></li>`;
  }
  const marker = entry.current ? "NOW" : (entry.isCountdown ? escapeHtml(entry.count) : "");
  const label = entry.label || entry.initiative || "";
  const rollButton = entry.canRollInitiative && entry.combatantId
    ? `<button
      type="button"
      class="cct-entry-action cct-roll-initiative"
      data-action="roll-initiative"
      data-combatant-id="${escapeHtml(entry.combatantId)}"
      title="${escapeHtml(localize("CCT.RollInitiative"))}"
      aria-label="${escapeHtml(localize("CCT.RollInitiative"))}"
      style="position:absolute;left:-7px;top:-4px;display:grid;place-items:center;width:14px;height:14px;padding:0;border:1px solid rgba(155,216,255,.86);border-radius:999px;background:#07131a;color:#d8f1ff;font-size:9px;font-weight:800;line-height:1;z-index:2;">D</button>`
    : "";
  const removeCombatantButton = entry.canRemoveCombatant && entry.combatantId
    ? `<button
      type="button"
      class="cct-entry-action cct-remove-combatant"
      data-action="remove-combatant"
      data-combatant-id="${escapeHtml(entry.combatantId)}"
      title="${escapeHtml(localize("CCT.RemoveCombatant"))}"
      aria-label="${escapeHtml(localize("CCT.RemoveCombatant"))}"
      style="position:absolute;right:-7px;top:-4px;display:grid;place-items:center;width:14px;height:14px;padding:0;border:1px solid rgba(255,176,168,.86);border-radius:999px;background:#1a0808;color:#ffb0a8;font-size:9px;font-weight:800;line-height:1;z-index:2;">X</button>`
    : "";
  const removeCountdownButton = entry.canDeleteCountdown && entry.countdownId
    ? `<button
      type="button"
      class="cct-entry-action cct-remove-countdown"
      data-action="countdown-delete"
      data-countdown-id="${escapeHtml(entry.countdownId)}"
      title="${escapeHtml(localize("CCT.Countdown.delete"))}"
      aria-label="${escapeHtml(localize("CCT.Countdown.delete"))}"
      style="position:absolute;right:-7px;top:-4px;display:grid;place-items:center;width:14px;height:14px;padding:0;border:1px solid rgba(255,176,168,.86);border-radius:999px;background:#1a0808;color:#ffb0a8;font-size:9px;font-weight:800;line-height:1;z-index:2;">X</button>`
    : "";
  return `<li
    class="cct-minimal-entry"
    style="position:relative;display:grid;place-items:center;width:42px;min-height:42px;margin:2px auto;padding:0;list-style:none;"
    ${entry.combatantId ? `data-combatant-id="${escapeHtml(entry.combatantId)}"` : ""}
    ${entry.countdownId ? `data-countdown-id="${escapeHtml(entry.countdownId)}"` : ""}
    role="button"
    tabindex="0"
    title="${escapeHtml(entry.tooltip || entry.ariaLabel || "")}">
    <img
      src="${escapeHtml(entry.image)}"
      data-fallback="${escapeHtml(entry.fallbackImage)}"
      alt=""
      style="width:38px;height:38px;border:2px solid #d6b35a;border-radius:${entry.isCountdown ? "999px" : "6px"};object-fit:cover;background:#111;">
    ${rollButton}
    ${removeCombatantButton}
    ${removeCountdownButton}
    ${marker ? `<span style="position:absolute;right:-2px;bottom:-1px;min-width:16px;padding:1px 3px;border-radius:999px;background:#111;color:#ffe58f;font-size:8px;font-weight:800;text-align:center;">${escapeHtml(marker)}</span>` : ""}
    ${label ? `<span style="margin-top:2px;max-width:62px;overflow:hidden;color:#f4f1e8;font-size:9px;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(label)}</span>` : ""}
  </li>`;
}

function minimalTimelineHtml(state, error = null) {
  const details = error ? errorText(error, 60) : "";
  if (!state?.hasCombat) return "";
  const entries = Array.isArray(state.entries) ? state.entries : [];
  if (!entries.length) return diagnosticPillHtml("NO ENTRIES", details);
  return `<section
    class="cct-panel cct-minimal-panel"
    style="width:68px;padding:4px;border:1px solid rgba(214,179,90,.5);border-radius:7px;background:rgba(19,20,20,.88);box-shadow:0 3px 12px rgba(0,0,0,.35);"
    aria-label="${escapeHtml(localize("CCT.TimelineAria"))}">
    <div style="margin-bottom:4px;color:#f2d27a;font-size:10px;font-weight:800;text-align:center;">${escapeHtml(state.roundLabel || "CCT")}</div>
    ${details ? `<div style="margin-bottom:4px;color:#ffb0a8;font-size:8px;line-height:1.1;text-align:center;overflow-wrap:anywhere;">${escapeHtml(details)}</div>` : ""}
    <ol style="display:flex;flex-direction:column;gap:2px;margin:0;padding:0;">${entries.map(minimalEntryHtml).join("")}</ol>
  </section>`;
}

function applyDefaultPlacement(root) {
  if (!root) return;
  root.classList.remove(...ANCHOR_ORDER.map((anchor) => `cct-anchor-${anchor}`));
  Object.assign(root.style, {
    position: "fixed",
    top: "140px",
    right: "18px",
    bottom: "",
    left: "",
    transform: "",
    zIndex: "10000",
    display: "block"
  });
}

async function renderApplication(app) {
  try {
    await app.render({ force: true });
  } catch (error) {
    reportError("ApplicationV2 render failed; trying legacy render.", error);
    await app.render(true);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fallbackEntryHtml(entry) {
  if (entry.isDivider) return `<li class="${escapeHtml(entry.classes)}" role="separator"><span></span></li>`;
  const dataAttributes = [
    entry.combatantId ? `data-combatant-id="${escapeHtml(entry.combatantId)}"` : "",
    entry.countdownId ? `data-countdown-id="${escapeHtml(entry.countdownId)}"` : ""
  ].filter(Boolean).join(" ");
  return `<li class="${escapeHtml(entry.classes)}" style="${escapeHtml(entry.style)}" ${dataAttributes} role="button" tabindex="0" title="${escapeHtml(entry.tooltip)}" aria-label="${escapeHtml(entry.ariaLabel)}">
    <div class="cct-icon-frame">
      <img class="cct-icon" src="${escapeHtml(entry.image)}" data-fallback="${escapeHtml(entry.fallbackImage)}" alt="">
      ${entry.current ? '<span class="cct-now" aria-hidden="true">NOW</span>' : ""}
      ${entry.isCountdown ? `<span class="cct-count" aria-hidden="true">${escapeHtml(entry.count)}</span>` : ""}
      ${entry.showDefeated ? '<span class="cct-defeated-mark" aria-hidden="true">x</span>' : ""}
      ${entry.showPreviewBadge ? '<span class="cct-preview-mark" aria-hidden="true">N</span>' : ""}
    </div>
    ${entry.canRollInitiative ? `<button type="button" class="cct-entry-action cct-roll-initiative" data-action="roll-initiative" data-combatant-id="${escapeHtml(entry.combatantId)}" title="${escapeHtml(localize("CCT.RollInitiative"))}" aria-label="${escapeHtml(localize("CCT.RollInitiative"))}">D</button>` : ""}
    ${entry.canRemoveCombatant ? `<button type="button" class="cct-entry-action cct-remove-combatant" data-action="remove-combatant" data-combatant-id="${escapeHtml(entry.combatantId)}" title="${escapeHtml(localize("CCT.RemoveCombatant"))}" aria-label="${escapeHtml(localize("CCT.RemoveCombatant"))}">X</button>` : ""}
    ${entry.canDeleteCountdown ? `<button type="button" class="cct-entry-action cct-remove-countdown" data-action="countdown-delete" data-countdown-id="${escapeHtml(entry.countdownId)}" title="${escapeHtml(localize("CCT.Countdown.delete"))}" aria-label="${escapeHtml(localize("CCT.Countdown.delete"))}">X</button>` : ""}
  </li>`;
}

function combatControlsHtml(state) {
  if (!state.canControlCombat) return "";
  return `<footer class="cct-combat-controls" aria-label="${escapeHtml(localize("CCT.CombatControls"))}">
    <button type="button" class="cct-combat-control" data-action="previous-turn" title="${escapeHtml(state.controls.previousTurn)}" aria-label="${escapeHtml(state.controls.previousTurn)}">&lt;</button>
    <button type="button" class="cct-combat-control" data-action="next-turn" title="${escapeHtml(state.controls.nextTurn)}" aria-label="${escapeHtml(state.controls.nextTurn)}">&gt;</button>
    <button type="button" class="cct-combat-control cct-combat-end" data-action="end-combat" title="${escapeHtml(state.controls.endCombat)}" aria-label="${escapeHtml(state.controls.endCombat)}">X</button>
  </footer>`;
}

function fallbackTimelineHtml(state) {
  if (!state?.hasCombat) return "";
  if (state.collapsed) {
    return `<button type="button" class="cct-collapsed-button" data-action="toggle-collapse" title="${escapeHtml(state.controls.collapse)}" aria-label="${escapeHtml(state.currentAria)}">
      <img class="cct-collapsed-image" src="${escapeHtml(state.currentImage)}" data-fallback="${escapeHtml(state.currentFallbackImage)}" alt="">
      ${state.roundLabel ? `<span class="cct-collapsed-round">${escapeHtml(state.roundLabel)}</span>` : ""}
    </button>`;
  }
  return `<section class="cct-panel" aria-label="${escapeHtml(localize("CCT.TimelineAria"))}">
    <header class="cct-toolbar">
      <button type="button" class="cct-tool cct-drag-handle" data-action="drag" title="${escapeHtml(localize("CCT.DragTimeline"))}" aria-label="${escapeHtml(localize("CCT.DragTimeline"))}">::</button>
      <span class="cct-round-label">${escapeHtml(state.roundLabel)}</span>
      <button type="button" class="cct-tool" data-action="toggle-labels" title="${escapeHtml(state.controls.labels)}" aria-label="${escapeHtml(state.controls.labels)}">T</button>
      <button type="button" class="cct-tool" data-action="cycle-anchor" title="${escapeHtml(state.controls.anchor)}" aria-label="${escapeHtml(state.controls.anchor)}">A</button>
      <button type="button" class="cct-tool" data-action="scale-down" title="${escapeHtml(state.controls.scaleDown)}" aria-label="${escapeHtml(state.controls.scaleDown)}">-</button>
      <button type="button" class="cct-tool" data-action="scale-up" title="${escapeHtml(state.controls.scaleUp)}" aria-label="${escapeHtml(state.controls.scaleUp)}">+</button>
      ${state.canCreateCountdown ? `<button type="button" class="cct-tool" data-action="new-countdown" title="${escapeHtml(state.controls.addCountdown)}" aria-label="${escapeHtml(state.controls.addCountdown)}">C</button>` : ""}
      <button type="button" class="cct-tool" data-action="toggle-collapse" title="${escapeHtml(state.controls.collapse)}" aria-label="${escapeHtml(state.controls.collapse)}">_</button>
    </header>
    ${state.hasCombat ? `<ol class="cct-entry-list">${state.entries.map(fallbackEntryHtml).join("")}</ol>` : `<div class="cct-no-combat">${escapeHtml(state.noCombatLabel)}</div>`}
    ${combatControlsHtml(state)}
  </section>`;
}

function clampPosition(position, element) {
  const width = element?.offsetWidth || 72;
  const height = element?.offsetHeight || 360;
  const margin = 8;
  return {
    left: clampNumber(position?.left, margin, Math.max(margin, window.innerWidth - width - margin), margin),
    top: clampNumber(position?.top, margin, Math.max(margin, window.innerHeight - height - margin), margin)
  };
}

export class TimelineController {
  constructor() {
    this.root = null;
    this.hookIds = [];
    this.renderFrame = null;
    this.renderTimer = null;
    this.rendering = false;
    this.started = false;
    this.dragState = null;
    this.lastCombat = null;
    this.countdownEditor = null;
    this.boundRender = () => this.scheduleRender();
    this.boundResize = () => this.applyPlacement();
    this.boundPointerMove = (event) => this.onPointerMove(event);
    this.boundPointerUp = () => this.onPointerUp();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.root = document.getElementById(SELECTOR.ROOT_ID) ?? document.createElement("aside");
    this.root.id = SELECTOR.ROOT_ID;
    this.root.className = `${MODULE_ID} cct-root`;
    this.root.setAttribute("aria-live", "polite");
    this.root.dataset.status = "mounted";
    this.root.style.removeProperty("width");
    this.root.style.removeProperty("min-height");
    Object.assign(this.root.style, {
      position: "fixed",
      top: "140px",
      right: "18px",
      zIndex: "10000",
      display: "none",
      pointerEvents: "auto"
    });
    this.root.hidden = true;
    this.root.innerHTML = "";
    ensureRenderShell(this.root);
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("dblclick", (event) => this.onDoubleClick(event));
    this.root.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.root.addEventListener("contextmenu", (event) => this.onContextMenu(event));
    this.root.addEventListener("error", (event) => this.onImageError(event), true);
    if (!this.root.isConnected) document.body.appendChild(this.root);
    this.registerHooks();
    window.addEventListener("resize", this.boundResize);
    void this.safeRender("initial");
    this.scheduleRender();
  }

  destroy() {
    for (const [hook, id] of this.hookIds) Hooks.off(hook, id);
    this.hookIds = [];
    if (this.renderFrame) cancelAnimationFrame(this.renderFrame);
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.renderFrame = null;
    this.renderTimer = null;
    this.rendering = false;
    window.removeEventListener("resize", this.boundResize);
    document.removeEventListener("pointermove", this.boundPointerMove);
    document.removeEventListener("pointerup", this.boundPointerUp);
    this.closeCountdownEditor();
    this.root?.remove();
    this.root = null;
    this.started = false;
  }

  registerHooks() {
    const hook = (name, handler) => {
      const id = Hooks.on(name, handler);
      this.hookIds.push([name, id]);
    };

    hook("createCombat", this.boundRender);
    hook("updateCombat", this.boundRender);
    hook("deleteCombat", this.boundRender);
    hook("combatStart", this.boundRender);
    hook("combatRound", this.boundRender);
    hook("combatTurn", this.boundRender);
    hook("combatTurnChange", async (combat, prior, current) => {
      await processCountdownProgression(combat, prior, current);
      this.scheduleRender();
    });
    hook("createCombatant", this.boundRender);
    hook("updateCombatant", this.boundRender);
    hook("deleteCombatant", this.boundRender);
    hook("updateActor", this.boundRender);
    hook("updateToken", this.boundRender);
    hook("canvasReady", this.boundRender);
    hook("canvasTearDown", this.boundRender);
    hook("changeSidebarTab", this.boundRender);
    hook("userConnected", this.boundRender);
  }

  scheduleRender() {
    if (!this.started || this.renderFrame || this.renderTimer) return;
    const run = () => {
      if (this.renderTimer) clearTimeout(this.renderTimer);
      this.renderTimer = null;
      this.renderFrame = null;
      void this.safeRender("scheduled");
    };

    if (typeof requestAnimationFrame === "function") {
      this.renderFrame = requestAnimationFrame(run);
    }
    this.renderTimer = setTimeout(run, 75);
  }

  async safeRender(reason) {
    if (!this.started || this.rendering) return;
    this.rendering = true;
    if (this.root) this.root.dataset.status = `rendering-${reason}`;
    try {
      await this.render();
      if (this.root) this.root.dataset.status = "rendered";
    } catch (error) {
      reportError("Timeline render failed.", error);
      if (this.root) {
        this.root.hidden = false;
        this.root.style.display = "block";
        this.root.dataset.status = "render-error";
        setRenderSlot(this.root, diagnosticPillHtml("ERR", errorText(error)), "CCT ERR");
        applyDefaultPlacement(this.root);
      }
    } finally {
      this.rendering = false;
    }
  }

  async render() {
    if (!this.root) return;
    let combat = null;
    let state = null;
    try {
      combat = getViewedCombat();
      this.lastCombat = combat;
      state = buildTimelineState(combat);
    } catch (error) {
      reportError("Timeline state failed.", error);
      this.root.hidden = false;
      this.root.style.display = "block";
      setRenderSlot(this.root, diagnosticPillHtml("STATE", errorText(error)), "CCT ERR");
      return;
    }
    if (!state.enabled) {
      this.root.hidden = true;
      this.root.style.display = "none";
      this.root.dataset.status = "disabled-setting";
      setRenderSlot(this.root, "");
      this.closeCountdownEditor();
      return;
    }
    if (!state.hasCombat) {
      this.root.hidden = true;
      this.root.style.display = "none";
      this.root.dataset.status = "no-combat";
      this.root.dataset.hasCombat = "false";
      setRenderSlot(this.root, "");
      this.closeCountdownEditor();
      return;
    }
    this.root.hidden = false;
    this.root.style.display = "block";
    this.root.dataset.collapsed = String(state.collapsed);
    this.root.dataset.expanded = String(state.expandedLabels);
    this.root.dataset.reduceAnimation = String(state.reduceAnimation);
    this.root.dataset.anchor = state.anchor;
    this.root.dataset.entries = String(state.entries?.length ?? 0);
    this.root.dataset.hasCombat = String(state.hasCombat);
    this.root.dataset.started = String(state.started);
    this.root.style.setProperty("--cct-scale", String(state.scale));
    try {
      setRenderSlot(this.root, fallbackTimelineHtml(state));
    } catch (error) {
      reportError("Timeline HTML render failed.", error);
      this.root.dataset.status = "html-render-error";
      setRenderSlot(this.root, minimalTimelineHtml(state, error), "CCT SIMPLE");
    }

    try {
      this.bindDragHandle();
    } catch (error) {
      reportError("Timeline drag binding failed.", error);
      this.root.dataset.drag = "error";
    }

    try {
      this.applyPlacement();
    } catch (error) {
      reportError("Timeline placement failed.", error);
      this.root.dataset.placement = "error";
      applyDefaultPlacement(this.root);
    }
  }

  applyPlacement() {
    if (!this.root) return;
    const settings = getTimelineSettings();
    const custom = settings.customPosition;
    this.root.classList.remove(...ANCHOR_ORDER.map((anchor) => `cct-anchor-${anchor}`));
    this.root.style.removeProperty("left");
    this.root.style.removeProperty("top");
    this.root.style.removeProperty("right");
    this.root.style.removeProperty("bottom");
    this.root.style.removeProperty("transform");

    if (custom && Number.isFinite(Number(custom.left)) && Number.isFinite(Number(custom.top))) {
      const clamped = clampPosition(custom, this.root);
      this.root.style.left = `${clamped.left}px`;
      this.root.style.top = `${clamped.top}px`;
      return;
    }

    const anchor = Object.values(ANCHORS).includes(settings.anchor) ? settings.anchor : ANCHORS.MIDDLE_RIGHT;
    this.root.classList.add(`cct-anchor-${anchor}`);
  }

  async cycleAnchor() {
    const settings = getTimelineSettings();
    const index = ANCHOR_ORDER.indexOf(settings.anchor);
    const next = ANCHOR_ORDER[(index + 1 + ANCHOR_ORDER.length) % ANCHOR_ORDER.length];
    await setClientSetting(SETTINGS.CUSTOM_POSITION, null);
    await setClientSetting(SETTINGS.ANCHOR, next);
    this.scheduleRender();
  }

  async changeScale(delta) {
    const settings = getTimelineSettings();
    await setClientSetting(SETTINGS.SCALE, clampNumber(settings.scale + delta, 0.75, 1.5, 1));
    this.scheduleRender();
  }

  onClick(event) {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) {
      event.preventDefault();
      event.stopPropagation();
      void this.handleAction(actionTarget.dataset.action, actionTarget, event);
      return;
    }

    const combatant = event.target.closest("[data-combatant-id]");
    if (combatant) {
      const combatantDocument = this.findCombatant(combatant.dataset.combatantId);
      if (!combatantDocument) return;
      if (event.altKey && game.user?.isGM) void this.rollCombatantInitiative(combatant);
      else if (event.shiftKey) panToCombatantToken(combatantDocument);
      else selectCombatantToken(combatantDocument);
      return;
    }

    const countdown = event.target.closest("[data-countdown-id]");
    if (countdown && game.user?.isGM) return;
  }

  onDoubleClick(event) {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) return;

    const countdown = event.target.closest("[data-countdown-id]");
    if (countdown && game.user?.isGM) {
      event.preventDefault();
      event.stopPropagation();
      void this.openCountdownConfig(countdown.dataset.countdownId);
      return;
    }

    const combatant = event.target.closest("[data-combatant-id]");
    if (!combatant) return;
    const settings = getTimelineSettings();
    if (!settings.allowActorSheetOpen) return;
    const combatantDocument = this.findCombatant(combatant.dataset.combatantId);
    if (combatantDocument) openCombatantActor(combatantDocument);
  }

  onKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest("[data-combatant-id], [data-countdown-id], [data-action]");
    if (!target) return;
    event.preventDefault();
    target.click();
  }

  onContextMenu(event) {
    const countdown = event.target.closest("[data-countdown-id]");
    if (!countdown || !game.user?.isGM) return;
    event.preventDefault();
    void this.openCountdownConfig(countdown.dataset.countdownId);
  }

  onImageError(event) {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const fallback = img.dataset.fallback;
    if (fallback && img.src !== fallback) img.src = fallback;
  }

  async handleAction(action, target) {
    switch (action) {
      case "toggle-collapse": {
        const settings = getTimelineSettings();
        await setClientSetting(SETTINGS.SHOW_TIMELINE, !settings.showTimeline);
        break;
      }
      case "toggle-labels": {
        const settings = getTimelineSettings();
        await setClientSetting(SETTINGS.EXPANDED_LABELS, !settings.expandedLabels);
        break;
      }
      case "cycle-anchor":
        await this.cycleAnchor();
        break;
      case "scale-down":
        await this.changeScale(-0.05);
        break;
      case "scale-up":
        await this.changeScale(0.05);
        break;
      case "new-countdown":
        await this.createDefaultCountdown();
        break;
      case "previous-turn":
        await this.previousTurn();
        break;
      case "next-turn":
        await this.nextTurn();
        break;
      case "end-combat":
        await this.endCombat();
        break;
      case "remove-combatant":
        await this.removeCombatant(target);
        break;
      case "roll-initiative":
        await this.rollCombatantInitiative(target);
        break;
      case "drag":
        break;
      case "countdown-plus":
        await this.withCountdown(target, (combat, id) => adjustCountdown(combat, id, 1));
        break;
      case "countdown-minus":
        await this.withCountdown(target, (combat, id) => adjustCountdown(combat, id, -1));
        break;
      case "countdown-reset":
        await this.withCountdown(target, (combat, id) => resetCountdown(combat, id));
        break;
      case "countdown-trigger":
        await this.withCountdown(target, (combat, id) => setCountdownTriggered(combat, id, true));
        break;
      case "countdown-untrigger":
        await this.withCountdown(target, (combat, id) => setCountdownTriggered(combat, id, false));
        break;
      case "countdown-disable":
        await this.withCountdown(target, (combat, id) => setCountdownActive(combat, id, false));
        break;
      case "countdown-enable":
        await this.withCountdown(target, (combat, id) => setCountdownActive(combat, id, true));
        break;
      case "countdown-delete":
        await this.withCountdown(target, (combat, id) => deleteCountdown(combat, id));
        break;
      default:
        break;
    }
    this.scheduleRender();
  }

  async withCountdown(target, operation) {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const id = target.closest("[data-countdown-id]")?.dataset.countdownId;
    const combat = getViewedCombat();
    if (!id || !combat) return;
    await operation(combat, id);
  }

  async removeCombatant(target) {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    const combat = getViewedCombat();
    if (!combatantId || !combat) return ui.notifications?.warn(localize("CCT.Errors.noCombat"));
    const combatant = this.findCombatant(combatantId);
    if (!combatant) return;

    if (typeof combatant.delete === "function") {
      await combatant.delete();
    } else if (typeof combat.deleteEmbeddedDocuments === "function") {
      await combat.deleteEmbeddedDocuments("Combatant", [combatantId]);
    }
    ui.notifications?.info?.(localize("CCT.Combatant.removed"));
    this.scheduleRender();
  }

  async rollCombatantInitiative(target) {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    const combat = getViewedCombat();
    if (!combatantId || !combat) return ui.notifications?.warn(localize("CCT.Errors.noCombat"));

    if (typeof combat.rollInitiative === "function") {
      await combat.rollInitiative([combatantId], { updateTurn: true });
    } else {
      const combatant = this.findCombatant(combatantId);
      await combatant?.rollInitiative?.();
    }
    ui.notifications?.info?.(localize("CCT.InitiativeRolled"));
    this.scheduleRender();
  }

  currentCombatantInitiative(combat) {
    const turns = getCombatTurns(combat);
    const currentTurnIndex = getCurrentTurnIndex(combat, turns);
    const current = Number.isInteger(currentTurnIndex)
      ? turns[currentTurnIndex]
      : combat?.combatant;
    const initiative = Number(current?.initiative);
    if (Number.isFinite(initiative)) return initiative;

    const firstInitiative = turns
      .map((combatant) => Number(combatant?.initiative))
      .find((value) => Number.isFinite(value));
    return firstInitiative ?? 0;
  }

  async createDefaultCountdown() {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const combat = getViewedCombat();
    if (!combat) return ui.notifications?.warn(localize("CCT.Errors.noCombat"));

    await createCountdown(combat, {
      name: localize("CCT.Countdown.defaultName"),
      shortLabel: "T",
      startingCount: 3,
      currentCount: 3,
      initiative: this.currentCombatantInitiative(combat),
      tiePlacement: TIE_PLACEMENTS.AFTER,
      icon: "",
      accentColor: "#6fc6d6",
      zeroBehavior: ZERO_BEHAVIORS.REMAIN,
      active: true,
      triggered: false
    });
    ui.notifications?.info?.(localize("CCT.Countdown.created"));
    this.scheduleRender();
  }

  async previousTurn() {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const combat = getViewedCombat();
    if (!combat) return ui.notifications?.warn(localize("CCT.Errors.noCombat"));
    if (typeof combat.previousTurn === "function") await combat.previousTurn();
    this.scheduleRender();
  }

  async nextTurn() {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const combat = getViewedCombat();
    if (!combat) return ui.notifications?.warn(localize("CCT.Errors.noCombat"));
    if (!combat.started && typeof combat.startCombat === "function") await combat.startCombat();
    else if (typeof combat.nextTurn === "function") await combat.nextTurn();
    this.scheduleRender();
  }

  async endCombat() {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const combat = getViewedCombat();
    if (!combat) return ui.notifications?.warn(localize("CCT.Errors.noCombat"));
    if (typeof combat.endCombat === "function") await combat.endCombat();
    else if (typeof combat.delete === "function") await combat.delete();
    this.scheduleRender();
  }

  findCombatant(combatantId) {
    if (!combatantId || !this.lastCombat) return null;
    return this.lastCombat.combatants?.get?.(combatantId)
      ?? this.lastCombat.turns?.find((combatant) => combatant.id === combatantId)
      ?? null;
  }

  async openCountdownConfig(countdownId = null) {
    const combat = getViewedCombat();
    if (!combat || !game.user?.isGM) return;
    const countdown = countdownId
      ? getCountdowns(combat).find((entry) => entry.id === countdownId)
      : null;
    if (countdown) this.openCountdownEditor(combat, countdown);
  }

  closeCountdownEditor() {
    this.countdownEditor?.remove();
    this.countdownEditor = null;
  }

  countdownEditorHtml(countdown) {
    const zeroOptions = Object.values(ZERO_BEHAVIORS)
      .map((value) => `<option value="${escapeHtml(value)}" ${countdown.zeroBehavior === value ? "selected" : ""}>${escapeHtml(localize(`CCT.ZeroBehavior.${value}`))}</option>`)
      .join("");
    return `<form class="cct-countdown-editor" aria-label="${escapeHtml(localize("CCT.CountdownConfig.title"))}">
      <header class="cct-countdown-editor-header">
        <strong>${escapeHtml(localize("CCT.CountdownConfig.title"))}</strong>
        <button type="button" data-editor-action="close" title="${escapeHtml(localize("CCT.Close"))}" aria-label="${escapeHtml(localize("CCT.Close"))}">X</button>
      </header>
      <label>${escapeHtml(localize("CCT.Countdown.name"))}<input type="text" name="name" value="${escapeHtml(countdown.name)}" maxlength="80" required></label>
      <label>${escapeHtml(localize("CCT.Countdown.shortLabel"))}<input type="text" name="shortLabel" value="${escapeHtml(countdown.shortLabel)}" maxlength="10"></label>
      <div class="cct-countdown-editor-grid">
        <label>${escapeHtml(localize("CCT.Countdown.startingCount"))}<input type="number" name="startingCount" min="0" max="999" step="1" value="${escapeHtml(countdown.startingCount)}" required></label>
        <label>${escapeHtml(localize("CCT.Countdown.currentCount"))}<input type="number" name="currentCount" min="0" max="999" step="1" value="${escapeHtml(countdown.currentCount)}" required></label>
      </div>
      <label>${escapeHtml(localize("CCT.Countdown.initiative"))}<input type="number" name="initiative" step="0.01" value="${escapeHtml(countdown.initiative)}" required></label>
      <label>${escapeHtml(localize("CCT.Countdown.zeroBehavior"))}<select name="zeroBehavior">${zeroOptions}</select></label>
      <label class="cct-countdown-editor-check"><input type="checkbox" name="active" ${countdown.active ? "checked" : ""}> ${escapeHtml(localize("CCT.Countdown.active"))}</label>
      <footer class="cct-countdown-editor-footer">
        <button type="submit">${escapeHtml(localize("CCT.Save"))}</button>
        <button type="button" data-editor-action="delete">${escapeHtml(localize("CCT.Delete"))}</button>
      </footer>
    </form>`;
  }

  openCountdownEditor(combat, countdown) {
    this.closeCountdownEditor();
    const wrapper = document.createElement("div");
    wrapper.className = "cct-countdown-editor-shell";
    wrapper.innerHTML = this.countdownEditorHtml(countdown);
    document.body.appendChild(wrapper);
    this.countdownEditor = wrapper;

    const form = wrapper.querySelector("form");
    form?.querySelector("input[name='name']")?.focus();
    wrapper.addEventListener("click", (event) => {
      if (event.target === wrapper || event.target.closest("[data-editor-action='close']")) {
        event.preventDefault();
        this.closeCountdownEditor();
        return;
      }
      if (event.target.closest("[data-editor-action='delete']")) {
        event.preventDefault();
        void this.deleteCountdownFromEditor(combat, countdown.id);
      }
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.saveCountdownFromEditor(combat, countdown.id, new FormData(form));
    });
  }

  async saveCountdownFromEditor(combat, countdownId, formData) {
    try {
      await updateCountdown(combat, countdownId, {
        name: formData.get("name"),
        shortLabel: formData.get("shortLabel"),
        startingCount: Number(formData.get("startingCount")),
        currentCount: Number(formData.get("currentCount")),
        initiative: Number(formData.get("initiative")),
        zeroBehavior: formData.get("zeroBehavior"),
        active: formData.get("active") === "on"
      });
      ui.notifications?.info?.(localize("CCT.Countdown.saved"));
      this.closeCountdownEditor();
      this.scheduleRender();
    } catch (error) {
      reportError("Countdown save failed.", error);
      ui.notifications?.error?.(localize("CCT.Errors.countdownSave"));
    }
  }

  async deleteCountdownFromEditor(combat, countdownId) {
    try {
      await deleteCountdown(combat, countdownId);
      ui.notifications?.info?.(localize("CCT.Countdown.deleted"));
      this.closeCountdownEditor();
      this.scheduleRender();
    } catch (error) {
      reportError("Countdown delete failed.", error);
      ui.notifications?.error?.(localize("CCT.Errors.countdownDelete"));
    }
  }

  onPointerDown(event) {
    if (event.button !== 0 || !this.root) return;
    const rect = this.root.getBoundingClientRect();
    this.dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    document.addEventListener("pointermove", this.boundPointerMove);
    document.addEventListener("pointerup", this.boundPointerUp, { once: true });
  }

  onPointerMove(event) {
    if (!this.dragState || !this.root) return;
    const position = clampPosition({
      left: event.clientX - this.dragState.offsetX,
      top: event.clientY - this.dragState.offsetY
    }, this.root);
    this.root.style.left = `${position.left}px`;
    this.root.style.top = `${position.top}px`;
    this.root.style.removeProperty("right");
    this.root.style.removeProperty("bottom");
    this.root.style.removeProperty("transform");
  }

  async onPointerUp() {
    if (!this.dragState || !this.root) return;
    const rect = this.root.getBoundingClientRect();
    this.dragState = null;
    document.removeEventListener("pointermove", this.boundPointerMove);
    const position = clampPosition({ left: rect.left, top: rect.top }, this.root);
    await setClientSetting(SETTINGS.CUSTOM_POSITION, position);
    this.scheduleRender();
  }

  bindDragHandle() {
    const handle = this.root?.querySelector("[data-action='drag']");
    if (!handle) return;
    handle.addEventListener("pointerdown", (event) => this.onPointerDown(event));
  }
}
