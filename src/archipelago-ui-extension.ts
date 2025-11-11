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
        </style>
        <div style="display: flex; flex-direction: column; height: 100%">
          <div class="chat-window-column m-6" style="border-radius: 8px; overflow: hidden;">

            <div class="p-6" style="display: flex; gap: 1.5rem">
              <dropdown-select
                ng-if="slots.length > 0"
                options="slots"
                selected="selectedSlot"
                on-update="slotChanged()"></dropdown-select>
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Server Hostname"
                disable-variable-menu="true"
                ng-model="hostname"
                ng-keydown="handleConnectKeydown($event)"
                style="flex: 1 0 40%" />
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Player Slot"
                disable-variable-menu="true"
                ng-model="slot"
                ng-keydown="handleConnectKeydown($event)" />
              <input
                type="text"
                class="form-control ng-animate-disabled"
                placeholder="Password (optional)"
                disable-variable-menu="true"
                ng-model="password"
                ng-keydown="handleConnectKeydown($event)" />
              <button
                class="btn btn-primary"
                  ng-click="connect()">
                  <i class="fas fa-plus-circle" class="mr-2"></i> Connect
                </button>
            </div>

            <div
              style="display: flex; flex: 1; flex-direction: column; overflow-x: hidden; position: relative; font-size: 16px; background: rgba(0,0,0,0.65);">
              <div scroll-glue="scrollGlued" style="display: flex; flex-direction: column; margin-top: auto; overflow-y: auto;">
                <div ng-repeat="message in messages track by $index">
                  <hr style="margin: 0; border-color: rgba(93, 93, 93, 0.2);" />
                  <div class="p-3" ng-bind-html="message"></div>
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
        $scope.connect = function () {};
        $scope.key = "";
        $scope.hostname = "";
        $scope.slot = "";
        $scope.password = "";
        $scope.selectedSlot = "";
        $scope.scrollGlued = true;
        $scope.slots = backendCommunicator.fireEventSync(
          "archipelago:getSlotNames"
        );

        if ($scope.slots.length) {
          $scope.selectedSlot = $scope.slots[0];
          $scope.messages = backendCommunicator.fireEventSync(
            "archipelago:getMessageLog",
            $scope.selectedSlot
          );
        }

        $scope.chatText = "";

        backendCommunicator.on(
          "archipelago:gotLogMessage",
          (message: unknown) => {
            $scope.messages.push(message);
          }
        );

        $scope.slotChanged = () => {
          $scope.messages = backendCommunicator.fireEventSync(
            "archipelago:getMessageLog",
            $scope.selectedSlot
          );
        };

        $scope.handleChatKeydown = ($event: KeyboardEvent) => {
          const keyCode = $event.which || $event.keyCode;
          if (keyCode === 13) {
            $scope.sendMessage();
          }
        };

        $scope.handleConnectKeydown = ($event: KeyboardEvent) => {
          const keyCode = $event.which || $event.keyCode;
          if (keyCode === 13) {
            $scope.connect();
          }
        };

        $scope.sendMessage = async () => {
          if ($scope.chatText === "") {
            return;
          }

          try {
            backendCommunicator.fireEventSync("archipelago:sendMessage", {
              slot: $scope.selectedSlot,
              message: $scope.chatText,
            });

            $scope.chatText = "";
          } catch (error) {
            return;
          }
        };

        $scope.connect = async () => {
          if ($scope.slot === "" || $scope.hostname === "") {
            $scope.hostname = "";
            return;
          }

          $scope.password = "Test";

          try {
            $scope.password = "Test2";

            const result = await backendCommunicator.fireEventAsync(
              "archipelago:connect",
              {
                hostname: $scope.hostname,
                slot: $scope.slot,
                password: $scope.password,
              }
            );

            if (!result) {
              return;
            }

            $scope.password = "Test3";

            $scope.slots = backendCommunicator.fireEventSync(
              "archipelago:getSlotNames"
            );

            $scope.password = "Test4";

            $scope.selectedSlot = $scope.slot;

            $scope.hostname = "";
            $scope.slot = "";
            $scope.password = "";
          } catch (error) {
            $scope.sendMessage($scope.selectedSlot, `${error}`);
            return;
          }
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
