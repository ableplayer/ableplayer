# AblePlayer Changelog

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

**Full Changelog**: https://github.com/ableplayer/ableplayer/compare/v4.5.1...v4.6.0