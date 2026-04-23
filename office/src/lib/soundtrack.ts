export const SOUNDTRACK_VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

export type SoundtrackAudio = Pick<HTMLAudioElement, "loop" | "volume" | "play" | "pause">;

export function getNextSoundtrackStep(currentStepIndex: number) {
  return (normalizeSoundtrackStep(currentStepIndex) + 1) % SOUNDTRACK_VOLUME_STEPS.length;
}

export function getActiveSoundBars(stepIndex: number) {
  return normalizeSoundtrackStep(stepIndex);
}

export function getSoundtrackVolumeLabel(stepIndex: number) {
  return `${Math.round(SOUNDTRACK_VOLUME_STEPS[normalizeSoundtrackStep(stepIndex)] * 100)}%`;
}

export async function syncSoundtrackPlayback(
  audio: SoundtrackAudio,
  stepIndex: number,
) {
  const normalizedStepIndex = normalizeSoundtrackStep(stepIndex);
  const volume = SOUNDTRACK_VOLUME_STEPS[normalizedStepIndex];

  audio.loop = true;
  audio.volume = volume;

  if (volume === 0) {
    audio.pause();
    return;
  }

  try {
    await audio.play();
  } catch {
    // Browsers may block autoplay until the first user interaction.
  }
}

function normalizeSoundtrackStep(stepIndex: number) {
  if (!Number.isFinite(stepIndex)) {
    return 0;
  }

  const boundedStepIndex = Math.trunc(stepIndex);

  if (boundedStepIndex < 0) {
    return 0;
  }

  if (boundedStepIndex >= SOUNDTRACK_VOLUME_STEPS.length) {
    return SOUNDTRACK_VOLUME_STEPS.length - 1;
  }

  return boundedStepIndex;
}
