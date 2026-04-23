import { useMemo } from "react";
import { paperclipApi } from "@/api/paperclip";
import type {
  Agent,
  AgentHireResponse,
  Approval,
  CreateAgentHire,
  IssueComment,
} from "@/types/office";

const DEFAULT_APPROVAL_NOTE = "Approved in office.";

export interface OfficeActionsApi {
  addIssueComment: (
    companyId: string,
    issueId: string,
    body: string,
    reopen?: boolean,
    interrupt?: boolean,
  ) => Promise<IssueComment>;
  createHire: (companyId: string, payload: CreateAgentHire) => Promise<AgentHireResponse>;
  approveHire: (
    companyId: string,
    approvalId: string,
    decisionNote?: string | null,
  ) => Promise<Approval>;
  pauseAgent: (companyId: string, agentId: string) => Promise<Agent>;
  resumeAgent: (companyId: string, agentId: string) => Promise<Agent>;
  terminateAgent: (companyId: string, agentId: string) => Promise<Agent>;
}

function requireCompanyId(companyId: string | null | undefined) {
  if (!companyId) {
    throw new Error("Company id is required for office actions.");
  }

  return companyId;
}

export function createOfficeActions({
  companyId,
  api = paperclipApi,
  approvalNote = DEFAULT_APPROVAL_NOTE,
}: {
  companyId: string | null | undefined;
  api?: OfficeActionsApi;
  approvalNote?: string;
}) {
  return {
    chat(issueId: string, body: string, options?: { reopen?: boolean; interrupt?: boolean }) {
      return api.addIssueComment(
        requireCompanyId(companyId),
        issueId,
        body,
        options?.reopen,
        options?.interrupt,
      );
    },

    approve(approvalId: string, decisionNote = approvalNote) {
      return api.approveHire(requireCompanyId(companyId), approvalId, decisionNote);
    },

    hire(payload: CreateAgentHire) {
      return api.createHire(requireCompanyId(companyId), payload);
    },

    async hireAndApprove(payload: CreateAgentHire, decisionNote = approvalNote) {
      const resolvedCompanyId = requireCompanyId(companyId);
      const result = await api.createHire(resolvedCompanyId, payload);

      if (result.approval?.id) {
        await api.approveHire(resolvedCompanyId, result.approval.id, decisionNote);
      }

      return result;
    },

    pause(agentId: string) {
      return api.pauseAgent(requireCompanyId(companyId), agentId);
    },

    resume(agentId: string) {
      return api.resumeAgent(requireCompanyId(companyId), agentId);
    },

    fire(agentId: string) {
      return api.terminateAgent(requireCompanyId(companyId), agentId);
    },
  };
}

export function useOfficeActions(
  companyId: string | null | undefined,
  api: OfficeActionsApi = paperclipApi,
  approvalNote = DEFAULT_APPROVAL_NOTE,
) {
  return useMemo(
    () => createOfficeActions({ companyId, api, approvalNote }),
    [api, approvalNote, companyId],
  );
}
