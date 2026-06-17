import { AllChatCommandDefinitions } from "../chat-command-definitions";
import {
  ARCHIPELAGO_PLUGIN_ID,
  ARCHIPELAGO_PLUGIN_MAX_CHAT_HISTORY,
  ARCHIPELAGO_PLUGIN_MAX_MESSAGES,
} from "../constants";

import firebot from "@crowbartools/firebot-types";
import { itemClassifications, MessageNode } from "archipelago.js";
import { getMessageMetadata, getSessionMetadata } from "../helpers";
import { FirebotEvents, SessionStatus, StateLogMessage } from "../types";
import { ArchipelagoSession } from "./archipelago-session";

export class MessageService {
  readonly #session: ArchipelagoSession;

  #chatHistory: Array<string> = [];
  #messages: Array<StateLogMessage> = [];

  constructor(session: ArchipelagoSession) {
    this.#session = session;
    session.client.messages.on("message", this.#onMessage);
    session.client.deathLink.on("deathReceived", this.#onDeathLink);
  }

  public get log(): Array<StateLogMessage> {
    return [...this.#messages];
  }

  public get textLog(): Array<string> {
    return this.#messages.map((entry) => entry.text);
  }

  public get htmlLog(): Array<string> {
    return this.#messages.map((entry) => entry.html);
  }

  public get chatHistory(): Array<string> {
    return this.#chatHistory;
  }

  sendLog(message: string, level: "info" | "warning" | "error" = "info") {
    if (this.#session.status !== SessionStatus.Connected) {
      return firebot.logger.warn(
        `Disconnected session with Id '${this.#session.id}' tried to sendLog`,
      );
    }

    if (!message.length) {
      return firebot.logger.warn(
        `Session with Id '${this.#session.id}' tried to send an empty log`,
      );
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

    const html = `<span class="log ${color}">${message}</span>`;
    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:got-html-log-message",
      { sessionId: this.#session.id, html },
    );

    this.#messages.push({
      text: message,
      html,
    });
  }

  async sendChat(message: string) {
    if (!message.length) {
      return;
    }

    this.chatHistory.push(message);
    while (this.chatHistory.length > ARCHIPELAGO_PLUGIN_MAX_CHAT_HISTORY) {
      this.chatHistory.shift();
    }

    if (message.startsWith("/")) {
      const args = message.split(" ").filter((p) => !!p.trim().length);
      const command = args.shift();
      this.#handleChatCommand(command ?? "", ...args);
      return;
    }

    await this.#session.client?.messages.say(message);
  }

  public clearChat() {
    this.#messages = [];
    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:chat-cleared",
      this.#session.id,
    );
  }

  public getChatHistoryEntry(entry?: number): [message: string, index: number] {
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

  public push(message: StateLogMessage | string) {
    const formattedMessage: StateLogMessage =
      typeof message === "string"
        ? {
            text: message,
            html: `<span class="text">${message}</span>`,
          }
        : message;

    this.#messages.push(formattedMessage);
    while (this.#messages.length > ARCHIPELAGO_PLUGIN_MAX_MESSAGES) {
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

  #onMessage = (text: string, nodes: Array<MessageNode>) => {
    const logMessage: StateLogMessage = {
      text,
      html: this.#getMessageHtml(nodes),
      nodes,
    };

    this.#messages.push(logMessage);

    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:got-html-log-message",
      {
        sessionId: this.#session.id,
        html: logMessage.html,
      },
    );

    // Send to Firebot Events
    firebot.events.trigger(ARCHIPELAGO_PLUGIN_ID, FirebotEvents.Message, {
      ...getSessionMetadata(this.#session.id, this.#session.client),
      ...getMessageMetadata(logMessage),
    });
  };

  #onDeathLink = (source: string, _time: number, cause?: string) => {
    this.sendLog(
      `DeathLink (${source}): ${cause || `${source} died.`}`,
      "error",
    );
  };

  /** Handle chat commands defined in {@link AllChatCommandDefinitions} */
  #handleChatCommand = (command: string, ...args: Array<string>) => {
    firebot.logger.info(`User ran command: ${command}`);
    if (!AllChatCommandDefinitions.hasOwnProperty(command)) {
      this.sendLog(
        "Unrecognized command, use /help to see all available commands",
        "error",
      );
      return;
    }

    this.sendLog(`${command} ${args.join(" ")}`, "warning");

    AllChatCommandDefinitions[
      command as keyof typeof AllChatCommandDefinitions
    ].callback(this.#session, ...args);
  };

  #getMessageHtml = (messageNodes: Array<MessageNode>): string => {
    return messageNodes
      .map((node) => {
        switch (node.type) {
          case "text": {
            return `<span>${node.text}</span>`;
          }

          case "color": {
            return `<span style="color: ${node.color}">${node.text}</span>`;
          }

          case "player": {
            const classes = [
              "player",
              `team-${node.player.team}`,
              node.player.team === this.#session.client.players.self.team
                ? "teammate"
                : "opponent",
              node.player.slot === this.#session.client.players.self.slot
                ? "self"
                : "other",
            ];
            return `<span class="${classes.join(" ")}">${node.player.alias}</span>`;
          }

          case "item": {
            const classes = ["item"];
            switch (node.item.flags) {
              case itemClassifications.progression:
                classes.push("progression");
                break;
              case itemClassifications.useful:
                classes.push("useful");
                break;
              case itemClassifications.trap:
                classes.push("useful");
                break;
              default:
                classes.push("filler");
                break;
            }

            return `<span class="${classes.join(" ")}">${node.item.name}</span>`;
          }

          case "location": {
            return `<span class="location">${node.text}</span>`;
          }

          default:
            return "";
        }
      })
      .join(" ");
  };
}
