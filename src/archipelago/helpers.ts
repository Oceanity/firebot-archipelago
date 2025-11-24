import { ARCHIPELAGO_CLIENT_ID } from "../constants";

export const getArchipelagoFilterEvent = (eventId: string) => ({
  eventSourceId: ARCHIPELAGO_CLIENT_ID,
  eventId,
});
