import type { UIMessage } from "ai";
import type { Evalite } from "evalite/types";
import { EvaliteFile } from "evalite/utils";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DownloadIcon,
} from "lucide-react";
import React, { Fragment, useLayoutEffect, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { cn } from "~/lib/utils";
import { downloadFile, serveFile } from "~/sdk";
import {
  analyzeForSingleRowTable,
  analyzeForTableRendering,
  singleRowTableToMarkdown,
  tableDataToMarkdown,
} from "~/utils/render-detection";
import { Response } from "./response";
import { Button } from "./ui/button";

// Helper function to find single string value in an object and its path
const findSingleStringValue = (
  obj: object
): { path: string[]; value: string } | null => {
  const paths: { path: string[]; value: string }[] = [];

  const traverse = (currentObj: unknown, currentPath: string[] = []) => {
    if (typeof currentObj === "string") {
      paths.push({ path: [...currentPath], value: currentObj });
      return;
    }

    if (typeof currentObj !== "object" || currentObj === null) {
      return;
    }

    Object.entries(currentObj).forEach(([key, value]) => {
      traverse(value, [...currentPath, key]);
    });
  };

  traverse(obj);

  // If we found exactly one string value, return it with its path
  return paths.length === 1 ? paths[0]! : null;
};

const MAX_HEIGHT = 240;

type DisplayStatus =
  | "no-show-more-button-required"
  | "showing-show-more-button"
  | "showing-more";

const DisplayText = ({
  input,
  shouldTruncateText,
  Wrapper,
  className,
}: {
  input: string;
  className?: string;
  Wrapper: React.ElementType<{ children: React.ReactNode }>;
  shouldTruncateText: boolean;
}) => {
  const [status, setStatus] = useState<DisplayStatus>(
    "no-show-more-button-required"
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current && shouldTruncateText) {
      if (contentRef.current.scrollHeight > MAX_HEIGHT) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus("showing-show-more-button");
      }
    }
  }, [input, shouldTruncateText]);

  return (
    <div className={className}>
      <Wrapper>
        <div
          ref={contentRef}
          style={{
            maxHeight:
              status === "showing-show-more-button" && shouldTruncateText
                ? `${MAX_HEIGHT}px`
                : "none",
            overflow: "hidden",
          }}
        >
          <Response>{input}</Response>
        </div>
      </Wrapper>
      {status === "showing-show-more-button" && shouldTruncateText && (
        <Button
          onClick={() => {
            setStatus("showing-more");
          }}
          variant="secondary"
          size="sm"
          className="mt-3 mb-5"
        >
          <ChevronDown />
          Show more
        </Button>
      )}
      {status === "showing-more" && shouldTruncateText && (
        <Button
          onClick={() => {
            setStatus("showing-show-more-button");
          }}
          variant="secondary"
          size="sm"
          className="mt-3 mb-5"
        >
          <ChevronUp />
          Show less
        </Button>
      )}
    </div>
  );
};

