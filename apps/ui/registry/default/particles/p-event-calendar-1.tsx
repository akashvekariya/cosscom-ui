"use client";

import { addDays, addHours, addMinutes, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";
import { resolveEventColor } from "@/registry/default/lib/event-colors";
import { Calendar } from "@/registry/default/ui/calendar";
import { Checkbox } from "@/registry/default/ui/checkbox";
import {
  type CalendarEvent,
  type CalendarSource,
  EventCalendar,
} from "@/registry/default/ui/event-calendar";
import { Label } from "@/registry/default/ui/label";

const calendars: CalendarSource[] = [
  { color: "blue", id: "work", name: "Work" },
  { color: "violet", id: "team", name: "Team rituals" },
  { color: "green", id: "personal", name: "Personal" },
  { color: "amber", id: "holidays", name: "Holidays", readOnly: true },
];

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

function sampleEvents(monday: Date): CalendarEvent[] {
  const at = (day: number, hour: number, minute = 0): Date =>
    addMinutes(addHours(addDays(monday, day), hour), minute);
  return [
    ...[0, 1, 2, 3, 4].map((day) => ({
      attendees: [nadia, eli],
      calendarId: "team",
      end: at(day, 9, 15),
      id: `standup-${day}`,
      location: "Video call",
      start: at(day, 9),
      title: "Standup",
    })),
    {
      attendees: [nadia, eli],
      calendarId: "work",
      description: "Walk through the new onboarding flow.",
      end: at(0, 12),
      id: "review",
      location: "Room Atlas",
      start: at(0, 10),
      title: "Design review",
    },
    {
      calendarId: "work",
      end: at(0, 11),
      id: "hiring",
      start: at(0, 10, 30),
      status: "tentative",
      title: "Hiring sync",
    },
    {
      calendarId: "work",
      end: at(1, 15),
      id: "customer",
      location: "Acme HQ",
      start: at(1, 13, 30),
      title: "Customer call",
    },
    {
      calendarId: "personal",
      end: at(2, 13),
      id: "lunch",
      start: at(2, 12, 15),
      title: "Lunch with Priya",
    },
    {
      calendarId: "work",
      end: at(2, 11, 30),
      id: "planning",
      start: at(2, 10),
      title: "Sprint planning",
    },
    {
      calendarId: "work",
      end: at(3, 15),
      id: "vendor",
      start: at(3, 14),
      status: "cancelled",
      title: "Vendor demo",
    },
    {
      calendarId: "team",
      end: at(4, 17),
      id: "demo",
      start: at(4, 16),
      title: "Friday demo",
    },
    {
      allDay: true,
      calendarId: "work",
      end: addDays(monday, 3),
      id: "offsite",
      start: addDays(monday, 1),
      title: "Team offsite",
    },
    {
      allDay: true,
      calendarId: "holidays",
      end: addDays(monday, 5),
      id: "holiday",
      start: addDays(monday, 4),
      title: "Company holiday",
    },
  ];
}

export default function Particle() {
  const [today, setToday] = useState<Date | null>(null);
  const [date, setDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  // Build the sample week on the client, so it always shows the current week.
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setDate(now);
    setEvents(sampleEvents(startOfWeek(now, { weekStartsOn: 1 })));
  }, []);

  if (!today) return <div className="h-[44rem] w-full rounded-xl border" />;

  return (
    <div className="@container w-full">
      <div className="flex gap-4">
        <aside className="@4xl:flex hidden w-64 shrink-0 flex-col gap-4">
          <Calendar
            className="rounded-xl border"
            mode="single"
            onSelect={(day) => day && setDate(day)}
            selected={date}
          />
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <p className="font-medium text-muted-foreground text-xs">
              My calendars
            </p>
            {calendars.map((calendar) => (
              <Label key={calendar.id}>
                <Checkbox
                  checked={!hidden.includes(calendar.id)}
                  onCheckedChange={(checked) =>
                    setHidden((current) =>
                      checked
                        ? current.filter((id) => id !== calendar.id)
                        : [...current, calendar.id],
                    )
                  }
                />
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ background: resolveEventColor(calendar.color) }}
                />
                {calendar.name}
              </Label>
            ))}
          </div>
        </aside>
        <EventCalendar
          calendars={calendars}
          className="min-w-0 flex-1"
          date={date}
          events={events}
          hiddenCalendars={hidden}
          now={today}
          onDateChange={setDate}
          onEventsChange={setEvents}
          onHiddenCalendarsChange={setHidden}
        />
      </div>
    </div>
  );
}
