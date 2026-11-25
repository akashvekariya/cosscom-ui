import {
  BellIcon,
  BrainIcon,
  CheckCheckIcon,
  ClockIcon,
  DatabaseIcon,
  LayersIcon,
  type LucideIcon,
  MailIcon,
  MailOpenIcon,
  MessageSquareIcon,
  PenLineIcon,
  RepeatIcon,
  RouteIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  SplitIcon,
  TagIcon,
  TicketIcon,
  UserCheckIcon,
} from "lucide-react";

export type Option = { label: string; value: string };

export type Condition = { field: string; operator: string; value: string };
export type Row = { key: string; value: string };

export type FieldDef =
  | {
      type: "text";
      id: string;
      label: string;
      placeholder?: string;
      description?: string;
      default?: string;
    }
  | {
      type: "textarea";
      id: string;
      label: string;
      description?: string;
      default?: string;
    }
  | {
      type: "number";
      id: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      description?: string;
      default?: number;
    }
  | {
      type: "select";
      id: string;
      label: string;
      options: Option[];
      description?: string;
      default?: string;
    }
  | {
      type: "radio";
      id: string;
      label: string;
      options: Option[];
      default?: string;
    }
  | {
      type: "checkboxes";
      id: string;
      label: string;
      options: Option[];
      default?: string[];
    }
  | {
      type: "switch";
      id: string;
      label: string;
      description?: string;
      default?: boolean;
    }
  | {
      type: "slider";
      id: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      suffix?: string;
      default: number | number[];
    }
  | {
      type: "duration";
      id: string;
      label: string;
      default: { amount: number; unit: string };
    }
  | {
      type: "conditions";
      id: string;
      label: string;
      fields: Option[];
      default: Condition[];
    }
  | {
      type: "rows";
      id: string;
      label: string;
      keyLabel: string;
      valueLabel: string;
      default: Row[];
    }
  | {
      type: "tags";
      id: string;
      label: string;
      placeholder?: string;
      default: string[];
    };

export type Section = { title: string; fields: FieldDef[] };
export type Tab = { id: string; label: string; sections: Section[] };

export type Kind = {
  label: string;
  description: string;
  icon: LucideIcon;
  tone?: "trigger";
  ai?: boolean;
  tabs: Tab[];
  sample: Record<string, string>;
};

export const models: Option[] = [
  { label: "Claude Opus 5.5 (most capable)", value: "claude-opus-5-5" },
  { label: "Claude Sonnet 5.5 (balanced)", value: "claude-sonnet-5-5" },
  { label: "Claude Haiku 5.5 (fastest)", value: "claude-haiku-5-5" },
  { label: "Claude Fable 5.2", value: "claude-fable-5-2" },
];

const units: Option[] = [
  { label: "Minutes", value: "minutes" },
  { label: "Hours", value: "hours" },
  { label: "Days", value: "days" },
  { label: "Weeks", value: "weeks" },
];

const stores: Option[] = [
  { label: "Main store", value: "main" },
  { label: "Outlet store", value: "outlet" },
  { label: "Wholesale", value: "wholesale" },
];

const customerFields: Option[] = [
  { label: "Purchase likelihood", value: "likelihood" },
  { label: "Cart value", value: "cart_value" },
  { label: "Order is paid", value: "paid" },
  { label: "Customer segment", value: "segment" },
  { label: "Orders so far", value: "orders" },
  { label: "Country", value: "country" },
  { label: "Discount suggested", value: "discount" },
];

export const operators: Option[] = [
  { label: "is", value: "is" },
  { label: "is not", value: "is_not" },
  { label: "is at least", value: "gte" },
  { label: "is below", value: "lt" },
  { label: "contains", value: "contains" },
];

