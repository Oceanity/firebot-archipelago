import { TypedEmitter } from "tiny-typed-emitter";
import { NetworkPlayer, NetworkSlot } from "../../types";
import { Player } from "../classes/player";
import { APSession } from "../session";

export class PlayerService extends TypedEmitter {
  readonly #session: APSession;

  #players: Array<Array<NetworkPlayer>>;
  #slots: Readonly<Record<string, NetworkSlot>>;
  #slot: number;
  #team: number;

  public constructor(session: APSession) {
    super();

    this.#players = new Array();
    this.#slots = {};

    this.#session = session;
    this.#session.socket
      .on("connected", (packet) => {
        this.#slots = Object.freeze(packet.slot_info);
        this.#players = [];
        this.#slot = packet.slot;
        this.#team = packet.team;

        for (const player of packet.players) {
          this.#players[player.team] ??= [
            {
              team: player.team,
              slot: 0,
              name: "Archipelago",
              alias: "Archipelago",
            },
          ];
          this.#players[player.team][player.slot] = player;
        }
      })
      .on("roomUpdate", (packet) => {
        if (!packet.players) {
          return;
        }

        for (const player of packet.players) {
          if (this.#players[player.team][player.slot].alias !== player.alias) {
            const oldAlias = this.#players[player.team][player.slot].alias;
            this.#players[player.team][player.slot] = player;
            this.emit("archipelago:aliasUpdated", [
              new Player(this.#session, player),
              oldAlias,
              player.alias,
            ]);
          }
        }
      });
  }

  public get self(): Player {
    if (this.#slot === 0) {
      throw new Error("Can't get players while disconnected");
    }

    return new Player(this.#session, this.#players[this.#team][this.#slot]);
  }

  public get slots(): Readonly<Record<number, NetworkSlot>> {
    return this.#slots;
  }

  public get teams(): Array<Array<Player>> {
    const players: Array<Array<Player>> = new Array();
    for (let team = 0; team < this.#players.length; team++) {
      players[team] = new Array();
      for (let player = 0; player < this.#players[team].length; player++) {
        players[team].push(
          new Player(this.#session, this.#players[team][player])
        );
      }
    }

    return players;
  }

  public getPlayer(slot: string | number, team?: number): Player | undefined {
    if (team === undefined) {
      team = this.#session.players.self.team;
    }

    if (typeof slot === "string") {
      slot = parseInt(slot);
    }

    const playerTeam = this.#players[team];
    if (playerTeam) {
      return new Player(this.#session, this.#players[team][slot]);
    }

    return undefined;
  }
}
