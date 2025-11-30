import {
  ClientCommand,
  ClientStatus,
  ConnectionError,
  PrintJsonType,
  ServerCommand,
} from "../../enums";
import {
  DataPackage,
  JSONMessagePart,
  JSONRecord,
  JSONSerializable,
  NetworkItem,
  NetworkPlayer,
  NetworkSlot,
  NetworkVersion,
  PermissionTable,
} from "../../types";

//#region Server -> Client

export interface BouncedPacket {
  readonly cmd: ServerCommand.Bounced;
  readonly games?: Array<string>;
  readonly slots?: Array<number>;
  readonly tags?: Array<string>;
  readonly data?: JSONRecord;
}

export interface ConnectedPacket {
  readonly cmd: ServerCommand.Connected;
  readonly team: number;
  readonly slot: number;
  readonly players: Array<NetworkPlayer>;
  readonly missing_locations: Array<number>;
  readonly checked_locations: Array<number>;
  readonly slot_data: JSONSerializable;
  readonly slot_info: Record<number, NetworkSlot>;
  readonly hint_points: number;
}

export interface ConnectionRefusedPacket {
  readonly cmd: ServerCommand.ConnectionRefused;
  readonly errors: Array<ConnectionError>;
}

export interface DataPackagePacket {
  readonly cmd: ServerCommand.DataPackage;
  readonly data: DataPackage;
}

export interface InvalidPacketPacket {
  readonly cmd: ServerCommand.InvalidPacket;
  readonly type: "cmd" | "arguments";
  readonly original_cmd: string;
  readonly text: string;
}

export interface LocationInfoPacket {
  readonly cmd: ServerCommand.LocationInfo;
  readonly locations: Array<NetworkItem>;
}

export interface ReceivedItemsPacket {
  readonly cmd: ServerCommand.ReceivedItems;
  readonly index: number;
  readonly items: Array<NetworkItem>;
}

export interface RetrievedPacket {
  readonly cmd: ServerCommand.Retrieved;
  readonly keys: Record<string, JSONSerializable>;
  readonly [prop: string]: JSONSerializable;
}

export interface RoomInfoPacket {
  readonly cmd: ServerCommand.RoomInfo;
  readonly version: NetworkVersion;
  readonly generator_version: NetworkVersion;
  readonly tags: Array<string>;
  readonly password: boolean;
  readonly permissions: PermissionTable;
  readonly hint_cost: number;
  readonly location_check_points: number;
  readonly games: Array<string>;
  readonly datapackage_checksums: Record<string, string>;
  readonly seed_name: string;
  readonly time: number;
}

export interface RoomUpdatePacket {
  readonly cmd: ServerCommand.RoomUpdate;
  readonly hint_points?: number;
  readonly players?: Array<NetworkPlayer>;
  readonly checked_locations?: Array<number>;
  readonly tags?: Array<string>;
  readonly password?: boolean;
  readonly permissions?: PermissionTable;
  readonly hint_cost?: number;
  readonly location_check_points?: number;
  readonly time?: number;
}

export interface SetReplyPacket {
  readonly cmd: ServerCommand.SetReply;
  readonly key: string;
  readonly value: JSONSerializable;
  readonly original_value: JSONSerializable;
  readonly [prop: string]: JSONSerializable;
}

//#endregion

//#region JSON Packets

export interface AdminCommandResultJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.AdminCommandResult;
  readonly data: Array<JSONMessagePart>;
}

export interface ChatJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Chat;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
  readonly message: string;
}

export interface CollectJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Collect;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
}

export interface CommandResultJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.CommandResult;
  readonly data: Array<JSONMessagePart>;
}

export interface CountdownJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Countdown;
  readonly data: Array<JSONMessagePart>;
  readonly countdown: number;
}

export interface GoalJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Goal;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
}

export interface HintJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Hint;
  readonly data: Array<JSONMessagePart>;
  readonly receiving: number;
  readonly item: NetworkItem;
  readonly found: boolean;
}

export interface ItemCheatJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.ItemCheat;
  readonly data: Array<JSONMessagePart>;
  readonly receiving: number;
  readonly item: NetworkItem;
  readonly team: number;
}

export interface ItemSendJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.ItemSend;
  readonly data: Array<JSONMessagePart>;
  readonly receiving: number;
  readonly item: NetworkItem;
}

export interface JoinJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Join;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
  readonly tags: Array<string>;
}

export interface PartJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Part;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
}

export interface ReleaseJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Release;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
}

export interface ServerChatJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.ServerChat;
  readonly data: Array<JSONMessagePart>;
  readonly message: string;
}

export interface TagsChangedJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.TagsChanged;
  readonly data: Array<JSONMessagePart>;
  readonly team: number;
  readonly slot: number;
  readonly tags: Array<string>;
}

export interface TutorialJSONPacket {
  readonly cmd: ServerCommand.PrintJSON;
  readonly type: PrintJsonType.Tutorial;
  readonly data: Array<JSONMessagePart>;
}

//#endregion

//#region Client -> Server

export interface BouncePacket {
  readonly cmd: ClientCommand.Bounce;
  readonly games?: Array<string>;
  readonly slots?: Array<string>;
  readonly tags?: Array<string>;
  readonly data: Record<string, unknown>;
}

export interface ConnectPacket {
  readonly cmd: ClientCommand.Connect;
  readonly password: string;
  readonly game: string;
  readonly name: string;
  readonly uuid: string;
  readonly tags: Array<string>;
  readonly version: NetworkVersion;
  readonly items_handling: number;
  readonly slot_data: true;
}

export interface ConnectUpdatePacket {
  readonly cmd: ClientCommand.ConnectUpdate;
  readonly tags: Array<string>;
  readonly items_handling: number;
}

export interface GetDataPackagePacket {
  readonly cmd: ClientCommand.GetDataPackage;
  readonly games?: Array<string>;
}

export interface SayPacket {
  readonly cmd: ClientCommand.Say;
  readonly text: string;
}

export interface StatusUpdatePacket {
  readonly cmd: ClientCommand.StatusUpdate;
  readonly status: ClientStatus;
}

//#endregion
