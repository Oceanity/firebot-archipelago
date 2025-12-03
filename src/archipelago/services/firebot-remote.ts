import {
  eventManager,
  frontendCommunicator,
} from "@oceanity/firebot-helpers/firebot";
import { ARCHIPELAGO_CLIENT_ID } from "../../constants";
import { FirebotEvents, ItemClassification } from "../../enums";
import { DeathLinkData, NetworkItem } from "../../types";
import { APSession } from "../session";

export class FirebotRemoteService {
  readonly #session: APSession;

  #lastCountdown: number;

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
        }
      );
    });

    this.#session.on("disconnected", () => {
      frontendCommunicator.fireEventAsync(
        "archipelago:disconnected",
        this.#session.id
      );

      eventManager.triggerEvent(
        ARCHIPELAGO_CLIENT_ID,
        FirebotEvents.Disconnected,
        {
          ...this.#getSessionMetadata(),
          ...this.#getPlayerMetadata(),
        }
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
        }
      );
    });

    //#endregion

    //#region Socket Events

    this.#session.socket.on("receivedItems", (packet) => {
      packet.items.forEach((item) => {
        eventManager.triggerEvent(
          ARCHIPELAGO_CLIENT_ID,
          FirebotEvents.ReceivedItems,
          {
            ...this.#getSessionMetadata(),
            ...this.#getItemMetadata(undefined, item),
            ...this.#getPlayerMetadata("apSender", item.player),
            ...this.#getPlayerMetadata("apReceiver"),
          }
        );
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
        }
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
          }
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
          }
        );
      })
      .on("chatCleared", () => {
        frontendCommunicator.fireEventAsync("archipelago:chatCleared", {
          sessionName: this.#session.name,
        });
      });

    //#endregion
  }

  //#region Message Helpers

  #getItemMetadata = (
    prefix: string = "apItem",
    itemData: NetworkItem,
    game?: string
  ) => {
    if (!game) {
      game = this.#session.players.self.game;
    }

    const foundInGame =
      itemData.location > 0
        ? this.#session.players.getPlayer(itemData.player).game
        : "Archipelago";

    const locationName = this.#session.getLocationName(
      foundInGame,
      itemData.location,
      true
    );

    let classification = "filler";
    if (
      (itemData.flags & ItemClassification.Progression) ===
      ItemClassification.Progression
    ) {
      classification = "progression";
    } else if (
      (itemData.flags & ItemClassification.Useful) ===
      ItemClassification.Useful
    ) {
      classification = "useful";
    } else if (
      (itemData.flags & ItemClassification.Trap) ===
      ItemClassification.Trap
    ) {
      classification = "trap";
    }

    return {
      [`${prefix}Id`]: itemData.item,
      [`${prefix}Name`]: this.#session.getItemName(game, itemData.item, true),
      [`${prefix}Location`]: locationName,
      [`${prefix}Classification`]: classification,
    };
  };

  #getMessageMetadata = (
    prefix: string = "apMessage",
    message: { html: string; text: string }
  ): Record<string, string> => ({
    [`${prefix}Html`]: message.html,
    [`${prefix}Text`]: message.text,
  });

  #getPlayerMetadata = (
    prefix: string = "apPlayer",
    player?: number
  ): Record<string, string> => {
    const playerData = !!player
      ? this.#session.players.getPlayer(player)
      : this.#session.players.self;

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
    prefix: string = "apSession"
  ): Record<string, string> => ({
    [`${prefix}Name`]: this.#session.name,
    [`${prefix}IsStarting`]: `${this.#session.startingUp}`,
    [`${prefix}Hostname`]: this.#session.url.hostname,
    [`${prefix}Port`]: `${this.#session.url.port}`,
    [`${prefix}Url`]: this.#session.url.toString(),
    [`${prefix}LocationCount`]: `${this.#session.totalLocations}`,
    [`${prefix}HintPoints`]: `${this.#session.hintPoints}`,
    [`${prefix}HintCost`]: `${this.#session.hintCost}`,
    [`${prefix}HintCostPercent`]: `${this.#session.hintCostPercent}`,
    [`${prefix}Hints`]: `${this.#session.hints}`,
  });

  #getDeathLinkMetadata = (
    prefix: string = "apDeathLink",
    data: DeathLinkData
  ): Record<string, string> => ({
    [`${prefix}Source`]: data.source,
    [`${prefix}Cause`]: data.cause,
    [`${prefix}Time`]: `${data.time}`,
  });

  //#endregion
}
