export function initFrontendCommunicator() {
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:disconnect",
  //   async (sessionId: string): Promise<void> =>
  //     client.sessions.get(sessionId)?.close(),
  // );
  // firebot.frontendCommunicator.onAsync(
  //   `archipelago:getSessionTable`,
  //   async (): Promise<Record<string, string>> => client.sessionTable,
  // );
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:getHtmlMessageLog",
  //   async (sessionId: string): Promise<Array<string>> =>
  //     client.sessions.get(sessionId)?.messages.htmlLog ?? [],
  // );
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:getChatHistory",
  //   async (data: { sessionId: string; entry?: number }) =>
  //     client.sessions
  //       .get(data.sessionId)
  //       ?.messages.getChatHistory(data.entry) ?? ["", -1],
  // );
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:sendMessage",
  //   async (data: { sessionId: string; message: string }) =>
  //     client.sessions.get(data.sessionId)?.messages.sendChat(data.message),
  // );
  // firebot.frontendCommunicator.onAsync(
  //   "archipelago:getHints",
  //   async (sessionId: string) => client.sessions.get(sessionId)?.getHintData(),
  // );
}
