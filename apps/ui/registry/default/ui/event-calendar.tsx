"use client";

import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  type Locale,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
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
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import {
  type TimeGridLane,
  type TimeGridSegment,
  type UseTimeGridReturn,
  useTimeGrid,
} from "@/registry/default/hooks/use-time-grid";
import {
  type EventColor,
  eventColorNames,
  eventColors,
  eventSurfaceClassName,
  resolveEventColor,
} from "@/registry/default/lib/event-colors";
import { cn } from "@/registry/default/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/default/ui/avatar";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/registry/default/ui/dialog";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Form } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuTrigger,
} from "@/registry/default/ui/menu";
import { Popover, PopoverPrimitive } from "@/registry/default/ui/popover";
import {
  RadioGroupPrimitive,
  RadioPrimitive,
} from "@/registry/default/ui/radio-group";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/registry/default/ui/segmented-control";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import { Switch } from "@/registry/default/ui/switch";
import { Textarea } from "@/registry/default/ui/textarea";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH_TRACKS = 3;

type Context = {
  calendars: CalendarSource[];
  editable: boolean;
  formatRange: (start: Date, end: Date, allDay?: boolean) => string;
  formatTime: (date: Date) => string;
  /** `true` while an event is being dragged, resized or drawn. */
  interacting: React.RefObject<boolean>;
  isReadOnly: (event: CalendarEvent) => boolean;
  labels: EventCalendarLabels;
  locale?: Locale;
  now: Date;
  openDetails: (event: CalendarEvent, anchor: HTMLElement) => void;
  openEditor: (event: CalendarEvent, mode: "create" | "edit") => void;
  phone: boolean;
  renderEvent?: EventCalendarProps["renderEvent"];
  stepMinutes: number;
  updateEvent: (next: CalendarEvent, previous: CalendarEvent) => void;
};

const CalendarContext = createContext<Context | null>(null);

function useCalendar(): Context {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("Missing EventCalendar context");
  return context;
}

function isAllDayLike(event: CalendarEvent): boolean {
  return (
    Boolean(event.allDay) || event.end.getTime() - event.start.getTime() >= DAY
  );
}

function toDayRange(event: CalendarEvent): { start: Date; end: Date } {
  const start = startOfDay(event.start);
  const last = startOfDay(
    new Date(Math.max(event.end.getTime() - 1, event.start.getTime())),
  );
  return { end: addDays(last, 1), start };
}

/**
 * Whole days for a row of days. Timed events start a few milliseconds after
 * midnight, one per minute of their start time, so a day lists them in time
 * order after the all-day events.
 */
function toDayItem(
  event: CalendarEvent,
): CalendarEvent & { source: CalendarEvent } {
  const range = toDayRange(event);
  const minutes = event.allDay
    ? 0
    : event.start.getHours() * 60 + event.start.getMinutes() + 1;
  return {
    ...event,
    end: range.end,
    source: event,
    start: new Date(range.start.getTime() + minutes),
  };
}

function shiftEventByDays(
  event: CalendarEvent,
  from: { start: Date; end: Date },
  to: { start: Date; end: Date },
): CalendarEvent {
  return {
    ...event,
    end: addDays(event.end, differenceInCalendarDays(to.end, from.end)),
    start: addDays(event.start, differenceInCalendarDays(to.start, from.start)),
  };
}

function roundToDay(time: number): number {
  return startOfDay(addHours(time, 12)).getTime();
}

function hourOf(day: Date, hour: number): Date {
  return addMinutes(startOfDay(day), Math.round(hour * 60));
}

function useEventColor(event: CalendarEvent): string {
  const { calendars } = useCalendar();
  const calendar = calendars.find((entry) => entry.id === event.calendarId);
  return resolveEventColor(event.color ?? calendar?.color);
}

function colorStyle(color: string): React.CSSProperties {
  return { "--event-color": color } as React.CSSProperties;
}

const statusClassName =
  "data-[status=cancelled]:line-through data-[status=cancelled]:opacity-56 data-[status=tentative]:bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--event-color)_12%,var(--background))_0_6px,var(--background)_6px_12px)] data-[status=tentative]:border-dashed";

/**
 * A popover that opens in place next to its anchor, without sliding in from
 * a previous position, and hides while the anchor is scrolled out of view.
 */
