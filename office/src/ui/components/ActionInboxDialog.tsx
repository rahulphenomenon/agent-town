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

  return (
    <aside
      className="office-dialog office-dialog--action-inbox"
      aria-label="Office action inbox"
    >
      <header className="office-dialog__header">
        <div>
          <p className="office-dialog__eyebrow">Action inbox</p>
          <h2>{item.title}</h2>
        </div>
        <p className="office-dialog__meta">{queueSummary(queuedCount)}</p>
      </header>

      <p className="office-dialog__body">{item.body}</p>

      <div className="office-dialog__actions">
        {item.kind === "approval" ? (
          <button type="button" className="office-button" onClick={onApprove}>
            Approve
          </button>
        ) : null}
        <button type="button" className="office-button" onClick={onOpenContext}>
          Open context
        </button>
        <button type="button" className="office-button office-button--secondary" onClick={onDismiss}>
          Next
        </button>
      </div>
    </aside>
  );
}
