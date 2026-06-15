import { UIExtension } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "./constants";
import { RetrievedSession, ServiceResponse, SessionConnection } from "./types";
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
        $scope.alerts = [];
        $scope.sessionData = {};
        $scope.messages = {};
        $scope.scrollGlued = true;
        $scope.forceGlued = false;
        $scope.isConnecting = false;

        $scope.selectSlot = (sessionId: string) => {
          if (!sessionId) {
            delete $scope.selectedSession;
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

          $scope.selectedSession = sessionId;
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

          delete $scope.chatText;
          delete $scope.chatHistoryIndex;
        };

        // Load current data
        backendCommunicator
          .fireEventAsync("oceanity:archipelago:get-session-table")
          .then((table: Record<string, SessionConnection>) => {
            $scope.sessions = table;

            if (Object.keys($scope.sessions).length) {
              $scope.selectSlot(Object.keys($scope.sessions)[0]);
            }
          });

        backendCommunicator.on(
          "oceanity:archipelago:session-closed",
          (sessionId: string) => {
            delete $scope.sessionData[sessionId];
            delete $scope.sessions[sessionId];

            if ($scope.selectedSession === sessionId) {
              const sessionIds = Object.keys($scope.sessions);

              $scope.selectSlot(
                !!sessionIds.length ? sessionIds.shift() : undefined,
              );
            }
          },
        );

        backendCommunicator.on(
          "oceanity:archipelago:got-log-message",
          (data: {
            message: { text: string; html: string };
            sessionId: string;
          }) => {
            $scope.messages[data.sessionId]?.push(data.message.html);
          },
        );

        backendCommunicator.on(
          "oceanity:archipelago:chat-cleared",
          (data: { sessionId: string }) => {
            $scope.messages[data.sessionId] = [];
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
          $scope.error = undefined;

          if (!$scope.hostname) {
            return $scope.sendToast("Hostname is required.", "danger");
          } else if (!$scope.slot) {
            return $scope.sendToast("Slot name is required.", "danger");
          }

          $scope.isConnecting = true;

          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:connect",
              $scope.hostname,
              $scope.slot,
              $scope.password,
            )
            .then((response: ServiceResponse<RetrievedSession>) => {
              if (!response.success) {
                $scope.isConnecting = false;
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
              $scope.sessions[id] = {
                name,
                handle,
                status,
                ...(password ? { password } : {}),
              };
              $scope.selectSlot(id);

              $scope.hostname = "";
              $scope.slot = "";
              $scope.password = "";
              $scope.isConnecting = false;

              $scope.sendToast(
                `Successfully connected to '${response.data.handle}'`,
                "success",
              );
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
                .fireEventAsync("oceanity:archipelago:get-chat-history", {
                  sessionId: $scope.selectedSession,
                  entry:
                    $scope.chatHistoryIndex !== undefined
                      ? $scope.chatHistoryIndex - 1
                      : undefined,
                })
                .then((data: [string, number]) => {
                  const [message, entry] = data;
                  $scope.chatText = message;
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
                .fireEventAsync("oceanity:archipelago:get-chat-history", {
                  sessionId: $scope.selectedSession,
                  entry: $scope.chatHistoryIndex + 1,
                })
                .then((data: [string, number]) => {
                  const [message, entry] = data;

                  $scope.chatText = message;
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

        $scope.sendMessage = async () => {
          if ($scope.chatText === "") {
            return;
          }

          backendCommunicator
            .fireEventAsync(
              "oceanity:archipelago:send-message",
              $scope.selectedSession,
              $scope.chatText,
            )
            .then(() => {
              delete $scope.chatText;
              delete $scope.chatHistoryIndex;

              // Toggle forceGlued to move to bottom of box
              $scope.forceGlued = true;
              $scope.forceGlued = false;
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
