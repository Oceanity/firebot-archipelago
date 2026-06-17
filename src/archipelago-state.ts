import firebot from "@crowbartools/firebot-types";
import { Client, ConnectionOptions, DataPackage } from "archipelago.js";
import { v4 as uuid } from "uuid";
import {
  ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
  ARCHIPELAGO_PLUGIN_ID,
  ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
} from "./constants";
import { FirebotEvents } from "./enums";
import {
  hookArchipelagoEvents,
  unhookArchipelagoEvents,
} from "./event-handler";
import {
  ServiceResponse,
  SessionConnection,
  SessionConnectionAndStatus,
  SessionStatus,
  StateSession,
  StoredSession,
} from "./types";

export class ArchipelagoState {
  #sessions: Array<StateSession> = [];

  constructor() {}

  get sessionTable(): Record<string, string> {
    const output: Record<string, string> = {};
    this.#sessions.forEach((session) => {
      output[session.id] = session.handle;
    });
    return output;
  }

  get sessionConnections(): Array<SessionConnection> {
    return this.#sessions.map((session) => ({
      id: session.id,
      url: `${session.url}`,
      name: `${session.name}`,
      handle: session.handle,
      ...(!!session.password ? { password: session.password } : {}),
    }));
  }

  getFirstSession(): StateSession | null {
    return !!this.#sessions.length ? this.#sessions[0] : null;
  }

  findSession(sessionId: string): StateSession | null {
    const session = this.#sessions.find((session) => session.id === sessionId);
    return session ?? null;
  }

  removeSession(sessionId: string): boolean {
    const sessionIndex = this.#sessions.findIndex(
      (session) => session.id === sessionId,
    );

    if (sessionIndex === -1) {
      firebot.logger.warn(
        `Could not find session with Id '${sessionId}' to remove`,
      );
      return false;
    }

    this.#sessions.splice(sessionIndex, 1);
    return true;
  }

  getItemTable(sessionId: string): Readonly<Record<string, number>> {
    const fallback = Object.freeze({});
    const session = this.findSession(sessionId);
    if (!session) {
      return fallback;
    }
    return (
      session.client.package.findPackage(session.client.players.self.game)
        ?.itemTable ?? fallback
    );
  }

  async init(): Promise<void> {
    await this.#loadSessionsFromStorage();
  }

  async connect(
    url: string,
    name: string,
    password?: string,
    id?: string,
  ): Promise<ServiceResponse<SessionConnectionAndStatus>> {
    const client = new Client();

    firebot.logger.info(
      `Connecting to Archipelago at '${url}' as '${name}'...`,
    );

    const sessionId = id ?? uuid();
    const connection: SessionConnectionAndStatus = {
      id: sessionId,
      url: url,
      name: name,
      ...(password ? { password } : {}),
      handle: `${name}@${url}`,
      status: SessionStatus.Connecting,
    };

    try {
      hookArchipelagoEvents(sessionId, client);

      const cachedData = await firebot.storage.readTextFile(
        ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
      );
      if (cachedData) {
        const json = JSON.parse(cachedData) as DataPackage;

        client.package.importPackage(json);
      }

      const settings: ConnectionOptions = this.#getConnectionOptions(password);
      const response = await client.login(url, name, undefined, settings);

      firebot.logger.info(JSON.stringify(response));

      // Saturate connection with better information
      const parsedUrl = new URL(client.socket.url);
      connection.url = `${parsedUrl}`;
      connection.handle = `${client.players.self.name}@${parsedUrl.protocol}${parsedUrl.hostname}:${parsedUrl.port}`;
      connection.status = SessionStatus.Connected;

      const session: StateSession = {
        ...connection,
        url: parsedUrl,
        client,
        messages: [],
        chatHistory: [],
      };

      this.#sessions.push(session);

      await this.#saveSessionsToStorage();
      await firebot.storage.writeFile(
        ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
        JSON.stringify(client.package.exportPackage()),
      );

      return { success: true, data: connection };
    } catch (error) {
      firebot.logger.error(
        `Could not connect to Archipelago Server at '${url}' as '${name}', password: '${password}'`,
        error,
      );

      // If Id provided, we've got a saved session, return as could not connect
      if (id) {
        connection.status = SessionStatus.CouldNotConnect;

        return {
          success: true,
          data: connection,
        };
      }

      return {
        success: false,
        errors: [
          (error as Error).message ??
            `Could not connect to '${url}' as '${name}'.`,
        ],
      };
    }
  }

  async disconnect(
    sessionId: string,
    deleteFromStore: boolean = false,
  ): Promise<boolean> {
    firebot.logger.info(
      `Disconnecting from AP Session with Id '${sessionId}'...`,
    );

    const session = this.findSession(sessionId);
    if (!session) {
      firebot.logger.warn(
        `Tried to disconnect nonexistent AP Session with Id '${sessionId}'`,
      );
      return false;
    }

    try {
      // TODO: Deconstruct listeners
      await unhookArchipelagoEvents(session.id, session.client);

      session.client.socket.disconnect();
      session.status = SessionStatus.Disconnected;

      // If Firebot is closing these will throw as the global firebot is deconstructed
      firebot?.frontendCommunicator?.fireEventAsync(
        "oceanity:archipelago:session-closed",
        sessionId,
      );

      firebot?.events?.trigger(
        ARCHIPELAGO_PLUGIN_ID,
        FirebotEvents.Disconnected,
        {
          apSessionId: sessionId,
        },
      );

      if (deleteFromStore) {
        if (this.removeSession(sessionId)) {
          // Only save if remove succeeded to avoid unnecessary file operations
          await this.#saveSessionsToStorage();
        }
      }

      return true;
    } catch (error) {
      firebot.logger.error(
        `Error disconnecting AP Session with Id '${sessionId}'`,
        error,
      );
    }

    return false;
  }

  async close(): Promise<boolean> {
    return (
      await Promise.all(
        this.#sessions.map(async (session) => {
          if (!session.client || !session.client.authenticated) {
            return true;
          }
          return await this.disconnect(session.id);
        }),
      )
    ).reduce((prev: boolean = true, cur) => prev && cur);
  }

  #getConnectionOptions(password?: string): ConnectionOptions {
    return {
      ...(password ? { password } : {}),
      tags: ["Firebot", "DeathLink"],
    };
  }

  async #saveSessionsToStorage(): Promise<boolean> {
    try {
      const stored: Array<StoredSession> = this.#sessions.map((session) => ({
        id: session.id,
        url: `${session.url}`,
        name: session.name,
        ...(session.password !== undefined
          ? { password: session.password }
          : {}),
      }));

      await firebot.storage.writeFile(
        ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
        JSON.stringify(stored),
      );

      return true;
    } catch (error) {
      firebot.logger.error("Error saving sessions to local storage", error);
    }

    return false;
  }

  async #loadSessionsFromStorage(): Promise<Array<StateSession>> {
    try {
      const contents = await firebot.storage.readTextFile(
        ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
      );

      if (!contents) {
        return [];
      }

      const parsed = JSON.parse(contents);

      if (!Array.isArray(parsed)) {
        throw new Error(
          `${ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME} does not contain a valid array of sessions`,
        );
      }

      // Remove any malformed Sessions
      const valid: Array<StoredSession> = parsed.filter(
        (session) =>
          (typeof session.id === "string" &&
            typeof session.url === "string" &&
            typeof session.name === "string" &&
            !session.password) ||
          typeof session.password === "string",
      );

      return (
        await Promise.all(
          valid.map(async (session) => {
            const response = await this.connect(
              session.url,
              session.name,
              session.password,
              session.id,
            );

            if (!response.success) {
              firebot.logger.warn(response.errors.join(", "));
              return null;
            }

            return response.data;
          }),
        )
      ).filter((s): s is StateSession => s !== null);
    } catch (error) {
      firebot.logger.error("Error loading sessions from local storage", error);
      const fallback: Array<StateSession> = [];
      firebot.storage.writeFile(
        ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
        JSON.stringify(fallback),
      );
      return fallback;
    }
  }
}
