import {
  BoxIcon,
  ClockIcon,
  CreditCardIcon,
  MailIcon,
  PackageCheckIcon,
  RepeatIcon,
  ShoppingCartIcon,
  SplitIcon,
} from "lucide-react";
import {
  Flow,
  FlowBranch,
  FlowConnector,
  FlowEnd,
  FlowGroup,
  FlowJump,
  FlowPath,
  FlowStep,
} from "@/registry/default/ui/flow";

export default function Particle() {
  return (
    <Flow aria-label="Fulfil new orders" className="w-full">
      <FlowStep
        icon={<ShoppingCartIcon />}
        kind="Starts when"
        title="An order is placed"
        tone="trigger"
      />
      <FlowConnector />
      <FlowGroup
        icon={<RepeatIcon />}
        kind="Repeat"
        status={{ label: "Each item" }}
        title="For each item in the order"
      >
        <FlowConnector size={16} />
        <FlowStep
          icon={<BoxIcon />}
          kind="Update record"
          title="Reserve the item"
        />
        <FlowConnector />
        <FlowStep
          icon={<PackageCheckIcon />}
          kind="Create record"
          title="Add it to the packing list"
        />
      </FlowGroup>
      <FlowConnector />
      <FlowStep
        icon={<CreditCardIcon />}
        kind="Charge"
        title="Charge the card"
      />
      <FlowConnector />
      <FlowStep
        icon={<SplitIcon />}
        kind="Check"
        title="Did the payment go through?"
      />
      <FlowConnector size={16} />
      <FlowBranch label="Did the payment go through?">
        <FlowPath label="Yes">
          <FlowConnector size={16} />
          <FlowStep
            icon={<MailIcon />}
            kind="Send email"
            title="Confirm the order"
          />
          <FlowConnector />
          <FlowEnd>Done</FlowEnd>
        </FlowPath>
        <FlowPath label="No">
          <FlowConnector size={16} />
          <FlowStep
            icon={<ClockIcon />}
            kind="Wait"
            status={{ label: "Up to 3 times" }}
            title="Wait 1 hour"
          />
          <FlowConnector />
          <FlowJump>Back to Charge the card</FlowJump>
        </FlowPath>
      </FlowBranch>
    </Flow>
  );
}
