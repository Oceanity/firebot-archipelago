import { UIExtension } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../../constants";
import { SessionConnection, SessionStatus } from "../../types";
import { ArchipelagoChatFeed } from "./components/chat-feed";
import { ArchipelagoChatInput } from "./components/chat-input";
import { ArchipelagoConnectionPanel } from "./components/connection-panel";
import { ArchipelagoHintDisplay } from "./components/hint-display";
import { ArchipelagoSessionTabs } from "./components/session-tabs";
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
      controller: ($scope, backendCommunicator, ngToast) => {
        $scope.form = {
          chatText: "",
        };

        $scope.ui = {
          scrollGlued: true,
          forceGlued: false,
          isConnecting: false,
        };
        $scope.sessionData = {};
        $scope.sessionId = undefined;

        $scope.selectSlot = async (sessionId?: string) => {
          $scope.sessionId = sessionId;

          if (!sessionId) {
            $scope.currentSession = undefined;
            return;
          }

          $scope.currentSession = $scope.sessions.find(
            (session: SessionConnection) => session.id === sessionId,
          );

          $scope.form.chatText = "";
          $scope.chatHistoryIndex = undefined;
        };

        // Load current data
        backendCommunicator
          .fireEventAsync("oceanity:archipelago:get-session-connections")
          .then((table: Array<SessionConnection>) => {
            $scope.sessions = table;

            if ($scope.sessions.length) {
              $scope.selectSlot($scope.sessions[0].id);
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

            if ($scope.currentSession.id === sessionId) {
              $scope.ui.isConnecting = status === "connecting";
            }

            if (status === "could-not-connect") {
              $scope.sendToast(
                `Unable to connect to session '${session.handle}'`,
              );
              return;
            }
          },
        );

        // $scope.connect = async (
        //   hostname: string,
        //   slot: string,
        //   password?: string,
        // ): Promise<boolean> => {
        //   if (!hostname) {
        //     $scope.sendToast("Hostname is required.", "danger");
        //     return false;
        //   } else if (!slot) {
        //     $scope.sendToast("Slot name is required.", "danger");
        //     return false;
        //   }

        //   $scope.ui.isConnecting = true;

        //   const response = await backendCommunicator.fireEventAsync(
        //     "oceanity:archipelago:connect",
        //     hostname,
        //     slot,
        //     password,
        //   );

        //   $scope.ui.isConnecting = false;

        //   if (!response.success) {
        //     $scope.sendToast(
        //       response.errors?.join(", "),
        //       "danger",
        //       true,
        //       10000,
        //     );
        //     return false;
        //   }

        //   if (!$scope.sessions) {
        //     $scope.sessions = {};
        //   }

        //   const { id, handle, name, status } = response.data;

        //   $scope.sessions.push({
        //     id,
        //     name,
        //     handle,
        //     status,
        //     ...(password ? { password } : {}),
        //   });
        //   $scope.selectSlot(id);

        //   $scope.sendToast(
        //     `Successfully connected to '${response.data.handle}'`,
        //     "success",
        //   );

        //   return true;
        // };

        $scope.reconnect = (sessionId: string) => {
          backendCommunicator.fireEventAsync(
            "oceanity:archipelago:reconnect",
            sessionId,
          );
        };

        $scope.onPrevMessage = async () => {
          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:get-chat-history",
              $scope.currentSession.id,
              $scope.chatHistoryIndex !== undefined
                ? $scope.chatHistoryIndex - 1
                : undefined,
            )
            .then((data: [string, number]) => {
              const [message, entry] = data;
              if (entry === -1) {
                return;
              }
              $scope.form.chatText = message;
              $scope.chatHistoryIndex = entry;
            });
        };

        $scope.onNextMessage = async () => {
          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:get-chat-history",
              $scope.currentSession.id,
              $scope.chatHistoryIndex !== undefined
                ? $scope.chatHistoryIndex + 1
                : undefined,
            )
            .then((data: [string, number]) => {
              const [message, entry] = data;
              if (entry === -1) {
                return;
              }
              $scope.form.chatText = message;
              $scope.chatHistoryIndex = entry;
            });
        };

        $scope.count = 0;
        $scope.sendMessage = async (message: string) => {
          const success = await backendCommunicator.fireEventAsync(
            "oceanity:archipelago:send-message",
            $scope.currentSession.id,
            $scope.form.chatText,
          );

          $scope.form.chatText = "";
          $scope.chatHistoryIndex = undefined;

          // Toggle forceGlued to move to bottom of box
          $scope.$evalAsync(() => {
            $scope.ui.forceGlued = true;
            $scope.ui.forceGlued = false;
          });
        };

        $scope.sendToast = (
          message: string,
          type: "info" | "success" | "warning" | "danger" = "warning",
          dismissOnTimeout: boolean = true,
          timeout: number = 5000,
        ) => {
          ngToast.create({
            content: message,
            className: type,
            dismissOnTimeout,
            timeout: dismissOnTimeout ? timeout : undefined,
          });
        };
      },
    },
  ],
  providers: {
    factories: [],
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
