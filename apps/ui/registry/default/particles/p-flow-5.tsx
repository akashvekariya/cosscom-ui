"use client";

import {
  BellIcon,
  ClockIcon,
  FolderPlusIcon,
  type LucideIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { Button } from "@/registry/default/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/registry/default/ui/card";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/registry/default/ui/drawer";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/default/ui/field";
import { Flow, FlowConnector, FlowStep } from "@/registry/default/ui/flow";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/default/ui/number-field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import { Switch } from "@/registry/default/ui/switch";
import { Textarea } from "@/registry/default/ui/textarea";

type Step = {
  id: string;
  icon: LucideIcon;
  kind: string;
  title: string;
  description: string;
  tone?: "default" | "trigger";
};

const initialSteps: Step[] = [
  {
    description: "Runs each time a deal’s stage changes to Won.",
    icon: ZapIcon,
    id: "trigger",
    kind: "Starts when",
    title: "A deal moves to Won",
    tone: "trigger",
  },
  {
    description: "Adds a project with the deal’s name and owner.",
    icon: FolderPlusIcon,
    id: "create",
    kind: "Create record",
    title: "Create an onboarding project",
  },
  {
    description: "Holds the run, then carries on with the next step.",
    icon: ClockIcon,
    id: "wait",
    kind: "Wait",
    title: "Wait 2 days",
  },
  {
    description: "Sends a message to the person who owns the deal.",
    icon: BellIcon,
    id: "notify",
    kind: "Notify",
    title: "Notify the deal owner",
  },
];

const stages = [
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
  { label: "Proposal sent", value: "proposal" },
];

const units = [
  { label: "Hours", value: "hours" },
  { label: "Days", value: "days" },
  { label: "Weeks", value: "weeks" },
];

const recipients = [
  { label: "Deal owner", value: "owner" },
  { label: "Sales team channel", value: "team" },
];

function SelectField({
  label,
  items,
  defaultValue,
}: {
  label: string;
  items: { label: string; value: string }[];
  defaultValue: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select defaultValue={defaultValue} items={items}>
        <SelectTrigger className="min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

// Each kind of step brings its own settings; the panel can hold any fields.
function StepSettings({ kind }: { kind: string }) {
  if (kind === "Starts when") {
    return <SelectField defaultValue="won" items={stages} label="Deal stage" />;
  }
  if (kind === "Create record") {
    return (
      <Label>
        <Switch defaultChecked />
        Copy tasks from the template
      </Label>
    );
  }
  if (kind === "Wait") {
    return (
      <div className="grid grid-cols-2 gap-3 *:min-w-0">
        <Field>
          <FieldLabel>Wait for</FieldLabel>
          <NumberField defaultValue={2} min={1}>
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
        </Field>
        <SelectField defaultValue="days" items={units} label="Unit" />
      </div>
    );
  }
  return (
    <>
      <SelectField defaultValue="owner" items={recipients} label="Send to" />
      <Field>
        <FieldLabel>Message</FieldLabel>
        <Textarea defaultValue="Your deal is won. Please book the kickoff." />
      </Field>
    </>
  );
}

export default function Particle() {
  const isWide = useMediaQuery("lg");
  const [steps, setSteps] = useState(initialSteps);
  const [selectedId, setSelectedId] = useState<string | null>("wait");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Wide screens show the panel beside the flow; narrow ones use a drawer.
  const activeId = isWide || drawerOpen ? selectedId : null;
  const selected = steps.find((step) => step.id === activeId);

  const rename = (title: string) =>
    setSteps((current) =>
      current.map((step) => (step.id === activeId ? { ...step, title } : step)),
    );

  const settings = selected ? (
    <div className="flex flex-col gap-4" key={selected.id}>
      <Field>
        <FieldLabel>Step name</FieldLabel>
        <Input
          onChange={(event) => rename(event.target.value)}
          type="text"
          value={selected?.title ?? ""}
        />
        <FieldDescription>
          Write it as a plain sentence, such as “Wait 2 days”.
        </FieldDescription>
      </Field>
      <StepSettings kind={selected.kind} />
    </div>
  ) : null;

  return (
    <div className="flex w-full items-start gap-4">
      <Flow
        aria-label="Start onboarding for won deals"
        className="min-w-0 flex-1"
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Fragment key={step.id}>
              {index > 0 ? <FlowConnector /> : null}
              <FlowStep
                icon={<Icon />}
                kind={step.kind}
                onClick={() => {
                  setSelectedId(step.id);
                  if (!isWide) setDrawerOpen(true);
                }}
                selected={step.id === activeId}
                title={step.title}
                tone={step.tone}
              />
            </Fragment>
          );
        })}
      </Flow>
      {isWide && selected ? (
        <Card
          aria-label={`${selected.kind} settings`}
          className="w-72 shrink-0"
          render={<aside />}
        >
          <CardHeader>
            <CardTitle>{selected.kind}</CardTitle>
            <CardDescription>{selected.description}</CardDescription>
            <CardAction>
              <Button
                aria-label="Close settings"
                onClick={() => setSelectedId(null)}
                size="icon-sm"
                variant="ghost"
              >
                <XIcon aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardPanel>{settings}</CardPanel>
        </Card>
      ) : null}
      <Drawer
        onOpenChange={setDrawerOpen}
        open={!isWide && drawerOpen}
        position="right"
      >
        <DrawerPopup showCloseButton>
          <DrawerHeader>
            <DrawerTitle>{selected?.kind}</DrawerTitle>
            <DrawerDescription>{selected?.description}</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>{settings}</DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </div>
  );
}
