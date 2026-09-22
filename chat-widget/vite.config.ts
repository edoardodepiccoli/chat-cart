import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  esbuild: { jsx: "automatic" },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "../extensions/chat-widget/assets",
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: "src/main.tsx",
      name: "ChatCartWidget",
      formats: ["iife"],
      fileName: () => "chat-widget.js",
    },
    rollupOptions: {
      output: { assetFileNames: "chat-widget.[ext]" },
    },
  },
});
