"use client";

import { addDays, startOfDay, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";
import {
  GanttChart,
  type GanttGroup,
  type GanttTask,
} from "@/registry/default/ui/gantt-chart";

const groups: GanttGroup[] = [
  { color: "violet", id: "discovery", name: "Discovery" },
  { color: "blue", id: "design", name: "Design" },
  { color: "teal", id: "build", name: "Build" },
  { color: "amber", id: "launch", name: "Launch" },
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
const mark = {
  image:
    "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=96&h=96&dpr=2&q=80",
  name: "Mark Andersson",
};
const priya = { name: "Priya Shah" };

function samplePlan(monday: Date): GanttTask[] {
  const day = (offset: number): Date => addDays(monday, offset);
  return [
    {
      assignee: nadia,
      color: "violet",
      end: day(4),
      groupId: "discovery",
      id: "interviews",
      name: "Customer interviews",
      progress: 1,
      start: day(-3),
    },
    {
      assignee: priya,
      color: "violet",
      dependencies: ["interviews"],
      end: day(7),
      groupId: "discovery",
      id: "synthesis",
      name: "Synthesis",
      progress: 0.6,
      start: day(4),
    },
    {
      assignee: eli,
      color: "blue",
      dependencies: ["synthesis"],
      end: day(12),
      groupId: "design",
      id: "wireframes",
      name: "Wireframes",
      progress: 0.2,
      start: day(7),
    },
    {
      assignee: eli,
      color: "blue",
      dependencies: ["wireframes"],
      end: day(17),
      groupId: "design",
      id: "visual",
      name: "Visual design",
      start: day(12),
    },
    {
      assignee: mark,
      color: "teal",
      dependencies: ["wireframes"],
      end: day(24),
      groupId: "build",
      id: "api",
      name: "API",
      start: day(12),
    },
    {
      assignee: mark,
      color: "teal",
      dependencies: ["visual"],
      end: day(26),
      groupId: "build",
      id: "frontend",
      name: "Front end",
      start: day(17),
    },
    {
      assignee: priya,
      color: "green",
      dependencies: ["api", "frontend"],
      end: day(30),
      groupId: "build",
      id: "qa",
      name: "QA",
      start: day(26),
    },
    {
      color: "amber",
      dependencies: ["qa"],
      end: day(31),
      groupId: "launch",
      id: "launch",
      name: "Launch",
      start: day(31),
    },
    {
      assignee: nadia,
      color: "orange",
      dependencies: ["launch"],
      end: day(34),
      groupId: "launch",
      id: "announce",
      name: "Announcement",
      start: day(31),
    },
  ];
}

export default function Particle() {
  const [today, setToday] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);

  // Build the sample plan on the client, so it always starts this week.
  useEffect(() => {
    const now = startOfDay(new Date());
    setToday(now);
    setTasks(samplePlan(startOfWeek(now, { weekStartsOn: 1 })));
  }, []);

  if (!today) return <div className="h-[34rem] w-full rounded-xl border" />;

  return (
    <GanttChart
      className="w-full"
      groups={groups}
      now={today}
      onTasksChange={setTasks}
      tasks={tasks}
      title="Website relaunch"
    />
  );
}
