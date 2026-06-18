import { MessageNode } from "archipelago.js";
import { ArchipelagoSession } from "./archipelago/archipelago-session";

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

// Object containing a leaner State Session for purpose of passing to frontend
export type SessionConnection = {
  id: string;
  name: string;
  password?: string;
  url: string;
  handle: string;
  status: SessionStatus;
};

export type StoredSession = Omit<SessionConnection, "handle" | "status">;

export type StateLogMessage = {
  text: string;
  html: string;
  nodes?: Array<MessageNode>;
};

export enum SessionStatus {
  Uninitialized = "uninitialized",
  Initialized = "initialized",
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
