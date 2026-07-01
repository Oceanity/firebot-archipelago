import { AngularJsComponent } from "@crowbartools/firebot-types";
import template from "./connection-panel.html";

export const ArchipelagoConnectionPanel: AngularJsComponent = {
  name: "archipelagoConnectionPanel",

  bindings: {
    connecting: "<",
    onConnect: "&",
  },

  template,

  controller: ($scope: any) => {
    $scope.$ctrl.hostname = "";
    $scope.$ctrl.slot = "";
    $scope.$ctrl.password = "";

    $scope.$ctrl.connect = async () => {
      const success = await $scope.$ctrl.onConnect({
        hostname: $scope.$ctrl.hostname,
        slot: $scope.$ctrl.slot,
        password: $scope.$ctrl.password,
      });

      if (success) {
        $scope.$ctrl.clear();
      }
    };

    $scope.$ctrl.handleKeydown = ($event: KeyboardEvent) => {
      if (($event.which || $event.keyCode) === 13) {
        $scope.$ctrl.connect();
      }
    };

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.hostname = "";
      $scope.$ctrl.slot = "";
      $scope.$ctrl.password = "";
      $scope.$ctrl.test = "start";
    };
  },
};
