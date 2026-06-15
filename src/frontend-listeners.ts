import firebot, { FrontendListener } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { connect, disconnect, getHintData } from "./helpers";
import { state } from "./main";
import { RetrievedSession, ServiceResponse, SessionConnection } from "./types";

export const AllArchipelagoFrontendFilters: Array<FrontendListener> = [
  {
    eventName: "connect",
    useAsync: true,
    handler: async (
      ...args: Array<unknown>
    ): Promise<ServiceResponse<RetrievedSession>> => {
      const [url, name, password] = args;
      if (!(typeof url === "string") || !(typeof name === "string")) {
        return {
          success: false,
          errors: [
            "Invalid 'url' or 'name' provided to frontend Connect method",
          ],
        };
      }

      return await connect(url, name, password as string | undefined);
    },
  },
  {
    eventName: "disconnect",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<boolean> => {
      const [sessionId] = args;

      if (typeof sessionId !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Disconnect method",
        );
        return false;
      }

      return await disconnect(sessionId, true);
    },
  },
  {
    eventName: "get-session-table",
    useAsync: true,
    handler: async (): Promise<Record<string, SessionConnection>> => {
      const response: Record<string, SessionConnection> = {};
      Object.entries(state.sessions).forEach(([id, data]) => {
        const { client, status, url, ...connection } = data;
        response[id] = {
          url: typeof url === "string" ? url : url.toString(),
          ...connection,
        };
      });
      return response;
    },
  },
  {
    eventName: "get-session-names",
    useAsync: true,
    handler: async (): Promise<Record<string, string>> => {
      const response: Record<string, string> = {};
      Object.entries(state.sessions).forEach(([id, session]) => {
        response[id] = session.handle;
      });
      return response;
    },
  },
  {
    eventName: "send-message",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<boolean> => {
      const [sessionId, message] = args;

      if (typeof sessionId !== "string" || typeof message !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Send Message method",
        );
        return false;
      }

      await state.sessions[sessionId]?.client.messages.say(message);

      return true;
    },
  },
  {
    eventName: "get-hint-point-data",
    useAsync: true,
    handler: async (
      ...args: Array<unknown>
    ): Promise<Record<string, number>> => {
      const [sessionId] = args;

      if (typeof sessionId !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Get Hints method",
        );
        return {};
      }

      const room = state.sessions[sessionId]?.client.room;
      if (!room) {
        firebot.logger.warn(
          `Frontend Get Hints method could not get Room for Session with Id '${sessionId}'`,
        );
        return {};
      }

      return getHintData(room);
    },
  },
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:getHtmlMessageLog",
  //   async (sessionId: string): Promise<Array<string>> =>
  //     client.sessions.get(sessionId)?.messages.htmlLog ?? [],
  // );
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:getChatHistory",
  //   async (data: { sessionId: string; entry?: number }) =>
  //     client.sessions
  //       .get(data.sessionId)
  //       ?.messages.getChatHistory(data.entry) ?? ["", -1],
  // );
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:sendMessage",
  //   async (data: { sessionId: string; message: string }) =>
  //     client.sessions.get(data.sessionId)?.messages.sendChat(data.message),
  // );
].map((listener) => {
  listener.eventName = `${ARCHIPELAGO_PLUGIN_ID}:${listener.eventName}`;
  return listener;
});
