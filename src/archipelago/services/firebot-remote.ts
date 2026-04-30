import {
  eventManager,
  frontendCommunicator,
} from "@oceanity/firebot-helpers/firebot";
import { apLogger } from "../../archipelago-logger";
import { ARCHIPELAGO_CLIENT_ID } from "../../constants";
import { FirebotEvents } from "../../enums";
import { DeathLinkData, NetworkItem } from "../../types";
import { itemClassificationString } from "../helpers";
import { APSession } from "../session";

export class FirebotRemoteService {
  readonly #session: APSession;

  #lastCountdown: number = 0;

  constructor(session: APSession) {
    this.#session = session;

    //#region Session Events

    this.#session.on("connected", () => {
      eventManager.triggerEvent(
        ARCHIPELAGO_CLIENT_ID,
        FirebotEvents.Connected,
        {
          ...this.#getSessionMetadata(),
          ...this.#getPlayerMetadata(),
        },
      );
    });

    this.#session.socket.on("disconnected", () => {
      eventManager.triggerEvent(
        ARCHIPELAGO_CLIENT_ID,
        FirebotEvents.Disconnected,
        {
          ...this.#getSessionMetadata(),
          ...this.#getPlayerMetadata(),
        },
      );
    });

    this.#session.on("closed", () => {
      frontendCommunicator.fireEventAsync(
        "archipelago:sessionClosed",
        this.#session.id,
      );
    });

    this.#session.on("hintsUpdated", (data) => {
      frontendCommunicator.fireEventAsync("archipelago:hintsUpdated", {
        sessionId: this.#session.id,
        ...data,
      });

      eventManager.triggerEvent(
        ARCHIPELAGO_CLIENT_ID,
        FirebotEvents.HintsUpdated,
        {
          ...this.#getSessionMetadata(),
          ...this.#getPlayerMetadata(),
        },
      );
    });

    //#endregion

    //#region Socket Events

    this.#session.on("receivedNewItems", (packet) => {
      // If first item handshake, divert to Initial Items event to not spam Received Items events
      const event = packet.isInitialInventory
        ? FirebotEvents.InitialItems
        : FirebotEvents.ReceivedItems;

      packet.items.forEach((item) => {
        eventManager.triggerEvent(ARCHIPELAGO_CLIENT_ID, event, {
          ...this.#getSessionMetadata(),
          ...this.#getItemMetadata(undefined, item),
          ...this.#getPlayerMetadata("apSender", item.player),
          ...this.#getPlayerMetadata("apReceiver"),
        });
      });
    });

    this.#session.socket.on("roomUpdate", (packet) => {
      const { checked_locations: locations, hint_points: hintPoints } = packet;

      // Checked Locations Updated
      if (!!locations) {
        frontendCommunicator.fireEventAsync("archipelago:locationsChecked", {
          locations,
        });
      }

      // Hint Points Updated
      if (!!packet.hint_points) {
        frontendCommunicator.fireEventAsync("archipelago:hintPointsUpdated", {
          hintPoints,
          hints: this.#session.hints,
        });
      }
    });

    this.#session.socket.on("deathLink", (data) => {
      eventManager.triggerEvent(
        ARCHIPELAGO_CLIENT_ID,
        FirebotEvents.DeathLink,
        {
          ...this.#getSessionMetadata(),
          ...this.#getPlayerMetadata(),
          ...this.#getDeathLinkMetadata("apDeathLink", data),
        },
      );
    });

    //#endregion

    //#region Message Events

    this.#session.messages
      .on("countdown", (data) => {
        // If user uses !countdown, it seems to duplicate the first number event, so let's make sure there's no repeats
        if (data.countdown === this.#lastCountdown) {
          return;
        }

        this.#lastCountdown = data.countdown;

        eventManager.triggerEvent(
          ARCHIPELAGO_CLIENT_ID,
          FirebotEvents.Countdown,
          {
            ...this.#getSessionMetadata(),
            ...this.#getPlayerMetadata(),
            apCountdown: data.countdown,
          },
        );
      })
      .on("message", (data) => {
        // Send to Frontend UI Extension
        frontendCommunicator.fireEventAsync("archipelago:gotLogMessage", data);

        // If message is hidden, we'll skip the Event
        if (data.isHidden) {
          return;
        }

        // Send to Firebot Events
        eventManager.triggerEvent(
          ARCHIPELAGO_CLIENT_ID,
          FirebotEvents.Message,
          {
            ...this.#getSessionMetadata(),
            ...this.#getMessageMetadata(undefined, data.message),
          },
        );
      })
      .on("chatCleared", () => {
        frontendCommunicator.fireEventAsync("archipelago:chatCleared", {
          sessionId: this.#session.id,
        });
      });

    //#endregion
  }

  //#region Message Helpers

  #getItemMetadata = (
    prefix: string = "apItem",
    itemData: NetworkItem,
    game?: string,
  ) => {
    if (!game) {
      game = this.#session.players.self.game;
    }

    let foundInGame =
      itemData.location > 0
        ? this.#session.players.getPlayer(itemData.player)?.game
        : "Archipelago";
    if (!foundInGame) {
      apLogger.warn(
        `Could not fetch Game data for Player '${itemData.player ?? "Archipelago"}'`,
      );
      foundInGame = "Unknown";
    }

    const locationName = this.#session.getLocationName(
      foundInGame,
      itemData.location,
    );

    return {
      [`${prefix}Id`]: itemData.item,
      [`${prefix}Name`]: this.#session.getItemName(game, itemData.item),
      [`${prefix}Location`]: locationName,
      [`${prefix}Classification`]: itemClassificationString(itemData.flags),
    };
  };

  #getMessageMetadata = (
    prefix: string = "apMessage",
    message: { html: string; text: string },
  ): Record<string, string> => ({
    [`${prefix}Html`]: message.html,
    [`${prefix}Text`]: message.text,
  });

  #getPlayerMetadata = (
    prefix: string = "apPlayer",
    player?: number,
  ): Record<string, string> => {
    const playerData = !!player
      ? this.#session.players.getPlayer(player)
      : this.#session.players.self;

    if (!playerData) {
      apLogger.error(
        `Could not fetch Player Data for ${player ? `Player ${player}` : "Active Player"}`,
      );
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
  };

  #getSessionMetadata = (
    prefix: string = "apSession",
  ): Record<string, string> => ({
    [`${prefix}Name`]: `${this.#session}`,
    [`${prefix}IsStarting`]: `${this.#session.ready}`,
    [`${prefix}Hostname`]: this.#session.socket.url.hostname,
    [`${prefix}Port`]: `${this.#session.socket.url.port}`,
    [`${prefix}Url`]: `${this.#session.socket.url}`,
    [`${prefix}LocationCount`]: `${this.#session.totalLocations}`,
    [`${prefix}HintPoints`]: `${this.#session.hintPoints}`,
    [`${prefix}HintPointProgress`]: `${this.#session.hintPointProgress}`,
    [`${prefix}HintCost`]: `${this.#session.hintCost}`,
    [`${prefix}HintCostPercent`]: `${this.#session.hintCostPercent}`,
    [`${prefix}Hints`]: `${this.#session.hints}`,
  });

  #getDeathLinkMetadata = (
    prefix: string = "apDeathLink",
    data: DeathLinkData,
  ): Record<string, string> => ({
    [`${prefix}Source`]: data.source,
    [`${prefix}Cause`]: data.cause,
    [`${prefix}Time`]: `${data.time}`,
  });

  //#endregion
}
