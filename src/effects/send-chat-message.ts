import firebot, { EffectType } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../constants";
import { state } from "../main";
import optionsTemplate from "./send-chat-message.html";

type EffectModel = {
  selectMode?: string;
  message?: string;
  session?: string;
  selectedSession?: string;
};

export const SendChatMessageEffectType: EffectType<EffectModel> = {
  definition: {
    id: "send-chat-message",
    name: "Send Archipelago Message",
    description: "Sends a chat message to the specified Archipelago MultiWorld",
    icon: "fa fa-island-tropical",
    categories: ["integrations"],
    outputs: [],
  },
  optionsTemplate,
  optionsController: ($scope, backendCommunicator: any, $q: any) => {
    $scope.isArchipelagoEvent =
      $scope.trigger === "event" &&
      $scope.triggerMeta?.triggerId?.startsWith(ARCHIPELAGO_PLUGIN_ID);

    $scope.getSessionNames = async (): Promise<void> => {
      $q.when(
        backendCommunicator.fireEventAsync(
          "oceanity:archipelago:get-session-names",
        ),
      ).then((data: Record<string, string>) => {
        $scope.sessions = data;
      });
    };

    $scope.getSessionNames();

    $scope.selectModes = {
      first: "First available session",
      list: "Select from list",
      custom: "Manually enter a name",
    };

    if ($scope.isArchipelagoEvent) {
      $scope.selectModes = {
        associated: "Associated Archipelago Session",
        ...$scope.selectModes,
      };
    }

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
  onTriggerEvent: async ({ effect, trigger }) => {
    try {
      if (!effect.message) {
        return { success: true };
      }

      switch (effect.selectMode) {
        case "associated": {
          const sessionId = trigger.metadata.eventData?.apSessionId;
          if (!sessionId) {
            throw new Error("Trigger metadata has no associated 'apSessionId'");
          }

          await state.sessions[`${sessionId}`]?.client.messages.say(
            effect.message,
          );
          break;
        }

        case "first": {
          const sessions = Object.values(state.sessions);

          if (!sessions.length) {
            throw new Error(
              "No connected sessions available for Send Chat Message effect",
            );
          }

          await sessions[0]?.client.messages.say(effect.message);
          break;
        }

        case "list": {
          if (!effect.selectedSession) {
            throw new Error(
              "No selected session provided for Send Chat Message effect",
            );
          }

          await state.sessions[effect.selectedSession]?.client.messages.say(
            effect.message,
          );

          break;
        }

        case "custom": {
          // TODO : Fuzzy search on state sessions
          throw new Error("not implemented");
        }
      }

      return { success: true };
    } catch (error) {
      firebot.logger.error("Could not send Chat Message");

      return { success: false };
    }
  },
};
