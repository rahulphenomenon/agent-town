import type {
  ActivityEvent,
  Agent,
  Approval,
  Company,
  CreateAgentHire,
  Issue,
  IssueComment,
} from "@paperclipai/shared";

export type { ActivityEvent, Agent, Approval, Company, CreateAgentHire, Issue, IssueComment };

export interface OfficeSnapshot {
  company: Company;
  agents: Agent[];
  issues: Issue[];
  approvals: Approval[];
  activity: ActivityEvent[];
}

export interface AgentHireResponse {
  agent: Agent;
  approval: Approval | null;
}
