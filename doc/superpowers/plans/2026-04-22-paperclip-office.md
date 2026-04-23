# Paperclip Office UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Paperclip office UI with keyboard movement, collisions, in-world agent interaction, hire/fire flows, and a tracker escape hatch.

**Architecture:** Start from a fresh fork or clone of the upstream Paperclip monorepo, add a proper root `.gitignore` update immediately, then add a new `office` workspace app built with Phaser 3 and React overlays. The office app talks to Paperclip through its existing REST API over a Vite `/api` proxy, keeps Paperclip as the source of truth, and uses a pure world-state mapper plus a visual-intent reducer so character motion stays readable even when backend state changes instantly.

**Tech Stack:** Paperclip monorepo, pnpm workspaces, TypeScript, React 19, Vite 6, Phaser 3, TanStack Query, Vitest

---

## Planned File Structure

### Existing files to modify

- `.gitignore`
- `pnpm-workspace.yaml`
- `package.json`
- `README.md`
- `ui/src/App.tsx`

### New workspace app

- `office/package.json`
- `office/tsconfig.json`
- `office/vite.config.ts`
- `office/index.html`
- `office/src/main.tsx`
- `office/src/App.tsx`
- `office/src/index.css`
- `office/src/test/setup.ts`
- `office/src/App.test.tsx`

### Office data layer

- `office/src/api/client.ts`
- `office/src/api/paperclip.ts`
- `office/src/api/paperclip.test.ts`
- `office/src/hooks/useOfficeWorldData.ts`
- `office/src/types/office.ts`

### World-state and routing logic

- `office/src/lib/world-state.ts`
- `office/src/lib/world-state.test.ts`
- `office/src/lib/action-inbox.ts`
- `office/src/lib/action-inbox.test.ts`
- `office/src/lib/agent-intent.ts`
- `office/src/lib/agent-intent.test.ts`
- `office/src/lib/tracker-links.ts`
- `office/src/lib/tracker-links.test.ts`
- `office/src/game/layout/officeLayout.ts`
- `office/src/game/layout/officeLayout.test.ts`

### Game runtime

- `office/src/game/createOfficeGame.ts`
- `office/src/game/scenes/OfficeScene.ts`
- `office/src/game/input/playerMovement.ts`
- `office/src/game/input/playerMovement.test.ts`
- `office/src/game/actors/AgentActor.ts`
- `office/src/game/actors/TalkBubble.ts`

### React overlay UI

- `office/src/ui/OfficeShell.tsx`
- `office/src/ui/components/TrackerButton.tsx`
- `office/src/ui/components/AgentDialog.tsx`
- `office/src/ui/components/ActionInboxDialog.tsx`
- `office/src/ui/components/AgentDialog.test.tsx`
- `office/src/ui/components/HireModal.tsx`
- `office/src/ui/useOfficeActions.ts`
- `office/src/ui/useOfficeActions.test.ts`
- `ui/src/pages/OfficeShortcut.tsx`

### Documentation

- `ATTRIBUTION.md`
- `office/README.md`

## Notes Before Execution

- User prerequisite: execute this plan inside a fresh fork or clone of `paperclipai/paperclip`. Do not start from an unrelated placeholder repo and merge histories.
- The office app stays separate from Paperclip’s existing `ui` package for isolation, but it also adds a `/office` shortcut inside `ui/src/App.tsx` so the tracker can deep-link into the office experience later without inventing a new navigation scheme.
- For v1, agent routing uses a fixed office graph with waypoints, not general pathfinding. This keeps movement deterministic and readable.
- For v1, detail views stay shallow. `Open Ticket`, `Open In Tracker`, and approval context links should reuse Paperclip’s actual route shapes (`/issues/:issueRef`, `/agents/:agentRef`, `/approvals/:approvalId`) instead of inventing prefix-based routes.
- The tracker-side `/office` shortcut must use an explicit `VITE_OFFICE_URL` pointing at the office app entry URL. Do not fall back to `window.location.origin`, because that resolves to the tracker root rather than the office experience.
- Boss-required actions should use one unified action inbox. For v1, queue approvals and mentions in timestamp order and show them one after another as dialogs.

### Task 1: Prepare The Paperclip Fork And Create The Office Workspace

**Files:**
- Modify: `.gitignore`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `office/package.json`
- Create: `office/tsconfig.json`
- Create: `office/vite.config.ts`
- Create: `office/index.html`
- Create: `office/src/main.tsx`
- Create: `office/src/App.tsx`
- Create: `office/src/index.css`
- Create: `office/src/test/setup.ts`
- Test: `office/src/App.test.tsx`

- [ ] **Step 1: Verify this repo is already a Paperclip fork or clone before writing code**

```bash
test -d ui -a -d server -a -d packages
```

Expected: the command exits `0`, confirming that the working directory is already a Paperclip checkout.

- [ ] **Step 2: Update the root `.gitignore`, add the `office` workspace, and add root scripts**

```gitignore
# office workspace
office/node_modules
office/dist
office/.vite
office/coverage
office/.env.local
ui/.env.local
```

```yaml
# pnpm-workspace.yaml
packages:
  - packages/*
  - packages/adapters/*
  - packages/plugins/*
  - packages/plugins/examples/*
  - "!packages/plugins/examples/plugin-orchestration-smoke-example"
  - server
  - ui
  - cli
  - office
```

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "dev:office": "pnpm --filter @paperclipai/office dev",
    "build:office": "pnpm --filter @paperclipai/office build",
    "test:office": "pnpm --filter @paperclipai/office exec vitest run"
  }
}
```

- [ ] **Step 3: Write the failing office-app smoke test**

```tsx
// office/src/App.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Office App", () => {
  it("renders the office title and tracker shortcut", () => {
    render(<App />);

    expect(screen.getByText("Paperclip Office")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view in tracker/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Create the minimal office workspace scaffold**

```json
// office/package.json
{
  "name": "@paperclipai/office",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 3200",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "@paperclipai/shared": "workspace:*",
    "@tanstack/react-query": "^5.90.21",
    "phaser": "^3.90.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

```json
// office/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

```ts
// office/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3200,
    proxy: {
      "/api": "http://localhost:3100",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
```

```html
<!-- office/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paperclip Office</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```tsx
// office/src/App.tsx
export function App() {
  return (
    <main className="office-app">
      <header className="office-header">
        <h1>Paperclip Office</h1>
        <button type="button">View in Tracker</button>
      </header>
      <section className="office-stage">Loading office…</section>
    </main>
  );
}
```

```tsx
// office/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

```ts
// office/src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

```css
/* office/src/index.css */
:root {
  color: #111827;
  background: #efe0c4;
  font-family: "IBM Plex Sans", sans-serif;
}

body {
  margin: 0;
}

.office-app {
  min-height: 100vh;
}

.office-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
}

.office-stage {
  width: 768px;
  height: 384px;
  margin: 0 auto;
  border: 4px solid #1f2937;
}
```

- [ ] **Step 5: Install dependencies and run the smoke test**

Run:

```bash
pnpm install
pnpm --filter @paperclipai/office exec vitest run src/App.test.tsx
pnpm --filter @paperclipai/office build
```

Expected:
- `App.test.tsx` passes
- `vite build` emits a production bundle for `office/dist`

- [ ] **Step 6: Commit the scaffold**

```bash
git add .gitignore pnpm-workspace.yaml package.json office
git commit -m "feat: scaffold office workspace"
```

### Task 2: Add A Minimal Paperclip REST Client And Polling Hook

**Files:**
- Create: `office/src/api/client.ts`
- Create: `office/src/api/paperclip.ts`
- Create: `office/src/api/paperclip.test.ts`
- Create: `office/src/hooks/useOfficeWorldData.ts`
- Create: `office/src/types/office.ts`

- [ ] **Step 1: Write failing API-client tests for the read and action endpoints**

```ts
// office/src/api/paperclip.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { paperclipApi } from "./paperclip";

describe("paperclipApi", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads the office snapshot from company, agent, issue, approval, and activity endpoints", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "c1", issuePrefix: "ACME", name: "Acme" }])))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "a1", name: "CEO", status: "idle" }])))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "i1", title: "Ship demo", assigneeAgentId: "a1", status: "todo" }])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])));

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await paperclipApi.loadOfficeSnapshot();

    expect(snapshot.company.issuePrefix).toBe("ACME");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.issues[0]?.title).toBe("Ship demo");
  });

  it("posts feedback comments and approval actions to Paperclip", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    vi.stubGlobal("fetch", fetchMock);

    await paperclipApi.addIssueComment("issue-1", "Need a progress update.");
    await paperclipApi.approveHire("approval-1", "Approved in office.");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/issues/issue-1/comments",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/approvals/approval-1/approve",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

- [ ] **Step 2: Run the API tests to verify they fail**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/api/paperclip.test.ts
```

Expected: FAIL with missing module exports for `paperclipApi`.

- [ ] **Step 3: Implement the typed fetch wrapper and office snapshot loader**

```ts
// office/src/api/client.ts
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { error?: string } | null)?.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

