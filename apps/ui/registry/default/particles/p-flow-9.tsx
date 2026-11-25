import {
  CircleCheckIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  MailIcon,
  ShoppingCartIcon,
  SplitIcon,
} from "lucide-react";
import {
  Flow,
  FlowBranch,
  FlowConnector,
  FlowPath,
  FlowStep,
} from "@/registry/default/ui/flow";

export default function Particle() {
  return (
    <Flow aria-label="Take payment for new orders" className="w-full">
      <FlowStep
        icon={<ShoppingCartIcon />}
        kind="Starts when"
        title="An order is placed"
        tone="trigger"
      />
      <FlowConnector />
      <FlowStep icon={<SplitIcon />} kind="Check" title="Is it paid by card?" />
      <FlowConnector size={16} />
      <FlowBranch join label="Is it paid by card?">
        <FlowPath label="Yes">
          <FlowConnector size={16} />
          <FlowStep
            icon={<CreditCardIcon />}
            kind="Charge"
            title="Charge the card"
          />
        </FlowPath>
        <FlowPath label="No">
          <FlowConnector size={16} />
          <FlowStep
            icon={<FileTextIcon />}
            kind="Send email"
            title="Send an invoice"
          />
          <FlowConnector />
          <FlowStep
            icon={<ClockIcon />}
            kind="Wait"
            title="Wait until it is paid"
          />
        </FlowPath>
      </FlowBranch>
      <FlowConnector size={16} />
      <FlowStep
        icon={<CircleCheckIcon />}
        kind="Update record"
        title="Mark the order as paid"
      />
      <FlowConnector />
      <FlowStep
        icon={<MailIcon />}
        kind="Send email"
        title="Send the receipt"
      />
    </Flow>
  );
}
