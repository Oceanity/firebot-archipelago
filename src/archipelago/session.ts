import { logger, moment } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { v4 as uuid } from "uuid";
import { ARCHIPELAGO_DEFAULT_RECONNECT_SECONDS } from "../constants";
import { ClientCommand, ItemHandlingFlag, Tag } from "../enums";
import {
  BouncePacket,
  ConnectionRefusedPacket,
  ConnectPacket,
  ReceivedItemsPacket,
  RoomUpdatePacket,
} from "../interfaces";
import { NetworkItem } from "../types";
import { APClient } from "./client";
import { FirebotRemoteService } from "./services/firebot-remote";
import { MessageService } from "./services/message";
import { StoredGamePackage } from "./services/package";
import { PlayerService } from "./services/players";
import { SocketService } from "./services/socket";

type APSessionEvents = {
  connected: () => void;
  closed: () => void;
  hintsUpdated: (data: {
    hintPoints: number;
    hintCost: number;
    hints: number;
  }) => void;
  receivedNewItems: (data: {
    isInitialInventory: boolean;
    items: Array<NetworkItem>;
  }) => void;
};

export class APSession extends TypedEmitter<APSessionEvents> {
  readonly #client: APClient;
  readonly #games: Set<string> = new Set();
  readonly #checksums: Map<string, string> = new Map();
  readonly #checkedLocations: Set<number> = new Set();
  readonly #missingLocations: Set<number> = new Set();
  readonly #receivedItems: Array<NetworkItem> = new Array();

  #url: URL;
  #slot: string;
  #password: string;

  #ready: boolean = false;
  #hintPoints: number = 0;
  #hintCost: number = 0;
  #tags: Array<string> = [];
  #itemHandling: ItemHandlingFlag;

  public readonly id: string;
  public readonly wasSaved: boolean;
  public readonly socket = new SocketService(this);
  public readonly messages = new MessageService(this);
  public readonly players = new PlayerService(this);
  public readonly firebotRemote = new FirebotRemoteService(this);

  constructor(
    client: APClient,
    url: string | URL,
    slot: string,
    password?: string,
    id?: string
  ) {
    super();

    this.wasSaved = !!id;

    logger.info(`Was Saved: ${this.wasSaved}`);

    this.id = id || uuid();
    this.#client = client;

    this.#slot = slot;
    this.#password = password ?? "";

    this.socket.init(url);

    this.socket
      .on("sentPackets", (packets) => {
        packets.forEach((packet) => {
          if (packet.cmd === ClientCommand.ConnectUpdate) {
            this.#itemHandling = packet.items_handling;
            this.#tags = packet.tags;
          }
        });
      })
      .on("receivedItems", async (packet: ReceivedItemsPacket) => {
        const newItems = packet.items.filter(
          (incomingItem) =>
            !this.#receivedItems.some(
              (receivedItem) =>
                incomingItem.item === receivedItem.item &&
                incomingItem.player === receivedItem.player &&
                incomingItem.location === receivedItem.location
            )
        );

        if (!newItems.length) {
          return;
        }

        newItems.forEach((itemDetails) =>
          this.#receivedItems.push(itemDetails)
        );

        this.emit("receivedNewItems", {
          items: newItems,
          isInitialInventory: !this.#ready,
        });
      })
      .on("locationInfo", (packet) => {
        logger.info(`Location Info`);
        logger.info(JSON.stringify(packet));
      })
      .on("roomUpdate", this.#onRoomUpdate)
      .on("disconnected", this.#onDisconnected);
  }

  //#region Getters

  get ready(): boolean {
    return this.#ready;
  }

  get totalLocations(): number {
    return this.#checkedLocations.size + this.#missingLocations.size;
  }

  get hintCostPercent(): number {
    return this.#hintCost;
  }

  get hintCost(): number {
    return Math.floor((this.totalLocations * this.#hintCost) / 100);
  }

  get hintPoints(): number {
    return this.#hintPoints;
  }

  get hintPointProgress(): number {
    return this.hintPoints % this.hintCost;
  }

  get hints(): number {
    return Math.floor(this.hintPoints / this.hintCost);
  }

  get itemTable(): Array<[item: string, count: number]> {
    const items = this.getPackage(this.players.self.game).itemTable;
    return Object.entries(items).map(
      ([name, id]) =>
        [
          name,
          this.#receivedItems.filter((item) => item.item === id).length,
        ] as [string, number]
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

  get tags(): Array<string> {
    return this.#tags;
  }

  public toString = (): string => `${this.#slot}@${this.socket}`;

  //#endregion

  //#region Public Methods

  public async login(reconnectOnError: boolean = false): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(
          `Archipelago: Logging in to session at '${this.socket}' as '${
            this.#slot
          }'`
        );

        const response = await this.socket.connect(false, reconnectOnError);

        const { url, packet: roomInfo } = response;

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
          password: this.#password,
          game: "",
          name: this.#slot,
          uuid: this.id,
          version: roomInfo.version,
          items_handling: ItemHandlingFlag.All,
          tags: ["Firebot", Tag.TextOnly, Tag.DeathLink],
          slot_data: true,
        };

        const refusedListener = (packet: ConnectionRefusedPacket) => {
          logger.error(`Archipelago: Connection refused`, packet.errors);
          reject(
            `Connection refused by Archipelago Server: ${packet.errors.join(
              ", "
            )}`
          );
        };

        this.socket
          .on("connectionRefused", refusedListener)
          .send(connectPacket)
          .wait("connected")
          .then(([packet]) => {
            this.socket.off("connectionRefused", refusedListener);

            // Store checked/unchecked locations for cross-referencing
            packet.checked_locations.forEach((location) =>
              this.#checkedLocations.add(location)
            );

            packet.missing_locations.forEach((location) =>
              this.#missingLocations.add(location)
            );

            this.#hintPoints = packet.hint_points;
            this.#ready = true; // To let events know the session was successfully started

            logger.info(`Logged into session as ${this.#slot}`);

            resolve(true);
          })
          .catch((error) => {
            logger.info(
              JSON.stringify(`Login error catch: ${JSON.stringify(error)}`)
            );
            reject(error.message);
          });
      } catch (error) {
        logger.error(
          `Failed to connect to Archipelago Session at '${this.socket}'`,
          error
        );
        reject(
          `Failed to login to Archipelago Session at '${this.socket}' as '${
            this.#slot
          }', ${error}`
        );
      }
    });
  }

