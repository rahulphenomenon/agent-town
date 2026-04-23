import type {
  ActivityEvent,
  Agent,
  Approval,
  Issue,
  OfficeAgentView,
  OfficeIntent,
} from "@/types/office";
import { resolveVisualIntent } from "./agent-intent";

const DESK_COUNT = 8;
const RECENT_ACTIVITY_MS = 2 * 60 * 1_000;
const IDLE_ZONES = ["watercooler", "north-hall", "hallway-center", "couch"] as const;
type IdleZone = (typeof IDLE_ZONES)[number];

interface DeriveInput {
  agents: Agent[];
  issues: Issue[];
  approvals: Approval[];
  activity: ActivityEvent[];
  previous: Map<string, OfficeAgentView>;
  now: number;
}

function getActivityTimestamp(event: ActivityEvent) {
  return event.createdAt.getTime();
}

function isRecent(event: ActivityEvent, now: number) {
  return now - getActivityTimestamp(event) <= RECENT_ACTIVITY_MS;
}

function hashDesk(agentId: string) {
  let total = 0;
  for (const char of agentId) total += char.charCodeAt(0);
  return total % DESK_COUNT;
}

function isDeskZone(zone: string | null | undefined): zone is string {
  return typeof zone === "string" && zone.startsWith("desk-");
}

function isIdleZone(zone: string | null | undefined): zone is IdleZone {
  return typeof zone === "string" && IDLE_ZONES.includes(zone as IdleZone);
}

function getStableDeskZone(agentId: string, previous: Map<string, OfficeAgentView>): string {
  const previousView = previous.get(agentId);
  const previousZone =
    previousView?.intent.targetZone && isDeskZone(previousView.intent.targetZone)
      ? previousView.intent.targetZone
      : previousView?.targetZone;

  if (isDeskZone(previousZone)) {
    return previousZone;
  }

  return `desk-${hashDesk(agentId) + 1}`;
}

function assignIdleZones(
  agents: Agent[],
  previous: Map<string, OfficeAgentView>,
) {
  const assignments = new Map<string, IdleZone>();
  const availableZones = [...IDLE_ZONES];
  const sortedAgents = [...agents].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );

  for (const agent of sortedAgents) {
    const previousZone = previous.get(agent.id)?.intent.targetZone;
    if (!isIdleZone(previousZone)) {
      continue;
    }

    const zoneIndex = availableZones.indexOf(previousZone);
    if (zoneIndex === -1) {
      continue;
    }

    assignments.set(agent.id, previousZone);
    availableZones.splice(zoneIndex, 1);
  }

  let overflowIndex = 0;

  for (const agent of sortedAgents) {
    if (assignments.has(agent.id)) {
      continue;
    }

    const zone = availableZones.shift() ?? IDLE_ZONES[overflowIndex % IDLE_ZONES.length];
    assignments.set(agent.id, zone);
    overflowIndex += 1;
  }

  return assignments;
}

function getIssuePriority(issue: Issue) {
  if (issue.status === "blocked") return 0;
  if (issue.status === "in_review") return 1;
  if (issue.executionState?.status === "changes_requested") return 2;
  if (issue.executionState?.status === "pending") return 3;
  if (issue.status === "in_progress") return 4;
  if (issue.executionRunId || issue.checkoutRunId || issue.executionLockedAt) return 5;
  if (issue.status === "todo") return 6;
  return 7;
}

function selectAgentIssues(issues: Issue[]) {
  const byAgent = new Map<string, Issue>();

  const sortedIssues = [...issues].sort((left, right) => {
    const priorityDiff = getIssuePriority(left) - getIssuePriority(right);
    if (priorityDiff !== 0) return priorityDiff;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });

  for (const issue of sortedIssues) {
    if (!issue.assigneeAgentId || byAgent.has(issue.assigneeAgentId)) continue;
    byAgent.set(issue.assigneeAgentId, issue);
  }

  return byAgent;
}

function getEventDetailString(event: ActivityEvent, key: string) {
  const value = event.details?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getIssueSummaryList(
  event: ActivityEvent,
  key: string,
): Array<{ id: string | null; identifier: string | null; title: string | null }> {
  const value = event.details?.[key];
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const candidate = item as Record<string, unknown>;
    return [{
      id: typeof candidate.id === "string" ? candidate.id : null,
      identifier: typeof candidate.identifier === "string" ? candidate.identifier : null,
      title: typeof candidate.title === "string" ? candidate.title : null,
    }];
  });
}

