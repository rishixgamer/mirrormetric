import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

async function patternedPhoto(page: Page, name = "synthetic-adult.png") {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(800, 800);
    for (let index = 0; index < image.data.length; index += 4) {
      const pixel = index / 4;
      const value = (pixel + Math.floor(pixel / 800)) % 2 ? 238 : 24;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

async function confirmAdultUse(page: Page) {
  for (const label of [
    "I am at least 18 years old.",
    "I own this photo or have permission to use it.",
    "I understand the limitations.",
  ]) {
    await page.getByLabel(label, { exact: false }).check();
  }
}

function benchmarkModelFixture() {
  const metricIds = [
    "jaw-cheek",
    "eye-spacing",
    "left-eye-face",
    "right-eye-face",
    "eye-symmetry",
    "mean-canthal-tilt",
    "canthal-symmetry",
    "brow-eye-symmetry",
    "nose-face",
    "mouth-nose",
    "mouth-face",
    "lip-aperture",
    "jaw-side-symmetry",
  ];
  return {
    schemaVersion: 1,
    modelVersion: "e2e-fixture-v1",
    label: "experimental SCUT benchmark estimate",
    intercept: 3,
    features: metricIds.map((measurementId) => ({
      measurementId,
      mean: 0,
      standardDeviation: 100,
      coefficient: 0.01,
    })),
    validation: {
      sampleCount: 100,
      pearson: 0.7,
      mae: 0.3,
      rmse: 0.4,
      absoluteErrorQuantile90: 0.5,
      asianMaleMae: 0.4,
      caucasianMaleMae: 0.4,
      folds: 5,
      nested: true,
      seed: 42,
      releaseEligible: true,
    },
    provenance: {
      dataset: "SCUT-FBP5500",
      datasetVersion: "fixture",
      trainingSubsets: ["Asian male", "Caucasian male"],
      targetPopulation:
        "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation",
      trainingCodeVersion: "fixture",
      regularization: {
        method: "ridge",
        selectedLambdas: [1, 1, 1, 1, 1],
        finalLambda: 1,
      },
    },
    license: {
      code: "MIT",
      modelPack: "fixture",
      notice: "End-to-end fixture only.",
      redistributionConfirmed: true,
    },
    requiredMetricIds: metricIds,
  };
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function seedLegacyHistory(page: Page, passphrase: string) {
  await page.evaluate(async (secret) => {
    const bytesToBase64 = (bytes: Uint8Array) => {
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations: 600_000,
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    const session = {
      schemaVersion: 1,
      id: "legacy-e2e",
      createdAt: "2026-01-01T00:00:00.000Z",
      mode: "quick",
      measurementCatalogVersion: "1.0.0-beta.1",
      captures: [],
      measurements: [],
      goalProfileId: "balanced",
      score: {
        version: "goal-similarity-1",
        profileId: "balanced",
        score: 82,
        confidence: 90,
        uncertainty: { lower: 76, upper: 88 },
        components: [],
        disclaimer: "Legacy subjective score.",
      },
      guidance: [],
    };
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(session)),
    );
    const envelope = {
      version: 1,
      algorithm: "AES-GCM",
      kdf: "PBKDF2-SHA-256",
      iterations: 600_000,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("mirrormetric-local", 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains("encrypted-sessions")) {
          request.result.createObjectStore("encrypted-sessions", {
            keyPath: "id",
          });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        "encrypted-sessions",
        "readwrite",
      );
      transaction.objectStore("encrypted-sessions").put({
        id: session.id,
        createdAt: session.createdAt,
        envelope,
      });
      transaction.addEventListener("complete", () => resolve());
      transaction.addEventListener("error", () => reject(transaction.error));
    });
    database.close();
  }, passphrase);
}

test("public pages are crawlable and free of serious axe violations", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/", "Your face. Measured without the black box."],
    ["/analyze?mode=quick", "Build a measurement"],
    ["/methodology", "Accuracy is a public process"],
    ["/privacy", "Your face is not our dataset."],
    ["/terms", "Measure carefully. Interpret modestly."],
    ["/open-source", "Fork the formulas."],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: new RegExp(heading) })).toBeVisible();
    await expectNoAxeViolations(page);
  }
});

