"use client";

import { useState } from "react";
import {
  type SortableValue,
  useSortable,
} from "@/registry/default/hooks/use-sortable";
import { cn } from "@/registry/default/lib/utils";
import { Badge } from "@/registry/default/ui/badge";

type Shot = { id: string; title: string; image: string; format: string };

const columns = [
  { id: "ideas", label: "Ideas" },
  { id: "review", label: "In review" },
  { id: "approved", label: "Approved" },
];

const initialBoard: SortableValue<Shot> = {
  approved: [
    {
      format: "Banner",
      id: "s4",
      image:
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=480&h=270&fit=crop&q=80",
      title: "Product launch banner",
    },
  ],
  ideas: [
    {
      format: "Post",
      id: "s1",
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=480&h=270&fit=crop&q=80",
      title: "Spring campaign",
    },
    {
      format: "Story",
      id: "s2",
      image:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=480&h=270&fit=crop&q=80",
      title: "Team offsite recap",
    },
  ],
  review: [
    {
      format: "Post",
      id: "s3",
      image:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=480&h=270&fit=crop&q=80",
      title: "Customer story",
    },
  ],
};

const cardClassName =
  "flex cursor-grab flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

function ShotCard({ shot }: { shot: Shot }) {
  return (
    <>
      <img
        alt=""
        className="aspect-video w-full bg-muted object-cover"
        draggable={false}
        height={270}
        src={shot.image}
        width={480}
      />
      <div className="flex items-center justify-between gap-2 p-2.5">
        <span className="font-medium text-base sm:text-sm">{shot.title}</span>
        <Badge variant="secondary">{shot.format}</Badge>
      </div>
    </>
  );
}

export default function Particle() {
  const [board, setBoard] = useState(initialBoard);
  const sortable = useSortable({
    getContainerLabel: (id) =>
      columns.find((column) => column.id === id)?.label ?? id,
    getItemLabel: (shot) => shot.title,
    onValueChange: setBoard,
    value: board,
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3">
        {columns.map((column) => {
          const shots = sortable.value[column.id] ?? [];
          return (
            <div
              className="flex w-[min(16rem,75vw)] shrink-0 flex-col gap-2 rounded-xl bg-muted/72 p-2 sm:w-auto sm:min-w-44 sm:flex-1"
              key={column.id}
              {...sortable.getContainerProps(column.id)}
            >
              <div className="flex items-center justify-between px-1 font-medium text-base sm:text-sm">
                {column.label}
                <Badge variant="outline">{shots.length}</Badge>
              </div>
              <div className="flex min-h-32 flex-col gap-2">
                {shots.map((shot) => (
                  <div
                    className={cn(cardClassName, "data-dragging:opacity-50")}
                    key={shot.id}
                    {...sortable.getItemProps(shot)}
                  >
                    <ShotCard shot={shot} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {sortable.active?.reason === "pointer" && (
        <div
          className={cn(cardClassName, "z-50 shadow-lg")}
          {...sortable.getOverlayProps()}
        >
          <ShotCard shot={sortable.active.item} />
        </div>
      )}
      <div {...sortable.getAnnouncerProps()} />
    </div>
  );
}
