import firebot from "@crowbartools/firebot-types";
import { Client, ConnectionOptions, DataPackage, Hint } from "archipelago.js";
import { v4 as uuid } from "uuid";
import {
  ARCHIPELAGO_PLUGIN_CLIENT_TAGS,
  ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
  ARCHIPELAGO_PLUGIN_ID,
} from "../constants";
import {
  hookArchipelagoEvents,
  unhookArchipelagoEvents,
} from "../event-handler";
import { getClassificationString, searchTuples } from "../helpers";
import {
  FirebotEvents,
  hintStatuses,
  ServiceResponse,
  SessionConnection,
  SessionStatus,
  StoredHint,
} from "../types";
import { MessageService } from "./message-service";

export class ArchipelagoSession {
  readonly #client: Client;
  readonly #connectionOptions: ConnectionOptions;
  #id: string;
  #url: string | URL;
  #name: string;
  #password?: string;
  #messages: MessageService;
  #hints: { id: string; hint: Hint }[];
  #status: SessionStatus;
  #isLoadedFromFile: boolean;
  #isReady: boolean = false;

  constructor(url: string, name: string, password?: string, id?: string) {
    this.#client = new Client();
    this.#connectionOptions = {
      ...(this.password !== undefined ? { password: this.password } : {}),
      tags: ARCHIPELAGO_PLUGIN_CLIENT_TAGS,
    };
    this.#id = id ?? uuid();
    this.#url = url;
    this.#name = name;
    this.#password = password;
    this.#messages = new MessageService(this);
    this.#hints = [];
    this.#status = SessionStatus.Uninitialized;
    this.#isLoadedFromFile = id !== undefined;

    this.#client.socket.on("disconnected", this.#onDisconnected);
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

  get isReady() {
    return this.#isReady;
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

  async connect(): Promise<ServiceResponse<ArchipelagoSession>> {
    this.#updateStatus(SessionStatus.Connecting);

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

      const response = await this.#client.login(
        this.#url,
        this.#name,
        undefined,
        this.#connectionOptions,
      );

      firebot.logger.info("Got session info");
      firebot.logger.info(JSON.stringify(response));

      // Saturate connection with better information
      this.#url = new URL(this.#client.socket.url);

      await firebot.storage.writeFile(
        ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
        JSON.stringify(this.#client.package.exportPackage()),
      );

      this.#updateStatus(SessionStatus.Connected);

      firebot.frontendCommunicator.fireEventAsync(
        "oceanity:archipelago:session-opened",
        this.connection,
      );

      return { success: true, data: this };
    } catch (error) {
      const errorMessage = `Could not connect to '${this.#url}' as '${this.#name}'`;
      firebot.logger.error(errorMessage, error);

      this.#updateStatus(SessionStatus.CouldNotConnect);

      // If session was loaded from a file, return with status CouldNotConnect
      if (this.#isLoadedFromFile) {
        return {
          success: true,
          data: this,
        };
      }

      return {
        success: false,
        errors: [(error as Error).message ?? errorMessage],
      };
    }
  }

  async reconnect(): Promise<SessionStatus> {
    try {
      this.#updateStatus(SessionStatus.Connecting);

      await this.#client.login(
        this.#url,
        this.#name,
        undefined,
        this.#connectionOptions,
      );

      this.#updateStatus(SessionStatus.Connected);
    } catch (error) {
      this.#updateStatus(SessionStatus.CouldNotConnect);
    }

    return this.#status;
  }

  async disconnect(): Promise<boolean> {
    if (!this.#client) {
      return true;
    }

    firebot.logger.info(
      `Disconnecting from AP Session with Id '${this.#id}'...`,
    );

    try {
      await unhookArchipelagoEvents(this.#id, this.#client);

      this.#client.socket.disconnect();

      // If Firebot is closing these will throw as the global firebot is deconstructed
      firebot?.frontendCommunicator?.fireEventAsync(
        "oceanity:archipelago:session-closed",
        this.#id,
      );

      firebot?.events?.trigger(
        ARCHIPELAGO_PLUGIN_ID,
        FirebotEvents.Disconnected,
        {
          apSessionId: this.#id,
        },
      );

      return true;
    } catch (error) {
      firebot.logger.error(
        `Error disconnecting AP Session with Id '${this.#id}'`,
        error,
      );
    }

    return false;
  }

  getItemsAndFoundCount(search?: string): Array<[string, number]> {
    const itemTable =
      this.#client.package.findPackage(this.#client.game)?.itemTable ?? null;

    if (!itemTable) {
      return [];
    }

    const items = searchTuples(
      Object.entries(itemTable).sort(([a], [b]) => a.localeCompare(b)),
      search,
    );

    if (!items.length) {
      return [];
    }

    const foundItems = this.#client.items.received;
    return items.map(([item, id]) => {
      return [
        item,
        foundItems.filter((foundItem) => foundItem.id === id).length,
      ];
    });
  }

  getLocationsAndCheckedStatus(search?: string): Array<[string, boolean]> {
    const locationTable =
      this.#client.package.findPackage(this.#client.game)?.locationTable ??
      null;

    if (!locationTable) {
      return [];
    }

    const locations = searchTuples(
      Object.entries(locationTable).sort(([a], [b]) => a.localeCompare(b)),
      search,
    );

    if (!locations.length) {
      return [];
    }

    const checkedLocations = this.#client.room.checkedLocations;
    return locations.map(([location, id]) => [
      location,
      checkedLocations.includes(id),
    ]);
  }

  getPlayers() {
    this.#client.players.teams.forEach((players) => {
      firebot.logger.info(JSON.stringify(players));
      players.forEach((player) => {
        firebot.logger.info(JSON.stringify(player));
      });
    });
  }

  async getHints(): Promise<StoredHint[]> {
    const parsed: StoredHint[] = [];

    const hints = await this.#client.players.self.fetchHints();
    for (const hint of hints) {
      const existing = this.#hints.find(
        (stored) =>
          hint.item.sender === stored.hint.item.sender &&
          hint.item.locationId === stored.hint.item.locationId,
      );
      if (existing) {
        existing.hint = hint;
        continue;
      }

      const id = uuid();

      this.#hints.push({
        id,
        hint,
      });

      parsed.push({
        id,
        sender: hint.item.sender.alias,
        senderIsPlayer:
          hint.item.sender.slot === this.#client.players.self.slot,
        receiver: hint.item.receiver.alias,
        receiverIsPlayer:
          hint.item.receiver.slot === this.#client.players.self.slot,
        item: hint.item.name,
        location: hint.item.locationName,
        classification: getClassificationString(hint.item.flags),
        entrance: hint.entrance,
        status: hintStatuses[hint.status],
      });
    }

    return parsed;
  }

  async setHintStatus(
    hintId: string,
    status: keyof typeof hintStatuses,
  ): Promise<boolean> {
    const stored = this.#hints.find((storedHint) => storedHint.id === hintId);

    if (!stored) {
      firebot.logger.warn(`Could not fetch hint with Id ${hintId}`);
      return false;
    }

    stored.hint.updateStatus(status);

    return true;
  }

  setIsReady(ready: boolean) {
    this.#isReady = ready;
  }

  #updateStatus = (status: SessionStatus) => {
    this.#status = status;

    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:session-status-updated",
      {
        sessionId: this.#id,
        status: this.#status,
      },
    );
  };

  #onDisconnected = () => {
    this.#updateStatus(SessionStatus.Disconnected);
  };
}