```ts
// office/src/api/paperclip.ts
import { request } from "./client";
import type { Approval, Company, Agent, Issue, ActivityEvent } from "@/types/office";

export interface OfficeSnapshot {
  company: Company;
  agents: Agent[];
  issues: Issue[];
  approvals: Approval[];
  activity: ActivityEvent[];
}

export const paperclipApi = {
  async loadOfficeSnapshot(): Promise<OfficeSnapshot> {
    const companies = await request<Company[]>("/companies");
    const company = companies[0];

    if (!company) {
      throw new Error("No Paperclip companies found. Finish onboarding in the tracker first.");
    }

    const [agents, issues, approvals, activity] = await Promise.all([
      request<Agent[]>(`/companies/${company.id}/agents`),
      request<Issue[]>(`/companies/${company.id}/issues`),
      request<Approval[]>(`/companies/${company.id}/approvals?status=pending`),
      request<ActivityEvent[]>(`/companies/${company.id}/activity`),
    ]);

    return { company, agents, issues, approvals, activity };
  },

  addIssueComment(issueId: string, body: string) {
    return request(`/issues/${issueId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },

  createHire(companyId: string, payload: Record<string, unknown>) {
    return request(`/companies/${companyId}/agent-hires`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  approveHire(approvalId: string, decisionNote: string) {
    return request(`/approvals/${approvalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  },

  pauseAgent(agentId: string) {
    return request(`/agents/${agentId}/pause`, { method: "POST", body: JSON.stringify({}) });
  },

  resumeAgent(agentId: string) {
    return request(`/agents/${agentId}/resume`, { method: "POST", body: JSON.stringify({}) });
  },

  terminateAgent(agentId: string) {
    return request(`/agents/${agentId}/terminate`, { method: "POST", body: JSON.stringify({}) });
  },
};
```

```ts
// office/src/types/office.ts
export interface Company {
  id: string;
  name: string;
  issuePrefix: string;
}

export interface Agent {
  id: string;
  name: string;
  status: "idle" | "running" | "paused" | "error" | "terminated" | string;
  title?: string | null;
  urlKey?: string | null;
}

export interface Issue {
  id: string;
  identifier?: string | null;
  title: string;
  status: string;
  assigneeAgentId?: string | null;
}

export interface Approval {
  id: string;
  type: string;
  status: string;
  createdAt?: string;
}

export interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  createdAt?: string;
  details?: Record<string, unknown> | null;
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
```

```ts
// office/src/hooks/useOfficeWorldData.ts
import { useQuery } from "@tanstack/react-query";
import { paperclipApi } from "@/api/paperclip";

export function useOfficeWorldData() {
  return useQuery({
    queryKey: ["office-snapshot"],
    queryFn: () => paperclipApi.loadOfficeSnapshot(),
    refetchInterval: 1500,
    staleTime: 1000,
  });
}
```

- [ ] **Step 4: Re-run the API tests**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/api/paperclip.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the data layer**

```bash
git add office/src/api office/src/hooks office/src/types
git commit -m "feat: add office paperclip api client"
```

### Task 3: Build The Pure World-State Mapper And Visual-Intent Reducer

**Files:**
- Create: `office/src/lib/world-state.ts`
- Create: `office/src/lib/world-state.test.ts`
- Create: `office/src/lib/agent-intent.ts`
- Create: `office/src/lib/agent-intent.test.ts`

- [ ] **Step 1: Write failing tests for state mapping and fast-transition smoothing**

```ts
// office/src/lib/world-state.test.ts
import { describe, expect, it } from "vitest";
import { deriveOfficeAgents } from "./world-state";

describe("deriveOfficeAgents", () => {
  it("sends idle agents to the water cooler", () => {
    const result = deriveOfficeAgents({
      agents: [{ id: "a1", name: "CEO", status: "idle" }],
      issues: [],
      approvals: [],
      activity: [],
      previous: new Map(),
      now: Date.now(),
    });

    expect(result[0]?.targetZone).toBe("watercooler");
  });

  it("sends paused agents to the couch", () => {
    const result = deriveOfficeAgents({
      agents: [{ id: "a1", name: "CEO", status: "paused" }],
      issues: [],
      approvals: [],
      activity: [],
      previous: new Map(),
      now: Date.now(),
    });

    expect(result[0]?.targetZone).toBe("couch");
  });

  it("keeps desk assignment stable even when agent order changes", () => {
    const now = Date.now();
    const first = deriveOfficeAgents({
      agents: [
        { id: "a1", name: "Alpha", status: "running" },
        { id: "a2", name: "Beta", status: "running" },
      ],
      issues: [
        { id: "i1", title: "Alpha task", status: "in_progress", assigneeAgentId: "a1" },
        { id: "i2", title: "Beta task", status: "in_progress", assigneeAgentId: "a2" },
      ],
      approvals: [],
      activity: [],
      previous: new Map(),
      now,
    });

    const second = deriveOfficeAgents({
      agents: [
        { id: "a2", name: "Beta", status: "running" },
        { id: "a1", name: "Alpha", status: "running" },
      ],
      issues: [
        { id: "i1", title: "Alpha task", status: "in_progress", assigneeAgentId: "a1" },
        { id: "i2", title: "Beta task", status: "in_progress", assigneeAgentId: "a2" },
      ],
      approvals: [],
      activity: [],
      previous: new Map(first.map((agent) => [agent.agentId, agent])),
      now: now + 2_000,
    });

    expect(first.find((agent) => agent.agentId === "a1")?.targetZone).toBe(
      second.find((agent) => agent.agentId === "a1")?.targetZone,
    );
  });

  it("marks blocked agents as needing attention and surfaces a latest snippet", () => {
    const result = deriveOfficeAgents({
      agents: [{ id: "a1", name: "CEO", status: "error" }],
      issues: [{ id: "i1", title: "Ship demo", status: "blocked", assigneeAgentId: "a1" }],
      approvals: [],
      activity: [
        {
          id: "evt-1",
          action: "commented",
          entityType: "issue",
          entityId: "i1",
          createdAt: new Date().toISOString(),
          details: { body: "Need product input before continuing." },
        },
      ],
      previous: new Map(),
      now: Date.now(),
    });

    expect(result[0]?.intent.mode).toBe("needs_attention");
    expect(result[0]?.latestSnippet).toContain("Need product input");
  });

  it("infers a symbolic conversation from recent issue comments", () => {
    const result = deriveOfficeAgents({
      agents: [
        { id: "a1", name: "CEO", status: "running" },
        { id: "a2", name: "CTO", status: "running" },
      ],
      issues: [{ id: "i1", title: "Ship demo", status: "in_progress", assigneeAgentId: "a1" }],
      approvals: [],
      activity: [
        {
          id: "evt-2",
          action: "commented",
          entityType: "issue",
          entityId: "i1",
          actorId: "a2",
          createdAt: new Date().toISOString(),
          details: { body: "@CEO I pushed the backend fix." },
        },
      ],
      previous: new Map(),
      now: Date.now(),
    });

    expect(result.find((agent) => agent.agentId === "a1")?.talkingWith).toBe("a2");
    expect(result.find((agent) => agent.agentId === "a1")?.intent.mode).toBe("talking");
    expect(result.find((agent) => agent.agentId === "a2")?.talkingWith).toBe("a1");
  });
});
```

```ts
// office/src/lib/agent-intent.test.ts
import { describe, expect, it } from "vitest";
import { resolveVisualIntent } from "./agent-intent";

describe("resolveVisualIntent", () => {
  it("keeps a readable heading-to-desk transition even if backend status flips quickly", () => {
    const now = 1_000;
    const result = resolveVisualIntent({
      previousIntent: {
        mode: "heading_to_desk",
        targetZone: "desk-1",
        startedAt: now - 300,
      },
      nextMode: "idle",
      nextTargetZone: "watercooler",
      now,
      minTravelMs: 900,
    });

    expect(result.mode).toBe("heading_to_desk");
    expect(result.targetZone).toBe("desk-1");
  });
});
```

- [ ] **Step 2: Run the logic tests to verify they fail**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/lib/world-state.test.ts src/lib/agent-intent.test.ts
```

Expected: FAIL with missing `deriveOfficeAgents` and `resolveVisualIntent`.

- [ ] **Step 3: Implement the pure world-state and intent logic**

```ts
// office/src/lib/world-state.ts
import type { Approval, Agent, Issue, ActivityEvent, OfficeAgentView } from "@/types/office";
import { resolveVisualIntent } from "./agent-intent";

interface DeriveInput {
  agents: Agent[];
  issues: Issue[];
  approvals: Approval[];
  activity: ActivityEvent[];
  previous: Map<string, OfficeAgentView>;
  now: number;
}

function hashDesk(agentId: string) {
  return agentId.split("").reduce((total, char) => total + char.charCodeAt(0), 0) % 8;
}

function getStableDeskZone(agentId: string, previous: Map<string, OfficeAgentView>) {
  const previousZone = previous.get(agentId)?.targetZone;

  if (previousZone?.startsWith("desk-")) {
    return previousZone;
  }

  return `desk-${hashDesk(agentId) + 1}`;
}

function getLatestSnippet(agentId: string, issue: Issue | null, activity: ActivityEvent[]) {
  const relevantEvent = activity.find((event) => {
    if (issue && event.entityType === "issue" && event.entityId === issue.id) {
      return true;
    }

    return event.actorId === agentId;
  });

  const body = relevantEvent?.details?.body;
  if (typeof body === "string" && body.trim().length > 0) {
    return body;
  }

  return relevantEvent ? `${relevantEvent.action} ${relevantEvent.entityType}` : null;
}

function getTalkingPartner(
  talkingPairs: Map<string, string>,
  agentId: string,
) {
  return talkingPairs.get(agentId) ?? null;
}

function inferTalkingPairs(
  issues: Issue[],
  activity: ActivityEvent[],
  now: number,
) {
  const pairs = new Map<string, string>();

  for (const issue of issues) {
    if (!issue.assigneeAgentId) continue;

    const recentComment = activity.find((event) => {
      if (event.entityType !== "issue" || event.entityId !== issue.id) return false;
      if (event.action !== "commented" || !event.actorId || event.actorId === issue.assigneeAgentId) return false;
      if (!event.createdAt) return false;

      return now - Date.parse(event.createdAt) < 120_000;
    });

    if (!recentComment?.actorId) continue;

    pairs.set(issue.assigneeAgentId, recentComment.actorId);
    pairs.set(recentComment.actorId, issue.assigneeAgentId);
  }

  return pairs;
}

function isRecent(event: ActivityEvent, now: number) {
  if (!event.createdAt) return false;
  return now - Date.parse(event.createdAt) < 120_000;
}

function isNeedsAttention(agent: Agent, issue: Issue | null, activity: ActivityEvent[], now: number) {
  if (agent.status === "error" || issue?.status === "blocked") return true;

  return activity.some((event) => {
    if (!isRecent(event, now)) return false;
    if (event.entityType !== "issue" || event.entityId !== issue?.id) return false;
    return event.action === "awaiting_input" || event.action === "blocked";
  });
}

function getLatestIssueSnippet(issue: Issue | null, activity: ActivityEvent[]) {
  if (!issue) return null;

  const event = activity.find((candidate) => {
    if (candidate.entityType !== "issue" || candidate.entityId !== issue.id) return false;
    const body = candidate.details?.body;
    return typeof body === "string" && body.trim().length > 0;
  });

  const body = event?.details?.body;
  return typeof body === "string" ? body : null;
}

export function deriveOfficeAgents(input: DeriveInput): OfficeAgentView[] {
  const activeIssues = new Map(
    input.issues
      .filter((issue) => issue.assigneeAgentId)
      .map((issue) => [issue.assigneeAgentId!, issue]),
  );
  const talkingPairs = inferTalkingPairs(input.issues, input.activity, input.now);

  return input.agents.map((agent) => {
    const issue = activeIssues.get(agent.id) ?? null;
    const deskZone = getStableDeskZone(agent.id, input.previous);
    const talkingWith = getTalkingPartner(talkingPairs, agent.id);
    const needsAttention = isNeedsAttention(agent, issue, input.activity, input.now);
    const latestSnippet =
      getLatestIssueSnippet(issue, input.activity) ??
      getLatestSnippet(agent.id, issue, input.activity);

    const nextTargetZone =
      agent.status === "terminated"
        ? "spawn"
        : talkingWith
          ? "chat-nook"
          : agent.status === "paused"
            ? "couch"
            : needsAttention
              ? deskZone
              : agent.status === "running" || issue?.status === "in_progress" || issue?.status === "todo"
                ? deskZone
                : "watercooler";

    const nextMode =
      agent.status === "terminated"
        ? "terminated"
        : talkingWith
          ? "talking"
          : agent.status === "paused"
            ? "paused_asleep"
            : needsAttention
              ? "needs_attention"
              : agent.status === "running" || issue?.status === "in_progress"
                ? "working_at_desk"
                : issue?.status === "todo"
                  ? "heading_to_desk"
                  : "idle";

    const previousIntent = input.previous.get(agent.id)?.intent ?? null;
    const intent = resolveVisualIntent({
      previousIntent,
      nextMode,
      nextTargetZone,
      now: input.now,
      minTravelMs: 900,
    });

    return {
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      issue,
      targetZone: nextTargetZone,
      intent,
      latestSnippet,
      talkingWith,
    };
  });
}
```

```ts
// office/src/lib/agent-intent.ts
import type { OfficeIntent } from "@/types/office";

interface ResolveIntentInput {
  previousIntent: OfficeIntent | null;
  nextMode: OfficeIntent["mode"];
  nextTargetZone: string;
  now: number;
  minTravelMs: number;
}

export function resolveVisualIntent(input: ResolveIntentInput): OfficeIntent {
  const previous = input.previousIntent;

  if (
    previous &&
    previous.mode === "heading_to_desk" &&
    previous.targetZone.startsWith("desk-") &&
    input.nextMode !== "terminated" &&
    input.now - previous.startedAt < input.minTravelMs
  ) {
    return previous;
  }

  if (input.nextMode === "heading_to_desk") {
    return {
      mode: "heading_to_desk",
      targetZone: input.nextTargetZone,
      startedAt: input.now,
    };
  }

  return {
    mode: input.nextMode,
    targetZone: input.nextTargetZone,
    startedAt: input.now,
  };
}
```

- [ ] **Step 4: Re-run the logic tests**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/lib/world-state.test.ts src/lib/agent-intent.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the state mapper**

```bash
git add office/src/lib office/src/types
git commit -m "feat: add office world state mapping"
```

### Task 4: Define The Office Layout, Obstacle Collisions, And Deterministic Agent Routes

**Files:**
- Create: `office/src/game/layout/officeLayout.ts`
- Create: `office/src/game/layout/officeLayout.test.ts`

- [ ] **Step 1: Write failing tests for desk assignment and waypoint routes**

```ts
// office/src/game/layout/officeLayout.test.ts
import { describe, expect, it } from "vitest";
import { getCollisionRects, getRouteForZones } from "./officeLayout";

describe("officeLayout", () => {
  it("routes watercooler to desk through the corridor graph", () => {
    const route = getRouteForZones("watercooler", "desk-1");

    expect(route[0]?.id).toBe("watercooler");
    expect(route.at(-1)?.id).toBe("desk-1");
    expect(route.map((node) => node.id)).toContain("hallway-center");
  });

  it("exposes obstacle rectangles for desk banks and lounge furniture", () => {
    const ids = getCollisionRects().map((rect) => rect.id);

    expect(ids).toContain("desk-bank-top");
    expect(ids).toContain("desk-bank-bottom");
    expect(ids).toContain("couch-block");
  });
});
```

- [ ] **Step 2: Run the layout tests to verify they fail**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/game/layout/officeLayout.test.ts
```

Expected: FAIL with missing `getCollisionRects` and `getRouteForZones`.

- [ ] **Step 3: Implement the static office graph**

```ts
// office/src/game/layout/officeLayout.ts
export interface OfficeNode {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export interface CollisionRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const nodes: Record<string, OfficeNode> = {
  spawn: { id: "spawn", x: 64, y: 192, neighbors: ["hallway-center"] },
  "hallway-center": { id: "hallway-center", x: 192, y: 192, neighbors: ["spawn", "watercooler", "couch", "chat-nook", "desk-1", "desk-2", "desk-3", "desk-4", "desk-5", "desk-6", "desk-7", "desk-8"] },
  watercooler: { id: "watercooler", x: 96, y: 96, neighbors: ["hallway-center"] },
  couch: { id: "couch", x: 96, y: 288, neighbors: ["hallway-center"] },
  "chat-nook": { id: "chat-nook", x: 232, y: 128, neighbors: ["hallway-center"] },
  "desk-1": { id: "desk-1", x: 320, y: 80, neighbors: ["hallway-center"] },
  "desk-2": { id: "desk-2", x: 416, y: 80, neighbors: ["hallway-center"] },
  "desk-3": { id: "desk-3", x: 512, y: 80, neighbors: ["hallway-center"] },
  "desk-4": { id: "desk-4", x: 608, y: 80, neighbors: ["hallway-center"] },
  "desk-5": { id: "desk-5", x: 320, y: 288, neighbors: ["hallway-center"] },
  "desk-6": { id: "desk-6", x: 416, y: 288, neighbors: ["hallway-center"] },
  "desk-7": { id: "desk-7", x: 512, y: 288, neighbors: ["hallway-center"] },
  "desk-8": { id: "desk-8", x: 608, y: 288, neighbors: ["hallway-center"] },
};

const collisionRects: CollisionRect[] = [
  { id: "desk-bank-top", x: 464, y: 112, width: 360, height: 40 },
  { id: "desk-bank-bottom", x: 464, y: 256, width: 360, height: 40 },
  { id: "watercooler-block", x: 96, y: 104, width: 28, height: 28 },
  { id: "couch-block", x: 104, y: 300, width: 72, height: 28 },
];

export function getCollisionRects() {
  return collisionRects;
}

export function getRouteForZones(fromId: string, toId: string): OfficeNode[] {
  if (fromId === toId) return [nodes[toId]!];

  const queue: string[][] = [[fromId]];
  const seen = new Set<string>([fromId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1]!;

    if (current === toId) {
      return path.map((id) => nodes[id]!);
    }

    for (const neighbor of nodes[current]!.neighbors) {
      if (seen.has(neighbor)) continue;
      seen.add(neighbor);
      queue.push([...path, neighbor]);
    }
  }

  throw new Error(`No office route from ${fromId} to ${toId}`);
}
```

- [ ] **Step 4: Re-run the layout tests**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/game/layout/officeLayout.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the office layout**

```bash
git add office/src/game/layout
git commit -m "feat: define office layout graph"
```

### Task 5: Build The Phaser Scene Shell And Player Controller

**Files:**
- Create: `office/src/game/input/playerMovement.ts`
- Create: `office/src/game/input/playerMovement.test.ts`
- Create: `office/src/game/createOfficeGame.ts`
- Create: `office/src/game/scenes/OfficeScene.ts`
- Modify: `office/src/App.tsx`

- [ ] **Step 1: Write the failing player-movement unit test**

```ts
// office/src/game/input/playerMovement.test.ts
import { describe, expect, it } from "vitest";
import { normalizeVelocity } from "./playerMovement";

describe("normalizeVelocity", () => {
  it("normalizes diagonal input so movement speed stays constant", () => {
    const result = normalizeVelocity({ x: 1, y: 1 }, 120);

    expect(Math.round(result.x)).toBe(85);
    expect(Math.round(result.y)).toBe(85);
  });
});
```

- [ ] **Step 2: Run the movement test to verify it fails**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/game/input/playerMovement.test.ts
```

Expected: FAIL with missing `normalizeVelocity`.

- [ ] **Step 3: Implement the player helper and the initial scene**

```ts
// office/src/game/input/playerMovement.ts
export function normalizeVelocity(input: { x: number; y: number }, speed: number) {
  const length = Math.hypot(input.x, input.y) || 1;

  return {
    x: (input.x / length) * speed,
    y: (input.y / length) * speed,
  };
}
```

```ts
// office/src/game/scenes/OfficeScene.ts
import Phaser from "phaser";
import { normalizeVelocity } from "@/game/input/playerMovement";
import { getCollisionRects } from "@/game/layout/officeLayout";

export class OfficeScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private player!: Phaser.Physics.Arcade.Sprite;
  private onInteractAgent: (agentId: string) => void;

  constructor(onInteractAgent: (agentId: string) => void = () => {}) {
    super("office");
    this.onInteractAgent = onInteractAgent;
  }

  private drawOfficeAnchors() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xe7d7b7, 1);
    graphics.fillRect(0, 0, 768, 384);

    graphics.fillStyle(0xb45309, 1);
    graphics.fillRoundedRect(286, 56, 68, 28, 6);
    graphics.fillRoundedRect(382, 56, 68, 28, 6);
    graphics.fillRoundedRect(478, 56, 68, 28, 6);
    graphics.fillRoundedRect(574, 56, 68, 28, 6);
    graphics.fillRoundedRect(286, 264, 68, 28, 6);
    graphics.fillRoundedRect(382, 264, 68, 28, 6);
    graphics.fillRoundedRect(478, 264, 68, 28, 6);
    graphics.fillRoundedRect(574, 264, 68, 28, 6);

    graphics.fillStyle(0x1d4ed8, 1);
    graphics.fillRect(84, 84, 20, 34);

    graphics.fillStyle(0x7c3aed, 1);
    graphics.fillRoundedRect(72, 286, 104, 34, 10);

    graphics.fillStyle(0x0f766e, 1);
    graphics.fillRoundedRect(208, 108, 56, 36, 10);
  }

  create() {
    this.drawOfficeAnchors();

    const graphics = this.add.graphics();
    graphics.fillStyle(0x0f172a, 1);
    graphics.fillRect(0, 0, 12, 16);
    graphics.generateTexture("__player", 12, 16);
    graphics.destroy();

    this.player = this.physics.add.sprite(64, 192, "__player");
    this.player.setCollideWorldBounds(true);

    this.physics.world.setBounds(0, 0, 768, 384);
    const collisionGroup = this.physics.add.staticGroup();

    for (const rect of getCollisionRects()) {
      const body = this.add.rectangle(rect.x, rect.y, rect.width, rect.height, 0x000000, 0);
      this.physics.add.existing(body, true);
      collisionGroup.add(body);
    }

    this.physics.add.collider(this.player, collisionGroup);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey("E");
  }

  update() {
    const input = {
      x: (this.cursors.right?.isDown ? 1 : 0) - (this.cursors.left?.isDown ? 1 : 0),
      y: (this.cursors.down?.isDown ? 1 : 0) - (this.cursors.up?.isDown ? 1 : 0),
    };

    const velocity = normalizeVelocity(input, 120);
    this.player.setVelocity(velocity.x, velocity.y);

  }
}
```

```ts
// office/src/game/createOfficeGame.ts
import Phaser from "phaser";
import { OfficeScene } from "./scenes/OfficeScene";

export function createOfficeGame(
  parent: HTMLDivElement,
  callbacks: { onInteractAgent: (agentId: string) => void },
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 768,
    height: 384,
    parent,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [new OfficeScene(callbacks.onInteractAgent)],
  });
}
```

```tsx
// office/src/App.tsx
import { useEffect, useRef, useState } from "react";
import { createOfficeGame } from "@/game/createOfficeGame";

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = createOfficeGame(containerRef.current, {
      onInteractAgent: setSelectedAgentId,
    });

    return () => game.destroy(true);
  }, []);

  return (
    <main className="office-app">
      <header className="office-header">
        <h1>Paperclip Office</h1>
        <button type="button">View in Tracker</button>
      </header>
      <div ref={containerRef} className="office-stage" />
    </main>
  );
}
```

- [ ] **Step 4: Re-run the movement test and manual smoke check**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/game/input/playerMovement.test.ts
pnpm --filter @paperclipai/office dev
```

