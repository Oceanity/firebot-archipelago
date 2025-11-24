import { createTextFilter } from "@oceanity/firebot-helpers/firebot";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { ARCHIPELAGO_CLIENT_ID } from "../constants";
import { FirebotEvents } from "../enums";

export const ItemReceiverNameEventFilter = createTextFilter({
  id: `${ARCHIPELAGO_CLIENT_ID}:item-receiver-name`,
  name: "Item Receiver Name",
  description:
    "Filter by the slot name (not the alias) of the player that received the item",
  eventMetaKey: `apReceiverName`,
  events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
});
