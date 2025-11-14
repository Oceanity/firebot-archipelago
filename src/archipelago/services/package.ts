import { logger } from "@oceanity/firebot-helpers/firebot";
import { ClientCommand } from "../../enums";
import { DataPackage, GamePackage } from "../../types";
import { GetDataPackagePacket } from "../interfaces/packets";
import { APSession } from "../session";

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
  readonly #packages: Map<string, StoredGamePackage> = new Map();

  constructor() {}

  public get checksums() {
    return new Set(this.#packages.keys());
  }

  public async fetchPackage(
    session: APSession,
    gameSums: Array<[string, string]>,
    update: boolean = true
  ): Promise<DataPackage> {
    const data: DataPackage = { games: {} };

    const existingChecksums = this.checksums;
    const filteredGameSums = gameSums.filter(([game, checksum]) => {
      if (existingChecksums.has(checksum)) {
        logger.info(
          `Archipelago: Skipping fetching package for '${game}' (checksum: '${checksum}') as it already exists.`
        );
        return false;
      }
      return true;
    });

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
      logger.info(
        `Archipelago: Storing data package for game '${game}' (checksum: '${data.checksum}')`
      );

      this.#packages.set(
        data.checksum,
        new StoredGamePackage(data.checksum, data)
      );
    });
  };

  public getPackage = (checksum: string): StoredGamePackage | null =>
    this.#packages.get(checksum) ?? null;

  public getItemName(
    checksum: string,
    id: string | number,
    fallback: boolean = true
  ): string | undefined {
    const fallbackName = `Item #${id}`;

    if (typeof id === "string") {
      id = parseInt(id);
    }

    const gamePackage = this.getPackage(checksum);
    if (!gamePackage) {
      return fallback ? fallbackName : undefined;
    }

    const name = gamePackage.reverseItemTable[id];
    return name ?? (fallback ? fallbackName : undefined);
  }

  public getLocationName(
    checksum: string,
    id: string | number,
    fallback: boolean = true
  ): string | undefined {
    const fallbackName = `Location #${id}`;

    if (typeof id === "string") {
      id = parseInt(id);
    }

    const gamePackage = this.getPackage(checksum);
    if (!gamePackage) {
      return fallback ? fallbackName : undefined;
    }

    const name = gamePackage.reverseLocationTable[id];
    return name ?? (fallback ? fallbackName : undefined);
  }
}
