import firebot from "@crowbartools/firebot-types";
import { Client, ConnectionOptions, DataPackage } from "archipelago.js";
import { v4 as uuid } from "uuid";
import {
  ARCHIPELAGO_PLUGIN_CLIENT_TAGS,
  ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
  ARCHIPELAGO_PLUGIN_ID,
} from "../constants";
import { FirebotEvents } from "../enums";
import {
  hookArchipelagoEvents,
  unhookArchipelagoEvents,
} from "../event-handler";
import { ServiceResponse, SessionConnection, SessionStatus } from "../types";
import { MessageService } from "./message-service";

export class StateSession {
  readonly #client: Client;
  #id: string;
  #url: string | URL;
  #name: string;
  #password?: string;
  #messages: MessageService;
  #status: SessionStatus;
  #isLoadedFromFile: boolean;

  constructor(url: string, name: string, password?: string, id?: string) {
    this.#client = new Client();
    this.#id = id ?? uuid();
    this.#url = url;
    this.#name = name;
    this.#password = password;
    this.#messages = new MessageService(this);
    this.#status = SessionStatus.Uninitialized;
    this.#isLoadedFromFile = id !== undefined;
  }

  //#region Public Getters
  get id(): string {
    return this.#id;
  }

  get url(): URL {
    return typeof this.#url === "string" ? new URL(this.#url) : this.#url;
  }

  get name(): string {
    return this.#name;
  }

  get password(): string | undefined {
    return this.#password;
  }

  get messages(): MessageService {
    return this.#messages;
  }

  get client() {
    return this.#client;
  }

  get status() {
    return this.#status;
  }

  get handle() {
    return `${this.name}@${this.url.protocol}//${this.url.hostname}:${this.url.port}`;
  }

  get connection(): SessionConnection {
    return {
      id: this.id,
      url: `${this.url}`,
      name: this.name,
      ...(this.password !== undefined ? { password: this.password } : {}),
      handle: this.handle,
      status: this.status,
    };
  }
  //#endregion

  async init() {
    this.#status = SessionStatus.Initialized;
  }

  async connect(): Promise<ServiceResponse<StateSession>> {
    this.#status = SessionStatus.Connecting;

    firebot.logger.info(
      `Connecting to Archipelago at '${this.#url}' as '${this.#name}'...`,
    );

    try {
      hookArchipelagoEvents(this.id, this.#client);

      const cachedData = await firebot.storage.readTextFile(
        ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
      );
      if (cachedData) {
        const json = JSON.parse(cachedData) as DataPackage;

        this.#client.package.importPackage(json);
      }

      const settings: ConnectionOptions = {
        ...(this.password !== undefined ? { password: this.password } : {}),
        tags: ARCHIPELAGO_PLUGIN_CLIENT_TAGS,
      };

      const response = await this.#client.login(
        this.#url,
        this.#name,
        undefined,
        settings,
      );

      firebot.logger.info(JSON.stringify(response));

      // Saturate connection with better information
      this.#url = new URL(this.#client.socket.url);

      await firebot.storage.writeFile(
        ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
        JSON.stringify(this.#client.package.exportPackage()),
      );

      this.#status = SessionStatus.Connected;

      return { success: true, data: this };
    } catch (error) {
      firebot.logger.error(
        `Could not connect to Archipelago Server at '${this.url}' as '${this.name}', password: '${this.password}'`,
        error,
      );

      this.#status = SessionStatus.CouldNotConnect;

      // If session was loaded from a file, return with status CouldNotConnect
      if (this.#isLoadedFromFile) {
        return {
          success: true,
          data: this,
        };
      }

      return {
        success: false,
        errors: [
          (error as Error).message ??
            `Could not connect to '${this.url}' as '${this.name}'.`,
        ],
      };
    }
  }

  async disconnect(): Promise<boolean> {
    if (!this.#client) {
      return true;
    }

    firebot.logger.info(
      `Disconnecting from AP Session with Id '${this.id}'...`,
    );

    try {
      // TODO: Deconstruct listeners
      await unhookArchipelagoEvents(this.id, this.#client);

      this.#client.socket.disconnect();
      this.#status = SessionStatus.Disconnected;

      // If Firebot is closing these will throw as the global firebot is deconstructed
      firebot?.frontendCommunicator?.fireEventAsync(
        "oceanity:archipelago:session-closed",
        this.id,
      );

      firebot?.events?.trigger(
        ARCHIPELAGO_PLUGIN_ID,
        FirebotEvents.Disconnected,
        {
          apSessionId: this.id,
        },
      );

      return true;
    } catch (error) {
      firebot.logger.error(
        `Error disconnecting AP Session with Id '${this.id}'`,
        error,
      );
    }

    return false;
  }
}
