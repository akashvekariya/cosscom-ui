"use client";

import { PauseIcon, PlayIcon, Settings2Icon } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/registry/default/ui/alert";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/registry/default/ui/dialog";
import {
  Flow,
  FlowAdd,
  FlowBranch,
  FlowChip,
  FlowEnd,
  FlowGroup,
  FlowJump,
  FlowPath,
  FlowStep,
} from "@/registry/default/ui/flow";
import { Label } from "@/registry/default/ui/label";
import { Switch } from "@/registry/default/ui/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/default/ui/tabs";
import {
  type Automation,
  type FlowNode,
  automations as initialAutomations,
  type StepNode,
} from "./data";
import {
  advancedTab,
  type FieldDef,
  generalSection,
  type Kind,
  type KindId,
  kinds,
  type Tab,
} from "./kinds";
import { SettingsSection, type Values } from "./settings-form";

type Target = { automationId: string; nodeId: string };
type Slot = { automationId: string; list: string; index: number };

const addable: KindId[] = [
  "analyse",
  "classify",
  "recommend",
  "draft",
  "channel",
  "check",
  "coupon",
  "email",
  "message",
  "wait",
  "approval",
  "notify",
  "ticket",
  "update",
];

function kindOf(id: KindId): Kind {
  return kinds[id];
}

function allFields(kind: Kind): FieldDef[] {
  return [
    generalSection,
    ...kind.tabs.flatMap((tab) => tab.sections),
    ...advancedTab.sections,
  ].flatMap((section) => section.fields);
}

function defaultValues(
  kind: Kind,
  title: string,
  settings: Values = {},
): Values {
  const values: Values = {};
  for (const field of allFields(kind)) {
    if ("default" in field && field.default !== undefined) {
      values[field.id] = field.default;
    }
  }
  Object.assign(values, settings);
  values.name = title;
  return values;
}

function findNode(nodes: FlowNode[], id: string): FlowNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "branch") {
      for (const path of node.paths) {
        const found = findNode(path.nodes, id);
        if (found) return found;
      }
    }
    if (node.type === "group") {
      const found = findNode(node.nodes, id);
      if (found) return found;
    }
  }
  return undefined;
}

function mapNodes(
  nodes: FlowNode[],
  list: string,
  edit: (nodes: FlowNode[], list: string) => FlowNode[],
): FlowNode[] {
  const own = edit(nodes, list);
  return own.map((node) => {
    if (node.type === "branch") {
      return {
        ...node,
        paths: node.paths.map((path, index) => ({
          ...path,
          nodes: mapNodes(path.nodes, `${node.id}:${index}`, edit),
        })),
      };
    }
    if (node.type === "group") {
      return { ...node, nodes: mapNodes(node.nodes, node.id, edit) };
    }
    return node;
  });
}

let added = 0;

