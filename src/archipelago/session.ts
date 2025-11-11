import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { v4 as uuid } from "uuid";
import { ClientCommand, ItemHandlingFlag } from "../enums";
import { ConnectPacket } from "../interfaces";
import { FirebotRemoteService } from "./services/firebotRemote";
import { MessageService } from "./services/message";
import { DataPackageService } from "./services/pacakge";
import { PlayerService } from "./services/players";
import { SocketService } from "./services/socket";

type APSessionEvents = {
  connect: () => void;
};

export class APSession extends TypedEmitter<APSessionEvents> {
  readonly #id: string;

  #authenticated: boolean = false;

  public readonly socket = new SocketService();
  public readonly messages = new MessageService(this);
  public readonly packages = new DataPackageService(this);
  public readonly players = new PlayerService(this);
  public readonly firebotRemote = new FirebotRemoteService(this);

  constructor() {
    super();

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

  //#endregion

  //#region Public Methods

  public async login(hostname: string, slot: string, password?: string) {
    try {
      logger.info(`Connecting to Archipelago Session at '${hostname}'`);
      const roomInfo = await this.socket.connect(hostname);

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

      this.socket
        .send(connectPacket)
        .wait("connected")
        .then(() => {
          this.#authenticated = true;
          this.emit("connect");
        });
    } catch (error) {
      logger.error(
        `Failed to connect to Archipelago Session at '${hostname}'`,
        error
      );
    }
  }

  //#endregion
}
