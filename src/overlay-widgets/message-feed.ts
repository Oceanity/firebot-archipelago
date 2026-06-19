import { FontOptions, OverlayWidgetType } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../constants";

export type MessageFeedSettings = {
  fontOptions?: FontOptions;
  backgroundColor: string;
};

export type MessageFeedState = {
  messages: Array<string>;
};

function generateSampleMessageFeed(): MessageFeedState {
  return {
    messages: [
      "<span>Oceanity (Oshi - MMR) (Team #1) viewing Majora's Mask Recompiled has joined. Client(0.6.3), ['Firebot', 'DeathLink', 'TextOnly']</span>",
    ],
  };
}

export const archipelagoMessageFeed: OverlayWidgetType<
  MessageFeedSettings,
  MessageFeedState
> = {
  id: `${ARCHIPELAGO_PLUGIN_ID}:message-feed-widget`,
  name: "Archipelago Message Feed",
  description: "Displays the messages received from the Archipelago server.",
  icon: "fa fa-island-tropical",
  settingsSchema: [
    {
      name: "fontOptions",
      title: "Font",
      type: "font-options",
      default: {
        family: "Inter",
        weight: 600,
        size: 20,
        italic: false,
        color: "#FFFFFF",
      },
      allowAlpha: true,
    },
    {
      name: "backgroundColor",
      title: "Background Color",
      type: "hexcolor",
      default: "#0d141c",
      allowAlpha: true,
    },
  ],
  initialAspectRatio: { width: 4, height: 3 },
  initialState: { messages: [] },
  supportsLivePreview: true,
  livePreviewState: generateSampleMessageFeed,
  componentExtension: loadComponentExtension(),
};
