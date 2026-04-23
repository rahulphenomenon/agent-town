import type { ReactNode } from "react";
import type { ActionInboxItem, OfficeAgentView } from "@/types/office";
import { ActionInboxDialog } from "./components/ActionInboxDialog";
import { AgentDialog } from "./components/AgentDialog";
import type { CompanyBoardStaffMember } from "./components/CompanyBoardDialog";
import { CompanyBoardDialog } from "./components/CompanyBoardDialog";
import { SoundButton } from "./components/SoundButton";
import { TrackerButton } from "./components/TrackerButton";

export interface OfficeShellCompanyBoard {
  companyName?: string | null;
  goals: string[];
  staff: CompanyBoardStaffMember[];
}

interface OfficeShellProps {
  companyName: string | null;
  missionTitle?: string;
  missionSummary?: string;
  missionItems: string[];
  stageStatus: string;
  stageHint: string;
  statCards: Array<{ label: string; value: string }>;
  currentAction: ActionInboxItem | null;
  queuedActionCount: number;
  selectedAgent: OfficeAgentView | null;
  canHire: boolean;
  companyBoard?: OfficeShellCompanyBoard | null;
  companyBoardOpen?: boolean;
  onOpenCompanyBoard?: () => void;
  onCloseCompanyBoard?: () => void;
  soundStepIndex: number;
  onOpenHire: () => void;
  onToggleSound: () => void;
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
  missionItems,
  stageStatus,
  stageHint,
  statCards,
  currentAction,
  queuedActionCount,
  selectedAgent,
  canHire,
  companyBoard,
  companyBoardOpen = false,
  onCloseCompanyBoard,
  soundStepIndex,
  onOpenHire,
  onToggleSound,
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
  const boardState = companyBoard ?? {
    companyName,
    goals: missionItems,
    staff: [],
  };

  return (
    <section className="office-stage" aria-label="Paperclip Office world">
      <div className="office-stage__viewport">{children}</div>

      <div className="office-stage__overlay">
        <aside className="office-stage__hud" aria-label="Operator radio" tabIndex={0}>
          <p className="office-stage__hud-eyebrow">{companyName ?? "Paperclip Office"}</p>
          <div className="office-stage__hud-row">
            <span className="office-status">{stageStatus}</span>
          </div>
          <p className="office-stage__hud-copy">{stageHint}</p>
          <div className="office-stage__hud-stats" aria-label="Office stats">
            {statCards.map((card) => (
              <span key={card.label} className="office-stage__hud-stat">
                <strong>{card.value}</strong> {card.label}
              </span>
            ))}
          </div>
        </aside>

        <div className="office-stage__toolbar">
          <button type="button" className="office-button" disabled={!canHire} onClick={onOpenHire}>
            Hire agent
          </button>
          <SoundButton stepIndex={soundStepIndex} onClick={onToggleSound} />
          <TrackerButton onClick={onOpenTrackerHome} />
        </div>

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

        <CompanyBoardDialog
          open={companyBoardOpen}
          companyName={boardState.companyName ?? companyName}
          goals={boardState.goals}
          staff={boardState.staff}
          onClose={onCloseCompanyBoard ?? (() => undefined)}
        />
      </div>
    </section>
  );
}
