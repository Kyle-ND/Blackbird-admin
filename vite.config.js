import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local dev proxies /proxy-api and /login to the API. Point VITE_API_TARGET at a
// local backend (http://127.0.0.1:8000) to develop against dev/run_local.sh.
const API_TARGET = process.env.VITE_API_TARGET || "https://bb-booking-sys-production.up.railway.app/";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/proxy-api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-api/, ""),
      },
      "/login": { target: API_TARGET, changeOrigin: true, secure: true },
    },
  },
  preview: { port: 3000 },
});
