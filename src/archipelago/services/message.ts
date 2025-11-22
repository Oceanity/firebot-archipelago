import { TypedEmitter } from "tiny-typed-emitter";
import { MessagePartType, PrintJsonType } from "../../enums";
import {
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
    sessionName: string;
  }) => void;
};

export type Message = {
  text: string;
  html: string;
  nodes?: Array<MessageNode>;
};

export type MessageLog = Array<Message>;

export class MessageService extends TypedEmitter<Events> {
  readonly #session: APSession;
  readonly #messages: MessageLog = [];

  constructor(session: APSession) {
    super();

    this.#session = session;
    this.#session.socket.on("printJson", this.#onPrintJson.bind(this));
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

    this.emit("message", {
      isHidden,
      message: formattedMessage,
      sessionName: this.#session.name,
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
    this.emit("message", {
      isHidden: false,
      message: { text, html },
      sessionName: this.#session.name,
    });
  };
}