test("quick scan, correction, encrypted history, and deletion", async ({
  page,
}) => {
  await page.goto("/analyze?mode=quick");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await page.evaluate((model) => {
    sessionStorage.setItem(
      "mirrormetric:e2e-attractiveness-model",
      JSON.stringify(model),
    );
  }, benchmarkModelFixture());
  await expect(page.getByLabel("Choose a photo")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Choose a photo" }),
  ).toHaveCount(1);
  await page.locator('input[type="file"]').setInputFiles(await patternedPhoto(page));
  await confirmAdultUse(page);
  await page
    .getByLabel("Show an experimental attractiveness estimate", {
      exact: false,
    })
    .check();
  await page.getByLabel("I confirm the subject is an adult man.", {
    exact: false,
  }).check();
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("heading", { name: "Your measurement record." })).toBeVisible();
  await expect(
    page.getByRole("group", {
      name: /out of 10, 90 percent range.*experimental benchmark estimate/i,
    }),
  ).toBeVisible();
  await expect(page.locator(".score-breakdown article")).toHaveCount(13);
  await expect(page.locator(".measurement-card")).toHaveCount(18);
  await expectNoAxeViolations(page);

  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printInvoked = "true";
    };
  });
  await page.getByRole("button", { name: "Print / save PDF" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-invoked", "true");

  await page.getByRole("button", { name: "Correct capture 1" }).click();
  await page.getByRole("button", { name: "Right" }).click();
  await page.getByRole("button", { name: "Apply corrections" }).click();
  const readableDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export readable JSON" }).click();
  const readable = await readableDownload;
  expect(readable.suggestedFilename()).toMatch(
    /^mirrormetric-.*\.json$/,
  );
  const readablePath = await readable.path();
  expect(readablePath).not.toBeNull();
  const exported = JSON.parse(await readFile(readablePath!, "utf8"));
  expect(exported.schemaVersion).toBe(2);
  expect(exported.attractivenessScore.components).toHaveLength(13);
  expect(JSON.stringify(exported)).not.toContain("data:image");
  await page.getByLabel("Local-history passphrase").fill("local-test-passphrase");
  await page.getByRole("button", { name: "Encrypt and save locally" }).click();
  await expect(page.getByText("Saved to encrypted local history.")).toBeVisible();

  await page.goto("/history");
  await page.getByLabel("Local-history passphrase").fill("local-test-passphrase");
  await page.getByRole("button", { name: "Unlock history" }).click();
  await expect(page.getByText("1 record unlocked.")).toBeVisible();
  const encryptedDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export encrypted archive" })
    .click();
  expect((await encryptedDownload).suggestedFilename()).toMatch(
    /^mirrormetric-encrypted-.*\.json$/,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("No local records")).toBeVisible();
});

test("precision mode accepts three captures and reports stability", async ({
  page,
}) => {
  await page.goto("/analyze");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await page.evaluate((model) => {
    sessionStorage.setItem(
      "mirrormetric:e2e-attractiveness-model",
      JSON.stringify(model),
    );
  }, benchmarkModelFixture());
  const files = await Promise.all([
    patternedPhoto(page, "synthetic-1.png"),
    patternedPhoto(page, "synthetic-2.png"),
    patternedPhoto(page, "synthetic-3.png"),
  ]);
  for (const file of files) {
    await page.locator('input[type="file"]').setInputFiles(file);
  }
  await confirmAdultUse(page);
  await page
    .getByLabel("Show an experimental attractiveness estimate", {
      exact: false,
    })
    .check();
  await page.getByLabel("I confirm the subject is an adult man.", {
    exact: false,
  }).check();
  await page.getByRole("button", { name: "Analyze 3 captures" }).click();
  await expect(page.getByText("Precision scan · experimental")).toBeVisible();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".stability-stable")).toHaveCount(18);
  await expect(
    page.getByRole("group", {
      name: /out of 10, 90 percent range.*experimental benchmark estimate/i,
    }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test("score remains absent when the user opts out", async ({ page }) => {
  await page.goto("/analyze?mode=quick");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles(await patternedPhoto(page, "opted-out.png"));
  await confirmAdultUse(page);
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("heading", {
    name: "Experimental benchmark estimate",
  })).toHaveCount(0);
  await expect(page.locator(".measurement-card")).toHaveCount(18);
  await expectNoAxeViolations(page);
});

test("precision score is withheld when a required input is unstable", async ({
  page,
}) => {
  await page.goto("/analyze");
  await page.evaluate((model) => {
    sessionStorage.setItem("mirrormetric:e2e-detection", "variable");
    sessionStorage.setItem(
      "mirrormetric:e2e-attractiveness-model",
      JSON.stringify(model),
    );
  }, benchmarkModelFixture());
  for (const name of [
    "unstable-1.png",
    "unstable-2.png",
    "unstable-3.png",
  ]) {
    await page
      .locator('input[type="file"]')
      .setInputFiles(await patternedPhoto(page, name));
  }
  await confirmAdultUse(page);
  await page
    .getByLabel("Show an experimental attractiveness estimate", {
      exact: false,
    })
    .check();
  await page.getByLabel("I confirm the subject is an adult man.", {
    exact: false,
  }).check();
  await page.getByRole("button", { name: "Analyze 3 captures" }).click();
  await expect(page.getByText("Score withheld", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/unstable across precision captures/i).first(),
  ).toBeVisible();
  await expect(page.locator(".withheld-breakdown article")).toHaveCount(13);
  await expectNoAxeViolations(page);
});

test("camera validates the captured photo instead of the previous live frame", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("webkit"),
    "Playwright WebKit does not reliably play a synthetic canvas camera stream; Chromium and Firefox cover this exact captured-frame gate.",
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const canvas = document.createElement("canvas");
          canvas.width = 800;
          canvas.height = 800;
          const context = canvas.getContext("2d")!;
          for (let y = 0; y < canvas.height; y += 4) {
            for (let x = 0; x < canvas.width; x += 4) {
              context.fillStyle = (x + y) % 8 ? "#eeeeee" : "#181818";
              context.fillRect(x, y, 4, 4);
            }
          }
          const stream = canvas.captureStream(10);
          const track = stream.getVideoTracks()[0] as
            | (MediaStreamTrack & { requestFrame?: () => void })
            | undefined;
          track?.requestFrame?.();
          return stream;
        },
      },
    });
  });
  await page.goto("/analyze?mode=quick");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await page.getByRole("button", { name: "Use camera" }).click();
  const captureButton = page.getByRole("button", { name: "Capture photo" });
  await expect(captureButton).toBeEnabled({ timeout: 20_000 });

  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "multiple"),
  );
  await captureButton.click();
  await expect(page.getByRole("heading", { name: "Center your face in the guide" })).toBeVisible();
  await expect(page.locator('.camera-feedback li[data-severity="error"]')).toContainText(
    "One face",
  );

  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await expect(captureButton).toBeEnabled({ timeout: 20_000 });
  await captureButton.click();
  await expect(page.getByText("1 of 1 selected")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Center your face in the guide" })).toBeHidden();
});

