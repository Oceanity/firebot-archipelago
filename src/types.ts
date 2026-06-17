import { Client, MessageNode } from "archipelago.js";
import { Permission, SlotType } from "./enums";

export type State = {
  sessions: Record<string, StateSession>;
};

export type SessionConnection = {
  id: string;
  name: string;
  password?: string;
  url: string | URL;
  handle: string;
};

export type SessionConnectionAndStatus = SessionConnection & {
  status: SessionStatus;
};

export type StateSession = SessionConnectionAndStatus & {
  client: Client;
  messages: Array<StateLogMessage>;
  chatHistory: Array<string>;
};

export type StoredSession = {
  id: string;
  url: string;
  name: string;
  password?: string;
};

export type StateLogMessage = {
  text: string;
  html: string;
  nodes: Array<MessageNode>;
};

export enum SessionStatus {
  Connecting = "connecting",
  Connected = "connected",
  CouldNotConnect = "could-not-connect",
  Disconnected = "disconnected",
}

export type HintData = {
  hints: number;
  hintPoints: number;
  hintPointProgress: number;
  hintCost: number;
};

export type DataPackage = {
  readonly games: Record<string, GamePackage>;
};

export type GamePackage = {
  readonly item_name_to_id: Record<string, number>;
  readonly location_name_to_id: Record<string, number>;
  readonly checksum: string;
};

export type ArchipelagoIntegrationSettings = {
  connection: APConnectionDetails;
};

export type DeathLinkData = {
  source: string;
  cause: string;
  time: number;
};

export type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | JSONRecord
  | JSONSerializable[];

export type JSONRecord = { [p: string]: JSONSerializable };

export type NetworkItem = {
  readonly item: number;
  readonly location: number;
  readonly player: number;
  readonly flags: number;
};

export type NetworkPlayer = {
  readonly team: number;
  readonly slot: number;
  readonly alias: string;
  readonly name: string;
};

export type NetworkSlot = {
  readonly name: string;
  readonly game: string;
  readonly type: SlotType;
  readonly group_members: number[];
};

export type NetworkVersion = {
  readonly class: "Version";
  readonly major: number;
  readonly minor: number;
  readonly build: number;
};

export type PermissionTable = {
  readonly release: Permission;
  readonly collect: Permission;
  readonly remaining:
    | Permission.Disabled
    | Permission.Enabled
    | Permission.Goal;
};

export type APConnectionDetails = {
  hostname: string;
  slot: string;
  password?: string;
};

export type APRoom = {
  connection: APConnectionDetails;
  games: Array<string>;
  tags: Array<string>;
};

export type APCommandDefinition = Record<`/${string}`, APCommandOptions>;

export type APCommandOptions = {
  args?: Record<string, { optional: boolean }>;
  description: string;
  callback: (sessionId: string, ...args: Array<string>) => void | Promise<void>;
};

export type ServiceResponse<T> =
  | {
      success: true;
      data: T;
      errors?: never;
    }
  | {
      success: false;
      data?: never;
      errors: string[];
    };
