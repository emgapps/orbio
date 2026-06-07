import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@voca/orb-core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@voca/orb-react": fileURLToPath(new URL("./packages/react/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["packages/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
