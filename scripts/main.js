import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { registerSettings } from "./settings.js";
import { registerActorConfigHooks } from "./actor-config.js";
import { TimelineController } from "./timeline-controller.js";
import { CountdownConfigApplication } from "./countdown-config.js";
import { getViewedCombat } from "./combat-adapter.js";

let timelineController = null;

async function preloadTemplates() {
  return loadTemplates([
    `modules/${MODULE_ID}/templates/timeline.hbs`,
    `modules/${MODULE_ID}/templates/countdown-config.hbs`,
    `modules/${MODULE_ID}/templates/actor-config.hbs`
  ]);
}

Hooks.once("init", () => {
  registerSettings(() => timelineController?.scheduleRender());
  registerActorConfigHooks();
  void preloadTemplates();
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
      openCountdownConfig: () => {
        if (!game.user?.isGM) return;
        new CountdownConfigApplication({ combat: getViewedCombat() }).render({ force: true });
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
