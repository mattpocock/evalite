import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { SidebarCloseIcon } from "lucide-react";
import type React from "react";
import { Fragment } from "react";
import { DisplayInput } from "~/components/display-input";
import { CopyButton } from "~/components/ui/copy-button";
import { getScoreState, Score } from "~/components/score";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { LiveDate } from "~/components/ui/live-date";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { formatTime, isArrayOfRenderedColumns } from "~/utils";

import { useSuspenseQueries } from "@tanstack/react-query";
import type { Evalite } from "evalite/types";
import { sum } from "evalite/utils";
import { z } from "zod";
import {
  getEvalQueryOptions,
  getServerStateQueryOptions,
} from "~/data/queries";
import { useServerStateUtils } from "~/hooks/use-server-state-utils";

const searchSchema = z.object({
  trace: z.number().optional(),
  timestamp: z.string().optional(),
  q: z.coerce.string().optional(),
});

export const Route = createFileRoute("/suite/$name/eval/$evalIndex")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    timestamp: search.timestamp,
  }),
  loader: async ({ params, deps, context }) => {
    const { queryClient } = context;

    await Promise.all([
      queryClient.ensureQueryData(
        getEvalQueryOptions({
          suiteName: params.name!,
          evalIndex: params.evalIndex!,
          suiteTimestamp: deps.timestamp ?? null,
        })
      ),
      queryClient.ensureQueryData(getServerStateQueryOptions),
    ]);
  },
  component: ResultComponent,
});

const MainBodySection = ({
  title,
  description,
  children,
  copyableText,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  copyableText?: string;
}) => (
  <div className="text-sm">
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <h2 className="font-medium text-base text-foreground/60">{title}</h2>
          {description && (
            <p className="text-foreground/50 text-xs mt-1">{description}</p>
          )}
        </div>
        {copyableText && (
          <div className="flex items-center gap-2">
            <CopyButton value={copyableText} />
          </div>
        )}
      </div>
    </div>
    <div className="mt-1 text-foreground/60">{children}</div>
  </div>
);

