import { AngularJsComponent } from "@crowbartools/firebot-types";
import template from "./chat-feed.html";

export const ArchipelagoChatFeed: AngularJsComponent = {
  name: "archipelagoChatFeed",

  bindings: {
    sessionId: "<",
  },

  template,

  controller: ($scope: any, backendCommunicator: any) => {
    $scope.$ctrl.glued = true;
    $scope.$ctrl.forceGlued = false;
    $scope.$ctrl.messages = [];

    $scope.$ctrl.fetchMessageLog = async () => {
      if (!$scope.$ctrl.sessionId) {
        return;
      }

      $scope.$ctrl.messages = await backendCommunicator.fireEventAsync(
        "oceanity:archipelago:get-html-message-log",
        $scope.$ctrl.sessionId,
      );
    };

    $scope.$ctrl.handleKeydown = ($event: KeyboardEvent) => {
      if (($event.which || $event.keyCode) === 13) {
        $scope.$ctrl.connect();
      }
    };

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.messages = [];
    };

    $scope.$ctrl.$onChanges = async (changes: any) => {
      if (changes.sessionId) {
        await $scope.$ctrl.fetchMessageLog();
      }
    };

    backendCommunicator.on(
      "oceanity:archipelago:got-html-log-message",
      ({ sessionId, html }: { sessionId: string; html: string }) => {
        if ($scope.$ctrl.sessionId === sessionId) {
          $scope.$ctrl.messages.push(html);
        }
      },
    );

    backendCommunicator.on(
      "oceanity:archipelago:chat-cleared",
      (sessionId: string) => {
        if ($scope.$ctrl.sessionId === sessionId) {
          $scope.$ctrl.clear();
        }
      },
    );
  },
};
