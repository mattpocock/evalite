import { notFound } from "@tanstack/react-router";
import { DEFAULT_SERVER_PORT } from "evalite/constants";
import type { Evalite } from "evalite/types";

const BASE_URL = `http://localhost:${DEFAULT_SERVER_PORT}`;

declare global {
  interface Window {
    __EVALITE_STATIC_DATA__?: {
      staticMode: boolean;
      availableEvals: string[];
    };
  }
}

/**
 * Check if we're in static mode
 */
export const isStaticMode = () => {
  return (
    typeof window !== "undefined" && window.__EVALITE_STATIC_DATA__?.staticMode
  );
};

/**
 * Sanitizes an eval name for use in filenames (must match backend logic)
 */
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
};

/**
 * Common fetch function with error handling
 * @param url The URL to fetch (can be API endpoint or static JSON path)
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

  const data: T = await response.json();
  return data;
}

export const getServerState = async (fetchOpts?: {
  signal?: AbortSignal;
}): Promise<Evalite.ServerState> => {
  if (isStaticMode()) {
    return safeFetch<Evalite.ServerState>(`/data/server-state.json`, fetchOpts);
  }

  return safeFetch<Evalite.ServerState>(
    `${BASE_URL}/api/server-state`,
    fetchOpts
  );
};

export const getMenuItems = async (fetchOpts?: {
  signal?: AbortSignal;
}): Promise<Evalite.SDK.GetMenuItemsResult> => {
  if (isStaticMode()) {
    return safeFetch<Evalite.SDK.GetMenuItemsResult>(
      `/data/menu-items.json`,
      fetchOpts
    );
  }

  return safeFetch<Evalite.SDK.GetMenuItemsResult>(
    `${BASE_URL}/api/menu-items`,
    fetchOpts
  );
};

export const getSuiteByName = async (
  name: string,
  timestamp: string | null | undefined,
  fetchOpts?: { signal?: AbortSignal }
): Promise<Evalite.SDK.GetSuiteByNameResult> => {
  if (isStaticMode()) {
    const sanitized = sanitizeFilename(name);
    return safeFetch<Evalite.SDK.GetSuiteByNameResult>(
      `/data/suite-${sanitized}.json`,
      fetchOpts
    );
  }

  const params = new URLSearchParams({ name, timestamp: timestamp || "" });
  return safeFetch<Evalite.SDK.GetSuiteByNameResult>(
    `${BASE_URL}/api/suite?${params.toString()}`,
    fetchOpts
  );
};

export const getEval = async (
  opts: {
    suiteName: string;
    suiteTimestamp: string | null | undefined;
    evalIndex: string;
  },
  fetchOpts?: { signal?: AbortSignal }
): Promise<Evalite.SDK.GetEvalResult> => {
  if (isStaticMode()) {
    const sanitized = sanitizeFilename(opts.suiteName);
    return safeFetch<Evalite.SDK.GetEvalResult>(
      `/data/eval-${sanitized}-${opts.evalIndex}.json`,
      fetchOpts
    );
  }

  const params = new URLSearchParams({
    name: opts.suiteName,
    index: opts.evalIndex,
    timestamp: opts.suiteTimestamp || "",
  });
  return safeFetch<Evalite.SDK.GetEvalResult>(
    `${BASE_URL}/api/suite/eval?${params.toString()}`,
    fetchOpts
  );
};

export const serveFile = (filepath: string) => {
  if (isStaticMode()) {
    return `/files/${filepath}`;
  }
  return `${BASE_URL}/api/file?path=${filepath}`;
};

export const downloadFile = (filepath: string) => {
  if (isStaticMode()) {
    return `/files/${filepath}`;
  }
  return `${BASE_URL}/api/file?path=${filepath}&download=true`;
};