function CalendarPopup({
  anchor,
  children,
  className,
  finalFocus,
  side = "bottom",
}: {
  anchor: Element;
  children: React.ReactNode;
  className?: string;
  finalFocus?: React.RefObject<HTMLElement | null>;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align="start"
        anchor={anchor}
        className="z-50 data-anchor-hidden:invisible"
        collisionPadding={8}
        side={side}
        sideOffset={6}
      >
        <PopoverPrimitive.Popup
          className={cn(
            "relative max-h-(--available-height) overflow-y-auto rounded-lg border bg-popover not-dark:bg-clip-padding p-4 text-popover-foreground shadow-lg/5 outline-none transition-[scale,opacity] duration-150 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            "origin-(--transform-origin)",
            className,
          )}
          data-slot="event-calendar-popup"
          finalFocus={finalFocus}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function useNow(fixed?: Date): Date {
  const [now, setNow] = useState(() => fixed ?? new Date());
  useEffect(() => {
    if (fixed) {
      setNow(fixed);
      return;
    }
    const timer = setInterval(() => setNow(new Date()), MINUTE);
    return () => clearInterval(timer);
  }, [fixed]);
  return now;
}

function EventItem({
  grid,
  segment,
  vertical,
  compact,
  chip,
  height = Number.POSITIVE_INFINITY,
  view,
}: {
  grid: UseTimeGridReturn<CalendarEvent & { source?: CalendarEvent }>;
  segment: TimeGridSegment<CalendarEvent & { source?: CalendarEvent }>;
  vertical: boolean;
  compact: boolean;
  chip?: boolean;
  /** Height of the card in pixels, to fit its text. */
  height?: number;
  view: CalendarView;
}) {
  const {
    formatRange,
    formatTime,
    isReadOnly,
    labels,
    openDetails,
    renderEvent,
  } = useCalendar();
  const event = segment.item.source ?? segment.item;
  const color = useEventColor(event);
  const readOnly = isReadOnly(event);
  const gridProps = grid.getItemProps(segment);
  // Read-only events open on click or Enter but cannot be dragged.
  const props = readOnly
    ? {
        ...gridProps,
        "aria-describedby": undefined,
        "aria-roledescription": undefined,
        onKeyDown: undefined,
        onPointerDown: undefined,
      }
    : gridProps;
  // Overlapping events in a day share its width, but each may reach a little
  // over its neighbor, as in most calendars, so titles stay readable.
  const cascade: React.CSSProperties = {};
  if (vertical && segment.tracks > 1) {
    const left = segment.track / segment.tracks;
    const reachesEnd = segment.track + segment.span >= segment.tracks;
    cascade.insetInlineStart = `${left * 100}%`;
    cascade.width = `${
      (reachesEnd
        ? 1 - left
        : Math.min(1 - left, (segment.span / segment.tracks) * 1.7)) * 100
    }%`;
    cascade.zIndex = segment.track + 1;
  }
  if (props["data-dragging"] !== undefined) cascade.zIndex = 30;
  const title = event.title || labels.untitled;
  const time = event.allDay
    ? labels.allDay
    : formatRange(event.start, event.end);
  const content =
    renderEvent?.(event, { compact, view }) ??
    (chip ? (
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-(--event-color)"
        />
        <span className="shrink-0 text-muted-foreground tabular-nums max-sm:hidden">
          {formatTime(event.start)}
        </span>
        <span className="truncate font-medium">{title}</span>
      </span>
    ) : compact ? (
      <span className="truncate">
        <span className="font-medium">{title}</span>
        {!event.allDay && vertical && (
          <span className="text-muted-foreground">
            , {formatTime(event.start)}
          </span>
        )}
      </span>
    ) : (
      <>
        <span
          className={cn(
            "font-medium",
            height < 72 ? "truncate" : "line-clamp-2",
          )}
        >
          {title}
        </span>
        <span className="truncate text-muted-foreground tabular-nums">
          {time}
        </span>
        {event.location && height >= 88 && (
          <span className="truncate text-muted-foreground">
            {event.location}
          </span>
        )}
      </>
    ));

  return (
    <div
      {...props}
      aria-label={`${title}, ${time}${event.location ? `, ${event.location}` : ""}`}
      className={cn(
        "outline-none data-dragging:z-20",
        vertical ? "px-0.5 pb-px" : "px-px py-px",
        "[&:focus-visible>[data-slot=event-surface]]:ring-2 [&:focus-visible>[data-slot=event-surface]]:ring-ring",
        "[&[data-dragging]>[data-slot=event-surface]]:shadow-lg [&[data-refused]>[data-slot=event-surface]]:ring-2 [&[data-refused]>[data-slot=event-surface]]:ring-destructive",
      )}
      data-slot="event-calendar-event"
      onClick={(clickEvent) => {
        openDetails(event, clickEvent.currentTarget);
      }}
      onKeyDown={(keyEvent) => {
        props.onKeyDown?.(keyEvent);
        if (!keyEvent.defaultPrevented && keyEvent.key === "Enter") {
          keyEvent.preventDefault();
          openDetails(event, keyEvent.currentTarget);
        }
      }}
      style={{ ...props.style, ...cascade, ...colorStyle(color) }}
    >
      <div
        className={cn(
          "flex h-full min-w-0 cursor-pointer select-none overflow-hidden text-sm transition-[box-shadow] sm:text-xs",
          chip
            ? "items-center rounded-sm px-1 hover:bg-accent"
            : cn(
                eventSurfaceClassName,
                statusClassName,
                "rounded-md shadow-[0_0_0_1px_var(--background)] hover:bg-[color-mix(in_oklab,var(--event-color)_22%,var(--background))]",
                compact
                  ? "items-center px-1.5 leading-tight"
                  : "flex-col gap-px px-1.5 py-1 leading-snug",
              ),
          segment.startsBefore &&
            (vertical ? "rounded-t-none" : "rounded-s-none border-s"),
          segment.endsAfter && (vertical ? "rounded-b-none" : "rounded-e-none"),
          chip && "data-[status=cancelled]:line-through",
        )}
        data-slot="event-surface"
        data-status={event.status}
      >
        {content}
      </div>
      {!readOnly && !chip && (
        <>
          <div
            {...grid.getResizeHandleProps(segment, "start")}
            className={
              vertical
                ? "absolute inset-x-1 top-0 h-1.5"
                : "absolute inset-y-0 start-0 w-1.5"
            }
          />
          <div
            {...grid.getResizeHandleProps(segment, "end")}
            className={
              vertical
                ? "absolute inset-x-1 bottom-0 h-1.5"
                : "absolute inset-y-0 end-0 w-1.5"
            }
          />
        </>
      )}
    </div>
  );
}

function Draft({
  grid,
  lane,
  vertical,
}: {
  grid: UseTimeGridReturn<CalendarEvent & { source?: CalendarEvent }>;
  lane: string;
  vertical: boolean;
}) {
  const { formatRange } = useCalendar();
  return grid.getDraftSegments(lane).map((segment) => (
    <div
      className={cn(
        "z-10 overflow-hidden rounded-md border-2 border-primary/64 border-dashed bg-primary/8 px-1.5 text-primary text-sm sm:text-xs",
        vertical ? "py-0.5" : "flex items-center",
      )}
      key={segment.lane}
      style={grid.getSegmentStyle(segment)}
    >
      {vertical && grid.draft && !segment.startsBefore
        ? formatRange(grid.draft.start, grid.draft.end)
        : null}
    </div>
  ));
}

function TimeGridView({
  days,
  events,
  dayStartHour,
  dayEndHour,
  workStartHour,
  workEndHour,
  hourHeight,
  hour12,
  onDayClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  dayStartHour: number;
  dayEndHour: number;
  workStartHour: number;
  workEndHour: number;
  hourHeight: number;
  hour12?: boolean;
  onDayClick: (day: Date) => void;
}) {
  const context = useCalendar();
  const {
    editable,
    formatRange,
    labels,
    locale,
    now,
    openEditor,
    stepMinutes,
  } = context;
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = dayEndHour - dayStartHour;
  const columns = `var(--event-calendar-gutter) repeat(${days.length}, minmax(0, 1fr))`;

  const lanes = useMemo(
    (): TimeGridLane[] =>
      days.map((day) => ({
        end: hourOf(day, dayEndHour),
        id: format(day, "yyyy-MM-dd"),
        start: hourOf(day, dayStartHour),
      })),
    [days, dayStartHour, dayEndHour],
  );
  const allDayLane = useMemo(
    (): TimeGridLane[] => [
      {
        end: addDays(days[days.length - 1] as Date, 1),
        id: "all-day",
        start: days[0] as Date,
      },
    ],
    [days],
  );

  const timed = events.filter((event) => !isAllDayLike(event));
  const allDay = events.filter(isAllDayLike).map(toDayItem);

  const update = (next: CalendarEvent, previous: CalendarEvent): void =>
    context.updateEvent(next, previous);

  const grid = useTimeGrid<CalendarEvent & { source?: CalendarEvent }>({
    disabled: !editable,
    formatRange: (start, end) =>
      `${format(start, "EEEE", { locale })}, ${formatRange(start, end)}`,
    getItemLabel: (event) => event.title || labels.untitled,
    instructions: labels.instructions,
    lanes,
    onCreate: (range) =>
      openEditor(
        {
          end: range.end,
          id: "",
          start: range.start,
          title: "",
        },
        "create",
      ),
    onValueChange: (_, details) => {
      const previous = timed.find((event) => event.id === details.item.id);
      if (previous) {
        update(
          { ...previous, end: details.to.end, start: details.to.start },
          previous,
        );
      }
    },
    pickUpKeys: [" "],
    step: stepMinutes * MINUTE,
    value: timed,
  });

  const allDayGrid = useTimeGrid<CalendarEvent & { source?: CalendarEvent }>({
    disabled: !editable,
    formatRange: (start, end) => formatRange(start, end, true),
    getItemLabel: (event) => event.title || labels.untitled,
    instructions: labels.instructions,
    lanes: allDayLane,
    minDuration: DAY,
    onCreate: (range) =>
      openEditor(
        { allDay: true, end: range.end, id: "", start: range.start, title: "" },
        "create",
      ),
    onValueChange: (_, details) => {
      const source = details.item.source;
      if (source) {
        update(shiftEventByDays(source, details.from, details.to), source);
      }
    },
    orientation: "horizontal",
    overlap: "stack",
    pickUpKeys: [" "],
    snap: roundToDay,
    step: DAY,
    value: allDay,
  });

  useEffect(() => {
    context.interacting.current = Boolean(
      grid.active || grid.draft || allDayGrid.active || allDayGrid.draft,
    );
  });

  const allDayTracks = Math.max(
    1,
    ...allDayGrid.getSegments("all-day").map((segment) => segment.track + 1),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only when the view opens or the hours change.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = Math.max(
      0,
      (workStartHour - dayStartHour - 0.5) * hourHeight,
    );
  }, [dayStartHour, hourHeight]);

  const hourMarks = Array.from(
    { length: Math.max(0, Math.ceil(hours) - 1) },
    (_, index) => dayStartHour + index + 1,
  );

  const handleDoubleClick = (
    clickEvent: React.MouseEvent<HTMLElement>,
    lane: TimeGridLane,
  ): void => {
    if (!editable) return;
    if ((clickEvent.target as Element).closest("[data-time-grid-item]")) return;
    const rect = clickEvent.currentTarget.getBoundingClientRect();
    const fraction = (clickEvent.clientY - rect.top) / rect.height;
    const time =
      lane.start.getTime() +
      fraction * (lane.end.getTime() - lane.start.getTime());
    const step = 30 * MINUTE;
    const start = new Date(Math.floor(time / step) * step);
    openEditor({ end: addHours(start, 1), id: "", start, title: "" }, "create");
  };

  return (
    <div
      className="relative min-h-0 flex-1 overflow-y-auto [--event-calendar-gutter:--spacing(14)] sm:[--event-calendar-gutter:--spacing(16)]"
      ref={scrollRef}
    >
      <div className="sticky top-0 z-30 border-b bg-background">
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div />
          {days.map((day) => {
            const today = isSameDay(day, now);
            return (
              <button
                aria-label={format(day, "EEEE, MMMM d", { locale })}
                className="flex min-w-0 flex-col items-center gap-0.5 border-s py-2 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                type="button"
              >
                <span className="text-muted-foreground text-xs uppercase sm:text-[0.6875rem]">
                  {format(day, "EEE", { locale })}
                </span>
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full font-medium text-lg tabular-nums sm:size-7 sm:text-base",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d", { locale })}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid border-t" style={{ gridTemplateColumns: columns }}>
          <div className="flex items-center justify-end pe-2 text-muted-foreground text-xs sm:text-[0.6875rem]">
            {labels.allDay}
          </div>
          <div
            {...allDayGrid.getLaneProps("all-day")}
            className="relative border-s bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px)] [--time-grid-track-size:--spacing(6)]"
            style={{
              backgroundSize: `calc(100% / ${days.length}) 100%`,
              gridColumn: `2 / span ${days.length}`,
              height: `calc(${allDayTracks} * var(--time-grid-track-size) + --spacing(1))`,
            }}
          >
            <Draft grid={allDayGrid} lane="all-day" vertical={false} />
            {allDayGrid.getSegments("all-day").map((segment) => (
              <EventItem
                compact
                grid={allDayGrid}
                key={segment.id}
                segment={segment}
                vertical={false}
                view="week"
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: columns,
          height: hours * hourHeight,
        }}
      >
        <div className="relative">
          {hourMarks.map((hour) => (
            <span
              className="absolute end-2 -translate-y-1/2 whitespace-nowrap text-muted-foreground text-xs tabular-nums sm:text-[0.6875rem]"
              key={hour}
              style={{ top: (hour - dayStartHour) * hourHeight }}
            >
              {format(
                hourOf(days[0] as Date, hour),
                hour12 === false ? "HH:mm" : "h a",
                { locale },
              )}
            </span>
          ))}
        </div>
        {lanes.map((lane, index) => {
          const day = days[index] as Date;
          const today = isSameDay(day, now);
          const length = lane.end.getTime() - lane.start.getTime();
          const nowOffset = (now.getTime() - lane.start.getTime()) / length;
          const workStart = Math.min(
            Math.max(workStartHour - dayStartHour, 0),
            hours,
          );
          const workEnd = Math.min(
            Math.max(workEndHour - dayStartHour, 0),
            hours,
          );
          return (
            <div
              key={lane.id}
              {...grid.getLaneProps(lane.id)}
              aria-label={format(day, "EEEE, MMMM d", { locale })}
              className="relative border-s"
              onDoubleClick={(clickEvent) =>
                handleDoubleClick(clickEvent, lane)
              }
              role="group"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                backgroundSize: `100% ${hourHeight}px`,
              }}
            >
              {isWeekend(day) ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-muted/40"
                />
              ) : (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 bg-muted/40"
                    style={{ height: workStart * hourHeight }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-muted/40"
                    style={{ height: (hours - workEnd) * hourHeight }}
                  />
                </>
              )}
              <Draft grid={grid} lane={lane.id} vertical />
              {grid.getSegments(lane.id).map((segment) => {
                const minutes =
                  (segment.end.getTime() - segment.start.getTime()) / MINUTE;
                return (
                  <EventItem
                    compact={(minutes / 60) * hourHeight < 40}
                    height={(minutes / 60) * hourHeight}
                    grid={grid}
                    key={`${segment.id}:${segment.lane}`}
                    segment={segment}
                    vertical
                    view="week"
                  />
                );
              })}
              {today && nowOffset >= 0 && nowOffset <= 1 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-destructive before:absolute before:-start-1 before:-top-1 before:size-2.5 before:rounded-full before:bg-destructive"
                  style={{ top: `${nowOffset * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div {...grid.getAnnouncerProps()} />
      <div {...allDayGrid.getAnnouncerProps()} />
    </div>
  );
}

function MonthView({
  date,
  events,
  weekStartsOn,
  onDayClick,
}: {
  date: Date;
  events: CalendarEvent[];
  weekStartsOn: NonNullable<EventCalendarProps["weekStartsOn"]>;
  onDayClick: (day: Date) => void;
}) {
  const context = useCalendar();
  const { editable, formatRange, labels, locale, now, openEditor, phone } =
    context;
  const [more, setMore] = useState<{ day: Date; anchor: HTMLElement } | null>(
    null,
  );
  const gridStart = startOfWeek(startOfMonth(date), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(date), { weekStartsOn });
  const weekCount = Math.round(
    (differenceInCalendarDays(gridEnd, gridStart) + 1) / 7,
  );
  const gridStartTime = gridStart.getTime();
  const lanes = useMemo(
    (): TimeGridLane[] =>
      Array.from({ length: weekCount }, (_, index) => ({
        end: addDays(new Date(gridStartTime), index * 7 + 7),
        id: `week-${index}`,
        start: addDays(new Date(gridStartTime), index * 7),
      })),
    [gridStartTime, weekCount],
  );
  const items = events.map(toDayItem);

  const grid = useTimeGrid<CalendarEvent & { source?: CalendarEvent }>({
    disabled: !editable,
    formatRange: (start, end) => formatRange(start, end, true),
    getItemLabel: (event) => event.title || labels.untitled,
    instructions: labels.instructions,
    lanes,
    minDuration: DAY,
    onCreate: (range) =>
      openEditor(
        { allDay: true, end: range.end, id: "", start: range.start, title: "" },
        "create",
      ),
    onValueChange: (_, details) => {
      const source = details.item.source;
      if (source) {
        context.updateEvent(
          shiftEventByDays(source, details.from, details.to),
          source,
        );
      }
    },
    orientation: "horizontal",
    overlap: "stack",
    pickUpKeys: [" "],
    snap: roundToDay,
    step: DAY,
    value: items,
  });

  useEffect(() => {
    context.interacting.current = Boolean(grid.active || grid.draft);
  });

  const dayEvents = (day: Date): CalendarEvent[] =>
    events
      .filter(
        (event) =>
          event.start < addDays(startOfDay(day), 1) &&
          toDayRange(event).end > startOfDay(day),
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }, (_, index) => addDays(gridStart, index)).map(
          (day) => (
            <div
              className="px-2 py-1.5 text-muted-foreground text-xs uppercase sm:text-[0.6875rem]"
              key={day.toISOString()}
            >
              {format(day, "EEE", { locale })}
            </div>
          ),
        )}
      </div>
      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        style={{
          gridTemplateRows: `repeat(${weekCount}, minmax(8.5rem, 1fr))`,
        }}
      >
        {lanes.map((lane) => {
          const segments = grid.getSegments(lane.id);
          return (
            <div className="relative border-b last:border-b-0" key={lane.id}>
              <div className="grid h-full grid-cols-7">
                {Array.from({ length: 7 }, (_, index) =>
                  addDays(lane.start, index),
                ).map((day, index) => {
                  const hidden = segments.filter((segment) => {
                    const first = differenceInCalendarDays(
                      segment.start,
                      lane.start,
                    );
                    const last =
                      differenceInCalendarDays(segment.end, lane.start) - 1;
                    return (
                      segment.track >= MONTH_TRACKS &&
                      first <= index &&
                      index <= last
                    );
                  }).length;
                  const outside = !isSameMonth(day, date);
                  return (
                    <div
                      className={cn(
                        "relative border-s p-1 first:border-s-0",
                        outside && "bg-muted/32",
                      )}
                      key={day.toISOString()}
                    >
                      <button
                        aria-label={format(day, "EEEE, MMMM d", { locale })}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-sm tabular-nums outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:size-6 sm:text-xs",
                          outside && "text-muted-foreground/72",
                          isSameDay(day, now) &&
                            "bg-primary font-medium text-primary-foreground hover:bg-primary/90",
                        )}
                        onClick={() => onDayClick(day)}
                        type="button"
                      >
                        {format(day, "d", { locale })}
                      </button>
                      {hidden > 0 && (
                        <button
                          aria-label={`${labels.more(hidden)}, ${format(day, "EEEE, MMMM d", { locale })}`}
                          className="absolute start-1 bottom-1 z-10 rounded-sm px-1 font-medium text-muted-foreground text-sm outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-xs"
                          onClick={(clickEvent) =>
                            setMore({ anchor: clickEvent.currentTarget, day })
                          }
                          type="button"
                        >
                          {phone ? `+${hidden}` : labels.more(hidden)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div
                {...grid.getLaneProps(lane.id)}
                className="absolute inset-x-0 top-9 bottom-6 [--time-grid-track-size:--spacing(6)] sm:top-8 sm:[--time-grid-track-size:--spacing(5.5)]"
              >
                <Draft grid={grid} lane={lane.id} vertical={false} />
                {segments
                  .filter((segment) => segment.track < MONTH_TRACKS)
                  .map((segment) => {
                    const event = segment.item.source ?? segment.item;
                    return (
                      <EventItem
                        chip={!isAllDayLike(event)}
                        compact
                        grid={grid}
                        key={`${segment.id}:${segment.lane}`}
                        segment={segment}
                        vertical={false}
                        view="month"
                      />
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
      <Popover
        onOpenChange={(open) => {
          if (!open) setMore(null);
        }}
        open={Boolean(more)}
      >
        {more && (
          <CalendarPopup anchor={more.anchor} className="w-72">
            <p className="mb-2 font-medium text-sm">
              {format(more.day, "EEEE, MMMM d", { locale })}
            </p>
            <ul className="flex flex-col gap-1">
              {dayEvents(more.day).map((event) => (
                <li key={event.id}>
                  <AgendaRow compact event={event} />
                </li>
              ))}
            </ul>
          </CalendarPopup>
        )}
      </Popover>
      <div {...grid.getAnnouncerProps()} />
    </div>
  );
}

function AgendaRow({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  const { formatRange, labels, openDetails } = useCalendar();
  const color = useEventColor(event);
  const time = event.allDay
    ? labels.allDay
    : formatRange(event.start, event.end);
  return (
    <button
      className="flex w-full min-w-0 items-start gap-3 rounded-md px-2 py-1.5 text-start text-base outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[status=cancelled]:line-through data-[status=cancelled]:opacity-56 sm:text-sm"
      data-status={event.status}
      onClick={(clickEvent) => openDetails(event, clickEvent.currentTarget)}
      style={colorStyle(color)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 size-2.5 shrink-0 rounded-full bg-(--event-color)",
          event.status === "tentative" &&
            "border-(--event-color) border-2 bg-transparent",
        )}
      />
      {!compact && (
        <span className="w-44 shrink-0 text-muted-foreground tabular-nums">
          {time}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {event.title || labels.untitled}
        </span>
        {compact && (
          <span className="block truncate text-muted-foreground tabular-nums">
            {time}
          </span>
        )}
        {event.location && (
          <span className="block truncate text-muted-foreground">
            {event.location}
          </span>
        )}
      </span>
    </button>
  );
}

function AgendaView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const { labels, locale, now } = useCalendar();
  const start = startOfMonth(date);
  const days = Array.from(
    { length: differenceInCalendarDays(endOfMonth(date), start) + 1 },
    (_, index) => addDays(start, index),
  )
    .map((day) => ({
      day,
      events: events
        .filter(
          (event) =>
            event.start < addDays(day, 1) && toDayRange(event).end > day,
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    }))
    .filter((entry) => entry.events.length > 0);

  if (days.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <CalendarDaysIcon aria-hidden="true" className="size-6 opacity-64" />
        <p className="text-base sm:text-sm">{labels.noEvents}</p>
      </div>
    );
  }

  return (
    <ol className="min-h-0 flex-1 overflow-y-auto">
      {days.map(({ day, events: list }) => (
        <li
          className="grid gap-1 border-b px-2 py-3 last:border-b-0 sm:grid-cols-[7rem_1fr] sm:gap-4 sm:px-4"
          key={day.toISOString()}
        >
          <div className="flex items-baseline gap-2 px-2 sm:flex-col sm:gap-0 sm:px-0">
            <span
              className={cn(
                "font-heading font-semibold text-2xl tabular-nums sm:text-xl",
                isSameDay(day, now) && "text-primary",
              )}
            >
              {format(day, "d", { locale })}
            </span>
            <span className="text-muted-foreground text-sm uppercase sm:text-xs">
              {format(day, "EEE, MMM", { locale })}
            </span>
          </div>
          <ul className="flex min-w-0 flex-col">
            {list.map((event) => (
              <li key={event.id}>
                <AgendaRow event={event} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function EventDetails({
  event,
  onClose,
  onDelete,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { calendars, formatRange, isReadOnly, labels, openEditor } =
    useCalendar();
  const editable = !isReadOnly(event);
  const color = useEventColor(event);
  const calendar = calendars.find((entry) => entry.id === event.calendarId);
  const range = event.allDay
    ? `${formatRange(event.start, addDays(event.end, -1), true)}, ${labels.allDay}`
    : formatRange(event.start, event.end);

  return (
    <div className="flex flex-col gap-3" style={colorStyle(color)}>
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="mt-1.5 size-3 shrink-0 rounded-sm bg-(--event-color)"
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-heading font-semibold text-lg leading-snug",
              event.status === "cancelled" && "line-through",
            )}
          >
            {event.title || labels.untitled}
          </p>
          <p className="text-muted-foreground text-sm">{range}</p>
        </div>
        <div className="-me-2 -mt-1 flex shrink-0">
          {editable && (
            <>
              <Button
                aria-label={labels.edit}
                onClick={() => {
                  onClose();
                  openEditor(event, "edit");
                }}
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
      {event.status && event.status !== "confirmed" && (
        <Badge
          className="self-start"
          variant={event.status === "cancelled" ? "error" : "warning"}
        >
          {labels[event.status]}
        </Badge>
      )}
      <dl className="flex flex-col gap-2 text-sm">
        {event.location && (
          <div className="flex items-start gap-2">
            <dt>
              <MapPinIcon
                aria-label={labels.location}
                className="mt-0.5 size-4 text-muted-foreground"
                role="img"
              />
            </dt>
            <dd className="min-w-0">{event.location}</dd>
          </div>
        )}
        {calendar && (
          <div className="flex items-start gap-2">
            <dt>
              <CalendarDaysIcon
                aria-label={labels.calendar}
                className="mt-0.5 size-4 text-muted-foreground"
                role="img"
              />
            </dt>
            <dd className="min-w-0">{calendar.name}</dd>
          </div>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-start gap-2">
            <dt>
              <UsersIcon
                aria-label="Guests"
                className="mt-0.5 size-4 text-muted-foreground"
                role="img"
              />
            </dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
              {event.attendees.map((person) => (
                <span className="flex items-center gap-2" key={person.name}>
                  <Avatar className="[--avatar-size:--spacing(6)]">
                    {person.image && <AvatarImage alt="" src={person.image} />}
                    <AvatarFallback>
                      {person.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {person.name}
                </span>
              ))}
            </dd>
          </div>
        )}
        {event.description && (
          <div className="flex items-start gap-2">
            <dt>
              <ListFilterIcon
                aria-label={labels.description}
                className="mt-0.5 size-4 text-muted-foreground"
                role="img"
              />
            </dt>
            <dd className="min-w-0 whitespace-pre-wrap text-muted-foreground">
              {event.description}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function EventEditor({
  event,
  mode,
  onCancel,
  onDelete,
  onSave,
  titleRef,
}: {
  event: CalendarEvent;
  mode: "create" | "edit";
  onCancel: () => void;
  onDelete: () => void;
  onSave: (event: CalendarEvent) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { calendars: allCalendars, labels } = useCalendar();
  const calendars = allCalendars.filter((calendar) => !calendar.readOnly);
  const id = useId();
  const [title, setTitle] = useState(event.title);
  const [allDay, setAllDay] = useState(Boolean(event.allDay));
  const [startDate, setStartDate] = useState(format(event.start, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(event.start, "HH:mm"));
  const lastDay = event.allDay ? addDays(event.end, -1) : event.end;
  const [endDate, setEndDate] = useState(format(lastDay, "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState(format(event.end, "HH:mm"));
  const [calendarId, setCalendarId] = useState(
    event.calendarId ?? calendars[0]?.id ?? "",
  );
  const [color, setColor] = useState(event.color ?? "");
  const [status, setStatus] = useState<CalendarEventStatus>(
    event.status ?? "confirmed",
  );
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [error, setError] = useState("");

  const calendarItems = calendars.map((calendar) => ({
    label: calendar.name,
    value: calendar.id,
  }));
  const statusItems: { label: string; value: CalendarEventStatus }[] = [
    { label: labels.confirmed, value: "confirmed" },
    { label: labels.tentative, value: "tentative" },
    { label: labels.cancelled, value: "cancelled" },
  ];

  const save = (): void => {
    const start = allDay
      ? parse(startDate, "yyyy-MM-dd", new Date())
      : parse(`${startDate} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
    const end = allDay
      ? addDays(parse(endDate, "yyyy-MM-dd", new Date()), 1)
      : parse(`${endDate} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Enter a valid date and time.");
      return;
    }
    if (end <= start) {
      setError("The end must be after the start.");
      return;
    }
    onSave({
      ...event,
      allDay: allDay || undefined,
      calendarId: calendarId || undefined,
      color: color || undefined,
      description: description || undefined,
      end,
      location: location || undefined,
      start,
      status: status === "confirmed" ? undefined : status,
      title: title.trim(),
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? labels.newEvent : labels.editEvent}
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
            <FieldLabel>{labels.title}</FieldLabel>
            <Input
              ref={titleRef}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder={labels.untitled}
              type="text"
              value={title}
            />
          </Field>
          <Label>
            <Switch checked={allDay} onCheckedChange={setAllDay} />
            {labels.allDay}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{labels.starts}</FieldLabel>
              <Input
                onChange={(changeEvent) =>
                  setStartDate(changeEvent.target.value)
                }
                type="date"
                value={startDate}
              />
            </Field>
            {!allDay && (
              <Field>
                <FieldLabel className="max-sm:sr-only sm:invisible">
                  {labels.starts}
                </FieldLabel>
                <Input
                  aria-label={`${labels.starts}, time`}
                  onChange={(changeEvent) =>
                    setStartTime(changeEvent.target.value)
                  }
                  step={300}
                  type="time"
                  value={startTime}
                />
              </Field>
            )}
            <Field>
              <FieldLabel>{labels.ends}</FieldLabel>
              <Input
                onChange={(changeEvent) => setEndDate(changeEvent.target.value)}
                type="date"
                value={endDate}
              />
            </Field>
            {!allDay && (
              <Field>
                <FieldLabel className="max-sm:sr-only sm:invisible">
                  {labels.ends}
                </FieldLabel>
                <Input
                  aria-label={`${labels.ends}, time`}
                  onChange={(changeEvent) =>
                    setEndTime(changeEvent.target.value)
                  }
                  step={300}
                  type="time"
                  value={endTime}
                />
              </Field>
            )}
          </div>
          {error && (
            <p className="text-destructive-foreground text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {calendars.length > 0 && (
              <Field>
                <FieldLabel>{labels.calendar}</FieldLabel>
                <Select
                  items={calendarItems}
                  onValueChange={(value) => setCalendarId(String(value))}
                  value={calendarId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2.5 rounded-full"
                            style={{
                              background: resolveEventColor(calendar.color),
                            }}
                          />
                          {calendar.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel>{labels.status}</FieldLabel>
              <Select
                items={statusItems}
                onValueChange={(value) =>
                  setStatus(value as CalendarEventStatus)
                }
                value={status}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          </div>
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
              {[...(calendars.length > 0 ? [""] : []), ...eventColorNames].map(
                (name) => (
                  <RadioPrimitive.Root
                    aria-label={name || labels.useCalendarColor}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:border-foreground sm:size-7"
                    key={name || "calendar"}
                    value={name}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-white sm:size-5",
                        !name &&
                          "bg-[conic-gradient(var(--color-blue-500),var(--color-emerald-500),var(--color-amber-500),var(--color-rose-500),var(--color-blue-500))]",
                      )}
                      style={
                        name
                          ? { background: eventColors[name as EventColor] }
                          : undefined
                      }
                    >
                      <RadioPrimitive.Indicator>
                        <CheckIcon aria-hidden="true" className="size-3.5" />
                      </RadioPrimitive.Indicator>
                    </span>
                  </RadioPrimitive.Root>
                ),
              )}
            </RadioGroupPrimitive>
          </div>
          <Field>
            <FieldLabel>{labels.location}</FieldLabel>
            <Input
              onChange={(changeEvent) => setLocation(changeEvent.target.value)}
              type="text"
              value={location}
            />
          </Field>
          <Field>
            <FieldLabel>{labels.description}</FieldLabel>
            <Textarea
              onChange={(changeEvent) =>
                setDescription(changeEvent.target.value)
              }
              value={description}
            />
          </Field>
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

export type CalendarView = "day" | "week" | "month" | "agenda";

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export type CalendarAttendee = { name: string; image?: string };

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  /** Exclusive end. For all-day events, the midnight after the last day. */
  end: Date;
  allDay?: boolean;
  /** Id of the calendar the event belongs to. */
  calendarId?: string;
  /** A color name such as `"green"`, or any CSS color. */
  color?: EventColor | (string & {});
  location?: string;
  description?: string;
  status?: CalendarEventStatus;
  attendees?: CalendarAttendee[];
  /** This event cannot be moved, edited or deleted, for example an invite. */
  readOnly?: boolean;
};

export type CalendarSource = {
  id: string;
  name: string;
  color: EventColor | (string & {});
  /** Events of this calendar cannot be moved, edited or deleted. */
  readOnly?: boolean;
};

export type EventCalendarChange = {
  type: "create" | "update" | "delete";
  event: CalendarEvent;
  /** The event before an update. */
  previous?: CalendarEvent;
};

export const eventCalendarLabels = {
  agenda: "Agenda",
  allDay: "All day",
  calendar: "Calendar",
  calendars: "Calendars",
  cancel: "Cancel",
  cancelled: "Cancelled",
  close: "Close",
  color: "Color",
  confirmed: "Confirmed",
  day: "Day",
  delete: "Delete",
  description: "Description",
  edit: "Edit",
  editEvent: "Edit event",
  ends: "Ends",
  instructions:
    "Press Enter to open an event. Press Space to pick it up, then use the arrow keys to move it. Hold Shift to change its end, or Alt to change its start. Press Space to drop it, or Escape to cancel.",
  location: "Location",
  month: "Month",
  more: (count: number): string => `${count} more`,
  newEvent: "New event",
  next: "Next",
  noEvents: "No events",
  previous: "Previous",
  save: "Save",
  starts: "Starts",
  status: "Status",
  tentative: "Tentative",
  title: "Title",
  today: "Today",
  untitled: "(No title)",
  useCalendarColor: "Calendar color",
  view: "View",
  week: "Week",
};

export type EventCalendarLabels = typeof eventCalendarLabels;

export type EventCalendarProps = {
  /** Events to show. Controlled. */
  events?: CalendarEvent[];
  /** Initial events when uncontrolled. */
  defaultEvents?: CalendarEvent[];
  /** Called after every create, update or delete. */
  onEventsChange?: (
    events: CalendarEvent[],
    change: EventCalendarChange,
  ) => void;
  /** Calendars events can belong to. Each gives its events a color. */
  calendars?: CalendarSource[];
  /** Ids of calendars whose events are hidden. Controlled. */
  hiddenCalendars?: string[];
  defaultHiddenCalendars?: string[];
  onHiddenCalendarsChange?: (hidden: string[]) => void;
  view?: CalendarView;
  defaultView?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  /** Views offered in the switcher. */
  views?: CalendarView[];
  /** The date the calendar shows. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /**
   * Called with the dates on screen whenever they change, for example to
   * load events from a synced calendar. `end` is exclusive.
   */
  onRangeChange?: (range: {
    start: Date;
    end: Date;
    view: CalendarView;
  }) => void;
  /** First day of the week, 0 for Sunday. Defaults to 1, Monday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Show Monday to Friday only in the week view. */
  hideWeekends?: boolean;
  /** First and last hour shown in day and week views. */
  dayStartHour?: number;
  dayEndHour?: number;
  /** Working hours. Hours outside them are shaded. */
  workStartHour?: number;
  workEndHour?: number;
  /** Height of one hour in pixels. Defaults to 48. */
  hourHeight?: number;
  /** Snap step in minutes. Defaults to 15. */
  stepMinutes?: number;
  /** `true` for 3:00 PM, `false` for 15:00. Defaults to the locale. */
  hour12?: boolean;
  locale?: Locale;
  /** Fixes the current time, for example in tests and demos. */
  now?: Date;
  /** Allow creating, moving, resizing, editing and deleting. Defaults to `true`. */
  editable?: boolean;
  labels?: Partial<EventCalendarLabels>;
  /** Replace the content of an event card. */
  renderEvent?: (
    event: CalendarEvent,
    context: { compact: boolean; view: CalendarView },
  ) => React.ReactNode;
  /** Id for new events. Defaults to a random id. */
  createId?: () => string;
  className?: string;
};

/**
 * A calendar with day, week, month and agenda views. Events can be dragged,
 * resized, drawn, opened, edited and deleted by mouse, touch and keyboard.
 */
export function EventCalendar({
  events: eventsProp,
  defaultEvents,
  onEventsChange,
  calendars = [],
  hiddenCalendars: hiddenCalendarsProp,
  defaultHiddenCalendars,
  onHiddenCalendarsChange,
  view: viewProp,
  defaultView = "week",
  onViewChange,
  views = ["day", "week", "month", "agenda"],
  date: dateProp,
  defaultDate,
  onDateChange,
  onRangeChange,
  weekStartsOn = 1,
  hideWeekends = false,
  dayStartHour = 0,
  dayEndHour = 24,
  workStartHour = 9,
  workEndHour = 17,
  hourHeight = 48,
  stepMinutes = 15,
  hour12,
  locale,
  now: nowProp,
  editable = true,
  labels: labelsProp,
  renderEvent,
  createId = (): string =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  className,
}: EventCalendarProps): React.ReactElement {
  const labels = { ...eventCalendarLabels, ...labelsProp };
  const now = useNow(nowProp);
  const phone = useMediaQuery("max-sm");
  const [uncontrolledEvents, setUncontrolledEvents] = useState(
    defaultEvents ?? [],
  );
  const events = eventsProp ?? uncontrolledEvents;
  const [uncontrolledView, setUncontrolledView] = useState(defaultView);
  const view = viewProp ?? uncontrolledView;
  const [uncontrolledDate, setUncontrolledDate] = useState(
    () => defaultDate ?? nowProp ?? new Date(),
  );
  const date = dateProp ?? uncontrolledDate;
  const [uncontrolledHidden, setUncontrolledHidden] = useState<string[]>(
    defaultHiddenCalendars ?? [],
  );
  const hidden = hiddenCalendarsProp ?? uncontrolledHidden;
  const setHidden = (next: string[]): void => {
    if (hiddenCalendarsProp === undefined) setUncontrolledHidden(next);
    onHiddenCalendarsChange?.(next);
  };
  const [details, setDetails] = useState<{
    event: CalendarEvent;
    anchor: HTMLElement;
  } | null>(null);
  const [editor, setEditor] = useState<{
    event: CalendarEvent;
    mode: "create" | "edit";
    key: number;
  } | null>(null);
  const editorKey = useRef(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const interacting = useRef(false);
  const focusAfter = useRef<HTMLElement | null>(null);

  const setView = (next: CalendarView): void => {
    if (viewProp === undefined) setUncontrolledView(next);
    onViewChange?.(next);
  };
  const setDate = (next: Date): void => {
    if (dateProp === undefined) setUncontrolledDate(next);
    onDateChange?.(next);
  };
  const commit = (next: CalendarEvent[], change: EventCalendarChange): void => {
    if (eventsProp === undefined) setUncontrolledEvents(next);
    onEventsChange?.(next, change);
  };

  const timeFormat = hour12 === false ? "HH:mm" : hour12 ? "h:mm a" : "p";
  const formatTime = (value: Date): string =>
    format(value, timeFormat, { locale });
  const formatRange = (start: Date, end: Date, allDay?: boolean): string => {
    if (allDay) {
      const last = addDays(end, -1);
      return isSameDay(start, last) || last < start
        ? format(start, "EEE, MMM d", { locale })
        : `${format(start, "MMM d", { locale })} – ${format(last, "MMM d", { locale })}`;
    }
    const sameDay = isSameDay(start, end);
    return sameDay
      ? `${formatTime(start)} – ${formatTime(end)}`
      : `${format(start, "MMM d", { locale })}, ${formatTime(start)} – ${format(end, "MMM d", { locale })}, ${formatTime(end)}`;
  };

  const visibleEvents = events.filter(
    (event) => !event.calendarId || !hidden.includes(event.calendarId),
  );

  const days = useMemo((): Date[] => {
    if (view === "day") return [startOfDay(date)];
    if (phone) {
      return Array.from({ length: 3 }, (_, index) =>
        addDays(startOfDay(date), index),
      );
    }
    const start = startOfWeek(date, { weekStartsOn });
    return Array.from({ length: 7 }, (_, index) =>
      addDays(start, index),
    ).filter((day) => !hideWeekends || !isWeekend(day));
  }, [view, date, phone, weekStartsOn, hideWeekends]);

  const step = (direction: 1 | -1): void => {
    if (view === "day") setDate(addDays(date, direction));
    else if (view === "week")
      setDate(addDays(date, direction * (phone ? 3 : 7)));
    else setDate(addMonths(date, direction));
  };

  const range = useMemo((): { start: Date; end: Date } => {
    if (view === "day" || view === "week") {
      return {
        end: addDays(days[days.length - 1] as Date, 1),
        start: days[0] as Date,
      };
    }
    if (view === "month") {
      return {
        end: addDays(endOfWeek(endOfMonth(date), { weekStartsOn }), 1),
        start: startOfWeek(startOfMonth(date), { weekStartsOn }),
      };
    }
    return { end: addDays(endOfMonth(date), 1), start: startOfMonth(date) };
  }, [view, days, date, weekStartsOn]);

  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  useEffect(() => {
    onRangeChangeRef.current?.({
      end: new Date(rangeEnd),
      start: new Date(rangeStart),
      view,
    });
  }, [rangeStart, rangeEnd, view]);

  // Two-finger swipes on a trackpad and finger swipes on a phone move to the
  // previous or next period, unless an event is being dragged.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    let total = 0;
    let locked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (wheelEvent: WheelEvent): void => {
      if (
        interacting.current ||
        Math.abs(wheelEvent.deltaX) <= Math.abs(wheelEvent.deltaY)
      ) {
        return;
      }
      wheelEvent.preventDefault();
      clearTimeout(timer);
      timer = setTimeout(() => {
        total = 0;
        locked = false;
      }, 200);
      if (locked) return;
      total += wheelEvent.deltaX;
      if (Math.abs(total) < 80) return;
      const rtl = getComputedStyle(element).direction === "rtl";
      stepRef.current(total > 0 !== rtl ? 1 : -1);
      total = 0;
      locked = true;
    };
    let touch: { x: number; y: number; time: number; dragged: boolean } | null =
      null;
    const onTouchStart = (touchEvent: TouchEvent): void => {
      const point = touchEvent.touches[0];
      const inHeader = (touchEvent.target as Element).closest?.("header");
      touch =
        touchEvent.touches.length === 1 && point && !inHeader
          ? {
              dragged: false,
              time: Date.now(),
              x: point.clientX,
              y: point.clientY,
            }
          : null;
    };
    const onTouchMove = (): void => {
      if (touch && interacting.current) touch.dragged = true;
    };
    const onTouchEnd = (touchEvent: TouchEvent): void => {
      const start = touch;
      touch = null;
      const point = touchEvent.changedTouches[0];
      if (!start || !point || start.dragged || interacting.current) return;
      const dx = point.clientX - start.x;
      const dy = point.clientY - start.y;
      if (
        Math.abs(dx) < 60 ||
        Math.abs(dx) < 1.5 * Math.abs(dy) ||
        Date.now() - start.time > 700
      ) {
        return;
      }
      const rtl = getComputedStyle(element).direction === "rtl";
      stepRef.current(dx < 0 !== rtl ? 1 : -1);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", onTouchEnd);
    return () => {
      clearTimeout(timer);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const title = (() => {
    if (view === "day") return format(date, "EEEE, MMMM d, yyyy", { locale });
    if (view === "week") {
      const first = days[0] as Date;
      const last = days[days.length - 1] as Date;
      if (phone) {
        return `${format(first, "MMM d", { locale })} – ${format(last, isSameMonth(first, last) ? "d" : "MMM d", { locale })}`;
      }
      if (isSameMonth(first, last)) {
        return `${format(first, "MMMM d", { locale })} – ${format(last, "d, yyyy", { locale })}`;
      }
      return `${format(first, "MMM d", { locale })} – ${format(last, "MMM d, yyyy", { locale })}`;
    }
    return format(date, "MMMM yyyy", { locale });
  })();

  const openDetails = (event: CalendarEvent, anchor: HTMLElement): void => {
    focusAfter.current = anchor;
    setDetails({ anchor, event });
  };
  const openEditor = (event: CalendarEvent, mode: "create" | "edit"): void => {
    editorKey.current += 1;
    if (!focusAfter.current || mode === "create") {
      focusAfter.current = document.activeElement as HTMLElement | null;
    }
    setEditor({
      event: {
        ...event,
        calendarId: event.calendarId ?? calendars[0]?.id,
      },
      key: editorKey.current,
      mode,
    });
  };
  const deleteEvent = (event: CalendarEvent): void => {
    commit(
      events.filter((entry) => entry.id !== event.id),
      { event, type: "delete" },
    );
    setDetails(null);
    setEditor(null);
  };
  const updateEvent = (next: CalendarEvent, previous: CalendarEvent): void => {
    commit(
      events.map((entry) => (entry.id === previous.id ? next : entry)),
      { event: next, previous, type: "update" },
    );
  };

  const isReadOnly = (event: CalendarEvent): boolean =>
    !editable ||
    Boolean(event.readOnly) ||
    Boolean(
      calendars.find((calendar) => calendar.id === event.calendarId)?.readOnly,
    );

  const context: Context = {
    calendars,
    editable,
    formatRange,
    formatTime,
    interacting,
    isReadOnly,
    labels,
    locale,
    now,
    openDetails,
    openEditor,
    phone,
    renderEvent,
    stepMinutes,
    updateEvent,
  };

  const goToDay = (day: Date): void => {
    setDate(day);
    if (views.includes("day")) setView("day");
  };

  const newEvent = (): void => {
    const base = view === "day" || view === "week" ? date : now;
    const start = isSameDay(base, now)
      ? new Date(Math.ceil(now.getTime() / HOUR) * HOUR)
      : hourOf(base, workStartHour);
    openEditor({ end: addHours(start, 1), id: "", start, title: "" }, "create");
  };

  const viewLabel = (entry: CalendarView): string => labels[entry];
  const detailsEvent = details
    ? (events.find((event) => event.id === details.event.id) ?? null)
    : null;

  return (
    <CalendarContext.Provider value={context}>
      <section
        aria-label={title}
        className={cn(
          "flex h-[44rem] min-h-0 flex-col overflow-hidden overscroll-x-none rounded-xl border bg-background text-foreground",
          className,
        )}
        data-slot="event-calendar"
        ref={sectionRef}
      >
        <header className="flex flex-wrap items-center gap-2 border-b p-2 sm:px-3">
          <div className="flex items-center gap-1">
            {!phone && (
              <Button
                onClick={() => setDate(nowProp ?? new Date())}
                variant="outline"
              >
                {labels.today}
              </Button>
            )}
            <Button
              aria-label={labels.previous}
              onClick={() => step(-1)}
              size="icon-sm"
              variant="ghost"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              aria-label={labels.next}
              onClick={() => step(1)}
              size="icon-sm"
              variant="ghost"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
          <h2
            aria-live="polite"
            className="min-w-0 flex-1 truncate px-1 font-heading font-semibold text-lg max-sm:order-first max-sm:min-w-[60%] sm:px-0 sm:text-base"
          >
            {title}
          </h2>
          {phone && (
            <Button
              className="order-first"
              onClick={() => setDate(nowProp ?? new Date())}
              variant="outline"
            >
              {labels.today}
            </Button>
          )}
          <div className="ms-auto flex items-center gap-1 sm:ms-0 sm:gap-2">
            {calendars.length > 0 && (
              <Menu>
                <MenuTrigger
                  render={
                    <Button
                      aria-label={labels.calendars}
                      size="icon"
                      variant="outline"
                    />
                  }
                >
                  <ListFilterIcon aria-hidden="true" />
                </MenuTrigger>
                <MenuPopup align="end">
                  <MenuGroup>
                    <MenuGroupLabel>{labels.calendars}</MenuGroupLabel>
                    {calendars.map((calendar) => (
                      <MenuCheckboxItem
                        checked={!hidden.includes(calendar.id)}
                        key={calendar.id}
                        onCheckedChange={(checked) =>
                          setHidden(
                            checked
                              ? hidden.filter((id) => id !== calendar.id)
                              : [...hidden, calendar.id],
                          )
                        }
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2.5 rounded-full"
                            style={{
                              background: resolveEventColor(calendar.color),
                            }}
                          />
                          {calendar.name}
                        </span>
                      </MenuCheckboxItem>
                    ))}
                  </MenuGroup>
                </MenuPopup>
              </Menu>
            )}
            {phone ? (
              <Select
                items={views.map((entry) => ({
                  label: viewLabel(entry),
                  value: entry,
                }))}
                onValueChange={(value) => setView(value as CalendarView)}
                value={view}
              >
                <SelectTrigger
                  aria-label={labels.view}
                  className="w-28 min-w-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {views.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {viewLabel(entry)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            ) : (
              <SegmentedControl
                aria-label={labels.view}
                render={
                  <RadioGroupPrimitive
                    onValueChange={(value) => setView(value as CalendarView)}
                    value={view}
                  />
                }
              >
                {views.map((entry) => (
                  <SegmentedControlItem
                    key={entry}
                    render={<RadioPrimitive.Root value={entry} />}
                  >
                    {viewLabel(entry)}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            )}
            {editable && (
              <Button
                aria-label={phone ? labels.newEvent : undefined}
                onClick={newEvent}
                size={phone ? "icon" : "default"}
              >
                <PlusIcon aria-hidden="true" />
                {!phone && labels.newEvent}
              </Button>
            )}
          </div>
        </header>

        {view === "day" || view === "week" ? (
          <TimeGridView
            dayEndHour={dayEndHour}
            dayStartHour={dayStartHour}
            days={days}
            events={visibleEvents}
            hour12={hour12}
            hourHeight={hourHeight}
            onDayClick={goToDay}
            workEndHour={workEndHour}
            workStartHour={workStartHour}
          />
        ) : view === "month" ? (
          <MonthView
            date={date}
            events={visibleEvents}
            onDayClick={goToDay}
            weekStartsOn={weekStartsOn}
          />
        ) : (
          <AgendaView date={date} events={visibleEvents} />
        )}

        <Popover
          onOpenChange={(open) => {
            if (!open) setDetails(null);
          }}
          open={Boolean(details && detailsEvent)}
        >
          {details && detailsEvent && (
            <CalendarPopup
              anchor={details.anchor}
              className="w-80 max-w-[calc(100vw-2rem)]"
              finalFocus={focusAfter}
              side={phone ? "bottom" : "right"}
            >
              <EventDetails
                event={detailsEvent}
                onClose={() => setDetails(null)}
                onDelete={() => deleteEvent(detailsEvent)}
              />
            </CalendarPopup>
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
              initialFocus={titleRef}
              key={editor.key}
            >
              <EventEditor
                event={editor.event}
                mode={editor.mode}
                titleRef={titleRef}
                onCancel={() => setEditor(null)}
                onDelete={() => deleteEvent(editor.event)}
                onSave={(saved) => {
                  if (editor.mode === "create") {
                    const created = { ...saved, id: createId() };
                    commit([...events, created], {
                      event: created,
                      type: "create",
                    });
                  } else {
                    updateEvent(saved, editor.event);
                  }
                  setEditor(null);
                }}
              />
            </DialogPopup>
          )}
        </Dialog>
      </section>
    </CalendarContext.Provider>
  );
}
