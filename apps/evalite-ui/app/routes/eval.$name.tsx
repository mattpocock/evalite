import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Link, Outlet, useMatches } from "@tanstack/react-router";
import { XCircleIcon } from "lucide-react";
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
import { cn } from "~/lib/utils";
import { formatTime, isArrayOfRenderedColumns } from "~/utils";
import { useServerStateUtils } from "~/hooks/use-server-state-utils";
import {
  getEvalByNameQueryOptions,
  getServerStateQueryOptions,
} from "~/data/queries";
import { useSuspenseQueries } from "@tanstack/react-query";
import { average } from "evalite/utils";
import { useMemo } from "react";
import type { Evalite } from "evalite";

const searchSchema = z.object({
  timestamp: z.string().optional(),
});

export const Route = createFileRoute("/eval/$name")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search: { timestamp } }) => ({
    timestamp,
  }),
  loader: async ({ context, params, deps }) => {
    const { queryClient } = context;

    await Promise.all([
      queryClient.ensureQueryData(
        getEvalByNameQueryOptions(params.name, deps.timestamp)
      ),
      queryClient.ensureQueryData(getServerStateQueryOptions),
    ]);
  },
  component: EvalComponent,
});

type ResultTableRowProps = {
  result: Evalite.Storage.Entities.Result & {
    scores: Evalite.Storage.Entities.Score[];
  };
  resultIndex: number;
  name: string;
  timestamp: string | undefined;
  showExpectedColumn: boolean;
  isRunningEval: boolean;
  hasScores: boolean;
  prevEvaluation: Evalite.SDK.GetEvalByNameResult["prevEvaluation"];
  trialConfig?: {
    isFirstTrial: boolean;
    rowSpan: number;
    isOddGroup: boolean;
  };
};

