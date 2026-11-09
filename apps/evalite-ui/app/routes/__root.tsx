import {
  type QueryClient,
  queryOptions,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import type { Evalite } from "evalite/types";
import { RotateCw, Search, X } from "lucide-react";
import { lazy, useState } from "react";
import Logo from "~/components/logo";
import { Score, type ScoreState } from "~/components/score";
import { getScoreState } from "~/components/get-score-state";
import { ThemeProvider } from "~/components/theme-provider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
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
import { cn } from "~/lib/utils";
import { isStaticMode, triggerRerun } from "~/sdk";
import "../tailwind.css";

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      );

const searchSchema = z.object({
  q: z.coerce.string().optional(),
});

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
  validateSearch: zodValidator(searchSchema),
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
    { data: serverState },
  ] = useSuspenseQueries({
    queries: [getMenuItemsWithSelect, getServerStateQueryOptions],
  });

  const search = Route.useSearch();
  const router = useRouter();
  const searchQuery = search.q;

  const queryClient = useQueryClient();

  useSubscribeToSocket(queryClient);

  const [isRerunning, setIsRerunning] = useState(false);

  const handleRerun = async () => {
    setIsRerunning(true);
    const result = await triggerRerun();
    if (!result.success) {
      console.error("Rerun failed:", result.error);
    }
    setIsRerunning(false);
  };

  const filteredGroupedEvals = searchQuery
    ? groupedEvals.filter((item) => {
        const query = searchQuery.toLowerCase();
        if (item.type === "single") {
          return item.suite.name.toLowerCase().includes(query);
        } else {
          return (
            item.groupName.toLowerCase().includes(query) ||
            item.variants.some(
              (v) =>
                v.name.toLowerCase().includes(query) ||
                v.variantName?.toLowerCase().includes(query)
            )
          );
        }
      })
    : groupedEvals;

  function handleSearchChange(value: string) {
    const newSearch = new URLSearchParams(window.location.search);
    if (value) {
      newSearch.set("q", value);
    } else {
      newSearch.delete("q");
    }
    const searchString = newSearch.toString();
    const newUrl = `${window.location.pathname}${searchString ? `?${searchString}` : ""}`;
    router.history.replace(newUrl);
  }

  return (
    <ThemeProvider>
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
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Summary
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-foreground font-medium text-2xl">
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
                  {!isStaticMode() && (
                    <button
                      onClick={handleRerun}
                      disabled={serverState.type === "running" || isRerunning}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors text-muted-foreground",
                        serverState.type === "running" || isRerunning
                          ? "cursor-not-allowed"
                          : "hover:bg-foreground/20"
                      )}
                      title="Rerun all evals"
                    >
                      <RotateCw
                        className={cn("size-3", isRerunning && "animate-spin")}
                      />
                      Rerun
                    </button>
                  )}
                </div>
              </div>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Suites</SidebarGroupLabel>
              <InputGroup className="h-8 mb-2">
                <InputGroupAddon align="inline-start">
                  <InputGroupText>
                    <Search />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search"
                  value={searchQuery ?? ""}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchQuery && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => handleSearchChange("")}
                    >
                      <X />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
              <SidebarMenu>
                {filteredGroupedEvals.map((item) => {
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
    </ThemeProvider>
  );
}

const VariantGroup = (props: {
  groupName: string;
  variants: SuiteWithState[];
}) => {
  return (
    <>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 text-xs px-2 py-1 text-muted-foreground">
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
  const search = Route.useSearch();

  return (
    <SidebarMenuItem key={props.name}>
      <Link
        preload="intent"
        to={`/suite/$name`}
        params={{ name: props.name }}
        search={{ q: search.q }}
        className={cn(
          "flex items-start text-sm px-2 py-1 text-sidebar-foreground rounded hover:bg-foreground/10 active:bg-foreground/20 transition-colors"
        )}
        activeProps={{
          className: "dark:bg-foreground/20 bg-foreground/10!",
        }}
      >
        {props.isVariant && (
          <div className="size-1.5 mr-2 bg-muted-foreground rounded-full mt-[7px]"></div>
        )}
        <span className="flex-1 mr-2">{props.variantName || props.name}</span>

        <Score
          score={props.score}
          state={props.state}
          hasScores={props.hasScores}
          className="text-muted-foreground"
        />
      </Link>
    </SidebarMenuItem>
  );
};
