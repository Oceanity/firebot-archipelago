import { AngularJsComponent } from "@crowbartools/firebot-types";
import {
  ContextMenuEntry,
  hintStatuses,
  SessionStatus,
  StoredHint,
} from "../../../types";
import template from "./hint-table.html";

export const ArchipelagoHintTable: AngularJsComponent = {
  name: "archipelagoHintTable",

  bindings: {
    sessionId: "<",
  },

  template,

  controller: ($scope: any, backendCommunicator: any, apToast: any) => {
    $scope.$ctrl.hints = [];
    $scope.$ctrl.fields = [
      { id: "receiver", label: "Receiver" },
      { id: "itemName", label: "Item" },
      { id: "sender", label: "Finder" },
      { id: "locationName", label: "Location" },
      { id: "entrance", label: "Entrance" },
      { id: "status", label: "Status" },
    ];
    $scope.$ctrl.sortField = "";
    $scope.$ctrl.sortReverse = false;

    $scope.$ctrl.loadHints = async () => {
      if (!$scope.$ctrl.sessionId) {
        return;
      }

      backendCommunicator
        .fireEventAsync(
          "oceanity:archipelago:get-hints",
          $scope.$ctrl.sessionId,
        )
        .then((hints: StoredHint[]) => {
          if (!hints.length) {
            return;
          }

          $scope.$ctrl.hints = hints;
          $scope.$applyAsync();
        });
    };

    backendCommunicator.on(
      "oceanity:archipelago:session-status-updated",
      ({ sessionId, status }: { sessionId: string; status: SessionStatus }) => {
        if (sessionId !== $scope.$ctrl.sessionId) {
          return;
        }

        if (status === SessionStatus.Connected) {
          $scope.$ctrl.loadHints();
        }
      },
    );

    $scope.$ctrl.$onChanges = async (changes: any) => {
      if (changes.sessionId) {
        await $scope.$ctrl.loadHints();
      }
    };

    $scope.$ctrl.setSort = (column: string) => {
      if ($scope.$ctrl.sortField !== column) {
        $scope.$ctrl.sortField = column;
        $scope.$ctrl.sortReverse = false;
        return;
      }

      if ($scope.$ctrl.sortReverse) {
        $scope.$ctrl.sortField = null;
      }

      $scope.$ctrl.sortReverse = !$scope.$ctrl.sortReverse;
    };

    $scope.$ctrl.hintStatuses = [
      [10, "No Priority"],
      [30, "Priority"],
      [20, "Avoid"],
    ];

    $scope.$ctrl.getMenuItems = (hint: StoredHint) => {
      const items: Array<ContextMenuEntry> = [
        {
          text: "Set priority...",
          enabled: () => hint.receiverIsPlayer && hint.status !== "Found",
          children: $scope.$ctrl.hintStatuses.map(
            ([value, status]: [
              number,
              (typeof hintStatuses)[keyof typeof hintStatuses],
            ]) => {
              const isSelected = status === hint.status;
              return {
                html: `<a href><i class="${isSelected ? "fas fa-check" : ""}" style="margin-right: ${isSelected ? "10" : "27"}px;"></i> ${status}</a>`,
                click: () => {
                  backendCommunicator
                    .fireEventAsync(
                      "oceanity:archipelago:set-hint-status",
                      $scope.$ctrl.sessionId,
                      hint.id,
                      value,
                    )
                    .then((success: boolean) => {
                      if (success) {
                        hint.status = status;
                      }
                    });
                },
              };
            },
          ),
        },
      ];

      return items;
    };

    $scope.$ctrl.getFieldClasses = () => {
      return [
        "fal",
        $scope.$ctrl.sortReverse ? "fa-arrow-to-top" : "fa-arrow-to-bottom",
      ];
    };

    $scope.$ctrl.getItemClasses = (hint: StoredHint) => {
      return ["item", hint.classification.toLowerCase()];
    };

    $scope.$ctrl.getStatusClasses = (hint: StoredHint) => {
      return ["status", hint.status.toLowerCase().replace(/\s/g, "-")];
    };
  },
};
