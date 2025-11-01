import EventEmitter from "events";
import { WebSocket } from "ws";

import { logger } from "@oceanity/firebot-helpers/firebot";
import { InvokeMessage, Message } from "./types/archipelago-websocket";

export class FirebotWebSocket extends EventEmitter {
  private hostname: string;
  private ws: WebSocket;

  constructor(hostname: string) {
    super();
    this.hostname = hostname;
  }

  init() {
    if (!this.hostname) {
      logger.error("No hostname provided for WebSocket connection");
      return;
    }

    if (this.ws != null) {
      this.ws.close(4101);
    }

    this.ws = new WebSocket(`ws://${this.hostname}`)
      .on("close", (code) => this.emit("close", code))
      .on("open", () => {
        const registration: InvokeMessage = {
          type: "invoke",
          name: "subscribe-events",
          id: 0,
          data: [],
        };

        this.ws.send(JSON.stringify(registration));
      })
      .on("message", (data) => {
        logger.info(JSON.stringify(data));
        this.processMessage(JSON.parse(data.toString()));
      });
  }

  processMessage(message: Message) {
    if (message.type === "response" && message.id === 0) {
      this.emit(`registration-${message.name}`); // registration-success or registration-error
      return;
    }

    if (message.type !== "event") {
      return;
    }

    const meta = {
      event: message.name,
      data: message.data,
    };

    this.emit("firebot-event", meta);
  }

  close(code = 4100) {
    this.ws.close(code);
    this.ws = null;
  }
}
