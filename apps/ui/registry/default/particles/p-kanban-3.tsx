"use client";

import { useState } from "react";
import {
  type SortableValue,
  useSortable,
} from "@/registry/default/hooks/use-sortable";
import { cn } from "@/registry/default/lib/utils";
import { Badge } from "@/registry/default/ui/badge";

type Card = { id: string; title: string };

const columns: { id: string; label: string; limit?: number }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "doing", label: "Doing", limit: 2 },
  { id: "review", label: "Review", limit: 1 },
  { id: "done", label: "Done" },
];

const initialBoard: SortableValue<Card> = {
  backlog: [
    { id: "c1", title: "Audit the onboarding emails" },
    { id: "c2", title: "Add SSO for teams" },
  ],
  doing: [
    { id: "c3", title: "Fix the CSV export" },
    { id: "c4", title: "Speed up search" },
  ],
  done: [{ id: "c6", title: "Ship dark mode" }],
  review: [{ id: "c5", title: "New billing page" }],
};

const cardClassName =
  "cursor-grab rounded-lg border bg-card px-3 py-2.5 text-base text-card-foreground shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:text-sm";

export default function Particle() {
  const [board, setBoard] = useState(initialBoard);
  const sortable = useSortable({
    canMove: ({ from, to }) => {
      const limit = columns.find((column) => column.id === to.container)?.limit;
      if (!limit || from.container === to.container) return true;
      return (board[to.container]?.length ?? 0) < limit;
    },
    getContainerLabel: (id) =>
      columns.find((column) => column.id === id)?.label ?? id,
    getItemLabel: (card) => card.title,
    onValueChange: setBoard,
    value: board,
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3">
        {columns.map((column) => {
          const cards = sortable.value[column.id] ?? [];
          const full =
            column.limit !== undefined && cards.length >= column.limit;
          return (
            <div
              className="flex w-[min(16rem,75vw)] shrink-0 flex-col gap-2 rounded-xl bg-muted/72 p-2 transition-colors data-drop-refused:bg-destructive/8 data-drop-refused:ring-1 data-drop-refused:ring-destructive/48 sm:w-auto sm:min-w-40 sm:flex-1"
              key={column.id}
              {...sortable.getContainerProps(column.id)}
            >
              <div className="flex items-center justify-between px-1 font-medium text-base sm:text-sm">
                {column.label}
                <Badge variant={full ? "warning" : "outline"}>
                  {column.limit
                    ? `${cards.length}/${column.limit}`
                    : cards.length}
                </Badge>
              </div>
              <div className="flex min-h-24 flex-col gap-2">
                {cards.map((card) => (
                  <div
                    className={cn(
                      cardClassName,
                      "data-drop-refused:border-destructive/64 data-dragging:opacity-50",
                    )}
                    key={card.id}
                    {...sortable.getItemProps(card)}
                  >
                    {card.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {sortable.active?.reason === "pointer" && (
        <div
          className={cn(
            cardClassName,
            "z-50 shadow-lg data-drop-refused:border-destructive/64",
          )}
          {...sortable.getOverlayProps()}
        >
          {sortable.active.item.title}
        </div>
      )}
      <div {...sortable.getAnnouncerProps()} />
    </div>
  );
}
