import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { MessagePartType, PrintJsonType } from "../../enums";
import {
  HintJSONPacket,
  ItemCheatJSONPacket,
  ItemSendJSONPacket,
  PrintJSONPacket,
} from "../../interfaces";
import {
  ColorMessageNode,
  ItemMessageNode,
  LocationMessageNode,
  MessageNode,
  PlayerMessageNode,
  TextMessageNode,
} from "../classes/messageNodes";
import { Player } from "../classes/player";
import { APSession } from "../session";

type Events = {
  message: (data: {
    message: { text: string; html: string };
    slot: string;
  }) => void;
};

export type MessageLog = Array<{
  text: string;
  html: string;
  nodes: Array<MessageNode>;
}>;

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
    logger.info("Getting HTML Log");
    return this.#messages.map((entry) => entry.html);
  }

  public push([message]: MessageLog) {
    this.#messages.push(message);

    this.emit("message", {
      message: { text: message.text, html: message.html },
      slot: this.#session.players.self.name,
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
          const receiver: Player = this.#session.players.getPlayer(
            itemPacket.receiving,
            itemPacket.type === PrintJsonType.ItemCheat
              ? itemPacket.team
              : undefined
          );

          nodes.push(
            new ItemMessageNode(this.#session, part, itemPacket.item, receiver)
          );

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
      message: { text, html },
      slot: this.#session.players.self.name,
    });
  };
}
