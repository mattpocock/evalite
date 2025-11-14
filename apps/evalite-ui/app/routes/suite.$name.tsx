import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Link, Outlet, useMatches } from "@tanstack/react-router";
import { XCircleIcon, Zap } from "lucide-react";
import type * as React from "react";

import { DisplayInput } from "~/components/display-input";
import { InnerPageLayout } from "~/components/page-layout";
import { getScoreState, Score } from "~/components/score";
import { MyLineChart } from "~/components/ui/line-chart";
import { LiveDate } from "~/components/ui/live-date";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { formatTime, isArrayOfRenderedColumns } from "~/utils";
import { useServerStateUtils } from "~/hooks/use-server-state-utils";
import {
  getSuiteByNameQueryOptions,
  getServerStateQueryOptions,
} from "~/data/queries";
import { useSuspenseQueries } from "@tanstack/react-query";
import { average } from "evalite/utils";
import { useMemo } from "react";
import type { Evalite } from "evalite";

const searchSchema = z.object({
  timestamp: z.string().optional(),
  q: z.coerce.string().optional(),
});

export const Route = createFileRoute("/suite/$name")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search: { timestamp } }) => ({
    timestamp,
  }),
  loader: async ({ context, params, deps }) => {
    const { queryClient } = context;

    await Promise.all([
      queryClient.ensureQueryData(
        getSuiteByNameQueryOptions(params.name, deps.timestamp)
      ),
      queryClient.ensureQueryData(getServerStateQueryOptions),
    ]);
  },
  component: SuiteComponent,
});

type EvalTableRowProps = {
  eval: Evalite.Storage.Entities.Eval & {
    scores: Evalite.Storage.Entities.Score[];
  };
  evalIndex: number;
  name: string;
  timestamp: string | undefined;
  showExpectedColumn: boolean;
  isRunningEval: boolean;
  hasScores: boolean;
  prevSuite: Evalite.SDK.GetSuiteByNameResult["prevSuite"];
  cacheHitCount: number;
  cacheHitsByScorer: Record<string, number>;
  trialConfig?: {
    isFirstTrial: boolean;
    rowSpan: number;
    isOddGroup: boolean;
  };
};

const makeWrapper =
  (opts: { evalIndex: number; timestamp: string | undefined; name: string }) =>
  (props: { children: React.ReactNode }) => (
    <Link
      preload="intent"
      to={"/suite/$name/eval/$evalIndex"}
      params={{
        name: opts.name,
        evalIndex: opts.evalIndex.toString(),
      }}
      search={{
        timestamp: opts.timestamp,
      }}
      resetScroll={false}
      className="block h-full p-4"
      activeProps={{
        className: "active",
      }}
    >
      {props.children}
    </Link>
  );

