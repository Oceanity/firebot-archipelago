import {
  FontOptions,
  IOverlayWidgetEventUtils,
  OverlayWidgetType,
  WidgetOverlayEvent,
} from "@crowbartools/firebot-types";

export type Settings = {
  fontOptions?: FontOptions;
  backgroundColor: string;
};

export type State = {
  messages: Array<{ id: string; html: string }>;
};

function generateSampleMessageFeed(): State {
  return {
    messages: [
      {
        id: "827b073f-3369-4c21-a89f-42b285655956",
        html: "<span>Oceanity (OshiMMR) (Team #1) viewing Majora's Mask Recompiled has joined. Client(0.6.3), ['Firebot', 'DeathLink', 'TextOnly']</span>",
      },
    ],
  };
}

export const ArchipelagoMessageFeedOverlay: OverlayWidgetType<Settings, State> =
  {
    id: `message-feed-widget`,
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
    overlayExtension: {
      eventHandler: (
        event: WidgetOverlayEvent,
        utils: IOverlayWidgetEventUtils,
      ) => {
        const { fontOptions, backgroundColor } = event.data.widgetConfig
          .settings as Settings;

        const { messages } = event.data.widgetConfig.state as State;

        const generateInfoSpan = (className: string, data?: string): string => {
          return `<span class="aimp-info-${className}">${data ?? "&nbsp;"}</span>`;
        };

        const generateWidgetHtml = (
          config: (typeof event)["data"]["widgetConfig"],
        ) => {
          const containerStyles = {
            "justify-content": "space-between",
            "font-family": fontOptions?.family
              ? `'${fontOptions?.family}'`
              : "Inter, sans-serif",
            "font-size": fontOptions?.size ? `${fontOptions.size}px` : "48px",
            "font-weight": fontOptions?.weight?.toString() || "400",
            "font-style": fontOptions?.italic ? "italic" : "normal",
            color: fontOptions?.color || "#FFFFFF",
            background: backgroundColor,
          };

          return `<ul class="oceanity-archipelago-message-log-${config.id}" style="${utils.stylesToString(containerStyles)}">
                  ${messages.map((message) => {
                    return `<li data-id="${message.id}">${message.html}</li>`;
                  })}
                </ul>`;
        };

        switch (event.name) {
          case "show":
            utils.initializeWidget(
              generateWidgetHtml(event.data.widgetConfig),
              {
                overflow: "hidden",
              },
            );
            break;

          case "settings-update":
            utils.updateWidgetContent(
              generateWidgetHtml(event.data.widgetConfig),
            );
            break;

          case "state-update":
            break;

          case "remove":
            utils.removeWidget();
            break;
        }
      },
    },
  };
