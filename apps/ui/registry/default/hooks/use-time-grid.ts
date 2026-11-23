"use client";

import type * as React from "react";
import {
  createElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MINUTE: number = 60_000;
const DEFAULT_STEP: number = 15 * MINUTE;
const DRAG_DISTANCE = 5;
const TOUCH_DELAY = 250;
const TOUCH_TOLERANCE = 8;
const SCROLL_EDGE = 48;
const SCROLL_SPEED = 20;
const WINDOW_EVENTS: string[] = [
  "pointermove",
  "pointerup",
  "pointercancel",
  "keydown",
  "scroll",
  "selectstart",
  "contextmenu",
  "dragstart",
];
const IGNORE_SELECTOR =
  "a[href], button, input, select, textarea, [contenteditable]:not([contenteditable='false']), [data-time-grid-ignore]";
const ITEM_SELECTOR = "[data-time-grid-item], [data-time-grid-handle]";
const DEFAULT_INSTRUCTIONS =
  "Press Space or Enter to pick up an item. Use the arrow keys to move it. Hold Shift to change its end, or Alt to change its start. Press Space or Enter to drop it, or Escape to cancel.";

const visuallyHidden: React.CSSProperties = {
  border: 0,
  clipPath: "inset(50%)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
};

const useIsoLayoutEffect: typeof useLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const claimedEvents: WeakSet<Event> = new WeakSet<Event>();

type Point = { x: number; y: number };

type Range = { start: number; end: number; lane?: string };

type Kind = TimeGridAction | "create";

type Session = {
  element: HTMLElement;
  id: string;
  kind: Kind;
  lane: string;
  point: Point;
  pointerId: number;
  start: Point;
  timer?: ReturnType<typeof setTimeout>;
  touch: boolean;
};

type Drag<Item> = {
  action: TimeGridAction;
  from: Range;
  /** Time under the pointer when the drag started. */
  grab?: number;
  id: string;
  item: Item;
  reason: TimeGridReason;
  refused: boolean;
  to: Range;
};

type Draft = { anchor: number; end: number; lane: string; start: number };

type Latest<Item extends TimeGridItem> = {
  committed: readonly Item[];
  options: UseTimeGridOptions<Item>;
  preview: readonly Item[];
};

function toRange(item: TimeGridItem): Range {
  const start = item.start.getTime();
  return { end: Math.max(item.end.getTime(), start), lane: item.lane, start };
}

function toPublicRange(range: Range): TimeGridRange {
  const result: TimeGridRange = {
    end: new Date(range.end),
    start: new Date(range.start),
  };
  if (range.lane !== undefined) result.lane = range.lane;
  return result;
}

function sameRange(a: Range, b: Range): boolean {
  return a.start === b.start && a.end === b.end && a.lane === b.lane;
}

function applyRange<Item extends TimeGridItem>(item: Item, range: Range): Item {
  const next = {
    ...item,
    end: new Date(range.end),
    start: new Date(range.start),
  };
  if (item.lane !== undefined) next.lane = range.lane;
  return next;
}

function getAction(from: Range, to: Range): TimeGridAction {
  if (from.lane !== to.lane) return "move";
  if (from.start !== to.start && from.end === to.end) return "resize-start";
  if (from.start === to.start && from.end !== to.end) return "resize-end";
  return "move";
}

function overlapsLane(
  start: number,
  end: number,
  laneStart: number,
  laneEnd: number,
): boolean {
  return start === end
    ? start >= laneStart && start < laneEnd
    : start < laneEnd && end > laneStart;
}

function lanesShareTime(lanes: readonly TimeGridLane[]): boolean {
  const sorted = [...lanes].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1] as TimeGridLane;
    const current = sorted[index] as TimeGridLane;
    if (current.start.getTime() < previous.end.getTime()) return true;
  }
  return false;
}

function assignTracks<Item>(segments: TimeGridSegment<Item>[]): void {
  segments.sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      b.end.getTime() -
        b.start.getTime() -
        (a.end.getTime() - a.start.getTime()) ||
      (a.id < b.id ? -1 : 1),
  );
  // A zero-length item (a milestone) still takes up a track.
  const endOf = (segment: TimeGridSegment<Item>): number =>
    Math.max(segment.end.getTime(), segment.start.getTime() + 1);
  const overlap = (
    a: TimeGridSegment<Item>,
    b: TimeGridSegment<Item>,
  ): boolean => a.start.getTime() < endOf(b) && b.start.getTime() < endOf(a);
  let cluster: TimeGridSegment<Item>[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;
  const trackEnds: number[] = [];
  const close = (): void => {
    const tracks = trackEnds.length;
    for (const segment of cluster) {
      segment.tracks = tracks;
      // Widen into the tracks to the right while they are free.
      let span = 1;
      while (
        segment.track + span < tracks &&
        !cluster.some(
          (other) =>
            other.track === segment.track + span && overlap(other, segment),
        )
      ) {
        span++;
      }
      segment.span = span;
    }
    cluster = [];
    trackEnds.length = 0;
  };
  for (const segment of segments) {
    const start = segment.start.getTime();
    const end = endOf(segment);
    if (cluster.length && start >= clusterEnd) close();
    let track = trackEnds.findIndex((trackEnd) => trackEnd <= start);
    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push(end);
    } else {
      trackEnds[track] = end;
    }
    segment.track = track;
    cluster.push(segment);
    clusterEnd = Math.max(clusterEnd, end);
  }
  close();
}

