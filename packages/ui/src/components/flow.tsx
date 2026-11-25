"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { cn } from "@coss/ui/lib/utils";
import { PlusIcon } from "lucide-react";
import type React from "react";
import { createContext, isValidElement, useContext, useId } from "react";

// Below this frame width the paths of a branch stack under each other.
// Every stacked style uses the same container query: @max-[38rem].

const pillClassName =
  "rounded-full bg-card px-[calc(--spacing(2.5)-0.5px)] font-normal text-muted-foreground sm:h-4.75 dark:bg-card";

// Status colours come from the theme tokens, so a theme recolours every flow.
const chipToneClassName: Record<FlowStatusTone, string> = {
  done: "bg-success/8 text-success-foreground dark:bg-success/16",
  failed: "bg-destructive/8 text-destructive-foreground dark:bg-destructive/16",
  neutral: "bg-muted text-muted-foreground",
  running: "bg-info/8 text-info-foreground dark:bg-info/16",
  waiting: "bg-warning/8 text-warning-foreground dark:bg-warning/16",
};

const FlowContext: React.Context<{ editable: boolean }> = createContext<{
  editable: boolean;
}>({ editable: true });

function isFlowStatus(status: unknown): status is FlowStatus {
  return (
    typeof status === "object" &&
    status !== null &&
    !isValidElement(status) &&
    "label" in status
  );
}

const connectorHeight = {
  8: "h-2",
  16: "h-4",
  22: "h-5.5",
} as const;

