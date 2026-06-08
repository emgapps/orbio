import { expect, test } from "@playwright/test";

test("renders a nonblank orb and supports dragging", async ({ page }) => {
  await page.goto("/");

  const orb = page.getByLabel("Draggable voice orb");
  await expect(orb).toBeVisible();

  const rendererKind = await orb.locator("[data-renderer]").first().getAttribute("data-renderer");
  expect(rendererKind).toMatch(/^(webgl|css)$/);

  if (rendererKind === "webgl") {
    await page.waitForTimeout(250);
    const hasVisiblePixels = await orb.locator("canvas").evaluate((canvasNode) => {
      const canvas = canvasNode as HTMLCanvasElement;
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d");
      if (!context) return false;
      context.drawImage(canvas, 0, 0);
      const { data } = context.getImageData(0, 0, copy.width, copy.height);
      for (let index = 3; index < data.length; index += 64) {
        if (data[index] > 0) return true;
      }
      return false;
    });

    expect(hasVisiblePixels).toBe(true);
  }

  const before = await orb.boundingBox();
  expect(before).not.toBeNull();

  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width / 2 + 90, before!.y + before!.height / 2 + 50);
  await page.mouse.up();

  const after = await orb.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.x).toBeGreaterThan(before!.x + 40);
  expect(after!.y).toBeGreaterThan(before!.y + 20);
});

test("plays sample audio and moves into speaking state", async ({ page }) => {
  await page.goto("/");

  const orb = page.getByLabel("Draggable voice orb");
  await page.getByTestId("play-toggle").click();

  await expect(orb).toHaveAttribute("data-orb-state", "speaking");
  await expect(page.getByTestId("play-toggle")).toHaveText("Pause audio");
});
