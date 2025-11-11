import {
  IntegrationController,
  IntegrationData,
  IntegrationEvents,
} from "@crowbartools/firebot-custom-scripts-types";
import { EventManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";
import { logger } from "@oceanity/firebot-helpers/firebot";
import { TypedEmitter } from "tiny-typed-emitter";
import { APClient } from "./archipelago/client";
import { ArchipelagoIntegrationSettings } from "./types";

class IntegrationEventEmitter extends TypedEmitter<IntegrationEvents> {}

export class ArchipelagoIntegration
  extends IntegrationEventEmitter
  implements IntegrationController<ArchipelagoIntegrationSettings>
{
  connected: boolean = false;

  public client: APClient;

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
    if (!this.client) {
      this.client = new APClient();
    }

    const { hostname, slot, password } = userSettings.connection;

    if (!hostname || !slot) {
      logger.error(
        "Archipelago Session hostname and slot are required to connect"
      );
      return;
    }

    try {
      logger.info(
        `Logging in to Archipelago Session at ${hostname} as ${slot}`
      );
      this.client.connect(hostname, slot, password);
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
