/*! ableplayer V4.7.0 - In this file, DOMPurify is not bundled in with AblePlayer, but is a required dependency that can be added to the project via a local copy or a CDN */
/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */
/*global $, jQuery */
"use strict";

// maintain an array of Able Player instances for use globally (e.g., for keeping prefs in sync)
var AblePlayerInstances = [];

(function ($) {
	$(function () {
		$('video, audio').each(function (index, element) {
			if ($(element).data('able-player') !== undefined) {
				AblePlayerInstances.push(new AblePlayer($(this),$(element)));
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
		if (AblePlayer.nextIndex === 1) {
			AblePlayer.lastCreated.onPlayerKeyPress(e);
		}
	});

	/**
	 * Construct the AblePlayer object.
	 *
	 * @param object media jQuery selector or element identifying the media.
	 */
	window.AblePlayer = function(media) {

		var thisObj = this;

		// Keep track of the last player created for use with global events.
		AblePlayer.lastCreated = this;
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
		var isNumeric = ( typeof startTime === 'number' || ( typeof startTime === 'string' && value.trim() !== '' && ! isNaN(value) && isFinite( Number(value) ) ) ) ? true : false;
		this.startTime =  ( startTime !== undefined && isNumeric ) ? startTime : 0;

		// debug
		this.debug = ($(media).data('debug') !== undefined && $(media).data('debug') !== false) ? true : false;

		// Path to root directory of Able Player code
		if ($(media).data('root-path') !== undefined) {
			// add a trailing slash if there is none
			this.rootPath = $(media).data('root-path').replace(/\/?$/, '/');
		} else {
			this.rootPath = this.getRootPath();
		}

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

		// Icon type
		// By default, AblePlayer 3.0.33 and higher uses SVG icons for the player controls
		// Fallback for browsers that don't support SVG is scalable icomoon fonts
		// Ultimate fallback is images, if the user has a custom style sheet that overrides font-family
		// Use data-icon-type to force controls to use either 'svg', 'font', or 'images'
		this.iconType = 'font';
		this.forceIconType = false;
		if ($(media).data('icon-type') !== undefined && $(media).data('icon-type') !== "") {
			var iconType = $(media).data('icon-type');
			if (iconType === 'font' || iconType === 'image' || iconType === 'svg') {
				this.iconType = iconType;
				this.forceIconType = true;
			}
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

		// TTML support (experimental); enabled for testing with data-use-ttml (Boolean)
		if ($(media).data('use-ttml') !== undefined) {
			this.useTtml = true;
			// The following may result in a console error.
			this.convert = require('xml-js');
		} else {
			this.useTtml = false;
		}

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
		// use defer method to defer additional processing until text is retrieved
		this.tt = {};
		var thisObj = this;
		async function fetchTranslations(thisObj) {
			try {
				await thisObj.getTranslationText();
				thisObj.setup();
			} catch {
				thisObj.provideFallback();
			}
		}
		fetchTranslations(thisObj);
	};

	// Index to increment every time new player is created.
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
					if (thisObj.hasPlaylist) {
						// for playlists, recreatePlayer() is called from within cuePlaylistItem()
					} else {
						thisObj.recreatePlayer().then(function() {
							thisObj.initializing = false;
							thisObj.playerCreated = true; // remains true until browser is refreshed
						});
					}
				});
			}
		});
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

	AblePlayer.youTubeIframeAPIReady = false;
	AblePlayer.loadingYouTubeIframeAPI = false;
})(jQuery);