const makeWrapper =
  (opts: {
    resultIndex: number;
    timestamp: string | undefined;
    name: string;
  }) =>
  (props: { children: React.ReactNode }) => (
    <Link
      preload="intent"
      to={"/eval/$name/result/$resultIndex"}
      params={{
        name: opts.name,
        resultIndex: opts.resultIndex.toString(),
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

function ResultTableRow({
  result,
  resultIndex,
  name,
  timestamp,
  showExpectedColumn,
  isRunningEval,
  hasScores,
  prevEvaluation,
  trialConfig,
}: ResultTableRowProps) {
  const Wrapper = useMemo(
    () => makeWrapper({ resultIndex, timestamp, name }),
    [resultIndex, timestamp, name]
  );
  return (
    <TableRow
      key={
        trialConfig
          ? `${JSON.stringify(result.input)}-${result.trial_index}`
          : JSON.stringify(result.input)
      }
      className={cn(
        "has-[.active]:bg-foreground/20!",
        trialConfig?.isOddGroup && "bg-muted/30"
      )}
    >
      {isArrayOfRenderedColumns(result.rendered_columns) ? (
        <>
          {result.rendered_columns.map((column) => (
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
            <TableCell rowSpan={trialConfig?.rowSpan}>
              <DisplayInput
                className={cn(
                  isRunningEval && "opacity-25",
                  "transition-opacity"
                )}
                input={result.input}
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
              input={result.output}
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
                input={result.expected}
                shouldTruncateText
                Wrapper={Wrapper}
              />
            </TableCell>
          )}
        </>
      )}

      {result.scores.map((scorer, index) => {
        const scoreInPreviousEvaluation = prevEvaluation?.results
          .find((r) => r.input === result.input)
          ?.scores.find((s) => s.name === scorer.name);
        return (
          <TableCell key={scorer.id} className={cn(index === 0 && "border-l")}>
            <Wrapper>
              <Score
                hasScores={hasScores}
                score={scorer.score}
                state={getScoreState({
                  score: scorer.score,
                  prevScore: scoreInPreviousEvaluation?.score,
                  status: result.status,
                })}
              />
            </Wrapper>
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function EvalComponent() {
  const { name } = Route.useParams();
  const { timestamp } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [
    {
      data: { evaluation: possiblyRunningEvaluation, prevEvaluation, history },
    },
    { data: serverState },
  ] = useSuspenseQueries({
    queries: [
      getEvalByNameQueryOptions(name, timestamp),
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
    | Evalite.SDK.GetEvalByNameResult["evaluation"]
    | undefined;

  const mostRecentDate = history[history.length - 1]?.date;
  const isViewingLatest = !timestamp || timestamp === mostRecentDate;

  if (possiblyRunningEvaluation.status === "running" && isViewingLatest) {
    // If it's running, and there is a previous evaluation,
    // show the previous one
    if (prevEvaluation) {
      evaluationWithoutLayoutShift = prevEvaluation;
    } else {
      // Otherwise, show empty dataset
      evaluationWithoutLayoutShift = undefined;
    }
  } else {
    evaluationWithoutLayoutShift = possiblyRunningEvaluation;
  }

  const isResultRoute = useMatches({
    select: (matches) => matches.some((m) => m.routeId.includes("result")),
  });

  const showExpectedColumn =
    evaluationWithoutLayoutShift?.results.every(
      (result) => result.expected !== null
    ) ?? false;

  const hasTrials =
    evaluationWithoutLayoutShift?.results.some(
      (result) => result.trial_index !== undefined
    ) ?? false;

  // Group results by input/expected for trial grouping
  type ResultGroup = {
    input: unknown;
    expected: unknown;
    results: Evalite.SDK.GetEvalByNameResult["evaluation"]["results"];
    groupIndex: number;
  };

  const resultGroups: ResultGroup[] = [];
  if (evaluationWithoutLayoutShift && hasTrials) {
    const groupMap = new Map<string, ResultGroup>();

    evaluationWithoutLayoutShift.results.forEach((result) => {
      const key = JSON.stringify({
        input: result.input,
        expected: result.expected,
      });

      if (!groupMap.has(key)) {
        const group: ResultGroup = {
          input: result.input,
          expected: result.expected,
          results: [],
          groupIndex: groupMap.size,
        };
        groupMap.set(key, group);
        resultGroups.push(group);
      }

      groupMap.get(key)!.results.push(result);
    });
  }

  const evalScore = average(possiblyRunningEvaluation.results || [], (r) =>
    average(r.scores, (s) => s.score)
  );

  const prevScore = prevEvaluation
    ? average(prevEvaluation.results, (r) => average(r.scores, (s) => s.score))
    : undefined;

  const isRunningEval =
    serverStateUtils.isRunningEvalName(name) &&
    evaluationWithoutLayoutShift?.created_at === mostRecentDate;

  const evaluationWithoutLayoutShiftScores =
    evaluationWithoutLayoutShift?.results[0]?.scores ?? [];

  const hasScores =
    possiblyRunningEvaluation.results.some((r) => r.scores.length > 0) ?? true;

  return (
    <>
      <title>{`${name} | Evalite`}</title>
      <meta name="description" content={`Welcome to Evalite!`} />
      <InnerPageLayout
        vscodeUrl={`vscode://file${possiblyRunningEvaluation.filepath}`}
        filepath={
          possiblyRunningEvaluation.filepath.split(/(\/|\\)/).slice(-1)[0]!
        }
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
                status: possiblyRunningEvaluation.status,
              })}
              hasScores={hasScores}
            ></Score>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <span>{formatTime(possiblyRunningEvaluation.duration)}</span>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <div className="flex items-center space-x-5">
              <LiveDate
                date={possiblyRunningEvaluation.created_at}
                className="block"
              />
              {!isViewingLatest && (
                <>
                  <Link
                    to={"/eval/$name"}
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
          evaluationWithoutLayoutShift.results.length > 0 &&
          evaluationWithoutLayoutShiftScores.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 font-medium text-lg text-foreground/60">
                Scores
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {evaluationWithoutLayoutShiftScores.map((scorer) => {
                  const scorerName = scorer.name;
                  const scorerAverage = average(
                    evaluationWithoutLayoutShift.results,
                    (r) => {
                      const score = r.scores.find((s) => s.name === scorerName);
                      return score?.score ?? 0;
                    }
                  );

                  const prevScorerAverage = prevEvaluation
                    ? average(prevEvaluation.results, (r) => {
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
                            status: possiblyRunningEvaluation.status,
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
                  {isArrayOfRenderedColumns(
                    evaluationWithoutLayoutShift.results[0]?.rendered_columns
                  ) ? (
                    <>
                      {evaluationWithoutLayoutShift.results[0].rendered_columns.map(
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
                  {evaluationWithoutLayoutShift.results[0]?.scores.map(
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
                  ? // Render grouped trials with rowspan
                    resultGroups.flatMap((group) =>
                      group.results.map((result, trialIndex) => {
                        const resultIndex =
                          evaluationWithoutLayoutShift!.results.indexOf(result);
                        return (
                          <ResultTableRow
                            key={`${JSON.stringify(result.input)}-${result.trial_index}`}
                            result={result}
                            resultIndex={resultIndex}
                            name={name}
                            timestamp={timestamp}
                            showExpectedColumn={showExpectedColumn}
                            isRunningEval={isRunningEval}
                            hasScores={hasScores}
                            prevEvaluation={prevEvaluation}
                            trialConfig={{
                              isFirstTrial: trialIndex === 0,
                              rowSpan: group.results.length,
                              isOddGroup: group.groupIndex % 2 === 1,
                            }}
                          />
                        );
                      })
                    )
                  : // Original rendering for non-trial results
                    evaluationWithoutLayoutShift.results.map(
                      (result, index) => (
                        <ResultTableRow
                          key={JSON.stringify(result.input)}
                          result={result}
                          resultIndex={index}
                          name={name}
                          timestamp={timestamp}
                          showExpectedColumn={showExpectedColumn}
                          isRunningEval={isRunningEval}
                          hasScores={hasScores}
                          prevEvaluation={prevEvaluation}
                        />
                      )
                    )}
              </TableBody>
            </Table>
          </>
        )}
      </InnerPageLayout>
      <div
        className={cn(
          "fixed top-0 z-20 h-svh border-l p-2 bg-sidebar overflow-auto",
          "transition-[right] ease-linear shadow-lg duration-300",
          "hidden w-full sm:block sm:right-[-100%] sm:w-[500px] md:w-[600px] lg:w-[800px]",
          isResultRoute && "block sm:right-0",
          !isResultRoute && ""
        )}
      >
        <Outlet />
      </div>
    </>
  );
}
