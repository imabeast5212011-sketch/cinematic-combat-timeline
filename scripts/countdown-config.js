import {
  COUNTDOWN_VISIBILITY,
  MODULE_ID,
  TIE_PLACEMENTS,
  ZERO_BEHAVIORS,
  localize
} from "./constants.js?v=0.1.13";
import { getApplicationV2Api } from "./foundry-compat.js?v=0.1.13";
import { getViewedCombat } from "./combat-adapter.js?v=0.1.13";
import {
  createCountdown,
  deleteCountdown,
  getCountdowns,
  resetCountdown,
  setCountdownActive,
  setCountdownTriggered,
  updateCountdown
} from "./countdown-service.js?v=0.1.13";

const { ApplicationV2, HandlebarsApplicationMixin } = getApplicationV2Api();

function formObject(formData) {
  return formData?.object ?? Object.fromEntries(new FormData(formData));
}

function numericOrEmpty(value) {
  return value === "" || value === null || value === undefined ? "" : Number(value);
}

export class CountdownConfigApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-countdown-config`,
    classes: [MODULE_ID, "cct-config", "cct-countdown-config"],
    tag: "form",
    window: {
      title: "CCT.CountdownConfig.title"
    },
    position: {
      width: 360
    },
    form: {
      handler: this.handleSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    },
    actions: {
      browseIcon: this.browseIcon,
      delete: this.deleteCountdown,
      reset: this.resetCountdown,
      trigger: this.triggerCountdown,
      untrigger: this.untriggerCountdown,
      enable: this.enableCountdown,
      disable: this.disableCountdown
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/countdown-config.hbs`
    }
  };

  constructor(options = {}) {
    const { combat, countdown, ...applicationOptions } = options;
    super(applicationOptions);
    this.combat = combat ?? getViewedCombat();
    this.countdown = countdown ?? null;
  }

  async _prepareContext() {
    const countdowns = getCountdowns(this.combat);
    const current = this.countdown?.id
      ? countdowns.find((countdown) => countdown.id === this.countdown.id) ?? this.countdown
      : null;
    const defaults = {
      name: "",
      shortLabel: "",
      startingCount: 3,
      currentCount: 3,
      initiative: 0,
      tiePlacement: TIE_PLACEMENTS.BEFORE,
      icon: "",
      accentColor: "#6fc6d6",
      visibility: COUNTDOWN_VISIBILITY.EVERYONE,
      zeroBehavior: game.settings.get(MODULE_ID, "defaultZeroBehavior"),
      active: true,
      triggered: false
    };
    const data = { ...defaults, ...(current ?? {}) };
    return {
      data,
      isNew: !current,
      canDelete: Boolean(current && game.user?.isGM),
      tieBefore: data.tiePlacement === TIE_PLACEMENTS.BEFORE,
      tieAfter: data.tiePlacement === TIE_PLACEMENTS.AFTER,
      zeroRemain: data.zeroBehavior === ZERO_BEHAVIORS.REMAIN,
      zeroHide: data.zeroBehavior === ZERO_BEHAVIORS.HIDE,
      zeroDisable: data.zeroBehavior === ZERO_BEHAVIORS.DISABLE,
      zeroReset: data.zeroBehavior === ZERO_BEHAVIORS.RESET,
      visibilityEveryone: true,
      privacyNote: localize("CCT.CountdownConfig.privacyNote")
    };
  }

  static async handleSubmit(_event, _form, formData) {
    if (!game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.gmOnly"));
    const object = formObject(formData);
    const payload = {
      name: object.name,
      shortLabel: object.shortLabel,
      startingCount: numericOrEmpty(object.startingCount),
      currentCount: object.currentCount === "" ? object.startingCount : numericOrEmpty(object.currentCount),
      initiative: Number(object.initiative),
      tiePlacement: object.tiePlacement,
      icon: object.icon,
      accentColor: object.accentColor,
      visibility: COUNTDOWN_VISIBILITY.EVERYONE,
      zeroBehavior: object.zeroBehavior,
      active: object.active === "on" || object.active === true,
      triggered: object.triggered === "on" || object.triggered === true
    };
    if (this.countdown?.id) await updateCountdown(this.combat, this.countdown.id, payload);
    else await createCountdown(this.combat, payload);
  }

  static browseIcon(_event, target) {
    const input = target.closest("form")?.querySelector("[name='icon']");
    if (!input || !globalThis.FilePicker) return;
    new FilePicker({
      type: "image",
      callback: (path) => {
        input.value = path;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }).render(true);
  }

  static async deleteCountdown() {
    if (!this.countdown?.id) return;
    await deleteCountdown(this.combat, this.countdown.id);
    this.close();
  }

  static async resetCountdown() {
    if (!this.countdown?.id) return;
    await resetCountdown(this.combat, this.countdown.id);
    this.render({ force: true });
  }

  static async triggerCountdown() {
    if (!this.countdown?.id) return;
    await setCountdownTriggered(this.combat, this.countdown.id, true);
    this.render({ force: true });
  }

  static async untriggerCountdown() {
    if (!this.countdown?.id) return;
    await setCountdownTriggered(this.combat, this.countdown.id, false);
    this.render({ force: true });
  }

  static async enableCountdown() {
    if (!this.countdown?.id) return;
    await setCountdownActive(this.combat, this.countdown.id, true);
    this.render({ force: true });
  }

  static async disableCountdown() {
    if (!this.countdown?.id) return;
    await setCountdownActive(this.combat, this.countdown.id, false);
    this.render({ force: true });
  }
}
