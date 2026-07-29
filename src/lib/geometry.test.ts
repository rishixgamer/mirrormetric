import { describe, expect, it } from "vitest";
import {
  canthalTiltDegrees,
  distance2d,
  midpoint,
  safeRatio,
  symmetryPercent,
} from "./geometry";

describe("geometry", () => {
  it("calculates Euclidean distance in normalized coordinates", () => {
    expect(distance2d({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("calculates a midpoint without inventing z coordinates", () => {
    expect(midpoint({ x: 0, y: 2 }, { x: 2, y: 4 })).toEqual({
      x: 1,
      y: 3,
      z: undefined,
    });
  });

  it("rejects zero-denominator ratios", () => {
    expect(() => safeRatio(1, 0)).toThrow(/zero denominator/i);
  });

  it("reports perfect and proportional symmetry", () => {
    expect(symmetryPercent(1, 1)).toBe(100);
    expect(symmetryPercent(1, 2)).toBeCloseTo(33.333, 2);
  });

  it("uses positive tilt when the outer corner is higher", () => {
    expect(
      canthalTiltDegrees({ x: 0, y: 0.4 }, { x: 1, y: 0.5 }),
    ).toBeCloseTo(5.71, 1);
  });
});
