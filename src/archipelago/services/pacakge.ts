import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { APSession } from "../../archipelago/session";
import { ClientCommand } from "../../enums";
import { DataPackage, GamePackage } from "../../types";
import { GetDataPackagePacket, RoomInfoPacket } from "../interfaces/packets";

class StoredGamePackage {
  public readonly game: string;
  public readonly checksum: string;
  public readonly itemTable: Readonly<Record<string, number>>;
  public readonly locationTable: Readonly<Record<string, number>>;
  public readonly reverseItemTable: Readonly<Record<number, string>>;
  public readonly reverseLocationTable: Readonly<Record<number, string>>;

  constructor(game: string, pkg: GamePackage) {
    this.game = game;
    this.checksum = pkg.checksum;
    this.itemTable = Object.freeze(pkg.item_name_to_id);
    this.locationTable = Object.freeze(pkg.location_name_to_id);
    this.reverseItemTable = Object.freeze(
      Object.fromEntries(
        Object.entries(pkg.item_name_to_id).map(([name, id]) => [id, name])
      )
    );
    this.reverseLocationTable = Object.freeze(
      Object.fromEntries(
        Object.entries(pkg.location_name_to_id).map(([name, id]) => [id, name])
      )
    );
  }

  public toGamePackage(): GamePackage {
    return {
      item_name_to_id: { ...this.itemTable },
      location_name_to_id: { ...this.locationTable },
      checksum: this.checksum,
    };
  }
}

export class DataPackageService extends TypedEmitter<{}> {
  readonly #session: APSession;
  readonly #games: Set<string>;
  readonly #checksums: Map<string, string>;
  readonly #packages: Map<string, StoredGamePackage>;

  constructor(session: APSession) {
    super();

    this.#games = new Set();
    this.#checksums = new Map();
    this.#packages = new Map();

    this.#session = session;
    this.#session.socket.on("roomInfo", this.#onRoomInfo.bind(this));
    // .on("dataPackage", this.#onDataPackage.bind(this));
  }

  public async fetchPackage(
    games: Array<string> = [],
    update: boolean = true
  ): Promise<DataPackage> {
    if (games.length === 0) {
      games = [...this.#games];
    }

    games = games.filter((game) => {
      if (!this.#games.has(game)) return false;

      if (this.#packages.get(game)?.checksum !== this.#checksums.get(game))
        return true;

      return false;
    });

    const data: DataPackage = { games: {} };
    for (const game of games) {
      const request: GetDataPackagePacket = {
        cmd: ClientCommand.GetDataPackage,
        games: [game],
      };

      logger.info(`Fetching package for: ${game}`);

      const [response] = await this.#session.socket
        .send(request)
        .wait("dataPackage");

      data.games[game] = response.data.games[game];
    }

    if (update) {
      this.storePackage(data);
    }

    return data;
  }

  public storePackage = (dataPackage: DataPackage): void => {
    Object.entries(dataPackage.games).forEach(([game, data]) => {
      logger.info(`Storing game: ${game}`);
      this.#packages.set(game, new StoredGamePackage(game, data));
      this.#checksums.set(game, data.checksum);
    });
  };

  public getPackage = (game: string): StoredGamePackage | null =>
    this.#packages.get(game) ?? null;

  public getItemName(
    game: string,
    id: number,
    fallback: boolean = true
  ): string | undefined {
    const fallbackName = `Item #${id}`;

    const gamePackage = this.getPackage(game);
    if (!gamePackage) {
      return fallback ? fallbackName : undefined;
    }

    const name = gamePackage.reverseItemTable[id];
    return name ?? (fallback ? fallbackName : undefined);
  }

  public getLocationName(
    game: string,
    id: string | number,
    fallback: boolean = true
  ): string | undefined {
    const fallbackName = `Location #${id}`;

    if (typeof id === "string") {
      id = parseInt(id);
    }

    const gamePackage = this.getPackage(game);
    if (!gamePackage) {
      return fallback ? fallbackName : undefined;
    }

    const name = gamePackage.reverseLocationTable[id];
    return name ?? (fallback ? fallbackName : undefined);
  }

  #onRoomInfo = async (packet: RoomInfoPacket): Promise<void> => {
    this.#packages.clear();
    this.#checksums.clear();
    this.#games.clear();

    this.#packages.set(
      "Archipelago",
      new StoredGamePackage("Archipelago", {
        checksum: "ac9141e9ad0318df2fa27da5f20c50a842afeecb",
        item_name_to_id: { Nothing: -1 },
        location_name_to_id: { "Cheat Console": -1, Server: -2 },
      })
    );

    for (const game of Object.keys(packet.datapackage_checksums)) {
      this.#checksums.set(game, packet.datapackage_checksums[game]);
      this.#games.add(game);
    }

    await this.fetchPackage(packet.games);
  };
}