// The AI tab every AI step shares.
function aiTab(instructions: string): Tab {
  return {
    id: "ai",
    label: "AI",
    sections: [
      {
        fields: [
          {
            default: "claude-sonnet-5-5",
            description:
              "Bigger models think harder; smaller ones are faster and cheaper.",
            id: "model",
            label: "Model",
            options: models,
            type: "select",
          },
          {
            default: instructions,
            description:
              "Plain words. Use {customer.name}, {cart.items} and other fields.",
            id: "instructions",
            label: "Instructions",
            type: "textarea",
          },
        ],
        title: "Claude",
      },
      {
        fields: [
          {
            default: 0.3,
            id: "creativity",
            label: "Creativity",
            max: 1,
            min: 0,
            step: 0.1,
            type: "slider",
          },
          {
            default: true,
            description: "Lets the model reason before it answers.",
            id: "thinking",
            label: "Extended thinking",
            type: "switch",
          },
          {
            default: "medium",
            id: "effort",
            label: "Thinking effort",
            options: [
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
            ],
            type: "radio",
          },
          {
            default: 1024,
            id: "maxTokens",
            label: "Longest answer (tokens)",
            max: 8192,
            min: 64,
            step: 64,
            type: "number",
          },
          {
            default: "ask",
            id: "unsure",
            label: "When the model is unsure",
            options: [
              { label: "Ask a person", value: "ask" },
              { label: "Use the fallback values", value: "fallback" },
              { label: "Skip this step", value: "skip" },
              { label: "Stop the run", value: "stop" },
            ],
            type: "select",
          },
        ],
        title: "Behaviour",
      },
    ],
  };
}