function defaultFormatRange(start: Date, end: Date): string {
  const format = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return start.getTime() === end.getTime()
    ? format.format(start)
    : format.formatRange(start, end);
}

function getMessage(
  type: TimeGridEvent<unknown>["type"],
  action: TimeGridAction,
  item: string,
  where: string,
): string {
  switch (type) {
    case "start":
      return `Picked up ${item}, ${where}.`;
    case "move":
      return action === "move"
        ? `Moved ${item} to ${where}.`
        : `Resized ${item} to ${where}.`;
    case "drop":
      return `Dropped ${item} at ${where}.`;
    case "cancel":
      return `Change canceled. ${item} is back at ${where}.`;
    case "refuse":
      return `${item} cannot go to ${where}.`;
  }
}

function isRtl(element: Element): boolean {
  return getComputedStyle(element).direction === "rtl";
}

function getEdgeDelta(start: number, end: number, at: number): number {
  const edge = Math.min(SCROLL_EDGE, (end - start) / 4);
  if (at < start + edge) {
    return -Math.ceil(((start + edge - at) / edge) * SCROLL_SPEED);
  }
  if (at > end - edge) {
    return Math.ceil(((at - end + edge) / edge) * SCROLL_SPEED);
  }
  return 0;
}

function scrollNearEdges(point: Point): boolean {
  let node: Element | null = document.elementFromPoint(point.x, point.y);
  for (; node; node = node.parentElement) {
    const isRoot = node === document.scrollingElement;
    const { overflowX, overflowY } = getComputedStyle(node);
    if (!isRoot && !/auto|scroll|overlay/.test(overflowX + overflowY)) continue;
    const rect = isRoot
      ? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      : node.getBoundingClientRect();
    if (
      point.x < rect.left ||
      point.x > rect.right ||
      point.y < rect.top ||
      point.y > rect.bottom
    ) {
      continue;
    }
    const { scrollLeft, scrollTop } = node;
    node.scrollTop += getEdgeDelta(rect.top, rect.bottom, point.y);
    node.scrollLeft += getEdgeDelta(rect.left, rect.right, point.x);
    if (node.scrollTop !== scrollTop || node.scrollLeft !== scrollLeft) {
      return true;
    }
  }
  return false;
}

export type TimeGridItem = {
  id: string | number;
  start: Date;
  end: Date;
  /**
   * The lane the item belongs to. Leave it out when lanes split time, such
   * as the days of a week: the item then shows in every lane its time
   * overlaps. Set it when lanes share the same time, such as gantt rows.
   */
  lane?: string;
};

export type TimeGridLane = {
  id: string;
  /** Time at the top (or start) of the lane. */
  start: Date;
  /** Time at the bottom (or end) of the lane. */
  end: Date;
};

export type TimeGridRange = { start: Date; end: Date; lane?: string };

export type TimeGridOrientation = "vertical" | "horizontal";

export type TimeGridOverlap = "split" | "stack";

export type TimeGridAction = "move" | "resize-start" | "resize-end";

export type TimeGridReason = "pointer" | "keyboard";

export type TimeGridChange<Item> = {
  item: Item;
  action: TimeGridAction;
  from: TimeGridRange;
  to: TimeGridRange;
};

export type TimeGridChangeDetails<Item> = TimeGridChange<Item> & {
  reason: TimeGridReason;
};

export type TimeGridActive<Item> = TimeGridChangeDetails<Item> & {
  id: string;
  /** `true` while the current change is refused by `canChange`. */
  refused: boolean;
};

export type TimeGridEvent<Item> = TimeGridChangeDetails<Item> & {
  type: "start" | "move" | "drop" | "cancel" | "refuse";
};

/** One piece of an item inside one lane. Items that cross lanes have several. */
export type TimeGridSegment<Item> = {
  item: Item;
  id: string;
  lane: string;
  /** Start and end of this piece, cut to the lane. */
  start: Date;
  end: Date;
  /** Where the piece starts along the lane, from 0 to 1. */
  offset: number;
  /** How much of the lane the piece covers, from 0 to 1. */
  size: number;
  /** Column (or row) of the piece among the items it overlaps. */
  track: number;
  /** Number of tracks in its group of overlapping items. */
  tracks: number;
  /** Tracks the piece can widen across, because nothing overlaps it there. */
  span: number;
  /** The item started before this lane, for example the day before. */
  startsBefore: boolean;
  /** The item ends after this lane. */
  endsAfter: boolean;
};

export type TimeGridDraftItem = { id: string; start: Date; end: Date };

export type TimeGridRef = (
  element: HTMLElement | null,
) => undefined | (() => void);

export type TimeGridProps = React.HTMLAttributes<HTMLElement> & {
  "data-action"?: TimeGridAction;
  "data-dragging"?: "";
  "data-ends-after"?: "";
  "data-refused"?: "";
  "data-starts-before"?: "";
  "data-time-grid-handle"?: "start" | "end";
  "data-time-grid-item"?: "";
  "data-time-grid-lane"?: "";
  ref?: TimeGridRef;
};

