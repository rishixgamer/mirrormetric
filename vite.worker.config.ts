import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: "worker/index.ts",
      formats: ["es"],
      fileName: () => "server/index.js",
    },
    rollupOptions: {
      external: [],
    },
  },
});
