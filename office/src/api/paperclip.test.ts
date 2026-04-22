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

describe("paperclipApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the office snapshot from the company, agents, issues, approvals, and activity endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "company-1", name: "Acme", issuePrefix: "ACME" }))
      .mockResolvedValueOnce(jsonResponse([{ id: "agent-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "issue-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "approval-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "activity-1" }]));

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await paperclipApi.loadOfficeSnapshot("company-1");

    expect(snapshot.company.id).toBe("company-1");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.issues).toHaveLength(1);
    expect(snapshot.approvals).toHaveLength(1);
    expect(snapshot.activity).toHaveLength(1);
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
      .mockResolvedValueOnce(jsonResponse([{ id: "agent-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "issue-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "approval-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "activity-1" }]));

    vi.stubGlobal("fetch", fetchMock);

    const snapshotPromise = paperclipApi.loadOfficeSnapshot("company-1");

    expect(fetchMock).toHaveBeenCalledTimes(5);

    resolveCompany(jsonResponse({ id: "company-1", name: "Acme", issuePrefix: "ACME" }));

    await expect(snapshotPromise).resolves.toMatchObject({
      company: { id: "company-1" },
    });
  });

  it("sends Paperclip action calls to the correct endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await paperclipApi.addIssueComment("issue-1", "Need a progress update.", true, false);
    await paperclipApi.createHire("company-1", {
      name: "Ava",
      adapterType: "droid",
    } as CreateAgentHire);
    await paperclipApi.approveHire("approval-1", "Approved in office.");
    await paperclipApi.pauseAgent("agent-1");
    await paperclipApi.resumeAgent("agent-1");
    await paperclipApi.terminateAgent("agent-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/issues/issue-1/comments",
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
      "/api/approvals/approval-1/approve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ decisionNote: "Approved in office." }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/agents/agent-1/pause",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/agents/agent-1/resume",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/agents/agent-1/terminate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  });

  it("omits optional action fields when they are undefined", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await paperclipApi.addIssueComment("issue-1", "Just checking in.");
    await paperclipApi.approveHire("approval-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/issues/issue-1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          body: "Just checking in.",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/approvals/approval-1/approve",
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
      .mockResolvedValueOnce(jsonResponse({ id: "company-1", name: "Acme", issuePrefix: "ACME" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    rerender({ companyId: "company-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("/api/companies/company-1", expect.any(Object));
  });
});
