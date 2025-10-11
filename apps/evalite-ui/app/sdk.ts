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
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns The JSON response
 * @throws Error if the response is not OK
 */
async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  // In static mode, fetch from pre-generated JSON files
  if (isStaticMode()) {
    // Convert API endpoints to static file paths
    const staticPath = url
      .replace(`${BASE_URL}/api/server-state`, `/data/server-state.json`)
      .replace(`${BASE_URL}/api/menu-items`, `/data/menu-items.json`);

    // Handle /api/eval?name=X&timestamp=...
    if (url.includes("/api/eval?")) {
      const urlObj = new URL(url, BASE_URL);
      const name = urlObj.searchParams.get("name");
      if (name) {
        const sanitized = sanitizeFilename(name);
        const response = await fetch(`/data/eval-${sanitized}.json`, options);
        if (!response.ok) throw notFound();
        return response.json() as Promise<T>;
      }
    }

    // Handle /api/eval/result?name=X&index=Y&timestamp=...
    if (url.includes("/api/eval/result?")) {
      const urlObj = new URL(url, BASE_URL);
      const name = urlObj.searchParams.get("name");
      const index = urlObj.searchParams.get("index");
      if (name && index) {
        const sanitized = sanitizeFilename(name);
        const response = await fetch(
          `/data/result-${sanitized}-${index}.json`,
          options
        );
        if (!response.ok) throw notFound();
        return response.json() as Promise<T>;
      }
    }

    const response = await fetch(staticPath, options);
    if (!response.ok) throw notFound();
    return response.json() as Promise<T>;
  }

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
