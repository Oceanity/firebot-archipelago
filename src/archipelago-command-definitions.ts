import Fuse from "fuse.js";
import { archipelagoIntegration } from "./archipelago-integration";

type APCommandDefinition = Record<`/${string}`, APCommandOptions>;

type APCommandOptions = {
  args?: Record<string, { optional: boolean }>;
  description: string;
  callback: (slot: string, ...args: Array<string>) => void | Promise<void>;
};

export const APCommandDefinitions: APCommandDefinition = {
  "/help": {
    description: "Returns the help listing.",
    callback: async (slot) => {
      archipelagoIntegration.client.sessions.get(slot)?.messages.push([
        {
          text: Object.entries(APCommandDefinitions)
            .map(
              ([command, definition]) =>
                `${command} ${argsString(definition.args)}\n\t${
                  definition.description
                }`
            )
            .join("\n"),
          html: Object.entries(APCommandDefinitions)
            .map(
              ([command, definition]) =>
                `<p class="command">${command} <span class="arg">${argsString(
                  definition.args
                )}</span></p><p class="ml-6 description">${
                  definition.description
                }</p>`
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
    args: {
      search: {
        optional: true,
      },
    },
    description: "List all item names for the currently running game.",
    callback: async (sessionName, ...search) => {
      const session = archipelagoIntegration.client.sessions.get(sessionName);
      if (!session) {
        return;
      }

      const items = handleSearch(
        session.itemTable.sort(([a], [b]) => a.localeCompare(b)),
        search?.join(" ") ?? undefined
      );

      if (!items.length) {
        const message = `No items found${
          !!search ? ` matching ${search}` : ""
        }`;

        session.messages.push([
          {
            text: message,
            html: message,
            nodes: [],
          },
        ]);

        return;
      }

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
    args: {
      search: {
        optional: true,
      },
    },
    callback: async (sessionName, ...search) => {
      const session = archipelagoIntegration.client.sessions.get(sessionName);
      if (!session) {
        return;
      }

      const locations = handleSearch(
        session.locationTable.sort(([a], [b]) => a.localeCompare(b)),
        search?.join(" ") ?? undefined
      );

      if (!locations.length) {
        const message = `No locations found${
          !!search ? ` matching ${search}` : ""
        }`;

        session.messages.push([
          {
            text: message,
            html: message,
            nodes: [],
          },
        ]);

        return;
      }

      session.messages.push([
        {
          text: locations.map(([name]) => name).join("\n"),
          html: `<ul>${locations
            .map(([name, checked]) =>
              checked
                ? `<li class="location-entry checked">${name}</li>`
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
    callback: async (sessionName) => {
      const session = archipelagoIntegration.client.sessions.get(sessionName);
      if (!session) {
        return;
      }
    },
  },
};

function handleSearch(
  items: Array<[string, boolean]>,
  search?: string
): Array<[string, boolean]> {
  if (!search || !search.trim().length) {
    return items;
  }

  const fuse = new Fuse(
    items.map(([name]) => name),
    { threshold: 0.25 }
  );

  const matches = fuse.search(search);

  return items.filter(([name]) => matches.some((match) => match.item === name));
}

function argsString(args?: APCommandOptions["args"]) {
  if (!args) {
    return "";
  }

  return Object.entries(args)
    .map(
      ([name, definition]) =>
        `[${name}${definition.optional ? " (optional)" : ""}]`
    )
    .join(" ");
}
