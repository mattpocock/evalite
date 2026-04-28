import { it, expect } from "vitest";

it("should not run this unit test when running evalite", () => {
  console.log("UNIT_TEST_RAN");
  expect(1 + 1).toBe(2);
});
