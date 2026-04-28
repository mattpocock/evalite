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
      paths: [],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: ["./src"],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
    });
  });

  it("evalite with multiple paths", async () => {
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

    await run(program, ["./src/a.eval.ts", "./src/b.eval.ts"], { process });

    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).toHaveBeenCalledWith({
      paths: ["./src/a.eval.ts", "./src/b.eval.ts"],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: [],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: ["./src"],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
    });
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });

  it("evalite watch with multiple paths", async () => {
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

    await run(program, ["watch", "./src/a.eval.ts", "./src/b.eval.ts"], {
      process,
    });

    expect(watch).toHaveBeenCalledWith({
      paths: ["./src/a.eval.ts", "./src/b.eval.ts"],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: [],
      threshold: 50,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: [],
      threshold: 50,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: [],
      outputPath: "results.json",
      threshold: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: [],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
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
      paths: ["./src"],
      threshold: undefined,
      outputPath: undefined,
      hideTable: undefined,
      noCache: undefined,
    });
    expect(watch).not.toHaveBeenCalled();
    expect(runOnceAtPath).not.toHaveBeenCalled();
  });
});
