import { ARCHIPELAGO_CLIENT_ID } from "../constants";
import { SendChatMessageEffectType } from "./send-chat-message";
import { TriggerDeathLinkEffectType } from "./trigger-death-link";

export const AllArchipelagoEffectTypes = [
  SendChatMessageEffectType,
  TriggerDeathLinkEffectType,
].map((effectType) => {
  effectType.definition.id = `${ARCHIPELAGO_CLIENT_ID}:${effectType.definition.id}`;
  return effectType;
});
