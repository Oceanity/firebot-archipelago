import { AngularJsComponent } from "@crowbartools/firebot-types";
import template from "./page-selector.html";

export const ArchipelagoPageSelector: AngularJsComponent = {
  name: "archipelagoPageSelector",

  bindings: {
    selected: "<",
    onPageChanged: "&",
  },

  template,

  controller: ($scope: any) => {
    $scope.$ctrl.pages = ["Archipelago", "Hints"];

    $scope.$ctrl.selectPage = async (page: string) => {
      await $scope.$ctrl.onPageChanged({ page });
    };
  },
};
