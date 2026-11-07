export const VISUAL_ANGLE_GAIN = 3;
export const MAX_VISUAL_ANGLE_DEG = 35;

export function visualAngle(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(-MAX_VISUAL_ANGLE_DEG, Math.min(MAX_VISUAL_ANGLE_DEG, value * VISUAL_ANGLE_GAIN));
}

export function pointAtAngle(x: number, y: number, length: number, angle: number, invertY = true) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: x + Math.cos(radians) * length,
    y: y + Math.sin(radians) * length * (invertY ? -1 : 1),
  };
}
