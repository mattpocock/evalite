import { AsyncLocalStorage } from "async_hooks";

export const writeFileQueueLocalStorage = new AsyncLocalStorage<
  (path: string, buffer: Buffer) => void
>();
