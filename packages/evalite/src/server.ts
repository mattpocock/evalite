import { fastifyStatic } from "@fastify/static";
import { fastifyWebsocket } from "@fastify/websocket";
import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import {
  getAverageScoresFromResults,
  getEvalByName,
  getEvals,
  getEvalsAverageScores,
  getHistoricalEvalsWithScoresByName,
  getMostRecentRun,
  getPreviousCompletedEval,
  getResults,
  getScores,
  getTraces,
  type SQLiteDatabase,
} from "./db.js";
import type { Evalite } from "./types.js";
import { average } from "./utils.js";

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

export const createServer = (opts: { 
  db: SQLiteDatabase;
  triggerRun?: () => Promise<void>;
}) => {
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

  server.post("/api/trigger-run", async (req, reply) => {
    if (opts.triggerRun) {
      try {
        await opts.triggerRun();
        return reply.code(200).send({ success: true });
      } catch (error) {
        console.error("Error in triggerRun:", error);
        return reply.code(500).send({ success: false, message: "Error during run" });
      }
    } else {
      return reply.code(400).send({ 
        success: false, 
        message: "Manual run not available" 
      });
    }
  });

  server.get<{
    Reply: Evalite.SDK.GetMenuItemsResult;
  }>("/api/menu-items", async (req, reply) => {
    const latestFullRun = getMostRecentRun(opts.db, "full");

    if (!latestFullRun) {
      return reply.code(200).send({
        evals: [],
        prevScore: undefined,
        score: 0,
        evalStatus: "success",
      });
    }

    let latestPartialRun = getMostRecentRun(opts.db, "partial");

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

    const allEvals = getEvals(
      opts.db,
      [latestFullRun.id, latestPartialRun?.id].filter(
        (id) => typeof id === "number"
      ),
      ["fail", "success", "running"]
    ).map((e) => ({
      ...e,
      prevEval: getPreviousCompletedEval(opts.db, e.name, e.created_at),
    }));

    const evalsAverageScores = getEvalsAverageScores(
      opts.db,
      allEvals.flatMap((e) => {
        if (e.prevEval) {
          return [e.id, e.prevEval.id];
        }
        return [e.id];
      })
    );

    const createEvalMenuItem = (
      e: (typeof allEvals)[number]
    ): Evalite.SDK.GetMenuItemsResultEval => {
      const score =
        evalsAverageScores.find((s) => s.eval_id === e.id)?.average ?? 0;
      const prevScore = evalsAverageScores.find(
        (s) => s.eval_id === e.prevEval?.id
      )?.average;

      return {
        filepath: e.filepath,
        name: e.name,
        score,
        prevScore,
        evalStatus: e.status,
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

      const evaluation = getEvalByName(opts.db, {
        name,
        timestamp: req.query.timestamp,
      });

      if (!evaluation) {
        return res.code(404).send();
      }

      const prevEvaluation = getPreviousCompletedEval(
        opts.db,
        name,
        evaluation.created_at
      );

      const results = getResults(
        opts.db,
        [evaluation.id, prevEvaluation?.id].filter((i) => typeof i === "number")
      );

      const scores = getScores(
        opts.db,
        results.map((r) => r.id)
      );

      const history = getHistoricalEvalsWithScoresByName(opts.db, name);

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
      const evaluation = getEvalByName(opts.db, {
        name: req.query.name,
        timestamp: req.query.timestamp,
        statuses: ["fail", "success"],
      });

      if (!evaluation) {
        return res.code(404).send();
      }

      const prevEvaluation = getPreviousCompletedEval(
        opts.db,
        req.query.name,
        evaluation.created_at
      );

      const results = getResults(
        opts.db,
        [evaluation.id, prevEvaluation?.id].filter((i) => typeof i === "number")
      );

      const thisEvaluationResults = results.filter(
        (r) => r.eval_id === evaluation.id
      );

      const thisResult = thisEvaluationResults[Number(req.query.index)];

      if (!thisResult) {
        return res.code(404).send();
      }

      const prevEvaluationResults = results.filter(
        (r) => r.eval_id === prevEvaluation?.id
      );

      const averageScores = getAverageScoresFromResults(
        opts.db,
        results.map((r) => r.id)
      );

      const scores = getScores(
        opts.db,
        results.map((r) => r.id)
      );

      const traces = getTraces(
        opts.db,
        results.map((r) => r.id)
      );

      const result: Evalite.SDK.GetResultResult["result"] = {
        ...thisResult,
        score:
          averageScores.find((s) => s.result_id === thisResult.id)?.average ??
          0,
        scores: scores.filter((s) => s.result_id === thisResult.id),
        traces: traces.filter((t) => t.result_id === thisResult.id),
      };

      const prevResultInDb = prevEvaluationResults[Number(req.query.index)];

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
