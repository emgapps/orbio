import { expect, type Locator, type Page, test } from "@playwright/test";

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

  await dispatchCarouselWheel(carousel, 120);
  expect(await carousel.getAttribute("data-active-theme")).toBe("calm");
  expect(await activeLabel.textContent()).toBe("calm");

  await dispatchCarouselWheel(carousel, 150);
  await dispatchCarouselWheel(carousel, 300);
  await expect(carousel).toHaveAttribute("data-active-theme", "cosmic");
  await expect(activeLabel).toHaveText("cosmic");
  await expect(page.getByTestId("orb-cosmic")).toHaveAttribute("data-active", "true");

  await page.getByTestId("orb-default").click();
  await expect(carousel).toHaveAttribute("data-active-theme", "default");
  await expect(activeLabel).toHaveText("default");
  await expect(page.getByTestId("orb-default")).toHaveAttribute("data-active", "true");
});

test("keeps pinned carousel orbs anchored to the theme section while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 420 });
  await page.goto("/");

  const carousel = page.getByTestId("theme-carousel");
  const orb = page.getByTestId("orb-default");

  await expect(page.locator("[data-testid^='orb-']")).toHaveCount(3);
  await expect(orb).toBeVisible();

  const beforeCarousel = await carousel.boundingBox();
  const beforeOrb = await orb.boundingBox();
  expect(beforeCarousel).not.toBeNull();
  expect(beforeOrb).not.toBeNull();

  const beforeRelative = {
    x: beforeOrb!.x - beforeCarousel!.x,
    y: beforeOrb!.y - beforeCarousel!.y,
  };

  await page.evaluate(() => window.scrollTo(0, 160));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(80);

  const afterCarousel = await carousel.boundingBox();
  const afterOrb = await orb.boundingBox();
  expect(afterCarousel).not.toBeNull();
  expect(afterOrb).not.toBeNull();
  expect(afterCarousel!.y).toBeLessThan(beforeCarousel!.y - 80);

  const afterRelative = {
    x: afterOrb!.x - afterCarousel!.x,
    y: afterOrb!.y - afterCarousel!.y,
  };

  expect(Math.abs(afterRelative.x - beforeRelative.x)).toBeLessThan(2);
  expect(Math.abs(afterRelative.y - beforeRelative.y)).toBeLessThan(2);
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

test("restarts each theme audio track when switching active orb", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("audio-default")).toHaveAttribute("src", "/avatar.wav");
  await expect(page.getByTestId("audio-calm")).toHaveAttribute("src", "/avatar-pitched-down.wav");
  await expect(page.getByTestId("audio-cosmic")).toHaveAttribute("src", "/avatar-pitched-up.wav");

  await setAudioTime(page, "audio-calm", 3);
  await page.getByTestId("carousel-next").click();
  await expect(page.getByTestId("play-toggle")).toHaveText("Pause audio");
  await expect.poll(() => getAudioTime(page, "audio-calm")).toBeLessThan(1);
  await expect.poll(() => getAudioPaused(page, "audio-default")).toBe(true);

  await setAudioTime(page, "audio-cosmic", 3);
  await page.getByTestId("carousel-next").click();
  await expect(page.getByTestId("play-toggle")).toHaveText("Pause audio");
  await expect.poll(() => getAudioTime(page, "audio-cosmic")).toBeLessThan(1);
  await expect.poll(() => getAudioPaused(page, "audio-calm")).toBe(true);
});

test("keeps audio signal alive after unpinning and switching active orb", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("play-toggle").click();
  await expect(page.getByTestId("play-toggle")).toHaveText("Pause audio");
  await expect(page.getByTestId("orb-default")).toHaveAttribute("data-orb-state", "speaking");
  await waitForMeterAbove(page, "meter-rms");

  await page.getByTestId("pin-toggle").click();
  await expect(page.getByTestId("pin-toggle")).toHaveText("Pin");
  await page.getByTestId("theme-option-calm").click();
  await expect(page.getByTestId("orb-calm")).toHaveAttribute("data-orb-state", "speaking");
  await waitForMeterAbove(page, "meter-rms");

  await page.getByTestId("play-toggle").click();
  await expect(page.getByTestId("play-toggle")).toHaveText("Play audio");
  await page.getByTestId("play-toggle").click();
  await expect(page.getByTestId("play-toggle")).toHaveText("Pause audio");
  await waitForMeterAbove(page, "meter-rms");
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

async function dispatchCarouselWheel(locator: Locator, deltaY: number) {
  await locator.evaluate((node, nextDeltaY) => {
    node.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: nextDeltaY }));
  }, deltaY);
}

async function waitForMeterAbove(page: Page, testId: string, threshold = 0.001) {
  await page.waitForFunction(
    ({ meterTestId, minimum }) => {
      const value = Number(document.querySelector(`[data-testid="${meterTestId}"]`)?.textContent ?? "0");
      return value > minimum;
    },
    { meterTestId: testId, minimum: threshold },
  );
}

async function setAudioTime(page: Page, testId: string, time: number) {
  await page.getByTestId(testId).evaluate(
    async (node, nextTime) => {
      const audio = node as HTMLAudioElement;

      if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise<void>((resolve, reject) => {
          const handleLoad = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error("Audio metadata failed to load."));
          };
          const cleanup = () => {
            audio.removeEventListener("loadedmetadata", handleLoad);
            audio.removeEventListener("error", handleError);
          };

          audio.addEventListener("loadedmetadata", handleLoad);
          audio.addEventListener("error", handleError);
          audio.load();
        });
      }

      audio.currentTime = nextTime;
    },
    time,
  );
}

async function getAudioTime(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((node) => (node as HTMLAudioElement).currentTime);
}

async function getAudioPaused(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((node) => (node as HTMLAudioElement).paused);
}
