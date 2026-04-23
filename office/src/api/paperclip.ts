import type {
  ActivityEvent,
  Agent,
  AgentHireResponse,
  Approval,
  Company,
  CreateAgentHire,
  Goal,
  Issue,
  IssueComment,
  OfficeSnapshot,
} from "@/types/office";
import { request } from "./client";

function withCompanyScope(path: string, companyId: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}companyId=${encodeURIComponent(companyId)}`;
}

function parseRequiredDate(value: unknown, field: string) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  throw new Error(`Invalid office API date for ${field}.`);
}

function parseOptionalDate(value: unknown, field: string) {
  return value == null ? null : parseRequiredDate(value, field);
}

function normalizeCompany(company: Company): Company {
  return {
    ...company,
    pausedAt: parseOptionalDate(company.pausedAt, "company.pausedAt"),
    feedbackDataSharingConsentAt: parseOptionalDate(
      company.feedbackDataSharingConsentAt,
      "company.feedbackDataSharingConsentAt",
    ),
    createdAt: parseRequiredDate(company.createdAt, "company.createdAt"),
    updatedAt: parseRequiredDate(company.updatedAt, "company.updatedAt"),
  };
}

function normalizeAgent(agent: Agent): Agent {
  return {
    ...agent,
    pausedAt: parseOptionalDate(agent.pausedAt, "agent.pausedAt"),
    lastHeartbeatAt: parseOptionalDate(agent.lastHeartbeatAt, "agent.lastHeartbeatAt"),
    createdAt: parseRequiredDate(agent.createdAt, "agent.createdAt"),
    updatedAt: parseRequiredDate(agent.updatedAt, "agent.updatedAt"),
  };
}

function normalizeGoal(goal: Goal): Goal {
  return {
    ...goal,
    createdAt: parseRequiredDate(goal.createdAt, "goal.createdAt"),
    updatedAt: parseRequiredDate(goal.updatedAt, "goal.updatedAt"),
  };
}

function normalizeIssue(issue: Issue): Issue {
  return {
    ...issue,
    executionLockedAt: parseOptionalDate(issue.executionLockedAt, "issue.executionLockedAt"),
    startedAt: parseOptionalDate(issue.startedAt, "issue.startedAt"),
    completedAt: parseOptionalDate(issue.completedAt, "issue.completedAt"),
    cancelledAt: parseOptionalDate(issue.cancelledAt, "issue.cancelledAt"),
    hiddenAt: parseOptionalDate(issue.hiddenAt, "issue.hiddenAt"),
    myLastTouchAt: parseOptionalDate(issue.myLastTouchAt, "issue.myLastTouchAt"),
    lastExternalCommentAt: parseOptionalDate(issue.lastExternalCommentAt, "issue.lastExternalCommentAt"),
    lastActivityAt: parseOptionalDate(issue.lastActivityAt, "issue.lastActivityAt"),
    createdAt: parseRequiredDate(issue.createdAt, "issue.createdAt"),
    updatedAt: parseRequiredDate(issue.updatedAt, "issue.updatedAt"),
  };
}

function normalizeApproval(approval: Approval): Approval {
  return {
    ...approval,
    decidedAt: parseOptionalDate(approval.decidedAt, "approval.decidedAt"),
    createdAt: parseRequiredDate(approval.createdAt, "approval.createdAt"),
    updatedAt: parseRequiredDate(approval.updatedAt, "approval.updatedAt"),
  };
}

function normalizeActivityEvent(event: ActivityEvent): ActivityEvent {
  return {
    ...event,
    createdAt: parseRequiredDate(event.createdAt, "activity.createdAt"),
  };
}

function normalizeIssueComment(comment: IssueComment): IssueComment {
  return {
    ...comment,
    createdAt: parseRequiredDate(comment.createdAt, "issueComment.createdAt"),
    updatedAt: parseRequiredDate(comment.updatedAt, "issueComment.updatedAt"),
  };
}

function normalizeHireResponse(response: AgentHireResponse): AgentHireResponse {
  return {
    agent: normalizeAgent(response.agent),
    approval: response.approval ? normalizeApproval(response.approval) : null,
  };
}

export const paperclipApi = {
  async loadOfficeSnapshot(companyId: string, signal?: AbortSignal): Promise<OfficeSnapshot> {
    const [company, goals, agents, issues, pendingApprovals, revisionRequestedApprovals, activity] = await Promise.all([
      request<Company>(`/companies/${encodeURIComponent(companyId)}`, { signal }),
      request<Goal[]>(`/companies/${encodeURIComponent(companyId)}/goals`, { signal }),
      request<Agent[]>(`/companies/${encodeURIComponent(companyId)}/agents`, { signal }),
      request<Issue[]>(`/companies/${encodeURIComponent(companyId)}/issues`, { signal }),
      request<Approval[]>(`/companies/${encodeURIComponent(companyId)}/approvals?status=pending`, { signal }),
      request<Approval[]>(
        `/companies/${encodeURIComponent(companyId)}/approvals?status=revision_requested`,
        { signal },
      ),
      request<ActivityEvent[]>(`/companies/${encodeURIComponent(companyId)}/activity`, { signal }),
    ]);
    const approvalsById = new Map<string, Approval>();

    for (const approval of [...pendingApprovals, ...revisionRequestedApprovals].map(normalizeApproval)) {
      const existing = approvalsById.get(approval.id);
      if (!existing || approval.updatedAt.getTime() >= existing.updatedAt.getTime()) {
        approvalsById.set(approval.id, approval);
      }
    }

    return {
      company: normalizeCompany(company),
      goals: goals.map(normalizeGoal),
      agents: agents.map(normalizeAgent),
      issues: issues.map(normalizeIssue),
      approvals: Array.from(approvalsById.values()),
      activity: activity.map(normalizeActivityEvent),
    };
  },

  addIssueComment(companyId: string, issueId: string, body: string, reopen?: boolean, interrupt?: boolean) {
    return request<IssueComment>(withCompanyScope(`/issues/${encodeURIComponent(issueId)}/comments`, companyId), {
      method: "POST",
      body: JSON.stringify({
        body,
        ...(reopen === undefined ? {} : { reopen }),
        ...(interrupt === undefined ? {} : { interrupt }),
      }),
    }).then(normalizeIssueComment);
  },

  createHire(companyId: string, payload: CreateAgentHire) {
    return request<AgentHireResponse>(
      `/companies/${encodeURIComponent(companyId)}/agent-hires`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ).then(normalizeHireResponse);
  },

  approveHire(companyId: string, approvalId: string, decisionNote?: string | null) {
    return request<Approval>(withCompanyScope(`/approvals/${encodeURIComponent(approvalId)}/approve`, companyId), {
      method: "POST",
      body: JSON.stringify(
        decisionNote === undefined ? {} : { decisionNote },
      ),
    }).then(normalizeApproval);
  },

  pauseAgent(companyId: string, agentId: string) {
    return request<Agent>(withCompanyScope(`/agents/${encodeURIComponent(agentId)}/pause`, companyId), {
      method: "POST",
      body: JSON.stringify({}),
    }).then(normalizeAgent);
  },

  resumeAgent(companyId: string, agentId: string) {
    return request<Agent>(withCompanyScope(`/agents/${encodeURIComponent(agentId)}/resume`, companyId), {
      method: "POST",
      body: JSON.stringify({}),
    }).then(normalizeAgent);
  },

  terminateAgent(companyId: string, agentId: string) {
    return request<Agent>(withCompanyScope(`/agents/${encodeURIComponent(agentId)}/terminate`, companyId), {
      method: "POST",
      body: JSON.stringify({}),
    }).then(normalizeAgent);
  },
};
