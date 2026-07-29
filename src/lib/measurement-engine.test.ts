import { describe, expect, it } from "vitest";
import { FACE_INDEX, type Landmark } from "../domain/landmarks";
import { computeMeasurements } from "./measurement-engine";

function syntheticFace(): Landmark[] {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (index: number, x: number, y: number) => {
    points[index] = { x, y };
  };

  set(FACE_INDEX.meshTop, 0.5, 0.1);
  set(FACE_INDEX.chin, 0.5, 0.9);
  set(FACE_INDEX.leftTemple, 0.15, 0.28);
  set(FACE_INDEX.rightTemple, 0.85, 0.28);
  set(FACE_INDEX.leftCheek, 0.1, 0.5);
  set(FACE_INDEX.rightCheek, 0.9, 0.5);
  set(FACE_INDEX.leftJaw, 0.2, 0.75);
  set(FACE_INDEX.rightJaw, 0.8, 0.75);
  set(FACE_INDEX.leftEyeOuter, 0.2, 0.4);
  set(FACE_INDEX.leftEyeInner, 0.35, 0.4);
  set(FACE_INDEX.rightEyeInner, 0.65, 0.4);
  set(FACE_INDEX.rightEyeOuter, 0.8, 0.4);
  set(FACE_INDEX.leftEyeUpper, 0.275, 0.38);
  set(FACE_INDEX.rightEyeUpper, 0.725, 0.38);
  set(FACE_INDEX.leftBrow, 0.275, 0.32);
  set(FACE_INDEX.rightBrow, 0.725, 0.32);
  set(FACE_INDEX.noseBridge, 0.5, 0.4);
  set(FACE_INDEX.noseTip, 0.5, 0.56);
  set(FACE_INDEX.noseBase, 0.5, 0.6);
  set(FACE_INDEX.leftNose, 0.4, 0.58);
  set(FACE_INDEX.rightNose, 0.6, 0.58);
  set(FACE_INDEX.leftMouth, 0.35, 0.7);
  set(FACE_INDEX.rightMouth, 0.65, 0.7);
  set(FACE_INDEX.upperLip, 0.5, 0.69);
  set(FACE_INDEX.lowerLip, 0.5, 0.71);

  return points;
}

describe("measurement engine", () => {
  it("computes transparent ratios from a complete mesh", () => {
    const results = computeMeasurements(syntheticFace());
    const byId = Object.fromEntries(results.map((result) => [result.id, result]));

    expect(results).toHaveLength(18);
    expect(byId["face-aspect"].value).toBeCloseTo(1);
    expect(byId["eye-spacing"].value).toBeCloseTo(2);
    expect(byId["eye-symmetry"].value).toBeCloseTo(100);
    expect(byId["mouth-nose"].value).toBeCloseTo(1.5);
    expect(byId["jaw-cheek"].value).toBeCloseTo(0.75);
    expect(byId["brow-eye-symmetry"].value).toBeCloseTo(100);
    expect(byId["jaw-side-symmetry"].value).toBeCloseTo(100);
    expect(
      results.every(
        (result) =>
          Number.isFinite(result.value) &&
          Number.isFinite(result.sensitivityDelta) &&
          result.uncertainty.lower <= result.value &&
          result.uncertainty.upper >= result.value,
      ),
    ).toBe(true);
  });

  it("fails closed when the detector contract is incomplete", () => {
    expect(() => computeMeasurements([{ x: 0, y: 0 }])).toThrow(
      /requires 478 landmarks/i,
    );
  });
});
