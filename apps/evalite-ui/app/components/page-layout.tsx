import { GithubIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "./ui/breadcrumb";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const InnerPageLayout = ({
  children,
  filepath,
  vscodeUrl,
}: {
  vscodeUrl: string;
  filepath: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col bg-background relative flex-1 min-h-svh min-w-0">
      <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background z-10 justify-between">
        <div className="flex flex-1 items-center gap-2 px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="line-clamp-1" asChild>
                  <a href={vscodeUrl}>{filepath}</a>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2 px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/mattpocock/evalite/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors h-9 px-3"
              >
                <GithubIcon className="size-4" />
                <span>Give Feedback</span>
              </a>
            </TooltipTrigger>
            <TooltipContent>Feedback is a gift!</TooltipContent>
          </Tooltip>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex-1 p-4 pt-0">{children}</div>
    </div>
  );
};
