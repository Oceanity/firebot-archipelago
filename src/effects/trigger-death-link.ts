import firebot, { EffectType } from "@crowbartools/firebot-types";
import { state } from "../main";
import optionsTemplate from "./trigger-death-link.html";

type EffectModel = {
  selectMode?: string;
  cause?: string;
  session?: string;
  selectedSession?: string;
};

export const TriggerDeathLinkEffectType: EffectType<EffectModel> = {
  definition: {
    id: "trigger-death-link",
    name: "Trigger Archipelago DeathLink",
    description:
      "Triggers a death for every connected player with DeathLink enabled",
    icon: "fa fa-skull-crossbones",
    categories: ["integrations"],
    outputs: [],
  },
  optionsTemplate,
  optionsController: ($scope, backendCommunicator: any, $q: any) => {
    $scope.getSessionNames = async (): Promise<void> => {
      $q.when(
        backendCommunicator.fireEventAsync(
          "oceanity:archipelago:get-session-names",
        ),
      ).then((data: Record<string, string>) => {
        $scope.sessions = data;
      });
    };

    $scope.selectModes = {
      first: "First available session",
      list: "Select from list",
      custom: "Manually enter a name",
    };

    if (!$scope.effect.selectMode) {
      $scope.effect.selectMode = "first";
    }

    $scope.getSessionNames();
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
    const SOURCE = "Firebot";

    try {
      switch (effect.selectMode) {
        case "first": {
          const sessions = Object.values(state.sessions);

          if (!sessions.length) {
            throw new Error("No sessions available to send DeathLink Event to");
          }

          await sessions[0].client.deathLink.sendDeathLink(
            SOURCE,
            effect.cause,
          );

          break;
        }

        case "list": {
          if (!effect.selectedSession) {
            throw new Error("No session specified to send DeathLink Event to");
          }

          await state.sessions[
            effect.selectedSession
          ]?.client.deathLink.sendDeathLink(SOURCE, effect.cause);

          break;
        }

        case "custom": {
          // TODO: Implement search for session
          throw new Error("not implemented");
        }
      }

      return { success: true };
    } catch (error) {
      firebot.logger.error("Error sending DeathLink Event", error);
      return { success: false };
    }
  },
};
