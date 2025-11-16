import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "@oceanity/firebot-helpers/firebot";
import { APCommandDefinitions } from "./archipelago-command-definitions";
import { archipelagoIntegration } from "./archipelago-integration";
import { ClientCommand } from "./enums";

export function initFrontendCommunicator(
  frontendCommunicator: ScriptModules["frontendCommunicator"]
) {
  frontendCommunicator.onAsync(
    "archipelago:connect",
    async (data: {
      hostname: string;
      slot: string;
      password?: string;
    }): Promise<boolean> => {
      const { hostname, slot, password } = data;
      try {
        const result = await archipelagoIntegration.client.connect(
          hostname,
          slot,
          password
        );

        logger.info(`Frontend Connect: ${JSON.stringify(result)}`);

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

  frontendCommunicator.on(
    "archipelago:getSessionNames",
    (): Array<string> => archipelagoIntegration.client.sessionNames
  );

  frontendCommunicator.on(
    "archipelago:getMessageLog",
    (slot: string): Array<string> =>
      archipelagoIntegration.client.sessions.get(slot)?.messages.htmlLog ?? []
  );

  frontendCommunicator.on(
    "archipelago:sendMessage",
    (data: { sessionName: string; message: string }): boolean => {
      const session = archipelagoIntegration.client.sessions.get(
        data.sessionName
      );

      if (!session) {
        logger.error(
          `Could not find Archipelago session with slot: ${data.sessionName}`
        );
        return false;
      }

      /** Handle commands defined in {@link APCommandDefinitions} */
      if (data.message.startsWith("/")) {
        const args = data.message.split(" ").filter((p) => p.trim().length);
        const command = args.shift();

        handleChatCommand(command, data.sessionName, ...args);

        return true;
      }

      session.socket.send({
        cmd: ClientCommand.Say,
        text: data.message,
      });

      return true;
    }
  );
}

/** Handle chat commands defined in {@link APCommandDefinitions} */
function handleChatCommand(
  command: string,
  sessionName: string,
  ...args: Array<string>
) {
  const session = archipelagoIntegration.client.sessions.get(sessionName);
  if (!session) {
    return;
  }

  if (!APCommandDefinitions.hasOwnProperty(command)) {
    session.messages.push([
      {
        text: "Unrecognized command, use /help to see all available commands",
        html: `<p class="red">Unrecognized command, use /help to see all available commands</p>`,
        nodes: [],
      },
    ]);
    return;
  }

  session.messages.push([
    {
      text: `${command} ${args.join(" ")}`,
      html: `<span class="orange">${command} ${args.join(" ")}</span>`,
      nodes: [],
    },
  ]);

  APCommandDefinitions[command as keyof typeof APCommandDefinitions].callback(
    sessionName,
    ...args
  );
}
