# AblePlayer Changelog

## 5.1.0 TBD

### Features

- Add `strict-mode` to have transcripts to handle parentheses and square brackets as normal text.
- Add `options` parameter to the AblePlayer class instantiation, supporting all `data-` attributes, strings, and icons.

### Accessibility
- Fix behavior of seekhead so that rapid or shaky mouse movements don't cause tracking to be lost.
- Popup handling for settings in Sign and Transcript windows was broken for keyboard.
- Improvements to design and focus handling in Windows High Contrast Mode.
- Changed controls from `div[role="button"]` to `button`.
- Change labels on speaking rates to reflect actual values

### Bug fixes

- Add the seek interval value to rewind and forward buttons, to provide better user information.
- Add the expected new speed value to playback speed controls.
- Move seekbar tooltip closer to seekbar. It had moved further away when the seekhead size was increased.
- Limit sign language resizing to match aspect ratio.
- Allow YouTube iframe sign language to exceed 640px width.
- Fix incorrect data-lang check for similar languages.
- Improve parsing of VTT files to better handle a variety of edge cases. (props @conorom)
- Improve handling of drag and resize events.
- Bug fix: events triggered from outside the player triggered errors due to assumed classes.
- Modified preferences dialog generation so dialogs are only generated once per page and re-used, rather than generating four dialogs per player.

### Design
- Increase size and add hover state to seekbar.
- Move bottom positioning of seekbar tooltip from JS into CSS.
- Update drag-drop icon and change base background color of sign language container.
- Move popup menus to prevent collision with focus outlines
- Adjust size and padding of VTS icons.
- Change speaking rate input to numeric.
- Add generic `able-captions-container` class and set background color to match player.

### Performance
- Improve performance of time slider by deduplicating events and adding queues/caching.

### Code Quality
- Move drag handle and resize handle icons into the icon store.
- Change constructor into a class instance.
- Remove obsolete Firefox stopgap in popup keyboard controller.
- Use AblePlayer.getActiveDOMElement() to get focused elements.

## 5.0.0 June 21, 2026

### Features

- Can be installed and bundled as an NPM package with a new ES module entry point `ableplayer.esm.js`. Tested with Vue and Vite, should also be compatible with other stacks with webpack, React, etc.
- No longer exposes anything on `window`, except the UMD bundles when used as an IIFE, which only add `AblePlayer`. UMD bundles tested to work properly with RequireJS.
- Code cleaned up to run in "strict" mode, which is required for ES modules.
- Can be dynamically created and disposed indefinitely without memory leaks or event handling issues. Use `new AblePlayer(media)` and `instance.dispose()`.
- TypeScript type definitions for `ableplayer.esm.js`.
- Source maps for all bundles.
- Support for Spoken Captions. New options in Captions settings menu to enable automatic voicing of captions.

### Design

- Default CSS now limits the max width of the `video` element loading Able Player to 100%.
- Added new class `.ableplayer-clear`, used only in legacy display options.
- Separator between elapsed time and total duration is now a separate `span class="able-timer-separator"`.

### Non-breaking changes

- Audited translation files and removed 38 translatable strings that were unused or duplicated by other strings.
- Removed all inline scripts and styles from Able Player core.
- Removed unused parameters from the AccessibleSlider component.

### Breaking changes

- `data-root-path` no longer supported (or needed, in most cases). Translations are now bundled, and icons are always hard-coded SVGs. For most users this is an improvement, since translations and icons no longer need to be hosted separately, and translations are no longer `fetch`ed in a loop. Once you migrate, you can delete `button-icons` and `translations` from your application. However, to add custom translations, you will need to build your own bundle, and custom icons are no longer possible.
  - Relatedly, `data-icon-type` no longer supported, since the icons are now always hard-coded SVGs.
  - There are plans for a future release to allow configuration in `new AblePlayer` to add custom translations and icons.
- Various things Able Player added to `window` are moved or no longer exposed.
  - `window.AblePlayerInstances` -> `AblePlayer.ablePlayerInstances`. Previously, dynamically creating an Able Player required applications to manually add the new instance to `window.AblePlayerInstances`. Code doing this will no longer work. To migrate, just call `new AblePlayer` and it will automatically add itself to `AblePlayer.ablePlayerInstances`. Don't forget to call `dispose()` to dynamically remove instances from this list. This list is now a `Set` rather than an array, but most applications won't need to access it directly anymore.
  - UMD bundles that include DOMPurify no longer expose it on `window`. If you need DOMPurify on `window`, migrate to the `separate-dompurify` bundle, and include DOMPurify in a separate `<script>` tag.
  - Able Player internals are no longer exposed on `window`.
    - `window.AccessibleDialog`
    - `window.AccessibleSlider`
    - `window.validate`
- Able Player is now built expecting browsers to support ES 2022. 95% of browsers support ES 2022, compared to 96% for ES 2015. Use Babel or similar to transpile to older ES versions, if you're sure you need one. Able Player 4.8.0 was already using `Object.hasOwn` which is part of ES 2022, but those will now be more widespread, so new breakage is possible.

