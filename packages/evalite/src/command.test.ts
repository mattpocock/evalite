import { describe, expect, it, vitest } from "vitest";
import { createProgram } from "./command.js";
import { run } from "@stricli/core";

describe("createCommand", () => {
  it("evalite without path", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
    });

    await run(program, [], { process });

    expect(watch).not.toHaveBeenCalled();

    expect(runOnceAtPath).toHaveBeenCalled();
    expect(runOnceAtPath).toHaveBeenCalledWith({
      path: undefined,
    });
  });

  it("evalite with path", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
    });

    await run(program, ["./src"], { process });

    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).toHaveBeenCalledWith({
      path: "./src",
    });
  });

  it("evalite watch", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
    });

    await run(program, ["watch"], { process });

    expect(watch).toHaveBeenCalledWith({
      path: undefined,
    });
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });

  it("evalite watch with path", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
    });

    await run(program, ["watch", "./src"], { process });

    expect(watch).toHaveBeenCalledWith({
      path: "./src",
    });
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });

  it("evalite --threshold", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
    });

    await run(program, ["--threshold=50"], { process });

    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).toHaveBeenCalledWith({
      path: undefined,
      threshold: 50,
    });
  });

  it("evalite watch --threshold", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
    });

    await run(program, ["watch", "--threshold=50"], { process });

    expect(watch).toHaveBeenCalledWith({
      path: undefined,
      threshold: 50,
    });
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });
});
