import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { v4 as uuid } from "uuid";
import { ClientCommand, ItemHandlingFlag } from "../enums";
import { ConnectionRefusedPacket, ConnectPacket } from "../interfaces";
import { ServiceResponse } from "../types";
import { APClient } from "./client";
import { FirebotRemoteService } from "./services/firebotRemote";
import { MessageService } from "./services/message";
import { StoredGamePackage } from "./services/package";
import { PlayerService } from "./services/players";
import { SocketService } from "./services/socket";

type APSessionEvents = {
  connected: () => void;
};

export class APSession extends TypedEmitter<APSessionEvents> {
  readonly #client: APClient;
  readonly #id: string;
  readonly #games: Set<string> = new Set();
  readonly #checksums: Map<string, string> = new Map();
  readonly #checkedLocations: Set<number> = new Set();
  readonly #missingLocations: Set<number> = new Set();

  #authenticated: boolean = false;
  #hostname: string;
  #slot: string;

  public readonly socket = new SocketService();
  public readonly messages = new MessageService(this);
  public readonly players = new PlayerService(this);
  public readonly firebotRemote = new FirebotRemoteService(this);

  constructor(client: APClient) {
    super();

    this.#client = client;
    this.#id = uuid();

    this.socket
      .on("disconnected", () => {
        this.#authenticated = false;
      })
      .on("sentPackets", (packets) => {
        for (const packet of packets) {
          if (packet.cmd === ClientCommand.ConnectUpdate) {
            logger.info("Updated Connection Info");
          }
        }
      });
  }

  //#region Getters

  get id(): string {
    return this.#id;
  }

  get authenticated(): boolean {
    return this.#authenticated;
  }

  get name(): string {
    return `${this.#slot ?? "Unknown Slot"}@${
      this.#hostname ?? "Unknown Hostname"
    }`;
  }

  get locationTable(): Array<[location: string, checked: boolean]> {
    const locations = this.getPackage(this.players.self.game).locationTable;
    const table = Object.entries(locations)
      .filter(
        ([_name, id]) =>
          this.#missingLocations.has(id) || this.#checkedLocations.has(id)
      )
      .map(
        ([name, id]) =>
          [name, this.#checkedLocations.has(id)] as [string, boolean]
      );

    logger.info(JSON.stringify(table));
    return table;
  }

  //#endregion

  //#region Public Methods

  public async login(
    hostname: string,
    slot: string,
    password?: string
  ): Promise<ServiceResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(
          `Archipelago: Logging in to session at '${hostname}' as '${slot}'`
        );
        const roomInfo = await this.socket.connect(hostname);

        // Store local game info and fetch more to package service
        for (const [game, checksum] of Object.entries(
          roomInfo.datapackage_checksums
        )) {
          this.#games.add(game);
          this.#checksums.set(game, checksum);
          await this.#client.packages.fetchPackage(
            this,
            [[game, checksum]],
            true
          );
        }

        const connectPacket: ConnectPacket = {
          cmd: ClientCommand.Connect,
          password: password,
          game: "",
          name: slot,
          uuid: this.#id,
          version: roomInfo.version,
          items_handling: ItemHandlingFlag.All,
          tags: ["Firebot", "TextOnly"],
          slot_data: true,
        };

        const refusedListener = (packet: ConnectionRefusedPacket) => {
          logger.error(`Archipelago: Connection refused`, packet.errors);
          throw packet.errors;
        };

        this.socket
          .on("connectionRefused", refusedListener)
          .send(connectPacket)
          .wait("connected")
          .then(([packet]) => {
            logger.info(JSON.stringify(packet));

            this.socket.off("connectionRefused", refusedListener);

            // Store checked/unchecked locations for cross-referencing
            packet.checked_locations.forEach((location) =>
              this.#checkedLocations.add(location)
            );
            packet.missing_locations.forEach((location) =>
              this.#missingLocations.add(location)
            );

            this.#slot = slot;
            this.#hostname = hostname;

            this.#authenticated = true;
            this.emit("connected");

            resolve({
              success: true,
            });
          })
          .catch((error) => {
            throw error;
          });
      } catch (error) {
        logger.error(
          `Failed to connect to Archipelago Session at '${hostname}'`,
          error
        );
        reject({
          success: false,
          errors: [error],
        });
      }
    });
  }

  //#endregion

  //#region Private helpers

  #getChecksum = (game: string) => {
    const checksum = this.#checksums.get(game);

    if (!checksum) {
      throw new Error(
        `Archipelago: Could not get checksum for game '${game}' in session '${this.name}'`
      );
    }

    return checksum;
  };

  //#endregion

  //#region PackageService

  /** To avoid multiple sessions loading the same game packages, we can forward requests for packages and names with the necessary session data */
  public getPackage(game: string): StoredGamePackage | null {
    try {
      const checksum = this.#getChecksum(game);

      logger.info(`Got checksum for game '${game}', '${checksum}'`);

      return this.#client.packages.getPackage(checksum);
    } catch (error) {
      logger.error(error);
      return null;
    }
  }

  public getItemName(
    game: string,
    id: number | string,
    fallback: boolean = true
  ): string {
    try {
      const checksum = this.#getChecksum(game);
      return this.#client.packages.getItemName(checksum, id, fallback);
    } catch (error) {
      logger.error(error);
      return "Unknown Item";
    }
  }

  public getLocationName(
    game: string,
    id: number | string,
    fallback: boolean = true
  ): string {
    try {
      const checksum = this.#getChecksum(game);
      return this.#client.packages.getLocationName(checksum, id, fallback);
    } catch (error) {
      logger.error(error);
      return "Unknown Location";
    }
  }

  //#endregion
}
