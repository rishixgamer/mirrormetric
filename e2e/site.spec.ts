import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

test("public pages are crawlable and free of serious axe violations", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/", "Your face. Measured without the black box."],
    ["/methodology", "Accuracy is a public process"],
    ["/privacy", "Your face is not our dataset."],
    ["/terms", "Measure carefully. Interpret modestly."],
    ["/open-source", "Fork the formulas."],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: new RegExp(heading) })).toBeVisible();
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("quick scan, correction, encrypted history, and deletion", async ({
  page,
}) => {
  await page.goto("/analyze?mode=quick");
  await page.evaluate(() =>
    sessionStorage.setItem("mirrormetric:e2e-detection", "accepted"),
  );
  await page.locator('input[type="file"]').setInputFiles(await patternedPhoto(page));
  await confirmAdultUse(page);
  await page.getByLabel("Enable optional goal similarity", { exact: false }).check();
  await page.getByRole("button", { name: "Analyze 1 capture" }).click();
  await expect(page.getByRole("heading", { name: "Your measurement record." })).toBeVisible();
  await expect(page.locator(".measurement-card")).toHaveCount(18);

  await page.getByRole("button", { name: "Correct capture 1" }).click();
  await page.getByRole("button", { name: "Right" }).click();
  await page.getByRole("button", { name: "Apply corrections" }).click();
  const readableDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export readable JSON" }).click();
  expect((await readableDownload).suggestedFilename()).toMatch(
    /^mirrormetric-.*\.json$/,
  );
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
  const files = await Promise.all([
    patternedPhoto(page, "synthetic-1.png"),
    patternedPhoto(page, "synthetic-2.png"),
    patternedPhoto(page, "synthetic-3.png"),
  ]);
  for (const file of files) {
    await page.locator('input[type="file"]').setInputFiles(file);
  }
  await confirmAdultUse(page);
  await page.getByRole("button", { name: "Analyze 3 captures" }).click();
  await expect(page.getByText("Precision scan · experimental")).toBeVisible();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".stability-stable")).toHaveCount(18);
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
