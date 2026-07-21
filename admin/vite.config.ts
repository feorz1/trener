import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const adminRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: adminRoot,
  plugins: [react()],
  base: "/admin/",
  server: {
    port: 5173
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