test("bad capture and model failure recover without a reload", async ({
  page,
}) => {
  await page.goto("/analyze?mode=quick");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "multiple"),
  );
  await page.locator('input[type="file"]').setInputFiles(await patternedPhoto(page));
  await confirmAdultUse(page);
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByText("Retake", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Failed checks: One face.",
  );
  await expect(page.locator(".capture-report")).toBeFocused();
  await expect(page.getByText(/2 faces detected/)).toBeVisible();
  await page.getByRole("button", { name: "Remove and retake" }).click();
  await expect(page.getByText("0 of 1 selected")).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles(await patternedPhoto(page));
  await page
    .getByLabel("Show an experimental attractiveness estimate", {
      exact: false,
    })
    .check();
  await page.getByLabel("I confirm the subject is an adult man.", {
    exact: false,
  }).check();

  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "error"),
  );
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("alert")).toContainText("model could not load");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("heading", { name: "Your measurement record." })).toBeVisible();
  await expect(page.getByText("Score withheld", { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("app shell reloads offline after the first visit", async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("webkit"),
    "Playwright WebKit offline reload is unstable; Chromium and Firefox cover the service-worker gate.",
  );
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Your face. Measured without the black box.",
    }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("legacy encrypted history migrates read-only without recomputing", async ({
  page,
}) => {
  const passphrase = "legacy-local-passphrase";
  await page.goto("/history");
  await seedLegacyHistory(page, passphrase);
  await page.getByLabel("Local-history passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Unlock history" }).click();
  await expect(page.getByText("82 legacy goal similarity")).toBeVisible();
  await page.getByRole("button", { name: "Open result" }).click();
  await expect(
    page.getByRole("heading", { name: "Legacy goal similarity" }),
  ).toBeVisible();
  await expect(page.getByText(/preserved exactly as saved/i)).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Experimental benchmark estimate",
  })).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("layout, keyboard focus, text resize, and reduced motion remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/analyze?mode=quick");
  const picker = page.getByLabel("Choose a photo");
  await picker.focus();
  await expect(picker).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("heading", { name: /Build a measurement/ }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test("real model stays same-origin and remains available offline", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90_000);
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Run the pinned-model network smoke once.",
  );
  const requests: Array<{ url: string; body: string | null }> = [];
  page.on("request", (request) => {
    requests.push({ url: request.url(), body: request.postData() });
  });
  await page.goto("/analyze?mode=quick");
  const appOrigin = new URL(page.url()).origin;
  const photo = await patternedPhoto(page, "no-face-pattern.png");
  await page.locator('input[type="file"]').setInputFiles(photo);
  await confirmAdultUse(page);
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("alert")).toContainText(/No face was detected/i, {
    timeout: 30_000,
  });
  expect(requests.some((request) => request.url.includes("/models/face_landmarker.task"))).toBe(
    true,
  );
  expect(requests.some((request) => request.url.includes("/wasm/"))).toBe(true);
  expect(
    requests.every(
      (request) =>
        new URL(request.url).origin === appOrigin &&
        request.body === null,
    ),
  ).toBe(true);

  await page.waitForTimeout(1_000);
  await page.reload();
  await context.setOffline(true);
  await page.locator('input[type="file"]').setInputFiles(photo);
  await confirmAdultUse(page);
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("alert")).toContainText(/No face was detected/i, {
    timeout: 30_000,
  });
  await context.setOffline(false);
});
