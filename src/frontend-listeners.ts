import firebot, { FrontendListener } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { getHintData } from "./helpers";
import { archipelago } from "./main";
import {
  ServiceResponse,
  SessionConnection,
  SessionConnectionAndStatus,
} from "./types";

export const AllArchipelagoFrontendListeners: Array<FrontendListener> = [
  {
    eventName: "connect",
    useAsync: true,
    handler: async (
      ...args: Array<unknown>
    ): Promise<ServiceResponse<SessionConnectionAndStatus>> => {
      const [url, name, password] = args;
      if (!(typeof url === "string") || !(typeof name === "string")) {
        return {
          success: false,
          errors: [
            "Invalid 'url' or 'name' provided to frontend Connect method",
          ],
        };
      }

      return await archipelago.connect(
        url,
        name,
        password as string | undefined,
      );
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

      return await archipelago.disconnect(sessionId, true);
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

      await archipelago.findSession(sessionId)?.client.messages.say(message);

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

      return (
        archipelago.findSession(sessionId)?.messages.map((m) => m.html) ?? []
      );
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
