import firebot from "@crowbartools/firebot-types";
import {
  Client,
  MessageNode,
  NetworkItem,
  itemClassifications,
} from "archipelago.js";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { FirebotEvents } from "./enums";
import { getHandleFromClient, getHintData } from "./helpers";

export const hookArchipelagoFirebotEvents = async (
  sessionId: string,
  client: Client,
) => {
  client.socket.on("connected", (packet) => {
    firebot.logger.info(JSON.stringify(packet));

    firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.Connected, {
      ...getSessionMetadata(sessionId, client),
      ...getPlayerMetadata(client),
    });
  });

  client.socket.on("disconnected", () => {
    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:session-closed",
      sessionId,
    );

    firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.Disconnected, {
      apSessionId: sessionId,
    });
  });

  client.socket.on("roomUpdate", (packet) => {
    if (packet.hint_cost) {
    }

    // Hint Points Updated
    if (!!packet.hint_points) {
      firebot.frontendCommunicator.fireEventAsync(
        "oceanity:archipelago:hints-updated",
        {
          sessionId,
          ...getHintData(client.room),
        },
      );

      firebot.events.trigger(
        ARCHIPELAGO_PLUGIN_ID,
        FirebotEvents.HintsUpdated,
        {
          ...getSessionMetadata(sessionId, client),
          ...getPlayerMetadata(client),
        },
      );
    }

    // Locations Updated
    if (!!packet.checked_locations) {
      firebot.frontendCommunicator.fireEventAsync(
        "archipelago:locations-checked",
        {
          locations: packet.checked_locations,
        },
      );
    }
  });

  client.socket.on("receivedItems", (packet) => {
    packet.items.forEach((item) => {
      firebot.events.trigger(
        ARCHIPELAGO_PLUGIN_ID,
        FirebotEvents.ReceivedItems,
        {
          ...getSessionMetadata(sessionId, client),
          ...getItemMetadata(client, item),
          ...getPlayerMetadata(client, item.player, "apSender"),
          ...getPlayerMetadata(client, undefined, "apReceiver"),
        },
      );
    });
  });

  client.deathLink.on("deathReceived", (source, time, cause) => {
    firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.DeathLink, {
      ...getSessionMetadata(sessionId, client),
      ...getPlayerMetadata(client),
      ...getDeathLinkMetadata({ source, time, cause }),
    });
  });

  client.messages.on(
    "countdown",
    (text: string, value: number, _nodes: MessageNode[]) => {
      if (text.startsWith("[Server]: Starting")) {
        return;
      }

      firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.Countdown, {
        ...getSessionMetadata(sessionId, client),
        ...getPlayerMetadata(client),
        apCountdown: `${value}`,
      });
    },
  );
  // this.#session.on("receivedNewItems", (packet) => {
  //   // If first item handshake, divert to Initial Items event to not spam Received Items events
  //   const event = packet.isInitialInventory
  //     ? FirebotEvents.InitialItems
  //     : FirebotEvents.ReceivedItems;

  //   packet.items.forEach((item) => {
  //     firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, event, {
  //       ...this.#getSessionMetadata(),
  //       ...this.#getItemMetadata(undefined, item),
  //       ...this.#getPlayerMetadata("apSender", item.player),
  //       ...this.#getPlayerMetadata("apReceiver"),
  //     });
  //   });
  // });
};

function getSessionMetadata(
  sessionId: string,
  client: Client,
  prefix: string = "apSession",
): Record<string, string> {
  const { room } = client;

  const handle = getHandleFromClient(client);
  const url = new URL(client.socket.url);

  return {
    [`${prefix}Id`]: sessionId,
    [`${prefix}Name`]: handle,
    [`${prefix}Hostname`]: url.hostname,
    [`${prefix}Port`]: url.port,
    [`${prefix}Url`]: `${url}`,
    [`${prefix}LocationCount`]: `${room.allLocations.length}`,
    [`${prefix}HintPoints`]: `${room.hintPoints}`,
    [`${prefix}HintPointProgress`]: `${room.hintPoints % room.hintCost}`,
    [`${prefix}HintCost`]: `${room.hintCost}`,
    [`${prefix}HintCostPercent`]: `${room.hintCostPercentage}`,
    [`${prefix}Hints`]: `${Math.floor(room.hintPoints / room.hintCost)}`,
  };
}

