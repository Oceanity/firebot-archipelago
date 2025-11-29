import Fuse from "fuse.js";
import { ARCHIPELAGO_CLIENT_ID } from "../constants";
import { APCommandOptions } from "../types";

export const getArchipelagoFilterEvent = (eventId: string) => ({
  eventSourceId: ARCHIPELAGO_CLIENT_ID,
  eventId,
});

export const isValidConnectionString = (connectionString: string) => {
  const split = connectionString.split(":");

  return (
    split.length === 3 && /^wss:$/.test(split[0]) && /^\d+$/.test(split[2])
  );
};

export const connectionStringFromUrl = (url: URL): string =>
  `${url.protocol}${url.hostname}:${url.port}`;

export const urlFromConnectionString = (
  connectionString: string
): URL | null => {
  const split = connectionString.split(":");

  switch (split.length) {
    // Has protocol, hostname and port
    case 3:
      return new URL(`${split.shift()}://${split.join(":")}`);
    // Has either protocol/hostname or hostname/port
    case 2:
      return /^wss?$/.test(split[0])
        ? new URL(`${split[0]}://${split[1]}`)
        : new URL(`wss://${split.join(":")}`);
    // Has just hostname
    case 1:
      return new URL(`wss://${split[0]}`);
  }

  return null;
};

export const searchTuples = <T>(
  tuples: Array<[string, T]>,
  search?: string
): Array<[string, T]> => {
  if (!search || !search.trim().length) {
    return tuples;
  }

  const fuse = new Fuse(
    tuples.map(([name]) => name),
    { threshold: 0.25 }
  );

  const matches = fuse.search(search);

  return tuples.filter(([name]) =>
    matches.some((match) => match.item === name)
  );
};

export function argsString(args?: APCommandOptions["args"]) {
  if (!args) {
    return "";
  }

  return Object.entries(args)
    .map(
      ([name, definition]) =>
        `[${name}${definition.optional ? " (optional)" : ""}]`
    )
    .join(" ");
}
