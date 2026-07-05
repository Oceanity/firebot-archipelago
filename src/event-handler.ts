import firebot from "@crowbartools/firebot-types";
import {
  Client,
  ConnectedPacket,
  MessageNode,
  SocketEvents,
} from "archipelago.js";
import {
  ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE,
  ARCHIPELAGO_PLUGIN_ID,
} from "./constants";
import {
  getDeathLinkMetadata,
  getHintData,
  getItemMetadata,
  getPlayerMetadata,
  getSessionMetadata,
} from "./helpers";
import { archipelago } from "./main";
import { FirebotEvents } from "./types";

type SocketEventDefinition = {
  [K in keyof SocketEvents]: {
    event: K;
    handler: (...args: SocketEvents[K]) => void;
  };
}[keyof SocketEvents];

const getSocketEventDefinitions = (
  sessionId: string,
  client: Client,
): Array<SocketEventDefinition> => [
  {
    event: "connected",
    handler: (packet: ConnectedPacket) => {
      firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.Connected, {
        [ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE]: packet,
        ...getSessionMetadata(sessionId, client),
        ...getPlayerMetadata(client),
      });
    },
  },
  {
    event: "disconnected",
    handler: () => {
      firebot.events.trigger(
        ARCHIPELAGO_PLUGIN_ID,
        FirebotEvents.Disconnected,
        {
          [ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE]: {},
        },
      );
    },
  },
  {
    event: "roomUpdate",
    handler: (packet) => {
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
            [ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE]: packet,
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

      if (!!packet.players) {
        packet.players.forEach((_player) => {
          // this.emit("oceanity:archipelago:alias-updated", [
          //   new Player(this.#session, player),
          //   oldAlias,
          //   player.alias,
          // ]);
        });
      }
    },
  },
  {
    event: "receivedItems",
    handler: (packet) => {
      const event = !archipelago.findSession(sessionId)?.isReady
        ? FirebotEvents.InitialItems
        : FirebotEvents.ReceivedItems;

      packet.items.forEach((item) => {
        firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, event, {
          [ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE]: item,
          ...getSessionMetadata(sessionId, client),
          ...getItemMetadata(client, item),
          ...getPlayerMetadata(client, item.player, "apSender"),
          ...getPlayerMetadata(client, undefined, "apReceiver"),
        });
      });
    },
  },
];

export const hookArchipelagoEvents = async (
  sessionId: string,
  client: Client,
) => {
  for (const socketEvent of getSocketEventDefinitions(sessionId, client)) {
    firebot.logger.debug(
      `Attaching listeners for socket '${socketEvent.event}' event`,
    );
    client.socket.on(
      socketEvent.event,
      socketEvent.handler as (...args: Array<any>) => void,
    );
  }

  client.deathLink.on("deathReceived", (source, time, cause) => {
    firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.DeathLink, {
      [ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE]: { source, time, cause },
      ...getSessionMetadata(sessionId, client),
      ...getPlayerMetadata(client),
      ...getDeathLinkMetadata({ source, time, cause }),
    });
  });

  client.messages.on(
    "countdown",
    (text: string, value: number, nodes: Array<MessageNode>) => {
      if (text.startsWith("[Server]: Starting")) {
        return;
      }

      firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.Countdown, {
        [ARCHIPELAGO_PLUGIN_EVENT_DATA_VARIABLE]: { text, value, nodes },
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

export const unhookArchipelagoEvents = async (
  sessionId: string,
  client: Client,
) => {
  for (const socketEvent of getSocketEventDefinitions(sessionId, client)) {
    firebot.logger.debug(
      `Unhooking listeners for socket '${socketEvent.event}' event`,
    );
    client.socket.off(
      socketEvent.event,
      socketEvent.handler as (...args: any[]) => void,
    );
  }
};
