import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxyTarget = process.env.PAPERCLIP_OFFICE_API_PROXY_TARGET;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3200,
    ...(apiProxyTarget
      ? {
          proxy: {
            "/api": apiProxyTarget,
          },
        }
      : {}),
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
