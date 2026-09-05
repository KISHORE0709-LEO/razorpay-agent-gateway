import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**", "**/public/**"],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist",
  },
  optimizeDeps: {
    include: ["recharts", "react-is"],
    force: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
});
