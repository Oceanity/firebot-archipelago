import firebot, { FrontendListener } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { getHintData } from "./helpers";
import { archipelago } from "./main";
import {
  hintStatuses,
  ServiceResponse,
  SessionConnection,
  SessionStatus,
  StoredHint,
} from "./types";

type Validator<T> = (value: unknown) => value is T;

const isString: Validator<string> = (v): v is string => typeof v === "string";

const isOptionalString: Validator<string | undefined> = (
  value,
): value is string | undefined =>
  value === undefined || typeof value === "string";

const isNumber: Validator<number> = (v): v is number => typeof v === "number";

const isHintStatus: Validator<keyof typeof hintStatuses> = (
  v,
): v is keyof typeof hintStatuses => typeof v === "number";

function parseArgs<const T extends readonly unknown[]>(
  args: readonly unknown[],
  methodName: string,
  ...validators: { [K in keyof T]: Validator<T[K]> }
): T {
  try {
    if (args.length < validators.length) {
      throw new Error(
        `Not enough arguments provided to Frontend Method '${methodName}'`,
      );
    }

    for (let i = 0; i < validators.length; i++) {
      if (!validators[i](args[i])) {
        throw new Error(
          `Argument ${i} provided to Frontend Method '${methodName}' is invalid`,
        );
      }
    }

    return args as unknown as T;
  } catch (error: any) {
    firebot.logger.warn(
      error.message ?? `Error parsing args for method ${methodName}`,
    );
    throw error as Error;
  }
}

export const AllArchipelagoFrontendListeners: Array<FrontendListener> = [
  {
    eventName: "connect",
    useAsync: true,
    handler: async (
      ...args: Array<unknown>
    ): Promise<ServiceResponse<SessionConnection>> => {
      try {
        const [url, name, password] = parseArgs<
          [string, string, string | undefined]
        >(args, "Connect", isString, isString, isOptionalString);

        const response = await archipelago.createSession(url, name, password);

        if (!response.success) {
          return response; // Pass up errors
        }

        return { success: true, data: response.data.connection };
      } catch (error) {
        return {
          success: false,
          errors: [
            "Invalid 'url' or 'name' provided to frontend Connect method",
          ],
        };
      }
    },
  },
  {
    eventName: "reconnect",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<SessionStatus | null> => {
      try {
        const [sessionId] = parseArgs<[string]>(args, "Reconnect", isString);

        return (await archipelago.findSession(sessionId)?.reconnect()) ?? null;
      } catch (error) {
        return null;
      }
    },
  },
  {
    eventName: "disconnect",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<boolean> => {
      try {
        const [sessionId] = parseArgs<[string]>(args, "Disconnect", isString);

        return await archipelago.closeSession(sessionId, true);
      } catch (error) {
        return false;
      }
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
      try {
        const [sessionId] = parseArgs<[string]>(
          args,
          "Get Session Status",
          isString,
        );

        return archipelago.findSession(sessionId)?.status ?? null;
      } catch (error) {
        return null;
      }
    },
  },
  {
    eventName: "send-message",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<boolean> => {
      try {
        const [sessionId, message] = parseArgs<[string, string]>(
          args,
          "Send Message",
          isString,
          isString,
        );

        await archipelago.findSession(sessionId)?.messages.sendChat(message);

        return true;
      } catch (error) {
        return false;
      }
    },
  },
  {
    eventName: "get-previous-chat-history",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<string> => {
      try {
        const [sessionId] = parseArgs<[string]>(
          args,
          "Get Previous Chat History",
          isString,
        );

        return (
          archipelago
            .findSession(sessionId)
            ?.messages.getPreviousHistoryEntry() ?? ""
        );
      } catch (error) {
        return "";
      }
    },
  },
  {
    eventName: "get-next-chat-history",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<string> => {
      try {
        const [sessionId] = parseArgs<[string]>(
          args,
          "Get Next Chat History",
          isString,
        );

        return (
          archipelago.findSession(sessionId)?.messages.getNextHistoryEntry() ??
          ""
        );
      } catch (error) {
        return "";
      }
    },
  },
  {
    eventName: "get-hints",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<StoredHint[]> => {
      try {
        const [sessionId] = parseArgs<[string]>(args, "Get Hints", isString);

        const hints = await archipelago.findSession(sessionId)?.getHints();

        firebot.logger.info(JSON.stringify(hints));

        return hints ?? [];
      } catch (error) {
        return [];
      }
    },
  },
  {
    eventName: "set-hint-status",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<boolean> => {
      try {
        const [sessionId, player, locationId, status] = parseArgs<
          [string, number, number, keyof typeof hintStatuses]
        >(args, "Set Hint Status", isString, isNumber, isNumber, isHintStatus);

        return (
          (await archipelago
            .findSession(sessionId)
            ?.setHintStatus(player, locationId, status)) ?? false
        );
      } catch (error) {
        return false;
      }
    },
  },
  {
    eventName: "get-hint-point-data",
    useAsync: true,
    handler: async (
      ...args: Array<unknown>
    ): Promise<Record<string, number>> => {
      try {
        const [sessionId] = parseArgs<[string]>(
          args,
          "Get Hint Point Data",
          isString,
        );

        const room = archipelago.findSession(sessionId)?.client.room;
        if (!room) {
          firebot.logger.warn(
            `Frontend Get Hints method could not get Room for Session with Id '${sessionId}'`,
          );
          return {};
        }

        return getHintData(room);
      } catch (error) {
        return {};
      }
    },
  },
  {
    eventName: "get-html-message-log",
    useAsync: true,
    handler: async (...args: Array<unknown>): Promise<Array<string>> => {
      try {
        const [sessionId] = parseArgs<[string]>(
          args,
          "Get HTML Message Log",
          isString,
        );

        return archipelago.findSession(sessionId)?.messages.htmlLog ?? [];
      } catch (error) {
        return [];
      }
    },
  },
].map((listener) => {
  listener.eventName = `${ARCHIPELAGO_PLUGIN_ID}:${listener.eventName}`;
  return listener;
});
