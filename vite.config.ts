import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

const { version: appVersion } = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig({
  // Root-served locally; the Pages workflow sets PAGES_BASE=/parchment-quill/.
  base: process.env.PAGES_BASE ?? "/",
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  fmt: {},
  lint: {
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
});