export const kinds = {
  approval: {
    description: "Pause the run until a person approves.",
    icon: UserCheckIcon,
    label: "Approve",
    sample: {
      Approver: "Sales lead",
      Decision: "Approved",
      Waited: "14 minutes",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "sales-lead",
                id: "approver",
                label: "Who approves",
                options: [
                  { label: "Sales lead", value: "sales-lead" },
                  { label: "Store manager", value: "manager" },
                  { label: "Anyone in Sales", value: "sales" },
                ],
                type: "select",
              },
              {
                default: "threshold",
                id: "when",
                label: "Ask when",
                options: [
                  { label: "Always", value: "always" },
                  {
                    label: "The discount is above a limit",
                    value: "threshold",
                  },
                ],
                type: "radio",
              },
              {
                default: 15,
                id: "limit",
                label: "Discount limit (%)",
                max: 100,
                min: 0,
                type: "number",
              },
              {
                default: { amount: 2, unit: "hours" },
                id: "remind",
                label: "Remind them after",
                type: "duration",
              },
              {
                default: "reject",
                id: "noAnswer",
                label: "If nobody answers in a day",
                options: [
                  { label: "Approve it", value: "approve" },
                  { label: "Reject it", value: "reject" },
                ],
                type: "radio",
              },
            ],
            title: "Approval",
          },
        ],
      },
    ],
  },
  check: {
    description: "Choose a path from the data so far.",
    icon: SplitIcon,
    label: "Check",
    sample: { Result: "Yes", Matched: "Purchase likelihood is at least 60" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: [
                  { field: "likelihood", operator: "gte", value: "60" },
                  { field: "paid", operator: "is", value: "No" },
                ],
                fields: customerFields,
                id: "conditions",
                label: "Conditions",
                type: "conditions",
              },
              {
                default: "all",
                id: "match",
                label: "Go down Yes when",
                options: [
                  { label: "All conditions match", value: "all" },
                  { label: "Any condition matches", value: "any" },
                ],
                type: "radio",
              },
            ],
            title: "Rule",
          },
          {
            fields: [
              {
                default: "Yes",
                id: "yesLabel",
                label: "Name of the Yes path",
                type: "text",
              },
              {
                default: "No",
                id: "noLabel",
                label: "Name of the No path",
                type: "text",
              },
            ],
            title: "Paths",
          },
        ],
      },
    ],
  },
  classify: {
    ai: true,
    description: "Sort an email or order into categories with AI.",
    icon: SparklesIcon,
    label: "Classify with AI",
    sample: {
      Category: "Buying intent",
      Confidence: "0.91",
      Language: "English",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: ["Buying intent", "Complaint", "Question", "Spam"],
                id: "categories",
                label: "Categories",
                placeholder: "Add a category",
                type: "tags",
              },
              {
                default: 70,
                id: "confidence",
                label: "Minimum confidence",
                max: 100,
                min: 0,
                suffix: "%",
                type: "slider",
              },
              {
                default: ["text", "history"],
                id: "inputs",
                label: "Read",
                options: [
                  { label: "Email text", value: "text" },
                  { label: "Attachments", value: "attachments" },
                  { label: "Customer history", value: "history" },
                  { label: "Open orders", value: "orders" },
                ],
                type: "checkboxes",
              },
            ],
            title: "Categories",
          },
        ],
      },
      aiTab(
        "Read the email and decide what the customer wants. Pick one category.",
      ),
    ],
  },
  coupon: {
    description: "Make a discount code that fits the customer.",
    icon: TagIcon,
    label: "Create discount",
    sample: { Code: "SAVE-8K2Q", Discount: "12% off", Expires: "in 3 days" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "percent",
                id: "type",
                label: "Discount type",
                options: [
                  { label: "Percent off", value: "percent" },
                  { label: "Fixed amount off", value: "fixed" },
                  { label: "Free shipping", value: "shipping" },
                ],
                type: "radio",
              },
              {
                default: "likelihood",
                id: "amountFrom",
                label: "Set the amount",
                options: [
                  { label: "From purchase likelihood", value: "likelihood" },
                  { label: "The same for everyone", value: "fixed" },
                  { label: "Let AI decide within the range", value: "ai" },
                ],
                type: "select",
              },
              {
                default: [5, 20],
                id: "range",
                label: "Allowed range",
                max: 50,
                min: 0,
                suffix: "%",
                type: "slider",
              },
              {
                default: [
                  { key: "80 to 100", value: "0%" },
                  { key: "60 to 79", value: "5%" },
                  { key: "40 to 59", value: "10%" },
                  { key: "0 to 39", value: "15%" },
                ],
                id: "bands",
                keyLabel: "Likelihood",
                label: "Likelihood to discount",
                type: "rows",
                valueLabel: "Discount",
              },
              {
                default: 40,
                id: "cap",
                label: "Never more than ($)",
                min: 0,
                type: "number",
              },
            ],
            title: "Amount",
          },
          {
            fields: [
              {
                default: "SAVE",
                id: "prefix",
                label: "Code starts with",
                type: "text",
              },
              {
                default: { amount: 3, unit: "days" },
                id: "expires",
                label: "Expires after",
                type: "duration",
              },
              {
                default: 1,
                id: "uses",
                label: "Uses per customer",
                min: 1,
                type: "number",
              },
              {
                default: 30,
                id: "minSpend",
                label: "Minimum spend ($)",
                min: 0,
                type: "number",
              },
              {
                default: "cart",
                id: "appliesTo",
                label: "Applies to",
                options: [
                  { label: "Items in the cart", value: "cart" },
                  { label: "Recommended products", value: "recommended" },
                  { label: "Everything in the store", value: "all" },
                ],
                type: "select",
              },
              {
                default: false,
                id: "stack",
                label: "Works with other offers",
                type: "switch",
              },
            ],
            title: "Rules",
          },
        ],
      },
    ],
  },
  draft: {
    ai: true,
    description: "Write a reply or message with AI.",
    icon: PenLineIcon,
    label: "Write with AI",
    sample: {
      Subject: "A little something for your cart",
      Words: "96",
      Tone: "Friendly",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "friendly",
                id: "tone",
                label: "Tone",
                options: [
                  { label: "Friendly", value: "friendly" },
                  { label: "Formal", value: "formal" },
                  { label: "Playful", value: "playful" },
                  { label: "Short and direct", value: "direct" },
                ],
                type: "select",
              },
              {
                default: "short",
                id: "length",
                label: "Length",
                options: [
                  { label: "Short", value: "short" },
                  { label: "Medium", value: "medium" },
                  { label: "Long", value: "long" },
                ],
                type: "radio",
              },
              {
                default: ["coupon", "products"],
                id: "include",
                label: "Mention",
                options: [
                  { label: "The coupon", value: "coupon" },
                  { label: "Recommended products", value: "products" },
                  { label: "Their cart", value: "cart" },
                  { label: "Shipping times", value: "shipping" },
                ],
                type: "checkboxes",
              },
              {
                default: true,
                id: "review",
                label: "A person reviews it before sending",
                type: "switch",
              },
            ],
            title: "Writing",
          },
        ],
      },
      aiTab(
        "Write a warm, short email in the customer's language. Keep the coupon and products front and centre.",
      ),
    ],
  },
  email: {
    description: "Send an email to the customer.",
    icon: MailIcon,
    label: "Send email",
    sample: {
      To: "maya@example.com",
      Subject: "Still thinking it over?",
      Status: "Delivered",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "store",
                id: "from",
                label: "From",
                options: [
                  { label: "The store <hello@store.example>", value: "store" },
                  {
                    label: "Customer success <care@store.example>",
                    value: "care",
                  },
                ],
                type: "select",
              },
              {
                default: "{customer.email}",
                id: "to",
                label: "To",
                type: "text",
              },
              {
                default: "Still thinking it over? Here is {coupon.amount} off",
                id: "subject",
                label: "Subject",
                type: "text",
              },
              {
                default: "Your cart is saved, and so is your discount.",
                id: "preheader",
                label: "Preview text",
                type: "text",
              },
              {
                default: "offer",
                id: "template",
                label: "Template",
                options: [
                  { label: "Offer with products", value: "offer" },
                  { label: "Plain letter", value: "plain" },
                  { label: "Written by the AI step", value: "ai" },
                ],
                type: "select",
              },
              {
                default:
                  "Hi {customer.first_name},\n\nYou left {cart.items} in your cart. Use {coupon.code} for {coupon.amount} off until {coupon.expires}.",
                id: "body",
                label: "Message",
                type: "textarea",
              },
              {
                default: ["coupon", "products", "cart"],
                id: "blocks",
                label: "Blocks",
                options: [
                  { label: "Coupon", value: "coupon" },
                  { label: "Recommended products", value: "products" },
                  { label: "Cart summary", value: "cart" },
                  { label: "Reviews", value: "reviews" },
                ],
                type: "checkboxes",
              },
            ],
            title: "Message",
          },
          {
            fields: [
              {
                default: "best",
                id: "send",
                label: "Send",
                options: [
                  { label: "Right away", value: "now" },
                  { label: "At each customer's best time", value: "best" },
                  { label: "At a set time", value: "set" },
                ],
                type: "radio",
              },
              {
                default: true,
                id: "opens",
                label: "Track opens and clicks",
                type: "switch",
              },
              {
                default: false,
                id: "ab",
                label: "Test two subject lines",
                type: "switch",
              },
              {
                default: "auto",
                id: "language",
                label: "Language",
                options: [
                  { label: "The customer's language", value: "auto" },
                  { label: "English", value: "en" },
                  { label: "German", value: "de" },
                  { label: "Spanish", value: "es" },
                ],
                type: "select",
              },
            ],
            title: "Sending",
          },
        ],
      },
    ],
  },
  analyse: {
    ai: true,
    description:
      "Read the customer and their order or cart, and score them with AI.",
    icon: BrainIcon,
    label: "Analyse with AI",
    sample: {
      "Purchase likelihood": "82",
      Segment: "Likely buyer",
      Reason: "Viewed the item 4 times and bought twice this year",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: ["cart", "history", "browsing"],
                id: "inputs",
                label: "What to read",
                options: [
                  { label: "The order or cart", value: "cart" },
                  { label: "Purchase history", value: "history" },
                  { label: "Pages they viewed", value: "browsing" },
                  { label: "Emails and chats", value: "messages" },
                  { label: "Support tickets", value: "tickets" },
                  { label: "Reviews they wrote", value: "reviews" },
                ],
                type: "checkboxes",
              },
              {
                default: { amount: 90, unit: "days" },
                id: "lookback",
                label: "Look back",
                type: "duration",
              },
            ],
            title: "Input",
          },
          {
            fields: [
              {
                default: [
                  { key: "purchase_likelihood", value: "Number, 0 to 100" },
                  {
                    key: "segment",
                    value: "One of: Likely buyer, Unsure, Price hunter",
                  },
                  { key: "reason", value: "Text, one sentence" },
                ],
                id: "outputs",
                keyLabel: "Field",
                label: "Fields it returns",
                type: "rows",
                valueLabel: "Kind",
              },
              {
                default: [{ key: "purchase_likelihood", value: "50" }],
                id: "fallback",
                keyLabel: "Field",
                label: "Fallback values",
                type: "rows",
                valueLabel: "Value",
              },
            ],
            title: "Output",
          },
        ],
      },
      aiTab(
        "Estimate how likely this customer is to buy what is in their cart in the next 3 days. Explain why in one sentence.",
      ),
    ],
  },
  channel: {
    ai: true,
    description: "Pick where the customer is most likely to answer.",
    icon: RouteIcon,
    label: "Pick a channel",
    sample: {
      Channel: "WhatsApp",
      Reason: "Replied on WhatsApp twice last month",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: ["email", "sms", "whatsapp"],
                id: "channels",
                label: "Channels to choose from",
                options: [
                  { label: "Email", value: "email" },
                  { label: "Text message", value: "sms" },
                  { label: "WhatsApp", value: "whatsapp" },
                  { label: "App notification", value: "push" },
                ],
                type: "checkboxes",
              },
              {
                default: true,
                id: "consent",
                label: "Only channels they agreed to",
                type: "switch",
              },
              {
                default: "email",
                id: "fallback",
                label: "If unsure, use",
                options: [
                  { label: "Email", value: "email" },
                  { label: "Text message", value: "sms" },
                ],
                type: "select",
              },
            ],
            title: "Channels",
          },
        ],
      },
      aiTab("Pick the channel this customer is most likely to read today."),
    ],
  },
  email_trigger: {
    description: "Start when an email arrives.",
    icon: MailOpenIcon,
    label: "Starts when",
    sample: {
      From: "maya@example.com",
      Subject: "Do you have this in blue?",
      Received: "2 min ago",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "sales",
                id: "inbox",
                label: "Inbox",
                options: [
                  { label: "sales@store.example", value: "sales" },
                  { label: "help@store.example", value: "help" },
                ],
                type: "select",
              },
              {
                default: "",
                id: "from",
                label: "From contains",
                placeholder: "Any sender",
                type: "text",
              },
              {
                default: "",
                id: "subject",
                label: "Subject contains",
                placeholder: "Any subject",
                type: "text",
              },
              {
                default: true,
                id: "autoReplies",
                label: "Ignore auto-replies",
                type: "switch",
              },
              {
                default: false,
                id: "attachments",
                label: "Only emails with attachments",
                type: "switch",
              },
            ],
            title: "Emails",
          },
        ],
      },
    ],
    tone: "trigger",
  },
  group: {
    description: "A set of steps shown together.",
    icon: LayersIcon,
    label: "Group",
    sample: {},
    tabs: [],
  },
  loop: {
    description: "Run the steps inside once for each item.",
    icon: RepeatIcon,
    label: "Repeat",
    sample: { Items: "3", Finished: "3", Skipped: "0" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "cart",
                id: "collection",
                label: "For each",
                options: [
                  { label: "Item in the cart", value: "cart" },
                  { label: "Line in the order", value: "order" },
                  { label: "Recommended product", value: "recs" },
                ],
                type: "select",
              },
              {
                default: 20,
                id: "max",
                label: "At most this many items",
                max: 100,
                min: 1,
                type: "number",
              },
              {
                default: true,
                id: "parallel",
                label: "Run items at the same time",
                type: "switch",
              },
              {
                default: "skip",
                id: "onError",
                label: "If one item fails",
                options: [
                  { label: "Skip that item", value: "skip" },
                  { label: "Stop the loop", value: "stop" },
                ],
                type: "radio",
              },
            ],
            title: "Loop",
          },
        ],
      },
    ],
  },
  message: {
    description: "Send a text or chat message.",
    icon: MessageSquareIcon,
    label: "Send message",
    sample: { To: "+44 7700 900123", Status: "Delivered" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "sms",
                id: "channel",
                label: "Channel",
                options: [
                  { label: "Text message", value: "sms" },
                  { label: "WhatsApp", value: "whatsapp" },
                  { label: "App notification", value: "push" },
                ],
                type: "select",
              },
              {
                default:
                  "Hi {customer.first_name}, {coupon.amount} off your cart until {coupon.expires}: {cart.link}",
                id: "text",
                label: "Message",
                type: "textarea",
              },
              {
                default: true,
                id: "quiet",
                label: "Hold during quiet hours (9 pm to 8 am)",
                type: "switch",
              },
              {
                default: true,
                id: "shortLinks",
                label: "Shorten links",
                type: "switch",
              },
            ],
            title: "Message",
          },
        ],
      },
    ],
  },
  notify: {
    description: "Tell your team.",
    icon: BellIcon,
    label: "Notify",
    sample: { Channel: "#sales", Status: "Posted" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "slack",
                id: "channel",
                label: "Where",
                options: [
                  { label: "Slack", value: "slack" },
                  { label: "Microsoft Teams", value: "teams" },
                  { label: "Email", value: "email" },
                ],
                type: "select",
              },
              {
                default: ["#sales"],
                id: "to",
                label: "Send to",
                placeholder: "Add a channel or person",
                type: "tags",
              },
              {
                default: "{customer.name} may need help: {analysis.reason}",
                id: "text",
                label: "Message",
                type: "textarea",
              },
              {
                default: true,
                id: "mention",
                label: "Mention the account owner",
                type: "switch",
              },
            ],
            title: "Message",
          },
        ],
      },
    ],
  },
  order_trigger: {
    description: "Start when a new order is placed.",
    icon: ShoppingBagIcon,
    label: "Starts when",
    sample: { Order: "#10482", Total: "$184.00", Customer: "Maya Chen" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "main",
                id: "store",
                label: "Store",
                options: stores,
                type: "select",
              },
              {
                default: "placed",
                id: "status",
                label: "When the order is",
                options: [
                  { label: "Placed", value: "placed" },
                  { label: "Paid", value: "paid" },
                  { label: "Shipped", value: "shipped" },
                ],
                type: "select",
              },
              {
                default: 0,
                id: "minTotal",
                label: "Minimum total ($)",
                min: 0,
                type: "number",
              },
              {
                default: [],
                id: "countries",
                label: "Only these countries",
                placeholder: "Any country",
                type: "tags",
              },
              {
                default: false,
                id: "test",
                label: "Include test orders",
                type: "switch",
              },
            ],
            title: "Orders",
          },
        ],
      },
    ],
    tone: "trigger",
  },
  recommend: {
    ai: true,
    description: "Suggest products similar to what is in the cart.",
    icon: SparklesIcon,
    label: "Recommend with AI",
    sample: {
      Products: "Linen shirt, Canvas tote, Straw hat",
      "Average price": "$42",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: 3,
                id: "count",
                label: "How many products",
                max: 8,
                min: 1,
                type: "number",
              },
              {
                default: ["category", "price", "bought"],
                id: "match",
                label: "Similar by",
                options: [
                  { label: "Category", value: "category" },
                  { label: "Price range", value: "price" },
                  { label: "Bought together", value: "bought" },
                  { label: "Style and colour", value: "style" },
                  { label: "Brand", value: "brand" },
                ],
                type: "checkboxes",
              },
              {
                default: 25,
                id: "priceBand",
                label: "Price within",
                max: 100,
                min: 0,
                suffix: "%",
                type: "slider",
              },
              {
                default: true,
                id: "inStock",
                label: "Only items in stock",
                type: "switch",
              },
              {
                default: true,
                id: "notBought",
                label: "Leave out things they already bought",
                type: "switch",
              },
              {
                default: false,
                id: "onlyDiscountable",
                label: "Only items the coupon covers",
                type: "switch",
              },
            ],
            title: "Products",
          },
        ],
      },
      aiTab(
        "Pick products this customer would like alongside their cart. Prefer items with good reviews.",
      ),
    ],
  },
  cart_trigger: {
    description: "Start when a cart is left without checkout.",
    icon: ShoppingCartIcon,
    label: "Starts when",
    sample: {
      Cart: "3 items, $126.00",
      Customer: "Maya Chen",
      Idle: "1 hour 12 min",
    },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "main",
                id: "store",
                label: "Store",
                options: stores,
                type: "select",
              },
              {
                default: { amount: 1, unit: "hours" },
                id: "idle",
                label: "Cart idle for",
                type: "duration",
              },
              {
                default: 25,
                id: "minValue",
                label: "Minimum cart value ($)",
                min: 0,
                type: "number",
              },
              {
                default: "all",
                id: "who",
                label: "Customers",
                options: [
                  { label: "Everyone", value: "all" },
                  { label: "Returning customers", value: "returning" },
                  { label: "New customers", value: "new" },
                ],
                type: "radio",
              },
              {
                default: 14,
                id: "cooldown",
                label: "Skip if they got a coupon in the last (days)",
                min: 0,
                type: "number",
              },
              {
                default: ["web", "app"],
                id: "sources",
                label: "Carts from",
                options: [
                  { label: "Website", value: "web" },
                  { label: "App", value: "app" },
                  { label: "Marketplace", value: "market" },
                ],
                type: "checkboxes",
              },
            ],
            title: "Carts",
          },
        ],
      },
    ],
    tone: "trigger",
  },
  split: {
    description: "Send each run down one of several paths.",
    icon: SplitIcon,
    label: "Split",
    sample: { Path: "40 to 79%", Value: "64" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "likelihood",
                id: "field",
                label: "Split by",
                options: customerFields,
                type: "select",
              },
              {
                default: [
                  { key: "80% and up", value: "80 to 100" },
                  { key: "40 to 79%", value: "40 to 79" },
                  { key: "Below 40%", value: "0 to 39" },
                ],
                id: "paths",
                keyLabel: "Path",
                label: "Paths",
                type: "rows",
                valueLabel: "Values",
              },
            ],
            title: "Paths",
          },
        ],
      },
    ],
  },
  ticket: {
    description: "Open a ticket in the help desk.",
    icon: TicketIcon,
    label: "Create ticket",
    sample: { Ticket: "#5521", Queue: "Returns", Assigned: "Priya" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "support",
                id: "queue",
                label: "Queue",
                options: [
                  { label: "Support", value: "support" },
                  { label: "Returns", value: "returns" },
                  { label: "Billing", value: "billing" },
                ],
                type: "select",
              },
              {
                default: "high",
                id: "priority",
                label: "Priority",
                options: [
                  { label: "Low", value: "low" },
                  { label: "Normal", value: "normal" },
                  { label: "High", value: "high" },
                ],
                type: "radio",
              },
              {
                default: "{email.subject}",
                id: "subject",
                label: "Subject",
                type: "text",
              },
              {
                default: "auto",
                id: "assignee",
                label: "Assign to",
                options: [
                  { label: "Next free agent", value: "auto" },
                  { label: "Account owner", value: "owner" },
                ],
                type: "select",
              },
            ],
            title: "Ticket",
          },
        ],
      },
    ],
  },
  update: {
    description: "Save data to a record.",
    icon: DatabaseIcon,
    label: "Update record",
    sample: { Record: "Customer Maya Chen", Updated: "3 fields" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "customer",
                id: "object",
                label: "Record",
                options: [
                  { label: "Customer", value: "customer" },
                  { label: "Order", value: "order" },
                  { label: "Cart", value: "cart" },
                ],
                type: "select",
              },
              {
                default: [
                  {
                    key: "Purchase likelihood",
                    value: "{analysis.purchase_likelihood}",
                  },
                  { key: "Last offer", value: "{coupon.code}" },
                ],
                id: "fields",
                keyLabel: "Field",
                label: "Fields to set",
                type: "rows",
                valueLabel: "Value",
              },
              {
                default: false,
                id: "create",
                label: "Create it if it does not exist",
                type: "switch",
              },
            ],
            title: "Record",
          },
        ],
      },
    ],
  },
  wait: {
    description: "Hold the run for a while.",
    icon: ClockIcon,
    label: "Wait",
    sample: { "Resumes at": "Thu 28 Nov, 10:00", Reason: "2 days passed" },
    tabs: [
      {
        id: "setup",
        label: "Setup",
        sections: [
          {
            fields: [
              {
                default: "time",
                id: "mode",
                label: "Wait",
                options: [
                  { label: "For a while", value: "time" },
                  { label: "Until something happens", value: "event" },
                ],
                type: "radio",
              },
              {
                default: { amount: 2, unit: "days" },
                id: "duration",
                label: "For",
                type: "duration",
              },
              {
                default: "purchase",
                id: "event",
                label: "Until",
                options: [
                  { label: "They buy", value: "purchase" },
                  { label: "They open the email", value: "open" },
                  { label: "They reply", value: "reply" },
                ],
                type: "select",
              },
              {
                default: { amount: 7, unit: "days" },
                id: "giveUp",
                label: "Give up after",
                type: "duration",
              },
              {
                default: true,
                id: "businessHours",
                label: "Resume during business hours only",
                type: "switch",
              },
            ],
            title: "Timing",
          },
        ],
      },
    ],
  },
  done: {
    description: "Mark the run as finished.",
    icon: CheckCheckIcon,
    label: "Done",
    sample: {},
    tabs: [],
  },
} satisfies Record<string, Kind>;

