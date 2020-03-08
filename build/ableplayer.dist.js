/*
	// JavaScript for Able Player

	// HTML5 Media API:
	// http://www.w3.org/TR/html5/embedded-content-0.html#htmlmediaelement
	// http://dev.w3.org/html5/spec-author-view/video.html

	// W3C API Test Page:
	// http://www.w3.org/2010/05/video/mediaevents.html

	// YouTube Player API for iframe Embeds
	https://developers.google.com/youtube/iframe_api_reference
	// YouTube Player Parameters
	https://developers.google.com/youtube/player_parameters?playerVersion=HTML5

	// YouTube Data API
	https://developers.google.com/youtube/v3

	// Vimeo Player API
	https://github.com/vimeo/player.js

	// Google API Client Library for JavaScript
	https://developers.google.com/api-client-library/javascript/dev/dev_jscript

	// Google API Explorer: YouTube services and methods
	https://developers.google.com/apis-explorer/#s/youtube/v3/

	// Web Speech API (Speech Synthesis)
	// https://w3c.github.io/speech-api/#tts-section
	// https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis
*/

/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */
/*global $, jQuery */
"use strict";

// maintain an array of Able Player instances for use globally (e.g., for keeping prefs in sync)
var AblePlayerInstances = [];

(function ($) {
	$(document).ready(function () {

		$('video, audio').each(function (index, element) {
			if ($(element).data('able-player') !== undefined) {
				AblePlayerInstances.push(new AblePlayer($(this),$(element)));
			}
		});
	});

	// YouTube player support; pass ready event to jQuery so we can catch in player.
	window.onYouTubeIframeAPIReady = function() {
		AblePlayer.youtubeIframeAPIReady = true;
		$('body').trigger('youtubeIframeAPIReady', []);
	};
	// If there is only one player on the page, dispatch global keydown events to it
	// Otherwise, keydowwn events are handled locally (see event.js > handleEventListeners())
	$(window).keydown(function(e) {
		if (AblePlayer.nextIndex === 1) {
			AblePlayer.lastCreated.onPlayerKeyPress(e);
		}
	});

	// Construct an AblePlayer object
	// Parameters are:
	// media - jQuery selector or element identifying the media.
	window.AblePlayer = function(media) {
		// Keep track of the last player created for use with global events.
		AblePlayer.lastCreated = this;
		this.media = media;
		if ($(media).length === 0) {
			this.provideFallback();
			return;
		}

		///////////////////////////////
		//
		// Default variables assignment
		//
		///////////////////////////////

		// The following variables CAN be overridden with HTML attributes

		// autoplay (Boolean; if present always resolves to true, regardless of value)
		if ($(media).attr('autoplay') !== undefined) {
			this.autoplay = true; // this value remains constant
			this.okToPlay = true; // this value can change dynamically
		}
		else {
			this.autoplay = false;
			this.okToPlay = false;
		}

		// loop (Boolean; if present always resolves to true, regardless of value)
		if ($(media).attr('loop') !== undefined) {
			this.loop = true;
		}
		else {
			this.loop = false;
		}

		// playsinline (Boolean; if present always resolves to true, regardless of value)
		if ($(media).attr('playsinline') !== undefined) {
			this.playsInline = '1'; // this value gets passed to YT.Player contructor in youtube.js
		}
		else {
			this.playsInline = '0';
		}

		// poster (Boolean, indicating whether media element has a poster attribute)
		if ($(media).attr('poster')) {
			this.hasPoster = true;
		}
		else {
			this.hasPoster = false;
		}

		// start-time
		if ($(media).data('start-time') !== undefined && $.isNumeric($(media).data('start-time'))) {
			this.startTime = $(media).data('start-time');
		}
		else {
			this.startTime = 0;
		}

		// debug
		if ($(media).data('debug') !== undefined && $(media).data('debug') !== false) {
			this.debug = true;
		}
		else {
			this.debug = false;
		}

		// Path to root directory of Able Player code
		if ($(media).data('root-path') !== undefined) {
			// add a trailing slash if there is none
			this.rootPath = $(media).data('root-path').replace(/\/?$/, '/');
		}
		else {
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
		}
		else {
			this.useChaptersButton = true;
		}

		if ($(media).data('use-descriptions-button') !== undefined && $(media).data('use-descriptions-button') === false) {
			this.useDescriptionsButton = false;
		}
		else {
			this.useDescriptionsButton = true;
		}

		// Silence audio description
		// set to "false" if the sole purposes of the WebVTT descriptions file
		// is to display description text visibly and to integrate it into the transcript
		if ($(media).data('descriptions-audible') !== undefined && $(media).data('descriptions-audible') === false) {
			this.exposeTextDescriptions = false;
		}
		else if ($(media).data('description-audible') !== undefined && $(media).data('description-audible') === false) {
  		// support both singular and plural spelling of attribute
			this.exposeTextDescriptions = false;
		}
		else {
			this.exposeTextDescriptions = true;
		}

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
		// 2. "external" - Automatically generated, written to an external div (requires data-transcript-div)
		// 3. "popup" - Automatically generated, written to a draggable, resizable popup window that can be toggled on/off with a button
		// If data-include-transcript="false", there is no "popup" transcript

		if ($(media).data('transcript-div') !== undefined && $(media).data('transcript-div') !== "") {
		  this.transcriptDivLocation = $(media).data('transcript-div');
		}
		else {
  		this.transcriptDivLocation = null;
    }
		if ($(media).data('include-transcript') !== undefined && $(media).data('include-transcript') === false) {
  		this.hideTranscriptButton = true;
    }
    else {
      this.hideTranscriptButton = null;
    }

		this.transcriptType = null;
		if ($(media).data('transcript-src') !== undefined) {
			this.transcriptSrc = $(media).data('transcript-src');
			if (this.transcriptSrcHasRequiredParts()) {
				this.transcriptType = 'manual';
			}
		}
		else if ($(media).find('track[kind="captions"], track[kind="subtitles"]').length > 0) {
			// required tracks are present. COULD automatically generate a transcript
      if (this.transcriptDivLocation) {
				this.transcriptType = 'external';
			}
			else {
				this.transcriptType = 'popup';
			}
		}

		// In "Lyrics Mode", line breaks in WebVTT caption files are supported in the transcript
		// If false (default), line breaks are are removed from transcripts in order to provide a more seamless reading experience
		// If true, line breaks are preserved, so content can be presented karaoke-style, or as lines in a poem
		if ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== false) {
			this.lyricsMode = true;
		}
		else {
			this.lyricsMode = false;
		}

		// Transcript Title
		if ($(media).data('transcript-title') !== undefined && $(media).data('transcript-title') !== "") {
			this.transcriptTitle = $(media).data('transcript-title');
		}
		else {
			// do nothing. The default title will be defined later (see transcript.js)
		}

		// Captions
		// data-captions-position can be used to set the default captions position
		// this is only the default, and can be overridden by user preferences
		// valid values of data-captions-position are 'below' and 'overlay'
		if ($(media).data('captions-position') === 'overlay') {
			this.defaultCaptionsPosition = 'overlay';
		}
		else { // the default, even if not specified
			this.defaultCaptionsPosition = 'below';
		}

		// Chapters
		if ($(media).data('chapters-div') !== undefined && $(media).data('chapters-div') !== "") {
			this.chaptersDivLocation = $(media).data('chapters-div');
		}

		if ($(media).data('chapters-title') !== undefined) {
			// NOTE: empty string is valid; results in no title being displayed
			this.chaptersTitle = $(media).data('chapters-title');
		}

		if ($(media).data('chapters-default') !== undefined && $(media).data('chapters-default') !== "") {
			this.defaultChapter = $(media).data('chapters-default');
		}
		else {
			this.defaultChapter = null;
		}

		// Slower/Faster buttons
		// valid values of data-speed-icons are 'animals' (default) and 'arrows'
		// 'animals' uses turtle and rabbit; 'arrows' uses up/down arrows
		if ($(media).data('speed-icons') === 'arrows') {
			this.speedIcons = 'arrows';
		}
		else {
			this.speedIcons = 'animals';
		}

		// Seekbar
		// valid values of data-seekbar-scope are 'chapter' and 'video'; will also accept 'chapters'
		if ($(media).data('seekbar-scope') === 'chapter' || $(media).data('seekbar-scope') === 'chapters') {
			this.seekbarScope = 'chapter';
		}
		else {
			this.seekbarScope = 'video';
		}

		// YouTube
		if ($(media).data('youtube-id') !== undefined && $(media).data('youtube-id') !== "") {
			this.youTubeId = $(media).data('youtube-id');
		}

		if ($(media).data('youtube-desc-id') !== undefined && $(media).data('youtube-desc-id') !== "") {
			this.youTubeDescId = $(media).data('youtube-desc-id');
		}

		if ($(media).data('youtube-nocookie') !== undefined && $(media).data('youtube-nocookie')) {
			this.youTubeNoCookie = true;
		}
		else {
			this.youTubeNoCookie = false;
		}

		// Vimeo
		if ($(media).data('vimeo-id') !== undefined && $(media).data('vimeo-id') !== "") {
			this.vimeoId = $(media).data('vimeo-id');
		}
		if ($(media).data('vimeo-desc-id') !== undefined && $(media).data('vimeo-desc-id') !== "") {
			this.vimeoDescId = $(media).data('vimeo-desc-id');
		}

		// Skin
		// valid values of data-skin are:
		// 'legacy' (default), two rows of controls; seekbar positioned in available space within top row
		// '2020', all buttons in one row beneath a full-width seekbar
		if ($(media).data('skin') == '2020') {
			this.skin = '2020';
		}
		else {
			this.skin = 'legacy';
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
			if (iconType === 'font' || iconType == 'image' || iconType == 'svg') {
				this.iconType = iconType;
				this.forceIconType = true;
			}
		}

		if ($(media).data('allow-fullscreen') !== undefined && $(media).data('allow-fullscreen') === false) {
			this.allowFullScreen = false;
		}
		else {
			this.allowFullScreen = true;
		}

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
		if ($(media).data('show-now-playing') !== undefined && $(media).data('show-now-playing') === false) {
			this.showNowPlaying = false;
		}
		else {
			this.showNowPlaying = true;
		}

		// TTML support (experimental); enabled for testing with data-use-ttml (Boolean)
		if ($(media).data('use-ttml') !== undefined) {
			this.useTtml = true;
			// The following may result in a console error.
			this.convert = require('xml-js');
		}
		else {
			this.useTtml = false;
		}

		// Fallback
		// The only supported fallback content as of version 4.0 is:
		// 1. Content nested within the <audio> or <video> element.
		// 2. A standard localized message (see buildplayer.js > provideFallback()
		// The data-test-fallback attribute can be used to test the fallback solution in any browser
		if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== false) {
			this.testFallback = true;
		}

		// Language
		this.lang = 'en';
		if ($(media).data('lang') !== undefined && $(media).data('lang') !== "") {
			var lang = $(media).data('lang');
			if (lang.length == 2) {
				this.lang = lang;
			}
		}
		// Player language is determined as follows (in translation.js > getTranslationText() ):
		// 1. Lang attributes on <html> or <body>, if a matching translation file is available
		// 2. The value of this.lang, if a matching translation file is available
		// 3. English
		// To override this formula and force #2 to take precedence over #1, set data-force-lang="true"
		if ($(media).data('force-lang') !== undefined && $(media).data('force-lang') !== false) {
			this.forceLang = true;
		}
		else {
			this.forceLang = false;
		}

		// Metadata Tracks
		if ($(media).data('meta-type') !== undefined && $(media).data('meta-type') !== "") {
			this.metaType = $(media).data('meta-type');
		}

		if ($(media).data('meta-div') !== undefined && $(media).data('meta-div') !== "") {
			this.metaDiv = $(media).data('meta-div');
		}

		// Search
		if ($(media).data('search') !== undefined && $(media).data('search') !== "") {
			// conducting a search currently requires an external div in which to write the results
			if ($(media).data('search-div') !== undefined && $(media).data('search-div') !== "") {
				this.searchString = $(media).data('search');
				this.searchDiv = $(media).data('search-div');
			}

			// Search Language
			if ($(media).data('search-lang') !== undefined && $(media).data('search-lang') !== "") {
				this.searchLang = $(media).data('search-lang');
			}
			else {
				this.searchLang = null; // will change to final value of this.lang in translation.js > getTranslationText()
			}

			// conducting a search currently requires an external div in which to write the results
			if ($(media).data('search-div') !== undefined && $(media).data('search-div') !== "") {
				this.searchString = $(media).data('search');
				this.searchDiv = $(media).data('search-div');
			}
		}

		// Hide controls when video starts playing
		// They will reappear again when user presses a key or moves the mouse
		// As of v4.0, controls are hidden automatically on playback in fullscreen mode
		if ($(media).data('hide-controls') !== undefined && $(media).data('hide-controls') !== false) {
			this.hideControls = true;
			this.hideControlsOriginal = true; // a copy of hideControls, since the former may change if user enters full screen mode
		}
		else {
			this.hideControls = false;
			this.hideControlsOriginal = false;
		}

		// Steno mode
		// Enable support for Able Player keyboard shortcuts in textaarea fields
		// so users can control the player while transcribing
		if ($(media).data('steno-mode') !== undefined && $(media).data('steno-mode') !== false) {
			this.stenoMode = true;
		}
		else {
			this.stenoMode = false;
		}

		// Define built-in variables that CANNOT be overridden with HTML attributes
		this.setDefaults();

		////////////////////////////////////////
		//
		// End assignment of default variables
		//
		////////////////////////////////////////

		this.ableIndex = AblePlayer.nextIndex;
		AblePlayer.nextIndex += 1;

		this.title = $(media).attr('title');

		// populate translation object with localized versions of all labels and prompts
		// use defer method to defer additional processing until text is retrieved
		this.tt = {};
		var thisObj = this;
		$.when(this.getTranslationText()).then(
			function () {
				if (thisObj.countProperties(thisObj.tt) > 50) {
					// close enough to ensure that most text variables are populated
					thisObj.setup();
				}
				else {
					// can't continue loading player with no text
					thisObj.provideFallback();
				}
			}
		);
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
			}
			else {
				thisObj.setupInstance().then(function () {
					thisObj.setupInstancePlaylist();
					if (!thisObj.hasPlaylist) {
						// for playlists, recreatePlayer() is called from within cuePlaylistItem()
						thisObj.recreatePlayer();
					}
					thisObj.initializing = false;
					thisObj.playerCreated = true; // remains true until browser is refreshed
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
		if (element.getRootNode)
		{
			// Use getRootNode() and querySelector() where supported (for shadow DOM support)
			return $(element.getRootNode().querySelector('#' + id));
		}
		else
		{
			// If getRootNode is not supported it should be safe to use document.getElementById (since there is no shadow DOM support)
			return $(document.getElementById(id));
		}
	};



	AblePlayer.youtubeIframeAPIReady = false;
	AblePlayer.loadingYoutubeIframeAPI = false;
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
		this.okToPlay = false; // will change to true if conditions are acceptible for automatic playback after media loads
		this.buttonWithFocus = null; // will change to 'previous' or 'next' if user clicks either of those buttons

		this.getUserAgent();
		this.setIconColor();
		this.setButtonImages();
	};

	AblePlayer.prototype.getRootPath = function() {

		// returns Able Player root path (assumes ableplayer.js is in /build, one directory removed from root)
		var scripts, i, scriptSrc, scriptFile, fullPath, ablePath, parentFolderIndex, rootPath;
		scripts= document.getElementsByTagName('script');
		for (i=0; i < scripts.length; i++) {
			scriptSrc = scripts[i].src;
			scriptFile = scriptSrc.substr(scriptSrc.lastIndexOf('/'));
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
			}
			else if ($elements[i] === 'toolbar') {
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
			if (luminance < 125) { // background is dark
				iconColor = 'white';
			}
			else { // background is light
				iconColor = 'black';
			}
			if ($elements[i] === 'controller') {
				this.iconColor = iconColor;
			}
			else if ($elements[i] === 'toolbar') {
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
		}
		else if (this.speedIcons === 'animals') {
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

	AblePlayer.prototype.getSvgData = function(button) {

		// returns array of values for creating <svg> tag for specified button
		// 0 = <svg> viewBox attribute
		// 1 = <path> d (description) attribute
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

			case 'stop':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h15.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-15.714q-0.29 0-0.502-0.212t-0.212-0.502z';
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
				svg[0] = '0 0 20 20';
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

			case 'help':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0.577 6.317q-0.028-0.167 0.061-0.313 1.786-2.969 5.179-2.969 0.893 0 1.797 0.346t1.629 0.926 1.183 1.423 0.458 1.769q0 0.603-0.173 1.127t-0.391 0.854-0.614 0.664-0.642 0.485-0.681 0.396q-0.458 0.257-0.765 0.725t-0.307 0.748q0 0.19-0.134 0.363t-0.313 0.173h-2.679q-0.167 0-0.285-0.206t-0.117-0.419v-0.502q0-0.926 0.725-1.747t1.596-1.211q0.658-0.301 0.938-0.625t0.279-0.848q0-0.469-0.519-0.826t-1.2-0.357q-0.725 0-1.205 0.324-0.391 0.279-1.194 1.283-0.145 0.179-0.346 0.179-0.134 0-0.279-0.089l-1.83-1.395q-0.145-0.112-0.173-0.279zM3.786 16.875v-2.679q0-0.179 0.134-0.313t0.313-0.134h2.679q0.179 0 0.313 0.134t0.134 0.313v2.679q0 0.179-0.134 0.313t-0.313 0.134h-2.679q-0.179 0-0.313-0.134t-0.134-0.313z';
				break;
		}

		return svg;
	};

	// Initialize player based on data on page.
	// This sets some variables, but does not modify anything.	Safe to call multiple times.
	// Can call again after updating this.media so long as new media element has the same ID.
	AblePlayer.prototype.reinitialize = function () {

		var deferred, promise, thisObj, errorMsg, srcFile;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		// if F12 Developer Tools aren't open in IE (through 9, no longer a problen in IE10)
		// console.log causes an error - can't use debug without a console to log messages to
		if (! window.console) {
			this.debug = false;
		}

		this.startedPlaying = false;
		// TODO: Move this setting to cookie.
		this.autoScrollTranscript = true;
		//this.autoScrollTranscript = this.getCookie(autoScrollTranscript); // (doesn't work)

		// Bootstrap from this.media possibly being an ID or other selector.
		this.$media = $(this.media).first();
		this.media = this.$media[0];
		// Set media type to 'audio' or 'video'; this determines some of the behavior of player creation.
		if (this.$media.is('audio')) {
			this.mediaType = 'audio';
		}
		else if (this.$media.is('video')) {
			this.mediaType = 'video';
		}
		else {
			// Able Player was initialized with some element other than <video> or <audio>
			this.provideFallback();
			deferred.fail();
			return promise;
		}

		this.$sources = this.$media.find('source');

		this.player = this.getPlayer();
		if (!this.player) {
			// an error was generated in getPlayer()
			this.provideFallback();
		}
		this.setIconType();
		this.setDimensions();

		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.setDimensions = function() {
		// if media element includes width and height attributes,
		// use these to set the max-width and max-height of the player
		if (this.$media.attr('width') && this.$media.attr('height')) {
			this.playerMaxWidth = parseInt(this.$media.attr('width'), 10);
			this.playerMaxHeight = parseInt(this.$media.attr('height'), 10);
		}
		else if (this.$media.attr('width')) {
			// media element includes a width attribute, but not height
			this.playerMaxWidth = parseInt(this.$media.attr('width'), 10);
		}
		else {
			// set width to width of #player
			// don't set height though; YouTube will automatically set that to match width
			this.playerMaxWidth = this.$media.parent().width();
			this.playerMaxHeight = this.getMatchingHeight(this.playerMaxWidth);
		}
		// override width and height attributes with in-line CSS to make video responsive
		this.$media.css({
			'width': '100%',
			'height': 'auto'
		});
	};

	AblePlayer.prototype.getMatchingHeight = function(width) {

		// returns likely height for a video, given width
		// These calculations assume 16:9 aspect ratio (the YouTube standard)
		// Videos recorded in other resolutions will be sized to fit, with black bars on each side
		// This function is only called if the <video> element does not have width and height attributes

		var widths, heights, closestWidth, closestIndex, closestHeight, height;

		widths = [ 3840, 2560, 1920, 1280, 854, 640, 426 ];
		heights = [ 2160, 1440, 1080, 720, 480, 360, 240 ];
		closestWidth = null;
		closestIndex = null;

		$.each(widths, function(index){
			if (closestWidth == null || Math.abs(this - width) < Math.abs(closestWidth - width)) {
				closestWidth = this;
				closestIndex = index;
			}
		});
		closestHeight = heights[closestIndex];
		this.aspectRatio = closestWidth / closestHeight;
		height = Math.round(width / this.aspectRatio);
		return height;
	};

	AblePlayer.prototype.setIconType = function() {

		// returns either "svg", "font" or "image" (in descending order of preference)
		// Test for support of each type. If not supported, test the next type.
		// last resort is image icons

		var $tempButton, $testButton, controllerFont;

		if (this.forceIconType) {
			// use value specified in data-icon-type
			return false;
		}

		// test for SVG support
		// Test this method widely; failed as expected on IE8 and below
		// https://stackoverflow.com/a/27568129/744281
		if (!!(document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect)) {
			// browser supports SVG
			this.iconType = 'svg';
		}
		else {
			// browser does NOT support SVG
			// test whether browser can support icon fonts, and whether user has overriding the default style sheet
			// which could cause problems with proper display of the icon fonts
			if (window.getComputedStyle) {

				// webkit doesn't return calculated styles unless element has been added to the DOM
				// and is visible (note: visibly clipped is considered "visible")
				// use playpauseButton for font-family test if it exists; otherwise must create a new temp button
				if ($('span.icon-play').length) {
					$testButton = $('span.icon-play');
				}
				else {
					$tempButton = $('<span>',{
						'class': 'icon-play able-clipped'
					});
					$('body').append($tempButton);
					$testButton = $tempButton;
				}

				// the following retrieves the computed value of font-family
				// tested in Firefox 45.x with "Allow pages to choose their own fonts" unchecked - works!
				// tested in Chrome 49.x with Font Changer plugin - works!
				// tested in IE with user-defined style sheet enables - works!
				// It does NOT account for users who have "ignore font styles on web pages" checked in IE
				// There is no known way to check for that ???
				controllerFont = window.getComputedStyle($testButton.get(0), null).getPropertyValue('font-family');
				if (typeof controllerFont !== 'undefined') {
					if (controllerFont.indexOf('able') !== -1) {
						this.iconType = 'font';
					}
					else {
						this.iconType = 'image';
					}
				}
				else {
					// couldn't get computed font-family; use images to be safe
					this.iconType = 'image';
				}
			}
			else { // window.getComputedStyle is not supported (IE 8 and earlier)
				// No known way to detect computed font
				// The following retrieves the value from the style sheet, not the computed font
				// controllerFont = $tempButton.get(0).currentStyle.fontFamily;
				// It will therefore return "able", even if the user is overriding that with a custom style sheet
				// To be safe, use images
				this.iconType = 'image';
			}
			if (this.debug) {
				
			}
			if (typeof $tempButton !== 'undefined') {
				$tempButton.remove();
			}
		}
	};

	// Perform one-time setup for this instance of player; called after player is first initialized.
	AblePlayer.prototype.setupInstance = function () {

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		if (this.$media.attr('id')) {
			this.mediaId = this.$media.attr('id');
		}
		else {
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
					var youTubeId = $(this).attr('data-youtube-id');
					var youTubePoster = thisObj.getYouTubePosterUrl(youTubeId,'120');
					var $youTubeImg = $('<img>',{
						'src': youTubePoster,
						'alt': ''
					});
					$(this).find('button').prepend($youTubeImg);
				});

				// add accessibility to the list markup
				$(this).find('li span').attr('aria-hidden','true');
				thisObj.playlistIndex = 0;
				var dataEmbedded = $(this).data('embedded');
				if (typeof dataEmbedded !== 'undefined' && dataEmbedded !== false) {
					// embed playlist within player
					thisObj.playlistEmbed = true;
				}
				else {
					thisObj.playlistEmbed = false;
				}
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
		var thisObj, prefsGroups, i;
		thisObj = this;

		// TODO: Ensure when recreating player that we carry over the mediaId
		if (!this.player) {
			console.log("Can't create player; no appropriate player type detected.");
			return;
		}
		if (!this.playerCreated) {
			// only call these functions once
			 this.loadCurrentPreferences();
			this.injectPlayerCode();
		}

		// call all remaining functions each time a new media instance is loaded

		this.initSignLanguage();

		this.initPlayer().then(function() {

			 thisObj.setupTracks().then(function() {

				thisObj.setupAltCaptions().then(function() {

					thisObj.setupTranscript().then(function() {

            thisObj.getMediaTimes().then(function(mediaTimes) {

              thisObj.duration = mediaTimes['duration'];
              thisObj.elapsed = mediaTimes['elapsed'];

              thisObj.setFullscreen(false);

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
              if (thisObj.mediaType === 'video') {
							  thisObj.initDescription();
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
              if (thisObj.chaptersDivLocation) {
							  thisObj.populateChaptersDiv();
				      }
              thisObj.showSearchResults();

              // Go ahead and load media, without user requesting it
              // Ideally, we would wait until user clicks play, rather than unnecessarily consume their bandwidth
              // However, the media needs to load before the 'loadedmetadata' event is fired
              // and until that happens we can't get the media's duration
              if (thisObj.player === 'html5') {
							  thisObj.$media[0].load();
						  }
              // refreshControls is called twice building/initializing the player
              // this is the second. Best to pause a bit before executing, to be sure all prior steps are complete
              setTimeout(function() {
							  thisObj.refreshControls('init');
						  },100);
            });
					},
					function() {	 // initPlayer fail
						thisObj.provideFallback();
					});
				});
			});
		});
	};

	AblePlayer.prototype.initPlayer = function () {

		var thisObj = this;
		var playerPromise;
		// First run player specific initialization.
		if (this.player === 'html5') {
			playerPromise = this.initHtml5Player();
		}
		else if (this.player === 'youtube') {
			playerPromise = this.initYouTubePlayer();
		}
		else if (this.player === 'vimeo') {
			playerPromise = this.initVimeoPlayer();
		}
		// After player specific initialization is done, run remaining general initialization.
		var deferred = new $.Deferred();
		var promise = deferred.promise();
		playerPromise.done(
			function () { // done/resolved
				if (thisObj.useFixedSeekInterval) {
  				if (!thisObj.seekInterval) {
            thisObj.seekInterval = thisObj.defaultSeekInterval;
          }
          else {
            // fixed seekInterval was already assigned, using value of data-seek-interval attribute
          }
          thisObj.seekIntervalCalculated = true;
        }
        else {
					thisObj.setSeekInterval();
				}
				deferred.resolve();
			}
		).fail(function () { // failed
			deferred.reject();
			}
		);

		return promise;
	};

	AblePlayer.prototype.setSeekInterval = function () {

		// this function is only called if this.useFixedSeekInterval is false
		// if this.useChapterTimes, this is called as each new chapter is loaded
		// otherwise, it's called once, as the player is initialized
		var thisObj, duration;
		thisObj = this;
		this.seekInterval = this.defaultSeekInterval;
		if (this.useChapterTimes) {
			duration = this.chapterDuration;
		}
		else {
			duration = this.duration;
		}
		if (typeof duration === 'undefined' || duration < 1) {
			// no duration; just use default for now but keep trying until duration is available
			this.seekIntervalCalculated = false;
			return;
		}
		else {
			if (duration <= 20) {
				this.seekInterval = 5;	 // 4 steps max
			}
			else if (duration <= 30) {
				this.seekInterval = 6; // 5 steps max
			}
			else if (duration <= 40) {
				this.seekInterval = 8; // 5 steps max
			}
			else if (duration <= 100) {
				this.seekInterval = 10; // 10 steps max
			}
			else {
				// never more than 10 steps from start to end
				this.seekInterval = (duration / 10);
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
				    }).catch(function(error) {
					    switch (error.name) {
						    case 'InvalidTrackLanguageError':
							    // no track was available with the specified language
                  
                  break;
                case 'InvalidTrackError':
							    // no track was available with the specified language and kind
                  
                  break;
                default:
							    // some other error occurred
                  
                  break;
    		      }
				    });
			    }
          else {
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
		var deferred = new $.Deferred();
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

		var i, sourceType, $newItem;
		if (this.youTubeId) {
			if (this.mediaType !== 'video') {
				// attempting to play a YouTube video using an element other than <video>
				return null;
			}
			else {
				return 'youtube';
			}
		}
		else if (this.vimeoId) {
			if (this.mediaType !== 'video') {
				// attempting to play a Vimeo video using an element other than <video>
				return null;
			}
			else {
				return 'vimeo';
			}

		}
		else if (this.testFallback ||
						 ((this.isUserAgent('msie 7') || this.isUserAgent('msie 8') || this.isUserAgent('msie 9')) && this.mediaType === 'video') ||
						 (this.isIOS() && (this.isIOS(4) || this.isIOS(5) || this.isIOS(6)))
						) {
			// the user wants to test the fallback player, or
			// the user is using an older version of IE or IOS,
			// both of which had buggy implementation of HTML5 video
			return null;
		}
		else if (this.media.canPlayType) {
			return 'html5';
		}
		else {
			// Browser does not support the available media file
			return null;
		}
	};

})(jQuery);

(function ($) {
	AblePlayer.prototype.setCookie = function(cookieValue) {
		Cookies.set('Able-Player', cookieValue, { expires:90 });
		// set the cookie lifetime for 90 days
	};

	AblePlayer.prototype.getCookie = function() {

		var defaultCookie = {
			preferences: {},
			sign: {},
			transcript: {}
		};

		var cookie;
		try {
			cookie = Cookies.getJSON('Able-Player');
		}
		catch (err) {
			// Original cookie can't be parsed; update to default
			Cookies.getJSON(defaultCookie);
			cookie = defaultCookie;
		}
		if (cookie) {
			return cookie;
		}
		else {
			return defaultCookie;
		}
	};

	AblePlayer.prototype.updateCookie = function( setting ) {

		// called when a particular setting had been updated
		// useful for settings updated indepedently of Preferences dialog
		// e.g., prefAutoScrollTranscript, which is updated in control.js > handleTranscriptLockToggle()
		// setting is any supported preference name (e.g., "prefCaptions")
		// OR 'transcript' or 'sign' (not user-defined preferences, used to save position of draggable windows)
		var cookie, $window, windowPos, available, i, prefName;
		cookie = this.getCookie();

		if (setting === 'transcript' || setting === 'sign') {
			if (setting === 'transcript') {
				$window = this.$transcriptArea;
				windowPos = $window.position();
				if (typeof cookie.transcript === 'undefined') {
					cookie.transcript = {};
				}
				cookie.transcript['position'] = $window.css('position'); // either 'relative' or 'absolute'
				cookie.transcript['zindex'] = $window.css('z-index');
				cookie.transcript['top'] = windowPos.top;
				cookie.transcript['left'] = windowPos.left;
				cookie.transcript['width'] = $window.width();
				cookie.transcript['height'] = $window.height();
			}
			else if (setting === 'sign') {
				$window = this.$signWindow;
				windowPos = $window.position();
				if (typeof cookie.sign === 'undefined') {
					cookie.sign = {};
				}
				cookie.sign['position'] = $window.css('position'); // either 'relative' or 'absolute'
				cookie.sign['zindex'] = $window.css('z-index');
				cookie.sign['top'] = windowPos.top;
				cookie.sign['left'] = windowPos.left;
				cookie.sign['width'] = $window.width();
				cookie.sign['height'] = $window.height();
			}
		}
		else {
			available = this.getAvailablePreferences();
			// Rebuild cookie with current cookie values,
			// replacing the one value that's been changed
			for (i = 0; i < available.length; i++) {
				prefName = available[i]['name'];
				if (prefName == setting) {
					// this is the one that requires an update
					cookie.preferences[prefName] = this[prefName];
				}
			}
		}
		// Save updated cookie
		this.setCookie(cookie);
	};

	AblePlayer.prototype.getPreferencesGroups = function() {

		// return array of groups in the order in which they will appear
		// in the Preferences popup menu
		// Human-readable label for each group is defined in translation table
		if (this.mediaType === 'video') {
			return ['captions','descriptions','keyboard','transcript'];
		}
		else if (this.mediaType === 'audio') {
			var groups = [];
			groups.push('keyboard');
			if (this.lyricsMode) {
				groups.push('transcript');
			}
			return groups;
		}
	}

	AblePlayer.prototype.getAvailablePreferences = function() {

		// Return the list of currently available preferences.
		// Preferences with no 'label' are set within player, not shown in Prefs dialog
		var prefs = [];

		// Modifier keys preferences
		prefs.push({
			'name': 'prefAltKey', // use alt key with shortcuts
			'label': this.tt.prefAltKey,
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefCtrlKey', // use ctrl key with shortcuts
			'label': this.tt.prefCtrlKey,
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefShiftKey',
			'label': this.tt.prefShiftKey,
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
			'label': this.tt.prefHighlight,
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
			'label': this.tt.prefTabbable,
			'group': 'transcript',
			'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
		});

		if (this.mediaType === 'video') {

			// Caption preferences
			prefs.push({
				'name': 'prefCaptions', // closed captions default state
				'label': null,
				'group': 'captions',
				'default': 1
			});
/* // not supported yet
			prefs.push({
				'name': 'prefCaptionsStyle',
				'label': this.tt.prefCaptionsStyle,
				'group': 'captions',
				'default': this.tt.captionsStylePopOn
			});
*/
			prefs.push({
				'name': 'prefCaptionsPosition',
				'label': this.tt.prefCaptionsPosition,
				'group': 'captions',
				'default': this.defaultCaptionsPosition
			});
			prefs.push({
				'name': 'prefCaptionsFont',
				'label': this.tt.prefCaptionsFont,
				'group': 'captions',
				'default': 'sans'
			});
			prefs.push({
				'name': 'prefCaptionsSize',
				'label': this.tt.prefCaptionsSize,
				'group': 'captions',
				'default': '100%'
			});
			prefs.push({
				'name': 'prefCaptionsColor',
				'label': this.tt.prefCaptionsColor,
				'group': 'captions',
				'default': 'white'
			});
			prefs.push({
				'name': 'prefCaptionsBGColor',
				'label': this.tt.prefCaptionsBGColor,
				'group': 'captions',
				'default': 'black'
			});
			prefs.push({
				'name': 'prefCaptionsOpacity',
				'label': this.tt.prefCaptionsOpacity,
				'group': 'captions',
				'default': '100%'
			});

			// Description preferences
			prefs.push({
				'name': 'prefDesc', // audio description default state
				'label': null,
				'group': 'descriptions',
				'default': 0 // off because users who don't need it might find it distracting
			});
			prefs.push({
				'name': 'prefDescFormat', // audio description default state
				'label': null,
				'group': 'descriptions',
				'default': 'video'
			});
			prefs.push({
				'name': 'prefDescPause', // automatically pause when closed description starts
				'label': this.tt.prefDescPause,
				'group': 'descriptions',
				'default': 0 // off because it burdens user with restarting after every pause
			});
			prefs.push({
				'name': 'prefVisibleDesc', // visibly show closed description (if avilable and used)
				'label': this.tt.prefVisibleDesc,
				'group': 'descriptions',
				'default': 1 // on because sighted users probably want to see this cool feature in action
			});

			// Video preferences without a category (not shown in Preferences dialogs)
			prefs.push({
				'name': 'prefSign', // open sign language window by default if avilable
				'label': null,
				'group': null,
				'default': 0 // off because clicking an icon to see the sign window has a powerful impact
			});

		}
		return prefs;
	};

	AblePlayer.prototype.loadCurrentPreferences = function () {

  	// Load current/default preferences from cookie into the AblePlayer object.

		var available = this.getAvailablePreferences();
		var cookie = this.getCookie();

		// Copy current cookie values into this object, and fill in any default values.
		for (var ii = 0; ii < available.length; ii++) {
			var prefName = available[ii]['name'];
			var defaultValue = available[ii]['default'];
			if (cookie.preferences[prefName] !== undefined) {
				this[prefName] = cookie.preferences[prefName];
			}
			else {
				cookie.preferences[prefName] = defaultValue;
				this[prefName] = defaultValue;
			}
		}

		// Save since we may have added default values.
		this.setCookie(cookie);
	};

	AblePlayer.prototype.injectPrefsForm = function (form) {

		// Creates a preferences form and injects it.
		// form is one of the supported forms (groups) defined in getPreferencesGroups()

		var available, thisObj, $prefsDiv, formTitle, introText,
			$prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
			$fieldset, fieldsetClass, fieldsetId,
			$descFieldset, $descLegend, $legend,
			thisPref, $thisDiv, thisClass, thisId, $thisLabel, $thisField,
			$div1,id1,$radio1,$label1,
			$div2,id2,$radio2,$label2,
			options,$thisOption,optionValue,optionText,sampleCapsDiv,
			changedPref,changedSpan,changedText,
			currentDescState,
			$kbHeading,$kbList,kbLabels,keys,kbListText,$kbListItem,
			dialog,saveButton,cancelButton;

		thisObj = this;
		available = this.getAvailablePreferences();

		// outer container, will be assigned role="dialog"
		$prefsDiv = $('<div>',{
			'class': 'able-prefs-form '
		});
		var customClass = 'able-prefs-form-' + form;
		$prefsDiv.addClass(customClass);

		// add intro
		if (form == 'captions') {
			formTitle = this.tt.prefTitleCaptions;
			introText = this.tt.prefIntroCaptions;
			// Uncomment the following line to include a cookie warning
			// Not included for now in order to cut down on unnecessary verbiage
			// introText += ' ' + this.tt.prefCookieWarning;
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		}
		else if (form == 'descriptions') {
			formTitle = this.tt.prefTitleDescriptions;
			var $prefsIntro = $('<p>',{
				text: this.tt.prefIntroDescription1
			});
			var $prefsIntroUL = $('<ul>');
			var $prefsIntroLI1 = $('<li>',{
				text: this.tt.prefDescFormatOption1
			});
			var $prefsIntroLI2 = $('<li>',{
				text: this.tt.prefDescFormatOption2
			});

			$prefsIntroUL.append($prefsIntroLI1,$prefsIntroLI2);
			if (this.hasOpenDesc && this.hasClosedDesc) {
				currentDescState = this.tt.prefIntroDescription2 + ' ';
				currentDescState += '<strong>' + this.tt.prefDescFormatOption1b + '</strong>';
				currentDescState += ' <em>' + this.tt.and + '</em> <strong>' + this.tt.prefDescFormatOption2b + '</strong>.';
			}
			else if (this.hasOpenDesc) {
				currentDescState = this.tt.prefIntroDescription2;
				currentDescState += ' <strong>' + this.tt.prefDescFormatOption1b + '</strong>.';
			}
			else if (this.hasClosedDesc) {
				currentDescState = this.tt.prefIntroDescription2;
				currentDescState += ' <strong>' + this.tt.prefDescFormatOption2b + '</strong>.';
			}
			else {
				currentDescState = this.tt.prefIntroDescriptionNone;
			}
			$prefsIntroP2 = $('<p>',{
				html: currentDescState
			});

			p3Text = this.tt.prefIntroDescription3;
			if (this.hasOpenDesc || this.hasClosedDesc) {
				p3Text += ' ' + this.tt.prefIntroDescription4;
			}
			$prefsIntroP3 = $('<p>',{
				text: p3Text
			});

			$prefsDiv.append($prefsIntro,$prefsIntroUL,$prefsIntroP2,$prefsIntroP3);
		}
		else if (form == 'keyboard') {
			formTitle = this.tt.prefTitleKeyboard;
			introText = this.tt.prefIntroKeyboard1;
			introText += ' ' + this.tt.prefIntroKeyboard2;
			introText += ' ' + this.tt.prefIntroKeyboard3;
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		}
		else if (form == 'transcript') {
			formTitle = this.tt.prefTitleTranscript;
			introText = this.tt.prefIntroTranscript;
			// Uncomment the following line to include a cookie warning
			// Not included for now in order to cut down on unnecessary verbiage
			// introText += ' ' + this.tt.prefCookieWarning;
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		}

		$fieldset = $('<fieldset>');
		fieldsetClass = 'able-prefs-' + form;
		fieldsetId = this.mediaId + '-prefs-' + form;
		$fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
		if (form === 'keyboard') {
		  $legend = $('<legend>' + this.tt.prefHeadingKeyboard1 + '</legend>');
			$fieldset.append($legend);
		}
		else if (form === 'descriptions') {
  		$legend = $('<legend>' + this.tt.prefHeadingTextDescription + '</legend>');
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
						$thisField.change(function() {
							changedPref = $(this).attr('name');
							thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
						});
					}
					options = this.getCaptionsOptions(thisPref);
					for (j=0; j < options.length; j++) {
						if (thisPref === 'prefCaptionsPosition') {
							optionValue = options[j];
							if (optionValue === 'overlay') {
								optionText = this.tt.captionsPositionOverlay;
							}
							else if (optionValue === 'below') {
								optionValue = options[j];
								optionText = this.tt.captionsPositionBelow;
							}
						}
						else if (thisPref === 'prefCaptionsFont' || thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
							optionValue = options[j][0];
							optionText = options[j][1];
						}
						else if (thisPref === 'prefCaptionsOpacity') {
							optionValue = options[j];
							optionText = options[j];
							if (optionValue === '0%') {
								optionText += ' (' + this.tt.transparent + ')';
							}
							else if (optionValue === '100%') {
								optionText += ' (' + this.tt.solid + ')';
							}
						}
						else {
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
				}
				else { // all other fields are checkboxes
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
						$thisField.change(function() {
							changedPref = $(this).attr('name');
							if (changedPref === 'prefAltKey') {
								changedSpan = '.able-modkey-alt';
								changedText = thisObj.tt.prefAltKey + ' + ';
							}
							else if (changedPref === 'prefCtrlKey') {
								changedSpan = '.able-modkey-ctrl';
								changedText = thisObj.tt.prefCtrlKey + ' + ';
							}
							else if (changedPref === 'prefShiftKey') {
								changedSpan = '.able-modkey-shift';
								changedText = thisObj.tt.prefShiftKey + ' + ';
							}
							if ($(this).is(':checked')) {
								$(changedSpan).text(changedText);
							}
							else {
								$(changedSpan).text('');
							}
						});
					}
					$thisDiv.append($thisField,$thisLabel);
				}
				$fieldset.append($thisDiv);
			}
		}
		$prefsDiv.append($fieldset);

		if (form === 'captions') {
			// add a sample closed caption div to prefs dialog
			if (this.mediaType === 'video') {
				this.$sampleCapsDiv = $('<div>',{
					'class': 'able-captions-sample'
				}).text(this.tt.sampleCaptionText);
				$prefsDiv.append(this.$sampleCapsDiv);
				this.stylizeCaptions(this.$sampleCapsDiv);
			}
		}
		else if (form === 'keyboard') {
			// add a current list of keyboard shortcuts
			$kbHeading = $('<h2>',{
				text: this.tt.prefHeadingKeyboard2
			});
			$kbList = $('<ul>');
			// create arrays of kbLabels and keys
			kbLabels = [];
			keys = [];
			for (i=0; i<this.controls.length; i++) {
				if (this.controls[i] === 'play') {
					kbLabels.push(this.tt.play + '/' + this.tt.pause);
					keys.push('p</span> <em>' + this.tt.or + '</em> <span class="able-help-modifiers"> ' + this.tt.spacebar);
				}
				else if (this.controls[i] === 'restart') {
					kbLabels.push(this.tt.restart);
					keys.push('s');
				}
				else if (this.controls[i] === 'previous') {
					kbLabels.push(this.tt.prevTrack);
					keys.push('b'); // b = back
				}
				else if (this.controls[i] === 'next') {
					kbLabels.push(this.tt.nextTrack);
					keys.push('n');
				}
				else if (this.controls[i] === 'rewind') {
					kbLabels.push(this.tt.rewind);
					keys.push('r');
				}
				else if (this.controls[i] === 'forward') {
					kbLabels.push(this.tt.forward);
					keys.push('f');
				}
				else if (this.controls[i] === 'volume') {
					kbLabels.push(this.tt.volume);
					keys.push('v</span> <em>' + this.tt.or + '</em> <span class="able-modkey">1-9');
					// mute toggle
					kbLabels.push(this.tt.mute + '/' + this.tt.unmute);
					keys.push('m');
				}
				else if (this.controls[i] === 'captions') {
					if (this.captions.length > 1) {
						// caption button launches a Captions popup menu
						kbLabels.push(this.tt.captions);
					}
					else {
						// there is only one caption track
						// therefore caption button is a toggle
						if (this.captionsOn) {
							kbLabels.push(this.tt.hideCaptions);
						}
						else {
							kbLabels.push(this.tt.showCaptions);
						}
					}
					keys.push('c');
				}
				else if (this.controls[i] === 'descriptions') {
					if (this.descOn) {
						kbLabels.push(this.tt.turnOffDescriptions);
					}
					else {
						kbLabels.push(this.tt.turnOnDescriptions);
					}
					keys.push('d');
				}
				else if (this.controls[i] === 'prefs') {
					kbLabels.push(this.tt.preferences);
					keys.push('e');
				}
				else if (this.controls[i] === 'help') {
					kbLabels.push(this.tt.help);
					keys.push('h');
				}
			}
			for (i=0; i<keys.length; i++) {
				// alt
				kbListText = '<span class="able-modkey-alt">';
				if (this.prefAltKey === 1) {
					kbListText += this.tt.prefAltKey + ' + ';
				}
				kbListText += '</span>';
				// ctrl
				kbListText += '<span class="able-modkey-ctrl">';
				if (this.prefCtrlKey === 1) {
					kbListText += this.tt.prefCtrlKey + ' + ';
				}
				kbListText += '</span>';
				// shift
				kbListText += '<span class="able-modkey-shift">';
				if (this.prefShiftKey === 1) {
					kbListText += this.tt.prefShiftKey + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey">' + keys[i] + '</span>';
				kbListText += ' = ' + kbLabels[i];
				$kbListItem = $('<li>',{
					html: kbListText
				});
				$kbList.append($kbListItem);
			}
			// add Escape key
			kbListText = '<span class="able-modkey">' + this.tt.escapeKey + '</span>';
			kbListText += ' = ' + this.tt.escapeKeyFunction;
			$kbListItem = $('<li>',{
				html: kbListText
			});
			$kbList.append($kbListItem);
			// put it all together
			$prefsDiv.append($kbHeading,$kbList);
		}

		// $prefsDiv (dialog) must be appended to the BODY!
		// otherwise when aria-hidden="true" is applied to all background content
		// that will include an ancestor of the dialog,
		// which will render the dialog unreadable by screen readers
		$('body').append($prefsDiv);
		dialog = new AccessibleDialog($prefsDiv, this.$prefsButton, 'dialog', formTitle, $prefsIntro, thisObj.tt.closeButtonLabel, '32em');

		// Add save and cancel buttons.
		$prefsDiv.append('<hr>');
		saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
		cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
		saveButton.click(function () {
			dialog.hide();
		  thisObj.savePrefsFromForm();
		});
		cancelButton.click(function () {
			dialog.hide();
			thisObj.resetPrefsForm();
		});

		$prefsDiv.append(saveButton);
		$prefsDiv.append(cancelButton);

		// add global reference for future control
		if (form === 'captions') {
			this.captionPrefsDialog = dialog;
		}
		else if (form === 'descriptions') {
			this.descPrefsDialog = dialog;
		}
		else if (form === 'keyboard') {
			this.keyboardPrefsDialog = dialog;
		}
		else if (form === 'transcript') {
			this.transcriptPrefsDialog = dialog;
		}

		// Add click handler for dialog close button
		// (button is added in dialog.js)
		$('div.able-prefs-form button.modalCloseButton').click(function() {
			thisObj.resetPrefsForm();
		})
		// Add handler for escape key
		$('div.able-prefs-form').keydown(function(e) {
			if (e.which === 27) { // escape
				thisObj.resetPrefsForm();
			}
		});
	};

	 AblePlayer.prototype.resetPrefsForm = function () {

  	 // Reset preferences form with default values from cookie
     // Called when:
     // User clicks cancel or close button in Prefs Dialog
     // User presses Escape to close Prefs dialog
     // User clicks Save in Prefs dialog, & there's more than one player on page

		 var thisObj, cookie, available, i, prefName, prefId, thisDiv, thisId;

		 thisObj = this;
		 cookie = this.getCookie();
		 available = this.getAvailablePreferences();
		 for (i=0; i<available.length; i++) {
			 prefName = available[i]['name'];
			 prefId = this.mediaId + '_' + prefName;
			 if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
				 // this is a caption-related select box
				 $('select[name="' + prefName + '"]').val(cookie.preferences[prefName]);
			 }
			 else { // all others are checkboxes
				 if (this[prefName] === 1) {
					 $('input[name="' + prefName + '"]').prop('checked',true);
					}
					else {
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
		// update cookie with new value
		var cookie, available, prefName, prefId, numChanges,
		  numCapChanges, capSizeChanged, capSizeValue, newValue;

		numChanges = 0;
		numCapChanges = 0; // changes to caption-style-related preferences
		capSizeChanged = false;
		cookie = this.getCookie();
		available = this.getAvailablePreferences();
		for (var i=0; i < available.length; i++) {
			// only prefs with labels are used in the Prefs form
			if (available[i]['label']) {
				prefName = available[i]['name'];
				prefId = this.mediaId + '_' + prefName;
				if (prefName == 'prefDescFormat') {
  				// As of v4.0.10, prefDescFormat is no longer a choice
					// this.prefDescFormat = $('input[name="' + prefName + '"]:checked').val();
					this.prefDescFormat = 'video';
					if (this.prefDescFormat !== cookie.preferences['prefDescFormat']) { // user's preference has changed
						cookie.preferences['prefDescFormat'] = this.prefDescFormat;
						numChanges++;
					}
				}
				else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
					// this is one of the caption-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (cookie.preferences[prefName] !== newValue) { // user changed setting
						cookie.preferences[prefName] = newValue;
						// also update global var for this pref (for caption fields, not done elsewhere)
						this[prefName] = newValue;
						numChanges++;
						numCapChanges++;
					}
					if (prefName === 'prefCaptionsSize') {
						capSizeChanged = true;
						capSizeValue = newValue;
					}
				}
				else { // all other fields are checkboxes
					if ($('input[id="' + prefId + '"]').is(':checked')) {
						cookie.preferences[prefName] = 1;
						if (this[prefName] === 1) {
							// nothing has changed
						}
						else {
							// user has just turned this pref on
							this[prefName] = 1;
							numChanges++;
						}
					}
					else { // thisPref is not checked
						cookie.preferences[prefName] = 0;
						if (this[prefName] === 1) {
							// user has just turned this pref off
							this[prefName] = 0;
							numChanges++;
						}
						else {
							// nothing has chaged
						}
					}
				}
			}
		}
		if (numChanges > 0) {
			this.setCookie(cookie);
			this.showAlert(this.tt.prefSuccess);
		}
		else {
			this.showAlert(this.tt.prefNoChange);
		}
		if (this.player === 'youtube' &&
			(typeof this.usingYouTubeCaptions !== 'undefined' && this.usingYouTubeCaptions) &&
			capSizeChanged) {
				// update font size of YouTube captions
				this.youTubePlayer.setOption(this.ytCaptionModule,'fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
		}
    if (AblePlayerInstances.length > 1) {
      // there are multiple players on this page.
      // update prefs for ALL of them
      for (var i=0; i<AblePlayerInstances.length; i++) {
        AblePlayerInstances[i].updatePrefs();
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
    }
    else {
      // there is only one player
      this.updatePrefs();
      if (numCapChanges > 0) {
        this.stylizeCaptions(this.$captionsDiv);
        // also apply same changes to descriptions, if present
        if (typeof this.$descDiv !== 'undefined') {
          this.stylizeCaptions(this.$descDiv);
			  }
      }
    }
	}

	AblePlayer.prototype.updatePrefs = function () {

  	// Update player based on current prefs. Safe to call multiple times.

		// tabbable transcript
		if (this.prefTabbable === 1) {
			this.$transcriptDiv.find('span.able-transcript-seekpoint').attr('tabindex','0');
		}
		else {
			this.$transcriptDiv.find('span.able-transcript-seekpoint').removeAttr('tabindex');
		}

		// transcript highlights
		if (this.prefHighlight === 0) {
			// user doesn't want highlights; remove any existing highlights
			this.$transcriptDiv.find('span').removeClass('able-highlight');
		}

		// Re-initialize caption and description in case relevant settings have changed
		this.updateCaption();
		this.refreshingDesc = true;
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
	AblePlayer.prototype.parseWebVTT = function(srcFile,text) {

//		var deferred = new $.Deferred();
//		var promise = deferred.promise();

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
				
			}
			else if (console.log) {
				
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
			}
			else {
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
		}
		else {
			returnText = state.text.substring(0, nextEOL);
			updatePosition(state, returnText + '\n');
			state.text = state.text.substring(nextEOL + 1);
		}
		return returnText;
	}

	function peekLine(state) {
		var nextEOL = state.text.indexOf('\n');
		if (nextEOL === -1) {
			return state.text;
		}
		else {
			return state.text.substring(0, nextEOL);
		}
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
		}
		else {
			state.error = "WEBVTT signature not followed by whitespace.";
		}
	}

	// Parses all metadata headers until a cue is discovered.
	function parseMetadataHeaders(state) {
		while (true) {
			var nextLine = peekLine(state);
			if (nextLine.indexOf('-->') !== -1) {
				return;
			}
			else if (nextLine.length === 0) {
				return;
			}
			else {
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
		}
		else {
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
		}
		else {
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
			}
			else if ($.trim(nextLine).length === 0 && state.text.length > 0) {
				act(state, eatEmptyLines);
			}
			else if ($.trim(nextLine).length > 0) {
				act(state, parseCue);
			}
			else {
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
					
				}
				else if (console.log) {
					
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
			if (nextLine.indexOf('-->') !== -1 || /^\s*$/.test(nextLine)) {
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
			}
			else if (token.type === 'startTag') {
				token.type = token.tagName;
				// Define token.parent; added by Terrill to fix bug end 'endTag' loop
				token.parent = current;
				if ($.inArray(token.tagName, ['i', 'b', 'u', 'ruby']) !== -1) {
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
				else if (token.tagName === 'rt' && current.tagName === 'ruby') {
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
				else if (token.tagName === 'c') {
					token.value = token.annotation;
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
				else if (token.tagName === 'v') {
					token.value = token.annotation;
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
				else if (token.tagName === 'lang') {
					languageStack.push(token.annotation);
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
			}
			else if (token.type === 'endTag') {
				if (token.tagName === current.type && $.inArray(token.tagName, ['c', 'i', 'b', 'u', 'ruby', 'rt', 'v']) !== -1) {
					// NOTE from Terrill: This was resulting in an error because current.parent was undefined
					// Fixed (I think) by assigning current token to token.parent in 'startTag' loop
					current = current.parent;
				}
				else if (token.tagName === 'lang' && current.type === 'lang') {
					current = current.parent;
					languageStack.pop();
				}
				else if (token.tagName === 'ruby' && current.type === 'rt') {
					current = current.parent.parent;
				}
			}
			else if (token.type === 'timestampTag') {
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
			}
			else if (state.text.length > 0) {
				c = state.text[0];
			}
			else {
				// End of file.
				c = '\u0004';
			}
			if (tokenState === 'data') {
				if (c === '&') {
					buffer = '&';
					tokenState = 'escape';
				}
				else if (c === '<') {
					if (result.length === 0) {
						tokenState = 'tag';
					}
					else {
						token.type = 'string';
						token.value = result.join('');
						return token;
					}
				}
				else if (c === '\u0004') {
					return {type: 'string', value: result.join('')};
				}
				else {
					result.push(c);
				}
			}
			else if (tokenState === 'escape') {
				if (c === '&') {
					result.push(buffer);
					buffer = '&';
				}
				else if (c.match(/[0-9a-z]/)) {
					buffer += c;
				}
				else if (c === ';') {
					if (buffer === '&amp') {
						result.push('&');
					}
					else if (buffer === '&lt') {
						result.push('<');
					}
					else if (buffer === '&gt') {
						result.push('>');
					}
					else if (buffer === '&lrm') {
						result.push('\u200e');
					}
					else if (buffer === '&rlm') {
						result.push('\u200f');
					}
					else if (buffer === '&nbsp') {
						result.push('\u00a0');
					}
					else {
						result.push(buffer);
						result.push(';');
					}
					tokenState = 'data';
				}
				else if (c === '<' || c === '\u0004') {
					result.push(buffer);
					token.type = 'string';
					token.value = result.join('');
					return token;
				}
				else if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') { // Handle unescaped & chars as strings
					result.push(buffer);
					token.type = 'string';
					token.value = result.join('');
					return token;
				}
				else {
					result.push(buffer);
					tokenState = 'data';
				}
			}
			else if (tokenState === 'tag') {
				if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') {
					tokenState = 'startTagAnnotation';
				}
				else if (c === '.') {
					tokenState = 'startTagClass';
				}
				else if (c === '/') {
					tokenState = 'endTag';
				}
				else if (c.match('[0-9]')) {
					tokenState = 'timestampTag';
					result.push(c);
				}
				else if (c === '>') {
					cut(state, 1);
					break;
				}
				else if (c === '\u0004') {
					token.tagName = '';
					token.type = 'startTag';
					return token;
				}
				else {
					result.push(c);
					tokenState = 'startTag';
				}
			}
			else if (tokenState === 'startTag') {
				if (c === '\t' || c === '\u000c' || c === ' ') {
					tokenState = 'startTagAnnotation';
				}
				else if (c === '\n') {
					buffer = c;
					tokenState = 'startTagAnnotation';
				}
				else if (c === '.') {
					tokenState = 'startTagClass';
				}
				else if (c === '>') {
					cut(state, 1);
					token.tagName = result.join('');
					token.type = 'startTag';
					return token;
				}
				else if (c === '\u0004') {
					token.tagName = result.join('');
					token.type = 'startTag';
					return token;
				}
				else {
					result.push(c);
				}
			}
			else if (tokenState === 'startTagClass') {
				if (c === '\t' || c === '\u000c' || c === ' ') {
					token.classes.push(buffer);
					buffer = '';
					tokenState = 'startTagAnnotation';
				}
				else if (c === '\n') {
					token.classes.push(buffer);
					buffer = c;
					tokenState = 'startTagAnnotation';
				}
				else if (c === '.') {
					token.classes.push(buffer);
					buffer = "";
				}
				else if (c === '>') {
					cut(state, 1);
					token.classes.push(buffer);
					token.type = 'startTag';
					token.tagName = result.join('');
					return token;
				}
				else if (c === '\u0004') {
					token.classes.push(buffer);
					token.type = 'startTag';
					token.tagName = result.join('');
					return token;
				}
				else {
					buffer += 'c';
				}
			}
			else if (tokenState === 'startTagAnnotation') {
				if (c === '>') {
					cut(state, 1);
					buffer = $.trim(buffer).replace(/ +/, ' ');
					token.type = 'startTag';
					token.tagName = result.join('');
					token.annotation = buffer;
					return token;
				}
				else if (c === '\u0004') {
					buffer = $.trim(buffer).replace(/ +/, ' ');
					token.type = 'startTag';
					token.tagName = result.join('');
					token.annotation = buffer;
					return token;
				}
				else {
					buffer += c;
				}
			}
			else if (tokenState === 'endTag') {
				if (c === '>') {
					cut(state, 1);
					token.type = 'endTag';
					token.tagName = result.join('');
					return token;
				}
				else if (c === '\u0004') {
					token.type = 'endTag';
					token.tagName = result.join('');
					return token;
				}
				else {
					result.push(c);
				}
			}
			else if (tokenState === 'timestampTag') {
				if (c === '>') {
					cut(state, 1);
					token.type = 'timestampTag';
					token.name = result.join('');
					return token;
				}
				else if (c === '\u0004') {
					token.type = 'timestampTag';
					token.name = result.join('');
					return token;
				}
				else {
					result.push(c);
				}
			}
			else {
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
			if ($.trim(nextLine).length === 0) {
				// End of comment.
				return;
			}
			else if (nextLine.indexOf('-->') !== -1) {
				state.error = 'Invalid syntax: --> in comment.';
				return;
			}
			else {
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
		}
		else {
			state.error = 'Invalid signature.';
		}
	}

	function eatArrow(state) {
		if (state.text.length < 3 || state.text.substring(0,3) !== '-->') {
			state.error = 'Missing -->';
		}
		else {
			cut(state, 3);
		}
	}

	function eatSingleSpaceOrTab(state) {
		if (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
		}
		else {
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
		}
		else {
			cut(state, nextEOL + 1);
		}
	}

	function eatEmptyLines(state) {
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if ($.trim(nextLine).length === 0) {
				cutLine(state);
			}
			else {
				break;
			}
		}
	}

	// Eats empty lines, but throws an error if there's not at least one.
	function eatAtLeast1EmptyLines(state) {
		var linesEaten = 0;
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if ($.trim(nextLine).length === 0) {
				cutLine(state);
				linesEaten += 1;
			}
			else {
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

		var results = /((\d\d):)?((\d\d):)(\d\d).(\d\d\d)|(\d+).(\d\d\d)/.exec(timestamp);

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
		}
		else {
			time += parseInt(results[7], 10);
			time += parseInt(results[8], 10) / 1000;
		}

		return time;
	}
})(jQuery);

(function ($) {

	AblePlayer.prototype.injectPlayerCode = function() {

		// create and inject surrounding HTML structure
		// If IOS:
		//	If video:
		//	 IOS does not support any of the player's functionality
		//	 - everything plays in its own player
		//	 Therefore, AblePlayer is not loaded & all functionality is disabled
		//	 (this all determined. If this is IOS && video, this function is never called)
		//	If audio:
		//	 HTML cannot be injected as a *parent* of the <audio> element
		//	 It is therefore injected *after* the <audio> element
		//	 This is only a problem in IOS 6 and earlier,
		//	 & is a known bug, fixed in IOS 7

		var thisObj, vidcapContainer, prefsGroups, i;
		thisObj = this;

		// create three wrappers and wrap them around the media element. From inner to outer:
		// $mediaContainer - contains the original media element
		// $ableDiv - contains the media player and all its objects (e.g., captions, controls, descriptions)
		// $ableWrapper - contains additional widgets (e.g., transcript window, sign window)
		this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();
		this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
		this.$ableWrapper = this.$ableDiv.wrap('<div class="able-wrapper"></div>').parent();
    this.$ableWrapper.addClass('able-skin-' + this.skin);

		// NOTE: Excluding the following from youtube was resulting in a player
		// that exceeds the width of the YouTube video
		// Unclear why it was originally excluded; commented out in 3.1.20
		// if (this.player !== 'youtube') {
		this.$ableWrapper.css({
			'max-width': this.playerMaxWidth + 'px'
		});

		this.injectOffscreenHeading();

		if (this.mediaType === 'video') {
			// youtube adds its own big play button
			// don't show ours *unless* video has a poster attribute
			// (which obstructs the YouTube poster & big play button)
			if (this.iconType != 'image' && (this.player !== 'youtube' || this.hasPoster)) {
				this.injectBigPlayButton();
			}

			// add container that captions or description will be appended to
			// Note: new Jquery object must be assigned _after_ wrap, hence the temp vidcapContainer variable
			vidcapContainer = $('<div>',{
				'class' : 'able-vidcap-container'
			});
			this.$vidcapContainer = this.$mediaContainer.wrap(vidcapContainer).parent();
		}
		this.injectPlayerControlArea();
		this.injectTextDescriptionArea();
		this.injectAlert();
		this.injectPlaylist();
	};

	AblePlayer.prototype.injectOffscreenHeading = function () {
		// Inject an offscreen heading to the media container.
		// If heading hasn't already been manually defined via data-heading-level,
		// automatically assign a level that is one level deeper than the closest parent heading
		// as determined by getNextHeadingLevel()
		var headingType;
		if (this.playerHeadingLevel == '0') {
			// do NOT inject a heading (at author's request)
		}
		else {
			if (typeof this.playerHeadingLevel === 'undefined') {
				this.playerHeadingLevel = this.getNextHeadingLevel(this.$ableDiv); // returns in integer 1-6
			}
			headingType = 'h' + this.playerHeadingLevel.toString();
			this.$headingDiv = $('<' + headingType + '>');
			this.$ableDiv.prepend(this.$headingDiv);
			this.$headingDiv.addClass('able-offscreen');
			this.$headingDiv.text(this.tt.playerHeading);
		}
	};

	AblePlayer.prototype.injectBigPlayButton = function () {

		this.$bigPlayButton = $('<button>', {
			'class': 'able-big-play-button icon-play',
			'aria-hidden': true,
			'tabindex': -1
		});

		var thisObj = this;
		this.$bigPlayButton.click(function () {
			thisObj.handlePlay();
		});

		this.$mediaContainer.append(this.$bigPlayButton);
	};

	AblePlayer.prototype.injectPlayerControlArea = function () {

		this.$playerDiv = $('<div>', {
			'class' : 'able-player',
			'role' : 'region',
			'aria-label' : this.mediaType + ' player'
		});
		this.$playerDiv.addClass('able-'+this.mediaType);

		// The default skin depends a bit on a Now Playing div
		// so go ahead and add one
		// However, it's only populated if this.showNowPlaying = true
		this.$nowPlayingDiv = $('<div>',{
			'class' : 'able-now-playing',
			'aria-live' : 'assertive',
			'aria-atomic': 'true'
		});

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
			'aria-live' : 'assertive'
		}).text(this.tt.speed + ': 1x');

		this.$status = $('<span>',{
			'class' : 'able-status',
			'aria-live' : 'polite'
		});

		// Put everything together.
		this.$statusBarDiv.append(this.$timer, this.$speed, this.$status);
		this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
		this.$ableDiv.append(this.$playerDiv);
	};

	AblePlayer.prototype.injectTextDescriptionArea = function () {

		// create a div for exposing description
		// description will be exposed via role="alert" & announced by screen readers
		this.$descDiv = $('<div>',{
			'class': 'able-descriptions'
		});
		if (this.exposeTextDescriptions) {
  		this.$descDiv.attr({
  			'aria-live': 'assertive',
        'aria-atomic': 'true'
		  });
		}
		// Start off with description hidden.
		// It will be exposed conditionally within description.js > initDescription()
		this.$descDiv.hide();
		this.$ableDiv.append(this.$descDiv);
	};

	AblePlayer.prototype.getDefaultWidth = function(which) {

		// return default width of resizable elements
		// these values are somewhat arbitrary, but seem to result in good usability
		// if users disagree, they can resize (and resposition) them
		if (which === 'transcript') {
			return 450;
		}
		else if (which === 'sign') {
			return 400;
		}
	};

	AblePlayer.prototype.positionDraggableWindow = function (which, width) {

		// which is either 'transcript' or 'sign'

		var cookie, cookiePos, $window, dragged, windowPos, currentWindowPos, firstTime, zIndex;

		cookie = this.getCookie();
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			if (typeof cookie.transcript !== 'undefined') {
				cookiePos = cookie.transcript;
			}
		}
		else if (which === 'sign') {
			$window = this.$signWindow;
			if (typeof cookie.transcript !== 'undefined') {
				cookiePos = cookie.sign;
			}
		}
		if (typeof cookiePos !== 'undefined' && !($.isEmptyObject(cookiePos))) {
			// position window using stored values from cookie
			$window.css({
				'position': cookiePos['position'],
				'width': cookiePos['width'],
				'z-index': cookiePos['zindex']
			});
			if (cookiePos['position'] === 'absolute') {
				$window.css({
					'top': cookiePos['top'],
					'left': cookiePos['left']
				});
			}
			// since cookie is not page-specific, z-index needs may vary across different pages
			this.updateZIndex(which);
		}
		else {
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

		var gap, position, ableWidth, ableHeight, ableOffset, ableTop, ableLeft,
			 windowWidth, otherWindowWidth, zIndex;

		if (typeof targetWidth === 'undefined') {
			targetWidth = this.getDefaultWidth(targetWindow);
		}

		gap = 5; // number of pixels to preserve between Able Player objects

		position = []; // position, top, left

		ableWidth = this.$ableDiv.width();
		ableHeight = this.$ableDiv.height();
		ableOffset = this.$ableDiv.offset();
		ableTop = ableOffset.top;
		ableLeft = ableOffset.left;
		windowWidth = $(window).width();
		otherWindowWidth = 0; // width of other visiable draggable windows will be added to this

		if (targetWindow === 'transcript') {
			if (typeof this.$signWindow !== 'undefined') {
				if (this.$signWindow.is(':visible')) {
					otherWindowWidth = this.$signWindow.width() + gap;
				}
			}
		}
		else if (targetWindow === 'sign') {
			if (typeof this.$transcriptArea !== 'undefined') {
				if (this.$transcriptArea.is(':visible')) {
					otherWindowWidth = this.$transcriptArea.width() + gap;
				}
			}
		}
		if (targetWidth < (windowWidth - (ableLeft + ableWidth + gap + otherWindowWidth))) {
			// there's room to the left of $ableDiv
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableWidth + otherWindowWidth + gap;
		}
		else if (targetWidth + gap < ableLeft) {
			// there's room to the right of $ableDiv
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableLeft - targetWidth - gap;
		}
		else {
			// position element below $ableDiv
			position[0] = 'relative';
			// no need to define top, left, or z-index
		}
		return position;
	};

	AblePlayer.prototype.injectPoster = function ($element, context) {

		// get poster attribute from media element and append that as an img to $element
		// context is either 'youtube' or 'fallback'
		var poster, width, height;

		if (context === 'youtube') {
			if (typeof this.ytWidth !== 'undefined') {
				width = this.ytWidth;
				height = this.ytHeight;
			}
			else if (typeof this.playerMaxWidth !== 'undefined') {
				width = this.playerMaxWidth;
				height = this.playerMaxHeight;
			}
			else if (typeof this.playerWidth !== 'undefined') {
				width = this.playerWidth;
				height = this.playerHeight;
			}
		}
		else if (context === 'fallback') {
			width = '100%';
			height = 'auto';
		}

		if (this.hasPoster) {
			poster = this.$media.attr('poster');
			this.$posterImg = $('<img>',{
				'class': 'able-poster',
				'src' : poster,
				'alt' : "",
				'role': "presentation",
				'width': width,
				'height': height
			});
			$element.append(this.$posterImg);
		}
	};

	AblePlayer.prototype.injectAlert = function () {

		// inject two alerts, one visible for all users and one for screen reader users only

		var top;

		this.$alertBox = $('<div role="alert"></div>');
		this.$alertBox.addClass('able-alert');
		this.$alertBox.hide();
		this.$alertBox.appendTo(this.$ableDiv);
		if (this.mediaType == 'audio') {
			top = '-10';
		}
		else {
			// position just below the vertical center of the mediaContainer
			// hopefully above captions, but not too far from the controller bar
			top = Math.round(this.$mediaContainer.height() / 3) * 2;
		}
		this.$alertBox.css({
			top: top + 'px'
		});

		this.$srAlertBox = $('<div role="alert"></div>');
		this.$srAlertBox.addClass('able-screenreader-alert');
		this.$srAlertBox.appendTo(this.$ableDiv);
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

		var thisObj, $menu, prefCats, i, $menuItem, prefCat, whichPref,
			hasDefault, track, windowOptions, whichPref, whichMenu,
			$thisItem, $prevItem, $nextItem;

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
	  			$menuItem = $('<li></li>',{
		  			'role': 'menuitem',
            'tabindex': '-1'
				  });
          prefCat = this.prefCats[i];
          if (prefCat === 'captions') {
					  $menuItem.text(this.tt.prefMenuCaptions);
				  }
          else if (prefCat === 'descriptions') {
					  $menuItem.text(this.tt.prefMenuDescriptions);
				  }
          else if (prefCat === 'keyboard') {
					  $menuItem.text(this.tt.prefMenuKeyboard);
				  }
          else if (prefCat === 'transcript') {
					  $menuItem.text(this.tt.prefMenuTranscript);
				  }
          $menuItem.on('click',function() {
					  whichPref = $(this).text();
					  thisObj.showingPrefsDialog = true;
            thisObj.setFullscreen(false);
            if (whichPref === thisObj.tt.prefMenuCaptions) {
						  thisObj.captionPrefsDialog.show();
					  }
            else if (whichPref === thisObj.tt.prefMenuDescriptions) {
						  thisObj.descPrefsDialog.show();
					  }
            else if (whichPref === thisObj.tt.prefMenuKeyboard) {
						  thisObj.keyboardPrefsDialog.show();
					  }
            else if (whichPref === thisObj.tt.prefMenuTranscript) {
						  thisObj.transcriptPrefsDialog.show();
					  }
            thisObj.closePopups();
            thisObj.showingPrefsDialog = false;
				  });
          $menu.append($menuItem);
			  }
			  this.$prefsButton.attr('data-prefs-popup','menu');
      }
      else if (this.prefCats.length == 1) {
        // only 1 category, so don't create a popup menu.
        // Instead, open dialog directly when user clicks Prefs button
        this.$prefsButton.attr('data-prefs-popup',this.prefCats[0]);
      }
		}
		else if (which === 'captions' || which === 'chapters') {
			hasDefault = false;
			for (i = 0; i < tracks.length; i++) {
				track = tracks[i];
				$menuItem = $('<li></li>',{
					'role': 'menuitemradio',
					'tabindex': '-1',
					'lang': track.language
				});
				if (track.def && this.prefCaptions == 1) {
					$menuItem.attr('aria-checked','true');
					hasDefault = true;
				}
				else {
					$menuItem.attr('aria-checked','false');
				}
				// Get a label using track data
				if (which == 'captions') {
					$menuItem.text(track.label);
					$menuItem.on('click',this.getCaptionClickFunction(track));
				}
				else if (which == 'chapters') {
					$menuItem.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
					$menuItem.on('click',this.getChapterClickFunction(track.start));
				}
				$menu.append($menuItem);
			}
			if (which === 'captions') {
				// add a 'captions off' menu item
				$menuItem = $('<li></li>',{
					'role': 'menuitemradio',
					'tabindex': '-1',
				}).text(this.tt.captionsOff);
				if (this.prefCaptions === 0) {
					$menuItem.attr('aria-checked','true');
					hasDefault = true;
				}
				$menuItem.on('click',this.getCaptionOffFunction());
				$menu.append($menuItem);
			}
		}
		else if (which === 'transcript-window' || which === 'sign-window') {
			windowOptions = [];
			windowOptions.push({
				'name': 'move',
				'label': this.tt.windowMove
			});
			windowOptions.push({
				'name': 'resize',
				'label': this.tt.windowResize
			});
			windowOptions.push({
				'name': 'close',
				'label': this.tt.windowClose
			});
			for (i = 0; i < windowOptions.length; i++) {
				$menuItem = $('<li></li>',{
					'role': 'menuitem',
					'tabindex': '-1',
					'data-choice': windowOptions[i].name
				});
				$menuItem.text(windowOptions[i].label);
				$menuItem.on('click mousedown',function(e) {
					e.stopPropagation();
					if (typeof e.button !== 'undefined' && e.button !== 0) {
  					// this was a mouse click (if click is triggered by keyboard, e.button is undefined)
  					// and the button was not a left click (left click = 0)
  					// therefore, ignore this click
						return false;
					}
					if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
						thisObj.windowMenuClickRegistered = true;
						thisObj.handleMenuChoice(which.substr(0, which.indexOf('-')), $(this).attr('data-choice'), e);
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
			}
			else {
				// check the last item (captions off)
				$menu.find('li').last().attr('aria-checked','true');
			}
		}
		else if (which === 'chapters') {
			if ($menu.find('li:contains("' + this.defaultChapter + '")')) {
				$menu.find('li:contains("' + this.defaultChapter + '")').attr('aria-checked','true').addClass('able-focus');
			}
			else {
				$menu.find('li').first().attr('aria-checked','true').addClass('able-focus');
			}
		}
		// add keyboard handlers for navigating within popups
		$menu.on('keydown',function (e) {

			whichMenu = $(this).attr('id').split('-')[1];
			$thisItem = $(this).find('li:focus');
			if ($thisItem.is(':first-child')) {
				// this is the first item in the menu
				$prevItem = $(this).find('li').last(); // wrap to bottom
				$nextItem = $thisItem.next();
			}
			else if ($thisItem.is(':last-child')) {
				// this is the last Item
				$prevItem = $thisItem.prev();
				$nextItem = $(this).find('li').first(); // wrap to top
			}
			else {
				$prevItem = $thisItem.prev();
				$nextItem = $thisItem.next();
			}
			if (e.which === 9) { // Tab
				if (e.shiftKey) {
					$thisItem.removeClass('able-focus');
					$prevItem.focus().addClass('able-focus');
				}
				else {
					$thisItem.removeClass('able-focus');
					$nextItem.focus().addClass('able-focus');
				}
			}
			else if (e.which === 40 || e.which === 39) { // down or right arrow
				$thisItem.removeClass('able-focus');
				$nextItem.focus().addClass('able-focus');
			}
			else if (e.which == 38 || e.which === 37) { // up or left arrow
				$thisItem.removeClass('able-focus');
				$prevItem.focus().addClass('able-focus');
			}
			else if (e.which === 32 || e.which === 13) { // space or enter
				$thisItem.click();
			}
			else if (e.which === 27) {	// Escape
				$thisItem.removeClass('able-focus');
				thisObj.closePopups();
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
			this.$chaptersButton.removeAttr('aria-expanded').focus();
		}
		if (this.captionsPopup && this.captionsPopup.is(':visible')) {
			this.captionsPopup.hide();
			this.$ccButton.removeAttr('aria-expanded').focus();
		}
		if (this.prefsPopup && this.prefsPopup.is(':visible') && !this.hidingPopup) {
      this.hidingPopup = true; // stopgap to prevent popup from re-opening again on keypress
			this.prefsPopup.hide();
			// restore menu items to their original state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$prefsButton.removeAttr('aria-expanded');
			if (!this.showingPrefsDialog) {
  			this.$prefsButton.focus();
			}
			// wait briefly, then reset hidingPopup
			setTimeout(function() {
  			thisObj.hidingPopup = false;
  		},100);
		}
		if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
			this.$volumeSlider.hide().attr('aria-hidden','true');
			this.$volumeAlert.text(this.tt.volumeSliderClosed);
			this.$volumeButton.removeAttr('aria-expanded').focus();
		}
		if (this.$transcriptPopup && this.$transcriptPopup.is(':visible')) {
			this.$transcriptPopup.hide();
			// restore menu items to their original state
			this.$transcriptPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$transcriptPopupButton.removeAttr('aria-expanded').focus();
		}
		if (this.$signPopup && this.$signPopup.is(':visible')) {
			this.$signPopup.hide();
			// restore menu items to their original state
			this.$signPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$signPopupButton.removeAttr('aria-expanded').focus();
		}
	};

	AblePlayer.prototype.setupPopups = function (which) {

		// Create and fill in the popup menu forms for various controls.
		// parameter 'which' is passed if refreshing content of an existing popup ('captions' or 'chapters')
		// If which is undefined, automatically setup 'captions', 'chapters', and 'prefs' popups
		// However, only setup 'transcript-window' and 'sign-window' popups if passed as value of which
		var popups, thisObj, hasDefault, i, j,
				tracks, track, $trackButton, $trackLabel,
				radioName, radioId, $menu, $menuItem,
				prefCats, prefCat, prefLabel;

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
				hasDefault = false;
				if (popup == 'prefs') {
					this.prefsPopup = this.createPopup('prefs');
				}
				else if (popup == 'captions') {
					if (typeof this.captionsPopup === 'undefined' || !this.captionsPopup) {
						this.captionsPopup = this.createPopup('captions',this.captions);
					}
				}
				else if (popup == 'chapters') {
					if (this.selectedChapters) {
						tracks = this.selectedChapters.cues;
					}
					else if (this.chapters.length >= 1) {
						tracks = this.chapters[0].cues;
					}
					else {
						tracks = [];
					}
					if (typeof this.chaptersPopup === 'undefined' || !this.chaptersPopup) {
						this.chaptersPopup = this.createPopup('chapters',tracks);
					}
				}
				else if (popup == 'transcript-window') {
					return this.createPopup('transcript-window');
				}
				else if (popup == 'sign-window') {
					return this.createPopup('sign-window');
				}
			}
		}
	};

	AblePlayer.prototype.provideFallback = function() {

		// provide ultimate fallback for users who are unable to play the media
		// If there is HTML content nested within the media element, display that
		// Otherwise, display standard localized error text

		var $fallbackDiv, width, mediaClone, fallback, fallbackText,
		showBrowserList, browsers, i, b, browserList;

		// Could show list of supporting browsers if 99.9% confident the error is truly an outdated browser
		// Too many sites say "You need to update your browser" when in fact I'm using a current version
		showBrowserList = false;

		$fallbackDiv = $('<div>',{
			'class' : 'able-fallback',
			'role' : 'alert',
		});
		// override default width of .able-fallback with player width, if known
		if (typeof this.playerMaxWidth !== 'undefined') {
			width = this.playerMaxWidth + 'px';
		}
		else if (this.$media.attr('width')) {
			width = parseInt(this.$media.attr('width'), 10) + 'px';
		}
		else {
			width = '100%';
		}
		$fallbackDiv.css('max-width',width);

		// use fallback content that's nested inside the HTML5 media element, if there is any
		mediaClone = this.$media.clone();
		$('source, track', mediaClone).remove();
		fallback = mediaClone.html().trim();
		if (fallback.length) {
			$fallbackDiv.html(fallback);
		}
		else {
			// use standard localized error message
			fallbackText =	this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
			fallbackText += this.tt.fallbackError2 + ':';
			fallback = $('<p>').text(fallbackText);
			$fallbackDiv.html(fallback);
			showBrowserList = true;
		}

		if (showBrowserList) {
			browserList = $('<ul>');
			browsers = this.getSupportingBrowsers();
			for (i=0; i<browsers.length; i++) {
				b = $('<li>');
				b.text(browsers[i].name + ' ' + browsers[i].minVersion + ' ' + this.tt.orHigher);
				browserList.append(b);
			}
			$fallbackDiv.append(browserList);
		}

		// if there's a poster, show that as well
		this.injectPoster($fallbackDiv, 'fallback');

		// inject $fallbackDiv into the DOM and remove broken content
		if (typeof this.$ableWrapper !== 'undefined') {
			this.$ableWrapper.before($fallbackDiv);
			this.$ableWrapper.remove();
		}
		else if (typeof this.$media !== 'undefined') {
			this.$media.before($fallbackDiv);
			this.$media.remove();
		}
		else {
			$('body').prepend($fallbackDiv);
		}
	};

	AblePlayer.prototype.getSupportingBrowsers = function() {

		var browsers = [];
		browsers[0] = {
			name:'Chrome',
			minVersion: '31'
		};
		browsers[1] = {
			name:'Firefox',
			minVersion: '34'
		};
		browsers[2] = {
			name:'Internet Explorer',
			minVersion: '10'
		};
		browsers[3] = {
			name:'Opera',
			minVersion: '26'
		};
		browsers[4] = {
			name:'Safari for Mac OS X',
			minVersion: '7.1'
		};
		browsers[5] = {
			name:'Safari for iOS',
			minVersion: '7.1'
		};
		browsers[6] = {
			name:'Android Browser',
			minVersion: '4.1'
		};
		browsers[7] = {
			name:'Chrome for Android',
			minVersion: '40'
		};
		return browsers;
	}

	AblePlayer.prototype.calculateControlLayout = function () {

		// Calculates the layout for controls based on media and options.
		// Returns an array with 4 keys (for legacy skin) or 2 keys (for 2020 skin)
		// Keys are the following order:
		// 0 = Top left
		// 1 = Top right
		// 2 = Bottom left (legacy skin only)
		// 3 = Bottom right (legacy skin only)
		// Each key contains an array of control names to put in that section.

		var controlLayout, volumeSupported, playbackSupported, totalButtonWidth, numA11yButtons;

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
      }
      else if (this.skin == '2020') {
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
		}
		else {
  		playbackSupported = false;
		}

		if (this.mediaType === 'video') {
  		numA11yButtons = 0;
			if (this.hasCaptions) {
  			numA11yButtons++;
  			if (this.skin === 'legacy') {
				  controlLayout[2].push('captions');
				}
				else if (this.skin == '2020') {
  				controlLayout[1].push('captions');
        }
			}
			if (this.hasSignLanguage) {
  			numA11yButtons++;
  			if (this.skin === 'legacy') {
				  controlLayout[2].push('sign');
				}
				else if (this.skin == '2020') {
  				controlLayout[1].push('sign');
        }
			}
			if ((this.hasOpenDesc || this.hasClosedDesc) && (this.useDescriptionsButton)) {
  			numA11yButtons++;
  			if (this.skin === 'legacy') {
				  controlLayout[2].push('descriptions');
				}
				else if (this.skin == '2020') {
  				controlLayout[1].push('descriptions');
        }
			}
		}
		if (this.transcriptType === 'popup' && !(this.hideTranscriptButton)) {
  		numA11yButtons++;
  		if (this.skin === 'legacy') {
				controlLayout[2].push('transcript');
		  }
      else if (this.skin == '2020') {
  		  controlLayout[1].push('transcript');
      }
		}

		if (this.mediaType === 'video' && this.hasChapters && this.useChaptersButton) {
  		numA11yButtons++;
  		if (this.skin === 'legacy') {
				controlLayout[2].push('chapters');
		  }
			else if (this.skin == '2020') {
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
    }
    else if (this.skin == '2020') {
      controlLayout[1].push('preferences');
    }

		if (this.mediaType === 'video' && this.allowFullScreen) {
      if (this.skin === 'legacy') {
    		controlLayout[3].push('fullscreen');
      }
      else {
        controlLayout[1].push('fullscreen');
      }
		}

		if (this.browserSupportsVolume()) {
  		volumeSupported = true; // defined in case we decide to move volume button elsewhere
			this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
			if (this.skin === 'legacy') {
  			controlLayout[1].push('volume');
  		}
  		else if (this.skin == '2020') {
    		controlLayout[1].push('volume');
  		}
		}
		else {
  		volumeSupported = false;
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
		i, j, k, controls, $controllerSpan, $sliderDiv, sliderLabel, $pipe, $pipeImg,
		svgData, svgPath, control,
    $buttonLabel, $buttonImg, buttonImgSrc, buttonTitle, $newButton, iconClass, buttonIcon,
    buttonUse, buttonText, position, buttonHeight, buttonWidth, buttonSide, controllerWidth,
    tooltipId, tooltipY, tooltipX, tooltipWidth, tooltipStyle, tooltip,
    captionLabel, popupMenuId;

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
			sliderLabel = this.mediaType + ' ' + this.tt.seekbarLabel;
			this.$controllerDiv.append($sliderDiv);
			this.seekBar = new AccessibleSlider(this.mediaType, $sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
		}

		// step separately through left and right controls
		for (i = 0; i < numSections; i++) {
			controls = controlLayout[i];
			if ((i % 2) === 0) { // even keys on the left
				$controllerSpan = $('<div>',{
					'class': 'able-left-controls'
				});
			}
			else { // odd keys on the right
				$controllerSpan = $('<div>',{
					'class': 'able-right-controls'
				});
			}
			this.$controllerDiv.append($controllerSpan);
			for (j=0; j<controls.length; j++) {
				control = controls[j];
				if (control === 'seek') {
					$sliderDiv = $('<div class="able-seekbar"></div>');
					sliderLabel = this.mediaType + ' ' + this.tt.seekbarLabel;
					$controllerSpan.append($sliderDiv);
					if (typeof this.duration === 'undefined' || this.duration === 0) {
						// set arbitrary starting duration, and change it when duration is known
						this.duration = 60;
						// also set elapsed to 0
						this.elapsed = 0;
					}
					this.seekBar = new AccessibleSlider(this.mediaType, $sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
				}
				else if (control === 'pipe') {
					$pipe = $('<span>', {
						'tabindex': '-1',
						'aria-hidden': 'true'
					});
					if (this.iconType === 'font') {
						$pipe.addClass('icon-pipe');
					}
					else {
						$pipeImg = $('<img>', {
							src: this.rootPath + 'button-icons/' + this.iconColor + '/pipe.png',
							alt: '',
							role: 'presentation'
						});
						$pipe.append($pipeImg);
					}
					$controllerSpan.append($pipe);
				}
				else {
					// this control is a button
					if (control === 'volume') {
						buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/' + this.volumeButton + '.png';
					}
					else if (control === 'fullscreen') {
						buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/fullscreen-expand.png';
					}
					else if (control === 'slower') {
						if (this.speedIcons === 'animals') {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/turtle.png';
						}
						else {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/slower.png';
						}
					}
					else if (control === 'faster') {
						if (this.speedIcons === 'animals') {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/rabbit.png';
						}
						else {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/faster.png';
						}
					}
					else {
						buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/' + control + '.png';
					}
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
						'aria-label': buttonTitle,
						'class': 'able-button-handler-' + control
					});

					if (control === 'volume' || control === 'preferences') {
						if (control == 'preferences') {
  						this.prefCats = this.getPreferencesGroups();
              if (this.prefCats.length > 1) {
  						  // Prefs button will trigger a menu
                popupMenuId = this.mediaId + '-prefs-menu';
                $newButton.attr({
							    'aria-controls': popupMenuId,
                  'aria-haspopup': 'menu'
                });
						  }
              else if (this.prefCats.length === 1) {
  						  // Prefs button will trigger a dialog
                $newButton.attr({
    						  'aria-haspopup': 'dialog'
                });
						  }
						}
						else if (control === 'volume') {
							popupMenuId = this.mediaId + '-volume-slider';
							// volume slider popup is not a menu or a dialog
							// therefore, using aria-expanded rather than aria-haspopup to communicate properties/state
              $newButton.attr({
                'aria-controls': popupMenuId,
    						'aria-expanded': 'false'
              });
						}
					}
					if (this.iconType === 'font') {
						if (control === 'volume') {
							iconClass = 'icon-' + this.volumeButton;
						}
						else if (control === 'slower') {
							if (this.speedIcons === 'animals') {
								iconClass = 'icon-turtle';
							}
							else {
								iconClass = 'icon-slower';
							}
						}
						else if (control === 'faster') {
							if (this.speedIcons === 'animals') {
								iconClass = 'icon-rabbit';
							}
							else {
								iconClass = 'icon-faster';
							}
						}
						else {
							iconClass = 'icon-' + control;
						}
						buttonIcon = $('<span>',{
							'class': iconClass,
							'aria-hidden': 'true'
						});
						$newButton.append(buttonIcon);
					}
					else if (this.iconType === 'svg') {

					/*
						// Unused option for adding SVG:
						// Use <use> element to link to button-icons/able-icons.svg
						// Advantage: SVG file can be cached
						// Disadvantage: Not supported by Safari 6, IE 6-11, or Edge 12
						// Instead, adding <svg> element within each <button>
						if (control === 'volume') {
							iconClass = 'svg-' + this.volumeButton;
						}
						else if (control === 'fullscreen') {
							iconClass = 'svg-fullscreen-expand';
						}
						else if (control === 'slower') {
							if (this.speedIcons === 'animals') {
								iconClass = 'svg-turtle';
							}
							else {
								iconClass = 'svg-slower';
							}
						}
						else if (control === 'faster') {
							if (this.speedIcons === 'animals') {
								iconClass = 'svg-rabbit';
							}
							else {
								iconClass = 'svg-faster';
							}
						}
						else {
							iconClass = 'svg-' + control;
						}
						buttonIcon = $('<svg>',{
							'class': iconClass
						});
						buttonUse = $('<use>',{
							'xlink:href': this.rootPath + 'button-icons/able-icons.svg#' + iconClass
						});
						buttonIcon.append(buttonUse);
						*/
						var svgData;
						if (control === 'volume') {
							svgData = this.getSvgData(this.volumeButton);
						}
						else if (control === 'fullscreen') {
							svgData = this.getSvgData('fullscreen-expand');
						}
						else if (control === 'slower') {
							if (this.speedIcons === 'animals') {
								svgData = this.getSvgData('turtle');
							}
							else {
								svgData = this.getSvgData('slower');
							}
						}
						else if (control === 'faster') {
							if (this.speedIcons === 'animals') {
								svgData = this.getSvgData('rabbit');
							}
							else {
								svgData = this.getSvgData('faster');
							}
						}
						else {
							svgData = this.getSvgData(control);
						}
						buttonIcon = $('<svg>',{
							'focusable': 'false',
							'aria-hidden': 'true',
							'viewBox': svgData[0]
						});
						svgPath = $('<path>',{
							'd': svgData[1]
						});
						buttonIcon.append(svgPath);
						$newButton.html(buttonIcon);

						// Final step: Need to refresh the DOM in order for browser to process & display the SVG
						$newButton.html($newButton.html());
					}
					else {
						// use images
						$buttonImg = $('<img>',{
							'src': buttonImgSrc,
							'alt': '',
							'role': 'presentation'
						});
						$newButton.append($buttonImg);
					}
					// add the visibly-hidden label for screen readers that don't support aria-label on the button
					var $buttonLabel = $('<span>',{
						'class': 'able-clipped'
					}).text(buttonTitle);
					$newButton.append($buttonLabel);
					// add an event listener that displays a tooltip on mouseenter or focus
					$newButton.on('mouseenter focus',function(e) {
						var buttonText = $(this).attr('aria-label');
						// get position of this button
						var position = $(this).position();
						var buttonHeight = $(this).height();
						var buttonWidth = $(this).width();
						// position() is expressed using top and left (of button);
						// add right (of button) too, for convenience
						var controllerWidth = thisObj.$controllerDiv.width();
						position.right = controllerWidth - position.left - buttonWidth;
						var tooltipY = position.top - buttonHeight - 15;

						if ($(this).parent().hasClass('able-right-controls')) {
							// this control is on the right side
              var buttonSide = 'right';
						}
						else {
							// this control is on the left side
              var buttonSide = 'left';
						}
						// populate tooltip, then calculate its width before showing it
						var tooltipWidth = AblePlayer.localGetElementById($newButton[0], tooltipId).text(buttonText).width();
						// center the tooltip horizontally over the button
            if (buttonSide == 'left') {
    				  var tooltipX = position.left - tooltipWidth/2;
              if (tooltipX < 0) {
                // tooltip would exceed the bounds of the player. Adjust.
                tooltipX = 2;
              }
              var tooltipStyle = {
							  left: tooltipX + 'px',
								right: '',
								top: tooltipY + 'px'
						  };
            }
            else {
              var tooltipX = position.right - tooltipWidth/2;
              if (tooltipX < 0) {
                // tooltip would exceed the bounds of the player. Adjust.
                tooltipX = 2;
              }
              var tooltipStyle = {
								left: '',
								right: tooltipX + 'px',
								top: tooltipY + 'px'
						  };
            }
						var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(buttonText).css(tooltipStyle);
						thisObj.showTooltip(tooltip);
						$(this).on('mouseleave blur',function() {
							AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
						})
					});

					if (control === 'captions') {
						if (!this.prefCaptions || this.prefCaptions !== 1) {
							// captions are available, but user has them turned off
							if (this.captions.length > 1) {
								captionLabel = this.tt.captions;
							}
							else {
								captionLabel = this.tt.showCaptions;
							}
							$newButton.addClass('buttonOff').attr('title',captionLabel);
						}
					}
					else if (control === 'descriptions') {
						if (!this.prefDesc || this.prefDesc !== 1) {
							// user prefer non-audio described version
							// Therefore, load media without description
							// Description can be toggled on later with this button
							$newButton.addClass('buttonOff').attr('title',this.tt.turnOnDescriptions);
						}
					}

					$controllerSpan.append($newButton);

					// create variables of buttons that are referenced throughout the AblePlayer object
					if (control === 'play') {
						this.$playpauseButton = $newButton;
					}
					else if (control == 'previous') {
  					this.$prevButton = $newButton;
            // if player is being rebuilt because user clicked the Prev button
            // return focus to that (newly built) button
            if (this.buttonWithFocus == 'previous') {
              this.$prevButton.focus();
              this.buttonWithFocus = null;
            }
					}
					else if (control == 'next') {
  					this.$nextButton = $newButton;
            // if player is being rebuilt because user clicked the Next button
            // return focus to that (newly built) button
            if (this.buttonWithFocus == 'next') {
              this.$nextButton.focus();
              this.buttonWithFocus = null;
            }
					}
					else if (control === 'captions') {
						this.$ccButton = $newButton;
					}
					else if (control === 'sign') {
						this.$signButton = $newButton;
						// gray out sign button if sign language window is not active
						if (!(this.$signWindow.is(':visible'))) {
							this.$signButton.addClass('buttonOff');
						}
					}
					else if (control === 'descriptions') {
						this.$descButton = $newButton;
						// button will be enabled or disabled in description.js > initDescription()
					}
					else if (control === 'mute') {
						this.$muteButton = $newButton;
					}
					else if (control === 'transcript') {
						this.$transcriptButton = $newButton;
						// gray out transcript button if transcript is not active
						if (!(this.$transcriptDiv.is(':visible'))) {
							this.$transcriptButton.addClass('buttonOff').attr('title',this.tt.showTranscript);
						}
					}
					else if (control === 'fullscreen') {
						this.$fullscreenButton = $newButton;
					}
					else if (control === 'chapters') {
						this.$chaptersButton = $newButton;
					}
					else if (control === 'preferences') {
						this.$prefsButton = $newButton;
					}
					else if (control === 'volume') {
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

		if (this.mediaType === 'video') {

			if (typeof this.$captionsDiv !== 'undefined') {
				// stylize captions based on user prefs
				this.stylizeCaptions(this.$captionsDiv);
			}
			if (typeof this.$descDiv !== 'undefined') {
				// stylize descriptions based on user's caption prefs
				this.stylizeCaptions(this.$descDiv);
			}
		}

		// combine left and right controls arrays for future reference
		this.controls = [];
		for (var sec in controlLayout) if (controlLayout.hasOwnProperty(sec)) {
			this.controls = this.controls.concat(controlLayout[sec]);
		}

		// Update state-based display of controls.
		this.refreshControls('init');
	};

	AblePlayer.prototype.useSvg = function () {

		// Modified from IcoMoon.io svgxuse
		// @copyright Copyright (c) 2016 IcoMoon.io
		// @license		Licensed under MIT license
		// See https://github.com/Keyamoon/svgxuse
		// @version		1.1.16

		var cache = Object.create(null); // holds xhr objects to prevent multiple requests
		var checkUseElems,
				tid; // timeout id
		var debouncedCheck = function () {
			clearTimeout(tid);
			tid = setTimeout(checkUseElems, 100);
		};
		var unobserveChanges = function () {
			return;
		};
		var observeChanges = function () {
			var observer;
			window.addEventListener('resize', debouncedCheck, false);
			window.addEventListener('orientationchange', debouncedCheck, false);
			if (window.MutationObserver) {
				observer = new MutationObserver(debouncedCheck);
				observer.observe(document.documentElement, {
					childList: true,
					subtree: true,
					attributes: true
				});
				unobserveChanges = function () {
					try {
						observer.disconnect();
						window.removeEventListener('resize', debouncedCheck, false);
						window.removeEventListener('orientationchange', debouncedCheck, false);
					} catch (ignore) {}
				};
			}
			else {
				document.documentElement.addEventListener('DOMSubtreeModified', debouncedCheck, false);
				unobserveChanges = function () {
					document.documentElement.removeEventListener('DOMSubtreeModified', debouncedCheck, false);
					window.removeEventListener('resize', debouncedCheck, false);
					window.removeEventListener('orientationchange', debouncedCheck, false);
				};
			}
		};
		var xlinkNS = 'http://www.w3.org/1999/xlink';
		checkUseElems = function () {
			var base,
					bcr,
					fallback = '', // optional fallback URL in case no base path to SVG file was given and no symbol definition was found.
					hash,
					i,
					Request,
					inProgressCount = 0,
					isHidden,
					url,
					uses,
					xhr;
			if (window.XMLHttpRequest) {
				Request = new XMLHttpRequest();
				if (Request.withCredentials !== undefined) {
					Request = XMLHttpRequest;
				}
				else {
					Request = XDomainRequest || undefined;
				}
			}
			if (Request === undefined) {
				return;
			}
			function observeIfDone() {
				// If done with making changes, start watching for chagnes in DOM again
				inProgressCount -= 1;
				if (inProgressCount === 0) { // if all xhrs were resolved
					observeChanges(); // watch for changes to DOM
				}
			}
			function attrUpdateFunc(spec) {
				return function () {
					if (cache[spec.base] !== true) {
						spec.useEl.setAttributeNS(xlinkNS, 'xlink:href', '#' + spec.hash);
					}
				};
			}
			function onloadFunc(xhr) {
				return function () {
					var body = document.body;
					var x = document.createElement('x');
					var svg;
					xhr.onload = null;
					x.innerHTML = xhr.responseText;
					svg = x.getElementsByTagName('svg')[0];
					if (svg) {
						svg.setAttribute('aria-hidden', 'true');
						svg.style.position = 'absolute';
						svg.style.width = 0;
						svg.style.height = 0;
						svg.style.overflow = 'hidden';
						body.insertBefore(svg, body.firstChild);
					}
					observeIfDone();
				};
			}
			function onErrorTimeout(xhr) {
				return function () {
					xhr.onerror = null;
					xhr.ontimeout = null;
					observeIfDone();
				};
			}
			unobserveChanges(); // stop watching for changes to DOM
			// find all use elements
			uses = document.getElementsByTagName('use');
			for (i = 0; i < uses.length; i += 1) {
				try {
					bcr = uses[i].getBoundingClientRect();
				} catch (ignore) {
					// failed to get bounding rectangle of the use element
					bcr = false;
				}
				url = uses[i].getAttributeNS(xlinkNS, 'href').split('#');
				base = url[0];
				hash = url[1];
				isHidden = bcr && bcr.left === 0 && bcr.right === 0 && bcr.top === 0 && bcr.bottom === 0;
				if (bcr && bcr.width === 0 && bcr.height === 0 && !isHidden) {
					// the use element is empty
					// if there is a reference to an external SVG, try to fetch it
					// use the optional fallback URL if there is no reference to an external SVG
					if (fallback && !base.length && hash && !document.getElementById(hash)) {
						base = fallback;
					}
					if (base.length) {
						// schedule updating xlink:href
						xhr = cache[base];
						if (xhr !== true) {
							// true signifies that prepending the SVG was not required
							setTimeout(attrUpdateFunc({
								useEl: uses[i],
								base: base,
								hash: hash
							}), 0);
						}
						if (xhr === undefined) {
							xhr = new Request();
							cache[base] = xhr;
							xhr.onload = onloadFunc(xhr);
							xhr.onerror = onErrorTimeout(xhr);
							xhr.ontimeout = onErrorTimeout(xhr);
							xhr.open('GET', base);
							xhr.send();
							inProgressCount += 1;
						}
					}
				}
				else {
					if (!isHidden) {
						if (cache[base] === undefined) {
							// remember this URL if the use element was not empty and no request was sent
							cache[base] = true;
						}
						else if (cache[base].onload) {
							// if it turns out that prepending the SVG is not necessary,
							// abort the in-progress xhr.
							cache[base].abort();
							cache[base].onload = undefined;
							cache[base] = true;
						}
					}
				}
			}
			uses = '';
			inProgressCount += 1;
			observeIfDone();
		};
/*
		// The load event fires when all resources have finished loading, which allows detecting whether SVG use elements are empty.
		window.addEventListener('load', function winLoad() {
			window.removeEventListener('load', winLoad, false); // to prevent memory leaks
			tid = setTimeout(checkUseElems, 0);
		}, false);
*/
	};

	AblePlayer.prototype.cuePlaylistItem = function(sourceIndex) {

		// Move to a new item in a playlist.
		// NOTE: Swapping source for audio description is handled elsewhere;
		// see description.js > swapDescription()

		/*
			// Decided against preventing a reload of the current item in the playlist.
			// If it's clickable, users should be able to click on it and expect something to happen.
			// Leaving here though in case it's determined to be desirable.
		if (sourceIndex === this.playlistItemIndex) {
			// user has requested the item that's currently playing
			// just ignore the request
			return;
		}
		this.playlistItemIndex = sourceIndex;
		*/

		var $newItem, prevPlayer, newPlayer, itemTitle, itemLang, sources, s, i, $newSource, nowPlayingSpan;

		var thisObj = this;

		prevPlayer = this.player;

		if (this.initializing) { // this is the first track - user hasn't pressed play yet
			// do nothing.
		}
		else {
				if (this.playerCreated) {
				// remove the old
				this.deletePlayer();
			}
		}

		// Determine appropriate player to play this media
		$newItem = this.$playlist.eq(sourceIndex);
		if (this.hasAttr($newItem,'data-youtube-id')) {
			this.youTubeId = $newItem.attr('data-youtube-id');
			newPlayer = 'youtube';
		}
		else {
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
		}
		else {
				// the new player is not youtube
			this.youTubeId = false;
			if (prevPlayer === 'youtube') {
				// unhide the media element
				this.$media.show();
			}
		}
		this.player = newPlayer;

		// set swappingSrc; needs to be true within recreatePlayer(), called below
		this.swappingSrc = true;

		// transfer media attributes from playlist to media element
		if (this.hasAttr($newItem,'data-poster')) {
			this.$media.attr('poster',$newItem.attr('data-poster'));
		}
		if (this.hasAttr($newItem,'data-width')) {
			this.$media.attr('width',$newItem.attr('data-width'));
		}
		if (this.hasAttr($newItem,'data-height')) {
			this.$media.attr('height',$newItem.attr('data-height'));
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
				if (thisObj.hasAttr($(this),'data-src')) {
					// this is the only required attribute
					var $newSource = $('<source>',{
						'src': $(this).attr('data-src')
					});
					if (thisObj.hasAttr($(this),'data-type')) {
						$newSource.attr('type',$(this).attr('data-type'));
					}
					if (thisObj.hasAttr($(this),'data-desc-src')) {
						$newSource.attr('data-desc-src',$(this).attr('data-desc-src'));
					}
					if (thisObj.hasAttr($(this),'data-sign-src')) {
						$newSource.attr('data-sign-src',$(this).attr('data-sign-src'));
					}
					thisObj.$media.append($newSource);
				}
			});
		}

		// add new <track> elements from playlist data
		var $trackSpans = $newItem.children('span.able-track');
		if ($trackSpans.length) {
			 // for each element in $trackSpans, create a new <track> element
			$trackSpans.each(function() {
				if (thisObj.hasAttr($(this),'data-src') &&
					thisObj.hasAttr($(this),'data-kind') &&
					thisObj.hasAttr($(this),'data-srclang')) {
					// all required attributes are present
					var $newTrack = $('<track>',{
						'src': $(this).attr('data-src'),
						'kind': $(this).attr('data-kind'),
						'srclang': $(this).attr('data-srclang')
					});
					if (thisObj.hasAttr($(this),'data-label')) {
						$newTrack.attr('label',$(this).attr('data-label'));
					}
					thisObj.$media.append($newTrack);
				}
			});
		}

		itemTitle = $newItem.text();
		if (this.hasAttr($newItem,'lang')) {
			itemLang = $newItem.attr('lang');
		}
		// Update relevant arrays
		this.$sources = this.$media.find('source');

		// recreate player, informed by new attributes and track elements
		this.recreatePlayer();

		// update playlist to indicate which item is playing
		//$('.able-playlist li').removeClass('able-current');
		this.$playlist.removeClass('able-current');
		this.$playlist.eq(sourceIndex).addClass('able-current');

		// update Now Playing div
		if (this.showNowPlaying === true) {
			if (typeof this.$nowPlayingDiv !== 'undefined') {
				nowPlayingSpan = $('<span>');
				if (typeof itemLang !== 'undefined') {
					nowPlayingSpan.attr('lang',itemLang);
				}
				nowPlayingSpan.html('<span>' + this.tt.selectedTrack + ':</span>' + itemTitle);
				this.$nowPlayingDiv.html(nowPlayingSpan);
			}
		}

		// if this.swappingSrc is true, media will autoplay when ready
		if (this.initializing) { // this is the first track - user hasn't pressed play yet
			this.swappingSrc = false;
		}
		else {
			this.swappingSrc = true;
			if (this.player === 'html5') {
				this.media.load();
			}
			else if (this.player === 'youtube') {
				this.okToPlay = true;
			}
		}
	};

	AblePlayer.prototype.deletePlayer = function() {

		// remove previous video's attributes and child elements from media element
		if (this.player == 'youtube') {
				var $youTubeIframe = this.$mediaContainer.find('iframe');
				$youTubeIframe.remove();
		}
		this.$media.removeAttr('poster width height');
		this.$media.empty();

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

		// reset key variables
		this.hasCaptions = false;
		this.hasChapters = false;
		this.captionsPopup = null;
		this.chaptersPopup = null;
	};

	AblePlayer.prototype.getButtonTitle = function(control) {

		if (control === 'playpause') {
			return this.tt.play;
		}
		else if (control === 'play') {
			return this.tt.play;
		}
		else if (control === 'pause') {
			return this.tt.pause;
		}
		else if (control === 'restart') {
			return this.tt.restart;
		}
		else if (control === 'previous') {
			return this.tt.prevTrack;
		}
		else if (control === 'next') {
			return this.tt.nextTrack;
		}
		else if (control === 'rewind') {
			return this.tt.rewind;
		}
		else if (control === 'forward') {
			return this.tt.forward;
		}
		else if (control === 'captions') {
			if (this.captions.length > 1) {
				return this.tt.captions;
			}
			else {
				if (this.captionsOn) {
					return this.tt.hideCaptions;
				}
				else {
					return this.tt.showCaptions;
				}
			}
		}
		else if (control === 'descriptions') {
			if (this.descOn) {
				return this.tt.turnOffDescriptions;
			}
			else {
				return this.tt.turnOnDescriptions;
			}
		}
		else if (control === 'transcript') {
			if (this.$transcriptDiv.is(':visible')) {
				return this.tt.hideTranscript;
			}
			else {
				return this.tt.showTranscript;
			}
		}
		else if (control === 'chapters') {
			return this.tt.chapters;
		}
		else if (control === 'sign') {
			return this.tt.sign;
		}
		else if (control === 'volume') {
			return this.tt.volume;
		}
		else if (control === 'faster') {
			return this.tt.faster;
		}
		else if (control === 'slower') {
			return this.tt.slower;
		}
		else if (control === 'preferences') {
			return this.tt.preferences;
		}
		else if (control === 'help') {
			// return this.tt.help;
		}
		else {
			// there should be no other controls, but just in case:
			// return the name of the control with first letter in upper case
			// ultimately will need to get a translated label from this.tt
			if (this.debug) {
				
			}
			return control.charAt(0).toUpperCase() + control.slice(1);
		}
	};


})(jQuery);

(function ($) {
	// Loads files referenced in track elements, and performs appropriate setup.
	// For example, captions and text descriptions.
	// This will be called whenever the player is recreated.
	// Added in v2.2.23: Also handles YouTube caption tracks

	AblePlayer.prototype.setupTracks = function() {

		var thisObj, deferred, promise, loadingPromises, loadingPromise, i, tracks, track;

		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		loadingPromises = [];

		this.captions = [];
		this.captionLabels = [];
		this.descriptions = [];
		this.chapters = [];
		this.meta = [];

		if ($('#able-vts').length) {
			// Page includes a container for a VTS instance
			this.vtsTracks = [];
			this.hasVts = true;
		}
		else {
			this.hasVts = false;
		}

		this.getTracks().then(function() {

			tracks = thisObj.tracks;

			if (thisObj.player === 'youtube') {
				// If captions have been loaded into the captions array (either from YouTube or a local source),
				// we no longer have a need to use YouTube captions
				// TODO: Consider whether this is the right place to make this decision
				// Probably better to make it when cues are identified from YouTube caption sources
				if (tracks.length) {
					thisObj.usingYouTubeCaptions = false;
				}
			}

			for (i=0; i < tracks.length; i++) {

				track = tracks[i];

				var kind = track.kind;
				var trackLang = track.language;
				var trackLabel = track.label;

				if (!track.src) {
					if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
						// skip all the hullabaloo and go straight to setupCaptions
						thisObj.setupCaptions(track,trackLang,trackLabel);
					}
					else {
						// Nothing to load!
						// Skip this track; move on to next i
					}
					continue;
				}

				var trackSrc = track.src;

				loadingPromise = thisObj.loadTextObject(trackSrc); // resolves with src, trackText
				loadingPromises.push(loadingPromise);

				loadingPromise.then((function (track, kind) {

					var trackSrc = track.src;
					var trackLang = track.language;
					var trackLabel = track.label;

					return function (trackSrc, trackText) { // these are the two vars returned from loadTextObject

						var trackContents = trackText;
						var cues = thisObj.parseWebVTT(trackSrc, trackContents).cues;

						if (thisObj.hasVts) {
							 // setupVtsTracks() is in vts.js
							thisObj.setupVtsTracks(kind, trackLang, trackLabel, trackSrc, trackContents);
						}

						if (kind === 'captions' || kind === 'subtitles') {
							thisObj.setupCaptions(track, trackLang, trackLabel, cues);
						}
						else if (kind === 'descriptions') {
							thisObj.setupDescriptions(track, cues, trackLang);
						}
						else if (kind === 'chapters') {
							thisObj.setupChapters(track, cues, trackLang);
						}
						else if (kind === 'metadata') {
							thisObj.setupMetadata(track, cues);
						}
					}
				})(track, kind));
			}
			$.when.apply($, loadingPromises).then(function () {
				deferred.resolve();
			});
		});

		return promise;
	};

	AblePlayer.prototype.getTracks = function() {

		// define an array tracks with the following structure:
		// kind - string, e.g. "captions", "descriptions"
		// src - string, URL of WebVTT source file
		// language - string, lang code
		// label - string to display, e.g., in CC menu
		// def - Boolean, true if this is the default track
		// cues - array with startTime, endTime, and payload

		var thisObj, deferred, promise, captionTracks, trackLang, trackLabel, isDefault;

		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		this.$tracks = this.$media.find('track');
		this.tracks = [];

		if (this.$tracks.length) {

			// create object from HTML5 tracks
			this.$tracks.each(function() {

				// srcLang should always be included with <track>, but HTML5 spec doesn't require it
				// if not provided, assume track is the same language as the default player language
				if ($(this).attr('srclang')) {
					trackLang = $(this).attr('srclang');
				}
				else {
					trackLang = thisObj.lang;
				}

				if ($(this).attr('label')) {
					trackLabel = $(this).attr('label');
				}
				else {
					trackLabel = thisObj.getLanguageName(trackLang);
				}

				if ($(this).attr('default')) {
					isDefault = true;
				}
				else if (trackLang === thisObj.lang) {
					// There is no @default attribute,
					// but this is the user's/browser's default language
					// so make it the default caption track
					isDefault = true;
				}
				else {
					isDefault = false;
				}

				if (isDefault) {
					// this.captionLang will also be the default language for non-caption tracks
					thisObj.captionLang = trackLang;
				}

				thisObj.tracks.push({
					'kind': $(this).attr('kind'),
					'src': $(this).attr('src'),
					'language': trackLang,
					'label': trackLabel,
					'def': isDefault
				});
			});
		}

		// check to see if any HTML caption or subitle tracks were found.
		captionTracks = this.$media.find('track[kind="captions"],track[kind="subtitles"]');
		if (captionTracks.length) {
			// HTML captions or subtitles were found. Use those.
			deferred.resolve();
		}
		else {
			// if this is a youtube or vimeo player, check there for captions/subtitles
			if (this.player === 'youtube') {
				this.getYouTubeCaptionTracks(this.youTubeId).then(function() {
					deferred.resolve();
				});
			}
			else if (this.player === 'vimeo') {
				this.getVimeoCaptionTracks().then(function() {
					deferred.resolve();
				});
			}
			else {
				// this is neither YouTube nor Vimeo
				// there just ain't no caption tracks
				deferred.resolve();
			}
		}
		return promise;
	};

	AblePlayer.prototype.setupCaptions = function (track, trackLang, trackLabel, cues) {

		var thisObj, inserted, i, capLabel;

		thisObj = this;

		if (typeof cues === 'undefined') {
			cues = null;
		}

		this.hasCaptions = true;

		// Remove 'default' attribute from all <track> elements
		// This data has already been saved to this.tracks
		// and some browsers will display the default captions, despite all standard efforts to suppress them
		this.$media.find('track').removeAttr('default');

		// caption cues from WebVTT are used to build a transcript for both audio and video
		// but captions are currently only supported for video
		if (this.mediaType === 'video') {

			if (!(this.usingYouTubeCaptions || this.usingVimeoCaptions)) {
				// create a pair of nested divs for displaying captions
				// includes aria-hidden="true" because otherwise
				// captions being added and removed causes sporadic changes to focus in JAWS
				// (not a problem in NVDA or VoiceOver)
				if (!this.$captionsDiv) {
					this.$captionsDiv = $('<div>',{
						'class': 'able-captions',
					});
					this.$captionsWrapper = $('<div>',{
						'class': 'able-captions-wrapper',
						'aria-hidden': 'true'
					}).hide();
					if (this.prefCaptionsPosition === 'below') {
						this.$captionsWrapper.addClass('able-captions-below');
					}
					else {
						this.$captionsWrapper.addClass('able-captions-overlay');
					}
					this.$captionsWrapper.append(this.$captionsDiv);
					this.$vidcapContainer.append(this.$captionsWrapper);
				}
			}
		}

		this.currentCaption = -1;
		if (this.prefCaptions === 1) {
			// Captions default to on.
			this.captionsOn = true;
		}
		else {
			this.captionsOn = false;
		}
		if (this.captions.length === 0) { // this is the first
			this.captions.push({
				'cues': cues,
				'language': trackLang,
				'label': trackLabel,
				'def': track.def
			});
			this.captionLabels.push(trackLabel);
		}
		else { // there are already tracks in the array
			inserted = false;
			for (i = 0; i < this.captions.length; i++) {
				capLabel = this.captionLabels[i];
				if (trackLabel.toLowerCase() < this.captionLabels[i].toLowerCase()) {
					// insert before track i
					this.captions.splice(i,0,{
						'cues': cues,
						'language': trackLang,
						'label': trackLabel,
						'def': track.def
					});
					this.captionLabels.splice(i,0,trackLabel);
					inserted = true;
					break;
				}
			}
			if (!inserted) {
				// just add track to the end
				this.captions.push({
					'cues': cues,
					'language': trackLang,
					'label': trackLabel,
					'def': track.def
				});
				this.captionLabels.push(trackLabel);
			}
		}
	};

	AblePlayer.prototype.setupDescriptions = function (track, cues, trackLang) {

		// called via setupTracks() only if there is track with kind="descriptions"
		// prepares for delivery of text description , in case it's needed
		// whether and how it's delivered is controlled within description.js > initDescription()

		this.hasClosedDesc = true;
		this.currentDescription = -1;
		this.descriptions.push({
			cues: cues,
			language: trackLang
		});
	};

	AblePlayer.prototype.setupChapters = function (track, cues, trackLang) {

		// NOTE: WebVTT supports nested timestamps (to form an outline)
		// This is not currently supported.

		this.hasChapters = true;

		this.chapters.push({
			cues: cues,
			language: trackLang
		});
	};

	AblePlayer.prototype.setupMetadata = function(track, cues) {

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
		}
		else if (this.metaType === 'selector') {
			this.hasMeta = true;
			this.visibleSelectors = [];
			this.meta = cues;
		}
	};

	AblePlayer.prototype.loadTextObject = function(src) {

// TODO: Incorporate the following function, moved from setupTracks()
// convert XMl/TTML captions file
/*
if (thisObj.useTtml && (trackSrc.endsWith('.xml') || trackText.startsWith('<?xml'))) {
	trackContents = thisObj.ttml2webvtt(trackText);
}
*/
		var deferred, promise, thisObj, $tempDiv;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		// create a temp div for holding data
		$tempDiv = $('<div>',{
			style: 'display:none'
		});
		$tempDiv.load(src, function (trackText, status, req) {
			if (status === 'error') {
				if (thisObj.debug) {
					
				}
				deferred.fail();
			}
			else {
				deferred.resolve(src, trackText);
			}
			$tempDiv.remove();
		});
		return promise;
	};

	AblePlayer.prototype.setupAltCaptions = function() {

		// setup captions from an alternative source (not <track> elements)
		// only do this if no <track> captions are provided
		// currently supports: YouTube, Vimeo
		var deferred = new $.Deferred();
		var promise = deferred.promise();
		if (this.captions.length === 0) {
			if (this.player === 'youtube' && this.usingYouTubeCaptions) {
				this.setupYouTubeCaptions().done(function() {
					deferred.resolve();
				});
			}
			else if (this.player === 'vimeo' && this.usingVimeoCaptions) {
				this.setupVimeoCaptions().done(function() {
					deferred.resolve();
				});
			}

			else {
				// repeat for other alt sources once supported (e.g., Vimeo, DailyMotion)
				deferred.resolve();
			}
		}
		else { // there are <track> captions, so no need for alt source captions
			deferred.resolve();
		}
		return promise;
	};

})(jQuery);


(function ($) {
	AblePlayer.prototype.initYouTubePlayer = function () {

		var thisObj, deferred, promise, youTubeId, googleApiPromise, json;
		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		// if a described version is available && user prefers desription
		// init player using the described version
		if (this.youTubeDescId && this.prefDesc) {
			youTubeId = this.youTubeDescId;
		}
		else {
			youTubeId = this.youTubeId;
		}
		this.activeYouTubeId = youTubeId;
		if (AblePlayer.youtubeIframeAPIReady) {
			// Script already loaded and ready.
			this.finalizeYoutubeInit().then(function() {
				deferred.resolve();
			});
		}
		else {
			// Has another player already started loading the script? If so, abort...
			if (!AblePlayer.loadingYoutubeIframeAPI) {
				$.getScript('https://www.youtube.com/iframe_api').fail(function () {
					deferred.fail();
				});
			}

			// Otherwise, keeping waiting for script load event...
			$('body').on('youtubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeInit = function () {

		// This is called once we're sure the Youtube iFrame API is loaded -- see above
		var deferred, promise, thisObj, containerId, ccLoadPolicy, videoDimensions, autoplay;

		deferred = new $.Deferred();
		promise = deferred.promise();

		thisObj = this;

		containerId = this.mediaId + '_youtube';

		this.$mediaContainer.prepend($('<div>').attr('id', containerId));
		// NOTE: Tried the following in place of the above in January 2016
		// because in some cases two videos were being added to the DOM
		// However, once v2.2.23 was fairly stable, unable to reproduce that problem
		// so maybe it's not an issue. This is preserved here temporarily, just in case it's needed...
		// thisObj.$mediaContainer.html($('<div>').attr('id', containerId));

		// cc_load_policy:
		// 0 - show captions depending on user's preference on YouTube
		// 1 - show captions by default, even if the user has turned them off
		// For Able Player, init player with value of 0
		// and will turn them on or off after player is initialized
		// based on availability of local tracks and user's Able Player prefs
		ccLoadPolicy = 0;

		videoDimensions = this.getYouTubeDimensions(this.activeYouTubeId, containerId);
		if (videoDimensions) {
			this.ytWidth = videoDimensions[0];
			this.ytHeight = videoDimensions[1];
			this.aspectRatio = thisObj.ytWidth / thisObj.ytHeight;
		}
		else {
			// dimensions are initially unknown
			// sending null values to YouTube results in a video that uses the default YouTube dimensions
			// these can then be scraped from the iframe and applied to this.$ableWrapper
			this.ytWidth = null;
			this.ytHeight = null;
		}

		if (this.okToPlay) {
			autoplay = 1;
		}
		else {
			autoplay = 0;
		}

		// NOTE: YouTube is changing the following parameters on or after Sep 25, 2018:
		// rel - No longer able to prevent YouTube from showing related videos
		//			value of 0 now limits related videos to video's same channel
		// showinfo - No longer supported (previously, value of 0 hid title, share, & watch later buttons
		// Documentation https://developers.google.com/youtube/player_parameters

		this.youTubePlayer = new YT.Player(containerId, {
			videoId: this.activeYouTubeId,
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			width: this.ytWidth,
			height: this.ytHeight,
			playerVars: {
				autoplay: autoplay,
				enablejsapi: 1,
				disableKb: 1, // disable keyboard shortcuts, using our own
				playsinline: this.playsInline,
				start: this.startTime,
				controls: 0, // no controls, using our own
				cc_load_policy: ccLoadPolicy,
				hl: this.lang, // use the default language UI
				modestbranding: 1, // no YouTube logo in controller
				rel: 0, // do not show related videos when video ends
				html5: 1, // force html5 if browser supports it (undocumented parameter; 0 does NOT force Flash)
				iv_load_policy: 3 // do not show video annotations
			},
			events: {
				onReady: function () {
					if (thisObj.swappingSrc) {
						// swap is now complete
						thisObj.swappingSrc = false;
						thisObj.cueingPlaylistItem = false;
						if (thisObj.playing) {
							// resume playing
							thisObj.playMedia();
						}
					}
					if (thisObj.userClickedPlaylist) {
						thisObj.userClickedPlaylist = false; // reset
					}
					if (typeof thisObj.aspectRatio === 'undefined') {
						thisObj.resizeYouTubePlayer(thisObj.activeYouTubeId, containerId);
					}
					deferred.resolve();
				},
				onError: function (x) {
					deferred.fail();
				},
				onStateChange: function (x) {
					thisObj.getPlayerState().then(function(playerState) {
						// values of playerState: 'playing','paused','buffering','ended'
						if (playerState === 'playing') {
							thisObj.playing = true;
							thisObj.startedPlaying = true;
							thisObj.paused = false;
						}
						else if (playerState == 'ended') {
							thisObj.onMediaComplete();
						}
						else {
							thisObj.playing = false;
							thisObj.paused = true;
						}
						if (thisObj.stoppingYouTube && playerState === 'paused') {
							if (typeof thisObj.$posterImg !== 'undefined') {
								thisObj.$posterImg.show();
							}
							thisObj.stoppingYouTube = false;
							thisObj.seeking = false;
							thisObj.playing = false;
							thisObj.paused = true;
						}
					});
				},
				onPlaybackQualityChange: function () {
					// do something
				},
				onApiChange: function (x) {
					// As of Able Player v2.2.23, we are now getting caption data via the YouTube Data API
					// prior to calling initYouTubePlayer()
					// Previously we got caption data via the YouTube iFrame API, and doing so was an awful mess.
					// onApiChange fires to indicate that the player has loaded (or unloaded) a module with exposed API methods
					// it isn't fired until the video starts playing
					// if captions are available for this video (automated captions don't count)
					// the 'captions' (or 'cc') module is loaded. If no captions are available, this event never fires
					// So, to trigger this event we had to play the video briefly, then pause, then reset.
					// During that brief moment of playback, the onApiChange event was fired and we could setup captions
					// The 'captions' and 'cc' modules are very different, and have different data and methods
					// NOW, in v2.2.23, we still need to initialize the caption modules in order to control captions
					// but we don't have to do that on load in order to get caption data
					// Instead, we can wait until the video starts playing normally, then retrieve the modules
					thisObj.initYouTubeCaptionModule();
				}
			}
		});

		this.injectPoster(this.$mediaContainer, 'youtube');
		if (!this.hasPlaylist) {
			// remove the media element, since YouTube replaces that with its own element in an iframe
			// this is handled differently for playlists. See buildplayer.js > cuePlaylistItem()
			this.$media.remove();
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeDimensions = function (youTubeContainerId) {

		// get dimensions of YouTube video, return array with width & height
		// Sources, in order of priority:
		// 1. The width and height attributes on <video>
		// 2. YouTube (not yet supported; can't seem to get this data via YouTube Data API without OAuth!)

		var d, url, $iframe, width, height;

		d = [];

		if (typeof this.playerMaxWidth !== 'undefined') {
			d[0] = this.playerMaxWidth;
			// optional: set height as well; not required though since YouTube will adjust height to match width
			if (typeof this.playerMaxHeight !== 'undefined') {
				d[1] = this.playerMaxHeight;
			}
			return d;
		}
		else {
			if (typeof $('#' + youTubeContainerId) !== 'undefined') {
				$iframe = $('#' + youTubeContainerId);
				width = $iframe.width();
				height = $iframe.height();
				if (width > 0 && height > 0) {
					d[0] = width;
					d[1] = height;
					return d;
				}
			}
		}
		return false;
	};

	AblePlayer.prototype.resizeYouTubePlayer = function(youTubeId, youTubeContainerId) {

		// called after player is ready, if youTube dimensions were previously unknown
		// Now need to get them from the iframe element that YouTube injected
		// and resize Able Player to match
		var d, width, height;
		if (typeof this.aspectRatio !== 'undefined') {
			// video dimensions have already been collected
			if (this.restoringAfterFullScreen) {
				// restore using saved values
				if (this.youTubePlayer) {
					this.youTubePlayer.setSize(this.ytWidth, this.ytHeight);
				}
				this.restoringAfterFullScreen = false;
			}
			else {
				// recalculate with new wrapper size
				width = this.$ableWrapper.parent().width();
				height = Math.round(width / this.aspectRatio);
				this.$ableWrapper.css({
					'max-width': width + 'px',
					'width': ''
				});
				this.youTubePlayer.setSize(width, height);
				if (this.fullscreen) {
					this.youTubePlayer.setSize(width, height);
				}
				else {
					// resizing due to a change in window size, not full screen
					this.youTubePlayer.setSize(this.ytWidth, this.ytHeight);
				}
			}
		}
		else {
			d = this.getYouTubeDimensions(youTubeContainerId);
			if (d) {
				width = d[0];
				height = d[1];
				if (width > 0 && height > 0) {
					this.aspectRatio = width / height;
					this.ytWidth = width;
					this.ytHeight = height;
					if (width !== this.$ableWrapper.width()) {
						// now that we've retrieved YouTube's default width,
						// need to adjust to fit the current player wrapper
						width = this.$ableWrapper.width();
						height = Math.round(width / this.aspectRatio);
						if (this.youTubePlayer) {
							this.youTubePlayer.setSize(width, height);
						}
					}
				}
			}
		}
	};

	AblePlayer.prototype.setupYouTubeCaptions = function () {

		// called from setupAltCaptions if player is YouTube and there are no <track> captions

		// use YouTube Data API to get caption data from YouTube
		// function is called only if these conditions are met:
		// 1. this.player === 'youtube'
		// 2. there are no <track> elements with kind="captions"
		// 3. youTubeDataApiKey is defined

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, googleApiPromise, youTubeId, i;

		thisObj = this;

		// if a described version is available && user prefers desription
		// Use the described version, and get its captions
		if (this.youTubeDescId && this.prefDesc) {
			youTubeId = this.youTubeDescId;
		}
		else {
			youTubeId = this.youTubeId;
		}

		if (typeof youTubeDataAPIKey !== 'undefined') {
			// Wait until Google Client API is loaded
			// When loaded, it sets global var googleApiReady to true

			// Thanks to Paul Tavares for $.doWhen()
			// https://gist.github.com/purtuga/8257269
			$.doWhen({
				when: function(){
					return googleApiReady;
				},
				interval: 100, // ms
				attempts: 1000
			})
			.done(function(){
					deferred.resolve();
			})
			.fail(function(){
				
			});
		}
		else {
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.waitForGapi = function () {

		// wait for Google API to initialize

		var thisObj, deferred, promise, maxWaitTime, maxTries, tries, timer, interval;

		thisObj = this;
		deferred = new $.Deferred();
		promise = deferred.promise();
		maxWaitTime = 5000; // 5 seconds
		maxTries = 100; // number of tries during maxWaitTime
		tries = 0;
		interval = Math.floor(maxWaitTime/maxTries);

		timer = setInterval(function() {
			tries++;
			if (googleApiReady || tries >= maxTries) {
				clearInterval(timer);
				if (googleApiReady) { // success!
					deferred.resolve(true);
				}
				else { // tired of waiting
					deferred.resolve(false);
				}
			}
			else {
				thisObj.waitForGapi();
			}
		}, interval);
		return promise;
	};

	AblePlayer.prototype.getYouTubeCaptionTracks = function (youTubeId) {

		// get data via YouTube Data API, and push data to this.captions
		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, useGoogleApi, i, trackId, trackLang, trackName, trackLabel, trackKind, isDraft, isDefaultTrack;

		thisObj = this;

		if (typeof youTubeDataAPIKey !== 'undefined') {
			this.waitForGapi().then(function(waitResult) {

				useGoogleApi = waitResult;

				// useGoogleApi returns false if API failed to initalize after max wait time
				// Proceed only if true. Otherwise can still use fallback method (see else loop below)
				if (useGoogleApi === true) {
					gapi.client.setApiKey(youTubeDataAPIKey);
					gapi.client
						.load('youtube', 'v3')
						.then(function() {
							var request = gapi.client.youtube.captions.list({
								'part': 'id, snippet',
								'videoId': youTubeId
							});
							request.then(function(json) {
								if (json.result.items.length) { // video has captions!
									thisObj.hasCaptions = true;
									thisObj.usingYouTubeCaptions = true;
									if (thisObj.prefCaptions === 1) {
										thisObj.captionsOn = true;
									}
									else {
										thisObj.captionsOn = false;
									}
									// Step through results and add them to cues array
									for (i=0; i < json.result.items.length; i++) {
										trackName = json.result.items[i].snippet.name; // usually seems to be empty
										trackLang = json.result.items[i].snippet.language;
										trackKind = json.result.items[i].snippet.trackKind; // ASR, standard, forced
										isDraft = json.result.items[i].snippet.isDraft; // Boolean
										// Other variables that could potentially be collected from snippet:
										// isCC - Boolean, always seems to be false
										// isLarge - Boolean
										// isEasyReader - Boolean
										// isAutoSynced	 Boolean
										// status - string, always seems to be "serving"

										var srcUrl = thisObj.getYouTubeTimedTextUrl(youTubeId,trackName,trackLang);
										if (trackKind !== 'ASR' && !isDraft) {

											if (trackName !== '') {
												 trackLabel = trackName;
											}
											else {
												 // if track name is empty (it always seems to be), assign a label based on trackLang
												 trackLabel = thisObj.getLanguageName(trackLang);
											}

											// assign the default track based on language of the player
											if (trackLang === thisObj.lang) {
												isDefaultTrack = true;
											}
											else {
												isDefaultTrack = false;
											}
											thisObj.tracks.push({
												'kind': 'captions',
												'src': srcUrl,
												'language': trackLang,
												'label': trackLabel,
												'def': isDefaultTrack
											});
										}
									}
									// setupPopups again with new captions array, replacing original
									thisObj.setupPopups('captions');
									deferred.resolve();
								}
								else {
									thisObj.hasCaptions = false;
									thisObj.usingYouTubeCaptions = false;
									deferred.resolve();
								}
							}, function (reason) {
								// If video has no captions, YouTube returns an error.
								// Should still proceed, but with captions disabled
								// The specific error, if needed: reason.result.error.message
								// If no captions, the error is: "The video identified by the <code>videoId</code> parameter could not be found."
								
								
								thisObj.hasCaptions = false;
								thisObj.usingYouTubeCaptions = false;
								deferred.resolve();
							});
						})
				}
				else {
					// googleAPi never loaded.
					this.getYouTubeCaptionTracks2(youTubeId).then(function() {
						deferred.resolve();
					});
				}
			});
		}
		else {
			// web owner hasn't provided a Google API key
			// attempt to get YouTube captions via the backup method
			this.getYouTubeCaptionTracks2(youTubeId).then(function() {
				deferred.resolve();
			});
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeCaptionTracks2 = function (youTubeId) {

	 	// Use alternative backup method of getting caption tracks from YouTube
	 	// and pushing them to this.captions
	 	// Called from getYouTubeCaptionTracks if no Google API key is defined
	 	// or if Google API failed to initiatlize
	 	// This method seems to be undocumented, but is referenced on StackOverflow
	 	// We'll use that as a fallback but it could break at any moment

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, useGoogleApi, i, trackId, trackLang, trackName, trackLabel, trackKind, isDraft, isDefaultTrack;

		thisObj = this;

		$.ajax({
			type: 'get',
			url: 'https://www.youtube.com/api/timedtext?type=list&v=' + youTubeId,
			dataType: 'xml',
			success: function(xml) {
				var $tracks = $(xml).find('track');
				if ($tracks.length > 0) {	 // video has captions!
					thisObj.hasCaptions = true;
					thisObj.usingYouTubeCaptions = true;
					if (thisObj.prefCaptions === 1) {
						thisObj.captionsOn = true;
					}
					else {
						thisObj.captionsOn = false;
					}
					// Step through results and add them to tracks array
					$tracks.each(function() {
						trackId = $(this).attr('id');
						trackLang = $(this).attr('lang_code');
						if ($(this).attr('name') !== '') {
							trackName = $(this).attr('name');
							trackLabel = trackName;
						}
						else {
							// @name is typically null except for default track
							// but lang_translated seems to be reliable
							trackName = '';
							trackLabel = $(this).attr('lang_translated');
						}
						if (trackLabel === '') {
							trackLabel = thisObj.getLanguageName(trackLang);
						}
						// assign the default track based on language of the player
						if (trackLang === thisObj.lang) {
							isDefaultTrack = true;
						}
						else {
							isDefaultTrack = false;
						}

						// Build URL for retrieving WebVTT source via YouTube's timedtext API
						var srcUrl = thisObj.getYouTubeTimedTextUrl(youTubeId,trackName,trackLang);
						thisObj.tracks.push({
							'kind': 'captions',
							'src': srcUrl,
							'language': trackLang,
							'label': trackLabel,
							'def': isDefaultTrack
						});

					});
					// setupPopups again with new captions array, replacing original
					thisObj.setupPopups('captions');
					deferred.resolve();
				}
				else {
					thisObj.hasCaptions = false;
					thisObj.usingYouTubeCaptions = false;
					deferred.resolve();
				}
			},
			error: function(xhr, status) {
				
				deferred.resolve();
			}
		});
		return promise;
	};

	AblePlayer.prototype.getYouTubeTimedTextUrl = function (youTubeId, trackName, trackLang) {

		// return URL for retrieving WebVTT source via YouTube's timedtext API
		// Note: This API seems to be undocumented, and could break anytime
		var url = 'https://www.youtube.com/api/timedtext?fmt=vtt';
		url += '&v=' + youTubeId;
		url += '&lang=' + trackLang;
		// if track has a value in the name field, it's *required* in the URL
		if (trackName !== '') {
			url += '&name=' + trackName;
		}
		return url;
	};


	AblePlayer.prototype.getYouTubeCaptionCues = function (youTubeId) {

		var deferred, promise, thisObj;

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		thisObj = this;

		this.tracks = [];
		this.tracks.push({
			'kind': 'captions',
			'src': 'some_file.vtt',
			'language': 'en',
			'label': 'Fake English captions'
		});

		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.initYouTubeCaptionModule = function () {

		// This function is called when YouTube onApiChange event fires
		// to indicate that the player has loaded (or unloaded) a module with exposed API methods
		// it isn't fired until the video starts playing
		// and only fires if captions are available for this video (automated captions don't count)
		// If no captions are available, onApichange event never fires & this function is never called

		// YouTube iFrame API documentation is incomplete related to captions
		// Found undocumented features on user forums and by playing around
		// Details are here: http://terrillthompson.com/blog/648
		// Summary:
		// User might get either the AS3 (Flash) or HTML5 YouTube player
		// The API uses a different caption module for each player (AS3 = 'cc'; HTML5 = 'captions')
		// There are differences in the data and methods available through these modules
		// This function therefore is used to determine which captions module is being used
		// If it's a known module, this.ytCaptionModule will be used elsewhere to control captions
		var options, fontSize, displaySettings;

		options = this.youTubePlayer.getOptions();
		if (options.length) {
			for (var i=0; i<options.length; i++) {
				if (options[i] == 'cc') { // this is the AS3 (Flash) player
					this.ytCaptionModule = 'cc';
					if (!this.hasCaptions) {
						// there are captions available via other sources (e.g., <track>)
						// so use these
						this.hasCaptions = true;
						this.usingYouTubeCaptions = true;
					}
					break;
				}
				else if (options[i] == 'captions') { // this is the HTML5 player
					this.ytCaptionModule = 'captions';
					if (!this.hasCaptions) {
						// there are captions available via other sources (e.g., <track>)
						// so use these
						this.hasCaptions = true;
						this.usingYouTubeCaptions = true;
					}
					break;
				}
			}
			if (typeof this.ytCaptionModule !== 'undefined') {
				if (this.usingYouTubeCaptions) {
					// set default languaage
					this.youTubePlayer.setOption(this.ytCaptionModule, 'track', {'languageCode': this.captionLang});
					// set font size using Able Player prefs (values are -1, 0, 1, 2, and 3, where 0 is default)
					this.youTubePlayer.setOption(this.ytCaptionModule,'fontSize',this.translatePrefs('size',this.prefCaptionsSize,'youtube'));
					// ideally could set other display options too, but no others seem to be supported by setOption()
				}
				else {
					// now that we know which cc module was loaded, unload it!
					// we don't want it if we're using local <track> elements for captions
					this.youTubePlayer.unloadModule(this.ytCaptionModule)
				}
			}
		}
		else {
			// no modules were loaded onApiChange
			// unfortunately, gonna have to disable captions if we can't control them
			this.hasCaptions = false;
			this.usingYouTubeCaptions = false;
		}
		this.refreshControls('captions');
	};

	AblePlayer.prototype.getYouTubePosterUrl = function (youTubeId, width) {

			 // return a URL for retrieving a YouTube poster image
			 // supported values of width: 120, 320, 480, 640

			 var url = 'https://img.youtube.com/vi/' + youTubeId;
			 if (width == '120') {
				 // default (small) thumbnail, 120 x 90
				 return url + '/default.jpg';
			 }
			 else if (width == '320') {
				 // medium quality thumbnail, 320 x 180
				 return url + '/hqdefault.jpg';
			 }
			 else if (width == '480') {
				 // high quality thumbnail, 480 x 360
				 return url + '/hqdefault.jpg';
			 }
			 else if (width == '640') {
				 // standard definition poster image, 640 x 480
				 return url + '/sddefault.jpg';
			 }
			 return false;
	};

})(jQuery);

(function ($) {


	// Events:
	//	 startTracking(event, position)
	//	 tracking(event, position)
	//	 stopTracking(event, position)

	window. AccessibleSlider = function(mediaType, div, orientation, length, min, max, bigInterval, label, className, trackingMedia, initialState) {

		// mediaType is either 'audio' or 'video'
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
			'orientation': orientation,
			'class': 'able-' + className + '-head'
		});

		if (initialState === 'visible') {
			this.seekHead.attr('tabindex', '0');
		}
		else {
			this.seekHead.attr('tabindex', '-1');
		}
		// Since head is focusable, it gets the aria roles/titles.
		this.seekHead.attr({
			'role': 'slider',
			'aria-label': label,
			'aria-valuemin': min,
			'aria-valuemax': max
		});

		this.timeTooltip = $('<div>');
		this.bodyDiv.append(this.timeTooltip);

		this.timeTooltip.attr('role', 'tooltip');
		this.timeTooltip.addClass('able-tooltip');
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
		  }
      else {
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
      }
      else if (e.type === 'mouseleave' || e.type === 'blur') {
  			thisObj.overHead = false;
        if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
				  thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
			  }
      }
      else if (e.type === 'mousemove' || e.type === 'touchmove') {
  			if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
	  			thisObj.trackHeadAtPageX(coords.x);
        }
      }
      else if (e.type === 'mousedown' || e.type === 'touchstart') {
  			thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
        if (!thisObj.bodyDiv.is(':focus')) {
				  thisObj.bodyDiv.focus();
			  }
        e.preventDefault();
      }
      else if (e.type === 'mouseup' || e.type === 'touchend') {
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

      coords = thisObj.pointerEventToXY(e);

  		if (e.type === 'mouseenter') {
  			thisObj.overBody = true;
		  }
		  else if (e.type === 'mouseleave') {
  			thisObj.overBody = false;
        thisObj.overBodyMousePos = null;
  			if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
	  			thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
			  }
      }
      else if (e.type === 'mousemove' || e.type === 'touchmove') {
  			thisObj.overBodyMousePos = {
	  			x: coords.x,
          y: coords.y
			  };
        if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
				  thisObj.trackHeadAtPageX(coords.x);
			  }
      }
      else if (e.type === 'mousedown' || e.type === 'touchstart') {
  			thisObj.startTracking('mouse', thisObj.pageXToPosition(coords.x));
        thisObj.trackHeadAtPageX(coords.x);
        if (!thisObj.seekHead.is(':focus')) {
				  thisObj.seekHead.focus();
			  }
        e.preventDefault();
      }
      else if (e.type === 'mouseup' || e.type === 'touchend') {
        if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
				  thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
			  }
      }
      else if (e.type === 'keydown') {
	  		// Home
  			if (e.which === 36) {
		  		thisObj.trackImmediatelyTo(0);
			  }
        // End
        else if (e.which === 35) {
				  thisObj.trackImmediatelyTo(thisObj.duration);
			  }
        // Left arrow or down arrow
        else if (e.which === 37 || e.which === 40) {
				  thisObj.arrowKeyDown(-1);
			  }
        // Right arrow or up arrow
        else if (e.which === 39 || e.which === 38) {
				  thisObj.arrowKeyDown(1);
			  }
        // Page up
        else if (e.which === 33 && bigInterval > 0) {
				  thisObj.arrowKeyDown(bigInterval);
			  }
        // Page down
        else if (e.which === 34 && bigInterval > 0) {
				  thisObj.arrowKeyDown(-bigInterval);
			  }
        else {
				  return;
			  }
        e.preventDefault();
      }
      else if (e.type === 'keyup') {
  			if (e.which >= 33 && e.which <= 40) {
	  			if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
		  			thisObj.stopTracking(thisObj.keyTrackPosition);
          }
          e.preventDefault();
			  }
      }
      if (e.type !== 'mouseup' && e.type !== 'keydown' && e.type !== 'keydown') {
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
		}
		else {
			this.nextStep = 1;
			this.inertiaCount = 0;
			this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
			this.startTracking('keyboard', this.keyTrackPosition);
			this.trackHeadAtPosition(this.keyTrackPosition);
		}
	};
/*
	AccessibleSlider.prototype.pageUp = function (multiplier) {
		if (this.tracking && this.trackDevice === 'keyboard') {
			this.keyTrackPosition = this.boundPos(this.keyTrackPosition + (this.nextStep * multiplier));
			this.inertiaCount += 1;
			if (this.inertiaCount === 20) {
				this.inertiaCount = 0;
				this.nextStep *= 2;
			}
			this.trackHeadAtPosition(this.keyTrackPosition);
		}
		else {
			this.nextStep = 1;
			this.inertiaCount = 0;
			this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
			this.startTracking('keyboard', this.keyTrackPosition);
			this.trackHeadAtPosition(this.keyTrackPosition);
		}
	};
*/
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
		this.refreshTooltip();
		this.resizeDivs();
		this.updateAriaValues(position, updateLive);
	}

	// TODO: Native HTML5 can have several buffered segments, and this actually happens quite often.	Change this to display them all.
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
		}
		else if (pMinutes > 0) {
			descriptionText	 = pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		}
		else {
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
			}
			else {
  		  this.timeTooltip.text(this.positionToStr(this.position));
			}
			this.setTooltipPosition(this.seekHead.position().left + (this.seekHead.width() / 2));
		}
		else if (this.overBody && this.overBodyMousePos) {
			this.timeTooltip.show();
			this.timeTooltip.text(this.positionToStr(this.pageXToPosition(this.overBodyMousePos.x)));
			this.setTooltipPosition(this.overBodyMousePos.x - this.bodyDiv.offset().left);
		}
		else {
			this.timeTooltip.hide();
		}
	};

	AccessibleSlider.prototype.setTooltipPosition = function (x) {
		this.timeTooltip.css({
			left: x - (this.timeTooltip.width() / 2) - 10,
			bottom: this.seekHead.height() + 10
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
		}
		else {
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
    }
    else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover'|| e.type=='mouseout' || e.type=='mouseenter' || e.type=='mouseleave') {
      out.x = e.pageX;
      out.y = e.pageY;
    }
    return out;
  };

})(jQuery);

(function ($) {

	AblePlayer.prototype.addVolumeSlider = function($div) {

		// input type="range" requires IE10 and later
		// and still isn't supported by Opera Mini as of v8
		// Also, vertical orientation of slider requires CSS hacks
		// and causes problems in some screen readers
		// Therefore, building a custom vertical volume slider
		var thisObj, volumeSliderId, volumeHelpId, x, y, volumePct;

		thisObj = this;

		// define a few variables
		volumeSliderId = this.mediaId + '-volume-slider';
		volumeHelpId = this.mediaId + '-volume-help';
		this.volumeTrackHeight = 50; // must match CSS height for .able-volume-slider
		this.volumeHeadHeight = 7; // must match CSS height for .able-volume-head
		this.volumeTickHeight = this.volumeTrackHeight / 10;

		this.$volumeSlider = $('<div>',{
			'id': volumeSliderId,
			'class': 'able-volume-slider',
			'aria-hidden': 'true'
		}).hide();
		this.$volumeSliderTooltip = $('<div>',{
			'class': 'able-tooltip',
			'role': 'tooltip'
		}).hide();
		this.$volumeSliderTrack = $('<div>',{
			'class': 'able-volume-track'
		});
		this.$volumeSliderTrackOn = $('<div>',{
			'class': 'able-volume-track able-volume-track-on'
		});
		this.$volumeSliderHead = $('<div>',{
			'class': 'able-volume-head',
			'role': 'slider',
			'aria-orientation': 'vertical',
			'aria-label': this.tt.volumeUpDown,
			'aria-valuemin': 0,
			'aria-valuemax': 10,
			'aria-valuenow': this.volume,
			'tabindex': -1
		});
		this.$volumeSliderTrack.append(this.$volumeSliderTrackOn,this.$volumeSliderHead);
		this.$volumeAlert = $('<div>',{
			'class': 'able-offscreen',
			'aria-live': 'assertive',
			'aria-atomic': 'true'
		});
		volumePct = parseInt(thisObj.volume) / 10 * 100;
		this.$volumeHelp = $('<div>',{
			'id': volumeHelpId,
			'class': 'able-volume-help'
		}).text(volumePct + '%, ' + this.tt.volumeHelp);
		this.$volumeButton.attr({
			'aria-describedby': volumeHelpId
		});
		this.$volumeSlider.append(this.$volumeSliderTooltip,this.$volumeSliderTrack,this.$volumeAlert,this.$volumeHelp)
		$div.append(this.$volumeSlider);
		this.refreshVolumeSlider(this.volume);

		// add event listeners
		this.$volumeSliderHead.on('mousedown',function (e) {
			e.preventDefault(); // prevent text selection (implications?)
			thisObj.draggingVolume = true;
			thisObj.volumeHeadPositionTop = $(this).offset().top;
		});

		// prevent dragging after mouseup as mouseup not detected over iframe (YouTube)
		this.$mediaContainer.on('mouseover',function (e) {
			if(thisObj.player == 'youtube'){
				thisObj.draggingVolume = false;
			}
		});

		$(document).on('mouseup',function (e) {
			thisObj.draggingVolume = false;
		});

		$(document).on('mousemove',function (e) {
			if (thisObj.draggingVolume) {
				x = e.pageX;
				y = e.pageY;
				thisObj.moveVolumeHead(y);
			}
		});

		this.$volumeSliderHead.on('keydown',function (e) {

			// Left arrow or down arrow
			if (e.which === 37 || e.which === 40) {
				thisObj.handleVolume('down');
			}
			// Right arrow or up arrow
			else if (e.which === 39 || e.which === 38) {
				thisObj.handleVolume('up');
			}
			// Escape key or Enter key or Tab key
			else if (e.which === 27 || e.which === 13 || e.which === 9) {
				// close popup
				if (thisObj.$volumeSlider.is(':visible')) {
  				thisObj.closingVolume = true; // stopgap
					thisObj.hideVolumePopup();
				}
				else {
  				if (!thisObj.closingVolume) {
  					thisObj.showVolumePopup();
  				}
				}
			}
			else {
				return;
			}
			e.preventDefault();
		});
	};

	AblePlayer.prototype.refreshVolumeSlider = function(volume) {

		// adjust slider position based on current volume
		var volumePct, volumePctText;
		volumePct = (volume/10) * 100;
		volumePctText = volumePct + '%';

		var trackOnHeight, trackOnTop, headTop;
		trackOnHeight = volume * this.volumeTickHeight;
		trackOnTop = this.volumeTrackHeight - trackOnHeight;
		headTop = trackOnTop - this.volumeHeadHeight;

    if (this.$volumeSliderTrackOn) {
  		this.$volumeSliderTrackOn.css({
	  		'height': trackOnHeight + 'px',
        'top': trackOnTop + 'px'
		  });
		}
		if (this.$volumeSliderHead) {
      this.$volumeSliderHead.attr({
			  'aria-valuenow': volume,
        'aria-valuetext': volumePctText
		  });
      this.$volumeSliderHead.css({
			  'top': headTop + 'px'
		  });
		}
		if (this.$volumeAlert) {
  		this.$volumeAlert.text(volumePct + '%');
    }
	};

	AblePlayer.prototype.refreshVolumeButton = function(volume) {

		var volumeName, volumePct, volumeLabel, volumeIconClass, volumeImg, newSvgData;

		volumeName = this.getVolumeName(volume);
		volumePct = (volume/10) * 100;
		volumeLabel = this.tt.volume + ' ' + volumePct + '%';

		if (this.iconType === 'font') {
			volumeIconClass = 'icon-volume-' + volumeName;
			this.$volumeButton.find('span').first().removeClass().addClass(volumeIconClass);
			this.$volumeButton.find('span.able-clipped').text(volumeLabel);
		}
		else if (this.iconType === 'image') {
			volumeImg = this.imgPath + 'volume-' + volumeName + '.png';
			this.$volumeButton.find('img').attr('src',volumeImg);
		}
		else if (this.iconType === 'svg') {
  		if (volumeName !== 'mute') {
    		volumeName = 'volume-' + volumeName;
      }
		  newSvgData = this.getSvgData(volumeName);
      this.$volumeButton.find('svg').attr('viewBox',newSvgData[0]);
      this.$volumeButton.find('path').attr('d',newSvgData[1]);
    }
	};

	AblePlayer.prototype.moveVolumeHead = function(y) {

		// y is current position after mousemove
		var diff, direction, ticksDiff, newVolume, maxedOut;

		var diff = this.volumeHeadPositionTop - y;

		// only move the volume head if user had dragged at least one tick
		// this is more efficient, plus creates a "snapping' effect
		if (Math.abs(diff) > this.volumeTickHeight) {
			if (diff > 0) {
				direction = 'up';
			}
			else {
				direction = 'down';
			}
			if (direction == 'up' && this.volume == 10) {
				// can't go any higher
				return;
			}
			else if (direction == 'down' && this.volume == 0) {
				// can't go any lower
				return;
			}
			else {
				ticksDiff = Math.round(Math.abs(diff) / this.volumeTickHeight);
				if (direction == 'up') {
					newVolume = this.volume + ticksDiff;
					if (newVolume > 10) {
						newVolume = 10;
					}
				}
				else { // direction is down
					newVolume = this.volume - ticksDiff;
					if (newVolume < 0) {
						newVolume = 0;
					}
				}
				this.setVolume(newVolume); // this.volume will be updated after volumechange event fires (event.js)
				this.refreshVolumeSlider(newVolume);
				this.refreshVolumeButton(newVolume);
				this.volumeHeadPositionTop = y;
			}
		}
	};

	AblePlayer.prototype.handleVolume = function(direction) {

		// 'direction is either 'up','down', or an ASCII key code 49-57 (numeric keys 1-9)
		// Action: calculate and change the volume
		// Don't change this.volume and this.volumeButton yet - wait for 'volumechange' event to fire (event.js)

		// If NO direction is provided, user has just clicked on the Volume button
		// Action: show slider
		var volume;

		if (typeof direction === 'undefined') {
			if (this.$volumeSlider.is(':visible')) {
				this.hideVolumePopup();
			}
			else {
        if (!this.closingVolume) {
  				this.showVolumePopup();
        }
			}
			return;
		}

		if (direction >= 49 && direction <= 57) {
			volume = direction - 48;
		}
		else {

			volume = this.getVolume();

			if (direction === 'up' && volume < 10) {
				volume += 1;
			}
			else if (direction === 'down' && volume > 0) {
				volume -= 1;
			}
		}

		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		}
		else if (volume === 0) {
			this.setMute(true);
		}
		else {
			this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
			this.refreshVolumeSlider(volume);
			this.refreshVolumeButton(volume);
		}
	};

	AblePlayer.prototype.handleMute = function() {

		if (this.isMuted()) {
			this.setMute(false);
		}
		else {
			this.setMute(true);
		}
	};

	AblePlayer.prototype.showVolumePopup = function() {

		this.closePopups();
		this.$tooltipDiv.hide();
		this.$volumeSlider.show().attr('aria-hidden','false');
		this.$volumeButton.attr('aria-expanded','true');
		this.$volumeSliderHead.attr('tabindex','0').focus();
	};

	AblePlayer.prototype.hideVolumePopup = function() {

    var thisObj = this;

		this.$volumeSlider.hide().attr('aria-hidden','true');
		this.$volumeSliderHead.attr('tabindex','-1');
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
		}
		else if (this.player === 'jw' && this.jwPlayer) {
			return this.jwPlayer.getMute();
		}
		else if (this.player === 'youtube') {
			return this.youTubePlayer.isMuted();
		}
	};

	AblePlayer.prototype.setMute = function(mute) {

		// mute is either true (muting) or false (unmuting)
		if (mute) {
			// save current volume so it can be restored after unmute
			this.lastVolume = this.volume;
			this.volume = 0;
		}
		else { // restore to previous volume
			if (typeof this.lastVolume !== 'undefined') {
				this.volume = this.lastVolume;
			}
		}

		if (this.player === 'html5') {
			this.media.muted = mute;
		}
		else if (this.player === 'jw' && this.jwPlayer) {
			this.jwPlayer.setMute(mute);
		}
		else if (this.player === 'youtube') {
			if (mute) {
				this.youTubePlayer.mute();
			}
			else {
				this.youTubePlayer.unMute();
			}
		}
		this.refreshVolumeSlider(this.volume);
		this.refreshVolumeButton(this.volume);
	};

	AblePlayer.prototype.setVolume = function (volume) {

		// volume is 1 to 10
		// convert as needed depending on player

		if (this.player === 'html5') {
			// volume is 0 to 1
			this.media.volume = volume / 10;
			if (this.hasSignLanguage && this.signVideo) {
				this.signVideo.volume = 0; // always mute
			}
		}
		else if (this.player === 'youtube') {
			// volume is 0 to 100
			this.youTubePlayer.setVolume(volume * 10);
			this.volume = volume;
		}
		else if (this.player === 'vimeo') {
			// volume is 0 to 1
			this.vimeoPlayer.setVolume(volume / 10).then(function() {
				// setVolume finished.
				// could do something here
				// successful completion also fires a 'volumechange' event (see event.js)
			});
		}
		else if (this.player === 'jw' && this.jwPlayer) {
			// volume is 0 to 100
			this.jwPlayer.setVolume(volume * 10);
		}
		this.lastVolume = volume;
	};

	AblePlayer.prototype.getVolume = function (volume) {

		// return volume using common audio control scale 1 to 10
		if (this.player === 'html5') {
			// uses 0 to 1 scale
			return this.media.volume * 10;
		}
		else if (this.player === 'youtube') {
			// uses 0 to 100 scale
			return this.youTubePlayer.getVolume() / 10;
		}
		if (this.player === 'vimeo') {
			// uses 0 to 1 scale
			// this.vimeoPlayer.getVolume() takes too long to resolve with a value
			// Just use variable that's already been defined (should be the same value anyway)
			return this.volume;
		}
		else if (this.player === 'jw' && this.jwPlayer) {
			// uses 0 to 100 scale
			return this.jwPlayer.getVolume() / 10;
		}
	};

	AblePlayer.prototype.getVolumeName = function (volume) {

		// returns 'mute','soft','medium', or 'loud' depending on volume level
		if (volume == 0) {
			return 'mute';
		}
		else if (volume == 10) {
			return 'loud';
		}
		else if (volume < 5) {
			return 'soft';
		}
		else {
			return 'medium';
		}
	};

})(jQuery);

(function ($) {
	var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

	// Based on the incredible accessible modal dialog.
	window.AccessibleDialog = function(modalDiv, $returnElement, dialogRole, title, $descDiv, closeButtonLabel, width, fullscreen, escapeHook) {

		this.title = title;
		this.closeButtonLabel = closeButtonLabel;
		this.focusedElementBeforeModal = $returnElement;
		this.escapeHook = escapeHook;
		this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
		var thisObj = this;
		var modal = modalDiv;
		this.modal = modal;
		modal.css({
			'width': width || '50%',
			'top': (fullscreen ? '0' : '5%')
		});
		modal.addClass('able-modal-dialog');

		if (!fullscreen) {
			var closeButton = $('<button>',{
				 'class': 'modalCloseButton',
				 'title': thisObj.closeButtonLabel,
				 'aria-label': thisObj.closeButtonLabel
			}).text('X');
			closeButton.keydown(function (e) {
				// Space key down
				if (e.which === 32) {
					thisObj.hide();
				}
			}).click(function () {
				thisObj.hide();
			});

			var titleH1 = $('<h1></h1>');
			titleH1.attr('id', 'modalTitle-' + this.baseId);
			titleH1.css('text-align', 'center');
			titleH1.text(title);

			$descDiv.attr('id', 'modalDesc-' + this.baseId);

			modal.attr({
				'aria-labelledby': 'modalTitle-' + this.baseId,
				'aria-describedby': 'modalDesc-' + this.baseId
			});
			modal.prepend(titleH1);
			modal.prepend(closeButton);
		}

		modal.attr({
			'aria-hidden': 'true',
			'role': dialogRole
		});

		modal.keydown(function (e) {
			// Escape
			if (e.which === 27) {
				if (thisObj.escapeHook) {
					thisObj.escapeHook(e, this);
				}
				else {
					thisObj.hide();
					e.preventDefault();
				}
			}
			// Tab
			else if (e.which === 9) {
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
						focusable.get(focusable.length - 1).focus();
						e.preventDefault();
					}
				}
				else {
					if (currentIndex === focusable.length - 1) {
						focusable.get(0).focus();
						e.preventDefault();
					}
				}
			}
			e.stopPropagation();
		});

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('aria-hidden');
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
			});
		}

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('aria-hidden', 'true');

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
			thisObj.modal.find('button.modalCloseButton').first().focus();
		}, 300);
	};

	AccessibleDialog.prototype.hide = function () {
		if (this.overlay) {
			this.overlay.css('display', 'none');
		}
		this.modal.css('display', 'none');
		this.modal.attr('aria-hidden', 'true');
		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('aria-hidden');

		this.focusedElementBeforeModal.focus();
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

	AblePlayer.prototype.getNextHeadingLevel = function($element) {

		// Finds the nearest heading in the ancestor tree
		// Loops over each parent of the current element until a heading is found
		// If multiple headings are found beneath a given parent, get the closest
		// Returns an integer (1-6) representing the next available heading level

		var $parents, $foundHeadings, numHeadings, headingType, headingNumber;

		$parents = $element.parents();
		$parents.each(function(){
			$foundHeadings = $(this).children(':header');
			numHeadings = $foundHeadings.length;
			if (numHeadings) {
				headingType = $foundHeadings.eq(numHeadings-1).prop('tagName');
				return false;
			}
		});
		if (typeof headingType === 'undefined') {
			// page has no headings
			headingNumber = 1;
		}
		else {
			// Increment closest heading by one if less than 6.
			headingNumber = parseInt(headingType[1]);
			headingNumber += 1;
			if (headingNumber > 6) {
				headingNumber = 6;
			}
		}
		return headingNumber;
	};

	AblePlayer.prototype.countProperties = function(obj) {

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

	AblePlayer.prototype.formatSecondsAsColonTime = function (seconds, showFullTime) {

		// Takes seconds and converts to string of form hh:mm:ss
		// If showFullTime is true, shows 00 for hours if time is less than an hour
		//	 and show milliseconds	(e.g., 00:00:04.123 as in Video Track Sorter)
		// Otherwise, omits empty hours and milliseconds (e.g., 00:04 as in timer on controller)

		var dHours, dMinutes, dSeconds,
				parts, milliSeconds, numShort, i;

		if (showFullTime) {
			// preserve milliseconds, if included in seconds
			parts = seconds.toString().split('.');
			if (parts.length === 2) {
				milliSeconds = parts[1];
				if (milliSeconds.length < 3) {
					numShort = 3 - milliSeconds.length;
					for (i=1; i <= numShort; i++) {
						milliSeconds += '0';
					}
				}
			}
			else {
				milliSeconds = '000';
			}
		}
		dHours = Math.floor(seconds / 3600);
		dMinutes = Math.floor(seconds / 60) % 60;
		dSeconds = Math.floor(seconds % 60);
		if (dSeconds < 10) {
			dSeconds = '0' + dSeconds;
		}
		if (dHours > 0) {
			if (dMinutes < 10) {
				dMinutes = '0' + dMinutes;
			}
			if (showFullTime) {
				return dHours + ':' + dMinutes + ':' + dSeconds + '.' + milliSeconds;
			}
			else {
				return dHours + ':' + dMinutes + ':' + dSeconds;
			}
		}
		else {
			if (showFullTime) {
				if (dHours < 1) {
					dHours = '00';
				}
				else if (dHours < 10) {
					dHours = '0' + dHours;
				}
				if (dMinutes < 1) {
					dMinutes = '00';
				}
				else if (dMinutes < 10) {
					dMinutes = '0' + dMinutes;
				}
				return dHours + ':' + dMinutes + ':' + dSeconds + '.' + milliSeconds;
			}
			else {
				return dMinutes + ':' + dSeconds;
			}
		}
	};

	AblePlayer.prototype.getSecondsFromColonTime = function (timeStr) {

		// Converts string of form hh:mm:ss to seconds
		var timeParts, hours, minutes, seconds, newTime;

		timeParts = timeStr.split(':');
		if (timeParts.length === 3) {
			hours = parseInt(timeParts[0]);
			minutes = parseInt(timeParts[1]);
			seconds = parseFloat(timeParts[2]);
			return ((hours * 3600) + (minutes * 60) + (seconds));
		}
		else if (timeParts.length === 2) {
			minutes = parseInt(timeParts[0]);
			seconds = parseFloat(timeParts[1]);
			return ((minutes * 60) + (seconds));
		}
		else if (timeParts.length === 1) {
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
		return Number(Math.floor(value+'e'+decimals)+'e-'+decimals);
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
		}
		else {
			 return false;
		}
	};

	Number.isInteger = Number.isInteger || function(value) {

		// polyfill for IE11, which doesn't otherwise support Number.isInteger
		// https://stackoverflow.com/a/31720368/744281
		return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
	};

})(jQuery);

(function ($) {
	AblePlayer.prototype.initDescription = function() {

		// set default mode for delivering description (open vs closed)
		// based on availability and user preference

		// called when player is being built, or when a user
		// toggles the Description button or changes a description-related preference
		// In the latter two scendarios, this.refreshingDesc == true via control.js > handleDescriptionToggle()

		// The following variables are applicable to delivery of description:
		// prefDesc == 1 if user wants description (i.e., Description button is on); else 0
		// prefDescFormat == either 'video' or 'text' (as of v4.0.10, prefDescFormat is always 'video')
		// prefDescPause == 1 to pause video when description starts; else 0
		// prefVisibleDesc == 1 to visibly show text-based description area; else 0
		// hasOpenDesc == true if a described version of video is available via data-desc-src attribute
		// hasClosedDesc == true if a description text track is available
		// this.useDescFormat == either 'video' or 'text'; the format ultimately delivered
		// descOn == true if description of either type is on
		// exposeTextDescriptions == true if text description is to be announced audibly; otherwise false

		var thisObj = this;
    if (this.refreshingDesc) {
		  this.prevDescFormat = this.useDescFormat;
    }
		else {
			// this is the initial build
			// first, check to see if there's an open-described version of this video
			// checks only the first source since if a described version is provided,
			// it must be provided for all sources
			this.descFile = this.$sources.first().attr('data-desc-src');
			if (typeof this.descFile !== 'undefined') {
				this.hasOpenDesc = true;
			}
			else {
				// there's no open-described version via data-desc-src,
				// but what about data-youtube-desc-src or data-vimeo-desc-src?
				if (this.youTubeDescId || this.vimeoDescId) {
					this.hasOpenDesc = true;
				}
				else { // there are no open-described versions from any source
					this.hasOpenDesc = false;
				}
			}
		}

		// update this.useDescFormat based on media availability & user preferences
		if (this.prefDesc) {
			if (this.hasOpenDesc && this.hasClosedDesc) {
				// both formats are available. Always use 'video'
				this.useDescFormat = this.prefDescFormat;
				this.descOn = true;
				// Do not pause during descriptions when playing described video
				this.prefDescPause = false;
			}
			else if (this.hasOpenDesc) {
				this.useDescFormat = 'video';
				this.descOn = true;
			}
			else if (this.hasClosedDesc) {
				this.useDescFormat = 'text';
				this.descOn = true;
			}
		}
		else { // description button is off
      this.useDescFormat = false;
			this.descOn = false;
		}

		if (this.useDescFormat === 'text') {
			// check whether browser supports the Web Speech API
			if (window.speechSynthesis) {
				// It does!
				this.synth = window.speechSynthesis;
				this.descVoices = this.synth.getVoices();
				// select the first voice that matches the track language
				// available languages are identified with local suffixes (e.g., en-US)
				// in case no matching voices are found, use the first voice in the voices array
				this.descVoiceIndex = 0;
				for (var i=0; i<this.descVoices.length; i++) {
					if (this.captionLang.length === 2) {
						// match only the first 2 characters of the lang code
						if (this.descVoices[i].lang.substr(0,2).toLowerCase() === this.captionLang.toLowerCase()) {
							this.descVoiceIndex = i;
							break;
						}
					}
					else {
						// match the entire lang code
						if (this.descVoices[i].lang.toLowerCase() === this.captionLang.toLowerCase()) {
							this.descVoiceIndex = i;
							break;
						}
					}
				}
			}
		}
		if (this.descOn) {
			if (this.useDescFormat === 'video') {
				if (!this.usingAudioDescription()) {
					// switched from non-described to described version
					this.swapDescription();
				}
			}
			if (this.hasClosedDesc) {
				if (this.prefVisibleDesc) {
  				// make description text visible
  				// New in v4.0.10: Do this regardless of useDescFormat
  				this.$descDiv.show();
					this.$descDiv.removeClass('able-clipped');
				}
				else {
  				// keep it visible to screen readers, but hide it visibly
					this.$descDiv.addClass('able-clipped');
				}
				if (!this.swappingSrc) {
					this.showDescription(this.elapsed);
				}
			}
		}
		else { // description is off.
			if (this.prevDescFormat === 'video') { // user was previously using description via video
				if (this.usingAudioDescription()) {
					this.swapDescription();
				}
			}
			else if (this.prevDescFormat === 'text') { // user was previously using text description
				// hide description div from everyone, including screen reader users
				this.$descDiv.hide();
				this.$descDiv.removeClass('able-clipped');
			}
		}
		this.refreshingDesc = false;
	};

	// Returns true if currently using audio description, false otherwise.
	AblePlayer.prototype.usingAudioDescription = function () {

		if (this.player === 'youtube') {
			return (this.activeYouTubeId === this.youTubeDescId);
		}
		else if (this.player === 'vimeo') {
			return (this.activeVimeoId === this.vimeoDescId);
		}
		else {
			return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
		}
	};

	AblePlayer.prototype.swapDescription = function() {
		// swap described and non-described source media, depending on which is playing
		// this function is only called in two circumstances:
		// 1. Swapping to described version when initializing player (based on user prefs & availability)
		// 2. User is toggling description
		var thisObj, i, origSrc, descSrc, srcType, newSource;

		thisObj = this;

		// get current time, and start new video at the same time
		// NOTE: There is some risk in resuming playback at the same start time
		// since the described version might include extended audio description (with pauses)
		// and might therefore be longer than the non-described version
		// The benefits though would seem to outweigh this risk

		this.swapTime = this.elapsed; // video will scrub to this time after loaded (see event.js)
		if (this.descOn) {
			// user has requested the described version
			this.showAlert(this.tt.alertDescribedVersion);
		}
		else {
			// user has requested the non-described version
			this.showAlert(this.tt.alertNonDescribedVersion);
		}
		if (this.player === 'html5') {

			if (this.usingAudioDescription()) {
				// the described version is currently playing. Swap to non-described
				for (i=0; i < this.$sources.length; i++) {
					// for all <source> elements, replace src with data-orig-src
					origSrc = this.$sources[i].getAttribute('data-orig-src');
					srcType = this.$sources[i].getAttribute('type');
					if (origSrc) {
						this.$sources[i].setAttribute('src',origSrc);
					}
				}
				// No need to check for this.initializing
				// This function is only called during initialization
				// if swapping from non-described to described
				this.swappingSrc = true;
			}
			else {
				// the non-described version is currently playing. Swap to described.
				for (i=0; i < this.$sources.length; i++) {
					// for all <source> elements, replace src with data-desc-src (if one exists)
					// then store original source in a new data-orig-src attribute
					origSrc = this.$sources[i].getAttribute('src');
					descSrc = this.$sources[i].getAttribute('data-desc-src');
					srcType = this.$sources[i].getAttribute('type');
					if (descSrc) {
						this.$sources[i].setAttribute('src',descSrc);
						this.$sources[i].setAttribute('data-orig-src',origSrc);
					}
				}
				this.swappingSrc = true;
			}

			// now reload the source file.
			if (this.player === 'html5') {
				this.media.load();
			}
		}
		else if (this.player === 'youtube') {

			if (this.usingAudioDescription()) {
				// the described version is currently playing. Swap to non-described
				this.activeYouTubeId = this.youTubeId;
				this.showAlert(this.tt.alertNonDescribedVersion);
			}
			else {
				// the non-described version is currently playing. Swap to described.
				this.activeYouTubeId = this.youTubeDescId;
				this.showAlert(this.tt.alertDescribedVersion);
			}
			if (typeof this.youTubePlayer !== 'undefined') {

				// retrieve/setup captions for the new video from YouTube
				this.setupAltCaptions().then(function() {

					if (thisObj.playing) {
						// loadVideoById() loads and immediately plays the new video at swapTime
						thisObj.youTubePlayer.loadVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
					}
					else {
						// cueVideoById() loads the new video and seeks to swapTime, but does not play
						thisObj.youTubePlayer.cueVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
					}
				});
			}
		}
		else if (this.player === 'vimeo') {
			if (this.usingAudioDescription()) {
				// the described version is currently playing. Swap to non-described
				this.activeVimeoId = this.vimeoId;
				this.showAlert(this.tt.alertNonDescribedVersion);
			}
			else {
				// the non-described version is currently playing. Swap to described.
				this.activeVimeoId = this.vimeoDescId;
				this.showAlert(this.tt.alertDescribedVersion);
			}
			// load the new video source
			this.vimeoPlayer.loadVideo(this.activeVimeoId).then(function() {

				if (thisObj.playing) {
					// video was playing when user requested an alternative version
					// seek to swapTime and continue playback (playback happens automatically)
					thisObj.vimeoPlayer.setCurrentTime(thisObj.swapTime);
				}
				else {
					// Vimeo autostarts immediately after video loads
					// The "Described" button should not trigger playback, so stop this before the user notices.
					thisObj.vimeoPlayer.pause();
				}
			});
		}
	};

	AblePlayer.prototype.showDescription = function(now) {

		// there's a lot of redundancy between this function and showCaptions
		// Trying to combine them ended up in a mess though. Keeping as is for now.

		if (this.swappingSrc || !this.descOn) {
			return;
		}

		var thisObj, i, cues, d, thisDescription, descText, msg;
		thisObj = this;

		var flattenComponentForDescription = function (component) {
			var result = [];
			if (component.type === 'string') {
				result.push(component.value);
			}
			else {
				for (var i = 0; i < component.children.length; i++) {
					result.push(flattenComponentForDescription(component.children[i]));
				}
			}
			return result.join('');
		};

		if (this.selectedDescriptions) {
			cues = this.selectedDescriptions.cues;
		}
		else if (this.descriptions.length >= 1) {
			cues = this.descriptions[0].cues;
		}
		else {
			cues = [];
		}
		for (d = 0; d < cues.length; d++) {
			if ((cues[d].start <= now) && (cues[d].end > now)) {
				thisDescription = d;
				break;
			}
		}
		if (typeof thisDescription !== 'undefined') {
			if (this.currentDescription !== thisDescription) {
				// temporarily remove aria-live from $status in order to prevent description from being interrupted
				this.$status.removeAttr('aria-live');
				descText = flattenComponentForDescription(cues[thisDescription].components);
				if (
  				this.exposeTextDescriptions &&
				  typeof this.synth !== 'undefined' &&
          typeof this.descVoiceIndex !== 'undefined') {
					// browser supports speech synthesis and a voice has been selected in initDescription()
					// use the web speech API
					msg = new SpeechSynthesisUtterance();
					msg.voice = this.descVoices[this.descVoiceIndex]; // Note: some voices don't support altering params
					msg.voiceURI = 'native';
					msg.volume = 1; // 0 to 1
					msg.rate = 1.5; // 0.1 to 10 (1 is normal human speech; 2 is fast but easily decipherable; anything above 2 is blazing fast)
					msg.pitch = 1; //0 to 2
					msg.text = descText;
					msg.lang = this.captionLang;
					msg.onend = function(e) {
						// NOTE: e.elapsedTime might be useful
						if (thisObj.pausedForDescription) {
							thisObj.playMedia();
						}
      		};
					this.synth.speak(msg);
					if (this.prefVisibleDesc) {
						// write description to the screen for sighted users
						// but remove ARIA attributes since it isn't intended to be read by screen readers
						this.$descDiv.html(descText).removeAttr('aria-live aria-atomic');
					}
				}
				else {
					// browser does not support speech synthesis
					// load the new description into the container div for screen readers to read
					this.$descDiv.html(descText);
				}
				if (this.prefDescPause && this.exposeTextDescriptions) {
					this.pauseMedia();
					this.pausedForDescription = true;
				}
				this.currentDescription = thisDescription;
			}
		}
		else {
			this.$descDiv.html('');
			this.currentDescription = -1;
			// restore aria-live to $status
			this.$status.attr('aria-live','polite');
		}
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.getUserAgent = function() {

		// Whenever possible we avoid browser sniffing. Better to do feature detection.
		// However, in case it's needed...
		// this function defines a userAgent array that can be used to query for common browsers and OSs
		// NOTE: This would be much simpler with jQuery.browser but that was removed from jQuery 1.9
		// http://api.jquery.com/jQuery.browser/
		this.userAgent = {};
		this.userAgent.browser = {};

		// Test for common browsers
		if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)){ //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
			this.userAgent.browser.name = 'Firefox';
			this.userAgent.browser.version = RegExp.$1; // capture x.x portion
		}
		else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) { //test for MSIE x.x (IE10 or lower)
			this.userAgent.browser.name = 'Internet Explorer';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/Trident.*rv[ :]*(\d+\.\d+)/.test(navigator.userAgent)) { // test for IE11 or higher
			this.userAgent.browser.name = 'Internet Explorer';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/Edge[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { // test for MS Edge
			this.userAgent.browser.name = 'Edge';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/OPR\/(\d+\.\d+)/i.test(navigator.userAgent)) { // Opera 15 or over
			this.userAgent.browser.name = 'Opera';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
			this.userAgent.browser.name = 'Chrome';
			if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
				this.userAgent.browser.version = RegExp.$1;
			}
		}
		else if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
			this.userAgent.browser.name = 'Safari';
			if (/Version[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
				this.userAgent.browser.version = RegExp.$1;
			}
		}
		else {
			this.userAgent.browser.name = 'Unknown';
			this.userAgent.browser.version = 'Unknown';
		}

		// Now test for common operating systems
		if (window.navigator.userAgent.indexOf("Windows NT 6.2") != -1) {
			this.userAgent.os = "Windows 8";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 6.1") != -1) {
			this.userAgent.os = "Windows 7";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 6.0") != -1) {
			this.userAgent.os = "Windows Vista";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 5.1") != -1) {
			this.userAgent.os = "Windows XP";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 5.0") != -1) {
			this.userAgent.os = "Windows 2000";
		}
		else if (window.navigator.userAgent.indexOf("Mac")!=-1) {
			this.userAgent.os = "Mac/iOS";
		}
		else if (window.navigator.userAgent.indexOf("X11")!=-1) {
			this.userAgent.os = "UNIX";
		}
		else if (window.navigator.userAgent.indexOf("Linux")!=-1) {
			this.userAgent.os = "Linux";
		}
		if (this.debug) {
			
			
			
			
			
		}
	};

	AblePlayer.prototype.isUserAgent = function(which) {

		var userAgent = navigator.userAgent.toLowerCase();
		if (this.debug) {
			
		}
		if (userAgent.indexOf(which.toLowerCase()) !== -1) {
			return true;
		}
		else {
			return false;
		}
	};

	AblePlayer.prototype.isIOS = function(version) {

		// return true if this is IOS
		// if version is provided check for a particular version

		var userAgent, iOS;

		userAgent = navigator.userAgent.toLowerCase();
		iOS = /ipad|iphone|ipod/.exec(userAgent);
		if (iOS) {
			if (typeof version !== 'undefined') {
				if (userAgent.indexOf('os ' + version) !== -1) {
					// this is the target version of iOS
					return true;
				}
				else {
					return false;
				}
			}
			else {
				// no version was specified
				return true;
			}
		}
		else {
			// this is not IOS
			return false;
		}
	};

	AblePlayer.prototype.browserSupportsVolume = function() {

		// ideally we could test for volume support
		// However, that doesn't seem to be reliable
		// http://stackoverflow.com/questions/12301435/html5-video-tag-volume-support

		var userAgent, noVolume;

		userAgent = navigator.userAgent.toLowerCase();
		noVolume = /ipad|iphone|ipod|android|blackberry|windows ce|windows phone|webos|playbook/.exec(userAgent);
		if (noVolume) {
			if (noVolume[0] === 'android' && /firefox/.test(userAgent)) {
				// Firefox on android DOES support changing the volume:
				return true;
			}
			else {
				return false;
			}
		}
		else {
			// as far as we know, this userAgent supports volume control
			return true;
		}
	};

	AblePlayer.prototype.nativeFullscreenSupported = function () {

		return document.fullscreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.mozFullScreenEnabled ||
			document.msFullscreenEnabled;
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
				if (this.hasSignLanguage && this.signVideo) {
					// keep sign languge video in sync
					this.signVideo.currentTime = this.startTime;
				}
			}
		}
		else if (this.player === 'youtube') {
			this.youTubePlayer.seekTo(newTime,true);
			if (newTime > 0) {
				if (typeof this.$posterImg !== 'undefined') {
					this.$posterImg.hide();
				}
			}
		}
		else if (this.player === 'vimeo') {
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

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;
		if (typeof duration !== 'undefined' && typeof elapsed !== 'undefined') {
			mediaTimes['duration'] = duration;
			mediaTimes['elapsed'] = elapsed;
			deferred.resolve(mediaTimes);
		}
		else {
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

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				 this.vimeoPlayer.getDuration().then(function(duration) {
					if (duration === undefined || isNaN(duration) || duration === -1) {
						deferred.resolve(0);
					}
					else {
						deferred.resolve(duration);
					}
				});
			}
			else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		}
		else {
			var duration;
			if (this.player === 'html5') {
				duration = this.media.duration;
			}
			else if (this.player === 'youtube') {
				if (this.youTubePlayer) {
					duration = this.youTubePlayer.getDuration();
				}
				else { // the YouTube player hasn't initialized yet
					duration = 0;
				}
			}
			if (duration === undefined || isNaN(duration) || duration === -1) {
				deferred.resolve(0);
			}
			else {
				deferred.resolve(duration);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getElapsed = function () {

		// returns elapsed time of the current media, expressed in seconds
		// function is called by getMediaTimes, and return value is sanitized there

		var deferred, promise, thisObj;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				this.vimeoPlayer.getCurrentTime().then(function(elapsed) {
					if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
						deferred.resolve(0);
					}
					else {
						deferred.resolve(elapsed);
					}
				});
			}
			else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		}
		else {
			var elapsed;
			if (this.player === 'html5') {
				elapsed = this.media.currentTime;
			}
			else if (this.player === 'youtube') {
				if (this.youTubePlayer) {
					elapsed = this.youTubePlayer.getCurrentTime();
				}
				else { // the YouTube player hasn't initialized yet
					elapsed = 0;
				}
			}
			if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
				deferred.resolve(0);
			}
			else {
				deferred.resolve(elapsed);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getPlayerState = function () {

		// Returns one of the following states:
		//	'stopped' - Not yet played for the first time, or otherwise reset to unplayed.
		//	'ended' - Finished playing.
		//	'paused' - Not playing, but not stopped or ended.
		//	'buffering' - Momentarily paused to load, but will resume once data is loaded.
		//	'playing' - Currently playing.

		// Commented out the following in 3.2.1 - not sure of its intended purpose
		// It can be useful to know player state even when swapping src
		// and the overhead is seemingly minimal
		/*
		if (this.swappingSrc) {
			return;
		}
		*/
		var deferred, promise, thisObj, duration, elapsed;
		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'html5') {
			if (this.media.ended) {
				deferred.resolve('ended');
			}
			else if (this.media.paused) {
  		  deferred.resolve('paused');
			}
			else if (this.media.readyState !== 4) {
				deferred.resolve('buffering');
			}
			else {
				deferred.resolve('playing');
			}
		}
		else if (this.player === 'youtube' && this.youTubePlayer) {
			var state = this.youTubePlayer.getPlayerState();
			if (state === -1 || state === 5) {
				deferred.resolve('stopped');
			}
			else if (state === 0) {
				deferred.resolve('ended');
			}
			else if (state === 1) {
				deferred.resolve('playing');
			}
			else if (state === 2) {
				deferred.resolve('paused');
			}
			else if (state === 3) {
				deferred.resolve('buffering');
			}
		}
		else if (this.player === 'vimeo' && this.vimeoPlayer) {
				// curiously, Vimeo's API has no getPlaying(), getBuffering(), or getState() methods
			// so maybe if it's neither paused nor ended, it must be playing???
			this.vimeoPlayer.getPaused().then(function(paused) {
				if (paused) {
					deferred.resolve('paused');
				}
				else {
					thisObj.vimeoPlayer.getEnded().then(function(ended) {
						if (ended) {
							deferred.resolve('ended');
						}
						else {
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
			if (this.media.playbackRate) {
				return true;
			}
			else {
				return false;
			}
		}
		else if (this.player === 'youtube') {
			// Youtube supports varying playback rates per video.	 Only expose controls if more than one playback rate is available.
			if (this.youTubePlayer.getAvailablePlaybackRates().length > 1) {
				return true;
			}
			else {
				return false;
			}
		}
		else if (this.player === 'vimeo') {
			// since this takes longer to determine, it was set previously in initVimeoPlayer()
			return this.vimeoSupportsPlaybackRateChange;
		}
	};

	AblePlayer.prototype.setPlaybackRate = function (rate) {

		rate = Math.max(0.5, rate);
		if (this.player === 'html5') {
			this.media.playbackRate = rate;
		}
		else if (this.player === 'youtube') {
			this.youTubePlayer.setPlaybackRate(rate);
		}
		else if (this.player === 'vimeo') {
			this.vimeoPlayer.setPlaybackRate(rate);
		}
		if (this.hasSignLanguage && this.signVideo) {
			this.signVideo.playbackRate = rate;
		}
		this.playbackRate = rate;
		this.$speed.text(this.tt.speed + ': ' + rate.toFixed(2).toString() + 'x');
	};

	AblePlayer.prototype.getPlaybackRate = function () {

		if (this.player === 'html5') {
			return this.media.playbackRate;
		}
		else if (this.player === 'youtube') {
			return this.youTubePlayer.getPlaybackRate();
		}
	};

	AblePlayer.prototype.isPaused = function () {

		 // Note there are three player states that count as paused in this sense,
		// and one of them is named 'paused'.
		// A better name would be 'isCurrentlyNotPlayingOrBuffering'

		var state;

		if (this.player === 'vimeo') {
			// just rely on value of this.playing
			if (this.playing) {
				return false;
			}
			else {
				return true;
			}
		}
		else {
			this.getPlayerState().then(function(state) {
				// if any of the following is true, consider the media 'paused'
				return state === 'paused' || state === 'stopped' || state === 'ended';
			});
		}
	};

	AblePlayer.prototype.pauseMedia = function () {

		var thisObj = this;

		if (this.player === 'html5') {
			this.media.pause(true);
			if (this.hasSignLanguage && this.signVideo) {
				this.signVideo.pause(true);
			}
		}
		else if (this.player === 'youtube') {
			this.youTubePlayer.pauseVideo();
		}
		else if (this.player === 'vimeo') {
			this.vimeoPlayer.pause();
		}
	};

	AblePlayer.prototype.playMedia = function () {

		var thisObj = this;

		if (this.player === 'html5') {
			this.media.play(true);
			if (this.hasSignLanguage && this.signVideo) {
				this.signVideo.play(true);
			}
		}
		else if (this.player === 'youtube') {
			this.youTubePlayer.playVideo();
			if (typeof this.$posterImg !== 'undefined') {
				this.$posterImg.hide();
			}
			this.stoppingYouTube = false;
		}
		else if (this.player === 'vimeo') {
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

		// TODO: This still needs work.
		// After the player fades, it's replaced by an empty space
		// Would be better if the video and captions expanded to fill the void
		// Attempted to fade out to 0 opacity, then move the playerDiv offscreen
		// and expand the mediaContainer to fill the vacated space
		// However, my attempts to do this have been choppy and buggy
		// Code is preserved below and commented out

		var thisObj, mediaHeight, playerHeight, newMediaHeight;
		var thisObj = this;

		if (direction == 'out') {
			// get the original height of two key components:
			mediaHeight = this.$mediaContainer.height();
			playerHeight = this.$playerDiv.height();
			newMediaHeight = mediaHeight + playerHeight;

			// fade slowly to transparency
			this.$playerDiv.fadeTo(2000,0,function() {
				/*
				// when finished, position playerDiv offscreen
				// thisObj.$playerDiv.addClass('able-offscreen');
				// Expand the height of mediaContainer to fill the void (needs work)
				thisObj.$mediaContainer.animate({
					height: newMediaHeight
				},500);
				*/
			});
		}
		else if (direction == 'in') {
			// restore vidcapContainer to its original height (needs work)
			// this.$mediaContainer.removeAttr('style');
			// fade relatively quickly back to its original position with full opacity
			// this.$playerDiv.removeClass('able-offscreen').fadeTo(100,1);
			this.$playerDiv.fadeTo(100,1);
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

	AblePlayer.prototype.refreshControls = function(context, duration, elapsed) {

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

		var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
			updateLive, textByState, timestamp, widthUsed,
			leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
			buffered, newTop, statusBarHeight, speedHeight, statusBarWidthBreakpoint,
			newSvgData;

		thisObj = this;
		if (this.swappingSrc) {
  		if (this.playing) {
  			// wait until new source has loaded before refreshing controls
  			// can't wait if player is NOT playing because some critical events
  			// won't fire until playback of new media starts
        return;
		  }
		}

		if (context === 'timeline' || context === 'init') {
			// all timeline-related functionality requires both duration and elapsed
			if (typeof this.duration === 'undefined') {
			 	// wait until duration is known before proceeding with refresh
			 	return;
			}
			if (this.useChapterTimes) {
				this.chapterDuration = this.getChapterDuration();
				this.chapterElapsed = this.getChapterElapsed();
			}

      if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && this.duration > 0) {
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
						}
						else {
							this.seekBar.setDuration(this.chapterDuration);
						}
					}
					else {
						// this is not the last chapter
						this.seekBar.setDuration(this.chapterDuration);
					}
				}
				else {
					if (!(this.duration === undefined || isNaN(this.duration) || this.duration === -1)) {
						this.seekBar.setDuration(this.duration);
					}
				}
				if (!(this.seekBar.tracking)) {
					// Only update the aria live region if we have an update pending
					// (from a seek button control) or if the seekBar has focus.
					// We use document.activeElement instead of $(':focus') due to a strange bug:
					// 	When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
					updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
					this.liveUpdatePending = false;
					if (this.useChapterTimes) {
						this.seekBar.setPosition(this.chapterElapsed, updateLive);
					}
					else {
						this.seekBar.setPosition(this.elapsed, updateLive);
					}
				}

				// When seeking, display the seek bar time instead of the actual elapsed time.
				if (this.seekBar.tracking) {
					displayElapsed = this.seekBar.lastTrackPosition;
				}
				else {
					if (this.useChapterTimes) {
						displayElapsed = this.chapterElapsed;
					}
					else {
						displayElapsed = this.elapsed;
					}
				}
			}
			// update elapsed & duration
			if (typeof this.$durationContainer !== 'undefined') {
				if (this.useChapterTimes) {
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
				}
				else {
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
				  widthUsed = 0;
          leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
          rightControls = leftControls.next('div.able-right-controls');
          leftControls.children().each(function () {
					  if ($(this).attr('role')=='button') {
						  widthUsed += $(this).outerWidth(true); // true = include margin
					  }
				  });
          rightControls.children().each(function () {
					  if ($(this).attr('role')=='button') {
						  widthUsed += $(this).outerWidth(true);
					  }
				  });
          if (this.fullscreen) {
					  seekbarWidth = $(window).width() - widthUsed;
				  }
          else {
					  seekbarWidth = this.$ableWrapper.width() - widthUsed;
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
			if (this.player === 'html5') {
				if (this.media.buffered.length > 0) {
					buffered = this.media.buffered.end(0);
					if (this.useChapterTimes) {
						if (buffered > this.chapterDuration) {
							buffered = this.chapterDuration;
						}
						if (this.seekBar) {
							this.seekBar.setBuffered(buffered / this.chapterDuration);
						}
					}
					else {
						if (this.seekBar) {
              if (!isNaN(buffered)) {
  							this.seekBar.setBuffered(buffered / duration);
  						}
						}
					}
				}
			}
			else if (this.player === 'youtube') {
				if (this.seekBar) {
					this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
				}
			}
			else if (this.player === 'vimeo') {
				// TODO: Add support for Vimeo buffering update
			}
		} // end if context == 'timeline' or 'init'

		if (context === 'descriptions' || context == 'init'){

			if (this.$descButton) {
				if (this.descOn) {
					this.$descButton.removeClass('buttonOff').attr('aria-label',this.tt.turnOffDescriptions);
					this.$descButton.find('span.able-clipped').text(this.tt.turnOffDescriptions);
				}
				else {
					this.$descButton.addClass('buttonOff').attr('aria-label',this.tt.turnOnDescriptions);
					this.$descButton.find('span.able-clipped').text(this.tt.turnOnDescriptions);
				}
			}
		}

		if (context === 'captions' || context == 'init'){

			if (this.$ccButton) {

				captionsCount = this.captions.length;

				// Button has a different title depending on the number of captions.
				// If only one caption track, this is "Show captions" and "Hide captions"
				// Otherwise, it is just always "Captions"
				if (!this.captionsOn) {
					this.$ccButton.addClass('buttonOff');
					if (captionsCount === 1) {
						this.$ccButton.attr('aria-label',this.tt.showCaptions);
						this.$ccButton.find('span.able-clipped').text(this.tt.showCaptions);
					}
				}
				else {
					this.$ccButton.removeClass('buttonOff');
					if (captionsCount === 1) {
						this.$ccButton.attr('aria-label',this.tt.hideCaptions);
						this.$ccButton.find('span.able-clipped').text(this.tt.hideCaptions);
					}
				}

				if (captionsCount > 1) {
					this.$ccButton.attr({
						'aria-label': this.tt.captions,
						'aria-haspopup': 'true',
						'aria-controls': this.mediaId + '-captions-menu'
					});
					this.$ccButton.find('span.able-clipped').text(this.tt.captions);
				}
			}
		}

		if (context === 'fullscreen' || context == 'init'){

			if (this.$fullscreenButton) {
				if (!this.fullscreen) {
					this.$fullscreenButton.attr('aria-label', this.tt.enterFullScreen);
					if (this.iconType === 'font') {
						this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
						this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullScreen);
					}
					else if (this.iconType === 'svg') {
						newSvgData = this.getSvgData('fullscreen-expand');
						this.$fullscreenButton.find('svg').attr('viewBox',newSvgData[0]);
						this.$fullscreenButton.find('path').attr('d',newSvgData[1]);
					}
					else {
						this.$fullscreenButton.find('img').attr('src',this.fullscreenExpandButtonImg);
					}
				}
				else {
					this.$fullscreenButton.attr('aria-label',this.tt.exitFullScreen);
					if (this.iconType === 'font') {
						this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-expand').addClass('icon-fullscreen-collapse');
						this.$fullscreenButton.find('span.able-clipped').text(this.tt.exitFullScreen);
					}
					else if (this.iconType === 'svg') {
						newSvgData = this.getSvgData('fullscreen-collapse');
						this.$fullscreenButton.find('svg').attr('viewBox',newSvgData[0]);
						this.$fullscreenButton.find('path').attr('d',newSvgData[1]);
					}
					else {
						this.$fullscreenButton.find('img').attr('src',this.fullscreenCollapseButtonImg);
					}
				}
			}
		}
		if (context === 'playpause' || context == 'init'){
			if (typeof this.$bigPlayButton !== 'undefined' && typeof this.seekBar !== 'undefined') {
				// Choose show/hide for big play button and adjust position.
				if (this.paused && !this.seekBar.tracking) {
					if (!this.hideBigPlayButton) {
						this.$bigPlayButton.show();
					}
					if (this.fullscreen) {
						this.$bigPlayButton.width($(window).width());
						this.$bigPlayButton.height($(window).height());
					}
					else {
						this.$bigPlayButton.width(this.$mediaContainer.width());
						this.$bigPlayButton.height(this.$mediaContainer.height());
					}
				}
				else {
					this.$bigPlayButton.hide();
				}
			}
		}

		if (context === 'transcript' || context == 'init'){

			if (this.transcriptType) {
				// Sync checkbox and autoScrollTranscript with user preference
				if (this.prefAutoScrollTranscript === 1) {
					this.autoScrollTranscript = true;
					this.$autoScrollTranscriptCheckbox.prop('checked',true);
				}
				else {
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
					'aria-label': this.tt.chapters,
					'aria-haspopup': 'true',
					'aria-controls': this.mediaId + '-chapters-menu'
				});
			}
		}

		if (context === 'timeline' || context === 'playpause' || context === 'init') {

			// update status
			textByState = {
				'stopped': this.tt.statusStopped,
				'paused': this.tt.statusPaused,
				'playing': this.tt.statusPlaying,
				'buffering': this.tt.statusBuffering,
				'ended': this.tt.statusEnd
			};

			if (this.stoppingYouTube) {
				// stoppingYouTube is true temporarily while video is paused and seeking to 0
				// See notes in handleRestart()
				// this.stoppingYouTube will be reset when seek to 0 is finished (in event.js > onMediaUpdateTime())
				if (this.$status.text() !== this.tt.statusStopped) {
					this.$status.text(this.tt.statusStopped);
				}
				if (this.$playpauseButton.find('span').first().hasClass('icon-pause')) {
					if (this.iconType === 'font') {
						this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
						this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
					}
					else if (this.iconType === 'svg') {
						newSvgData = this.getSvgData('play');
						this.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
						this.$playpauseButton.find('path').attr('d',newSvgData[1]);
					}
					else {
						this.$playpauseButton.find('img').attr('src',this.playButtonImg);
					}
				}
			}
			else {
				if (typeof this.$status !== 'undefined' && typeof this.seekBar !== 'undefined') {
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
              }
              else {
                // for all other contexts (e.g., users clicks Play/Pause)
                // user should receive more rapid feedback
                if (!thisObj.debouncingStatus) {
                  thisObj.statusMessageThreshold = 250; // in ms
                }
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
							}
							else if ((timestamp - thisObj.statusDebounceStart) > thisObj.statusMessageThreshold) {
    						thisObj.$status.text(textByState[currentState]);
                thisObj.statusDebounceStart = null;
                clearTimeout(thisObj.statusTimeout);
                thisObj.statusTimeout = null;
						  }
						}
						else {
							thisObj.statusDebounceStart = null;
							thisObj.debouncingStatus = false;
							clearTimeout(thisObj.statusTimeout);
							thisObj.statusTimeout = null;
						}
						// Don't change play/pause button display while using the seek bar (or if YouTube stopped)
						if (!thisObj.seekBar.tracking && !thisObj.stoppingYouTube) {
							if (currentState === 'paused' || currentState === 'stopped' || currentState === 'ended') {
								thisObj.$playpauseButton.attr('aria-label',thisObj.tt.play);

								if (thisObj.iconType === 'font') {
									thisObj.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
									thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.play);
								}
								else if (thisObj.iconType === 'svg') {
									newSvgData = thisObj.getSvgData('play');
									thisObj.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
									thisObj.$playpauseButton.find('path').attr('d',newSvgData[1]);
								}
								else {
									thisObj.$playpauseButton.find('img').attr('src',thisObj.playButtonImg);
								}
							}
							else {
								thisObj.$playpauseButton.attr('aria-label',thisObj.tt.pause);

								if (thisObj.iconType === 'font') {
									thisObj.$playpauseButton.find('span').first().removeClass('icon-play').addClass('icon-pause');
									thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.pause);
								}
								else if (thisObj.iconType === 'svg') {
									newSvgData = thisObj.getSvgData('pause');
									thisObj.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
									thisObj.$playpauseButton.find('path').attr('d',newSvgData[1]);
								}
								else {
									thisObj.$playpauseButton.find('img').attr('src',thisObj.pauseButtonImg);
								}
							}
						}
					});
				}
			}
		}

		// Show/hide status bar content conditionally
		if (!this.fullscreen) {
			statusBarWidthBreakpoint = 300;
			statusBarHeight = this.$statusBarDiv.height();
			speedHeight = this.$statusBarDiv.find('span.able-speed').height();
			if (speedHeight > (statusBarHeight + 5)) {
				// speed bar is wrapping (happens often in German player)
				this.$statusBarDiv.find('span.able-speed').hide();
				this.hidingSpeed = true;
			}
			else {
				if (this.hidingSpeed) {
					this.$statusBarDiv.find('span.able-speed').show();
					this.hidingSpeed = false;
				}
				if (this.$statusBarDiv.width() < statusBarWidthBreakpoint) {
					// Player is too small for a speed span
					this.$statusBarDiv.find('span.able-speed').hide();
					this.hidingSpeed = true;
				}
				else {
					if (this.hidingSpeed) {
						this.$statusBarDiv.find('span.able-speed').show();
						this.hidingSpeed = false;
					}
				}
			}
		}

	};

	AblePlayer.prototype.getHiddenWidth = function($el) {

		// jQuery returns for width() if element is hidden
		// this function is a workaround

		// save a reference to a cloned element that can be measured
		var $hiddenElement = $el.clone().appendTo('body');

		// calculate the width of the clone
		var width = $hiddenElement.outerWidth();

		// remove the clone from the DOM
		$hiddenElement.remove();

		return width;
	};

	AblePlayer.prototype.handlePlay = function(e) {

		if (this.paused) {
			this.playMedia();
		}
		else {
			this.pauseMedia();
		}
	};

	AblePlayer.prototype.handleRestart = function() {

		this.seekTo(0);
	};

	AblePlayer.prototype.handlePrevTrack = function() {

    if (this.playlistIndex === 0) {
      // currently on the first track
      // wrap to bottom and play the last track
      this.playlistIndex = this.$playlist.length - 1;
    }
    else {
		  this.playlistIndex--;
    }
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
    this.cuePlaylistItem(this.playlistIndex);
	};

	AblePlayer.prototype.handleNextTrack = function() {

    if (this.playlistIndex === this.$playlist.length - 1) {
      // currently on the last track
      // wrap to top and play the forst track
      this.playlistIndex = 0;
    }
    else {
		  this.playlistIndex++;
    }
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
    this.cuePlaylistItem(this.playlistIndex);
	};

	AblePlayer.prototype.handleRewind = function() {

		var targetTime;

		targetTime = this.elapsed - this.seekInterval;
		if (this.useChapterTimes) {
			if (targetTime < this.currentChapter.start) {
				targetTime = this.currentChapter.start;
			}
		}
		else {
			if (targetTime < 0) {
				targetTime = 0;
			}
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
				}
				else if (this.duration % targetTime < this.seekInterval) {
					// nothing left but pocket change after seeking to targetTime
					// go ahead and seek to end of video (or chapter), whichever is earliest
					targetTime = Math.min(this.duration, this.currentChapter.end);
				}
			}
			else {
				// this is not the last chapter
				if (targetTime > this.currentChapter.end) {
					// targetTime would exceed the end of the chapter
					// scrub exactly to end of chapter
					targetTime = this.currentChapter.end;
				}
			}
		}
		else {
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
		}
		else if (this.player === 'youtube') {
			rates = this.youTubePlayer.getAvailablePlaybackRates();
			currentRate = this.getPlaybackRate();
			index = rates.indexOf(currentRate);
			if (index === -1) {
				
			}
			else {
				index += dir;
				// Can only increase or decrease rate if there's another rate available.
				if (index < rates.length && index >= 0) {
					this.setPlaybackRate(rates[index]);
				}
			}
		}
		else if (this.player === 'vimeo') {
			// range is 0.5 to 2
			// increase/decrease in inrements of 0.5
			vimeoMin = 0.5;
			vimeoMax = 2;
			if (dir === 1) {
				if (this.vimeoPlaybackRate + 0.5 <= vimeoMax) {
					newRate = this.vimeoPlaybackRate + 0.5;
				}
				else {
					newRate = vimeoMax;
				}
			}
			else if (dir === -1) {
				if (this.vimeoPlaybackRate - 0.5 >= vimeoMin) {
					newRate = this.vimeoPlaybackRate - 0.5;
				}
				else {
					newRate = vimeoMin;
				}
			}
			this.setPlaybackRate(newRate);
		}
	};

	AblePlayer.prototype.handleCaptionToggle = function() {

		var captions;
		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}
		if (this.captions.length) {
			captions = this.captions;
		}
		else {
			captions = [];
		}
		if (captions.length === 1) {
			// When there's only one set of captions, just do an on/off toggle.
			if (this.captionsOn === true) {
				// turn them off
				this.captionsOn = false;
				this.prefCaptions = 0;
				this.updateCookie('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.unloadModule(this.ytCaptionModule);
				}
				else {
					this.$captionsWrapper.hide();
				}
			}
			else {
				// captions are off. Turn them on.
				this.captionsOn = true;
				this.prefCaptions = 1;
				this.updateCookie('prefCaptions');
				if (this.usingYouTubeCaptions) {
					if (typeof this.ytCaptionModule !== 'undefined') {
						this.youTubePlayer.loadModule(this.ytCaptionModule);
					}
				}
				else {
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
			this.refreshControls('captions');
		}
		else {
			// there is more than one caption track.
			// clicking on a track is handled via caption.js > getCaptionClickFunction()
			if (this.captionsPopup && this.captionsPopup.is(':visible')) {
				this.captionsPopup.hide();
				this.hidingPopup = false;
				this.$ccButton.removeAttr('aria-expanded').focus();
			}
			else {
				this.closePopups();
				if (this.captionsPopup) {
					this.captionsPopup.show();
					this.$ccButton.attr('aria-expanded','true');
					this.captionsPopup.css('top', this.$ccButton.position().top - this.captionsPopup.outerHeight());
					this.captionsPopup.css('left', this.$ccButton.position().left)
					// Place focus on the first button (even if another button is checked)
					this.captionsPopup.find('li').removeClass('able-focus');
					this.captionsPopup.find('li').first().focus().addClass('able-focus');
				}
			}
		}
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
			this.$chaptersButton.removeAttr('aria-expanded').focus();
		}
		else {
			this.closePopups();
			this.chaptersPopup.show();
			this.$chaptersButton.attr('aria-expanded','true');
			this.chaptersPopup.css('top', this.$chaptersButton.position().top - this.chaptersPopup.outerHeight());
			this.chaptersPopup.css('left', this.$chaptersButton.position().left)

			// Highlight the current chapter, if any chapters are checked
			// Otherwise, place focus on the first chapter
			this.chaptersPopup.find('li').removeClass('able-focus');
			if (this.chaptersPopup.find('li[aria-checked="true"]').length) {
				this.chaptersPopup.find('li[aria-checked="true"]').focus().addClass('able-focus');
			}
			else {
				this.chaptersPopup.find('li').first().addClass('able-focus').attr('aria-checked','true').focus();
			}
		}
	};

	AblePlayer.prototype.handleDescriptionToggle = function() {

		this.descOn = !this.descOn;
		this.prefDesc = + this.descOn; // convert boolean to integer
		this.updateCookie('prefDesc');
		if (!this.$descDiv.is(':hidden')) {
			this.$descDiv.hide();
		}
		this.refreshingDesc = true;
		this.initDescription();
		this.refreshControls('descriptions');
	};

	AblePlayer.prototype.handlePrefsClick = function(pref) {

		// NOTE: the prefs menu is positioned near the right edge of the player
		// This assumes the Prefs button is also positioned in that vicinity
		// (last or second-last button the right)
		var thisObj, prefsButtonPosition, prefsMenuRight, prefsMenuLeft;

		thisObj = this;

		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}
		if (this.prefsPopup.is(':visible')) {
			this.prefsPopup.hide();
			this.$prefsButton.removeAttr('aria-expanded');
			// restore each menu item to original hidden state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			if (!this.showingPrefsDialog) {
  			this.$prefsButton.focus();
			}
			// wait briefly, then reset hidingPopup
			setTimeout(function() {
  			thisObj.hidingPopup = false;
  		},100);
		}
		else {
			this.closePopups();
			this.prefsPopup.show();
			this.$prefsButton.attr('aria-expanded','true');
			prefsButtonPosition = this.$prefsButton.position();
			prefsMenuRight = this.$ableDiv.width() - 5;
			prefsMenuLeft = prefsMenuRight - this.prefsPopup.width();
			this.prefsPopup.css('top', prefsButtonPosition.top - this.prefsPopup.outerHeight());
			this.prefsPopup.css('left', prefsMenuLeft);
			// remove prior focus and set focus on first item; also change tabindex from -1 to 0
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','0');
			this.prefsPopup.find('li').first().focus().addClass('able-focus');

		}
	};

	AblePlayer.prototype.handleHelpClick = function() {
		this.setFullscreen(false);
		this.helpDialog.show();
	};

	AblePlayer.prototype.handleTranscriptToggle = function () {

  	var thisObj = this;

		if (this.$transcriptDiv.is(':visible')) {
			this.$transcriptArea.hide();
			this.$transcriptButton.addClass('buttonOff').attr('aria-label',this.tt.showTranscript);
			this.$transcriptButton.find('span.able-clipped').text(this.tt.showTranscript);
			this.prefTranscript = 0;
			this.$transcriptButton.focus().addClass('able-focus');
      // wait briefly before resetting stopgap var
      // otherwise the keypress used to select 'Close' will trigger the transcript button
      // Benchmark tests: If this is gonna happen, it typically happens in around 3ms; max 12ms
      // Setting timeout to 100ms is a virtual guarantee of proper functionality
      setTimeout(function() {
        thisObj.closingTranscript = false;
      }, 100);
		}
		else {
			this.positionDraggableWindow('transcript');
			this.$transcriptArea.show();
			// showing transcriptArea has a cascading effect of showing all content *within* transcriptArea
			// need to re-hide the popup menu
			this.$transcriptPopup.hide();
			this.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.tt.hideTranscript);
			this.$transcriptButton.find('span.able-clipped').text(this.tt.hideTranscript);
			this.prefTranscript = 1;
			// move focus to first focusable element (window options button)
      this.focusNotClick = true;
			this.$transcriptArea.find('button').first().focus();
      // wait briefly before resetting stopgap var
      setTimeout(function() {
        thisObj.focusNotClick = false;
      }, 100);
		}
		this.updateCookie('prefTranscript');
	};

	AblePlayer.prototype.handleSignToggle = function () {

  	var thisObj = this;

		if (this.$signWindow.is(':visible')) {
			this.$signWindow.hide();
			this.$signButton.addClass('buttonOff').attr('aria-label',this.tt.showSign);
			this.$signButton.find('span.able-clipped').text(this.tt.showSign);
			this.prefSign = 0;
			this.$signButton.focus().addClass('able-focus');
      // wait briefly before resetting stopgap var
      // otherwise the keypress used to select 'Close' will trigger the transcript button
      setTimeout(function() {
        thisObj.closingSign = false;
      }, 100);
		}
		else {
			this.positionDraggableWindow('sign');
			this.$signWindow.show();
			// showing signWindow has a cascading effect of showing all content *within* signWindow
			// need to re-hide the popup menu
			this.$signPopup.hide();
			this.$signButton.removeClass('buttonOff').attr('aria-label',this.tt.hideSign);
			this.$signButton.find('span.able-clipped').text(this.tt.hideSign);
			this.prefSign = 1;
      this.focusNotClick = true;
			this.$signWindow.find('button').first().focus();
      // wait briefly before resetting stopgap var
      // otherwise the keypress used to select 'Close' will trigger the transcript button
      setTimeout(function() {
        thisObj.focusNotClick = false;
      }, 100);
		}
		this.updateCookie('prefSign');
	};

	AblePlayer.prototype.isFullscreen = function () {

		// NOTE: This has been largely replaced as of 3.2.5 with a Boolean this.fullscreen,
		// which is defined in setFullscreen()
		// This function returns true if *any* element is fullscreen
		// but doesn't tell us whether a particular element is in fullscreen
		// (e.g., if there are multiple players on the page)
		// The Boolean this.fullscreen is defined separately for each player instance

		if (this.nativeFullscreenSupported()) {
			return (document.fullscreenElement ||
							document.webkitFullscreenElement ||
							document.webkitCurrentFullScreenElement ||
							document.mozFullScreenElement ||
							document.msFullscreenElement) ? true : false;
		}
		else {
			return this.modalFullscreenActive ? true : false;
		}
	}

	AblePlayer.prototype.setFullscreen = function (fullscreen) {

		if (this.fullscreen == fullscreen) {
			// replace isFullscreen() with a Boolean. see function for explanation
			return;
		}
		var thisObj = this;
		var $el = this.$ableWrapper;
		var el = $el[0];

		if (this.nativeFullscreenSupported()) {
			// Note: many varying names for options for browser compatibility.
			if (fullscreen) {
				// Initialize fullscreen

				// But first, capture current settings so they can be restored later
				this.preFullScreenWidth = this.$ableWrapper.width();
				this.preFullScreenHeight = this.$ableWrapper.height();
				if (el.requestFullscreen) {
					el.requestFullscreen();
				}
				else if (el.webkitRequestFullscreen) {
					el.webkitRequestFullscreen();
				}
				else if (el.mozRequestFullScreen) {
					el.mozRequestFullScreen();
				}
				else if (el.msRequestFullscreen) {
					el.msRequestFullscreen();
				}
				this.fullscreen = true;
			}
			else {
				// Exit fullscreen
				if (document.exitFullscreen) {
					document.exitFullscreen();
				}
				else if (document.webkitExitFullscreen) {
					document.webkitExitFullscreen();
				}
				else if (document.webkitCancelFullScreen) {
					document.webkitCancelFullScreen();
				}
				else if (document.mozCancelFullScreen) {
					document.mozCancelFullScreen();
				}
				else if (document.msExitFullscreen) {
					document.msExitFullscreen();
				}
				this.fullscreen = false;
			}
			// add event handlers for changes in full screen mode
			// currently most changes are made in response to windowResize event
			// However, that alone is not resulting in a properly restored player size in Opera Mac
			// More on the Opera Mac bug: https://github.com/ableplayer/ableplayer/issues/162
			// this fullscreen event handler added specifically for Opera Mac,
			// but includes event listeners for all browsers in case its functionality could be expanded
			// Added functionality in 2.3.45 for handling YouTube return from fullscreen as well
			$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function(e) {
				// NOTE: e.type = the specific event that fired (in case needing to control for browser-specific idiosyncrasies)
				if (!thisObj.fullscreen) {
					// user has just exited full screen
					thisObj.restoringAfterFullScreen = true;
					thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
				}
				else if (!thisObj.clickedFullscreenButton) {
					// user triggered fullscreenchange without clicking (or pressing) fullscreen button
					// this is only possible if they pressed Escape to exit fullscreen mode
					thisObj.fullscreen = false;
					thisObj.restoringAfterFullScreen = true;
					thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
				}
				// NOTE: The fullscreenchange (or browser-equivalent) event is triggered twice
				// when exiting fullscreen via the "Exit fullscreen" button (only once if using Escape)
				// Not sure why, but consequently we need to be sure thisObj.clickedFullScreenButton
				// continues to be true through both events
				// Could use a counter variable to control that (reset to false after the 2nd trigger)
				// However, since I don't know why it's happening, and whether it's 100% reliable
				// resetting clickedFullScreenButton after a timeout seems to be better approach
				setTimeout(function() {
					thisObj.clickedFullscreenButton = false;
				},1000);
			});
		}
		else {
			// Non-native fullscreen support through modal dialog.
			// Create dialog on first run through.
			if (!this.fullscreenDialog) {
				var $dialogDiv = $('<div>');
				// create a hidden alert, communicated to screen readers via aria-describedby
				var $fsDialogAlert = $('<p>',{
					'class': 'able-screenreader-alert'
				}).text(this.tt.fullscreen); // In English: "Full screen"; TODO: Add alert text that is more descriptive
				$dialogDiv.append($fsDialogAlert);
				// now render this as a dialog
				this.fullscreenDialog = new AccessibleDialog($dialogDiv, this.$fullscreenButton, 'dialog', 'Fullscreen video player', $fsDialogAlert, this.tt.exitFullScreen, '100%', true, function () { thisObj.handleFullscreenToggle() });
				$('body').append($dialogDiv);
			}

			// Track whether paused/playing before moving element; moving the element can stop playback.
			var wasPaused = this.paused;

			if (fullscreen) {
				this.modalFullscreenActive = true;
				this.fullscreenDialog.show();

				// Move player element into fullscreen dialog, then show.
				// Put a placeholder element where player was.
				this.$modalFullscreenPlaceholder = $('<div class="placeholder">');
				this.$modalFullscreenPlaceholder.insertAfter($el);
				$el.appendTo(this.fullscreenDialog.modal);

				// Column left css is 50% by default; set to 100% for full screen.
				if ($el === this.$ableColumnLeft) {
					$el.width('100%');
				}
				var newHeight = $(window).height() - this.$playerDiv.height();
				if (!this.$descDiv.is(':hidden')) {
					newHeight -= this.$descDiv.height();
				}
				this.resizePlayer($(window).width(), newHeight);
			}
			else {
				this.modalFullscreenActive = false;
				if ($el === this.$ableColumnLeft) {
					$el.width('50%');
				}
				$el.insertAfter(this.$modalFullscreenPlaceholder);
				this.$modalFullscreenPlaceholder.remove();
				this.fullscreenDialog.hide();
				this.resizePlayer(this.$ableWrapper.width(), this.$ableWrapper.height());
			}

			// Resume playback if moving stopped it.
			if (!wasPaused && this.paused) {
				this.playMedia();
			}
		}
		this.refreshControls('fullscreen');
	};

	AblePlayer.prototype.handleFullscreenToggle = function () {

		var stillPaused = this.paused;
		this.setFullscreen(!this.fullscreen);
		if (stillPaused) {
			this.pauseMedia(); // when toggling fullscreen and media is just paused, keep media paused.
		}
		else if (!stillPaused) {
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
		}
		else {
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
	};

	AblePlayer.prototype.handleTranscriptLockToggle = function (val) {

		this.autoScrollTranscript = val; // val is boolean
		this.prefAutoScrollTranscript = +val; // convert boolean to numeric 1 or 0 for cookie
		this.updateCookie('prefAutoScrollTranscript');
		this.refreshControls('transcript');
	};


	AblePlayer.prototype.showTooltip = function($tooltip) {

		if (($tooltip).is(':animated')) {
			$tooltip.stop(true,true).show().delay(4000).fadeOut(1000);
		}
		else {
			$tooltip.stop().show().delay(4000).fadeOut(1000);
		}
	};

	AblePlayer.prototype.showAlert = function( msg, location ) {

		// location is either of the following:
		// 'main' (default)
		// 'screenreader (visibly hidden)
		// 'sign' (sign language window)
		// 'transcript' (trasncript window)
		var thisObj, $alertBox, $parentWindow, alertLeft, alertTop;

		thisObj = this;

		if (location === 'transcript') {
			$alertBox = this.$transcriptAlert;
			$parentWindow = this.$transcriptArea;
		}
		else if (location === 'sign') {
			$alertBox = this.$signAlert;
			$parentWindow = this.$signWindow;
		}
		else if (location === 'screenreader') {
			$alertBox = this.$srAlertBox;
		}
		else {
			$alertBox = this.$alertBox;
		}
		$alertBox.text(msg).show();
		if (location == 'transcript' || location === 'sign') {
			if ($parentWindow.width() > $alertBox.width()) {
				alertLeft = $parentWindow.width() / 2 - $alertBox.width() / 2;
			}
			else {
				// alert box is wider than its container. Position it far left and let it wrap
				alertLeft = 10;
			}
			if (location === 'sign') {
				// position alert in the lower third of the sign window (to avoid covering the signer)
				alertTop = ($parentWindow.height() / 3) * 2;
			}
			else if (location === 'transcript') {
				// position alert just beneath the toolbar to avoid getting lost among transcript text
				alertTop = this.$transcriptToolbar.height() + 30;
			}
			$alertBox.css({
				top: alertTop + 'px',
				left: alertLeft + 'px'
			});
		}
		else if (location !== 'screenreader') {
			// The original formula incorporated offset() into the calculation
			// but at some point this began resulting in an alert that's off-centered
			// Changed in v2.2.17, but here's the original for reference in case needed:
			// left: this.$playerDiv.offset().left + (this.$playerDiv.width() / 2) - ($alertBox.width() / 2)
			$alertBox.css({
				left: (this.$playerDiv.width() / 2) - ($alertBox.width() / 2)
			});
		}
		if (location !== 'screenreader') {
			setTimeout(function () {
				$alertBox.fadeOut(300);
			}, 3000);
		}
	};

	AblePlayer.prototype.showedAlert = function (which) {

		// returns true if the target alert has already been shown
		// useful for throttling alerts that only need to be shown once
		// e.g., move alerts with instructions for dragging a window

		if (which === 'transcript') {
			if (this.showedTranscriptAlert) {
				return true;
			}
			else {
				return false;
			}
		}
		else if (which === 'sign') {
			if (this.showedSignAlert) {
				return true;
			}
			else {
				return false;
			}
		}
		return false;
	}

	// Resizes all relevant player attributes.
	AblePlayer.prototype.resizePlayer = function (width, height) {

		var captionSizeOkMin, captionSizeOkMax, captionSize, newCaptionSize, newLineHeight;

		if (this.fullscreen) { // replace isFullscreen() with a Boolean. see function for explanation
			if (typeof this.$vidcapContainer !== 'undefined') {
				this.$ableWrapper.css({
					'width': width + 'px',
					'max-width': ''
				})
				this.$vidcapContainer.css({
					'height': height + 'px',
					'width': width
				});
				this.$media.css({
					'height': height + 'px',
					'width': width
				})
			}
			if (typeof this.$transcriptArea !== 'undefined') {
				this.retrieveOffscreenWindow('transcript',width,height);
			}
			if (typeof this.$signWindow !== 'undefined') {
				this.retrieveOffscreenWindow('sign',width,height);
			}
		}
		else {
			// player resized
			if (this.restoringAfterFullScreen) {
				// User has just exited fullscreen mode. Restore to previous settings
				width = this.preFullScreenWidth;
				height = this.preFullScreenHeight;
				this.restoringAfterFullScreen = false;
				this.$ableWrapper.css({
					'max-width': width + 'px',
					'width': ''
				});
				if (typeof this.$vidcapContainer !== 'undefined') {
					this.$vidcapContainer.css({
						'height': '',
						'width': ''
					});
				}
				this.$media.css({
					'width': '100%',
					'height': 'auto'
				});
			}
		}

		// resize YouTube
		if (this.player === 'youtube' && this.youTubePlayer) {
			this.youTubePlayer.setSize(width, height);
		}

		// Resize captions
		if (typeof this.$captionsDiv !== 'undefined') {

			// Font-size is too small in full screen view & too large in small-width view
			// The following vars define a somewhat arbitary zone outside of which
			// caption size requires adjustment
			captionSizeOkMin = 400;
			captionSizeOkMax = 1000;
			captionSize = parseInt(this.prefCaptionsSize,10);

			// TODO: Need a better formula so that it scales proportionally to viewport
			if (width > captionSizeOkMax) {
				newCaptionSize = captionSize * 1.5;
			}
			else if (width < captionSizeOkMin) {
				newCaptionSize = captionSize / 1.5;
			}
			else {
				newCaptionSize = captionSize;
			}
			newLineHeight = newCaptionSize + 25;
			this.$captionsDiv.css('font-size',newCaptionSize + '%');
			this.$captionsWrapper.css('line-height',newLineHeight + '%');
		}
		this.refreshControls('captions');
	};

	AblePlayer.prototype.retrieveOffscreenWindow = function( which, width, height ) {

		// check to be sure popup windows ('transcript' or 'sign') are positioned on-screen
		// (they sometimes disappear off-screen when entering fullscreen mode)
		// if off-screen, recalculate so they are back on screen

		var window, windowPos, windowTop, windowLeft, windowRight, windowWidth, windowBottom, windowHeight;

		if (which == 'transcript') {
			window = this.$transcriptArea;
		}
		else if (which == 'sign') {
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

	AblePlayer.prototype.getHighestZIndex = function() {

		// returns the highest z-index on page
		// used to ensure dialogs (or potentially other windows) are on top

		var max, $elements, z;
		max = 0;

		// exclude the Able Player dialogs and windows
		$elements = $('body *').not('.able-modal-dialog,.able-modal-dialog *,.able-modal-overlay,.able-modal-overlay *,.able-sign-window,.able-transcript-area');

		$elements.each(function(){
			z = $(this).css('z-index');
			if (Number.isInteger(+z)) { // work only with integer values, not 'auto'
				if (parseInt(z) > max) {
					max = parseInt(z);
				}
			}
		});
		return max;
	};

	AblePlayer.prototype.updateZIndex = function(which) {

		// update z-index of 'transcript' or 'sign', relative to each other
		// direction is always 'up' (i.e., move window to top)
		// windows come to the top when the user clicks on them
		var defHighZ, defLowZ, highestZ, transcriptZ, signZ, newHighZ, newLowZ;

		// set the default z-indexes, as defined in ableplayer.css
		defHighZ = 8000; // by default, assigned to the sign window
		defLowZ = 7000; // by default, assigned to the transcript area
		highestZ = this.getHighestZIndex(); // highest z-index on the page, excluding Able Player windows & modals

		// NOTE: Although highestZ is collected here, it currently isn't used.
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
			}
			else if (typeof this.$signWindow !== 'undefined') {
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
		}
		else if (transcriptZ > signZ) {
			if (which === 'transcript') {
				// transcript is already on top; nothing to do
				return false;
			}
			else {
				// swap z's
				newHighZ = transcriptZ;
				newLowZ = signZ;
			}
		}
		else { // signZ is greater
			if (which === 'sign') {
				// sign is already on top; nothing to do
				return false;
			}
			else {
				newHighZ = signZ;
				newLowZ = transcriptZ;
			}
		}
		// now assign the new values
		if (which === 'transcript') {
			this.$transcriptArea.css('z-index',newHighZ);
			this.$signWindow.css('z-index',newLowZ);
		}
		else if (which === 'sign') {
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
		}
		else if (source === 'transcript') {
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
		}
		this.updateTranscript();
	};

})(jQuery);

(function ($) {
	AblePlayer.prototype.updateCaption = function (time) {

		if (!this.usingYouTubeCaptions && (typeof this.$captionsWrapper !== 'undefined')) {
			if (this.captionsOn) {
				this.$captionsWrapper.show();
				if (typeof time !== 'undefined') {
					this.showCaptions(time);
				}
			}
			else if (this.$captionsWrapper) {
				this.$captionsWrapper.hide();
				this.prefCaptions = 0;
			}
		}
	};

	AblePlayer.prototype.updateCaptionsMenu = function (lang) {

		// uncheck all previous menu items
		this.captionsPopup.find('li').attr('aria-checked','false');
		if (typeof lang === 'undefined') {
			// check the last menu item (captions off)
			this.captionsPopup.find('li').last().attr('aria-checked','true');
		}
		else {
			// check the newly selected lang
			this.captionsPopup.find('li[lang=' + lang + ']').attr('aria-checked','true');
		}
	};

	// Returns the function used when a caption is clicked in the captions menu.
	// Not called if user clicks "Captions off". Instead, that triggers getCaptionOffFunction()
	AblePlayer.prototype.getCaptionClickFunction = function (track) {

		var thisObj = this;
		return function () {
			thisObj.selectedCaptions = track;
			thisObj.captionLang = track.language;
			thisObj.currentCaption = -1;
			if (thisObj.usingYouTubeCaptions) {
				if (thisObj.captionsOn) {
					if (typeof thisObj.ytCaptionModule !== 'undefined') {
						// captions are already on. Just need to change the language
						thisObj.youTubePlayer.setOption(thisObj.ytCaptionModule, 'track', {'languageCode': thisObj.captionLang});
					}
					else {
						// need to wait for caption module to be loaded to change the language
						// caption module will be loaded after video starts playing, triggered by onApiChange event
						// at that point, thosObj.captionLang will be passed to the module as the default language
					}
				}
				else {
					// captions are off (i.e., captions module has been unloaded; need to reload it)
					// user's selected language will be reset after module has successfully loaded
					// (the onApiChange event will be fired -- see initialize.js > initYouTubePlayer())
					thisObj.resettingYouTubeCaptions = true;
					thisObj.youTubePlayer.loadModule(thisObj.ytCaptionModule);
				}
			}
			else if (thisObj.usingVimeoCaptions) {
				thisObj.vimeoPlayer.enableTextTrack(thisObj.captionLang).then(function(track) {
					// track.language = the iso code for the language
					// track.kind = 'captions' or 'subtitles'
					// track.label = the human-readable label
				}).catch(function(error) {
					switch (error.name) {
						case 'InvalidTrackLanguageError':
							// no track was available with the specified language
							
							break;
						case 'InvalidTrackError':
							// no track was available with the specified language and kind
							
							break;
						default:
							// some other error occurred
							
							break;
    				}
				});
			}
			else { // using local track elements for captions/subtitles
				thisObj.syncTrackLanguages('captions',thisObj.captionLang);
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
			// Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
			// e.g., if user triggered button with Enter or mouse click, not spacebar
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.updateCaptionsMenu(thisObj.captionLang);
			thisObj.$ccButton.focus();

			// save preference to cookie
			thisObj.prefCaptions = 1;
			thisObj.updateCookie('prefCaptions');
			thisObj.refreshControls('captions');
		}
	};

	// Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
	AblePlayer.prototype.getCaptionOffFunction = function () {
		var thisObj = this;
		return function () {
			if (thisObj.player == 'youtube') {
				thisObj.youTubePlayer.unloadModule(thisObj.ytCaptionModule);
			}
			else if (thisObj.usingVimeoCaptions) {
        thisObj.vimeoPlayer.disableTextTrack();
			}
			thisObj.captionsOn = false;
			thisObj.currentCaption = -1;
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it (used in handleCaptionToggle())
			thisObj.hidingPopup = true;
			thisObj.captionsPopup.hide();
			// Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
			// e.g., if user triggered button with Enter or mouse click, not spacebar
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.updateCaptionsMenu();
			thisObj.$ccButton.focus();

			// save preference to cookie
			thisObj.prefCaptions = 0;
			thisObj.updateCookie('prefCaptions');
			if (!this.swappingSrc) {
				thisObj.refreshControls('captions');
				thisObj.updateCaption();
			}
		}
	};

	AblePlayer.prototype.showCaptions = function(now) {

		var c, thisCaption, captionText;
		var cues;
		if (this.selectedCaptions) {
			cues = this.selectedCaptions.cues;
		}
		else if (this.captions.length >= 1) {
			cues = this.captions[0].cues;
		}
		else {
			cues = [];
		}
		for (c = 0; c < cues.length; c++) {
			if ((cues[c].start <= now) && (cues[c].end > now)) {
				thisCaption = c;
				break;
			}
		}
		if (typeof thisCaption !== 'undefined') {
			if (this.currentCaption !== thisCaption) {
				// it's time to load the new caption into the container div
				captionText = this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>');
				this.$captionsDiv.html(captionText);
				this.currentCaption = thisCaption;
				if (captionText.length === 0) {
					// hide captionsDiv; otherwise background-color is visible due to padding
					this.$captionsDiv.css('display','none');
				}
				else {
					this.$captionsDiv.css('display','inline-block');
				}
			}
		}
		else {
			this.$captionsDiv.html('');
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
			var result = [], ii;
			if (component.type === 'string') {
				result.push(component.value);
			}
			else if (component.type === 'v') {
				result.push('(' + component.value + ')');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
			}
			else if (component.type === 'i') {
				result.push('<em>');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
				result.push('</em>');
			}
			else if (component.type === 'b') {
				result.push('<strong>');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
				result.push('</strong>');
			}
			else {
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
			}
			return result.join('');
		};

		if (typeof cue.components !== 'undefined') {
			for (var ii = 0; ii < cue.components.children.length; ii++) {
				result.push(flattenComponent(cue.components.children[ii]));
			}
		}
		return result.join('');
	};

	AblePlayer.prototype.getCaptionsOptions = function(pref) {

		var options = [];

		switch (pref) {

			case 'prefCaptionsFont':
				options[0] = ['serif',this.tt.serif];
				options[1] = ['sans-serif',this.tt.sans];
				options[2] = ['cursive',this.tt.cursive];
				options[3] = ['fantasy',this.tt.fantasy];
				options[4] = ['monospace',this.tt.monospace];
				break;

			case 'prefCaptionsColor':
			case 'prefCaptionsBGColor':
				// HTML color values must be in English
				options[0] = ['white',this.tt.white];
				options[1] = ['yellow',this.tt.yellow];
				options[2] = ['green',this.tt.green];
				options[3] = ['cyan',this.tt.cyan];
				options[4] = ['blue',this.tt.blue];
				options[5] = ['magenta',this.tt.magenta];
				options[6] = ['red',this.tt.red];
				options[7] = ['black',this.tt.black];
				break;

			case 'prefCaptionsSize':
				options[0] = '75%';
				options[1] = '100%';
				options[2] = '125%';
				options[3] = '150%';
				options[4] = '200%';
				break;

			case 'prefCaptionsOpacity':
				options[0] = '0%';
				options[1] = '25%';
				options[2] = '50%';
				options[3] = '75%';
				options[4] = '100%';
				break;

			case 'prefCaptionsStyle':
				options[0] = this.tt.captionsStylePopOn;
				options[1] = this.tt.captionsStyleRollUp;
				break;

			case 'prefCaptionsPosition':
				options[0] = 'overlay';
				options[1] = 'below';
				break;

		}
		return options;
	};

	AblePlayer.prototype.translatePrefs = function(pref, value, outputFormat) {

		// translate current value of pref to a value supported by outputformat
		if (outputFormat == 'youtube') {
			if (pref === 'size') {
				// YouTube font sizes are a range from -1 to 3 (0 = default)
				switch (value) {
					case '75%':
						return -1;
					case '100%':
						return 0;
					case '125%':
						return 1;
					case '150%':
						return 2;
					case '200%':
						return 3;
				}
			}
		}
		return false;
	}

	AblePlayer.prototype.stylizeCaptions = function($element, pref) {

		// $element is the jQuery element containing the captions
		// this function handles stylizing of the sample caption text in the Prefs dialog
		// plus the actual production captions
		// TODO: consider applying the same user prefs to visible text-based description
		var property, newValue, opacity, lineHeight;

		if (typeof $element !== 'undefined') {
			if (pref == 'prefCaptionsPosition') {
				this.positionCaptions();
			}
			else if (typeof pref !== 'undefined') {
				// just change the one property that user just changed
				if (pref === 'prefCaptionsFont') {
					property = 'font-family';
				}
				else if (pref === 'prefCaptionsSize') {
					property = 'font-size';
				}
				else if (pref === 'prefCaptionsColor') {
					property = 'color';
				}
				else if (pref === 'prefCaptionsBGColor') {
					property = 'background-color';
				}
				else if (pref === 'prefCaptionsOpacity') {
					property = 'opacity';
				}
				if (pref === 'prefCaptionsOpacity') {
					newValue = parseFloat($('#' + this.mediaId + '_' + pref).val()) / 100.0;
				}
				else {
					newValue = $('#' + this.mediaId + '_' + pref).val();
				}
				$element.css(property, newValue);
			}
			else { // no property was specified, update all styles with current saved prefs
				opacity = parseFloat(this.prefCaptionsOpacity) / 100.0;
				$element.css({
					'font-family': this.prefCaptionsFont,
					'color': this.prefCaptionsColor,
					'background-color': this.prefCaptionsBGColor,
					'opacity': opacity
				});
				if ($element === this.$captionsDiv) {
					if (typeof this.$captionsWrapper !== 'undefined') {
						this.$captionsWrapper.css({
  						'font-size': this.prefCaptionsSize
            });
					}
				}
				if (this.prefCaptionsPosition === 'below') {
					// also need to add the background color to the wrapper div
					if (typeof this.$captionsWrapper !== 'undefined') {
						this.$captionsWrapper.css({
							'background-color': this.prefCaptionsBGColor,
							'opacity': '1'
						});
					}
				}
				else if (this.prefCaptionsPosition === 'overlay') {
					// no background color for overlay wrapper, captions are displayed in-line
					if (typeof this.$captionsWrapper !== 'undefined') {
						this.$captionsWrapper.css({
							'background-color': 'transparent',
							'opacity': ''
						});
					}
				}
				this.positionCaptions();
			}
		}
	};
	AblePlayer.prototype.positionCaptions = function(position) {

		// set caption position to either 'overlay' or 'below'
		// if position parameter was passed to this function, use that
		// otherwise use user preference
		if (typeof position === 'undefined') {
			position = this.prefCaptionsPosition;
		}
		if (typeof this.$captionsWrapper !== 'undefined') {

			if (position == 'below') {
				this.$captionsWrapper.removeClass('able-captions-overlay').addClass('able-captions-below');
				// also need to update in-line styles
				this.$captionsWrapper.css({
					'background-color': this.prefCaptionsBGColor,
					'opacity': '1'
				});
			}
			else {
				this.$captionsWrapper.removeClass('able-captions-below').addClass('able-captions-overlay');
				this.$captionsWrapper.css({
					'background-color': 'transparent',
					'opacity': ''
				});
			}
		}
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.populateChaptersDiv = function() {

		var headingLevel, headingType, headingId, $chaptersHeading,
			$chaptersList;

		if ($('#' + this.chaptersDivLocation)) {
			this.$chaptersDiv = $('#' + this.chaptersDivLocation);
			this.$chaptersDiv.addClass('able-chapters-div');

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
				this.$chaptersNav.attr('aria-labelledby',headingId);
			}
			else {
				this.$chaptersNav.attr('aria-label',this.tt.chapters);
			}
			this.$chaptersDiv.append(this.$chaptersNav);

			// populate this.$chaptersNav with a list of chapters
			this.updateChaptersList();
		}
	};

	AblePlayer.prototype.updateChaptersList = function() {

		var thisObj, cues, $chaptersList, c, thisChapter,
			$chapterItem, $chapterButton, buttonId, hasDefault,
			getClickFunction, $clickedItem, $chaptersList, thisChapterIndex;

		thisObj = this;

		if (!this.$chaptersNav) {
			return false;
		}

		if (typeof this.useChapterTimes === 'undefined') {
			if (this.seekbarScope === 'chapter' && this.selectedChapters.cues.length) {
				this.useChapterTimes = true;
			}
			else {
				this.useChapterTimes = false;
			}
		}

		if (this.useChapterTimes) {
			cues = this.selectedChapters.cues;
		}
		else if (this.chapters.length >= 1) {
			cues = this.chapters[0].cues;
		}
		else {
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
						thisChapterIndex = $chaptersList.index($clickedItem);
						$chaptersList.removeClass('able-current-chapter').attr('aria-selected','');
						$clickedItem.addClass('able-current-chapter').attr('aria-selected','true');
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
					$chapterButton.attr('aria-selected','true').parent('li').addClass('able-current-chapter');
					this.currentChapter = cues[thisChapter];
					hasDefault = true;
				}
			}
			if (!hasDefault) {
				// select the first chapter
				this.currentChapter = cues[0];
				$chaptersList.find('button').first().attr('aria-selected','true')
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

		var chapters, i, thisChapterIndex, chapterLabel;

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
					this.$chaptersDiv.find('ul').find('li').removeClass('able-current-chapter').attr('aria-selected','');
					this.$chaptersDiv.find('ul').find('li').eq(thisChapterIndex)
						.addClass('able-current-chapter').attr('aria-selected','true');
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
			}
			else {
				chapterEnd = this.currentChapter.end;
			}
		}
		else { // this is not the last chapter
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
		}
		else {
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
			}
			else {
				return newTime;
			}
		}
		else {
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
			thisObj.$chaptersButton.focus();
		}
	};

})(jQuery);

(function ($) {
	AblePlayer.prototype.updateMeta = function (time) {
		if (this.hasMeta) {
			if (this.metaType === 'text') {
				this.$metaDiv.show();
				this.showMeta(time || this.elapsed);
			}
			else {
				this.showMeta(time || this.elapsed);
			}
		}
	};

	AblePlayer.prototype.showMeta = function(now) {
		var tempSelectors, m, thisMeta,
			cues, cueText, cueLines, i, line,
			showDuration, focusTarget;

		tempSelectors = [];
		if (this.meta.length >= 1) {
			cues = this.meta;
		}
		else {
			cues = [];
		}
		for (m = 0; m < cues.length; m++) {
			if ((cues[m].start <= now) && (cues[m].end > now)) {
				thisMeta = m;
				break;
			}
		}
		if (typeof thisMeta !== 'undefined') {
			if (this.currentMeta !== thisMeta) {
				if (this.metaType === 'text') {
					// it's time to load the new metadata cue into the container div
					this.$metaDiv.html(this.flattenCueForMeta(cues[thisMeta]).replace('\n', '<br>'));
				}
				else if (this.metaType === 'selector') {
					// it's time to show content referenced by the designated selector(s)
					cueText = this.flattenCueForMeta(cues[thisMeta]);
					cueLines = cueText.split('\n');
					for (i=0; i<cueLines.length; i++) {
						line = $.trim(cueLines[i]);
						if (line.toLowerCase().trim() === 'pause') {
							// don't show big play button when pausing via metadata
							this.hideBigPlayButton = true;
							this.pauseMedia();
						}
						else if (line.toLowerCase().substring(0,6) == 'focus:') {
							focusTarget = line.substring(6).trim();
							if ($(focusTarget).length) {
								$(focusTarget).focus();
							}
						}
						else {
							if ($(line).length) {
								// selector exists
                this.currentMeta = thisMeta;
								showDuration = parseInt($(line).attr('data-duration'));
								if (typeof showDuration !== 'undefined' && !isNaN(showDuration)) {
									$(line).show().delay(showDuration).fadeOut();
								}
								else {
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
							for (i=this.visibleSelectors.length-1; i>=0; i--) {
								if ($.inArray(this.visibleSelectors[i],tempSelectors) == -1) {
									$(this.visibleSelectors[i]).hide();
									this.visibleSelectors.splice(i,1);
								}
							}
						}
					}

				}
			}
		}
		else {
			// there is currently no metadata. Empty stale content
			if (typeof this.$metaDiv !== 'undefined') {
				this.$metaDiv.html('');
			}
			if (this.visibleSelectors && this.visibleSelectors.length) {
				for (i=0; i<this.visibleSelectors.length; i++) {
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
			var result = [], ii;
			if (component.type === 'string') {
				result.push(component.value);
			}
			else if (component.type === 'v') {
				result.push('[' + component.value + ']');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
			}
			else {
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
			}
			return result.join('');
		}

		for (var ii = 0; ii < cue.components.children.length; ii++) {
			result.push(flattenComponent(cue.components.children[ii]));
		}

		return result.join('');
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.setupTranscript = function() {

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		if (!this.transcriptType) {
			// previously set transcriptType to null since there are no <track> elements
			// check again to see if captions have been collected from other sources (e.g., YouTube)

			if (this.captions.length && (!(this.usingYouTubeCaptions || this.usingVimeoCaptions))) {
				// captions are possible! Use the default type (popup)
				// if other types ('external' and 'manual') were desired, transcriptType would not be null here
				this.transcriptType = 'popup';
			}
		}

		if (this.transcriptType) {
			if (this.transcriptType === 'popup' || this.transcriptType === 'external') {
				 this.injectTranscriptArea();
		 			deferred.resolve();
			}
			else if (this.transcriptType === 'manual') {
				this.setupManualTranscript();
				deferred.resolve();
			}
		}
		else {
			// there is no transcript
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.injectTranscriptArea = function() {

		var thisObj, $autoScrollLabel, $languageSelectWrapper, $languageSelectLabel, i, $option;

		thisObj = this;
		this.$transcriptArea = $('<div>', {
			'class': 'able-transcript-area',
  		'role': 'dialog',
      'aria-label': this.tt.transcriptTitle
		});

		this.$transcriptToolbar = $('<div>', {
			'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
		});

		this.$transcriptDiv = $('<div>', {
			'class' : 'able-transcript'
		});

		// Transcript toolbar content

		// Add auto Scroll checkbox
		this.$autoScrollTranscriptCheckbox = $('<input>', {
		 	'id': 'autoscroll-transcript-checkbox',
		 	'type': 'checkbox'
		 });
		$autoScrollLabel = $('<label>', {
			 'for': 'autoscroll-transcript-checkbox'
			}).text(this.tt.autoScroll);
    this.$transcriptToolbar.append($autoScrollLabel,this.$autoScrollTranscriptCheckbox);

		// Add field for selecting a transcript language
		// Only necessary if there is more than one language
		if (this.captions.length > 1) {
			$languageSelectWrapper = $('<div>',{
				'class': 'transcript-language-select-wrapper'
			});
			$languageSelectLabel = $('<label>',{
				'for': 'transcript-language-select'
			}).text(this.tt.language);
			this.$transcriptLanguageSelect = $('<select>',{
				'id': 'transcript-language-select'
			});
			for (i=0; i < this.captions.length; i++) {
				$option = $('<option></option>',{
					value: this.captions[i]['language'],
					lang: this.captions[i]['language']
				}).text(this.captions[i]['label']);
				if (this.captions[i]['def']) {
				 	$option.prop('selected',true);
				 }
				this.$transcriptLanguageSelect.append($option);
			 }
		}
		if ($languageSelectWrapper) {
			$languageSelectWrapper.append($languageSelectLabel,this.$transcriptLanguageSelect);
			this.$transcriptToolbar.append($languageSelectWrapper);
		}
		this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);

		// If client has provided separate transcript location, put it there.
		// Otherwise append it to the body
		if (this.transcriptDivLocation) {
			$('#' + this.transcriptDivLocation).append(this.$transcriptArea);
		}
		else {
			this.$ableWrapper.append(this.$transcriptArea);
		}

		// make it draggable (popup only; NOT external transcript)
		if (!this.transcriptDivLocation) {
			this.initDragDrop('transcript');
			if (this.prefTranscript === 1) {
				// transcript is on. Go ahead and position it
				this.positionDraggableWindow('transcript',this.getDefaultWidth('transcript'));
			}
		}

		// If client has provided separate transcript location, override user's preference for hiding transcript
		if (!this.prefTranscript && !this.transcriptDivLocation) {
			this.$transcriptArea.hide();
		}
	};

	AblePlayer.prototype.addTranscriptAreaEvents = function() {

		var thisObj = this;

		this.$autoScrollTranscriptCheckbox.click(function () {
			thisObj.handleTranscriptLockToggle(thisObj.$autoScrollTranscriptCheckbox.prop('checked'));
		});

		this.$transcriptDiv.on('mousewheel DOMMouseScroll click scroll', function (e) {
			// Propagation is stopped in transcript click handler, so clicks are on the scrollbar
			// or outside of a clickable span.
			if (!thisObj.scrollingTranscript) {
				thisObj.autoScrollTranscript = false;
				thisObj.refreshControls('transcript');
			}
			thisObj.scrollingTranscript = false;
		});

		if (typeof this.$transcriptLanguageSelect !== 'undefined') {

			this.$transcriptLanguageSelect.on('click mousedown',function (e) {
				// execute default behavior
				// prevent propagation of mouse event to toolbar or window
				e.stopPropagation();
			});

			this.$transcriptLanguageSelect.on('change',function () {

				var language = thisObj.$transcriptLanguageSelect.val();

				thisObj.syncTrackLanguages('transcript',language);
			});
		}
	};

	AblePlayer.prototype.transcriptSrcHasRequiredParts = function() {

		// check the external transcript to be sure it has all required components
		// return true or false
		// in the process, define all the needed variables and properties

		if ($('#' + this.transcriptSrc).length) {
			this.$transcriptArea = $('#' + this.transcriptSrc);
			if (this.$transcriptArea.find('.able-window-toolbar').length) {
				this.$transcriptToolbar = this.$transcriptArea.find('.able-window-toolbar').eq(0);
				if (this.$transcriptArea.find('.able-transcript').length) {
					this.$transcriptDiv = this.$transcriptArea.find('.able-transcript').eq(0);
					if (this.$transcriptArea.find('.able-transcript-seekpoint').length) {
						this.$transcriptSeekpoints = this.$transcriptArea.find('.able-transcript-seekpoint');
						return true;
					}
				}
			}
		}
		return false;
	}

	AblePlayer.prototype.setupManualTranscript = function() {

		// Add an auto-scroll checkbox to the toolbar

		this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
		this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);

	};

	AblePlayer.prototype.updateTranscript = function() {

		if (!this.transcriptType) {
			return;
		}

		if (this.transcriptType === 'external' || this.transcriptType === 'popup') {

			var chapters, captions, descriptions;

			// Language of transcript might be different than language of captions
			// But both are in sync by default
			if (this.transcriptLang) {
				captions = this.transcriptCaptions.cues;
			}
			else {
				if (this.transcriptCaptions) {
					this.transcriptLang = this.transcriptCaptions.language;
					captions = this.transcriptCaptions.cues;
				}
				else if (this.selectedCaptions) {
					this.transcriptLang = this.captionLang;
					captions = this.selectedCaptions.cues;
				}
			}

			// setup chapters
			if (this.transcriptChapters) {
				chapters = this.transcriptChapters.cues;
			}
			else if (this.chapters.length > 0) {
				// Try and match the caption language.
				if (this.transcriptLang) {
					for (var i = 0; i < this.chapters.length; i++) {
						if (this.chapters[i].language === this.transcriptLang) {
							chapters = this.chapters[i].cues;
						}
					}
				}
				if (typeof chapters === 'undefined') {
					chapters = this.chapters[0].cues || [];
				}
			}

			// setup descriptions
			if (this.transcriptDescriptions) {
				descriptions = this.transcriptDescriptions.cues;
			}
			else if (this.descriptions.length > 0) {
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

			var div = this.generateTranscript(chapters || [], captions || [], descriptions || []);

			this.$transcriptDiv.html(div);
			// reset transcript selected <option> to this.transcriptLang
			if (this.$transcriptLanguageSelect) {
				this.$transcriptLanguageSelect.find('option:selected').prop('selected',false);
				this.$transcriptLanguageSelect.find('option[lang=' + this.transcriptLang + ']').prop('selected',true);
			}
		}

		var thisObj = this;

		// Make transcript tabbable if preference is turned on.
		if (this.prefTabbable === 1) {
			this.$transcriptDiv.find('span.able-transcript-seekpoint').attr('tabindex','0');
		}

		// handle clicks on text within transcript
		// Note: This event listeners handles clicks only, not keydown events
		// Pressing Enter on an element that is not natively clickable does NOT trigger click()
		// Keydown events are handled elsehwere, both globally (ableplayer-base.js) and locally (event.js)
		if (this.$transcriptArea.length > 0) {
			this.$transcriptArea.find('span.able-transcript-seekpoint').click(function(e) {
				thisObj.seekTrigger = 'transcript';
				var spanStart = parseFloat($(this).attr('data-start'));
				// Add a tiny amount so that we're inside the span.
				spanStart += .01;
				// Each click within the transcript triggers two click events (not sure why)
				// this.seekingFromTranscript is a stopgab to prevent two calls to SeekTo()
				if (!thisObj.seekingFromTranscript) {
					thisObj.seekingFromTranscript = true;
					thisObj.seekTo(spanStart);
				}
				else {
					// don't seek a second time, but do reset var
					thisObj.seekingFromTranscript = false;
				}
			});
		}
	};

	AblePlayer.prototype.highlightTranscript = function (currentTime) {

		//show highlight in transcript marking current caption

		if (!this.transcriptType) {
			return;
		}

		var start, end, isChapterHeading;
		var thisObj = this;

		currentTime = parseFloat(currentTime);

		// Highlight the current transcript item.
		this.$transcriptArea.find('span.able-transcript-seekpoint').each(function() {
			start = parseFloat($(this).attr('data-start'));
			end = parseFloat($(this).attr('data-end'));
			// be sure this isn't a chapter (don't highlight chapter headings)
			if ($(this).parent().hasClass('able-transcript-chapter-heading')) {
				isChapterHeading = true;
			}
			else {
				isChapterHeading = false;
			}

			if (currentTime >= start && currentTime <= end && !isChapterHeading) {

  		  // If this item isn't already highlighted, it should be
  		  if (!($(this).hasClass('able-highlight'))) {
  				// remove all previous highlights before adding one to current span
          thisObj.$transcriptArea.find('.able-highlight').removeClass('able-highlight');
          $(this).addClass('able-highlight');
          thisObj.movingHighlight = true;
        }
        return false;
			}
		});
		thisObj.currentHighlight = thisObj.$transcriptArea.find('.able-highlight');
		if (thisObj.currentHighlight.length === 0) {
			// Nothing highlighted.
			thisObj.currentHighlight = null;
		}
	};

	AblePlayer.prototype.generateTranscript = function(chapters, captions, descriptions) {

		var thisObj = this;

		var $main = $('<div class="able-transcript-container"></div>');
		var transcriptTitle;

		// set language for transcript container
		$main.attr('lang', this.transcriptLang);

		if (typeof this.transcriptTitle !== 'undefined') {
			transcriptTitle = this.transcriptTitle;
		}
		else if (this.lyricsMode) {
			transcriptTitle = this.tt.lyricsTitle;
		}
		else {
			transcriptTitle = this.tt.transcriptTitle;
		}

		if (typeof this.transcriptDivLocation === 'undefined') {
			// only add an HTML heading to internal transcript
			// external transcript is expected to have its own heading
			var headingNumber = this.playerHeadingLevel;
			headingNumber += 1;
			var chapterHeadingNumber = headingNumber + 1;

			if (headingNumber <= 6) {
				var transcriptHeading = 'h' + headingNumber.toString();
			}
			else {
				var transcriptHeading = 'div';
			}
			// var transcriptHeadingTag = '<' + transcriptHeading + ' class="able-transcript-heading">';
			var $transcriptHeadingTag = $('<' + transcriptHeading + '>');
			$transcriptHeadingTag.addClass('able-transcript-heading');
			if (headingNumber > 6) {
				$transcriptHeadingTag.attr({
					'role': 'heading',
					'aria-level': headingNumber
				});
			}
			$transcriptHeadingTag.text(transcriptTitle);

			// set language of transcript heading to language of player
			// this is independent of language of transcript
			$transcriptHeadingTag.attr('lang', this.lang);

			$main.append($transcriptHeadingTag);
		}

		var nextChapter = 0;
		var nextCap = 0;
		var nextDesc = 0;

		var addChapter = function(div, chap) {

			if (chapterHeadingNumber <= 6) {
				var chapterHeading = 'h' + chapterHeadingNumber.toString();
			}
			else {
				var chapterHeading = 'div';
			}

			var $chapterHeadingTag = $('<' + chapterHeading + '>',{
				'class': 'able-transcript-chapter-heading'
			});
			if (chapterHeadingNumber > 6) {
				$chapterHeadingTag.attr({
					'role': 'heading',
					'aria-level': chapterHeadingNumber
				});
			}

			var flattenComponentForChapter = function(comp) {

				var result = [];
				if (comp.type === 'string') {
					result.push(comp.value);
				}
				else {
					for (var i = 0; i < comp.children.length; i++) {
						result = result.concat(flattenComponentForChapter(comp.children[i]));
					}
				}
				return result;
			}

			var $chapSpan = $('<span>',{
				'class': 'able-transcript-seekpoint'
			});
			for (var i = 0; i < chap.components.children.length; i++) {
				var results = flattenComponentForChapter(chap.components.children[i]);
				for (var jj = 0; jj < results.length; jj++) {
					$chapSpan.append(results[jj]);
				}
			}
			$chapSpan.attr('data-start', chap.start.toString());
			$chapSpan.attr('data-end', chap.end.toString());
			$chapterHeadingTag.append($chapSpan);

			div.append($chapterHeadingTag);
		};

		var addDescription = function(div, desc) {
			var $descDiv = $('<div>', {
				'class': 'able-transcript-desc'
			});
			var $descHiddenSpan = $('<span>',{
				'class': 'able-hidden'
			});
			$descHiddenSpan.attr('lang', thisObj.lang);
			$descHiddenSpan.text(thisObj.tt.prefHeadingDescription + ': ');
			$descDiv.append($descHiddenSpan);

			var flattenComponentForDescription = function(comp) {

				var result = [];
				if (comp.type === 'string') {
					result.push(comp.value);
				}
				else {
					for (var i = 0; i < comp.children.length; i++) {
						result = result.concat(flattenComponentForDescription(comp.children[i]));
					}
				}
				return result;
			}

			var $descSpan = $('<span>',{
				'class': 'able-transcript-seekpoint'
			});
			for (var i = 0; i < desc.components.children.length; i++) {
				var results = flattenComponentForDescription(desc.components.children[i]);
				for (var jj = 0; jj < results.length; jj++) {
					$descSpan.append(results[jj]);
				}
			}
			$descSpan.attr('data-start', desc.start.toString());
			$descSpan.attr('data-end', desc.end.toString());
			$descDiv.append($descSpan);

			div.append($descDiv);
		};

		var addCaption = function(div, cap) {

			var $capSpan = $('<span>',{
				'class': 'able-transcript-seekpoint able-transcript-caption'
			});

			var flattenComponentForCaption = function(comp) {

				var result = [];

				var parts = 0;

				var flattenString = function (str) {

					parts++;

					var flatStr;
					var result = [];
					if (str === '') {
						return result;
					}

					var openBracket = str.indexOf('[');
					var closeBracket = str.indexOf(']');
					var openParen = str.indexOf('(');
					var closeParen = str.indexOf(')');

					var hasBrackets = openBracket !== -1 && closeBracket !== -1;
					var hasParens = openParen !== -1 && closeParen !== -1;

					if (hasParens || hasBrackets) {
						if (parts > 1) {
							// force a line break between sections that contain parens or brackets
							var silentSpanBreak = '<br/>';
						}
						else {
							var silentSpanBreak = '';
						}
						var silentSpanOpen = silentSpanBreak + '<span class="able-unspoken">';
						var silentSpanClose = '</span>';
						if (hasParens && hasBrackets) {
							// string has both!
							if (openBracket < openParen) {
								// brackets come first. Parse parens separately
								hasParens = false;
							}
							else {
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
					}
					else if (hasBrackets) {
						flatStr = str.substring(0, openBracket);
						flatStr += silentSpanOpen;
						flatStr += str.substring(openBracket, closeBracket + 1);
						flatStr += silentSpanClose;
						flatStr += flattenString(str.substring(closeBracket + 1));
						result.push(flatStr);
					}
					else {
						result.push(str);
					}
					return result;
				};

				if (comp.type === 'string') {
					result = result.concat(flattenString(comp.value));
				}
				else if (comp.type === 'v') {
					var $vSpan = $('<span>',{
						'class': 'able-unspoken'
					});
					$vSpan.text('(' + comp.value + ')');
					result.push($vSpan);
					for (var i = 0; i < comp.children.length; i++) {
						var subResults = flattenComponentForCaption(comp.children[i]);
						for (var jj = 0; jj < subResults.length; jj++) {
							result.push(subResults[jj]);
						}
					}
				}
				else if (comp.type === 'b' || comp.type === 'i') {
					if (comp.type === 'b') {
						var $tag = $('<strong>');
					}
					else if (comp.type === 'i') {
						var $tag = $('<em>');
					}
					for (var i = 0; i < comp.children.length; i++) {
						var subResults = flattenComponentForCaption(comp.children[i]);
						for (var jj = 0; jj < subResults.length; jj++) {
							$tag.append(subResults[jj]);
						}
					}
					if (comp.type === 'b' || comp.type == 'i') {
						result.push($tag,' ');
					}
				}
				else {
					for (var i = 0; i < comp.children.length; i++) {
						result = result.concat(flattenComponentForCaption(comp.children[i]));
					}
				}
				return result;
			};

			for (var i = 0; i < cap.components.children.length; i++) {
				var results = flattenComponentForCaption(cap.components.children[i]);
				for (var jj = 0; jj < results.length; jj++) {
					var result = results[jj];
					if (typeof result === 'string') {
						if (thisObj.lyricsMode) {
							// add <br> BETWEEN each caption and WITHIN each caption (if payload includes "\n")
							result = result.replace('\n','<br>') + '<br>';
						}
						else {
							// just add a space between captions
							result += ' ';
						}
					}
					$capSpan.append(result);
				}
			}
			$capSpan.attr('data-start', cap.start.toString());
			$capSpan.attr('data-end', cap.end.toString());
			div.append($capSpan);
			div.append(' \n');
		};

		// keep looping as long as any one of the three arrays has content
		while ((nextChapter < chapters.length) || (nextDesc < descriptions.length) || (nextCap < captions.length)) {

			if ((nextChapter < chapters.length) && (nextDesc < descriptions.length) && (nextCap < captions.length)) {
				// they all three have content
				var firstStart = Math.min(chapters[nextChapter].start,descriptions[nextDesc].start,captions[nextCap].start);
			}
			else if ((nextChapter < chapters.length) && (nextDesc < descriptions.length)) {
				// chapters & descriptions have content
				var firstStart = Math.min(chapters[nextChapter].start,descriptions[nextDesc].start);
			}
			else if ((nextChapter < chapters.length) && (nextCap < captions.length)) {
				// chapters & captions have content
				var firstStart = Math.min(chapters[nextChapter].start,captions[nextCap].start);
			}
			else if ((nextDesc < descriptions.length) && (nextCap < captions.length)) {
				// descriptions & captions have content
				var firstStart = Math.min(descriptions[nextDesc].start,captions[nextCap].start);
			}
			else {
				var firstStart = null;
			}
			if (firstStart !== null) {
				if (typeof chapters[nextChapter] !== 'undefined' && chapters[nextChapter].start === firstStart) {
					addChapter($main, chapters[nextChapter]);
					nextChapter += 1;
				}
				else if (typeof descriptions[nextDesc] !== 'undefined' && descriptions[nextDesc].start === firstStart) {
					addDescription($main, descriptions[nextDesc]);
					nextDesc += 1;
				}
				else {
					addCaption($main, captions[nextCap]);
					nextCap += 1;
				}
			}
			else {
				if (nextChapter < chapters.length) {
					addChapter($main, chapters[nextChapter]);
					nextChapter += 1;
				}
				else if (nextDesc < descriptions.length) {
					addDescription($main, descriptions[nextDesc]);
					nextDesc += 1;
				}
				else if (nextCap < captions.length) {
					addCaption($main, captions[nextCap]);
					nextCap += 1;
				}
			}
		}
		// organize transcript into blocks using [] and () as starting points
		var $components = $main.children();
		var spanCount = 0;
		var openBlock = true;
		$components.each(function() {
			if ($(this).hasClass('able-transcript-caption')) {
				if ($(this).text().indexOf('[') !== -1 || $(this).text().indexOf('(') !== -1) {
					// this caption includes a bracket or parenth. Start a new block
					// close the previous block first
					if (spanCount > 0) {
						$main.find('.able-block-temp').removeClass('able-block-temp').wrapAll('<div class="able-transcript-block"></div>');
						spanCount = 0;
					}
				}
				$(this).addClass('able-block-temp');
				spanCount++;
			}
			else {
				// this is not a caption. Close the caption block
				if (spanCount > 0) {
					$main.find('.able-block-temp').removeClass('able-block-temp').wrapAll('<div class="able-transcript-block"></div>');
					spanCount = 0;
				}
			}
		});
		return $main;
	};

})(jQuery);

(function ($) {
	AblePlayer.prototype.showSearchResults = function() {

		// search VTT file for all instances of searchTerms
		// Currently just supports search terms separated with one or more spaces

		// TODO: Add support for more robust search syntax:
		// Search terms wrapped in quotation marks ("") must occur exactly as they appear in the quotes
		// Search terms with an attached minus sign (e.g., -term) are to be excluded from results
		// Boolean AND/OR operators
		// ALSO: Add localization support

		var thisObj = this;
		if (this.searchDiv && this.searchString) {
			if ($('#' + this.SearchDiv)) {
  			var searchStringHtml = '<p>' + this.tt.resultsSummary1 + ' ';
  			searchStringHtml += '<span id="able-search-term-echo">' + this.searchString + '</span>';
  			searchStringHtml += '</p>';
				var resultsArray = this.searchFor(this.searchString);
				if (resultsArray.length > 0) {
					var $resultsSummary = $('<p>',{
						'class': 'able-search-results-summary'
					});
					var resultsSummaryText = this.tt.resultsSummary2;
					resultsSummaryText += ' <strong>' + resultsArray.length + '</strong> ';
					resultsSummaryText += this.tt.resultsSummary3 + ' ';
					resultsSummaryText += this.tt.resultsSummary4;
					$resultsSummary.html(resultsSummaryText);
					var $resultsList = $('<ul>');
					for (var i = 0; i < resultsArray.length; i++) {
  					var resultId = 'aria-search-result-' + i;
						var $resultsItem = $('<li>',{});
						var itemStartTime = this.secondsToTime(resultsArray[i]['start']);
						var itemLabel = this.tt.searchButtonLabel + ' ' + itemStartTime['title'];
						var itemStartSpan = $('<button>',{
							'class': 'able-search-results-time',
							'data-start': resultsArray[i]['start'],
							'title': itemLabel,
							'aria-label': itemLabel,
							'aria-describedby': resultId
						});
						itemStartSpan.text(itemStartTime['value']);
						// add a listener for clisk on itemStart
						itemStartSpan.on('click',function(e) {
              thisObj.seekTrigger = 'search';
							var spanStart = parseFloat($(this).attr('data-start'));
							// Add a tiny amount so that we're inside the span.
							spanStart += .01;
							thisObj.seeking = true;
							thisObj.seekTo(spanStart);
						});

						var itemText = $('<span>',{
							'class': 'able-search-result-text',
							'id': resultId
						})
						itemText.html('...' + resultsArray[i]['caption'] + '...');
						$resultsItem.append(itemStartSpan, itemText);
						$resultsList.append($resultsItem);
					}
					$('#' + this.searchDiv).append(searchStringHtml,$resultsSummary,$resultsList);
				}
				else {
					var noResults = $('<p>').text(this.tt.noResultsFound);
					$('#' + this.searchDiv).append(noResults);
				}
			}
		}
	};

	AblePlayer.prototype.searchFor = function(searchString) {

		// return chronological array of caption cues that match searchTerms
		var captionLang, captions, results, caption, c, i, j;
		results = [];
		// split searchTerms into an array
		var searchTerms = searchString.split(' ');
		if (this.captions.length > 0) {
			// Get caption track that matches this.searchLang
			for (i=0; i < this.captions.length; i++) {
				if (this.captions[i].language === this.searchLang) {
					captionLang = this.searchLang;
					captions = this.captions[i].cues;
				}
			}
			if (captions.length > 0) {
				c = 0;
				for (i = 0; i < captions.length; i++) {
					if ($.inArray(captions[i].components.children[0]['type'], ['string','i','b','u','v','c']) !== -1) {
						caption = this.flattenCueForCaption(captions[i]);
						for (j = 0; j < searchTerms.length; j++) {
							if (caption.indexOf(searchTerms[j]) !== -1) {
								results[c] = [];
								results[c]['start'] = captions[i].start;
								results[c]['lang'] = captionLang;
								results[c]['caption'] = this.highlightSearchTerm(searchTerms,j,caption);
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

	AblePlayer.prototype.highlightSearchTerm = function(searchTerms, index, resultString) {

		// highlight ALL found searchTerms in the current resultString
		// index is the first index in the searchTerm array where a match has already been found
		// Need to step through the remaining terms to see if they're present as well

		var i, searchTerm, termIndex, termLength, str1, str2, str3;

		for (i=index; i<searchTerms.length; i++) {

			searchTerm = searchTerms[i];
			termIndex = resultString.indexOf(searchTerm);
			if (termIndex !== -1) {
				termLength = searchTerm.length;
				if (termLength > 0) {
					str1 = resultString.substring(0, termIndex);
					str2 = '<span class="able-search-term">' + searchTerm + '</span>';
					str3 = resultString.substring(termIndex+termLength);
					resultString = str1 + str2 + str3;
				}
				else {
					str1 = '<span class="able-search-term">' + searchTerm + '</span>';
					str2 = resultString.substring(termIndex+termLength);
					resultString = str1 + str2;
				}
			}
		}
		return resultString;
	};

	AblePlayer.prototype.secondsToTime = function(totalSeconds) {

		// return an array of totalSeconds converted into two formats
		// time['value'] = HH:MM:SS with hours dropped if there are none
		// time['title'] = a speakable rendering, so speech rec users can easily speak the link

		// first, round down to nearest second
		var totalSeconds = Math.floor(totalSeconds);

		var hours = parseInt( totalSeconds / 3600 , 10) % 24;
		var minutes = parseInt( totalSeconds / 60 , 10) % 60;
		var seconds = totalSeconds % 60;
		var value = '';
		var title = '';
		if (hours > 0) {
			value += hours + ':';
      if (hours == 1) {
  			title += '1 ' + this.tt.hour + ' ';
      }
      else {
  			title += hours + ' ' + this.tt.hours + ' ';
		  }
		}
		if (minutes < 10) {
			value += '0' + minutes + ':';
			if (minutes > 0) {
  			if (minutes == 1) {
  				title += '1 ' + this.tt.minute + ' ';
        }
        else {
  				title += minutes + ' ' + this.tt.minutes + ' ';
        }
			}
		}
		else {
			value += minutes + ':';
			title += minutes + ' ' + this.tt.minutes + ' ';
		}
		if (seconds < 10) {
			value += '0' + seconds;
			if (seconds > 0) {
  			if (seconds == 1) {
  				title += '1 ' + this.tt.second + ' ';
  			}
  			else {
  				title += seconds + ' ' + this.tt.seconds + ' ';
        }
			}
		}
		else {
			value += seconds;
			title += seconds + ' ' + this.tt.seconds + ' ';
		}
		var time = [];
		time['value'] = value;
		time['title'] = title;
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
			if (thisObj.swappingSrc && (typeof thisObj.swapTime !== 'undefined')) {
				if (thisObj.swapTime === thisObj.elapsed) {
					// described version been swapped and media has scrubbed to time of previous version
					if (thisObj.playing) {
						// resume playback
						thisObj.playMedia();
						// reset vars
						thisObj.swappingSrc = false;
						thisObj.swapTime = null;
					}
				}
			}
      else {
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
				}
				else {
  				this.playing = false;
  				this.paused = true;
				}
			}
			else {
				// this is not the last track. Play the next one.
				this.playlistIndex++;
				this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
				this.cuePlaylistItem(this.playlistIndex)
			}
		}
		this.refreshControls('init');
	};

	AblePlayer.prototype.onMediaNewSourceLoad = function () {

		if (this.cueingPlaylistItem) {
			// this variable was set in order to address bugs caused by multiple firings of media 'end' event
			// safe to reset now
			this.cueingPlaylistItem = false;
		}
		if (this.swappingSrc === true) {
			// new source file has just been loaded
			if (this.swapTime > 0) {
				// this.swappingSrc will be set to false after seek is complete
				// see onMediaUpdateTime()
				this.seekTo(this.swapTime);
			}
			else {
				if (this.playing) {
					// should be able to resume playback
					this.playMedia();
				}
				this.swappingSrc = false; // swapping is finished
			}
		}
		this.refreshControls('init');
	};

	// End Media events

	AblePlayer.prototype.onWindowResize = function () {

		if (this.fullscreen) { // replace isFullscreen() with a Boolean. see function for explanation

			var newWidth, newHeight;

			newWidth = $(window).width();

			// haven't isolated why, but some browsers return an innerHeight that's 20px too tall in fullscreen mode
			// Test results:
			// Browsers that require a 20px adjustment: Firefox, IE11 (Trident), Edge
			if (this.isUserAgent('Firefox') || this.isUserAgent('Trident') || this.isUserAgent('Edge')) {
				newHeight = window.innerHeight - this.$playerDiv.outerHeight() - 20;
			}
			else if (window.outerHeight >= window.innerHeight) {
				// Browsers that do NOT require adjustment: Chrome, Safari, Opera, MSIE 10
				newHeight = window.innerHeight - this.$playerDiv.outerHeight();
			}
			else {
				// Observed in Safari 9.0.1 on Mac OS X: outerHeight is actually less than innerHeight
				// Maybe a bug, or maybe window.outerHeight is already adjusted for controller height(?)
				// No longer observed in Safari 9.0.2
				newHeight = window.outerHeight;
			}
			if (!this.$descDiv.is(':hidden')) {
				newHeight -= this.$descDiv.height();
			}
			this.positionCaptions('overlay');
		}
		else { // not fullscreen
			if (this.restoringAfterFullScreen) {
				newWidth = this.preFullScreenWidth;
				newHeight = this.preFullScreenHeight;
			}
			else {
				// not restoring after full screen
				newWidth = this.$ableWrapper.width();
				if (typeof this.aspectRatio !== 'undefined') {
					newHeight = Math.round(newWidth / this.aspectRatio);
				}
				else {
					// not likely, since this.aspectRatio is defined during intialization
					// however, this is a fallback scenario just in case
					newHeight = this.$ableWrapper.height();
				}
				this.positionCaptions(); // reset with this.prefCaptionsPosition
			}
		}
		this.resizePlayer(newWidth, newHeight);
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
			thisObj.refreshControls('init');
		}).on('stopTracking', function (e, position) {
			if (thisObj.useChapterTimes) {
				thisObj.seekTo(thisObj.convertChapterTimeToVideoTime(position));
			}
			else {
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

		// TODO: This is super-fragile since we need to know the length of the class name to split off; update this to other way of dispatching?

		var whichButton, prefsPopup;
		whichButton = $(el).attr('class').split(' ')[0].substr(20);
		if (whichButton === 'play') {
  		this.clickedPlay = true;
			this.handlePlay();
		}
		else if (whichButton === 'restart') {
			this.seekTrigger = 'restart';
			this.handleRestart();
		}
		else if (whichButton === 'previous') {
  		this.userClickedPlaylist = true;
			this.seekTrigger = 'previous';
			this.buttonWithFocus = 'previous';
			this.handlePrevTrack();
		}
		else if (whichButton === 'next') {
  		this.userClickedPlaylist = true;
			this.seekTrigger = 'next';
			this.buttonWithFocus = 'next';
			this.handleNextTrack();
		}
		else if (whichButton === 'rewind') {
			this.seekTrigger = 'rewind';
			this.handleRewind();
		}
		else if (whichButton === 'forward') {
			this.seekTrigger = 'forward';
			this.handleFastForward();
		}
		else if (whichButton === 'mute') {
			this.handleMute();
		}
		else if (whichButton === 'volume') {
			this.handleVolume();
		}
		else if (whichButton === 'faster') {
			this.handleRateIncrease();
		}
		else if (whichButton === 'slower') {
			this.handleRateDecrease();
		}
		else if (whichButton === 'captions') {
			this.handleCaptionToggle();
		}
		else if (whichButton === 'chapters') {
			this.handleChapters();
		}
		else if (whichButton === 'descriptions') {
			this.handleDescriptionToggle();
		}
		else if (whichButton === 'sign') {
  		if (!this.closingSign) {
  			this.handleSignToggle();
  		}
		}
		else if (whichButton === 'preferences') {
      if ($(el).attr('data-prefs-popup') === 'menu') {
  			this.handlePrefsClick();
  		}
  		else {
    		this.showingPrefsDialog = true; // stopgap
        this.closePopups();
    		prefsPopup = $(el).attr('data-prefs-popup');
        if (prefsPopup === 'keyboard') {
				  this.keyboardPrefsDialog.show();
				}
        else if (prefsPopup === 'captions') {
				  this.captionPrefsDialog.show();
				}
        else if (prefsPopup === 'descriptions') {
				  this.descPrefsDialog.show();
				}
        else if (prefsPopup === 'transcript') {
				  this.transcriptPrefsDialog.show();
				}
        this.showingPrefsDialog = false;
  		}
		}
		else if (whichButton === 'help') {
			this.handleHelpClick();
		}
		else if (whichButton === 'transcript') {
      if (!this.closingTranscript) {
  			this.handleTranscriptToggle();
  		}
		}
		else if (whichButton === 'fullscreen') {
			this.clickedFullscreenButton = true;
			this.handleFullscreenToggle();
		}
	};

	AblePlayer.prototype.okToHandleKeyPress = function () {

		// returns true unless user's focus is on a UI element
		// that is likely to need supported keystrokes, including space

		var activeElement = AblePlayer.getActiveDOMElement();

		if ($(activeElement).prop('tagName') === 'INPUT') {
			return false;
		}
		else {
			return true;
		}
	};

	AblePlayer.prototype.onPlayerKeyPress = function (e) {

		// handle keystrokes (using DHTML Style Guide recommended key combinations)
		// https://web.archive.org/web/20130127004544/http://dev.aol.com/dhtml_style_guide/#mediaplayer
		// Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
		// NOTE #1: Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
		// The rest are reasonable best choices
		// NOTE #2: If there are multiple players on a single page, keystroke handlers
		// are only bound to the FIRST player
		// NOTE #3: The DHTML Style Guide is now the W3C WAI-ARIA Authoring Guide and has undergone many revisions
		// including removal of the "media player" design pattern. There's an issue about that:
		// https://github.com/w3c/aria-practices/issues/27

		var which, $thisElement;

		// Convert to lower case.
		which = e.which;
		if (which >= 65 && which <= 90) {
			which += 32;
		}
		$thisElement = $(document.activeElement);

    if (which === 27) { // escape

      if ($.contains(this.$transcriptArea[0],$thisElement[0])) {

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
			if (which === 27) { // escape

				this.closePopups();
			}
			else if (which === 32) { // spacebar = play/pause
  			// disable spacebar support for play/pause toggle as of 4.2.10
  			// spacebar should not be handled everywhere on the page, since users use that to scroll the page
  			// when the player has focus, most controls are buttons so spacebar should be used to trigger the buttons
				if ($thisElement.attr('role') === 'button') {
					// register a click on this element
					e.preventDefault();
					$thisElement.click();
				}
			}
			else if (which === 112) { // p = play/pause
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handlePlay();
				}
			}
			else if (which === 115) { // s = stop (now restart)
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleRestart();
				}
			}
			else if (which === 109) { // m = mute
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleMute();
				}
			}
			else if (which === 118) { // v = volume
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleVolume();
				}
			}
			else if (which >= 49 && which <= 57) { // set volume 1-9
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleVolume(which);
				}
			}
			else if (which === 99) { // c = caption toggle
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleCaptionToggle();
				}
			}
			else if (which === 100) { // d = description
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleDescriptionToggle();
				}
			}
			else if (which === 102) { // f = forward
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleFastForward();
				}
			}
			else if (which === 114) { // r = rewind
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleRewind();
				}
			}
			else if (which === 98) { // b = back (previous track)
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handlePrevTrack();
				}
			}
			else if (which === 110) { // n = next track
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handleNextTrack();
				}
			}
			else if (which === 101) { // e = preferences
				if (this.usingModifierKeys(e)) {
  				e.preventDefault();
					this.handlePrefsClick();
				}
			}
			else if (which === 13) { // Enter
				if ($thisElement.attr('role') === 'button' || $thisElement.prop('tagName') === 'SPAN') {
					// register a click on this element
					// if it's a transcript span the transcript span click handler will take over
					$thisElement.click();
				}
				else if ($thisElement.prop('tagName') === 'LI') {
					$thisElement.click();
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
				thisObj.onMediaNewSourceLoad();
			})
			.on('canplay',function() {
				// previously handled seeking to startTime here
				// but it's probably safer to wait for canplaythrough
				// so we know player can seek ahead to anything
			})
			.on('canplaythrough',function() {
  		  if (thisObj.playbackRate) {
          // user has set playbackRate on a previous src or track
          // use that setting on the new src or track too
          thisObj.setPlaybackRate(thisObj.playbackRate);
  		  }
				if (thisObj.userClickedPlaylist) {
					if (!thisObj.startedPlaying) {
						// start playing; no further user action is required
						thisObj.playMedia();
				 	}
					thisObj.userClickedPlaylist = false; // reset
				}
				if (thisObj.seekTrigger == 'restart' ||
				    thisObj.seekTrigger == 'chapter' ||
				    thisObj.seekTrigger == 'transcript' ||
				    thisObj.seekTrigger == 'search'
            ) {
					// by clicking on any of these elements, user is likely intending to play
					// Not included: elements where user might click multiple times in succession
					// (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
					thisObj.playMedia();
				}
				else if (!thisObj.startedPlaying) {
					if (thisObj.startTime > 0) {
						if (thisObj.seeking) {
							// a seek has already been initiated
							// since canplaythrough has been triggered, the seek is complete
							thisObj.seeking = false;
							if (thisObj.autoplay || thisObj.okToPlay) {
								thisObj.playMedia();
							}
						}
						else {
							// haven't started seeking yet
							thisObj.seekTo(thisObj.startTime);
						}
					}
					else if (thisObj.defaultChapter && typeof thisObj.selectedChapters !== 'undefined') {
						thisObj.seekToChapter(thisObj.defaultChapter);
					}
					else {
						// there is no startTime, therefore no seeking required
						if (thisObj.autoplay || thisObj.okToPlay) {
							thisObj.playMedia();
						}
					}
				}
				else if (thisObj.hasPlaylist) {
					if ((thisObj.playlistIndex !== thisObj.$playlist.length) || thisObj.loop) {
						// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
						thisObj.playMedia();
					}
				}
				else {
					// already started playing
					// we're here because a new media source has been loaded and is ready to resume playback
					thisObj.getPlayerState().then(function(currentState) {
						if (thisObj.swappingSrc && (currentState === 'stopped' || currentState === 'paused')) {
							thisObj.startedPlaying = false;
							if (thisObj.swapTime > 0) {
								thisObj.seekTo(thisObj.swapTime);
							}
							else {
								thisObj.playMedia();
							}
						}
					});
				}
			})
			.on('play',function() {
				// both 'play' and 'playing' seem to be fired in all browsers (including IE11)
				// therefore, doing nothing here & doing everything when 'playing' is triggered
				 thisObj.refreshControls('playpause');
			})
			.on('playing',function() {
				thisObj.playing = true;
				thisObj.paused = false;
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
				 // do something
				 // previously called refreshControls() here but this event probably doesn't warrant a refresh
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
					}
					else {
						thisObj.playing = false;
						thisObj.paused = true;
					}
				}
				else {
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
				if (thisObj.debug) {
					
				}
			})
			.on('error',function() {
				if (thisObj.debug) {
					switch (thisObj.media.error.code) {
						case 1:
							
							break;
						case 2:
							
							break;
						case 3:
							
							break;
						case 4:
							
							break;
					}
				}
			});
	};

	AblePlayer.prototype.addVimeoListeners = function () {

// The following content is orphaned. It was in 'canplaythrough' but there's no equivalent event in Vimeo.
// Maybe it should go under 'loaded' or 'progress' ???
/*
				if (thisObj.userClickedPlaylist) {
					if (!thisObj.startedPlaying) {
							// start playing; no further user action is required
						thisObj.playMedia();
				 		}
					thisObj.userClickedPlaylist = false; // reset
				}
				if (thisObj.seekTrigger == 'restart' || thisObj.seekTrigger == 'chapter' || thisObj.seekTrigger == 'transcript') {
					// by clicking on any of these elements, user is likely intending to play
					// Not included: elements where user might click multiple times in succession
					// (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
					thisObj.playMedia();
				}
				else if (!thisObj.startedPlaying) {
					if (thisObj.startTime > 0) {
						if (thisObj.seeking) {
							// a seek has already been initiated
							// since canplaythrough has been triggered, the seek is complete
							thisObj.seeking = false;
							if (thisObj.autoplay || thisObj.okToPlay) {
								thisObj.playMedia();
							}
						}
						else {
							// haven't started seeking yet
							thisObj.seekTo(thisObj.startTime);
						}
					}
					else if (thisObj.defaultChapter && typeof thisObj.selectedChapters !== 'undefined') {
						thisObj.seekToChapter(thisObj.defaultChapter);
					}
					else {
						// there is no startTime, therefore no seeking required
						if (thisObj.autoplay || thisObj.okToPlay) {
							thisObj.playMedia();
						}
					}
				}
				else if (thisObj.hasPlaylist) {
					if ((thisObj.playlistIndex !== thisObj.$playlist.length) || thisObj.loop) {
						// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
						thisObj.playMedia();
					}
				}
				else {
					// already started playing
					// we're here because a new media source has been loaded and is ready to resume playback
					thisObj.getPlayerState().then(function(currentState) {
						if (thisObj.swappingSrc && currentState === 'stopped') {
							// Safari is the only browser that returns value of 'stopped' (observed in 12.0.1 on MacOS)
							// This prevents 'timeupdate' events from triggering, which prevents the new media src
							// from resuming playback at swapTime
							// This is a hack to jump start Safari
							thisObj.startedPlaying = false;
							if (thisObj.swapTime > 0) {
								thisObj.seekTo(thisObj.swapTime);
							}
							else {
								thisObj.playMedia();
							}
						}
					});
				}

*/

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
				}
				else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
			}
			else {
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

		var thisObj, whichButton, thisElement;

		// Save the current object context in thisObj for use with inner functions.
		thisObj = this;

		// Appropriately resize media player for full screen.
		$(window).resize(function () {
			thisObj.onWindowResize();
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
							thisObj.refreshControls('init');
						}
					}
				});
			});
			var config = { attributes: true, childList: true, characterData: true };
			observer.observe(target, config);
		}
		else {
			// browser doesn't support MutationObserver
			// TODO: Figure out an alternative solution for this rare use case in older browsers
			// See example in buildplayer.js > useSvg()
		}
		if (typeof this.seekBar !== 'undefined') {
			this.addSeekbarListeners();
		}
		else {
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
		$(document).on('click',function(e) {

			if (e.button !== 0) { // not a left click
				return false;
			}
			if ($('.able-popup:visible').length || $('.able-volume-popup:visible')) {
				// at least one popup is visible
				thisObj.closePopups();
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
			}
			else {
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
		$(document).keydown(function(e) {

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
			}
			else {
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
		// otherwise these are dispatched by global handler (see ableplayer-base,js)
		this.$ableDiv.keydown(function (e) {

			if (AblePlayer.nextIndex > 1) {
				thisObj.onPlayerKeyPress(e);
			}
		});

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
			this.$playlist.click(function(e) {
				if (!thisObj.userClickedPlaylist) {
					// stopgap in case multiple clicks are fired on the same playlist item
					thisObj.userClickedPlaylist = true; // will be set to false after new src is loaded & canplaythrough is triggered
					thisObj.playlistIndex = $(this).index();
					thisObj.cuePlaylistItem(thisObj.playlistIndex);
				}
			});
		}

		// Also play/pause when clicking on the media.
		this.$media.click(function () {
			thisObj.handlePlay();
		});

		// add listeners for media events
		if (this.player === 'html5') {
			this.addHtml5MediaListeners();
		}
		else if (this.player === 'vimeo') {
			 this.addVimeoListeners();
		}
		else if (this.player === 'youtube') {
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
		// Therefore, the drag & drop interface was overhauled in v2.3.41 to simple
		// use mouse (and keyboard) events to change CSS positioning properties

		// There are nevertheless lessons to be learned from Drag & Drop about accessibility:
		// http://dev.opera.com/articles/accessible-drag-and-drop/

		var thisObj, $window, $toolbar, windowName, $resizeHandle, resizeZIndex;

		thisObj = this;

		if (which === 'transcript') {
			$window = this.$transcriptArea;
			windowName = 'transcript-window';
			$toolbar = this.$transcriptToolbar;
		}
		else if (which === 'sign') {
			$window = this.$signWindow;
			windowName = 'sign-window';
			$toolbar = this.$signToolbar;
		}

		// add class to trigger change in cursor on hover
		$toolbar.addClass('able-draggable');

		// add resize handle selector to bottom right corner
		$resizeHandle = $('<div>',{
			'class': 'able-resizable'
		});
		// assign z-index that's slightly higher than parent window
		resizeZIndex = parseInt($window.css('z-index')) + 100;
		$resizeHandle.css('z-index',resizeZIndex);
		$window.append($resizeHandle);

		// add event listener to toolbar to start and end drag
		// other event listeners will be added when drag starts
		$toolbar.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart') {
  			if (!thisObj.windowMenuClickRegistered) {
	  			thisObj.windowMenuClickRegistered = true;
          thisObj.startMouseX = e.pageX;
          thisObj.startMouseY = e.pageY;
          thisObj.dragDevice = 'mouse'; // ok to use this even if device is a touchpad
          thisObj.startDrag(which, $window);
			  }
      }
      else if (e.type === 'mouseup' || e.type === 'touchend') {
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
      }
      else if (e.type === 'mouseup' || e.type === 'touchend') {
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

		var thisObj, $windowAlert, menuId, $newButton, $buttonIcon, buttonImgSrc, $buttonImg,
			$buttonLabel, tooltipId, $tooltip, $popup,
			label, position, buttonHeight, buttonWidth, tooltipY, tooltipX, tooltipStyle, tooltip,
			$optionList, menuBaseId, options, i, $optionItem, option, menuId;

		thisObj = this;

		// Add a Boolean that will be set to true temporarily if window button or a menu item is clicked
		// This will prevent the click event from also triggering a mousedown event on the toolbar
		// (which would unexpectedly send the window into drag mode)
		this.windowMenuClickRegistered = false;

		// Add another Boolean that will be set to true temporarily when mouseup fires at the end of a drag
		// this will prevent the click event from being triggered
		this.finishingDrag = false;

		// create an alert div and add it to window
		$windowAlert = $('<div role="alert"></div>');
		$windowAlert.addClass('able-alert');
		$windowAlert.hide();
		$windowAlert.appendTo(this.$activeWindow);
		$windowAlert.css({
			top: $window.offset().top
		});

		// add button to draggable window which triggers a popup menu
		// for now, re-use preferences icon for this purpose
		menuId = this.mediaId + '-' + windowName + '-menu';
		$newButton = $('<button>',{
			'type': 'button',
			'tabindex': '0',
			'aria-label': this.tt.windowButtonLabel,
			'aria-haspopup': 'true',
			'aria-controls': menuId,
			'class': 'able-button-handler-preferences'
		});
		if (this.iconType === 'font') {
			$buttonIcon = $('<span>',{
				'class': 'icon-preferences',
				'aria-hidden': 'true'
			});
			$newButton.append($buttonIcon);
		}
		else {
			// use image
			buttonImgSrc = this.rootPath + 'button-icons/' + this.toolbarIconColor + '/preferences.png';
			$buttonImg = $('<img>',{
				'src': buttonImgSrc,
				'alt': '',
				'role': 'presentation'
			});
			$newButton.append($buttonImg);
		}

		// add the visibly-hidden label for screen readers that don't support aria-label on the button
		$buttonLabel = $('<span>',{
			'class': 'able-clipped'
		}).text(this.tt.windowButtonLabel);
		$newButton.append($buttonLabel);

		// add a tooltip that displays aria-label on mouseenter or focus
		tooltipId = this.mediaId + '-' + windowName + '-tooltip';
		$tooltip = $('<div>',{
			'class' : 'able-tooltip',
			'id' : tooltipId
		}).hide();
		$newButton.on('mouseenter focus',function(e) {
			var label = $(this).attr('aria-label');
			// get position of this button
			var position = $(this).position();
			var buttonHeight = $(this).height();
			var buttonWidth = $(this).width();
			var tooltipY = position.top - buttonHeight - 5;
			var tooltipX = 0;
			var tooltipStyle = {
				left: '',
				right: tooltipX + 'px',
				top: tooltipY + 'px'
			};
			var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).css(tooltipStyle);
			thisObj.showTooltip(tooltip);
			$(this).on('mouseleave blur',function() {
				AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
			});
		});

		// setup popup menu
		$popup = this.setupPopups(windowName); // 'transcript-window' or 'sign-window'
		// define vars and assemble all the parts
		if (which === 'transcript') {
			this.$transcriptAlert = $windowAlert;
			this.$transcriptPopupButton = $newButton;
			this.$transcriptPopup = $popup;
			this.$transcriptToolbar.prepend($windowAlert,$newButton,$tooltip,$popup);
		}
		else if (which === 'sign') {
			this.$signAlert = $windowAlert;
			this.$signPopupButton = $newButton;
			this.$signPopup = $popup;
			this.$signToolbar.append($windowAlert,$newButton,$tooltip,$popup);
		}

		// handle button click
		$newButton.on('click mousedown keydown',function(e) {

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

	AblePlayer.prototype.addResizeDialog = function (which, $window) {

		var thisObj, $windowPopup, $windowButton,
			widthId, heightId, startingWidth, startingHeight, aspectRatio,
			$resizeForm, $resizeWrapper,
			$resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel,
			$resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel,
			tempWidth, tempHeight,
			$saveButton, $cancelButton, newWidth, newHeight, resizeDialog;

		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		widthId = this.mediaId + '-resize-' + which + '-width';
		heightId = this.mediaId + '-resize-' + which + '-height';
		startingWidth = $window.width();
		startingHeight = $window.height();
		aspectRatio = startingWidth / startingHeight;

		$resizeForm = $('<div></div>',{
			'class' : 'able-resize-form'
		});

		// inner container for all content, will be assigned to modal div's aria-describedby
		$resizeWrapper = $('<div></div>');

		// width field
		$resizeWidthDiv = $('<div></div>');
		$resizeWidthInput = $('<input>',{
			'type': 'text',
			'id': widthId,
			'value': startingWidth
		});
		$resizeWidthLabel = $('<label>',{
			'for': widthId
		}).text(this.tt.width);

		// height field
		$resizeHeightDiv = $('<div></div>');
		$resizeHeightInput = $('<input>',{
			'type': 'text',
			'id': heightId,
			'value': startingHeight
		});
		$resizeHeightLabel = $('<label>',{
			'for': heightId
		}).text(this.tt.height);

		if (which === 'sign') {
			// make height a read-only field
			// and calculate its value based on width to preserve aspect ratio
			$resizeHeightInput.prop('readonly',true);
			$resizeWidthInput.on('input',function() {
				tempWidth = $(this).val();
				tempHeight = Math.round(tempWidth/aspectRatio, 0);
				$resizeHeightInput.val(tempHeight);
			})
		}

		// Add save and cancel buttons.
		$saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
		$saveButton.on('click',function () {
			newWidth = $('#' + widthId).val();
			newHeight = $('#' + heightId).val();
			if (newWidth !== startingWidth || newHeight !== startingHeight) {
				thisObj.resizeObject(which,newWidth,newHeight);
				thisObj.updateCookie(which);
			}
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.focus();
		});
		$cancelButton.on('click',function () {
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.focus();
		});

		// Now assemble all the parts
		$resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
		$resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeForm.append($resizeWrapper,'<hr>',$saveButton,$cancelButton);

		// must be appended to the BODY!
		// otherwise when aria-hidden="true" is applied to all background content
		// that will include an ancestor of the dialog,
		// which will render the dialog unreadable by screen readers
		$('body').append($resizeForm);
		resizeDialog = new AccessibleDialog($resizeForm, $windowButton, 'alert', this.tt.windowResizeHeading, $resizeWrapper, this.tt.closeButtonLabel, '20em');
		if (which === 'transcript') {
			this.transcriptResizeDialog = resizeDialog;
		}
		else if (which === 'sign') {
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
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			$toolbar = this.$signToolbar;
		}

		if (e.type === 'keydown') {
			// user pressed a key
			if (e.which === 32 || e.which === 13) {
				// this was Enter or space
				this.windowMenuClickRegistered = true;
			}
			else if (e.which === 27) { // escape
        if ($windowPopup.is(':visible')) {
  				// close the popup menu
          $windowPopup.hide('fast', function() {
					  // also reset the Boolean
            thisObj.windowMenuClickRegistered = false;
            // also restore menu items to their original state
            $windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
            // also return focus to window options button
            $windowButton.focus();
				  });
				}
				else {
  				// popup isn't open. Close the window
          if (which === 'sign') {
            this.handleSignToggle();
          }
          else if (which === 'transcript') {
            this.handleTranscriptToggle();
          }
				}
			}
			else {
				return false;
			}
		}
		else {
			// this was a mouse event
			this.windowMenuClickRegistered = true;
		}

		if ($windowPopup.is(':visible')) {
			$windowPopup.hide(200,'',function() {
				thisObj.windowMenuClickRegistered = false; // reset
			});
			$windowPopup.find('li').removeClass('able-focus');
			$windowButton.attr('aria-expanded','false').focus();
		}
		else {
			// first, be sure window is on top
			this.updateZIndex(which);
			popupTop = $windowButton.position().top + $windowButton.outerHeight();
			$windowPopup.css('top', popupTop);
			$windowPopup.show(200,'',function() {
				$windowButton.attr('aria-expanded','true');
				$(this).find('li').first().focus().addClass('able-focus');
				thisObj.windowMenuClickRegistered = false; // reset
			});
		}
	};

	AblePlayer.prototype.handleMenuChoice = function (which, choice, e) {

		var thisObj, $window, $windowPopup, $windowButton, resizeDialog, width, height, $thisRadio;

		thisObj = this;
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			resizeDialog = this.transcriptResizeDialog;
		}
		else if (which === 'sign') {
			$window = this.$signWindow;
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			resizeDialog = this.signResizeDialog;
		}
		this.$activeWindow = $window;

		if (e.type === 'keydown') {
			if (e.which === 27) { // escape
				// hide the popup menu
				$windowPopup.hide('fast', function() {
					// also reset the Boolean
					thisObj.windowMenuClickRegistered = false;
					// also restore menu items to their original state
					$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
					// also return focus to window options button
					$windowButton.focus();
				});
				return false;
			}
			else {
				// all other keys will be handled by upstream functions
        if (choice !== 'close') {
          this.$activeWindow = $window;
		    }
				return false;
			}
		}

		// hide the popup menu
		$windowPopup.hide('fast', function() {
			// also reset the boolean
			thisObj.windowMenuClickRegistered = false;
			// also restore menu items to their original state
			$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
		});
		if (choice !== 'close') {
			$windowButton.focus();
		}
		if (choice === 'move') {

      // temporarily add role="application" to activeWindow
      // otherwise, screen readers incercept arrow keys and moving window will not work
      this.$activeWindow.attr('role','application');

			if (!this.showedAlert(which)) {
				this.showAlert(this.tt.windowMoveAlert,which);
				if (which === 'transcript') {
					this.showedTranscriptAlert = true;
				}
				else if (which === 'sign') {
					this.showedSignAlert = true;
				}
			}
			if (e.type === 'keydown') {
				this.dragDevice = 'keyboard';
			}
			else {
				this.dragDevice = 'mouse';
			}
			this.startDrag(which, $window);
			$windowPopup.hide().parent().focus();
		}
		else if (choice == 'resize') {
			// resize through the menu uses a form, not drag
      var resizeFields = resizeDialog.getInputs();
      if (resizeFields) {
        // reset width and height values in form
        resizeFields[0].value = $window.width();
        resizeFields[1].value = $window.height();
      }
			resizeDialog.show();
		}
		else if (choice == 'close') {
			// close window, place focus on corresponding button on controller bar
			if (which === 'transcript') {
        this.closingTranscript = true; // stopgrap to prevent double-firing of keypress
				this.handleTranscriptToggle();
			}
			else if (which === 'sign') {
        this.closingSign = true; // stopgrap to prevent double-firing of keypress
				this.handleSignToggle();
			}
		}
	};

	AblePlayer.prototype.startDrag = function(which, $element) {

		var thisObj, $windowPopup, zIndex, startPos, newX, newY;

		thisObj = this;

    if (!this.$activeWindow) {
  		this.$activeWindow = $element;
    }
    this.dragging = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
		}

		if (!this.showedAlert(which)) {
			this.showAlert(this.tt.windowMoveAlert,which);
			if (which === 'transcript') {
				this.showedTranscriptAlert = true;
			}
			else if (which === 'sign') {
				this.showedSignAlert = true;
			}
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
		}
		else {
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
		}).focus();

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
		}
		else if (this.dragDevice === 'keyboard') {
			this.$activeWindow.on('keydown',function(e) {
				if (thisObj.dragging) {
					thisObj.dragKeys(which, e);
				}
			});
		}
		return false;
	};

	AblePlayer.prototype.dragKeys = function(which, e) {

		var key, keySpeed;

		var thisObj = this;

		// stopgap to prevent firing on initial Enter or space
		// that selected "Move" from menu
		if (this.startingDrag) {
			this.startingDrag = false;
			return false;
		}
		key = e.which;
		keySpeed = 10; // pixels per keypress event

		switch (key) {
			case 37:	// left
			case 63234:
				 this.dragKeyX -= keySpeed;
				break;
			case 38:	// up
			case 63232:
				this.dragKeyY -= keySpeed;
				break;
			case 39:	// right
			case 63235:
				this.dragKeyX += keySpeed;
				break;
			case 40:	// down
			case 63233:
				this.dragKeyY += keySpeed;
				break;
			case 13: 	// enter
			case 27: 	// escape
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
			// but the inner able-transcript also needs to be resized proporitionally
			// (it's 50px less than its outer container)
			innerHeight = height - 50;
			this.$transcriptDiv.css('height', innerHeight + 'px');
		}
	};

	AblePlayer.prototype.endDrag = function(which) {

		var thisObj, $window, $windowPopup, $windowButton;
    thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown').removeClass('able-drag');
		// restore activeWindow role from 'application' to 'dialog'
		this.$activeWindow.attr('role','dialog');
		this.$activeWindow = null;

		if (this.dragDevice === 'keyboard') {
			$windowButton.focus();
		}
		this.dragging = false;

		// save final position of dragged element
		this.updateCookie(which);

		// reset starting mouse positions
		this.startMouseX = undefined;
		this.startMouseY = undefined;

		// Boolean to stop stray events from firing
		this.windowMenuClickRegistered = false;
		this.finishingDrag = true; // will be reset after window click event
		// finishingDrag should e reset after window click event,
		// which is triggered automatically after mouseup
		// However, in case that's not reliable in some browsers
		// need to ensure this gets cancelled
		setTimeout(function() {
			thisObj.finishingDrag = false;
		}, 100);
	};

	AblePlayer.prototype.isCloseToCorner = function($window, mouseX, mouseY) {

		// return true if mouse is close to bottom right corner (resize target)
		var tolerance, position, top, left, width, height, bottom, right;

		tolerance = 10; // number of pixels in both directions considered "close enough"

		// first, get position of element
		position = $window.offset();
		top = position.top;
		left = position.left;
		width = $window.width();
		height = $window.height();
		bottom = top + height;
		right = left + width;
		if ((Math.abs(bottom-mouseY) <= tolerance) && (Math.abs(right-mouseX) <= tolerance)) {
			return true;
		}
		return false;
	};

	AblePlayer.prototype.startResize = function(which, $element) {

		var thisObj, $windowPopup, zIndex, startPos, newWidth, newHeight;

		thisObj = this;
		this.$activeWindow = $element;
		this.resizing = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
		}

		// if window's popup menu is open, close it & place focus on button (???)
		if ($windowPopup.is(':visible')) {
			$windowPopup.hide().parent().focus();
		}

		// get starting width and height
		startPos = this.$activeWindow.position();
		this.dragKeyX = this.dragStartX;
		this.dragKeyY = this.dragStartY;
		this.dragStartWidth = this.$activeWindow.width();
		this.dragStartHeight = this.$activeWindow.height();

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

		var $window, $windowPopup, $windowButton;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown');
		$windowButton.show().focus();
		this.resizing = false;
		this.$activeWindow.removeClass('able-resize');

		// save final width and height of dragged element
		this.updateCookie(which);

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

		// Sign language is only currently supported in HTML5 player, not YouTube or Vimeo
		if (this.player === 'html5') {
			// check to see if there's a sign language video accompanying this video
			// check only the first source
			// If sign language is provided, it must be provided for all sources
			this.signFile = this.$sources.first().attr('data-sign-src');
			if (this.signFile) {
  		  if (this.isIOS()) {
    		  // IOS does not allow multiple videos to play simultaneously
    		  // Therefore, sign language as rendered by Able Player unfortunately won't work
          this.hasSignLanguage = false;
          if (this.debug) {
            
          }
        }
        else {
  				if (this.debug) {
	  				
          }
          this.hasSignLanguage = true;
          this.injectSignPlayerCode();
        }
			}
			else {
				this.hasSignLanguage = false;
			}
		}
		else {
			this.hasSignLanguage = false;
		}
	};

	AblePlayer.prototype.injectSignPlayerCode = function() {

		// create and inject surrounding HTML structure

		var thisObj, signVideoId, signVideoWidth, i, signSrc, srcType, $signSource;

		thisObj = this;

		signVideoWidth = this.getDefaultWidth('sign');

		signVideoId = this.mediaId + '-sign';
		this.$signVideo = $('<video>',{
			'id' : signVideoId,
			'tabindex' : '-1'
		});
		this.signVideo = this.$signVideo[0];
		// for each original <source>, add a <source> to the sign <video>
		for (i=0; i < this.$sources.length; i++) {
			signSrc = this.$sources[i].getAttribute('data-sign-src');
			srcType = this.$sources[i].getAttribute('type');
			if (signSrc) {
				$signSource = $('<source>',{
					'src' : signSrc,
					'type' : srcType
				});
				this.$signVideo.append($signSource);
			}
			else {
				// source is missing a sign language version
				// can't include sign language
				this.hasSignLanguage = false;
				break;
			}
		}

		this.$signWindow = $('<div>',{
			'class' : 'able-sign-window',
  		'role': 'dialog',
      'aria-label': this.tt.sign
		});
		this.$signToolbar = $('<div>',{
			'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
		});

		this.$signWindow.append(this.$signToolbar, this.$signVideo);

		this.$ableWrapper.append(this.$signWindow);

		// make it draggable
		this.initDragDrop('sign');

		if (this.prefSign === 1) {
			// sign window is on. Go ahead and position it and show it
			this.positionDraggableWindow('sign',this.getDefaultWidth('sign'));
		}
		else {
			this.$signWindow.hide();
		}
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

	AblePlayer.prototype.getLanguageName = function (key) {
		// key = key.slice(0,2);
		var lang = isoLangs[key];
		return lang ? lang.name : undefined;
	};
	AblePlayer.prototype.getLanguageNativeName = function (key) {
		// key = key.slice(0,2);
		var lang = isoLangs[key];
		return lang ? lang.nativeName : undefined;
	}

})(jQuery);
(function ($) {
	AblePlayer.prototype.getSupportedLangs = function() {
		// returns an array of languages for which AblePlayer has translation tables
		var langs = ['ca','de','en','es','fr','he','it','ja','nb','nl','pt-br','tr','zh-tw'];
		return langs;
	};

	AblePlayer.prototype.getTranslationText = function() {
		// determine language, then get labels and prompts from corresponding translation var
		var deferred, thisObj, lang, thisObj, msg, translationFile, collapsedLang;
		deferred = $.Deferred();

		thisObj = this;
		// get language of the web page, if specified
		if ($('body').attr('lang')) {
			lang = $('body').attr('lang').toLowerCase();
		}
		else if ($('html').attr('lang')) {
			lang = $('html').attr('lang').toLowerCase();
		}
		else {
			lang = null;
		}

		// override this.lang to language of the web page, if known and supported
		// otherwise this.lang will continue using default
		if (!this.forceLang) {
			if (lang) {
				if (lang !== this.lang) {
					if ($.inArray(lang,this.getSupportedLangs()) !== -1) {
						// this is a supported lang
						this.lang = lang;
					}
					else {
						msg = lang + ' is not currently supported. Using default language (' + this.lang + ')';
						if (this.debug) {
							
						}
					}
				}
			}
		}
		if (!this.searchLang) {
			this.searchLang = this.lang;
		}
		translationFile = this.rootPath + 'translations/' + this.lang + '.js';
		this.importTranslationFile(translationFile).then(function(result) {
			collapsedLang = thisObj.lang.replace('-','');
			thisObj.tt = eval(collapsedLang);
			deferred.resolve();
		});
		return deferred.promise();
	};

	AblePlayer.prototype.importTranslationFile = function(translationFile) {

		var deferred = $.Deferred();
		$.getScript(translationFile)
			.done(function(translationVar,textStatus) {
				// translation file successfully retrieved
				deferred.resolve(translationVar);
			})
			.fail(function(jqxhr, settings, exception) {
				deferred.fail();
				// error retrieving file
				// TODO: handle this
			});
		return deferred.promise();
	};

})(jQuery);

(function($) {
	AblePlayer.prototype.computeEndTime = function(startTime, durationTime) {
		var SECONDS = 0;
		var MINUTES = 1;
		var HOURS = 2;

		var startParts = startTime
			.split(':')
			.reverse()
			.map(function(value) {
				return parseFloat(value);
			});

		var durationParts = durationTime
			.split(':')
			.reverse()
			.map(function(value) {
				return parseFloat(value);
			});

		var endTime = startParts
			.reduce(function(acc, val, index) {
				var sum = val + durationParts[index];

				if (index === SECONDS) {
					if (sum > 60) {
						durationParts[index + 1] += 1;
						sum -= 60;
					}

					sum = sum.toFixed(3);
				}

				if (index === MINUTES) {
					if (sum > 60) {
						durationParts[index + 1] += 1;
						sum -= 60;
					}
				}

				if (sum < 10) {
					sum = '0' + sum;
				}

				acc.push(sum);

				return acc;
			}, [])
			.reverse()
			.join(':');

		return endTime;
	};

	AblePlayer.prototype.ttml2webvtt = function(contents) {
		var thisObj = this;

		var xml = thisObj.convert.xml2json(contents, {
			ignoreComment: true,
			alwaysChildren: true,
			compact: true,
			spaces: 2
		});

		var vttHeader = 'WEBVTT\n\n\n';
		var captions = JSON.parse(xml).tt.body.div.p;

		var vttCaptions = captions.reduce(function(acc, value, index) {
			var text = value._text;
			var isArray = Array.isArray(text);
			var attributes = value._attributes;
			var endTime = thisObj.computeEndTime(attributes.begin, attributes.dur);

			var caption =
				thisObj.computeEndTime(attributes.begin, '00:00:0') +
				' --> ' +
				thisObj.computeEndTime(attributes.begin, attributes.dur) +
				'\n' +
				(isArray ? text.join('\n') : text) +
				'\n\n';

			return acc + caption;
		}, vttHeader);

		return vttCaptions;
	};
})(jQuery);

/*! Copyright (c) 2014 - Paul Tavares - purtuga - @paul_tavares - MIT License */
;(function($){

    /**
     * Delays the execution of a function until an expression returns true.
     * The expression is checked every 100 milliseconds for as many tries
     * as defined in in the attempts option
     *
     * @param {Object} options
     * @param {Function} options.when
     *                      Function to execute on every interval.
     *                      Must return true (boolean) in order for
     *                      options.do to be executed.
     * @param {Function} [options.exec]
     *                      Function to be executed once options.when()
     *                      returns true.
     * @param {Interger} [options.interval=100]
     *                      How long to wait in-between tries.
     * @param {Interger} [options.attempts=100]
     *                      How many tries to use before its considered
     *                      a failure.
     * @param {Interger} [options.delayed=0]
     *                      Number of miliseconds to wait before execution
                            is started. Default is imediately.
     *
     * @return {jQuery.Promise}
     *
     * @example
     *
     *      $.doWhen({
     *          when: function(){
     *              return false;
     *          },
     *          exec: function(){
     *              alert("never called given false response on when param!");
     *          }
     *      })
     *      .fail(function(){
     *          alert('ALERT: FAILED CONDITION');
     *      })
     *      .then(function(){
     *          alert("resolved.");
     *      });
     *
     */
    $.doWhen = function(options) {

        return $.Deferred(function(dfd){

            var opt = $.extend({}, {
                    when:       null,
                    exec:       function(){},
                    interval:   100,
                    attempts:   100,
                    delayed:    0
                },
                options,
                {
                    checkId: null
                }),
                startChecking = function(){

                    // Check condition now and if true, then resolve object
                    if (opt.when() === true) {

                        opt.exec.call(dfd.promise());
                        dfd.resolve();
                        return;

                    }

                    // apply minimal UI and hide the overlay
                    opt.checkId = setInterval(function(){

                            if (opt.attempts === 0) {

                                clearInterval(opt.checkId);
                                dfd.reject();

                            } else {

                                --opt.attempts;

                                if (opt.when() === true) {

                                    opt.attempts = 0;
                                    clearInterval(opt.checkId);
                                    opt.exec.call(dfd.promise());
                                    dfd.resolve();

                                }

                            }

                        }, opt.interval);

                };

            if (opt.delayed > 0) {

                setTimeout(startChecking, Number(opt.delayed));

            } else {

                startChecking();

            }

        }).promise();

    };

})(jQuery);
/* Video Transcript Sorter (VTS)
 * Used to synchronize time stamps from WebVTT resources
 * so they appear in the proper sequence within an auto-generated interactive transcript
*/

(function ($) {
	AblePlayer.prototype.injectVTS = function() {

		// To add a transcript sorter to a web page:
		// Add <div id="able-vts"></div> to the web page

		// Define all variables
		var thisObj, tracks, $heading;
		var $instructions, $p1, $p2, $ul, $li1, $li2, $li3;
		var $fieldset, $legend, i, $radioDiv, radioId, $label, $radio;
		var $saveButton, $savedTable;

		thisObj = this;

		if ($('#able-vts').length) {
			// Page includes a container for a VTS instance

			// Are they qualifying tracks?
			if (this.vtsTracks.length) {
				// Yes - there are!

				// Build an array of unique languages
				this.langs = [];
				this.getAllLangs(this.vtsTracks);

				// Set the default VTS language
				this.vtsLang = this.lang;

				// Inject a heading
				$heading = $('<h2>').text('Video Transcript Sorter'); // TODO: Localize; intelligently assign proper heading level
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
				$p1 = $('<p>').text('Use the Video Transcript Sorter to perform any of the following tasks:');
				$ul = $('<ul>');
				$li1 = $('<li>').text('Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player\'s auto-generated transcript.');
				$li2 = $('<li>').text('Modify content or start/end times (all are directly editable within the table).');
				$li3 = $('<li>').text('Insert new content, such as chapters or descriptions.');
				$p2 = $('<p>').text('When finished editing, click the "Save Changes" button. This will auto-generate new content for all relevant timed text files (chapters, descriptions, captions, and/or subtitles), which can be copied and pasted into separate WebVTT files for use by Able Player.');
				$ul.append($li1,$li2,$li3);
				$instructions.append($p1,$ul,$p2);
				$('#able-vts').append($instructions);

				// Inject a fieldset with radio buttons for each language
				$fieldset = $('<fieldset>');
				$legend = $('<legend>').text('Select a language'); // TODO: Localize this
				$fieldset.append($legend)
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
						// getLanguageNativeName() - returns native name; if using this be sure to add lang attr to <div> (see above)
						// getLanguageName() - returns name in English; doesn't require lang attr on <label>
					}).text(this.getLanguageName(this.langs[i]));
					$radioDiv.append($radio,$label);
					$fieldset.append($radioDiv);
				}
				$('#able-vts').append($fieldset);

				// Inject a 'Save Changes' button
				$saveButton = $('<button>',{
					'type': 'button',
					'id': 'able-vts-save',
					'value': 'save'
				}).text('Save Changes'); // TODO: Localize this
				$('#able-vts').append($saveButton);

				// Inject a table with one row for each cue in the default language
				this.injectVtsTable('add',this.vtsLang);

				// TODO: Add drag/drop functionality for mousers

				// Add event listeners for contenteditable cells
				var kindOptions, beforeEditing, editedCell, editedContent, i, closestKind;
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
								if (editedContent.substr(0,1) === 's') {
									$(this).text('subtitles');
								}
								else if (editedContent.substr(0,1) === 'd') {
									$(this).text('descriptions');
								}
								else if (editedContent.substr(0,2) === 'ch') {
									$(this).text('chapters');
								}
								else {
									// whatever else they types, assume 'captions'
									$(this).text('captions');
								}
							}
						}
						else if (editedCell === 2 || editedCell === 3) {
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

				// handle click on the Save button
				$('#able-vts-save').on('click',function(e) {
					e.stopPropagation();
					if ($(this).attr('value') == 'save') {
						// replace table with WebVTT output in textarea fields (for copying/pasting)
						$(this).attr('value','cancel').text('Return to Editor'); // TODO: Localize this
						$savedTable = $('#able-vts table');
						$('#able-vts-instructions').hide();
						$('#able-vts > fieldset').hide();
						$('#able-vts table').remove();
						$('#able-vts-icon-credit').remove();
						thisObj.parseVtsOutput($savedTable);
					}
					else {
						// cancel saving, and restore the table using edited content
						$(this).attr('value','save').text('Save Changes'); // TODO: Localize this
						$('#able-vts-output').remove();
						$('#able-vts-instructions').show();
						$('#able-vts > fieldset').show();
						$('#able-vts').append($savedTable);
						$('#able-vts').append(thisObj.getIconCredit());
						thisObj.showVtsAlert('Cancelling saving. Any edits you made have been restored in the VTS table.'); // TODO: Localize this
					}
				});
			}
		}
	};

	AblePlayer.prototype.setupVtsTracks = function(kind, lang, label, src, contents) {

		// Called from tracks.js

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
		if (lastSlash === -1) {
			// there are no slashes in path.
			return path;
		}
		else {
			return path.substr(lastSlash+1);
		}
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
							}
							else {
								// this is the first row of content. No need for an EOL
								content += nextRow;
							}
						}
						else {
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
			}
			else {
				i++;
			}
		}
		return cues;
	};

	AblePlayer.prototype.isValidTimestamp = function(timestamp) {

		// return true if timestamp contains only numbers or expected punctuation
		if (/^[0-9:,.]*$/.test(timestamp)) {
			return true;
		}
		else {
			return false;
		}
	};

	AblePlayer.prototype.formatTimestamp = function(timestamp) {

		// timestamp is a string in the form "HH:MM:SS.xxx"
		// Take some simple steps to ensure edited timestamp values still adhere to expected format

		var firstPart, lastPart;

		var firstPart = timestamp.substr(0,timestamp.lastIndexOf('.')+1);
		var lastPart = timestamp.substr(timestamp.lastIndexOf('.')+1);

		// TODO: Be sure each component within firstPart has only exactly two digits
		// Probably can't justify doing this automatically
		// If users enters '5' for minutes, that could be either '05' or '50'
		// This should trigger an error and prompt the user to correct the value before proceeding

		// Be sure lastPart has exactly three digits
		if (lastPart.length > 3) {
			// chop off any extra digits
			lastPart = lastPart.substr(0,3);
		}
		else if (lastPart.length < 3) {
			// add trailing zeros
			while (lastPart.length < 3) {
				lastPart += '0';
			}
		}
		return firstPart + lastPart;
	};


	AblePlayer.prototype.injectVtsTable = function(action,lang) {

		// action is either 'add' (for a new table) or 'update' (if user has selected a new lang)

		var $table, headers, i, $tr, $th, $td, rows, rowNum, rowId;

		if (action === 'update') {
			// remove existing table
			$('#able-vts table').remove();
			$('#able-vts-icon-credit').remove();
		}

		$table = $('<table>',{
			'lang': lang
		});
		$tr = $('<tr>',{
			'lang': 'en' // TEMP, until header row is localized
		});
		headers = ['Row #','Kind','Start','End','Content','Actions']; // TODO: Localize this
		for (i=0; i < headers.length; i++) {
			$th = $('<th>', {
				'scope': 'col'
			}).text(headers[i]);
			if (headers[i] === 'Actions') {
				$th.addClass('actions');
			}
			$tr.append($th);
		}
		$table.append($tr);

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
			}
			else if (button === 'down') {
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
			}
			else if (button === 'insert') {
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
			}
			else if (button === 'delete') {
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

		var credit;
		credit = '<div id="able-vts-icon-credit">'
			+ 'Action buttons made by <a href="https://www.flaticon.com/authors/elegant-themes">Elegant Themes</a> '
			+ 'from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> '
			+ 'are licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" '
			+ 'target="_blank">CC 3.0 BY</a>'
			+ '</div>';
			return credit;
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
		}
		else if (action == 'down') {
			// move the row down
			this.moveRow(rowNum,'down');
		}
		else if (action == 'insert') {
			// insert a row below
			this.insertRow(rowNum);
		}
		else if (action == 'delete') {
			// delete the row
			this.deleteRow(rowNum);
		}
	};

	AblePlayer.prototype.insertRow = function(rowNum) {

		// Insert empty row below rowNum
		var $table, $rows, numRows, newRowNum, newRowId, newTimes, $tr, $td;
		var $select, options, i, $option, newKind, newClass, $parentRow;
		var i, nextRowNum, $buttons;

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
		this.showVtsAlert('A new row ' + newRowNum + ' has been inserted'); // TODO: Localize this

		// Place focus in new select field
		$select.focus();

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
		this.showVtsAlert('Row ' + rowNum + ' has been deleted'); // TODO: Localize this

	};

	AblePlayer.prototype.moveRow = function(rowNum,direction) {

		// swap two rows
		var $rows, $thisRow, otherRowNum, $otherRow, newTimes, msg;

		$rows = $('#able-vts table').find('tr');
		$thisRow = $('#able-vts table').find('tr').eq(rowNum);
		if (direction == 'up') {
			otherRowNum = parseInt(rowNum) - 1;
			$otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
			$otherRow.before($thisRow);
		}
		else if (direction == 'down') {
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

		// Announce the move (TODO: Localize this)
		msg = 'Row ' + rowNum + ' has been moved ' + direction;
		msg += ' and is now Row ' + otherRowNum;
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
		if ($row.is('[class^="kind-"]')) {
			// row has a class that starts with "kind-"
			// Extract kind from the class name
			kind = this.getKindFromClass($row.attr('class'));
		}
		else {
			// Kind has not been assigned (e.g., newly inserted row)
			// Set as captions row by default
			kind = 'captions';
		}
		start = this.getSecondsFromColonTime($row.find('td').eq(2).text());
		end = this.getSecondsFromColonTime($row.find('td').eq(3).text());

		// Get kind, start, and end from previous row
		if (rowNum > 1) {
			// this is not the first row. Include the previous row
			prevRowNum = rowNum - 1;
			$prevRow = $rows.eq(prevRowNum);
			if ($prevRow.is('[class^="kind-"]')) {
				// row has a class that starts with "kind-"
				// Extract kind from the class name
			 prevKind = this.getKindFromClass($prevRow.attr('class'));
			}
			else {
				// Kind has not been assigned (e.g., newly inserted row)
				prevKind = null;
			}
			prevStart = this.getSecondsFromColonTime($prevRow.find('td').eq(2).text());
			prevEnd = this.getSecondsFromColonTime($prevRow.find('td').eq(3).text());
		}
		else {
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
			if ($nextRow.is('[class^="kind-"]')) {
				// row has a class that starts with "kind-"
				// Extract kind from the class name
			 nextKind = this.getKindFromClass($nextRow.attr('class'));
			}
			else {
				// Kind has not been assigned (e.g., newly inserted row)
				nextKind = null;
			}
			nextStart = this.getSecondsFromColonTime($nextRow.find('td').eq(2).text());
			nextEnd = this.getSecondsFromColonTime($nextRow.find('td').eq(3).text());
		}
		else {
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
				if (nextStart) {
					// end the new row immediately before the next row starts
					end = (parseFloat(nextStart) - .001).toFixed(3);
				}
				else {
					// this is the last row. Use minDuration to calculate end time.
					end = (parseFloat(start) + minDuration[kind]).toFixed(3);
				}
			}
			else if (prevKind === 'chapters') {
				// start the new row immediately after the chapter start (not end)
				start = (parseFloat(prevStart) + .001).toFixed(3);
				if (nextStart) {
					// end the new row immediately before the next row starts
					end = (parseFloat(nextStart) - .001).toFixed(3);
				}
				else {
					// this is the last row. Use minDuration to calculate end time.
					end = (parseFloat(start) + minDurartion[kind]).toFixed(3);
				}
			}
			else if (prevKind === 'descriptions') {
				// start the new row minDuration['descriptions'] after the description starts
				// this will theoretically allow at least a small cushion for the description to be read
				start = (parseFloat(prevStart) + minDuration['descriptions']).toFixed(3);
				end = (parseFloat(start) + minDuration['descriptions']).toFixed(3);
			}
		}
		else {
			// current row has a start time (i.e., an existing row has been moved))
			if (prevStart) {
				// this is not the first row.
				if (prevStart < start) {
					if (start < nextStart) {
						// No change is necessary
					}
					else {
						// nextStart needs to be incremented
						nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
						nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
						// TODO: Ensure nextEnd does not exceed the following start (nextNextStart)
						// Or... maybe this is getting too complicated and should be left up to the user
					}
				}
				else {
					// start needs to be incremented
					start = (parseFloat(prevStart) + minDuration[prevKind]).toFixed(3);
					end = (parseFloat(start) + minDuration[kind]).toFixed(3);
				}
			}
			else {
				// this is the first row
				if (start < nextStart) {
					// No change is necessary
				}
				else {
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
		// TODO: Rewrite this using regular expressions
		var kindStart, kindEnd, kindLength, kind;

		kindStart = myclass.indexOf('kind-')+5;
		kindEnd = myclass.indexOf(' ',kindStart);
		if (kindEnd == -1) {
			// no spaces found, "kind-" must be the only myclass
			kindLength = myclass.length - kindStart;
		}
		else {
			kindLength = kindEnd - kindStart;
		}
		kind = myclass.substr(kindStart,kindLength);
		return kind;
	};

	AblePlayer.prototype.showVtsAlert = function(message) {

		// this is distinct from greater Able Player showAlert()
		// because it's positioning needs are unique
		// For now, alertDiv is fixed at top left of screen
		// but could ultimately be modified to appear near the point of action in the VTS table
		this.$vtsAlert.text(message).show().delay(3000).fadeOut('slow');
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

		$heading = $('<h3>').text(kind.charAt(0).toUpperCase() + kind.slice(1));
		filename = this.getFilenameFromTracks(kind,lang);
		pText = 'If you made changes, copy/paste the following content ';
		if (filename) {
			pText += 'to replace the original content of your ' + this.getLanguageName(lang) + ' ';
			pText += '<em>' + kind + '</em> WebVTT file (<strong>' + filename + '</strong>).';
		}
		else {
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

		var thisObj, deferred, promise, containerId, vimeoId, autoplay, videoDimensions, options;
		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		containerId = this.mediaId + '_vimeo';

		// add container to which Vimeo player iframe will be appended
		this.$mediaContainer.prepend($('<div>').attr('id', containerId));

		// if a described version is available && user prefers desription
		// init player using the described version
		if (this.vimeoDescId && this.prefDesc) {
			vimeoId = this.vimeoDescId;
		}
		else {
			vimeoId = this.vimeoId;
		}
		this.activeVimeoId = vimeoId;

		// Notes re. Vimeo Embed Options:
		// If a video is owned by a user with a paid Plus, PRO, or Business account,
    // setting the "controls" option to "false" will hide the default controls, without hiding captions.
		// This is a new option from Vimeo; previously used "background:true" to hide the controller,
		// but that had unwanted side effects:
		//  - In addition to hiding the controls, it also hides captions
		//  - It automatically autoplays (initializing the player with autoplay:false does not override this)
		//  - It automatically loops (but this can be overridden by initializing the player with loop:false)
		//  - It automatically sets volume to 0 (not sure if this can be overridden, since no longer using the background option)

		if (this.autoplay && this.okToPlay) {
			autoplay = 'true';
		}
		else {
			autoplay = 'false';
		}

		videoDimensions = this.getVimeoDimensions(this.activeVimeoId, containerId);
		if (videoDimensions) {
			this.vimeoWidth = videoDimensions[0];
			this.vimeoHeight = videoDimensions[1];
			this.aspectRatio = thisObj.ytWidth / thisObj.ytHeight;
		}
		else {
			// dimensions are initially unknown
			// sending null values to Vimeo results in a video that uses the default Vimeo dimensions
			// these can then be scraped from the iframe and applied to this.$ableWrapper
			this.vimeoWidth = null;
			this.vimeoHeight = null;
		}

		options = {
		  id: vimeoId,
			width: this.vimeoWidth,
			controls: false
		};

		this.vimeoPlayer = new Vimeo.Player(containerId, options);

		this.vimeoPlayer.ready().then(function() {

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
		deferred = new $.Deferred();
		promise = deferred.promise();

		this.vimeoPlayer.getPaused().then(function (paused) {
			// paused is Boolean
			deferred.resolve(paused);
		});

		return promise;
	}

	AblePlayer.prototype.getVimeoEnded = function () {

		var deferred, promise;
		deferred = new $.Deferred();
		promise = deferred.promise();

		this.vimeoPlayer.getEnded().then(function (ended) {
			// ended is Boolean
			deferred.resolve(ended);
		});

		return promise;
	}

	AblePlayer.prototype.getVimeoState = function () {

		var thisObj, deferred, promise, promises, gettingPausedPromise, gettingEndedPromise;

		thisObj = this;

		deferred = new $.Deferred();
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

	AblePlayer.prototype.getVimeoDimensions = function (vimeoContainerId) {

		// get dimensions of Vimeo video, return array with width & height
		// Sources, in order of priority:
		// 1. The width and height attributes on <video>
		// 2. YouTube (not yet supported; can't seem to get this data via YouTube Data API without OAuth!)

		var d, url, $iframe, width, height;

		d = [];

		if (typeof this.playerMaxWidth !== 'undefined') {
			d[0] = this.playerMaxWidth;
			// optional: set height as well; not required though since YouTube will adjust height to match width
			if (typeof this.playerMaxHeight !== 'undefined') {
				d[1] = this.playerMaxHeight;
			}
			return d;
		}
		else {
			if (typeof $('#' + vimeoContainerId) !== 'undefined') {
				$iframe = $('#' + vimeoContainerId);
				width = $iframe.width();
				height = $iframe.height();
				if (width > 0 && height > 0) {
					d[0] = width;
					d[1] = height;
					return d;
				}
			}
		}
		return false;
	};

	AblePlayer.prototype.resizeVimeoPlayer = function(youTubeId, youTubeContainerId) {

    // NOTE: This function is modeled after same function in youtube.js
    // in case useful for Vimeo, but is not currently used

		// called after player is ready, if youTube dimensions were previously unknown
		// Now need to get them from the iframe element that YouTube injected
		// and resize Able Player to match
		var d, width, height;
		if (typeof this.aspectRatio !== 'undefined') {
			// video dimensions have already been collected
			if (this.restoringAfterFullScreen) {
				// restore using saved values
				if (this.youTubePlayer) {
					this.youTubePlayer.setSize(this.ytWidth, this.ytHeight);
				}
				this.restoringAfterFullScreen = false;
			}
			else {
				// recalculate with new wrapper size
				width = this.$ableWrapper.parent().width();
				height = Math.round(width / this.aspectRatio);
				this.$ableWrapper.css({
					'max-width': width + 'px',
					'width': ''
				});
				this.youTubePlayer.setSize(width, height);
				if (this.fullscreen) {
					this.youTubePlayer.setSize(width, height);
				}
				else {
					// resizing due to a change in window size, not full screen
					this.youTubePlayer.setSize(this.ytWidth, this.ytHeight);
				}
			}
		}
		else {
			d = this.getYouTubeDimensions(youTubeId, youTubeContainerId);
			if (d) {
				width = d[0];
				height = d[1];
				if (width > 0 && height > 0) {
					this.aspectRatio = width / height;
					this.ytWidth = width;
					this.ytHeight = height;
					if (width !== this.$ableWrapper.width()) {
						// now that we've retrieved YouTube's default width,
						// need to adjust to fit the current player wrapper
						width = this.$ableWrapper.width();
						height = Math.round(width / this.aspectRatio);
						if (this.youTubePlayer) {
							this.youTubePlayer.setSize(width, height);
						}
					}
				}
			}
		}
	};

	AblePlayer.prototype.setupVimeoCaptions = function () {

		// called from setupAltCaptions if player is YouTube and there are no <track> captions

		// use YouTube Data API to get caption data from YouTube
		// function is called only if these conditions are met:
		// 1. this.player === 'youtube'
		// 2. there are no <track> elements with kind="captions"
		// 3. youTubeDataApiKey is defined

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, googleApiPromise, youTubeId, i;

		thisObj = this;

		// if a described version is available && user prefers desription
		// Use the described version, and get its captions
		if (this.youTubeDescId && this.prefDesc) {
			youTubeId = this.youTubeDescId;
		}
		else {
			youTubeId = this.youTubeId;
		}
		if (typeof youTubeDataAPIKey !== 'undefined') {
			// Wait until Google Client API is loaded
			// When loaded, it sets global var googleApiReady to true

			// Thanks to Paul Tavares for $.doWhen()
			// https://gist.github.com/purtuga/8257269
			$.doWhen({
				when: function(){
					return googleApiReady;
				},
				interval: 100, // ms
				attempts: 1000
			})
			.done(function(){
					deferred.resolve();
			})
			.fail(function(){
				
			});
		}
		else {
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.getVimeoCaptionTracks = function () {

		// get data via Vimeo Player API, and push data to this.captions
		// Note: Vimeo doesn't expose the caption cues themselves
		// so this.captions will only include metadata about caption tracks; not cues
		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, i, trackId, isDefaultTrack;

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
						thisObj.usingVimeoCaptions = true;
						if (thisObj.prefCaptions === 1) {
								thisObj.captionsOn = true;
						}
						else {
							thisObj.captionsOn = false;
						}
						// assign the default track based on language of the player
						if (tracks[i]['language'] === thisObj.lang) {
							isDefaultTrack = true;
						}
						else {
								isDefaultTrack = false;
						}
						thisObj.tracks.push({
						  'kind': tracks[i]['kind'],
							'language': tracks[i]['language'],
							'label': tracks[i]['label'],
							'def': isDefaultTrack
						});
					}

					// setupPopups again with new captions array, replacing original
					thisObj.setupPopups('captions');
					deferred.resolve();
			 	}
			 	else {
				  thisObj.hasCaptions = false;
					thisObj.usingVimeoCaptions = false;
					deferred.resolve();
				}
			});

		return promise;
	};

	AblePlayer.prototype.initVimeoCaptionModule = function () {

    // NOTE: This function is modeled after same function in youtube.js
    // in case useful for Vimeo, but is not currently used

		// This function is called when YouTube onApiChange event fires
		// to indicate that the player has loaded (or unloaded) a module with exposed API methods
		// it isn't fired until the video starts playing
		// and only fires if captions are available for this video (automated captions don't count)
		// If no captions are available, onApichange event never fires & this function is never called

		// YouTube iFrame API documentation is incomplete related to captions
		// Found undocumented features on user forums and by playing around
		// Details are here: http://terrillthompson.com/blog/648
		// Summary:
		// User might get either the AS3 (Flash) or HTML5 YouTube player
		// The API uses a different caption module for each player (AS3 = 'cc'; HTML5 = 'captions')
		// There are differences in the data and methods available through these modules
		// This function therefore is used to determine which captions module is being used
		// If it's a known module, this.ytCaptionModule will be used elsewhere to control captions
		var options, fontSize, displaySettings;

		options = this.youTubePlayer.getOptions();
		if (options.length) {
			for (var i=0; i<options.length; i++) {
				if (options[i] == 'cc') { // this is the AS3 (Flash) player
					this.ytCaptionModule = 'cc';
					if (!this.hasCaptions) {
						// there are captions available via other sources (e.g., <track>)
						// so use these
						this.hasCaptions = true;
						this.usingYouTubeCaptions = true;
					}
					break;
				}
				else if (options[i] == 'captions') { // this is the HTML5 player
					this.ytCaptionModule = 'captions';
					if (!this.hasCaptions) {
						// there are captions available via other sources (e.g., <track>)
						// so use these
						this.hasCaptions = true;
						this.usingYouTubeCaptions = true;
					}
					break;
				}
			}
			if (typeof this.ytCaptionModule !== 'undefined') {
				if (this.usingYouTubeCaptions) {
					// set default languaage
					this.youTubePlayer.setOption(this.ytCaptionModule, 'track', {'languageCode': this.captionLang});
					// set font size using Able Player prefs (values are -1, 0, 1, 2, and 3, where 0 is default)
					this.youTubePlayer.setOption(this.ytCaptionModule,'fontSize',this.translatePrefs('size',this.prefCaptionsSize,'youtube'));
					// ideally could set other display options too, but no others seem to be supported by setOption()
				}
				else {
					// now that we know which cc module was loaded, unload it!
					// we don't want it if we're using local <track> elements for captions
					this.youTubePlayer.unloadModule(this.ytCaptionModule)
				}
			}
		}
		else {
			// no modules were loaded onApiChange
			// unfortunately, gonna have to disable captions if we can't control them
			this.hasCaptions = false;
			this.usingYouTubeCaptions = false;
		}
		this.refreshControls('captions');
	};

	AblePlayer.prototype.getVimeoPosterUrl = function (youTubeId, width) {

    // NOTE: This function is modeled after same function in youtube.js
    // in case useful for Vimeo, but is not currently used

			 // return a URL for retrieving a YouTube poster image
			 // supported values of width: 120, 320, 480, 640

			 var url = 'https://img.youtube.com/vi/' + youTubeId;
			 if (width == '120') {
				 // default (small) thumbnail, 120 x 90
				 return url + '/default.jpg';
			 }
			 else if (width == '320') {
				 // medium quality thumbnail, 320 x 180
				 return url + '/hqdefault.jpg';
			 }
			 else if (width == '480') {
				 // high quality thumbnail, 480 x 360
				 return url + '/hqdefault.jpg';
			 }
			 else if (width == '640') {
				 // standard definition poster image, 640 x 480
				 return url + '/sddefault.jpg';
			 }
			 return false;
	};

})(jQuery);
