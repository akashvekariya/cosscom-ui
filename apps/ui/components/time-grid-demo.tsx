"use client";

import { addDays, addHours, format, startOfDay } from "date-fns";
import { useMemo, useRef, useState } from "react";
import {
  type TimeGridItem,
  type TimeGridLane,
  type TimeGridSegment,
  type UseTimeGridReturn,
  useTimeGrid,
} from "@/registry/default/hooks/use-time-grid";

type Entry = TimeGridItem & { title: string };

const monday = new Date(2026, 10, 23);
const DAY = 86_400_000;
const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_HEIGHT = 40;
const hourMarks = Array.from(
  { length: END_HOUR - START_HOUR - 1 },
  (_, index) => START_HOUR + index + 1,
);
const ganttDays = Array.from({ length: 14 }, (_, index) =>
  addDays(monday, index),
);

const itemClassName =
  "px-0.5 py-px outline-none data-dragging:z-10 [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-ring";

const cardClassName =
  "flex h-full flex-col overflow-hidden rounded-md border border-info/24 bg-info/12 px-1.5 py-0.5 text-foreground text-sm sm:text-xs in-data-dragging:shadow-lg in-data-refused:border-destructive/48 in-data-refused:bg-destructive/12 in-data-ends-after:rounded-b-none in-data-starts-before:rounded-t-none";

const draftClassName =
  "rounded-md border-2 border-primary/48 border-dashed bg-primary/8";

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 10, 23 + day, hour, minute);
}

function roundToDay(time: number): number {
  return startOfDay(addHours(time, 12)).getTime();
}

function EventBlock({
  grid,
  segment,
}: {
  grid: UseTimeGridReturn<Entry>;
  segment: TimeGridSegment<Entry>;
}) {
  return (
    <div {...grid.getItemProps(segment)} className={itemClassName}>
      <div className={cardClassName}>
        <span className="truncate font-medium">{segment.item.title}</span>
        <span className="truncate text-muted-foreground">
          {format(segment.item.start, "p")}
        </span>
      </div>
      <div
        {...grid.getResizeHandleProps(segment, "start")}
        className="absolute inset-x-0 top-0 h-2"
      />
      <div
        {...grid.getResizeHandleProps(segment, "end")}
        className="absolute inset-x-0 bottom-0 h-2"
      />
    </div>
  );
}

