/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */

import $ from 'jquery';
import DOMPurify from 'dompurify';

// maintain an array of Able Player instances for use globally (e.g., for keeping prefs in sync)
// 5.0.0: this is now a Set to make it easier to create and destroy players
const ablePlayerInstances = new Set();

/**
 * Performs one-time setup on `window`.
 *
 * Does nothing if `window` is not available, for example in SSR.
 */
function ablePlayerSetupWindow() {
	if (typeof window === 'undefined') {
		console.log("`window` is undefined. Skipping one-time Able Player `window` setup.");
		return;
	}
	$(function () {
		if (typeof DOMPurify === 'undefined') {
			console.warn('Required dependency DOMPurify not available. Please use the full Able Player bundle which has DOMPurify built in. Or, keep using this bundle, and include DOMPurify separately.')
		}

		$('video, audio').each(function (index, element) {
			if ($(element).data('able-player') !== undefined) {
				new AblePlayer($(this),$(element));
			}
		});
	});

	// YouTube player support; pass ready event to jQuery so we can catch in player.
	window.onYouTubeIframeAPIReady = function() {
		AblePlayer.youTubeIframeAPIReady = true;
		$('body').trigger('youTubeIframeAPIReady', []);
	};

	// If there is only one player on the page, dispatch global keydown events to it
	// Otherwise, keydowwn events are handled locally (see event.js > handleEventListeners())
	$(window).on('keydown',function(e) {
		if (AblePlayer.hasSingleInstance()) {
			const singleInstance = AblePlayer.getSingleInstance();
			singleInstance.onPlayerKeyPress(e);
		}
	});
}

/**
 * Construct the AblePlayer object.
 *
 * Able Player needs `window` to instantiate, so, skip the constructor if
 * you are running outside the browser (for example, SSR).
 *
 * @param object media jQuery selector or element identifying the media.
 * @param object options Optional configuration options for the player.
 */
