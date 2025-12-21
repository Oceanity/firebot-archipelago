import { EventSource } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";
import * as packageJson from "../package.json";
import { FirebotEvents } from "./enums";

export const {
  displayName: ARCHIPELAGO_CLIENT_NAME,
  description: ARCHIPELAGO_CLIENT_DESCRIPTION,
  author: ARCHIPELAGO_CLIENT_AUTHOR,
  version: ARCHIPELAGO_CLIENT_VERSION,
} = packageJson;

export const ARCHIPELAGO_CLIENT_NAME_AND_AUTHOR = `${ARCHIPELAGO_CLIENT_NAME} (by ${ARCHIPELAGO_CLIENT_AUTHOR})`;
export const ARCHIPELAGO_CLIENT_ID = "oceanity:archipelago";
export const ARCHIPELAGO_CLIENT_FIREBOT_VERSION = "5";
export const ARCHIPELAGO_CLIENT_PACKAGE_URL =
  "https://raw.githubusercontent.com/Oceanity/firebot-archipelago/refs/heads/main/package.json";

// Message Service
export const ARCHIPELAGO_CLIENT_MAX_MESSAGES = 100;
export const ARCHIPELAGO_CLIENT_MAX_CHAT_HISTORY = 25;

// Socket Service
export const ARCHIPELAGO_DEFAULT_RECONNECT_SECONDS = 5;

export const ARCHIPELAGO_EVENT_SOURCE: EventSource = {
  id: ARCHIPELAGO_CLIENT_ID,
  name: "Archipelago",
  events: [
    {
      id: FirebotEvents.Connected,
      name: "Connected",
      description:
        "When the client connects to any Archipelago MultiWorld server.",
    },
    {
      id: FirebotEvents.Countdown,
      name: "Countdown",
      description: "When the server's countdown updates.",
    },
    {
      id: FirebotEvents.DeathLink,
      name: "DeathLink Triggered",
      description:
        "When another player in any Archipelago MultiWorld server triggers a DeathLink event (cannot detect when player dies).",
    },
    {
      id: FirebotEvents.Disconnected,
      name: "Disconnected",
      description:
        "When the client disconnects from any Archipelago MultiWorld server.",
    },
    {
      id: FirebotEvents.HintsUpdated,
      name: "Hints Updated",
      description:
        "When the number of available hints changes for an Archipelago MultiWorld session.",
    },
    {
      id: FirebotEvents.Message,
      name: "Message",
      description: "When a message is received from the server.",
    },
    {
      id: FirebotEvents.ReceivedItems,
      name: "Received Items",
      description:
        "When the current player of a connected MultiWorld server receives an item.",
    },
  ],
};
