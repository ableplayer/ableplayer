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
 * - Each page runs at four viewports (see playwright.config.js): the same
 *   markup can pass at 1280px and fail at 320px or 4K, so every page is
 *   scanned at all four rather than at one representative size.
 * - Violations inside a YouTube or Vimeo document belong to the provider, so
 *   those subtrees are excluded by policy (axe can reach into frames; we
 *   choose not to act on findings we cannot fix). The scan judges the player
 *   chrome and page shell we control.
 * - Note on the YouTube page: on develop its embed does not currently
 *   initialize (initSignLanguage throws when the media element has no
 *   <source> children), so today that entry scans the surrounding page shell
 *   rather than a live YouTube player.
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

    // Policy exclusion, not a technical limit: axe does inject into frames,
    // but violations inside a YouTube or Vimeo document are the provider's to
    // fix, and letting them fail this job would make the gate unactionable.
    // Trade-off worth knowing: excluding the element also drops frame-title
    // (SC 4.1.2) on the embed itself, which IS ours — worth a dedicated
    // assertion if the embed path is ever covered directly.
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
