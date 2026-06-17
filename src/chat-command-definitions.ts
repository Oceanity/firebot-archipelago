import { ClientStatus } from "./enums";
import { argsString } from "./helpers";
import { archipelago } from "./main";
import { ChatCommandDefinition } from "./types";

export const AllChatCommandDefinitions: ChatCommandDefinition = {
  "/help": {
    description: "Returns the help listing.",
    callback: async (session) => {
      session.messages.push({
        text: Object.entries(AllChatCommandDefinitions)
          .map(
            ([command, definition]) =>
              `${command} ${argsString(definition.args)}\n\t${
                definition.description
              }`,
          )
          .join("\n"),
        html: Object.entries(AllChatCommandDefinitions)
          .map(
            ([command, definition]) =>
              `<p class="command">${command} <span class="arg">${argsString(
                definition.args,
              )}</span></p><p class="ml-6 description">${
                definition.description
              }</p>`,
          )
          .join(""),
      });
    },
  },

  "/disconnect": {
    description: "Disconnect from a MultiWorld Server.",
    callback: (session) => {
      archipelago.closeSession(session.id, true);
    },
  },

  "/clear": {
    description: "Clears the chat and message log for the active session.",
    callback: (session) => session.messages.clearChat(),
  },

  "/ready": {
    description: "Send ready status to server.",
    callback: (session) => {
      session.client.updateStatus(ClientStatus.Ready);
    },
  },

  // "/items": {
  //   args: {
  //     search: {
  //       optional: true,
  //     },
  //   },
  //   description: "List all item names for the currently running game.",
  //   callback: async (sessionId, ...search) => {
  //     const itemTable = archipelago.getItemTable(sessionId);

  //     if (!Object.keys(itemTable).length) {
  //       // TODO: No items message
  //     }

  //     const items = searchTuples(
  //       session.client.game.sort(([a], [b]) => a.localeCompare(b)),
  //       search?.join(" ") ?? undefined,
  //     );

  //     if (!items.length) {
  //       session.messages.sendLog(
  //         `No items found${!!search ? ` matching ${search}` : ""}`,
  //         "warning",
  //       );

  //       return;
  //     }

  //     session.messages.push({
  //       text: items.map(([name]) => name).join("\n"),
  //       html: `<ul>${items
  //         .map(([name, count]) =>
  //           count > 0
  //             ? `<li class="item-entry received">${name}${
  //                 count > 1 ? ` (x${count})` : ""
  //               } ✓</li>`
  //             : `<li class="item-entry missing">${name}</li>`,
  //         )
  //         .join("")}</ul>`,
  //       nodes: [],
  //     });
  //   },
  // },

  // "/locations": {
  //   description: "List all location names for the currently running game.",
  //   args: {
  //     search: {
  //       optional: true,
  //     },
  //   },
  //   callback: async (sessionId, ...search) => {
  //     const session = client.sessions.get(sessionId);
  //     if (!session) {
  //       return;
  //     }

  //     const locations = searchTuples(
  //       session.locationTable.sort(([a], [b]) => a.localeCompare(b)),
  //       search?.join(" ") ?? undefined,
  //     );

  //     if (!locations.length) {
  //       session.messages.sendLog(
  //         `No locations found${!!search ? ` matching ${search}` : ""}`,
  //         "warning",
  //       );

  //       return;
  //     }

  //     session.messages.push({
  //       text: locations.map(([name]) => name).join("\n"),
  //       html: `<ul>${locations
  //         .map(
  //           ([name, checked]) =>
  //             `<li class="location-entry ${
  //               checked ? "" : "un"
  //             }checked">${name}</li>`,
  //         )
  //         .join("")}</ul>`,
  //       nodes: [],
  //     });
  //   },
  // },

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
