import { queryOptions } from "@tanstack/react-query";
import { getEval, getMenuItems, getServerState, getSuiteByName } from "~/sdk";

export const getMenuItemsQueryOptions = queryOptions({
  queryKey: ["menu-items"] as const,
  queryFn: getMenuItems,
});

export const getServerStateQueryOptions = queryOptions({
  queryKey: ["server-state"] as const,
  queryFn: getServerState,
});

export const getSuiteByNameQueryOptions = (
  name: string,
  timestamp: string | null | undefined
) =>
  queryOptions({
    queryKey: ["suite-by-name", name, timestamp] as const,
    queryFn: () => getSuiteByName(name, timestamp),
  });

export const getEvalQueryOptions = (opts: {
  suiteName: string;
  suiteTimestamp: string | null | undefined;
  evalIndex: string;
}) =>
  queryOptions({
    queryKey: ["eval", opts] as const,
    queryFn: () => getEval(opts),
  });