export type KindId = keyof typeof kinds;

// Every step also has these.
export const generalSection: Section = {
  fields: [
    { id: "name", label: "Step name", type: "text" },
    {
      default: "",
      id: "notes",
      label: "Notes for your team",
      type: "textarea",
    },
    { default: true, id: "enabled", label: "Step is on", type: "switch" },
  ],
  title: "Step",
};

export const advancedTab: Tab = {
  id: "advanced",
  label: "Advanced",
  sections: [
    {
      fields: [
        {
          default: "retry",
          id: "onError",
          label: "If this step fails",
          options: [
            { label: "Try again", value: "retry" },
            { label: "Skip it and carry on", value: "skip" },
            { label: "Stop the run", value: "stop" },
          ],
          type: "radio",
        },
        {
          default: 3,
          id: "retries",
          label: "Tries",
          max: 10,
          min: 1,
          type: "number",
        },
        {
          default: { amount: 5, unit: "minutes" },
          id: "between",
          label: "Wait between tries",
          type: "duration",
        },
        {
          default: { amount: 2, unit: "minutes" },
          id: "timeout",
          label: "Time out after",
          type: "duration",
        },
      ],
      title: "Errors",
    },
    {
      fields: [
        {
          default: true,
          id: "log",
          label: "Keep inputs and outputs in the run history",
          type: "switch",
        },
        {
          default: false,
          id: "mask",
          label: "Hide personal data in the history",
          type: "switch",
        },
        {
          default: 1000,
          id: "rate",
          label: "Most runs per hour",
          min: 1,
          type: "number",
        },
      ],
      title: "History and limits",
    },
  ],
};

export { units };
