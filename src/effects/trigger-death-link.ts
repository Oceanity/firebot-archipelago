import firebot, { EffectType } from "@crowbartools/firebot-types";
import { ARCHIPELAGO_PLUGIN_ID } from "../constants";
import { archipelago } from "../main";
import { SessionSelectMode, SessionTableEntry } from "../types";
import optionsTemplate from "./trigger-death-link.html";

type EffectModel = {
  selectMode: SessionSelectMode;
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
    $scope.isArchipelagoEvent =
      $scope.trigger === "event" &&
      $scope.triggerMeta?.triggerId?.startsWith(ARCHIPELAGO_PLUGIN_ID);

    $scope.getSessionNames = async (): Promise<void> => {
      $q.when(
        backendCommunicator.fireEventAsync(
          "oceanity:archipelago:get-session-table",
        ),
      ).then((entries: Array<SessionTableEntry>) => {
        $scope.sessions = {};
        entries.forEach((entry) => {
          $scope.sessions[entry.id] = entry.handle;
        });
      });
    };

    $scope.selectModes = {
      first: "First available session",
      list: "Select from list",
      custom: "Manually enter Session Id",
    };

    if ($scope.isArchipelagoEvent) {
      $scope.selectModes = {
        associated: "Associated Archipelago Session",
        ...$scope.selectModes,
      };
    }

    if (!$scope.effect.selectMode) {
      $scope.effect.selectMode = $scope.selectModes[0];
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
  getDefaultLabel: (effect) => {
    let target = "First Archipelago Session";
    switch (effect.selectMode) {
      case "associated":
        target = "Associated Archipelago Session";
        break;
      case "list":
        target = "Selected Archipelago Session";
        break;
      case "custom":
        target = `Archipelago Session ${effect.session ?? "Undefined"}`;
        break;
    }
    const cause =
      effect.cause !== undefined && !!effect.cause.length
        ? `, Cause: '${effect.cause}'`
        : "";
    return `Triggering on ${target}${cause}`;
  },
  onTriggerEvent: async ({ effect, trigger }) => {
    const SOURCE = "Firebot";

    try {
      switch (effect.selectMode) {
        case "associated": {
          const sessionId = trigger.metadata.eventData?.apSessionId;
          if (!sessionId) {
            throw new Error("Trigger metadata has no associated 'apSessionId'");
          }

          await archipelago
            .findSession(`${sessionId}`)
            ?.client.deathLink.sendDeathLink(SOURCE, effect.cause);

          break;
        }

        case "first": {
          await archipelago
            .getFirstSession()
            ?.client.deathLink.sendDeathLink(SOURCE, effect.cause);

          break;
        }

        case "list": {
          if (!effect.selectedSession) {
            throw new Error("No session specified to send DeathLink Event to");
          }

          await archipelago
            .findSession(effect.selectedSession)
            ?.client.deathLink.sendDeathLink(SOURCE, effect.cause);

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
