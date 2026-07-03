import { UIExtension } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../../constants";
import { SessionStatus } from "../../types";
import { ArchipelagoChatFeed } from "./components/chat-feed";
import { ArchipelagoChatInput } from "./components/chat-input";
import { ArchipelagoConnectionPanel } from "./components/connection-panel";
import { ArchipelagoHintDisplay } from "./components/hint-display";
import { ArchipelagoSessionTabs } from "./components/session-tabs";
import {
  ArchipelagoToastService,
  ArchipelagoToastServiceFactory,
} from "./factories/toast-service";
import template from "./ui-extension.html";

export const ArchipelagoUIExtension: UIExtension = {
  id: ARCHIPELAGO_PLUGIN_ID,
  pages: [
    {
      id: `${ARCHIPELAGO_PLUGIN_ID}-main`,
      name: "Archipelago",
      icon: "fa-island-tropical",
      fullPage: true,
      disableScroll: true,
      type: "angularjs",
      template: template,

      controller: (
        $scope: any,
        backendCommunicator: any,
        apToast: ArchipelagoToastService,
      ) => {
        $scope.sessionId = null;
        $scope.sessionHandle = null;
        $scope.sessionStatus = null;

        backendCommunicator.on(
          "oceanity:archipelago:session-status-updated",
          ({
            sessionId,
            status,
          }: {
            sessionId: string;
            status: SessionStatus;
          }) => {
            if (sessionId !== $scope.sessionId) {
              return;
            }

            $scope.sessionStatus = status;

            if (status === "could-not-connect") {
              apToast.warn(
                `Unable to connect to session '${$scope.sessionHandle}'`,
              );
              return;
            }
          },
        );

        $scope.onSessionChanged = async (
          sessionId?: string,
          handle?: string,
        ) => {
          $scope.sessionId = sessionId ?? null;
          $scope.sessionHandle = handle ?? null;

          $scope.sessionStatus = await backendCommunicator.fireEventAsync(
            "oceanity:archipelago:get-session-status",
            sessionId,
          );
        };

        $scope.reconnect = (sessionId: string) => {
          backendCommunicator.fireEventAsync(
            "oceanity:archipelago:reconnect",
            sessionId,
          );
        };
      },
    },
  ],
  providers: {
    factories: [ArchipelagoToastServiceFactory],
    components: [
      ArchipelagoChatFeed,
      ArchipelagoChatInput,
      ArchipelagoConnectionPanel,
      ArchipelagoHintDisplay,
      ArchipelagoSessionTabs,
    ],
    directives: [],
    filters: [],
  },
};
