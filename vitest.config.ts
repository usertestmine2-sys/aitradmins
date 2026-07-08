import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/tests/**/*.test.ts"],
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      AUTH_SECRET: "test-auth-secret",
      NODE_ENV: "test",
    },
  },
});
