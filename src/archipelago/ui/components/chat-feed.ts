import { AngularJsComponent } from "@crowbartools/firebot-types";
import { ContextMenuEntry } from "../../../types";
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

      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-message-log",
          $scope.$ctrl.sessionId,
        )
        .then((messages: Array<{ html: string; text: string }>) => {
          $scope.$ctrl.messages = messages;
        });
    };

    $scope.$ctrl.handleKeydown = ($event: KeyboardEvent) => {
      if (($event.which || $event.keyCode) === 13) {
        $scope.$ctrl.connect();
      }
    };

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.messages = [];
    };

    $scope.$ctrl.getMenuItems = (message: { html: string; text: string }) => {
      const items: ContextMenuEntry[] = [
        {
          html: "<a href><i class='far fa-clone' style='margin-right: 10px'></i> Copy Text</a>",
          click: () => {
            navigator.clipboard.writeText(message.text);
          },
        },
      ];

      return items;
    };

    $scope.$ctrl.$onChanges = async (changes: any) => {
      if (changes.sessionId) {
        await $scope.$ctrl.fetchMessageLog();
      }
    };

    backendCommunicator.on(
      "oceanity:archipelago:got-log-message",
      ({
        sessionId,
        html,
        text,
      }: {
        sessionId: string;
        html: string;
        text: string;
      }) => {
        if ($scope.$ctrl.sessionId === sessionId) {
          $scope.$ctrl.messages.push({
            html,
            text,
          });
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
