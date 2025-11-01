import { fastifyStatic } from "@fastify/static";
import { fastifyWebsocket } from "@fastify/websocket";
import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
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

export const createServer = (opts: { storage: Evalite.Storage }) => {
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
        suites: [],
        prevScore: undefined,
        score: 0,
        runStatus: "success",
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

    const evalsFromDb = await opts.storage.suites.getMany({
      runIds,
      statuses: ["fail", "success", "running"],
    });

    const allSuites = await Promise.all(
      evalsFromDb.map(async (e) => {
        const prevEvalResults = await opts.storage.suites.getMany({
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

    const allEvals = await opts.storage.evals.getMany({
      suiteIds: allSuites.map((e) => e.id),
    });

    const allScores = await opts.storage.scores.getMany({
      evalIds: allEvals.map((r) => r.id),
    });

    const calcEvalAverage = (evalId: number): number => {
      const evalResults = allEvals.filter((r) => r.suite_id === evalId);
      const evalScores = allScores.filter((s) =>
        evalResults.some((r) => r.id === s.eval_id)
      );
      if (evalScores.length === 0) return 0;
      return (
        evalScores.reduce((sum, s) => sum + s.score, 0) / evalScores.length
      );
    };

    const createEvalMenuItem = (
      e: (typeof allSuites)[number]
    ): Evalite.SDK.GetMenuItemsResultSuite => {
      const score = calcEvalAverage(e.id);
      const prevScore = e.prevEval ? calcEvalAverage(e.prevEval.id) : undefined;

      const evalResults = allEvals.filter((r) => r.suite_id === e.id);
      const evalScores = allScores.filter((s) =>
        evalResults.some((r) => r.id === s.eval_id)
      );
      const hasScores = evalScores.length > 0;

      return {
        filepath: e.filepath,
        name: e.name,
        score,
        prevScore,
        suiteStatus: e.status,
        variantName: e.variant_name,
        variantGroup: e.variant_group,
        hasScores,
      };
    };

    let lastFullRunEvals = allSuites.filter(
      (e) => e.run_id === latestFullRun.id
    );

    if (latestPartialRun) {
      const partialEvals = allSuites.filter(
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
      suites: menuItems,
      score: average(menuItems, (e) => e.score),
      prevScore: average(menuItems, (e) => e.prevScore ?? e.score),
      runStatus: menuItems.some((e) => e.suiteStatus === "fail")
        ? "fail"
        : "success",
    });
  });

  server.route<{
    Querystring: {
      name: string;
      timestamp?: string;
    };
    Reply: Evalite.SDK.GetSuiteByNameResult;
  }>({
    method: "GET",
    url: "/api/suite",
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

      const evaluationResults = await opts.storage.suites.getMany({
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

      const prevSuites = await opts.storage.suites.getMany({
        name,
        createdBefore: evaluation.created_at,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const prevSuite = prevSuites[0];

      const suiteIds = [evaluation.id, prevSuite?.id].filter(
        (i): i is number => typeof i === "number"
      );

      const evals = await opts.storage.evals.getMany({
        suiteIds: suiteIds,
      });

      const scores = await opts.storage.scores.getMany({
        evalIds: evals.map((e) => e.id),
      });

      const historySuites = await opts.storage.suites.getMany({
        name,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "asc",
      });

      const historyResults = await opts.storage.evals.getMany({
        suiteIds: historySuites.map((e) => e.id),
      });

      const historyScores = await opts.storage.scores.getMany({
        evalIds: historyResults.map((r) => r.id),
      });

      const history = historySuites.map((e) => {
        const evalResults = historyResults.filter((r) => r.suite_id === e.id);
        const evalScores = historyScores.filter((s) =>
          evalResults.some((r) => r.id === s.eval_id)
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
        suite: {
          ...evaluation,
          evals: evals
            .filter((r) => r.suite_id === evaluation.id)
            .map((r) => ({
              ...r,
              scores: scores.filter((s) => s.eval_id === r.id),
            })),
        },
        prevSuite: prevSuite
          ? {
              ...prevSuite,
              evals: evals
                .filter((r) => r.suite_id === prevSuite.id)
                .map((r) => ({
                  ...r,
                  scores: scores.filter((s) => s.eval_id === r.id),
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
    Reply: Evalite.SDK.GetEvalResult;
  }>({
    method: "GET",
    url: "/api/suite/eval",
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
      const suites = await opts.storage.suites.getMany({
        name: req.query.name,
        createdAt: req.query.timestamp,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const suite = suites[0];

      if (!suite) {
        return res.code(404).send();
      }

      const prevSuites = await opts.storage.suites.getMany({
        name: req.query.name,
        createdBefore: suite.created_at,
        statuses: ["fail", "success"],
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 1,
      });

      const prevSuite = prevSuites[0];

      const suiteIds = [suite.id, prevSuite?.id].filter(
        (i): i is number => typeof i === "number"
      );

      const evals = await opts.storage.evals.getMany({
        suiteIds,
      });

      const thisEvaluationResults = evals.filter(
        (e) => e.suite_id === suite.id
      );

      const thisResult = thisEvaluationResults[Number(req.query.index)];

      if (!thisResult) {
        return res.code(404).send();
      }

      const prevEvalsForSuite = evals.filter(
        (e) => e.suite_id === prevSuite?.id
      );

      const scores = await opts.storage.scores.getMany({
        evalIds: evals.map((e) => e.id),
      });

      const averageScores = computeAverageScores(scores);

      const traces = await opts.storage.traces.getMany({
        evalIds: evals.map((e) => e.id),
      });

      const _eval: Evalite.SDK.GetEvalResult["eval"] = {
        ...thisResult,
        score:
          averageScores.find((s) => s.eval_id === thisResult.id)?.average ?? 0,
        scores: scores.filter((s) => s.eval_id === thisResult.id),
        traces: traces.filter((t) => t.eval_id === thisResult.id),
      };

      const prevEvalInDb = prevEvalsForSuite[Number(req.query.index)];

      const prevEval: Evalite.SDK.GetEvalResult["prevEval"] = prevEvalInDb
        ? {
            ...prevEvalInDb,
            score:
              averageScores.find((s) => s.eval_id === prevEvalInDb.id)
                ?.average ?? 0,
            scores: scores.filter((s) => s.eval_id === prevEvalInDb.id),
          }
        : undefined;

      return res.code(200).send({
        eval: _eval,
        prevEval: prevEval,
        suite: suite,
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