### Bug fixes

- Region-specific language tags are supposed to have the region capitalized. The affected translations are `pt-BR` and `zh-TW`. Able Player was lowercasing them before.
- Various issues with Vimeo error handling. The `catch` blocks were referencing nonexistent variables.
- Fix prev/next item navigation in playlists.
- Display volume value as a percentage in all cases.
- Update seekbar width to be expressed in percentages.
- Fix handling of `data-lang` attribute so language is detected more consistently.

### Code cleanup

- Able Player now passes `eslint`'s "recommended" rule set. In the process, we fixed some values that were always `undefined` before, for example: `this.lang`, and the `lang` values in `getSampleDescriptionText`. This shouldn't break anything, but, worth mentioning just in case someone was relying on these values being `undefined`.

### Documentation

- Added documentation about Able Player's Content Security Policy requirements.

### Internationalization

- Added Slovak translation (props @rraddatch - Radoslav Ďurač)
- Updated Catalan translation (props @ralcarazm)
- Updated Dutch translation (props @rianrietveld)

**Full Changelog**: https://github.com/ableplayer/ableplayer/compare/v4.8.0...v5.0.0

## 4.8.0 February 6th, 2026

### Features

- New preference to allow users to disable keyboard shortcuts.
- Make Cookies.js an optional dependency. If not present, uses localStorage for user preferences.
- Add support for a fixed location for sign videos defined by `data-sign-div`.
- Add support for an audio poster image defined by `data-poster` for the image URL and `data-poster-alt` for the alternative text.
- Added new demo to view player in translation at https://ableplayer.github.io/ableplayer/demos/translations.html
- Hide transcript and description preferences if not applicable to the current player.

### Styling

- Set border-box on chapter buttons to prevent overflow.
- Removed border-radius on big player button.
- Apply both background and background-color styles on big player button, to limit bleed from outside styles.
- Set both color and background on VTS alerts.
- Remove right margin on checkbox labels in draggable windows.
- Use CSS transitions in place of JS animations.
- New styles to support Audio Poster image positioning.

### Bug fixes

- Added a timeout to resolve promise looking for YouTube captions if they don't load, so player doesn't fail on YouTube videos with no captions.
- Remove setFullscreen(false) when rebuilding player, which prevented the fullscreen button from reacting to changes.
- Improvements to draggable window positioning calculations.
- Check button status before redrawing controls to prevent unnecessary repaints
- Fix broken internal timestamp tags due to sanitization.

### Internationalization

- Add new translation method `this.translate( 'key', 'Default %1 String', [ args ] )`.
-- supports arguments so strings with arguments can be handled as a single string.
-- ensures that if translations don't load, the player will still render.
-- ensure that default strings are available in the code at the point of editing, for easier comprehension.
- Added missing strings to translatable strings; mostly in the Transcript Sorter.

### Responsiveness

- Update positioning of transcript or sign windows when a user goes full screen to ensure that they are still onscreen and visible.
- Restore positioning of transcript or sign windows after existing full screen.
- Remove fullscreen polyfill intended to support browser without support for the FullScreen API

### Accessibility

- Added a visible drag handle in draggle windows (Sign language and Transcript.)
- Only the visible drag handle is a draggable surface, to prevent unexpected changes.
- Removed duplicate screen reader text from player controls.

### Code clean-up and modernization

- Removed references and code for helpDialog.
- Remove Fullscreen polyfill
- Miscellaneous removals of unused variables and arguments.
- Reduced the jQuery dependency to jQuery Slim
-- Uses native promises
-- Uses native AJAX queries
-- Eliminates JS animations

## 4.7.0 September 28th, 2025

### Styling

- New default theme with modernized layout and variables for colors.
  - This summarizes a large number of individually small changes to the layout and styling of Able Player elements.
- Removed somes instances of positioning imposed from JS so positioning is more controllable from CSS.
- Significant improvements to responsive design and behaviors.
- Removed fixed width and height set on big play button.
- Make big play button partially transparent.

### Features

- Add support for synchronized sign language sourced from YouTube
- Allow modal dialogs to be closed by clicking on the modal overlay.
- Support toggling the transcript area when using a pre-defined transcript area.
- Allow non-standard support for single character hours value in VTT timestamp formats.

### Bug fixes

- Fix window resizing issue in sign language windows.
- Reset scroll position after closing fullscreen to prevent unexpected shift of position.
- Remove deprecated `modestbranding` parameter from YouTube player params.
- Add `origin` property to YouTube player params.
- Reduce fullscreen timeout from 1000ms to 100ms. Ensures the resize method executes when leaving fullscreen quickly.
- Track active media so focus is sent to correct player after refreshing controls.
- Change modal dialog positioning to fixed to prevent unexpected shifts of position.
- Properly disable `transcript` with `data-include-transcript="false"`
- Cookie referred to wrong variable when setting sign language data.
- Prevent scrolling of background content when modals are active.
- Allow the audio description text panel to show when there is both a VTT and a described video.
- Handle `data-skin` set to invalid value.
- Prevent floating windows from being positioned above the top of the viewport.
- Ensure last block of captions in transcript are wrapped in `.able-transcript-block`.
- Use `outerHeight` in several places where `height` was used so calculations account for whole element height.
- Fix unwanted lines generated in lyrics mode.
- Verify the target transcript div exists before setting the external div flag.
- Support the default value for the `kind` attribute on `source` when omitted.
- Method to closePopups ran on every click, rather than only when popups were opened.
- Classname replacement in processing VTT tags replaced spaces with `.` instead of the reverse. Props @jeanem.

