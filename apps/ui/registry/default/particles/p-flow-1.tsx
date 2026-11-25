import { MailIcon, UserPlusIcon, ZapIcon } from "lucide-react";
import { Flow, FlowConnector, FlowStep } from "@/registry/default/ui/flow";

export default function Particle() {
  return (
    <Flow aria-label="Welcome new sign-ups" className="w-full">
      <FlowStep
        icon={<ZapIcon />}
        kind="Starts when"
        title="Someone signs up for the newsletter"
        tone="trigger"
      />
      <FlowConnector />
      <FlowStep
        icon={<UserPlusIcon />}
        kind="Create record"
        title="Add them to the contact list"
      />
      <FlowConnector />
      <FlowStep
        icon={<MailIcon />}
        kind="Send email"
        title="Send the welcome email"
      />
    </Flow>
  );
}
