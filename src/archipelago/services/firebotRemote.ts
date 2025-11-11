import { eventManager } from "@oceanity/firebot-helpers/firebot";
import { ARCHIPELAGO_INTEGRATION_ID } from "../../constants";
import { APSession } from "../session";

export class FirebotRemoteService {
  readonly #session: APSession;

  constructor(session: APSession) {
    this.#session = session;

    //#region Socket Events

    this.#session.socket.on("connected", (packet) => {
      eventManager.triggerEvent(ARCHIPELAGO_INTEGRATION_ID, "connected", {});
    });

    //#endregion
  }
}
