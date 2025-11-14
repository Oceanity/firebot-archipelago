import { ReplaceVariableFactory } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-factory";
import { FirebotEvents } from "./enums";

export function buildItemSentVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory
) {
  const itemSentProperties: Array<[property: string, description: string]> = [
    ["Item", "The name of the item that was sent or received"],
    ["Receiver", "The name of the player that received the item"],
    ["Sender", "The name of the player that sent the item"],
    ["Location", "The name of the location where the item was found"],
    ["Game", "The name of the game in which the item was found"],
    [
      "Classification",
      "The classification of the item, can be `progression`, `useful`, `filler` or `trap`",
    ],
  ];
}
