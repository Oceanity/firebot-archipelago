import Fuse from "fuse.js";
import { ClientCommand, ClientStatus } from "./enums";
import { client } from "./main";

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
      client.sessions.get(slot)?.messages.push({
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
      });
    },
  },

  "/disconnect": {
    description: "Disconnect from a MultiWorld Server.",
    callback: (sessionName) => client.sessions.get(sessionName)?.disconnect(),
  },

  "/clear": {
    description: "Clears the chat and message log for the active session.",
    callback: (sessionName) =>
      client.sessions.get(sessionName)?.messages.clearChat(),
  },

  "/ready": {
    description: "Send ready status to server.",
    callback: (sessionName) => {
      client.sessions.get(sessionName)?.socket.send({
        cmd: ClientCommand.StatusUpdate,
        status: ClientStatus.Ready,
      });
    },
  },

  "/items": {
    args: {
      search: {
        optional: true,
      },
    },
    description: "List all item names for the currently running game.",
    callback: async (sessionName, ...search) => {
      const session = client.sessions.get(sessionName);
      if (!session) {
        return;
      }

      const items = handleSearch(
        session.itemTable.sort(([a], [b]) => a.localeCompare(b)),
        search?.join(" ") ?? undefined
      );

      if (!items.length) {
        session.messages.push(
          `No items found${!!search ? ` matching ${search}` : ""}`
        );

        return;
      }

      session.messages.push({
        text: items.map(([name]) => name).join("\n"),
        html: `<ul>${items
          .map(([name, count]) =>
            count > 0
              ? `<li class="item-entry received">${name}${
                  count > 1 ? ` (x${count})` : ""
                } ✓</li>`
              : `<li class="item-entry missing">${name}</li>`
          )
          .join("")}</ul>`,
        nodes: [],
      });
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
      const session = client.sessions.get(sessionName);
      if (!session) {
        return;
      }

      const locations = handleSearch(
        session.locationTable.sort(([a], [b]) => a.localeCompare(b)),
        search?.join(" ") ?? undefined
      );

      if (!locations.length) {
        session.messages.push(
          `No locations found${!!search ? ` matching ${search}` : ""}`
        );

        return;
      }

      session.messages.push({
        text: locations.map(([name]) => name).join("\n"),
        html: `<ul>${locations
          .map(
            ([name, checked]) =>
              `<li class="location-entry ${
                checked ? "" : "un"
              }checked">${name}</li>`
          )
          .join("")}</ul>`,
        nodes: [],
      });
    },
  },

  // "/players": {
  //   description:
  //     "Get a list of all players connected to session and what game they are playing",
  //   callback: async (sessionName) => {
  //     const session = client.sessions.get(sessionName);
  //     if (!session) {
  //       return;
  //     }

  //     const teams = session.players.teams;

  //     session.messages.push({
  //       text: teams
  //         .map(
  //           (players, teamIndex) =>
  //             `Team ${teamIndex + 1}\n${players
  //               .map((player) => `> ${player.alias} - ${player.game}`)
  //               .join("\n")}`
  //         )
  //         .join("\n"),
  //       html: teams
  //         .map(
  //           (players, teamIndex) =>
  //             `<ul class="team team-${teamIndex + 1}">
  //         ${players
  //           .map((player, playerIndex) => {
  //             `<li class="player player-${teamIndex}-${playerIndex}">${player.alias} - ${player.game}</li>`;
  //           })
  //           .join("")}
  //         </ul>`
  //         )
  //         .join(""),
  //       nodes: [],
  //     });
  //   },
  // },
};

function handleSearch<T>(
  items: Array<[string, T]>,
  search?: string
): Array<[string, T]> {
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
