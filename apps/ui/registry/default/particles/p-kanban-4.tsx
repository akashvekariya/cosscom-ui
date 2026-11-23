"use client";

import { useState } from "react";
import {
  type SortableValue,
  useSortable,
} from "@/registry/default/hooks/use-sortable";
import { cn } from "@/registry/default/lib/utils";
import { Avatar, AvatarFallback } from "@/registry/default/ui/avatar";

type Card = { id: string; title: string };

const statuses = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

const lanes = [
  { id: "maya", initials: "ML", name: "Maya Lin" },
  { id: "jonas", initials: "JR", name: "Jonas Reed" },
];

const initialBoard: SortableValue<Card> = {
  "jonas:doing": [{ id: "c4", title: "Refund flow" }],
  "jonas:done": [],
  "jonas:todo": [{ id: "c5", title: "Team invites" }],
  "maya:doing": [{ id: "c2", title: "Search filters" }],
  "maya:done": [{ id: "c3", title: "Login page" }],
  "maya:todo": [{ id: "c1", title: "Usage charts" }],
};

const cardClassName =
  "cursor-grab rounded-lg border bg-card px-3 py-2 text-base text-card-foreground shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:text-sm";

function getLabel(key: string): string {
  const [lane, status] = key.split(":");
  const person = lanes.find((item) => item.id === lane)?.name;
  const column = statuses.find((item) => item.id === status)?.label;
  return `${column} for ${person}`;
}

export default function Particle() {
  const [board, setBoard] = useState(initialBoard);
  const sortable = useSortable({
    getContainerLabel: getLabel,
    getItemLabel: (card) => card.title,
    onValueChange: setBoard,
    value: board,
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid min-w-[40rem] grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-2">
        <div />
        {statuses.map((status) => (
          <div
            className="px-1 font-medium text-base sm:text-sm"
            key={status.id}
          >
            {status.label}
          </div>
        ))}
        {lanes.map((lane) => (
          <div className="contents" key={lane.id}>
            <div className="flex flex-col items-center gap-1 pt-2 text-muted-foreground text-sm sm:text-xs">
              <Avatar className="size-7 sm:size-6">
                <AvatarFallback className="text-xs">
                  {lane.initials}
                </AvatarFallback>
              </Avatar>
              {lane.name.split(" ")[0]}
            </div>
            {statuses.map((status) => {
              const key = `${lane.id}:${status.id}`;
              return (
                <div
                  className="flex min-h-20 flex-col gap-2 rounded-xl bg-muted/72 p-2"
                  key={key}
                  {...sortable.getContainerProps(key)}
                >
                  {(sortable.value[key] ?? []).map((card) => (
                    <div
                      className={cn(cardClassName, "data-dragging:opacity-50")}
                      key={card.id}
                      {...sortable.getItemProps(card)}
                    >
                      {card.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {sortable.active?.reason === "pointer" && (
        <div
          className={cn(cardClassName, "z-50 shadow-lg")}
          {...sortable.getOverlayProps()}
        >
          {sortable.active.item.title}
        </div>
      )}
      <div {...sortable.getAnnouncerProps()} />
    </div>
  );
}