export function Flow({
  className,
  children,
  dots = true,
  editable = true,
  notice,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: Omit<React.ComponentProps<typeof ScrollArea>, "fill"> & {
  dots?: boolean;
  editable?: boolean;
  notice?: React.ReactNode;
}): React.ReactElement {
  return (
    <FlowContext.Provider value={{ editable }}>
      <ScrollArea
        className={cn(
          "@container h-auto rounded-[calc(var(--radius)+2px)] bg-muted [--flow-step-width:300px] @max-[38rem]:[&>[data-slot=scroll-area-viewport]>[data-slot=scroll-area-content]]:min-w-0!",
          className,
        )}
        clampContentMinWidth={false}
        data-editable={editable ? "" : undefined}
        data-slot="flow"
        fill
        {...props}
      >
        <div
          className={cn(
            "flex min-h-full @max-[38rem]:w-full w-max min-w-full flex-col items-center @max-[38rem]:px-4 px-6 py-7",
            dots &&
              "bg-[radial-gradient(var(--flow-dot,var(--color-border))_1px,transparent_1px)] bg-size-[18px_18px]",
          )}
          data-slot="flow-surface"
        >
          {notice ? (
            <div
              className="mb-5.5 w-(--flow-step-width) max-w-full"
              data-slot="flow-notice"
            >
              {notice}
            </div>
          ) : null}
          <ol
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className="flex @max-[38rem]:w-(--flow-step-width) @max-[38rem]:max-w-full flex-col items-center"
            data-slot="flow-list"
          >
            {children}
          </ol>
        </div>
      </ScrollArea>
    </FlowContext.Provider>
  );
}

export function FlowStep({
  className,
  icon,
  kind,
  title,
  tone = "default",
  status,
  selected = false,
  muted = false,
  render,
  children,
  ...props
}: FlowStepProps): React.ReactElement {
  const interactive = Boolean(render || props.onClick);

  const defaultProps = {
    "aria-current": interactive && selected ? ("true" as const) : undefined,
    children: (
      <>
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md [&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4.5 [&_svg]:shrink-0",
              tone === "trigger"
                ? "bg-info/12 text-info-foreground dark:bg-info/20"
                : "bg-muted text-muted-foreground",
            )}
            data-slot="flow-step-icon"
          >
            {icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col">
          {kind ? (
            <span
              className="truncate text-muted-foreground text-sm leading-[1.3] sm:text-xs"
              data-slot="flow-step-kind"
            >
              {kind}
              <span className="sr-only">: </span>
            </span>
          ) : null}
          <span
            className="line-clamp-2 font-medium text-base leading-[1.35] sm:text-sm"
            data-slot="flow-step-title"
          >
            {title}
          </span>
          {children ? (
            <span
              className="mt-1 flex flex-wrap items-center gap-1.5 text-muted-foreground text-sm sm:text-xs"
              data-slot="flow-step-content"
            >
              {children}
            </span>
          ) : null}
        </span>
        {status ? (
          <span
            className="flex shrink-0 items-center gap-1.5"
            data-slot="flow-step-status"
          >
            <span className="sr-only">, </span>
            {isFlowStatus(status) ? (
              <FlowChip tone={status.tone}>{status.label}</FlowChip>
            ) : (
              status
            )}
          </span>
        ) : null}
      </>
    ),
    className: cn(
      "relative flex w-(--flow-step-width) max-w-full items-center gap-2.5 rounded-[calc(var(--radius)+2px)] border bg-card px-[calc(--spacing(3)-0.5px)] py-[calc(--spacing(2.5)-0.5px)] text-start text-card-foreground outline-none",
      "motion-safe:transition-[background-color,box-shadow] [button&]:cursor-pointer [button&]:hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      "data-selected:border-ring data-selected:ring-2 data-selected:ring-ring/32",
      "data-muted:border-dashed data-muted:bg-card/48 data-muted:*:opacity-64",
      className,
    ),
    "data-muted": muted ? "" : undefined,
    "data-selected": selected ? "" : undefined,
    "data-slot": "flow-step-card",
    "data-tone": tone,
    type: interactive && !render ? ("button" as const) : undefined,
  };

  const card = useRender({
    defaultTagName: interactive ? "button" : "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });

  return (
    <li className="flex w-full justify-center" data-slot="flow-step">
      {card}
    </li>
  );
}

export function FlowConnector({
  className,
  size = 22,
  ...props
}: React.ComponentProps<"li"> & {
  size?: keyof typeof connectorHeight;
}): React.ReactElement {
  return (
    <li
      aria-hidden="true"
      className={cn(
        "w-[1.5px] shrink-0 bg-[color:var(--flow-line,color-mix(in_srgb,var(--color-foreground)_40%,transparent))]",
        connectorHeight[size],
        // Stacked paths hide the lines that lead into a branch or a path label.
        "@max-[38rem]:in-data-[slot=flow-path]:first:hidden @max-[38rem]:[&:has(+[data-slot=flow-branch])]:invisible",
        className,
      )}
      data-slot="flow-connector"
      {...props}
    />
  );
}

export function FlowAdd({
  className,
  label = "Add a step",
  size = 22,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children" | "size"> & {
  label?: string;
  /** The line it stands in for when the flow is not editable. */
  size?: keyof typeof connectorHeight;
}): React.ReactElement {
  const { editable } = useContext(FlowContext);

  if (!editable) return <FlowConnector size={size} />;

  return (
    <li
      className="flex w-full flex-col items-center @max-[38rem]:[&:has(+[data-slot=flow-branch])>span:last-child]:invisible @max-[38rem]:in-data-[slot=flow-path]:first:[&>span:first-child]:hidden"
      data-slot="flow-add"
    >
      <span
        aria-hidden="true"
        className="h-2 w-[1.5px] bg-[color:var(--flow-line,color-mix(in_srgb,var(--color-foreground)_40%,transparent))]"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={label}
              className={cn(
                "size-5 rounded-full bg-card text-muted-foreground shadow-none before:hidden hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_4%)] hover:text-foreground sm:size-5 dark:bg-card dark:hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_6%)] [&_svg:not([class*='size-'])]:size-3 sm:[&_svg:not([class*='size-'])]:size-3 [&_svg]:mx-0",
                className,
              )}
              size="icon-xs"
              variant="outline"
              {...props}
            />
          }
        >
          <PlusIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipPopup className="motion-reduce:transition-none">
          {label}
        </TooltipPopup>
      </Tooltip>
      <span
        aria-hidden="true"
        className="h-2 w-[1.5px] bg-[color:var(--flow-line,color-mix(in_srgb,var(--color-foreground)_40%,transparent))]"
      />
    </li>
  );
}

export function FlowBranch({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** The question the branch answers, usually the title of its check. */
  label: string;
}): React.ReactElement {
  return (
    <li className="flex w-full justify-center" data-slot="flow-branch">
      <div
        aria-label={label}
        className={cn(
          "flex @max-[38rem]:w-full @max-[38rem]:flex-col items-start @max-[38rem]:gap-4 gap-10",
          className,
        )}
        role="group"
        {...props}
      >
        {children}
      </div>
    </li>
  );
}

export function FlowPath({
  className,
  label,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode;
  children?: React.ReactNode;
}): React.ReactElement {
  const labelId = useId();

  return (
    <div
      className={cn(
        // Each path draws its own half of the bracket: a top line from its
        // centre to the inner edge (half the 40px gap past it), and a drop.
        "relative flex min-w-(--flow-step-width) flex-col items-center pt-3.5 [--flow-step-width:260px]",
        "before:absolute before:-inset-x-5 before:top-0 before:h-[1.5px] before:bg-[color:var(--flow-line,color-mix(in_srgb,var(--color-foreground)_40%,transparent))] first:before:start-[calc(50%-0.75px)] last:before:end-[calc(50%-0.75px)]",
        "after:absolute after:start-[calc(50%-0.75px)] after:top-0 after:h-3.5 after:w-[1.5px] after:bg-[color:var(--flow-line,color-mix(in_srgb,var(--color-foreground)_40%,transparent))]",
        "@max-[38rem]:min-w-0 @max-[38rem]:items-stretch @max-[38rem]:pt-0 @max-[38rem]:[--flow-step-width:100%] @max-[38rem]:before:hidden @max-[38rem]:after:hidden",
        className,
      )}
      data-slot="flow-path"
      {...props}
    >
      <Badge
        className={cn(
          pillClassName,
          "@max-[38rem]:self-start @max-[38rem]:border-transparent @max-[38rem]:bg-transparent @max-[38rem]:px-0 @max-[38rem]:font-medium @max-[38rem]:dark:bg-transparent",
        )}
        data-slot="flow-path-label"
        id={labelId}
        variant="outline"
      >
        {label}
      </Badge>
      <ol
        aria-labelledby={labelId}
        className="@max-[38rem]:mt-1.5 flex flex-col items-center @max-[38rem]:ps-4"
        data-slot="flow-path-list"
      >
        {children}
      </ol>
    </div>
  );
}

export function FlowChip({
  className,
  tone = "neutral",
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant"> & {
  tone?: FlowStatusTone;
}): React.ReactElement {
  return (
    <Badge
      className={cn(
        "rounded-full px-[calc(--spacing(2)-1px)] font-normal",
        chipToneClassName[tone],
        className,
      )}
      data-slot="flow-chip"
      data-tone={tone}
      {...props}
    />
  );
}

export function FlowEnd({
  className,
  children = "Done",
  ...props
}: React.ComponentProps<typeof Badge>): React.ReactElement {
  return (
    <li className="flex w-full justify-center" data-slot="flow-end">
      <Badge
        className={cn(pillClassName, "text-muted-foreground/72", className)}
        variant="outline"
        {...props}
      >
        {children}
      </Badge>
    </li>
  );
}

export type FlowStatusTone =
  | "neutral"
  | "running"
  | "waiting"
  | "failed"
  | "done";

export interface FlowStatus {
  /** Usually a number and a word, such as "128 runs" or "3 failed". */
  label: React.ReactNode;
  tone?: FlowStatusTone;
}

export interface FlowStepProps
  extends Omit<useRender.ComponentProps<"div">, "title"> {
  icon?: React.ReactNode;
  kind?: React.ReactNode;
  title: React.ReactNode;
  tone?: "default" | "trigger";
  /** A chip from { label, tone }, or any element to show instead. */
  status?: FlowStatus | React.ReactNode;
  selected?: boolean;
  muted?: boolean;
}
