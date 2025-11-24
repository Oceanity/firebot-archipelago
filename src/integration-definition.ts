import { IntegrationDefinition } from "@crowbartools/firebot-custom-scripts-types";
import {
  ARCHIPELAGO_CLIENT_DESCRIPTION,
  ARCHIPELAGO_CLIENT_ID,
  ARCHIPELAGO_CLIENT_NAME,
} from "./constants";
import { ArchipelagoIntegrationSettings } from "./types";

export const ArchipelagoIntegrationDefinition: IntegrationDefinition<ArchipelagoIntegrationSettings> =
  {
    id: ARCHIPELAGO_CLIENT_ID,
    name: ARCHIPELAGO_CLIENT_NAME,
    description: ARCHIPELAGO_CLIENT_DESCRIPTION,
    linkType: "none",
    configurable: true,
    connectionToggle: true,
    settingCategories: {
      connection: {
        title: "Connection",
        settings: {
          hostname: {
            type: "string",
            default: "",
            title: "Host",
            description: "The host of the Archipelago server",
            validation: {
              required: true,
            },
          },
          slot: {
            type: "string",
            default: "",
            title: "Player Name",
            description: "The name of the Archipelago client",
            validation: {
              required: true,
            },
          },
          password: {
            type: "string",
            default: "",
            title: "Password",
            description: "The password for the Archipelago server (optional)",
          },
        },
      },
    },
  };
