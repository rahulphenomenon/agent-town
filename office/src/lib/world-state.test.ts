import { describe, expect, it } from "vitest";
import type {
  ActivityEvent,
  Agent,
  Approval,
  Issue,
  OfficeAgentView,
} from "@/types/office";
import { deriveOfficeAgents } from "./world-state";

const NOW = Date.parse("2026-04-22T12:00:00.000Z");

function createAgent(overrides: Partial<Agent> & Pick<Agent, "id" | "name">): Agent {
  return {
    id: overrides.id,
    companyId: "company-1",
    name: overrides.name,
    urlKey: overrides.urlKey ?? overrides.name.toLowerCase(),
    role: overrides.role ?? "general",
    title: overrides.title ?? null,
    icon: overrides.icon ?? null,
    status: overrides.status ?? "idle",
    reportsTo: overrides.reportsTo ?? null,
    capabilities: overrides.capabilities ?? null,
    adapterType: overrides.adapterType ?? "codex_local",
    adapterConfig: overrides.adapterConfig ?? {},
    runtimeConfig: overrides.runtimeConfig ?? {},
    budgetMonthlyCents: overrides.budgetMonthlyCents ?? 0,
    spentMonthlyCents: overrides.spentMonthlyCents ?? 0,
    pauseReason: overrides.pauseReason ?? null,
    pausedAt: overrides.pausedAt ?? null,
    permissions: overrides.permissions ?? { canCreateAgents: false },
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
    metadata: overrides.metadata ?? null,
    createdAt: overrides.createdAt ?? new Date(NOW),
    updatedAt: overrides.updatedAt ?? new Date(NOW),
  };
}

function createIssue(
  overrides: Partial<Issue> & Pick<Issue, "id" | "title">,
): Issue {
  return {
    id: overrides.id,
    companyId: "company-1",
    projectId: overrides.projectId ?? null,
    projectWorkspaceId: overrides.projectWorkspaceId ?? null,
    goalId: overrides.goalId ?? null,
    parentId: overrides.parentId ?? null,
    title: overrides.title,
    description: overrides.description ?? null,
    status: overrides.status ?? "todo",
    priority: overrides.priority ?? "medium",
    assigneeAgentId: overrides.assigneeAgentId ?? null,
    assigneeUserId: overrides.assigneeUserId ?? null,
    checkoutRunId: overrides.checkoutRunId ?? null,
    executionRunId: overrides.executionRunId ?? null,
    executionAgentNameKey: overrides.executionAgentNameKey ?? null,
    executionLockedAt: overrides.executionLockedAt ?? null,
    createdByAgentId: overrides.createdByAgentId ?? null,
    createdByUserId: overrides.createdByUserId ?? null,
    issueNumber: overrides.issueNumber ?? 1,
    identifier: overrides.identifier ?? "PAP-1",
    requestDepth: overrides.requestDepth ?? 0,
    billingCode: overrides.billingCode ?? null,
    assigneeAdapterOverrides: overrides.assigneeAdapterOverrides ?? null,
    executionPolicy: overrides.executionPolicy,
    executionState: overrides.executionState,
    executionWorkspaceId: overrides.executionWorkspaceId ?? null,
    executionWorkspacePreference: overrides.executionWorkspacePreference ?? null,
    executionWorkspaceSettings: overrides.executionWorkspaceSettings ?? null,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    hiddenAt: overrides.hiddenAt ?? null,
    createdAt: overrides.createdAt ?? new Date(NOW),
    updatedAt: overrides.updatedAt ?? new Date(NOW),
  };
}

function createApproval(
  overrides: Partial<Approval> & Pick<Approval, "id">,
): Approval {
  return {
    id: overrides.id,
    companyId: "company-1",
    type: overrides.type ?? "request_board_approval",
    requestedByAgentId: overrides.requestedByAgentId ?? null,
    requestedByUserId: overrides.requestedByUserId ?? null,
    status: overrides.status ?? "pending",
    payload: overrides.payload ?? {},
    decisionNote: overrides.decisionNote ?? null,
    decidedByUserId: overrides.decidedByUserId ?? null,
    decidedAt: overrides.decidedAt ?? null,
    createdAt: overrides.createdAt ?? new Date(NOW),
    updatedAt: overrides.updatedAt ?? new Date(NOW),
  };
}

