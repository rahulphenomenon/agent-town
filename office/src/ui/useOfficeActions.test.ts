import type {
  Agent,
  AgentHireResponse,
  Approval,
  CreateAgentHire,
  IssueComment,
} from "@/types/office";
import { describe, expect, it, vi } from "vitest";
import { createOfficeActions } from "./useOfficeActions";

function makeAgent(id: string): Agent {
  return {
    id,
    companyId: "company-1",
    name: "Agent",
    urlKey: "agent",
    role: "general",
    title: null,
    icon: null,
    status: "idle",
    reportsTo: null,
    capabilities: null,
    adapterType: "process",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-04-22T09:00:00.000Z"),
    updatedAt: new Date("2026-04-22T09:00:00.000Z"),
  };
}

function makeApproval(id: string): Approval {
  return {
    id,
    companyId: "company-1",
    type: "hire_agent",
    requestedByAgentId: "agent-1",
    requestedByUserId: null,
    status: "pending",
    payload: {},
    decisionNote: null,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: new Date("2026-04-22T09:00:00.000Z"),
    updatedAt: new Date("2026-04-22T09:00:00.000Z"),
  };
}

function makeIssueComment(): IssueComment {
  return {
    id: "comment-1",
    companyId: "company-1",
    issueId: "issue-1",
    authorAgentId: null,
    authorUserId: "board",
    body: "Need progress.",
    createdAt: new Date("2026-04-22T09:00:00.000Z"),
    updatedAt: new Date("2026-04-22T09:00:00.000Z"),
  };
}

describe("createOfficeActions", () => {
  it("submits chat, approve, hire, pause, resume, and fire through the current office API contract", async () => {
    const api = {
      addIssueComment: vi.fn<() => Promise<IssueComment>>().mockResolvedValue(makeIssueComment()),
      createHire: vi.fn<() => Promise<AgentHireResponse>>().mockResolvedValue({
        agent: makeAgent("agent-2"),
        approval: makeApproval("approval-1"),
      }),
      approveHire: vi.fn<() => Promise<Approval>>().mockResolvedValue(makeApproval("approval-1")),
      terminateAgent: vi.fn<() => Promise<Agent>>().mockResolvedValue(makeAgent("agent-3")),
      pauseAgent: vi.fn<() => Promise<Agent>>().mockResolvedValue({
        ...makeAgent("agent-4"),
        status: "paused",
      }),
      resumeAgent: vi.fn<() => Promise<Agent>>().mockResolvedValue(makeAgent("agent-4")),
    };

    const actions = createOfficeActions({
      api,
      companyId: "company-1",
    });

    const hirePayload = {
      name: "Researcher",
      adapterType: "process",
    } as CreateAgentHire;

    await actions.chat("issue-1", "Need progress.");
    await actions.approve("approval-2");
    await actions.hireAndApprove(hirePayload);
    await actions.pause("agent-1");
    await actions.resume("agent-1");
    await actions.fire("agent-1");

    expect(api.addIssueComment).toHaveBeenCalledWith(
      "company-1",
      "issue-1",
      "Need progress.",
      undefined,
      undefined,
    );
    expect(api.approveHire).toHaveBeenNthCalledWith(
      1,
      "company-1",
      "approval-2",
      "Approved in office.",
    );
    expect(api.createHire).toHaveBeenCalledWith("company-1", hirePayload);
    expect(api.approveHire).toHaveBeenNthCalledWith(
      2,
      "company-1",
      "approval-1",
      "Approved in office.",
    );
    expect(api.pauseAgent).toHaveBeenCalledWith("company-1", "agent-1");
    expect(api.resumeAgent).toHaveBeenCalledWith("company-1", "agent-1");
    expect(api.terminateAgent).toHaveBeenCalledWith("company-1", "agent-1");
  });

  it("fails fast when a company-scoped action is attempted without a company id", async () => {
    const actions = createOfficeActions({
      api: {
        addIssueComment: vi.fn(),
        createHire: vi.fn(),
        approveHire: vi.fn(),
        terminateAgent: vi.fn(),
        pauseAgent: vi.fn(),
        resumeAgent: vi.fn(),
      },
      companyId: null,
    });

    expect(() => actions.pause("agent-1")).toThrow("Company id is required");
  });
});
