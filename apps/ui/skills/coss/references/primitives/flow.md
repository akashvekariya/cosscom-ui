# coss Flow

## When to use

- Showing a workflow or automation as steps stacked top to bottom: a trigger, actions, waits, checks with Yes and No paths.
- Read-only views, a runs view with counts on steps, or a design view with add buttons on the lines.
- Not a free-form node editor: no pan, zoom, dragging or positions.

## Install

```bash
npx shadcn@latest add @coss/flow
```

Brings Badge, Button, ScrollArea and Tooltip. Manual deps: `lucide-react`.

## Canonical imports

```tsx
import {
  Flow,
  FlowAdd,
  FlowBranch,
  FlowConnector,
  FlowEnd,
  FlowPath,
  FlowStep,
} from "@/components/ui/flow"
```

## Minimal pattern

```tsx
<Flow aria-label="Welcome new sign-ups">
  <FlowStep icon={<ZapIcon />} kind="Starts when" title="Someone signs up" tone="trigger" />
  <FlowConnector />
  <FlowStep icon={<MailIcon />} kind="Send email" title="Send the welcome email" />
</Flow>
```

## Patterns from coss particles

### Key patterns

A check with two paths:

```tsx
<FlowStep icon={<SplitIcon />} kind="Check" title="Is the kickoff date set?" />
<FlowConnector size={16} />
<FlowBranch label="Is the kickoff date set?">
  <FlowPath label="Yes">
    <FlowConnector size={16} />
    <FlowEnd>Done</FlowEnd>
  </FlowPath>
  <FlowPath label="No">
    <FlowConnector size={16} />
    <FlowStep icon={<BellIcon />} kind="Notify" title="Notify the deal owner" />
  </FlowPath>
</FlowBranch>
```

Runs view counts:

```tsx
<FlowStep kind="Wait" title="Wait 2 days" status={{ label: "12 waiting", tone: "waiting" }} />
```

Design view: replace a `FlowConnector` with `<FlowAdd onClick={...} />`.

Clickable step with a side panel: pass `onClick` and `selected`.

### More examples

- `p-flow-1` to `p-flow-7`

## Common pitfalls

- Forgetting connectors: parts are not joined automatically; place `FlowConnector` or `FlowAdd` between them.
- Using 22px lines around a branch: the line into a branch and the line under each path label are `size={16}`.
- Status text without a number: a status is always a number and a word ("3 failed").
- Nesting branches more than two levels: the layout gets too wide.
- Expecting the stacked layout from the window size: it follows the width of the `Flow` frame (below 38rem).

## Useful particle references

- three steps: `p-flow-1`
- check with Yes and No paths: `p-flow-2`
- check inside a path: `p-flow-3`
- runs view with counts, paused notice and a muted step: `p-flow-4`
- selected step with settings beside the flow: `p-flow-5`
- design view with add buttons: `p-flow-6`
- stacked paths at phone width: `p-flow-7`
