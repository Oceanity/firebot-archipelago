import { Client, itemClassifications, MessageNode } from "archipelago.js";

export function getMessageHtml(
  client: Client,
  messageNodes: Array<MessageNode>,
): string {
  return messageNodes
    .map((node) => {
      switch (node.type) {
        case "text": {
          return `<span>${node.text}</span>`;
        }

        case "color": {
          return `<span style="color: ${node.color}">${node.text}</span>`;
        }

        case "player": {
          const classes = [
            "player",
            `team-${node.player.team}`,
            node.player.team === client.players.self.team
              ? "teammate"
              : "opponent",
            node.player.slot === client.players.self.slot ? "self" : "other",
          ];
          return `<span class="${classes.join(" ")}">${node.player.alias}</span>`;
        }

        case "item": {
          const classes = ["item"];
          switch (node.item.flags) {
            case itemClassifications.progression:
              classes.push("progression");
              break;
            case itemClassifications.useful:
              classes.push("useful");
              break;
            case itemClassifications.trap:
              classes.push("useful");
              break;
            default:
              classes.push("filler");
              break;
          }

          return `<span class="${classes.join(" ")}">${node.item.name}</span>`;
        }

        case "location": {
          return `<span class="location">${node.text}</span>`;
        }

        default:
          return "";
      }
    })
    .join(" ");
}
