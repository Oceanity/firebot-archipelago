import firebot, { EventFilter } from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../enums";

export const ItemReceiverNameEventFilter: EventFilter =
  firebot.eventFilterFactory.createTextFilter({
    id: "item-receiver-name",
    name: "Item Receiver Name",
    description:
      "Filter by the slot name (not the alias) of the player that received the item",
    eventMetaKey: `apReceiverName`,
    events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
  });
