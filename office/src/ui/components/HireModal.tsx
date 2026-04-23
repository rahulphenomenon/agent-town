import { useEffect, useState } from "react";
import type { CreateAgentHire } from "@/types/office";

interface HireModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAgentHire) => Promise<void> | void;
  defaultAdapterType?: CreateAgentHire["adapterType"];
}

export function HireModal({
  open,
  onClose,
  onSubmit,
  defaultAdapterType = "process",
}: HireModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<NonNullable<CreateAgentHire["role"]>>("general");
  const [capabilities, setCapabilities] = useState("");
  const [adapterType, setAdapterType] = useState<CreateAgentHire["adapterType"]>(defaultAdapterType);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      return;
    }

    setName("");
    setRole("general");
    setCapabilities("");
    setAdapterType(defaultAdapterType);
    setSubmitting(false);
  }, [defaultAdapterType, open]);

  if (!open) {
    return null;
  }

  const trimmedName = name.trim();

  return (
    <aside
      className="office-dialog office-dialog--hire"
      aria-label="Hire agent"
    >
      <header className="office-dialog__header">
        <div>
          <p className="office-dialog__eyebrow">Hiring</p>
          <h2>Hire agent</h2>
        </div>
        <button type="button" className="office-button office-button--secondary" onClick={onClose}>
          Close
        </button>
      </header>

      <form
        className="office-dialog__form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!trimmedName || submitting) {
            return;
          }

          setSubmitting(true);

          try {
            await onSubmit({
              name: trimmedName,
              role,
              capabilities: capabilities.trim() || null,
              adapterType,
              adapterConfig: {},
              runtimeConfig: {},
              budgetMonthlyCents: 0,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="office-dialog__field">
          <span>Name</span>
          <input
            aria-label="Agent name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ava"
          />
        </label>

        <label className="office-dialog__field">
          <span>Role</span>
          <select
            aria-label="Agent role"
            value={role}
            onChange={(event) => setRole(event.target.value as NonNullable<CreateAgentHire["role"]>)}
          >
            <option value="general">General</option>
            <option value="engineer">Engineer</option>
            <option value="designer">Designer</option>
            <option value="qa">QA</option>
            <option value="researcher">Researcher</option>
            <option value="pm">PM</option>
          </select>
        </label>

        <label className="office-dialog__field">
          <span>Adapter type</span>
          <input
            aria-label="Adapter type"
            value={adapterType}
            onChange={(event) => setAdapterType(event.target.value as CreateAgentHire["adapterType"])}
            placeholder="process"
          />
        </label>

        <label className="office-dialog__field">
          <span>Capabilities</span>
          <textarea
            aria-label="Capabilities"
            value={capabilities}
            onChange={(event) => setCapabilities(event.target.value)}
            placeholder="What should this agent focus on?"
            rows={4}
          />
        </label>

        <div className="office-dialog__actions">
          <button type="submit" className="office-button" disabled={!trimmedName || submitting}>
            {submitting ? "Creating..." : "Create agent"}
          </button>
        </div>
      </form>
    </aside>
  );
}
