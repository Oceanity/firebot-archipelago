import {
  ItemClassification,
  MessageColor,
  MessagePartType,
  Permission,
  SlotType,
} from "./enums";
import {
  AdminCommandResultJSONPacket,
  BouncedPacket,
  ChatJSONPacket,
  CollectJSONPacket,
  CommandResultJSONPacket,
  ConnectedPacket,
  ConnectionRefusedPacket,
  ConnectPacket,
  ConnectUpdatePacket,
  CountdownJSONPacket,
  DataPackagePacket,
  GetDataPackagePacket,
  GoalJSONPacket,
  HintJSONPacket,
  InvalidPacketPacket,
  ItemCheatJSONPacket,
  ItemSendJSONPacket,
  JoinJSONPacket,
  LocationInfoPacket,
  PartJSONPacket,
  PrintJSONPacket,
  ReceivedItemsPacket,
  ReleaseJSONPacket,
  RetrievedPacket,
  RoomInfoPacket,
  RoomUpdatePacket,
  SayPacket,
  ServerChatJSONPacket,
  SetReplyPacket,
  TagsChangedJSONPacket,
  TutorialJSONPacket,
} from "./interfaces";

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

export enum ItemType {
  Progress = "progress",
  Useful = "useful",
  Trap = "trap",
}

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

export type ClientPacket =
  | ConnectPacket
  | ConnectUpdatePacket
  | GetDataPackagePacket
  | SayPacket;

export type ServerPacket =
  | BouncedPacket
  | ConnectedPacket
  | ConnectionRefusedPacket
  | DataPackagePacket
  | InvalidPacketPacket
  | LocationInfoPacket
  | PrintJSONPacket
  | ReceivedItemsPacket
  | RetrievedPacket
  | RoomInfoPacket
  | RoomUpdatePacket
  | SetReplyPacket;

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

export type ServiceResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Array<string>;
};

//#region PrintJSON Message Parts

export type ColorJSONMessagePart = {
  readonly type: MessagePartType.Color;
  readonly text: string;
  readonly color: MessageColor;
};

export type ItemJSONMessagePart = {
  readonly type: MessagePartType.ItemId | MessagePartType.ItemName;
  readonly text: string;
  readonly flags: ItemClassification;
  readonly player: number;
};

export type LocationJSONMessagePart = {
  readonly type: MessagePartType.LocationId | MessagePartType.LocationName;
  readonly text: string;
  readonly player: number;
};

export type TextJSONMessagePart = {
  readonly type?:
    | MessagePartType.Text
    | MessagePartType.EntranceName
    | MessagePartType.PlayerId
    | MessagePartType.PlayerName;
  readonly text: string;
};

export type JSONMessagePart =
  | ColorJSONMessagePart
  | ItemJSONMessagePart
  | LocationJSONMessagePart
  | TextJSONMessagePart;

export type PrintJSONMessage =
  | ItemSendJSONPacket
  | ItemCheatJSONPacket
  | HintJSONPacket
  | JoinJSONPacket
  | PartJSONPacket
  | ChatJSONPacket
  | ServerChatJSONPacket
  | TutorialJSONPacket
  | TagsChangedJSONPacket
  | CommandResultJSONPacket
  | AdminCommandResultJSONPacket
  | GoalJSONPacket
  | ReleaseJSONPacket
  | CollectJSONPacket
  | CountdownJSONPacket;
