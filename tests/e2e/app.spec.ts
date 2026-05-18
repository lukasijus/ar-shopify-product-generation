import path from "node:path";

import { expect, test } from "@playwright/test";

test("loads the nail try-on prototype on desktop", async ({ page }) => {
  const pngAssetRequests = new Set<string>();
  page.on("request", (request) => {
    const url = request.url();
    if (
      url.includes(
        "/nail-assets/blush-sparkle/extracted_roi_from_source_improved/",
      ) &&
      url.endsWith(".png")
    ) {
      pngAssetRequests.add(url);
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Always Like" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Blush Sparkle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start camera" }),
  ).toBeVisible();

  const canvasBox = await page.getByTestId("nail-overlay").boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(300);
  expect(canvasBox?.height).toBeGreaterThan(300);
  await expect
    .poll(() => pngAssetRequests.size, {
      message: "loads extracted Blush Sparkle nail assets",
    })
    .toBe(5);
});

test("shows a camera fallback when media devices are unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start camera" }).click();

  await expect(
    page.getByText("This browser does not expose camera access to web apps."),
  ).toBeVisible();
  await expect(page.getByText("Demo unavailable")).toBeVisible();
});

test("loads the nail ROI annotator and exports natural-coordinate JSON", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "The ROI annotator is a local desktop tool for mouse-based box drawing.",
  );

  await page.goto(
    "/?mode=annotate-nails&product=blush-sparkle&source=/shopify/press-ons/source/blush-sparkle.png",
  );

  await expect(
    page.getByRole("heading", { name: "Nail ROI Annotator" }),
  ).toBeVisible();
  await expect(page.getByAltText("Press-on nail package source")).toBeVisible();

  for (const finger of ["thumb", "index", "middle", "ring", "pinky"]) {
    await page.getByRole("combobox", { name: "Finger" }).click();
    await page.getByRole("option", { name: finger }).click();
    const stage = page.getByTestId("annotator-stage");
    await stage.dispatchEvent("mousedown", {
      bubbles: true,
      clientX: 120,
      clientY: 160,
    });
    await stage.dispatchEvent("mousemove", {
      bubbles: true,
      clientX: 220,
      clientY: 320,
    });
    await stage.dispatchEvent("mouseup", {
      bubbles: true,
      clientX: 220,
      clientY: 320,
    });
  }

  await expect(page.getByText("5/5 ROIs")).toBeVisible();
  await expect(page.getByLabel("ROI JSON")).toContainText(
    '"productHandle": "blush-sparkle"',
  );
  await expect(page.getByLabel("ROI JSON")).toContainText('"finger": "pinky"');
});

test("uploads a package image in the nail ROI annotator", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "The ROI annotator is a local desktop tool for mouse-based box drawing.",
  );

  await page.goto("/?mode=annotate-nails&product=upload-demo");
  await expect(
    page.getByRole("heading", { name: "Upload a package image" }),
  ).toBeVisible();

  await page
    .getByTestId("annotator-file-input")
    .setInputFiles(
      path.resolve("public/shopify/press-ons/source/blush-sparkle.png"),
    );

  await expect(page.getByAltText("Press-on nail package source")).toBeVisible();
  await expect(page.locator(".annotator-source-name")).toHaveText(
    "blush-sparkle.png",
  );
  await expect(page.getByLabel("ROI JSON")).toContainText(
    '"productHandle": "upload-demo"',
  );
  await expect(page.getByLabel("ROI JSON")).toContainText(
    '"sourceImage": "blush-sparkle.png"',
  );

  for (const finger of ["thumb", "index", "middle", "ring", "pinky"]) {
    await page.getByRole("combobox", { name: "Finger" }).click();
    await page.getByRole("option", { name: finger }).click();
    const stage = page.getByTestId("annotator-stage");
    await stage.dispatchEvent("mousedown", {
      bubbles: true,
      clientX: 120,
      clientY: 160,
    });
    await stage.dispatchEvent("mousemove", {
      bubbles: true,
      clientX: 220,
      clientY: 320,
    });
    await stage.dispatchEvent("mouseup", {
      bubbles: true,
      clientX: 220,
      clientY: 320,
    });
  }

  await page.route("/api/nails/extract-roi", async (route) => {
    const payload = route.request().postDataJSON() as {
      productHandle: string;
      uploadedSource?: { name: string };
    };
    expect(payload.productHandle).toBe("upload-demo");
    expect(payload.uploadedSource?.name).toBe("blush-sparkle.png");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        roiPath: "private/extraction-work/upload-demo/rois.json",
        proposalPath: "private/extraction-work/upload-demo/proposal.json",
        assetDir: "public/nail-assets/upload-demo",
      }),
    });
  });

  await page.getByRole("button", { name: "Extract assets" }).click();
  await expect(
    page.getByText("Nail assets extracted and approved."),
  ).toBeVisible();
  await expect(page.getByText("public/nail-assets/upload-demo")).toBeVisible();
  await expect(page.getByLabel("Next terminal commands")).toContainText(
    "private/extraction-work/upload-demo/rois.json",
  );
  await expect(page.getByLabel("Next terminal commands")).toContainText(
    "--source-image <original-package-image-path>",
  );
});
