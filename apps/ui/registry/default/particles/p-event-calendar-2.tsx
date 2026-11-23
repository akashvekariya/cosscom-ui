"use client";

import { addDays, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";
import { resolveEventColor } from "@/registry/default/lib/event-colors";
import { Badge } from "@/registry/default/ui/badge";
import {
  type CalendarEvent,
  type CalendarSource,
  EventCalendar,
} from "@/registry/default/ui/event-calendar";

const channels: CalendarSource[] = [
  { color: "green", id: "blog", name: "Blog" },
  { color: "violet", id: "newsletter", name: "Newsletter" },
  { color: "pink", id: "social", name: "Social" },
  { color: "orange", id: "video", name: "Video" },
];

function samplePosts(first: Date): CalendarEvent[] {
  const day = (offset: number): Date => addDays(first, offset);
  const post = (
    id: string,
    channel: string,
    title: string,
    start: number,
    days = 1,
    extra: Partial<CalendarEvent> = {},
  ): CalendarEvent => ({
    allDay: true,
    calendarId: channel,
    end: day(start + days),
    id,
    start: day(start),
    title,
    ...extra,
  });
  return [
    post("p1", "blog", "Year in review", 1, 1, { readOnly: true }),
    post("p2", "newsletter", "Monthly newsletter", 2, 1, { readOnly: true }),
    post("p3", "social", "Feature teaser", 4),
    post("p4", "video", "Customer story shoot", 6, 3),
    post("p5", "blog", "How we ship weekly", 9),
    post("p6", "social", "Behind the scenes", 9, 1, { status: "tentative" }),
    post("p7", "newsletter", "Product update", 13),
    post("p8", "blog", "Guide: getting started", 15, 1, {
      status: "tentative",
    }),
    post("p9", "video", "Webinar recording", 17, 2),
    post("p10", "social", "Poll: what next?", 18),
    post("p11", "social", "Launch countdown", 21, 3),
    post("p12", "blog", "Launch announcement", 24),
    post("p13", "newsletter", "Launch edition", 24),
    post("p14", "social", "Launch thread", 24),
    post("p15", "blog", "Postmortem", 26, 1, { status: "cancelled" }),
  ];
}

export default function Particle() {
  const [today, setToday] = useState<Date | null>(null);
  const [posts, setPosts] = useState<CalendarEvent[]>([]);

  // Build the sample month on the client, so it always shows this month.
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setPosts(samplePosts(startOfMonth(now)));
  }, []);

  if (!today) return <div className="h-[46rem] w-full rounded-xl border" />;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold text-lg">
            Content calendar
          </h3>
          <p className="text-muted-foreground text-sm">
            Drafts are striped. Published posts are locked.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {channels.map((channel) => (
            <Badge key={channel.id} size="lg" variant="outline">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: resolveEventColor(channel.color) }}
              />
              {channel.name}
              <span className="text-muted-foreground tabular-nums">
                {posts.filter((post) => post.calendarId === channel.id).length}
              </span>
            </Badge>
          ))}
        </div>
      </div>
      <EventCalendar
        calendars={channels}
        className="h-[44rem]"
        defaultDate={today}
        defaultView="month"
        events={posts}
        labels={{ newEvent: "New post" }}
        now={today}
        onEventsChange={setPosts}
        views={["month", "agenda"]}
      />
    </div>
  );
}
