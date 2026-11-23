"use client";

import { addMinutes, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { resolveEventColor } from "@/registry/default/lib/event-colors";
import { Avatar, AvatarFallback } from "@/registry/default/ui/avatar";
import { Badge } from "@/registry/default/ui/badge";
import {
  ResourceScheduler,
  type SchedulerBooking,
  type SchedulerResource,
} from "@/registry/default/ui/resource-scheduler";

const stages = [
  { color: "blue", name: "Intro" },
  { color: "violet", name: "Coding" },
  { color: "teal", name: "System design" },
  { color: "amber", name: "Design partner" },
  { color: "gray", name: "Debrief" },
];

function sampleLoop(day: Date): {
  interviewers: SchedulerResource[];
  interviews: SchedulerBooking[];
} {
  const at = (hour: number, minute = 0): Date =>
    addMinutes(day, hour * 60 + minute);
  const lunch = [{ end: at(13), reason: "Lunch", start: at(12) }];
  return {
    interviewers: [
      {
        color: "blue",
        description: "Hiring manager",
        id: "nadia",
        image:
          "https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=96&h=96&dpr=2&q=80",
        name: "Nadia Ekman",
        unavailable: lunch,
      },
      {
        color: "violet",
        description: "Engineer",
        id: "eli",
        image:
          "https://images.unsplash.com/photo-1655874819398-c6dfbec68ac7?w=96&h=96&dpr=2&q=80",
        name: "Eli Wren",
        unavailable: lunch,
      },
      {
        color: "teal",
        description: "Staff engineer",
        id: "mark",
        image:
          "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=96&h=96&dpr=2&q=80",
        name: "Mark Andersson",
        unavailable: [{ end: at(10, 30), reason: "Focus time", start: at(9) }],
      },
      {
        color: "amber",
        description: "Product designer",
        id: "priya",
        name: "Priya Shah",
        unavailable: lunch,
      },
    ],
    interviews: [
      {
        color: "blue",
        end: at(10, 15),
        id: "i1",
        resourceId: "nadia",
        start: at(9, 30),
        bookedBy: { name: "Sam Rivera" },
        title: "Intro",
      },
      {
        color: "violet",
        end: at(11, 30),
        id: "i2",
        resourceId: "eli",
        start: at(10, 30),
        bookedBy: { name: "Sam Rivera" },
        title: "Coding",
      },
      {
        color: "teal",
        end: at(14),
        id: "i3",
        resourceId: "mark",
        start: at(13),
        bookedBy: { name: "Sam Rivera" },
        title: "System design",
      },
      {
        color: "amber",
        end: at(15),
        id: "i4",
        resourceId: "priya",
        start: at(14, 15),
        bookedBy: { name: "Sam Rivera" },
        title: "Design partner",
      },
      {
        color: "blue",
        end: at(16),
        id: "i5",
        resourceId: "eli",
        start: at(15, 30),
        status: "tentative",
        bookedBy: { name: "Alex Kim" },
        title: "Phone screen",
      },
      {
        color: "gray",
        end: at(17),
        id: "i6",
        notes: "Everyone on the loop joins.",
        resourceId: "nadia",
        start: at(16, 30),
        bookedBy: { name: "Sam Rivera" },
        title: "Debrief",
      },
    ],
  };
}

export default function Particle() {
  const [today, setToday] = useState<Date | null>(null);
  const [interviewers, setInterviewers] = useState<SchedulerResource[]>([]);
  const [interviews, setInterviews] = useState<SchedulerBooking[]>([]);

  // Build the sample day on the client, so it always shows today.
  useEffect(() => {
    const now = new Date();
    const sample = sampleLoop(startOfDay(now));
    setToday(now);
    setInterviewers(sample.interviewers);
    setInterviews(sample.interviews);
  }, []);

  if (!today) return <div className="h-[28rem] w-full rounded-xl border" />;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
        <Avatar className="[--avatar-size:--spacing(10)]">
          <AvatarFallback>SR</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-base sm:text-sm">Sam Rivera</p>
          <p className="text-muted-foreground text-sm sm:text-xs">
            Senior frontend engineer
          </p>
        </div>
        <Badge variant="info">Onsite today</Badge>
        <div className="flex w-full flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-sm sm:w-auto sm:text-xs">
          {stages.map((stage) => (
            <span className="flex items-center gap-1.5" key={stage.name}>
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: resolveEventColor(stage.color) }}
              />
              {stage.name}
            </span>
          ))}
        </div>
      </div>
      <ResourceScheduler
        bookings={interviews}
        className="w-full"
        dayEndHour={18}
        dayStartHour={8}
        defaultDate={today}
        labels={{ newBooking: "Add interview", resources: "Interviewers" }}
        onBookingsChange={setInterviews}
        resources={interviewers}
        stepMinutes={15}
        title="Interview loop"
        views={["day"]}
      />
    </div>
  );
}
