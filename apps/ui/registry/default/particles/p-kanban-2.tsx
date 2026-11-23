"use client";

import {
  BookmarkIcon,
  BugIcon,
  ChevronDownIcon,
  ChevronsUpIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  EqualIcon,
  GripVerticalIcon,
} from "lucide-react";
import { useState } from "react";
import {
  type SortableProps,
  type SortableValue,
  useSortable,
} from "@/registry/default/hooks/use-sortable";
import { cn } from "@/registry/default/lib/utils";
import { Avatar, AvatarFallback } from "@/registry/default/ui/avatar";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/registry/default/ui/dialog";

type Task = {
  id: string;
  title: string;
  type: "story" | "bug" | "task";
  priority: "highest" | "high" | "medium" | "low";
  points: number;
  assignee: { name: string; initials: string };
  labels: string[];
  description: string;
};

const types = {
  bug: {
    className: "text-destructive-foreground",
    icon: BugIcon,
    label: "Bug",
  },
  story: {
    className: "text-success-foreground",
    icon: BookmarkIcon,
    label: "Story",
  },
  task: {
    className: "text-info-foreground",
    icon: CircleCheckIcon,
    label: "Task",
  },
};

const priorities = {
  high: {
    className: "text-warning-foreground",
    icon: ChevronUpIcon,
    label: "High",
  },
  highest: {
    className: "text-destructive-foreground",
    icon: ChevronsUpIcon,
    label: "Highest",
  },
  low: {
    className: "text-muted-foreground",
    icon: ChevronDownIcon,
    label: "Low",
  },
  medium: {
    className: "text-info-foreground",
    icon: EqualIcon,
    label: "Medium",
  },
};

const columns: { id: string; label: string; limit?: number }[] = [
  { id: "todo", label: "To do" },
  { id: "progress", label: "In progress", limit: 2 },
  { id: "review", label: "In review" },
  { id: "done", label: "Done" },
];

const initialBoard: SortableValue<Task> = {
  done: [
    {
      assignee: { initials: "ML", name: "Maya Lin" },
      description: "Send the weekly product update to everyone on the list.",
      id: "APP-98",
      labels: ["Email"],
      points: 1,
      priority: "low",
      title: "Send the weekly update",
      type: "task",
    },
  ],
  progress: [
    {
      assignee: { initials: "JR", name: "Jonas Reed" },
      description: "Let people pick an annual plan and show the discount.",
      id: "APP-121",
      labels: ["Billing", "Web"],
      points: 5,
      priority: "high",
      title: "Add annual billing",
      type: "story",
    },
  ],
  review: [
    {
      assignee: { initials: "PS", name: "Priya Shah" },
      description: "Rewrite the empty states for the reports page.",
      id: "APP-117",
      labels: ["Copy"],
      points: 2,
      priority: "medium",
      title: "Update empty states",
      type: "task",
    },
  ],
  todo: [
    {
      assignee: { initials: "ML", name: "Maya Lin" },
      description:
        "Users who sign up with Google never get the welcome email. Check the provider callback.",
      id: "APP-142",
      labels: ["Auth", "Email"],
      points: 3,
      priority: "highest",
      title: "Fix missing welcome email",
      type: "bug",
    },
    {
      assignee: { initials: "JR", name: "Jonas Reed" },
      description: "Show who changed what on each record, newest first.",
      id: "APP-139",
      labels: ["Web"],
      points: 8,
      priority: "medium",
      title: "Build the activity log",
      type: "story",
    },
    {
      assignee: { initials: "PS", name: "Priya Shah" },
      description: "Move the import button into the toolbar menu.",
      id: "APP-133",
      labels: ["Design"],
      points: 1,
      priority: "low",
      title: "Tidy the toolbar",
      type: "task",
    },
  ],
};