Expected:
- the movement test passes
- `http://localhost:3200` shows a readable office with visible desk banks, a water cooler, a couch, and a chat nook
- the movable player square collides with desk and couch obstacles

- [ ] **Step 5: Commit the scene shell**

```bash
git add office/src/game office/src/App.tsx
git commit -m "feat: add office scene shell"
```

### Task 6: Render Paperclip Agents With Deterministic Routes And Talk Bubbles

**Files:**
- Create: `office/src/game/actors/AgentActor.ts`
- Create: `office/src/game/actors/TalkBubble.ts`
- Create: `office/src/ui/components/AgentDialog.test.tsx`
- Modify: `office/src/game/scenes/OfficeScene.ts`
- Modify: `office/src/App.tsx`

- [ ] **Step 1: Write a failing test for the agent dialog shell render**

```tsx
// office/src/ui/components/AgentDialog.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentDialog } from "./AgentDialog";

describe("AgentDialog", () => {
  it("renders the selected agent summary and actions", () => {
    render(
      <AgentDialog
        open
        agent={{
          agentId: "a1",
          name: "CEO",
          status: "idle",
          targetZone: "watercooler",
          issue: { id: "i1", title: "Ship demo", status: "todo" },
          intent: { mode: "idle", targetZone: "watercooler", startedAt: 0 },
          latestSnippet: "Waiting for assignment.",
          talkingWith: null,
        }}
        onClose={() => {}}
        onPauseToggle={() => {}}
        onFire={() => {}}
        onChat={() => {}}
        onOpenTicket={() => {}}
        onOpenTracker={() => {}}
      />,
    );

    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("Ship demo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chat/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the dialog test so it fails before wiring sprites**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/ui/components/AgentDialog.test.tsx
```

