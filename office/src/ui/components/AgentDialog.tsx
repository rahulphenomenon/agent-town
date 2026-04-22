import { useEffect, useState } from "react";
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

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function AgentDialog({
  open,
  agent,
  onClose,
  onPauseToggle,
  onFire,
  onChat,
  onOpenTicket,
  onOpenTracker,
}: AgentDialogProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) {
      setDraft("");
      return;
    }

    setDraft("");
  }, [open, agent?.agentId]);

  if (!open || !agent) {
    return null;
  }

  const isPaused = agent.status === "paused";
  const trimmedDraft = draft.trim();
  const issueTitle = agent.issue?.title ?? "No active task";
  const issueReference = agent.issue?.identifier ?? null;

  return (
    <aside
      className="office-dialog office-dialog--agent"
      aria-label={`${agent.name} details`}
    >
      <header className="office-dialog__header">
        <div>
          <p className="office-dialog__eyebrow">Agent</p>
          <h2>{agent.name}</h2>
        </div>
        <div className="office-dialog__header-actions">
          <span className="office-dialog__meta">{statusLabel(agent.status)}</span>
          <button type="button" className="office-button office-button--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <section className="office-dialog__section">
        <h3>Current task</h3>
        <p>{issueTitle}</p>
        {issueReference ? <p>{issueReference}</p> : null}
        <p>{agent.latestSnippet ?? "No recent updates yet."}</p>
      </section>

      <label className="office-dialog__field">
        <span>Message agent</span>
        <textarea
          aria-label="Message agent"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Leave a note for this agent."
          rows={4}
        />
      </label>

      <div className="office-dialog__actions">
        <button
          type="button"
          className="office-button"
          disabled={trimmedDraft.length === 0}
          onClick={() => {
            if (!trimmedDraft) {
              return;
            }

            onChat(trimmedDraft);
            setDraft("");
          }}
        >
          Send note
        </button>
        <button type="button" className="office-button" onClick={onPauseToggle}>
          {isPaused ? "Resume agent" : "Pause agent"}
        </button>
        <button
          type="button"
          className="office-button"
          disabled={!agent.issue}
          onClick={onOpenTicket}
        >
          Open ticket
        </button>
        <button type="button" className="office-button" onClick={onOpenTracker}>
          Open in Tracker
        </button>
        <button type="button" className="office-button office-button--danger" onClick={onFire}>
          Fire agent
        </button>
      </div>
    </aside>
  );
}
