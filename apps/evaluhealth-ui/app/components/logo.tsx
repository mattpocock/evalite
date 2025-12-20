import { cn } from "~/lib/utils";

export default function Logo({
  className,
  textClassName,
  containerClassName,
}: {
  className?: string;
  textClassName?: string;
  containerClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", containerClassName)}>
      <svg
        className={cn("w-[18px]", className)}
        viewBox="0 0 54 68"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0 .002V29.1l7.481 4.681L0 38.447v28.977l53.82-33.697L0 .002Zm4.92 41.139 21.003-13.175L4.921 14.75V8.817l30.51 19.136-30.51 18.909V41.14Zm-.053 17.376v-5.828l.134-.08 35.031-21.776 4.6 2.88L4.868 58.517Zm0-32.111v-5.908l11.895 7.468-4.707 2.947-7.188-4.507Z"
        />
      </svg>
      <span
        className={cn(
          "truncate font-normal text-lg tracking-tight ml-2",
          textClassName
        )}
      >
        Evaluhealth
      </span>
    </div>
  );
}
