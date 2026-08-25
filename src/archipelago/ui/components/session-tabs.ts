import { AngularJsComponent } from "@crowbartools/firebot-types";
import {
  ContextMenuEntry,
  SessionConnection,
  SessionTableEntry,
} from "../../../types";
import template from "./session-tabs.html";

export const ArchipelagoSessionTabs: AngularJsComponent = {
  name: "archipelagoSessionTabs",

  bindings: {
    selected: "<",
    onSessionChanged: "&",
  },

  template,

  controller: ($scope: any, backendCommunicator: any) => {
    $scope.$ctrl.sessionTable = [];

    $scope.$ctrl.fetchSessionTable = async () => {
      backendCommunicator
        .fireEventAsync("oceanity:archipelago:get-session-table")
        .then(async (sessionTable: Array<SessionTableEntry>) => {
          $scope.$ctrl.sessionTable = sessionTable;

          if ($scope.$ctrl.sessionTable.length) {
            await $scope.$ctrl.changeSession($scope.$ctrl.sessionTable[0].id);
          }
        });
    };

    $scope.$ctrl.changeSession = async (sessionId: string) => {
      if (sessionId === $scope.$ctrl.selected) {
        return;
      }

      const handle = $scope.$ctrl.sessionTable.find(
        (session: SessionTableEntry) => session.id === sessionId,
      )?.handle;

      $scope.$ctrl.onSessionChanged({
        sessionId,
        handle,
      });
    };

    $scope.$ctrl.disconnect = async (sessionId: string) => {
      backendCommunicator
        .fireEventAsync("oceanity:archipelago:disconnect", sessionId)
        .then(() => {
          const removedIndex = $scope.$ctrl.sessionTable.findIndex(
            (session: SessionTableEntry) => session.id === sessionId,
          );

          if (removedIndex === -1) {
            return;
          }

          $scope.$ctrl.sessionTable.splice(removedIndex, 1);

          if ($scope.$ctrl.selected === sessionId) {
            const sessionIds = $scope.$ctrl.sessionTable.map(
              (session: SessionConnection) => session.id,
            );

            $scope.$ctrl.changeSession(sessionIds.shift());
          }
        });
    };

    $scope.$ctrl.getMenuItems = (session: SessionTableEntry) => {
      const items: Array<ContextMenuEntry> = [
        {
          html: "<a href><i class='far fa-clone' style='margin-right: 10px'></i> Copy Session Id</a>",
          click: () => {
            navigator.clipboard.writeText(session.id);
          },
        },
        {
          html: "<a href style='color: #fb7373;'><i class='far fa-trash-alt' style='margin-right: 10px'></i> Disconnect</a>",
          hasTopDivider: true,
          click: () => {
            $scope.$ctrl.disconnect(session.id);
          },
        },
      ];

      return items;
    };

    $scope.$ctrl.fetchSessionTable();

    backendCommunicator.on(
      "oceanity:archipelago:session-opened",
      (newSession: SessionConnection) => {
        const existingSession = $scope.$ctrl.sessionTable.find(
          (session: SessionTableEntry) => session.id === newSession.id,
        );

        if (!!existingSession) {
          return;
        }

        $scope.$ctrl.sessionTable.push({
          id: newSession.id,
          handle: newSession.handle,
        });

        $scope.$ctrl.changeSession(newSession.id);
      },
    );
  },
};
