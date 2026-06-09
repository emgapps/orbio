import { expect, type Locator, test } from "@playwright/test";

const themes = ["default", "calm", "cosmic"] as const;

test("renders a pinned three-orb carousel and cycles the active theme", async ({ page }) => {
  await page.goto("/");

  const carousel = page.getByTestId("theme-carousel");
  const activeLabel = page.getByTestId("active-theme-label");
  await expect(carousel).toHaveAttribute("data-active-theme", "default");
  await expect(activeLabel).toHaveText("default");
  await expect(page.locator(".carousel-label")).toHaveCount(1);
  await expect(page.getByTestId("pin-toggle")).toHaveText("Unpin");
  await expect(page.getByTestId("theme-selector")).toHaveCount(0);

  for (const theme of themes) {
    await expect(page.getByTestId(`orb-${theme}`)).toBeVisible();
  }

  await expect(page.locator("[data-testid^='orb-']")).toHaveCount(3);
  await expect(page.getByTestId("orb-default")).toHaveAttribute("data-active", "true");
  await expectNonblankOrb(page.getByTestId("orb-default"));

  await page.getByTestId("carousel-next").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "calm");
  await expect(activeLabel).toHaveText("calm");
  await expect(page.getByTestId("orb-calm")).toHaveAttribute("data-active", "true");

  await carousel.evaluate((node) => {
    node.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 120 }));
  });
  await expect(carousel).toHaveAttribute("data-active-theme", "cosmic");
  await expect(activeLabel).toHaveText("cosmic");
  await expect(page.getByTestId("orb-cosmic")).toHaveAttribute("data-active", "true");

  await page.getByTestId("orb-default").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "default");
  await expect(activeLabel).toHaveText("default");
  await expect(page.getByTestId("orb-default")).toHaveAttribute("data-active", "true");
});

test("keeps graphic settings scoped to the active orb", async ({ page }) => {
  await page.goto("/");

  const carousel = page.getByTestId("theme-carousel");
  const speed = page.getByTestId("setting-speed");

  await expect(carousel).toHaveAttribute("data-active-theme", "default");
  await expect(speed).toHaveValue("1");

  await setRangeValue(speed, "1.4");
  await expect(speed).toHaveValue("1.4");

  await page.getByTestId("carousel-next").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "calm");
  await expect(speed).toHaveValue("0.72");

  await setRangeValue(speed, "0.8");
  await expect(speed).toHaveValue("0.8");

  await page.getByTestId("carousel-next").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "cosmic");
  await expect(speed).toHaveValue("1.18");

  await page.getByTestId("carousel-previous").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "calm");
  await expect(speed).toHaveValue("0.8");

  await page.getByTestId("carousel-previous").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "default");
  await expect(speed).toHaveValue("1.4");
});

test("unpinned mode leaves one draggable orb and remembers positions per theme", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("pin-toggle").click();
  await expect(page.getByTestId("pin-toggle")).toHaveText("Pin");
  await expect(page.getByTestId("theme-selector")).toBeVisible();
  await expect(page.locator("[data-testid^='orb-']")).toHaveCount(1);

  const orb = page.getByTestId("orb-default");
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
  await expect(page.getByTestId("position-readout")).toContainText(`x ${Math.round(after!.x)}`);

  await page.getByTestId("theme-option-calm").click();
  await expect(page.getByTestId("orb-calm")).toBeVisible();
  await expect(page.locator("[data-testid^='orb-']")).toHaveCount(1);
  await expect(page.getByTestId("setting-speed")).toHaveValue("0.72");

  await page.getByTestId("theme-option-default").click();
  const remembered = await page.getByTestId("orb-default").boundingBox();
  expect(remembered).not.toBeNull();
  expect(remembered!.x).toBeGreaterThan(before!.x + 40);
  expect(remembered!.y).toBeGreaterThan(before!.y + 20);

  await page.getByTestId("pin-toggle").click();
  await expect(page.getByTestId("pin-toggle")).toHaveText("Unpin");
  await expect(page.getByTestId("theme-selector")).toHaveCount(0);
  await expect(page.locator("[data-testid^='orb-']")).toHaveCount(3);
});

test("plays sample audio and moves visible orbs into speaking state", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("play-toggle").click();

  for (const theme of themes) {
    await expect(page.getByTestId(`orb-${theme}`)).toHaveAttribute("data-orb-state", "speaking");
  }

  await expect(page.getByTestId("play-toggle")).toHaveText("Pause audio");
});

async function expectNonblankOrb(orb: Locator) {
  await expect(orb.locator("[data-renderer]").first()).toBeAttached();

  const rendererKind = await orb.locator("[data-renderer]").first().getAttribute("data-renderer");
  expect(rendererKind).toMatch(/^(webgl|css)$/);

  if (rendererKind !== "webgl") return;

  await orb.page().waitForTimeout(250);
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

async function setRangeValue(locator: Locator, value: string) {
  await locator.evaluate((node, nextValue) => {
    const input = node as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
