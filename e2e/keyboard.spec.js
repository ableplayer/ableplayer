import { test, expect } from "@playwright/test";

/**
 * Keyboard operability checks for the initialized player — the half of
 * accessibility testing axe cannot do. axe inspects the static accessibility
 * tree; it cannot prove the player is reachable by Tab, that play/pause is
 * operable with a keyboard, or that focus stays visible.
 *
 * Deliberately small scope for a first suite: reachability, operability of
 * the primary control, and a visible focus indicator. It does not attempt to
 * cover Able Player's full keyboard model (modifier hotkeys, seekbar arrows,
 * preference dialogs) — those deserve dedicated specs over time.
 *
 * Runs at all four viewports (playwright.config.js): a control that falls out
 * of the tab order or loses its focus ring at one breakpoint still fails.
 */

const DEMO = "/demos/video1.html";

/** Read the active element's identity synchronously (never auto-waits). */
async function activeInfo(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: "body", cls: "", label: "" };
    return {
      tag: el.tagName.toLowerCase(),
      cls: el.className || "",
      label: el.getAttribute("aria-label") || (el.textContent || "").trim(),
    };
  });
}

/** True when the focused element shows a rendered outline or box-shadow ring. */
async function focusedHasVisibleRing(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    const outlineVisible =
      style.outlineStyle !== "none" &&
      parseFloat(style.outlineWidth) > 0 &&
      // A fully transparent outline is not a visible indicator. Able Player's
      // own :focus rule paints a solid var(--able-focus-outline), so this
      // guards against a theme that overrides the color to transparent.
      !/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(style.outlineColor) &&
      style.outlineColor !== "transparent";
    const shadowVisible = style.boxShadow !== "none" && style.boxShadow !== "";
    return outlineVisible || shadowVisible;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForSelector(".able-controller", { timeout: 20_000 });
});

test("player controls are reachable by Tab from the top of the document", async ({ page }) => {
  // Walk the tab ring from the document start. The page has a small nav
  // (2 links) before the player; 40 stops is a generous ceiling that still
  // fails fast if the player is unreachable.
  let reachedPlayer = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const info = await activeInfo(page);
    if (info.tag === "body") break; // wrapped: end of ring, player never seen
    if (/able-/.test(info.cls) || (await page.evaluate(() =>
      Boolean(document.activeElement?.closest(".able-wrapper")),
    ))) {
      reachedPlayer = true;
      break;
    }
  }
  expect(reachedPlayer, "tabbing must reach the Able Player UI").toBe(true);
});

test("play/pause is keyboard-operable and announces its state", async ({ page }) => {
  const playButton = page.locator(".able-button-handler-play").first();
  await playButton.focus();

  const before = await playButton.getAttribute("aria-label");
  expect(before, "play/pause control must have an accessible name").toBeTruthy();

  await page.keyboard.press("Enter");

  // Media playback must actually start (paused flips false) — the control is
  // operable, not merely focusable.
  await expect
    .poll(async () => page.evaluate(() => document.querySelector("video, audio")?.paused), {
      timeout: 10_000,
      message: "pressing Enter on the play control must start playback",
    })
    .toBe(false);

  // And the accessible name must flip to reflect the new state (Play → Pause
  // family — exact string is locale/config dependent, so assert change only).
  await expect
    .poll(async () => playButton.getAttribute("aria-label"), {
      timeout: 10_000,
      message: "the control's accessible name must update after activation",
    })
    .not.toBe(before);

  // Enter again pauses — round trip proves both directions are operable.
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => page.evaluate(() => document.querySelector("video, audio")?.paused), {
      timeout: 10_000,
      message: "pressing Enter again must pause playback",
    })
    .toBe(true);
});

test("focused player controls show a visible focus indicator", async ({ page }) => {
  const playButton = page.locator(".able-button-handler-play").first();
  await playButton.focus();
  expect(
    await focusedHasVisibleRing(page),
    "the focused play control must render a visible focus ring",
  ).toBe(true);
});

/* ---------- Full control coverage for video1.html ---------- */

const mediaState = (page) =>
  page.evaluate(() => {
    const v = document.querySelector("video");
    return { t: v.currentTime, paused: v.paused, rate: v.playbackRate, volume: v.volume };
  });

/** Pause and seek the media to a known position before a control test. */
async function seedTime(page, seconds) {
  await page.evaluate(async (s) => {
    const v = document.querySelector("video");
    v.pause();
    await new Promise((resolve) => {
      v.addEventListener("seeked", resolve, { once: true });
      v.currentTime = s;
    });
  }, seconds);
}

const btn = (page, name) => page.locator(`.able-controller button.able-button-handler-${name}`);

test("restart returns to the beginning and starts playback", async ({ page }) => {
  await seedTime(page, 20);
  await btn(page, "restart").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await mediaState(page)).paused, { timeout: 10_000 }).toBe(false);
  // Playback began from the start, not from 20s.
  expect((await mediaState(page)).t).toBeLessThan(5);
});

test("rewind and forward move the playhead by the seek interval", async ({ page }) => {
  await seedTime(page, 20);
  const interval = await page.evaluate(() => {
    const m = document.querySelector(".able-button-handler-forward").getAttribute("aria-label");
    return Number(m.match(/\d+/)[0]);
  });
  expect(interval).toBeGreaterThan(0);

  await btn(page, "forward").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await mediaState(page)).t).toBeCloseTo(20 + interval, 0);
  // Able Player tracks elapsed time from timeupdate; wait for its display to catch up.
  await expect(page.locator(".able-elapsedTime")).toHaveText(`00:${20 + interval}`);

  await btn(page, "rewind").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await mediaState(page)).t).toBeCloseTo(20, 0);
});

