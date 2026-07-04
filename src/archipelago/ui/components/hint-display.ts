import { AngularJsComponent } from "@crowbartools/firebot-types";
import { HintData } from "../../../types";
import template from "./hint-display.html";

export const ArchipelagoHintDisplay: AngularJsComponent = {
  name: "archipelagoHintDisplay",

  bindings: {
    sessionId: "<",
  },

  template,

  controller: ($scope: any, backendCommunicator: any) => {
    $scope.$ctrl.hostname = "";
    $scope.$ctrl.slot = "";
    $scope.$ctrl.password = "";

    $scope.$ctrl.loadHintData = async () => {
      if (!$scope.$ctrl.sessionId) {
        return;
      }

      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-hint-point-data",
          $scope.$ctrl.sessionId,
        )
        .then((hintData: HintData) => {
          $scope.$ctrl.hintData = hintData;
          $scope.$applyAsync();
        });
    };

    $scope.$ctrl.$onChanges = async (changes: any) => {
      if (changes.sessionId) {
        await $scope.$ctrl.loadHintData();
      }
    };

    backendCommunicator.on(
      "oceanity:archipelago:hints-updated",
      (data: Record<string, any>) => {
        const { sessionId, ...hintData } = data;

        if (sessionId === $scope.$ctrl.sessionId) {
          $scope.$ctrl.hintData = hintData;

          $scope.$applyAsync();
        }
      },
    );
  },
};