export function TimeGridWeekDemo() {
  const nextId = useRef(100);
  const lanes = useMemo(
    (): TimeGridLane[] =>
      Array.from({ length: 5 }, (_, index) => ({
        end: at(index, END_HOUR),
        id: `day-${index}`,
        start: at(index, START_HOUR),
      })),
    [],
  );
  const [events, setEvents] = useState<Entry[]>([
    { end: at(0, 9, 30), id: 1, start: at(0, 9), title: "Standup" },
    { end: at(0, 12), id: 2, start: at(0, 10), title: "Design review" },
    { end: at(0, 11, 30), id: 3, start: at(0, 10, 30), title: "Hiring sync" },
    { end: at(1, 15), id: 4, start: at(1, 13), title: "Customer call" },
    { end: at(2, 11), id: 5, start: at(2, 9), title: "Planning" },
    { end: at(4, 17), id: 6, start: at(4, 15, 30), title: "Demo" },
  ]);
  const grid = useTimeGrid<Entry>({
    formatRange: (start, end) =>
      `${format(start, "EEEE p")} to ${format(end, "p")}`,
    getItemLabel: (event) => event.title,
    lanes,
    onCreate: (range) => {
      setEvents((current) => [
        ...current,
        {
          end: range.end,
          id: nextId.current++,
          start: range.start,
          title: "New event",
        },
      ]);
    },
    onValueChange: setEvents,
    value: events,
  });

  return (
    <div className="my-8 overflow-x-auto rounded-xl border">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[4.25rem_repeat(5,1fr)] border-b text-muted-foreground text-sm sm:grid-cols-[3.75rem_repeat(5,1fr)] sm:text-xs">
          <div />
          {lanes.map((lane) => (
            <div className="border-s px-2 py-1.5" key={lane.id}>
              {format(lane.start, "EEE d")}
            </div>
          ))}
        </div>
        <div
          className="grid grid-cols-[4.25rem_repeat(5,1fr)] sm:grid-cols-[3.75rem_repeat(5,1fr)]"
          style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
        >
          <div className="relative">
            {hourMarks.map((hour) => (
              <span
                className="absolute end-1.5 -translate-y-1/2 whitespace-nowrap text-muted-foreground text-xs sm:text-[0.625rem]"
                key={hour}
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
              >
                {format(at(0, hour), "p")}
              </span>
            ))}
          </div>
          {lanes.map((lane) => (
            <div
              {...grid.getLaneProps(lane.id)}
              className="relative border-s bg-[repeating-linear-gradient(to_bottom,transparent_0_39px,var(--color-border)_39px_40px)]"
              key={lane.id}
            >
              {grid.getDraftSegments(lane.id).map((segment) => (
                <div
                  className={draftClassName}
                  key={segment.lane}
                  style={grid.getSegmentStyle(segment)}
                />
              ))}
              {grid.getSegments(lane.id).map((segment) => (
                <EventBlock
                  grid={grid}
                  key={`${segment.id}:${segment.lane}`}
                  segment={segment}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div {...grid.getAnnouncerProps()} />
    </div>
  );
}

const rows = [
  { id: "research", name: "Research" },
  { id: "design", name: "Design" },
  { id: "build", name: "Build" },
  { id: "launch", name: "Launch" },
];

export function TimeGridGanttDemo() {
  const lanes = useMemo(
    (): TimeGridLane[] =>
      rows.map((row) => ({
        end: addDays(monday, 14),
        id: row.id,
        start: monday,
      })),
    [],
  );
  const grid = useTimeGrid<Entry>({
    defaultValue: [
      {
        end: addDays(monday, 3),
        id: "interviews",
        lane: "research",
        start: monday,
        title: "Interviews",
      },
      {
        end: addDays(monday, 7),
        id: "wireframes",
        lane: "design",
        start: addDays(monday, 2),
        title: "Wireframes",
      },
      {
        end: addDays(monday, 12),
        id: "first-version",
        lane: "build",
        start: addDays(monday, 6),
        title: "First version",
      },
      {
        end: addDays(monday, 12),
        id: "launch",
        lane: "launch",
        start: addDays(monday, 12),
        title: "Launch",
      },
    ],
    formatRange: (start, end) =>
      start.getTime() === end.getTime()
        ? format(start, "MMMM d")
        : `${format(start, "MMMM d")} to ${format(addDays(end, -1), "MMMM d")}`,
    getItemLabel: (task) => task.title,
    getLaneLabel: (lane) => rows.find((row) => row.id === lane)?.name ?? lane,
    lanes,
    lockLane: true,
    minDuration: DAY,
    orientation: "horizontal",
    snap: roundToDay,
    step: DAY,
  });

  return (
    <div className="my-8 overflow-x-auto rounded-xl border">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[7rem_1fr] border-b text-muted-foreground text-sm sm:text-xs">
          <div className="px-3 py-1.5">Task</div>
          <div className="grid grid-cols-14">
            {ganttDays.map((day) => (
              <div
                className="border-s py-1.5 text-center"
                key={day.toISOString()}
              >
                {format(day, "d")}
              </div>
            ))}
          </div>
        </div>
        {rows.map((row) => (
          <div
            className="grid grid-cols-[7rem_1fr] border-b last:border-b-0"
            key={row.id}
          >
            <div className="px-3 py-2.5 text-base sm:text-sm">{row.name}</div>
            <div
              {...grid.getLaneProps(row.id)}
              className="relative h-11 bg-[repeating-linear-gradient(to_right,var(--color-border)_0_1px,transparent_1px_calc(100%/14))]"
            >
              {grid.getSegments(row.id).map((segment) =>
                segment.size === 0 ? (
                  <div
                    key={segment.id}
                    {...grid.getItemProps(segment)}
                    className="outline-none [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-ring"
                  >
                    <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-xs bg-warning rtl:translate-x-1/2" />
                  </div>
                ) : (
                  <div
                    key={segment.id}
                    {...grid.getItemProps(segment)}
                    className="px-px py-1.5 outline-none data-dragging:z-10 [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-ring"
                  >
                    <div className="flex h-full items-center truncate rounded-md border border-info/24 bg-info/12 px-2 text-sm in-data-dragging:shadow-lg sm:text-xs">
                      {segment.item.title}
                    </div>
                    <div
                      {...grid.getResizeHandleProps(segment, "start")}
                      className="absolute inset-y-0 start-0 w-2"
                    />
                    <div
                      {...grid.getResizeHandleProps(segment, "end")}
                      className="absolute inset-y-0 end-0 w-2"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div {...grid.getAnnouncerProps()} />
    </div>
  );
}
