import { MessageNode } from "archipelago.js";
import { StateSession } from "./archipelago/state-session";

export type State = {
  sessions: Record<string, StateSession>;
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

export type StoredSession = {
  id: string;
  url: string;
  name: string;
  password?: string;
};

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
    session: StateSession,
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
