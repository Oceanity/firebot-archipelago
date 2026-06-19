import { Animation, OverlayWidgetComponent } from "@crowbartools/firebot-types";
import { App, createApp, reactive } from "vue";
import {
  MessageFeedSettings,
  MessageFeedState,
} from "../../overlay-widgets/message-feed";
import MessageFeedWidget from "./MessageFeedWidget.vue";

type Store = {
  settings: MessageFeedSettings;
  state: MessageFeedState;
  entryAnimation: Animation | null;
  exitAnimation: Animation | null;
};

const component: OverlayWidgetComponent<MessageFeedSettings, MessageFeedState> =
  {
    mount({ container, config }) {
      const store = reactive<Store>({
        settings: config.settings,
        state: (config.state as MessageFeedState) ?? { messages: [] },
        entryAnimation: config.entryAnimation ?? null,
        exitAnimation: config.exitAnimation ?? null,
      });

      const app: App = createApp(MessageFeedWidget, { store });
      app.mount(container);

      return {
        update(newConfig) {
          store.settings = newConfig.settings;
          store.state = newConfig.state ?? { messages: [] };
          store.entryAnimation = newConfig.entryAnimation ?? null;
          store.exitAnimation = newConfig.exitAnimation ?? null;
        },
        destroy() {
          app.unmount();
        },
      };
    },
  };

export default component;
