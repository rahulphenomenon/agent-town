export interface VelocityInput {
  x: number;
  y: number;
}

export interface VelocityVector {
  x: number;
  y: number;
}

export function normalizeVelocity(
  input: VelocityInput,
  speed: number,
): VelocityVector {
  const magnitude = Math.hypot(input.x, input.y);

  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  const scale = speed / magnitude;

  return {
    x: input.x * scale,
    y: input.y * scale,
  };
}
