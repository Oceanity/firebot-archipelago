import { UIExtension } from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";
import { ARCHIPELAGO_INTEGRATION_ID } from "./constants";

export const ArchipelagoUIExtension: UIExtension = {
  id: ARCHIPELAGO_INTEGRATION_ID,
  pages: [
    {
      id: `${ARCHIPELAGO_INTEGRATION_ID}-main`,
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

          .item-entry.received { color: #00ff7f; }
          .location-entry.checked { color: #6d8be8; text-decoration: line-through; font-style: italic; }

          .arg { color: #6d8be8; }

          p {
            margin: 0;
          }

          .archipelago-message {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 0.75rem;
          }
        </style>
        <div style="display: flex; flex-direction: column; height: 100%">
          <div class="chat-window-column m-6" style="border-radius: 8px; overflow: hidden;">

            <div class="p-6" style="display: flex; gap: 1.5rem">
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Server Hostname"
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
                type="text"
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
                  ng-repeat="slotName in slots"
                  role="presentation"
                  ng-class="{'active' : selectedSession === slotName}"
                  ng-click="selectSlot(slotName)"
                >
                  <a href>{{ slotName }}</a>
                </li>
              </ul>
            </div>

            <div
              tab-index="-1"
              ng-click="scrollGlued = false"
              ng-blur="scrollGlued = true"
              style="display: flex; flex: 1; flex-direction: column; overflow-x: hidden; position: relative; font-size: 16px; background: rgba(0,0,0,0.65);">
              <div scroll-glue="scrollGlued" style="display: flex; flex-direction: column; margin-top: auto; overflow-y: auto;">
                <div ng-repeat="message in messages track by $index">
                  <hr style="margin: 0; border-color: rgba(93, 93, 93, 0.2);" />
                  <div class="p-3 archipelago-message" ng-bind-html="message"></div>
                </div>
              </div>
            </div>

            <div class="p-6" style="display: flex; gap: 1.5rem">
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
      controller: ($scope, backendCommunicator) => {
        $scope.selectSlot = (slot: string) => {
          $scope.selectedSession = slot;
          $scope.messages = backendCommunicator.fireEventSync(
            "archipelago:getMessageLog",
            $scope.selectedSession
          );
        };

        $scope.key = "";
        $scope.hostname = "";
        $scope.slot = "";
        $scope.password = "";
        $scope.chatText = "";
        $scope.selectedSession = "";
        $scope.messages = [];
        $scope.scrollGlued = true;
        $scope.isConnecting = false;

        // Load current data
        $scope.slots = backendCommunicator.fireEventSync(
          "archipelago:getSessionNames"
        );

        if ($scope.slots.length) {
          $scope.selectSlot($scope.slots[0]);
        }

        backendCommunicator.on(
          "archipelago:gotLogMessage",
          (data: {
            message: { text: string; html: string };
            sessionName: string;
          }) => {
            const { message, sessionName } = data;

            if (sessionName !== $scope.selectedSession) {
              return;
            }

            $scope.messages.push(message.html);
          }
        );

        $scope.slotChanged = async () => {
          $scope.messages = await backendCommunicator.fireEventAsync(
            "archipelago:getMessageLog",
            $scope.selectedSession
          );
        };

        $scope.handleChatKeydown = async ($event: KeyboardEvent) => {
          const keyCode = $event.which || $event.keyCode;
          if (keyCode === 13) {
            await $scope.sendMessage();
          }
        };

        $scope.handleConnectKeydown = async ($event: KeyboardEvent) => {
          const keyCode = $event.which || $event.keyCode;
          if (keyCode === 13) {
            await $scope.connect();
          }
        };

        $scope.sendMessage = async () => {
          if ($scope.chatText === "") {
            return;
          }

          try {
            backendCommunicator.fireEventSync("archipelago:sendMessage", {
              sessionName: $scope.selectedSession,
              message: $scope.chatText,
            });

            $scope.chatText = "";
          } catch (error) {
            return;
          }
        };

        $scope.connect = async () => {
          if ($scope.slot === "" || $scope.hostname === "") {
            return;
          }

          $scope.isConnecting = true;

          const result = await backendCommunicator.fireEventAsync(
            "archipelago:connect",
            {
              hostname: $scope.hostname,
              slot: $scope.slot,
              password: $scope.password,
            }
          );

          if (!result || !result.success) {
            // Oshi TODO: Show error to user
            $scope.isConnecting = false;
            return;
          }

          $scope.slots = backendCommunicator.fireEventSync(
            "archipelago:getSessionNames"
          );

          $scope.selectSlot(result.name);

          $scope.hostname = "";
          $scope.slot = "";
          $scope.password = "";
          $scope.isConnecting = false;
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
