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

  frontendCommunicator.onAsync(
    "archipelago:disconnect",
    async (sessionId: string): Promise<void> =>
      client.sessions.get(sessionId)?.disconnect()
  );

  frontendCommunicator.onAsync(
    `archipelago:getSessionTable`,
    async (): Promise<Record<string, string>> => client.sessionTable
  );

  frontendCommunicator.onAsync(
    "archipelago:getHtmlMessageLog",
    async (sessionId: string): Promise<Array<string>> =>
      client.sessions.get(sessionId)?.messages.htmlLog ?? []
  );

  frontendCommunicator.onAsync(
    "archipelago:getChatHistory",
    async (data: { sessionId: string; entry?: number }) =>
      client.sessions
        .get(data.sessionId)
        ?.messages.getChatHistory(data.entry) ?? ["", -1]
  );

  frontendCommunicator.onAsync(
    "archipelago:sendMessage",
    async (data: { sessionId: string; message: string }) =>
      client.sessions.get(data.sessionId)?.messages.sendChat(data.message)
  );

  frontendCommunicator.onAsync(
    "archipelago:getHints",
    async (sessionId: string) => client.sessions.get(sessionId)?.getHintData()
  );
}
