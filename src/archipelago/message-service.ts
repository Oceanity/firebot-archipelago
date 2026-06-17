import { APCommandDefinitions } from "../chat-command-definitions";
import { ARCHIPELAGO_PLUGIN_MAX_MESSAGES } from "../constants";

import firebot from "@crowbartools/firebot-types";
import { MessageNode } from "archipelago.js";
import { DeathLinkData, SessionStatus, StateSession } from "../types";

export type Message = {
  text: string;
  html: string;
  nodes?: Array<MessageNode>;
};

export type MessageLog = Array<Message>;

export class MessageService {
  readonly #session: StateSession;

  #chatHistory: Array<string> = [];
  #messages: MessageLog = [];

  constructor(session: StateSession) {
    this.#session = session;
  }

  public get log(): MessageLog {
    return [...this.#messages];
  }

  public get textLog(): Array<string> {
    return this.#messages.map((entry) => entry.text);
  }

  public get htmlLog(): Array<string> {
    return this.#messages.map((entry) => entry.html);
  }

  public sendLog(
    message: string,
    level: "info" | "warning" | "error" = "info",
  ) {
    if (this.#session.status !== SessionStatus.Connected) {
      firebot.logger.warn(
        `Disconnected session with Id '${this.#session.id}' tried to sendLog`,
      );
      return;
    }

    if (!message.length) {
      firebot.logger.warn(
        `Session with Id '${this.#session.id}' tried to send an empty log`,
      );
      return;
    }

    let color = "default";
    switch (level) {
      case "warning":
        color = "orange";
        break;
      case "error":
        color = "red";
        break;
    }

    this.push({
      text: message,
      html: `<span class="log ${color}">${message}</span>`,
      nodes: [],
    });
  }

  public clearChat() {
    this.#messages = [];
    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:chat-cleared",
    );
  }

  public getChatHistory(entry?: number): [message: string, index: number] {
    if (!this.#chatHistory.length) {
      return ["", -1];
    }

    if (entry === undefined) {
      entry = this.#chatHistory.length - 1;
    } else if (entry < 0) {
      entry = 0;
    } else if (entry >= this.#chatHistory.length) {
      return ["", this.#chatHistory.length];
    }

    return [this.#chatHistory[entry], entry];
  }

  public push(message: Message | string, isHidden: boolean = true) {
    const formattedMessage =
      typeof message === "string"
        ? {
            text: message,
            html: `<span class="text">${message}</span>`,
            nodes: [],
          }
        : message;

    this.#messages.push(formattedMessage);
    if (this.#messages.length > ARCHIPELAGO_PLUGIN_MAX_MESSAGES) {
      this.#messages.shift();
    }

    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:got-html-log-message",
      {
        sessionId: this.#session.id,
        html: formattedMessage.html,
      },
    );
  }

  #onDeathLink = (data: DeathLinkData) => {
    const { source, cause } = data;

    this.sendLog(
      `DeathLink (${source}): ${cause || `${source} died.`}`,
      "error",
    );
  };

  /** Handle chat commands defined in {@link APCommandDefinitions} */
  #handleChatCommand = (command: string, ...args: Array<string>) => {
    if (!APCommandDefinitions.hasOwnProperty(command)) {
      this.sendLog(
        "Unrecognized command, use /help to see all available commands",
        "error",
      );
      return;
    }

    this.sendLog(`${command} ${args.join(" ")}`, "warning");

    APCommandDefinitions[command as keyof typeof APCommandDefinitions].callback(
      this.#session.id,
      ...args,
    );
  };
}
