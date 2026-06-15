import {
  eventManager,
  frontendCommunicator,
} from "@oceanity/firebot-helpers/firebot";
import { ARCHIPELAGO_PLUGIN_ID } from "../../constants";
import { FirebotEvents } from "../../enums";
import { APSession } from "../session";

export class FirebotRemoteService {
  readonly #session: APSession;

  constructor(session: APSession) {
    this.#session = session;

    //#endregion

    //#region Message Events

    this.#session.messages
      .on("message", (data) => {
        // Send to Frontend UI Extension
        frontendCommunicator.fireEventAsync("archipelago:gotLogMessage", data);

        // If message is hidden, we'll skip the Event
        if (data.isHidden) {
          return;
        }

        // Send to Firebot Events
        eventManager.triggerEvent(
          ARCHIPELAGO_PLUGIN_ID,
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

  #getMessageMetadata = (
    prefix: string = "apMessage",
    message: { html: string; text: string },
  ): Record<string, string> => ({
    [`${prefix}Html`]: message.html,
    [`${prefix}Text`]: message.text,
  });

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

  //#endregion
}
