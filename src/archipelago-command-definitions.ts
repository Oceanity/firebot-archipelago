import { archipelagoIntegration } from "./archipelago-integration";

type APCommandDefinition = Record<
  `/${string}`,
  {
    description: string;
    callback: (slot: string, ...args: Array<string>) => void | Promise<void>;
  }
>;

export const APCommandDefinitions: APCommandDefinition = {
  "/help": {
    description: "Returns the help listing.",
    callback: async (slot) => {
      archipelagoIntegration.client.sessions.get(slot)?.messages.push([
        {
          text: Object.entries(APCommandDefinitions)
            .map(
              ([command, definition]) =>
                `${command}\n\t${definition.description}`
            )
            .join("\n"),
          html: Object.entries(APCommandDefinitions)
            .map(
              ([command, definition]) =>
                `<p class="command">${command}</p><p class="ml-6 description">${definition.description}</p>`
            )
            .join(""),
          nodes: [],
        },
      ]);
    },
  },
  "/disconnect": {
    description: "Disconnect from a MultiWorld Server.",
    callback: async (slot) => {},
  },
  "/items": {
    description: "List all item names for the currently running game.",
    callback: async (slot) => {
      const session = archipelagoIntegration.client.sessions.get(slot);
      if (!session) {
        return;
      }

      const items = session.itemTable.sort(([a], [b]) => a.localeCompare(b));

      session.messages.push([
        {
          text: items.map(([name]) => name).join("\n"),
          html: `<ul>${items
            .map(([name, received]) =>
              received
                ? `<li class="item-entry received">${name} ✓</li>`
                : `<li class="item-entry missing">${name}</li>`
            )
            .join("")}</ul>`,
          nodes: [],
        },
      ]);
    },
  },
  "/locations": {
    description: "List all location names for the currently running game.",
    callback: async (slot) => {
      const session = archipelagoIntegration.client.sessions.get(slot);
      if (!session) {
        return;
      }

      const locations = session.locationTable.sort(([a], [b]) =>
        a.localeCompare(b)
      );

      session.messages.push([
        {
          text: locations.map(([name]) => name).join("\n"),
          html: `<ul>${locations
            .map(([name, checked]) =>
              checked
                ? `<li class="location-entry checked"><s><i>${name}</i></s></li>`
                : `<li class="location-entry unchecked">${name}</li>`
            )
            .join("")}</ul>`,
          nodes: [],
        },
      ]);
    },
  },
  "/ready": {
    description: "Send ready status to server.",
    callback: async (slot) => {
      const session = archipelagoIntegration.client.sessions.get(slot);
      if (!session) {
        return;
      }
    },
  },
};