function TaskCard({
  className,
  handleProps,
  onOpen,
  task,
  ...props
}: SortableProps & {
  handleProps?: SortableProps;
  onOpen?: () => void;
  task: Task;
}) {
  const type = types[task.type];
  const priority = priorities[task.priority];

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-3 text-base text-card-foreground shadow-xs/5 data-drop-refused:border-destructive/64 data-dragging:opacity-50 sm:text-sm",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <button
          className="flex-1 cursor-pointer text-start font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
          onClick={onOpen}
          type="button"
        >
          {task.title}
        </button>
        <Button
          aria-label={`Move ${task.title}`}
          className="relative -me-1.5 -mt-1 cursor-grab text-muted-foreground"
          size="icon-xs"
          variant="ghost"
          {...handleProps}
        >
          <GripVerticalIcon aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {task.labels.map((label) => (
          <Badge key={label} variant="outline">
            {label}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground text-sm sm:text-xs">
          <type.icon
            aria-label={type.label}
            className={cn("size-4.5 sm:size-4", type.className)}
            role="img"
          />
          {task.id}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <priority.icon
            aria-label={`${priority.label} priority`}
            className={cn("size-4.5 sm:size-4", priority.className)}
            role="img"
          />
          <Badge variant="secondary">{task.points} pts</Badge>
          <Avatar
            aria-label={task.assignee.name}
            className="size-7 sm:size-6"
            role="img"
          >
            <AvatarFallback className="text-xs">
              {task.assignee.initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}

export default function Particle() {
  const [board, setBoard] = useState(initialBoard);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const sortable = useSortable({
    canMove: ({ from, to }) => {
      const limit = columns.find((column) => column.id === to.container)?.limit;
      if (!limit || from.container === to.container) return true;
      return (board[to.container]?.length ?? 0) < limit;
    },
    getContainerLabel: (id) =>
      columns.find((column) => column.id === id)?.label ?? id,
    getItemLabel: (task) => task.title,
    dragFromItem: true,
    handle: true,
    onValueChange: setBoard,
    value: board,
  });

  const status = columns.find((column) =>
    board[column.id]?.some((task) => task.id === selected?.id),
  )?.label;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3">
        {columns.map((column) => {
          const tasks = sortable.value[column.id] ?? [];
          const full =
            column.limit !== undefined && tasks.length >= column.limit;
          return (
            <div
              className="flex w-[min(18rem,80vw)] shrink-0 flex-col gap-2 rounded-xl bg-muted/72 p-2 transition-colors data-drop-refused:bg-destructive/8 data-drop-refused:ring-1 data-drop-refused:ring-destructive/48 data-drop-refused:ring-inset sm:w-auto sm:min-w-52 sm:flex-1"
              key={column.id}
              {...sortable.getContainerProps(column.id)}
            >
              <div className="flex items-center justify-between px-1 font-medium text-base sm:text-sm">
                {column.label}
                <Badge variant={full ? "warning" : "outline"}>
                  {column.limit
                    ? `${tasks.length}/${column.limit}`
                    : tasks.length}
                </Badge>
              </div>
              <div className="flex min-h-32 flex-col gap-2">
                {tasks.map((task) => (
                  <TaskCard
                    handleProps={sortable.getHandleProps(task)}
                    key={task.id}
                    onOpen={() => {
                      setSelected(task);
                      setOpen(true);
                    }}
                    task={task}
                    {...sortable.getItemProps(task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {sortable.active?.reason === "pointer" && (
        <TaskCard
          className="z-50 shadow-lg"
          task={sortable.active.item}
          {...sortable.getOverlayProps()}
        />
      )}
      <div {...sortable.getAnnouncerProps()} />
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogPopup>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.id} · {types[selected.type].label}
                </DialogDescription>
              </DialogHeader>
              <DialogPanel className="flex flex-col gap-4">
                <p className="text-base text-muted-foreground sm:text-sm">
                  {selected.description}
                </p>
                <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-base sm:text-sm">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{status}</dd>
                  <dt className="text-muted-foreground">Priority</dt>
                  <dd>{priorities[selected.priority].label}</dd>
                  <dt className="text-muted-foreground">Story points</dt>
                  <dd>{selected.points}</dd>
                  <dt className="text-muted-foreground">Assignee</dt>
                  <dd className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-xs">
                        {selected.assignee.initials}
                      </AvatarFallback>
                    </Avatar>
                    {selected.assignee.name}
                  </dd>
                  <dt className="text-muted-foreground">Labels</dt>
                  <dd className="flex flex-wrap gap-1">
                    {selected.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </dd>
                </dl>
              </DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Close
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogPopup>
      </Dialog>
    </div>
  );
}
