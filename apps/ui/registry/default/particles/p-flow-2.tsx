import {
  BellIcon,
  ClockIcon,
  FolderPlusIcon,
  SplitIcon,
  ZapIcon,
} from "lucide-react";
import {
  Flow,
  FlowAdd,
  FlowBranch,
  FlowConnector,
  FlowEnd,
  FlowPath,
  FlowStep,
} from "@/registry/default/ui/flow";

export default function Particle() {
  return (
    <Flow aria-label="Start onboarding for won deals" className="w-full">
      <FlowStep
        icon={<ZapIcon />}
        kind="Starts when"
        status={{ label: "128 runs" }}
        title="A deal moves to Won"
        tone="trigger"
      />
      <FlowConnector />
      <FlowStep
        icon={<FolderPlusIcon />}
        kind="Create record"
        title="Create an onboarding project"
      />
      <FlowAdd label="Add a step here" />
      <FlowStep
        icon={<ClockIcon />}
        kind="Wait"
        status={{ label: "12 waiting", tone: "waiting" }}
        title="Wait 2 days"
      />
      <FlowConnector />
      <FlowStep
        icon={<SplitIcon />}
        kind="Check"
        title="Is the kickoff date set?"
      />
      <FlowConnector size={16} />
      <FlowBranch label="Is the kickoff date set?">
        <FlowPath label="Yes">
          <FlowConnector size={16} />
          <FlowEnd>Done</FlowEnd>
        </FlowPath>
        <FlowPath label="No">
          <FlowConnector size={16} />
          <FlowStep
            icon={<BellIcon />}
            kind="Notify"
            status={{ label: "3 failed", tone: "failed" }}
            title="Notify the deal owner"
          />
        </FlowPath>
      </FlowBranch>
    </Flow>
  );
}
