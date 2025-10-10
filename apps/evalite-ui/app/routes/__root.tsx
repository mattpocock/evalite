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
import type { Db } from "evalite/db";
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

type EvalWithState = Evalite.SDK.GetMenuItemsResultEval & {
  state: ScoreState;
};

type GroupedEval =
  | { type: "single"; eval: EvalWithState }
  | {
      type: "group";
      groupName: string;
      variants: EvalWithState[];
    };

const getMenuItemsWithSelect = queryOptions({
  ...getMenuItemsQueryOptions,
  select: (data) => {
    const { evals: currentEvals, prevScore, score, evalStatus } = data;

    // Add state to evals
    const evalsWithState: EvalWithState[] = currentEvals.map((e) => ({
      ...e,
      state: getScoreState(e.score, e.prevScore),
    }));

    // Group by variantGroup
    const grouped: GroupedEval[] = [];
    const variantGroups = new Map<string, EvalWithState[]>();

    for (const evalItem of evalsWithState) {
      if (evalItem.variantGroup) {
        // This is a variant eval
        const existing = variantGroups.get(evalItem.variantGroup);
        if (existing) {
          existing.push(evalItem);
        } else {
          variantGroups.set(evalItem.variantGroup, [evalItem]);
        }
      } else {
        // Regular eval
        grouped.push({ type: "single", eval: evalItem });
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
      data: { groupedEvals, score, prevScore, evalStatus },
    },
    { data: serverState },
  ] = useSuspenseQueries({
    queries: [getMenuItemsWithSelect, getServerStateQueryOptions],
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
                  isRunning={serverState.type === "running"}
                  score={score}
                  state={getScoreState(score, prevScore)}
                  iconClassName="size-4"
                  evalStatus={evalStatus}
                  resultStatus={undefined}
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
                      key={`eval-${item.eval.name}`}
                      name={item.eval.name}
                      score={item.eval.score}
                      state={item.eval.state}
                      evalStatus={item.eval.evalStatus}
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
  variants: EvalWithState[];
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
          evalStatus={variant.evalStatus}
          isVariant={true}
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
  evalStatus: Db.EvalStatus;
  isVariant?: boolean;
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
          isRunning={serverStateUtils.isRunningEvalName(props.name)}
          evalStatus={props.evalStatus}
          resultStatus={undefined}
        />
      </Link>
    </SidebarMenuItem>
  );
};
