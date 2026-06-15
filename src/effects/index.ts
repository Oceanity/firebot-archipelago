import { ARCHIPELAGO_PLUGIN_ID } from "../constants";
import { SendChatMessageEffectType } from "./send-chat-message";
import { TriggerDeathLinkEffectType } from "./trigger-death-link";

export const AllArchipelagoEffectTypes = [
  SendChatMessageEffectType,
  TriggerDeathLinkEffectType,
].map((effectType) => {
  effectType.definition.id = `${ARCHIPELAGO_PLUGIN_ID}:${effectType.definition.id}`;
  return effectType;
});
