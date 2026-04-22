import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { OfficeAgentView } from "@/types/office";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDialog } from "./AgentDialog";

function makeAgentView(overrides: Partial<OfficeAgentView> = {}): OfficeAgentView {
  return {
    agentId: overrides.agentId ?? "a1",
    name: overrides.name ?? "CEO",
    status: overrides.status ?? "idle",
    targetZone: overrides.targetZone ?? "watercooler",
    issue: overrides.issue ?? ({
      id: "i1",
      title: "Ship demo",
      status: "todo",
      identifier: "ACME-22",
    } as OfficeAgentView["issue"]),
    intent: overrides.intent ?? { mode: "idle", targetZone: "watercooler", startedAt: 0 },
    latestSnippet: overrides.latestSnippet ?? "Waiting for assignment.",
    talkingWith: overrides.talkingWith ?? null,
  };
}

describe("AgentDialog", () => {
  afterEach(() => cleanup());

  it("renders the selected agent summary and actions", () => {
    render(
      <AgentDialog
        open
        agent={makeAgentView()}
        onClose={vi.fn()}
        onPauseToggle={vi.fn()}
        onFire={vi.fn()}
        onChat={vi.fn()}
        onOpenTicket={vi.fn()}
        onOpenTracker={vi.fn()}
      />,
    );

    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("Ship demo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send note/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pause agent/i })).toBeInTheDocument();
  });

  it("submits a note and exposes tracker actions for the selected agent", async () => {
    const onChat = vi.fn();
    const onOpenTicket = vi.fn();
    const onOpenTracker = vi.fn();

    render(
      <AgentDialog
        open
        agent={makeAgentView({ status: "paused" })}
        onClose={vi.fn()}
        onPauseToggle={vi.fn()}
        onFire={vi.fn()}
        onChat={onChat}
        onOpenTicket={onOpenTicket}
        onOpenTracker={onOpenTracker}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /message agent/i }), {
      target: { value: "Please unblock launch." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send note/i }));
    fireEvent.click(screen.getByRole("button", { name: /open ticket/i }));
    fireEvent.click(screen.getByRole("button", { name: /open in tracker/i }));

    expect(onChat).toHaveBeenCalledWith("Please unblock launch.");
    expect(onOpenTicket).toHaveBeenCalledTimes(1);
    expect(onOpenTracker).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /resume agent/i })).toBeInTheDocument();
  });
});
