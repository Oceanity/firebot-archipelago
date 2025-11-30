import { logger, moment } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { v4 as uuid } from "uuid";
import { ClientCommand, ItemHandlingFlag, Tag } from "../enums";
import {
  BouncePacket,
  ConnectionRefusedPacket,
  ConnectPacket,
  ReceivedItemsPacket,
  RoomUpdatePacket,
} from "../interfaces";
import { APClient } from "./client";
import { FirebotRemoteService } from "./services/firebot-remote";
import { MessageService } from "./services/message";
import { StoredGamePackage } from "./services/package";
import { PlayerService } from "./services/players";
import { SocketService } from "./services/socket";

type APSessionEvents = {
  connected: () => void;
  disconnected: (sessionId: string) => void;
};

export class APSession extends TypedEmitter<APSessionEvents> {
  readonly #client: APClient;
  readonly #games: Set<string> = new Set();
  readonly #checksums: Map<string, string> = new Map();
  readonly #checkedLocations: Set<number> = new Set();
  readonly #missingLocations: Set<number> = new Set();
  readonly #receivedItems: Array<number> = new Array();

  #url: URL;
  #slot: string;
  #password: string;

  #startingUp: boolean = true;
  #hintPoints: number = 0;
  #hintCost: number = 0;
  #tags: Array<string> = [];
  #itemHandling: ItemHandlingFlag;

  public readonly id: string;
  public readonly socket = new SocketService(this);
  public readonly messages = new MessageService(this);
  public readonly players = new PlayerService(this);
  public readonly firebotRemote = new FirebotRemoteService(this);

  constructor(
    client: APClient,
    url: string | URL,
    slot: string,
    password?: string
  ) {
    super();

    this.id = uuid();
    this.#client = client;

    // Set up url and slot locally for checking if it's a duplicate session before connecting
    this.#url = typeof url === "string" ? this.#getUrlFromHostname(url) : url;
    this.#slot = slot;
    this.#password = password ?? "";

    // Ensure a port is included in case a URL is passed in without one
    if (!this.#url.port) {
      this.#url.port = "38281";
    }

    this.socket
      .on("sentPackets", (packets) => {
        packets.forEach((packet) => {
          if (packet.cmd === ClientCommand.ConnectUpdate) {
            this.#itemHandling = packet.items_handling;
            this.#tags = packet.tags;
          }
        });
      })
      .on("receivedItems", (packet: ReceivedItemsPacket) => {
        packet.items.forEach((itemDetails) =>
          this.#receivedItems.push(itemDetails.item)
        );
      })
      .on("locationInfo", (packet) => {
        logger.info(`Location Info`);
        logger.info(JSON.stringify(packet));
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

  get startingUp(): boolean {
    return this.#startingUp;
  }

  get url(): URL {
    return this.#url;
  }

  get name(): string {
    return `${this.#slot}@${this.#url.hostname}:${this.#url.port}`;
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

  get tags(): Array<string> {
    return this.#tags;
  }

  //#endregion

  //#region Public Methods

  public async login(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(
          `Archipelago: Logging in to session at '${this.#url}' as '${
            this.#slot
          }'`
        );
        const response = await this.socket.connect(this.#url);

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
            this.#startingUp = false;

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
          `Failed to connect to Archipelago Session at '${this.#url.hostname}'`,
          error
        );
        reject(
          `Failed to login to Archipelago Session at '${
            this.#url.hostname
          }' as '${this.#slot}', ${error}`
        );
      }
    });
  }

  public disconnect() {
    this.players.removeAllListeners();
    this.messages.removeAllListeners();
    this.socket.removeAllListeners();
    this.socket.disconnect();

    this.emit("disconnected", this.id);

    this.removeAllListeners();
  }

  public triggerDeathLink = async (cause: string) => {
    if (this.#tags.includes(Tag.DeathLink)) {
      logger.warn(
        `Archipelago: Triggering DeathLink on session '${this.name}' that does not have DeathLink enabled.`
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

  //#region Private Helpers

  #getUrlFromHostname = (hostname: string): URL => {
    logger.info(`Getting url from hostname '${hostname}'`);

    const pattern = /^(wss?:)\/\/[a-z0-9_.~\-:]+/i;

    const url = new URL(
      pattern.test(hostname) ? hostname : `wss://${hostname}`
    );

    if (!url) {
      throw new Error(`Could not parse '${hostname}' as a URL`);
    }

    return url;
  };

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
