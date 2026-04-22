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
  async loadOfficeSnapshot(): Promise<OfficeSnapshot> {
    const companies = await request<Company[]>("/companies");
    const company = companies[0];

    if (!company) {
      throw new Error("No Paperclip companies found. Finish onboarding in the tracker first.");
    }

    const [agents, issues, approvals, activity] = await Promise.all([
      request<Agent[]>(`/companies/${encodeURIComponent(company.id)}/agents`),
      request<Issue[]>(`/companies/${encodeURIComponent(company.id)}/issues`),
      request<Approval[]>(`/companies/${encodeURIComponent(company.id)}/approvals?status=pending`),
      request<ActivityEvent[]>(`/companies/${encodeURIComponent(company.id)}/activity`),
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
