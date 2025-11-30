import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
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
    }): Promise<ServiceResponse<{ id: string; name: string }>> => {
      try {
        const { hostname, slot, password } = data;

        const session = await client.connect(hostname, slot, password);

        const { id, name } = session;

        return { success: true, data: { id, name } };
      } catch (error) {
        return { success: false, errors: [error] };
      }
    }
  );

  frontendCommunicator.on("archipelago:disconnect", (sessionId: string) =>
    client.sessions.get(sessionId)?.disconnect()
  );

  frontendCommunicator.on(
    "archipelago:getSessionNames",
    (): Array<string> => client.sessionIds
  );

  frontendCommunicator.on(
    `archipelago:getSessionTable`,
    (): Record<string, string> => client.sessionTable
  );

  frontendCommunicator.on(
    "archipelago:getHtmlMessageLog",
    (sessionId: string): Array<string> =>
      client.sessions.get(sessionId)?.messages.htmlLog ?? []
  );

  frontendCommunicator.on(
    "archipelago:getChatHistory",
    (data: { sessionId: string; entry?: number }) =>
      client.sessions
        .get(data.sessionId)
        ?.messages.getChatHistory(data.entry) ?? ["", -1]
  );

  frontendCommunicator.on(
    "archipelago:sendMessage",
    (data: { sessionId: string; message: string }) =>
      client.sessions.get(data.sessionId)?.messages.sendChat(data.message)
  );

  frontendCommunicator.on(
    "archipelago:getHints",
    (sessionId: string): number => client.sessions.get(sessionId)?.hints
  );
}
