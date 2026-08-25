import { AngularJsFactory, NgToast } from "@crowbartools/firebot-types";

type ToastMethod = (content: string, timeout?: number) => void;

export type ArchipelagoToastService = {
  info: ToastMethod;
  debug: ToastMethod;
  warn: ToastMethod;
  error: ToastMethod;
};

export const ArchipelagoToastServiceFactory: AngularJsFactory = {
  name: "apToast",
  function: (ngToast: NgToast) => ({
    debug(content: string, timeout: number = 5000) {
      ngToast.create({
        content,
        className: "info",
        timeout,
      });
    },
    info(content: string, timeout: number = 5000) {
      ngToast.create({
        content,
        className: "success",
        timeout,
      });
    },
    warn(content: string, timeout: number = 5000) {
      ngToast.create({
        content,
        className: "warning",
        timeout,
      });
    },
    error(content: string, timeout: number = 5000) {
      ngToast.create({
        content,
        className: "error",
        timeout,
      });
    },
  }),
};
