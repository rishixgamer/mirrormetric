import type { Landmark } from "../domain/landmarks";

export function distance2d(a: Landmark, b: Landmark): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z:
      typeof a.z === "number" && typeof b.z === "number"
        ? (a.z + b.z) / 2
        : undefined,
  };
}

export function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new Error("A ratio requires finite values.");
  }
  if (Math.abs(denominator) < Number.EPSILON) {
    throw new Error("A ratio cannot use a zero denominator.");
  }
  return numerator / denominator;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function symmetryPercent(left: number, right: number): number {
  const mean = (Math.abs(left) + Math.abs(right)) / 2;
  if (mean < Number.EPSILON) return 100;
  return clamp(100 - (Math.abs(left - right) / mean) * 100, 0, 100);
}

/**
 * Positive values mean the outer corner is higher than the inner corner.
 * Image y-coordinates increase downward, so the vertical delta is inverted.
 */
export function canthalTiltDegrees(outer: Landmark, inner: Landmark): number {
  const horizontal = Math.abs(inner.x - outer.x);
  if (horizontal < Number.EPSILON) return 0;
  return (Math.atan2(inner.y - outer.y, horizontal) * 180) / Math.PI;
}
