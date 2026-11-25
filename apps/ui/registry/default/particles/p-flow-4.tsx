import {
  BellIcon,
  CircleCheckIcon,
  ClockIcon,
  MailIcon,
  PauseIcon,
  ReceiptIcon,
  SplitIcon,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/registry/default/ui/alert";
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
    <Flow
      aria-label="Chase overdue invoices"
      className="w-full"
      notice={
        <Alert className="bg-card" variant="warning">
          <PauseIcon aria-hidden="true" />
          <AlertTitle>Paused</AlertTitle>
          <AlertDescription>
            New runs wait until you resume the workflow.
          </AlertDescription>
        </Alert>
      }
    >
      <FlowStep
        icon={<ReceiptIcon />}
        kind="Starts when"
        status={{ label: "342 runs" }}
        title="An invoice is past due"
        tone="trigger"
      />
      <FlowConnector />
      <FlowStep
        icon={<MailIcon />}
        kind="Send email"
        title="Send a payment reminder"
      />
      <FlowConnector />
      <FlowStep
        icon={<ClockIcon />}
        kind="Wait"
        status={{ label: "58 waiting", tone: "waiting" }}
        title="Wait 3 days"
      />
      <FlowConnector />
      <FlowStep
        icon={<SplitIcon />}
        kind="Check"
        title="Has the invoice been paid?"
      />
      <FlowConnector size={16} />
      <FlowBranch label="Has the invoice been paid?">
        <FlowPath label="Yes">
          <FlowConnector size={16} />
          <FlowStep
            icon={<CircleCheckIcon />}
            kind="Update record"
            muted
            title="Mark the invoice as paid"
          />
          <FlowConnector />
          <FlowEnd>Done</FlowEnd>
        </FlowPath>
        <FlowPath label="No">
          <FlowConnector size={16} />
          <FlowStep
            icon={<BellIcon />}
            kind="Notify"
            status={{ label: "4 failed", tone: "failed" }}
            title="Tell the account owner"
          />
        </FlowPath>
      </FlowBranch>
    </Flow>
  );
}
