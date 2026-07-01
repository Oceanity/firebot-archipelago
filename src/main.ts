import firebot, { Plugin } from "@crowbartools/firebot-types";
import { ArchipelagoState } from "./archipelago-state";
import { AllArchipelagoVariables } from "./archipelago-variables";
import { ArchipelagoUIExtension } from "./archipelago/ui/ui-extension";
import {
  ARCHIPELAGO_PLUGIN_AUTHOR,
  ARCHIPELAGO_PLUGIN_DESCRIPTION,
  ARCHIPELAGO_EVENT_SOURCE as ARCHIPELAGO_PLUGIN_EVENT_SOURCE,
  ARCHIPELAGO_PLUGIN_ICON_BACKGROUND,
  ARCHIPELAGO_PLUGIN_ICON_DATA_URI,
  ARCHIPELAGO_PLUGIN_NAME,
  ARCHIPELAGO_PLUGIN_VERSION,
} from "./constants";
import { AllArchipelagoEffectTypes } from "./effects";
import { AllArchipelagoFilterEvents } from "./filters";
import { AllArchipelagoFrontendListeners } from "./frontend-listeners";

export let archipelago: ArchipelagoState;

const plugin: Plugin = {
  manifest: {
    name: ARCHIPELAGO_PLUGIN_NAME,
    description: ARCHIPELAGO_PLUGIN_DESCRIPTION,
    icon: {
      type: "custom",
      url: ARCHIPELAGO_PLUGIN_ICON_DATA_URI,
      backgroundColor: ARCHIPELAGO_PLUGIN_ICON_BACKGROUND,
    },
    version: ARCHIPELAGO_PLUGIN_VERSION,
    author: ARCHIPELAGO_PLUGIN_AUTHOR,
  },
  registers: {
    effects: AllArchipelagoEffectTypes,
    eventSources: [ARCHIPELAGO_PLUGIN_EVENT_SOURCE],
    filters: AllArchipelagoFilterEvents,
    frontendListeners: AllArchipelagoFrontendListeners,
    uiExtensions: [ArchipelagoUIExtension],
    variables: AllArchipelagoVariables,
  },
  onLoad: async () => {
    archipelago = new ArchipelagoState();
    await archipelago.init();
  },
  onUnload: async () => {
    if (!(await archipelago.closeAllSessions())) {
      firebot.logger.error("Error disconnecting all active sessions");
    }
  },
};

export default plugin;
