import type { FlowStatus } from "@/registry/default/ui/flow";
import type { KindId } from "./kinds";

export type StepNode = {
  type: "step";
  id: string;
  kind: KindId;
  title: string;
  status?: FlowStatus;
  muted?: boolean;
  /** Starting values for the step's settings, over the kind's defaults. */
  settings?: Record<string, unknown>;
};
export type BranchNode = {
  type: "branch";
  id: string;
  label: string;
  join?: boolean;
  paths: { label: string; nodes: FlowNode[] }[];
};
export type GroupNode = {
  type: "group";
  id: string;
  kind: KindId;
  title: string;
  status?: FlowStatus;
  collapsible?: boolean;
  defaultOpen?: boolean;
  settings?: Record<string, unknown>;
  nodes: FlowNode[];
};
export type EndNode = { type: "end"; id: string };
export type JumpNode = { type: "jump"; id: string; label: string };
export type FlowNode = StepNode | BranchNode | GroupNode | EndNode | JumpNode;

export type Automation = {
  id: string;
  title: string;
  summary: string;
  shows: string[];
  editable?: boolean;
  paused?: boolean;
  nodes: FlowNode[];
};

let counter = 0;
const uid = (prefix: string) => {
  counter += 1;
  return `${prefix}-${counter}`;
};

const step = (
  kind: KindId,
  title: string,
  extra: Partial<StepNode> = {},
): StepNode => ({ id: uid("step"), kind, title, type: "step", ...extra });
const end = (): EndNode => ({ id: uid("end"), type: "end" });
const jump = (label: string): JumpNode => ({
  id: uid("jump"),
  label,
  type: "jump",
});
const branch = (
  label: string,
  paths: [string, FlowNode[]][],
  join = false,
): BranchNode => ({
  id: uid("branch"),
  join,
  label,
  paths: paths.map(([pathLabel, nodes]) => ({ label: pathLabel, nodes })),
  type: "branch",
});
const group = (
  kind: KindId,
  title: string,
  nodes: FlowNode[],
  extra: Partial<GroupNode> = {},
): GroupNode => ({
  id: uid("group"),
  kind,
  nodes,
  title,
  type: "group",
  ...extra,
});

