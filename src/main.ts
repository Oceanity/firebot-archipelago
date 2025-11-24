import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { initModules, logger } from "@oceanity/firebot-helpers/firebot";
import { initFrontendCommunicator } from "./archipelago-frontend-events";
import { ArchipelagoUIExtension } from "./archipelago-ui-extension";
import { registerArchipelagoVariables } from "./archipelago-variables";
import { APClient } from "./archipelago/client";
import {
  ARCHIPELAGO_CLIENT_AUTHOR,
  ARCHIPELAGO_CLIENT_DESCRIPTION,
  ARCHIPELAGO_CLIENT_FIREBOT_VERSION,
  ARCHIPELAGO_CLIENT_NAME,
  ARCHIPELAGO_CLIENT_VERSION,
  ARCHIPELAGO_EVENT_SOURCE,
} from "./constants";
import { AllArchipelagoFilterEvents } from "./filters";

export let client: APClient;

const script: Firebot.CustomScript = {
  getScriptManifest: () => {
    return {
      name: ARCHIPELAGO_CLIENT_NAME,
      description: ARCHIPELAGO_CLIENT_DESCRIPTION,
      author: ARCHIPELAGO_CLIENT_AUTHOR,
      version: ARCHIPELAGO_CLIENT_VERSION,
      firebotVersion: ARCHIPELAGO_CLIENT_FIREBOT_VERSION,
    };
  },
  getDefaultParameters: () => ({}),
  run: async (runRequest) => {
    initModules(runRequest.modules);

    logger.info("Archipelago: Starting client script...");

    client = new APClient();

    initFrontendCommunicator(runRequest.modules.frontendCommunicator);

    runRequest.modules.uiExtensionManager.registerUIExtension(
      ArchipelagoUIExtension
    );

    runRequest.modules.eventManager.registerEventSource(
      ARCHIPELAGO_EVENT_SOURCE
    );

    for (const filter of AllArchipelagoFilterEvents) {
      runRequest.modules.eventFilterManager.registerFilter(filter);
    }

    registerArchipelagoVariables(
      runRequest.modules.replaceVariableFactory,
      runRequest.modules.replaceVariableManager
    );

    await client.init();
  },
};

export default script;
