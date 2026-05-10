// Vite config khusus untuk deploy Vercel sebagai SPA (bukan SSR/TanStack Start)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      // Swap SSR root dengan SPA root saat build Vercel
      "./routes/__root": path.resolve(__dirname, "src/routes/__root.spa.tsx"),
      "./routes/__root.tsx": path.resolve(__dirname, "src/routes/__root.spa.tsx"),
    },
  },
  build: {
    outDir: "dist",
  },
});
