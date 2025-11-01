import {
  IntegrationController,
  IntegrationData,
  IntegrationEvents,
} from "@crowbartools/firebot-custom-scripts-types";
import { EventManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";
import { logger } from "@oceanity/firebot-helpers/firebot";
import { Client as ArchipelagoClient } from "archipelago.js";
import { TypedEmitter } from "tiny-typed-emitter";
import { ArchipelagoIntegrationSettings } from "./types";

class IntegrationEventEmitter extends TypedEmitter<IntegrationEvents> {}

export class ArchipelagoIntegration
  extends IntegrationEventEmitter
  implements IntegrationController<ArchipelagoIntegrationSettings>
{
  connected: boolean = false;

  public client: ArchipelagoClient;

  constructor(private eventManager: EventManager) {
    super();
  }

  init(
    _: boolean,
    integrationData: IntegrationData<ArchipelagoIntegrationSettings>
  ): void | PromiseLike<void> {
    this.initArchipelagoClient(integrationData.userSettings);
  }

  onUserSettingsUpdate(
    integrationData: IntegrationData<ArchipelagoIntegrationSettings>
  ): void | PromiseLike<void> {
    this.initArchipelagoClient(integrationData.userSettings);
  }

  private async initArchipelagoClient(
    userSettings?: ArchipelagoIntegrationSettings
  ) {
    if (this.client) {
      try {
        this.client.socket.disconnect();
      } catch (err) {
        logger.error("Error disconnecting from Archipelago client", err);
      }
    }

    logger.info(JSON.stringify(userSettings));

    const hostname = userSettings?.connection.host;
    const name = userSettings?.connection.name;

    if (!hostname || !name) {
      logger.error(
        "Archipelago client host and name are required to connect to the server"
      );
      return;
    }

    try {
      logger.info(`Logging in to Archipelago client at ${hostname} as ${name}`);
      this.client = new ArchipelagoClient();

      await this.client
        .login(hostname, name)
        .then(() => logger.info("Logged in to Archipelago client"))
        .catch((err) => {
          logger.error("Error connecting to Archipelago server", err);
        });
    } catch (err) {
      logger.error("Error creating Archipelago client", err);
      return;
    }

    // Archipeplago Events
    // this.client.messages.on("adminCommand", (text, nodes) => {
    //   logger.info("Admin Command", text, nodes);
    // });

    // this.client.messages.on("chat", (message, player, nodes) => {
    //   logger.info("Chat", message, player, nodes);
    // });

    // this.client.messages.on("collected", (text, player, nodes) => {
    //   logger.info("Collected", text, player, nodes);
    // });

    // this.client.messages.on("connected", (text, player, nodes) => {
    //   logger.info("Connected", text, player, nodes);
    // });

    // this.client.messages.on("countdown", (text, value, nodes) => {
    //   logger.info("Countdown", text, value, nodes);
    // });

    // this.client.messages.on("disconnected", (text, player, nodes) => {
    //   logger.info("Disconnected", text, player, nodes);
    // });

    // this.client.messages.on("goaled", (text, player, nodes) => {
    //   logger.info("Goaled", text, player, nodes);
    // });

    // this.client.messages.on("itemCheated", (text, item, nodes) => {
    //   logger.info("Item Cheated", text, item, nodes);
    // });

    // this.client.messages.on("itemHinted", (test, item, found, nodes) => {
    //   logger.info("Item Hinted", test, item, found, nodes);
    // });

    // this.client.messages.on("itemSent", (text, item, nodes) => {
    //   logger.info("Item Sent", text, item, nodes);
    // });

    // this.client.messages.on("released", (text, player, nodes) => {
    //   logger.info("Released", text, player, nodes);
    // });

    // this.client.messages.on("message", (text, nodes) => {
    //   logger.info("Message", text, nodes);
    // });

    // this.client.messages.on("serverChat", (message, nodes) => {
    //   logger.info("Server Chat", message, nodes);
    // });

    // this.client.messages.on("tagsUpdated", (text, player, tags, nodes) => {
    //   logger.info("Tags Updated", text, player, tags, nodes);
    // });

    // this.client.messages.on("tutorial", (text, nodes) => {
    //   logger.info("Tutorial", text, nodes);
    // });

    // this.client.messages.on("userCommand", (text, nodes) => {
    //   logger.info("User Command", text, nodes);
    // });

    // if (!this.connected) {
    //   this.connected = true;
    // }

    logger.info("Archipelago client initialized");
  }
}

export let archipelagoIntegration: ArchipelagoIntegration;

export function initArchipelagoIntegration(eventManger: EventManager) {
  archipelagoIntegration = new ArchipelagoIntegration(eventManger);

  return archipelagoIntegration;
}
