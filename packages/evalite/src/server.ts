import { fastifyStatic } from "@fastify/static";
import { fastifyWebsocket } from "@fastify/websocket";
import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import type { EvaliteStorage } from "./storage/types.js";
import type { Evalite } from "./types.js";
import { average } from "./utils.js";
import { computeAverageScores } from "./storage/utils.js";

export type Server = ReturnType<typeof createServer>;

const THROTTLE_TIME = 100;

export const handleWebsockets = (server: fastify.FastifyInstance) => {
  const websocketListeners = new Map<
    string,
    (event: Evalite.ServerState) => void
  >();

  let currentState: Evalite.ServerState = {
    type: "idle",
  };

  let timeout: NodeJS.Timeout | undefined;

  server.register(async (fastify) => {
    fastify.get("/api/socket", { websocket: true }, (socket, req) => {
      websocketListeners.set(req.id, (event) => {
        socket.send(JSON.stringify(event));
      });

      socket.on("close", () => {
        websocketListeners.delete(req.id);
      });
    });
  });

  return {
    updateState: (newState: Evalite.ServerState) => {
      currentState = newState;
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        websocketListeners.forEach((listener) => {
          listener(newState);
        });
      }, THROTTLE_TIME);
    },
    getState: () => currentState,
  };
};

export const createServer = (opts: { storage: EvaliteStorage }) => {
  const UI_ROOT = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "./ui"
  );
  const server = fastify();

  server.register(fastifyWebsocket);
  server.register(fastifyStatic, {
    root: path.join(UI_ROOT),
  });

  server.setNotFoundHandler(async (req, reply) => {
    return reply.status(200).sendFile("index.html");
  });

  // Add CORS headers
  server.addHook("onSend", (req, reply, payload, done) => {
    reply.header("access-control-allow-origin", "*");
    done(null, payload);
  });

  const websockets = handleWebsockets(server);

  server.get<{
    Reply: Evalite.ServerState;
  }>("/api/server-state", async (req, reply) => {
    return reply.code(200).send(websockets.getState());
  });

  server.get<{
    Reply: Evalite.SDK.GetMenuItemsResult;
  }>("/api/menu-items", async (req, reply) => {
    const latestFullRunResults = await opts.storage.runs.getMany({
      runType: "full",
      orderBy: "created_at",
      orderDirection: "desc",
      limit: 1,
    });

    const latestFullRun = latestFullRunResults[0];

    if (!latestFullRun) {
      return reply.code(200).send({
        evals: [],
        prevScore: undefined,
        score: 0,
        evalStatus: "success",
      });
    }

    const latestPartialRunResults = await opts.storage.runs.getMany({
      runType: "partial",
      orderBy: "created_at",
      orderDirection: "desc",
      limit: 1,
    });

    let latestPartialRun = latestPartialRunResults[0];

    /**
     * Ignore latestPartialRun if the latestFullRun is more
     * up to date
     */
    if (
      latestPartialRun &&
      new Date(latestPartialRun.created_at).getTime() <
        new Date(latestFullRun.created_at).getTime()
    ) {
      latestPartialRun = undefined;
    }

    const runIds = [latestFullRun.id, latestPartialRun?.id].filter(
      (id): id is number => typeof id === "number"
    );

    const evalsFromDb = await opts.storage.evals.getMany({
      runIds,
      statuses: ["fail", "success", "running"],
    });

    const allEvals = await Promise.all(
      evalsFromDb.map(async (e) => {
        const prevEvalResults = await opts.storage.evals.getMany({
          name: e.name,
          createdBefore: e.created_at,
          statuses: ["fail", "success"],
          orderBy: "created_at",
          orderDirection: "desc",
          limit: 1,
        });
        return {
          ...e,
          prevEval: prevEvalResults[0],
        };
      })
    );

    const allResults = await opts.storage.results.getMany({
      evalIds: allEvals.map((e) => e.id),
    });

    const allScores = await opts.storage.scores.getMany({
      resultIds: allResults.map((r) => r.id),
    });

    const calcEvalAverage = (evalId: number): number => {
      const evalResults = allResults.filter((r) => r.eval_id === evalId);
      const evalScores = allScores.filter((s) =>
        evalResults.some((r) => r.id === s.result_id)
      );
      if (evalScores.length === 0) return 0;
      return (
        evalScores.reduce((sum, s) => sum + s.score, 0) / evalScores.length
      );
    };

    const createEvalMenuItem = (
      e: (typeof allEvals)[number]
    ): Evalite.SDK.GetMenuItemsResultEval => {
      const score = calcEvalAverage(e.id);
      const prevScore = e.prevEval ? calcEvalAverage(e.prevEval.id) : undefined;

      const evalResults = allResults.filter((r) => r.eval_id === e.id);
      const evalScores = allScores.filter((s) =>
        evalResults.some((r) => r.id === s.result_id)
      );
      const hasScores = evalScores.length > 0;

      return {
        filepath: e.filepath,
        name: e.name,
        score,
        prevScore,
        evalStatus: e.status,
        variantName: e.variant_name,
        variantGroup: e.variant_group,
        hasScores,
      };
    };

    let lastFullRunEvals = allEvals.filter(
      (e) => e.run_id === latestFullRun.id
    );

    if (latestPartialRun) {
      const partialEvals = allEvals.filter(
        (e) => e.run_id === latestPartialRun.id
      );

      // Filter out the partial evals from the full run
      // and add them to the lastFullRunEvals
      lastFullRunEvals = [
        ...partialEvals,
        ...lastFullRunEvals.filter(
          (e) => !partialEvals.some((p) => p.name === e.name)
        ),
      ];
    }

    const menuItems = lastFullRunEvals.map(createEvalMenuItem).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    return reply.code(200).send({
      evals: menuItems,
      score: average(menuItems, (e) => e.score),
      prevScore: average(menuItems, (e) => e.prevScore ?? e.score),
      evalStatus: menuItems.some((e) => e.evalStatus === "fail")
        ? "fail"
        : "success",
    });
  });

  server.route<{
    Querystring: {
      name: string;
      timestamp?: string;
    };
    Reply: Evalite.SDK.GetEvalByNameResult;
  }>({
    method: "GET",
    url: "/api/eval",
    schema: {
      querystring: {
        type: "object",
        properties: {
          name: { type: "string" },
          timestamp: { type: "string" },
        },
        required: ["name"],
      },
    },
    handler: async (req, res) => {
      const name = req.query.name;

      const evaluationResults = await opts.storage.evals.getMany({
        name,
        createdAt: req.query.timestamp,
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const evaluation = evaluationResults[0];

      if (!evaluation) {
        return res.code(404).send();
      }

      const prevEvaluationResults = await opts.storage.evals.getMany({
        name,
        createdBefore: evaluation.created_at,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const prevEvaluation = prevEvaluationResults[0];

      const evalIds = [evaluation.id, prevEvaluation?.id].filter(
        (i): i is number => typeof i === "number"
      );

      const results = await opts.storage.results.getMany({
        evalIds,
      });

      const scores = await opts.storage.scores.getMany({
        resultIds: results.map((r) => r.id),
      });

      const historyEvals = await opts.storage.evals.getMany({
        name,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "asc",
      });

      const historyResults = await opts.storage.results.getMany({
        evalIds: historyEvals.map((e) => e.id),
      });

      const historyScores = await opts.storage.scores.getMany({
        resultIds: historyResults.map((r) => r.id),
      });

      const history = historyEvals.map((e) => {
        const evalResults = historyResults.filter((r) => r.eval_id === e.id);
        const evalScores = historyScores.filter((s) =>
          evalResults.some((r) => r.id === s.result_id)
        );
        const average_score =
          evalScores.length > 0
            ? evalScores.reduce((sum, s) => sum + s.score, 0) /
              evalScores.length
            : 0;
        return {
          average_score,
          created_at: e.created_at,
        };
      });

      return res.code(200).send({
        history: history.map((h) => ({
          score: h.average_score,
          date: h.created_at,
        })),
        evaluation: {
          ...evaluation,
          results: results
            .filter((r) => r.eval_id === evaluation.id)
            .map((r) => ({
              ...r,
              scores: scores.filter((s) => s.result_id === r.id),
            })),
        },
        prevEvaluation: prevEvaluation
          ? {
              ...prevEvaluation,
              results: results
                .filter((r) => r.eval_id === prevEvaluation.id)
                .map((r) => ({
                  ...r,
                  scores: scores.filter((s) => s.result_id === r.id),
                })),
            }
          : undefined,
      });
    },
  });

  server.route<{
    Querystring: {
      name: string;
      index: string;
      timestamp?: string;
    };
    Reply: Evalite.SDK.GetResultResult;
  }>({
    method: "GET",
    url: "/api/eval/result",
    schema: {
      querystring: {
        type: "object",
        properties: {
          name: { type: "string" },
          index: { type: "string" },
          timestamp: { type: "string" },
        },
        required: ["name", "index"],
      },
    },
    handler: async (req, res) => {
      const evaluationResults = await opts.storage.evals.getMany({
        name: req.query.name,
        createdAt: req.query.timestamp,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const evaluation = evaluationResults[0];

      if (!evaluation) {
        return res.code(404).send();
      }

      const prevEvaluationResults = await opts.storage.evals.getMany({
        name: req.query.name,
        createdBefore: evaluation.created_at,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const prevEvaluation = prevEvaluationResults[0];

      const evalIds = [evaluation.id, prevEvaluation?.id].filter(
        (i): i is number => typeof i === "number"
      );

      const results = await opts.storage.results.getMany({
        evalIds,
      });

      const thisEvaluationResults = results.filter(
        (r) => r.eval_id === evaluation.id
      );

      const thisResult = thisEvaluationResults[Number(req.query.index)];

      if (!thisResult) {
        return res.code(404).send();
      }

      const prevResultsForEval = results.filter(
        (r) => r.eval_id === prevEvaluation?.id
      );

      const scores = await opts.storage.scores.getMany({
        resultIds: results.map((r) => r.id),
      });

      const averageScores = computeAverageScores(scores);

      const traces = await opts.storage.traces.getMany({
        resultIds: results.map((r) => r.id),
      });

      const result: Evalite.SDK.GetResultResult["result"] = {
        ...thisResult,
        score:
          averageScores.find((s) => s.result_id === thisResult.id)?.average ??
          0,
        scores: scores.filter((s) => s.result_id === thisResult.id),
        traces: traces.filter((t) => t.result_id === thisResult.id),
      };

      const prevResultInDb = prevResultsForEval[Number(req.query.index)];

      const prevResult: Evalite.SDK.GetResultResult["prevResult"] =
        prevResultInDb
          ? {
              ...prevResultInDb,
              score:
                averageScores.find((s) => s.result_id === prevResultInDb.id)
                  ?.average ?? 0,
              scores: scores.filter((s) => s.result_id === prevResultInDb.id),
            }
          : undefined;

      return res.code(200).send({
        result,
        prevResult,
        evaluation,
      });
    },
  });

  server.route<{
    Querystring: {
      path: string;
      download?: boolean;
    };
  }>({
    method: "GET",
    url: "/api/file",
    schema: {
      querystring: {
        type: "object",
        properties: {
          path: { type: "string" },
          download: { type: "boolean" },
        },
        required: ["path"],
      },
    },
    handler: async (req, res) => {
      const filePath = req.query.path;

      const parsed = path.parse(filePath);

      if (req.query.download) {
        return res
          .header(
            "content-disposition",
            `attachment; filename="${parsed.base}"`
          )
          .sendFile(parsed.base, parsed.dir);
      }

      return res.sendFile(parsed.base, parsed.dir);
    },
  });

  return {
    updateState: websockets.updateState,
    start: (port: number) => {
      server.listen(
        {
          port,
        },
        (err) => {
          if (err) {
            console.error(err);
            process.exit(1);
          }
        }
      );
    },
  };
};
