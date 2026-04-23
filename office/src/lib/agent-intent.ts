import type { OfficeIntent } from "@/types/office";

interface ResolveIntentInput {
  previousIntent: OfficeIntent | null;
  nextMode: OfficeIntent["mode"];
  nextTargetZone: string;
  now: number;
  minTravelMs: number;
}

function isDeskZone(zone: string) {
  return zone.startsWith("desk-");
}

export function resolveVisualIntent(input: ResolveIntentInput): OfficeIntent {
  const previous = input.previousIntent;

  if (
    previous &&
    previous.mode === "heading_to_desk" &&
    isDeskZone(previous.targetZone) &&
    input.nextMode !== "terminated" &&
    input.now - previous.startedAt < input.minTravelMs
  ) {
    return previous;
  }

  if (
    input.nextMode === "working_at_desk" &&
    isDeskZone(input.nextTargetZone) &&
    (!previous || previous.targetZone !== input.nextTargetZone)
  ) {
    return {
      mode: "heading_to_desk",
      targetZone: input.nextTargetZone,
      startedAt: input.now,
    };
  }

  return {
    mode: input.nextMode,
    targetZone: input.nextTargetZone,
    startedAt: input.now,
  };
}
