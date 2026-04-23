import { useEffect } from "react";

interface UseEscapeCloseOptions {
  enabled: boolean;
  onClose: () => void;
}

export function useEscapeClose({ enabled, onClose }: UseEscapeCloseOptions) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);
}
