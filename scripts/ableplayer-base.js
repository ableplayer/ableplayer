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

    this.setDefaults();

    this.media = media;
    if ($(media).length === 0) {
      this.provideFallback('ERROR: No media specified.');
      return;
    }

    if ($(media).attr('autoplay') !== undefined && $(media).attr('autoplay') !== "false") {
      this.autoplay = true;
    }
    else {
      this.autoplay = false;
    }

    // override defaults with values of data-* attributes

    if ($(media).data('start-time') !== undefined && $(media).data('start-time') !== "") {
      this.startTime = $(media).data('start-time');
    }
    else {
      this.startTime = 0;
    }

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
    else if (media.find('track[kind="captions"], track[kind="subtitles"]').length > 0) {
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
    if ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== "false") {
      this.lyricsMode = true;
    }

    // data-captions-position can be used to set the default captions position
    // this is only the default, and can be overridden by user preferences
    // valid values of data-captions-position are 'below' and 'overlay'
    if ($(media).data('captions-position') === 'overlay') {
      this.defaultCaptionsPosition = 'overlay';
    }
    else { // the default, even if not specified
      this.defaultCaptionsPosition = 'below';
    }

    if ($(media).data('chapters-div') !== undefined && $(media).data('chapters-div') !== "") {
      this.chaptersDivLocation = $(media).data('chapters-div');
    }

    if ($(media).data('chapters-title') !== undefined) {
      // NOTE: empty string is valid; results in no title being displayed
      this.chaptersTitle = $(media).data('chapters-title');
    }

    if ($(media).data('chapters-default') !== undefined && $(media).data('chapters-default') !== "") {
      this.defaultChapter = $(media).data('chapters-default');
      this.chapterId = this.defaultChapter; // the id of the default chapter (as defined within WebVTT file)
    }

    if ($(media).data('use-chapters-button') !== undefined && $(media).data('use-chapters-button') === false) {
      this.useChaptersButton = false;
    }

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

    // valid values of data-speed-icons are 'arrows' (default) and 'animals'
    // use 'animals' to use turtle and rabbit
    if ($(media).data('speed-icons') === 'animals') {
      this.speedIcons = 'animals';
    }
    else {
      this.speedIcons = 'arrows';
    }

    // valid values of data-seekbar-scope are 'chapter' and 'video'; will also accept 'chapters'
    if ($(media).data('seekbar-scope') === 'chapter' || $(media).data('seekbar-scope') === 'chapters') {
      this.seekbarScope = 'chapter';
    }
    else {
      this.seekbarScope = 'video';
    }

    if ($(media).data('youtube-id') !== undefined && $(media).data('youtube-id') !== "") {
      this.youTubeId = $(media).data('youtube-id');
    }

    if ($(media).data('youtube-desc-id') !== undefined && $(media).data('youtube-desc-id') !== "") {
      this.youTubeDescId = $(media).data('youtube-desc-id');
    }

    if ($(media).data('debug') !== undefined && $(media).data('debug') !== "false") {
      this.debug = true;
    }

    if ($(media).data('volume') !== undefined && $(media).data('volume') !== "") {
      var volume = $(media).data('volume');
      if (volume >= 0 && volume <= 1) {
        this.defaultVolume = volume;
      }
    }

    // Icon type
    // By default, AblePlayer uses scalable icomoon fonts for the player controls
    // and falls back to images if the user has a custom style sheet that overrides font-family
    // use data-icon-type to force controls to use either 'font', 'images' or 'svg'
    this.iconType = 'font';
    this.forceIconType = false;
    if ($(media).data('icon-type') !== undefined && $(media).data('icon-type') !== "") {
      var iconType = $(media).data('icon-type');
      if (iconType === 'font' || iconType == 'image' || iconType == 'svg') {
        this.iconType = iconType;
        this.forceIconType = true;
      }
    }
/*
    if (this.iconType === 'svg') {
      // load and execute the required JavaScript
      var svgScriptPath = this.rootPath + '/icons/svgxuse.js';
      var $svgScript = $('<script>',{
        'src': svgScriptPath
      });
      $(document).append($svgScript);
    }
*/
    if ($(media).data('allow-fullscreen') !== undefined && $(media).data('allow-fullscreen') === false) {
      this.allowFullScreen = false;
    }
    else {
      this.allowFullScreen = true;
    }

    if ($(media).data('seek-interval') !== undefined && $(media).data('seek-interval') !== "") {
      var seekInterval = $(media).data('seek-interval');
      if (/^[1-9][0-9]*$/.test(seekInterval)) { // must be a whole number greater than 0
        this.seekInterval = seekInterval;
        this.useFixedSeekInterval = true; // do not override with 1/10 of duration
      }
    }

    if ($(media).data('show-now-playing') !== undefined && $(media).data('show-now-playing') !== "false") {
      this.showNowPlaying = true;
    }

    if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== "false") {
      this.testFallback = true;
    }

    if ($(media).data('fallback-path') !== undefined && $(media).data('fallback-path') !== "false") {
      this.fallbackPath = $(media).data('fallback-path');
    }

    var jwFound = false;
    if ($(media).data('fallback') !== undefined && $(media).data('fallback') !== "") {
      var fallback =  $(media).data('fallback');
      if (fallback === 'jw') {
        this.fallback = fallback;
      }
    }

    if ($(media).data('lang') !== undefined && $(media).data('lang') !== "") {
      var lang = $(media).data('lang');
      if (lang.length == 2) {
        this.lang = lang;
      }
    }

    if ($(media).data('force-lang') !== undefined && $(media).data('force-lang') !== "false") {
      this.forceLang = true;
    }

    if ($(media).data('meta-type') !== undefined && $(media).data('meta-type') !== "") {
      this.metaType = $(media).data('meta-type');
    }

    if ($(media).data('meta-div') !== undefined && $(media).data('meta-div') !== "") {
      this.metaDiv = $(media).data('meta-div');
    }

    if ($(media).data('search') !== undefined && $(media).data('search') !== "") {
      // conducting a search currently requires an external div in which to write the results
      if ($(media).data('search-div') !== undefined && $(media).data('search-div') !== "") {
        this.searchString = $(media).data('search');
        this.searchDiv = $(media).data('search-div');
      }
    }

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
          thisObj.provideFallback('ERROR: Failed to load translation table');
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
        thisObj.provideFallback('Unable to play media');
      }
      else {
        thisObj.setupInstance().then(function () {
          thisObj.recreatePlayer();
        });
      }
    });
  };

  AblePlayer.youtubeIframeAPIReady = false;
  AblePlayer.loadingYoutubeIframeAPI = false;
})(jQuery);
