import { AngularJsComponent } from "@crowbartools/firebot-types";
import template from "./chat-input.html";

export const ArchipelagoChatInput: AngularJsComponent = {
  name: "archipelagoChatInput",

  bindings: {
    sessionId: "<",
    onMessageSent: "&",
  },

  template,

  controller: ($scope: any, backendCommunicator: any) => {
    $scope.$ctrl.message = "";

    $scope.$ctrl.sendMessage = async () => {
      if (!$scope.$ctrl.message) {
        return false;
      }

      const success = await backendCommunicator.fireEventAsync(
        "oceanity:archipelago:send-message",
        $scope.$ctrl.sessionId,
        $scope.$ctrl.message,
      );

      $scope.$ctrl.clear();

      // Toggle forceGlued to move to bottom of box
      $scope.$evalAsync(() => {
        $scope.$ctrl.forceGlued = true;
        $scope.$ctrl.forceGlued = false;
      });

      if (success) {
        $scope.$ctrl.clear();
      }
    };

    $scope.$ctrl.handleKeydown = async ($event: KeyboardEvent) => {
      const keyCode = $event.which || $event.keyCode;

      switch (keyCode) {
        // Enter Key
        case 13: {
          await $scope.$ctrl.sendMessage();
          break;
        }
        // Up Arrow
        case 38: {
          $event.preventDefault();
          await $scope.$ctrl.onPreviousChatHistory();
          break;
        }

        // Down Arrow
        case 40: {
          $event.preventDefault();
          await $scope.$ctrl.onNextChatHistory();
          break;
        }
      }
    };

    $scope.$ctrl.onPreviousChatHistory = async () => {
      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-previous-chat-history",
          $scope.$ctrl.sessionId,
        )
        .then((message: string) => {
          $scope.$ctrl.message = message;
        });
    };

    $scope.$ctrl.onNextChatHistory = async () => {
      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-next-chat-history",
          $scope.$ctrl.sessionId,
        )
        .then((message: string) => {
          $scope.$ctrl.message = message;
        });
    };

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.message = "";
      $scope.$ctrl.messageHistoryIndex = -1;
    };
  },
};
