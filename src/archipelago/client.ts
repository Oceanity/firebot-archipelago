import { logger } from "@oceanity/firebot-helpers/firebot";
import EventEmitter from "events";
import { APSession } from "./session";

export class APClient extends EventEmitter {
  readonly sessions: Map<string, APSession>;

  constructor() {
    super();

    this.sessions = new Map();
  }

  public get slots(): Array<string> {
    return Array.from(this.sessions.keys());
  }

  public async connect(
    hostname: string,
    slot: string,
    password?: string
  ): Promise<void> {
    logger.info("testing");
    return new Promise(async (resolve, reject) => {
      if (Object.keys(this.sessions).includes(slot)) {
        logger.error(
          `Archipelago Session with name '${slot}' already exists, skipping.`
        );
        return;
      }

      logger.info(
        `Connecting to session at '${hostname}' with slot '${slot}'...`
      );

      try {
        const session = new APSession();
        this.sessions.set(slot, session);
        await session.login(hostname, slot, password);
        resolve();
      } catch (error) {
        logger.error("Could not create Archipelago Session", error);
        reject(error);
      }
    });
  }
}
