import firebot, { OverlayWidgetType } from "@crowbartools/firebot-types";

export function loadComponentExtension(
  componentFileName: string,
): OverlayWidgetType<any, any>["componentExtension"] {
  const bundlePath = getPathInWorkingDir(
    `resources/overlay-widget-components/${componentFileName}/index.js`,
  );
  try {
    const bundleSource = readFileSync(bundlePath, "utf8");
    return { bundleSource };
  } catch (ex) {
    firebot.logger.error(
      `Could not read ${componentFileName} widget bundle at '${bundlePath}'.`,
      ex,
    );
    // provide empty source
    return { bundleSource: "" };
  }
}
