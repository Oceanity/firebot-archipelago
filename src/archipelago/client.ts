import { logger } from "@oceanity/firebot-helpers/firebot";
import EventEmitter from "events";
import { ServiceResponse } from "../types";
import { DataPackageService } from "./services/package";
import { APSession } from "./session";

export class APClient extends EventEmitter {
  public readonly packages: DataPackageService;
  public readonly sessions: Map<string, APSession>;

  constructor() {
    super();

    this.packages = new DataPackageService();
    this.sessions = new Map();
  }

  public get slots(): Array<string> {
    return Array.from(this.sessions.keys());
  }

  public async connect(
    hostname: string,
    slot: string,
    password?: string
  ): Promise<ServiceResponse> {
    logger.info("testing");
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

        logger.info(JSON.stringify(response));

        if (!response.success) {
          throw response.errors;
        }

        this.sessions.set(slot, session);
        resolve({ success: true });
      } catch (error) {
        logger.error(
          "Archipelago: Could not create Archipelago session",
          error
        );
        reject({ success: false, errors: [error] });
      }
    });
  }
}
