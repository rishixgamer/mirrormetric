import { describe, expect, it } from "vitest";
import { estimatePoseFromMatrix } from "./pose";

describe("pose extraction", () => {
  it("extracts a neutral identity transform", () => {
    const pose = estimatePoseFromMatrix([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
    expect(pose?.yaw).toBeCloseTo(0);
    expect(pose?.pitch).toBeCloseTo(0);
    expect(pose?.roll).toBeCloseTo(0);
  });

  it("extracts yaw from a transformation matrix", () => {
    const radians = (10 * Math.PI) / 180;
    const pose = estimatePoseFromMatrix([
      Math.cos(radians), 0, Math.sin(radians), 0,
      0, 1, 0, 0,
      -Math.sin(radians), 0, Math.cos(radians), 0,
      0, 0, 0, 1,
    ]);
    expect(pose?.yaw).toBeCloseTo(10);
  });
});
