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
    $scope.$ctrl.messageHistoryIndex = -1;

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
      $scope.$ctrl.$evalAsync(() => {
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
          await $scope.$ctrl.onPrevMessage();
          break;
        }

        // Down Arrow
        case 40: {
          $event.preventDefault();
          await $scope.$ctrl.onNextMessage();
          break;
        }
      }
    };

    $scope.$ctrl.onPrevMessage = async () => {
      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-chat-history",
          $scope.$ctrl.sessionId,
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

    $scope.$ctrl.onNextMessage = async () => {
      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-chat-history",
          $scope.$ctrl.sessionId,
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

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.message = "";
      $scope.$ctrl.messageHistoryIndex = -1;
    };
  },
};
