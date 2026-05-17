import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { handFixtures } from "../../src/app/fixtureManifest";

type TestPressOnProduct = {
  title: string;
  handle: string;
};

const pressOnProducts = JSON.parse(
  readFileSync(join(process.cwd(), "src/app/pressOnProducts.json"), "utf8"),
) as TestPressOnProduct[];

const productReviewFixtures = handFixtures.filter(
  (fixture) =>
    fixture.visibleNails &&
    [
      "back-hand-flat-good-light",
      "back-hand-fingers-close",
      "back-hand-angled-left",
      "back-hand-angled-right",
    ].includes(fixture.id),
);

test("loads the fixture debug mode", async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto("/?mode=fixtures");

  await expect(
    page.getByRole("heading", { name: "Synthetic Hand Fixtures" }),
  ).toBeVisible();
  await expect(page.getByTestId("fixture-overlay")).toBeVisible();
  await expect(page.getByText("Flat hand, good light")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Nail set" })).toHaveText(
    "Blush Sparkle",
  );
  await expect(page.getByText("Target reference")).toBeVisible();
  await expect(page.getByText("visible nails")).toBeVisible();
});

test("captures fixture overlay review images", async ({ page }, testInfo) => {
  test.setTimeout(360_000);

  for (const fixture of handFixtures) {
    await page.goto(`/?mode=fixtures&fixture=${fixture.id}`);
    await expect(
      page.getByRole("heading", { name: "Synthetic Hand Fixtures" }),
    ).toBeVisible();
    await expect(page.getByAltText(`${fixture.label} bare hand`)).toBeVisible();

    if (fixture.targetImagePath) {
      await expect(
        page.getByAltText(`${fixture.label} press-on target`),
      ).toBeVisible();
    } else {
      await expect(page.getByText("Expected result")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "No overlay" }),
      ).toBeVisible();
    }

    await expect(page.getByTestId("fixture-status-message")).toContainText(
      /Rendered|MediaPipe did not detect|failed|No visible nail beds/,
      { timeout: 60_000 },
    );

    await page.locator(".fixture-stage").screenshot({
      path: `test-results/fixture-overlays/${fixture.id}-${testInfo.project.name}.png`,
    });
  }
});

test("captures Shopify product overlay review images", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "The product review matrix is captured on desktop to keep default e2e runs bounded.",
  );

  for (const product of pressOnProducts) {
    for (const fixture of productReviewFixtures) {
      await page.goto(
        `/?mode=fixtures&fixture=${fixture.id}&product=${product.handle}`,
      );
      await expect(
        page.getByRole("heading", { name: "Synthetic Hand Fixtures" }),
      ).toBeVisible();
      await expect(page.getByText(product.title).first()).toBeVisible();
      await expect(
        page.getByAltText(`${fixture.label} bare hand`),
      ).toBeVisible();
      await expect(page.getByTestId("fixture-status-message")).toContainText(
        /Rendered|MediaPipe did not detect|failed/,
        { timeout: 60_000 },
      );

      await page.locator(".fixture-stage").screenshot({
        path: `test-results/product-overlays/${product.handle}-${fixture.id}-${testInfo.project.name}.png`,
      });
    }
  }
});
