import { defineConfig } from "evalite/config";
// @ts-ignore
import { somethingThatDoesNotExist } from "./non-existent-file";

somethingThatDoesNotExist();

export default defineConfig({
  testTimeout: 1000,
});