function ResultComponent() {
  const { name, evalIndex } = Route.useParams();
  const { timestamp, trace: traceIndex } = Route.useSearch();
  const [
    {
      data: { eval: _eval, prevEval, suite },
    },
    { data: serverState },
  ] = useSuspenseQueries({
    queries: [
      getEvalQueryOptions({
        suiteName: name!,
        evalIndex: evalIndex!,
        suiteTimestamp: timestamp ?? null,
      }),
      getServerStateQueryOptions,
    ],
  });
  const serverStateUtils = useServerStateUtils(serverState);

  const isRunning =
    serverStateUtils.isRunningSuiteName(name) && suite.created_at === timestamp;

  const startTime = _eval.traces[0]?.start_time ?? 0;
  const endTime = _eval.traces[_eval.traces.length - 1]?.end_time ?? 0;
  const totalTraceDuration = endTime - startTime;

  const traceBeingViewed = traceIndex != null ? _eval.traces[traceIndex] : null;

  const wholeEvalUsage =
    _eval.traces.length > 0 &&
    _eval.traces.every(
      (t) =>
        typeof t.input_tokens === "number" &&
        typeof t.output_tokens === "number" &&
        typeof t.total_tokens === "number"
    )
      ? {
          input_tokens: sum(_eval.traces, (t) => t.input_tokens),
          output_tokens: sum(_eval.traces, (t) => t.output_tokens),
          total_tokens: sum(_eval.traces, (t) => t.total_tokens),
        }
      : undefined;

  const hasCustomColumns = isArrayOfRenderedColumns(_eval.rendered_columns);

  const inputOutputSection = (
    <>
      <MainBodySection
        title="Input"
        description={`The input passed to the task.`}
        copyableText={typeof _eval.input === "string" ? _eval.input : undefined}
      >
        <DisplayInput
          shouldTruncateText={false}
          input={_eval.input}
        ></DisplayInput>
      </MainBodySection>
      <MainBodySeparator />
      {_eval.expected ? (
        <>
          <MainBodySection
            title="Expected"
            description={`A description of the expected output of the task.`}
            copyableText={
              typeof _eval.expected === "string" ? _eval.expected : undefined
            }
          >
            <DisplayInput
              shouldTruncateText={false}
              input={_eval.expected}
            ></DisplayInput>
          </MainBodySection>
          <MainBodySeparator />
        </>
      ) : null}
      <MainBodySection
        title="Output"
        description="The output of the task."
        copyableText={
          typeof _eval.output === "string" ? _eval.output : undefined
        }
      >
        <DisplayInput
          shouldTruncateText={false}
          input={_eval.output}
        ></DisplayInput>
      </MainBodySection>
    </>
  );
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-50 bg-sidebar border-b border-sidebar-border shadow-sm">
        <div className="p-2 flex items-center gap-3">
          <Button size={"icon"} variant="ghost" asChild>
            <Link
              to={"/suite/$name"}
              params={{
                name,
              }}
              search={{
                timestamp: timestamp ?? undefined,
              }}
              preload="intent"
              resetScroll={false}
            >
              <SidebarCloseIcon className="size-5 rotate-180" />
            </Link>
          </Button>
          <div>
            <span className="text-primary block font-semibold mb-1">Trace</span>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Score
                    score={_eval.score}
                    hasScores={_eval.scores.length > 0}
                    state={getScoreState({
                      score: _eval.score,
                      prevScore: prevEval?.score,
                      status: suite.status,
                    })}
                  />
                </BreadcrumbItem>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <BreadcrumbItem>{formatTime(_eval.duration)}</BreadcrumbItem>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <BreadcrumbItem>
                  <LiveDate date={suite.created_at} />
                </BreadcrumbItem>
                {wholeEvalUsage && (
                  <>
                    <Separator orientation="vertical" className="mx-1 h-4" />
                    <BreadcrumbItem>
                      {wholeEvalUsage.total_tokens ||
                        wholeEvalUsage.input_tokens +
                          wholeEvalUsage.output_tokens}{" "}
                      Tokens
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
        <div className="flex flex-row min-h-full">
          <div className="w-44 flex flex-col gap-3 flex-shrink-0 p-2">
            <TraceMenuItem
              duration={endTime - startTime}
              title="Eval"
              startPercent={0}
              endPercent={100}
              name={name}
              evalIndex={evalIndex}
            />
            {_eval.traces.map((trace, index) => {
              const startTimeWithinTrace = trace.start_time - startTime;
              const endTimeWithinTrace = trace.end_time - startTime;

              const startPercent =
                (startTimeWithinTrace / totalTraceDuration) * 100;
              const endPercent =
                (endTimeWithinTrace / totalTraceDuration) * 100;
              return (
                <TraceMenuItem
                  key={index}
                  duration={trace.end_time - trace.start_time}
                  title={`Trace ${index + 1}`}
                  name={name}
                  evalIndex={evalIndex}
                  traceIndex={index}
                  endPercent={endPercent}
                  startPercent={startPercent}
                />
              );
            })}
            {_eval.traces.length === 0 && (
              <span className="text-xs block text-foreground/50 text-center text-balance">
                Use <code>reportTrace</code> to capture traces.
              </span>
            )}
          </div>
          <div className="flex-grow border-l p-4 min-w-0 w-full">
            {traceBeingViewed == null && (
              <>
                {wholeEvalUsage && (
                  <>
                    <MainBodySection
                      title="Token Usage"
                      description="How many tokens the entire evaluation used."
                    >
                      <span className="block mb-1 text-sm">
                        Input Tokens: {wholeEvalUsage.input_tokens}
                      </span>
                      <span className="block">
                        Output Tokens: {wholeEvalUsage.output_tokens}
                      </span>
                    </MainBodySection>
                    <MainBodySeparator />
                  </>
                )}
                {!hasCustomColumns && inputOutputSection}
                {hasCustomColumns &&
                  (_eval.rendered_columns as Evalite.RenderedColumn[]).map(
                    (column, index) => (
                      <Fragment key={column.label}>
                        {index > 0 && <MainBodySeparator />}
                        <MainBodySection
                          title={column.label}
                          description={undefined}
                          copyableText={
                            typeof column.value === "string"
                              ? column.value
                              : undefined
                          }
                        >
                          <DisplayInput
                            shouldTruncateText={false}
                            input={column.value}
                          ></DisplayInput>
                        </MainBodySection>
                      </Fragment>
                    )
                  )}

                {_eval.scores.map((score) => (
                  <Fragment key={score.name}>
                    <MainBodySeparator />
                    <MainBodySection
                      key={score.name}
                      title={score.name}
                      description={score.description}
                    >
                      <Score
                        hasScores={_eval.scores.length > 0}
                        score={score.score ?? 0}
                        state={getScoreState({
                          score: score.score ?? 0,
                          prevScore: prevEval?.scores.find(
                            (prevScore) => prevScore.name === score.name
                          )?.score,
                          status: _eval.status,
                        })}
                      />
                    </MainBodySection>
                    {score.metadata ? (
                      <div className="mt-2">
                        <DisplayInput
                          shouldTruncateText={false}
                          input={score.metadata}
                          name="metadata"
                        ></DisplayInput>
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </>
            )}
            {traceBeingViewed && (
              <>
                {typeof traceBeingViewed.output_tokens === "number" &&
                  typeof traceBeingViewed.input_tokens === "number" && (
                    <>
                      <MainBodySection
                        title="Token Usage"
                        description="How many tokens were used by this trace."
                      >
                        <span className="block mb-1 text-sm">
                          Input Tokens: {traceBeingViewed.input_tokens}
                        </span>
                        <span className="block">
                          Output Tokens: {traceBeingViewed.output_tokens}
                        </span>
                      </MainBodySection>
                      <MainBodySeparator />
                    </>
                  )}
                <MainBodySection title="Input">
                  <DisplayInput
                    shouldTruncateText={false}
                    input={traceBeingViewed.input}
                  ></DisplayInput>
                </MainBodySection>
                <MainBodySeparator />
                <MainBodySection title="Output">
                  <DisplayInput
                    shouldTruncateText={false}
                    input={traceBeingViewed.output}
                  ></DisplayInput>
                </MainBodySection>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MainBodySeparator = () => (
  <Separator className="mt-6 mb-4" orientation="horizontal" />
);

const TraceMenuItem = (props: {
  title: string;
  duration: number;
  /**
   * Number between 0 and 100
   */
  startPercent: number;
  /*
   * Number between 0 and 100
   */
  endPercent: number;
  name: string;
  evalIndex: string;
  traceIndex?: number;
}) => {
  const length = props.endPercent - props.startPercent;

  return (
    <Link
      to={"/suite/$name/eval/$evalIndex"}
      params={{
        name: props.name,
        evalIndex: props.evalIndex,
      }}
      className={"px-2 py-2 hover:bg-foreground/10 transition-colors"}
      activeProps={{
        className: "bg-foreground/20!",
      }}
      activeOptions={{
        includeSearch: true,
        exact: true,
      }}
      preload="intent"
      resetScroll={false}
    >
      {({ isActive }) => (
        <>
          <div className="mb-1 flex items-center justify-between space-x-3">
            <span className="block text-sm font-medium text-foreground/60">
              {props.title}
            </span>
            <span className="text-xs text-foreground/60">
              {formatTime(props.duration)}
            </span>
          </div>
          <div className="relative w-full">
            <div
              className={cn(
                "w-full rounded-full h-1 bg-foreground/20 transition-colors",
                isActive && "bg-foreground/30"
              )}
            ></div>
            <div
              className="absolute top-0 w-full rounded-full h-1 bg-gray-500"
              style={{
                left: `${props.startPercent}%`,
                width: `${length}%`,
              }}
            ></div>
          </div>
        </>
      )}
    </Link>
  );
};
