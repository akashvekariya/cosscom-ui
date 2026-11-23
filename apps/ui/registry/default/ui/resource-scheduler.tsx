"use client";

import {
  addDays,
  addHours,
  addMinutes,
  format,
  isSameDay,
  isWeekend,
  type Locale,
  parse,
  startOfDay,
  startOfWeek,
} from "date-fns";
import {
  BanIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
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
  getTimeGridSegmentStyle,
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
import { Textarea } from "@/registry/default/ui/textarea";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const ROW_HEIGHT = 56;

type BookingItem = SchedulerBooking & { lane: string };

type Context = {
  formatRange: (start: Date, end: Date) => string;
  formatTime: (date: Date) => string;
  isReadOnly: (booking: SchedulerBooking) => boolean;
  labels: ResourceSchedulerLabels;
  openDetails: (booking: SchedulerBooking, anchor: HTMLElement) => void;
  resources: SchedulerResource[];
};

const SchedulerContext = createContext<Context | null>(null);

function useScheduler(): Context {
  const context = useContext(SchedulerContext);
  if (!context) throw new Error("Missing ResourceScheduler context");
  return context;
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

function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
) {
  return a.start < b.end && a.end > b.start;
}

/** A popover that opens in place and hides while its anchor is out of view. */
function SchedulerPopup({
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
          data-slot="scheduler-popup"
          finalFocus={finalFocus}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function ResourceLabel({
  resource,
  booked,
}: {
  resource: SchedulerResource;
  booked?: number;
}) {
  const { labels } = useScheduler();
  const color = resolveEventColor(resource.color, "gray");
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar
        aria-hidden="true"
        className="rounded-lg [--avatar-size:--spacing(9)] sm:[--avatar-size:--spacing(8)]"
      >
        {resource.image && <AvatarImage alt="" src={resource.image} />}
        <AvatarFallback
          className="bg-[color-mix(in_oklab,var(--event-color)_20%,var(--background))] text-foreground"
          style={colorStyle(color)}
        >
          {initials(resource.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-base sm:text-sm">
          {resource.name}
        </p>
        <p className="flex items-center gap-2 truncate text-muted-foreground text-xs">
          {resource.capacity !== undefined && (
            <span className="inline-flex items-center gap-1">
              <UsersIcon aria-hidden="true" className="size-3" />
              {labels.seats(resource.capacity)}
            </span>
          )}
          {resource.description && (
            <span className="truncate">{resource.description}</span>
          )}
          {booked !== undefined && booked > 0 && (
            <span className="tabular-nums">{labels.booked(booked)}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function BookingItemView({
  grid,
  segment,
  vertical,
  length,
}: {
  grid: UseTimeGridReturn<BookingItem>;
  segment: TimeGridSegment<BookingItem>;
  vertical: boolean;
  /** Size of the booking along the time axis, in pixels. */
  length: number;
}) {
  const { formatRange, isReadOnly, labels, openDetails, resources } =
    useScheduler();
  const booking = segment.item;
  const resource = resources.find((entry) => entry.id === booking.lane);
  const color = resolveEventColor(booking.color ?? resource?.color);
  const readOnly = isReadOnly(booking);
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
  const time = formatRange(booking.start, booking.end);
  const title = booking.title || labels.untitled;
  const compact = vertical ? length < 44 : length < 96;

  return (
    <div
      {...props}
      aria-label={`${title}, ${time}${resource ? `, ${resource.name}` : ""}`}
      className={cn(
        "outline-none data-dragging:z-20 [&:focus-visible>[data-slot=booking-surface]]:ring-2 [&:focus-visible>[data-slot=booking-surface]]:ring-ring [&[data-dragging]>[data-slot=booking-surface]]:shadow-lg [&[data-refused]>[data-slot=booking-surface]]:ring-2 [&[data-refused]>[data-slot=booking-surface]]:ring-destructive",
        vertical ? "px-0.5 py-px" : "px-px py-1.5",
      )}
      data-slot="scheduler-booking"
      onClick={(clickEvent) => openDetails(booking, clickEvent.currentTarget)}
      onKeyDown={(keyEvent) => {
        props.onKeyDown?.(keyEvent);
        if (!keyEvent.defaultPrevented && keyEvent.key === "Enter") {
          keyEvent.preventDefault();
          openDetails(booking, keyEvent.currentTarget);
        }
      }}
      style={{ ...props.style, ...colorStyle(color) }}
    >
      <div
        className={cn(
          eventSurfaceClassName,
          "flex h-full min-w-0 cursor-pointer select-none overflow-hidden rounded-md text-sm leading-snug shadow-[0_0_0_1px_var(--background)] hover:bg-[color-mix(in_oklab,var(--event-color)_22%,var(--background))] data-[status=tentative]:border-dashed data-[status=tentative]:bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--event-color)_12%,var(--background))_0_6px,var(--background)_6px_12px)] data-[status=cancelled]:line-through data-[status=cancelled]:opacity-56 sm:text-xs",
          compact
            ? "items-center px-1.5"
            : "flex-col justify-center gap-px px-2 py-1",
        )}
        data-slot="booking-surface"
        data-status={booking.status}
      >
        <span className="truncate font-medium">{title}</span>
        {!compact && (
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            {booking.bookedBy && (
              <Avatar
                aria-hidden="true"
                className="[--avatar-size:--spacing(4)]"
              >
                {booking.bookedBy.image && (
                  <AvatarImage alt="" src={booking.bookedBy.image} />
                )}
                <AvatarFallback className="text-[0.5rem]">
                  {initials(booking.bookedBy.name)}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="truncate tabular-nums">{time}</span>
          </span>
        )}
      </div>
      {!readOnly && (
        <>
          <div
            {...grid.getResizeHandleProps(segment, "start")}
            className={
              vertical
                ? "absolute inset-x-1 top-0 h-1.5"
                : "absolute inset-y-1 start-0 w-1.5"
            }
          />
          <div
            {...grid.getResizeHandleProps(segment, "end")}
            className={
              vertical
                ? "absolute inset-x-1 bottom-0 h-1.5"
                : "absolute inset-y-1 end-0 w-1.5"
            }
          />
        </>
      )}
    </div>
  );
}

function BookingDetails({
  booking,
  onClose,
  onDelete,
  onEdit,
}: {
  booking: SchedulerBooking;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { formatRange, isReadOnly, labels, resources } = useScheduler();
  const resource = resources.find((entry) => entry.id === booking.resourceId);
  const color = resolveEventColor(booking.color ?? resource?.color);
  const editable = !isReadOnly(booking);
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
              booking.status === "cancelled" && "line-through",
            )}
          >
            {booking.title || labels.untitled}
          </p>
          <p className="text-muted-foreground text-sm">
            {format(booking.start, "EEEE, MMMM d")},{" "}
            {formatRange(booking.start, booking.end)}
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
      {booking.status && booking.status !== "confirmed" && (
        <Badge
          className="self-start"
          variant={booking.status === "cancelled" ? "error" : "warning"}
        >
          {labels[booking.status]}
        </Badge>
      )}
      {resource && <ResourceLabel resource={resource} />}
      {booking.bookedBy && (
        <p className="flex items-center gap-2 text-sm">
          <Avatar className="[--avatar-size:--spacing(6)]">
            {booking.bookedBy.image && (
              <AvatarImage alt="" src={booking.bookedBy.image} />
            )}
            <AvatarFallback>{initials(booking.bookedBy.name)}</AvatarFallback>
          </Avatar>
          <span>
            <span className="text-muted-foreground">{labels.bookedBy} </span>
            {booking.bookedBy.name}
          </span>
        </p>
      )}
      {booking.notes && (
        <p className="whitespace-pre-wrap text-muted-foreground text-sm">
          {booking.notes}
        </p>
      )}
    </div>
  );
}

function BookingEditor({
  booking,
  mode,
  titleRef,
  isFree,
  onCancel,
  onDelete,
  onSave,
}: {
  booking: SchedulerBooking;
  mode: "create" | "edit";
  titleRef: React.RefObject<HTMLInputElement | null>;
  isFree: (booking: SchedulerBooking) => boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (booking: SchedulerBooking) => void;
}) {
  const { labels, resources } = useScheduler();
  const id = useId();
  const bookable = resources.filter((resource) => !resource.readOnly);
  const [title, setTitle] = useState(booking.title);
  const [resourceId, setResourceId] = useState(booking.resourceId);
  const [date, setDate] = useState(format(booking.start, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(booking.start, "HH:mm"));
  const [endTime, setEndTime] = useState(format(booking.end, "HH:mm"));
  const [status, setStatus] = useState<SchedulerBookingStatus>(
    booking.status ?? "confirmed",
  );
  const [color, setColor] = useState(booking.color ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [error, setError] = useState("");
  const resourceItems = bookable.map((resource) => ({
    label: resource.name,
    value: resource.id,
  }));
  const statusItems: { label: string; value: SchedulerBookingStatus }[] = [
    { label: labels.confirmed, value: "confirmed" },
    { label: labels.tentative, value: "tentative" },
    { label: labels.cancelled, value: "cancelled" },
  ];

  const save = (): void => {
    const start = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
    let end = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError(labels.invalidTime);
      return;
    }
    // An end before the start runs past midnight, as in a night shift.
    if (end <= start) end = addDays(end, 1);
    const next: SchedulerBooking = {
      ...booking,
      color: color || undefined,
      end,
      notes: notes || undefined,
      resourceId,
      start,
      status: status === "confirmed" ? undefined : status,
      title: title.trim(),
    };
    if (status !== "cancelled" && !isFree(next)) {
      const resource = resources.find((entry) => entry.id === resourceId);
      setError(labels.taken(resource?.name ?? ""));
      return;
    }
    onSave(next);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? labels.newBooking : labels.editBooking}
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
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder={labels.untitled}
              ref={titleRef}
              type="text"
              value={title}
            />
          </Field>
          <Field>
            <FieldLabel>{labels.resource}</FieldLabel>
            <Select
              items={resourceItems}
              onValueChange={(value) => setResourceId(String(value))}
              value={resourceId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {resourceItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field className="col-span-3 sm:col-span-1">
              <FieldLabel>{labels.date}</FieldLabel>
              <Input
                onChange={(changeEvent) => setDate(changeEvent.target.value)}
                type="date"
                value={date}
              />
            </Field>
            <Field className="col-span-3 max-sm:col-span-1 sm:col-span-1">
              <FieldLabel>{labels.starts}</FieldLabel>
              <Input
                onChange={(changeEvent) =>
                  setStartTime(changeEvent.target.value)
                }
                step={300}
                type="time"
                value={startTime}
              />
            </Field>
            <Field className="col-span-3 max-sm:col-span-2 sm:col-span-1">
              <FieldLabel>{labels.ends}</FieldLabel>
              <Input
                onChange={(changeEvent) => setEndTime(changeEvent.target.value)}
                step={300}
                type="time"
                value={endTime}
              />
            </Field>
          </div>
          {error && (
            <p className="text-destructive-foreground text-sm" role="alert">
              {error}
            </p>
          )}
          <Field>
            <FieldLabel>{labels.status}</FieldLabel>
            <Select
              items={statusItems}
              onValueChange={(value) =>
                setStatus(value as SchedulerBookingStatus)
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
              {["", ...eventColorNames].map((name) => (
                <RadioPrimitive.Root
                  aria-label={name || labels.resourceColor}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:border-foreground sm:size-7"
                  key={name || "resource"}
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
              ))}
            </RadioGroupPrimitive>
          </div>
          <Field>
            <FieldLabel>{labels.notes}</FieldLabel>
            <Textarea
              onChange={(changeEvent) => setNotes(changeEvent.target.value)}
              value={notes}
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

export type SchedulerView = "day" | "week";

export type SchedulerLayout = "rows" | "columns";

export type SchedulerBookingStatus = "confirmed" | "tentative" | "cancelled";

export type SchedulerBlock = {
  start: Date;
  end: Date;
  /** Shown on the block, for example "Cleaning" or "Vacation". */
  reason?: string;
};

export type SchedulerResource = {
  id: string;
  name: string;
  /** A short line under the name, such as a floor or a role. */
  description?: string;
  image?: string;
  /** A color name such as `"green"`, or any CSS color. */
  color?: EventColor | (string & {});
  /** Number of seats, shown under the name. */
  capacity?: number;
  /** Times the resource cannot be booked. */
  unavailable?: SchedulerBlock[];
  /** Bookings of this resource cannot be added, moved or edited. */
  readOnly?: boolean;
};

export type SchedulerBooking = {
  id: string;
  resourceId: string;
  title: string;
  start: Date;
  end: Date;
  color?: EventColor | (string & {});
  status?: SchedulerBookingStatus;
  bookedBy?: { name: string; image?: string };
  notes?: string;
  readOnly?: boolean;
};

export type SchedulerChange = {
  type: "create" | "update" | "delete";
  booking: SchedulerBooking;
  /** The booking before an update. */
  previous?: SchedulerBooking;
};

export const resourceSchedulerLabels = {
  booked: (hours: number): string => `${hours} h booked`,
  bookedBy: "Booked by",
  cancel: "Cancel",
  cancelled: "Cancelled",
  close: "Close",
  color: "Color",
  confirmed: "Confirmed",
  date: "Date",
  day: "Day",
  delete: "Delete",
  edit: "Edit",
  editBooking: "Edit booking",
  ends: "Ends",
  instructions:
    "Press Enter to open a booking. Press Space to pick it up, then use the arrow keys to move it in time or to another resource. Hold Shift to change its end, or Alt to change its start. Press Space to drop it, or Escape to cancel.",
  invalidTime: "Enter a valid date and time.",
  newBooking: "New booking",
  next: "Next",
  noResults: "No matches",
  notes: "Notes",
  previous: "Previous",
  resource: "Resource",
  resourceColor: "Resource color",
  resources: "Resources",
  save: "Save",
  search: "Search",
  seats: (count: number): string => `${count}`,
  starts: "Starts",
  status: "Status",
  taken: (resource: string): string =>
    `${resource} is booked or unavailable then.`,
  tentative: "Tentative",
  title: "Title",
  today: "Today",
  unavailable: "Unavailable",
  untitled: "(No title)",
  view: "View",
  week: "Week",
};

export type ResourceSchedulerLabels = typeof resourceSchedulerLabels;

export type ResourceSchedulerProps = {
  /** People, rooms or equipment that can be booked, in display order. */
  resources: SchedulerResource[];
  /** Bookings to show. Controlled. */
  bookings?: SchedulerBooking[];
  /** Initial bookings when uncontrolled. */
  defaultBookings?: SchedulerBooking[];
  /** Called after every create, update or delete. */
  onBookingsChange?: (
    bookings: SchedulerBooking[],
    change: SchedulerChange,
  ) => void;
  /**
   * `"rows"`: one row per resource, time runs left to right. `"columns"`:
   * one column per resource, time runs down; day view only. Defaults to
   * `"rows"`. Phones always use rows.
   */
  layout?: SchedulerLayout;
  view?: SchedulerView;
  defaultView?: SchedulerView;
  onViewChange?: (view: SchedulerView) => void;
  /** Views offered in the switcher. */
  views?: SchedulerView[];
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /** Called with the dates on screen whenever they change. */
  onRangeChange?: (range: { start: Date; end: Date }) => void;
  /** Hours shown in the day view. */
  dayStartHour?: number;
  dayEndHour?: number;
  /** Working hours. Hours outside them are shaded. */
  workStartHour?: number;
  workEndHour?: number;
  /** Snap step in minutes. Defaults to 30. */
  stepMinutes?: number;
  /** Allow two bookings of one resource at the same time. */
  allowOverlap?: boolean;
  /** First day of the week, 0 for Sunday. Defaults to 1, Monday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** `true` for 3:00 PM, `false` for 15:00. Defaults to the locale. */
  hour12?: boolean;
  locale?: Locale;
  /** Fixes the current time, for example in tests and demos. */
  now?: Date;
  /** Allow adding, moving, resizing, editing and deleting. Defaults to `true`. */
  editable?: boolean;
  /** Title shown in the toolbar. */
  title?: React.ReactNode;
  labels?: Partial<ResourceSchedulerLabels>;
  /** Id for new bookings. Defaults to a random id. */
  createId?: () => string;
  className?: string;
};

/**
 * A booking board for rooms, people or equipment. Bookings can be drawn,
 * moved between resources, resized, opened, edited and deleted by mouse,
 * touch and keyboard, and never double-book a resource or land on a time it
 * is unavailable.
 */
export function ResourceScheduler({
  resources,
  bookings: bookingsProp,
  defaultBookings,
  onBookingsChange,
  layout: layoutProp = "rows",
  view: viewProp,
  defaultView = "day",
  onViewChange,
  views = ["day", "week"],
  date: dateProp,
  defaultDate,
  onDateChange,
  onRangeChange,
  dayStartHour = 7,
  dayEndHour = 20,
  workStartHour = 9,
  workEndHour = 18,
  stepMinutes = 30,
  allowOverlap = false,
  weekStartsOn = 1,
  hour12,
  locale,
  now: nowProp,
  editable = true,
  title,
  labels: labelsProp,
  createId = (): string =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  className,
}: ResourceSchedulerProps): React.ReactElement {
  const labels = { ...resourceSchedulerLabels, ...labelsProp };
  const phone = useMediaQuery("max-sm");
  const [uncontrolledBookings, setUncontrolledBookings] = useState(
    defaultBookings ?? [],
  );
  const bookings = bookingsProp ?? uncontrolledBookings;
  const [uncontrolledView, setUncontrolledView] = useState(defaultView);
  const view = viewProp ?? uncontrolledView;
  const [uncontrolledDate, setUncontrolledDate] = useState(
    () => defaultDate ?? nowProp ?? new Date(),
  );
  const date = dateProp ?? uncontrolledDate;
  const [now, setNow] = useState(() => nowProp ?? new Date());
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [details, setDetails] = useState<{
    booking: SchedulerBooking;
    anchor: HTMLElement;
  } | null>(null);
  const [editor, setEditor] = useState<{
    booking: SchedulerBooking;
    mode: "create" | "edit";
    key: number;
  } | null>(null);
  const editorKey = useRef(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const focusAfter = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = (): void => setViewportWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (nowProp) {
      setNow(nowProp);
      return;
    }
    const timer = setInterval(() => setNow(new Date()), MINUTE);
    return () => clearInterval(timer);
  }, [nowProp]);

  const layout: SchedulerLayout =
    view === "week" || phone ? "rows" : layoutProp;
  const vertical = layout === "columns";

  const setView = (next: SchedulerView): void => {
    if (viewProp === undefined) setUncontrolledView(next);
    onViewChange?.(next);
  };
  const setDate = (next: Date): void => {
    if (dateProp === undefined) setUncontrolledDate(next);
    onDateChange?.(next);
  };
  const commit = (next: SchedulerBooking[], change: SchedulerChange): void => {
    if (bookingsProp === undefined) setUncontrolledBookings(next);
    onBookingsChange?.(next, change);
  };

  const range = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(date, { weekStartsOn });
      return { end: addDays(start, 7), start };
    }
    const day = startOfDay(date);
    return {
      end: addMinutes(day, dayEndHour * 60),
      start: addMinutes(day, dayStartHour * 60),
    };
  }, [view, date, weekStartsOn, dayStartHour, dayEndHour]);

  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  useEffect(() => {
    onRangeChangeRef.current?.({
      end: new Date(rangeEnd),
      start: new Date(rangeStart),
    });
  }, [rangeStart, rangeEnd]);

  const hours = (rangeEnd - rangeStart) / HOUR;
  const listWidth = phone ? 148 : 232;
  const baseHourSize = vertical
    ? 52
    : view === "week"
      ? phone
        ? 8
        : 10
      : phone
        ? 64
        : 88;
  // In rows, stretch the time axis to fill the space beside the list.
  const hourSize = vertical
    ? baseHourSize
    : Math.max(baseHourSize, (viewportWidth - listWidth) / hours || 0);
  const timelineSize = hours * hourSize;
  const posOf = (time: Date): number =>
    ((time.getTime() - rangeStart) / HOUR) * hourSize;

  const timeFormat = hour12 === false ? "HH:mm" : hour12 ? "h:mm a" : "p";
  const formatTime = (value: Date): string =>
    format(value, timeFormat, { locale });
  const formatRange = (start: Date, end: Date): string =>
    isSameDay(start, end) || end.getTime() - startOfDay(end).getTime() === 0
      ? `${formatTime(start)} – ${formatTime(end)}`
      : `${format(start, "EEE", { locale })} ${formatTime(start)} – ${format(end, "EEE", { locale })} ${formatTime(end)}`;
  const hourLabel = (value: Date): string =>
    format(value, hour12 === false ? "HH:mm" : "h a", { locale });

  const resourceById = (id: string): SchedulerResource | undefined =>
    resources.find((resource) => resource.id === id);
  const isReadOnly = (booking: SchedulerBooking): boolean =>
    !editable ||
    Boolean(booking.readOnly) ||
    Boolean(resourceById(booking.resourceId)?.readOnly);
  const isFree = (booking: SchedulerBooking): boolean => {
    const resource = resourceById(booking.resourceId);
    if (!resource || resource.readOnly) return false;
    if (
      (resource.unavailable ?? []).some((block) => overlaps(block, booking))
    ) {
      return false;
    }
    if (allowOverlap) return true;
    return !bookings.some(
      (other) =>
        other.id !== booking.id &&
        other.resourceId === booking.resourceId &&
        other.status !== "cancelled" &&
        overlaps(other, booking),
    );
  };

  const visibleResources = resources.filter((resource) =>
    resource.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const lanes = useMemo(
    (): TimeGridLane[] =>
      visibleResources.map((resource) => ({
        end: new Date(rangeEnd),
        id: resource.id,
        start: new Date(rangeStart),
      })),
    [rangeStart, rangeEnd, visibleResources.map],
  );
  const items: BookingItem[] = bookings
    .filter((booking) => lanes.some((lane) => lane.id === booking.resourceId))
    .map((booking) => ({ ...booking, lane: booking.resourceId }));

  const openEditor = (
    booking: SchedulerBooking,
    mode: "create" | "edit",
  ): void => {
    editorKey.current += 1;
    if (mode === "create") {
      focusAfter.current = document.activeElement as HTMLElement | null;
    }
    setEditor({ booking, key: editorKey.current, mode });
  };

  const grid = useTimeGrid<BookingItem>({
    canChange: ({ item, to }) =>
      isFree({
        ...item,
        end: to.end,
        resourceId: to.lane ?? item.resourceId,
        start: to.start,
      }),
    disabled: !editable,
    formatRange: (start, end) =>
      `${format(start, "EEEE", { locale })}, ${formatRange(start, end)}`,
    getItemLabel: (booking) => booking.title || labels.untitled,
    getLaneLabel: (lane) => resourceById(lane)?.name ?? lane,
    instructions: labels.instructions,
    lanes,
    onCreate: (created) => {
      const draft: SchedulerBooking = {
        end: created.end,
        id: "",
        resourceId: created.lane,
        start: created.start,
        title: "",
      };
      if (!isFree(draft)) {
        const name = resourceById(created.lane)?.name ?? "";
        setNotice(labels.taken(name));
        return;
      }
      openEditor(draft, "create");
    },
    onValueChange: (_, change) => {
      const previous = bookings.find(
        (booking) => booking.id === change.item.id,
      );
      if (!previous) return;
      const next = {
        ...previous,
        end: change.to.end,
        resourceId: change.to.lane ?? previous.resourceId,
        start: change.to.start,
      };
      commit(
        bookings.map((booking) =>
          booking.id === previous.id ? next : booking,
        ),
        { booking: next, previous, type: "update" },
      );
    },
    orientation: vertical ? "vertical" : "horizontal",
    pickUpKeys: [" "],
    step: stepMinutes * MINUTE,
    value: items,
  });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Scroll to the start of the working day, or to now when it is on screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the view, layout or range changes.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const target =
      now.getTime() >= rangeStart && now.getTime() < rangeEnd
        ? new Date(now.getTime() - HOUR)
        : addMinutes(startOfDay(range.start), workStartHour * 60);
    const offset = Math.max(0, posOf(target));
    if (vertical) element.scrollTop = offset;
    else element.scrollLeft = offset;
  }, [view, layout, rangeStart]);

  const step = (direction: 1 | -1): void =>
    setDate(addDays(date, direction * (view === "week" ? 7 : 1)));

  const heading =
    view === "week"
      ? `${format(range.start, "MMM d", { locale })} – ${format(addDays(range.end, -1), "MMM d, yyyy", { locale })}`
      : format(date, "EEEE, MMMM d, yyyy", { locale });

  // Hour marks and shading for the time axis.
  const marks = useMemo(() => {
    const result: { key: string; at: Date; label: string; day?: boolean }[] =
      [];
    const every = view === "week" ? 6 : 1;
    for (
      let time = new Date(rangeStart);
      time.getTime() < rangeEnd;
      time = addHours(time, every)
    ) {
      result.push({
        at: time,
        day: time.getHours() === 0,
        key: time.toISOString(),
        label: hourLabel(time),
      });
    }
    return result;
    // biome-ignore lint/correctness/useExhaustiveDependencies: derived from the range and view.
  }, [rangeStart, rangeEnd, view, hourLabel]);

  const shading = useMemo(() => {
    const blocks: { key: string; start: Date; end: Date }[] = [];
    for (
      let day = startOfDay(new Date(rangeStart));
      day.getTime() < rangeEnd;
      day = addDays(day, 1)
    ) {
      if (isWeekend(day) && view === "week") {
        blocks.push({
          end: addDays(day, 1),
          key: `w${day.toISOString()}`,
          start: day,
        });
        continue;
      }
      blocks.push({
        end: addMinutes(day, workStartHour * 60),
        key: `a${day.toISOString()}`,
        start: day,
      });
      blocks.push({
        end: addDays(day, 1),
        key: `b${day.toISOString()}`,
        start: addMinutes(day, workEndHour * 60),
      });
    }
    return blocks
      .map((block) => ({
        ...block,
        end: new Date(Math.min(block.end.getTime(), rangeEnd)),
        start: new Date(Math.max(block.start.getTime(), rangeStart)),
      }))
      .filter((block) => block.end > block.start);
  }, [rangeStart, rangeEnd, view, workStartHour, workEndHour]);

  const nowPos =
    now.getTime() >= rangeStart && now.getTime() < rangeEnd ? posOf(now) : null;

  const bookedHours = (resourceId: string): number => {
    const minutes = bookings
      .filter(
        (booking) =>
          booking.resourceId === resourceId && booking.status !== "cancelled",
      )
      .reduce((total, booking) => {
        const start = Math.max(booking.start.getTime(), rangeStart);
        const end = Math.min(booking.end.getTime(), rangeEnd);
        return total + Math.max(0, end - start) / MINUTE;
      }, 0);
    return Math.round((minutes / 60) * 2) / 2;
  };

  const segmentStyle = (block: {
    start: Date;
    end: Date;
  }): React.CSSProperties =>
    getTimeGridSegmentStyle(
      {
        offset: (block.start.getTime() - rangeStart) / (rangeEnd - rangeStart),
        size:
          (block.end.getTime() - block.start.getTime()) /
          (rangeEnd - rangeStart),
        track: 0,
        tracks: 1,
      },
      { orientation: vertical ? "vertical" : "horizontal" },
    );

  const laneContent = (resource: SchedulerResource): React.ReactNode => (
    <>
      {shading.map((block) => (
        <div
          aria-hidden="true"
          className="pointer-events-none bg-muted/40"
          key={block.key}
          style={segmentStyle(block)}
        />
      ))}
      {(resource.unavailable ?? [])
        .filter(
          (block) =>
            block.end.getTime() > rangeStart &&
            block.start.getTime() < rangeEnd,
        )
        .map((block) => {
          const clipped = {
            end: new Date(Math.min(block.end.getTime(), rangeEnd)),
            start: new Date(Math.max(block.start.getTime(), rangeStart)),
          };
          return (
            <div
              className="pointer-events-none flex overflow-hidden p-1"
              key={`${block.start.toISOString()}-${block.reason ?? ""}`}
              style={segmentStyle(clipped)}
            >
              <div className="flex size-full items-start gap-1 overflow-hidden rounded-md border border-dashed bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,transparent_6px_12px)] px-1.5 py-1 text-muted-foreground text-xs">
                <BanIcon aria-hidden="true" className="mt-px size-3 shrink-0" />
                <span className="truncate">
                  {block.reason ?? labels.unavailable}
                </span>
              </div>
            </div>
          );
        })}
      {grid.getDraftSegments(resource.id).map((segment) => {
        const taken =
          grid.draft &&
          !isFree({
            end: grid.draft.end,
            id: "",
            resourceId: resource.id,
            start: grid.draft.start,
            title: "",
          });
        return (
          <div
            className={cn(
              "z-10 flex overflow-hidden rounded-md border-2 border-dashed px-1.5 text-sm sm:text-xs",
              vertical ? "py-0.5" : "items-center",
              taken
                ? "border-destructive/64 bg-destructive/8 text-destructive-foreground"
                : "border-primary/64 bg-primary/8 text-primary",
            )}
            key={segment.lane}
            style={grid.getSegmentStyle(segment)}
          >
            {grid.draft &&
              (taken
                ? labels.unavailable
                : formatRange(grid.draft.start, grid.draft.end))}
          </div>
        );
      })}
      {grid.getSegments(resource.id).map((segment) => (
        <BookingItemView
          grid={grid}
          key={`${segment.id}:${segment.lane}`}
          length={
            ((segment.end.getTime() - segment.start.getTime()) / HOUR) *
            hourSize
          }
          segment={segment}
          vertical={vertical}
        />
      ))}
    </>
  );

  const openDetails = (
    booking: SchedulerBooking,
    anchor: HTMLElement,
  ): void => {
    focusAfter.current = anchor;
    setDetails({ anchor, booking });
  };
  const deleteBooking = (booking: SchedulerBooking): void => {
    commit(
      bookings.filter((entry) => entry.id !== booking.id),
      { booking, type: "delete" },
    );
    setDetails(null);
    setEditor(null);
  };
  const newBooking = (): void => {
    const resource = visibleResources.find((entry) => !entry.readOnly);
    if (!resource) return;
    const base =
      isSameDay(now, range.start) || view === "week" ? now : range.start;
    let start = new Date(Math.ceil(base.getTime() / HOUR) * HOUR);
    if (start.getTime() < rangeStart || start.getTime() >= rangeEnd) {
      start = addMinutes(startOfDay(range.start), workStartHour * 60);
    }
    openEditor(
      {
        end: addHours(start, 1),
        id: "",
        resourceId: resource.id,
        start,
        title: "",
      },
      "create",
    );
  };

  const context: Context = {
    formatRange,
    formatTime,
    isReadOnly,
    labels,
    openDetails,
    resources,
  };
  const detailsBooking = details
    ? (bookings.find((booking) => booking.id === details.booking.id) ?? null)
    : null;

  const search = (
    <div className="relative w-full">
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-80"
      />
      <Input
        aria-label={`${labels.search} ${labels.resources.toLowerCase()}`}
        className="[&_input]:ps-8"
        onChange={(changeEvent) => setQuery(changeEvent.target.value)}
        placeholder={labels.search}
        size="sm"
        type="search"
        value={query}
      />
    </div>
  );

  return (
    <SchedulerContext.Provider value={context}>
      <section
        aria-label={typeof title === "string" ? title : labels.resources}
        className={cn(
          "flex max-h-[40rem] min-h-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground",
          className,
        )}
        data-slot="resource-scheduler"
      >
        <header className="flex flex-wrap items-center gap-2 border-b p-2 sm:px-3">
          <div className="min-w-0 flex-1 px-1 max-sm:basis-full sm:px-0">
            {title && (
              <h2 className="truncate font-heading font-semibold text-lg sm:text-base">
                {title}
              </h2>
            )}
            <p
              aria-live="polite"
              className={cn(
                "truncate",
                title
                  ? "text-muted-foreground text-sm"
                  : "font-heading font-semibold text-lg sm:text-base",
              )}
            >
              {heading}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setDate(nowProp ?? new Date())}
              variant="outline"
            >
              {labels.today}
            </Button>
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
          <div className="ms-auto flex items-center gap-1.5 sm:ms-0 sm:gap-2">
            {views.length > 1 && (
              <SegmentedControl
                aria-label={labels.view}
                render={
                  <RadioGroupPrimitive
                    onValueChange={(value) => setView(value as SchedulerView)}
                    value={view}
                  />
                }
              >
                {views.map((entry) => (
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
                aria-label={phone ? labels.newBooking : undefined}
                onClick={newBooking}
                size={phone ? "icon" : "default"}
              >
                <PlusIcon aria-hidden="true" />
                {!phone && labels.newBooking}
              </Button>
            )}
          </div>
        </header>
        <p
          className={cn(
            "border-b bg-destructive/8 px-3 py-1.5 text-destructive-foreground text-sm",
            !notice && "sr-only",
          )}
          role="status"
        >
          {notice}
        </p>

        <div className="relative min-h-0 flex-1 overflow-auto" ref={scrollRef}>
          {vertical ? (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `4rem repeat(${visibleResources.length}, minmax(9rem, 1fr))`,
              }}
            >
              <div className="sticky start-0 top-0 z-40 border-e border-b bg-background p-2">
                {resources.length > 5 && search}
              </div>
              {visibleResources.map((resource) => (
                <div
                  className="sticky top-0 z-30 border-e border-b bg-background px-3 py-2 last:border-e-0"
                  key={resource.id}
                >
                  <ResourceLabel
                    booked={bookedHours(resource.id)}
                    resource={resource}
                  />
                </div>
              ))}
              <div
                className="sticky start-0 z-30 border-e bg-background"
                style={{ height: timelineSize }}
              >
                {marks.slice(1).map((mark) => (
                  <span
                    className="absolute end-2 -translate-y-1/2 whitespace-nowrap text-muted-foreground text-xs tabular-nums sm:text-[0.6875rem]"
                    key={mark.key}
                    style={{ top: posOf(mark.at) }}
                  >
                    {mark.label}
                  </span>
                ))}
              </div>
              {visibleResources.map((resource) => (
                <div
                  key={resource.id}
                  {...grid.getLaneProps(resource.id)}
                  aria-label={resource.name}
                  className="relative border-e last:border-e-0"
                  role="group"
                  style={{
                    backgroundImage:
                      "linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                    backgroundSize: `100% ${hourSize}px`,
                    height: timelineSize,
                  }}
                >
                  {laneContent(resource)}
                  {nowPos !== null && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-destructive"
                      style={{ top: nowPos }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${listWidth}px ${timelineSize}px`,
                width: listWidth + timelineSize,
              }}
            >
              <div className="sticky start-0 top-0 z-40 flex items-end border-e border-b bg-background p-2">
                {resources.length > 5 ? (
                  search
                ) : (
                  <span className="px-1 pb-0.5 font-medium text-muted-foreground text-xs">
                    {labels.resources}
                  </span>
                )}
              </div>
              <div className="sticky top-0 z-30 border-b bg-background">
                {view === "week" && (
                  <div className="relative h-7 border-b">
                    {Array.from({ length: 7 }, (_, index) =>
                      addDays(range.start, index),
                    ).map((day) => (
                      <div
                        className={cn(
                          "absolute inset-y-0 border-s pt-1.5 font-medium text-xs",
                          isSameDay(day, now) && "text-primary",
                        )}
                        key={day.toISOString()}
                        style={{
                          insetInlineStart: posOf(day),
                          width: 24 * hourSize,
                        }}
                      >
                        <span
                          className="sticky whitespace-nowrap px-2"
                          style={{ insetInlineStart: listWidth }}
                        >
                          {format(day, "EEE d", { locale })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative h-8">
                  {marks.map((mark) => (
                    <span
                      className={cn(
                        "absolute inset-y-0 flex items-center whitespace-nowrap border-s ps-1.5 text-muted-foreground text-xs tabular-nums",
                        mark.day && view === "week" && "border-foreground/24",
                      )}
                      key={mark.key}
                      style={{
                        insetInlineStart: posOf(mark.at),
                        width: (view === "week" ? 6 : 1) * hourSize,
                      }}
                    >
                      {view === "week" && hourSize * 6 < 56 && !mark.day
                        ? ""
                        : mark.label}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="sticky start-0 z-30 border-e bg-background"
                role="list"
                aria-label={labels.resources}
              >
                {visibleResources.map((resource) => (
                  <div
                    className="flex items-center border-b px-3"
                    key={resource.id}
                    role="listitem"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <ResourceLabel
                      booked={bookedHours(resource.id)}
                      resource={resource}
                    />
                  </div>
                ))}
                {visibleResources.length === 0 && (
                  <p className="px-3 py-4 text-muted-foreground text-sm">
                    {labels.noResults}
                  </p>
                )}
              </div>
              <div
                className="relative"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, var(--color-border) 1px, transparent 1px)",
                  backgroundSize: `${(view === "week" ? 6 : 1) * hourSize}px 100%`,
                  height: Math.max(visibleResources.length, 1) * ROW_HEIGHT,
                }}
              >
                {visibleResources.map((resource, index) => (
                  <div
                    key={resource.id}
                    {...grid.getLaneProps(resource.id)}
                    aria-label={resource.name}
                    className="absolute inset-x-0 border-b"
                    role="group"
                    style={{ height: ROW_HEIGHT, top: index * ROW_HEIGHT }}
                  >
                    {laneContent(resource)}
                  </div>
                ))}
                {nowPos !== null && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-destructive ltr:-translate-x-1/2 rtl:translate-x-1/2"
                    style={{ insetInlineStart: nowPos }}
                  />
                )}
              </div>
            </div>
          )}
          <div {...grid.getAnnouncerProps()} />
        </div>

        <Popover
          onOpenChange={(open) => {
            if (!open) setDetails(null);
          }}
          open={Boolean(details && detailsBooking)}
        >
          {details && detailsBooking && (
            <SchedulerPopup anchor={details.anchor} finalFocus={focusAfter}>
              <BookingDetails
                booking={detailsBooking}
                onClose={() => setDetails(null)}
                onDelete={() => deleteBooking(detailsBooking)}
                onEdit={() => {
                  setDetails(null);
                  openEditor(detailsBooking, "edit");
                }}
              />
            </SchedulerPopup>
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
              <BookingEditor
                booking={editor.booking}
                isFree={isFree}
                mode={editor.mode}
                onCancel={() => setEditor(null)}
                onDelete={() => deleteBooking(editor.booking)}
                onSave={(saved) => {
                  if (editor.mode === "create") {
                    const created = { ...saved, id: createId() };
                    commit([...bookings, created], {
                      booking: created,
                      type: "create",
                    });
                  } else {
                    commit(
                      bookings.map((booking) =>
                        booking.id === saved.id ? saved : booking,
                      ),
                      {
                        booking: saved,
                        previous: editor.booking,
                        type: "update",
                      },
                    );
                  }
                  setEditor(null);
                }}
                titleRef={titleRef}
              />
            </DialogPopup>
          )}
        </Dialog>
      </section>
    </SchedulerContext.Provider>
  );
}
