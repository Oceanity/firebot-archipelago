import {
  MessageColor,
  MessageNodeType,
  MessagePartType,
  PrintJsonType,
} from "../../enums";
import {
  ColorJSONMessagePart,
  ItemJSONMessagePart,
  JSONMessagePart,
  LocationJSONMessagePart,
  TextJSONMessagePart,
} from "../../types";
import { itemClassificationString } from "../helpers";
import {
  HintJSONPacket,
  ItemCheatJSONPacket,
  ItemSendJSONPacket,
} from "../interfaces/packets";
import { APSession } from "../session";
import { Item } from "./item";
import { Player } from "./player";

export abstract class BaseMessageNode {
  protected readonly session: APSession;
  protected readonly part: JSONMessagePart;
  public abstract readonly type: MessageNodeType;

  protected constructor(session: APSession, part: JSONMessagePart) {
    this.session = session;
    this.part = part;
  }
}

export class ColorMessageNode extends BaseMessageNode {
  declare protected readonly part: ColorJSONMessagePart;
  public readonly type = MessageNodeType.Color;

  public readonly color: MessageColor;

  public constructor(session: APSession, part: ColorJSONMessagePart) {
    super(session, part);

    this.part = part;
    this.color = part.color;
  }

  public get text(): string {
    return this.part.text;
  }

  public get html(): string {
    return `<span class="${this.color}">${this.part.text}</span>`;
  }
}

export class ItemMessageNode extends BaseMessageNode {
  declare protected readonly part: ItemJSONMessagePart;
  public readonly type = MessageNodeType.Item;

  public readonly item: Item;

  public constructor(
    session: APSession,
    part: ItemJSONMessagePart,
    itemPacket: ItemSendJSONPacket | ItemCheatJSONPacket | HintJSONPacket,
  ) {
    super(session, part);

    const receiver: Player = session.players.getPlayer(
      itemPacket.receiving,
      itemPacket.type === PrintJsonType.ItemCheat ? itemPacket.team : undefined,
    );

    const player = session.players.getPlayer(
      part.player,
      receiver.team,
    ) as Player;
    this.part = part;
    this.item = new Item(session, itemPacket.item, player, receiver);
  }

  public get text(): string {
    return this.item.name;
  }

  public get html(): string {
    const { name, flags } = this.item;

    const classes = ["item", itemClassificationString(flags)];

    return `<span class="${classes.join(" ")}">${name}</span>`;
  }
}

export class LocationMessageNode extends BaseMessageNode {
  readonly #name: string;

  declare protected readonly part: LocationJSONMessagePart;
  public readonly type = MessageNodeType.Location;

  public readonly id: number;

  public constructor(session: APSession, part: LocationJSONMessagePart) {
    super(session, part);

    const player = session.players.getPlayer(part.player);
    const game = session.getPackage(player.game);
    this.part = part;

    switch (part.type) {
      case MessagePartType.LocationName: {
        this.#name = part.text;
        this.id = game.locationTable[part.text];
        break;
      }

      default: {
        this.id = parseInt(part.text);
        this.#name = session.getLocationName(player.game, part.text);
        break;
      }
    }
  }

  public get text(): string {
    return this.#name;
  }

  public get html(): string {
    return `<span class="location">${this.#name}</span>`;
  }
}

export class PlayerMessageNode extends BaseMessageNode {
  declare protected readonly part: TextJSONMessagePart;
  public readonly type = MessageNodeType.Player;

  public readonly player: Player;

  public constructor(session: APSession, part: TextJSONMessagePart) {
    super(session, part);

    this.part = part;
    switch (part.type) {
      case MessagePartType.PlayerId: {
        this.player = session.players.getPlayer(part.text);
        break;
      }

      default: {
        const player = session.players.teams[session.players.self.team].find(
          (p) => p.name === part.text,
        );

        if (!player) {
          throw new Error(`Cannot find player with name: ${part.text}`);
        }

        this.player = player;
      }
    }
  }

  public get text(): string {
    return this.player.alias;
  }

  public get html(): string {
    const classes = [
      "player",
      `team-${this.player.team}`,
      this.player.team === this.session.players.self.team
        ? "teammate"
        : "opponent",
      this.player.slot === this.session.players.self.slot ? "self" : "other",
    ];

    return `<span class="${classes.join(" ")}">${this.player.alias}</span>`;
  }
}

export class TextMessageNode extends BaseMessageNode {
  declare protected readonly part: TextJSONMessagePart;
  public readonly type: MessageNodeType.Entrance | MessageNodeType.Text;

  public constructor(session: APSession, part: TextJSONMessagePart) {
    super(session, part);

    this.part = part;
    switch (this.part.type) {
      case MessagePartType.EntranceName:
        this.type = MessageNodeType.Entrance;
        break;
      default:
        this.type = MessageNodeType.Text;
        break;
    }
  }

  public get text(): string {
    return this.part.text;
  }

  public get html(): string {
    return `<span>${this.part.text}</span>`;
  }
}

export type MessageNode =
  | ColorMessageNode
  | ItemMessageNode
  | LocationMessageNode
  | PlayerMessageNode
  | TextMessageNode;
