import {
  Firebot,
  Integration,
} from "@crowbartools/firebot-custom-scripts-types";
import { initModules, logger } from "@oceanity/firebot-helpers/firebot";
import { initFrontendCommunicator } from "./archipelago-frontend-events";
import { initArchipelagoIntegration } from "./archipelago-integration";
import { ArchipelagoUIExtension } from "./archipelago-ui-extension";
import {
  ARCHIPELAGO_EVENT_SOURCE,
  ARCHIPELAGO_INTEGRATION_AUTHOR,
  ARCHIPELAGO_INTEGRATION_DESCRIPTION,
  ARCHIPELAGO_INTEGRATION_FIREBOT_VERSION,
  ARCHIPELAGO_INTEGRATION_NAME,
  ARCHIPELAGO_INTEGRATION_VERSION,
} from "./constants";
import { ArchipelagoIntegrationDefinition } from "./integration-definition";
import { ArchipelagoIntegrationSettings } from "./types";

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
  run: (runRequest) => {
    initModules(runRequest.modules);

    logger.info("Archipelago Integration Script started");

    const integration: Integration<ArchipelagoIntegrationSettings> = {
      definition: ArchipelagoIntegrationDefinition,
      integration: initArchipelagoIntegration(runRequest.modules.eventManager),
    };

    runRequest.modules.integrationManager.registerIntegration(integration);

    runRequest.modules.uiExtensionManager.registerUIExtension(
      ArchipelagoUIExtension
    );

    runRequest.modules.eventManager.registerEventSource(
      ARCHIPELAGO_EVENT_SOURCE
    );

    initFrontendCommunicator(runRequest.modules.frontendCommunicator);
  },
};

export default script;
