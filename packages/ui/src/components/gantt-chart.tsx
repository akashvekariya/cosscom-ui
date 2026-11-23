"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Popover, PopoverPrimitive } from "@coss/ui/components/popover";
import {
  RadioGroupPrimitive,
  RadioPrimitive,
} from "@coss/ui/components/radio-group";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@coss/ui/components/segmented-control";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Slider } from "@coss/ui/components/slider";
import { Switch } from "@coss/ui/components/switch";
import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
import {
  type TimeGridLane,
  type TimeGridSegment,
  type UseTimeGridReturn,
  useTimeGrid,
} from "@coss/ui/hooks/use-time-grid";
import {
  type EventColor,
  eventColorNames,
  eventColors,
  resolveEventColor,
} from "@coss/ui/lib/event-colors";
import { cn } from "@coss/ui/lib/utils";
import {
  addDays,
  addHours,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isWeekend,
  type Locale,
  max,
  min,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  CheckIcon,
  ChevronRightIcon,
  DiamondIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const DAY = 86_400_000;
const ROW_HEIGHT = 40;
const BAR_HEIGHT = 24;
const DAY_WIDTH: Record<GanttZoom, number> = { day: 36, month: 5, week: 16 };

type Row =
  | { type: "group"; group: GanttGroup; tasks: GanttTask[] }
  | { type: "task"; task: GanttTask; depth: number };

type Context = {
  formatDate: (date: Date) => string;
  isReadOnly: (task: GanttTask) => boolean;
  labels: GanttChartLabels;
  locale?: Locale;
  openDetails: (task: GanttTask, anchor: HTMLElement) => void;
};

const GanttContext = createContext<Context | null>(null);

function useGantt(): Context {
  const context = useContext(GanttContext);
  if (!context) throw new Error("Missing GanttChart context");
  return context;
}

function roundToDay(time: number): number {
  return startOfDay(addHours(time, 12)).getTime();
}

function isMilestone(task: GanttTask): boolean {
  return task.end.getTime() <= task.start.getTime();
}

/** An SVG path through the points, with softly rounded corners. */
function roundedPath(points: [number, number][], radius = 6): string {
  const [first] = points;
  if (!first) return "";
  let path = `M ${first[0]} ${first[1]}`;
  for (let index = 1; index < points.length - 1; index++) {
    const [px, py] = points[index - 1] as [number, number];
    const [cx, cy] = points[index] as [number, number];
    const [nx, ny] = points[index + 1] as [number, number];
    const before = Math.hypot(cx - px, cy - py);
    const after = Math.hypot(nx - cx, ny - cy);
    if (!before || !after) continue;
    const r = Math.min(radius, before / 2, after / 2);
    path += ` L ${cx - ((cx - px) / before) * r} ${cy - ((cy - py) / before) * r}`;
    path += ` Q ${cx} ${cy} ${cx + ((nx - cx) / after) * r} ${cy + ((ny - cy) / after) * r}`;
  }
  const last = points[points.length - 1] as [number, number];
  return `${path} L ${last[0]} ${last[1]}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function colorStyle(color: string): React.CSSProperties {
  return { "--event-color": color } as React.CSSProperties;
}

/** A popover that opens in place and hides while its anchor is out of view. */
function GanttPopup({
  anchor,
  children,
  finalFocus,
}: {
  anchor: Element;
  children: React.ReactNode;
  finalFocus?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align="start"
        anchor={anchor}
        className="z-50 data-anchor-hidden:invisible"
        collisionPadding={8}
        side="bottom"
        sideOffset={6}
      >
        <PopoverPrimitive.Popup
          className="relative max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] origin-(--transform-origin) overflow-y-auto rounded-lg border bg-popover not-dark:bg-clip-padding p-4 text-popover-foreground shadow-lg/5 outline-none transition-[scale,opacity] duration-150 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
          data-slot="gantt-popup"
          finalFocus={finalFocus}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function TaskBar({
  grid,
  segment,
  dayWidth,
  conflict,
}: {
  grid: UseTimeGridReturn<GanttTask & { lane: string }>;
  segment: TimeGridSegment<GanttTask & { lane: string }>;
  dayWidth: number;
  conflict: boolean;
}) {
  const { formatDate, isReadOnly, labels, openDetails } = useGantt();
  const task = segment.item;
  const readOnly = isReadOnly(task);
  const gridProps = grid.getItemProps(segment);
  const props = readOnly
    ? {
        ...gridProps,
        "aria-describedby": undefined,
        "aria-roledescription": undefined,
        onKeyDown: undefined,
        onPointerDown: undefined,
      }
    : gridProps;
  const color = resolveEventColor(task.color);
  const milestone = isMilestone(task);
  const days = Math.max(
    1,
    Math.round((task.end.getTime() - task.start.getTime()) / DAY),
  );
  const width = days * dayWidth;
  const labelInside = !milestone && width >= task.name.length * 7 + 20;
  const progress = Math.min(Math.max(task.progress ?? 0, 0), 1);
  const lastDay = addDays(task.end, -1);
  const description = milestone
    ? `${task.name}, ${labels.milestone}, ${formatDate(task.start)}`
    : `${task.name}, ${formatDate(task.start)} – ${formatDate(lastDay)}, ${Math.round(progress * 100)}%`;

  return (
    <div
      {...props}
      aria-label={description}
      className="py-2 outline-none data-dragging:z-20 [&:focus-visible>[data-slot=gantt-bar]]:ring-2 [&:focus-visible>[data-slot=gantt-bar]]:ring-ring [&[data-dragging]>[data-slot=gantt-bar]]:shadow-lg [&[data-refused]>[data-slot=gantt-bar]]:ring-2 [&[data-refused]>[data-slot=gantt-bar]]:ring-destructive"
      data-slot="gantt-task"
      onClick={(clickEvent) => openDetails(task, clickEvent.currentTarget)}
      onKeyDown={(keyEvent) => {
        props.onKeyDown?.(keyEvent);
        if (!keyEvent.defaultPrevented && keyEvent.key === "Enter") {
          keyEvent.preventDefault();
          openDetails(task, keyEvent.currentTarget);
        }
      }}
      style={{ ...props.style, ...colorStyle(color) }}
    >
      {milestone ? (
        <div className="absolute inset-y-0 start-0" data-slot="gantt-bar">
          {/* The diamond is centered on the date; the name sits beside it. */}
          <span className="absolute start-0 top-1/2 size-4 -translate-y-1/2 rotate-45 rounded-[3px] border-2 border-background bg-(--event-color) shadow-sm in-[[data-slot=gantt-task]:focus-visible]:ring-2 in-[[data-slot=gantt-task]:focus-visible]:ring-ring ltr:-translate-x-1/2 rtl:translate-x-1/2" />
          <span className="absolute start-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-background px-1 font-medium text-sm sm:text-xs">
            {task.name}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex h-full cursor-pointer items-center rounded-md border border-[color-mix(in_oklab,var(--event-color)_40%,transparent)] bg-[color-mix(in_oklab,var(--event-color)_18%,var(--background))] transition-[box-shadow] hover:bg-[color-mix(in_oklab,var(--event-color)_26%,var(--background))]",
            conflict && "outline-2 outline-destructive outline-offset-1",
          )}
          data-slot="gantt-bar"
        >
          {/* Clipped by the bar's own corners, so a full bar stays round. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden rounded-[5px]"
          >
            <div
              className="h-full bg-[color-mix(in_oklab,var(--event-color)_55%,var(--background))]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {labelInside && (
            <span className="relative truncate px-2 font-medium text-sm sm:text-xs">
              {task.name}
            </span>
          )}
          {!labelInside && (
            <span className="absolute start-full ms-1.5 whitespace-nowrap rounded-sm bg-background px-1 font-medium text-sm sm:text-xs">
              {task.name}
            </span>
          )}
        </div>
      )}
      {!readOnly && !milestone && (
        <>
          <div
            {...grid.getResizeHandleProps(segment, "start")}
            className="absolute inset-y-1 start-0 w-2 rounded-s-md"
          />
          <div
            {...grid.getResizeHandleProps(segment, "end")}
            className="absolute inset-y-1 end-0 w-2 rounded-e-md"
          />
        </>
      )}
    </div>
  );
}

function TaskDetails({
  task,
  tasks,
  groups,
  onClose,
  onDelete,
  onEdit,
}: {
  task: GanttTask;
  tasks: GanttTask[];
  groups: GanttGroup[];
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { formatDate, isReadOnly, labels } = useGantt();
  const color = resolveEventColor(task.color);
  const milestone = isMilestone(task);
  const days = Math.round((task.end.getTime() - task.start.getTime()) / DAY);
  const group = groups.find((entry) => entry.id === task.groupId);
  const dependsOn = (task.dependencies ?? [])
    .map((id) => tasks.find((entry) => entry.id === id))
    .filter((entry): entry is GanttTask => Boolean(entry));
  const editable = !isReadOnly(task);

  return (
    <div className="flex flex-col gap-3" style={colorStyle(color)}>
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 size-3 shrink-0 bg-(--event-color)",
            milestone ? "rotate-45 rounded-[2px]" : "rounded-sm",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-lg leading-snug">
            {task.name}
          </p>
          <p className="text-muted-foreground text-sm">
            {milestone
              ? `${labels.milestone}, ${formatDate(task.start)}`
              : `${formatDate(task.start)} – ${formatDate(addDays(task.end, -1))}, ${labels.days(days)}`}
          </p>
        </div>
        <div className="-me-2 -mt-1 flex shrink-0">
          {editable && (
            <>
              <Button
                aria-label={labels.edit}
                onClick={onEdit}
                size="icon-sm"
                variant="ghost"
              >
                <PencilIcon aria-hidden="true" />
              </Button>
              <Button
                aria-label={labels.delete}
                onClick={onDelete}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </>
          )}
          <Button
            aria-label={labels.close}
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
      {!milestone && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{labels.progress}</span>
            <span className="tabular-nums">
              {Math.round((task.progress ?? 0) * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-(--event-color)"
              style={{ width: `${(task.progress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      )}
      <dl className="flex flex-col gap-2 text-sm">
        {group && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-muted-foreground">
              {labels.group}
            </dt>
            <dd>{group.name}</dd>
          </div>
        )}
        {task.assignee && (
          <div className="flex items-center gap-2">
            <dt className="w-24 shrink-0 text-muted-foreground">
              {labels.owner}
            </dt>
            <dd className="flex items-center gap-2">
              <Avatar className="[--avatar-size:--spacing(6)]">
                {task.assignee.image && (
                  <AvatarImage alt="" src={task.assignee.image} />
                )}
                <AvatarFallback>{initials(task.assignee.name)}</AvatarFallback>
              </Avatar>
              {task.assignee.name}
            </dd>
          </div>
        )}
        {dependsOn.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-muted-foreground">
              {labels.dependsOn}
            </dt>
            <dd className="flex flex-col gap-1">
              {dependsOn.map((entry) => {
                const late = entry.end.getTime() > task.start.getTime();
                return (
                  <span className="flex items-center gap-1.5" key={entry.id}>
                    <LinkIcon
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground"
                    />
                    {entry.name}
                    {late && (
                      <Badge size="sm" variant="error">
                        {labels.overlaps}
                      </Badge>
                    )}
                  </span>
                );
              })}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function TaskEditor({
  task,
  mode,
  groups,
  nameRef,
  onCancel,
  onDelete,
  onSave,
}: {
  task: GanttTask;
  mode: "create" | "edit";
  groups: GanttGroup[];
  nameRef: React.RefObject<HTMLInputElement | null>;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (task: GanttTask) => void;
}) {
  const { labels } = useGantt();
  const id = useId();
  const [name, setName] = useState(task.name);
  const [milestone, setMilestone] = useState(isMilestone(task));
  const [startDate, setStartDate] = useState(format(task.start, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(
    format(
      isMilestone(task) ? task.start : addDays(task.end, -1),
      "yyyy-MM-dd",
    ),
  );
  const [progress, setProgress] = useState(
    Math.round((task.progress ?? 0) * 100),
  );
  const [groupId, setGroupId] = useState(task.groupId ?? "");
  const [color, setColor] = useState(task.color ?? "blue");
  const [error, setError] = useState("");
  const groupItems = [
    { label: labels.noGroup, value: "" },
    ...groups.map((group) => ({ label: group.name, value: group.id })),
  ];

  const save = (): void => {
    const start = parse(startDate, "yyyy-MM-dd", new Date());
    const last = parse(endDate, "yyyy-MM-dd", new Date());
    if (Number.isNaN(start.getTime()) || Number.isNaN(last.getTime())) {
      setError(labels.invalidDate);
      return;
    }
    if (!milestone && last < start) {
      setError(labels.endBeforeStart);
      return;
    }
    onSave({
      ...task,
      color,
      end: milestone ? start : addDays(last, 1),
      groupId: groupId || undefined,
      name: name.trim() || labels.untitled,
      progress: milestone ? undefined : progress / 100,
      start,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? labels.newTask : labels.editTask}
        </DialogTitle>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          save();
        }}
      >
        <DialogPanel className="grid gap-4">
          <Field>
            <FieldLabel>{labels.name}</FieldLabel>
            <Input
              onChange={(changeEvent) => setName(changeEvent.target.value)}
              placeholder={labels.untitled}
              ref={nameRef}
              type="text"
              value={name}
            />
          </Field>
          <Label>
            <Switch checked={milestone} onCheckedChange={setMilestone} />
            {labels.milestone}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{milestone ? labels.date : labels.starts}</FieldLabel>
              <Input
                onChange={(changeEvent) =>
                  setStartDate(changeEvent.target.value)
                }
                type="date"
                value={startDate}
              />
            </Field>
            {!milestone && (
              <Field>
                <FieldLabel>{labels.ends}</FieldLabel>
                <Input
                  onChange={(changeEvent) =>
                    setEndDate(changeEvent.target.value)
                  }
                  type="date"
                  value={endDate}
                />
              </Field>
            )}
          </div>
          {error && (
            <p className="text-destructive-foreground text-sm" role="alert">
              {error}
            </p>
          )}
          {!milestone && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span
                  className="font-medium text-base sm:text-sm"
                  id={`${id}-progress`}
                >
                  {labels.progress}
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {progress}%
                </span>
              </div>
              <Slider
                aria-labelledby={`${id}-progress`}
                max={100}
                onValueChange={(value) =>
                  setProgress(Array.isArray(value) ? (value[0] ?? 0) : value)
                }
                step={5}
                value={progress}
              />
            </div>
          )}
          {groups.length > 0 && (
            <Field>
              <FieldLabel>{labels.group}</FieldLabel>
              <Select
                items={groupItems}
                onValueChange={(value) => setGroupId(String(value ?? ""))}
                value={groupId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {groupItems.map((item) => (
                    <SelectItem key={item.value || "none"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          )}
          <div className="flex flex-col gap-2">
            <span
              className="font-medium text-base sm:text-sm"
              id={`${id}-color`}
            >
              {labels.color}
            </span>
            <RadioGroupPrimitive
              aria-labelledby={`${id}-color`}
              className="flex flex-wrap gap-2"
              onValueChange={(value) => setColor(String(value))}
              value={color}
            >
              {eventColorNames.map((entry) => (
                <RadioPrimitive.Root
                  aria-label={entry}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:border-foreground sm:size-7"
                  key={entry}
                  value={entry}
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full text-white sm:size-5"
                    style={{ background: eventColors[entry as EventColor] }}
                  >
                    <RadioPrimitive.Indicator>
                      <CheckIcon aria-hidden="true" className="size-3.5" />
                    </RadioPrimitive.Indicator>
                  </span>
                </RadioPrimitive.Root>
              ))}
            </RadioGroupPrimitive>
          </div>
        </DialogPanel>
        <DialogFooter>
          {mode === "edit" && (
            <Button
              className="sm:me-auto"
              onClick={onDelete}
              type="button"
              variant="destructive-outline"
            >
              <Trash2Icon aria-hidden="true" />
              {labels.delete}
            </Button>
          )}
          <DialogClose
            onClick={onCancel}
            render={<Button type="button" variant="ghost" />}
          >
            {labels.cancel}
          </DialogClose>
          <Button type="submit">{labels.save}</Button>
        </DialogFooter>
      </Form>
    </>
  );
}

export type GanttZoom = "day" | "week" | "month";

export type GanttAssignee = { name: string; image?: string };

export type GanttTask = {
  id: string;
  name: string;
  start: Date;
  /**
   * Exclusive end: the midnight after the last day. Equal to `start` for a
   * milestone.
   */
  end: Date;
  /** Share of the work done, from 0 to 1. */
  progress?: number;
  /** A color name such as `"green"`, or any CSS color. */
  color?: EventColor | (string & {});
  /** Id of the group the task belongs to. */
  groupId?: string;
  /** Ids of tasks that must finish before this one starts. */
  dependencies?: string[];
  assignee?: GanttAssignee;
  /** The task cannot be moved, edited or deleted. */
  readOnly?: boolean;
};

export type GanttGroup = {
  id: string;
  name: string;
  color?: EventColor | (string & {});
};

export type GanttChange = {
  type: "create" | "update" | "delete";
  task: GanttTask;
  /** The task before an update. */
  previous?: GanttTask;
};

export const ganttChartLabels = {
  addTask: "Add task",
  announce: (
    type: "start" | "move" | "resize" | "drop" | "cancel" | "refuse",
    task: string,
    range: string,
  ): string =>
    ({
      cancel: `Change canceled. ${task} is back at ${range}.`,
      drop: `Dropped ${task} at ${range}.`,
      move: `Moved ${task} to ${range}.`,
      refuse: `${task} cannot go to ${range}.`,
      resize: `Resized ${task} to ${range}.`,
      start: `Picked up ${task}, ${range}.`,
    })[type],
  cancel: "Cancel",
  close: "Close",
  collapse: "Collapse",
  color: "Color",
  date: "Date",
  day: "Day",
  days: (count: number): string => (count === 1 ? "1 day" : `${count} days`),
  delete: "Delete",
  dependsOn: "Depends on",
  edit: "Edit",
  editTask: "Edit task",
  endBeforeStart: "The end must be on or after the start.",
  ends: "Ends",
  expand: "Expand",
  group: "Group",
  instructions:
    "Press Enter to open a task. Press Space to pick it up, then use the left and right arrow keys to move it by a day. Hold Shift to change its end, or Alt to change its start. Press Space to drop it, or Escape to cancel.",
  invalidDate: "Enter a valid date.",
  milestone: "Milestone",
  month: "Month",
  name: "Name",
  newTask: "New task",
  noGroup: "No group",
  overlaps: "Overlaps",
  owner: "Owner",
  progress: "Progress",
  resizeList: "Resize task list",
  save: "Save",
  starts: "Starts",
  task: "Task",
  tasks: "Tasks",
  today: "Today",
  untitled: "Untitled task",
  week: "Week",
  zoom: "Zoom",
};

export type GanttChartLabels = typeof ganttChartLabels;

export type GanttChartProps = {
  /** Tasks to show. Controlled. */
  tasks?: GanttTask[];
  /** Initial tasks when uncontrolled. */
  defaultTasks?: GanttTask[];
  /** Called after every create, update or delete. */
  onTasksChange?: (tasks: GanttTask[], change: GanttChange) => void;
  /** Groups tasks can belong to, in display order. */
  groups?: GanttGroup[];
  zoom?: GanttZoom;
  defaultZoom?: GanttZoom;
  onZoomChange?: (zoom: GanttZoom) => void;
  /** Title shown in the toolbar. */
  title?: React.ReactNode;
  /** First day of the week, 0 for Sunday. Defaults to 1, Monday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  locale?: Locale;
  /** Fixes today, for example in tests and demos. */
  now?: Date;
  /** Allow moving, resizing, adding, editing and deleting. Defaults to `true`. */
  editable?: boolean;
  labels?: Partial<GanttChartLabels>;
  /** Id for new tasks. Defaults to a random id. */
  createId?: () => string;
  className?: string;
};

/**
 * A gantt chart with groups, progress, milestones and dependency arrows.
 * Bars can be moved and resized by mouse, touch and keyboard, and tasks can
 * be opened, edited, added and deleted.
 */
export function GanttChart({
  tasks: tasksProp,
  defaultTasks,
  onTasksChange,
  groups = [],
  zoom: zoomProp,
  defaultZoom = "day",
  onZoomChange,
  title,
  weekStartsOn = 1,
  locale,
  now: nowProp,
  editable = true,
  labels: labelsProp,
  createId = (): string =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  className,
}: GanttChartProps): React.ReactElement {
  const labels = { ...ganttChartLabels, ...labelsProp };
  const phone = useMediaQuery("max-sm");
  const [uncontrolledTasks, setUncontrolledTasks] = useState(
    defaultTasks ?? [],
  );
  const tasks = tasksProp ?? uncontrolledTasks;
  const [uncontrolledZoom, setUncontrolledZoom] = useState(defaultZoom);
  const zoom = zoomProp ?? uncontrolledZoom;
  const [today] = useState(() => startOfDay(nowProp ?? new Date()));
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [listWidth, setListWidth] = useState<number | null>(null);
  const [details, setDetails] = useState<{
    task: GanttTask;
    anchor: HTMLElement;
  } | null>(null);
  const [editor, setEditor] = useState<{
    task: GanttTask;
    mode: "create" | "edit";
    key: number;
  } | null>(null);
  const editorKey = useRef(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const focusAfter = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayWidth = DAY_WIDTH[zoom];
  const width = listWidth ?? (phone ? 128 : 288);

  const setZoom = (next: GanttZoom): void => {
    if (zoomProp === undefined) setUncontrolledZoom(next);
    onZoomChange?.(next);
  };
  const commit = (next: GanttTask[], change: GanttChange): void => {
    if (tasksProp === undefined) setUncontrolledTasks(next);
    onTasksChange?.(next, change);
  };
  const isReadOnly = (task: GanttTask): boolean =>
    !editable || Boolean(task.readOnly);
  const formatDate = (date: Date): string => format(date, "MMM d", { locale });

  const range = useMemo(() => {
    const starts = tasks.map((task) => task.start);
    const ends = tasks.map((task) => task.end);
    const first = min([today, ...starts]);
    const last = max([today, ...ends]);
    if (zoom === "month") {
      return {
        end: addMonths(startOfMonth(last), 7),
        start: startOfMonth(addMonths(first, -2)),
      };
    }
    return {
      end: addDays(
        startOfDay(endOfWeek(addDays(last, 21), { weekStartsOn })),
        1,
      ),
      start: startOfWeek(addDays(first, -7), { weekStartsOn }),
    };
  }, [tasks, today, zoom, weekStartsOn]);

  const totalDays = differenceInCalendarDays(range.end, range.start);
  const timelineWidth = totalDays * dayWidth;
  const xOf = (date: Date): number =>
    ((date.getTime() - range.start.getTime()) / DAY) * dayWidth;

  const rows = useMemo((): Row[] => {
    const result: Row[] = [];
    for (const group of groups) {
      const members = tasks.filter((task) => task.groupId === group.id);
      result.push({ group, tasks: members, type: "group" });
      if (!collapsed.includes(group.id)) {
        for (const task of members)
          result.push({ depth: 1, task, type: "task" });
      }
    }
    for (const task of tasks) {
      if (!task.groupId || !groups.some((group) => group.id === task.groupId)) {
        result.push({ depth: 0, task, type: "task" });
      }
    }
    return result;
  }, [groups, tasks, collapsed]);

  const taskRows = rows.filter(
    (row): row is Extract<Row, { type: "task" }> => row.type === "task",
  );
  const lanes = useMemo(
    (): TimeGridLane[] =>
      taskRows.map((row) => ({
        end: range.end,
        id: row.task.id,
        start: range.start,
      })),
    [range.start, range.end, taskRows.map],
  );
  const items = taskRows.map((row) => ({ ...row.task, lane: row.task.id }));

  const grid = useTimeGrid<GanttTask & { lane: string }>({
    disabled: !editable,
    formatRange: (start, end) =>
      end.getTime() <= start.getTime()
        ? formatDate(start)
        : `${formatDate(start)} – ${formatDate(addDays(end, -1))}`,
    getAnnouncement: (event) => {
      const range =
        event.to.end.getTime() <= event.to.start.getTime()
          ? formatDate(event.to.start)
          : `${formatDate(event.to.start)} – ${formatDate(addDays(event.to.end, -1))}`;
      const type =
        event.type === "move" && event.action !== "move"
          ? "resize"
          : event.type;
      return labels.announce(type, event.item.name, range);
    },
    getItemLabel: (task) => task.name,
    instructions: labels.instructions,
    lanes,
    lockLane: true,
    minDuration: DAY,
    onValueChange: (_, change) => {
      const previous = tasks.find((task) => task.id === change.item.id);
      if (!previous) return;
      const next = {
        ...previous,
        end: isMilestone(previous) ? change.to.start : change.to.end,
        start: change.to.start,
      };
      commit(
        tasks.map((task) => (task.id === previous.id ? next : task)),
        { previous, task: next, type: "update" },
      );
    },
    orientation: "horizontal",
    pickUpKeys: [" "],
    snap: roundToDay,
    step: DAY,
    value: items,
  });

  const preview = new Map(grid.value.map((task) => [task.id, task]));
  const rowIndex = new Map(
    rows.map((row, index) => [
      row.type === "task" ? row.task.id : `group:${row.group.id}`,
      index,
    ]),
  );

  // Scroll to a few days before today when the chart opens or the zoom changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only on open and zoom.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = Math.max(0, xOf(today) - dayWidth * 3);
  }, [zoom]);

  const scrollToToday = (): void => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      left: Math.max(0, xOf(today) - dayWidth * 3),
    });
  };

  const header = useMemo(() => {
    const top: { key: string; label: string; x: number; width: number }[] = [];
    const bottom: {
      key: string;
      label: string;
      sub?: string;
      x: number;
      width: number;
      weekend?: boolean;
      today?: boolean;
    }[] = [];
    if (zoom === "month") {
      for (
        let year = startOfYear(range.start);
        year < range.end;
        year = addMonths(year, 12)
      ) {
        const from = max([year, range.start]);
        const to = min([addMonths(year, 12), range.end]);
        top.push({
          key: year.toISOString(),
          label: format(year, "yyyy", { locale }),
          width: xOf(to) - xOf(from),
          x: xOf(from),
        });
      }
      for (
        let month = range.start;
        month < range.end;
        month = addMonths(month, 1)
      ) {
        bottom.push({
          key: month.toISOString(),
          label: format(month, "MMM", { locale }),
          width: xOf(addMonths(month, 1)) - xOf(month),
          x: xOf(month),
        });
      }
    } else {
      for (
        let month = startOfMonth(range.start);
        month < range.end;
        month = addMonths(month, 1)
      ) {
        const from = max([month, range.start]);
        const to = min([endOfMonth(month), addDays(range.end, -1)]);
        top.push({
          key: month.toISOString(),
          label: format(month, "MMMM yyyy", { locale }),
          width: xOf(addDays(to, 1)) - xOf(from),
          x: xOf(from),
        });
      }
      if (zoom === "day") {
        for (let index = 0; index < totalDays; index++) {
          const day = addDays(range.start, index);
          bottom.push({
            key: day.toISOString(),
            label: format(day, "d", { locale }),
            sub: format(day, "EEEEE", { locale }),
            today: day.getTime() === today.getTime(),
            weekend: isWeekend(day),
            width: dayWidth,
            x: xOf(day),
          });
        }
      } else {
        for (
          let week = range.start;
          week < range.end;
          week = addDays(week, 7)
        ) {
          bottom.push({
            key: week.toISOString(),
            label: format(week, "MMM d", { locale }),
            width: dayWidth * 7,
            x: xOf(week),
          });
        }
      }
    }
    return { bottom, top };
    // biome-ignore lint/correctness/useExhaustiveDependencies: derived from the range and zoom.
  }, [range.start, range.end, zoom, dayWidth, totalDays, locale, today, xOf]);

  const weekendStripes =
    zoom === "month"
      ? undefined
      : Array.from({ length: totalDays }, (_, index) =>
          addDays(range.start, index),
        )
          .filter((day) => isWeekend(day))
          .map((day) => xOf(day));

  // Where a task is drawn: its own row, or its group row when the group is
  // closed and the task is rolled up into it.
  const placeOf = (
    id: string,
  ): { row: number; rolled: boolean; task: GanttTask } | null => {
    const own = rowIndex.get(id);
    const task = preview.get(id) ?? tasks.find((entry) => entry.id === id);
    if (!task) return null;
    if (own !== undefined) return { rolled: false, row: own, task };
    const groupRow = task.groupId
      ? rowIndex.get(`group:${task.groupId}`)
      : undefined;
    return groupRow === undefined
      ? null
      : { rolled: true, row: groupRow, task };
  };

  const arrows = tasks.flatMap((task) => {
    const target = placeOf(task.id);
    if (!target) return [];
    const { row: toRow, task: to } = target;
    return (task.dependencies ?? []).flatMap((id) => {
      const source = placeOf(id);
      if (!source || source.row === toRow) return [];
      const { row: fromRow, task: from } = source;
      const fromMilestone = isMilestone(from);
      const fromStartX = xOf(from.start);
      const fromEndX = xOf(fromMilestone ? from.start : from.end);
      const direction = toRow > fromRow ? 1 : -1;
      // Leave from the bottom (or top) edge of the earlier task, near its
      // end, go down to the later task's row and turn right into its start.
      const xs = fromMilestone
        ? fromEndX
        : Math.max(
            fromEndX - 12,
            fromStartX + Math.min(12, (fromEndX - fromStartX) / 2),
          );
      const ys =
        fromRow * ROW_HEIGHT +
        ROW_HEIGHT / 2 +
        direction * (source.rolled ? 6 : fromMilestone ? 11 : BAR_HEIGHT / 2);
      const x2 =
        xOf(to.start) - (isMilestone(to) ? (target.rolled ? 7 : 12) : 1);
      const y2 = toRow * ROW_HEIGHT + ROW_HEIGHT / 2;
      const edge = y2 - (direction * ROW_HEIGHT) / 2;
      const points: [number, number][] =
        x2 - xs >= 10
          ? [
              [xs, ys],
              [xs, y2],
              [x2, y2],
            ]
          : // The later task starts too early to turn into: run back along
            // the row line above it first.
            [
              [xs, ys],
              [xs, edge],
              [x2 - 10, edge],
              [x2 - 10, y2],
              [x2, y2],
            ];
      const fromEnd = fromMilestone ? from.start : from.end;
      const conflict = fromEnd.getTime() > to.start.getTime();
      return [
        {
          conflict,
          head: `M ${x2 - 6} ${y2 - 3.5} L ${x2} ${y2} L ${x2 - 6} ${y2 + 3.5} Z`,
          key: `${id}->${task.id}`,
          path: roundedPath(points),
        },
      ];
    });
  });
  const conflicts = new Set(
    arrows
      .filter((arrow) => arrow.conflict)
      .map((arrow) => arrow.key.split("->")[1]),
  );

  const openDetails = (task: GanttTask, anchor: HTMLElement): void => {
    focusAfter.current = anchor;
    setDetails({ anchor, task });
  };
  const openEditor = (task: GanttTask, mode: "create" | "edit"): void => {
    editorKey.current += 1;
    if (mode === "create") {
      focusAfter.current = document.activeElement as HTMLElement | null;
    }
    setEditor({ key: editorKey.current, mode, task });
  };
  const deleteTask = (task: GanttTask): void => {
    commit(
      tasks
        .filter((entry) => entry.id !== task.id)
        .map((entry) =>
          entry.dependencies?.includes(task.id)
            ? {
                ...entry,
                dependencies: entry.dependencies.filter((id) => id !== task.id),
              }
            : entry,
        ),
      { task, type: "delete" },
    );
    setDetails(null);
    setEditor(null);
  };

  const startResize = (pointerEvent: React.PointerEvent<HTMLElement>): void => {
    const startX = pointerEvent.clientX;
    const startWidth = width;
    const rtl =
      getComputedStyle(pointerEvent.currentTarget).direction === "rtl";
    const target = pointerEvent.currentTarget;
    target.setPointerCapture(pointerEvent.pointerId);
    const move = (moveEvent: PointerEvent): void => {
      const delta = (moveEvent.clientX - startX) * (rtl ? -1 : 1);
      setListWidth(Math.min(Math.max(startWidth + delta, 96), 480));
    };
    const up = (): void => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const context: Context = {
    formatDate,
    isReadOnly,
    labels,
    locale,
    openDetails,
  };
  const detailsTask = details
    ? (tasks.find((task) => task.id === details.task.id) ?? null)
    : null;
  const showOwner = width >= 220;
  const showDates = width >= 300;
  const todayX = xOf(today);

  return (
    <GanttContext.Provider value={context}>
      <section
        aria-label={typeof title === "string" ? title : labels.tasks}
        className={cn(
          "flex max-h-[40rem] min-h-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground",
          className,
        )}
        data-slot="gantt-chart"
      >
        <header className="flex flex-wrap items-center gap-2 border-b p-2 sm:px-3">
          <h2 className="min-w-0 flex-1 truncate px-1 font-heading font-semibold text-lg max-sm:basis-full sm:px-0 sm:text-base">
            {title ?? labels.tasks}
          </h2>
          <Button onClick={scrollToToday} variant="outline">
            {labels.today}
          </Button>
          {phone ? (
            <Select
              items={(["day", "week", "month"] as GanttZoom[]).map((entry) => ({
                label: labels[entry],
                value: entry,
              }))}
              onValueChange={(value) => setZoom(value as GanttZoom)}
              value={zoom}
            >
              <SelectTrigger aria-label={labels.zoom} className="w-28 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {(["day", "week", "month"] as GanttZoom[]).map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {labels[entry]}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          ) : (
            <SegmentedControl
              aria-label={labels.zoom}
              render={
                <RadioGroupPrimitive
                  onValueChange={(value) => setZoom(value as GanttZoom)}
                  value={zoom}
                />
              }
            >
              {(["day", "week", "month"] as GanttZoom[]).map((entry) => (
                <SegmentedControlItem
                  key={entry}
                  render={<RadioPrimitive.Root value={entry} />}
                >
                  {labels[entry]}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          )}
          {editable && (
            <Button
              aria-label={phone ? labels.addTask : undefined}
              onClick={() =>
                openEditor(
                  {
                    end: addDays(today, 3),
                    id: "",
                    name: "",
                    progress: 0,
                    start: today,
                  },
                  "create",
                )
              }
              size={phone ? "icon" : "default"}
            >
              <PlusIcon aria-hidden="true" />
              {!phone && labels.addTask}
            </Button>
          )}
        </header>

        <div className="relative min-h-0 flex-1 overflow-auto" ref={scrollRef}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `${width}px ${timelineWidth}px`,
              width: width + timelineWidth,
            }}
          >
            {/* Header */}
            <div className="sticky start-0 top-0 z-40 flex items-end border-e border-b bg-background px-3 pb-1.5 font-medium text-muted-foreground text-xs">
              {labels.task}
            </div>
            <div className="sticky top-0 z-30 border-b bg-background">
              <div className="relative h-7 border-b">
                {header.top.map((cell) => (
                  <div
                    className="absolute inset-y-0 border-s pt-1.5 font-medium text-xs"
                    key={cell.key}
                    style={{ insetInlineStart: cell.x, width: cell.width }}
                  >
                    <span
                      className="sticky whitespace-nowrap px-2"
                      style={{ insetInlineStart: width }}
                    >
                      {cell.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative h-9">
                {header.bottom.map((cell) => (
                  <div
                    className={cn(
                      "absolute inset-y-0 flex flex-col items-center justify-center border-s text-muted-foreground text-xs leading-tight",
                      cell.weekend && "bg-muted/48",
                      zoom !== "day" && "items-start px-1.5",
                    )}
                    key={cell.key}
                    style={{ insetInlineStart: cell.x, width: cell.width }}
                  >
                    {cell.sub && (
                      <span className="text-[0.625rem] uppercase">
                        {cell.sub}
                      </span>
                    )}
                    <span
                      className={cn(
                        "tabular-nums",
                        cell.today &&
                          "flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground",
                      )}
                    >
                      {cell.label}
                    </span>
                  </div>
                ))}
                <div
                  className="absolute -bottom-1 z-10 size-2 rounded-full bg-destructive ltr:-translate-x-1/2 rtl:translate-x-1/2"
                  style={{ insetInlineStart: todayX + dayWidth / 2 }}
                />
              </div>
            </div>

            {/* Task list */}
            <div
              className="sticky start-0 z-20 border-e bg-background"
              role="list"
              aria-label={labels.tasks}
            >
              {rows.map((row) =>
                row.type === "group" ? (
                  <div
                    className="flex items-center gap-1 border-b bg-muted/48 px-1.5"
                    key={`group:${row.group.id}`}
                    role="listitem"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <Button
                      aria-expanded={!collapsed.includes(row.group.id)}
                      aria-label={`${collapsed.includes(row.group.id) ? labels.expand : labels.collapse} ${row.group.name}`}
                      onClick={() =>
                        setCollapsed((current) =>
                          current.includes(row.group.id)
                            ? current.filter((id) => id !== row.group.id)
                            : [...current, row.group.id],
                        )
                      }
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ChevronRightIcon
                        aria-hidden="true"
                        className={cn(
                          "transition-transform rtl:-scale-x-100",
                          !collapsed.includes(row.group.id) && "rotate-90",
                        )}
                      />
                    </Button>
                    <span className="min-w-0 flex-1 truncate font-semibold text-base sm:text-sm">
                      {row.group.name}
                    </span>
                    <span className="shrink-0 pe-1 text-muted-foreground text-xs tabular-nums">
                      {row.tasks.length}
                    </span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 border-b pe-2"
                    key={row.task.id}
                    role="listitem"
                    style={{
                      height: ROW_HEIGHT,
                      paddingInlineStart: row.depth ? 36 : 12,
                    }}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-start text-base outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                      onClick={(clickEvent) =>
                        openDetails(row.task, clickEvent.currentTarget)
                      }
                      type="button"
                    >
                      {isMilestone(row.task) && (
                        <DiamondIcon
                          aria-label={labels.milestone}
                          className="size-3.5 shrink-0 text-muted-foreground"
                          role="img"
                        />
                      )}
                      <span className="truncate">{row.task.name}</span>
                    </button>
                    {showDates && (
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                        {formatDate(row.task.start)}
                      </span>
                    )}
                    {showOwner && row.task.assignee && (
                      <Avatar
                        aria-label={row.task.assignee.name}
                        className="[--avatar-size:--spacing(6)]"
                        role="img"
                      >
                        {row.task.assignee.image && (
                          <AvatarImage alt="" src={row.task.assignee.image} />
                        )}
                        <AvatarFallback>
                          {initials(row.task.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ),
              )}
              {editable && (
                <div
                  aria-label={labels.resizeList}
                  aria-orientation="vertical"
                  aria-valuemax={480}
                  aria-valuemin={96}
                  aria-valuenow={width}
                  className="absolute inset-y-0 -end-1.5 z-30 w-3 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:start-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-ring/48 focus-visible:after:bg-ring"
                  onKeyDown={(keyEvent) => {
                    const rtl =
                      getComputedStyle(keyEvent.currentTarget).direction ===
                      "rtl";
                    const delta =
                      keyEvent.key === "ArrowRight"
                        ? 16
                        : keyEvent.key === "ArrowLeft"
                          ? -16
                          : 0;
                    if (!delta) return;
                    keyEvent.preventDefault();
                    setListWidth(
                      Math.min(
                        Math.max(width + (rtl ? -delta : delta), 96),
                        480,
                      ),
                    );
                  }}
                  onPointerDown={startResize}
                  role="separator"
                  tabIndex={0}
                />
              )}
            </div>

            {/* Timeline */}
            <div
              className="relative"
              style={{ height: rows.length * ROW_HEIGHT }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, var(--color-border) 1px, transparent 1px)",
                  backgroundSize:
                    zoom === "day"
                      ? `${dayWidth}px 100%`
                      : zoom === "week"
                        ? `${dayWidth * 7}px 100%`
                        : undefined,
                }}
              >
                {zoom === "month" &&
                  header.bottom.map((cell) => (
                    <div
                      className="absolute inset-y-0 border-s"
                      key={cell.key}
                      style={{ insetInlineStart: cell.x }}
                    />
                  ))}
                {weekendStripes?.map((x) => (
                  <div
                    className="absolute inset-y-0 bg-muted/48"
                    key={x}
                    style={{ insetInlineStart: x, width: dayWidth }}
                  />
                ))}
              </div>
              {/* Dependency lines sit under the bars, so they never cover a task. */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-visible rtl:-scale-x-100"
                height={rows.length * ROW_HEIGHT}
                width={timelineWidth}
              >
                {arrows.map((arrow) => (
                  <g
                    className={
                      arrow.conflict
                        ? "fill-destructive stroke-destructive"
                        : "fill-muted-foreground/64 stroke-muted-foreground/64"
                    }
                    key={arrow.key}
                  >
                    <path
                      className={cn(
                        "fill-none stroke-[1.5]",
                        arrow.conflict && "[stroke-dasharray:4_3]",
                      )}
                      d={arrow.path}
                    />
                    <path className="stroke-0" d={arrow.head} />
                  </g>
                ))}
              </svg>
              {rows.map((row, index) => {
                const top = index * ROW_HEIGHT;
                if (row.type === "group") {
                  const members = row.tasks.map(
                    (task) => preview.get(task.id) ?? task,
                  );
                  const open = !collapsed.includes(row.group.id);
                  const color = resolveEventColor(row.group.color, "gray");
                  const start = members.length
                    ? min(members.map((task) => task.start))
                    : null;
                  const end = members.length
                    ? max(members.map((task) => task.end))
                    : null;
                  return (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 border-b bg-muted/24"
                      key={`group:${row.group.id}`}
                      style={{ ...colorStyle(color), height: ROW_HEIGHT, top }}
                    >
                      {open && start && end && (
                        // Open: a soft band shows the dates the group spans.
                        <div
                          className="absolute inset-y-2.5 rounded-md bg-[color-mix(in_oklab,var(--event-color)_16%,transparent)]"
                          style={{
                            insetInlineStart: xOf(start),
                            width: Math.max(xOf(end) - xOf(start), 4),
                          }}
                        />
                      )}
                      {!open &&
                        // Closed: each task is rolled up into the group row.
                        members.map((task) =>
                          isMilestone(task) ? (
                            <span
                              className="absolute top-1/2 size-2.5 -translate-y-1/2 rotate-45 rounded-[2px] bg-(--task-color) ring-2 ring-background ltr:-translate-x-1/2 rtl:translate-x-1/2"
                              key={task.id}
                              style={
                                {
                                  "--task-color": resolveEventColor(task.color),
                                  insetInlineStart: xOf(task.start),
                                } as React.CSSProperties
                              }
                            />
                          ) : (
                            <span
                              className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-(--task-color) ring-2 ring-background"
                              key={task.id}
                              style={
                                {
                                  "--task-color": resolveEventColor(task.color),
                                  insetInlineStart: xOf(task.start),
                                  width: Math.max(
                                    xOf(task.end) - xOf(task.start),
                                    4,
                                  ),
                                } as React.CSSProperties
                              }
                            />
                          ),
                        )}
                    </div>
                  );
                }
                return (
                  <div
                    key={row.task.id}
                    {...grid.getLaneProps(row.task.id)}
                    className="absolute inset-x-0 border-b"
                    style={{ height: ROW_HEIGHT, top }}
                  >
                    {grid.getSegments(row.task.id).map((segment) => (
                      <TaskBar
                        conflict={conflicts.has(segment.id)}
                        dayWidth={dayWidth}
                        grid={grid}
                        key={segment.id}
                        segment={segment}
                      />
                    ))}
                  </div>
                );
              })}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-destructive ltr:-translate-x-1/2 rtl:translate-x-1/2"
                style={{ insetInlineStart: todayX + dayWidth / 2 }}
              />
            </div>
          </div>
          <div {...grid.getAnnouncerProps()} />
        </div>

        <Popover
          onOpenChange={(open) => {
            if (!open) setDetails(null);
          }}
          open={Boolean(details && detailsTask)}
        >
          {details && detailsTask && (
            <GanttPopup anchor={details.anchor} finalFocus={focusAfter}>
              <TaskDetails
                groups={groups}
                onClose={() => setDetails(null)}
                onDelete={() => deleteTask(detailsTask)}
                onEdit={() => {
                  setDetails(null);
                  openEditor(detailsTask, "edit");
                }}
                task={detailsTask}
                tasks={tasks}
              />
            </GanttPopup>
          )}
        </Popover>

        <Dialog
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          open={Boolean(editor)}
        >
          {editor && (
            <DialogPopup
              finalFocus={focusAfter}
              initialFocus={nameRef}
              key={editor.key}
            >
              <TaskEditor
                groups={groups}
                mode={editor.mode}
                nameRef={nameRef}
                onCancel={() => setEditor(null)}
                onDelete={() => deleteTask(editor.task)}
                onSave={(saved) => {
                  if (editor.mode === "create") {
                    const created = { ...saved, id: createId() };
                    commit([...tasks, created], {
                      task: created,
                      type: "create",
                    });
                  } else {
                    commit(
                      tasks.map((task) =>
                        task.id === saved.id ? saved : task,
                      ),
                      { previous: editor.task, task: saved, type: "update" },
                    );
                  }
                  setEditor(null);
                }}
                task={editor.task}
              />
            </DialogPopup>
          )}
        </Dialog>
      </section>
    </GanttContext.Provider>
  );
}
