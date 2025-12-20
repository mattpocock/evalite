import { DEFAULT_SERVER_PORT } from "./constants.js";
import type { Evaluhealth } from "./types.js";

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
}): Promise<Evaluhealth.ServerState> => {
  return safeFetch<Evaluhealth.ServerState>(
    `${BASE_URL}/api/server-state`,
    fetchOpts
  );
};

export type GetMenuItemsResultEval = Evaluhealth.SDK.GetMenuItemsResultEval;
export type GetMenuItemsResult = Evaluhealth.SDK.GetMenuItemsResult;

export const getMenuItems = async (fetchOpts?: {
  signal?: AbortSignal;
}): Promise<GetMenuItemsResult> => {
  return safeFetch<GetMenuItemsResult>(`${BASE_URL}/api/menu-items`, fetchOpts);
};

export type GetEvalByNameResult = {
  history: {
    score: number;
    date: string;
  }[];
  evaluation: Evaluhealth.Storage.Entities.Eval & {
    results: (Evaluhealth.Storage.Entities.Result & {
      scores: Evaluhealth.Storage.Entities.Score[];
    })[];
  };
  prevEvaluation:
    | (Evaluhealth.Storage.Entities.Eval & {
        results: (Evaluhealth.Storage.Entities.Result & {
          scores: Evaluhealth.Storage.Entities.Score[];
        })[];
      })
    | undefined;
};

export const getEvalByName = async (
  name: string,
  timestamp: string | null | undefined,
  fetchOpts?: { signal?: AbortSignal }
): Promise<GetEvalByNameResult> => {
  const params = new URLSearchParams({ name, timestamp: timestamp || "" });
  return safeFetch<GetEvalByNameResult>(
    `${BASE_URL}/api/eval?${params.toString()}`,
    fetchOpts
  );
};

export type GetResultResult = {
  result: Evaluhealth.Storage.Entities.Result & {
    traces: Evaluhealth.Storage.Entities.Trace[];
    score: number;
    scores: Evaluhealth.Storage.Entities.Score[];
  };
  prevResult:
    | (Evaluhealth.Storage.Entities.Result & {
        score: number;
        scores: Evaluhealth.Storage.Entities.Score[];
      })
    | undefined;
  evaluation: Evaluhealth.Storage.Entities.Eval;
};

export const getResult = async (
  opts: {
    evalName: string;
    evalTimestamp: string | null | undefined;
    resultIndex: string;
  },
  fetchOpts?: { signal?: AbortSignal }
): Promise<GetResultResult> => {
  const params = new URLSearchParams({
    name: opts.evalName,
    index: opts.resultIndex,
    timestamp: opts.evalTimestamp || "",
  });
  return safeFetch<GetResultResult>(
    `${BASE_URL}/api/eval/result?${params.toString()}`,
    fetchOpts
  );
};

export const serveFile = (filepath: string) => {
  return `${BASE_URL}/api/file?path=${filepath}`;
};

export const downloadFile = (filepath: string) => {
  return `${BASE_URL}/api/file?path=${filepath}&download=true`;
};