const DisplayJSON = ({ input }: { input: object }) => {
  // Check if object has only one string value (legacy behavior)
  const singleStringResult = findSingleStringValue(input);

  if (singleStringResult) {
    // If it does, render the breadcrumbs and DisplayText component
    return (
      <div>
        {singleStringResult.path.length > 0 && (
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            {singleStringResult.path.map((segment, index) => (
              <React.Fragment key={index}>
                <span className="font-mono">
                  {index > 0 && "."}
                  {segment}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        <DisplayText
          input={singleStringResult.value}
          shouldTruncateText={true}
          Wrapper={Fragment}
        />
      </div>
    );
  }

  // Try to render as multi-row table (array of objects)
  const tableData = analyzeForTableRendering(input);
  if (tableData) {
    const markdown = tableDataToMarkdown(tableData);
    return (
      <DisplayText
        input={markdown}
        shouldTruncateText={true}
        Wrapper={Fragment}
      />
    );
  }

  // Try to render as single-row table (flat object)
  const singleRowData = analyzeForSingleRowTable(input);
  if (singleRowData) {
    const markdown = singleRowTableToMarkdown(singleRowData);
    return (
      <DisplayText
        input={markdown}
        shouldTruncateText={true}
        Wrapper={Fragment}
      />
    );
  }

  // Otherwise, render the normal JSON tree
  return (
    <JSONTree
      data={input}
      shouldExpandNodeInitially={(_, __, level) => level < 4}
      theme={{
        scheme: "evalite",
        base00: "var(--json-tree-bg)",
        base01: "var(--muted)",
        base02: "var(--accent)",
        base03: "var(--muted-foreground)",
        base04: "var(--foreground)",
        base05: "var(--foreground)",
        base06: "var(--background)",
        base07: "var(--background)",
        base08: "var(--json-tree-key)",
        base09: "var(--json-tree-number)",
        base0A: "var(--json-tree-boolean)",
        base0B: "var(--json-tree-string)",
        base0C: "var(--json-tree-null)",
        base0D: "var(--json-tree-bracket)",
        base0E: "var(--json-tree-key)",
        base0F: "var(--muted-foreground)",
      }}
      hideRoot
    />
  );
};

// Helper function to truncate filename with ellipsis in the middle
const truncateFilename = (filename: string, maxLength: number = 20): string => {
  // If filename is short enough, return it as is
  if (filename.length <= maxLength) {
    return filename;
  }

  // Split filename into basename and extension
  const lastDotIndex = filename.lastIndexOf(".");
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1) : "";
  const basename =
    lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;

  // If there's no extension or it's very short, truncate the whole filename
  if (!extension || extension.length > 10) {
    const keepLength = Math.floor((maxLength - 3) / 2);
    return `${filename.slice(0, keepLength)}...${filename.slice(-keepLength)}`;
  }

  // Calculate how much space we have for the basename (accounting for extension and dot)
  const availableLength = maxLength - extension.length - 4; // -4 for "..." and "."

  // If basename is too short to truncate meaningfully, just truncate at the end
  if (availableLength < 6) {
    return `${basename.slice(0, maxLength - extension.length - 4)}...${extension}`;
  }

  // Split available space: 60% to start, 40% to end of basename
  const keepStart = Math.floor(availableLength * 0.6);
  const keepEnd = Math.floor(availableLength * 0.4);

  return `${basename.slice(0, keepStart)}...${basename.slice(-keepEnd)}.${extension}`;
};

export const DisplayEvaliteFile = ({ file }: { file: Evalite.File }) => {
  const extension = file.path.split(".").pop()!;
  const filename = file.path.split("/").pop()!;

  // Images
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension)) {
    return (
      <img src={serveFile(file.path)} alt="Evalite file" className="max-h-32" />
    );
  }

  // Videos
  if (["mp4", "webm", "ogg"].includes(extension)) {
    return (
      <video controls>
        <source src={serveFile(file.path)} type={`video/${extension}`} />
      </video>
    );
  }

  // Audio
  if (["mp3", "wav", "ogg"].includes(extension)) {
    return (
      <audio controls>
        <source src={serveFile(file.path)} type={`audio/${extension}`} />
      </audio>
    );
  }

  return (
    <Button asChild variant={"secondary"} size={"sm"}>
      <a href={downloadFile(file.path)} title={filename}>
        <DownloadIcon className="size-4" />
        <span>{truncateFilename(filename)}</span>
      </a>
    </Button>
  );
};

// Helper function to check if an object is a serialized error
const isSerializedError = (
  input: unknown
): input is { name: string; message: string; stack?: string } => {
  return (
    typeof input === "object" &&
    input !== null &&
    "name" in input &&
    "message" in input &&
    typeof (input as any).name === "string" &&
    typeof (input as any).message === "string"
  );
};

// Helper function to check if input is an array of UIMessages
const isUIMessageArray = (input: unknown): input is UIMessage[] => {
  if (!Array.isArray(input) || input.length === 0) {
    return false;
  }

  // Check if all elements have the UIMessage shape
  return input.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "role" in item &&
      "parts" in item &&
      typeof item.id === "string" &&
      (item.role === "user" ||
        item.role === "assistant" ||
        item.role === "system") &&
      Array.isArray(item.parts)
  );
};

type AISDKToolCall = {
  toolName: string;
  toolCallId?: string;
  error?: unknown;
  input: unknown;
};

// Helper function to check if input is an array of AI SDK tool calls
const isAISDKToolCallArray = (input: unknown): input is AISDKToolCall[] => {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every(
      (tc: any) =>
        typeof tc === "object" &&
        tc !== null &&
        "toolName" in tc &&
        "input" in tc
    )
  );
};

const DisplayError = ({
  error,
}: {
  error: { name: string; message: string; stack?: string };
}) => {
  return (
    <div className="flex items-start gap-2 text-red-500 dark:text-red-400 pr-4">
      <AlertCircle className="size-5 flex-shrink-0 mt-0.5" />
      <div className="whitespace-pre-wrap w-full break-words">
        {error.message}
      </div>
    </div>
  );
};

const DisplayAISDKToolCalls = ({
  toolCalls,
}: {
  toolCalls: AISDKToolCall[];
}) => {
  return (
    <DotList
      items={toolCalls.map((toolCall) => {
        return (
          <div key={toolCall.toolCallId} className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-mono text-foreground">
                {toolCall.toolName}
              </div>

              {toolCall.error ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-500 dark:text-red-400">
                  <AlertCircle className="size-3" />
                  Error
                </span>
              ) : null}
            </div>

            {/* Display error message if present */}
            {toolCall.error ? (
              <div className="text-xs text-red-500 dark:text-red-400">
                {typeof toolCall.error === "string"
                  ? toolCall.error
                  : JSON.stringify(toolCall.error)}
              </div>
            ) : null}

            {/* Tool input */}
            <div className="">
              <DisplayJSON input={toolCall.input as object} />
            </div>
          </div>
        );
      })}
    />
  );
};