function getBlockerSnippet(event: ActivityEvent) {
  if (event.action !== "issue.blockers_updated") return null;

  const blocker =
    getIssueSummaryList(event, "addedBlockedByIssues")[0] ??
    getIssueSummaryList(event, "blockedByIssues")[0] ??
    getIssueSummaryList(event, "removedBlockedByIssues")[0];

  if (!blocker) return null;

  const blockerLabel = blocker.identifier ?? blocker.id ?? "unknown blocker";
  return blocker.title ? `Blocked by ${blockerLabel}: ${blocker.title}` : `Blocked by ${blockerLabel}`;
}

function getActivitySnippet(event: ActivityEvent) {
  return (
    getEventDetailString(event, "bodySnippet") ??
    getEventDetailString(event, "body") ??
    getBlockerSnippet(event) ??
    getEventDetailString(event, "issueTitle")
  );
}

function hasAttentionApproval(agent: Agent, issue: Issue | null, approvals: Approval[]) {
  return approvals.some((approval) => {
    if (approval.status !== "pending" && approval.status !== "revision_requested") {
      return false;
    }

    return approval.requestedByAgentId === agent.id;
  });
}

function hasAttentionIssue(issue: Issue | null) {
  if (!issue) return false;

  return (
    issue.status === "blocked" ||
    issue.status === "in_review" ||
    issue.executionState?.status === "pending" ||
    issue.executionState?.status === "changes_requested"
  );
}

function hasAttentionActivity(
  agent: Agent,
  issue: Issue | null,
  approvals: Approval[],
  activity: ActivityEvent[],
  now: number,
) {
  return activity.some((event) => {
    if (!isRecent(event, now)) return false;

    if (event.action === "issue.blockers_updated") {
      return event.entityType === "issue" && event.entityId === issue?.id;
    }

    if (event.action !== "approval.created" && event.action !== "approval.revision_requested") {
      return false;
    }

    if (event.entityType === "approval") {
      return approvals.some((approval) => approval.id === event.entityId && approval.requestedByAgentId === agent.id);
    }

    return issue != null && event.entityType === "issue" && event.entityId === issue.id;
  });
}

function isNeedsAttention(
  agent: Agent,
  issue: Issue | null,
  approvals: Approval[],
  activity: ActivityEvent[],
  now: number,
) {
  if (agent.status === "error") return true;
  if (hasAttentionIssue(issue)) return true;
  if (hasAttentionApproval(agent, issue, approvals)) return true;
  return hasAttentionActivity(agent, issue, approvals, activity, now);
}

function isWorkingAtDesk(agent: Agent, issue: Issue | null) {
  if (agent.status === "running" || agent.status === "active") return true;
  if (!issue) return false;

  return (
    issue.status === "in_progress" ||
    issue.executionRunId != null ||
    issue.checkoutRunId != null ||
    issue.executionLockedAt != null
  );
}

function isHeadingToDesk(issue: Issue | null) {
  return issue?.status === "todo";
}

function getConversationPartner(
  event: ActivityEvent,
  issueById: Map<string, Issue>,
  agentIds: Set<string>,
) {
  const actorId = event.actorId;
  if (!actorId || event.actorType !== "agent" || !agentIds.has(actorId)) return null;

  if (
    event.action !== "issue.comment_added" &&
    event.action !== "issue.thread_interaction_created" &&
    event.action !== "issue.thread_interaction_answered" &&
    event.action !== "issue.thread_interaction_accepted" &&
    event.action !== "issue.thread_interaction_rejected"
  ) {
    return null;
  }

  const issue = issueById.get(event.entityId);
  const assigneeId = issue?.assigneeAgentId ?? null;
  if (!assigneeId || assigneeId === actorId || !agentIds.has(assigneeId)) return null;

  return { left: actorId, right: assigneeId };
}

