import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionInboxDialog } from "./ActionInboxDialog";

describe("ActionInboxDialog", () => {
  afterEach(() => cleanup());

  it("does not dismiss routine actions on Escape", () => {
    const onDismiss = vi.fn();

    render(
      <ActionInboxDialog
        item={{
          id: "action-1",
          kind: "mention",
          title: "Review update",
          body: "A teammate posted an update.",
        }}
        queuedCount={0}
        onApprove={vi.fn()}
        onOpenContext={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not dismiss urgent approvals on Escape", () => {
    const onDismiss = vi.fn();

    render(
      <ActionInboxDialog
        item={{
          id: "approval-1",
          kind: "approval",
          title: "Hire approval",
          body: "Approve this candidate to continue.",
          approvalId: "approval-1",
        }}
        queuedCount={0}
        onApprove={vi.fn()}
        onOpenContext={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
