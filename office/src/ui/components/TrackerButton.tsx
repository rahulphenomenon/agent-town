interface TrackerButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function TrackerButton({
  onClick,
  disabled = false,
  label = "View in Tracker",
}: TrackerButtonProps) {
  return (
    <button
      type="button"
      className="office-button office-button--tracker"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
