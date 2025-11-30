import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { APCommandDefinitions } from "../../archipelago-command-definitions";
import {
  ARCHIPELAGO_CLIENT_MAX_CHAT_HISTORY,
  ARCHIPELAGO_CLIENT_MAX_MESSAGES,
} from "../../constants";
import {
  ClientCommand,
  MessagePartType,
  PrintJsonType,
  Tag,
} from "../../enums";
import {
  BouncedPacket,
  CountdownJSONPacket,
  HintJSONPacket,
  ItemCheatJSONPacket,
  ItemSendJSONPacket,
} from "../../interfaces";
import { PrintJSONPacket } from "../../types";
import {
  ColorMessageNode,
  ItemMessageNode,
  LocationMessageNode,
  MessageNode,
  PlayerMessageNode,
  TextMessageNode,
} from "../classes/message-nodes";
import { APSession } from "../session";

type Events = {
  countdown: (data: { countdown: number }) => void;
  message: (data: {
    isHidden: boolean;
    message: Message;
    sessionId: string;
  }) => void;
  chatCleared: () => void;
};

export type Message = {
  text: string;
  html: string;
  nodes?: Array<MessageNode>;
};

export type MessageLog = Array<Message>;

export class MessageService extends TypedEmitter<Events> {
  readonly #session: APSession;

  #chatHistory: Array<string> = [];
  #messages: MessageLog = [];

  constructor(session: APSession) {
    super();

    this.#session = session;
    this.#session.socket
      .on("printJson", this.#onPrintJson.bind(this))
      .on("bounced", this.#onBounced.bind(this));
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

  public sendChat(message: string) {
    if (!message.length) {
      return;
    }

    this.#chatHistory.push(message);
    if (this.#chatHistory.length > ARCHIPELAGO_CLIENT_MAX_CHAT_HISTORY) {
      this.#chatHistory.shift();
    }

    if (message.startsWith("/")) {
      const args = message.split(" ").filter((p) => !!p.trim().length);
      const command = args.shift();
      this.#handleChatCommand(command, ...args);
      return;
    }

    this.#session.socket.send({
      cmd: ClientCommand.Say,
      text: message,
    });
  }

  public clearChat() {
    this.#messages = [];
    this.emit("chatCleared");
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
    if (this.#messages.length > ARCHIPELAGO_CLIENT_MAX_MESSAGES) {
      this.#messages.shift();
    }

    this.emit("message", {
      isHidden,
      message: formattedMessage,
      sessionId: this.#session.id,
    });
  }

  #onPrintJson = (packet: PrintJSONPacket): void => {
    const nodes: Array<MessageNode> = [];

    for (const part of packet.data) {
      switch (part.type) {
        case MessagePartType.ItemId:
        case MessagePartType.ItemName: {
          const itemPacket = packet as
            | ItemSendJSONPacket
            | ItemCheatJSONPacket
            | HintJSONPacket;

          nodes.push(new ItemMessageNode(this.#session, part, itemPacket));

          break;
        }

        case MessagePartType.LocationId:
        case MessagePartType.LocationName: {
          nodes.push(new LocationMessageNode(this.#session, part));
          break;
        }

        case MessagePartType.Color: {
          nodes.push(new ColorMessageNode(this.#session, part));
          break;
        }

        case MessagePartType.PlayerId:
        case MessagePartType.PlayerName: {
          nodes.push(new PlayerMessageNode(this.#session, part));
          break;
        }

        default: {
          if (packet.type === PrintJsonType.Countdown) {
            const countdownPacket = packet as CountdownJSONPacket;
            this.emit("countdown", { countdown: countdownPacket.countdown });
          }

          nodes.push(new TextMessageNode(this.#session, part));
          break;
        }
      }
    }

    const text = nodes.map((node) => node.text).join("");
    const html = nodes.map((node) => node.html).join("");
    const message: MessageLog = [{ text, html, nodes }];

    this.#messages.push(...message);
    if (this.#messages.length > ARCHIPELAGO_CLIENT_MAX_MESSAGES) {
      this.#messages.shift();
    }

    this.emit("message", {
      isHidden: false,
      message: { text, html },
      sessionId: this.#session.id,
    });
  };

  #onBounced = (packet: BouncedPacket) => {
    // DeathLink
    if (packet.tags?.includes(Tag.DeathLink)) {
      logger.info(JSON.stringify(packet));

      const { source, cause } = packet.data;

      this.push({
        text: `DeathLink (${source}): ${cause ?? `${source} died.`}`,
        html: `<span class="deathlink">DeathLink (${source}): ${
          cause ?? `${source} died.`
        }︎</span>`,
        nodes: [],
      });
    }
  };

  /** Handle chat commands defined in {@link APCommandDefinitions} */
  #handleChatCommand = (command: string, ...args: Array<string>) => {
    if (!APCommandDefinitions.hasOwnProperty(command)) {
      this.push({
        text: "Unrecognized command, use /help to see all available commands",
        html: `<p class="red">Unrecognized command, use /help to see all available commands</p>`,
        nodes: [],
      });
      return;
    }

    this.push({
      text: `${command} ${args.join(" ")}`,
      html: `<span class="orange">${command} ${args.join(" ")}</span>`,
      nodes: [],
    });

    APCommandDefinitions[command as keyof typeof APCommandDefinitions].callback(
      this.#session.id,
      ...args
    );
  };
}
