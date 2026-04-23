import type {
  ActivityEvent,
  Agent,
  Approval,
  Company,
  CreateAgentHire,
  Goal,
  Issue,
  IssueComment,
} from "@paperclipai/shared";

export type {
  ActivityEvent,
  Agent,
  Approval,
  Company,
  CreateAgentHire,
  Goal,
  Issue,
  IssueComment,
};

export interface OfficeSnapshot {
  company: Company;
  goals: Goal[];
  agents: Agent[];
  issues: Issue[];
  approvals: Approval[];
  activity: ActivityEvent[];
}

export interface AgentHireResponse {
  agent: Agent;
  approval: Approval | null;
}

export interface OfficeIntent {
  mode:
    | "idle"
    | "heading_to_desk"
    | "working_at_desk"
    | "paused_asleep"
    | "needs_attention"
    | "talking"
    | "terminated";
  targetZone: string;
  startedAt: number;
}

export interface OfficeAgentView {
  agentId: string;
  name: string;
  status: string;
  issue: Issue | null;
  targetZone: string;
  intent: OfficeIntent;
  latestSnippet: string | null;
  talkingWith: string | null;
}

export interface ActionInboxItem {
  id: string;
  kind: "approval" | "mention";
  title: string;
  body: string;
  createdAt?: string;
  issueId?: string | null;
  approvalId?: string | null;
  agentId?: string | null;
}