### Accessibility

- Ensure all Able Player controls meet WCAG SC 2.5.8 by being a minimum of 24px by 24px.
- Make visible alerts dismissible
- Extend default period of visibility for expiring alerts to 20 seconds.
- Improve accessibility of draggable containers when using a screen reader. More predictable keyboard handling & audible feedback.

### Internationalization

- Change all translation files from JS containing a JSON object to `.json`. Fallback to .js files if JSON sources not found.
- Add `ms` and `pl` to list of supported languages.
- Add several new strings to translation files. (Translations needed.)

### Build tools & Code clean up

- Change `ableplayer.dist.js` build to remove comments, reducing the dist file size by about 150Kb.
- Simplify if/else statements. Use ternary or swithc where appropriate or collapse arguments.
- Reformat if/else statements to remove line breaks before `else`.
- Remove `$ableColumnLeft` - unused and unidentified variable.
- Remove unneeded -moz and -mix prefixed fullscreen properties.
- Only create a single alertBox container and move in DOM as needed instead of managing three separate containers.
- Add new prototype to set the text for buttons.
- Add new prototype to set icons for buttons.
- Make use of existing `ucfirst` prototype.
- Remove `number.isInteger` polyfill (already unused).
- Remove tests for `svg` support.
- Remove remaining IE compatibility supports.
- Replace `e.which` with `e.key`.
- Remove obsolete Safari keycodes.
- Add prototype for syncing sign language video.
- Remove unused prototype `AblePlayer.prototype.isCloseToCorner`.
- Remove unused `mediaType` argument from AccessibleSlider prototype.

## 4.6.0 June 23rd, 2025

### Styling
- Change default skin to "2020".
- Removed IE-specific styles.
- Fix overflowing bottom border on transcript container & set padding to fixed value.
- Remove inline CSS forcing center alignment on dialog headings.
- Improvements to dialog layout.
- Increase size of volume slider.
- Set `video` element to `display: block;` to prevent extra space after element.
- Style updates to Video Transcript Sorter tool.
- Force `iframe` to 100% max-width 100% to prevent overflowing container.
- Updated transcript & sign language container settings, settings tooltip, and settings popup.

### HTML
- Add wrapper around the left and right control containers.
- Change dialog close button from 'X' to '×', to improve alignment.
- Wrap VTS header in `thead` element.
- Add `type="button"` to big play button.

### Bug Fixes
- Fix `data-vimeo-id` loading.
- Fix failure of Safari/MacOS on getVoices for speechSynthesis.
- Improve speech initialization for Linux browsers.
- Fix loading of preferences across players.
- Replace deprecated jQuery methods: `.click`, `.focus`, `.change`, `.keydown`, `$.trim()`, and `.isNumeric`.
- Extensive removals of unused variables and unused code.
- Limit default maxwidth on transcript and sign containers to no larger than viewport.

### Accessibility
- Use `inert` to represent interactivity state of content outside of modals.
- Remove `role` and `aria-label` on transcript containers if they are not inside a dialog.
- Fix caption sizing on small viewports.
- Render volume percentage in the initial volume button state & updates.
- Fix translation rendering so Full Screen buttons are properly labeled.
- Add `aria-atomic="true"` on the speed notification container.
- `tabindex` missing from draggable toolbar, preventing focus from being sent and breaking keyboard support.
- Update visible order of draggable toolbar controls, so focus order matches visible order.

### Features
- Add support for secondary sign language locally when sourcing main video from YouTube.

### Security
- Update DOMPurify to version 3.2.6; improve validations.
- Add URL validation to src, audio description src, sign src, and track URLs.
- Add sanitization to YouTube IDs, track titles.
- Update Vimeo URL parsing.

### Internationalization
- Fixed issues in Polish, Canadian, and Indonesian translations.
- Fix translations references for full screen text strings.
- Added Malay translation.

### Release Assets
- Removed build tools, unbuilt scripts, demos, and media assets from the release archives. You will need to check out the repository to have access to these resources. Reduces the zip download from over 160 MB to under 1 MB.

### Demos & Docs
- Made demo pages responsive.
- Updated demo pages to have more similar styles to docs.
- Broke Contributing into a separate doc.
- Updated Jekyll template to add navigation to docs header.
- Updated main readme to add in-page navigation.
- Reorganized main readme.

### Contributors

The following people contributed to this release (if I missed you, please let me know!)

@terrill, @candideu, @xerc, @jbylsma, @amartincua, @zwiastunsw, @conorom, @jeanem, @joedolson, @Justryuz, @dependabot