test("rewind does not go below zero", async ({ page }) => {
  await seedTime(page, 3);
  await btn(page, "rewind").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await mediaState(page)).t).toBeLessThan(0.5);
});

test("faster and slower adjust the playback rate in 0.25 steps", async ({ page }) => {
  expect((await mediaState(page)).rate).toBe(1);

  await btn(page, "faster").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await mediaState(page)).rate).toBe(1.25);
  await expect(page.locator(".able-speed")).toContainText("1.25");

  await btn(page, "slower").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await mediaState(page)).rate).toBe(0.75);
  await expect(page.locator(".able-speed")).toContainText("0.75");
});

test("able-popup menus contain the expected items", async ({ page }) => {
  const items = async (idSuffix) =>
    page.evaluate(
      (s) =>
        [...document.querySelectorAll(`.able-popup[id$="${s}"] > li`)].map((li) => ({
          text: li.textContent.trim(),
          role: li.getAttribute("role"),
        })),
      idSuffix,
    );

  expect(await items("-prefs-menu")).toEqual([
    { text: "Captions", role: "menuitem" },
    { text: "Keyboard", role: "menuitem" },
    { text: "Transcript", role: "menuitem" },
  ]);
  expect(await items("-captions-menu")).toEqual([
    { text: "English captions", role: "menuitemradio" },
    { text: "Captions off", role: "menuitemradio" },
  ]);
  expect(await items("-transcript-window-menu")).toEqual([
    { text: "Move", role: "menuitem" },
    { text: "Resize", role: "menuitem" },
    { text: "Close", role: "menuitem" },
  ]);
});

test("preferences menu opens, focuses its first item, and arrows move focus", async ({ page }) => {
  const prefs = btn(page, "preferences");
  await prefs.focus();
  await page.keyboard.press("Enter");
  await expect(prefs).toHaveAttribute("aria-expanded", "true");

  const menuItems = page.locator('.able-popup[id$="-prefs-menu"] > li');
  await expect(menuItems.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menuItems.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menuItems.nth(2)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menuItems.nth(1)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(prefs).toHaveAttribute("aria-expanded", "false");
  await expect(prefs).toBeFocused();
});

test("volume slider sets the expected volume", async ({ page }) => {
  const volume = btn(page, "volume");
  await volume.focus();
  await page.keyboard.press("Enter");
  await expect(volume).toHaveAttribute("aria-expanded", "true");

  const range = page.locator(".able-volume-slider input[type=range]");
  await expect(range).toBeFocused();

  await range.fill("3");
  await expect.poll(async () => (await mediaState(page)).volume).toBeCloseTo(0.3, 2);
  await expect(volume).toHaveAttribute("aria-label", /30%/);

  await page.keyboard.press("ArrowUp");
  await expect.poll(async () => (await mediaState(page)).volume).toBeCloseTo(0.4, 2);
  await expect(volume).toHaveAttribute("aria-label", /40%/);
});

test("captions button toggles captions on and off", async ({ page }) => {
  const captions = btn(page, "captions");
  const labelBefore = await captions.getAttribute("aria-label");

  await captions.focus();
  await page.keyboard.press("Enter");
  await expect(captions).not.toHaveAttribute("aria-label", labelBefore);
  const labelOff = await captions.getAttribute("aria-label");

  await page.keyboard.press("Enter");
  await expect(captions).toHaveAttribute("aria-label", labelBefore);
  expect(labelOff).not.toBe(labelBefore);
});

test("transcript button opens the transcript and moves focus into it", async ({ page }) => {
  const toggle = btn(page, "transcript");
  const area = page.locator(".able-transcript-area");
  await expect(area).toBeHidden();

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(area).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest(".able-transcript-area"))))
    .toBe(true);

  // The window menu moves focus between Move / Resize / Close. Able Player
  // ignores keys on the window button for ~100ms after it takes focus.
  await page.waitForTimeout(250);
  await page.keyboard.press("Enter");
  const windowItems = page.locator('.able-popup[id$="-transcript-window-menu"] > li');
  await expect(windowItems.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(windowItems.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(windowItems.nth(2)).toBeFocused();
});

test("fullscreen toggles on and off without losing focus", async ({ page }) => {
  const fs = btn(page, "fullscreen");
  const state = () =>
    page.evaluate(() => ({
      full: Boolean(document.fullscreenElement),
      inPlayer: Boolean(document.activeElement?.closest(".able-wrapper")),
    }));

  await fs.focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await state()).full, { timeout: 10_000 }).toBe(true);
  expect((await state()).inPlayer, "focus stays in the player in fullscreen").toBe(true);

  await page.keyboard.press("Enter");
  await expect.poll(async () => (await state()).full, { timeout: 10_000 }).toBe(false);
  expect((await state()).inPlayer, "focus stays in the player after exit").toBe(true);
});

test("clicking a transcript line seeks to that line and plays", async ({ page }) => {
  await btn(page, "transcript").click();
  const area = page.locator(".able-transcript-area");
  await expect(area).toBeVisible();

  const target = area.locator("span.able-transcript-seekpoint[data-start]").nth(3);
  const start = Number(await target.getAttribute("data-start"));
  expect(start).toBeGreaterThan(0);

  await target.click();
  await expect.poll(async () => (await mediaState(page)).paused, { timeout: 10_000 }).toBe(false);
  const { t } = await mediaState(page);
  expect(t).toBeGreaterThanOrEqual(start - 0.5);
  expect(t).toBeLessThan(start + 3);
});
