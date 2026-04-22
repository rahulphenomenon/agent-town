import type {
  ActivityEvent,
  Agent,
  AgentHireResponse,
  Approval,
  Company,
  CreateAgentHire,
  Issue,
  IssueComment,
  OfficeSnapshot,
} from "@/types/office";
import { request } from "./client";

function withCompanyScope(path: string, companyId: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}companyId=${encodeURIComponent(companyId)}`;
}

export const paperclipApi = {
  async loadOfficeSnapshot(companyId: string, signal?: AbortSignal): Promise<OfficeSnapshot> {
    const [company, agents, issues, approvals, activity] = await Promise.all([
      request<Company>(`/companies/${encodeURIComponent(companyId)}`, { signal }),
      request<Agent[]>(`/companies/${encodeURIComponent(companyId)}/agents`, { signal }),
      request<Issue[]>(`/companies/${encodeURIComponent(companyId)}/issues`, { signal }),
      request<Approval[]>(`/companies/${encodeURIComponent(companyId)}/approvals?status=pending`, { signal }),
      request<ActivityEvent[]>(`/companies/${encodeURIComponent(companyId)}/activity`, { signal }),
    ]);

    return {
      company,
      agents,
      issues,
      approvals,
      activity,
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
    });
  },

  createHire(companyId: string, payload: CreateAgentHire) {
    return request<AgentHireResponse>(
      `/companies/${encodeURIComponent(companyId)}/agent-hires`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  approveHire(companyId: string, approvalId: string, decisionNote?: string | null) {
    return request<Approval>(withCompanyScope(`/approvals/${encodeURIComponent(approvalId)}/approve`, companyId), {
      method: "POST",
      body: JSON.stringify(
        decisionNote === undefined ? {} : { decisionNote },
      ),
    });
  },

  pauseAgent(companyId: string, agentId: string) {
    return request<Agent>(withCompanyScope(`/agents/${encodeURIComponent(agentId)}/pause`, companyId), {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  resumeAgent(companyId: string, agentId: string) {
    return request<Agent>(withCompanyScope(`/agents/${encodeURIComponent(agentId)}/resume`, companyId), {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  terminateAgent(companyId: string, agentId: string) {
    return request<Agent>(withCompanyScope(`/agents/${encodeURIComponent(agentId)}/terminate`, companyId), {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
