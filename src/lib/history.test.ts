import { describe, expect, it } from "vitest";
import { decryptPayload, encryptPayload } from "./history";

describe("encrypted exports", () => {
  it("round-trips data with the correct passphrase", async () => {
    const payload = { private: "local-only", count: 3 };
    const encrypted = await encryptPayload(payload, "a-secure-local-passphrase");
    expect(encrypted.ciphertext).not.toContain("local-only");
    await expect(
      decryptPayload(encrypted, "a-secure-local-passphrase"),
    ).resolves.toEqual(payload);
  });

  it("fails closed with the wrong passphrase", async () => {
    const encrypted = await encryptPayload(
      { private: true },
      "a-secure-local-passphrase",
    );
    await expect(
      decryptPayload(encrypted, "the-wrong-local-passphrase"),
    ).rejects.toThrow(/did not unlock/i);
  });
});
