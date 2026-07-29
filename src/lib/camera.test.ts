import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CameraRequestTimeoutError,
  cameraErrorMessage,
  requestCameraStream,
} from "./camera";

afterEach(() => {
  vi.useRealTimers();
});

describe("camera startup", () => {
  it("maps permission and device failures to actionable guidance", () => {
    expect(cameraErrorMessage({ name: "NotAllowedError" })).toContain(
      "permission is blocked",
    );
    expect(cameraErrorMessage({ name: "NotFoundError" })).toContain(
      "No camera was found",
    );
    expect(cameraErrorMessage({ name: "NotReadableError" })).toContain(
      "already in use",
    );
  });

  it("rejects a camera request that remains pending", async () => {
    vi.useFakeTimers();
    const getUserMedia = vi.fn(
      () => new Promise<MediaStream>(() => undefined),
    );
    const request = requestCameraStream(getUserMedia, 1_000);
    const rejection = expect(request).rejects.toBeInstanceOf(
      CameraRequestTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
  });

  it("stops a stream that resolves after the timeout", async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    let resolveStream: ((value: MediaStream) => void) | undefined;
    const getUserMedia = vi.fn(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveStream = resolve;
        }),
    );
    const request = requestCameraStream(getUserMedia, 1_000);
    const rejection = expect(request).rejects.toBeInstanceOf(
      CameraRequestTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    resolveStream?.(stream);
    await vi.runAllTimersAsync();

    expect(stop).toHaveBeenCalledOnce();
  });
});
