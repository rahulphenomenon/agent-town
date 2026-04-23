import type { ActionInboxItem } from "@/types/office";

interface ActionInboxDialogProps {
  item: ActionInboxItem | null;
  queuedCount: number;
  onApprove: () => void;
  onOpenContext: () => void;
  onDismiss: () => void;
}

function queueSummary(queuedCount: number) {
  if (queuedCount <= 0) {
    return "No other pending actions.";
  }

  if (queuedCount === 1) {
    return "1 more action waiting.";
  }

  return `${queuedCount} more actions waiting.`;
}

export function ActionInboxDialog({
  item,
  queuedCount,
  onApprove,
  onOpenContext,
  onDismiss,
}: ActionInboxDialogProps) {
  if (!item) {
    return null;
  }

  const isApproval = item.kind === "approval";

  const dialog = (
    <aside
      className={`office-dialog office-dialog--action-inbox${isApproval ? " office-dialog--approval" : ""}`}
      aria-label="Office action inbox"
      role={isApproval ? "alertdialog" : "dialog"}
      aria-modal={isApproval || undefined}
    >
      <header className="office-dialog__header">
        <div>
          <p className="office-dialog__eyebrow">{isApproval ? "Urgent approval" : "Action inbox"}</p>
          <h2>{item.title}</h2>
        </div>
        <p className="office-dialog__meta">{queueSummary(queuedCount)}</p>
      </header>

      <p className="office-dialog__body">{item.body}</p>
      {isApproval ? (
        <p className="office-dialog__meta office-dialog__note">
          Approval is blocking. Resolve it before returning to routine office flow.
        </p>
      ) : null}

      <div className="office-dialog__actions">
        {isApproval ? (
          <button type="button" className="office-button" onClick={onApprove}>
            Approve
          </button>
        ) : null}
        <button type="button" className="office-button" onClick={onOpenContext}>
          Open context
        </button>
        {isApproval ? null : (
          <button type="button" className="office-button office-button--secondary" onClick={onDismiss}>
            Next
          </button>
        )}
      </div>
    </aside>
  );

  if (isApproval) {
    return <div className="office-modal-backdrop office-modal-backdrop--urgent">{dialog}</div>;
  }

  return <div className="office-dialog-layer">{dialog}</div>;
}
