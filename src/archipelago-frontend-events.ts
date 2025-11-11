import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "@oceanity/firebot-helpers/firebot";
import { APCommandDefinitions } from "./archipelago-command-definitions";
import { archipelagoIntegration } from "./archipelago-integration";
import { ClientCommand } from "./enums";

export function initFrontendCommunicator(
  frontendCommunicator: ScriptModules["frontendCommunicator"]
) {
  frontendCommunicator.on(
    "archipelago:connect",
    async (data: { hostname: string; slot: string; password?: string }) => {
      const { hostname, slot, password } = data;
      try {
        await archipelagoIntegration.client.connect(hostname, slot, password);
        return true;
      } catch (error) {
        logger.error(
          `Could not connect to Archipelago Session at '${hostname}' as '${slot}' with password '${
            password ?? ""
          }'`,
          error
        );
        return false;
      }
    }
  );

  frontendCommunicator.on("archipelago:getSlotNames", (): Array<string> => {
    return archipelagoIntegration.client.slots;
  });

  frontendCommunicator.on(
    "archipelago:getMessageLog",
    (slot: string): Array<string> => {
      const session = archipelagoIntegration.client.sessions.get(slot);

      if (!session) {
        logger.error(`Could not find Archipelago session with slot: ${slot}`);
        return [];
      }

      return session.messages.htmlLog;
    }
  );

  frontendCommunicator.on(
    "archipelago:sendMessage",
    (data: { slot: string; message: string }): void => {
      const session = archipelagoIntegration.client.sessions.get(data.slot);

      if (!session) {
        logger.error(
          `Could not find Archipelago session with slot: ${data.slot}`
        );
        return;
      }

      if (data.message.startsWith("/")) {
        const session = archipelagoIntegration.client.sessions.get(data.slot);
        if (!session) {
          return;
        }

        const args = data.message.split(" ").filter((p) => p.trim().length);
        const command = args.shift();

        if (!APCommandDefinitions.hasOwnProperty(command)) {
          archipelagoIntegration.client.sessions.get(data.slot)?.messages.push([
            {
              text: "Unrecognized command, use /help to see all available commands",
              html: `<p class="warning">Unrecognized command, use /help to see all available commands</p>`,
              nodes: [],
            },
          ]);
          return;
        }

        session.messages.push([
          {
            text: command,
            html: `<span class="orange">${command}</span>`,
            nodes: [],
          },
        ]);

        APCommandDefinitions[
          command as keyof typeof APCommandDefinitions
        ].callback(data.slot, ...args);

        return;
      }

      session.socket.send({
        cmd: ClientCommand.Say,
        text: data.message,
      });
    }
  );
}
