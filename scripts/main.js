import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { loadTemplatesCompat, reportError } from "./foundry-compat.js";
import { registerSettings } from "./settings.js";
import { TimelineController } from "./timeline-controller.js";
import { getViewedCombat } from "./combat-adapter.js";

let timelineController = null;

async function preloadTemplates() {
  return loadTemplatesCompat([
    `modules/${MODULE_ID}/templates/timeline.hbs`,
    `modules/${MODULE_ID}/templates/countdown-config.hbs`,
    `modules/${MODULE_ID}/templates/actor-config.hbs`
  ]);
}

Hooks.once("init", () => {
  registerSettings(() => timelineController?.scheduleRender());
  void import("./actor-config.js")
    .then(({ registerActorConfigHooks }) => registerActorConfigHooks())
    .catch((error) => reportError("Actor configuration controls were not registered.", error));
  void preloadTemplates().catch((error) => reportError("Template preload failed.", error));
});

Hooks.once("ready", () => {
  document.getElementById(`${MODULE_ID}-root`)?.remove();
  timelineController = new TimelineController();
  timelineController.start();

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      get controller() {
        return timelineController;
      },
      openCountdownConfig: async () => {
        if (!game.user?.isGM) return;
        try {
          const { CountdownConfigApplication } = await import("./countdown-config.js");
          new CountdownConfigApplication({ combat: getViewedCombat() }).render({ force: true });
        } catch (error) {
          reportError("Countdown configuration could not open.", error);
        }
      },
      destroy: () => timelineController?.destroy()
    };
  }

  console.info(`${MODULE_TITLE} | Ready`);
});

Hooks.once("hotReload", () => {
  timelineController?.destroy();
  timelineController = null;
});
