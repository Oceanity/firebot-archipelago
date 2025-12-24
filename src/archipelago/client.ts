import { JsonDb, logger } from "@oceanity/firebot-helpers/firebot";
import EventEmitter from "events";
import { JsonDB } from "node-json-db";
import { resolve } from "path";
import { urlFromConnectionString } from "./helpers";
import { DataPackageService } from "./services/package";
import { APSession } from "./session";

type SavedSessionDetails = {
  [hostname: string]: Record<
    string,
    string | { slot: string; password?: string }
  >;
};

export class APClient extends EventEmitter {
  readonly #filePath: string = resolve(__dirname, "./ap-sessions.json");
  readonly #savedSessionDb: JsonDB;

  #ready: boolean = false;

  public readonly packages: DataPackageService;
  public readonly sessions: Map<string, APSession>;

  constructor() {
    super();

    //@ts-expect-error ts(2351)
    this.#savedSessionDb = new JsonDb(this.#filePath, true, false);

    this.packages = new DataPackageService();
    this.sessions = new Map();
  }

  public get sessionIds(): Array<string> {
    return Array.from(this.sessions.keys());
  }

  public get sessionTable(): Record<string, string> {
    const output: Record<string, string> = {};

    this.sessionIds.forEach((id) => {
      output[id] = this.sessions.get(id).toString();
    });

    return output;
  }

  public async init() {
    if (this.#ready) {
      return;
    }

    const existingSessions =
      await this.#savedSessionDb.getObject<SavedSessionDetails>("/");
    if (existingSessions) {
      for (const [connectionString, entries] of Object.entries(
        existingSessions
      )) {
        const url = urlFromConnectionString(connectionString);

        for (const [id, data] of Object.entries(entries)) {
          // TODO: In future update, remove compatibility layer for old save format
          const [slot, password, sessionId] =
            typeof data === "string" // Old form where saved value is just password
              ? [id, data, undefined]
              : [data.slot, data.password, id];

          try {
            const result = await this.connect(
              url,
              slot,
              password,
              sessionId,
              true
            );

            if (
              connectionString !== result.socket.connectionString ||
              !sessionId
            ) {
              await this.#savedSessionDb.push(
                `/${result.socket.connectionString}/${result.id}`,
                {
                  slot,
                  password,
                }
              );
              await this.#savedSessionDb.delete(`/${connectionString}/${slot}`);
            }
          } catch (error) {
            logger.warn(
              `Archipelago: Error loading saved session '${slot}' at '${url}', removing from local DB`
            );
            await this.#savedSessionDb.delete(`/${connectionString}/${slot}`);
          }
        }
      }

      // Second pass to cleanup remaining sessions in case of empty connection objects
      const remainingSessions =
        await this.#savedSessionDb.getObject<SavedSessionDetails>("/");
      if (remainingSessions) {
        for (const [connectionString, entries] of Object.entries(
          remainingSessions
        )) {
          if (!Object.entries(entries).length) {
            await this.#savedSessionDb.delete(`/${connectionString}`);
          }
        }
      }
    }
  }

  public async connect(
    url: string | URL,
    slot: string,
    password?: string,
    id?: string,
    reconnectOnError?: boolean
  ): Promise<APSession> {
    return new Promise(async (resolve, reject) => {
      logger.info(
        `Archipelago: Attempting to connect to session at '${url}' with slot '${slot}'...`
      );

      try {
        const session = new APSession(this, url, slot, password, id);

        if (this.#sessionAlreadyExists(session.toString())) {
          throw new Error(`Session '${session}' already exists`);
        }

        this.sessions.set(session.id, session);

        await session.login(reconnectOnError);

        session.on("closed", async () => {
          this.sessions.delete(session.id);
          await this.#savedSessionDb.delete(
            `/${session.socket.connectionString}/${slot}`
          );
        });

        await this.#savedSessionDb.push(
          `/${session.socket.connectionString}/${slot}`,
          password ?? ""
        );

        logger.info(`Connected to session at '${session.socket}'!`);

        return resolve(session);
      } catch (error) {
        logger.error(
          "Archipelago: Could not create Archipelago session",
          error
        );
        reject(error.message ?? (error as string));
      }
    });
  }

  public findSession(query?: string): APSession | null {
    const entries = Array.from(this.sessions.values());

    if (!entries.length) {
      return null;
    }

    // If no query specified, pull first
    if (!query) {
      return entries[0];
    }

    const compareName = query.toLocaleLowerCase();

    // Look for exact match
    const fullMatches = entries.filter(
      (session) => session.toString().toLocaleLowerCase() === compareName
    );
    if (!!fullMatches.length) {
      return fullMatches.shift();
    }

    // Look for partial match
    const partialMatches = entries.filter((session) => {
      const [slot, host] = session.toString().split("@");
      return (
        slot.toLocaleLowerCase() === compareName ||
        host.toLocaleLowerCase() === compareName
      );
    });
    if (!!partialMatches.length) {
      return partialMatches.shift();
    }

    return null;
  }

  #sessionAlreadyExists = (sessionName: string): boolean =>
    Array.from(this.sessions.values()).some(
      (session) => session.toString() === sessionName
    );
}
