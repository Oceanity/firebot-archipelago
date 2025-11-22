import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { initModules, logger } from "@oceanity/firebot-helpers/firebot";
import { initFrontendCommunicator } from "./archipelago-frontend-events";
import { ArchipelagoUIExtension } from "./archipelago-ui-extension";
import { registerArchipelagoVariables } from "./archipelago-variables";
import { APClient } from "./archipelago/client";
import {
  ARCHIPELAGO_EVENT_SOURCE,
  ARCHIPELAGO_INTEGRATION_AUTHOR,
  ARCHIPELAGO_INTEGRATION_DESCRIPTION,
  ARCHIPELAGO_INTEGRATION_FIREBOT_VERSION,
  ARCHIPELAGO_INTEGRATION_NAME,
  ARCHIPELAGO_INTEGRATION_VERSION,
} from "./constants";
import { AllArchipelagoFilterEvents } from "./filters";

export let client: APClient;

const script: Firebot.CustomScript = {
  getScriptManifest: () => {
    return {
      name: ARCHIPELAGO_INTEGRATION_NAME,
      description: ARCHIPELAGO_INTEGRATION_DESCRIPTION,
      author: ARCHIPELAGO_INTEGRATION_AUTHOR,
      version: ARCHIPELAGO_INTEGRATION_VERSION,
      firebotVersion: ARCHIPELAGO_INTEGRATION_FIREBOT_VERSION,
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
