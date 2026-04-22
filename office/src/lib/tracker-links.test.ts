import { describe, expect, it } from "vitest";
import {
  buildAgentTrackerUrl,
  buildApprovalTrackerUrl,
  buildTrackerCompanyUrl,
  buildIssueTrackerUrl,
  buildTrackerHomeUrl,
  resolveTrackerOrigin,
} from "./tracker-links";

describe("tracker-links", () => {
  it("builds Paperclip tracker routes using the same refs as the main UI", () => {
    const companyBase = buildTrackerCompanyUrl("https://tracker.example", { issuePrefix: "ACME" });

    expect(
      buildIssueTrackerUrl(companyBase, {
        id: "issue-1",
        identifier: "ACME-42",
      }),
    ).toBe("https://tracker.example/ACME/issues/ACME-42");

    expect(
      buildAgentTrackerUrl(companyBase, {
        id: "agent-1",
        urlKey: "ceo-agent-1",
      }),
    ).toBe("https://tracker.example/ACME/agents/ceo-agent-1/dashboard");

    expect(
      buildApprovalTrackerUrl(companyBase, {
        id: "approval-1",
      }),
    ).toBe("https://tracker.example/ACME/approvals/approval-1");
  });

  it("supports explicit tracker-origin override for separate-port office dev", () => {
    expect(resolveTrackerOrigin("https://tracker.example/", undefined)).toBe(
      "https://tracker.example",
    );
    expect(resolveTrackerOrigin("http://localhost:3200", "http://localhost:3100/")).toBe(
      "http://localhost:3100",
    );
    expect(
      buildTrackerHomeUrl(buildTrackerCompanyUrl("http://localhost:3100", { issuePrefix: "PAP" })),
    ).toBe("http://localhost:3100/PAP/dashboard");
  });
});
