import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  MailIcon,
  SplitIcon,
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
    <div className="mx-auto w-full max-w-sm">
      <Flow aria-label="Remind people before a booking">
        <FlowStep
          icon={<CalendarIcon />}
          kind="Starts when"
          status={{ label: "86 runs" }}
          title="A booking is made"
          tone="trigger"
        />
        <FlowConnector />
        <FlowStep
          icon={<ClockIcon />}
          kind="Wait"
          status={{ label: "21 waiting", tone: "waiting" }}
          title="Wait until 1 day before"
        />
        <FlowConnector />
        <FlowStep
          icon={<SplitIcon />}
          kind="Check"
          title="Has the booking been confirmed?"
        />
        <FlowConnector size={16} />
        <FlowBranch label="Has the booking been confirmed?">
          <FlowPath label="Yes">
            <FlowConnector size={16} />
            <FlowStep
              icon={<MailIcon />}
              kind="Send email"
              status={{ label: "60 done", tone: "done" }}
              title="Send the visit details"
            />
            <FlowConnector />
            <FlowEnd>Done</FlowEnd>
          </FlowPath>
          <FlowPath label="No">
            <FlowConnector size={16} />
            <FlowStep
              icon={<BellIcon />}
              kind="Notify"
              title="Ask the host to call them"
            />
            <FlowConnector />
            <FlowEnd>Done</FlowEnd>
          </FlowPath>
        </FlowBranch>
      </Flow>
    </div>
  );
}
