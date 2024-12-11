import { getResult } from "@evalite/core/sdk";
import { sum } from "@evalite/core/utils";
import {
  Link,
  NavLink,
  useLoaderData,
  useSearchParams,
  type ClientLoaderFunctionArgs,
} from "@remix-run/react";
import { SidebarCloseIcon } from "lucide-react";
import type React from "react";
import { useContext } from "react";
import { DisplayInput } from "~/components/display-input";
import { getScoreState, Score } from "~/components/score";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { LiveDate } from "~/components/ui/live-date";
import { Separator } from "~/components/ui/separator";
import { SidebarContent, SidebarHeader } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { TestServerStateContext } from "~/use-subscribe-to-socket";
import { formatTime } from "~/utils";

const MainBodySection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="text-sm">
    <div className="mb-3">
      <h2 className="font-medium text-base text-gray-600">{title}</h2>
      {description && (
        <p className="text-gray-500 text-xs mt-1">{description}</p>
      )}
    </div>
    <div className="mt-1 text-gray-600">{children}</div>
  </div>
);

export const clientLoader = async (args: ClientLoaderFunctionArgs) => {
  const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
  const data = await getResult({
    evalName: args.params.name!,
    resultIndex: args.params.index!,
    evalTimestamp: searchParams.get("timestamp"),
  });

  return {
    data,
    name: args.params.name!,
    resultIndex: args.params.index!,
    timestamp: searchParams.get("timestamp"),
  };
};

