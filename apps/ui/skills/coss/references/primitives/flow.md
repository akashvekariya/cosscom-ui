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
  FlowChip,
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

Design view: put `<FlowAdd onClick={...} />` on every line and toggle `<Flow editable={editing}>`; when not editable each add becomes a plain line of its `size` (22, or 16 into a branch and under a path label).

Custom content: `status` takes `{ label, tone }` or any element (several `FlowChip`s, avatars, a switch); children show under the title.

Theme: colors come from `--muted`, `--info`, `--warning`, `--destructive`, `--success`; override `--flow-line`, `--flow-dot` and `--flow-step-width` on a parent.

Clickable step with a side panel: pass `onClick` and `selected`.

### More examples

- `p-flow-1` to `p-flow-8`

## Common pitfalls

- Forgetting connectors: parts are not joined automatically; place `FlowConnector` or `FlowAdd` between them.
- Using 22px lines around a branch: the line into a branch and the line under each path label are `size={16}`.
- Swapping `FlowAdd` for `FlowConnector` by hand to hide add buttons: set `editable={false}` on `Flow` instead.
- Expecting joins or loops: paths do not merge back and nothing loops; those are not drawn yet.
- Nesting branches more than two levels: the layout gets too wide.
- Expecting the stacked layout from the window size: it follows the width of the `Flow` frame (below 38rem).

## Useful particle references

- three steps: `p-flow-1`
- check with Yes and No paths: `p-flow-2`
- check inside a path: `p-flow-3`
- runs view with counts, paused notice and a muted step: `p-flow-4`
- selected step with settings beside the flow: `p-flow-5`
- design view with add buttons and an edit switch: `p-flow-6`
- custom step content (chips, avatars, tags, switch): `p-flow-8`
- stacked paths at phone width: `p-flow-7`
