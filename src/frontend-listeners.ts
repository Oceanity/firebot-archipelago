import firebot, { FrontendListener } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { getHintData } from "./helpers";
import { archipelago } from "./main";
import { ServiceResponse, SessionConnection, SessionStatus } from "./types";

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

      if (!response.success) {
        return response; // Pass up errors
      }

      return { success: true, data: response.data.connection };
    },
  },
  {
    eventName: "reconnect",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<SessionStatus | null> => {
      const [sessionId] = args;

      if (typeof sessionId !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Disconnect method",
        );
        return null;
      }

      return (await archipelago.findSession(sessionId)?.reconnect()) ?? null;
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
    handler: async (): Promise<Array<{ id: string; handle: string }>> =>
      archipelago.sessionTable,
  },
  {
    eventName: "get-session-status",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<SessionStatus | null> => {
      const [sessionId] = args;

      if (typeof sessionId !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Get Session Status method",
        );
        return null;
      }

      return archipelago.findSession(sessionId)?.status ?? null;
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
  {
    eventName: "get-chat-history",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<[string, number]> => {
      const [sessionId, entry] = args;

      firebot.logger.info(`${entry}`);

      if (typeof sessionId !== "string") {
        firebot.logger.warn(
          "Invalid 'sessionId' provided to frontend Get Chat History",
        );
        return ["", -1];
      }

      return (
        archipelago
          .findSession(sessionId)
          ?.messages.getChatHistoryEntry(entry as number) ?? ["", -1]
      );
    },
  },
].map((listener) => {
  listener.eventName = `${ARCHIPELAGO_PLUGIN_ID}:${listener.eventName}`;
  return listener;
});
