import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import WebSocket from "ws";
import { ServerCommand, Tag } from "../../enums";
import {
  ClientPacket,
  DeathLinkData,
  PrintJSONPacket,
  ServerPacket,
} from "../../types";
import {
  BouncedPacket,
  ConnectedPacket,
  ConnectionRefusedPacket,
  DataPackagePacket,
  InvalidPacketPacket,
  LocationInfoPacket,
  ReceivedItemsPacket,
  RetrievedPacket,
  RoomInfoPacket,
  RoomUpdatePacket,
  SetReplyPacket,
} from "../interfaces/packets";
import { APSession } from "../session";

type Events = {
  sentPackets: [packets: Array<ClientPacket>];
  /** Archipelago passthrough */
  bounced: [packet: BouncedPacket];
  deathLink: [data: DeathLinkData];
  connected: [packet: ConnectedPacket];
  connectionRefused: [packet: ConnectionRefusedPacket];
  disconnected: [reconnect: boolean];
  dataPackage: [packet: DataPackagePacket];
  invalidPacket: [packet: InvalidPacketPacket];
  locationInfo: [packet: LocationInfoPacket];
  printJson: [packet: PrintJSONPacket];
  receivedItems: [packet: ReceivedItemsPacket];
  retrieved: [packet: RetrievedPacket];
  roomInfo: [packet: RoomInfoPacket];
  roomUpdate: [packet: RoomUpdatePacket];
  setReply: [packet: SetReplyPacket];
};

type EventDef = {
  [Event in keyof Events]: (...args: Events[Event]) => void;
};

export class SocketService extends TypedEmitter<EventDef> {
  readonly #session: APSession;

  #socket: WebSocket | null = null;
  #connected: boolean = false;
  #url: URL;
  #urlVerified: boolean = false;

  public constructor(session: APSession) {
    super();

    this.#session = session;
  }

  public get connected(): boolean {
    return this.#connected;
  }

  public get url(): URL {
    return this.#url;
  }

  public get protocolName(): string {
    return this.url.protocol.slice(0, -1).toLocaleUpperCase();
  }

  public get connectionString(): string {
    return `${this.url.protocol}${this.url.hostname}:${this.url.port}`;
  }

  public toString = (): string => `${this.url.hostname}:${this.url.port}`;

  //#region Public Methods

  public init(hostname: string | URL) {
    if (typeof hostname === "string") {
      const pattern = /^(wss?:)\/\/[a-z0-9_.~\-:]+/i;

      const url = new URL(
        pattern.test(hostname) ? hostname : `wss://${hostname}`
      );

      if (!url) {
        throw new Error(`Could not parse '${hostname}' as a URL`);
      }

      this.#url = url;
    } else {
      this.#url = hostname;
    }

    // Ensure default Archipelago port if none was provided
    if (!this.#url.port) {
      this.#url.port = "38281";
    }
  }

