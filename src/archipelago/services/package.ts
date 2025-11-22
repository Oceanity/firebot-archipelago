import { JsonDb, logger } from "@oceanity/firebot-helpers/firebot";
import { JsonDB } from "node-json-db";
import { resolve } from "path";
import { ClientCommand } from "../../enums";
import { DataPackage, GamePackage } from "../../types";
import { GetDataPackagePacket } from "../interfaces/packets";
import { APSession } from "../session";

type StoredGamePackageDb = {
  [game: string]: {
    [checksum: string]: Omit<GamePackage, "checksum">;
  };
};

export class StoredGamePackage {
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

export class DataPackageService {
  readonly #filePath: string = resolve(__dirname, "./ap-data-packages.json");
  readonly #packages: Map<string, Map<string, StoredGamePackage>> = new Map();
  readonly #db: JsonDB;

  #hasLoadedDb = false;

  public constructor() {
    // @ts-expect-error ts(2351)
    this.#db = new JsonDb(this.#filePath, true, false);
  }

  public get checksums() {
    return new Set(this.#packages.keys());
  }

  public async fetchPackage(
    session: APSession,
    gameSums: Array<[string, string]>,
    update: boolean = true
  ): Promise<DataPackage> {
    // Load existing db to local
    if (!this.#hasLoadedDb) {
      const existingData = await this.#db.getObject<StoredGamePackageDb>("/");
      Object.entries(existingData).map(([game, packages]) => {
        if (!this.#packages.get(game)) {
          this.#packages.set(game, new Map());
        }

        Object.entries(packages).map(([checksum, data]) => {
          this.#packages
            .get(game)
            .set(checksum, new StoredGamePackage(game, { ...data, checksum }));
        });
      });

      this.#hasLoadedDb = true;
    }

    const data: DataPackage = { games: {} };

    const filteredGameSums = gameSums.filter(
      ([game, checksum]) => !this.#packages.get(game)?.has(checksum)
    );

    for (const [game, checksum] of filteredGameSums) {
      const request: GetDataPackagePacket = {
        cmd: ClientCommand.GetDataPackage,
        games: [game],
      };

      logger.info(
        `Archipelago: Fetching package for '${game}' (checksum: '${checksum}')`
      );

      const [response] = await session.socket.send(request).wait("dataPackage");

      if (response.data.games[game].checksum !== checksum) {
        logger.error(
          `Archipelago: Checksum mismatch for game '${game}'! The server returned unexpected checksum '${response.data.games[game].checksum}`
        );
        continue;
      }

      data.games[game] = response.data.games[game];
    }

    if (update) {
      this.storePackage(data);
    }

    return data;
  }

  public storePackage = (dataPackage: DataPackage): void => {
    Object.entries(dataPackage.games).forEach(([game, data]) => {
      const { checksum, ...gameData } = data;

      logger.info(
        `Archipelago: Storing data package for game '${game}' (checksum: '${checksum}')`
      );

      // Create base game package locally if none exists
      if (!this.#packages.get(game)) {
        this.#packages.set(game, new Map());
      }

      this.#packages
        .get(game)
        .set(checksum, new StoredGamePackage(checksum, data));

      this.#db.push(`/${game}/${checksum}`, gameData);
    });
  };

  public getPackage = (
    game: string,
    checksum: string
  ): StoredGamePackage | null =>
    this.#packages.get(game)?.get(checksum) ?? null;

  public getItemName(
    game: string,
    checksum: string,
    id: string | number,
    fallback: boolean = true
  ): string | undefined {
    const fallbackName = `Item #${id}`;

    if (typeof id === "string") {
      id = parseInt(id);
    }

    const gamePackage = this.getPackage(game, checksum);
    if (!gamePackage) {
      return fallback ? fallbackName : undefined;
    }

    const name = gamePackage.reverseItemTable[id];
    return name ?? (fallback ? fallbackName : undefined);
  }

  public searchItemName(
    game: string,
    checksum: string,
    itemName: string,
    limit?: number
  ): Array<string> {
    return [];
  }

  public getLocationName(
    game: string,
    checksum: string,
    id: string | number,
    fallback: boolean = true
  ): string | undefined {
    const fallbackName = `Location #${id}`;

    if (typeof id === "string") {
      id = parseInt(id);
    }

    const gamePackage = this.getPackage(game, checksum);
    if (!gamePackage) {
      return fallback ? fallbackName : undefined;
    }

    const name = gamePackage.reverseLocationTable[id];
    return name ?? (fallback ? fallbackName : undefined);
  }
}
