import { defineConfig } from "evalite/config";

export default defineConfig({
  forceRerunTriggers: ["src/**/*.ts", "data/**/*.json"],
});
