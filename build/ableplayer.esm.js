/*! ableplayer V5.0.0 - ECMAScript module suitable for use in other bundlers. Console logs stripped out. */

import $ from 'jquery';
import DOMPurify from 'dompurify';

/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */


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
		return;
	}
	$(function () {
		if (typeof DOMPurify === 'undefined') {
			console.warn('Required dependency DOMPurify not available. Please use the full Able Player bundle which has DOMPurify built in. Or, keep using this bundle, and include DOMPurify separately.');
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

// Outdented for a simpler diff during module conversion
	/**
	 * Construct the AblePlayer object.
	 *
	 * Able Player needs `window` to instantiate, so, skip the constructor if
	 * you are running outside the browser (for example, SSR).
	 *
	 * @param object media jQuery selector or element identifying the media.
	 */
	function AblePlayer(media) {

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

		// loop (Boolean; if present always resolves to true, regardless of value)
		this.loop = ($(media).attr('loop') !== undefined) ? true : false;

		// playsinline (Boolean; if present always resolves to true, regardless of value)
		this.playsInline = ($(media).attr('playsinline') !== undefined) ? '1' : '0';

		// poster (Boolean, indicating whether media element has a poster attribute)
		this.hasPoster = ( $(media).attr('poster') || $(media).data('poster') ) ? true : false;

		this.audioPoster = $(media).data('poster');
		this.audioPosterAlt = $(media).data('poster-alt' );

		// get height and width attributes, if present
		// and add them to variables
		// Not currently used, but might be useful for resizing player
		this.width = $(media).attr('width') ?? 0;
		this.height = $(media).attr('height') ?? 0;

		// start-time
		var startTime = $(media).data('start-time');
		var isNumeric = ( typeof startTime === 'number' || ( typeof startTime === 'string' && startTime.trim() !== '' && ! isNaN(startTime) && isFinite( Number(startTime) ) ) ) ? true : false;
		this.startTime =  ( startTime !== undefined && isNumeric ) ? startTime : 0;

		// debug
		this.debug = ($(media).data('debug') !== undefined && $(media).data('debug') !== false) ? true : false;

		// Volume
		// Range is 0 to 10. Best not to crank it to avoid overpowering screen readers
		this.defaultVolume = 7;
		if ($(media).data('volume') !== undefined && $(media).data('volume') !== "") {
			var volume = $(media).data('volume');
			if (volume >= 0 && volume <= 10) {
				this.defaultVolume = volume;
			}
		}
		this.volume = this.defaultVolume;

		// Optional Buttons
		// Buttons are added to the player controller if relevant media is present
		// However, in some applications it might be undesirable to show buttons
		// (e.g., if chapters or transcripts are provided in an external container)

		if ($(media).data('use-chapters-button') !== undefined && $(media).data('use-chapters-button') === false) {
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
		if ($(media).data('descriptions-audible') !== undefined && $(media).data('descriptions-audible') === false) {
			this.readDescriptionsAloud = false;
		} else if ($(media).data('description-audible') !== undefined && $(media).data('description-audible') === false) {
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
		this.descReader = ($(media).data('desc-reader') == 'screenreader') ? 'screenreader' : 'browser';

		// Default state of captions and descriptions
		// This setting is overridden by user preferences, if they exist
		// values for data-state-captions and data-state-descriptions are 'on' or 'off'
		this.defaultStateCaptions = ($(media).data('state-captions') == 'off') ? 0 : 1;
		this.defaultStateDescriptions = ($(media).data('state-descriptions') == 'on') ? 1 : 0;

		// Default setting for prefDescPause
		// Extended description (i.e., pausing during description) is on by default
		// but this settings give website owners control over that
		// since they know the nature of their videos, and whether pausing is necessary
		// This setting is overridden by user preferences, if they exist
		this.defaultDescPause = ($(media).data('desc-pause-default') == 'off') ? 0 : 1;

		// Headings
		// By default, an off-screen heading is automatically added to the top of the media player
		// It is intelligently assigned a heading level based on context, via misc.js > getNextHeadingLevel()
		// Authors can override this behavior by manually assigning a heading level using data-heading-level
		// Accepted values are 1-6, or 0 which indicates "no heading"
		// (i.e., author has already hard-coded a heading before the media player; Able Player doesn't need to do this)
		if ($(media).data('heading-level') !== undefined && $(media).data('heading-level') !== "") {
			var headingLevel = $(media).data('heading-level');
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
		var transcriptDivLocation = $(media).data('transcript-div');
		if ( transcriptDivLocation !== undefined && transcriptDivLocation !== "" && null !== document.getElementById( transcriptDivLocation ) ) {
			this.transcriptDivLocation = transcriptDivLocation;
		} else {
			this.transcriptDivLocation = null;
		}
		var includeTranscript = $(media).data('include-transcript');
		this.hideTranscriptButton = ( includeTranscript !== undefined && includeTranscript === false) ? true : false;

		this.transcriptType = null;
		if ($(media).data('transcript-src') !== undefined) {
			this.transcriptSrc = $(media).data('transcript-src');
			if (this.transcriptSrcHasRequiredParts()) {
				this.transcriptType = 'manual';
			}
		} else if ($(media).find('track[kind="captions"],track[kind="subtitles"],track:not([kind])').length > 0) {
			// required tracks are present. COULD automatically generate a transcript
			this.transcriptType = (this.transcriptDivLocation) ? 'external' : 'popup';
		}

		// In "Lyrics Mode", line breaks in WebVTT caption files are supported in the transcript
		// If false (default), line breaks are are removed from transcripts for a more seamless reading experience
		// If true, line breaks are preserved, so content can be presented karaoke-style, or as lines in a poem
		this.lyricsMode = ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== false) ? true : false;

		// Set Transcript Title if defined explicitly. See transcript.js.
		if ($(media).data('transcript-title') !== undefined && $(media).data('transcript-title') !== "") {
			this.transcriptTitle = $(media).data('transcript-title');
		}

		// Sign Language
		// sign language can be a modal (default) or assigned to a div on the page.
		var signDivLocation = $(media).data('sign-div');
		if ( signDivLocation !== undefined && signDivLocation !== "" && null !== document.getElementById( signDivLocation ) ) {
			this.$signDivLocation = $( '#' + signDivLocation );
		} else {
			this.$signDivLocation = null;
		}

		// Captions
		// data-captions-position can be used to set the default captions position
		// this is only the default, and can be overridden by user preferences
		// valid values of data-captions-position are 'below' and 'overlay'
		this.defaultCaptionsPosition = ($(media).data('captions-position') === 'overlay') ? 'overlay' : 'below';

		// Chapters
		var chaptersDiv = $(media).data('chapters-div');
		if ( chaptersDiv !== undefined && chaptersDiv !== "") {
			this.chaptersDivLocation = chaptersDiv;
		}

		if ($(media).data('chapters-title') !== undefined) {
			// NOTE: empty string is valid; results in no title being displayed
			this.chaptersTitle = $(media).data('chapters-title');
		}

		var defaultChapter = $(media).data('chapters-default');
		this.defaultChapter = ( defaultChapter !== undefined && defaultChapter !== "") ? defaultChapter : null;

		// Slower/Faster buttons
		// valid values of data-speed-icons are 'animals' (default) and 'arrows'
		// 'animals' uses turtle and rabbit; 'arrows' uses up/down arrows
		this.speedIcons = ($(media).data('speed-icons') === 'arrows') ? 'arrows' : 'animals';

		// Seekbar
		// valid values of data-seekbar-scope are 'chapter' and 'video'; will also accept 'chapters'
		var seekbarScope = $(media).data('seekbar-scope');
		this.seekbarScope = ( seekbarScope === 'chapter' || seekbarScope === 'chapters') ? 'chapter' : 'video';

		// YouTube
		var youTubeId = $(media).data('youtube-id');
		if ( youTubeId !== undefined && youTubeId !== "") {
			this.youTubeId = this.getYouTubeId(youTubeId);
			if ( ! this.hasPoster ) {
				let poster = this.getYouTubePosterUrl(this.youTubeId,'640');
				$(media).attr( 'poster', poster );
			}
		}

		var youTubeDescId = $(media).data('youtube-desc-id');
		if ( youTubeDescId !== undefined && youTubeDescId !== "") {
			this.youTubeDescId = this.getYouTubeId(youTubeDescId);
		}

		var youTubeSignId = $(media).data('youtube-sign-src');
		if ( youTubeSignId !== undefined && youTubeSignId !== "") {
			this.youTubeSignId = this.getYouTubeId(youTubeSignId);
		}

		var youTubeNoCookie = $(media).data('youtube-nocookie');
		this.youTubeNoCookie = (youTubeNoCookie !== undefined && youTubeNoCookie) ? true : false;

		// Vimeo
		var vimeoId = $(media).data('vimeo-id');
		if ( vimeoId !== undefined && vimeoId !== "") {
			this.vimeoId = this.getVimeoId(vimeoId);
			if ( ! this.hasPoster ) {
				let poster = thisObj.getVimeoPosterUrl(this.vimeoId,'1200');
				$(media).attr( 'poster', poster );
			}
		}
		var vimeoDescId = $(media).data('vimeo-desc-id');
		if ( vimeoDescId !== undefined && vimeoDescId !== "") {
			this.vimeoDescId = this.getVimeoId(vimeoDescId);
		}

		// Skin
		// valid values of data-skin are:
		// '2020' (default as of 4.6), all buttons in one row beneath a full-width seekbar
		// 'legacy', two rows of controls; seekbar positioned in available space within top row
		this.skin = ($(media).data('skin') == 'legacy') ? 'legacy' : '2020';

		// Size
		// width of Able Player is determined using the following order of precedence:
		// 1. data-width attribute
		// 2. width attribute (for video or audio, although it is not valid HTML for audio)
		// 3. Intrinsic size from video (video only, determined later)
		if ($(media).data('width') !== undefined) {
			this.playerWidth = parseInt($(media).data('width'));
		} else if ($(media)[0].getAttribute('width')) {
			// NOTE: jQuery attr() returns null for all invalid HTML attributes
			// (e.g., width on <audio>)
			// but it can be acessed via JavaScript getAttribute()
			this.playerWidth = parseInt($(media)[0].getAttribute('width'));
		} else {
			this.playerWidth = null;
		}

		var allowFullScreen = $(media).data('allow-fullscreen');
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
		if ($(media).data('seek-interval') !== undefined && $(media).data('seek-interval') !== "") {
			var seekInterval = $(media).data('seek-interval');
			if (/^[1-9][0-9]*$/.test(seekInterval)) { // must be a whole number greater than 0
				this.seekInterval = seekInterval;
				this.useFixedSeekInterval = true; // do not override with calculuation
			}
		}

		// Now Playing
		// Shows "Now Playing:" plus the title of the current track above player
		// Only used if there is a playlist
		var showNowPlaying = $(media).data('show-now-playing');
		this.showNowPlaying = (showNowPlaying !== undefined && showNowPlaying === false) ? false : true;

		// Fallback
		// The data-test-fallback attribute can be used to test the fallback solution in any browser
		var testFallback = $(media).data('test-fallback');
		if ( testFallback !== undefined && testFallback !== false) {
			// 1: build error; 2: browser doesn't support media.
			this.testFallback = ( testFallback == '2' ) ? 2 : 1;
		} else {
			this.testFallback = false;
		}

		// Language
		// Player language is determined given the following precedence:
		// 1. The value of data-lang on the media element, if provided and a matching translation file is available
		// 2. Lang attribute on <html> or <body>, if a matching translation file is available
		// 3. English
		// Final calculation occurs in translation.js > getTranslationText()
		var lang = $(media).data('lang');
		this.lang = ( lang !== undefined && lang !== "") ? lang.toLowerCase() : null;

		// Metadata Tracks
		var metaType = $(media).data('meta-type');
		if ( metaType !== undefined && metaType !== "") {
			this.metaType = metaType;
		}
		var metaDiv = $(media).data('meta-div');
		if ( metaDiv !== undefined && metaDiv !== "") {
			this.metaDiv = metaDiv;
		}

		// Search
		// conducting a search requires an external div in which to write the results
		var searchDiv = $(media).data('search-div');
		if ( searchDiv !== undefined && searchDiv !== "") {

			this.searchDiv = searchDiv;

			// Search term (optional; could be assigned later in a JavaScript application)
			var searchString = $(media).data('search');
			if ( searchString !== undefined && searchString !== "") {
				this.searchString = searchString;
			}

			// Search Language
			var searchLang = $(media).data('search-lang');
			this.searchLang = ( searchLang !== undefined && searchLang !== "") ? searchLang : null;

			// Search option: Ignore capitalization in search terms
			var searchIgnoreCaps = $(media).data('search-ignore-caps');
			this.searchIgnoreCaps = ( searchIgnoreCaps !== undefined && searchIgnoreCaps !== false) ? true : false;
		}

		// Hide controls when video starts playing
		// They will reappear again when user presses a key or moves the mouse
		// As of v4.0, controls are hidden automatically on playback in fullscreen mode
		if ($(media).data('hide-controls') !== undefined && $(media).data('hide-controls') !== false) {
			this.hideControls = true;
			this.hideControlsOriginal = true; // a copy of hideControls, since the former may change if user enters full screen mode
		} else {
			this.hideControls = false;
			this.hideControlsOriginal = false;
		}

		// Steno mode
		// Enable support for Able Player keyboard shortcuts in textaarea fields
		// so users can control the player while transcribing
		if ($(media).data('steno-mode') !== undefined && $(media).data('steno-mode') !== false) {
			this.stenoMode = true;
			// Add support for stenography in an iframe via data-steno-iframe-id
			if ($(media).data('steno-iframe-id') !== undefined && $(media).data('steno-iframe-id') !== "") {
				this.stenoFrameId = $(media).data('steno-iframe-id');
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
	// Index to increment every time new player is created.
	// 5.0.0: this is now only used to generate unique IDs. Otherwise use hasSingleInstance.
	AblePlayer.nextIndex = 0;

	AblePlayer.prototype.setup = function() {

		var thisObj = this;
		this.initializing = true; // will remain true until entire sequence of function calls is complete

		this.reinitialize().then(function () {
			if (!thisObj.player) {
				// No player for this media, show last-line fallback.
				thisObj.provideFallback();
			} else {
				thisObj.setupInstance().then(function () {
					thisObj.setupInstancePlaylist();
					if (thisObj.hasPlaylist) ; else {
						thisObj.recreatePlayer().then(function() {
							thisObj.initializing = false;
							thisObj.playerCreated = true; // remains true until browser is refreshed
						});
					}
				});
			}
		});
	};

	/**
	 * Removes this player from the global instance list.
	 *
	 * You probably want to call this during/after removing a player from the
	 * DOM. This avoids memory leaks, and allows the event handling to have the
	 * correct count of how many players are actually on the page.
	 */
	AblePlayer.prototype.dispose = function () {
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
	};

	AblePlayer.getActiveDOMElement = function () {
		var activeElement = document.activeElement;

		// For shadow DOMs we need to keep digging down through the DOMs
		while (activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
			activeElement = activeElement.shadowRoot.activeElement;
		}

		return activeElement;
	};

	AblePlayer.localGetElementById = function(element, id) {
		if (element.getRootNode) {
			// Use getRootNode() and querySelector() where supported (for shadow DOM support)
			return $(element.getRootNode().querySelector('#' + id));
		} else {
			// If getRootNode is not supported it should be safe to use document.getElementById (since there is no shadow DOM support)
			return $(document.getElementById(id));
		}
	};

	AblePlayer.ablePlayerSetupWindow = ablePlayerSetupWindow;

	AblePlayer.youTubeIframeAPIReady = false;
	AblePlayer.loadingYouTubeIframeAPI = false;

	AblePlayer.ablePlayerInstances = ablePlayerInstances;

	AblePlayer.hasSingleInstance = () => AblePlayer.ablePlayerInstances.size === 1;

	AblePlayer.getSingleInstance = () => {
		// If there are actually more instances, this returns the first one
		for (const instance of AblePlayer.ablePlayerInstances) {
			return instance;
		}
	};

function addBrowserFunctions(AblePlayer) {

	AblePlayer.prototype.isIOS = function(version) {

		// return true if this is iOS
		// if version is provided check for a particular version

		var userAgent, iOS;

		userAgent = navigator.userAgent.toLowerCase();
		iOS = /ipad|iphone|ipod/.exec(userAgent);
		if (iOS) {
			if (typeof version !== 'undefined') {
				if (userAgent.indexOf('os ' + version) !== -1) {
					// this is the target version of iOS
					return true;
				} else {
					return false;
				}
			} else {
				// no version was specified
				return true;
			}
		} else {
			// this is not iOS
			return false;
		}
	};

	AblePlayer.prototype.browserSupportsVolume = function() {

		// To test whether the browser supports changing the volume,
		// create a new audio element and try setting the volume to something other than 1.
		// Then, retrieve the current setting to see if it preserved it.
		// This doesn't work in iOS by design: https://developer.apple.com/documentation/avfoundation/avplayer/volume

		var audio, testVolume;

		if (this.isIOS()) {
			return false;
		}

		testVolume = 0.9;  // any value between 0.1 and 0.9
		audio = new Audio();
		audio.volume = testVolume;

		return ( audio.volume === testVolume );
	};

	AblePlayer.prototype.nativeFullscreenSupported = function () {

		return document.fullscreenEnabled || document.webkitFullscreenEnabled;
	};

}

/**
 * @file validate.js
 * @description This file contains the code to validate the VTT data.
 */

/** PRE-SANITIZED FUNCTIONS
 * Some of the VTT attributes need to be transformed before being sanitized by DOMPurify.
 * @namespace preProcessing
 */
var preProcessing = {
  /**
   * Transforms tags with class names separated by dots into tags with a class attribute containing space-separated class names.
   * @memberof preProcessing
   * @param {string} vttContent - The content of the VTT.
   * @returns {string} - The VTT content with processed tags.
   */
  transformCSSClasses: function (vttContent) {
	// This function should only be passed one cue at a time.
	// Throw an error if the string checked is more than 1000 characters.
	if ( vttContent.length > 1000 ) {
		throw new Error( "Input too long" );
	}
    return vttContent.replace(
      /<(v|c|b|i|u|lang|ruby)\.([\w.]+)([^>]*)>/g,
      function (_, tag, cssClasses, otherAttrs) {
        var classAttr = cssClasses.replace(/\./g, " ");
        return `<${tag} class="${classAttr}"${otherAttrs}>`;
      }
    );
  },

  /**
   * Transforms <lang> tags by adding a lang attribute with the language code.
   * @memberof preProcessing
   * @param {string} content - The content with processed CSS classes.
   * @returns {string} - The content with <lang> tags transformed.
   */
  transformLangTags: function (content) {
    return content.replace(
      /<lang\s+([\w-]+)([^>]*)>/g,
      function (_, langCode, otherAttrs) {
        return '<lang lang="' + langCode + '"' + otherAttrs + ">";
      }
    );
  },

  /**
   * Transforms <v> tags by extracting any non-attribute text as a `title` attribute,
   * retains existing attributes (except class), and preserves the class attribute if present.
   * Example: <v John class="foo" data-x="y"> becomes <v title="John" data-x="y" class="foo">
   *
   * @function
   * @memberof preProcessing
   * @param {string} content - The string content containing <v> tags to process.
   * @returns {string} The content with <v> tags transformed to include a title attribute and preserved attributes.
   */
  transformVTags: function (content) {
	return content.replace(/<v\s+([^>]*?)>/g, function (_, tagAttributes) {
		var classMatch = tagAttributes.match(/class="([^"]*)"/);
		var titleMatch = tagAttributes.match(/title="([^"]*)"/);
		var classAttr = classMatch ? classMatch[0] : "";
		var titleAttr = titleMatch ? titleMatch[0] : "";
		var otherAttributes = tagAttributes
			.replace(/class="[^"]*"/, "")
			.replace(/title="[^"]*"/, "")
			.trim()
			.split(/\s+/);

		var attributes = [];
		var titleParts = [];

		// Iterate over each token of the tag content
		otherAttributes.forEach(function (token) {
			if (token.indexOf("=") !== -1) {
			attributes.push(token);
			} else {
			titleParts.push(token);
			}
		});

		var title = ( titleParts ) ? titleParts.join(" ") : false;
		var newTag = "<v";

		if ( title && ! titleAttr ) {
			newTag += ' title="' + title + '"';
		}

		if ( titleAttr && ! title ) {
			newTag += " " + titleAttr;
		}

		if (attributes.length > 0) {
			newTag += " " + attributes.join(" ");
		}

		if (classAttr) {
			newTag += " " + classAttr;
		}

		newTag += ">";

		return newTag;
      });
    },
};

/** POST-SANITIZED FUNCTIONS
 * After sanitizing the VTT data, some tags need to be transformed back to their original form.
 * @namespace postProcessing
 */
var postProcessing = {
  /**
   * Post-processes <c> tags by converting class attributes to dot-separated class names.
   * @memberof postProcessing
   * @param {string} vttContent - The VTT content to be processed.
   * @returns {string} - The VTT content with processed <c> tags.
   */
  postprocessCTag: function (vttContent) {
    return vttContent.replace(
      /<c class="([\w\s]+)">/g,
      function (_, classNames) {
        var classes = classNames.replace(/ /g, ".");
        return "<c." + classes + ">";
      }
    );
  },

  /**
   * * Post-processes <v> tags by converting class attributes, no matter where found in the attribute order, to dot-separated class names.
   * For example, <v class="foo bar" title="John"> becomes <v.foo.bar title="John">.
   * Removes the class attribute and appends other attributes after the class names.
   *
   * @function
   * @memberof postProcessing
   * @param {string} vttContent - The VTT content to be processed.
   * @returns {string} - The VTT content with processed <v> tags.
   */
  postprocessVTag: function (vttContent) {
    return vttContent.replace(
      /<v([^>]*)class="([\w\s]+)"([^>]*)>/g,
      function (_, beforeClass, classNames, afterClass) {
        var classes = classNames.trim().split(/\s+/).join(".");
        // Rebuild the tag: <v.{classes}{other attributes}>
        // Remove class="..." from attributes
        var attrs = (beforeClass + afterClass)
          .replace(/\s*class="[\w\s]+"/, "")
          .trim();
        return "<v." + classes + (attrs ? " " + attrs : "") + ">";
      }
    );
  },

  /**
   * Post-processes <lang> tags by removing the lang attribute and placing the language code directly in the tag.
   * @memberof postProcessing
   * @param {string} vttContent - The VTT content to be processed.
   * @returns {string} - The VTT content with processed <lang> tags.
   */
  postprocessLangTag: function (vttContent) {
    return vttContent.replace(
      /<lang lang="([\w-]+)"([^>]*)>/g,
      function (_, langCode, otherAttrs) {
        return "<lang " + langCode + otherAttrs + ">";
      }
    );
  },
};

/**
 * Preprocesses, sanitizes and post-processes VTT content as well as other utility functions.
 * @namespace validate
 */
var validate = {
  /**
   * Sets up the VTT content before sanitizing by transforming tags.
   * This way DOM purify will process the tags correctly.
   * @memberof validate
   * @param {string} vttContent - The original content of the VTT.
   * @returns {string} - The VTT content for the next and final step of preprocessing.
   */
  preProcessVttContent: function (vttContent) {
    var processedCSS = preProcessing.transformCSSClasses(vttContent);
    var processedLang = preProcessing.transformLangTags(processedCSS);
    var processedVTags = preProcessing.transformVTags(processedLang);
    return processedVTags;
  },

  /**
   * Post-processes the sanitized VTT data by converting class attributes to dot-separated class names and other transformations.
   * @memberof validate
   * @param {string} sanitizedVttContent - The sanitized VTT content to be post-processed.
   * @param {string} originalVttContent - The original VTT content before sanitization.
   * @returns {string} - The post-processed VTT content.
   */
  postProcessVttContent: function (sanitizedVttContent, originalVttContent) {
    var processedCTags = postProcessing.postprocessCTag(sanitizedVttContent);
    var processedVTags = postProcessing.postprocessVTag(processedCTags);
    var processedLangTags = postProcessing.postprocessLangTag(processedVTags);

    var arrowReplaced = processedLangTags.replace(/--&gt;/g, "-->");
    var timestampTagReplaced = arrowReplaced.replace(/&lt;([\d:.]+)&gt;/g, '<$1>');

    var finalContent = timestampTagReplaced.replace(
      /<\/v>/g,
      function (match, offset) {
        return originalVttContent.indexOf(match, offset) !== -1 ? match : "";
      }
    );

    return finalContent;
  },

  /**
   * Sanitizes the VTT data by removing unwanted tags and attributes, and then post-processes it.
   * @memberof validate
   * @param {string} vttContent - The VTT content to be sanitized and post-processed.
   * @returns {string} - The fully processed VTT content.
   */
  sanitizeVttContent: function (vttContent) {
    if (vttContent === null || vttContent === undefined) {
      return "";
    }
    var preSanitizedVttContent = validate.preProcessVttContent(vttContent);

    var config = {
      ALLOWED_TAGS: ["b", "i", "u", "v", "c", "lang", "ruby", "rt", "rp"],
      ALLOWED_ATTR: ["title", "class", "lang"],
      KEEP_CONTENT: true,
    };

    var sanitizedVttContent = DOMPurify.sanitize(
      preSanitizedVttContent,
      config
    );

    return validate.postProcessVttContent(sanitizedVttContent, vttContent);
  },
  // Utility validation functions
  isProtocolSafe: function (url) {
    //creates a new URL object for analysis to check if the protocol is http or https
    //returns true if there is a match false otherwise
    try {
      const parsedUrl = new URL(url, window.location.origin); // Resolve relative URLs
      return ["http:", "https:"].includes(parsedUrl.protocol); // Allow only HTTP and HTTPS
    } catch (e) {
      return false; // Invalid URL
    }
  },
};

// Events:
	// - startTracking(event, position)
	// - tracking(event, position)
	// - stopTracking(event, position)

	function AccessibleSlider(div, max, bigInterval, label) {

		// div is the host element around which the slider will be built
		// max is the high end of the slider scale
		// bigInterval is the number of steps supported by page up/page down (set to 0 if not supported)
		// (smallInterval, defined as nextStep below, is always set to 1) - this is the interval supported by arrow keys
		// label is used within an aria-label attribute to identify the slider to screen reader users

		var thisObj, coords;

		thisObj = this;

		// Initialize some variables.
		this.position = 0; // Note: position does not change while tracking.
		this.tracking = false;
		this.trackDevice = null; // 'mouse' or 'keyboard'
		this.keyTrackPosition = 0;
		this.lastTrackPosition = 0;
		this.nextStep = 1;
		this.inertiaCount = 0;

		this.seekbarDiv = $(div);

		// Add divs for tracking amount of media loaded and played
		this.loadedDiv = $('<div></div>');
		this.playedDiv = $('<div></div>');

		// Add a seekhead
		this.seekHead = $('<div>',{
			'aria-orientation': 'horizontal',
			'class': 'able-seekbar-head'
		});

		this.seekHead.attr('tabindex', '0');

		// Since head is focusable, it gets the aria roles/titles.
		this.seekHead.attr({
			'role': 'slider',
			'aria-label': label,
			'aria-valuemin': 0,
			'aria-valuemax': max
		});

		this.timeTooltipTimeoutId = null;
		this.overTooltip = false;
		this.timeTooltip = $('<div>');
		this.seekbarDiv.append(this.timeTooltip);

		this.timeTooltip.attr('role', 'tooltip');
		this.timeTooltip.addClass('able-tooltip');
		this.timeTooltip.on('mouseenter focus', function(){
			thisObj.overTooltip = true;
			clearInterval(thisObj.timeTooltipTimeoutId);
		});
		this.timeTooltip.on('mouseleave blur', function(){
			thisObj.overTooltip = false;
			$(this).hide();
		});
		this.timeTooltip.hide();

		this.seekbarDiv.append(this.loadedDiv);
		this.seekbarDiv.append(this.playedDiv);
		this.seekbarDiv.append(this.seekHead);
		this.seekbarDiv.wrap('<div></div>');
		this.wrapperDiv = this.seekbarDiv.parent();

		if (this.skin === 'legacy') {
			this.wrapperDiv.width( 100 );
			this.loadedDiv.width(0);
		}
		this.wrapperDiv.addClass('able-seekbar-wrapper');
		this.loadedDiv.addClass('able-seekbar-loaded');
		this.playedDiv.width(0);
		this.playedDiv.addClass('able-seekbar-played');

		// Set a default duration. User can call this dynamically if duration changes.
		this.setDuration(max);

		// handle seekHead events
		this.seekHead.on('mouseenter mouseleave mousemove mousedown mouseup focus blur touchstart touchmove touchend', function (e) {

			coords = thisObj.pointerEventToXY(e);

			if (e.type === 'mouseenter' || e.type === 'focus') {
				thisObj.overHead = true;
			} else if (e.type === 'mouseleave' || e.type === 'blur') {
				thisObj.overHead = false;
				if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			} else if (e.type === 'mousemove' || e.type === 'touchmove') {
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.trackHeadAtPageX(coords.x);
				}
			} else if (e.type === 'mousedown' || e.type === 'touchstart') {
				thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
				if (!thisObj.seekbarDiv.is(':focus')) {
					thisObj.seekbarDiv.focus();
				}
				e.preventDefault();
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			}
			if (e.type !== 'mousemove' && e.type !== 'mousedown' && e.type !== 'mouseup' && e.type !== 'touchstart' && e.type !== 'touchend') {
				thisObj.refreshTooltip();
			}
		});

		// handle seekbarDiv events
		this.seekbarDiv.on(
			'mouseenter mouseleave mousemove mousedown mouseup keydown keyup touchstart touchmove touchend', function (e) {

			// Don't trigger move on right click.
			if ( e.button == 2 && e.type == 'mousedown' ) {
				return;
			}
			coords = thisObj.pointerEventToXY(e);
			let keyPressed = e.key;

			if (e.type === 'mouseenter') {
				thisObj.overBody = true;
				thisObj.overBodyMousePos = {
					x: coords.x,
					y: coords.y
				};
			} else if (e.type === 'mouseleave') {
				thisObj.overBody = false;
				thisObj.overBodyMousePos = null;
				if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			} else if (e.type === 'mousemove' || e.type === 'touchmove') {
				thisObj.overBodyMousePos = {
					x: coords.x,
					y: coords.y
				};
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.trackHeadAtPageX(coords.x);
				}
			} else if (e.type === 'mousedown' || e.type === 'touchstart') {
				thisObj.startTracking('mouse', thisObj.pageXToPosition(coords.x));
				thisObj.trackHeadAtPageX(coords.x);
				if (!thisObj.seekHead.is(':focus')) {
					thisObj.seekHead.focus();
				}
				e.preventDefault();
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			} else if (e.type === 'keydown') {
				if (e.key === 'Home') {
					thisObj.trackImmediatelyTo(0);
				} else if (e.key === 'End') {
					thisObj.trackImmediatelyTo(thisObj.duration);
				} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
					thisObj.arrowKeyDown(-1);
				} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
					thisObj.arrowKeyDown(1);
				} else if (e.key === 'PageUp' && bigInterval > 0) {
					thisObj.arrowKeyDown(bigInterval);
				} else if (e.key === 'PageDown' && bigInterval > 0) {
					thisObj.arrowKeyDown(-bigInterval);
				} else {
					return;
				}
				e.preventDefault();
			} else if (e.type === 'keyup') {
				if ( keyPressed === e.key ) {
					if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
						thisObj.stopTracking(thisObj.keyTrackPosition);
					}
					e.preventDefault();
				}
			}
			if (!thisObj.overTooltip && e.type !== 'mouseup' && e.type !== 'keydown' && e.type !== 'keydown') {
				thisObj.refreshTooltip();
			}
		});
	}

	AccessibleSlider.prototype.arrowKeyDown = function (multiplier) {
		if (this.tracking && this.trackDevice === 'keyboard') {
			this.keyTrackPosition = this.boundPos(this.keyTrackPosition + (this.nextStep * multiplier));
			this.inertiaCount += 1;
			if (this.inertiaCount === 20) {
				this.inertiaCount = 0;
				this.nextStep *= 2;
			}
			this.trackHeadAtPosition(this.keyTrackPosition);
		} else {
			this.nextStep = 1;
			this.inertiaCount = 0;
			this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
			this.startTracking('keyboard', this.keyTrackPosition);
			this.trackHeadAtPosition(this.keyTrackPosition);
		}
	};

	AccessibleSlider.prototype.pageXToPosition = function (pageX) {
		var offset = pageX - this.seekbarDiv.offset().left;
		var position = this.duration * (offset / this.seekbarDiv.width());
		return this.boundPos(position);
	};

	AccessibleSlider.prototype.boundPos = function (position) {
		return Math.max(0, Math.min(position, this.duration));
	};

	AccessibleSlider.prototype.setDuration = function (duration) {
		if (duration !== this.duration) {
			this.duration = duration;
			this.resetHeadLocation();
			this.seekHead.attr('aria-valuemax', duration);
		}
	};

	// Set width of the legacy seekbar.
	AccessibleSlider.prototype.setWidth = function (width) {
		this.wrapperDiv.width(width);
		this.resizeDivs();
		this.resetHeadLocation();
	};

	AccessibleSlider.prototype.getWidth = function () {
		return this.wrapperDiv.width();
	};

	AccessibleSlider.prototype.resizeDivs = function () {
		this.playedDiv.width( 100 * (this.position / this.duration) + '%' );
		this.loadedDiv.width( 100 * this.buffered + '%' );
	};

	// Stops tracking, sets the head location to the current position.
	AccessibleSlider.prototype.resetHeadLocation = function () {
		var ratio = this.position / this.duration;
		var center = this.seekbarDiv.width() * ratio;
		this.seekHead.css('left', center - (this.seekHead.width() / 2));

		if (this.tracking) {
			this.stopTracking(this.position);
		}
	};

	AccessibleSlider.prototype.setPosition = function (position, updateLive) {
		this.position = position;
		this.resetHeadLocation();
		if (this.overHead) {
			this.refreshTooltip();
		}
		this.resizeDivs();
		this.updateAriaValues(position, updateLive);
	};

	// TODO: Native HTML5 can have several buffered segments, and this actually happens quite often. Change this to display them all.
	AccessibleSlider.prototype.setBuffered = function (ratio) {
		if (!isNaN(ratio)) {
			this.buffered = ratio;
			this.redrawDivs;
		}
	};

	AccessibleSlider.prototype.startTracking = function (device, position) {
		if (!this.tracking) {
			this.trackDevice = device;
			this.tracking = true;
			this.seekbarDiv.trigger('startTracking', [position]);
		}
	};

	AccessibleSlider.prototype.stopTracking = function (position) {
		this.trackDevice = null;
		this.tracking = false;
		this.seekbarDiv.trigger('stopTracking', [position]);
		this.setPosition(position, true);
	};

	AccessibleSlider.prototype.trackHeadAtPageX = function (pageX) {
		var position = this.pageXToPosition(pageX);
		var newLeft = pageX - this.seekbarDiv.offset().left - (this.seekHead.width() / 2);
		newLeft = Math.max(0, Math.min(newLeft, this.seekbarDiv.width() - this.seekHead.width()));
		this.lastTrackPosition = position;
		this.seekHead.css('left', newLeft);
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.trackHeadAtPosition = function (position) {
		var ratio = position / this.duration;
		var center = this.seekbarDiv.width() * ratio;
		this.lastTrackPosition = position;
		this.seekHead.css('left', center - (this.seekHead.width() / 2));
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.reportTrackAtPosition = function (position) {
		this.seekbarDiv.trigger('tracking', [position]);
		this.updateAriaValues(position, true);
	};

	AccessibleSlider.prototype.updateAriaValues = function (position, updateLive) {
		// TODO: Localize, move to another function.
		var pHours = Math.floor(position / 3600);
		var pMinutes = Math.floor((position % 3600) / 60);
		var pSeconds = Math.floor(position % 60);

		var pHourWord = pHours === 1 ? 'hour' : 'hours';
		var pMinuteWord = pMinutes === 1 ? 'minute' : 'minutes';
		var pSecondWord = pSeconds === 1 ? 'second' : 'seconds';

		var descriptionText;
		if (pHours > 0) {
			descriptionText = pHours +
				' ' + pHourWord +
				', ' + pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		} else if (pMinutes > 0) {
			descriptionText	 = pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		} else {
			descriptionText = pSeconds + ' ' + pSecondWord;
		}

		/* Comment to stop live region from generating or being used. */
		if (!this.liveAriaRegion) {
			this.liveAriaRegion = $('<span>', {
				'class': 'able-offscreen',
				'aria-live': 'polite'
			});
			this.wrapperDiv.append(this.liveAriaRegion);
		}
		if (updateLive && (this.liveAriaRegion.text() !== descriptionText)) {
			this.liveAriaRegion.text(descriptionText);
		}

		// Uncomment the following lines to use aria values instead of separate live region.
		this.seekHead.attr('aria-valuetext', descriptionText);
		this.seekHead.attr('aria-valuenow', Math.floor(position).toString());
	};

	AccessibleSlider.prototype.trackImmediatelyTo = function (position) {
		this.startTracking('keyboard', position);
		this.trackHeadAtPosition(position);
		this.keyTrackPosition = position;
	};

	AccessibleSlider.prototype.refreshTooltip = function () {
		if (this.overHead) {
			this.timeTooltip.show();
			if (this.tracking) {
				this.timeTooltip.text(this.positionToStr(this.lastTrackPosition));
			} else {
				this.timeTooltip.text(this.positionToStr(this.position));
			}
			this.setTooltipPosition(this.seekHead.position().left + (this.seekHead.width() / 2));
		} else if (this.overBody && this.overBodyMousePos) {
			this.timeTooltip.show();
			this.timeTooltip.text(this.positionToStr(this.pageXToPosition(this.overBodyMousePos.x)));
			this.setTooltipPosition(this.overBodyMousePos.x - this.seekbarDiv.offset().left);
		} else {

			clearTimeout(this.timeTooltipTimeoutId);
			var _this = this;
			this.timeTooltipTimeoutId = setTimeout(function() {
				// give user a half second move cursor over tooltip
				_this.timeTooltip.hide();
			}, 500);
		}
	};

	AccessibleSlider.prototype.hideSliderTooltips = function () {
		this.overHead = false;
		this.overBody = false;
		this.timeTooltip.hide();
	};

	AccessibleSlider.prototype.setTooltipPosition = function (x) {
		this.timeTooltip.css({
			left: x - (this.timeTooltip.width() / 2) - 10,
			bottom: this.seekHead.height()
		});
	};

	AccessibleSlider.prototype.positionToStr = function (seconds) {

		// same logic as misc.js > formatSecondsAsColonTime()
		var dHours = Math.floor(seconds / 3600);
		var dMinutes = Math.floor(seconds / 60) % 60;
		var dSeconds = Math.floor(seconds % 60);
		if (dSeconds < 10) {
			dSeconds = '0' + dSeconds;
		}
		if (dHours > 0) {
			if (dMinutes < 10) {
				dMinutes = '0' + dMinutes;
			}
			return dHours + ':' + dMinutes + ':' + dSeconds;
		} else {
			return dMinutes + ':' + dSeconds;
		}
	};

	AccessibleSlider.prototype.pointerEventToXY = function(e) {

		// returns array of coordinates x and y in response to both mouse and touch events
		// for mouse events, this comes from e.pageX and e.pageY
		// for touch events, it's a bit more complicated
		var out = {x:0, y:0};
		if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
			var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
			out.x = touch.pageX;
			out.y = touch.pageY;
		} else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover'|| e.type=='mouseout' || e.type=='mouseenter' || e.type=='mouseleave') {
			out.x = e.pageX;
			out.y = e.pageY;
		}
		return out;
	};

function addBuildplayerFunctions(AblePlayer) {
	AblePlayer.prototype.injectPlayerCode = function() {

		// create and inject surrounding HTML structure
		// If iOS & video:
		// iOS does not support any of the player's functionality - everything plays in its own player
		// Therefore, AblePlayer is not loaded & all functionality is disabled
		// (this all determined. If this is iOS && video, this function is never called)

		var captionsContainer;
		// Wrappers, from inner to outer:
		// $mediaContainer - contains the original media element
		// $ableDiv - contains the media player and all its objects (e.g., captions, controls, descriptions)
		// $ableWrapper - contains additional widgets (e.g., transcript window, sign window)
		this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();
		this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
		this.$ableWrapper = this.$ableDiv.wrap('<div class="able-wrapper"></div>').parent();
		this.$ableWrapper.addClass('able-skin-' + this.skin);

		if (this.mediaType === 'video') {
			// youtube adds its own big play button
			// don't show ours *unless* video has a poster attribute
			// (which obstructs the YouTube poster & big play button)
			if (this.player !== 'youtube' || this.hasPoster) {
				this.injectBigPlayButton();
			}
		}

		// add container that captions or description will be appended to
		// Note: new Jquery object must be assigned _after_ wrap, hence the temp captionsContainer variable
		captionsContainer = $('<div>');
		if (this.mediaType === 'video') {
			captionsContainer.addClass('able-vidcap-container');
		} else if (this.mediaType === 'audio') {
			captionsContainer.addClass('able-audcap-container');
			// hide this by default. It will be shown if captions are available
			captionsContainer.addClass('captions-off');
		}

		this.injectPlayerControlArea(); // this may need to be injected after captions???
		this.$captionsContainer = this.$mediaContainer.wrap(captionsContainer).parent();
		this.injectAlert(this.$ableDiv);
		this.injectPlaylist();
		this.injectAudioPoster();
		// Do this last, as it should be prepended to the top of this.$ableDiv
		// after everything else has prepended
		this.injectOffscreenHeading();
	};

	AblePlayer.prototype.injectAudioPoster = function() {
		if ( this.mediaType === 'audio' && this.hasPoster ) {
			const audioPoster = DOMPurify.sanitize(this.audioPoster);
			const audioPosterAlt = DOMPurify.sanitize(this.audioPosterAlt);
			let audioPosterImg = document.createElement( 'img' );
			audioPosterImg.setAttribute( 'src', audioPoster );
			audioPosterImg.setAttribute( 'alt', audioPosterAlt );
			this.$audioWrapper = this.$playerDiv.wrap( '<div class="able-audio-wrapper">' ).parent();
			this.$audioWrapper.prepend( audioPosterImg );
		}
	};

	AblePlayer.prototype.injectOffscreenHeading = function () {

		// Inject an offscreen heading to the media container.
		// If heading hasn't already been manually defined via data-heading-level,
		// automatically assign a level that is one level deeper than the closest parent heading
		// as determined by getNextHeadingLevel()
		var headingType;
		if (this.playerHeadingLevel == '0') ; else {
			if (typeof this.playerHeadingLevel === 'undefined') {
				this.playerHeadingLevel = this.getNextHeadingLevel(this.$ableDiv); // returns in integer 1-6
			}
			headingType = 'h' + this.playerHeadingLevel.toString();
			this.$headingDiv = $('<' + headingType + '>');
			this.$ableDiv.prepend(this.$headingDiv);
			this.$headingDiv.addClass('able-offscreen');
			this.$headingDiv.text( this.translate( 'playerHeading', 'Media player' ) );
		}
	};

	AblePlayer.prototype.injectBigPlayButton = function () {

		var thisObj = this;

		this.$bigPlayButton = $('<button>', {
			'class': 'able-big-play-button',
			'aria-hidden': false,
			'aria-label': this.translate( 'play', 'Play' ),
			'type': 'button',
			'tabindex': 0
		});

		this.getIcon( this.$bigPlayButton, 'play' );

		this.$bigPlayButton.on( 'click', function () {
			thisObj.handlePlay();
		});

		this.$mediaContainer.append(this.$bigPlayButton);
	};

	AblePlayer.prototype.injectPlayerControlArea = function () {

		this.$playerDiv = $('<div>', {
			'class' : 'able-player',
			'role' : 'region',
			'aria-label' : ( 'audio' === this.mediaType ) ? this.translate( 'audioPlayer', 'audio player' ) : this.translate( 'videoPlayer', 'video player' )
		});
		this.$playerDiv.addClass('able-' + this.mediaType);
		if (this.hasPlaylist && this.showNowPlaying) {
			this.$nowPlayingDiv = $('<div>',{
				'class' : 'able-now-playing',
				'aria-live' : 'assertive',
				'aria-atomic': 'true'
			});
		}
		this.$controllerDiv = $('<div>',{
			'class' : 'able-controller'
		});
		this.$controllerDiv.addClass('able-' + this.iconColor + '-controls');

		this.$statusBarDiv = $('<div>',{
			'class' : 'able-status-bar'
		});
		this.$timer = $('<span>',{
			'class' : 'able-timer'
		});
		this.$elapsedTimeContainer = $('<span>',{
			'class': 'able-elapsedTime',
			text: '0:00'
		});
		this.$durationContainer = $('<span>',{
			'class': 'able-duration'
		});
		this.$durationSeparator = $('<span>',{
			'class': 'able-timer-separator',
			'text': ' / '
		});
		this.$timer.append(this.$elapsedTimeContainer).append(this.$durationSeparator).append(this.$durationContainer);

		this.$speed = $('<span>',{
			'class' : 'able-speed',
			'aria-live' : 'assertive',
			'aria-atomic' : 'true'
		}).text(this.translate( 'speed', 'Speed' ) + ': 1x');

		this.$status = $('<span>',{
			'class' : 'able-status',
			'aria-live' : 'polite'
		});

		// Put everything together.
		this.$statusBarDiv.append(this.$timer, this.$speed, this.$status);
		if (this.showNowPlaying) {
			this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
		} else {
			this.$playerDiv.append(this.$controllerDiv, this.$statusBarDiv);
		}

		if (this.mediaType === 'video') {
			// the player controls go after the media & captions
			this.$ableDiv.append(this.$playerDiv);
		} else {
			// the player controls go before the media & captions
			this.$ableDiv.prepend(this.$playerDiv);
		}
	};

	AblePlayer.prototype.injectTextDescriptionArea = function () {

		// create a div for writing description text
		this.$descDiv = $('<div>',{
			'class': 'able-descriptions'
		});
		// Add ARIA so description will be announced by screen readers
		// Later (in description.js > showDescription()),
		// if browser supports Web Speech API and this.descMethod === 'browser'
		// these attributes will be removed
		this.$descDiv.attr({
			'aria-live': 'assertive',
			'aria-atomic': 'true'
		});
		// Start off with description hidden.
		// It will be exposed conditionally within description.js > initDescription()
		this.$descDiv.hide();
		this.$ableDiv.append(this.$descDiv);
	};

	AblePlayer.prototype.getDefaultWidth = function(which) {
		let viewportMaxwidth = window.innerWidth;
		// return default width of resizable elements
		// these values are somewhat arbitrary, but seem to result in good usability
		// if users disagree, they can resize (and resposition) them
		if (which === 'transcript') {
			return ( viewportMaxwidth <= 450 ) ? viewportMaxwidth : 450;
		} else if (which === 'sign') {
			return ( viewportMaxwidth <= 400 ) ? viewportMaxwidth : 400;
		}
	};

	/**
	 * Reposition draggable windows when switched into fullscreen.
	 *
	 * @param {string} which 'transcript' or 'sign'.
	 */
	AblePlayer.prototype.rePositionDraggableWindow = function (which) {

		let preferences, $window;
		preferences = this.getPref();
		$window = ( which === 'transcript' ) ? this.$transcriptArea : this.$signWindow;
		if ( which === 'transcript' && $window ) {
			if (typeof preferences.transcript !== 'undefined') {
				this.prevTranscriptPosition = preferences.transcript;
			}
			$window.css({
				'top': 0,
				'left': 0
			});
		} else if ( 'sign' === which && $window ) {
			if (typeof preferences.sign !== 'undefined') {
				this.prevSignPosition = preferences.sign;
			}
			$window.css({
				'top': 0,
				'right': 0,
				'left': 'auto'
			});
		}
	};

	AblePlayer.prototype.positionDraggableWindow = function (which, width) {

		// which is either 'transcript' or 'sign'
		var preferences, preferencePos, $window, windowPos, viewportWidth, windowWidth;

		preferences = this.getPref();
		$window = ( which === 'transcript' ) ? this.$transcriptArea : this.$signWindow;
		if ( ! $window ) {
			return;
		}
		if (which === 'transcript') {
			if (typeof preferences.transcript !== 'undefined') {
				preferencePos = preferences.transcript;
			}
			if ( this.prevTranscriptPosition ) {
				preferencePos = this.prevTranscriptPosition;
				this.prevTranscriptPosition = false;
			}
		} else if (which === 'sign') {
			if (typeof preferences.sign !== 'undefined') {
				preferencePos = preferences.sign;
			}
			if ( this.prevSignPosition ) {
				preferencePos = this.prevSignPosition;
				this.prevSignPosition = false;
			}
		}
		if (typeof preferencePos !== 'undefined' && !($.isEmptyObject(preferencePos))) {
			// position window using stored values from preferences
			$window.css({
				'position': preferencePos['position'],
				'width': preferencePos['width'],
				'z-index': preferencePos['zindex']
			});
			if (preferencePos['position'] === 'absolute') {
				$window.css({
					'top': preferencePos['top'],
					'left': preferencePos['left']
				});
				// Check whether the window is above the top of the viewport.
				let topPosition = $window.offset().top;
				let leftPosition = $window.offset().left;
				viewportWidth = window.innerWidth;
				windowWidth = $window.width();
				if ( topPosition < 0 ) {
					$window.css({
						'top': preferencePos['top'] - topPosition
					});
				}
				// If draggable window is off screen to the left.
				if ( leftPosition < 0 && ! this.restoringAfterFullscreen ) {
					$window.css({
						'left': preferencePos['left'] - leftPosition
					});
				}
				// If draggable window is off screen to the right.
				if ( viewportWidth - leftPosition < 30 ) {
					$window.css({
						'left': viewportWidth - windowWidth
					});
				}
			}
			// since preferences are not page-specific, z-index needs may vary across different pages
			this.updateZIndex(which);
		} else {
			// position window using default values
			windowPos = this.getOptimumPosition(which, width);
			if (typeof width === 'undefined') {
				width = this.getDefaultWidth(which);
			}
			$window.css({
				'position': windowPos[0],
				'width': width,
				'z-index': windowPos[3]
			});
			if (windowPos[0] === 'absolute') {
				$window.css({
					'top': windowPos[1] + 'px',
					'left': windowPos[2] + 'px',
				});
			}
		}
	};

	AblePlayer.prototype.getOptimumPosition = function (targetWindow, targetWidth) {

		// returns optimum position for targetWindow, as an array with the following structure:
		// 0 - CSS position ('absolute' or 'relative')
		// 1 - top
		// 2 - left
		// 3 - zindex (if not default)
		// targetWindow is either 'transcript' or 'sign'
		// if there is room to the right of the player, position element there
		// else if there is room the left of the player, position element there
		// else position element beneath player

		var gap, position, ableWidth, ableOffset, ableLeft, windowWidth, otherWindowWidth;

		if (typeof targetWidth === 'undefined') {
			targetWidth = this.getDefaultWidth(targetWindow);
		}

		gap = 5; // number of pixels to preserve between Able Player objects
		position = []; // position, top, left

		ableWidth = this.$ableDiv.width();
		ableOffset = this.$ableDiv.offset();
		ableLeft = ableOffset.left;
		windowWidth = $(window).width();
		otherWindowWidth = 0; // width of other visiable draggable windows will be added to this

		if (targetWindow === 'transcript') {
			// If placing the transcript window, check position of sign window first.
			if (typeof this.$signWindow !== 'undefined' && (this.$signWindow.is(':visible'))) {
				otherWindowWidth = this.$signWindow.width() + gap;
			}
		} else if (targetWindow === 'sign') {
			// If placing the sign window, check position of transcript window first.
			if (typeof this.$transcriptArea !== 'undefined' && (this.$transcriptArea.is(':visible'))) {
				otherWindowWidth = this.$transcriptArea.width() + gap;
			}
		}
		if (targetWidth < (windowWidth - (ableLeft + ableWidth + gap + otherWindowWidth))) {
			// there's room to the left of $ableDiv
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableWidth + otherWindowWidth + gap;
		} else if (targetWidth + gap < ableLeft) {
			// there's room to the right of $ableDiv
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableLeft - targetWidth - gap;
		} else {
			// position element below $ableDiv
			position[0] = 'relative';
			// no need to define top, left, or z-index
		}
		return position;
	};

	AblePlayer.prototype.injectAlert = function ($container) {
		// inject two alerts, one visible for all users and one for screen reader users only
		this.$alertBox = $('<div role="alert"></div>');
		this.$alertBox.addClass('able-alert');
		this.$alertBox.hide();

		var $alertText = $( '<span></span>' );
		$alertText.appendTo(this.$alertBox);

		var $alertDismiss = $('<button type="button"></button>' );
		$alertDismiss.attr( 'aria-label', this.translate( 'dismissButton', 'Dismiss' ) );
		$alertDismiss.text( '×' );
		$alertDismiss.appendTo(this.$alertBox);

		$alertDismiss.on( 'click', function(e) {
			$(this).parent('div').hide();
		});

		this.$alertBox.appendTo($container);

		if ( ! this.$srAlertBox ) {
			this.$srAlertBox = $('<div role="alert"></div>');
			this.$srAlertBox.addClass('able-screenreader-alert');
			this.$srAlertBox.appendTo($container);
		}
	};

	AblePlayer.prototype.injectPlaylist = function () {

		if (this.playlistEmbed === true) {
			// move playlist into player, immediately before statusBarDiv
			var playlistClone = this.$playlistDom.clone();
			playlistClone.insertBefore(this.$statusBarDiv);
			// Update to the new playlist copy.
			this.$playlist = playlistClone.find('li');
		}
	};

	AblePlayer.prototype.createPopup = function (which, tracks) {

		// Create popup menu and append to player
		// 'which' parameter is either 'captions', 'chapters', 'prefs', 'transcript-window' or 'sign-window'
		// 'tracks', if provided, is a list of tracks to be used as menu items

		var thisObj, $menu, includeMenuItem, i, $menuItem, prefCat, whichPref, hasDefault, track,
		windowOptions, $thisItem, $prevItem, $nextItem, hasDescription, hasTranscript;

		thisObj = this;

		$menu = $('<ul>',{
			'id': this.mediaId + '-' + which + '-menu',
			'class': 'able-popup',
			'role': 'menu'
		}).hide();

		if (which === 'captions') {
			$menu.addClass('able-popup-captions');
		}

		// Populate menu with menu items
		if (which === 'prefs') {
			if (this.prefCats.length > 1) {
				for (i = 0; i < this.prefCats.length; i++) {
					prefCat = this.prefCats[i];
					hasDescription = ( thisObj.hasDescTracks || thisObj.hasOpenDesc || thisObj.hasClosedDesc ) ? true : false;
					hasTranscript  = ( thisObj.transcriptType === null ) ? false : true;

					// If this player does not have descriptions or transcripts, do not output that option preferences.
					if ( prefCat === 'descriptions' && ! hasDescription || prefCat === 'transcript' && ! hasTranscript ) {
						continue;
					}
					$menuItem = $('<li></li>',{
						'role': 'menuitem',
						'tabindex': '-1'
					});
					if (prefCat === 'captions') {
						$menuItem.text( this.translate( 'prefMenuCaptions', 'Captions' ) );
					} else if (prefCat === 'descriptions') {
						$menuItem.text( this.translate( 'prefMenuDescriptions', 'Descriptions' ) );
					} else if (prefCat === 'keyboard') {
						$menuItem.text( this.translate( 'prefMenuKeyboard', 'Keyboard' ) );
					} else if (prefCat === 'transcript') {
						$menuItem.text( this.translate( 'prefMenuTranscript', 'Transcript' ) );
					}
					$menuItem.on('click',function() {
						whichPref = $(this).text();
						thisObj.showingPrefsDialog = true;
						thisObj.setFullscreen(false);
						if (whichPref === thisObj.translate( 'prefMenuCaptions', 'Captions' ) ) {
							thisObj.captionPrefsDialog.show();
						} else if (whichPref === thisObj.translate( 'prefMenuDescriptions', 'Descriptions' ) ) {
							thisObj.descPrefsDialog.show();
						} else if (whichPref === thisObj.translate( 'prefMenuKeyboard', 'Keyboard' ) ) {
							thisObj.keyboardPrefsDialog.show();
						} else if (whichPref === thisObj.translate( 'prefMenuTranscript', 'Transcript' ) ) {
							thisObj.transcriptPrefsDialog.show();
						}
						thisObj.closePopups();
						thisObj.showingPrefsDialog = false;
					});
					$menu.append($menuItem);
				}
				this.$prefsButton.attr('data-prefs-popup','menu');
			} else if (this.prefCats.length == 1) {
				// only 1 category, so don't create a popup menu.
				// Instead, open dialog directly when user clicks Prefs button
				this.$prefsButton.attr('data-prefs-popup',this.prefCats[0]);
			}
		} else if (which === 'captions' || which === 'chapters') {
			hasDefault = false;
			for (i = 0; i < tracks.length; i++) {
				track = tracks[i];
				if (which === 'captions' && this.player === 'html5' && typeof track.cues === 'undefined') {
					includeMenuItem = false;
				} else {
					includeMenuItem = true;
				}
				if (includeMenuItem) {
					$menuItem = $('<li></li>',{
						'role': 'menuitemradio',
						'tabindex': '-1',
						'lang': track.language
					});
					if (track.def && this.prefCaptions == 1) {
						$menuItem.attr('aria-checked','true');
						hasDefault = true;
					} else {
						$menuItem.attr('aria-checked','false');
					}
					// Get a label using track data
					if (which == 'captions') {
						$menuItem.text(track.label);
						$menuItem.on('click',this.getCaptionClickFunction(track));
					} else if (which == 'chapters') {
						$menuItem.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
						$menuItem.on('click',this.getChapterClickFunction(track.start));
					}
					$menu.append($menuItem);
				}
			}
			if (which === 'captions') {
				// add a 'captions off' menu item
				$menuItem = $('<li></li>',{
					'role': 'menuitemradio',
					'tabindex': '-1',
				}).text( this.translate( 'captionsOff', 'Captions off' ) );
				if (this.prefCaptions === 0) {
					$menuItem.attr('aria-checked','true');
					hasDefault = true;
				} else {
					$menuItem.attr('aria-checked','false');
				}
				$menuItem.on('click',this.getCaptionOffFunction());
				$menu.append($menuItem);
			}
		} else if (which === 'transcript-window' || which === 'sign-window') {
			windowOptions = [];
			windowOptions.push({
				'name': 'move',
				'label': this.translate( 'windowMove', 'Move' )
			});
			windowOptions.push({
				'name': 'resize',
				'label': this.translate( 'windowResize', 'Resize' )
			});
			windowOptions.push({
				'name': 'close',
				'label': this.translate( 'closeButtonLabel', 'Close' )
			});
			for (i = 0; i < windowOptions.length; i++) {
				$menuItem = $('<li></li>',{
					'role': 'menuitem',
					'tabindex': '-1',
					'data-choice': windowOptions[i].name
				});
				$menuItem.text(windowOptions[i].label);
				$menuItem.on('click',function(e) {
					e.stopPropagation();
					if (typeof e.button !== 'undefined' && e.button !== 0) {
						// this was a mouse click (if click is triggered by keyboard, e.button is undefined)
						// and the button was not a left click (left click = 0)
						// therefore, ignore this click
						return false;
					}
					if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
						thisObj.windowMenuClickRegistered = true;
						thisObj.handleMenuChoice(which.substring(0, which.indexOf('-')), $(this).attr('data-choice'), e);
					}
				});
				$menu.append($menuItem);
			}
		}
		// assign default item, if there isn't one already
		if (which === 'captions' && !hasDefault) {
			// check the menu item associated with the default language
			// as determined in control.js > syncTrackLanguages()
			if ($menu.find('li[lang=' + this.captionLang + ']')) {
				// a track exists for the default language. Check that item in the menu
				$menu.find('li[lang=' + this.captionLang + ']').attr('aria-checked','true');
			} else {
				// check the last item (captions off)
				$menu.find('li').last().attr('aria-checked','true');
			}
		} else if (which === 'chapters') {
			if ($menu.find('li:contains("' + this.defaultChapter + '")')) {
				$menu.find('li:contains("' + this.defaultChapter + '")').attr('aria-checked','true').addClass('able-focus');
			} else {
				$menu.find('li').first().attr('aria-checked','true').addClass('able-focus');
			}
		}
		// add keyboard handlers for navigating within popups
		$menu.on('keydown',function (e) {

			$thisItem = $(this).find('li:focus');
			if ($thisItem.is(':first-child')) {
				// this is the first item in the menu
				$prevItem = $(this).find('li').last(); // wrap to bottom
				$nextItem = $thisItem.next();
			} else if ($thisItem.is(':last-child')) {
				// this is the last Item
				$prevItem = $thisItem.prev();
				$nextItem = $(this).find('li').first(); // wrap to top
			} else {
				$prevItem = $thisItem.prev();
				$nextItem = $thisItem.next();
			}
			if (e.key === 'Tab') {
				if (e.shiftKey) {
					$thisItem.removeClass('able-focus');
					$prevItem.trigger('focus').addClass('able-focus');
				} else {
					$thisItem.removeClass('able-focus');
					$nextItem.trigger('focus').addClass('able-focus');
				}
			} else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
				$thisItem.removeClass('able-focus');
				$nextItem.trigger('focus').addClass('able-focus');
			} else if (e.key == 'ArrowUp' || e.key === 'ArrowLeft') {
				$thisItem.removeClass('able-focus');
				$prevItem.trigger('focus').addClass('able-focus');
			} else if (e.key === ' ' || e.key === 'Enter') {
				$thisItem.trigger( 'click' );
			} else if (e.key === 'Escape') {
				$thisItem.removeClass('able-focus');
				thisObj.closePopups();
				e.stopPropagation;
			}
			e.preventDefault();
		});
		this.$controllerDiv.append($menu);
		return $menu;
	};

	AblePlayer.prototype.closePopups = function () {

		var thisObj = this;

		if (this.chaptersPopup && this.chaptersPopup.is(':visible')) {
			this.chaptersPopup.hide();
			this.$chaptersButton.attr('aria-expanded','false').trigger('focus');
		}
		if (this.captionsPopup && this.captionsPopup.is(':visible')) {
			this.captionsPopup.hide();
			this.$ccButton.attr('aria-expanded', 'false');
			this.waitThenFocus(this.$ccButton);
		}
		if (this.prefsPopup && this.prefsPopup.is(':visible') && !this.hidingPopup) {
			this.hidingPopup = true; // stopgap to prevent popup from re-opening again on keypress
			this.prefsPopup.hide();
			// restore menu items to their original state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$prefsButton.attr('aria-expanded', 'false');
			if (!this.showingPrefsDialog) {
				this.waitThenFocus(thisObj.$prefsButton);
			}
			// wait briefly, then reset hidingPopup
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		}
		if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
			this.$volumeSlider.hide().attr('aria-hidden','true');
			this.$volumeButton.attr('aria-expanded', 'false').trigger('focus');
		}
		if (this.$transcriptPopup && this.$transcriptPopup.is(':visible')) {
			this.hidingPopup = true;
			this.$transcriptPopup.hide();
			// restore menu items to their original state
			this.$transcriptPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$transcriptPopupButton.attr('aria-expanded','false').trigger('focus');
			// wait briefly, then reset hidingPopup
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		}
		if (this.$signPopup && this.$signPopup.is(':visible')) {
			this.$signPopup.hide();
			// restore menu items to their original state
			this.$signPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$signPopupButton.attr('aria-expanded','false').trigger('focus');
		}
	};

	AblePlayer.prototype.setupPopups = function (which) {

		// Create and fill in the popup menu forms for various controls.
		// parameter 'which' is passed if refreshing content of an existing popup ('captions' or 'chapters')
		// If which is undefined, automatically setup 'captions', 'chapters', and 'prefs' popups
		// However, only setup 'transcript-window' and 'sign-window' popups if passed as value of which
		var popups, i, tracks;

		popups = [];
		if (typeof which === 'undefined') {
			popups.push('prefs');
		}

		if (which === 'captions' || (typeof which === 'undefined')) {
			if (this.captions.length > 0) {
				popups.push('captions');
			}
		}
		if (which === 'chapters' || (typeof which === 'undefined')) {
			if (this.chapters.length > 0 && this.useChaptersButton) {
				popups.push('chapters');
			}
		}
		if (which === 'transcript-window' && this.transcriptType === 'popup') {
			popups.push('transcript-window');
		}
		if (which === 'sign-window' && this.hasSignLanguage) {
			popups.push('sign-window');
		}
		if (popups.length > 0) {
			for (i=0; i<popups.length; i++) {
				var popup = popups[i];
				if (popup == 'prefs') {
					this.prefsPopup = this.createPopup('prefs');
				} else if (popup == 'captions') {
					if (typeof this.captionsPopup === 'undefined' || !this.captionsPopup) {
						this.captionsPopup = this.createPopup('captions',this.captions);
					}
				} else if (popup == 'chapters') {
					if (this.selectedChapters) {
						tracks = this.selectedChapters.cues;
					} else if (this.chapters.length >= 1) {
						tracks = this.chapters[0].cues;
					} else {
						tracks = [];
					}
					if (typeof this.chaptersPopup === 'undefined' || !this.chaptersPopup) {
						this.chaptersPopup = this.createPopup('chapters',tracks);
					}
				} else if (popup == 'transcript-window') {
					return this.createPopup('transcript-window');
				} else if (popup == 'sign-window') {
					return this.createPopup('sign-window');
				}
			}
		}
	};

	AblePlayer.prototype.provideFallback = function() {

		// provide fallback in case of a critical error building the player
		// to test, set data-test-fallback to either of the following values:
		// 1 = emulate failure to build Able Player
		// 2 = emulate browser that doesn't support HTML5 media

		var i, $fallback;

		if (this.usingFallback) {
			// fallback has already been implemented.
			// stopgap to prevent this function from executing twice on the same media element
			return;
		} else {
			this.usingFallback = true;
		}

		if (!this.testFallback) {
			// this is not a test.
			// an actual error has resulted in this function being called.
			// use scenario 1
			this.testFallback = 1;
		}

		if (typeof this.$media === 'undefined') {
			// this function has been called prior to initialize.js > reinitialize()
			// before doing anything, need to create the jQuery media object
			this.$media = $(this.media);
		}

		// get/assign an id for the media element
		if (this.$media.attr('id')) {
			this.mediaId = this.$media.attr('id');
		} else {
			this.mediaId = 'media' + Math.floor(Math.random() * 1000000000).toString();
		}

		// check whether element has nested fallback content
		this.hasFallback = false;
		if (this.$media.children().length) {
			i = 0;
			while (i < this.$media.children().length && !this.hasFallback) {
				if (!(this.$media.children()[i].tagName === 'SOURCE' ||
					this.$media.children()[i].tagName === 'TRACK')) {
					// this element is something other than <source> or <track>
					this.hasFallback = true;
				}
				i++;
			}
		}
		if (!this.hasFallback) {
			// the HTML code does not include any nested fallback content
			// inject our own
			// NOTE: this message is not translated, since fallback may be needed
			// due to an error loading the translation file
			// This will only be needed on very rare occasions, so English is ok.
			$fallback = $('<p>').text('Media player unavailable.');
			this.$media.append($fallback);
		}

		// get height and width attributes, if present
		// and add them to a style attribute
		if (this.$media.attr('width')) {
			this.$media.css('width',this.$media.attr('width') + 'px');
		}
		if (this.$media.attr('height')) {
			this.$media.css('height',this.$media.attr('height') + 'px');
		}
		// Remove data-able-player attribute
		this.$media.removeAttr('data-able-player');

		// Add controls attribute (so browser will add its own controls)
		this.$media.prop('controls',true);

		if (this.testFallback == 2) {

			// emulate browser failure to support HTML5 media by changing the media tag name
			// browsers should display the supported content that's nested inside
			$(this.$media).replaceWith($('<foobar id="foobar-' + this.mediaId + '">'));
			this.$newFallbackElement = $('#foobar-' + this.mediaId);

			// append all children from the original media
			if (this.$media.children().length) {
				i = this.$media.children().length - 1;
				while (i >= 0) {
					this.$newFallbackElement.prepend($(this.$media.children()[i]));
					i--;
				}
			}
			if (!this.hasFallback) {
				// inject our own fallback content, defined above
				this.$newFallbackElement.append($fallback);
			}
		} else {
			console.warn("Able Player encountered a problem, falling back to browser's HTML5 player.");
		}
		return;
	};

	AblePlayer.prototype.calculateControlLayout = function () {

		// Calculates the layout for controls based on media and options.
		// Returns an array with 4 keys (for legacy skin) or 2 keys (for 2020 skin)
		// Keys are the following order:
		// 0 = Top left
		// 1 = Top right
		// 2 = Bottom left (legacy skin only)
		// 3 = Bottom right (legacy skin only)
		// Each key contains an array of control names to put in that section.

		var controlLayout, playbackSupported, numA11yButtons;

		controlLayout = [];
		controlLayout[0] = [];
		controlLayout[1] = [];
		if (this.skin === 'legacy') {
			controlLayout[2] = [];
			controlLayout[3] = [];
		}

		controlLayout[0].push('play');
		controlLayout[0].push('restart');
		controlLayout[0].push('rewind');
		controlLayout[0].push('forward');

		if (this.skin === 'legacy') {
			controlLayout[1].push('seek');
		}

		if (this.hasPlaylist) {
			if (this.skin === 'legacy') {
				controlLayout[0].push('previous');
				controlLayout[0].push('next');
			} else {
				controlLayout[0].push('previous');
				controlLayout[0].push('next');
			}
		}

		if (this.isPlaybackRateSupported()) {
			playbackSupported = true;
			if (this.skin === 'legacy') {
				controlLayout[2].push('slower');
				controlLayout[2].push('faster');
			}
		} else {
			playbackSupported = false;
		}

		numA11yButtons = 0;
		if (this.hasCaptions) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('captions');
			} else {
				controlLayout[1].push('captions');
			}
		}
		if (this.hasSignLanguage) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('sign');
			} else {
				controlLayout[1].push('sign');
			}
		}
		if (this.mediaType === 'video') {
			if (this.hasOpenDesc || this.hasClosedDesc) {
				numA11yButtons++;
				if (this.skin === 'legacy') {
					controlLayout[2].push('descriptions');
				} else {
					controlLayout[1].push('descriptions');
				}
			}
		}
		if (this.transcriptType !== null && !(this.hideTranscriptButton)) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('transcript');
			} else {
				controlLayout[1].push('transcript');
			}
		}
		if (this.hasChapters && this.useChaptersButton) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('chapters');
			} else {
				controlLayout[1].push('chapters');
			}
		}

		if (this.skin == '2020' && numA11yButtons > 0) {
			controlLayout[1].push('pipe');
		}

		if (playbackSupported && this.skin === '2020') {
			controlLayout[1].push('faster');
			controlLayout[1].push('slower');
			controlLayout[1].push('pipe');
		}

		if (this.skin === 'legacy') {
			controlLayout[3].push('preferences');
		} else {
			controlLayout[1].push('preferences');
		}

		if (this.mediaType === 'video' && this.allowFullscreen && this.nativeFullscreenSupported() ) {
			if (this.skin === 'legacy') {
				controlLayout[3].push('fullscreen');
			} else {
				controlLayout[1].push('fullscreen');
			}
		}

		if (this.browserSupportsVolume()) {
			this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
			if (this.skin === 'legacy') {
				controlLayout[1].push('volume');
			} else {
				controlLayout[1].push('volume');
			}
		} else {
			this.volume = false;
		}
		return controlLayout;
	};

	AblePlayer.prototype.addControls = function() {

		// determine which controls to show based on several factors:
		// mediaType (audio vs video)
		// availability of tracks (e.g., for closed captions & audio description)
		// browser support (e.g., for sliders and speedButtons)
		// user preferences (???)
		// some controls are aligned on the left, and others on the right

		var thisObj, controlLayout, numSections,
		i, j, controls, $controllerSpan, $sliderDiv, sliderLabel, $pipe, control,
		buttonTitle, $newButton, buttonText, position, buttonHeight,
		buttonWidth, buttonSide, controllerWidth, tooltipId, tooltipY, tooltipX,
		tooltipWidth, tooltipStyle, tooltip, tooltipTimerId, captionLabel, popupMenuId;

		thisObj = this;

		// Initialize the layout into the this.controlLayout variable.
		controlLayout = this.calculateControlLayout();
		numSections = controlLayout.length;

		// add an empty div to serve as a tooltip
		tooltipId = this.mediaId + '-tooltip';
		this.$tooltipDiv = $('<div>',{
			'id': tooltipId,
			'class': 'able-tooltip'
		}).hide();
		this.$controllerDiv.append(this.$tooltipDiv);

		if (this.skin == '2020') {
			// add a full-width seek bar
			$sliderDiv = $('<div class="able-seekbar"></div>');
			sliderLabel = this.mediaType + ' ' + this.translate( 'seekbarLabel', 'timeline' );
			this.$controllerDiv.append($sliderDiv);
			this.seekBar = new AccessibleSlider($sliderDiv, this.duration, this.seekInterval, sliderLabel );
		}

		// add a full-width seek bar
		let $controlRow = $('<div class="able-control-row"></div>');
		this.$controllerDiv.append($controlRow);

		for (i = 0; i < numSections; i++) {
			controls = controlLayout[i];
			if ((i % 2) === 0) { // even keys on the left
				$controllerSpan = $('<div>',{
					'class': 'able-left-controls'
				});
			} else { // odd keys on the right
				$controllerSpan = $('<div>',{
					'class': 'able-right-controls'
				});
			}
			$controlRow.append($controllerSpan);

			for (j=0; j<controls.length; j++) {
				control = controls[j];
				if (control === 'seek') {
					$sliderDiv = $('<div class="able-seekbar"></div>');
					sliderLabel = this.mediaType + ' ' + this.translate( 'seekbarLabel', 'timeline' );
					$controllerSpan.append($sliderDiv);
					if (typeof this.duration === 'undefined' || this.duration === 0) {
						// set arbitrary starting duration, and change it when duration is known
						this.duration = 60;
						// also set elapsed to 0
						this.elapsed = 0;
					}
					this.seekBar = new AccessibleSlider( $sliderDiv, this.duration, this.seekInterval, sliderLabel );
				} else if (control === 'pipe') {
					$pipe = $('<span>', {
						'aria-hidden': 'true',
						'class': 'able-pipe',
					});
					$pipe.append('|');
					$controllerSpan.append($pipe);
				} else {
					// this control is a button
					buttonTitle = this.getButtonTitle(control);

					// Buttons consist of a <div role="button"> with an <svg> inside.
					// We add aria-label to the button (but not title)
					// This has been thoroughly tested and works well in all screen reader/browser combinations
					// See https://github.com/ableplayer/ableplayer/issues/81

					// NOTE: Changed from <button> to <div role="button" as of 4.2.18
					// because <button> elements are rendered poorly in high contrast mode
					// in some OS/browser/plugin combinations

					// In 5.0.0, icons are always SVG, so the font & image icon edge cases are removed.
					$newButton = $('<div>',{
						'role': 'button',
						'tabindex': '0',
						'class': 'able-button-handler-' + control
					});

					if (control === 'volume' || control === 'preferences' || control === 'captions') {
						if (control == 'preferences') {
							this.prefCats = this.getPreferencesGroups();
							if (this.prefCats.length > 1) {
								// Prefs button will trigger a menu
								popupMenuId = this.mediaId + '-prefs-menu';
								$newButton.attr({
									'aria-controls': popupMenuId,
									'aria-haspopup': 'menu',
									'aria-expanded': 'false'
								});
							} else if (this.prefCats.length === 1) {
								// Prefs button will trigger a dialog
								$newButton.attr({
									'aria-haspopup': 'dialog'
								});
							}
						} else if (control === 'volume') {
							popupMenuId = this.mediaId + '-volume-slider';
							// volume slider popup is not a menu or a dialog
							// therefore, using aria-expanded rather than aria-haspopup to communicate properties/state
							$newButton.attr({
								'aria-controls': popupMenuId,
								'aria-expanded': 'false'
							});
						} else if (control === 'captions' && this.captions) {
							if (this.captions.length > 1) {
								$newButton.attr('aria-expanded', 'false');
							} else {
								$newButton.attr('aria-pressed', 'false');
							}
						}
					}
					var getControl = control;
					if ( control === 'faster' && this.speedIcons === 'animals' ) {
						getControl = 'rabbit';
					}
					if ( control === 'slower' && this.speedIcons === 'animals' ) {
						getControl = 'turtle';
					}
					if ( control === 'volume' ) {
						this.getIcon( $newButton, this.volumeButton );
					} else {
						if ( 'fullscreen' === getControl ) {
							getControl = ( this.fullscreen ) ? 'fullscreen-collapse' : 'fullscreen-expand';
						}
						this.getIcon( $newButton, getControl );
					}

					this.setText($newButton,buttonTitle);
					// add an event listener that displays a tooltip on mouseenter or focus
					$newButton.on('mouseenter focus',function(e) {

						// when entering a new tooltip, we can forget about hiding the previous tooltip.
						// since the same tooltip div is used, it's location just changes.
						clearTimeout(tooltipTimerId);

						buttonText = $(this).attr('aria-label');
						// get position of this button
						position = $(this).position();
						buttonHeight = $(this).height();
						buttonWidth = $(this).width();
						// position() is expressed using top and left (of button);
						// add right (of button) too, for convenience
						controllerWidth = thisObj.$controllerDiv.width();
						position.right = controllerWidth - position.left - buttonWidth;

						// The following formula positions tooltip below the button
						// which allows the tooltip to be hoverable as per WCAG 2.x SC 1.4.13
						// without obstructing the seekbar
						tooltipY = position.top + buttonHeight + 5;

						if ($(this).parent().hasClass('able-right-controls')) {
							// this control is on the right side
							buttonSide = 'right';
						} else {
							// this control is on the left side
							buttonSide = 'left';
						}
						// populate tooltip, then calculate its width before showing it
						tooltipWidth = AblePlayer.localGetElementById($newButton[0], tooltipId).text(buttonText).width();
						// center the tooltip horizontally over the button
						if (buttonSide == 'left') {
							tooltipX = position.left - tooltipWidth/2;
							if (tooltipX < 0) {
								// tooltip would exceed the bounds of the player. Adjust.
								tooltipX = 2;
							}
							tooltipStyle = {
								left: tooltipX + 'px',
								right: '',
								top: tooltipY + 'px'
							};
						} else {
							tooltipX = position.right - tooltipWidth/2;
							if (tooltipX < 0) {
								// tooltip would exceed the bounds of the player. Adjust.
								tooltipX = 2;
							}
							tooltipStyle = {
								left: '',
								right: tooltipX + 'px',
								top: tooltipY + 'px'
							};
						}
						tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(buttonText).css(tooltipStyle);
						thisObj.showTooltip(tooltip);
						$(this).on('mouseleave blur',function() {

							// (keep the tooltip visible if user hovers over it)
							// This causes unwanted side effects if tooltips are positioned above the buttons
							// as the persistent tooltip obstructs the seekbar,
							// blocking users from being able to move a pointer from a button to the seekbar
							// This limitation was addressed in 4.4.49 by moving the tooltip below the buttons

							// clear existing timeout before reassigning variable
							clearTimeout(tooltipTimerId);
							tooltipTimerId = setTimeout(function() {
								// give the user a half second to move cursor to tooltip before removing
								// see https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus#hoverable
								AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
							}, 500);

							thisObj.$tooltipDiv.on('mouseenter focus', function() {
								clearTimeout(tooltipTimerId);
							});

							thisObj.$tooltipDiv.on('mouseleave blur', function() {
								AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
							});

						});
					});

					if (control === 'captions') {
						if (!this.prefCaptions || this.prefCaptions !== 1) {
							// captions are available, but user has them turned off
							if (this.captions.length > 1) {
								captionLabel = this.translate( 'captions', 'Captions' );
							} else {
								captionLabel = this.translate( 'showCaptions', 'Show captions' );
							}
							$newButton.addClass('buttonOff').attr('title',captionLabel);
							$newButton.attr('aria-pressed', 'false');
						}
					} else if (control === 'descriptions') {
						if (!this.prefDesc || this.prefDesc !== 1) {
							// user prefer non-audio described version
							// Therefore, load media without description
							// Description can be toggled on later with this button
							$newButton.addClass('buttonOff').attr( 'title', this.translate( 'turnOnDescriptions', 'Turn on descriptions' ) );
						}
					}

					$controllerSpan.append($newButton);

					// create variables of buttons that are referenced throughout the AblePlayer object
					if (control === 'play') {
						this.$playpauseButton = $newButton;
					} else if (control == 'previous') {
						this.$prevButton = $newButton;
						// if player is being rebuilt because user clicked the Prev button
						// return focus to that (newly built) button
						if (this.buttonWithFocus == 'previous') {
							this.$prevButton.trigger('focus');
							this.buttonWithFocus = null;
						}
					} else if (control == 'next') {
						this.$nextButton = $newButton;
						// if player is being rebuilt because user clicked the Next button
						// return focus to that (newly built) button
						if (this.buttonWithFocus == 'next') {
							this.$nextButton.trigger('focus');
							this.buttonWithFocus = null;
						}
					} else if (control === 'captions') {
						this.$ccButton = $newButton;
					} else if (control === 'sign') {
						this.$signButton = $newButton;
						// gray out sign button if sign language window is not active
						if (!(this.$signWindow.is(':visible'))) {
							this.$signButton.addClass('buttonOff');
						}
					} else if (control === 'descriptions') {
						this.$descButton = $newButton;
						// button will be enabled or disabled in description.js > initDescription()
					} else if (control === 'mute') {
						this.$muteButton = $newButton;
					} else if (control === 'transcript') {
						this.$transcriptButton = $newButton;
						// gray out transcript button if transcript is not active
						if (!(this.$transcriptDiv.is(':visible'))) {
							this.$transcriptButton.addClass('buttonOff').attr( 'title', this.translate( 'showTranscript', 'Show transcript' ) );
						}
					} else if (control === 'fullscreen') {
						this.$fullscreenButton = $newButton;
					} else if (control === 'chapters') {
						this.$chaptersButton = $newButton;
					} else if (control === 'preferences') {
						this.$prefsButton = $newButton;
					} else if (control === 'volume') {
						this.$volumeButton = $newButton;
					}
				}
				if (control === 'volume') {
					// in addition to the volume button, add a hidden slider
					this.addVolumeSlider($controllerSpan);
				}
			}
			if ((i % 2) == 1) {
				this.$controllerDiv.append('<div class="ableplayer-clear"></div>');
			}
		}

		if (typeof this.$captionsDiv !== 'undefined') {
			// stylize captions based on user prefs
			this.stylizeCaptions(this.$captionsDiv);
		}
		if (typeof this.$descDiv !== 'undefined') {
			// stylize descriptions based on user's caption prefs
			this.stylizeCaptions(this.$descDiv);
		}

		// combine left and right controls arrays for future reference
		this.controls = [];
		for (var sec in controlLayout) if (Object.hasOwn(controlLayout, sec)) {
			this.controls = this.controls.concat(controlLayout[sec]);
		}

		// Update state-based display of controls.
		this.refreshControls();
	};

	AblePlayer.prototype.cuePlaylistItem = function(sourceIndex) {

		// Move to a new item in a playlist.
		// NOTE: Swapping source for audio description is handled elsewhere;
		// see description.js > swapDescription()

		var $newItem, prevPlayer, newPlayer, itemTitle, itemLang, nowPlayingSpan;

		var thisObj = this;

		prevPlayer = this.player;

		if (this.initializing) ; else {
			if (this.playerCreated) {
				// remove the old
				this.deletePlayer('playlist');
			}
		}

		// set swappingSrc; needs to be true within recreatePlayer(), called below
		this.swappingSrc = true;

		// if a new playlist item is being requested, and playback has already started,
		// it should be ok to play automatically, regardless of how it was requested
		if (this.startedPlaying) {
			this.okToPlay = true;
		} else {
			this.okToPlay = false;
		}

		// We are no longer loading the previous media source
		// Only now, as a new source is requested, is it safe to reset this var
		// It will be reset to true when media.load() is called
		this.loadingMedia = false;

		// Determine appropriate player to play this media
		$newItem = this.$playlist.eq(sourceIndex);
		this.playlistIndex = sourceIndex;
		if (this.hasAttr($newItem,'data-youtube-id')) {
			this.youTubeId = this.getYouTubeId($newItem.attr('data-youtube-id'));
			if (this.hasAttr($newItem,'data-youtube-desc-id')) {
				this.youTubeDescId = this.getYouTubeId($newItem.attr('data-youtube-desc-id'));
			}
			newPlayer = 'youtube';
		} else if (this.hasAttr($newItem,'data-vimeo-id')) {
			this.vimeoId = this.getVimeoId($newItem.attr('data-vimeo-id'));
			if (this.hasAttr($newItem,'data-vimeo-desc-id')) {
				this.vimeoDescId = this.getVimeoId($newItem.attr('data-vimeo-desc-id'));
			}
			newPlayer = 'vimeo';
		} else {
			newPlayer = 'html5';
		}
		if (newPlayer === 'youtube') {
			if (prevPlayer === 'html5') {
				// pause and hide the previous media
				if (this.playing) {
					this.pauseMedia();
				}
				this.$media.hide();
			}
		} else {
			// the new player is not youtube
			this.youTubeId = false;
			if (prevPlayer === 'youtube') {
				// unhide the media element
				this.$media.show();
			}
		}
		this.player = newPlayer;

		// remove source and track elements from previous playlist item
		this.$media.empty();

		// transfer media attributes from playlist to media element
		if (this.hasAttr($newItem,'data-poster')) {
			this.$media.attr('poster',$newItem.attr('data-poster'));
		}
		if (this.hasAttr($newItem,'data-youtube-desc-id')) {
			this.$media.attr('data-youtube-desc-id',$newItem.attr('data-youtube-desc-id'));
		}
		if (this.youTubeId) {
			this.$media.attr('data-youtube-id',$newItem.attr('data-youtube-id'));
		}

		// add new <source> elements from playlist data
		var $sourceSpans = $newItem.children('span.able-source');
		if ($sourceSpans.length) {
			$sourceSpans.each(function() {
				const $this = $(this);

				// Check if the required data-src attribute exists
				if (thisObj.hasAttr($this, "data-src")) {
					const sanitizedSrc = DOMPurify.sanitize($this.attr("data-src"));

					// Validate the protocol of the sanitized URL
					if (validate.isProtocolSafe(sanitizedSrc)) {
						// Create a new <source> element with the sanitized src
						const $newSource = $("<source>", { src: sanitizedSrc });

						// List of optional attributes to sanitize and add
						const optionalAttributes = [
							"data-type",
							"data-desc-src",
							"data-sign-src",
						];

						// Process optional attributes
						optionalAttributes.forEach((attr) => {
							if (thisObj.hasAttr($this, attr)) {
								const attrValue = $this.attr(attr); // Get the attribute value
								const sanitizedValue = DOMPurify.sanitize(attrValue); // Sanitize the value

								// If the attribute ends with "-src", validate the protocol
								if (attr.endsWith("-src") && validate.isProtocolSafe(sanitizedValue)) {
									$newSource.attr(attr, sanitizedValue); // Add the sanitized and validated attribute
								} else if (!attr.endsWith("-src")) {
									$newSource.attr(attr, sanitizedValue); // Add sanitized value for non-src attributes
								}
							}
             			});

						// Append the new <source> element to the media object
						thisObj.$media.append($newSource);
					}
				}
			});
		}

		// add new <track> elements from playlist data
		var $trackSpans = $newItem.children('span.able-track');
		if ($trackSpans.length) {
			 // for each element in $trackSpans, create a new <track> element
			$trackSpans.each(function() {
				const $this = $(this);
				if (thisObj.hasAttr($this, "data-src") && thisObj.hasAttr($this, "data-kind") && thisObj.hasAttr($this, "data-srclang")) {
					// all required attributes are present
					const sanitizedSrc = DOMPurify.sanitize($this.attr("data-src"));
					// Validate the protocol of the sanitized URL
					if (validate.isProtocolSafe(sanitizedSrc)) {
						// Create a new <track> element with the sanitized src
						const $newTrack = $("<track>", {
							src: sanitizedSrc,
							kind: $this.attr("data-kind"),
							srclang: $this.attr("data-srclang"),
						});
						// List of optional attributes to sanitize and add
						const optionalAttributes = [
							"data-label",
							"data-desc",
							"data-default",
						];
						optionalAttributes.forEach((attr) => {
							if (thisObj.hasAttr($this, attr)) {
								$newTrack.attr(attr, DOMPurify.sanitize($this.attr(attr)));
							}
						});
						// Append the new <track> element to the media object
						thisObj.$media.append($newTrack);
					}
				}
			});
		}

		itemTitle = DOMPurify.sanitize( $newItem.text() );
		if (this.hasAttr($newItem,'lang')) {
			itemLang = $newItem.attr('lang');
		}
		// Update relevant arrays
		this.$sources = this.$media.find('source');

		// recreate player, informed by new attributes and track elements
		if (this.recreatingPlayer) {
			// stopgap to prevent multiple firings of recreatePlayer()
			return;
		}
		this.recreatePlayer().then(function() {

			// update playlist to indicate which item is playing
			thisObj.$playlist.removeClass('able-current')
				.children('button').removeAttr('aria-current');
			thisObj.$playlist.eq(sourceIndex).addClass('able-current')
				.children('button').attr('aria-current','true');

			// update Now Playing div
			if (thisObj.showNowPlaying === true) {
				if (typeof thisObj.$nowPlayingDiv !== 'undefined') {
					nowPlayingSpan = $('<span>');
					if (typeof itemLang !== 'undefined') {
						nowPlayingSpan.attr('lang',itemLang);
					}
					nowPlayingSpan.html('<span>' + thisObj.translate( 'selectedTrack', 'Selected Track' ) + ':</span>' + itemTitle);
					thisObj.$nowPlayingDiv.html(nowPlayingSpan);
				}
			}

			// if thisObj.swappingSrc is true, media will autoplay when ready
			if (thisObj.initializing) { // this is the first track - user hasn't pressed play yet
				thisObj.swappingSrc = false;
			} else {
				if (thisObj.player === 'html5') {
					if (!thisObj.loadingMedia) {
						thisObj.media.load();
						thisObj.loadingMedia = true;
					}
				} else if (thisObj.player === 'youtube') {
					thisObj.okToPlay = true;
				}
			}
			thisObj.initializing = false;
			thisObj.playerCreated = true; // remains true until browser is refreshed
		});
	};

	AblePlayer.prototype.deletePlayer = function(context) {

		// remove player components that need to be rebuilt
		// after swapping media sources that have different durations
		// or explicitly declared data-desc attributes

		// Context is one of the following:
		// playlist - called from cuePlaylistItem()
		// swap-desc-html - called from swapDescription with this.player == 'html'
		// swap-desc-youtube - called from swapDescription with this.player == 'youtube'
		// swap-desc-vimeo -  called from swapDescription with this.player == 'vimeo'

		if (this.player === 'youtube' && this.youTubePlayer) {
			this.youTubePlayer.destroy();
		}

		if (this.player === 'vimeo' && this.vimeoPlayer) {
			this.vimeoPlayer.destroy();
		}

		// Empty elements that will be rebuilt
		this.$controllerDiv.empty();
		// this.$statusBarDiv.empty();
		// this.$timer.empty();
		this.$elapsedTimeContainer.empty().text('0:00'); // span.able-elapsedTime
		this.$durationContainer.empty(); // span.able-duration

		// Remove popup windows and modal dialogs; these too will be rebuilt
		if (this.$signWindow) {
				this.$signWindow.remove();
		}
		if (this.$transcriptArea) {
				this.$transcriptArea.remove();
		}
		$('.able-modal-dialog').remove();

		// Remove caption and description wrappers
		if (this.$captionsWrapper) {
			this.$captionsWrapper.remove();
		}
		if (this.$descDiv) {
			this.$descDiv.remove();
		}

		// reset key variables
		this.hasCaptions = false;
		this.hasChapters = false;
		this.hasDescTracks = false;
		this.hasOpenDesc = false;
		this.hasClosedDesc = false;

		this.captionsPopup = null;
		this.chaptersPopup = null;
		this.transcriptType = null;

		this.playerDeleted = true; // will reset to false in recreatePlayer()
	};

	AblePlayer.prototype.getButtonTitle = function(control) {

		if (control === 'playpause') {
			return this.translate( 'play', 'Play' );
		} else if (control === 'play') {
			return this.translate( 'play', 'Play' );
		} else if (control === 'pause') {
			return this.translate( 'pause', 'Pause' );
		} else if (control === 'restart') {
			return this.translate( 'restart', 'Restart' );
		} else if (control === 'previous') {
			return this.translate( 'prevTrack', 'Previous track' );
		} else if (control === 'next') {
			return this.translate( 'nextTrack', 'Next track' );
		} else if (control === 'rewind') {
			return this.translate( 'rewind', 'Rewind' );
		} else if (control === 'forward') {
			return this.translate( 'forward', 'Forward' );
		} else if (control === 'captions') {
			if (this.captions.length > 1) {
				return this.translate( 'captions', 'Captions' );
			} else {
				return (this.captionsOn) ? this.translate( 'hideCaptions', 'Hide captions' ) : this.translate( 'showCaptions', 'Show captions' );
			}
		} else if (control === 'descriptions') {
			return (this.descOn) ? this.translate( 'turnOffDescriptions', 'Turn off descriptions' ) : this.translate( 'turnOnDescriptions', 'Turn on descriptions' );
		} else if (control === 'transcript') {
			return (this.$transcriptDiv.is(':visible')) ? this.translate( 'hideTranscript', 'Hide transcript' ) : this.translate( 'showTranscript', 'Show transcript' );
		} else if (control === 'chapters') {
			return this.translate( 'chapters', 'Chapters' );
		} else if (control === 'sign') {
			return this.translate( 'sign', 'Sign language' );
		} else if (control === 'volume') {
			return this.translate( 'volume', 'Volume' );
		} else if (control === 'faster') {
			return this.translate( 'faster', 'Faster' );
		} else if (control === 'slower') {
			return this.translate( 'slower', 'Slower' );
		} else if (control === 'preferences') {
			return this.translate( 'preferences', 'Preferences' );
		} else if (control === 'fullscreen') {
			return ( !this.fullscreen ) ? this.translate( 'enterFullScreen', 'Enter full screen' ) : this.translate( 'exitFullScreen', 'Exit full screen' );
		} else {
			// there should be no other controls, but just in case:
			// return the name of the control with first letter in upper case
			// ultimately will need to get a translated label from this.tt
			if (this.debug) ;
			return this.capitalizeFirstLetter( control );
		}
	};
}

function addCaptionFunctions(AblePlayer) {
  AblePlayer.prototype.updateCaption = function (time) {
    if (
      !this.usingYouTubeCaptions &&
      !this.usingVimeoCaptions &&
      typeof this.$captionsWrapper !== "undefined"
    ) {
      if (this.captionsOn) {
        this.$captionsWrapper.show();
        if (typeof time !== "undefined") {
          this.showCaptions(time);
        }
      } else if (this.$captionsWrapper) {
        this.$captionsWrapper.hide();
        this.prefCaptions = 0;
      }
    }
  };

  AblePlayer.prototype.updateCaptionsMenu = function (lang) {
    // uncheck all previous menu items
    this.captionsPopup.find("li").attr("aria-checked", "false");
    if (typeof lang === "undefined") {
      // check the last menu item (captions off)
      this.captionsPopup.find("li").last().attr("aria-checked", "true");
    } else {
      // check the newly selected lang
      this.captionsPopup
        .find("li[lang=" + lang + "]")
        .attr("aria-checked", "true");
    }
  };

  AblePlayer.prototype.getCaptionClickFunction = function (track) {
    // Returns the function used when a caption is clicked in the captions menu.
    // Not called if user clicks "Captions off". Instead, that triggers getCaptionOffFunction()

    var thisObj = this;
    return function () {
      thisObj.selectedCaptions = track;
      thisObj.captionLang = track.language;
      thisObj.currentCaption = -1;
      if (thisObj.usingYouTubeCaptions) {
        if (thisObj.captionsOn) {
          // Two things must be true in order for setOption() to work:
          // The YouTube caption module must be loaded
          // and the video must have started playing
          if (
            thisObj.youTubePlayer.getOptions("captions") &&
            thisObj.startedPlaying
          ) {
            thisObj.youTubePlayer.setOption("captions", "track", {
              languageCode: thisObj.captionLang,
            });
          } else {
            // the two conditions were not met
            // try again to set the language after onApiChange event is triggered
            // meanwhile, the following variable will hold the value
            thisObj.captionLangPending = thisObj.captionLang;
          }
        } else {
          if (thisObj.youTubePlayer.getOptions("captions")) {
            thisObj.youTubePlayer.setOption("captions", "track", {
              languageCode: thisObj.captionLang,
            });
          } else {
            thisObj.youTubePlayer.loadModule("captions");
            thisObj.captionLangPending = thisObj.captionLang;
          }
        }
      } else if (thisObj.usingVimeoCaptions) {
        thisObj.vimeoPlayer
          .enableTextTrack(thisObj.captionLang)
          .catch(function (error) {
            switch (error.name) {
                          }
          });
      } else {
        // using local track elements for captions/subtitles
        thisObj.syncTrackLanguages("captions", thisObj.captionLang);
        if (!thisObj.swappingSrc) {
          thisObj.updateCaption(thisObj.elapsed);
          thisObj.showDescription(thisObj.elapsed);
        }
      }
      thisObj.captionsOn = true;
      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it (used in handleCaptionToggle())
      thisObj.hidingPopup = true;
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.attr("aria-expanded", "false");
      if (thisObj.mediaType === "audio") {
        thisObj.$captionsContainer.removeClass("captions-off");
      }
      // Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
      // e.g., if user triggered button with Enter or mouse click, not spacebar
      setTimeout(function () {
        thisObj.hidingPopup = false;
      }, 100);
      thisObj.updateCaptionsMenu(thisObj.captionLang);
      thisObj.waitThenFocus(thisObj.$ccButton);

      // save preference to cookie
      thisObj.prefCaptions = 1;
      thisObj.updatePreferences("prefCaptions");
      thisObj.refreshControls("captions");
    };
  };

  // Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      if (thisObj.player == "youtube") {
        thisObj.youTubePlayer.unloadModule("captions");
      } else if (thisObj.usingVimeoCaptions) {
        thisObj.vimeoPlayer.disableTextTrack();
      }
      thisObj.captionsOn = false;
      thisObj.currentCaption = -1;

      if (thisObj.mediaType === "audio") {
        thisObj.$captionsContainer.addClass("captions-off");
      }

      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it (used in handleCaptionToggle())
      thisObj.hidingPopup = true;
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.attr("aria-expanded", "false");
      // Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
      // e.g., if user triggered button with Enter or mouse click, not spacebar
      setTimeout(function () {
        thisObj.hidingPopup = false;
      }, 100);
      thisObj.updateCaptionsMenu();
      thisObj.waitThenFocus(thisObj.$ccButton);

      // save preference to cookie
      thisObj.prefCaptions = 0;
      thisObj.updatePreferences("prefCaptions");
      if (!this.swappingSrc) {
        thisObj.refreshControls("captions");
        thisObj.updateCaption();
      }
    };
  };

  AblePlayer.prototype.showCaptions = function (now) {
    var c, thisCaption, nextCaption, captionText, announceText, announcement, availableTime, rate, cueLength, estimatedTime;
    var cues;
    if (null !== this.selectedCaptions.cues && this.selectedCaptions.cues.length) {
      cues = this.selectedCaptions.cues;
    } else if (this.captions.length >= 1) {
      cues = this.captions[0].cues;
    } else {
      cues = [];
    }
    for (c = 0; c < cues.length; c++) {
      if (cues[c].start <= now && cues[c].end > now) {
        thisCaption = c;
		nextCaption = cues[ c + 1 ];
        break;
      }
    }

    if (typeof thisCaption !== "undefined") {
      if (this.currentCaption !== thisCaption) {
        // it's time to load the new caption into the container div
        captionText = this.flattenCueForCaption(cues[thisCaption]).replace( /\n/g, "<br>" );
		// If preference enabled to voice captions, send to synthesizer.
		if ( this.speechEnabled && this.prefCaptionsSpeak == 1 ) {
			announceText = new DOMParser().parseFromString( captionText, 'text/html' );
			announcement = announceText.body.textContent || '';
			availableTime = ( thisCaption ) ? nextCaption.start - cues[thisCaption].start : 0;
			rate = false;
			if ( availableTime ) {
				cueLength = announcement.trim().split(/\W+/).length;
				estimatedTime = Math.round( ( ( cueLength ) / 135 ) * 60 );
				rate = ( estimatedTime / availableTime );
			}
			// use browser's built-in speech synthesis
			this.announceText( 'caption', announcement, rate );
		}
        this.$captionsDiv.html(captionText);
        this.currentCaption = thisCaption;
        if (captionText.length === 0) {
          // hide captionsDiv; otherwise background-color is visible due to padding
          this.$captionsDiv.css("display", "none");
        } else {
          this.$captionsDiv.css("display", "inline-block");
        }
      }
    } else {
      this.$captionsDiv.html("").css("display", "none");
      this.currentCaption = -1;
    }
  };

  AblePlayer.prototype.flattenCueForCaption = function (cue) {
    // Takes a cue and returns the caption text to display
    // Also used for chapters

    // Support for 'i' and 'b' tags added in 2.3.66
    // TODO: Add support for 'c' (class) and 'ruby'

    // c (class): <c.myClass1.myClass2>Some text</c>
    // Classes can be used to modify other tags too (e.g., <v.loud>)
    // If <c> tag, should be rendered as a <span>

    // ruby: http://www.w3schools.com/tags/tag_ruby.asp

    // WebVTT also supports 'u' (underline)
    // I see no reason to support that in Able Player.
    // If it's available authors are likely to use it incorrectly
    // where <i> or <b> should be used instead
    // Here are the rare use cases where an underline is appropriate on the web:
    // http://html5doctor.com/u-element/

    var result = [];

    var flattenComponent = function (component) {
      var result = [],
        ii;
      if (component.type === "string") {
        result.push(component.value);
      } else if (component.type === "v") {
        result.push("(" + component.value + ")");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      } else if (component.type === "i") {
        result.push("<em>");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
        result.push("</em>");
      } else if (component.type === "b") {
        result.push("<strong>");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
        result.push("</strong>");
      } else {
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join("");
    };

    if (typeof cue.components !== "undefined") {
      for (var ii = 0; ii < cue.components.children.length; ii++) {
        result.push(flattenComponent(cue.components.children[ii]));
      }
    }
    return result.join("");
  };

  AblePlayer.prototype.getCaptionsOptions = function (pref) {
    var options = [];

    switch (pref) {
      case "prefCaptionsFont":
        options[0] = ["serif", this.translate( 'serif', 'serif' )];
        options[1] = ["sans-serif", this.translate( 'sans', 'sans-serif' )];
        options[2] = ["cursive", this.translate( 'cursive', 'cursive' )];
        options[3] = ["fantasy", this.translate( 'fantasy', 'fantasy' )];
        options[4] = ["monospace", this.translate( 'monospace', 'monospace' )];
        break;

      case "prefCaptionsColor":
      case "prefCaptionsBGColor":
        // HTML color values must be in English
        options[0] = ["white", this.translate( 'white', 'white' )];
        options[1] = ["yellow", this.translate( 'yellow', 'yellow' )];
        options[2] = ["green", this.translate( 'green', 'green' )];
        options[3] = ["cyan", this.translate( 'cyan', 'cyan' )];
        options[4] = ["blue", this.translate( 'blue', 'blue' )];
        options[5] = ["magenta", this.translate( 'magenta', 'magenta' )];
        options[6] = ["red", this.translate( 'red', 'red' )];
        options[7] = ["black", this.translate( 'black', 'black' )];
        break;

      case "prefCaptionsSize":
        options[0] = "75%";
        options[1] = "100%";
        options[2] = "125%";
        options[3] = "150%";
        options[4] = "200%";
        break;

      case "prefCaptionsOpacity":
        options[0] = "0%";
        options[1] = "25%";
        options[2] = "50%";
        options[3] = "75%";
        options[4] = "100%";
        break;

      case "prefCaptionsStyle":
        options[0] = this.translate( 'captionsStylePopOn', 'Pop-on' );
        options[1] = this.translate( 'captionsStyleRollUp', 'Roll-up' );
        break;

      case "prefCaptionsPosition":
        options[0] = "overlay";
        options[1] = "below";
        break;

      case "prefCaptionsSpeak":
        options[0] = ["0", this.translate( 'off', 'Off' ) ];
        options[1] = ["1", this.translate( 'on', 'On' ) ];
        break;

      case "prefCaptionsVoice":
		options[0] = null; // set later.
        break;

      case "prefCaptionsPitch":
		options[0] = null; // set later.
        break;

      case "prefCaptionsRate":
		options[0] = null; // set later.
        break;

      case "prefCaptionsVolume":
		options[0] = null; // set later.
        break;
    }

    return options;
  };

  AblePlayer.prototype.translatePrefs = function (pref, value, outputFormat) {
    // translate current value of pref to a value supported by outputformat
    if (outputFormat == "youtube") {
      if (pref === "size") {
        // YouTube font sizes are a range from -1 to 3 (0 = default)
        switch (value) {
          case "75%":
            return -1;
          case "100%":
            return 0;
          case "125%":
            return 1;
          case "150%":
            return 2;
          case "200%":
            return 3;
        }
      }
    }
    return false;
  };

  AblePlayer.prototype.stylizeCaptions = function ($element, pref) {
    // $element is the jQuery element containing the captions
    // this function handles stylizing of the sample caption text in the Prefs dialog
    // plus the actual production captions
    // TODO: consider applying the same user prefs to visible text-based description
    var property, newValue, opacity;

    if (typeof $element !== "undefined") {
      if (pref == "prefCaptionsPosition") {
        this.positionCaptions();
      } else if (typeof pref !== "undefined") {
        // just change the one property that user just changed
        if (pref === "prefCaptionsFont") {
          property = "font-family";
        } else if (pref === "prefCaptionsSize") {
          property = "font-size";
        } else if (pref === "prefCaptionsColor") {
          property = "color";
        } else if (pref === "prefCaptionsBGColor") {
          property = "background-color";
        } else if (pref === "prefCaptionsOpacity") {
          property = "opacity";
        }
        if (pref === "prefCaptionsOpacity") {
          newValue =
            parseFloat($("#" + this.mediaId + "_" + pref).val()) / 100.0;
        } else {
          newValue = $("#" + this.mediaId + "_" + pref).val();
        }
        $element.css(property, newValue);
      } else {
        // no property was specified, update all styles with current saved prefs
        opacity = parseFloat(this.prefCaptionsOpacity) / 100.0;
        $element.css({
          "font-family": this.prefCaptionsFont,
          color: this.prefCaptionsColor,
          "background-color": this.prefCaptionsBGColor,
          opacity: opacity,
        });
        if ($element === this.$captionsDiv) {
          if (typeof this.$captionsDiv !== "undefined") {
            this.$captionsDiv.css({
              "font-size": this.prefCaptionsSize,
            });
          }
        }
        if (this.prefCaptionsPosition === "below") {
          // also need to add the background color to the wrapper div
          if (typeof this.$captionsWrapper !== "undefined") {
            this.$captionsWrapper.css({
              "background-color": this.prefCaptionsBGColor,
              opacity: "1",
            });
          }
        } else if (this.prefCaptionsPosition === "overlay") {
          // no background color for overlay wrapper, captions are displayed in-line
          if (typeof this.$captionsWrapper !== "undefined") {
            this.$captionsWrapper.css({
              "background-color": "transparent",
              opacity: "",
            });
          }
        }
        this.positionCaptions();
      }
    }
  };
  AblePlayer.prototype.positionCaptions = function (position) {
    // set caption position to either 'overlay' or 'below'
    // if position parameter was passed to this function, use that
    // otherwise use user preference
    if (typeof position === "undefined") {
      position = this.prefCaptionsPosition;
    }
    if (typeof this.$captionsWrapper !== "undefined") {
      if (position == "below") {
        this.$captionsWrapper
          .removeClass("able-captions-overlay")
          .addClass("able-captions-below");
        // also need to update in-line styles
        this.$captionsWrapper.css({
          "background-color": this.prefCaptionsBGColor,
          opacity: "1",
        });
      } else {
        this.$captionsWrapper
          .removeClass("able-captions-below")
          .addClass("able-captions-overlay");
        this.$captionsWrapper.css({
          "background-color": "transparent",
          opacity: "",
        });
      }
    }
  };
}

function addChaptersFunctions(AblePlayer) {

	AblePlayer.prototype.populateChaptersDiv = function() {

		var headingLevel, headingType, headingId, $chaptersHeading;
		if ( ! this.chaptersDivLocation ) {
			return;
		}
		if ($('#' + this.chaptersDivLocation)) {

			this.$chaptersDiv = $('#' + this.chaptersDivLocation);
			this.$chaptersDiv.addClass('able-chapters-div');

			// empty content from previous build before starting fresh
			this.$chaptersDiv.empty();

			// add optional header
			if (this.chaptersTitle) {
				headingLevel = this.getNextHeadingLevel(this.$chaptersDiv);
				headingType = 'h' + headingLevel.toString();
				headingId = this.mediaId + '-chapters-heading';
				$chaptersHeading = $('<' + headingType + '>', {
					'class': 'able-chapters-heading',
					'id': headingId
				}).text(this.chaptersTitle);
				this.$chaptersDiv.append($chaptersHeading);
			}

			this.$chaptersNav = $('<nav>');
			if (this.chaptersTitle) {
				this.$chaptersNav.attr( 'aria-labelledby', headingId );
			} else {
				this.$chaptersNav.attr( 'aria-label', this.translate( 'chapters', 'Chapters' ) );
			}
			this.$chaptersDiv.append(this.$chaptersNav);

			// populate this.$chaptersNav with a list of chapters
			this.updateChaptersList();
		}
	};

	AblePlayer.prototype.updateChaptersList = function() {

		var thisObj, cues, $chaptersList, c, thisChapter,
			$chapterItem, $chapterButton, hasDefault,
			getClickFunction, $clickedItem;

		thisObj = this;

		// TODO: Update this so it can change the chapters popup menu
		// currently it only works if chapters are in an external container
		if (!this.$chaptersNav) {
			return false;
		}

		if (typeof this.useChapterTimes === 'undefined') {
			this.useChapterTimes = (this.seekbarScope === 'chapter' && this.selectedChapters.cues.length) ? true : false;
		}
		if (this.useChapterTimes) {
			cues = this.selectedChapters.cues;
		} else if (this.chapters.length >= 1) {
			cues = this.chapters[0].cues;
		} else {
			cues = [];
		}
		if (cues.length > 0) {
			$chaptersList = $('<ul>');
			for (c = 0; c < cues.length; c++) {
				thisChapter = c;
				$chapterItem = $('<li></li>');
				$chapterButton = $('<button>',{
					'type': 'button',
					'val': thisChapter
				}).text(this.flattenCueForCaption(cues[thisChapter]));

				// add event listeners
				getClickFunction = function (time) {
					return function () {
						thisObj.seekTrigger = 'chapter';
						$clickedItem = $(this).closest('li');
						$chaptersList = $(this).closest('ul').find('li');
						$chaptersList.removeClass('able-current-chapter')
							.children('button').removeAttr('aria-current');
						$clickedItem.addClass('able-current-chapter')
							.children('button').attr('aria-current','true');
						// Need to updateChapter before seeking to it
						// Otherwise seekBar is redrawn with wrong chapterDuration and/or chapterTime
						thisObj.updateChapter(time);
						thisObj.seekTo(time);
					}
				};
				$chapterButton.on('click',getClickFunction(cues[thisChapter].start)); // works with Enter too
				$chapterButton.on('focus',function() {
					$(this).closest('ul').find('li').removeClass('able-focus');
					$(this).closest('li').addClass('able-focus');
				});
				$chapterItem.on('hover',function() {
					$(this).closest('ul').find('li').removeClass('able-focus');
					$(this).addClass('able-focus');
				});
				$chapterItem.on('mouseleave',function() {
					$(this).removeClass('able-focus');
				});
				$chapterButton.on('blur',function() {
					$(this).closest('li').removeClass('able-focus');
				});

				// put it all together
				$chapterItem.append($chapterButton);
				$chaptersList.append($chapterItem);
				if (this.defaultChapter === cues[thisChapter].id) {
					$chapterButton.attr('aria-current','true').parent('li').addClass('able-current-chapter');
					this.currentChapter = cues[thisChapter];
					hasDefault = true;
				}
			}
			if (!hasDefault) {
				// select the first chapter
				this.currentChapter = cues[0];
				$chaptersList.find('button').first().attr('aria-current','true')
					.parent('li').addClass('able-current-chapter');
			}
			this.$chaptersNav.html($chaptersList);
		}
		return false;
	};

	AblePlayer.prototype.seekToChapter = function(chapterId) {

		// step through chapters looking for matching ID
		var i=0;
		while (i < this.selectedChapters.cues.length) {
			if (this.selectedChapters.cues[i].id == chapterId) {
				// found the target chapter! Seek to it
				this.seekTo(this.selectedChapters.cues[i].start);
				this.updateChapter(this.selectedChapters.cues[i].start);
				break;
			}
			i++;
		}
	};

	AblePlayer.prototype.updateChapter = function (now) {

		// as time-synced chapters change during playback, track changes in current chapter
		if (typeof this.selectedChapters === 'undefined') {
			return;
		}

		var chapters, i, thisChapterIndex;

		chapters = this.selectedChapters.cues;
		for (i = 0; i < chapters.length; i++) {
			if ((chapters[i].start <= now) && (chapters[i].end > now)) {
				thisChapterIndex = i;
				break;
			}
		}
		if (typeof thisChapterIndex !== 'undefined') {
			if (this.currentChapter !== chapters[thisChapterIndex]) {
				// this is a new chapter
				this.currentChapter = chapters[thisChapterIndex];
				if (this.useChapterTimes) {
					this.chapterDuration = this.getChapterDuration();
					this.seekIntervalCalculated = false; // will be recalculated in setSeekInterval()
				}
				if (typeof this.$chaptersDiv !== 'undefined') {
					// chapters are listed in an external container
					this.$chaptersDiv.find('ul').find('li')
						.removeClass('able-current-chapter')
						.children('button').removeAttr('aria-current');
					this.$chaptersDiv.find('ul').find('li').eq(thisChapterIndex)
						.addClass('able-current-chapter')
						.children('button').attr('aria-current','true');
				}
			}
		}
	};

	AblePlayer.prototype.getChapterDuration = function () {

		// called if this.seekbarScope === 'chapter'
		// get duration of the current chapter

		var lastChapterIndex, chapterEnd;

		if (typeof this.currentChapter === 'undefined') {
			return 0;
		}
		if (typeof this.duration === 'undefined') {
			return 0;
		}
		lastChapterIndex = this.selectedChapters.cues.length-1;
		if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
			// this is the last chapter
			if (this.currentChapter.end !== this.duration) {
				// chapter ends before or after video ends, adjust chapter end to match video end
				chapterEnd = this.duration;
				this.currentChapter.end = this.duration;
			} else {
				chapterEnd = this.currentChapter.end;
			}
		} else { // this is not the last chapter
			chapterEnd = this.currentChapter.end;
		}
		return chapterEnd - this.currentChapter.start;
	};

	AblePlayer.prototype.getChapterElapsed = function () {
		// called if this.seekbarScope === 'chapter'
		// get current elapsed time, relative to the current chapter duration

		if (typeof this.currentChapter === 'undefined') {
			return 0;
		}

		if (this.elapsed > this.currentChapter.start) {
			return this.elapsed - this.currentChapter.start;
		} else {
			return 0;
		}
	};

	AblePlayer.prototype.convertChapterTimeToVideoTime = function (chapterTime) {

		// chapterTime is the time within the current chapter
		// return the same time, relative to the entire video
		if (typeof this.currentChapter !== 'undefined') {
			var newTime = this.currentChapter.start + chapterTime;
			if (newTime > this.currentChapter.end) {
				return this.currentChapter.end;
			} else {
				return newTime;
			}
		} else {
			return chapterTime;
		}
	};

	AblePlayer.prototype.getChapterClickFunction = function (time) {

		// Returns the function used when a chapter is clicked in the chapters menu.
		var thisObj = this;
		return function () {
			thisObj.seekTrigger = 'chapter';
			thisObj.seekTo(time);
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it (used in handleChapters())
			thisObj.hidingPopup = true;
			thisObj.chaptersPopup.hide();
			// Ensure stopgap gets cancelled if handleChapters() isn't called
			// e.g., if user triggered button with Enter or mouse click, not spacebar
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.$chaptersButton.trigger('focus');
		}
	};

}

function addControlFunctions(AblePlayer) {

	AblePlayer.prototype.seekTo = function (newTime) {

		var thisObj = this;

		// define variables to be used for analytics
		// e.g., to measure the extent to which users seek back and forward
		this.seekFromTime = this.media.currentTime;
		this.seekToTime = newTime;

		this.seeking = true;
		this.liveUpdatePending = true;

		if (this.speakingDescription) {
			this.synth.cancel();
		}

		this.syncSignVideo( {'time' : this.startTime } );

		if (this.player === 'html5') {
			var seekable;

			this.startTime = newTime;
			// Check HTML5 media "seekable" property to be sure media is seekable to startTime
			seekable = this.media.seekable;
			if (seekable.length > 0 && this.startTime >= seekable.start(0) && this.startTime <= seekable.end(0)) {
				// ok to seek to startTime
				// canplaythrough will be triggered when seeking is complete
				// this.seeking will be set to false at that point
				this.media.currentTime = this.startTime;
				this.seekStatus = 'complete';
				this.syncSignVideo( { 'time' : this.startTime } );
			}
		} else if (this.player === 'youtube') {
			this.youTubePlayer.seekTo(newTime,true);
			if (newTime > 0) {
				if (typeof this.$posterImg !== 'undefined') {
					this.$posterImg.hide();
				}
			}
			this.syncSignVideo( {'time' : newTime } );
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.setCurrentTime(newTime).then(function() {
				// seek finished.
				// successful completion also fires a 'seeked' event (see event.js)
				thisObj.elapsed = newTime;
				thisObj.refreshControls('timeline');
			});
		}
		this.refreshControls('timeline');
	};

	AblePlayer.prototype.getMediaTimes = function (duration, elapsed) {

		 // Returns an array with keys 'duration' and 'elapsed'
		 // Vars passed to this function come courtesy of select Vimeo events
		 // Use those if they're available.
		 // Otherwise, will need to call the relevant media API
		 // This function should only be called from onMediaUpdateTime()
		 // If duration and elapsed are needed other times, use this.duration and this.elapsed

		// both values are expressed in seconds, and all player APIs are similar:
		// they return a value that is rounded to the nearest second before playback begins,
		// then to the nearest thousandth of a second after playback begins
		// With HTML5 media API, some browsers are more precise (e.g., Firefox rounds to 6 decimal points)
		// but inconsistent (values with 9 decimal points have been sporadically observed in Safari)
		// For standardization, values are rounded to 6 decimal points before they're returned

		var deferred, promise, thisObj, mediaTimes;
		mediaTimes = {};

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		if (typeof duration !== 'undefined' && typeof elapsed !== 'undefined') {
			mediaTimes['duration'] = duration;
			mediaTimes['elapsed'] = elapsed;
			deferred.resolve(mediaTimes);
		} else {
			this.getDuration().then(function(duration) {
				mediaTimes['duration'] = thisObj.roundDown(duration,6);
				thisObj.getElapsed().then(function(elapsed) {
					mediaTimes['elapsed'] = thisObj.roundDown(elapsed,6);
					deferred.resolve(mediaTimes);
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.getDuration = function () {

		// returns duration of the current media, expressed in seconds
		// function is called by getMediaTimes, and return value is sanitized there
		var deferred, promise;

		deferred = new this.defer();
		promise = deferred.promise();

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				 this.vimeoPlayer.getDuration().then(function(duration) {
					if (duration === undefined || isNaN(duration) || duration === -1) {
						deferred.resolve(0);
					} else {
						deferred.resolve(duration);
					}
				});
			} else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		} else {
			var duration;
			if (this.player === 'html5') {
				duration = this.media.duration;
			} else if (this.player === 'youtube') {
				if (this.youTubePlayerReady) {
					if (this.duration > 0) {
						// duration was already retrieved while checking for captions
						duration = this.duration;
					} else {
						duration = this.youTubePlayer.getDuration();
					}
				} else { // the YouTube player hasn't initialized yet
					duration = 0;
				}
			}
			if (duration === undefined || isNaN(duration) || duration === -1) {
				deferred.resolve(0);
			} else {
				deferred.resolve(duration);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getElapsed = function () {

		// returns elapsed time of the current media, expressed in seconds
		// function is called by getMediaTimes, and return value is sanitized there

		var deferred, promise;

		deferred = new this.defer();
		promise = deferred.promise();

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				this.vimeoPlayer.getCurrentTime().then(function(elapsed) {
					if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
						deferred.resolve(0);
					} else {
						deferred.resolve(elapsed);
					}
				});
			} else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		} else {
			var elapsed;
			if (this.player === 'html5') {
				elapsed = this.media.currentTime;
			} else if (this.player === 'youtube') {
				if (this.youTubePlayerReady) {
					elapsed = this.youTubePlayer.getCurrentTime();
				} else { // the YouTube player hasn't initialized yet
					elapsed = 0;
				}
			}
			if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
				deferred.resolve(0);
			} else {
				deferred.resolve(elapsed);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getPlayerState = function () {

		// Returns one of the following states:
		// - 'stopped' - Not yet played for the first time, or otherwise reset to unplayed.
		// - 'ended' - Finished playing.
		// - 'paused' - Not playing, but not stopped or ended.
		// - 'buffering' - Momentarily paused to load, but will resume once data is loaded.
		// - 'playing' - Currently playing.

		var deferred, promise, thisObj;
		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'html5') {
			if (this.media.ended) {
				deferred.resolve('ended');
			} else if (this.media.paused) {
				deferred.resolve('paused');
			} else if (this.media.readyState !== 4) {
				deferred.resolve('buffering');
			} else {
				deferred.resolve('playing');
			}
		} else if (this.player === 'youtube' && this.youTubePlayerReady) {
			var state = this.youTubePlayer.getPlayerState();
			if (state === -1 || state === 5) {
				deferred.resolve('stopped');
			} else if (state === 0) {
				deferred.resolve('ended');
			} else if (state === 1) {
				deferred.resolve('playing');
			} else if (state === 2) {
				deferred.resolve('paused');
			} else if (state === 3) {
				deferred.resolve('buffering');
			}
		} else if (this.player === 'vimeo' && this.vimeoPlayer) {
				// curiously, Vimeo's API has no getPlaying(), getBuffering(), or getState() methods
			// so maybe if it's neither paused nor ended, it must be playing???
			this.vimeoPlayer.getPaused().then(function(paused) {
				if (paused) {
					deferred.resolve('paused');
				} else {
					thisObj.vimeoPlayer.getEnded().then(function(ended) {
						if (ended) {
							deferred.resolve('ended');
						} else {
							deferred.resolve('playing');
						}
					});
				}
			});
		}
		return promise;
	};

	AblePlayer.prototype.isPlaybackRateSupported = function () {

		if (this.player === 'html5') {
			return (this.media.playbackRate) ? true : false;
		} else if (this.player === 'youtube') {
			// Youtube supports varying playback rates per video.
			// Only expose controls if more than one playback rate is available.
			if (this.youTubePlayerReady) {
				return (this.youTubePlayer.getAvailablePlaybackRates().length > 1) ? true : false;
			} else {
				return false;
			}
		} else if (this.player === 'vimeo') {
			// since this takes longer to determine, it was set previously in initVimeoPlayer()
			return this.vimeoSupportsPlaybackRateChange;
		}
	};

	AblePlayer.prototype.setPlaybackRate = function (rate) {

		rate = Math.max(0.5, rate);

		if (this.hasClosedDesc && this.descMethod === 'text') {
			// keep speech rate in sync with playback rate even if descOn is false
			this.syncSpeechToPlaybackRate(rate);
		}

		this.syncSignVideo( {'rate' : rate } );

		if (this.player === 'html5') {
			this.media.playbackRate = rate;
		} else if (this.player === 'youtube') {
			this.youTubePlayer.setPlaybackRate(rate);
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.setPlaybackRate(rate);
		}
		this.syncSignVideo( { 'rate' : rate } );
		this.playbackRate = rate;
		this.$speed.text( this.translate( 'speed', 'Speed' ) + ': ' + rate.toFixed(2).toString() + 'x');
	};

	AblePlayer.prototype.getPlaybackRate = function () {

		if (this.player === 'html5') {
			return this.media.playbackRate;
		} else if (this.player === 'youtube' && (this.youTubePlayerReady)) {
			return this.youTubePlayer.getPlaybackRate();
		}
	};

	AblePlayer.prototype.isPaused = function () {

		// Note there are three player states that count as paused in this sense,
		// and one of them is named 'paused'.
		// A better name would be 'isCurrentlyNotPlayingOrBuffering'

		if (this.player === 'vimeo') {
			// just rely on value of this.playing
			return (this.playing) ? false : true;
		} else {
			this.getPlayerState().then(function(state) {
				// if any of the following is true, consider the media 'paused'
				return state === 'paused' || state === 'stopped' || state === 'ended';
			});
		}
	};

	AblePlayer.prototype.syncSignVideo = function(options) {
		if (this.hasSignLanguage && ( this.signVideo || this.signYoutube ) ) {
			if (options && typeof options.time !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.currentTime = options.time;
				} else {
					this.youTubeSignPlayer.seekTo(options.time,true);
				}
			}
			if (options && typeof options.rate !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.playbackRate = options.rate;
				} else {
					this.youTubeSignPlayer.setPlaybackRate(options.rate);
				}
			}
			if (options && typeof options.pause !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.pause(true);
				} else {
					this.youTubeSignPlayer.pauseVideo();
				}
			}
			if (options && typeof options.play !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.play(true);
				} else {
					this.youTubeSignPlayer.playVideo();
				}
			}
			if (options && typeof options.volume !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.volume = 0;
				}
			}
		}
	};

	AblePlayer.prototype.pauseMedia = function () {

		this.syncSignVideo( { 'pause' : true } );

		if (this.player === 'html5') {
			this.media.pause(true);
		} else if (this.player === 'youtube') {
			this.youTubePlayer.pauseVideo();
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.pause();
		}
	};

	AblePlayer.prototype.playMedia = function () {

		this.syncSignVideo( { 'play' : true } );

		if (this.player === 'html5') {
			this.media.play(true);
		} else if (this.player === 'youtube') {

			this.youTubePlayer.playVideo();
			if (typeof this.$posterImg !== 'undefined') {
				this.$posterImg.hide();
			}
			this.stoppingYouTube = false;
		} else if (this.player === 'vimeo') {
			 this.vimeoPlayer.play();
		}
		this.startedPlaying = true;
		if (this.hideControls) {
			// wait briefly after playback begins, then hide controls
			this.hidingControls = true;
			this.invokeHideControlsTimeout();
		}
	};

	AblePlayer.prototype.fadeControls = function(direction) {

		// Visibly fade controls without hiding them from screen reader users
		// direction is either 'out' or 'in'

		// After the player fades, it's replaced by an empty space
		// Would be better if the video and captions expanded to fill the void
		// replace JS animation with CSS animation in 12/2025.

		if (direction == 'out') {
			// get the original height of two key components:
			this.$playerDiv.addClass( 'fade-out' ).removeClass( 'fade-in' );
		} else if (direction == 'in') {
			this.$playerDiv.addClass( 'fade-in' ).removeClass( 'fade-out' );
		}
	};

	AblePlayer.prototype.invokeHideControlsTimeout = function () {

		// invoke timeout for waiting a few seconds after a mouse move or key down
		// before hiding controls again
		var thisObj = this;
		this.hideControlsTimeout = window.setTimeout(function() {
			if (typeof thisObj.playing !== 'undefined' && thisObj.playing === true && thisObj.hideControls) {
				thisObj.fadeControls('out');
				thisObj.controlsHidden = true;
			}
		},5000);
		this.hideControlsTimeoutStatus = 'active';
	};

	AblePlayer.prototype.refreshControls = function(context = 'init', duration, elapsed) {

		// context is one of the following:
		// 'init' - initial build (or subsequent change that requires full rebuild)
		// 'timeline' - a change may effect time-related controls
		// 'captions' - a change may effect caption-related controls
		// 'descriptions' - a change may effect description-related controls
		// 'transcript' - a change may effect the transcript window or button
		// 'fullscreen' - a change has been triggered by full screen toggle
		// 'playpause' - a change triggered by either a 'play' or 'pause' event

		// NOTE: context is not currently supported.
		// The steps in this function have too many complex interdependencies
		// The gains in efficiency are offset by the possibility of introducing bugs
		// For now, executing everything
		context = 'init';

		// duration and elapsed are passed from callback functions of Vimeo API events
		// duration is expressed as sss.xxx
		// elapsed is expressed as sss.xxx

		var thisObj, textByState, timestamp,  captionsCount, newTop,	statusBarWidthBreakpoint;

		thisObj = this;
		// wait until new source has loaded before refreshing controls
		// some critical events won't fire until playback of new media starts
		if ( this.swappingSrc && this.playing ) {
			return;
		}

		if ( context === 'timeline' || context === 'init' ) {
			// Update timeline controls.
			var lastChapterIndex, displayElapsed, updateLive, widthUsed,
				leftControls, rightControls, seekbarWidth, buffered;
			// all timeline-related functionality requires duration
			if (typeof this.duration === 'undefined') {
				// wait until duration is known before proceeding with refresh
				return;
			}
			if (this.useChapterTimes) {
				this.chapterDuration = this.getChapterDuration();
				this.chapterElapsed = this.getChapterElapsed();
			}

			if ( !this.useFixedSeekInterval && !this.seekIntervalCalculated && this.duration > 0) {
				// couldn't calculate seekInterval previously; try again.
				this.setSeekInterval();
			}

			if (this.seekBar) {
				if (this.useChapterTimes) {
					lastChapterIndex = this.selectedChapters.cues.length-1;
					if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
						// this is the last chapter
						if (this.currentChapter.end !== this.duration) {
							// chapter ends before or after video ends
							// need to adjust seekbar duration to match video end
							this.seekBar.setDuration(this.duration - this.currentChapter.start);
						} else {
							this.seekBar.setDuration(this.chapterDuration);
						}
					} else {
						// this is not the last chapter
						this.seekBar.setDuration(this.chapterDuration);
					}
				} else if ( !(this.duration === undefined || isNaN(this.duration) || this.duration === -1) ) {
					this.seekBar.setDuration(this.duration);
				}
				if (!(this.seekBar.tracking)) {
					// Only update the aria live region if we have an update pending
					// (from a seek button control) or if the seekBar has focus.
					// We use document.activeElement instead of $(':focus') due to a strange bug:
					// When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
					updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
					this.liveUpdatePending = false;
					if (this.useChapterTimes) {
						this.seekBar.setPosition(this.chapterElapsed, updateLive);
					} else {
						this.seekBar.setPosition(this.elapsed, updateLive);
					}
				}

				// When seeking, display the seek bar time instead of the actual elapsed time.
				if (this.seekBar.tracking) {
					displayElapsed = this.seekBar.lastTrackPosition;
				} else {
					displayElapsed = ( this.useChapterTimes ) ? this.chapterElapsed : this.elapsed;
				}
			}
			// update elapsed & duration
			if (typeof this.$durationContainer !== 'undefined') {
				if (this.useChapterTimes) {
					this.$durationContainer.text( this.formatSecondsAsColonTime(this.chapterDuration));
				} else {
					this.$durationContainer.text( this.formatSecondsAsColonTime(this.duration));
				}
			}
			if (typeof this.$elapsedTimeContainer !== 'undefined') {
				this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
			}

			if (this.skin === 'legacy') {
				// Update seekbar width.
				// To do this, we need to calculate the width of all buttons surrounding it.
				if (this.seekBar) {
					let controlWrapper = this.seekBar.wrapperDiv.parent().parent();
					leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
					rightControls = leftControls.next('div.able-right-controls');
					widthUsed = leftControls.outerWidth(true);
					rightControls.children().each(function () {
						if ($(this).attr('role')=='button') {
							widthUsed += $(this).outerWidth(true) + 5;
						}
					});
					if (this.fullscreen) {
						seekbarWidth = $(window).width() - widthUsed;
					} else {
						// seekbar is wide enough to fill the remaining space
						// include a 10px buffer to account for minor browser differences or custom styles.
						seekbarWidth = controlWrapper.width() - widthUsed - 10;
					}
					// Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
					if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
						this.seekBar.setWidth(seekbarWidth);
					}
				}
			}

			// Update buffering progress.
			// TODO: Currently only using the first HTML5 buffered interval,
			// but this fails sometimes when buffering is split into two or more intervals.
			if (this.player === 'html5' && this.media.buffered.length > 0) {
				buffered = this.media.buffered.end(0);
				if (this.useChapterTimes) {
					if (buffered > this.chapterDuration) {
						buffered = this.chapterDuration;
					}
					if (this.seekBar) {
						this.seekBar.setBuffered(buffered / this.chapterDuration);
					}
				} else if ( this.seekBar && !isNaN(buffered) ) {
					this.seekBar.setBuffered(buffered / duration);
				}
			} else if (this.player === 'youtube' && this.seekBar && this.youTubePlayerReady ) {
				this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
			} else if (this.player === 'vimeo') ;
		}

		if (context === 'descriptions' || context == 'init') {
			if (this.$descButton) {
				this.toggleButtonState(
					this.$descButton,
					this.descOn,
					this.translate( 'turnOffDescriptions', 'Turn off descriptions' ),
					this.translate( 'turnOnDescriptions', 'Turn on descriptions' ),
				);
			}
		}

		if (context === 'captions' || context == 'init') {

			if (this.$ccButton) {

				captionsCount = this.captions.length;
				if (captionsCount > 1) {
					this.$ccButton.attr({
						'aria-haspopup': 'true',
						'aria-controls': this.mediaId + '-captions-menu'
					});
				}
				var ariaLabelOn = ( captionsCount > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'showCaptions', 'Show captions' );
				var ariaLabelOff = ( captionsCount > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'hideCaptions', 'Hide captions' );
				var ariaPressed = ( captionsCount > 1 ) ? true : false;

				this.toggleButtonState(
					this.$ccButton,
					this.captionsOn,
					ariaLabelOff,
					ariaLabelOn,
					ariaPressed
				);
			}
		}

		if (context === 'fullscreen' || context == 'init'){
			if (this.$fullscreenButton) {
				if (!this.fullscreen) {
					this.$fullscreenButton.attr( 'aria-label', this.translate( 'enterFullScreen', 'Enter full screen' ) );
					this.getIcon( this.$fullscreenButton, 'fullscreen-expand' );
				} else {
					this.$fullscreenButton.attr('aria-label', this.translate( 'exitFullScreen', 'Exit full screen' ) );
					this.getIcon( this.$fullscreenButton, 'fullscreen-collapse' );
				}
			}
		}
		if (context === 'playpause' || context == 'init'){
			if (typeof this.$bigPlayButton !== 'undefined' && typeof this.seekBar !== 'undefined') {
				// Choose show/hide for big play button and adjust position.
				if (this.paused && !this.seekBar.tracking) {
					if (!this.hideBigPlayButton) {
						this.$bigPlayButton.show();
						this.$bigPlayButton.attr('aria-hidden', 'false');
					}
				} else {
					this.$bigPlayButton.hide();
					this.$bigPlayButton.attr('aria-hidden', 'true');
				}
			}
		}

		if (context === 'transcript' || context == 'init'){

			if (this.transcriptType) {
				// Sync checkbox and autoScrollTranscript with user preference
				if (this.prefAutoScrollTranscript === 1) {
					this.autoScrollTranscript = true;
					this.$autoScrollTranscriptCheckbox.prop('checked',true);
				} else {
					this.autoScrollTranscript = false;
					this.$autoScrollTranscriptCheckbox.prop('checked',false);
				}

				// If transcript locked, scroll transcript to current highlight location.
				if (this.autoScrollTranscript && this.currentHighlight) {
					newTop = Math.floor(this.$transcriptDiv.scrollTop() +
						$(this.currentHighlight).position().top -
						(this.$transcriptDiv.height() / 2) +
						($(this.currentHighlight).height() / 2));
					if (newTop !== Math.floor(this.$transcriptDiv.scrollTop())) {
						// Set a flag to ignore the coming scroll event.
						// there's no other way I know of to differentiate programmatic and user-initiated scroll events.
						this.scrollingTranscript = true;
						// only scroll once after moving a highlight
						if (this.movingHighlight) {
							this.$transcriptDiv.scrollTop(newTop);
							this.movingHighlight = false;
						}
					}
				}
			}
		}

		if (context === 'init') {

			if (this.$chaptersButton) {
				this.$chaptersButton.attr({
					'aria-label': this.translate( 'chapters', 'Chapters' ),
					'aria-haspopup': 'true',
					'aria-controls': this.mediaId + '-chapters-menu'
				});
			}
		}

		if (context === 'timeline' || context === 'playpause' || context === 'init') {

			// update status
			textByState = {
				'stopped': this.translate( 'statusStopped', 'Stopped' ),
				'paused': this.translate( 'statusPaused', 'Paused' ),
				'playing': this.translate( 'statusPlaying', 'Playing' ),
				'buffering': this.translate( 'statusBuffering', 'Buffering' ),
				'ended': this.translate( 'statusEnd', 'End of track' )
			};

			if (this.stoppingYouTube) {
				// stoppingYouTube is true temporarily while video is paused and seeking to 0
				// See notes in handleRestart()
				// this.stoppingYouTube will be reset when seek to 0 is finished (in event.js > onMediaUpdateTime())
				if (this.$status.text() !== this.translate( 'statusStopped', 'Stopped' ) ) {
					this.$status.text( this.translate( 'statusStopped', 'Stopped' ) );
				}
				this.getIcon( this.$playpauseButton, 'play' );
			} else if (typeof this.$status !== 'undefined' && typeof this.seekBar !== 'undefined') {
				// Update the text only if it's changed since it has role="alert";
				// also don't update while tracking, since this may Pause/Play the player but we don't want to send a Pause/Play update.
				this.getPlayerState().then(function(currentState) {
					if (thisObj.$status.text() !== textByState[currentState] && !thisObj.seekBar.tracking) {
						// Debounce updates; only update after status has stayed steadily different for a while
						// "A while" is defined differently depending on context
						if (thisObj.swappingSrc) {
							// this is where most of the chatter occurs (e.g., playing, paused, buffering, playing),
							// so set a longer wait time before writing a status message
							if (!thisObj.debouncingStatus) {
								thisObj.statusMessageThreshold = 2000; // in ms (2 seconds)
							}
						} else if (!thisObj.debouncingStatus) {
							// for all other contexts (e.g., users clicks Play/Pause)
							// user should receive more rapid feedback
							thisObj.statusMessageThreshold = 250; // in ms
						}
						timestamp = (new Date()).getTime();
						if (!thisObj.statusDebounceStart) {
							thisObj.statusDebounceStart = timestamp;
							// Call refreshControls() again after allotted time has passed
							thisObj.debouncingStatus = true;
							thisObj.statusTimeout = setTimeout(function () {
								thisObj.debouncingStatus = false;
								thisObj.refreshControls(context);
							}, thisObj.statusMessageThreshold);
						} else if ((timestamp - thisObj.statusDebounceStart) > thisObj.statusMessageThreshold) {
							thisObj.$status.text(textByState[currentState]);
							thisObj.statusDebounceStart = null;
							clearTimeout(thisObj.statusTimeout);
							thisObj.statusTimeout = null;
						}
					} else {
						thisObj.statusDebounceStart = null;
						thisObj.debouncingStatus = false;
						clearTimeout(thisObj.statusTimeout);
						thisObj.statusTimeout = null;
					}
					// Don't change play/pause button display while using the seek bar (or if YouTube stopped)
					if (!thisObj.seekBar.tracking && !thisObj.stoppingYouTube) {
						if (currentState === 'paused' || currentState === 'stopped' || currentState === 'ended') {
							thisObj.$playpauseButton.attr('aria-label', thisObj.translate( 'play', 'Play' ) );
							thisObj.getIcon( thisObj.$playpauseButton, 'play' );
						} else {
							thisObj.$playpauseButton.attr('aria-label', thisObj.translate( 'pause', 'Pause' ) );
							thisObj.getIcon( thisObj.$playpauseButton, 'pause' );
						}
					}
				});
			}
		}

		// Show/hide status bar content conditionally
		if (!this.fullscreen) {
			statusBarWidthBreakpoint = 300;
			if (this.$statusBarDiv.width() < statusBarWidthBreakpoint) {
				// Player is too small for a speed span
				this.$statusBarDiv.find('span.able-speed').hide();
				this.hidingSpeed = true;
			} else {
				if (this.hidingSpeed) {
					this.$statusBarDiv.find('span.able-speed').show();
					this.hidingSpeed = false;
				}
			}
		}

	};

	AblePlayer.prototype.handlePlay = function(e) {
		if (this.paused) {
			// user clicked play
			this.okToPlay = true;
			this.playMedia();
			if (this.synth.paused) {
				// media was paused while description was speaking
				// resume utterance
				this.synth.resume();
			}
		} else {
			// user clicked pause
			this.okToPlay = false;
			this.pauseMedia();
			if (this.speakingDescription) {
				// pause the current utterance
				// it will resume when the user presses play
				this.synth.pause();
			}
		}
		if (this.speechEnabled === null) {
			this.initSpeech('play');
		}
	};

	AblePlayer.prototype.handleRestart = function() {

		if (this.speakingDescription) {
			// cancel audio description
			this.synth.cancel();
		}
		this.seekTo(0);
	};

	AblePlayer.prototype.handlePrevTrack = function() {

		// currently on the first track
		// wrap to bottom and play the last track
		let newIndex = (this.playlistIndex === 0) ? this.$playlist.length - 1 : this.playlistIndex - 1;
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
		this.cuePlaylistItem(newIndex);
	};

	AblePlayer.prototype.handleNextTrack = function() {

		// currently on the last track
		// wrap to top and play the first track
		let newIndex = (this.playlistIndex === this.$playlist.length - 1) ? 0 : this.playlistIndex + 1;
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
		this.cuePlaylistItem(newIndex);
	};

	AblePlayer.prototype.handleRewind = function() {

		var targetTime;

		targetTime = this.elapsed - this.seekInterval;
		if (this.useChapterTimes && (targetTime < this.currentChapter.start)) {
			targetTime = this.currentChapter.start;
		} else if (targetTime < 0) {
			targetTime = 0;
		}
		this.seekTo(targetTime);
	};

	AblePlayer.prototype.handleFastForward = function() {

		var targetTime, lastChapterIndex;

		lastChapterIndex = this.chapters.length-1;
		targetTime = this.elapsed + this.seekInterval;
		if (this.useChapterTimes) {
			if (this.chapters[lastChapterIndex] == this.currentChapter) {
				// this is the last chapter
				if (targetTime > this.duration || targetTime > this.currentChapter.end) {
					// targetTime would exceed the end of the video (or chapter)
					// scrub to end of whichever is earliest
					targetTime = Math.min(this.duration, this.currentChapter.end);
				} else if (this.duration % targetTime < this.seekInterval) {
					// nothing left but pocket change after seeking to targetTime
					// go ahead and seek to end of video (or chapter), whichever is earliest
					targetTime = Math.min(this.duration, this.currentChapter.end);
				}
			} else {
				// this is not the last chapter
				if (targetTime > this.currentChapter.end) {
					// targetTime would exceed the end of the chapter
					// scrub exactly to end of chapter
					targetTime = this.currentChapter.end;
				}
			}
		} else {
			// not using chapter times
			if (targetTime > this.duration) {
				targetTime = this.duration;
			}
		}
		this.seekTo(targetTime);
	};

	AblePlayer.prototype.handleRateIncrease = function() {
		this.changeRate(1);
	};

	AblePlayer.prototype.handleRateDecrease = function() {
		this.changeRate(-1);
	};

	// Increases or decreases playback rate, where dir is 1 or -1 indication direction.
	AblePlayer.prototype.changeRate = function (dir) {

		var rates, currentRate, index, newRate, vimeoMin, vimeoMax;

		if (this.player === 'html5') {
			this.setPlaybackRate(this.getPlaybackRate() + (0.25 * dir));
		} else if (this.player === 'youtube') {
			if (this.youTubePlayerReady) {
				rates = this.youTubePlayer.getAvailablePlaybackRates();
				currentRate = this.getPlaybackRate();
				index = rates.indexOf(currentRate);
				if (index === -1) ; else {
					index += dir;
					// Can only increase or decrease rate if there's another rate available.
					if (index < rates.length && index >= 0) {
						this.setPlaybackRate(rates[index]);
					}
				}
			}
		} else if (this.player === 'vimeo') {
			// range is 0.5 to 2
			// increase/decrease in inrements of 0.5
			vimeoMin = 0.5;
			vimeoMax = 2;
			if (dir === 1) {
				newRate = (this.vimeoPlaybackRate + 0.5 <= vimeoMax) ? this.vimeoPlaybackRate + 0.5 : vimeoMax;
			} else if (dir === -1) {
				newRate = (this.vimeoPlaybackRate - 0.5 >= vimeoMin) ? this.vimeoPlaybackRate - 0.5 : vimeoMin;
			}
			this.setPlaybackRate(newRate);
		}
	};

	AblePlayer.prototype.handleCaptionToggle = function() {

		var thisObj = this;
		var captions, ariaPressed;
		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}

		captions = (this.captions.length) ? this.captions : [];
		if (captions.length === 1) {
			// When there's only one set of captions, just do an on/off toggle.
			if (this.captionsOn === true) {
				// turn them off
				this.captionsOn = false;
				this.prefCaptions = 0;
				ariaPressed = false;
				this.updatePreferences('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.unloadModule('captions');
				} else if (this.usingVimeoCaptions) {
					this.vimeoPlayer.disableTextTrack();
				} else {
					this.$captionsWrapper.hide();
				}
			} else {
				// captions are off. Turn them on.
				this.captionsOn = true;
				this.prefCaptions = 1;
				ariaPressed = true;
				this.updatePreferences('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.loadModule('captions');
				} else if (this.usingVimeoCaptions) {
					this.vimeoPlayer.enableTextTrack(this.captionLang).catch(function(error) {
						switch (error.name) {
													}
					});
				} else {
					this.$captionsWrapper.show();
				}
				for (var i=0; i<captions.length; i++) {
					if (captions[i].def === true) { // this is the default language
						this.selectedCaptions = captions[i];
					}
				}
				this.selectedCaptions = this.captions[0];
				if (this.descriptions.length >= 0) {
					this.selectedDescriptions = this.descriptions[0];
				}
			}
		} else {
			// there is more than one caption track.
			// clicking on a track is handled via caption.js > getCaptionClickFunction()
			if (this.captionsPopup && this.captionsPopup.is(':visible')) {
				this.captionsPopup.hide();
				this.hidingPopup = false;
				this.$ccButton.attr('aria-expanded', 'false');
				this.waitThenFocus(this.$ccButton);
			} else {
				this.closePopups();
				if (this.captionsPopup) {
					this.captionsPopup.show();
					this.$ccButton.attr('aria-expanded','true');

					// Gives time to "register" expanded ccButton
					setTimeout(function() {
						thisObj.captionsPopup.css('top', thisObj.$ccButton.position().top - thisObj.captionsPopup.outerHeight());
						thisObj.captionsPopup.css('left', thisObj.$ccButton.position().left);
						// Place focus on the first button (even if another button is checked)
						thisObj.captionsPopup.find('li').removeClass('able-focus');
						thisObj.captionsPopup.find('li').first().trigger('focus').addClass('able-focus');
					}, 50);
				}
			}
		}
		var ariaLabelOn = ( captions.length > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'showCaptions', 'Show captions' );
		var ariaLabelOff = ( captions.length > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'hideCaptions', 'Hide captions' );

		this.toggleButtonState(
			this.$ccButton,
			this.captionsOn,
			ariaLabelOff,
			ariaLabelOn,
			ariaPressed
		);
	};

	/**
	 * Gives enough time for DOM changes to take effect before adjusting focus.
	 * Helpful for allowing screen reading of elements whose state is intermittently changed.
	 *
	 * @param {*} $el element to focus on
	 * @param {*} timeout optional wait time in milliseconds before focus
	 */
	AblePlayer.prototype.waitThenFocus = function($el, timeout) {

		// Default wait time of 50 ms
		var _timeout = (timeout === undefined || timeout === null) ? 50 : timeout;

		setTimeout(function() {
			$el.trigger('focus');
		}, _timeout);
	};

	AblePlayer.prototype.handleChapters = function () {
		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}
		if (this.chaptersPopup.is(':visible')) {
			this.chaptersPopup.hide();
			this.hidingPopup = false;
			this.$chaptersButton.attr('aria-expanded','false').trigger('focus');
		} else {
			this.closePopups();
			this.chaptersPopup.show();
			this.$chaptersButton.attr('aria-expanded','true');
			this.chaptersPopup.css('top', this.$chaptersButton.position().top - this.chaptersPopup.outerHeight());
			this.chaptersPopup.css('left', this.$chaptersButton.position().left);

			// Highlight the current chapter, if any chapters are checked
			// Otherwise, place focus on the first chapter
			this.chaptersPopup.find('li').removeClass('able-focus');
			if (this.chaptersPopup.find('li[aria-checked="true"]').length) {
				this.chaptersPopup.find('li[aria-checked="true"]').trigger('focus').addClass('able-focus');
			} else {
				this.chaptersPopup.find('li').first().addClass('able-focus').attr('aria-checked','true').trigger('focus');
			}
		}
	};

	AblePlayer.prototype.handleDescriptionToggle = function() {

		this.descOn = !this.descOn;
		this.prefDesc = + this.descOn; // convert boolean to integer
		this.updatePreferences('prefDesc');
		if (typeof this.$descDiv !== 'undefined') {
			if (!this.$descDiv.is(':hidden')) {
				this.$descDiv.hide();
			}
			// NOTE: now showing $descDiv here if previously hidden
			// that's handled elsewhere, dependent on whether there's text to show
		}
		this.initDescription();
		this.refreshControls('descriptions');
	};

	AblePlayer.prototype.handlePrefsClick = function(pref) {

		// NOTE: the prefs menu is positioned near the right edge of the player
		// This assumes the Prefs button is also positioned in that vicinity
		// (last or second-last button the right)

		// NOTE: If previously unable to fully populate the Description dialog
		// because the Web Speech API failed to getVoices()
		// now is a good time to try again
		// so the Description dialog can be rebuilt before the user requests it

		var thisObj, prefsButtonPosition, prefsMenuRight, prefsMenuLeft;

		thisObj = this;

		if (this.speechEnabled === null) {
			this.initSpeech('prefs');
		}
		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}
		if (this.prefsPopup.is(':visible')) {
			this.prefsPopup.hide();
			this.$prefsButton.attr('aria-expanded','false');
			// restore each menu item to original hidden state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			if (!this.showingPrefsDialog) {
				this.$prefsButton.trigger('focus');
			}
			// wait briefly, then reset hidingPopup
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		} else {
			this.closePopups();
			this.prefsPopup.show();
			this.$prefsButton.attr('aria-expanded','true');
			this.$prefsButton.trigger('focus'); // focus first on prefs button to announce expanded state
			// give time for focus on button then adjust popup settings and focus
			setTimeout(function() {
				prefsButtonPosition = thisObj.$prefsButton.position();
				prefsMenuRight = thisObj.$ableDiv.width() - 5;
				prefsMenuLeft = prefsMenuRight - thisObj.prefsPopup.width();
				thisObj.prefsPopup.css('top', prefsButtonPosition.top - thisObj.prefsPopup.outerHeight());
				thisObj.prefsPopup.css('left', prefsMenuLeft);
				// remove prior focus and set focus on first item; also change tabindex from -1 to 0
				thisObj.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','0');
				thisObj.prefsPopup.find('li').first().trigger('focus').addClass('able-focus');
			}, 50);
		}
	};

	AblePlayer.prototype.handleTranscriptToggle = function () {
		var thisObj = this;
		var visible = this.$transcriptDiv.is(':visible');
		if ( visible ) {
			this.$transcriptArea.hide();
			this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
			this.prefTranscript = 0;
			if ( this.transcriptType === 'popup' ) {
				this.$transcriptButton.trigger('focus').addClass('able-focus');
				// wait briefly before resetting stopgap var
				// otherwise the keypress used to select 'Close' will trigger the transcript button
				// Benchmark tests: If this is gonna happen, it typically happens in around 3ms; max 12ms
				// Setting timeout to 100ms is a virtual guarantee of proper functionality
				setTimeout(function() {
					thisObj.closingTranscript = false;
				}, 100);
			}
		} else {
			if ( this.transcriptType === 'popup' ) {
				this.positionDraggableWindow('transcript');
				this.$transcriptArea.show();
				// showing transcriptArea has a cascading effect of showing all content *within* transcriptArea
				// need to re-hide the popup menu
				this.$transcriptPopup.hide();
				this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
				this.prefTranscript = 1;
				// move focus to first focusable element (window options button)
				this.focusNotClick = true;
				this.$transcriptArea.find('button').first().trigger('focus');
				// wait briefly before resetting stopgap var
				setTimeout(function() {
					thisObj.focusNotClick = false;
				}, 100);
			} else {
				this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
				this.$transcriptArea.show();
			}
		}
		this.updatePreferences('prefTranscript');
	};

	AblePlayer.prototype.handleSignToggle = function () {

		var thisObj = this;
		var visible = this.$signWindow.is(':visible');
		if ( visible ) {
			this.$signWindow.hide();
			this.toggleButtonState( this.$signButton, ! visible, this.translate( 'hideSign', 'Hide sign language' ), this.translate( 'showSign', 'Show sign language' ) );
			this.prefSign = 0;
			this.$signButton.trigger('focus').addClass('able-focus');
			// wait briefly before resetting stopgap var
			// otherwise the keypress used to select 'Close' will trigger the transcript button
			setTimeout(function() {
				thisObj.closingSign = false;
			}, 100);
		} else {
			this.positionDraggableWindow('sign');
			this.$signWindow.show();
			// showing signWindow has a cascading effect of showing all content *within* signWindow
			// need to re-hide the popup menu
			this.$signPopup.hide();
			this.toggleButtonState( this.$signButton, ! visible, this.translate( 'hideSign', 'Hide sign language' ), this.translate( 'showSign', 'Show sign language' ) );
			this.prefSign = 1;
			this.focusNotClick = true;
			this.$signWindow.find('button').first().trigger('focus');
			// wait briefly before resetting stopgap var
			// otherwise the keypress used to select 'Close' will trigger the transcript button
			setTimeout(function() {
				thisObj.focusNotClick = false;
			}, 100);
		}
		this.updatePreferences('prefSign');
	};

	AblePlayer.prototype.setFullscreen = function (fullscreen) {

		if (this.fullscreen == fullscreen) {
			return;
		}
		var thisObj = this;
		var $el = this.$ableWrapper;
		var el = $el[0];

		if (this.nativeFullscreenSupported()) {
			// Note: many varying names for options for browser compatibility.
			if (fullscreen) {
				var scroll = {
					x: window.pageXOffset || 0,
					y: window.pageYOffset || 0
				};
				if (this.prefTranscript === 1) {
					// transcript is on. Go ahead and reposition it
					this.rePositionDraggableWindow("transcript");
				}
				if (this.prefSign === 1) {
					// sign is on. Go ahead and reposition it
					this.rePositionDraggableWindow("sign");
				}
				this.scrollPosition = scroll;
				// Initialize fullscreen
				if (el.requestFullscreen) {
					el.requestFullscreen();
				} else if (el.webkitRequestFullscreen) {
					el.webkitRequestFullscreen();
				}
				this.fullscreen = true;
			} else {
				// Exit fullscreen
				this.restoringAfterFullscreen = true;
				if (document.exitFullscreen) {
					document.exitFullscreen();
				} else if (document.webkitExitFullscreen) {
					document.webkitExitFullscreen();
				} else if (document.webkitCancelFullscreen) {
					document.webkitCancelFullscreen();
				}
				if (this.prefTranscript === 1) {
					// transcript is on. Go ahead and reposition it
					this.positionDraggableWindow("transcript");
				}
				if (this.prefSign === 1) {
					// sign is on. Go ahead and reposition it
					this.positionDraggableWindow("sign");
				}
				this.fullscreen = false;
			}
		}
		// add event handlers for changes in fullscreen mode.
		// Browsers natively trigger this event with the Escape key,
		// in addition to clicking the exit fullscreen button
		$(document).on('fullscreenchange webkitfullscreenchange', function(e) {
			// NOTE: e.type = the specific event that fired (in case needing to control for browser-specific idiosyncrasies)
			if (!thisObj.fullscreen) {
				// user has just exited full screen
				thisObj.restoringAfterFullscreen = true;
			} else if (!thisObj.clickedFullscreenButton) {
				// user triggered fullscreenchange without clicking fullscreen button
				thisObj.fullscreen = false;
				thisObj.restoringAfterFullscreen = true;
			}
			thisObj.resizePlayer();
			thisObj.refreshControls('fullscreen');
			// Reset scrollPosition after closing fullscreen.
			if ( thisObj.scrollPosition ) {
				scroll = thisObj.scrollPosition;
				window.scrollTo( scroll.x, scroll.y );
			}
			// NOTE: The fullscreenchange (or browser-equivalent) event is triggered twice
			// when exiting fullscreen via the "Exit fullscreen" button (only once if using Escape)
			// Not sure why, but consequently we need to be sure thisObj.clickedFullscreenButton
			// continues to be true through both events
			// Could use a counter variable to control that (reset to false after the 2nd trigger)
			// However, since I don't know why it's happening, and whether it's 100% reliable
			// resetting clickedFullscreenButton after a timeout seems to be better approach
			setTimeout(function() {
				thisObj.clickedFullscreenButton = false;
				thisObj.restoringAfterFullscreen = false;
			},100);
		});
	};

	AblePlayer.prototype.handleFullscreenToggle = function () {

		var stillPaused = this.paused;
		this.setFullscreen(!this.fullscreen);
		if (stillPaused) {
			this.pauseMedia(); // when toggling fullscreen and media is just paused, keep media paused.
		} else if (!stillPaused) {
			this.playMedia(); // when toggling fullscreen and media is playing, continue playing.
		}
		// automatically hide controller in fullscreen mode
		// then reset back to original setting after exiting fullscreen mode
		if (this.fullscreen) {
			this.hideControls = true;
			if (this.playing) {
				// go ahead and hide the controls
				this.fadeControls('out');
				this.controlsHidden = true;
			}
		} else {
			// exit fullscreen mode
			this.hideControls = this.hideControlsOriginal;
			if (!this.hideControls) { // do not hide controls
				if (this.controlsHidden) {
					this.fadeControls('in');
					this.controlsHidden = false;
				}
				// if there's an active timeout to fade controls out again, clear it
				if (this.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(this.hideControlsTimeout);
					this.hideControlsTimeoutStatus = 'clear';
				}
			}
		}
		// don't resizePlayer yet; that will be called in response to the window resize event
	};

	AblePlayer.prototype.handleTranscriptLockToggle = function (val) {

		this.autoScrollTranscript = val; // val is boolean
		this.prefAutoScrollTranscript = +val; // convert boolean to numeric 1 or 0 for cookie
		this.updatePreferences('prefAutoScrollTranscript');
		this.refreshControls('transcript');
	};

	AblePlayer.prototype.getIcon = function( $button, id) {
		// Remove existing HTML before generating.
		// iconData: [0 = svg viewbox, 1 = svg path]
		// Font and image icon functionality was removed in 5.0.0 in favor of SVG.
		var iconData = this.getIconData( id );

		var existingIcon = $button.find( 'svg#ableplayer-' + id );
		// Avoid repainting icon if there's no change.
		if ( existingIcon.length > 0 ) {
			return;
		}
		$button.find('svg').remove();

		// Outdented for simpler diff
			// Function to create SVG nodes.
			function getNode(n, v) {
				n = document.createElementNS("http://www.w3.org/2000/svg", n);
				for (var p in v) {
					n.setAttributeNS(null, p.replace(/[A-Z]/g, function(m) {
						return "-" + m.toLowerCase();
					}), v[p]);
				}
				return n;
			}
			var icon = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
			icon.setAttribute( 'focusable', 'false' );
			icon.setAttribute( 'aria-hidden', 'true');
			icon.setAttribute( 'viewBox', iconData[0] );
			icon.setAttribute( 'id', 'ableplayer-' + id );
			let path = getNode( 'path', { d: iconData[1] } );
			icon.appendChild( path );

			$button.append( icon );
			// Refresh the DOM.
			$button.html($button.html());
	};

	AblePlayer.prototype.setText = function( $button, text ) {
		$button.attr( 'aria-label', text );
	};

	AblePlayer.prototype.toggleButtonState = function($button, isOn, onLabel, offLabel, ariaPressed = false, ariaExpanded = false) {
		// isOn means "the feature is being turned on".
		let buttonOff = ( $button.hasClass( 'buttonOff' ) ) ? true : false;
		if ( buttonOff && ! isOn || ! buttonOff && isOn ) {
			// Only toggle state if button state does not match feature state.
			return;
		}
		if (! isOn) {
			$button.addClass('buttonOff').attr('aria-label', offLabel);
			if ( ariaPressed ) {
				$button.attr('aria-pressed', 'false');
			}
			if ( ariaExpanded ) {
				$button.attr( 'aria-expanded', 'false' );
			}
		} else {
			$button.removeClass('buttonOff').attr('aria-label', onLabel);
			if ( ariaPressed ) {
				$button.attr('aria-pressed', 'true');
			}
			if ( ariaExpanded ) {
				$button.attr( 'aria-expanded', 'true' );
			}
		}
	};

	AblePlayer.prototype.showTooltip = function($tooltip) {

		$tooltip.show();
	};

	AblePlayer.prototype.showAlert = function( msg, location = 'main' ) {

		// location is either of the following:
		// 'main' (default)
		// 'screenreader (visibly hidden)
		// 'sign' (sign language window)
		// 'transcript' (transcript window)
		var thisObj, $alertBox, $parentWindow;

		thisObj = this;
		$alertBox = thisObj.$alertBox;
		$parentWindow = thisObj.$ableDiv;
		if (location === 'transcript') {
			$parentWindow = thisObj.$transcriptArea;
		} else if (location === 'sign') {
			$parentWindow = thisObj.$signWindow;
		} else if (location === 'screenreader') {
			$alertBox = thisObj.$srAlertBox;
		}
		$alertBox.find('span').text(msg);
		$alertBox.appendTo($parentWindow);
		$alertBox.css( {'display': 'flex'} );

		if (location !== 'screenreader') {
			setTimeout( function () {
				$alertBox.hide();
			}, 30000 );
		}
	};

	AblePlayer.prototype.showedAlert = function (which) {

		// returns true if the target alert has already been shown
		// useful for throttling alerts that only need to be shown once
		// e.g., move alerts with instructions for dragging a window
		if (which === 'transcript') {
			return this.showedTranscriptAlert ?? false;
		} else if (which === 'sign') {
			return this.showedSignAlert ?? false;
		}
		return false;
	};

	// Resizes all relevant player attributes.
	AblePlayer.prototype.resizePlayer = function (width, height) {

		var captionSize, newWidth, newHeight, $iframe;

		if (this.mediaType === 'audio') {
			return;
		}
		if (typeof width !== 'undefined' && typeof height !== 'undefined') {
			// this is being called the first time a player is initialized
			// width and height were collected from the HTML, YouTube, or Vimeo media API
			// so are reflective of the actual size of the media
			// use these values to calculate aspectRatio
			this.aspectRatio = height / width;
			if (this.playerWidth) {
				// default width is already defined via a width or data-width attribute. Use that.
				newWidth = this.playerWidth;
				if (this.playerHeight) {
					newHeight = this.playerHeight;
				} else {
					newHeight = Math.round(newWidth * this.aspectRatio);
					this.playerHeight = newHeight;
				}
			} else {
				// playerWidth was not defined via HTML attributes
				newWidth = (this.player === 'html5') ? $(window).width() : this.$ableWrapper.width();
				newHeight = Math.round(newWidth * this.aspectRatio);
			}
		} else if (this.fullscreen) {
			this.$ableWrapper.addClass('fullscreen');
			newWidth = $(window).width();
			// the 5 pixel buffer is arbitrary, but results in a better fit for all browsers
			newHeight = $(window).height() - this.$playerDiv.outerHeight() - 5;
			this.positionCaptions('overlay');
		} else { // not fullscreen, and not first time initializing player
			this.$ableWrapper.removeClass('fullscreen');
			if (this.player === 'html5') {
				newWidth = (this.playerWidth) ? this.playerWidth : $(window).width();
			} else {
				newWidth = this.$ableWrapper.width();
			}
			newHeight = Math.round(newWidth * this.aspectRatio);
			this.positionCaptions(this.prefCaptionsPosition);
		}
		if (this.debug) ;
		// Now size the player with newWidth and newHeight
		if (this.player === 'youtube' || this.player === 'vimeo') {
			$iframe = this.$ableWrapper.find('iframe');
			if (this.player === 'youtube' && this.youTubePlayer) {
				// alternatively, YouTube API offers a method for setting the video size
				// this adds width and height attributes to the iframe
				// but might have other effects, so best to do it this way
				this.youTubePlayer.setSize(newWidth,newHeight);
			} else {
				// Vimeo API does not have a method for changing size of player
				// Therefore, need to change iframe attributes directly
				$iframe.attr({
					'width': newWidth,
					'height': newHeight
				});
			}
			if (this.playerWidth && this.playerHeight) {
				if (this.fullscreen) {
					// remove constraints
					$iframe.css({
						'max-width': '',
						'max-height': ''
					});
				} else {
					// use CSS on iframe to enforce explicitly defined size constraints
					$iframe.css({
						'max-width': this.playerWidth + 'px',
						'max-height': this.playerHeight + 'px'
					});
				}
			}
		} else if (this.player === 'html5') {
			if (this.fullscreen) {
				this.$media.attr({
					'width': newWidth,
					'height': newHeight
				});
				this.$ableWrapper.css({
					'width': newWidth,
					'height': newHeight
				});
			} else {
					// No constraints. Let CSS handle the positioning.
				this.$media.removeAttr('width height');
				this.$ableWrapper.removeAttr( 'style' );
			}
		}
		// Resize captions
		if (typeof this.$captionsDiv !== 'undefined') {

			// Font-size is too small in full screen view
			// use viewport units (vw) for large viewports
			// % units work fine if not fullscreen
			// prefCaptionSize is expressed as a percentage
			var isSmallScreen = false;
			var windowWidth = window.screen.width;
			if ( windowWidth < 1200 ) {
				isSmallScreen = true;
			}
			captionSize = parseInt(this.prefCaptionsSize,10);
			if (this.fullscreen && ! isSmallScreen ) {
				captionSize = (captionSize / 100) + 'vw';
			} else if ( this.fullscreen && isSmallScreen ) {
				captionSize = '1.2rem';
			} else {
				captionSize = captionSize + '%';
			}
			this.$captionsDiv.css({
				'font-size': captionSize
			});
		}
		this.refreshControls();
	};

	AblePlayer.prototype.retrieveOffscreenWindow = function( which, width, height ) {

		// check to be sure popup windows ('transcript' or 'sign') are positioned on-screen
		// (they sometimes disappear off-screen when entering fullscreen mode)
		// if off-screen, recalculate so they are back on screen

		var window, windowPos, windowTop, windowLeft, windowRight, windowWidth, windowBottom, windowHeight;

		if (which == 'transcript') {
			window = this.$transcriptArea;
		} else if (which == 'sign') {
			window = this.$signWindow;
		}
		windowWidth = window.width();
		windowHeight = window.height();
		windowPos = window.position();
		windowTop = windowPos.top;
		windowLeft = windowPos.left;
		windowRight = windowLeft + windowWidth;
		windowBottom = windowTop + windowHeight;

		if (windowTop < 0) { // off-screen to the top
			windowTop = 10;
			window.css('top',windowTop);
		}
		if (windowLeft < 0) { // off-screen to the left
			windowLeft = 10;
			window.css('left',windowLeft);
		}
		if (windowRight > width) { // off-screen to the right
			windowLeft = (width - 20) - windowWidth;
			window.css('left',windowLeft);
		}
		if (windowBottom > height) { // off-screen to the bottom
			windowTop = (height - 10) - windowHeight;
			window.css('top',windowTop);
		}
	};

	AblePlayer.prototype.updateZIndex = function(which) {

		// update z-index of 'transcript' or 'sign', relative to each other
		// direction is always 'up' (i.e., move window to top)
		// windows come to the top when the user clicks on them
		var defHighZ, defLowZ, transcriptZ, signZ, newHighZ, newLowZ;

		// set the default z-indexes, as defined in ableplayer.css
		defHighZ = 8000; // by default, assigned to the sign window
		defLowZ = 7000; // by default, assigned to the transcript area

		// Previously collected the highest z-index. Removed in 4.6.
		// If something on the page has a higher z-index than the transcript or sign window, do we care?
		// Excluding it here assumes "No". Our immediate concern is with the relationship between our own components.
		// If we elevate our z-indexes so our content is on top, we run the risk of starting a z-index war.

		if (typeof this.$transcriptArea === 'undefined' || typeof this.$signWindow === 'undefined' ) {
			// at least one of the windows doesn't exist, so there's no conflict
			// since z-index may have been stored to a cookie on another page, need to restore default
			if (typeof this.$transcriptArea !== 'undefined') {
				transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
				if (transcriptZ > defLowZ) {
					// restore to the default
					this.$transcriptArea.css('z-index',defLowZ);
				}
			} else if (typeof this.$signWindow !== 'undefined') {
				signZ = parseInt(this.$signWindow.css('z-index'));
				if (signZ > defHighZ) {
					// restore to the default
					this.$signWindow.css('z-index',defHighZ);
				}
			}
			return false;
		}

		// both windows exist

		// get current values
		transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
		signZ = parseInt(this.$signWindow.css('z-index'));

		if (transcriptZ === signZ) {
			// the two windows are equal; restore defaults (the target window will be on top)
			newHighZ = defHighZ;
			newLowZ = defLowZ;
		} else if (transcriptZ > signZ) {
			if (which === 'transcript') {
				// transcript is already on top; nothing to do
				return false;
			} else {
				// swap z's
				newHighZ = transcriptZ;
				newLowZ = signZ;
			}
		} else { // signZ is greater
			if (which === 'sign') {
				// sign is already on top; nothing to do
				return false;
			} else {
				newHighZ = signZ;
				newLowZ = transcriptZ;
			}
		}
		// now assign the new values
		if (which === 'transcript') {
			this.$transcriptArea.css('z-index',newHighZ);
			this.$signWindow.css('z-index',newLowZ);
		} else if (which === 'sign') {
			this.$signWindow.css('z-index',newHighZ);
			this.$transcriptArea.css('z-index',newLowZ);
		}
	};

	AblePlayer.prototype.syncTrackLanguages = function (source, language) {

		// this function is called when the player is built (source == 'init')
		// and again when user changes the language of either 'captions' or 'transcript'
		// It syncs the languages of chapters, descriptions, and metadata tracks
		// NOTE: Caption and transcript languages are somewhat independent from one another
		// If a user changes the caption language, the transcript follows
		// However, if a user changes the transcript language, this only affects the transcript
		// This was a group decision based on the belief that users may want a transcript
		// that is in a different language than the captions

		var i, captions, descriptions, chapters, meta;

		// Captions
		for (i = 0; i < this.captions.length; i++) {
			if (this.captions[i].language === language) {
				captions = this.captions[i];
			}
		}
		// Chapters
		for (i = 0; i < this.chapters.length; i++) {
			if (this.chapters[i].language === language) {
				chapters = this.chapters[i];
			}
		}
		// Descriptions
		for (i = 0; i < this.descriptions.length; i++) {
			if (this.descriptions[i].language === language) {
				descriptions = this.descriptions[i];
			}
		}
		// Metadata
		for (i = 0; i < this.meta.length; i++) {
			if (this.meta[i].language === language) {
				meta = this.meta[i];
			}
		}
		// regardless of source...
		this.transcriptLang = language;
		if (source === 'init' || source === 'captions') {
			this.captionLang = language;
			this.selectedCaptions = captions;
			this.selectedChapters = chapters;
			this.selectedDescriptions = descriptions;
			this.selectedMeta = meta;
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
			this.updateChaptersList();
			// the following was commented out in Oct/Nov 2018.
			// chapters popup is setup automatically when setupPopups() is called later with no param
			// not sure why it was included here.
			// this.setupPopups('chapters');
		} else if (source === 'transcript') {
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
		}
		if (this.selectedDescriptions) {
			// updating description voice to match new description language
			this.setDescriptionVoice();
			if (this.$sampleDescDiv) {
				if (this.sampleText) {
					for (i = 0; i < this.sampleText.length; i++) {
						if (this.sampleText[i].lang === this.selectedDescriptions.language) {
							this.currentSampleText = this.sampleText[i]['text'];
							this.$sampleDescDiv.html(this.currentSampleText);
						}
					}
				}
			}
		}
		this.updateTranscript();
	};

}

function addDescriptionFunctions(AblePlayer) {
	AblePlayer.prototype.initDescription = function() {

		// set default mode for delivering description (open vs closed)
		// based on availability and user preference

		// called when player is being built, or when a user
		// toggles the Description button or changes a description-related preference

		// The following variables are applicable to delivery of description:
		// defaultStateDescriptions == 'on' or 'off', defined by website owner (overridden by prefDesc)
		// prefDesc == 1 if user wants description (i.e., Description button is on); else 0
		// prefDescPause == 1 to pause video when description starts; else 0
		// prefDescVisible == 1 to visibly show text-based description area; else 0
		// prefDescMethod == either 'video' or 'text' (as of v4.0.10, prefDescMethod is always 'video')
		// descMethod is the format actually used ('video' or 'text'), regardless of user preference
		// hasOpenDesc == true if a described version of video is available via data-desc-src attribute
		// hasClosedDesc == true if a description text track is available
		// descOn == true if description of either type is on
		// readDescriptionsAloud == true if text description is to be announced audibly; otherwise false
		// descReader == either 'browser' or 'screenreader'

		var deferred, promise;

		deferred = new this.defer();
		promise = deferred.promise();

		if (this.mediaType === 'audio') {
			deferred.resolve();
		}

		// check to see if there's an open-described version of this video
		// checks only the first source since if a described version is provided,
		// it must be provided for all sources
		this.descFile = this.$sources.first().attr('data-desc-src');
		if (typeof this.descFile !== 'undefined') {
			this.hasOpenDesc = true;
		} else {
			// there's no open-described version via data-desc-src,
			// but what about data-youtube-desc-src or data-vimeo-desc-src?
			// if these exist, they would have been defined earlier
			this.hasOpenDesc = (this.youTubeDescId || this.vimeoDescId) ? true : false;
		}

		// Set this.descMethod based on media availability & user preferences
		// no description is available for this video
		this.descMethod = null;
		if (this.hasOpenDesc && this.hasClosedDesc) {
			// both formats are available. User gets their preference.
			this.descMethod = (this.prefDescMethod) ? this.prefDescMethod : 'video';
		} else if (this.hasOpenDesc) {
			this.descMethod = 'video';
		} else if (this.hasClosedDesc) {
			this.descMethod = 'text';
		}

		// Set the default state of descriptions
		this.descOn = false;
		if (this.descMethod) {
			if (this.prefDesc === 1) {
				this.descOn = true;
			} else if (this.prefDesc === 0) {
				this.descOn = false;
			} else {
				// user has no prefs. Use default state.
				this.descOn = (this.defaultStateDescriptions === 1) ? true : false;
			}
		}

		// If a video has text audio descriptions, inject the description area.
		if (typeof this.$descDiv === 'undefined' && this.hasClosedDesc ) {
			this.injectTextDescriptionArea();
		}

		if (this.descOn) {
			if (this.descMethod === 'video' && !this.usingDescribedVersion() ) {
				// switched from non-described to described version
				this.swapDescription();
			}
			if (this.hasClosedDesc) {
				if (this.prefDescVisible) {
					// make description text visible
					if (typeof this.$descDiv !== 'undefined') {
						this.$descDiv.show();
						this.$descDiv.removeClass('able-offscreen');
					}
				} else {
					// keep it visible to screen readers, but hide it visibly
					if (typeof this.$descDiv !== 'undefined') {
						this.$descDiv.addClass('able-offscreen');
					}
				}
			}
		} else { // description is off.
			if (this.descMethod === 'video') { // user has turned off described version of video
				if (this.usingDescribedVersion()) {
					// user was using the described verion. Swap for non-described version
					this.swapDescription();
				}
			} else if (this.descMethod === 'text') { // user has turned off text description
				// hide description div from everyone, including screen reader users
				if (typeof this.$descDiv !== 'undefined') {
					this.$descDiv.hide();
					this.$descDiv.removeClass('able-offscreen');
				}
			}
		}
		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.usingDescribedVersion = function () {

		// Returns true if currently using audio description, false otherwise.

		if (this.player === 'youtube') {
			return (this.activeYouTubeId === this.youTubeDescId);
		} else if (this.player === 'vimeo') {
			return (this.activeVimeoId === this.vimeoDescId);
		} else {
			return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
		}
	};

/**
   * Initializes speech synthesis capabilities for the player.
   * This method addresses browser and OS limitations that require user interaction
   * before speech synthesis functions become available. It handles different contexts
   * like initialization, playing media, accessing preferences, or announcing descriptions.
   * @param {string} context - The context in which the function is called ('init', 'play', 'prefs', 'desc').
   */
	AblePlayer.prototype.initSpeech = function (context) {
		var thisObj = this;

		// Function to attempt enabling speech synthesis
		function attemptEnableSpeech() {
			var greeting = new SpeechSynthesisUtterance("\x20");
			greeting.onend = function () {
				thisObj.getBrowserVoices();
				if (
					(Array.isArray(thisObj.descVoices) && thisObj.descVoices.length) ||
					context !== "init"
				) {
					thisObj.speechEnabled = true;
				}
			};
			thisObj.synth.speak(greeting);
		}

		// Function to handle the initial click and enable speech synthesis
		function handleInitialClick() {
			attemptEnableSpeech();
			// Once the utterance starts, remove this specific click event listener
			// Ensures the event handler only runs once and cleans up after itself
			$(document).off("click", handleInitialClick);
		}

		if (this.speechEnabled === null) {
			if (window.speechSynthesis) {
				// Browser supports speech synthesis
				this.synth = window.speechSynthesis;
				this.synth.cancel(); // Cancel any ongoing speech synthesis

				if (context === "init") {
					// Attempt to enable speech synthesis directly for browsers that don't require a click
					attemptEnableSpeech();
					// For initial setup, require a user click to enable speech synthesis
					// Scoping to a particular handler to avoid conflicts with other click events
					$(document).on("click", handleInitialClick);
				} else {
					// For other contexts, attempt to enable speech synthesis directly
					attemptEnableSpeech();
				}
			} else {
				// Browser does not support speech synthesis
				this.speechEnabled = false;
			}
		}
	};

	AblePlayer.prototype.getBrowserVoices = function () {

		// define this.descVoices array
		// includes only languages that match the language of the captions or player

		var voices, trackLangs, voiceLang, preferredLang;

		preferredLang = (this.captionLang) ? this.captionLang.substring(0,2).toLowerCase() : this.lang.substring(0,2).toLowerCase();

		this.descVoices = [];
		voices = this.synth.getVoices();
		trackLangs = this.getTrackLangs();
		if (voices.length > 0) {
			this.descVoices = [];
			// available languages are identified with local suffixes (e.g., en-US)
			for (var i=0; i<voices.length; i++) {
				// match only the first 2 characters of the lang code
				voiceLang = voices[i].lang.substring(0,2).toLowerCase();
				if (voiceLang === preferredLang && (trackLangs.indexOf(voiceLang) !== -1)) {
					// this voice matches preferredLang
					// AND there's a matching description track in this language
					// Add this voice to final array
					this.descVoices.push(voices[i]);
				}
			}
			if (!this.descVoices.length) {
				// no voices available in the default language(s)
				// just use all voices, regardless of language
				this.descVoices = voices;
			}
		}
		return false;
	};

	AblePlayer.prototype.getTrackLangs = function () {

		// returns an array of languages (from srclang atttributes)
		// in which there are description tracks
		// use only first two characters of the lang code
		var descLangs = [];
		if (this.tracks) {
			for (var i=0; i < this.tracks.length; i++) {
				if (this.tracks[i].kind === 'descriptions' || this.tracks[i].kind === 'captions' ) {
					descLangs.push(this.tracks[i].language.substring(0,2).toLowerCase());
				}
			}
		}
		return descLangs;
	};

	AblePlayer.prototype.setDescriptionVoice = function () {

		// set description voice on player init, or when user changes caption language
		// Voice is determined in the following order of precedence:
		// 1. User's preferred voice for this language, saved in preferences
		// 2. The first available voice in the array of available voices for this browser in this language

		var preferences, voices, prefDescVoice, descVoice, descLang, prefVoiceFound;
		preferences = this.getPref();
		prefDescVoice = (typeof preferences.voices !== 'undefined') ? this.getPrefVoice() : null;

		this.getBrowserVoices();
		this.rebuildVoicePrefsForm( '_prefDescVoice' );
		this.rebuildVoicePrefsForm( '_prefCaptionsVoice' );

		if (this.selectedDescriptions) {
			descLang = this.selectedDescriptions.language;
		} else if (this.captionLang) {
			descLang = this.captionLang;
		} else {
			descLang = this.lang;
		}

		if (this.synth) {
			voices = this.synth.getVoices();
			if (voices.length > 0) {
				if (prefDescVoice) {
					// select the language that matches prefDescVoice, if it's available
					prefVoiceFound = false;
					for (var i=0; i<voices.length; i++) {
						// first, be sure voice is the correct language
						if (voices[i].lang.substring(0,2).toLowerCase() === descLang.substring(0,2).toLowerCase()) {
							if (voices[i].name === prefDescVoice) {
								descVoice = voices[i].name;
								prefVoiceFound = true;
								break;
							}
						}
					}
				}
				if (!prefVoiceFound) {
					// select the first language that matches the first 2 characters of the lang code
					for (i=0; i<voices.length; i++) {
						if (voices[i].lang.substring(0,2).toLowerCase() === descLang.substring(0,2).toLowerCase()) {
							descVoice = voices[i].name;
							break;
						}
					}
				}
				// make this the user's current preferred voice
				this.prefDescVoice = descVoice;
				this.prefDescVoiceLang = descLang;
				// select this voice in the Description Prefs dialog
				if (this.$voiceSelectField) {
					this.$voiceSelectField.val(this.prefDescVoice);
				}
				this.updatePreferences('voice');
			}
		}
	};

	AblePlayer.prototype.swapDescription = function() {

		// swap described and non-described source media, depending on which is playing
		// this function is only called in two circumstances:
		// 1. Swapping to described version when initializing player (based on user prefs & availability)
		// (playerCreated == false)
		// 2. User is toggling description
		// (playerCreated == true)

		var thisObj, i, origSrc, descSrc;

		thisObj = this;

		// We are no longer loading the previous media source
		// Only now, as a new source is requested, is it safe to reset this var
		// It will be reset to true when media.load() is called
		this.loadingMedia = false;

		// get element that has focus at the time swap is initiated
		// after player is rebuilt, focus will return to that same element
		// (if it exists)
		this.$focusedElement = $(':focus');
		this.activeMedia = this.mediaId;

		// get current time of current source, and attempt to start new video at the same time
		// whether this is possible will be determined after the new media source has loaded
		// see onMediaNewSourceLoad()
		if (this.elapsed > 0) {
			this.swapTime = this.elapsed;
		} else {
			this.swapTime = 0;
		}
		if (this.duration > 0) {
			this.prevDuration = this.duration;
		}

		// Capture current playback state, so media can resume after source is swapped
		if (!this.okToPlay) {
			this.okToPlay = this.playing;
		}

		if (this.descOn) {
			this.showAlert( this.translate( 'alertDescribedVersion', 'Using the audio described version of this video' ) );
		} else {
			this.showAlert( this.translate( 'alertNonDescribedVersion', 'Using the non-described version of this video' ) );
		}

		if (this.player === 'html5') {

			this.swappingSrc = true;
			this.paused = true;

			if (this.usingDescribedVersion()) {
				// the described version is currently playing. Swap to non-described
				for (i=0; i < this.$sources.length; i++) {
					// for all <source> elements, replace src with data-orig-src
					origSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-orig-src') );
					if (origSrc) {
						this.$sources[i].setAttribute('src',origSrc);
					}
				}
			} else {
				// the non-described version is currently playing. Swap to described.
				for (i=0; i < this.$sources.length; i++) {
					// for all <source> elements, replace src with data-desc-src (if one exists)
					// then store original source in a new data-orig-src attribute
					origSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('src') );
					descSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-desc-src') );
					if (descSrc) {
						this.$sources[i].setAttribute('src',descSrc);
						this.$sources[i].setAttribute('data-orig-src',origSrc);
					}
				}
			}

			if (this.recreatingPlayer) {
				// stopgap to prevent multiple firings of recreatePlayer()
				return;
			}
			if (this.playerCreated) {
				// delete old player, then recreate it with new source & tracks
				this.deletePlayer('swap-desc-html');
				this.recreatePlayer().then(function() {
					if (!thisObj.loadingMedia) {
						thisObj.media.load();
						thisObj.loadingMedia = true;
					}
				});
			}
		} else if (this.player === 'youtube') {

			// if the described version is currently playing, swap to non-described
			this.activeYouTubeId = (this.usingDescribedVersion()) ? this.youTubeId : this.youTubeDescId;

			if (typeof this.youTubePlayer !== 'undefined') {
				thisObj.swappingSrc = true;
				if (thisObj.playing) {
					// loadVideoById() loads and immediately plays the new video at swapTime
					thisObj.youTubePlayer.loadVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				} else {
					// cueVideoById() loads the new video and seeks to swapTime, but does not play
					thisObj.youTubePlayer.cueVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				}
			}
			if (this.playerCreated) {
				this.deletePlayer('swap-desc-youtube');
			}
			// player needs to be recreated with new source
			if (this.recreatingPlayer) {
				// stopgap to prevent multiple firings of recreatePlayer()
				return;
			}
			this.recreatePlayer().then(function() {
				// nothing to do here
				// next steps occur when youtube onReady event fires
				// see youtube.js > finalizeYoutubeInit()
			});
		} else if (this.player === 'vimeo') {
			if (this.usingDescribedVersion()) {
				// the described version is currently playing. Swap to non-described
				this.activeVimeoId = this.vimeoId;
				this.showAlert( this.translate( 'alertNonDescribedVersion', 'Using the non-described version of this video' ) );
			} else {
				// the non-described version is currently playing. Swap to described.
				this.activeVimeoId = this.vimeoDescId;
				this.showAlert( this.translate( 'alertDescribedVersion', 'Using the audio described version of this video' ) );
			}
			if (this.playerCreated) {
				this.deletePlayer('swap-desc-vimeo');
			}
			// player needs to be recreated with new source
			if (this.recreatingPlayer) {
				// stopgap to prevent multiple firings of recreatePlayer()
				return;
			}
			this.recreatePlayer().then(function() {
				// load the new video source
				thisObj.vimeoPlayer.loadVideo(thisObj.activeVimeoId).then(function() {
					if (thisObj.playing) {
						// video was playing when user requested an alternative version
						// seek to swapTime and continue playback (playback happens automatically)
						thisObj.vimeoPlayer.setCurrentTime(thisObj.swapTime);
					} else {
						// Vimeo autostarts immediately after video loads
						// The "Described" button should not trigger playback, so stop this before the user notices.
						thisObj.vimeoPlayer.pause();
					}
				});
			});
		}
	};

	AblePlayer.prototype.showDescription = function(now) {
		if (!this.playing || !this.hasClosedDesc || this.swappingSrc || !this.descOn || ( this.descMethod === 'video' && !this.prefDescVisible ) ) {
			return;
		}

		var cues, d, thisDescription, descText;

		var flattenComponentForDescription = function (component) {
			var result = [];
			if (component.type === 'string') {
				result.push(component.value);
			} else {
				for (var i = 0; i < component.children.length; i++) {
					result.push(flattenComponentForDescription(component.children[i]));
				}
			}
			return result.join('');
		};
		cues = [];
		if (this.selectedDescriptions) {
			cues = this.selectedDescriptions.cues;
		} else if (this.descriptions.length >= 1) {
			cues = this.descriptions[0].cues;
		}
		for (d = 0; d < cues.length; d++) {
			if ((cues[d].start <= now) && (cues[d].end > now)) {
				thisDescription = d;
				break;
			}
		}
		if (typeof thisDescription !== 'undefined') {
			if (this.currentDescription !== thisDescription) {
				// temporarily remove aria-live from $status to prevent description from being interrupted
				this.$status.removeAttr('aria-live');
				descText = flattenComponentForDescription(cues[thisDescription].components);
				if (this.descReader === 'screenreader') {
					// load the new description into the container div for screen readers to read
					this.$descDiv.html(descText);
				} else if (this.speechEnabled) {
					if ( 'video' !== this.descMethod ) {
						// use browser's built-in speech synthesis
						this.announceText('description',descText);
					}
					if (this.prefDescVisible) {
						// write description to the screen for sighted users
						// but remove ARIA attributes since it isn't intended to be read by screen readers
						this.$descDiv.html(descText).removeAttr('aria-live aria-atomic');
					}
				} else {
					// browser does not support speech synthesis
					// load the new description into the container div for screen readers to read
					this.$descDiv.html(descText);
				}
				// Only pause video if not using a described video.
				if (this.prefDescPause && this.descMethod === 'text') {
					this.pauseMedia();
					this.pausedForDescription = true;
				}
				this.currentDescription = thisDescription;
			}
		} else {
			this.$descDiv.html('');
			this.currentDescription = -1;
			// restore aria-live to $status
			this.$status.attr('aria-live','polite');
		}
	};

	AblePlayer.prototype.syncSpeechToPlaybackRate = function(rate) {

		// called when user changed playback rate
		// adjust rate of audio description to match
		var speechRate;

		if (rate === 0.5) {
			speechRate = 0.7; // option 1 in prefs menu
		} else if (rate === 0.75) {
			speechRate =  0.8; // option 2 in prefs menu
		} else if (rate === 1.0) {
			speechRate =  1; // option 4 in prefs menu (normal speech, default)
		} else if (rate === 1.25) {
			speechRate =  1.1; // option 5 in prefs menu
		} else if (rate === 1.5) {
			speechRate =  1.2; // option 6 in prefs menu
		} else if (rate === 1.75) {
			speechRate =  1.5; // option 7 in prefs menu
		} else if (rate === 2.0) {
			speechRate =  2; // option 8 in prefs menu (fast)
		} else if (rate === 2.25) {
			speechRate =  2.5; // option 9 in prefs menu (very fast)
		} else if (rate >= 2.5) {
			speechRate =  3; // option 10 in prefs menu (super fast)
		}
		this.prefDescRate = speechRate;
	};

	AblePlayer.prototype.announceText = function(context, text, rate) {

		// this function announces text using speech synthesis
		// it's only called if already determined that browser supports speech synthesis
		// context is either:
		// 'description' - actual description text extracted from WebVTT file
		// 'sample' - called when user changes a setting in Description Prefs dialog
		// 'caption' - called when announcing a caption.

		var thisObj, voiceName, i, voice, pitch, volume, utterance,
			timeElapsed;

		thisObj = this;

		if (!this.speechEnabled) {
			// voices array failed to load the first time. Try again
			this.initSpeech('desc');
		}

		if (context === 'sample') {
			// get settings from form
			voiceName = $('#' + this.mediaId + '_prefDescVoice').val();
			pitch = $('#' + this.mediaId + '_prefDescPitch').val();
			rate = $('#' + this.mediaId + '_prefDescRate').val();
			volume = $('#' + this.mediaId + '_prefDescVolume').val();
		} else if ( context === 'captionSample' ) {
			// get settings from form
			voiceName = $('#' + this.mediaId + '_prefCaptionsVoice').val();
			pitch = $('#' + this.mediaId + '_prefCaptionsPitch').val();
			rate = $('#' + this.mediaId + '_prefCaptionsRate').val();
			volume = $('#' + this.mediaId + '_prefCaptionsVolume').val();
		} else if ( context === 'description' ) {
			// get settings from global prefs
			voiceName = this.prefDescVoice;
			pitch = this.prefDescPitch;
			rate = this.prefDescRate;
			volume = this.prefDescVolume;
		} else {
			// get settings from global prefs
			voiceName = this.prefCaptionsVoice;
			pitch = this.prefCaptionsPitch;
			rate = ( rate < this.prefCaptionsRate ) ? this.prefCaptionsRate : rate;
			volume = this.prefCaptionsVolume;
		}

		// get the voice associated with the user's chosen voice name
		if (this.descVoices) {
			if (this.descVoices.length > 0) {
				if (voiceName) {
					// get the voice that matches user's preferred voiceName
					for (i = 0; i < this.descVoices.length; i++) {
						if (this.descVoices[i].name == voiceName) {
							voice = this.descVoices[i];
							break;
						}
					}
				}
				if (typeof voice === 'undefined') {
					// no matching voice was found
					// use the first voice in the array
					voice = this.descVoices[0];
				}
			}
		} else {
			voice = null;
		}
		utterance = new SpeechSynthesisUtterance();
		if (voice) {
			utterance.voice = voice;
		}
		utterance.voiceURI = 'native';
		utterance.volume = volume;
		utterance.rate = rate;
		utterance.pitch = pitch;
		utterance.text = text;
		// TODO: Consider the best language for the utterance:
		// language of the web page? (this.lang)
		// language of the WebVTT description track?
		// language of the user's chosen voice?
		// If there's a mismatch between any of these, the description will likely be unintelligible
		utterance.lang = this.lang;
		utterance.onstart = function(e) {
			// utterance has started
		};
		utterance.onpause = function(e) {
			// utterance has paused
		};
		utterance.onend = function(e) {
			// utterance has ended
			if ( 'description' === context ) {
				this.speakingDescription = false;
			} else if ( 'caption' === context ) {
				this.speakingCaption = false;
			}
			timeElapsed = e.elapsedTime;
			// As of Firefox 95, e.elapsedTime is expressed in seconds
			// Other browsers (tested in Chrome & Edge) express this in milliseconds
			// Assume no utterance will require over 100 seconds to express...
			// If a large value, time is likely expressed in milliseconds.
			(timeElapsed > 100) ? (e.elapsedTime/1000).toFixed(2) : (e.elapsedTime).toFixed(2);

			if (this.debug) ;
			if (context === 'description') {
				if (thisObj.prefDescPause) {
					if (thisObj.pausedForDescription) {
						thisObj.playMedia();
						this.pausedForDescription = false;
					}
				}
			}
		};
		utterance.onerror = function(e) {
			// handle error
		};
		if (this.synth.paused) {
			this.synth.resume();
		}
		this.synth.speak(utterance);
		if ( 'description' === context ) {
			this.speakingDescription = true;
		} else if ( 'caption' === context ) {
			this.speakingCaption = true;
		}
	};

}

// Outdented for a simpler diff
	var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

	// Based on the incredible accessible modal dialog.
	function AccessibleDialog( modalDiv, $returnElement, title, closeButtonLabel) {

		this.title = title;
		this.closeButtonLabel = closeButtonLabel;
		this.focusedElementBeforeModal = $returnElement;
		this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
		var thisObj = this;
		var modal = modalDiv;
		this.modal = modal;

		modal.addClass('able-modal-dialog');

		var closeButton = $('<button>',{
				'class': 'modalCloseButton',
				'title': thisObj.closeButtonLabel,
				'aria-label': thisObj.closeButtonLabel
		}).text('×');
		closeButton.on( 'keydown', function (e) {
			if (e.key === ' ') {
				thisObj.hide();
			}
		}).on( 'click', function () {
			thisObj.hide();
		});

		var titleH1 = $('<h1></h1>');
		titleH1.attr('id', 'modalTitle-' + this.baseId);
		titleH1.text(title);
		this.titleH1 = titleH1;

		modal.attr({
			'aria-labelledby': 'modalTitle-' + this.baseId,
		});
		var modalHeader = $( '<div>', {
			'class': 'able-modal-header'
		});
		modalHeader.prepend(titleH1);
		modalHeader.prepend(closeButton);
		modal.prepend(modalHeader);

		modal.attr({
			'aria-hidden': 'true',
			'role': 'dialog',
			'aria-modal': 'true'
		});

		modal.on( 'keydown', function (e) {
			if (e.key === 'Escape') {
				thisObj.hide();
				e.preventDefault();
			} else if (e.key === 'Tab') {
				// Manually loop tab navigation inside the modal.
				var parts = modal.find('*');
				var focusable = parts.filter(focusableElementsSelector).filter(':visible');

				if (focusable.length === 0) {
					return;
				}

				var focused = $(':focus');
				var currentIndex = focusable.index(focused);
				if (e.shiftKey) {
					// If backwards from first element, go to last.
					if (currentIndex === 0) {
						focusable.get(focusable.length - 1).trigger('focus');
						e.preventDefault();
					}
				} else {
					if (currentIndex === focusable.length - 1) {
						focusable.get(0).trigger('focus');
						e.preventDefault();
					}
				}
			}
			e.stopPropagation();
		});

		if ( $( 'body' ).hasClass( 'able-modal-active' ) ) {
			$( 'body > *') .not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('inert');
			$( 'body' ).removeClass( 'able-modal-active' );
		}
	}
	AccessibleDialog.prototype.show = function () {
		if (!this.overlay) {
			// Generate overlay.
			var overlay = $('<div></div>').attr({
				 'class': 'able-modal-overlay',
				 'tabindex': '-1'
			});
			this.overlay = overlay;
			$('body').append(overlay);

			// Keep from moving focus out of dialog when clicking outside of it.
			overlay.on('mousedown.accessibleModal', function (e) {
				e.preventDefault();
				thisObj.hide();
			});
		}

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('inert', true);
		$( 'body' ).addClass( 'able-modal-active' );

		this.overlay.css('display', 'block');
		this.modal.css('display', 'block');
		this.modal.attr({
			'aria-hidden': 'false',
			'tabindex': '-1'
		});

		var focusable = this.modal.find("*").filter(focusableElementsSelector).filter(':visible');
		if (focusable.length === 0) {
			this.focusedElementBeforeModal.blur();
		}
		var thisObj = this;
		setTimeout(function () {
			// set focus on the first focusable element
			thisObj.modal.find('button.modalCloseButton').first().trigger('focus');
		}, 300);
	};

	AccessibleDialog.prototype.hide = function () {
		if (this.overlay) {
			this.overlay.css('display', 'none');
		}
		this.modal.css('display', 'none');
		this.modal.attr('aria-hidden', 'true');
		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('inert');
		$( 'body' ).removeClass( 'able-modal-active' );

		this.focusedElementBeforeModal.trigger('focus');
	};

	AccessibleDialog.prototype.getInputs = function () {

		// return an array of input elements within this dialog
		if (this.modal) {
			var inputs = this.modal.find('input');
			return inputs;
		}
		return false;
	};

function addDragdropFunctions(AblePlayer) {
	AblePlayer.prototype.initDragDrop = function ( which ) {

		// supported values of which: 'sign', 'transcript'

		// NOTE: "Drag and Drop" for Able Player is a metaphor only!!!
		// HTML5 Drag & Drop API enables moving elements to new locations in the DOM
		// Thats not our purpose; we're simply changing the visible position on-screen
		// Therefore, the drag & drop interface was overhauled in v2.3.41 to simply
		// use mouse (and keyboard) events to change CSS positioning properties

		// There are nevertheless lessons to be learned from Drag & Drop about accessibility:
		// http://dev.opera.com/articles/accessible-drag-and-drop/

		var thisObj, $window, $toolbar, windowName, $dragHandle, $resizeHandle, $resizeSvg,
			i, x1, y1, x2, y2, $resizeLine, resizeZIndex;

		thisObj = this;

		if (which === 'transcript') {
			$window = this.$transcriptArea;
			windowName = 'transcript-window';
			$toolbar = this.$transcriptToolbar;
			$toolbar.attr( 'aria-label', this.translate( 'transcriptControls', 'Transcript Window Controls' ) );
		} else if (which === 'sign') {
			$window = this.$signWindow;
			windowName = 'sign-window';
			$toolbar = this.$signToolbar;
			$toolbar.attr( 'aria-label', this.translate( 'signControls', 'Sign Language Window Controls' ) );
		}

		// add class to trigger change in cursor on hover
		$toolbar.addClass('able-draggable');
		$toolbar.attr( 'role', 'application' );

		$dragHandle = $('<div>',{
			'class': 'able-drag-handle'
		});

		$dragHandle.html('<svg version="1.1" viewBox="262.48 487.5 675.03 225" xmlns="http://www.w3.org/2000/svg"><path d="m900 562.5h-600c-13.398 0-25.777-7.1484-32.477-18.75-6.6992-11.602-6.6992-25.898 0-37.5 6.6992-11.602 19.078-18.75 32.477-18.75h600c13.398 0 25.777 7.1484 32.477 18.75 6.6992 11.602 6.6992 25.898 0 37.5-6.6992 11.602-19.078 18.75-32.477 18.75z" fill="#fff"></path>  <path d="m900 712.5h-600c-13.398 0-25.777-7.1484-32.477-18.75-6.6992-11.602-6.6992-25.898 0-37.5 6.6992-11.602 19.078-18.75 32.477-18.75h600c13.398 0 25.777 7.1484 32.477 18.75 6.6992 11.602 6.6992 25.898 0 37.5-6.6992 11.602-19.078 18.75-32.477 18.75z" fill="#fff"></path></svg>');
		// add resize handle selector to bottom right corner
		$resizeHandle = $('<div>',{
			'class': 'able-resizable'
		});

		// fill it with three parallel diagonal lines
		$resizeSvg = $('<svg>').attr({
			'width': '100%',
			'height': '100%',
			'viewBox': '0 0 100 100',
			'preserveAspectRatio': 'none'
		});
		for (i=1; i<=3; i++) {
			if (i === 1) {
				x1 = '100';
				y1 = '0';
				x2 = '0';
				y2 = '100';
			} else if (i === 2) {
				x1 = '33';
				y1 = '100';
				x2 = '100';
				y2 = '33';
			} else if (i === 3) {
				x1 = '67';
				y1 = '100';
				x2 = '100';
				y2 = '67';
			}
			$resizeLine = $('<line>').attr({
				'x1': x1,
				'y1': y1,
				'x2': x2,
				'y2': y2,
				'vector-effect': 'non-scaling-stroke'
			});
			$resizeSvg.append($resizeLine);
		}
		$resizeHandle.html($resizeSvg);

		// assign z-index that's slightly higher than parent window
		resizeZIndex = parseInt($window.css('z-index')) + 100;
		$resizeHandle.css('z-index',resizeZIndex);
		$window.append($resizeHandle);
		$toolbar.append($dragHandle);

		// Final step: Need to refresh the DOM in order for browser to process & display the SVG
		$resizeHandle.html($resizeHandle.html());

		// add event listener to toolbar to start and end drag
		// other event listeners will be added when drag starts
		$dragHandle.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart' ) {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.dragDevice = 'mouse'; // ok to use this even if device is a touchpad
					thisObj.startDrag(which, $window);
				}
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.dragging && thisObj.dragDevice === 'mouse') {
					thisObj.endDrag(which);
				}
			}
			return false;
		});

		// add event listeners for resizing
		$resizeHandle.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart') {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.startResize(which, $window);
				}
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.resizing) {
					thisObj.endResize(which);
				}
			}
			return false;
		});

		// whenever a window is clicked, bring it to the foreground
		$window.on('click', function() {

			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
				thisObj.updateZIndex(which);
			}
			thisObj.finishingDrag = false;
		});
		this.addWindowMenu(which,$window,windowName);
	};

	AblePlayer.prototype.addWindowMenu = function(which, $window, windowName) {

		var thisObj, menuId, $newButton, tooltipId, $tooltip, $popup;

		thisObj = this;

		// Add a Boolean that will be set to true temporarily if window button or a menu item is clicked
		// This will prevent the click event from also triggering a mousedown event on the toolbar
		// (which would unexpectedly send the window into drag mode)
		this.windowMenuClickRegistered = false;

		// Add another Boolean that will be set to true temporarily when mouseup fires at the end of a drag
		// this will prevent the click event from being triggered
		this.finishingDrag = false;

		// add button to draggable window which triggers a popup menu
		menuId = this.mediaId + '-' + windowName + '-menu';
		$newButton = $('<button>',{
			'type': 'button',
			'tabindex': '0',
			'aria-haspopup': 'true',
			'aria-controls': menuId,
			'aria-expanded': 'false',
			'class': 'able-button-handler-preferences'
		});
		this.getIcon( $newButton, 'preferences' );
		this.setText( $newButton, this.translate( 'windowButtonLabel', 'Window options' ) );

		// add a tooltip that displays aria-label on mouseenter or focus
		tooltipId = this.mediaId + '-' + windowName + '-tooltip';
		$tooltip = $('<div>',{
			'class' : 'able-tooltip',
			'id' : tooltipId
		}).hide();

		$newButton.on('mouseenter focus',function(e) {
			var label = $(this).attr('aria-label');
			var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label);
			// get height of the tooltip
			var tooltipHeight = tooltip.height();
			var tooltipY = ( tooltipHeight + 2 ) * -1;
			var tooltipX = 0;
			var tooltipStyle = {
				right: '',
				left: tooltipX + 'px',
				top: tooltipY + 'px'
			};
			tooltip.css(tooltipStyle);
			thisObj.showTooltip(tooltip);
			$(this).on('mouseleave blur',function() {
				AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
			});
		});

		// setup popup menu
		$popup = this.setupPopups(windowName); // 'transcript-window' or 'sign-window'
		// define vars and assemble all the parts
		if (which === 'transcript') {
			this.$transcriptPopupButton = $newButton;
			this.$transcriptPopup = $popup;
			this.$transcriptToolbar.prepend($newButton,$tooltip,$popup);
		} else if (which === 'sign') {
			this.$signPopupButton = $newButton;
			this.$signPopup = $popup;
			this.$signToolbar.append($newButton,$tooltip,$popup);
		}

		// handle button click
		$newButton.on('click keydown',function(e) {

			if (thisObj.focusNotClick) {
				return false;
			}
			if (thisObj.dragging) {
				thisObj.dragKeys(which, e);
				return false;
			}
			e.stopPropagation();
			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
				// don't set windowMenuClickRegistered yet; that happens in handler function
				thisObj.handleWindowButtonClick(which, e);
			}
			thisObj.finishingDrag = false;
		});

		this.addResizeDialog(which, $window);
	};

	AblePlayer.prototype.addResizeDialog = function (which) {

		var thisObj, $windowPopup, $windowButton, widthId, heightId,
			$resizeForm, $resizeWrapper, $resizeControls, $resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel,
			$resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel, $saveButton, $cancelButton,
			newWidth, newHeight, resizeDialog;

		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		widthId = this.mediaId + '-resize-' + which + '-width';
		heightId = this.mediaId + '-resize-' + which + '-height';

		$resizeForm = $('<div></div>',{
			'class' : 'able-resize-form'
		});

		// inner container for all content, will be assigned to modal div's aria-describedby
		$resizeWrapper = $('<div></div>');
		$resizeControls = $( '<div class="able-prefs-buttons"></div>' );

		// width field
		$resizeWidthDiv = $('<div></div>');
		$resizeWidthInput = $('<input>',{
			'type': 'number',
			'id': widthId,
			'min': 0,
			'value': '',
		});
		$resizeWidthLabel = $('<label>',{
			'for': widthId
		}).text( this.translate( 'width', 'Width' ) );

		// height field
		$resizeHeightDiv = $('<div></div>');
		$resizeHeightInput = $('<input>',{
			'type': 'number',
			'id': heightId,
			'min': 0,
			'value': '',
		});
		$resizeHeightLabel = $('<label>',{
			'for': heightId
		}).text( this.translate( 'height', 'Height' ) );

		// Add save and cancel buttons.
		$saveButton = $('<button class="modal-button">' + this.translate( 'save', 'Save' ) + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.translate( 'cancel', 'Cancel' ) + '</button>');
		$saveButton.on('click',function () {
			newWidth = $('#' + widthId).val();
			newHeight = $('#' + heightId).val();
			thisObj.resizeObject(which,newWidth,newHeight);
			thisObj.updatePreferences(which);

			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.trigger('focus');
		});
		$cancelButton.on('click',function () {
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.trigger('focus');
		});

		// Now assemble all the parts
		$resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
		$resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeControls.append($saveButton,$cancelButton);
		$resizeForm.append($resizeWrapper,$resizeControls);

		// must be appended to the BODY!
		// otherwise when aria-hidden="true" is applied to all background content
		// that will include an ancestor of the dialog,
		// which will render the dialog unreadable by screen readers
		$('body').append($resizeForm);
		resizeDialog = new AccessibleDialog(
			$resizeForm,
			$windowButton,
			this.translate( 'windowResizeHeading', 'Resize Window' ),
			this.translate( 'closeButtonLabel', 'Close' ),
		);
		if (which === 'transcript') {
			this.transcriptResizeDialog = resizeDialog;
		} else if (which === 'sign') {
			this.signResizeDialog = resizeDialog;
		}
	};

	AblePlayer.prototype.handleWindowButtonClick = function (which, e) {

		var thisObj, $windowPopup, $windowButton, $toolbar, popupTop;

		thisObj = this;
		if (this.focusNotClick) {
			// transcript or sign window has just opened,
			// and focus moved to the window button
			// ignore the keystroke that triggered the popup
			return false;
		}

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			$toolbar = this.$transcriptToolbar;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			$toolbar = this.$signToolbar;
		}
		if (e.type === 'keydown') {
			// user pressed a key
			if (e.key === ' ' || e.key === 'Enter') {
				this.windowMenuClickRegistered = true;
			} else if (e.key === 'Escape') {
				if ($windowPopup.is(':visible')) {
					// close the popup menu
					$windowPopup.hide();
					// also reset the Boolean
					thisObj.windowMenuClickRegistered = false;
					// also restore menu items to their original state
					$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
					// also return focus to window options button
					$windowButton.trigger('focus');
				} else {
					// popup isn't open. Close the window
					if (which === 'sign') {
						this.handleSignToggle();
					} else if (which === 'transcript') {
						this.handleTranscriptToggle();
					}
				}
			} else {
				return false;
			}
		} else {
			// this was a mouse event
			this.windowMenuClickRegistered = true;
		}

		if ( $windowPopup.is(':visible') ) {
			$windowPopup.hide();
			thisObj.windowMenuClickRegistered = false; // reset
			$windowPopup.find('li').removeClass('able-focus');
			$windowButton.attr('aria-expanded','false').trigger('focus');
		} else {
			// first, be sure window is on top
			this.updateZIndex(which);
			popupTop = $toolbar.outerHeight() - 1;
			$windowPopup.css('top', popupTop);
			$windowPopup.show();
			$windowButton.attr('aria-expanded','true');
			$(this).find('li').first().trigger('focus').addClass('able-focus');
			thisObj.windowMenuClickRegistered = false; // reset
		}
	};

	AblePlayer.prototype.handleMenuChoice = function (which, choice, e) {

		var thisObj, $window, $windowPopup, $windowButton, resizeDialog, startingWidth, startingHeight,
		aspectRatio, tempWidth, tempHeight;

		thisObj = this;
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			resizeDialog = this.transcriptResizeDialog;
		} else if (which === 'sign') {
			$window = this.$signWindow;
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			resizeDialog = this.signResizeDialog;

			startingWidth = $window.outerWidth();
			startingHeight = $window.outerHeight();
			aspectRatio = startingWidth / startingHeight;
			// make height a read-only field
			// and calculate its value based on width to preserve aspect ratio
			let widthId = this.mediaId + '-resize-' + which + '-width';
			let heightId = this.mediaId + '-resize-' + which + '-height';
			$( '#' + heightId ).prop('readonly',true);
			$( '#' + widthId ).on('input',function() {
				tempWidth = $(this).val();
				tempHeight = Math.round(tempWidth/aspectRatio);
				$( '#' + heightId ).val(tempHeight);
			});
		}
		this.$activeWindow = $window;

		if (e.type === 'keydown') {
			if (e.key === 'Escape') { // escape
				// hide the popup menu
				$windowPopup.hide();
				// also reset the Boolean
				thisObj.windowMenuClickRegistered = false;
				// also restore menu items to their original state
				$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
				$windowButton.attr('aria-expanded','false');
				// also return focus to window options button
				$windowButton.trigger('focus');

				return false;
			} else {
				// all other keys will be handled by upstream functions
				if (choice !== 'close') {
					this.$activeWindow = $window;
				}
				return false;
			}
		}

		// hide the popup menu
		$windowPopup.hide();
		// also reset the boolean
		thisObj.windowMenuClickRegistered = false;
		// also restore menu items to their original state
		$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
		$windowButton.attr('aria-expanded','false');

		if (choice !== 'close') {
			$windowButton.trigger('focus');
		}
		if (choice === 'move') {
			// temporarily add role="application" to activeWindow
			// otherwise, screen readers incercept arrow keys and moving window will not work
			this.$activeWindow.attr('role','application');

			if (!this.showedAlert(which)) {
				this.showAlert( this.translate( 'windowMoveAlert', 'Drag or use arrow keys to move the window; Enter to stop' ),which);
				if (which === 'transcript') {
					this.showedTranscriptAlert = true;
				} else if (which === 'sign') {
					this.showedSignAlert = true;
				}
			}
			this.dragDevice = (e.type === 'keydown') ? 'keyboard' : 'mouse';
			this.startDrag(which, $window);
			$windowPopup.hide().parent().attr( 'tabindex', '-1' ).trigger('focus');
		} else if (choice == 'resize') {
			// resize through the menu uses a form, not drag
			var resizeFields = resizeDialog.getInputs();
			if (resizeFields) {
				// reset width and height values in form
				resizeFields[0].value = Math.round( $window.outerWidth() );
				resizeFields[1].value = Math.round( $window.outerHeight() );
			}
			resizeDialog.show();
		} else if (choice == 'close') {
			// close window, place focus on corresponding button on controller bar
			if (which === 'transcript') {
				this.closingTranscript = true; // stopgap to prevent double-firing of keypress
				this.handleTranscriptToggle();
			} else if (which === 'sign') {
				this.closingSign = true; // stopgap to prevent double-firing of keypress
				this.handleSignToggle();
			}
		}
	};

	AblePlayer.prototype.startDrag = function(which, $element) {

		var thisObj, $windowPopup, startPos, newX, newY;

		thisObj = this;

		if (!this.$activeWindow) {
			this.$activeWindow = $element;
		}
		this.dragging = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
		}

		// if window's popup menu is open, close it
		if ($windowPopup.is(':visible')) {
			$windowPopup.hide();
		}

		// be sure this window is on top
		this.updateZIndex(which);

		// get starting position of element
		startPos = this.$activeWindow.position();
		this.dragStartX = startPos.left;
		this.dragStartY = startPos.top;

		if (typeof this.startMouseX === 'undefined') {
			this.dragDevice = 'keyboard';
			this.dragKeyX = this.dragStartX;
			this.dragKeyY = this.dragStartY;
			// add stopgap to prevent the Enter that triggered startDrag() from also triggering dragEnd()
			this.startingDrag = true;
		} else {
			this.dragDevice = 'mouse';
			// get offset between mouse position and top left corner of draggable element
			this.dragOffsetX = this.startMouseX - this.dragStartX;
			this.dragOffsetY = this.startMouseY - this.dragStartY;
		}

		// prepare element for dragging
		this.$activeWindow.addClass('able-drag').css({
			'position': 'absolute',
			'top': this.dragStartY + 'px',
			'left': this.dragStartX + 'px'
		}).trigger('focus');

		// add device-specific event listeners
		if (this.dragDevice === 'mouse') { // might also be a touchpad
			$(document).on('mousemove touchmove',function(e) {
				if (thisObj.dragging) {
					// calculate new top left based on current mouse position - offset
					newX = e.pageX - thisObj.dragOffsetX;
					newY = e.pageY - thisObj.dragOffsetY;
					thisObj.resetDraggedObject( newX, newY );
				}
			});
		} else if (this.dragDevice === 'keyboard') {
			this.$activeWindow.on('keydown',function(e) {
				if (thisObj.dragging) {
					thisObj.dragKeys(which, e);
				}
			});
		}
		return false;
	};

	/**
	 * Handle moving the transcript or sign window from the keyboard.
	 *
	 * @param {string} which 'transcript' or 'sign' window.
	 * @param {Event} e Triggered event.
	 */
	AblePlayer.prototype.dragKeys = function(which, e) {

		var key, keySpeed;

		// stopgap to prevent firing on initial Enter or space
		// that selected "Move" from menu
		if (this.startingDrag) {
			this.startingDrag = false;
			return false;
		}
		key = e.key;
		keySpeed = 10; // pixels per keypress event

		switch (key) {
			case 'ArrowLeft':	// left
				 this.dragKeyX -= keySpeed;
				 this.$srAlertBox.text( this.translate( 'windowMoveLeft', 'Window moved left' ) );
				break;
			case 'ArrowUp':	// up
				this.dragKeyY -= keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveUp', 'Window moved up' ) );
				break;
			case 'ArrowRight':	// right
				this.dragKeyX += keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveRight', 'Window moved right' ) );
				break;
			case 'ArrowDown':	// down
				this.dragKeyY += keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveDown', 'Window moved down' ) );
				break;
			case 'Enter': 	// enter
			case 'Escape': 	// escape
				this.$srAlertBox.text( this.translate( 'windowMoveStopped', 'Window move stopped' ) );
				this.endDrag(which);
				return false;
			default:
				return false;
		}
		this.resetDraggedObject(this.dragKeyX,this.dragKeyY);
		if (e.preventDefault) {
			e.preventDefault();
		}
		return false;
	};

	AblePlayer.prototype.resetDraggedObject = function ( x, y) {
		setTimeout( () => {
			this.$srAlertBox.text( '' );
		}, 2000 );

		this.$activeWindow.css({
			'left': x + 'px',
			'top': y + 'px'
		});
	},

	AblePlayer.prototype.resizeObject = function ( which, width, height ) {

		var innerHeight;

		// which is either 'transcript' or 'sign'
		this.$activeWindow.css({
			'width': width + 'px',
			'height': height + 'px'
		});

		if (which === 'transcript') {
			// $activeWindow is the outer $transcriptArea
			// but the inner able-transcript also needs to be resized proportionally
			// (it's 50px less than its outer container)
			innerHeight = height - 50;
			this.$transcriptDiv.css('height', innerHeight + 'px');
		}
	};

	AblePlayer.prototype.endDrag = function(which) {

		var thisObj, $windowButton;
		thisObj = this;

		if (which === 'transcript') {
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown').removeClass('able-drag');
		// restore activeWindow role from 'application' to 'dialog'
		this.$activeWindow.attr('role','dialog');
		this.$activeWindow = null;

		if (this.dragDevice === 'keyboard') {
			$windowButton.trigger('focus');
		}
		this.dragging = false;

		// save final position of dragged element
		this.updatePreferences(which);

		// reset starting mouse positions
		this.startMouseX = undefined;
		this.startMouseY = undefined;

		// Boolean to stop stray events from firing
		this.windowMenuClickRegistered = false;
		this.finishingDrag = true; // will be reset after window click event
		// finishingDrag should be reset after window click event,
		// which is triggered automatically after mouseup
		// However, in case that's not reliable in some browsers
		// need to ensure this gets cancelled
		setTimeout(function() {
			thisObj.finishingDrag = false;
		}, 100);
	};

	AblePlayer.prototype.startResize = function(which, $element) {

		var thisObj, $windowPopup, newWidth, newHeight;

		thisObj = this;
		this.$activeWindow = $element;
		this.resizing = true;

		$windowPopup = (which === 'transcript') ? this.$transcriptPopup : this.$signPopup;

		// if window's popup menu is open, close it & place focus on button (???)
		if ($windowPopup.is(':visible')) {
			$windowPopup.hide().parent().trigger('focus');
		}

		// get starting width and height
		this.dragKeyX = this.dragStartX;
		this.dragKeyY = this.dragStartY;
		this.dragStartWidth = this.$activeWindow.width();
		this.dragStartHeight = this.$activeWindow.outerHeight();

		// add event listeners
		$(document).on('mousemove touchmove',function(e) {
			if (thisObj.resizing) {
				// calculate new width and height based on changes to mouse position
				newWidth = thisObj.dragStartWidth + (e.pageX - thisObj.startMouseX);
				newHeight = thisObj.dragStartHeight + (e.pageY - thisObj.startMouseY);
				thisObj.resizeObject( which, newWidth, newHeight );
			}
		});

		return false;
	};

	AblePlayer.prototype.endResize = function(which) {

		var $windowButton;

		if (which === 'transcript') {
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown');
		$windowButton.show().trigger('focus');
		this.resizing = false;
		this.$activeWindow.removeClass('able-resize');

		// save final width and height of dragged element
		this.updatePreferences(which);

		// Booleans for preventing stray events
		this.windowMenuClickRegistered = false;
		this.finishingDrag = true;

		// finishingDrag should e reset after window click event,
		// which is triggered automatically after mouseup
		// However, in case that's not reliable in some browsers
		// need to ensure this gets cancelled
		setTimeout(function() {
			this.finishingDrag = false;
		}, 100);
	};
}

function addEventFunctions(AblePlayer) {
	// Media events
	AblePlayer.prototype.onMediaUpdateTime = function (duration, elapsed) {

		// duration and elapsed are passed from callback functions of Vimeo API events
		// duration is expressed as sss.xxx
		// elapsed is expressed as sss.xxx
		var thisObj = this;
		this.getMediaTimes(duration,elapsed).then(function(mediaTimes) {
			thisObj.duration = mediaTimes['duration'];
			thisObj.elapsed = mediaTimes['elapsed'];
			if (thisObj.duration > 0) {
				// do all the usual time-sync stuff during playback
				if (thisObj.prefHighlight === 1) {
					thisObj.highlightTranscript(thisObj.elapsed);
				}
				thisObj.updateCaption(thisObj.elapsed);
				thisObj.showDescription(thisObj.elapsed);
				thisObj.updateChapter(thisObj.elapsed);
				thisObj.updateMeta(thisObj.elapsed);
				thisObj.refreshControls('timeline', thisObj.duration, thisObj.elapsed);
			}
		});
	};

	AblePlayer.prototype.onMediaPause = function () {

		if (this.controlsHidden) {
			this.fadeControls('in');
			this.controlsHidden = false;
		}
		if (this.hideControlsTimeoutStatus === 'active') {
			window.clearTimeout(this.hideControlsTimeout);
			this.hideControlsTimeoutStatus = 'clear';

		}
		this.refreshControls('playpause');
	};

	AblePlayer.prototype.onMediaComplete = function () {
		// if there's a playlist, advance to next item and start playing
		if (this.hasPlaylist && !this.cueingPlaylistItem) {
			if (this.playlistIndex === (this.$playlist.length - 1)) {
				// this is the last track in the playlist
				if (this.loop) {
					this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
					this.cuePlaylistItem(0);
				} else {
					this.playing = false;
					this.paused = true;
				}
			} else {
				// this is not the last track. Play the next one.
				this.playlistIndex++;
				this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
				this.cuePlaylistItem(this.playlistIndex);
			}
		}
		this.refreshControls();
	};

	AblePlayer.prototype.onMediaNewSourceLoad = function () {

		var loadIsComplete = false;

		if (this.cueingPlaylistItem) {
			// this variable was set to address bugs caused by multiple firings of media 'end' event
			// safe to reset now
			this.cueingPlaylistItem = false;
		}
		if (this.recreatingPlayer) {
			// same as above; different bugs
			this.recreatingPlayer = false;
		}
		if (this.playbackRate) {
			// user has set playbackRate on a previous src or track
			// use that setting on the new src or track too
			this.setPlaybackRate(this.playbackRate);
		}
		if (this.userClickedPlaylist) {
			if (!this.startedPlaying || this.okToPlay) {
				// start playing; no further user action is required
				this.playMedia();
				loadIsComplete = true;
			 }
		} else if (this.seekTrigger == 'restart' ||
				this.seekTrigger == 'chapter' ||
				this.seekTrigger == 'transcript' ||
				this.seekTrigger == 'search'
				) {
			// by clicking on any of these elements, user is likely intending to play
			// Not included: elements where user might click multiple times in succession
			// (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
			this.playMedia();
			loadIsComplete = true;
		} else if (this.swappingSrc) {
			// new source file has just been loaded
			if (this.hasPlaylist) {
				// a new source file from the playlist has just been loaded
				if ((this.playlistIndex !== this.$playlist.length) || this.loop) {
					// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
					this.playMedia();
					loadIsComplete = true;
				}
			} else if (this.swapTime > 0) {
				if (this.seekStatus === 'complete') {
					if (this.okToPlay) {
						// should be able to resume playback
						this.playMedia();
					}
					loadIsComplete = true;
				} else if (this.seekStatus === 'seeking') ; else {
					if (this.swapTime === this.elapsed) {
						// seek is finished!
						this.seekStatus = 'complete';
						if (this.okToPlay) {
							// should be able to resume playback
							this.playMedia();
						}
						loadIsComplete = true;
					} else {
						// seeking hasn't started yet
						// first, determine whether it's possible
						if (this.hasDescTracks) {
							// do nothing. Unable to seek ahead if there are descTracks
							loadIsComplete = true;
						} else if (this.durationsAreCloseEnough(this.duration,this.prevDuration)) {
							// durations of two sources are close enough to making seek ahead in new source ok
							this.seekStatus = 'seeking';
							this.seekTo(this.swapTime);
						} else {
							// durations of two sources are too dissimilar to support seeking ahead to swapTime.
							loadIsComplete = true;
						}
					}
				}
			} else {
				// swapTime is 0. No seeking required.
				if (this.playing) {
					this.playMedia();
					// swap is complete. Reset vars.
					loadIsComplete = true;
				}
			}
		} else if (!this.startedPlaying) {
			if (this.startTime > 0) {
				if (this.seeking) {
					// a seek has already been initiated
					// since canplaythrough has been triggered, the seek is complete
					this.seeking = false;
					if (this.okToPlay) {
						this.playMedia();
					}
					loadIsComplete = true;
				} else {
					// haven't started seeking yet
					this.seekTo(this.startTime);
				}
			} else if (this.defaultChapter && typeof this.selectedChapters !== 'undefined') {
				this.seekToChapter(this.defaultChapter);
			} else {
				// there is no startTime, therefore no seeking required
				if (this.okToPlay) {
					this.playMedia();
				}
				loadIsComplete = true;
			}
		} else if (this.hasPlaylist) {
			// new source media is part of a playlist, but user didn't click on it
			// (and somehow, swappingSrc is false)
			// this may happen when the previous track ends and next track loads
			// this same code is called above when swappingSrc is true
			if ((this.playlistIndex !== this.$playlist.length) || this.loop) {
				// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
				this.playMedia();
				loadIsComplete = true;
			}
		} else {
			// None of the above.
			// User is likely seeking to a new time, but not loading a new media source
			// need to reset vars
			loadIsComplete = true;
		}
		if (loadIsComplete) {
			// reset vars
			this.swappingSrc = false;
			this.seekStatus = null;
			this.swapTime = 0;
			this.seekTrigger = null;
			this.seekingFromTranscript = false;
			this.userClickedPlaylist = false;
			this.okToPlay = false;
		}
		this.refreshControls();
		if (this.$focusedElement) {
			this.restoreFocus();
			this.$focusedElement = null;
			this.activeMedia = null;
		}
	};

	AblePlayer.prototype.durationsAreCloseEnough = function(d1,d2) {

		// Compare the durations of two media sources to determine whether it's ok to seek ahead after swapping src
		// The durations may not be exact, but they might be "close enough"
		// returns true if "close enough", otherwise false

		var tolerance, diff;

		tolerance = 1;  // number of seconds between rounded durations that is considered "close enough"
		diff = Math.abs(Math.round(d1) - Math.round(d2));

		return (diff <= tolerance) ? true : false;
	};

	AblePlayer.prototype.restoreFocus = function() {

		// function called after player has been rebuilt (during media swap)
		// the original focusedElement no longer exists,
		// but this function finds a match in the new player
		// and places focus there

		var classList, $mediaParent;

		if ( this.$focusedElement && null !== this.activeMedia ) {
			$mediaParent = $( '#' + this.activeMedia ).closest( '.able' );
			if ( (this.$focusedElement).attr('role') === 'button' ) {
				classList = this.$focusedElement.attr("class").split(/\s+/);
				$.each(classList, function(index, item) {
					if (item.substring(0,20) === 'able-button-handler-') {
						$mediaParent.find('div.able-controller div.' + item).trigger('focus');
					}
				});
			}
		}

	};

	AblePlayer.prototype.addSeekbarListeners = function () {

		var thisObj = this;

		// Handle seek bar events.
		this.seekBar.seekbarDiv.on('startTracking', function (e) {
			thisObj.pausedBeforeTracking = thisObj.paused;
			thisObj.pauseMedia();
		}).on('tracking', function (e, position) {
			// Scrub transcript, captions, and metadata.
			thisObj.highlightTranscript(position);
			thisObj.updateCaption(position);
			thisObj.showDescription(position);
			thisObj.updateChapter(thisObj.convertChapterTimeToVideoTime(position));
			thisObj.updateMeta(position);
			thisObj.refreshControls();
		}).on('stopTracking', function (e, position) {
			if (thisObj.useChapterTimes) {
				thisObj.seekTo(thisObj.convertChapterTimeToVideoTime(position));
			} else {
				thisObj.seekTo(position);
			}
			if (!thisObj.pausedBeforeTracking) {
				setTimeout(function () {
					thisObj.playMedia();
				}, 200);
			}
		});
	};

	AblePlayer.prototype.onClickPlayerButton = function (el) {
		var whichButton, prefsPopup;
		whichButton = this.getButtonNameFromClass($(el).attr('class'));
		switch ( whichButton ) {
			case 'play':
				this.clickedPlay = true;
				this.handlePlay();
				break;
			case 'restart':
				this.seekTrigger = 'restart';
				this.handleRestart();
				break;
			case 'previous':
				this.userClickedPlaylist = true;
				this.okToPlay = true;
				this.seekTrigger = 'previous';
				this.buttonWithFocus = 'previous';
				this.handlePrevTrack();
				break;
			case 'next':
				this.userClickedPlaylist = true;
				this.okToPlay = true;
				this.seekTrigger = 'next';
				this.buttonWithFocus = 'next';
				this.handleNextTrack();
				break;
			case 'rewind':
				this.seekTrigger = 'rewind';
				this.handleRewind();
				break;
			case 'forward':
				this.seekTrigger = 'forward';
				this.handleFastForward();
				break;
			case 'mute':
				this.handleMute();
				break;
			case 'volume':
				this.handleVolumeButtonClick();
				break;
			case 'faster':
				this.handleRateIncrease();
				break;
			case 'slower':
				this.handleRateDecrease();
				break;
			case 'captions':
				this.handleCaptionToggle();
				break;
			case 'chapters':
				this.handleChapters();
				break;
			case 'descriptions':
				this.handleDescriptionToggle();
				break;
			case 'sign':
				if ( ! this.closingSign ) {
					this.handleSignToggle();
				}
				break;
			case 'preferences':
				if ($(el).attr('data-prefs-popup') === 'menu') {
					this.handlePrefsClick();
				} else {
					this.showingPrefsDialog = true; // stopgap
					this.closePopups();
					prefsPopup = $(el).attr('data-prefs-popup');
					if (prefsPopup === 'keyboard') {
						this.keyboardPrefsDialog.show();
					} else if (prefsPopup === 'captions') {
						this.captionPrefsDialog.show();
					} else if (prefsPopup === 'descriptions') {
						this.descPrefsDialog.show();
					} else if (prefsPopup === 'transcript') {
						this.transcriptPrefsDialog.show();
					}
					this.showingPrefsDialog = false;
				}
				break;
			case 'transcript':
				if ( !this.closingTranscript ) {
					this.handleTranscriptToggle();
				}
				break;
			case 'fullscreen':
				this.clickedFullscreenButton = true;
				this.handleFullscreenToggle();
				break;
		}
	};

	AblePlayer.prototype.getButtonNameFromClass = function (classString) {
		// player control buttons all have class="able-button-handler-x"  where x is the identifier
		// buttons might also have other classes assigned though
		var classes, i;

		classes = classString.split(' ');
		for (i = 0; i < classes.length; i++) {
			if (classes[i].substring(0,20) === 'able-button-handler-') {
				return classes[i].substring(20);
			}
		}
		return classString;
	};

	AblePlayer.prototype.okToHandleKeyPress = function () {
		let defaultReturn = true;
		if ( this.prefNoKeyShortcuts === 1 ) {
			defaultReturn = false;
		}
		// returns true unless user's focus is on a UI element or user has disabled keyboard shortcuts.
		// that is likely to need supported keystrokes, including space
		var activeElement = AblePlayer.getActiveDOMElement();

		return ($(activeElement).prop('tagName') === 'INPUT') ? false : defaultReturn;
	};

	AblePlayer.prototype.onPlayerKeyPress = function (e) {

		// handle keystrokes (using DHTML Style Guide recommended key combinations)
		// https://web.archive.org/web/20130127004544/http://dev.aol.com/dhtml_style_guide/#mediaplayer
		// Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
		// - Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
		// The rest are reasonable best choices
		// - If there are multiple players on a single page, keystroke handlers
		// are only bound to the FIRST player
		// - The DHTML Style Guide is now the W3C WAI-ARIA Authoring Guide and has undergone many revisions
		// including removal of the "media player" design pattern. There's an issue about that:
		// https://github.com/w3c/aria-practices/issues/27

		var key, $thisElement;

		// Convert to lower case.
		key = e.key;
		$thisElement = $(document.activeElement);

		if (key === 'Escape') {
			if (this.$transcriptArea && $.contains(this.$transcriptArea[0],$thisElement[0]) && !this.hidingPopup) {
				// This element is part of transcript area.
				this.handleTranscriptToggle();
				return false;
			}
		}
		if (!this.okToHandleKeyPress()) {
			return false;
		}

		// Only use keypress to control player if focus is NOT on a form field or contenteditable element
		// (or a textarea element with player in stenoMode)
		if (!(
			$(':focus').is('[contenteditable]') ||
			$(':focus').is('input') ||
			($(':focus').is('textarea') && !this.stenoMode) ||
			$(':focus').is('select') ||
			e.target.hasAttribute('contenteditable') ||
			e.target.tagName === 'INPUT' ||
			(e.target.tagName === 'TEXTAREA' && !this.stenoMode) ||
			e.target.tagName === 'SELECT'
		)){
			if (key === 'Escape') {
				this.closePopups();
				this.$tooltipDiv.hide();
				this.seekBar.hideSliderTooltips();
			} else if (key === ' ') {
				// disable spacebar support for play/pause toggle as of 4.2.10
				// spacebar should not be handled everywhere on the page, since users use that to scroll the page
				// when the player has focus, most controls are buttons so spacebar should be used to trigger the buttons
				if ($thisElement.attr('role') === 'button') {
					// register a click on this element
					e.preventDefault();
					$thisElement.trigger( 'click' );
				}
			} else if ( key === 'p' ) {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePlay();
				}
			} else if (key === 's') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleRestart();
				}
			} else if (key === 'm') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleMute();
				}
			} else if (key === 'v') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleVolumeButtonClick();
				}
			} else if (key >= 0 && key <= 9) {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleVolumeKeystroke(key);
				}
			} else if (key === 'c') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleCaptionToggle();
				}
			} else if (key === 'd') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleDescriptionToggle();
				}
			} else if (key === 'f') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleFastForward();
				}
			} else if (key === 'r') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleRewind();
				}
			} else if (key === 'b') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePrevTrack();
				}
			} else if (key === 'n') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleNextTrack();
				}
			} else if (key === 'e') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePrefsClick();
				}
			} else if (key === 'Enter') {
				if ($thisElement.attr('role') === 'button' || $thisElement.prop('tagName') === 'SPAN') {
					// register a click on this element
					// if it's a transcript span the transcript span click handler will take over
					$thisElement.trigger( 'click' );
				} else if ($thisElement.prop('tagName') === 'LI') {
					$thisElement.trigger( 'click' );
				}
			}
		}
	};

	AblePlayer.prototype.addHtml5MediaListeners = function () {

		var thisObj = this;

		// NOTE: iOS and some browsers do not support autoplay
		// and no events are triggered until media begins to play
		// Able Player gets around this by automatically loading media in some circumstances
		// (see initialize.js > initPlayer() for details)

		this.$media
			.on('emptied',function() {
				// do something
			})
			.on('loadedmetadata',function() {
				// should be able to get duration now
				thisObj.duration = thisObj.media.duration;
			})
			.on('canplay',function() {
				// previously handled seeking to startTime here
				// but it's probably safer to wait for canplaythrough
				// so we know player can seek ahead to anything
			})
			.on('canplaythrough',function() {
				// previously onMediaNewSourceLoad() was called on 'loadedmetadata'
				// but that proved to be too soon for some of this functionality.
				// TODO: Monitor this. If moving it here causes performance issues,
				// consider moving some or all of this functionality to 'canplay'
				thisObj.onMediaNewSourceLoad();
			})
			.on('play',function() {
				// 'play' indicates that the play method has been called.
				// Don't do anything until playback has actually started.
			})
			.on('playing',function() {
				// 'playing' indicates that the video is playing.
				thisObj.playing = true;
				thisObj.paused = false;
				thisObj.swappingSrc = false;
				thisObj.refreshControls('playpause');
			})
			.on('ended',function() {
				thisObj.playing = false;
				thisObj.paused = true;
				thisObj.onMediaComplete();
			})
			.on('progress', function() {
				thisObj.refreshControls('timeline');
			})
			.on('waiting',function() {
				// could fire a notification about loss of data.
			})
			.on('durationchange',function() {
				// Display new duration.
				thisObj.refreshControls('timeline');
			})
			.on('timeupdate',function() {
				thisObj.onMediaUpdateTime(); // includes a call to refreshControls()
			})
			.on('pause',function() {
				if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
					// this happens in some browsers when swapping source
					// (e.g., between tracks in a playlist or swapping description)
					if (thisObj.hasPlaylist || thisObj.swappingSrc) ; else {
						thisObj.playing = false;
						thisObj.paused = true;
					}
				} else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
				thisObj.clickedPlay = false; // done with this variable
				thisObj.onMediaPause(); // includes a call to refreshControls()
			})
			.on('ratechange',function() {
				// do something
			})
			.on('volumechange',function() {
				thisObj.volume = thisObj.getVolume();
			})
			.on('error',function() {
				if (thisObj.debug) {
					switch (thisObj.media.error.code) {
											}
				}
			});
	};

	AblePlayer.prototype.addVimeoListeners = function () {

		var thisObj = this;

		// Vimeo doesn't seem to support chaining of on() functions
		// so each event listener must be attached separately
		this.vimeoPlayer.on('loaded', function(vimeoId) {
			 // Triggered when a new video is loaded in the player
			thisObj.onMediaNewSourceLoad();
		 });
		this.vimeoPlayer.on('play', function(e) {
			// Triggered when the video plays
			thisObj.playing = true;
			thisObj.startedPlaying = true;
			thisObj.paused = false;
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('ended', function(e) {
			// Triggered any time the video playback reaches the end.
			// Note: when loop is turned on, the ended event will not fire.
			thisObj.playing = false;
			thisObj.paused = true;
			thisObj.onMediaComplete();
		});
		this.vimeoPlayer.on('bufferstart', function() {
			// Triggered when buffering starts in the player.
			// This is also triggered during preload and while seeking.
			// There is no associated data with this event.
		});
		this.vimeoPlayer.on('bufferend', function() {
			// Triggered when buffering ends in the player.
			// This is also triggered at the end of preload and seeking.
			// There is no associated data with this event.
		});
		this.vimeoPlayer.on('progress', function(e) {
			// Triggered as the video is loaded.
			 // Reports back the amount of the video that has been buffered (NOT the amount played)
			 // Data has keys duration, percent, and seconds
		});
		this.vimeoPlayer.on('seeking', function(e) {
		 	// Triggered when the player starts seeking to a specific time.
			 // A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('seeked', function(e) {
			// Triggered when the player seeks to a specific time.
			// A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('timeupdate',function(e) {
			// Triggered as the currentTime of the video updates.
			 // It generally fires every 250ms, but it may vary depending on the browser.
			thisObj.onMediaUpdateTime(e['duration'], e['seconds']);
		});
		this.vimeoPlayer.on('pause',function(e) {
			// Triggered when the video pauses
			if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
				// this happens in some browsers (not Chrome, as of 70.x)
				// when swapping source (e.g., between tracks in a playlist, or swapping description)
				if (thisObj.hasPlaylist || thisObj.swappingSrc) ; else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
			} else {
				thisObj.playing = false;
				thisObj.paused = true;
			}
			thisObj.clickedPlay = false; // done with this variable
			thisObj.onMediaPause();
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('playbackratechange',function(e) {
			// Triggered when the playback rate of the video in the player changes.
			// The ability to change rate can be disabled by the creator
			// and the event will not fire for those videos.
			// data contains one key: 'playbackRate'
			thisObj.vimeoPlaybackRate = e['playbackRate'];
		});
		this.vimeoPlayer.on('texttrackchange', function(e) {
			// Triggered when the active text track (captions/subtitles) changes.
			// The values will be null if text tracks are turned off.
			// data contains three keys: kind, label, language
		});
		this.vimeoPlayer.on('volumechange',function(e) {
			// Triggered when the volume in the player changes.
			// Some devices do not support setting the volume of the video
			// independently from the system volume,
			// so this event will never fire on those devices.
			thisObj.volume = e['volume'] * 10;
		});
		this.vimeoPlayer.on('error',function(e) {
			// do something with the available data
			// data contains three keys: message, method, name
			// message: A user-friendly error message
			// method: The Vimeo API method call that triggered the error
			// name: Name of the error (not necesssarily user-friendly)
		});
	};

	AblePlayer.prototype.addEventListeners = function () {

		var thisObj = this;

		// Appropriately resize media player for full screen.
		$(window).on('resize',function () {
			thisObj.resizePlayer();
		});

		// Refresh player if it changes from hidden to visible
		// There is no event triggered by a change in visibility
		// but MutationObserver works in most browsers (but NOT in IE 10 or earlier)
		// http://caniuse.com/#feat=mutationobserver
		if (window.MutationObserver) {
			var target = this.$ableDiv[0];
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
						// the player's style attribute has changed. Check to see if it's visible
						if (thisObj.$ableDiv.is(':visible')) {
							thisObj.refreshControls();
						}
					}
				});
			});
			var config = { attributes: true, childList: true, characterData: true };
			observer.observe(target, config);
		}
		if (typeof this.seekBar !== 'undefined') {
			this.addSeekbarListeners();
		} else {
			// wait a bit and try again
			// TODO: Should set this up to keep trying repeatedly.
			// Seekbar listeners are critical.
			setTimeout(function() {
				if (typeof thisObj.seekBar !== 'undefined') {
					thisObj.addSeekbarListeners();
				}
			},2000);
		}

		// handle clicks on player buttons
		this.$controllerDiv.find('div[role="button"]').on('click',function(e){
			e.stopPropagation();
			thisObj.onClickPlayerButton(this);
		});

		// handle clicks (left only) anywhere on the page. If any popups are open, close them.
		$('body').on('click', function(e) {

			if (e.button !== 0) { // not a left click
				return false;
			}
			if ($('.able-popup:visible').length || $('.able-volume-slider:visible').length ) {
				// at least one popup is visible
				thisObj.closePopups();
			}
			if (e.target.tagName === 'VIDEO') {
				// user clicked the video (not an element that sits on top of the video)
				// handle this as a play/pause toggle click
				thisObj.clickedPlay = true;
			}
		});

		// handle mouse movement over player; make controls visible again if hidden
		this.$ableDiv.on('mousemove',function() {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					// after showing controls, hide them again after a brief timeout
					thisObj.invokeHideControlsTimeout();
				}
			} else {
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		// if user presses a key from anywhere on the page, show player controls
		$(document).on( 'keydown', function(e) {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					// after showing controls, hide them again after a brief timeout
					thisObj.invokeHideControlsTimeout();
				}
			} else {
				// controls are visible
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';

					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		// handle local keydown events if this isn't the only player on the page;
		// otherwise these are dispatched by global handler (see ableplayer-base.js)
		this.$ableDiv.on( 'keydown', function (e) {
			if (!AblePlayer.hasSingleInstance()) {
				thisObj.onPlayerKeyPress(e);
			}
		});

		// If stenoMode is enabled in an iframe, handle keydown events from the iframe
		if (this.stenoMode && (typeof this.stenoFrameContents !== 'undefined')) {
			this.stenoFrameContents.on('keydown',function(e) {
				thisObj.onPlayerKeyPress(e);
			});
		}
		// transcript is not a child of this.$ableDiv
		// therefore, must be added separately
		if (this.$transcriptArea) {
			this.$transcriptArea.on('keydown',function (e) {
				if (!AblePlayer.hasSingleInstance()) {
					thisObj.onPlayerKeyPress(e);
				}
			});
		}

		// handle clicks on playlist items
		if (this.$playlist) {
			this.$playlist.on( 'click', function(e) {
				if (!thisObj.userClickedPlaylist) {
					// stopgap in case multiple clicks are fired on the same playlist item
					thisObj.userClickedPlaylist = true; // will be set to false after new src is loaded & canplaythrough is triggered
					thisObj.playlistIndex = $(this).index();
					thisObj.cuePlaylistItem(thisObj.playlistIndex);
				}
			});
		}

		// Also play/pause when clicking on the media.
		this.$media.on( 'click', function () {
			thisObj.handlePlay();
		});

		// add listeners for media events
		if (this.player === 'html5') {
			this.addHtml5MediaListeners();
		} else if (this.player === 'vimeo') {
			 this.addVimeoListeners();
		} else if (this.player === 'youtube') {
			// Youtube doesn't give us time update events, so we just periodically generate them ourselves
			setInterval(function () {
				thisObj.onMediaUpdateTime();
			}, 300);
		}
	};
}

function addInitializeFunctions(AblePlayer) {
	// Set default variable values.
	AblePlayer.prototype.setDefaults = function () {

		this.playerCreated = false; // will set to true after recreatePlayer() is complete the first time
		this.playing = false; // will change to true after 'playing' event is triggered
		this.paused = true; // will always be the opposite of this.playing (available for convenience)
		this.clickedPlay = false; // will change to true temporarily if user clicks 'play' (or pause)
		this.fullscreen = false; // will change to true if player is in full screen mode
		this.swappingSrc = false; // will change to true temporarily while media source is being swapped
		this.initializing = false; // will change to true temporarily while initPlayer() is processing
		this.cueingPlaylistItems = false; // will change to true temporarily while cueing next playlist item
		this.buttonWithFocus = null; // will change to 'previous' or 'next' if user clicks either of those buttons
		this.speechEnabled = null; // will change either to 'true' in initSpeech(), or false if not supported

		this.setIconColor();
	};

	AblePlayer.prototype.setIconColor = function() {

		// determine the best color choice (white or black) for icons,
		// given the background-color of their container elements
		// Source for relative luminance formula:
		// https://en.wikipedia.org/wiki/Relative_luminance

		// We need to know the color *before* creating the element
		// so the element doesn't exist yet when this function is called
		// therefore, need to create a temporary element then remove it after color is determined
		// Temp element must be added to the DOM or WebKit can't retrieve its CSS properties

		var $elements, i, $el, bgColor, rgb, red, green, blue, luminance, iconColor;

		$elements = ['controller', 'toolbar'];
		for (i=0; i<$elements.length; i++) {
			if ($elements[i] == 'controller') {
				$el =	 $('<div>', {
					'class': 'able-controller'
				}).hide();
			} else if ($elements[i] === 'toolbar') {
				$el =	 $('<div>', {
					'class': 'able-window-toolbar'
				}).hide();
			}
			$('body').append($el);
			bgColor = $el.css('background-color');
			// bgColor is a string in the form 'rgb(R, G, B)', perhaps with a 4th item for alpha;
			// split the 3 or 4 channels into an array
			rgb = bgColor.replace(/[^\d,]/g, '').split(',');
			red = rgb[0];
			green = rgb[1];
			blue = rgb[2];
			luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
			// range is 1 - 255; therefore 125 is the tipping point
			iconColor = (luminance < 125) ? 'white' : 'black';

			if ($elements[i] === 'controller') {
				this.iconColor = iconColor;
			} else if ($elements[i] === 'toolbar') {
				this.toolbarIconColor = iconColor;
			}
			$el.remove();
		}
	};

	AblePlayer.prototype.getIconData = function(button) {

		// returns array of values for creating <svg> tag for specified button
		// 0 = <svg> viewBox attribute
		// 1 = <path> d (description) attribute
		// 2 = icon class for font icons
		// 3 = img URL for images.
		var svg = Array();

		switch (button) {

			case 'play':
				svg[0] = '0 0 16 20';
				svg[1] = 'M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z';
				break;

			case 'pause':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z';
				break;

			case 'restart':
				svg[0] = '0 0 20 20';
				svg[1] = 'M18 8h-6l2.243-2.243c-1.133-1.133-2.64-1.757-4.243-1.757s-3.109 0.624-4.243 1.757c-1.133 1.133-1.757 2.64-1.757 4.243s0.624 3.109 1.757 4.243c1.133 1.133 2.64 1.757 4.243 1.757s3.109-0.624 4.243-1.757c0.095-0.095 0.185-0.192 0.273-0.292l1.505 1.317c-1.466 1.674-3.62 2.732-6.020 2.732-4.418 0-8-3.582-8-8s3.582-8 8-8c2.209 0 4.209 0.896 5.656 2.344l2.344-2.344v6z';
				break;

			case 'rewind':
				svg[0] = '0 0 20 20';
				svg[1] = 'M11.25 3.125v6.25l6.25-6.25v13.75l-6.25-6.25v6.25l-6.875-6.875z';
				break;

			case 'forward':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10 16.875v-6.25l-6.25 6.25v-13.75l6.25 6.25v-6.25l6.875 6.875z';
				break;

			case 'previous':
				svg[0] = '0 0 20 20';
				svg[1] = 'M5 17.5v-15h2.5v6.875l6.25-6.25v13.75l-6.25-6.25v6.875z';
				break;

			case 'next':
				svg[0] = '0 0 20 20';
				svg[1] = 'M15 2.5v15h-2.5v-6.875l-6.25 6.25v-13.75l6.25 6.25v-6.875z';
				break;

			case 'slower':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0 7.321q0-0.29 0.212-0.502t0.502-0.212h10q0.29 0 0.502 0.212t0.212 0.502-0.212 0.502l-5 5q-0.212 0.212-0.502 0.212t-0.502-0.212l-5-5q-0.212-0.212-0.212-0.502z';
				break;

			case 'faster':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0 12.411q0-0.29 0.212-0.502l5-5q0.212-0.212 0.502-0.212t0.502 0.212l5 5q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-10q-0.29 0-0.502-0.212t-0.212-0.502z';
				break;

			case 'turtle':
				svg[0] = '0 0 20 20';
				svg[1] = 'M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z';
				break;

			case 'rabbit':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z';
				break;

			case 'ellipsis':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2zM3.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.986 2.199-2.2s-0.984-2.2-2.199-2.2zM17.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2z';
				break;

			case 'pipe':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.15 0.179h0.623c0.069 0 0.127 0.114 0.127 0.253v19.494c0 0.139-0.057 0.253-0.127 0.253h-1.247c-0.069 0-0.126-0.114-0.126-0.253v-19.494c0-0.139 0.057-0.253 0.126-0.253h0.623z';
				break;

			case 'captions':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z';
				break;

			case 'descriptions':
				svg[0] = '0 0 20 20';
				svg[1] = 'M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z';
				break;

			case 'sign':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z';
				break;

			case 'mute':
			case 'volume-mute':
				svg[0] = '0 0 20 20';
				svg[1] = 'M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z';
				break;

			case 'volume-soft':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				break;

			case 'volume-medium':
				svg[0] = '0 0 20 20';
				svg[1] = 'M14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				break;

			case 'volume-loud':
				svg[0] = '0 0 21 20';
				svg[1] = 'M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				break;

			case 'chapters':
				svg[0] = '0 0 20 20';
				svg[1] = 'M5 2.5v17.5l6.25-6.25 6.25 6.25v-17.5zM15 0h-12.5v17.5l1.25-1.25v-15h11.25z';
				break;

			case 'transcript':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 19.107v-17.857q0-0.446 0.313-0.759t0.759-0.313h8.929v6.071q0 0.446 0.313 0.759t0.759 0.313h6.071v11.786q0 0.446-0.313 0.759t-0.759 0.312h-15q-0.446 0-0.759-0.313t-0.313-0.759zM4.286 15.536q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 12.679q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 9.821q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM11.429 5.893v-5.268q0.246 0.156 0.402 0.313l4.554 4.554q0.156 0.156 0.313 0.402h-5.268z';
				break;

			case 'preferences':
				svg[0] = '0 0 20 20';
				svg[1] = 'M18.238 11.919c-1.049-1.817-0.418-4.147 1.409-5.205l-1.965-3.404c-0.562 0.329-1.214 0.518-1.911 0.518-2.1 0-3.803-1.714-3.803-3.828h-3.931c0.005 0.653-0.158 1.314-0.507 1.919-1.049 1.818-3.382 2.436-5.212 1.382l-1.965 3.404c0.566 0.322 1.056 0.793 1.404 1.396 1.048 1.815 0.42 4.139-1.401 5.2l1.965 3.404c0.56-0.326 1.209-0.513 1.902-0.513 2.094 0 3.792 1.703 3.803 3.808h3.931c-0.002-0.646 0.162-1.3 0.507-1.899 1.048-1.815 3.375-2.433 5.203-1.387l1.965-3.404c-0.562-0.322-1.049-0.791-1.395-1.391zM10 14.049c-2.236 0-4.050-1.813-4.050-4.049s1.813-4.049 4.050-4.049 4.049 1.813 4.049 4.049c-0 2.237-1.813 4.049-4.049 4.049z';
				break;

			case 'close':
				svg[0] = '0 0 16 20';
				svg[1] = 'M1.228 14.933q0-0.446 0.312-0.759l3.281-3.281-3.281-3.281q-0.313-0.313-0.313-0.759t0.313-0.759l1.518-1.518q0.313-0.313 0.759-0.313t0.759 0.313l3.281 3.281 3.281-3.281q0.313-0.313 0.759-0.313t0.759 0.313l1.518 1.518q0.313 0.313 0.313 0.759t-0.313 0.759l-3.281 3.281 3.281 3.281q0.313 0.313 0.313 0.759t-0.313 0.759l-1.518 1.518q-0.313 0.313-0.759 0.313t-0.759-0.313l-3.281-3.281-3.281 3.281q-0.313 0.313-0.759 0.313t-0.759-0.313l-1.518-1.518q-0.313-0.313-0.313-0.759z';
				break;

			case 'fullscreen-expand':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502zM8.717 8.393q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257z';
				break;

			case 'fullscreen-collapse':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0.145 16.964q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257zM8.571 9.464v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502z';
				break;
		}

		return svg;
	};

	// Initialize player based on data on page.
	// This sets some variables, but does not modify anything. Safe to call multiple times.
	// Can call again after updating this.media so long as new media element has the same ID.
	AblePlayer.prototype.reinitialize = function () {

		var deferred, promise;

		deferred = new this.defer();
		promise = deferred.promise();

		this.startedPlaying = false;
		// TODO: Move this setting to preferences.
		this.autoScrollTranscript = true;
		//this.autoScrollTranscript = this.getPref(autoScrollTranscript); // (doesn't work)

		// Bootstrap from this.media possibly being an ID or other selector.
		this.$media = $(this.media).first();
		this.media = this.$media[0];

		// Set media type to 'audio' or 'video'; this determines some of the behavior of player creation.
		if (this.$media.is('audio')) {
			this.mediaType = 'audio';
		} else if (this.$media.is('video')) {
			this.mediaType = 'video';
		} else {
			// Able Player was initialized with some element other than <video> or <audio>
			this.provideFallback();
			deferred.reject();
			return promise;
		}

		this.$sources = this.$media.find('source');

		this.player = this.getPlayer();
		if (!this.player) {
			// an error was generated in getPlayer()
			this.provideFallback();
		}

		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.setPlayerSize = function(width, height) {

		// Called again after width and height are known
		if (this.mediaType !== 'audio' && width > 0 && height > 0) {
			this.playerWidth = width;
			this.playerHeight = height;
			this.aspectRatio = height / width;
		}
	};

	// Perform one-time setup for this instance of player; called after player is first initialized.
	AblePlayer.prototype.setupInstance = function () {

		var deferred = new this.defer();
		var promise = deferred.promise();

		if (this.$media.attr('id')) {
			this.mediaId = this.$media.attr('id');
		} else {
			// Ensure the base media element always has an ID.
			this.mediaId = "ableMediaId_" + this.ableIndex;
			this.$media.attr('id', this.mediaId);
		}
		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.setupInstancePlaylist = function() {

		// find a matching playlist and set this.hasPlaylist
		// if there is one, also set this.$playlist, this.playlistIndex, & this.playlistEmbed
		var thisObj = this;

		this.hasPlaylist = false; // will change to true if a matching playlist is found

		$('.able-playlist').each(function() {
			if ($(this).data('player') === thisObj.mediaId) {
				// this is the playlist for the current player
				thisObj.hasPlaylist = true;
				// If using an embedded player, we'll replace $playlist with the clone later.
				thisObj.$playlist = $(this).find('li');

				// check to see if list item has YouTube as its source
				// if it does, inject a thumbnail from YouTube
				var $youTubeVideos = $(this).find('li[data-youtube-id]');
				$youTubeVideos.each(function() {
					var youTubeId = DOMPurify.sanitize( $(this).attr('data-youtube-id') );
					var youTubePoster = thisObj.getYouTubePosterUrl(youTubeId,'120');
					var $youTubeImg = $('<img>',{
						'src': youTubePoster,
						'alt': ''
					});
					$(this).find('button').prepend($youTubeImg);
				});

				// check to see if list item has Vimeo as its source
				// if it does, inject a thumbnail from Vimeo
				var $vimeoVideos = $(this).find('li[data-vimeo-id]');
				$vimeoVideos.each(function() {
					var vimeoId = $(this).attr('data-vimeo-id');
					var vimeoPoster = thisObj.getVimeoPosterUrl(vimeoId,'120');
					var $vimeoImg = $('<img>',{
						'src': vimeoPoster,
						'alt': ''
					});
					$(this).find('button').prepend($vimeoImg);
				});

				// add accessibility to the list markup
				$(this).find('li span').attr('aria-hidden','true');
				thisObj.playlistIndex = 0;
				var dataEmbedded = $(this).data('embedded');
				// is playlist embedded within player?
				thisObj.playlistEmbed = (typeof dataEmbedded !== 'undefined' && dataEmbedded !== false) ? true : false;
			}
		});

		if (this.hasPlaylist && this.loop) {
			// browser will loop the current track in the playlist, rather than the playlist
			// therefore, need to remove loop attribute from media element
			// but keep this.loop as true and handle the playlist looping ourselves
			this.media.removeAttribute('loop');
		}
		if (this.hasPlaylist && this.playlistEmbed) {
			// Copy the playlist out of the dom, so we can reinject when we build the player.
			var parent = this.$playlist.parent();
			this.$playlistDom = parent.clone();
			parent.remove();
		}
		if (this.hasPlaylist && this.$sources.length === 0) {
			// no source elements were provided. Construct them from the first playlist item
			this.cuePlaylistItem(0);
			// redefine this.$sources now that media contains one or more <source> elements
			this.$sources = this.$media.find('source');
		}
	};

	AblePlayer.prototype.recreatePlayer = function () {

		// Creates the appropriate player for the current source.
		// This function is called each time a new media instance is loaded
		// e.g.,
		// User clicks on an item in a playlist
		// User swaps to/from described version of video
		// Blocks of code that only need to be executed once are controlled
		// by this.playerCreated

		// TODO: Ensure when recreating player that we carry over the mediaId
		if (!this.player) {
			return;
		}

		var deferred, promise, thisObj, prefsGroups, i;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		this.playerDeleted = false; // reset after deletePlayer()

		// set temp stopgap to prevent this function from executing again before finished
		this.recreatingPlayer = true;

		if (!this.playerCreated) {
			// only call these functions once
			this.loadCurrentPreferences();
			this.injectPlayerCode();
			this.resizePlayer(this.media.videoWidth,this.media.videoHeight);
		}

		this.getSampleDescriptionText();

		this.initSignLanguage();

		this.initPlayer().then(function() {

			thisObj.getTracks().then(function() {

				thisObj.initDescription().then(function() {

					thisObj.setupTracks().then(function() {
						if (thisObj.hasClosedDesc) {
							if (!thisObj.$descDiv || (thisObj.$descDiv && !($.contains(thisObj.$ableDiv[0], thisObj.$descDiv[0])))) {
								// descDiv either doesn't exist, or exists in an orphaned state
								// Either way, it needs to be rebuilt...
								thisObj.injectTextDescriptionArea();
							}
						}
						thisObj.initSpeech('init');

						thisObj.setupTranscript().then(function() {

							thisObj.initStenoFrame().then(function() {

								if (thisObj.stenoMode && thisObj.$stenoFrame) {
									thisObj.stenoFrameContents = thisObj.$stenoFrame.contents();
								}
								thisObj.getMediaTimes().then(function(mediaTimes) {

									thisObj.duration = mediaTimes['duration'];
									thisObj.elapsed = mediaTimes['elapsed'];

									if (typeof thisObj.volume === 'undefined') {
										thisObj.volume = thisObj.defaultVolume;
									}
									if (thisObj.volume) {
										thisObj.setVolume(thisObj.volume);
									}
									if (thisObj.transcriptType) {
										thisObj.addTranscriptAreaEvents();
										thisObj.updateTranscript();
									}
									if (thisObj.captions.length) {
										thisObj.initDefaultCaption();
									}

									// setMediaAttributes() sets textTrack.mode to 'disabled' for all tracks
									// This tells browsers to ignore the text tracks so Able Player can handle them
									// However, timing is critical as browsers - especially Safari - tend to ignore this request
									// unless it's sent late in the intialization process.
									// If browsers ignore the request, the result is redundant captions
									thisObj.setMediaAttributes();
									thisObj.addControls();
									thisObj.addEventListeners();

									// inject each of the hidden forms that will be accessed from the Preferences popup menu
									prefsGroups = thisObj.getPreferencesGroups();
									for (i = 0; i < prefsGroups.length; i++) {
										thisObj.injectPrefsForm(prefsGroups[i]);
									}
									thisObj.setupPopups();
									thisObj.updateCaption();
									thisObj.injectVTS();
									thisObj.populateChaptersDiv();
									thisObj.showSearchResults();

									// Go ahead and load media, without user requesting it
									// Ideally, we would wait until user clicks play, rather than unnecessarily consume their bandwidth
									// However, the media needs to load for us to get the media's duration
									if (thisObj.player === 'html5') {
										if (!thisObj.loadingMedia) {
											thisObj.$media[0].load();
											thisObj.loadingMedia = true;
										}
									}
									// refreshControls is called twice building/initializing the player
									// this is the second. Best to pause a bit before executing, to be sure all prior steps are complete
									setTimeout(function() {
										thisObj.refreshControls();
										deferred.resolve();
									},100);
								});
							});
						});
					});
				});
			});
		},
		function() {	 // initPlayer fail
			thisObj.provideFallback();
		});
		return promise;
	};

	AblePlayer.prototype.initPlayer = function () {

		var thisObj = this;
		var playerPromise;
		// First run player specific initialization.
		if (this.player === 'html5') {
			playerPromise = this.initHtml5Player();
		} else if (this.player === 'youtube') {
			playerPromise = this.initYouTubePlayer();
		} else if (this.player === 'vimeo') {
			playerPromise = this.initVimeoPlayer();
		}
		// After player specific initialization is done, run remaining general initialization.
		var deferred = new this.defer();
		var promise = deferred.promise();
		playerPromise.then(
			function () { // done/resolved
				if (thisObj.useFixedSeekInterval) {
					// if fixed seekInterval was not already assigned (using value of data-seek-interval)
					if (!thisObj.seekInterval) {
						thisObj.seekInterval = thisObj.defaultSeekInterval;
					}
					thisObj.seekIntervalCalculated = true;
				} else {
					thisObj.setSeekInterval();
				}
				deferred.resolve();
			}
		).finally(function () { // failed
			deferred.reject();
			}
		);

		return promise;
	};

	AblePlayer.prototype.initStenoFrame = function() {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		if (this.stenoMode && this.$stenoFrame) {

			if (this.$stenoFrame[0].contentWindow,document.readyState == 'complete') {
				// iframe has already loaded
				deferred.resolve();
			} else {
				// iframe has not loaded. Wait for it.
				this.$stenoFrame.on('load',function() {
					deferred.resolve();
				});
			}
		} else {
			// there is no stenoFrame to initialize
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.setSeekInterval = function () {

		// this function is only called if this.useFixedSeekInterval is false
		// if this.useChapterTimes, this is called as each new chapter is loaded
		// otherwise, it's called once, as the player is initialized
		var duration;
		this.seekInterval = this.defaultSeekInterval;
		duration = (this.useChapterTimes) ? this.chapterDuration : this.duration;

		if (typeof duration === 'undefined' || duration < 1) {
			// no duration; just use default for now but keep trying until duration is available
			this.seekIntervalCalculated = false;
			return;
		} else {
			if (duration <= 20) {
				this.seekInterval = 5;	 // 4 steps max
			} else if (duration <= 30) {
				this.seekInterval = 6; // 5 steps max
			} else if (duration <= 40) {
				this.seekInterval = 8; // 5 steps max
			} else if (duration <= 100) {
				this.seekInterval = 10; // 10 steps max
			} else {
				// never more than 10 steps from start to end
				this.seekInterval = Math.round(duration / 10, 0);
			}
			this.seekIntervalCalculated = true;
		}
	};

	AblePlayer.prototype.initDefaultCaption = function () {

		var captions, i;

		captions = this.captions;
		if (captions.length > 0) {
			for (i=0; i<captions.length; i++) {
				if (captions[i].def === true) {
					this.captionLang = captions[i].language;
					this.selectedCaptions = captions[i];
				}
			}
			if (typeof this.captionLang === 'undefined') {
				// No caption track was flagged as default
				// find and use a caption language that matches the player language
				for (i=0; i<captions.length; i++) {
					if (captions[i].language === this.lang) {
						this.captionLang = captions[i].language;
						this.selectedCaptions = captions[i];
					}
				}
			}
			if (typeof this.captionLang === 'undefined') {
				// Still no matching caption track
				// just use the first track
				this.captionLang = captions[0].language;
				this.selectedCaptions = captions[0];
			}
			if (typeof this.captionLang !== 'undefined') {
				// reset transcript selected <option> to this.captionLang
				if (this.$transcriptLanguageSelect) {
					this.$transcriptLanguageSelect.find('option[lang=' + this.captionLang + ']').prop('selected',true);
				}
				// sync all other tracks to this same languge
				this.syncTrackLanguages('init',this.captionLang);
			}
			if (this.player === 'vimeo') {
				if (this.usingVimeoCaptions && this.prefCaptions == 1) {
					// initialize Vimeo captions to the default language
					this.vimeoPlayer.enableTextTrack(this.captionLang).catch(function(error) {
						switch (error.name) {
													}
					});
				} else {
					// disable Vimeo captions.
					this.vimeoPlayer.disableTextTrack().then(function() {
						// Vimeo captions disabled
					}).catch(function(error) {
					});
				}
			}
		}
	};

	AblePlayer.prototype.initHtml5Player = function () {
		// Nothing special to do!
		var deferred = new this.defer();
		var promise = deferred.promise();
		deferred.resolve();
		return promise;
	};

	// Sets media/track/source attributes; is called whenever player is recreated since $media may have changed.
	AblePlayer.prototype.setMediaAttributes = function () {
		// Firefox puts videos in tab order; remove.
		this.$media.attr('tabindex', -1);

		// Keep native player from displaying captions/subtitles by setting textTrack.mode='disabled'
		// https://dev.w3.org/html5/spec-author-view/video.html#text-track-mode
		// This *should* work but historically hasn't been supported in all browsers
		// As of July 2025, 96% supported per https://caniuse.com/?search=text-track-mode.
		// Workaround for non-supporting browsers is to remove default attribute
		// We're doing that too in track.js > setupCaptions()
		var textTracks = this.$media.get(0).textTracks;
		if (textTracks) {
			var i = 0;
			while (i < textTracks.length) {
				textTracks[i].mode = 'disabled';
				i += 1;
			}
		}
	};

	AblePlayer.prototype.getPlayer = function() {

		// Determine which player to use, if any
		// return 'html5', 'youtube', 'vimeo', or null
		if (this.testFallback) {
			return null;
		} else if (this.youTubeId) {
			// null if attempting to play a YouTube video using an element other than <video>
			return  (this.mediaType !== 'video') ? null : 'youtube';
		} else if (this.vimeoId) {
			// null if attempting to play a Vimeo video using an element other than <video>
			return (this.mediaType !== 'video') ? null : 'vimeo';
		} else if (this.media.canPlayType) {
			return 'html5';
		} else {
			// Browser does not support the available media file
			return null;
		}
	};
 }

function addLangsFunctions(AblePlayer) {
	// Look up ISO 639-1 language codes to be used as subtitle labels
	// In some instances "name" has been trunctation for readability
	// Sources:
	// http://stackoverflow.com/questions/3217492/list-of-language-codes-in-yaml-or-json/4900304#4900304
	// https://www.venea.net/web/culture_code

	var isoLangs = {
		"ab":{
				"name":"Abkhaz",
				"nativeName":"аҧсуа"
		},
		"aa":{
				"name":"Afar",
				"nativeName":"Afaraf"
		},
		"af":{
				"name":"Afrikaans",
				"nativeName":"Afrikaans"
		},
		"ak":{
				"name":"Akan",
				"nativeName":"Akan"
		},
		"sq":{
				"name":"Albanian",
				"nativeName":"Shqip"
		},
		"am":{
				"name":"Amharic",
				"nativeName":"አማርኛ"
		},
		"ar":{
				"name":"Arabic",
				"nativeName":"العربية"
		},
		"an":{
				"name":"Aragonese",
				"nativeName":"Aragonés"
		},
		"hy":{
				"name":"Armenian",
				"nativeName":"Հայերեն"
		},
		"as":{
				"name":"Assamese",
				"nativeName":"অসমীয়া"
		},
		"av":{
				"name":"Avaric",
				"nativeName":"авар мацӀ, магӀарул мацӀ"
		},
		"ae":{
				"name":"Avestan",
				"nativeName":"avesta"
		},
		"ay":{
				"name":"Aymara",
				"nativeName":"aymar aru"
		},
		"az":{
				"name":"Azerbaijani",
				"nativeName":"azərbaycan dili"
		},
		"bm":{
				"name":"Bambara",
				"nativeName":"bamanankan"
		},
		"ba":{
				"name":"Bashkir",
				"nativeName":"башҡорт теле"
		},
		"eu":{
				"name":"Basque",
				"nativeName":"euskara, euskera"
		},
		"be":{
				"name":"Belarusian",
				"nativeName":"Беларуская"
		},
		"bn":{
				"name":"Bengali",
				"nativeName":"বাংলা"
		},
		"bh":{
				"name":"Bihari",
				"nativeName":"भोजपुरी"
		},
		"bi":{
				"name":"Bislama",
				"nativeName":"Bislama"
		},
		"bs":{
				"name":"Bosnian",
				"nativeName":"bosanski jezik"
		},
		"br":{
				"name":"Breton",
				"nativeName":"brezhoneg"
		},
		"bg":{
				"name":"Bulgarian",
				"nativeName":"български език"
		},
		"my":{
				"name":"Burmese",
				"nativeName":"ဗမာစာ"
		},
		"ca":{
				"name":"Catalan",
				"nativeName":"Català"
		},
		"ch":{
				"name":"Chamorro",
				"nativeName":"Chamoru"
		},
		"ce":{
				"name":"Chechen",
				"nativeName":"нохчийн мотт"
		},
		"ny":{
				"name":"Chichewa",
				"nativeName":"chiCheŵa, chinyanja"
		},
		"zh":{
				"name":"Chinese",
				"nativeName":"中文 (Zhōngwén), 汉语, 漢語"
		},
		"cv":{
				"name":"Chuvash",
				"nativeName":"чӑваш чӗлхи"
		},
		"kw":{
				"name":"Cornish",
				"nativeName":"Kernewek"
		},
		"co":{
				"name":"Corsican",
				"nativeName":"corsu, lingua corsa"
		},
		"cr":{
				"name":"Cree",
				"nativeName":"ᓀᐦᐃᔭᐍᐏᐣ"
		},
		"hr":{
				"name":"Croatian",
				"nativeName":"hrvatski"
		},
		"cs":{
				"name":"Czech",
				"nativeName":"česky, čeština"
		},
		"da":{
				"name":"Danish",
				"nativeName":"dansk"
		},
		"dv":{
				"name":"Divehi",
				"nativeName":"ދިވެހި"
		},
		"nl":{
				"name":"Dutch",
				"nativeName":"Nederlands, Vlaams"
		},
		"en":{
				"name":"English",
				"nativeName":"English"
		},
		"eo":{
				"name":"Esperanto",
				"nativeName":"Esperanto"
		},
		"et":{
				"name":"Estonian",
				"nativeName":"eesti, eesti keel"
		},
		"ee":{
				"name":"Ewe",
				"nativeName":"Eʋegbe"
		},
		"fo":{
				"name":"Faroese",
				"nativeName":"føroyskt"
		},
		"fj":{
				"name":"Fijian",
				"nativeName":"vosa Vakaviti"
		},
		"fi":{
				"name":"Finnish",
				"nativeName":"suomi, suomen kieli"
		},
		"fr":{
				"name":"French",
				"nativeName":"français, langue française"
		},
		"ff":{
				"name":"Fula",
				"nativeName":"Fulfulde, Pulaar, Pular"
		},
		"gl":{
				"name":"Galician",
				"nativeName":"Galego"
		},
		"ka":{
				"name":"Georgian",
				"nativeName":"ქართული"
		},
		"de":{
				"name":"German",
				"nativeName":"Deutsch"
		},
		"el":{
				"name":"Greek",
				"nativeName":"Ελληνικά"
		},
		"gn":{
				"name":"Guaraní",
				"nativeName":"Avañeẽ"
		},
		"gu":{
				"name":"Gujarati",
				"nativeName":"ગુજરાતી"
		},
		"ht":{
				"name":"Haitian",
				"nativeName":"Kreyòl ayisyen"
		},
		"ha":{
				"name":"Hausa",
				"nativeName":"Hausa, هَوُسَ"
		},
		"he":{
				"name":"Hebrew",
				"nativeName":"עברית"
		},
		"hz":{
				"name":"Herero",
				"nativeName":"Otjiherero"
		},
		"hi":{
				"name":"Hindi",
				"nativeName":"हिन्दी, हिंदी"
		},
		"ho":{
				"name":"Hiri Motu",
				"nativeName":"Hiri Motu"
		},
		"hu":{
				"name":"Hungarian",
				"nativeName":"Magyar"
		},
		"ia":{
				"name":"Interlingua",
				"nativeName":"Interlingua"
		},
		"id":{
				"name":"Indonesian",
				"nativeName":"Bahasa Indonesia"
		},
		"ie":{
				"name":"Interlingue",
				"nativeName":"Originally called Occidental; then Interlingue after WWII"
		},
		"ga":{
				"name":"Irish",
				"nativeName":"Gaeilge"
		},
		"ig":{
				"name":"Igbo",
				"nativeName":"Asụsụ Igbo"
		},
		"ik":{
				"name":"Inupiaq",
				"nativeName":"Iñupiaq, Iñupiatun"
		},
		"io":{
				"name":"Ido",
				"nativeName":"Ido"
		},
		"is":{
				"name":"Icelandic",
				"nativeName":"Íslenska"
		},
		"it":{
				"name":"Italian",
				"nativeName":"Italiano"
		},
		"iu":{
				"name":"Inuktitut",
				"nativeName":"ᐃᓄᒃᑎᑐᑦ"
		},
		"ja":{
				"name":"Japanese",
				"nativeName":"日本語 (にほんご／にっぽんご)"
		},
		"jv":{
				"name":"Javanese",
				"nativeName":"basa Jawa"
		},
		"kl":{
				"name":"Kalaallisut",
				"nativeName":"kalaallisut, kalaallit oqaasii"
		},
		"kn":{
				"name":"Kannada",
				"nativeName":"ಕನ್ನಡ"
		},
		"kr":{
				"name":"Kanuri",
				"nativeName":"Kanuri"
		},
		"ks":{
				"name":"Kashmiri",
				"nativeName":"कश्मीरी, كشميري‎"
		},
		"kk":{
				"name":"Kazakh",
				"nativeName":"Қазақ тілі"
		},
		"km":{
				"name":"Khmer",
				"nativeName":"ភាសាខ្មែរ"
		},
		"ki":{
				"name":"Kikuyu",
				"nativeName":"Gĩkũyũ"
		},
		"rw":{
				"name":"Kinyarwanda",
				"nativeName":"Ikinyarwanda"
		},
		"ky":{
				"name":"Kyrgyz",
				"nativeName":"кыргыз тили"
		},
		"kv":{
				"name":"Komi",
				"nativeName":"коми кыв"
		},
		"kg":{
				"name":"Kongo",
				"nativeName":"KiKongo"
		},
		"ko":{
				"name":"Korean",
				"nativeName":"한국어 (韓國語), 조선말 (朝鮮語)"
		},
		"ku":{
				"name":"Kurdish",
				"nativeName":"Kurdî, كوردی‎"
		},
		"kj":{
				"name":"Kuanyama",
				"nativeName":"Kuanyama"
		},
		"la":{
				"name":"Latin",
				"nativeName":"latine, lingua latina"
		},
		"lb":{
				"name":"Luxembourgish",
				"nativeName":"Lëtzebuergesch"
		},
		"lg":{
				"name":"Luganda",
				"nativeName":"Luganda"
		},
		"li":{
				"name":"Limburgish",
				"nativeName":"Limburgs"
		},
		"ln":{
				"name":"Lingala",
				"nativeName":"Lingála"
		},
		"lo":{
				"name":"Lao",
				"nativeName":"ພາສາລາວ"
		},
		"lt":{
				"name":"Lithuanian",
				"nativeName":"lietuvių kalba"
		},
		"lu":{
				"name":"Luba-Katanga",
				"nativeName":""
		},
		"lv":{
				"name":"Latvian",
				"nativeName":"latviešu valoda"
		},
		"gv":{
				"name":"Manx",
				"nativeName":"Gaelg, Gailck"
		},
		"mk":{
				"name":"Macedonian",
				"nativeName":"македонски јазик"
		},
		"mg":{
				"name":"Malagasy",
				"nativeName":"Malagasy fiteny"
		},
		"ms":{
				"name":"Malay",
				"nativeName":"bahasa Melayu, بهاس ملايو‎"
		},
		"ml":{
				"name":"Malayalam",
				"nativeName":"മലയാളം"
		},
		"mt":{
				"name":"Maltese",
				"nativeName":"Malti"
		},
		"mi":{
				"name":"Māori",
				"nativeName":"te reo Māori"
		},
		"mr":{
				"name":"Marathi",
				"nativeName":"मराठी"
		},
		"mh":{
				"name":"Marshallese",
				"nativeName":"Kajin M̧ajeļ"
		},
		"mn":{
				"name":"Mongolian",
				"nativeName":"монгол"
		},
		"na":{
				"name":"Nauru",
				"nativeName":"Ekakairũ Naoero"
		},
		"nv":{
				"name":"Navajo",
				"nativeName":"Diné bizaad, Dinékʼehǰí"
		},
		"nb":{
				"name":"Norwegian Bokmål",
				"nativeName":"Norsk bokmål"
		},
		"nd":{
				"name":"North Ndebele",
				"nativeName":"isiNdebele"
		},
		"ne":{
				"name":"Nepali",
				"nativeName":"नेपाली"
		},
		"ng":{
				"name":"Ndonga",
				"nativeName":"Owambo"
		},
		"nn":{
				"name":"Norwegian Nynorsk",
				"nativeName":"Norsk nynorsk"
		},
		"no":{
				"name":"Norwegian",
				"nativeName":"Norsk"
		},
		"ii":{
				"name":"Nuosu",
				"nativeName":"ꆈꌠ꒿ Nuosuhxop"
		},
		"nr":{
				"name":"South Ndebele",
				"nativeName":"isiNdebele"
		},
		"oc":{
				"name":"Occitan",
				"nativeName":"Occitan"
		},
		"oj":{
				"name":"Ojibwe",
				"nativeName":"ᐊᓂᔑᓈᐯᒧᐎᓐ"
		},
		"cu":{
				"name":"Church Slavonic",
				"nativeName":"ѩзыкъ словѣньскъ"
		},
		"om":{
				"name":"Oromo",
				"nativeName":"Afaan Oromoo"
		},
		"or":{
				"name":"Oriya",
				"nativeName":"ଓଡ଼ିଆ"
		},
		"os":{
				"name":"Ossetian",
				"nativeName":"ирон æвзаг"
		},
		"pa":{
				"name":"Punjabi",
				"nativeName":"ਪੰਜਾਬੀ, پنجابی‎"
		},
		"pi":{
				"name":"Pāli",
				"nativeName":"पाऴि"
		},
		"fa":{
				"name":"Persian",
				"nativeName":"فارسی"
		},
		"pl":{
				"name":"Polish",
				"nativeName":"polski"
		},
		"ps":{
				"name":"Pashto",
				"nativeName":"پښتو"
		},
		"pt":{
				"name":"Portuguese",
				"nativeName":"Português"
		},
		"qu":{
				"name":"Quechua",
				"nativeName":"Runa Simi, Kichwa"
		},
		"rm":{
				"name":"Romansh",
				"nativeName":"rumantsch grischun"
		},
		"rn":{
				"name":"Kirundi",
				"nativeName":"kiRundi"
		},
		"ro":{
				"name":"Romanian",
				"nativeName":"română"
		},
		"ru":{
				"name":"Russian",
				"nativeName":"русский язык"
		},
		"sa":{
				"name":"Sanskrit",
				"nativeName":"संस्कृतम्"
		},
		"sc":{
				"name":"Sardinian",
				"nativeName":"sardu"
		},
		"sd":{
				"name":"Sindhi",
				"nativeName":"सिन्धी, سنڌي، سندھی‎"
		},
		"se":{
				"name":"Northern Sami",
				"nativeName":"Davvisámegiella"
		},
		"sm":{
				"name":"Samoan",
				"nativeName":"gagana faa Samoa"
		},
		"sg":{
				"name":"Sango",
				"nativeName":"yângâ tî sängö"
		},
		"sr":{
				"name":"Serbian",
				"nativeName":"српски језик"
		},
		"gd":{
				"name":"Gaelic",
				"nativeName":"Gàidhlig"
		},
		"sn":{
				"name":"Shona",
				"nativeName":"chiShona"
		},
		"si":{
				"name":"Sinhalese",
				"nativeName":"සිංහල"
		},
		"sk":{
				"name":"Slovak",
				"nativeName":"slovenčina"
		},
		"sl":{
				"name":"Slovene",
				"nativeName":"slovenščina"
		},
		"so":{
				"name":"Somali",
				"nativeName":"Soomaaliga, af Soomaali"
		},
		"st":{
				"name":"Southern Sotho",
				"nativeName":"Sesotho"
		},
		"es":{
				"name":"Spanish",
				"nativeName":"español, castellano"
		},
		"su":{
				"name":"Sundanese",
				"nativeName":"Basa Sunda"
		},
		"sw":{
				"name":"Swahili",
				"nativeName":"Kiswahili"
		},
		"ss":{
				"name":"Swati",
				"nativeName":"SiSwati"
		},
		"sv":{
				"name":"Swedish",
				"nativeName":"svenska"
		},
		"ta":{
				"name":"Tamil",
				"nativeName":"தமிழ்"
		},
		"te":{
				"name":"Telugu",
				"nativeName":"తెలుగు"
		},
		"tg":{
				"name":"Tajik",
				"nativeName":"тоҷикӣ, toğikī, تاجیکی‎"
		},
		"th":{
				"name":"Thai",
				"nativeName":"ไทย"
		},
		"ti":{
				"name":"Tigrinya",
				"nativeName":"ትግርኛ"
		},
		"bo":{
				"name":"Tibetan",
				"nativeName":"བོད་ཡིག"
		},
		"tk":{
				"name":"Turkmen",
				"nativeName":"Türkmen, Түркмен"
		},
		"tl":{
				"name":"Tagalog",
				"nativeName":"Wikang Tagalog, ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔"
		},
		"tn":{
				"name":"Tswana",
				"nativeName":"Setswana"
		},
		"to":{
				"name":"Tonga",
				"nativeName":"faka Tonga"
		},
		"tr":{
				"name":"Turkish",
				"nativeName":"Türkçe"
		},
		"ts":{
				"name":"Tsonga",
				"nativeName":"Xitsonga"
		},
		"tt":{
				"name":"Tatar",
				"nativeName":"татарча, tatarça, تاتارچا‎"
		},
		"tw":{
				"name":"Twi",
				"nativeName":"Twi"
		},
		"ty":{
				"name":"Tahitian",
				"nativeName":"Reo Tahiti"
		},
		"ug":{
				"name":"Uyghur",
				"nativeName":"Uyƣurqə, ئۇيغۇرچە‎"
		},
		"uk":{
				"name":"Ukrainian",
				"nativeName":"українська"
		},
		"ur":{
				"name":"Urdu",
				"nativeName":"اردو"
		},
		"uz":{
				"name":"Uzbek",
				"nativeName":"zbek, Ўзбек, أۇزبېك‎"
		},
		"ve":{
				"name":"Venda",
				"nativeName":"Tshivenḓa"
		},
		"vi":{
				"name":"Vietnamese",
				"nativeName":"Tiếng Việt"
		},
		"vo":{
				"name":"Volapük",
				"nativeName":"Volapük"
		},
		"wa":{
				"name":"Walloon",
				"nativeName":"Walon"
		},
		"cy":{
				"name":"Welsh",
				"nativeName":"Cymraeg"
		},
		"wo":{
				"name":"Wolof",
				"nativeName":"Wollof"
		},
		"fy":{
				"name":"Western Frisian",
				"nativeName":"Frysk"
		},
		"xh":{
				"name":"Xhosa",
				"nativeName":"isiXhosa"
		},
		"yi":{
				"name":"Yiddish",
				"nativeName":"ייִדיש"
		},
		"yo":{
				"name":"Yoruba",
				"nativeName":"Yorùbá"
		},
		"za":{
				"name":"Zhuang",
				"nativeName":"Saɯ cueŋƅ, Saw cuengh"
		},
		"ar-dz":{
				"name":"Arabic (Algeria)",
				"nativeName":"العربية (الجزائر)"
		},
		"ar-bh":{
				"name":"Arabic (Bahrain)",
				"nativeName":"العربية (البحرين)"
		},
		"ar-eg":{
				"name":"Arabic (Egypt)",
				"nativeName":"العربية (مصر)"
		},
		"ar-iq":{
				"name":"Arabic (Iraq)",
				"nativeName":"العربية (العراق)"
		},
		"ar-jo":{
				"name":"Arabic (Jordan)",
				"nativeName":"العربية (الأردن)"
		},
		"ar-kw":{
				"name":"Arabic (Kuwait)",
				"nativeName":"العربية (الكويت)"
		},
		"ar-lb":{
				"name":"Arabic (Lebanon)",
				"nativeName":"العربية (لبنان)"
		},
		"ar-ly":{
				"name":"Arabic (Libya)",
				"nativeName":"العربية (ليبيا)"
		},
		"ar-ma":{
				"name":"Arabic (Morocco)",
				"nativeName":"العربية (المملكة المغربية)"
		},
		"ar-om":{
				"name":"Arabic (Oman)",
				"nativeName":"العربية (عمان)"
		},
		"ar-qa":{
				"name":"Arabic (Qatar)",
				"nativeName":"العربية (قطر)"
		},
		"ar-sa":{
				"name":"Arabic (Saudi Arabia)",
				"nativeName":"العربية (المملكة العربية السعودية)"
		},
		"ar-sy":{
				"name":"Arabic (Syria)",
				"nativeName":"العربية (سوريا)"
		},
		"ar-tn":{
				"name":"Arabic (Tunisia)",
				"nativeName":"العربية (تونس)"
		},
		"ar-ae":{
				"name":"Arabic (U.A.E.)",
				"nativeName":"العربية (الإمارات العربية المتحدة)"
		},
		"ar-ye":{
				"name":"Arabic (Yemen)",
				"nativeName":"العربية (اليمن)"
		},
		"de-at":{
				"name":"German (Austria)",
				"nativeName":"Deutsch (Österreich)"
		},
		"de-li":{
				"name":"German (Liechtenstein)",
				"nativeName":"Deutsch (Liechtenstein)"
		},
		"de-lu":{
				"name":"German (Luxembourg)",
				"nativeName":"Deutsch (Luxemburg)"
		},
		"de-ch":{
				"name":"German (Switzerland)",
				"nativeName":"Deutsch (Schweiz)"
		},
		"en-au":{
				"name":"English (Australia)",
				"nativeName":"English (Australia)"
		},
		"en-bz":{
				"name":"English (Belize)",
				"nativeName":"English (Belize)"
		},
		"en-ca":{
				"name":"English (Canada)",
				"nativeName":"English (Canada)"
		},
		"en-ie":{
				"name":"English (Ireland)",
				"nativeName":"English (Ireland)"
		},
		"en-jm":{
				"name":"English (Jamaica)",
				"nativeName":"English (Jamaica)"
		},
		"en-nz":{
				"name":"English (New Zealand)",
				"nativeName":""
		},
		"en-za":{
				"name":"English (South Africa)",
				"nativeName":"English (South Africa)"
		},
		"en-tt":{
				"name":"English (Trinidad)",
				"nativeName":"English (Trinidad y Tobago)"
		},
		"en-gb":{
				"name":"English (United Kingdom)",
				"nativeName":"English (United Kingdom)"
		},
		"en-us":{
				"name":"English (United States)",
				"nativeName":"English (United States)"
		},
		"es-ar":{
				"name":"Spanish (Argentina)",
				"nativeName":"Español (Argentina)"
		},
		"es-bo":{
				"name":"Spanish (Bolivia)",
				"nativeName":"Español (Bolivia)"
		},
		"es-cl":{
				"name":"Spanish (Chile)",
				"nativeName":"Español (Chile)"
		},
		"es-co":{
				"name":"Spanish (Colombia)",
				"nativeName":"Español (Colombia)"
		},
		"es-cr":{
				"name":"Spanish (Costa Rica)",
				"nativeName":"Español (Costa Rica)"
		},
		"es-do":{
				"name":"Spanish (Dominican Republic)",
				"nativeName":"Español (República Dominicana)"
		},
		"es-ec":{
				"name":"Spanish (Ecuador)",
				"nativeName":"Español (Ecuador)"
		},
		"es-sv":{
				"name":"Spanish (El Salvador)",
				"nativeName":"Español (El Salvador)"
		},
		"es-gt":{
				"name":"Spanish (Guatemala)",
				"nativeName":"Español (Guatemala)"
		},
		"es-hn":{
				"name":"Spanish (Honduras)",
				"nativeName":"Español (Honduras)"
		},
		"es-mx":{
				"name":"Spanish (Mexico)",
				"nativeName":"Español (México)"
		},
		"es-ni":{
				"name":"Spanish (Nicaragua)",
				"nativeName":"Español (Nicaragua)"
		},
		"es-pa":{
				"name":"Spanish (Panama)",
				"nativeName":"Español (Panamá)"
		},
		"es-py":{
				"name":"Spanish (Paraguay)",
				"nativeName":"Español (Paraguay)"
		},
		"es-pe":{
				"name":"Spanish (Peru)",
				"nativeName":"Español (Perú)"
		},
		"es-pr":{
				"name":"Spanish (Puerto Rico)",
				"nativeName":"Español (Puerto Rico)"
		},
		"es-uy":{
				"name":"Spanish (Uruguay)",
				"nativeName":"Español (Uruguay)"
		},
		"es-ve":{
				"name":"Spanish (Venezuela)",
				"nativeName":"Español (Venezuela)"
		},
		"fr-be":{
				"name":"French (Belgium)",
				"nativeName":"français (Belgique)"
		},
		"fr-ca":{
				"name":"French (Canada)",
				"nativeName":"français (Canada)"
		},
		"fr-lu":{
				"name":"French (Luxembourg)",
				"nativeName":"français (Luxembourg)"
		},
		"fr-ch":{
				"name":"French (Switzerland)",
				"nativeName":"français (Suisse)"
		},
		"it-ch":{
				"name":"Italian (Switzerland)",
				"nativeName":"italiano (Svizzera)"
		},
		"nl-be":{
				"name":"Dutch (Belgium)",
				"nativeName":"Nederlands (België)"
		},
		"pt-br":{
				"name":"Portuguese (Brazil)",
				"nativeName":"Português (Brasil)"
		},
		"sv-fi":{
				"name":"Swedish (Finland)",
				"nativeName":"svenska (Finland)"
		},
		"zh-hk":{
				"name":"Chinese (Hong Kong)",
				"nativeName":"中文(香港特别行政區)"
		},
		"zh-cn":{
				"name":"Chinese (PRC)",
				"nativeName":"中文(中华人民共和国)"
		},
		"zh-sg":{
				"name":"Chinese (Singapore)",
				"nativeName":"中文(新加坡)"
		},
		"zh-tw":{
				"name":"Chinese Traditional (Taiwan)",
				"nativeName":"中文（台灣）"
		}
	};

	AblePlayer.prototype.getLanguageName = function (key,whichName) {

		// return language name associated with lang code "key"
		// whichName is either "English" or "local" (i.e., native name)

		var lang, code, subTag;
		lang = isoLangs[key.toLowerCase()];
		if (lang) {
			return (whichName === 'local') ? lang.nativeName : lang.name;
		} else if (key.includes('-')) {
			code = key.substring(0,2);
			subTag = key.substring(3);
			lang = isoLangs[code.toLowerCase()];
			if (lang) {
				return (whichName === 'local') ? lang.nativeName + ' (' + subTag + ')' : lang.name + ' (' + subTag + ')';
			}
		}
		// if all else has failed, use the key as the label
		return key;
	};

}

function addMetadataFunctions(AblePlayer) {
  AblePlayer.prototype.updateMeta = function (time) {
    if (this.hasMeta) {
      if (this.metaType === "text") {
        this.$metaDiv.show();
        this.showMeta(time || this.elapsed);
      } else {
        this.showMeta(time || this.elapsed);
      }
    }
  };

  AblePlayer.prototype.showMeta = function (now) {
    var tempSelectors,
      m,
      thisMeta,
      cues,
      cueText,
      cueLines,
      i,
      line,
      showDuration,
      focusTarget;

    tempSelectors = [];
    if (this.meta.length >= 1) {
      cues = this.meta;
    } else {
      cues = [];
    }
    for (m = 0; m < cues.length; m++) {
      if (cues[m].start <= now && cues[m].end > now) {
        thisMeta = m;
        break;
      }
    }
    if (typeof thisMeta !== "undefined") {
      if (this.currentMeta !== thisMeta) {
        if (this.metaType === "text") {
          // it's time to load the new metadata cue into the container div
          this.$metaDiv.html(
            this.flattenCueForMeta(cues[thisMeta]).replace(/\n/g, "<br>")
          );
        } else if (this.metaType === "selector") {
          // it's time to show content referenced by the designated selector(s)
          cueText = this.flattenCueForMeta(cues[thisMeta]);
          cueLines = cueText.split("\n");
          for (i = 0; i < cueLines.length; i++) {
            line = cueLines[i].trim();
            if (line.toLowerCase().trim() === "pause") {
              // don't show big play button when pausing via metadata
              this.hideBigPlayButton = true;
              this.pauseMedia();
            } else if (line.toLowerCase().substring(0, 6) == "focus:") {
              focusTarget = line.substring(6).trim();
              if ($(focusTarget).length) {
                $(focusTarget).trigger('focus');
              }
            } else {
              if ($(line).length) {
                // selector exists
                this.currentMeta = thisMeta;
                showDuration = parseInt($(line).attr("data-duration"));
                if (
                  typeof showDuration !== "undefined" &&
                  !isNaN(showDuration)
                ) {
					$(line).show();
					const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
					delay(showDuration).then(() => {
						$(line).hide();
					});
                } else {
                  // no duration specified. Just show the element until end time specified in VTT file
                  $(line).show();
                }
                // add to array of visible selectors so it can be hidden at end time
                this.visibleSelectors.push(line);
                tempSelectors.push(line);
              }
            }
          }
          // now step through this.visibleSelectors and remove anything that's stale
          if (this.visibleSelectors && this.visibleSelectors.length) {
            if (this.visibleSelectors.length !== tempSelectors.length) {
              for (i = this.visibleSelectors.length - 1; i >= 0; i--) {
                if ($.inArray(this.visibleSelectors[i], tempSelectors) == -1) {
                  $(this.visibleSelectors[i]).hide();
                  this.visibleSelectors.splice(i, 1);
                }
              }
            }
          }
        }
      }
    } else {
      // there is currently no metadata. Empty stale content
      if (typeof this.$metaDiv !== "undefined") {
        this.$metaDiv.html("");
      }
      if (this.visibleSelectors && this.visibleSelectors.length) {
        for (i = 0; i < this.visibleSelectors.length; i++) {
          $(this.visibleSelectors[i]).hide();
        }
        // reset array
        this.visibleSelectors = [];
      }
      this.currentMeta = -1;
    }
  };

  // Takes a cue and returns the metadata text to display for it.
  AblePlayer.prototype.flattenCueForMeta = function (cue) {
    var result = [];

    var flattenComponent = function (component) {
      var result = [],
        ii;
      if (component.type === "string") {
        result.push(component.value);
      } else if (component.type === "v") {
        result.push("[" + component.value + "]");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      } else {
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join("");
    };

    for (var ii = 0; ii < cue.components.children.length; ii++) {
      result.push(flattenComponent(cue.components.children[ii]));
    }

    return result.join("");
  };
}

function addMiscFunctions(AblePlayer) {
  AblePlayer.prototype.getNextHeadingLevel = function ($element) {
    // Finds the nearest heading in the ancestor tree
    // Loops over each parent of the current element until a heading is found
    // If multiple headings are found beneath a given parent, get the closest
    // Returns an integer (1-6) representing the next available heading level

    var $parents, $foundHeadings, numHeadings, headingType, headingNumber;

    $parents = $element.parents();
    $parents.each(function () {
      $foundHeadings = $(this).children(":header");
      numHeadings = $foundHeadings.length;
      if (numHeadings) {
        headingType = $foundHeadings.eq(numHeadings - 1).prop("tagName");
        return false;
      }
    });
    if (typeof headingType === "undefined") {
      // page has no headings
      headingNumber = 1;
    } else {
      // Increment closest heading by one if less than 6.
      headingNumber = parseInt(headingType[1]);
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
    }
    return headingNumber;
  };

  AblePlayer.prototype.countProperties = function (obj) {
    // returns the number of properties in an object
    var count, prop;
    count = 0;
    for (prop in obj) {
      if (Object.hasOwn(obj, prop)) {
        ++count;
      }
    }
    return count;
  };

  AblePlayer.prototype.formatSecondsAsColonTime = function (
    seconds,
    showFullTime
  ) {
    // Takes seconds and converts to string of form hh:mm:ss
    // If showFullTime is true, shows 00 for hours if time is less than an hour
    //	 and show milliseconds	(e.g., 00:00:04.123 as in Video Track Sorter)
    // Otherwise, omits empty hours and milliseconds (e.g., 00:04 as in timer on controller)

    var times,format,parts,milliSeconds,numShort,i;

    if (showFullTime) {
      // preserve milliseconds, if included in seconds
      parts = seconds.toString().split(".");
      if (parts.length === 2) {
        milliSeconds = parts[1];
        if (milliSeconds.length < 3) {
          numShort = 3 - milliSeconds.length;
          for (i = 1; i <= numShort; i++) {
            milliSeconds += "0";
          }
        }
      } else {
        milliSeconds = "000";
      }
    }
	times = this.secondsToTime( seconds );
	format = times['value'];

	return (showFullTime) ? format + '.' + milliSeconds : format;
  };

  AblePlayer.prototype.getSecondsFromColonTime = function (timeStr) {
    // Converts string of form hh:mm:ss to seconds
    var timeParts, hours, minutes, seconds;

    timeParts = timeStr.split(":");
    if (timeParts.length === 3) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = parseFloat(timeParts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (timeParts.length === 2) {
      minutes = parseInt(timeParts[0]);
      seconds = parseFloat(timeParts[1]);
      return minutes * 60 + seconds;
    } else if (timeParts.length === 1) {
      seconds = parseFloat(timeParts[0]);
      return seconds;
    }
  };

  AblePlayer.prototype.capitalizeFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  AblePlayer.prototype.roundDown = function (value, decimals) {
    // round value down to the nearest X decimal points
    // where X is the value of the decimals parameter
    return Number(Math.floor(value + "e" + decimals) + "e-" + decimals);
  };

  AblePlayer.prototype.defer = function() {
	const self = this;
	const promise = new Promise((resolve, reject) => {
		self.resolve = resolve;
		self.reject = reject;
		self.promise = () => promise;
	});
  };

  AblePlayer.prototype.getScript = function( source, callback ) {
	var script   = document.createElement('script');
	var prior    = document.getElementsByTagName('script')[0];
	script.async = 1;

	script.onload = script.onreadystatechange = function( _, isAbort ) {
		if ( isAbort || !script.readyState || /loaded|complete/.test(script.readyState) ) {
			script.onload = script.onreadystatechange = null;
			script        = undefined;

			if ( !isAbort && callback ) {
				setTimeout(callback, 0);
			}
		}
	};

	script.src = source;
	prior.parentNode.insertBefore(script, prior);
  };

  AblePlayer.prototype.hasAttr = function (object, attribute) {
    // surprisingly, there is no hasAttr() function in Jquery as of 3.2.1
    // return true if object has attribute; otherwise false
    // selector is a Jquery object
    // attribute is a string

    var attr = object.attr(attribute);

    // For some browsers, `attr` is undefined; for others,
    // `attr` is false.	 Check for both.
    if (typeof attr !== typeof undefined && attr !== false) {
      return true;
    } else {
      return false;
    }
  };

}

/*  global Cookies */

 function addPreferenceFunctions(AblePlayer) {
	AblePlayer.prototype.setPrefs = function(preferences) {
		if ( typeof Cookies !== 'undefined' ) {
			Cookies.set('Able-Player', JSON.stringify(preferences), {
				expires: 90,
				sameSite: 'strict'
			});
		} else {
			localStorage.setItem( 'Able-Player', JSON.stringify( preferences ) );
		}
	};

	AblePlayer.prototype.getPref = function() {

		var defaultPrefs = {
			preferences: {},
			sign: {},
			transcript: {},
			voices: []
		};

		var preferences;
		try {
			if ( typeof Cookies !== 'undefined' ) {
				preferences = JSON.parse( Cookies.get('Able-Player') );
			} else {
				preferences = JSON.parse( localStorage.getItem('Able-Player') );
			}
		}
		catch (err) {
			// Original preferences can't be parsed; update to default
			this.setPrefs( defaultPrefs );
			preferences = defaultPrefs;
		}
		return (preferences) ? preferences : defaultPrefs;
	};

	AblePlayer.prototype.updatePreferences = function( setting ) {
		// useful for settings updated independently of Preferences dialog
		// e.g., prefAutoScrollTranscript, which is updated in control.js > handleTranscriptLockToggle()
		// setting is any supported preference name (e.g., "prefCaptions")
		// OR 'transcript' or 'sign' (not user-defined preferences, used to save position of draggable windows)
		var preferences, $window, windowPos, available, i, prefName, voiceLangFound, newVoice;
		preferences = this.getPref();
		if (setting === 'transcript' || setting === 'sign') {
			if (setting === 'transcript') {
				$window = this.$transcriptArea;
				windowPos = $window.position();
				if (typeof preferences.transcript === 'undefined') {
					preferences.transcript = {};
				}
				preferences.transcript['position'] = $window.css('position'); // either 'relative' or 'absolute'
				preferences.transcript['zindex'] = $window.css('z-index');
				preferences.transcript['top'] = windowPos.top;
				preferences.transcript['left'] = windowPos.left;
				preferences.transcript['width'] = $window.width();
				preferences.transcript['height'] = $window.height();
			} else if (setting === 'sign') {
				$window = this.$signWindow;
				windowPos = $window.position();
				if (typeof preferences.sign === 'undefined') {
					preferences.sign = {};
				}
				preferences.sign['position'] = $window.css('position'); // either 'relative' or 'absolute'
				preferences.sign['zindex'] = $window.css('z-index');
				preferences.sign['top'] = windowPos.top;
				preferences.sign['left'] = windowPos.left;
				preferences.sign['width'] = $window.width();
				preferences.sign['height'] = $window.height();
			}
		} else if (setting === 'voice') {
			if (typeof preferences.voices === 'undefined') {
				preferences.voices = [];
			}
			// replace preferred voice for this lang in preferences.voices array, if one exists
			// otherwise, add it to the array
			voiceLangFound = false;
			for (var v=0; v < preferences.voices.length; v++) {
				if (preferences.voices[v].lang === this.prefDescVoiceLang) {
					voiceLangFound = true;
					preferences.voices[v].name = this.prefDescVoice;
				}
			}
			if (!voiceLangFound) {
				// no voice has been saved yet for this language. Add it to array.
				newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
				preferences.voices.push(newVoice);
			}
		} else {
			available = this.getAvailablePreferences();
			// Rebuild preferences with current preferences values,
			// replacing the one value that's been changed
			for (i = 0; i < available.length; i++) {
				prefName = available[i]['name'];
				if (prefName == setting) {
					// this is the one that requires an update
					preferences.preferences[prefName] = this[prefName];
				}
			}
		}
		// Save updated preferences
		this.setPrefs(preferences);
	};

	AblePlayer.prototype.getPreferencesGroups = function() {

		// return array of groups in the order in which they will appear
		// in the Preferences popup menu
		// Human-readable label for each group is defined in translation table
		if (this.usingYouTubeCaptions) {
			// no transcript is possible
			return ['captions','descriptions','keyboard'];
		} else if (this.usingVimeoCaptions) {
			// users cannot control caption appearance
			// and no transcript is possible
			return ['descriptions','keyboard'];
		} else {
			return ['captions','descriptions','keyboard','transcript'];
		}
	};

	AblePlayer.prototype.getAvailablePreferences = function() {

		// Return the list of currently available preferences.
		// Preferences with no 'label' are set within player, not shown in Prefs dialog
		var prefs = [];

		// Modifier keys preferences
		prefs.push({
			'name': 'prefAltKey', // use alt key with shortcuts
			'label': this.translate( 'prefAltKey', 'Alt' ),
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefCtrlKey', // use ctrl key with shortcuts
			'label': this.translate( 'prefCtrlKey', 'Control' ),
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefShiftKey',
			'label': this.translate( 'prefShiftKey', 'Shift' ),
			'group': 'keyboard',
			'default': 0
		});
		prefs.push({
			'name': 'prefNoKeyShortcuts',
			'label': this.translate( 'prefNoKeyShortcuts', 'Disable Keyboard Shortcuts' ),
			'group': 'keyboard',
			'default': 0
		});

		// Transcript preferences
		prefs.push({
			'name': 'prefTranscript', // transcript default state
			'label': null,
			'group': 'transcript',
			'default': 0 // off because turning it on has a certain WOW factor
		});
		prefs.push({
			'name': 'prefHighlight', // highlight transcript as media plays
			'label': this.translate( 'prefHighlight', 'Highlight transcript as media plays' ),
			'group': 'transcript',
			'default': 1 // on because many users can benefit
		});
		prefs.push({
			'name': 'prefAutoScrollTranscript',
			'label': null,
			'group': 'transcript',
			'default': 1
		});
		prefs.push({
			'name': 'prefTabbable', // tab-enable transcript
			'label': this.translate( 'prefTabbable', 'Keyboard-enable transcript' ),
			'group': 'transcript',
			'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
		});

		// Caption preferences
		prefs.push({
			'name': 'prefCaptions', // closed captions default state
			'label': null,
			'group': 'captions',
			'default': this.defaultStateCaptions
		});

		if (!this.usingYouTubeCaptions) {

			/* // not supported yet
			prefs.push({
				'name': 'prefCaptionsStyle',
				'label': this.translate( 'prefCaptionsStyle', 'Style' ),
				'group': 'captions',
				'default': this.translate( 'captionsStylePopOn', 'Pop-on' )
			});
			*/
			// captions are always positioned above the player for audio
			if (this.mediaType === 'video') {
				prefs.push({
					'name': 'prefCaptionsPosition',
					'label': this.translate( 'prefCaptionsPosition', 'Position' ),
					'group': 'captions',
					'default': this.defaultCaptionsPosition
				});
			}
			prefs.push({
				'name': 'prefCaptionsFont',
				'label': this.translate( 'prefCaptionsFont', 'Font' ),
				'group': 'captions',
				'default': 'sans-serif'
			});
		}
		// This is the one option that is supported by YouTube IFrame API
		prefs.push({
			'name': 'prefCaptionsSize',
			'label': this.translate( 'prefCaptionsSize', 'Font size' ),
			'group': 'captions',
			'default': '100%'
		});

		if (!this.usingYouTubeCaptions) {

			prefs.push({
				'name': 'prefCaptionsColor',
				'label': this.translate( 'prefCaptionsColor', 'Text Color' ),
				'group': 'captions',
				'default': 'white'
			});
			prefs.push({
				'name': 'prefCaptionsBGColor',
				'label': this.translate( 'prefCaptionsBGColor', 'Background' ),
				'group': 'captions',
				'default': 'black'
			});
			prefs.push({
				'name': 'prefCaptionsOpacity',
				'label': this.translate( 'prefCaptionsOpacity', 'Opacity' ),
				'group': 'captions',
				'default': '100%'
			});
			prefs.push({
				'name': 'prefCaptionsSpeak',
				'label': this.translate( 'prefVoicedCaptions', 'Spoken Captions' ),
				'group': 'captions',
				'default': 0
			});
			prefs.push({
				'name': 'prefCaptionsVoice',
				'label': this.translate( 'prefDescVoice', 'Voice' ),
				'group': 'captions',
				'default': null // will be set later, in injectPrefsForm()
			});
			prefs.push({
				'name': 'prefCaptionsPitch',
				'label': this.translate( 'prefDescPitch', 'Pitch' ),
				'group': 'captions',
				'default': 1 // 0 to 2
			});
			prefs.push({
				'name': 'prefCaptionsRate',
				'label': this.translate( 'prefCaptionRate', 'Spoken Caption Rate' ),
				'group': 'captions',
				'default': 1.2 // 0.1 to 10 (1 is normal speech; 2 is fast but decipherable; >2 is super fast)
			});
			prefs.push({
				'name': 'prefCaptionsVolume',
				'label': this.translate( 'volume', 'Volume' ),
				'group': 'captions',
				'default': 1 // 0 to 1
			});
		}

		if (this.mediaType === 'video') {
			// Description preferences
			prefs.push({
				'name': 'prefDesc', // audio description default state
				'label': null,
				'group': 'descriptions',
				'default': this.defaultStateDescriptions
			});
			prefs.push({
				'name': 'prefDescMethod', // audio description default format (if both 'video' and 'text' are available)
				'label': null,
				'group': 'descriptions',
				'default': 'video' // video (an alternative described version) always wins
			});
			prefs.push({
				'name': 'prefDescVoice',
				'label': this.translate( 'prefDescVoice', 'Voice' ),
				'group': 'descriptions',
				'default': null // will be set later, in injectPrefsForm()
			});
			prefs.push({
				'name': 'prefDescPitch',
				'label': this.translate( 'prefDescPitch', 'Pitch' ),
				'group': 'descriptions',
				'default': 1 // 0 to 2
			});
			prefs.push({
				'name': 'prefDescRate',
				'label': this.translate( 'prefDescRate', 'Spoken Description Rate' ),
				'group': 'descriptions',
				'default': 1 // 0.1 to 10 (1 is normal speech; 2 is fast but decipherable; >2 is super fast)
			});
			prefs.push({
				'name': 'prefDescVolume',
				'label': this.translate( 'volume', 'Volume' ),
				'group': 'descriptions',
				'default': 1 // 0 to 1
			});
			// Don't enable pause option if video described files in use.
			if ( this.descMethod !== 'video' ) {
				prefs.push({
					'name': 'prefDescPause', // automatically pause when closed description starts
					'label': this.translate( 'prefDescPause', 'Automatically pause video when description starts' ),
					'group': 'descriptions',
					'default': this.defaultDescPause
				});
			}
			prefs.push({
				'name': 'prefDescVisible', // visibly show closed description (if avilable and used)
				'label': this.translate( 'prefDescVisible', 'Make description visible' ),
				'group': 'descriptions',
				'default': 0 // off as of 4.3.16, to avoid overloading the player with visible features
			});
		}
		// Preferences without a category (not shown in Preferences dialogs)
		prefs.push({
			'name': 'prefSign', // open sign language window by default if avilable
			'label': null,
			'group': null,
			'default': 0 // off because clicking an icon to see the sign window has a powerful impact
		});

		return prefs;
	};

	AblePlayer.prototype.loadCurrentPreferences = function () {

		// Load current/default preferences into the AblePlayer object.

		var available = this.getAvailablePreferences();
		var preferences = this.getPref();
		// Copy current preferences values into this object, and fill in any default values.
		for (var ii = 0; ii < available.length; ii++) {
			var prefName = available[ii]['name'];
			var defaultValue = available[ii]['default'];
			if (preferences.preferences[prefName] !== undefined) {
				this[prefName] = preferences.preferences[prefName];
			} else {
				preferences.preferences[prefName] = defaultValue;
				this[prefName] = defaultValue;
			}
		}

		// Also load array of preferred voices from preferences
		if (typeof preferences.voices !== 'undefined') {
			this.prefVoices = preferences.voices;
		}

		this.setPrefs(preferences);
	};

	AblePlayer.prototype.injectPrefsForm = function (form) {

		// Creates a preferences form and injects it.
		// form is one of the supported forms (groups) defined in getPreferencesGroups()

		var thisObj, available,
			$prefsDiv, formTitle, introText, $prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
			$fieldset, fieldsetClass, fieldsetId, $legend, legendId, thisPref, $thisDiv, thisClass,
			thisId, $thisLabel, $thisField, captionsOptions,options,$thisOption,optionValue,optionLang,optionText,
			changedPref,changedSpan,changedText, currentDescState, prefDescVoice, prefCaptionVoice, $kbHeading,$kbList,
			kbLabels,keys,kbListText,$kbListItem, dialog,$saveButton,$cancelButton,$buttonContainer;

		thisObj = this;
		available = this.getAvailablePreferences();

		// outer container, will be assigned role="dialog"
		$prefsDiv = $('<div>',{
			'class': 'able-prefs-form '
		});
		var customClass = 'able-prefs-form-' + form;
		$prefsDiv.addClass(customClass);

		// add titles and intros
		if (form == 'captions') {
			formTitle = this.translate( 'prefTitleCaptions', 'Captions Preferences' );
		} else if (form == 'descriptions') {
			formTitle = this.translate( 'prefTitleDescriptions', 'Audio Description Preferences' );
			$prefsIntro = $('<p>',{
				text: this.translate( 'prefIntroDescription1', 'This media player supports audio description in two ways: ' )
			});
			var $prefsIntroUL = $('<ul>');
			var $prefsIntroLI1 = $('<li>',{
				text: this.translate( 'prefDescFormatOption1', 'alternative described version of video' )
			});
			var $prefsIntroLI2 = $('<li>',{
				text: this.translate( 'prefDescFormatOption2', 'text-based description, announced by screen reader' )
			});

			$prefsIntroUL.append($prefsIntroLI1,$prefsIntroLI2);
			let prefDescription1 = '';
			let prefDescription2 = '';
			let prefDescription3 = '';
			let prefDescriptionNone = '';
			if (this.hasOpenDesc && this.hasClosedDesc) {
				prefDescription1 = this.translate( 'prefDescription1', 'The current video has an alternative described version and text-based description, announced by screen reader');
			} else if (this.hasOpenDesc) {
				prefDescription2 = this.translate( 'prefDescription2', 'The current video has an alternative described version.' );
			} else if (this.hasClosedDesc) {
				prefDescription3 = this.translate( 'prefDescription3', 'The current video has text-based description, announced by screen reader.');
			} else {
				prefDescriptionNone = this.translate( 'prefDescriptionNone', 'The current video has no audio description in either format.' );
			}
			currentDescState = prefDescription1 + prefDescription2 + prefDescription3 + prefDescriptionNone;
			$prefsIntroP2 = $('<p>',{
				html: currentDescState
			});

			p3Text = this.translate( 'prefIntroDescription3', 'Use the following form to set your preferences related to text-based audio description.' );
			if (this.hasOpenDesc || this.hasClosedDesc) {
				p3Text += ' ' + this.translate( 'prefIntroDescription4', 'After you save your settings, audio description can be toggled on/off using the Description button.' );
			}
			$prefsIntroP3 = $('<p>',{
				text: p3Text
			});

			$prefsDiv.append( $prefsIntro, $prefsIntroUL, $prefsIntroP2, $prefsIntroP3 );
		} else if (form == 'keyboard') {
			formTitle = this.translate( 'prefTitleKeyboard', 'Keyboard Preferences' );
			introText = this.translate( 'prefIntroKeyboard1', 'The media player on this web page can be operated from anywhere on the page using keyboard shortcuts (see below for a list).' );
			introText += ' ' + this.translate( 'prefIntroKeyboard2', 'Modifier keys (Shift, Alt, and Control) can be assigned below.' );
			introText += ' ' + this.translate( 'prefIntroKeyboard3', 'NOTE: Some key combinations might conflict with keys used by your browser and/or other software applications. Try various combinations of modifier keys to find one that works for you.' );
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		} else if (form == 'transcript') {
			formTitle = this.translate( 'prefTitleTranscript', 'Transcript Preferences' );
		}

		$fieldset = $('<div>').attr('role','group');
		fieldsetClass = 'able-prefs-' + form;
		fieldsetId = this.mediaId + '-prefs-' + form;
		legendId = fieldsetId + '-legend';
		$fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
		if (form === 'keyboard') {
			$legend = $('<h2>' + this.translate( 'prefHeadingKeyboard1', 'Modifier keys used for shortcuts' ) + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		} else if (form === 'descriptions') {
			$legend = $('<h2>' + this.translate( 'prefHeadingTextDescription', 'Text-based audio description' ) + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		}
		for (i=0; i<available.length; i++) {

			// only include prefs on the current form if they have a label
			if ((available[i]['group'] == form) && available[i]['label']) {

				thisPref = available[i]['name'];
				thisClass = 'able-' + thisPref;
				thisId = this.mediaId + '_' + thisPref;
				$thisDiv = $('<div>').addClass(thisClass + ' able-player-setting');
				if (form === 'captions' ) {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<select>',{
						name: thisPref,
						id: thisId,
					});
					// add a change handler that updates the style of the sample caption text
					let viewingOptions = ['prefCaptionsPosition','prefCaptionsFont','prefCaptionsSize','prefCaptionsColor','prefCaptionsBGColor','prefCaptionsOpacity'];
					if ( viewingOptions.indexOf(thisPref) !== -1 ) {
						$thisField.on( 'change', function() {
							changedPref = $(this).attr('name');
							thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
						});
					}
					captionsOptions = this.getCaptionsOptions(thisPref);
					if ( ! ( thisPref === 'prefCaptionsVoice' && ! this.descVoices.length ) ) {
						$thisDiv.append($thisLabel,$thisField);
					}
					for (j=0; j < captionsOptions.length; j++) {
						if (thisPref === 'prefCaptionsPosition') {
							optionValue = captionsOptions[j];
							if (optionValue === 'overlay') {
								optionText = this.translate( 'captionsPositionOverlay', 'Overlay' );
							} else if (optionValue === 'below') {
								optionValue = captionsOptions[j];
								optionText = this.translate( 'captionsPositionBelow', 'Below video' );
							}
						} else if (thisPref === 'prefCaptionsFont' || thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor' || thisPref === 'prefCaptionsSpeak' ) {
							optionValue = captionsOptions[j][0];
							optionText = captionsOptions[j][1];
						} else if (thisPref === 'prefCaptionsOpacity') {
							optionValue = captionsOptions[j];
							optionText = captionsOptions[j];
							optionText += (optionValue === '0%') ? ' (' + this.translate( 'transparent', 'transparent' ) + ')' : ' (' + this.translate( 'solid', 'solid' ) + ')';
						} else if (thisPref === 'prefCaptionsSize') {
							optionValue = captionsOptions[j];
							optionText = captionsOptions[j];
						}
						let voicingOptions = ['prefCaptionsPitch','prefCaptionsRate','prefCaptionsVolume'];
						if ( optionValue && voicingOptions.indexOf(thisPref) === -1 ) {
							$thisOption = $('<option>',{
								value: optionValue,
								text: optionText
							});
							if (this[thisPref] === optionValue) {
								$thisOption.prop('selected',true);
							}
							$thisField.append($thisOption);
						}
						// If synth is possible, show voicing options.
						if ( this.synth ) {
							if ( thisPref === 'prefCaptionsVoice' && this.descVoices.length ) {
								prefCaptionVoice = this.getPrefVoice();
								for (j=0; j < this.descVoices.length; j++) {
									optionValue = this.descVoices[j].name;
									optionLang = this.descVoices[j].lang.substring(0,2).toLowerCase();
									optionText = optionValue + ' (' + this.descVoices[j].lang + ')';
									$thisOption = $('<option>',{
										'value': optionValue,
										'data-lang': optionLang,
										text: optionText
									});
									if (prefCaptionVoice === optionValue) {
										$thisOption.prop('selected',true);
									}
									$thisField.append($thisOption);
								}
								this.$voiceSelectField = $thisField;
							} else {
								if ( thisPref == 'prefCaptionsPitch' || thisPref == 'prefCaptionsRate' || thisPref == 'prefCaptionsVolume' ) {
									options = false;
									// Options values described in audio description preferences.
									options = (thisPref == 'prefCaptionsPitch') ? [0,0.5,1,1.5,2] : options;
									options = (thisPref == 'prefCaptionsRate') ? [0.7,0.8,0.9,1,1.1,1.2,1.5,2,2.5,3] : options;
									options = (thisPref == 'prefCaptionsVolume') ? [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1] : options;
									if ( options ) {
										for (j=0; j < options.length; j++) {
											optionValue = options[j];
											optionText = this.makePrefsValueReadable(thisPref,optionValue);
											$thisOption = $('<option>',{
												value: optionValue,
												text: optionText
											});
											if (this[thisPref] == optionValue) {
												$thisOption.prop('selected',true);
											}
											$thisField.append($thisOption);
										}
										// add a change handler that announces the sample text
										$thisField.on('change',function() {
											let captionSample = thisObj.translate( 'sampleCaptionText', 'Sample caption text' );
											thisObj.announceText('captionSample',captionSample);
										});
										$thisDiv.append($thisLabel,$thisField);
									}
								}
							}
						}
					}
				} else if (form === 'descriptions') {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					if (thisPref === 'prefDescPause' || thisPref === 'prefDescVisible') {
						// these preferences are checkboxes
						$thisDiv.addClass('able-prefs-checkbox');
						$thisField = $('<input>',{
							type: 'checkbox',
							name: thisPref,
							id: thisId,
							value: 'true'
						});
						// check current active value for this preference
						if (this[thisPref] === 1) {
							$thisField.prop('checked',true);
						}
						$thisDiv.append($thisField,$thisLabel);
					} else if (this.synth) {
						// Only show these options if browser supports speech synthesis
						$thisDiv.addClass('able-prefs-select');
						$thisField = $('<select>',{
							name: thisPref,
							id: thisId,
						});
						if ( thisPref === 'prefDescVoice' && this.descVoices.length) {
							prefDescVoice = this.getPrefVoice();
							for (j=0; j < this.descVoices.length; j++) {
								optionValue = this.descVoices[j].name;
								optionLang = this.descVoices[j].lang.substring(0,2).toLowerCase();
								optionText = optionValue + ' (' + this.descVoices[j].lang + ')';
								$thisOption = $('<option>',{
									'value': optionValue,
									'data-lang': optionLang,
									text: optionText
								});
								if (prefDescVoice === optionValue) {
									$thisOption.prop('selected',true);
								}
								$thisField.append($thisOption);
							}
							this.$voiceSelectField = $thisField;
						} else {
							if (thisPref == 'prefDescPitch') { // 0 to 2
								options = [0,0.5,1,1.5,2];
							} else if (thisPref == 'prefDescRate') { // 0.1 to 10
								// Tests with a variety of voices on MacOS and Windows
								// yielded the following choices that seem reasonable for audio description:
								// 0.5 - too slow (exclude this)
								// 0.7 - casual
								// 0.8 - add this
								// 0.9 - add this
								// 1 - normal
								// 1.1 - add this
								// 1.2 - add this
								// 1.5 - quick
								// 2 - speedy
								// 2.5 - fleet
								// 3 - fast! (some voices don't get any faster than this

								// Note: if these values are modified, must also modfiy them
								// in makePrefsValueReadable()
								options = [0.7,0.8,0.9,1,1.1,1.2,1.5,2,2.5,3];
							} else if (thisPref == 'prefDescVolume') { // 0 (mute) to 1
								options = [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1];
							}
							if (typeof options !== 'undefined') {
								for (j=0; j < options.length; j++) {
									optionValue = options[j];
									optionText = this.makePrefsValueReadable(thisPref,optionValue);
									$thisOption = $('<option>',{
										value: optionValue,
										text: optionText
									});
									if (this[thisPref] == optionValue) {
										$thisOption.prop('selected',true);
									}
									$thisField.append($thisOption);
									$thisDiv.append($thisLabel,$thisField);
								}
							}
						}
						// add a change handler that announces the sample description text
						$thisField.on('change',function() {
							thisObj.announceText('sample',thisObj.currentSampleText);
						});
						$thisDiv.append($thisLabel,$thisField);
					}
				} else { // all other fields are checkboxes
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<input>',{
						type: 'checkbox',
						name: thisPref,
						id: thisId,
						value: 'true'
					});
					// check current active value for this preference
					if (this[thisPref] === 1) {
						$thisField.prop('checked',true);
					}
					if (form === 'keyboard') {
						// add a change handler that updates the list of current keyboard shortcuts
						$thisField.on('change',function() {
							changedPref = $(this).attr('name');
							if (changedPref === 'prefAltKey') {
								changedSpan = '.able-modkey-alt';
								changedText = thisObj.translate( 'prefAltKey', 'Alt' ) + ' + ';
							} else if (changedPref === 'prefCtrlKey') {
								changedSpan = '.able-modkey-ctrl';
								changedText = thisObj.translate( 'prefCtrlKey', 'Control' ) + ' + ';
							} else if (changedPref === 'prefShiftKey') {
								changedSpan = '.able-modkey-shift';
								changedText = thisObj.translate( 'prefShiftKey', 'Shift' ) + ' + ';
							}
							if ( changedPref !== 'prefNoKeyShortcuts' ) {
								if ($(this).is(':checked')) {
									$(changedSpan).text(changedText);
								} else {
									$(changedSpan).text('');
								}
							} else {
								if ($(this).is(':checked')) {
									$('.able-modkey-item').addClass('hidden');
								} else {
									$('.able-modkey-item').removeClass('hidden');
								}
							}
						});
					}
					$thisDiv.append($thisField,$thisLabel);
				}
				if (thisPref === 'prefDescVoice' && !this.descVoices.length) ; else {
					$fieldset.append($thisDiv);
				}
			}
		}
		$prefsDiv.append($fieldset);

		if (form === 'captions') {
			// add a sample closed caption div to prefs dialog
			// do not show this for YouTube captions, since it's not an accurate reflection
			if (!this.usingYouTubeCaptions) {
				this.$sampleCapsDiv = $('<div>',{
					'class': 'able-captions-sample'
				}).text( this.translate( 'sampleCaptionText', 'Sample caption text' ) );
				$prefsDiv.append(this.$sampleCapsDiv);
				this.stylizeCaptions(this.$sampleCapsDiv);
			}
		} else if (form === 'descriptions') {
			if (this.synth) {
				// add a div with sample audio description text
				this.$sampleDescDiv = $('<div>',{
					'class': 'able-desc-sample'
				}).text( this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' ) );
				$prefsDiv.append(this.$sampleDescDiv);
				this.currentSampleText = this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' );
			}
		} else if (form === 'keyboard') {
			let shortcutClass = (this.prefNoKeyShortcuts === 1 ) ? 'able-modkey-item hidden' : 'able-modkey-item';

			// add a current list of keyboard shortcuts
			$kbHeading = $('<h2>',{
				text: this.translate( 'prefHeadingKeyboard2', 'Current keyboard shortcuts' )
			});
			$kbList = $('<ul>');
			// create arrays of kbLabels and keys
			kbLabels = [];
			keys = [];
			for (i=0; i<this.controls.length; i++) {
				if (this.controls[i] === 'play') {
					kbLabels.push( this.translate( 'play', 'Play' ) + '/' + this.translate( 'pause', 'Pause' ) );
					keys.push('p</span>, <span class="able-help-modifiers"> ' + this.translate( 'spacebar', 'spacebar' ));
				} else if (this.controls[i] === 'restart') {
					kbLabels.push(this.translate( 'restart', 'Restart' ));
					keys.push('s');
				} else if (this.controls[i] === 'previous') {
					kbLabels.push( this.translate( 'prevTrack', 'Previous track' ) );
					keys.push('b'); // b = back
				} else if (this.controls[i] === 'next') {
					kbLabels.push( this.translate( 'nextTrack', 'Next track' ) );
					keys.push('n');
				} else if (this.controls[i] === 'rewind') {
					kbLabels.push(this.translate( 'rewind', 'Rewind' ));
					keys.push('r');
				} else if (this.controls[i] === 'forward') {
					kbLabels.push(this.translate( 'forward', 'Forward' ));
					keys.push('f');
				} else if (this.controls[i] === 'volume') {
					kbLabels.push(this.translate( 'volume', 'Volume' ));
					keys.push('v</span>,' + ' <span class="able-modkey">1-9');
					// mute toggle
					kbLabels.push(this.translate( 'mute', 'Mute' ) + '/' + this.translate( 'unmute', 'Unmute' ));
					keys.push('m');
				} else if (this.controls[i] === 'captions') {
					if (this.captions.length > 1) {
						// caption button launches a Captions popup menu
						kbLabels.push(this.translate( 'captions', 'Captions' ));
					} else {
						// there is only one caption track
						// therefore caption button is a toggle
						if (this.captionsOn) {
							kbLabels.push(this.translate( 'hideCaptions', 'Hide captions' ));
						} else {
							kbLabels.push(this.translate( 'showCaptions', 'Show captions' ));
						}
					}
					keys.push('c');
				} else if (this.controls[i] === 'descriptions') {
					if (this.descOn) {
						kbLabels.push(this.translate( 'turnOffDescriptions', 'Turn off descriptions' ));
					} else {
						kbLabels.push(this.translate( 'turnOnDescriptions', 'Turn on descriptions' ));
					}
					keys.push('d');
				} else if (this.controls[i] === 'prefs') {
					kbLabels.push(this.translate( 'preferences', 'Preferences' ));
					keys.push('e');
				}
			}
			for (i=0; i<keys.length; i++) {
				// alt
				kbListText = '<span class="able-modkey-alt">';
				if (this.prefAltKey === 1) {
					kbListText += this.translate( 'prefAltKey', 'Alt' ) + ' + ';
				}
				kbListText += '</span>';
				// ctrl
				kbListText += '<span class="able-modkey-ctrl">';
				if (this.prefCtrlKey === 1) {
					kbListText += this.translate( 'prefCtrlKey', 'Control' ) + ' + ';
				}
				kbListText += '</span>';
				// shift
				kbListText += '<span class="able-modkey-shift">';
				if (this.prefShiftKey === 1) {
					kbListText += this.translate( 'prefShiftKey', 'Shift' ) + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey">' + keys[i] + '</span>';
				kbListText += ' = ' + kbLabels[i];
				$kbListItem = $('<li>',{
					'class': shortcutClass,
					html: kbListText,
				});
				$kbList.append($kbListItem);
			}
			// add Escape key
			kbListText = '<span class="able-modkey">' + this.translate( 'escapeKey', 'Escape' ) + '</span>';
			kbListText += ' = ' + this.translate( 'escapeKeyFunction', 'Close current dialog or popup menu' );
			$kbListItem = $('<li>',{
				html: kbListText
			});
			$kbList.append($kbListItem);
			// put it all together
			$prefsDiv.append($kbHeading,$kbList);
		}

		// $prefsDiv (dialog) must be appended to the BODY!
		$('body').append($prefsDiv);
		dialog = new AccessibleDialog(
			$prefsDiv,
			this.$prefsButton,
			formTitle,
			thisObj.translate( 'closeButtonLabel', 'Close' )
		);

		// Add save and cancel buttons.
		$buttonContainer = $( '<div class="able-prefs-buttons"></div>' );
		$saveButton = $('<button class="modal-button">' + this.translate( 'save', 'Save' ) + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.translate( 'cancel', 'Cancel' ) + '</button>');
		$saveButton.on( 'click', function () {
			dialog.hide();
			thisObj.savePrefsFromForm();
		});
		$cancelButton.on( 'click', function () {
			dialog.hide();
			thisObj.resetPrefsForm();
		});
		$buttonContainer.append( $saveButton,$cancelButton );
		$prefsDiv.append($buttonContainer);
		// Associate the dialog's H1 as aria-labelledby for groups of fields
		// (alternative to fieldset and legend)
		if (form === 'captions' || form === 'transcript') {
			$fieldset.attr('aria-labelledby',dialog.titleH1.attr('id'));
		}

		// add global reference for future control
		if (form === 'captions') {
			this.captionPrefsDialog = dialog;
		} else if (form === 'descriptions') {
			this.descPrefsDialog = dialog;
		} else if (form === 'keyboard') {
			this.keyboardPrefsDialog = dialog;
		} else if (form === 'transcript') {
			this.transcriptPrefsDialog = dialog;
		}

		// Add click handler for dialog close button
		// (button is added in dialog.js)
		$('div.able-prefs-form button.modalCloseButton').on( 'click', function() {
			thisObj.resetPrefsForm();
		});
		// Add handler for escape key
		$('div.able-prefs-form').on( 'keydown', function(e) {
			if (e.key === 'Escape') {
				thisObj.resetPrefsForm();
			}
		});
	};

	AblePlayer.prototype.getPrefVoice = function () {

		// return user's preferred voice for the current language from preferences.voices
		var lang, preferences, i;

		if (this.selectedDescriptions) {
			lang = this.selectedDescriptions.language;
		} else if (this.captionLang) {
			lang = this.captionLang;
		} else {
			lang = this.lang;
		}
		preferences = this.getPref();
		if (preferences.voices) {
			for (i=0; i < preferences.voices.length; i++) {
				if (preferences.voices[i].lang === lang) {
					return preferences.voices[i].name;
				}
			}
		}
		return null; // user has no saved preference
	};

	AblePlayer.prototype.rebuildVoicePrefsForm = function ( field ) {

		// Called if this.descVoices changes, which may happen if:
		//  getBrowserVoices() succeeds after an earlier failure
		//  user changes language of captions/subtitles and descVoices changes to match the new language

		var i, optionValue, optionText, $thisOption;

		this.$voiceSelectField = $('#' + this.mediaId + field);
		this.$voiceSelectField.empty();
		for (i=0; i < this.descVoices.length; i++) {
			optionValue = this.descVoices[i].name;
			optionText = optionValue + ' (' + this.descVoices[i].lang + ')';
			$thisOption = $('<option>',{
				'value': optionValue,
				'data-lang': this.descVoices[i].lang.substring(0,2).toLowerCase(),
				text: optionText
			});
			if (this.prefDescVoice == optionValue) {
				$thisOption.prop('selected',true);
			}
			this.$voiceSelectField.append($thisOption);
		}
	};

	AblePlayer.prototype.makePrefsValueReadable = function(pref,value) {

		// The values for pitch, rate, and volume (web speech API)
		// are strange and inconsistent between variables
		// this function returns text that is more readable than the values themselves

		if (pref === 'prefDescPitch' || pref === 'prefCaptionsPitch' ) {
			if (value === 0) {
				return this.translate( 'prefDescPitch1', 'Very low' );
			} else if (value === 0.5) {
				return this.translate( 'prefDescPitch2', 'Low' );
			} else if (value === 1) {
				return this.translate( 'prefDescPitch3', 'Default' );
			} else if (value === 1.5) {
				return this.translate( 'prefDescPitch4', 'High' );
			} else if (value === 2) {
				return this.translate( 'prefDescPitch5', 'Very high' );
			}
		} else if (pref === 'prefDescRate' || pref === 'prefCaptionsRate' ) {
			// default in the API is 0.1 to 10, where 1 is normal speaking voice
			// our custom range offers several rates close to 1
			// plus a couple of crazy fast ones for sport
			// Our more readable options (1-10) or mapped here to API values
			if (value === 0.7) {
				return 1;
			} else if (value === 0.8) {
				return 2;
			} else if (value === 0.9) {
				return 3;
			} else if (value === 1) {
				return 4;
			} else if (value === 1.1) {
				return 5;
			} else if (value === 1.2) {
				return 6;
			} else if (value === 1.5) {
				return 7;
			} else if (value === 2) {
				return 8;
			} else if (value === 2.5) {
				return 9;
			} else if (value === 3) {
				return 10;
			}
		} else if (pref === 'prefDescVolume' || pref === 'prefCaptionsVolume' ) {
			// values range from 0.1 to 1.0
			return value * 100 + '%';
		}
		return value;
	};

	AblePlayer.prototype.resetPrefsForm = function () {

		// Reset preferences form with default values from preferences
		// Called when:
		// User clicks cancel or close button in Prefs Dialog
		// User presses Escape to close Prefs dialog
		// User clicks Save in Prefs dialog, & there's more than one player on page

		var preferences, available, i, prefName;

		preferences = this.getPref();
		available = this.getAvailablePreferences();
		for (i=0; i<available.length; i++) {
			prefName = available[i]['name'];
			if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
				// this is a caption-related select box
				$('select[name="' + prefName + '"]').val(preferences.preferences[prefName]);
			} else { // all others are checkboxes
				if (this[prefName] === 1) {
					$('input[name="' + prefName + '"]').prop('checked',true);
				} else {
					$('input[name="' + prefName + '"]').prop('checked',false);
				}
			}
		}
		// also restore style of sample caption div
		this.stylizeCaptions(this.$sampleCapsDiv);
	};

	AblePlayer.prototype.savePrefsFromForm = function () {

		// Return a prefs object constructed from the form.
		// called when user saves the Preferences form
		// update preferences with new value
		var preferences, available, prefName, prefId,
			voiceSelectId, newVoice, numChanges, voiceLangFound,
			numCapChanges, capSizeChanged, capSizeValue, newValue;

		numChanges = 0;
		numCapChanges = 0; // changes to caption-style-related preferences
		capSizeChanged = false;
		preferences = this.getPref();
		available = this.getAvailablePreferences();
		for (var i=0; i < available.length; i++) {
			// only prefs with labels are used in the Prefs form
			if (available[i]['label']) {
				prefName = available[i]['name'];
				prefId = this.mediaId + '_' + prefName;
				if (prefName === 'prefDescVoice') {
					if (typeof preferences.voices === 'undefined') {
						preferences.voices = [];
					}
					voiceSelectId = this.mediaId + '_prefDescVoice';
					this.prefDescVoice = $('select#' + voiceSelectId).find(':selected').val();
					this.prefDescVoiceLang = $('select#' + voiceSelectId).find(':selected').attr('data-lang');
					// replace preferred voice for this lang in preferences.voices array, if one exists
					// otherwise, add it to the array
					voiceLangFound = false;
					for (var v=0; v < preferences.voices.length; v++) {
						if (preferences.voices[v].lang === this.prefDescVoiceLang) {
							voiceLangFound = true;
							preferences.voices[v].name = this.prefDescVoice;
						}
					}
					if (!voiceLangFound) {
						// no voice has been saved yet for this language. Add it to array.
						newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
						preferences.voices.push(newVoice);
					}
					numChanges++;
				} else if (prefName == 'prefDescMethod') {
					// As of v4.0.10, prefDescMethod is no longer a choice
					this.prefDescMethod = 'video';
					if (this.prefDescMethod !== preferences.preferences['prefDescMethod']) { // user's preference has changed
						preferences.preferences['prefDescMethod'] = this.prefDescMethod;
						numChanges++;
					}
				} else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
					// this is one of the caption-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (preferences.preferences[prefName] !== newValue) { // user changed setting
						preferences.preferences[prefName] = newValue;
						// also update global var for this pref (for caption fields, not done elsewhere)
						this[prefName] = newValue;
						numChanges++;
						numCapChanges++;
					}
					if (prefName === 'prefCaptionsSize') {
						capSizeChanged = true;
						capSizeValue = newValue;
					}
				} else if ((prefName.indexOf('Desc') !== -1) && (prefName !== 'prefDescPause') && prefName !== 'prefDescVisible') {
					// this is one of the description-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (preferences.preferences[prefName] !== newValue) { // user changed setting
						preferences.preferences[prefName] = newValue;
						// also update global var for this pref
						this[prefName] = newValue;
						numChanges++;
					}
				} else { // all other fields are checkboxes
					if ($('input[id="' + prefId + '"]').is(':checked')) {
						preferences.preferences[prefName] = 1;
						if (this[prefName] === 1) ; else {
							// user has just turned this pref on
							this[prefName] = 1;
							numChanges++;
						}
					} else { // thisPref is not checked
						preferences.preferences[prefName] = 0;
						if (this[prefName] === 1) {
							// user has just turned this pref off
							this[prefName] = 0;
							numChanges++;
						}
					}
				}
			}
		}
		if (numChanges > 0) {
			this.setPrefs(preferences);
			this.showAlert( this.translate( 'prefSuccess', 'Your changes have been saved.' ) );
		} else {
			this.showAlert( this.translate( 'prefNoChange', "You didn't make any changes" ) );
		}
		if (this.player === 'youtube' &&
			(typeof this.usingYouTubeCaptions !== 'undefined' && this.usingYouTubeCaptions) &&
			capSizeChanged) {
				// update font size of YouTube captions
				this.youTubePlayer.setOption('captions','fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
		}
		if (!AblePlayer.hasSingleInstance()) {
			// there are multiple players on this page.
			// update prefs for ALL of them
			for (const instance of AblePlayer.ablePlayerInstances) {
				instance.updatePlayerPrefs();
				instance.loadCurrentPreferences();
				instance.resetPrefsForm();
				if (numCapChanges > 0) {
					instance.stylizeCaptions(instance.$captionsDiv);
					// also apply same changes to descriptions, if present
					if (typeof instance.$descDiv !== 'undefined') {
						instance.stylizeCaptions(instance.$descDiv);
					}
				}
			}
		} else {
			// there is only one player
			this.updatePlayerPrefs();
			if (numCapChanges > 0) {
				this.stylizeCaptions(this.$captionsDiv);
				// also apply same changes to descriptions, if present
				if (typeof this.$descDiv !== 'undefined') {
					this.stylizeCaptions(this.$descDiv);
				}
			}
		}
	};

	AblePlayer.prototype.updatePlayerPrefs = function () {

		// Update player based on current prefs. Safe to call multiple times.
		if (this.$transcriptDiv) {
			// tabbable transcript
			if (this.prefTabbable === 1) {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').attr('tabindex','0');
			} else {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').removeAttr('tabindex');
			}

			// transcript highlights
			if (this.prefHighlight === 0) {
				// user doesn't want highlights; remove any existing highlights
				this.$transcriptDiv.find('span').removeClass('able-highlight');
			}
		}

		// Re-initialize caption and description in case relevant settings have changed
		this.updateCaption();
		this.initDescription();
	};

	AblePlayer.prototype.usingModifierKeys = function(e) {

		// return true if user is holding down required modifier keys
		if ((this.prefAltKey === 1) && !e.altKey) {
			return false;
		}
		if ((this.prefCtrlKey === 1) && !e.ctrlKey) {
			return false;
		}
		if ((this.prefShiftKey === 1) && !e.shiftKey) {
			return false;
		}
		return true;
	};
}

function addSearchFunctions(AblePlayer) {
  AblePlayer.prototype.showSearchResults = function () {
    // search VTT file for all instances of searchTerms
    // Currently just supports search terms separated with one or more spaces

    // TODO: Add support for more robust search syntax:
    // Search terms wrapped in quotation marks ("") must occur exactly as they appear in the quotes
    // Search terms with an attached minus sign (e.g., -term) are to be excluded from results
    // Boolean AND/OR operators
    // ALSO: Add localization support

    var thisObj = this;
    if (this.searchDiv && this.searchString) {
      // sanitize search string
      var cleanSearchString = DOMPurify.sanitize(this.searchString);
      if ($("#" + this.SearchDiv)) {
        var searchStringHtml = "<p>" + this.translate( 'resultsSummary1', 'You searched for:') + ' ';
        searchStringHtml +=
          '<span id="able-search-term-echo">' + cleanSearchString + "</span>";
        searchStringHtml += "</p>";
        var resultsArray = this.searchFor(
          cleanSearchString,
          this.searchIgnoreCaps
        );
        if (resultsArray.length > 0) {
          var $resultsSummary = $("<p>", {
            class: "able-search-results-summary",
          });
          var resultsSummaryText = this.translate( 'resultsSummary2', 'Found %1 matching items.', [ '<strong>' + resultsArray.length + '</strong>' ] );
          resultsSummaryText += ' ' + this.translate( 'resultsSummary3', 'Click the time associated with any item to play the video from that point.' );
          $resultsSummary.html( resultsSummaryText );
          var $resultsList = $("<ul>");
          for (var i = 0; i < resultsArray.length; i++) {
            var resultId = "aria-search-result-" + i;
            var $resultsItem = $("<li>", {});
            var itemStartTime = this.secondsToTime(resultsArray[i]["start"]);
            var itemLabel =
              this.translate( 'searchButtonLabel', 'Play at %1', [ itemStartTime["title"] ] );
            var itemStartSpan = $("<button>", {
              class: "able-search-results-time",
              "data-start": resultsArray[i]["start"],
              "aria-label": itemLabel,
              "aria-describedby": resultId,
            });
            itemStartSpan.text(itemStartTime["value"]);
            // add a listener for clisk on itemStart
            itemStartSpan.on("click", function (e) {
              thisObj.seekTrigger = "search";
              var spanStart = parseFloat($(this).attr("data-start"));
              // Add a tiny amount so that we're inside the span.
              spanStart += 0.01;
              thisObj.seeking = true;
              thisObj.seekTo(spanStart);
            });

            var itemText = $("<span>", {
              class: "able-search-result-text",
              id: resultId,
            });
            itemText.html('...' + resultsArray[i]["caption"] + '...');
            $resultsItem.append(itemStartSpan, itemText);
            $resultsList.append($resultsItem);
          }
          $('#' + this.searchDiv)
            .html(searchStringHtml)
            .append($resultsSummary, $resultsList);
        } else {
          var noResults = $('<p>').text( this.translate( 'noResultsFound', 'No results found.' ) );
          $('#' + this.searchDiv)
            .html(searchStringHtml)
            .append(noResults);
        }
      }
    }
  };

  AblePlayer.prototype.searchFor = function (searchString, ignoreCaps) {
    // return chronological array of caption cues that match searchTerms
    var captionLang, captions, results, caption, c, i, j;
    results = [];
    // split searchTerms into an array
    var searchTerms = searchString.split(" ");
    if (this.captions.length > 0) {
      // Get caption track that matches this.searchLang
      for (i = 0; i < this.captions.length; i++) {
        if (this.captions[i].language === this.searchLang) {
          captionLang = this.searchLang;
          captions = this.captions[i].cues;
        }
      }
      if (captions.length > 0) {
        c = 0;
        for (i = 0; i < captions.length; i++) {
          if (
            $.inArray(captions[i].components.children[0]["type"], [
              "string",
              "i",
              "b",
              "u",
              "v",
              "c",
            ]) !== -1
          ) {
            caption = this.flattenCueForCaption(captions[i]);
            var captionNormalized = ignoreCaps
              ? caption.toLowerCase()
              : caption;
            for (j = 0; j < searchTerms.length; j++) {
              var searchTermNormalized = ignoreCaps
                ? searchTerms[j].toLowerCase()
                : searchTerms[j];
              if (captionNormalized.indexOf(searchTermNormalized) !== -1) {
                results[c] = [];
                results[c]["start"] = captions[i].start;
                results[c]["lang"] = captionLang;
                results[c]["caption"] = this.highlightSearchTerm(
                  searchTerms,
                  caption
                );
                c++;
                break;
              }
            }
          }
        }
      }
    }
    return results;
  };

  AblePlayer.prototype.highlightSearchTerm = function (
    searchTerms,
    resultString
  ) {
    // highlight ALL found searchTerms in the current resultString
    // Need to step through the remaining terms to see if they're present as well
    searchTerms.forEach(function (searchTerm) {
      var reg = new RegExp(searchTerm, "gi");
      resultString = resultString.replace(
        reg,
        '<span class="able-search-term">$&</span>'
      );
    });
    return resultString;
  };

  /**
   * Convert a number of seconds into readable time information.
   *
   * @param {int} totalSecondsFloat
   *
   * @returns {string[]} array 'value' HH:MM:SS and 'title' speakable time.
   */
  AblePlayer.prototype.secondsToTime = function (totalSecondsFloat) {
    // return an array of totalSeconds converted into two formats
    // time['value'] = HH:MM:SS with hours dropped if there are none
    // time['title'] = a speakable rendering, so speech rec users can easily speak the link
    var totalSeconds = Math.floor(totalSecondsFloat);

    var h = parseInt(totalSeconds / 3600, 10) % 24;
    var m = parseInt(totalSeconds / 60, 10) % 60;
    var s = totalSeconds % 60;
    var value = '';
    var title = '';
    if (h > 0) {
      value += String(h).padStart(2, '0') + ':';
      title += h > 0 ? h + ' ' + (h === 1 ? this.translate( 'hour', 'hour' ) : this.translate( 'hours', 'hours' ) ) : '';
    }

    value += String(m).padStart(2, '0') + ':';
    title += m > 0 ? m + ' ' + (m === 1 ? this.translate( 'minute', 'minute' ) : this.translate( 'minutes', 'minutes' ) ) : '';

	value += String(s).padStart(2, '0');
    title += s > 0 ? s + ' ' + (s === 1 ? this.translate( 'second', 'second' ) : this.translate( 'seconds', 'seconds' ) ) : '';

    var time = [];
    time["value"] = value;
    time["title"] = title;

    return time;
  };
}

/* global YT */

function addSignFunctions(AblePlayer) {
	AblePlayer.prototype.initSignLanguage = function() {
		this.hasSignLanguage = false;
		// Sign language is only currently supported in HTML5 player and YouTube.
		var hasLocalSrc = ( this.$sources.first().attr('data-sign-src') !== undefined && this.$sources.first().attr('data-sign-src') !== "" );
		// YouTube src can either be on a `source` element or on the `video` element.
		var hasRemoteSrc = ( this.$media.data('youtube-sign-src') !== undefined && this.$media.data('youtube-sign-src') !== "" );
		var hasRemoteSource = ( this.$sources.first().attr('data-youtube-sign-src') !== undefined && this.$sources.first().attr('data-youtube-sign-src') !== '' );
		if ( ! this.isIOS() && ( hasLocalSrc || hasRemoteSrc || hasRemoteSource ) && ( this.player === 'html5' || this.player === 'youtube' ) ) {
			// check to see if there's a sign language video accompanying this video
			// check only the first source
			// If sign language is provided, it must be provided for all sources
			let ytSignSrc = this.youTubeSignId ?? DOMPurify.sanitize( this.$sources.first().attr('data-youtube-sign-src') );
			let signSrc = DOMPurify.sanitize( this.$sources.first().attr('data-sign-src') );
			let signVideo = DOMPurify.sanitize( this.$media.data('youtube-sign-src') );
			this.signFile = (hasLocalSrc ) ? signSrc : false;
			if ( hasRemoteSrc ) {
				this.signYoutubeId = signVideo;
			} else if ( hasRemoteSource ) {
				this.signYoutubeId = ytSignSrc;
			}
			if ( this.signFile || this.signYoutubeId ) {
				if (this.isIOS()) {
					// iOS does not allow multiple videos to play simultaneously
					// Therefore, sign language as rendered by Able Player unfortunately won't work
					if (this.debug) ;
				} else {
					if (this.debug) ;
					this.hasSignLanguage = true;
					this.injectSignPlayerCode();
				}
			}
		}
	};

	AblePlayer.prototype.injectSignPlayerCode = function() {

		// create and inject surrounding HTML structure
		var signVideoId, i, signSrc, srcType, $signSource;

		signVideoId = this.mediaId + '-sign';

		if ( this.signFile || this.signYoutubeId ) {
			if ( null !== this.$signDivLocation ) {
				this.$signDivLocation.addClass( 'able-sign-window able-fixed' );
				this.$signWindow = this.$signDivLocation;
			} else {
				this.$signWindow = $('<div>',{
					'class' : 'able-sign-window',
					'role': 'dialog',
					'aria-label': this.translate( 'sign', 'Sign language' )
				});
				this.$signToolbar = $('<div>',{
					'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
				});
				this.$signWindow.append(this.$signToolbar);
			}

			this.$ableWrapper.append(this.$signWindow);
		}

		if ( this.signFile ) {
			this.$signVideo = $('<video>',{
				'id' : signVideoId,
				'tabindex' : '-1',
				'muted' : true,
			});
			this.signVideo = this.$signVideo[0];

			if ( this.signFile ) {
				$signSource = $('<source>',{
					'src' : this.signFile,
					'type' : 'video/' + this.signFile.substr(-3)
				});
				this.$signVideo.append($signSource);
			} else {
				// for each original <source>, add a <source> to the sign <video>
				for (i=0; i < this.$sources.length; i++) {
					signSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-sign-src') );
					srcType = this.$sources[i].getAttribute('type');
					if (signSrc) {
						$signSource = $('<source>',{
							'src' : signSrc,
							'type' : srcType
						});
						this.$signVideo.append($signSource);
					} else {
						// source is missing a sign language version
						// can't include sign language
						this.hasSignLanguage = false;
						return;
					}
				}
			}
			this.$signWindow.append( this.$signVideo );
		} else if ( this.signYoutubeId ) {
			this.signYoutube = this.initYouTubeSignPlayer();
		}

		// make it draggable
		if ( null === this.$signDivLocation ) {
			this.initDragDrop('sign');
		}

		if (this.prefSign === 1) {
			// sign window is on. Go ahead and position it and show it
			if ( null === this.$signDivLocation ) {
				this.positionDraggableWindow('sign',this.getDefaultWidth('sign'));
			}
		} else {
			this.$signWindow.hide();
		}
	};


	AblePlayer.prototype.initYouTubeSignPlayer = function () {

		var thisObj, deferred, promise;
		thisObj = this;
		deferred = new this.defer();
		promise = deferred.promise();

		this.youTubeSignPlayerReady = false;

		if (AblePlayer.youTubeIframeAPIReady) {
			// Script already loaded and ready.
			thisObj.finalizeYoutubeSignInit().then(function() {
				deferred.resolve();
			});
		} else {
			// Has another player already started loading the script? If so, abort...
			if ( ! AblePlayer.loadingYouTubeIframeAPI ) {
				thisObj.getScript('https://www.youtube.com/iframe_api', function () {
				});
			}

			// Otherwise, keeping waiting for script load event...
			$('body').on('youTubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeSignInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeSignInit = function () {

		// This is called once we're sure the Youtube iFrame API is loaded -- see above
		var deferred, promise, thisObj, containerId, autoplay;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		containerId = this.mediaId + '_youtube_sign';

		this.$signWindow.append($('<div>').attr('id', containerId));
		autoplay = (this.okToPlay) ? 1 : 0;

		// Documentation https://developers.google.com/youtube/player_parameters
		this.youTubeSignPlayer = new YT.Player(containerId, {
			videoId: this.getYouTubeId(this.signYoutubeId),
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			playerVars: {
				autoplay: autoplay,
				cc_lang_pref: this.captionLang, // set the caption language
				cc_load_policy: 0,
				controls: 0, // no controls, using our own
				disableKb: 1, // disable keyboard shortcuts, using our own
				enablejsapi: 1,
				hl: this.lang, // set the UI language to match Able Player
				iv_load_policy: 3, // do not show video annotations
				origin: window.location.origin,
				playsinline: this.playsInline,
				rel: 0, // when video ends, show only related videos from same channel (1 shows any)
				start: this.startTime
			},
			events: {
				onReady: function (player) {
					player.target.mute();
					player.target.unloadModule( 'captions' );
					thisObj.youTubeSignPlayerReady = true;

					deferred.resolve();
				},
				onError: function (e) {
					deferred.reject();
				},
				onStateChange: function (e) {
					thisObj.getPlayerState().then(function() {
						// no actions
					});
				},
				onApiChange: function() {
					// No actions
				},
				onPlaybackQualityChange: function () {
					// no actions
				},
			}
		});

		return promise;
	};

}

function addTrackFunctions(AblePlayer) {
  // Loads files referenced in track elements, and performs appropriate setup.
  // For example, captions and text descriptions.
  // This will be called whenever the player is recreated.

  AblePlayer.prototype.setupTracks = function () {
    var thisObj, deferred, promise, loadingPromises, loadingPromise, i, tracks, track, kind;

    thisObj = this;

    deferred = new this.defer();
    promise = deferred.promise();

    loadingPromises = [];

    if ($("#able-vts").length) {
      // Page includes a container for a VTS instance
      this.vtsTracks = [];
      this.hasVts = true;
    } else {
      this.hasVts = false;
    }

    // Source array for populating the above arrays
    // varies, depending on whether there are dedicated description tracks
    if (this.hasDescTracks && this.descOn) {
      tracks = this.altTracks;
    } else {
      tracks = this.tracks;
    }
    for (i = 0; i < tracks.length; i++) {
      track = tracks[i];
      kind = ( track.kind ) ? track.kind : 'subtitles';

      if (!track.src) {
        if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
          // skip all the hullabaloo and go straight to setupCaptions
          thisObj.setupCaptions(track);
        }
        continue;
      }
	  var trackSrc = track.src;
      loadingPromise = this.loadTextObject(trackSrc);
      loadingPromises.push(
        loadingPromise.catch(function (src) {
          console.warn("Failed to load captions track from " + src);
        })
      );
      loadingPromise.then(
        (function (track, kind) {
          trackSrc = track.src;
          var trackLang = track.language;
          var trackLabel = track.label;
          var trackDesc = track.desc;

          return function (data) {
            var cues = thisObj.parseWebVTT(data).cues;
            if (thisObj.hasVts) {
              thisObj.setupVtsTracks(
                kind,
                trackLang,
                trackDesc,
                trackLabel,
                trackSrc,
                data.text
              );
            }
            if (kind === 'captions' || kind === 'subtitles') {
              thisObj.setupCaptions(track, cues);
            } else if (kind === 'descriptions') {
              thisObj.setupDescriptions(track, cues);
            } else if (kind === 'chapters') {
              thisObj.setupChapters(track, cues);
            } else if (kind === 'metadata') {
              thisObj.setupMetadata(cues);
            }
          };
        })(track, kind)
      );
    }
    if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
      deferred.resolve();
    } else {
      $.when.apply($, loadingPromises).then(function () {
        deferred.resolve();
      });
    }
    return promise;
  };

  AblePlayer.prototype.getTracks = function () {
    // define an array tracks with the following structure:
    // kind - string, e.g. "captions", "descriptions"
    // src - string, URL of WebVTT source file
    // language - string, lang code
    // label - string to display, e.g., in CC menu
    // def - Boolean, true if this is the default track
    // cues - array with startTime, endTime, and payload
    // desc - Boolean, true if track includes a data-desc attribute

    var thisObj, deferred, promise, trackLang, trackLabel, isDefault, forDesc,
	hasDefault, hasTrackInDefLang, trackFound, i;

    thisObj = this;
    hasDefault = false;

    deferred = new this.defer();
    promise = deferred.promise();

    this.$tracks = this.$media.find('track');
    this.tracks = []; // only includes tracks that do NOT have data-desc
    this.altTracks = []; // only includes tracks that DO have data-desc

    // Arrays for each kind, to be populated later
    this.captions = [];
    this.descriptions = [];
    this.chapters = [];
    this.meta = [];

    this.hasCaptionsTrack = false; // will change to true if one or more tracks has kind="captions"
    this.hasDescTracks = false; // will change to true if one or more tracks has data-desc

    if (this.$tracks.length) {
      this.usingYouTubeCaptions = false;
      // create object from HTML5 tracks
      this.$tracks.each(function (index, element) {
        if ($(this).attr('kind') === 'captions') {
          thisObj.hasCaptionsTrack = true;
        } else if ($(this).attr('kind') === 'descriptions') {
          thisObj.hasClosedDesc = true;
        }

        // srcLang should always be included with <track>, but HTML5 spec doesn't require it
        // if not provided, assume track is the same language as the default player language
        if ($(this).attr('srclang')) {
          trackLang = $(this).attr('srclang');
        } else {
          trackLang = thisObj.lang;
        }
        if ($(this).attr('label')) {
          trackLabel = $(this).attr('label');
        } else {
          trackLabel = thisObj.getLanguageName(trackLang);
        }

        if (typeof $(this).attr('default') !== 'undefined' && !hasDefault) {
          isDefault = true;
          hasDefault = true;
        } else if (trackLang === thisObj.lang) {
          // this track is in the default lang of the player
          // if there is no other default track specified
          // this will be the default
          hasTrackInDefLang = true;
          isDefault = false; // for now; this could change if there's no default attribute
        } else {
          isDefault = false;
        }
        if (isDefault) {
          // this.captionLang will also be the default language for non-caption tracks
          thisObj.captionLang = trackLang;
        }

        if ($(this).data("desc") !== undefined) {
          forDesc = true;
          thisObj.hasDescTracks = true;
        } else {
          forDesc = false;
        }
        if (forDesc) {
          thisObj.altTracks.push({
            kind: $(this).attr('kind'),
            src: $(this).attr('src'),
            language: trackLang,
            label: trackLabel,
            def: isDefault,
            desc: forDesc,
          });
        } else {
          thisObj.tracks.push({
            kind: $(this).attr('kind'),
            src: $(this).attr('src'),
            language: trackLang,
            label: trackLabel,
            def: isDefault,
            desc: forDesc,
          });
        }

        if (index == thisObj.$tracks.length - 1) {
          // This is the last track.
          if (!hasDefault) {
            if (hasTrackInDefLang) {
              thisObj.captionLang = thisObj.lang;
              trackFound = false;
              i = 0;
              while (i < thisObj.tracks.length && !trackFound) {
                if (thisObj.tracks[i]['language'] === thisObj.lang) {
                  thisObj.tracks[i]['def'] = true;
                  trackFound = true;
                }
                i++;
              }
            } else {
              // use the first track
              thisObj.tracks[0]['def'] = true;
              thisObj.captionLang = thisObj.tracks[0]['language'];
            }
          }
          // Remove 'default' attribute from all <track> elements
          // This data has already been saved to this.tracks
          // and some browsers will display the default captions,
          // despite all standard efforts to suppress them
          thisObj.$media.find("track").removeAttr("default");
        }
      });
    }
    if (!this.$tracks.length || !this.hasCaptionsTrack) {
      // this media has no track elements
      // if this is a youtube or vimeo player, check there for captions/subtitles
      if (this.player === 'youtube') {
        this.getYouTubeCaptionTracks().then(function () {
          if (thisObj.hasCaptions) {
            thisObj.usingYouTubeCaptions = true;
            if (thisObj.$captionsWrapper) {
              thisObj.$captionsWrapper.remove();
            }
          }
          deferred.resolve();
        });
      } else if (this.player === 'vimeo') {
        this.getVimeoCaptionTracks().then(function () {
          if (thisObj.hasCaptions) {
            thisObj.usingVimeoCaptions = true;
            if (thisObj.$captionsWrapper) {
              thisObj.$captionsWrapper.remove();
            }
          }
          deferred.resolve();
        });
      } else {
        // this is neither YouTube nor Vimeo
        // there just ain't no tracks (captions or otherwise)
        this.hasCaptions = false;
        if (thisObj.$captionsWrapper) {
          thisObj.$captionsWrapper.remove();
        }
        deferred.resolve();
      }
    } else {
      // there is at least one track with kind="captions"
      deferred.resolve();
    }
    return promise;
  };

  AblePlayer.prototype.setupCaptions = function (track, cues) {
    // Setup player for display of captions (one track at a time)
    var inserted, i, capLabel;

    // Insert track into captions array
    // in its proper alphabetical sequence by label
    if (typeof cues === "undefined") {
      cues = null;
    }

    if (this.usingYouTubeCaptions || this.usingVimeoCaptions) ; else {
      if (this.captions.length === 0) {
        // this is the first
        this.captions.push({
          language: track.language,
          label: track.label,
          def: track.def,
          cues: cues,
        });
      } else {
        // there are already captions in the array
        inserted = false;
        for (i = 0; i < this.captions.length; i++) {
          capLabel = track.label;
          if (capLabel.toLowerCase() < this.captions[i].label.toLowerCase()) {
            // insert before track i
            this.captions.splice(i, 0, {
              language: track.language,
              label: track.label,
              def: track.def,
              cues: cues,
            });
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          // just add track to the end
          this.captions.push({
            language: track.language,
            label: track.label,
            def: track.def,
            cues: cues,
          });
        }
      }
    }

    // there are captions available
    this.hasCaptions = true;
    this.currentCaption = -1;
    if (this.prefCaptions === 1) {
      this.captionsOn = true;
    } else if (this.prefCaptions === 0) {
      this.captionsOn = false;
    } else {
      // user has no prefs. Use default state.
      if (this.defaultStateCaptions === 1) {
        this.captionsOn = true;
      } else {
        this.captionsOn = false;
      }
    }
    if (this.mediaType === 'audio' && this.captionsOn) {
      this.$captionsContainer.removeClass('captions-off');
    }

    if (
      !this.$captionsWrapper ||
      (this.$captionsWrapper &&
        !$.contains(this.$ableDiv[0], this.$captionsWrapper[0]))
    ) {
      // captionsWrapper either doesn't exist, or exists in an orphaned state
      // Either way, it needs to be rebuilt...
      this.$captionsDiv = $('<div>', {
        class: "able-captions",
      });
      this.$captionsWrapper = $('<div>', {
        class: 'able-captions-wrapper',
        'aria-hidden': 'true',
      }).hide();
      if (this.prefCaptionsPosition === 'below') {
        this.$captionsWrapper.addClass('able-captions-below');
      } else {
        this.$captionsWrapper.addClass('able-captions-overlay');
      }
      this.$captionsWrapper.append(this.$captionsDiv);
      this.$captionsContainer.append(this.$captionsWrapper);
    }
  };

  AblePlayer.prototype.setupDescriptions = function (track, cues) {
    // called via setupTracks() only if there is track with kind="descriptions"
    // prepares for delivery of text description , in case it's needed
    // whether and how it's delivered is controlled within description.js > initDescription()

    this.hasClosedDesc = true;
    this.currentDescription = -1;
    this.descriptions.push({
      cues: cues,
      language: track.language,
    });
  };

  AblePlayer.prototype.setupChapters = function (track, cues) {
    // NOTE: WebVTT supports nested timestamps (to form an outline)
    // This is not currently supported.

    this.hasChapters = true;
    this.chapters.push({
      cues: cues,
      language: track.language,
    });
  };

  AblePlayer.prototype.setupMetadata = function (cues) {
    if (this.metaType === 'text') {
      // Metadata is only supported if data-meta-div is provided
      // The player does not display metadata internally
      if (this.metaDiv) {
        if ($('#' + this.metaDiv)) {
          // container exists
          this.$metaDiv = $('#' + this.metaDiv);
          this.hasMeta = true;
          this.meta = cues;
        }
      }
    } else if (this.metaType === 'selector') {
      this.hasMeta = true;
      this.visibleSelectors = [];
      this.meta = cues;
    }
  };

  AblePlayer.prototype.loadTextObject = function (src) {
    var deferred, promise, thisObj, $tempDiv;

    deferred = new this.defer();
    promise = deferred.promise();
    thisObj = this;

    // create a temp div for holding data
    $tempDiv = $('<div>', {
      style: 'display:none',
    });

    // Fetch the content manually so it can be sanitized
	fetch(src)
		.then( response => {

			return response.text();
  		})
		.then( vtt => {
			// Split the input on double line breaks to handle each cue individually.
			var preParsed = vtt.split(/\r?\n\s*\r?\n/);
			var lines = '', line;

			preParsed.forEach((l) => {
				// Sanitize each line.
				line   = validate.sanitizeVttContent(l);
				lines += line + "\n\n";
			});
			// Load the sanitized content into the $tempDiv
			$tempDiv.html(lines);
			// Resolve the promise with the sanitized content
			let data = { 'src': src, 'text': lines };
			deferred.resolve(data);
			$tempDiv.remove();
		})
		.catch( error => {
			if (thisObj.debug) ;
			deferred.reject(src);
			$tempDiv.remove();
		});

    return promise;
  };
}

function addTranscriptFunctions(AblePlayer) {
  AblePlayer.prototype.setupTranscript = function () {
    var deferred = new this.defer();
    var promise = deferred.promise();

    if (this.usingYouTubeCaptions || this.usingVimeoCaptions || this.hideTranscriptButton ) {
      // a transcript is not possible or is disabled.
      this.transcriptType = null;
      deferred.resolve();
    } else {
      if (!this.transcriptType) {
        // previously set transcriptType to null since there are no <track> elements
        // check again to see if captions have been collected from other sources (e.g., YouTube)

        if (this.captions.length) {
          // captions are possible! Use the default type (popup)
          // if other types ('external' and 'manual') were desired, transcriptType would not be null here
          this.transcriptType = "popup";
        }
      }
      if (this.transcriptType) {
        if ( this.transcriptType === "popup" || this.transcriptType === "external" ) {
          this.injectTranscriptArea();
          deferred.resolve();
        } else if (this.transcriptType === "manual") {
          this.setupManualTranscript();
          deferred.resolve();
        }
      } else {
        // there is no transcript
        deferred.resolve();
      }
    }
    return promise;
  };

  AblePlayer.prototype.injectTranscriptArea = function () {
    var $autoScrollLabel,
      $autoScrollContainer,
      $languageSelectWrapper,
      $languageSelectLabel,
      i,
      $option;

    this.$transcriptArea = $("<div>", {
      class: "able-transcript-area",
      role: "dialog",
      "aria-label": this.translate( 'transcriptTitle', 'Transcript' ),
    });

    this.$transcriptToolbar = $("<div>", {
      class: "able-window-toolbar able-" + this.toolbarIconColor + "-controls",
    });

    this.$transcriptDiv = $("<div>", {
      class: "able-transcript",
    });

    // Transcript toolbar content

    // Add auto Scroll checkbox
    this.$autoScrollTranscriptCheckbox = $("<input>", {
      id: "autoscroll-transcript-checkbox-" + this.mediaId,
      type: "checkbox",
    });
    $autoScrollLabel = $("<label>", {
      for: "autoscroll-transcript-checkbox-" + this.mediaId,
    }).text( this.translate( 'autoScroll', 'Auto scroll' ) );
	$autoScrollContainer = $( '<div>', {
		'class': 'autoscroll-transcript'
	});
	$autoScrollContainer.append(
		$autoScrollLabel,
		this.$autoScrollTranscriptCheckbox
	);
    this.$transcriptToolbar.append( $autoScrollContainer );

    // Add field for selecting a transcript language
    // Only necessary if there is more than one language
    if (this.captions.length > 1) {
      $languageSelectWrapper = $("<div>", {
        class: "transcript-language-select-wrapper",
      });
      $languageSelectLabel = $("<label>", {
        for: "transcript-language-select-" + this.mediaId,
      }).text( this.translate( 'language', 'Language' ) );
      this.$transcriptLanguageSelect = $("<select>", {
        id: "transcript-language-select-" + this.mediaId,
      });
      for (i = 0; i < this.captions.length; i++) {
        $option = $("<option></option>", {
          value: this.captions[i]["language"],
          lang: this.captions[i]["language"],
        }).text(this.captions[i]["label"]);
        if (this.captions[i]["def"]) {
          $option.prop("selected", true);
        }
        this.$transcriptLanguageSelect.append($option);
      }
    }
    if ($languageSelectWrapper) {
      $languageSelectWrapper.append(
        $languageSelectLabel,
        this.$transcriptLanguageSelect
      );
      this.$transcriptToolbar.append($languageSelectWrapper);
    }
    this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);

    // If client has provided separate transcript location, put it there.
    // Otherwise append it to the body
    if (this.transcriptDivLocation) {
	  this.$transcriptArea.removeAttr( 'role' );
	  this.$transcriptArea.removeAttr( 'aria-label' );
      $("#" + this.transcriptDivLocation).append(this.$transcriptArea);
    } else {
      this.$ableWrapper.append(this.$transcriptArea);
    }

    // make it draggable (popup only; NOT external transcript)
    if (!this.transcriptDivLocation) {
      this.initDragDrop("transcript");
      if (this.prefTranscript === 1) {
        // transcript is on. Go ahead and position it
        this.positionDraggableWindow(
          "transcript",
          this.getDefaultWidth("transcript")
        );
      }
    }

    // If client has provided separate transcript location, override user's preference for hiding transcript
    if (!this.prefTranscript && !this.transcriptDivLocation) {
      this.$transcriptArea.hide();
    }
  };

  AblePlayer.prototype.addTranscriptAreaEvents = function () {
    var thisObj = this;

    this.$autoScrollTranscriptCheckbox.on( 'click', function () {
      thisObj.handleTranscriptLockToggle(
        thisObj.$autoScrollTranscriptCheckbox.prop("checked")
      );
    });

    this.$transcriptDiv.on(
      "mousewheel DOMMouseScroll click scroll",
      function (e) {
        // Propagation is stopped in transcript click handler, so clicks are on the scrollbar
        // or outside of a clickable span.
        if (!thisObj.scrollingTranscript) {
          thisObj.autoScrollTranscript = false;
          thisObj.refreshControls("transcript");
        }
        thisObj.scrollingTranscript = false;
      }
    );

    if (typeof this.$transcriptLanguageSelect !== "undefined") {
      this.$transcriptLanguageSelect.on('click', function (e) {
        // execute default behavior
        // prevent propagation of mouse event to toolbar or window
        e.stopPropagation();
      });

      this.$transcriptLanguageSelect.on("change", function () {
        var language = thisObj.$transcriptLanguageSelect.val();

        thisObj.syncTrackLanguages("transcript", language);
      });
    }
  };

  AblePlayer.prototype.transcriptSrcHasRequiredParts = function () {
    // check the external transcript to be sure it has all required components
    // return true or false
    // in the process, define all the needed variables and properties

    if ($("#" + this.transcriptSrc).length) {
      this.$transcriptArea = $("#" + this.transcriptSrc);
      if (this.$transcriptArea.find(".able-window-toolbar").length) {
        this.$transcriptToolbar = this.$transcriptArea
          .find(".able-window-toolbar")
          .eq(0);
        if (this.$transcriptArea.find(".able-transcript").length) {
          this.$transcriptDiv = this.$transcriptArea
            .find(".able-transcript")
            .eq(0);
          if (this.$transcriptArea.find(".able-transcript-seekpoint").length) {
            this.$transcriptSeekpoints = this.$transcriptArea.find(
              ".able-transcript-seekpoint"
            );
            return true;
          }
        }
      }
    }
    return false;
  };

  AblePlayer.prototype.setupManualTranscript = function () {
    var $autoScrollInput, $autoScrollLabel;

    $autoScrollInput = $("<input>", {
      id: "autoscroll-transcript-checkbox-" + this.mediaId,
      type: "checkbox",
    });
    $autoScrollLabel = $("<label>", {
      for: "autoscroll-transcript-checkbox-" + this.mediaId,
    }).text( this.translate( 'autoScroll', 'Auto scroll' ) );

    // Add an auto-scroll checkbox to the toolbar.
    this.$autoScrollTranscriptCheckbox = $autoScrollInput;
    this.$transcriptToolbar.append(
      $autoScrollLabel,
      this.$autoScrollTranscriptCheckbox
    );
  };

  AblePlayer.prototype.updateTranscript = function () {
    if (!this.transcriptType) {
      return;
    }
    if (this.playerCreated && !this.$transcriptArea) {
      return;
    }
    if (this.transcriptType === "external" || this.transcriptType === "popup") {
      var chapters, captions, descriptions;

      // Language of transcript might be different than language of captions
      // But both are in sync by default
      if (this.transcriptLang) {
        captions = this.transcriptCaptions.cues;
      } else {
        if (this.transcriptCaptions) {
          this.transcriptLang = this.transcriptCaptions.language;
          captions = this.transcriptCaptions.cues;
        } else if (this.selectedCaptions) {
          this.transcriptLang = this.captionLang;
          captions = this.selectedCaptions.cues;
        }
      }

      // setup chapters
      if (this.transcriptChapters) {
        chapters = this.transcriptChapters.cues;
      } else if (this.chapters.length > 0) {
        // Try and match the caption language.
        if (this.transcriptLang) {
          for (var i = 0; i < this.chapters.length; i++) {
            if (this.chapters[i].language === this.transcriptLang) {
              chapters = this.chapters[i].cues;
            }
          }
        }
        if (typeof chapters === "undefined") {
          chapters = this.chapters[0].cues || [];
        }
      }

      // setup descriptions
      if (this.transcriptDescriptions) {
        descriptions = this.transcriptDescriptions.cues;
      } else if (this.descriptions.length > 0) {
        // Try and match the caption language.
        if (this.transcriptLang) {
          for (i = 0; i < this.descriptions.length; i++) {
            if (this.descriptions[i].language === this.transcriptLang) {
              descriptions = this.descriptions[i].cues;
            }
          }
        }
        if (!descriptions) {
          descriptions = this.descriptions[0].cues || [];
        }
      }

      var div = this.generateTranscript(
        chapters || [],
        captions || [],
        descriptions || []
      );
      this.$transcriptDiv.html(div);
      // reset transcript selected <option> to this.transcriptLang
      if (this.$transcriptLanguageSelect) {
        this.$transcriptLanguageSelect
          .find("option:selected")
          .prop("selected", false);
        this.$transcriptLanguageSelect
          .find("option[lang=" + this.transcriptLang + "]")
          .prop("selected", true);
      }
    }

    var thisObj = this;

    // Make transcript tabbable if preference is turned on.
    if (this.prefTabbable === 1) {
      this.$transcriptDiv
        .find("span.able-transcript-seekpoint")
        .attr("tabindex", "0");
    }

    // handle clicks on text within transcript
    // Note: This event listeners handles clicks only, not keydown events
    // Pressing Enter on an element that is not natively clickable does NOT trigger click()
    // Keydown events are handled elsehwere, both globally (ableplayer-base.js) and locally (event.js)
    if (this.$transcriptArea.length > 0) {
      this.$transcriptArea
        .find("span.able-transcript-seekpoint")
        .on( 'click', function (e) {
          thisObj.seekTrigger = "transcript";
          var spanStart = parseFloat($(this).attr("data-start"));
          // Add a tiny amount so that we're inside the span.
          spanStart += 0.01;
          // Each click within the transcript triggers two click events (not sure why)
          // this.seekingFromTranscript is a stopgab to prevent two calls to SeekTo()
          if (!thisObj.seekingFromTranscript) {
            thisObj.seekingFromTranscript = true;
            thisObj.seekTo(spanStart);
          } else {
            // don't seek a second time, but do reset var
            thisObj.seekingFromTranscript = false;
          }
        });
    }
  };

  AblePlayer.prototype.highlightTranscript = function (currentTime) {
    // Show highlight in transcript marking current caption.

    if (!this.transcriptType) {
      return;
    }

    var start, end, isChapterHeading;
    var thisObj = this;

    currentTime = parseFloat(currentTime);

    // Highlight the current transcript item.
    this.$transcriptArea
      .find("span.able-transcript-seekpoint")
      .each(function () {
        start = parseFloat($(this).attr("data-start"));
        end = parseFloat($(this).attr("data-end"));
        // be sure this isn't a chapter (don't highlight chapter headings)
        if ($(this).parent().hasClass("able-transcript-chapter-heading")) {
          isChapterHeading = true;
        } else {
          isChapterHeading = false;
        }

        if (currentTime >= start && currentTime <= end && !isChapterHeading) {
          // If this item isn't already highlighted, it should be
          if (!$(this).hasClass("able-highlight")) {
            // remove all previous highlights before adding one to current span
            thisObj.$transcriptArea
              .find(".able-highlight")
              .removeClass("able-highlight");
            $(this).addClass("able-highlight");
            thisObj.movingHighlight = true;
          }
          return false;
        }
      });
    thisObj.currentHighlight = thisObj.$transcriptArea.find(".able-highlight");
    if (thisObj.currentHighlight.length === 0) {
      // Nothing highlighted.
      thisObj.currentHighlight = null;
    }
  };

  AblePlayer.prototype.generateTranscript = function (
    chapters,
    captions,
    descriptions
  ) {
    var thisObj = this;

    var $main = $('<div class="able-transcript-container"></div>');
    var transcriptTitle, firstStart;

    // set language for transcript container
    $main.attr("lang", this.transcriptLang);

    if (typeof this.transcriptTitle !== "undefined") {
      transcriptTitle = this.transcriptTitle;
    } else if (this.lyricsMode) {
      transcriptTitle = this.translate( 'lyricsTitle', 'Lyrics' );
    } else {
      transcriptTitle = this.translate( 'transcriptTitle', 'Transcript' );
    }

    if (!this.transcriptDivLocation) {
      // only add an HTML heading to internal transcript
      // external transcript is expected to have its own heading
      var headingNumber = this.playerHeadingLevel;
      headingNumber += 1;
      var chapterHeadingNumber = headingNumber + 1;

      let transcriptHeading;
      if (headingNumber <= 6) {
        transcriptHeading = "h" + headingNumber.toString();
      } else {
        transcriptHeading = "div";
      }
      var $transcriptHeadingTag = $("<" + transcriptHeading + ">");
      $transcriptHeadingTag.addClass("able-transcript-heading");
      if (headingNumber > 6) {
        $transcriptHeadingTag.attr({
          role: "heading",
          "aria-level": headingNumber,
        });
      }
      $transcriptHeadingTag.text(transcriptTitle);

      // set language of transcript heading to language of player
      // this is independent of language of transcript
      $transcriptHeadingTag.attr("lang", this.lang);

      $main.append($transcriptHeadingTag);
    }

    var nextChapter = 0;
    var nextCap = 0;
    var nextDesc = 0;

    var addChapter = function (div, chap) {
      let chapterHeading;
      if (chapterHeadingNumber <= 6) {
        chapterHeading = "h" + chapterHeadingNumber.toString();
      } else {
        chapterHeading = "div";
      }

      var $chapterHeadingTag = $("<" + chapterHeading + ">", {
        class: "able-transcript-chapter-heading",
      });
      if (chapterHeadingNumber > 6) {
        $chapterHeadingTag.attr({
          role: "heading",
          "aria-level": chapterHeadingNumber,
        });
      }

      var flattenComponentForChapter = function (comp) {
        var result = [];
        if (comp.type === "string") {
          result.push(comp.value);
        } else {
          for (var i = 0; i < comp.children.length; i++) {
            result = result.concat(
              flattenComponentForChapter(comp.children[i])
            );
          }
        }
        return result;
      };

      var $chapSpan = $("<span>", {
        class: "able-transcript-seekpoint",
      });
      for (var i = 0; i < chap.components.children.length; i++) {
        var results = flattenComponentForChapter(chap.components.children[i]);
        for (var jj = 0; jj < results.length; jj++) {
          $chapSpan.append(results[jj]);
        }
      }
      $chapSpan.attr("data-start", chap.start.toString());
      $chapSpan.attr("data-end", chap.end.toString());
      $chapterHeadingTag.append($chapSpan);

      div.append($chapterHeadingTag);
    };

    var addDescription = function (div, desc) {
      var $descDiv = $("<div>", {
        class: "able-transcript-desc",
      });
      var $descHiddenSpan = $("<span>", {
        class: "able-hidden",
      });
      $descHiddenSpan.attr("lang", thisObj.lang);
      $descHiddenSpan.text( thisObj.translate( 'prefHeadingDescription', 'Audio description' ) + ": ");
      $descDiv.append($descHiddenSpan);

      var flattenComponentForDescription = function (comp) {
        var result = [];
        if (comp.type === "string") {
          result.push(comp.value);
        } else {
          for (var i = 0; i < comp.children.length; i++) {
            result = result.concat(
              flattenComponentForDescription(comp.children[i])
            );
          }
        }
        return result;
      };

      var $descSpan = $("<span>", {
        class: "able-transcript-seekpoint",
      });
      for (var i = 0; i < desc.components.children.length; i++) {
        var results = flattenComponentForDescription(
          desc.components.children[i]
        );
        for (var jj = 0; jj < results.length; jj++) {
          $descSpan.append(results[jj]);
        }
      }
      $descSpan.attr("data-start", desc.start.toString());
      $descSpan.attr("data-end", desc.end.toString());
      $descDiv.append($descSpan);

      div.append($descDiv);
    };

    var addCaption = function (div, cap) {
      var $capSpan = $("<span>", {
        class: "able-transcript-seekpoint able-transcript-caption",
      });

      var flattenComponentForCaption = function (comp) {
        var result = [];

        var parts = 0;

        var flattenString = function (str) {
          parts++;

          var flatStr;
          var result = [];
          if (str === "") {
            return result;
          }

          var openBracket = str.indexOf("[");
          var closeBracket = str.indexOf("]");
          var openParen = str.indexOf("(");
          var closeParen = str.indexOf(")");

          var hasBrackets = openBracket !== -1 && closeBracket !== -1;
          var hasParens = openParen !== -1 && closeParen !== -1;

          if (hasParens || hasBrackets) {
            let silentSpanBreak;
            if (parts > 1) {
              // force a line break between sections that contain parens or brackets
              silentSpanBreak = "<br/>";
            } else {
              silentSpanBreak = "";
            }
            var silentSpanOpen =
              silentSpanBreak + '<span class="able-unspoken">';
            var silentSpanClose = "</span>";
            if (hasParens && hasBrackets) {
              // string has both!
              if (openBracket < openParen) {
                // brackets come first. Parse parens separately
                hasParens = false;
              } else {
                // parens come first. Parse brackets separately
                hasBrackets = false;
              }
            }
          }
          if (hasParens) {
            flatStr = str.substring(0, openParen);
            flatStr += silentSpanOpen;
            flatStr += str.substring(openParen, closeParen + 1);
            flatStr += silentSpanClose;
            flatStr += flattenString(str.substring(closeParen + 1));
            result.push(flatStr);
          } else if (hasBrackets) {
            flatStr = str.substring(0, openBracket);
            flatStr += silentSpanOpen;
            flatStr += str.substring(openBracket, closeBracket + 1);
            flatStr += silentSpanClose;
            flatStr += flattenString(str.substring(closeBracket + 1));
            result.push(flatStr);
          } else {
            result.push(str);
          }
          return result;
        };

        if (comp.type === "string") {
          result = result.concat(flattenString(comp.value));
        } else if (comp.type === "v") {
          var $vSpan = $("<span>", {
            class: "able-unspoken",
          });
          // don't display "title=" when rendering the voice tag title in the transcript
          comp.value = comp.value.replace(/^title="|"$/g, "");
          $vSpan.text("(" + comp.value + ")");
          result.push($vSpan);
          for (var i = 0; i < comp.children.length; i++) {
            let subResults = flattenComponentForCaption(comp.children[i]);
            for (let jj = 0; jj < subResults.length; jj++) {
              result.push(subResults[jj]);
            }
          }
        } else if (comp.type === "b" || comp.type === "i") {
          let $tag;
          if (comp.type === "b") {
            $tag = $("<strong>");
          } else if (comp.type === "i") {
            $tag = $("<em>");
          }
          for (i = 0; i < comp.children.length; i++) {
            let subResults = flattenComponentForCaption(comp.children[i]);
            for (let jj = 0; jj < subResults.length; jj++) {
              $tag.append(subResults[jj]);
            }
          }
          if (comp.type === "b" || comp.type == "i") {
            result.push($tag);
          }
        } else {
          for (i = 0; i < comp.children.length; i++) {
            result = result.concat(
              flattenComponentForCaption(comp.children[i])
            );
          }
        }
        return result;
      };

      for (var i = 0; i < cap.components.children.length; i++) {
		var next_child_tagname;
		if ( i < cap.components.children.length - 1 ) {
			next_child_tagname = cap.components.children[i + 1].tagName;
		}
        var results = flattenComponentForCaption(cap.components.children[i]);
        for (var jj = 0; jj < results.length; jj++) {
          var result = results[jj];
          if (typeof result === "string") {
           	if (thisObj.lyricsMode) {
				// add <br> WITHIN each caption (if payload includes "\n")
				result = result.replace(/\n/g,'<br>');

				// add <br> BETWEEN each caption, but do not consider sibling style tags within this caption as the next caption!
				if ( !next_child_tagname || ( next_child_tagname !== 'i' && next_child_tagname !== 'b' ) ) {
					result += '<br>';
				}
            } else {
              // just add a space between captions
              result += " ";
            }
          }
          $capSpan.append(result);
        }
      }
      $capSpan.attr("data-start", cap.start.toString());
      $capSpan.attr("data-end", cap.end.toString());
      div.append($capSpan);
      div.append(" \n");
    };

    // keep looping as long as any one of the three arrays has content
    while (
      nextChapter < chapters.length ||
      nextDesc < descriptions.length ||
      nextCap < captions.length
    ) {
      if (
        nextChapter < chapters.length &&
        nextDesc < descriptions.length &&
        nextCap < captions.length
      ) {
        // they all three have content
        firstStart = Math.min(
          chapters[nextChapter].start,
          descriptions[nextDesc].start,
          captions[nextCap].start
        );
      } else if (
        nextChapter < chapters.length &&
        nextDesc < descriptions.length
      ) {
        // chapters & descriptions have content
        firstStart = Math.min(
          chapters[nextChapter].start,
          descriptions[nextDesc].start
        );
      } else if (nextChapter < chapters.length && nextCap < captions.length) {
        // chapters & captions have content
        firstStart = Math.min(
          chapters[nextChapter].start,
          captions[nextCap].start
        );
      } else if (nextDesc < descriptions.length && nextCap < captions.length) {
        // descriptions & captions have content
        firstStart = Math.min(
          descriptions[nextDesc].start,
          captions[nextCap].start
        );
      } else {
        firstStart = null;
      }
      if (firstStart !== null) {
        if (
          typeof chapters[nextChapter] !== "undefined" &&
          chapters[nextChapter].start === firstStart
        ) {
          addChapter($main, chapters[nextChapter]);
          nextChapter += 1;
        } else if (
          typeof descriptions[nextDesc] !== "undefined" &&
          descriptions[nextDesc].start === firstStart
        ) {
          addDescription($main, descriptions[nextDesc]);
          nextDesc += 1;
        } else {
          addCaption($main, captions[nextCap]);
          nextCap += 1;
        }
      } else {
        if (nextChapter < chapters.length) {
          addChapter($main, chapters[nextChapter]);
          nextChapter += 1;
        } else if (nextDesc < descriptions.length) {
          addDescription($main, descriptions[nextDesc]);
          nextDesc += 1;
        } else if (nextCap < captions.length) {
          addCaption($main, captions[nextCap]);
          nextCap += 1;
        }
      }
    }
    // organize transcript into blocks using [] and () as starting points
    var $components = $main.children();
    var spanCount = 0;
    $components.each(function () {
      if ($(this).hasClass("able-transcript-caption")) {
        if (
          $(this).text().indexOf("[") !== -1 ||
          $(this).text().indexOf("(") !== -1
        ) {
          // this caption includes a bracket or parenth. Start a new block
          // close the previous block first
          if (spanCount > 0) {
            $main = wrapTranscriptBlocks( $main );
            spanCount = 0;
          }
        }
        $(this).addClass("able-block-temp");
        spanCount++;
      } else {
        // this is not a caption. Close the caption block
        if (spanCount > 0) {
          $main = wrapTranscriptBlocks( $main );
          spanCount = 0;
        }
      }
    });
	// Close out remaining temp blocks.
	$main = wrapTranscriptBlocks( $main );

    return $main;
  };

  var wrapTranscriptBlocks = function( $main ) {
	$main.find(".able-block-temp")
		.removeClass("able-block-temp")
		.wrapAll('<div class="able-transcript-block"></div>');

	return $main;
  };
}

var playerHeading$k = "Reproductor";
var audioPlayer$k = "Reproductor d'àudio";
var videoPlayer$k = "Reproductor de vídeo";
var faster$k = "Ràpid";
var slower$k = "Lent";
var play$k = "Reprodueix";
var pause$k = "Pausa";
var restart$k = "Reinicia";
var prevTrack$k = "Pista anterior";
var nextTrack$k = "Pista següent";
var rewind$k = "Endarrere";
var forward$k = "Endavant";
var captions$k = "Subtítols";
var showCaptions$k = "Mostra els subtítols";
var hideCaptions$k = "Oculta els subtítols";
var captionsOff$k = "Desactiva els subtítols";
var showTranscript$k = "Mostra la transcripció";
var hideTranscript$k = "Oculta la transcripció";
var turnOnDescriptions$k = "Activa l'audiodescripció";
var turnOffDescriptions$k = "Desactiva l'audiodescripció";
var chapters$k = "Capítols";
var language$k = "Idioma";
var sign$k = "Llengua de signes";
var showSign$k = "Mostra la llengua de signes";
var hideSign$k = "Oculta la llengua de signes";
var seekbarLabel$k = "Línia de temps";
var mute$k = "Silencia";
var unmute$k = "Activa el so";
var volume$k = "Volum";
var volumeUpDown$k = "Apuja i abaixa el volum";
var preferences$k = "Preferències";
var enterFullScreen$k = "Entra en el mode de pantalla completa";
var exitFullScreen$k = "Surt del mode de pantalla completa";
var speed$k = "Velocitat";
var spacebar$k = "Barra espaiadora";
var transcriptTitle$k = "Transcripció";
var lyricsTitle$k = "Lletra";
var autoScroll$k = "Desplaçament automàtic";
var statusPlaying$k = "S'està reproduint";
var statusPaused$k = "En pausa";
var statusStopped$k = "Aturat";
var statusBuffering$k = "Emmagatzemant";
var statusEnd$k = "Fi de pista";
var selectedTrack$j = "Pista seleccionada";
var alertDescribedVersion$j = "S'està utilitzant la versió amb audiodescripció del vídeo";
var alertNonDescribedVersion$j = "S'està utilitzant la versió sense audiodescripció del vídeo";
var prefMenuCaptions$k = "Subtítols";
var prefVoicedCaptions$k = "Spoken Captions";
var prefMenuDescriptions$k = "Descripcions";
var prefMenuKeyboard$k = "Teclat";
var prefMenuTranscript$k = "Transcripció";
var prefTitleCaptions$k = "Preferències dels subtítols";
var prefTitleDescriptions$k = "Preferències de l'audiodescripció";
var prefTitleKeyboard$k = "Preferències del teclat";
var prefTitleTranscript$j = "Preferències de la transcripció";
var prefIntroDescription1$j = "Aquest reproductor suporta l'audiodescripció de dues maneres: ";
var prefDescription1$k = "L'actual vídeo té una versió alternativa amb audiodescripció, descripció textual anunciada pel lector de pantalla.";
var prefDescription2$k = "L'actual vídeo té una versió alternativa amb audiodescripció.";
var prefDescription3$k = "L'actual vídeo té descripció textual.";
var prefIntroDescriptionNone$k = "L'actual vídeo no disposa d'audiodescripció en cap format.";
var prefIntroDescription3$k = "Utilitzeu el formulari següent per definir les preferències relacionades amb l'audiodescripció textual.";
var prefIntroDescription4$k = "Desprès de desar la configuració, podeu commutar l'ús de l'audiodescripció amb el mateix botó.";
var prefIntroKeyboard1$k = "Aquest reproductor pot ser utilitzat des de qualsevol lloc de la pàgina utilitzant les dreceres de teclat (vegeu la llista a continuació).";
var prefIntroKeyboard2$k = "A continuació, podeu asignar les tecles modificadores (Majúscules, Alt, i la tecla d'inserció).";
var prefIntroKeyboard3$k = "NOTA: algunes combinacions de tecles poden entrar en conflicte amb les utilitzades pel navegador o altres aplicacions. Proveu diferents combinacions o tecles modificadores fins a trobar les adequades en cada cas.";
var prefHeadingKeyboard1$k = "Tecles modificadores emprades com a dreceres de teclat";
var prefHeadingKeyboard2$k = "Dreceres de teclat actuals";
var prefHeadingDescription$k = "Audiodescripció";
var prefHeadingTextDescription$k = "Audiodescripció textual";
var prefAltKey$k = "Alt";
var prefCtrlKey$k = "Control";
var prefShiftKey$k = "Majúscula";
var prefNoKeyShortcuts$k = "Desactiva les dreceres de teclat";
var escapeKey$k = "Escapada";
var escapeKeyFunction$k = "Tanca el diàleg o finestre emergent actual";
var prefDescPause$k = "Pausa automàticament el vídeo en el moment que comenci una audiodescripció";
var prefDescVisible$k = "Fes visible la audiodescripció textual si es troba activada";
var prefDescVoice$k = "Veu";
var prefDescRate$k = "Spoken Description Rate";
var prefCaptionRate$k = "Spoken Caption Rate";
var prefDescPitch$k = "Tonalitat";
var prefDescPitch1$k = "Molt baixa";
var prefDescPitch2$k = "Baixa";
var prefDescPitch3$k = "Per defecte";
var prefDescPitch4$k = "Alta";
var prefDescPitch5$k = "Molt alta";
var sampleDescriptionText$k = "Ajusta la configuració per escoltar aquest text de mostra.";
var prefHighlight$k = "Ressalta la transcripció a mesura que avança el contingut";
var prefTabbable$k = "Transcripció operable per teclat";
var prefCaptionsFont$k = "Tipus de lletra";
var prefCaptionsColor$k = "Color del text";
var prefCaptionsBGColor$k = "Fons";
var prefCaptionsSize$k = "Mida del text";
var prefCaptionsOpacity$k = "Opacitat";
var prefCaptionsStyle$k = "Estil";
var serif$k = "Serifa";
var sans$k = "Sensa serifa";
var cursive$k = "Cursiva";
var fantasy$k = "fantasia";
var monospace$k = "Monoespaiada";
var white$k = "Blanc";
var yellow$k = "Groc";
var green$k = "Verd";
var cyan$j = "Cian";
var blue$k = "Blau";
var magenta$k = "Magenta";
var red$k = "Vermell";
var black$k = "Negre";
var transparent$k = "transparent";
var solid$k = "Sòlid";
var captionsStylePopOn$k = "Aparició instantània";
var captionsStyleRollUp$k = "Desplaçament cap amunt";
var prefCaptionsPosition$k = "Posició";
var captionsPositionOverlay$k = "Superposició";
var captionsPositionBelow$k = "A continuació del vídeo";
var sampleCaptionText$k = "Text de mostra dels subtítols";
var prefSuccess$k = "S'han desat els canvis.";
var prefNoChange$k = "No s'ha fet cap canvi.";
var save$k = "Desa";
var cancel$k = "Cancel·la";
var dismissButton$k = "Ignora";
var windowButtonLabel$k = "Opcions de la finestra";
var windowMove$k = "Moure";
var windowMoveLeft$k = "Finestra desplaçada cap a l'esquerra";
var windowMoveRight$k = "Finestra desplaçada cap a la dreta";
var windowMoveUp$k = "Finestra desplaçada cap amunt";
var windowMoveDown$k = "Finestra desplaçada cap avall";
var windowMoveStopped$k = "S'ha aturat el desplaçament de la finestra";
var transcriptControls$k = "Controls de la finestra de transcripció";
var signControls$k = "Controls de la finestra de llengua de signes";
var windowMoveAlert$k = "Arrossegueu o feu servir les tecles de direcció per moure la finestra, polseu retorn per aturar.";
var windowResize$k = "Redimensiona";
var windowResizeHeading$k = "Redimensiona la finestra amb l'intèrpret";
var closeButtonLabel$k = "Tanca";
var width$k = "Amplada";
var height$k = "Alçada";
var resultsSummary1$k = "Heu cercat:";
var resultsSummary2$k = "S'han trobat %1 elements coincidents.";
var resultsSummary3$k = "Feu clic al moment associat a qualsevol element per reproduir el vídeo des d'aquell punt.";
var noResultsFound$k = "No s'han trobat resultats.";
var searchButtonLabel$k = "Reprodueix a %1";
var hour$k = "hora";
var minute$j = "minut";
var second$k = "segon";
var hours$k = "hores";
var minutes$k = "minuts";
var seconds$k = "segons";
var vtsHeading$k = "Gestor de transcripcions de vídeo";
var vtsInstructions1$k = "Utilitzeu el gestor de transcripcions de vídeo per modificar les pistes de text:";
var vtsInstructions2$k = "Reordeneu capítols, descripcions, subtítols o subtítols per a persones sordes perquè apareguin en la seqüència correcta a la transcripció generada automàticament per Able Player.";
var vtsInstructions3$k = "Modifiqueu el contingut o els temps d'inici i final (tots són editables directament a la taula).";
var vtsInstructions4$k = "Afegiu contingut nou, com ara capítols o descripcions.";
var vtsInstructions5$k = "Després d'editar, feu clic al botó \"Desa els canvis\" per generar contingut nou per a tots els fitxers de text temporitzat rellevants. El text nou es pot copiar i enganxar en fitxers WebVTT nous.";
var vtsSelectLanguage$k = "Seleccioneu una llengua";
var vtsSave$k = "Genera contingut .vtt nou";
var vtsReturn$k = "Torna a l'editor";
var vtsCancel$k = "S'ha cancel·lat el desament. Totes les edicions que heu fet s'han restaurat a la taula del GTV.";
var vtsRow$k = "Fila";
var vtsKind$k = "Tipus";
var vtsStart$k = "Inici";
var vtsEnd$k = "Final";
var vtsContent$k = "Contingut";
var vtsActions$k = "Accions";
var vtsNewRow$k = "S'ha inserit una fila nova %1.";
var vtsDeletedRow$k = "S'ha suprimit la fila %1.";
var vtsMovedRow$k = "La fila %1 s'ha mogut %2 i ara és la fila %3.";
var ca = {
	playerHeading: playerHeading$k,
	audioPlayer: audioPlayer$k,
	videoPlayer: videoPlayer$k,
	faster: faster$k,
	slower: slower$k,
	play: play$k,
	pause: pause$k,
	restart: restart$k,
	prevTrack: prevTrack$k,
	nextTrack: nextTrack$k,
	rewind: rewind$k,
	forward: forward$k,
	captions: captions$k,
	showCaptions: showCaptions$k,
	hideCaptions: hideCaptions$k,
	captionsOff: captionsOff$k,
	showTranscript: showTranscript$k,
	hideTranscript: hideTranscript$k,
	turnOnDescriptions: turnOnDescriptions$k,
	turnOffDescriptions: turnOffDescriptions$k,
	chapters: chapters$k,
	language: language$k,
	sign: sign$k,
	showSign: showSign$k,
	hideSign: hideSign$k,
	seekbarLabel: seekbarLabel$k,
	mute: mute$k,
	unmute: unmute$k,
	volume: volume$k,
	volumeUpDown: volumeUpDown$k,
	preferences: preferences$k,
	enterFullScreen: enterFullScreen$k,
	exitFullScreen: exitFullScreen$k,
	speed: speed$k,
	spacebar: spacebar$k,
	transcriptTitle: transcriptTitle$k,
	lyricsTitle: lyricsTitle$k,
	autoScroll: autoScroll$k,
	statusPlaying: statusPlaying$k,
	statusPaused: statusPaused$k,
	statusStopped: statusStopped$k,
	statusBuffering: statusBuffering$k,
	statusEnd: statusEnd$k,
	selectedTrack: selectedTrack$j,
	alertDescribedVersion: alertDescribedVersion$j,
	alertNonDescribedVersion: alertNonDescribedVersion$j,
	prefMenuCaptions: prefMenuCaptions$k,
	prefVoicedCaptions: prefVoicedCaptions$k,
	prefMenuDescriptions: prefMenuDescriptions$k,
	prefMenuKeyboard: prefMenuKeyboard$k,
	prefMenuTranscript: prefMenuTranscript$k,
	prefTitleCaptions: prefTitleCaptions$k,
	prefTitleDescriptions: prefTitleDescriptions$k,
	prefTitleKeyboard: prefTitleKeyboard$k,
	prefTitleTranscript: prefTitleTranscript$j,
	prefIntroDescription1: prefIntroDescription1$j,
	prefDescription1: prefDescription1$k,
	prefDescription2: prefDescription2$k,
	prefDescription3: prefDescription3$k,
	prefIntroDescriptionNone: prefIntroDescriptionNone$k,
	prefIntroDescription3: prefIntroDescription3$k,
	prefIntroDescription4: prefIntroDescription4$k,
	prefIntroKeyboard1: prefIntroKeyboard1$k,
	prefIntroKeyboard2: prefIntroKeyboard2$k,
	prefIntroKeyboard3: prefIntroKeyboard3$k,
	prefHeadingKeyboard1: prefHeadingKeyboard1$k,
	prefHeadingKeyboard2: prefHeadingKeyboard2$k,
	prefHeadingDescription: prefHeadingDescription$k,
	prefHeadingTextDescription: prefHeadingTextDescription$k,
	prefAltKey: prefAltKey$k,
	prefCtrlKey: prefCtrlKey$k,
	prefShiftKey: prefShiftKey$k,
	prefNoKeyShortcuts: prefNoKeyShortcuts$k,
	escapeKey: escapeKey$k,
	escapeKeyFunction: escapeKeyFunction$k,
	prefDescPause: prefDescPause$k,
	prefDescVisible: prefDescVisible$k,
	prefDescVoice: prefDescVoice$k,
	prefDescRate: prefDescRate$k,
	prefCaptionRate: prefCaptionRate$k,
	prefDescPitch: prefDescPitch$k,
	prefDescPitch1: prefDescPitch1$k,
	prefDescPitch2: prefDescPitch2$k,
	prefDescPitch3: prefDescPitch3$k,
	prefDescPitch4: prefDescPitch4$k,
	prefDescPitch5: prefDescPitch5$k,
	sampleDescriptionText: sampleDescriptionText$k,
	prefHighlight: prefHighlight$k,
	prefTabbable: prefTabbable$k,
	prefCaptionsFont: prefCaptionsFont$k,
	prefCaptionsColor: prefCaptionsColor$k,
	prefCaptionsBGColor: prefCaptionsBGColor$k,
	prefCaptionsSize: prefCaptionsSize$k,
	prefCaptionsOpacity: prefCaptionsOpacity$k,
	prefCaptionsStyle: prefCaptionsStyle$k,
	serif: serif$k,
	sans: sans$k,
	cursive: cursive$k,
	fantasy: fantasy$k,
	monospace: monospace$k,
	white: white$k,
	yellow: yellow$k,
	green: green$k,
	cyan: cyan$j,
	blue: blue$k,
	magenta: magenta$k,
	red: red$k,
	black: black$k,
	transparent: transparent$k,
	solid: solid$k,
	captionsStylePopOn: captionsStylePopOn$k,
	captionsStyleRollUp: captionsStyleRollUp$k,
	prefCaptionsPosition: prefCaptionsPosition$k,
	captionsPositionOverlay: captionsPositionOverlay$k,
	captionsPositionBelow: captionsPositionBelow$k,
	sampleCaptionText: sampleCaptionText$k,
	prefSuccess: prefSuccess$k,
	prefNoChange: prefNoChange$k,
	save: save$k,
	cancel: cancel$k,
	dismissButton: dismissButton$k,
	windowButtonLabel: windowButtonLabel$k,
	windowMove: windowMove$k,
	windowMoveLeft: windowMoveLeft$k,
	windowMoveRight: windowMoveRight$k,
	windowMoveUp: windowMoveUp$k,
	windowMoveDown: windowMoveDown$k,
	windowMoveStopped: windowMoveStopped$k,
	transcriptControls: transcriptControls$k,
	signControls: signControls$k,
	windowMoveAlert: windowMoveAlert$k,
	windowResize: windowResize$k,
	windowResizeHeading: windowResizeHeading$k,
	closeButtonLabel: closeButtonLabel$k,
	width: width$k,
	height: height$k,
	resultsSummary1: resultsSummary1$k,
	resultsSummary2: resultsSummary2$k,
	resultsSummary3: resultsSummary3$k,
	noResultsFound: noResultsFound$k,
	searchButtonLabel: searchButtonLabel$k,
	hour: hour$k,
	minute: minute$j,
	second: second$k,
	hours: hours$k,
	minutes: minutes$k,
	seconds: seconds$k,
	vtsHeading: vtsHeading$k,
	vtsInstructions1: vtsInstructions1$k,
	vtsInstructions2: vtsInstructions2$k,
	vtsInstructions3: vtsInstructions3$k,
	vtsInstructions4: vtsInstructions4$k,
	vtsInstructions5: vtsInstructions5$k,
	vtsSelectLanguage: vtsSelectLanguage$k,
	vtsSave: vtsSave$k,
	vtsReturn: vtsReturn$k,
	vtsCancel: vtsCancel$k,
	vtsRow: vtsRow$k,
	vtsKind: vtsKind$k,
	vtsStart: vtsStart$k,
	vtsEnd: vtsEnd$k,
	vtsContent: vtsContent$k,
	vtsActions: vtsActions$k,
	vtsNewRow: vtsNewRow$k,
	vtsDeletedRow: vtsDeletedRow$k,
	vtsMovedRow: vtsMovedRow$k
};

var playerHeading$j = "Přehrávač médií";
var audioPlayer$j = "Audio player";
var videoPlayer$j = "Video player";
var faster$j = "Rychleji";
var slower$j = "Pomaleji";
var play$j = "Spustit";
var pause$j = "Pauza";
var restart$j = "Přehrát od začátku";
var prevTrack$j = "Předchozí stopa";
var nextTrack$j = "Další stopa";
var rewind$j = "Přetočit vzad";
var forward$j = "Přetočit vpřed";
var captions$j = "Titulky";
var showCaptions$j = "Zobrazit titulky";
var hideCaptions$j = "Skrýt titulky";
var captionsOff$j = "Titulky vypnuty";
var showTranscript$j = "Zobrazit přepis";
var hideTranscript$j = "Skrýt přepis";
var turnOnDescriptions$j = "Zapnout popisy";
var turnOffDescriptions$j = "vypnout popisy";
var chapters$j = "Kapitoly";
var language$j = "Jazyk";
var sign$j = "Znaková řeč";
var showSign$j = "Zobrazit znakovou řeč";
var hideSign$j = "Skrýt znakovou řeč";
var seekbarLabel$j = "časová osa";
var mute$j = "Vypnout zvuk";
var unmute$j = "Zapnout zvuk";
var volume$j = "Hlasitost";
var volumeUpDown$j = "Hlasitost zvýšit snížit";
var preferences$j = "Předvolby";
var enterFullScreen$j = "Zobrazit na celou obrazovku";
var exitFullScreen$j = "Ukončit celou obrazovku";
var speed$j = "Rychlost";
var spacebar$j = "mezerník";
var transcriptTitle$j = "Přepis";
var lyricsTitle$j = "Text";
var autoScroll$j = "Automatické posouvání";
var statusPlaying$j = "Přehrávání";
var statusPaused$j = "Pozastaveno";
var statusStopped$j = "Zastaveno";
var statusBuffering$j = "Vyrovnávací paměť";
var statusEnd$j = "Konec stopy";
var selectedTrack$i = "Vybraná stopa";
var alertDescribVersion = "Používání zvukově popsané verze tohoto videa";
var alertNonDescribVersion = "Použití nepopsané verze tohoto videa";
var prefMenuCaptions$j = "Titulky";
var prefVoicedCaptions$j = "Spoken Captions";
var prefMenuDescriptions$j = "Popisy";
var prefMenuKeyboard$j = "Klávesnice";
var prefMenuTranscript$j = "Přepis";
var prefTitleCaptions$j = "Předvolby titulků";
var prefTitleDescriptions$j = "Předvolby zvukového popisu";
var prefTitleKeyboard$j = "Předvolby klávesnice";
var prefTitleTranscript$i = "Předvolby přepisu";
var prefIntroDescription1$i = "Tento přehrávač médií podporuje zvukový popis dvěma způsoby:";
var prefDescription1$j = "Aktuální video má alternativně popsaná verze, textový popis.";
var prefDescription2$j = "Aktuální video má alternativní popsaná verze videa.";
var prefDescription3$j = "Aktuální video má textový popis, oznámený čtečkou obrazovky.";
var prefIntroDescriptionNone$j = "Aktuální video nemá žádný zvukový popis v žádném formátu.";
var prefIntroDescription3$j = "Pomocí následujícího formuláře můžete nastavit předvolby týkající se textového zvukového popisu.";
var prefIntroDescription4$j = "Po uložení nastavení lze zvukový popis zapnout / vypnout pomocí tlačítka Popis.";
var prefIntroKeyboard1$j = "Přehrávač médií na této webové stránce lze ovládat odkudkoli na stránce pomocí klávesových zkratek (seznam níže).";
var prefIntroKeyboard2$j = "Níže lze přiřadit modifikační klávesy (Shift, Alt a Control).";
var prefIntroKeyboard3$j = "POZNÁMKA: Některé kombinace kláves mohou být v konfliktu s klávesami používanými vaším prohlížečem nebo jinými softwarovými aplikacemi. Zkuste najít různé kombinace modifikačních kláves, které vám vyhovují.";
var prefHeadingKeyboard1$j = "Modifikační klávesy používané pro zástupce";
var prefHeadingKeyboard2$j = "Aktuální klávesové zkratky";
var prefHeadingDescription$j = "Zvukový popis";
var prefHeadingTextDescription$j = "Textový zvukový popis";
var prefAltKey$j = "Alt";
var prefCtrlKey$j = "Control";
var prefShiftKey$j = "Shift";
var prefNoKeyShortcuts$j = "Disable keyboard shortcuts";
var escapeKey$j = "Escape";
var escapeKeyFunction$j = "Zavřít aktuální dialogové okno nebo vyskakovací nabídku";
var prefDescPause$j = "Automaticky pozastavit video při spuštění popisu";
var prefDescVisible$j = "Zviditelnit popis";
var prefDescVoice$j = "Voice";
var prefDescRate$j = "Spoken Description Rate";
var prefCaptionRate$j = "Spoken Caption Rate";
var prefDescPitch$j = "Pitch";
var prefDescPitch1$j = "Very low";
var prefDescPitch2$j = "Low";
var prefDescPitch3$j = "Default";
var prefDescPitch4$j = "High";
var prefDescPitch5$j = "Very high";
var sampleDescriptionText$j = "Adjust settings to hear this sample text.";
var prefHighlight$j = "Zvýraznit přepis při přehrávání médií";
var prefTabbable$j = "Přepis umožňující klávesnici";
var prefCaptionsFont$j = "Písmo";
var prefCaptionsColor$j = "Barva textu";
var prefCaptionsBGColor$j = "Pozadí";
var prefCaptionsSize$j = "Velikost písma";
var prefCaptionsOpacity$j = "Neprůhlednost";
var prefCaptionsStyle$j = "Styl";
var serif$j = "patkové";
var sans$j = "bezpatkové";
var cursive$j = "kurzíva";
var fantasy$j = "fantasy";
var monospace$j = "jednoprostorový";
var white$j = "bílá";
var yellow$j = "žlutá";
var green$j = "zelená";
var cyan$i = "azurová";
var blue$j = "modrá";
var magenta$j = "purpurová";
var red$j = "červená";
var black$j = "černá";
var transparent$j = "transparentní";
var solid$j = "jednolitý";
var captionsStylePopOn$j = "Vyskakovat";
var captionsStyleRollUp$j = "Srolovat";
var prefCaptionsPosition$j = "Pozice";
var captionsPositionOverlay$j = "Překrytí";
var captionsPositionBelow$j = "Níže video";
var sampleCaptionText$j = "Ukázkový text titulku";
var prefSuccess$j = "Vaše změny byly uloženy.";
var prefNoChange$j = "Neprovedli jste žádné změny.";
var save$j = "Uložit";
var cancel$j = "Zrušit";
var dismissButton$j = "Dismiss";
var windowButtonLabel$j = "Možnosti okna";
var windowMove$j = "Přesunout";
var windowMoveLeft$j = "Window moved left";
var windowMoveRight$j = "Window moved right";
var windowMoveUp$j = "Window moved up";
var windowMoveDown$j = "Window moved down";
var windowMoveStopped$j = "Window move stopped";
var transcriptControls$j = "Transcript Window Controls";
var signControls$j = "Sign Language Window Controls";
var windowMoveAlert$j = "Přetažením nebo použitím kláves se šipkami přesuňte okno; klávesou Enter zastavíte";
var windowResize$j = "Změnit velikost";
var windowResizeHeading$j = "Změnit velikost okna";
var closeButtonLabel$j = "Zavřít";
var width$j = "Šířka";
var height$j = "Výška";
var resultsSummary1$j = "Hledali jste:";
var resultsSummary2$j = "Nalezeno %1 odpovídající položky.";
var resultsSummary3$j = "Klepnutím na čas spojený s libovolnou položkou přehrajete video od tohoto bodu.";
var noResultsFound$j = "Nebyly nalezeny žádné výsledky.";
var searchButtonLabel$j = "Přehrát v %1";
var hour$j = "hodina";
var minuta = "minuta";
var second$j = "sekunda";
var hours$j = "hodiny";
var minutes$j = "minuty";
var seconds$j = "sekundy";
var vtsHeading$j = "Video Transcript Sorter";
var vtsInstructions1$j = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$j = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$j = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$j = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$j = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$j = "Select a language";
var vtsSave$j = "Generate new .vtt content";
var vtsReturn$j = "Return to Editor";
var vtsCancel$j = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$j = "Row";
var vtsKind$j = "Kind";
var vtsStart$j = "Start";
var vtsEnd$j = "End";
var vtsContent$j = "Content";
var vtsActions$j = "Actions";
var vtsNewRow$j = "A new row %1 has been inserted.";
var vtsDeletedRow$j = "Row %1 has been deleted.";
var vtsMovedRow$j = "Row %1 has been moved %2 and is now Row %3.";
var cs = {
	playerHeading: playerHeading$j,
	audioPlayer: audioPlayer$j,
	videoPlayer: videoPlayer$j,
	faster: faster$j,
	slower: slower$j,
	play: play$j,
	pause: pause$j,
	restart: restart$j,
	prevTrack: prevTrack$j,
	nextTrack: nextTrack$j,
	rewind: rewind$j,
	forward: forward$j,
	captions: captions$j,
	showCaptions: showCaptions$j,
	hideCaptions: hideCaptions$j,
	captionsOff: captionsOff$j,
	showTranscript: showTranscript$j,
	hideTranscript: hideTranscript$j,
	turnOnDescriptions: turnOnDescriptions$j,
	turnOffDescriptions: turnOffDescriptions$j,
	chapters: chapters$j,
	language: language$j,
	sign: sign$j,
	showSign: showSign$j,
	hideSign: hideSign$j,
	seekbarLabel: seekbarLabel$j,
	mute: mute$j,
	unmute: unmute$j,
	volume: volume$j,
	volumeUpDown: volumeUpDown$j,
	preferences: preferences$j,
	enterFullScreen: enterFullScreen$j,
	exitFullScreen: exitFullScreen$j,
	speed: speed$j,
	spacebar: spacebar$j,
	transcriptTitle: transcriptTitle$j,
	lyricsTitle: lyricsTitle$j,
	autoScroll: autoScroll$j,
	statusPlaying: statusPlaying$j,
	statusPaused: statusPaused$j,
	statusStopped: statusStopped$j,
	statusBuffering: statusBuffering$j,
	statusEnd: statusEnd$j,
	selectedTrack: selectedTrack$i,
	alertDescribVersion: alertDescribVersion,
	alertNonDescribVersion: alertNonDescribVersion,
	prefMenuCaptions: prefMenuCaptions$j,
	prefVoicedCaptions: prefVoicedCaptions$j,
	prefMenuDescriptions: prefMenuDescriptions$j,
	prefMenuKeyboard: prefMenuKeyboard$j,
	prefMenuTranscript: prefMenuTranscript$j,
	prefTitleCaptions: prefTitleCaptions$j,
	prefTitleDescriptions: prefTitleDescriptions$j,
	prefTitleKeyboard: prefTitleKeyboard$j,
	prefTitleTranscript: prefTitleTranscript$i,
	prefIntroDescription1: prefIntroDescription1$i,
	prefDescription1: prefDescription1$j,
	prefDescription2: prefDescription2$j,
	prefDescription3: prefDescription3$j,
	prefIntroDescriptionNone: prefIntroDescriptionNone$j,
	prefIntroDescription3: prefIntroDescription3$j,
	prefIntroDescription4: prefIntroDescription4$j,
	prefIntroKeyboard1: prefIntroKeyboard1$j,
	prefIntroKeyboard2: prefIntroKeyboard2$j,
	prefIntroKeyboard3: prefIntroKeyboard3$j,
	prefHeadingKeyboard1: prefHeadingKeyboard1$j,
	prefHeadingKeyboard2: prefHeadingKeyboard2$j,
	prefHeadingDescription: prefHeadingDescription$j,
	prefHeadingTextDescription: prefHeadingTextDescription$j,
	prefAltKey: prefAltKey$j,
	prefCtrlKey: prefCtrlKey$j,
	prefShiftKey: prefShiftKey$j,
	prefNoKeyShortcuts: prefNoKeyShortcuts$j,
	escapeKey: escapeKey$j,
	escapeKeyFunction: escapeKeyFunction$j,
	prefDescPause: prefDescPause$j,
	prefDescVisible: prefDescVisible$j,
	prefDescVoice: prefDescVoice$j,
	prefDescRate: prefDescRate$j,
	prefCaptionRate: prefCaptionRate$j,
	prefDescPitch: prefDescPitch$j,
	prefDescPitch1: prefDescPitch1$j,
	prefDescPitch2: prefDescPitch2$j,
	prefDescPitch3: prefDescPitch3$j,
	prefDescPitch4: prefDescPitch4$j,
	prefDescPitch5: prefDescPitch5$j,
	sampleDescriptionText: sampleDescriptionText$j,
	prefHighlight: prefHighlight$j,
	prefTabbable: prefTabbable$j,
	prefCaptionsFont: prefCaptionsFont$j,
	prefCaptionsColor: prefCaptionsColor$j,
	prefCaptionsBGColor: prefCaptionsBGColor$j,
	prefCaptionsSize: prefCaptionsSize$j,
	prefCaptionsOpacity: prefCaptionsOpacity$j,
	prefCaptionsStyle: prefCaptionsStyle$j,
	serif: serif$j,
	sans: sans$j,
	cursive: cursive$j,
	fantasy: fantasy$j,
	monospace: monospace$j,
	white: white$j,
	yellow: yellow$j,
	green: green$j,
	cyan: cyan$i,
	blue: blue$j,
	magenta: magenta$j,
	red: red$j,
	black: black$j,
	transparent: transparent$j,
	solid: solid$j,
	captionsStylePopOn: captionsStylePopOn$j,
	captionsStyleRollUp: captionsStyleRollUp$j,
	prefCaptionsPosition: prefCaptionsPosition$j,
	captionsPositionOverlay: captionsPositionOverlay$j,
	captionsPositionBelow: captionsPositionBelow$j,
	sampleCaptionText: sampleCaptionText$j,
	prefSuccess: prefSuccess$j,
	prefNoChange: prefNoChange$j,
	save: save$j,
	cancel: cancel$j,
	dismissButton: dismissButton$j,
	windowButtonLabel: windowButtonLabel$j,
	windowMove: windowMove$j,
	windowMoveLeft: windowMoveLeft$j,
	windowMoveRight: windowMoveRight$j,
	windowMoveUp: windowMoveUp$j,
	windowMoveDown: windowMoveDown$j,
	windowMoveStopped: windowMoveStopped$j,
	transcriptControls: transcriptControls$j,
	signControls: signControls$j,
	windowMoveAlert: windowMoveAlert$j,
	windowResize: windowResize$j,
	windowResizeHeading: windowResizeHeading$j,
	closeButtonLabel: closeButtonLabel$j,
	width: width$j,
	height: height$j,
	resultsSummary1: resultsSummary1$j,
	resultsSummary2: resultsSummary2$j,
	resultsSummary3: resultsSummary3$j,
	noResultsFound: noResultsFound$j,
	searchButtonLabel: searchButtonLabel$j,
	hour: hour$j,
	minuta: minuta,
	second: second$j,
	hours: hours$j,
	minutes: minutes$j,
	seconds: seconds$j,
	vtsHeading: vtsHeading$j,
	vtsInstructions1: vtsInstructions1$j,
	vtsInstructions2: vtsInstructions2$j,
	vtsInstructions3: vtsInstructions3$j,
	vtsInstructions4: vtsInstructions4$j,
	vtsInstructions5: vtsInstructions5$j,
	vtsSelectLanguage: vtsSelectLanguage$j,
	vtsSave: vtsSave$j,
	vtsReturn: vtsReturn$j,
	vtsCancel: vtsCancel$j,
	vtsRow: vtsRow$j,
	vtsKind: vtsKind$j,
	vtsStart: vtsStart$j,
	vtsEnd: vtsEnd$j,
	vtsContent: vtsContent$j,
	vtsActions: vtsActions$j,
	vtsNewRow: vtsNewRow$j,
	vtsDeletedRow: vtsDeletedRow$j,
	vtsMovedRow: vtsMovedRow$j
};

var playerHeading$i = "Medieafspiller";
var audioPlayer$i = "Audio player";
var videoPlayer$i = "Video player";
var faster$i = "Hurtigere";
var slower$i = "Langsommere";
var play$i = "Afspil";
var pause$i = "Pause";
var restart$i = "Genstart";
var prevTrack$i = "Forrige spor";
var nextTrack$i = "Næste spor";
var rewind$i = "Spol tilbage";
var forward$i = "Spol frem";
var captions$i = "Undertekster";
var showCaptions$i = "Vis undertekster";
var hideCaptions$i = "Gem undertekster";
var captionsOff$i = "Slå undertekster fra";
var showTranscript$i = "Vis transskription";
var hideTranscript$i = "Gem transskription";
var turnOnDescriptions$i = "Start synstolkning";
var turnOffDescriptions$i = "Stop synstolkning";
var chapters$i = "Kapitler";
var language$i = "Sprog";
var sign$i = "Tegnsprog";
var showSign$i = "Vis tegnsprog";
var hideSign$i = "Gen tegnsprog";
var seekbarLabel$i = "tidslinie";
var mute$i = "Stop lyd";
var unmute$i = "Start lyd";
var volume$i = "Lydstyrke";
var volumeUpDown$i = "Lydstyrke op";
var preferences$i = "Indstillinger";
var enterFullScreen$i = "Vis i fuldskærm";
var exitFullScreen$i = "Afslut fuldskærmsvisning";
var speed$i = "Hastighed";
var spacebar$i = "mellemrumstast";
var transcriptTitle$i = "Transskription";
var lyricsTitle$i = "Lyrik";
var autoScroll$i = "Auto scroll";
var statusPlaying$i = "Afspiller";
var statusPaused$i = "På pause";
var statusStopped$i = "Stoppet";
var statusBuffering$i = "Henter data";
var statusEnd$i = "Slut på spor";
var selectedTrack$h = "Valgt spor";
var alertDescribedVersion$i = "Anvender synstolket version af denne video";
var alertNonDescribedVersion$i = "Anvende ikke synstolket version af denne video";
var prefMenuCaptions$i = "Undertekster";
var prefVoicedCaptions$i = "Spoken Captions";
var prefMenuDescriptions$i = "Synstolkning";
var prefMenuKeyboard$i = "Tastatur";
var prefMenuTranscript$i = "Transkript";
var prefTitleCaptions$i = "Indstillinger for undertekster";
var prefTitleDescriptions$i = "Indstillinger for synstolkning";
var prefTitleKeyboard$i = "Indstillinger for tastatur";
var prefTitleTranscript$h = "Indstillinger for transskription";
var prefIntroDescription1$h = "Denne medieafspiller understøtter audio på to måder: ";
var prefDescription1$i = "Nuværende videoer har en alternativ synstolket version, textbaseret synstolkning.";
var prefDescription2$i = "Nuværende videoer har alternativ synstolket version af videoen.";
var prefDescription3$i = "Nuværende videoer har textbaseret synstolkning.";
var prefIntroDescriptionNone$i = "Nuværende video har ingen synstolkning i noget format.";
var prefIntroDescription3$i = "Anvende følgende formular for at indstille gældende textbasererede synstolkning.";
var prefIntroDescription4$i = "Efter du gemmer dine indstillinger, kan synstolkning slåes til og fra med synstolkningsknappen.";
var prefIntroKeyboard1$i = "Medieafspilleren på denne webside kan betjenest med tastuturgenveje (se neden for en liste).";
var prefIntroKeyboard2$i = "Meta-taster (Shift, Alt, og Ctrl) kan tildeles nedenfor.";
var prefIntroKeyboard3$i = "BEMÆRK: Visse tastekombinationer kan være i konflikt med din webbrowser eller andre programmers indstillinger. Benyt de tastekombinationer der virker for dig.";
var prefHeadingKeyboard1$i = "Metataster brugt til genveje";
var prefHeadingKeyboard2$i = "Nuværende tastatur genveje";
var prefHeadingDescription$i = "Synstolkning";
var prefHeadingTextDescription$i = "Tekstbaseret synstolkning";
var prefAltKey$i = "Alt";
var prefCtrlKey$i = "Ctrl";
var prefShiftKey$i = "Shift";
var prefNoKeyShortcuts$i = "Disable keyboard shortcuts";
var escapeKey$i = "Escape";
var escapeKeyFunction$i = "Luk nuværinde dialog eller popup-menu";
var prefDescPause$i = "Pause automatisk video når synstolkning starter";
var prefDescVisible$i = "Vis synstolkning";
var prefDescVoice$i = "Stemme";
var prefDescRate$i = "Spoken Description Rate";
var prefCaptionRate$i = "Spoken Caption Rate";
var prefDescPitch$i = "Tonehøjde";
var prefDescPitch1$i = "Meget lavt";
var prefDescPitch2$i = "Lavt";
var prefDescPitch3$i = "Normal";
var prefDescPitch4$i = "Højt";
var prefDescPitch5$i = "Meget højt";
var sampleDescriptionText$i = "Juster indstillinger for at høre denne eksempel tekst.";
var prefHighlight$i = "Marker tekst som læses op i transskriptet";
var prefTabbable$i = "Tastaturaktiveret transskription";
var prefCaptionsFont$i = "Skrifttype";
var prefCaptionsColor$i = "Tekstfarve";
var prefCaptionsBGColor$i = "Baggrundsfarve";
var prefCaptionsSize$i = "Tekststørrelse";
var prefCaptionsOpacity$i = "Gennemsigtighed";
var prefCaptionsStyle$i = "Teksttype";
var serif$i = "serif";
var sans$i = "sans-serif";
var cursive$i = "kursiv";
var fantasy$i = "fantasi";
var monospace$i = "monospace";
var white$i = "hvid";
var yellow$i = "gul";
var green$i = "grøn";
var cyan$h = "cyan";
var blue$i = "blå";
var magenta$i = "lilla";
var red$i = "rød";
var black$i = "sort";
var transparent$i = "gennemsigtig";
var solid$i = "massiv";
var captionsStylePopOn$i = "Pop op";
var captionsStyleRollUp$i = "Pop ned";
var prefCaptionsPosition$i = "Position";
var captionsPositionOverlay$i = "Vis over video";
var captionsPositionBelow$i = "Vis under video";
var sampleCaptionText$i = "Eksempel på undertekst";
var prefSuccess$i = "Dine ændringer er gemt.";
var prefNoChange$i = "Du har ikke lavet nogen ændringer.";
var save$i = "Gem";
var cancel$i = "Afbryd";
var dismissButton$i = "Dismiss";
var windowButtonLabel$i = "Vindueindstillinger";
var windowMove$i = "Flyt";
var windowMoveLeft$i = "Window moved left";
var windowMoveRight$i = "Window moved right";
var windowMoveUp$i = "Window moved up";
var windowMoveDown$i = "Window moved down";
var windowMoveStopped$i = "Window move stopped";
var transcriptControls$i = "Transcript Window Controls";
var signControls$i = "Sign Language Window Controls";
var windowMoveAlert$i = "Flyt med mus eller anvende piletasterne for at flytte vinduer; Enter for at slutte";
var windowResize$i = "Ændre størrelse";
var windowResizeHeading$i = "Ændre vinduestørrelse";
var closeButtonLabel$i = "Luk";
var width$i = "Bredde";
var height$i = "Højde";
var resultsSummary1$i = "Du søgte efter:";
var resultsSummary2$i = "Fundne %1 matchende indhold.";
var resultsSummary3$i = "Klik på tidslinien for at afspille derfra.";
var noResultsFound$i = "Ingen resultater.";
var searchButtonLabel$i = "Afspil fra %1";
var hour$i = "time";
var minute$i = "minut";
var second$i = "sekund";
var hours$i = "timer";
var minutes$i = "minutter";
var seconds$i = "sekunder";
var vtsHeading$i = "Video Transcript Sorter";
var vtsInstructions1$i = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$i = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$i = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$i = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$i = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$i = "Select a language";
var vtsSave$i = "Generate new .vtt content";
var vtsReturn$i = "Return to Editor";
var vtsCancel$i = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$i = "Row";
var vtsKind$i = "Kind";
var vtsStart$i = "Start";
var vtsEnd$i = "End";
var vtsContent$i = "Content";
var vtsActions$i = "Actions";
var vtsNewRow$i = "A new row %1 has been inserted.";
var vtsDeletedRow$i = "Row %1 has been deleted.";
var vtsMovedRow$i = "Row %1 has been moved %2 and is now Row %3.";
var da = {
	playerHeading: playerHeading$i,
	audioPlayer: audioPlayer$i,
	videoPlayer: videoPlayer$i,
	faster: faster$i,
	slower: slower$i,
	play: play$i,
	pause: pause$i,
	restart: restart$i,
	prevTrack: prevTrack$i,
	nextTrack: nextTrack$i,
	rewind: rewind$i,
	forward: forward$i,
	captions: captions$i,
	showCaptions: showCaptions$i,
	hideCaptions: hideCaptions$i,
	captionsOff: captionsOff$i,
	showTranscript: showTranscript$i,
	hideTranscript: hideTranscript$i,
	turnOnDescriptions: turnOnDescriptions$i,
	turnOffDescriptions: turnOffDescriptions$i,
	chapters: chapters$i,
	language: language$i,
	sign: sign$i,
	showSign: showSign$i,
	hideSign: hideSign$i,
	seekbarLabel: seekbarLabel$i,
	mute: mute$i,
	unmute: unmute$i,
	volume: volume$i,
	volumeUpDown: volumeUpDown$i,
	preferences: preferences$i,
	enterFullScreen: enterFullScreen$i,
	exitFullScreen: exitFullScreen$i,
	speed: speed$i,
	spacebar: spacebar$i,
	transcriptTitle: transcriptTitle$i,
	lyricsTitle: lyricsTitle$i,
	autoScroll: autoScroll$i,
	statusPlaying: statusPlaying$i,
	statusPaused: statusPaused$i,
	statusStopped: statusStopped$i,
	statusBuffering: statusBuffering$i,
	statusEnd: statusEnd$i,
	selectedTrack: selectedTrack$h,
	alertDescribedVersion: alertDescribedVersion$i,
	alertNonDescribedVersion: alertNonDescribedVersion$i,
	prefMenuCaptions: prefMenuCaptions$i,
	prefVoicedCaptions: prefVoicedCaptions$i,
	prefMenuDescriptions: prefMenuDescriptions$i,
	prefMenuKeyboard: prefMenuKeyboard$i,
	prefMenuTranscript: prefMenuTranscript$i,
	prefTitleCaptions: prefTitleCaptions$i,
	prefTitleDescriptions: prefTitleDescriptions$i,
	prefTitleKeyboard: prefTitleKeyboard$i,
	prefTitleTranscript: prefTitleTranscript$h,
	prefIntroDescription1: prefIntroDescription1$h,
	prefDescription1: prefDescription1$i,
	prefDescription2: prefDescription2$i,
	prefDescription3: prefDescription3$i,
	prefIntroDescriptionNone: prefIntroDescriptionNone$i,
	prefIntroDescription3: prefIntroDescription3$i,
	prefIntroDescription4: prefIntroDescription4$i,
	prefIntroKeyboard1: prefIntroKeyboard1$i,
	prefIntroKeyboard2: prefIntroKeyboard2$i,
	prefIntroKeyboard3: prefIntroKeyboard3$i,
	prefHeadingKeyboard1: prefHeadingKeyboard1$i,
	prefHeadingKeyboard2: prefHeadingKeyboard2$i,
	prefHeadingDescription: prefHeadingDescription$i,
	prefHeadingTextDescription: prefHeadingTextDescription$i,
	prefAltKey: prefAltKey$i,
	prefCtrlKey: prefCtrlKey$i,
	prefShiftKey: prefShiftKey$i,
	prefNoKeyShortcuts: prefNoKeyShortcuts$i,
	escapeKey: escapeKey$i,
	escapeKeyFunction: escapeKeyFunction$i,
	prefDescPause: prefDescPause$i,
	prefDescVisible: prefDescVisible$i,
	prefDescVoice: prefDescVoice$i,
	prefDescRate: prefDescRate$i,
	prefCaptionRate: prefCaptionRate$i,
	prefDescPitch: prefDescPitch$i,
	prefDescPitch1: prefDescPitch1$i,
	prefDescPitch2: prefDescPitch2$i,
	prefDescPitch3: prefDescPitch3$i,
	prefDescPitch4: prefDescPitch4$i,
	prefDescPitch5: prefDescPitch5$i,
	sampleDescriptionText: sampleDescriptionText$i,
	prefHighlight: prefHighlight$i,
	prefTabbable: prefTabbable$i,
	prefCaptionsFont: prefCaptionsFont$i,
	prefCaptionsColor: prefCaptionsColor$i,
	prefCaptionsBGColor: prefCaptionsBGColor$i,
	prefCaptionsSize: prefCaptionsSize$i,
	prefCaptionsOpacity: prefCaptionsOpacity$i,
	prefCaptionsStyle: prefCaptionsStyle$i,
	serif: serif$i,
	sans: sans$i,
	cursive: cursive$i,
	fantasy: fantasy$i,
	monospace: monospace$i,
	white: white$i,
	yellow: yellow$i,
	green: green$i,
	cyan: cyan$h,
	blue: blue$i,
	magenta: magenta$i,
	red: red$i,
	black: black$i,
	transparent: transparent$i,
	solid: solid$i,
	captionsStylePopOn: captionsStylePopOn$i,
	captionsStyleRollUp: captionsStyleRollUp$i,
	prefCaptionsPosition: prefCaptionsPosition$i,
	captionsPositionOverlay: captionsPositionOverlay$i,
	captionsPositionBelow: captionsPositionBelow$i,
	sampleCaptionText: sampleCaptionText$i,
	prefSuccess: prefSuccess$i,
	prefNoChange: prefNoChange$i,
	save: save$i,
	cancel: cancel$i,
	dismissButton: dismissButton$i,
	windowButtonLabel: windowButtonLabel$i,
	windowMove: windowMove$i,
	windowMoveLeft: windowMoveLeft$i,
	windowMoveRight: windowMoveRight$i,
	windowMoveUp: windowMoveUp$i,
	windowMoveDown: windowMoveDown$i,
	windowMoveStopped: windowMoveStopped$i,
	transcriptControls: transcriptControls$i,
	signControls: signControls$i,
	windowMoveAlert: windowMoveAlert$i,
	windowResize: windowResize$i,
	windowResizeHeading: windowResizeHeading$i,
	closeButtonLabel: closeButtonLabel$i,
	width: width$i,
	height: height$i,
	resultsSummary1: resultsSummary1$i,
	resultsSummary2: resultsSummary2$i,
	resultsSummary3: resultsSummary3$i,
	noResultsFound: noResultsFound$i,
	searchButtonLabel: searchButtonLabel$i,
	hour: hour$i,
	minute: minute$i,
	second: second$i,
	hours: hours$i,
	minutes: minutes$i,
	seconds: seconds$i,
	vtsHeading: vtsHeading$i,
	vtsInstructions1: vtsInstructions1$i,
	vtsInstructions2: vtsInstructions2$i,
	vtsInstructions3: vtsInstructions3$i,
	vtsInstructions4: vtsInstructions4$i,
	vtsInstructions5: vtsInstructions5$i,
	vtsSelectLanguage: vtsSelectLanguage$i,
	vtsSave: vtsSave$i,
	vtsReturn: vtsReturn$i,
	vtsCancel: vtsCancel$i,
	vtsRow: vtsRow$i,
	vtsKind: vtsKind$i,
	vtsStart: vtsStart$i,
	vtsEnd: vtsEnd$i,
	vtsContent: vtsContent$i,
	vtsActions: vtsActions$i,
	vtsNewRow: vtsNewRow$i,
	vtsDeletedRow: vtsDeletedRow$i,
	vtsMovedRow: vtsMovedRow$i
};

var playerHeading$h = "Medienplayer";
var audioPlayer$h = "Audioplayer";
var videoPlayer$h = "Videoplayer";
var faster$h = "Schneller";
var slower$h = "Langsamer";
var chapters$h = "Kapitel";
var play$h = "Abspielen";
var pause$h = "Pause";
var restart$h = "Neustart";
var prevTrack$h = "Vorheriger Titel";
var nextTrack$h = "Nächster Titel";
var rewind$h = "Zurück";
var forward$h = "Vorwärts";
var captions$h = "Untertitel";
var showCaptions$h = "Untertitel anzeigen";
var hideCaptions$h = "Untertitel ausblenden";
var captionsOff$h = "Untertitel ausschalten";
var showTranscript$h = "Transkription anzeigen";
var hideTranscript$h = "Transkription entfernen";
var turnOnDescriptions$h = "Audiobeschreibung einschalten";
var turnOffDescriptions$h = "Audiobeschreibung ausschalten";
var language$h = "Sprache";
var sign$h = "Gebärdensprache";
var showSign$h = "Gebärdensprache anzeigen";
var hideSign$h = "Gebärdensprache ausblenden";
var seekbarLabel$h = "Suchleiste";
var mute$h = "Ton aus";
var unmute$h = "Ton an";
var volume$h = "Lautstärke";
var volumeUpDown$h = "Lautstärkeregler";
var preferences$h = "Einstellungen";
var enterFullScreen$h = "Vollbildmodus einschalten";
var exitFullScreen$h = "Vollbildmodus verlassen";
var speed$h = "Geschwindigkeit";
var spacebar$h = "Leertaste";
var transcriptTitle$h = "Transkription";
var lyricsTitle$h = "Text";
var autoScroll$h = "Automatisch scrollen";
var statusPlaying$h = "Gestartet";
var statusPaused$h = "Pausiert";
var statusStopped$h = "Angehalten";
var statusBuffering$h = "Daten werden empfangen...";
var statusEnd$h = "Ende des Titels";
var selectedTrack$g = "Ausgewählter Titel";
var alertDescribedVersion$h = "Das Video wird mit Audiobeschreibung abgespielt";
var alertNonDescribedVersion$h = "Das Video wird ohne Audiobeschreibung abgespielt";
var prefMenuCaptions$h = "Untertitel";
var prefVoicedCaptions$h = "Spoken Captions";
var prefMenuDescriptions$h = "Audiobeschreibungen";
var prefMenuKeyboard$h = "Tastatur";
var prefMenuTranscript$h = "Transkription";
var prefTitleCaptions$h = "Untertitel Einstellungen";
var prefTitleDescriptions$h = "Audiobeschreibung Einstellungen";
var prefTitleKeyboard$h = "Tastatur Einstellungen";
var prefTitleTranscript$g = "Transkription Einstellungen";
var prefIntroDescription1$g = "Dieser Media Player unterstützt zwei Arten von Untertiteln: ";
var prefDescription1$h = "Das aktuelle Video hat eine alternative Version der Audiobeschreibung, eine textbasierte Audiobeschreibung.";
var prefDescription2$h = "Das aktuelle Video hat Version des Videos, die eine Audiobeschreibung enthält.";
var prefDescription3$h = "Das aktuelle Video hat Textbasierte Audiobeschreibung, die vom Screen-Reader vorgelesen wird.";
var prefIntroDescriptionNone$h = "Das aktuelle Video hat keine Audiobeschreibung.";
var prefIntroDescription3$h = "Mit der folgenden Auswahl steuern Sie das Abspielen der textbasierten Audiobeschreibung.";
var prefIntroDescription4$h = "Wenn die Audiobeschreibung aktiviert ist, kann sie per Schaltfläche ein- und ausgeschaltet werden.";
var prefIntroKeyboard1$h = "Dieser Media Player lässt sich innerhalb der gesamten Seite per Tastenkürzel bedienen (siehe unten).";
var prefIntroKeyboard2$h = "Die Modifikatortasten (Umschalt, Alt, und Strg) können hier zugeordnet werden.";
var prefIntroKeyboard3$h = "Achtung: Einige Tastenkombinationen sind je nach Browser und Betriebssystem nicht möglich. Versuchen Sie gegebenenfalls andere Kombinationen.";
var prefHeadingKeyboard1$h = "Modifikatortasten für die Tastenkürzel";
var prefHeadingKeyboard2$h = "Aktuell eingestellte Tastenkürzel";
var prefHeadingDescription$h = "Audiobeschreibung";
var prefHeadingTextDescription$h = "Textbasierte Audiobeschreibung";
var prefAltKey$h = "Alt";
var prefCtrlKey$h = "Strg";
var prefShiftKey$h = "Umschalttaste";
var prefNoKeyShortcuts$h = "Tastenkombinationen deaktivieren";
var escapeKey$h = "ESC Taste";
var escapeKeyFunction$h = "Dialogfenster schließen";
var prefDescPause$h = "Video automatisch anhalten, wenn Szenenbeschreibungen eingeblendet werden";
var prefDescVisible$h = "Textbasierte Szenenbeschreibungen einblenden, wenn diese aktiviert sind";
var prefDescVoice$h = "Stimme";
var prefDescRate$h = "Spoken Description Rate";
var prefCaptionRate$h = "Spoken Caption Rate";
var prefDescPitch$h = "Tonlage";
var prefDescPitch1$h = "Sehr tief";
var prefDescPitch2$h = "Tief";
var prefDescPitch3$h = "Mittel";
var prefDescPitch4$h = "Hoch";
var prefDescPitch5$h = "Sehr hoch";
var sampleDescriptionText$h = "Einstellungen bearbeiten um diesen Text vorzulesen.";
var prefHighlight$h = "Transkription hervorheben, während das Medium abgespielt wird";
var prefTabbable$h = "Transkription per Tastatur ein-/ausschaltbar machen";
var prefCaptionsFont$h = "Schriftart";
var prefCaptionsColor$h = "Schriftfarbe";
var prefCaptionsBGColor$h = "Hintergrund";
var prefCaptionsSize$h = "Schriftgöße";
var prefCaptionsOpacity$h = "Deckkraft";
var prefCaptionsStyle$h = "Stil";
var serif$h = "Serifenschrift";
var sans$h = "Serifenlose Schrift";
var cursive$h = "kursiv";
var fantasy$h = "Fantasieschrift";
var monospace$h = "nichtproportionale Schrift";
var white$h = "weiß";
var yellow$h = "gelb";
var green$h = "grün";
var cyan$g = "cyan";
var blue$h = "blau";
var magenta$h = "magenta";
var red$h = "rot";
var black$h = "schwarz";
var transparent$h = "transparent";
var solid$h = "undurchsichtig";
var captionsStylePopOn$h = "Pop-on";
var captionsStyleRollUp$h = "Roll-up";
var prefCaptionsPosition$h = "Position";
var captionsPositionOverlay$h = "Überlagert";
var captionsPositionBelow$h = "Unterhalb";
var sampleCaptionText$h = "Textbeispiel";
var prefSuccess$h = "Ihre Änderungen wurden gespeichert.";
var prefNoChange$h = "Es gab keine Änderungen zu speichern.";
var save$h = "Speichern";
var cancel$h = "Abbrechen";
var dismissButton$h = "Dismiss";
var windowButtonLabel$h = "Fenstereinstellungen";
var windowMove$h = "Verschieben";
var windowMoveLeft$h = "Das Fenster verschob sich nach links";
var windowMoveRight$h = "Das Fenster verschob sich nach rechts";
var windowMoveUp$h = "Das Fenster verschob sich nach oben";
var windowMoveDown$h = "Das Fenster verschob sich nach unten";
var windowMoveStopped$h = "Das Fenster hörte auf sich zu verschieben";
var transcriptControls$h = "Bedienelemente des Transkriptionsfensters";
var signControls$h = "Bedienelemente des Gebärdensprache-Fensters";
var windowMoveAlert$h = "Fenster mit Pfeiltasten oder Maus verschieben; beenden mit Eingabetaste";
var windowResize$h = "Größe verändern";
var windowResizeHeading$h = "Größe des Gebärdensprache-Fenster";
var closeButtonLabel$h = "Schließen";
var width$h = "Breite";
var height$h = "Höhe";
var resultsSummary1$h = "Suche nach:";
var resultsSummary2$h = "Gefunden %1 Treffer.";
var resultsSummary3$h = "Auf den Zeitindex klicken, um das Video vom Zeitpunkt des jeweiligen Suchergebnisses abzuspielen.";
var noResultsFound$h = "Keine Treffer.";
var searchButtonLabel$h = "Abspielen von %1";
var hour$h = "Stunde";
var minute$h = "Minute";
var second$h = "Sekunde";
var hours$h = "Stunden";
var minutes$h = "Minuten";
var seconds$h = "Sekunden";
var vtsHeading$h = "Transkriptions-Sortierer für Videos";
var vtsInstructions1$h = "Verwenden Sie den Transkription-Sortierer für Videos, um Textspuren zu ändern:";
var vtsInstructions2$h = "Ordnen Sie Kapitel, Beschreibungen, Bildunterschriften, und/oder Untertitel so, dass diese in der richtigen Reihenfolge in der selbsterzeugten Transkription des Able Players erscheinen.";
var vtsInstructions3$h = "Verändern Sie Inhalt oder Anfangs- bzw. Endzeiten (alle sind direkt innerhalb der Tabelle editierbar).";
var vtsInstructions4$h = "Fügen Sie neuen Inhalt, wie Kapitel oder Beschreibungen hinzu.";
var vtsInstructions5$h = "Nach dem Editieren klicken Sie auf die Schaltfläche \"Änderungen speichern\" um neuen Inhalt für alle wichtigen zeitgesteuerten Textdateien zu erzeugen. Der neue Text kann in neue WebVTT-Dateien kopiert und eingefügt werden.";
var vtsSelectLanguage$h = "Wählen Sie eine Sprache aus";
var vtsSave$h = "Erzeugen Sie neuen .vtt-Inhalt";
var vtsReturn$h = "Gehen Sie zurück zum Editor";
var vtsCancel$h = "Abbruch des Speicherns. Jegliche Bearbeitungen, die Sie vorgenommen haben, wurden in der VTS-Tabelle gesichert.";
var vtsRow$h = "Reihe";
var vtsKind$h = "Art";
var vtsStart$h = "Anfang";
var vtsEnd$h = "Ende";
var vtsContent$h = "Inhalt";
var vtsActions$h = "Aktionen";
var vtsNewRow$h = "Eine neue Reihe %1 wurde eingefügt.";
var vtsDeletedRow$h = "Reihe %1 wurde gelöscht.";
var vtsMovedRow$h = "Reihe %1 wurde verschoben %2 ist nun Reihe %3.";
var de = {
	playerHeading: playerHeading$h,
	audioPlayer: audioPlayer$h,
	videoPlayer: videoPlayer$h,
	faster: faster$h,
	slower: slower$h,
	chapters: chapters$h,
	play: play$h,
	pause: pause$h,
	restart: restart$h,
	prevTrack: prevTrack$h,
	nextTrack: nextTrack$h,
	rewind: rewind$h,
	forward: forward$h,
	captions: captions$h,
	showCaptions: showCaptions$h,
	hideCaptions: hideCaptions$h,
	captionsOff: captionsOff$h,
	showTranscript: showTranscript$h,
	hideTranscript: hideTranscript$h,
	turnOnDescriptions: turnOnDescriptions$h,
	turnOffDescriptions: turnOffDescriptions$h,
	language: language$h,
	sign: sign$h,
	showSign: showSign$h,
	hideSign: hideSign$h,
	seekbarLabel: seekbarLabel$h,
	mute: mute$h,
	unmute: unmute$h,
	volume: volume$h,
	volumeUpDown: volumeUpDown$h,
	preferences: preferences$h,
	enterFullScreen: enterFullScreen$h,
	exitFullScreen: exitFullScreen$h,
	speed: speed$h,
	spacebar: spacebar$h,
	transcriptTitle: transcriptTitle$h,
	lyricsTitle: lyricsTitle$h,
	autoScroll: autoScroll$h,
	statusPlaying: statusPlaying$h,
	statusPaused: statusPaused$h,
	statusStopped: statusStopped$h,
	statusBuffering: statusBuffering$h,
	statusEnd: statusEnd$h,
	selectedTrack: selectedTrack$g,
	alertDescribedVersion: alertDescribedVersion$h,
	alertNonDescribedVersion: alertNonDescribedVersion$h,
	prefMenuCaptions: prefMenuCaptions$h,
	prefVoicedCaptions: prefVoicedCaptions$h,
	prefMenuDescriptions: prefMenuDescriptions$h,
	prefMenuKeyboard: prefMenuKeyboard$h,
	prefMenuTranscript: prefMenuTranscript$h,
	prefTitleCaptions: prefTitleCaptions$h,
	prefTitleDescriptions: prefTitleDescriptions$h,
	prefTitleKeyboard: prefTitleKeyboard$h,
	prefTitleTranscript: prefTitleTranscript$g,
	prefIntroDescription1: prefIntroDescription1$g,
	prefDescription1: prefDescription1$h,
	prefDescription2: prefDescription2$h,
	prefDescription3: prefDescription3$h,
	prefIntroDescriptionNone: prefIntroDescriptionNone$h,
	prefIntroDescription3: prefIntroDescription3$h,
	prefIntroDescription4: prefIntroDescription4$h,
	prefIntroKeyboard1: prefIntroKeyboard1$h,
	prefIntroKeyboard2: prefIntroKeyboard2$h,
	prefIntroKeyboard3: prefIntroKeyboard3$h,
	prefHeadingKeyboard1: prefHeadingKeyboard1$h,
	prefHeadingKeyboard2: prefHeadingKeyboard2$h,
	prefHeadingDescription: prefHeadingDescription$h,
	prefHeadingTextDescription: prefHeadingTextDescription$h,
	prefAltKey: prefAltKey$h,
	prefCtrlKey: prefCtrlKey$h,
	prefShiftKey: prefShiftKey$h,
	prefNoKeyShortcuts: prefNoKeyShortcuts$h,
	escapeKey: escapeKey$h,
	escapeKeyFunction: escapeKeyFunction$h,
	prefDescPause: prefDescPause$h,
	prefDescVisible: prefDescVisible$h,
	prefDescVoice: prefDescVoice$h,
	prefDescRate: prefDescRate$h,
	prefCaptionRate: prefCaptionRate$h,
	prefDescPitch: prefDescPitch$h,
	prefDescPitch1: prefDescPitch1$h,
	prefDescPitch2: prefDescPitch2$h,
	prefDescPitch3: prefDescPitch3$h,
	prefDescPitch4: prefDescPitch4$h,
	prefDescPitch5: prefDescPitch5$h,
	sampleDescriptionText: sampleDescriptionText$h,
	prefHighlight: prefHighlight$h,
	prefTabbable: prefTabbable$h,
	prefCaptionsFont: prefCaptionsFont$h,
	prefCaptionsColor: prefCaptionsColor$h,
	prefCaptionsBGColor: prefCaptionsBGColor$h,
	prefCaptionsSize: prefCaptionsSize$h,
	prefCaptionsOpacity: prefCaptionsOpacity$h,
	prefCaptionsStyle: prefCaptionsStyle$h,
	serif: serif$h,
	sans: sans$h,
	cursive: cursive$h,
	fantasy: fantasy$h,
	monospace: monospace$h,
	white: white$h,
	yellow: yellow$h,
	green: green$h,
	cyan: cyan$g,
	blue: blue$h,
	magenta: magenta$h,
	red: red$h,
	black: black$h,
	transparent: transparent$h,
	solid: solid$h,
	captionsStylePopOn: captionsStylePopOn$h,
	captionsStyleRollUp: captionsStyleRollUp$h,
	prefCaptionsPosition: prefCaptionsPosition$h,
	captionsPositionOverlay: captionsPositionOverlay$h,
	captionsPositionBelow: captionsPositionBelow$h,
	sampleCaptionText: sampleCaptionText$h,
	prefSuccess: prefSuccess$h,
	prefNoChange: prefNoChange$h,
	save: save$h,
	cancel: cancel$h,
	dismissButton: dismissButton$h,
	windowButtonLabel: windowButtonLabel$h,
	windowMove: windowMove$h,
	windowMoveLeft: windowMoveLeft$h,
	windowMoveRight: windowMoveRight$h,
	windowMoveUp: windowMoveUp$h,
	windowMoveDown: windowMoveDown$h,
	windowMoveStopped: windowMoveStopped$h,
	transcriptControls: transcriptControls$h,
	signControls: signControls$h,
	windowMoveAlert: windowMoveAlert$h,
	windowResize: windowResize$h,
	windowResizeHeading: windowResizeHeading$h,
	closeButtonLabel: closeButtonLabel$h,
	width: width$h,
	height: height$h,
	resultsSummary1: resultsSummary1$h,
	resultsSummary2: resultsSummary2$h,
	resultsSummary3: resultsSummary3$h,
	noResultsFound: noResultsFound$h,
	searchButtonLabel: searchButtonLabel$h,
	hour: hour$h,
	minute: minute$h,
	second: second$h,
	hours: hours$h,
	minutes: minutes$h,
	seconds: seconds$h,
	vtsHeading: vtsHeading$h,
	vtsInstructions1: vtsInstructions1$h,
	vtsInstructions2: vtsInstructions2$h,
	vtsInstructions3: vtsInstructions3$h,
	vtsInstructions4: vtsInstructions4$h,
	vtsInstructions5: vtsInstructions5$h,
	vtsSelectLanguage: vtsSelectLanguage$h,
	vtsSave: vtsSave$h,
	vtsReturn: vtsReturn$h,
	vtsCancel: vtsCancel$h,
	vtsRow: vtsRow$h,
	vtsKind: vtsKind$h,
	vtsStart: vtsStart$h,
	vtsEnd: vtsEnd$h,
	vtsContent: vtsContent$h,
	vtsActions: vtsActions$h,
	vtsNewRow: vtsNewRow$h,
	vtsDeletedRow: vtsDeletedRow$h,
	vtsMovedRow: vtsMovedRow$h
};

var playerHeading$g = "Media player";
var audioPlayer$g = "Audio player";
var videoPlayer$g = "Video player";
var faster$g = "Faster";
var slower$g = "Slower";
var play$g = "Play";
var pause$g = "Pause";
var restart$g = "Restart";
var prevTrack$g = "Previous track";
var nextTrack$g = "Next track";
var rewind$g = "Rewind";
var forward$g = "Forward";
var captions$g = "Captions";
var showCaptions$g = "Show captions";
var hideCaptions$g = "Hide captions";
var captionsOff$g = "Captions off";
var showTranscript$g = "Show transcript";
var hideTranscript$g = "Hide transcript";
var turnOnDescriptions$g = "Turn on descriptions";
var turnOffDescriptions$g = "Turn off descriptions";
var chapters$g = "Chapters";
var language$g = "Language";
var sign$g = "Sign language";
var showSign$g = "Show sign language";
var hideSign$g = "Hide sign language";
var seekbarLabel$g = "timeline";
var mute$g = "Mute";
var unmute$g = "Unmute";
var volume$g = "Volume";
var volumeUpDown$g = "Volume up down";
var preferences$g = "Preferences";
var enterFullScreen$g = "Enter full screen";
var exitFullScreen$g = "Exit full screen";
var speed$g = "Speed";
var spacebar$g = "spacebar";
var transcriptTitle$g = "Transcript";
var lyricsTitle$g = "Lyrics";
var autoScroll$g = "Auto scroll";
var statusPlaying$g = "Playing";
var statusPaused$g = "Paused";
var statusStopped$g = "Stopped";
var statusBuffering$g = "Buffering";
var statusEnd$g = "End of track";
var selectedTrack$f = "Selected Track";
var alertDescribedVersion$g = "Using the audio described version of this video";
var alertNonDescribedVersion$g = "Using the non-described version of this video";
var prefMenuCaptions$g = "Captions";
var prefVoicedCaptions$g = "Spoken Captions";
var prefMenuDescriptions$g = "Descriptions";
var prefMenuKeyboard$g = "Keyboard";
var prefMenuTranscript$g = "Transcript";
var prefTitleCaptions$g = "Captions Preferences";
var prefTitleDescriptions$g = "Audio Description Preferences";
var prefTitleKeyboard$g = "Keyboard Preferences";
var prefTitleTranscript$f = "Transcript Preferences";
var prefIntroDescription1$f = "This media player supports audio description in two ways: ";
var prefDescription1$g = "The current video has an alternative described version and text-based description, announced by screen reader.";
var prefDescription2$g = "The current video has text-based description.";
var prefDescription3$g = "The current video has an alternative described version.";
var prefIntroDescriptionNone$g = "The current video has no audio description in either format.";
var prefIntroDescription3$g = "Use the following form to set your preferences related to text-based audio description.";
var prefIntroDescription4$g = "After you save your settings, audio description can be toggled on/off using the Description button.";
var prefIntroKeyboard1$g = "The media player on this web page can be operated from anywhere on the page using keyboard shortcuts (see below for a list).";
var prefIntroKeyboard2$g = "Modifier keys (Shift, Alt, and Control) can be assigned below.";
var prefIntroKeyboard3$g = "NOTE: Some key combinations might conflict with keys used by your browser and/or other software applications. Try various combinations of modifier keys to find one that works for you.";
var prefHeadingKeyboard1$g = "Modifier keys used for shortcuts";
var prefHeadingKeyboard2$g = "Current keyboard shortcuts";
var prefHeadingDescription$g = "Audio description";
var prefHeadingTextDescription$g = "Text-based audio description";
var prefAltKey$g = "Alt";
var prefCtrlKey$g = "Control";
var prefShiftKey$g = "Shift";
var prefNoKeyShortcuts$g = "Disable keyboard shortcuts";
var escapeKey$g = "Escape";
var escapeKeyFunction$g = "Close current dialog or popup menu";
var prefDescPause$g = "Automatically pause video when description starts";
var prefDescVisible$g = "Make description visible";
var prefDescVoice$g = "Voice";
var prefDescRate$g = "Spoken Description Rate";
var prefCaptionRate$g = "Spoken Caption Rate";
var prefDescPitch$g = "Pitch";
var prefDescPitch1$g = "Very low";
var prefDescPitch2$g = "Low";
var prefDescPitch3$g = "Default";
var prefDescPitch4$g = "High";
var prefDescPitch5$g = "Very high";
var sampleDescriptionText$g = "Adjust settings to hear this sample text.";
var prefHighlight$g = "Highlight transcript as media plays";
var prefTabbable$g = "Keyboard-enable transcript";
var prefCaptionsFont$g = "Font";
var prefCaptionsColor$g = "Text Color";
var prefCaptionsBGColor$g = "Background";
var prefCaptionsSize$g = "Font Size";
var prefCaptionsOpacity$g = "Opacity";
var prefCaptionsStyle$g = "Style";
var serif$g = "serif";
var sans$g = "sans-serif";
var cursive$g = "cursive";
var fantasy$g = "fantasy";
var monospace$g = "monospace";
var white$g = "white";
var yellow$g = "yellow";
var green$g = "green";
var cyan$f = "cyan";
var blue$g = "blue";
var magenta$g = "magenta";
var red$g = "red";
var black$g = "black";
var transparent$g = "transparent";
var solid$g = "solid";
var captionsStylePopOn$g = "Pop-on";
var captionsStyleRollUp$g = "Roll-up";
var prefCaptionsPosition$g = "Position";
var captionsPositionOverlay$g = "Overlay";
var captionsPositionBelow$g = "Below video";
var sampleCaptionText$g = "Sample caption text";
var prefSuccess$g = "Your changes have been saved.";
var prefNoChange$g = "You didn't make any changes.";
var save$g = "Save";
var cancel$g = "Cancel";
var dismissButton$g = "Dismiss";
var windowButtonLabel$g = "Window options";
var windowMove$g = "Move";
var windowMoveLeft$g = "Window moved left";
var windowMoveRight$g = "Window moved right";
var windowMoveUp$g = "Window moved up";
var windowMoveDown$g = "Window moved down";
var windowMoveStopped$g = "Window move stopped";
var transcriptControls$g = "Transcript Window Controls";
var signControls$g = "Sign Language Window Controls";
var windowMoveAlert$g = "Drag or use arrow keys to move the window; Enter to stop";
var windowResize$g = "Resize";
var windowResizeHeading$g = "Resize Window";
var closeButtonLabel$g = "Close";
var width$g = "Width";
var height$g = "Height";
var resultsSummary1$g = "You searched for:";
var resultsSummary2$g = "Found %1 matching items.";
var resultsSummary3$g = "Click the time associated with any item to play the video from that point.";
var noResultsFound$g = "No results found.";
var searchButtonLabel$g = "Play at %1";
var hour$g = "hour";
var minute$g = "minute";
var second$g = "second";
var hours$g = "hours";
var minutes$g = "minutes";
var seconds$g = "seconds";
var vtsHeading$g = "Video Transcript Sorter";
var vtsInstructions1$g = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$g = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$g = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$g = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$g = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$g = "Select a language";
var vtsSave$g = "Generate new .vtt content";
var vtsReturn$g = "Return to Editor";
var vtsCancel$g = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$g = "Row";
var vtsKind$g = "Kind";
var vtsStart$g = "Start";
var vtsEnd$g = "End";
var vtsContent$g = "Content";
var vtsActions$g = "Actions";
var vtsNewRow$g = "A new row %1 has been inserted.";
var vtsDeletedRow$g = "Row %1 has been deleted.";
var vtsMovedRow$g = "Row %1 has been moved %2 and is now Row %3.";
var en = {
	playerHeading: playerHeading$g,
	audioPlayer: audioPlayer$g,
	videoPlayer: videoPlayer$g,
	faster: faster$g,
	slower: slower$g,
	play: play$g,
	pause: pause$g,
	restart: restart$g,
	prevTrack: prevTrack$g,
	nextTrack: nextTrack$g,
	rewind: rewind$g,
	forward: forward$g,
	captions: captions$g,
	showCaptions: showCaptions$g,
	hideCaptions: hideCaptions$g,
	captionsOff: captionsOff$g,
	showTranscript: showTranscript$g,
	hideTranscript: hideTranscript$g,
	turnOnDescriptions: turnOnDescriptions$g,
	turnOffDescriptions: turnOffDescriptions$g,
	chapters: chapters$g,
	language: language$g,
	sign: sign$g,
	showSign: showSign$g,
	hideSign: hideSign$g,
	seekbarLabel: seekbarLabel$g,
	mute: mute$g,
	unmute: unmute$g,
	volume: volume$g,
	volumeUpDown: volumeUpDown$g,
	preferences: preferences$g,
	enterFullScreen: enterFullScreen$g,
	exitFullScreen: exitFullScreen$g,
	speed: speed$g,
	spacebar: spacebar$g,
	transcriptTitle: transcriptTitle$g,
	lyricsTitle: lyricsTitle$g,
	autoScroll: autoScroll$g,
	statusPlaying: statusPlaying$g,
	statusPaused: statusPaused$g,
	statusStopped: statusStopped$g,
	statusBuffering: statusBuffering$g,
	statusEnd: statusEnd$g,
	selectedTrack: selectedTrack$f,
	alertDescribedVersion: alertDescribedVersion$g,
	alertNonDescribedVersion: alertNonDescribedVersion$g,
	prefMenuCaptions: prefMenuCaptions$g,
	prefVoicedCaptions: prefVoicedCaptions$g,
	prefMenuDescriptions: prefMenuDescriptions$g,
	prefMenuKeyboard: prefMenuKeyboard$g,
	prefMenuTranscript: prefMenuTranscript$g,
	prefTitleCaptions: prefTitleCaptions$g,
	prefTitleDescriptions: prefTitleDescriptions$g,
	prefTitleKeyboard: prefTitleKeyboard$g,
	prefTitleTranscript: prefTitleTranscript$f,
	prefIntroDescription1: prefIntroDescription1$f,
	prefDescription1: prefDescription1$g,
	prefDescription2: prefDescription2$g,
	prefDescription3: prefDescription3$g,
	prefIntroDescriptionNone: prefIntroDescriptionNone$g,
	prefIntroDescription3: prefIntroDescription3$g,
	prefIntroDescription4: prefIntroDescription4$g,
	prefIntroKeyboard1: prefIntroKeyboard1$g,
	prefIntroKeyboard2: prefIntroKeyboard2$g,
	prefIntroKeyboard3: prefIntroKeyboard3$g,
	prefHeadingKeyboard1: prefHeadingKeyboard1$g,
	prefHeadingKeyboard2: prefHeadingKeyboard2$g,
	prefHeadingDescription: prefHeadingDescription$g,
	prefHeadingTextDescription: prefHeadingTextDescription$g,
	prefAltKey: prefAltKey$g,
	prefCtrlKey: prefCtrlKey$g,
	prefShiftKey: prefShiftKey$g,
	prefNoKeyShortcuts: prefNoKeyShortcuts$g,
	escapeKey: escapeKey$g,
	escapeKeyFunction: escapeKeyFunction$g,
	prefDescPause: prefDescPause$g,
	prefDescVisible: prefDescVisible$g,
	prefDescVoice: prefDescVoice$g,
	prefDescRate: prefDescRate$g,
	prefCaptionRate: prefCaptionRate$g,
	prefDescPitch: prefDescPitch$g,
	prefDescPitch1: prefDescPitch1$g,
	prefDescPitch2: prefDescPitch2$g,
	prefDescPitch3: prefDescPitch3$g,
	prefDescPitch4: prefDescPitch4$g,
	prefDescPitch5: prefDescPitch5$g,
	sampleDescriptionText: sampleDescriptionText$g,
	prefHighlight: prefHighlight$g,
	prefTabbable: prefTabbable$g,
	prefCaptionsFont: prefCaptionsFont$g,
	prefCaptionsColor: prefCaptionsColor$g,
	prefCaptionsBGColor: prefCaptionsBGColor$g,
	prefCaptionsSize: prefCaptionsSize$g,
	prefCaptionsOpacity: prefCaptionsOpacity$g,
	prefCaptionsStyle: prefCaptionsStyle$g,
	serif: serif$g,
	sans: sans$g,
	cursive: cursive$g,
	fantasy: fantasy$g,
	monospace: monospace$g,
	white: white$g,
	yellow: yellow$g,
	green: green$g,
	cyan: cyan$f,
	blue: blue$g,
	magenta: magenta$g,
	red: red$g,
	black: black$g,
	transparent: transparent$g,
	solid: solid$g,
	captionsStylePopOn: captionsStylePopOn$g,
	captionsStyleRollUp: captionsStyleRollUp$g,
	prefCaptionsPosition: prefCaptionsPosition$g,
	captionsPositionOverlay: captionsPositionOverlay$g,
	captionsPositionBelow: captionsPositionBelow$g,
	sampleCaptionText: sampleCaptionText$g,
	prefSuccess: prefSuccess$g,
	prefNoChange: prefNoChange$g,
	save: save$g,
	cancel: cancel$g,
	dismissButton: dismissButton$g,
	windowButtonLabel: windowButtonLabel$g,
	windowMove: windowMove$g,
	windowMoveLeft: windowMoveLeft$g,
	windowMoveRight: windowMoveRight$g,
	windowMoveUp: windowMoveUp$g,
	windowMoveDown: windowMoveDown$g,
	windowMoveStopped: windowMoveStopped$g,
	transcriptControls: transcriptControls$g,
	signControls: signControls$g,
	windowMoveAlert: windowMoveAlert$g,
	windowResize: windowResize$g,
	windowResizeHeading: windowResizeHeading$g,
	closeButtonLabel: closeButtonLabel$g,
	width: width$g,
	height: height$g,
	resultsSummary1: resultsSummary1$g,
	resultsSummary2: resultsSummary2$g,
	resultsSummary3: resultsSummary3$g,
	noResultsFound: noResultsFound$g,
	searchButtonLabel: searchButtonLabel$g,
	hour: hour$g,
	minute: minute$g,
	second: second$g,
	hours: hours$g,
	minutes: minutes$g,
	seconds: seconds$g,
	vtsHeading: vtsHeading$g,
	vtsInstructions1: vtsInstructions1$g,
	vtsInstructions2: vtsInstructions2$g,
	vtsInstructions3: vtsInstructions3$g,
	vtsInstructions4: vtsInstructions4$g,
	vtsInstructions5: vtsInstructions5$g,
	vtsSelectLanguage: vtsSelectLanguage$g,
	vtsSave: vtsSave$g,
	vtsReturn: vtsReturn$g,
	vtsCancel: vtsCancel$g,
	vtsRow: vtsRow$g,
	vtsKind: vtsKind$g,
	vtsStart: vtsStart$g,
	vtsEnd: vtsEnd$g,
	vtsContent: vtsContent$g,
	vtsActions: vtsActions$g,
	vtsNewRow: vtsNewRow$g,
	vtsDeletedRow: vtsDeletedRow$g,
	vtsMovedRow: vtsMovedRow$g
};

var playerHeading$f = "Media player";
var audioPlayer$f = "Audio player";
var videoPlayer$f = "Video player";
var faster$f = "Rápido";
var slower$f = "Lento";
var play$f = "Play";
var pause$f = "Pausa";
var restart$f = "Reiniciar";
var prevTrack$f = "Pista Anterior";
var nextTrack$f = "Siguiente Pista";
var rewind$f = "Rebobinar";
var forward$f = "Adelantar";
var captions$f = "Subtítulos";
var showCaptions$f = "Mostrar subtítulos";
var hideCaptions$f = "Ocultar subtítulos";
var captionsOff$f = "Sin subtítulos";
var showTranscript$f = "Mostrar transcripción";
var hideTranscript$f = "Ocultar transcripción";
var turnOnDescriptions$f = "Habilitar descripciones";
var turnOffDescriptions$f = "Deshabilitar descripciones";
var chapters$f = "Capítulos";
var language$f = "Idioma";
var sign$f = "Lengua de señas";
var showSign$f = "Mostrar lengua de señas";
var hideSign$f = "Ocultar lengua de señas";
var seekbarLabel$f = "timeline";
var mute$f = "Silenciar";
var unmute$f = "Habilitar sonido";
var volume$f = "Volumen";
var volumeUpDown$f = "Bajar sonido";
var preferences$f = "Preferencias";
var enterFullScreen$f = "Ver a pantalla completa";
var exitFullScreen$f = "Salir de pantalla completa";
var speed$f = "Velocidad";
var spacebar$f = "Barra espaciadora";
var transcriptTitle$f = "Transcript";
var lyricsTitle$f = "Letra";
var autoScroll$f = "Desplazamiento automático";
var statusPlaying$f = "Reproduciendo";
var statusPaused$f = "Pausado";
var statusStopped$f = "Detenido";
var statusBuffering$f = "Almacenando";
var statusEnd$f = "Fin de pista";
var selectedTrack$e = "Pista seleccionada";
var alertDescribedVersion$f = "Utilizando la versión audiodescrita del vídeo";
var alertNonDescribedVersion$f = "Utilizando la versión no descrita de este vídeo";
var prefMenuCaptions$f = "Subtítulos";
var prefVoicedCaptions$f = "Spoken Captions";
var prefMenuDescriptions$f = "Descripciones";
var prefMenuKeyboard$f = "Teclado";
var prefMenuTranscript$f = "Transcripción";
var prefTitleCaptions$f = "Preferencias de subtítulos";
var prefTitleDescriptions$f = "Preferencias de audiodescripción";
var prefTitleKeyboard$f = "Preferencias de teclado";
var prefTitleTranscript$e = "Preferencias de transcripción";
var prefIntroDescription1$e = "Este reproductor soporta la audiodescripción de dos maneras: ";
var prefDescription1$f = "El vídeo actual tiene una versión alternativa con descripción, descripción en texto.";
var prefDescription2$f = "El vídeo actual tiene versión alternativa del vídeo, descrito.";
var prefDescription3$f = "El vídeo actual tiene descripción en texto, leída por el lector de pantalla.";
var prefIntroDescriptionNone$f = "El vídeo actual no tiene audiodescripción de ninguna manera.";
var prefIntroDescription3$f = "Utilice el siguiente formulario para establecer sus preferencias en cuanto a la audiodescripción en texto.";
var prefIntroDescription4$f = "Una vez guardadas sus preferencias, la audiodescripción puede habilitarse o deshabilitarse mediante el botón Descripción.";
var prefIntroKeyboard1$f = "El reproductor en esta página puede manejarse desde cualquier parte de la página utilizando los atajos de teclado (vea la lista más abajo).";
var prefIntroKeyboard2$f = "Las teclas modificadoras (Mayúsculas, Alt, Control) pueden definirse más abajo.";
var prefIntroKeyboard3$f = "NOTA: Algunas combinaciones de teclas pueden entrar en conflicto con teclas utilizadas por su navegador y/o otras aplicaciones. Intente varias combinaciones de teclas modificadoras para encontrar la que funciona bien en su caso.";
var prefHeadingKeyboard1$f = "Teclas modificadoras utilizadas para atajos de teclado";
var prefHeadingKeyboard2$f = "Atajos de teclado definidos actualmente";
var prefHeadingDescription$f = "Audiodescrita";
var prefHeadingTextDescription$f = "Audiodescrita en texto";
var prefAltKey$f = "Alt";
var prefCtrlKey$f = "Control";
var prefShiftKey$f = "Mayúsculas";
var prefNoKeyShortcuts$f = "Disable keyboard shortcuts";
var escapeKey$f = "Escape";
var escapeKeyFunction$f = "Cerrar el cuadro de diálogo o menú contextual";
var prefDescPause$f = "Pausar automáticamente el video cuando arranque una descripción";
var prefDescVisible$f = "Hacer visibles las descripciones en texto si se están usando";
var prefDescVoice$f = "Voz";
var prefDescRate$f = "Spoken Description Rate";
var prefCaptionRate$f = "Spoken Caption Rate";
var prefDescPitch$f = "Tono";
var prefDescPitch1$f = "Muy grave";
var prefDescPitch2$f = "Grave";
var prefDescPitch3$f = "Normal";
var prefDescPitch4$f = "Aguda";
var prefDescPitch5$f = "Muy aguda";
var sampleDescriptionText$f = "Ajuste la configuración para escuchar este texto de muestra";
var prefHighlight$f = "Resalte la transcripción a medida que avance el contenido";
var prefTabbable$f = "Transcripción manejable por teclado";
var prefCaptionsFont$f = "Fuente";
var prefCaptionsColor$f = "Color del texto";
var prefCaptionsBGColor$f = "Fondo";
var prefCaptionsSize$f = "Tamaño de Fuente";
var prefCaptionsOpacity$f = "Opacidad";
var prefCaptionsStyle$f = "Estilo";
var serif$f = "serif";
var sans$f = "sans-serif";
var cursive$f = "cursiva";
var fantasy$f = "fantasía";
var monospace$f = "mono espaciada";
var white$f = "blanco";
var yellow$f = "amarillo";
var green$f = "verde";
var cyan$e = "cyan";
var blue$f = "azul";
var magenta$f = "magenta";
var red$f = "rojo";
var black$f = "negro";
var transparent$f = "transparente";
var solid$f = "sólido";
var captionsStylePopOn$f = "Pop-on";
var captionsStyleRollUp$f = "Roll-up";
var prefCaptionsPosition$f = "Posición";
var captionsPositionOverlay$f = "Cubrir";
var captionsPositionBelow$f = "Debajo del vídeo";
var sampleCaptionText$f = "Texto de ejemplo de subtítulo";
var prefSuccess$f = "Los cambios han sido guardados.";
var prefNoChange$f = "No se ha hecho ningún cambio.";
var save$f = "Guardar";
var cancel$f = "Cancelar";
var dismissButton$f = "Dismiss";
var windowButtonLabel$f = "Opciones en Windows";
var windowMove$f = "Mover";
var windowMoveLeft$f = "Window moved left";
var windowMoveRight$f = "Window moved right";
var windowMoveUp$f = "Window moved up";
var windowMoveDown$f = "Window moved down";
var windowMoveStopped$f = "Window move stopped";
var transcriptControls$f = "Transcript Window Controls";
var signControls$f = "Sign Language Window Controls";
var windowMoveAlert$f = "Arrastre o use las teclas de flecha para mover la ventana, pulse Enter para parar.";
var windowResize$f = "Redimensionar";
var windowResizeHeading$f = "Redimensionar la ventana con el intérprete";
var closeButtonLabel$f = "Cerrar";
var width$f = "Ancho";
var height$f = "Alto";
var resultsSummary1$f = "You searched for:";
var resultsSummary2$f = "Found %1 matching items.";
var resultsSummary3$f = "Click the time associated with any item to play the video from that point.";
var noResultsFound$f = "No results found.";
var searchButtonLabel$f = "Play at %1";
var hour$f = "hour";
var minute$f = "minute";
var second$f = "second";
var hours$f = "hours";
var minutes$f = "minutes";
var seconds$f = "seconds";
var vtsHeading$f = "Video Transcript Sorter";
var vtsInstructions1$f = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$f = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$f = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$f = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$f = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$f = "Select a language";
var vtsSave$f = "Generate new .vtt content";
var vtsReturn$f = "Return to Editor";
var vtsCancel$f = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$f = "Row";
var vtsKind$f = "Kind";
var vtsStart$f = "Start";
var vtsEnd$f = "End";
var vtsContent$f = "Content";
var vtsActions$f = "Actions";
var vtsNewRow$f = "A new row %1 has been inserted.";
var vtsDeletedRow$f = "Row %1 has been deleted.";
var vtsMovedRow$f = "Row %1 has been moved %2 and is now Row %3.";
var es = {
	playerHeading: playerHeading$f,
	audioPlayer: audioPlayer$f,
	videoPlayer: videoPlayer$f,
	faster: faster$f,
	slower: slower$f,
	play: play$f,
	pause: pause$f,
	restart: restart$f,
	prevTrack: prevTrack$f,
	nextTrack: nextTrack$f,
	rewind: rewind$f,
	forward: forward$f,
	captions: captions$f,
	showCaptions: showCaptions$f,
	hideCaptions: hideCaptions$f,
	captionsOff: captionsOff$f,
	showTranscript: showTranscript$f,
	hideTranscript: hideTranscript$f,
	turnOnDescriptions: turnOnDescriptions$f,
	turnOffDescriptions: turnOffDescriptions$f,
	chapters: chapters$f,
	language: language$f,
	sign: sign$f,
	showSign: showSign$f,
	hideSign: hideSign$f,
	seekbarLabel: seekbarLabel$f,
	mute: mute$f,
	unmute: unmute$f,
	volume: volume$f,
	volumeUpDown: volumeUpDown$f,
	preferences: preferences$f,
	enterFullScreen: enterFullScreen$f,
	exitFullScreen: exitFullScreen$f,
	speed: speed$f,
	spacebar: spacebar$f,
	transcriptTitle: transcriptTitle$f,
	lyricsTitle: lyricsTitle$f,
	autoScroll: autoScroll$f,
	statusPlaying: statusPlaying$f,
	statusPaused: statusPaused$f,
	statusStopped: statusStopped$f,
	statusBuffering: statusBuffering$f,
	statusEnd: statusEnd$f,
	selectedTrack: selectedTrack$e,
	alertDescribedVersion: alertDescribedVersion$f,
	alertNonDescribedVersion: alertNonDescribedVersion$f,
	prefMenuCaptions: prefMenuCaptions$f,
	prefVoicedCaptions: prefVoicedCaptions$f,
	prefMenuDescriptions: prefMenuDescriptions$f,
	prefMenuKeyboard: prefMenuKeyboard$f,
	prefMenuTranscript: prefMenuTranscript$f,
	prefTitleCaptions: prefTitleCaptions$f,
	prefTitleDescriptions: prefTitleDescriptions$f,
	prefTitleKeyboard: prefTitleKeyboard$f,
	prefTitleTranscript: prefTitleTranscript$e,
	prefIntroDescription1: prefIntroDescription1$e,
	prefDescription1: prefDescription1$f,
	prefDescription2: prefDescription2$f,
	prefDescription3: prefDescription3$f,
	prefIntroDescriptionNone: prefIntroDescriptionNone$f,
	prefIntroDescription3: prefIntroDescription3$f,
	prefIntroDescription4: prefIntroDescription4$f,
	prefIntroKeyboard1: prefIntroKeyboard1$f,
	prefIntroKeyboard2: prefIntroKeyboard2$f,
	prefIntroKeyboard3: prefIntroKeyboard3$f,
	prefHeadingKeyboard1: prefHeadingKeyboard1$f,
	prefHeadingKeyboard2: prefHeadingKeyboard2$f,
	prefHeadingDescription: prefHeadingDescription$f,
	prefHeadingTextDescription: prefHeadingTextDescription$f,
	prefAltKey: prefAltKey$f,
	prefCtrlKey: prefCtrlKey$f,
	prefShiftKey: prefShiftKey$f,
	prefNoKeyShortcuts: prefNoKeyShortcuts$f,
	escapeKey: escapeKey$f,
	escapeKeyFunction: escapeKeyFunction$f,
	prefDescPause: prefDescPause$f,
	prefDescVisible: prefDescVisible$f,
	prefDescVoice: prefDescVoice$f,
	prefDescRate: prefDescRate$f,
	prefCaptionRate: prefCaptionRate$f,
	prefDescPitch: prefDescPitch$f,
	prefDescPitch1: prefDescPitch1$f,
	prefDescPitch2: prefDescPitch2$f,
	prefDescPitch3: prefDescPitch3$f,
	prefDescPitch4: prefDescPitch4$f,
	prefDescPitch5: prefDescPitch5$f,
	sampleDescriptionText: sampleDescriptionText$f,
	prefHighlight: prefHighlight$f,
	prefTabbable: prefTabbable$f,
	prefCaptionsFont: prefCaptionsFont$f,
	prefCaptionsColor: prefCaptionsColor$f,
	prefCaptionsBGColor: prefCaptionsBGColor$f,
	prefCaptionsSize: prefCaptionsSize$f,
	prefCaptionsOpacity: prefCaptionsOpacity$f,
	prefCaptionsStyle: prefCaptionsStyle$f,
	serif: serif$f,
	sans: sans$f,
	cursive: cursive$f,
	fantasy: fantasy$f,
	monospace: monospace$f,
	white: white$f,
	yellow: yellow$f,
	green: green$f,
	cyan: cyan$e,
	blue: blue$f,
	magenta: magenta$f,
	red: red$f,
	black: black$f,
	transparent: transparent$f,
	solid: solid$f,
	captionsStylePopOn: captionsStylePopOn$f,
	captionsStyleRollUp: captionsStyleRollUp$f,
	prefCaptionsPosition: prefCaptionsPosition$f,
	captionsPositionOverlay: captionsPositionOverlay$f,
	captionsPositionBelow: captionsPositionBelow$f,
	sampleCaptionText: sampleCaptionText$f,
	prefSuccess: prefSuccess$f,
	prefNoChange: prefNoChange$f,
	save: save$f,
	cancel: cancel$f,
	dismissButton: dismissButton$f,
	windowButtonLabel: windowButtonLabel$f,
	windowMove: windowMove$f,
	windowMoveLeft: windowMoveLeft$f,
	windowMoveRight: windowMoveRight$f,
	windowMoveUp: windowMoveUp$f,
	windowMoveDown: windowMoveDown$f,
	windowMoveStopped: windowMoveStopped$f,
	transcriptControls: transcriptControls$f,
	signControls: signControls$f,
	windowMoveAlert: windowMoveAlert$f,
	windowResize: windowResize$f,
	windowResizeHeading: windowResizeHeading$f,
	closeButtonLabel: closeButtonLabel$f,
	width: width$f,
	height: height$f,
	resultsSummary1: resultsSummary1$f,
	resultsSummary2: resultsSummary2$f,
	resultsSummary3: resultsSummary3$f,
	noResultsFound: noResultsFound$f,
	searchButtonLabel: searchButtonLabel$f,
	hour: hour$f,
	minute: minute$f,
	second: second$f,
	hours: hours$f,
	minutes: minutes$f,
	seconds: seconds$f,
	vtsHeading: vtsHeading$f,
	vtsInstructions1: vtsInstructions1$f,
	vtsInstructions2: vtsInstructions2$f,
	vtsInstructions3: vtsInstructions3$f,
	vtsInstructions4: vtsInstructions4$f,
	vtsInstructions5: vtsInstructions5$f,
	vtsSelectLanguage: vtsSelectLanguage$f,
	vtsSave: vtsSave$f,
	vtsReturn: vtsReturn$f,
	vtsCancel: vtsCancel$f,
	vtsRow: vtsRow$f,
	vtsKind: vtsKind$f,
	vtsStart: vtsStart$f,
	vtsEnd: vtsEnd$f,
	vtsContent: vtsContent$f,
	vtsActions: vtsActions$f,
	vtsNewRow: vtsNewRow$f,
	vtsDeletedRow: vtsDeletedRow$f,
	vtsMovedRow: vtsMovedRow$f
};

var playerHeading$e = "Lecteur multimédia";
var audioPlayer$e = "Audio player";
var videoPlayer$e = "Video player";
var faster$e = "Plus rapidement";
var slower$e = "Plus lentement";
var play$e = "Lecture";
var pause$e = "Pause";
var restart$e = "Redémarrer";
var prevTrack$e = "Piste Précédente";
var nextTrack$e = "Piste Suivante";
var rewind$e = "Reculer";
var forward$e = "Avancer";
var captions$e = "Sous-titres";
var showCaptions$e = "Afficher les sous-titres";
var hideCaptions$e = "Masquer les sous-titres";
var captionsOff$e = "Sous-titres désactivés";
var showTranscript$e = "Afficher la transcription";
var hideTranscript$e = "Masquer la transcription";
var turnOnDescriptions$e = "Activer les descriptions";
var turnOffDescriptions$e = "Désactiver les descriptions";
var chapters$e = "Chapitres";
var language$e = "Langue";
var sign$e = "Langage gestuel";
var showSign$e = "Afficher le langage gestuel";
var hideSign$e = "Masque le langage gestuel";
var seekbarLabel$e = "timeline";
var mute$e = "Son désactivé";
var unmute$e = "Son activé";
var volume$e = "Volume";
var volumeUpDown$e = "Monter baisser le volume";
var preferences$e = "Préférences";
var enterFullScreen$e = "Activer le mode plein écran";
var exitFullScreen$e = "Quitter le mode plein écran";
var speed$e = "Vitesse";
var spacebar$e = "barre d’espacement";
var transcriptTitle$e = "Transcription";
var lyricsTitle$e = "Paroles";
var autoScroll$e = "Défilement automatique";
var statusPlaying$e = "Lecture en cours";
var statusPaused$e = "Lecture sur pause";
var statusStopped$e = "Lecture interrompue";
var statusBuffering$e = "Tamponnage";
var statusEnd$e = "Fin de la piste";
var selectedTrack$d = "Piste choisie";
var alertDescribedVersion$e = "Utilisation de la version avec description sonore de cette vidéo";
var alertNonDescribedVersion$e = "Utilisation de la version non décrite de cette vidéo";
var prefMenuCaptions$e = "Sous-titres";
var prefVoicedCaptions$e = "Spoken Captions";
var prefMenuDescriptions$e = "Descriptions";
var prefMenuKeyboard$e = "Clavier";
var prefMenuTranscript$e = "Transcription";
var prefTitleCaptions$e = "Préférences liées au sous-titrage";
var prefTitleDescriptions$e = "Préférences liées aux descriptions sonores";
var prefTitleKeyboard$e = "Préférences liées au clavier";
var prefTitleTranscript$d = "Préférence liées à la transcription";
var prefIntroDescription1$d = "Ce lecteur multimédia permet d’entendre les descriptions sonores de deux façons:";
var prefDescription1$e = "Il y a une version autre version avec description, description textuelle.";
var prefDescription2$e = "Il y a une version autre version de la vidéo avec description.";
var prefDescription3$e = "Il y a une version description textuelle, lue à l’aide d’un lecteur d’écran.";
var prefIntroDescriptionNone$e = "Il n’y a pas de version avec description sonore (dans ni l’un ni l’autre des formats) de la présente vidéo.";
var prefIntroDescription3$e = "Utilisez le formulaire suivant pour établir vos préférences liées aux descriptions sonores textuelle.";
var prefIntroDescription4$e = "Après avoir enregistré vos préférences, vous pouvez activer ou désactiver la description sonore avec le bouton Description.";
var prefIntroKeyboard1$e = "Le lecteur multimédia de cette page Web peut être utilisé à partir de n’importe quel endroit sur la page avec des raccourcis du clavier (voir la liste ci-dessous).";
var prefIntroKeyboard2$e = "Des rôles peuvent être assignés aux touches de modification (Shift, Alt, Ctrl) ci-dessous.";
var prefIntroKeyboard3$e = "Certaines combinaisons de touches pourraient entrer en conflit avec les touches utilisées par votre navigateur ou autres applications logicielles. Essayez diverses combinaisons de touches de modification pour en trouver qui fonctionnent pour vous.";
var prefHeadingKeyboard1$e = "Touches de modification utilisées pour des raccourcis";
var prefHeadingKeyboard2$e = "Raccourcis du clavier assignés actuellement";
var prefHeadingDescription$e = "Description sonore";
var prefHeadingTextDescription$e = "Description sonore textuelle";
var prefAltKey$e = "Alt";
var prefCtrlKey$e = "Ctrl";
var prefShiftKey$e = "Shift";
var prefNoKeyShortcuts$e = "Disable keyboard shortcuts";
var escapeKey$e = "Esc";
var escapeKeyFunction$e = "Fermer la fenêtre de dialogue ou le menu contextuel";
var prefDescPause$e = "Mettre la vidéo en pause automatiquement quand la description commence";
var prefDescVisible$e = "Affichez la description";
var prefDescVoice$e = "Voix";
var prefDescRate$e = "Spoken Description Rate";
var prefCaptionRate$e = "Spoken Caption Rate";
var prefDescPitch$e = "Volume";
var prefDescPitch1$e = "Très faible";
var prefDescPitch2$e = "Faible";
var prefDescPitch3$e = "Par défaut";
var prefDescPitch4$e = "Fort";
var prefDescPitch5$e = "Très fort";
var sampleDescriptionText$e = "Régler les paramètres afin d'entendre cet extrait de texte";
var prefHighlight$e = "Surligner la transcription pendant la lecture";
var prefTabbable$e = "Transcription activée par clavier";
var prefCaptionsFont$e = "Police de caractères";
var prefCaptionsColor$e = "Couleur du texte";
var prefCaptionsBGColor$e = "Arrière-plan";
var prefCaptionsSize$e = "Taille de la police";
var prefCaptionsOpacity$e = "Opacité";
var prefCaptionsStyle$e = "Style";
var serif$e = "avec empattement";
var sans$e = "sans empattement";
var cursive$e = "écriture cursive";
var fantasy$e = "écriture de fantaisie";
var monospace$e = "à taille fixe";
var white$e = "blanc";
var yellow$e = "jaune";
var green$e = "vert";
var cyan$d = "cyan";
var blue$e = "bleu";
var magenta$e = "magenta";
var red$e = "rouge";
var black$e = "noir";
var transparent$e = "transparent";
var solid$e = "solide";
var captionsStylePopOn$e = "Pop-on";
var captionsStyleRollUp$e = "Roll-up";
var prefCaptionsPosition$e = "Position";
var captionsPositionOverlay$e = "Superposés";
var captionsPositionBelow$e = "Sous la vidéo";
var sampleCaptionText$e = "Échantillon de sous-titre";
var prefSuccess$e = "Vos changements ont été enregistrés.";
var prefNoChange$e = "Vous n’avez pas fait de changements.";
var save$e = "Enregistrer";
var cancel$e = "Annuler";
var dismissButton$e = "Dismiss";
var windowButtonLabel$e = "Options de fenêtre";
var windowMove$e = "Déplacer";
var windowMoveLeft$e = "Window moved left";
var windowMoveRight$e = "Window moved right";
var windowMoveUp$e = "Window moved up";
var windowMoveDown$e = "Window moved down";
var windowMoveStopped$e = "Window move stopped";
var transcriptControls$e = "Transcript Window Controls";
var signControls$e = "Sign Language Window Controls";
var windowMoveAlert$e = "Faites glisser avec la souris ou utilisez les touches fléchées pour déplacer la fenêtre; appuyez sur « Enter » pour arrêter.";
var windowResize$e = "Redimensionner";
var windowResizeHeading$e = "Redimensionner la fenêtre de l’interprète";
var closeButtonLabel$e = "Fermer";
var width$e = "Largeur";
var height$e = "Hauteur";
var resultsSummary1$e = "Vos résultats de recherche";
var resultsSummary2$e = "Trouvé %1 éléments correspondants.";
var resultsSummary3$e = "Cliquez sur le temps associé à n'importe quel élément pour lire la vidéo à partir de ce point.";
var noResultsFound$e = "Aucun résultat trouvé.";
var searchButtonLabel$e = "Lecture à %1";
var hour$e = "heure";
var minute$e = "minute";
var second$e = "seconde";
var hours$e = "heures";
var minutes$e = "minutes";
var seconds$e = "seconds";
var vtsHeading$e = "Video Transcript Sorter";
var vtsInstructions1$e = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$e = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$e = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$e = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$e = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$e = "Select a language";
var vtsSave$e = "Generate new .vtt content";
var vtsReturn$e = "Return to Editor";
var vtsCancel$e = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$e = "Row";
var vtsKind$e = "Kind";
var vtsStart$e = "Start";
var vtsEnd$e = "End";
var vtsContent$e = "Content";
var vtsActions$e = "Actions";
var vtsNewRow$e = "A new row %1 has been inserted.";
var vtsDeletedRow$e = "Row %1 has been deleted.";
var vtsMovedRow$e = "Row %1 has been moved %2 and is now Row %3.";
var fr = {
	playerHeading: playerHeading$e,
	audioPlayer: audioPlayer$e,
	videoPlayer: videoPlayer$e,
	faster: faster$e,
	slower: slower$e,
	play: play$e,
	pause: pause$e,
	restart: restart$e,
	prevTrack: prevTrack$e,
	nextTrack: nextTrack$e,
	rewind: rewind$e,
	forward: forward$e,
	captions: captions$e,
	showCaptions: showCaptions$e,
	hideCaptions: hideCaptions$e,
	captionsOff: captionsOff$e,
	showTranscript: showTranscript$e,
	hideTranscript: hideTranscript$e,
	turnOnDescriptions: turnOnDescriptions$e,
	turnOffDescriptions: turnOffDescriptions$e,
	chapters: chapters$e,
	language: language$e,
	sign: sign$e,
	showSign: showSign$e,
	hideSign: hideSign$e,
	seekbarLabel: seekbarLabel$e,
	mute: mute$e,
	unmute: unmute$e,
	volume: volume$e,
	volumeUpDown: volumeUpDown$e,
	preferences: preferences$e,
	enterFullScreen: enterFullScreen$e,
	exitFullScreen: exitFullScreen$e,
	speed: speed$e,
	spacebar: spacebar$e,
	transcriptTitle: transcriptTitle$e,
	lyricsTitle: lyricsTitle$e,
	autoScroll: autoScroll$e,
	statusPlaying: statusPlaying$e,
	statusPaused: statusPaused$e,
	statusStopped: statusStopped$e,
	statusBuffering: statusBuffering$e,
	statusEnd: statusEnd$e,
	selectedTrack: selectedTrack$d,
	alertDescribedVersion: alertDescribedVersion$e,
	alertNonDescribedVersion: alertNonDescribedVersion$e,
	prefMenuCaptions: prefMenuCaptions$e,
	prefVoicedCaptions: prefVoicedCaptions$e,
	prefMenuDescriptions: prefMenuDescriptions$e,
	prefMenuKeyboard: prefMenuKeyboard$e,
	prefMenuTranscript: prefMenuTranscript$e,
	prefTitleCaptions: prefTitleCaptions$e,
	prefTitleDescriptions: prefTitleDescriptions$e,
	prefTitleKeyboard: prefTitleKeyboard$e,
	prefTitleTranscript: prefTitleTranscript$d,
	prefIntroDescription1: prefIntroDescription1$d,
	prefDescription1: prefDescription1$e,
	prefDescription2: prefDescription2$e,
	prefDescription3: prefDescription3$e,
	prefIntroDescriptionNone: prefIntroDescriptionNone$e,
	prefIntroDescription3: prefIntroDescription3$e,
	prefIntroDescription4: prefIntroDescription4$e,
	prefIntroKeyboard1: prefIntroKeyboard1$e,
	prefIntroKeyboard2: prefIntroKeyboard2$e,
	prefIntroKeyboard3: prefIntroKeyboard3$e,
	prefHeadingKeyboard1: prefHeadingKeyboard1$e,
	prefHeadingKeyboard2: prefHeadingKeyboard2$e,
	prefHeadingDescription: prefHeadingDescription$e,
	prefHeadingTextDescription: prefHeadingTextDescription$e,
	prefAltKey: prefAltKey$e,
	prefCtrlKey: prefCtrlKey$e,
	prefShiftKey: prefShiftKey$e,
	prefNoKeyShortcuts: prefNoKeyShortcuts$e,
	escapeKey: escapeKey$e,
	escapeKeyFunction: escapeKeyFunction$e,
	prefDescPause: prefDescPause$e,
	prefDescVisible: prefDescVisible$e,
	prefDescVoice: prefDescVoice$e,
	prefDescRate: prefDescRate$e,
	prefCaptionRate: prefCaptionRate$e,
	prefDescPitch: prefDescPitch$e,
	prefDescPitch1: prefDescPitch1$e,
	prefDescPitch2: prefDescPitch2$e,
	prefDescPitch3: prefDescPitch3$e,
	prefDescPitch4: prefDescPitch4$e,
	prefDescPitch5: prefDescPitch5$e,
	sampleDescriptionText: sampleDescriptionText$e,
	prefHighlight: prefHighlight$e,
	prefTabbable: prefTabbable$e,
	prefCaptionsFont: prefCaptionsFont$e,
	prefCaptionsColor: prefCaptionsColor$e,
	prefCaptionsBGColor: prefCaptionsBGColor$e,
	prefCaptionsSize: prefCaptionsSize$e,
	prefCaptionsOpacity: prefCaptionsOpacity$e,
	prefCaptionsStyle: prefCaptionsStyle$e,
	serif: serif$e,
	sans: sans$e,
	cursive: cursive$e,
	fantasy: fantasy$e,
	monospace: monospace$e,
	white: white$e,
	yellow: yellow$e,
	green: green$e,
	cyan: cyan$d,
	blue: blue$e,
	magenta: magenta$e,
	red: red$e,
	black: black$e,
	transparent: transparent$e,
	solid: solid$e,
	captionsStylePopOn: captionsStylePopOn$e,
	captionsStyleRollUp: captionsStyleRollUp$e,
	prefCaptionsPosition: prefCaptionsPosition$e,
	captionsPositionOverlay: captionsPositionOverlay$e,
	captionsPositionBelow: captionsPositionBelow$e,
	sampleCaptionText: sampleCaptionText$e,
	prefSuccess: prefSuccess$e,
	prefNoChange: prefNoChange$e,
	save: save$e,
	cancel: cancel$e,
	dismissButton: dismissButton$e,
	windowButtonLabel: windowButtonLabel$e,
	windowMove: windowMove$e,
	windowMoveLeft: windowMoveLeft$e,
	windowMoveRight: windowMoveRight$e,
	windowMoveUp: windowMoveUp$e,
	windowMoveDown: windowMoveDown$e,
	windowMoveStopped: windowMoveStopped$e,
	transcriptControls: transcriptControls$e,
	signControls: signControls$e,
	windowMoveAlert: windowMoveAlert$e,
	windowResize: windowResize$e,
	windowResizeHeading: windowResizeHeading$e,
	closeButtonLabel: closeButtonLabel$e,
	width: width$e,
	height: height$e,
	resultsSummary1: resultsSummary1$e,
	resultsSummary2: resultsSummary2$e,
	resultsSummary3: resultsSummary3$e,
	noResultsFound: noResultsFound$e,
	searchButtonLabel: searchButtonLabel$e,
	hour: hour$e,
	minute: minute$e,
	second: second$e,
	hours: hours$e,
	minutes: minutes$e,
	seconds: seconds$e,
	vtsHeading: vtsHeading$e,
	vtsInstructions1: vtsInstructions1$e,
	vtsInstructions2: vtsInstructions2$e,
	vtsInstructions3: vtsInstructions3$e,
	vtsInstructions4: vtsInstructions4$e,
	vtsInstructions5: vtsInstructions5$e,
	vtsSelectLanguage: vtsSelectLanguage$e,
	vtsSave: vtsSave$e,
	vtsReturn: vtsReturn$e,
	vtsCancel: vtsCancel$e,
	vtsRow: vtsRow$e,
	vtsKind: vtsKind$e,
	vtsStart: vtsStart$e,
	vtsEnd: vtsEnd$e,
	vtsContent: vtsContent$e,
	vtsActions: vtsActions$e,
	vtsNewRow: vtsNewRow$e,
	vtsDeletedRow: vtsDeletedRow$e,
	vtsMovedRow: vtsMovedRow$e
};

var playerHeading$d = "נגן מדיה";
var audioPlayer$d = "Audio player";
var videoPlayer$d = "Video player";
var faster$d = "מהר יותר";
var slower$d = "לאט יותר";
var play$d = "נגן";
var pause$d = "הפסקה";
var restart$d = "התחלה מחדש";
var prevTrack$d = "המסלול הקודם";
var nextTrack$d = "המסלול הבא";
var rewind$d = "חזרה";
var forward$d = "קדימה";
var captions$d = "כיתובים";
var showCaptions$d = "הצגת כיתובים";
var hideCaptions$d = "הסתרת כיתובים";
var captionsOff$d = "ללא כיתובים";
var showTranscript$d = "הצג תמליל";
var hideTranscript$d = "הסתר תמליל";
var turnOnDescriptions$d = "הפעל תמליל";
var turnOffDescriptions$d = "סגור תמליל";
var chapters$d = "פרקים";
var language$d = "שפה";
var sign$d = "שפת סימנים";
var showSign$d = "הצג שפת סימנים";
var hideSign$d = "הסתר שפת סימנים";
var seekbarLabel$d = "ציר זמן";
var mute$d = "השתקה";
var unmute$d = "הפסקת השתקה";
var volume$d = "עצמה";
var volumeUpDown$d = "Volume up down";
var preferences$d = "העדפות";
var enterFullScreen$d = "מעבר למסך מלא";
var exitFullScreen$d = "יציאה ממסך מלא";
var speed$d = "מהירות";
var spacebar$d = "מקש הרווח";
var transcriptTitle$d = "תמליל";
var lyricsTitle$d = "מילים";
var autoScroll$d = "גלילה אוטומטית";
var statusPlaying$d = "מנגן";
var statusPaused$d = "מופסק";
var statusStopped$d = "נעצר";
var statusBuffering$d = "חציצה";
var statusEnd$d = "סוף המסלול";
var selectTrack = "מסלול נבחר";
var alertDescribedVersion$d = "שימוש בגירסת אודיו המתוארת של סרטון זה";
var alertNonDescribedVersion$d = "שימוש בגרסה הלא מתוארת של סרטון זה";
var prefMenuCaptions$d = "כיתובים";
var prefVoicedCaptions$d = "Spoken Captions";
var prefMenuDescriptions$d = "תיאורים";
var prefMenuKeyboard$d = "מקלדת";
var prefMenuTranscript$d = "תמליל";
var prefTitleCaptions$d = "העדפות כיתובים";
var prefTitleDescriptions$d = "העדפות תיאור שמע";
var prefTitleKeyboard$d = "העדפות מקלדת";
var PrefTitleTranscript = "העדפות תמליל";
var prefIntrodescription1 = "נגן המדיה תומך בתיאור השמע בשתי דרכים:";
var prefDescription1$d = "הווידאו הנוכחי יש גרסה חלופית המתוארתתיאור מבוסס טקסט";
var prefDescription2$d = "הווידאו הנוכחי ישגרסה חלופית המתוארת של וידאו";
var prefDescription3$d = "הווידאו הנוכחי יש תיאור מבוסס טקסט, הודיעה על ידי קורא מסך";
var prefIntroDescriptionNone$d = "לסרטון הנוכחי אין תיאור שמע בתבנית.";
var prefIntroDescription3$d = "השתמש בטופס הבא כדי לקבוע את ההעדפות שלך הקשורות לתיאור שמע.";
var prefIntroDescription4$d = "לאחר שתשמור את ההגדרות שלך, תיאור השמע יכול להיות מוחל על / כיבוי באמצעות לחצן תיאור.";
var prefIntroKeyboard1$d = "נגן המדיה בדף אינטרנט זה יכול להיות מופעל מכל מקום בדף באמצעות קיצורי מקשים (ראה להלן רשימה).";
var prefIntroKeyboard2$d = "ניתן לשנות את מקשי השינוי (Shift, Alt ו- Control).";
var prefIntroKeyboard3$d = "הערה: ייתכן שחלק מצירופי המקשים מתנגשים עם המקשים המשמשים את הדפדפן ו / או יישומי תוכנה אחרים, נסה שילובים שונים של מפתחות שינוי כדי למצוא אחד המתאים לך.";
var prefHeadingKeyboard1$d = "מקשי משנה המשמשים לקיצורי דרך";
var prefHeadingKeyboard2$d = "קיצורי מקשים נוכחיים";
var prefHeadingDescription$d = "תיאור שמע";
var prefHeadingTextDescription$d = "תיאור מבוסס טקסט מבוסס טקסט";
var prefAltKey$d = "Alt";
var prefCtrlKey$d = "Control";
var prefShiftKey$d = "Shift";
var prefNoKeyShortcuts$d = "Disable keyboard shortcuts";
var escapeKey$d = "Escape";
var escapeKeyFunction$d = "סגור את תיבת הדו שיח הנוכחית או תפריט קופץ";
var prefDescPause$d = "השהה את הווידאו באופן אוטומטי כאשר התיאור מתחיל";
var prefDescVisible$d = "הפוך תיאור גלוי";
var prefDescVoice$d = "Voice";
var prefDescRate$d = "Spoken Description Rate";
var prefCaptionRate$d = "Spoken Caption Rate";
var prefDescPitch$d = "Pitch";
var prefDescPitch1$d = "Very low";
var prefDescPitch2$d = "Low";
var prefDescPitch3$d = "Default";
var prefDescPitch4$d = "High";
var prefDescPitch5$d = "Very high";
var sampleDescriptionText$d = "Adjust settings to hear this sample text.";
var prefHighlight$d = "הדגש תמליל כמו משחק מדיה";
var prefTabbable$d = "הפעל תמליל";
var prefCaptionsFont$d = "גופן";
var prefCaptionsColor$d = "צבע טקסט";
var prefCaptionsBGColor$d = "רקע";
var prefCaptionsSize$d = "גודל גופן";
var prefCaptionsOpacity$d = "אטימות";
var prefCaptionsStyle$d = "סגנון";
var serif$d = "serif";
var sans$d = "sans-serif";
var cursive$d = "cursive";
var fantasy$d = "fantasy";
var monospace$d = "monospace";
var white$d = "לבן";
var yellow$d = "צהוב";
var green$d = "ירוק";
var cyan$c = "טורקיז";
var blue$d = "כחול";
var magenta$d = "מגנטה";
var red$d = "אדום";
var black$d = "שחור";
var transparent$d = "שקוף";
var solid$d = "מלא";
var captionsStylePopOn$d = "Pop-on";
var captionsStyleRollUp$d = "Roll-up";
var prefCaptionsPosition$d = "מיקום";
var captionsPositionOverlay$d = "Overlay";
var captionsPositionBelow$d = "מתחת לוידאו";
var sampleCaptionText$d = "דוגמת טקסט כיתוביות";
var prefSuccess$d = "השינויים שלכם נשמרו.";
var prefNoChange$d = "לא בצעתם כל שינוי.";
var save$d = "שמירה";
var cancel$d = "ביטול";
var dismissButton$d = "Dismiss";
var windowButtonLabel$d = "אפשרויות חלון";
var windowMove$d = "הזזה";
var windowMoveLeft$d = "Window moved left";
var windowMoveRight$d = "Window moved right";
var windowMoveUp$d = "Window moved up";
var windowMoveDown$d = "Window moved down";
var windowMoveStopped$d = "Window move stopped";
var transcriptControls$d = "Transcript Window Controls";
var signControls$d = "Sign Language Window Controls";
var windowMoveAlert$d = "גרור או השתמשו מקשי החצים להזזת החלון; כפתור Enter להפסקה";
var windowResize$d = "שיוי גודל";
var windowResizeHeading$d = "שינוי גודל חלון";
var closeButtonLabel$d = "סגירת";
var width$d = "רוחב";
var height$d = "גובה";
var resultsSummary1$d = "You searched for:";
var resultsSummary2$d = "Found %1 matching items.";
var resultsSummary3$d = "Click the time associated with any item to play the video from that point.";
var noResultsFound$d = "No results found.";
var searchButtonLabel$d = "Play at %1";
var hour$d = "hour";
var minute$d = "minute";
var second$d = "second";
var hours$d = "hours";
var minutes$d = "minutes";
var seconds$d = "seconds";
var vtsHeading$d = "Video Transcript Sorter";
var vtsInstructions1$d = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$d = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$d = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$d = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$d = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$d = "Select a language";
var vtsSave$d = "Generate new .vtt content";
var vtsReturn$d = "Return to Editor";
var vtsCancel$d = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$d = "Row";
var vtsKind$d = "Kind";
var vtsStart$d = "Start";
var vtsEnd$d = "End";
var vtsContent$d = "Content";
var vtsActions$d = "Actions";
var vtsNewRow$d = "A new row %1 has been inserted.";
var vtsDeletedRow$d = "Row %1 has been deleted.";
var vtsMovedRow$d = "Row %1 has been moved %2 and is now Row %3.";
var he = {
	playerHeading: playerHeading$d,
	audioPlayer: audioPlayer$d,
	videoPlayer: videoPlayer$d,
	faster: faster$d,
	slower: slower$d,
	play: play$d,
	pause: pause$d,
	restart: restart$d,
	prevTrack: prevTrack$d,
	nextTrack: nextTrack$d,
	rewind: rewind$d,
	forward: forward$d,
	captions: captions$d,
	showCaptions: showCaptions$d,
	hideCaptions: hideCaptions$d,
	captionsOff: captionsOff$d,
	showTranscript: showTranscript$d,
	hideTranscript: hideTranscript$d,
	turnOnDescriptions: turnOnDescriptions$d,
	turnOffDescriptions: turnOffDescriptions$d,
	chapters: chapters$d,
	language: language$d,
	sign: sign$d,
	showSign: showSign$d,
	hideSign: hideSign$d,
	seekbarLabel: seekbarLabel$d,
	mute: mute$d,
	unmute: unmute$d,
	volume: volume$d,
	volumeUpDown: volumeUpDown$d,
	preferences: preferences$d,
	enterFullScreen: enterFullScreen$d,
	exitFullScreen: exitFullScreen$d,
	speed: speed$d,
	spacebar: spacebar$d,
	transcriptTitle: transcriptTitle$d,
	lyricsTitle: lyricsTitle$d,
	autoScroll: autoScroll$d,
	statusPlaying: statusPlaying$d,
	statusPaused: statusPaused$d,
	statusStopped: statusStopped$d,
	statusBuffering: statusBuffering$d,
	statusEnd: statusEnd$d,
	selectTrack: selectTrack,
	alertDescribedVersion: alertDescribedVersion$d,
	alertNonDescribedVersion: alertNonDescribedVersion$d,
	prefMenuCaptions: prefMenuCaptions$d,
	prefVoicedCaptions: prefVoicedCaptions$d,
	prefMenuDescriptions: prefMenuDescriptions$d,
	prefMenuKeyboard: prefMenuKeyboard$d,
	prefMenuTranscript: prefMenuTranscript$d,
	prefTitleCaptions: prefTitleCaptions$d,
	prefTitleDescriptions: prefTitleDescriptions$d,
	prefTitleKeyboard: prefTitleKeyboard$d,
	PrefTitleTranscript: PrefTitleTranscript,
	prefIntrodescription1: prefIntrodescription1,
	prefDescription1: prefDescription1$d,
	prefDescription2: prefDescription2$d,
	prefDescription3: prefDescription3$d,
	prefIntroDescriptionNone: prefIntroDescriptionNone$d,
	prefIntroDescription3: prefIntroDescription3$d,
	prefIntroDescription4: prefIntroDescription4$d,
	prefIntroKeyboard1: prefIntroKeyboard1$d,
	prefIntroKeyboard2: prefIntroKeyboard2$d,
	prefIntroKeyboard3: prefIntroKeyboard3$d,
	prefHeadingKeyboard1: prefHeadingKeyboard1$d,
	prefHeadingKeyboard2: prefHeadingKeyboard2$d,
	prefHeadingDescription: prefHeadingDescription$d,
	prefHeadingTextDescription: prefHeadingTextDescription$d,
	prefAltKey: prefAltKey$d,
	prefCtrlKey: prefCtrlKey$d,
	prefShiftKey: prefShiftKey$d,
	prefNoKeyShortcuts: prefNoKeyShortcuts$d,
	escapeKey: escapeKey$d,
	escapeKeyFunction: escapeKeyFunction$d,
	prefDescPause: prefDescPause$d,
	prefDescVisible: prefDescVisible$d,
	prefDescVoice: prefDescVoice$d,
	prefDescRate: prefDescRate$d,
	prefCaptionRate: prefCaptionRate$d,
	prefDescPitch: prefDescPitch$d,
	prefDescPitch1: prefDescPitch1$d,
	prefDescPitch2: prefDescPitch2$d,
	prefDescPitch3: prefDescPitch3$d,
	prefDescPitch4: prefDescPitch4$d,
	prefDescPitch5: prefDescPitch5$d,
	sampleDescriptionText: sampleDescriptionText$d,
	prefHighlight: prefHighlight$d,
	prefTabbable: prefTabbable$d,
	prefCaptionsFont: prefCaptionsFont$d,
	prefCaptionsColor: prefCaptionsColor$d,
	prefCaptionsBGColor: prefCaptionsBGColor$d,
	prefCaptionsSize: prefCaptionsSize$d,
	prefCaptionsOpacity: prefCaptionsOpacity$d,
	prefCaptionsStyle: prefCaptionsStyle$d,
	serif: serif$d,
	sans: sans$d,
	cursive: cursive$d,
	fantasy: fantasy$d,
	monospace: monospace$d,
	white: white$d,
	yellow: yellow$d,
	green: green$d,
	cyan: cyan$c,
	blue: blue$d,
	magenta: magenta$d,
	red: red$d,
	black: black$d,
	transparent: transparent$d,
	solid: solid$d,
	captionsStylePopOn: captionsStylePopOn$d,
	captionsStyleRollUp: captionsStyleRollUp$d,
	prefCaptionsPosition: prefCaptionsPosition$d,
	captionsPositionOverlay: captionsPositionOverlay$d,
	captionsPositionBelow: captionsPositionBelow$d,
	sampleCaptionText: sampleCaptionText$d,
	prefSuccess: prefSuccess$d,
	prefNoChange: prefNoChange$d,
	save: save$d,
	cancel: cancel$d,
	dismissButton: dismissButton$d,
	windowButtonLabel: windowButtonLabel$d,
	windowMove: windowMove$d,
	windowMoveLeft: windowMoveLeft$d,
	windowMoveRight: windowMoveRight$d,
	windowMoveUp: windowMoveUp$d,
	windowMoveDown: windowMoveDown$d,
	windowMoveStopped: windowMoveStopped$d,
	transcriptControls: transcriptControls$d,
	signControls: signControls$d,
	windowMoveAlert: windowMoveAlert$d,
	windowResize: windowResize$d,
	windowResizeHeading: windowResizeHeading$d,
	closeButtonLabel: closeButtonLabel$d,
	width: width$d,
	height: height$d,
	resultsSummary1: resultsSummary1$d,
	resultsSummary2: resultsSummary2$d,
	resultsSummary3: resultsSummary3$d,
	noResultsFound: noResultsFound$d,
	searchButtonLabel: searchButtonLabel$d,
	hour: hour$d,
	minute: minute$d,
	second: second$d,
	hours: hours$d,
	minutes: minutes$d,
	seconds: seconds$d,
	vtsHeading: vtsHeading$d,
	vtsInstructions1: vtsInstructions1$d,
	vtsInstructions2: vtsInstructions2$d,
	vtsInstructions3: vtsInstructions3$d,
	vtsInstructions4: vtsInstructions4$d,
	vtsInstructions5: vtsInstructions5$d,
	vtsSelectLanguage: vtsSelectLanguage$d,
	vtsSave: vtsSave$d,
	vtsReturn: vtsReturn$d,
	vtsCancel: vtsCancel$d,
	vtsRow: vtsRow$d,
	vtsKind: vtsKind$d,
	vtsStart: vtsStart$d,
	vtsEnd: vtsEnd$d,
	vtsContent: vtsContent$d,
	vtsActions: vtsActions$d,
	vtsNewRow: vtsNewRow$d,
	vtsDeletedRow: vtsDeletedRow$d,
	vtsMovedRow: vtsMovedRow$d
};

var playerHeading$c = "Pemutar media";
var audioPlayer$c = "Audio player";
var videoPlayer$c = "Video player";
var faster$c = "Percepat";
var slower$c = "Perlambat";
var play$c = "Mulai";
var pause$c = "Jeda";
var restart$c = "Ulangi";
var prevTrack$c = "Trek sebelumnya";
var nextTrack$c = "Trek berikutnya";
var rewind$c = "Mundur";
var forward$c = "Maju";
var captions$c = "Takarir";
var showCaptions$c = "Tampilkan takarir";
var hideCaptions$c = "Sembunyikan takarir";
var captionsOff$c = "Tanpa takarir";
var showTranscript$c = "Tampilkan transkripsi";
var hideTranscript$c = "Sembunyikan transkripsi";
var turnOnDescriptions$c = "Nyalakan deskripsi";
var turnOffDescriptions$c = "Matikan deskripsi";
var chapters$c = "Bagian";
var language$c = "Bahasa";
var sign$c = "Bahasa isyarat";
var showSign$c = "Tampilkan bahasa isyarat";
var hideSign$c = "Sembunyikan bahasa isyarat";
var seekbarLabel$c = "lini masa";
var mute$c = "Matikan Suara";
var unmute$c = "Nyalakan Suara";
var volume$c = "Volume";
var volumeUpDown$c = "Naik turun volume";
var preferences$c = "Preferensi";
var enterFullScreen$c = "Masuk ke mode layar penuh";
var exitFullScreen$c = "Keluar dari mode layar penuh";
var speed$c = "Kecepatan";
var spacebar$c = "tombol spasi";
var transcriptTitle$c = "Transkripsi";
var lyricsTitle$c = "Lirik";
var autoScroll$c = "Gulir otomatis";
var statusPlaying$c = "Memutar";
var statusPaused$c = "Dijedakan";
var statusStopped$c = "Dihentikan";
var statusBuffering$c = "Sedang Bufer";
var statusEnd$c = "Akhir dari trek";
var selectedTrack$c = "Trek Pilihan";
var alertDescribedVersion$c = "Menggunakan versi dengan deskripsi audio pada video ini";
var alertNonDescribedVersion$c = "Menggunakan versi tanpa deskripsi pada video ini";
var prefMenuCaptions$c = "Takarir";
var prefVoicedCaptions$c = "Spoken Captions";
var prefMenuDescriptions$c = "Deskripsi";
var prefMenuKeyboard$c = "Kibor";
var prefMenuTranscript$c = "Transkripsi";
var prefTitleCaptions$c = "Preferensi Takarir";
var prefTitleDescriptions$c = "Preferensi Deskripsi Audio";
var prefTitleKeyboard$c = "Preferensi Kibor";
var prefTitleTranscript$c = "Preferensi Transkripsi";
var prefIntroDescription1$c = "Pemutar media ini mendukung deskripsi audio dengan dua cara: ";
var prefDescription1$c = "Video ini memiliki versi alternatif berdeskripsi, deskripsi berbasis teks.";
var prefDescription2$c = "Video ini memiliki versi alternatif video dengan deskripsi.";
var prefDescription3$c = "Video ini memiliki deskripsi berbasis teks, dibacakan oleh pembaca layar.";
var prefIntroDescriptionNone$c = "Video ini tidak memiliki deskripsi audio dalam format mana pun.";
var prefIntroDescription3$c = "Gunakan isian berikut untuk memasang preferensi terkait deskripsi audio berbasis teks.";
var prefIntroDescription4$c = "Setelah Anda menyimpan pengaturan, deskripsi audio dapat dinyala/matikan melalui tombol Deskripsi.";
var prefIntroKeyboard1$c = "Pemutar media dalam halaman ini dapat dioperasikan dari bagian mana pun pada halaman dengan menggunakan pintasan kibor (lihat daftar di bawah).";
var prefIntroKeyboard2$c = "Fungsi tombol kombinasi (Shift, Alt, Control) dapat dipasangkan di bawah ini.";
var prefIntroKeyboard3$c = "CATATAN: Beberapa kombinasi tombol mungkin akan bersinggungan dengan yang digunakan oleh browser dan/atau aplikasi perangkat lunak lainnya. Cobalah berbagai kombinasi untuk menemukan kombinasi yang bekerja untuk Anda.";
var prefHeadingKeyboard1$c = "Tombol kombinasi yang digunakan untuk pintasan";
var prefHeadingKeyboard2$c = "Pintasan kibor saat ini";
var prefHeadingDescription$c = "Deskripsi audio";
var prefHeadingTextDescription$c = "Deskripsi audio berbasis teks";
var prefAltKey$c = "Alt";
var prefCtrlKey$c = "Control";
var prefShiftKey$c = "Shift";
var prefNoKeyShortcuts$c = "Disable keyboard shortcuts";
var escapeKey$c = "Escape";
var escapeKeyFunction$c = "Tutup dialog atau menu sembulan yang tampil";
var prefDescPause$c = "Otomatis jedakan video ketika deskripsi dimulai";
var prefDescVisible$c = "Tampilkan deskripsi";
var prefDescVoice$c = "Suara";
var prefDescRate$c = "Spoken Description Rate";
var prefCaptionRate$c = "Spoken Caption Rate";
var prefDescPitch$c = "Titinada";
var prefDescPitch1$c = "Sangat rendah";
var prefDescPitch2$c = "Rendah";
var prefDescPitch3$c = "Bawaan";
var prefDescPitch4$c = "Tinggi";
var prefDescPitch5$c = "Sangat tinggi";
var sampleDescriptionText$c = "Sesuaikan pengaturan untuk mendengarkan teks ini.";
var prefHighlight$c = "Soroti transkripsi yang sesuai saat media diputar";
var prefTabbable$c = "Transkripsi dengan kontrol kibor";
var prefCaptionsFont$c = "Jenis Huruf";
var prefCaptionsColor$c = "Warna Teks";
var prefCaptionsBGColor$c = "Warna Latar";
var prefCaptionsSize$c = "Ukuran Huruf";
var prefCaptionsOpacity$c = "Opasitas";
var prefCaptionsStyle$c = "Gaya";
var serif$c = "serif";
var sans$c = "sans-serif";
var cursive$c = "kursif";
var fantasy$c = "fantasi";
var monospace$c = "monospasi";
var white$c = "putih";
var yellow$c = "kuning";
var green$c = "hijau";
var cyan$b = "sian";
var blue$c = "biru";
var magenta$c = "magenta";
var red$c = "merah";
var black$c = "hitam";
var transparent$c = "transparan";
var solid$c = "solid";
var captionsStylePopOn$c = "Muncul";
var captionsStyleRollUp$c = "Bergulir naik";
var prefCaptionsPosition$c = "Posisi";
var captionsPositionOverlay$c = "Di atas video";
var captionsPositionBelow$c = "Di bawah video";
var sampleCaptionText$c = "Contoh teks takarir";
var prefSuccess$c = "Perubahan telah disimpan.";
var prefNoChange$c = "Anda tidak melakukan perubahan apa pun.";
var save$c = "Simpan";
var cancel$c = "Batal";
var dismissButton$c = "Dismiss";
var windowButtonLabel$c = "Opsi jendela";
var windowMove$c = "Geser";
var windowMoveLeft$c = "Window moved left";
var windowMoveRight$c = "Window moved right";
var windowMoveUp$c = "Window moved up";
var windowMoveDown$c = "Window moved down";
var windowMoveStopped$c = "Window move stopped";
var transcriptControls$c = "Transcript Window Controls";
var signControls$c = "Sign Language Window Controls";
var windowMoveAlert$c = "Seret atau gunakan tombol panah untuk menggeser jendela; Tekan Enter untuk berhenti";
var windowResize$c = "Ubah ukuran";
var windowResizeHeading$c = "Ubah Ukuran Jendela";
var closeButtonLabel$c = "Tutup";
var width$c = "Lebar";
var height$c = "Tinggi";
var resultsSummary1$c = "Anda mencari:";
var resultsSummary2$c = "Ditemukan %1 hal yang sesuai.";
var resultsSummary3$c = "Klik waktu yang terkait dengan suatu hal untuk memutar video dari titik tersebut.";
var noResultsFound$c = "Tidak ada hasil yang ditemukan.";
var searchButtonLabel$c = "Diputar pada %1";
var hour$c = "jam";
var minute$c = "menit";
var second$c = "detik";
var hours$c = "jam";
var minutes$c = "menit";
var seconds$c = "detik";
var vtsHeading$c = "Video Transcript Sorter";
var vtsInstructions1$c = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$c = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$c = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$c = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$c = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$c = "Select a language";
var vtsSave$c = "Generate new .vtt content";
var vtsReturn$c = "Return to Editor";
var vtsCancel$c = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$c = "Row";
var vtsKind$c = "Kind";
var vtsStart$c = "Start";
var vtsEnd$c = "End";
var vtsContent$c = "Content";
var vtsActions$c = "Actions";
var vtsNewRow$c = "A new row %1 has been inserted.";
var vtsDeletedRow$c = "Row %1 has been deleted.";
var vtsMovedRow$c = "Row %1 has been moved %2 and is now Row %3.";
var id = {
	playerHeading: playerHeading$c,
	audioPlayer: audioPlayer$c,
	videoPlayer: videoPlayer$c,
	faster: faster$c,
	slower: slower$c,
	play: play$c,
	pause: pause$c,
	restart: restart$c,
	prevTrack: prevTrack$c,
	nextTrack: nextTrack$c,
	rewind: rewind$c,
	forward: forward$c,
	captions: captions$c,
	showCaptions: showCaptions$c,
	hideCaptions: hideCaptions$c,
	captionsOff: captionsOff$c,
	showTranscript: showTranscript$c,
	hideTranscript: hideTranscript$c,
	turnOnDescriptions: turnOnDescriptions$c,
	turnOffDescriptions: turnOffDescriptions$c,
	chapters: chapters$c,
	language: language$c,
	sign: sign$c,
	showSign: showSign$c,
	hideSign: hideSign$c,
	seekbarLabel: seekbarLabel$c,
	mute: mute$c,
	unmute: unmute$c,
	volume: volume$c,
	volumeUpDown: volumeUpDown$c,
	preferences: preferences$c,
	enterFullScreen: enterFullScreen$c,
	exitFullScreen: exitFullScreen$c,
	speed: speed$c,
	spacebar: spacebar$c,
	transcriptTitle: transcriptTitle$c,
	lyricsTitle: lyricsTitle$c,
	autoScroll: autoScroll$c,
	statusPlaying: statusPlaying$c,
	statusPaused: statusPaused$c,
	statusStopped: statusStopped$c,
	statusBuffering: statusBuffering$c,
	statusEnd: statusEnd$c,
	selectedTrack: selectedTrack$c,
	alertDescribedVersion: alertDescribedVersion$c,
	alertNonDescribedVersion: alertNonDescribedVersion$c,
	prefMenuCaptions: prefMenuCaptions$c,
	prefVoicedCaptions: prefVoicedCaptions$c,
	prefMenuDescriptions: prefMenuDescriptions$c,
	prefMenuKeyboard: prefMenuKeyboard$c,
	prefMenuTranscript: prefMenuTranscript$c,
	prefTitleCaptions: prefTitleCaptions$c,
	prefTitleDescriptions: prefTitleDescriptions$c,
	prefTitleKeyboard: prefTitleKeyboard$c,
	prefTitleTranscript: prefTitleTranscript$c,
	prefIntroDescription1: prefIntroDescription1$c,
	prefDescription1: prefDescription1$c,
	prefDescription2: prefDescription2$c,
	prefDescription3: prefDescription3$c,
	prefIntroDescriptionNone: prefIntroDescriptionNone$c,
	prefIntroDescription3: prefIntroDescription3$c,
	prefIntroDescription4: prefIntroDescription4$c,
	prefIntroKeyboard1: prefIntroKeyboard1$c,
	prefIntroKeyboard2: prefIntroKeyboard2$c,
	prefIntroKeyboard3: prefIntroKeyboard3$c,
	prefHeadingKeyboard1: prefHeadingKeyboard1$c,
	prefHeadingKeyboard2: prefHeadingKeyboard2$c,
	prefHeadingDescription: prefHeadingDescription$c,
	prefHeadingTextDescription: prefHeadingTextDescription$c,
	prefAltKey: prefAltKey$c,
	prefCtrlKey: prefCtrlKey$c,
	prefShiftKey: prefShiftKey$c,
	prefNoKeyShortcuts: prefNoKeyShortcuts$c,
	escapeKey: escapeKey$c,
	escapeKeyFunction: escapeKeyFunction$c,
	prefDescPause: prefDescPause$c,
	prefDescVisible: prefDescVisible$c,
	prefDescVoice: prefDescVoice$c,
	prefDescRate: prefDescRate$c,
	prefCaptionRate: prefCaptionRate$c,
	prefDescPitch: prefDescPitch$c,
	prefDescPitch1: prefDescPitch1$c,
	prefDescPitch2: prefDescPitch2$c,
	prefDescPitch3: prefDescPitch3$c,
	prefDescPitch4: prefDescPitch4$c,
	prefDescPitch5: prefDescPitch5$c,
	sampleDescriptionText: sampleDescriptionText$c,
	prefHighlight: prefHighlight$c,
	prefTabbable: prefTabbable$c,
	prefCaptionsFont: prefCaptionsFont$c,
	prefCaptionsColor: prefCaptionsColor$c,
	prefCaptionsBGColor: prefCaptionsBGColor$c,
	prefCaptionsSize: prefCaptionsSize$c,
	prefCaptionsOpacity: prefCaptionsOpacity$c,
	prefCaptionsStyle: prefCaptionsStyle$c,
	serif: serif$c,
	sans: sans$c,
	cursive: cursive$c,
	fantasy: fantasy$c,
	monospace: monospace$c,
	white: white$c,
	yellow: yellow$c,
	green: green$c,
	cyan: cyan$b,
	blue: blue$c,
	magenta: magenta$c,
	red: red$c,
	black: black$c,
	transparent: transparent$c,
	solid: solid$c,
	captionsStylePopOn: captionsStylePopOn$c,
	captionsStyleRollUp: captionsStyleRollUp$c,
	prefCaptionsPosition: prefCaptionsPosition$c,
	captionsPositionOverlay: captionsPositionOverlay$c,
	captionsPositionBelow: captionsPositionBelow$c,
	sampleCaptionText: sampleCaptionText$c,
	prefSuccess: prefSuccess$c,
	prefNoChange: prefNoChange$c,
	save: save$c,
	cancel: cancel$c,
	dismissButton: dismissButton$c,
	windowButtonLabel: windowButtonLabel$c,
	windowMove: windowMove$c,
	windowMoveLeft: windowMoveLeft$c,
	windowMoveRight: windowMoveRight$c,
	windowMoveUp: windowMoveUp$c,
	windowMoveDown: windowMoveDown$c,
	windowMoveStopped: windowMoveStopped$c,
	transcriptControls: transcriptControls$c,
	signControls: signControls$c,
	windowMoveAlert: windowMoveAlert$c,
	windowResize: windowResize$c,
	windowResizeHeading: windowResizeHeading$c,
	closeButtonLabel: closeButtonLabel$c,
	width: width$c,
	height: height$c,
	resultsSummary1: resultsSummary1$c,
	resultsSummary2: resultsSummary2$c,
	resultsSummary3: resultsSummary3$c,
	noResultsFound: noResultsFound$c,
	searchButtonLabel: searchButtonLabel$c,
	hour: hour$c,
	minute: minute$c,
	second: second$c,
	hours: hours$c,
	minutes: minutes$c,
	seconds: seconds$c,
	vtsHeading: vtsHeading$c,
	vtsInstructions1: vtsInstructions1$c,
	vtsInstructions2: vtsInstructions2$c,
	vtsInstructions3: vtsInstructions3$c,
	vtsInstructions4: vtsInstructions4$c,
	vtsInstructions5: vtsInstructions5$c,
	vtsSelectLanguage: vtsSelectLanguage$c,
	vtsSave: vtsSave$c,
	vtsReturn: vtsReturn$c,
	vtsCancel: vtsCancel$c,
	vtsRow: vtsRow$c,
	vtsKind: vtsKind$c,
	vtsStart: vtsStart$c,
	vtsEnd: vtsEnd$c,
	vtsContent: vtsContent$c,
	vtsActions: vtsActions$c,
	vtsNewRow: vtsNewRow$c,
	vtsDeletedRow: vtsDeletedRow$c,
	vtsMovedRow: vtsMovedRow$c
};

var playerHeading$b = "Lettore multimediale";
var audioPlayer$b = "Audio player";
var videoPlayer$b = "Video player";
var faster$b = "Più veloce";
var slower$b = "Più lento";
var play$b = "Riproduci";
var pause$b = "Pausa";
var restart$b = "Torna all'inizio";
var prevTrack$b = "Traccia precedente";
var nextTrack$b = "Traccia successiva";
var rewind$b = "Indietro";
var forward$b = "Avanti";
var captions$b = "Sottotitoli";
var showCaptions$b = "Mostra sottotitoli";
var hideCaptions$b = "Nascondi sottotitoli";
var captionsOff$b = "Disattiva sottotitoli";
var showTranscript$b = "Mostra trascrizione";
var hideTranscript$b = "Nascondi trascrizione";
var turnOnDescriptions$b = "Attiva audiodescrizioni";
var turnOffDescriptions$b = "Disattiva audiodescrizioni";
var chapters$b = "Capitoli";
var language$b = "Lingua";
var sign$b = "Lingua dei segni";
var showSign$b = "Mostra lingua dei segni";
var hideSign$b = "Nascondi lingua dei segni";
var seekbarLabel$b = "Tempo trascorso";
var mute$b = "Muto";
var unmute$b = "Riattiva l'audio";
var volume$b = "Volume";
var volumeUpDown$b = "Incremento e diminuzione volume";
var preferences$b = "Preferenze";
var enterFullScreen$b = "Attiva schermo intero";
var exitFullScreen$b = "Disattiva schermo intero";
var speed$b = "Velocità";
var spacebar$b = "barra spaziatrice";
var transcriptTitle$b = "Trascrizione";
var lyricsTitle$b = "Testi";
var autoScroll$b = "Auto scorrimento";
var statusPlaying$b = "In riproduzione";
var statusPaused$b = "In pausa";
var statusStopped$b = "Fermato";
var statusBuffering$b = "Buffering";
var statusEnd$b = "Fine traccia";
var selectedTrack$b = "Traccia selezionata";
var alertDescribedVersion$b = "Sto usando la versione audiodescritta di questo video";
var alertNonDescribedVersion$b = "Sto usando la versione non audiodescritta di questo video";
var prefMenuCaptions$b = "Sottotitoli";
var prefVoicedCaptions$b = "Spoken Captions";
var prefMenuDescriptions$b = "Audioescrizioni";
var prefMenuKeyboard$b = "Tastiera";
var prefMenuTranscript$b = "Trascrizione";
var prefTitleCaptions$b = "Preferenze sottotitoli";
var prefTitleDescriptions$b = "Preferenze audiodescrizione";
var prefTitleKeyboard$b = "Preferenze tastiera";
var prefTitleTranscript$b = "Preferenze trascrizione";
var prefIntroDescription1$b = "Questo lettore multimediale supporta le audiodescrizioni in due modi:";
var prefDescription1$b = "il video corrente ha Una versione di descrizione alternativa, Descrizione testuale.";
var prefDescription2$b = "il video corrente ha Versione di descrizione alternativa per il video.";
var prefDescription3$b = "il video corrente ha Descrizione testuale, letta dal lettore di schermo.";
var prefIntroDescriptionNone$b = "Il video corrente non ha audiodescrizioni.";
var prefIntroDescription3$b = "Usa il seguente modulo per impostare le tue preferenze relative all'audiodescrizione testuale.";
var prefIntroDescription4$b = "Dopo aver salvato le tue impostazioni, le audiodescrizioni possono essere attivate o disattivate usando i pulsanti descrizione.";
var prefIntroKeyboard1$b = "Il lettore multimediale può essere usato dovunque in questa pagina, attraverso la tastiera. Vedi sotto per un elenco di tasti di scelta rapida.";
var prefIntroKeyboard2$b = "I tasti di scelta rapida, (Shift, Alt, e Control) possono essere assegnati di seguito.";
var prefIntroKeyboard3$b = "NOTA: Alcune combinazioni di tasti possono essere in conflitto con i tasti utilizzati dal tuo browser od altro software. Prova varie combinazioni di tasti per trovarne una che funzioni correttamente.";
var prefHeadingKeyboard1$b = "Tasti di scelta rapida";
var prefHeadingKeyboard2$b = "Tasti di scelta rapida correnti";
var prefHeadingDescription$b = "Audiodescrizione";
var prefHeadingTextDescription$b = "audiodescrizione testuale";
var prefAltKey$b = "Alt";
var prefCtrlKey$b = "Control";
var prefShiftKey$b = "Shift";
var prefNoKeyShortcuts$b = "Disable keyboard shortcuts";
var escapeKey$b = "Escape";
var escapeKeyFunction$b = "Chiude il menu o la finestra corrente";
var prefDescPause$b = "Mette automaticamente il video in pausa, quando inizia la descrizione";
var prefDescVisible$b = "Rende la descrizione visibile";
var prefDescVoice$b = "Voice";
var prefDescRate$b = "Spoken Description Rate";
var prefCaptionRate$b = "Spoken Caption Rate";
var prefDescPitch$b = "Pitch";
var prefDescPitch1$b = "Very low";
var prefDescPitch2$b = "Low";
var prefDescPitch3$b = "Default";
var prefDescPitch4$b = "High";
var prefDescPitch5$b = "Very high";
var sampleDescriptionText$b = "Adjust settings to hear this sample text.";
var prefHighlight$b = "Evidenzia la descrizione";
var prefTabbable$b = "Abilita la descrizione";
var prefCaptionsFont$b = "Carattere";
var prefCaptionsColor$b = "Colore del testo";
var prefCaptionsBGColor$b = "Colore di sfondo";
var prefCaptionsSize$b = "Dimensione del carattere";
var prefCaptionsOpacity$b = "Opacità";
var prefCaptionsStyle$b = "Stile";
var serif$b = "serif";
var sans$b = "sans-serif";
var cursive$b = "corsivo";
var fantasy$b = "fantasy";
var monospace$b = "monospace";
var white$b = "bianco";
var yellow$b = "giallo";
var green$b = "verde";
var ciano = "ciano";
var blue$b = "blue";
var magenta$b = "magenta";
var red$b = "rosso";
var black$b = "nero";
var transparent$b = "trasparente";
var solid$b = "solido";
var captionsStylePopOn$b = "A comparsa";
var captionsStyleRollUp$b = "A scorrimento";
var prefCaptionsPosition$b = "Posizione";
var captionsPositionOverlay$b = "Copre";
var captionsPositionBelow$b = "Sotto al video";
var sampleCaptionText$b = "Testo di esempio sottotitoli";
var prefSuccess$b = "I cambiamenti sono stati salvati.";
var prefNoChange$b = "Non è stato effettuato alcun cambiamento.";
var save$b = "Salva";
var cancel$b = "Annulla";
var dismissButton$b = "Dismiss";
var windowButtonLabel$b = "Opzioni finestra";
var windowMove$b = "Sposta";
var windowMoveLeft$b = "Window moved left";
var windowMoveRight$b = "Window moved right";
var windowMoveUp$b = "Window moved up";
var windowMoveDown$b = "Window moved down";
var windowMoveStopped$b = "Window move stopped";
var transcriptControls$b = "Transcript Window Controls";
var signControls$b = "Sign Language Window Controls";
var windowMoveAlert$b = "Trascina o usa le frecce per spostare la finestra. Invio per fermare.";
var windowResize$b = "Ridimensiona";
var windowResizeHeading$b = "Ridimensiona finestra";
var closeButtonLabel$b = "Chiudi";
var width$b = "Larghezza";
var height$b = "Altezza";
var resultsSummary1$b = "You searched for:";
var resultsSummary2$b = "Found %1 matching items.";
var resultsSummary3$b = "Click the time associated with any item to play the video from that point.";
var noResultsFound$b = "No results found.";
var searchButtonLabel$b = "Play at %1";
var hour$b = "hour";
var minute$b = "minute";
var second$b = "second";
var hours$b = "hours";
var minutes$b = "minutes";
var seconds$b = "seconds";
var vtsHeading$b = "Video Transcript Sorter";
var vtsInstructions1$b = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$b = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$b = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$b = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$b = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$b = "Select a language";
var vtsSave$b = "Generate new .vtt content";
var vtsReturn$b = "Return to Editor";
var vtsCancel$b = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$b = "Row";
var vtsKind$b = "Kind";
var vtsStart$b = "Start";
var vtsEnd$b = "End";
var vtsContent$b = "Content";
var vtsActions$b = "Actions";
var vtsNewRow$b = "A new row %1 has been inserted.";
var vtsDeletedRow$b = "Row %1 has been deleted.";
var vtsMovedRow$b = "Row %1 has been moved %2 and is now Row %3.";
var it = {
	playerHeading: playerHeading$b,
	audioPlayer: audioPlayer$b,
	videoPlayer: videoPlayer$b,
	faster: faster$b,
	slower: slower$b,
	play: play$b,
	pause: pause$b,
	restart: restart$b,
	prevTrack: prevTrack$b,
	nextTrack: nextTrack$b,
	rewind: rewind$b,
	forward: forward$b,
	captions: captions$b,
	showCaptions: showCaptions$b,
	hideCaptions: hideCaptions$b,
	captionsOff: captionsOff$b,
	showTranscript: showTranscript$b,
	hideTranscript: hideTranscript$b,
	turnOnDescriptions: turnOnDescriptions$b,
	turnOffDescriptions: turnOffDescriptions$b,
	chapters: chapters$b,
	language: language$b,
	sign: sign$b,
	showSign: showSign$b,
	hideSign: hideSign$b,
	seekbarLabel: seekbarLabel$b,
	mute: mute$b,
	unmute: unmute$b,
	volume: volume$b,
	volumeUpDown: volumeUpDown$b,
	preferences: preferences$b,
	enterFullScreen: enterFullScreen$b,
	exitFullScreen: exitFullScreen$b,
	speed: speed$b,
	spacebar: spacebar$b,
	transcriptTitle: transcriptTitle$b,
	lyricsTitle: lyricsTitle$b,
	autoScroll: autoScroll$b,
	statusPlaying: statusPlaying$b,
	statusPaused: statusPaused$b,
	statusStopped: statusStopped$b,
	statusBuffering: statusBuffering$b,
	statusEnd: statusEnd$b,
	selectedTrack: selectedTrack$b,
	alertDescribedVersion: alertDescribedVersion$b,
	alertNonDescribedVersion: alertNonDescribedVersion$b,
	prefMenuCaptions: prefMenuCaptions$b,
	prefVoicedCaptions: prefVoicedCaptions$b,
	prefMenuDescriptions: prefMenuDescriptions$b,
	prefMenuKeyboard: prefMenuKeyboard$b,
	prefMenuTranscript: prefMenuTranscript$b,
	prefTitleCaptions: prefTitleCaptions$b,
	prefTitleDescriptions: prefTitleDescriptions$b,
	prefTitleKeyboard: prefTitleKeyboard$b,
	prefTitleTranscript: prefTitleTranscript$b,
	prefIntroDescription1: prefIntroDescription1$b,
	prefDescription1: prefDescription1$b,
	prefDescription2: prefDescription2$b,
	prefDescription3: prefDescription3$b,
	prefIntroDescriptionNone: prefIntroDescriptionNone$b,
	prefIntroDescription3: prefIntroDescription3$b,
	prefIntroDescription4: prefIntroDescription4$b,
	prefIntroKeyboard1: prefIntroKeyboard1$b,
	prefIntroKeyboard2: prefIntroKeyboard2$b,
	prefIntroKeyboard3: prefIntroKeyboard3$b,
	prefHeadingKeyboard1: prefHeadingKeyboard1$b,
	prefHeadingKeyboard2: prefHeadingKeyboard2$b,
	prefHeadingDescription: prefHeadingDescription$b,
	prefHeadingTextDescription: prefHeadingTextDescription$b,
	prefAltKey: prefAltKey$b,
	prefCtrlKey: prefCtrlKey$b,
	prefShiftKey: prefShiftKey$b,
	prefNoKeyShortcuts: prefNoKeyShortcuts$b,
	escapeKey: escapeKey$b,
	escapeKeyFunction: escapeKeyFunction$b,
	prefDescPause: prefDescPause$b,
	prefDescVisible: prefDescVisible$b,
	prefDescVoice: prefDescVoice$b,
	prefDescRate: prefDescRate$b,
	prefCaptionRate: prefCaptionRate$b,
	prefDescPitch: prefDescPitch$b,
	prefDescPitch1: prefDescPitch1$b,
	prefDescPitch2: prefDescPitch2$b,
	prefDescPitch3: prefDescPitch3$b,
	prefDescPitch4: prefDescPitch4$b,
	prefDescPitch5: prefDescPitch5$b,
	sampleDescriptionText: sampleDescriptionText$b,
	prefHighlight: prefHighlight$b,
	prefTabbable: prefTabbable$b,
	prefCaptionsFont: prefCaptionsFont$b,
	prefCaptionsColor: prefCaptionsColor$b,
	prefCaptionsBGColor: prefCaptionsBGColor$b,
	prefCaptionsSize: prefCaptionsSize$b,
	prefCaptionsOpacity: prefCaptionsOpacity$b,
	prefCaptionsStyle: prefCaptionsStyle$b,
	serif: serif$b,
	sans: sans$b,
	cursive: cursive$b,
	fantasy: fantasy$b,
	monospace: monospace$b,
	white: white$b,
	yellow: yellow$b,
	green: green$b,
	ciano: ciano,
	blue: blue$b,
	magenta: magenta$b,
	red: red$b,
	black: black$b,
	transparent: transparent$b,
	solid: solid$b,
	captionsStylePopOn: captionsStylePopOn$b,
	captionsStyleRollUp: captionsStyleRollUp$b,
	prefCaptionsPosition: prefCaptionsPosition$b,
	captionsPositionOverlay: captionsPositionOverlay$b,
	captionsPositionBelow: captionsPositionBelow$b,
	sampleCaptionText: sampleCaptionText$b,
	prefSuccess: prefSuccess$b,
	prefNoChange: prefNoChange$b,
	save: save$b,
	cancel: cancel$b,
	dismissButton: dismissButton$b,
	windowButtonLabel: windowButtonLabel$b,
	windowMove: windowMove$b,
	windowMoveLeft: windowMoveLeft$b,
	windowMoveRight: windowMoveRight$b,
	windowMoveUp: windowMoveUp$b,
	windowMoveDown: windowMoveDown$b,
	windowMoveStopped: windowMoveStopped$b,
	transcriptControls: transcriptControls$b,
	signControls: signControls$b,
	windowMoveAlert: windowMoveAlert$b,
	windowResize: windowResize$b,
	windowResizeHeading: windowResizeHeading$b,
	closeButtonLabel: closeButtonLabel$b,
	width: width$b,
	height: height$b,
	resultsSummary1: resultsSummary1$b,
	resultsSummary2: resultsSummary2$b,
	resultsSummary3: resultsSummary3$b,
	noResultsFound: noResultsFound$b,
	searchButtonLabel: searchButtonLabel$b,
	hour: hour$b,
	minute: minute$b,
	second: second$b,
	hours: hours$b,
	minutes: minutes$b,
	seconds: seconds$b,
	vtsHeading: vtsHeading$b,
	vtsInstructions1: vtsInstructions1$b,
	vtsInstructions2: vtsInstructions2$b,
	vtsInstructions3: vtsInstructions3$b,
	vtsInstructions4: vtsInstructions4$b,
	vtsInstructions5: vtsInstructions5$b,
	vtsSelectLanguage: vtsSelectLanguage$b,
	vtsSave: vtsSave$b,
	vtsReturn: vtsReturn$b,
	vtsCancel: vtsCancel$b,
	vtsRow: vtsRow$b,
	vtsKind: vtsKind$b,
	vtsStart: vtsStart$b,
	vtsEnd: vtsEnd$b,
	vtsContent: vtsContent$b,
	vtsActions: vtsActions$b,
	vtsNewRow: vtsNewRow$b,
	vtsDeletedRow: vtsDeletedRow$b,
	vtsMovedRow: vtsMovedRow$b
};

var playerHeading$a = "メディアプレイヤー";
var audioPlayer$a = "Audio player";
var videoPlayer$a = "Video player";
var faster$a = "はやく";
var slower$a = "おそく";
var play$a = "再生";
var pause$a = "一時停止";
var restart$a = "再開";
var prevTrack$a = "前のトラック";
var nextTrack$a = "次のトラック";
var rewind$a = "巻き戻し";
var forward$a = "早送り";
var captions$a = "キャプション";
var showCaptions$a = "キャプションを表示する";
var hideCaptions$a = "キャプションを非表示にする";
var captionsOff$a = "キャプションを消す";
var showTranscript$a = "書き起こしの表示";
var hideTranscript$a = "書き起こしを非表示にする";
var turnOnDescriptions$a = "音声解説を出す";
var turnOffDescriptions$a = "音声解説を出さない";
var chapters$a = "チャプター";
var language$a = "言語";
var sign$a = "手話";
var showSign$a = "手話を表示";
var hideSign$a = "手話を非表示";
var seekbarLabel$a = "タイムライン";
var mute$a = "消音";
var unmute$a = "消音解除";
var volume$a = "音量";
var volumeUpDown$a = "音量の上下";
var preferences$a = "設定";
var enterFullScreen$a = "全画面表示";
var exitFullScreen$a = "全画面表示の終了";
var speed$a = "再生速度";
var spacebar$a = "スペースキー";
var transcriptTitle$a = "書き起こし";
var lyricsTitle$a = "歌詞";
var autoScroll$a = "自動スクロール";
var statusPlaying$a = "再生中";
var statusPaused$a = "一時停止中";
var statusStopped$a = "停止";
var statusBuffering$a = "バッファリング中";
var statusEnd$a = "トラックの終わり";
var selectedTrack$a = "選択されたトラック";
var alertDescribedVersion$a = "この動画の音声解説付きバージョンを使います";
var alertNonDescribedVersion$a = "この動画の解説なしバージョンを使います";
var prefMenuCaptions$a = "キャプション";
var prefVoicedCaptions$a = "Spoken Captions";
var prefMenuDescriptions$a = "音声解説";
var prefMenuKeyboard$a = "キーボード";
var prefMenuTranscript$a = "字幕";
var prefTitleCaptions$a = "キャプションの設定";
var prefTitleDescriptions$a = "音声解説の設定";
var prefTitleKeyboard$a = "キーボードの設定";
var prefTitleTranscript$a = "字幕の設定";
var prefIntroDescription1$a = "このメディアプレイヤーは次の2つの方法で音声解説をサポートします: ";
var prefDescription1$a = "現在の動画では次の方法が選択可能です: 解説付きの代替バージョン テキストによる解説";
var prefDescription2$a = "現在の動画では次の方法が選択可能です: 解説付きの代替バージョンのビデオ";
var prefDescription3$a = "現在の動画では次の方法が選択可能です: テキストによる解説(スクリーンリーダーによって読み上げられる)";
var prefIntroDescriptionNone$a = "現在の動画にはどちらの形式の音声解説も含まれていません。";
var prefIntroDescription3$a = "次のフォームを使って、音声解説に関連する設定を保存できます。";
var prefIntroDescription4$a = "設定が保存されたら、音声解説ボタンによって音声解説の表示・非表示を切り替えることができます。";
var prefIntroKeyboard1$a = "このページのメディアプレイヤーは、キーボード・ショートカットを使ってこのページのどこからでも操作できます(下の一覧を参照してください)。";
var prefIntroKeyboard2$a = "修飾キー(Shift、Alt と Control) は以下で割り当てることができます。";
var prefIntroKeyboard3$a = "注意: いくつかのキーの組み合わせは、ブラウザやアプリケーション・ソフトで使われているものと衝突する可能性があります。ご利用の環境で正しく動作する、様々なキーの組み合わせを試してください。";
var prefHeadingKeyboard1$a = "ショートカットの修飾キー";
var prefHeadingKeyboard2$a = "現在のキーボード・ショートカット";
var prefHeadingDescription$a = "音声解説";
var prefHeadingTextDescription$a = "テキストによる音声解説";
var prefAltKey$a = "Alt";
var prefCtrlKey$a = "Control";
var prefShiftKey$a = "Shift";
var prefNoKeyShortcuts$a = "Disable keyboard shortcuts";
var escapeKey$a = "エスケープ";
var escapeKeyFunction$a = "現在のダイアログやポップアップメニューを閉じる";
var prefDescPause$a = "解説が表示されたら動画を自動的に停止する";
var prefDescVisible$a = "解説が見えるようにする";
var prefDescVoice$a = "音";
var prefDescRate$a = "Spoken Description Rate";
var prefCaptionRate$a = "Spoken Caption Rate";
var prefDescPitch$a = "ピッチ";
var prefDescPitch1$a = "非常に低い";
var prefDescPitch2$a = "低い";
var prefDescPitch3$a = "標準";
var prefDescPitch4$a = "高い";
var prefDescPitch5$a = "非常に高い";
var sampleDescriptionText$a = "このサンプル・テキストを聞くために設定を合わせます。";
var prefHighlight$a = "メディアの再生に合わせて字幕をハイライトする";
var prefTabbable$a = "キーボード操作可能な字幕";
var prefCaptionsFont$a = "フォント";
var prefCaptionsColor$a = "文字色";
var prefCaptionsBGColor$a = "背景色";
var prefCaptionsSize$a = "フォントサイズ";
var prefCaptionsOpacity$a = "不透明度";
var prefCaptionsStyle$a = "書式";
var serif$a = "セリフ";
var sans$a = "サンセリフ";
var cursive$a = "cursive";
var fantasy$a = "fantasy";
var monospace$a = "monospace";
var white$a = "白";
var yellow$a = "黄色";
var green$a = "緑";
var cyan$a = "シアン";
var blue$a = "青";
var magenta$a = "マゼンタ";
var red$a = "赤";
var black$a = "黒";
var transparent$a = "透明";
var solid$a = "不透明";
var captionsStylePopOn$a = "ポップ・オン";
var captionsStyleRollUp$a = "ロール・アップ";
var prefCaptionsPosition$a = "位置";
var captionsPositionOverlay$a = "オーバーレイ表示";
var captionsPositionBelow$a = "動画の下部";
var sampleCaptionText$a = "キャプション表示の例";
var prefSuccess$a = "変更が保存されました。";
var prefNoChange$a = "設定が変更されていません。";
var save$a = "保存";
var cancel$a = "キャンセル";
var dismissButton$a = "Dismiss";
var windowButtonLabel$a = "ウィンドウの設定";
var windowMove$a = "移動";
var windowMoveLeft$a = "Window moved left";
var windowMoveRight$a = "Window moved right";
var windowMoveUp$a = "Window moved up";
var windowMoveDown$a = "Window moved down";
var windowMoveStopped$a = "Window move stopped";
var transcriptControls$a = "Transcript Window Controls";
var signControls$a = "Sign Language Window Controls";
var windowMoveAlert$a = "マウスをドラッグするか矢印キーでウィンドウを移動できます; Enterで終了";
var windowResize$a = "サイズを変える";
var windowResizeHeading$a = "ウィンドウのサイズ変更";
var closeButtonLabel$a = "閉じる";
var width$a = "幅";
var height$a = "高さ";
var resultsSummary1$a = "次を検索:";
var resultsSummary2$a = "見つかりました %1 個の検索結果";
var resultsSummary3$a = "アイテムに関連付けられている時間をクリックして、その時点からビデオを再生します。";
var noResultsFound$a = "見つかりませんでした。";
var searchButtonLabel$a = "次から再生 %1";
var hour$a = "時間";
var minute$a = "分";
var second$a = "秒";
var hours$a = "時間";
var minutes$a = "分";
var seconds$a = "秒";
var vtsHeading$a = "Video Transcript Sorter";
var vtsInstructions1$a = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$a = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$a = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$a = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$a = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$a = "Select a language";
var vtsSave$a = "Generate new .vtt content";
var vtsReturn$a = "Return to Editor";
var vtsCancel$a = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$a = "Row";
var vtsKind$a = "Kind";
var vtsStart$a = "Start";
var vtsEnd$a = "End";
var vtsContent$a = "Content";
var vtsActions$a = "Actions";
var vtsNewRow$a = "A new row %1 has been inserted.";
var vtsDeletedRow$a = "Row %1 has been deleted.";
var vtsMovedRow$a = "Row %1 has been moved %2 and is now Row %3.";
var ja = {
	playerHeading: playerHeading$a,
	audioPlayer: audioPlayer$a,
	videoPlayer: videoPlayer$a,
	faster: faster$a,
	slower: slower$a,
	play: play$a,
	pause: pause$a,
	restart: restart$a,
	prevTrack: prevTrack$a,
	nextTrack: nextTrack$a,
	rewind: rewind$a,
	forward: forward$a,
	captions: captions$a,
	showCaptions: showCaptions$a,
	hideCaptions: hideCaptions$a,
	captionsOff: captionsOff$a,
	showTranscript: showTranscript$a,
	hideTranscript: hideTranscript$a,
	turnOnDescriptions: turnOnDescriptions$a,
	turnOffDescriptions: turnOffDescriptions$a,
	chapters: chapters$a,
	language: language$a,
	sign: sign$a,
	showSign: showSign$a,
	hideSign: hideSign$a,
	seekbarLabel: seekbarLabel$a,
	mute: mute$a,
	unmute: unmute$a,
	volume: volume$a,
	volumeUpDown: volumeUpDown$a,
	preferences: preferences$a,
	enterFullScreen: enterFullScreen$a,
	exitFullScreen: exitFullScreen$a,
	speed: speed$a,
	spacebar: spacebar$a,
	transcriptTitle: transcriptTitle$a,
	lyricsTitle: lyricsTitle$a,
	autoScroll: autoScroll$a,
	statusPlaying: statusPlaying$a,
	statusPaused: statusPaused$a,
	statusStopped: statusStopped$a,
	statusBuffering: statusBuffering$a,
	statusEnd: statusEnd$a,
	selectedTrack: selectedTrack$a,
	alertDescribedVersion: alertDescribedVersion$a,
	alertNonDescribedVersion: alertNonDescribedVersion$a,
	prefMenuCaptions: prefMenuCaptions$a,
	prefVoicedCaptions: prefVoicedCaptions$a,
	prefMenuDescriptions: prefMenuDescriptions$a,
	prefMenuKeyboard: prefMenuKeyboard$a,
	prefMenuTranscript: prefMenuTranscript$a,
	prefTitleCaptions: prefTitleCaptions$a,
	prefTitleDescriptions: prefTitleDescriptions$a,
	prefTitleKeyboard: prefTitleKeyboard$a,
	prefTitleTranscript: prefTitleTranscript$a,
	prefIntroDescription1: prefIntroDescription1$a,
	prefDescription1: prefDescription1$a,
	prefDescription2: prefDescription2$a,
	prefDescription3: prefDescription3$a,
	prefIntroDescriptionNone: prefIntroDescriptionNone$a,
	prefIntroDescription3: prefIntroDescription3$a,
	prefIntroDescription4: prefIntroDescription4$a,
	prefIntroKeyboard1: prefIntroKeyboard1$a,
	prefIntroKeyboard2: prefIntroKeyboard2$a,
	prefIntroKeyboard3: prefIntroKeyboard3$a,
	prefHeadingKeyboard1: prefHeadingKeyboard1$a,
	prefHeadingKeyboard2: prefHeadingKeyboard2$a,
	prefHeadingDescription: prefHeadingDescription$a,
	prefHeadingTextDescription: prefHeadingTextDescription$a,
	prefAltKey: prefAltKey$a,
	prefCtrlKey: prefCtrlKey$a,
	prefShiftKey: prefShiftKey$a,
	prefNoKeyShortcuts: prefNoKeyShortcuts$a,
	escapeKey: escapeKey$a,
	escapeKeyFunction: escapeKeyFunction$a,
	prefDescPause: prefDescPause$a,
	prefDescVisible: prefDescVisible$a,
	prefDescVoice: prefDescVoice$a,
	prefDescRate: prefDescRate$a,
	prefCaptionRate: prefCaptionRate$a,
	prefDescPitch: prefDescPitch$a,
	prefDescPitch1: prefDescPitch1$a,
	prefDescPitch2: prefDescPitch2$a,
	prefDescPitch3: prefDescPitch3$a,
	prefDescPitch4: prefDescPitch4$a,
	prefDescPitch5: prefDescPitch5$a,
	sampleDescriptionText: sampleDescriptionText$a,
	prefHighlight: prefHighlight$a,
	prefTabbable: prefTabbable$a,
	prefCaptionsFont: prefCaptionsFont$a,
	prefCaptionsColor: prefCaptionsColor$a,
	prefCaptionsBGColor: prefCaptionsBGColor$a,
	prefCaptionsSize: prefCaptionsSize$a,
	prefCaptionsOpacity: prefCaptionsOpacity$a,
	prefCaptionsStyle: prefCaptionsStyle$a,
	serif: serif$a,
	sans: sans$a,
	cursive: cursive$a,
	fantasy: fantasy$a,
	monospace: monospace$a,
	white: white$a,
	yellow: yellow$a,
	green: green$a,
	cyan: cyan$a,
	blue: blue$a,
	magenta: magenta$a,
	red: red$a,
	black: black$a,
	transparent: transparent$a,
	solid: solid$a,
	captionsStylePopOn: captionsStylePopOn$a,
	captionsStyleRollUp: captionsStyleRollUp$a,
	prefCaptionsPosition: prefCaptionsPosition$a,
	captionsPositionOverlay: captionsPositionOverlay$a,
	captionsPositionBelow: captionsPositionBelow$a,
	sampleCaptionText: sampleCaptionText$a,
	prefSuccess: prefSuccess$a,
	prefNoChange: prefNoChange$a,
	save: save$a,
	cancel: cancel$a,
	dismissButton: dismissButton$a,
	windowButtonLabel: windowButtonLabel$a,
	windowMove: windowMove$a,
	windowMoveLeft: windowMoveLeft$a,
	windowMoveRight: windowMoveRight$a,
	windowMoveUp: windowMoveUp$a,
	windowMoveDown: windowMoveDown$a,
	windowMoveStopped: windowMoveStopped$a,
	transcriptControls: transcriptControls$a,
	signControls: signControls$a,
	windowMoveAlert: windowMoveAlert$a,
	windowResize: windowResize$a,
	windowResizeHeading: windowResizeHeading$a,
	closeButtonLabel: closeButtonLabel$a,
	width: width$a,
	height: height$a,
	resultsSummary1: resultsSummary1$a,
	resultsSummary2: resultsSummary2$a,
	resultsSummary3: resultsSummary3$a,
	noResultsFound: noResultsFound$a,
	searchButtonLabel: searchButtonLabel$a,
	hour: hour$a,
	minute: minute$a,
	second: second$a,
	hours: hours$a,
	minutes: minutes$a,
	seconds: seconds$a,
	vtsHeading: vtsHeading$a,
	vtsInstructions1: vtsInstructions1$a,
	vtsInstructions2: vtsInstructions2$a,
	vtsInstructions3: vtsInstructions3$a,
	vtsInstructions4: vtsInstructions4$a,
	vtsInstructions5: vtsInstructions5$a,
	vtsSelectLanguage: vtsSelectLanguage$a,
	vtsSave: vtsSave$a,
	vtsReturn: vtsReturn$a,
	vtsCancel: vtsCancel$a,
	vtsRow: vtsRow$a,
	vtsKind: vtsKind$a,
	vtsStart: vtsStart$a,
	vtsEnd: vtsEnd$a,
	vtsContent: vtsContent$a,
	vtsActions: vtsActions$a,
	vtsNewRow: vtsNewRow$a,
	vtsDeletedRow: vtsDeletedRow$a,
	vtsMovedRow: vtsMovedRow$a
};

var playerHeading$9 = "Pemain media";
var audioPlayer$9 = "Audio player";
var videoPlayer$9 = "Video player";
var faster$9 = "Lebih laju";
var slower$9 = "Lebih perlahan";
var play$9 = "Main";
var pause$9 = "Jeda";
var restart$9 = "Mula semula";
var prevTrack$9 = "Trek sebelumnya";
var nextTrack$9 = "Trek seterusnya";
var rewind$9 = "Undur";
var forward$9 = "Majukan";
var captions$9 = "Sarikata";
var showCaptions$9 = "Tunjuk sarikata";
var hideCaptions$9 = "Sembunyi sarikata";
var captionsOff$9 = "Sarikata dimatikan";
var showTranscript$9 = "Tunjuk transkrip";
var hideTranscript$9 = "Sembunyi transkrip";
var turnOnDescriptions$9 = "Hidupkan deskripsi";
var turnOffDescriptions$9 = "Matikan deskripsi";
var chapters$9 = "Bab";
var language$9 = "Bahasa";
var sign$9 = "Bahasa isyarat";
var showSign$9 = "Tunjuk bahasa isyarat";
var hideSign$9 = "Sembunyi bahasa isyarat";
var seekbarLabel$9 = "garis masa";
var mute$9 = "Bisukan";
var unmute$9 = "Nyahbisukan";
var volume$9 = "Volum";
var volumeUpDown$9 = "Naik turun volum";
var preferences$9 = "Keutamaan";
var enterFullScreen$9 = "Masuk skrin penuh";
var exitFullScreen$9 = "Keluar skrin penuh";
var speed$9 = "Kelajuan";
var spacebar$9 = "bar ruang";
var transcriptTitle$9 = "Transkrip";
var lyricsTitle$9 = "Lirik";
var autoScroll$9 = "Skrol automatik";
var statusPlaying$9 = "Sedang dimainkan";
var statusPaused$9 = "Dijeda";
var statusStopped$9 = "Dihentikan";
var statusBuffering$9 = "Memuatkan";
var statusEnd$9 = "Akhir trek";
var selectedTrack$9 = "Trek dipilih";
var alertDescribedVersion$9 = "Menggunakan versi video dengan deskripsi audio";
var alertNonDescribedVersion$9 = "Menggunakan versi video tanpa deskripsi audio";
var prefMenuCaptions$9 = "Sarikata";
var prefVoicedCaptions$9 = "Spoken Captions";
var prefMenuDescriptions$9 = "Deskripsi";
var prefMenuKeyboard$9 = "Papan kekunci";
var prefMenuTranscript$9 = "Transkrip";
var prefTitleCaptions$9 = "Keutamaan Sarikata";
var prefTitleDescriptions$9 = "Keutamaan Deskripsi Audio";
var prefTitleKeyboard$9 = "Keutamaan Papan Kekunci";
var prefTitleTranscript$9 = "Keutamaan Transkrip";
var prefIntroDescription1$9 = "Pemain media ini menyokong deskripsi audio dalam dua cara: ";
var prefDescription1$9 = "Video semasa mempunyai versi berdeskripsi alternatif, deskripsi berasaskan teks.";
var prefDescription2$9 = "Video semasa mempunyai versi video berdeskripsi alternatif.";
var prefDescription3$9 = "Video semasa mempunyai deskripsi berasaskan teks, diumumkan oleh pembaca skrin.";
var prefIntroDescriptionNone$9 = "Video semasa tiada deskripsi audio dalam mana-mana format.";
var prefIntroDescription3$9 = "Gunakan borang berikut untuk menetapkan keutamaan berkaitan deskripsi audio berasaskan teks.";
var prefIntroDescription4$9 = "Selepas anda menyimpan tetapan, deskripsi audio boleh dihidupkan/dimatikan menggunakan butang Deskripsi.";
var prefIntroKeyboard1$9 = "Pemain media di laman web ini boleh dikendalikan dari mana-mana sahaja di halaman menggunakan pintasan papan kekunci (lihat di bawah untuk senarai).";
var prefIntroKeyboard2$9 = "Kekunci pengubah (Shift, Alt, dan Control) boleh ditetapkan di bawah.";
var prefIntroKeyboard3$9 = "NOTA: Sesetengah kombinasi kekunci mungkin bertindah dengan kekunci yang digunakan oleh pelayar dan/atau aplikasi lain. Cuba pelbagai kombinasi kekunci pengubah untuk mencari yang sesuai untuk anda.";
var prefHeadingKeyboard1$9 = "Kekunci pengubah untuk pintasan";
var prefHeadingKeyboard2$9 = "Pintasan papan kekunci semasa";
var prefHeadingDescription$9 = "Deskripsi audio";
var prefHeadingTextDescription$9 = "Deskripsi audio berasaskan teks";
var prefAltKey$9 = "Alt";
var prefCtrlKey$9 = "Control";
var prefShiftKey$9 = "Shift";
var prefNoKeyShortcuts$9 = "Disable keyboard shortcuts";
var escapeKey$9 = "Escape";
var escapeKeyFunction$9 = "Tutup dialog atau menu popup semasa";
var prefDescPause$9 = "Jeda video secara automatik apabila deskripsi bermula";
var prefDescVisible$9 = "Paparkan deskripsi";
var prefDescVoice$9 = "Suara";
var prefDescRate$9 = "Spoken Description Rate";
var prefCaptionRate$9 = "Spoken Caption Rate";
var prefDescPitch$9 = "Nada";
var prefDescPitch1$9 = "Sangat rendah";
var prefDescPitch2$9 = "Rendah";
var prefDescPitch3$9 = "Lalai";
var prefDescPitch4$9 = "Tinggi";
var prefDescPitch5$9 = "Sangat tinggi";
var sampleDescriptionText$9 = "Laraskan tetapan untuk mendengar teks contoh ini.";
var prefHighlight$9 = "Serlahkan transkrip semasa media dimainkan";
var prefTabbable$9 = "Aktifkan transkrip dengan papan kekunci";
var prefCaptionsFont$9 = "Fon";
var prefCaptionsColor$9 = "Warna Teks";
var prefCaptionsBGColor$9 = "Latar Belakang";
var prefCaptionsSize$9 = "Saiz Fon";
var prefCaptionsOpacity$9 = "Kelegapan";
var prefCaptionsStyle$9 = "Gaya";
var serif$9 = "serif";
var sans$9 = "sans-serif";
var cursive$9 = "cursive";
var fantasy$9 = "fantasy";
var monospace$9 = "monospace";
var white$9 = "putih";
var yellow$9 = "kuning";
var green$9 = "hijau";
var cyan$9 = "sian";
var blue$9 = "biru";
var magenta$9 = "magenta";
var red$9 = "merah";
var black$9 = "hitam";
var transparent$9 = "telus";
var solid$9 = "pepejal";
var captionsStylePopOn$9 = "Pop-on";
var captionsStyleRollUp$9 = "Roll-up";
var prefCaptionsPosition$9 = "Kedudukan";
var captionsPositionOverlay$9 = "Lapisan atas";
var captionsPositionBelow$9 = "Di bawah video";
var sampleCaptionText$9 = "Teks contoh sarikata";
var prefSuccess$9 = "Perubahan anda telah disimpan.";
var prefNoChange$9 = "Anda tidak membuat sebarang perubahan.";
var save$9 = "Simpan";
var cancel$9 = "Batal";
var dismissButton$9 = "Dismiss";
var windowButtonLabel$9 = "Pilihan tetingkap";
var windowMove$9 = "Alih";
var windowMoveLeft$9 = "Window moved left";
var windowMoveRight$9 = "Window moved right";
var windowMoveUp$9 = "Window moved up";
var windowMoveDown$9 = "Window moved down";
var windowMoveStopped$9 = "Window move stopped";
var transcriptControls$9 = "Transcript Window Controls";
var signControls$9 = "Sign Language Window Controls";
var windowMoveAlert$9 = "Seret atau gunakan kekunci anak panah untuk mengalih tetingkap; Enter untuk berhenti";
var windowResize$9 = "Ubah saiz";
var windowResizeHeading$9 = "Ubah Saiz Tetingkap";
var closeButtonLabel$9 = "Tutup";
var width$9 = "Lebar";
var height$9 = "Tinggi";
var resultsSummary1$9 = "Anda mencari:";
var resultsSummary2$9 = "Ditemui %1 item sepadan.";
var resultsSummary3$9 = "Klik masa yang berkaitan dengan mana-mana item untuk mainkan video dari titik itu.";
var noResultsFound$9 = "Tiada hasil ditemui.";
var searchButtonLabel$9 = "Main pada %1";
var hour$9 = "jam";
var minute$9 = "minit";
var second$9 = "saat";
var hours$9 = "jam";
var minutes$9 = "minit";
var seconds$9 = "saat";
var vtsHeading$9 = "Video Transcript Sorter";
var vtsInstructions1$9 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$9 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$9 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$9 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$9 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$9 = "Select a language";
var vtsSave$9 = "Generate new .vtt content";
var vtsReturn$9 = "Return to Editor";
var vtsCancel$9 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$9 = "Row";
var vtsKind$9 = "Kind";
var vtsStart$9 = "Start";
var vtsEnd$9 = "End";
var vtsContent$9 = "Content";
var vtsActions$9 = "Actions";
var vtsNewRow$9 = "A new row %1 has been inserted.";
var vtsDeletedRow$9 = "Row %1 has been deleted.";
var vtsMovedRow$9 = "Row %1 has been moved %2 and is now Row %3.";
var ms = {
	playerHeading: playerHeading$9,
	audioPlayer: audioPlayer$9,
	videoPlayer: videoPlayer$9,
	faster: faster$9,
	slower: slower$9,
	play: play$9,
	pause: pause$9,
	restart: restart$9,
	prevTrack: prevTrack$9,
	nextTrack: nextTrack$9,
	rewind: rewind$9,
	forward: forward$9,
	captions: captions$9,
	showCaptions: showCaptions$9,
	hideCaptions: hideCaptions$9,
	captionsOff: captionsOff$9,
	showTranscript: showTranscript$9,
	hideTranscript: hideTranscript$9,
	turnOnDescriptions: turnOnDescriptions$9,
	turnOffDescriptions: turnOffDescriptions$9,
	chapters: chapters$9,
	language: language$9,
	sign: sign$9,
	showSign: showSign$9,
	hideSign: hideSign$9,
	seekbarLabel: seekbarLabel$9,
	mute: mute$9,
	unmute: unmute$9,
	volume: volume$9,
	volumeUpDown: volumeUpDown$9,
	preferences: preferences$9,
	enterFullScreen: enterFullScreen$9,
	exitFullScreen: exitFullScreen$9,
	speed: speed$9,
	spacebar: spacebar$9,
	transcriptTitle: transcriptTitle$9,
	lyricsTitle: lyricsTitle$9,
	autoScroll: autoScroll$9,
	statusPlaying: statusPlaying$9,
	statusPaused: statusPaused$9,
	statusStopped: statusStopped$9,
	statusBuffering: statusBuffering$9,
	statusEnd: statusEnd$9,
	selectedTrack: selectedTrack$9,
	alertDescribedVersion: alertDescribedVersion$9,
	alertNonDescribedVersion: alertNonDescribedVersion$9,
	prefMenuCaptions: prefMenuCaptions$9,
	prefVoicedCaptions: prefVoicedCaptions$9,
	prefMenuDescriptions: prefMenuDescriptions$9,
	prefMenuKeyboard: prefMenuKeyboard$9,
	prefMenuTranscript: prefMenuTranscript$9,
	prefTitleCaptions: prefTitleCaptions$9,
	prefTitleDescriptions: prefTitleDescriptions$9,
	prefTitleKeyboard: prefTitleKeyboard$9,
	prefTitleTranscript: prefTitleTranscript$9,
	prefIntroDescription1: prefIntroDescription1$9,
	prefDescription1: prefDescription1$9,
	prefDescription2: prefDescription2$9,
	prefDescription3: prefDescription3$9,
	prefIntroDescriptionNone: prefIntroDescriptionNone$9,
	prefIntroDescription3: prefIntroDescription3$9,
	prefIntroDescription4: prefIntroDescription4$9,
	prefIntroKeyboard1: prefIntroKeyboard1$9,
	prefIntroKeyboard2: prefIntroKeyboard2$9,
	prefIntroKeyboard3: prefIntroKeyboard3$9,
	prefHeadingKeyboard1: prefHeadingKeyboard1$9,
	prefHeadingKeyboard2: prefHeadingKeyboard2$9,
	prefHeadingDescription: prefHeadingDescription$9,
	prefHeadingTextDescription: prefHeadingTextDescription$9,
	prefAltKey: prefAltKey$9,
	prefCtrlKey: prefCtrlKey$9,
	prefShiftKey: prefShiftKey$9,
	prefNoKeyShortcuts: prefNoKeyShortcuts$9,
	escapeKey: escapeKey$9,
	escapeKeyFunction: escapeKeyFunction$9,
	prefDescPause: prefDescPause$9,
	prefDescVisible: prefDescVisible$9,
	prefDescVoice: prefDescVoice$9,
	prefDescRate: prefDescRate$9,
	prefCaptionRate: prefCaptionRate$9,
	prefDescPitch: prefDescPitch$9,
	prefDescPitch1: prefDescPitch1$9,
	prefDescPitch2: prefDescPitch2$9,
	prefDescPitch3: prefDescPitch3$9,
	prefDescPitch4: prefDescPitch4$9,
	prefDescPitch5: prefDescPitch5$9,
	sampleDescriptionText: sampleDescriptionText$9,
	prefHighlight: prefHighlight$9,
	prefTabbable: prefTabbable$9,
	prefCaptionsFont: prefCaptionsFont$9,
	prefCaptionsColor: prefCaptionsColor$9,
	prefCaptionsBGColor: prefCaptionsBGColor$9,
	prefCaptionsSize: prefCaptionsSize$9,
	prefCaptionsOpacity: prefCaptionsOpacity$9,
	prefCaptionsStyle: prefCaptionsStyle$9,
	serif: serif$9,
	sans: sans$9,
	cursive: cursive$9,
	fantasy: fantasy$9,
	monospace: monospace$9,
	white: white$9,
	yellow: yellow$9,
	green: green$9,
	cyan: cyan$9,
	blue: blue$9,
	magenta: magenta$9,
	red: red$9,
	black: black$9,
	transparent: transparent$9,
	solid: solid$9,
	captionsStylePopOn: captionsStylePopOn$9,
	captionsStyleRollUp: captionsStyleRollUp$9,
	prefCaptionsPosition: prefCaptionsPosition$9,
	captionsPositionOverlay: captionsPositionOverlay$9,
	captionsPositionBelow: captionsPositionBelow$9,
	sampleCaptionText: sampleCaptionText$9,
	prefSuccess: prefSuccess$9,
	prefNoChange: prefNoChange$9,
	save: save$9,
	cancel: cancel$9,
	dismissButton: dismissButton$9,
	windowButtonLabel: windowButtonLabel$9,
	windowMove: windowMove$9,
	windowMoveLeft: windowMoveLeft$9,
	windowMoveRight: windowMoveRight$9,
	windowMoveUp: windowMoveUp$9,
	windowMoveDown: windowMoveDown$9,
	windowMoveStopped: windowMoveStopped$9,
	transcriptControls: transcriptControls$9,
	signControls: signControls$9,
	windowMoveAlert: windowMoveAlert$9,
	windowResize: windowResize$9,
	windowResizeHeading: windowResizeHeading$9,
	closeButtonLabel: closeButtonLabel$9,
	width: width$9,
	height: height$9,
	resultsSummary1: resultsSummary1$9,
	resultsSummary2: resultsSummary2$9,
	resultsSummary3: resultsSummary3$9,
	noResultsFound: noResultsFound$9,
	searchButtonLabel: searchButtonLabel$9,
	hour: hour$9,
	minute: minute$9,
	second: second$9,
	hours: hours$9,
	minutes: minutes$9,
	seconds: seconds$9,
	vtsHeading: vtsHeading$9,
	vtsInstructions1: vtsInstructions1$9,
	vtsInstructions2: vtsInstructions2$9,
	vtsInstructions3: vtsInstructions3$9,
	vtsInstructions4: vtsInstructions4$9,
	vtsInstructions5: vtsInstructions5$9,
	vtsSelectLanguage: vtsSelectLanguage$9,
	vtsSave: vtsSave$9,
	vtsReturn: vtsReturn$9,
	vtsCancel: vtsCancel$9,
	vtsRow: vtsRow$9,
	vtsKind: vtsKind$9,
	vtsStart: vtsStart$9,
	vtsEnd: vtsEnd$9,
	vtsContent: vtsContent$9,
	vtsActions: vtsActions$9,
	vtsNewRow: vtsNewRow$9,
	vtsDeletedRow: vtsDeletedRow$9,
	vtsMovedRow: vtsMovedRow$9
};

var playerHeading$8 = "Mediespiller";
var audioPlayer$8 = "Audio player";
var videoPlayer$8 = "Video player";
var faster$8 = "Raskere";
var slower$8 = "Saktere";
var play$8 = "Spill av";
var pause$8 = "Pause";
var restart$8 = "Start på nytt";
var prevTrack$8 = "Forrige spor";
var nextTrack$8 = "Neste spor";
var rewind$8 = "Spol tilbake";
var forward$8 = "Spol fremover";
var captions$8 = "Undertekster";
var showCaptions$8 = "Vis undertekster";
var hideCaptions$8 = "Skjul undertekster";
var captionsOff$8 = "Slå av undertekster";
var showTranscript$8 = "Vis transkripsjon";
var hideTranscript$8 = "Skjul transkripsjon";
var turnOnDescriptions$8 = "Slå på synstolking";
var turnOffDescriptions$8 = "Slå av synstolking";
var chapters$8 = "Kapitler";
var language$8 = "Språk";
var sign$8 = "Tegnspråk";
var showSign$8 = "Vis tegnspråk";
var hideSign$8 = "Skjul tegnspråk";
var seekbarLabel$8 = "tidslinje";
var mute$8 = "Lyd av";
var unmute$8 = "Lyd på";
var volume$8 = "Volum";
var volumeUpDown$8 = "Volumkontroll";
var preferences$8 = "Innstillinger";
var enterFullScreen$8 = "Vis fullskjerm";
var exitFullScreen$8 = "Avslutt fullskjerm";
var speed$8 = "Hastighet";
var spacebar$8 = "ordskiller";
var transcriptTitle$8 = "Transkripsjon";
var lyricsTitle$8 = "Teksting, verselinjer";
var autoScroll$8 = "Automatisk rulling";
var statusPlaying$8 = "Spiller av";
var statusPaused$8 = "Satt på pause";
var statusStopped$8 = "Stoppet";
var statusBuffering$8 = "Mottar data";
var statusEnd$8 = "Slutt på sporet";
var selectedTrack$8 = "Valgt spor";
var alertDescribedVersion$8 = "Bruker videoversjon med synstolking";
var alertNonDescribedVersion$8 = "Bruker videoversjon uten synstolking";
var prefMenuCaptions$8 = "Undertekster";
var prefVoicedCaptions$8 = "Spoken Captions";
var prefMenuDescriptions$8 = "Synstolking";
var prefMenuKeyboard$8 = "Tastatur";
var prefMenuTranscript$8 = "Transkripsjon";
var prefTitleCaptions$8 = "Undertekstinnstillinger";
var prefTitleDescriptions$8 = "Synstolkingsinnstillinger";
var prefTitleKeyboard$8 = "Tastaturinnstillinger";
var prefTitleTranscript$8 = "Transkripsjonsinnstillinger";
var prefIntroDescription1$8 = "Denne mediespilleren støtter lydbeskrivelse på to måter: ";
var prefDescription1$8 = "Denne videoen har en alternativ synstolket versjon, tekstbasert synstolking.";
var prefDescription2$8 = "Denne videoen har alternativ synstolket versjon av video.";
var prefDescription3$8 = "Denne videoen har tekstbasert synstolket versjon opplest av skjermleser.";
var prefIntroDescriptionNone$8 = "Denne videoen har ikke synstolking i noen av formatene.";
var prefIntroDescription3$8 = "Bruk følgende skjema for å gjøre dine valg angående tekstbasert synstolking.";
var prefIntroDescription4$8 = "Etter at du har lagret dine valg kan synstolking slås av og på med synstolkingsknappen.";
var prefIntroKeyboard1$8 = "Mediespilleren på denne nettsiden kan styres fra hvor som helst på siden ved hjelp av tastatursnarveier (se liste nedenfor).";
var prefIntroKeyboard2$8 = "Metataster (Shift, Alt, og Control) kan legges til nedenfor.";
var prefIntroKeyboard3$8 = "NB! Noen tastekombinasjoner kan komme i konflikt med taster som brukes av nettleseren din og/eller andre programmer. Prøv forskjellige tastekombinasjoner for å finne de som fungerer for deg.";
var prefHeadingKeyboard1$8 = "Metataster som brukes til tastekombinasjoner";
var prefHeadingKeyboard2$8 = "Nåværende tastekombinasjoner";
var prefHeadingDescription$8 = "Synstolking";
var prefHeadingTextDescription$8 = "Tekstbasert synstolking";
var prefAltKey$8 = "Alt";
var prefCtrlKey$8 = "Control";
var prefShiftKey$8 = "Shift";
var prefNoKeyShortcuts$8 = "Disable keyboard shortcuts";
var escapeKey$8 = "Escape";
var escapeKeyFunction$8 = "Lukk dialogboks eller popup-meny";
var prefDescPause$8 = "Sett video automatisk på pause når synstolking starter";
var prefDescVisible$8 = "Vis synstolking";
var prefDescVoice$8 = "Stemme";
var prefDescRate$8 = "Spoken Description Rate";
var prefCaptionRate$8 = "Spoken Caption Rate";
var prefDescPitch$8 = "Toneleie";
var prefDescPitch1$8 = "Meget lavt";
var prefDescPitch2$8 = "Lavt";
var prefDescPitch3$8 = "Normalt";
var prefDescPitch4$8 = "Høyt";
var prefDescPitch5$8 = "Meget høyt";
var sampleDescriptionText$8 = "Juster innstillingene for å høre denne eksempelteksten.";
var prefHighlight$8 = "Marker det som leses i transkripsjon ved avspilling";
var prefTabbable$8 = "Tastaturaktivert transkripsjon";
var prefCaptionsFont$8 = "Skrifttype";
var prefCaptionsColor$8 = "Skriftfarge";
var prefCaptionsBGColor$8 = "Bakgrunn";
var prefCaptionsSize$8 = "Skriftstørrelse";
var prefCaptionsOpacity$8 = "Ugjennomsiktighet";
var prefCaptionsStyle$8 = "Stil";
var serif$8 = "serif";
var sans$8 = "sans-serif";
var cursive$8 = "kursiv";
var fantasy$8 = "fantasi";
var monospace$8 = "ikke proporsjonal";
var white$8 = "hvit";
var yellow$8 = "gul";
var green$8 = "grønn";
var cyan$8 = "cyan";
var blue$8 = "blå";
var magenta$8 = "magenta";
var red$8 = "rød";
var black$8 = "sort";
var transparent$8 = "gjennomsiktig";
var solid$8 = "ugjennomsiktig";
var captionsStylePopOn$8 = "Dukker opp";
var captionsStyleRollUp$8 = "Ruller opp";
var prefCaptionsPosition$8 = "Posisjon";
var captionsPositionOverlay$8 = "Legg oppå video";
var captionsPositionBelow$8 = "Legg under video";
var sampleCaptionText$8 = "Eksempel på undertekst";
var prefSuccess$8 = "Dine endringer er lagret.";
var prefNoChange$8 = "Du gjorde ingen endringer.";
var save$8 = "Lagre";
var cancel$8 = "Avbryt";
var dismissButton$8 = "Dismiss";
var windowButtonLabel$8 = "Vindusinnstillinger";
var windowMove$8 = "Flytt";
var windowMoveLeft$8 = "Window moved left";
var windowMoveRight$8 = "Window moved right";
var windowMoveUp$8 = "Window moved up";
var windowMoveDown$8 = "Window moved down";
var windowMoveStopped$8 = "Window move stopped";
var transcriptControls$8 = "Transcript Window Controls";
var signControls$8 = "Sign Language Window Controls";
var windowMoveAlert$8 = "Dra eller bruk piltaster for å flytte vinduet; Enter-tast for å stoppe";
var windowResize$8 = "Endre størrelse";
var windowResizeHeading$8 = "Endre vindusstørrelse";
var closeButtonLabel$8 = "Lukk";
var width$8 = "Bredde";
var height$8 = "Høyde";
var resultsSummary1$8 = "Du søkte etter:";
var resultsSummary2$8 = "Funnet %1 passende treff.";
var resultsSummary3$8 = "Klikk tidspunkt på aktuelt treff for å avspille video derfra.";
var noResultsFound$8 = "Ingen treff funnet.";
var searchButtonLabel$8 = "Spill av fra %1";
var hour$8 = "time";
var minute$8 = "minutt";
var second$8 = "sekund";
var hours$8 = "timer";
var minutes$8 = "minutter";
var seconds$8 = "sekunder";
var vtsHeading$8 = "Video Transcript Sorter";
var vtsInstructions1$8 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$8 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$8 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$8 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$8 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$8 = "Select a language";
var vtsSave$8 = "Generate new .vtt content";
var vtsReturn$8 = "Return to Editor";
var vtsCancel$8 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$8 = "Row";
var vtsKind$8 = "Kind";
var vtsStart$8 = "Start";
var vtsEnd$8 = "End";
var vtsContent$8 = "Content";
var vtsActions$8 = "Actions";
var vtsNewRow$8 = "A new row %1 has been inserted.";
var vtsDeletedRow$8 = "Row %1 has been deleted.";
var vtsMovedRow$8 = "Row %1 has been moved %2 and is now Row %3.";
var nb = {
	playerHeading: playerHeading$8,
	audioPlayer: audioPlayer$8,
	videoPlayer: videoPlayer$8,
	faster: faster$8,
	slower: slower$8,
	play: play$8,
	pause: pause$8,
	restart: restart$8,
	prevTrack: prevTrack$8,
	nextTrack: nextTrack$8,
	rewind: rewind$8,
	forward: forward$8,
	captions: captions$8,
	showCaptions: showCaptions$8,
	hideCaptions: hideCaptions$8,
	captionsOff: captionsOff$8,
	showTranscript: showTranscript$8,
	hideTranscript: hideTranscript$8,
	turnOnDescriptions: turnOnDescriptions$8,
	turnOffDescriptions: turnOffDescriptions$8,
	chapters: chapters$8,
	language: language$8,
	sign: sign$8,
	showSign: showSign$8,
	hideSign: hideSign$8,
	seekbarLabel: seekbarLabel$8,
	mute: mute$8,
	unmute: unmute$8,
	volume: volume$8,
	volumeUpDown: volumeUpDown$8,
	preferences: preferences$8,
	enterFullScreen: enterFullScreen$8,
	exitFullScreen: exitFullScreen$8,
	speed: speed$8,
	spacebar: spacebar$8,
	transcriptTitle: transcriptTitle$8,
	lyricsTitle: lyricsTitle$8,
	autoScroll: autoScroll$8,
	statusPlaying: statusPlaying$8,
	statusPaused: statusPaused$8,
	statusStopped: statusStopped$8,
	statusBuffering: statusBuffering$8,
	statusEnd: statusEnd$8,
	selectedTrack: selectedTrack$8,
	alertDescribedVersion: alertDescribedVersion$8,
	alertNonDescribedVersion: alertNonDescribedVersion$8,
	prefMenuCaptions: prefMenuCaptions$8,
	prefVoicedCaptions: prefVoicedCaptions$8,
	prefMenuDescriptions: prefMenuDescriptions$8,
	prefMenuKeyboard: prefMenuKeyboard$8,
	prefMenuTranscript: prefMenuTranscript$8,
	prefTitleCaptions: prefTitleCaptions$8,
	prefTitleDescriptions: prefTitleDescriptions$8,
	prefTitleKeyboard: prefTitleKeyboard$8,
	prefTitleTranscript: prefTitleTranscript$8,
	prefIntroDescription1: prefIntroDescription1$8,
	prefDescription1: prefDescription1$8,
	prefDescription2: prefDescription2$8,
	prefDescription3: prefDescription3$8,
	prefIntroDescriptionNone: prefIntroDescriptionNone$8,
	prefIntroDescription3: prefIntroDescription3$8,
	prefIntroDescription4: prefIntroDescription4$8,
	prefIntroKeyboard1: prefIntroKeyboard1$8,
	prefIntroKeyboard2: prefIntroKeyboard2$8,
	prefIntroKeyboard3: prefIntroKeyboard3$8,
	prefHeadingKeyboard1: prefHeadingKeyboard1$8,
	prefHeadingKeyboard2: prefHeadingKeyboard2$8,
	prefHeadingDescription: prefHeadingDescription$8,
	prefHeadingTextDescription: prefHeadingTextDescription$8,
	prefAltKey: prefAltKey$8,
	prefCtrlKey: prefCtrlKey$8,
	prefShiftKey: prefShiftKey$8,
	prefNoKeyShortcuts: prefNoKeyShortcuts$8,
	escapeKey: escapeKey$8,
	escapeKeyFunction: escapeKeyFunction$8,
	prefDescPause: prefDescPause$8,
	prefDescVisible: prefDescVisible$8,
	prefDescVoice: prefDescVoice$8,
	prefDescRate: prefDescRate$8,
	prefCaptionRate: prefCaptionRate$8,
	prefDescPitch: prefDescPitch$8,
	prefDescPitch1: prefDescPitch1$8,
	prefDescPitch2: prefDescPitch2$8,
	prefDescPitch3: prefDescPitch3$8,
	prefDescPitch4: prefDescPitch4$8,
	prefDescPitch5: prefDescPitch5$8,
	sampleDescriptionText: sampleDescriptionText$8,
	prefHighlight: prefHighlight$8,
	prefTabbable: prefTabbable$8,
	prefCaptionsFont: prefCaptionsFont$8,
	prefCaptionsColor: prefCaptionsColor$8,
	prefCaptionsBGColor: prefCaptionsBGColor$8,
	prefCaptionsSize: prefCaptionsSize$8,
	prefCaptionsOpacity: prefCaptionsOpacity$8,
	prefCaptionsStyle: prefCaptionsStyle$8,
	serif: serif$8,
	sans: sans$8,
	cursive: cursive$8,
	fantasy: fantasy$8,
	monospace: monospace$8,
	white: white$8,
	yellow: yellow$8,
	green: green$8,
	cyan: cyan$8,
	blue: blue$8,
	magenta: magenta$8,
	red: red$8,
	black: black$8,
	transparent: transparent$8,
	solid: solid$8,
	captionsStylePopOn: captionsStylePopOn$8,
	captionsStyleRollUp: captionsStyleRollUp$8,
	prefCaptionsPosition: prefCaptionsPosition$8,
	captionsPositionOverlay: captionsPositionOverlay$8,
	captionsPositionBelow: captionsPositionBelow$8,
	sampleCaptionText: sampleCaptionText$8,
	prefSuccess: prefSuccess$8,
	prefNoChange: prefNoChange$8,
	save: save$8,
	cancel: cancel$8,
	dismissButton: dismissButton$8,
	windowButtonLabel: windowButtonLabel$8,
	windowMove: windowMove$8,
	windowMoveLeft: windowMoveLeft$8,
	windowMoveRight: windowMoveRight$8,
	windowMoveUp: windowMoveUp$8,
	windowMoveDown: windowMoveDown$8,
	windowMoveStopped: windowMoveStopped$8,
	transcriptControls: transcriptControls$8,
	signControls: signControls$8,
	windowMoveAlert: windowMoveAlert$8,
	windowResize: windowResize$8,
	windowResizeHeading: windowResizeHeading$8,
	closeButtonLabel: closeButtonLabel$8,
	width: width$8,
	height: height$8,
	resultsSummary1: resultsSummary1$8,
	resultsSummary2: resultsSummary2$8,
	resultsSummary3: resultsSummary3$8,
	noResultsFound: noResultsFound$8,
	searchButtonLabel: searchButtonLabel$8,
	hour: hour$8,
	minute: minute$8,
	second: second$8,
	hours: hours$8,
	minutes: minutes$8,
	seconds: seconds$8,
	vtsHeading: vtsHeading$8,
	vtsInstructions1: vtsInstructions1$8,
	vtsInstructions2: vtsInstructions2$8,
	vtsInstructions3: vtsInstructions3$8,
	vtsInstructions4: vtsInstructions4$8,
	vtsInstructions5: vtsInstructions5$8,
	vtsSelectLanguage: vtsSelectLanguage$8,
	vtsSave: vtsSave$8,
	vtsReturn: vtsReturn$8,
	vtsCancel: vtsCancel$8,
	vtsRow: vtsRow$8,
	vtsKind: vtsKind$8,
	vtsStart: vtsStart$8,
	vtsEnd: vtsEnd$8,
	vtsContent: vtsContent$8,
	vtsActions: vtsActions$8,
	vtsNewRow: vtsNewRow$8,
	vtsDeletedRow: vtsDeletedRow$8,
	vtsMovedRow: vtsMovedRow$8
};

var playerHeading$7 = "Mediaspeler";
var audioPlayer$7 = "Audiospeler";
var videoPlayer$7 = "Videospeler";
var faster$7 = "Sneller";
var slower$7 = "Langzamer";
var play$7 = "Afspelen";
var pause$7 = "Pauzeren";
var restart$7 = "Herstarten";
var prevTrack$7 = "Vorige track";
var nextTrack$7 = "Volgend track";
var rewind$7 = "Terug";
var forward$7 = "Verder";
var captions$7 = "Ondertiteling";
var showCaptions$7 = "Toon ondertiteling";
var hideCaptions$7 = "Verberg ondertiteling";
var captionsOff$7 = "Ondertiteling uit";
var showTranscript$7 = "Toon transcript";
var hideTranscript$7 = "Verberg transcript";
var turnOnDescriptions$7 = "Beschrijvingen aanzetten";
var turnOffDescriptions$7 = "Beschrijvingen uitzetten";
var chapters$7 = "Hoofdstukken";
var language$7 = "Taal";
var sign$7 = "Gebarentaal";
var showSign$7 = "Toon gebarentaal";
var seekbarLabel$7 = "tijdlijn";
var hideSign$7 = "Verberg gebarentaal";
var mute$7 = "Dempen";
var unmute$7 = "Dempen uit";
var volume$7 = "Volume";
var volumeUpDown$7 = "Volume hoger lager";
var preferences$7 = "Voorkeuren";
var enterFullScreen$7 = "Ga naar volledig scherm";
var exitFullScreen$7 = "Verlaat volledig scherm";
var speed$7 = "Snelheid";
var spacebar$7 = "spatietoets";
var transcriptTitle$7 = "Transcript";
var lyricsTitle$7 = "Tekst";
var autoScroll$7 = "Auto-scroll";
var statusPlaying$7 = "Aan het spelen";
var statusPaused$7 = "Gepauzeerd";
var statusStopped$7 = "Gestopt";
var statusBuffering$7 = "Aan het bufferen";
var statusEnd$7 = "Einde van track";
var selectedTrack$7 = "Geselecteerde track";
var alertDescribedVersion$7 = "Versie met audiobeschrijving wordt gebruikt";
var alertNonDescribedVersion$7 = "Versie zonder audiobeschrijving wordt gebruikt";
var prefMenuCaptions$7 = "Ondertiteling";
var prefVoicedCaptions$7 = "Spoken Captions";
var prefMenuDescriptions$7 = "Beschrijvingen";
var prefMenuKeyboard$7 = "Toetsenbord";
var prefMenuTranscript$7 = "Transcript";
var prefTitleCaptions$7 = "Voorkeuren ondertiteling";
var prefTitleDescriptions$7 = "Voorkeuren audiobeschrijving";
var prefTitleKeyboard$7 = "Voorkeuren toetsenbord";
var prefTitleTranscript$7 = "Voorkeuren transcript";
var prefIntroDescription1$7 = "Deze videospeler ondersteund audiobeschrijving op twee manieren: ";
var prefDescription1$7 = "De huidige video heeft een alternatief beschreven versie, op tekst gebaseerde beschrijving.";
var prefDescription2$7 = "De huidige video heeft Alternatieve beschreven versie van de video.";
var prefDescription3$7 = "De huidige video heeft op tekst gebaseerde beschrijving, uitgesproken door de schermlezer.";
var prefIntroDescriptionNone$7 = "De huidige video heeft in beide formaten geen audiobeschrijving.";
var prefIntroDescription3$7 = "Gebruik het volgende formulier om je voorkeuren gerelateerd aan tekst-gebaseerde audiobeschrijving in te stellen.";
var prefIntroDescription4$7 = "Na het opslaan van je instellingen, kan audiobeschrijving aan of uit gezet worden met de Beschrijving-knop.";
var prefIntroKeyboard1$7 = "De mediaspeler op deze pagina kan vanaf elke plek binnen de pagina bestuurd worden met de toetsenbord sneltoetsen (zie de lijst hieronder).";
var prefIntroKeyboard2$7 = "Mutatie knoppen (Shift, Alt, and Control) kunnen hier onder toegekend worden.";
var prefIntroKeyboard3$7 = "LET OP: Sommige toetsencombinaties kunnen conflicteren met de toetsen die gebruikt worden door de browser en/of andere software applicaties. Probeer verscheidene combinaties van de mutatie knoppen om een combinatie te vinden die voor jou werkt.";
var prefHeadingKeyboard1$7 = "Mutatie knoppen gebruikt voor sneltoetsen";
var prefHeadingKeyboard2$7 = "Huidige toetsenbord sneltoetsen";
var prefHeadingDescription$7 = "Audiobeschrijving";
var prefHeadingTextDescription$7 = "Tekst-gebaseerde audiobeschrijving";
var prefAltKey$7 = "Alt";
var prefCtrlKey$7 = "Control";
var prefShiftKey$7 = "Shift";
var prefNoKeyShortcuts$7 = "Schakel sneltoetsen uit";
var escapeKey$7 = "Escape";
var escapeKeyFunction$7 = "Sluit huidige dialoog of pop-up menu";
var prefDescPause$7 = "Pauzeer de video automatisch als de beschrijving aan wordt gezet";
var prefDescVisible$7 = "Als er een tekst-gebaseerde beschrijving is, maak deze dan zichtbaar";
var prefDescVoice$7 = "Stem";
var prefDescRate$7 = "Spoken Description Rate";
var prefCaptionRate$7 = "Spoken Caption Rate";
var prefDescPitch$7 = "Toonhoogte";
var prefDescPitch1$7 = "Zeer laag";
var prefDescPitch2$7 = "Laag";
var prefDescPitch3$7 = "Normaal";
var prefDescPitch4$7 = "Hoog";
var prefDescPitch5$7 = "Zeer hoog";
var sampleDescriptionText$7 = "Pas de instellingen aan om deze voorbeeldtekst te beluisteren.";
var prefHighlight$7 = "Highlight transcript terwijl media speelt";
var prefTabbable$7 = "Maak transcript bedienbaar met toetsenbord";
var prefCaptionsFont$7 = "Lettertype";
var prefCaptionsColor$7 = "Tekstkleur";
var prefCaptionsBGColor$7 = "Achtergrondkleur";
var prefCaptionsSize$7 = "Grootte lettertype ";
var prefCaptionsOpacity$7 = "Ondoorzichtigheid";
var prefCaptionsStyle$7 = "Stijl";
var serif$7 = "serif";
var sans$7 = "sans-serif";
var cursive$7 = "cursief";
var fantasy$7 = "fantasy";
var monospace$7 = "monospace";
var white$7 = "wit";
var yellow$7 = "geel";
var green$7 = "groen";
var cyan$7 = "cyaan";
var blue$7 = "blauw";
var magenta$7 = "magenta";
var red$7 = "rood";
var black$7 = "zwart";
var transparent$7 = "transparant";
var solid$7 = "solide";
var captionsStylePopOn$7 = "Verschijn";
var captionsStyleRollUp$7 = "Rol omhoog";
var prefCaptionsPosition$7 = "Positie";
var captionsPositionOverlay$7 = "Overlay";
var captionsPositionBelow$7 = "Onder video";
var sampleCaptionText$7 = "Voorbeeld ondertiteling";
var prefSuccess$7 = "Je wijzigingen zijn opgeslagen.";
var prefNoChange$7 = "Je hebt geen wijzigingen gemaakt.";
var save$7 = "Opslaan";
var cancel$7 = "Annuleren";
var dismissButton$7 = "Verwijder";
var windowButtonLabel$7 = "Instellingen venster";
var windowMove$7 = "Verplaats";
var windowMoveLeft$7 = "Venster naar links verschoven";
var windowMoveRight$7 = "Venster naar rechts verschoven";
var windowMoveUp$7 = "Venster omhoog geschoven.";
var windowMoveDown$7 = "Venster omlaag geschoven.";
var windowMoveStopped$7 = "Verplaatsing venster gestopt";
var transcriptControls$7 = "Bediening venster transcript";
var signControls$7 = "Bediening venster gebarentaal";
var windowMoveAlert$7 = "Versleep of gebruik de pijltjestoetsen om te verplaatsen. Druk op Enter om te stoppen.";
var windowResize$7 = "Verkleinen of vergroten";
var windowResizeHeading$7 = "Verander grootte van venster";
var closeButtonLabel$7 = "Sluit";
var width$7 = "Breedte";
var height$7 = "Hoogte";
var resultsSummary1$7 = "Je zocht naar:";
var resultsSummary2$7 = "Er zijn %1 overeenkomende items gevonden.";
var resultsSummary3$7 = "Klik op de tijd die bij een item staat om de video vanaf dat punt af te spelen.";
var noResultsFound$7 = "Geen resultaten gevonden.";
var searchButtonLabel$7 = "Speel af op %1";
var hour$7 = "uur";
var minute$7 = "minuut";
var second$7 = "seconde";
var hours$7 = "hours";
var minutes$7 = "minuten";
var seconds$7 = "seconden";
var vtsHeading$7 = "Video Transcript Sorter";
var vtsInstructions1$7 = "Gebruik de Video Transcript Sorter om teksttracks te wijzigen:";
var vtsInstructions2$7 = "Herschik hoofdstukken, beschrijvingen, bijschriften en/of ondertiteling zodat ze in de juiste volgorde verschijnen in het automatisch gegenereerde transcript van Able Player.";
var vtsInstructions3$7 = "Wijzig de inhoud of de begin-/eindtijden (alles is direct bewerkbaar in de tabel).";
var vtsInstructions4$7 = "Voeg nieuwe inhoud toe, zoals hoofdstukken of beschrijvingen.";
var vtsInstructions5$7 = "Klik na het bewerken op de knop 'Wijzigingen opslaan' om nieuwe inhoud te genereren voor alle relevante getimede tekstbestanden. De nieuwe tekst kan worden gekopieerd en geplakt in nieuwe WebVTT-bestanden.";
var vtsSelectLanguage$7 = "Selecteer een taal";
var vtsSave$7 = "Genereer nieuwe .vtt inhoud";
var vtsReturn$7 = "Terug naar de editor";
var vtsCancel$7 = "Opslaan annuleren. Alle bewerkingen die je hebt gedaan, zijn hersteld in de VTS-tabel";
var vtsRow$7 = "Rij";
var vtsKind$7 = "Sorteer";
var vtsStart$7 = "Start";
var vtsEnd$7 = "Eind";
var vtsContent$7 = "Inhoud";
var vtsActions$7 = "Acties";
var vtsNewRow$7 = "Er is een nieuwe rij %1 ingevoegd.";
var vtsDeletedRow$7 = "Rij %1 is verwijderd.";
var vtsMovedRow$7 = "Rij %1 is verplaatst naar %2 en is nu rij %3.";
var nl = {
	playerHeading: playerHeading$7,
	audioPlayer: audioPlayer$7,
	videoPlayer: videoPlayer$7,
	faster: faster$7,
	slower: slower$7,
	play: play$7,
	pause: pause$7,
	restart: restart$7,
	prevTrack: prevTrack$7,
	nextTrack: nextTrack$7,
	rewind: rewind$7,
	forward: forward$7,
	captions: captions$7,
	showCaptions: showCaptions$7,
	hideCaptions: hideCaptions$7,
	captionsOff: captionsOff$7,
	showTranscript: showTranscript$7,
	hideTranscript: hideTranscript$7,
	turnOnDescriptions: turnOnDescriptions$7,
	turnOffDescriptions: turnOffDescriptions$7,
	chapters: chapters$7,
	language: language$7,
	sign: sign$7,
	showSign: showSign$7,
	seekbarLabel: seekbarLabel$7,
	hideSign: hideSign$7,
	mute: mute$7,
	unmute: unmute$7,
	volume: volume$7,
	volumeUpDown: volumeUpDown$7,
	preferences: preferences$7,
	enterFullScreen: enterFullScreen$7,
	exitFullScreen: exitFullScreen$7,
	speed: speed$7,
	spacebar: spacebar$7,
	transcriptTitle: transcriptTitle$7,
	lyricsTitle: lyricsTitle$7,
	autoScroll: autoScroll$7,
	statusPlaying: statusPlaying$7,
	statusPaused: statusPaused$7,
	statusStopped: statusStopped$7,
	statusBuffering: statusBuffering$7,
	statusEnd: statusEnd$7,
	selectedTrack: selectedTrack$7,
	alertDescribedVersion: alertDescribedVersion$7,
	alertNonDescribedVersion: alertNonDescribedVersion$7,
	prefMenuCaptions: prefMenuCaptions$7,
	prefVoicedCaptions: prefVoicedCaptions$7,
	prefMenuDescriptions: prefMenuDescriptions$7,
	prefMenuKeyboard: prefMenuKeyboard$7,
	prefMenuTranscript: prefMenuTranscript$7,
	prefTitleCaptions: prefTitleCaptions$7,
	prefTitleDescriptions: prefTitleDescriptions$7,
	prefTitleKeyboard: prefTitleKeyboard$7,
	prefTitleTranscript: prefTitleTranscript$7,
	prefIntroDescription1: prefIntroDescription1$7,
	prefDescription1: prefDescription1$7,
	prefDescription2: prefDescription2$7,
	prefDescription3: prefDescription3$7,
	prefIntroDescriptionNone: prefIntroDescriptionNone$7,
	prefIntroDescription3: prefIntroDescription3$7,
	prefIntroDescription4: prefIntroDescription4$7,
	prefIntroKeyboard1: prefIntroKeyboard1$7,
	prefIntroKeyboard2: prefIntroKeyboard2$7,
	prefIntroKeyboard3: prefIntroKeyboard3$7,
	prefHeadingKeyboard1: prefHeadingKeyboard1$7,
	prefHeadingKeyboard2: prefHeadingKeyboard2$7,
	prefHeadingDescription: prefHeadingDescription$7,
	prefHeadingTextDescription: prefHeadingTextDescription$7,
	prefAltKey: prefAltKey$7,
	prefCtrlKey: prefCtrlKey$7,
	prefShiftKey: prefShiftKey$7,
	prefNoKeyShortcuts: prefNoKeyShortcuts$7,
	escapeKey: escapeKey$7,
	escapeKeyFunction: escapeKeyFunction$7,
	prefDescPause: prefDescPause$7,
	prefDescVisible: prefDescVisible$7,
	prefDescVoice: prefDescVoice$7,
	prefDescRate: prefDescRate$7,
	prefCaptionRate: prefCaptionRate$7,
	prefDescPitch: prefDescPitch$7,
	prefDescPitch1: prefDescPitch1$7,
	prefDescPitch2: prefDescPitch2$7,
	prefDescPitch3: prefDescPitch3$7,
	prefDescPitch4: prefDescPitch4$7,
	prefDescPitch5: prefDescPitch5$7,
	sampleDescriptionText: sampleDescriptionText$7,
	prefHighlight: prefHighlight$7,
	prefTabbable: prefTabbable$7,
	prefCaptionsFont: prefCaptionsFont$7,
	prefCaptionsColor: prefCaptionsColor$7,
	prefCaptionsBGColor: prefCaptionsBGColor$7,
	prefCaptionsSize: prefCaptionsSize$7,
	prefCaptionsOpacity: prefCaptionsOpacity$7,
	prefCaptionsStyle: prefCaptionsStyle$7,
	serif: serif$7,
	sans: sans$7,
	cursive: cursive$7,
	fantasy: fantasy$7,
	monospace: monospace$7,
	white: white$7,
	yellow: yellow$7,
	green: green$7,
	cyan: cyan$7,
	blue: blue$7,
	magenta: magenta$7,
	red: red$7,
	black: black$7,
	transparent: transparent$7,
	solid: solid$7,
	captionsStylePopOn: captionsStylePopOn$7,
	captionsStyleRollUp: captionsStyleRollUp$7,
	prefCaptionsPosition: prefCaptionsPosition$7,
	captionsPositionOverlay: captionsPositionOverlay$7,
	captionsPositionBelow: captionsPositionBelow$7,
	sampleCaptionText: sampleCaptionText$7,
	prefSuccess: prefSuccess$7,
	prefNoChange: prefNoChange$7,
	save: save$7,
	cancel: cancel$7,
	dismissButton: dismissButton$7,
	windowButtonLabel: windowButtonLabel$7,
	windowMove: windowMove$7,
	windowMoveLeft: windowMoveLeft$7,
	windowMoveRight: windowMoveRight$7,
	windowMoveUp: windowMoveUp$7,
	windowMoveDown: windowMoveDown$7,
	windowMoveStopped: windowMoveStopped$7,
	transcriptControls: transcriptControls$7,
	signControls: signControls$7,
	windowMoveAlert: windowMoveAlert$7,
	windowResize: windowResize$7,
	windowResizeHeading: windowResizeHeading$7,
	closeButtonLabel: closeButtonLabel$7,
	width: width$7,
	height: height$7,
	resultsSummary1: resultsSummary1$7,
	resultsSummary2: resultsSummary2$7,
	resultsSummary3: resultsSummary3$7,
	noResultsFound: noResultsFound$7,
	searchButtonLabel: searchButtonLabel$7,
	hour: hour$7,
	minute: minute$7,
	second: second$7,
	hours: hours$7,
	minutes: minutes$7,
	seconds: seconds$7,
	vtsHeading: vtsHeading$7,
	vtsInstructions1: vtsInstructions1$7,
	vtsInstructions2: vtsInstructions2$7,
	vtsInstructions3: vtsInstructions3$7,
	vtsInstructions4: vtsInstructions4$7,
	vtsInstructions5: vtsInstructions5$7,
	vtsSelectLanguage: vtsSelectLanguage$7,
	vtsSave: vtsSave$7,
	vtsReturn: vtsReturn$7,
	vtsCancel: vtsCancel$7,
	vtsRow: vtsRow$7,
	vtsKind: vtsKind$7,
	vtsStart: vtsStart$7,
	vtsEnd: vtsEnd$7,
	vtsContent: vtsContent$7,
	vtsActions: vtsActions$7,
	vtsNewRow: vtsNewRow$7,
	vtsDeletedRow: vtsDeletedRow$7,
	vtsMovedRow: vtsMovedRow$7
};

var playerHeading$6 = "Odtwarzacz mediów";
var audioPlayer$6 = "Audio player";
var videoPlayer$6 = "Video player";
var faster$6 = "Szybciej";
var slower$6 = "Wolniej";
var play$6 = "Odtwarzaj";
var pause$6 = "Pauza";
var restart$6 = "Restart";
var prevTrack$6 = "Poprzednia ścieżka";
var nextTrack$6 = "Następna ścieżka";
var rewind$6 = "Przewiń w tył";
var forward$6 = "Przewiń w przód";
var captions$6 = "Napisy";
var showCaptions$6 = "Pokaż napisy";
var hideCaptions$6 = "Ukryj napisy";
var captionsOff$6 = "Wyłącz napisy";
var showTranscript$6 = "Pokaż transkrypcję";
var hideTranscript$6 = "Ukryj transkrypcję";
var turnOnDescriptions$6 = "Włącz opis audio";
var turnOffDescriptions$6 = "Wyłącz opis audio";
var chapters$6 = "Rozdziały";
var language$6 = "Język";
var sign$6 = "Język migowy";
var showSign$6 = "Pokaż język migowy";
var hideSign$6 = "Ukryj język migowy";
var seekbarLabel$6 = "Linia czasu";
var mute$6 = "Wycisz";
var unmute$6 = "Pogłośnij";
var volume$6 = "Głośność";
var volumeUpDown$6 = "Głośniej/Ciszej";
var preferences$6 = "Preferencje";
var enterFullScreen$6 = "Wejdź na pełny ekran";
var exitFullScreen$6 = "Wyjdź z pełnego ekranu";
var speed$6 = "Tempo";
var spacebar$6 = "spacja";
var transcriptTitle$6 = "Transkrypcja";
var lyricsTitle$6 = "Tekst";
var autoScroll$6 = "Auto przewijanie";
var statusPlaying$6 = "Odtwarzanie";
var statusPaused$6 = "Wstrzymane";
var statusStopped$6 = "Zatrzymane";
var statusBuffering$6 = "Buforowanie";
var statusEnd$6 = "Koniec ścieżki";
var selectedTrack$6 = "Wybrana ścieżka";
var alertDescribedVersion$6 = "Użyj wersji filmu z opisem audio";
var alertNonDescribedVersion$6 = "Użyj wersji filmu bez opisu audio";
var prefMenuCaptions$6 = "Napisy";
var prefVoicedCaptions$6 = "Spoken Captions";
var prefMenuDescriptions$6 = "Audiodeskrypcja";
var prefMenuKeyboard$6 = "Klawiatura";
var prefMenuTranscript$6 = "Transkrypcja";
var prefTitleCaptions$6 = "Preferencje napisów";
var prefTitleDescriptions$6 = "Preferencje audiodeskrypcji";
var prefTitleKeyboard$6 = "Preferencje klawiatury";
var prefTitleTranscript$6 = "Preferencje transkrypcji";
var prefIntroDescription1$6 = "Ten odtwarzacz mediów obsługuje audiodeskrypcję na dwa sposoby: ";
var prefDescription1$6 = "Bieżący film ma alternatywna wersja opisu audio, tekst opisu audio.";
var prefDescription2$6 = "Bieżący film ma alternatywna wersja wideo z opisem audio.";
var prefDescription3$6 = "Bieżący film ma tekst opisu audio, ogłaszany przez czytnik ekranu.";
var prefIntroDescriptionNone$6 = "Bieżący film nie ma audiodeskprycji.";
var prefIntroDescription3$6 = "Użyj formularza poniższej, aby określić ustawienia odtwarzania tekstowego opisu audio";
var prefIntroDescription4$6 = "Po zapisaniu ustawień opisu audio można włączać/wyłączać za pomocą przycisku Audiodeskrypcja.";
var prefIntroKeyboard1$6 = "Odtwarzaczem mediów na tej stronie można sterować z dowolnego miejsca na stronie za pomocą skrótów klawiaturowych (lista poniżej).";
var prefIntroKeyboard2$6 = "Klawisze modyfikujące (Shift, Alt i Control) można przypisać poniżej";
var prefIntroKeyboard3$6 = "UWAGA: Niektóre kombinacje klawiszy mogą kolidować z klawiszami używanymi przez przeglądarkę i/lub inne aplikacje. Wypróbuj różne kombinacje klawiszy modyfikujących, aby znaleźć taką, która będzie dla Ciebie odpowiednia.";
var prefHeadingKeyboard1$6 = "Klawisze modyfikujące używane do skrótów";
var prefHeadingKeyboard2$6 = "Bieżące skróty klawiaturowe";
var prefHeadingDescription$6 = "Audiodeskrypcja";
var prefHeadingTextDescription$6 = "Tekst oparty na audiodeskrypcji";
var prefAltKey$6 = "Alt";
var prefCtrlKey$6 = "Control";
var prefShiftKey$6 = "Shift";
var prefNoKeyShortcuts$6 = "Disable keyboard shortcuts";
var escapeKey$6 = "Escape";
var escapeKeyFunction$6 = "Zamknij bieżące okno dialogowe lub menu podręczne";
var prefDescPause$6 = "Automatycznie wstrzymuj wideo po rozpoczęciu audiodeskrypcji";
var prefDescVisible$6 = "Wyświetlaj opis audio";
var prefDescVoice$6 = "Głos";
var prefDescRate$6 = "Spoken Description Rate";
var prefCaptionRate$6 = "Spoken Caption Rate";
var prefDescPitch$6 = "Wysokość";
var prefDescPitch1$6 = "Bardzo niska";
var prefDescPitch2$6 = "Niska";
var prefDescPitch3$6 = "Domyślna";
var prefDescPitch4$6 = "Wysoka";
var prefDescPitch5$6 = "Bardzo wysoko";
var sampleDescriptionText$6 = "Edytuj ustawienia, aby odczytać ten tekst na głos.";
var prefHighlight$6 = "Podświetl transkrypcję podczas odtwarzania mediów";
var prefTabbable$6 = "Włącz transkrypcję za pomocą klawiatury";
var prefCaptionsFont$6 = "Czcionka";
var prefCaptionsColor$6 = "Kolor tekstu";
var prefCaptionsBGColor$6 = "Kolor tła";
var prefCaptionsSize$6 = "Rozmiar czcionki";
var prefCaptionsOpacity$6 = "Krycie";
var prefCaptionsStyle$6 = "Styl";
var serif$6 = "szeryfowa";
var sans$6 = "bezszeryfowa";
var cursive$6 = "pochyła";
var fantasy$6 = "fantazyjna";
var monospace$6 = "stała szerokość";
var white$6 = "biały";
var yellow$6 = "żółty";
var green$6 = "zielony";
var cyan$6 = "cyjan";
var blue$6 = "niebieski";
var magenta$6 = "magenta";
var red$6 = "czerwony";
var black$6 = "czarny";
var transparent$6 = "transparentne";
var solid$6 = "solidne";
var captionsStylePopOn$6 = "Rozwiń";
var captionsStyleRollUp$6 = "Zwiń";
var prefCaptionsPosition$6 = "Pozycja";
var captionsPositionOverlay$6 = "Nakładka";
var captionsPositionBelow$6 = "Poniżej wideo";
var sampleCaptionText$6 = "Przykładowy tekst napisu";
var prefSuccess$6 = "Zmiany zostały zapisane.";
var prefNoChange$6 = "Nie wprowadzono żadnych zmian.";
var save$6 = "Zapisz";
var cancel$6 = "Anuluj";
var dismissButton$6 = "Dismiss";
var windowButtonLabel$6 = "Opcje okna";
var windowMove$6 = "Przenieś";
var windowMoveLeft$6 = "Window moved left";
var windowMoveRight$6 = "Window moved right";
var windowMoveUp$6 = "Window moved up";
var windowMoveDown$6 = "Window moved down";
var windowMoveStopped$6 = "Window move stopped";
var transcriptControls$6 = "Transcript Window Controls";
var signControls$6 = "Sign Language Window Controls";
var windowMoveAlert$6 = "Przeciągnij lub użyj strzałek, aby przesunąć okno; Enter, aby zatrzymać";
var windowResize$6 = "Zmień rozmiar";
var windowResizeHeading$6 = "Zmień rozmiar okna";
var closeButtonLabel$6 = "Zamknij";
var width$6 = "Szerokość";
var height$6 = "Wysokość";
var resultsSummary1$6 = "Szukano:";
var resultsSummary2$6 = "Znaleziono %1 pasujące elementy.";
var resultsSummary3$6 = "Kliknij czas powiązany z dowolnym elementem, aby odtworzyć wideo od tego momentu.";
var noResultsFound$6 = "Nie znaleziono żadnych wyników";
var searchButtonLabel$6 = "Odtwarzaj od %1";
var hour$6 = "godzina";
var minute$6 = "minuta";
var second$6 = "sekunda";
var hours$6 = "godziny";
var minutes$6 = "minuty";
var seconds$6 = "sekundy";
var vtsHeading$6 = "Video Transcript Sorter";
var vtsInstructions1$6 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$6 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$6 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$6 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$6 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$6 = "Select a language";
var vtsSave$6 = "Generate new .vtt content";
var vtsReturn$6 = "Return to Editor";
var vtsCancel$6 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$6 = "Row";
var vtsKind$6 = "Kind";
var vtsStart$6 = "Start";
var vtsEnd$6 = "End";
var vtsContent$6 = "Content";
var vtsActions$6 = "Actions";
var vtsNewRow$6 = "A new row %1 has been inserted.";
var vtsDeletedRow$6 = "Row %1 has been deleted.";
var vtsMovedRow$6 = "Row %1 has been moved %2 and is now Row %3.";
var pl = {
	playerHeading: playerHeading$6,
	audioPlayer: audioPlayer$6,
	videoPlayer: videoPlayer$6,
	faster: faster$6,
	slower: slower$6,
	play: play$6,
	pause: pause$6,
	restart: restart$6,
	prevTrack: prevTrack$6,
	nextTrack: nextTrack$6,
	rewind: rewind$6,
	forward: forward$6,
	captions: captions$6,
	showCaptions: showCaptions$6,
	hideCaptions: hideCaptions$6,
	captionsOff: captionsOff$6,
	showTranscript: showTranscript$6,
	hideTranscript: hideTranscript$6,
	turnOnDescriptions: turnOnDescriptions$6,
	turnOffDescriptions: turnOffDescriptions$6,
	chapters: chapters$6,
	language: language$6,
	sign: sign$6,
	showSign: showSign$6,
	hideSign: hideSign$6,
	seekbarLabel: seekbarLabel$6,
	mute: mute$6,
	unmute: unmute$6,
	volume: volume$6,
	volumeUpDown: volumeUpDown$6,
	preferences: preferences$6,
	enterFullScreen: enterFullScreen$6,
	exitFullScreen: exitFullScreen$6,
	speed: speed$6,
	spacebar: spacebar$6,
	transcriptTitle: transcriptTitle$6,
	lyricsTitle: lyricsTitle$6,
	autoScroll: autoScroll$6,
	statusPlaying: statusPlaying$6,
	statusPaused: statusPaused$6,
	statusStopped: statusStopped$6,
	statusBuffering: statusBuffering$6,
	statusEnd: statusEnd$6,
	selectedTrack: selectedTrack$6,
	alertDescribedVersion: alertDescribedVersion$6,
	alertNonDescribedVersion: alertNonDescribedVersion$6,
	prefMenuCaptions: prefMenuCaptions$6,
	prefVoicedCaptions: prefVoicedCaptions$6,
	prefMenuDescriptions: prefMenuDescriptions$6,
	prefMenuKeyboard: prefMenuKeyboard$6,
	prefMenuTranscript: prefMenuTranscript$6,
	prefTitleCaptions: prefTitleCaptions$6,
	prefTitleDescriptions: prefTitleDescriptions$6,
	prefTitleKeyboard: prefTitleKeyboard$6,
	prefTitleTranscript: prefTitleTranscript$6,
	prefIntroDescription1: prefIntroDescription1$6,
	prefDescription1: prefDescription1$6,
	prefDescription2: prefDescription2$6,
	prefDescription3: prefDescription3$6,
	prefIntroDescriptionNone: prefIntroDescriptionNone$6,
	prefIntroDescription3: prefIntroDescription3$6,
	prefIntroDescription4: prefIntroDescription4$6,
	prefIntroKeyboard1: prefIntroKeyboard1$6,
	prefIntroKeyboard2: prefIntroKeyboard2$6,
	prefIntroKeyboard3: prefIntroKeyboard3$6,
	prefHeadingKeyboard1: prefHeadingKeyboard1$6,
	prefHeadingKeyboard2: prefHeadingKeyboard2$6,
	prefHeadingDescription: prefHeadingDescription$6,
	prefHeadingTextDescription: prefHeadingTextDescription$6,
	prefAltKey: prefAltKey$6,
	prefCtrlKey: prefCtrlKey$6,
	prefShiftKey: prefShiftKey$6,
	prefNoKeyShortcuts: prefNoKeyShortcuts$6,
	escapeKey: escapeKey$6,
	escapeKeyFunction: escapeKeyFunction$6,
	prefDescPause: prefDescPause$6,
	prefDescVisible: prefDescVisible$6,
	prefDescVoice: prefDescVoice$6,
	prefDescRate: prefDescRate$6,
	prefCaptionRate: prefCaptionRate$6,
	prefDescPitch: prefDescPitch$6,
	prefDescPitch1: prefDescPitch1$6,
	prefDescPitch2: prefDescPitch2$6,
	prefDescPitch3: prefDescPitch3$6,
	prefDescPitch4: prefDescPitch4$6,
	prefDescPitch5: prefDescPitch5$6,
	sampleDescriptionText: sampleDescriptionText$6,
	prefHighlight: prefHighlight$6,
	prefTabbable: prefTabbable$6,
	prefCaptionsFont: prefCaptionsFont$6,
	prefCaptionsColor: prefCaptionsColor$6,
	prefCaptionsBGColor: prefCaptionsBGColor$6,
	prefCaptionsSize: prefCaptionsSize$6,
	prefCaptionsOpacity: prefCaptionsOpacity$6,
	prefCaptionsStyle: prefCaptionsStyle$6,
	serif: serif$6,
	sans: sans$6,
	cursive: cursive$6,
	fantasy: fantasy$6,
	monospace: monospace$6,
	white: white$6,
	yellow: yellow$6,
	green: green$6,
	cyan: cyan$6,
	blue: blue$6,
	magenta: magenta$6,
	red: red$6,
	black: black$6,
	transparent: transparent$6,
	solid: solid$6,
	captionsStylePopOn: captionsStylePopOn$6,
	captionsStyleRollUp: captionsStyleRollUp$6,
	prefCaptionsPosition: prefCaptionsPosition$6,
	captionsPositionOverlay: captionsPositionOverlay$6,
	captionsPositionBelow: captionsPositionBelow$6,
	sampleCaptionText: sampleCaptionText$6,
	prefSuccess: prefSuccess$6,
	prefNoChange: prefNoChange$6,
	save: save$6,
	cancel: cancel$6,
	dismissButton: dismissButton$6,
	windowButtonLabel: windowButtonLabel$6,
	windowMove: windowMove$6,
	windowMoveLeft: windowMoveLeft$6,
	windowMoveRight: windowMoveRight$6,
	windowMoveUp: windowMoveUp$6,
	windowMoveDown: windowMoveDown$6,
	windowMoveStopped: windowMoveStopped$6,
	transcriptControls: transcriptControls$6,
	signControls: signControls$6,
	windowMoveAlert: windowMoveAlert$6,
	windowResize: windowResize$6,
	windowResizeHeading: windowResizeHeading$6,
	closeButtonLabel: closeButtonLabel$6,
	width: width$6,
	height: height$6,
	resultsSummary1: resultsSummary1$6,
	resultsSummary2: resultsSummary2$6,
	resultsSummary3: resultsSummary3$6,
	noResultsFound: noResultsFound$6,
	searchButtonLabel: searchButtonLabel$6,
	hour: hour$6,
	minute: minute$6,
	second: second$6,
	hours: hours$6,
	minutes: minutes$6,
	seconds: seconds$6,
	vtsHeading: vtsHeading$6,
	vtsInstructions1: vtsInstructions1$6,
	vtsInstructions2: vtsInstructions2$6,
	vtsInstructions3: vtsInstructions3$6,
	vtsInstructions4: vtsInstructions4$6,
	vtsInstructions5: vtsInstructions5$6,
	vtsSelectLanguage: vtsSelectLanguage$6,
	vtsSave: vtsSave$6,
	vtsReturn: vtsReturn$6,
	vtsCancel: vtsCancel$6,
	vtsRow: vtsRow$6,
	vtsKind: vtsKind$6,
	vtsStart: vtsStart$6,
	vtsEnd: vtsEnd$6,
	vtsContent: vtsContent$6,
	vtsActions: vtsActions$6,
	vtsNewRow: vtsNewRow$6,
	vtsDeletedRow: vtsDeletedRow$6,
	vtsMovedRow: vtsMovedRow$6
};

var playerHeading$5 = "Reprodutor de mídias";
var audioPlayer$5 = "Audio player";
var videoPlayer$5 = "Video player";
var faster$5 = "Rápido";
var slower$5 = "Lento";
var play$5 = "Reproduzir";
var pause$5 = "Pausar";
var restart$5 = "Reiniciar";
var prevTrack$5 = "Faixa anterior";
var nextTrack$5 = "Próxima faixa";
var rewind$5 = "Retroceder";
var forward$5 = "Avançar";
var captions$5 = "Legendas";
var showCaptions$5 = "Mostrar legendas";
var hideCaptions$5 = "Ocultar legendas";
var captionsOff$5 = "Legendas desligadas";
var showTranscript$5 = "Mostrar transcrição";
var hideTranscript$5 = "Ocultar transcrição";
var turnOnDescriptions$5 = "Habilitar descrições";
var turnOffDescriptions$5 = "Desabilitar descrições";
var chapters$5 = "Capítulos";
var language$5 = "Idioma";
var sign$5 = "Língua de sinais";
var showSign$5 = "Mostrar língua de sinais";
var hideSign$5 = "Ocultar língua de sinais";
var seekbarLabel$5 = "Linha do tempo";
var mute$5 = "Silenciar";
var unmute$5 = "Ativar som";
var volume$5 = "Volume";
var volumeUpDown$5 = "Ampliar/reduzir volume";
var preferences$5 = "Preferências";
var enterFullScreen$5 = "Entrar em tela cheia";
var exitFullScreen$5 = "Sair da tela cheia";
var speed$5 = "Velocidade";
var spacebar$5 = "barra de espaço";
var transcriptTitle$5 = "Transcrição";
var lyricsTitle$5 = "Letras";
var autoScroll$5 = "Rolagem automática";
var statusPlaying$5 = "Reproduzindo";
var statusPaused$5 = "Pausado";
var statusStopped$5 = "Parado";
var statusBuffering$5 = "Carregando";
var statusEnd$5 = "Fim da faixa";
var selectedTrack$5 = "Faixa Selecionada";
var alertDescribedVersion$5 = "Usando a versão com audiodescrição deste vídeo";
var alertNonDescribedVersion$5 = "Utilizando a versão sem audiodescrição desse vídeo";
var prefMenuCaptions$5 = "Capítulos";
var prefVoicedCaptions$5 = "Spoken Captions";
var prefMenuDescriptions$5 = "Descrições";
var prefMenuKeyboard$5 = "Teclado";
var prefMenuTranscript$5 = "Transcrição";
var prefTitleCaptions$5 = "Preferências de Legenda";
var prefTitleDescriptions$5 = "Preferências da Audiodescrição";
var prefTitleKeyboard$5 = "Preferências do Teclado";
var prefTitleTranscript$5 = "Preferências da Transcrição";
var prefIntroDescription1$5 = "Esse reprodutor de mídias suportam audiodescrição de duas maneiras: ";
var prefDescription1$5 = "O vídeo atual está uma versão alternativa de descrição, texto baseado em descrição.";
var prefDescription2$5 = "O vídeo atual está versão alternativa de descrição do vídeo.";
var prefDescription3$5 = "O vídeo atual está texto baseado em descrição, anunciado pelo leitor de tela.";
var prefIntroDescriptionNone$5 = "O vídeo atual não possui audiodescrição em nenhum formato.";
var prefIntroDescription3$5 = "Use o formulário a seguir para definir suas preferências relacionadas à texto baseado em audiodescrição.";
var prefIntroDescription4$5 = "Depois que salvar suas configurações, a audiodescrição poderá ser ligada/desligada usando o botão Descrição.";
var prefIntroKeyboard1$5 = "O reprodutor de mídias desse página web pode ser operado de qualquer lugar nessa página, usando os atalhos de teclado (veja a lista abaixo).";
var prefIntroKeyboard2$5 = "Modificar teclas (Shift, Alt and Control) podem ser gravadas abaixo.";
var prefIntroKeyboard3$5 = "OBSERVE: Algumas combinações de teclado podem entrar em conflito com atalhos usados pelo seu navegador e/ou outro software. Teste várias combinações de atalhos de teclado para encontrar uma que funcione bem para você.";
var prefHeadingKeyboard1$5 = "Teclas modificadas dos atalhos";
var prefHeadingKeyboard2$5 = "Atual atalho de teclado";
var prefHeadingDescription$5 = "Audiodescrição";
var prefHeadingTextDescription$5 = "Texto baseado em audiodescrição";
var prefAltKey$5 = "Alt";
var prefCtrlKey$5 = "Control";
var prefShiftKey$5 = "Shift";
var prefNoKeyShortcuts$5 = "Disable keyboard shortcuts";
var escapeKey$5 = "ESC";
var escapeKeyFunction$5 = "Fechar diálogo ou caixa pop-up atual";
var prefDescPause$5 = "Automaticamente pausar um vídeo quando a descrição iniciar";
var prefDescVisible$5 = "Fazer com que a descrição esteja visível";
var prefDescVoice$5 = "Voz";
var prefDescRate$5 = "Spoken Description Rate";
var prefCaptionRate$5 = "Spoken Caption Rate";
var prefDescPitch$5 = "Tom";
var prefDescPitch1$5 = "Muito baixo";
var prefDescPitch2$5 = "Baixo";
var prefDescPitch3$5 = "Padrão";
var prefDescPitch4$5 = "Alto";
var prefDescPitch5$5 = "Muito alto";
var sampleDescriptionText$5 = "Ajuste as configurações para ouvir este exemplo de texto.";
var prefHighlight$5 = "Destacar a descrição conforme a mídia for reproduzida";
var prefTabbable$5 = "Transcrição de teclado habilitada";
var prefCaptionsFont$5 = "Fonte";
var prefCaptionsColor$5 = "Cor do Texto";
var prefCaptionsBGColor$5 = "Cor do plano de Fundo";
var prefCaptionsSize$5 = "Tamanho da Fonte";
var prefCaptionsOpacity$5 = "transparência";
var prefCaptionsStyle$5 = "Estilo";
var serif$5 = "serifada";
var sans$5 = "sem serifa";
var cursive$5 = "cursiva";
var fantasy$5 = "fantasiosa";
var monospace$5 = "monoespaçada";
var white$5 = "branca";
var yellow$5 = "amarela";
var green$5 = "verde";
var cyan$5 = "ciano";
var blue$5 = "azul";
var magenta$5 = "magenta";
var red$5 = "vermelha";
var black$5 = "preta";
var transparent$5 = "transparente";
var solid$5 = "sólida";
var captionsStylePopOn$5 = "Aparecer";
var captionsStyleRollUp$5 = "Rolar pra cima";
var prefCaptionsPosition$5 = "Posição";
var captionsPositionOverlay$5 = "Sobrepôr";
var captionsPositionBelow$5 = "Abaixo do vídeo";
var sampleCaptionText$5 = "Um texto de exemplo para legendas";
var prefSuccess$5 = "Suas alterações foram salvas";
var prefNoChange$5 = "Você não fez nenhuma alteração";
var save$5 = "Salvar";
var cancel$5 = "Cancelar";
var dismissButton$5 = "Dismiss";
var windowButtonLabel$5 = "Opções de janela";
var windowMove$5 = "Mover";
var windowMoveLeft$5 = "Window moved left";
var windowMoveRight$5 = "Window moved right";
var windowMoveUp$5 = "Window moved up";
var windowMoveDown$5 = "Window moved down";
var windowMoveStopped$5 = "Window move stopped";
var transcriptControls$5 = "Transcript Window Controls";
var signControls$5 = "Sign Language Window Controls";
var windowMoveAlert$5 = "Arraste ou use as setas do seu teclado para mover; Enter para parar";
var windowResize$5 = "Redimensionar";
var windowResizeHeading$5 = "Redimensionar Janela";
var closeButtonLabel$5 = "Fechar";
var width$5 = "Largura";
var height$5 = "Altura";
var resultsSummary1$5 = "Você buscou por:";
var resultsSummary2$5 = "Encontrado %1 itens correspondentes";
var resultsSummary3$5 = "Ative o item de tempo associado para reproduzir o vídeo a partir desse ponto.";
var noResultsFound$5 = "Nenhum resultado encontrado";
var searchButtonLabel$5 = "Tocar no %1";
var hour$5 = "hora";
var minute$5 = "minuto";
var second$5 = "segundos";
var hours$5 = "horas";
var minutes$5 = "minutos";
var seconds$5 = "segundos";
var vtsHeading$5 = "Video Transcript Sorter";
var vtsInstructions1$5 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$5 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$5 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$5 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$5 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$5 = "Select a language";
var vtsSave$5 = "Generate new .vtt content";
var vtsReturn$5 = "Return to Editor";
var vtsCancel$5 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$5 = "Row";
var vtsKind$5 = "Kind";
var vtsStart$5 = "Start";
var vtsEnd$5 = "End";
var vtsContent$5 = "Content";
var vtsActions$5 = "Actions";
var vtsNewRow$5 = "A new row %1 has been inserted.";
var vtsDeletedRow$5 = "Row %1 has been deleted.";
var vtsMovedRow$5 = "Row %1 has been moved %2 and is now Row %3.";
var pt_br = {
	playerHeading: playerHeading$5,
	audioPlayer: audioPlayer$5,
	videoPlayer: videoPlayer$5,
	faster: faster$5,
	slower: slower$5,
	play: play$5,
	pause: pause$5,
	restart: restart$5,
	prevTrack: prevTrack$5,
	nextTrack: nextTrack$5,
	rewind: rewind$5,
	forward: forward$5,
	captions: captions$5,
	showCaptions: showCaptions$5,
	hideCaptions: hideCaptions$5,
	captionsOff: captionsOff$5,
	showTranscript: showTranscript$5,
	hideTranscript: hideTranscript$5,
	turnOnDescriptions: turnOnDescriptions$5,
	turnOffDescriptions: turnOffDescriptions$5,
	chapters: chapters$5,
	language: language$5,
	sign: sign$5,
	showSign: showSign$5,
	hideSign: hideSign$5,
	seekbarLabel: seekbarLabel$5,
	mute: mute$5,
	unmute: unmute$5,
	volume: volume$5,
	volumeUpDown: volumeUpDown$5,
	preferences: preferences$5,
	enterFullScreen: enterFullScreen$5,
	exitFullScreen: exitFullScreen$5,
	speed: speed$5,
	spacebar: spacebar$5,
	transcriptTitle: transcriptTitle$5,
	lyricsTitle: lyricsTitle$5,
	autoScroll: autoScroll$5,
	statusPlaying: statusPlaying$5,
	statusPaused: statusPaused$5,
	statusStopped: statusStopped$5,
	statusBuffering: statusBuffering$5,
	statusEnd: statusEnd$5,
	selectedTrack: selectedTrack$5,
	alertDescribedVersion: alertDescribedVersion$5,
	alertNonDescribedVersion: alertNonDescribedVersion$5,
	prefMenuCaptions: prefMenuCaptions$5,
	prefVoicedCaptions: prefVoicedCaptions$5,
	prefMenuDescriptions: prefMenuDescriptions$5,
	prefMenuKeyboard: prefMenuKeyboard$5,
	prefMenuTranscript: prefMenuTranscript$5,
	prefTitleCaptions: prefTitleCaptions$5,
	prefTitleDescriptions: prefTitleDescriptions$5,
	prefTitleKeyboard: prefTitleKeyboard$5,
	prefTitleTranscript: prefTitleTranscript$5,
	prefIntroDescription1: prefIntroDescription1$5,
	prefDescription1: prefDescription1$5,
	prefDescription2: prefDescription2$5,
	prefDescription3: prefDescription3$5,
	prefIntroDescriptionNone: prefIntroDescriptionNone$5,
	prefIntroDescription3: prefIntroDescription3$5,
	prefIntroDescription4: prefIntroDescription4$5,
	prefIntroKeyboard1: prefIntroKeyboard1$5,
	prefIntroKeyboard2: prefIntroKeyboard2$5,
	prefIntroKeyboard3: prefIntroKeyboard3$5,
	prefHeadingKeyboard1: prefHeadingKeyboard1$5,
	prefHeadingKeyboard2: prefHeadingKeyboard2$5,
	prefHeadingDescription: prefHeadingDescription$5,
	prefHeadingTextDescription: prefHeadingTextDescription$5,
	prefAltKey: prefAltKey$5,
	prefCtrlKey: prefCtrlKey$5,
	prefShiftKey: prefShiftKey$5,
	prefNoKeyShortcuts: prefNoKeyShortcuts$5,
	escapeKey: escapeKey$5,
	escapeKeyFunction: escapeKeyFunction$5,
	prefDescPause: prefDescPause$5,
	prefDescVisible: prefDescVisible$5,
	prefDescVoice: prefDescVoice$5,
	prefDescRate: prefDescRate$5,
	prefCaptionRate: prefCaptionRate$5,
	prefDescPitch: prefDescPitch$5,
	prefDescPitch1: prefDescPitch1$5,
	prefDescPitch2: prefDescPitch2$5,
	prefDescPitch3: prefDescPitch3$5,
	prefDescPitch4: prefDescPitch4$5,
	prefDescPitch5: prefDescPitch5$5,
	sampleDescriptionText: sampleDescriptionText$5,
	prefHighlight: prefHighlight$5,
	prefTabbable: prefTabbable$5,
	prefCaptionsFont: prefCaptionsFont$5,
	prefCaptionsColor: prefCaptionsColor$5,
	prefCaptionsBGColor: prefCaptionsBGColor$5,
	prefCaptionsSize: prefCaptionsSize$5,
	prefCaptionsOpacity: prefCaptionsOpacity$5,
	prefCaptionsStyle: prefCaptionsStyle$5,
	serif: serif$5,
	sans: sans$5,
	cursive: cursive$5,
	fantasy: fantasy$5,
	monospace: monospace$5,
	white: white$5,
	yellow: yellow$5,
	green: green$5,
	cyan: cyan$5,
	blue: blue$5,
	magenta: magenta$5,
	red: red$5,
	black: black$5,
	transparent: transparent$5,
	solid: solid$5,
	captionsStylePopOn: captionsStylePopOn$5,
	captionsStyleRollUp: captionsStyleRollUp$5,
	prefCaptionsPosition: prefCaptionsPosition$5,
	captionsPositionOverlay: captionsPositionOverlay$5,
	captionsPositionBelow: captionsPositionBelow$5,
	sampleCaptionText: sampleCaptionText$5,
	prefSuccess: prefSuccess$5,
	prefNoChange: prefNoChange$5,
	save: save$5,
	cancel: cancel$5,
	dismissButton: dismissButton$5,
	windowButtonLabel: windowButtonLabel$5,
	windowMove: windowMove$5,
	windowMoveLeft: windowMoveLeft$5,
	windowMoveRight: windowMoveRight$5,
	windowMoveUp: windowMoveUp$5,
	windowMoveDown: windowMoveDown$5,
	windowMoveStopped: windowMoveStopped$5,
	transcriptControls: transcriptControls$5,
	signControls: signControls$5,
	windowMoveAlert: windowMoveAlert$5,
	windowResize: windowResize$5,
	windowResizeHeading: windowResizeHeading$5,
	closeButtonLabel: closeButtonLabel$5,
	width: width$5,
	height: height$5,
	resultsSummary1: resultsSummary1$5,
	resultsSummary2: resultsSummary2$5,
	resultsSummary3: resultsSummary3$5,
	noResultsFound: noResultsFound$5,
	searchButtonLabel: searchButtonLabel$5,
	hour: hour$5,
	minute: minute$5,
	second: second$5,
	hours: hours$5,
	minutes: minutes$5,
	seconds: seconds$5,
	vtsHeading: vtsHeading$5,
	vtsInstructions1: vtsInstructions1$5,
	vtsInstructions2: vtsInstructions2$5,
	vtsInstructions3: vtsInstructions3$5,
	vtsInstructions4: vtsInstructions4$5,
	vtsInstructions5: vtsInstructions5$5,
	vtsSelectLanguage: vtsSelectLanguage$5,
	vtsSave: vtsSave$5,
	vtsReturn: vtsReturn$5,
	vtsCancel: vtsCancel$5,
	vtsRow: vtsRow$5,
	vtsKind: vtsKind$5,
	vtsStart: vtsStart$5,
	vtsEnd: vtsEnd$5,
	vtsContent: vtsContent$5,
	vtsActions: vtsActions$5,
	vtsNewRow: vtsNewRow$5,
	vtsDeletedRow: vtsDeletedRow$5,
	vtsMovedRow: vtsMovedRow$5
};

var playerHeading$4 = "Leitor multimédia";
var audioPlayer$4 = "Audio player";
var videoPlayer$4 = "Video player";
var faster$4 = "Mais rápido";
var slower$4 = "Mais lento";
var play$4 = "Reproduzir";
var pause$4 = "Pausa";
var restart$4 = "Reiniciar";
var prevTrack$4 = "Faixa anterior";
var nextTrack$4 = "Faixa seguinte";
var rewind$4 = "Retroceder";
var forward$4 = "Avançar";
var captions$4 = "Legendas";
var showCaptions$4 = "Mostrar legendas";
var hideCaptions$4 = "Esconder legendas";
var captionsOff$4 = "Desativar legendas";
var showTranscript$4 = "Mostrar transcrição";
var hideTranscript$4 = "Esconder transcrição";
var turnOnDescriptions$4 = "Ativar descrições";
var turnOffDescriptions$4 = "Desativar descrições";
var chapters$4 = "Capítulos";
var language$4 = "Idioma";
var sign$4 = "Linguagem gestual";
var showSign$4 = "Mostrar linguagem gestual";
var hideSign$4 = "Esconder linguagem gestual";
var seekbarLabel$4 = "linha temporal";
var mute$4 = "Desativar som";
var unmute$4 = "Ativar som";
var volume$4 = "Volume";
var volumeUpDown$4 = "Volume up down";
var preferences$4 = "Preferências";
var enterFullScreen$4 = "Ativar a vista de ecrã inteiro";
var exitFullScreen$4 = "Sair da vista de ecrã inteiro";
var speed$4 = "Velocidade";
var spacebar$4 = "barra de espaço";
var transcriptTitle$4 = "Transcrição";
var lyricsTitle$4 = "Letra";
var autoScroll$4 = "Scroll automático";
var statusPlaying$4 = "A reproduzir";
var statusPaused$4 = "Pausado";
var statusStopped$4 = "Parado";
var statusBuffering$4 = "A carregar";
var statusEnd$4 = "Fim da faixa";
var selectedTrack$4 = "Faixa selecionada";
var alertDescribedVersion$4 = "A usar versão de áudio descrita deste vídeo";
var alertNonDescribedVersion$4 = "A usar versão não descrita deste vídeo";
var prefMenuCaptions$4 = "Legendas";
var prefVoicedCaptions$4 = "Spoken Captions";
var prefMenuDescriptions$4 = "Descrições";
var prefMenuKeyboard$4 = "Teclado";
var prefMenuTranscript$4 = "Transcrição";
var prefTitleCaptions$4 = "Preferências das Legendas";
var prefTitleDescriptions$4 = "Preferências da Descrição de Aúdio";
var prefTitleKeyboard$4 = "Preferências de Peclado";
var prefTitleTranscript$4 = "Preferências de Transcrição";
var prefIntroDescription1$4 = "Este leitor multimédia suporta descrição de áudio de duas formas: ";
var prefDescription1$4 = "O vídeo atual tem uma versão descrita alternativa, descrição à base de texto.";
var prefDescription2$4 = "O vídeo atual tem versão descrita alernativa do vídeo.";
var prefDescription3$4 = "O vídeo atual tem descrição à base de texto, anunciada pelo leitor de ecrãs.";
var prefIntroDescriptionNone$4 = "O vídeo atual não tem descrição de áudio em nenhum formato.";
var prefIntroDescription3$4 = "Utiliza o seguinte formulário para definir as tuas preferências relacionadas com descrição de áudio à base de texto.";
var prefIntroDescription4$4 = "Depois de guardar as tuas definições, descrição de áudio pode ser alternada on/off usando o botão Descrição.";
var prefIntroKeyboard1$4 = "O leitor multimédia nesta página pode ser operado de qualquer lugar na página utilizando os atalhos de teclado (vê em baixo a lista).";
var prefIntroKeyboard2$4 = "Teclas modificadoras (Shift, Alt, and Control) podem ser atribuídas em baixo.";
var prefIntroKeyboard3$4 = "NOTA: Algumas combinações de teclas podem entrar em conflito com teclas usadas pelo teu navegador e/ou outras aplicações de software. Tenta várias combinações de teclas modificadoras para encontrar uma que funciona para ti.";
var prefHeadingKeyboard1$4 = "Teclas modificadoras usadas para atalhos";
var prefHeadingKeyboard2$4 = "Atalhos de teclado em uso";
var prefHeadingDescription$4 = "Descrição de áudio";
var prefHeadingTextDescription$4 = "Descrição de áudio à base de texto";
var prefAltKey$4 = "Alt";
var prefCtrlKey$4 = "Control";
var prefShiftKey$4 = "Shift";
var prefNoKeyShortcuts$4 = "Disable keyboard shortcuts";
var escapeKey$4 = "Escape";
var escapeKeyFunction$4 = "Fecha o diálogo ou menu popup";
var prefDescPause$4 = "Pausar vídeo automaticamente quando a descrição começa";
var prefDescVisible$4 = "Torna a descrição visível";
var prefDescVoice$4 = "Voz";
var prefDescRate$4 = "Spoken Description Rate";
var prefCaptionRate$4 = "Spoken Caption Rate";
var prefDescPitch$4 = "Tom";
var prefDescPitch1$4 = "Muito baixo";
var prefDescPitch2$4 = "Baixo";
var prefDescPitch3$4 = "Padrão";
var prefDescPitch4$4 = "Alto";
var prefDescPitch5$4 = "Muito Alto";
var sampleDescriptionText$4 = "Ajusta as preferências para ouvir esta amostra de texto.";
var prefHighlight$4 = "Destacar transcrição enquanto o leito está a reproduzir.";
var prefTabbable$4 = "Transcrição ativada por teclado";
var prefCaptionsFont$4 = "Tipo de letra";
var prefCaptionsColor$4 = "Cor de texto";
var prefCaptionsBGColor$4 = "Fundo";
var prefCaptionsSize$4 = "Tamanho de letra";
var prefCaptionsOpacity$4 = "Opacidade";
var prefCaptionsStyle$4 = "Estilo";
var serif$4 = "serifada";
var sans$4 = "sem serifa";
var cursive$4 = "cursivo";
var fantasy$4 = "fantasia";
var monospace$4 = "mono-espaçada";
var white$4 = "branco";
var yellow$4 = "amarelo";
var green$4 = "verde";
var cyan$4 = "ciano";
var blue$4 = "azul";
var magenta$4 = "magenta";
var red$4 = "vermelho";
var black$4 = "preto";
var transparent$4 = "transparente";
var solid$4 = "sólido";
var captionsStylePopOn$4 = "Pop-on";
var captionsStyleRollUp$4 = "Roll-up";
var prefCaptionsPosition$4 = "Posição";
var captionsPositionOverlay$4 = "Sobreposição";
var captionsPositionBelow$4 = "Por baixo do vídeo";
var sampleCaptionText$4 = "Amostra texto de legenda";
var prefSuccess$4 = "As tuas alterações foram guardadas.";
var prefNoChange$4 = "Não fizeste nenhuma alteração.";
var save$4 = "Guardar";
var cancel$4 = "Cancelar";
var dismissButton$4 = "Dismiss";
var windowButtonLabel$4 = "Opções de janela";
var windowMove$4 = "Mover";
var windowMoveLeft$4 = "Window moved left";
var windowMoveRight$4 = "Window moved right";
var windowMoveUp$4 = "Window moved up";
var windowMoveDown$4 = "Window moved down";
var windowMoveStopped$4 = "Window move stopped";
var transcriptControls$4 = "Transcript Window Controls";
var signControls$4 = "Sign Language Window Controls";
var windowMoveAlert$4 = "Arrasta ou usa as teclas de seta para mover a janela; Enter para parar.";
var windowResize$4 = "Redimencionar";
var windowResizeHeading$4 = "Redimencionar janela";
var closeButtonLabel$4 = "Fechar";
var width$4 = "Largura";
var height$4 = "Altura";
var resultsSummary1$4 = "Pesquisaste por:";
var resultsSummary2$4 = "Encontrado %1 itens correspondentes.";
var resultsSummary3$4 = "Clica no tempo associado a qualquer item para reproduzir o vídeo a partir daquele ponto.";
var noResultsFound$4 = "Nenhum resultado encontrado.";
var searchButtonLabel$4 = "Reproduzir a partir de %1";
var hour$4 = "hora";
var minute$4 = "minuto";
var second$4 = "segundo";
var hours$4 = "horas";
var minutes$4 = "minutos";
var seconds$4 = "segundos";
var vtsHeading$4 = "Video Transcript Sorter";
var vtsInstructions1$4 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$4 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$4 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$4 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$4 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$4 = "Select a language";
var vtsSave$4 = "Generate new .vtt content";
var vtsReturn$4 = "Return to Editor";
var vtsCancel$4 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$4 = "Row";
var vtsKind$4 = "Kind";
var vtsStart$4 = "Start";
var vtsEnd$4 = "End";
var vtsContent$4 = "Content";
var vtsActions$4 = "Actions";
var vtsNewRow$4 = "A new row %1 has been inserted.";
var vtsDeletedRow$4 = "Row %1 has been deleted.";
var vtsMovedRow$4 = "Row %1 has been moved %2 and is now Row %3.";
var pt = {
	playerHeading: playerHeading$4,
	audioPlayer: audioPlayer$4,
	videoPlayer: videoPlayer$4,
	faster: faster$4,
	slower: slower$4,
	play: play$4,
	pause: pause$4,
	restart: restart$4,
	prevTrack: prevTrack$4,
	nextTrack: nextTrack$4,
	rewind: rewind$4,
	forward: forward$4,
	captions: captions$4,
	showCaptions: showCaptions$4,
	hideCaptions: hideCaptions$4,
	captionsOff: captionsOff$4,
	showTranscript: showTranscript$4,
	hideTranscript: hideTranscript$4,
	turnOnDescriptions: turnOnDescriptions$4,
	turnOffDescriptions: turnOffDescriptions$4,
	chapters: chapters$4,
	language: language$4,
	sign: sign$4,
	showSign: showSign$4,
	hideSign: hideSign$4,
	seekbarLabel: seekbarLabel$4,
	mute: mute$4,
	unmute: unmute$4,
	volume: volume$4,
	volumeUpDown: volumeUpDown$4,
	preferences: preferences$4,
	enterFullScreen: enterFullScreen$4,
	exitFullScreen: exitFullScreen$4,
	speed: speed$4,
	spacebar: spacebar$4,
	transcriptTitle: transcriptTitle$4,
	lyricsTitle: lyricsTitle$4,
	autoScroll: autoScroll$4,
	statusPlaying: statusPlaying$4,
	statusPaused: statusPaused$4,
	statusStopped: statusStopped$4,
	statusBuffering: statusBuffering$4,
	statusEnd: statusEnd$4,
	selectedTrack: selectedTrack$4,
	alertDescribedVersion: alertDescribedVersion$4,
	alertNonDescribedVersion: alertNonDescribedVersion$4,
	prefMenuCaptions: prefMenuCaptions$4,
	prefVoicedCaptions: prefVoicedCaptions$4,
	prefMenuDescriptions: prefMenuDescriptions$4,
	prefMenuKeyboard: prefMenuKeyboard$4,
	prefMenuTranscript: prefMenuTranscript$4,
	prefTitleCaptions: prefTitleCaptions$4,
	prefTitleDescriptions: prefTitleDescriptions$4,
	prefTitleKeyboard: prefTitleKeyboard$4,
	prefTitleTranscript: prefTitleTranscript$4,
	prefIntroDescription1: prefIntroDescription1$4,
	prefDescription1: prefDescription1$4,
	prefDescription2: prefDescription2$4,
	prefDescription3: prefDescription3$4,
	prefIntroDescriptionNone: prefIntroDescriptionNone$4,
	prefIntroDescription3: prefIntroDescription3$4,
	prefIntroDescription4: prefIntroDescription4$4,
	prefIntroKeyboard1: prefIntroKeyboard1$4,
	prefIntroKeyboard2: prefIntroKeyboard2$4,
	prefIntroKeyboard3: prefIntroKeyboard3$4,
	prefHeadingKeyboard1: prefHeadingKeyboard1$4,
	prefHeadingKeyboard2: prefHeadingKeyboard2$4,
	prefHeadingDescription: prefHeadingDescription$4,
	prefHeadingTextDescription: prefHeadingTextDescription$4,
	prefAltKey: prefAltKey$4,
	prefCtrlKey: prefCtrlKey$4,
	prefShiftKey: prefShiftKey$4,
	prefNoKeyShortcuts: prefNoKeyShortcuts$4,
	escapeKey: escapeKey$4,
	escapeKeyFunction: escapeKeyFunction$4,
	prefDescPause: prefDescPause$4,
	prefDescVisible: prefDescVisible$4,
	prefDescVoice: prefDescVoice$4,
	prefDescRate: prefDescRate$4,
	prefCaptionRate: prefCaptionRate$4,
	prefDescPitch: prefDescPitch$4,
	prefDescPitch1: prefDescPitch1$4,
	prefDescPitch2: prefDescPitch2$4,
	prefDescPitch3: prefDescPitch3$4,
	prefDescPitch4: prefDescPitch4$4,
	prefDescPitch5: prefDescPitch5$4,
	sampleDescriptionText: sampleDescriptionText$4,
	prefHighlight: prefHighlight$4,
	prefTabbable: prefTabbable$4,
	prefCaptionsFont: prefCaptionsFont$4,
	prefCaptionsColor: prefCaptionsColor$4,
	prefCaptionsBGColor: prefCaptionsBGColor$4,
	prefCaptionsSize: prefCaptionsSize$4,
	prefCaptionsOpacity: prefCaptionsOpacity$4,
	prefCaptionsStyle: prefCaptionsStyle$4,
	serif: serif$4,
	sans: sans$4,
	cursive: cursive$4,
	fantasy: fantasy$4,
	monospace: monospace$4,
	white: white$4,
	yellow: yellow$4,
	green: green$4,
	cyan: cyan$4,
	blue: blue$4,
	magenta: magenta$4,
	red: red$4,
	black: black$4,
	transparent: transparent$4,
	solid: solid$4,
	captionsStylePopOn: captionsStylePopOn$4,
	captionsStyleRollUp: captionsStyleRollUp$4,
	prefCaptionsPosition: prefCaptionsPosition$4,
	captionsPositionOverlay: captionsPositionOverlay$4,
	captionsPositionBelow: captionsPositionBelow$4,
	sampleCaptionText: sampleCaptionText$4,
	prefSuccess: prefSuccess$4,
	prefNoChange: prefNoChange$4,
	save: save$4,
	cancel: cancel$4,
	dismissButton: dismissButton$4,
	windowButtonLabel: windowButtonLabel$4,
	windowMove: windowMove$4,
	windowMoveLeft: windowMoveLeft$4,
	windowMoveRight: windowMoveRight$4,
	windowMoveUp: windowMoveUp$4,
	windowMoveDown: windowMoveDown$4,
	windowMoveStopped: windowMoveStopped$4,
	transcriptControls: transcriptControls$4,
	signControls: signControls$4,
	windowMoveAlert: windowMoveAlert$4,
	windowResize: windowResize$4,
	windowResizeHeading: windowResizeHeading$4,
	closeButtonLabel: closeButtonLabel$4,
	width: width$4,
	height: height$4,
	resultsSummary1: resultsSummary1$4,
	resultsSummary2: resultsSummary2$4,
	resultsSummary3: resultsSummary3$4,
	noResultsFound: noResultsFound$4,
	searchButtonLabel: searchButtonLabel$4,
	hour: hour$4,
	minute: minute$4,
	second: second$4,
	hours: hours$4,
	minutes: minutes$4,
	seconds: seconds$4,
	vtsHeading: vtsHeading$4,
	vtsInstructions1: vtsInstructions1$4,
	vtsInstructions2: vtsInstructions2$4,
	vtsInstructions3: vtsInstructions3$4,
	vtsInstructions4: vtsInstructions4$4,
	vtsInstructions5: vtsInstructions5$4,
	vtsSelectLanguage: vtsSelectLanguage$4,
	vtsSave: vtsSave$4,
	vtsReturn: vtsReturn$4,
	vtsCancel: vtsCancel$4,
	vtsRow: vtsRow$4,
	vtsKind: vtsKind$4,
	vtsStart: vtsStart$4,
	vtsEnd: vtsEnd$4,
	vtsContent: vtsContent$4,
	vtsActions: vtsActions$4,
	vtsNewRow: vtsNewRow$4,
	vtsDeletedRow: vtsDeletedRow$4,
	vtsMovedRow: vtsMovedRow$4
};

var __author__ = "Slovak translation by Radoslav Ďurač (@rraddatch)";
var playerHeading$3 = "Prehrávač médií";
var audioPlayer$3 = "Prehrávač zvuku";
var videoPlayer$3 = "Prehrávač videa";
var faster$3 = "Rýchlejšie";
var slower$3 = "Pomalšie";
var play$3 = "Prehrať";
var pause$3 = "Pozastaviť";
var restart$3 = "Prehrať odznova";
var prevTrack$3 = "Predchádzajúca stopa";
var nextTrack$3 = "Nasledujúca stopa";
var rewind$3 = "Pretočiť dozadu";
var forward$3 = "Pretočiť dopredu";
var captions$3 = "Skryté titulky";
var showCaptions$3 = "Zobraziť skryté titulky";
var hideCaptions$3 = "Vypnúť skryté titulky";
var captionsOff$3 = "Vypnúť skryté titulky";
var showTranscript$3 = "Zobraziť prepis";
var hideTranscript$3 = "Skryť prepis";
var turnOnDescriptions$3 = "Zapnúť audiokomentár";
var turnOffDescriptions$3 = "Vypnúť audiokomentár";
var chapters$3 = "Kapitoly";
var language$3 = "Jazyk";
var sign$3 = "Posunkový jazyk";
var showSign$3 = "Zobraziť posunkový jazyk";
var hideSign$3 = "Skryť posunkový jazyk";
var seekbarLabel$3 = "časová os";
var mute$3 = "Stlmiť";
var unmute$3 = "Zrušiť stlmenie";
var volume$3 = "Hlasitosť";
var volumeUpDown$3 = "Hlasitosť hore dole";
var preferences$3 = "Nastavenia";
var enterFullScreen$3 = "Prejsť na celú obrazovku";
var exitFullScreen$3 = "Ukončiť celú obrazovku";
var speed$3 = "Rýchlosť";
var spacebar$3 = "medzerník";
var transcriptTitle$3 = "Prepis";
var lyricsTitle$3 = "Text piesne";
var autoScroll$3 = "Automatické posúvanie";
var statusPlaying$3 = "Prehráva sa";
var statusPaused$3 = "Pozastavené";
var statusStopped$3 = "Zastavené";
var statusBuffering$3 = "Načítava sa";
var statusEnd$3 = "Koniec stopy";
var selectedTrack$3 = "Vybraná stopa";
var alertDescribedVersion$3 = "Používa sa verzia videa s audiokomentárom";
var alertNonDescribedVersion$3 = "Používa sa verzia videa bez audiokomentára";
var prefMenuCaptions$3 = "Skryté titulky";
var prefVoicedCaptions$3 = "Hovorené skryté titulky";
var prefMenuDescriptions$3 = "Audiokomentár";
var prefMenuKeyboard$3 = "Klávesnica";
var prefMenuTranscript$3 = "Prepis";
var prefTitleCaptions$3 = "Nastavenia skrytých titulkov";
var prefTitleDescriptions$3 = "Nastavenia audiokomentára";
var prefTitleKeyboard$3 = "Nastavenia klávesnice";
var prefTitleTranscript$3 = "Nastavenia prepisu";
var prefIntroDescription1$3 = "Tento prehrávač médií podporuje audiokomentár dvoma spôsobmi: ";
var prefDescription1$3 = "Aktuálne video má alternatívnu verziu s audiokomentárom a textový audiokomentár oznamovaný čítačkou obrazovky.";
var prefDescription2$3 = "Aktuálne video má textový audiokomentár.";
var prefDescription3$3 = "Aktuálne video má alternatívnu verziu s audiokomentárom.";
var prefIntroDescriptionNone$3 = "Aktuálne video nemá audiokomentár v žiadnom formáte.";
var prefIntroDescription3$3 = "Pomocou nasledujúceho formulára nastavte svoje predvoľby týkajúce sa textového audiokomentára.";
var prefIntroDescription4$3 = "Po uložení nastavení je možné audiokomentár zapnúť/vypnúť pomocou príslušného tlačidla.";
var prefIntroKeyboard1$3 = "Prehrávač médií na tejto webovej stránke možno ovládať odkiaľkoľvek na stránke pomocou klávesových skratiek (zoznam nájdete nižšie).";
var prefIntroKeyboard2$3 = "Modifikačné klávesy (Shift, Alt a Control) je možné priradiť nižšie.";
var prefIntroKeyboard3$3 = "POZNÁMKA: Niektoré kombinácie klávesov môžu byť v konflikte s klávesmi používanými vaším prehliadačom a/alebo inými softvérovými aplikáciami. Vyskúšajte rôzne kombinácie modifikačných klávesov, aby ste našli tú, ktorá vám vyhovuje.";
var prefHeadingKeyboard1$3 = "Modifikačné klávesy používané pre skratky";
var prefHeadingKeyboard2$3 = "Aktuálne klávesové skratky";
var prefHeadingDescription$3 = "Audiokomentár";
var prefHeadingTextDescription$3 = "Textový audiokomentár";
var prefAltKey$3 = "Alt";
var prefCtrlKey$3 = "Control";
var prefShiftKey$3 = "Shift";
var prefNoKeyShortcuts$3 = "Zakázať klávesové skratky";
var escapeKey$3 = "Escape";
var escapeKeyFunction$3 = "Zatvoriť aktuálny dialóg alebo vyskakovacie menu";
var prefDescPause$3 = "Automaticky pozastaviť video, keď sa spustí audiokomentár";
var prefDescVisible$3 = "Zobraziť audiokomentár";
var prefDescVoice$3 = "Hlas";
var prefDescRate$3 = "Rýchlosť hovoreného audiokomentára";
var prefCaptionRate$3 = "Rýchlosť hovorených skrytých titulkov";
var prefDescPitch$3 = "Výška tónu";
var prefDescPitch1$3 = "Veľmi nízka";
var prefDescPitch2$3 = "Nízka";
var prefDescPitch3$3 = "Predvolená";
var prefDescPitch4$3 = "Vysoká";
var prefDescPitch5$3 = "Veľmi vysoká";
var sampleDescriptionText$3 = "Upravte nastavenia, aby ste počuli tento vzorový text.";
var prefHighlight$3 = "Zvýrazniť prepis počas prehrávania médií";
var prefTabbable$3 = "Povoliť ovládanie prepisu klávesnicou";
var prefCaptionsFont$3 = "Písmo";
var prefCaptionsColor$3 = "Farba textu";
var prefCaptionsBGColor$3 = "Pozadie";
var prefCaptionsSize$3 = "Veľkosť písma";
var prefCaptionsOpacity$3 = "Nepriehľadnosť";
var prefCaptionsStyle$3 = "Štýl";
var serif$3 = "pätkové (serif)";
var sans$3 = "bezpätkové (sans-serif)";
var cursive$3 = "kurzíva";
var fantasy$3 = "ozdobné";
var monospace$3 = "stála šírka (monospace)";
var white$3 = "biela";
var yellow$3 = "žltá";
var green$3 = "zelená";
var cyan$3 = "azúrová";
var blue$3 = "modrá";
var magenta$3 = "fialová";
var red$3 = "červená";
var black$3 = "čierna";
var transparent$3 = "priehľadné";
var solid$3 = "nepriehľadné";
var captionsStylePopOn$3 = "Pop-on";
var captionsStyleRollUp$3 = "Roll-up";
var prefCaptionsPosition$3 = "Pozícia";
var captionsPositionOverlay$3 = "Prekrytie";
var captionsPositionBelow$3 = "Pod videom";
var sampleCaptionText$3 = "Vzorový text skrytých titulkov";
var prefSuccess$3 = "Vaše zmeny boli uložené.";
var prefNoChange$3 = "Neurobili ste žiadne zmeny.";
var save$3 = "Uložiť";
var cancel$3 = "Zrušiť";
var dismissButton$3 = "Zatvoriť";
var windowButtonLabel$3 = "Možnosti okna";
var windowMove$3 = "Presunúť";
var windowMoveLeft$3 = "Okno sa presunulo doľava";
var windowMoveRight$3 = "Okno sa presunulo doprava";
var windowMoveUp$3 = "Okno sa presunulo hore";
var windowMoveDown$3 = "Okno sa presunulo dole";
var windowMoveStopped$3 = "Presúvanie okna zastavené";
var transcriptControls$3 = "Ovládacie prvky okna prepisu";
var signControls$3 = "Ovládacie prvky okna posunkového jazyka";
var windowMoveAlert$3 = "Potiahnite alebo použite šípky na presun okna; stlačením Enter zastavte";
var windowResize$3 = "Zmeniť veľkosť";
var windowResizeHeading$3 = "Zmeniť veľkosť okna";
var closeButtonLabel$3 = "Zatvoriť";
var width$3 = "Šírka";
var height$3 = "Výška";
var resultsSummary1$3 = "Hľadali ste:";
var resultsSummary2$3 = "Nájdených %1 zodpovedajúcich položiek.";
var resultsSummary3$3 = "Kliknutím na čas priradený k ľubovoľnej položke prehráte video od daného bodu.";
var noResultsFound$3 = "Nenašli sa žiadne výsledky.";
var searchButtonLabel$3 = "Prehrať od %1";
var hour$3 = "hodina";
var minute$3 = "minúta";
var second$3 = "sekunda";
var hours$3 = "hodiny";
var minutes$3 = "minúty";
var seconds$3 = "sekundy";
var vtsHeading$3 = "Triedič prepisu videa";
var vtsInstructions1$3 = "Použite Triedič prepisu videa na úpravu textových stôp:";
var vtsInstructions2$3 = "Zmeňte poradie kapitol, audiokomentárov, titulkov a/alebo podtitulkov tak, aby sa zobrazovali v správnom poradí v automaticky generovanom prepise Able Player.";
var vtsInstructions3$3 = "Upravte obsah alebo časy začiatku/konca (všetky sú priamo upraviteľné v tabuľke).";
var vtsInstructions4$3 = "Pridajte nový obsah, napríklad kapitoly alebo audiokomentáre.";
var vtsInstructions5$3 = "Po úprave kliknite na tlačidlo \"Uložiť zmeny\", čím vygenerujete nový obsah pre všetky príslušné časované textové súbory. Nový text možno skopírovať a vložiť do nových súborov WebVTT.";
var vtsSelectLanguage$3 = "Vyberte jazyk";
var vtsSave$3 = "Vygenerovať nový obsah .vtt";
var vtsReturn$3 = "Vrátiť sa do editora";
var vtsCancel$3 = "Ukladanie sa ruší. Všetky vykonané úpravy boli v tabuľke VTS obnovené.";
var vtsRow$3 = "Riadok";
var vtsKind$3 = "Typ";
var vtsStart$3 = "Začiatok";
var vtsEnd$3 = "Koniec";
var vtsContent$3 = "Obsah";
var vtsActions$3 = "Akcie";
var vtsNewRow$3 = "Bol vložený nový riadok %1.";
var vtsDeletedRow$3 = "Riadok %1 bol odstránený.";
var vtsMovedRow$3 = "Riadok %1 bol presunutý %2 a teraz je riadkom %3.";
var sk = {
	__author__: __author__,
	playerHeading: playerHeading$3,
	audioPlayer: audioPlayer$3,
	videoPlayer: videoPlayer$3,
	faster: faster$3,
	slower: slower$3,
	play: play$3,
	pause: pause$3,
	restart: restart$3,
	prevTrack: prevTrack$3,
	nextTrack: nextTrack$3,
	rewind: rewind$3,
	forward: forward$3,
	captions: captions$3,
	showCaptions: showCaptions$3,
	hideCaptions: hideCaptions$3,
	captionsOff: captionsOff$3,
	showTranscript: showTranscript$3,
	hideTranscript: hideTranscript$3,
	turnOnDescriptions: turnOnDescriptions$3,
	turnOffDescriptions: turnOffDescriptions$3,
	chapters: chapters$3,
	language: language$3,
	sign: sign$3,
	showSign: showSign$3,
	hideSign: hideSign$3,
	seekbarLabel: seekbarLabel$3,
	mute: mute$3,
	unmute: unmute$3,
	volume: volume$3,
	volumeUpDown: volumeUpDown$3,
	preferences: preferences$3,
	enterFullScreen: enterFullScreen$3,
	exitFullScreen: exitFullScreen$3,
	speed: speed$3,
	spacebar: spacebar$3,
	transcriptTitle: transcriptTitle$3,
	lyricsTitle: lyricsTitle$3,
	autoScroll: autoScroll$3,
	statusPlaying: statusPlaying$3,
	statusPaused: statusPaused$3,
	statusStopped: statusStopped$3,
	statusBuffering: statusBuffering$3,
	statusEnd: statusEnd$3,
	selectedTrack: selectedTrack$3,
	alertDescribedVersion: alertDescribedVersion$3,
	alertNonDescribedVersion: alertNonDescribedVersion$3,
	prefMenuCaptions: prefMenuCaptions$3,
	prefVoicedCaptions: prefVoicedCaptions$3,
	prefMenuDescriptions: prefMenuDescriptions$3,
	prefMenuKeyboard: prefMenuKeyboard$3,
	prefMenuTranscript: prefMenuTranscript$3,
	prefTitleCaptions: prefTitleCaptions$3,
	prefTitleDescriptions: prefTitleDescriptions$3,
	prefTitleKeyboard: prefTitleKeyboard$3,
	prefTitleTranscript: prefTitleTranscript$3,
	prefIntroDescription1: prefIntroDescription1$3,
	prefDescription1: prefDescription1$3,
	prefDescription2: prefDescription2$3,
	prefDescription3: prefDescription3$3,
	prefIntroDescriptionNone: prefIntroDescriptionNone$3,
	prefIntroDescription3: prefIntroDescription3$3,
	prefIntroDescription4: prefIntroDescription4$3,
	prefIntroKeyboard1: prefIntroKeyboard1$3,
	prefIntroKeyboard2: prefIntroKeyboard2$3,
	prefIntroKeyboard3: prefIntroKeyboard3$3,
	prefHeadingKeyboard1: prefHeadingKeyboard1$3,
	prefHeadingKeyboard2: prefHeadingKeyboard2$3,
	prefHeadingDescription: prefHeadingDescription$3,
	prefHeadingTextDescription: prefHeadingTextDescription$3,
	prefAltKey: prefAltKey$3,
	prefCtrlKey: prefCtrlKey$3,
	prefShiftKey: prefShiftKey$3,
	prefNoKeyShortcuts: prefNoKeyShortcuts$3,
	escapeKey: escapeKey$3,
	escapeKeyFunction: escapeKeyFunction$3,
	prefDescPause: prefDescPause$3,
	prefDescVisible: prefDescVisible$3,
	prefDescVoice: prefDescVoice$3,
	prefDescRate: prefDescRate$3,
	prefCaptionRate: prefCaptionRate$3,
	prefDescPitch: prefDescPitch$3,
	prefDescPitch1: prefDescPitch1$3,
	prefDescPitch2: prefDescPitch2$3,
	prefDescPitch3: prefDescPitch3$3,
	prefDescPitch4: prefDescPitch4$3,
	prefDescPitch5: prefDescPitch5$3,
	sampleDescriptionText: sampleDescriptionText$3,
	prefHighlight: prefHighlight$3,
	prefTabbable: prefTabbable$3,
	prefCaptionsFont: prefCaptionsFont$3,
	prefCaptionsColor: prefCaptionsColor$3,
	prefCaptionsBGColor: prefCaptionsBGColor$3,
	prefCaptionsSize: prefCaptionsSize$3,
	prefCaptionsOpacity: prefCaptionsOpacity$3,
	prefCaptionsStyle: prefCaptionsStyle$3,
	serif: serif$3,
	sans: sans$3,
	cursive: cursive$3,
	fantasy: fantasy$3,
	monospace: monospace$3,
	white: white$3,
	yellow: yellow$3,
	green: green$3,
	cyan: cyan$3,
	blue: blue$3,
	magenta: magenta$3,
	red: red$3,
	black: black$3,
	transparent: transparent$3,
	solid: solid$3,
	captionsStylePopOn: captionsStylePopOn$3,
	captionsStyleRollUp: captionsStyleRollUp$3,
	prefCaptionsPosition: prefCaptionsPosition$3,
	captionsPositionOverlay: captionsPositionOverlay$3,
	captionsPositionBelow: captionsPositionBelow$3,
	sampleCaptionText: sampleCaptionText$3,
	prefSuccess: prefSuccess$3,
	prefNoChange: prefNoChange$3,
	save: save$3,
	cancel: cancel$3,
	dismissButton: dismissButton$3,
	windowButtonLabel: windowButtonLabel$3,
	windowMove: windowMove$3,
	windowMoveLeft: windowMoveLeft$3,
	windowMoveRight: windowMoveRight$3,
	windowMoveUp: windowMoveUp$3,
	windowMoveDown: windowMoveDown$3,
	windowMoveStopped: windowMoveStopped$3,
	transcriptControls: transcriptControls$3,
	signControls: signControls$3,
	windowMoveAlert: windowMoveAlert$3,
	windowResize: windowResize$3,
	windowResizeHeading: windowResizeHeading$3,
	closeButtonLabel: closeButtonLabel$3,
	width: width$3,
	height: height$3,
	resultsSummary1: resultsSummary1$3,
	resultsSummary2: resultsSummary2$3,
	resultsSummary3: resultsSummary3$3,
	noResultsFound: noResultsFound$3,
	searchButtonLabel: searchButtonLabel$3,
	hour: hour$3,
	minute: minute$3,
	second: second$3,
	hours: hours$3,
	minutes: minutes$3,
	seconds: seconds$3,
	vtsHeading: vtsHeading$3,
	vtsInstructions1: vtsInstructions1$3,
	vtsInstructions2: vtsInstructions2$3,
	vtsInstructions3: vtsInstructions3$3,
	vtsInstructions4: vtsInstructions4$3,
	vtsInstructions5: vtsInstructions5$3,
	vtsSelectLanguage: vtsSelectLanguage$3,
	vtsSave: vtsSave$3,
	vtsReturn: vtsReturn$3,
	vtsCancel: vtsCancel$3,
	vtsRow: vtsRow$3,
	vtsKind: vtsKind$3,
	vtsStart: vtsStart$3,
	vtsEnd: vtsEnd$3,
	vtsContent: vtsContent$3,
	vtsActions: vtsActions$3,
	vtsNewRow: vtsNewRow$3,
	vtsDeletedRow: vtsDeletedRow$3,
	vtsMovedRow: vtsMovedRow$3
};

var playerHeading$2 = "Mediaspelare";
var audioPlayer$2 = "Audio player";
var videoPlayer$2 = "Video player";
var faster$2 = "Snabbare";
var slower$2 = "Långsammare";
var play$2 = "Spela upp";
var pause$2 = "Pausa";
var restart$2 = "Starta om";
var prevTrack$2 = "Föregående spår";
var nextTrack$2 = "Nästa spår";
var rewind$2 = "Spola tillbaka";
var forward$2 = "Spola framåt";
var captions$2 = "Undertexter";
var showCaptions$2 = "Visa undertexter";
var hideCaptions$2 = "Göm undertexter";
var captionsOff$2 = "Stäng av undertexter";
var showTranscript$2 = "Visa transkript";
var hideTranscript$2 = "Göm transkript";
var turnOnDescriptions$2 = "Sätt på syntolkning";
var turnOffDescriptions$2 = "Stäng av syntolkning";
var chapters$2 = "Kapitel";
var language$2 = "Språk";
var sign$2 = "Teckenspråk";
var showSign$2 = "Visa teckenspråk";
var hideSign$2 = "Göm teckenspråk";
var seekbarLabel$2 = "tidslinje";
var mute$2 = "Slå av ljud";
var unmute$2 = "Slå på ljud";
var volume$2 = "Volym";
var volumeUpDown$2 = "Volym up ner";
var preferences$2 = "Preferenser";
var enterFullScreen$2 = "Visa i fullskärmsläge";
var exitFullScreen$2 = "Gå ur fullskärmsläge";
var speed$2 = "Hastighet";
var spacebar$2 = "mellanslag";
var transcriptTitle$2 = "Transkript";
var lyricsTitle$2 = "Lyrik";
var autoScroll$2 = "Auto-scrolla";
var statusPlaying$2 = "Spelar upp";
var statusPaused$2 = "Pausad";
var statusStopped$2 = "Stoppad";
var statusBuffering$2 = "Buffrar";
var statusEnd$2 = "Slut på spåret";
var selectedTrack$2 = "Valt spår";
var alertDescribedVersion$2 = "Använder syntolkad version av denna video";
var alertNonDescribedVersion$2 = "Använder ej syntolkad version av denna video";
var prefMenuCaptions$2 = "Undertexter";
var prefVoicedCaptions$2 = "Spoken Captions";
var prefMenuDescriptions$2 = "Syntolkning";
var prefMenuKeyboard$2 = "Tangentbord";
var prefMenuTranscript$2 = "Transkript";
var prefTitleCaptions$2 = "Undertextprefenser";
var prefTitleDescriptions$2 = "Syntolkningspreferenser";
var prefTitleKeyboard$2 = "Tangentbordspreferenser";
var prefTitleTranscript$2 = "Transkriptpreferenser";
var prefIntroDescription1$2 = "Denna mediaspelare stöder syntolkning på två sätt: ";
var prefDescription1$2 = "Följande video har en alternativ syntolkad version, textbaserad syntolkning.";
var prefDescription2$2 = "Följande video har alternativ syntolkad version av videon.";
var prefDescription3$2 = "Följande video har textbaserad syntolkning, uppläst av skärmläsare.";
var prefIntroDescriptionNone$2 = "Nuvarande video har ingen syntolkning i något format.";
var prefIntroDescription3$2 = "Använd följande formulär för att ställa in dina prefenser gällande textbaserad syntolkning.";
var prefIntroDescription4$2 = "Efter du sparar dina prefenser, kan syntolkning växlas av och på med syntolkningsknappen.";
var prefIntroKeyboard1$2 = "Mediaspelaren på denna webbsida kan styras från varsomhelst på sidan med hjälp av tangentbordsgenvägar (se nedan för en lista).";
var prefIntroKeyboard2$2 = "Metatangenter (Shift, Alt, och Ctrl) kan tilldelas nedan.";
var prefIntroKeyboard3$2 = "NOTERA: Vissa tangentkombinationer kan vara i konflikt med din webbläsare eller andra mjukvarors inställningar. Prova olika kombinationer av metatangeter för att hitta en som fungerar för dig.";
var prefHeadingKeyboard1$2 = "Metatangenter använda till genvägar";
var prefHeadingKeyboard2$2 = "Nuvarande tangentbordsgenvägar";
var prefHeadingDescription$2 = "Syntolkning";
var prefHeadingTextDescription$2 = "Textbaserad syntolkning";
var prefAltKey$2 = "Alt";
var prefCtrlKey$2 = "Ctrl";
var prefShiftKey$2 = "Shift";
var prefNoKeyShortcuts$2 = "Disable keyboard shortcuts";
var escapeKey$2 = "Escape";
var escapeKeyFunction$2 = "Stäng nuvarande dialog eller popupmeny";
var prefDescPause$2 = "Pausa automatiskt video när syntolkning startar";
var prefDescVisible$2 = "Synliggör syntolkning";
var prefDescVoice$2 = "Röst";
var prefDescRate$2 = "Spoken Description Rate";
var prefCaptionRate$2 = "Spoken Caption Rate";
var prefDescPitch$2 = "Tonhöjd";
var prefDescPitch1$2 = "Mycket lågt";
var prefDescPitch2$2 = "Låg";
var prefDescPitch3$2 = "Normal";
var prefDescPitch4$2 = "Högt";
var prefDescPitch5$2 = "Mycket högt";
var sampleDescriptionText$2 = "Justera inställningarna för att höra denna exempeltext.";
var prefHighlight$2 = "Markera det som läses upp i transkriptet";
var prefTabbable$2 = "Tangentbordsaktiverat transkript";
var prefCaptionsFont$2 = "Typsnitt";
var prefCaptionsColor$2 = "Textfärg";
var prefCaptionsBGColor$2 = "Bakgrund";
var prefCaptionsSize$2 = "Textstorlek";
var prefCaptionsOpacity$2 = "Ogenomskinlighet";
var prefCaptionsStyle$2 = "Stil";
var serif$2 = "serif";
var sans$2 = "sans-serif";
var cursive$2 = "kursiv";
var fantasy$2 = "fantasi";
var monospace$2 = "monospace";
var white$2 = "vit";
var yellow$2 = "gul";
var green$2 = "grön";
var cyan$2 = "ljusblå";
var blue$2 = "blå";
var magenta$2 = "lila";
var red$2 = "röd";
var black$2 = "svart";
var transparent$2 = "genomskinligt";
var solid$2 = "massiv";
var captionsStylePopOn$2 = "Dyker upp";
var captionsStyleRollUp$2 = "Rullar upp";
var prefCaptionsPosition$2 = "Position";
var captionsPositionOverlay$2 = "Täck över videon";
var captionsPositionBelow$2 = "Under videon";
var sampleCaptionText$2 = "Exempel på undertext";
var prefSuccess$2 = "Dina ändringar har blivit sparade.";
var prefNoChange$2 = "Du gjorde inga ändringar.";
var save$2 = "Spara";
var cancel$2 = "Avbryt";
var dismissButton$2 = "Dismiss";
var windowButtonLabel$2 = "Fönsteralternativ";
var windowMove$2 = "Flytta";
var windowMoveLeft$2 = "Window moved left";
var windowMoveRight$2 = "Window moved right";
var windowMoveUp$2 = "Window moved up";
var windowMoveDown$2 = "Window moved down";
var windowMoveStopped$2 = "Window move stopped";
var transcriptControls$2 = "Transcript Window Controls";
var signControls$2 = "Sign Language Window Controls";
var windowMoveAlert$2 = "Drag eller använd piltangenter för att flytta fönstret; Enter för att sluta";
var windowResize$2 = "Ändra storlek";
var windowResizeHeading$2 = "Ändra fönsterstorlek";
var closeButtonLabel$2 = "Stäng";
var width$2 = "Bredd";
var height$2 = "Höjd";
var resultsSummary1$2 = "Du sökte efter:";
var resultsSummary2$2 = "Hittade %1 träffar.";
var resultsSummary3$2 = "Klicka på tiden för en punkt för att spela video från den tiden.";
var noResultsFound$2 = "Inga träffar hittade.";
var searchButtonLabel$2 = "Spela från %1";
var hour$2 = "timme";
var minute$2 = "minut";
var second$2 = "sekund";
var hours$2 = "timmar";
var minutes$2 = "minuter";
var seconds$2 = "sekunder";
var vtsHeading$2 = "Video Transcript Sorter";
var vtsInstructions1$2 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$2 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$2 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$2 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$2 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$2 = "Select a language";
var vtsSave$2 = "Generate new .vtt content";
var vtsReturn$2 = "Return to Editor";
var vtsCancel$2 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$2 = "Row";
var vtsKind$2 = "Kind";
var vtsStart$2 = "Start";
var vtsEnd$2 = "End";
var vtsContent$2 = "Content";
var vtsActions$2 = "Actions";
var vtsNewRow$2 = "A new row %1 has been inserted.";
var vtsDeletedRow$2 = "Row %1 has been deleted.";
var vtsMovedRow$2 = "Row %1 has been moved %2 and is now Row %3.";
var sv = {
	playerHeading: playerHeading$2,
	audioPlayer: audioPlayer$2,
	videoPlayer: videoPlayer$2,
	faster: faster$2,
	slower: slower$2,
	play: play$2,
	pause: pause$2,
	restart: restart$2,
	prevTrack: prevTrack$2,
	nextTrack: nextTrack$2,
	rewind: rewind$2,
	forward: forward$2,
	captions: captions$2,
	showCaptions: showCaptions$2,
	hideCaptions: hideCaptions$2,
	captionsOff: captionsOff$2,
	showTranscript: showTranscript$2,
	hideTranscript: hideTranscript$2,
	turnOnDescriptions: turnOnDescriptions$2,
	turnOffDescriptions: turnOffDescriptions$2,
	chapters: chapters$2,
	language: language$2,
	sign: sign$2,
	showSign: showSign$2,
	hideSign: hideSign$2,
	seekbarLabel: seekbarLabel$2,
	mute: mute$2,
	unmute: unmute$2,
	volume: volume$2,
	volumeUpDown: volumeUpDown$2,
	preferences: preferences$2,
	enterFullScreen: enterFullScreen$2,
	exitFullScreen: exitFullScreen$2,
	speed: speed$2,
	spacebar: spacebar$2,
	transcriptTitle: transcriptTitle$2,
	lyricsTitle: lyricsTitle$2,
	autoScroll: autoScroll$2,
	statusPlaying: statusPlaying$2,
	statusPaused: statusPaused$2,
	statusStopped: statusStopped$2,
	statusBuffering: statusBuffering$2,
	statusEnd: statusEnd$2,
	selectedTrack: selectedTrack$2,
	alertDescribedVersion: alertDescribedVersion$2,
	alertNonDescribedVersion: alertNonDescribedVersion$2,
	prefMenuCaptions: prefMenuCaptions$2,
	prefVoicedCaptions: prefVoicedCaptions$2,
	prefMenuDescriptions: prefMenuDescriptions$2,
	prefMenuKeyboard: prefMenuKeyboard$2,
	prefMenuTranscript: prefMenuTranscript$2,
	prefTitleCaptions: prefTitleCaptions$2,
	prefTitleDescriptions: prefTitleDescriptions$2,
	prefTitleKeyboard: prefTitleKeyboard$2,
	prefTitleTranscript: prefTitleTranscript$2,
	prefIntroDescription1: prefIntroDescription1$2,
	prefDescription1: prefDescription1$2,
	prefDescription2: prefDescription2$2,
	prefDescription3: prefDescription3$2,
	prefIntroDescriptionNone: prefIntroDescriptionNone$2,
	prefIntroDescription3: prefIntroDescription3$2,
	prefIntroDescription4: prefIntroDescription4$2,
	prefIntroKeyboard1: prefIntroKeyboard1$2,
	prefIntroKeyboard2: prefIntroKeyboard2$2,
	prefIntroKeyboard3: prefIntroKeyboard3$2,
	prefHeadingKeyboard1: prefHeadingKeyboard1$2,
	prefHeadingKeyboard2: prefHeadingKeyboard2$2,
	prefHeadingDescription: prefHeadingDescription$2,
	prefHeadingTextDescription: prefHeadingTextDescription$2,
	prefAltKey: prefAltKey$2,
	prefCtrlKey: prefCtrlKey$2,
	prefShiftKey: prefShiftKey$2,
	prefNoKeyShortcuts: prefNoKeyShortcuts$2,
	escapeKey: escapeKey$2,
	escapeKeyFunction: escapeKeyFunction$2,
	prefDescPause: prefDescPause$2,
	prefDescVisible: prefDescVisible$2,
	prefDescVoice: prefDescVoice$2,
	prefDescRate: prefDescRate$2,
	prefCaptionRate: prefCaptionRate$2,
	prefDescPitch: prefDescPitch$2,
	prefDescPitch1: prefDescPitch1$2,
	prefDescPitch2: prefDescPitch2$2,
	prefDescPitch3: prefDescPitch3$2,
	prefDescPitch4: prefDescPitch4$2,
	prefDescPitch5: prefDescPitch5$2,
	sampleDescriptionText: sampleDescriptionText$2,
	prefHighlight: prefHighlight$2,
	prefTabbable: prefTabbable$2,
	prefCaptionsFont: prefCaptionsFont$2,
	prefCaptionsColor: prefCaptionsColor$2,
	prefCaptionsBGColor: prefCaptionsBGColor$2,
	prefCaptionsSize: prefCaptionsSize$2,
	prefCaptionsOpacity: prefCaptionsOpacity$2,
	prefCaptionsStyle: prefCaptionsStyle$2,
	serif: serif$2,
	sans: sans$2,
	cursive: cursive$2,
	fantasy: fantasy$2,
	monospace: monospace$2,
	white: white$2,
	yellow: yellow$2,
	green: green$2,
	cyan: cyan$2,
	blue: blue$2,
	magenta: magenta$2,
	red: red$2,
	black: black$2,
	transparent: transparent$2,
	solid: solid$2,
	captionsStylePopOn: captionsStylePopOn$2,
	captionsStyleRollUp: captionsStyleRollUp$2,
	prefCaptionsPosition: prefCaptionsPosition$2,
	captionsPositionOverlay: captionsPositionOverlay$2,
	captionsPositionBelow: captionsPositionBelow$2,
	sampleCaptionText: sampleCaptionText$2,
	prefSuccess: prefSuccess$2,
	prefNoChange: prefNoChange$2,
	save: save$2,
	cancel: cancel$2,
	dismissButton: dismissButton$2,
	windowButtonLabel: windowButtonLabel$2,
	windowMove: windowMove$2,
	windowMoveLeft: windowMoveLeft$2,
	windowMoveRight: windowMoveRight$2,
	windowMoveUp: windowMoveUp$2,
	windowMoveDown: windowMoveDown$2,
	windowMoveStopped: windowMoveStopped$2,
	transcriptControls: transcriptControls$2,
	signControls: signControls$2,
	windowMoveAlert: windowMoveAlert$2,
	windowResize: windowResize$2,
	windowResizeHeading: windowResizeHeading$2,
	closeButtonLabel: closeButtonLabel$2,
	width: width$2,
	height: height$2,
	resultsSummary1: resultsSummary1$2,
	resultsSummary2: resultsSummary2$2,
	resultsSummary3: resultsSummary3$2,
	noResultsFound: noResultsFound$2,
	searchButtonLabel: searchButtonLabel$2,
	hour: hour$2,
	minute: minute$2,
	second: second$2,
	hours: hours$2,
	minutes: minutes$2,
	seconds: seconds$2,
	vtsHeading: vtsHeading$2,
	vtsInstructions1: vtsInstructions1$2,
	vtsInstructions2: vtsInstructions2$2,
	vtsInstructions3: vtsInstructions3$2,
	vtsInstructions4: vtsInstructions4$2,
	vtsInstructions5: vtsInstructions5$2,
	vtsSelectLanguage: vtsSelectLanguage$2,
	vtsSave: vtsSave$2,
	vtsReturn: vtsReturn$2,
	vtsCancel: vtsCancel$2,
	vtsRow: vtsRow$2,
	vtsKind: vtsKind$2,
	vtsStart: vtsStart$2,
	vtsEnd: vtsEnd$2,
	vtsContent: vtsContent$2,
	vtsActions: vtsActions$2,
	vtsNewRow: vtsNewRow$2,
	vtsDeletedRow: vtsDeletedRow$2,
	vtsMovedRow: vtsMovedRow$2
};

var playerHeading$1 = "Medya Oynatıcı";
var audioPlayer$1 = "Audio player";
var videoPlayer$1 = "Video player";
var faster$1 = "Hızlandır";
var slower$1 = "Yavaşlat";
var play$1 = "Oynat";
var pause$1 = "Duraklat";
var restart$1 = "Yeniden Oynat";
var prevTrack$1 = "Önceki Parça";
var nextTrack$1 = "Gelecek Parça";
var rewind$1 = "Geri Sar";
var forward$1 = "İleri Sar";
var captions$1 = "Altyazılar";
var showCaptions$1 = "Altyazıları Göster";
var hideCaptions$1 = "Altyazıları Gizle";
var captionsOff$1 = "Altyazıkarı Kapat";
var showTranscript$1 = "Belgeyi Göster";
var hideTranscript$1 = "HBelgeyi Gizle";
var turnOnDescriptions$1 = "Açıklamaları Aç";
var turnOffDescriptions$1 = "Açıklamaları Kapa";
var chapters$1 = "Bölümler";
var language$1 = "Dil";
var sign$1 = "İşaret Dili";
var showSign$1 = "İşaret Dilini Göster";
var hideSign$1 = "İşaret Dilini Gizle";
var seekbarLabel$1 = "Zaman Cetveli";
var mute$1 = "Sessize Al";
var unmute$1 = "Sesi Aç";
var volume$1 = "Ses Ayarı";
var volumeUpDown$1 = "Sesi yükselt veya alçalt";
var preferences$1 = "Seçenekler";
var enterFullScreen$1 = "Tam Ekranı Etkinleştir";
var exitFullScreen$1 = "Tam Ekranı Kapa";
var speed$1 = "Hız";
var spacebar$1 = "boşluk tuşu";
var transcriptTitle$1 = "Belge";
var lyricsTitle$1 = "Sözler";
var autoScroll$1 = "Otomatik Kaydırma";
var statusPlaying$1 = "Yürütülüyor";
var statusPaused$1 = "Duraklat";
var statusStopped$1 = "Durdur";
var statusBuffering$1 = "Arabelleğe Alınıyor";
var statusEnd$1 = "Parça sonlandı";
var selectedTrack$1 = "Seçilen Parça";
var alertDescribedVersion$1 = "Tanımlı video versiyonu için ses kullanılıyor";
var alertNonDescribedVersion$1 = "Tanımlanmamış video versiyonu için kullanılıyor";
var prefMenuCaptions$1 = "Altyazılar";
var prefVoicedCaptions$1 = "Spoken Captions";
var prefMenuDescriptions$1 = "Açıklamalar";
var prefMenuKeyboard$1 = "Klavye";
var prefMenuTranscript$1 = "Belgeler";
var prefTitleCaptions$1 = "Altyazı Seçenekleri";
var prefTitleDescriptions$1 = "Ses Açıklama Ayarları";
var prefTitleKeyboard$1 = "Klavye Tercihleri";
var prefTitleTranscript$1 = "Belge Tercihleri";
var prefIntroDescription1$1 = "Bu video oynatıcı iki farklı ses açıklaması destekler: ";
var prefDescription1$1 = "Şu anki video'da mevcut alternatif tanımlı versiyon, metin tabanlı açıklama.";
var prefDescription2$1 = "Şu anki video'da mevcut Video versiyonu için tanımlı alternatifler.";
var prefDescription3$1 = "Şu anki video'da mevcut metin tabanlı açıklama, ekran okuyucusu tarafından duyurulan.";
var prefIntroDescriptionNone$1 = "Şu anki video'da her iki format için de ses açıklaması mevcut değil.";
var prefIntroDescription3$1 = "Ses açıklamalarını tercihlerinle ilişkilendirmek için belirtilen biçimi kullan.";
var prefIntroDescription4$1 = "Tercihlerini kaydettikten sonra, ses açıklamasını Açıklama butonu aracılığıyla açıp kapatabilirsin.";
var prefIntroKeyboard1$1 = "Bu web sayfasındaki medya oynatıcıyı, klavye kısayolları yardımıyla, sayfanın herhangi bir kısmından da yönetebilirsin (Liste için Aşağıyı İncele).";
var prefIntroKeyboard2$1 = "Niteleme Tuşları (Shift, Alt, ve Control) aşağınan atanabilir.";
var prefIntroKeyboard3$1 = "NOT: Bazı tuş kombinasyonları, tarayıcında veya farklı bir programda kullandığın tuşlarla çakışabilir. Uygun niteleme tuşlarını oluşturmak için farklı tuş kombinasyonları kullanmayı dene.";
var prefHeadingKeyboard1$1 = "Niteleme Tuşları kısayollar için kullanılır";
var prefHeadingKeyboard2$1 = "Şu anki klavye kısayolları";
var prefHeadingDescription$1 = "Ses açıklaması";
var prefHeadingTextDescription$1 = "Metin tabanlı ses açıklaması";
var prefAltKey$1 = "Alt";
var prefCtrlKey$1 = "Control";
var prefShiftKey$1 = "Shift";
var prefNoKeyShortcuts$1 = "Disable keyboard shortcuts";
var escapeKey$1 = "Escape";
var escapeKeyFunction$1 = "Şu anki diyalogu veya açılır menüyü kapa";
var prefDescPause$1 = "Açıklama başladığında video'yu otomatik olarak durdur";
var prefDescVisible$1 = "Açıklamayı görünür yap";
var prefDescVoice$1 = "Voice";
var prefDescRate$1 = "Spoken Description Rate";
var prefCaptionRate$1 = "Spoken Caption Rate";
var prefDescPitch$1 = "Pitch";
var prefDescPitch1$1 = "Very low";
var prefDescPitch2$1 = "Low";
var prefDescPitch3$1 = "Default";
var prefDescPitch4$1 = "High";
var prefDescPitch5$1 = "Very high";
var sampleDescriptionText$1 = "Adjust settings to hear this sample text.";
var prefHighlight$1 = "Medya'daki belgeyi öne çıkar";
var prefTabbable$1 = "Klavye ile aktif edilen belge";
var prefCaptionsFont$1 = "Yazı Tipi";
var prefCaptionsColor$1 = "Metin Rengi";
var prefCaptionsBGColor$1 = "Arkaplan";
var prefCaptionsSize$1 = "Yazı Boyutu";
var prefCaptionsOpacity$1 = "Opasite";
var prefCaptionsStyle$1 = "Stil";
var serif$1 = "serif";
var sans$1 = "sans-serif";
var cursive$1 = "el yazısı";
var fantasy$1 = "fantezi";
var monospace$1 = "tek hacimli";
var white$1 = "beyaz";
var yellow$1 = "sarı";
var green$1 = "yeşik";
var cyan$1 = "açık mavi";
var blue$1 = "mavi";
var magenta$1 = "mor";
var red$1 = "kırmızı";
var black$1 = "siyah";
var transparent$1 = "transparan";
var solid$1 = "düz renk";
var captionsStylePopOn$1 = "Pop-on";
var captionsStyleRollUp$1 = "Roll-up";
var prefCaptionsPosition$1 = "Pozisyon";
var captionsPositionOverlay$1 = "Kaplama";
var captionsPositionBelow$1 = "Video'nun altında";
var sampleCaptionText$1 = "Örnek altyaı metni";
var prefSuccess$1 = "Değişikliklerin kaydedildi.";
var prefNoChange$1 = "Hiçbir değişiklik yapmadın.";
var save$1 = "Kaydet";
var cancel$1 = "İptal Et";
var dismissButton$1 = "Dismiss";
var windowButtonLabel$1 = "Pencere Seçenekleri";
var windowMove$1 = "Hareket";
var windowMoveLeft$1 = "Window moved left";
var windowMoveRight$1 = "Window moved right";
var windowMoveUp$1 = "Window moved up";
var windowMoveDown$1 = "Window moved down";
var windowMoveStopped$1 = "Window move stopped";
var transcriptControls$1 = "Transcript Window Controls";
var signControls$1 = "Sign Language Window Controls";
var windowMoveAlert$1 = "Pencereyi hareket ettirmek için mouse'unu sürü veya ok tuşlarını kullan; Durdurmak için Enter'a bas";
var windowResize$1 = "Yeniden Boyutlandır";
var windowResizeHeading$1 = "Pencereyi yeniden Boyutlandır";
var closeButtonLabel$1 = "Kapat";
var width$1 = "En";
var height$1 = "Boy";
var resultsSummary1$1 = "You searched for:";
var resultsSummary2$1 = "Found %1 matching items.";
var resultsSummary3$1 = "Click the time associated with any item to play the video from that point.";
var noResultsFound$1 = "No results found.";
var searchButtonLabel$1 = "Play at %1";
var hour$1 = "hour";
var minute$1 = "minute";
var second$1 = "second";
var hours$1 = "hours";
var minutes$1 = "minutes";
var seconds$1 = "seconds";
var vtsHeading$1 = "Video Transcript Sorter";
var vtsInstructions1$1 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2$1 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3$1 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4$1 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5$1 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage$1 = "Select a language";
var vtsSave$1 = "Generate new .vtt content";
var vtsReturn$1 = "Return to Editor";
var vtsCancel$1 = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow$1 = "Row";
var vtsKind$1 = "Kind";
var vtsStart$1 = "Start";
var vtsEnd$1 = "End";
var vtsContent$1 = "Content";
var vtsActions$1 = "Actions";
var vtsNewRow$1 = "A new row %1 has been inserted.";
var vtsDeletedRow$1 = "Row %1 has been deleted.";
var vtsMovedRow$1 = "Row %1 has been moved %2 and is now Row %3.";
var tr = {
	playerHeading: playerHeading$1,
	audioPlayer: audioPlayer$1,
	videoPlayer: videoPlayer$1,
	faster: faster$1,
	slower: slower$1,
	play: play$1,
	pause: pause$1,
	restart: restart$1,
	prevTrack: prevTrack$1,
	nextTrack: nextTrack$1,
	rewind: rewind$1,
	forward: forward$1,
	captions: captions$1,
	showCaptions: showCaptions$1,
	hideCaptions: hideCaptions$1,
	captionsOff: captionsOff$1,
	showTranscript: showTranscript$1,
	hideTranscript: hideTranscript$1,
	turnOnDescriptions: turnOnDescriptions$1,
	turnOffDescriptions: turnOffDescriptions$1,
	chapters: chapters$1,
	language: language$1,
	sign: sign$1,
	showSign: showSign$1,
	hideSign: hideSign$1,
	seekbarLabel: seekbarLabel$1,
	mute: mute$1,
	unmute: unmute$1,
	volume: volume$1,
	volumeUpDown: volumeUpDown$1,
	preferences: preferences$1,
	enterFullScreen: enterFullScreen$1,
	exitFullScreen: exitFullScreen$1,
	speed: speed$1,
	spacebar: spacebar$1,
	transcriptTitle: transcriptTitle$1,
	lyricsTitle: lyricsTitle$1,
	autoScroll: autoScroll$1,
	statusPlaying: statusPlaying$1,
	statusPaused: statusPaused$1,
	statusStopped: statusStopped$1,
	statusBuffering: statusBuffering$1,
	statusEnd: statusEnd$1,
	selectedTrack: selectedTrack$1,
	alertDescribedVersion: alertDescribedVersion$1,
	alertNonDescribedVersion: alertNonDescribedVersion$1,
	prefMenuCaptions: prefMenuCaptions$1,
	prefVoicedCaptions: prefVoicedCaptions$1,
	prefMenuDescriptions: prefMenuDescriptions$1,
	prefMenuKeyboard: prefMenuKeyboard$1,
	prefMenuTranscript: prefMenuTranscript$1,
	prefTitleCaptions: prefTitleCaptions$1,
	prefTitleDescriptions: prefTitleDescriptions$1,
	prefTitleKeyboard: prefTitleKeyboard$1,
	prefTitleTranscript: prefTitleTranscript$1,
	prefIntroDescription1: prefIntroDescription1$1,
	prefDescription1: prefDescription1$1,
	prefDescription2: prefDescription2$1,
	prefDescription3: prefDescription3$1,
	prefIntroDescriptionNone: prefIntroDescriptionNone$1,
	prefIntroDescription3: prefIntroDescription3$1,
	prefIntroDescription4: prefIntroDescription4$1,
	prefIntroKeyboard1: prefIntroKeyboard1$1,
	prefIntroKeyboard2: prefIntroKeyboard2$1,
	prefIntroKeyboard3: prefIntroKeyboard3$1,
	prefHeadingKeyboard1: prefHeadingKeyboard1$1,
	prefHeadingKeyboard2: prefHeadingKeyboard2$1,
	prefHeadingDescription: prefHeadingDescription$1,
	prefHeadingTextDescription: prefHeadingTextDescription$1,
	prefAltKey: prefAltKey$1,
	prefCtrlKey: prefCtrlKey$1,
	prefShiftKey: prefShiftKey$1,
	prefNoKeyShortcuts: prefNoKeyShortcuts$1,
	escapeKey: escapeKey$1,
	escapeKeyFunction: escapeKeyFunction$1,
	prefDescPause: prefDescPause$1,
	prefDescVisible: prefDescVisible$1,
	prefDescVoice: prefDescVoice$1,
	prefDescRate: prefDescRate$1,
	prefCaptionRate: prefCaptionRate$1,
	prefDescPitch: prefDescPitch$1,
	prefDescPitch1: prefDescPitch1$1,
	prefDescPitch2: prefDescPitch2$1,
	prefDescPitch3: prefDescPitch3$1,
	prefDescPitch4: prefDescPitch4$1,
	prefDescPitch5: prefDescPitch5$1,
	sampleDescriptionText: sampleDescriptionText$1,
	prefHighlight: prefHighlight$1,
	prefTabbable: prefTabbable$1,
	prefCaptionsFont: prefCaptionsFont$1,
	prefCaptionsColor: prefCaptionsColor$1,
	prefCaptionsBGColor: prefCaptionsBGColor$1,
	prefCaptionsSize: prefCaptionsSize$1,
	prefCaptionsOpacity: prefCaptionsOpacity$1,
	prefCaptionsStyle: prefCaptionsStyle$1,
	serif: serif$1,
	sans: sans$1,
	cursive: cursive$1,
	fantasy: fantasy$1,
	monospace: monospace$1,
	white: white$1,
	yellow: yellow$1,
	green: green$1,
	cyan: cyan$1,
	blue: blue$1,
	magenta: magenta$1,
	red: red$1,
	black: black$1,
	transparent: transparent$1,
	solid: solid$1,
	captionsStylePopOn: captionsStylePopOn$1,
	captionsStyleRollUp: captionsStyleRollUp$1,
	prefCaptionsPosition: prefCaptionsPosition$1,
	captionsPositionOverlay: captionsPositionOverlay$1,
	captionsPositionBelow: captionsPositionBelow$1,
	sampleCaptionText: sampleCaptionText$1,
	prefSuccess: prefSuccess$1,
	prefNoChange: prefNoChange$1,
	save: save$1,
	cancel: cancel$1,
	dismissButton: dismissButton$1,
	windowButtonLabel: windowButtonLabel$1,
	windowMove: windowMove$1,
	windowMoveLeft: windowMoveLeft$1,
	windowMoveRight: windowMoveRight$1,
	windowMoveUp: windowMoveUp$1,
	windowMoveDown: windowMoveDown$1,
	windowMoveStopped: windowMoveStopped$1,
	transcriptControls: transcriptControls$1,
	signControls: signControls$1,
	windowMoveAlert: windowMoveAlert$1,
	windowResize: windowResize$1,
	windowResizeHeading: windowResizeHeading$1,
	closeButtonLabel: closeButtonLabel$1,
	width: width$1,
	height: height$1,
	resultsSummary1: resultsSummary1$1,
	resultsSummary2: resultsSummary2$1,
	resultsSummary3: resultsSummary3$1,
	noResultsFound: noResultsFound$1,
	searchButtonLabel: searchButtonLabel$1,
	hour: hour$1,
	minute: minute$1,
	second: second$1,
	hours: hours$1,
	minutes: minutes$1,
	seconds: seconds$1,
	vtsHeading: vtsHeading$1,
	vtsInstructions1: vtsInstructions1$1,
	vtsInstructions2: vtsInstructions2$1,
	vtsInstructions3: vtsInstructions3$1,
	vtsInstructions4: vtsInstructions4$1,
	vtsInstructions5: vtsInstructions5$1,
	vtsSelectLanguage: vtsSelectLanguage$1,
	vtsSave: vtsSave$1,
	vtsReturn: vtsReturn$1,
	vtsCancel: vtsCancel$1,
	vtsRow: vtsRow$1,
	vtsKind: vtsKind$1,
	vtsStart: vtsStart$1,
	vtsEnd: vtsEnd$1,
	vtsContent: vtsContent$1,
	vtsActions: vtsActions$1,
	vtsNewRow: vtsNewRow$1,
	vtsDeletedRow: vtsDeletedRow$1,
	vtsMovedRow: vtsMovedRow$1
};

var playerHeading = "媒體播放器";
var audioPlayer = "Audio player";
var videoPlayer = "Video player";
var faster = "加快";
var slower = "減慢";
var play = "播放";
var pause = "暫停";
var restart = "從頭開始";
var prevTrack = "前一軌";
var nextTrack = "後一軌";
var rewind = "倒回";
var forward = "快轉";
var captions = "字幕";
var showCaptions = "顯示字幕";
var hideCaptions = "隱藏字幕";
var captionsOff = "字幕關閉";
var showTranscript = "顯示逐字稿";
var hideTranscript = "隱藏逐字稿";
var turnOnDescriptions = "開啟口述影像";
var turnOffDescriptions = "關閉口述影像";
var chapters = "章節";
var language = "語言";
var sign = "手語";
var showSign = "顯示手語";
var hideSign = "隱藏手語";
var seekbarLabel = "時間軸";
var mute = "靜音";
var unmute = "取消靜音";
var volume = "音量";
var volumeUpDown = "音量增減";
var preferences = "偏好設定";
var enterFullScreen = "進入全螢幕模式";
var exitFullScreen = "離開全螢幕模式";
var speed = "播放速度";
var spacebar = "空白鍵";
var transcriptTitle = "逐字稿";
var lyricsTitle = "歌詞";
var autoScroll = "自動捲動";
var statusPlaying = "正在播放";
var statusPaused = "已暫停";
var statusStopped = "已停止";
var statusBuffering = "正在緩衝";
var statusEnd = "軌段結束";
var selectedTrack = "已選軌段";
var alertDescribedVersion = "正在使用本影片的口述影像版本";
var alertNonDescribedVersion = "正在使用本影片的非口述影像版本";
var prefMenuCaptions = "字幕";
var prefVoicedCaptions = "Spoken Captions";
var prefMenuDescriptions = "口述影像";
var prefMenuKeyboard = "鍵盤";
var prefMenuTranscript = "逐字稿";
var prefTitleCaptions = "字幕偏好設定";
var prefTitleDescriptions = "口述影像偏好設定";
var prefTitleKeyboard = "鍵盤偏好設定";
var prefTitleTranscript = "逐字稿偏好設定";
var prefIntroDescription1 = "本媒體播放器支援兩種支援口述影像格式：";
var prefDescription1 = "目前的影片有 錄製口述影像的替代版本 文字式口述影像";
var prefDescription2 = "目前的影片有 影片的口述影像替代版本";
var prefDescription3 = "目前的影片有 文字式口述影像，需搭配螢幕報讀軟體";
var prefIntroDescriptionNone = "目前的影片兩種格式都沒提供。";
var prefIntroDescription3 = "請使用下列表單設定口述影像的相關偏好。";
var prefIntroDescription4 = "儲存設定後，口述影像功能可以由口述影像按鈕切換開關。";
var prefIntroKeyboard1 = "不論您身處網頁何處，都可以運用下列鍵盤快速鍵操作頁面中的這個媒體播放器（快速鍵清單請見底下）。";
var prefIntroKeyboard2 = "以下都可以指派組合鍵（Shift、Alt、Ctrl）。";
var prefIntroKeyboard3 = "請注意：有些快速鍵組合可能會跟您的瀏覽器或其他應用程式相衝突。請自行多加嘗試，確認哪些按鍵組合可以使用。";
var prefHeadingKeyboard1 = "用於快速鍵的組合鍵";
var prefHeadingKeyboard2 = "目前的快速鍵";
var prefHeadingDescription = "口述影像";
var prefHeadingTextDescription = "文字式口述影像";
var prefAltKey = "Alt";
var prefCtrlKey = "Ctrl";
var prefShiftKey = "Shift";
var prefNoKeyShortcuts = "Disable keyboard shortcuts";
var escapeKey = "Esc";
var escapeKeyFunction = "關閉目前的對話視窗或彈出式選單";
var prefDescPause = "開始口述時自動暫停影片";
var prefDescVisible = "同時以視覺方式呈現口述影像";
var prefDescVoice = "語音";
var prefDescRate = "Spoken Description Rate";
var prefCaptionRate = "Spoken Caption Rate";
var prefDescPitch = "音調";
var prefDescPitch1 = "非常低沈";
var prefDescPitch2 = "低沈";
var prefDescPitch3 = "預設";
var prefDescPitch4 = "高亢";
var prefDescPitch5 = "非常高亢";
var sampleDescriptionText = "調整設定以聆聽這段範例文字。";
var prefHighlight = "播放媒體內容時凸顯相對應的逐字稿段落";
var prefTabbable = "啟用鍵盤的逐字稿";
var prefCaptionsFont = "字體變化";
var prefCaptionsColor = "文字色彩";
var prefCaptionsBGColor = "背景";
var prefCaptionsSize = "文字尺寸";
var prefCaptionsOpacity = "不透明度";
var prefCaptionsStyle = "字型樣式";
var serif = "襯線字型";
var sans = "無襯線字型";
var cursive = "手寫字型";
var fantasy = "華麗字型";
var monospace = "等寬字型";
var white = "白色";
var yellow = "黃色";
var green = "綠色";
var cyan = "青色";
var blue = "藍色";
var magenta = "洋紅色";
var red = "紅色";
var black = "黑色";
var transparent = "透明";
var solid = "不透明";
var captionsStylePopOn = "彈出";
var captionsStyleRollUp = "往上捲動";
var prefCaptionsPosition = "位置";
var captionsPositionOverlay = "覆蓋";
var captionsPositionBelow = "在影片之下";
var sampleCaptionText = "字幕範例";
var prefSuccess = "已儲存您提出的變動。";
var prefNoChange = "您並未提出任何變動。";
var save = "儲存";
var cancel = "取消";
var dismissButton = "Dismiss";
var windowButtonLabel = "視窗選項";
var windowMove = "移動";
var windowMoveLeft = "Window moved left";
var windowMoveRight = "Window moved right";
var windowMoveUp = "Window moved up";
var windowMoveDown = "Window moved down";
var windowMoveStopped = "Window move stopped";
var transcriptControls = "Transcript Window Controls";
var signControls = "Sign Language Window Controls";
var windowMoveAlert = "拖曳視窗或以方向鍵移動視窗；確定後按 Enter";
var windowResize = "變更大小";
var windowResizeHeading = "變更視窗大小";
var closeButtonLabel = "閉";
var width = "寬度";
var height = "高度";
var resultsSummary1 = "You searched for:";
var resultsSummary2 = "Found %1 matching items.";
var resultsSummary3 = "Click the time associated with any item to play the video from that point.";
var noResultsFound = "No results found.";
var searchButtonLabel = "Play at %1";
var hour = "hour";
var minute = "minute";
var second = "second";
var hours = "hours";
var minutes = "minutes";
var seconds = "seconds";
var vtsHeading = "Video Transcript Sorter";
var vtsInstructions1 = "Use the Video Transcript Sorter to modify text tracks:";
var vtsInstructions2 = "Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player's auto-generated transcript.";
var vtsInstructions3 = "Modify content or start/end times (all are directly editable within the table).";
var vtsInstructions4 = "Add new content, such as chapters or descriptions.";
var vtsInstructions5 = "After editing, click the \"Save Changes\" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.";
var vtsSelectLanguage = "Select a language";
var vtsSave = "Generate new .vtt content";
var vtsReturn = "Return to Editor";
var vtsCancel = "Cancelling saving. Any edits you made have been restored in the VTS table.";
var vtsRow = "Row";
var vtsKind = "Kind";
var vtsStart = "Start";
var vtsEnd = "End";
var vtsContent = "Content";
var vtsActions = "Actions";
var vtsNewRow = "A new row %1 has been inserted.";
var vtsDeletedRow = "Row %1 has been deleted.";
var vtsMovedRow = "Row %1 has been moved %2 and is now Row %3.";
var zh_tw = {
	playerHeading: playerHeading,
	audioPlayer: audioPlayer,
	videoPlayer: videoPlayer,
	faster: faster,
	slower: slower,
	play: play,
	pause: pause,
	restart: restart,
	prevTrack: prevTrack,
	nextTrack: nextTrack,
	rewind: rewind,
	forward: forward,
	captions: captions,
	showCaptions: showCaptions,
	hideCaptions: hideCaptions,
	captionsOff: captionsOff,
	showTranscript: showTranscript,
	hideTranscript: hideTranscript,
	turnOnDescriptions: turnOnDescriptions,
	turnOffDescriptions: turnOffDescriptions,
	chapters: chapters,
	language: language,
	sign: sign,
	showSign: showSign,
	hideSign: hideSign,
	seekbarLabel: seekbarLabel,
	mute: mute,
	unmute: unmute,
	volume: volume,
	volumeUpDown: volumeUpDown,
	preferences: preferences,
	enterFullScreen: enterFullScreen,
	exitFullScreen: exitFullScreen,
	speed: speed,
	spacebar: spacebar,
	transcriptTitle: transcriptTitle,
	lyricsTitle: lyricsTitle,
	autoScroll: autoScroll,
	statusPlaying: statusPlaying,
	statusPaused: statusPaused,
	statusStopped: statusStopped,
	statusBuffering: statusBuffering,
	statusEnd: statusEnd,
	selectedTrack: selectedTrack,
	alertDescribedVersion: alertDescribedVersion,
	alertNonDescribedVersion: alertNonDescribedVersion,
	prefMenuCaptions: prefMenuCaptions,
	prefVoicedCaptions: prefVoicedCaptions,
	prefMenuDescriptions: prefMenuDescriptions,
	prefMenuKeyboard: prefMenuKeyboard,
	prefMenuTranscript: prefMenuTranscript,
	prefTitleCaptions: prefTitleCaptions,
	prefTitleDescriptions: prefTitleDescriptions,
	prefTitleKeyboard: prefTitleKeyboard,
	prefTitleTranscript: prefTitleTranscript,
	prefIntroDescription1: prefIntroDescription1,
	prefDescription1: prefDescription1,
	prefDescription2: prefDescription2,
	prefDescription3: prefDescription3,
	prefIntroDescriptionNone: prefIntroDescriptionNone,
	prefIntroDescription3: prefIntroDescription3,
	prefIntroDescription4: prefIntroDescription4,
	prefIntroKeyboard1: prefIntroKeyboard1,
	prefIntroKeyboard2: prefIntroKeyboard2,
	prefIntroKeyboard3: prefIntroKeyboard3,
	prefHeadingKeyboard1: prefHeadingKeyboard1,
	prefHeadingKeyboard2: prefHeadingKeyboard2,
	prefHeadingDescription: prefHeadingDescription,
	prefHeadingTextDescription: prefHeadingTextDescription,
	prefAltKey: prefAltKey,
	prefCtrlKey: prefCtrlKey,
	prefShiftKey: prefShiftKey,
	prefNoKeyShortcuts: prefNoKeyShortcuts,
	escapeKey: escapeKey,
	escapeKeyFunction: escapeKeyFunction,
	prefDescPause: prefDescPause,
	prefDescVisible: prefDescVisible,
	prefDescVoice: prefDescVoice,
	prefDescRate: prefDescRate,
	prefCaptionRate: prefCaptionRate,
	prefDescPitch: prefDescPitch,
	prefDescPitch1: prefDescPitch1,
	prefDescPitch2: prefDescPitch2,
	prefDescPitch3: prefDescPitch3,
	prefDescPitch4: prefDescPitch4,
	prefDescPitch5: prefDescPitch5,
	sampleDescriptionText: sampleDescriptionText,
	prefHighlight: prefHighlight,
	prefTabbable: prefTabbable,
	prefCaptionsFont: prefCaptionsFont,
	prefCaptionsColor: prefCaptionsColor,
	prefCaptionsBGColor: prefCaptionsBGColor,
	prefCaptionsSize: prefCaptionsSize,
	prefCaptionsOpacity: prefCaptionsOpacity,
	prefCaptionsStyle: prefCaptionsStyle,
	serif: serif,
	sans: sans,
	cursive: cursive,
	fantasy: fantasy,
	monospace: monospace,
	white: white,
	yellow: yellow,
	green: green,
	cyan: cyan,
	blue: blue,
	magenta: magenta,
	red: red,
	black: black,
	transparent: transparent,
	solid: solid,
	captionsStylePopOn: captionsStylePopOn,
	captionsStyleRollUp: captionsStyleRollUp,
	prefCaptionsPosition: prefCaptionsPosition,
	captionsPositionOverlay: captionsPositionOverlay,
	captionsPositionBelow: captionsPositionBelow,
	sampleCaptionText: sampleCaptionText,
	prefSuccess: prefSuccess,
	prefNoChange: prefNoChange,
	save: save,
	cancel: cancel,
	dismissButton: dismissButton,
	windowButtonLabel: windowButtonLabel,
	windowMove: windowMove,
	windowMoveLeft: windowMoveLeft,
	windowMoveRight: windowMoveRight,
	windowMoveUp: windowMoveUp,
	windowMoveDown: windowMoveDown,
	windowMoveStopped: windowMoveStopped,
	transcriptControls: transcriptControls,
	signControls: signControls,
	windowMoveAlert: windowMoveAlert,
	windowResize: windowResize,
	windowResizeHeading: windowResizeHeading,
	closeButtonLabel: closeButtonLabel,
	width: width,
	height: height,
	resultsSummary1: resultsSummary1,
	resultsSummary2: resultsSummary2,
	resultsSummary3: resultsSummary3,
	noResultsFound: noResultsFound,
	searchButtonLabel: searchButtonLabel,
	hour: hour,
	minute: minute,
	second: second,
	hours: hours,
	minutes: minutes,
	seconds: seconds,
	vtsHeading: vtsHeading,
	vtsInstructions1: vtsInstructions1,
	vtsInstructions2: vtsInstructions2,
	vtsInstructions3: vtsInstructions3,
	vtsInstructions4: vtsInstructions4,
	vtsInstructions5: vtsInstructions5,
	vtsSelectLanguage: vtsSelectLanguage,
	vtsSave: vtsSave,
	vtsReturn: vtsReturn,
	vtsCancel: vtsCancel,
	vtsRow: vtsRow,
	vtsKind: vtsKind,
	vtsStart: vtsStart,
	vtsEnd: vtsEnd,
	vtsContent: vtsContent,
	vtsActions: vtsActions,
	vtsNewRow: vtsNewRow,
	vtsDeletedRow: vtsDeletedRow,
	vtsMovedRow: vtsMovedRow
};

const moduleFromTag = {
	ca,
	cs,
	da,
	de,
	en,
	es,
	fr,
	he,
	id,
	it,
	ja,
	ms,
	nb,
	nl,
	pl,
	pt,
	'pt-BR': pt_br,
	sk,
	sv,
	tr,
	'zh-TW': zh_tw,
};

function addTranslationFunctions(AblePlayer) {
	AblePlayer.prototype.getSupportedLangs = function() {
		// returns an array of languages for which AblePlayer has translation tables
		var langs = {
			'ca'    : 'Catalan',
			'cs'    : 'Czech',
			'da'    : 'Danish',
			'de'    : 'German',
			'en'    : 'English',
			'es'    : 'Spanish',
			'fr'    : 'French',
			'he'    : 'Hebrew',
			'id'    : 'Indonesian',
			'it'    : 'Italian',
			'ja'    : 'Japanese',
			'ms'    : 'Malay',
			'nb'    : 'Norwegian Bokmål',
			'nl'    : 'Dutch',
			'pl'    : 'Polish',
			'pt'    : 'Portuguese',
			'pt-BR' : 'Brazilian Portuguese',
			'sk'    : 'Slovak',
			'sv'    : 'Swedish',
			'tr'    : 'Turkish',
			'zh-TW' : 'Chinese (Taiwan)'
		};

		return langs;
	};

	/**
	 * Fetch a translated string if it exists.
	 *
	 * @param {string} key JSON key to locate translated string.
	 * @param {string} fallback Default language if no translation found.
	 * @param {Array} args Ordered array of arguments to replace in string.
	 * @returns
	 */
	AblePlayer.prototype.translate = function( key, fallback, args = Array() ) {
		let translation = '';
		if ( this.tt[ key ] ) {
			translation = this.tt[ key ];
		} else {
			translation = fallback;
		}
		if ( args.length > 0 ) {
			args.forEach( ( val, index ) => {
				let ref = index + 1;
				translation = translation.replace( '%' + ref, val );
			});
		}

		return translation;
	};

	AblePlayer.prototype.getTranslationText = function() {

		// determine language, then get labels and prompts from corresponding translation var
		var thisObj, supportedLangs, docLang, similarLangFound;
		thisObj = this;

		supportedLangs = this.getSupportedLangs(); // returns an array

		if (this.lang) { // a data-lang attribute is included on the media element
			this.lang;
			if ( ! Object.hasOwn( supportedLangs,this.lang ) ) {
				// the specified language code is not in the index
				if ( this.lang.indexOf('-') == 2 ) {
					// this is a localized lang attribute (e.g., fr-CA)
					// try the parent language, given the first two characters
					// if parent lang is supported. Use that, else null.
					this.lang = ( Object.hasOwn(supportedLangs,this.lang.substring(0,2)) !== -1 ) ? this.lang.substring(0,2) : null;
				} else {
					// this is not a localized language.
					// but maybe there's a similar localized language supported
					// that has the same parent?
					similarLangFound = false;
					for ( const [key,value] of Object.entries(supportedLangs) ) {
						if ( key.substring(0,2) == this.lang ) {
							this.lang = key;
							similarLangFound = true;
						}
					}
					if ( !similarLangFound ) {
						// language requested via data-lang is not supported
						this.lang = null;
					}
				}
			}
		}

		if (!this.lang) {
			// try the language of the web page, if specified
			if ($('body').attr('lang')) {
				docLang = $('body').attr('lang').toLowerCase();
			} else if ($('html').attr('lang')) {
				docLang = $('html').attr('lang').toLowerCase();
			} else {
				docLang = null;
			}
			if (docLang) {
				if ( Object.hasOwn( supportedLangs,docLang ) ) {
					// the document language is supported
					this.lang = docLang;
				} else {
					// the document language is not supported
					if (docLang.indexOf('-') == 2) {
						// this is a localized lang attribute (e.g., fr-CA)
						// try the parent language, given the first two characters
						if ( Object.hasOwn(supportedLangs,docLang.substring(0,2)) ) {
							// the parent language is supported. use that.
							this.lang = docLang.substring(0,2);
						}
					}
				}
			}
		}

		if (!this.lang) {
			// No supported language has been specified by any means
			// Fallback to English
			this.lang = 'en';
		}

		if (!this.searchLang) {
			this.searchLang = this.lang;
		}
		const ttModule = moduleFromTag[this.lang];
		if (!ttModule) {
			thisObj.tt = {};
			thisObj.translationFiles = false;
		} else {
			thisObj.tt = ttModule;
			thisObj.translationFiles = true;
		}
	};

	AblePlayer.prototype.getSampleDescriptionText = function() {
		if ( ! this.translationFiles ) {
			this.sampleText = [];
			let translation = { 'lang':'en', 'text': this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' ) };
			this.sampleText.push(translation);
		} else {
			// Create an array of sample description text in all languages
			// This needs to be readily available for testing different voices
			// in the Description Preferences dialog
			var supportedLangs, thisText, translation;

			supportedLangs = this.getSupportedLangs();

			this.sampleText = [];
			for ( const [tag,name] of Object.entries(supportedLangs) ) {
				const ttModule = moduleFromTag[tag];
				thisText = ttModule.sampleDescriptionText;
				translation = {'lang':name, 'text': thisText};
				this.sampleText.push(translation);
			}
		}
	};

}

/* global Vimeo */

function addVimeoFunctions(AblePlayer) {

	AblePlayer.prototype.initVimeoPlayer = function () {

		var thisObj, deferred, promise, containerId, vimeoId, options;
		thisObj = this;

		deferred = new this.defer();
		promise = deferred.promise();

		containerId = this.mediaId + '_vimeo';

		// add container to which Vimeo player iframe will be appended
		this.$mediaContainer.prepend($('<div>').attr('id', containerId));

		// if a described version is available && user prefers description
		// init player using the described version
		vimeoId = (this.vimeoDescId && this.prefDesc) ? this.vimeoDescId : this.vimeoId;

		this.activeVimeoId = vimeoId;

		// Notes re. Vimeo Embed Options:
		// If a video is owned by a user with a paid Plus, PRO, or Business account,
		// setting the "controls" option to "false" will hide the default controls, without hiding captions.
		// This is a new option from Vimeo; previously used "background:true" to hide the controller,
		// but that had unwanted side effects:
		// - In addition to hiding the controls, it also hides captions
		// - It automatically autoplays (initializing the player with autoplay:false does not override this)
		// - It automatically loops (but this can be overridden by initializing the player with loop:false)
		// - It automatically sets volume to 0 (not sure if this can be overridden, since no longer using the background option)

		if (this.playerWidth) {
			if (this.vimeoUrlHasParams) {
				// use url param, not id
				options = {
					url: vimeoId,
					width: this.playerWidth,
					controls: false
				};
			} else {
				options = {
					id: vimeoId,
					width: this.playerWidth,
					controls: false
				};
			}
		} else {
			// initialize without width & set width later
			if (this.vimeoUrlHasParams) {
				options = {
					url: vimeoId,
					controls: false
				};
			} else {
				options = {
					id: vimeoId,
					controls: false
				};
			}
		}

		this.vimeoPlayer = new Vimeo.Player(containerId, options);

		this.vimeoPlayer.ready().then(function() {
			// add tabindex -1 on iframe so vimeo frame cannot be focused on
			$('#'+containerId).children('iframe').attr({
				'tabindex': '-1',
				'aria-hidden': true
			});

			// get video's intrinsic size and initiate player dimensions
			thisObj.vimeoPlayer.getVideoWidth().then(function(width) {
				if (width) {
					// also get height
					thisObj.vimeoPlayer.getVideoHeight().then(function(height) {
						if (height) {
							thisObj.resizePlayer(width,height);
						}
					});
				}
			}).catch(function(error) {
				// an error occurred getting height or width
				// TODO: Test this to see how gracefully it organically recovers
			});

			if (!thisObj.hasPlaylist) {
				// remove the media element, since Vimeo replaces that with its own element in an iframe
				// this is handled differently for playlists. See buildplayer.js > cuePlaylistItem()
				thisObj.$media.remove();

				// define variables that will impact player setup

				// vimeoSupportsPlaybackRateChange
				// changing playbackRate is only supported if the video is hosted on a Pro or Business account
				// unfortunately there is no direct way to query for that information.
				// this.vimeoPlayer.getPlaybackRate() returns a value, regardless of account type
				// This is a hack:
				// Attempt to change the playbackRate. If it results in an error, assume changing playbackRate is not supported.
				// Supported playbackRate values are 0.5 to 2.
				thisObj.vimeoPlaybackRate = 1;
				thisObj.vimeoPlayer.setPlaybackRate(thisObj.vimeoPlaybackRate).then(function(playbackRate) {
				// playback rate was set
					thisObj.vimeoSupportsPlaybackRateChange = true;
				}).catch(function(error) {
					thisObj.vimeoSupportsPlaybackRateChange = false;
				});
				deferred.resolve();
			}
		});
		return promise;
	};

	AblePlayer.prototype.getVimeoPaused = function () {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		this.vimeoPlayer.getPaused().then(function (paused) {
			// paused is Boolean
			deferred.resolve(paused);
		});

		return promise;
	};

	AblePlayer.prototype.getVimeoEnded = function () {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		this.vimeoPlayer.getEnded().then(function (ended) {
			// ended is Boolean
			deferred.resolve(ended);
		});

		return promise;
	};

	AblePlayer.prototype.getVimeoState = function () {

		var deferred, promise, promises, gettingPausedPromise, gettingEndedPromise;

		deferred = new this.defer();
		promise = deferred.promise();
		promises = [];

		gettingPausedPromise = this.vimeoPlayer.getPaused();
		gettingEndedPromise = this.vimeoPlayer.getEnded();

		promises.push(gettingPausedPromise);
		promises.push(gettingEndedPromise);

		gettingPausedPromise.then(function (paused) {
			deferred.resolve(paused);
		});
		gettingEndedPromise.then(function (ended) {
			deferred.resolve(ended);
		});
		$.when.apply($, promises).then(function () {
			deferred.resolve();
		});
		return promise;
	};

	AblePlayer.prototype.getVimeoCaptionTracks = function () {

		// get data via Vimeo Player API, and push data to this.captions
		// Note: Vimeo doesn't expose the caption cues themselves
		// so this.captions will only include metadata about caption tracks; not cues
		var deferred = new this.defer();
		var promise = deferred.promise();

		var thisObj, i, isDefaultTrack;

		thisObj = this;

		this.vimeoPlayer.getTextTracks().then(function(tracks) {

				// each Vimeo track includes the following:
				// label (local name of the language)
				// language (2-character code)
				// kind (captions or subtitles, as declared by video owner)
				// mode ('disabled' or 'showing')

				if (tracks.length) {

					// create a new button for each caption track
					for (i=0; i<tracks.length; i++) {

						thisObj.hasCaptions = true;
						if (thisObj.prefCaptions === 1) {
								thisObj.captionsOn = true;
						} else {
							thisObj.captionsOn = false;
						}
						// assign the default track based on language of the player
						if (tracks[i]['language'] === thisObj.lang) {
							isDefaultTrack = true;
						} else {
								isDefaultTrack = false;
						}
						thisObj.tracks.push({
							'kind': tracks[i]['kind'],
							'language': tracks[i]['language'],
							'label': tracks[i]['label'],
							'def': isDefaultTrack
						});
					}
					thisObj.captions = thisObj.tracks;
					thisObj.hasCaptions = true;

					// setupPopups again with new captions array, replacing original
					thisObj.setupPopups('captions');
					deferred.resolve();
			 	} else {
					thisObj.hasCaptions = false;
					thisObj.usingVimeoCaptions = false;
					deferred.resolve();
				}
			});

		return promise;
	};

	AblePlayer.prototype.getVimeoPosterUrl = function (vimeoId) {
		const thisObj = this;

		// Vimeo Oembed only returns a 640px width image. Hope at some point there's an alternative.
		var url = 'https://vimeo.com/api/oembed.json?url=https://vimeo.com/' + vimeoId, imageUrl = '';
		fetch( url ).then( response => {

			return response.json();
  		})
		.then( json => {
			imageUrl = json.thumbnail_url;
		})
		.catch( error => {
			if (thisObj.debug) ;
		});

		return imageUrl;
	};

	AblePlayer.prototype.getVimeoId = function (url) {

		// return a Vimeo ID, extracted from a full Vimeo URL
		// Supported URL patterns are anything containing 'vimeo.com'
		// and ending with a '/' followed by the ID.
		// (Vimeo IDs do not have predicatable lengths)

		// Update: If URL contains parameters, return the full url
		// This will need to be passed to the Vimeo Player API
		// as a url parameter, not as an id parameter
		this.vimeoUrlHasParams = false;

		let urlObject;
		if (typeof url === 'number') {
			// this is likely already a vimeo ID
			return url;
		} else {
			urlObject = new URL(url);
		}
		if ( 'vimeo.com' === urlObject.hostname || 'player.vimeo.com' === urlObject.hostname ) {
			// this is a full Vimeo URL
			if ( '' !== urlObject.search ) {
				// URL contains parameters
				this.vimeoUrlHasParams = true;
				return url;
			} else {
				if ( 'player.vimeo.com' === urlObject.hostname ) {
					return urlObject.pathname.replace( '/video/', '' );
				} else {
					return urlObject.pathname.replace( '/', '' );
				}
			}
		} else {
			return url;
		}
	};

}

function addVolumeFunctions(AblePlayer) {

	AblePlayer.prototype.addVolumeSlider = function($div) {

		// Prior to v4.4.64, we were using a custom-build vertical volunme slider
		// Changed to input type="range" because it's standard and gaining more widespread support
		// including screen reader support
		// TODO: Improve presentation of vertical slider. That requires some CSS finesse.

		var thisObj, volumeSliderId, volumeHelpId, volumePct, volumeLabel, volumeHeight;

		thisObj = this;

		// define a few variables
		volumeSliderId = this.mediaId + '-volume-slider';
		volumeHelpId = this.mediaId + '-volume-help';

		this.$volumeSlider = $('<div>',{
			'id': volumeSliderId,
			'class': 'able-volume-slider',
			'aria-hidden': 'true'
		}).hide();
		this.$volumeSliderTooltip = $('<div>',{
			'class': 'able-tooltip',
			'role': 'tooltip'
		}).hide();
		this.$volumeRange = $('<input>',{
			'type': 'range',
			'min': '0',
			'max': '10',
			'step': '1',
			'orient': 'vertical', // non-standard, but required for Firefox
			'aria-label': this.translate( 'volumeUpDown', 'Volume up down' ),
			'value': this.volume
		});
		volumePct = parseInt(thisObj.volume) / 10 * 100;
		this.$volumeHelp = $('<div>',{
			'id': volumeHelpId,
			'class': 'able-volume-help',
			'aria-live': 'polite'
		}).text(volumePct + '%');
		volumeLabel = this.$volumeButton.attr( 'aria-label' );
		this.$volumeButton.attr( 'aria-label', volumeLabel + ' ' + volumePct + '%');
		this.$volumeSlider.append(this.$volumeSliderTooltip,this.$volumeRange,this.$volumeHelp);
		volumeHeight = this.$volumeButton.parents( '.able-control-row' )[0];
		this.$volumeSlider.css( 'bottom', volumeHeight.offsetHeight );

		$div.append(this.$volumeSlider);

		// add event listeners
		this.$volumeRange.on('change',function (e) {
			thisObj.handleVolumeChange($(this).val());
		});

		this.$volumeRange.on('input',function (e) {
			thisObj.handleVolumeChange($(this).val());
		});

		this.$volumeRange.on('keydown',function (e) {

			if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') {
				// close popup
				if (thisObj.$volumeSlider.is(':visible')) {
					thisObj.closingVolume = true; // stopgap
					thisObj.hideVolumePopup();
				} else {
					if (!thisObj.closingVolume) {
						thisObj.showVolumePopup();
					}
				}
			} else {
				return;
			}
		});
	};

	AblePlayer.prototype.refreshVolumeHelp = function(volume) {

		// make adjustments based on current volume
		var volumePct;
		volumePct = (volume/10) * 100;

		// Update help text
		if (this.$volumeHelp) {
			this.$volumeHelp.text(volumePct + '%');
		}

		// Update the default value of the volume slider input field
		// This doesn't seem to be necessary; browsers remember the previous setting during a session
		// but this is a fallback in case they don't
		this.$volumeRange.attr('value',volume);
	};

	AblePlayer.prototype.refreshVolumeButton = function(volume) {

		var volumeName, volumePct, volumeLabel;

		volumeName = this.getVolumeName(volume);
		volumePct = (volume/10) * 100;
		volumeLabel = this.translate( 'volume', 'Volume' ) + ' ' + volumePct + '%';

		this.getIcon( this.$volumeButton, 'volume-' + volumeName );
		this.$volumeButton.attr( 'aria-label', volumeLabel );
	};

	AblePlayer.prototype.handleVolumeButtonClick = function() {

		if (this.$volumeSlider.is(':visible')) {
			this.hideVolumePopup();
		} else {
			this.showVolumePopup();
		}
	};

	AblePlayer.prototype.handleVolumeKeystroke = function(volume) {
		// keyboard shortcuts for changing volume
		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		} else if (volume === 0) {
			this.setMute(true);
		} else {
			this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
			this.refreshVolumeHelp(volume);
			this.refreshVolumeButton(volume);
		}
	};


	AblePlayer.prototype.handleVolumeChange = function(volume) {

		// handle volume change using the volume input slider

		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		} else if (volume === 0) {
			this.setMute(true);
		} else {
			this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
			this.refreshVolumeHelp(volume);
			this.refreshVolumeButton(volume);
		}
	};

	AblePlayer.prototype.handleMute = function() {

		if (this.isMuted()) {
			this.setMute(false);
		} else {
			this.setMute(true);
		}
	};

	AblePlayer.prototype.showVolumePopup = function() {

		this.closePopups();
		this.$tooltipDiv.hide();
		this.$volumeSlider.show().attr('aria-hidden','false');
		this.$volumeButton.attr('aria-expanded','true');
		this.$volumeButton.focus(); // for screen reader expanded state to be read
		this.waitThenFocus(this.$volumeRange);
	};

	AblePlayer.prototype.hideVolumePopup = function() {

		var thisObj = this;

		this.$volumeSlider.hide().attr('aria-hidden','true');
		this.$volumeButton.attr('aria-expanded','false').focus();
		// wait a second before resetting stopgap var
		// otherwise the keypress used to close volume popup will trigger the volume button
		setTimeout(function() {
			thisObj.closingVolume = false;
		}, 1000);
	};

	AblePlayer.prototype.isMuted = function () {

		if (this.player === 'html5') {
			return this.media.muted;
		} else if (this.player === 'youtube') {
			return this.youTubePlayer.isMuted();
		}
	};

	AblePlayer.prototype.setMute = function(mute) {

		// mute is either true (muting) or false (unmuting)
		if (mute) {
			// save current volume so it can be restored after unmute
			this.lastVolume = this.volume;
			this.volume = 0;
		} else { // restore to previous volume
			if (typeof this.lastVolume !== 'undefined') {
				this.volume = this.lastVolume;
			}
		}

		if (this.player === 'html5') {
			this.media.muted = mute;
		} else if (this.player === 'youtube') {
			if (mute) {
				this.youTubePlayer.mute();
			} else {
				this.youTubePlayer.unMute();
			}
		}
		this.setVolume(this.volume);
		this.refreshVolumeHelp(this.volume);
		this.refreshVolumeButton(this.volume);
	};

	AblePlayer.prototype.setVolume = function (volume) {

		// volume is 1 to 10
		// convert as needed depending on player

		var newVolume;
		this.syncSignVideo( {'volume' : 0 } );
		if (this.player === 'html5') {
			// volume is 0 to 1
			newVolume = volume / 10;
			this.media.volume = newVolume;
		} else if (this.player === 'youtube') {
			// volume is 0 to 100
			newVolume = volume * 10;
			this.youTubePlayer.setVolume(newVolume);
			this.volume = volume;
		} else if (this.player === 'vimeo') {
			// volume is 0 to 1
			newVolume = volume / 10;
			this.vimeoPlayer.setVolume(newVolume).then(function() {
				// setVolume finished.
				// successful completion also fires a 'volumechange' event (see event.js)
			});
		}
		this.lastVolume = volume;
	};

	AblePlayer.prototype.getVolume = function (volume) {

		// return volume using common audio control scale 1 to 10
		if (this.player === 'html5') {
			// uses 0 to 1 scale
			return this.media.volume * 10;
		} else if (this.player === 'youtube') {
			// uses 0 to 100 scale
			if (this.youTubePlayerReady) {
				return this.youTubePlayer.getVolume() / 10;
			}
		}
		if (this.player === 'vimeo') {
			// uses 0 to 1 scale
			// this.vimeoPlayer.getVolume() takes too long to resolve with a value
			// Just use variable that's already been defined (should be the same value anyway)
			return this.volume;
		}
	};

	AblePlayer.prototype.getVolumeName = function (volume) {

		// returns 'mute','soft','medium', or 'loud' depending on volume level
		if (volume == 0) {
			return 'mute';
		} else if (volume == 10) {
			return 'loud';
		} else if (volume < 5) {
			return 'soft';
		} else {
			return 'medium';
		}
	};

}

/* Video Transcript Sorter (VTS)
 * Used to synchronize time stamps from WebVTT resources
 * so they appear in the proper sequence within an auto-generated interactive transcript
*/


function addVtsFunctions(AblePlayer) {
	AblePlayer.prototype.injectVTS = function() {

		var thisObj, $heading, $instructions, $p1, $p2, $ul, $li1, $li2, $li3,
		$fieldset, $legend, i, $radioDiv, radioId, $label, $radio, $saveButton, $savedTable;

		thisObj = this;

		if ( null !== document.getElementById( 'able-vts' ) ) {
			// Are they qualifying tracks?
			if (this.vtsTracks.length) {
				// Build an array of unique languages
				this.langs = [];
				this.getAllLangs(this.vtsTracks);

				// Set the default VTS language
				this.vtsLang = this.lang;

				// Inject a heading
				let heading = this.translate( 'vtsHeading', 'Video Transcript Sorter' );
				$heading = $('<h2>').text( heading ); // TODO: intelligently assign proper heading level
				$('#able-vts').append($heading);

				// Inject an empty div for writing messages
				this.$vtsAlert = $('<div>',{
					'id': 'able-vts-alert',
					'aria-live': 'polite',
					'aria-atomic': 'true'
				});
				$('#able-vts').append(this.$vtsAlert);

				// Inject instructions (TODO: Localize)
				$instructions = $('<div>',{
					'id': 'able-vts-instructions'
				});
				$p1 = $('<p>').text( this.translate( 'vtsInstructions1', 'Use the Video Transcript Sorter to modify text tracks:' ) );
				$ul = $('<ul>');
				$li1 = $('<li>').text( this.translate( 'vtsInstructions2', 'Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player\'s auto-generated transcript.' ) );
				$li2 = $('<li>').text( this.translate( 'vtsInstructions3', 'Modify content or start/end times (all are directly editable within the table).' ) );
				$li3 = $('<li>').text( this.translate( 'vtsInstructions4', 'Add new content, such as chapters or descriptions.' ) );
				$p2 = $('<p>').text( this.translate( 'vtsInstructions5', 'After editing, click the "Save Changes" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.' ) );
				$ul.append($li1,$li2,$li3);
				$instructions.append($p1,$ul,$p2);
				$('#able-vts').append($instructions);

				// Inject a fieldset with radio buttons for each language
				$fieldset = $('<fieldset>');
				$legend = $('<legend>').text( this.translate( 'vtsSelectLanguage', 'Select a language' ) );
				$fieldset.append($legend);
				let $fieldWrapper = $( '<div class="vts-lang-selector"></div>' );
				for (i in this.langs) {
					radioId = 'vts-lang-radio-' + this.langs[i];
					$radioDiv = $('<div>',{
						// uncomment the following if label is native name
						// 'lang': this.langs[i]
					});
					$radio = $('<input>', {
						'type': 'radio',
						'name': 'vts-lang',
						'id': radioId,
						'value': this.langs[i]
					}).on('click',function() {
						thisObj.vtsLang = $(this).val();
						thisObj.showVtsAlert('Loading ' + thisObj.getLanguageName(thisObj.vtsLang) + ' tracks');
						thisObj.injectVtsTable('update',thisObj.vtsLang);
					});
					if (this.langs[i] == this.lang) {
						// this is the default language.
						$radio.prop('checked',true);
					}
					$label = $('<label>', {
						'for': radioId
						// Two options for label:
						// getLanguageName() - with second parameter "local" would return native name, otherwise returns English;
						// TODO: if using this be sure to add lang attr to <div> (see above)
					}).text(this.getLanguageName(this.langs[i]));
					$radioDiv.append($radio,$label);
					$fieldWrapper.append($radioDiv);
				}
				$fieldset.append( $fieldWrapper );
				$('#able-vts').append($fieldset);
				let vtsSave = this.translate( 'vtsSave', 'Generate new .vtt content' );
				// Inject a button to generate new files.
				$saveButton = $('<button>',{
					'type': 'button',
					'id': 'able-vts-save',
					'value': 'save'
				}).text( vtsSave );
				$('#able-vts').append($saveButton);

				// Inject a table with one row for each cue in the default language
				this.injectVtsTable('add',this.vtsLang);

				// TODO: Add drag/drop functionality for mousers
				// Add event listeners for contenteditable cells
				var kindOptions, beforeEditing, editedCell, editedContent;
				kindOptions = ['captions','chapters','descriptions','subtitles'];
				$('td[contenteditable="true"]').on('focus',function() {
					beforeEditing = $(this).text();
				}).on('blur',function() {
					if (beforeEditing != $(this).text()) {
						editedCell = $(this).index();
						editedContent = $(this).text();
						if (editedCell === 1) {
							// do some simple spelling auto-correct
							if ($.inArray(editedContent,kindOptions) === -1) {
								// whatever user typed is not a valid kind
								// assume they correctly typed the first character
								if (editedContent.substring(0,1) === 's') {
									$(this).text('subtitles');
								} else if (editedContent.substring(0,1) === 'd') {
									$(this).text('descriptions');
								} else if (editedContent.substring(0,2) === 'ch') {
									$(this).text('chapters');
								} else {
									// whatever else they types, assume 'captions'
									$(this).text('captions');
								}
							}
						} else if (editedCell === 2 || editedCell === 3) {
							// start or end time
							// ensure proper formatting (with 3 decimal places)
							$(this).text(thisObj.formatTimestamp(editedContent));
						}
					}
				}).on('keydown',function(e) {
					// don't allow keystrokes to trigger Able Player (or other) functions
					// while user is editing
					e.stopPropagation();
				});

				// handle click on the Save button
				$('#able-vts-save').on('click',function(e) {
					e.stopPropagation();
					if ($(this).attr('value') == 'save') {
						// replace table with WebVTT output in textarea fields (for copying/pasting)
						$(this).attr('value','cancel').text( thisObj.translate( 'vtsReturn', 'Return to Editor' ) );
						$savedTable = $('#able-vts table');
						$('#able-vts-instructions').hide();
						$('#able-vts > fieldset').hide();
						$('#able-vts table').remove();
						$('#able-vts-icon-credit').remove();
						thisObj.parseVtsOutput($savedTable);
					} else {
						// cancel saving, and restore the table using edited content
						$(this).attr('value','save').text( vtsSave );
						$('#able-vts-output').remove();
						$('#able-vts-instructions').show();
						$('#able-vts > fieldset').show();
						$('#able-vts').append($savedTable);
						$('#able-vts').append(thisObj.getIconCredit());
						thisObj.showVtsAlert( thisObj.translate( 'vtsCancel', 'Cancelling saving. Any edits you made have been restored in the VTS table.' ) );
					}
				});
			}
		}
	};

	AblePlayer.prototype.setupVtsTracks = function(kind, lang, trackDesc, label, src, contents) {

		// TODO: Add support for trackDesc
		// (to destinguish between tracks for the decribed vs non-described versions)
		var srcFile, vtsCues;

		srcFile = this.getFilenameFromPath(src);
		vtsCues = this.parseVtsTracks(contents);

		this.vtsTracks.push({
			'kind': kind,
			'language': lang,
			'label': label,
			'srcFile': srcFile,
			'cues': vtsCues
		});
	};

	AblePlayer.prototype.getFilenameFromPath = function(path) {

		var lastSlash;
		lastSlash = path.lastIndexOf('/');
		// fix slashes.
		return (lastSlash === -1) ? path : path.substring(lastSlash+1);
	};

	AblePlayer.prototype.getFilenameFromTracks = function(kind,lang) {

		for (var i=0; i<this.vtsTracks.length; i++) {
			if (this.vtsTracks[i].kind === kind && this.vtsTracks[i].language === lang) {
				// this is a matching track
				// srcFile has already been converted to filename from path before saving to vtsTracks
				return this.vtsTracks[i].srcFile;
			}
		}
		// no matching track found
		return false;
	};

	AblePlayer.prototype.parseVtsTracks = function(contents) {

		var rows, timeParts, cues, i, j, thisRow, nextRow, content, blankRow;
		rows = contents.split("\n");
		cues = [];
		i = 0;
		while (i < rows.length) {
			thisRow = rows[i];
			if (thisRow.indexOf(' --> ') !== -1) {
				// this is probably a time row
				timeParts = thisRow.trim().split(' ');
				if (this.isValidTimestamp(timeParts[0]) && this.isValidTimestamp(timeParts[2])) {
					// both timestamps are valid. This is definitely a time row
					content = '';
					j = i+1;
					blankRow = false;
					while (j < rows.length && !blankRow) {
						nextRow = rows[j].trim();
						if (nextRow.length > 0) {
							if (content.length > 0) {
								// add back the EOL between rows of content
								content += "\n" + nextRow;
							} else {
								// this is the first row of content. No need for an EOL
								content += nextRow;
							}
						} else {
							blankRow = true;
						}
						j++;
					}
					cues.push({
						'start': timeParts[0],
						'end': timeParts[2],
						'content': content
					});
					i = j; //skip ahead
				}
			} else {
				i++;
			}
		}
		return cues;
	};

	AblePlayer.prototype.isValidTimestamp = function(timestamp) {

		// return true if timestamp contains only numbers or expected punctuation
		return (/^[0-9:,.]*$/.test(timestamp)) ? true : false;
	};

	AblePlayer.prototype.formatTimestamp = function(timestamp) {

		// timestamp is a string in the form "HH:MM:SS.xxx"
		// Take some simple steps to ensure edited timestamp values still adhere to expected format

		var firstPart, lastPart;

		firstPart = timestamp.substring(0,timestamp.lastIndexOf('.')+1);
		lastPart = timestamp.substring(timestamp.lastIndexOf('.')+1);

		// TODO: Be sure each component within firstPart has only exactly two digits
		// Probably can't justify doing this automatically
		// If users enters '5' for minutes, that could be either '05' or '50'
		// This should trigger an error and prompt the user to correct the value before proceeding

		// Be sure lastPart has exactly three digits
		if (lastPart.length > 3) {
			// chop off any extra digits
			lastPart = lastPart.substring(0,3);
		} else if (lastPart.length < 3) {
			// add trailing zeros
			while (lastPart.length < 3) {
				lastPart += '0';
			}
		}
		return firstPart + lastPart;
	};


	AblePlayer.prototype.injectVtsTable = function(action,lang) {

		// action is either 'add' (for a new table) or 'update' (if user has selected a new lang)

		var $table, $thead, headers, i, $tr, $th, $td, rows, rowNum, rowId;

		if (action === 'update') {
			// remove existing table
			$('#able-vts table').remove();
			$('#able-vts-icon-credit').remove();
		}

		$table = $('<table>',{
			'lang': lang
		});
		$thead = $( '<thead>' );
		$tr = $( '<tr>' );
		headers = [
			this.translate( 'vtsRow', 'Row' ),
			this.translate( 'vtsKind', 'Kind' ),
			this.translate( 'vtsStart', 'Start' ),
			this.translate( 'vtsEnd', 'End' ),
			this.translate( 'vtsContent', 'Content' ),
			this.translate( 'vtsActions', 'Actions' )
		];
		for (i=0; i < headers.length; i++) {
			$th = $('<th>', {
				'scope': 'col'
			}).text(headers[i]);
			if (headers[i] === 'Actions') {
				$th.addClass('actions');
			}
			$tr.append($th);
		}
		$thead.append($tr);
		$table.append($thead);

		// Get all rows (sorted by start time), and inject them into table
		rows = this.getAllRows(lang);
		for (i=0; i < rows.length; i++) {
			rowNum = i + 1;
			rowId = 'able-vts-row-' + rowNum;
			$tr = $('<tr>',{
				'id': rowId,
				'class': 'kind-' + rows[i].kind
			});
			// Row #
			$td = $('<td>').text(rowNum);
			$tr.append($td);

			// Kind
			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].kind);
			$tr.append($td);

			// Start
			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].start);
			$tr.append($td);

			// End
			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].end);
			$tr.append($td);

			// Content
			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].content); // TODO: Preserve tags
			$tr.append($td);

					// Actions
			$td = this.addVtsActionButtons(rowNum,rows.length);
			$tr.append($td);

			$table.append($tr);
		}
		$('#able-vts').append($table);

		// Add credit for action button SVG icons
		$('#able-vts').append(this.getIconCredit());

	};

	AblePlayer.prototype.addVtsActionButtons = function(rowNum,numRows) {

		// rowNum is the number of the current table row (starting with 1)
		// numRows is the total number of rows (excluding the header row)
		// TODO: Position buttons so they're vertically aligned, even if missing an Up or Down button
		var thisObj, $td, buttons, i, button, $button, $svg, $g, pathString, pathString2, $path, $path2;
		thisObj = this;
		$td = $('<td>');
		buttons = ['up','down','insert','delete'];

		for (i=0; i < buttons.length; i++) {
			button = buttons[i];
			if (button === 'up') {
				if (rowNum > 1) {
					$button = $('<button>',{
						'id': 'able-vts-button-up-' + rowNum,
						'title': 'Move up',
						'aria-label': 'Move Row ' + rowNum + ' up'
					}).on('click', function(el) {
						thisObj.onClickVtsActionButton(el.currentTarget);
					});
					$svg = $('<svg>',{
						'focusable': 'false',
						'aria-hidden': 'true',
						'x': '0px',
						'y': '0px',
						'width': '254.296px',
						'height': '254.296px',
						'viewBox': '0 0 254.296 254.296',
						'style': 'enable-background:new 0 0 254.296 254.296'
					});
					pathString = 'M249.628,176.101L138.421,52.88c-6.198-6.929-16.241-6.929-22.407,0l-0.381,0.636L4.648,176.101'
						+ 'c-6.198,6.897-6.198,18.052,0,24.981l0.191,0.159c2.892,3.305,6.865,5.371,11.346,5.371h221.937c4.577,0,8.613-2.161,11.41-5.594'
						+ 'l0.064,0.064C255.857,194.153,255.857,182.998,249.628,176.101z';
					$path = $('<path>',{
						'd': pathString
					});
					$g = $('<g>').append($path);
					$svg.append($g);
					$button.append($svg);
					// Refresh button in the DOM in order for browser to process & display the SVG
					$button.html($button.html());
					$td.append($button);
				}
			} else if (button === 'down') {
				if (rowNum < numRows) {
					$button = $('<button>',{
						'id': 'able-vts-button-down-' + rowNum,
						'title': 'Move down',
						'aria-label': 'Move Row ' + rowNum + ' down'
					}).on('click', function(el) {
						thisObj.onClickVtsActionButton(el.currentTarget);
					});
					$svg = $('<svg>',{
						'focusable': 'false',
						'aria-hidden': 'true',
						'x': '0px',
						'y': '0px',
						'width': '292.362px',
						'height': '292.362px',
						'viewBox': '0 0 292.362 292.362',
						'style': 'enable-background:new 0 0 292.362 292.362'
					});
					pathString = 'M286.935,69.377c-3.614-3.617-7.898-5.424-12.848-5.424H18.274c-4.952,0-9.233,1.807-12.85,5.424'
						+ 'C1.807,72.998,0,77.279,0,82.228c0,4.948,1.807,9.229,5.424,12.847l127.907,127.907c3.621,3.617,7.902,5.428,12.85,5.428'
						+ 's9.233-1.811,12.847-5.428L286.935,95.074c3.613-3.617,5.427-7.898,5.427-12.847C292.362,77.279,290.548,72.998,286.935,69.377z';
					$path = $('<path>',{
						'd': pathString
					});
					$g = $('<g>').append($path);
					$svg.append($g);
					$button.append($svg);
					// Refresh button in the DOM in order for browser to process & display the SVG
					$button.html($button.html());
					$td.append($button);
				}
			} else if (button === 'insert') {
				// Add Insert button to all rows
				$button = $('<button>',{
					'id': 'able-vts-button-insert-' + rowNum,
					'title': 'Insert row below',
					'aria-label': 'Insert row before Row ' + rowNum
				}).on('click', function(el) {
					thisObj.onClickVtsActionButton(el.currentTarget);
				});
				$svg = $('<svg>',{
					'focusable': 'false',
					'aria-hidden': 'true',
					'x': '0px',
					'y': '0px',
					'width': '401.994px',
					'height': '401.994px',
					'viewBox': '0 0 401.994 401.994',
					'style': 'enable-background:new 0 0 401.994 401.994'
				});
				pathString = 'M394,154.175c-5.331-5.33-11.806-7.994-19.417-7.994H255.811V27.406c0-7.611-2.666-14.084-7.994-19.414'
					+ 'C242.488,2.666,236.02,0,228.398,0h-54.812c-7.612,0-14.084,2.663-19.414,7.993c-5.33,5.33-7.994,11.803-7.994,19.414v118.775'
					+ 'H27.407c-7.611,0-14.084,2.664-19.414,7.994S0,165.973,0,173.589v54.819c0,7.618,2.662,14.086,7.992,19.411'
					+ 'c5.33,5.332,11.803,7.994,19.414,7.994h118.771V374.59c0,7.611,2.664,14.089,7.994,19.417c5.33,5.325,11.802,7.987,19.414,7.987'
					+ 'h54.816c7.617,0,14.086-2.662,19.417-7.987c5.332-5.331,7.994-11.806,7.994-19.417V255.813h118.77'
					+ 'c7.618,0,14.089-2.662,19.417-7.994c5.329-5.325,7.994-11.793,7.994-19.411v-54.819C401.991,165.973,399.332,159.502,394,154.175z';
				$path = $('<path>',{
					'd': pathString
				});
				$g = $('<g>').append($path);
				$svg.append($g);
				$button.append($svg);
				// Refresh button in the DOM in order for browser to process & display the SVG
				$button.html($button.html());
				$td.append($button);
			} else if (button === 'delete') {
				// Add Delete button to all rows
				$button = $('<button>',{
					'id': 'able-vts-button-delete-' + rowNum,
					'title': 'Delete row ',
					'aria-label': 'Delete Row ' + rowNum
				}).on('click', function(el) {
					thisObj.onClickVtsActionButton(el.currentTarget);
				});
				$svg = $('<svg>',{
					'focusable': 'false',
					'aria-hidden': 'true',
					'x': '0px',
					'y': '0px',
					'width': '508.52px',
					'height': '508.52px',
					'viewBox': '0 0 508.52 508.52',
					'style': 'enable-background:new 0 0 508.52 508.52'
				});
				pathString = 'M397.281,31.782h-63.565C333.716,14.239,319.478,0,301.934,0h-95.347'
					+ 'c-17.544,0-31.782,14.239-31.782,31.782h-63.565c-17.544,0-31.782,14.239-31.782,31.782h349.607'
					+ 'C429.063,46.021,414.825,31.782,397.281,31.782z';
				$path = $('<path>',{
					'd': pathString
				});
				pathString2 = 'M79.456,476.737c0,17.544,14.239,31.782,31.782,31.782h286.042'
					+ 'c17.544,0,31.782-14.239,31.782-31.782V95.347H79.456V476.737z M333.716,174.804c0-8.772,7.151-15.891,15.891-15.891'
					+ 'c8.74,0,15.891,7.119,15.891,15.891v254.26c0,8.74-7.151,15.891-15.891,15.891c-8.74,0-15.891-7.151-15.891-15.891V174.804z'
					+ 'M238.369,174.804c0-8.772,7.119-15.891,15.891-15.891c8.74,0,15.891,7.119,15.891,15.891v254.26'
					+ 'c0,8.74-7.151,15.891-15.891,15.891c-8.772,0-15.891-7.151-15.891-15.891V174.804z M143.021,174.804'
					+ 'c0-8.772,7.119-15.891,15.891-15.891c8.772,0,15.891,7.119,15.891,15.891v254.26c0,8.74-7.119,15.891-15.891,15.891'
					+ 'c-8.772,0-15.891-7.151-15.891-15.891V174.804z';
				$path2 = $('<path>',{
					'd': pathString2
				});

				$g = $('<g>').append($path,$path2);
				$svg.append($g);
				$button.append($svg);
				// Refresh button in the DOM in order for browser to process & display the SVG
				$button.html($button.html());
				$td.append($button);
			}
		}
		return $td;
	};

	AblePlayer.prototype.updateVtsActionButtons = function($buttons,nextRowNum) {

		// TODO: Add some filters to this function to add or delete 'Up' and 'Down' buttons
		// if row is moved to/from the first/last rows
		var i, $thisButton, id, label, newId, newLabel;
		for (i=0; i < $buttons.length; i++) {
			$thisButton = $buttons.eq(i);
			id = $thisButton.attr('id');
			label = $thisButton.attr('aria-label');
			// replace the integer (id) within each of the above strings
			newId = id.replace(/[0-9]+/g, nextRowNum);
			newLabel = label.replace(/[0-9]+/g, nextRowNum);
			$thisButton.attr('id',newId);
			$thisButton.attr('aria-label',newLabel);
		}
	};

	AblePlayer.prototype.getIconCredit = function() {

		var credit
			= 'Action buttons made by <a target="_blank" rel="noreferrer" href="https://www.elegantthemes.com">Elegant Themes</a>'
			+ ' from <a target="_blank" rel="noreferrer" href="https://www.flaticon.com">flaticon</a>'
			+ ' are licensed by <a target="_blank" rel="noreferrer" href="https://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC 3.0 BY</a>'
		;
		return '<div id="able-vts-icon-credit">' + credit + '</div>';
	};

	AblePlayer.prototype.getAllLangs = function(tracks) {

		// update this.langs with any unique languages found in tracks
		var i;
		for (i in tracks) {
			if (Object.hasOwn(tracks[i], 'language')) {
				if ($.inArray(tracks[i].language,this.langs) === -1) {
					// this language is not already in the langs array. Add it.
					this.langs[this.langs.length] = tracks[i].language;
				}
			}
		}
	};

	AblePlayer.prototype.getAllRows = function(lang) {

		// returns an array of data to be displayed in VTS table
		// includes all cues for tracks of any type with matching lang
		// cues are sorted by start time
		var i, track, c, cues;
		cues = [];
		for (i=0; i < this.vtsTracks.length; i++) {
			track = this.vtsTracks[i];
			if (track.language == lang) {
				// this track matches the language. Add its cues to array
				for (c in track.cues) {
					cues.push({
						'kind': track.kind,
						'lang': lang,
						'id': track.cues[c].id,
						'start': track.cues[c].start,
						'end': track.cues[c].end,
						'content': track.cues[c].content
					});
				}
			}
		}
		// Now sort cues by start time
		cues.sort(function(a,b) {
			return a.start > b.start ? 1 : -1;
		});
		return cues;
	};


	AblePlayer.prototype.onClickVtsActionButton = function(el) {

		// handle click on up, down, insert, or delete button
		var idParts, action, rowNum;
		idParts = $(el).attr('id').split('-');
		action = idParts[3];
		rowNum = idParts[4];
		if (action == 'up') {
			// move the row up
			this.moveRow(rowNum,'up');
		} else if (action == 'down') {
			// move the row down
			this.moveRow(rowNum,'down');
		} else if (action == 'insert') {
			// insert a row below
			this.insertRow(rowNum);
		} else if (action == 'delete') {
			// delete the row
			this.deleteRow(rowNum);
		}
	};

	AblePlayer.prototype.insertRow = function(rowNum) {

		// Insert empty row below rowNum
		var $table, $rows, numRows, newRowNum, newRowId, $tr, $td, $select,
		options, i, $option, newKind, newClass, $parentRow, nextRowNum, $buttons;

		$table = $('#able-vts table');
		$rows = $table.find('tr');

		numRows = $rows.length - 1; // exclude header row

		newRowNum = parseInt(rowNum) + 1;
		newRowId = 'able-vts-row-' + newRowNum;

		// Create an empty row
		$tr = $('<tr>',{
			'id': newRowId
		});

		// Row #
		$td = $('<td>').text(newRowNum);
		$tr.append($td);

		// Kind (add a select field for chosing a kind)
		newKind = null;
		$select = $('<select>',{
			'id': 'able-vts-kind-' + newRowNum,
			'aria-label': 'What kind of track is this?',
			'placeholder': 'Select a kind'
		}).on('change',function() {
			newKind = $(this).val();
			newClass = 'kind-' + newKind;
			$parentRow = $(this).closest('tr');
			// replace the select field with the chosen value as text
			$(this).parent().text(newKind);
			// add a class to the parent row
			$parentRow.addClass(newClass);
		});
		options = ['','captions','chapters','descriptions','subtitles'];
		for (i=0; i<options.length; i++) {
			$option = $('<option>',{
				'value': options[i]
			}).text(options[i]);
			$select.append($option);
		}
		$td = $('<td>').append($select);
		$tr.append($td);

		// Start
		$td = $('<td>',{
			'contenteditable': 'true'
		}); // TODO; Intelligently assign a new start time (see getAdjustedTimes())
		$tr.append($td);

		// End
		$td = $('<td>',{
			'contenteditable': 'true'
		}); // TODO; Intelligently assign a new end time (see getAdjustedTimes())
		$tr.append($td);

		// Content
		$td = $('<td>',{
			'contenteditable': 'true'
		});
		$tr.append($td);

		// Actions
		$td = this.addVtsActionButtons(newRowNum,numRows);
		$tr.append($td);

		// Now insert the new row
		$table.find('tr').eq(rowNum).after($tr);

		// Update row.id, Row # cell, & action items for all rows after the inserted one
		for (i=newRowNum; i <= numRows; i++) {
			nextRowNum = i + 1;
			$rows.eq(i).attr('id','able-vts-row-' + nextRowNum); // increment tr id
			$rows.eq(i).find('td').eq(0).text(nextRowNum); // increment Row # as expressed in first td
			$buttons = $rows.eq(i).find('button');
			this.updateVtsActionButtons($buttons,nextRowNum);
		}

		// Auto-adjust times
		this.adjustTimes(newRowNum);

		// Announce the insertion
		let newAlert = this.translate( 'vtsNewRow', 'A new row %1 has been inserted.', [ newRowNum ] );
		this.showVtsAlert( newAlert );

		// Place focus in new select field
		$select.trigger('focus');

	};

	AblePlayer.prototype.deleteRow = function(rowNum) {

		var $table, $rows, numRows, i, nextRowNum, $buttons;

		$table = $('#able-vts table');
		$table[0].deleteRow(rowNum);
		$rows = $table.find('tr'); // this does not include the deleted row
		numRows = $rows.length - 1; // exclude header row

		// Update row.id, Row # cell, & action buttons for all rows after the deleted one
		for (i=rowNum; i <= numRows; i++) {
			nextRowNum = i;
			$rows.eq(i).attr('id','able-vts-row-' + nextRowNum); // increment tr id
			$rows.eq(i).find('td').eq(0).text(nextRowNum); // increment Row # as expressed in first td
			$buttons = $rows.eq(i).find('button');
			this.updateVtsActionButtons($buttons,nextRowNum);
		}

		// Announce the deletion
		let newAlert = this.translate( 'vtsDeletedRow', 'Row %1 has been deleted.', [ rowNum ] );
		this.showVtsAlert( newAlert );

	};

	AblePlayer.prototype.moveRow = function(rowNum,direction) {

		// swap two rows
		var $thisRow, otherRowNum, $otherRow, msg;

		$thisRow = $('#able-vts table').find('tr').eq(rowNum);
		if (direction == 'up') {
			otherRowNum = parseInt(rowNum) - 1;
			$otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
			$otherRow.before($thisRow);
		} else if (direction == 'down') {
			otherRowNum = parseInt(rowNum) + 1;
			$otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
			$otherRow.after($thisRow);
		}
		// Update row.id, Row # cell, & action buttons for the two swapped rows
		$thisRow.attr('id','able-vts-row-' + otherRowNum);
		$thisRow.find('td').eq(0).text(otherRowNum);
		this.updateVtsActionButtons($thisRow.find('button'),otherRowNum);
		$otherRow.attr('id','able-vts-row-' + rowNum);
		$otherRow.find('td').eq(0).text(rowNum);
		this.updateVtsActionButtons($otherRow.find('button'),rowNum);

		// auto-adjust times
		this.adjustTimes(otherRowNum);

		// Announce the move
		msg = this.translate( 'vtsMovedRow', 'Row %1 has been moved %2 and is now Row %3.', [ rowNum, direction, otherRowNum ] );
		this.showVtsAlert(msg);
	};

	AblePlayer.prototype.adjustTimes = function(rowNum) {

		// Adjusts start and end times of the current, previous, and next rows in VTS table
		// after a move or insert
		// NOTE: Fully automating this process would be extraordinarily complicated
		// The goal here is simply to make subtle tweaks to ensure rows appear
		// in the new order within the Able Player transcript
		// Additional tweaking will likely be required by the user

		// HISTORY: Originally set minDuration to 2 seconds for captions and .500 for descriptions
		// However, this can results in significant changes to existing caption timing,
		// with not-so-positive results.
		// As of 3.1.15, setting minDuration to .001 for all track kinds
		// Users will have to make further adjustments manually if needed

		// TODO: Add WebVTT validation on save, since tweaking times is risky

		var	 minDuration, $rows, prevRowNum, nextRowNum, $row, $prevRow, $nextRow,
				kind, prevKind, nextKind,
				start, prevStart, nextStart,
				end, prevEnd, nextEnd;

		// Define minimum duration (in seconds) for each kind of track
		minDuration = [];
		minDuration['captions'] = .001;
		minDuration['descriptions'] = .001;
		minDuration['chapters'] = .001;

		// refresh rows object
		$rows = $('#able-vts table').find('tr');

		// Get kind, start, and end from current row
		$row = $rows.eq(rowNum);
		// row has a class that starts with "kind-"
		// Extract kind from the class name
		kind = ($row.is('[class^="kind-"]')) ? this.getKindFromClass($row.attr('class')) : 'captions';

		start = this.getSecondsFromColonTime($row.find('td').eq(2).text());
		end = this.getSecondsFromColonTime($row.find('td').eq(3).text());

		// Get kind, start, and end from previous row
		if (rowNum > 1) {
			// this is not the first row. Include the previous row
			prevRowNum = rowNum - 1;
			$prevRow = $rows.eq(prevRowNum);
			// row has a class that starts with "kind-"
			// Extract kind from the class name
			prevKind = ($prevRow.is('[class^="kind-"]')) ? this.getKindFromClass($prevRow.attr('class')) : null;
			prevStart = this.getSecondsFromColonTime($prevRow.find('td').eq(2).text());
			prevEnd = this.getSecondsFromColonTime($prevRow.find('td').eq(3).text());
		} else {
			// this is the first row
			$prevRow = null;
			prevKind = null;
			prevStart = null;
			prevEnd = null;
		}

		// Get kind, start, and end from next row
		if (rowNum < ($rows.length - 1)) {
			// this is not the last row. Include the next row
			nextRowNum = rowNum + 1;
			$nextRow = $rows.eq(nextRowNum);
			// row has a class that starts with "kind-"
			// Extract kind from the class name
			nextKind = ($nextRow.is('[class^="kind-"]')) ? this.getKindFromClass($nextRow.attr('class')) : null;
			nextStart = this.getSecondsFromColonTime($nextRow.find('td').eq(2).text());
			nextEnd = this.getSecondsFromColonTime($nextRow.find('td').eq(3).text());
		} else {
			// this is the last row
			$nextRow = null;
			nextKind = null;
			nextStart = null;
			nextEnd = null;
		}

		if (isNaN(start)) {
			if (prevKind == null) {
				// The previous row was probably inserted, and user has not yet selected a kind
				// automatically set it to captions
				prevKind = 'captions';
				$prevRow.attr('class','kind-captions');
				$prevRow.find('td').eq(1).html('captions');
			}
			// Current row has no start time (i.e., it's an inserted row)
			if (prevKind === 'captions') {
				// start the new row immediately after the captions end
				start = (parseFloat(prevEnd) + .001).toFixed(3);
				// end the new row immediately before the next row starts
				end = (nextStart) ? (parseFloat(nextStart) - .001).toFixed(3) : (parseFloat(start) + minDuration[kind]).toFixed(3);
			} else if (prevKind === 'chapters') {
				// start the new row immediately after the chapter start (not end)
				start = (parseFloat(prevStart) + .001).toFixed(3);
				// end the new row immediately before the next row starts
				end = (nextStart) ? (parseFloat(nextStart) - .001).toFixed(3) : (parseFloat(start) + minDuration[kind]).toFixed(3);
			} else if (prevKind === 'descriptions') {
				// start the new row minDuration['descriptions'] after the description starts
				// this will theoretically allow at least a small cushion for the description to be read
				start = (parseFloat(prevStart) + minDuration['descriptions']).toFixed(3);
				end = (parseFloat(start) + minDuration['descriptions']).toFixed(3);
			}
		} else {
			// current row has a start time (i.e., an existing row has been moved))
			if (prevStart) {
				// this is not the first row.
				if (prevStart < start) {
					if (start < nextStart) ; else {
						// nextStart needs to be incremented
						nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
						nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
						// TODO: Ensure nextEnd does not exceed the following start (nextNextStart)
						// Or... maybe this is getting too complicated and should be left up to the user
					}
				} else {
					// start needs to be incremented
					start = (parseFloat(prevStart) + minDuration[prevKind]).toFixed(3);
					end = (parseFloat(start) + minDuration[kind]).toFixed(3);
				}
			} else {
				// this is the first row
				if (start < nextStart) ; else {
					// nextStart needs to be incremented
					nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
					nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
				}
			}
		}

		// check to be sure there is sufficient duration between new start & end times
		if (end - start < minDuration[kind]) {
			// duration is too short. Change end time
			end = (parseFloat(start) + minDuration[kind]).toFixed(3);
			if (nextStart) {
				// this is not the last row
				// increase start time of next row
				nextStart = (parseFloat(end) + .001).toFixed(3);
			}
		}

		// Update all affected start/end times
		$row.find('td').eq(2).text(this.formatSecondsAsColonTime(start,true));
		$row.find('td').eq(3).text(this.formatSecondsAsColonTime(end,true));
		if ($prevRow) {
			$prevRow.find('td').eq(2).text(this.formatSecondsAsColonTime(prevStart,true));
			$prevRow.find('td').eq(3).text(this.formatSecondsAsColonTime(prevEnd,true));
		}
		if ($nextRow) {
			$nextRow.find('td').eq(2).text(this.formatSecondsAsColonTime(nextStart,true));
			$nextRow.find('td').eq(3).text(this.formatSecondsAsColonTime(nextEnd,true));
		}
	};

	AblePlayer.prototype.getKindFromClass = function(myclass) {

		// This function is called when a class with prefix "kind-" is found in the class attribute

		var kindStart, kindEnd;

		kindStart = myclass.indexOf('kind-')+5;
		kindEnd = myclass.indexOf(' ',kindStart);
		if (kindEnd == -1) {
			// no spaces found, "kind-" must be the only myclass
			return myclass.substring(kindStart);
		} else {
			// kind-* is one of multiple classes
			// the following will find it regardless of position of "kind-*" within the class string
			return myclass.substring(kindStart,kindEnd);
		}
	};

	AblePlayer.prototype.showVtsAlert = function(message) {

		// this is distinct from greater Able Player showAlert()
		// because it's positioning needs are unique
		// For now, alertDiv is fixed at top left of screen
		// but could ultimately be modified to appear near the point of action in the VTS table
		const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
		this.$vtsAlert.text(message).show();
		delay(10000).then(() => {
			this.$vtsAlert.text(message).hide();
		});
	};

	AblePlayer.prototype.parseVtsOutput = function($table) {

		// parse table into arrays, then into WebVTT content, for each kind
		// Display the WebVTT content in textarea fields for users to copy and paste
		var lang, i, kinds, kind, vtt, $rows, start, end, content, $output;

		lang = $table.attr('lang');
		kinds = ['captions','chapters','descriptions','subtitles'];
		vtt = {};
		for (i=0; i < kinds.length; i++) {
			kind = kinds[i];
			vtt[kind] = 'WEBVTT' + "\n\n";
		}
		$rows = $table.find('tr');
		if ($rows.length > 0) {
			for (i=0; i < $rows.length; i++) {
				kind = $rows.eq(i).find('td').eq(1).text();
				if ($.inArray(kind,kinds) !== -1) {
					start = $rows.eq(i).find('td').eq(2).text();
					end = $rows.eq(i).find('td').eq(3).text();
					content = $rows.eq(i).find('td').eq(4)[0].innerText;
					if (start !== undefined && end !== undefined) {
						vtt[kind] += start + ' --> ' + end + "\n";
						if (content !== 'undefined') {
							vtt[kind] += content;
						}
						vtt[kind] += "\n\n";
					}
				}
			}
		}
		$output = $('<div>',{
			'id': 'able-vts-output'
		});
		$('#able-vts').append($output);
		for (i=0; i < kinds.length; i++) {
			kind = kinds[i];
			if (vtt[kind].length > 8) {
				// some content has been added
				this.showWebVttOutput(kind,vtt[kind],lang);
			}
		}
	};

	AblePlayer.prototype.showWebVttOutput = function(kind,vttString,lang) {

		var $heading, filename, $p, pText, $textarea;

		$heading = $('<h3>').text( this.capitalizeFirstLetter( kind ) );
		filename = this.getFilenameFromTracks(kind,lang);
		pText = 'If you made changes, copy/paste the following content ';
		if (filename) {
			pText += 'to replace the original content of your ' + this.getLanguageName(lang) + ' ';
			pText += '<em>' + kind + '</em> WebVTT file (<strong>' + filename + '</strong>).';
		} else {
			pText += 'into a new ' + this.getLanguageName(lang) + ' <em>' + kind + '</em> WebVTT file.';
		}
		$p = $('<p>',{
			'class': 'able-vts-output-instructions'
		}).html(pText);
		$textarea = $('<textarea>').text(vttString);
		$('#able-vts-output').append($heading,$p,$textarea);
	};

}

function addWebvttFunctions(AblePlayer) {
	// See section 4.1 of dev.w3.org/html5/webvtt for format details.
	AblePlayer.prototype.parseWebVTT = function(data) {

		let srcFile = data.src;
		let text    = data.text;
		// Normalize line ends to \n.
		text = text.replace(/(\r\n|\n|\r)/g,'\n');

		var parserState = {
			src: srcFile,
			text: text,
			error: null,
			metadata: {},
			cues: [],
			line: 1,
			column: 1
		};

		try {
			act(parserState, parseFileBody);
		}
		catch (err) {
			var errString = 'Invalid WebVTT file: ' + parserState.src + '\n';
			errString += 'Line: ' + parserState.line + ', ';
			errString += 'Column: ' + parserState.column + '\n';
			errString += err;
			if (console.warn) {
				console.warn(errString);
			}
		}
		return parserState;
	};

	function actList(state, list) {
		var results = [];
		for (var ii = 0; ii < list.length; ii++) {
			results.push(act(state, list[ii]));
		}
		return results;
	}

	// Applies the action and checks for errors.
	function act(state, action) {
		var val = action(state);
		if (state.error !== null) {
			throw state.error;
		}
		return val;
	}

	function updatePosition(state, cutText) {
		for (var ii = 0; ii < cutText.length; ii++) {
			if (cutText[ii] === '\n') {
				state.column = 1;
				state.line += 1;
			} else {
				state.column += 1;
			}
		}
	}

	function cut(state, length) {
		var returnText = state.text.substring(0, length);
		updatePosition(state, returnText);
		state.text = state.text.substring(length);
		return returnText;
	}

	function cutLine(state) {
		var nextEOL = state.text.indexOf('\n');
		var returnText;
		if (nextEOL === -1) {
			returnText = state.text;
			updatePosition(state, returnText);
			state.text = '';
		} else {
			returnText = state.text.substring(0, nextEOL);
			updatePosition(state, returnText + '\n');
			state.text = state.text.substring(nextEOL + 1);
		}
		return returnText;
	}

	function peekLine(state) {
		var nextEOL = state.text.indexOf('\n');
		return (nextEOL === -1) ? state.text : state.text.substring(0, nextEOL);
	}

	function parseFileBody(state) {
		actList(state, [
			eatOptionalBOM,
			eatSignature]);
		var c = state.text[0];
		if (c === ' ' || c === '\t' || c === '\n') {
			actList(state, [
				eatUntilEOLInclusive,
				parseMetadataHeaders,
				eatAtLeast1EmptyLines,
				parseCuesAndComments]);
		} else {
			state.error = "WEBVTT signature not followed by whitespace.";
		}
	}

	// Parses all metadata headers until a cue is discovered.
	function parseMetadataHeaders(state) {
		while (true) {
			var nextLine = peekLine(state);
			if (nextLine.indexOf('-->') !== -1) {
				return;
			} else if (nextLine.length === 0) {
				return;
			} else {
				var keyValue = act(state, getMetadataKeyValue);
				state.metadata[keyValue[0]] = keyValue[1];
				act(state, eatUntilEOLInclusive);
			}
		}
	}

	function nextSpaceOrNewline(s) {
		var possible = [];
		var spaceIndex = s.indexOf(' ');
		if (spaceIndex >= 0) {
			possible.push(spaceIndex);
		}
		var tabIndex = s.indexOf('\t');
		if (tabIndex >= 0) {
			possible.push(tabIndex);
		}
		var lineIndex = s.indexOf('\n');
		if (lineIndex >= 0) {
			possible.push(lineIndex);
		}

		return Math.min.apply(null, possible);
	}

	function getMetadataKeyValue(state) {
		var next = state.text.indexOf('\n');
		var pair = cut(state, next);
		var colon = pair.indexOf(':');
		if (colon === -1) {
			state.error = 'Missing colon.';
			return;
		} else {
			var pairName = pair.substring(0, colon);
			var pairValue = pair.substring(colon + 1);
			return [pairName, pairValue];
		}
	}

	function getSettingsKeyValue(state) {
		var next = nextSpaceOrNewline(state.text);
		var pair = cut(state, next);
		var colon = pair.indexOf(':');
		if (colon === -1) {
			state.error = 'Missing colon.';
			return;
		} else {
			var pairName = pair.substring(0, colon);
			var pairValue = pair.substring(colon + 1);
			return [pairName, pairValue];
		}
	}

	function parseCuesAndComments(state) {
		while (true) {
			var nextLine = peekLine(state);
			// If NOTE is not on a line all its own, it must be followed by a space or tab.
			if (nextLine.indexOf('NOTE') === 0 && ((nextLine.length === 4) || (nextLine[4] === ' ') || (nextLine[4] === '\t'))) {
				actList(state, [eatComment, eatEmptyLines]);
			} else if (nextLine.trim().length === 0 && state.text.length > 0) {
				act(state, eatEmptyLines);
			} else if (nextLine.trim().length > 0) {
				act(state, parseCue);
			} else {
				// Everythings parsed!
				return;
			}
		}
	}

	function parseCue(state) {

		var nextLine = peekLine(state);
		var cueId;
		var errString;

		if(nextLine.indexOf('-->') === -1) {
			cueId = cutLine(state);
			nextLine = peekLine(state);
			if(nextLine.indexOf('-->') === -1) {
				errString = 'Invalid WebVTT file: ' + state.src + '\n';
				errString += 'Line: ' + state.line + ', ';
				errString += 'Column: ' + state.column + '\n';
				errString += 'Expected cue timing for cueId \''+cueId+'\' but found: ' + nextLine + '\n';
				if (console.warn) {
					console.warn(errString);
				}
				return; // Return leaving line for parseCuesAndComments to handle
			}
		}

		var cueTimings = actList(state, [getTiming,
																		 eatAtLeast1SpacesOrTabs,
																		 eatArrow,
																		 eatAtLeast1SpacesOrTabs,
																		 getTiming]);

		var startTime = cueTimings[0];
		var endTime = cueTimings[4];
		if (startTime >= endTime) {
			state.error = 'Start time is not sooner than end time.';
			return;
		}

		act(state, eatSpacesOrTabs);
		var cueSettings = act(state, getCueSettings);
		// Cut the newline.
		cut(state, 1);
		var components = act(state, getCuePayload);

		if (typeof cueId === 'undefined') {
			cueId = state.cues.length + 1;
		}
		state.cues.push({
			id: cueId,
			start: startTime,
			end: endTime,
			settings: cueSettings,
			components: components
		});
	}

	function getCueSettings(state) {
		var cueSettings = {};
		while (state.text.length > 0 && state.text[0] !== '\n') {
			var keyValue = act(state, getSettingsKeyValue);
			cueSettings[keyValue[0]] = keyValue[1];
			act(state, eatSpacesOrTabs);
		}
		return cueSettings;
	}

	function getCuePayload(state) {
		// Parser based on instructions in draft.
		var result = {type: 'internal', tagName: '', value: '', classes: [], annotation: '', parent: null, children: [], language: ''};
		var current = result;
		var languageStack = [];
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if (nextLine.indexOf('-->') !== -1 || /^\s+$/.test(nextLine)) {
				break; // Handle empty cues
			}
			// Have to separately detect double-lines ending cue due to our non-standard parsing.
			// TODO: Redo outer algorithm to conform to W3 spec?
			if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
				cut(state, 2);
				break;
			}

			var token = getCueToken(state);
			// We'll use the tokens themselves as objects where possible.
			if (token.type === 'string') {
				current.children.push(token);
			} else if (token.type === 'startTag') {
				token.type = token.tagName;
				// Define token.parent; added by Terrill to fix bug end 'endTag' loop
				token.parent = current;
				if ($.inArray(token.tagName, ['i', 'b', 'u', 'ruby']) !== -1) {
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'rt' && current.tagName === 'ruby') {
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'c') {
					token.value = token.annotation;
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'v') {
					token.value = token.annotation;
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'lang') {
					languageStack.push(token.annotation);
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
			} else if (token.type === 'endTag') {
				if (token.tagName === current.type && $.inArray(token.tagName, ['c', 'i', 'b', 'u', 'ruby', 'rt', 'v']) !== -1) {
					// NOTE from Terrill: This was resulting in an error because current.parent was undefined
					// Fixed (I think) by assigning current token to token.parent in 'startTag' loop
					current = current.parent;
				} else if (token.tagName === 'lang' && current.type === 'lang') {
					current = current.parent;
					languageStack.pop();
				} else if (token.tagName === 'ruby' && current.type === 'rt') {
					current = current.parent.parent;
				}
			} else if (token.type === 'timestampTag') {
				var tempState = {
					text: token.value,
					error: null,
					metadata: {},
					cues: [],
					line: 1,
					column: 1
				};
				try {
					var timing = act(tempState, getTiming);
					if (tempState.text.length === 0) {
						token.value = timing;
						current.push(token);
					}
				}
				catch (e) {
					// Errors are suppressed here, not sure why - VP 2026-03-02
				}
			}
		}
		return result;
	}

	// Gets a single cue token; uses the method in the w3 specification.
	function getCueToken(state) {
		var tokenState = 'data';
		var result = [];
		var buffer = '';
		var token = {type: '', tagName: '', value: '', classes: [], annotation: '', children: []};

		while (true) {
			var c;
			// Double newlines indicate end of token.
			if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
				c = '\u0004';
			} else if (state.text.length > 0) {
				c = state.text[0];
			} else {
				// End of file.
				c = '\u0004';
			}
			if (tokenState === 'data') {
				if (c === '&') {
					buffer = '&';
					tokenState = 'escape';
				} else if (c === '<') {
					if (result.length === 0) {
						tokenState = 'tag';
					} else {
						token.type = 'string';
						token.value = result.join('');
						return token;
					}
				} else if (c === '\u0004') {
					return {type: 'string', value: result.join('')};
				} else {
					result.push(c);
				}
			} else if (tokenState === 'escape') {
				if (c === '&') {
					result.push(buffer);
					buffer = '&';
				} else if (c.match(/[0-9a-z]/)) {
					buffer += c;
				} else if (c === ';') {
					if (buffer === '&amp') {
						result.push('&');
					} else if (buffer === '&lt') {
						result.push('<');
					} else if (buffer === '&gt') {
						result.push('>');
					} else if (buffer === '&lrm') {
						result.push('\u200e');
					} else if (buffer === '&rlm') {
						result.push('\u200f');
					} else if (buffer === '&nbsp') {
						result.push('\u00a0');
					} else {
						result.push(buffer);
						result.push(';');
					}
					tokenState = 'data';
				} else if (c === '<' || c === '\u0004') {
					result.push(buffer);
					token.type = 'string';
					token.value = result.join('');
					return token;
				} else if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') { // Handle unescaped & chars as strings
					result.push(buffer);
					token.type = 'string';
					token.value = result.join('');
					return token;
				} else {
					result.push(buffer);
					tokenState = 'data';
				}
			} else if (tokenState === 'tag') {
				if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') {
					tokenState = 'startTagAnnotation';
				} else if (c === '.') {
					tokenState = 'startTagClass';
				} else if (c === '/') {
					tokenState = 'endTag';
				} else if (c.match('[0-9]')) {
					tokenState = 'timestampTag';
					result.push(c);
				} else if (c === '>') {
					cut(state, 1);
					break;
				} else if (c === '\u0004') {
					token.tagName = '';
					token.type = 'startTag';
					return token;
				} else {
					result.push(c);
					tokenState = 'startTag';
				}
			} else if (tokenState === 'startTag') {
				if (c === '\t' || c === '\u000c' || c === ' ') {
					tokenState = 'startTagAnnotation';
				} else if (c === '\n') {
					buffer = c;
					tokenState = 'startTagAnnotation';
				} else if (c === '.') {
					tokenState = 'startTagClass';
				} else if (c === '>') {
					cut(state, 1);
					token.tagName = result.join('');
					token.type = 'startTag';
					return token;
				} else if (c === '\u0004') {
					token.tagName = result.join('');
					token.type = 'startTag';
					return token;
				} else {
					result.push(c);
				}
			} else if (tokenState === 'startTagClass') {
				if (c === '\t' || c === '\u000c' || c === ' ') {
					token.classes.push(buffer);
					buffer = '';
					tokenState = 'startTagAnnotation';
				} else if (c === '\n') {
					token.classes.push(buffer);
					buffer = c;
					tokenState = 'startTagAnnotation';
				} else if (c === '.') {
					token.classes.push(buffer);
					buffer = "";
				} else if (c === '>') {
					cut(state, 1);
					token.classes.push(buffer);
					token.type = 'startTag';
					token.tagName = result.join('');
					return token;
				} else if (c === '\u0004') {
					token.classes.push(buffer);
					token.type = 'startTag';
					token.tagName = result.join('');
					return token;
				} else {
					buffer += 'c';
				}
			} else if (tokenState === 'startTagAnnotation') {
				if (c === '>') {
					cut(state, 1);
					buffer = buffer.trim().replace(/ +/, ' ');
					token.type = 'startTag';
					token.tagName = result.join('');
					token.annotation = buffer;
					return token;
				} else if (c === '\u0004') {
					buffer = buffer.trim().replace(/ +/, ' ');
					token.type = 'startTag';
					token.tagName = result.join('');
					token.annotation = buffer;
					return token;
				} else {
					buffer += c;
				}
			} else if (tokenState === 'endTag') {
				if (c === '>') {
					cut(state, 1);
					token.type = 'endTag';
					token.tagName = result.join('');
					return token;
				} else if (c === '\u0004') {
					token.type = 'endTag';
					token.tagName = result.join('');
					return token;
				} else {
					result.push(c);
				}
			} else if (tokenState === 'timestampTag') {
				if (c === '>') {
					cut(state, 1);
					token.type = 'timestampTag';
					token.name = result.join('');
					return token;
				} else if (c === '\u0004') {
					token.type = 'timestampTag';
					token.name = result.join('');
					return token;
				} else {
					result.push(c);
				}
			} else {
				throw 'Unknown tokenState ' + tokenState;
			}

			cut(state, 1);
		}
	}

	function eatComment(state) {
		// Cut the NOTE line.
		var noteLine = cutLine(state);
		if (noteLine.indexOf('-->') !== -1) {
			state.error = 'Invalid syntax: --> in NOTE line.';
			return;
		}
		while (true) {
			var nextLine = peekLine(state);
			if ( nextLine.trim().length === 0) {
				// End of comment.
				return;
			} else if (nextLine.indexOf('-->') !== -1) {
				state.error = 'Invalid syntax: --> in comment.';
				return;
			} else {
				cutLine(state);
			}
		}
	}

	// Initial byte order mark.
	function eatOptionalBOM(state) {
		if (state.text[0] === '\ufeff') {
			cut(state, 1);
		}

	}

	// "WEBVTT" string.
	function eatSignature(state) {
		if (state.text.substring(0,6) === 'WEBVTT') {
			cut(state, 6);
		} else {
			state.error = 'Invalid signature.';
		}
	}

	function eatArrow(state) {
		if (state.text.length < 3 || state.text.substring(0,3) !== '-->') {
			state.error = 'Missing -->';
		} else {
			cut(state, 3);
		}
	}

	function eatSpacesOrTabs(state) {
		while (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
		}
	}

	function eatAtLeast1SpacesOrTabs(state) {
		var numEaten = 0;
		while (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
			numEaten += 1;
		}
		if (numEaten === 0) {
			state.error = 'Missing space.';
		}
	}

	function eatUntilEOLInclusive(state) {
		var nextEOL = state.text.indexOf('\n');
		if (nextEOL === -1) {
			state.error = 'Missing EOL.';
		} else {
			cut(state, nextEOL + 1);
		}
	}

	function eatEmptyLines(state) {
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if ( nextLine.trim().length === 0) {
				cutLine(state);
			} else {
				break;
			}
		}
	}

	// Eats empty lines, but throws an error if there's not at least one.
	function eatAtLeast1EmptyLines(state) {
		var linesEaten = 0;
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if ( nextLine.trim().length === 0) {
				cutLine(state);
				linesEaten += 1;
			} else {
				break;
			}
		}
		if (linesEaten === 0) {
			state.error = 'Missing empty line.';
		}
	}

	function getTiming(state) {
		var nextSpace = nextSpaceOrNewline(state.text);
		if (nextSpace === -1) {
			state.error('Missing timing.');
			return;
		}
		var timestamp = cut(state, nextSpace);

		// The spec requires exactly 2 characters for minutes and seconds, and 2+ for hours,
		// but some VTT generation creates 1 digit hour times (e.g. "1:02:24.000 --> 1:04:48.000") and it seems harmless to allow that here
		var results = /((\d+):)?((\d\d):)(\d\d).(\d\d\d)|(\d+).(\d\d\d)/.exec(timestamp);

		if (!results) {
			state.error = 'Unable to parse timestamp';
			return;
		}
		var time = 0;
		var hours = results[2];
		var minutes = results[4];

		if (minutes) {
			if (parseInt(minutes, 10) > 59) {
				state.error = 'Invalid minute range';
				return;
			}
			if (hours) {
				time += 3600 * parseInt(hours, 10);
			}
			time += 60 * parseInt(minutes, 10);
			var seconds = results[5];
			if (parseInt(seconds, 10) > 59) {
				state.error = 'Invalid second range';
				return;
			}

			time += parseInt(seconds, 10);
			time += parseInt(results[6], 10) / 1000;
		} else {
			time += parseInt(results[7], 10);
			time += parseInt(results[8], 10) / 1000;
		}

		return time;
	}
 }

/* global YT */

function addYoutubeFunctions(AblePlayer) {

	AblePlayer.prototype.initYouTubePlayer = function () {

		var thisObj, deferred, promise, youTubeId;
		thisObj = this;
		deferred = new this.defer();
		promise = deferred.promise();

		this.youTubePlayerReady = false;

		// if a described version is available && user prefers desription
		// init player using the described version
		youTubeId = (this.youTubeDescId && this.prefDesc) ? this.youTubeDescId : this.youTubeId;

		this.activeYouTubeId = youTubeId;
		if (AblePlayer.youTubeIframeAPIReady) {
			// Script already loaded and ready.
			thisObj.finalizeYoutubeInit().then(function() {
				deferred.resolve();
			});
		} else {
			// Has another player already started loading the script? If so, abort...
			if (!AblePlayer.loadingYouTubeIframeAPI) {
				thisObj.getScript('https://www.youtube.com/iframe_api', function () {
				});
			}

			// Otherwise, keeping waiting for script load event...
			$('body').on('youTubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeInit = function () {

		// This is called once we're sure the Youtube iFrame API is loaded -- see above
		var deferred, promise, thisObj, containerId, ccLoadPolicy, autoplay;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		containerId = this.mediaId + '_youtube';

		this.$mediaContainer.prepend($('<div>').attr('id', containerId));

		// cc_load_policy:
		// 0 - show captions depending on user's preference on YouTube
		// 1 - show captions by default, even if the user has turned them off
		// IMPORTANT: This *must* be set to 1 or some browsers
		// fail to load any text tracks (observed in Chrome, not in Firefox)
		ccLoadPolicy = 1;
		autoplay = (this.okToPlay) ? 1 : 0;

		// Documentation https://developers.google.com/youtube/player_parameters

		if (typeof this.captionLang == 'undefined') {
			// init using the default player lang
			this.captionLang = this.lang;
		}
		this.youTubePlayer = new YT.Player(containerId, {
			videoId: this.activeYouTubeId,
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			playerVars: {
				autoplay: autoplay,
				cc_lang_pref: this.captionLang, // set the caption language
				cc_load_policy: ccLoadPolicy,
				controls: 0, // no controls, using our own
				disableKb: 1, // disable keyboard shortcuts, using our own
				enablejsapi: 1,
				hl: this.lang, // set the UI language to match Able Player
				iv_load_policy: 3, // do not show video annotations
				origin: window.location.origin,
				playsinline: this.playsInline,
				rel: 0, // when video ends, show only related videos from same channel (1 shows any)
				start: this.startTime
			},
			events: {
				onReady: function () {
					thisObj.youTubePlayerReady = true;
					if (!thisObj.playerWidth || !thisObj.playerHeight) {
						thisObj.getYouTubeDimensions();
					}
					if (thisObj.playerWidth && thisObj.playerHeight) {
						thisObj.youTubePlayer.setSize(thisObj.playerWidth,thisObj.playerHeight);
					}
					if (thisObj.swappingSrc) {
						// swap is now complete
						thisObj.swappingSrc = false;
						thisObj.restoreFocus();
						thisObj.cueingPlaylistItem = false;
						if (thisObj.playing || thisObj.okToPlay) {
							// resume playing
							thisObj.playMedia();
						}
					}
					if (thisObj.userClickedPlaylist) {
						thisObj.userClickedPlaylist = false; // reset
					}
					if (thisObj.recreatingPlayer) {
						thisObj.recreatingPlayer = false; // reset
					}
					deferred.resolve();
				},
				onError: function (e) {
					deferred.reject();
				},
				onStateChange: function (e) {
					thisObj.getPlayerState().then(function(playerState) {
						// values of playerState: 'playing','paused','buffering','ended'
						if (playerState === 'playing') {
							if (thisObj.hasSignLanguage && thisObj.signVideo) {
								thisObj.signVideo.play(true);
							}
							thisObj.playing = true;
							thisObj.startedPlaying = true;
							thisObj.paused = false;
						} else if (playerState == 'ended') {
							thisObj.onMediaComplete();
						} else {
							thisObj.playing = false;
							thisObj.paused = true;
						}
						if (thisObj.stoppingYouTube && playerState === 'paused') {
							if (thisObj.hasSignLanguage && thisObj.signVideo) {
								thisObj.signVideo.pause(true);
							}
							if (typeof thisObj.$posterImg !== 'undefined') {
								thisObj.$posterImg.show();
							}
							thisObj.stoppingYouTube = false;
							thisObj.seeking = false;
							thisObj.playing = false;
							thisObj.paused = true;
						}
					});
					// If caption tracks are hosted locally, but are also available on YouTube,
					// we need to turn them off on YouTube or there will be redundant captions
					// This is the most reliable event on which to unload the caption module
					if (thisObj.player === 'youtube' && !thisObj.usingYouTubeCaptions) {
						if (thisObj.youTubePlayer.getOptions('captions')) {
							thisObj.youTubePlayer.unloadModule('captions');
						}
					}
				},
				onApiChange: function() {
					// getDuration() can be fetched during API change event.
					thisObj.duration = thisObj.youTubePlayer.getDuration();
				},
				onPlaybackQualityChange: function () {
					// do something
				},
			}
		});
		if (!this.hasPlaylist) {
			// remove the media element, since YouTube replaces that with its own element in an iframe
			// this is handled differently for playlists. See buildplayer.js > cuePlaylistItem()
			this.$media.remove();
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeDimensions = function () {

		// The YouTube iframe API does not have a getSize() of equivalent method
		// so, need to get dimensions from YouTube's iframe
		var $iframe, width, height;

		$iframe = this.$ableWrapper.find('iframe');
		if (typeof $iframe !== 'undefined') {
			if ($iframe.prop('width')) {
				width = $iframe.prop('width');
				if ($iframe.prop('height')) {
					height = $iframe.prop('height');
					this.resizePlayer(width,height);
				}
			}
		}
	};

	/**
	 * Get data from the YouTube iFrame API. Pushes data into `this.tracks` and `this.captions`.
	 * Initiates play to trigger loading the captions module, then stops and collects data.
	 *
	 * @returns {Promise} promise
	 */
	AblePlayer.prototype.getYouTubeCaptionTracks = function () {

		var deferred = new this.defer();
		var promise = deferred.promise();
		var thisObj, ytTracks, i, trackLang, trackLabel, isDefaultTrack, apiTriggered = false;

		thisObj = this;
		if (!this.youTubePlayer.getOption('captions','tracklist') ) {
			// no tracks were found, probably because the captions module hasn't loaded
			// play video briefly (required to load the captions module)
			// and after the apiChange event is triggered, try again to retrieve tracks
			this.youTubePlayer.addEventListener('onApiChange',function() {
				apiTriggered = true;
				// getDuration() also requires video to play briefly
				// so, let's set that while we're here
				thisObj.duration = thisObj.youTubePlayer.getDuration();

				if (thisObj.loadingYouTubeCaptions) {
					// loadingYouTubeCaptions is a stopgap in case onApiChange is called more than once
					ytTracks = thisObj.youTubePlayer.getOption('captions','tracklist');
					if ( ! thisObj.okToPlay ) {
						// Don't stopVideo() - that cancels loading, just pause.
						// No need to seekTo(0) - the time passed isn't noticeable to the user
						thisObj.youTubePlayer.pauseVideo();
					}
					if (ytTracks && ytTracks.length) {
						// Step through ytTracks and add them to global tracks array
						// Note: Unlike YouTube Data API, the IFrame Player API only returns
						// tracks that are published, and does NOT include ASR captions
						// So, no additional filtering is required
						for (i=0; i < ytTracks.length; i++) {
							trackLang = ytTracks[i].languageCode;
							trackLabel = ytTracks[i].languageName; // displayName and languageName seem to always have the same value
							isDefaultTrack = false;
							if (typeof thisObj.captionLang !== 'undefined' && (trackLang === thisObj.captionLang) ) {
								isDefaultTrack = true;
							} else if (typeof thisObj.lang !== 'undefined') {
								if (trackLang === thisObj.lang) {
									isDefaultTrack = true;
								}
							}
							thisObj.tracks.push({
								'kind': 'captions',
								'language': trackLang,
								'label': trackLabel,
								'def': isDefaultTrack
							});
							thisObj.captions.push({
								'language': trackLang,
								'label': trackLabel,
								'def': isDefaultTrack,
								'cues': null
							});
						}
						thisObj.hasCaptions = true;
						// setupPopups again with new captions array, replacing original
						thisObj.setupPopups('captions');
					} else {
						// there are no YouTube captions
						thisObj.usingYouTubeCaptions = false;
						thisObj.hasCaptions = false;
					}
					thisObj.loadingYouTubeCaptions = false;
					if (thisObj.okToPlay) {
						thisObj.youTubePlayer.playVideo();
					}
				}
				if (thisObj.captionLangPending) {
					// user selected a new caption language prior to playback starting
					// set it now
					thisObj.youTubePlayer.setOption('captions', 'track', {'languageCode': thisObj.captionLangPending});
					thisObj.captionLangPending = null;
				}
				if (typeof thisObj.prefCaptionsSize !== 'undefined') {
					// set the default caption size
					// this doesn't work until the captions module is loaded
					thisObj.youTubePlayer.setOption('captions','fontSize',thisObj.translatePrefs('size',thisObj.prefCaptionsSize,'youtube'));
				}
				deferred.resolve();
			});
			// Trigger the above event listener by briefly playing the video
			this.loadingYouTubeCaptions = true;
			this.youTubePlayer.playVideo();
			// If onApiChange has not been triggered, the captions module is not loading.
			setTimeout(() => {
				if ( ! apiTriggered ) {
					setTimeout(() => {
						// If a second passes without loading captions, assume there are none.
						thisObj.youTubePlayer.pauseVideo();
						deferred.resolve();
					}, 500);
				}
			},500);
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubePosterUrl = function (youTubeId, width) {

		// return a URL for retrieving a YouTube poster image
		// supported values of width: 120, 320, 480, 640, 1280, 1920.
		var url = 'https://img.youtube.com/vi/' + youTubeId;
		if (width == '120') {
			// default (small) thumbnail, 120 x 90
			return url + '/default.jpg';
		} else if (width == '320') {
			// medium quality thumbnail, 320 x 180
			return url + '/mqdefault.jpg';
		} else if (width == '480') {
			// high quality thumbnail, 480 x 360
			return url + '/hqdefault.jpg';
		} else if (width == '640') {
			// standard definition poster image, 640 x 480
			return url + '/sddefault.jpg';
		} else if (width == '1280') {
			// standard definition poster image, 640 x 480
			return url + '/hq720.jpg';
		} else if ( width == '1920' ) {
			// standard definition poster image, 640 x 480
			return url + '/maxresdefault.jpg';
		}
		return false;
	};

	AblePlayer.prototype.getYouTubeId = function (url) {

		// return a YouTube ID, extracted from a full YouTube URL
		// Supported URL patterns:
		// http|s://youtu.be/xxx
		// http|s://www.youtube.com/watch?v=xxx
		// http|s://www.youtube.com/embed/xxx

		// in all supported patterns, the id is the last 11 characters
		var idStartPos, id;

		if (url.indexOf('youtu') !== -1) {
			// this is a full Youtube URL
			url = url.trim();
			idStartPos = url.length - 11;
			id = url.substring(idStartPos);
			return id;
		} else {
			return url;
		}
};

}

// Order copied over from 2026-02-27 Gruntfile.js, in case it matters
addInitializeFunctions(AblePlayer);
addPreferenceFunctions(AblePlayer);
addWebvttFunctions(AblePlayer);
addBuildplayerFunctions(AblePlayer);
addTrackFunctions(AblePlayer);
addYoutubeFunctions(AblePlayer);
addVolumeFunctions(AblePlayer);
addMiscFunctions(AblePlayer);
addDescriptionFunctions(AblePlayer);
addBrowserFunctions(AblePlayer);
addControlFunctions(AblePlayer);
addCaptionFunctions(AblePlayer);
addChaptersFunctions(AblePlayer);
addMetadataFunctions(AblePlayer);
addTranscriptFunctions(AblePlayer);
addSearchFunctions(AblePlayer);
addEventFunctions(AblePlayer);
addDragdropFunctions(AblePlayer);
addSignFunctions(AblePlayer);
addLangsFunctions(AblePlayer);
addTranslationFunctions(AblePlayer);
addVtsFunctions(AblePlayer);
addVimeoFunctions(AblePlayer);

AblePlayer.ablePlayerSetupWindow();

export { AblePlayer as default };
//# sourceMappingURL=ableplayer.esm.js.map
