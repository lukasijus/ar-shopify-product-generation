import { expect, test } from "@playwright/test";

test("loads the nail try-on prototype on desktop", async ({ page }) => {
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
