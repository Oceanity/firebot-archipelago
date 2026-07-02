import { AngularJsComponent } from "@crowbartools/firebot-types";
import template from "./connection-panel.html";

export const ArchipelagoConnectionPanel: AngularJsComponent = {
  name: "archipelagoConnectionPanel",

  bindings: {},

  template,

  controller: ($scope: any, backendCommunicator: any, apToast: any) => {
    $scope.$ctrl.hostname = "";
    $scope.$ctrl.slot = "";
    $scope.$ctrl.password = "";
    $scope.$ctrl.connecting = false;

    $scope.$ctrl.connect = async () => {
      const { hostname, slot, password } = $scope.$ctrl;

      if (!hostname) {
        apToast.send("Hostname is required.", "danger");
        return false;
      } else if (!slot) {
        apToast.send("Slot name is required.", "danger");
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
        apToast.send(response.errors?.join(", "), "danger", true, 10000);
        return;
      }

      $scope.$ctrl.clear();

      apToast.send(
        `Successfully connected to '${response.data.handle}'`,
        "success",
      );
    };

    $scope.$ctrl.handleKeydown = async ($event: KeyboardEvent) => {
      const keyCode = $event.which || $event.keyCode;

      // Enter Key
      if (keyCode === 13) {
        await $scope.$ctrl.connect();
      }
    };

    $scope.$ctrl.clear = () => {
      $scope.$ctrl.hostname = "";
      $scope.$ctrl.slot = "";
      $scope.$ctrl.password = "";
    };
  },
};
