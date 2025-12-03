import { UIExtension } from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";
import { ARCHIPELAGO_CLIENT_ID } from "./constants";
import { ServiceResponse } from "./types";

export const ArchipelagoUIExtension: UIExtension = {
  id: ARCHIPELAGO_CLIENT_ID,
  pages: [
    {
      id: `${ARCHIPELAGO_CLIENT_ID}-main`,
      name: "Archipelago",
      icon: "fa-island-tropical",
      fullPage: true,
      disableScroll: true,
      type: "angularjs",
      template: `
        <style>
          .red { color: #ff0000; }
          .green { color: #00ff7f; }
          .blue { color: #6495ed; }
          .yellow { color: #fafad2; }
          .magenta { color: #ee00ee; }
          .cyan { color: #00eeee; }
          .slateblue { color: #6d8be8; }
          .plum { color: #af99ef; }
          .salmon { color: #fa8072; }
          .orange { color: #ff7700; }

          .player { color: #fafad2; }
          .player.self { color: #ee00ee; }
          .item { color: #00eeee; }
          .item.progression { color: #af99ef; }
          .item.useful { color: #6d8be8; }
          .item.trap { color: #fa8072; }
          .location { color: #00ff7f; }
          .deathlink { color: #fa8072; }

          .item-entry.received { color: #00ff7f; }
          .location-entry.checked { color: #6d8be8; text-decoration: line-through; font-style: italic; }

          .arg { color: #6d8be8; }

          p {
            margin: 0;
          }

          .archipelago-message {
            line-height: 2.5rem;
          }
          
          .archipelago-message span {
            white-space: pre-wrap;
          }
        </style>
        <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div class="chat-window-column m-6" style="border-radius: 8px; overflow: hidden;">

            <div class="p-6" style="display: flex; gap: 1.5rem">
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Server Hostname (eg. archipelago.gg:12345)"
                disable-variable-menu="true"
                ng-disabled="isConnecting"
                ng-model="hostname"
                ng-keydown="handleConnectKeydown($event)"
                style="flex: 1 0 40%" />
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Slot Name"
                disable-variable-menu="true"
                ng-disabled="isConnecting"
                ng-model="slot"
                ng-keydown="handleConnectKeydown($event)" />
              <input
                type="password"
                class="form-control ng-animate-disabled"
                placeholder="Password (optional)"
                disable-variable-menu="true"
                ng-disabled="isConnecting"
                ng-model="password"
                ng-keydown="handleConnectKeydown($event)" />
              <button
                class="btn btn-primary"
                ng-disabled="isConnecting"
                ng-click="connect()">
                  <i class="fas fa-plus-circle" class="mr-2"></i> {{ isConnecting ? "Connecting" : "Connect" }}
                </button>
            </div>

            <div class="fb-tab-wrapper">
              <ul class="nav nav-tabs fb-tabs">
                <li
                  ng-repeat="(sessionId, sessionName) in sessions track by $index"
                  role="presentation"
                  ng-class="{'active' : selectedSession === sessionId}"
                  ng-click="selectSlot(sessionId)"
                >
                  <a href style="display: flex; align-items: center; gap: 10px;"><span>{{ sessionName }}</span><button class="close" ng-click="disconnect(sessionId)"><i class="fal fa-times" style="display: flex; align-items: center; font-size: 14px; color: #66666655"></i></button></a>
                </li>
              </ul>
            </div>

            <div
              tab-index="-1"
              ng-click="scrollGlued = false"
              ng-blur="scrollGlued = true"
              style="display: flex; flex: 1; flex-direction: column; overflow-x: hidden; position: relative; font-size: 16px; color:#fff; background: rgba(0,0,0,0.65);cursor: default;">
              <div scroll-glue="scrollGlued" force-glue="forceGlued" style="display: flex; flex-direction: column; margin-top: auto; overflow-y: auto;">
                <div ng-repeat="message in messages[selectedSession] track by $index">
                  <hr style="margin: 0; border-color: rgba(93, 93, 93, 0.2);" />
                  <div class="p-3 archipelago-message" ng-bind-html="message"></div>
                </div>
              </div>
            </div>

            <div class="p-6" style="display: flex; gap: 1.5rem">
              <div class="hints-container" style="flex-basis: 100px; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <span style="font-size: 16px; font-weight:600; letter-spacing: 0.075rem;">Hints: {{ sessionData[selectedSession].hints }}</span>
                <uib-progressbar
                  type="warning"
                  tooltip-placement="top"
                  uib-tooltip="Hint Points: {{sessionData[selectedSession].hintPoints % sessionData[selectedSession].hintCost}} / {{sessionData[selectedSession].hintCost}}"
                  class="progress-striped active"
                  max="sessionData[selectedSession].hintCost"
                  value="sessionData[selectedSession].hintPoints % sessionData[selectedSession].hintCost"
                  style="margin: 0; width: 100%; height:10px;" />
              </div>
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Enter chat message or command"
                disable-variable-menu="true"
                ng-model="chatText"
                ng-keydown="handleChatKeydown($event)"
                style="flex: 1" />
              <button class="btn btn-primary" ng-click="sendMessage()">Send</button>
            </div>

          </div>
        </div>
      `,
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
              .fireEventAsync("archipelago:getHints", sessionId)
              .then((data: Record<string, number>) => {
                $scope.sessionData[sessionId] = data;
              });
          }

          $scope.selectedSession = sessionId;
          if (!$scope.messages[sessionId]) {
            $scope.messages[sessionId] = backendCommunicator.fireEventSync(
              "archipelago:getHtmlMessageLog",
              sessionId
            );
          }

          delete $scope.chatText;
          delete $scope.chatHistoryIndex;
        };

        // Load current data
        $scope.sessions = backendCommunicator.fireEventSync(
          "archipelago:getSessionTable"
        );

        if (Object.keys($scope.sessions).length) {
          $scope.selectSlot(Object.keys($scope.sessions)[0]);
        }

        backendCommunicator.on(
          "archipelago:disconnected",
          (sessionId: string) => {
            delete $scope.sessionData[sessionId];
            delete $scope.sessions[sessionId];

            if ($scope.selectedSession === sessionId) {
              const sessionIds = Object.keys($scope.sessions);

              $scope.selectSlot(
                !!sessionIds.length ? sessionIds.shift() : undefined
              );
            }
          }
        );

        backendCommunicator.on(
          "archipelago:gotLogMessage",
          (data: {
            message: { text: string; html: string };
            sessionId: string;
          }) => {
            $scope.messages[data.sessionId]?.push(data.message.html);
          }
        );

        backendCommunicator.on(
          "archipelago:chatCleared",
          (data: { sessionId: string }) => {
            $scope.messages[data.sessionId] = [];
          }
        );

        backendCommunicator.on(
          "archipelago:hintsUpdated",
          (data: {
            sessionId: string;
            hints: number;
            hintPoints: number;
            hintCost: number;
          }) => {
            const { sessionId, ...hintData } = data;
            $scope.sessionData[sessionId] = {
              ...$scope.sessionData[sessionId],
              ...hintData,
            };
          }
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
            .fireEventAsync("archipelago:connect", {
              hostname: $scope.hostname,
              slot: $scope.slot,
              password: $scope.password,
            })
            .then((response: ServiceResponse<{ name: string; id: string }>) => {
              if (!response.success) {
                $scope.isConnecting = false;
                return $scope.sendToast(
                  response.errors?.join(", "),
                  "danger",
                  true,
                  10000
                );
              }

              $scope.messages[response.data.name] = [];
              $scope.sessions[response.data.id] = response.data.name;
              $scope.selectSlot(response.data.id);

              delete $scope.hostname;
              delete $scope.slot;
              delete $scope.password;
              $scope.isConnecting = false;

              $scope.sendToast(
                `Successfully connected to '${response.data.name}'`,
                "success"
              );
            });
        };

        $scope.disconnect = (sessionId: string) => {
          backendCommunicator.fireEventAsync(
            "archipelago:disconnect",
            sessionId
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
              const [message, entry] = backendCommunicator.fireEventSync(
                "archipelago:getChatHistory",
                {
                  sessionId: $scope.selectedSession,
                  entry:
                    $scope.chatHistoryIndex !== undefined
                      ? $scope.chatHistoryIndex - 1
                      : undefined,
                }
              );

              $scope.chatText = message;
              $scope.chatHistoryIndex = entry;
              break;
            }

            // Down Arrow
            case 40: {
              $event.preventDefault();
              if ($scope.chatHistoryIndex === undefined) {
                return;
              }

              const [message, entry] = backendCommunicator.fireEventSync(
                "archipelago:getChatHistory",
                {
                  sessionId: $scope.selectedSession,
                  entry: $scope.chatHistoryIndex + 1,
                }
              );

              $scope.chatText = message;
              $scope.chatHistoryIndex = entry;
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
            .fireEventAsync("archipelago:sendMessage", {
              sessionId: $scope.selectedSession,
              message: $scope.chatText,
            })
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
          timeout: number = 5000
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
