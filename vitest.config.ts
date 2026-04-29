import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/__tests__/*.test.ts"],
    setupFiles: ["lib/__tests__/setup.ts"],
    globals: false,
  },
});
