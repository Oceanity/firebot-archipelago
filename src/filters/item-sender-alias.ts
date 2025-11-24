import { createTextFilter } from "@oceanity/firebot-helpers/firebot";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { ARCHIPELAGO_CLIENT_ID } from "../constants";
import { FirebotEvents } from "../enums";

export const ItemSenderAliasEventFilter = createTextFilter({
  id: `${ARCHIPELAGO_CLIENT_ID}:item-sender-alias`,
  name: "Item Sender Alias",
  description:
    "Filter by the alias (or slot name if none set) of the player that sent the item",
  eventMetaKey: `apSenderAlias`,
  events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
});
