# coss Resource Scheduler

## When to use

- Booking shared resources: meeting rooms, desks, equipment, vehicles.
- People over time: on-call rotas, shifts, interview loops, availability.
- Prevents double booking and respects blocked times.
- Not for a personal calendar of events; use Event Calendar.

## Install

```bash
npx shadcn@latest add @coss/resource-scheduler
```

Brings `useTimeGrid`, `event-colors` and the coss parts it uses. Manual deps: `date-fns`, `lucide-react`.

## Canonical imports

```tsx
import {
  ResourceScheduler,
  type SchedulerBooking,
  type SchedulerResource,
} from "@/components/ui/resource-scheduler"
```

## Minimal pattern

```tsx
const [bookings, setBookings] = useState<SchedulerBooking[]>(initial)

<ResourceScheduler resources={rooms} bookings={bookings} onBookingsChange={setBookings} />
```

## Data shape

- `SchedulerResource`: `{ id, name, description?, image?, color?, capacity?, unavailable?, readOnly? }`; `unavailable` is a list of `{ start, end, reason? }`.
- `SchedulerBooking`: `{ id, resourceId, title, start, end, color?, status?, bookedBy?, notes?, readOnly? }`.
- Cancelled bookings never block time.

## Patterns from coss particles

### Key patterns

Rooms as columns for one day:

```tsx
<ResourceScheduler layout="columns" views={["day"]} title="Meeting rooms" labels={{ resources: "Rooms" }} />
```

Weekly rota with hour steps:

```tsx
<ResourceScheduler defaultView="week" stepMinutes={60} labels={{ resources: "People", newBooking: "Add shift" }} />
```

Interview loop with blocked lunch:

```tsx
const interviewers = people.map((person) => ({
  ...person,
  unavailable: [{ start: lunchStart, end: lunchEnd, reason: "Lunch" }],
}))
```

### More examples

- `p-resource-scheduler-1`, `p-resource-scheduler-2`, `p-resource-scheduler-3`

## Common pitfalls

- Expecting columns in the week view or on phones; both always use rows.
- Allowing overlaps by accident: overlaps are refused unless `allowOverlap` is set; unavailable times are refused either way.
- Long booking titles in short slots get cut; keep titles short (the stage, the purpose) and put people in `bookedBy`.

## Useful particle references

- meeting rooms with seats and a blocked clean: `p-resource-scheduler-1`
- weekly on-call rota with night shifts and vacation: `p-resource-scheduler-2`
- interview loop with candidate card and stage colors: `p-resource-scheduler-3`
