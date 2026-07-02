import { UIExtension } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../../constants";
import { SessionConnection, SessionStatus } from "../../types";
import { ArchipelagoChatFeed } from "./components/chat-feed";
import { ArchipelagoChatInput } from "./components/chat-input";
import { ArchipelagoConnectionPanel } from "./components/connection-panel";
import { ArchipelagoHintDisplay } from "./components/hint-display";
import { ArchipelagoSessionTabs } from "./components/session-tabs";
import { ArchipelagoToastService } from "./factories/toast-service";
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
      //@ts-expect-error ts(7006)
      controller: ($scope, backendCommunicator, apToast) => {
        $scope.sessionId = undefined;
        $scope.sessionStatus = null;

        $scope.changeSession = async (sessionId?: string) => {
          $scope.sessionId = sessionId;

          $scope.sessionStatus = await backendCommunicator.fireEventAsync(
            "oceanity:archipelago:get-session-status",
            sessionId,
          );

          if (!sessionId) {
            $scope.currentSession = undefined;
            return;
          }

          $scope.currentSession = $scope.sessions.find(
            (session: SessionConnection) => session.id === sessionId,
          );
        };

        // Load current data
        backendCommunicator
          .fireEventAsync("oceanity:archipelago:get-session-connections")
          .then((table: Array<SessionConnection>) => {
            $scope.sessions = table;

            if ($scope.sessions.length) {
              $scope.changeSession($scope.sessions[0].id);
            }
          });

        backendCommunicator.on(
          "oceanity:archipelago:session-status-updated",
          ({
            sessionId,
            status,
          }: {
            sessionId: string;
            status: SessionStatus;
          }) => {
            const session = $scope.sessions.find(
              (session: SessionConnection) => session.id === sessionId,
            );

            if (!session) {
              return;
            }

            session.status = status;

            if (status === "could-not-connect") {
              apToast.send(`Unable to connect to session '${session.handle}'`);
              return;
            }
          },
        );

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
    factories: [ArchipelagoToastService],
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
