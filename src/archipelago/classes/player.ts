import { SlotType } from "../../enums";
import { NetworkPlayer, NetworkSlot } from "../../types";
import { APSession } from "../session";

export class Player {
  readonly #session: APSession;
  readonly #player: NetworkPlayer;

  public constructor(session: APSession, player: NetworkPlayer) {
    this.#session = session;
    this.#player = player;
  }

  public toString(): string {
    return this.alias;
  }

  public get name(): string {
    return this.#player.name;
  }

  public get alias(): string {
    return this.#player.alias;
  }

  public get game(): string {
    if (this.slot === 0) {
      return "Archipelago";
    }

    return this.#networkSlot.game;
  }

  public get type(): SlotType {
    if (this.slot === 0) {
      return SlotType.Spectator;
    }

    return this.#networkSlot.type;
  }

  public get team(): number {
    return this.#player.team;
  }

  public get slot(): number {
    return this.#player.slot;
  }

  public get members(): Player[] {
    if (this.type !== SlotType.Group) {
      return [];
    }

    return this.#session.players.teams[this.team].filter((player) =>
      this.#networkSlot.group_members.includes(player.slot)
    );
  }

  public get groups(): Array<Player> {
    if (this.slot === 0) {
      return [];
    }

    return this.#session.players.teams[this.team].filter(
      (player) =>
        player.slot !== 0 &&
        this.#session.players.slots[player.slot].group_members.includes(
          this.slot
        )
    );
  }

  // public async fetchStatus(): Promise<ClientStatus> {
  //   // All spectators are completed.
  //   if (this.type === SlotType.Group) {
  //     return ClientStatus.Goal;
  //   }

  //   return (
  //     (await this.#session.storage.fetch<ClientStatus>(
  //       `_read_client_status_${this.team}_${this.slot}`
  //     )) ?? 0
  //   );
  // }

  // public async fetchSlotData<SlotData extends JSONRecord>(): Promise<SlotData> {
  //   return await this.#session.storage.fetch<SlotData>(
  //     `_read_slot_data_${this.slot}`
  //   );
  // }

  // public async fetchHints(): Promise<Hint[]> {
  //   const hints = await this.#session.storage.fetch<NetworkHint[]>(
  //     `_read_hints_${this.team}_${this.slot}`
  //   );
  //   return hints.map((hint) => new Hint(this.#session, hint));
  // }

  get #networkSlot(): NetworkSlot {
    return this.#session.players.slots[this.slot];
  }
}
