import { clientStatuses } from "archipelago.js";
import { argsString } from "./helpers";
import { archipelago } from "./main";
import { ChatCommandDefinition } from "./types";

export const AllChatCommandDefinitions: ChatCommandDefinition = {
  "/help": {
    description: "Returns the help listing.",
    callback: async (session) => {
      session.messages.pushMessage({
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

  "/id": {
    description: "Returns the Id of the Archipelago Session in Firebot",
    callback: (session) => {
      session.messages.sendLog(session.id, "info");
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
    callback: async (session) => {
      const currentStatus = await session.client.players.self.fetchStatus();

      if (currentStatus === clientStatuses.ready) {
        session.messages.sendLog("You are already marked as ready", "info");
        return;
      }

      session.client.updateStatus(clientStatuses.ready);

      const newStatus = await session.client.players.self.fetchStatus();
      if (newStatus !== clientStatuses.ready) {
        session.messages.sendLog(
          "Unable to update status on player",
          "warning",
        );
        return;
      }

      session.messages.sendLog("You are now marked as ready!", "info");
    },
  },

  "/items": {
    args: {
      search: {
        optional: true,
      },
    },
    description: "List item names for the currently running game.",
    callback: async (session, ...search) => {
      const items = session.getItemsAndFoundCount(search?.join(" "));

      if (!items.length) {
        session.messages.sendLog(
          `No items found${!!search ? ` matching ${search}` : ""}`,
          "warning",
        );

        return;
      }

      session.messages.pushMessage({
        text: items
          .map(([name, count]) =>
            count > 0 ? `${name}${count > 1 ? ` (x${count})` : ""} ✓` : name,
          )
          .join("\n"),
        html: `<ul>${items
          .map(([name, count]) =>
            count > 0
              ? `<li class="item-entry received">${name}${
                  count > 1 ? ` (x${count})` : ""
                } ✓</li>`
              : `<li class="item-entry missing">${name}</li>`,
          )
          .join("")}</ul>`,
        nodes: [],
      });
    },
  },

  "/locations": {
    description: "List location names for the currently running game.",
    args: {
      search: {
        optional: true,
      },
    },
    callback: async (session, ...search) => {
      const locations = session.getLocationsAndCheckedStatus(search?.join(" "));

      if (!locations.length) {
        session.messages.sendLog(
          `No locations found${!!search ? ` matching ${search}` : ""}`,
          "warning",
        );

        return;
      }

      session.messages.pushMessage({
        text: locations
          .map(([name, checked]) => `${name}${checked ? " ✓" : ""}`)
          .join("\n"),
        html: `<ul>${locations
          .map(
            ([name, checked]) =>
              `<li class="location-entry ${
                checked ? "" : "un"
              }checked">${name}</li>`,
          )
          .join("")}</ul>`,
        nodes: [],
      });
    },
  },

  // For some reason no players are getting fetched on this, unsure why
  "/players": {
    description:
      "Get a list of all players connected to session and what game they are playing",
    callback: async (session) => {
      const teams = await session.getPlayers();

      if (!teams.length) {
        session.messages.sendLog(
          `No players found for current session`,
          "warning",
        );

        return;
      }

      session.messages.pushMessage({
        text: teams
          .map(
            (players, teamIndex) =>
              `Team ${teamIndex + 1}\n${players
                .map((player) => `> ${player.alias} - ${player.game}`)
                .join("\n")}`,
          )
          .join("\n"),
        html: teams
          .map(
            (players, teamIndex) =>
              `<p>Team #${teamIndex + 1}</p><ul class="team team-${teamIndex + 1}">
                ${players
                  .map(
                    (player, playerIndex) =>
                      `<li class="player-${teamIndex}-${playerIndex}"><span class="player${player.isSessionPlayer ? " self" : ""}">${player.alias}</span> - <span class="green">${player.game}</span></li>`,
                  )
                  .join("")}
                </ul>`,
          )
          .join(""),
        nodes: [],
      });
    },
  },
};
