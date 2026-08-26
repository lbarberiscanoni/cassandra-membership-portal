export const PARTICIPATION_OPTIONS = [
  {
    label: "Research",
    tip: "Co-author papers, run experiments, peer-review drafts.",
  },
  {
    label: "Open-source dev",
    tip: "Contribute code, docs, or QA to Cassandra's public-goods repos.",
  },
  {
    label: "Volunteer committees",
    tip: "Help with outreach, compliance, grants, or events.",
  },
  {
    label: "Regular member",
    tip: "Stay informed and vote—no ongoing volunteer duties.",
  },
];

export const PARTICIPATION_LABELS = PARTICIPATION_OPTIONS.map(
  ({ label }) => label
);

export const RESEARCH_AGENDA_POLL_URL =
  "https://rankedchoices.com/cassresearch2026";

export const CREDIT_UNION_SERVICES = [
  "Savings account",
  "Checking account",
  "Vehicle loans",
  "Mortgage loans",
  "Credit cards",
  "Business accounts",
  "Other",
];

export const MEETING_PREFERENCES = [
  "Live Zoom",
  "Watch recording",
];
