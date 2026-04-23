import { useEscapeClose } from "./useEscapeClose";

export interface CompanyBoardStaffMember {
  id: string;
  name: string;
  role: string;
  status?: string;
  isLead?: boolean;
}

interface CompanyBoardDialogProps {
  open: boolean;
  companyName: string | null | undefined;
  goals: string[];
  staff: CompanyBoardStaffMember[];
  onClose: () => void;
}

function statusLabel(status: string | undefined) {
  if (!status) {
    return null;
  }

  return status.replace(/_/g, " ");
}

export function CompanyBoardDialog({
  open,
  companyName,
  goals,
  staff,
  onClose,
}: CompanyBoardDialogProps) {
  useEscapeClose({ enabled: open, onClose });

  if (!open) {
    return null;
  }

  return (
    <div className="office-modal-backdrop office-modal-backdrop--board">
      <aside
        className="office-dialog office-dialog--board"
        role="dialog"
        aria-modal="true"
        aria-label="Company board"
      >
        <header className="office-dialog__header">
          <div>
            <p className="office-dialog__eyebrow">Company board</p>
            <h2>{companyName ?? "Paperclip Office"}</h2>
          </div>
          <button type="button" className="office-button office-button--secondary" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="office-board-grid">
          <section className="office-dialog__section">
            <h3>Shift goals</h3>
            <ul className="office-board-list">
              {goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </section>

          <section className="office-dialog__section">
            <h3>Staff roster</h3>
            <ul className="office-board-staff">
              {staff.map((member) => (
                <li key={member.id} className="office-board-staff__item">
                  <div>
                    <strong>{member.name}</strong>
                    <p>{member.role}</p>
                  </div>
                  <div className="office-board-staff__meta">
                    {member.isLead ? <span className="office-board-badge">Lead</span> : null}
                    {statusLabel(member.status) ? (
                      <span className="office-board-badge office-board-badge--muted">
                        {statusLabel(member.status)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
