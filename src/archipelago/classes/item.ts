import { ItemClassification } from "../../enums";
import { NetworkItem } from "../../types";
import { APSession } from "../session";
import { Player } from "./player";

export class Item {
  readonly #session: APSession;
  readonly #item: NetworkItem;
  readonly #sender: Player;
  readonly #receiver: Player;

  public constructor(
    session: APSession,
    item: NetworkItem,
    sender: Player,
    receiver: Player
  ) {
    this.#session = session;
    this.#item = item;
    this.#sender = sender;
    this.#receiver = receiver;
  }

  public toString = (): string => this.name;

  public get receiver(): Player {
    return this.#receiver;
  }

  public get sender(): Player {
    return this.#sender;
  }

  public get name(): string {
    return this.#session.getItemName(this.game, this.#item.item, true);
  }

  public get id(): number {
    return this.#item.item;
  }

  public get locationName(): string {
    return this.#session.getLocationName(
      this.sender.game,
      this.#item.location,
      true
    );
  }

  public get game(): string {
    return this.receiver.game;
  }

  public get isProgression(): boolean {
    return (
      (this.flags & ItemClassification.Progression) ===
      ItemClassification.Progression
    );
  }

  public get isUseful(): boolean {
    return (
      (this.flags & ItemClassification.Useful) === ItemClassification.Useful
    );
  }

  public get isTrap(): boolean {
    return (this.flags & ItemClassification.Trap) === ItemClassification.Trap;
  }

  public get isFiller(): boolean {
    return (this.flags & ItemClassification.None) === ItemClassification.None;
  }

  public get flags(): number {
    return this.#item.flags;
  }
}
