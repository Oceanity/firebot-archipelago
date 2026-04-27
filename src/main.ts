import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { NotificationType } from "@crowbartools/firebot-custom-scripts-types/types/modules/notification-manager";
import {
  effectManager,
  eventFilterManager,
  eventManager,
  initModules,
  logger,
  replaceVariableFactory,
  replaceVariableManager,
  uiExtensionManager,
} from "@oceanity/firebot-helpers/firebot";
import { remoteVersionCheck } from "@oceanity/firebot-helpers/package";
import { initFrontendCommunicator } from "./archipelago-frontend-events";
import { ArchipelagoUIExtension } from "./archipelago-ui-extension";
import {
  registerArchipelagoVariables,
  unregisterArchipelagoVariables,
} from "./archipelago-variables";
import { APClient } from "./archipelago/client";
import {
  ARCHIPELAGO_CLIENT_AUTHOR,
  ARCHIPELAGO_CLIENT_DESCRIPTION,
  ARCHIPELAGO_CLIENT_FIREBOT_VERSION,
  ARCHIPELAGO_CLIENT_ID,
  ARCHIPELAGO_CLIENT_NAME,
  ARCHIPELAGO_CLIENT_PACKAGE_URL,
  ARCHIPELAGO_CLIENT_VERSION,
  ARCHIPELAGO_EVENT_SOURCE,
} from "./constants";
import { AllArchipelagoEffectTypes } from "./effects";
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

    uiExtensionManager?.registerUIExtension(ArchipelagoUIExtension);

    eventManager.registerEventSource(ARCHIPELAGO_EVENT_SOURCE);

    for (const effectType of AllArchipelagoEffectTypes) {
      effectType.definition.id = `${ARCHIPELAGO_CLIENT_ID}:${effectType.definition.id}`;
      effectManager.registerEffect(effectType as any);
    }

    for (const filter of AllArchipelagoFilterEvents) {
      eventFilterManager.registerFilter(filter);
    }

    registerArchipelagoVariables(
      replaceVariableFactory,
      replaceVariableManager,
    );

    await client.init();

    // Check for updates
    const response = await remoteVersionCheck(
      ARCHIPELAGO_CLIENT_VERSION,
      ARCHIPELAGO_CLIENT_PACKAGE_URL,
    );
    if (response && response.isRemoteNewer) {
      runRequest.modules.notificationManager.addNotification(
        {
          title: "New version of Archipelago Client!",
          message: `Oceanity has released a new version of the Archipelago Client script (${response.localVersion} -> ${response.remoteVersion}). Go to https://github.com/Oceanity/firebot-archipelago/releases/latest to download the new version.`,
          type: "update" as NotificationType,
        },
        false,
      );
    }
  },
  stop: (uninstalling) => {
    if (uninstalling) {
      eventManager.unregisterEventSource(ARCHIPELAGO_EVENT_SOURCE.id);

      for (const effectType of AllArchipelagoEffectTypes) {
        effectManager.unregisterEffect(effectType.definition.id);
      }

      for (const filter of AllArchipelagoFilterEvents) {
        eventFilterManager.unregisterFilter(filter.id);
      }

      unregisterArchipelagoVariables(
        replaceVariableFactory,
        replaceVariableManager,
      );
    }
  },
};

export default script;
