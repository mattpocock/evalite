import { AsyncLocalStorage } from "async_hooks";
import type { Evaluhealth } from "./types.js";

export const reportTraceLocalStorage = new AsyncLocalStorage<
  (trace: Evaluhealth.Trace) => void
>();

export const shouldReportTrace = (): boolean => {
  return !!process.env.EVALUHEALTH_REPORT_TRACES;
};

export const reportTrace = (trace: Evaluhealth.Trace): void => {
  if (!shouldReportTrace()) {
    return;
  }

  const _reportTrace = reportTraceLocalStorage.getStore();

  if (!_reportTrace) {
    throw new Error(
      "An error occurred: reportTrace must be called inside an evaluhealth eval"
    );
  }

  _reportTrace(trace);
};
