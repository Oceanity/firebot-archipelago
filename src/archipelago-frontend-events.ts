import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "@oceanity/firebot-helpers/firebot";
import { APCommandDefinitions } from "./archipelago-command-definitions";
import { ClientCommand } from "./enums";
import { client } from "./main";
import { ServiceResponse } from "./types";

export function initFrontendCommunicator(
  frontendCommunicator: ScriptModules["frontendCommunicator"]
) {
  frontendCommunicator.onAsync(
    "archipelago:connect",
    async (data: {
      hostname: string;
      slot: string;
      password?: string;
    }): Promise<ServiceResponse> => {
      const { hostname, slot, password } = data;
      try {
        return await client.connect(hostname, slot, password);
      } catch (error) {
        logger.error(
          `Could not connect to Archipelago Session at '${hostname}' as '${slot}' with password '${
            password ?? ""
          }'`,
          error
        );
        return { success: false, errors: [error] };
      }
    }
  );

  frontendCommunicator.on(
    "archipelago:getSessionNames",
    (): Array<string> => client.sessionNames
  );

  frontendCommunicator.on(
    "archipelago:getHtmlMessageLog",
    (slot: string): Array<string> =>
      client.sessions.get(slot)?.messages.htmlLog ?? []
  );

  frontendCommunicator.on(
    "archipelago:sendMessage",
    (data: { sessionName: string; message: string }): boolean => {
      const session = client.sessions.get(data.sessionName);

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
  const session = client.sessions.get(sessionName);
  if (!session) {
    return;
  }

  if (!APCommandDefinitions.hasOwnProperty(command)) {
    session.messages.push({
      text: "Unrecognized command, use /help to see all available commands",
      html: `<p class="red">Unrecognized command, use /help to see all available commands</p>`,
      nodes: [],
    });
    return;
  }

  session.messages.push({
    text: `${command} ${args.join(" ")}`,
    html: `<span class="orange">${command} ${args.join(" ")}</span>`,
    nodes: [],
  });

  APCommandDefinitions[command as keyof typeof APCommandDefinitions].callback(
    sessionName,
    ...args
  );
}