export function AutomationsPage() {
  const [flows, setFlows] = useState<Automation[]>(initialAutomations);
  const [values, setValues] = useState<Record<string, Values>>({});
  const [target, setTarget] = useState<Target | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const flowById = (id: string) => flows.find((flow) => flow.id === id);
  const targetNode = target
    ? findNode(flowById(target.automationId)?.nodes ?? [], target.nodeId)
    : undefined;
  const targetStep =
    targetNode && (targetNode.type === "step" || targetNode.type === "group")
      ? targetNode
      : undefined;
  const valueKey = target ? `${target.automationId}:${target.nodeId}` : "";

  const updateFlow = (id: string, patch: (flow: Automation) => Automation) =>
    setFlows((current) =>
      current.map((flow) => (flow.id === id ? patch(flow) : flow)),
    );

  const save = (next: Values) => {
    if (!target) return;
    setValues((current) => ({ ...current, [valueKey]: next }));
    const title = String(next.name ?? "").trim();
    if (title) {
      updateFlow(target.automationId, (flow) => ({
        ...flow,
        nodes: mapNodes(flow.nodes, "root", (nodes) =>
          nodes.map((node) =>
            node.id === target.nodeId &&
            (node.type === "step" || node.type === "group")
              ? { ...node, title }
              : node,
          ),
        ),
      }));
    }
    setTarget(null);
  };

  const insert = (kind: KindId) => {
    if (!slot) return;
    added += 1;
    const node: StepNode = {
      id: `added-${added}`,
      kind,
      title: "Untitled step",
      type: "step",
    };
    updateFlow(slot.automationId, (flow) => ({
      ...flow,
      nodes: mapNodes(flow.nodes, "root", (nodes, list) =>
        list === slot.list
          ? [...nodes.slice(0, slot.index), node, ...nodes.slice(slot.index)]
          : nodes,
      ),
    }));
    setSlot(null);
    setTarget({ automationId: slot.automationId, nodeId: node.id });
  };

  const renderNodes = (
    flow: Automation,
    nodes: FlowNode[],
    list: string,
    nested: boolean,
  ): ReactNode[] => {
    const out: ReactNode[] = [];
    const line = (size: 16 | 22, index: number, key: string) => (
      <FlowAdd
        key={key}
        label="Add a step here"
        onClick={() => setSlot({ automationId: flow.id, index, list })}
        size={size}
      />
    );
    if (nested && nodes.length === 0) out.push(line(16, 0, `${list}-empty`));
    nodes.forEach((node, index) => {
      const previous = nodes[index - 1];
      let size: 16 | 22 | null = 22;
      if (index === 0) size = nested ? 16 : null;
      else if (node.type === "branch") size = 16;
      else if (previous?.type === "branch" && previous.join) size = 16;
      if (size) out.push(line(size, index, `${node.id}-line`));
      out.push(<Fragment key={node.id}>{renderNode(flow, node)}</Fragment>);
    });
    return out;
  };

  const renderNode = (flow: Automation, node: FlowNode): ReactNode => {
    const open = () => setTarget({ automationId: flow.id, nodeId: node.id });
    const selected =
      target?.automationId === flow.id && target.nodeId === node.id;
    switch (node.type) {
      case "step": {
        const kind = kindOf(node.kind);
        const Icon = kind.icon;
        return (
          <FlowStep
            aria-haspopup="dialog"
            icon={<Icon />}
            kind={kind.label}
            muted={node.muted}
            onClick={open}
            selected={selected}
            status={node.status}
            title={node.title}
            tone={kind.tone}
          />
        );
      }
      case "branch":
        return (
          <FlowBranch join={node.join} label={node.label}>
            {node.paths.map((path, index) => (
              <FlowPath key={path.label} label={path.label}>
                {renderNodes(flow, path.nodes, `${node.id}:${index}`, true)}
              </FlowPath>
            ))}
          </FlowBranch>
        );
      case "group": {
        const kind = kindOf(node.kind);
        const Icon = kind.icon;
        const settings = kind.tabs.length > 0;
        return (
          <FlowGroup
            collapsible={node.collapsible}
            defaultOpen={node.defaultOpen}
            icon={<Icon />}
            kind={kind.label}
            status={
              settings ? (
                <>
                  {node.status ? (
                    <FlowChip>{node.status.label}</FlowChip>
                  ) : null}
                  <Button
                    aria-haspopup="dialog"
                    aria-label={`${kind.label} settings`}
                    onClick={open}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Settings2Icon aria-hidden="true" />
                  </Button>
                </>
              ) : (
                node.status
              )
            }
            title={node.title}
          >
            {renderNodes(flow, node.nodes, node.id, true)}
          </FlowGroup>
        );
      }
      case "end":
        return <FlowEnd>Done</FlowEnd>;
      case "jump":
        return <FlowJump>{node.label}</FlowJump>;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="flex max-w-3xl flex-col gap-3">
        <Badge className="self-start" variant="outline">
          Design preview, nothing runs
        </Badge>
        <h1 className="font-heading font-semibold text-3xl sm:text-4xl">
          AI automations for carts and orders
        </h1>
        <p className="text-muted-foreground">
          Ten versions of one idea: when a cart is left, an order comes in or an
          email arrives, Claude scores the customer, a coupon is sized to how
          likely they are to buy, similar products are picked, and the offer is
          sent. Click any step to see every setting it has.
        </p>
      </header>
      <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Automations" className="hidden lg:block">
          <ol className="sticky top-20 flex flex-col gap-1 text-sm">
            {flows.map((flow, index) => (
              <li key={flow.id}>
                <a
                  className="flex gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  href={`#${flow.id}`}
                >
                  <span className="tabular-nums">{index + 1}.</span>
                  {flow.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-w-0 flex-col gap-16">
          {flows.map((flow, index) => (
            <section
              aria-labelledby={`${flow.id}-title`}
              className="flex scroll-mt-20 flex-col gap-4"
              id={flow.id}
              key={flow.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex max-w-2xl flex-col gap-1.5">
                  <h2
                    className="font-heading font-semibold text-xl"
                    id={`${flow.id}-title`}
                  >
                    <span className="text-muted-foreground tabular-nums">
                      {index + 1}.{" "}
                    </span>
                    {flow.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {flow.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {flow.shows.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {flow.paused ? (
                    <Button
                      onClick={() =>
                        updateFlow(flow.id, (current) => ({
                          ...current,
                          paused: false,
                        }))
                      }
                      size="sm"
                      variant="outline"
                    >
                      <PlayIcon aria-hidden="true" />
                      Resume
                    </Button>
                  ) : null}
                  <Label>
                    <Switch
                      checked={Boolean(flow.editable)}
                      onCheckedChange={(checked) =>
                        updateFlow(flow.id, (current) => ({
                          ...current,
                          editable: checked,
                        }))
                      }
                    />
                    Edit
                  </Label>
                </div>
              </div>
              <Flow
                aria-labelledby={`${flow.id}-title`}
                className="w-full"
                editable={Boolean(flow.editable)}
                notice={
                  flow.paused ? (
                    <Alert className="bg-card" variant="warning">
                      <PauseIcon aria-hidden="true" />
                      <AlertTitle>Paused</AlertTitle>
                      <AlertDescription>
                        New carts wait here until you resume.
                      </AlertDescription>
                    </Alert>
                  ) : undefined
                }
              >
                {renderNodes(flow, flow.nodes, "root", false)}
              </Flow>
            </section>
          ))}
        </div>
      </div>

      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) setTarget(null);
        }}
        open={Boolean(targetStep)}
      >
        <DialogPopup className="sm:max-w-xl">
          {targetStep ? (
            <StepSettings
              initial={
                values[valueKey] ??
                defaultValues(
                  kindOf(targetStep.kind),
                  targetStep.title,
                  targetStep.settings,
                )
              }
              key={valueKey}
              kind={kindOf(targetStep.kind)}
              onSave={save}
            />
          ) : null}
        </DialogPopup>
      </Dialog>

      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) setSlot(null);
        }}
        open={Boolean(slot)}
      >
        <DialogPopup className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a step</DialogTitle>
            <DialogDescription>
              Pick what happens here. You can set it up next.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ul className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {addable.map((id) => {
                const kind = kindOf(id);
                const Icon = kind.icon;
                return (
                  <li key={id}>
                    <button
                      className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-start outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => insert(id)}
                      type="button"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon aria-hidden="true" className="size-4.5" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">
                          {kind.label}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {kind.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </div>
  );
}

function StepSettings({
  kind,
  initial,
  onSave,
}: {
  kind: Kind;
  initial: Values;
  onSave: (values: Values) => void;
}) {
  const [draft, setDraft] = useState<Values>(initial);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const Icon = kind.icon;
  const change = (id: string, value: unknown) =>
    setDraft((current) => ({ ...current, [id]: value }));

  const setup = kind.tabs.find((tab) => tab.id === "setup");
  const others = kind.tabs.filter((tab) => tab.id !== "setup");
  const tabs: Tab[] = [
    {
      id: "setup",
      label: "Setup",
      sections: [generalSection, ...(setup?.sections ?? [])],
    },
    ...others,
    advancedTab,
  ];

  const runTest = () => {
    setTesting(true);
    setResult(null);
    window.setTimeout(() => {
      setTesting(false);
      setResult(kind.sample);
    }, 700);
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={
              kind.tone === "trigger"
                ? "flex size-9 items-center justify-center rounded-md bg-info/12 text-info-foreground"
                : "flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
            }
          >
            <Icon className="size-4.5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs">
              {kind.label}
              {kind.ai ? " · Claude" : ""}
            </span>
            <DialogTitle className="truncate">
              {String(draft.name || "Untitled step")}
            </DialogTitle>
          </div>
        </div>
        <DialogDescription>{kind.description}</DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <Tabs defaultValue="setup">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTab key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTab>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsPanel
              className="flex flex-col gap-8 pt-4"
              key={tab.id}
              value={tab.id}
            >
              {tab.sections.map((section) => (
                <SettingsSection
                  key={section.title}
                  onChange={change}
                  section={section}
                  values={draft}
                />
              ))}
            </TabsPanel>
          ))}
        </Tabs>
        {result ? (
          <div
            aria-live="polite"
            className="mt-6 rounded-lg border bg-muted/48 p-3"
          >
            <p className="mb-2 font-medium text-sm">Test result</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {Object.entries(result).map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd>{value}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        ) : null}
      </DialogPanel>
      <DialogFooter>
        {Object.keys(kind.sample).length > 0 ? (
          <Button
            className="sm:me-auto"
            loading={testing}
            onClick={runTest}
            variant="outline"
          >
            Run a test
          </Button>
        ) : null}
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button onClick={() => onSave(draft)}>Save</Button>
      </DialogFooter>
    </>
  );
}
