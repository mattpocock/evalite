import { defineConfig } from "evalite/config";
import { createBraintrustStorage } from "evalite/braintrust";

export default defineConfig({
  storage: async () => {
    return await createBraintrustStorage({
      projectName: "Evalite Test Project",
      experimentName: `test-run-${Date.now()}`,
    });
  },
});