export type UseTimeGridOptions<Item extends TimeGridItem> = {
  /** Lanes in display order: days, rooms or gantt rows. */
  lanes: readonly TimeGridLane[];
  /** Items to place. Controlled. */
  value?: readonly Item[];
  /** Initial items when uncontrolled. */
  defaultValue?: readonly Item[];
  /** Called once per completed move or resize, on drop. */
  onValueChange?: (value: Item[], details: TimeGridChangeDetails<Item>) => void;
  /** Called when a range is drawn on empty space. Add the new item here. */
  onCreate?: (range: TimeGridRange & { lane: string }) => void;
  /** Direction time runs inside a lane. Defaults to `"vertical"`. */
  orientation?: TimeGridOrientation;
  /**
   * How overlapping items share a lane. `"split"`: side by side, each a
   * fraction of the lane. `"stack"`: one after another, each
   * `--time-grid-track-size` (1.5rem by default) wide or tall. Defaults to
   * `"split"`.
   */
  overlap?: TimeGridOverlap;
  /** Snap step in milliseconds. Defaults to 15 minutes. */
  step?: number;
  /** Custom snapping, for example to whole days across daylight saving. */
  snap?: (time: number, lane: TimeGridLane) => number;
  /** Shortest an item can be resized to. Defaults to `step`. */
  minDuration?: number;
  /** Keep items in their own lane, for example gantt rows. */
  lockLane?: boolean;
  /** Return `false` to refuse a change, for example a double booking. */
  canChange?: (change: TimeGridChange<Item>) => boolean;
  disabled?: boolean;
  /** Scroll near the edges while dragging. Defaults to `true`. */
  autoScroll?: boolean;
  /** Name of an item in announcements. Defaults to its id. */
  getItemLabel?: (item: Item) => string;
  /** Name of a lane in announcements. Defaults to its id. */
  getLaneLabel?: (lane: string) => string;
  /** Time range in announcements. Defaults to the browser's date format. */
  formatRange?: (start: Date, end: Date) => string;
  /**
   * Keys that pick up a focused item. Defaults to Space and Enter. Use
   * `[" "]` to leave Enter free, for example to open the item.
   */
  pickUpKeys?: readonly string[];
  /** Keyboard instructions for screen readers. */
  instructions?: string;
  /** Custom announcements. Return `undefined` to stay silent. */
  getAnnouncement?: (event: TimeGridEvent<Item>) => string | undefined;
};

export type UseTimeGridReturn<Item extends TimeGridItem> = {
  /** Items to render. While dragging, the item shows at its new time. */
  value: Item[];
  active: TimeGridActive<Item> | null;
  /** The range being drawn on empty space, if any. */
  draft: (TimeGridRange & { lane: string }) | null;
  /** Pieces of items in a lane, laid out, in time order. */
  getSegments: (lane: string) => TimeGridSegment<Item>[];
  /** Pieces of the range being drawn, to show a placeholder. */
  getDraftSegments: (lane: string) => TimeGridSegment<TimeGridDraftItem>[];
  /** Position style for any segment, for custom placeholders. */
  getSegmentStyle: (segment: TimeGridSegment<unknown>) => React.CSSProperties;
  getLaneProps: (lane: string) => TimeGridProps;
  getItemProps: (segment: TimeGridSegment<Item>) => TimeGridProps;
  getResizeHandleProps: (
    segment: TimeGridSegment<Item>,
    edge: "start" | "end",
  ) => TimeGridProps;
  getAnnouncerProps: () => TimeGridProps;
};

/** Rounds a time to the nearest step, counted from `origin`. */
export function snapTime(time: number, origin: number, step: number): number {
  if (!(step > 0)) return time;
  return origin + Math.round((time - origin) / step) * step;
}

/**
 * Cuts items into one piece per lane they cross, and gives overlapping
 * pieces separate tracks. Returns the pieces of each lane in time order.
 */
export function layoutTimeGrid<Item extends TimeGridItem>(
  items: readonly Item[],
  lanes: readonly TimeGridLane[],
): Record<string, TimeGridSegment<Item>[]> {
  const result: Record<string, TimeGridSegment<Item>[]> = {};
  for (const lane of lanes) {
    const laneStart = lane.start.getTime();
    const laneEnd = lane.end.getTime();
    const length = laneEnd - laneStart;
    const segments: TimeGridSegment<Item>[] = [];
    for (const item of items) {
      if (item.lane !== undefined && item.lane !== lane.id) continue;
      const { start, end } = toRange(item);
      if (!overlapsLane(start, end, laneStart, laneEnd)) continue;
      const from = Math.max(start, laneStart);
      const to = Math.min(end, laneEnd);
      segments.push({
        end: new Date(to),
        endsAfter: end > laneEnd,
        id: `${item.id}`,
        item,
        lane: lane.id,
        offset: length > 0 ? (from - laneStart) / length : 0,
        size: length > 0 ? (to - from) / length : 0,
        start: new Date(from),
        startsBefore: start < laneStart,
        track: 0,
        span: 1,
        tracks: 1,
      });
    }
    assignTracks(segments);
    result[lane.id] = segments;
  }
  return result;
}

