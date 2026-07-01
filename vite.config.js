import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true, // expose on LAN so you can test on a phone over the same network
    proxy: {
      // Forward SMS API calls to the local backend (server/index.js) during dev.
      // In production these are handled by your deployed backend / serverless fn.
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
