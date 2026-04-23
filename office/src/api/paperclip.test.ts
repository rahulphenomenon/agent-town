import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type { CreateAgentHire } from "@/types/office";
import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./client";
import { useOfficeWorldData } from "@/hooks/useOfficeWorldData";
import { paperclipApi } from "./paperclip";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body));
}

function companyPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "company-1",
    name: "Acme",
    issuePrefix: "ACME",
    createdAt: "2026-04-22T12:00:00.000Z",
    updatedAt: "2026-04-22T12:00:00.000Z",
    ...overrides,
  };
}

function agentPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent-1",
    createdAt: "2026-04-22T12:01:00.000Z",
    updatedAt: "2026-04-22T12:02:00.000Z",
    pausedAt: null,
    lastHeartbeatAt: null,
    ...overrides,
  };
}

function issuePayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-1",
    createdAt: "2026-04-22T12:04:00.000Z",
    updatedAt: "2026-04-22T12:05:00.000Z",
    executionLockedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    myLastTouchAt: null,
    lastExternalCommentAt: null,
    lastActivityAt: null,
    ...overrides,
  };
}

function approvalPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    createdAt: "2026-04-22T12:08:00.000Z",
    updatedAt: "2026-04-22T12:09:00.000Z",
    decidedAt: null,
    ...overrides,
  };
}

function activityPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "activity-1",
    createdAt: "2026-04-22T12:10:00.000Z",
    ...overrides,
  };
}

function issueCommentPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "comment-1",
    createdAt: "2026-04-22T12:11:00.000Z",
    updatedAt: "2026-04-22T12:12:00.000Z",
    ...overrides,
  };
}

