import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // @ts-ignore
    workspace: [
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
        },
      },
    ],
  },
});
