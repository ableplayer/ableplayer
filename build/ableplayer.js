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
      this.provideFallback('ERROR: No media specified.');
      return;
    }

    ///////////////////////////////
    //
    // Default variables assignment
    //
    ///////////////////////////////

    // The following variables CAN be overridden with HTML attributes

    // autoplay
    if ($(media).attr('autoplay') !== undefined && $(media).attr('autoplay') !== "false") {
      this.autoplay = true;
    }
    else {
      this.autoplay = false;
    }

    // loop (NOT FULLY SUPPORTED)
    if ($(media).attr('loop') !== undefined && $(media).attr('loop') !== "false") {
      this.loop = true;
    }
    else {
      this.loop = false;
    }

    // start-time
    if ($(media).data('start-time') !== undefined && $(media).data('start-time') !== "") {
      this.startTime = $(media).data('start-time');
    }
    else {
      this.startTime = 0;
    }

    // debug
    if ($(media).data('debug') !== undefined && $(media).data('debug') !== "false") {
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
    // In "Lyrics Mode", line breaks in WebVTT caption files are supported in the transcript
    // If false (default), line breaks are are removed from transcripts in order to provide a more seamless reading experience
    // If true, line breaks are preserved, so content can be presented karaoke-style, or as lines in a poem

    if ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== "false") {
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
    // valid values of data-speed-icons are 'arrows' (default) and 'animals'
    // use 'animals' to use turtle and rabbit
    if ($(media).data('speed-icons') === 'animals') {
      this.speedIcons = 'animals';
    }
    else {
      this.speedIcons = 'arrows';
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
    if ($(media).data('show-now-playing') !== undefined && $(media).data('show-now-playing') === "false") {
      this.showNowPlaying = false;
    }
    else {
      this.showNowPlaying = true;
    }

    // Fallback Player
    // The only supported fallback is JW Player, licensed separately
    // JW Player files must be included in folder specified in this.fallbackPath
    // JW Player will be loaded as needed in browsers that don't support HTML5 media
    // NOTE: As of 2.3.44, NO FALLBACK is used unless data-fallback='jw'

    this.fallback = null;
    this.fallbackPath = null;
    this.testFallback = false;

    if ($(media).data('fallback') !== undefined && $(media).data('fallback') !== "") {
      var fallback =  $(media).data('fallback');
      if (fallback === 'jw') {
        this.fallback = fallback;
      }
    }

    if (this.fallback === 'jw') {

      if ($(media).data('fallback-path') !== undefined && $(media).data('fallback-path') !== "false") {
        this.fallbackPath = $(media).data('fallback-path');
      }
      else {
        this.fallbackPath = this.rootPath + 'thirdparty/';
      }

      if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== "false") {
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
    // Player language is determined as follows:
    // 1. Lang attributes on <html> or <body>, if a matching translation file is available
    // 2. The value of this.lang, if a matching translation file is available
    // 3. English
    // To override this formula and force #2 to take precedence over #1, set data-force-lang="true"
    if ($(media).data('force-lang') !== undefined && $(media).data('force-lang') !== "false") {
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

(function ($) {
  // Set default variable values.
  AblePlayer.prototype.setDefaults = function () {

    // this.playing will change to true after 'playing' event is triggered
    this.playing = false;

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
        $el =  $('<div>', {
          'class': 'able-controller'
        }).hide();
      }
      else if ($elements[i] === 'toolbar') {
        $el =  $('<div>', {
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

  // Initialize player based on data on page.
  // This sets some variables, but does not modify anything.  Safe to call multiple times.
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
      this.mediaType = this.$media.get(0).tagName;
      errorMsg = 'Media player initialized with ' + this.mediaType + '#' + this.mediaId + '. ';
      errorMsg += 'Expecting an HTML5 audio or video element.';
      this.provideFallback(errorMsg);
      deferred.fail();
      return promise;
    }

    this.$sources = this.$media.find('source');

    this.player = this.getPlayer();
    if (!this.player) {
      // an error was generated in getPlayer()
      this.provideFallback(this.error);
    }
    this.setIconType();
    this.setDimensions();

    deferred.resolve();
    return promise;
  };

  AblePlayer.prototype.setDimensions = function() {
    // if <video> element includes width and height attributes,
    // use these to set the max-width and max-height of the player
    if (this.$media.attr('width') && this.$media.attr('height')) {
      this.playerMaxWidth = parseInt(this.$media.attr('width'), 10);
      this.playerMaxHeight = parseInt(this.$media.attr('height'), 10);
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
    // returns either "font" or "image"
    // create a temporary play span and check to see if button has font-family == "able" (the default)
    // if it doesn't, user has a custom style sheet and icon fonts will not display properly
    // use images as fallback

    var $tempButton, $testButton, controllerFont;

    if (this.forceIconType) {
      // use value specified in data-icon-type
      return false;
    }

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
      console.log('Using ' + this.iconType + 's for player controls');
    }
    if (typeof $tempButton !== 'undefined') {
      $tempButton.remove();
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
    // get playlist for this media element
    this.setupInstancePlaylist();

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
        // add tabindex to each list item
        $(this).find('li').attr('tabindex', '0');
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

    if (this.hasPlaylist && this.playlistEmbed) {
      // Copy the playlist out of the dom, so we can reinject when we build the player.
      var parent = this.$playlist.parent();
      this.$playlistDom = parent.clone();
      parent.remove();
    }
  };

  // Creates the appropriate player for the current source.
  AblePlayer.prototype.recreatePlayer = function () {

    var thisObj, prefsGroups, i;
    thisObj = this;

    // TODO: Ensure when recreating player that we carry over the mediaId
    if (!this.player) {
      console.log("Can't create player; no appropriate player type detected.");
      return;
    }

    // moved this until after setupTracks() is complete
    // used to work fine in this location but was broken in Safari 10
    // this.setMediaAttributes();

    this.loadCurrentPreferences();

    this.injectPlayerCode();
    this.initSignLanguage();
    this.setupTracks().then(function() {

      // moved this here; in its original location was not working in Safari 10
      thisObj.setMediaAttributes();

      thisObj.setupAltCaptions().then(function() {

        if (thisObj.transcriptType === 'external' || thisObj.transcriptType === 'popup') {
          if (thisObj.captions.length <= 1) {
            // without captions/subtitles in multiple languages,
            // there is no need for a transcript language selector
            thisObj.$transcriptLanguageSelect.parent().remove();
          }
        }

        thisObj.initDescription();
        thisObj.initDefaultCaption();

        thisObj.initPlayer().then(function() { // initPlayer success
          thisObj.initializing = false;

          // inject each of the hidden forms that will be accessed from the Preferences popup menu
          prefsGroups = thisObj.getPreferencesGroups();
          for (i = 0; i < prefsGroups.length; i++) {
            thisObj.injectPrefsForm(prefsGroups[i]);
          }
          thisObj.setupPopups();
          thisObj.updateCaption();
          thisObj.updateTranscript();
          if (thisObj.chaptersDivLocation) {
            thisObj.populateChaptersDiv();
          }
          thisObj.showSearchResults();
        },
        function() {  // initPlayer fail
          thisObj.provideFallback(this.error);
        }
        );
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
    else if (this.player === 'jw') {
      playerPromise = this.initJwPlayer();
    }
    else if (this.player === 'youtube') {
      playerPromise = this.initYouTubePlayer();
    }

    // After player specific initialization is done, run remaining general initialization.
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    playerPromise.done(
      function () { // done/resolved
        if (thisObj.useFixedSeekInterval === false) {
          thisObj.setSeekInterval();
        }
        thisObj.addControls();
        thisObj.addEventListeners();
        // Calling these set functions also initializes some icons.
        if (thisObj.Volume) {
          thisObj.setMute(false);
        }
        thisObj.setFullscreen(false);
        thisObj.setVolume(thisObj.defaultVolume);
        thisObj.refreshControls();

        // After done messing with the player, this is necessary to fix playback on iOS
        if (thisObj.player === 'html5' && thisObj.isIOS()) {
          thisObj.$media[0].load();
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
    var duration;
    this.seekInterval = this.defaultSeekInterval;
    if (this.useChapterTimes) {
      duration = this.chapterDuration;
    }
    else {
      duration = this.getDuration();
    }
    if (typeof duration === 'undefined' || duration < 1) {
      // no duration; just use default for now but keep trying until duration is available
      this.seekIntervalCalculated = false;
      return;
    }
    else {
      if (duration <= 20) {
         this.seekInterval = 5;  // 4 steps max
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

    if (this.usingYouTubeCaptions) {
      captions = this.ytCaptions;
    }
    else {
      captions = this.captions;
    }

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
    }
  };

  AblePlayer.prototype.initHtml5Player = function () {
    // Nothing special to do!
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    deferred.resolve();
    return promise;
  };

  AblePlayer.prototype.initJwPlayer = function () {

    var jwHeight;
    var thisObj = this;
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    $.ajax({
      async: false,
      url: this.fallbackPath + 'jwplayer.js',
      dataType: 'script',
      success: function( data, textStatus, jqXHR) {
        // Successfully loaded the JW Player
        // add an id to div.able-media-container (JW Player needs this)
        thisObj.jwId = thisObj.mediaId + '_fallback';
        thisObj.$mediaContainer.attr('id', thisObj.jwId);
        if (thisObj.mediaType === 'audio') {
          // JW Player always shows its own controls if height <= 40
          // Must set height to 0 to hide them
          jwHeight = 0;
        }
        else {
          jwHeight = thisObj.playerHeight;
        }
        var sources = [];
        $.each(thisObj.$sources, function (ii, source) {
          sources.push({file: $(source).attr('src')});
        });

        var flashplayer = thisObj.fallbackPath + 'jwplayer.flash.swf';
        var html5player = thisObj.fallbackPath + 'jwplayer.html5.js';

        // Initializing JW Player with width:100% results in player that is either the size of the video
        // or scaled down to fit the container if container is smaller
        // After onReady event fires, actual dimensions will be collected for future use
        // in preserving the video ratio
        if (thisObj.mediaType === 'video') {
          thisObj.jwPlayer = jwplayer(thisObj.jwId).setup({
            playlist: [{
              image: thisObj.$media.attr('poster'),
              sources: sources
            }],
            flashplayer: flashplayer,
            html5player: html5player,
            controls: false,
            volume: thisObj.defaultVolume * 100,
            width: '100%',
            fallback: false,
            primary: 'flash',
            wmode: 'transparent' // necessary to get HTML captions to appear as overlay
          });
        }
        else { // if this is an audio player
          thisObj.jwPlayer = jwplayer(thisObj.jwId).setup({
            playlist: [{
              sources: sources
            }],
            flashplayer: flashplayer,
            html5player: html5player,
            controls: false,
            volume: this.defaultVolume * 100,
            height: 0,
            width: '100%',
            fallback: false,
            primary: 'flash'
          });
        }
        // remove the media element - we're done with it
        // keeping it would cause too many potential problems with HTML5 & JW event listeners both firing
        thisObj.$media.remove();

        deferred.resolve();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        // Loading the JW Player failed
        this.error = 'Failed to load JW Player.';
        deferred.reject();
      }
    });
    // Done with JW Player initialization.
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
    // return 'html5', 'jw' or null
    var i, sourceType, $newItem;
    if (this.youTubeId) {
      if (this.mediaType !== 'video') {
        this.error = 'To play a YouTube video, use the &lt;video&gt; tag.';
        return null;
      }
      else {
        return 'youtube';
      }
    }
    else if (this.testFallback ||
             ((this.isUserAgent('msie 7') || this.isUserAgent('msie 8') || this.isUserAgent('msie 9')) && this.mediaType === 'video') ||
             (this.isIOS() && (this.isIOS(4) || this.isIOS(5) || this.isIOS(6)))
            ) {
      // the user wants to test the fallback player, or
      // the user is using an older version of IE or IOS,
      // both of which had buggy implementation of HTML5 video
      if (this.fallback === 'jw' && this.jwCanPlay()) {
        return 'jw';
      }
      else {
        this.error = 'The fallback player (JW Player) is unable to play the available media file.';
        return null;
      }
    }
    else if (this.media.canPlayType) {
      return 'html5';
    }
    else {
      this.error = 'This browser does not support the available media file.';
      return null;
    }
  };

  AblePlayer.prototype.jwCanPlay = function() {
    // Determine whether there are media files that JW supports
    var i, sourceType, $firstItem;

    if (this.$sources.length > 0) { // this media has one or more <source> elements
      for (i = 0; i < this.$sources.length; i++) {
        sourceType = this.$sources[i].getAttribute('type');
        if ((this.mediaType === 'video' && sourceType === 'video/mp4') ||
            (this.mediaType === 'audio' && sourceType === 'audio/mpeg')) {
            // JW Player can play this
            return true;
        }
      }
    }
    // still here? That means there's no source that JW can play
    // check for an mp3 or mp4 in a able-playlist
    // TODO: Implement this more efficiently
    // Playlist is initialized later in setupInstancePlaylist()
    // but we can't wait for that...
    if ($('.able-playlist')) {
      // there's at least one playlist on this page
      // get the first item from the first playlist
      // if JW Player can play that one, assume it can play all items in all playlists
      $firstItem = $('.able-playlist').eq(0).find('li').eq(0);
      if (this.mediaType === 'audio') {
        if ($firstItem.attr('data-mp3')) {
          return true;
        }
        else if (this.mediaType === 'video') {
          if ($firstItem.attr('data-mp4')) {
            return true;
          }
        }
      }
    }
    return false;
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
    // useful for settings updated indpedently of Preferences dialog
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
        'default': this.tt.sans
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
        'label': this.tt.prefDescFormat,
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

  // Loads current/default preferences from cookie into the AblePlayer object.
  AblePlayer.prototype.loadCurrentPreferences = function () {
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
      $descFieldset1, $descLegend1, $descFieldset2, $descLegend2, $legend,
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

    if (form === 'descriptions') {
      // descriptions form has two field sets

      // Fieldset 1
      $descFieldset1 = $('<fieldset>');
      fieldsetClass = 'able-prefs-' + form + '1';
      fieldsetId = this.mediaId + '-prefs-' + form + '1';
      $descFieldset1.addClass(fieldsetClass).attr('id',fieldsetId);
      $descLegend1 = $('<legend>' + this.tt.prefDescFormat + '</legend>');
      $descFieldset1.append($descLegend1);

      // Fieldset 2
      $descFieldset2 = $('<fieldset>');
      fieldsetClass = 'able-prefs-' + form + '2';
      fieldsetId = this.mediaId + '-prefs-' + form + '2';
      $descFieldset2.addClass(fieldsetClass).attr('id',fieldsetId);
      $descLegend2 = $('<legend>' + this.tt.prefHeadingTextDescription + '</legend>');
      $descFieldset2.append($descLegend2);
    }
    else {
      // all other forms just have one fieldset
      $fieldset = $('<fieldset>');
      fieldsetClass = 'able-prefs-' + form;
      fieldsetId = this.mediaId + '-prefs-' + form;
      $fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
      if (form === 'keyboard') {
        $legend = $('<legend>' + this.tt.prefHeadingKeyboard1 + '</legend>');
        $fieldset.append($legend);
      }
    }
    for (i=0; i<available.length; i++) {

      // only include prefs on the current form if they have a label
      if ((available[i]['group'] == form) && available[i]['label']) {

        thisPref = available[i]['name'];
        thisClass = 'able-' + thisPref;
        thisId = this.mediaId + '_' + thisPref;
        if (thisPref !== 'prefDescFormat') {
          $thisDiv = $('<div>').addClass(thisClass);
        }

        // Audio Description preferred format radio buttons
        if (thisPref == 'prefDescFormat') {

          // option 1 radio button
          $div1 = $('<div>');
          id1 = thisId + '_1';
          $label1 = $('<label>')
            .attr('for',id1)
            .text(this.capitalizeFirstLetter(this.tt.prefDescFormatOption1))
          $radio1 = $('<input>',{
            type: 'radio',
            name: thisPref,
            id: id1,
            value: 'video'
          });
          if (this.prefDescFormat === 'video') {
            $radio1.prop('checked',true);
          };
          $div1.append($radio1,$label1);

          // option 2 radio button
          $div2 = $('<div>');
          id2 = thisId + '_2';
          $label2 = $('<label>')
            .attr('for',id2)
            .text(this.capitalizeFirstLetter(this.tt.prefDescFormatOption2));
          $radio2 = $('<input>',{
            type: 'radio',
            name: thisPref,
            id: id2,
            value: 'text'
          });
          if (this.prefDescFormat === 'text') {
            $radio2.prop('checked',true);
          };
          $div2.append($radio2,$label2);
        }
        else if (form === 'captions') {
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
            else if (thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
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
        if (form === 'descriptions') {
          if (thisPref === 'prefDescFormat') {
            $descFieldset1.append($div1,$div2);
          }
          else {
            $descFieldset2.append($thisDiv);
          }
        }
        else {
          $fieldset.append($thisDiv);
        }
      }
    }
    if (form === 'descriptions') {
      $prefsDiv.append($descFieldset1,$descFieldset2);
    }
    else {
      $prefsDiv.append($fieldset);
    }
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
    $('div.able-prefs-form').keydown(function(event) {
      if (event.which === 27) { // escape
        thisObj.resetPrefsForm();
      }
    });
  };

   // Reset preferences form with default values from cookie
   // Called when user clicks cancel or close button in Prefs Dialog
   // also called when user presses Escape

   AblePlayer.prototype.resetPrefsForm = function () {

     var thisObj, cookie, available, i, prefName, thisDiv, thisId;

     thisObj = this;
     cookie = this.getCookie();
     available = this.getAvailablePreferences();
     for (i=0; i<available.length; i++) {
       prefName = available[i]['name'];
       if (prefName === 'prefDescFormat') {
         if (this[prefName] === 'text') {
           $('input[value="text"]').prop('checked',true);
         }
         else {
           $('input[value="video"]').prop('checked',true);
         }
       }
       else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
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

  // Return a prefs object constructed from the form.
  AblePlayer.prototype.savePrefsFromForm = function () {
    // called when user saves the Preferences form
    // update cookie with new value
    var numChanges, numCapChanges, capSizeChanged, capSizeValue, newValue;

    numChanges = 0;
    numCapChanges = 0; // changes to caption-style-related preferences
    capSizeChanged = false;
    var cookie = this.getCookie();
    var available = this.getAvailablePreferences();
    for (var i=0; i < available.length; i++) {
      // only prefs with labels are used in the Prefs form
      if (available[i]['label']) {
        var prefName = available[i]['name'];
        if (prefName == 'prefDescFormat') {
          this.prefDescFormat = $('input[name="' + prefName + '"]:checked').val();
          if (this.prefDescFormat !== cookie.preferences['prefDescFormat']) { // user changed setting
            cookie.preferences['prefDescFormat'] = this.prefDescFormat;
            numChanges++;
          }
        }
        else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
          // this is one of the caption-related select fields
          newValue = $('select[name="' + prefName + '"]').val();
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
          if ($('input[name="' + prefName + '"]').is(':checked')) {
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
    this.updatePrefs();
    if (numCapChanges > 0) {
      this.stylizeCaptions(this.$captionsDiv);
      // also apply same changes to descriptions, if present
      if (typeof this.$descDiv !== 'undefined') {
        this.stylizeCaptions(this.$descDiv);
      }
    }
  }

  // Updates player based on current prefs.  Safe to call multiple times.
  AblePlayer.prototype.updatePrefs = function () {

    var modHelp;

    // modifier keys (update help text)
    if (this.prefAltKey === 1) {
      modHelp = 'Alt + ';
    }
    else {
      modHelp = '';
    }
    if (this.prefCtrlKey === 1) {
      modHelp += 'Control + ';
    }
    if (this.prefShiftKey === 1) {
      modHelp += 'Shift + ';
    }
    $('.able-help-modifiers').text(modHelp);

    // tabbable transcript
    if (this.prefTabbable === 1) {
      $('.able-transcript span.able-transcript-seekpoint').attr('tabindex','0');
    }
    else {
      $('.able-transcript span.able-transcript-seekpoint').removeAttr('tabindex');
    }

    // transcript highlights
    if (this.prefHighlight === 0) {
      // user doesn't want highlights; remove any existing highlights
      $('.able-transcript span').removeClass('able-highlight');
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
      else if (console.log) {
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
          console.warn(errString);
        }
        else if (console.log) {
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
    //  If video:
    //   IOS does not support any of the player's functionality
    //   - everything plays in its own player
    //   Therefore, AblePlayer is not loaded & all functionality is disabled
    //   (this all determined. If this is IOS && video, this function is never called)
    //  If audio:
    //   HTML cannot be injected as a *parent* of the <audio> element
    //   It is therefore injected *after* the <audio> element
    //   This is only a problem in IOS 6 and earlier,
    //   & is a known bug, fixed in IOS 7

    var thisObj, vidcapContainer, prefsGroups, i;
    thisObj = this;

    // create three wrappers and wrap them around the media element. From inner to outer:
    // $mediaContainer - contains the original media element
    // $ableDiv - contains the media player and all its objects (e.g., captions, controls, descriptions)
    // $ableWrapper - contains additional widgets (e.g., transcript window, sign window)
    this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();
    this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
    this.$ableWrapper = this.$ableDiv.wrap('<div class="able-wrapper"></div>').parent();
    if (this.player !== 'youtube') {
      this.$ableWrapper.css({
        'max-width': this.playerMaxWidth + 'px'
      });
    }

    this.injectOffscreenHeading();

    // youtube adds its own big play button
    // if (this.mediaType === 'video' && this.player !== 'youtube') {
    if (this.mediaType === 'video') {
      if (this.iconType == 'font' && this.player !== 'youtube') {
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

    if (this.transcriptType) {
      if (this.transcriptType === 'popup' || this.transcriptType === 'external') {
        this.injectTranscriptArea();
      }
      else if (this.transcriptType === 'manual') {
        this.setupManualTranscript();
      }
      this.addTranscriptAreaEvents();
    }

    this.injectAlert();
    this.injectPlaylist();
  };

  AblePlayer.prototype.injectOffscreenHeading = function () {
    // Add offscreen heading to the media container.
    // The heading injected in $ableDiv is one level deeper than the closest parent heading
    // as determined by getNextHeadingLevel()
    var headingType;
    this.playerHeadingLevel = this.getNextHeadingLevel(this.$ableDiv); // returns in integer 1-6
    headingType = 'h' + this.playerHeadingLevel.toString();
    this.$headingDiv = $('<' + headingType + '>');
    this.$ableDiv.prepend(this.$headingDiv);
    this.$headingDiv.addClass('able-offscreen');
    this.$headingDiv.text(this.tt.playerHeading);
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
      'class': 'able-descriptions',
      'aria-live': 'assertive',
      'aria-atomic': 'true'
    });
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

    if (this.$media.attr('poster')) {
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
    this.$alertBox.appendTo(this.$ableDiv);
    if (this.mediaType == 'audio') {
      top = -10;
    }
    else {
      top = Math.round(this.$mediaContainer.offset().top * 10) / 10;
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

    if (this.hasPlaylist && this.$sources.length === 0) {
      // no source elements were provided. Construct them from the first playlist item
      this.initializing = true;
      this.swapSource(0);
      // redefine this.$sources now that media contains one or more <source> elements
      this.$sources = this.$media.find('source');
    }
  };

  // Create popup div and append to player
  // 'which' parameter is either 'captions', 'chapters', 'prefs', or 'X-window' (e.g., "sign-window")
  AblePlayer.prototype.createPopup = function (which) {

    var thisObj, $popup, $thisButton, $thisListItem, $prevButton, $nextButton,
        selectedTrackIndex, selectedTrack;
    thisObj = this;
    $popup = $('<div>',{
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup'
    });
    if (which === 'chapters' || which === 'prefs' || which === 'sign-window' || which === 'transcript-window') {
      $popup.addClass('able-popup-no-radio');
    }
    $popup.on('keydown',function (e) {
      $thisButton = $(this).find('input:focus');
      $thisListItem = $thisButton.parent();
      if ($thisListItem.is(':first-child')) {
        // this is the first button
        $prevButton = $(this).find('input').last(); // wrap to bottom
        $nextButton = $thisListItem.next().find('input');
      }
      else if ($thisListItem.is(':last-child')) {
        // this is the last button
        $prevButton = $thisListItem.prev().find('input');
        $nextButton = $(this).find('input').first(); // wrap to top
      }
      else {
        $prevButton = $thisListItem.prev().find('input');
        $nextButton = $thisListItem.next().find('input');
      }
      if (e.which === 9) { // Tab
        if (e.shiftKey) {
          $thisListItem.removeClass('able-focus');
          $prevButton.focus();
          $prevButton.parent().addClass('able-focus');
        }
        else {
          $thisListItem.removeClass('able-focus');
          $nextButton.focus();
          $nextButton.parent().addClass('able-focus');
        }
      }
      else if (e.which === 40 || e.which === 39) { // down or right arrow
        $thisListItem.removeClass('able-focus');
        $nextButton.focus();
        $nextButton.parent().addClass('able-focus');
      }
      else if (e.which == 38 || e.which === 37) { // up or left arrow
        $thisListItem.removeClass('able-focus');
        $prevButton.focus();
        $prevButton.parent().addClass('able-focus');
      }
      else if (e.which === 32 || e.which === 13) { // space or enter
        $('input:focus').click();
      }
      else if (e.which === 27) {  // Escape
        $thisListItem.removeClass('able-focus');
        thisObj.closePopups();
      }
      e.preventDefault();
    });
    this.$controllerDiv.append($popup);
    return $popup;
  };

  AblePlayer.prototype.closePopups = function () {
    if (this.chaptersPopup && this.chaptersPopup.is(':visible')) {
      this.chaptersPopup.hide();
      this.$chaptersButton.focus();
    }
    if (this.captionsPopup && this.captionsPopup.is(':visible')) {
      this.captionsPopup.hide();
      this.$ccButton.focus();
    }
    if (this.prefsPopup && this.prefsPopup.is(':visible')) {
      this.prefsPopup.hide();
      this.$prefsButton.focus();
    }
    if (this.$windowPopup && this.$windowPopup.is(':visible')) {
      this.$windowPopup.hide();
      this.$windowButton.show().focus();
    }
    if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
      this.$volumeSlider.hide().attr('aria-hidden','true');
      this.$volumeAlert.text(this.tt.volumeSliderClosed);
      this.$volumeButton.focus();
    }
  };

  AblePlayer.prototype.setupPopups = function (which) {

    // Create and fill in the popup menu forms for various controls.
    // parameter 'which' is passed if refreshing content of an existing popup ('captions' or 'chapters')

    var popups, thisObj, hasDefault, i, j,
        tracks, trackList, trackItem, track,
        radioName, radioId, trackButton, trackLabel,
        prefCats, prefCat, prefLabel;

    popups = [];
    if (typeof which === 'undefined') {
      popups.push('prefs');
    }

    if (which === 'captions' || (typeof which === 'undefined')) {
      if (typeof this.ytCaptions !== 'undefined') { // setup popup for YouTube captions
        if (this.ytCaptions.length) {
          popups.push('ytCaptions');
        }
      }
      else { // setup popup for local captions
        if (this.captions.length > 0) {
          popups.push('captions');
        }
      }
    }
    if (which === 'chapters' || (typeof which === 'undefined')) {
      if (this.chapters.length > 0 && this.useChaptersButton) {
        popups.push('chapters');
      }
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
          if (typeof this.captionsPopup === 'undefined') {
            this.captionsPopup = this.createPopup('captions');
          }
          tracks = this.captions;
        }
        else if (popup == 'chapters') {
          if (typeof this.chaptersPopup === 'undefined') {
            this.chaptersPopup = this.createPopup('chapters');
          }
          if (this.selectedChapters) {
            tracks = this.selectedChapters.cues;
          }
          else if (this.chapters.length >= 1) {
            tracks = this.chapters[0].cues;
          }
          else {
            tracks = [];
          }
        }
        else if (popup == 'ytCaptions') {
          if (typeof this.captionsPopup === 'undefined') {
            this.captionsPopup = this.createPopup('captions');
          }
          tracks = this.ytCaptions;
        }
        var trackList = $('<ul></ul>');
        radioName = this.mediaId + '-' + popup + '-choice';
        if (popup === 'prefs') {
          prefCats = this.getPreferencesGroups();
          for (j = 0; j < prefCats.length; j++) {
            trackItem = $('<li></li>');
            prefCat = prefCats[j];
            if (prefCat === 'captions') {
              prefLabel = this.tt.prefMenuCaptions;
            }
            else if (prefCat === 'descriptions') {
              prefLabel = this.tt.prefMenuDescriptions;
            }
            else if (prefCat === 'keyboard') {
              prefLabel = this.tt.prefMenuKeyboard;
            }
            else if (prefCat === 'transcript') {
              prefLabel = this.tt.prefMenuTranscript;
            }
            radioId = this.mediaId + '-' + popup + '-' + j;
            trackButton = $('<input>',{
              'type': 'radio',
              'val': prefCat,
              'name': radioName,
              'id': radioId
            });
            trackLabel = $('<label>',{
              'for': radioId
            });
            trackLabel.text(prefLabel);
            trackButton.click(function(event) {
              var whichPref = $(this).attr('value');
              thisObj.setFullscreen(false);
              if (whichPref === 'captions') {
                thisObj.captionPrefsDialog.show();
              }
              else if (whichPref === 'descriptions') {
                thisObj.descPrefsDialog.show();
              }
              else if (whichPref === 'keyboard') {
                thisObj.keyboardPrefsDialog.show();
              }
              else if (whichPref === 'transcript') {
                thisObj.transcriptPrefsDialog.show();
              }
              thisObj.closePopups();
            });
            trackItem.append(trackButton,trackLabel);
            trackList.append(trackItem);
          }
          this.prefsPopup.append(trackList);
        }
        else {
          for (j = 0; j < tracks.length; j++) {
            trackItem = $('<li></li>');
            track = tracks[j];
            radioId = this.mediaId + '-' + popup + '-' + j;
            trackButton = $('<input>',{
              'type': 'radio',
              'val': j,
              'name': radioName,
              'id': radioId
            });
            if (track.def) {
              trackButton.prop('checked',true);
              hasDefault = true;
            }
            trackLabel = $('<label>',{
              'for': radioId
            });
            if (track.language !== 'undefined') {
              trackButton.attr('lang',track.language);
            }
            if (popup == 'captions' || popup == 'ytCaptions') {
              trackLabel.text(track.label || track.language);
              trackButton.click(this.getCaptionClickFunction(track));
            }
            else if (popup == 'chapters') {
              trackLabel.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
              var getClickFunction = function (time) {
                return function () {
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
              }
              trackButton.on('click keypress',getClickFunction(track.start));
            }
            trackItem.append(trackButton,trackLabel);
            trackList.append(trackItem);
          }
          if (popup == 'captions' || popup == 'ytCaptions') {
            // add a captions off button
            radioId = this.mediaId + '-captions-off';
            trackItem = $('<li></li>');
            trackButton = $('<input>',{
              'type': 'radio',
              'name': radioName,
              'id': radioId
            });
            trackLabel = $('<label>',{
              'for': radioId
            });
            trackLabel.text(this.tt.captionsOff);
            if (this.prefCaptions === 0) {
              trackButton.prop('checked',true);
            }
            trackButton.click(this.getCaptionOffFunction());
            trackItem.append(trackButton,trackLabel);
            trackList.append(trackItem);
          }
          if (!hasDefault) { // no 'default' attribute was specified on any <track>
            if ((popup == 'captions' || popup == 'ytCaptions') && (trackList.find('input:radio[lang=' + this.captionLang + ']'))) {
              // check the button associated with the default caption language
              // (as determined in control.js > syncTrackLanguages())
              trackList.find('input:radio[lang=' + this.captionLang + ']').prop('checked',true);
            }
            else {
              // check the first button
              trackList.find('input').first().prop('checked',true);
            }
          }
          if (popup === 'captions' || popup === 'ytCaptions') {
            this.captionsPopup.html(trackList);
          }
          else if (popup === 'chapters') {
            this.chaptersPopup.html(trackList);
          }
        }
      }
    }
  };

  AblePlayer.prototype.provideFallback = function(reason) {

    // provide ultimate fallback for users who are unable to play the media
    // reason is a specific error message
    // if reason is 'NO SUPPORT', use standard text from translation file

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
    else if (reason == 'NO SUPPORT') {
      // not using a supporting browser; use standard text from translation file
      fallbackText =  this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
      fallbackText += this.tt.fallbackError2 + ':';
      fallback = $('<p>').text(fallbackText);
      $fallbackDiv.html(fallback);
      showBrowserList = true;
    }
    else {
      // show the reason
      $fallbackDiv.text(reason);
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

  // Calculates the layout for controls based on media and options.
  // Returns an object with keys 'ul', 'ur', 'bl', 'br' for upper-left, etc.
  // Each associated value is array of control names to put at that location.
  AblePlayer.prototype.calculateControlLayout = function () {
    // Removed rewind/forward in favor of seek bar.

    var controlLayout = {
      'ul': ['play','restart','rewind','forward'],
      'ur': ['seek'],
      'bl': [],
      'br': []
    }

    // test for browser support for volume before displaying volume button
    if (this.browserSupportsVolume()) {
      // volume buttons are: 'mute','volume-soft','volume-medium','volume-loud'
      // previously supported button were: 'volume-up','volume-down'
      this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
      controlLayout['ur'].push('volume');
    }
    else {
      this.volume = false;
    }

    // Calculate the two sides of the bottom-left grouping to see if we need separator pipe.
    var bll = [];
    var blr = [];

    if (this.isPlaybackRateSupported()) {
      bll.push('slower');
      bll.push('faster');
    }

    if (this.mediaType === 'video') {
      if (this.hasCaptions) {
        bll.push('captions'); //closed captions
      }
      if (this.hasSignLanguage) {
        bll.push('sign'); // sign language
      }
      if ((this.hasOpenDesc || this.hasClosedDesc) && (this.useDescriptionsButton)) {
        bll.push('descriptions'); //audio description
      }
    }
    if (this.transcriptType === 'popup') {
      bll.push('transcript');
    }

    if (this.mediaType === 'video' && this.hasChapters && this.useChaptersButton) {
      bll.push('chapters');
    }

    controlLayout['br'].push('preferences');

    // TODO: JW currently has a bug with fullscreen, anything that can be done about this?
    if (this.mediaType === 'video' && this.allowFullScreen && this.player !== 'jw') {
      controlLayout['br'].push('fullscreen');
    }

    // Include the pipe only if we need to.
    if (bll.length > 0 && blr.length > 0) {
      controlLayout['bl'] = bll;
      controlLayout['bl'].push('pipe');
      controlLayout['bl'] = controlLayout['bl'].concat(blr);
    }
    else {
      controlLayout['bl'] = bll.concat(blr);
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
    var useSpeedButtons, useFullScreen,
    i, j, k, controls, $controllerSpan, tooltipId, tooltipX, tooltipY, control,
    buttonImg, buttonImgSrc, buttonTitle, newButton, iconClass, buttonIcon, buttonUse,
    leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle,
    controllerStyles, vidcapStyles, captionLabel, popupMenuId;

    var thisObj = this;

    var baseSliderWidth = 100;

    // Initializes the layout into the this.controlLayout variable.
    var controlLayout = this.calculateControlLayout();

    var sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};

    // add an empty div to serve as a tooltip
    tooltipId = this.mediaId + '-tooltip';
    this.$tooltipDiv = $('<div>',{
      'id': tooltipId,
      'class': 'able-tooltip'
    });
    this.$controllerDiv.append(this.$tooltipDiv);

    // step separately through left and right controls
    for (i = 0; i <= 3; i++) {
      controls = controlLayout[sectionByOrder[i]];
      if ((i % 2) === 0) {
        $controllerSpan = $('<div>',{
          'class': 'able-left-controls'
        });
      }
      else {
        $controllerSpan = $('<div>',{
          'class': 'able-right-controls'
        });
      }
      this.$controllerDiv.append($controllerSpan);
      for (j=0; j<controls.length; j++) {
        control = controls[j];
        if (control === 'seek') {
          var sliderDiv = $('<div class="able-seekbar"></div>');
          var sliderLabel = this.mediaType + ' ' + this.tt.seekbarLabel;
          $controllerSpan.append(sliderDiv);
          var duration = this.getDuration();
          if (duration == 0) {
            // set arbitrary starting duration, and change it when duration is known
            duration = 100;
          }
          this.seekBar = new AccessibleSlider(this.mediaType, sliderDiv, 'horizontal', baseSliderWidth, 0, duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
        }
        else if (control === 'pipe') {
          // TODO: Unify this with buttons somehow to avoid code duplication
          var pipe = $('<span>', {
            'tabindex': '-1',
            'aria-hidden': 'true'
          });
          if (this.iconType === 'font') {
            pipe.addClass('icon-pipe');
          }
          else {
            var pipeImg = $('<img>', {
              src: this.rootPath + 'button-icons/' + this.iconColor + '/pipe.png',
              alt: '',
              role: 'presentation'
            });
            pipe.append(pipeImg);
          }
          $controllerSpan.append(pipe);
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
          newButton = $('<button>',{
            'type': 'button',
            'tabindex': '0',
            'aria-label': buttonTitle,
            'class': 'able-button-handler-' + control
          });
          if (control === 'volume' || control === 'preferences') {
            // This same ARIA for captions and chapters are added elsewhere
            if (control == 'preferences') {
              popupMenuId = this.mediaId + '-prefs-menu';
            }
            else if (control === 'volume') {
              popupMenuId = this.mediaId + '-volume-slider';
            }
            newButton.attr({
              'aria-controls': popupMenuId
            });
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
            newButton.append(buttonIcon);
          }
          else if (this.iconType === 'svg') {
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
              'xlink:href': this.rootPath + 'icons/able-icons.svg#' + iconClass
            });
            buttonIcon.append(buttonUse);
            newButton.html(buttonIcon);

            // Final step: Need to refresh the DOM in order for browser to process & display the SVG
            newButton.html(newButton.html());
          }
          else {
            // use images
            buttonImg = $('<img>',{
              'src': buttonImgSrc,
              'alt': '',
              'role': 'presentation'
            });
            newButton.append(buttonImg);
          }
          // add the visibly-hidden label for screen readers that don't support aria-label on the button
          var buttonLabel = $('<span>',{
            'class': 'able-clipped'
          }).text(buttonTitle);
          newButton.append(buttonLabel);
          // add an event listener that displays a tooltip on mouseenter or focus
          newButton.on('mouseenter focus',function(event) {
            var label = $(this).attr('aria-label');
            // get position of this button
            var position = $(this).position();
            var buttonHeight = $(this).height();
            var buttonWidth = $(this).width();
            var tooltipY = position.top - buttonHeight - 15;
            var centerTooltip = true;
            if ($(this).closest('div').hasClass('able-right-controls')) {
              // this control is on the right side
              if ($(this).closest('div').find('button:last').get(0) == $(this).get(0)) {
                // this is the last control on the right
                // position tooltip using the "right" property
                centerTooltip = false;
                var tooltipX = 0;
                var tooltipStyle = {
                  left: '',
                  right: tooltipX + 'px',
                  top: tooltipY + 'px'
                };
              }
            }
            else {
              // this control is on the left side
              if ($(this).is(':first-child')) {
                // this is the first control on the left
                centerTooltip = false;
                var tooltipX = position.left;
                var tooltipStyle = {
                  left: tooltipX + 'px',
                  right: '',
                  top: tooltipY + 'px'
                };
              }
            }
            if (centerTooltip) {
              // populate tooltip, then calculate its width before showing it
              var tooltipWidth = $('#' + tooltipId).text(label).width();
              // center the tooltip horizontally over the button
              var tooltipX = position.left - tooltipWidth/2;
              var tooltipStyle = {
                left: tooltipX + 'px',
                right: '',
                top: tooltipY + 'px'
              };
            }
            var tooltip = $('#' + tooltipId).text(label).css(tooltipStyle);
            thisObj.showTooltip(tooltip);
            $(this).on('mouseleave blur',function() {
              $('#' + tooltipId).text('').hide();
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
              newButton.addClass('buttonOff').attr('title',captionLabel);
            }
          }
          else if (control === 'descriptions') {
            if (!this.prefDesc || this.prefDesc !== 1) {
              // user prefer non-audio described version
              // Therefore, load media without description
              // Description can be toggled on later with this button
              newButton.addClass('buttonOff').attr('title',this.tt.turnOnDescriptions);
            }
          }

          $controllerSpan.append(newButton);

          // create variables of buttons that are referenced throughout the AblePlayer object
          if (control === 'play') {
            this.$playpauseButton = newButton;
          }
          else if (control === 'captions') {
            this.$ccButton = newButton;
          }
          else if (control === 'sign') {
            this.$signButton = newButton;
            // gray out sign button if sign language window is not active
            if (!(this.$signWindow.is(':visible'))) {
              this.$signButton.addClass('buttonOff');
            }
          }
          else if (control === 'descriptions') {
            this.$descButton = newButton;
            // button will be enabled or disabled in description.js > initDescription()
          }
          else if (control === 'mute') {
            this.$muteButton = newButton;
          }
          else if (control === 'transcript') {
            this.$transcriptButton = newButton;
            // gray out transcript button if transcript is not active
            if (!(this.$transcriptDiv.is(':visible'))) {
              this.$transcriptButton.addClass('buttonOff').attr('title',this.tt.showTranscript);
            }
          }
          else if (control === 'fullscreen') {
            this.$fullscreenButton = newButton;
          }
          else if (control === 'chapters') {
            this.$chaptersButton = newButton;
          }
          else if (control === 'preferences') {
            this.$prefsButton = newButton;
          }
          else if (control === 'volume') {
            this.$volumeButton = newButton;
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
    this.refreshControls();
  };

  AblePlayer.prototype.useSvg = function () {

    // Modified from IcoMoon.io svgxuse
    // @copyright Copyright (c) 2016 IcoMoon.io
    // @license   Licensed under MIT license
    // See https://github.com/Keyamoon/svgxuse
    // @version   1.1.16

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

  AblePlayer.prototype.swapSource = function(sourceIndex) {

    // Change media player source file, for instance when moving to the next element in a playlist.
    // NOTE: Swapping source for audio description is handled elsewhere;
    // see description.js > swapDescription()

    var $newItem, itemTitle, itemLang, sources, s, jwSource, i, $newSource, nowPlayingSpan;

    this.$media.find('source').remove();
    $newItem = this.$playlist.eq(sourceIndex);
    itemTitle = $newItem.html();
    if ($newItem.attr('lang')) {
      itemLang = $newItem.attr('lang');
    }
    sources = [];
    s = 0; // index
    if (this.mediaType === 'audio') {
      if ($newItem.attr('data-mp3')) {
        jwSource = $newItem.attr('data-mp3'); // JW Player can play this
        sources[s] =  new Array('audio/mpeg',jwSource);
        s++;
      }
      if ($newItem.attr('data-webm')) {
        sources[s] = new Array('audio/webm',$newItem.attr('data-webm'));
        s++;
      }
      if ($newItem.attr('data-webma')) {
        sources[s] = new Array('audio/webm',$newItem.attr('data-webma'));
        s++;
      }
      if ($newItem.attr('data-ogg')) {
        sources[s] = new Array('audio/ogg',$newItem.attr('data-ogg'));
        s++;
      }
      if ($newItem.attr('data-oga')) {
        sources[s] = new Array('audio/ogg',$newItem.attr('data-oga'));
        s++;
      }
      if ($newItem.attr('data-wav')) {
        sources[s] = new Array('audio/wav',$newItem.attr('data-wav'));
        s++;
      }
    }
    else if (this.mediaType === 'video') {
      if ($newItem.attr('data-mp4')) {
        jwSource = $newItem.attr('data-mp4'); // JW Player can play this
        sources[s] =  new Array('video/mp4',jwSource);
        s++;
      }
      if ($newItem.attr('data-webm')) {
        sources[s] = new Array('video/webm',$newItem.attr('data-webm'));
        s++;
      }
      if ($newItem.attr('data-webmv')) {
        sources[s] = new Array('video/webm',$newItem.attr('data-webmv'));
        s++;
      }
      if ($newItem.attr('data-ogg')) {
        sources[s] = new Array('video/ogg',$newItem.attr('data-ogg'));
        s++;
      }
      if ($newItem.attr('data-ogv')) {
        sources[s] = new Array('video/ogg',$newItem.attr('data-ogv'));
        s++;
      }
    }
    for (i=0; i<sources.length; i++) {
      $newSource = $('<source>',{
        type: sources[i][0],
        src: sources[i][1]
      });
      this.$media.append($newSource);
    }

    // update playlist to indicate which item is playing
    //$('.able-playlist li').removeClass('able-current');
    this.$playlist.removeClass('able-current');
    $newItem.addClass('able-current');

    // update Now Playing div
    if (this.showNowPlaying === true) {
      nowPlayingSpan = $('<span>');
      if (typeof itemLang !== 'undefined') {
        nowPlayingSpan.attr('lang',itemLang);
      }
      nowPlayingSpan.html('<span>Selected track:</span>' + itemTitle);
      this.$nowPlayingDiv.html(nowPlayingSpan);
    }

    // reload audio after sources have been updated
    // if this.swappingSrc is true, media will autoplay when ready
    if (this.initializing) { // this is the first track - user hasn't pressed play yet
      this.swappingSrc = false;
    }
    else {
      this.swappingSrc = true;
      if (this.player === 'html5') {
        this.media.load();
      }
      else if (this.player === 'jw') {
        this.jwPlayer.load({file: jwSource});
      }
      else if (this.player === 'youtube') {
        // Does nothing, can't swap source with youtube.
        // TODO: Anything we need to do to prevent this happening?
      }
    }
  };

  AblePlayer.prototype.getButtonTitle = function(control) {

    var captionsCount;

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
    else if (control === 'rewind') {
      return this.tt.rewind;
    }
    else if (control === 'forward') {
      return this.tt.forward;
    }
    else if (control === 'captions') {
      if (this.usingYouTubeCaptions) {
        captionsCount = this.ytCaptions.length;
      }
      else {
        captionsCount = this.captions.length;
      }
      if (captionsCount > 1) {
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
        console.log('Found an untranslated label: ' + control);
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

    var thisObj = this;

    var deferred = new $.Deferred();
    var promise = deferred.promise();
    this.$tracks = this.$media.find('track');

    this.captions = [];
    this.captionLabels = [];
    this.descriptions = [];
    this.chapters = [];
    this.meta = [];

    var loadingPromises = [];
    for (var ii = 0; ii < this.$tracks.length; ii++) {
      var track = this.$tracks[ii];
      var kind = track.getAttribute('kind');
      var trackSrc = track.getAttribute('src');

      var isDefaultTrack = track.getAttribute('default');

      if (!trackSrc) {
        // Nothing to load!
        continue;
      }

      var loadingPromise = this.loadTextObject(trackSrc);
      loadingPromises.push(loadingPromise);
      loadingPromise.then((function (track, kind) {
        return function (trackSrc, trackText) {
          var cues = thisObj.parseWebVTT(trackSrc, trackText).cues;
          if (kind === 'captions' || kind === 'subtitles') {
            thisObj.setupCaptions(track, cues);
          }
          else if (kind === 'descriptions') {
            thisObj.setupDescriptions(track, cues);
          }
          else if (kind === 'chapters') {
            thisObj.setupChapters(track, cues);
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
    return promise;
  };

  AblePlayer.prototype.setupCaptions = function (track, cues) {

    this.hasCaptions = true;
    // srcLang should always be included with <track>, but HTML5 spec doesn't require it
    // if not provided, assume track is the same language as the default player language
    var trackLang = track.getAttribute('srclang') || this.lang;
    var trackLabel = track.getAttribute('label') || this.getLanguageName(trackLang);
    if (typeof track.getAttribute('default') == 'string') {
      var isDefaultTrack = true;
      // Now remove 'default' attribute from <track>
      // Otherwise, some browsers will display the track
      track.removeAttribute('default');
    }
    else {
      var isDefaultTrack = false;
    }
    // caption cues from WebVTT are used to build a transcript for both audio and video
    // but captions are currently only supported for video
    if (this.mediaType === 'video') {

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
        });
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

    this.currentCaption = -1;
    if (this.prefCaptions === 1) {
      // Captions default to on.
      this.captionsOn = true;
    }
    else {
      this.captionsOn = false;
    }

    if (this.transcriptType === 'external' || this.transcriptType === 'popup') {
      // Remove the "Unknown" option from the select box.
      if (this.$unknownTranscriptOption) {
        this.$unknownTranscriptOption.remove();
        this.$unknownTranscriptOption = null;
      }
      var option = $('<option></option>',{
        value: trackLang,
        lang: trackLang
      }).text(trackLabel);
    }
    // alphabetize tracks by label
    if (this.transcriptType === 'external' || this.transcriptType === 'popup') {
      var options = this.$transcriptLanguageSelect.find('option');
    }
    if (this.captions.length === 0) { // this is the first
      this.captions.push({
        'cues': cues,
        'language': trackLang,
        'label': trackLabel,
        'def': isDefaultTrack
      });
      if (this.transcriptType === 'external' || this.transcriptType === 'popup') {
        if (isDefaultTrack) {
          option.prop('selected', true);
        }
        this.$transcriptLanguageSelect.append(option);
      }
      this.captionLabels.push(trackLabel);
    }
    else { // there are already tracks in the array
      var inserted = false;
      for (var i = 0; i < this.captions.length; i++) {
        var capLabel = this.captionLabels[i];
        if (trackLabel.toLowerCase() < this.captionLabels[i].toLowerCase()) {
          // insert before track i
          this.captions.splice(i,0,{
            'cues': cues,
            'language': trackLang,
            'label': trackLabel,
            'def': isDefaultTrack
          });
          if (this.transcriptType === 'external' || this.transcriptType === 'popup') {
            if (isDefaultTrack) {
              option.prop('selected', true);
            }
            option.insertBefore(options.eq(i));
          }
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
          'def': isDefaultTrack
        });
        if (this.transcriptType === 'external' || this.transcriptType === 'popup') {
          if (isDefaultTrack) {
            option.prop('selected', true);
          }
          this.$transcriptLanguageSelect.append(option);
        }
        this.captionLabels.push(trackLabel);
      }
    }
    if (this.transcriptType === 'external' || this.transcriptType === 'popup') {
      if (this.$transcriptLanguageSelect.find('option').length > 1) {
        // More than one option now, so enable the select.
        this.$transcriptLanguageSelect.prop('disabled', false);
      }
    }
  };


  AblePlayer.prototype.setupDescriptions = function (track, cues) {

    // called via setupTracks() only if there is track with kind="descriptions"
    // prepares for delivery of text description , in case it's needed
    // whether and how it's delivered is controlled within description.js > initDescription()

    // srcLang should always be included with <track>, but HTML5 spec doesn't require it
    // if not provided, assume track is the same language as the default player language
    var trackLang = track.getAttribute('srclang') || this.lang;

    this.hasClosedDesc = true;
    this.currentDescription = -1;
    this.descriptions.push({
      cues: cues,
      language: trackLang
    });
  };

  AblePlayer.prototype.setupChapters = function (track, cues) {

    // NOTE: WebVTT supports nested timestamps (to form an outline)
    // This is not currently supported.

    // srcLang should always be included with <track>, but HTML5 spec doesn't require it
    // if not provided, assume track is the same language as the default player language
    var trackLang = track.getAttribute('srclang') || this.lang;

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

    var deferred = new $.Deferred();
    var promise = deferred.promise();
    var thisObj = this;

    // create a temp div for holding data
    var $tempDiv = $('<div>',{
      style: 'display:none'
    });

    $tempDiv.load(src, function (trackText, status, req) {
      if (status === 'error') {
        if (thisObj.debug) {
          console.log ('error reading file ' + src + ': ' + status);
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
    // currently supports: YouTube
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    if (this.captions.length === 0) {
      if (this.player === 'youtube' && typeof youTubeDataAPIKey !== 'undefined') {
        this.setupYouTubeCaptions().done(function() {
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
    var deferred, promise, thisObj, containerId, ccLoadPolicy, videoDimensions;

    deferred = new $.Deferred();
    promise = deferred.promise();

    thisObj = this;

    containerId = this.mediaId + '_youtube';

    this.$mediaContainer.prepend($('<div>').attr('id', containerId));
    // NOTE: Tried the following in place of the above in January 2016
    // because in some cases two videos were being added to the DOM
    // However, once v2.2.23 was fairly stable, unable to reptroduce that problem
    // so maybe it's not an issue. This is preserved here temporarily, just in case it's needed...
    // thisObj.$mediaContainer.html($('<div>').attr('id', containerId));

    this.youTubeCaptionsReady = false;

    // if captions are provided locally via <track> elements, use those
    // and unload the captions provided by YouTube
    // Advantages of using <track>:
    // 1. Interactive transcript and searching within video is possible
    // 2. User has greater control over captions' display
    if (thisObj.captions.length) {
      // initialize YouTube player with cc_load_policy = 0
      // this doesn't disable captions;
      // it just doesn't show them automatically (depends on user's preference on YouTube)
      ccLoadPolicy = 0;
      this.usingYouTubeCaptions = false;
    }
    else {
      // set ccLoadPolicy to 1 only if captions are on;
      // this forces them on, regardless of user's preference on YouTube
      if (this.captionsOn) {
        ccLoadPolicy = 1;
      }
      else {
        ccLoadPolicy = 0;
      }
    }
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
    this.youTubePlayer = new YT.Player(containerId, {
      videoId: this.activeYouTubeId,
      width: this.ytWidth,
      height: this.ytHeight,
      playerVars: {
        enablejsapi: 1,
        start: this.startTime,
        controls: 0, // no controls, using our own
        cc_load_policy: ccLoadPolicy,
        hl: this.lang, // use the default language UI
        modestbranding: 1, // no YouTube logo in controller
        rel: 0, // do not show related videos when video ends
        html5: 1 // force html5 if browser supports it (undocumented parameter; 0 does NOT force Flash)
      },
      events: {
        onReady: function () {
          if (thisObj.swappingSrc) {
            // swap is now complete
            thisObj.swappingSrc = false;
            if (thisObj.playing) {
              // resume playing
              thisObj.playMedia();
            }
          }
          if (typeof thisObj.aspectRatio === 'undefined') {
console.log('resizeYouTubePlayer at POS Y1');
            thisObj.resizeYouTubePlayer(thisObj.activeYouTubeId, containerId);
          }
          deferred.resolve();
        },
        onError: function (x) {
          deferred.fail();
        },
        onStateChange: function (x) {
          var playerState = thisObj.getPlayerState(x.data);
          if (playerState === 'playing') {
            thisObj.playing = true;
            thisObj.startedPlaying = true;
          }
          else {
            thisObj.playing = false;
          }
          if (thisObj.stoppingYouTube && playerState === 'paused') {
            if (typeof thisObj.$posterImg !== 'undefined') {
              thisObj.$posterImg.show();
            }
            thisObj.stoppingYouTube = false;
            thisObj.seeking = false;
            thisObj.playing = false;
          }
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
    thisObj.injectPoster(thisObj.$mediaContainer, 'youtube');
    thisObj.$media.remove();
    return promise;
  };

  AblePlayer.prototype.getYouTubeDimensions = function (youTubeId, youTubeContainerId) {

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
        if (this.isFullscreen()) {
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

    // this.ytCaptions has the same structure as this.captions
    // but unfortunately does not contain cues
    // Google *does* offer a captions.download service for downloading captions in WebVTT
    // https://developers.google.com/youtube/v3/docs/captions/download
    // However, this requires OAUTH 2.0 (user must login and give consent)
    // So, for now the best we can do is create an array of available caption/subtitle tracks
    // and provide a button & popup menu to allow users to control them
    this.ytCaptions = [];

    // if a described version is available && user prefers desription
    // Use the described version, and get its captions
    if (this.youTubeDescId && this.prefDesc) {
      youTubeId = this.youTubeDescId;
    }
    else {
      youTubeId = this.youTubeId;
    }

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
      thisObj.getYouTubeCaptionData(youTubeId).done(function() {
        deferred.resolve();
      });
    })
    .fail(function(){
      console.log('Unable to initialize Google API. YouTube captions are currently unavailable.');
    });

    return promise;
  };

  AblePlayer.prototype.getYouTubeCaptionData = function (youTubeId) {
    // get data via YouTube Data API, and push data to this.ytCaptions
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    var thisObj, i, trackId, trackLang, trackLabel, trackKind, isDraft, isDefaultTrack;

    thisObj = this;

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

              trackId = json.result.items[i].id;
              trackLabel = json.result.items[i].snippet.name; // always seems to be empty
              trackLang = json.result.items[i].snippet.language;
              trackKind = json.result.items[i].snippet.trackKind; // ASR, standard, forced
              isDraft = json.result.items[i].snippet.isDraft; // Boolean
              // Other variables that could potentially be collected from snippet:
              // isCC - Boolean, always seems to be false
              // isLarge - Boolean
              // isEasyReader - Boolean
              // isAutoSynced  Boolean
              // status - string, always seems to be "serving"

              if (trackKind !== 'ASR' && !isDraft) {

                // if track name is empty (it always seems to be), assign a name based on trackLang
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

                thisObj.ytCaptions.push({
                  'language': trackLang,
                  'label': trackLabel,
                  'def': isDefaultTrack
                });
              }
            }
            // setupPopups again with new ytCaptions array, replacing original
            thisObj.setupPopups('captions');
            deferred.resolve();
          }
          else {
            thisObj.hasCaptions = false;
            thisObj.usingYouTubeCaptions = false;
            deferred.resolve();
          }
        }, function (reason) {
          console.log('Error: ' + reason.result.error.message);
        });
      });
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
    this.refreshControls();
  };

})(jQuery);

(function ($) {


  // Events:
  //   startTracking(event, position)
  //   tracking(event, position)
  //   stopTracking(event, position)

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

    var thisObj;

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

    this.bodyDiv.append(this.loadedDiv);
    this.bodyDiv.append(this.playedDiv);
    this.bodyDiv.append(this.seekHead);

    this.bodyDiv.wrap('<div></div>');
    this.wrapperDiv = this.bodyDiv.parent();

    if (orientation === 'horizontal') {
      this.wrapperDiv.width(length);
      this.loadedDiv.width(0);
    }
    else {
      this.wrapperDiv.height(length);
      this.loadedDiv.height(0);
    }
    this.wrapperDiv.addClass('able-' + className + '-wrapper');

    if (trackingMedia) {
      this.loadedDiv.addClass('able-' + className + '-loaded');

      this.playedDiv.width(0);
      this.playedDiv.addClass('able-' + className + '-played');

      // Set a default duration. User can call this dynamically if duration changes.
      this.setDuration(max);
    }

    this.seekHead.hover(function (event) {
      thisObj.overHead = true;
      thisObj.refreshTooltip();
    }, function (event) {
      thisObj.overHead = false;

      if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
      thisObj.refreshTooltip();
    });

    this.seekHead.mousemove(function (event) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.trackHeadAtPageX(event.pageX);
      }
    });

    this.seekHead.focus(function (event) {
      thisObj.overHead = true;
      thisObj.refreshTooltip();
    });

    this.seekHead.blur(function (event) {
      thisObj.overHead = false;
      thisObj.refreshTooltip();
    });

    this.bodyDiv.hover(function () {
      thisObj.overBody = true;
      thisObj.refreshTooltip();
    }, function (event) {
      thisObj.overBody = false;
      thisObj.overBodyMousePos = null;
      thisObj.refreshTooltip();

      if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
    });

    this.bodyDiv.mousemove(function (event) {
      thisObj.overBodyMousePos = {
        x: event.pageX,
        y: event.pageY
      };
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.trackHeadAtPageX(event.pageX);
      }
      thisObj.refreshTooltip();
    });

    this.bodyDiv.mousedown(function (event) {
      thisObj.startTracking('mouse', thisObj.pageXToPosition(event.pageX));
      thisObj.trackHeadAtPageX(event.pageX);
      if (!thisObj.seekHead.is(':focus')) {
        thisObj.seekHead.focus();
      }
      event.preventDefault();
    });

    this.seekHead.mousedown(function (event) {
      thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
      if (!thisObj.bodyDiv.is(':focus')) {
        thisObj.bodyDiv.focus();
      }
      event.preventDefault();
    });

    this.bodyDiv.mouseup(function (event) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
    })

    this.seekHead.mouseup(function (event) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
    });

    this.bodyDiv.keydown(function (event) {
      // Home
      if (event.which === 36) {
        thisObj.trackImmediatelyTo(0);
      }
      // End
      else if (event.which === 35) {
        thisObj.trackImmediatelyTo(thisObj.duration);
      }
      // Left arrow or down arrow
      else if (event.which === 37 || event.which === 40) {
        thisObj.arrowKeyDown(-1);
      }
      // Right arrow or up arrow
      else if (event.which === 39 || event.which === 38) {
        thisObj.arrowKeyDown(1);
      }
      // Page up
      else if (event.which === 33 && bigInterval > 0) {
        thisObj.arrowKeyDown(bigInterval);
      }
      // Page down
      else if (event.which === 34 && bigInterval > 0) {
        thisObj.arrowKeyDown(-bigInterval);
      }

      else {
        return;
      }
      event.preventDefault();
    });

    this.bodyDiv.keyup(function (event) {
      if (event.which >= 33 && event.which <= 40) {
        if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
          thisObj.stopTracking(thisObj.keyTrackPosition);
        }
        event.preventDefault();
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

  // TODO: Native HTML5 can have several buffered segments, and this actually happens quite often.  Change this to display them all.
  AccessibleSlider.prototype.setBuffered = function (ratio) {
    this.buffered = ratio;
    this.redrawDivs;
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
      descriptionText  = pMinutes +
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
    });
    this.$volumeSliderTooltip = $('<div>',{
      'class': 'able-tooltip',
      'role': 'tooltip'
    });
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
    this.$volumeSliderHead.on('mousedown',function (event) {
      event.preventDefault(); // prevent text selection (implications?)
      thisObj.draggingVolume = true;
      thisObj.volumeHeadPositionTop = $(this).offset().top;
    });

    // prevent dragging after mouseup as mouseup not detected over iframe (YouTube)
    this.$mediaContainer.on('mouseover',function (event) {
      if(thisObj.player == 'youtube'){
        thisObj.draggingVolume = false;
      }
    });

    $(document).on('mouseup',function (event) {
      thisObj.draggingVolume = false;
    });

    $(document).on('mousemove',function (event) {
      if (thisObj.draggingVolume) {
        x = event.pageX;
        y = event.pageY;
        thisObj.moveVolumeHead(y);
      }
    });

    this.$volumeSliderHead.on('keydown',function (event) {
      // Left arrow or down arrow
      if (event.which === 37 || event.which === 40) {
        thisObj.handleVolume('down');
      }
      // Right arrow or up arrow
      else if (event.which === 39 || event.which === 38) {
        thisObj.handleVolume('up');
      }
      // Escape key or Enter key
      else if (event.which === 27 || event.which === 13) {
        // close popup
        if (thisObj.$volumeSlider.is(':visible')) {
          thisObj.hideVolumePopup();
        }
        else {
          thisObj.showVolumePopup();
        }
      }
      else {
        return;
      }
      event.preventDefault();
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

    this.$volumeSliderTrackOn.css({
      'height': trackOnHeight + 'px',
      'top': trackOnTop + 'px'
    });
    this.$volumeSliderHead.attr({
      'aria-valuenow': volume,
      'aria-valuetext': volumePctText
    });
    this.$volumeSliderHead.css({
      'top': headTop + 'px'
    });
    this.$volumeAlert.text(volumePct + '%');

  };

  AblePlayer.prototype.refreshVolumeButton = function(volume) {

    var volumeName, volumePct, volumeLabel, volumeIconClass, volumeImg;

    volumeName = this.getVolumeName(volume);
    volumePct = (volume/10) * 100;
    volumeLabel = this.tt.volume + ' ' + volumePct + '%';

    if (this.iconType === 'font') {
      volumeIconClass = 'icon-volume-' + volumeName;
      this.$volumeButton.find('span').first().removeClass().addClass(volumeIconClass);
      this.$volumeButton.find('span.able-clipped').text(volumeLabel);
    }
    else {
      volumeImg = this.imgPath + 'volume-' + volumeName + '.png';
      this.$volumeButton.find('img').attr('src',volumeImg);
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
        this.showVolumePopup();
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
    this.$volumeSliderHead.attr('tabindex','0').focus();
  };

  AblePlayer.prototype.hideVolumePopup = function() {

    this.$volumeSlider.hide().attr('aria-hidden','true');
    this.$volumeSliderHead.attr('tabindex','-1');
    this.$volumeButton.focus();
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
      this.media.volume = volume / 10;
      if (this.hasSignLanguage && this.signVideo) {
        this.signVideo.volume = 0; // always mute
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      this.jwPlayer.setVolume(volume * 10);
    }
    else if (this.player === 'youtube') {
      this.youTubePlayer.setVolume(volume * 10);
      this.volume = volume;
    }

    this.lastVolume = volume;
  };

  AblePlayer.prototype.getVolume = function (volume) {

    // return volume using common audio control scale 1 to 10

    if (this.player === 'html5') {
      // uses 0 to 1 scale
      return this.media.volume * 10;
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      // uses 0 to 100 scale
      return this.jwPlayer.getVolume() / 10;
    }
    else if (this.player === 'youtube') {
      // uses 0 to 100 scale
      return this.youTubePlayer.getVolume() / 10;
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
      closeButton.keydown(function (event) {
        // Space key down
        if (event.which === 32) {
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

    modal.keydown(function (event) {
      // Escape
      if (event.which === 27) {
        if (thisObj.escapeHook) {
          thisObj.escapeHook(event, this);
        }
        else {
          thisObj.hide();
          event.preventDefault();
        }
      }
      // Tab
      else if (event.which === 9) {
        // Manually loop tab navigation inside the modal.
        var parts = modal.find('*');
        var focusable = parts.filter(focusableElementsSelector).filter(':visible');

        if (focusable.length === 0) {
          return;
        }

        var focused = $(':focus');
        var currentIndex = focusable.index(focused);
        if (event.shiftKey) {
          // If backwards from first element, go to last.
          if (currentIndex === 0) {
            focusable.get(focusable.length - 1).focus();
            event.preventDefault();
          }
        }
        else {
          if (currentIndex === focusable.length - 1) {
            focusable.get(0).focus();
            event.preventDefault();
          }
        }
      }
      event.stopPropagation();
    });

    $('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('aria-hidden', 'false');
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
      overlay.on('mousedown.accessibleModal', function (event) {
        event.preventDefault();
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
      // originally set focus on the first focusable element
      // thisObj.modal.find('button.modalCloseButton').first().focus();
      // but setting focus on dialog seems to provide more reliable access to ALL content within
      thisObj.modal.focus();
    }, 300);
  };

  AccessibleDialog.prototype.hide = function () {
    if (this.overlay) {
      this.overlay.css('display', 'none');
    }
    this.modal.css('display', 'none');
    this.modal.attr('aria-hidden', 'true');
    $('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('aria-hidden', 'false');

    this.focusedElementBeforeModal.focus();
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

  // Takes seconds and converts to string of form hh:mm:ss
  AblePlayer.prototype.formatSecondsAsColonTime = function (seconds) {

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

  AblePlayer.prototype.capitalizeFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

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
    // prefDescFormat == either 'video' or 'text'
    // prefDescPause == 1 to pause video when description starts; else 0
    // prefVisibleDesc == 1 to visibly show text-based description area; else 0
    // hasOpenDesc == true if a described version of video is available via data-desc-src attribute
    // hasClosedDesc == true if a description text track is available
    // this.useDescFormat == either 'video' or 'text'; the format ultimately delivered
    // descOn == true if description of either type is on
    if (!this.refreshingDesc) {
      // this is the initial build
      // first, check to see if there's an open-described version of this video
      // checks only the first source since if a described version is provided,
      // it must be provided for all sources
      this.descFile = this.$sources.first().attr('data-desc-src');
      if (typeof this.descFile !== 'undefined') {
        this.hasOpenDesc = true;
      }
      else {
        // there's no open-described version via data-desc-src, but what about data-youtube-desc-src?
        if (this.youTubeDescId) {
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
        // both formats are available. Use whichever one user prefers
        this.useDescFormat = this.prefDescFormat;
        this.descOn = true;
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
      if (this.refreshingDesc) { // user just now toggled it off
        this.prevDescFormat = this.useDescFormat;
        this.useDescFormat = false;
        this.descOn = false;
      }
      else { // desc has always been off
        this.useDescFormat = false;
      }
    }

    if (this.descOn) {

      if (this.useDescFormat === 'video') {

        if (!this.usingAudioDescription()) {
          // switched from non-described to described version
          this.swapDescription();
        }
        // hide description div
        this.$descDiv.hide();
        this.$descDiv.removeClass('able-clipped');
      }
      else if (this.useDescFormat === 'text') {
        this.$descDiv.show();
        if (this.prefVisibleDesc) { // make it visible to everyone
          this.$descDiv.removeClass('able-clipped');
        }
        else { // keep it visible to screen readers, but hide from everyone else
          this.$descDiv.addClass('able-clipped');
        }
        if (!this.swappingSrc) {
          this.showDescription(this.getElapsed());
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
    else {
      return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
    }
  };

  AblePlayer.prototype.swapDescription = function() {
    // swap described and non-described source media, depending on which is playing
    // this function is only called in two circumstances:
    // 1. Swapping to described version when initializing player (based on user prefs & availability)
    // 2. User is toggling description
    var thisObj, i, origSrc, descSrc, srcType, jwSourceIndex, newSource;

    thisObj = this;

    // get current time, and start new video at the same time
    // NOTE: There is some risk in resuming playback at the same start time
    // since the described version might include extended audio description (with pauses)
    // and might therefore be longer than the non-described version
    // The benefits though would seem to outweigh this risk
    this.swapTime = this.getElapsed(); // video will scrub to this time after loaded (see event.js)

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
          if (srcType === 'video/mp4') {
            jwSourceIndex = i;
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
          if (srcType === 'video/mp4') {
            jwSourceIndex = i;
          }
        }
        this.swappingSrc = true;
      }

      // now reload the source file.
      if (this.player === 'html5') {
        this.media.load();
      }
      else if (this.player === 'youtube') {
        // TODO: Load new youTubeId
      }
      else if (this.player === 'jw' && this.jwPlayer) {
        newSource = this.$sources[jwSourceIndex].getAttribute('src');
        this.jwPlayer.load({file: newSource});
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
  };

  AblePlayer.prototype.showDescription = function(now) {

    // there's a lot of redundancy between this function and showCaptions
    // Trying to combine them ended up in a mess though. Keeping as is for now.

    if (this.swappingSrc) {
      return;
    }

    var d, thisDescription;
    var flattenComponentForDescription = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else {
        for (var ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponentForDescription(component.children[ii]));
        }
      }
      return result.join('');
    };

    var cues;
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
        // load the new description into the container div
        this.$descDiv.html(flattenComponentForDescription(cues[thisDescription].components));
        if (this.prefDescPause) {
          this.pauseMedia();
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
      console.log('User agent:' + navigator.userAgent);
      console.log('Vendor: ' + navigator.vendor);
      console.log('Browser: ' + this.userAgent.browser.name);
      console.log('Version: ' + this.userAgent.browser.version);
      console.log('OS: ' + this.userAgent.os);
    }
  };

  AblePlayer.prototype.isUserAgent = function(which) {
    var userAgent = navigator.userAgent.toLowerCase();
    if (this.debug) {
      console.log('User agent: ' + userAgent);
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
    if (this.player === 'jw') {
      // JW player flash has problems with native fullscreen.
      return false;
    }
    return document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled;
  };

})(jQuery);

(function ($) {
  AblePlayer.prototype.seekTo = function (newTime) {

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
    else if (this.player === 'jw' && this.jwPlayer) {
      // pause JW Player temporarily.
      // When seek has successfully reached newTime,
      // onSeek event will be called, and playback will be resumed
      this.jwSeekPause = true;
      this.jwPlayer.seek(newTime);
    }
    else if (this.player === 'youtube') {
      this.youTubePlayer.seekTo(newTime,true);
      if (newTime > 0) {
        if (typeof this.$posterImg !== 'undefined') {
          this.$posterImg.hide();
        }
      }
    }
    this.refreshControls();
  };

  AblePlayer.prototype.getDuration = function () {

    var duration;
    if (this.player === 'html5') {
      duration = this.media.duration;
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      duration = this.jwPlayer.getDuration();
    }
    else if (this.player === 'youtube' && this.youTubePlayer) {
      duration = this.youTubePlayer.getDuration();
    }
    if (duration === undefined || isNaN(duration) || duration === -1) {
      return 0;
    }
    return duration;
  };

  AblePlayer.prototype.getElapsed = function () {
    var position;
    if (this.player === 'html5') {
      position = this.media.currentTime;
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      if (this.jwPlayer.getState() === 'IDLE') {
        return 0;
      }
      position = this.jwPlayer.getPosition();
    }
    else if (this.player === 'youtube') {
      if (this.youTubePlayer) {
        position = this.youTubePlayer.getCurrentTime();
      }
    }

    if (position === undefined || isNaN(position) || position === -1) {
      return 0;
    }
    return position;
  };

  // Returns one of the following states:
  //  'stopped' - Not yet played for the first time, or otherwise reset to unplayed.
  //  'ended' - Finished playing.
  //  'paused' - Not playing, but not stopped or ended.
  //  'buffering' - Momentarily paused to load, but will resume once data is loaded.
  //  'playing' - Currently playing.
  AblePlayer.prototype.getPlayerState = function () {
    if (this.swappingSrc) {
      return;
    }
    if (this.player === 'html5') {
      if (this.media.paused) {
        if (this.getElapsed() === 0) {
          return 'stopped';
        }
        else if (this.media.ended) {
          return 'ended';
        }
        else {
          return 'paused';
        }
      }
      else if (this.media.readyState !== 4) {
        return 'buffering';
      }
      else {
        return 'playing';
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      if (this.jwPlayer.getState() === 'PAUSED' || this.jwPlayer.getState() === 'IDLE' || this.jwPlayer.getState() === undefined) {

        if (this.getElapsed() === 0) {
          return 'stopped';
        }
        else if (this.getElapsed() === this.getDuration()) {
          return 'ended';
        }
        else {
          return 'paused';
        }
      }
      else if (this.jwPlayer.getState() === 'BUFFERING') {
        return 'buffering';
      }
      else if (this.jwPlayer.getState() === 'PLAYING') {
        return 'playing';
      }
    }
    else if (this.player === 'youtube' && this.youTubePlayer) {
      var state = this.youTubePlayer.getPlayerState();
      if (state === -1 || state === 5) {
        return 'stopped';
      }
      else if (state === 0) {
        return 'ended';
      }
      else if (state === 1) {
        return 'playing';
      }
      else if (state === 2) {
        return 'paused';
      }
      else if (state === 3) {
        return 'buffering';
      }
    }
  };

  AblePlayer.prototype.isPlaybackRateSupported = function () {
    if (this.player === 'html5') {
      return this.media.playbackRate ? true : false;
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      // Not directly supported by JW player; can hack for HTML5 version by finding the dynamically generated video tag, but decided not to do that.
      return false;
    }
    else if (this.player === 'youtube') {
      // Youtube always supports a finite list of playback rates.  Only expose controls if more than one is available.
      return (this.youTubePlayer.getAvailablePlaybackRates().length > 1);
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
    if (this.hasSignLanguage && this.signVideo) {
      this.signVideo.playbackRate = rate;
    }
    this.$speed.text(this.tt.speed + ': ' + rate.toFixed(2).toString() + 'x');
  };

  AblePlayer.prototype.getPlaybackRate = function () {
    if (this.player === 'html5') {
      return this.media.playbackRate;
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      // Unsupported, always the normal rate.
      return 1;
    }
    else if (this.player === 'youtube') {
      return this.youTubePlayer.getPlaybackRate();
    }
  };

  // Note there are three player states that count as paused in this sense,
  // and one of them is named 'paused'.
  // A better name would be 'isCurrentlyNotPlayingOrBuffering'
  AblePlayer.prototype.isPaused = function () {
    var state = this.getPlayerState();
    return state === 'paused' || state === 'stopped' || state === 'ended';
  };

  AblePlayer.prototype.pauseMedia = function () {
    if (this.player === 'html5') {
      this.media.pause(true);
      if (this.hasSignLanguage && this.signVideo) {
        this.signVideo.pause(true);
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      this.jwPlayer.pause(true);
    }
    else if (this.player === 'youtube') {
      this.youTubePlayer.pauseVideo();
    }
  };

  AblePlayer.prototype.playMedia = function () {
    if (this.player === 'html5') {
      this.media.play(true);
      if (this.hasSignLanguage && this.signVideo) {
        this.signVideo.play(true);
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      this.jwPlayer.play(true);
    }
    else if (this.player === 'youtube') {
      this.youTubePlayer.playVideo();
      if (typeof this.$posterImg !== 'undefined') {
        this.$posterImg.hide();
      }
      this.stoppingYouTube = false;
    }
    this.startedPlaying = true;
  };

  AblePlayer.prototype.refreshControls = function() {

    var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
      updateLive, textByState, timestamp, widthUsed,
      leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
      buffered, newTop, svgLink, newSvgLink,
      statusBarHeight, speedHeight, statusBarWidthBreakpoint;

    thisObj = this;
    if (this.swappingSrc) {
      // wait until new source has loaded before refreshing controls
      return;
    }

    duration = this.getDuration();
    elapsed = this.getElapsed();

    if (this.useChapterTimes) {
      this.chapterDuration = this.getChapterDuration();
      this.chapterElapsed = this.getChapterElapsed();
    }

    if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && duration > 0) {
      // couldn't calculate seekInterval previously; try again.
      this.setSeekInterval();
    }

    if (this.seekBar) {

      if (this.useChapterTimes) {
        lastChapterIndex = this.selectedChapters.cues.length-1;
        if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
          // this is the last chapter
          if (this.currentChapter.end !== duration) {
            // chapter ends before or after video ends
            // need to adjust seekbar duration to match video end
            this.seekBar.setDuration(duration - this.currentChapter.start);
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
        this.seekBar.setDuration(duration);
      }
      if (!(this.seekBar.tracking)) {
        // Only update the aria live region if we have an update pending (from a
        // seek button control) or if the seekBar has focus.
        // We use document.activeElement instead of $(':focus') due to a strange bug:
        //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
        updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
        this.liveUpdatePending = false;
        if (this.useChapterTimes) {
          this.seekBar.setPosition(this.chapterElapsed, updateLive);
        }
        else {
          this.seekBar.setPosition(elapsed, updateLive);
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
          displayElapsed = elapsed;
        }
      }
    }
    if (this.useChapterTimes) {
      this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
    }
    else {
      this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(duration));
    }
    this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));

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
          // TODO: Add play/pause toggle for SVG
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
        if (this.$status.text() !== textByState[this.getPlayerState()] && !this.seekBar.tracking) {
          // Debounce updates; only update after status has stayed steadily different for 250ms.
          timestamp = (new Date()).getTime();
          if (!this.statusDebounceStart) {
            this.statusDebounceStart = timestamp;
            // Make sure refreshControls gets called again at the appropriate time to check.
            this.statusTimeout = setTimeout(function () {
              thisObj.refreshControls();
            }, 300);
          }
          else if ((timestamp - this.statusDebounceStart) > 250) {
            this.$status.text(textByState[this.getPlayerState()]);
            this.statusDebounceStart = null;
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
          }
        }
        else {
          this.statusDebounceStart = null;
          clearTimeout(this.statusTimeout);
          this.statusTimeout = null;
        }

        // Don't change play/pause button display while using the seek bar (or if YouTube stopped)
        if (!this.seekBar.tracking && !this.stoppingYouTube) {
          if (this.isPaused()) {
            this.$playpauseButton.attr('aria-label',this.tt.play);

            if (this.iconType === 'font') {
              this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
              this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
            }
            else if (this.iconType === 'svg') {
              // Not currently working. SVG is a work in progress
              this.$playpauseButton.find('svg').removeClass('svg-pause').addClass('svg-play');
              svgLink = this.$playpauseButton.find('use').attr('xlink:href');
              newSvgLink = svgLink.replace('svg-pause','svg-play');
              this.$playpauseButton.find('use').attr(newSvgLink);
              this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
            }
            else {
              this.$playpauseButton.find('img').attr('src',this.playButtonImg);
            }
          }
          else {
            this.$playpauseButton.attr('aria-label',this.tt.pause);

            if (this.iconType === 'font') {
              this.$playpauseButton.find('span').first().removeClass('icon-play').addClass('icon-pause');
              this.$playpauseButton.find('span.able-clipped').text(this.tt.pause);
            }
            else if (this.iconType === 'svg') {
              // Not currently working. SVG is a work in progress
              this.$playpauseButton.find('svg').removeClass('svg-play').addClass('svg-pause');
              svgLink = this.$playpauseButton.find('use').attr('xlink:href');
              newSvgLink = svgLink.replace('svg-play','svg-pause');
              this.$playpauseButton.find('use').attr(newSvgLink);
              this.$playpauseButton.find('span.able-clipped').text(this.tt.pause);
            }
            else {
              this.$playpauseButton.find('img').attr('src',this.pauseButtonImg);
            }
          }
        }
      }
    }

    // Update seekbar width.
    // To do this, we need to calculate the width of all buttons surrounding it.
    if (this.seekBar) {
      widthUsed = 0;
      seekbarSpacer = 40; // adjust for discrepancies in browsers' calculated button widths

      leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
      rightControls = leftControls.next('div.able-right-controls');
      leftControls.children().each(function () {
        if ($(this).prop('tagName')=='BUTTON') {
          widthUsed += $(this).width();
        }
      });
      rightControls.children().each(function () {
        if ($(this).prop('tagName')=='BUTTON') {
          widthUsed += $(this).width();
        }
      });
      if (this.isFullscreen()) {
        seekbarWidth = $(window).width() - widthUsed - seekbarSpacer;
      }
      else {
        seekbarWidth = this.$ableWrapper.width() - widthUsed - seekbarSpacer;
      }
      // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
      if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
        this.seekBar.setWidth(seekbarWidth);
      }
    }

    // Show/hide status bar content conditionally
    if (!this.isFullscreen()) {
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

    if (this.$ccButton) {
      if (this.usingYouTubeCaptions) {
        captionsCount = this.ytCaptions.length;
      }
      else {
        captionsCount = this.captions.length;
      }
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

    if (this.$chaptersButton) {
      this.$chaptersButton.attr({
        'aria-label': this.tt.chapters,
        'aria-haspopup': 'true',
        'aria-controls': this.mediaId + '-chapters-menu'
      });
    }
    if (this.$fullscreenButton) {
      if (!this.isFullscreen()) {
        this.$fullscreenButton.attr('aria-label', this.tt.enterFullScreen);
        if (this.iconType === 'font') {
          this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
          this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullScreen);
        }
        else if (this.iconType === 'svg') {
          // Not currently working. SVG is a work in progress.
          this.$fullscreenButton.find('svg').removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
          this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullScreen);
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
          // Not currently working. SVG is a work in progress.
          this.$fullscreenButton.find('svg').removeClass('icon-fullscreen-expand').addClass('icon-fullscreen-collapse');
          this.$fullscreenButton.find('span.able-clipped').text(this.tt.exitFullScreen);
        }
        else {
          this.$fullscreenButton.find('img').attr('src',this.fullscreenCollapseButtonImg);
        }
      }
    }

    if (typeof this.$bigPlayButton !== 'undefined') {
      // Choose show/hide for big play button and adjust position.
      if (this.isPaused() && !this.seekBar.tracking) {
        if (!this.hideBigPlayButton) {
          this.$bigPlayButton.show();
        }
        if (this.isFullscreen()) {
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
        newTop = Math.floor($('.able-transcript').scrollTop() +
                                $(this.currentHighlight).position().top -
                                ($('.able-transcript').height() / 2) +
                                ($(this.currentHighlight).height() / 2));
        if (newTop !== Math.floor($('.able-transcript').scrollTop())) {
          // Set a flag to ignore the coming scroll event.
          // there's no other way I know of to differentiate programmatic and user-initiated scroll events.
          this.scrollingTranscript = true;
          $('.able-transcript').scrollTop(newTop);
        }
      }
    }

    // Update buffering progress.
    // TODO: Currently only using the first HTML5 buffered interval, but this fails sometimes when buffering is split into two or more intervals.
    if (this.player === 'html5') {
      if (this.media.buffered.length > 0) {
        buffered = this.media.buffered.end(0)
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
            this.seekBar.setBuffered(buffered / duration);
          }
        }
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      if (this.seekBar) {
        this.seekBar.setBuffered(this.jwPlayer.getBuffer() / 100);
      }
    }
    else if (this.player === 'youtube') {
      if (this.seekBar) {
        this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
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
    if (this.isPaused()) {
      this.playMedia();
    }
    else {
      this.pauseMedia();
    }
    this.refreshControls();
  };

  AblePlayer.prototype.handleRestart = function() {

    this.seekTo(0);

  /*
    // Prior to 2.3.68, this function was handleStop()
    // which was a bit more challenging to implement
    // Preserved here in case Stop is ever cool again...

    var thisObj = this;
    if (this.player == 'html5') {
      this.pauseMedia();
      this.seekTo(0);
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      this.jwPlayer.stop();
    }
    else if (this.player === 'youtube') {
      // YouTube API function stopVideo() does not reset video to 0
      // Also, the stopped video is not seekable so seekTo(0) after stopping doesn't work
      // Workaround is to use pauseVideo(), followed by seekTo(0) to emulate stopping
      // However, the tradeoff is that YouTube doesn't restore the poster image when video is paused
      // Added 12/29/15: After seekTo(0) is finished, stopVideo() to reset video and restore poster image
      // This final step is handled in event.js > onMediaUpdate()
      this.youTubePlayer.pauseVideo();
      this.seekTo(0);
      this.stoppingYouTube = true;
    }
  */
    this.refreshControls();
  };

  AblePlayer.prototype.handleRewind = function() {

    var elapsed, targetTime;

    elapsed = this.getElapsed();
    targetTime = elapsed - this.seekInterval;
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

    var elapsed, duration, targetTime, lastChapterIndex;

    elapsed = this.getElapsed();
    duration = this.getDuration();
    lastChapterIndex = this.chapters.length-1;
    targetTime = elapsed + this.seekInterval;

    if (this.useChapterTimes) {
      if (this.chapters[lastChapterIndex] == this.currentChapter) {
        // this is the last chapter
        if (targetTime > duration || targetTime > this.currentChapter.end) {
          // targetTime would exceed the end of the video (or chapter)
          // scrub to end of whichever is earliest
          targetTime = Math.min(duration, this.currentChapter.end);
        }
        else if (duration % targetTime < this.seekInterval) {
          // nothing left but pocket change after seeking to targetTime
          // go ahead and seek to end of video (or chapter), whichever is earliest
          targetTime = Math.min(duration, this.currentChapter.end);
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
      if (targetTime > duration) {
        targetTime = duration;
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
    if (this.player === 'html5') {
      this.setPlaybackRate(this.getPlaybackRate() + (0.25 * dir));
    }
    else if (this.player === 'youtube') {
      var rates = this.youTubePlayer.getAvailablePlaybackRates();
      var currentRate = this.getPlaybackRate();
      var index = rates.indexOf(currentRate);
      if (index === -1) {
        console.log('ERROR: Youtube returning unknown playback rate ' + currentRate.toString());
      }
      else {
        index += dir;
        // Can only increase or decrease rate if there's another rate available.
        if (index < rates.length && index >= 0) {
          this.setPlaybackRate(rates[index]);
        }
      }
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
    else if (this.ytCaptions.length) {
      captions = this.ytCaptions;
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
      this.refreshControls();
    }
    else {

      // there is more than one caption track.
      // clicking on a track is handled via caption.js > getCaptionClickFunction()
      if (this.captionsPopup.is(':visible')) {
        this.captionsPopup.hide();
        this.hidingPopup = false;
        this.$ccButton.focus();
      }
      else {
        this.closePopups();
        this.captionsPopup.show();
        this.captionsPopup.css('top', this.$ccButton.position().top - this.captionsPopup.outerHeight());
        this.captionsPopup.css('left', this.$ccButton.position().left)
        // Focus on the checked button, if any buttons are checked
        // Otherwise, focus on the first button
        this.captionsPopup.find('li').removeClass('able-focus');
        if (this.captionsPopup.find('input:checked')) {
          this.captionsPopup.find('input:checked').focus().parent().addClass('able-focus');
        }
        else {
          this.captionsPopup.find('input').first().focus().parent().addClass('able-focus');
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
      this.$chaptersButton.focus();
    }
    else {
      this.closePopups();
      this.chaptersPopup.show();
      this.chaptersPopup.css('top', this.$chaptersButton.position().top - this.chaptersPopup.outerHeight());
      this.chaptersPopup.css('left', this.$chaptersButton.position().left)
      // Focus on the checked button, if any buttons are checked
      // Otherwise, focus on the first button
      this.chaptersPopup.find('li').removeClass('able-focus');
      if (this.chaptersPopup.find('input:checked')) {
        this.chaptersPopup.find('input:checked').focus().parent().addClass('able-focus');
      }
      else {
        this.chaptersPopup.find('input').first().focus().parent().addClass('able-focus');
      }
    }
  };

  AblePlayer.prototype.handleDescriptionToggle = function() {
    this.descOn = !this.descOn;
    this.prefDesc = + this.descOn; // convert boolean to integer
    this.updateCookie('prefDesc');
    this.refreshingDesc = true;
    this.initDescription();
    this.refreshControls();
  };

  AblePlayer.prototype.handlePrefsClick = function(pref) {

    // NOTE: the prefs menu is positioned near the right edge of the player
    // This assumes the Prefs button is also positioned in that vicinity
    // (last or second-last button the right)

    var prefsButtonPosition, prefsMenuRight, prefsMenuLeft;

    if (this.hidingPopup) {
      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it
      this.hidingPopup = false;
      return false;
    }
    if (this.prefsPopup.is(':visible')) {
      this.prefsPopup.hide();
      this.hidingPopup = false;
      this.$prefsButton.focus();
    }
    else {
      this.closePopups();
      this.prefsPopup.show();
      prefsButtonPosition = this.$prefsButton.position();
      prefsMenuRight = this.$ableDiv.width() - 5;
      prefsMenuLeft = prefsMenuRight - this.prefsPopup.width();
      this.prefsPopup.css('top', prefsButtonPosition.top - this.prefsPopup.outerHeight());
      this.prefsPopup.css('left', prefsMenuLeft);
      // remove prior focus and set focus on first item
      this.prefsPopup.find('li').removeClass('able-focus');
      this.prefsPopup.find('input').first().focus().parent().addClass('able-focus');
    }
  };

  AblePlayer.prototype.handleHelpClick = function() {
    this.setFullscreen(false);
    this.helpDialog.show();
  };

  AblePlayer.prototype.handleTranscriptToggle = function () {
    if (this.$transcriptDiv.is(':visible')) {
      this.$transcriptArea.hide();
      this.$transcriptButton.addClass('buttonOff').attr('aria-label',this.tt.showTranscript);
      this.$transcriptButton.find('span.able-clipped').text(this.tt.showTranscript);
      this.prefTranscript = 0;
    }
    else {
      this.positionDraggableWindow('transcript');
      this.$transcriptArea.show();
      this.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.tt.hideTranscript);
      this.$transcriptButton.find('span.able-clipped').text(this.tt.hideTranscript);
      this.prefTranscript = 1;
    }
    this.updateCookie('prefTranscript');
  };

  AblePlayer.prototype.handleSignToggle = function () {
    if (this.$signWindow.is(':visible')) {
      this.$signWindow.hide();
      this.$signButton.addClass('buttonOff').attr('aria-label',this.tt.showSign);
      this.$signButton.find('span.able-clipped').text(this.tt.showSign);
      this.prefSign = 0;
    }
    else {
      this.positionDraggableWindow('sign');
      this.$signWindow.show();
      this.$signButton.removeClass('buttonOff').attr('aria-label',this.tt.hideSign);
      this.$signButton.find('span.able-clipped').text(this.tt.hideSign);
      this.prefSign = 1;
    }
    this.updateCookie('prefSign');
  };

  AblePlayer.prototype.isFullscreen = function () {
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
    if (this.isFullscreen() == fullscreen) {
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
      }
      // add event handlers for changes in full screen mode
      // currently most changes are made in response to windowResize event
      // However, that alone is not resulting in a properly restored player size in Opera Mac
      // More on the Opera Mac bug: https://github.com/ableplayer/ableplayer/issues/162
      // this fullscreen event handler added specifically for Opera Mac,
      // but includes event listeners for all browsers in case its functionality could be expanded
      // Added functionality in 2.3.45 for handling YouTube return from fullscreen as well
      $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function() {
        if (!thisObj.isFullscreen()) {
          // user has just exited full screen
          thisObj.restoringAfterFullScreen = true;
          thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
        }
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
      var wasPaused = this.isPaused();

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

      // TODO: JW Player freezes after being moved on iPads (instead of being reset as in most browsers)
      // Need to call setup again after moving?

      // Resume playback if moving stopped it.
      if (!wasPaused && this.isPaused()) {
        this.playMedia();
      }
    }
    this.refreshControls();
  };

  AblePlayer.prototype.handleFullscreenToggle = function () {
    var stillPaused = this.isPaused(); //add boolean variable reading return from isPaused function
    this.setFullscreen(!this.isFullscreen());
    if (stillPaused) {
      this.pauseMedia(); // when toggling fullscreen and media is just paused, keep media paused.
    }
    else if (!stillPaused) {
      this.playMedia(); // when toggling fullscreen and media is playing, continue playing.
    }
  };

  AblePlayer.prototype.handleTranscriptLockToggle = function (val) {

    this.autoScrollTranscript = val; // val is boolean
    this.prefAutoScrollTranscript = +val; // convert boolean to numeric 1 or 0 for cookie
    this.updateCookie('prefAutoScrollTranscript');
    this.refreshControls();
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
    // 'screenreader
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
    $alertBox.show();
    $alertBox.text(msg);
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

    var jwHeight, captionSizeOkMin, captionSizeOkMax, captionSize, newCaptionSize, newLineHeight;

    if (this.isFullscreen()) {
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

    // resize YouTube or JW Player
    if (this.player === 'youtube' && this.youTubePlayer) {
      this.youTubePlayer.setSize(width, height);
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      if (this.mediaType === 'audio') {
        // keep height set to 0 to prevent JW PLayer from showing its own player
        this.jwPlayer.resize(width,0);
      }
      else {
        this.jwPlayer.resize(width, jwHeight);
      }
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

    this.refreshControls();
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

    // exclude the Able Player dialogs
    $elements = $('body *').not('.able-modal-dialog,.able-modal-dialog *,.able-modal-overlay,.able-modal-overlay *');

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

    var transcriptZ, signZ, newHighZ, newLowZ;

    if (typeof this.$transcriptArea === 'undefined' || typeof this.$signWindow === 'undefined' ) {
      // at least one of the windows doesn't exist, so there's no conflict
      return false;
    }

    // get current values
    transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
    signZ = parseInt(this.$signWindow.css('z-index'));

    if (transcriptZ === signZ) {
      // the two windows are equal; move the target window the top
      newHighZ = transcriptZ + 1000;
      newLowZ = transcriptZ;
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
      this.setupPopups('chapters');
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
        this.showCaptions(time || this.getElapsed());
      }
      else if (this.$captionsWrapper) {
        this.$captionsWrapper.hide();
        this.prefCaptions = 0;
      }
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
      else {
        thisObj.syncTrackLanguages('captions',thisObj.captionLang);
        if (!this.swappingSrc) {
          thisObj.updateCaption();
          thisObj.showDescription(thisObj.getElapsed());
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
      thisObj.$ccButton.focus();

      // save preference to cookie
      thisObj.prefCaptions = 1;
      thisObj.updateCookie('prefCaptions');

      thisObj.refreshControls();
    }
  };

  // Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      if (thisObj.player == 'youtube') {
        thisObj.youTubePlayer.unloadModule(thisObj.ytCaptionModule);
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
      thisObj.$ccButton.focus();

      // save preference to cookie
      thisObj.prefCaptions = 0;
      thisObj.updateCookie('prefCaptions');
      if (!this.swappingSrc) {
        thisObj.refreshControls();
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
        options[0] = this.tt.serif;
        options[1] = this.tt.sans;
        options[3] = this.tt.cursive;
        options[4] = this.tt.fantasy;
        options[2] = this.tt.monospace;
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
          'font-size': this.prefCaptionsSize,
          'color': this.prefCaptionsColor,
          'background-color': this.prefCaptionsBGColor,
          'opacity': opacity
        });
        if ($element === this.$captionsDiv) {
          if (typeof this.$captionsWrapper !== 'undefined') {
            lineHeight = parseInt(this.prefCaptionsSize,10) + 25;
            this.$captionsWrapper.css('line-height',lineHeight + '%');
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

    var videoDuration, lastChapterIndex, chapterEnd;

    if (typeof this.currentChapter === 'undefined') {
      return 0;
    }
    videoDuration = this.getDuration();
    lastChapterIndex = this.selectedChapters.cues.length-1;

    if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
      // this is the last chapter
      if (this.currentChapter.end !== videoDuration) {
        // chapter ends before or after video ends, adjust chapter end to match video end
        chapterEnd = videoDuration;
        this.currentChapter.end = videoDuration;
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
    var videoDuration = this.getDuration();
    var videoElapsed = this.getElapsed();
    if (videoElapsed > this.currentChapter.start) {
      return videoElapsed - this.currentChapter.start;
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

})(jQuery);

(function ($) {
  AblePlayer.prototype.updateMeta = function (time) {
    if (this.hasMeta) {
      if (this.metaType === 'text') {
        this.$metaDiv.show();
        this.showMeta(time || this.getElapsed());
      }
      else {
        this.showMeta(time || this.getElapsed());
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
        this.currentMeta = thisMeta;
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

  AblePlayer.prototype.injectTranscriptArea = function() {

    var thisObj = this;

    this.$transcriptArea = $('<div>', {
      'class': 'able-transcript-area',
      'tabindex': '-1'
    });

    this.$transcriptToolbar = $('<div>', {
      'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
    });

    this.$transcriptDiv = $('<div>', {
      'class' : 'able-transcript'
    });

    // Transcript toolbar content:
    this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
    this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);

    // Add field for selecting a transcript language
    // This will be deleted in initialize.js > recreatePlayer() if there are no languages
    this.$transcriptLanguageSelect = $('<select id="transcript-language-select">');
    // Add a default "Unknown" option; this will be deleted later if there are any
    // elements with a language.
    this.$unknownTranscriptOption = $('<option val="unknown">' + this.tt.unknown + '</option>');
    this.$transcriptLanguageSelect.append(this.$unknownTranscriptOption);
    this.$transcriptLanguageSelect.prop('disabled', true);

    var languageSelectWrapper = $('<div class="transcript-language-select-wrapper">');
    this.$transcriptLanguageSelectContainer = languageSelectWrapper;

    languageSelectWrapper.append($('<label for="transcript-language-select">' + this.tt.language + ': </label>'), this.$transcriptLanguageSelect);
    this.$transcriptToolbar.append(languageSelectWrapper);

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

    this.$transcriptDiv.bind('mousewheel DOMMouseScroll click scroll', function (event) {
      // Propagation is stopped in transcript click handler, so clicks are on the scrollbar
      // or outside of a clickable span.
      if (!thisObj.scrollingTranscript) {
        thisObj.autoScrollTranscript = false;
        thisObj.refreshControls();
      }
      thisObj.scrollingTranscript = false;
    });

    if (typeof this.$transcriptLanguageSelect !== 'undefined') {

      this.$transcriptLanguageSelect.on('click mousedown',function (event) {
        // execute default behavior
        // prevent propagation of mouse event to toolbar or window
        event.stopPropagation();
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
          for (var ii = 0; ii < this.chapters.length; ii++) {
            if (this.chapters[ii].language === this.transcriptLang) {
              chapters = this.chapters[ii].cues;
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
          for (var ii = 0; ii < this.descriptions.length; ii++) {
            if (this.descriptions[ii].language === this.transcriptLang) {
              descriptions = this.descriptions[ii].cues;
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
      $('.able-transcript span.able-transcript-seekpoint').attr('tabindex','0');
    }

    // handle clicks on text within transcript
    // Note: This event listeners handles clicks only, not keydown events
    // Pressing Enter on an element that is not natively clickable does NOT trigger click()
    // Keydown events are handled elsehwere, both globally (ableplayer-base.js) and locally (event.js)
    if (this.$transcriptArea.length > 0) {
      this.$transcriptArea.find('span.able-transcript-seekpoint').click(function(event) {
        var spanStart = parseFloat($(this).attr('data-start'));
        // Add a tiny amount so that we're inside the span.
        spanStart += .01;
        thisObj.seekTo(spanStart);
      });
    }
  };

  AblePlayer.prototype.highlightTranscript = function (currentTime) {

    //show highlight in transcript marking current caption

    if (!this.transcriptType) {
      return;
    }

    var start, end;
    var thisObj = this;

    currentTime = parseFloat(currentTime);

    // Highlight the current transcript item.
    this.$transcriptArea.find('span.able-transcript-caption').each(function() {
      start = parseFloat($(this).attr('data-start'));
      end = parseFloat($(this).attr('data-end'));
      if (currentTime >= start && currentTime <= end) {
        // move all previous highlights before adding one to current span
        thisObj.$transcriptArea.find('.able-highlight').removeClass('able-highlight');
        $(this).addClass('able-highlight');
        return false;
      }
    });
    thisObj.currentHighlight = $('.able-highlight');
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
          for (var ii = 0; ii < comp.children.length; ii++) {
            result = result.concat(flattenComponentForChapter(comp.children[ii]));
          }
        }
        return result;
      }

      var $chapSpan = $('<span>',{
        'class': 'able-transcript-seekpoint'
      });
      for (var ii = 0; ii < chap.components.children.length; ii++) {
        var results = flattenComponentForChapter(chap.components.children[ii]);
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
          for (var ii = 0; ii < comp.children.length; ii++) {
            result = result.concat(flattenComponentForDescription(comp.children[ii]));
          }
        }
        return result;
      }

      var $descSpan = $('<span>',{
        'class': 'able-transcript-seekpoint'
      });
      for (var ii = 0; ii < desc.components.children.length; ii++) {
        var results = flattenComponentForDescription(desc.components.children[ii]);
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

        var flattenString = function (str) {
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

          if ((hasParens && hasBrackets && openBracket < openParen) || hasBrackets) {
            result = result.concat(flattenString(str.substring(0, openBracket)));
            var $silentSpan = $('<span>',{
              'class': 'able-unspoken'
            });
            $silentSpan.text(str.substring(openBracket, closeBracket + 1));
            result.push($silentSpan);
            result = result.concat(flattenString(str.substring(openParen, closeParen + 1)));
          }
          else if (hasParens) {
            result = result.concat(flattenString(str.substring(0, openParen)));
            var $silentSpan = $('<span>',{
              'class': 'able-unspoken'
            });
            $silentSpan.text(str.substring(openBracket, closeBracket + 1));
            result.push($silentSpan);
            result = result.concat(flattenString(str.substring(closeParen + 1)));
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
          for (var ii = 0; ii < comp.children.length; ii++) {
            var subResults = flattenComponentForCaption(comp.children[ii]);
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
          for (var ii = 0; ii < comp.children.length; ii++) {
            var subResults = flattenComponentForCaption(comp.children[ii]);
            for (var jj = 0; jj < subResults.length; jj++) {
              $tag.append(subResults[jj]);
            }
          }
          if (comp.type === 'b' || comp.type == 'i') {
            result.push($tag,' ');
          }
        }
        else {
          for (var ii = 0; ii < comp.children.length; ii++) {
            result = result.concat(flattenComponentForCaption(comp.children[ii]));
          }
        }
        return result;
      };

      for (var ii = 0; ii < cap.components.children.length; ii++) {
        var results = flattenComponentForCaption(cap.components.children[ii]);
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
        var resultsArray = this.searchFor(this.searchString);
        if (resultsArray.length > 0) {
          var resultsSummary = $('<p>',{
            'class': 'able-search-results-summary'
          });
          var resultsSummaryText = 'Found <strong>' + resultsArray.length + '</strong> matching items. ';
          resultsSummaryText += 'Click the time associated with any item ';
          resultsSummaryText += 'to play the video from that point.';
          resultsSummary.html(resultsSummaryText);
          var resultsList = $('<ul>');
          for (var i = 0; i < resultsArray.length; i++) {
            var resultsItem = $('<li>',{
            });
            var itemStartTime = this.secondsToTime(resultsArray[i]['start']);
            var itemStartSpan = $('<span>',{
              'class': 'able-search-results-time',
              'data-start': resultsArray[i]['start'],
              'title': itemStartTime['title'],
              'tabindex': '0'
            });
            itemStartSpan.text(itemStartTime['value']);
            // add a listener for clisk on itemStart
            itemStartSpan.click(function(event) {
              var spanStart = parseFloat($(this).attr('data-start'));
              // Add a tiny amount so that we're inside the span.
              spanStart += .01;
              thisObj.seeking = true;
              thisObj.seekTo(spanStart);
            });

            var itemText = $('<span>',{
              'class': 'able-search-result-text'
            })
            itemText.html('...' + resultsArray[i]['caption'] + '...');
            resultsItem.append(itemStartSpan, itemText);
            resultsList.append(resultsItem);
          }
          $('#' + this.searchDiv).append(resultsSummary, resultsList);
        }
        else {
          var noResults = $('<p>').text('No results found.');
          $('#' + this.searchDiv).append(noResults);
        }
      }
    }
  };

  AblePlayer.prototype.searchFor = function(searchString) {

    // return chronological array of caption cues that match searchTerms

    var captionLang, captions, results, caption, c, i, j;

    // split searchTerms into an array
    var searchTerms = searchString.split(' ');
    if (this.captions.length > 0) {
      captionLang = this.captions[0].language; // in case it's needed later
      captions = this.captions[0].cues;
      if (captions.length > 0) {
        var results = [];
        c = 0;
        for (i = 0; i < captions.length; i++) {
          if ($.inArray(captions[i].components.children[0]['type'], ['string','i','b','u','v','c']) !== -1) {
            caption = this.flattenCueForCaption(captions[i]);
            for (j = 0; j < searchTerms.length; j++) {
              if (caption.indexOf(searchTerms[j]) !== -1) {
                results[c] = [];
                results[c]['start'] = captions[i].start;
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
      title + hours + ' hours ';
    }
    if (minutes < 10) {
      value += '0' + minutes + ':';
      if (minutes > 0) {
        title += minutes + ' minutes ';
      }
    }
    else {
      value += minutes + ':';
      title += minutes + ' minutes ';
    }
    if (seconds < 10) {
      value += '0' + seconds;
      if (seconds > 0) {
        title += seconds + ' seconds ';
      }
    }
    else {
      value += seconds;
      title += seconds + ' seconds ';
    }
    var time = [];
    time['value'] = value;
    time['title'] = title;
    return time;
  };
})(jQuery);

(function ($) {
  // Media events
  AblePlayer.prototype.onMediaUpdateTime = function () {

    var currentTime = this.getElapsed();
    if (this.swappingSrc && (typeof this.swapTime !== 'undefined')) {
      if (this.swapTime === currentTime) {
        // described version been swapped and media has scrubbed to time of previous version
        if (this.playing) {
          // resume playback
          this.playMedia();
          // reset vars
          this.swappingSrc = false;
          this.swapTime = null;
        }
      }
    }
    else if (this.startedPlaying) {
      // do all the usual time-sync stuff during playback
      if (this.prefHighlight === 1) {
        this.highlightTranscript(currentTime);
      }
      this.updateCaption();
      this.showDescription(currentTime);
      this.updateChapter(currentTime);
      this.updateMeta();
      this.refreshControls();
    }
  };

  AblePlayer.prototype.onMediaPause = function () {
    // do something
  };

  AblePlayer.prototype.onMediaComplete = function () {
    // if there's a playlist, advance to next item and start playing
    if (this.hasPlaylist) {
      if (this.playlistIndex === (this.$playlist.length - 1)) {
        // this is the last track in the playlist
        if (this.loop) {
          this.playlistIndex = 0;
          this.swapSource(0);
        }
      }
      else {
        // this is not the last track. Play the next one.
        this.playlistIndex++;
        this.swapSource(this.playlistIndex)
      }
    }
    this.refreshControls();
  };

  AblePlayer.prototype.onMediaNewSourceLoad = function () {

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
          if (this.player === 'jw') {
            var player = this.jwPlayer;
            // Seems to be a bug in JW player, where this doesn't work when fired immediately.
            // Thus have to use a setTimeout
            setTimeout(function () {
              player.play(true);
            }, 500);
          }
          else {
            this.playMedia();
          }
        }
        this.swappingSrc = false; // swapping is finished
        this.refreshControls();
      }
    }
  };

  // End Media events

  AblePlayer.prototype.onWindowResize = function () {

    if (this.isFullscreen()) {

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
    this.seekBar.bodyDiv.on('startTracking', function (event) {
      thisObj.pausedBeforeTracking = thisObj.isPaused();
      thisObj.pauseMedia();
    }).on('tracking', function (event, position) {
      // Scrub transcript, captions, and metadata.
      thisObj.highlightTranscript(position);
      thisObj.updateCaption(position);
      thisObj.showDescription(position);
      thisObj.updateChapter(thisObj.convertChapterTimeToVideoTime(position));
      thisObj.updateMeta(position);
      thisObj.refreshControls();
    }).on('stopTracking', function (event, position) {
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
    var whichButton = $(el).attr('class').split(' ')[0].substr(20);
    if (whichButton === 'play') {
      this.handlePlay();
    }
    else if (whichButton === 'restart') {
      this.handleRestart();
    }
    else if (whichButton === 'rewind') {
      this.handleRewind();
    }
    else if (whichButton === 'forward') {
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
      this.handleSignToggle();
    }
    else if (whichButton === 'preferences') {
      this.handlePrefsClick();
    }
    else if (whichButton === 'help') {
      this.handleHelpClick();
    }
    else if (whichButton === 'transcript') {
      this.handleTranscriptToggle();
    }
    else if (whichButton === 'fullscreen') {
      this.handleFullscreenToggle();
    }
  };

  AblePlayer.prototype.okToHandleKeyPress = function () {

    // returns true unless user's focus is on a UI element
    // that is likely to need supported keystrokes, including space
    var activeElement = $(document.activeElement).prop('tagName');
    if (activeElement === 'INPUT') {
      return false;
    }
    else {
      return true;
    }
  }

  AblePlayer.prototype.onPlayerKeyPress = function (e) {
    // handle keystrokes (using DHTML Style Guide recommended key combinations)
    // http://dev.aol.com/dhtml_style_guide/#mediaplayer
    // Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
    // NOTE #1: Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
    // The rest are reasonable best choices
    // NOTE #2: If there are multiple players on a single page, keystroke handlers
    // are only bound to the FIRST player
    if (!this.okToHandleKeyPress()) {
      return false;
    }
    // Convert to lower case.
    var which = e.which;

    if (which >= 65 && which <= 90) {
      which += 32;
    }
    if (which === 27) {
      this.closePopups();
    }
    else if (which === 32) { // spacebar = play/pause
      if (!($('.able-controller button').is(':focus'))) {
        // only toggle play if a button does not have focus
        // if a button has focus, space should activate that button
        this.handlePlay();
      }
    }
    else if (which === 112) { // p = play/pause
      if (this.usingModifierKeys(e)) {
        this.handlePlay();
      }
    }
    else if (which === 115) { // s = stop (now restart)
      if (this.usingModifierKeys(e)) {
        this.handleRestart();
      }
    }
    else if (which === 109) { // m = mute
      if (this.usingModifierKeys(e)) {
        this.handleMute();
      }
    }
    else if (which === 118) { // v = volume
      if (this.usingModifierKeys(e)) {
        this.handleVolume();
      }
    }
    else if (which >= 49 && which <= 57) { // set volume 1-9
      if (this.usingModifierKeys(e)) {
        this.handleVolume(which);
      }
    }
    else if (which === 99) { // c = caption toggle
      if (this.usingModifierKeys(e)) {
        this.handleCaptionToggle();
      }
    }
    else if (which === 100) { // d = description
      if (this.usingModifierKeys(e)) {
        this.handleDescriptionToggle();
      }
    }
    else if (which === 102) { // f = forward
      if (this.usingModifierKeys(e)) {
        this.handleFastForward();
      }
    }
    else if (which === 114) { // r = rewind
      if (this.usingModifierKeys(e)) {
        this.handleRewind();
      }
    }
    else if (which === 101) { // e = preferences
      if (this.usingModifierKeys(e)) {
        this.handlePrefsClick();
      }
    }
    else if (which === 13) { // Enter
      var thisElement = $(document.activeElement);
      if (thisElement.prop('tagName') === 'SPAN') {
        // register a click on this SPAN
        // if it's a transcript span the transcript span click handler will take over
        thisElement.click();
      }
      else if (thisElement.prop('tagName') === 'LI') {
        thisElement.click();
      }
    }
  };

  AblePlayer.prototype.addHtml5MediaListeners = function () {

    var thisObj = this;

    // NOTE: iOS does not support autoplay,
    // and no events are triggered until media begins to play
    this.$media
      .on('emptied',function() {
        // do something
      })
      .on('loadedmetadata',function() {
        thisObj.onMediaNewSourceLoad();
      })
      .on('canplay',function() {
        // previously handled seeking to startTime here
        // but it's probably safer to wait for canplaythrough
        // so we know player can seek ahead to anything
      })
      .on('canplaythrough',function() {
        if (!thisObj.startedPlaying) {
          if (thisObj.startTime) {
            if (thisObj.seeking) {
              // a seek has already been initiated
              // since canplaythrough has been triggered, the seek is complete
              thisObj.seeking = false;
              if (thisObj.autoplay) {
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
            // there is now startTime, therefore no seeking required
            if (thisObj.autoplay) {
              thisObj.playMedia();
            }
          }
        }
        else {
          // already started playing
        }
      })
      .on('playing',function() {
        thisObj.playing = true;
        thisObj.refreshControls();
      })
      .on('ended',function() {
        thisObj.onMediaComplete();
      })
      .on('progress', function() {
        thisObj.refreshControls();
      })
      .on('waiting',function() {
        thisObj.refreshControls();
      })
      .on('durationchange',function() {
        // Display new duration.
        thisObj.refreshControls();
      })
      .on('timeupdate',function() {
        thisObj.onMediaUpdateTime();
      })
      .on('play',function() {
        if (thisObj.debug) {
          console.log('media play event');
        }
      })
      .on('pause',function() {
        thisObj.onMediaPause();
      })
      .on('ratechange',function() {
        // do something
      })
      .on('volumechange',function() {
        thisObj.volume = thisObj.getVolume();
        if (thisObj.debug) {
          console.log('media volume change to ' + thisObj.volume + ' (' + thisObj.volumeButton + ')');
        }
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

  AblePlayer.prototype.addJwMediaListeners = function () {
    var thisObj = this;
    // add listeners for JW Player events
    this.jwPlayer
      .onTime(function() {
        thisObj.onMediaUpdateTime();
      })
      .onComplete(function() {
        thisObj.onMediaComplete();
      })
      .onReady(function() {
        if (thisObj.debug) {
          console.log('JW Player onReady event fired');
        }
        // remove JW Player from tab order.
        // We don't want users tabbing into the Flash object and getting trapped
        $('#' + thisObj.jwId).removeAttr('tabindex');

        // JW Player was initialized with no explicit width or height; get them now
        thisObj.$fallbackWrapper = $('#' + thisObj.mediaId + '_fallback_wrapper');
        thisObj.fallbackDefaultWidth = thisObj.$fallbackWrapper.width();
        thisObj.fallbackDefaultHeight = thisObj.$fallbackWrapper.height();
        thisObj.fallbackRatio = thisObj.fallbackDefaultWidth / thisObj.fallbackDefaultHeight;

        if (thisObj.startTime > 0 && !thisObj.startedPlaying) {
          thisObj.seekTo(thisObj.startTime);
          thisObj.startedPlaying = true;
        }
        thisObj.refreshControls();
      })
      .onSeek(function(event) {
        // this is called when user scrubs ahead or back,
        // after the target offset is reached
        if (thisObj.debug) {
          console.log('Seeking to ' + event.position + '; target: ' + event.offset);
        }

        if (thisObj.jwSeekPause) {
          // media was temporarily paused
          thisObj.jwSeekPause = false;
          thisObj.playMedia();
        }

        setTimeout(function () {
          thisObj.refreshControls();
        }, 300);
      })
      .onPlay(function() {
        if (thisObj.debug) {
          console.log('JW Player onPlay event fired');
        }
        thisObj.refreshControls();
      })
      .onPause(function() {
        thisObj.onMediaPause();
      })
      .onBuffer(function() {
        if (thisObj.debug) {
          console.log('JW Player onBuffer event fired');
        }
        thisObj.refreshControls();
      })
      .onBufferChange(function() {
        thisObj.refreshControls();
      })
      .onIdle(function(e) {
        if (thisObj.debug) {
          console.log('JW Player onIdle event fired');
        }
        thisObj.refreshControls();
      })
      .onMeta(function() {
        if (thisObj.debug) {
          console.log('JW Player onMeta event fired');
        }
      })
      .onPlaylist(function() {
        if (thisObj.debug) {
          console.log('JW Player onPlaylist event fired');
        }

        // Playlist change includes new media source.
        thisObj.onMediaNewSourceLoad();
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
    // but MutationObserver works in most browsers:
    // http://caniuse.com/#feat=mutationobserver
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

    this.addSeekbarListeners();

    // handle clicks on player buttons
    this.$controllerDiv.find('button').on('click',function(){
      thisObj.onClickPlayerButton(this);
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
      this.$transcriptArea.keydown(function (e) {
        if (AblePlayer.nextIndex > 1) {
          thisObj.onPlayerKeyPress(e);
        }
      });
    }

    // handle clicks on playlist items
    if (this.$playlist) {
      this.$playlist.click(function() {
        thisObj.playlistIndex = $(this).index();
        thisObj.swapSource(thisObj.playlistIndex);
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
    else if (this.player === 'jw') {
      this.addJwMediaListeners();
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
    $toolbar.on('mousedown', function(event) {
      event.stopPropagation();
      if (!thisObj.windowMenuClickRegistered) {
        thisObj.windowMenuClickRegistered = true;
        thisObj.startMouseX = event.pageX;
        thisObj.startMouseY = event.pageY;
        thisObj.dragDevice = 'mouse';
        thisObj.startDrag(which, $window);
      }
      return false;
    });
    $toolbar.on('mouseup', function(event) {
      event.stopPropagation();
      if (thisObj.dragging && thisObj.dragDevice === 'mouse') {
        thisObj.endDrag(which);
      }
      return false;
    });

    // add event listeners for resizing
    $resizeHandle.on('mousedown', function(event) {
      event.stopPropagation();
      if (!thisObj.windowMenuClickRegistered) {
        thisObj.windowMenuClickRegistered = true;
        thisObj.startMouseX = event.pageX;
        thisObj.startMouseY = event.pageY;
        thisObj.startResize(which, $window);
        return false;
      }
    });
    $resizeHandle.on('mouseup', function(event) {
      event.stopPropagation();
      if (thisObj.resizing) {
        thisObj.endResize(which);
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


    var thisObj, $windowAlert, $newButton, $buttonIcon, buttonImgSrc, $buttonImg,
      $buttonLabel, tooltipId, $tooltip, $popup,
      label, position, buttonHeight, buttonWidth, tooltipY, tooltipX, tooltipStyle, tooltip,
      $optionList, radioName, options, i, $optionItem, option,
      radioId, $radioButton, $radioLabel;

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
    $windowAlert.appendTo(this.$activeWindow);
    $windowAlert.css({
      top: $window.offset().top
    });

    // add button to draggable window which triggers a popup menu
    // for now, re-use preferences icon for this purpose
    $newButton = $('<button>',{
      'type': 'button',
      'tabindex': '0',
      'aria-label': this.tt.windowButtonLabel,
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
    });
    $newButton.on('mouseenter focus',function(event) {
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
      var tooltip = $('#' + tooltipId).text(label).css(tooltipStyle);
      thisObj.showTooltip(tooltip);
      $(this).on('mouseleave blur',function() {
        $('#' + tooltipId).text('').hide();
      });
    });

    // add a popup menu
    $popup = this.createPopup(windowName);
    $optionList = $('<ul></ul>');
    radioName = this.mediaId + '-' + windowName + '-choice';

    options = [];
    options.push({
      'name': 'move',
      'label': this.tt.windowMove
    });
    options.push({
      'name': 'resize',
      'label': this.tt.windowResize
    });
    for (i = 0; i < options.length; i++) {
      $optionItem = $('<li></li>');
      option = options[i];
      radioId = radioName + '-' + i;
      $radioButton = $('<input>',{
        'type': 'radio',
        'val': option.name,
        'name': radioName,
        'id': radioId
      });
      $radioLabel = $('<label>',{
        'for': radioId
      });
      $radioLabel.text(option.label);
      $radioButton.on('focus',function(e) {
        $(this).parents('ul').children('li').removeClass('able-focus');
        $(this).parent('li').addClass('able-focus');
      });
      $radioButton.on('click',function(e) {
        e.stopPropagation();
        if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
          thisObj.windowMenuClickRegistered = true;
          thisObj.handleMenuChoice( which, $(this).val(), e.type);
        }
      });
      // due to an apparent bug (in jquery?) clicking the label
      // does not result in a click event on the associated radio button
      // Observed this in Firefox 45.0.2 and Chrome 50
      // It works fine on a simple test page so this could be an Able Player bug
      // Added the following as a workaround rather than mess with isolating the bug
      $radioLabel.on('click mousedown', function() {
        var clickedId = $(this).attr('for');
        $('#' + clickedId).click();
      })
      $optionItem.append($radioButton,$radioLabel);
      $optionList.append($optionItem);
    }
    $popup.append($optionList);
    $newButton.on('click mousedown keydown',function(e) {
      e.stopPropagation();
      if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
        // don't set windowMenuClickRegistered yet; that happens in handler function
        thisObj.handleWindowButtonClick(which, e);
      }
      thisObj.finishingDrag = false;
    });

    $popup.on('keydown', function(event) {
      // Escape key
      if (event.which === 27) {
        // Close Window Options Menu
        $newButton.focus();
        $popup.hide();
      }
    });

    // define vars and assemble all the parts
    if (which === 'transcript') {
      this.$transcriptAlert = $windowAlert;
      this.$transcriptPopupButton = $newButton;
      this.$transcriptPopup = $popup;
      this.$transcriptToolbar.append($windowAlert,$newButton,$tooltip,$popup);
    }
    else if (which === 'sign') {
      this.$signAlert = $windowAlert;
      this.$signPopupButton = $newButton;
      this.$signPopup = $popup;
      this.$signToolbar.append($windowAlert,$newButton,$tooltip,$popup);
    }

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
        $window.css({
          'width': newWidth + 'px',
          'height': newHeight + 'px'
        });
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

    if (e.type === 'keydown') {
      // user pressed a key
      if (e.which === 32 || e.which === 13 || e.which === 27) {
        // this was Enter, space, or escape
        this.windowMenuClickRegistered = true;
      }
      else {
        return false;
      }
    }
    else {
      // this was a mouse event
      this.windowMenuClickRegistered = true;
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

    if ($windowPopup.is(':visible')) {
      $windowPopup.hide(200,'',function() {
        thisObj.windowMenuClickRegistered = false; // reset
      });
      $windowPopup.find('li').removeClass('able-focus');
      $windowButton.focus();
    }
    else {
      // first, be sure window is on top
      this.updateZIndex(which);
      popupTop = $windowButton.position().top + $windowButton.outerHeight();
      $windowPopup.css('top', popupTop);
      $windowPopup.show(200,'',function() {
        $(this).find('input').first().focus().parent().addClass('able-focus');
        thisObj.windowMenuClickRegistered = false; // reset
      });
    }
  };

  AblePlayer.prototype.handleMenuChoice = function (which, choice, eventType) {

    var thisObj, $window, $windowPopup, $windowButton, resizeDialog, $thisRadio;

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

    // hide the popup menu, and reset the Boolean
    $windowPopup.hide('fast', function() {
       thisObj.windowMenuClickRegistered = false; // reset
    });
    $windowButton.focus();

    if (choice === 'move') {
      if (!this.showedAlert(which)) {
        this.showAlert(this.tt.windowMoveAlert,which);
        if (which === 'transcript') {
          this.showedTranscriptAlert = true;
        }
        else if (which === 'sign') {
          this.showedSignAlert = true;
        }
      }
      if (eventType === 'keydown') {
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
      resizeDialog.show();
    }
  };

  AblePlayer.prototype.startDrag = function(which, $element) {

    var thisObj, $windowPopup, zIndex, startPos, newX, newY;
    thisObj = this;

    this.$activeWindow = $element;
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
    if (this.dragDevice === 'mouse') {
      $(document).on('mousemove',function(e) {
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

    var $window, $windowPopup, $windowButton;

    if (which === 'transcript') {
      $windowPopup = this.$transcriptPopup;
      $windowButton = this.$transcriptPopupButton;
    }
    else if (which === 'sign') {
      $windowPopup = this.$signPopup;
      $windowButton = this.$signPopupButton;
    }

    $(document).off('mousemove mouseup');
    this.$activeWindow.off('keydown').removeClass('able-drag');

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
      this.finishingDrag = false;
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
    $(document).on('mousemove',function(e) {
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

    $(document).off('mousemove mouseup');
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
    // Sign language is only currently supported in HTML5 player, not fallback or YouTube
    if (this.player === 'html5') {
      // check to see if there's a sign language video accompanying this video
      // check only the first source
      // If sign language is provided, it must be provided for all sources
      this.signFile = this.$sources.first().attr('data-sign-src');
      if (this.signFile) {
        if (this.debug) {
          console.log('This video has an accompanying sign language video: ' + this.signFile);
        }
        this.hasSignLanguage = true;
        this.injectSignPlayerCode();
      }
      else {
        this.hasSignLanguage = false;
      }
    }
  };

  AblePlayer.prototype.injectSignPlayerCode = function() {

    // create and inject surrounding HTML structure
    // If IOS:
    //  If video:
    //   IOS does not support any of the player's functionality
    //   - everything plays in its own player
    //   Therefore, AblePlayer is not loaded & all functionality is disabled
    //   (this all determined. If this is IOS && video, this function is never called)
    //  If audio:
    //   HTML cannot be injected as a *parent* of the <audio> element
    //   It is therefore injected *after* the <audio> element
    //   This is only a problem in IOS 6 and earlier,
    //   & is a known bug, fixed in IOS 7

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
      'tabindex': '-1'
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
  // @author Phil Teare
  // using wikipedia data
  // In some instances "name" has been trunctation for readability
  // http://stackoverflow.com/questions/3217492/list-of-language-codes-in-yaml-or-json/4900304#4900304

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
    }
  }

  AblePlayer.prototype.getLanguageName = function (key) {
		key = key.slice(0,2);
		var lang = isoLangs[key];
		return lang ? lang.name : undefined;
	};
  AblePlayer.prototype.getLanguageNativeName = function (key) {
		key = key.slice(0,2);
		var lang = isoLangs[key];
		return lang ? lang.nativeName : undefined;
	}

})(jQuery);
(function ($) {
  AblePlayer.prototype.getSupportedLangs = function() {
    // returns an array of languages for which AblePlayer has translation tables
    // Removing 'nl' as of 2.3.54, pending updates
    var langs = ['ca','de','en','es','fr','it','ja'];
    return langs;
  };

  AblePlayer.prototype.getTranslationText = function() {
    // determine language, then get labels and prompts from corresponding translation var
    var deferred, thisObj, lang, thisObj, msg, translationFile;

    deferred = $.Deferred();

    thisObj = this;

    // override this.lang to language of the web page, if known and supported
    // otherwise this.lang will continue using default
    if (!this.forceLang) {
      if ($('body').attr('lang')) {
        lang = $('body').attr('lang');
      }
      else if ($('html').attr('lang')) {
        lang = $('html').attr('lang');
      }
      if (lang !== this.lang) {
        msg = 'Language of web page (' + lang +') ';
        if ($.inArray(lang,this.getSupportedLangs()) !== -1) {
          // this is a supported lang
          msg += ' has a translation table available.';
          this.lang = lang;
        }
        else {
          msg += ' is not currently supported. Using default language (' + this.lang + ')';
        }
        if (this.debug) {
          console.log(msg);
        }
      }
    }
    translationFile = this.rootPath + 'translations/' + this.lang + '.js';
    this.importTranslationFile(translationFile).then(function(result) {
      thisObj.tt = eval(thisObj.lang);
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