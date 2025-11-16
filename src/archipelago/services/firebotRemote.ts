import {
  eventManager,
  frontendCommunicator,
  logger,
} from "@oceanity/firebot-helpers/firebot";
import { ARCHIPELAGO_INTEGRATION_ID } from "../../constants";
import { FirebotEvents } from "../../enums";
import { APSession } from "../session";

export class FirebotRemoteService {
  readonly #session: APSession;

  constructor(session: APSession) {
    this.#session = session;

    //#region Socket Events

    this.#session.socket.on("connected", (packet) => {
      logger.info("Connected Event");
      logger.info(JSON.stringify(packet));
      eventManager.triggerEvent(
        ARCHIPELAGO_INTEGRATION_ID,
        FirebotEvents.Connected,
        {}
      );
    });

    this.#session.socket.on("receivedItems", (packet) => {
      logger.info("Received Items Event");
      logger.info(JSON.stringify(packet));
      eventManager.triggerEvent(
        ARCHIPELAGO_INTEGRATION_ID,
        FirebotEvents.ReceivedItems,
        {}
      );
    });

    //#endregion

    //#region Message Events

    this.#session.messages.on("message", (data) => {
      frontendCommunicator.fireEventAsync("archipelago:gotLogMessage", data);
    });

    //#endregion
  }
}
