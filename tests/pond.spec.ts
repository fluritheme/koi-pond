import { test, expect } from "@playwright/test";
import type { KoiPondController } from "../src/types.js";
declare global {
  interface Window {
    koi: KoiPondController;
  }
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.koi?.getState().ready))
    .toBe(true);
});
test("immediate living pond renders real pixels and autonomous fish without waiting for a button", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator("#pond canvas[data-fluri-koi]")).toBeVisible();
  const before = await page.evaluate(() => window.koi.getState());
  expect(before.fish).toHaveLength(8);
  await expect
    .poll(() => page.evaluate(() => window.koi.getState().elapsed))
    .toBeGreaterThan(before.elapsed + 0.3);
  const pixels = await page.locator("canvas").evaluate((canvas) => {
    const c = canvas as HTMLCanvasElement;
    return [
      ...c.getContext("2d")!.getImageData(c.width / 2, c.height / 2, 1, 1).data,
    ];
  });
  expect(pixels[3]).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test("feeding creates real food which koi consume and night changes the water state", async ({
  page,
}) => {
  await page.evaluate(() => {
    const f = window.koi.getState().fish[0]!;
    window.koi.feed(f.x + 5, f.y + 5);
  });
  await expect
    .poll(() => page.evaluate(() => window.koi.getState().fed))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Moonlit water" }).click();
  expect(await page.evaluate(() => window.koi.getState().night)).toBe(true);
  await page.getByRole("button", { name: "Come together" }).click();
  expect(await page.evaluate(() => window.koi.getState().mode)).toBe("gather");
});
test("fast native scrolling preserves local fish position and root alignment, host links keep working", async ({
  page,
}) => {
  await page.evaluate(() => window.koi.pause());
  const before = await page.evaluate(() => window.koi.getState().fish);
  for (const scroll of [180, 40, 320, 0, 240, 20]) {
    await page.evaluate((y) => scrollTo(0, y), scroll);
    await page.waitForTimeout(30);
    const geometry = await page.evaluate(() => {
      const root = document.querySelector("#pond")!.getBoundingClientRect(),
        canvas = document.querySelector("canvas")!.getBoundingClientRect();
      return {
        x: Math.abs(root.left - canvas.left),
        y: Math.abs(root.top - canvas.top),
        width: Math.abs(root.width - canvas.width),
      };
    });
    expect(geometry.x).toBeLessThan(1);
    expect(geometry.y).toBeLessThan(1);
    expect(geometry.width).toBeLessThan(1);
  }
  expect(await page.evaluate(() => window.koi.getState().fish)).toEqual(before);
  expect(await page.locator("header a").first().getAttribute("href")).toBe(
    "https://fluri.xyz/",
  );
  expect(
    await page
      .locator("canvas")
      .evaluate((c) => getComputedStyle(c).pointerEvents),
  ).toBe("none");
});
test("respect reduced motion and pause, configurable density, safe updates and complete cleanup", async ({
  page,
}) => {
  await page.evaluate(() => window.koi.update({ reducedMotion: true }));
  const before = await page.evaluate(() => window.koi.getState().elapsed);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.koi.getState().elapsed)).toBeCloseTo(
    before,
    1,
  );
  const body = await page.locator("body").getAttribute("style");
  const root = await page.locator("#pond").getAttribute("style");
  expect(
    await page.evaluate(() => {
      try {
        window.koi.update({ palette: "javascript:alert(1)" } as never);
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page.evaluate(() => {
    window.koi.update({ fishCount: 12, palette: "lagoon" });
    window.koi.pause();
  });
  expect(await page.evaluate(() => window.koi.getState().fish.length)).toBe(12);
  await page.evaluate(() => {
    window.koi.destroy();
    window.koi.destroy();
  });
  await expect(page.locator("canvas[data-fluri-koi]")).toHaveCount(0);
  expect(await page.locator("body").getAttribute("style")).toBe(body);
  expect(await page.locator("#pond").getAttribute("style")).toBe(root);
  await expect(page.locator("h1")).toBeVisible();
});
test("tap interactions do not prevent scrolling and work on a transformed bounded root", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.koi.pause();
    const root = document.querySelector("#pond") as HTMLElement;
    root.style.transform = "translateX(5px) scale(.95)";
  });
  await page.setViewportSize({ width: 740, height: 900 });
  await page.waitForTimeout(100);
  const point = await page.locator("#pond").boundingBox();
  await page.mouse.click(
    point!.x + point!.width * 0.5,
    point!.y + point!.height * 0.5,
  );
  expect(await page.evaluate(() => window.koi.getState().food)).toBe(0);
  await page.evaluate(() => window.koi.resume());
  await page.mouse.click(
    point!.x + point!.width * 0.5,
    point!.y + point!.height * 0.5,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.koi.getState().food + window.koi.getState().fed,
      ),
    )
    .toBeGreaterThan(0);
  const align = await page.evaluate(() => {
    const r = document.querySelector("#pond")!.getBoundingClientRect(),
      c = document.querySelector("canvas")!.getBoundingClientRect();
    return (
      Math.abs(r.x - c.x) +
      Math.abs(r.y - c.y) +
      Math.abs(r.width - c.width) +
      Math.abs(r.height - c.height)
    );
  });
  expect(align).toBeLessThan(2);
});
