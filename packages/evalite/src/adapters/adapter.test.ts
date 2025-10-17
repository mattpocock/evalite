import { describe, expect } from "vitest";
import { testAllAdapters } from "./test-utils.js";

describe("EvaliteAdapter", () => {
  describe("runs", () => {
    testAllAdapters("creates run with full runType", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });

      expect(run.id).toBeDefined();
      expect(run.runType).toBe("full");
      expect(run.created_at).toBeDefined();
    });

    testAllAdapters("getMany returns all runs", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run1 = await adapter.runs.create({ runType: "full" });
      const run2 = await adapter.runs.create({ runType: "partial" });

      const runs = await adapter.runs.getMany();

      expect(runs).toHaveLength(2);
      expect(runs.map((r) => r.id)).toContain(run1.id);
      expect(runs.map((r) => r.id)).toContain(run2.id);
    });

    testAllAdapters("getMany filters by ids", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run1 = await adapter.runs.create({ runType: "full" });
      const run2 = await adapter.runs.create({ runType: "partial" });

      const runs = await adapter.runs.getMany({ ids: [run1.id] });

      expect(runs).toHaveLength(1);
      expect(runs[0]!.id).toBe(run1.id);
    });

    testAllAdapters("getMany filters by runType", async (getAdapter) => {
      await using adapter = await getAdapter();
      await adapter.runs.create({ runType: "full" });
      await adapter.runs.create({ runType: "partial" });
      await adapter.runs.create({ runType: "full" });

      const runs = await adapter.runs.getMany({ runType: "full" });

      expect(runs).toHaveLength(2);
      expect(runs.every((r) => r.runType === "full")).toBe(true);
    });

    testAllAdapters("getMany respects limit", async (getAdapter) => {
      await using adapter = await getAdapter();
      await adapter.runs.create({ runType: "full" });
      await adapter.runs.create({ runType: "full" });
      await adapter.runs.create({ runType: "full" });

      const runs = await adapter.runs.getMany({ limit: 2 });

      expect(runs).toHaveLength(2);
    });

    testAllAdapters(
      "getMany respects orderBy and orderDirection",
      async (getAdapter) => {
        await using adapter = await getAdapter();
        const run1 = await adapter.runs.create({ runType: "full" });
        const run2 = await adapter.runs.create({ runType: "full" });
        const run3 = await adapter.runs.create({ runType: "full" });

        const runsDesc = await adapter.runs.getMany({
          orderBy: "id",
          orderDirection: "desc",
        });
        expect(runsDesc[0]!.id).toBe(run3.id);
        expect(runsDesc[2]!.id).toBe(run1.id);

        const runsAsc = await adapter.runs.getMany({
          orderBy: "id",
          orderDirection: "asc",
        });
        expect(runsAsc[0]!.id).toBe(run1.id);
        expect(runsAsc[2]!.id).toBe(run3.id);
      }
    );
  });

  describe("evals", () => {
    testAllAdapters("create creates new eval", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });

      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      expect(eval1.id).toBeDefined();
      expect(eval1.run_id).toBe(run.id);
      expect(eval1.name).toBe("test-eval");
      expect(eval1.filepath).toBe("/test/path.eval.ts");
      expect(eval1.status).toBe("running");
      expect(eval1.created_at).toBeDefined();
    });

    testAllAdapters("create always creates new eval", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });

      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const eval2 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      expect(eval2.id).not.toBe(eval1.id);
    });

    testAllAdapters(
      "create handles variantName and variantGroup",
      async (getAdapter) => {
        await using adapter = await getAdapter();
        const run = await adapter.runs.create({ runType: "full" });

        const eval1 = await adapter.evals.create({
          runId: run.id,
          name: "test-eval",
          filepath: "/test/path.eval.ts",
          variantName: "variant-a",
          variantGroup: "experiment-1",
        });

        expect(eval1.variant_name).toBe("variant-a");
        expect(eval1.variant_group).toBe("experiment-1");
      }
    );

    testAllAdapters("update changes eval status", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const updated = await adapter.evals.update({
        id: eval1.id,
        status: "success",
      });

      expect(updated.status).toBe("success");
    });

    testAllAdapters("getMany returns all evals", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "eval-1",
        filepath: "/test/path1.eval.ts",
      });
      const eval2 = await adapter.evals.create({
        runId: run.id,
        name: "eval-2",
        filepath: "/test/path2.eval.ts",
      });

      const evals = await adapter.evals.getMany();

      expect(evals).toHaveLength(2);
      expect(evals.map((e) => e.id)).toContain(eval1.id);
      expect(evals.map((e) => e.id)).toContain(eval2.id);
    });

    testAllAdapters("getMany filters by ids", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "eval-1",
        filepath: "/test/path1.eval.ts",
      });
      const eval2 = await adapter.evals.create({
        runId: run.id,
        name: "eval-2",
        filepath: "/test/path2.eval.ts",
      });

      const evals = await adapter.evals.getMany({ ids: [eval1.id] });

      expect(evals).toHaveLength(1);
      expect(evals[0]!.id).toBe(eval1.id);
    });

    testAllAdapters("getMany filters by runIds", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run1 = await adapter.runs.create({ runType: "full" });
      const run2 = await adapter.runs.create({ runType: "full" });
      await adapter.evals.create({
        runId: run1.id,
        name: "eval-1",
        filepath: "/test/path.eval.ts",
      });
      const eval2 = await adapter.evals.create({
        runId: run2.id,
        name: "eval-2",
        filepath: "/test/path.eval.ts",
      });

      const evals = await adapter.evals.getMany({ runIds: [run2.id] });

      expect(evals).toHaveLength(1);
      expect(evals[0]!.id).toBe(eval2.id);
    });

    testAllAdapters("getMany filters by name", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      await adapter.evals.create({
        runId: run.id,
        name: "eval-1",
        filepath: "/test/path.eval.ts",
      });
      const eval2 = await adapter.evals.create({
        runId: run.id,
        name: "eval-2",
        filepath: "/test/path.eval.ts",
      });

      const evals = await adapter.evals.getMany({ name: "eval-2" });

      expect(evals).toHaveLength(1);
      expect(evals[0]!.id).toBe(eval2.id);
    });

    testAllAdapters("getMany filters by statuses", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "eval-1",
        filepath: "/test/path.eval.ts",
      });
      const eval2 = await adapter.evals.create({
        runId: run.id,
        name: "eval-2",
        filepath: "/test/path.eval.ts",
      });

      // Create result so eval can be updated
      await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      await adapter.evals.update({ id: eval1.id, status: "success" });

      const evals = await adapter.evals.getMany({ statuses: ["success"] });

      expect(evals).toHaveLength(1);
      expect(evals[0]!.id).toBe(eval1.id);
    });

    testAllAdapters("getMany respects limit", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      await adapter.evals.create({
        runId: run.id,
        name: "eval-1",
        filepath: "/test/path.eval.ts",
      });
      await adapter.evals.create({
        runId: run.id,
        name: "eval-2",
        filepath: "/test/path.eval.ts",
      });
      await adapter.evals.create({
        runId: run.id,
        name: "eval-3",
        filepath: "/test/path.eval.ts",
      });

      const evals = await adapter.evals.getMany({ limit: 2 });

      expect(evals).toHaveLength(2);
    });
  });

  describe("results", () => {
    testAllAdapters("create creates new result", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: { test: "input" },
        expected: { test: "expected" },
        output: { test: "output" },
        duration: 100,
        status: "success",
        renderedColumns: [{ label: "col1", value: "val1" }],
      });

      expect(result.id).toBeDefined();
      expect(result.eval_id).toBe(eval1.id);
      expect(result.col_order).toBe(0);
      expect(result.input).toEqual({ test: "input" });
      expect(result.expected).toEqual({ test: "expected" });
      expect(result.output).toEqual({ test: "output" });
      expect(result.duration).toBe(100);
      expect(result.status).toBe("success");
      expect(result.rendered_columns).toEqual([
        { label: "col1", value: "val1" },
      ]);
      expect(result.created_at).toBeDefined();
    });

    testAllAdapters("update updates result", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: { test: "input" },
        expected: { test: "expected" },
        output: { test: "output" },
        duration: 100,
        status: "running",
        renderedColumns: [],
      });

      const updated = await adapter.results.update({
        id: result.id,
        output: { test: "new output" },
        duration: 200,
        input: { test: "new input" },
        expected: { test: "new expected" },
        status: "success",
        renderedColumns: [{ label: "col1", value: "val1" }],
      });

      expect(updated.output).toEqual({ test: "new output" });
      expect(updated.duration).toBe(200);
      expect(updated.input).toEqual({ test: "new input" });
      expect(updated.expected).toEqual({ test: "new expected" });
      expect(updated.status).toBe("success");
      expect(updated.rendered_columns).toEqual([
        { label: "col1", value: "val1" },
      ]);
    });

    testAllAdapters("getMany returns all results", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const result1 = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const result2 = await adapter.results.create({
        evalId: eval1.id,
        order: 1,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const results = await adapter.results.getMany();

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toContain(result1.id);
      expect(results.map((r) => r.id)).toContain(result2.id);
    });

    testAllAdapters("getMany filters by ids", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const result1 = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      await adapter.results.create({
        evalId: eval1.id,
        order: 1,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const results = await adapter.results.getMany({ ids: [result1.id] });

      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe(result1.id);
    });

    testAllAdapters("getMany filters by evalIds", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "eval-1",
        filepath: "/test/path.eval.ts",
      });
      const eval2 = await adapter.evals.create({
        runId: run.id,
        name: "eval-2",
        filepath: "/test/path.eval.ts",
      });

      await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const result2 = await adapter.results.create({
        evalId: eval2.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const results = await adapter.results.getMany({ evalIds: [eval2.id] });

      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe(result2.id);
    });

    testAllAdapters("getMany filters by order", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const result2 = await adapter.results.create({
        evalId: eval1.id,
        order: 1,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const results = await adapter.results.getMany({ order: 1 });

      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe(result2.id);
    });

    testAllAdapters("getMany filters by statuses", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });

      const result1 = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      await adapter.results.create({
        evalId: eval1.id,
        order: 1,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "fail",
        renderedColumns: [],
      });

      const results = await adapter.results.getMany({ statuses: ["success"] });

      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe(result1.id);
    });
  });

  describe("scores", () => {
    testAllAdapters("create creates new score", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const score = await adapter.scores.create({
        resultId: result.id,
        name: "accuracy",
        score: 0.95,
        description: "Accuracy score",
        metadata: { key: "value" },
      });

      expect(score.id).toBeDefined();
      expect(score.result_id).toBe(result.id);
      expect(score.name).toBe("accuracy");
      expect(score.score).toBe(0.95);
      expect(score.description).toBe("Accuracy score");
      expect(score.metadata).toEqual({ key: "value" });
      expect(score.created_at).toBeDefined();
    });

    testAllAdapters(
      "create handles optional description",
      async (getAdapter) => {
        await using adapter = await getAdapter();
        const run = await adapter.runs.create({ runType: "full" });
        const eval1 = await adapter.evals.create({
          runId: run.id,
          name: "test-eval",
          filepath: "/test/path.eval.ts",
        });
        const result = await adapter.results.create({
          evalId: eval1.id,
          order: 0,
          input: {},
          expected: {},
          output: {},
          duration: 100,
          status: "success",
          renderedColumns: [],
        });

        const score = await adapter.scores.create({
          resultId: result.id,
          name: "accuracy",
          score: 0.95,
          metadata: null,
        });

        // SQLite returns null for undefined optional fields
        expect(score.description == null).toBe(true);
      }
    );

    testAllAdapters("getMany returns all scores", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const score1 = await adapter.scores.create({
        resultId: result.id,
        name: "score-1",
        score: 0.8,
        metadata: null,
      });

      const score2 = await adapter.scores.create({
        resultId: result.id,
        name: "score-2",
        score: 0.6,
        metadata: null,
      });

      const scores = await adapter.scores.getMany();

      expect(scores).toHaveLength(2);
      expect(scores.map((s) => s.id)).toContain(score1.id);
      expect(scores.map((s) => s.id)).toContain(score2.id);
    });

    testAllAdapters("getMany filters by ids", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const score1 = await adapter.scores.create({
        resultId: result.id,
        name: "score-1",
        score: 0.8,
        metadata: null,
      });

      await adapter.scores.create({
        resultId: result.id,
        name: "score-2",
        score: 0.6,
        metadata: null,
      });

      const scores = await adapter.scores.getMany({ ids: [score1.id] });

      expect(scores).toHaveLength(1);
      expect(scores[0]!.id).toBe(score1.id);
    });

    testAllAdapters("getMany filters by resultIds", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result1 = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });
      const result2 = await adapter.results.create({
        evalId: eval1.id,
        order: 1,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      await adapter.scores.create({
        resultId: result1.id,
        name: "score-1",
        score: 0.8,
        metadata: null,
      });

      const score2 = await adapter.scores.create({
        resultId: result2.id,
        name: "score-2",
        score: 0.6,
        metadata: null,
      });

      const scores = await adapter.scores.getMany({ resultIds: [result2.id] });

      expect(scores).toHaveLength(1);
      expect(scores[0]!.id).toBe(score2.id);
    });
  });

  describe("traces", () => {
    testAllAdapters("create creates new trace", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const trace = await adapter.traces.create({
        resultId: result.id,
        input: [{ role: "user", content: "test" }],
        output: "response",
        start: 1000,
        end: 2000,
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        order: 0,
      });

      expect(trace.id).toBeDefined();
      expect(trace.result_id).toBe(result.id);
      expect(trace.input).toEqual([{ role: "user", content: "test" }]);
      expect(trace.output).toBe("response");
      expect(trace.start_time).toBe(1000);
      expect(trace.end_time).toBe(2000);
      expect(trace.input_tokens).toBe(10);
      expect(trace.output_tokens).toBe(20);
      expect(trace.total_tokens).toBe(30);
      expect(trace.col_order).toBe(0);
    });

    testAllAdapters(
      "create handles optional token fields",
      async (getAdapter) => {
        await using adapter = await getAdapter();
        const run = await adapter.runs.create({ runType: "full" });
        const eval1 = await adapter.evals.create({
          runId: run.id,
          name: "test-eval",
          filepath: "/test/path.eval.ts",
        });
        const result = await adapter.results.create({
          evalId: eval1.id,
          order: 0,
          input: {},
          expected: {},
          output: {},
          duration: 100,
          status: "success",
          renderedColumns: [],
        });

        const trace = await adapter.traces.create({
          resultId: result.id,
          input: "test input",
          output: "test output",
          start: 1000,
          end: 2000,
          order: 0,
        });

        // SQLite returns null for undefined optional fields
        expect(trace.input_tokens == null).toBe(true);
        expect(trace.output_tokens == null).toBe(true);
        expect(trace.total_tokens == null).toBe(true);
      }
    );

    testAllAdapters("getMany returns all traces", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const trace1 = await adapter.traces.create({
        resultId: result.id,
        input: "input1",
        output: "output1",
        start: 1000,
        end: 2000,
        order: 0,
      });

      const trace2 = await adapter.traces.create({
        resultId: result.id,
        input: "input2",
        output: "output2",
        start: 2000,
        end: 3000,
        order: 1,
      });

      const traces = await adapter.traces.getMany();

      expect(traces).toHaveLength(2);
      expect(traces.map((t) => t.id)).toContain(trace1.id);
      expect(traces.map((t) => t.id)).toContain(trace2.id);
    });

    testAllAdapters("getMany filters by ids", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      const trace1 = await adapter.traces.create({
        resultId: result.id,
        input: "input1",
        output: "output1",
        start: 1000,
        end: 2000,
        order: 0,
      });

      await adapter.traces.create({
        resultId: result.id,
        input: "input2",
        output: "output2",
        start: 2000,
        end: 3000,
        order: 1,
      });

      const traces = await adapter.traces.getMany({ ids: [trace1.id] });

      expect(traces).toHaveLength(1);
      expect(traces[0]!.id).toBe(trace1.id);
    });

    testAllAdapters("getMany filters by resultIds", async (getAdapter) => {
      await using adapter = await getAdapter();
      const run = await adapter.runs.create({ runType: "full" });
      const eval1 = await adapter.evals.create({
        runId: run.id,
        name: "test-eval",
        filepath: "/test/path.eval.ts",
      });
      const result1 = await adapter.results.create({
        evalId: eval1.id,
        order: 0,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });
      const result2 = await adapter.results.create({
        evalId: eval1.id,
        order: 1,
        input: {},
        expected: {},
        output: {},
        duration: 100,
        status: "success",
        renderedColumns: [],
      });

      await adapter.traces.create({
        resultId: result1.id,
        input: "input1",
        output: "output1",
        start: 1000,
        end: 2000,
        order: 0,
      });

      const trace2 = await adapter.traces.create({
        resultId: result2.id,
        input: "input2",
        output: "output2",
        start: 2000,
        end: 3000,
        order: 0,
      });

      const traces = await adapter.traces.getMany({ resultIds: [result2.id] });

      expect(traces).toHaveLength(1);
      expect(traces[0]!.id).toBe(trace2.id);
    });
  });

  describe("lifecycle", () => {
    testAllAdapters("close method works", async (getAdapter) => {
      const adapter = await getAdapter();
      await expect(adapter.close()).resolves.not.toThrow();
    });

    testAllAdapters("Symbol.asyncDispose works", async (getAdapter) => {
      const adapter = await getAdapter();
      await expect(adapter[Symbol.asyncDispose]()).resolves.not.toThrow();
    });
  });
});