Expected: FAIL with missing `AgentDialog`.

- [ ] **Step 3: Add agent sprites, zone routing, and the shared talk bubble**

```ts
// office/src/game/actors/AgentActor.ts
import Phaser from "phaser";
import type { OfficeAgentView } from "@/types/office";
import { getRouteForZones } from "@/game/layout/officeLayout";

export class AgentActor {
  readonly agentId: string;
  readonly sprite: Phaser.GameObjects.Rectangle;
  private zoneId: string;

  constructor(scene: Phaser.Scene, agentId: string, x: number, y: number, zoneId: string) {
    this.agentId = agentId;
    this.zoneId = zoneId;
    this.sprite = scene.add.rectangle(x, y, 14, 18, 0x2563eb).setOrigin(0.5, 1);
  }

  sync(view: OfficeAgentView) {
    if (view.intent.mode === "terminated") {
      this.sprite.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        angle: 18,
        duration: 450,
        onComplete: () => this.sprite.destroy(),
      });
      return;
    }

    this.sprite.setFillStyle(
      view.intent.mode === "needs_attention" ? 0xdc2626 : view.intent.mode === "paused_asleep" ? 0x7c3aed : 0x2563eb,
    );

    if (view.intent.targetZone === this.zoneId) return;

    const route = getRouteForZones(this.zoneId, view.intent.targetZone);
    const destination = route.at(-1)!;

    this.sprite.scene.tweens.add({
      targets: this.sprite,
      x: destination.x,
      y: destination.y,
      duration: 800,
      ease: "Sine.InOut",
    });

    this.zoneId = destination.id;
  }
}
```

