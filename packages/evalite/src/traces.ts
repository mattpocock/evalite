import { AsyncLocalStorage } from "async_hooks";
import type { Evalite } from "./types.js";

export const reportTraceLocalStorage = new AsyncLocalStorage<
  (trace: Evalite.Trace) => void
>();

export const reportTrace = (trace: Evalite.Trace): void => {
  const _reportTrace = reportTraceLocalStorage.getStore();

  if (!_reportTrace) {
    throw new Error(
      "An error occurred: reportTrace must be called inside an evalite eval"
    );
  }

  _reportTrace(trace);
};
