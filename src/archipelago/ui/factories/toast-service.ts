import { AngularJsFactory, NgToast } from "@crowbartools/firebot-types";

type ArchipelagoToastClassName = "info" | "success" | "warning" | "danger";
export type ArchipelagoToastService = {
  send: (
    content: string,
    className?: ArchipelagoToastClassName,
    timeout?: number,
  ) => void;
};

export const ArchipelagoToastServiceFactory: AngularJsFactory = {
  name: "apToast",
  function: (ngToast: NgToast) => ({
    send(
      content: string,
      className: ArchipelagoToastClassName = "warning",
      timeout: number = 5000,
    ) {
      ngToast.create({
        content,
        className,
        timeout,
      });
    },
  }),
};