```ts
// office/src/game/actors/TalkBubble.ts
import Phaser from "phaser";

export class TalkBubble {
  private bubble: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.bubble = scene.add.text(0, 0, "…", {
      color: "#111827",
      backgroundColor: "#fef3c7",
      padding: { x: 4, y: 2 },
    });
    this.bubble.setVisible(false);
  }

  placeBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    this.bubble.setPosition((a.x + b.x) / 2, Math.min(a.y, b.y) - 24);
    this.bubble.setVisible(true);
  }

  hide() {
    this.bubble.setVisible(false);
  }
}
```

```ts
// office/src/game/scenes/OfficeScene.ts (agent sync excerpt)
import type { OfficeAgentView } from "@/types/office";
import { AgentActor } from "@/game/actors/AgentActor";
import { TalkBubble } from "@/game/actors/TalkBubble";

export class OfficeScene extends Phaser.Scene {
  private agents = new Map<string, AgentActor>();
  private talkBubble: TalkBubble | null = null;

  syncAgents(views: OfficeAgentView[]) {
    this.talkBubble ??= new TalkBubble(this);

    for (const [id, actor] of this.agents) {
      if (!views.some((view) => view.agentId === id)) {
        actor.sprite.destroy();
        this.agents.delete(id);
      }
    }

    for (const view of views) {
      const actor =
        this.agents.get(view.agentId) ??
        new AgentActor(this, view.agentId, 96, 96, "watercooler");

      actor.sync(view);
      this.agents.set(view.agentId, actor);
    }

    const talkingPair = views.find((view) => view.talkingWith);
    if (!talkingPair) {
      this.talkBubble.hide();
      return;
    }

    const left = this.agents.get(talkingPair.agentId);
    const right = this.agents.get(talkingPair.talkingWith!);

    if (!left || !right) {
      this.talkBubble.hide();
      return;
    }

    this.talkBubble.placeBetween(left.sprite, right.sprite);
  }

  update() {
    const input = {
      x: (this.cursors.right?.isDown ? 1 : 0) - (this.cursors.left?.isDown ? 1 : 0),
      y: (this.cursors.down?.isDown ? 1 : 0) - (this.cursors.up?.isDown ? 1 : 0),
    };
    const velocity = normalizeVelocity(input, 120);
    this.player.setVelocity(velocity.x, velocity.y);

    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return;

    let nearest: AgentActor | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const actor of this.agents.values()) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        actor.sprite.x,
        actor.sprite.y,
      );

      if (distance < nearestDistance) {
        nearest = actor;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= 32) {
      this.onInteractAgent(nearest.agentId);
    }
  }
}
```

```tsx
// office/src/App.tsx (snapshot wiring excerpt)
import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";
import { createOfficeGame } from "@/game/createOfficeGame";
import { OfficeScene } from "@/game/scenes/OfficeScene";
import { useOfficeWorldData } from "@/hooks/useOfficeWorldData";
import { deriveOfficeAgents } from "@/lib/world-state";
import type { OfficeAgentView } from "@/types/office";

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const previousViewsRef = useRef(new Map<string, OfficeAgentView>());
  const { data } = useOfficeWorldData();

  const officeAgents = useMemo(() => {
    if (!data) return [];

    const nextViews = deriveOfficeAgents({
      agents: data.agents,
      issues: data.issues,
      approvals: data.approvals,
      activity: data.activity,
      previous: previousViewsRef.current,
      now: Date.now(),
    });
    previousViewsRef.current = new Map(nextViews.map((view) => [view.agentId, view]));
    return nextViews;
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = createOfficeGame(containerRef.current, {
      onInteractAgent: setSelectedAgentId,
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene("office") as OfficeScene | undefined;
    scene?.syncAgents(officeAgents);
  }, [officeAgents]);

  return <div ref={containerRef} className="office-stage" />;
}
```

- [ ] **Step 4: Re-run the dialog test and smoke check the moving agents**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/ui/components/AgentDialog.test.tsx
pnpm --filter @paperclipai/office dev
```

Expected:
- `AgentDialog.test.tsx` still fails until Task 7 adds the component
- the office scene now renders agents from snapshot data and they tween between watercooler, couch, chat-nook, and desks with a shared bubble when a talking pair is inferred

- [ ] **Step 5: Commit the agent rendering layer**

```bash
git add office/src/game/actors office/src/game/scenes/OfficeScene.ts office/src/App.tsx
git commit -m "feat: render office agents"
```

### Task 7: Build The Native Overlay UI, Action Inbox, And Tracker Links

**Files:**
- Create: `office/src/lib/action-inbox.ts`
- Create: `office/src/lib/action-inbox.test.ts`
- Create: `office/src/lib/tracker-links.ts`
- Create: `office/src/lib/tracker-links.test.ts`
- Create: `office/src/ui/OfficeShell.tsx`
- Create: `office/src/ui/components/TrackerButton.tsx`
- Create: `office/src/ui/components/ActionInboxDialog.tsx`
- Create: `office/src/ui/components/AgentDialog.tsx`
- Modify: `office/src/App.tsx`

- [ ] **Step 1: Write failing tests for the action inbox, tracker links, and the agent dialog**

```ts
// office/src/lib/action-inbox.test.ts
import { describe, expect, it } from "vitest";
import { buildActionInboxItems } from "./action-inbox";

