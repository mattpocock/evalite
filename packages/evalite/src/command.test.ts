import { describe, expect, it, vitest } from "vitest";
import { createProgram } from "./command.js";
import { run } from "@stricli/core";

describe("createCommand", () => {
  it("evalite without path", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
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
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
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
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
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
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
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
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
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
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
    });

    await run(program, ["watch", "--threshold=50"], { process });

    expect(watch).toHaveBeenCalledWith({
      path: undefined,
      threshold: 50,
    });
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });

  it("evalite watch --outputPath does not call watch command", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
    });

    // The run() function catches the error and doesn't reject
    // We just verify that neither command gets called
    await run(program, ["watch", "--outputPath=results.json"], { process });

    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });

  it("evalite --outputPath works in run-once mode", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
    });

    await run(program, ["--outputPath=results.json"], { process });

    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).toHaveBeenCalledWith({
      path: undefined,
      outputPath: "results.json",
    });
  });

  it("evalite serve", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
    });

    await run(program, ["serve"], { process });

    expect(serveFn).toHaveBeenCalledWith({
      path: undefined,
      threshold: undefined,
      outputPath: undefined,
    });
    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });

  it("evalite serve with path", async () => {
    const watch = vitest.fn();
    const runOnceAtPath = vitest.fn();
    const exportFn = vitest.fn();
    const serveFn = vitest.fn();
    const program = createProgram({
      watch,
      runOnceAtPath,
      export: exportFn,
      serve: serveFn,
    });

    await run(program, ["serve", "./src"], { process });

    expect(serveFn).toHaveBeenCalledWith({
      path: "./src",
      threshold: undefined,
      outputPath: undefined,
    });
    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });
});
