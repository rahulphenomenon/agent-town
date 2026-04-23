import type { ActivityEvent, Approval, Issue } from "@/types/office";
import { describe, expect, it } from "vitest";
import { buildActionInboxItems } from "./action-inbox";

function makeApproval(
  overrides: Partial<Approval> & Pick<Approval, "id" | "status" | "type">,
): Approval {
  return {
    id: overrides.id,
    companyId: "company-1",
    type: overrides.type,
    requestedByAgentId: overrides.requestedByAgentId ?? "agent-1",
    requestedByUserId: overrides.requestedByUserId ?? null,
    status: overrides.status,
    payload: overrides.payload ?? {},
    decisionNote: overrides.decisionNote ?? null,
    decidedByUserId: overrides.decidedByUserId ?? null,
    decidedAt: overrides.decidedAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-04-22T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-04-22T10:00:00.000Z"),
  };
}

function makeIssue(
  overrides: Partial<Issue> & Pick<Issue, "id" | "title" | "status">,
): Issue {
  return {
    id: overrides.id,
    companyId: overrides.companyId ?? "company-1",
    projectId: overrides.projectId ?? null,
    projectWorkspaceId: overrides.projectWorkspaceId ?? null,
    goalId: overrides.goalId ?? null,
    parentId: overrides.parentId ?? null,
    title: overrides.title,
    description: overrides.description ?? null,
    status: overrides.status,
    priority: overrides.priority ?? "medium",
    assigneeAgentId: overrides.assigneeAgentId ?? null,
    assigneeUserId: overrides.assigneeUserId ?? null,
    checkoutRunId: overrides.checkoutRunId ?? null,
    executionRunId: overrides.executionRunId ?? null,
    executionAgentNameKey: overrides.executionAgentNameKey ?? null,
    executionLockedAt: overrides.executionLockedAt ?? null,
    createdByAgentId: overrides.createdByAgentId ?? null,
    createdByUserId: overrides.createdByUserId ?? null,
    issueNumber: overrides.issueNumber ?? 42,
    identifier: "identifier" in overrides ? (overrides.identifier ?? null) : "ACME-42",
    requestDepth: overrides.requestDepth ?? 0,
    billingCode: overrides.billingCode ?? null,
    assigneeAdapterOverrides: overrides.assigneeAdapterOverrides ?? null,
    executionWorkspaceId: overrides.executionWorkspaceId ?? null,
    executionWorkspacePreference: overrides.executionWorkspacePreference ?? null,
    executionWorkspaceSettings: overrides.executionWorkspaceSettings ?? null,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    hiddenAt: overrides.hiddenAt ?? null,
    project: overrides.project ?? null,
    goal: overrides.goal ?? null,
    currentExecutionWorkspace: overrides.currentExecutionWorkspace ?? null,
    workProducts: overrides.workProducts ?? [],
    mentionedProjects: overrides.mentionedProjects ?? [],
    myLastTouchAt: overrides.myLastTouchAt ?? null,
    lastExternalCommentAt: overrides.lastExternalCommentAt ?? null,
    lastActivityAt: overrides.lastActivityAt ?? null,
    isUnreadForMe: overrides.isUnreadForMe ?? false,
    createdAt: overrides.createdAt ?? new Date("2026-04-22T09:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-04-22T09:00:00.000Z"),
  };
}

function makeActivityEvent(
  overrides: Partial<ActivityEvent> & Pick<ActivityEvent, "id" | "action" | "entityType" | "entityId">,
): ActivityEvent {
  return {
    id: overrides.id,
    companyId: overrides.companyId ?? "company-1",
    actorType: overrides.actorType ?? "user",
    actorId: overrides.actorId ?? "board",
    action: overrides.action,
    entityType: overrides.entityType,
    entityId: overrides.entityId,
    agentId: overrides.agentId ?? null,
    runId: overrides.runId ?? null,
    details: overrides.details ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-04-22T10:05:00.000Z"),
  };
}

describe("buildActionInboxItems", () => {
  it("queues actionable approvals and mention comments in chronological order", () => {
    const items = buildActionInboxItems({
      approvals: [
        makeApproval({
          id: "approval-1",
          type: "hire_agent",
          status: "pending",
          createdAt: new Date("2026-04-22T10:00:00.000Z"),
        }),
        makeApproval({
          id: "approval-2",
          type: "hire_agent",
          status: "approved",
          createdAt: new Date("2026-04-22T10:01:00.000Z"),
        }),
      ],
      activity: [
        makeActivityEvent({
          id: "evt-1",
          action: "issue.comment_added",
          entityType: "issue",
          entityId: "issue-1",
          createdAt: new Date("2026-04-22T10:05:00.000Z"),
          details: {
            body: "Please review this [@CEO](agent://agent-1) before launch.",
          },
        }),
      ],
      issues: [
        makeIssue({
          id: "issue-1",
          identifier: "ACME-10",
          title: "Review the spec",
          status: "blocked",
        }),
      ],
    });

    expect(items.map((item) => item.id)).toEqual(["approval-1", "evt-1"]);
    expect(items[0]).toMatchObject({
      kind: "approval",
      approvalId: "approval-1",
    });
    expect(items[1]).toMatchObject({
      kind: "mention",
      issueId: "issue-1",
      title: "Mentioned in ACME-10",
    });
  });

  it("falls back to plain @mentions when activity only contains raw body text", () => {
    const items = buildActionInboxItems({
      approvals: [],
      activity: [
        makeActivityEvent({
          id: "evt-2",
          action: "issue.comment_added",
          entityType: "issue",
          entityId: "issue-2",
          details: {
            bodySnippet: "@CEO unblock this when you can.",
          },
        }),
      ],
      issues: [
        makeIssue({
          id: "issue-2",
          title: "Unblock launch",
          status: "todo",
          identifier: null,
        }),
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "evt-2",
      kind: "mention",
      title: "Mentioned in Unblock launch",
      issueId: "issue-2",
    });
  });
});
