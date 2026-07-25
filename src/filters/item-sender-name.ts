import firebot from "@crowbartools/firebot-types";
import { getArchipelagoFilterEvent } from "../archipelago/helpers";
import { FirebotEvents } from "../types";

export const ItemSenderNameEventFilter =
  //@ts-expect-error(2339)
  firebot.factories.eventFilters.createTextFilter({
    id: "item-sender-name",
    name: "Item Sender Name",
    description:
      "Filter by the slot name (not the alias) of the player that sent the item",
    eventMetaKey: `apSenderName`,
    events: [FirebotEvents.ReceivedItems].map((event) =>
      getArchipelagoFilterEvent(event),
    ),
  });