function inferTalkingPairs(agents: Agent[], issues: Issue[], activity: ActivityEvent[], now: number) {
  const pairs = new Map<string, string>();
  const agentIds = new Set(agents.map((agent) => agent.id));
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const sortedRecentActivity = [...activity]
    .filter((event) => isRecent(event, now))
    .sort((left, right) => getActivityTimestamp(right) - getActivityTimestamp(left));

  for (const event of sortedRecentActivity) {
    const partner = getConversationPartner(event, issueById, agentIds);
    if (!partner) continue;

    if (pairs.has(partner.left) || pairs.has(partner.right)) continue;

    pairs.set(partner.left, partner.right);
    pairs.set(partner.right, partner.left);
  }

  return pairs;
}

function getLatestSnippet(
  agent: Agent,
  issue: Issue | null,
  approvals: Approval[],
  activity: ActivityEvent[],
) {
  const relevantApprovalIds = new Set(
    approvals
      .filter((approval) => approval.requestedByAgentId === agent.id)
      .map((approval) => approval.id),
  );

  const relevantEvents = [...activity].sort(
    (left, right) => getActivityTimestamp(right) - getActivityTimestamp(left),
  );

  for (const event of relevantEvents) {
    const isIssueEvent = issue != null && event.entityType === "issue" && event.entityId === issue.id;
    const isApprovalEvent = event.entityType === "approval" && relevantApprovalIds.has(event.entityId);
    const isActorEvent = issue == null && event.actorId === agent.id;
    if (!isIssueEvent && !isApprovalEvent && !isActorEvent) continue;

    const snippet = getActivitySnippet(event);
    if (snippet) return snippet;
  }

  if (issue) return issue.title;

  const pendingApproval = approvals.find(
    (approval) => approval.requestedByAgentId === agent.id && approval.status === "pending",
  );
  if (pendingApproval) return "Pending board approval.";

  const revisionApproval = approvals.find(
    (approval) => approval.requestedByAgentId === agent.id && approval.status === "revision_requested",
  );
  if (revisionApproval) return "Board requested approval changes.";

  return null;
}

export function deriveOfficeAgents(input: DeriveInput): OfficeAgentView[] {
  const issuesByAgent = selectAgentIssues(input.issues);
  const talkingPairs = inferTalkingPairs(input.agents, input.issues, input.activity, input.now);
  const agentContexts = input.agents.map((agent) => {
    const issue = issuesByAgent.get(agent.id) ?? null;
    const talkingWith = talkingPairs.get(agent.id) ?? null;
    const deskZone = getStableDeskZone(agent.id, input.previous);
    const needsAttention = isNeedsAttention(agent, issue, input.approvals, input.activity, input.now);
    const usesIdleZone =
      agent.status !== "terminated"
      && agent.status !== "paused"
      && !needsAttention
      && !talkingWith
      && !isHeadingToDesk(issue)
      && !isWorkingAtDesk(agent, issue);

    return {
      agent,
      issue,
      talkingWith,
      deskZone,
      needsAttention,
      usesIdleZone,
    };
  });
  const idleZonesByAgent = assignIdleZones(
    agentContexts
      .filter((context) => context.usesIdleZone)
      .map((context) => context.agent),
    input.previous,
  );

  return agentContexts.map(({ agent, issue, talkingWith, deskZone, needsAttention }) => {
    let nextMode: OfficeIntent["mode"] = "idle";
    let nextTargetZone: string = idleZonesByAgent.get(agent.id) ?? IDLE_ZONES[0];

    if (agent.status === "terminated") {
      nextMode = "terminated";
      nextTargetZone = "spawn";
    } else if (agent.status === "paused") {
      nextMode = "paused_asleep";
      nextTargetZone = "couch";
    } else if (needsAttention) {
      nextMode = "needs_attention";
      nextTargetZone = deskZone;
    } else if (talkingWith) {
      nextMode = "talking";
      nextTargetZone = "chat-nook";
    } else if (isHeadingToDesk(issue)) {
      nextMode = "heading_to_desk";
      nextTargetZone = deskZone;
    } else if (isWorkingAtDesk(agent, issue)) {
      nextMode = "working_at_desk";
      nextTargetZone = deskZone;
    }

    const intent = resolveVisualIntent({
      previousIntent: input.previous.get(agent.id)?.intent ?? null,
      nextMode,
      nextTargetZone,
      now: input.now,
      minTravelMs: 900,
    });

    return {
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      issue,
      targetZone: intent.targetZone,
      intent,
      latestSnippet: getLatestSnippet(agent, issue, input.approvals, input.activity),
      talkingWith,
    };
  });
}
