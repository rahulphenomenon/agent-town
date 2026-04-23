import {
  getActiveSoundBars,
  getSoundtrackVolumeLabel,
} from "@/lib/soundtrack";

interface SoundButtonProps {
  stepIndex: number;
  onClick: () => void;
  disabled?: boolean;
}

export function SoundButton({
  stepIndex,
  onClick,
  disabled = false,
}: SoundButtonProps) {
  const activeBars = getActiveSoundBars(stepIndex);
  const volumeLabel = getSoundtrackVolumeLabel(stepIndex);

  return (
    <button
      type="button"
      className="office-button office-button--sound office-sound-button"
      aria-label={`Sound volume ${volumeLabel}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="office-sound-button__speaker" aria-hidden="true">
        <svg viewBox="0 0 18 18" focusable="false">
          <path d="M3.25 6.25h3.2L10.5 3v12l-4.05-3.25h-3.2z" />
        </svg>
      </span>

      <span className="office-sound-button__bars" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => {
          const barNumber = index + 1;

          return (
            <span
              key={barNumber}
              className={[
                "office-sound-button__bar",
                barNumber <= activeBars ? "office-sound-button__bar--active" : "",
              ].join(" ").trim()}
            />
          );
        })}
      </span>
    </button>
  );
}