/** Absolute position for a segment inside its lane. */
export function getTimeGridSegmentStyle(
  segment: Pick<
    TimeGridSegment<unknown>,
    "offset" | "size" | "track" | "tracks"
  > & { span?: number },
  options: {
    orientation?: TimeGridOrientation;
    overlap?: TimeGridOverlap;
  } = {},
): React.CSSProperties {
  const { orientation = "vertical", overlap = "split" } = options;
  const percent = (value: number): string => `${value * 100}%`;
  const vertical = orientation === "vertical";
  const trackSize = "var(--time-grid-track-size, 1.5rem)";
  const crossStart =
    overlap === "split"
      ? percent(segment.track / segment.tracks)
      : `calc(${segment.track} * ${trackSize})`;
  const crossSize =
    overlap === "split"
      ? percent((segment.span ?? 1) / segment.tracks)
      : trackSize;
  const style: React.CSSProperties & Record<string, string | number> = {
    "--time-grid-track": segment.track,
    "--time-grid-tracks": segment.tracks,
    boxSizing: "border-box",
    position: "absolute",
  };
  if (vertical) {
    style.top = percent(segment.offset);
    style.height = percent(segment.size);
    style.insetInlineStart = crossStart;
    style.width = crossSize;
  } else {
    style.insetInlineStart = percent(segment.offset);
    style.width = percent(segment.size);
    style.top = crossStart;
    style.height = crossSize;
  }
  return style;
}

/**
 * The change an arrow key makes to a range, or `null` if it makes none.
 * Arrows along the lane move the range by one step; with Shift they move
 * its end, with Alt its start. Arrows across lanes move it to the next lane.
 */
export function getTimeGridKeyboardChange(
  range: TimeGridRange & { lane: string },
  key: string,
  options: {
    lanes: readonly TimeGridLane[];
    alt?: boolean;
    shift?: boolean;
    direction?: "ltr" | "rtl";
    orientation?: TimeGridOrientation;
    step?: number;
    snap?: (time: number, lane: TimeGridLane) => number;
    minDuration?: number;
    lockLane?: boolean;
    /** The item keeps a `lane` of its own, as in gantt rows. */
    ownLane?: boolean;
  },
): { action: TimeGridAction; range: TimeGridRange & { lane: string } } | null {
  const {
    lanes,
    alt = false,
    shift = false,
    direction = "ltr",
    orientation = "vertical",
    step = DEFAULT_STEP,
    snap,
    minDuration = step,
    lockLane = false,
    ownLane = false,
  } = options;
  const laneIndex = lanes.findIndex((lane) => lane.id === range.lane);
  const lane = lanes[laneIndex];
  if (!lane) return null;

  const [left, right] =
    direction === "rtl"
      ? ["ArrowRight", "ArrowLeft"]
      : ["ArrowLeft", "ArrowRight"];
  const vertical = orientation === "vertical";
  const [earlier, later] = vertical ? ["ArrowUp", "ArrowDown"] : [left, right];
  const [previousLane, nextLane] = vertical
    ? [left, right]
    : ["ArrowUp", "ArrowDown"];
  const start = range.start.getTime();
  const end = range.end.getTime();
  const round = (time: number): number =>
    snap ? snap(time, lane) : snapTime(time, lane.start.getTime(), step);

  if (key === earlier || key === later) {
    const delta = key === later ? step : -step;
    if (shift) {
      const nextEnd = Math.max(round(end + delta), start + minDuration);
      if (nextEnd === end) return null;
      return {
        action: "resize-end",
        range: { ...range, end: new Date(nextEnd) },
      };
    }
    if (alt) {
      const nextStart = Math.min(round(start + delta), end - minDuration);
      if (nextStart === start) return null;
      return {
        action: "resize-start",
        range: { ...range, start: new Date(nextStart) },
      };
    }
    const nextStart = round(start + delta);
    if (nextStart === start) return null;
    return {
      action: "move",
      range: {
        ...range,
        end: new Date(nextStart + end - start),
        start: new Date(nextStart),
      },
    };
  }

  if (key === previousLane || key === nextLane) {
    if (lockLane) return null;
    const target = lanes[laneIndex + (key === nextLane ? 1 : -1)];
    if (!target) return null;
    if (ownLane) {
      return { action: "move", range: { ...range, lane: target.id } };
    }
    const shiftBy = target.start.getTime() - lane.start.getTime();
    return {
      action: "move",
      range: {
        end: new Date(end + shiftBy),
        lane: target.id,
        start: new Date(start + shiftBy),
      },
    };
  }
  return null;
}

/**
 * Places items with a start and an end on lanes of time, such as the days of
 * a calendar week or the rows of a gantt chart, and lets people move, resize
 * and create them by mouse, touch and keyboard.
 */
