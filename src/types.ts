import { MessageNode } from "archipelago.js";
import { ArchipelagoSession } from "./archipelago/archipelago-session";

export type ContextMenuEntry = {
  html?: string;
  text?: string;
  children?: Array<ContextMenuEntry>;
  click?: () => void;
  hasTopDivider?: boolean;
  enabled?: () => boolean;
};

export enum FirebotEvents {
  Connected = "connected",
  Countdown = "countdown",
  DeathLink = "death-link",
  Disconnected = "disconnected",
  HintsUpdated = "hints-updated",
  InitialItems = "initial-items",
  Message = "message",
  ReceivedItems = "received-items",
  SentItems = "sent-items",
  SlotData = "slot-data",
}

export type State = {
  sessions: Record<string, ArchipelagoSession>;
};

export type SessionTableEntry = {
  id: string;
  handle: string;
};

export type SessionConnection = {
  id: string;
  name: string;
  password?: string;
  url: string;
  handle: string;
  status: SessionStatus;
};

export type StoredSession = Omit<SessionConnection, "handle" | "status">;

export type StoredHint = {
  id: string;
  sender: string;
  senderIsPlayer: boolean;
  receiver: string;
  receiverIsPlayer: boolean;
  item: string;
  location: string;
  classification: string;
  entrance: string;
  status: string;
};

export type StoredPlayer = {
  alias: string;
  game: string;
  isSessionPlayer: boolean;
};

export const hintStatuses = Object.freeze({
  /** The receiving player has not set a status. */
  [0]: "Unspecified",
  /** The receiving player has specified this item is unnecessary. */
  [10]: "No Priority",
  /** The receiving player has specified this item is detrimental. */
  [20]: "Avoid",
  /** The receiving player has specified this item is required/important. */
  [30]: "Priority",
  /** The receiving player has received this item. */
  [40]: "Found",
});

export const itemClassifications = Object.freeze({
  /** If set, indicates the item may unlock logical advancement. */
  [1]: "Progression",
  /** If set, indicates the item is classified as useful to have. */
  [2]: "Useful",
  /** If set, indicates the item can inconvenience a player. */
  [4]: "Trap",
  /** A shorthand with no flags set, also known as 'filler' or 'junk' items. */
  [0]: "Filler",
});

export type ReadHint = {
  receiving_player: number;
  finding_player: number;
  location: number;
  item: number;
  found: boolean;
  entrance: string;
  item_flags: keyof typeof itemClassifications;
  status: keyof typeof hintStatuses;
  class: "Hint";
};

export type StateLogMessage = {
  id: string;
  text: string;
  html: string;
  nodes?: Array<MessageNode>;
};

export type WidgetLogMessage = {
  type: MessageNode["type"];
  html: string;
};

export enum SessionStatus {
  Uninitialized = "uninitialized",
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

export type ChatCommandDefinition = Record<`/${string}`, APCommandOptions>;

export type APCommandOptions = {
  args?: Record<string, { optional: boolean }>;
  description: string;
  callback: (
    session: ArchipelagoSession,
    ...args: Array<string>
  ) => void | Promise<void>;
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

export type SessionSelectMode = "associated" | "first" | "list" | "custom";
