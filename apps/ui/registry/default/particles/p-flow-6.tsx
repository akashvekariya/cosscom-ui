"use client";

import {
  CirclePlusIcon,
  FolderPlusIcon,
  type LucideIcon,
  MailIcon,
  SplitIcon,
  ZapIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import {
  Flow,
  FlowAdd,
  FlowBranch,
  FlowEnd,
  FlowPath,
  FlowStep,
} from "@/registry/default/ui/flow";

type Step = { id: string; icon: LucideIcon; kind: string; title: string };
type Lane = "main" | "yes" | "no";

const initialSteps: Record<Lane, Step[]> = {
  main: [
    {
      icon: FolderPlusIcon,
      id: "create",
      kind: "Create record",
      title: "Create a task for the account owner",
    },
  ],
  no: [
    {
      icon: MailIcon,
      id: "email",
      kind: "Send email",
      title: "Ask the customer for a call",
    },
  ],
  yes: [],
};

let nextId = 0;

export default function Particle() {
  const [steps, setSteps] = useState(initialSteps);

  const addStep = (lane: Lane, index: number) => {
    nextId += 1;
    const step: Step = {
      icon: CirclePlusIcon,
      id: `new-${nextId}`,
      kind: "New step",
      title: "Choose what happens here",
    };
    setSteps((current) => ({
      ...current,
      [lane]: [
        ...current[lane].slice(0, index),
        step,
        ...current[lane].slice(index),
      ],
    }));
  };

  const renderLane = (lane: Lane) =>
    steps[lane].map((step, index) => {
      const Icon = step.icon;
      return (
        <Fragment key={step.id}>
          <FlowStep icon={<Icon />} kind={step.kind} title={step.title} />
          <FlowAdd onClick={() => addStep(lane, index + 1)} />
        </Fragment>
      );
    });

  return (
    <Flow aria-label="Follow up on low survey scores" className="w-full">
      <FlowStep
        icon={<ZapIcon />}
        kind="Starts when"
        title="A customer answers the survey"
        tone="trigger"
      />
      <FlowAdd onClick={() => addStep("main", 0)} />
      {renderLane("main")}
      <FlowStep
        icon={<SplitIcon />}
        kind="Check"
        title="Is the score 6 or lower?"
      />
      <FlowAdd onClick={() => addStep("main", steps.main.length)} />
      <FlowBranch label="Is the score 6 or lower?">
        <FlowPath label="Yes">
          <FlowAdd onClick={() => addStep("yes", 0)} />
          {renderLane("yes")}
          <FlowEnd>Done</FlowEnd>
        </FlowPath>
        <FlowPath label="No">
          <FlowAdd onClick={() => addStep("no", 0)} />
          {renderLane("no")}
          <FlowEnd>Done</FlowEnd>
        </FlowPath>
      </FlowBranch>
    </Flow>
  );
}
