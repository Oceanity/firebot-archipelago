import firebot from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../types";

export const ItemSenderAliasEventFilter =
  firebot.eventFilterFactory.createTextFilter({
    id: "item-sender-alias",
    name: "Item Sender Alias",
    description:
      "Filter by the alias (or slot name if none set) of the player that sent the item",
    eventMetaKey: `apSenderAlias`,
    events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
  });
