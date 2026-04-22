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

  addIssueComment(issueId: string, body: string, reopen?: boolean, interrupt?: boolean) {
    return request<IssueComment>(`/issues/${encodeURIComponent(issueId)}/comments`, {
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

  approveHire(approvalId: string, decisionNote?: string | null) {
    return request<Approval>(`/approvals/${encodeURIComponent(approvalId)}/approve`, {
      method: "POST",
      body: JSON.stringify(
        decisionNote === undefined ? {} : { decisionNote },
      ),
    });
  },

  pauseAgent(agentId: string) {
    return request<Agent>(`/agents/${encodeURIComponent(agentId)}/pause`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  resumeAgent(agentId: string) {
    return request<Agent>(`/agents/${encodeURIComponent(agentId)}/resume`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  terminateAgent(agentId: string) {
    return request<Agent>(`/agents/${encodeURIComponent(agentId)}/terminate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
