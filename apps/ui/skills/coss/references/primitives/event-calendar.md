# coss Event Calendar

## When to use

- A full calendar of events: team calendars, personal schedules, content or release calendars, bookings shown by day.
- Day, week, month and agenda views with drag to move, resize and create, plus a details card and an editor.
- Not for picking a date in a form; use Calendar or a date picker for that.

## Install

```bash
npx shadcn@latest add @coss/event-calendar
```

Brings `useTimeGrid`, `event-colors` and the coss parts it uses. Manual deps: `date-fns`, `lucide-react`.

## Canonical imports

```tsx
import {
  type CalendarEvent,
  type CalendarSource,
  EventCalendar,
} from "@/components/ui/event-calendar"
```

## Minimal pattern

```tsx
const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)

<EventCalendar
  calendars={[{ id: "work", name: "Work", color: "blue" }]}
  events={events}
  onEventsChange={setEvents}
/>
```

## Data shape

- `CalendarEvent`: `{ id, title, start, end, allDay?, calendarId?, color?, location?, description?, status?, attendees?, readOnly? }`.
- `end` is exclusive. For all-day events it is the midnight after the last day.
- `status`: `"tentative"` is striped, `"cancelled"` is struck through.
- Colors: a palette name (`blue`, `sky`, `teal`, `green`, `amber`, `orange`, `red`, `pink`, `violet`, `gray`) or any CSS color. Event color overrides calendar color.

## Patterns from coss particles

### Key patterns

Sidebar that shows or hides calendars, with a mini month driving the date:

```tsx
<Calendar mode="single" selected={date} onSelect={(day) => day && setDate(day)} />
<EventCalendar
  calendars={calendars}
  date={date}
  onDateChange={setDate}
  events={events}
  onEventsChange={setEvents}
  hiddenCalendars={hidden}
  onHiddenCalendarsChange={setHidden}
/>
```

Month-first content calendar with locked published items:

```tsx
<EventCalendar defaultView="month" views={["month", "agenda"]} labels={{ newEvent: "New post" }} />
```

Loading from a synced calendar (Google, Apple, CalDAV) for the dates on screen:

```tsx
<EventCalendar onRangeChange={({ start, end }) => load(start, end)} />
```

### More examples

- `p-event-calendar-1`, `p-event-calendar-2`

## Common pitfalls

- Passing a filtered event list and saving `onEventsChange` back over the full list loses the hidden events. Pass all events and hide calendars with `hiddenCalendars`.
- Using an inclusive `end` for all-day events; it must be the midnight after the last day.
- Creating dates relative to `new Date()` during server rendering causes hydration mismatches; build sample data after mount, or pass fixed dates and `now`.
- Expecting recurring events to expand themselves; pass one event per occurrence.

## Useful particle references

- team calendar with sidebar and calendar toggles: `p-event-calendar-1`
- content calendar by channel, drafts and locked posts: `p-event-calendar-2`
