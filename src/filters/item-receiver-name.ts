import firebot, { EventFilter } from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../types";

export const ItemReceiverNameEventFilter: EventFilter =
  //@ts-expect-error(2339)
  firebot.factories.eventFilters.createTextFilter({
    id: "item-receiver-name",
    name: "Item Receiver Name",
    description:
      "Filter by the slot name (not the alias) of the player that received the item",
    eventMetaKey: `apReceiverName`,
    events: [FirebotEvents.ReceivedItems].map((event) =>
      getArchipelagoFilterEvent(event),
    ),
  });
