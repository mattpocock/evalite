import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

export const cacheContextLocalStorage = new AsyncLocalStorage<{
  trialCount: number | undefined;
  evalName: string;
  serverPort: number;
  cacheEnabled: boolean;
}>();

export const getCacheContext = () => {
  return cacheContextLocalStorage.getStore();
};

export const generateCacheKey = (params: {
  model: unknown;
  params: unknown;
  callType: "generate" | "stream";
  callParams: unknown;
}) => {
  const context = getCacheContext();

  const cacheObject = {
    model: params.model,
    params: params.params,
    callType: params.callType,
    callParams: params.callParams,
    trialCount: context?.trialCount,
  };

  return createHash("sha256").update(JSON.stringify(cacheObject)).digest("hex");
};

export const reportCacheHitLocalStorage = new AsyncLocalStorage<
  (hit: { keyHash: string; hit: boolean; savedDuration: number }) => void
>();

export const reportCacheHit = (hit: {
  keyHash: string;
  hit: boolean;
  savedDuration: number;
}): void => {
  const _reportCacheHit = reportCacheHitLocalStorage.getStore();

  if (_reportCacheHit) {
    _reportCacheHit(hit);
  }
};
