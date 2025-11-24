import { createTextFilter } from "@oceanity/firebot-helpers/firebot";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { ARCHIPELAGO_CLIENT_ID } from "../constants";
import { FirebotEvents } from "../enums";

export const ItemReceiverAliasEventFilter = createTextFilter({
  id: `${ARCHIPELAGO_CLIENT_ID}:item-receiver-alias`,
  name: "Item Receiver Alias",
  description:
    "Filter by the alias (or slot name if none set) of the player that received the item",
  eventMetaKey: `apReceiverAlias`,
  events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
});
