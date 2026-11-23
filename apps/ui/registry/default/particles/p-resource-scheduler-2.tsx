"use client";

import { addDays, addHours, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";
import {
  ResourceScheduler,
  type SchedulerBooking,
  type SchedulerResource,
} from "@/registry/default/ui/resource-scheduler";

function sampleWeek(monday: Date): {
  team: SchedulerResource[];
  shifts: SchedulerBooking[];
} {
  const at = (day: number, hour: number): Date =>
    addHours(addDays(monday, day), hour);
  return {
    shifts: [
      {
        end: at(0, 17),
        id: "s1",
        resourceId: "mark",
        start: at(0, 9),
        title: "Primary",
      },
      {
        end: at(1, 9),
        id: "s2",
        resourceId: "nadia",
        start: at(0, 17),
        title: "Night",
      },
      {
        end: at(1, 17),
        id: "s3",
        resourceId: "eli",
        start: at(1, 9),
        title: "Primary",
      },
      {
        end: at(2, 9),
        id: "s4",
        resourceId: "priya",
        start: at(1, 17),
        title: "Night",
      },
      {
        end: at(2, 17),
        id: "s5",
        resourceId: "nadia",
        start: at(2, 9),
        title: "Primary",
      },
      {
        end: at(3, 9),
        id: "s6",
        resourceId: "mark",
        start: at(2, 17),
        title: "Night",
      },
      {
        color: "red",
        end: at(4, 9),
        id: "s7",
        resourceId: "priya",
        start: at(3, 9),
        title: "Incident duty",
      },
      {
        end: at(4, 17),
        id: "s8",
        resourceId: "mark",
        start: at(4, 9),
        title: "Primary",
      },
      {
        end: at(7, 0),
        id: "s9",
        resourceId: "nadia",
        start: at(5, 0),
        title: "Weekend on call",
      },
    ],
    team: [
      {
        color: "blue",
        description: "Backend",
        id: "mark",
        image:
          "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=96&h=96&dpr=2&q=80",
        name: "Mark Andersson",
      },
      {
        color: "violet",
        description: "Frontend",
        id: "eli",
        image:
          "https://images.unsplash.com/photo-1655874819398-c6dfbec68ac7?w=96&h=96&dpr=2&q=80",
        name: "Eli Wren",
        unavailable: [{ end: at(5, 0), reason: "Vacation", start: at(3, 0) }],
      },
      {
        color: "teal",
        description: "Platform",
        id: "nadia",
        image:
          "https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=96&h=96&dpr=2&q=80",
        name: "Nadia Ekman",
      },
      {
        color: "amber",
        description: "Support",
        id: "priya",
        name: "Priya Shah",
      },
    ],
  };
}

export default function Particle() {
  const [today, setToday] = useState<Date | null>(null);
  const [team, setTeam] = useState<SchedulerResource[]>([]);
  const [shifts, setShifts] = useState<SchedulerBooking[]>([]);

  // Build the sample week on the client, so it always shows this week.
  useEffect(() => {
    const now = new Date();
    const sample = sampleWeek(startOfWeek(now, { weekStartsOn: 1 }));
    setToday(now);
    setTeam(sample.team);
    setShifts(sample.shifts);
  }, []);

  if (!today) return <div className="h-[24rem] w-full rounded-xl border" />;

  return (
    <ResourceScheduler
      bookings={shifts}
      className="w-full"
      defaultDate={today}
      defaultView="week"
      labels={{ newBooking: "Add shift", resources: "People" }}
      onBookingsChange={setShifts}
      resources={team}
      stepMinutes={60}
      title="On-call rota"
    />
  );
}
