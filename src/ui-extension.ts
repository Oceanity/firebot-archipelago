import { UIExtension } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { ServiceResponse, SessionConnection, SessionStatus } from "./types";
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
          hostname: "",
          slot: "",
          password: "",
          chatText: "",
        };

        $scope.ui = {
          scrollGlued: true,
          forceGlued: false,
          isConnecting: false,
        };
        $scope.sessionData = {};
        $scope.messages = {};

        $scope.selectSlot = (sessionId: string) => {
          if (!sessionId) {
            $scope.currentSession = undefined;
            return;
          }

          if (!$scope.sessionData[sessionId]) {
            backendCommunicator
              .fireEventAsync(
                "oceanity:archipelago:get-hint-point-data",
                sessionId,
              )
              .then((data: Record<string, number>) => {
                $scope.sessionData[sessionId] = data;
              });
          }

          $scope.currentSession = $scope.sessions.find(
            (session: SessionConnection) => session.id === sessionId,
          );
          if (!$scope.messages[sessionId]) {
            backendCommunicator
              .fireEventAsync(
                "oceanity:archipelago:get-html-message-log",
                sessionId,
              )
              .then((log: Array<string>) => {
                $scope.messages[sessionId] = log;
              });
          }

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
          },
        );

        backendCommunicator.on(
          "oceanity:archipelago:session-closed",
          (sessionId: string) => {
            const sessionIndex = $scope.sessions.findIndex(
              (session: SessionConnection) => session.id === sessionId,
            );

            if (sessionIndex === -1) {
              return;
            }

            $scope.sessions.splice(sessionIndex, 1);
            $scope.sessionData[sessionId] = undefined;

            if ($scope.currentSession.id === sessionId) {
              const sessionIds = $scope.sessions.map(
                (session: SessionConnection) => session.id,
              );

              if (!!sessionIds.length) {
                $scope.selectSlot(sessionIds.shift());
              }
            }
          },
        );

        backendCommunicator.on(
          "oceanity:archipelago:got-html-log-message",
          (data: { sessionId: string; html: string }) => {
            $scope.messages[data.sessionId]?.push(data.html);
          },
        );

        backendCommunicator.on(
          "oceanity:archipelago:chat-cleared",
          (sessionId: string) => {
            $scope.messages[sessionId] = [];
          },
        );

        backendCommunicator.on(
          "oceanity:archipelago:hints-updated",
          (data: Record<string, any>) => {
            const { sessionId, ...hintData } = data;
            $scope.sessionData[sessionId] = {
              ...$scope.sessionData[sessionId],
              ...hintData,
            };
          },
        );

        $scope.connect = async () => {
          if (!$scope.form.hostname) {
            return $scope.sendToast("Hostname is required.", "danger");
          } else if (!$scope.form.slot) {
            return $scope.sendToast("Slot name is required.", "danger");
          }

          $scope.ui.isConnecting = true;

          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:connect",
              $scope.form.hostname,
              $scope.form.slot,
              $scope.form.password,
            )
            .then((response: ServiceResponse<SessionConnection>) => {
              if (!response.success) {
                $scope.ui.isConnecting = false;
                return $scope.sendToast(
                  response.errors?.join(", "),
                  "danger",
                  true,
                  10000,
                );
              }

              if (!$scope.messages) {
                $scope.messages = {};
              }

              if (!$scope.sessions) {
                $scope.sessions = {};
              }

              const { id, handle, name, password, status } = response.data;

              $scope.messages[handle] = [];
              $scope.sessions.push({
                id,
                name,
                handle,
                status,
                ...(password ? { password } : {}),
              });
              $scope.selectSlot(id);

              $scope.form.hostname = "";
              $scope.form.slot = "";
              $scope.form.password = "";
              $scope.ui.isConnecting = false;

              $scope.sendToast(
                `Successfully connected to '${response.data.handle}'`,
                "success",
              );
            });
        };

        $scope.reconnect = (sessionId: string) => {
          $scope.ui.isConnecting = true;
          backendCommunicator
            .fireEventAsync("oceanity:archipelago:reconnect", sessionId)
            .then((status: SessionStatus | null) => {
              $scope.ui.isConnecting = false;

              if (!status) {
                $scope.sendToast("Unable to connect to session");
                return;
              }

              const session = $scope.sessions.find(
                (session: SessionConnection) => session.id === sessionId,
              );
              if (!session) {
                $scope.sendToast("Cannot find session information for session");
                return;
              }

              session.status = status;
              if ($scope.currentSession.id !== session.id) {
                $scope.selectSlot(session.id);
              }
            });
        };

        $scope.disconnect = (sessionId: string) => {
          backendCommunicator.fireEventAsync(
            "oceanity:archipelago:disconnect",
            sessionId,
          );
        };

        $scope.handleChatKeydown = async ($event: KeyboardEvent) => {
          const keyCode = $event.which || $event.keyCode;
          switch (keyCode) {
            // Enter Key
            case 13: {
              await $scope.sendMessage();
              break;
            }

            // Up Arrow
            case 38: {
              $event.preventDefault();
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
              break;
            }

            // Down Arrow
            case 40: {
              $event.preventDefault();
              if ($scope.chatHistoryIndex === undefined) {
                return;
              }

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
              break;
            }
          }
        };

        $scope.handleConnectKeydown = async ($event: KeyboardEvent) => {
          const keyCode = $event.which || $event.keyCode;

          // Enter Key
          if (keyCode === 13) {
            await $scope.connect();
          }
        };

        $scope.count = 0;
        $scope.sendMessage = async () => {
          $scope.debug = `Triggered ${$scope.count++} times, message: ${$scope.form.chatText}`;

          if ($scope.form.chatText === "") {
            return;
          }

          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:send-message",
              $scope.currentSession.id,
              $scope.form.chatText,
            )
            .then(() => {
              $scope.form.chatText = "";
              $scope.chatHistoryIndex = undefined;

              // Toggle forceGlued to move to bottom of box
              $scope.$evalAsync(() => {
                $scope.ui.forceGlued = true;
                $scope.ui.forceGlued = false;
              });
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
    components: [],
    directives: [],
    filters: [],
  },
};
