import firebot, { EventFilter } from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../types";

export const ItemReceiverAliasEventFilter: EventFilter =
  //@ts-expect-error(2339)
  firebot.factories.eventFilters.createTextFilter({
    id: "item-receiver-alias",
    name: "Item Receiver Alias",
    description:
      "Filter by the alias (or slot name if none set) of the player that received the item",
    eventMetaKey: `apReceiverAlias`,
    events: [FirebotEvents.ReceivedItems].map((event) =>
      getArchipelagoFilterEvent(event),
    ),
  });
