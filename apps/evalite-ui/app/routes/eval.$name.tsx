import { getEvalByName } from "@evalite/core/sdk";
import { average, sum } from "@evalite/core/utils";
import type { MetaFunction } from "@remix-run/node";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useSearchParams,
  type ClientLoaderFunctionArgs,
} from "@remix-run/react";
import { Loader, LoaderCircleIcon, XCircleIcon } from "lucide-react";
import React, { useContext } from "react";
import { DisplayInput } from "~/components/display-input";
import { InnerPageLayout } from "~/components/page-layout";
import { getScoreState, Score } from "~/components/score";
import { Button } from "~/components/ui/button";
import { MyLineChart } from "~/components/ui/line-chart";
import { LiveDate } from "~/components/ui/live-date";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { TestServerStateContext } from "~/use-subscribe-to-socket";
import { formatTime } from "~/utils";

export const meta: MetaFunction<typeof clientLoader> = (args) => {
  return [
    { title: `${(args.data as any)?.name} | Evalite` },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const clientLoader = async (args: ClientLoaderFunctionArgs) => {
  const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
  const result = await getEvalByName(
    args.params.name!,
    searchParams.get("timestamp")
  );

  return {
    ...result,
    name: args.params.name!,
  };
};

export default function Page() {
  const { name, evaluation, prevEvaluation, history } =
    useLoaderData<typeof clientLoader>();

  const firstResult = evaluation.results[0];

  const serverState = useContext(TestServerStateContext);

  const showExpectedColumn = evaluation.results.every(
    (result) => result.expected !== null
  );

  const isTraceRoute = location.pathname.includes("trace");

  const score = average(evaluation.results, (r) =>
    average(r.scores, (s) => s.score)
  );

  const prevScore = prevEvaluation
    ? average(prevEvaluation.results, (r) => average(r.scores, (s) => s.score))
    : undefined;

  const [search, setSearch] = useSearchParams();

  const timestamp = search.get("timestamp");

  const latestDate = history[history.length - 1]?.date;

  const isNotViewingLatest = timestamp && timestamp !== latestDate;

  return (
    <>
      <InnerPageLayout
        vscodeUrl={`vscode://file${evaluation.filepath}`}
        filepath={evaluation.filepath.split(/(\/|\\)/).slice(-1)[0]!}
      >
        <div className="text-gray-600 mb-10 text-sm">
          <h1 className="tracking-tight text-2xl mb-2 font-medium text-gray-700">
            {name}
          </h1>
          <div className="flex items-center">
            <Score
              evalStatus={evaluation.status}
              isRunning={
                serverState.isRunningEvalName(evaluation.name) &&
                evaluation.created_at === latestDate
              }
              score={score}
              state={getScoreState(score, prevScore)}
            ></Score>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <span>{formatTime(evaluation.duration)}</span>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <div className="flex items-center space-x-5">
              <LiveDate date={evaluation.created_at} className="block" />
              {isNotViewingLatest && (
                <>
                  <Link
                    to={`/eval/${name}`}
                    prefetch="intent"
                    className="bg-blue-100 uppercase tracking-wide font-medium text-blue-700 px-3 text-xs py-1 -my-1 rounded"
                  >
                    View Latest
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {evaluation.status === "fail" && (
          <div className="flex gap-4 px-4">
            <div className="flex-shrink-0">
              <XCircleIcon className="text-red-500 size-7" />
            </div>
            <div className="text-sm text-gray-600 gap-1 flex flex-col">
              <h3 className="font-semibold text-gray-700 mb-1 text-lg">
                Evaluation Failed
              </h3>
              <p>This is likely because of an exception from your code.</p>
              <p>Check the terminal for more information.</p>
            </div>
          </div>
        )}
        {evaluation.status === "success" && (
          <div className="">
            {history.length > 1 && (
              <div className="mb-10">
                <h2 className="mb-4 font-medium text-lg text-gray-600">
                  History
                </h2>
                {history.length > 1 && (
                  <MyLineChart
                    data={history}
                    onDotClick={({ date }) => {
                      if (date === latestDate) {
                        setSearch({});
                      } else {
                        setSearch({ timestamp: date });
                      }
                    }}
                  />
                )}
              </div>
            )}
            <h2 className="mb-4 font-medium text-lg text-gray-600">Results</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Input</TableHead>
                  <TableHead>Output</TableHead>
                  {showExpectedColumn && <TableHead>Expected</TableHead>}
                  {firstResult?.scores.map((scorer, index) => (
                    <TableHead
                      key={scorer.name}
                      className={cn(index === 0 && "border-l")}
                    >
                      {scorer.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluation.results.map((result, index) => {
                  const isResultRunning = serverState.isRunningResultId(
                    result.id
                  );
                  const Wrapper = (props: { children: React.ReactNode }) => (
                    <NavLink
                      prefetch="intent"
                      to={`trace/${index}${timestamp ? `?timestamp=${timestamp}` : ""}`}
                      preventScrollReset
                      className={({ isActive }) => {
                        return cn("block h-full p-4", isActive && "active");
                      }}
                    >
                      {props.children}
                    </NavLink>
                  );
                  return (
                    <TableRow
                      key={JSON.stringify(result.input)}
                      className="has-[.active]:bg-gray-100"
                    >
                      <td className="align-top">
                        <DisplayInput
                          input={result.input}
                          shouldTruncateText
                          Wrapper={Wrapper}
                        />
                      </td>
                      <td className="align-top">
                        {isResultRunning ? (
                          <div className="p-4">
                            <LoaderCircleIcon className="animate-spin size-5 text-blue-500" />
                          </div>
                        ) : (
                          <DisplayInput
                            input={result.output}
                            shouldTruncateText
                            Wrapper={Wrapper}
                          />
                        )}
                      </td>
                      {showExpectedColumn && (
                        <td className="align-top">
                          <DisplayInput
                            input={result.expected}
                            shouldTruncateText
                            Wrapper={Wrapper}
                          />
                        </td>
                      )}
                      {result.scores.map((scorer, index) => {
                        const scoreInPreviousEvaluation =
                          prevEvaluation?.results
                            .find((r) => r.input === result.input)
                            ?.scores.find((s) => s.name === scorer.name);
                        return (
                          <td
                            key={scorer.id}
                            className={cn(
                              index === 0 && "border-l",
                              "align-top"
                            )}
                          >
                            <Wrapper>
                              <Score
                                score={scorer.score}
                                isRunning={serverState.isRunningResultId(
                                  result.id
                                )}
                                evalStatus={evaluation.status}
                                state={getScoreState(
                                  scorer.score,
                                  scoreInPreviousEvaluation?.score
                                )}
                              />
                            </Wrapper>
                          </td>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </InnerPageLayout>
      <div
        className={cn(
          "fixed top-0 z-20 h-svh border-l p-2 bg-sidebar overflow-auto",
          "transition-[right] ease-linear shadow-lg duration-300",
          "hidden w-full sm:block sm:right-[-100%] sm:w-[500px] md:w-[600px] lg:w-[800px]",
          isTraceRoute && "block sm:right-0",
          !isTraceRoute && ""
        )}
      >
        <Outlet />
      </div>
    </>
  );
}
