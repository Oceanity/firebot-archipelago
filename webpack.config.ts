import { resolve } from "path";
import * as packageJson from "./package.json";
const TerserPlugin = require("terser-webpack-plugin");
const ZipWebpackPlugin = require("zip-webpack-plugin");
const { scriptOutputName, version } = packageJson;

module.exports = {
  target: "node",
  mode: "production",
  devtool: false,
  entry: {
    main: "./src/main.ts",
  },
  output: {
    libraryTarget: "commonjs2",
    libraryExport: "default",
    path: resolve(__dirname, `./dist/${scriptOutputName}`),
    filename: "index.js",
  },
  plugins: [
    new ZipWebpackPlugin({
      path: resolve(__dirname, "./dist"),
      pathPrefix: scriptOutputName,
      filename: `${scriptOutputName}-v${version}.zip`,
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
      },
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
    ],
  },
  optimization: {
    minimize: process.env.NODE_ENV === "production",
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_fnames: /main/,
          mangle: false,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
};
