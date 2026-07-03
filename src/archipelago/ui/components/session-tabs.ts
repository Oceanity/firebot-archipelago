import { AngularJsComponent } from "@crowbartools/firebot-types";
import { SessionConnection, SessionTableEntry } from "../../../types";
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
      $scope.$ctrl.sessionTable = await backendCommunicator.fireEventAsync(
        "oceanity:archipelago:get-session-table",
      );

      if ($scope.$ctrl.sessionTable.length) {
        await $scope.$ctrl.changeSession($scope.$ctrl.sessionTable[0].id);
      }
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
      await backendCommunicator.fireEventAsync(
        "oceanity:archipelago:disconnect",
        sessionId,
      );

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
