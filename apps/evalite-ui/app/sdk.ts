import { notFound } from "@tanstack/react-router";
import { DEFAULT_SERVER_PORT } from "evalite/constants";
import type { Evalite } from "evalite/types";

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
    if (response.status === 404) {
      throw notFound();
    }

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

export const getMenuItems = async (fetchOpts?: {
  signal?: AbortSignal;
}): Promise<Evalite.SDK.GetMenuItemsResult> => {
  return safeFetch<Evalite.SDK.GetMenuItemsResult>(
    `${BASE_URL}/api/menu-items`,
    fetchOpts
  );
};

export const getEvalByName = async (
  name: string,
  timestamp: string | null | undefined,
  fetchOpts?: { signal?: AbortSignal }
): Promise<Evalite.SDK.GetEvalByNameResult> => {
  const params = new URLSearchParams({ name, timestamp: timestamp || "" });
  return safeFetch<Evalite.SDK.GetEvalByNameResult>(
    `${BASE_URL}/api/eval?${params.toString()}`,
    fetchOpts
  );
};

export const getResult = async (
  opts: {
    evalName: string;
    evalTimestamp: string | null | undefined;
    resultIndex: string;
  },
  fetchOpts?: { signal?: AbortSignal }
): Promise<Evalite.SDK.GetResultResult> => {
  const params = new URLSearchParams({
    name: opts.evalName,
    index: opts.resultIndex,
    timestamp: opts.evalTimestamp || "",
  });
  return safeFetch<Evalite.SDK.GetResultResult>(
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

export const triggerRun = async (): Promise<{ success: boolean; message?: string }> => {
  return safeFetch<{ success: boolean; message?: string }>(
    `${BASE_URL}/api/trigger-run`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Add empty body to make post request work
    }
  );
};
