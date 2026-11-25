import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["terminal.local"],
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
  test: { environment: "jsdom", setupFiles: "./tests/setup.js" },
});
