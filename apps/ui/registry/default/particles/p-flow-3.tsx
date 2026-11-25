import {
  BellIcon,
  MailIcon,
  SplitIcon,
  TicketIcon,
  UserPlusIcon,
} from "lucide-react";
import {
  Flow,
  FlowBranch,
  FlowConnector,
  FlowEnd,
  FlowPath,
  FlowStep,
} from "@/registry/default/ui/flow";

export default function Particle() {
  return (
    <Flow aria-label="Route new support tickets" className="w-full">
      <FlowStep
        icon={<TicketIcon />}
        kind="Starts when"
        title="A support ticket is opened"
        tone="trigger"
      />
      <FlowConnector />
      <FlowStep
        icon={<SplitIcon />}
        kind="Check"
        title="Is the customer on a paid plan?"
      />
      <FlowConnector size={16} />
      <FlowBranch label="Is the customer on a paid plan?">
        <FlowPath label="Yes">
          <FlowConnector size={16} />
          <FlowStep
            icon={<SplitIcon />}
            kind="Check"
            title="Is the ticket marked urgent?"
          />
          <FlowConnector size={16} />
          <FlowBranch label="Is the ticket marked urgent?">
            <FlowPath label="Yes">
              <FlowConnector size={16} />
              <FlowStep
                icon={<BellIcon />}
                kind="Notify"
                title="Page the on-call engineer"
              />
              <FlowConnector />
              <FlowEnd>Done</FlowEnd>
            </FlowPath>
            <FlowPath label="No">
              <FlowConnector size={16} />
              <FlowStep
                icon={<UserPlusIcon />}
                kind="Assign"
                title="Add it to the support queue"
              />
              <FlowConnector />
              <FlowEnd>Done</FlowEnd>
            </FlowPath>
          </FlowBranch>
        </FlowPath>
        <FlowPath label="No">
          <FlowConnector size={16} />
          <FlowStep
            icon={<MailIcon />}
            kind="Send email"
            title="Reply with help articles"
          />
          <FlowConnector />
          <FlowEnd>Done</FlowEnd>
        </FlowPath>
      </FlowBranch>
    </Flow>
  );
}
