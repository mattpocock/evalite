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

import type { Evalite } from "evalite/types";
import { FolderOpen } from "lucide-react";
import { lazy } from "react";
import Logo from "~/components/logo";
import { getScoreState, Score, type ScoreState } from "~/components/score";
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
import "../tailwind.css";

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      );

type SuiteWithState = Evalite.SDK.GetMenuItemsResultSuite & {
  state: ScoreState;
};

type GroupedSuite =
  | { type: "single"; suite: SuiteWithState }
  | {
      type: "group";
      groupName: string;
      variants: SuiteWithState[];
    };

const getMenuItemsWithSelect = queryOptions({
  ...getMenuItemsQueryOptions,
  select: (data) => {
    const { suites: currentSuites, prevScore, score, runStatus } = data;

    // Add state to evals
    const suitesWithState: SuiteWithState[] = currentSuites.map((e) => ({
      ...e,
      state: getScoreState({
        status: e.suiteStatus,
        score: e.score,
        prevScore: e.prevScore,
      }),
    }));

    const hasScores = currentSuites.some((e) => e.hasScores);

    // Group by variantGroup
    const grouped: GroupedSuite[] = [];
    const variantGroups = new Map<string, SuiteWithState[]>();

    for (const suite of suitesWithState) {
      if (suite.variantGroup) {
        // This is a variant eval
        const existing = variantGroups.get(suite.variantGroup);
        if (existing) {
          existing.push(suite);
        } else {
          variantGroups.set(suite.variantGroup, [suite]);
        }
      } else {
        // Regular eval
        grouped.push({ type: "single", suite: suite });
      }
    }

    // Add grouped variants, sorted by score within each group
    for (const [groupName, variants] of variantGroups) {
      variants.sort((a, b) => b.score - a.score);
      grouped.push({ type: "group", groupName, variants });
    }

    return {
      groupedEvals: grouped,
      score,
      prevScore,
      runStatus,
      hasScores,
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
      data: { groupedEvals, score, prevScore, hasScores, runStatus },
    },
  ] = useSuspenseQueries({
    queries: [getMenuItemsWithSelect],
  });

  const queryClient = useQueryClient();

  useSubscribeToSocket(queryClient);

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
                  score={score}
                  state={getScoreState({
                    score,
                    prevScore,
                    status: runStatus,
                  })}
                  iconClassName="size-4"
                  hasScores={hasScores}
                />
              </div>
            </div>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Evals</SidebarGroupLabel>
            <SidebarMenu>
              {groupedEvals.map((item, idx) => {
                if (item.type === "single") {
                  return (
                    <EvalSidebarItem
                      key={`eval-${item.suite.name}`}
                      name={item.suite.name}
                      score={item.suite.score}
                      state={item.suite.state}
                      suiteStatus={item.suite.suiteStatus}
                      hasScores={item.suite.hasScores}
                    />
                  );
                } else {
                  return (
                    <VariantGroup
                      key={`group-${item.groupName}`}
                      groupName={item.groupName}
                      variants={item.variants}
                    />
                  );
                }
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

const VariantGroup = (props: {
  groupName: string;
  variants: SuiteWithState[];
}) => {
  return (
    <>
      <SidebarMenuItem>
        <div className="flex items-center gap-1.5 text-sm px-2 py-1 text-sidebar-foreground/70">
          <FolderOpen className="size-4" />
          <span>{props.groupName}</span>
        </div>
      </SidebarMenuItem>
      {props.variants.map((variant) => (
        <EvalSidebarItem
          key={`variant-${variant.name}`}
          name={variant.name}
          variantName={variant.variantName}
          score={variant.score}
          state={variant.state}
          suiteStatus={variant.suiteStatus}
          isVariant={true}
          hasScores={variant.hasScores}
        />
      ))}
    </>
  );
};

const EvalSidebarItem = (props: {
  name: string;
  variantName?: string | undefined;
  state: ScoreState;
  score: number;
  suiteStatus: Evalite.Storage.Entities.SuiteStatus;
  isVariant?: boolean;
  hasScores: boolean;
}) => {
  return (
    <SidebarMenuItem key={props.name}>
      <Link
        preload="intent"
        to={`/suite/$name`}
        params={{ name: props.name }}
        className={
          props.isVariant
            ? "flex justify-between text-sm px-2 py-1 pl-7 rounded hover:bg-foreground/10 active:bg-foreground/20 transition-colors"
            : "flex justify-between text-sm px-2 py-1 rounded hover:bg-foreground/10 active:bg-foreground/20 transition-colors"
        }
        activeProps={{
          className: "bg-foreground/20! text-foreground/80",
        }}
      >
        <span>{props.variantName || props.name}</span>

        <Score
          score={props.score}
          state={props.state}
          hasScores={props.hasScores}
        />
      </Link>
    </SidebarMenuItem>
  );
};
