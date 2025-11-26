import { fileURLToPath } from "node:url";
import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        execArgv: ["--max-old-space-size=6144"],
      },
    },
    testTimeout: 10000, // 10s timeout for slow integration tests
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    reporters: ["dot"],
    silent: true,
    exclude: ["node_modules", "dist", "build", ".worktrees/**"],
    // Ensure tests that depend on build artifacts run sequentially with build.test.ts
    // This prevents race conditions where cli.test.ts runs while build.test.ts is rebuilding
    sequence: {
      hooks: "list",
    },
    // Run build-dependent tests after other tests to avoid race conditions
    // cli.test.ts depends on build/src/installer/cli.js which build.test.ts rebuilds
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
