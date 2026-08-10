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
