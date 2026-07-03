import { EventFilter } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../constants";
import { ItemReceiverAliasEventFilter } from "./item-receiver-alias";
import { ItemReceiverNameEventFilter } from "./item-receiver-name";
import { ItemSenderAliasEventFilter } from "./item-sender-alias";
import { ItemSenderNameEventFilter } from "./item-sender-name";
import { SessionIdEventFilter } from "./session-id";

export const AllArchipelagoFilterEvents: Array<EventFilter> = [
  ItemReceiverAliasEventFilter,
  ItemReceiverNameEventFilter,
  ItemSenderAliasEventFilter,
  ItemSenderNameEventFilter,
  SessionIdEventFilter,
].map((filter) => {
  filter.id = `${ARCHIPELAGO_PLUGIN_ID}:${filter.id}`;
  return filter;
});