describe("buildActionInboxItems", () => {
  it("queues approvals and mentions in a deterministic order", () => {
    const items = buildActionInboxItems({
      approvals: [{ id: "approval-1", type: "hire", status: "pending" }],
      activity: [
        {
          id: "evt-1",
          action: "commented",
          entityType: "issue",
          entityId: "issue-1",
          createdAt: "2026-04-22T10:05:00.000Z",
          details: { body: "@CEO please review the spec." },
        },
      ],
      issues: [{ id: "issue-1", identifier: "ACME-10", title: "Review the spec", status: "blocked" }],
    });

    expect(items.map((item) => item.id)).toEqual(["approval-1", "evt-1"]);
  });
});
```

```ts
// office/src/lib/tracker-links.test.ts
import { describe, expect, it } from "vitest";
import {
  buildAgentTrackerUrl,
  buildApprovalTrackerUrl,
  buildIssueTrackerUrl,
  resolveTrackerOrigin,
} from "./tracker-links";

describe("buildIssueTrackerUrl", () => {
  it("builds the same issue route shape Paperclip uses in its UI", () => {
    expect(buildIssueTrackerUrl("https://tracker.example", { id: "issue-1", identifier: "ACME-42" })).toBe(
      "https://tracker.example/issues/ACME-42",
    );
  });

  it("builds the same agent route shape Paperclip uses in its UI", () => {
    expect(buildAgentTrackerUrl("https://tracker.example", { id: "agent-1", urlKey: "ceo-agent-1" })).toBe(
      "https://tracker.example/agents/ceo-agent-1",
    );
  });

  it("builds the approval route used by the tracker", () => {
    expect(buildApprovalTrackerUrl("https://tracker.example", { id: "approval-1" })).toBe(
      "https://tracker.example/approvals/approval-1",
    );
  });

  it("uses the current origin for tracker links and allows an explicit override during separate-port dev", () => {
    expect(resolveTrackerOrigin("https://tracker.example", undefined)).toBe("https://tracker.example");
    expect(resolveTrackerOrigin("http://localhost:3200", "http://localhost:3100")).toBe("http://localhost:3100");
  });
});
```

```tsx
// office/src/ui/components/AgentDialog.tsx
import type { OfficeAgentView } from "@/types/office";

interface AgentDialogProps {
  open: boolean;
  agent: OfficeAgentView | null;
  onClose: () => void;
  onPauseToggle: () => void;
  onFire: () => void;
  onChat: (body: string) => void;
  onOpenTicket: () => void;
  onOpenTracker: () => void;
}

export function AgentDialog({ open, agent }: AgentDialogProps) {
  if (!open || !agent) return null;
  return <div>{agent.name}</div>;
}
```

- [ ] **Step 2: Run the dialog and tracker tests to verify they fail**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/lib/action-inbox.test.ts src/lib/tracker-links.test.ts src/ui/components/AgentDialog.test.tsx
```

Expected: FAIL with missing `buildActionInboxItems`, incomplete `AgentDialog`, and missing tracker helper exports.

- [ ] **Step 3: Implement the tracker URLs and native overlay**

```ts
// office/src/lib/action-inbox.ts
import type { ActionInboxItem, ActivityEvent, Approval, Issue } from "@/types/office";

export function buildActionInboxItems(input: {
  approvals: Approval[];
  activity: ActivityEvent[];
  issues: Issue[];
}): ActionInboxItem[] {
  const items: ActionInboxItem[] = [];

  for (const approval of input.approvals) {
    if (approval.status !== "pending") continue;

    items.push({
      id: approval.id,
      kind: "approval",
      title: "Approval requested",
      body: `Pending ${approval.type} approval`,
      createdAt: approval.createdAt,
      approvalId: approval.id,
    });
  }

  for (const event of input.activity) {
    const body = event.details?.body;
    if (typeof body !== "string" || !/@CEO\b/i.test(body)) continue;

    items.push({
      id: event.id,
      kind: "mention",
      title: "You were tagged",
      body,
      createdAt: event.createdAt,
      issueId: event.entityType === "issue" ? event.entityId : null,
    });
  }

  return items.sort((left, right) => {
    const leftStamp = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightStamp = right.createdAt ? Date.parse(right.createdAt) : 0;
    return leftStamp - rightStamp || left.id.localeCompare(right.id);
  });
}
```

```ts
// office/src/lib/tracker-links.ts
import { deriveAgentUrlKey } from "@paperclipai/shared";

export function resolveTrackerOrigin(locationOrigin: string, explicitOrigin?: string) {
  return explicitOrigin && explicitOrigin.length > 0 ? explicitOrigin : locationOrigin;
}

export function buildIssueTrackerUrl(
  trackerOrigin: string,
  issue: { id: string; identifier?: string | null },
) {
  return new URL(`/issues/${issue.identifier ?? issue.id}`, trackerOrigin).toString();
}

export function buildAgentTrackerUrl(
  trackerOrigin: string,
  agent: { id: string; urlKey?: string | null; name?: string | null },
) {
  const routeRef = agent.urlKey ?? deriveAgentUrlKey(agent.name, agent.id);
  return new URL(`/agents/${routeRef}`, trackerOrigin).toString();
}

export function buildApprovalTrackerUrl(trackerOrigin: string, approval: { id: string }) {
  return new URL(`/approvals/${approval.id}`, trackerOrigin).toString();
}
```

```tsx
// office/src/ui/components/ActionInboxDialog.tsx
import type { ActionInboxItem } from "@/types/office";

export function ActionInboxDialog(props: {
  item: ActionInboxItem | null;
  queuedCount: number;
  onApprove: () => void;
  onOpenContext: () => void;
  onDismiss: () => void;
}) {
  if (!props.item) return null;

  return (
    <aside className="action-inbox-dialog">
      <header>
        <h2>{props.item.title}</h2>
        <p>{props.queuedCount > 0 ? `${props.queuedCount} more waiting` : "No other pending actions"}</p>
      </header>

      <p>{props.item.body}</p>

      <div className="action-inbox-dialog__actions">
        {props.item.kind === "approval" ? (
          <button type="button" onClick={props.onApprove}>Approve</button>
        ) : null}
        <button type="button" onClick={props.onOpenContext}>Open Context</button>
        <button type="button" onClick={props.onDismiss}>Next</button>
      </div>
    </aside>
  );
}
```

```tsx
// office/src/ui/components/AgentDialog.tsx
import { useState } from "react";
import type { OfficeAgentView } from "@/types/office";

export function AgentDialog(props: {
  open: boolean;
  agent: OfficeAgentView | null;
  onClose: () => void;
  onPauseToggle: () => void;
  onFire: () => void;
  onChat: (body: string) => void;
  onOpenTicket: () => void;
  onOpenTracker: () => void;
}) {
  const [draft, setDraft] = useState("");

  if (!props.open || !props.agent) return null;

  return (
    <aside className="agent-dialog">
      <header>
        <h2>{props.agent.name}</h2>
        <p>{props.agent.status}</p>
      </header>

      <section>
        <h3>Current task</h3>
        <p>{props.agent.issue?.title ?? "No active task"}</p>
        <p>{props.agent.latestSnippet ?? "No recent updates yet."}</p>
      </section>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Leave feedback for this agent…"
      />

      <div className="agent-dialog__actions">
        <button type="button" onClick={() => props.onChat(draft)}>Chat</button>
        <button type="button" onClick={props.onPauseToggle}>Pause/Resume</button>
        <button type="button" onClick={props.onOpenTicket}>Open Ticket</button>
        <button type="button" onClick={props.onOpenTracker}>Open In Tracker</button>
        <button type="button" onClick={props.onFire}>Fire</button>
      </div>
    </aside>
  );
}
```

