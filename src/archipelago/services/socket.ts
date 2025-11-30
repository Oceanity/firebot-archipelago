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
  disconnected: [];
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

  public constructor(session: APSession) {
    super();

    this.#session = session;
  }

  public get connected(): boolean {
    return this.#connected;
  }

  //#region Public Methods

  public async connect(
    url: URL,
    swapProtocols: boolean = false
  ): Promise<{ url: URL; packet: RoomInfoPacket }> {
    if (swapProtocols) {
      url.protocol = url.protocol === "wss:" ? "ws:" : "wss:";
    }

    this.disconnect();

    try {
      const response = await new Promise<{ url: URL; packet: RoomInfoPacket }>(
        (resolve, reject) => {
          const handleConnectionError = (error: Error): void => {
            reject(
              `WebSocket server connection error: ${JSON.stringify(error)}`
            );
          };

          this.#socket = new WebSocket(url);
          this.#socket
            .on("message", this.#onMessage.bind(this))
            .on("close", handleConnectionError.bind(this))
            .on("error", handleConnectionError.bind(this))
            .on("open", () => {
              this.wait("roomInfo")
                .then(([packet]: RoomInfoPacket[]) => {
                  logger.info(`Connected to Archipelago WebSocket at ${url}`);

                  this.#connected = true;

                  if (this.#socket) {
                    this.#socket
                      .off("close", handleConnectionError.bind(this))
                      .off("error", handleConnectionError.bind(this));

                    this.#socket
                      .on("close", () => {
                        this.disconnect();
                      })
                      .on("error", (error) => {
                        logger.error(
                          "Error in Archipelago WebSocket connection",
                          error
                        );
                        this.disconnect();
                      });

                    resolve({ url, packet });
                  }
                })
                .catch((error) => {
                  this.disconnect();
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
      if (!swapProtocols) {
        return await this.connect(url, true);
      }

      this.disconnect();
      throw error;
    }
  }

  public disconnect(): void {
    if (!this.connected) {
      return;
    }

    logger.warn(
      `Archipelago: Closing WebSocket server connection for session '${
        this.#session.name
      }`
    );

    this.#connected = false;
    this.#socket?.close();
    this.#socket = null;
    this.emit("disconnected");
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
            }

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

    //#endregion
  };
}
