/*
  // JavaScript for Able Player

  // HTML5 Media API:
  // http://www.w3.org/TR/html5/embedded-content-0.html#htmlmediaelement
  // http://dev.w3.org/html5/spec-author-view/video.html

  // W3C API Test Page:
  // http://www.w3.org/2010/05/video/mediaevents.html

  // Uses JW Player as fallback
  // JW Player configuration options:
  // http://support.jwplayer.com/customer/portal/articles/1413113-configuration-options-reference
  // (NOTE: some options are not documented, e.g., volume)
  // JW Player 6 API reference:
  // http://support.jwplayer.com/customer/portal/articles/1413089-javascript-api-reference

  // YouTube Player API for iframe Embeds
  https://developers.google.com/youtube/iframe_api_reference
  // YouTube Player Parameters
  https://developers.google.com/youtube/player_parameters?playerVersion=HTML5

  // YouTube Data API
  https://developers.google.com/youtube/v3

  // Google API Client Library for JavaScript
  https://developers.google.com/api-client-library/javascript/dev/dev_jscript

  // Google API Explorer: YouTube services and methods
  https://developers.google.com/apis-explorer/#s/youtube/v3/
*/

/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */
/*global $, jQuery */
"use strict";

(function ($) {
  $(document).ready(function () {
    $('video, audio').each(function (index, element) {
      if ($(element).data('able-player') !== undefined) {
        new AblePlayer($(this),$(element));
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
      this.autoplay = true;
    }
    else {
      this.autoplay = false;
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

    this.transcriptType = null;
    if ($(media).data('transcript-src') !== undefined) {
      this.transcriptSrc = $(media).data('transcript-src');
      if (this.transcriptSrcHasRequiredParts()) {
        this.transcriptType = 'manual';
      }
      else {
        this.transcriptType = null;
      }
    }
    else if ($(media).find('track[kind="captions"], track[kind="subtitles"]').length > 0) {
      // required tracks are present. COULD automatically generate a transcript
      if ($(media).data('transcript-div') !== undefined && $(media).data('transcript-div') !== "") {
        this.transcriptDivLocation = $(media).data('transcript-div');
        this.transcriptType = 'external';
      }
      else if ($(media).data('include-transcript') !== undefined) {
        if ($(media).data('include-transcript') !== false) {
          this.transcriptType = 'popup';
        }
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

    // Previous/Next buttons
    // valid values of data-prevnext-unit are 'playlist' and 'chapter'; will also accept 'chapters'
    if ($(media).data('prevnext-unit') === 'chapter' || $(media).data('prevnext-unit') === 'chapters') {
      this.prevNextUnit = 'chapter';
    }
    else if ($(media).data('prevnext-unit') === 'playlist') {
      this.prevNextUnit = 'playlist';
    }
    else {
      this.prevNextUnit = false;
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
    this.useFixedSeekInterval = false;
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

    // Fallback Player
    // The only supported fallback is JW Player, licensed separately
    // JW Player files must be included in folder specified in this.fallbackPath
    // JW Player will be loaded as needed in browsers that don't support HTML5 media
    // NOTE: As of 2.3.44, NO FALLBACK is used unless data-fallback='jw'

    this.fallback = null;
    this.fallbackPath = null;
    this.fallbackJwKey = null;
    this.testFallback = false;

    if ($(media).data('fallback') !== undefined && $(media).data('fallback') !== "") {
      var fallback =  $(media).data('fallback');
      if (fallback === 'jw') {
        this.fallback = fallback;
      }
    }

    if (this.fallback === 'jw') {

      if ($(media).data('fallback-path') !== undefined && $(media).data('fallback-path') !== false) {
        this.fallbackPath = $(media).data('fallback-path');

        var path = $(media).data('fallback-path');

        // remove js file is specified.
        var playerJs = 'jwplayer.js';
        if (path.endsWith(playerJs)) {
          path = path.slice(0, path.length - playerJs.length);
        }
        this.fallbackPath = path;
      } else {
        this.fallbackPath = this.rootPath + 'thirdparty/';
      }

      if ($(media).data('fallback-jwkey') !== undefined) {
        this.fallbackJwKey = $(media).data('fallback-jwkey');
      }

      if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== false) {
        this.testFallback = true;
      }
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
    if ($(media).data('hide-controls') !== undefined && $(media).data('hide-controls') !== false) {
      this.hideControls = true;
    }
    else {
      this.hideControls = false;
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
    this.reinitialize().then(function () {
      if (!thisObj.player) {
        // No player for this media, show last-line fallback.
        thisObj.provideFallback();
      }
      else {
        thisObj.setupInstance().then(function () {
          thisObj.recreatePlayer();
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