export const automations: Automation[] = [
  {
    id: "win-back",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour"),
      step("analyse", "Score how likely they are to buy"),
      step("check", "Likely to buy and still not paid?"),
      branch("Likely to buy and still not paid?", [
        [
          "Yes",
          [
            step("coupon", "Make a coupon that fits their score"),
            step("recommend", "Pick 3 similar products"),
            step("email", "Send the offer email"),
            end(),
          ],
        ],
        ["No", [end()]],
      ]),
    ],
    shows: ["Check", "AI score", "Coupon"],
    summary:
      "The core idea: score the shopper with AI, and only send a coupon sized to their score when they are likely to buy.",
    title: "Win back abandoned carts",
  },
  {
    id: "emails",
    nodes: [
      step("email_trigger", "An email arrives at sales@"),
      step("classify", "Work out what they want"),
      branch("What do they want?", [
        [
          "Buying",
          [
            step("analyse", "Score the customer"),
            step("coupon", "Make a matching coupon"),
            step("recommend", "Pick similar products"),
            step("draft", "Write a reply with the offer"),
            step("email", "Send the reply"),
            end(),
          ],
        ],
        [
          "Complaint",
          [
            step("ticket", "Open a support ticket"),
            step("notify", "Tell the support lead"),
            end(),
          ],
        ],
        [
          "Question",
          [
            step("draft", "Draft an answer"),
            step("approval", "A person checks the answer"),
            step("email", "Send the answer"),
            end(),
          ],
        ],
      ]),
    ],
    shows: ["Three paths", "Email trigger"],
    summary:
      "An email comes in, AI sorts it, and buying intent gets the same scored offer as a cart.",
    title: "Turn sales emails into offers",
  },
  {
    id: "new-order",
    nodes: [
      step("order_trigger", "A new order is placed"),
      step("analyse", "Understand the customer"),
      branch(
        "Have they bought before?",
        [
          [
            "Yes",
            [
              step("update", "Add them to the VIP list", {
                settings: { fields: [{ key: "Segment", value: "VIP" }] },
              }),
            ],
          ],
          ["No", [step("email", "Send a welcome email")]],
        ],
        true,
      ),
      step("wait", "Wait 7 days", {
        settings: { duration: { amount: 7, unit: "days" } },
      }),
      step("recommend", "Pick products that go with the order"),
      step("coupon", "Make a 10% thank-you coupon", {
        settings: { amountFrom: "fixed", range: [10, 10] },
      }),
      step("email", "Send their picks"),
    ],
    shows: ["Paths join back", "Order trigger"],
    summary:
      "After an order, treat new and returning buyers differently, then bring both back with a cross-sell.",
    title: "Thank new buyers, then cross-sell",
  },
  {
    id: "tiers",
    nodes: [
      step("cart_trigger", "A cart is left for 2 hours", {
        settings: { idle: { amount: 2, unit: "hours" } },
      }),
      step("analyse", "Score how likely they are to buy"),
      step("split", "How likely are they to buy?"),
      branch(
        "How likely are they to buy?",
        [
          [
            "80% and up",
            [
              step("recommend", "Show similar products, no coupon", {
                settings: { onlyDiscountable: false },
              }),
            ],
          ],
          [
            "40 to 79%",
            [
              step("coupon", "Make a 10% coupon", {
                settings: { amountFrom: "fixed", range: [10, 10] },
              }),
            ],
          ],
          [
            "Below 40%",
            [
              step("coupon", "Make 20% off with free shipping", {
                settings: { amountFrom: "fixed", range: [20, 20], stack: true },
              }),
            ],
          ],
        ],
        true,
      ),
      step("email", "Send the offer email"),
      step("wait", "Wait 2 days", { status: { label: "Up to 2 reminders" } }),
      step("check", "Did they buy?", {
        settings: {
          conditions: [{ field: "paid", operator: "is", value: "Yes" }],
        },
      }),
      branch("Did they buy?", [
        ["Yes", [end()]],
        ["No", [jump("Back to Send the offer email")]],
      ]),
    ],
    shows: ["Three paths join", "Retry"],
    summary:
      "Likely buyers get no discount at all; the less likely they are, the bigger the offer. Reminders loop back.",
    title: "Size the discount to the buying chance",
  },
  {
    id: "each-item",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour"),
      step("analyse", "Score the customer"),
      group(
        "loop",
        "For each item in the cart",
        [
          step("recommend", "Find 3 similar products"),
          step("update", "Save them to the cart record"),
        ],
        { status: { label: "Up to 10 items" } },
      ),
      step("coupon", "Make one coupon for the whole cart"),
      step("draft", "Write the email around their items"),
      step("email", "Send the email"),
    ],
    shows: ["Repeat for each"],
    summary:
      "A loop runs the recommendation once per cart item, so every product gets its own matches.",
    title: "Recommend for every item in the cart",
  },
  {
    id: "runs",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour", {
        status: { label: "1,284 runs" },
      }),
      step("analyse", "Score how likely they are to buy", {
        status: { label: "12 running", tone: "running" },
      }),
      step("check", "Likely to buy and still not paid?"),
      branch("Likely to buy and still not paid?", [
        [
          "Yes",
          [
            step("coupon", "Make a coupon that fits their score", {
              status: { label: "611 done", tone: "done" },
            }),
            step("recommend", "Pick 3 similar products", {
              status: { label: "38 waiting", tone: "waiting" },
            }),
            step("email", "Send the offer email", {
              status: { label: "4 failed", tone: "failed" },
            }),
            end(),
          ],
        ],
        [
          "No",
          [
            step("notify", "Tell sales about carts over $500", {
              muted: true,
            }),
            end(),
          ],
        ],
      ]),
    ],
    paused: true,
    shows: ["Run counts", "Paused", "Skipped step"],
    summary:
      "The first workflow as it looks after 30 days of runs, while it is paused. No run has reached the dimmed step yet.",
    title: "Runs view, paused",
  },
  {
    editable: true,
    id: "build",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour"),
      step("analyse", "Score how likely they are to buy"),
      step("email", "Send a reminder"),
    ],
    shows: ["Edit mode", "Add steps"],
    summary:
      "Edit mode is on: press a plus on any line to add a step there, then set it up. Turn Edit off to hide the plus buttons.",
    title: "Build your own",
  },
  {
    id: "approval",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour"),
      step("analyse", "Score how likely they are to buy"),
      step("coupon", "Suggest a coupon"),
      step("check", "Is the discount above 15%?", {
        settings: {
          conditions: [{ field: "discount", operator: "gte", value: "15" }],
        },
      }),
      branch(
        "Is the discount above 15%?",
        [
          ["Yes", [step("approval", "Ask the sales lead")]],
          ["No", []],
        ],
        true,
      ),
      step("recommend", "Pick similar products"),
      step("email", "Send the offer email"),
    ],
    shows: ["Human approval", "Empty path"],
    summary:
      "AI suggests the coupon, but anything above 15% waits for a person before it goes out.",
    title: "Ask a person before big discounts",
  },
  {
    id: "channels",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour"),
      step("analyse", "Score how likely they are to buy"),
      step("coupon", "Make a coupon that fits their score"),
      step("recommend", "Pick 3 similar products"),
      step("channel", "Pick the channel they answer"),
      branch(
        "Which channel?",
        [
          ["Email", [step("email", "Send the offer email")]],
          ["Text", [step("message", "Send a text with the code")]],
          [
            "WhatsApp",
            [
              step("message", "Send a WhatsApp message", {
                settings: { channel: "whatsapp" },
              }),
            ],
          ],
        ],
        true,
      ),
      step("update", "Log the offer on the customer"),
    ],
    shows: ["AI picks the channel", "Three paths join"],
    summary:
      "The same offer, sent where each customer is most likely to read it.",
    title: "Reach them where they answer",
  },
  {
    id: "program",
    nodes: [
      step("cart_trigger", "A cart is left for 1 hour"),
      group(
        "group",
        "Understand the customer",
        [
          step("analyse", "Score how likely they are to buy"),
          step("classify", "Tag their interests"),
          step("update", "Save the score"),
        ],
        { collapsible: true, defaultOpen: false, status: { label: "3 steps" } },
      ),
      group(
        "group",
        "Make the offer",
        [
          step("coupon", "Make a coupon that fits their score"),
          step("recommend", "Pick 3 similar products"),
          step("draft", "Write the email"),
        ],
        { collapsible: true, defaultOpen: true, status: { label: "3 steps" } },
      ),
      group(
        "group",
        "Reach out and follow up",
        [
          step("email", "Send the offer email"),
          step("wait", "Wait 2 days"),
          step("check", "Did they buy?", {
            settings: {
              conditions: [{ field: "paid", operator: "is", value: "Yes" }],
            },
          }),
          branch("Did they buy?", [
            ["Yes", [end()]],
            ["No", [jump("Back to Send the offer email")]],
          ]),
        ],
        { collapsible: true, defaultOpen: false, status: { label: "3 steps" } },
      ),
      step("notify", "Post a daily summary to #sales", {
        settings: {
          text: "Today: {runs.count} carts, {coupons.used} coupons used, {revenue.recovered} recovered.",
        },
      }),
    ],
    shows: ["Collapsible groups"],
    summary:
      "The whole program in three folding groups, so a long workflow stays readable.",
    title: "The whole program, in groups",
  },
];
