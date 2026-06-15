import firebot, { Plugin } from "@crowbartools/firebot-types";
import { remoteVersionCheck } from "@oceanity/firebot-helpers/package/remoteVersionCheck";
import { Client } from "archipelago.js";
import { AllArchipelagoVariables } from "./archipelago-variables";
import { APClient } from "./archipelago/client";
import {
  ARCHIPELAGO_PLUGIN_AUTHOR,
  ARCHIPELAGO_PLUGIN_DESCRIPTION,
  ARCHIPELAGO_EVENT_SOURCE as ARCHIPELAGO_PLUGIN_EVENT_SOURCE,
  ARCHIPELAGO_PLUGIN_ICON_BACKGROUND,
  ARCHIPELAGO_PLUGIN_ICON_DATA_URI,
  ARCHIPELAGO_PLUGIN_NAME,
  ARCHIPELAGO_PLUGIN_PACKAGE_URL,
  ARCHIPELAGO_PLUGIN_VERSION,
} from "./constants";
import { AllArchipelagoEffectTypes } from "./effects";
import { AllArchipelagoFilterEvents } from "./filters";
import { AllArchipelagoFrontendFilters } from "./frontend-listeners";
import { loadSessionsFromStorage } from "./helpers";
import { State } from "./types";
import { ArchipelagoUIExtension } from "./ui-extension";

export let client: APClient;
export let apClient: Client;

export let state: State = {
  sessions: {},
};

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
    frontendListeners: AllArchipelagoFrontendFilters,
    uiExtensions: [ArchipelagoUIExtension],
    variables: AllArchipelagoVariables,
  },
  onLoad: async () => {
    await loadSessionsFromStorage();

    const response = await remoteVersionCheck(
      ARCHIPELAGO_PLUGIN_VERSION,
      ARCHIPELAGO_PLUGIN_PACKAGE_URL,
    );
    if (response && response.isRemoteNewer) {
      firebot.notifications.add(
        {
          title: "New version of Archipelago Client!",
          message: `Oceanity has released a new version of the Archipelago Client script (${response.localVersion} -> ${response.remoteVersion}). Go to https://github.com/Oceanity/firebot-archipelago/releases/latest to download the new version.`,
          type: "update",
        },
        false,
      );
    }
  },
  onUnload: async () => {
    await Promise.all(
      Object.keys(state.sessions).map(
        (id) =>
          new Promise(async (resolve) => {
            resolve(await disconnect(id));
          }),
      ),
    );
  },
};

export async function disconnect(clientId?: string): Promise<boolean> {
  if (!clientId) {
    firebot.logger.warn(
      `Could not disconnect Archipelago Client with id '${clientId}'`,
    );
    return false;
  }

  return true;
}

export default plugin;
