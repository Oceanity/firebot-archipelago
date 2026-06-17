import firebot, { FrontendListener } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { getHintData } from "./helpers";
import { archipelago } from "./main";
import { ServiceResponse, SessionConnection } from "./types";

export const AllArchipelagoFrontendListeners: Array<FrontendListener> = [
  {
    eventName: "connect",
    useAsync: true,
    handler: async (
      ...args: Array<unknown>
    ): Promise<ServiceResponse<SessionConnection>> => {
      const [url, name, password] = args;
      if (!(typeof url === "string") || !(typeof name === "string")) {
        return {
          success: false,
          errors: [
            "Invalid 'url' or 'name' provided to frontend Connect method",
          ],
        };
      }

      const response = await archipelago.createSession(
        url,
        name,
        password as string | undefined,
      );

      firebot.logger.info(JSON.stringify(response));

      if (!response.success) {
        return response; // Pass up errors
      }

      firebot.logger.info(JSON.stringify(response.data.connection));

      return { success: true, data: response.data.connection };
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

      return await archipelago.closeSession(sessionId, true);
    },
  },
  {
    eventName: "get-session-connections",
    useAsync: true,
    handler: async (): Promise<Array<SessionConnection>> =>
      archipelago.sessionConnections,
  },
  {
    eventName: "get-session-table",
    useAsync: true,
    handler: async (): Promise<Record<string, string>> =>
      archipelago.sessionTable,
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

      await archipelago.findSession(sessionId)?.messages.sendChat(message);

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

      const room = archipelago.findSession(sessionId)?.client.room;
      if (!room) {
        firebot.logger.warn(
          `Frontend Get Hints method could not get Room for Session with Id '${sessionId}'`,
        );
        return {};
      }

      return getHintData(room);
    },
  },
  {
    eventName: "get-html-message-log",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<Array<string>> => {
      const [sessionId] = args;
      if (typeof sessionId !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Get HTML Message Log",
        );
        return [];
      }

      return archipelago.findSession(sessionId)?.messages.htmlLog ?? [];
    },
  },
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
