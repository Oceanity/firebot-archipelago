import { AngularJsFactory, NgToast } from "@crowbartools/firebot-types";

export const ArchipelagoToastService: AngularJsFactory = {
  name: "apToast",
  function: (ngToast: NgToast) => ({
    send(
      content: string,
      className: "info" | "success" | "warning" | "danger" = "warning",
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