function getPlayerMetadata(
  client: Client,
  player?: number,
  prefix: string = "apPlayer",
): Record<string, string> {
  const playerData =
    player !== undefined
      ? client.players.findPlayer(player)
      : client.players.self;

  if (!playerData) {
    firebot.logger.error(`Could not retrieve player from slot '${player}'`);
    return {};
  }

  return {
    [`${prefix}Slot`]: `${playerData.slot}`,
    [`${prefix}Team`]: `${playerData.team}`,
    [`${prefix}Name`]: playerData.name,
    [`${prefix}Alias`]: playerData.alias,
    [`${prefix}Game`]: playerData.game,
    [`${prefix}Type`]: `${playerData.type}`,
  };
}

function getItemMetadata(
  client: Client,
  itemData: NetworkItem,
  game?: string,
  prefix: string = "apItem",
) {
  if (!game) {
    game = client.players.self.game;
  }

  const foundInGame =
    itemData.location > 0
      ? client.players.findPlayer(itemData.player)?.game
      : "Archipelago";

  if (!foundInGame) {
    firebot.logger.error(
      `Could not find player with slot '${itemData.player}'`,
    );
    return {};
  }

  const classification =
    Object.keys(itemClassifications).find(
      (key) =>
        !!itemData.flags &&
        itemClassifications[key as keyof typeof itemClassifications] ===
          itemData.flags,
    ) ?? "filler";

  return {
    [`${prefix}Id`]: itemData.item,
    [`${prefix}Name`]: client.package.lookupItemName(game, itemData.item, true),
    [`${prefix}Location`]: client.package.lookupLocationName(
      game,
      itemData.location,
      true,
    ),
    [`${prefix}Classification`]: classification,
  };
}

function getDeathLinkMetadata(
  data: { source: string; cause?: string; time: number },
  prefix: string = "apDeathLink",
): Record<string, string> {
  return {
    [`${prefix}Source`]: data.source,
    [`${prefix}Cause`]: data.cause ?? `${data.source} died.`,
    [`${prefix}Time`]: `${data.time}`,
  };
}

// import {
//   eventManager,
//   frontendCommunicator,
// } from "@oceanity/firebot-helpers/firebot";
// import { ARCHIPELAGO_PLUGIN_ID } from "../../constants";
// import { FirebotEvents, ItemClassification } from "../../enums";
// import { DeathLinkData, NetworkItem } from "../../types";
// import { APSession } from "../session";

// export class FirebotRemoteService {

//     this.#session.messages
//       .on("message", (data) => {
//         // Send to Frontend UI Extension
//         frontendCommunicator.fireEventAsync("archipelago:gotLogMessage", data);

//         // If message is hidden, we'll skip the Event
//         if (data.isHidden) {
//           return;
//         }

//         // Send to Firebot Events
//         firebot.events.trigger(
//           ARCHIPELAGO_PLUGIN_ID,
//           FirebotEvents.Message,
//           {
//             ...this.#getSessionMetadata(),
//             ...this.#getMessageMetadata(undefined, data.message),
//           },
//         );
//       })

//     //#endregion
//   }

//   //#region Message Helpers

//   #getMessageMetadata = (
//     prefix: string = "apMessage",
//     message: { html: string; text: string },
//   ): Record<string, string> => ({
//     [`${prefix}Html`]: message.html,
//     [`${prefix}Text`]: message.text,
//   });

//   //#endregion
// }
