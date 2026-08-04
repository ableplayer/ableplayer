import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated WCAG 2.1 A/AA scans (axe-core) over a representative set of the
 * demo pages, after Able Player has fully initialized.
 *
 * Scope and honesty:
 * - axe-core automates only a fraction of WCAG success criteria. A green run
 *   here means "no violations axe can detect on these pages" — it does NOT
 *   mean the player or the demos are accessible or conformant. Manual testing
 *   with assistive technology remains essential.
 * - Each page runs at four viewports (see playwright.config.js): reflow
 *   problems surface only at 320px, density/spacing problems only at 4K.
 * - YouTube/Vimeo iframe internals are third-party documents axe cannot audit
 *   cross-origin; the iframe subtree is excluded so the scan judges the
 *   player chrome and page shell we actually control.
 */

// Representative demo set: one page per major feature family.
const PAGES = [
  { path: "/demos/index.html", name: "demo index", player: false },
  { path: "/demos/video1.html", name: "video + captions", player: true },
  { path: "/demos/video5.html", name: "video + sign language + descriptions", player: true },
  { path: "/demos/audio1.html", name: "audio player", player: true },
  { path: "/demos/audio3.html", name: "audio + interactive transcript", player: true },
  { path: "/demos/desc1.html", name: "video + audio description", player: true },
  { path: "/demos/youtube1.html", name: "YouTube page shell", player: true, thirdPartyIframe: true },
];

for (const demo of PAGES) {
  test(`${demo.name} (${demo.path}) — axe WCAG 2.1 A/AA scan`, async ({ page }) => {
    const response = await page.goto(demo.path);
    expect(response?.ok(), `expected ${demo.path} to serve 200`).toBeTruthy();

    if (demo.player) {
      // Able Player rebuilds the media element into its accessible UI on
      // DOM ready; scanning before that would audit the wrong DOM.
      await page.waitForSelector(".able-wrapper", { timeout: 20_000 });
      // Let the controller finish its first layout pass (icons, tooltips).
      await page.waitForSelector(".able-controller", { timeout: 20_000 });
    }

    let builder = new AxeBuilder({ page }).withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
    ]);

    // Third-party iframe internals (YouTube/Vimeo) are cross-origin documents
    // we neither control nor can meaningfully audit from here.
    if (demo.thirdPartyIframe) {
      builder = builder.exclude("iframe");
    }

    const results = await builder.analyze();

    // Compact, reviewable failure output: rule id, impact, node count.
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`,
    );
    expect(summary, `axe violations on ${demo.path}`).toEqual([]);
  });
}
