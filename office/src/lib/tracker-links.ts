import { deriveAgentUrlKey } from "@paperclipai/shared";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildTrackerUrl(origin: string, path: string) {
  return new URL(path.replace(/^\/+/, ""), `${trimTrailingSlash(origin)}/`).toString();
}

export function resolveTrackerOrigin(locationOrigin: string, explicitOrigin?: string | null) {
  const candidate = explicitOrigin?.trim() || locationOrigin.trim();
  return trimTrailingSlash(candidate);
}

export function buildTrackerCompanyUrl(
  trackerOrigin: string,
  company: { issuePrefix: string },
) {
  return buildTrackerUrl(trackerOrigin, `${encodeURIComponent(company.issuePrefix)}/`);
}

export function buildTrackerHomeUrl(trackerOrigin: string) {
  return buildTrackerUrl(trackerOrigin, "dashboard");
}

export function buildIssueTrackerUrl(
  trackerOrigin: string,
  issue: { id: string; identifier?: string | null },
) {
  const issueRef = issue.identifier ?? issue.id;
  return buildTrackerUrl(trackerOrigin, `issues/${encodeURIComponent(issueRef)}`);
}

export function buildAgentTrackerUrl(
  trackerOrigin: string,
  agent: { id: string; urlKey?: string | null; name?: string | null },
) {
  const agentRef = agent.urlKey ?? deriveAgentUrlKey(agent.name, agent.id);
  return buildTrackerUrl(trackerOrigin, `agents/${encodeURIComponent(agentRef)}/dashboard`);
}

export function buildApprovalTrackerUrl(
  trackerOrigin: string,
  approval: { id: string },
) {
  return buildTrackerUrl(trackerOrigin, `approvals/${encodeURIComponent(approval.id)}`);
}
