import { ARCHIPELAGO_INTEGRATION_ID } from "../constants";

export const getArchipelagoFilterEvent = (eventId: string) => ({
  eventSourceId: ARCHIPELAGO_INTEGRATION_ID,
  eventId,
});
