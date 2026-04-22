import type { ActionInboxItem, ActivityEvent, Approval, Issue } from "@/types/office";

const ACTIONABLE_APPROVAL_STATUSES = new Set(["pending", "revision_requested"]);
const MENTION_ACTIVITY_ACTIONS = new Set([
  "issue.comment_added",
  "issue.thread_interaction_created",
  "issue.thread_interaction_answered",
]);
const CEO_MENTION_RE = /(^|[\s[(])@CEO\b/i;

function toTimestamp(value: Date | string | number | null | undefined) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  return 0;
}

function toIsoString(value: Date | string | number | null | undefined) {
  const timestamp = toTimestamp(value);
  return timestamp > 0 ? new Date(timestamp).toISOString() : undefined;
}

function humanizeApprovalType(type: string) {
  return type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getIssueLabel(issue: Issue | undefined, fallbackId: string) {
  return issue?.identifier ?? issue?.title ?? fallbackId;
}

function extractActivityBody(event: ActivityEvent) {
  const body = event.details?.body;
  if (typeof body === "string" && body.trim().length > 0) {
    return body.trim();
  }

  const bodySnippet = event.details?.bodySnippet;
  if (typeof bodySnippet === "string" && bodySnippet.trim().length > 0) {
    return bodySnippet.trim();
  }

  return null;
}

function hasMention(body: string) {
  return CEO_MENTION_RE.test(body);
}

export function buildActionInboxItems(input: {
  approvals: Approval[];
  activity: ActivityEvent[];
  issues: Issue[];
}): ActionInboxItem[] {
  const issueById = new Map(input.issues.map((issue) => [issue.id, issue]));
  const items: Array<ActionInboxItem & { sortStamp: number }> = [];

  for (const approval of input.approvals) {
    if (!ACTIONABLE_APPROVAL_STATUSES.has(approval.status)) {
      continue;
    }

    items.push({
      id: approval.id,
      kind: "approval",
      title: `${humanizeApprovalType(approval.type)} approval`,
      body: `Pending ${humanizeApprovalType(approval.type).toLowerCase()} approval.`,
      createdAt: toIsoString(approval.createdAt),
      approvalId: approval.id,
      agentId: approval.requestedByAgentId,
      sortStamp: toTimestamp(approval.createdAt),
    });
  }

  for (const event of input.activity) {
    if (!MENTION_ACTIVITY_ACTIONS.has(event.action) || event.entityType !== "issue") {
      continue;
    }

    const body = extractActivityBody(event);
    if (!body || !hasMention(body)) {
      continue;
    }

    const issue = issueById.get(event.entityId);

    items.push({
      id: event.id,
      kind: "mention",
      title: `Mentioned in ${getIssueLabel(issue, event.entityId)}`,
      body,
      createdAt: toIsoString(event.createdAt),
      issueId: event.entityId,
      agentId: event.agentId,
      sortStamp: toTimestamp(event.createdAt),
    });
  }

  return items
    .sort((left, right) => left.sortStamp - right.sortStamp || left.id.localeCompare(right.id))
    .map(({ sortStamp: _sortStamp, ...item }) => item);
}
