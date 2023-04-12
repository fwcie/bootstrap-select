import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
//   root: resolve(__dirname, "src"),
  resolve: {
    alias: {
      "~bootstrap": resolve(__dirname, "node_modules/bootstrap"),
    },
  },
  server: {
    port: 3030,
  },
});
