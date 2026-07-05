import { UIExtension } from "@crowbartools/firebot-types";
import { Hint } from "archipelago.js";
import { ARCHIPELAGO_PLUGIN_ID } from "../../constants";
import { SessionStatus } from "../../types";
import { ArchipelagoChatFeed } from "./components/chat-feed";
import { ArchipelagoChatInput } from "./components/chat-input";
import { ArchipelagoConnectionPanel } from "./components/connection-panel";
import { ArchipelagoHintDisplay } from "./components/hint-display";
import { ArchipelagoHintTable } from "./components/hint-table";
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
      id: `${ARCHIPELAGO_PLUGIN_ID}:main`,
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

        $scope.fetchHints = async () => {
          backendCommunicator
            .fireEventAsync("oceanity:archipelago:get-hints", $scope.sessionId)
            .then((hints: Hint[]) => {
              $scope.hints = hints;
              $scope.$applyAsync();
            });
        };

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

            switch (status) {
              case SessionStatus.Connected:
                return apToast.info(
                  `Connected to session '${$scope.sessionHandle}'!`,
                );
              case SessionStatus.Disconnected:
                return apToast.warn(
                  `Disconnected from session '${$scope.sessionHandle}'`,
                );
              case SessionStatus.CouldNotConnect:
                return apToast.warn(
                  `Unable to connect to session '${$scope.sessionHandle}'`,
                );
            }
          },
        );

        $scope.onSessionChanged = async (
          sessionId?: string,
          handle?: string,
        ) => {
          $scope.sessionId = sessionId ?? null;
          $scope.sessionHandle = handle ?? null;

          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:get-session-status",
              sessionId,
            )
            .then((sessionStatus: SessionStatus) => {
              $scope.sessionStatus = sessionStatus;
            });

          await $scope.fetchHints();
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
      ArchipelagoHintTable,
      ArchipelagoSessionTabs,
    ],
    directives: [],
    filters: [],
  },
};