export function useTimeGrid<Item extends TimeGridItem>(
  options: UseTimeGridOptions<Item>,
): UseTimeGridReturn<Item> {
  const {
    lanes,
    value: valueProp,
    defaultValue,
    orientation = "vertical",
    overlap = "split",
    disabled = false,
    instructions = DEFAULT_INSTRUCTIONS,
  } = options;

  const [uncontrolledValue, setUncontrolledValue] = useState<readonly Item[]>(
    () => defaultValue ?? [],
  );
  const committed = valueProp ?? uncontrolledValue;
  const [drag, setDrag] = useState<Drag<Item> | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const instructionsId = useId();

  const preview = useMemo(
    (): Item[] =>
      committed.map((item) =>
        drag && `${item.id}` === drag.id ? applyRange(item, drag.to) : item,
      ),
    [committed, drag],
  );

  const layout = useMemo(() => {
    const segments = layoutTimeGrid(preview, lanes);
    const firstLane = new Map<string, string>();
    for (const lane of lanes) {
      for (const segment of segments[lane.id] ?? []) {
        if (!firstLane.has(segment.id)) firstLane.set(segment.id, lane.id);
      }
    }
    return { firstLane, segments };
  }, [preview, lanes]);

  const draftSegments = useMemo(() => {
    if (!draft) return {};
    const item: TimeGridDraftItem & { lane?: string } = {
      end: new Date(draft.end),
      id: "draft",
      start: new Date(draft.start),
    };
    if (lanesShareTime(lanes)) item.lane = draft.lane;
    return layoutTimeGrid([item], lanes);
  }, [draft, lanes]);

  const latest = useRef<Latest<Item>>(null as unknown as Latest<Item>);
  latest.current = { committed, options, preview };
  const dragRef = useRef<Drag<Item> | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const focusRef = useRef<string | null>(null);
  const refs = useRef(new Map<string, TimeGridRef>()).current;
  const elements = useRef({
    item: new Map<string, HTMLElement>(),
    lane: new Map<string, HTMLElement>(),
  }).current;

  const [controller] = useState(() => {
    let session: Session | null = null;
    let frame = 0;
    let dragStyle: HTMLStyleElement | null = null;

    const getLane = (id: string): TimeGridLane | undefined =>
      latest.current.options.lanes.find((lane) => lane.id === id);

    const getStep = (): number => latest.current.options.step ?? DEFAULT_STEP;

    const round = (time: number, lane: TimeGridLane): number => {
      const { snap } = latest.current.options;
      return snap
        ? snap(time, lane)
        : snapTime(time, lane.start.getTime(), getStep());
    };

    const setCursor = (refused: boolean, kind: Kind): void => {
      if (!dragStyle) return;
      const vertical =
        (latest.current.options.orientation ?? "vertical") === "vertical";
      const cursor = refused
        ? "not-allowed"
        : kind === "move"
          ? "grabbing"
          : vertical
            ? "ns-resize"
            : "ew-resize";
      dragStyle.textContent = `*, *::before, *::after { cursor: ${cursor} !important; user-select: none !important; -webkit-user-select: none !important; }`;
    };

    const setDragState = (next: Drag<Item> | null): void => {
      dragRef.current = next;
      setDrag(next);
      if (next) setCursor(next.refused, next.action);
    };

    const setDraftState = (next: Draft | null): void => {
      draftRef.current = next;
      setDraft(next);
    };

    const timeAt = (point: Point, laneId: string): number | null => {
      const lane = getLane(laneId);
      const element = elements.lane.get(laneId);
      if (!lane || !element) return null;
      const rect = element.getBoundingClientRect();
      const vertical =
        (latest.current.options.orientation ?? "vertical") === "vertical";
      const length = vertical ? rect.height : rect.width;
      let distance = point.y - rect.top;
      if (!vertical) {
        distance = isRtl(element) ? rect.right - point.x : point.x - rect.left;
      }
      const fraction =
        length > 0 ? Math.min(Math.max(distance / length, 0), 1) : 0;
      const start = lane.start.getTime();
      return start + fraction * (lane.end.getTime() - start);
    };

    const laneAt = (point: Point): string | null => {
      const vertical =
        (latest.current.options.orientation ?? "vertical") === "vertical";
      let nearest: string | null = null;
      let smallest = Number.POSITIVE_INFINITY;
      for (const lane of latest.current.options.lanes) {
        const rect = elements.lane.get(lane.id)?.getBoundingClientRect();
        if (!rect) continue;
        const [low, high, at] = vertical
          ? [rect.left, rect.right, point.x]
          : [rect.top, rect.bottom, point.y];
        const distance = at < low ? low - at : at > high ? at - high : 0;
        if (distance < smallest) {
          nearest = lane.id;
          smallest = distance;
        }
      }
      return nearest;
    };

    const laneOfTime = (time: number, fallback?: string): string | undefined =>
      latest.current.options.lanes.find(
        (lane) => time >= lane.start.getTime() && time < lane.end.getTime(),
      )?.id ?? fallback;

    const toChange = (
      current: Drag<Item>,
      to: Range,
    ): TimeGridChange<Item> => ({
      action: getAction(current.from, to),
      from: toPublicRange(current.from),
      item: current.item,
      to: toPublicRange(to),
    });

    const isAllowed = (current: Drag<Item>, to: Range): boolean => {
      const { canChange } = latest.current.options;
      return (
        !canChange ||
        sameRange(current.from, to) ||
        canChange(toChange(current, to))
      );
    };

    const announce = (
      type: TimeGridEvent<Item>["type"],
      current: Drag<Item>,
      to: Range,
    ): void => {
      const { options } = latest.current;
      const change = toChange(current, to);
      const event: TimeGridEvent<Item> = {
        ...change,
        action: type === "move" ? current.action : change.action,
        reason: current.reason,
        type,
      };
      let message: string | undefined;
      if (options.getAnnouncement) {
        message = options.getAnnouncement(event);
      } else {
        const label = options.getItemLabel?.(current.item) ?? current.id;
        const time = (options.formatRange ?? defaultFormatRange)(
          new Date(to.start),
          new Date(to.end),
        );
        const where =
          to.lane === undefined
            ? time
            : `${time}, ${options.getLaneLabel?.(to.lane) ?? to.lane}`;
        message = getMessage(type, event.action, label, where);
      }
      if (!message) return;
      setAnnouncement((previous) =>
        previous === message ? `${message} ` : (message as string),
      );
    };

    const begin = (
      id: string,
      reason: TimeGridReason,
      action: TimeGridAction,
    ): Drag<Item> | null => {
      const item = latest.current.committed.find(
        (entry) => `${entry.id}` === id,
      );
      if (!item) return null;
      const from = toRange(item);
      return { action, from, id, item, reason, refused: false, to: from };
    };

    const finish = (commit: boolean): void => {
      const pending = draftRef.current;
      if (pending) {
        setDraftState(null);
        if (commit) {
          latest.current.options.onCreate?.({
            end: new Date(pending.end),
            lane: pending.lane,
            start: new Date(pending.start),
          });
        }
        return;
      }
      const current = dragRef.current;
      if (!current) return;
      const { committed, options } = latest.current;
      setDragState(null);
      const index = committed.findIndex((item) => `${item.id}` === current.id);
      if (index === -1) return;
      const original = committed[index] as Item;
      const from = toRange(original);
      const changed =
        commit && !current.refused && !sameRange(from, current.to);
      if (changed) {
        const next = committed.map((item, at) =>
          at === index ? applyRange(item, current.to) : item,
        );
        if (options.value === undefined) setUncontrolledValue(next);
        options.onValueChange?.(next, {
          ...toChange({ ...current, from }, current.to),
          reason: current.reason,
        });
      }
      announce(
        changed ? "drop" : "cancel",
        { ...current, from },
        changed ? current.to : from,
      );
    };

    const updateDraft = (point: Point): void => {
      const pending = draftRef.current;
      if (!pending) return;
      const anchorLane = getLane(pending.lane);
      const shared = lanesShareTime(latest.current.options.lanes);
      const pointerLaneId = shared ? pending.lane : laneAt(point);
      const pointerLane = pointerLaneId ? getLane(pointerLaneId) : undefined;
      const time = pointerLaneId ? timeAt(point, pointerLaneId) : null;
      if (!anchorLane || !pointerLane || time === null) return;
      const step = getStep();
      const floor = (value: number, lane: TimeGridLane): number =>
        round(value - step / 2, lane);
      const first = floor(pending.anchor, anchorLane);
      const second = floor(time, pointerLane);
      const start = Math.min(first, second);
      const last = Math.max(first, second);
      const lastLane = last === first ? anchorLane : pointerLane;
      const minDuration = latest.current.options.minDuration ?? step;
      const end = Math.max(round(last + step, lastLane), start + minDuration);
      if (start !== pending.start || end !== pending.end) {
        setDraftState({ ...pending, end, start });
      }
    };

    const update = (): void => {
      if (!session) return;
      if (draftRef.current) {
        updateDraft(session.point);
        return;
      }
      const current = dragRef.current;
      if (
        !current ||
        current.reason !== "pointer" ||
        current.grab === undefined
      ) {
        return;
      }
      const { options } = latest.current;
      const laneId = options.lockLane
        ? session.lane
        : (laneAt(session.point) ?? session.lane);
      const lane = getLane(laneId);
      const time = timeAt(session.point, laneId);
      if (!lane || time === null) return;

      const { from } = current;
      const minDuration = options.minDuration ?? getStep();
      let to: Range;
      if (current.action === "move") {
        const start = round(from.start + time - current.grab, lane);
        to = { end: start + from.end - from.start, start };
        if (from.lane !== undefined) {
          to.lane = options.lockLane ? from.lane : laneId;
        }
      } else if (current.action === "resize-end") {
        const end = Math.max(round(time, lane), from.start + minDuration);
        to = { ...from, end };
      } else {
        const start = Math.min(round(time, lane), from.end - minDuration);
        to = { ...from, start };
      }

      const same = sameRange(to, current.to);
      if (isAllowed(current, to)) {
        if (!same || current.refused) {
          setDragState({ ...current, refused: false, to });
        }
      } else if (!same || !current.refused) {
        const wasRefused = current.refused;
        setDragState({ ...current, refused: true, to });
        if (!wasRefused) announce("refuse", current, to);
      }
    };

    const tick = (): void => {
      frame = 0;
      if (!session || (!dragRef.current && !draftRef.current)) return;
      const scrolled =
        latest.current.options.autoScroll !== false &&
        scrollNearEdges(session.point);
      update();
      if (scrolled) schedule();
    };

    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const isDragging = (): boolean =>
      dragRef.current?.reason === "pointer" || draftRef.current !== null;

    const preventTouchScroll = (event: TouchEvent): void => {
      if (isDragging()) event.preventDefault();
    };

    const endSession = (): void => {
      if (!session) return;
      clearTimeout(session.timer);
      session.element.removeEventListener("touchmove", preventTouchScroll);
      for (const type of WINDOW_EVENTS) {
        window.removeEventListener(type, onWindowEvent, true);
      }
      cancelAnimationFrame(frame);
      frame = 0;
      session = null;
      if (!dragStyle) return;
      dragStyle.remove();
      dragStyle = null;
      const stopClick = (event: Event): void => {
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener("click", stopClick, {
        capture: true,
        once: true,
      });
      setTimeout(() => window.removeEventListener("click", stopClick, true), 0);
    };

    const activate = (): void => {
      if (!session) return;
      const grab = timeAt(session.start, session.lane);
      if (grab === null) {
        endSession();
        return;
      }
      dragStyle = document.createElement("style");
      document.head.append(dragStyle);
      window.getSelection()?.removeAllRanges();

      if (session.kind === "create") {
        setCursor(false, "create");
        draftRef.current = {
          anchor: grab,
          end: grab,
          lane: session.lane,
          start: grab,
        };
        updateDraft(session.start);
        schedule();
        return;
      }

      const current = begin(session.id, "pointer", session.kind);
      if (!current) {
        endSession();
        return;
      }
      const next = { ...current, grab };
      setDragState(next);
      announce("start", next, next.from);
      schedule();
    };

    function onWindowEvent(event: Event): void {
      if (!session) return;
      const dragging = isDragging();
      switch (event.type) {
        case "scroll":
          if (dragging) schedule();
          return;
        case "selectstart":
        case "contextmenu":
          if (dragging || session.touch) event.preventDefault();
          return;
        case "dragstart":
          event.preventDefault();
          return;
        case "keydown":
          if (dragging && (event as KeyboardEvent).key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(false);
            endSession();
          }
          return;
      }

      const pointer = event as PointerEvent;
      if (pointer.pointerId !== session.pointerId) return;
      session.point = { x: pointer.clientX, y: pointer.clientY };
      if (event.type === "pointermove") {
        const { point, start, touch } = session;
        const distance = Math.hypot(point.x - start.x, point.y - start.y);
        if (dragging) schedule();
        else if (distance > (touch ? TOUCH_TOLERANCE : DRAG_DISTANCE)) {
          if (touch) endSession();
          else activate();
        }
        return;
      }
      if (dragging) {
        if (event.type === "pointerup") update();
        finish(event.type === "pointerup");
      }
      endSession();
    }

    const onPointerDown = (
      event: React.PointerEvent<HTMLElement>,
      kind: Kind,
      id: string,
      lane: string,
    ): void => {
      const element = event.currentTarget;
      const target = event.target as Element;
      const ignored = target.closest?.(IGNORE_SELECTOR);
      if (
        claimedEvents.has(event.nativeEvent) ||
        latest.current.options.disabled ||
        session ||
        dragRef.current ||
        !event.isPrimary ||
        event.button !== 0 ||
        (ignored && ignored !== element && element.contains(ignored)) ||
        (kind === "create" && target.closest?.(ITEM_SELECTOR))
      ) {
        return;
      }
      claimedEvents.add(event.nativeEvent);
      const start = { x: event.clientX, y: event.clientY };
      const touch = event.pointerType === "touch";
      session = {
        element,
        id,
        kind,
        lane,
        point: start,
        pointerId: event.pointerId,
        start,
        touch,
      };
      for (const type of WINDOW_EVENTS) {
        window.addEventListener(type, onWindowEvent, true);
      }
      if (touch) {
        element.addEventListener("touchmove", preventTouchScroll, {
          passive: false,
        });
        session.timer = setTimeout(activate, TOUCH_DELAY);
      }
    };

    const onKeyDown = (
      event: React.KeyboardEvent<HTMLElement>,
      id: string,
      segmentLane: string,
    ): void => {
      const current = dragRef.current;
      const toggle = event.key === " " || event.key === "Enter";
      if (latest.current.options.disabled || draftRef.current) return;

      if (!current) {
        const pickUpKeys = latest.current.options.pickUpKeys ?? [" ", "Enter"];
        if (
          !pickUpKeys.includes(event.key) ||
          event.repeat ||
          event.target !== event.currentTarget
        ) {
          return;
        }
        event.preventDefault();
        const next = begin(id, "keyboard", "move");
        if (!next) return;
        focusRef.current = id;
        setDragState(next);
        announce("start", next, next.from);
        return;
      }

      if (current.reason !== "keyboard" || current.id !== id) return;
      if (toggle || event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        if (event.key === "Escape") finish(false);
        else if (toggle && !event.repeat) finish(true);
        return;
      }

      const { options } = latest.current;
      const ownLane = current.from.lane !== undefined;
      const lane = ownLane
        ? (current.to.lane as string)
        : (laneOfTime(current.to.start, segmentLane) as string);
      const change = getTimeGridKeyboardChange(
        {
          end: new Date(current.to.end),
          lane,
          start: new Date(current.to.start),
        },
        event.key,
        {
          alt: event.altKey,
          direction: isRtl(event.currentTarget) ? "rtl" : "ltr",
          lanes: options.lanes,
          lockLane: options.lockLane,
          minDuration: options.minDuration,
          orientation: options.orientation,
          ownLane,
          shift: event.shiftKey,
          snap: options.snap,
          step: options.step,
        },
      );
      if (event.key.startsWith("Arrow")) event.preventDefault();
      if (!change) return;
      const to: Range = {
        end: change.range.end.getTime(),
        start: change.range.start.getTime(),
      };
      if (ownLane) to.lane = change.range.lane;
      const moved = { ...current, action: change.action };
      if (isAllowed(moved, to)) {
        setDragState({ ...moved, refused: false, to });
        announce("move", moved, to);
      } else {
        setDragState({ ...moved, refused: true });
        announce("refuse", moved, to);
      }
    };

    return { dispose: endSession, finish, onKeyDown, onPointerDown };
  });

  const getRef = (kind: keyof typeof elements, key: string): TimeGridRef => {
    const cacheKey = `${kind}:${key}`;
    let ref = refs.get(cacheKey);
    if (!ref) {
      const map = elements[kind];
      ref = (element: HTMLElement | null): ReturnType<TimeGridRef> => {
        if (!element) return;
        map.set(key, element);
        return () => {
          if (map.get(key) === element) map.delete(key);
        };
      };
      refs.set(cacheKey, ref);
    }
    return ref;
  };

  useEffect(() => controller.dispose, [controller]);

  useEffect(() => {
    const current = dragRef.current;
    const missing =
      current && !committed.some((item) => `${item.id}` === current.id);
    if (current && (disabled || missing)) controller.finish(false);
  }, [committed, controller, disabled]);

  const keyboardDragging = drag?.reason === "keyboard";
  useEffect(() => {
    if (!keyboardDragging) return;
    const cancel = (): void => controller.finish(false);
    window.addEventListener("pointerdown", cancel, true);
    return () => window.removeEventListener("pointerdown", cancel, true);
  }, [controller, keyboardDragging]);

  useIsoLayoutEffect(() => {
    const id = focusRef.current;
    if (!id) return;
    const lane =
      drag?.id === id && drag.to.lane !== undefined
        ? drag.to.lane
        : lanes.find((entry) =>
            layout.segments[entry.id]?.some(
              (segment) => segment.id === id && !segment.startsBefore,
            ),
          )?.id;
    const element =
      (lane && elements.item.get(`${id}\n${lane}`)) ||
      elements.item.get(`${id}\n${layout.firstLane.get(id)}`);
    if (element) {
      if (document.activeElement !== element) {
        element.focus({ preventScroll: true });
      }
      element.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
    if (!dragRef.current) focusRef.current = null;
  }, [drag, layout]);

  const getSegmentStyle = (
    segment: TimeGridSegment<unknown>,
  ): React.CSSProperties =>
    getTimeGridSegmentStyle(segment, { orientation, overlap });

  const publicDrag = drag
    ? {
        ...drag,
        action: getAction(drag.from, drag.to),
        from: toPublicRange(drag.from),
        to: toPublicRange(drag.to),
      }
    : null;

  return {
    active: publicDrag
      ? {
          action: publicDrag.action,
          from: publicDrag.from,
          id: publicDrag.id,
          item: publicDrag.item,
          reason: publicDrag.reason,
          refused: publicDrag.refused,
          to: publicDrag.to,
        }
      : null,
    draft: draft
      ? {
          end: new Date(draft.end),
          lane: draft.lane,
          start: new Date(draft.start),
        }
      : null,
    getAnnouncerProps: (): TimeGridProps => ({
      children: [
        createElement(
          "span",
          { id: instructionsId, key: "instructions" },
          instructions,
        ),
        createElement(
          "span",
          {
            "aria-atomic": true,
            "aria-live": "assertive",
            key: "announcement",
            role: "status",
          },
          announcement,
        ),
      ],
      style: visuallyHidden,
    }),
    getDraftSegments: (lane: string): TimeGridSegment<TimeGridDraftItem>[] =>
      draftSegments[lane] ?? [],
    getItemProps: (segment: TimeGridSegment<Item>): TimeGridProps => {
      const { id, lane } = segment;
      const dragging = drag?.id === id;
      const first = layout.firstLane.get(id) === lane;
      return {
        "aria-describedby": instructionsId,
        "aria-disabled": disabled || undefined,
        "aria-pressed":
          dragging && drag?.reason === "keyboard" ? true : undefined,
        "aria-roledescription": "draggable",
        "data-action": dragging ? publicDrag?.action : undefined,
        "data-dragging": dragging ? "" : undefined,
        "data-ends-after": segment.endsAfter ? "" : undefined,
        "data-refused": dragging && drag?.refused ? "" : undefined,
        "data-starts-before": segment.startsBefore ? "" : undefined,
        "data-time-grid-item": "",
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>): void =>
          controller.onKeyDown(event, id, lane),
        onPointerDown: (event: React.PointerEvent<HTMLElement>): void =>
          controller.onPointerDown(event, "move", id, lane),
        ref: getRef("item", `${id}\n${lane}`),
        role: "button",
        style: {
          ...getSegmentStyle(segment),
          WebkitTouchCallout: "none",
        },
        tabIndex: disabled || !first ? -1 : 0,
      };
    },
    getLaneProps: (lane: string): TimeGridProps => ({
      "data-time-grid-lane": "",
      onPointerDown: options.onCreate
        ? (event: React.PointerEvent<HTMLElement>): void =>
            controller.onPointerDown(event, "create", lane, lane)
        : undefined,
      ref: getRef("lane", lane),
    }),
    getResizeHandleProps: (
      segment: TimeGridSegment<Item>,
      edge: "start" | "end",
    ): TimeGridProps => {
      const cut = edge === "start" ? segment.startsBefore : segment.endsAfter;
      if (cut || disabled) return { style: { display: "none" } };
      const vertical = orientation === "vertical";
      return {
        "aria-hidden": true,
        "data-time-grid-handle": edge,
        onPointerDown: (event: React.PointerEvent<HTMLElement>): void =>
          controller.onPointerDown(
            event,
            edge === "start" ? "resize-start" : "resize-end",
            segment.id,
            segment.lane,
          ),
        style: {
          cursor: vertical ? "ns-resize" : "ew-resize",
          touchAction: "none",
        },
      };
    },
    getSegments: (lane: string): TimeGridSegment<Item>[] =>
      layout.segments[lane] ?? [],
    getSegmentStyle,
    value: preview,
  };
}