```tsx
// office/src/ui/components/TrackerButton.tsx
export function TrackerButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="tracker-button" onClick={onClick}>
      View in Tracker
    </button>
  );
}
```

```tsx
// office/src/ui/OfficeShell.tsx
import type { ActionInboxItem, OfficeAgentView } from "@/types/office";
import { AgentDialog } from "./components/AgentDialog";
import { ActionInboxDialog } from "./components/ActionInboxDialog";
import { TrackerButton } from "./components/TrackerButton";

export function OfficeShell(props: {
  currentAction: ActionInboxItem | null;
  queuedActionCount: number;
  selectedAgent: OfficeAgentView | null;
  onOpenHire: () => void;
  onOpenTrackerHome: () => void;
  onApproveAction: () => void;
  onOpenActionContext: () => void;
  onDismissAction: () => void;
  onPauseToggle: () => void;
  onFire: () => void;
  onChat: (body: string) => void;
  onOpenTicket: () => void;
  onOpenAgentTracker: () => void;
}) {
  return (
    <>
      <header className="office-header">
        <h1>Paperclip Office</h1>
        <div className="office-header__actions">
          <button type="button" onClick={props.onOpenHire}>Hire Agent</button>
          <TrackerButton onClick={props.onOpenTrackerHome} />
        </div>
      </header>

      <ActionInboxDialog
        item={props.currentAction}
        queuedCount={props.queuedActionCount}
        onApprove={props.onApproveAction}
        onOpenContext={props.onOpenActionContext}
        onDismiss={props.onDismissAction}
      />

      <AgentDialog
        open={!!props.selectedAgent}
        agent={props.selectedAgent}
        onClose={() => {}}
        onPauseToggle={props.onPauseToggle}
        onFire={props.onFire}
        onChat={props.onChat}
        onOpenTicket={props.onOpenTicket}
        onOpenTracker={props.onOpenAgentTracker}
      />
    </>
  );
}
```

```tsx
// office/src/App.tsx (overlay excerpt)
import { buildActionInboxItems } from "@/lib/action-inbox";
import { OfficeShell } from "@/ui/OfficeShell";
import { createOfficeActions } from "@/ui/useOfficeActions";
import {
  buildAgentTrackerUrl,
  buildApprovalTrackerUrl,
  buildIssueTrackerUrl,
  resolveTrackerOrigin,
} from "@/lib/tracker-links";

const actions = createOfficeActions();
const selectedAgent = officeAgents.find((agent) => agent.agentId === selectedAgentId) ?? null;
const [dismissedActionIds, setDismissedActionIds] = useState<string[]>([]);
const trackerOrigin = resolveTrackerOrigin(
  window.location.origin,
  import.meta.env.VITE_TRACKER_ORIGIN,
);
const actionQueue = data
  ? buildActionInboxItems({
      approvals: data.approvals,
      activity: data.activity,
      issues: data.issues,
    }).filter((item) => !dismissedActionIds.includes(item.id))
  : [];
const currentAction = actionQueue[0] ?? null;
const queuedActionCount = Math.max(actionQueue.length - 1, 0);

async function handlePauseToggle() {
  if (!selectedAgent) return;
  if (selectedAgent.status === "paused") {
    await actions.resume(selectedAgent.agentId);
    return;
  }
  await actions.pause(selectedAgent.agentId);
}

async function handleFire() {
  if (!selectedAgent) return;
  await actions.fire(selectedAgent.agentId);
}

async function handleChat(body: string) {
  if (!selectedAgent?.issue?.id || !body.trim()) return;
  await actions.chat(selectedAgent.issue.id, body);
}

function handleOpenTicket() {
  if (!selectedAgent?.issue) return;
  window.open(
    buildIssueTrackerUrl(trackerOrigin, selectedAgent.issue),
    "_blank",
    "noopener,noreferrer",
  );
}

function handleOpenTrackerHome() {
  window.open(trackerOrigin, "_blank", "noopener,noreferrer");
}

function handleOpenAgentTracker() {
  if (!selectedAgent) return;
  window.open(
    buildAgentTrackerUrl(trackerOrigin, {
      id: selectedAgent.agentId,
      name: selectedAgent.name,
    }),
    "_blank",
    "noopener,noreferrer",
  );
}

function handleDismissAction() {
  if (!currentAction) return;
  setDismissedActionIds((items) => [...items, currentAction.id]);
}

function handleOpenActionContext() {
  if (!currentAction) return;
  if (currentAction.issueId) {
    window.open(
      buildIssueTrackerUrl(trackerOrigin, { id: currentAction.issueId }),
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  if (currentAction.approvalId) {
    window.open(
      buildApprovalTrackerUrl(trackerOrigin, { id: currentAction.approvalId }),
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  window.open(trackerOrigin, "_blank", "noopener,noreferrer");
}

return (
  <main className="office-app">
    <div ref={containerRef} className="office-stage" />
    <OfficeShell
      currentAction={currentAction}
      queuedActionCount={queuedActionCount}
      selectedAgent={selectedAgent}
      onOpenHire={() => undefined}
      onOpenTrackerHome={handleOpenTrackerHome}
      onApproveAction={() => undefined}
      onOpenActionContext={handleOpenActionContext}
      onDismissAction={handleDismissAction}
      onPauseToggle={handlePauseToggle}
      onFire={handleFire}
      onChat={handleChat}
      onOpenTicket={handleOpenTicket}
      onOpenAgentTracker={handleOpenAgentTracker}
    />
  </main>
);
```

- [ ] **Step 4: Re-run the overlay tests**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/lib/action-inbox.test.ts src/lib/tracker-links.test.ts src/ui/components/AgentDialog.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit the overlay UI**

```bash
git add office/src/lib/tracker-links.ts office/src/lib/tracker-links.test.ts office/src/ui office/src/App.tsx
git commit -m "feat: add office overlay ui"
```

### Task 8: Wire Chat, Hire, Pause/Resume, Fire, And The Tracker Escape Hatch

**Files:**
- Create: `office/src/ui/components/HireModal.tsx`
- Create: `office/src/ui/useOfficeActions.ts`
- Create: `office/src/ui/useOfficeActions.test.ts`
- Modify: `office/src/App.tsx`
- Modify: `ui/src/App.tsx`
- Create: `ui/src/pages/OfficeShortcut.tsx`

- [ ] **Step 1: Write failing tests for the action controller**

```ts
// office/src/ui/useOfficeActions.test.ts
import { describe, expect, it, vi } from "vitest";
import { createOfficeActions } from "./useOfficeActions";

describe("createOfficeActions", () => {
  it("submits chat, hire approval, and fire actions through the API", async () => {
    const api = {
      addIssueComment: vi.fn().mockResolvedValue({}),
      createHire: vi.fn().mockResolvedValue({ approval: { id: "approval-1" } }),
      approveHire: vi.fn().mockResolvedValue({}),
      terminateAgent: vi.fn().mockResolvedValue({}),
      pauseAgent: vi.fn().mockResolvedValue({}),
      resumeAgent: vi.fn().mockResolvedValue({}),
    };

    const actions = createOfficeActions(api as never);

    await actions.chat("issue-1", "Need progress.");
    await actions.approve("approval-2");
    await actions.hireAndApprove("company-1", { name: "Researcher" });
    await actions.fire("agent-1");

    expect(api.addIssueComment).toHaveBeenCalledWith("issue-1", "Need progress.");
    expect(api.approveHire).toHaveBeenCalledWith("approval-2", "Approved in office.");
    expect(api.approveHire).toHaveBeenCalledWith("approval-1", "Approved in office.");
    expect(api.terminateAgent).toHaveBeenCalledWith("agent-1");
  });
});
```

- [ ] **Step 2: Run the action-controller tests to verify they fail**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/ui/useOfficeActions.test.ts
```

Expected: FAIL with missing `createOfficeActions`.

- [ ] **Step 3: Implement the action controller and wire it into the UI**

```ts
// office/src/ui/useOfficeActions.ts
import { paperclipApi } from "@/api/paperclip";

