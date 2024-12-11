import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { ZapIcon } from "lucide-react";
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

import { getMenuItems, getServerState } from "@evalite/core/sdk";
import { getScoreState, Score, type ScoreState } from "./components/score";
import { cn } from "./lib/utils";
import "./tailwind.css";
import {
  TestServerStateContext,
  useSubscribeToTestServer,
} from "./use-subscribe-to-socket";
import { useContext } from "react";
import Logo from "./components/logo";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const clientLoader = async () => {
  const [
    { archivedEvals, currentEvals, prevScore, score, evalStatus },
    serverState,
  ] = await Promise.all([getMenuItems(), getServerState()]);

  return {
    serverState,
    evalStatus,
    prevScore,
    score,
    archivedEvals: archivedEvals.map((e) => {
      const state = getScoreState(e.score, e.prevScore);
      return {
        ...e,
        state,
      };
    }),
    currentEvals: currentEvals.map((e) => {
      const state = getScoreState(e.score, e.prevScore);
      return {
        ...e,
        state,
      };
    }),
  };
};

export default function App() {
  const data = useLoaderData<typeof clientLoader>();

  const testServer = useSubscribeToTestServer(data.serverState);

  return (
    <TestServerStateContext.Provider value={testServer}>
      <SidebarProvider>
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
                <div className="text-gray-600 font-medium text-2xl">
                  <Score
                    isRunning={testServer.state.type === "running"}
                    score={data.score}
                    state={getScoreState(data.score, data.prevScore)}
                    iconClassName="size-4"
                    evalStatus={data.evalStatus}
                  />
                </div>
              </div>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Current Run</SidebarGroupLabel>
              <SidebarMenu>
                {data.currentEvals.map((e) => {
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
            {data.archivedEvals.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Previous Runs</SidebarGroupLabel>
                <SidebarMenu>
                  {data.archivedEvals.map((e) => {
                    return (
                      <EvalSidebarItem
                        key={`archived-${e.name}`}
                        name={e.name}
                        score={e.score}
                        state={e.state}
                        evalStatus={e.evalStatus}
                      />
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>
        <Outlet />
      </SidebarProvider>
    </TestServerStateContext.Provider>
  );
}

const EvalSidebarItem = (props: {
  name: string;
  state: ScoreState;
  score: number;
  evalStatus: "success" | "fail";
}) => {
  let isRunning = false;

  const testServer = useContext(TestServerStateContext);

  if (testServer.state.type === "running") {
    isRunning = testServer.isRunningEvalName(props.name);
  }
  return (
    <SidebarMenuItem key={props.name}>
      <NavLink
        prefetch="intent"
        to={`/eval/${props.name}`}
        className={({ isActive }) =>
          cn(
            "flex justify-between text-sm px-2 py-1 rounded hover:bg-gray-100 transition-colors",
            isActive && "bg-gray-200 text-gray-800 hover:bg-gray-200"
          )
        }
      >
        <span>{props.name}</span>

        <Score
          score={props.score}
          state={props.state}
          isRunning={isRunning}
          evalStatus={props.evalStatus}
        />
      </NavLink>
    </SidebarMenuItem>
  );
};
