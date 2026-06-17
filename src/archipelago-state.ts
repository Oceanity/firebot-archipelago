import firebot from "@crowbartools/firebot-types";
import { StateSession } from "./archipelago/state-session";
import { ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME } from "./constants";
import { ServiceResponse, SessionConnection, StoredSession } from "./types";

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
      status: session.status,
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

  async createSession(
    url: string,
    name: string,
    password?: string,
    id?: string,
  ): Promise<ServiceResponse<StateSession>> {
    const session = new StateSession(url, name, password, id);

    const response = await session.connect();
    if (!response.success) {
      // Pass up errors
      return response;
    }

    this.#sessions.push(session);

    await this.#saveSessionsToStorage();

    return { success: true, data: session };
  }

  async closeSession(
    sessionId: string,
    deleteFromStore: boolean = false,
  ): Promise<boolean> {
    const session = this.findSession(sessionId);
    if (!session) {
      firebot.logger.warn(
        `Tried to disconnect nonexistent AP Session with Id '${sessionId}'`,
      );
      return false;
    }

    const result = await session.disconnect();

    return true;
  }

  async closeAllSessions(): Promise<boolean> {
    return (
      await Promise.all(
        this.#sessions.map(async (session) => {
          if (!session.client || !session.client.authenticated) {
            return true;
          }
          return await this.closeSession(session.id);
        }),
      )
    ).reduce((prev: boolean = true, cur) => prev && cur);
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
          typeof session.id === "string" &&
          typeof session.url === "string" &&
          typeof session.name === "string" &&
          (!session.password || typeof session.password === "string"),
      );

      return (
        await Promise.all(
          valid.map(async (session) => {
            const response = await this.createSession(
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
