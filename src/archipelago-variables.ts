import {
  ReplaceVariableFactory,
  VariableConfig,
} from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-factory";
import { ReplaceVariableManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { ARCHIPELAGO_CLIENT_ID } from "./constants";
import { FirebotEvents } from "./enums";

type VariableDefinition = [property: string, definition: string];

export function registerArchipelagoVariables(
  replaceVariableFactory: ReplaceVariableFactory,
  replaceVariableManager: ReplaceVariableManager
) {
  const archipelagoVariables = [
    ...buildSessionVariables(
      "apSession",
      [
        FirebotEvents.Connected,
        FirebotEvents.Countdown,
        FirebotEvents.DeathLink,
        FirebotEvents.Disconnected,
        FirebotEvents.HintsUpdated,
        FirebotEvents.Message,
        FirebotEvents.ReceivedItems,
        FirebotEvents.SentItems,
      ],
      replaceVariableFactory
    ),

    ...buildPlayerVariables(
      "apPlayer",
      [
        FirebotEvents.Connected,
        FirebotEvents.Countdown,
        FirebotEvents.DeathLink,
        FirebotEvents.Disconnected,
        FirebotEvents.HintsUpdated,
      ],
      replaceVariableFactory
    ),

    ...buildCountdownVariables(
      "apCountdown",
      [FirebotEvents.Countdown],
      replaceVariableFactory
    ),

    ...buildDeathLinkVariables(
      "apDeathLink",
      [FirebotEvents.DeathLink],
      replaceVariableFactory
    ),

    ...buildMessageVariables(
      "apMessage",
      [FirebotEvents.Message],
      replaceVariableFactory
    ),

    ...buildItemVariables(
      "apItem",
      [FirebotEvents.ReceivedItems],
      replaceVariableFactory
    ),

    ...buildPlayerVariables(
      "apSender",
      [FirebotEvents.ReceivedItems],
      replaceVariableFactory,
      "player who sent the item"
    ),

    ...buildPlayerVariables(
      "apReceiver",
      [FirebotEvents.ReceivedItems],
      replaceVariableFactory,
      "player who received the item"
    ),
  ];

  for (const variable of archipelagoVariables) {
    replaceVariableManager.registerReplaceVariable(variable);
  }
}

export const buildArchipelagoVariable = (
  eventProperty: string,
  description: string,
  events: Array<FirebotEvents>
): VariableConfig => ({
  handle: eventProperty,
  description,
  events: events.map((event) => `${ARCHIPELAGO_CLIENT_ID}:${event}`),
  eventMetaKey: eventProperty,
  type: "text",
});

const buildSessionVariables = (
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory
) => {
  const countdownProperties: Array<VariableDefinition> = [
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
      "The hint points held by the player of the associated session",
    ],
    ["HintCost", "The cost of a hint in the associated session"],
    ["HintCostPercent", "The cost of a hint in the associated session"],
    [
      "Hints",
      "The number of possible usable hints held by the player of the associated session",
    ],
  ];

  return countdownProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildArchipelagoVariable(`${prefix}${property}`, description, events)
    )
  );
};

export function buildCountdownVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory
) {
  const countdownProperties: Array<VariableDefinition> = [
    ["", "The current value of the server's countdown"],
  ];

  return countdownProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildArchipelagoVariable(`${prefix}${property}`, description, events)
    )
  );
}

export function buildDeathLinkVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory
) {
  const deathLinkProperties: Array<VariableDefinition> = [
    ["Source", "The name of the slot that triggered the DeathLink event"],
    [
      "Cause",
      "The cause of the DeathLink if the AP World provides it, otherwise will be an empty string",
    ],
    ["Time", "The unix timestamp of the DeathLink event"],
  ];

  return deathLinkProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildArchipelagoVariable(`${prefix}${property}`, description, events)
    )
  );
}

function buildMessageVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory
) {
  const messageProperties: Array<VariableDefinition> = [
    ["Html", "The html formatted content of the message"],
    ["Text", "The plaintext content of the message"],
  ];

  return messageProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildArchipelagoVariable(`${prefix}${property}`, description, events)
    )
  );
}

function buildPlayerVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory,
  playerDescriptor = "associated player"
) {
  const playerProperties: Array<VariableDefinition> = [
    ["Slot", `The slot number of the ${playerDescriptor}`],
    ["Team", `The team number of the ${playerDescriptor}`],
    ["Name", `The name of the ${playerDescriptor}`],
    [
      "Alias",
      `The alias of the ${playerDescriptor}, or their name if no alias is set`,
    ],
    ["Game", `The name of the game the ${playerDescriptor} is playing`],
    ["Type", `The type of the ${playerDescriptor}`],
  ];

  return playerProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildArchipelagoVariable(`${prefix}${property}`, description, events)
    )
  );
}

export function buildItemVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  replaceVariableFactory: ReplaceVariableFactory
) {
  const itemSentProperties: Array<VariableDefinition> = [
    ["Id", "The id of the item that was sent or received"],
    ["Name", "The name of the item that was sent or received"],
    ["Location", "The name of the location where the item was found"],
    [
      "Classification",
      "The classification of the item, can be `progression`, `useful`, `filler` or `trap`",
    ],
  ];

  return itemSentProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildArchipelagoVariable(`${prefix}${property}`, description, events)
    )
  );
}
