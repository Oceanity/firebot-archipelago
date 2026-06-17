import { EventSource } from "@crowbartools/firebot-types";
import * as packageJson from "../package.json";
import { FirebotEvents } from "./enums";

export const {
  displayName: ARCHIPELAGO_PLUGIN_NAME,
  description: ARCHIPELAGO_PLUGIN_DESCRIPTION,
  author: ARCHIPELAGO_PLUGIN_AUTHOR,
  version: ARCHIPELAGO_PLUGIN_VERSION,
} = packageJson;

export const ARCHIPELAGO_PLUGIN_ID = "oceanity:archipelago";
export const ARCHIPELAGO_PLUGIN_PACKAGE_URL =
  "https://raw.githubusercontent.com/Oceanity/firebot-archipelago/refs/heads/main/package.json";

export const ARCHIPELAGO_PLUGIN_CLIENT_TAGS = ["Firebot", "DeathLink"];

// Message Service
export const ARCHIPELAGO_PLUGIN_MAX_MESSAGES = 100;
export const ARCHIPELAGO_PLUGIN_MAX_CHAT_HISTORY = 25;

export const ARCHIPELAGO_PLUGIN_STORED_SESSIONS_FILENAME = "ap-sessions.json";
export const ARCHIPELAGO_PLUGIN_DATAPACKAGE_CACHE_FILENAME =
  "ap-datapackage-cache.json";

export const ARCHIPELAGO_EVENT_SOURCE: EventSource = {
  id: ARCHIPELAGO_PLUGIN_ID,
  name: "Archipelago",
  events: [
    {
      id: FirebotEvents.Connected,
      name: "Connected",
      description:
        "When the client connects to any Archipelago MultiWorld server.",
    },
    {
      id: FirebotEvents.Countdown,
      name: "Countdown",
      description: "When the server's countdown updates.",
    },
    {
      id: FirebotEvents.DeathLink,
      name: "DeathLink Triggered",
      description:
        "When another player in any Archipelago session triggers a DeathLink event (cannot detect when player dies).",
    },
    {
      id: FirebotEvents.Disconnected,
      name: "Disconnected",
      description: "When the client disconnects from any Archipelago session.",
    },
    {
      id: FirebotEvents.HintsUpdated,
      name: "Hints Updated",
      description:
        "When the number of available hints changes for an Archipelago session.",
    },
    {
      id: FirebotEvents.InitialItems,
      name: "Received Initial Inventory Item",
      description:
        "When the player connecting to an Archipelago session receives an item during initial inventory listing.",
    },
    {
      id: FirebotEvents.Message,
      name: "Message",
      description: "When a message is received from any Archipelago session.",
    },
    {
      id: FirebotEvents.ReceivedItems,
      name: "Received Item",
      description:
        "When the connected player of an Archipelago session receives an item.",
    },
  ],
};

export const ARCHIPELAGO_PLUGIN_ICON_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAABF9JREFUeJy1lW9oG2Ucx5OuLbV02m4dVIej2/CFbDIm4iZu84UvJlhEVBjDTrCbe2HnFDF3cS659KIVEXFpk2wTnGnLYAhSKk5ETLPlumKSdRtsjjWVWpesFV2TOqus65/4Oc2t6bhr76A7+HC94/L7fJ/n+T1PbTaLV/zAB0viorwtJshH4EJM8F7m/g28GhO991qtZ00uepcjOg5TkNPhF77ZdFfkMfH9cgSdBuJCrhPikcUPIMj74ZaJACoKIcoWO8Bz8JMJ+Tg0E6DcsuTPEb89k/ZtyaR8n8AP8D3Pzdy3ZNMtJRStpPgJmDaQp2jEx9RagiI86Ig63oJOiEC7EBXqeV+lK0ewDNHXkDPgK75ZGXd61V7o0pGPxgV5g6iIxcga4W/I6TBIiO1z5Jl0SwWCvnnkGhFC1DAT6xAOFchneLfPecZpRyDAtIFcY5TZqJsNkPLJJuQa8thwaxHSQ3O2n+Bdzsg2UPzGAnKNc1Btyw63VlL0HwsBfmbG1sREuQ7xjXyAL9SBUPBzk3KVSXiFtfe9aEGu8TQjfgjxYD7AHta+nIKXLQRQ2auuf6PVAIR+KeH01iC+ogZg/Z93KI5laoNZD5CaMwNT8CMcyqRa9hFuP38H8u8mCmcgIcrVyFvgSwI8qTMDQ9BBX4jwOk3n4bkLrs8JMJZuraLgOJymw9cbnREEepRvwpDMpnyr9b5BcoyiIwgbnIqzWO8bgqoz9SFkYJe2DZ9S705PpEyQwvWCO/wd/AbXeO4SpfAuUepeOjbsLyHIxrFr/iLdABw+hFjZd6TXnghEN8X9ytG4PzoAv8M5aEr4o2vzYR/m+xWzP3aHa+Ei5AyIE2Kd0QxpF+IyRJ/CFOR0yCYCymt9QcU+K5fCKxCk55FrXIK1xvKeYgStBuJCxuOB6O7C0QdNyDV8Tk93iV4ACm+FmyYCqFxhtlbZRE93DUUnTcpvwmGWolJ3BvzRHRQeMRlgGhpsoju806T8KuLtohyxJ9tc9/WHXM/A2+CE+mSbe/X/y6BUU/hbkyH22ujwRhPyEXhisKOpKBlyvYwwDbk7mITDyZBUSYhyip80GaC7bgH5NE3acKn9YzuCgzChIy+ktz/krmJ9H0CQXjDAu3KkHMnoPAFOCVJ3dX+b+1mKZxeQaxwd7JCK6HTHPHK1WXdou+ANwwBSeM/QCVkdfadJuUqGpVqjHjrqvjcIcPpsQKn4L8BBOVKM7KReAFGK1DL6VRQdsBAA3DsTQWUpon4d+a+wec4WEpsipYy2BelEQYCZA809pcmQ+3GKjlgM4DobPKMeTBfu2Ho9sNHwKHU2hWsI8g7yEBx7zxsp6W9zrafoVSsBCP1mX7B3CTI3tMNH/G/Yev6zuN1QbnQNtkv3UDRmIcAtzoXNC1e2cOW34JTJAOfpm4pFDZBsk6ooHDEh/4vRb1tU+e0QIXdtPsSMgXyUkb9wV+S3Qxz3lCLZjewUDMMfcBF8A+2e+63W+xdmfL2jaKBRDAAAAABJRU5ErkJggg==";

export const ARCHIPELAGO_PLUGIN_ICON_BACKGROUND =
  "linear-gradient(180deg,#2f353e,#262b33)";
