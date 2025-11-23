import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "@oceanity/firebot-helpers/firebot";
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
    "archipelago:getChatHistory",
    (data: { sessionName: string; entry?: number }) =>
      client.sessions
        .get(data.sessionName)
        ?.messages.getChatHistory(data.entry) ?? ["", -1]
  );

  frontendCommunicator.on(
    "archipelago:sendMessage",
    (data: { sessionName: string; message: string }) =>
      client.sessions.get(data.sessionName)?.messages.sendChat(data.message)
  );
}
