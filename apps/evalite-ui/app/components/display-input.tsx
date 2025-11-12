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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { downloadFile, serveFile } from "~/sdk";
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
          <ReactMarkdown
            className="prose dark:prose-invert prose-sm"
            remarkPlugins={[remarkGfm]}
          >
            {input}
          </ReactMarkdown>
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
  // Check if object has only one string value
  const singleStringResult = findSingleStringValue(input);

  if (singleStringResult) {
    // If it does, render the breadcrumbs and DisplayText component
    return (
      <div>
        {singleStringResult.path.length > 0 && (
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span className="font-mono">{name ?? "object"}</span>
            {singleStringResult.path.map((segment, index) => (
              <React.Fragment key={index}>
                <span className="font-mono">.{segment}</span>
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

// Helper function to truncate filename with ellipsis in the middle
const truncateFilename = (filename: string, maxLength: number = 20): string => {
  // If filename is short enough, return it as is
  if (filename.length <= maxLength) {
    return filename;
  }

  // Split filename into basename and extension
  const lastDotIndex = filename.lastIndexOf(".");
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1) : "";
  const basename = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;

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
