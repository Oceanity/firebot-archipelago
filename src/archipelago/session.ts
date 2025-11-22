import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { v4 as uuid } from "uuid";
import { ClientCommand, ItemHandlingFlag } from "../enums";
import {
  ConnectionRefusedPacket,
  ConnectPacket,
  ReceivedItemsPacket,
  RoomUpdatePacket,
} from "../interfaces";
import { ServiceResponse } from "../types";
import { APClient } from "./client";
import { FirebotRemoteService } from "./services/firebot-remote";
import { MessageService } from "./services/message";
import { StoredGamePackage } from "./services/package";
import { PlayerService } from "./services/players";
import { SocketService } from "./services/socket";

type APSessionEvents = {
  connected: () => void;
  disconnected: (sessionName: string) => void;
};

export class APSession extends TypedEmitter<APSessionEvents> {
  readonly #client: APClient;
  readonly #id: string;
  readonly #games: Set<string> = new Set();
  readonly #checksums: Map<string, string> = new Map();
  readonly #checkedLocations: Set<number> = new Set();
  readonly #missingLocations: Set<number> = new Set();
  readonly #receivedItems: Array<number> = new Array();

  #startingUp: boolean = true;
  #hintPoints: number = 0;
  #hintCost: number = 0;
  #url: URL;

  public readonly socket = new SocketService();
  public readonly messages = new MessageService(this);
  public readonly players = new PlayerService(this);
  public readonly firebotRemote = new FirebotRemoteService(this);

  constructor(client: APClient) {
    super();

    this.#client = client;
    this.#id = uuid();

    this.socket
      .on("sentPackets", (packets) => {
        for (const packet of packets) {
          if (packet.cmd === ClientCommand.ConnectUpdate) {
            logger.info("Updated Connection Info");
          }
        }
      })
      .on("receivedItems", (packet: ReceivedItemsPacket) => {
        packet.items.forEach((itemDetails) => {
          logger.info(
            `Archipelago: Adding received item '${itemDetails.item}'`
          );
          this.#receivedItems.push(itemDetails.item);
        });
      })
      .on("locationInfo", (packet) => {
        logger.info(`Location Info`);
        logger.info(JSON.stringify(packet));
        packet.locations.forEach((item) => {});
      })
      .on("roomUpdate", (packet: RoomUpdatePacket) => {
        // Update Checked Locations
        packet.checked_locations
          ?.filter((location) => !this.#checkedLocations.has(location))
          .forEach((location) => {
            this.#checkedLocations.add(location);
            this.#missingLocations.delete(location);
          });

        // Update Hint Points
        if (!!packet.hint_points) {
          this.#hintPoints = packet.hint_points;
        }
      })
      .on("disconnected", () => {
        this.disconnect();
      });
  }

  //#region Getters

  get id(): string {
    return this.#id;
  }

  get startingUp(): boolean {
    return this.#startingUp;
  }

  get url(): URL {
    return this.#url;
  }

  get name(): string {
    return `${this.players.self.alias ?? "UnknownSlot"}@${
      this.#url.hostname ?? "UnknownHostname"
    }:${this.#url.port ?? "UnknownPort"}`;
  }

  get hintCost(): number {
    return this.#hintCost;
  }

  get hintPoints(): number {
    return this.#hintPoints;
  }

  get itemTable(): Array<[item: string, count: number]> {
    const items = this.getPackage(this.players.self.game).itemTable;
    return Object.entries(items).map(
      ([name, id]) =>
        [name, this.#receivedItems.filter((item) => item === id).length] as [
          string,
          number
        ]
    );
  }

  get locationTable(): Array<[location: string, checked: boolean]> {
    const locations = this.getPackage(this.players.self.game).locationTable;
    return Object.entries(locations)
      .filter(
        ([_name, id]) =>
          this.#missingLocations.has(id) || this.#checkedLocations.has(id)
      )
      .map(
        ([name, id]) =>
          [name, this.#checkedLocations.has(id)] as [string, boolean]
      );
  }

  get checkedLocations(): Array<[name: string, id: number]> {
    const locations = this.getPackage(this.players.self.game).locationTable;
    return Object.entries(locations).filter(([_name, id]) =>
      this.#checkedLocations.has(id)
    );
  }

  get missingLocations(): Array<[name: string, id: number]> {
    const locations = this.getPackage(this.players.self.game).locationTable;
    return Object.entries(locations).filter(([_name, id]) =>
      this.#missingLocations.has(id)
    );
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
        const { packet: roomInfo, url } = await this.socket.connect(hostname);
        this.#url = url;
        this.#hintCost = roomInfo.hint_cost;

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

            this.#hintPoints = packet.hint_points;

            this.#startingUp = false;

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

  public disconnect(): void {
    this.players.removeAllListeners();
    this.messages.removeAllListeners();
    this.socket.removeAllListeners();
    this.socket.disconnect();

    this.emit("disconnected", this.name);

    this.removeAllListeners();
  }

  public getHints = (hintPoints: number) =>
    Math.floor(hintPoints / this.#hintCost);

  //#endregion

  //#region PackageService

  /** To avoid multiple sessions loading the same game packages, we can forward requests for packages and names with the necessary session data */
  public getPackage(game: string): StoredGamePackage | null {
    try {
      const checksum = this.#getChecksum(game);
      return this.#client.packages.getPackage(game, checksum);
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
      return this.#client.packages.getItemName(game, checksum, id, fallback);
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
      return this.#client.packages.getLocationName(
        game,
        checksum,
        id,
        fallback
      );
    } catch (error) {
      logger.error(error);
      return "Unknown Location";
    }
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
}
