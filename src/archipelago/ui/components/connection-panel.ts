import { AngularJsComponent } from "@crowbartools/firebot-types";
import { ArchipelagoToastService } from "../factories/toast-service";
import template from "./connection-panel.html";

export const ArchipelagoConnectionPanel: AngularJsComponent = {
  name: "archipelagoConnectionPanel",

  bindings: {},

  template,

  controller: (
    $scope: any,
    backendCommunicator: any,
    apToast: ArchipelagoToastService,
  ) => {
    $scope.$ctrl.hostname = "";
    $scope.$ctrl.slot = "";
    $scope.$ctrl.password = "";
    $scope.$ctrl.connecting = false;

    $scope.$ctrl.connect = async () => {
      const { hostname, slot, password } = $scope.$ctrl;

      if (!hostname) {
        apToast.error("Hostname is required.");
        return false;
      } else if (!slot) {
        apToast.error("Slot name is required.");
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
        apToast.error(response.errors?.join(", "), 10000);
        return;
      }

      $scope.$ctrl.clear();

      apToast.info(`Successfully connected to '${response.data.handle}'`);
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