function EvalTableRow({
  eval: _eval,
  evalIndex,
  name,
  timestamp,
  showExpectedColumn,
  isRunningEval,
  hasScores,
  prevSuite: prevEvaluation,
  cacheHitCount,
  cacheHitsByScorer,
  trialConfig,
}: EvalTableRowProps) {
  const Wrapper = useMemo(
    () => makeWrapper({ evalIndex, timestamp, name }),
    [evalIndex, timestamp, name]
  );

  return (
    <TableRow className={cn("has-[.active]:bg-foreground/20!")}>
      {cacheHitCount > 0 && (
        <TableCell className="pt-4 pl-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Zap className="size-4 text-accent-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              {cacheHitCount} LLM{" "}
              {cacheHitCount === 1 ? "call was cached" : "calls were cached"}
            </TooltipContent>
          </Tooltip>
        </TableCell>
      )}
      {isArrayOfRenderedColumns(_eval.rendered_columns) ? (
        <>
          {_eval.rendered_columns.map((column, index) => (
            <TableCell>
              <DisplayInput
                className={cn(
                  isRunningEval && "opacity-25",
                  "transition-opacity"
                )}
                input={column.value}
                shouldTruncateText
                Wrapper={Wrapper}
              />
            </TableCell>
          ))}
        </>
      ) : (
        <>
          {(!trialConfig || trialConfig.isFirstTrial) && (
            <TableCell
              rowSpan={trialConfig?.rowSpan}
              className={cn(
                trialConfig &&
                  (trialConfig.isOddGroup
                    ? "border-l-4 border-l-foreground/50"
                    : "border-l-4 border-l-foreground/20")
              )}
            >
              <DisplayInput
                className={cn(
                  isRunningEval && "opacity-25",
                  "transition-opacity"
                )}
                input={_eval.input}
                shouldTruncateText
                Wrapper={Wrapper}
              />
            </TableCell>
          )}
          <TableCell>
            <DisplayInput
              className={cn(
                isRunningEval && "opacity-25",
                "transition-opacity"
              )}
              input={_eval.output}
              shouldTruncateText
              Wrapper={Wrapper}
            />
          </TableCell>
          {showExpectedColumn && (!trialConfig || trialConfig.isFirstTrial) && (
            <TableCell rowSpan={trialConfig?.rowSpan}>
              <DisplayInput
                className={cn(
                  isRunningEval && "opacity-25",
                  "transition-opacity"
                )}
                input={_eval.expected}
                shouldTruncateText
                Wrapper={Wrapper}
              />
            </TableCell>
          )}
        </>
      )}

      {_eval.scores.map((scorer, index) => {
        const scoreInPreviousEvaluation = prevEvaluation?.evals
          .find((r) => r.input === _eval.input)
          ?.scores.find((s) => s.name === scorer.name);
        const scorerCacheHitCount = cacheHitsByScorer[scorer.name] ?? 0;
        return (
          <TableCell key={scorer.id} className={cn(index === 0 && "border-l")}>
            <Wrapper>
              <div className="flex items-center gap-2">
                {scorerCacheHitCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Zap className="size-3 text-accent-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {scorerCacheHitCount} LLM{" "}
                      {scorerCacheHitCount === 1
                        ? "call was cached"
                        : "calls were cached"}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Score
                  hasScores={hasScores}
                  score={scorer.score}
                  state={getScoreState({
                    score: scorer.score,
                    prevScore: scoreInPreviousEvaluation?.score,
                    status: _eval.status,
                  })}
                />
              </div>
            </Wrapper>
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function SuiteComponent() {
  const { name } = Route.useParams();
  const { timestamp } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [
    {
      data: { suite: possiblyRunningSuite, prevSuite, history },
    },
    { data: serverState },
  ] = useSuspenseQueries({
    queries: [
      getSuiteByNameQueryOptions(name, timestamp),
      getServerStateQueryOptions,
    ],
  });

  const serverStateUtils = useServerStateUtils(serverState);

  /**
   * There are two evaluations we need to take account of:
   * - possiblyRunningEvaluation: The evaluation that
   * may be currently running
   * - evaluationWithoutLayoutShift: The data from the
   * evaluation that is currently running, but without
   * dangers of layout shift
   *
   * The reason for this is that the evaluation that is
   * currently running may report its results in a way
   * that causes massive layout shift.
   *
   * So, we temporarily show the previous evaluation (if
   * there is one) until the new evaluation is done.
   *
   * If there isn't a previous evaluation, we leave it
   * undefined - which will hide the table.
   */
  let evaluationWithoutLayoutShift:
    | Evalite.SDK.GetSuiteByNameResult["suite"]
    | undefined;

  const mostRecentDate = history[history.length - 1]?.date;
  const isViewingLatest = !timestamp || timestamp === mostRecentDate;

  if (possiblyRunningSuite.status === "running" && isViewingLatest) {
    // If it's running, and there is a previous evaluation,
    // show the previous one
    if (prevSuite) {
      evaluationWithoutLayoutShift = prevSuite;
    } else {
      // Otherwise, show empty dataset
      evaluationWithoutLayoutShift = undefined;
    }
  } else {
    evaluationWithoutLayoutShift = possiblyRunningSuite;
  }

  const isEvalRoute = useMatches({
    select: (matches) => matches.some((m) => m.routeId.includes("eval")),
  });

  const showExpectedColumn =
    evaluationWithoutLayoutShift?.evals.every(
      (_eval) => _eval.expected !== null
    ) ?? false;

  const hasTrials =
    evaluationWithoutLayoutShift?.evals.some(
      (_eval) => typeof _eval.trial_index === "number"
    ) ?? false;

  // Group results by input/expected for trial grouping
  type EvalGroup = {
    input: unknown;
    expected: unknown;
    evals: (Evalite.Storage.Entities.Eval & {
      scores: Evalite.Storage.Entities.Score[];
    })[];
    groupIndex: number;
  };

  const evalGroups: EvalGroup[] = [];
  if (evaluationWithoutLayoutShift && hasTrials) {
    const groupMap = new Map<string, EvalGroup>();

    evaluationWithoutLayoutShift.evals.forEach((result) => {
      const key = JSON.stringify({
        input: result.input,
        expected: result.expected,
      });

      if (!groupMap.has(key)) {
        const group: EvalGroup = {
          input: result.input,
          expected: result.expected,
          evals: [],
          groupIndex: groupMap.size,
        };
        groupMap.set(key, group);
        evalGroups.push(group);
      }

      groupMap.get(key)!.evals.push(result);
    });
  }

  const evalScore = average(possiblyRunningSuite.evals || [], (r) =>
    average(r.scores, (s) => s.score)
  );

  const prevScore = prevSuite
    ? average(prevSuite.evals, (r) => average(r.scores, (s) => s.score))
    : undefined;

  const isRunningEval =
    serverStateUtils.isRunningSuiteName(name) &&
    evaluationWithoutLayoutShift?.created_at === mostRecentDate;

  const evaluationWithoutLayoutShiftScores =
    evaluationWithoutLayoutShift?.evals[0]?.scores ?? [];

  const hasScores =
    possiblyRunningSuite.evals.some((r) => r.scores.length > 0) ?? true;

  const doAnyEvalsHaveCacheHits = Object.values(
    serverState.cacheHitsByEval
  ).some((hits) => hits > 0);

  return (
    <>
      <title>{`${name} | Evalite`}</title>
      <meta name="description" content={`Welcome to Evalite!`} />
      <InnerPageLayout
        vscodeUrl={`vscode://file${possiblyRunningSuite.filepath}`}
        filepath={possiblyRunningSuite.filepath.split(/(\/|\\)/).slice(-1)[0]!}
      >
        <div className="text-foreground/60 mb-10 text-sm">
          <h1 className="tracking-tight text-2xl mb-2 font-medium text-foreground/90">
            {name}
          </h1>
          <div className="flex items-center">
            <Score
              score={evalScore}
              state={getScoreState({
                score: evalScore,
                prevScore,
                status: possiblyRunningSuite.status,
              })}
              hasScores={hasScores}
            ></Score>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <span>{formatTime(possiblyRunningSuite.duration)}</span>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <div className="flex items-center space-x-5">
              <LiveDate
                date={possiblyRunningSuite.created_at}
                className="block"
              />
              {!isViewingLatest && (
                <>
                  <Link
                    to={"/suite/$name"}
                    params={{
                      name,
                    }}
                    preload="intent"
                    className="bg-blue-100 uppercase tracking-wide font-medium text-blue-700 px-3 text-xs py-1 -my-1 rounded"
                  >
                    View Latest
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {history.length > 1 && (
          <div className="mb-10">
            <h2 className="mb-4 font-medium text-lg text-foreground/60">
              History
            </h2>
            {history.length > 1 && (
              <MyLineChart
                data={history}
                onDotClick={({ date }) => {
                  if (date === mostRecentDate) {
                    navigate({
                      search: {},
                    });
                  } else {
                    navigate({
                      search: {
                        timestamp: date,
                      },
                    });
                  }
                }}
              />
            )}
          </div>
        )}
        {evaluationWithoutLayoutShift &&
          evaluationWithoutLayoutShift.evals.length > 0 &&
          evaluationWithoutLayoutShiftScores.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 font-medium text-lg text-foreground/60">
                Scores
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {evaluationWithoutLayoutShiftScores.map((scorer) => {
                  const scorerName = scorer.name;
                  const scorerAverage = average(
                    evaluationWithoutLayoutShift.evals,
                    (r) => {
                      const score = r.scores.find((s) => s.name === scorerName);
                      return score?.score ?? 0;
                    }
                  );

                  const prevScorerAverage = prevSuite
                    ? average(prevSuite.evals, (r) => {
                        const score = r.scores.find(
                          (s) => s.name === scorerName
                        );
                        return score?.score ?? 0;
                      })
                    : undefined;

                  return (
                    <div
                      key={scorerName}
                      className="border rounded-lg p-4 bg-card"
                    >
                      <div className="text-sm text-foreground/60 mb-2">
                        {scorerName}
                      </div>
                      <div className="flex items-center justify-between">
                        <Score
                          score={scorerAverage}
                          state={getScoreState({
                            score: scorerAverage,
                            prevScore: prevScorerAverage,
                            status: possiblyRunningSuite.status,
                          })}
                          iconClassName="size-4"
                          hasScores={hasScores}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        {evaluationWithoutLayoutShift?.status === "fail" && (
          <div className="flex gap-4 px-4 my-14">
            <div className="flex-shrink-0">
              <XCircleIcon className="text-red-500 size-7" />
            </div>
            <div className="text-sm text-foreground/60 gap-1 flex flex-col">
              <h3 className="font-semibold text-foreground/90 mb-1 text-lg">
                Evaluation Failed
              </h3>
              <p>At least one of the runs produced an unexpected error.</p>
              <p>Check the terminal for more information.</p>
            </div>
          </div>
        )}
        {evaluationWithoutLayoutShift && (
          <>
            <h2 className="mb-4 font-medium text-lg text-foreground/60">
              Results
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  {doAnyEvalsHaveCacheHits && <TableHead></TableHead>}
                  {isArrayOfRenderedColumns(
                    evaluationWithoutLayoutShift.evals[0]?.rendered_columns
                  ) ? (
                    <>
                      {evaluationWithoutLayoutShift.evals[0].rendered_columns.map(
                        (column) => (
                          <TableHead key={column.label}>
                            {column.label}
                          </TableHead>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      <TableHead>Input</TableHead>
                      <TableHead>Output</TableHead>
                      {showExpectedColumn && <TableHead>Expected</TableHead>}
                    </>
                  )}
                  {evaluationWithoutLayoutShift.evals[0]?.scores.map(
                    (scorer, index) => (
                      <TableHead
                        key={scorer.name}
                        className={cn(index === 0 && "border-l")}
                      >
                        {scorer.name}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasTrials
                  ? // Render grouped evals with rowspan
                    evalGroups.flatMap((group) =>
                      group.evals.map((_eval, trialIndex) => {
                        const evalIndex =
                          evaluationWithoutLayoutShift!.evals.indexOf(_eval);
                        const cacheHitCount =
                          serverState.cacheHitsByEval[_eval.id] ?? 0;
                        const cacheHitsByScorer =
                          serverState.cacheHitsByScorer[_eval.id] ?? {};
                        return (
                          <EvalTableRow
                            key={`${JSON.stringify(_eval.input)}-${_eval.trial_index}`}
                            eval={_eval}
                            evalIndex={evalIndex}
                            name={name}
                            timestamp={timestamp}
                            showExpectedColumn={showExpectedColumn}
                            isRunningEval={isRunningEval}
                            hasScores={hasScores}
                            prevSuite={prevSuite}
                            cacheHitCount={cacheHitCount}
                            cacheHitsByScorer={cacheHitsByScorer}
                            trialConfig={{
                              isFirstTrial: trialIndex === 0,
                              rowSpan: group.evals.length,
                              isOddGroup: group.groupIndex % 2 === 1,
                            }}
                          />
                        );
                      })
                    )
                  : // Original rendering for non-trial results
                    evaluationWithoutLayoutShift.evals.map((_eval, index) => {
                      const cacheHitCount =
                        serverState.cacheHitsByEval[_eval.id] ?? 0;
                      const cacheHitsByScorer =
                        serverState.cacheHitsByScorer[_eval.id] ?? {};
                      return (
                        <EvalTableRow
                          key={JSON.stringify(_eval.input)}
                          eval={_eval}
                          evalIndex={index}
                          name={name}
                          timestamp={timestamp}
                          showExpectedColumn={showExpectedColumn}
                          isRunningEval={isRunningEval}
                          hasScores={hasScores}
                          prevSuite={prevSuite}
                          cacheHitCount={cacheHitCount}
                          cacheHitsByScorer={cacheHitsByScorer}
                        />
                      );
                    })}
              </TableBody>
            </Table>
          </>
        )}
      </InnerPageLayout>
      {/* Sheet Overlay backdrop */}
      {isEvalRoute && (
        <div
          className={cn(
            "fixed inset-0 z-10 bg-black/50 backdrop-blur-xs transition-opacity duration-300",
            "animate-in fade-in-0"
          )}
          onClick={() => {
            navigate({
              to: "/suite/$name",
              params: { name },
              search: { timestamp },
            });
          }}
        />
      )}
      <div
        className={cn(
          "fixed top-0 z-20 h-svh border-l p-2 bg-sidebar overflow-auto",
          "transition-[right] ease-linear shadow-lg duration-300",
          "hidden w-full sm:block sm:right-[-100%] sm:w-[500px] md:w-[600px] lg:w-[800px]",
          isEvalRoute && "block sm:right-0",
          !isEvalRoute && ""
        )}
      >
        <Outlet />
      </div>
    </>
  );
}
