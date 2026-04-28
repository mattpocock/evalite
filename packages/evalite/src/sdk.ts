import { DEFAULT_SERVER_PORT } from "./constants.js";
import type { Evalite } from "./types.js";

const BASE_URL = `http://localhost:${DEFAULT_SERVER_PORT}`;

/**
 * Common fetch function with error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns The JSON response
 * @throws Error if the response is not OK
 */
async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export const getServerState = async (fetchOpts?: {
  signal?: AbortSignal;
}): Promise<Evalite.ServerState> => {
  return safeFetch<Evalite.ServerState>(
    `${BASE_URL}/api/server-state`,
    fetchOpts
  );
};

export type GetMenuItemsResultEval = Evalite.SDK.GetMenuItemsResultSuite;
export type GetMenuItemsResult = Evalite.SDK.GetMenuItemsResult;

export const getMenuItems = async (fetchOpts?: {
  signal?: AbortSignal;
}): Promise<GetMenuItemsResult> => {
  return safeFetch<GetMenuItemsResult>(`${BASE_URL}/api/menu-items`, fetchOpts);
};

export type GetSuiteByNameResult = {
  history: {
    score: number;
    date: string;
  }[];
  suite: Evalite.Storage.Entities.Suite & {
    evals: (Evalite.Storage.Entities.Eval & {
      scores: Evalite.Storage.Entities.Score[];
    })[];
  };
  prevSuite:
    | (Evalite.Storage.Entities.Suite & {
        evals: (Evalite.Storage.Entities.Eval & {
          scores: Evalite.Storage.Entities.Score[];
        })[];
      })
    | undefined;
};

export const getSuiteByName = async (
  name: string,
  timestamp: string | null | undefined,
  fetchOpts?: { signal?: AbortSignal }
): Promise<GetSuiteByNameResult> => {
  const params = new URLSearchParams({ name, timestamp: timestamp || "" });
  return safeFetch<GetSuiteByNameResult>(
    `${BASE_URL}/api/suite?${params.toString()}`,
    fetchOpts
  );
};

export type GetEvalResult = {
  eval: Evalite.Storage.Entities.Eval & {
    traces: Evalite.Storage.Entities.Trace[];
    score: number;
    scores: Evalite.Storage.Entities.Score[];
  };
  prevEval:
    | (Evalite.Storage.Entities.Eval & {
        score: number;
        scores: Evalite.Storage.Entities.Score[];
      })
    | undefined;
  suite: Evalite.Storage.Entities.Suite;
};

export const getEval = async (
  opts: {
    suiteName: string;
    suiteTimestamp: string | null | undefined;
    evalIndex: string;
  },
  fetchOpts?: { signal?: AbortSignal }
): Promise<GetEvalResult> => {
  const params = new URLSearchParams({
    name: opts.suiteName,
    index: opts.evalIndex,
    timestamp: opts.suiteTimestamp || "",
  });
  return safeFetch<GetEvalResult>(
    `${BASE_URL}/api/suite/eval?${params.toString()}`,
    fetchOpts
  );
};

export const serveFile = (filepath: string) => {
  return `${BASE_URL}/api/file?path=${filepath}`;
};

export const downloadFile = (filepath: string) => {
  return `${BASE_URL}/api/file?path=${filepath}&download=true`;
};
