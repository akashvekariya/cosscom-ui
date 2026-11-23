import { describe, expect, it } from "bun:test";
import {
  getTimeGridKeyboardChange,
  getTimeGridSegmentStyle,
  layoutTimeGrid,
  snapTime,
  type TimeGridLane,
} from "../../registry/default/hooks/use-time-grid";

const HOUR = 3_600_000;
const MINUTE = 60_000;

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 10, day, hour, minute);
}

const week: TimeGridLane[] = [23, 24, 25].map((day) => ({
  end: at(day + 1, 0),
  id: `day-${day}`,
  start: at(day, 0),
}));

const rows: TimeGridLane[] = ["design", "build"].map((id) => ({
  end: at(30, 0),
  id,
  start: at(23, 0),
}));

describe("snapTime", () => {
  it("rounds to the nearest step from the origin", () => {
    const origin = at(23, 0).getTime();
    const time = at(23, 10, 7).getTime();
    expect(snapTime(time, origin, 15 * MINUTE)).toBe(at(23, 10, 0).getTime());
    expect(snapTime(at(23, 10, 8).getTime(), origin, 15 * MINUTE)).toBe(
      at(23, 10, 15).getTime(),
    );
  });

  it("leaves the time alone without a step", () => {
    expect(snapTime(123, 0, 0)).toBe(123);
  });
});

describe("layoutTimeGrid", () => {
  it("places an item by its time inside its lane", () => {
    const layout = layoutTimeGrid(
      [{ end: at(23, 12), id: 1, start: at(23, 6) }],
      week,
    );
    const [segment] = layout["day-23"] ?? [];
    expect(segment?.offset).toBe(0.25);
    expect(segment?.size).toBe(0.25);
    expect(layout["day-24"]).toEqual([]);
  });

  it("cuts an item that crosses midnight into two pieces", () => {
    const layout = layoutTimeGrid(
      [{ end: at(24, 2), id: "late", start: at(23, 22) }],
      week,
    );
    const first = layout["day-23"]?.[0];
    const second = layout["day-24"]?.[0];
    expect(first?.endsAfter).toBe(true);
    expect(first?.startsBefore).toBe(false);
    expect(second?.startsBefore).toBe(true);
    expect(second?.offset).toBe(0);
    expect(second?.size).toBeCloseTo((2 * HOUR) / (24 * HOUR));
  });

  it("puts overlapping items side by side and reuses free tracks", () => {
    const layout = layoutTimeGrid(
      [
        { end: at(23, 11), id: "a", start: at(23, 9) },
        { end: at(23, 10), id: "b", start: at(23, 9, 30) },
        { end: at(23, 11, 30), id: "c", start: at(23, 10) },
        { end: at(23, 13), id: "d", start: at(23, 12) },
      ],
      week,
    );
    const byId = Object.fromEntries(
      (layout["day-23"] ?? []).map((segment) => [segment.id, segment]),
    );
    expect(byId.a?.track).toBe(0);
    expect(byId.b?.track).toBe(1);
    expect(byId.c?.track).toBe(1);
    expect(byId.a?.tracks).toBe(2);
    expect(byId.d?.track).toBe(0);
    expect(byId.d?.tracks).toBe(1);
  });

  it("widens a piece into tracks that are free beside it", () => {
    const layout = layoutTimeGrid(
      [
        { end: at(23, 11), id: "q", start: at(23, 9) },
        { end: at(23, 10), id: "p", start: at(23, 9) },
        { end: at(23, 11), id: "r", start: at(23, 10) },
        { end: at(23, 11), id: "s", start: at(23, 10, 30) },
      ],
      week,
    );
    const byId = Object.fromEntries(
      (layout["day-23"] ?? []).map((segment) => [segment.id, segment]),
    );
    expect(byId.q?.tracks).toBe(3);
    expect(byId.p?.track).toBe(1);
    expect(byId.p?.span).toBe(2);
    expect(byId.r?.span).toBe(1);
    expect(byId.s?.span).toBe(1);
  });

  it("treats touching items as not overlapping", () => {
    const layout = layoutTimeGrid(
      [
        { end: at(23, 10), id: "a", start: at(23, 9) },
        { end: at(23, 11), id: "b", start: at(23, 10) },
      ],
      week,
    );
    expect(layout["day-23"]?.map((segment) => segment.tracks)).toEqual([1, 1]);
  });

  it("keeps items with a lane in that lane only", () => {
    const layout = layoutTimeGrid(
      [{ end: at(25, 0), id: "t1", lane: "build", start: at(24, 0) }],
      rows,
    );
    expect(layout.design).toEqual([]);
    expect(layout.build?.[0]?.offset).toBeCloseTo(1 / 7);
  });

  it("shows a milestone with no length", () => {
    const layout = layoutTimeGrid(
      [{ end: at(26, 0), id: "m", lane: "design", start: at(26, 0) }],
      rows,
    );
    expect(layout.design?.[0]?.size).toBe(0);
  });
});

