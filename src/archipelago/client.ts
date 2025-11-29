import { JsonDb, logger } from "@oceanity/firebot-helpers/firebot";
import EventEmitter from "events";
import { JsonDB } from "node-json-db";
import { resolve } from "path";
import { connectionStringFromUrl, urlFromConnectionString } from "./helpers";
import { DataPackageService } from "./services/package";
import { APSession } from "./session";

type SavedSessionDetails = {
  [hostname: string]: Record<string, string>;
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

  public get sessionIdsAndNames(): Record<string, string> {
    const output: Record<string, string> = {};

    this.sessionIds.forEach((id) => {
      output[id] = this.sessions.get(id).name;
    });

    return output;
  }

  public get sessionIds(): Array<string> {
    return Array.from(this.sessions.keys());
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

        for (const [slot, password] of Object.entries(entries)) {
          try {
            const result = await this.connect(url, slot, password);

            if (connectionString !== connectionStringFromUrl(result.url)) {
              await this.#savedSessionDb.push(
                `/${connectionStringFromUrl(result.url)}/${slot}`,
                password
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
    password?: string
  ): Promise<APSession> {
    return new Promise(async (resolve, reject) => {
      logger.info(
        `Archipelago: Attempting to connect to session at '${url}' with slot '${slot}'...`
      );

      try {
        const session = new APSession(this, url, slot, password);

        if (this.#sessionAlreadyExists(session.name)) {
          throw new Error(`Session '${session.name}' already exists`);
        }

        await session.login();

        session.on("disconnected", async () => {
          this.sessions.delete(session.id);
          await this.#savedSessionDb.delete(
            `/${connectionStringFromUrl(session.url)}/${slot}`
          );
        });

        this.sessions.set(session.id, session);

        await this.#savedSessionDb.push(
          `/${connectionStringFromUrl(session.url)}/${slot}`,
          password ?? ""
        );

        logger.info(`Connected to session at ${session.url}!`);

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
      (session) => session.name.toLocaleLowerCase() === compareName
    );
    if (!!fullMatches.length) {
      return fullMatches.shift();
    }

    // Look for partial match
    const partialMatches = entries.filter((session) => {
      const [slot, host] = session.name.split("@");
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
      (session) => session.name === sessionName
    );
}
