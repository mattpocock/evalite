import { fileTypeFromBuffer } from "file-type";
import path from "node:path";
import { EvaliteFile } from "./utils.js";

export const createEvaliteFileIfNeeded = async (opts: {
  rootDir: string;
  input: unknown;
}) => {
  if (!(opts.input instanceof Uint8Array)) {
    return opts.input;
  }

  const { createHash } = await import("node:crypto");

  const hash = createHash("sha256").update(opts.input).digest("hex");

  const result = await fileTypeFromBuffer(opts.input);

  if (!result) {
    throw new Error(`Cannot determine file type of buffer passed in.`);
  }

  const extension = result.ext;

  const fileName = `${hash}.${extension}`;

  const filePath = path.join(opts.rootDir, fileName);

  const { writeFile } = await import("node:fs/promises");

  await writeFile(filePath, opts.input);

  return EvaliteFile.fromPath(filePath);
};
