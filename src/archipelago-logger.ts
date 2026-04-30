import { logger } from "@oceanity/firebot-helpers/firebot";

const LOG_PREFIX = `[Archipelago]: `;
export const apLogger = {
  info: (message: string, ...meta: any[]) =>
    logger.info(`${LOG_PREFIX}${message}`, ...meta),
  warn: (message: string, ...meta: any[]) =>
    logger.warn(`${LOG_PREFIX}${message}`, ...meta),
  error: (message: string, ...meta: any[]) =>
    logger.error(`${LOG_PREFIX}${message}`, ...meta),
  debug: (message: string, ...meta: any[]) =>
    logger.debug(`${LOG_PREFIX}${message}`, ...meta),
};