class AblePlayer {
	constructor(media) {

		if (typeof window === 'undefined') {
			console.warn("`window` is undefined. Able Player needs `window` to instantiate. Skip constructing Able Player if you are running outside a browser (for example, SSR).");
			return;
		}

		var thisObj = this;

		this.media = media;

		if ($(media).length === 0) {
			this.provideFallback();
			return;
		}

		// Default variables assignment
		// The following variables CAN be overridden with HTML attributes
		// autoplay (Boolean; if present always resolves to true, regardless of value)
		if ($(media).attr('autoplay') !== undefined) {
			this.autoplay = true; // this value remains constant
			this.okToPlay = true; // this value can change dynamically
		} else {
			this.autoplay = false;
			this.okToPlay = false;
		}

		let data = media[0].dataset;

		// loop (Boolean; if present always resolves to true, regardless of value)
		this.loop = (data.loop !== undefined) ? true : false;

		// playsinline (Boolean; if present always resolves to true, regardless of value)
		this.playsInline = ($(media).attr('playsinline') !== undefined) ? '1' : '0';

		// poster (Boolean, indicating whether media element has a poster attribute)
		this.hasPoster = ($(media).attr('poster') || data.poster) ? true : false;

		this.audioPoster = data.poster;
		this.audioPosterAlt = data.posterAlt;

		// get height and width attributes, if present
		// and add them to variables
		// Not currently used, but might be useful for resizing player
		this.width = $(media).attr('width') ?? 0;
		this.height = $(media).attr('height') ?? 0;

		// start-time
		var startTime = data.startTime;
		var isNumeric = (typeof startTime === 'number' || (typeof startTime === 'string' && startTime.trim() !== '' && !isNaN(startTime) && isFinite(Number(startTime)))) ? true : false;
		this.startTime = (startTime !== undefined && isNumeric) ? startTime : 0;

		// debug
		this.debug = (data.debug !== undefined && data.debug !== false) ? true : false;

		// Volume
		// Range is 0 to 10. Best not to crank it to avoid overpowering screen readers
		this.defaultVolume = 7;
		if (data.volume !== undefined && data.volume !== "") {
			var volume = data.volume;
			if (volume >= 0 && volume <= 10) {
				this.defaultVolume = volume;
			}
		}
		this.volume = this.defaultVolume;

		// Optional Buttons
		// Buttons are added to the player controller if relevant media is present
		// However, in some applications it might be undesirable to show buttons
		// (e.g., if chapters or transcripts are provided in an external container)
		if (data.useChaptersButton !== undefined && data.useChaptersButton === false) {
			this.useChaptersButton = false;
		} else {
			this.useChaptersButton = true;
		}

		// Control whether text descriptions are read aloud
		// set to "false" if the sole purpose of the WebVTT descriptions file
		// is to integrate text description into the transcript
		// set to "true" to write description text to a div
		// This variable does *not* control the method by which description is read.
		// For that, see below (this.descMethod)
		if (data.descriptionsAudible !== undefined && data.descriptionsAudible === false) {
			this.readDescriptionsAloud = false;
		} else if (data.descriptionAudible !== undefined && data.descriptionAudible === false) {
			// support both singular and plural spelling of attribute
			this.readDescriptionsAloud = false;
		} else {
			this.readDescriptionsAloud = true;
		}

		// setting initial this.descVoices to an empty array
		// to be populated later by getBrowserVoices
		this.descVoices = [];

		// Method by which text descriptions are read
		// valid values of data-desc-reader are:
		// 'brower' (default) - text-based audio description is handled by the browser, if supported
		// 'screenreader' - text-based audio description is always handled by screen readers
		// The latter may be preferable by owners of websites in languages that are not well supported
		// by the Web Speech API
		this.descReader = (data.descReader == 'screenreader') ? 'screenreader' : 'browser';

		// Default state of captions and descriptions
		// This setting is overridden by user preferences, if they exist
		// values for data-state-captions and data-state-descriptions are 'on' or 'off'
		this.defaultStateCaptions = (data.stateCaptions == 'off') ? 0 : 1;
		this.defaultStateDescriptions = (data.stateDescriptions == 'on') ? 1 : 0;

		// Default setting for prefDescPause
		// Extended description (i.e., pausing during description) is on by default
		// but this settings give website owners control over that
		// since they know the nature of their videos, and whether pausing is necessary
		// This setting is overridden by user preferences, if they exist
		this.defaultDescPause = (data.descPauseDefault == 'off') ? 0 : 1;

		// Headings
		// By default, an off-screen heading is automatically added to the top of the media player
		// It is intelligently assigned a heading level based on context, via misc.js > getNextHeadingLevel()
		// Authors can override this behavior by manually assigning a heading level using data-heading-level
		// Accepted values are 1-6, or 0 which indicates "no heading"
		// (i.e., author has already hard-coded a heading before the media player; Able Player doesn't need to do this)
		if (data.headingLevel !== undefined && data.headingLevel !== "") {
			var headingLevel = data.headingLevel;
			if (/^[0-6]*$/.test(headingLevel)) { // must be a valid HTML heading level 1-6; or 0
				this.playerHeadingLevel = headingLevel;
			}
		}

		// Transcripts
		// There are three types of interactive transcripts.
		// In descending of order of precedence (in case there are conflicting tags), they are:
		// 1. "manual" - A manually coded external transcript (requires data-transcript-src)
		// 2. "external" - Automatically generated, written to an external div (requires data-transcript-div & a valid target element)
		// 3. "popup" - Automatically generated, written to a draggable, resizable popup window that can be toggled on/off with a button
		// If data-include-transcript="false", there is no "popup" transcript
		var transcriptDivLocation = data.transcriptDiv;
		if (transcriptDivLocation !== undefined && transcriptDivLocation !== "" && null !== document.getElementById(transcriptDivLocation)) {
			this.transcriptDivLocation = transcriptDivLocation;
		} else {
			this.transcriptDivLocation = null;
		}
		var includeTranscript = data.includeTranscript;
		this.hideTranscriptButton = (includeTranscript !== undefined && includeTranscript === false) ? true : false;

		this.transcriptType = null;
		if (data.transcriptSrc !== undefined) {
			this.transcriptSrc = data.transcriptSrc;
			if (this.transcriptSrcHasRequiredParts()) {
				this.transcriptType = 'manual';
			} else {
				console.log('ERROR: Able Player transcript is missing required parts');
			}
		} else if ($(media).find('track[kind="captions"],track[kind="subtitles"],track:not([kind])').length > 0) {
			// required tracks are present. COULD automatically generate a transcript
			this.transcriptType = (this.transcriptDivLocation) ? 'external' : 'popup';
		}

		// In "Lyrics Mode", line breaks in WebVTT caption files are supported in the transcript
		// If false (default), line breaks are are removed from transcripts for a more seamless reading experience
		// If true, line breaks are preserved, so content can be presented karaoke-style, or as lines in a poem
		this.lyricsMode = (data.lyricsMode !== undefined && data.lyricsMode !== false) ? true : false;

		// in Strict Mode, parentheses and brackets do not get marked in bold in transcripts, and line breaks are not injected.
		// In Able Player 5.1, defaults to false.
		this.strictMode = (data.strictMode === undefined && data.strictMode !== true) ? false : true;

		// Set Transcript Title if defined explicitly. See transcript.js.
		if (data.transcriptTitle !== undefined && data.transcriptTitle !== "") {
			this.transcriptTitle = data.transcriptTitle;
		}

		// Sign Language
		// sign language can be a modal (default) or assigned to a div on the page.
		var signDivLocation = data.signDiv;
		if (signDivLocation !== undefined && signDivLocation !== "" && null !== document.getElementById(signDivLocation)) {
			this.$signDivLocation = $('#' + signDivLocation);
		} else {
			this.$signDivLocation = null;
		}

		// Captions
		// data-captions-position can be used to set the default captions position
		// this is only the default, and can be overridden by user preferences
		// valid values of data-captions-position are 'below' and 'overlay'
		this.defaultCaptionsPosition = (data.captionsPosition === 'overlay') ? 'overlay' : 'below';

		// Chapters
		var chaptersDiv = data.chaptersDiv;
		if (chaptersDiv !== undefined && chaptersDiv !== "") {
			this.chaptersDivLocation = chaptersDiv;
		}

		if (data.chaptersTitle !== undefined) {
			// NOTE: empty string is valid; results in no title being displayed
			this.chaptersTitle = data.chaptersTitle;
		}

		var defaultChapter = data.chaptersDefault;
		this.defaultChapter = (defaultChapter !== undefined && defaultChapter !== "") ? defaultChapter : null;

		// Slower/Faster buttons
		// valid values of data-speed-icons are 'animals' (default) and 'arrows'
		// 'animals' uses turtle and rabbit; 'arrows' uses up/down arrows
		this.speedIcons = (data.speedIcons === 'arrows') ? 'arrows' : 'animals';

		// Seekbar
		// valid values of data-seekbar-scope are 'chapter' and 'video'; will also accept 'chapters'
		var seekbarScope = data.seekbarScope;
		this.seekbarScope = (seekbarScope === 'chapter' || seekbarScope === 'chapters') ? 'chapter' : 'video';

		// YouTube
		var youTubeId = data.youTubeId;
		if (youTubeId !== undefined && youTubeId !== "") {
			this.youTubeId = this.getYouTubeId(youTubeId);
			if (!this.hasPoster) {
				let poster = this.getYouTubePosterUrl(this.youTubeId, '640');
				$(media).attr('poster', poster);
			}
		}

		var youTubeDescId = data.youTubeDescId;
		if (youTubeDescId !== undefined && youTubeDescId !== "") {
			this.youTubeDescId = this.getYouTubeId(youTubeDescId);
		}

		var youTubeSignId = data.youTubeSignId;
		if (youTubeSignId !== undefined && youTubeSignId !== "") {
			this.youTubeSignId = this.getYouTubeId(youTubeSignId);
		}

		var youTubeNoCookie = data.youTubeNoCookie;
		this.youTubeNoCookie = (youTubeNoCookie !== undefined && youTubeNoCookie) ? true : false;

		// Vimeo
		var vimeoId = data.vimeoId;
		if (vimeoId !== undefined && vimeoId !== "") {
			this.vimeoId = this.getVimeoId(vimeoId);
			if (!this.hasPoster) {
				let poster = thisObj.getVimeoPosterUrl(this.vimeoId, '1200');
				$(media).attr('poster', poster);
			}
		}
		var vimeoDescId = data.vimeoDescId;
		if (vimeoDescId !== undefined && vimeoDescId !== "") {
			this.vimeoDescId = this.getVimeoId(vimeoDescId);
		}

		// Skin
		// valid values of data-skin are:
		// '2020' (default as of 4.6), all buttons in one row beneath a full-width seekbar
		// 'legacy', two rows of controls; seekbar positioned in available space within top row
		this.skin = (data.skin == 'legacy') ? 'legacy' : '2020';

		// Size
		// width of Able Player is determined using the following order of precedence:
		// 1. data-width attribute
		// 2. width attribute (for video or audio, although it is not valid HTML for audio)
		// 3. Intrinsic size from video (video only, determined later)
		if (data.width !== undefined) {
			this.playerWidth = parseInt(data.width);
		} else if ($(media)[0].getAttribute('width')) {
			// NOTE: jQuery attr() returns null for all invalid HTML attributes
			// (e.g., width on <audio>)
			// but it can be acessed via JavaScript getAttribute()
			this.playerWidth = parseInt($(media)[0].getAttribute('width'));
		} else {
			this.playerWidth = null;
		}

		var allowFullScreen = data.allowFullscreen;
		this.allowFullscreen = (allowFullScreen !== undefined && allowFullScreen === false) ? false : true;

		// Define other variables that are used in fullscreen program flow
		this.clickedFullscreenButton = false;
		this.restoringAfterFullscreen = false;

		// Seek interval
		// Number of seconds to seek forward or back with Rewind & Forward buttons
		// Unless specified with data-seek-interval, the default value is re-calculated in initialize.js > setSeekInterval();
		// Calculation attempts to intelligently assign a reasonable interval based on media length
		this.defaultSeekInterval = 10;
		this.useFixedSeekInterval = false; // will change to true if media has valid data-seek-interval attribute
		if (data.seekInterval !== undefined && data.seekInterval !== "") {
			var seekInterval = data.seekInterval;
			if (/^[1-9][0-9]*$/.test(seekInterval)) { // must be a whole number greater than 0
				this.seekInterval = seekInterval;
				this.useFixedSeekInterval = true; // do not override with calculuation
			}
		}

		// Now Playing
		// Shows "Now Playing:" plus the title of the current track above player
		// Only used if there is a playlist
		var showNowPlaying = data.showNowPlaying;
		this.showNowPlaying = (showNowPlaying !== undefined && showNowPlaying === false) ? false : true;

		// Fallback
		// The data-test-fallback attribute can be used to test the fallback solution in any browser
		var testFallback = data.testFallback;
		if (testFallback !== undefined && testFallback !== false) {
			// 1: build error; 2: browser doesn't support media.
			this.testFallback = (testFallback == '2') ? 2 : 1;
		} else {
			this.testFallback = false;
		}

		// Language
		// Player language is determined given the following precedence:
		// 1. The value of data-lang on the media element, if provided and a matching translation file is available
		// 2. Lang attribute on <html> or <body>, if a matching translation file is available
		// 3. English
		// Final calculation occurs in translation.js > getTranslationText()
		var lang = data.lang;
		this.lang = (lang !== undefined && lang !== "") ? lang.toLowerCase() : null;

		// Metadata Tracks
		var metaType = data.metaType;
		if (metaType !== undefined && metaType !== "") {
			this.metaType = metaType;
		}
		var metaDiv = data.metaDiv;
		if (metaDiv !== undefined && metaDiv !== "") {
			this.metaDiv = metaDiv;
		}

		// Search
		// conducting a search requires an external div in which to write the results
		var searchDiv = data.searchDiv;
		if (searchDiv !== undefined && searchDiv !== "") {

			this.searchDiv = searchDiv;

			// Search term (optional; could be assigned later in a JavaScript application)
			var searchString = data.search;
			if (searchString !== undefined && searchString !== "") {
				this.searchString = searchString;
			}

			// Search Language
			var searchLang = data.searchLang;
			this.searchLang = (searchLang !== undefined && searchLang !== "") ? searchLang : null;

			// Search option: Ignore capitalization in search terms
			var searchIgnoreCaps = data.searchIgnoreCaps;
			this.searchIgnoreCaps = (searchIgnoreCaps !== undefined && searchIgnoreCaps !== false) ? true : false;
		}

		// Hide controls when video starts playing
		// They will reappear again when user presses a key or moves the mouse
		// As of v4.0, controls are hidden automatically on playback in fullscreen mode
		if (data.hideControls !== undefined && data.hideControls !== false) {
			this.hideControls = true;
			this.hideControlsOriginal = true; // a copy of hideControls, since the former may change if user enters full screen mode
		} else {
			this.hideControls = false;
			this.hideControlsOriginal = false;
		}

		// Steno mode
		// Enable support for Able Player keyboard shortcuts in textaarea fields
		// so users can control the player while transcribing
		if (data.stenoMode !== undefined && data.stenoMode !== false) {
			this.stenoMode = true;
			// Add support for stenography in an iframe via data-steno-iframe-id
			if (data.stenoIframeId !== undefined && data.stenoIframeId !== "") {
				this.stenoFrameId = data.stenoIframeId;
				this.$stenoFrame = $('#' + this.stenoFrameId);
				if (!(this.$stenoFrame.length)) {
					// iframe not found
					this.stenoFrameId = null;
					this.$stenoFrame = null;
				}
			} else {
				this.stenoFrameId = null;
				this.$stenoFrame = null;
			}
		} else {
			this.stenoMode = false;
			this.stenoFrameId = null;
			this.$stenoFrame = null;
		}

		// Define built-in variables that CANNOT be overridden with HTML attributes
		this.setDefaults();

		////////////////////////////////////////
		// End assignment of default variables
		////////////////////////////////////////
		this.ableIndex = AblePlayer.nextIndex;
		AblePlayer.nextIndex += 1;

		this.title = $(media).attr('title');

		// populate translation object with localized versions of all labels and prompts
		this.tt = {};
		try {
			this.getTranslationText();
			this.setup();
		} catch (e) {
			console.warn('Error setting up translations:', e);
			this.provideFallback();
		}

		ablePlayerInstances.add(this);
	}
	static getActiveDOMElement() {
		var activeElement = document.activeElement;

		// For shadow DOMs we need to keep digging down through the DOMs
		while (activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
			activeElement = activeElement.shadowRoot.activeElement;
		}

		return activeElement;
	}
	static localGetElementById(element, id) {
		if (element.getRootNode) {
			// Use getRootNode() and querySelector() where supported (for shadow DOM support)
			return $(element.getRootNode().querySelector('#' + id));
		} else {
			// If getRootNode is not supported it should be safe to use document.getElementById (since there is no shadow DOM support)
			return $(document.getElementById(id));
		}
	}
	static hasSingleInstance() { return AblePlayer.ablePlayerInstances.size === 1; }
	static getSingleInstance() {
		// If there are actually more instances, this returns the first one
		for (const instance of AblePlayer.ablePlayerInstances) {
			return instance;
		}
	}
	setup() {

		var thisObj = this;
		this.initializing = true; // will remain true until entire sequence of function calls is complete

		this.reinitialize().then(function () {
			if (!thisObj.player) {
				// No player for this media, show last-line fallback.
				thisObj.provideFallback();
			} else {
				thisObj.setupInstance().then(function () {
					thisObj.setupInstancePlaylist();
					if (thisObj.hasPlaylist) {
						// for playlists, recreatePlayer() is called from within cuePlaylistItem()
					} else {
						thisObj.recreatePlayer().then(function () {
							thisObj.initializing = false;
							thisObj.playerCreated = true; // remains true until browser is refreshed
						});
					}
				});
			}
		});
	}
	/**
	 * Removes this player from the global instance list.
	 *
	 * You probably want to call this during/after removing a player from the
	 * DOM. This avoids memory leaks, and allows the event handling to have the
	 * correct count of how many players are actually on the page.
	 */
	dispose() {
		AblePlayer.ablePlayerInstances.delete(this);

		// Look for various dialogs tied to this instance. Elements associated
		// with these are appended to the body, and they need to be
		// `.remove()`d here.
		const dialogs = [
			this.captionPrefsDialog,
			this.descPrefsDialog,
			this.keyboardPrefsDialog,
			this.transcriptPrefsDialog,
			this.transcriptResizeDialog,
			this.signResizeDialog,
		];

		for (const dialog of dialogs) {
			if (!dialog) {
				continue;
			}
			if (dialog.modal) {
				dialog.modal.remove();
			}
			if (dialog.overlay) {
				dialog.overlay.remove();
			}
		}
	}
};

// Index to increment every time new player is created.
// 5.0.0: this is now only used to generate unique IDs. Otherwise use hasSingleInstance.
AblePlayer.nextIndex = 0;





AblePlayer.ablePlayerSetupWindow = ablePlayerSetupWindow;

AblePlayer.youTubeIframeAPIReady = false;
AblePlayer.loadingYouTubeIframeAPI = false;

AblePlayer.ablePlayerInstances = ablePlayerInstances;



export default AblePlayer;
