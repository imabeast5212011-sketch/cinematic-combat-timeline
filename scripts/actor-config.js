import { FLAGS, MODULE_ID, clampNumber, localize } from "./constants.js";
import { getApplicationV2Api } from "./foundry-compat.js";
import {
  getActorTimelineConfig,
  isSafeColor,
  normalizeColor,
  normalizeFoundryPath
} from "./image-adapter.js";

const { ApplicationV2, HandlebarsApplicationMixin } = getApplicationV2Api();

function formObject(formData) {
  return formData?.object ?? Object.fromEntries(new FormData(formData));
}

export class ActorTimelineConfigApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-actor-config`,
    classes: [MODULE_ID, "cct-config", "cct-actor-config"],
    tag: "form",
    window: {
      title: "CCT.ActorConfig.title"
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
      clear: this.clearConfig
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/actor-config.hbs`
    }
  };

  constructor(options = {}) {
    const { actor, ...applicationOptions } = options;
    super(applicationOptions);
    this.actor = actor;
  }

  async _prepareContext() {
    const data = getActorTimelineConfig(this.actor);
    const preview = normalizeFoundryPath(data.icon || this.actor?.img || "");
    return {
      data,
      preview: preview || `modules/${MODULE_ID}/assets/unknown-combatant.svg`,
      previewStyle: [
        `--cct-fit-x: ${data.focalX}%`,
        `--cct-fit-y: ${data.focalY}%`,
        `--cct-zoom: ${data.zoom}`,
        `--cct-flip: ${data.flip ? -1 : 1}`,
        `--cct-accent: ${normalizeColor(data.accentColor, "#d6b35a")}`
      ].join("; ")
    };
  }

  static async handleSubmit(_event, _form, formData) {
    if (!this.actor?.isOwner && !game.user?.isGM) return ui.notifications?.warn(localize("CCT.Errors.actorPermission"));
    const object = formObject(formData);
    const accentColor = typeof object.accentColor === "string" && object.accentColor.trim()
      ? normalizeColor(object.accentColor, "")
      : "";
    if (object.accentColor && !isSafeColor(object.accentColor)) {
      ui.notifications?.warn(localize("CCT.Errors.color"));
      return;
    }
    const data = {
      icon: normalizeFoundryPath(object.icon),
      focalX: clampNumber(object.focalX, 0, 100, 50),
      focalY: clampNumber(object.focalY, 0, 100, 50),
      zoom: clampNumber(object.zoom, 1, 3, 1),
      flip: object.flip === "on" || object.flip === true,
      accentColor,
      shortName: typeof object.shortName === "string" ? object.shortName.trim().slice(0, 24) : ""
    };
    await this.actor.setFlag(MODULE_ID, FLAGS.ACTOR_CONFIG, data);
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

  static async clearConfig() {
    if (!this.actor?.isOwner && !game.user?.isGM) return;
    await this.actor.unsetFlag(MODULE_ID, FLAGS.ACTOR_CONFIG);
    this.close();
  }
}

export function registerActorConfigHooks() {
  Hooks.on("getHeaderControlsApplicationV2", (application, controls) => {
    const actor = application?.document?.documentName === "Actor" ? application.document : application?.actor;
    if (!actor || (!actor.isOwner && !game.user?.isGM)) return;
    const control = {
      icon: "fa-solid fa-film",
      label: "CCT.ActorConfig.button",
      action: "cinematicCombatTimelineConfig",
      onClick: () => new ActorTimelineConfigApplication({ actor }).render({ force: true })
    };
    if (Array.isArray(controls)) controls.push(control);
  });

  Hooks.on("getApplicationV1HeaderButtons", (application, buttons) => {
    const actor = application?.document?.documentName === "Actor" ? application.document : application?.actor;
    if (!actor || (!actor.isOwner && !game.user?.isGM)) return;
    buttons.unshift({
      class: "cinematic-combat-timeline-actor-config",
      icon: "fas fa-film",
      label: "CCT.ActorConfig.button",
      onclick: () => new ActorTimelineConfigApplication({ actor }).render({ force: true })
    });
  });
}
