/**
 * Named colors for calendar events, gantt bars and bookings. Any CSS color
 * also works wherever a color name is accepted.
 */
export const eventColors = {
  blue: "var(--color-blue-500)",
  sky: "var(--color-sky-500)",
  teal: "var(--color-teal-500)",
  green: "var(--color-emerald-500)",
  amber: "var(--color-amber-500)",
  orange: "var(--color-orange-500)",
  red: "var(--color-rose-500)",
  pink: "var(--color-pink-500)",
  violet: "var(--color-violet-500)",
  gray: "var(--color-zinc-500)",
} as const;

export type EventColor = keyof typeof eventColors;

export const eventColorNames: EventColor[] = Object.keys(
  eventColors,
) as EventColor[];

/** The CSS color for a color name, or the value itself if it is not a name. */
export function resolveEventColor(color?: string, fallback = "blue"): string {
  const value = color ?? fallback;
  return value in eventColors ? eventColors[value as EventColor] : value;
}

/**
 * Classes for an event surface tinted by `--event-color`: a soft fill, a
 * solid start edge and readable text in light and dark mode.
 */
export const eventSurfaceClassName =
  "border border-[color-mix(in_oklab,var(--event-color)_28%,transparent)] border-s-[3px] border-s-(--event-color) bg-[color-mix(in_oklab,var(--event-color)_14%,var(--background))] text-foreground dark:bg-[color-mix(in_oklab,var(--event-color)_22%,var(--background))]";
