import {
  type QueryClient,
  queryOptions,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";

import { lazy } from "react";
import { Play } from "lucide-react";
import Logo from "~/components/logo";
import { getScoreState, Score, type ScoreState } from "~/components/score";
import { Button } from "~/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "~/components/ui/sidebar";
import {
  getMenuItemsQueryOptions,
  getServerStateQueryOptions,
} from "~/data/queries";
import { useSubscribeToSocket } from "~/data/use-subscribe-to-socket";
import { useServerStateUtils } from "~/hooks/use-server-state-utils";
import { triggerRun } from "~/sdk";
import "../tailwind.css";
import type { Db } from "evalite/db";

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      );

const getMenuItemsWithSelect = queryOptions({
  ...getMenuItemsQueryOptions,
  select: (data) => {
    const { evals: currentEvals, prevScore, score, evalStatus } = data;

    return {
      currentEvals: currentEvals.map((e) => {
        return {
          ...e,
          state: getScoreState(e.score, e.prevScore),
        };
      }),
      score,
      prevScore,
      evalStatus,
    };
  },
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: App,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getMenuItemsQueryOptions),
      context.queryClient.ensureQueryData(getServerStateQueryOptions),
    ]);
  },
});

export default function App() {
  const [
    {
      data: { currentEvals, score, prevScore, evalStatus },
    },
    { data: serverState },
  ] = useSuspenseQueries({
    queries: [getMenuItemsWithSelect, getServerStateQueryOptions],
  });

  const queryClient = useQueryClient();

  useSubscribeToSocket(queryClient);

  const handleTriggerRun = async () => {
    try {
      const result = await triggerRun();
      if (!result.success) {
        console.error('Failed to trigger run:', result.message);
      }
    } catch (error) {
      console.error('Error triggering run:', error);
    }
  };

  return (
    <SidebarProvider className="w-full">
      <Sidebar className="border-r-0">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem className="border-b md:-mx-3 -mx-2 md:px-3 px-2 pb-1.5">
              <div className="px-2 py-1">
                <Logo />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <div className="px-2">
              <p className="text-xs font-medium text-sidebar-foreground/70 mb-2">
                Summary
              </p>
              <div className="text-foreground/60 font-medium text-2xl">
                <Score
                  isRunning={serverState.type === "running"}
                  score={score}
                  state={getScoreState(score, prevScore)}
                  iconClassName="size-4"
                  evalStatus={evalStatus}
                  resultStatus={undefined}
                />
              </div>
              <div className="mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={serverState.type === "running"}
                  onClick={() => handleTriggerRun()}
                  className="w-full"
                >
                  <Play className="size-4 mr-1" />
                  Run all
                </Button>
              </div>
            </div>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Evals</SidebarGroupLabel>
            <SidebarMenu>
              {currentEvals.map((e) => {
                return (
                  <EvalSidebarItem
                    key={`current-${e.name}`}
                    name={e.name}
                    score={e.score}
                    state={e.state}
                    evalStatus={e.evalStatus}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <Outlet />
      <TanStackRouterDevtools />
      <ReactQueryDevtools />
    </SidebarProvider>
  );
}

const EvalSidebarItem = (props: {
  name: string;
  state: ScoreState;
  score: number;
  evalStatus: Db.EvalStatus;
}) => {
  const serverState = useSuspenseQuery(getServerStateQueryOptions);
  const serverStateUtils = useServerStateUtils(serverState.data);

  return (
    <SidebarMenuItem key={props.name}>
      <Link
        preload="intent"
        to={`/eval/$name`}
        params={{ name: props.name }}
        className={
          "flex justify-between text-sm px-2 py-1 rounded hover:bg-foreground/10 active:bg-foreground/20 transition-colors"
        }
        activeProps={{
          className: "bg-foreground/20! text-foreground/80",
        }}
      >
        <span>{props.name}</span>

        <Score
          score={props.score}
          state={props.state}
          isRunning={serverStateUtils.isRunningEvalName(props.name)}
          evalStatus={props.evalStatus}
          resultStatus={undefined}
        />
      </Link>
    </SidebarMenuItem>
  );
};
