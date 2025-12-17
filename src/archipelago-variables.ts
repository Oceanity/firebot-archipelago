import { ReplaceVariableFactory } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-factory";
import {
  ReplaceVariable,
  ReplaceVariableManager,
} from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { ARCHIPELAGO_CLIENT_ID } from "./constants";
import { FirebotEvents } from "./enums";

export function registerArchipelagoVariables(
  replaceVariableFactory: ReplaceVariableFactory,
  replaceVariableManager: ReplaceVariableManager
) {
  const archipelagoVariables = [
    ...buildSessionVariables(replaceVariableFactory, "apSession", [
      FirebotEvents.Connected,
      FirebotEvents.Countdown,
      FirebotEvents.DeathLink,
      FirebotEvents.Disconnected,
      FirebotEvents.HintsUpdated,
      FirebotEvents.Message,
      FirebotEvents.ReceivedItems,
      FirebotEvents.SentItems,
    ]),

    ...buildPlayerVariables(replaceVariableFactory, "apPlayer", [
      FirebotEvents.Connected,
      FirebotEvents.Countdown,
      FirebotEvents.DeathLink,
      FirebotEvents.Disconnected,
      FirebotEvents.HintsUpdated,
    ]),

    ...buildDeathLinkVariables(replaceVariableFactory, "apDeathLink", [
      FirebotEvents.DeathLink,
    ]),

    ...buildMessageVariables(replaceVariableFactory, "apMessage", [
      FirebotEvents.Message,
    ]),

    ...buildItemVariables(replaceVariableFactory, "apItem", [
      FirebotEvents.ReceivedItems,
    ]),

    ...buildPlayerVariables(
      replaceVariableFactory,
      "apSender",
      [FirebotEvents.ReceivedItems],
      "player who sent the item"
    ),

    ...buildPlayerVariables(
      replaceVariableFactory,
      "apReceiver",
      [FirebotEvents.ReceivedItems],
      "player who received the item"
    ),

    // Countdown Variable
    buildArchipelagoVariable(
      replaceVariableFactory,
      "apCountdown",
      "The current value of the server's countdown",
      [FirebotEvents.Countdown]
    ),
  ];

  for (const variable of archipelagoVariables) {
    replaceVariableManager.registerReplaceVariable(variable);
  }
}

export const buildArchipelagoVariable = (
  replaceVariableFactory: ReplaceVariableFactory,
  eventProperty: string,
  description: string,
  events: Array<FirebotEvents>
): ReplaceVariable =>
  replaceVariableFactory.createEventDataVariable({
    handle: eventProperty,
    description,
    events: events.map((event) => `${ARCHIPELAGO_CLIENT_ID}:${event}`),
    eventMetaKey: eventProperty,
    type: "text",
  });

export const buildArchipelagoVariables = (
  replaceVariableFactory: ReplaceVariableFactory,
  prefix: string,
  events: Array<FirebotEvents>,
  definitions: Array<[string, string]>
): Array<ReplaceVariable> =>
  definitions.map(([name, description]) => {
    const eventProperty = `${prefix}${name}`;
    return replaceVariableFactory.createEventDataVariable({
      handle: eventProperty,
      description,
      events: events.map((event) => `${ARCHIPELAGO_CLIENT_ID}:${event}`),
      eventMetaKey: eventProperty,
      type: "text",
    });
  });

const buildSessionVariables = (
  replaceVariableFactory: ReplaceVariableFactory,
  prefix: string,
  events: Array<FirebotEvents>
) =>
  buildArchipelagoVariables(replaceVariableFactory, prefix, events, [
    [
      "Name",
      "The name of the associated session, formatted as `<slot>@<hostname>:<port>`",
    ],
    [
      "IsStarting",
      "Will be `$true` if the session is still starting up, good to filter out initial wave of received items/messages.",
    ],
    ["Hostname", "The hostname of the associated session"],
    ["Port", "The port of the associated session, the default port is `38281`"],
    ["Url", "The full Url of the associated session"],
    [
      "LocationCount",
      "The number of locations contained in the current session",
    ],
    [
      "HintPoints",
      "The total number of hint points held by the player of the associated session",
    ],
    [
      "HintPointProgress",
      "The number of hint points in relation to the next hint",
    ],
    ["HintCost", "The cost of a hint in the associated session"],
    ["HintCostPercent", "The cost of a hint in the associated session"],
    [
      "Hints",
      "The number of possible usable hints held by the player of the associated session",
    ],
  ]);

const buildDeathLinkVariables = (
  replaceVariableFactory: ReplaceVariableFactory,
  prefix: string,
  events: Array<FirebotEvents>
) =>
  buildArchipelagoVariables(replaceVariableFactory, prefix, events, [
    ["Source", "The name of the slot that triggered the DeathLink event"],
    [
      "Cause",
      "The cause of the DeathLink if the AP World provides it, otherwise will be an empty string",
    ],
    ["Time", "The unix timestamp of the DeathLink event"],
  ]);

const buildMessageVariables = (
  replaceVariableFactory: ReplaceVariableFactory,
  prefix: string,
  events: Array<FirebotEvents>
) =>
  buildArchipelagoVariables(replaceVariableFactory, prefix, events, [
    ["Html", "The html formatted content of the message"],
    ["Text", "The plaintext content of the message"],
  ]);

const buildPlayerVariables = (
  replaceVariableFactory: ReplaceVariableFactory,
  prefix: string,
  events: Array<FirebotEvents>,
  playerDescriptor = "associated player"
) =>
  buildArchipelagoVariables(replaceVariableFactory, prefix, events, [
    ["Slot", `The slot number of the ${playerDescriptor}`],
    ["Team", `The team number of the ${playerDescriptor}`],
    ["Name", `The name of the ${playerDescriptor}`],
    [
      "Alias",
      `The alias of the ${playerDescriptor}, or their name if no alias is set`,
    ],
    ["Game", `The name of the game the ${playerDescriptor} is playing`],
    ["Type", `The type of the ${playerDescriptor}`],
  ]);

const buildItemVariables = (
  replaceVariableFactory: ReplaceVariableFactory,
  prefix: string,
  events: Array<FirebotEvents>
) =>
  buildArchipelagoVariables(replaceVariableFactory, prefix, events, [
    ["Id", "The id of the item that was sent or received"],
    ["Name", "The name of the item that was sent or received"],
    ["Location", "The name of the location where the item was found"],
    [
      "Classification",
      "The classification of the item, can be `progression`, `useful`, `filler` or `trap`",
    ],
  ]);
