import { Effects } from "@crowbartools/firebot-custom-scripts-types/types/effects";
import { client } from "../main";

type SendChatProps = {
  selectMode?: string;
  message?: string;
  session?: string;
  selectedSession?: string;
};

export const SendChatMessageEffectType: Effects.EffectType<
  SendChatProps,
  unknown,
  void
> = {
  definition: {
    id: "send-chat-message",
    name: "Send Archipelago Message",
    description: "Sends a chat message to the specified Archipelago MultiWorld",
    icon: "fa fa-island-tropical",
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
        model="effect.message"
        use-text-area="true"
        placeholder-text="Chat message"
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
    if (!effect.message?.length) {
      errors.push("Please insert a message to send");
    }
    return errors;
  },
  onTriggerEvent: async ({ effect }) => {
    switch (effect.selectMode) {
      case "first": {
        return client.findSession()?.messages.sendChat(effect.message);
      }

      case "list": {
        return client.sessions
          .get(effect.selectedSession)
          ?.messages.sendChat(effect.message);
      }

      case "custom": {
        return client
          .findSession(effect.session)
          ?.messages.sendChat(effect.message);
      }
    }
  },
};