(function ($) {
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
		this.setButtonImages();
	};

	AblePlayer.prototype.getRootPath = function() {

		// returns Able Player root path (assumes ableplayer.js is in /build, one directory removed from root)
		var scripts, i, scriptSrc, scriptFile, fullPath, ablePath, parentFolderIndex, rootPath;
		scripts= document.getElementsByTagName('script');
		for (i=0; i < scripts.length; i++) {
			scriptSrc = scripts[i].src;
			scriptFile = scriptSrc.substring(scriptSrc.lastIndexOf('/'));
			if (scriptFile.indexOf('ableplayer') !== -1) {
				// this is the ableplayerscript
				fullPath = scriptSrc.split('?')[0]; // remove any ? params
				break;
			}
		}
		ablePath= fullPath.split('/').slice(0, -1).join('/'); // remove last filename part of path
		parentFolderIndex = ablePath.lastIndexOf('/');
		rootPath = ablePath.substring(0, parentFolderIndex) + '/';
		return rootPath;
	}

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

	AblePlayer.prototype.setButtonImages = function() {

		// NOTE: volume button images are now set dynamically within volume.js
		this.imgPath = this.rootPath + 'button-icons/' + this.iconColor + '/';
		this.playButtonImg = this.imgPath + 'play.png';
		this.pauseButtonImg = this.imgPath + 'pause.png';
		this.restartButtonImg = this.imgPath + 'restart.png';
		this.rewindButtonImg = this.imgPath + 'rewind.png';
		this.forwardButtonImg = this.imgPath + 'forward.png';
		this.previousButtonImg = this.imgPath + 'previous.png';
		this.nextButtonImg = this.imgPath + 'next.png';

		if (this.speedIcons === 'arrows') {
			this.fasterButtonImg = this.imgPath + 'slower.png';
			this.slowerButtonImg = this.imgPath + 'faster.png';
		} else if (this.speedIcons === 'animals') {
			this.fasterButtonImg = this.imgPath + 'rabbit.png';
			this.slowerButtonImg = this.imgPath + 'turtle.png';
		}

		this.captionsButtonImg = this.imgPath + 'captions.png';
		this.chaptersButtonImg = this.imgPath + 'chapters.png';
		this.signButtonImg = this.imgPath + 'sign.png';
		this.transcriptButtonImg = this.imgPath + 'transcript.png';
		this.descriptionsButtonImg = this.imgPath + 'descriptions.png';
		this.fullscreenExpandButtonImg = this.imgPath + 'fullscreen-expand.png';
		this.fullscreenCollapseButtonImg = this.imgPath + 'fullscreen-collapse.png';
		this.prefsButtonImg = this.imgPath + 'preferences.png';
		this.helpButtonImg = this.imgPath + 'help.png';
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
				svg[2] = 'icon-play';
				svg[3] = this.playButtonImg;
				break;

			case 'pause':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z';
				svg[2] = 'icon-pause';
				svg[3] = this.pauseButtonImg;
				break;

			case 'restart':
				svg[0] = '0 0 20 20';
				svg[1] = 'M18 8h-6l2.243-2.243c-1.133-1.133-2.64-1.757-4.243-1.757s-3.109 0.624-4.243 1.757c-1.133 1.133-1.757 2.64-1.757 4.243s0.624 3.109 1.757 4.243c1.133 1.133 2.64 1.757 4.243 1.757s3.109-0.624 4.243-1.757c0.095-0.095 0.185-0.192 0.273-0.292l1.505 1.317c-1.466 1.674-3.62 2.732-6.020 2.732-4.418 0-8-3.582-8-8s3.582-8 8-8c2.209 0 4.209 0.896 5.656 2.344l2.344-2.344v6z';
				svg[2] = 'icon-restart';
				svg[3] = this.restartButtonImg;
				break;

			case 'rewind':
				svg[0] = '0 0 20 20';
				svg[1] = 'M11.25 3.125v6.25l6.25-6.25v13.75l-6.25-6.25v6.25l-6.875-6.875z';
				svg[2] = 'icon-rewind';
				svg[3] = this.rewindButtonImg;
				break;

			case 'forward':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10 16.875v-6.25l-6.25 6.25v-13.75l6.25 6.25v-6.25l6.875 6.875z';
				svg[2] = 'icon-forward';
				svg[3] = this.forwardButtonImg;
				break;

			case 'previous':
				svg[0] = '0 0 20 20';
				svg[1] = 'M5 17.5v-15h2.5v6.875l6.25-6.25v13.75l-6.25-6.25v6.875z';
				svg[2] = 'icon-previous';
				svg[3] = this.previousButtonImg;
				break;

			case 'next':
				svg[0] = '0 0 20 20';
				svg[1] = 'M15 2.5v15h-2.5v-6.875l-6.25 6.25v-13.75l6.25 6.25v-6.875z';
				svg[2] = 'icon-next';
				svg[3] = this.nextButtonImg;
				break;

			case 'slower':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0 7.321q0-0.29 0.212-0.502t0.502-0.212h10q0.29 0 0.502 0.212t0.212 0.502-0.212 0.502l-5 5q-0.212 0.212-0.502 0.212t-0.502-0.212l-5-5q-0.212-0.212-0.212-0.502z';
				svg[2] = 'icon-slower';
				svg[3] = this.slowerButtonImg;
				break;

			case 'faster':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0 12.411q0-0.29 0.212-0.502l5-5q0.212-0.212 0.502-0.212t0.502 0.212l5 5q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-10q-0.29 0-0.502-0.212t-0.212-0.502z';
				svg[2] = 'icon-faster';
				svg[3] = this.fasterButtonImg;
				break;

			case 'turtle':
				svg[0] = '0 0 20 20';
				svg[1] = 'M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z';
				svg[2] = 'icon-turtle';
				svg[3] = this.slowerButtonImg;
				break;

			case 'rabbit':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z';
				svg[2] = 'icon-rabbit';
				svg[3] = this.fasterButtonImg;
				break;

			case 'ellipsis':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2zM3.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.986 2.199-2.2s-0.984-2.2-2.199-2.2zM17.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2z';
				svg[2] = 'icon-ellipsis';
				svg[3] = false;
				break;

			case 'pipe':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.15 0.179h0.623c0.069 0 0.127 0.114 0.127 0.253v19.494c0 0.139-0.057 0.253-0.127 0.253h-1.247c-0.069 0-0.126-0.114-0.126-0.253v-19.494c0-0.139 0.057-0.253 0.126-0.253h0.623z';
				svg[2] = 'icon-pipe';
				svg[3] = false;
				break;

			case 'captions':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z';
				svg[2] = 'icon-captions';
				svg[3] = this.captionsButtonImg;
				break;

			case 'descriptions':
				svg[0] = '0 0 20 20';
				svg[1] = 'M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z';
				svg[2] = 'icon-descriptions';
				svg[3] = this.descriptionsButtonImg;
				break;

			case 'sign':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z';
				svg[2] = 'icon-sign';
				svg[3] = this.signButtonImg;
				break;

			case 'mute':
			case 'volume-mute':
				svg[0] = '0 0 20 20';
				svg[1] = 'M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z';
				svg[2] = 'icon-volume-mute';
				svg[3] = this.imgPath + 'volume-mute.png';
				break;

			case 'volume-soft':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				svg[2] = 'icon-volume-soft';
				svg[3] = this.imgPath + 'volume-soft.png';
				break;

			case 'volume-medium':
				svg[0] = '0 0 20 20';
				svg[1] = 'M14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				svg[2] = 'icon-volume-medium';
				svg[3] = this.imgPath + 'volume-medium.png';
				break;

			case 'volume-loud':
				svg[0] = '0 0 21 20';
				svg[1] = 'M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				svg[2] = 'icon-volume-loud';
				svg[3] = this.imgPath + 'volume-loud.png';
				break;

			case 'chapters':
				svg[0] = '0 0 20 20';
				svg[1] = 'M5 2.5v17.5l6.25-6.25 6.25 6.25v-17.5zM15 0h-12.5v17.5l1.25-1.25v-15h11.25z';
				svg[2] = 'icon-chapters';
				svg[3] = this.chaptersButtonImg;
				break;

			case 'transcript':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 19.107v-17.857q0-0.446 0.313-0.759t0.759-0.313h8.929v6.071q0 0.446 0.313 0.759t0.759 0.313h6.071v11.786q0 0.446-0.313 0.759t-0.759 0.312h-15q-0.446 0-0.759-0.313t-0.313-0.759zM4.286 15.536q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 12.679q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 9.821q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM11.429 5.893v-5.268q0.246 0.156 0.402 0.313l4.554 4.554q0.156 0.156 0.313 0.402h-5.268z';
				svg[2] = 'icon-transcript';
				svg[3] = this.transcriptButtonImg;
				break;

			case 'preferences':
				svg[0] = '0 0 20 20';
				svg[1] = 'M18.238 11.919c-1.049-1.817-0.418-4.147 1.409-5.205l-1.965-3.404c-0.562 0.329-1.214 0.518-1.911 0.518-2.1 0-3.803-1.714-3.803-3.828h-3.931c0.005 0.653-0.158 1.314-0.507 1.919-1.049 1.818-3.382 2.436-5.212 1.382l-1.965 3.404c0.566 0.322 1.056 0.793 1.404 1.396 1.048 1.815 0.42 4.139-1.401 5.2l1.965 3.404c0.56-0.326 1.209-0.513 1.902-0.513 2.094 0 3.792 1.703 3.803 3.808h3.931c-0.002-0.646 0.162-1.3 0.507-1.899 1.048-1.815 3.375-2.433 5.203-1.387l1.965-3.404c-0.562-0.322-1.049-0.791-1.395-1.391zM10 14.049c-2.236 0-4.050-1.813-4.050-4.049s1.813-4.049 4.050-4.049 4.049 1.813 4.049 4.049c-0 2.237-1.813 4.049-4.049 4.049z';
				svg[2] = 'icon-preferences';
				svg[3] = this.prefsButtonImg;
				break;

			case 'close':
				svg[0] = '0 0 16 20';
				svg[1] = 'M1.228 14.933q0-0.446 0.312-0.759l3.281-3.281-3.281-3.281q-0.313-0.313-0.313-0.759t0.313-0.759l1.518-1.518q0.313-0.313 0.759-0.313t0.759 0.313l3.281 3.281 3.281-3.281q0.313-0.313 0.759-0.313t0.759 0.313l1.518 1.518q0.313 0.313 0.313 0.759t-0.313 0.759l-3.281 3.281 3.281 3.281q0.313 0.313 0.313 0.759t-0.313 0.759l-1.518 1.518q-0.313 0.313-0.759 0.313t-0.759-0.313l-3.281-3.281-3.281 3.281q-0.313 0.313-0.759 0.313t-0.759-0.313l-1.518-1.518q-0.313-0.313-0.313-0.759z';
				svg[2] = 'icon-close';
				svg[3] = null;
				break;

			case 'fullscreen-expand':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502zM8.717 8.393q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257z';
				svg[2] = 'icon-fullscreen-expand';
				svg[3] = this.fullscreenExpandButtonImg;
				break;

			case 'fullscreen-collapse':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0.145 16.964q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257zM8.571 9.464v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502z';
				svg[2] = 'icon-fullscreen-collapse';
				svg[3] = this.fullscreenCollapseButtonImg;
				break;
		}

		return svg;
	};

	// Initialize player based on data on page.
	// This sets some variables, but does not modify anything. Safe to call multiple times.
	// Can call again after updating this.media so long as new media element has the same ID.
	AblePlayer.prototype.reinitialize = function () {

		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

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
		this.setIconType();

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

	AblePlayer.prototype.setIconType = function() {

		// Tests for SVG and font support removed in version 4.7.0.
		// Browser support for these is no longer a risk; they are widely supported in all browsers.
		// This now only returns 'svg' or 'false' if iconType is forced.
		if (this.forceIconType) {
			// use value specified in data-icon-type
			return false;
		}

		this.iconType = 'svg';
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
			console.log("Can't create player; no appropriate player type detected.");
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
		var thisObj, duration;
		thisObj = this;
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
						this.vimeoPlayer.enableTextTrack(this.captionLang).then(function(track) {
							// track.language = the iso code for the language
							// track.kind = 'captions' or 'subtitles'
							// track.label = the human-readable label
						}
					).catch(function(error) {
						switch (error.name) {
							case 'InvalidTrackLanguageError':
								// no track was available with the specified language
								console.log('No ' + track.kind + ' track is available in the specified language (' + track.label + ')');
								break;
							case 'InvalidTrackError':
								// no track was available with the specified language and kind
								console.log('No ' + track.kind + ' track is available in the specified language (' + track.label + ')');
								break;
							default:
								// some other error occurred
								console.log('Error loading ' + track.label + ' ' + track.kind + ' track');
								break;
						}
					});
				} else {
					// disable Vimeo captions.
					this.vimeoPlayer.disableTextTrack().then(function() {
						// Vimeo captions disabled
					}).catch(function(error) {
						console.log('Error disabling Vimeo text track: ',error);
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
})(jQuery);

(function ($) {
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
	}

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
				'label': this.translate( 'prefDescRate', 'Rate' ),
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
			thisId, $thisLabel, $thisField, options,$thisOption,optionValue,optionLang,optionText,
			changedPref,changedSpan,changedText, currentDescState, prefDescVoice, $kbHeading,$kbList,
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
			var $prefsIntro = $('<p>',{
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
			if (this.hasOpenDesc && this.hasClosedDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' ) + ' ';
				currentDescState += '<strong>' + this.translate( 'prefDescFormatOption1b', 'an alternative described version' ) + '</strong>';
				currentDescState += ' <em>' + this.translate( 'and', 'and' ) + '</em> <strong>' + this.translate( 'prefDescFormatOption2b', 'text-based description, announced by screen reader' ) + '</strong>.';
			} else if (this.hasOpenDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' );
				currentDescState += ' <strong>' + this.translate( 'prefDescFormatOption1b', 'an alternative described version' ) + '</strong>.';
			} else if (this.hasClosedDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' );
				currentDescState += ' <strong>' + this.translate( 'prefDescFormatOption2b', 'text-based description, announced by screen reader' ) + '</strong>.';
			} else {
				currentDescState = this.translate( 'prefIntroDescriptionNone', 'The current video has no audio description in either format.' );
			}
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
				$thisDiv = $('<div>').addClass(thisClass);

				if (form === 'captions') {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<select>',{
						name: thisPref,
						id: thisId,
					});
					if (thisPref !== 'prefCaptions' && thisPref !== 'prefCaptionsStyle') {
						// add a change handler that updates the style of the sample caption text
						$thisField.on( 'change', function() {
							changedPref = $(this).attr('name');
							thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
						});
					}
					options = this.getCaptionsOptions(thisPref);
					for (j=0; j < options.length; j++) {
						if (thisPref === 'prefCaptionsPosition') {
							optionValue = options[j];
							if (optionValue === 'overlay') {
								optionText = this.translate( 'captionsPositionOverlay', 'Overlay' );
							} else if (optionValue === 'below') {
								optionValue = options[j];
								optionText = this.translate( 'captionsPositionBelow', 'Below video' );
							}
						} else if (thisPref === 'prefCaptionsFont' || thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
							optionValue = options[j][0];
							optionText = options[j][1];
						} else if (thisPref === 'prefCaptionsOpacity') {
							optionValue = options[j];
							optionText = options[j];
							optionText += (optionValue === '0%') ? ' (' + this.translate( 'transparent', 'transparent' ) + ')' : ' (' + this.translate( 'solid', 'solid' ) + ')';
						} else {
							optionValue = options[j];
							optionText = options[j];
						}
						$thisOption = $('<option>',{
							value: optionValue,
							text: optionText
						});
						if (this[thisPref] === optionValue) {
							$thisOption.prop('selected',true);
						}
						$thisField.append($thisOption);
					}
					$thisDiv.append($thisLabel,$thisField);
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
						if (thisPref === 'prefDescVoice' && this.descVoices.length) {
							prefDescVoice = this.getPrefDescVoice();
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
							thisObj.announceDescriptionText('sample',thisObj.currentSampleText);
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
								changedText = thisObj.tt.prefAltKey + ' + ';
							} else if (changedPref === 'prefCtrlKey') {
								changedSpan = '.able-modkey-ctrl';
								changedText = thisObj.tt.prefCtrlKey + ' + ';
							} else if (changedPref === 'prefShiftKey') {
								changedSpan = '.able-modkey-shift';
								changedText = thisObj.tt.prefShiftKey + ' + ';
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
				if (thisPref === 'prefDescVoice' && !this.descVoices.length) {
					// No voices are available (e.g., in Safari 15.4 on Mac OS)
				} else {
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
					keys.push('p</span> <em>' + this.translate( 'or', 'or' ) + '</em> <span class="able-help-modifiers"> ' + this.translate( 'spacebar', 'spacebar' ));
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
					keys.push('v</span> <em>' + this.translate( 'or', 'or' ) + '</em> <span class="able-modkey">1-9');
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
			thisObj.tt.closeButtonLabel
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
		})
		// Add handler for escape key
		$('div.able-prefs-form').on( 'keydown', function(e) {
			if (e.key === 'Escape') {
				thisObj.resetPrefsForm();
			}
		});
	};

	AblePlayer.prototype.getPrefDescVoice = function () {

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
	}

	AblePlayer.prototype.rebuildDescPrefsForm = function () {

		// Called if this.descVoices changes, which may happen if:
		//  getBrowserVoices() succeeds after an earlier failure
		//  user changes language of captions/subtitles and descVoices changes to match the new language

		var i, optionValue, optionText, $thisOption;

		this.$voiceSelectField = $('#' + this.mediaId + '_prefDescVoice');
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

		if (pref === 'prefDescPitch') {
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
		} else if (pref === 'prefDescRate') {
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
		} else if (pref === 'prefDescVolume') {
			// values range from 0.1 to 1.0
			return value * 10;
		}
		return value;
	};

	AblePlayer.prototype.resetPrefsForm = function () {

		// Reset preferences form with default values from preferences
		// Called when:
		// User clicks cancel or close button in Prefs Dialog
		// User presses Escape to close Prefs dialog
		// User clicks Save in Prefs dialog, & there's more than one player on page

		var thisObj, preferences, available, i, prefName;

		thisObj = this;
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
			voiceSelectId, newVoice, newVoiceLang, numChanges, voiceLangFound,
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
					// this.prefDescMethod = $('input[name="' + prefName + '"]:checked').val();
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
						if (this[prefName] === 1) {
							// nothing has changed
						} else {
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
						} else {
							// nothing has chaged
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
		if (AblePlayerInstances.length > 1) {
			// there are multiple players on this page.
			// update prefs for ALL of them
			for (var i=0; i<AblePlayerInstances.length; i++) {
				AblePlayerInstances[i].updatePlayerPrefs();
				AblePlayerInstances[i].loadCurrentPreferences();
				AblePlayerInstances[i].resetPrefsForm();
				if (numCapChanges > 0) {
					AblePlayerInstances[i].stylizeCaptions(AblePlayerInstances[i].$captionsDiv);
					// also apply same changes to descriptions, if present
					if (typeof AblePlayerInstances[i].$descDiv !== 'undefined') {
						AblePlayerInstances[i].stylizeCaptions(AblePlayerInstances[i].$descDiv);
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
	}

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

})(jQuery);

(function ($) {
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
			} else if (console.log) {
				console.log(errString);
			}
		}
		return parserState;
	}

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

	function cutLine(state, length) {
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
				} else if (console.log) {
					console.log(errString);
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
				catch (err) {
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
		var token = {type: '', tagName: '', value: '', classes: [], annotation: '', children: []}

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

	function eatSingleSpaceOrTab(state) {
		if (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
		} else {
			state.error = 'Missing space.';
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
})(jQuery);

(function ($) {

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
			if (this.iconType != 'image' && (this.player !== 'youtube' || this.hasPoster)) {
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
			audioPoster = DOMPurify.sanitize(this.audioPoster);
			audioPosterAlt = DOMPurify.sanitize(this.audioPosterAlt);
			let audioPosterImg = document.createElement( 'img' );
			audioPosterImg.setAttribute( 'src', audioPoster );
			audioPosterImg.setAttribute( 'alt', audioPosterAlt );
			this.$audioWrapper = this.$playerDiv.wrap( '<div class="able-audio-wrapper">' ).parent();
			this.$audioWrapper.prepend( audioPosterImg );
		}
	}

	AblePlayer.prototype.injectOffscreenHeading = function () {

		// Inject an offscreen heading to the media container.
		// If heading hasn't already been manually defined via data-heading-level,
		// automatically assign a level that is one level deeper than the closest parent heading
		// as determined by getNextHeadingLevel()
		var headingType;
		if (this.playerHeadingLevel == '0') {
			// do NOT inject a heading (at author's request)
		} else {
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
		this.$timer.append(this.$elapsedTimeContainer).append(this.$durationContainer);

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
		console.log( $window );
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
	}

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
				topPosition = $window.offset().top;
				leftPosition = $window.offset().left;
				viewportWidth = window.innerWidth;
				windowWidth = $window.width();
				if ( topPosition < 0 ) {
					$window.css({
						'top': preferencePos['top'] - topPosition
					});
				}
				// If draggable window is off screen to the left.
				if ( leftPosition < 0 && ! this.restoringAfterFullscreen ) {
					console.log( leftPosition );
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
						if (whichPref === thisObj.tt.prefMenuCaptions) {
							thisObj.captionPrefsDialog.show();
						} else if (whichPref === thisObj.tt.prefMenuDescriptions) {
							thisObj.descPrefsDialog.show();
						} else if (whichPref === thisObj.tt.prefMenuKeyboard) {
							thisObj.keyboardPrefsDialog.show();
						} else if (whichPref === thisObj.tt.prefMenuTranscript) {
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
				'label': this.translate( 'windowClose', 'Close' )
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
		var popups, thisObj, i,	tracks;

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
			thisObj = this;
			for (var i=0; i<popups.length; i++) {
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

		var thisObj, baseSliderWidth, controlLayout, numSections,
		i, j, controls, $controllerSpan, $sliderDiv, sliderLabel, $pipe, control,
		buttonTitle, $newButton, buttonText, position, buttonHeight,
		buttonWidth, buttonSide, controllerWidth, tooltipId, tooltipY, tooltipX,
		tooltipWidth, tooltipStyle, tooltip, tooltipTimerId, captionLabel, popupMenuId;

		thisObj = this;

		baseSliderWidth = 100; // arbitrary value, will be recalculated in refreshControls()

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
			this.seekBar = new AccessibleSlider($sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
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
					this.seekBar = new AccessibleSlider($sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
				} else if (control === 'pipe') {
					$pipe = $('<span>', {
						'tabindex': '-1',
						'aria-hidden': 'true',
						'class': 'able-pipe',
					});
					$pipe.append('|');
					$controllerSpan.append($pipe);
				} else {
					// this control is a button
					buttonTitle = this.getButtonTitle(control);

					// icomoon documentation recommends the following markup for screen readers:
					// 1. link element (or in our case, button). Nested inside this element:
					// 2. span that contains the icon font (in our case, buttonIcon)
					// 3. span that contains a visually hidden label for screen readers (buttonLabel)
					// In addition, we are adding aria-label to the button (but not title)
					// And if iconType === 'image', we are replacing #2 with an image (with alt="" and role="presentation")
					// This has been thoroughly tested and works well in all screen reader/browser combinations
					// See https://github.com/ableplayer/ableplayer/issues/81

					// NOTE: Changed from <button> to <div role="button" as of 4.2.18
					// because <button> elements are rendered poorly in high contrast mode
					// in some OS/browser/plugin combinations
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
								$newButton.attr('aria-expanded', 'false')
							} else {
								$newButton.attr('aria-pressed', 'false')
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
				this.$controllerDiv.append('<div style="clear:both;"></div>');
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
		for (var sec in controlLayout) if (controlLayout.hasOwnProperty(sec)) {
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

		if (this.initializing) { // this is the first track - user hasn't pressed play yet
			// do nothing.
		} else {
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
					nowPlayingSpan.html('<span>' + thisObj.tt.selectedTrack + ':</span>' + itemTitle);
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
			if (this.debug) {
				console.log('Found an untranslated label: ' + control);
			}
			return this.capitalizeFirstLetter( control );
		}
	};
})(jQuery);

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
	if ( vttContent > 1000 ) {
		throw new Error( "Input too long" );
	}
    return vttContent.replace(
      /<(v|c|b|i|u|lang|ruby)\.([\w\.]+)([^>]*)>/g,
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
      var classAttr = classMatch ? classMatch[0] : "";
      var nonClassAttributes = tagAttributes
        .replace(/class="[^"]*"/, "")
        .trim()
        .split(/\s+/);

      var attributes = [];
      var titleParts = [];

      // Iterate over each token of the tag content
      nonClassAttributes.forEach(function (token) {
        if (token.indexOf("=") !== -1) {
          attributes.push(token);
        } else {
          titleParts.push(token);
        }
      });

      var title = titleParts.join(" ");
      var newTag = "<v";

      if (title) {
        newTag += ' title="' + title + '"';
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

// Export the object for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = validate;
}
// End of validate.js

(function ($) {
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

    if (this.usingYouTubeCaptions || this.usingVimeoCaptions) {
      // this.captions has already been populated
      // For YouTube, this happens in youtube.js > getYouTubeCaptionTracks()
      // For VImeo, this happens in vimeo.js > getVimeoCaptionTracks()
      // So, nothing to do here...
    } else {
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
    // TODO: Incorporate the following function, moved from setupTracks()
    // convert XML/TTML captions file
    /*
	if (thisObj.useTtml && (trackSrc.endsWith('.xml') || trackText.startsWith('<?xml'))) {
	  trackContents = thisObj.ttml2webvtt(trackText);
	}
	*/
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
			if (thisObj.debug) {
				console.log( "error reading file " + src + ": " + error );
			}
			deferred.reject(src);
			$tempDiv.remove();
		});

    return promise;
  };
})(jQuery);

(function ($) {

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
					console.log( 'YouTube API loaded' );
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
				onError: function (x) {
					deferred.reject();
				},
				onStateChange: function (x) {
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

	AblePlayer.prototype.getYouTubeDimensions = function (youTubeContainerId) {

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

})(jQuery);

(function ($) {


	// Events:
	// - startTracking(event, position)
	// - tracking(event, position)
	// - stopTracking(event, position)

	window.AccessibleSlider = function(div, orientation, length, min, max, bigInterval, label, className, trackingMedia, initialState) {

		// div is the host element around which the slider will be built
		// orientation is either 'horizontal' or 'vertical'
		// length is the width or height of the slider, depending on orientation
		// min is the low end of the slider scale
		// max is the high end of the slider scale
		// bigInterval is the number of steps supported by page up/page down (set to 0 if not supported)
		// (smallInterval, defined as nextStep below, is always set to 1) - this is the interval supported by arrow keys
		// label is used within an aria-label attribute to identify the slider to screen reader users
		// className is used as the root within class names (e.g., 'able-' + classname + '-head')
		// trackingMedia is true if this is a media timeline; otherwise false
		// initialState is either 'visible' or 'hidden'

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

		this.bodyDiv = $(div);

		// Add divs for tracking amount of media loaded and played
		if (trackingMedia) {
			this.loadedDiv = $('<div></div>');
			this.playedDiv = $('<div></div>');
		}

		// Add a seekhead
		this.seekHead = $('<div>',{
			'aria-orientation': orientation,
			'class': 'able-' + className + '-head'
		});

		if (initialState === 'visible') {
			this.seekHead.attr('tabindex', '0');
		} else {
			this.seekHead.attr('tabindex', '-1');
		}
		// Since head is focusable, it gets the aria roles/titles.
		this.seekHead.attr({
			'role': 'slider',
			'aria-label': label,
			'aria-valuemin': min,
			'aria-valuemax': max
		});

		this.timeTooltipTimeoutId = null;
		this.overTooltip = false;
		this.timeTooltip = $('<div>');
		this.bodyDiv.append(this.timeTooltip);

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

		this.bodyDiv.append(this.loadedDiv);
		this.bodyDiv.append(this.playedDiv);
		this.bodyDiv.append(this.seekHead);

		this.bodyDiv.wrap('<div></div>');
		this.wrapperDiv = this.bodyDiv.parent();

		if (this.skin === 'legacy') {
			if (orientation === 'horizontal') {
				this.wrapperDiv.width(length);
				this.loadedDiv.width(0);
			} else {
				this.wrapperDiv.height(length);
				this.loadedDiv.height(0);
			}
		}
		this.wrapperDiv.addClass('able-' + className + '-wrapper');

		if (trackingMedia) {
			this.loadedDiv.addClass('able-' + className + '-loaded');

			this.playedDiv.width(0);
			this.playedDiv.addClass('able-' + className + '-played');

			// Set a default duration. User can call this dynamically if duration changes.
			this.setDuration(max);
		}

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
				if (!thisObj.bodyDiv.is(':focus')) {
					thisObj.bodyDiv.focus();
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

		// handle bodyDiv events
		this.bodyDiv.on(
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
		var offset = pageX - this.bodyDiv.offset().left;
		var position = this.duration * (offset / this.bodyDiv.width());
		return this.boundPos(position);
	};

	AccessibleSlider.prototype.boundPos = function (position) {
		return Math.max(0, Math.min(position, this.duration));
	}

	AccessibleSlider.prototype.setDuration = function (duration) {
		if (duration !== this.duration) {
			this.duration = duration;
			this.resetHeadLocation();
			this.seekHead.attr('aria-valuemax', duration);
		}
	};

	AccessibleSlider.prototype.setWidth = function (width) {
		this.wrapperDiv.width(width);
		this.resizeDivs();
		this.resetHeadLocation();
	};

	AccessibleSlider.prototype.getWidth = function () {
		return this.wrapperDiv.width();
	};

	AccessibleSlider.prototype.resizeDivs = function () {
		this.playedDiv.width(this.bodyDiv.width() * (this.position / this.duration));
		this.loadedDiv.width(this.bodyDiv.width() * this.buffered);
	};

	// Stops tracking, sets the head location to the current position.
	AccessibleSlider.prototype.resetHeadLocation = function () {
		var ratio = this.position / this.duration;
		var center = this.bodyDiv.width() * ratio;
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
	}

	// TODO: Native HTML5 can have several buffered segments, and this actually happens quite often. Change this to display them all.
	AccessibleSlider.prototype.setBuffered = function (ratio) {
		if (!isNaN(ratio)) {
			this.buffered = ratio;
			this.redrawDivs;
		}
	}

	AccessibleSlider.prototype.startTracking = function (device, position) {
		if (!this.tracking) {
			this.trackDevice = device;
			this.tracking = true;
			this.bodyDiv.trigger('startTracking', [position]);
		}
	};

	AccessibleSlider.prototype.stopTracking = function (position) {
		this.trackDevice = null;
		this.tracking = false;
		this.bodyDiv.trigger('stopTracking', [position]);
		this.setPosition(position, true);
	};

	AccessibleSlider.prototype.trackHeadAtPageX = function (pageX) {
		var position = this.pageXToPosition(pageX);
		var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
		newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
		this.lastTrackPosition = position;
		this.seekHead.css('left', newLeft);
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.trackHeadAtPosition = function (position) {
		var ratio = position / this.duration;
		var center = this.bodyDiv.width() * ratio;
		this.lastTrackPosition = position;
		this.seekHead.css('left', center - (this.seekHead.width() / 2));
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.reportTrackAtPosition = function (position) {
		this.bodyDiv.trigger('tracking', [position]);
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
			this.setTooltipPosition(this.overBodyMousePos.x - this.bodyDiv.offset().left);
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

})(jQuery);

(function ($) {

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

})(jQuery);

(function ($) {
	var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

	// Based on the incredible accessible modal dialog.
	window.AccessibleDialog = function( modalDiv, $returnElement, title, closeButtonLabel) {

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
	};

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

})(jQuery);

(function ($) {
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
      if (obj.hasOwnProperty(prop)) {
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

    var dHours, dMinutes, dSeconds, parts, milliSeconds, numShort, i;

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
    dHours = Math.floor(seconds / 3600);
    dMinutes = Math.floor(seconds / 60) % 60;
    dSeconds = Math.floor(seconds % 60);
    if (dSeconds < 10) {
      dSeconds = "0" + dSeconds;
    }
    if (dHours > 0) {
      if (dMinutes < 10) {
        dMinutes = "0" + dMinutes;
      }
      if (showFullTime) {
        return dHours + ":" + dMinutes + ":" + dSeconds + "." + milliSeconds;
      } else {
        return dHours + ":" + dMinutes + ":" + dSeconds;
      }
    } else {
      if (showFullTime) {
        if (dHours < 1) {
          dHours = "00";
        } else if (dHours < 10) {
          dHours = "0" + dHours;
        }
        if (dMinutes < 1) {
          dMinutes = "00";
        } else if (dMinutes < 10) {
          dMinutes = "0" + dMinutes;
        }
        return dHours + ":" + dMinutes + ":" + dSeconds + "." + milliSeconds;
      } else {
        return dMinutes + ":" + dSeconds;
      }
    }
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
  }

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
  }

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

})(jQuery);

(function ($) {
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

		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

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

		var voices, descLangs, voiceLang, preferredLang;

		preferredLang = (this.captionLang) ? this.captionLang.substring(0,2).toLowerCase() : this.lang.substring(0,2).toLowerCase();

		this.descVoices = [];
		voices = this.synth.getVoices();
		descLangs = this.getDescriptionLangs();
		if (voices.length > 0) {
			this.descVoices = [];
			// available languages are identified with local suffixes (e.g., en-US)
			for (var i=0; i<voices.length; i++) {
				// match only the first 2 characters of the lang code
				voiceLang = voices[i].lang.substring(0,2).toLowerCase();
				if (voiceLang === preferredLang && (descLangs.indexOf(voiceLang) !== -1)) {
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

	AblePlayer.prototype.getDescriptionLangs = function () {

		// returns an array of languages (from srclang atttributes)
		// in which there are description tracks
		// use only first two characters of the lang code
		var descLangs = [];
		if (this.tracks) {
			for (var i=0; i < this.tracks.length; i++) {
				if (this.tracks[i].kind === 'descriptions') {
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
		prefDescVoice = (typeof preferences.voices !== 'undefined') ? this.getPrefDescVoice() : null;

		this.getBrowserVoices();
		this.rebuildDescPrefsForm();

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
					for (var i=0; i<voices.length; i++) {
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
					srcType = this.$sources[i].getAttribute('type');
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
					srcType = this.$sources[i].getAttribute('type');
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
			} else {
				// player is in the process of being created
				// no need to recreate it
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

		var thisObj, cues, d, thisDescription, descText;
		thisObj = this;

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
						this.announceDescriptionText('description',descText);
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

	AblePlayer.prototype.announceDescriptionText = function(context, text) {

		// this function announces description text using speech synthesis
		// it's only called if already determined that browser supports speech synthesis
		// context is either:
		// 'description' - actual description text extracted from WebVTT file
		// 'sample' - called when user changes a setting in Description Prefs dialog

		var thisObj, voiceName, i, voice, pitch, rate, volume, utterance,
			timeElapsed, secondsElapsed;

		thisObj = this;

		// As of Feb 2021,
		// 1. In some browsers (e.g., Chrome) window.speechSynthesis.getVoices()
		//  returns 0 voices unless the request is triggered with a user click
		//  Therefore, description may have failed to initialize when the page loaded
		//  This function cannot have been called without a mouse click.
		//  Therefore, this is a good time to check that, and try again if needed
		// 2. In some browsers, the window.speechSynthesis.speaking property fails to reset,
		//  and onend event is never fired. This prevents new speech from being spoken.
		//  window.speechSynthesis.cancel() also fails, so it's impossible to recover.
		//  This only seems to happen with some voices.
		//  Typically the first voice in the getVoices() array (index 0) is realiable
		//  When speech synthesis gets wonky, this is a deep problem that impacts all browsers
		//  and typically requires a computer reboot to make right again.
		//  This has been observed frequently in macOS Big Sur, but also in Windows 10
		//  To ignore user's voice preferences and always use the first voice, set the following var to true
		//  This is for testing only; not recommended for production
		//  unless the voice select field is also removed from the Prefs dialog
		var useFirstVoice = false;

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
		} else {
			// get settings from global prefs
			voiceName = this.prefDescVoice;
			pitch = this.prefDescPitch;
			rate = this.prefDescRate;
			volume = this.prefDescVolume;
		}

		// get the voice associated with the user's chosen voice name
		if (this.descVoices) {
			if (this.descVoices.length > 0) {
				if (useFirstVoice) {
					voice = this.descVoices[0];
				} else if (voiceName) {
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
			this.speakingDescription = false;
			timeElapsed = e.elapsedTime;
			// As of Firefox 95, e.elapsedTime is expressed in seconds
			// Other browsers (tested in Chrome & Edge) express this in milliseconds
			// Assume no utterance will require over 100 seconds to express...
			// If a large value, time is likely expressed in milliseconds.
			secondsElapsed = (timeElapsed > 100) ? (e.elapsedTime/1000).toFixed(2) : (e.elapsedTime).toFixed(2);

			if (this.debug) {
				console.log('Finished speaking. That took ' + secondsElapsed + ' seconds.');
			}
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
			console.log('Web Speech API error',e);
		};
		if (this.synth.paused) {
			this.synth.resume();
		}
		this.synth.speak(utterance);
		this.speakingDescription = true;
	};

})(jQuery);

(function ($) {

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

})(jQuery);

(function ($) {

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
			})
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
		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

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

		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

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

		var thisObj = this;

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

		var thisObj, duration,  textByState, timestamp,  captionsCount, newTop,	statusBarWidthBreakpoint;

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
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
				} else {
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.duration));
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
			} else if (this.player === 'vimeo') {
				// TODO: Add support for Vimeo buffering update
			}
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
							thisObj.$playpauseButton.attr('aria-label',thisObj.tt.play);
							thisObj.getIcon( thisObj.$playpauseButton, 'play' );
						} else {
							thisObj.$playpauseButton.attr('aria-label',thisObj.tt.pause);
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
		this.playlistIndex = (this.playlistIndex === 0) ? this.$playlist.length - 1 : this.playlistIndex--;
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
		this.cuePlaylistItem(this.playlistIndex);
	};

	AblePlayer.prototype.handleNextTrack = function() {

		// currently on the last track
		// wrap to top and play the forst track
		this.playlistIndex = (this.playlistIndex === this.$playlist.length - 1) ? 0 : this.playlistIndex++;
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
		this.cuePlaylistItem(this.playlistIndex);
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
				if (index === -1) {
					console.log('ERROR: Youtube returning unknown playback rate ' + currentRate.toString());
				} else {
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
					this.vimeoPlayer.enableTextTrack(this.captionLang).then(function(track) {
						// track.language = the iso code for the language
						// track.kind = 'captions' or 'subtitles'
						// track.label = the human-readable label
					}).catch(function(error) {
						switch (error.name) {
							case 'InvalidTrackLanguageError':
								// no track was available with the specified language
								console.log('No ' + track.kind + ' track is available in the specified language (' + track.label + ')');
								break;
							case 'InvalidTrackError':
								// no track was available with the specified language and kind
								console.log('No ' + track.kind + ' track is available in the specified language (' + track.label + ')');
								break;
							default:
								// some other error occurred
								console.log('Error loading ' + track.label + ' ' + track.kind + ' track');
								break;
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
				this.$ccButton.attr('aria-expanded', 'false')
				this.waitThenFocus(this.$ccButton);
			} else {
				this.closePopups();
				if (this.captionsPopup) {
					this.captionsPopup.show();
					this.$ccButton.attr('aria-expanded','true');

					// Gives time to "register" expanded ccButton
					setTimeout(function() {
						thisObj.captionsPopup.css('top', thisObj.$ccButton.position().top - thisObj.captionsPopup.outerHeight());
						thisObj.captionsPopup.css('left', thisObj.$ccButton.position().left)
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
	}

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
			this.chaptersPopup.css('left', this.$chaptersButton.position().left)

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
				}
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
		} else {
			// Removed non-native fullscreen mode in 4.8, which only supported iOS.
			// Native fullscreen is on iOS 18+ devices behind a feature flag
			// The polyfill hasn't worked for years.
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

	AblePlayer.prototype.getIcon = function( $button, id, forceImg = false ) {
		// Remove existing HTML before generating.
		// iconData: [0 = svg viewbox, 1 = svg path, 2 = icon font class, 3 = image file]
		var iconType = this.iconType;
		var iconData = this.getIconData( id );
		iconType = ( null === iconData[3] ) ? 'svg' : iconType;
		iconType =  ( forceImg === true ) ? 'img' : iconType;

		var existingIcon = $button.find( iconType + '#ableplayer-' + id );
		// Avoid repainting icon if there's no change.
		if ( existingIcon.length > 0 ) {
			return;
		}
		$button.find('svg, img, span').remove();

		if (iconType === 'font') {
			var $buttonIcon = $('<span>', {
				'class': iconData[2],
			});
			$button.append( $buttonIcon );
		} else if (iconType === 'svg') {
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
		} else {
			var $buttonImg = $('<img>',{
				'src': iconData[3],
				'alt': '',
				'role': 'presentation'
			});
			$button.append($buttonImg);
			$button.find('img').attr('src',iconData[3]);
		}
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
		$alertBox.appendTo($parentWindow)
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
	}

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
		if (this.debug) {
			console.log('resizePlayer to ' + newWidth + 'x' + newHeight);
		}
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

})(jQuery);

(function ($) {
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
          .then(function (track) {
            // track.language = the iso code for the language
            // track.kind = 'captions' or 'subtitles'
            // track.label = the human-readable label
          })
          .catch(function (error) {
            switch (error.name) {
              case "InvalidTrackLanguageError":
                // no track was available with the specified language
                console.log(
                  "No " +
                    track.kind +
                    " track is available in the specified language (" +
                    track.label +
                    ")"
                );
                break;
              case "InvalidTrackError":
                // no track was available with the specified language and kind
                console.log(
                  "No " +
                    track.kind +
                    " track is available in the specified language (" +
                    track.label +
                    ")"
                );
                break;
              default:
                // some other error occurred
                console.log(
                  "Error loading " + track.label + " " + track.kind + " track"
                );
                break;
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
    var c, thisCaption, captionText;
    var cues;
    if (this.selectedCaptions.cues.length) {
      cues = this.selectedCaptions.cues;
    } else if (this.captions.length >= 1) {
      cues = this.captions[0].cues;
    } else {
      cues = [];
    }
    for (c = 0; c < cues.length; c++) {
      if (cues[c].start <= now && cues[c].end > now) {
        thisCaption = c;
        break;
      }
    }
    if (typeof thisCaption !== "undefined") {
      if (this.currentCaption !== thisCaption) {
        // it's time to load the new caption into the container div
        captionText = this.flattenCueForCaption(cues[thisCaption]).replace( /\n/g, "<br>" );

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
})(jQuery);

(function ($) {

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
			getClickFunction, $clickedItem, $chaptersList;

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

})(jQuery);

(function ($) {
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
})(jQuery);

(function ($) {
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
    var thisObj,
      $autoScrollLabel,
      $languageSelectWrapper,
      $languageSelectLabel,
      i,
      $option;

    thisObj = this;
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
          for (var i = 0; i < this.descriptions.length; i++) {
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
    var transcriptTitle;

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

      if (headingNumber <= 6) {
        var transcriptHeading = "h" + headingNumber.toString();
      } else {
        var transcriptHeading = "div";
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
      if (chapterHeadingNumber <= 6) {
        var chapterHeading = "h" + chapterHeadingNumber.toString();
      } else {
        var chapterHeading = "div";
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
      $descHiddenSpan.text(thisObj.tt.prefHeadingDescription + ": ");
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
            if (parts > 1) {
              // force a line break between sections that contain parens or brackets
              var silentSpanBreak = "<br/>";
            } else {
              var silentSpanBreak = "";
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
          comp.value = comp.value.replace(/^title="|\"$/g, "");
          $vSpan.text("(" + comp.value + ")");
          result.push($vSpan);
          for (var i = 0; i < comp.children.length; i++) {
            var subResults = flattenComponentForCaption(comp.children[i]);
            for (var jj = 0; jj < subResults.length; jj++) {
              result.push(subResults[jj]);
            }
          }
        } else if (comp.type === "b" || comp.type === "i") {
          if (comp.type === "b") {
            var $tag = $("<strong>");
          } else if (comp.type === "i") {
            var $tag = $("<em>");
          }
          for (var i = 0; i < comp.children.length; i++) {
            var subResults = flattenComponentForCaption(comp.children[i]);
            for (var jj = 0; jj < subResults.length; jj++) {
              $tag.append(subResults[jj]);
            }
          }
          if (comp.type === "b" || comp.type == "i") {
            result.push($tag);
          }
        } else {
          for (var i = 0; i < comp.children.length; i++) {
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
        var firstStart = Math.min(
          chapters[nextChapter].start,
          descriptions[nextDesc].start,
          captions[nextCap].start
        );
      } else if (
        nextChapter < chapters.length &&
        nextDesc < descriptions.length
      ) {
        // chapters & descriptions have content
        var firstStart = Math.min(
          chapters[nextChapter].start,
          descriptions[nextDesc].start
        );
      } else if (nextChapter < chapters.length && nextCap < captions.length) {
        // chapters & captions have content
        var firstStart = Math.min(
          chapters[nextChapter].start,
          captions[nextCap].start
        );
      } else if (nextDesc < descriptions.length && nextCap < captions.length) {
        // descriptions & captions have content
        var firstStart = Math.min(
          descriptions[nextDesc].start,
          captions[nextCap].start
        );
      } else {
        var firstStart = null;
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
  }
})(jQuery);

(function ($) {
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
              title: itemLabel,
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

  AblePlayer.prototype.secondsToTime = function (totalSeconds) {
    // return an array of totalSeconds converted into two formats
    // time['value'] = HH:MM:SS with hours dropped if there are none
    // time['title'] = a speakable rendering, so speech rec users can easily speak the link

    // first, round down to nearest second
    var totalSeconds = Math.floor(totalSeconds);

    var hours = parseInt(totalSeconds / 3600, 10) % 24;
    var minutes = parseInt(totalSeconds / 60, 10) % 60;
    var seconds = totalSeconds % 60;
    var value = "";
    var title = "";
    if (hours > 0) {
      value += hours + ":";
      if (hours == 1) {
        title += "1 " + this.translate( 'hour', 'hour' ) + " ";
      } else {
        title += hours + " " + this.translate( 'hours', 'hours' ) + " ";
      }
    }
    if (minutes < 10) {
      value += "0" + minutes + ":";
      if (minutes > 0) {
        if (minutes == 1) {
          title += "1 " + this.translate( 'minute', 'minute' ) + " ";
        } else {
          title += minutes + " " + this.translate( 'minutes', 'minutes' ) + " ";
        }
      }
    } else {
      value += minutes + ":";
      title += minutes + " " + this.translate( 'minutes', 'minutes' ) + " ";
    }
    if (seconds < 10) {
      value += "0" + seconds;
      if (seconds > 0) {
        if (seconds == 1) {
          title += "1 " + this.translate( 'second', 'second' ) + " ";
        } else {
          title += seconds + " " + this.translate( 'seconds', 'seconds' ) + " ";
        }
      }
    } else {
      value += seconds;
      title += seconds + " " + this.translate( 'seconds', 'seconds' ) + " ";
    }
    var time = [];
    time["value"] = value;
    time["title"] = title;
    return time;
  };
})(jQuery);

(function ($) {
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
					this.playlistIndex = 0;
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
				this.cuePlaylistItem(this.playlistIndex)
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
				} else if (this.seekStatus === 'seeking') {
					// Do nothing.
				} else {
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
		this.seekBar.bodyDiv.on('startTracking', function (e) {
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
	}

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
					if (thisObj.hasPlaylist || thisObj.swappingSrc) {
						// do NOT set playing to false.
						// doing so prevents continual playback after new track is loaded
					} else {
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
						case 1:
							console.log('HTML5 Media Error: MEDIA_ERR_ABORTED');
							break;
						case 2:
							console.log('HTML5 Media Error: MEDIA_ERR_NETWORK ');
							break;
						case 3:
							console.log('HTML5 Media Error: MEDIA_ERR_DECODE ');
							break;
						case 4:
							console.log('HTML5 Media Error: MEDIA_ERR_SRC_NOT_SUPPORTED ');
							break;
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
		this.vimeoPlayer.on('play', function(data) {
			// Triggered when the video plays
			thisObj.playing = true;
			thisObj.startedPlaying = true;
			thisObj.paused = false;
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('ended', function(data) {
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
		this.vimeoPlayer.on('progress', function(data) {
			// Triggered as the video is loaded.
			 // Reports back the amount of the video that has been buffered (NOT the amount played)
			 // Data has keys duration, percent, and seconds
		});
		this.vimeoPlayer.on('seeking', function(data) {
		 	// Triggered when the player starts seeking to a specific time.
			 // A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('seeked', function(data) {
			// Triggered when the player seeks to a specific time.
			// A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('timeupdate',function(data) {
			// Triggered as the currentTime of the video updates.
			 // It generally fires every 250ms, but it may vary depending on the browser.
			thisObj.onMediaUpdateTime(data['duration'], data['seconds']);
		});
		this.vimeoPlayer.on('pause',function(data) {
			// Triggered when the video pauses
			if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
				// this happens in some browsers (not Chrome, as of 70.x)
				// when swapping source (e.g., between tracks in a playlist, or swapping description)
				if (thisObj.hasPlaylist || thisObj.swappingSrc) {
						// do NOT set playing to false.
					// doing so prevents continual playback after new track is loaded
				} else {
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
		this.vimeoPlayer.on('playbackratechange',function(data) {
			// Triggered when the playback rate of the video in the player changes.
			// The ability to change rate can be disabled by the creator
			// and the event will not fire for those videos.
			// data contains one key: 'playbackRate'
			thisObj.vimeoPlaybackRate = data['playbackRate'];
		});
		this.vimeoPlayer.on('texttrackchange', function(data) {
			// Triggered when the active text track (captions/subtitles) changes.
			// The values will be null if text tracks are turned off.
			// data contains three keys: kind, label, language
		});
		this.vimeoPlayer.on('volumechange',function(data) {
			// Triggered when the volume in the player changes.
			// Some devices do not support setting the volume of the video
			// independently from the system volume,
			// so this event will never fire on those devices.
			thisObj.volume = data['volume'] * 10;
		});
		this.vimeoPlayer.on('error',function(data) {
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
			if (AblePlayer.nextIndex > 1) {
				thisObj.onPlayerKeyPress(e);
			}
		});

		// If stenoMode is enabled in an iframe, handle keydown events from the iframe
		if (this.stenoMode && (typeof this.stenoFrameContents !== 'undefined')) {
			this.stenoFrameContents.on('keydown',function(e) {
				thisObj.onPlayerKeyPress(e);
			});
		};

		// transcript is not a child of this.$ableDiv
		// therefore, must be added separately
		if (this.$transcriptArea) {
			this.$transcriptArea.on('keydown',function (e) {
				if (AblePlayer.nextIndex > 1) {
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
})(jQuery);

(function ($) {
	AblePlayer.prototype.initDragDrop = function ( which ) {

		// supported values of which: 'sign', 'transcript'

		// NOTE: "Drag and Drop" for Able Player is a metaphor only!!!
		// HTML5 Drag & Drop API enables moving elements to new locations in the DOM
		// Thats not our purpose; we're simply changing the visible position on-screen
		// Therefore, the drag & drop interface was overhauled in v2.3.41 to simply
		// use mouse (and keyboard) events to change CSS positioning properties

		// There are nevertheless lessons to be learned from Drag & Drop about accessibility:
		// http://dev.opera.com/articles/accessible-drag-and-drop/

		var thisObj, $window, $toolbar, windowName, $resizeHandle, $resizeSvg,
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
			})
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

		var thisObj, $windowAlert, menuId, $newButton, tooltipId, $tooltip, $popup, menuId;

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
			this.$transcriptToolbar.prepend($windowAlert,$newButton,$tooltip,$popup);
		} else if (which === 'sign') {
			this.$signPopupButton = $newButton;
			this.$signPopup = $popup;
			this.$signToolbar.append($windowAlert,$newButton,$tooltip,$popup);
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
				console.log( 'firing' );
				// don't set windowMenuClickRegistered yet; that happens in handler function
				thisObj.handleWindowButtonClick(which, e);
			}
			thisObj.finishingDrag = false;
		});

		this.addResizeDialog(which, $window);
	};

	AblePlayer.prototype.addResizeDialog = function (which, $window) {

		var thisObj, $windowPopup, $windowButton, widthId, heightId,
			$resizeForm, $resizeWrapper, $resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel,
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
			widthId = this.mediaId + '-resize-' + which + '-width';
			heightId = this.mediaId + '-resize-' + which + '-height';
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

		var dragDevice = this.dragDevice;
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

		var thisObj, $windowPopup, $windowButton;
		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
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
		startPos = this.$activeWindow.position();
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

		var $windowPopup, $windowButton;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
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
})(jQuery);

(function ($) {
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
					if (this.debug) {
						console.log('Sign language has been disabled due to iOS restrictions');
					}
				} else {
					if (this.debug) {
						console.log('This video has an accompanying sign language video: ' + this.signFile);
					}
					this.hasSignLanguage = true;
					this.injectSignPlayerCode();
				}
			}
		}
	};

	AblePlayer.prototype.injectSignPlayerCode = function() {

		// create and inject surrounding HTML structure
		var thisObj, signVideoId, i, signSrc, srcType, $signSource;

		thisObj = this;
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
					console.log( 'YouTube API loaded' );
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
		var deferred, promise, thisObj, containerId, ccLoadPolicy, autoplay;

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
				onError: function (x) {
					deferred.reject();
				},
				onStateChange: function (x) {
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

})(jQuery);

(function ($) {
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
	}

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

})(jQuery);
(function ($) {
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
			'pt-br' : 'Brazilian Portuguese',
			'sv'    : 'Swedish',
			'tr'    : 'Turkish',
			'zh-tw' : 'Chinese (Taiwan)'
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
	}

	AblePlayer.prototype.getTranslationText = function() {

		// determine language, then get labels and prompts from corresponding translation var
		var deferred, thisObj, supportedLangs, docLang, translationFile, i,	similarLangFound;
		deferred = new this.defer();
		thisObj = this;

		supportedLangs = this.getSupportedLangs(); // returns an array

		if (this.lang) { // a data-lang attribute is included on the media element
			if ( Object.hasOwn( supportedLangs,this.lang ) ) {
				// the specified language is not supported
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
							this.lang = supportedLangs[i];
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
		translationFile = this.rootPath + 'translations/' + this.lang + '.json';
		fetch(translationFile)
			.then( response => {
				return response.json();
			})
			.then( data => {
				thisObj.tt = data;
				thisObj.translationFiles = true;
				deferred.resolve();
			})
			.catch( error => {
				console.log( "Error: Translation files should be updated to JSON." + error,translationFile);
				translationFile = thisObj.rootPath + 'translations/' + thisObj.lang + '.js';
				fetch(translationFile)
					.then( response => {
						return response.json();
					})
					.then( data => {
						thisObj.tt = data;
						thisObj.translationFiles = true;
						deferred.resolve();
					})
					.catch( error => {
						console.log( "Error: Unable to load translation file:", translationFile);
						thisObj.tt = {};
						thisObj.translationFiles = false;
						deferred.resolve();
					});
			});
		return deferred.promise();
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
			var thisObj, supportedLangs, thisLang, translationFile, thisText, translation;

			supportedLangs = this.getSupportedLangs();
			thisObj = this;

			this.sampleText = [];
			for ( const [key,value] of Object.entries(supportedLangs) ) {
				translationFile = this.rootPath + 'translations/' + key + '.json';
				fetch(translationFile)
					.then( response => {
						return response.json();
					})
					.then( data => {
						thisText = data.sampleDescriptionText;
						translation = {'lang':thisLang, 'text': thisText};
						thisObj.sampleText.push(translation);
					});
			}
		}
	};

})(jQuery);

/* Video Transcript Sorter (VTS)
 * Used to synchronize time stamps from WebVTT resources
 * so they appear in the proper sequence within an auto-generated interactive transcript
*/

(function ($) {
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
				})
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
				$fieldWrapper = $( '<div class="vts-lang-selector"></div>' );
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
				var kindOptions, beforeEditing, editedCell, editedContent, i;
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
						$(this).attr('value','cancel').text( this.translate( 'vtsReturn', 'Return to Editor' ) );
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
						thisObj.showVtsAlert( this.translate( 'vtsCancel', 'Cancelling saving. Any edits you made have been restored in the VTS table.' ) );
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
	}

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
			if (tracks[i].hasOwnProperty('language')) {
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
		var $rows, $thisRow, otherRowNum, $otherRow, msg;

		$rows = $('#able-vts table').find('tr');
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
			prevRowNum = null;
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
			nextRowNum = null;
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
				end = (nextStart) ? (parseFloat(nextStart) - .001).toFixed(3) : (parseFloat(start) + minDurartion[kind]).toFixed(3);
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
					if (start < nextStart) {
						// No change is necessary
					} else {
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
				if (start < nextStart) {
					// No change is necessary
				} else {
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
			this.$vtsAlert.text(message).hide()
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
					content = $rows.eq(i).find('td').eq(4).text();
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
		})
		$('#able-vts').append($output);
		for (i=0; i < kinds.length; i++) {
			kind = kinds[i];
			if (vtt[kind].length > 8) {
				// some content has been added
				this.showWebVttOutput(kind,vtt[kind],lang)
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

})(jQuery);

(function ($) {

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

		autoplay = (this.okToPlay) ? 'true' : 'false';

		if (this.playerWidth) {
			if (this.vimeoUrlHasParams) {
				// use url param, not id
				options = {
					url: vimeoId,
					width: this.playerWidth,
					controls: false
				}
			} else {
				options = {
					id: vimeoId,
					width: this.playerWidth,
					controls: false
				}
			}
		} else {
			// initialize without width & set width later
			if (this.vimeoUrlHasParams) {
				options = {
					url: vimeoId,
					controls: false
				}
			} else {
				options = {
					id: vimeoId,
					controls: false
				}
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
	}

	AblePlayer.prototype.getVimeoEnded = function () {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		this.vimeoPlayer.getEnded().then(function (ended) {
			// ended is Boolean
			deferred.resolve(ended);
		});

		return promise;
	}

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
	}

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

	AblePlayer.prototype.getVimeoPosterUrl = function (vimeoId, width) {

		// Vimeo Oembed only returns a 640px width image. Hope at some point there's an alternative.
		var url = 'http://vimeo.com/api/oembed.json?url=https://vimeo.com/' + vimeoId, imageUrl = '';
		console.log( url );
		fetch( url ).then( response => {

			return response.json();
  		})
		.then( json => {
			imageUrl = json.thumbnail_url;
		})
		.catch( error => {
			if (thisObj.debug) {
				console.log( 'Vimeo API query: ' + error );
			}
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

})(jQuery);
