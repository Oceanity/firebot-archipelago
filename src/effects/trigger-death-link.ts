import { Effects } from "@crowbartools/firebot-custom-scripts-types/types/effects";
import { client } from "../main";

type SendChatProps = {
  selectMode?: string;
  cause?: string;
  session?: string;
  selectedSession?: string;
};

export const TriggerDeathLinkEffectType: Effects.EffectType<
  SendChatProps,
  unknown,
  void
> = {
  definition: {
    id: "trigger-death-link",
    name: "Trigger Archipelago DeathLink",
    description:
      "Triggers a death for every connected player with DeathLink enabled",
    icon: "fa fa-skull-crossbones",
    categories: ["integrations"],
    outputs: [],
  },
  optionsTemplate: `
    <eos-container header="Session" pad-bottom="true">
      <firebot-radios
        model="effect.selectMode"
        options="selectModes" />

      <div ng-if="effect.selectMode === 'list'" style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 20px;">
        <firebot-select
          selected="effect.selectedSession"
          options="sessions" />
        <button class="btn btn-link" ng-click="getSessionNames()">Refresh Sessions</button>
      </div>

      <div ng-if="effect.selectMode === 'custom'" style="margin-bottom: 20px;">
        <firebot-input
          model="effect.session"
          placeholder-text="Enter session name, slot name or hostname (will use first match)"
          menu-position="under" />
      </div>
    </eos-container>

    <eos-container header="Text">
      <firebot-input
        model="effect.cause"
        use-text-area="true"
        placeholder-text="DeathLink cause (optional)"
        rows="3"
        cols="40" />
    </eos-container>
  `,
  optionsController: ($scope, backendCommunicator: any) => {
    $scope.getSessionNames = (): void => {
      $scope.sessions = backendCommunicator.fireEventSync(
        "archipelago:getSessionTable"
      );
    };

    //@ts-expect-error ts(2349)
    $scope.getSessionNames();

    $scope.selectModes = {
      first: "First available session",
      list: "Select from list",
      custom: "Manually enter a name",
    };

    if (!$scope.effect.selectMode) {
      $scope.effect.selectMode = "first";
    }
  },
  optionsValidator: (effect) => {
    const errors: Array<string> = [];
    if (effect.selectMode === "list" && !effect.selectedSession) {
      errors.push("Select a session from the list");
    }
    if (effect.selectMode === "custom" && !effect.session) {
      errors.push("Enter the name of a session");
    }
    return errors;
  },
  onTriggerEvent: async ({ effect }) => {
    switch (effect.selectMode) {
      case "first": {
        return client.findSession()?.triggerDeathLink(effect.cause ?? "");
      }

      case "list": {
        return client.sessions
          .get(effect.selectedSession)
          ?.triggerDeathLink(effect.cause ?? "");
      }

      case "custom": {
        return client
          .findSession(effect.session)
          ?.triggerDeathLink(effect.cause ?? "");
      }
    }
  },
};