  public close = async () => {
    this.players.removeAllListeners();
    this.messages.removeAllListeners();
    this.socket.removeAllListeners();
    await this.socket.disconnect();

    this.emit("closed");

    this.removeAllListeners();
  };

  public triggerDeathLink = async (cause: string) => {
    if (this.#tags.includes(Tag.DeathLink)) {
      logger.warn(
        `Archipelago: Triggering DeathLink on session '${this}' that does not have DeathLink enabled.`
      );
    }

    const deathLinkPacket: BouncePacket = {
      cmd: ClientCommand.Bounce,
      tags: [Tag.DeathLink],
      data: {
        time: moment.utc().valueOf(),
        source: this.#slot,
        cause,
      },
    };

    await this.socket.send(deathLinkPacket);
  };

  public getHintData = () => ({
    hints: this.hints,
    hintPoints: this.hintPoints,
    hintPointProgress: this.hintPointProgress,
    hintCost: this.hintCost,
  });

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

  //#region Handlers

  #onRoomUpdate = (packet: RoomUpdatePacket) => {
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
      this.emit("hintsUpdated", this.getHintData());
    }
  };

  #onDisconnected = async (
    reconnect: boolean,
    timeout: number = ARCHIPELAGO_DEFAULT_RECONNECT_SECONDS
  ) => {
    if (!reconnect) {
      await this.close();
      return;
    }

    this.messages.sendLog(
      `Disconnected from the Archipelago server, reconnecting in ${timeout} seconds...`,
      "warning"
    );

    setTimeout(async () => {
      try {
        await this.login(true);
      } catch (error) {
        const nextTimeout = Math.min(
          timeout + ARCHIPELAGO_DEFAULT_RECONNECT_SECONDS,
          60
        );
        await this.#onDisconnected(reconnect, nextTimeout);
      }
    }, timeout * 1000);
  };

  //#endregion

  //#region Private Helpers

  #getChecksum = (game: string) => {
    const checksum = this.#checksums.get(game);

    if (!checksum) {
      throw new Error(
        `Archipelago: Could not get checksum for game '${game}' in session '${this}'`
      );
    }

    return checksum;
  };

  //#endregion
}
