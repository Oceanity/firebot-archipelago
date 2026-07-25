import firebot, { ReplaceVariable } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { FirebotEvents } from "./types";

export const AllArchipelagoVariables: Array<ReplaceVariable> = [
  //@ts-expect-error(2339)
  firebot.factories.variables.createEventDataVariable({
    handle: "apSessionId",
    description:
      "The Uuid of the associated session that can be used in the 'Custom' option of Archipelago-related effects",
    events: [
      FirebotEvents.Connected,
      FirebotEvents.Disconnected,
      FirebotEvents.Countdown,
      FirebotEvents.DeathLink,
      FirebotEvents.HintsUpdated,
      FirebotEvents.InitialItems,
      FirebotEvents.Message,
      FirebotEvents.ReceivedItems,
      FirebotEvents.SentItems,
    ].map((event) => `${ARCHIPELAGO_PLUGIN_ID}:${event}`),
    eventMetaKey: "apSessionId",
    type: "text",
  }),

  ...buildSessionVariables("apSession", [
    FirebotEvents.Connected,
    FirebotEvents.Countdown,
    FirebotEvents.DeathLink,
    FirebotEvents.HintsUpdated,
    FirebotEvents.InitialItems,
    FirebotEvents.Message,
    FirebotEvents.ReceivedItems,
    FirebotEvents.SentItems,
  ]),

  ...buildPlayerVariables("apPlayer", [
    FirebotEvents.Connected,
    FirebotEvents.Countdown,
    FirebotEvents.DeathLink,
    FirebotEvents.HintsUpdated,
  ]),

  ...buildDeathLinkVariables("apDeathLink", [FirebotEvents.DeathLink]),

  ...buildMessageVariables("apMessage", [FirebotEvents.Message]),

  ...buildItemVariables("apItem", [
    FirebotEvents.InitialItems,
    FirebotEvents.ReceivedItems,
  ]),

  ...buildPlayerVariables(
    "apSender",
    [FirebotEvents.InitialItems, FirebotEvents.ReceivedItems],
    "player who sent the item",
  ),

  ...buildPlayerVariables(
    "apReceiver",
    [FirebotEvents.InitialItems, FirebotEvents.ReceivedItems],
    "player who received the item",
  ),

  // Countdown Variable
  buildArchipelagoVariable(
    "apCountdown",
    "The current value of the server's countdown",
    [FirebotEvents.Countdown],
  ),

  // All Event Data Variable
  buildArchipelagoVariable(
    "apEventData",
    "The raw JSON event data included with the associated event",
    [
      FirebotEvents.Connected,
      FirebotEvents.Countdown,
      FirebotEvents.DeathLink,
      FirebotEvents.Disconnected,
      FirebotEvents.HintsUpdated,
      FirebotEvents.InitialItems,
      FirebotEvents.Message,
      FirebotEvents.ReceivedItems,
      FirebotEvents.SentItems,
      FirebotEvents.SlotData,
    ],
  ),
];

function buildArchipelagoVariable(
  eventProperty: string,
  description: string,
  events: Array<FirebotEvents>,
): ReplaceVariable {
  //@ts-expect-error(2339)
  return firebot.factories.variables.createEventDataVariable({
    handle: eventProperty,
    description,
    events: events.map((event) => `${ARCHIPELAGO_PLUGIN_ID}:${event}`),
    eventMetaKey: eventProperty,
    type: "text",
  });
}

function buildArchipelagoVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  definitions: Array<[string, string]>,
): Array<ReplaceVariable> {
  return definitions.map(([name, description]) => {
    const eventProperty = `${prefix}${name}`;
    //@ts-expect-error(2339)
    return firebot.factories.variables.createEventDataVariable({
      handle: eventProperty,
      description,
      events: events.map((event) => `${ARCHIPELAGO_PLUGIN_ID}:${event}`),
      eventMetaKey: eventProperty,
      type: "text",
    });
  });
}

function buildSessionVariables(prefix: string, events: Array<FirebotEvents>) {
  return buildArchipelagoVariables(prefix, events, [
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
}

function buildDeathLinkVariables(prefix: string, events: Array<FirebotEvents>) {
  return buildArchipelagoVariables(prefix, events, [
    ["Source", "The name of the slot that triggered the DeathLink event"],
    [
      "Cause",
      "The cause of the DeathLink if the AP World provides it, otherwise will be an empty string",
    ],
    ["Time", "The unix timestamp of the DeathLink event"],
  ]);
}

function buildMessageVariables(prefix: string, events: Array<FirebotEvents>) {
  return buildArchipelagoVariables(prefix, events, [
    ["Html", "The html formatted content of the message"],
    ["Text", "The plaintext content of the message"],
  ]);
}

function buildPlayerVariables(
  prefix: string,
  events: Array<FirebotEvents>,
  playerDescriptor = "associated player",
) {
  return buildArchipelagoVariables(prefix, events, [
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
}

function buildItemVariables(prefix: string, events: Array<FirebotEvents>) {
  return buildArchipelagoVariables(prefix, events, [
    ["Id", "The id of the item that was sent or received"],
    ["Name", "The name of the item that was sent or received"],
    ["Location", "The name of the location where the item was found"],
    [
      "Classification",
      "The classification of the item, can be `progression`, `useful`, `filler` or `trap`",
    ],
  ]);
}
