import { createTextFilter } from "@oceanity/firebot-helpers/firebot";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { ARCHIPELAGO_INTEGRATION_ID } from "../constants";
import { FirebotEvents } from "../enums";

export const ItemSenderNameEventFilter = createTextFilter({
  id: `${ARCHIPELAGO_INTEGRATION_ID}:item-sender-name`,
  name: "Item Sender Name",
  description:
    "Filter by the slot name (not the alias) of the player that sent the item",
  eventMetaKey: `apSenderName`,
  events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
});
