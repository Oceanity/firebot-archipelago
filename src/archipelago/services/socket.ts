import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import WebSocket from "ws";
import { ServerCommand } from "../../enums";
import { ClientPacket, ServerPacket } from "../../types";
import {
  BouncedPacket,
  ConnectedPacket,
  ConnectionRefusedPacket,
  DataPackagePacket,
  InvalidPacketPacket,
  LocationInfoPacket,
  PrintJSONPacket,
  ReceivedItemsPacket,
  RetrievedPacket,
  RoomInfoPacket,
  RoomUpdatePacket,
  SetReplyPacket,
} from "../interfaces/packets";

type Events = {
  sentPackets: [packets: Array<ClientPacket>];
  /** Archipelago passthrough */
  bounced: [packet: BouncedPacket];
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
  #socket: WebSocket | null = null;
  #connected: boolean = false;

  public constructor() {
    super();
  }

  public get connected(): boolean {
    return this.#connected;
  }

  //#region Public Methods

  public async connect(
    url: URL | string
  ): Promise<{ url: URL; packet: RoomInfoPacket }> {
    this.disconnect();

    if (typeof url === "string") {
      // Check if protocol was provided and URL is valid-ish, if not we'll add wss and fallback to ws if it fails.
      const pattern = /^([a-zA-Z]+:)\/\/[A-Za-z0-9_.~\-:]+/i;
      if (!pattern.test(url)) {
        try {
          // First try "wss".
          return await this.connect(new URL(`wss://${url}`));
        } catch {
          // Nope, try "ws".
          return await this.connect(new URL(`ws://${url}`));
        }
      }

      // Protocol provided, continue as is.
      url = new URL(url);
    }

    if (!url.port) {
      url.port = "38281";
    }

    if (!url.protocol.startsWith("ws")) {
      logger.warn(
        `URL protocol '${url.protocol}' is not a WebSocket protocol. Replacing with 'wss:'.`
      );
      url.protocol = "wss:";
    }

    try {
      return new Promise((resolve, reject) => {
        logger.info(`Using url: ${url}`);
        const handleConnectionError = (error?: Error): void => {
          this.disconnect();
          reject(
            error ??
              new Error("Failed to connect to Archipelago WebSocket server.")
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
                  this.#socket.off("close", handleConnectionError.bind(this));
                  this.#socket.off("error", handleConnectionError.bind(this));

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
                reject(error);
              });
          });
      });
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  public disconnect(): void {
    if (!this.connected) {
      return;
    }

    this.#connected = false;
    this.#socket?.close();
    this.#socket = null;
    this.emit("disconnected");
  }

  public send(...packets: ClientPacket[]): SocketService {
    if (!this.#socket) {
      throw new Error("Disconnected from Archipelago WebSocket server.");
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
