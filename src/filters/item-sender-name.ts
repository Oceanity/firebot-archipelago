import firebot from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../enums";

export const ItemSenderNameEventFilter =
  firebot.eventFilterFactory.createTextFilter({
    id: "item-sender-name",
    name: "Item Sender Name",
    description:
      "Filter by the slot name (not the alias) of the player that sent the item",
    eventMetaKey: `apSenderName`,
    events: [getArchipelagoFilterEvent(FirebotEvents.ReceivedItems)],
  });
