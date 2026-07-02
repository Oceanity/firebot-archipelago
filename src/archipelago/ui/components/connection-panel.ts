import { AngularJsComponent } from "@crowbartools/firebot-types";
import template from "./connection-panel.html";

export const ArchipelagoConnectionPanel: AngularJsComponent = {
  name: "archipelagoConnectionPanel",

  bindings: {
    connecting: "<",
    onConnect: "&",
  },

  template,

  controller: ($scope: any, backendCommunicator: any, ngToast: any) => {
    $scope.$ctrl.hostname = "";
    $scope.$ctrl.slot = "";
    $scope.$ctrl.password = "";
    $scope.$ctrl.connecting = false;

    $scope.$ctrl.connect = async () => {
      const { hostname, slot, password } = $scope.$ctrl;

      if (!hostname) {
        //$scope.sendToast("Hostname is required.", "danger");
        return false;
      } else if (!slot) {
        //$scope.sendToast("Slot name is required.", "danger");
        return false;
      }

      $scope.$ctrl.connecting = true;

      const response = await backendCommunicator.fireEventAsync(
        "oceanity:archipelago:connect",
        hostname,
        slot,
        password,
      );

      $scope.$ctrl.connecting = false;

      if (!response.success) {
        // $scope.sendToast(response.errors?.join(", "), "danger", true, 10000);
        return;
      }

      // $scope.sendToast(
      //   `Successfully connected to '${response.data.handle}'`,
      //   "success",
      // );
    };

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.hostname = "";
      $scope.$ctrl.slot = "";
      $scope.$ctrl.password = "";
    };
  },
};
