import react from "@vitejs/plugin-react";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "self-host-mediapipe-wasm",
      async closeBundle() {
        const source = resolve(
          "node_modules/@mediapipe/tasks-vision/wasm",
        );
        const destination = resolve("dist/wasm");
        await mkdir(destination, { recursive: true });
        await cp(source, destination, { recursive: true });
      },
    },
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
