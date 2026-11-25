import {
  BellIcon,
  CalendarIcon,
  KeyRoundIcon,
  LaptopIcon,
  LayersIcon,
  MailIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import {
  Flow,
  FlowConnector,
  FlowGroup,
  FlowStep,
} from "@/registry/default/ui/flow";

export default function Particle() {
  return (
    <Flow aria-label="Welcome a new employee" className="w-full">
      <FlowStep
        icon={<UserPlusIcon />}
        kind="Starts when"
        title="A new employee is added"
        tone="trigger"
      />
      <FlowConnector />
      <FlowGroup
        collapsible
        defaultOpen={false}
        icon={<LayersIcon />}
        kind="Group"
        status={{ label: "3 steps" }}
        title="Set up their accounts"
      >
        <FlowConnector size={16} />
        <FlowStep
          icon={<KeyRoundIcon />}
          kind="Create record"
          title="Create their login"
        />
        <FlowConnector />
        <FlowStep
          icon={<LaptopIcon />}
          kind="Create record"
          title="Order a laptop"
        />
        <FlowConnector />
        <FlowStep
          icon={<UsersIcon />}
          kind="Update record"
          title="Add them to their team"
        />
      </FlowGroup>
      <FlowConnector />
      <FlowGroup
        collapsible
        icon={<LayersIcon />}
        kind="Group"
        status={{ label: "2 steps" }}
        title="Plan the first week"
      >
        <FlowConnector size={16} />
        <FlowStep
          icon={<CalendarIcon />}
          kind="Create record"
          title="Book a welcome meeting"
        />
        <FlowConnector />
        <FlowStep
          icon={<MailIcon />}
          kind="Send email"
          title="Send the first-week guide"
        />
      </FlowGroup>
      <FlowConnector />
      <FlowStep
        icon={<BellIcon />}
        kind="Notify"
        title="Tell the manager they are ready"
      />
    </Flow>
  );
}
