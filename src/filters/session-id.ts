import firebot, { EventFilter } from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../types";

export const SessionIdEventFilter: EventFilter =
  firebot.eventFilterFactory.createTextFilter({
    id: "session-id",
    name: "Archipelago Session Id",
    description:
      "Filters only events from a single Archipelago Session by Id, use `/id` in the Session's chat to get the Id",
    eventMetaKey: `apSessionId`,
    events: [
      FirebotEvents.Connected,
      FirebotEvents.Countdown,
      FirebotEvents.DeathLink,
      FirebotEvents.Disconnected,
      FirebotEvents.HintsUpdated,
      FirebotEvents.InitialItems,
      FirebotEvents.Message,
      FirebotEvents.ReceivedItems,
      FirebotEvents.SentItems,
      FirebotEvents.SlotData,
    ].map((event) => getArchipelagoFilterEvent(event)),
  });
