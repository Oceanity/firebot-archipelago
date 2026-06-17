import firebot from "@crowbartools/firebot-types";
import {
  Client,
  itemClassifications,
  NetworkItem,
  RoomStateManager,
} from "archipelago.js";
import Fuse from "fuse.js";
import { APCommandOptions, HintData, StateLogMessage } from "./types";

export function getHandleFromClient(client: Client) {
  const url = new URL(client.socket.url);

  return `${client.players.self.name}@${url.protocol}${url.hostname}:${url.port}`;
}

export function getHintData(room: RoomStateManager): HintData {
  return {
    hintCost: room.hintCost,
    hintPoints: room.hintPoints,
    hintPointProgress: room.hintPoints % room.hintCost,
    hints: Math.floor(room.hintPoints / room.hintCost),
  };
}

export const searchTuples = <T>(
  tuples: Array<[string, T]>,
  search?: string,
): Array<[string, T]> => {
  if (!search || !search.trim().length) {
    return tuples;
  }

  const fuse = new Fuse(
    tuples.map(([name]) => name),
    { threshold: 0.25 },
  );

  const matches = fuse.search(search);

  return tuples.filter(([name]) =>
    matches.some((match) => match.item === name),
  );
};

export function argsString(args?: APCommandOptions["args"]) {
  if (!args) {
    return "";
  }

  return Object.entries(args)
    .map(
      ([name, definition]) =>
        `[${name}${definition.optional ? " (optional)" : ""}]`,
    )
    .join(" ");
}

//#region Get Metadata Helpers

export function getSessionMetadata(
  sessionId: string,
  client: Client,
  prefix: string = "apSession",
): Record<string, string> {
  const { room } = client;

  const handle = getHandleFromClient(client);
  const url = new URL(client.socket.url);

  return {
    [`${prefix}Id`]: sessionId,
    [`${prefix}Name`]: handle,
    [`${prefix}IsStarting`]: "false", // TODO: Find way to implement for Archipelago.js
    [`${prefix}Hostname`]: url.hostname,
    [`${prefix}Port`]: url.port,
    [`${prefix}Url`]: `${url}`,
    [`${prefix}LocationCount`]: `${room.allLocations.length}`,
    [`${prefix}HintPoints`]: `${room.hintPoints}`,
    [`${prefix}HintPointProgress`]: `${room.hintPoints % room.hintCost}`,
    [`${prefix}HintCost`]: `${room.hintCost}`,
    [`${prefix}HintCostPercent`]: `${room.hintCostPercentage}`,
    [`${prefix}Hints`]: `${Math.floor(room.hintPoints / room.hintCost)}`,
  };
}

export function getPlayerMetadata(
  client: Client,
  player?: number,
  prefix: string = "apPlayer",
): Record<string, string> {
  const playerData =
    player !== undefined
      ? client.players.findPlayer(player)
      : client.players.self;

  if (!playerData) {
    firebot.logger.error(`Could not retrieve player from slot '${player}'`);
    return {};
  }

  return {
    [`${prefix}Slot`]: `${playerData.slot}`,
    [`${prefix}Team`]: `${playerData.team}`,
    [`${prefix}Name`]: playerData.name,
    [`${prefix}Alias`]: playerData.alias,
    [`${prefix}Game`]: playerData.game,
    [`${prefix}Type`]: `${playerData.type}`,
  };
}

export function getItemMetadata(
  client: Client,
  itemData: NetworkItem,
  game?: string,
  prefix: string = "apItem",
) {
  if (!game) {
    game = client.players.self.game;
  }

  const foundInGame =
    itemData.location > 0
      ? client.players.findPlayer(itemData.player)?.game
      : "Archipelago";

  if (!foundInGame) {
    firebot.logger.error(
      `Could not find player with slot '${itemData.player}'`,
    );
    return {};
  }

  const classification =
    Object.keys(itemClassifications).find(
      (key) =>
        !!itemData.flags &&
        itemClassifications[key as keyof typeof itemClassifications] ===
          itemData.flags,
    ) ?? "filler";

  return {
    [`${prefix}Id`]: itemData.item,
    [`${prefix}Name`]: client.package.lookupItemName(game, itemData.item, true),
    [`${prefix}Location`]: client.package.lookupLocationName(
      game,
      itemData.location,
      true,
    ),
    [`${prefix}Classification`]: classification,
  };
}

export function getMessageMetadata(
  message: StateLogMessage,
  prefix: string = "apMessage",
): Record<string, string> {
  return {
    [`${prefix}Html`]: message.html,
    [`${prefix}Text`]: message.text,
  };
}

export function getDeathLinkMetadata(
  data: { source: string; cause?: string; time: number },
  prefix: string = "apDeathLink",
): Record<string, string> {
  return {
    [`${prefix}Source`]: data.source,
    [`${prefix}Cause`]: data.cause ?? `${data.source} died.`,
    [`${prefix}Time`]: `${data.time}`,
  };
}

//#endregion
