import type { Evalite } from "evalite/types";
import { EvaliteFile } from "evalite/utils";
import type { DynamicToolCall, StaticToolCall, UIMessage } from "ai";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DownloadIcon,
  Code2,
  Wrench,
} from "lucide-react";
import React, { Fragment, useLayoutEffect, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { downloadFile, serveFile } from "~/sdk";
import { Response } from "./response";
import { Button } from "./ui/button";
import { cn } from "~/lib/utils";
import {
  analyzeForTableRendering,
  analyzeForSingleRowTable,
  tableDataToMarkdown,
  singleRowTableToMarkdown,
} from "~/utils/render-detection";

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

const DisplayJSON = ({
  input,
  name,
}: {
  input: object;
  name: string | undefined;
}) => {
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
        scheme: "grayscale",
        base00: "transparent",
        base01: "#252525",
        base02: "#464646",
        base03: "#525252",
        base04: "#ababab",
        base05: "#b9b9b9",
        base06: "#e3e3e3",
        base07: "#f7f7f7",
        base08: "#7c7c7c",
        base09: "#999999",
        base0A: "#a0a0a0",
        base0B: "#8e8e8e",
        base0C: "#868686",
        base0D: "#686868",
        base0E: "#747474",
        base0F: "#5e5e5e",
      }}
    />
  );
};

export const DisplayEvaliteFile = ({ file }: { file: Evalite.File }) => {
  const extension = file.path.split(".").pop()!;

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
    <Button asChild className="uppercase" variant={"secondary"} size={"sm"}>
      <a href={downloadFile(file.path)}>
        <DownloadIcon className="size-4" />
        <span>.{extension}</span>
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

type AISDKToolCall = StaticToolCall<any> | DynamicToolCall;

// Helper function to check if input is an array of AI SDK tool calls
const isAISDKToolCallArray = (input: unknown): input is AISDKToolCall[] => {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every(
      (tc: any) =>
        typeof tc === "object" &&
        tc !== null &&
        tc.type === "tool-call" &&
        "toolName" in tc &&
        "toolCallId" in tc
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

const DisplayToolCall = ({ toolCall }: { toolCall: AISDKToolCall }) => {
  return (
    <div className="space-y-2">
      {/* Tool name header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-mono text-foreground">
          {toolCall.toolName}
        </div>

        {toolCall.invalid || toolCall.error ? (
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
        <DisplayJSON input={toolCall.input as object} name={undefined} />
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
    <div className="space-y-4">
      {toolCalls.map((toolCall, index) => (
        <DisplayToolCall
          key={toolCall.toolCallId || index}
          toolCall={toolCall}
        />
      ))}
    </div>
  );
};

const DisplayUIMessages = ({ messages }: { messages: UIMessage[] }) => {
  const [status, setStatus] = useState<DisplayStatus>(
    "no-show-more-button-required"
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if we have both user and assistant messages
  const hasMultipleRoles =
    messages.length > 1 &&
    messages.some((m) => m.role === "user") &&
    messages.some((m) => m.role === "assistant" || m.role === "system");

  useLayoutEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight > MAX_HEIGHT) {
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
        {messages.map((message, index, messages) => (
          <div key={message.id} className="flex">
            <div className="flex justify-start items-center flex-col">
              <div className="size-2 rounded-full bg-muted-foreground/80 mt-1 flex-shrink-0 mb-2"></div>
              {index < messages.length - 1 && (
                <div className="w-[2px] h-full bg-muted-foreground/20 mb-1 rounded-full"></div>
              )}
            </div>
            <div
              className={cn(
                "ml-3 space-y-4",
                index < messages.length - 1 ? "pb-6" : ""
              )}
            >
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
                    <DisplayJSON input={part} name={part.type} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
        <DisplayJSON input={props.input} name={props.name} />
      </Wrapper>
    );
  }

  return (
    <Wrapper className={props.className}>
      <pre>{JSON.stringify(props.input, null, 2)}</pre>
    </Wrapper>
  );
};
