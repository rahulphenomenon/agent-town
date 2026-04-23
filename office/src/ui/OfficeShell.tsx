import type { ReactNode } from "react";
import type { ActionInboxItem, OfficeAgentView } from "@/types/office";
import { ActionInboxDialog } from "./components/ActionInboxDialog";
import { AgentDialog } from "./components/AgentDialog";
import { TrackerButton } from "./components/TrackerButton";

interface OfficeShellProps {
  companyName: string | null;
  stageStatus: string;
  stageHint: string;
  currentAction: ActionInboxItem | null;
  queuedActionCount: number;
  selectedAgent: OfficeAgentView | null;
  canHire: boolean;
  onOpenHire: () => void;
  onOpenTrackerHome: () => void;
  onApproveAction: () => void;
  onOpenActionContext: () => void;
  onDismissAction: () => void;
  onCloseAgentDialog?: () => void;
  onPauseToggle: () => void;
  onFire: () => void;
  onChat: (body: string) => void;
  onOpenTicket: () => void;
  onOpenAgentTracker: () => void;
  children?: ReactNode;
}

export function OfficeShell({
  companyName,
  stageStatus,
  stageHint,
  currentAction,
  queuedActionCount,
  selectedAgent,
  canHire,
  onOpenHire,
  onOpenTrackerHome,
  onApproveAction,
  onOpenActionContext,
  onDismissAction,
  onCloseAgentDialog,
  onPauseToggle,
  onFire,
  onChat,
  onOpenTicket,
  onOpenAgentTracker,
  children,
}: OfficeShellProps) {
  return (
    <>
      <header className="office-shell">
        <div className="office-brand">
          <p className="office-eyebrow">Paperclip control surface</p>
          <h1>Paperclip Office</h1>
          <p className="office-summary">
            {companyName
              ? `Live office view for ${companyName}. Walk the floor, clear approvals, and jump to the tracker when you need the full audit trail.`
              : "Walk the floor, clear approvals, and jump to the tracker when you need the full audit trail."}
          </p>
        </div>

        <div className="office-shell__actions">
          <button type="button" className="office-button" disabled={!canHire} onClick={onOpenHire}>
            Hire agent
          </button>
          <TrackerButton onClick={onOpenTrackerHome} />
        </div>
      </header>

      <section className="office-stage" aria-label="Office workspace">
        <div className="office-panel">
          <div className="office-panel__hud">
            <span className="office-status">{stageStatus}</span>
            <p>{stageHint}</p>
          </div>

          <div className="office-panel__viewport">
            <div className="office-canvas-mount">{children}</div>

            <div className="office-panel__overlay">
              <ActionInboxDialog
                item={currentAction}
                queuedCount={queuedActionCount}
                onApprove={onApproveAction}
                onOpenContext={onOpenActionContext}
                onDismiss={onDismissAction}
              />

              <AgentDialog
                open={selectedAgent != null}
                agent={selectedAgent}
                onClose={onCloseAgentDialog ?? (() => undefined)}
                onPauseToggle={onPauseToggle}
                onFire={onFire}
                onChat={onChat}
                onOpenTicket={onOpenTicket}
                onOpenTracker={onOpenAgentTracker}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