  public async connect(
    swapProtocols: boolean = false,
    reconnectOnError: boolean = false
  ): Promise<{ url: URL; packet: RoomInfoPacket }> {
    if (!this.#url) {
      logger.error(
        "Archipelago: Session does not have a URL to connect to, disconnecting"
      );
      return;
    }

    if (swapProtocols) {
      this.#url.protocol = this.#url.protocol === "wss:" ? "ws:" : "wss:";
    }

    try {
      this.#session.messages.sendLog(
        `Attempting to connect to the Archipelago server at '${this}' using ${this.protocolName} protocol...`
      );

      const response = await new Promise<{ url: URL; packet: RoomInfoPacket }>(
        (resolve, reject) => {
          const handleConnectionError = (error: Error): void => {
            reject(
              `WebSocket server connection error: ${JSON.stringify(error)}`
            );
          };

          this.#socket = new WebSocket(this.#url);
          this.#socket
            .on("message", this.#onMessage.bind(this))
            .on("close", handleConnectionError.bind(this))
            .on("error", handleConnectionError.bind(this))
            .on("open", () => {
              if (!this.#urlVerified) {
                this.#urlVerified = true;
              }

              this.wait("roomInfo")
                .then(([packet]: RoomInfoPacket[]) => {
                  logger.info(
                    `Connected to Archipelago WebSocket server at '${this}'!`
                  );
                  this.#session.messages.sendLog(
                    `Connected to Archipelago WebSocket server at '${this}'!`
                  );

                  this.#connected = true;

                  if (this.#socket) {
                    this.#socket
                      .off("close", handleConnectionError.bind(this))
                      .off("error", handleConnectionError.bind(this));

                    this.#socket
                      .on("close", () => {
                        this.disconnect(true);
                      })
                      .on("error", (error) => {
                        logger.error(
                          "Error in Archipelago WebSocket connection",
                          error
                        );
                        this.disconnect(reconnectOnError);
                      });

                    resolve({ url: this.#url, packet });
                  }
                })
                .catch((error) => {
                  this.disconnect(reconnectOnError);
                  reject(
                    `Error connecting to WebSocket server: ${JSON.stringify(
                      error
                    )}`
                  );
                });
            });
        }
      );

      return response;
    } catch (error) {
      // If URL was already found to be good, don't try the other protocol
      if (!swapProtocols && !this.#urlVerified) {
        return await this.connect(true, reconnectOnError);
      }

      this.disconnect();
      throw error;
    }
  }

  public async disconnect(reconnect: boolean = false): Promise<void> {
    if (!this.connected) {
      return;
    }

    logger.warn(
      `Archipelago: Closing WebSocket server connection for session '${
        this.#session
      }`
    );

    this.#connected = false;
    this.#socket?.close();
    this.#socket = null;
    this.emit("disconnected", reconnect);
  }

  public send(...packets: ClientPacket[]): SocketService {
    if (!this.#socket) {
      throw new Error("Not connected to Archipelago WebSocket server.");
    }

    this.#socket.send(JSON.stringify(packets));
    this.emit("sentPackets", packets);
    return this;
  }

  public wait = <Event extends keyof Events>(
    event: Event
  ): Promise<Events[Event]> => {
    return new Promise((resolve) => {
      const listener = ((...args: Events[Event]) => {
        this.off(event, listener as any);
        resolve(args);
      }) as EventDef[Event];

      this.on(event, listener);
    });
  };

  //#endregion

  //#region Handlers

  #onMessage = (data: WebSocket.Data): void => {
    try {
      const packets = JSON.parse(data.toString()) as [...Array<ServerPacket>];

      for (const packet of packets) {
        switch (packet.cmd) {
          case ServerCommand.Bounced:
            this.emit("bounced", packet);

            // Extra emits for specialized Bounced packets
            if (
              packet.tags?.includes(Tag.DeathLink) &&
              !!packet.data &&
              ["source", "cause", "time"].every((prop) => prop in packet.data)
            ) {
              this.emit("deathLink", packet.data as DeathLinkData);
              return;
            }

            logger.info(`Bounced: ${JSON.stringify(packet)}`);

            break;
          case ServerCommand.Connected:
            this.emit("connected", packet);
            break;
          case ServerCommand.ConnectionRefused:
            this.emit("connectionRefused", packet);
            break;
          case ServerCommand.DataPackage:
            this.emit("dataPackage", packet);
            break;
          case ServerCommand.InvalidPacket:
            this.emit("invalidPacket", packet);
            break;
          case ServerCommand.LocationInfo:
            this.emit("locationInfo", packet);
            break;
          case ServerCommand.PrintJSON:
            this.emit("printJson", packet);
            break;
          case ServerCommand.ReceivedItems:
            this.emit("receivedItems", packet);
            break;
          case ServerCommand.Retrieved:
            this.emit("retrieved", packet);
            break;
          case ServerCommand.RoomInfo:
            this.emit("roomInfo", packet);
            break;
          case ServerCommand.RoomUpdate:
            logger.info(`Room Update: ${JSON.stringify(packet)}`);
            this.emit("roomUpdate", packet);
            break;
          case ServerCommand.SetReply:
            this.emit("setReply", packet);
            break;
        }
      }
    } catch (error) {
      logger.error("Error parsing Archipelago Message", error);
    }
  };

  //#endregion
}
