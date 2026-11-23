"use client";

import { addMinutes, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import {
  ResourceScheduler,
  type SchedulerBooking,
  type SchedulerResource,
} from "@/registry/default/ui/resource-scheduler";

const nadia = {
  image:
    "https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=96&h=96&dpr=2&q=80",
  name: "Nadia Ekman",
};
const eli = {
  image:
    "https://images.unsplash.com/photo-1655874819398-c6dfbec68ac7?w=96&h=96&dpr=2&q=80",
  name: "Eli Wren",
};
const mark = {
  image:
    "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=96&h=96&dpr=2&q=80",
  name: "Mark Andersson",
};

function sampleDay(day: Date): {
  rooms: SchedulerResource[];
  bookings: SchedulerBooking[];
} {
  const at = (hour: number, minute = 0): Date =>
    addMinutes(day, hour * 60 + minute);
  return {
    bookings: [
      {
        bookedBy: nadia,
        end: at(10),
        id: "b1",
        resourceId: "atlas",
        start: at(9),
        title: "Interview",
      },
      {
        bookedBy: eli,
        end: at(15),
        id: "b2",
        resourceId: "atlas",
        start: at(13, 30),
        title: "Design critique",
      },
      {
        bookedBy: mark,
        end: at(12, 30),
        id: "b3",
        resourceId: "birch",
        start: at(10),
        title: "Sprint planning",
      },
      {
        bookedBy: { name: "Priya Shah" },
        end: at(17),
        id: "b4",
        notes: "Bring the quarterly numbers.",
        resourceId: "cedar",
        start: at(15),
        status: "tentative",
        title: "All hands prep",
      },
      {
        bookedBy: eli,
        end: at(11, 30),
        id: "b5",
        resourceId: "dune",
        start: at(11),
        title: "Call",
      },
    ],
    rooms: [
      {
        capacity: 4,
        color: "blue",
        description: "Floor 2",
        id: "atlas",
        name: "Atlas",
      },
      {
        capacity: 8,
        color: "violet",
        description: "Floor 2",
        id: "birch",
        name: "Birch",
      },
      {
        capacity: 12,
        color: "teal",
        description: "Floor 3",
        id: "cedar",
        name: "Cedar",
        unavailable: [{ end: at(14), reason: "Deep clean", start: at(12) }],
      },
      {
        capacity: 2,
        color: "amber",
        description: "Phone booth",
        id: "dune",
        name: "Dune",
      },
    ],
  };
}

export default function Particle() {
  const [today, setToday] = useState<Date | null>(null);
  const [rooms, setRooms] = useState<SchedulerResource[]>([]);
  const [bookings, setBookings] = useState<SchedulerBooking[]>([]);

  // Build the sample day on the client, so it always shows today.
  useEffect(() => {
    const now = new Date();
    const sample = sampleDay(startOfDay(now));
    setToday(now);
    setRooms(sample.rooms);
    setBookings(sample.bookings);
  }, []);

  if (!today) return <div className="h-[40rem] w-full rounded-xl border" />;

  return (
    <ResourceScheduler
      bookings={bookings}
      className="w-full"
      defaultDate={today}
      labels={{ newBooking: "Book a room", resources: "Rooms" }}
      layout="columns"
      onBookingsChange={setBookings}
      resources={rooms}
      title="Meeting rooms"
      views={["day"]}
    />
  );
}