describe("getTimeGridSegmentStyle", () => {
  const segment = { offset: 0.25, size: 0.5, track: 1, tracks: 2 };

  it("splits overlapping items across the lane", () => {
    const style = getTimeGridSegmentStyle(segment);
    expect(style.top).toBe("25%");
    expect(style.height).toBe("50%");
    expect(style.insetInlineStart).toBe("50%");
    expect(style.width).toBe("50%");
  });

  it("stacks items with a fixed track size when horizontal", () => {
    const style = getTimeGridSegmentStyle(segment, {
      orientation: "horizontal",
      overlap: "stack",
    });
    expect(style.insetInlineStart).toBe("25%");
    expect(style.width).toBe("50%");
    expect(style.top).toBe("calc(1 * var(--time-grid-track-size, 1.5rem))");
  });
});

describe("getTimeGridKeyboardChange", () => {
  const range = { end: at(23, 10), lane: "day-23", start: at(23, 9) };

  it("moves later by one step", () => {
    const change = getTimeGridKeyboardChange(range, "ArrowDown", {
      lanes: week,
    });
    expect(change?.action).toBe("move");
    expect(change?.range.start).toEqual(at(23, 9, 15));
    expect(change?.range.end).toEqual(at(23, 10, 15));
  });

  it("changes the end with Shift and the start with Alt", () => {
    const end = getTimeGridKeyboardChange(range, "ArrowUp", {
      lanes: week,
      shift: true,
    });
    expect(end?.action).toBe("resize-end");
    expect(end?.range.end).toEqual(at(23, 9, 45));
    const start = getTimeGridKeyboardChange(range, "ArrowUp", {
      alt: true,
      lanes: week,
    });
    expect(start?.action).toBe("resize-start");
    expect(start?.range.start).toEqual(at(23, 8, 45));
  });

  it("never resizes below the shortest length", () => {
    const short = { ...range, end: at(23, 9, 15) };
    expect(
      getTimeGridKeyboardChange(short, "ArrowUp", { lanes: week, shift: true }),
    ).toBeNull();
  });

  it("moves to the next day at the same time", () => {
    const change = getTimeGridKeyboardChange(range, "ArrowRight", {
      lanes: week,
    });
    expect(change?.range.lane).toBe("day-24");
    expect(change?.range.start).toEqual(at(24, 9));
  });

  it("flips lane arrows in right-to-left layouts", () => {
    const change = getTimeGridKeyboardChange(range, "ArrowLeft", {
      direction: "rtl",
      lanes: week,
    });
    expect(change?.range.lane).toBe("day-24");
  });

  it("changes only the lane for items with their own lane", () => {
    const task = { end: at(25, 0), lane: "design", start: at(24, 0) };
    const change = getTimeGridKeyboardChange(task, "ArrowDown", {
      lanes: rows,
      orientation: "horizontal",
      ownLane: true,
      step: 24 * HOUR,
    });
    expect(change?.range.lane).toBe("build");
    expect(change?.range.start).toEqual(at(24, 0));
    const later = getTimeGridKeyboardChange(task, "ArrowRight", {
      lanes: rows,
      orientation: "horizontal",
      ownLane: true,
      step: 24 * HOUR,
    });
    expect(later?.range.start).toEqual(at(25, 0));
  });

  it("stays in the lane when lanes are locked", () => {
    expect(
      getTimeGridKeyboardChange(range, "ArrowRight", {
        lanes: week,
        lockLane: true,
      }),
    ).toBeNull();
  });
});
