import type { CreateAgentHire } from "@/types/office";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paperclipApi } from "./paperclip";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body));
}

describe("paperclipApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the office snapshot from the companies, agents, issues, approvals, and activity endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "company-1",
            name: "Acme",
            issuePrefix: "ACME",
          },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse([{ id: "agent-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "issue-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "approval-1" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "activity-1" }]));

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await paperclipApi.loadOfficeSnapshot();

    expect(snapshot.company.id).toBe("company-1");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.issues).toHaveLength(1);
    expect(snapshot.approvals).toHaveLength(1);
    expect(snapshot.activity).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/companies", expect.any(Object));
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
});