export function createOfficeActions(api = paperclipApi) {
  return {
    chat(issueId: string, body: string) {
      return api.addIssueComment(issueId, body);
    },

    approve(approvalId: string) {
      return api.approveHire(approvalId, "Approved in office.");
    },

    async hireAndApprove(companyId: string, payload: Record<string, unknown>) {
      const result = await api.createHire(companyId, payload);

      if ((result as { approval?: { id: string } | null }).approval?.id) {
        await api.approveHire((result as { approval: { id: string } }).approval.id, "Approved in office.");
      }

      return result;
    },

    pause(agentId: string) {
      return api.pauseAgent(agentId);
    },

    resume(agentId: string) {
      return api.resumeAgent(agentId);
    },

    fire(agentId: string) {
      return api.terminateAgent(agentId);
    },
  };
}
```

```tsx
// office/src/ui/components/HireModal.tsx
import { useState } from "react";

export function HireModal(props: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; role: string; capabilities: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("engineer");
  const [capabilities, setCapabilities] = useState("");

  if (!props.open) return null;

  return (
    <div className="hire-modal">
      <h2>Hire Agent</h2>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Agent name" />
      <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Role" />
      <textarea value={capabilities} onChange={(event) => setCapabilities(event.target.value)} placeholder="Capabilities" />
      <button
        type="button"
        onClick={() => props.onSubmit({ name, role, capabilities })}
      >
        Create and Approve
      </button>
    </div>
  );
}
```

```tsx
// office/src/App.tsx (hire flow excerpt)
import { HireModal } from "@/ui/components/HireModal";

const [hireModalOpen, setHireModalOpen] = useState(false);

async function handleHire(payload: { name: string; role: string; capabilities: string }) {
  if (!data?.company.id) return;
  await actions.hireAndApprove(data.company.id, payload);
  setHireModalOpen(false);
}

async function handleApproveAction() {
  if (!currentAction?.approvalId) return;
  await actions.approve(currentAction.approvalId);
  setDismissedActionIds((items) => [...items, currentAction.id]);
}
```

```tsx
// ui/src/App.tsx (route excerpt)
import { OfficeShortcutPage } from "./pages/OfficeShortcut";

// inside boardRoutes()
<Route path="/office" element={<OfficeShortcutPage />} />
```

```tsx
// ui/src/pages/OfficeShortcut.tsx
import { useEffect } from "react";

export function OfficeShortcutPage() {
  useEffect(() => {
    const officeUrl = import.meta.env.VITE_OFFICE_URL;
    if (!officeUrl) return;
    window.location.href = officeUrl;
  }, []);

  if (!import.meta.env.VITE_OFFICE_URL) {
    return <div>Office URL is not configured.</div>;
  }

  return <div>Opening office…</div>;
}
```

```tsx
// office/src/App.tsx (render excerpt)
return (
  <main className="office-app">
    <div ref={containerRef} className="office-stage" />
    <OfficeShell
      currentAction={currentAction}
      queuedActionCount={queuedActionCount}
      selectedAgent={selectedAgent}
      onOpenHire={() => setHireModalOpen(true)}
      onOpenTrackerHome={handleOpenTrackerHome}
      onApproveAction={handleApproveAction}
      onOpenActionContext={handleOpenActionContext}
      onDismissAction={handleDismissAction}
      onPauseToggle={handlePauseToggle}
      onFire={handleFire}
      onChat={handleChat}
      onOpenTicket={handleOpenTicket}
      onOpenAgentTracker={handleOpenAgentTracker}
    />
    <HireModal
      open={hireModalOpen}
      onClose={() => setHireModalOpen(false)}
      onSubmit={handleHire}
    />
  </main>
);
```

- [ ] **Step 4: Re-run the action tests and manually verify the full loop**

Run:

```bash
pnpm --filter @paperclipai/office exec vitest run src/ui/useOfficeActions.test.ts
pnpm dev
pnpm dev:office
```

Expected:
- the action-controller tests pass
- from the office UI, `Chat`, `Pause/Resume`, `Fire`, and `Create and Approve` all trigger real Paperclip mutations
- the `Hire Agent` button is always available in the office header and opens the modal from any office state
- approvals and mentions appear in the action inbox queue and advance one-by-one after `Approve` or `Next`

- [ ] **Step 5: Commit the action wiring**

```bash
git add office/src/ui office/src/App.tsx ui/src/App.tsx ui/src/pages/OfficeShortcut.tsx
git commit -m "feat: wire office actions to paperclip"
```

### Task 9: Finalize Docs, Attribution, And Smoke Verification

**Files:**
- Modify: `README.md`
- Create: `office/README.md`
- Create: `ATTRIBUTION.md`

- [ ] **Step 1: Add the README runbook and asset attribution docs**

```md
<!-- office/README.md -->
# Paperclip Office

## Run locally

1. Start Paperclip:
   `pnpm dev`
2. Start the office app:
   `pnpm dev:office`
3. Open `http://localhost:3200`

If the office app runs on a different origin from Paperclip during local dev, set:

- `office/.env.local`: `VITE_TRACKER_ORIGIN=http://localhost:3100`
- `ui/.env.local`: `VITE_OFFICE_URL=http://localhost:3200`

## Demo checklist

- move the boss avatar with arrow keys
- press `E` near an agent to open the dialog
- review queued approvals and mentions one after another in the action inbox
- send chat feedback
- pause/resume an agent
- fire an agent
- create and approve a hire
- use `View in Tracker` to open Paperclip
```

```md
<!-- ATTRIBUTION.md -->
# Attribution

This project borrows visual inspiration, assets, and interaction ideas from:

- `paperclipai/paperclip` (MIT)
- `geezerrrr/agent-town`
- `pablodelucca/pixel-agents`
- `a16z-infra/ai-town`
- WorkAdventure documentation

Before shipping third-party sprites, list the exact source file paths, license text, and any modifications here.
```

- [ ] **Step 2: Add a final smoke checklist to the root README**

```md
<!-- README.md excerpt -->
## Paperclip Office Demo

Run both apps:

`pnpm dev`

`pnpm dev:office`

Then open `http://localhost:3200` and verify:

- player movement and collisions work
- agents snap to watercooler, couch, or desks based on Paperclip state
- the hire modal opens from the header at any time
- pending approvals and `@CEO` mentions appear in the action inbox queue
- `E` opens the agent dialog
- `View in Tracker` opens Paperclip in a new tab
```

- [ ] **Step 3: Run the complete verification set**

Run:

```bash
pnpm test:office
pnpm --filter @paperclipai/office build
pnpm typecheck
```

Expected:
- all office tests pass
- office production build succeeds
- monorepo typecheck stays green

- [ ] **Step 4: Perform the live demo smoke run**

Run:

```bash
pnpm dev
pnpm dev:office
```

Manual expected behavior:
- the boss moves with keyboard input
- agents visibly occupy the watercooler, couch, or desks
- the action inbox shows queued approvals and mentions one by one
- when you select an agent, the in-world dialog shows status and current task
- chat feedback creates a Paperclip comment
- hire creates and approves a Paperclip hire request, then the new agent appears at spawn
- fire terminates the agent and removes them after the animation

- [ ] **Step 5: Commit the docs and verification updates**

```bash
git add README.md office/README.md ATTRIBUTION.md
git commit -m "docs: add office runbook and attribution"
```

## Self-Review

### Spec coverage

- Keyboard movement and obstacle collisions: Tasks 4 and 5
- Agent status projection, stable desk placement, watercooler/couch/desks, and visual-intent smoothing: Tasks 3, 4, and 6
- Symbolic shared speech bubble and talking-state inference: Tasks 3 and 6
- Native in-world dialog with shallow data plus latest snippet: Tasks 3 and 7
- Boss-required approvals and mention dialogs with sequential queueing: Tasks 7 and 8
- Chat via Paperclip comments: Task 8
- Hire popup with real approval flow and always-available trigger: Tasks 7 and 8
- Fire flow with visual removal: Task 8
- `View in Tracker` top-right button and tracker escape hatch: Tasks 7 and 8
- Attribution and borrowed-asset documentation: Task 9

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain in the tasks.
- Every code-bearing step includes concrete file paths and code blocks.
- Every run step includes exact commands and expected outcomes.

### Type consistency

- `OfficeAgentView`, `OfficeIntent`, `OfficeSnapshot`, and `ActionInboxItem` are introduced before later tasks reference them.
- Tracker link builders consistently take `(trackerOrigin, entity)`.
- Action-controller method names match the later UI calls: `chat`, `approve`, `hireAndApprove`, `pause`, `resume`, `fire`.