describe("paperclipApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the office snapshot from the company, agents, issues, approvals, and activity endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(companyPayload()),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          agentPayload({ lastHeartbeatAt: "2026-04-22T12:03:00.000Z" }),
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          issuePayload({
            executionLockedAt: "2026-04-22T12:06:00.000Z",
            lastActivityAt: "2026-04-22T12:07:00.000Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([approvalPayload()]),
      )
      .mockResolvedValueOnce(
        jsonResponse([approvalPayload({ id: "approval-2", status: "revision_requested" })]),
      )
      .mockResolvedValueOnce(
        jsonResponse([activityPayload()]),
      );

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await paperclipApi.loadOfficeSnapshot("company-1");

    expect(snapshot.company.id).toBe("company-1");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.issues).toHaveLength(1);
    expect(snapshot.approvals).toHaveLength(2);
    expect(snapshot.activity).toHaveLength(1);
    expect(snapshot.company.createdAt).toBeInstanceOf(Date);
    expect(snapshot.agents[0]?.lastHeartbeatAt).toBeInstanceOf(Date);
    expect(snapshot.issues[0]?.executionLockedAt).toBeInstanceOf(Date);
    expect(snapshot.approvals[0]?.createdAt).toBeInstanceOf(Date);
    expect(snapshot.activity[0]?.createdAt).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/companies/company-1",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/companies/company-1/agents",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/companies/company-1/issues",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/companies/company-1/approvals?status=pending",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/companies/company-1/approvals?status=revision_requested",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/companies/company-1/activity",
      expect.any(Object),
    );
  });

  it("starts all office snapshot requests in parallel once the company id is known", async () => {
    let resolveCompany: (value: Response) => void = () => {
      throw new Error("Expected company resolver to be captured.");
    };
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveCompany = resolve;
          }),
      )
      .mockResolvedValueOnce(jsonResponse([agentPayload()]))
      .mockResolvedValueOnce(jsonResponse([issuePayload()]))
      .mockResolvedValueOnce(jsonResponse([approvalPayload()]))
      .mockResolvedValueOnce(jsonResponse([approvalPayload({ id: "approval-2", status: "revision_requested" })]))
      .mockResolvedValueOnce(jsonResponse([activityPayload()]));

    vi.stubGlobal("fetch", fetchMock);

    const snapshotPromise = paperclipApi.loadOfficeSnapshot("company-1");

    expect(fetchMock).toHaveBeenCalledTimes(6);

    resolveCompany(jsonResponse(companyPayload()));

    await expect(snapshotPromise).resolves.toMatchObject({
      company: { id: "company-1" },
    });
  });

  it("keeps the newest approval snapshot when an approval appears in both actionable status responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(companyPayload()))
      .mockResolvedValueOnce(jsonResponse([agentPayload()]))
      .mockResolvedValueOnce(jsonResponse([issuePayload()]))
      .mockResolvedValueOnce(
        jsonResponse([
          approvalPayload({
            id: "approval-1",
            status: "pending",
            updatedAt: "2026-04-22T12:09:00.000Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          approvalPayload({
            id: "approval-1",
            status: "revision_requested",
            updatedAt: "2026-04-22T12:10:00.000Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(jsonResponse([activityPayload()]));

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await paperclipApi.loadOfficeSnapshot("company-1");

    expect(snapshot.approvals).toHaveLength(1);
    expect(snapshot.approvals[0]).toMatchObject({
      id: "approval-1",
      status: "revision_requested",
    });
    expect(snapshot.approvals[0]?.updatedAt.toISOString()).toBe("2026-04-22T12:10:00.000Z");
  });

  it("forwards the abort signal to every snapshot request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(companyPayload()))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();

    await paperclipApi.loadOfficeSnapshot("company-1", controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(6);

    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toEqual(
        expect.objectContaining({
          signal: controller.signal,
        }),
      );
    }
  });

  it("sends Paperclip action calls to the correct endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(issueCommentPayload()),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          agent: agentPayload({
            id: "agent-2",
            createdAt: "2026-04-22T12:13:00.000Z",
            updatedAt: "2026-04-22T12:14:00.000Z",
          }),
          approval: approvalPayload({
            id: "approval-2",
            createdAt: "2026-04-22T12:15:00.000Z",
            updatedAt: "2026-04-22T12:16:00.000Z",
          }),
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(approvalPayload({ decidedAt: "2026-04-22T12:19:00.000Z" })),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          agentPayload({
            createdAt: "2026-04-22T12:20:00.000Z",
            updatedAt: "2026-04-22T12:21:00.000Z",
            pausedAt: "2026-04-22T12:22:00.000Z",
            lastHeartbeatAt: "2026-04-22T12:23:00.000Z",
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          agentPayload({
            createdAt: "2026-04-22T12:24:00.000Z",
            updatedAt: "2026-04-22T12:25:00.000Z",
            lastHeartbeatAt: "2026-04-22T12:26:00.000Z",
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          agentPayload({
            createdAt: "2026-04-22T12:27:00.000Z",
            updatedAt: "2026-04-22T12:28:00.000Z",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const comment = await paperclipApi.addIssueComment("company-1", "issue-1", "Need a progress update.", true, false);
    const hire = await paperclipApi.createHire("company-1", {
      name: "Ava",
      adapterType: "droid",
    } as CreateAgentHire);
    const approval = await paperclipApi.approveHire("company-1", "approval-1", "Approved in office.");
    const pausedAgent = await paperclipApi.pauseAgent("company-1", "agent-1");
    const resumedAgent = await paperclipApi.resumeAgent("company-1", "agent-1");
    const terminatedAgent = await paperclipApi.terminateAgent("company-1", "agent-1");

    expect(comment.createdAt).toBeInstanceOf(Date);
    expect(hire.agent.createdAt).toBeInstanceOf(Date);
    expect(hire.approval?.createdAt).toBeInstanceOf(Date);
    expect(approval.decidedAt).toBeInstanceOf(Date);
    expect(pausedAgent.pausedAt).toBeInstanceOf(Date);
    expect(resumedAgent.lastHeartbeatAt).toBeInstanceOf(Date);
    expect(terminatedAgent.createdAt).toBeInstanceOf(Date);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/issues/issue-1/comments?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          body: "Need a progress update.",
          reopen: true,
          interrupt: false,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/companies/company-1/agent-hires",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ava",
          adapterType: "droid",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/approvals/approval-1/approve?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ decisionNote: "Approved in office." }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/agents/agent-1/pause?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/agents/agent-1/resume?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/agents/agent-1/terminate?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  });

  it("omits optional action fields when they are undefined", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(issueCommentPayload()))
      .mockResolvedValueOnce(jsonResponse(approvalPayload()));
    vi.stubGlobal("fetch", fetchMock);

    await paperclipApi.addIssueComment("company-1", "issue-1", "Just checking in.");
    await paperclipApi.approveHire("company-1", "approval-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/issues/issue-1/comments?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          body: "Just checking in.",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/approvals/approval-1/approve?companyId=company-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(request<void>("/agents/agent-1/pause", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws ApiError when the API returns an error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "No company selected." }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(request("/companies/company-1")).rejects.toMatchObject({
      message: "No company selected.",
      status: 422,
    });
  });

  it("does not fetch office world data until a company is selected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result, rerender } = renderHook(
      ({ companyId }) => useOfficeWorldData(companyId),
      {
        initialProps: { companyId: null as string | null },
        wrapper,
      },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");

    fetchMock
      .mockResolvedValueOnce(jsonResponse(companyPayload()))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    rerender({ companyId: "company-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("/api/companies/company-1", expect.any(Object));
  });

  it("fails manual refetch when no company is selected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useOfficeWorldData(null), { wrapper });

    await expect(result.current.refetch()).resolves.toMatchObject({
      error: new Error("Company id is required to load office world data."),
      status: "error",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
