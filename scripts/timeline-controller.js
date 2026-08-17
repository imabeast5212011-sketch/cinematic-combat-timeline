import { ANCHORS, MODULE_ID, SELECTOR, SETTINGS, clampNumber, localize } from "./constants.js";
import {
  getViewedCombat,
  openCombatantActor,
  panToCombatantToken,
  selectCombatantToken
} from "./combat-adapter.js";
import { getTimelineSettings, setClientSetting } from "./settings.js";
import {
  adjustCountdown,
  deleteCountdown,
  getCountdowns,
  resetCountdown,
  setCountdownActive,
  setCountdownTriggered
} from "./countdown-service.js";
import { processCountdownProgression } from "./countdown-authority.js";
import { CountdownConfigApplication } from "./countdown-config.js";
import { buildTimelineState } from "./timeline-state.js";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/timeline.hbs`;
const ANCHOR_ORDER = [
  ANCHORS.MIDDLE_RIGHT,
  ANCHORS.UPPER_RIGHT,
  ANCHORS.MIDDLE_LEFT,
  ANCHORS.UPPER_LEFT
];

function renderApplication(app) {
  try {
    app.render({ force: true });
  } catch (_error) {
    app.render(true);
  }
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
    this.started = false;
    this.dragState = null;
    this.lastCombat = null;
    this.boundRender = () => this.scheduleRender();
    this.boundResize = () => this.applyPlacement();
    this.boundPointerMove = (event) => this.onPointerMove(event);
    this.boundPointerUp = () => this.onPointerUp();
  }

  start() {
    if (this.started) return;
    this.started = true;
    document.getElementById(SELECTOR.ROOT_ID)?.remove();
    this.root = document.createElement("aside");
    this.root.id = SELECTOR.ROOT_ID;
    this.root.className = `${MODULE_ID} cct-root`;
    this.root.setAttribute("aria-live", "polite");
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("dblclick", (event) => this.onDoubleClick(event));
    this.root.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.root.addEventListener("contextmenu", (event) => this.onContextMenu(event));
    this.root.addEventListener("error", (event) => this.onImageError(event), true);
    document.body.appendChild(this.root);
    this.registerHooks();
    window.addEventListener("resize", this.boundResize);
    this.scheduleRender();
  }

  destroy() {
    for (const [hook, id] of this.hookIds) Hooks.off(hook, id);
    this.hookIds = [];
    if (this.renderFrame) cancelAnimationFrame(this.renderFrame);
    this.renderFrame = null;
    window.removeEventListener("resize", this.boundResize);
    document.removeEventListener("pointermove", this.boundPointerMove);
    document.removeEventListener("pointerup", this.boundPointerUp);
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
    if (!this.started || this.renderFrame) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      void this.render();
    });
  }

  async render() {
    if (!this.root) return;
    const combat = getViewedCombat();
    this.lastCombat = combat;
    const state = buildTimelineState(combat);
    if (!state.enabled) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    this.root.dataset.collapsed = String(state.collapsed);
    this.root.dataset.expanded = String(state.expandedLabels);
    this.root.dataset.reduceAnimation = String(state.reduceAnimation);
    this.root.dataset.anchor = state.anchor;
    this.root.style.setProperty("--cct-scale", String(state.scale));
    this.root.innerHTML = await renderTemplate(TEMPLATE_PATH, state);
    this.bindDragHandle();
    this.applyPlacement();
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
      if (event.shiftKey) panToCombatantToken(combatantDocument);
      else selectCombatantToken(combatantDocument);
      return;
    }

    const countdown = event.target.closest("[data-countdown-id]");
    if (countdown && game.user?.isGM) {
      this.openCountdownConfig(countdown.dataset.countdownId);
    }
  }

  onDoubleClick(event) {
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
    this.openCountdownConfig(countdown.dataset.countdownId);
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
        if (game.user?.isGM) this.openCountdownConfig();
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

  findCombatant(combatantId) {
    if (!combatantId || !this.lastCombat) return null;
    return this.lastCombat.combatants?.get?.(combatantId)
      ?? this.lastCombat.turns?.find((combatant) => combatant.id === combatantId)
      ?? null;
  }

  openCountdownConfig(countdownId = null) {
    const combat = getViewedCombat();
    if (!combat || !game.user?.isGM) return;
    const countdown = countdownId
      ? getCountdowns(combat).find((entry) => entry.id === countdownId)
      : null;
    renderApplication(new CountdownConfigApplication({ combat, countdown }));
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
