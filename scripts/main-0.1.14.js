import { MODULE_ID, MODULE_TITLE } from "./constants.js?v=0.1.14";
import { loadTemplatesCompat, reportError } from "./foundry-compat.js?v=0.1.14";
import { registerSettings } from "./settings.js?v=0.1.14";
import { TimelineController } from "./timeline-controller.js?v=0.1.14";
import { getViewedCombat } from "./combat-adapter.js?v=0.1.14";

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
  void import("./actor-config.js?v=0.1.14")
    .then(({ registerActorConfigHooks }) => registerActorConfigHooks())
    .catch((error) => reportError("Actor configuration controls were not registered.", error));
  void preloadTemplates().catch((error) => reportError("Template preload failed.", error));
});

Hooks.once("ready", () => {
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
          const { CountdownConfigApplication } = await import("./countdown-config.js?v=0.1.14");
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
