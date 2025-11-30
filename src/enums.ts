export enum ClientCommand {
  Bounce = "Bounce",
  Connect = "Connect",
  ConnectUpdate = "ConnectUpdate",
  CreateHints = "CreateHints",
  Get = "Get",
  GetDataPackage = "GetDataPackage",
  LocationChecks = "LocationChecks",
  LocationScouts = "LocationScouts",
  Say = "Say",
  Set = "Set",
  SetNotify = "SetNotify",
  StatusUpdate = "StatusUpdate",
  Sync = "Sync",
  UpdateHint = "UpdateHint",
}

export enum ClientStatus {
  Disconnected = 0,
  Connected = 5,
  Ready = 10,
  Playing = 20,
  Goal = 30,
}

export enum ConnectionError {
  IncompatibleVersion = "IncompatibleVersion",
  InvalidGame = "InvalidGame",
  InvalidItemsHandling = "InvalidItemsHandling",
  InvalidPassword = "InvalidPassword",
  InvalidSlot = "InvalidSlot",
}

export enum FirebotEvents {
  Connected = "connected",
  Countdown = "countdown",
  DeathLink = "death-link",
  Disconnected = "disconnected",
  HintsUpdated = "hints-updated",
  Message = "message",
  ReceivedItems = "received-items",
  SentItems = "sent-items",
}

export enum HintStatus {
  HintUnspecified = 0,
  HintNoPriority = 10,
  HintAvoid = 20,
  HintPriority = 30,
  HintFound = 40,
}

export enum ItemClassification {
  Progression = 0b001,
  Useful = 0b010,
  Trap = 0b100,
  None = 0,
}

export enum ItemHandlingFlag {
  Minimal = 0b000,
  Others = 0b001,
  Own = 0b010,
  Starting = 0b100,
  All = 0b111,
}

export enum MessageColor {
  Bold = "bold",
  Underline = "underline",
  Black = "black",
  Red = "red",
  Green = "green",
  Yellow = "yellow",
  Blue = "blue",
  Magenta = "magenta",
  Cyan = "cyan",
  White = "white",
  BlackBg = "black_bg",
  RedBg = "red_bg",
  GreenBg = "green_bg",
  YellowBg = "yellow_bg",
  BlueBg = "blue_bg",
  MagentaBg = "magenta_bg",
  CyanBg = "cyan_bg",
  WhiteBg = "white_bg",
}

export enum MessagePartType {
  Color = "color",
  EntranceName = "entrance_name",
  ItemId = "item_id",
  ItemName = "item_name",
  LocationId = "location_id",
  LocationName = "location_name",
  PlayerId = "player_id",
  PlayerName = "player_name",
  Text = "text",
}

export enum MessageNodeType {
  Color = "color",
  Entrance = "entrance",
  Item = "item",
  Location = "location",
  Player = "player",
  Text = "text",
}

export enum PrintJsonType {
  AdminCommandResult = "AdminCommandResult",
  Chat = "Chat",
  Collect = "Collect",
  CommandResult = "CommandResult",
  Countdown = "Countdown",
  Goal = "Goal",
  Hint = "Hint",
  ItemCheat = "ItemCheat",
  ItemSend = "ItemSend",
  Join = "Join",
  Part = "Part",
  Release = "Release",
  ServerChat = "ServerChat",
  TagsChanged = "TagsChanged",
  Tutorial = "Tutorial",
}

export enum Permission {
  Disabled = 0,
  Enabled = 0b001,
  Goal = 0b010,
  Auto = 0b110,
  AutoEnabled = 0b111,
}

export enum ServerCommand {
  Bounced = "Bounced",
  Connected = "Connected",
  ConnectionRefused = "ConnectionRefused",
  DataPackage = "DataPackage",
  InvalidPacket = "InvalidPacket",
  LocationInfo = "LocationInfo",
  PrintJSON = "PrintJSON",
  ReceivedItems = "ReceivedItems",
  Retrieved = "Retrieved",
  RoomInfo = "RoomInfo",
  RoomUpdate = "RoomUpdate",
  SetReply = "SetReply",
}

export enum SlotType {
  Spectator = 0,
  Player = 1,
  Group = 2,
}

export enum Tag {
  AP = "AP",
  DeathLink = "DeathLink",
  HintGame = "HintGame",
  Tracker = "Tracker",
  TextOnly = "TextOnly",
  NoText = "NoText",
}
