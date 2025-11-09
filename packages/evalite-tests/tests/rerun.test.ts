import { describe, it, expect } from "vitest";
import { loadFixture } from "./test-utils.js";

describe("rerun functionality", () => {
  it("should rerun tests when rerun method is called", async () => {
    await using fixture = await loadFixture("basics");

    // Initial run in watch mode
    await fixture.run({
      mode: "watch-for-file-changes",
    });

    await fixture.waitForTestRunEnd();

    const initialResults = await fixture.storage.suites.getMany();
    expect(initialResults.length).toBeGreaterThan(0);

    const initialRunCount = (await fixture.storage.runs.getMany()).length;

    // Get the vitest instance and call rerun
    const vitest = fixture.getVitest();
    expect(vitest).toBeDefined();

    if (!vitest) {
      throw new Error("Vitest instance not found");
    }

    // Trigger rerun
    await vitest.cancelCurrentRun("keyboard-input");
    const testFiles = vitest.state.getFilepaths();
    const specs = testFiles.flatMap((filepath) =>
      vitest.getModuleSpecifications(filepath)
    );
    await vitest.rerunTestSpecifications(specs, true);
    await vitest.waitForTestRunEnd();

    // Verify new run was created
    const finalRunCount = (await fixture.storage.runs.getMany()).length;
    expect(finalRunCount).toBeGreaterThan(initialRunCount);

    // Verify results were updated
    const finalResults = await fixture.storage.suites.getMany();
    expect(finalResults.length).toBeGreaterThan(initialResults.length);
  });
});
