import { IntegrationDefinition } from "@crowbartools/firebot-custom-scripts-types";
import {
  ARCHIPELAGO_INTEGRATION_DESCRIPTION,
  ARCHIPELAGO_INTEGRATION_ID,
  ARCHIPELAGO_INTEGRATION_NAME,
} from "./constants";
import { ArchipelagoIntegrationSettings } from "./types";

export const ArchipelagoIntegrationDefinition: IntegrationDefinition<ArchipelagoIntegrationSettings> =
  {
    id: ARCHIPELAGO_INTEGRATION_ID,
    name: ARCHIPELAGO_INTEGRATION_NAME,
    description: ARCHIPELAGO_INTEGRATION_DESCRIPTION,
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
