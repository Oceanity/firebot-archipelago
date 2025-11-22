import { copy } from "fs-extra";
import { join, resolve } from "path";
import * as packageJson from "../package.json";
const { scriptOutputName } = packageJson;

const getFirebotScriptsFolderPath = () => {
  if (!process.env.HOME || !process.env.APPDATA) {
    throw new Error("Required environment variable not set");
  }

  // determine os app data folder
  let appDataFolderPath;
  switch (process.platform) {
    case "win32":
      appDataFolderPath = process.env.APPDATA;
      break;
    case "darwin":
      appDataFolderPath = join(
        process.env.HOME,
        "/Library/Application Support"
      );
      break;
    case "linux":
      appDataFolderPath = join(process.env.HOME, "/.config");
      break;
    default:
      throw new Error("Unsupported OS!");
  }

  const firebotDataFolderPath = join(appDataFolderPath, "/Firebot/v5/");
  const firebotGlobalSettings = require(join(
    firebotDataFolderPath,
    "global-settings.json"
  ));

  if (
    firebotGlobalSettings == null ||
    firebotGlobalSettings.profiles == null ||
    firebotGlobalSettings.profiles.loggedInProfile == null
  ) {
    throw new Error("Unable to determine active profile");
  }

  const activeProfile = firebotGlobalSettings.profiles.loggedInProfile;

  const scriptsFolderPath = join(
    firebotDataFolderPath,
    `/profiles/${activeProfile}/scripts/`
  );
  return scriptsFolderPath;
};

const main = async () => {
  const firebotScriptsFolderPath = getFirebotScriptsFolderPath();

  const srcScriptFilePath = resolve(`./dist/${scriptOutputName}`);
  const destScriptFilePath = join(firebotScriptsFolderPath, scriptOutputName);

  await copy(srcScriptFilePath, destScriptFilePath, {
    overwrite: true,
  });

  console.log(
    `Successfully copied /${scriptOutputName} to Firebot scripts folder.`
  );
};

main();
