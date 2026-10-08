import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  css: { transformer: "postcss" },
  build: { cssMinify: "esbuild" },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    netlify(),
    viteReact(),
    tsconfigPaths(),
  ],
});