function createActivity(
  overrides: Partial<ActivityEvent> & Pick<ActivityEvent, "id" | "action">,
): ActivityEvent {
  return {
    id: overrides.id,
    companyId: "company-1",
    actorType: overrides.actorType ?? "agent",
    actorId: overrides.actorId ?? "agent-1",
    action: overrides.action,
    entityType: overrides.entityType ?? "issue",
    entityId: overrides.entityId ?? "issue-1",
    agentId: overrides.agentId ?? overrides.actorId ?? "agent-1",
    runId: overrides.runId ?? null,
    details: overrides.details ?? null,
    createdAt: overrides.createdAt ?? new Date(NOW),
  };
}

function asPreviousMap(agents: OfficeAgentView[]) {
  return new Map(agents.map((agent) => [agent.agentId, agent]));
}

describe("deriveOfficeAgents", () => {
  it("sends idle agents to one of the lounge zones", () => {
    const result = deriveOfficeAgents({
      agents: [createAgent({ id: "agent-1", name: "CEO", status: "idle" })],
      issues: [],
      approvals: [],
      activity: [],
      previous: new Map(),
      now: NOW,
    });

    expect(["watercooler", "north-hall", "hallway-center", "couch"]).toContain(result[0]?.targetZone);
    expect(result[0]?.intent.mode).toBe("idle");
  });

  it("spreads multiple idle agents across lounge zones", () => {
    const result = deriveOfficeAgents({
      agents: [
        createAgent({ id: "agent-1", name: "CEO", status: "idle" }),
        createAgent({ id: "agent-2", name: "CTO", status: "idle" }),
        createAgent({ id: "agent-3", name: "CMO", status: "idle" }),
      ],
      issues: [],
      approvals: [],
      activity: [],
      previous: new Map(),
      now: NOW,
    });

    expect(new Set(result.map((agent) => agent.targetZone)).size).toBeGreaterThan(1);
  });

  it("sends paused agents to the couch", () => {
    const result = deriveOfficeAgents({
      agents: [createAgent({ id: "agent-1", name: "CEO", status: "paused" })],
      issues: [],
      approvals: [],
      activity: [],
      previous: new Map(),
      now: NOW,
    });

    expect(result[0]?.targetZone).toBe("couch");
    expect(result[0]?.intent.mode).toBe("paused_asleep");
  });

  it("keeps desk assignment stable even when agent order changes", () => {
    const first = deriveOfficeAgents({
      agents: [
        createAgent({ id: "agent-1", name: "Alpha", status: "running" }),
        createAgent({ id: "agent-2", name: "Beta", status: "running" }),
      ],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Alpha task",
          status: "in_progress",
          assigneeAgentId: "agent-1",
          checkoutRunId: "run-1",
          executionRunId: "run-1",
          executionLockedAt: new Date(NOW),
        }),
        createIssue({
          id: "issue-2",
          title: "Beta task",
          status: "in_progress",
          assigneeAgentId: "agent-2",
          checkoutRunId: "run-2",
          executionRunId: "run-2",
          executionLockedAt: new Date(NOW),
        }),
      ],
      approvals: [],
      activity: [],
      previous: new Map(),
      now: NOW,
    });

    const second = deriveOfficeAgents({
      agents: [
        createAgent({ id: "agent-2", name: "Beta", status: "running" }),
        createAgent({ id: "agent-1", name: "Alpha", status: "running" }),
      ],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Alpha task",
          status: "in_progress",
          assigneeAgentId: "agent-1",
          checkoutRunId: "run-1",
          executionRunId: "run-1",
          executionLockedAt: new Date(NOW),
        }),
        createIssue({
          id: "issue-2",
          title: "Beta task",
          status: "in_progress",
          assigneeAgentId: "agent-2",
          checkoutRunId: "run-2",
          executionRunId: "run-2",
          executionLockedAt: new Date(NOW),
        }),
      ],
      approvals: [],
      activity: [],
      previous: asPreviousMap(first),
      now: NOW + 2_000,
    });

    expect(first.find((agent) => agent.agentId === "agent-1")?.targetZone).toBe(
      second.find((agent) => agent.agentId === "agent-1")?.targetZone,
    );
    expect(first.find((agent) => agent.agentId === "agent-2")?.targetZone).toBe(
      second.find((agent) => agent.agentId === "agent-2")?.targetZone,
    );
  });

  it("marks blocked issues as needing attention and surfaces recent blocker text", () => {
    const result = deriveOfficeAgents({
      agents: [createAgent({ id: "agent-1", name: "CEO", status: "running" })],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Ship the demo",
          status: "blocked",
          assigneeAgentId: "agent-1",
        }),
      ],
      approvals: [],
      activity: [
        createActivity({
          id: "event-1",
          action: "issue.blockers_updated",
          entityId: "issue-1",
          details: {
            addedBlockedByIssues: [
              {
                id: "issue-2",
                identifier: "PAP-2",
                title: "Need product input before continuing.",
              },
            ],
          },
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result[0]?.intent.mode).toBe("needs_attention");
    expect(result[0]?.targetZone).toMatch(/^desk-/);
    expect(result[0]?.latestSnippet).toContain("Need product input");
  });

  it("treats review and pending approval signals as needing attention", () => {
    const result = deriveOfficeAgents({
      agents: [createAgent({ id: "agent-1", name: "CEO", status: "running" })],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Review launch copy",
          status: "in_review",
          assigneeAgentId: "agent-1",
          executionState: {
            status: "pending",
            currentStageId: "stage-1",
            currentStageIndex: 0,
            currentStageType: "approval",
            currentParticipant: { type: "user", userId: "board" },
            returnAssignee: { type: "agent", agentId: "agent-1" },
            completedStageIds: [],
            lastDecisionId: null,
            lastDecisionOutcome: null,
          },
        }),
      ],
      approvals: [
        createApproval({
          id: "approval-1",
          requestedByAgentId: "agent-1",
          status: "pending",
        }),
      ],
      activity: [
        createActivity({
          id: "event-1",
          action: "approval.created",
          entityType: "approval",
          entityId: "approval-1",
          actorId: "board",
          agentId: null,
          details: { issueIds: ["issue-1"] },
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result[0]?.intent.mode).toBe("needs_attention");
  });

  it("keeps issue-less agent approvals in needs_attention after the activity window", () => {
    const result = deriveOfficeAgents({
      agents: [createAgent({ id: "agent-1", name: "CEO", status: "idle" })],
      issues: [],
      approvals: [
        createApproval({
          id: "approval-1",
          requestedByAgentId: "agent-1",
          status: "revision_requested",
        }),
      ],
      activity: [
        createActivity({
          id: "event-1",
          action: "approval.revision_requested",
          entityType: "approval",
          entityId: "approval-1",
          actorId: "board",
          agentId: null,
          createdAt: new Date(NOW - 10 * 60 * 1_000),
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result[0]?.intent.mode).toBe("needs_attention");
    expect(result[0]?.latestSnippet).toBe("Board requested approval changes.");
  });

  it("infers a symbolic conversation from recent issue comments", () => {
    const result = deriveOfficeAgents({
      agents: [
        createAgent({ id: "agent-1", name: "CEO", status: "running" }),
        createAgent({ id: "agent-2", name: "CTO", status: "running" }),
      ],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Ship demo",
          status: "in_progress",
          assigneeAgentId: "agent-1",
          checkoutRunId: "run-1",
          executionRunId: "run-1",
          executionLockedAt: new Date(NOW),
        }),
      ],
      approvals: [],
      activity: [
        createActivity({
          id: "event-1",
          action: "issue.comment_added",
          entityId: "issue-1",
          actorId: "agent-2",
          agentId: "agent-2",
          details: { bodySnippet: "@CEO I pushed the backend fix." },
          createdAt: new Date(NOW - 30_000),
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result.find((agent) => agent.agentId === "agent-1")?.talkingWith).toBe("agent-2");
    expect(result.find((agent) => agent.agentId === "agent-1")?.intent.mode).toBe("talking");
    expect(result.find((agent) => agent.agentId === "agent-2")?.talkingWith).toBe("agent-1");
  });

  it("ignores conversation activity created by non-agent actors", () => {
    const result = deriveOfficeAgents({
      agents: [
        createAgent({ id: "agent-1", name: "CEO", status: "running" }),
        createAgent({ id: "agent-2", name: "CTO", status: "running" }),
      ],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Ship demo",
          status: "in_progress",
          assigneeAgentId: "agent-1",
          checkoutRunId: "run-1",
          executionRunId: "run-1",
          executionLockedAt: new Date(NOW),
        }),
      ],
      approvals: [],
      activity: [
        createActivity({
          id: "event-1",
          actorType: "user",
          actorId: "board",
          action: "issue.comment_added",
          entityId: "issue-1",
          agentId: null,
          details: { bodySnippet: "Please revise the launch plan." },
          createdAt: new Date(NOW - 30_000),
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result.find((agent) => agent.agentId === "agent-1")?.talkingWith).toBeNull();
    expect(result.find((agent) => agent.agentId === "agent-1")?.intent.mode).not.toBe("talking");
  });

  it("infers talking from recent interaction signals", () => {
    const result = deriveOfficeAgents({
      agents: [
        createAgent({ id: "agent-1", name: "CEO", status: "idle" }),
        createAgent({ id: "agent-2", name: "Designer", status: "idle" }),
      ],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Prepare launch assets",
          status: "todo",
          assigneeAgentId: "agent-1",
        }),
      ],
      approvals: [],
      activity: [
        createActivity({
          id: "event-1",
          action: "issue.thread_interaction_answered",
          entityId: "issue-1",
          actorId: "agent-2",
          agentId: "agent-2",
          details: {
            interactionId: "interaction-1",
            interactionKind: "ask_user_questions",
            interactionStatus: "answered",
          },
          createdAt: new Date(NOW - 20_000),
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result.find((agent) => agent.agentId === "agent-1")?.talkingWith).toBe("agent-2");
    expect(result.find((agent) => agent.agentId === "agent-2")?.intent.mode).toBe("talking");
  });

  it("keeps issue snippets focused on the agent's mapped issue", () => {
    const result = deriveOfficeAgents({
      agents: [createAgent({ id: "agent-1", name: "CEO", status: "running" })],
      issues: [
        createIssue({
          id: "issue-1",
          title: "Ship the demo",
          status: "blocked",
          assigneeAgentId: "agent-1",
        }),
      ],
      approvals: [],
      activity: [
        createActivity({
          id: "event-1",
          action: "issue.comment_added",
          entityId: "issue-2",
          actorId: "agent-1",
          agentId: "agent-1",
          details: { bodySnippet: "Unrelated update from another issue." },
          createdAt: new Date(NOW - 10_000),
        }),
        createActivity({
          id: "event-2",
          action: "issue.blockers_updated",
          entityId: "issue-1",
          details: {
            addedBlockedByIssues: [
              {
                id: "issue-3",
                identifier: "PAP-3",
                title: "Waiting on final product copy.",
              },
            ],
          },
          createdAt: new Date(NOW - 20_000),
        }),
      ],
      previous: new Map(),
      now: NOW,
    });

    expect(result[0]?.latestSnippet).toContain("Waiting on final product copy");
  });
});
