import firebot from "@crowbartools/firebot-types";
import {
  Client,
  ConnectionOptions,
  DataPackage,
  RoomStateManager,
} from "archipelago.js";
import { v4 as uuid } from "uuid";
import {
  ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
  ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
} from "./constants";
import { hookArchipelagoFirebotEvents } from "./event-handler";
import { state } from "./main";
import {
  HintData,
  RetrievedSession,
  ServiceResponse,
  SessionStatus,
  StateSession,
  StoredSession,
} from "./types";

export async function connect(
  url: string,
  name: string,
  password?: string,
  id?: string,
): Promise<ServiceResponse<RetrievedSession>> {
  const client = new Client();

  firebot.logger.info(`Connecting to Archipelago at '${url}' as '${name}'...`);

  try {
    const sessionId = id ?? uuid();

    hookArchipelagoFirebotEvents(sessionId, client);

    const cachedData = await firebot.storage.readTextFile(
      ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
    );
    if (cachedData) {
      const json = JSON.parse(cachedData) as DataPackage;

      client.package.importPackage(json);
    }

    const settings: ConnectionOptions = getFirebotConnectionOptions(password);
    const response = await client.login(url, name, undefined, settings);

    firebot.logger.info(JSON.stringify(response));

    const sessionUrl = new URL(client.socket.url);
    const session: StateSession = {
      client,
      name: client.players.self.name,
      url: sessionUrl,
      password,
      handle: `${client.players.self.name}@${sessionUrl.protocol}${sessionUrl.hostname}:${sessionUrl.port}`,
      status: SessionStatus.Connected,
    };

    state.sessions[sessionId] = session;

    await saveSessionsToStorage();

    await firebot.storage.writeFile(
      ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME,
      JSON.stringify(client.package.exportPackage()),
    );

    return { success: true, data: { id: sessionId, ...session } };
  } catch (error) {
    firebot.logger.error(
      `Could not connect to Archipelago Server at '${url}' as '${name}', password: '${password}'`,
      error,
    );

    // If Id provided, we've got a saved session, return as disconnected
    if (id) {
      const fallbackUrl = new URL(url);
      return {
        success: true,
        data: {
          client,
          id,
          url: fallbackUrl,
          name,
          password,
          handle: `${name}@${fallbackUrl.protocol}${fallbackUrl.hostname}:${fallbackUrl.port}`,
          status: SessionStatus.CouldNotConnect,
        },
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

export async function disconnect(
  sessionId: string,
  deleteFromStore: boolean = false,
): Promise<boolean> {
  firebot.logger.info(
    `Disconnecting from AP Session with Id '${sessionId}'...`,
  );

  const session = state.sessions[sessionId];
  if (!session) {
    firebot.logger.warn(
      `Tried to disconnect nonexistent AP Session with Id '${sessionId}'`,
    );
    return false;
  }

  try {
    // TODO: Deconstruct listeners

    session.client.socket.disconnect();
    session.status = SessionStatus.Disconnected;

    firebot.frontendCommunicator.fireEventAsync(
      "oceanity:archipelago:sessionClosed",
      sessionId,
    );

    if (deleteFromStore) {
      delete state.sessions[sessionId];
      await saveSessionsToStorage();
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

export async function saveSessionsToStorage(): Promise<boolean> {
  try {
    const stored: Record<string, StoredSession> = {};

    Object.entries(state.sessions).forEach(([id, session]) => {
      stored[id] = {
        name: session.name,
        url: session.url.toString(),
      };

      if (session.password) {
        stored[id].password = session.password;
      }
    });

    await firebot.storage.writeFile(
      ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
      JSON.stringify(stored),
    );

    return true;
  } catch (error) {
    firebot.logger.error("Error saving AP Sessions to local storage", error);
  }

  return false;
}

export async function loadSessionsFromStorage(): Promise<
  Record<string, StateSession>
> {
  const sessions: Record<string, StateSession> = {};

  try {
    const contents = await firebot.storage.readTextFile(
      ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME,
    );

    if (!contents) {
      return sessions;
    }

    const json = JSON.parse(contents) as Record<string, StoredSession>;
    await Promise.all(
      Object.entries(json).map(
        ([id, data]) =>
          new Promise(async (resolve) => {
            const response = await connect(
              data.url,
              data.name,
              data.password,
              id,
            );

            if (!response.success) {
              firebot.logger.warn(response.errors.join(", "));
              return resolve(false);
            }

            sessions[id] = response.data;
            resolve(true);
          }),
      ),
    );
  } catch (error) {
    firebot.logger.error("Error loading AP Session from local storage", error);
  }

  return sessions;
}

export function getHandleFromClient(client: Client) {
  const url = new URL(client.socket.url);

  return `${client.players.self.name}@${url.protocol}${url.hostname}:${url.port}`;
}

export async function getSessionNames(): Promise<Record<string, string>> {
  const response: Record<string, string> = {};

  Object.entries(state.sessions).forEach(([id, data]) => {
    response[id] = data.handle;
  });

  return response;
}

export function getHintData(room: RoomStateManager): HintData {
  return {
    hintCost: room.hintCost,
    hintPoints: room.hintPoints,
    hintPointProgress: room.hintPoints % room.hintCost,
    hints: Math.floor(room.hintPoints / room.hintCost),
  };
}

function getFirebotConnectionOptions(password?: string): ConnectionOptions {
  return {
    ...(password ? { password } : {}),
    tags: ["Firebot", "DeathLink"],
  };
}