export default function Page() {
  const {
    data: { result, prevResult, evaluation },
    name,
    resultIndex,
    timestamp,
  } = useLoaderData<typeof clientLoader>();

  const serverState = useContext(TestServerStateContext);

  const isRunning = serverState.isRunningResultId(result.id);

  const [searchParams] = useSearchParams();

  const startTime = result.traces[0]?.start_time ?? 0;
  const endTime = result.traces[result.traces.length - 1]?.end_time ?? 0;
  const totalTraceDuration = endTime - startTime;

  const traceIndex = searchParams.get("trace");

  const traceBeingViewed = traceIndex
    ? result.traces[Number(traceIndex)]
    : null;

  const wholeEvalUsage =
    result.traces.length > 0 &&
    result.traces.every(
      (t) =>
        typeof t.completion_tokens === "number" &&
        typeof t.prompt_tokens === "number"
    )
      ? {
          prompt_tokens: sum(result.traces, (t) => t.prompt_tokens),
          completion_tokens: sum(result.traces, (t) => t.completion_tokens),
        }
      : undefined;
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Button size={"icon"} variant="ghost" asChild>
            <Link
              to={`/eval/${name}${timestamp ? `?timestamp=${timestamp}` : ""}`}
              prefetch="intent"
              preventScrollReset
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
                    isRunning={isRunning}
                    score={result.score}
                    state={getScoreState(result.score, prevResult?.score)}
                    evalStatus={evaluation.status}
                  />
                </BreadcrumbItem>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <BreadcrumbItem>{formatTime(result.duration)}</BreadcrumbItem>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <BreadcrumbItem>
                  <LiveDate date={evaluation.created_at} />
                </BreadcrumbItem>
                {wholeEvalUsage && (
                  <>
                    <Separator orientation="vertical" className="mx-1 h-4" />
                    <BreadcrumbItem>
                      {wholeEvalUsage.prompt_tokens +
                        wholeEvalUsage.completion_tokens}{" "}
                      Tokens
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <Separator className="mt-2" />
      </SidebarHeader>
      <SidebarContent className="p-2 pb-8 flex flex-row h-full">
        <div className="w-44 flex flex-col gap-3 flex-shrink-0">
          <TraceMenuItem
            duration={endTime - startTime}
            title="Eval"
            startPercent={0}
            endPercent={100}
            href={`/eval/${name}/trace/${resultIndex}`}
            isActive={!searchParams.get("trace")}
          />
          {result.traces.map((trace, traceIndex) => {
            const startTimeWithinTrace = trace.start_time - startTime;
            const endTimeWithinTrace = trace.end_time - startTime;

            const startPercent =
              (startTimeWithinTrace / totalTraceDuration) * 100;
            const endPercent = (endTimeWithinTrace / totalTraceDuration) * 100;
            return (
              <TraceMenuItem
                duration={trace.end_time - trace.start_time}
                title={`Trace ${traceIndex + 1}`}
                href={`/eval/${name}/trace/${resultIndex}?trace=${traceIndex}`}
                endPercent={endPercent}
                startPercent={startPercent}
                isActive={searchParams.get("trace") === String(traceIndex)}
              ></TraceMenuItem>
            );
          })}
          {result.traces.length === 0 && (
            <span className="text-xs block text-gray-500 text-center text-balance">
              Use <code>reportTrace</code> to capture traces.
            </span>
          )}
        </div>
        <div className="flex-grow border-l pl-4">
          {!searchParams.get("trace") && (
            <>
              {wholeEvalUsage && (
                <>
                  <MainBodySection
                    title="Token Usage"
                    description="How many tokens the entire evaluation used."
                  >
                    <span className="block mb-1 text-sm">
                      Prompt Tokens: {wholeEvalUsage.prompt_tokens}
                    </span>
                    <span className="block">
                      Completion Tokens: {wholeEvalUsage.completion_tokens}
                    </span>
                  </MainBodySection>
                  <MainBodySeparator />
                </>
              )}
              <MainBodySection title="Input">
                <DisplayInput
                  shouldTruncateText={false}
                  input={result.input}
                ></DisplayInput>
              </MainBodySection>
              <MainBodySeparator />
              {result.expected ? (
                <>
                  <MainBodySection title="Expected">
                    <DisplayInput
                      shouldTruncateText={false}
                      input={result.expected}
                    ></DisplayInput>
                  </MainBodySection>
                  <MainBodySeparator />
                </>
              ) : null}
              <MainBodySection title="Output">
                <DisplayInput
                  shouldTruncateText={false}
                  input={result.output}
                ></DisplayInput>
              </MainBodySection>

              {result.scores.map((score) => (
                <>
                  <MainBodySeparator />
                  <MainBodySection
                    key={score.name}
                    title={score.name}
                    description={score.description}
                  >
                    <Score
                      isRunning={isRunning}
                      score={score.score ?? 0}
                      state={getScoreState(
                        score.score ?? 0,
                        prevResult?.scores.find(
                          (prevScore) => prevScore.name === score.name
                        )?.score
                      )}
                      evalStatus={evaluation.status}
                    />
                  </MainBodySection>
                  {score.metadata && (
                    <>
                      <DisplayInput
                        shouldTruncateText={false}
                        input={score.metadata}
                      ></DisplayInput>
                    </>
                  )}
                </>
              ))}
            </>
          )}
          {traceBeingViewed && (
            <>
              {typeof traceBeingViewed.completion_tokens === "number" &&
                typeof traceBeingViewed.prompt_tokens === "number" && (
                  <>
                    <MainBodySection
                      title="Token Usage"
                      description="How many tokens were used by this trace."
                    >
                      <span className="block mb-1 text-sm">
                        Prompt Tokens: {traceBeingViewed.prompt_tokens}
                      </span>
                      <span className="block">
                        Completion Tokens: {traceBeingViewed.completion_tokens}
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
      </SidebarContent>
    </>
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
  href: string;
  isActive: boolean;
}) => {
  const length = props.endPercent - props.startPercent;

  return (
    <NavLink
      to={props.href}
      className={cn(
        "px-2 py-2 hover:bg-gray-100 transition-colors",
        props.isActive && "bg-gray-200 hover:bg-gray-200"
      )}
      prefetch="intent"
      end
    >
      <div className="mb-1 flex items-center justify-between space-x-3">
        <span className="block text-sm font-medium text-gray-600">
          {props.title}
        </span>
        <span className="text-xs text-gray-600">
          {formatTime(props.duration)}
        </span>
      </div>
      <div className="relative w-full">
        <div
          className={cn(
            "w-full rounded-full h-1 bg-gray-200 transition-colors",
            props.isActive && "bg-gray-300"
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
    </NavLink>
  );
};