const DotAndLine = (props: { hideLine?: boolean }) => {
  return (
    <div className="flex justify-start items-center flex-col">
      <div className="size-2 rounded-full bg-muted-foreground/80 mt-1 flex-shrink-0 mb-2"></div>
      {!props.hideLine && (
        <div className="w-[2px] h-full bg-muted-foreground/20 mb-1 rounded-full"></div>
      )}
    </div>
  );
};

export const DotList = (props: { items: React.ReactNode[] }) => {
  return (
    <div className="">
      {props.items.map((item, index) => (
        <div key={index} className="flex">
          <DotAndLine hideLine={index === props.items.length - 1} />
          <div
            className={cn(
              "ml-3",
              index !== props.items.length - 1 ? "pb-6" : ""
            )}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  );
};

const DisplayUIMessages = ({ messages }: { messages: UIMessage[] }) => {
  const [status, setStatus] = useState<DisplayStatus>(
    "no-show-more-button-required"
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight > MAX_HEIGHT) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus("showing-show-more-button");
      }
    }
  }, [messages]);

  return (
    <div className="inline-block">
      <div
        ref={contentRef}
        style={{
          maxHeight:
            status === "showing-show-more-button" ? `${MAX_HEIGHT}px` : "none",
          overflow: "hidden",
        }}
        className=""
      >
        <DotList
          items={messages.map((message) => {
            return (
              <>
                <div className="text-xs uppercase font-mono text-muted-foreground mb-1">
                  {message.role}
                </div>
                {message.parts.map((part, partIndex) => {
                  // Handle text parts
                  if (part.type === "text") {
                    return (
                      <div key={partIndex}>
                        <Response>{part.text}</Response>
                      </div>
                    );
                  }

                  // Handle reasoning parts
                  if (part.type === "reasoning") {
                    return (
                      <div
                        key={partIndex}
                        className="text-sm text-muted-foreground break-words"
                      >
                        <Response>{part.text}</Response>
                      </div>
                    );
                  }

                  // Handle all other part types as JSON with label
                  return (
                    <div key={partIndex}>
                      <div className="text-xs uppercase font-mono text-muted-foreground mb-1">
                        {part.type}
                      </div>
                      <DisplayJSON input={part} />
                    </div>
                  );
                })}
              </>
            );
          })}
        />
      </div>
      {status === "showing-show-more-button" && (
        <Button
          onClick={() => setStatus("showing-more")}
          variant="secondary"
          size="sm"
          className="mt-3 mb-5"
        >
          <ChevronDown />
          Show more
        </Button>
      )}
      {status === "showing-more" && (
        <Button
          onClick={() => setStatus("showing-show-more-button")}
          variant="secondary"
          size="sm"
          className="mt-3 mb-5"
        >
          <ChevronUp />
          Show less
        </Button>
      )}
    </div>
  );
};

export const DisplayInput = (props: {
  /**
   * If displaying an object, the name is used to
   * display the path to the value
   */
  name?: string;
  input: unknown;
  shouldTruncateText: boolean;
  className?: string;
  Wrapper?: React.FC<{ children: React.ReactNode; className?: string }>;
}) => {
  const Wrapper = props.Wrapper || Fragment;
  if (typeof props.input === "string" || typeof props.input === "number") {
    return (
      <DisplayText
        Wrapper={Wrapper}
        input={props.input.toString()}
        className={props.className}
        shouldTruncateText={props.shouldTruncateText}
      />
    );
  }

  // Check for UIMessage array before other checks
  if (Array.isArray(props.input) && isUIMessageArray(props.input)) {
    return (
      <Wrapper className={props.className}>
        <DisplayUIMessages messages={props.input} />
      </Wrapper>
    );
  }

  if (EvaliteFile.isEvaliteFile(props.input)) {
    return (
      <Wrapper className={props.className}>
        <DisplayEvaliteFile file={props.input} />
      </Wrapper>
    );
  }

  if (isSerializedError(props.input)) {
    return (
      <Wrapper className={props.className}>
        <DisplayError error={props.input} />
      </Wrapper>
    );
  }

  // Check for AI SDK tool call array
  if (Array.isArray(props.input) && isAISDKToolCallArray(props.input)) {
    return (
      <Wrapper className={props.className}>
        <DisplayAISDKToolCalls toolCalls={props.input} />
      </Wrapper>
    );
  }

  if (typeof props.input === "object" && props.input !== null) {
    return (
      <Wrapper className={props.className}>
        <DisplayJSON input={props.input} />
      </Wrapper>
    );
  }

  return (
    <Wrapper className={props.className}>
      <pre>{JSON.stringify(props.input, null, 2)}</pre>
    </Wrapper>
  );
};
