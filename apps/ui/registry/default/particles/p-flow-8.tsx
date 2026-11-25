import {
  CircleCheckIcon,
  ReceiptIcon,
  SendIcon,
  UserCheckIcon,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/registry/default/ui/avatar";
import { Badge } from "@/registry/default/ui/badge";
import {
  Flow,
  FlowChip,
  FlowConnector,
  FlowStep,
} from "@/registry/default/ui/flow";
import { Switch } from "@/registry/default/ui/switch";

const approvers = ["NE", "EW", "PS"];

export default function Particle() {
  return (
    <Flow aria-label="Approve expense claims" className="w-full">
      <FlowStep
        icon={<ReceiptIcon />}
        kind="Starts when"
        status={{ label: "4 running", tone: "running" }}
        title="An expense claim is sent"
        tone="trigger"
      />
      <FlowConnector />
      <FlowStep
        icon={<UserCheckIcon />}
        kind="Approve"
        status={
          <AvatarGroup
            aria-label="3 approvers"
            className="[--avatar-overlap:--spacing(1)] [--avatar-size:--spacing(6)]"
          >
            {approvers.map((initials) => (
              <Avatar className="size-6 text-[0.625rem]" key={initials}>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        }
        title="A manager approves it"
      >
        <Badge size="sm" variant="outline">
          Over $500
        </Badge>
        Within 2 days
      </FlowStep>
      <FlowConnector />
      <FlowStep
        icon={<SendIcon />}
        kind="Notify"
        status={<Switch aria-label="Notify step is on" defaultChecked />}
        title="Tell the finance team"
      >
        To #finance
      </FlowStep>
      <FlowConnector />
      <FlowStep
        icon={<CircleCheckIcon />}
        kind="Update record"
        status={
          <>
            <FlowChip tone="done">212 done</FlowChip>
            <FlowChip tone="failed">2 failed</FlowChip>
          </>
        }
        title="Mark it as approved"
      />
    </Flow>
  );
}
