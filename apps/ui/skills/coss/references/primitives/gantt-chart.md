# coss Gantt Chart

## When to use

- Project plans, roadmaps, release schedules: tasks over days, weeks or months.
- Grouped tasks, progress, milestones and finish-to-start dependencies.
- Not for hourly scheduling of people or rooms; use Resource Scheduler.

## Install

```bash
npx shadcn@latest add @coss/gantt-chart
```

Brings `useTimeGrid`, `event-colors` and the coss parts it uses. Manual deps: `date-fns`, `lucide-react`.

## Canonical imports

```tsx
import {
  GanttChart,
  type GanttGroup,
  type GanttTask,
} from "@/components/ui/gantt-chart"
```

## Minimal pattern

```tsx
const [tasks, setTasks] = useState<GanttTask[]>(initialTasks)

<GanttChart title="Website relaunch" groups={groups} tasks={tasks} onTasksChange={setTasks} />
```

## Data shape

- `GanttTask`: `{ id, name, start, end, progress?, color?, groupId?, dependencies?, assignee?, readOnly? }`.
- `end` is exclusive (the midnight after the last day). `start` equal to `end` makes a milestone.
- `progress` is 0 to 1. `dependencies` lists ids of tasks that must finish first.
- `GanttGroup`: `{ id, name, color? }`, shown in the given order.

## Patterns from coss particles

### Key patterns

Start zoomed out to see a whole quarter:

```tsx
<GanttChart defaultZoom="week" tasks={tasks} onTasksChange={setTasks} />
```

Read-only roadmap:

```tsx
<GanttChart editable={false} tasks={tasks} />
```

### More examples

- `p-gantt-chart-1`

## Common pitfalls

- Using an inclusive `end`; a one-day task ends at the next midnight.
- Expecting the chart to reschedule dependent tasks; it only shows conflicts (red arrow, outline, "Overlaps" badge). Reschedule in `onTasksChange` if needed.
- Dependency ids that point at missing tasks are ignored.

## Useful particle references

- project plan with groups, progress, milestone and dependencies: `p-gantt-chart-1`
