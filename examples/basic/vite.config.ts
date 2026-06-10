import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@emgapps/orb-core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@emgapps/orb-react": fileURLToPath(new URL("../../packages/react/src/index.ts", import.meta.url)),
    },
  },
});
