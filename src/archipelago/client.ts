import { JsonDb, logger } from "@oceanity/firebot-helpers/firebot";
import EventEmitter from "events";
import { JsonDB } from "node-json-db";
import { resolve } from "path";
import { ServiceResponse } from "../types";
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

  public get sessionNames(): Array<string> {
    return Array.from(this.sessions.keys());
  }

  public async init() {
    if (this.#ready) {
      return;
    }

    const existingSessions =
      await this.#savedSessionDb.getObject<SavedSessionDetails>("/");

    if (existingSessions) {
      for (const [hostname, entries] of Object.entries(existingSessions)) {
        for (const [slot, password] of Object.entries(entries)) {
          try {
            const result = await this.connect(hostname, slot, password);
            if (!result.success) {
              throw new Error(result.errors.join(", "));
            }
          } catch (error) {
            // Saved address not connecting, so remove it
            logger.warn(
              `Archipelago: Couldn't connect to saved session at '${hostname}' as '${slot}', removing.`,
              error
            );
            await this.#savedSessionDb.delete(`/${hostname}/${slot}`);
          }
        }
      }
    }
  }

  public async connect(
    hostname: string,
    slot: string,
    password?: string
  ): Promise<ServiceResponse> {
    return new Promise(async (resolve, reject) => {
      if (Object.keys(this.sessions).includes(slot)) {
        logger.error(
          `Archipelago: Session with name '${slot}' already exists, skipping.`
        );
        return;
      }

      logger.info(
        `Archipelago: Connecting to session at '${hostname}' with slot '${slot}'...`
      );

      try {
        const session = new APSession(this);
        const response = await session.login(hostname, slot, password);

        if (!response.success) {
          throw response.errors;
        }

        session.on("disconnected", async () => {
          this.sessions.delete(session.name);
          await this.#savedSessionDb.delete(`/${hostname}/${slot}`);
        });

        this.sessions.set(session.name, session);

        await this.#savedSessionDb.push(`/${hostname}/${slot}`, password ?? "");

        resolve({ success: true, data: { name: session.name } });
      } catch (error) {
        logger.error(
          "Archipelago: Could not create Archipelago session",
          error
        );
        reject({ success: false, errors: [error] });
      }
    });
  }

  public searchSession(query?: string): APSession | null {
    // If no query specified, pull first if one exists
    if (!query) {
      return !!this.sessionNames.length
        ? this.sessions.get(this.sessionNames[0])
        : null;
    }

    const compareName = query.toLocaleLowerCase();

    // Look for exact match
    const fullMatches = this.sessionNames.filter(
      (name) => name.toLocaleLowerCase() === compareName
    );
    if (!!fullMatches.length) {
      return this.sessions.get(fullMatches.shift());
    }

    // Look for partial match
    const partialMatches = this.sessionNames.filter((name) => {
      const [slot, host] = name.split("@");
      return (
        slot.toLocaleLowerCase() === compareName ||
        host.toLocaleLowerCase() === compareName
      );
    });
    if (!!partialMatches.length) {
      return this.sessions.get(partialMatches.shift());
    }

    return null;
  }
}
