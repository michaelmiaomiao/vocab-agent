import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.resolve(frontendDir),
  build: {
    outDir: path.resolve(frontendDir, "../dist"),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@shared": path.resolve(frontendDir, "../shared")
    }
  }
});
