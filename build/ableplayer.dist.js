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

      if ($(media).data('fallback-path') !== undefined && $(media).data('fallback-path') !== false) {
        this.fallbackPath = $(media).data('fallback-path');
      }
      else {
        this.fallbackPath = this.rootPath + 'thirdparty/';
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
    // Player language is determined as follows:
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

(function ($) {
  // Set default variable values.
  AblePlayer.prototype.setDefaults = function () {

    this.playing = false; // will change to true after 'playing' event is triggered
    this.clickedPlay = false; // will change to true temporarily if user clicks 'play' (or pause)

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
        //svg[1] = 'M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z';
        svg[1] = 'M 1.37,3.33 C 6.99,3.35 12.61,3.37 18.22,3.40M 2.54,4.25 C 2.54,4.25 17.35,4.25 17.35,4.25 17.88,4.24 18.56,4.29 18.54,3.90 18.53,3.51 17.85,2.82 17.35,2.82 17.35,2.82 2.54,2.82 2.54,2.82 2.01,2.83 1.60,3.16 1.62,3.55 1.63,3.94 2.03,4.24 2.54,4.25 Z M 1.19,18.83 C 1.19,18.83 2.56,18.83 2.56,18.83 2.61,18.69 1.26,15.41 1.25,10.98 1.25,6.69 2.60,2.77 2.56,2.70 2.56,2.70 1.19,2.70 1.19,2.70 1.14,2.84 -0.08,6.58 -0.08,11.01 -0.07,15.30 1.14,18.69 1.19,18.83 Z M 17.32,18.48 C 17.32,18.48 18.46,18.48 18.46,18.48 18.50,18.34 19.95,14.71 19.95,10.41 19.95,6.24 18.49,2.88 18.46,2.82 18.46,2.82 17.32,2.82 17.32,2.82 17.28,2.95 18.62,6.49 18.62,10.79 18.62,14.95 17.28,18.34 17.32,18.48 17.32,18.48 17.32,18.48 17.32,18.48 Z M 2.56,18.83 C 2.56,18.83 17.37,18.83 17.37,18.83 17.90,18.82 18.58,18.87 18.56,18.48 18.55,18.09 17.87,17.40 17.37,17.40 17.37,17.40 2.56,17.40 2.56,17.40 2.03,17.41 1.62,17.74 1.64,18.13 1.65,18.52 2.05,18.82 2.56,18.83 2.56,18.83 2.56,18.83 2.56,18.83 Z M 4.05,16.73 C 4.05,16.73 15.64,16.73 15.64,16.73 16.05,16.72 16.37,16.24 16.36,15.68 16.34,15.14 16.03,14.70 15.64,14.69 15.64,14.69 4.05,14.69 4.05,14.69 3.63,14.71 3.32,15.18 3.33,15.74 3.34,16.29 3.65,16.72 4.05,16.73 Z M 6.33,13.87 C 6.33,13.87 3.65,13.87 3.65,13.87 3.42,13.86 3.24,13.38 3.24,12.82 3.25,12.28 3.43,11.84 3.65,11.83 3.65,11.83 6.33,11.83 6.33,11.83 6.57,11.85 6.75,12.32 6.74,12.88 6.74,13.43 6.56,13.86 6.33,13.87 Z M 15.85,13.87 C 15.85,13.87 8.48,13.87 8.48,13.87 8.22,13.86 8.01,13.38 8.02,12.82 8.03,12.28 8.23,11.84 8.48,11.83 8.48,11.83 15.85,11.83 15.85,11.83 16.11,11.85 16.32,12.32 16.31,12.88 16.30,13.43 16.10,13.86 15.85,13.87 Z';
        
        break;

      case 'descriptions':
        svg[0] = '0 0 20 20';
        svg[1] = 'M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z';
        //svg[1] = 'm 229.76944,476.75656 c -5.3695,-0.52568 -10.73899,-1.40577 -11.93221,-1.95577 -1.19322,-0.55 -6.28439,-1.79527 -11.31369,-2.76725 -5.02932,-0.972 -11.13101,-2.48645 -13.55932,-3.36545 -2.42833,-0.879 -7.46323,-2.5736 -11.18869,-3.76577 -3.72546,-1.19218 -9.33902,-3.38501 -12.47457,-4.87297 -9.83484,-4.66706 -22.98851,-11.5786 -24.68407,-12.97015 -0.89491,-0.73446 -3.09152,-2.08717 -4.88135,-3.00602 -5.35246,-2.7478 -21.96598,-15.42019 -31.20066,-23.79909 C 96.988962,409.77814 80.160643,389.986 73.707356,379.29271 72.08714,376.60796 68.914945,371.45149 66.658033,367.8339 62.077531,360.49182 53.339638,342.02391 51.29359,335.3605 c -0.732772,-2.38644 -1.72565,-4.83956 -2.206393,-5.45138 -0.480743,-0.6118 -2.167569,-6.46943 -3.748501,-13.01694 -1.580932,-6.54751 -3.290407,-12.88083 -3.798833,-14.07405 -3.918701,-9.19677 -5.140894,-63.63409 -1.838729,-81.89831 2.046321,-11.31816 8.032323,-34.59846 9.315421,-36.22882 0.517216,-0.6572 1.800283,-3.87965 2.851259,-7.16101 3.877554,-12.10649 18.011977,-38.52442 26.648976,-49.80825 7.843359,-10.24697 20.144364,-24.47829 25.54998,-29.55936 3.38493,-3.181711 6.69346,-6.290153 7.35228,-6.907649 7.22911,-6.775711 27.73646,-21.486107 36.34205,-26.068992 2.74526,-1.461983 5.72359,-3.119258 6.6185,-3.682835 3.92943,-2.474572 17.32154,-8.54011 22.77967,-10.317341 3.28135,-1.068448 6.45423,-2.324644 7.05084,-2.791548 0.59661,-0.466904 5.2339,-1.898757 10.30509,-3.181898 5.07118,-1.283141 11.24116,-3.00911 13.71107,-3.835487 9.20315,-3.079187 34.51949,-5.153358 55.17028,-4.520108 18.67593,0.572691 38.77441,2.870089 43.38984,4.959765 1.19322,0.54024 6.56271,2.07262 11.9322,3.405288 5.36949,1.332668 10.25085,2.78232 10.84746,3.221448 0.59661,0.439129 3.76949,1.800503 7.05084,3.025279 7.30393,2.726209 22.63102,10.052009 29.44247,14.072445 6.17534,3.644972 23.14678,15.067752 25.04175,16.854571 0.7607,0.717292 3.81232,3.256709 6.78138,5.643149 10.61058,8.528496 24.73083,23.725003 34.77325,37.423733 3.28028,4.47457 6.33573,8.62373 6.78989,9.22034 0.98513,1.29411 9.43385,16.01614 14.00663,24.40678 1.78829,3.28135 3.86598,7.91864 4.61707,10.30508 0.7511,2.38644 2.00659,5.36388 2.78998,6.61655 2.01896,3.22833 7.91986,23.05585 10.29852,34.60379 4.83193,23.45823 6.04919,48.2466 3.46239,70.50848 -1.71205,14.73378 -4.30533,29.65601 -5.65541,32.54237 -0.55814,1.19322 -2.228,6.31864 -3.7108,11.38983 -2.58461,8.83932 -8.77386,24.79232 -10.94199,28.20339 -0.56883,0.89491 -2.39217,4.31186 -4.05188,7.59322 -11.37483,22.48892 -28.90594,44.5636 -50.00773,62.96835 -6.46487,5.6386 -13.97871,11.7164 -16.69741,13.50623 -2.7187,1.78983 -6.9479,4.58139 -9.39822,6.20347 -2.45033,1.62208 -7.38395,4.48983 -10.96361,6.37279 -3.57967,1.88296 -6.67119,3.85073 -6.87006,4.3728 -0.19887,0.52208 -0.79834,0.94924 -1.33214,0.94924 -0.5338,0 -4.52024,1.64421 -8.85876,3.65377 -4.33851,2.00958 -11.30515,4.7593 -15.48142,6.1105 -4.17627,1.35119 -8.08135,2.80135 -8.67796,3.22258 -0.59661,0.42123 -4.74577,1.57573 -9.22034,2.56558 -4.47458,0.98983 -10.33221,2.33997 -13.01695,3.00029 -15.44059,3.79772 -47.61164,5.16746 -69.9661,2.97893 z m 11.9322,-34.50484 c 24.63743,-5.37443 35.61101,-10.61643 48.07949,-22.96722 7.32483,-7.25571 13.01302,-15.4832 19.39938,-28.05959 1.66627,-3.28135 3.36665,-6.22102 3.7786,-6.53259 0.41194,-0.31157 1.91118,-2.99631 3.33162,-5.9661 4.35307,-9.1011 15.07171,-26.37684 19.24142,-31.01228 5.93916,-6.60254 9.52983,-10.54538 20.14068,-22.11615 31.78317,-34.65843 40.7849,-48.112 48.14069,-71.94891 4.3058,-13.95321 5.43561,-22.53356 5.45218,-41.40702 0.015,-16.98127 -1.65491,-29.88694 -5.75443,-44.47458 -2.37778,-8.46103 -3.71528,-11.87437 -9.56368,-24.40678 -2.58235,-5.53364 -7.47944,-13.86083 -9.66969,-16.4427 -0.93221,-1.09889 -2.45938,-3.21832 -3.3937,-4.70984 -3.09632,-4.94284 -15.27251,-17.49852 -22.50115,-23.20242 -26.96923,-21.280595 -57.50282,-31.538418 -93.90175,-31.546489 -32.16133,-0.0072 -54.23547,7.540281 -86.23729,29.485563 -1.49152,1.022816 -6.12881,4.775416 -10.30508,8.339106 -6.87034,5.86258 -10.91068,9.87222 -18.96102,18.81693 -3.82052,4.24497 -14.12373,19.00294 -14.12373,20.23036 0,0.56549 -0.65943,1.79879 -1.46539,2.74069 -0.80597,0.94189 -2.61434,4.64134 -4.0186,8.22101 -1.40426,3.57966 -2.92238,7.02365 -3.3736,7.65332 -1.56798,2.18807 -4.14501,20.25777 -3.48116,24.40928 0.36733,2.29714 1.59546,5.01609 2.72917,6.04208 4.18982,3.79173 22.10785,5.92925 30.39887,3.62641 4.92296,-1.36736 7.94289,-6.0843 9.05028,-14.13595 4.36624,-31.74633 40.10112,-64.8799 80.26213,-74.41947 11.8022,-2.80342 44.29753,-1.61308 48.81356,1.7881 0.59661,0.44933 3.76949,1.67729 7.05084,2.7288 29.64998,9.50138 57.76993,40.32606 65.18775,71.45787 1.15528,4.84861 2.581,10.31472 3.16825,12.14691 1.362,4.24935 1.38944,24.47713 0.0402,29.62764 -0.56515,2.15735 -2.02996,8.17757 -3.25513,13.37826 -3.38045,14.34967 -11.43226,27.84033 -25.16345,42.16094 -24.20452,25.24351 -33.29217,36.22027 -39.88811,48.17987 -14.39301,26.09708 -30.27625,49.81122 -40.22509,60.0572 -9.43353,9.71529 -22.44209,16.19937 -30.02949,14.96811 -4.31518,-0.70026 -11.88863,-4.23288 -15.67709,-7.31254 -3.95821,-3.21764 -11.8504,-3.96823 -16.97949,-1.61483 -8.48546,3.8934 -12.43155,13.22395 -9.95633,23.5418 1.72503,7.19079 11.07406,17.00109 18.40512,19.31323 2.68474,0.84673 5.36949,1.89295 5.9661,2.32493 2.73583,1.9809 21.85753,2.65797 29.28813,1.03705 z m 76.27209,-186.34884 c 2.23182,-3.86516 6.27168,-12.09697 9.47359,-19.30386 4.07615,-9.1746 5.55516,-32.94354 2.76434,-44.42496 -5.02771,-20.6839 -21.95063,-37.94922 -42.9507,-43.81974 -6.87088,-1.92072 -25.2889,-2.67623 -32.43629,-1.33051 -18.71316,3.52331 -40.04872,19.47993 -48.5699,36.32488 -1.76979,3.49859 -3.3047,8.36041 -3.41089,10.80405 -0.18491,4.2547 -0.0322,4.47674 3.60352,5.24002 2.08814,0.43838 5.99322,1.2909 8.67797,1.89448 9.81815,2.2073 11.22813,1.78971 15.45577,-4.57759 4.43954,-6.68641 15.46346,-16.67586 22.51033,-20.39797 4.18616,-2.2111 6.34897,-2.56865 15.18644,-2.51054 12.64596,0.0831 20.37955,2.60738 26.36356,8.60504 6.67897,6.6942 7.66779,9.46547 8.12991,22.78483 0.44979,12.96377 -1.17678,22.61806 -5.35439,31.78024 -3.20906,7.03797 -6.35942,14.42059 -6.35942,14.90277 0,0.2208 1.58644,0.88353 3.52543,1.47272 1.93898,0.5892 6.6983,2.29518 10.57627,3.79108 3.87796,1.49589 7.81917,2.74525 8.75823,2.77634 0.93907,0.031 2.76437,-1.774 4.05623,-4.01128 z';
        break;

      case 'sign':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z';
        break;

      case 'mute':
        svg[0] = '0 0 20 20';
        svg[1] = 'M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z';
        break;

      case 'volume-mute':
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
        //svg[1] = 'M0 19.107v-17.857q0-0.446 0.313-0.759t0.759-0.313h8.929v6.071q0 0.446 0.313 0.759t0.759 0.313h6.071v11.786q0 0.446-0.313 0.759t-0.759 0.312h-15q-0.446 0-0.759-0.313t-0.313-0.759zM4.286 15.536q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 12.679q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 9.821q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM11.429 5.893v-5.268q0.246 0.156 0.402 0.313l4.554 4.554q0.156 0.156 0.313 0.402h-5.268z';
        svg[1] = 'M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z';
       
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

      case 'accmenu':
        svg[0] = '0 0 15 20';
        svg[1] = 'm 6.4715267,4.8146068 c 0,-0.6982433 0.5444396,-1.2649335 1.2152669,-1.2649335 0.6708273,0 1.2152668,0.5666902 1.2152668,1.2649335 0,0.6982434 -0.5444395,1.2649336 -1.2152668,1.2649336 -0.6708273,0 -1.2152669,-0.5666902 -1.2152669,-1.2649336 z M 9.3071494,7.7661184 13.479566,5.8931735 13.17899,5.109758 8.0918825,6.9228294 H 7.2817046 L 2.1945976,5.109758 1.8940216,5.8931735 6.0664378,7.7661184 v 3.3731566 l -1.6616749,5.59438 0.7575163,0.299367 2.3511363,-5.472103 h 0.3475663 l 2.3511362,5.472103 0.757517,-0.299367 -1.6616754,-5.59438 z';
        //svg[1] = 'M6.5 1.5c0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5z M10 5l5.15-2.221-0.371-0.929-6.279 2.15h-1l-6.279-2.15-0.371 0.929 5.15 2.221v4l-2.051 6.634 0.935 0.355 2.902-6.489h0.429l2.902 6.489 0.935-0.355-2.051-6.634z';
        //svg[1] = 'M8 0c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zM8 14c-3.314 0-6-2.686-6-6s2.686-6 6-6c3.314 0 6 2.686 6 6s-2.686 6-6 6z M6.5 1.5c0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5z M10 5l5.15-2.221-0.371-0.929-6.279 2.15h-1l-6.279-2.15-0.371 0.929 5.15 2.221v4l-2.051 6.634 0.935 0.355 2.902-6.489h0.429l2.902 6.489 0.935-0.355-2.051-6.634z';     
        break;  
    }

    return svg;
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

    this.loadCurrentPreferences();
    
    this.injectPlayerCode();
    this.initSignLanguage();
    this.setupTracks().then(function() {

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

          // setMediaAttributes() sets textTrack.mode to 'disabled' for all tracks
          // This tells browsers to ignore the text tracks so Able Player can handle them
          // However, timing is critical as browsers - especially Safari - tend to ignore this request
          // unless it's sent late in the intialization process.
          // If browsers ignore the request, the result is redundant captions
          thisObj.setMediaAttributes();

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
          thisObj.provideFallback();
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

        // Go ahead and load media, without user requesting it
        // Normally, we wait until user clicks play, rather than unnecessarily consume their bandwidth
        // Exceptions are if the video is intended to autostart or if running on iOS (a workaround for iOS issues)
        // TODO: Confirm that this is still necessary with iOS (this would added early, & I don't remember what the issues were)
        if (thisObj.player === 'html5' && (thisObj.isIOS() || thisObj.startTime > 0 || thisObj.autoplay)) {
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
        // attempting to play a YouTube video using an element other than <video>
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
      if (this.fallback === 'jw') {
        if (this.jwCanPlay()) {
          return 'jw';
        }
        else {
          // JW Player is available as fallback, but can't play this source file
          return null;
        }
      }
      else {
        // browser doesn't support HTML5 video and there is no fallback player
        return null;
      }
    }
    else if (this.media.canPlayType) {
      return 'html5';
    }
    else {
      // Browser does not support the available media file
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

  //Orange set default preferences
  AblePlayer.prototype.setDefaultPref = function() {
    //disable all buttons
    
    $('#visionPlus').attr('aria-checked','false');
    $('#visionPlus').attr('aria-pressed','false');
    $('#visionPlus').removeClass('aria-no-checked');
    $('#sansVisionPlus').attr('aria-checked','false');
    $('#sansVisionPlus').attr('aria-pressed','false');
    $('#sansVisionPlus').removeClass('aria-no-checked');
    $('#auditionPlus').attr('aria-checked','false');
    $('#auditionPlus').attr('aria-pressed','false');
    $('#auditionPlus').removeClass('aria-no-checked');
    $('#lsfPlus').attr('aria-checked','false');
    $('#lsfPlus').attr('aria-pressed','false');
    $('#lsfPlus').removeClass('aria-no-checked');
    $('#defPlus').attr('aria-checked','false');
    $('#defPlus').attr('aria-pressed','false');
    $('#defPlus').removeClass('aria-no-checked');
    $('#conPlus').attr('aria-checked','false');
    $('#conPlus').attr('aria-pressed','false');
    $('#conPlus').removeClass('aria-no-checked');
    $('#profDef').attr('aria-checked','false');
    $('#profDef').attr('aria-pressed','false');
    $('#profDef').removeClass('aria-no-checked');


    $('.vplus').attr('aria-checked','false');
    $('.vplus').attr('aria-pressed','false');
    $('.vplus').removeClass('aria-no-checked');
    $('.svplus').attr('aria-checked','false');
    $('.svplus').attr('aria-pressed','false');
    $('.svplus').removeClass('aria-no-checked');
    $('.lsfplus').attr('aria-checked','false');
    $('.lsfplus').attr('aria-pressed','false');
    $('.lsfplus').removeClass('aria-no-checked');
    $('.conplus').attr('aria-checked','false');
    $('.conplus').attr('aria-pressed','false');
    $('.conplus').removeClass('aria-no-checked');
    $('.audplus').attr('aria-checked','false');
    $('.audplus').attr('aria-pressed','false');
    $('.audplus').removeClass('aria-no-checked');
    $('.profdef').attr('aria-checked','false');
    $('.profdef').attr('aria-pressed','false');
    $('.profdef').removeClass('aria-no-checked');
    

    //this.prefCaptionsFont = 'Helvetica Neue';
    this.prefCaptionsFont = 'Arial';
    this.prefCaptionsColor = 'white';
    this.prefCaptionsBGColor = 'black';
    this.prefCaptionsSize = '100%';
    //this.prefTRFont = 'Helvetica Neue';
    this.prefTRFont = 'Arial';
    this.prefTRColor = 'black';
    this.prefFollowColor = '#FF6';
    this.prefShadowType = '';
    this.prefTRBGColor = 'white';
    this.prefTRSize = '100%';
    this.prefTranscript = 0;
    this.prefSign = 0;
    this.prefModeUsage = "profDef";
    this.prefVidSize = 33;
    this.prefTrSize = 66;
    this.prefTranscriptOrientation = 'vertical';
    this.prefColorButton = "colorDef";
    //$('#' + this.mediaId + '_' + 'prefCaptionsFont').val('Helvetica Neue');
    $('#' + this.mediaId + '_' + 'prefCaptionsFont').val('Arial');
    $('#' + this.mediaId + '_' + 'prefCaptionsColor').val('white');
    $('#' + this.mediaId + '_' + 'prefCaptionsBGColor').val('black');
    $('#' + this.mediaId + '_' + 'prefCaptionsSize').val('100%');
    //$('#' + this.mediaId + '_' + 'prefTRFont').val('Helvetica Neue');
    $('#' + this.mediaId + '_' + 'prefTRFont').val('Arial');
    $('#' + this.mediaId + '_' + 'prefTRColor').val('black');
    $('#' + this.mediaId + '_' + 'prefFollowColor').val('#FF6');
    $('#' + this.mediaId + '_' + 'prefShadowType').val('');
    $('#' + this.mediaId + '_' + 'prefColorButton').val('colorDef');
    $('#' + this.mediaId + '_' + 'prefTRBGColor').val('white');
    $('#' + this.mediaId + '_' + 'prefTRSize').val('100%');
    $('#' + this.mediaId + '_' + 'prefTranscript').val('0');
    $('#' + this.mediaId + '_' + 'prefSign').val('0');//prefDesc
    $('#' + this.mediaId + '_' + 'prefDesc').val('0');
    $('#' + this.mediaId + '_' + 'prefVidSize').val('33');
    $('#' + this.mediaId + '_' + 'prefTrSize').val('66');
    $('#' + this.mediaId + '_' + 'prefTranscriptOrientation').val('vertical');
    this.updateCookie('prefCaptionsFont');
    this.updateCookie('prefVidSize');
    this.updateCookie('prefTrSize');
    this.updateCookie('prefTranscriptOrientation');
    this.updateCookie('prefCaptionsColor');
    this.updateCookie('prefCaptionsBGColor');
    this.updateCookie('prefCaptionsSize');
    this.updateCookie('prefTRFont');
    this.updateCookie('prefTRColor');
    this.updateCookie('prefFollowColor');
    this.updateCookie('prefShadowType');
    this.updateCookie('prefColorButton');
    this.updateCookie('prefTRBGColor');
    this.updateCookie('prefTRSize');
    this.updateCookie('prefTranscript');
    this.updateCookie('prefSign');
    this.updateCookie('prefModeUsage');
    this.updateCookie('prefDesc');
    $('.able-captions').css('font-family', this.prefCaptionsFont);
    $('.able-captions').css('color', this.prefCaptionsColor);
    $('.able-captions').css('background-color', this.prefCaptionsBGColor);
    $('.able-captions-wrapper').css('background-color', this.prefCaptionsBGColor);
    $('.able-captions').css('font-size', this.prefCaptionsSize);
    $('.able-descriptions').css('font-family', this.prefCaptionsFont);
    $('.able-descriptions').css('color', this.prefCaptionsColor);
    $('.able-descriptions').css('background-color', this.prefCaptionsBGColor);
    $('.able-descriptions').css('font-size', this.prefCaptionsSize);
    $('.able-transcript-seekpoint').css('color', this.prefTRColor);
    $('.able-transcript-seekpoint').css('background-color', this.prefTRBGColor);
    $('.able-transcript-seekpoint').css('font-size', this.prefTRSize);
    $('.able-transcript-seekpoint').css('font-family', this.prefTRFont);
    $('.able-highlight').css('background', this.prefFollowColor);
    $('.button').removeClass('whiteblue');
    $('.button').removeClass('bluewhite');
    $('.button').removeClass('yellowblue');
    $('.button').removeClass('blueyellow');
    $('.button').removeClass('whiteblack');
    $('.button').removeClass('blackwhite');
    $('i').removeClass('whiteblue');
    $('i').removeClass('bluewhite');
    $('i').removeClass('yellowblue');
    $('i').removeClass('blueyellow');
    $('i').removeClass('whiteblack');
    $('i').removeClass('blackwhite');
    $('.button').addClass('colorDef');
    $('i').addClass('colorDef');
    this.$transcriptArea.hide();
    if(this.$transcriptButton != undefined){
      this.$transcriptButton.addClass('buttonOff').attr('aria-label',this.tt.showTranscript);
      this.$transcriptButton.find('span.able-clipped').text(this.tt.showTranscript);
    }
    this.prefTranscript = 0;
    this.$signWindow.hide();
    if(this.$transcriptButton != undefined){
      this.$signButton.addClass('buttonOff').attr('aria-label',this.tt.showSign);
      this.$signButton.find('span.able-clipped').text(this.tt.showSign);
    }
    this.prefSign = 0;
    this.prefDesc = 0; 
    this.updateCookie('prefDesc');
    this.updateCookie('prefSign');
    this.refreshingDesc = true;
    this.initDescription();
    this.refreshControls();

    //default sub is FR
    //$('#subtitlesFR').click();

    clearInterval(this.$timerOrange);
    $('#defPlus').removeClass('firstTime');

    //default options
    $('#audiodesc').attr('aria-checked','false');
    $('#audiodesc').removeClass('aria-no-checked');
    $('#audiodesc').children('span').text(this.tt.audiodescact);
    $('#audiodesc').children('svg').children('line').css('display','block');
    $('#lsf').attr('aria-checked','false');
    $('#lsf').removeClass('aria-no-checked');
    $('#lsf').children('span').text(this.tt.lsfact);
    $('#lsf').children('svg').children('line').css('display','block');
    $('#transcr').attr('aria-checked','false');
    $('#transcr').removeClass('aria-no-checked');
    $('#transcr').children('span').text(this.tt.transcract);
    $('#transcr').children('svg').children('line').css('display','block');

    //reglages buttons default
    $('.controller-orange-textcolor button').each(function(){
      if(!$(this)[0].id.includes('whiteTextColor')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      } else {
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
    });
    $('.controller-orange-bgcolor button').each(function(){
      if(!$(this)[0].id.includes('blackBGColor')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
      else {
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
    });
    $('.controller-orange-followcolor button').each(function(){
      if(!$(this)[0].id.includes('yellowFollowColor')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
      else{
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
    });
    $('.controller-orange-fontsize span').each(function(){
      if(!$(this)[0].textContent.includes('100%')){
        $($(this)[0].parentElement).removeClass('aria-no-checked');
        $($(this)[0].parentElement).attr('aria-pressed','false');
      }
      else {
        $($(this)[0].parentElement).addClass('aria-no-checked');
        $($(this)[0].parentElement).attr('aria-pressed','true');
      }
    });
    $('.controller-orange-outfont span').each(function(){
      if(!$(this)[0].id.includes('outNo')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
      else{
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
    });
    $('.controller-orange-font span').each(function(){
      if(!$(this)[0].id.includes('helvet')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
      else{
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
    });
    

    //default contraste
    var vids = $(document.getElementsByTagName('video'));
    for (var i=0; i<vids.length; i++) {
      $(vids[i]).css('filter','');
      $(vids[i]).css('filter','');
      $(vids[i]).css('background-color','transparent');
    }
    $('.vidcontr').attr('aria-checked','false');
    $('.vidcontr').attr('aria-label',this.tt.vidcontrno);
    
    $('.vidcontr').text('');
    $('.vidcontr').removeClass('vidcontrno')
    $('.vidcontr').append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");


    //Maybe try to re-put video in the right side
    this.$ableDiv.css('width','100%');
    this.$playerDiv.css('width','100%');
    this.$captionsWrapper.css('width',(this.$playerDiv.width())+'px');
    $('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
    if(this.$mediaContainer.find('video').find('source')[0].src.includes(this.$sources.first().attr('data-sign-src'))){
      if(this.getCookie()['preferences']['prefTranscript'] === 0){
        this.$ableDiv.css('width','100%');
      }  else {
        this.$transcriptArea.css('top','0px');
      }
      var svgVideoSrc = this.$signWindow.find('video').find('source')[0].src; 
      //put video sign in the second container
      this.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
      this.$mediaContainer.find('video')[0].load();
      //put video in the first containre
      this.$signWindow.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
      this.$signWindow.find('video')[0].load();
    } else {

    }
    //Set volume to true if it is muted
    if (this.isMuted() === true) {
      this.handleMute();
      this.setVolume(this.getVolume());
    }

    //Resize Menu
    this.resizeAccessMenu();
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

    //add new preferences Orange
    prefs.push({
      'name': 'prefModeUsage', // 
      'label': 'prefModeUsage',
      'group': 'mode',
      'default': 'profDef'
    });

    //add new preferences Orange for vidSize
    prefs.push({
      'name': 'prefVidSize', // 
      'label': 'prefVidSize',
      'group': '',
      'default': 33
    });

    prefs.push({
      'name': 'prefTrSize', // 
      'label': 'prefTrSize',
      'group': '',
      'default': 66
    });

    //add new preferences Orange for prefTranscriptOrientation
    prefs.push({
      'name': 'prefTranscriptOrientation', // 
      'label': 'prefTranscriptOrientation',
      'group': '',
      'default': 'horizontal'
    });

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
        'default': 0
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
        'default': this.tt.serif
      });
      prefs.push({
        'name': 'prefCaptionsSize',
        'label': this.tt.prefCaptionsSize,
        'group': 'captions',
        'default': '125%'
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
        'name': 'prefTRFont',
        'label': this.tt.prefCaptionsFont,
        'group': 'other',
        'default': this.tt.serif
      });
      prefs.push({
        'name': 'prefTRSize',
        'label': this.tt.prefCaptionsSize,
        'group': 'other',
        'default': '100%'
      });
      prefs.push({
        'name': 'prefTRColor',
        'label': this.tt.prefCaptionsColor,
        'group': 'other',
        'default': 'black'
      });
      prefs.push({
        'name': 'prefTRBGColor',
        'label': this.tt.prefCaptionsBGColor,
        'group': 'other',
        'default': 'white'
      });
      prefs.push({
        'name': 'prefFollowColor',
        'label': this.tt.prefCaptionsBGColor,
        'group': 'other',
        'default': '#FF6'
      });
      prefs.push({
        'name': 'prefShadowType',
        'label': this.tt.prefCaptionsBGColor,
        'group': 'other',
        'default': ''
      });
      prefs.push({
        'name': 'prefCaptionsOpacity',
        'label': this.tt.prefCaptionsOpacity,
        'group': 'captions',
        'default': '100%'
      });
      prefs.push({
        'name': 'prefColorButton',
        'label': this.tt.prefCaptionsOpacity,
        'group': 'other',
        'default': 'colordef'
      });
      prefs.push({
        'name': 'prefAccessMenu',
        'label': this.tt.prefCaptionsOpacity,
        'group': 'other',
        'default': 'false'
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
        'default': 0 // 1 on because sighted users probably want to see this cool feature in action
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
        if ($.inArray(token.tagName, ['i', 'b', 'u', 'ruby','q']) !== -1) {
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
        if (token.tagName === current.type && $.inArray(token.tagName, ['c', 'i', 'b', 'u', 'ruby', 'rt', 'v','q']) !== -1) {
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
          buffer += c;
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
    // $wasShow - contains the accessible media element previously shown
    // $ableDiv - contains the media player and all its objects (e.g., captions, controls, descriptions)
    // $ableWrapper - contains additional widgets (e.g., transcript window, sign window)
    this.$wasShow = '';
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
      if (this.iconType != 'image' && this.player !== 'youtube') {
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
    //this.$mediaContainer.css('height',this.$vidcapContainer.find('video').height());
    this.$mediaContainer.css('height',this.$media.height());
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
    this.$mediaContainer.css('background-color','lightgray');
    this.$mediaContainer.append(this.$bigPlayButton);
  };

  AblePlayer.prototype.injectPlayerControlArea = function () {
    //Add playerOrange skins
    //OrangeLab add new playing button for linearisation
	this.$controllerOrangeDiv = $('<div>',{
    'class' : 'controller-orange-main',
    'aria-live' : 'assertive',
    'aria-atomic': 'true'
});
this.$buttonCopySeekBar = $('<span>',{
'id' : 'copy-seek',
'tabindex' : '0',
'class' : 'buttonSeek'
});

this.$buttonCopyPlay = $('<button>',{
  'type' : 'button',
  'id' : 'copy-play',
  'tabindex' : '0',
  'aria-label': this.tt.play,
  'aria-live': 'polite',
  'class' : 'able-button-handler-play button play menuButton'
});
//this.$buttonCopyPlay.append("<i class=\"play\"></i><span id=\"spanPlay\">"+this.tt.play+"</span>");
this.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 16 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'</path></svg> <span id=\"spanPlay\" class='spanButton'>"+this.tt.play+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

this.$buttonForwardRewind = $('<div>',{
  'id' : 'buttonForwardRewind',
  'class' : 'able-buttons-div',
  'style' : 'display:flex',
});

this.$buttonCopyForward = $('<button>',{
  'type' : 'button',
  'id' : 'copy-forward',
  'tabindex' : '0',
  'aria-label': this.tt.forward,
'class' : 'able-button-handler-forward button forward'
});
//this.$buttonCopyForward.append("<i class=\"forward\"></i><span>"+this.tt.forward+"</span>");
this.$buttonCopyForward.append("<span>"+this.tt.forward+"</span><svg style='margin-left:10%' viewBox='0 0 20 20'><path d='M10 16.875v-6.25l-6.25 6.25v-13.75l6.25 6.25v-6.25l6.875 6.875z'</path></svg>");

this.$buttonCopyRewind = $('<button>',{
    'type' : 'button',
'id' : 'copy-rewind',
'tabindex' : '0',
'aria-label': this.tt.rewind,
'class' : 'able-button-handler-rewind button rewind'
});
//this.$buttonCopyRewind.append("<i class=\"rewind\"></i><span>"+this.tt.rewind+"</span>");
this.$buttonCopyRewind.append("<svg style='margin-right:10%' viewBox='0 0 20 20'><path d='M11.25 3.125v6.25l6.25-6.25v13.75l-6.25-6.25v6.25l-6.875-6.875z'</path></svg><span>"+this.tt.rewind+"</span>");

this.$buttonForwardRewind.append(this.$buttonCopyRewind,this.$buttonCopyForward);

this.$buttonCopyVolume = $('<button>',{
'type' : 'button',
'role' : 'menu',
'id' : 'show-volume',
'tabindex' : '0',
'aria-label': this.tt.volume,
'class' : 'iconvol button volume menuButton'
});
//this.$buttonCopyVolume.append("<p class=\"iconvol\"></p><span>"+this.tt.volume+"</span><i class=\"arrow right\"></i>");
this.$buttonCopyVolume.append("<svg style='float:left;margin-left:25%' viewBox='0 0 21 20'><path d='M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span class='spanButton'>"+this.tt.volume+"</span><i class=\"arrow right\"></i>");


this.$buttonVidcontr2 = $('<button>',{
'type' : 'button',
'id' : 'vidcontr2',
'tabindex' : '0',
'aria-label': this.tt.vidcontr,
'class' : 'able-button-handler-forward button vidcontr menuButton',
'aria-checked': 'false',
});
if(this.$sources.first().attr('data-sign-opt')){
  this.$buttonVidcontr2.attr('aria-checked','false')
  this.$buttonVidcontr2.addClass('vidcontr')
  this.$buttonVidcontr2.removeClass('vidcontrno')
  this.$buttonVidcontr2.text('');
  this.$buttonVidcontr2.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
} else {
  this.$buttonVidcontr2.prop("disabled",true);
}

this.$buttonSpeedsMain = $('<button>',{
  'type' : 'button',
  'id' : 'speedMain',
  'tabindex' : '0',
  'aria-label': this.tt.speed,
  'class' : 'normalIcon button speed menuButton' 
  });
  this.$buttonSpeedsMain.append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+this.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");


this.$buttonCopySettings = $('<button>',{
    'type' : 'button',
'id' : 'show-settings',
'tabindex' : '0',
'aria-label': this.tt.preferences,
'class' : 'iconsettings button settings buttonMore menuButton'
});
//this.$buttonCopySettings.append("<p class=\"iconsettings\"></p><span><span>"+this.tt.preferences+"</span><i class=\"arrow right\"></i>");
//svg[0] = '0 0 15 20';
//var svg = 'M6.5 1.5c0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5z M10 5l5.15-2.221-0.371-0.929-6.279 2.15h-1l-6.279-2.15-0.371 0.929 5.15 2.221v4l-2.051 6.634 0.935 0.355 2.902-6.489h0.429l2.902 6.489 0.935-0.355-2.051-6.634z';
var svg = 'm 6.4715267,4.8146068 c 0,-0.6982433 0.5444396,-1.2649335 1.2152669,-1.2649335 0.6708273,0 1.2152668,0.5666902 1.2152668,1.2649335 0,0.6982434 -0.5444395,1.2649336 -1.2152668,1.2649336 -0.6708273,0 -1.2152669,-0.5666902 -1.2152669,-1.2649336 z M 9.3071494,7.7661184 13.479566,5.8931735 13.17899,5.109758 8.0918825,6.9228294 H 7.2817046 L 2.1945976,5.109758 1.8940216,5.8931735 6.0664378,7.7661184 v 3.3731566 l -1.6616749,5.59438 0.7575163,0.299367 2.3511363,-5.472103 h 0.3475663 l 2.3511362,5.472103 0.757517,-0.299367 -1.6616754,-5.59438 z';
this.$buttonCopySettings.append("<svg style='float:left;margin-left:25%' viewBox='0 0 15 20'><circle cx='8' cy='10' r='8.5' stroke='black' stroke-width='1.5' fill='transparent'/><path d='"+svg+"'</path></svg><span class='spanButton'>"+this.tt.preferencesP+"</span><i class=\"arrow right\"></i>");

this.$buttonCaptions = $('<button>',{
'type' : 'button',
'id' : 'subtitles',
'tabindex' : '0',
'aria-label': 'Sous-titres',
'class' : 'button subtitles menuButton',
'aria-checked': 'false',
});
//this.$buttonCaptions.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
//this.$buttonCaptions.append("<p class=\"captionsSub\"></p><span><span>"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
//this.$buttonCaptions.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z'</path></svg><span class='spanButton'>"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
this.$buttonCaptions.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M 1.37,3.33 C 6.99,3.35 12.61,3.37 18.22,3.40M 2.54,4.25 C 2.54,4.25 17.35,4.25 17.35,4.25 17.88,4.24 18.56,4.29 18.54,3.90 18.53,3.51 17.85,2.82 17.35,2.82 17.35,2.82 2.54,2.82 2.54,2.82 2.01,2.83 1.60,3.16 1.62,3.55 1.63,3.94 2.03,4.24 2.54,4.25 Z M 1.19,18.83 C 1.19,18.83 2.56,18.83 2.56,18.83 2.61,18.69 1.26,15.41 1.25,10.98 1.25,6.69 2.60,2.77 2.56,2.70 2.56,2.70 1.19,2.70 1.19,2.70 1.14,2.84 -0.08,6.58 -0.08,11.01 -0.07,15.30 1.14,18.69 1.19,18.83 Z M 17.32,18.48 C 17.32,18.48 18.46,18.48 18.46,18.48 18.50,18.34 19.95,14.71 19.95,10.41 19.95,6.24 18.49,2.88 18.46,2.82 18.46,2.82 17.32,2.82 17.32,2.82 17.28,2.95 18.62,6.49 18.62,10.79 18.62,14.95 17.28,18.34 17.32,18.48 17.32,18.48 17.32,18.48 17.32,18.48 Z M 2.56,18.83 C 2.56,18.83 17.37,18.83 17.37,18.83 17.90,18.82 18.58,18.87 18.56,18.48 18.55,18.09 17.87,17.40 17.37,17.40 17.37,17.40 2.56,17.40 2.56,17.40 2.03,17.41 1.62,17.74 1.64,18.13 1.65,18.52 2.05,18.82 2.56,18.83 2.56,18.83 2.56,18.83 2.56,18.83 Z M 4.05,16.73 C 4.05,16.73 15.64,16.73 15.64,16.73 16.05,16.72 16.37,16.24 16.36,15.68 16.34,15.14 16.03,14.70 15.64,14.69 15.64,14.69 4.05,14.69 4.05,14.69 3.63,14.71 3.32,15.18 3.33,15.74 3.34,16.29 3.65,16.72 4.05,16.73 Z M 6.33,13.87 C 6.33,13.87 3.65,13.87 3.65,13.87 3.42,13.86 3.24,13.38 3.24,12.82 3.25,12.28 3.43,11.84 3.65,11.83 3.65,11.83 6.33,11.83 6.33,11.83 6.57,11.85 6.75,12.32 6.74,12.88 6.74,13.43 6.56,13.86 6.33,13.87 Z M 15.85,13.87 C 15.85,13.87 8.48,13.87 8.48,13.87 8.22,13.86 8.01,13.38 8.02,12.82 8.03,12.28 8.23,11.84 8.48,11.83 8.48,11.83 15.85,11.83 15.85,11.83 16.11,11.85 16.32,12.32 16.31,12.88 16.30,13.43 16.10,13.86 15.85,13.87 Z'</path></svg><span class='spanButton'>"+this.tt.captions+"</span><i class=\"arrow right\"></i>");



this.$buttonFullscreen = $('<button>',{
  'type' : 'button',
'id' : 'fullscreen',
'tabindex' : '0',
'aria-label': this.tt.enterFullScreen,
'class' : 'able-button-handler-play button fullscreen menuButton'
});
//this.$buttonFullscreen.append("<i class=\"fullScreen\"></i><span id=\"\">"+this.tt.fullScreen+"</span>");
this.$buttonFullscreen.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 18.036v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502zM8.717 8.393q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257z'</path></svg><span id='spanFull' class='spanButton'>"+this.tt.fullScreen+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

this.$buttonAllParams = $('<button>',{
  'type' : 'button',
  'id' : 'allParams',
  'tabindex' : '0',
  'aria-label': this.tt.allParams,
  'aria-checked':'false',
  'class' : 'button allParams menuButton'
  });
this.$buttonAllParams.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M18.238 11.919c-1.049-1.817-0.418-4.147 1.409-5.205l-1.965-3.404c-0.562 0.329-1.214 0.518-1.911 0.518-2.1 0-3.803-1.714-3.803-3.828h-3.931c0.005 0.653-0.158 1.314-0.507 1.919-1.049 1.818-3.382 2.436-5.212 1.382l-1.965 3.404c0.566 0.322 1.056 0.793 1.404 1.396 1.048 1.815 0.42 4.139-1.401 5.2l1.965 3.404c0.56-0.326 1.209-0.513 1.902-0.513 2.094 0 3.792 1.703 3.803 3.808h3.931c-0.002-0.646 0.162-1.3 0.507-1.899 1.048-1.815 3.375-2.433 5.203-1.387l1.965-3.404c-0.562-0.322-1.049-0.791-1.395-1.391zM10 14.049c-2.236 0-4.050-1.813-4.050-4.049s1.813-4.049 4.050-4.049 4.049 1.813 4.049 4.049c-0 2.237-1.813 4.049-4.049 4.049z'</path></svg><span class='spanButton'>"+this.tt.allParams+"</span><i class=\"arrow right\"></i>");
//this.$buttonAllParams.append("<span> "+this.tt.allParams+"</span><i class=\"arrow right\"></i>"); 

//this.$controllerOrangeDiv.append(this.$buttonCopySeekBar,this.$buttonCopyPlay,this.$buttonCopyForward,this.$buttonCopyRewind,this.$buttonCopyVolume,this.$buttonFullscreen,this.$buttonCaptions,this.$buttonVidcontr2,this.$buttonSpeedsMain,this.$buttonCopySettings);
//this.$controllerOrangeDiv.append(this.$buttonCopyPlay,this.$buttonCopyForward,this.$buttonCopyRewind,this.$buttonCopyVolume,this.$buttonFullscreen,this.$buttonCaptions,this.$buttonVidcontr2,this.$buttonSpeedsMain,this.$buttonCopySettings);
this.$controllerOrangeDiv.append(this.$buttonCopyPlay,this.$buttonForwardRewind,this.$buttonCopyVolume,this.$buttonFullscreen,this.$buttonCaptions,this.$buttonVidcontr2,this.$buttonSpeedsMain,this.$buttonAllParams,this.$buttonCopySettings);


this.$controllerOrangeVolumeDiv = $('<div>',{
    'class' : 'controller-orange-volume',
    'aria-live' : 'assertive',
    'aria-atomic': 'true'
});
this.$buttonHideVol = $('<button>',{
    'type' : 'button',
'id' : 'hide-volume',
'tabindex' : '0',
'aria-label': this.tt.back,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideVol.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(this.volume) / 10 * 100)+"%</span>");

this.$buttonSoundUp = $('<button>',{
    'type' : 'button',
'id' : 'sound-up',
'tabindex' : '0',
'aria-label': this.tt.vplus,
'class' : 'able-button-handler-play button volplus menuButton'
});
//this.$buttonSoundUp.append("<i class=\"vplus\"></i><span id=\"\">+ "+this.tt.vplus+"</span>");
this.$buttonSoundUp.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span id=\"\" class='spanButton'>+ "+this.tt.vplus+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

this.$buttonSoundDown = $('<button>',{
    'type' : 'button',
'id' : 'sound-down',
'tabindex' : '0',
'aria-label': this.tt.vmoins,
'class' : 'able-button-handler-forward button vmoins menuButton'
});
//this.$buttonSoundDown.append("<i class=\"vmoins\"></i><span id=\"\">- "+this.tt.vmoins+"</span>");
this.$buttonSoundDown.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span id=\"\" class='spanButton' >- "+this.tt.vmoins+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

this.$buttonSoundMute = $('<button>',{
    'type' : 'button',
'id' : 'sound-mute',
'tabindex' : '0',
'aria-label': this.tt.unmute,
'class' : 'able-button-handler-forward button vmute menuButton'
});
//this.$buttonSoundMute.append("<i class=\"mute\"></i><span> "+this.tt.unmute+"</span>");
this.$buttonSoundMute.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span class='spanButton'> "+this.tt.unmute+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

this.$controllerOrangeVolumeDiv.append(this.$buttonHideVol,this.$buttonSoundUp,this.$buttonSoundDown,this.$buttonSoundMute);
this.$controllerOrangeVolumeDiv.attr('style','display:none');


this.$controllerOrangeSubtitlesDiv = $('<div>',{
  'class' : 'controller-orange-subtitles',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideSubT = $('<button>',{
  'type' : 'button',
'id' : 'hide-subT',
'tabindex' : '0',
'aria-label': this.tt.menu,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideSubT.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.menu+"</span>");

this.$buttonActivateSub = $('<button>',{
'type' : 'button',
'id' : 'subt',
'tabindex' : '0',
'disabled' : 'true',
'aria-pressed':'false',
'aria-label': this.tt.de_act_st_general,
'class' : 'able-button-handler-forward aria-no-checked button subt',
'aria-checked': 'false',
});
this.$buttonActivateSub.append("<span id=\"\">"+this.tt.de_act_st_general+"</span></i>");

this.$buttonSubML = $('<button>',{
  'type' : 'button',
  'id' : 'subtitlesML',
  'tabindex' : '0',
  'aria-label': this.tt.act_st_ml,
  'aria-checked':'false',
  'aria-pressed':'false',
  'class' : 'able-button-handler-forward button'
  });
  //this.$buttonSubML.append("<span> "+this.tt.act_st_ml+"</span><i class=\"captions\"></i>");
  this.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+this.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
  //this.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span id=\"\" class='spanButton'>"+this.tt.act_st_ml+"</span><svg class=\"arrow right\" style='' viewBox='0 0 30 20'><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg>");//<i class=\"arrow right\" style='visibility:hidden'></i>");

this.$buttonSubFR = $('<button>',{
  'type' : 'button',
  'id' : 'subtitlesFR',
  'tabindex' : '0',
  'aria-label': this.tt.act_st_fr,
  'aria-checked':'false',
  'aria-pressed':'false',
  'class' : 'able-button-handler-forward button'
  });
  this.$buttonSubFR.append("<span> "+this.tt.act_st_fr+"</span>");

this.$buttonSubEN = $('<button>',{
    'type' : 'button',
    'id' : 'subtitlesEN',
    'tabindex' : '0',
    'aria-label': this.tt.act_st_en,
    'aria-checked':'false',
    'aria-pressed':'false',
    'class' : 'able-button-handler-forward button'
    });
this.$buttonSubEN.append("<span> "+this.tt.act_st_en+"</span>");

this.$buttonSubES = $('<button>',{
      'type' : 'button',
      'id' : 'subtitlesES',
      'tabindex' : '0',
      'aria-label': this.tt.act_st_es,
      'aria-checked':'false',
      'aria-pressed':'false',
      'class' : 'able-button-handler-forward button'
      });
this.$buttonSubES.append("<span> "+this.tt.act_st_es+"</span>"); 

this.$buttonSubPL = $('<button>',{
  'type' : 'button',
  'id' : 'subtitlesPL',
  'tabindex' : '0',
  'aria-label': this.tt.act_st_pl,
  'aria-checked':'false',
  'aria-pressed':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonSubPL.append("<span> "+this.tt.act_st_pl+"</span>");

//this.$controllerOrangeSubtitlesDiv.append(this.$buttonHideSubT,this.$buttonActivateSub,this.$buttonSubML,this.$buttonSubFR,this.$buttonSubEN,this.$buttonSubES, this.$buttonSubPL);
this.$controllerOrangeSubtitlesDiv.append(this.$buttonHideSubT,this.$buttonSubML,this.$buttonSubFR,this.$buttonSubEN,this.$buttonSubES, this.$buttonSubPL);
this.$controllerOrangeSubtitlesDiv.attr('style','display:none');

this.$controllerOrangePerceptionDiv = $('<div>',{
  'class' : 'controller-orange-perception',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHidePerception = $('<button>',{
  'type' : 'button',
'id' : 'hide-perception',
'tabindex' : '0',
'aria-label': this.tt.allParams,
'class' : 'able-button-handler-play button title'
});
this.$buttonHidePerception.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.allParams+"</span>");

this.$divPerceptionLow = $('<div>',{
  'id' : 'divPerceptionLow',
  'class' : 'able-buttons-div',
  'style' : 'display:flex',
});

this.$divPerceptionLowText = $('<button>',{
  'id' : 'divPerceptionLowText',
  'class' : 'button normalIcon menuButton colorDef',
  'disabled' : 'true',
  'style' : 'cursor:auto',
  'aria-live': 'polite',
  'aria-hidden': 'true',
  'text' : '100%',
});

this.$divPerceptionHigh = $('<div>',{
  'id' : 'divPerceptionHigh',
  'class' : 'able-buttons-div',
  'style' : 'display:flex',
});

this.$divPerceptionHighText = $('<button>',{
  'id' : 'divPerceptionHighText',
  'class' : 'button normalIcon menuButton colorDef',
  'disabled' : 'true',
  'style' : 'cursor:auto',
  'aria-live': 'polite',
  'aria-hidden': 'true',
  'text' : '100%',
});

this.$buttonMoreLow = $('<button>',{
  'type' : 'button',
  'id' : 'buttonMoreLow',
  'tabindex' : '0',
  'aria-label': this.tt.morelow,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonMoreLow.append("<span> "+this.tt.morelow+"</span>"); 

this.$buttonLessLow = $('<button>',{
  'type' : 'button',
  'id' : 'buttonLessLow',
  'tabindex' : '0',
  'aria-label': this.tt.lesslow,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonLessLow.append("<span> "+this.tt.lesslow+"</span>"); 

this.$divPerceptionLow.append(this.$buttonLessLow,this.$divPerceptionLowText,this.$buttonMoreLow);

this.$buttonMoreAcute = $('<button>',{
  'type' : 'button',
  'id' : 'buttonMoreAcute',
  'tabindex' : '0',
  'aria-label': this.tt.moreacute,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonMoreAcute.append("<span> "+this.tt.moreacute+"</span>"); 

this.$buttonLessAcute = $('<button>',{
  'type' : 'button',
  'id' : 'buttonLessAcute',
  'tabindex' : '0',
  'aria-label': this.tt.lessacute,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonLessAcute.append("<span> "+this.tt.lessacute+"</span>"); 

this.$divPerceptionHigh.append(this.$buttonLessAcute,this.$divPerceptionHighText,this.$buttonMoreAcute);

this.$buttonDefaultPerception = $('<button>',{
  'type' : 'button',
  'id' : 'defaultPerception',
  'tabindex' : '0',
  'aria-label': this.tt.defaultPerception,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonDefaultPerception.append("<span> "+this.tt.defaultPerception+"</span>"); 

this.$controllerOrangePerceptionDiv.append(this.$buttonHidePerception,this.$divPerceptionLow,this.$divPerceptionHigh,this.$buttonDefaultPerception);
this.$controllerOrangePerceptionDiv.attr('style','display:none');

this.$controllerOrangeReglagesDiv = $('<div>',{
  'class' : 'controller-orange-reglages',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideReglages = $('<button>',{
  'type' : 'button',
'id' : 'hide-reglages',
'tabindex' : '0',
'aria-label': this.tt.reglages,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideReglages.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.reglages+"</span>");

this.$buttonTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'textColor',
  'tabindex' : '0',
  'aria-label': this.tt.textColor,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonTextColor.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> "+this.tt.textColor+"</span><i class=\"arrow right\"></i>"); 

this.$buttonBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'bgColor',
  'tabindex' : '0',
  'aria-label': this.tt.bgColor,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonBGColor.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> "+this.tt.bgColor+"</span><i class=\"arrow right\"></i>"); 

this.$buttonFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'followColor',
  'tabindex' : '0',
  'aria-label': this.tt.followColor,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonFollowColor.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'>"+this.tt.followColor+"</span><i class=\"arrow right\"></i>");

this.$buttonFontSize = $('<button>',{
  'type' : 'button',
  'id' : 'fontSize',
  'tabindex' : '0',
  'aria-label': this.tt.fontSize,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonFontSize.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> "+this.tt.fontSize+"</span><i class=\"arrow right\"></i>");

this.$buttonOutText = $('<button>',{
  'type' : 'button',
  'id' : 'outText',
  'tabindex' : '0',
  'aria-label': this.tt.outText,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonOutText.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> "+this.tt.outText+"</span><i class=\"arrow right\"></i>");

this.$buttonTextStyle = $('<button>',{
  'type' : 'button',
  'id' : 'textStyle',
  'tabindex' : '0',
  'aria-label': this.tt.textStyle,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonTextStyle.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> "+this.tt.textStyle+"</span><i class=\"arrow right\"></i>");

this.$buttonReglagesSettings = $('<button>',{
  'type' : 'button',
  'id' : 'reglagesSettings',
  'tabindex' : '0',
  'aria-label': this.tt.reglagesSettings,
  'aria-checked':'false',
  'class' : 'button normalIcon menuButton'
  });
this.$buttonReglagesSettings.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> "+this.tt.reglagesSettings+"</span><i class=\"arrow right\"></i>");

this.$controllerOrangeReglagesDiv.append(this.$buttonHideReglages,this.$buttonTextColor,this.$buttonBGColor,this.$buttonFollowColor,this.$buttonFontSize,this.$buttonOutText,this.$buttonTextStyle,this.$buttonReglagesSettings);
this.$controllerOrangeReglagesDiv.attr('style','display:none');

this.$controllerOrangeTextColorDiv = $('<div>',{
  'class' : 'controller-orange-textcolor',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideTextColor = $('<button>',{
  'type' : 'button',
'id' : 'hide-textColor',
'tabindex' : '0',
'aria-label': this.tt.textColor,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideTextColor.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.textColor+"</span>");

this.$buttonWhiteTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'whiteTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.white,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonWhiteTextColor.append("<span> "+this.tt.white+"</span>"); 


this.$buttonBlackTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'blackTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.black,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlackTextColor.append("<span> "+this.tt.black+"</span>"); 

this.$buttonRedTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'redTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.red,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonRedTextColor.append("<span> "+this.tt.red+"</span>");

this.$buttonGreenTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'greenTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.green,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonGreenTextColor.append("<span> "+this.tt.green+"</span>");

this.$buttonBlueTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'blueTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.blue,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlueTextColor.append("<span> "+this.tt.blue+"</span>");

this.$buttonYellowTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'yellowTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.yellow,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonYellowTextColor.append("<span> "+this.tt.yellow+"</span>");

this.$buttonMagentaTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'magentaTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.magenta,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonMagentaTextColor.append("<span> "+this.tt.magenta+"</span>");

this.$buttonCyanTextColor = $('<button>',{
  'type' : 'button',
  'id' : 'cyanTextColor',
  'tabindex' : '0',
  'aria-label': this.tt.cyan,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonCyanTextColor.append("<span> "+this.tt.cyan+"</span>");

this.$controllerOrangeTextColorDiv.append(this.$buttonHideTextColor,this.$buttonWhiteTextColor,this.$buttonBlackTextColor,this.$buttonRedTextColor,this.$buttonGreenTextColor,this.$buttonBlueTextColor,this.$buttonYellowTextColor,this.$buttonMagentaTextColor,this.$buttonCyanTextColor);
this.$controllerOrangeTextColorDiv.attr('style','display:none');

this.$controllerOrangeBGColorDiv = $('<div>',{
  'class' : 'controller-orange-bgcolor',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideBGColor = $('<button>',{
  'type' : 'button',
'id' : 'hide-bgColor',
'tabindex' : '0',
'aria-label': this.tt.bgColor,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideBGColor.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.bgColor+"</span>");

this.$buttonWhiteBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'whiteBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.white,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonWhiteBGColor.append("<span> "+this.tt.white+"</span>"); 

this.$buttonBlackBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'blackBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.black,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlackBGColor.append("<span> "+this.tt.black+"</span>"); 

this.$buttonRedBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'redBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.red,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonRedBGColor.append("<span> "+this.tt.red+"</span>");

this.$buttonGreenBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'greenBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.green,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonGreenBGColor.append("<span> "+this.tt.green+"</span>");

this.$buttonBlueBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'blueBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.blue,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlueBGColor.append("<span> "+this.tt.blue+"</span>");

this.$buttonYellowBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'yellowBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.yellow,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonYellowBGColor.append("<span> "+this.tt.yellow+"</span>");

this.$buttonMagentaBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'magentaBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.magenta,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonMagentaBGColor.append("<span> "+this.tt.magenta+"</span>");

this.$buttonCyanBGColor = $('<button>',{
  'type' : 'button',
  'id' : 'cyanBGColor',
  'tabindex' : '0',
  'aria-label': this.tt.cyan,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonCyanBGColor.append("<span> "+this.tt.cyan+"</span>");

this.$controllerOrangeBGColorDiv.append(this.$buttonHideBGColor,this.$buttonWhiteBGColor,this.$buttonBlackBGColor,this.$buttonRedBGColor,this.$buttonGreenBGColor,this.$buttonBlueBGColor,this.$buttonYellowBGColor,this.$buttonMagentaBGColor,this.$buttonCyanBGColor);
this.$controllerOrangeBGColorDiv.attr('style','display:none');

this.$controllerOrangeFollowColorDiv = $('<div>',{
  'class' : 'controller-orange-followcolor',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideFollowColor = $('<button>',{
  'type' : 'button',
'id' : 'hide-followColor',
'tabindex' : '0',
'aria-label': this.tt.followColor,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideFollowColor.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.followColor+"</span>");

this.$buttonWhiteFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'whiteFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.white,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonWhiteFollowColor.append("<span> "+this.tt.white+"</span>"); 

this.$buttonBlackFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'blackFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.black,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlackFollowColor.append("<span> "+this.tt.black+"</span>"); 

this.$buttonRedFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'redFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.red,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonRedFollowColor.append("<span> "+this.tt.red+"</span>");

this.$buttonGreenFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'greenFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.green,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonGreenFollowColor.append("<span> "+this.tt.green+"</span>");

this.$buttonBlueFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'blueFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.blue,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlueFollowColor.append("<span> "+this.tt.blue+"</span>");

this.$buttonYellowFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'yellowFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.yellow,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonYellowFollowColor.append("<span> "+this.tt.yellow+"</span>");

this.$buttonMagentaFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'magentaFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.magenta,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonMagentaFollowColor.append("<span> "+this.tt.magenta+"</span>");

this.$buttonCyanFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'cyanFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.cyan,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonCyanFollowColor.append("<span> "+this.tt.cyan+"</span>");

this.$controllerOrangeFollowColorDiv.append(this.$buttonHideFollowColor,this.$buttonWhiteFollowColor,this.$buttonBlackFollowColor,this.$buttonRedFollowColor,this.$buttonGreenFollowColor,this.$buttonBlueFollowColor,this.$buttonYellowFollowColor,this.$buttonMagentaFollowColor,this.$buttonCyanFollowColor);
this.$controllerOrangeFollowColorDiv.attr('style','display:none');

this.$controllerOrangeOutTextDiv = $('<div>',{
  'class' : 'controller-orange-outfont',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideout = $('<button>',{
  'type' : 'button',
'id' : 'hide-out',
'tabindex' : '0',
'aria-label': this.tt.outText,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideout.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.outText+"</span>");

this.$buttonOutNo = $('<button>',{
  'type' : 'button',
  'id' : 'outNo',
  'tabindex' : '0',
  'aria-label': this.tt.outNo,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonOutNo.append("<span>"+this.tt.outNo+"</span>"); 

this.$buttonOutHigh = $('<button>',{
  'type' : 'button',
  'id' : 'outHigh',
  'tabindex' : '0',
  'aria-label': this.tt.outHigh,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonOutHigh.append("<span>"+this.tt.outHigh+"</span>"); 

this.$buttonOutEnforce = $('<button>',{
  'type' : 'button',
  'id' : 'outEnforce',
  'tabindex' : '0',
  'aria-label': this.tt.outEnforce,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonOutEnforce.append("<span>"+this.tt.outEnforce+"</span>");

this.$buttonOutUniform = $('<button>',{
  'type' : 'button',
  'id' : 'outUniform',
  'tabindex' : '0',
  'aria-label': this.tt.outUniform,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonOutUniform.append("<span>"+this.tt.outUniform+"</span>");

this.$buttonBlueFollowColor = $('<button>',{
  'type' : 'button',
  'id' : 'blueFollowColor',
  'tabindex' : '0',
  'aria-label': this.tt.blue,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonBlueFollowColor.append("<span>"+this.tt.blue+"</span>");

this.$buttonOutShadow = $('<button>',{
  'type' : 'button',
  'id' : 'outShadow',
  'tabindex' : '0',
  'aria-label': this.tt.outShadow,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonOutShadow.append("<span>"+this.tt.outShadow+"</span>");


this.$controllerOrangeOutTextDiv.append(this.$buttonHideout,this.$buttonOutNo,this.$buttonOutHigh,this.$buttonOutEnforce,this.$buttonOutUniform,this.$buttonOutShadow);
this.$controllerOrangeOutTextDiv.attr('style','display:none');

this.$controllerOrangeFontDiv = $('<div>',{
  'class' : 'controller-orange-font',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideFont = $('<button>',{
  'type' : 'button',
'id' : 'hide-font',
'tabindex' : '0',
'aria-label': this.tt.textStyle + " "+this.tt.back,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideFont.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.textStyle+"</span>");

this.$buttonHelvet = $('<button>',{
  'type' : 'button',
  'id' : 'helvet',
  'tabindex' : '0',
  'aria-label': this.tt.helvet,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonHelvet.append("<span>"+this.tt.helvet+"</span>"); 

this.$buttonConsola = $('<button>',{
  'type' : 'button',
  'id' : 'consola',
  'tabindex' : '0',
  'aria-label': this.tt.consola,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonConsola.append("<span>"+this.tt.consola+"</span>"); 

this.$buttonAccessDFA = $('<button>',{
  'type' : 'button',
  'id' : 'accessDFA',
  'tabindex' : '0',
  'aria-label': this.tt.accessDFA,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonAccessDFA.append("<span>"+this.tt.accessDFA+"</span>");

this.$buttonComic = $('<button>',{
  'type' : 'button',
  'id' : 'comic',
  'tabindex' : '0',
  'aria-label': this.tt.comic,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonComic.append("<span>"+this.tt.comic+"</span>");

this.$buttonArial = $('<button>',{
  'type' : 'button',
  'id' : 'arial',
  'tabindex' : '0',
  'aria-label': this.tt.arial,
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$buttonArial.append("<span>"+this.tt.arial+"</span>");


this.$controllerOrangeFontDiv.append(this.$buttonHideFont,this.$buttonHelvet,this.$buttonConsola,this.$buttonAccessDFA,this.$buttonComic,this.$buttonArial);
this.$controllerOrangeFontDiv.attr('style','display:none');

this.$controllerOrangeButtonColorDiv = $('<div>',{
  'class' : 'controller-orange-butcol',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideButCol = $('<button>',{
  'type' : 'button',
'id' : 'hide-butcol',
'tabindex' : '1',
'aria-label': this.tt.reglagesSettings + " "+this.tt.back,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideButCol.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.reglagesSettings+"</span>");

this.$buttonBlackWhite = $('<button>',{
  'type' : 'button',
  'id' : 'blackwhite',
  'tabindex' : '1',
  'aria-label': this.tt.blackwhite,
  'aria-checked':'false',
  'class' : 'button normalIcon blackwhite settingsColor',
  });
this.$buttonBlackWhite.append("<span>"+this.tt.blackwhite+"</span>"); 

this.$buttonWhiteBlack = $('<button>',{
  'type' : 'button',
  'id' : 'whiteblack',
  'tabindex' : '1',
  'aria-label': this.tt.whiteblack,
  'aria-checked':'false',
  'class' : 'button normalIcon whiteblack settingsColor'
  });
this.$buttonWhiteBlack.append("<span>"+this.tt.whiteblack+"</span>"); 

this.$buttonBlueYellow = $('<button>',{
  'type' : 'button',
  'id' : 'blueyellow',
  'tabindex' : '1',
  'aria-label': this.tt.blueyellow,
  'aria-checked':'false',
  'class' : 'button normalIcon blueyellow settingsColor'
  });
this.$buttonBlueYellow.append("<span>"+this.tt.blueyellow+"</span>");

this.$buttonYellowBlue = $('<button>',{
  'type' : 'button',
  'id' : 'yellowblue',
  'tabindex' : '1',
  'aria-label': this.tt.yellowblue,
  'aria-checked':'false',
  'class' : 'button normalIcon yellowblue settingsColor'
  });
this.$buttonYellowBlue.append("<span>"+this.tt.yellowblue+"</span>");

this.$buttonBlueWhite = $('<button>',{
  'type' : 'button',
  'id' : 'bluewhite',
  'tabindex' : '1',
  'aria-label': this.tt.bluewhite,
  'aria-checked':'false',
  'class' : 'button normalIcon bluewhite settingsColor'
  });
this.$buttonBlueWhite.append("<span>"+this.tt.bluewhite+"</span>");

this.$buttonWhiteBlue = $('<button>',{
  'type' : 'button',
  'id' : 'whiteblue',
  'tabindex' : '1',
  'aria-label': this.tt.whiteblue,
  'aria-checked':'false',
  'class' : 'button normalIcon whiteblue settingsColor'
  });
this.$buttonWhiteBlue.append("<span>"+this.tt.whiteblue+"</span>");

this.$buttonColorDef = $('<button>',{
  'type' : 'button',
  'id' : 'colordef',
  'tabindex' : '1',
  'aria-label': this.tt.colordef,
  'aria-checked':'false',
  'class' : 'button normalIcon colordef settingsColor'
  });
this.$buttonColorDef.append("<span>"+this.tt.colordef+"</span>");

this.$controllerOrangeButtonColorDiv.append(this.$buttonHideButCol,this.$buttonBlackWhite,this.$buttonWhiteBlack,this.$buttonBlueYellow,this.$buttonYellowBlue,this.$buttonBlueWhite,this.$buttonWhiteBlue,this.$buttonColorDef);
this.$controllerOrangeButtonColorDiv.attr('style','display:none');


this.$controllerOrangeFontSizeDiv = $('<div>',{
  'class' : 'controller-orange-fontsize',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHideFontSize = $('<button>',{
  'type' : 'button',
'id' : 'hide-fontsize',
'tabindex' : '1',
'aria-label': this.tt.fontSize,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideFontSize.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.fontSize+"</span>");

this.$button50 = $('<button>',{
  'type' : 'button',
  'id' : 'button50',
  'tabindex' : '1',
  'aria-label': 'cinquante pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button50.append("<span>"+"50%"+"</span>"); 

this.$button75 = $('<button>',{
  'type' : 'button',
  'id' : 'button75',
  'tabindex' : '1',
  'aria-label': "soixante quinze pourcent",
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button75.append("<span>"+"75%"+"</span>"); 

this.$button100 = $('<button>',{
  'type' : 'button',
  'id' : 'button100',
  'tabindex' : '1',
  'aria-label': "cent pourcent",
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button100.append("<span>"+"100%"+"</span>");

this.$button125 = $('<button>',{
  'type' : 'button',
  'id' : 'button125',
  'tabindex' : '1',
  'aria-label': 'cent vingt cinq pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button125.append("<span>"+"125%"+"</span>");

this.$button150 = $('<button>',{
  'type' : 'button',
  'id' : 'button150',
  'tabindex' : '1',
  'aria-label': 'cent cinquante pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button150.append("<span>"+"150%"+"</span>");

this.$button175 = $('<button>',{
  'type' : 'button',
  'id' : 'button175',
  'tabindex' : '1',
  'aria-label': 'cent soixante quinze pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button175.append("<span>"+"175%"+"</span>");

this.$button200 = $('<button>',{
  'type' : 'button',
  'id' : 'button200',
  'tabindex' : '1',
  'aria-label': 'deux cent pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button200.append("<span>"+"200%"+"</span>");

this.$button300 = $('<button>',{
  'type' : 'button',
  'id' : 'button300',
  'tabindex' : '1',
  'aria-label': 'trois cent pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button300.append("<span>"+"300%"+"</span>");

this.$button400 = $('<button>',{
  'type' : 'button',
  'id' : 'button400',
  'tabindex' : '1',
  'aria-label': 'quatre cent pourcent',
  'aria-checked':'false',
  'class' : 'button normalIcon'
  });
this.$button400.append("<span>"+"400%"+"</span>");

this.$controllerOrangeFontSizeDiv.append(this.$buttonHideFontSize,this.$button50,this.$button75,this.$button100,this.$button125,this.$button150,this.$button175,this.$button200,this.$button300,this.$button400);
this.$controllerOrangeFontSizeDiv.attr('style','display:none');


this.$controllerOrangePreferencesDiv = $('<div>',{
  'class' : 'controller-orange-preferences',
  'aria-live' : 'assertive',
  'aria-atomic': 'true'
});
this.$buttonHidePrefT = $('<button>',{
  'type' : 'button',
'id' : 'hide-prefT',
'tabindex' : '1',
'aria-label': this.tt.menu,
'class' : 'able-button-handler-play button title'
});
this.$buttonHidePrefT.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.menu+"</span>");

this.$buttonVisionPlus = $('<button>',{
  'type' : 'button',
  'id' : 'visionPlus',
  'tabindex' : '1',
  'aria-label': this.tt.visionPlus,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonVisionPlus.append("<span> "+this.tt.visionPlus+"</span>"); 

this.$buttonSansVisionPlus = $('<button>',{
  'type' : 'button',
  'id' : 'sansVisionPlus',
  'tabindex' : '1',
  'aria-label': this.tt.sansVisionPlus,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonSansVisionPlus.append("<span> "+this.tt.sansVisionPlus+"</span>"); 

this.$buttonAuditionPlus = $('<button>',{
  'type' : 'button',
  'id' : 'auditionPlus',
  'tabindex' : '1',
  'aria-label': this.tt.auditionPlus,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonAuditionPlus.append("<span> "+this.tt.auditionPlus+"</span>"); 

this.$buttonLSFPlus = $('<button>',{
  'type' : 'button',
  'id' : 'lsfPlus',
  'tabindex' : '1',
  'aria-label': this.tt.lsfPlus,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonLSFPlus.append("<span> "+this.tt.lsfPlus+"</span>"); 

this.$buttonDefPlus = $('<button>',{
  'type' : 'button',
  'id' : 'defPlus',
  'tabindex' : '1',
  'aria-label': this.tt.defPlus,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$timerOrange = null;
this.$buttonDefPlus.append("<span> "+this.tt.defPlus+"</span>"); 

this.$buttonConPlus = $('<button>',{
  'type' : 'button',
  'id' : 'conPlus',
  'tabindex' : '1',
  'aria-label': this.tt.conPlus,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonConPlus.append("<span> "+this.tt.conPlus+"</span>"); 

this.$buttonProfilDefaut = $('<button>',{
  'type' : 'button',
  'id' : 'profDef',
  'tabindex' : '1',
  'aria-label': this.tt.profildef,
  'aria-checked':'false',
  'class' : 'able-button-handler-forward button'
  });
this.$buttonProfilDefaut.append("<span> "+this.tt.profildef+"</span>"); 

// this.$buttonAllParams = $('<button>',{
//   'type' : 'button',
//   'id' : 'allParams',
//   'tabindex' : '1',
//   'aria-label': this.tt.allParams,
//   'aria-checked':'false',
//   'class' : 'button allParams'
//   });
// this.$buttonAllParams.append("<span> "+this.tt.allParams+"</span><i class=\"arrow right\"></i>"); 

//this.$controllerOrangePreferencesDiv.append(this.$buttonHidePrefT,this.$buttonVisionPlus,this.$buttonSansVisionPlus,this.$buttonAuditionPlus,this.$buttonLSFPlus, this.$buttonDefPlus, this.$buttonConPlus);//, this.$buttonAllParams);
this.$controllerOrangePreferencesDiv.append(this.$buttonHidePrefT,this.$buttonVisionPlus,this.$buttonSansVisionPlus,this.$buttonAuditionPlus,this.$buttonLSFPlus, this.$buttonConPlus,this.$buttonProfilDefaut);//, this.$buttonAllParams);
this.$controllerOrangePreferencesDiv.attr('style','display:none');

///////////////////////////////////////

this.$controllerOrangeSettingsDiv = $('<div>',{
    'class' : 'controller-orange-settings',
    'aria-live' : 'assertive',
    'tabindex' : '-1',
    'aria-atomic': 'true'
});
this.$buttonHideSettings = $('<button>',{
    'type' : 'button',
'id' : 'hide-settings',
'tabindex' : '1',
'aria-label': this.tt.back,
'class' : 'able-button-handler-play button title'
});
this.$buttonHideSettings.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.menu+"</span>");


this.$buttonSpeeds = $('<button>',{
    'type' : 'button',
'id' : 'speed',
'tabindex' : '1',
'aria-label': this.tt.speed,
'class' : 'normalIcon button speed menuButton'
});
this.$buttonSpeeds.append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span id=\"\">"+this.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");


this.$buttonLSF = $('<button>',{
    'type' : 'button',
'id' : 'lsf',
'tabindex' : '1',
'aria-label': this.tt.sign,
'class' : 'able-button-handler-forward aria-no-checked button lsf menuButton',
'aria-checked': 'false',
});
//this.$buttonLSF.append("<i class=\"sign\"></i><span id=\"\">"+this.tt.sign+"</span>");
//<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'</svg><path d=''</path>
this.$buttonLSF.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.sign+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

this.$buttonAudioDesc = $('<button>',{
    'type' : 'button',
'id' : 'audiodesc',
'tabindex' : '1',
'aria-label': this.tt.audiodesc,
'class' : 'able-button-handler-forward aria-no-checked button audiodesc menuButton',
'aria-checked': 'false',
});
//this.$buttonAudioDesc.append("<i class=\"audiodesc\"></i><span id=\"\">"+this.tt.audiodesc+"</span>");
//this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodesc+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 30 20'><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodesc+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");


this.$buttonTranscr = $('<button>',{
'type' : 'button',
'id' : 'transcr',
'tabindex' : '1',
'aria-label': this.tt.prefMenuTranscript,
'class' : 'able-button-handler-forward button transcr menuButton',
'aria-checked': 'false',
});
//this.$buttonTranscr.append("<i class=\"prefMenuTranscript\"></i><span id=\"\">"+this.tt.transcract+"</span>");
//this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 19.107v-17.857q0-0.446 0.313-0.759t0.759-0.313h8.929v6.071q0 0.446 0.313 0.759t0.759 0.313h6.071v11.786q0 0.446-0.313 0.759t-0.759 0.312h-15q-0.446 0-0.759-0.313t-0.313-0.759zM4.286 15.536q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 12.679q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 9.821q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM11.429 5.893v-5.268q0.246 0.156 0.402 0.313l4.554 4.554q0.156 0.156 0.313 0.402h-5.268z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.transcract+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.transcract+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");


this.$buttonVidcontr = $('<button>',{
    'type' : 'button',
'id' : 'vidcontr',
'tabindex' : '1',
'aria-label': this.tt.vidcontr,
'class' : 'able-button-handler-forward button vidcontrno menuButton',
'aria-checked': 'false',
});
if(this.$sources.first().attr('data-sign-opt')){
  this.$buttonVidcontr.attr('aria-checked','false')
  this.$buttonVidcontr.addClass('vidcontr')
  this.$buttonVidcontr.removeClass('vidcontrno')
  this.$buttonVidcontr.text('');
  this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
} else {
  this.$buttonVidcontr.prop("disabled",true);
}
//this.$buttonVidcontr.append("<i class=\"vidcontr\"></i><span id=\"\">"+this.tt.vidcontr+"</span>");

this.$buttonCaptionsParam = $('<button>',{
  'type' : 'button',
  'id' : 'subtitlesParam',
  'tabindex' : '1',
  'aria-label': 'Sous-titres',
  'class' : 'button subtitles menuButton',
  'aria-checked': 'false',
  });
  //this.$buttonCaptions.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
  //this.$buttonCaptionsParam.append("<p class=\"captionsSub\"></p><span><span>"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
  //this.$buttonCaptionsParam.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z'</path></svg><span class='spanButton'>"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
  this.$buttonCaptionsParam.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M 1.37,3.33 C 6.99,3.35 12.61,3.37 18.22,3.40M 2.54,4.25 C 2.54,4.25 17.35,4.25 17.35,4.25 17.88,4.24 18.56,4.29 18.54,3.90 18.53,3.51 17.85,2.82 17.35,2.82 17.35,2.82 2.54,2.82 2.54,2.82 2.01,2.83 1.60,3.16 1.62,3.55 1.63,3.94 2.03,4.24 2.54,4.25 Z M 1.19,18.83 C 1.19,18.83 2.56,18.83 2.56,18.83 2.61,18.69 1.26,15.41 1.25,10.98 1.25,6.69 2.60,2.77 2.56,2.70 2.56,2.70 1.19,2.70 1.19,2.70 1.14,2.84 -0.08,6.58 -0.08,11.01 -0.07,15.30 1.14,18.69 1.19,18.83 Z M 17.32,18.48 C 17.32,18.48 18.46,18.48 18.46,18.48 18.50,18.34 19.95,14.71 19.95,10.41 19.95,6.24 18.49,2.88 18.46,2.82 18.46,2.82 17.32,2.82 17.32,2.82 17.28,2.95 18.62,6.49 18.62,10.79 18.62,14.95 17.28,18.34 17.32,18.48 17.32,18.48 17.32,18.48 17.32,18.48 Z M 2.56,18.83 C 2.56,18.83 17.37,18.83 17.37,18.83 17.90,18.82 18.58,18.87 18.56,18.48 18.55,18.09 17.87,17.40 17.37,17.40 17.37,17.40 2.56,17.40 2.56,17.40 2.03,17.41 1.62,17.74 1.64,18.13 1.65,18.52 2.05,18.82 2.56,18.83 2.56,18.83 2.56,18.83 2.56,18.83 Z M 4.05,16.73 C 4.05,16.73 15.64,16.73 15.64,16.73 16.05,16.72 16.37,16.24 16.36,15.68 16.34,15.14 16.03,14.70 15.64,14.69 15.64,14.69 4.05,14.69 4.05,14.69 3.63,14.71 3.32,15.18 3.33,15.74 3.34,16.29 3.65,16.72 4.05,16.73 Z M 6.33,13.87 C 6.33,13.87 3.65,13.87 3.65,13.87 3.42,13.86 3.24,13.38 3.24,12.82 3.25,12.28 3.43,11.84 3.65,11.83 3.65,11.83 6.33,11.83 6.33,11.83 6.57,11.85 6.75,12.32 6.74,12.88 6.74,13.43 6.56,13.86 6.33,13.87 Z M 15.85,13.87 C 15.85,13.87 8.48,13.87 8.48,13.87 8.22,13.86 8.01,13.38 8.02,12.82 8.03,12.28 8.23,11.84 8.48,11.83 8.48,11.83 15.85,11.83 15.85,11.83 16.11,11.85 16.32,12.32 16.31,12.88 16.30,13.43 16.10,13.86 15.85,13.87 Z'</path></svg><span class='spanButton'>"+this.tt.captions+"</span><i class=\"arrow right\"></i>");


  this.$buttonPerceptionParam = $('<button>',{
    'type' : 'button',
    'id' : 'perceptionParam',
    'tabindex' : '1',
    'aria-label': 'Perception sonore',
    'class' : 'button normalIcon menuButton',
    'aria-checked': 'false',
    });
    //this.$buttonCaptions.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
    this.$buttonPerceptionParam.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'>"+this.tt.perception+"</span><i class=\"arrow right\"></i>");

    this.$buttonReglageParam = $('<button>',{
      'type' : 'button',
      'id' : 'reglageParam',
      'tabindex' : '1',
      'aria-label': 'Perception sonore',
      'class' : 'button normalIcon menuButton',
      'aria-checked': 'false',
      });
      //this.$buttonCaptions.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\"></i>");
      this.$buttonReglageParam.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'>"+this.tt.reglages+"</span><i class=\"arrow right\"></i>");

//
//
//
//Check pref to toogle or not buttons
if(this.$sources.first().attr('data-sign-opt')){
this.$buttonVidcontr.attr('aria-checked','false')
this.$buttonVidcontr.addClass('vidcontr')
this.$buttonVidcontr.removeClass('vidcontrno')
this.$buttonVidcontr.text('');
this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
} else {
this.$buttonVidcontr.prop("disabled",true);
}
if(this.$sources.first().attr('data-sign-src')){
if(this.getCookie()['preferences']['prefSign'] == 1){
this.$buttonLSF.addClass('aria-no-checked');
this.$buttonLSF.attr('aria-checked','true');
this.$buttonLSF.text('');
this.$buttonLSF.addClass('lsfno')
this.$buttonLSF.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z'</path></svg><span id=\"\" class='spanButton' >"+this.tt.lsfno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
} else {
this.$buttonLSF.removeClass('aria-no-checked')
this.$buttonLSF.attr('aria-checked','false')
this.$buttonLSF.text('');
this.$buttonLSF.removeClass('lsfno')
 this.$buttonLSF.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.lsfact+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
}
} else {
this.$buttonLSF.prop("disabled",true);
}
if(this.transcriptType){
  if(this.getCookie()['preferences']['prefTranscript'] == 1){
    this.$buttonTranscr.addClass('aria-no-checked')
    this.$buttonTranscr.attr('aria-checked','true')
    this.$buttonTranscr.children('span').remove();
    this.$buttonTranscr.children('span').text(this.tt.transcrno);
    this.$buttonTranscr.addClass('transcrno')
    //if(this.$buttonTranscr.children('svg').length == 0){
    this.$buttonTranscr.children('svg').remove();
    this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z'</path></svg><span id=\"\" class='spanButton'"+this.tt.transcract+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
    //}
  
  } else {
    this.$buttonTranscr.removeClass('aria-no-checked')
    this.$buttonTranscr.attr('aria-checked','false')
    this.$buttonTranscr.text('');
    this.$buttonTranscr.removeClass('transcrno')
    //if(this.$buttonTranscr.children('svg').length == 0){
    this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.transcract+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
    //}
  }
} else {
this.$buttonTranscr.prop("disabled",true);
}

if(this.transcriptType){
if(this.getCookie()['preferences']['prefDesc'] == 1){
this.$buttonAudioDesc.addClass('aria-no-checked')
this.$buttonAudioDesc.attr('aria-checked','true')
this.$buttonAudioDesc.text('');
this.$buttonAudioDesc.addClass('audiodescno')
  //this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodescno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 30 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodescno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

} else {
this.$buttonAudioDesc.removeClass('aria-no-checked')
this.$buttonAudioDesc.attr('aria-checked','false')
this.$buttonAudioDesc.text('');
this.$buttonAudioDesc.removeClass('audiodescno')
  //this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodescact+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 30 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodescact+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");

}
} else {
this.$buttonAudioDesc.prop("disabled",true);
}
if(this.getCookie()['preferences']['prefModeUsage'] === 'visionPlus'){
  this.$buttonVisionPlus.attr('aria-checked','true');
  this.$buttonVisionPlus.addClass('aria-no-checked');
  this.$buttonVidcontr.addClass('vidcontrno');
  this.$buttonVidcontr.attr('aria-label',this.tt.vidcontr);
  this.$buttonVidcontr.text('');
  this.$buttonVidcontr.append("<svg style='box-shadow:1px 1px 0px #aaa;float:left;margin-left:25%' class=\"captions\" ></svg><span id=\"\" span='classButton'>"+this.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  
  this.$buttonVidcontr.attr('aria-checked','true');
  this.$buttonSpeedsMain.css('display','block');
  
  //Put vidcontr ON here
  //var vids = document.getElementsByTagName('video')
  this.$media.css('filter','grayscale(100%) contrast(150%)') 
  //

}
if(this.getCookie()['preferences']['prefModeUsage'] === 'sansVisionPlus'){
  this.$buttonSansVisionPlus.attr('aria-checked','true');
  this.$buttonSansVisionPlus.addClass('aria-no-checked');
  this.$buttonSpeedsMain.css('display','block');
  if(this.getCookie()['preferences']['prefDesc'] === 1){
    this.$buttonAudioDesc.attr('aria-checked','true');
    this.$buttonAudioDesc.addClass('aria-no-checked');
    this.$buttonAudioDesc.children('span').text(this.tt.audiodescno);
  } else {
    this.$buttonAudioDesc.attr('aria-checked','false');
    this.$buttonAudioDesc.removeClass('aria-no-checked');
    this.$buttonAudioDesc.children('span').text(this.tt.audiodescact);
  }
}
if(this.getCookie()['preferences']['prefModeUsage'] === 'auditionPlus'){
  this.$buttonAuditionPlus.attr('aria-checked','true');
  this.$buttonAuditionPlus.addClass('aria-no-checked');
}
if(this.getCookie()['preferences']['prefModeUsage'] === 'lsfPlus'){
  
  this.$buttonLSFPlus.attr('aria-checked','true');
  this.$buttonLSFPlus.addClass('aria-no-checked');
  this.$buttonVidcontr2.css('display','block');
}

if(this.getCookie()['preferences']['prefModeUsage'] === 'defPlus'){
  
  this.$buttonDefPlus.attr('aria-checked','false');
  this.$buttonDefPlus.addClass('firstTime');
  this.$buttonDefPlus.removeClass('aria-no-checked');
  setTimeout(function(){ 
    $('#defPlus').click(); 
  },3000);
  
}

if(this.getCookie()['preferences']['prefModeUsage'] === 'conPlus'){
  
  this.$buttonConPlus.attr('aria-checked','true');
  this.$buttonConPlus.addClass('aria-no-checked');
  this.$buttonSpeedsMain.css('display','block');
  if(this.getCookie()['preferences']['prefTranscript'] === 1){
    this.$buttonTranscr.attr('aria-checked','true');
    this.$buttonTranscr.addClass('aria-no-checked');
    this.$buttonTranscr.children('span').text(this.tt.transcrno+'');
  } else {
    this.$buttonTranscr.attr('aria-checked','false');
    this.$buttonTranscr.removeClass('aria-no-checked');
    this.$buttonTranscr.children('span').text(this.tt.transcract+'');
  }
  
}
if(this.getCookie()['preferences']['prefCaptionsColor'] != ''){
  var color = this.getCookie()['preferences']['prefCaptionsColor'];
    $(this.$controllerOrangeTextColorDiv).children().each(function(){
      if($(this)[0].id.includes(color)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}
if(this.getCookie()['preferences']['prefCaptionsBGColor'] != ''){
  var color = this.getCookie()['preferences']['prefCaptionsBGColor'];
    $(this.$controllerOrangeBGColorDiv).children().each(function(){
      if($(this)[0].id.includes(color)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}

if(this.getCookie()['preferences']['prefFollowColor'] != '' && this.getCookie()['preferences']['prefFollowColor'] != '#FF6'){
  var color = this.getCookie()['preferences']['prefFollowColor'];
    $(this.$controllerOrangeFollowColorDiv).children().each(function(){
      if($(this)[0].id.includes(color)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}

if(this.getCookie()['preferences']['prefVidSize'] != '' && this.getCookie()['preferences']['prefVidSize'] != '66'){
  var prefVidSize = this.getCookie()['preferences']['prefVidSize'];
    $(this.$controllerOrangeFollowColorDiv).children().each(function(){
      if($(this)[0].id.includes(prefVidSize)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}


if(this.getCookie()['preferences']['prefCaptionsSize'] != ''){
  var size = this.getCookie()['preferences']['prefCaptionsSize'];
    $(this.$controllerOrangeFontSizeDiv).children().each(function(){
      if($($(this)[0].children[0]).text() === size){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}


if(this.getCookie()['preferences']['prefShadowType'] != ''){
  var size = this.getCookie()['preferences']['prefShadowType'];
    $(this.$controllerOrangeOutTextDiv).children().each(function(){
      if($($(this)[0].children[0]).text() === size){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}

if(this.getCookie()['preferences']['prefCaptionsFont'] != ''){
  var size = this.getCookie()['preferences']['prefCaptionsFont'];
    $(this.$controllerOrangeFontDiv).children().each(function(){
      if($($(this)[0].children[0]).text() === size){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-no-checked','true');
      }
  
    });
}



//07/08/2020 USELESS
// if(this.$media.find('track[kind="captions"], track[kind="subtitles"]').length > 0){
// if(this.getCookie()['preferences']['prefCaptions'] == 1){
// this.$buttonActivateSub.addClass('aria-no-checked')
// this.$buttonActivateSub.attr('aria-checked','true')
//  this.$buttonActivateSub.text('');
// this.$buttonActivateSub.addClass('subtno')
//  this.$buttonActivateSub.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.de_act_st+"</span>");
// } else {
//   this.$buttonActivateSub.removeClass('aria-no-checked')
//   this.$buttonActivateSub.attr('aria-checked','false')

// }
// } else {
// this.$buttonActivateSub.prop("disabled",true);
// }

if(this.userAgent.browser.name != 'Firefox'){
  this.$controllerOrangeSettingsDiv.append(this.$buttonHideSettings,this.$buttonSpeeds, this.$buttonCaptionsParam, this.$buttonLSF,this.$buttonAudioDesc,this.$buttonTranscr,this.$buttonVidcontr,this.$buttonPerceptionParam,this.$buttonReglageParam);
} else {
  this.$controllerOrangeSettingsDiv.append(this.$buttonHideSettings,this.$buttonSpeeds, this.$buttonCaptionsParam, this.$buttonLSF,this.$buttonAudioDesc,this.$buttonTranscr,this.$buttonVidcontr,this.$buttonReglageParam);
}

this.$controllerOrangeSettingsDiv.attr('style','display:none');



if(this.getCookie()['preferences']['prefColorButton'] != ''){
  var color = this.getCookie()['preferences']['prefColorButton'];
    $(this.$controllerOrangeButtonColorDiv).children().each(function(){
      if($($(this)[0].children[0]).id === color){
        $(this).attr('aria-checked','true');
      }
  
    });
    $(this.$controllerOrangeDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeVolumeDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeVolumeDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeBGColorDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeBGColorDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeFollowColorDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeFollowColorDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeFontDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeFontDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeFontSizeDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeFontSizeDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeOutTextDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeOutTextDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangePerceptionDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangePerceptionDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangePreferencesDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangePreferencesDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeReglagesDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeReglagesDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeSettingsDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeSettingsDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeSubtitlesDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeSubtitlesDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    $(this.$controllerOrangeTextColorDiv).find('.button').each(function(){
      if( $(this).id != 'whiteblue' && 
      $(this).id != 'bluewhite' &&
      $(this).id != 'yellowblue' &&
      $(this).id != 'blueyellow' &&
      $(this).id != 'whiteblack' &&
      $(this).id != 'blackwhite' ){
        $(this).removeClass('whiteblue');
        $(this).removeClass('bluewhite');
        $(this).removeClass('yellowblue');
        $(this).removeClass('blueyellow');
        $(this).removeClass('whiteblack');
        $(this).removeClass('blackwhite');
        $(this).addClass(color);
      }
     
  
    });
    $(this.$controllerOrangeTextColorDiv).find('i').each(function(){
      $(this).removeClass('whiteblue');
      $(this).removeClass('bluewhite');
      $(this).removeClass('yellowblue');
      $(this).removeClass('blueyellow');
      $(this).removeClass('whiteblack');
      $(this).removeClass('blackwhite');
      $(this).addClass(color);
  
    });
    
    
}

    //end Orange Player Skin

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

    this.$controllerDivPlus = $('<div>',{
      'class' : 'able-controller'
    });
    this.$controllerDivPlus.addClass('able-' + this.iconColor + '-controls');

    this.$statusBarDiv = $('<div>',{
      'class' : 'able-status-bar',
      'style' : 'display:none'
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
    //Add copy for Orange container
    this.$elapsedTimeContainerOrange = $('<span>',{
      'style': 'width: 25%;margin-right: 15px',
      'class': 'able-elapsedTime',
      text: '0:00'
    });
    this.$setTimeOrange = $('<input>',{
      'style': 'width: 50%',
      'id': 'setTimeOrange',
      'type': 'text',
      'placeholder': 'Saisissez un instant précis'
    });
    this.$durationContainerOrange = $('<span>',{
      'style': 'width: 25%',
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

    //Orange add button to display accessible menu
    this.$accMenu = $('<span>',{
      'class' : 'acc-menu',
      'id' : 'acc-menu-id',
      'role' : 'button',
      'tabindex' : '1',
      'aria-label' : 'Bouton affichage menu accessibilité',
      'aria-live' : 'polite'
    }).text(this.tt.showAccMenu);

    //Orange check if menu accessible have to be deployed
    if(this.getCookie()['preferences']['prefAccessMenu'] != ''){
      if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
        this.$accMenu.text(this.tt.maskAccMenu);
        //this.$controllerDiv.attr("style","display:none");
        this.$controllerDivPlus.attr("style","display:none");
        this.$controllerOrangeDiv.attr("style","display:block");
      } else {
        this.$accMenu.text(this.tt.showAccMenu);
        //this.$controllerDivPlus.attr("style","display:block");
        this.$controllerDiv.attr("style","display:block");
        //this.$controllerDiv.attr("style","display:none");
        this.$controllerOrangeDiv.attr("style","display:none");
      }
    }
    //end

    // Put everything together.
    this.$statusBarDiv.append(this.$timer,this.$accMenu, this.$speed, this.$status);
    //this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
    if(this.userAgent.browser.name != 'Firefox'){
      this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv,this.$controllerOrangeDiv,this.$controllerOrangeVolumeDiv,this.$controllerOrangeSettingsDiv,this.$controllerOrangeSubtitlesDiv, this.$controllerOrangePreferencesDiv, this.$controllerOrangePerceptionDiv,this.$controllerOrangeReglagesDiv,this.$controllerOrangeTextColorDiv,this.$controllerOrangeBGColorDiv,this.$controllerOrangeFollowColorDiv,this.$controllerOrangeFontSizeDiv,this.$controllerOrangeOutTextDiv,this.$controllerOrangeFontDiv, this.$controllerOrangeButtonColorDiv);
    } else {
      this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv,this.$controllerOrangeDiv,this.$controllerOrangeVolumeDiv,this.$controllerOrangeSettingsDiv,this.$controllerOrangeSubtitlesDiv, this.$controllerOrangePreferencesDiv,this.$controllerOrangeReglagesDiv,this.$controllerOrangeTextColorDiv,this.$controllerOrangeBGColorDiv,this.$controllerOrangeFollowColorDiv,this.$controllerOrangeFontSizeDiv,this.$controllerOrangeOutTextDiv,this.$controllerOrangeFontDiv, this.$controllerOrangeButtonColorDiv);
    }
    
    this.$ableDiv.append(this.$playerDiv);
  };

  AblePlayer.prototype.injectTextDescriptionArea = function () {

    // create a div for exposing description
    // description will be exposed via role="alert" & announced by screen readers
    this.$descDiv = $('<div>',{
      'class': 'able-descriptions',
      'aria-live': 'assertive',
      'aria-atomic': 'true',
      'width' : this.$playerDiv.width()+'px',
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
    this.$alertBox.hide();
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

    var thisObj, $popup, whichMenu, $thisButton, $thisListItem, $prevButton, $nextButton,
      $thisItem, $prevItem, $nextItem, selectedTrackIndex, selectedTrack;
    
    thisObj = this;
    $popup = $('<div>',{
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup',
      'z-index': '9000'
    }).hide();
    if (which == 'prefs') {
      $popup.attr('role','menu');
    }
    if (which === 'chapters' || which === 'prefs' || which === 'sign-window' || which === 'transcript-window') {
      $popup.addClass('able-popup-no-radio');
    }
    $popup.on('keydown',function (e) {
      whichMenu = $(this).attr('id').split('-')[1]; // 'prefs','captions' or 'chapters'
      if (whichMenu === 'prefs') { // pop-up menu is a list of menu items
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
        else if (e.which === 27) {  // Escape
          $thisItem.removeClass('able-focus');
          thisObj.closePopups();
        }
        e.preventDefault();
      }
      else { // other than prefs, each other pop-up menu is a list of radio buttons
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
          $thisListItem.find('input:focus').click();
        }
        else if (e.which === 27) {  // Escape
          $thisListItem.removeClass('able-focus');
          thisObj.closePopups();
        }
        e.preventDefault();
      }
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
    if (this.accessPopup && this.accessPopup.is(':visible')) {
      this.accessPopup.hide();
      this.$accMenu.focus();
      $('.able-button-handler-accmenu').focus();
    }
    if (this.prefsPopup && this.prefsPopup.is(':visible')) {
      this.prefsPopup.hide();
      // restore menu items to their original state
      this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
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
        tracks, track, $trackButton, $trackLabel,
        radioName, radioId, $menu, $menuItem,
        prefCats, prefCat, prefLabel;

    popups = [];
    if (typeof which === 'undefined') {
      popups.push('prefs');
    }
    if (which === 'accmenu') {
      popups.push('accmenu');
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
        else if (popup == 'accmenu') {
          if (typeof this.accessPopup === 'undefined') {
            this.accessPopup = this.createPopup('accmenu');
          }
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
        $menu = $('<ul></ul>');
        radioName = this.mediaId + '-' + popup + '-choice';
        if (popup === 'prefs') {
          $menu.attr('role','presentation');
          prefCats = this.getPreferencesGroups();
          for (j = 0; j < prefCats.length; j++) {
            $menuItem = $('<li></li>',{
              'role': 'menuitem',
              'tabindex': '-1'
            });
            prefCat = prefCats[j];
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
            $menuItem.click(function(event) {
              var whichPref = $(this).text();
              thisObj.setFullscreen(false);
              if (whichPref === 'Captions') {
                thisObj.captionPrefsDialog.show();
              }
              else if (whichPref === 'Descriptions') {
                thisObj.descPrefsDialog.show();
              }
              else if (whichPref === 'Keyboard') {
                thisObj.keyboardPrefsDialog.show();
              }
              else if (whichPref === 'Transcript') {
                thisObj.transcriptPrefsDialog.show();
              }
              thisObj.closePopups();
            });
            $menu.append($menuItem);
          }
          this.prefsPopup.append($menu);
        } else if(popup === 'accmenu'){
          var profils = ['Vision +', 'Sans vision +', 'LSF +', 'Concentration +', 'Audition +', 'Standard'];
          var profilLabel = ['Choisir le profil optimisé pour la vision difficile', 'Choisir le profil optimisé pour l’absence de vision', 'Choisir le profil optimisé pour l’audition', 'Choisir le profil optimisé pour la concentration', 'Choisir le profil optimisé pour l\'audition','Choisir le profil Standard'];
          var profilImgList = ['vplus', 'svplus', 'lsfplus', 'conplus','audplus','profdef'];
          //$menu.attr('role','presentation');
          var jChecked = 10;
          for (j = 0; j < profils.length; j++) {
            var profil = profils[j];
            radioId = popup + '-' + j;
            $menuItem = $('<li></li>');
            $menuItem.css('cursor','pointer');
            // var profilImg = $('<img>', {
            //   src: this.rootPath + 'button-icons/' + this.iconColor + '/'+ profilImgList[j] +'.svg',
            //   alt: '',
            //   role: 'presentation',
            //   class: 'popupAccess'
            // });
            var profilImg = $('<span>', {
                alt: '',
                role: 'presentation',
                class: 'popupAccess',
                style:'filter:invert(100%);margin-left:2%;margin-bottom:-1.5%;background-size:cover;width:1em;display:inline-block;height:1em;background-image: url('+this.rootPath + 'button-icons/' + this.iconColor + '/'+ profilImgList[j] +'.svg)',
              
                });
            //$pipe.append($profilImg);
            $trackButton = $('<input>',{
              'type': 'radio',
              'val': j,
              'name': profil,
              'id': radioId,
              'class' : profilImgList[j],
              'aria-label' : profilLabel[j],
            });
            $trackLabel = $('<label>',{
              'for': radioId
            });
            $trackLabel.css('cursor','pointer');
            $trackLabel.css('min-width','80%');
            $trackLabel.text(profil);
            //
            $menuItem.on('click',function(event){
              
              $(event.target).find('input').click();
              //thisObj.handleChangeProfil(profilImgList[j])
            });
            $('.'+profilImgList[j]).on('click',function(event){
              thisObj.handleChangeProfil(profilImgList[j])
            });
            //$('.'+profilImgList[j]).click(this.handleChangeProfil(profilImgList[j]));
            if((this.prefModeUsage == 'visionPlus' && j == 0)||(this.prefModeUsage == 'sansVisionPlus' && j == 1)||(this.prefModeUsage == 'lsfPlus' && j == 2)||(this.prefModeUsage == 'conPlus' && j == 3)||(this.prefModeUsage == 'auditionPlus' && j == 4)||(this.prefModeUsage == 'profDef' && j == 5)){
              //$trackButton.prop('checked',true);
              jChecked = j;
            }
            $menuItem.append($trackButton,profilImg,$trackLabel);
            $menu.append($menuItem);
            this.accessPopup.append($menu);
            this.accessPopup.css('min-width','40%');
            //$('#'+radioId).click(this.handleChangeProfil(profilImgList[j]));
          }
          this.accessPopup.find('input:radio[value=' + jChecked + ']').prop('checked',true)
          
        }
        else {
          for (j = 0; j < tracks.length; j++) {
            $menuItem = $('<li></li>');
            $menuItem.css('cursor','pointer');
            track = tracks[j];
            radioId = this.mediaId + '-' + popup + '-' + j;
            $trackButton = $('<input>',{
              'type': 'radio',
              'val': j,
              'name': radioName,
              'id': radioId
            });
            if (track.def) {
              $trackButton.prop('checked',true);
              hasDefault = true;
            }
            $trackLabel = $('<label>',{
              'for': radioId
            });
            $trackLabel.css('cursor','pointer');
            $trackLabel.css('min-width','91%');
            if (track.language !== 'undefined') {
              $trackButton.attr('lang',track.language);
            }
            //Orange add changinf track on new buttons
            //
            if (track.language === 'en') {
              $('#subtitlesEN').click(this.getCaptionClickFunction(track));
            } else if(track.language === 'fr') {
              $('#subtitlesFR').click(this.getCaptionClickFunction(track));
            } else if(track.language === 'es') {
              $('#subtitlesES').click(this.getCaptionClickFunction(track));
            } else if(track.language === 'pl') {
              $('#subtitlesPL').click(this.getCaptionClickFunction(track));
            } else if(track.language === 'ml') {
              $('#subtitlesML').click(this.getCaptionClickFunction(track));
            }
            //end
            if (popup == 'captions' || popup == 'ytCaptions') {
              $trackLabel.text(track.label || track.language);
              //
              $trackButton.click(this.getCaptionClickFunction(track));
              $menuItem.click(this.getCaptionClickFunction(track));
            }
            else if (popup == 'chapters') {
              $trackLabel.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
              var getClickFunction = function (time) {
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
              }
              $trackButton.on('click keypress',getClickFunction(track.start));
            }
            $menuItem.append($trackButton,$trackLabel);
            $menu.append($menuItem);
          }
          if (popup == 'captions' || popup == 'ytCaptions') {
            // add a captions off button
            radioId = this.mediaId + '-captions-off';
            $menuItem = $('<li></li>');
            $trackButton = $('<input>',{
              'type': 'radio',
              'name': radioName,
              'id': radioId
            });
            $trackLabel = $('<label>',{
              'for': radioId
            });
            $trackLabel.text(this.tt.captionsOff);
            $trackLabel.css('cursor','pointer');
            if (this.prefCaptions === 0) {
              $trackButton.prop('checked',true);
            }
            $trackButton.click(this.getCaptionOffFunction());
            $menuItem.append($trackButton,$trackLabel);
            $menu.append($menuItem);
          }
          if (!hasDefault) { // no 'default' attribute was specified on any <track>
            if ((popup == 'captions' || popup == 'ytCaptions') && ($menu.find('input:radio[lang=' + this.captionLang + ']'))) {
              // check the button associated with the default caption language
              // (as determined in control.js > syncTrackLanguages())
              $menu.find('input:radio[lang=' + this.captionLang + ']').prop('checked',true);
            }
            else {
              // check the first button
              $menu.find('input').first().prop('checked',true);
            }
            //Orange set default sub lang
            if(this.captionsOn){
              if (this.captionLang === 'en') {
                $('#subtitlesEN').attr('aria-checked','true');
                $('#subtitlesEN').addClass('aria-no-checked');
                $('#subtitlesEN').attr('aria-pressed','true');
                $('#subtitlesEN').text(thisObj.tt.de_act_st_en);
                $('#subtitlesEN').addClass('subtno');
              } else if(this.captionLang === 'fr') {
                
                $('#subtitlesFR').attr('aria-checked','true');
                $('#subtitlesFR').attr('aria-pressed','true');
                $('#subtitlesFR').addClass('aria-no-checked');
                $('#subtitlesFR').text(thisObj.tt.de_act_st_fr);
                $('#subtitlesFR').addClass('subtno');
              } else if(this.captionLang === 'es') {
                $('#subtitlesES').attr('aria-checked','true');
                $('#subtitlesES').attr('aria-pressed','true');
                $('#subtitlesES').addClass('aria-no-checked');
                $('#subtitlesES').text(thisObj.tt.de_act_st_es);
                $('#subtitlesES').addClass('subtno');
              } else if(this.captionLang === 'pl') {
                $('#subtitlesPL').attr('aria-checked','true');
                $('#subtitlesPL').attr('aria-pressed','true');
                $('#subtitlesPL').addClass('aria-no-checked');
                $('#subtitlesPL').text(thisObj.tt.de_act_st_pl);
                $('#subtitlesPL').addClass('subtno');
              } else if(this.captionLang === 'ml') {
                $('#subtitlesML').attr('aria-checked','true');
                $('#subtitlesML').attr('aria-pressed','true');
                $('#subtitlesML').addClass('aria-no-checked');
                $('#subtitlesML').text('');
                //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+this.tt.de_act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                //$('#subtitlesML').addClass('subtno');
              } else {//fr is the default
                
                $('#subtitlesFR').attr('aria-pressed','true');
                $('#subtitlesFR').addClass('aria-no-checked');
                $('#subtitlesFR').text(thisObj.tt.de_act_st_fr);
                $('#subtitlesFR').addClass('subtno');
              }
              this.checkContextVidTranscr();
            } else {
                $menu.find('input').last().prop('checked',true);
            }

          }
          if (popup === 'captions' || popup === 'ytCaptions') {
            this.captionsPopup.html($menu);
          }
          else if (popup === 'accmenu') {
            this.accessPopup.html($menu);
          }
          else if (popup === 'chapters') {
            this.chaptersPopup.html($menu);
          }
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
      fallbackText =  this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
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

  // Calculates the layout for controls based on media and options.
  // Returns an object with keys 'ul', 'ur', 'bl', 'br' for upper-left, etc.
  // Each associated value is array of control names to put at that location.
  AblePlayer.prototype.calculateControlLayout = function () {
    // Removed rewind/forward in favor of seek bar.

    var controlLayout = {
      // 'ul': ['play','restart','rewind','forward'],
      'ul': ['play'],
      //'ur': ['seek'],
      'ur': ['seek','durationElapse','captions','fullscreen'],
      'bl': [],
      'br': []
    }

    // test for browser support for volume before displaying volume button
    if (this.browserSupportsVolume()) {
      // volume buttons are: 'mute','volume-soft','volume-medium','volume-loud'
      // previously supported button were: 'volume-up','volume-down'
      this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
      //controlLayout['ur'].push('volume');
      //Orange modif to change order for accessible player
      controlLayout['ul'].push('volume');
      controlLayout['ul'].push('accmenu');
      this.setupPopups('accmenu')
    }
    else {
      this.volume = false;
    }

    // Calculate the two sides of the bottom-left grouping to see if we need separator pipe.
    var bll = [];
    var blr = [];

    //Orange comment this in order to hide all functions
    // if (this.isPlaybackRateSupported()) {
    //   bll.push('slower');
    //   bll.push('faster');
    // }

    // if (this.mediaType === 'video') {
    //   if (this.hasCaptions) {
    //     bll.push('captions'); //closed captions
    //   }
    //   if (this.hasSignLanguage) {
    //     bll.push('sign'); // sign language
    //   }
    //   if ((this.hasOpenDesc || this.hasClosedDesc) && (this.useDescriptionsButton)) {
    //     bll.push('descriptions'); //audio description
    //   }
    // }
    // if (this.transcriptType === 'popup') {
    //   bll.push('transcript');
    // }

    // if (this.mediaType === 'video' && this.hasChapters && this.useChaptersButton) {
    //   bll.push('chapters');
    // }

    // controlLayout['br'].push('preferences');

    // // TODO: JW currently has a bug with fullscreen, anything that can be done about this?
    // if (this.mediaType === 'video' && this.allowFullScreen && this.player !== 'jw') {
    //   controlLayout['br'].push('fullscreen');
    // }

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
    var thisObj, baseSliderWidth, controlLayout, sectionByOrder, useSpeedButtons, useFullScreen,
    i, j, k, controls, $controllerSpan, $sliderDiv,$sliderDivOrange, $setTimeOrange, sliderLabel, duration, $pipe, $pipeImg, tooltipId, tooltipX, tooltipY, control,
    buttonImg, buttonImgSrc, buttonTitle, $newButton, iconClass, buttonIcon, buttonUse, svgPath,
    leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle,
    controllerStyles, vidcapStyles, captionLabel, popupMenuId;

    thisObj = this;

    baseSliderWidth = 100;

    // Initialize the layout into the this.controlLayout variable.
    controlLayout = this.calculateControlLayout();

    sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};

    // add an empty div to serve as a tooltip
    tooltipId = this.mediaId + '-tooltip';
    this.$tooltipDiv = $('<div>',{
      'id': tooltipId,
      'class': 'able-tooltip',
    }).hide();
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
          $sliderDiv = $('<div class="able-seekbar"</div>');
          //$sliderDivOrange = $('<div class="able-seekbar" id="able-seekbar-acc" style="width:50%"></div>');
          sliderLabel = this.mediaType + ' ' + this.tt.seekbarLabel;
          $controllerSpan.append($sliderDiv);
          
          duration = this.getDuration();
          if (duration == 0) {
            // set arbitrary starting duration, and change it when duration is known
            duration = 100;
          }
          this.seekBar = new AccessibleSlider(this.mediaType, $sliderDiv, 'horizontal', baseSliderWidth, 0, duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
          //this.seekBarOrange = new AccessibleSlider(this.mediaType, $sliderDivOrange, 'horizontal', baseSliderWidth, 0, duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
          

          // this.$buttonCopySeekBar.append(this.$elapsedTimeContainerOrange);
          // this.$buttonCopySeekBar.append($sliderDivOrange);
          // this.$buttonCopySeekBar.append(this.$setTimeOrange);
          // this.$buttonCopySeekBar.append(this.$durationContainerOrange);
        } else if (control === 'durationElapse') {
          
          $controllerSpan.append(this.$elapsedTimeContainer);
        }
        else if (control === 'pipe') {
          // TODO: Unify this with buttons somehow to avoid code duplication
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
          if (control === 'acc-menu') {
            buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/sign.png';
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
          if(this.getButtonTitle(control) == 'Accmenu'){
            buttonTitle = this.tt.accmenu;
          }

          // icomoon documentation recommends the following markup for screen readers:
          // 1. link element (or in our case, button). Nested inside this element:
          // 2. span that contains the icon font (in our case, buttonIcon)
          // 3. span that contains a visually hidden label for screen readers (buttonLabel)
          // In addition, we are adding aria-label to the button (but not title)
          // And if iconType === 'image', we are replacing #2 with an image (with alt="" and role="presentation")
          // This has been thoroughly tested and works well in all screen reader/browser combinations
          // See https://github.com/ableplayer/ableplayer/issues/81
          $newButton = $('<button>',{
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
            $newButton.attr({
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
            else if (control === 'accmenu') {
              svgData = this.getSvgData('accmenu');
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
            if (control === 'accmenu') {
              var svgLine = "<circle cx='8' cy='10' r='9' stroke='white' stroke-width='1.5' fill='transparent'></circle>";
              buttonIcon.append(svgLine);
            }  
            if (control === 'volume') {
              var svgLine = "<line x1='0' y1='0' x2='200' y2='200' id='volLine' style='display:none;stroke:white'/>";
              buttonIcon.append(svgLine);
            }  
            buttonIcon.append(svgPath);
            $newButton.html(buttonIcon);

            // Final step: Need to refresh the DOM in order for browser to process & display the SVG
            $newButton.html($newButton.html());
          }
          else {
            // use images
            buttonImg = $('<img>',{
              'src': buttonImgSrc,
              'alt': '',
              'role': 'presentation'
            });
            $newButton.append(buttonImg);
          }
          // add the visibly-hidden label for screen readers that don't support aria-label on the button
          var buttonLabel = $('<span>',{
            'class': 'able-clipped'
          }).text(buttonTitle);
          $newButton.append(buttonLabel);
          // add an event listener that displays a tooltip on mouseenter or focus
          $newButton.on('mouseenter focus',function(event) {
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
                var tooltipX = 0;//position.left;
                var tooltipStyle = {
                  left: tooltipX + 'px',
                  right: '',
                  top: tooltipY + 'px'
                };
              }
            }
            if (centerTooltip) {
              // populate tooltip, then calculate its width before showing it
              var tooltipWidth = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).width();
              // center the tooltip horizontally over the button
              var tooltipX = position.left - tooltipWidth/2;
              if(tooltipX < 0){
                tooltipX = 0;
              }
              var tooltipStyle = {
                left: tooltipX + 'px',
                right: '',
                top: tooltipY + 'px',
              };
            }
            var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).css(tooltipStyle);
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
          else if (control === 'captions') {
            this.$ccButton = $newButton;
          }
          // else if (control === 'acc-menu') {
          //   this.$accMenu = $newButton;
          // }
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
      
      //Orange init perception gain if media is video
      if(this.userAgent.browser.name != 'Firefox'){
        var videoList = document.getElementsByTagName("video");
        //
        this.contextAudio = Array();
        this.lGain= Array();
        this.mGain= Array();
        this.hGain= Array();
        this.buffer= Array();
        this.actualLow = 100;
        this.actualHigh = 100;
        for(var q=0;q<videoList.length;q++){
          this.startAudioContext(videoList[q],q);
        }
        //
        this.$buttonMoreLow.click(function() {
          //
          var videoList = document.getElementsByTagName("video");
          // for(var q=0;q<videoList.length;q++){
          //   thisObj.startAudioContext(videoList[q],q);
          // }
          if(thisObj.actualLow>=0 && thisObj.actualLow<=190){
            //
            thisObj.actualLow=thisObj.actualLow+10;
            for(var q=0;q<videoList.length;q++){
              thisObj.changeGain(thisObj.actualLow, 'lowGain',q);
              thisObj.$divPerceptionLowText[0].innerHTML = thisObj.actualLow + '%';
            }
          }
        });
        this.$buttonLessLow.click(function() {
          //
          var videoList = document.getElementsByTagName("video");
          // for(var q=0;q<videoList.length;q++){
          //   thisObj.startAudioContext(videoList[q],q);
          // }
          if(thisObj.actualLow>=10 && thisObj.actualLow<=200){
            //
            thisObj.actualLow=thisObj.actualLow-10;
            for(var q=0;q<videoList.length;q++){
              thisObj.changeGain(thisObj.actualLow, 'lowGain',q);
              thisObj.$divPerceptionLowText[0].innerHTML = thisObj.actualLow + '%';
            }
          }
        });
        this.$buttonMoreAcute.click(function() {
          //
          var videoList = document.getElementsByTagName("video");
          // for(var q=0;q<videoList.length;q++){
          //   thisObj.startAudioContext(videoList[q],q);
          // }
          if(thisObj.actualHigh>=0 && thisObj.actualHigh<=190){
            thisObj.actualHigh=thisObj.actualHigh+10;
            for(var q=0;q<videoList.length;q++){
              thisObj.changeGain(thisObj.actualHigh, 'highGain',q);
              thisObj.$divPerceptionHighText[0].innerHTML = thisObj.actualHigh + '%';
            }
          }
        });
        this.$buttonLessAcute.click(function() {
          //
          var videoList = document.getElementsByTagName("video");
          // for(var q=0;q<videoList.length;q++){
          //   thisObj.startAudioContext(videoList[q],q);
          // }
          if(thisObj.actualHigh>=10 && thisObj.actualHigh<=200){
            //
            thisObj.actualHigh=thisObj.actualHigh-10;
            for(var q=0;q<videoList.length;q++){
              thisObj.changeGain(thisObj.actualHigh, 'highGain',q);
              thisObj.$divPerceptionHighText[0].innerHTML = thisObj.actualHigh + '%';
            }
          }
        });
        this.$buttonDefaultPerception.click(function() {
          var videoList = document.getElementsByTagName("video");
          // for(var q=0;q<videoList.length;q++){
          //   thisObj.startAudioContext(videoList[q],q);
          // }
          for(var q=0;q<videoList.length;q++){
            thisObj.changeGain(100, 'highGain',q);
            thisObj.changeGain(100, 'lowGain',q);
          }
          thisObj.actualLow=100;
          thisObj.actualHigh=100;
          thisObj.$divPerceptionHighText[0].innerHTML = thisObj.actualHigh + '%';
          thisObj.$divPerceptionLowText[0].innerHTML = thisObj.actualLow + '%';
        });
      }
    }
      

    // combine left and right controls arrays for future reference
    this.controls = [];
    for (var sec in controlLayout) if (controlLayout.hasOwnProperty(sec)) {
      this.controls = this.controls.concat(controlLayout[sec]);
    }

    // Update state-based display of controls.
    this.resizeAccessMenu();
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
		if(this.getCookie()['preferences']['prefModeUsage'] === 'auditionPlus'){
			this.$captionsDiv.addClass('audplus');
		}
        this.$captionsWrapper = $('<div>',{
          'class': 'able-captions-wrapper',
          'aria-hidden': 'true',
          'width': (this.$playerDiv.width())+'px',
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

    this.currentCaption = -1;
    if (this.prefCaptions === 1) {
      // Captions default to on.
      this.captionsOn = true;
        $('#subt').attr('aria-pressed','true');
        $('#subt').attr('aria-label',this.tt.de_act_st_label);
        $('#subt').addClass('aria-no-checked');
        $('#subt').text('');
        //$('#subt').addClass('subtno')
        $('#subt').prop('disabled',false);
        $('#subt').append("<span id=\"\">"+this.tt.de_act_st_general+"</span>");
    }
    else {
      $('#subt').prop('disabled',true);
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
        playsinline: this.playsInline,
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

    //test

    // this.seekHead.hover(function (event) {
    //   thisObj.overHead = true;
    //   thisObj.refreshTooltip();
    // }, function (event) {
    //   thisObj.overHead = false;

    //   if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
    //     thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
    //   }
    //   thisObj.refreshTooltip();
    // });

    // this.seekHead.mousemove(function (event) {
    //   if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
    //     thisObj.trackHeadAtPageX(event.pageX);
    //   }
    // });

    // this.seekHead.focus(function (event) {
    //   thisObj.overHead = true;
    //   thisObj.refreshTooltip();
    // });

    // this.seekHead.blur(function (event) {
    //   thisObj.overHead = false;
    //   thisObj.refreshTooltip();
    // });

    //test
    this.seekHead.on('mouseout mouseenter mouseleave mousemove mousedown mouseup focus blur touchstart touchmove touchend', function (e) {
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
        if(thisObj.bodyDiv[0].id != "able-seekbar-acc"){
          thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
        } else {
          thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
        }
  			
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
    //this.resetHeadLocation();
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
    //
    //
    //Orange change slide side
    if(this.bodyDiv[0].id === 'able-seekbar-acc'){
      this.seekHead.css('left', center - (this.seekHead.width()/2) - (this.bodyDiv.width()/2.25));
      //this.seekHead.css('left', center - (this.seekHead.width()/2));
    } else {
      this.seekHead.css('left', center - (this.seekHead.width()/2));
      //
    }
    

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
    //if(this.bodyDiv[0].id === 'able-seekbar-acc'){
      position = this.lastTrackPosition
    //}
    this.bodyDiv.trigger('stopTracking', [position]);
    this.setPosition(position, true);
  };

  AccessibleSlider.prototype.trackHeadAtPageX = function (pageX) {
    var position = this.pageXToPosition(pageX);
    //var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
    // if(this.bodyDiv[0].id === 'able-seekbar-acc' && position < this.seekHead.attr('aria-valuemax')){
    //   var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2) - (this.bodyDiv.width() / 2.25);
    // } else if(this.bodyDiv[0].id === 'able-seekbar-acc' && position > this.seekHead.attr('aria-valuemax')){
    //   var newLeft = (this.bodyDiv.width() - this.seekHead.width());
    // } else {
      var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
      newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
    //}
    
    this.lastTrackPosition = position;
    this.seekHead.css('left', newLeft);
    this.reportTrackAtPosition(position);
  };

  AccessibleSlider.prototype.trackHeadAtPosition = function (position) {
    var ratio = position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.lastTrackPosition = position;
    if(this.bodyDiv[0].id === 'able-seekbar-acc'){
      this.seekHead.css('left', center - (this.seekHead.width()/2) - this.bodyDiv.width()/2.25);
    } else {
      this.seekHead.css('left', center - (this.seekHead.width()/2));
    }
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
      // if(this.bodyDiv[0].id === 'able-seekbar-acc'){
      //   this.setTooltipPosition(this.seekHead.position().left + ((this.seekHead.width() / 2) - this.bodyDiv.width()/2.25));
      // } else {
        this.setTooltipPosition(this.seekHead.position().left + (this.seekHead.width() / 2));
      //}
      
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
    this.volumeTrackHeight = 70; // must match CSS height for .able-volume-slider
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

    this.$volumeSlider.on('click',function (event) {
      
      var y = event.pageY;
      var top = event.pageY - thisObj.$volumeSliderHead.offset().top;
      // if(top<0){
      //   thisObj.handleVolume('up');
      // } else if(top>0) {
      //   thisObj.handleVolume('down');
      // }
      //thisObj.volumeHeadPositionTop = $(this).offset().top;
      event.preventDefault();
      if(thisObj.isMuted() && thisObj.getVolume() !=0){
        thisObj.handleMute();
      }
      if(thisObj.volumeHeadPositionTop == undefined){
        thisObj.volumeHeadPositionTop = thisObj.$volumeSliderHead.offset().top;
      }
      var diff, direction, ticksDiff, newVolume, maxedOut;
      var diff = thisObj.volumeHeadPositionTop - y;
      
      if (Math.abs(diff) > thisObj.volumeTickHeight) {
        if (diff > 0) {
          direction = 'up';
        }
        else {
          direction = 'down';
        }
        if (direction == 'up' && thisObj.volume == 10) {
          // can't go any higher
          return;
        }
        else if (direction == 'down' && thisObj.volume == 0) {
          // can't go any lower
          return;
        }
      else {
        ticksDiff = Math.round(Math.abs(diff) / thisObj.volumeTickHeight);
        if (direction == 'up') {
          newVolume = thisObj.volume + ticksDiff;
          if (newVolume > 10) {
            newVolume = 10;
          }
        }
        else { // direction is down
          newVolume = thisObj.volume - ticksDiff;
          if (newVolume < 0) {
            newVolume = 0;
          }
        }
        thisObj.setVolume(newVolume); // this.volume will be updated after volumechange event fires (event.js)
        thisObj.refreshVolumeSlider(newVolume);
        thisObj.refreshVolumeButton(newVolume);
        thisObj.volumeHeadPositionTop = y;
      }
    }
      
    });

    // add event listeners
    this.$volumeSliderHead.on('mousedown',function (event) {
      
      if(thisObj.isMuted() && thisObj.getVolume() !=0){
        thisObj.handleMute();
      }
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
    if(volumePct == 0){
      $('#volLine').show();
    } else {
      $('#volLine').hide();
    }

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
    //
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
      //
      if (direction === 'up' && volume < 10) {
        //
        volume += 1;
      }
      else if (direction === 'down' && volume >= 0) {
        //
        volume -= 1;
      }

      //
    }

    if (this.isMuted() && volume > 0) {
      this.setMute(false);
    }
    else if (volume === 0) {
      this.setMute(true);
      $('#hide-volume').text('');
	    $('#orange-volume').css('display:block');
      $('#orange-volume').text(this.tt.volume+' '+(parseInt(volume) / 10 * 100)+'%');
      $('#orange-volume').css('display:none');
	    $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(volume) / 10 * 100)+"%</span>");
      if((parseInt(volume) / 10 * 100) == 0 && $('#sound-mute').text() == ' '+this.tt.unmute){
        $('#sound-mute').click();
      }
    }
    else {
      this.signVideo.muted = false;
      this.media.muted = false;
      $('#hide-volume').text('');
	    var audio = new Audio('button-icons/TOASTBEL.mp3');
	    audio.volume = parseInt(volume)/10;
	    audio.play();
      $('#orange-volume').css('display:block');
      $('#orange-volume').text(this.tt.volume+' '+(parseInt(volume) / 10 * 100)+'%');
      $('#orange-volume').css('display:none');
	    $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(volume) / 10 * 100)+"%</span>");
      if((parseInt(volume) / 10 * 100) > 0 && $('#sound-mute').text() == ' '+this.tt.mute){
      $('#sound-mute').click();
      
      }
      this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
      this.refreshVolumeSlider(volume);
      this.refreshVolumeButton(volume);
    }
  };

  AblePlayer.prototype.handleMute = function() {
    
    if (this.isMuted() || (this.signVideo.muted && this.media.muted)) {
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
      //
      // save current volume so it can be restored after unmute
      this.lastVolume = this.volume;
      this.volume = 0;
      $('#sound-mute').attr('aria-pressed','false');
      $('#sound-mute').attr('aria-label',this.tt.mute);
      $('#sound-mute').addClass('aria-no-checked');
      $('#hide-volume').text('');
      $('#orange-volume').css('display:block');
      $('#orange-volume').text(this.tt.volume+' '+(parseInt(this.volume) / 10 * 100)+'%');
      $('#orange-volume').css('display:none');
	    $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(this.volume) / 10 * 100)+"%</span>");
      $('#sound-mute').text('');
      $('#sound-mute').addClass('vmuteno')
      $('#sound-mute').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z'</path></svg><span class='spanButton'> "+this.tt.mute+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
    }
    else { // restore to previous volume
      //
      if (typeof this.lastVolume !== 'undefined') {
        this.volume = this.lastVolume;
        //
        $('#sound-mute').attr('aria-pressed','true');
		    $('#sound-mute').attr('aria-label',this.tt.unmute);
        $('#sound-mute').removeClass('aria-no-checked');
        $('#hide-volume').text('');
		    $('#orange-volume').css('display:block');
        $('#orange-volume').text(this.tt.volume+' '+(parseInt(this.volume) / 10 * 100)+'%');
        $('#orange-volume').css('display:none');
	      $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(this.volume) / 10 * 100)+"%</span>");
        $('#sound-mute').text('');
        $('#sound-mute').removeClass('vmuteno')
        $('#sound-mute').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span class='spanButton'> "+this.tt.unmute+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        
      }
    }

    if (this.player === 'html5') {
      this.media.muted = mute;
      this.signVideo.muted = mute;
      this.signVideo.volume = this.media.volume;
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
    
    $('#hide-volume').text('');
    if(this.media.muted && this.signVideo.muted){
      $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+0+"%</span>");
      this.refreshVolumeSlider(0);
      this.refreshVolumeButton(0);
    } else {
      $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(volume) / 10 * 100)+"%</span>");
    
    }
    if (this.player === 'html5') {
      this.media.volume = volume / 10;
      if (this.hasSignLanguage && this.signVideo) {
        this.signVideo.volume = this.media.volume; // always mute
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

  //For Orange, add perception
  AblePlayer.prototype.startAudioContext = function(mediaElement,number)
  {
    
    
    var AudioContext = window.AudioContext // Default
    || window.webkitAudioContext // Safari and old versions of Chrome
    || false; 
    this.contextAudio[number] = new AudioContext;
    this.contextAudio[number].suspend();
    //var mediaElement = document.getElementById('player');
    var sourceNode = this.contextAudio[number].createMediaElementSource(mediaElement);
    // EQ Properties
    //
    var gainDb = -40.0;
    var bandSplit = [360,3600];

    var hBand = this.contextAudio[number].createBiquadFilter();
    hBand.type = "lowshelf";
    hBand.frequency.value = bandSplit[0];
    hBand.gain.value = gainDb;

    var hInvert = this.contextAudio[number].createGain();
    hInvert.gain.value = -1.0;

    var mBand = this.contextAudio[number].createGain();

    // var buffer = this.contextAudio[number].createBuffer(1, 22050, 44100);
    // 

    var lBand = this.contextAudio[number].createBiquadFilter();
    lBand.type = "highshelf";
    lBand.frequency.value = bandSplit[1];
    lBand.gain.value = gainDb;

    var lInvert = this.contextAudio[number].createGain();
    lInvert.gain.value = -1.0;

    // this.pbRate[number] = this.contextAudio[number].createBuffer(2, this.contextAudio[number].sampleRate * 30, this.contextAudio[number].sampleRate);
    // this.pbRate[number].playbackRate = 1.0;
    // //buffer.connect(this.contextAudio[number].destination);

    // var source = this.contextAudio[number].createBufferSource();
    // // set the buffer in the AudioBufferSourceNode
    // source.buffer = this.pbRate[number];
    // // connect the AudioBufferSourceNode to the
    // // destination so we can hear the sound
    // source.connect(this.contextAudio[number].destination);

    sourceNode.connect(lBand);
    sourceNode.connect(mBand);
    sourceNode.connect(hBand);

    hBand.connect(hInvert);
    lBand.connect(lInvert);

    hInvert.connect(mBand);
    lInvert.connect(mBand);

    this.lGain[number] = this.contextAudio[number].createGain();
    this.mGain[number] = this.contextAudio[number].createGain();
    this.hGain[number] = this.contextAudio[number].createGain();

    lBand.connect(this.lGain[number]);
    mBand.connect(this.mGain[number]);
    hBand.connect(this.hGain[number]);

    var sum = this.contextAudio[number].createGain();
    this.lGain[number].connect(sum);
    this.mGain[number].connect(sum);
    this.hGain[number].connect(sum);
    sum.connect(this.contextAudio[number].destination);
  }

  AblePlayer.prototype.changeGain = function(string,type,number)
  { 
    //
    //var videoList = document.getElementsByTagName("video");
    //this.startAudioContext(videoList[0]);
    this.contextAudio[number].resume();
    
    var value = parseFloat(string) / 100.0;
    
    switch(type)
    {
      case 'lowGain': this.lGain[number].gain.value = value; break;
      case 'midGain': this.mGain[number].gain.value = value; break;
      case 'highGain': this.hGain[number].gain.value = value; break;
    }
  }

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
      //thisObj.modal.focus();
      thisObj.modal.find("*").filter(focusableElementsSelector).filter(':visible').first().addClass('focus-visible');
      thisObj.modal.find("*").filter(focusableElementsSelector).filter(':visible').first().focus();
      
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
          this.$descDiv.css('visibility','invisible');
        }
        if (!this.swappingSrc) {
          this.showDescription(this.getElapsed());
        }
      }
      this.checkContextVidTranscr();
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
    
    // if(this.userAgent.browser.name != 'Firefox'){
    //   if(this.contextAudio.length > 1 && this.contextAudio[0].state == "running"){
    //     
    //     this.contextAudio[0].close();
    //     this.contextAudio[1].close();
    //   }
    // }
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
    //spec OrangeLab
    this.$buttonCopyPlay.removeClass('pause');
    this.$buttonCopyPlay.text('');
    this.$buttonCopyPlay.value=this.tt.play;
    this.$buttonCopyPlay.attr('aria-label',this.tt.play);
    //$('#copy-play').append("<i class=\"play\"></i><span id=\"copy-play\">"+this.tt.play+"</span>");
    this.$buttonCopyPlay.children('svg').remove();
    //this.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'></path></svg><span id=\"copy-play\" style='margin-left:-25%'>"+this.tt.play+"</span>");
    this.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 16 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'</path></svg> <span id=\"spanPlay\" class='spanButton'>"+this.tt.play+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
    this.resizeAccessMenu();
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

    var thisObj = this;

    //spec OrangeLab
    this.$buttonCopyPlay.text('');
    this.$buttonCopyPlay.addClass('pause');
    this.$buttonCopyPlay.value=this.tt.pause;
    this.$buttonCopyPlay.attr('aria-label',this.tt.pause);
    this.$buttonCopyPlay.children('svg').remove();
    //$('#copy-play').append("<i class=\"play\"></i><span id=\"copy-play\">"+this.tt.pause+"</span>");
    //$('#copy-play').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z'></path></svg><span id=\"copy-play\" style='margin-left:-25%'>"+this.tt.pause+"</span>");
    this.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 16 20'><path d='M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z'</path></svg> <span id=\"spanPlay\" class='spanButton'>"+this.tt.pause+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
    this.resizeAccessMenu();
    if (this.player === 'html5') {
      if(this.userAgent.browser.name != 'Firefox'){
        if(this.contextAudio.length > 0){
          this.contextAudio[0].resume();
          this.contextAudio[1].resume();
        }
      }
      this.media.play(true);
      this.media.addEventListener('ended',function(){
        this.load();
        //this.playing = false;
      });
      if (this.hasSignLanguage && this.signVideo) {
        this.signVideo.addEventListener('ended',function(){
          this.load();
          //this.playing = false;
        });
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
    if (this.hideControls) {
      // wait briefly after playback begins, then hide controls
      this.hidingControls = true;
      this.hideControlsTimeout = window.setTimeout(function() {
        thisObj.fadeControls('out');
        thisObj.controlsHidden = true;
        thisObj.hidingControls = false;
      },2000);
    }
  };

  AblePlayer.prototype.fadeControls = function(direction) {

    // NOTE: This is a work in progress, and is not yet fully functional
    // TODO: Use jQuery fadeIn() and fadeOut() to attain some sort of transition
    // Currently just adds or removes able-offscreen class to visibly hide content
    // without hiding it from screen reader users

    // direction is either 'out' or 'in'

    // One challenge:
    // When controls fade out in other players (e.g., YouTube, Vimeo), the transition works well because
    // their controls are an overlay on top of the video.
    // Therefore, disappearing controls don't affect the size of the video container.
    // Able Player's controls appear below the video, so if this.$playerDiv disappears,
    // that results in a reduction in the height of the video container, which is a bit jarring
    // Solution #1: Don't hide this.$playerDiv; instead hide the two containers nested inside it
    if (direction == 'out') {
      this.$controllerDiv.addClass('able-offscreen');
      this.$statusBarDiv.addClass('able-offscreen');
      // Removing content from $playerDiv leaves an empty controller bar in its place
      // What to do with the empty space?
      // For now, changing to a black background; will restore to original background on fade-in
      this.playerBackground = this.$playerDiv.css('background-color');
      this.$playerDiv.css('background-color','black');
    }
    else if (direction == 'in') {
      this.$controllerDiv.removeClass('able-offscreen');
      this.$statusBarDiv.removeClass('able-offscreen');
      if (typeof this.playerBackground !== 'undefined') {
        this.$playerDiv.css('background-color',this.playerBackground);
      }
      else {
        this.$playerDiv.css('background-color','');
      }
    }
  };

  AblePlayer.prototype.refreshControls = function() {

    var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
      updateLive, textByState, timestamp, widthUsed,
      leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
      buffered, newTop, statusBarHeight, speedHeight, statusBarWidthBreakpoint,
      newSvgData;

    thisObj = this;
    if (this.swappingSrc) {
      // wait until new source has loaded before refreshing controls
      return;
    }

    duration = this.getDuration();
    elapsed = this.getElapsed();

    // if(this.$accMenu){
    //   this.$accMenu.attr('aria-label',this.tt.accmenu);
    //   
    //   
    // }

    if (this.useChapterTimes) {
      this.chapterDuration = this.getChapterDuration();
      this.chapterElapsed = this.getChapterElapsed();
    }

    if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && duration > 0) {
      // couldn't calculate seekInterval previously; try again.
      this.setSeekInterval();
    }
    
    if (this.seekBar){// || this.seekBarOrange) {
      if (this.useChapterTimes) {
        lastChapterIndex = this.selectedChapters.cues.length-1;
        if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
          // this is the last chapter
          if (this.currentChapter.end !== duration) {
            // chapter ends before or after video ends
            // need to adjust seekbar duration to match video end
            this.seekBar.setDuration(duration - this.currentChapter.start);
            //this.seekBarOrange.setDuration(duration - this.currentChapter.start);
          }
          else {
            this.seekBar.setDuration(this.chapterDuration);
            //this.seekBarOrange.setDuration(this.chapterDuration);
          }
        }
        else {
          // this is not the last chapter
          this.seekBar.setDuration(this.chapterDuration);
          //this.seekBarOrange.setDuration(this.chapterDuration);
        }
      }
      else {
        this.seekBar.setDuration(duration);
        //this.seekBarOrange.setDuration(duration);
      }
      //
      if (!(this.seekBar.tracking)) {
        //
        // Only update the aria live region if we have an update pending (from a
        // seek button control) or if the seekBar has focus.
        // We use document.activeElement instead of $(':focus') due to a strange bug:
        //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
        updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
        //updateLiveOrange = this.liveUpdatePending || this.seekBarOrange.seekHead.is($(document.activeElement));
        this.liveUpdatePending = false;
        if (this.useChapterTimes) {
          this.seekBar.setPosition(this.chapterElapsed, updateLive);
        }
        else {
          this.seekBar.setPosition(elapsed, updateLive);
        }
      }
      // if (!(this.seekBarOrange.tracking)) {
      //   //
      //   // Only update the aria live region if we have an update pending (from a
      //   // seek button control) or if the seekBar has focus.
      //   // We use document.activeElement instead of $(':focus') due to a strange bug:
      //   //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
      //   updateLive = this.liveUpdatePending || this.seekBarOrange.seekHead.is($(document.activeElement));
      //   //updateLiveOrange = this.liveUpdatePending || this.seekBarOrange.seekHead.is($(document.activeElement));
      //   this.liveUpdatePending = false;
      //   if (this.useChapterTimes) {
      //     this.seekBarOrange.setPosition(this.chapterElapsed, updateLive);
      //   }
      //   else {
      //     this.seekBarOrange.setPosition(elapsed, updateLive);
      //   }
      // }

      // When seeking, display the seek bar time instead of the actual elapsed time.
      // if (this.seekBarOrange.tracking) {
      //   displayElapsed = this.seekBarOrange.lastTrackPosition;
      // }
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
      //this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
      this.$durationContainer.text(this.formatSecondsAsColonTime(this.chapterDuration));
      this.$durationContainerOrange.text(this.formatSecondsAsColonTime(this.chapterDuration));
    }
    else {
      //this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(duration));
      this.$durationContainer.text( this.formatSecondsAsColonTime(duration));
      this.$durationContainerOrange.text( this.formatSecondsAsColonTime(duration));
    }
    //this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
    this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(duration-displayElapsed));
    this.$elapsedTimeContainerOrange.text(this.formatSecondsAsColonTime(displayElapsed));

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
              newSvgData = this.getSvgData('play');
              this.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
              this.$playpauseButton.find('path').attr('d',newSvgData[1]);
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
              newSvgData = this.getSvgData('pause');
              this.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
              this.$playpauseButton.find('path').attr('d',newSvgData[1]);
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
    //if (this.seekBar || this.seekBarOrange) {
    if (this.seekBar) {
      
      widthUsed = 30;
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
        //seekbarWidth = this.$ableWrapper.width() - widthUsed - seekbarSpacer;
        seekbarWidth = $('.able-controller').width() - widthUsed - seekbarSpacer;
      }
      // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
      if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
        this.seekBar.setWidth(seekbarWidth-(15*seekbarWidth/100));
        //this.seekBarOrange.setWidth(seekbarWidth);
      }
      //
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

    if (typeof this.$bigPlayButton !== 'undefined') {
      // Choose show/hide for big play button and adjust position.
      if (this.isPaused() && !this.seekBar.tracking) {
        if (!this.hideBigPlayButton) {
        this.$bigPlayButton.removeClass('icon-pause').addClass('icon-play');
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
        this.$bigPlayButton.css('height',this.$mediaContainer.find('video').css('height'));
        this.$bigPlayButton.css('width',this.$mediaContainer.find('video').css('width'));
      }
      else {
        //this.$bigPlayButton.hide();
        this.$bigPlayButton.removeClass('icon-play').addClass('icon-pause');
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
      if (this.autoScrollTranscript && this.currentHighlight && this.isPaused() == false) {
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
          if (this.seekBar){// || this.seekBarOrange) {
            this.seekBar.setBuffered(buffered / this.chapterDuration);
            //this.seekBarOrange.setBuffered(buffered / this.chapterDuration);
          }
        }
        else {
          if (this.seekBar){ //|| this.seekBarOrange) {
            this.seekBar.setBuffered(buffered / duration);
            //this.seekBarOrange.setBuffered(buffered / duration);
          }
        }
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      if (this.seekBar) {
        this.seekBar.setBuffered(this.jwPlayer.getBuffer() / 100);
        //this.seekBarOrange.setBuffered(this.jwPlayer.getBuffer() / 100);
      }
    }
    else if (this.player === 'youtube') {
      if (this.seekBar) {
        this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
        //this.seekBarOrange.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
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
    var lastTimeClick = parseInt($('#copy-rewind').val().split("+")[0])

    elapsed = this.getElapsed();
    
    //For Orange, new method for seekInterval, can't use previous this.seekInterval
    if(Date.now()-lastTimeClick<1000){
      var addTime = 0;
      if($('#copy-rewind').val().split("+")[1] === "NaN"){
        addTime = 20;
      } else {
        addTime = parseInt($('#copy-rewind').val().split("+")[1])
      }
      targetTime = elapsed - addTime;
      $('#copy-rewind').val(''+$('#copy-rewind').val().split("+")[0]+"+"+(addTime*2));
    } else {
      //targetTime = elapsed + this.seekInterval;
      targetTime = elapsed - 20;
      $('#copy-rewind').val(''+$('#copy-rewind').val().split("+")[0]+"+20");
    }

    //targetTime = elapsed - this.seekInterval;
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
    var lastTimeClick = parseInt($('#copy-forward').val().split("+")[0])
    elapsed = this.getElapsed();
    duration = this.getDuration();
    lastChapterIndex = this.chapters.length-1;
    //For Orange, new method for seekInterval, can't use previous this.seekInterval
    if(Date.now()-lastTimeClick<1000){
      var addTime = 0;
      if($('#copy-forward').val().split("+")[1] === "NaN"){
        addTime = 20;
      } else {
        addTime = parseInt($('#copy-forward').val().split("+")[1])
      }
      targetTime = elapsed + addTime;
      $('#copy-forward').val(''+$('#copy-forward').val().split("+")[0]+"+"+(addTime*2));
    } else {
      //targetTime = elapsed + this.seekInterval;
      targetTime = elapsed + 20;
      $('#copy-forward').val(''+$('#copy-forward').val().split("+")[0]+"+20");
    }
    

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
    //this.changeRate(1);
     //Add this for Orange spec
     if($('.able-speed').text().indexOf(': 1.50x') != -1){
      //this.setPlaybackRate(1);
      //$('#speed').text(this.tt.speed+ ' normale');
  
    } else if($('.able-speed').text().indexOf(': 0.50x') != -1) {
      
      this.setPlaybackRate(1);
      //$('#speed').text(this.tt.speed+ ' normale');
      $('#speed').children('svg').remove();$('#speed').children('span').remove();
	    $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('i').remove();
	    $('#speedMain').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+this.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	    $('#speed').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+this.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
      this.resizeAccessMenu();
    
    } else if($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) {
      //this.setPlaybackRate(0.5);
      //$('#speed').text(this.tt.speed+ ' ralentie');
      this.setPlaybackRate(1.5)
      //$('#speed').text(this.tt.speed+ ' rapide');
      $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();
      $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
      $('#speed').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+this.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
      $('#speedMain').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+this.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
      this.resizeAccessMenu();
    } 
  };

  AblePlayer.prototype.handleRateDecrease = function() {
    //this.changeRate(-1);
    //Add this for ORange spec
    if($('.able-speed').text().indexOf(': 1.50x') != -1){
      this.setPlaybackRate(1);
      //$('#speed').text(this.tt.speed+ ' normale');

      $('#speed').children('svg').remove();$('#speed').children('span').remove();
	    $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove()
	    $('#speedMain').append("<svg style='float:left;margin-left:25%'class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+this.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	    $('#speed').append("<svg style='float:left;margin-left:25%'class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+this.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");

  
    } else if($('.able-speed').text().indexOf(': 0.50x') != -1) {
      
      //this.setPlaybackRate(1);
      //$('#speed').text(this.tt.speed+ ' normale');
  
    } else if($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) {
      this.setPlaybackRate(0.5);
      //$('#speed').text(this.tt.speed+ ' ralentie');

      $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();
      $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
      $('#speed').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>"+this.tt.speed+" ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
      $('#speedMain').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>"+this.tt.speed+" ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  

    }
    
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

  //Orange click for changing reglages
  AblePlayer.prototype.changeCaptionsTranscrColor = function(elt) {
    this.prefCaptionsColor = elt;
    $('#' + this.mediaId + '_' + 'prefCaptionsColor').val(elt);
    this.updateCookie('prefCaptionsColor');
    this.prefTRColor = elt;
    $('#' + this.mediaId + '_' + 'prefTRColor').val(elt);
    this.updateCookie('prefTRColor');
    $('.able-captions').css('color', this.prefCaptionsColor);
    $('.able-descriptions').css('color', this.prefCaptionsColor);
    $('.able-transcript-seekpoint').css('color', this.prefCaptionsColor);
    $('.controller-orange-textcolor button').each(function(){
      if(!$(this)[0].id.includes('hide-textColor')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
      if($(this)[0].id.includes(elt)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
    });
  }

  AblePlayer.prototype.changeBGColor = function(elt) {
    this.prefCaptionsBGColor = elt;
    $('#' + this.mediaId + '_' + 'prefCaptionsBGColor').val(elt);
    this.updateCookie('prefCaptionsBGColor');
    this.prefTRBGColor = elt;
    $('#' + this.mediaId + '_' + 'prefTRBGColor').val(elt);
    this.updateCookie('prefTRBGColor');
    $('.able-captions-wrapper').css('background-color', this.prefCaptionsBGColor);
    $('.able-captions').css('background-color', this.prefCaptionsBGColor);
    $('.able-descriptions').css('background-color', this.prefCaptionsBGColor);
    $('.able-transcript-seekpoint').css('background-color', this.prefCaptionsBGColor);
    $('.controller-orange-bgcolor button').each(function(){
      if(!$(this)[0].id.includes('hide-bgColor')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
      if($(this)[0].id.includes(elt)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
    });
  }

  AblePlayer.prototype.changeFollowColor = function(elt) {
    this.prefFollowColor = elt;
    $('#' + this.mediaId + '_' + 'prefFollowColor').val(elt);
    this.updateCookie('prefFollowColor');
    $('.controller-orange-followcolor button').each(function(){
      if(!$(this)[0].id.includes('hide-followColor')){
        $(this).removeClass('aria-no-checked');
        $(this).attr('aria-pressed','false');
      }
      if($(this)[0].id.includes(elt)){
        $(this).addClass('aria-no-checked');
        $(this).attr('aria-pressed','true');
      }
    });
  }

  AblePlayer.prototype.changeSize = function(elt) {
    this.prefCaptionsSize = elt;
    $('#' + this.mediaId + '_' + 'prefCaptionsSize').val(elt);
    this.updateCookie('prefCaptionsSize');
    this.prefTRSize = elt;
    $('#' + this.mediaId + '_' + 'prefTRSize').val(elt);
    this.updateCookie('prefTRSize');
    $('.able-captions').css('font-size', this.prefCaptionsSize);
    $('.able-descriptions').css('font-size', this.prefCaptionsSize);
    $('.able-transcript-seekpoint').css('font-size', this.prefTRSize);
    $('.controller-orange-fontsize span').each(function(){
      if($(this)[0].textContent.includes('%')){
        $($(this)[0].parentElement).removeClass('aria-no-checked');
        $($(this)[0].parentElement).attr('aria-pressed','false');
      }
      if($(this)[0].textContent === elt+''){
        $($(this)[0].parentElement).addClass('aria-no-checked');
        $($(this)[0].parentElement).attr('aria-pressed','true');
      }
    });
    var lineHeight = parseInt(this.prefCaptionsSize,10) + 25;
    this.$captionsWrapper.css('line-height',lineHeight + '%');
  }

  AblePlayer.prototype.changeOutFont = function(elt) {
    this.prefShadowType = elt;
    var outFont = ''
    if(elt === this.tt.outHigh){
      //outFont = '1px 1px 2px black, 0 0 25px grey, 0 0 5px grey';
      outFont = '1px 1px 1px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,1)';
    } else if(elt === this.tt.outEnforce){
      //outFont = '1px 1px 2px black, 0 0 25px black, 0 0 5px black';
      outFont = '-1px -1px white, 1px 1px #333';
    } else if(elt === this.tt.outUniform){
      //outFont = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
      outFont = '0 0 0.15em black, 0 0 0.15em black, 0 0 0.15em black';
    } else if(elt === this.tt.outShadow){
      outFont = '2px 2px 4px black';
    }
    $('#' + this.mediaId + '_' + 'prefShadowType').val(elt);
    this.updateCookie('prefShadowType');
    $('.able-captions').css('text-shadow', outFont);
    $('.able-descriptions').css('text-shadow', outFont);
    $('.able-transcript-seekpoint').css('text-shadow', outFont);
    $('.controller-orange-outfont span').each(function(){
      
      $($(this)[0].parentElement).attr('aria-pressed','false');
      $($(this)[0].parentElement).removeClass('aria-no-checked');
      if($(this)[0].textContent === elt+''){
        $($(this)[0].parentElement).addClass('aria-no-checked');
        $($(this)[0].parentElement).attr('aria-pressed','true');
      }
    });
  }

  AblePlayer.prototype.changeFont = function(elt) {
    this.prefCaptionsFont = elt;
    this.prefTRFont = elt;
    $('#' + this.mediaId + '_' + 'prefCaptionsFont').val(elt);
    $('#' + this.mediaId + '_' + 'prefTRFont').val(elt);
    this.updateCookie('prefCaptionsFont');
    this.updateCookie('prefTRFont');
    $('.able-captions').css('font-family', this.prefCaptionsFont);
    $('.able-descriptions').css('font-family', this.prefCaptionsFont);
    $('.able-transcript-seekpoint').css('font-family', this.prefCaptionsFont);
    $('.controller-orange-font span').each(function(){
      
      $($(this)[0].parentElement).attr('aria-pressed','false');
      $($(this)[0].parentElement).removeClass('aria-no-checked');
      if($(this)[0].textContent === elt+''){
        $($(this)[0].parentElement).addClass('aria-no-checked');
        $($(this)[0].parentElement).attr('aria-pressed','true');
      }
    });
  }

  AblePlayer.prototype.changeColorButton = function(elt) {
    
    this.prefColorButton = elt[0].id;
    $('#' + this.mediaId + '_' + 'prefColorButton').val(elt[0].id);
    this.updateCookie('prefColorButton');
    //
    $('.button').removeClass('whiteblue');
    $('.button').removeClass('bluewhite');
    $('.button').removeClass('yellowblue');
    $('.button').removeClass('blueyellow');
    $('.button').removeClass('whiteblack');
    $('.button').removeClass('blackwhite');
    $('i').removeClass('whiteblue');
    $('i').removeClass('bluewhite');
    $('i').removeClass('yellowblue');
    $('i').removeClass('blueyellow');
    $('i').removeClass('whiteblack');
    $('i').removeClass('blackwhite');
    $('.button').addClass(elt[0].id);
    $('i').addClass(elt[0].id);
    //
    $('.controller-orange-butcol span').each(function(){
      
      $($(this)[0].parentElement).attr('aria-pressed','false');
      if($(this)[0].textContent === elt+''){
        $($(this)[0].parentElement).attr('aria-pressed','true');
      }
    });
  }


  //Finally for Orange we copied handlcaption method for On/Off switch in control.js -> handleCaptionToggle
  AblePlayer.prototype.handleCaptionToggleOnOffOrange = function() {
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

        $('#subt').attr('aria-pressed','false');
		    $('#subt').attr('aria-label',this.tt.act_st_label_general);
        $('#subt').removeClass('aria-no-checked');
       //activate captions
       //thisObj.handleCaptionToggle();
        $('#subt').removeClass('subtno')
        $('#subt').text('');
        $('#subt').attr('disabled',true);
        //$('#subt').append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\">");
        $('#subt').append("<span>"+this.tt.de_act_st_general+"</span>");

        //all others are false
        $('#subtitlesFR').attr('aria-pressed','false');
        $('#subtitlesFR').removeClass('aria-no-checked');
        $('#subtitlesFR').removeClass('subtno');
        $('#subtitlesFR').text(this.tt.act_st_fr);
        $('#subtitlesFR').attr('aria-label',this.tt.act_st_fr_label);
    
        $('#subtitlesML').attr('aria-pressed','false');
        $('#subtitlesML').removeClass('aria-no-checked');
        $('#subtitlesML').removeClass('subtno');
        $('#subtitlesML').text('');
        //$('#subtitlesML').append("<span id=\"\">"+this.tt.act_st_ml+"</span><i class=\"captions\"></i>");
        $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+this.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

        $('#subtitlesML').attr('aria-label',this.tt.act_st_ml_label);

        $('#subtitlesEN').attr('aria-pressed','false');
        $('#subtitlesEN').removeClass('aria-no-checked');
        $('#subtitlesEN').removeClass('subtno');
        $('#subtitlesEN').text(this.tt.act_st_en);
		    $('#subtitlesEN').attr('aria-label',this.tt.act_st_en_label);

        $('#subtitlesES').attr('aria-pressed','false');
        $('#subtitlesES').removeClass('aria-no-checked');
        $('#subtitlesES').removeClass('subtno');
        $('#subtitlesES').text(this.tt.act_st_es);
		    $('#subtitlesES').attr('aria-label',this.tt.act_st_es_label);

        $('#subtitlesPL').attr('aria-pressed','false');
        $('#subtitlesPL').removeClass('aria-no-checked');
        $('#subtitlesPL').removeClass('subtno');
        $('#subtitlesPL').text(this.tt.act_st_pl);
        $('#subtitlesPL').attr('aria-label',this.tt.act_st_pl_label);
        
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
        var selected = 0;
        for (var i=0; i<captions.length; i++) {
          if (captions[i].def === true || captions[i].language == "fr") { // this is the default language
            this.selectedCaptions = captions[i];
            selected = i;
          }
        }
        this.selectedCaptions = this.captions[selected];
        if (this.descriptions.length >= 0) {
          this.selectedDescriptions = this.descriptions[0];
        }
        for(var q=0;q<$(this.captionsPopup.find('input')).length;q++){
          
          
          if($($(this.captionsPopup.find('input'))[q]).attr('lang') == this.selectedCaptions.language){
            //
            $($(this.captionsPopup.find('input'))[q]).prop("checked", true);
          } else {
            $($(this.captionsPopup.find('input'))[q]).prop("checked", false);
          }
        }  
		 if (this.captionLang === 'en') {
          $('#subtitlesEN').attr('aria-pressed','true');
          $('#subtitlesEN').attr('aria-label',this.tt.de_act_st_en_label);
          $('#subtitlesEN').addClass('aria-no-checked');
          $('#subtitlesEN').text(this.tt.de_act_st_en);
          $('#subtitlesEN').addClass('subtno');
        } else if(this.captionLang === 'fr') {
          $('#subtitlesFR').attr('aria-pressed','true');
          $('#subtitlesFR').attr('aria-label',this.tt.de_act_st_fr_label);
          $('#subtitlesFR').addClass('aria-no-checked');
          $('#subtitlesFR').text(this.tt.de_act_st_fr);
          $('#subtitlesFR').addClass('subtno');
        } else if(this.captionLang === 'es') {
          $('#subtitlesES').attr('aria-pressed','true');
          $('#subtitlesES').attr('aria-label',this.tt.de_act_st_es_label);
          $('#subtitlesES').addClass('aria-no-checked');
          $('#subtitlesES').text(this.tt.de_act_st_es);
          $('#subtitlesES').addClass('subtno');
        } else if(this.captionLang === 'ml') {
          $('#subtitlesML').attr('aria-pressed','true');
          $('#subtitlesML').attr('aria-label',this.tt.de_act_st_ml_label);
          $('#subtitlesML').addClass('aria-no-checked');
          $('#subtitlesML').text('');
          $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+this.tt.de_act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

          //$('#subtitlesML').append("<span id=\"\">"+this.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
          //$('#subtitlesML').addClass('subtno');
        } else if(this.captionLang === 'pl') {
          $('#subtitlesPL').attr('aria-pressed','true');
          $('#subtitlesPL').attr('aria-label',this.tt.de_act_st_pl_label);
          $('#subtitlesPL').addClass('aria-no-checked');
          $('#subtitlesPL').text(this.tt.de_act_st_pl);
          $('#subtitlesPL').addClass('subtno');
        } 

        $('#subt').attr('aria-checked','true');
		    $('#subt').attr('aria-pressed','true');
		    $('#subt').attr('aria-label',this.tt.de_act_st_label);
	 	    $('#subt').addClass('aria-no-checked');
	 	    $('#subt').text('');
		    //$('#subt').addClass('subtno')
        $('#subt').attr('disabled',false);
	 	    $('#subt').append("<span id=\"\">"+this.tt.de_act_st_general+"</span>");
        
      }
      this.checkContextVidTranscr();
      this.refreshControls();
  }

  AblePlayer.prototype.handleAccessToggle = function() {
    
    if (this.hidingPopup || this.accessPopup.is(':visible')) {
      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it
      this.hidingPopup = false;
      this.accessPopup.find('li').removeClass('able-focus').attr('tabindex','0');
      this.$accMenu.focus();
      $('.able-button-handler-accmenu').focus();
      this.closePopups();
      return false;
    } else {
      this.closePopups();
      this.accessPopup.show();
      this.accessPopup.css('top', this.$accMenu.position().top - this.accessPopup.outerHeight());
      this.accessPopup.find('li').removeClass('able-focus');
      if(this){

      }
      if(this.getCookie()['preferences']['prefAccessMenu'] === 'false'){
        //this.accessPopup.find('input').first().focus().parent().removeClass('able-focus');
      } else {
        this.accessPopup.find('input').first().focus().parent().removeClass('able-focus');
      }
      if (this.accessPopup.find('input:checked')) {
        this.accessPopup.find('input:checked').focus().parent().addClass('able-focus');
      }
      else {
        this.accessPopup.find('input').first().focus().parent().addClass('able-focus');
        
      }

    }
    

  }

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

    //Orange take car about new interface
    if(this.captionsOn === true){
    //   $('#subt').attr('aria-checked','false');
    //   $('#subt').removeClass('aria-no-checked');
    //  //activate captions
    //  //thisObj.handleCaptionToggle();
    //   $('#subt').removeClass('subtno')
    //   $('#subt').text('');
    //   //$('#subt').append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\">");
    //   $('#subt').append("<i class=\"captions\"></i><span>"+this.tt.act_st+"</span><i class=\"captions\">");

    } else {
     

      // $('#subt').attr('aria-checked','true');
      // $('#subt').addClass('aria-no-checked');
      // $('#subt').text('');
      // $('#subt').addClass('subtno')
      // $('#subt').append("<i class=\"captions\"></i><span id=\"\">"+this.tt.de_act_st+"</span><i class=\"captions\">");
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
        
        this.captionsPopup.css('left', this.$ccButton.position().left);
        this.captionsPopup.css('left', this.$controllerDiv.width()-this.captionsPopup.width());
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
    if($('#audiodesc').attr('aria-checked') === 'false'){
      $('#audiodesc').attr('aria-checked','true');
      $('#audiodesc').attr('aria-label',this.tt.audiodescno);
      $('#audiodesc').addClass('aria-no-checked');
      $('#audiodesc').children('svg').children('line').css('display','none');
      $('#audiodesc').children('span').text(this.tt.audiodescno);
      $('#audiodesc').addClass('audiodescno')
    } else {
        $('#audiodesc').attr('aria-checked','false');
        $('#audiodesc').attr('aria-label',this.tt.audiodescact);
        $('#audiodesc').removeClass('aria-no-checked');
        $('#audiodesc').children('svg').children('line').css('display','block');
        $('#audiodesc').children('span').text(this.tt.audiodescact);
        $('#audiodesc').removeClass('audiodescno');
      
    }
    
    this.descOn = !this.descOn;
    this.prefDesc = + this.descOn; // convert boolean to integer
    this.updateCookie('prefDesc');
    this.refreshingDesc = true;
    this.initDescription();
    this.refreshControls();

  this.resizeAccessMenu();
  this.checkContextVidTranscr();	
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
      // restore each menu item to original hidden state
      this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
    }
    else {
      this.closePopups();
      this.prefsPopup.show();
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
    
    if (this.$transcriptDiv.is(':visible')) {
      this.$transcriptArea.hide();
      if(this.$transcriptButto != undefined){
        this.$transcriptButton.addClass('buttonOff').attr('aria-label',this.tt.showTranscript);
        this.$transcriptButton.find('span.able-clipped').text(this.tt.showTranscript);
      }
      this.prefTranscript = 0;
    }
    else {
      this.positionDraggableWindow('transcript');
      this.$transcriptArea.show();
      if(this.$transcriptButto != undefined){
        this.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.tt.hideTranscript);
        this.$transcriptButton.find('span.able-clipped').text(this.tt.hideTranscript);
      }
      this.prefTranscript = 1;
    }
    this.updateCookie('prefTranscript');
    //Add special Orange / modified in novembre 2020 : add checkContextVidTranscr
    this.checkContextVidTranscr();
    //from here, cookie is updated (so prefTranscript = 1 if transcript is just activated)
    /*
    if($('#transcr').attr('aria-checked') === 'false'){ //Now we activate transcription
      
      //update button transc in able toolbar
      $('#transcr').attr('aria-checked','true');
	    $('#transcr').attr('aria-label',this.tt.transcrno);
        $('#transcr').addClass('aria-no-checked');
        $('#transcr').children('svg').children('line').css('display','none');
        $('#transcr').children('span').text(this.tt.transcrno);
        if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
          
          // if(this.getCookie()['preferences']['prefVidSize'] != '66'){
          //   this.$ableDiv.css('width',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
          //   this.$transcriptArea.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
          //   this.$transcriptArea.css('left',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
          // } else {
          //   this.$ableDiv.css('width','33%');
          //   this.$transcriptArea.css('width','66%');
          //   this.$transcriptArea.css('left','33%');  
          // }

          //update transcript to show it on right off video
          this.$ableDiv.css('width',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
          this.$transcriptArea.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
          this.$transcriptArea.css('left',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
          var heightTranscriptArea = this.$mediaContainer.css('height').split("px")[0]-this.$transcriptToolbar.css('min-height').split("px")[0];
          this.$transcriptArea.css('height',heightTranscriptArea+'px');
          this.resizeAccessMenu();
          this.$transcriptArea.css('position','absolute');

          
          if(this.getCookie()['preferences']['prefSign'] === 1){
            //here, transcript and sign are shown, so let push transcript under video AND subtitles if present
            
              var takePadding = 0;
              if(parseInt(this.$signToolbar.css('padding').replace('px',''))){
                takePadding = parseInt(this.$signToolbar.css('padding').replace('px',''));
              }
              
              var topOfTranscriptArea = this.$mediaContainer.height();
              if(this.captionsOn === true || this.captionsPopup.is(':visible')){
                topOfTranscriptArea += this.$captionsWrapper.height();
              }
              this.$transcriptArea.css('top',topOfTranscriptArea+'px');
              this.$transcriptArea.css('left','0%');
              this.$transcriptArea.css('width',this.$ableWrapper.width()+'px');
              var topOfPlayerDiv = 0;
              
              var topOfPlayerDiv = this.$mediaContainer.height()+this.$transcriptArea.height()+this.$controllerDiv.height();
              if(this.captionsOn === true || this.captionsPopup.is(':visible')){
                topOfPlayerDiv += this.$captionsWrapper.height();//+this.$controllerDiv.height();
              }
              this.$playerDiv.css('top',topOfPlayerDiv+'px');
              this.$playerDiv.css('position','absolute');
              
              
              
              //this.$transcriptArea.css('top',(this.$signWindow.height()+this.$signToolbar.height()+takePadding)+'px');
              //this.$playerDiv.css('width',('width',this.$mediaContainer.width()+'px'));
              // $('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
              // $('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
          } else {
            this.$transcriptArea.css("top","0px");
            //$('.able-transcript-area').css("top","1px");
            //this.$playerDiv.css('width',this.$mediaContainer.width()+'px');
            // $('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
            // $('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
            
          }
          if(this.$transcriptArea[0].offsetWidth<500){
            this.$transcriptToolbar.css('min-height','28px');
          }
        }
        this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
        $('#transcr').addClass('transcrno');
        this.refreshControls();
    } else {//Now, deactivate transcription
      
      this.$playerDiv.css('position','');
      $('#transcr').attr('aria-checked','false');
	    $('#transcr').attr('aria-label',this.tt.transcract);
        $('#transcr').removeClass('aria-no-checked');
        $('#transcr').children('svg').children('line').css('display','block');
        if($('#transcr').children('span').text()!=this.tt.transcract){
          $('#transcr').children('span').text(this.tt.transcract);
        }
        $('#transcr').removeClass('transcrno');
        if(this.getCookie()['preferences']['prefAccessMenu'] === 'true' && this.getCookie()['preferences']['prefSign'] === 0){
          this.$ableDiv.css('width','100%');
          this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
          //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
          this.$transcriptArea.css('top','0 px');
        } else if(this.getCookie()['preferences']['prefAccessMenu'] === 'true' && this.getCookie()['preferences']['prefSign'] === 1){
          
          this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
          //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
        }
        this.refreshControls();
        this.resizeAccessMenu();
    }	
    */
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

    //Orange interface
    if($('#lsf').attr('aria-checked') == 'true'){
    
     $('#lsf').attr('aria-checked','false');
     $('#lsf').attr('aria-label',this.tt.lsfact);
     $('#lsf').removeClass('aria-no-checked');
     $('#lsf').children('span').text(this.tt.lsfact);
     if(this.$mediaContainer.find('video').find('source')[0].src.includes(this.$sources.first().attr('data-sign-src')) && this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
        if(this.getCookie()['preferences']['prefTranscript'] === 0){
          this.$ableDiv.css('width','100%');
          this.$playerDiv.css('width','100%');
          //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
        }  else {
          this.$playerDiv.css('width','100%');
          //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
          this.$transcriptArea.css('top','0px');
        }
        var svgVideoSrc = this.$signWindow.find('video').find('source')[0].src; 
        //put video sign in the second container
        this.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
        this.$mediaContainer.find('video')[0].load();
        //put video in the first containre
        this.$signWindow.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
        this.$signWindow.find('video')[0].load();
     }
     $('#lsf').removeClass('lsfno');
     $('#lsf').children('svg').children('line').css('display','block');
     
    } else {
      
      if(this.$mediaContainer.find('video').find('source')[0].src.includes(this.$sources.first().attr('data-sign-src')) === false && this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
        this.$ableDiv.css('width','33%');
        this.$signWindow.css('width','33%');
        this.$signWindow.css('width',thisObj.getCookie()['preferences']['prefVidSize']+'%');
        this.$signWindow.css('left','67%');
        this.$signWindow.css('position','absolute');
        this.$signWindow.css('top','0px');
        this.$signWindow.css('margin','0px');
         //put video sign in the first container
        var svgVideoSrc = this.$mediaContainer.find('video').find('source')[0].src; 
        this.$mediaContainer.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
        this.$mediaContainer.find('video')[0].load();
        this.$mediaContainer.css('background-color','lightgray');
        //put video in the second containre
        this.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
        this.$signWindow.find('video')[0].load();
        if(this.getCookie()['preferences']['prefTranscript'] === 1){
          var takePadding = 0;
          if(parseInt(this.$signToolbar.css('padding').replace('px',''))){
            takePadding = parseInt(this.$signToolbar.css('padding').replace('px',''));
          }
          this.$transcriptArea.css('top',(this.$signWindow.height()+this.$signToolbar.height()+takePadding)+'px');
        } else {
          this.$playerDiv.css('width',(this.$mediaContainer.width())+'px');
          //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
        }
      }

      
      $('#lsf').attr('aria-checked','true');
	    $('#lsf').attr('aria-label',this.tt.lsfno);
      $('#lsf').addClass('aria-no-checked');
      $('#lsf').children('span').text(this.tt.lsfno);
      $('#lsf').addClass('lsfno');
      $('#lsf').children('svg').children('line').css('display','none');
    
    }
    
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
        $('#acc-menu-id').css('display','none');
        
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
        
        if(thisObj.getCookie()['preferences']['prefModeUsage'] != 'profDef'){
          $('#acc-menu-id').css('display','initial');
        }
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

        //OrangeLab spec
        // $('.controller-orange-main').attr('style','display:block');
        // this.resizeAccessMenu();
    	  // $('.able-controller').attr('style','display:none');
	      // this.$bigPlayButton.width(this.$mediaContainer.width());
        // this.$bigPlayButton.height(this.$mediaContainer.height());
        // $('.able-player').attr('style','margin-top:0px');
        // if(this.getCookie()['preferences']['prefSign'] === 1 && this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
        //   this.$ableDiv.css('width','67%');
        //   this.$signWindow.css('width','33%');
        //   this.$signWindow.css('left','67%');
        //   this.$signWindow.css('position','absolute');
        //   this.$signWindow.css('top','0px');
        //   this.$signWindow.css('margin','0px');
        //   if(this.getCookie()['preferences']['prefTranscript'] === 1){
        //     var takePadding = 0;
        //     if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
        //       takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
        //     }
        //     this.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
        //     this.$transcriptArea .css('width','66%');
        //     this.$transcriptArea .css('left','33%');
        //   } else {
        //     this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
        //     //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
        //     //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
        //   }
        // } else if(this.getCookie()['preferences']['prefTranscript'] === 1 && this.getCookie()['preferences']['prefAccessMenu'] === 'true') {
        //     this.$transcriptArea.css('top','0px');
        //     this.$transcriptArea .css('width','66%');
        //     this.$transcriptArea .css('left','33%');
        //     this.$ableDiv.css('width','33%');
        // }

	//Check pref to toogle or not buttons USELESS since 06/10/2020
	// if(this.$sources.first().attr('data-sign-opt')){
	// 	if(thisObj.$playlist.eq(0).attr('class')!='able-current'){
	// 		this.$buttonVidcontr.removeClass('aria-no-checked')
	// 		this.$buttonVidcontr.attr('aria-checked','true')
	// 		this.$buttonVidcontr.addClass('vidcontrno')
	//  		this.$buttonVidcontr.text('');
	//  		this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	// 	} else {
	// 		this.$buttonVidcontr.addClass('aria-no-checked')
	// 		this.$buttonVidcontr.attr('aria-checked','false')
	// 		this.$buttonVidcontr.removeClass('vidcontrno')
	//  		this.$buttonVidcontr.text('');
	//  		this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	// 	}
	// } else {
	// 	this.$buttonVidcontr.prop("disabled",true);
	// }
	// if(this.$sources.first().attr('data-sign-src')){
	// 	if(this.getCookie()['preferences']['prefSign'] == 1){
	// 		this.$buttonLSF.removeClass('aria-no-checked')
	// 		this.$buttonLSF.attr('aria-checked','true')
	// 	} else {
	// 		this.$buttonLSF.addClass('aria-no-checked')
	// 		this.$buttonLSF.attr('aria-checked','false')
	// 		this.$buttonLSF.attr('aria-label',this.tt.lsfno)
	// 		this.$buttonLSF.text('');
	// 		this.$buttonLSF.addClass('lsfno')
	//  		this.$buttonLSF.append("<i class=\"captions\"></i><span class='spanButton' id=\"\">"+this.tt.lsfno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	// 	}
	// } else {
	// 	this.$buttonLSF.prop("disabled",true);
	// }
	// if(this.transcriptType){
	// 	if(this.getCookie()['preferences']['prefTranscript'] == 1){
	// 		this.$buttonTranscr.removeClass('aria-no-checked')
	// 		this.$buttonTranscr.attr('aria-checked','true')
	// 	} else {
	// 		this.$buttonTranscr.addClass('aria-no-checked')
	// 		this.$buttonTranscr.attr('aria-checked','false')
	// 		this.$buttonTranscr.attr('aria-label',this.tt.transcrno)
	// 		this.$buttonTranscr.text('');
	// 		this.$buttonTranscr.addClass('transcrno')
	//  		this.$buttonTranscr.append("<i class=\"captions\"></i><span class='spanButton' id=\"\">"+this.tt.transcrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	// 	}
	// } else {
	// 	this.$buttonTranscr.prop("disabled",true);
	// }
  // if(this.transcriptType){
	// 	if(this.getCookie()['preferences']['prefDesc'] == 1){
	// 		this.$buttonAudioDesc.removeClass('aria-no-checked')
	// 		this.$buttonAudioDesc.attr('aria-checked','true')
	// 	} else {
	// 		this.$buttonAudioDesc.addClass('aria-no-checked')
	// 		this.$buttonAudioDesc.attr('aria-checked','false')
	// 		this.$buttonAudioDesc.attr('aria-label',this.tt.audiodescno)
	// 		this.$buttonAudioDesc.text('');
	// 		this.$buttonAudioDesc.addClass('audiodescno')
	//  		this.$buttonAudioDesc.append("<i class=\"captions\"></i><span class='spanButton' id=\"\">"+this.tt.audiodescno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	// 	}
	// } else {
	// 	this.$buttonAudioDesc.prop("disabled",true);
  // }

  
  //07/08/2020 USELESS
	// if(this.$media.find('track[kind="captions"], track[kind="subtitles"]').length > 0){
	// 	if(this.getCookie()['preferences']['prefCaptions'] == 1){
      
  //     this.$buttonActivateSub.addClass('aria-no-checked')
	// 		this.$buttonActivateSub.attr('aria-pressed','true')
	// 		this.$buttonActivateSub.attr('aria-label',this.tt.de_act_st)
	//  		this.$buttonActivateSub.text('');
	// 		this.$buttonActivateSub.addClass('subtno')
	//  		this.$buttonActivateSub.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.de_act_st+"</span>");
	// 	} else {
			
	// 		this.$buttonActivateSub.removeClass('aria-no-checked')
	// 		this.$buttonActivateSub.attr('aria-pressed','false')
	// 		this.$buttonActivateSub.attr('aria-label',this.tt.act_st)
	// 	}
	// } else {
	// 	  this.$buttonActivateSub.prop("disabled",true);
	// }

      }
      // add event handlers for changes in full screen mode
      // currently most changes are made in response to windowResize event
      // However, that alone is not resulting in a properly restored player size in Opera Mac
      // More on the Opera Mac bug: https://github.com/ableplayer/ableplayer/issues/162
      // this fullscreen event handler added specifically for Opera Mac,
      // but includes event listeners for all browsers in case its functionality could be expanded
      // Added functionality in 2.3.45 for handling YouTube return from fullscreen as well
      $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function() {
        
        setTimeout(function(){
          if(thisObj.getCookie()['preferences']['prefModeUsage'] != 'profDef'){
            var wasShow = $('[class^="controller-orange"]').filter(":visible");
            if(wasShow.length > 1){
              thisObj.$controllerOrangeDiv.css('display','none');
            }
            //thisObj.$wasShow.attr('style','display:block');
          }
          //thisObj.checkContextVidTranscr();
          thisObj.resizeAccessMenu();
        }, 300);
        if (!thisObj.isFullscreen()) {
          // user has just exited full screen
          
          thisObj.restoringAfterFullScreen = true;
          thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
          var wasShow = $('[class^="controller-orange"]').filter(":visible");
          if(wasShow.length > 1){
            thisObj.$controllerOrangeDiv.css('display','none');
          }
          thisObj.checkContextVidTranscr();
          thisObj.resizePlayer();
          thisObj.resizeAccessMenu();
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
        });
        this.$vidcapContainer.css({
          'height': height + 'px',
          'width': width
        });
        this.$media.css({
          'height': height + 'px',
          'width': width
        });
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
        if(this.getCookie()['preferences']['prefModeUsage'] != 'profDef'){
          //TODO be carefull of no regression here
          //$('.controller-orange-main').attr('style','display:block');
          this.resizeAccessMenu();
        }
        
    	  //$('.able-controller').attr('style','display:none');
        this.$bigPlayButton.width(this.$mediaContainer.width());
        this.$bigPlayButton.height(this.$mediaContainer.height());
	//Check pref to toogle or not buttons USELESS since 06/10/2020
  // $('.able-player').attr('style','margin-top:0px');
	// if(this.$sources.first().attr('data-sign-opt')){
	// 	if(this.$playlist.eq(0).attr('class')!='able-current'){
	// 		this.$buttonVidcontr.attr('aria-checked','true')
	// 		this.$buttonVidcontr.removeClass('vidcontrno')
	//  		this.$buttonVidcontr.text('');
	//  		this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  //     this.$buttonVidcontr2.removeClass('aria-no-checked')
  //     this.$buttonVidcontr2.attr('aria-checked','true')
  //     this.$buttonVidcontr2.removeClass('vidcontrno')
  //     this.$buttonVidcontr2.text('');
  //     this.$buttonVidcontr2.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   
  //   } else {
	// 		this.$buttonVidcontr.attr('aria-checked','false')
	// 		this.$buttonVidcontr.addClass('vidcontrno')
	//  		this.$buttonVidcontr.text('');
	//  		this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  //     this.$buttonVidcontr2.attr('aria-checked','false')
  //     this.$buttonVidcontr2.addClass('vidcontrno')
  //     this.$buttonVidcontr2.text('');
  //     this.$buttonVidcontr2.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+this.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  //    }
	// } else {
		
	// 		this.$buttonVidcontr.prop("disabled",true);
		
		
	// }
	// if(this.$sources.first().attr('data-sign-src')){
	// 	if(this.getCookie()['preferences']['prefSign'] == 1){
	// 		this.$buttonLSF.removeClass('aria-no-checked')
	// 		this.$buttonLSF.attr('aria-checked','true')
	// 		this.$buttonLSF.attr('aria-label',this.tt.lsfact)
	// 	} else {
	// 		this.$buttonLSF.addClass('aria-no-checked')
	// 		this.$buttonLSF.attr('aria-checked','false')
	// 		this.$buttonLSF.attr('aria-label',this.tt.lsfno)
	// 		this.$buttonLSF.text('');
	// 		this.$buttonLSF.addClass('lsfno')
	//  		this.$buttonLSF.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.lsfno+"</span>");
	// 	}
	// } else {
	// 	this.$buttonLSF.prop("disabled",true);
	// }
	// if(this.transcriptType){
	// 	if(this.getCookie()['preferences']['prefTranscript'] == 1){
	// 		this.$buttonTranscr.removeClass('aria-no-checked')
	// 		this.$buttonTranscr.attr('aria-checked','true')
	// 		this.$buttonTranscr.attr('aria-label',this.tt.transcract)
	// 	} else {
	// 		this.$buttonTranscr.addClass('aria-no-checked')
	// 		this.$buttonTranscr.attr('aria-label',this.tt.transcrno)
	// 		this.$buttonTranscr.attr('aria-checked','false')
	// 		this.$buttonTranscr.text('');
  //     this.$buttonTranscr.addClass('transcrno')
	//  		this.$buttonTranscr.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.transcrno+"</span>");
	// 	}
	// } else {
	// 	this.$buttonTranscr.prop("disabled",true);
	// }
	// if(this.transcriptType){
	// 	if(this.getCookie()['preferences']['prefDesc'] == 1){
	// 		this.$buttonAudioDesc.removeClass('aria-no-checked')
	// 		this.$buttonAudioDesc.attr('aria-checked','true')
	// 		this.$buttonAudioDesc.attr('aria-label',this.tt.audiodescact)
  //     this.$buttonAudioDesc.children('svg').children('line').css('display','block');
	// 	} else {
	// 		this.$buttonAudioDesc.addClass('aria-no-checked')
	// 		this.$buttonAudioDesc.attr('aria-checked','false')
	// 		this.$buttonAudioDesc.attr('aria-label',this.tt.audiodescno)
	// 		this.$buttonAudioDesc.text('');
	// 		this.$buttonAudioDesc.addClass('audiodescno');
  //     this.$buttonAudioDesc.children('svg').children('line').css('display','none');
	//  		this.$buttonAudioDesc.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.audiodescno+"</span>");
	// 	}
	// } else {
	// 	this.$buttonAudioDesc.prop("disabled",true);
	// }
  
  //07/08/2020 USELESS
	// if(this.$media.find('track[kind="captions"], track[kind="subtitles"]').length > 0){
	// 	if(this.getCookie()['preferences']['prefCaptions'] == 1){
  //     this.$buttonActivateSub.addClass('aria-no-checked')
	// 		this.$buttonActivateSub.attr('aria-pressed','true')
	// 		this.$buttonActivateSub.attr('aria-label',this.tt.de_act_st)
	//  		this.$buttonActivateSub.text('');
	// 		this.$buttonActivateSub.addClass('subtno')
	//  		this.$buttonActivateSub.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.de_act_st+"</span>");
	// 	} else {
  //     this.$buttonActivateSub.removeClass('aria-no-checked')
  //     this.$buttonActivateSub.attr('aria-pressed','false')
  //     this.$buttonActivateSub.attr('aria-label',this.tt.act_st)
	// 	}
	// } else {
	// 	this.$buttonActivateSub.prop("disabled",true);
	// }
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
    this.resizeAccessMenu();
    this.checkContextVidTranscr();
  };

  AblePlayer.prototype.resizeAccessMenu = function() {
    //resize AccessibilityMenu button
    
    //
    //
    this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
    if(this.$captionsWrapper != undefined){
      this.$captionsWrapper.css('width',(this.$ableWrapper.width()-0.5)+'px');
    }
    this.$descDiv.css('width',(this.$ableWrapper.width()-0.5)+'px');

    var maxSpanSize = $($('.menuButton').find('span').get(0)).width();
    var maxButtonSize = $('.menuButton').get(0).offsetWidth ;
    //
    for (var i=0;i<$('.menuButton').length;i++){
      //
      //
      var widthOfEl = $($('.menuButton').find('span').get(i)).width();
      if(widthOfEl >= maxSpanSize && widthOfEl != 0){
        maxSpanSize = widthOfEl;
        //
      }
      if($('.menuButton').get(i).offsetWidth >= maxButtonSize){
        maxButtonSize = $('.menuButton').get(i).offsetWidth;
      } 
    }
    //if((100*maxSpanSize)/$('.menuButton').get(0).offsetWidth > 75 || maxSpanSize == 0){
    if((100*maxSpanSize)/maxButtonSize > 75 || maxSpanSize == 0){
      //
      var n = 0;
      if($($('.menuButton').get(n)).width() != undefined){
        while ($('.menuButton').get(n) != undefined && $($('.menuButton').get(n)).width() == 0 ) {
          n++;
        }
        if($('.menuButton').get(n) != undefined){
          //maxSpanSize = $('.menuButton').get(n).offsetWidth * 0.75;
          maxSpanSize = $($('.menuButton').get(n)).width() * 0.75;
        } 
      }
    } else {
      
      var n = 0;
      for (var n=0;n<$('.menuButton').find('span').length;n++){
        if($($('.menuButton').find('span').get(n)).width() != undefined){
          if($('.menuButton').find('span').get(n) != undefined && $('.menuButton').find('span').get(n) != 0 && $($('.menuButton').find('span').get(n)).width() > maxSpanSize ){
            maxSpanSize = $($('.menuButton').find('span').get(n)).width();
            
          }  
        }
      }
    }
    //
    //
    $('.menuButton').find('svg').css('margin-left',((maxButtonSize-maxSpanSize)/2)-30+'px');
    //$('.menuButton').find('svg').css('margin-left',(100-space/2)+"%");
    //$('.menuButton').find('span').css('width',maxSpanSize+'px');
    //$('.menuButton').find('span').css('display','flex');
    //$('.menuButton').find('i').css('margin-top','0.25em');
    $('.menuButton').find('i').css('margin-right',((maxButtonSize-maxSpanSize)/2)-30+'px');
    //$('.menuButton').find('i').css('margin-right',(100-space/2)+"%");
    if(maxButtonSize < 350){
      //$('.menuButton').find('i').css('display','none');
      //$('.menuButton').find('span').css('margin-left','-25%');
    } else {
      //$('.menuButton').find('i').css('display','inline-block');
      // $('.menuButton').find('span').css('margin-left','');
      // $('#spanPlay').css('margin-left','-25%');
      // $('#spanFull').css('margin-left','-25%');
    }
    if(maxButtonSize < 230){
      $('.menuButton').find('i').css('margin-right','0px');
      for(var i=0;i<=16;i++){
        if(i != 11 && i != 5){
          var item1 = $('.menuButton').find('span').get(i);
          item1.style.display='none';
          var item1 = $('.menuButton').find('svg').get(i);
          item1.style.float='none';
          //$('.menuButton').find('span').find(item1).css('display','none');
        }
        
      }
      $('#copy-rewind').find('span').css('display','none');
      $('#copy-forward').find('span').css('display','none');
    } else {
      for(var i=0;i<=16;i++){
        if(i != 11 && i != 5){
          var item1 = $('.menuButton').find('svg').get(i);
          item1.style.float='left';
          //$('.menuButton').find('span').find(item1).css('display','none');
        }
      }
      $('.menuButton').find('span').css('display','inline-block');
      $('#copy-rewind').find('span').css('display','inline-block');
      $('#copy-forward').find('span').css('display','inline-block');
    }
    
  }

  AblePlayer.prototype.checkContextVidTranscr = function() {
    
    
    //check the context and place windows into the context
    //check when captions and audiodesc are present too
    //context 1 : On a pas de vidéo signé ni de transcription ni de menu accessible : 100% largeur pour menu et la vidéo
    if(this.getCookie()['preferences']['prefSign'] == 0 && this.getCookie()['preferences']['prefTranscript'] == 0 && this.getCookie()['preferences']['prefAccessMenu'] == 'false'){
      
      //remove transcr
      this.$playerDiv.css('position','');
      $('#transcr').attr('aria-checked','false');
	    $('#transcr').attr('aria-label',this.tt.transcract);
      $('#transcr').removeClass('aria-no-checked');
      $('#transcr').children('svg').children('line').css('display','block');
      if($('#transcr').children('span').text()!=this.tt.transcract){
          $('#transcr').children('span').text(this.tt.transcract);
      }
      $('#transcr').removeClass('transcrno');
      if(this.isFullscreen()){
        
        this.$mediaContainer.find('video').css('width','100%');
        //this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height'));
        this.$mediaContainer.css('height',this.$vidcapContainer.css('height'));
        this.$mediaContainer.find('video').css('height',this.$vidcapContainer.css('height') );
      } else {
        
        this.$mediaContainer.find('video').css('width','100%');
        
        this.$mediaContainer.css('min-height',this.$mediaContainer.find('video').css('height'));
        this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height'));
      }
      
    }
    //contexte 2 : On a le menu de préférence et une seule vidéo
    if(this.getCookie()['preferences']['prefSign'] == 0 && this.getCookie()['preferences']['prefTranscript'] == 0 && this.getCookie()['preferences']['prefAccessMenu'] == 'true'){
      
      //remove transcr
      this.$playerDiv.css('position','');
      $('#transcr').attr('aria-checked','false');
	    $('#transcr').attr('aria-label',this.tt.transcract);
      $('#transcr').removeClass('aria-no-checked');
      $('#transcr').children('svg').children('line').css('display','block');
      if($('#transcr').children('span').text()!=this.tt.transcract){
          $('#transcr').children('span').text(this.tt.transcract);
      }
      $('#transcr').removeClass('transcrno');
      //remove LSF
      this.$ableDiv.css('width','100%');
      this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
      if(this.isFullscreen()){
        
        
        this.$mediaContainer.find('video').css('width','100%');
        //this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height'));
        this.$mediaContainer.css('height',this.$vidcapContainer.css('height'));
        this.$mediaContainer.find('video').css('height',this.$vidcapContainer.css('height') );
      } else {
        
        this.$mediaContainer.find('video').css('width','100%');
        
        this.$mediaContainer.css('min-height',this.$mediaContainer.find('video').css('height'));
        this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height'));
      }
    }
    //contexte 3 : On a la vidéo LSF et le menu accessible
    if(this.getCookie()['preferences']['prefSign'] == 1 && this.getCookie()['preferences']['prefTranscript'] == 0 && this.getCookie()['preferences']['prefAccessMenu'] == 'true'){
      
      //remove transcr and set LSF
      this.$playerDiv.css('position','');
      $('#transcr').attr('aria-checked','false');
	    $('#transcr').attr('aria-label',this.tt.transcract);
      $('#transcr').removeClass('aria-no-checked');
      $('#transcr').children('svg').children('line').css('display','block');
      if($('#transcr').children('span').text()!=this.tt.transcract){
          $('#transcr').children('span').text(this.tt.transcract);
      }
      $('#transcr').removeClass('transcrno');
      //set LSF
      this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');

      //add 04/10/2020
      
      this.positionDraggableWindow('sign',this.getDefaultWidth('sign'));
        //this.$ableDiv.css('width','67%');
        this.$ableDiv.css('width',(100-this.getCookie()['preferences']['prefVidSize'])+'%');
        //this.$signWindow.css('width','33%');
        this.$signWindow.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
        //this.$signWindow.css('left','66%');
        this.$signWindow.css('left',(100-this.getCookie()['preferences']['prefVidSize'])+'%');
        this.$signWindow.css('position','absolute');
        this.$signWindow.css('top','0px');
        this.$signWindow.css('margin','0px');
        // //put video sign in the first container
        // var svgVideoSrc = this.$mediaContainer.find('video').find('source')[0].src; 
        // this.$mediaContainer.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
        // this.$mediaContainer.find('video')[0].load();
        // //put video in the second containre
        // this.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
        // this.$signWindow.find('video')[0].load();
        // this.$signWindow.find('video')[0].muted = true;
        // this.$mediaContainer.find('video')[0].muted = true;

        this.$mediaContainer.css('background-color','lightgray');
        this.$buttonSoundMute.attr('aria-pressed','false');
        this.$buttonSoundMute.attr('aria-label',this.tt.mute);
        this.$buttonSoundMute.addClass('aria-no-checked');
        this.$buttonHideVol.text('');
	      this.$buttonHideVol.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(this.volume) / 10 * 100)+"%</span>");
        this.$buttonSoundMute.text('');
        this.$buttonSoundMute.addClass('vmuteno')
        this.$buttonSoundMute.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z'</path></svg><span style='margin-left:-25%'> "+this.tt.mute+"</span>");
   
        
        for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
          var vidId = document.getElementsByClassName("video-accessible")[q].id;
          document.getElementsByClassName("video-accessible")[q].addEventListener('loadeddata', function() {
            //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.backgroundColor = "black";
            
            
            document.getElementById(vidId+"-sign").addEventListener('ended',function(){
              document.getElementById(vidId+"-sign").load();
            });
          }, false);
        }
        
        
        if(this.isFullscreen()){//change to adapt to this specific condition
          
          //this.$mediaContainer.css('min-height',this.$mediaContainer.css('height'));

          this.$mediaContainer.css('height',this.$vidcapContainer.css('height'));
          this.$mediaContainer.find('video').css('height',this.$vidcapContainer.css('height') );
          
          this.$mediaContainer.find('video').css('width',100-this.getCookie()['preferences']['prefVidSize']+'%');
          //this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
          this.$mediaContainer.css('width','width',100-this.getCookie()['preferences']['prefVidSize']+'%');
          this.$mediaContainer.find('video').css('width',100-this.getCookie()['preferences']['prefVidSize']+'%');
          this.$signWindow.find('video').css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
          this.$signWindow.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
          this.$bigPlayButton.css('width','width',100-this.getCookie()['preferences']['prefVidSize']+'%');
          this.$signWindow.find('.able-resizable').css('display','none');
          this.$signWindow.find('.able-button-handler-preferences').css('display','none');
        } else {
          
          
          if(this.$mediaContainer.css('min-height').split('px')[0] > 0){
            
            this.$mediaContainer.css('height',this.$mediaContainer.css('min-height'));
            this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('min-height'));
            this.$signWindow.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
            this.$bigPlayButton.css('height',this.$mediaContainer.css('height'));
            this.$signWindow.find('.able-resizable').css('display','block');
            this.$signWindow.find('.able-button-handler-preferences').css('display','block');
          } 
          for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
            
            var vidId = document.getElementsByClassName("video-accessible")[q].id;
            document.getElementById(vidId).style.width = this.$mediaContainer.width()+"px";
            
            document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.backgroundColor = "black";
          }
          
          //this.$controllerDiv.css('display','block');
        }

      //this.refreshControls();
    }
    //contexte 4 : On a la transcription et le menu accessible
    if(this.getCookie()['preferences']['prefSign'] == 0 && this.getCookie()['preferences']['prefTranscript'] == 1 && this.getCookie()['preferences']['prefAccessMenu'] == 'true'){
      
      //update transcript button to be activated
      $('#transcr').attr('aria-checked','true');
	    $('#transcr').attr('aria-label',this.tt.transcrno);
      $('#transcr').addClass('aria-no-checked');
      $('#transcr').children('svg').children('line').css('display','none');
      $('#transcr').children('span').text(this.tt.transcrno);
      $('#transcr').addClass('transcrno');
      //update transcript to show it on right off video if vertical
      if(this.getCookie()['preferences']['prefTranscriptOrientation'] == 'vertical'){
        this.$transcriptArea.find('.able-resizable').css('display','block');
        this.$ableDiv.css('width',100-parseInt(this.getCookie()['preferences']['prefTrSize'])+'%');
        this.$transcriptArea.css('width',this.getCookie()['preferences']['prefTrSize']+'%');
        this.$transcriptArea.css('left',100-parseInt(this.getCookie()['preferences']['prefTrSize'])+'%');
        var heightTranscriptArea = this.$mediaContainer.css('height').split("px")[0]-this.$transcriptToolbar.css('min-height').split("px")[0];
        //this.$transcriptArea.css('height',heightTranscriptArea+'px');
        this.resizeAccessMenu();
        this.$transcriptArea.css('position','absolute');
        this.$transcriptArea.css('top','0px');
        if(this.$transcriptArea[0].offsetWidth<500){
          this.$transcriptToolbar.css('min-height','28px');
        }
        this.$transcriptArea.css('height',(heightTranscriptArea + parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+'px'));
        this.$transcriptDiv.css('height',heightTranscriptArea+'px');
        this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
        this.$playerDiv.css('top','0px');
        this.$playerDiv.css('position','');
        if(this.captionsOn === true || isCaptionVisible){
          this.$captionsWrapper.css('bottom','');
        }

        //if fullscreen and transcript is vertical
        if(this.isFullscreen()){
          
          
          //this.$mediaContainer.css('min-height',this.$mediaContainer.css('height'));
          this.$mediaContainer.css('height',this.$vidcapContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
          this.$mediaContainer.css('width','width',100-this.getCookie()['preferences']['prefTrSize']+'%');
          this.$mediaContainer.find('video').css('width',100-this.getCookie()['preferences']['prefTrSize']+'%');
          this.$mediaContainer.find('video').css('height',this.$vidcapContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");
          this.$transcriptDiv.css('height',this.$vidcapContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");
          this.$transcriptArea.css('height',this.$vidcapContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
          this.$transcriptArea.css('width',this.getCookie()['preferences']['prefTrSize']+'%');
          this.$transcriptArea.css('left',100-this.getCookie()['preferences']['prefTrSize']+'%');
          //this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
          this.$transcriptArea.find('.able-resizable').css('display','none');
          this.$transcriptArea.find('.able-button-handler-preferences').css('display','none');
          this.$bigPlayButton.css('width','width',this.getCookie()['preferences']['prefTrSize']+'%');
          this.$bigPlayButton.css('height',this.$vidcapContainer.css('height').split('px')[0]+"px");
          
          
          
        } else {
          if(this.$mediaContainer.css('min-height').split('px')[0] > 0){
            this.$mediaContainer.css('height',this.$mediaContainer.css('min-height'));
            this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('min-height'));
            this.$transcriptArea.css('height',this.$mediaContainer.css('min-height'));
            this.$transcriptDiv.css('height',this.$mediaContainer.css('min-height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+'px');
            this.$transcriptArea.find('.able-resizable').css('display','block');
            this.$transcriptArea.find('.able-button-handler-preferences').css('display','block');
          }
          for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
            
            var vidId = document.getElementsByClassName("video-accessible")[q].id;
            document.getElementById(vidId).style.width = this.$mediaContainer.width()+"px";
            
            document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.backgroundColor = "black";
          }
          // //this.$transcriptArea.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
          // this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]);
          // this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('height'));
          // this.$bigPlayButton.css('height',this.$mediaContainer.css('height'));
          //this.$mediaContainer.css('height','auto');
          //this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
          
          
        }


      } else {//horizontal
        
              
              var initTRheight = this.$transcriptArea.height();
              var initTRheightDiv = this.$transcriptDiv.height();
              var takePadding = 0;
              if(parseInt(this.$signToolbar.css('padding').replace('px',''))){
                takePadding = parseInt(this.$signToolbar.css('padding').replace('px',''));
              }
              var topOfTranscriptArea = this.$mediaContainer.height();
              var isCaptionVisible = false;
              if(this.captionsPopup != undefined){
                isCaptionVisible = this.captionsPopup.is(':visible');
              }
              if(this.captionsOn === true || isCaptionVisible){
                topOfTranscriptArea += this.$captionsWrapper.height();
              }
              
              if(this.descOn === true && this.$descDiv.is(':visible')){
                
                //topOfTranscriptArea += parseFloat(this.$descDiv.css('height').split('px')[0]);
              } 
              this.$transcriptArea.find('.able-resizable').css('display','none');
              this.$transcriptArea.css('top',topOfTranscriptArea+'px');
              this.$transcriptArea.css('left','0%');
              this.$transcriptArea.css('width',this.$ableWrapper.width()+'px');
              if(this.$transcriptArea[0].offsetWidth<500){
                this.$transcriptToolbar.css('min-height','28px');
              }
              
              this.$transcriptArea.css('height',(parseInt(this.$playerDiv.css('top').split('px')[0]) + parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.$mediaContainer.height()))+'px');
              this.$transcriptDiv.css('height',(parseInt(this.$playerDiv.css('top').split('px')[0]) - parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.$mediaContainer.height()))+'px');
              
              if(this.$playerDiv.css('top').split('px')[0] == 0 || this.$playerDiv.css('top').split('px')[0] == 'auto'){
                this.$transcriptArea.css('height', parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) + parseInt(this.$mediaContainer.height())+'px');
                this.$transcriptDiv.css('height',(parseInt(this.$mediaContainer.height()) - parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) )+'px');
              }
              var topOfPlayerDiv = 0;
              this.$transcriptArea.height(initTRheight);
              this.$transcriptDiv.height(initTRheightDiv);
              var topOfPlayerDiv = this.$mediaContainer.height()+this.$transcriptArea.height();//+this.$controllerDiv.height();
              
              
              if(this.captionsOn === true || isCaptionVisible){
                
                this.$captionsWrapper.css('bottom','');
                topOfPlayerDiv += this.$captionsWrapper.height();//+this.$controllerDiv.height();
              }
              if(this.descOn === true && this.$descDiv.is(':visible')){
                this.$descDiv.css('bottom','');
                this.$captionsWrapper.css('bottom','');
                
                topOfPlayerDiv += this.$descDiv.css('height').split('px')[0];
                
              }
              this.$ableDiv.css('width','100%');
              this.$playerDiv.css('top',topOfPlayerDiv+'px');
              this.$playerDiv.css('position','absolute');
              this.$playerDiv.css('width',this.$ableWrapper.width()+'px');

              if(this.isFullscreen()){//Horizontal and fullscreen
                 //On va diviser par 2 la hauteur et les afficher l'un en dessous de l'autre
                
                
                this.$mediaContainer.css('height',(this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0])/2+"px");
                this.$mediaContainer.find('video').css('height',(this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0])/2+"px");
                if(this.$mediaContainer.height()<(this.$vidcapContainer.height()/2)){
                  
                  this.$mediaContainer.css('height',this.$vidcapContainer.height()/2);
                  this.$mediaContainer.find('video').css('height',this.$vidcapContainer.height()/2);
                }
                if(this.captionsOn === true || isCaptionVisible){
                  
                  // if(this.descOn === true && this.$descDiv.is(':visible')){
                  //   
                  //   this.$transcriptDiv.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                  //   this.$transcriptArea.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                  //   this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                  //   this.$captionsWrapper.css('bottom',this.$controllerDiv.css('min-height'));
                  //   this.$descDiv.css('padding','0');
                  // } else {
                    
                    this.$transcriptDiv.css('height',this.$vidcapContainer.height()/2-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    this.$transcriptArea.css('height',this.$vidcapContainer.height()/2-this.$captionsWrapper.css('height').split('px')[0]+"px");
                  //}
                } else {
                  
                  // if(this.descOn === true && this.$descDiv.is(':visible')){
                  //   
                  //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$controllerDiv.height()+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                  //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$controllerDiv.height()+"px");
                  //   this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                  //   this.$descDiv.css('padding','0');
                  // } else {
                    
                    this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]));//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]);
                  //}
                }
                  this.$transcriptArea.css('top',this.$mediaContainer.css('height'));
                  
                  this.$playerDiv.css('top','');
                  //this.$transcriptArea.css('width',this.getCookie()['preferences']['prefTrSize']+'%');
                  //this.$transcriptArea.css('left',100-this.getCookie()['preferences']['prefTrSize']+'%');
                  this.$transcriptArea.find('.able-resizable').css('display','none');
                  this.$transcriptArea.find('.able-button-handler-preferences').css('display','none');
                  this.$bigPlayButton.css('height',this.$mediaContainer.css('height'));
              } else {
                if(this.$mediaContainer.css('min-height').split('px')[0] > 0){
                  this.$mediaContainer.css('height',this.$mediaContainer.css('min-height'));
                  this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('min-height'));
                  //var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0])+parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                  //this.$transcriptArea.css('top',topTrArea+'px');

                  if(this.captionsOn === true || isCaptionVisible){
                    // if(this.descOn === true && this.$descDiv.is(':visible')){
                    //   
                    //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                    //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                    //   topTrArea += parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                    //   this.$transcriptArea.css('top',topTrArea+'px');
                    //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]+"px");
                    // } else {
                      
                      var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0])+parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                      this.$transcriptArea.css('top',topTrArea+'px');
                      this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                      this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                    //}
                  } else {
                    // if(this.descOn === true && this.$descDiv.is(':visible')){
                    //   
                    //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                    //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                    //   this.$transcriptArea.css('top',topTrArea+'px');
                    //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                      
                    // } else {
                      
                      var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                      this.$transcriptArea.css('top',topTrArea+'px');
                      this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                      this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                    //}
                  }
                  
                  var topOfPlayerDiv = 0;
              
                  var topOfPlayerDiv = this.$mediaContainer.height()+this.$transcriptArea.height();//+this.$controllerDiv.height();
                  if(this.captionsOn === true || isCaptionVisible){
                    topOfPlayerDiv += this.$captionsWrapper.height();//+this.$controllerDiv.height();
                  }
                  if(this.descOn === true && this.$descDiv.is(':visible')){
                    
                    //topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
                  }
                  this.$ableDiv.css('width','100%');
                  this.$playerDiv.css('top',topOfPlayerDiv+'px');
                  this.$playerDiv.css('position','absolute');
                  this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
                  
                  
                  this.$transcriptArea.find('.able-resizable').css('display','none');
                  this.$transcriptArea.find('.able-button-handler-preferences').css('display','block');
                } else {
                  
                  var topOfPlayerDiv = 0;
              
                  var topOfPlayerDiv = this.$mediaContainer.height()+this.$transcriptArea.height();//+this.$controllerDiv.height();
                  if(this.captionsOn === true || isCaptionVisible){
                    topOfPlayerDiv += this.$captionsWrapper.height();//+this.$controllerDiv.height();
                  }
                  if(this.descOn === true && this.$descDiv.is(':visible')){
                    
                    //topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
                  }
                  this.$ableDiv.css('width','100%');
                  this.$playerDiv.css('top',topOfPlayerDiv+'px');
                  this.$playerDiv.css('position','absolute');
                  this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
                  
                  this.$transcriptArea.find('.able-resizable').css('display','none');
                  this.$transcriptArea.find('.able-button-handler-preferences').css('display','block');
                }
              }
      }
      
      
      //this.refreshControls();

    }
    //contexte 5 : On a tout
    if(this.getCookie()['preferences']['prefSign'] == 1 && this.getCookie()['preferences']['prefTranscript'] == 1 && this.getCookie()['preferences']['prefAccessMenu'] == 'true'){
      
      
      var initTRheight = this.$transcriptArea.height();
      var initTRheightDiv = this.$transcriptDiv.height();
      //update transcript button to be activated
      //update button transc in able toolbar
      $('#transcr').attr('aria-checked','true');
	    $('#transcr').attr('aria-label',this.tt.transcrno);
      $('#transcr').addClass('aria-no-checked');
      $('#transcr').children('svg').children('line').css('display','none');
      $('#transcr').children('span').text(this.tt.transcrno);
      $('#transcr').addClass('transcrno');
      this.$transcriptArea.find('.able-resizable').css('display','none');
      //update transcript to be under videos
              var takePadding = 0;
              if(parseInt(this.$signToolbar.css('padding').replace('px',''))){
                takePadding = parseInt(this.$signToolbar.css('padding').replace('px',''));
              }
              
              
              var topOfTranscriptArea = this.$mediaContainer.height();
              var isCaptionVisible = false;
              if(this.captionsPopup != undefined){
                isCaptionVisible = this.captionsPopup.is(':visible');
              }
              if(this.descOn === true && this.$descDiv.is(':visible')){
                
                //topOfTranscriptArea += this.$captionsWrapper.height();
              } 
              
              
              if(this.captionsOn === true || isCaptionVisible){
                
                
                
                topOfTranscriptArea += this.$captionsWrapper.height();
              }
              this.$transcriptArea.css('top',topOfTranscriptArea+'px');
              this.$transcriptArea.css('left','0%');
              this.$transcriptArea.css('width',this.$ableWrapper.width()+'px');
              if(this.$transcriptArea[0].offsetWidth<500){
                this.$transcriptToolbar.css('min-height','28px');
              }
              this.$transcriptArea.css('height',(parseInt(this.$playerDiv.css('top').split('px')[0]) + parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.$mediaContainer.height()))+'px');
              this.$transcriptDiv.css('height',(parseInt(this.$playerDiv.css('top').split('px')[0]) - parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.$mediaContainer.height()))+'px');
              
              if(this.$playerDiv.css('top').split('px')[0] == 0 || this.$playerDiv.css('top').split('px')[0] == 'auto'){
                this.$transcriptArea.css('height', parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) + parseInt(this.$mediaContainer.height())+'px');
                this.$transcriptDiv.css('height',(parseInt(this.$mediaContainer.height()) - parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]) )+'px');
              }
              var topOfPlayerDiv = 0;
              
              this.$transcriptArea.height(initTRheight);
              this.$transcriptDiv.height(initTRheightDiv);
              var topOfPlayerDiv = this.$mediaContainer.height()+this.$transcriptArea.height();//+this.$controllerDiv.height();
              
              //
              if(this.captionsOn === true || isCaptionVisible){
                
                this.$captionsWrapper.css('bottom','');
                topOfPlayerDiv += this.$captionsWrapper.height();//+this.$controllerDiv.height();
              }
              // if(this.descOn === true && this.$descDiv.is(':visible')){
              //   this.$descDiv.css('bottom','');
              //   this.$captionsWrapper.css('bottom','');
              //   
              //   topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
              // }
              this.$playerDiv.css('top',topOfPlayerDiv+'px');
              this.$playerDiv.css('position','absolute');
              this.$playerDiv.css('width',this.$ableWrapper.width()+'px');

              if(this.isFullscreen()){//fullscreen, 
                 //On va diviser par 2 la hauteur et les afficher l'un en dessous de l'autre
                
                //this.$mediaContainer.css('min-height',this.$mediaContainer.css('height'));
                this.$mediaContainer.css('height',(this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0])/2+"px");
                this.$mediaContainer.find('video').css('height',(this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0])/2+"px");
                
                if(this.$mediaContainer.height()<(this.$vidcapContainer.height()/2)){
                  
                  this.$mediaContainer.css('height',this.$vidcapContainer.height()/2);
                  this.$mediaContainer.find('video').css('height',this.$vidcapContainer.height()/2);
                }
                
                this.$mediaContainer.css('width','width',100-this.getCookie()['preferences']['prefTrSize']+'%');
                this.$mediaContainer.find('video').css('width',100-this.getCookie()['preferences']['prefTrSize']+'%');
                
                this.$signWindow.find('video').css('height',(this.$mediaContainer.css('height').split('px')[0])+"px");
                this.$signWindow.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
                if(this.captionsOn === true || isCaptionVisible){
                  // this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                  // this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                  // if(this.descOn === true && this.$descDiv.is(':visible')){
                  //   
                  //   this.$transcriptDiv.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                  //   this.$transcriptArea.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]+"px");
                  //   this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                  //   this.$captionsWrapper.css('bottom',this.$controllerDiv.css('min-height'));
                  //   this.$descDiv.css('padding','0');
                  //   
                  // } else {
                    
                    this.$transcriptDiv.css('height',this.$vidcapContainer.height()/2-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    this.$transcriptArea.css('height',this.$vidcapContainer.height()/2-this.$captionsWrapper.css('height').split('px')[0]+"px");
                  //}
                } else {
                  // 
                  // this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//
                  // this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                  if(this.descOn === true && this.$descDiv.is(':visible')){
                    
                    this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$controllerDiv.height()+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$controllerDiv.height()+"px");
                    this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                    this.$descDiv.css('padding','0');
                  } else {
                    
                    // this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    // this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                    this.$transcriptDiv.css('height',(this.$vidcapContainer.css('height').split('px')[0]/2)-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    this.$transcriptArea.css('height',(this.$mediaContainer.css('height').split('px')[0]/2)+"px");
                  }
                }
                this.$transcriptArea.css('top',this.$mediaContainer.css('height'));
                //this.$transcriptArea.css('width',this.getCookie()['preferences']['prefTrSize']+'%');
                //this.$transcriptArea.css('left',100-this.getCookie()['preferences']['prefTrSize']+'%');
                this.$playerDiv.css('top','');

                this.$transcriptArea.find('.able-resizable').css('display','none');
                this.$transcriptArea.find('.able-button-handler-preferences').css('display','none');
                this.$signWindow.find('.able-resizable').css('display','none');
                this.$signWindow.find('.able-button-handler-preferences').css('display','none');
                this.$bigPlayButton.css('height',this.$mediaContainer.find('video').css('height'));
              } else {
                if(this.$mediaContainer.css('min-height').split('px')[0] > 0){
                  this.$mediaContainer.css('height',this.$mediaContainer.css('min-height'));
                  this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('min-height'));
                  this.$mediaContainer.find('video').css('width',100-this.getCookie()['preferences']['prefTrSize']+'%');
                  if(this.captionsOn === true || isCaptionVisible){
                  //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0])+parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                  //   this.$transcriptArea.css('top',topTrArea+'px');
                  //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                  //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                  // } else {
                  //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                  //   this.$transcriptArea.css('top',topTrArea+'px');
                  //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                  //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                  // }
                    // if(this.descOn === true && this.$descDiv.is(':visible')){
                    //   
                    //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                    //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                    //   topTrArea += parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                    //   this.$transcriptArea.css('top',topTrArea+'px');
                    //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]+"px");
                    // } else {
                      var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0])+parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                      this.$transcriptArea.css('top',topTrArea+'px');
                      this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                      this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                    //}
                  } else {
                    // if(this.descOn === true && this.$descDiv.is(':visible')){
                    //   
                    //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                    //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                    //   this.$transcriptArea.css('top',topTrArea+'px');
                    //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                      
                    // } else {
                      
                      var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                      this.$transcriptArea.css('top',topTrArea+'px');
                      this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                      this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                    //}
                  }
                  
                  
                  var topOfPlayerDiv = 0;
              
                  var topOfPlayerDiv = this.$mediaContainer.height()+this.$transcriptArea.height();//+this.$controllerDiv.height();
                  
                  if(this.captionsOn === true || isCaptionVisible){
                    topOfPlayerDiv += this.$captionsWrapper.height();//+this.$controllerDiv.height();
                  }
                  
                  if(this.descOn === true && this.$descDiv.is(':visible')){
                     //topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
                  }
                  
                  //this.$ableDiv.css('width','100%');
                  this.$playerDiv.css('top',topOfPlayerDiv+'px');
                  //this.$playerDiv.css('position','absolute');
                  //this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
                  
                  this.$transcriptArea.find('.able-resizable').css('display','none');
                  this.$transcriptArea.find('.able-button-handler-preferences').css('display','block');
                  this.$signWindow.find('.able-resizable').css('display','block');
                  this.$signWindow.find('.able-button-handler-preferences').css('display','block');
                  this.$bigPlayButton.css('height',this.$mediaContainer.find('video').css('height'));
                  this.$bigPlayButton.css('width',this.$mediaContainer.find('video').css('width'));
                }
              }

    
      //this.refreshControls();
              

    }
    //quelque soit le ocntexte, on vérifie la taille de la vidéo
    if(!this.isFullscreen()){
      for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
        
        var vidId = document.getElementsByClassName("video-accessible")[q].id;
        document.getElementById(vidId).style.width = this.$mediaContainer.width()+"px";
        
        document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
        document.getElementById(vidId+"-sign").style.backgroundColor = "black"; 
        
        
      }
    }
    this.$bigPlayButton.css('height',this.$mediaContainer.find('video').css('height'));
    this.$bigPlayButton.css('width',this.$mediaContainer.find('video').css('width'));
    
  }

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
    
    

    if (transcriptZ === signZ && transcriptZ<9500) {
      // the two windows are equal; move the target window the top
      newHighZ = transcriptZ + 1000;
      newLowZ = transcriptZ;
    }
    else if (transcriptZ > signZ && transcriptZ<9500) {
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
      //this.$transcriptArea.css('z-index',newHighZ);
      this.$transcriptArea.css('z-index','0');
      this.$signWindow.css('z-index',newLowZ);
    }
    else if (which === 'sign') {
      this.$signWindow.css('z-index',newHighZ);
      this.$transcriptArea.css('z-index','0');
      //this.$transcriptArea.css('z-index',newLowZ);
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

  AblePlayer.prototype.handleChangeProfil = function(profil) {
    
    $('.able-button-handler-accmenu').focus();
    if(profil == 'vplus'){
      if(this.prefAccessMenu == 'false'){
        this.prefAccessMenu = "true";
        $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
        this.updateCookie('prefAccessMenu');
        $('#acc-menu-id').click();
      }
      $('#visionPlus').click();
      $('#accmenu-0').closest('li').addClass("able-focus");
      $('#accmenu-1').closest('li').removeClass("able-focus");
      $('#accmenu-2').closest('li').removeClass("able-focus");
      $('#accmenu-3').closest('li').removeClass("able-focus");
      $('#accmenu-4').closest('li').removeClass("able-focus");
      $('#accmenu-5').closest('li').removeClass("able-focus");
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-0').prop('checked',true);
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-4').prop('checked',false);
      $('#accmenu-5').prop('checked',false);
    }
    else if(profil == 'audplus'){
      if(this.prefAccessMenu == 'false'){
        this.prefAccessMenu = "true";
        $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
        this.updateCookie('prefAccessMenu');
        $('#acc-menu-id').click();
      }
      $('#auditionPlus').click();
      $('#accmenu-0').closest('li').removeClass("able-focus");
      $('#accmenu-1').closest('li').removeClass("able-focus");
      $('#accmenu-2').closest('li').removeClass("able-focus");
      $('#accmenu-3').closest('li').removeClass("able-focus");
      $('#accmenu-4').closest('li').addClass("able-focus");
      $('#accmenu-5').closest('li').addClass("able-focus");
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-0').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-5').prop('checked',false);
      $('#accmenu-4').prop('checked',true);
    }
    else if(profil == 'svplus'){
      if(this.prefAccessMenu == 'false'){
        this.prefAccessMenu = "true";
        $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
        this.updateCookie('prefAccessMenu');
        $('#acc-menu-id').click();
      }
      $('#sansVisionPlus').click();
      $('#accmenu-0').closest('li').removeClass("able-focus");
      $('#accmenu-1').closest('li').addClass("able-focus");
      $('#accmenu-2').closest('li').removeClass("able-focus");
      $('#accmenu-3').closest('li').removeClass("able-focus");
      $('#accmenu-4').closest('li').removeClass("able-focus");
      $('#accmenu-5').closest('li').removeClass("able-focus");
      $('#accmenu-1').prop('checked',true);
      $('#accmenu-0').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-4').prop('checked',false);
      $('#accmenu-5').prop('checked',false);
    }
    else if(profil == 'lsfplus'){
      if(this.prefAccessMenu == 'false'){
        this.prefAccessMenu = "true";
        $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
        this.updateCookie('prefAccessMenu');
        $('#acc-menu-id').click();
      }
      $('#lsfPlus').click();
      $('#accmenu-0').closest('li').removeClass("able-focus");
      $('#accmenu-1').closest('li').removeClass("able-focus");
      $('#accmenu-2').closest('li').addClass("able-focus");
      $('#accmenu-3').closest('li').removeClass("able-focus");
      $('#accmenu-4').closest('li').removeClass("able-focus");
      $('#accmenu-5').closest('li').removeClass("able-focus");
      $('#accmenu-2').prop('checked',true);
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-0').prop('checked',false);
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-4').prop('checked',false);
      $('#accmenu-5').prop('checked',false);
    }
    else if(profil == 'conplus'){
      if(this.prefAccessMenu == 'false'){
        this.prefAccessMenu = "true";
        $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
        this.updateCookie('prefAccessMenu');
        $('#acc-menu-id').click();
      }
      $('#conPlus').click();
      $('#accmenu-0').closest('li').removeClass("able-focus");
      $('#accmenu-1').closest('li').removeClass("able-focus");
      $('#accmenu-2').closest('li').removeClass("able-focus");
      $('#accmenu-3').closest('li').addClass("able-focus");
      $('#accmenu-4').closest('li').removeClass("able-focus");
      $('#accmenu-5').closest('li').removeClass("able-focus");
      $('#accmenu-3').prop('checked',true);
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-0').prop('checked',false);
      $('#accmenu-4').prop('checked',false);
      $('#accmenu-5').prop('checked',false);
    }
    else if(profil == 'profdef'){
      // if(this.prefAccessMenu == 'false'){
      //   this.prefAccessMenu = "true";
      //   $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
      //   this.updateCookie('prefAccessMenu');
      //   $('#acc-menu-id').click();
      // }
      $('#profDef').click();
      $('#accmenu-0').closest('li').removeClass("able-focus");
      $('#accmenu-1').closest('li').removeClass("able-focus");
      $('#accmenu-2').closest('li').removeClass("able-focus");
      $('#accmenu-3').closest('li').removeClass("able-focus");
      $('#accmenu-4').closest('li').removeClass("able-focus");
      $('#accmenu-5').closest('li').addClass("able-focus");
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-0').prop('checked',false);
      $('#accmenu-4').prop('checked',false);
      $('#accmenu-5').prop('checked',true);
    } 
    else {
      this.prefAccessMenu = "false";
      $('#' + this.mediaId + '_' + 'prefAccessMenu').val('false');
      this.updateCookie('prefAccessMenu');
      $('#acc-menu-id').click();
      $('#accmenu-3').prop('checked',false);
      $('#accmenu-1').prop('checked',false);
      $('#accmenu-2').prop('checked',false);
      $('#accmenu-0').prop('checked',false);
      $('#accmenu-4').prop('checked',false);
      $('#accmenu-5').prop('checked',true);
      $('#accmenu-5').closest('li').addClass("able-focus");
    }
    this.checkContextVidTranscr();
  }

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

  AblePlayer.prototype.setCaptionsOn = function (state,lang) {
    var thisObj = this;
    if(state == true){
      var captions;
            if (thisObj.captions.length) {
              captions = thisObj.captions;
            }
            else if (thisObj.ytCaptions.length) {
              captions = thisObj.ytCaptions;
            }
            else {
              captions = [];
            }
            thisObj.captionsOn = true;
            thisObj.prefCaptions = 1;
            thisObj.updateCookie('prefCaptions');
            if (thisObj.usingYouTubeCaptions) {
              if (typeof thisObj.ytCaptionModule !== 'undefined') {
                thisObj.youTubePlayer.loadModule(thisObj.ytCaptionModule);
              }
            }
            else {
              thisObj.$captionsWrapper.show();
            }
            for (var i=0; i<captions.length; i++) {
              if (captions[i].def === true || captions[i].language == lang) { // this is the default language
                thisObj.selectedCaptions = captions[i];
              }
            }
            //thisObj.selectedCaptions = thisObj.captions[0];
            if (thisObj.descriptions.length >= 0) {
              thisObj.selectedDescriptions = thisObj.descriptions[0];
            }

    } else {
            for(var q=0;q<$(thisObj.captionsPopup.find('input')).length;q++){
              if($($(thisObj.captionsPopup.find('input'))[q]).attr('lang') == undefined){
                $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", true);
              } 
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
  }

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
      
      
      //thisObj.captionsOn = true;
      
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

      // // save preference to cookie
      // thisObj.prefCaptions = 1;
      // thisObj.updateCookie('prefCaptions');

      // for(var q=0;q<$(thisObj.captionsPopup.find('input')).length;q++){
      //   if($($(thisObj.captionsPopup.find('input'))[q]).attr('lang') == thisObj.captionLang){
      //     //
      //     $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", true);
      //   } else {
      //     $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", false);
      //   }
      // }

       //Orange synch with able buttons
       
       if (thisObj.captionLang === 'en') {
        if(thisObj.$buttonSubEN.attr('aria-pressed') == 'true'){
          thisObj.setCaptionsOn(false,thisObj.captionLang);
          thisObj.$buttonSubEN.attr('aria-checked','false');
          thisObj.$buttonSubEN.attr('aria-pressed','false');
          thisObj.$buttonSubEN.removeClass('aria-no-checked');
          thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);
          thisObj.$buttonSubEN.removeClass('subtno');
        } else {
          thisObj.setCaptionsOn(true,thisObj.captionLang);
          thisObj.$buttonSubEN.attr('aria-checked','true');
          thisObj.$buttonSubEN.attr('aria-pressed','true');
          thisObj.$buttonSubEN.addClass('aria-no-checked');
          thisObj.$buttonSubEN.text(thisObj.tt.de_act_st_en);
          thisObj.$buttonSubEN.addClass('subtno');
        }
        

        thisObj.$buttonSubFR.attr('aria-checked','false');
        thisObj.$buttonSubFR.attr('aria-pressed','false');
        thisObj.$buttonSubFR.removeClass('aria-no-checked');
        thisObj.$buttonSubFR.removeClass('subtno');
        thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

        thisObj.$buttonSubML.attr('aria-checked','false');
        thisObj.$buttonSubML.attr('aria-pressed','false');
        thisObj.$buttonSubML.removeClass('aria-no-checked');
        thisObj.$buttonSubML.removeClass('subtno');
        thisObj.$buttonSubML.text('');
        //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
        thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
          

        thisObj.$buttonSubPL.attr('aria-checked','false');
        thisObj.$buttonSubPL.attr('aria-pressed','false');
		    thisObj.$buttonSubPL.removeClass('aria-no-checked');
        thisObj.$buttonSubPL.removeClass('subtno');
        thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

        thisObj.$buttonSubES.attr('aria-checked','false');
        thisObj.$buttonSubES.attr('aria-pressed','false');
        thisObj.$buttonSubES.removeClass('aria-no-checked');
        thisObj.$buttonSubES.removeClass('subtno');
        thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
      } else if(thisObj.captionLang === 'fr') {
          
          
          if(thisObj.$buttonSubFR.attr('aria-pressed') == 'true'){
            thisObj.setCaptionsOn(false,thisObj.captionLang);
            
            thisObj.$buttonSubFR.attr('aria-checked','false');
            thisObj.$buttonSubFR.attr('aria-pressed','false');
            thisObj.$buttonSubFR.removeClass('aria-no-checked');
            thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);
            thisObj.$buttonSubFR.removeClass('subtno');
          } else {
            thisObj.setCaptionsOn(true,thisObj.captionLang);
            thisObj.$buttonSubFR.attr('aria-checked','true');
            thisObj.$buttonSubFR.attr('aria-pressed','true');
            thisObj.$buttonSubFR.addClass('aria-no-checked');
            thisObj.$buttonSubFR.text(thisObj.tt.de_act_st_fr);
            thisObj.$buttonSubFR.addClass('subtno');
          }

          thisObj.$buttonSubML.attr('aria-checked','false');
          thisObj.$buttonSubML.attr('aria-pressed','false');
          thisObj.$buttonSubML.removeClass('aria-no-checked');
          thisObj.$buttonSubML.removeClass('subtno');
          thisObj.$buttonSubML.text('');
          thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
        //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");

          thisObj.$buttonSubEN.attr('aria-checked','false');
          thisObj.$buttonSubEN.attr('aria-pressed','false');
          thisObj.$buttonSubEN.removeClass('aria-no-checked');
          thisObj.$buttonSubEN.removeClass('subtno');
          thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

          thisObj.$buttonSubPL.attr('aria-checked','false');
          thisObj.$buttonSubPL.attr('aria-pressed','false');
          thisObj.$buttonSubPL.removeClass('aria-no-checked');
          thisObj.$buttonSubPL.removeClass('subtno');
          thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

          thisObj.$buttonSubES.attr('aria-checked','false');
          thisObj.$buttonSubES.attr('aria-pressed','false');
          thisObj.$buttonSubES.removeClass('aria-no-checked');
          thisObj.$buttonSubES.removeClass('subtno');
          thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
        
        
      } else if(thisObj.captionLang === 'es') {
        if(thisObj.$buttonSubES.attr('aria-pressed') == 'true'){
          thisObj.setCaptionsOn(false,thisObj.captionLang);
          thisObj.$buttonSubES.attr('aria-checked','false');
          thisObj.$buttonSubES.attr('aria-pressed','false');
          thisObj.$buttonSubES.removeClass('aria-no-checked');
          thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
          thisObj.$buttonSubES.removeClass('subtno');
        } else {
          thisObj.setCaptionsOn(true,thisObj.captionLang);
          thisObj.$buttonSubES.attr('aria-checked','true');
          thisObj.$buttonSubES.attr('aria-pressed','true');
          thisObj.$buttonSubES.addClass('aria-no-checked');
          thisObj.$buttonSubES.text(thisObj.tt.de_act_st_es);
          thisObj.$buttonSubES.addClass('subtno');
        }
        

        thisObj.$buttonSubML.attr('aria-checked','false');
        thisObj.$buttonSubML.attr('aria-pressed','false');
        thisObj.$buttonSubML.removeClass('aria-no-checked');
        thisObj.$buttonSubML.removeClass('subtno');
        thisObj.$buttonSubML.text('');
        thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
        //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");

        thisObj.$buttonSubFR.attr('aria-checked','false');
        thisObj.$buttonSubFR.attr('aria-pressed','false');
        thisObj.$buttonSubFR.removeClass('aria-no-checked');
        thisObj.$buttonSubFR.removeClass('subtno');
        thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

        thisObj.$buttonSubEN.attr('aria-checked','false');
        thisObj.$buttonSubEN.attr('aria-pressed','false');
        thisObj.$buttonSubEN.removeClass('aria-no-checked');
        thisObj.$buttonSubEN.removeClass('subtno');
        thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

        $('#subtitlesPL').attr('aria-checked','false');
        $('#subtitlesPL').attr('aria-pressed','false');
        $('#subtitlesPL').removeClass('aria-no-checked');
        $('#subtitlesPL').removeClass('subtno');
        $('#subtitlesPL').text(thisObj.tt.act_st_pl);
      } else if(thisObj.captionLang === 'pl') {
        if(thisObj.$buttonSubPL.attr('aria-pressed') == 'true'){
          thisObj.setCaptionsOn(false,thisObj.captionLang);
          thisObj.$buttonSubPL.attr('aria-checked','false');
          thisObj.$buttonSubPL.attr('aria-pressed','false');
          thisObj.$buttonSubPL.removeClass('aria-no-checked');
          thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);
          thisObj.$buttonSubPL.removeClass('subtno');
        } else {
          thisObj.setCaptionsOn(true,thisObj.captionLang);
          thisObj.$buttonSubPL.attr('aria-checked','true');
          thisObj.$buttonSubPL.attr('aria-pressed','true');
          thisObj.$buttonSubPL.addClass('aria-no-checked');
          thisObj.$buttonSubPL.text(thisObj.tt.de_act_st_pl);
          thisObj.$buttonSubPL.addClass('subtno');
        }
        // $('#subtitlesPL').attr('aria-checked','true');
        // $('#subtitlesPL').attr('aria-pressed','true');
        // $('#subtitlesPL').addClass('aria-no-checked');
        // $('#subtitlesPL').text(thisObj.tt.de_act_st_pl);
        // $('#subtitlesPL').addClass('subtno');

        thisObj.$buttonSubML.attr('aria-checked','false');
        thisObj.$buttonSubML.attr('aria-pressed','false');
        thisObj.$buttonSubML.removeClass('aria-no-checked');
        thisObj.$buttonSubML.removeClass('subtno');
        thisObj.$buttonSubML.text('');
        thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
        //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
        
        thisObj.$buttonSubFR.attr('aria-checked','false');
        thisObj.$buttonSubFR.attr('aria-pressed','false');
        thisObj.$buttonSubFR.removeClass('aria-no-checked');
        thisObj.$buttonSubFR.removeClass('subtno');
        thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

        thisObj.$buttonSubEN.attr('aria-checked','false');
        thisObj.$buttonSubEN.attr('aria-pressed','false');
        thisObj.$buttonSubEN.removeClass('aria-no-checked');
        thisObj.$buttonSubEN.removeClass('subtno');
        thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

        thisObj.$buttonSubES.attr('aria-checked','false');
        thisObj.$buttonSubES.attr('aria-pressed','false');
        thisObj.$buttonSubES.removeClass('aria-no-checked');
        thisObj.$buttonSubES.removeClass('subtno');
        thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
      } else if(thisObj.captionLang === 'ml') {
        
        if(thisObj.$buttonSubML.attr('aria-pressed') == 'true'){
          thisObj.setCaptionsOn(false,thisObj.captionLang);
          thisObj.$buttonSubML.attr('aria-checked','false');
          thisObj.$buttonSubML.attr('aria-pressed','false');
          thisObj.$buttonSubML.removeClass('aria-no-checked');
          thisObj.$buttonSubML.text('');
          thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

          //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
        } else {
          thisObj.setCaptionsOn(true,thisObj.captionLang);
          thisObj.$buttonSubML.attr('aria-checked','true');
          thisObj.$buttonSubML.attr('aria-pressed','true');
          thisObj.$buttonSubML.addClass('aria-no-checked');
          thisObj.$buttonSubML.text('');
          thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.de_act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
          //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
        }
        // $('#subtitlesML').attr('aria-checked','true');
        // $('#subtitlesML').attr('aria-pressed','true');
        // $('#subtitlesML').addClass('aria-no-checked');
        // $('#subtitlesML').text('');
        // $('#subtitlesML').append("<span id=\"\">"+thisObj.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
        // //$('#subtitlesML').addClass('subtno');

        thisObj.$buttonSubPL.attr('aria-checked','false');
        thisObj.$buttonSubPL.attr('aria-pressed','false');
        thisObj.$buttonSubPL.removeClass('aria-no-checked');
        thisObj.$buttonSubPL.removeClass('subtno');
        thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);
        
        thisObj.$buttonSubFR.attr('aria-checked','false');
        thisObj.$buttonSubFR.attr('aria-pressed','false');
        thisObj.$buttonSubFR.removeClass('aria-no-checked');
        thisObj.$buttonSubFR.removeClass('subtno');
        thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

        thisObj.$buttonSubEN.attr('aria-checked','false');
        thisObj.$buttonSubEN.attr('aria-pressed','false');
        thisObj.$buttonSubEN.removeClass('aria-no-checked');
        thisObj.$buttonSubEN.removeClass('subtno');
        thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

        thisObj.$buttonSubES.attr('aria-checked','false');
        thisObj.$buttonSubES.attr('aria-pressed','false');
        thisObj.$buttonSubES.removeClass('aria-no-checked');
        thisObj.$buttonSubES.removeClass('subtno');
        thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
      } 
        $('#subt').attr('aria-checked','true');
        $('#subt').attr('aria-pressed','true');
        $('#subt').addClass('aria-no-checked');
        $('#subt').text('');
        //$('#subt').addClass('subtno')
        $('#subt').prop('disabled',false);
        $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");

      // save preference to cookie
      thisObj.prefCaptions = 1;
      thisObj.updateCookie('prefCaptions');

      for(var q=0;q<$(thisObj.captionsPopup.find('input')).length;q++){
        if($($(thisObj.captionsPopup.find('input'))[q]).attr('lang') == thisObj.captionLang){
          //
          $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", true);
        } else {
          $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", false);
        }
      }  
      if(thisObj.captionsOn == false){
        thisObj.captionsPopup.find('input').last().prop('checked',true);
      }

      thisObj.refreshControls();
      thisObj.checkContextVidTranscr();
    }
  };

  // Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      
      
    
      if (thisObj.player == 'youtube') {
        thisObj.youTubePlayer.unloadModule(thisObj.ytCaptionModule);
      }

      //11/12/2020 try just to click on activated language
      if(thisObj.selectedCaptions.language == 'fr' && thisObj.captionsOn == true){
        thisObj.$buttonSubFR.click();
        
        
        thisObj.captionsPopup.find('input').last().prop('checked',true);
      } else if(thisObj.selectedCaptions.language == 'es' && thisObj.captionsOn == true){
        thisObj.$buttonSubES.click();
      } else if(thisObj.selectedCaptions.language == 'pl' && thisObj.captionsOn == true){
        thisObj.$buttonSubPL.click();
      } else if(thisObj.selectedCaptions.language == 'ml' && thisObj.captionsOn == true){
        thisObj.$buttonSubML.click();
      } else if(thisObj.selectedCaptions.language == 'en' && thisObj.captionsOn == true){
        thisObj.$buttonSubEN.click();
        //thisObj.captionsPopup.$menu.find('input').last().prop('checked',true);
      } else {
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

          $('#subt').attr('aria-checked','false');
          $('#subt').removeClass('aria-no-checked');
          $('#subt').text('');
          $('#subt').removeClass('subtno');
          $('#subt').attr('disabled',true);
          $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");

          thisObj.$buttonSubFR.attr('aria-checked','false');
          thisObj.$buttonSubFR.removeClass('aria-no-checked');
          thisObj.$buttonSubFR.removeClass('subtno');
          thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

          thisObj.$buttonSubEN.attr('aria-checked','false');
          thisObj.$buttonSubEN.removeClass('aria-no-checked');
          thisObj.$buttonSubEN.removeClass('subtno');
          thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

          thisObj.$buttonSubES.attr('aria-checked','false');
          thisObj.$buttonSubES.removeClass('aria-no-checked');
          thisObj.$buttonSubES.removeClass('subtno');
          thisObj.$buttonSubES.text(thisObj.tt.act_st_es);

          thisObj.$buttonSubPL.attr('aria-checked','false');
          thisObj.$buttonSubPL.removeClass('aria-no-checked');
          thisObj.$buttonSubPL.removeClass('subtno');
          thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

          thisObj.$buttonSubML.attr('aria-checked','false');
          thisObj.$buttonSubML.removeClass('aria-no-checked');
          thisObj.$buttonSubML.removeClass('subtno');
          thisObj.$buttonSubML.text(thisObj.tt.act_st_ml);

          thisObj.checkContextVidTranscr();
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
      var result = [], ii,iq;
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
      else if (component.type === 'c') {
        var classes = "";
        for (iq = 0; iq < component.classes.length; iq++) {
          if(component.classes[iq] === 'speakerInScreen' || component.classes[iq] === 'noise'
        || component.classes[iq] === 'music' || component.classes[iq] === 'speakerOutScreen'
        || component.classes[iq] === 'voiceOff' || component.classes[iq] === 'translateLg'){//auditionPlus
            //if($('#auditionPlus').attr('aria-pressed') === 'true' ){
              classes = classes + component.classes[iq] +" ";
            //}
          } else {
            classes = classes + component.classes[iq] +",";
          }
          
        }
        result.push('<span class="'+classes+'">');
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
        result.push('</span>');
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
        var textShadow = '';
        if(this.prefShadowType === this.tt.outHigh){
          textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
        } else if(this.prefShadowType === this.tt.outEnforce){
          textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
        } else if(this.prefShadowType === this.tt.outUniform){
          textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
        } else if(this.prefShadowType === this.tt.outShadow){
          textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
        }
        $element.css({
          'font-family': this.prefCaptionsFont,
          'font-size': this.prefCaptionsSize,
          'color': this.prefCaptionsColor,
          'background-color': this.prefCaptionsBGColor,
          'opacity': opacity,
          'text-shadow': textShadow
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
	    'role' : 'tab',
      'aria-label' : this.tt.transcriptTitle,
      'tabindex': '0'
    });

    this.$transcriptToolbar = $('<div>', {
      'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
    });

    this.$transcriptDiv = $('<div>', {
      'class' : 'able-transcript'
    });

    // Transcript toolbar content:
    //Orange remove Defilement checkbox
    this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
    //this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);

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
    //Orange remove langage
    //this.$transcriptToolbar.append(languageSelectWrapper);

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
        if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
          //(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%'
          //this.$ableDiv.css('width','33%');
          
          
          this.$transcriptArea .css('width','66%');
          if(this.prefSign === 1){
            this.$ableDiv.css('width',(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%');
            this.$transcriptArea.css('width',(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
          }

          this.$mediaContainer.css('height',this.$media.height()+'px !important');
          //this.$ableDiv.css('width',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
          this.$transcriptToolbar.css('min-height','28px');
          this.$transcriptArea.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
          this.$transcriptArea.css('left',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
          this.$transcriptArea.css('top','0px');
          //
          
          var heightTranscriptArea = this.$mediaContainer.css('height').split("px")[0]-this.$transcriptToolbar.css('min-height').split("px")[0];
          this.$transcriptArea.css('height',this.$mediaContainer.css('height').split("px")[0]+'px');
          this.$transcriptDiv.css('height',heightTranscriptArea-5+'px');
          this.$transcriptArea.css('position','absolute');
          //this.resizeAccessMenu();
          
          // this.$transcriptArea .css('left','33%');
          // if(this.prefSign === 1){
          //   this.$transcriptArea .css('left',(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%');
          // }
          // this.$transcriptArea .css('position','absolute');
          // this.$transcriptArea .css('top','0px');
          // if(this.$transcriptArea[0].offsetWidth<500){
          //   this.$transcriptToolbar.css('min-height','28px');
          // }
        }
        
      }
    }

    // if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
    //   if(this.$ableDiv.css('width') === '100%'){
    //     this.$ableDiv.css('width','33%');
    //   } 
    //   // this.$ableDiv.css('width','33%');
    //   this.$transcriptArea .css('width','66%');
    //   this.$transcriptArea .css('left','33%');
    //   // this.$transcriptArea .css('position','absolute');
    //   //
    // }
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

    this.$transcriptDiv.on('mousewheel DOMMouseScroll click scroll', function (event) {
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

    var start, end;
    var thisObj = this;

    currentTime = parseFloat(currentTime);

    // Highlight the current transcript item.
    this.$transcriptArea.find('span.able-transcript-caption').each(function() {
      start = parseFloat($(this).attr('data-start'));
      end = parseFloat($(this).attr('data-end'));
      if (currentTime >= start && currentTime <= end) {
        // move all previous highlights before adding one to current span
        $('.able-highlight').css('background',thisObj.getCookie()['preferences']['prefTRBGColor']);
        thisObj.$transcriptArea.find('.able-highlight').removeClass('able-highlight');
        $(this).addClass('able-highlight');
        //
        $('.able-highlight').css('background',thisObj.getCookie()['preferences']['prefFollowColor']);
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
        'class': 'able-transcript-seekpoint',
        'style': 'color:'+thisObj.getCookie()['preferences']['prefTRColor']+';background-color:'+thisObj.getCookie()['preferences']['prefTRBGColor']+';font-size:'+thisObj.getCookie()['preferences']['prefTRSize']+';font-family:'+thisObj.getCookie()['preferences']['prefTRFont']
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
        'class': 'able-transcript-seekpoint',
        'style': 'color:'+thisObj.getCookie()['preferences']['prefTRColor']+';background-color:'+thisObj.getCookie()['preferences']['prefTRBGColor']+';font-size:'+thisObj.getCookie()['preferences']['prefTRSize']+';font-family:'+thisObj.getCookie()['preferences']['prefTRFont']
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
        'class': 'able-transcript-seekpoint able-transcript-caption',
        'style': 'color:'+thisObj.getCookie()['preferences']['prefTRColor']+';background-color:'+thisObj.getCookie()['preferences']['prefTRBGColor']+';font-size:'+thisObj.getCookie()['preferences']['prefTRSize']+';font-family:'+thisObj.getCookie()['preferences']['prefTRFont']
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
    if (this.controlsHidden) {
      this.fadeControls('in');
      this.controlsHidden = false;
    }
    if (this.hidingControls) { // a timeout is actively counting
      window.clearTimeout(this.hideControlsTimeout);
      this.hidingControls = false;
    }
  };

  AblePlayer.prototype.onMediaComplete = function () {
    // if there's a playlist, advance to next item and start playing
    //Remove for OrangeLab
    /* if (this.hasPlaylist) {
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
    }*/

    //spec OrangeLab
    $('#copy-play').removeClass('pause');
    $('#copy-play').text('');
    $('#copy-play').value=this.tt.play;
    $('#copy-play').attr('aria-label',this.tt.play);
    //$('#copy-play').append("<i class=\"play\"></i><span id=\"copy-play\">"+this.tt.play+"</span>");
    $('#copy-play').children('svg').remove();
    $('#copy-play').append("<svg style='float:left;margin-left:"+$('#show-volume').find('svg').css('margin-left')+"' viewBox='0 0 20 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'></path></svg><span id=\"copy-play\" style='margin-left:-25%'>"+this.tt.play+"</span>");
    
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

    // this.seekBarOrange.bodyDiv.on('startTracking', function (event) {
    //   thisObj.pausedBeforeTracking = thisObj.isPaused();
    //   thisObj.pauseMedia();
    // }).on('tracking', function (event, position) {
    //   // Scrub transcript, captions, and metadata.
    //   thisObj.highlightTranscript(position);
    //   thisObj.updateCaption(position);
    //   thisObj.showDescription(position);
    //   thisObj.updateChapter(thisObj.convertChapterTimeToVideoTime(position));
    //   thisObj.updateMeta(position);
    //   thisObj.refreshControls();
    // }).on('stopTracking', function (event, position) {
      
    //   if (thisObj.useChapterTimes) {
    //     thisObj.seekTo(thisObj.convertChapterTimeToVideoTime(position));
    //   }
    //   else {
    //     thisObj.seekTo(position);
    //   }
    //   if (!thisObj.pausedBeforeTracking) {
    //     setTimeout(function () {
    //       thisObj.playMedia();
    //     }, 200);
    //   }
    // });
  };

  AblePlayer.prototype.onClickPlayerButton = function (el) {
    // TODO: This is super-fragile since we need to know the length of the class name to split off; update this to other way of dispatching?
    var whichButton = $(el).attr('class').split(' ')[0].substr(20);
    if (whichButton === 'play') {
      this.handlePlay();
    }
    else if (whichButton === 'restart') {
      this.seekTrigger = 'restart';
      this.handleRestart();
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
    else if (whichButton === 'accmenu') {
      this.handleAccessToggle();
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
      //Orange de-activate the real player fullscreen and activate fullscreen new
      //this.handleFullscreenToggle();
      $('#fullscreen').click();
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
      if (this.$ableWrapper.find('.able-controller button:focus').length === 0) {
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

    // NOTE: iOS and some browsers do not support autoplay
    // and no events are triggered until media begins to play
    // Able Player gets around this by automatically loading media in some circumstances
    // (see initialize.js > initPlayer() for details)
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
        if (thisObj.seekTrigger == 'restart' || thisObj.seekTrigger == 'chapter' || thisObj.seekTrigger == 'transcript') {
          // by clicking on any of these elements, user is likely intending to play
          // Not included: elements where user might click multiple times in succession
          // (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
          thisObj.playMedia();
        }
        else if (!thisObj.startedPlaying) {
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
        else if (thisObj.hasPlaylist) {
          if ((thisObj.playlistIndex !== (thisObj.$playlist.length - 1)) || thisObj.loop) {
            // this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
            thisObj.playMedia();
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
        thisObj.playing = false;
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
          
        }
      })
      .on('pause',function() {
        if (!thisObj.clickedPlay) {
          // 'pause' was triggered automatically, not initiated by user
          // this happens between tracks in a playlist
          if (thisObj.hasPlaylist) {
            // do NOT set playing to false.
            // doing so prevents continual playback after new track is loaded
          }
          else {
            thisObj.playing = false;
          }
        }
        else {
          thisObj.playing = false;
        }
        thisObj.clickedPlay = false; // done with this variable
        thisObj.onMediaPause();
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
          
        }
        thisObj.refreshControls();
      })
      .onPause(function() {
        thisObj.onMediaPause();
      })
      .onBuffer(function() {
        if (thisObj.debug) {
          
        }
        thisObj.refreshControls();
      })
      .onBufferChange(function() {
        thisObj.refreshControls();
      })
      .onIdle(function(e) {
        if (thisObj.debug) {
          
        }
        thisObj.refreshControls();
      })
      .onMeta(function() {
        if (thisObj.debug) {
          
        }
      })
      .onPlaylist(function() {
        if (thisObj.debug) {
          
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
    else {
      // browser doesn't support MutationObserver
      // TODO: Figure out an alternative solution for this rare use case in older browsers
      // See example in buildplayer.js > useSvg()
    }

    this.addSeekbarListeners();

    // handle clicks on player buttons
    this.$controllerDiv.find('button').on('click',function(event){
      event.stopPropagation();
      thisObj.onClickPlayerButton(this);
    });

    //spec linearisation player OrangeLab
    
$('#copy-play').on('click',function(event){
  event.stopPropagation();
  thisObj.onClickPlayerButton(this);
});	
$('#copy-seek').on('keyup',function(event){
  if (event.keyCode === 13) {
    event.stopPropagation();
    if($('#setTimeOrange').css('display') == 'none'){
      $('#able-seekbar-acc').attr("style","display:none");
      $('#setTimeOrange').attr("style","display:block");
      $('#setTimeOrange').focus();
    } else {
      var str = $('#setTimeOrange').val();
      var newPosition = 0;
      if(str.includes(":")){
        var res = str.split(":");
        newPosition = parseInt(res[0])*60+parseInt(res[1]);
      } else if(str.includes("min")){
        var res = str.split("min");
        newPosition = parseInt(res[0])*60+parseInt(res[1]);
      } else {
        newPosition = parseInt(str);
      }
      if(newPosition != "NaN" && newPosition<thisObj.seekBarOrange.duration){
        thisObj.seekTo(newPosition);
      } else if(newPosition >= thisObj.seekBarOrange.duration) {
        thisObj.seekTo(thisObj.seekBarOrange.lastTrackPosition);
      }
      $('#able-seekbar-acc').attr("style","display:block,width:50%");
      $('#able-seekbar-acc').css("width","50%");
      $('#setTimeOrange').attr("style","display:none");
      $('#able-seekbar-acc').focus();
    }
   
  }
});	
$('#acc-menu-id').on('click',function(event){
  event.stopPropagation();
  //
  //
  if($('#acc-menu-id').text() === thisObj.tt.showAccMenu){
    thisObj.prefAccessMenu = "true";
    $('#' + thisObj.mediaId + '_' + 'prefAccessMenu').val('true');
    thisObj.updateCookie('prefAccessMenu');
    if(thisObj.$mediaContainer.find('video').find('source')[0].src != thisObj.$sources.first().attr('data-sign-src') && thisObj.getCookie()['preferences']['prefSign'] == 1){
      //save Time
      var elapsed = thisObj.getElapsed();
      thisObj.$ableDiv.css('width','67%');
      thisObj.$signWindow.css('width','33%');
      thisObj.$signWindow.css('left','67%');
      thisObj.$signWindow.css('position','absolute');
      thisObj.$signWindow.css('top','0px');
      thisObj.$signWindow.css('margin','0px');
      var svgVideoSrc = thisObj.$mediaContainer.find('video').find('source')[0].src; 
      thisObj.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
      thisObj.$mediaContainer.find('video')[0].load();
      //put video in the second containre
      thisObj.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
      thisObj.$signWindow.find('video')[0].load();
      thisObj.swappingSrc = true;
      thisObj.swapTime = elapsed;
      if(thisObj.getCookie()['preferences']['prefTranscript'] == 1){
        var takePadding = 0;
        if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
          takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
        }
        thisObj.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
        thisObj.$transcriptArea.css('left','33%');
      }
    }
    if(thisObj.getCookie()['preferences']['prefTranscript'] == 1 && thisObj.getCookie()['preferences']['prefSign'] == 0){
      
      thisObj.$transcriptArea.css('top','0px');
      // thisObj.$transcriptArea.css('left','33%');
      // thisObj.$transcriptArea.css('width','66%');
      // thisObj.$ableDiv.css('width','33%');
      
      thisObj.$ableDiv.css('width',100-parseInt(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
      thisObj.$transcriptArea.css('width',thisObj.getCookie()['preferences']['prefVidSize']+'%');
      thisObj.$transcriptArea.css('left',100-parseInt(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
      var heightTranscriptArea = thisObj.$mediaContainer.css('height').split("px")[0]-thisObj.$transcriptToolbar.css('min-height').split("px")[0];
      thisObj.$transcriptArea.css('height',heightTranscriptArea+'px');
      thisObj.resizeAccessMenu();
    }
    $('#acc-menu-id').text(thisObj.tt.maskAccMenu);
    //$('.able-controller').attr("style","display:none");
    $('.controller-orange-main').attr("style","display:block");
    thisObj.resizeAccessMenu();
  } else {
    $('#' + thisObj.mediaId + '_' + 'prefAccessMenu').val('false');
    thisObj.prefAccessMenu = "false";
    thisObj.updateCookie('prefAccessMenu');
    $('.able').css("width","100%");
    if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) && thisObj.getCookie()['preferences']['prefSign'] == 1){
        var elapsed = thisObj.getElapsed();
        if(thisObj.getCookie()['preferences']['prefTranscript'] === 0){
          thisObj.$ableDiv.css('width','100%');
        } else {
          thisObj.$transcriptArea.css('top','0px');
        }
        var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src; 
        //put video sign in the second container
        thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
        thisObj.$mediaContainer.find('video')[0].load();
        //put video in the first containre
        thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
        thisObj.$signWindow.find('video')[0].load();
        thisObj.swappingSrc = true;
        thisObj.swapTime = elapsed;
    }
    $('#acc-menu-id').text(thisObj.tt.showAccMenu);
    //$('.able-controller').attr("style","display:block");
    $('.controller-orange-main').attr("style","display:none");
    $('.controller-orange-volume').attr("style","display:none");
    $('.controller-orange-settings').attr("style","display:none");
    $('.controller-orange-subtitles').attr("style","display:none");
    $('.controller-orange-preferences').attr("style","display:none");
    $('.controller-orange-perception').attr("style","display:none");
    $('.controller-orange-textcolor').attr("style","display:none");
    $('.controller-orange-bgcolor').attr("style","display:none");
    $('.controller-orange-followcolor').attr("style","display:none");
    $('.controller-orange-fontsize').attr("style","display:none");
    $('.controller-orange-outfont').attr("style","display:none");
    $('.controller-orange-font').attr("style","display:none");
    $('.controller-orange-butcol').attr("style","display:none");
    $('.controller-orange-reglages').attr("style","display:none");
  }
  // 
});	
$('#show-volume').on('click',function(event){
  $('.controller-orange-main').attr("style","display:none");
  $('.controller-orange-volume').toggle( "slide");
  $('.controller-orange-volume').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-volume').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-volume').offset().top }, 'speed');
});
$('#hide-volume').on('click',function(event){
  $('.controller-orange-volume').hide("slide", { direction: "right" });
  $('.controller-orange-main').toggle( "slide");
  $('.controller-orange-main').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
});
$('#hide-settings').on('click',function(event){
 $('.controller-orange-settings').hide("slide", { direction: "right" });
  $('.controller-orange-main').toggle( "slide");
  $('.controller-orange-main').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
});
$('#hide-prefT').on('click',function(event){
  $('.controller-orange-preferences').hide("slide", { direction: "right" });
   $('.controller-orange-main').toggle( "slide");
   $('.controller-orange-main').find('span').css('display','inline-block');
   thisObj.resizeAccessMenu();
   $('html, body').animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
   thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
 });
$('#allParams').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-main').attr("style","display:none");
  $('.controller-orange-settings').toggle( "slide");
  $('.controller-orange-settings').find('span').css('display','inline-block');
  $('.controller-orange-settings').find('span').focus();
  thisObj.resizeAccessMenu();
  
  $('body, html').animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
});
$('#show-settings').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-main').attr("style","display:none");
  $('.controller-orange-preferences').toggle( "slide");
  $('.controller-orange-preferences').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-preferences').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-preferences').offset().top }, 'speed');
});
$('#subtitles').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-main').attr("style","display:none");
  $('.controller-orange-subtitles').toggle( "slide");
  $('.controller-orange-subtitles').find('span').css('display','inline-block');
  $('.controller-orange-subtitles').addClass('prevMain');
  $('.controller-orange-subtitles').removeClass('prevParam');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-subtitles').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-subtitles').offset().top }, 'speed');
});
$('#subtitlesParam').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-settings').attr("style","display:none");
  $('.controller-orange-subtitles').toggle( "slide");
  $('.controller-orange-subtitles').find('span').css('display','inline-block');
  $('.controller-orange-subtitles').addClass('prevParam');
  $('.controller-orange-subtitles').removeClass('prevMain');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-subtitles').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-subtitles').offset().top }, 'speed');
});
$('#hide-subT').on('click',function(event){
  if($('.controller-orange-subtitles').hasClass('prevParam')){
    $('.controller-orange-subtitles').hide("slide", { direction: "right" });
    $('.controller-orange-settings').toggle( "slide");
    $('.controller-orange-settings').find('span').css('display','inline-block');
    $('html, body').animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
    thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
  } else if($('.controller-orange-subtitles').hasClass('prevMain')){
    $('.controller-orange-subtitles').hide("slide", { direction: "right" });
    $('.controller-orange-main').toggle( "slide");
    $('.controller-orange-main').find('span').css('display','inline-block');
    $('html, body').animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
    thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-main').offset().top }, 'speed');
  }
  thisObj.resizeAccessMenu();
  
  
 });
 $('#hide-perception').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  //$('.controller-orange-perception').attr("style","display:none");
  $('.controller-orange-perception').hide("slide", { direction: "right" });
  $('.controller-orange-settings').toggle( "slide");
  $('.controller-orange-settings').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
}); 
 $('#perceptionParam').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-settings').attr("style","display:none");
  $('.controller-orange-perception').toggle( "slide");
  $('.controller-orange-perception').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-perception').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-preception').offset().top }, 'speed');
});
$('#reglageParam').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-settings').attr("style","display:none");
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-reglages').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').hide("slide", { direction: "right" });
  $('.controller-orange-settings').toggle( "slide");
  $('.controller-orange-settings').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-settings').offset().top }, 'speed');
});
$('#hide-textColor').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-textcolor').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-bgColor').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-bgcolor').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-followColor').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-followcolor').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-fontsize').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-fontsize').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-out').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-outfont').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-font').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-font').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#hide-butcol').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-butcol').hide("slide", { direction: "right" });
  $('.controller-orange-reglages').toggle( "slide");
  $('.controller-orange-reglages').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-reglages').offset().top }, 'speed');
});
$('#textColor').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-textcolor').toggle( "slide");
  $('.controller-orange-textcolor').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-textcolor').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-textcolor').offset().top }, 'speed');
});
$('#bgColor').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-bgcolor').toggle( "slide");
  $('.controller-orange-bgcolor').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-bgcolor').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-bgcolor').offset().top }, 'speed');
});
$('#followColor').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-followcolor').toggle( "slide");
  $('.controller-orange-followcolor').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-followcolor').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-followcolor').offset().top }, 'speed');
});
$('#fontSize').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-fontsize').toggle( "slide");
  $('.controller-orange-fontsize').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-fontsize').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-fontsize').offset().top }, 'speed');
});
$('#outText').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-outfont').toggle( "slide");
  $('.controller-orange-outfont').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-outfont').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-outfont').offset().top }, 'speed');
});
$('#textStyle').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-font').toggle( "slide");
  $('.controller-orange-font').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-font').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-font').offset().top }, 'speed');
});
$('#reglagesSettings').on('click',function(event){
  //$('.controller-orange-main').toggle( "slide");
  $('.controller-orange-reglages').attr("style","display:none");
  $('.controller-orange-butcol').toggle( "slide");
  $('.controller-orange-butcol').find('span').css('display','inline-block');
  thisObj.resizeAccessMenu();
  $('html, body').animate({ scrollTop: $('.controller-orange-butcol').offset().top }, 'speed');
  thisObj.$ableWrapper.animate({ scrollTop: $('.controller-orange-butcol').offset().top }, 'speed');
});

//Orange reglages buttons for subtitles colors ect... and for transcription
// thisObj.prefCaptionsFont = 'Helvetica Neue';
//     thisObj.prefCaptionsColor = 'white';
//     thisObj.prefCaptionsSize = '100%';
//     thisObj.prefModeUsage = 'visionPlus';
//     $('#' + thisObj.mediaId + '_' + 'prefCaptionsFont').val('Helvetica Neue');
//     $('#' + thisObj.mediaId + '_' + 'prefCaptionsColor').val('white');
//     $('#' + thisObj.mediaId + '_' + 'prefCaptionsSize').val('100%');
//     thisObj.updateCookie('prefCaptionsFont');
//     thisObj.updateCookie('prefCaptionsColor');
//     thisObj.updateCookie('prefCaptionsSize');
//     thisObj.updateCookie('prefModeUsage');
//     $('.able-captions').css('font-family', thisObj.prefCaptionsFont);
//     $('.able-captions').css('color', thisObj.prefCaptionsColor);
//     $('.able-captions').css('font-size', thisObj.prefCaptionsSize);

// $('#whiteTextColor').on('click',function(event){
//   thisObj.prefCaptionsColor = 'white';
//   $('#' + thisObj.mediaId + '_' + 'prefCaptionsColor').val('white');
//   thisObj.updateCookie('prefCaptionsColor');
//   $('.able-captions').css('color', thisObj.prefCaptionsColor);
//   $('#whiteTextColor').addClass("aria-no-checked")
// });

$('#blackTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('black');
});
$('#whiteTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('white');
});
$('#redTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('red');
});
$('#greenTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('green');
});
$('#blueTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('blue');
});
$('#yellowTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('yellow');
});
$('#magentaTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('magenta');
});
$('#cyanTextColor').on('click',function(){
  thisObj.changeCaptionsTranscrColor('cyan');
});

$('#blackBGColor').on('click',function(){
  thisObj.changeBGColor('black');
});
$('#whiteBGColor').on('click',function(){
  thisObj.changeBGColor('white');
});
$('#redBGColor').on('click',function(){
  thisObj.changeBGColor('red');
});
$('#greenBGColor').on('click',function(){
  thisObj.changeBGColor('green');
});
$('#blueBGColor').on('click',function(){
  thisObj.changeBGColor('blue');
});
$('#yellowBGColor').on('click',function(){
  thisObj.changeBGColor('yellow');
});
$('#magentaBGColor').on('click',function(){
  thisObj.changeBGColor('magenta');
});
$('#cyanBGColor').on('click',function(){
  thisObj.changeBGColor('cyan');
});

$('#blackFollowColor').on('click',function(){
  thisObj.changeFollowColor('black');
});
$('#whiteFollowColor').on('click',function(){
  thisObj.changeFollowColor('white');
});
$('#redFollowColor').on('click',function(){
  thisObj.changeFollowColor('red');
});
$('#greenFollowColor').on('click',function(){
  thisObj.changeFollowColor('green');
});
$('#blueFollowColor').on('click',function(){
  thisObj.changeFollowColor('blue');
});
$('#yellowFollowColor').on('click',function(){
  thisObj.changeFollowColor('yellow');
});
$('#magentaFollowColor').on('click',function(){
  thisObj.changeFollowColor('magenta');
});
$('#cyanFollowColor').on('click',function(){
  thisObj.changeFollowColor('cyan');
});

$('#button50').on('click',function(){
  thisObj.changeSize('50%');
});
$('#button75').on('click',function(){
  thisObj.changeSize('75%');
});
$('#button100').on('click',function(){
  thisObj.changeSize('100%');
});
$('#button125').on('click',function(){
  thisObj.changeSize('125%');
});
$('#button150').on('click',function(){
  thisObj.changeSize('150%');
});
$('#button175').on('click',function(){
  thisObj.changeSize('175%');
});
$('#button200').on('click',function(){
  thisObj.changeSize('200%');
});
$('#button300').on('click',function(){
  thisObj.changeSize('300%');
});
$('#button400').on('click',function(){
  thisObj.changeSize('400%');
});
$('#button400').on('click',function(){
  thisObj.changeSize('400%');
});

$('#outNo').on('click',function(){
  thisObj.changeOutFont($(this).text());
});
$('#outHigh').on('click',function(){
  thisObj.changeOutFont($(this).text());
});
$('#outEnforce').on('click',function(){
  thisObj.changeOutFont($(this).text());
});
$('#outUniform').on('click',function(){
  thisObj.changeOutFont($(this).text());
});
$('#outShadow').on('click',function(){
  thisObj.changeOutFont($(this).text());
});

$('#helvet').on('click',function(){
  thisObj.changeFont($(this).text());
});
$('#consola').on('click',function(){
  thisObj.changeFont($(this).text());
});
$('#accessDFA').on('click',function(){
  thisObj.changeFont($(this).text());
});
$('#comic').on('click',function(){
  thisObj.changeFont($(this).text());
});
$('#arial').on('click',function(){
  thisObj.changeFont($(this).text());
});

$('#blackwhite').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('.button').addClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
  // $('i').addClass('blackwhite');
});
$('#whiteblack').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
  // $('.button').addClass('whiteblack');
  // $('i').addClass('whiteblack');
});
$('#blueyellow').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
  // $('.button').addClass('blueyellow');
  // $('i').addClass('blueyellow');
});
$('#yellowblue').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
  // $('.button').addClass('yellowblue');
  // $('i').addClass('yellowblue');
});
$('#bluewhite').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
  // $('.button').addClass('bluewhite');
  // $('i').addClass('bluewhite');
});
$('#whiteblue').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
  // $('.button').addClass('whiteblue');
  // $('i').addClass('whiteblue');
});
$('#colordef').on('click',function(){
  thisObj.changeColorButton($(this));
  // $('.button').removeClass('whiteblue');
  // $('.button').removeClass('bluewhite');
  // $('.button').removeClass('yellowblue');
  // $('.button').removeClass('blueyellow');
  // $('.button').removeClass('whiteblack');
  // $('.button').removeClass('blackwhite');
  // $('i').removeClass('whiteblue');
  // $('i').removeClass('bluewhite');
  // $('i').removeClass('yellowblue');
  // $('i').removeClass('blueyellow');
  // $('i').removeClass('whiteblack');
  // $('i').removeClass('blackwhite');
});

$('#bPlus').on('click',function(){
  //$('.resizeWidthInput').val((parseInt($('.resizeWidthInput').val())+1))
  $(thisObj.signResizeDialog.modal[0].getElementsByClassName("resizeWidthInput")[0]).val((parseInt($('.resizeWidthInput').val())+1))
});
$('#bMoins').on('click',function(){
  if(parseInt($('.resizeWidthInput').val())>=1){
    //$('.resizeWidthInput').val((parseInt($('.resizeWidthInput').val())-1))
    $(thisObj.signResizeDialog.modal[0].getElementsByClassName("resizeWidthInput")[0]).val((parseInt($('.resizeWidthInput').val())-1))
  }
  
});
//Orange gloabl buttons of main

$('#sound-up').on('click',function(event){//mettre le niveau de volume dans la barre de retour
thisObj.handleVolume('up');
setTimeout(function () {
      $('.able-volume-slider').css('display','block');
    }, 300);
setTimeout(function () {
      $('.able-volume-slider').css('display','none');
    }, 3000);
// $('#hide-volume').text('');
// $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+thisObj.tt.volume+" "+(parseInt(thisObj.volume) / 10 * 100)+"%</span>");
// if((parseInt(thisObj.volume) / 10 * 100) > 0 && $('#sound-mute').text() == ' '+thisObj.tt.mute){
//   $('#sound-mute').click();
// }
});
$('#sound-down').on('click',function(event){
thisObj.handleVolume('down');
setTimeout(function () {
      $('.able-volume-slider').css('display','block');
    }, 300);
setTimeout(function () {
      $('.able-volume-slider').css('display','none');
    }, 3000);
// $('#hide-volume').text('');
// $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+thisObj.tt.volume+" "+(parseInt(thisObj.volume) / 10 * 100)+"%</span>");

// if((parseInt(thisObj.volume) / 10 * 100) == 0 && $('#sound-mute').text() == ' '+thisObj.tt.unmute){
//   $('#sound-mute').click();
// }
});
$('#sound-mute').on('click',function(event){
thisObj.handleMute();
// if($('#sound-mute').text()==' '+thisObj.tt.unmute){
//  $('#sound-mute').attr('aria-checked','false');
//  $('#sound-mute').addClass('aria-no-checked');
// // $('#hide-volume').text('');
// // $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+thisObj.tt.volume+" <s>"+(parseInt(thisObj.volume) / 10 * 100)+"%</s></span>");
// $('#sound-mute').text('');
// $('#sound-mute').addClass('vmuteno')
// $('#sound-mute').append("<i class=\"mute\"></i><span> "+thisObj.tt.mute+"</span>");
// } else {
//  $('#sound-mute').attr('aria-checked','true');
//  $('#sound-mute').removeClass('aria-no-checked');
// // $('#hide-volume').text('');
// // $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">"+thisObj.tt.volume+" "+(parseInt(thisObj.volume) / 10 * 100)+"%</span>");
// $('#sound-mute').text('');
// $('#sound-mute').removeClass('vmuteno')
// $('#sound-mute').append("<i class=\"mute\"></i><span> "+thisObj.tt.unmute+"</span>");
// }
});

$('#copy-forward').on('click',function(event){
  event.stopPropagation();
  thisObj.onClickPlayerButton(this);
  if(parseInt($('#copy-forward').val().split("+")[1]) === "NaN"){
    $('#copy-forward').val(Date.now());
  } else {
    $('#copy-forward').val(Date.now()+"+"+parseInt($('#copy-forward').val().split("+")[1]));
  }
  
});	
$('#copy-rewind').on('click',function(event){
  event.stopPropagation();
  thisObj.onClickPlayerButton(this);
  if(parseInt($('#copy-rewind').val().split("+")[1]) === "NaN"){
    $('#copy-rewind').val(Date.now());
  } else {
    $('#copy-rewind').val(Date.now()+"+"+parseInt($('#copy-rewind').val().split("+")[1]));
  }
});	
$('#fullscreen').on('click',function(event){
  // thisObj.setFullscreen(true);
  // //mask buttons and sho able-controller
  // $('.able-player').attr('style','margin-top:-15px');
  // $('.controller-orange-main').attr('style','display:none');
  // $('.able-controller').attr('style','display:block');
  // $('.able').css('width','100%');
  
  //New version 03/04/2020
  if($('.able-wrapper').css('position') != 'fixed'){
    thisObj.playerMaxWidth = $('.able-wrapper').width();
    $('.able-wrapper').css('position','fixed');
    $('.able-wrapper').css('width','100%');
    $('.able-wrapper').css('height','100%');
    $('.able-wrapper').css('padding','0');
    $('.able-wrapper').css('margin','0');
    $('.able-wrapper').css('top','0');
    $('.able-wrapper').css('left','0');
    $('.able-wrapper').css('max-width','100%');
    $('.able-wrapper').css('background','white');
    $('.able-wrapper').css('overflow','auto');
    $('.able-big-play-button').css('height',$('.video-accessible').height()+'px');
    $('.able-big-play-button').css('width',$('.video-accessible').width()+'px');
    //if LSF
    //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
    //if transcrpit
    if(thisObj.getCookie().preferences.prefSign == 1){
      $('.video-accessible-sign').css('height',$('.video-accessible').height()+5+'px');
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top',$('.video-accessible').height()+5+'px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    } else {
        if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
          $('.able-transcript-area').css('top','0px');
        } else {
          $('.able-transcript-area').css('top',$('.able').height()+'px');
        }
    }
    if(thisObj.getCookie().preferences.prefTranscript == 1 && thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
      thisObj.$playerDiv.css('width',('width',thisObj.$mediaContainer.width()+'px'));
      //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
      //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
    } else {
      thisObj.$playerDiv.css('width',('width',$('.able-wrapper').width()+'px'));
      //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
      //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
    }
    
    //thisObj.refreshControls();
    //thisObj.setFullscreen(true);
    //show collapse icon
    thisObj.refreshControls();
    var newSvgData = thisObj.getSvgData('fullscreen-collapse');
    
    $('.able-button-handler-fullscreen').find('svg').attr('viewBox',newSvgData[0]);
    $('.able-button-handler-fullscreen').find('path').attr('d',newSvgData[1]);

    // var elem = document.getElementsByClassName("able-wrapper");
    // 
    // if (elem[0].webkitRequestFullscreen) {
    //   elem[0].webkitRequestFullscreen();
    // }
    // 
    // $('.able-wrapper').webkitRequestFullscreen();

    //save min height when return to screen
    thisObj.$mediaContainer.css('min-height',thisObj.$mediaContainer.css('height'));
    //find which menu was show 
    var wasShow = $('[class^="controller-orange"]').filter(":visible");
    thisObj.$wasShow = wasShow;
    $('[class^="controller-orange"]').filter(":visible").attr('style','display:none');
    var $el = thisObj.$ableWrapper;
    var elem = $el[0];
    
    
    if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
    else if (elem.requestFullscreen()) {
      elem.requestFullscreen()();
    }
    else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    }
    else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
    //Now timeout only if fullscreenchange is confirmed
    // setTimeout(function(){
    //   
    //   
    //   if(thisObj.getCookie()['preferences']['prefModeUsage'] != 'profDef'){
    //     wasShow.attr('style','display:block');
    //   }
    //   //thisObj.checkContextVidTranscr();
    //   thisObj.resizeAccessMenu();
    // }, 1000);


    
    
  } else {
    $('.able-wrapper').css('position','');
    $('.able-wrapper').css('width','');
    $('.able-wrapper').css('height','');
    $('.able-wrapper').css('padding','');
    $('.able-wrapper').css('margin','');
    $('.able-wrapper').css('top','');
    $('.able-wrapper').css('left','');
    $('.able-wrapper').css('max-width',thisObj.playerMaxWidth+'px');
    $('.able-wrapper').css('background','');
    $('.able-wrapper').css('overflow','');
    $('.able-big-play-button').css('height',$('.video-accessible').height()+'px');
    $('.able-big-play-button').css('width',$('.video-accessible').width()+'px');
    //if LSF
    //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
    //if transcript
    if(thisObj.getCookie().preferences.prefSign == 1){
      $('.video-accessible-sign').css('height',$('.video-accessible').height()+5+'px');
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top',$('.video-accessible').height()+5+'px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    } else {
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top','0px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    }
    if(thisObj.getCookie().preferences.prefTranscript == 1 && thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
      thisObj.$playerDiv.css('width',('width',thisObj.$mediaContainer.width()+'px'));
      //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
      //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
    } else {
      thisObj.$playerDiv.css('width',('width',$('.able-wrapper').width()+'px'));
      //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
      //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
    }
    
    thisObj.refreshControls();
    thisObj.setFullscreen(false);
  }

});	
document.body.addEventListener('keydown', function(e) {
  if(e.key === "Escape" && $('.able-wrapper').css('position') === 'fixed') {
    // write your logic here.
    $('.able-wrapper').css('position','');
    $('.able-wrapper').css('width','');
    $('.able-wrapper').css('height','');
    $('.able-wrapper').css('padding','');
    $('.able-wrapper').css('margin','');
    $('.able-wrapper').css('top','');
    $('.able-wrapper').css('left','');
    $('.able-wrapper').css('background','');
    $('.able-wrapper').css('overflow','');
    $('.able-big-play-button').css('height',$('.video-accessible').height()+'px');
    $('.able-big-play-button').css('width',$('.video-accessible').width()+'px');
    //if LSF
    //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
    //if transcript
    //if transcrpit
    if(thisObj.getCookie().preferences.prefSign == 1){
      $('.video-accessible-sign').css('height',$('.video-accessible').height()+5+'px');
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top',$('.video-accessible').height()+5+'px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    } else {
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top','0px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    }
    
    thisObj.refreshControls();
  } 
});
document.body.addEventListener('keypress', function(e) {
  if(e.key === "Escape" && $('.able-wrapper').css('position') === 'fixed') {
    // write your logic here.
    $('.able-wrapper').css('position','');
    $('.able-wrapper').css('width','');
    $('.able-wrapper').css('height','');
    $('.able-wrapper').css('padding','');
    $('.able-wrapper').css('margin','');
    $('.able-wrapper').css('top','');
    $('.able-wrapper').css('left','');
    $('.able-wrapper').css('background','');
    $('.able-wrapper').css('overflow','');
    $('.able-wrapper').css('overflow','');
    $('.able-big-play-button').css('height',$('.video-accessible').height()+'px');
    $('.able-big-play-button').css('width',$('.video-accessible').width()+'px');
    //if LSF
    //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
    //if transcript
    if(thisObj.getCookie().preferences.prefSign == 1){
      $('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top',$('.video-accessible').height()+'px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    } else {
      if(thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal'){
        $('.able-transcript-area').css('top','0px');
      } else {
        $('.able-transcript-area').css('top',$('.able').height()+'px');
      }
    }
    thisObj.refreshControls();
  } 
});
$('#speedp').on('click',function(event){
  thisObj.handleRateIncrease();
});
$('#speedm').on('click',function(event){
  thisObj.handleRateDecrease();
});
//$('#speed').on('click',function(event){
//    thisObj.setPlaybackRate(1);
//  });
$('#speed').on('click',function(event){
  var mgLeft = $('#copy-play').find('svg').css('margin-left');
if($('.able-speed').text().indexOf(': 1.50x') != -1){
  thisObj.setPlaybackRate(1);
  /*$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
  $('#speed').removeClass("rabbitIcon");
  $('#speedMain').removeClass("rabbitIcon");
  $('#speed').removeClass("rabbitIcon");
  $('#speedMain').removeClass("rabbitIcon");
  $('#speed').addClass("normalIcon");
  $('#speedMain').addClass("normalIcon");*/
  $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('i').remove();
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" normale</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();
} else if($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] != 'conPlus') {
  thisObj.setPlaybackRate(1.5)
  $('#alertspeed').remove();
  //$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
  //$('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
  //$('#speed').addClass("rabbitIcon");
  //$('#speedMain').addClass("rabbitIcon");
  //$('#speed').removeClass("turtleIcon");
  //$('#speedMain').removeClass("turtleIcon");

  $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" rapide</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();
  
} else if($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] === 'conPlus') {
    thisObj.setPlaybackRate(1)
    /*$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speed').removeClass("turtleIcon");
    $('#speedMain').removeClass("turtleIcon");
    $('#speed').addClass("normalIcon");
    $('#speedMain').addClass("normalIcon");*/
	$('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('i').remove();
	$('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('i').remove();
	$('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
	$('#speed').append("<svg style='float:left;margin-left:"+mgLEft+"' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" normale</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();
    
} else if(($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] != 'sansVisionPlus') {
  thisObj.setPlaybackRate(0.5);
  //$('#speed').children('span').text(thisObj.tt.speed+ ' ralentie');
  //$('#speedMain').children('span').text(thisObj.tt.speed+ ' ralentie');
  //$('#speed').removeClass("normalIcon");
  //$('#speedMain').removeClass("normalIcon");
  //$('#speed').addClass("turtleIcon");
  //$('#speedMain').addClass("turtleIcon");
   $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" ralentie</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();

} else if(($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] === 'sansVisionPlus') {
  thisObj.setPlaybackRate(1.5);
  /*$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speed').removeClass("normalIcon");
  $('#speedMain').removeClass("normalIcon");
  $('#speed').addClass("rabbitIcon");
  $('#speedMain').addClass("rabbitIcon");*/
  $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" rapide</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();
} 
});

$('#speedMain').on('click',function(event){
  var mgLeft = $('#copy-play').find('svg').css('margin-left');
  
  if($('.able-speed').text().indexOf(': 1.50x') != -1){
    thisObj.setPlaybackRate(1);
  //$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
  //$('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
  $('#speed').children('svg').remove();$('#speed').children('span').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('i').remove();
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' class=\"normalIcon\"></svg><span id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speed').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  //$('#speed').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'</svg><path d=''></path><span id=\"\">"+this.tt.speed+" normale</span>");
  $('#speed').removeClass("rabbitIcon");
  $('#speedMain').removeClass("rabbitIcon");
  $('#speed').removeClass("rabbitIcon");
  $('#speedMain').removeClass("rabbitIcon");
  $('#speed').addClass("normalIcon");
  $('#speedMain').addClass("normalIcon");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" normale</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();

} else if($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] != 'conPlus') {
  thisObj.setPlaybackRate(1.5)
  //$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
  //$('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
  //$('#speed').addClass("rabbitIcon");
  //$('#speedMain').addClass("rabbitIcon");
  //$('#speed').removeClass("turtleIcon");
  //$('#speedMain').removeClass("turtleIcon");
  $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('i').remove();
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" rapide</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();
} else if($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] === 'conPlus') {
    thisObj.setPlaybackRate(1)
    /*$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speed').removeClass("turtleIcon");
    $('#speedMain').removeClass("turtleIcon");
    $('#speed').addClass("normalIcon");
    $('#speedMain').addClass("normalIcon");*/
	$('#speed').children('svg').remove();$('#speed').children('span').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('i').remove();
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' class=\"normalIcon\"></svg><span id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speed').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span id=\"\">"+thisObj.tt.speed+" normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" normale</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();
    
} else if(($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] != 'sansVisionPlus') {
  thisObj.setPlaybackRate(0.5);
  /*$('#speed').children('span').text(thisObj.tt.speed+ ' ralentie');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' ralentie');
  $('#speed').removeClass("normalIcon");
  $('#speedMain').removeClass("normalIcon");
  $('#speed').addClass("turtleIcon");
  $('#speedMain').addClass("turtleIcon");*/
  $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" ralentie</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();

} else if(($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] === 'sansVisionPlus') {
  thisObj.setPlaybackRate(1.5);
  /*$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speed').removeClass("normalIcon");
  $('#speedMain').removeClass("normalIcon");
  $('#speed').addClass("rabbitIcon");
  $('#speedMain').addClass("rabbitIcon");*/
  $('#speed').children('svg').remove();$('#speed').children('span').remove();$('#speed').children('p').remove();$('#speed').children('i').remove();
  $('#speedMain').children('svg').remove();$('#speedMain').children('span').remove();$('#speedMain').children('p').remove();$('#speedMain').children('i').remove();
  $('#speed').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#speedMain').append("<svg style='float:left;margin-left:"+mgLeft+"' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>"+thisObj.tt.speed+" rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
   $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.speed+" rapide</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();

} 
  });


$('#subt').on('click',function(event){
  
if($('#subt').attr('aria-pressed') == 'true'){
  //Finally for Orange we copied handlcaption method for On/Off switch in control.js -> handleCaptionToggle
  thisObj.handleCaptionToggleOnOffOrange();
} else {
  if($('.able-button-handler-captions').length != 0){
    //Finally for Orange we copied handlcaption method for On/Off switch in control.js -> handleCaptionToggle
    thisObj.handleCaptionToggleOnOffOrange();
  }
}
  
});

$('#subtitlesFR').on('click',function(event){
  
  
 
  if($('#subtitlesFR').attr('aria-pressed') == 'false'){
     if($('#subt').attr('aria-pressed') == 'false'){
        thisObj.handleCaptionToggleOnOffOrange();
        $('#subt').attr('aria-pressed','true');
        $('#subt').attr('aria-label',thisObj.tt.de_act_st_label);
        $('#subt').addClass('aria-no-checked');
        $('#subt').text('');
        //$('#subt').addClass('subtno')
        $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");
      } 

      $('#subtitlesML').attr('aria-pressed','false');
      $('#subtitlesML').removeClass('aria-no-checked');
      $('#subtitlesML').removeClass('subtno');
      $('#subtitlesML').text('');
      $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

      //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
	    $('#subtitlesML').attr('aria-label',thisObj.tt.act_st_ml_label);
      
      // $('#subtitlesFR').attr('aria-pressed','true');
      // $('#subtitlesFR').addClass('aria-no-checked');
      // $('#subtitlesFR').addClass('subtno');
      // $('#subtitlesFR').text(thisObj.tt.de_act_st_fr);
      // $('#subtitlesFR').attr('aria-label',thisObj.tt.de_act_st_fr_label);

      $('#subtitlesEN').attr('aria-pressed','false');
      $('#subtitlesEN').removeClass('aria-no-checked');
      $('#subtitlesEN').removeClass('subtno');
      $('#subtitlesEN').text(thisObj.tt.act_st_en);
      $('#subtitlesEN').attr('aria-label',thisObj.tt.act_st_en_label);

      $('#subtitlesPL').attr('aria-pressed','false');
      $('#subtitlesPL').removeClass('aria-no-checked');
      $('#subtitlesPL').removeClass('subtno');
      $('#subtitlesPL').text(thisObj.tt.act_st_pl);
      $('#subtitlesPL').attr('aria-label',thisObj.tt.act_st_pl_label);

      $('#subtitlesES').attr('aria-pressed','false');
      $('#subtitlesES').removeClass('aria-no-checked');
      $('#subtitlesES').removeClass('subtno');
      $('#subtitlesES').text(thisObj.tt.act_st_es);
      $('#subtitlesES').attr('aria-label',thisObj.tt.act_st_es_label);
    
  } else {
    //$('#subt').click();
    // $('#subtitlesFR').attr('aria-pressed','false');
    // $('#subtitlesFR').removeClass('aria-no-checked');
    // $('#subtitlesFR').text(thisObj.tt.act_st_fr);
    // $('#subtitlesFR').removeClass('subtno');
    // $('#subtitlesFR').attr('aria-label',thisObj.tt.act_st_fr_label);
    //thisObj.hidingPopup = false;
    //thisObj.handleCaptionToggleOnOffOrange();
    
  }
    
});

$('#subtitlesEN').on('click',function(event){
  
  
  if($('#subtitlesEN').attr('aria-pressed') == 'false'){
    if($('#subt').attr('aria-pressed') == 'false'){
      thisObj.handleCaptionToggleOnOffOrange();
      $('#subt').attr('aria-pressed','true');
      $('#subt').attr('aria-label',thisObj.tt.de_act_st_label);
      $('#subt').addClass('aria-no-checked');
      $('#subt').text('');
      //$('#subt').addClass('subtno')
      $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");
   
    } 
    // $('#subtitlesEN').attr('aria-pressed','true');
    //   $('#subtitlesEN').addClass('aria-no-checked');
    //   $('#subtitlesEN').addClass('subtno');
    //   $('#subtitlesEN').text(thisObj.tt.de_act_st_en);
	  // $('#subtitlesEN').attr('aria-label',thisObj.tt.de_act_st_en_label);
	  // //thisObj.selectedCaptions.language = 'en';

      $('#subtitlesFR').attr('aria-pressed','false');
      $('#subtitlesFR').removeClass('aria-no-checked');
      $('#subtitlesFR').removeClass('subtno');
      $('#subtitlesFR').text(thisObj.tt.act_st_fr);
    $('#subtitlesFR').attr('aria-label',thisObj.tt.act_st_fr_label);
    
    $('#subtitlesML').attr('aria-pressed','false');
      $('#subtitlesML').removeClass('aria-no-checked');
      $('#subtitlesML').removeClass('subtno');
      $('#subtitlesML').text('');
      $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

      //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
	  $('#subtitlesML').attr('aria-label',thisObj.tt.act_st_ml_label);

      $('#subtitlesPL').attr('aria-pressed','false');
      $('#subtitlesPL').removeClass('aria-no-checked');
      $('#subtitlesPL').removeClass('subtno');
      $('#subtitlesPL').text(thisObj.tt.act_st_pl);
	  $('#subtitlesPL').attr('aria-label',thisObj.tt.act_st_pl_label);

      $('#subtitlesES').attr('aria-pressed','false');
      $('#subtitlesES').removeClass('aria-no-checked');
      $('#subtitlesES').removeClass('subtno');
      $('#subtitlesES').text(thisObj.tt.act_st_es);
	  $('#subtitlesES').attr('aria-label',thisObj.tt.act_st_es_label);
  } else {
      // $('#subt').click();
      // $('#subtitlesEN').attr('aria-pressed','false');
      // $('#subtitlesEN').removeClass('aria-no-checked');
      // $('#subtitlesEN').text(thisObj.tt.act_st_en);
      // $('#subtitlesEN').removeClass('subtno');
      // $('#subtitlesEN').attr('aria-label',thisObj.tt.act_st_en_label);
  
  }
    
});

$('#subtitlesES').on('click',function(event){
  if($('#subtitlesES').attr('aria-pressed') == 'false'){
    if($('#subt').attr('aria-pressed') == 'false'){
      thisObj.handleCaptionToggleOnOffOrange();
      $('#subt').attr('aria-pressed','true');
      $('#subt').attr('aria-label',thisObj.tt.de_act_st_label);
      $('#subt').addClass('aria-no-checked');
      $('#subt').text('');
      //$('#subt').addClass('subtno')
      $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");
   
    } 
	  // $('#subtitlesES').attr('aria-pressed','true');
    //   $('#subtitlesES').addClass('aria-no-checked');
    //   $('#subtitlesES').addClass('subtno');
    //   $('#subtitlesES').text(thisObj.tt.de_act_st_es);
    // $('#subtitlesES').attr('aria-label',thisObj.tt.de_act_st_es_label);
    
    $('#subtitlesML').attr('aria-pressed','false');
      $('#subtitlesML').removeClass('aria-no-checked');
      $('#subtitlesML').removeClass('subtno');
      $('#subtitlesML').text('');
      $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

      //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
	  $('#subtitlesML').attr('aria-label',thisObj.tt.act_st_ml_label);

      $('#subtitlesFR').attr('aria-pressed','false');
      $('#subtitlesFR').removeClass('aria-no-checked');
      $('#subtitlesFR').removeClass('subtno');
      $('#subtitlesFR').text(thisObj.tt.act_st_fr);
	  $('#subtitlesFR').attr('aria-label',thisObj.tt.act_st_fr_label);

      $('#subtitlesEN').attr('aria-pressed','false');
      $('#subtitlesEN').removeClass('aria-no-checked');
      $('#subtitlesEN').removeClass('subtno');
      $('#subtitlesEN').text(thisObj.tt.act_st_en);
	  $('#subtitlesEN').attr('aria-label',thisObj.tt.act_st_en_label);

      $('#subtitlesPL').attr('aria-pressed','false');
      $('#subtitlesPL').removeClass('aria-no-checked');
      $('#subtitlesPL').removeClass('subtno');
      $('#subtitlesPL').text(thisObj.tt.act_st_pl);
	  $('#subtitlesPL').attr('aria-label',thisObj.tt.act_st_pl_label);

  } else {
    // $('#subt').click();
    //   $('#subtitlesES').attr('aria-pressed','false');
    //   $('#subtitlesES').removeClass('aria-no-checked');
    //   $('#subtitlesES').text(thisObj.tt.act_st_es);
    //   $('#subtitlesES').removeClass('subtno');
	  // $('#subtitlesES').attr('aria-label',thisObj.tt.act_st_es_label);
  
  }
    
});

$('#subtitlesPL').on('click',function(event){
  if($('#subtitlesPL').attr('aria-pressed') == 'false'){
    if($('#subt').attr('aria-pressed') == 'false'){
      thisObj.handleCaptionToggleOnOffOrange();
      $('#subt').attr('aria-pressed','true');
      $('#subt').attr('aria-label',thisObj.tt.de_act_st_label);
      $('#subt').addClass('aria-no-checked');
      $('#subt').text('');
      //$('#subt').addClass('subtno')
      $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");
   
    } 

    $('#subtitlesML').attr('aria-pressed','false');
      $('#subtitlesML').removeClass('aria-no-checked');
      $('#subtitlesML').removeClass('subtno');
      $('#subtitlesML').text('');
      $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> "+thisObj.tt.act_st_ml+"</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

      //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
    $('#subtitlesML').attr('aria-label',thisObj.tt.act_st_ml_label);
    
    // $('#subtitlesPL').attr('aria-pressed','true');
    //   $('#subtitlesPL').addClass('aria-no-checked');
    //   $('#subtitlesPL').addClass('subtno');
    //   $('#subtitlesPL').text(thisObj.tt.de_act_st_pl);
	  // $('#subtitlesPL').attr('aria-label',thisObj.tt.de_act_st_pl_label);

      $('#subtitlesFR').attr('aria-pressed','false');
      $('#subtitlesFR').removeClass('aria-no-checked');
      $('#subtitlesFR').removeClass('subtno');
      $('#subtitlesFR').text(thisObj.tt.act_st_fr);
	  $('#subtitlesFR').attr('aria-label',thisObj.tt.act_st_fr_label);

      $('#subtitlesEN').attr('aria-pressed','false');
      $('#subtitlesEN').removeClass('aria-no-checked');
      $('#subtitlesEN').removeClass('subtno');
      $('#subtitlesEN').text(thisObj.tt.act_st_en);
	  $('#subtitlesEN').attr('aria-label',thisObj.tt.act_st_en_label);

      $('#subtitlesES').attr('aria-pressed','false');
      $('#subtitlesES').removeClass('aria-no-checked');
      $('#subtitlesES').removeClass('subtno');
      $('#subtitlesES').text(thisObj.tt.act_st_es);
	  $('#subtitlesES').attr('aria-label',thisObj.tt.act_st_es_label);

  } else {
    // $('#subt').click();
    //   $('#subtitlesPL').attr('aria-pressed','false');
    //   $('#subtitlesPL').removeClass('aria-no-checked');
    //   $('#subtitlesPL').text(thisObj.tt.act_st_pl);
    //   $('#subtitlesPL').removeClass('subtno');
	  // $('#subtitlesPL').attr('aria-label',thisObj.tt.act_st_pl_label);
  }
    
});

$('#subtitlesML').on('click',function(event){
  if($('#subtitlesML').attr('aria-pressed') == 'false'){
    if($('#subt').attr('aria-pressed') == 'false'){
      thisObj.handleCaptionToggleOnOffOrange();
      $('#subt').attr('aria-pressed','true');
      $('#subt').attr('aria-label',thisObj.tt.de_act_st_label);
      $('#subt').addClass('aria-no-checked');
      $('#subt').text('');
      //$('#subt').addClass('subtno')
      $('#subt').append("<span id=\"\">"+thisObj.tt.de_act_st_general+"</span>");
   
    } 

      $('#subtitlesPL').attr('aria-pressed','false');
      $('#subtitlesPL').removeClass('aria-no-checked');
      $('#subtitlesPL').removeClass('subtno');
      $('#subtitlesPL').text(thisObj.tt.act_st_pl);
      $('#subtitlesPL').attr('aria-label',thisObj.tt.act_st_pl_label);
    
      // $('#subtitlesML').attr('aria-pressed','true');
      // $('#subtitlesML').addClass('aria-no-checked');
      // $('#subtitlesML').text('');
      // $('#subtitlesML').append("<span id=\"\">"+thisObj.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
	    // $('#subtitlesML').attr('aria-label',thisObj.tt.de_act_st_ml_label);

      $('#subtitlesFR').attr('aria-pressed','false');
      $('#subtitlesFR').removeClass('aria-no-checked');
      $('#subtitlesFR').removeClass('subtno');
      $('#subtitlesFR').text(thisObj.tt.act_st_fr);
	    $('#subtitlesFR').attr('aria-label',thisObj.tt.act_st_fr_label);

      $('#subtitlesEN').attr('aria-pressed','false');
      $('#subtitlesEN').removeClass('aria-no-checked');
      $('#subtitlesEN').removeClass('subtno');
      $('#subtitlesEN').text(thisObj.tt.act_st_en);
	    $('#subtitlesEN').attr('aria-label',thisObj.tt.act_st_en_label);

      $('#subtitlesES').attr('aria-pressed','false');
      $('#subtitlesES').removeClass('aria-no-checked');
      $('#subtitlesES').removeClass('subtno');
      $('#subtitlesES').text(thisObj.tt.act_st_es);
	  $('#subtitlesES').attr('aria-label',thisObj.tt.act_st_es_label);

  } else {
      // $('#subt').click();
      // $('#subtitlesML').attr('aria-pressed','false');
      // $('#subtitlesML').removeClass('aria-no-checked');
      // $('#subtitlesML').text('');
      // $('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
      // //$('#subtitlesML').removeClass('subtno');
	    // $('#subtitlesML').attr('aria-label',thisObj.tt.act_st_ml_label);
  }
    
});

// $('.able').bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
//   var state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
//   var event = state ? 'FullscreenOn' : 'FullscreenOff';

//   // Now do something interesting
//   alert('Event: ' + event);    
// });
this.$ableWrapper.bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
  var state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
  var event = state ? 'FullscreenOn' : 'FullscreenOff';

  // Now do something interesting
     
  if(thisObj.isFullscreen() == false){//exit fullscreen
          $('.able-wrapper').css('position','');
          $('.able-wrapper').css('width','');
          $('.able-wrapper').css('height','');
          $('.able-wrapper').css('padding','');
          $('.able-wrapper').css('margin','');
          $('.able-wrapper').css('top','');
          $('.able-wrapper').css('left','');
          $('.able-wrapper').css('max-width',thisObj.playerMaxWidth+'px');
          $('.able-wrapper').css('background','');
          $('.able-wrapper').css('overflow','');
          $('.able-big-play-button').css('height',$('.video-accessible').height()+'px');
          $('.able-big-play-button').css('width',$('.video-accessible').width()+'px');
          thisObj.restoringAfterFullScreen = true;
          thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
          var wasShow = $('[class^="controller-orange"]').filter(":visible");
          if(wasShow.length > 1){
            thisObj.$controllerOrangeDiv.css('display','none');
          }
          
          thisObj.checkContextVidTranscr();
          thisObj.resizePlayer();
  }  else {
    setTimeout(function(){
      if(thisObj.getCookie()['preferences']['prefModeUsage'] != 'profDef'){
        thisObj.$wasShow.attr('style','display:block');
      }
      //thisObj.checkContextVidTranscr();
      thisObj.resizeAccessMenu();
    }, 300);
  }
  
});

document.addEventListener("fullscreenchange webkitfullscreenchange", function() {
  
  thisObj.resizePlayer();
  if(thisObj.isFullscreen() == true){
    //enter
  } else {
    //exit with escape
    $('#acc-menu-id').css('display','initial');
    if(thisObj.getCookie()['preferences']['prefSign'] === 1 && thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true'){
          
      thisObj.$ableDiv.css('width','67%');
      thisObj.$signWindow.css('width','33%');
      thisObj.$signWindow.css('left','67%');
      thisObj.$signWindow.css('position','absolute');
      thisObj.$signWindow.css('top','0px');
      thisObj.$signWindow.css('margin','0px');
      if(thisObj.getCookie()['preferences']['prefTranscript'] === 1){
        var takePadding = 0;
        if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
          takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
        }
        thisObj.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
        thisObj.$transcriptArea .css('width','66%');
        thisObj.$transcriptArea .css('left','33%');
      }
    } else if(thisObj.getCookie()['preferences']['prefTranscript'] === 1 && thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true') {
      thisObj.$transcriptArea.css('top','0px');
      thisObj.$transcriptArea .css('width','66%');
      thisObj.$transcriptArea .css('left','33%');
      thisObj.$ableDiv.css('width','33%');
    }
  }
});

$('#lsf').on('click',function(event){
  
if($('#lsf').attr('aria-checked') == 'true'){
//  thisObj.handleSignToggle();
//  $('#lsf').attr('aria-checked','false');
//  $('#lsf').removeClass('aria-no-checked');
//  $('#lsf').children('span').text(thisObj.tt.lsfact);
//  if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) && this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
//     if(thisObj.getCookie()['preferences']['prefTranscript'] === 0){
//       thisObj.$ableDiv.css('width','100%');
//     }  else {
//       thisObj.$transcriptArea.css('top','0px');
//     }
//     var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src; 
//     //put video sign in the second container
//     thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
//     thisObj.$mediaContainer.find('video')[0].load();
//     //put video in the first containre
//     thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
//     thisObj.$signWindow.find('video')[0].load();
//  }
//  $('#lsf').removeClass('lsfno');
//  $('#lsf').children('svg').children('line').css('display','none');

  //new version 06/08/2020
  $('#lsf').attr('aria-checked','false');
  $('#lsf').removeClass('aria-no-checked');
  $('#lsf').children('span').text(thisObj.tt.lsfact);
  $('#lsf').children('svg').children('line').css('display','block');
  //thisObj.setDefaultPref();
  
  if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src'))){
    
    //save time video
    var elapsed = thisObj.getElapsed();
    if(thisObj.getCookie()['preferences']['prefTranscript'] === 0){
      thisObj.$ableDiv.css('width','100%');
    }  else {
      thisObj.$transcriptArea.css('top','0px');
    }
    var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src; 
    //put video sign in the second container
    thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
    thisObj.$mediaContainer.find('video')[0].load();
    //put video in the first containre
    thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
    thisObj.$signWindow.find('video')[0].load();
    thisObj.$signWindow.hide();
    thisObj.swappingSrc = true;
    thisObj.swapTime = elapsed;
  }
  if (thisObj.isMuted() === true) {
    thisObj.handleMute();
  }
  $('#vidcontr2').css('display','none');
  if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src'))){
    //save time video
    var elapsed = thisObj.getElapsed();
    if(thisObj.getCookie()['preferences']['prefTranscript'] === 0){
      thisObj.$ableDiv.css('width','100%');
    }  else {
      thisObj.$transcriptArea.css('top','0px');
    }
    var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src; 
    //put video sign in the second container
    thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
    thisObj.$mediaContainer.find('video')[0].load();
    //put video in the first containre
    thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
    thisObj.$signWindow.find('video')[0].load();
    thisObj.swappingSrc = true;
    thisObj.swapTime = elapsed;
  }
  thisObj.prefSign = 0; 
  thisObj.updateCookie('prefSign');
} else {
//if($('.able-button-handler-sign').length != 0){
  //activate sign
 // thisObj.handleSignToggle();
  // if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) === false && this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
  //   thisObj.$ableDiv.css('width','33%');
  //   thisObj.$signWindow.css('width','66%');
  //   thisObj.$signWindow.css('left','33%');
  //   thisObj.$signWindow.css('position','absolute');
  //   thisObj.$signWindow.css('top','0px');
  //   thisObj.$signWindow.css('margin','0px');
  //    //put video sign in the first container
  //   var svgVideoSrc = thisObj.$mediaContainer.find('video').find('source')[0].src; 
  //   thisObj.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
  //   thisObj.$mediaContainer.find('video')[0].load();
  //   //put video in the second containre
  //   thisObj.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
  //   thisObj.$signWindow.find('video')[0].load();
  //   if(thisObj.getCookie()['preferences']['prefTranscript'] === 1){
  //     var takePadding = 0;
  //     if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
  //       takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
  //     }
  //     thisObj.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
  //   }
  // }
  // $('#lsf').attr('aria-checked','true');
  // $('#lsf').addClass('aria-no-checked');
  // $('#lsf').children('span').text(thisObj.tt.lsfno);
  // $('#lsf').addClass('lsfno');
  // $('#lsf').children('svg').children('line').css('display','block');

  //new version 06/08/2020
  $('#speedMain').css('display','none');
  //thisObj.setDefaultPref();
  $('#lsf').attr('aria-checked','true');
  $('#lsf').addClass('aria-no-checked');
  $('#lsf').children('span').text(thisObj.tt.lsfno);
  thisObj.positionDraggableWindow('sign');
  $('#lsf').children('svg').children('line').css('display','none');
  thisObj.$signWindow.show();
  if(thisObj.$signButton != undefined){
    thisObj.$signButton.removeClass('buttonOff').attr('aria-label',thisObj.tt.hideSign);
    thisObj.$signButton.find('span.able-clipped').text(thisObj.tt.hideSign);
  }
  thisObj.prefSign = 1; 
  if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) === false){
    //save time video
    var elapsed = thisObj.getElapsed();
    // thisObj.$ableDiv.css('width','67%');
    // thisObj.$signWindow.css('width','33%');
    // thisObj.$signWindow.css('left','67%');
    thisObj.$ableDiv.css('width',100-thisObj.getCookie()['preferences']['prefVidSize']+'%');
    thisObj.$signWindow.css('width',thisObj.getCookie()['preferences']['prefVidSize']+'%');
    thisObj.$signWindow.css('left',100-thisObj.getCookie()['preferences']['prefVidSize']+'%');
    thisObj.$signWindow.css('position','absolute');
    thisObj.$signWindow.css('top','0px');
    thisObj.$signWindow.css('margin','0px');
    //put video sign in the first container
    var svgVideoSrc = thisObj.$mediaContainer.find('video').find('source')[0].src; 
    thisObj.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
    
    
    thisObj.$mediaContainer.find('video')[0].load();
    //put video in the second containre
    thisObj.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
    thisObj.$signWindow.find('video')[0].load();
    thisObj.swappingSrc = true;
    thisObj.swapTime = elapsed;
  }
  thisObj.updateCookie('prefSign');
  if (thisObj.isMuted() === false) {
    thisObj.handleMute();
  }
  $('#vidcontr2').css('display','block');
  thisObj.$playerDiv.css('width',(thisObj.$ableWrapper.width())+'px');
//}
}
//test
thisObj.checkContextVidTranscr();	
});

$('#audiodesc').on('click',function(event){
if($('#audiodesc').attr('aria-checked') === 'false'){
  thisObj.handleDescriptionToggle();
  // $('#audiodesc').attr('aria-checked','true');
  // $('#audiodesc').addClass('aria-no-checked');
  // $('#audiodesc').children('svg').children('line').css('display','block');
  // $('#audiodesc').children('span').text(thisObj.tt.audiodescno);
  // $('#audiodesc').addClass('audiodescno')
} else {
  ///if($('.able-button-handler-descriptions').length != 0){
    thisObj.handleDescriptionToggle();
    // $('#audiodesc').attr('aria-checked','false');
    // $('#audiodesc').removeClass('aria-no-checked');
    // $('#audiodesc').children('svg').children('line').css('display','none');
    // $('#audiodesc').children('span').text(thisObj.tt.audiodescact);

    // 
    // $('#audiodesc').removeClass('audiodescno');
  //}
}	
});

$('#transcr').on('click',function(event){


if($('#transcr').attr('aria-checked') === 'false'){
  thisObj.handleTranscriptToggle();
  // $('#transcr').attr('aria-checked','true');
  //   $('#transcr').addClass('aria-no-checked');
  //   $('#transcr').children('svg').children('line').css('display','block');
  //   $('#transcr').children('span').text(thisObj.tt.transcrno);
  //   if(thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true'){
  //     thisObj.$ableDiv.css('width','33%');
  //     thisObj.$transcriptArea.css('width','66%');
  //     thisObj.$transcriptArea.css('left','33%');
  //     thisObj.$transcriptArea.css('position','absolute');
  //     
  //     
  //     if(thisObj.getCookie()['preferences']['prefSign'] === 1){
  //       var takePadding = 0;
  //         if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
  //           takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
  //         }
  //         thisObj.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
  //     } else {
  //       thisObj.$transcriptArea.css("top","1px");
  //       $('.able-transcript-area').css("top","1px");
  //     }
  //   }
  //   $('#transcr').addClass('transcrno')
} else {
  //if($('.able-button-handler-transcript').length != 0){
  //activate sign
  thisObj.handleTranscriptToggle();
  // $('#transcr').attr('aria-checked','false');
  //   $('#transcr').removeClass('aria-no-checked');
  //   $('#transcr').children('svg').children('line').css('display','none');
  //   if($('#transcr').children('span').text()!=thisObj.tt.transcract){
  //     $('#transcr').children('span').text(thisObj.tt.transcract);
  //   }
  //   $('#transcr').removeClass('transcrno');
  //   if(thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true' && thisObj.getCookie()['preferences']['prefSign'] === 0){
  //     thisObj.$ableDiv.css('width','100%');
  //     thisObj.$transcriptArea.css('top','0 px');
  //   }
  //}
}	
});

$('.vidcontr').on('click',function(event){
//
    //
	//thisObj.playing = false ; 


if($('.vidcontr').attr('aria-checked') == 'true' || $('#vidcontr').attr('aria-checked') == 'true'){
 $('.vidcontr').attr('aria-checked','false');
 $('.vidcontr').attr('aria-label',thisObj.tt.vidcontrno);
 var vids = $(document.getElementsByTagName('video'));
    for (var i=0; i<vids.length; i++) {
      $(vids[i]).css('filter','');
      $(vids[i]).css('filter','');
      $(vids[i]).css('background-color','transparent');
      if($(vids[i]).hasClass('video-accessible-sign')){
        $(vids[i]).css('background-color','black');
      } else {
        $(vids[i]).css('background-color','lightgray');
      }
      
    }
// $('#video1').css('filter','');
// $('#video1-sign').css('filter','');
// $('#video1-sign').css('background-color','transparent');
//thisObj.swapSource(0);
$('.vidcontr').text('');
$('.vidcontr').removeClass('vidcontrno')
 $('.vidcontr').append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
 $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.vidcontrno+" activée</p>").appendTo(document.body);

} else {
 $('.vidcontr').attr('aria-checked','true');
  var vids = $(document.getElementsByTagName('video'));
    for (var i=0; i<vids.length; i++) {
      $(vids[i]).css('filter','grayscale(100%) contrast(150%)');
      $(vids[i]).css('filter','grayscale(100%) contrast(150%)');
      $(vids[i]).css('background-color','black');
    }
// $('#video1').css('filter','grayscale(100%) contrast(150%)');
// $('#video1-sign').css('filter','grayscale(100%) contrast(150%)');
// $('#video1-sign').css('background-color','black');
//thisObj.swapSource(1);
  $('.vidcontr').addClass('vidcontrno');
  $('.vidcontr').attr('aria-label',thisObj.tt.vidcontr);
  $('.vidcontr').text('');
  $('.vidcontr').append("<svg class=\"captions\" style='box-shadow:1px 1px 0px #aaa;margin-left:"+$('#copy-play').find('svg').css('margin-left')+"'></svg><span id=\"\" class='spanButton'>"+thisObj.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
  $('#alertspeed').remove();
  $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.vidcontr+" activée</p>").appendTo(document.body);
  thisObj.resizeAccessMenu();  
}	
});

//New settings preferences events
$('.vplus').on('click',function(event){
  thisObj.handleChangeProfil('vplus')
});
$('.svplus').on('click',function(event){
  thisObj.handleChangeProfil('svplus')
});
$('.lsfplus').on('click',function(event){
  thisObj.handleChangeProfil('lsfplus')
});
$('.conplus').on('click',function(event){
  thisObj.handleChangeProfil('conplus')
});
$('.audplus').on('click',function(event){
  thisObj.handleChangeProfil('audplus')
});
$('.profdef').on('click',function(event){
  thisObj.handleChangeProfil('profdef')
});
$('#visionPlus').on('click',function(event){
  
  
  if($('#visionPlus').attr('aria-pressed') === 'true'){
      // $('#visionPlus').attr('aria-pressed','false');
      // $('#visionPlus').removeClass('aria-no-checked');
      // $('#speedMain').css('display','none');
      // thisObj.setDefaultPref();

      // thisObj.$buttonProfilDefaut.click();
      // thisObj.accessPopup.find('input').last().onclick();
  } else {
    for (var q=0;q<thisObj.accessPopup.find('input:radio').length;q++){
      thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked',false)
      thisObj.accessPopup.find('li').removeClass('able-focus')
    }
    thisObj.accessPopup.find('input:radio[value=' + 0 + ']').prop('checked',true)
    $('#vidcontr2').css('display','none');
    thisObj.setDefaultPref();
    $('#visionPlus').attr('aria-pressed','true');
    $('#visionPlus').addClass('aria-no-checked');
    thisObj.prefCaptionsFont = 'Arial';
    thisObj.prefCaptionsColor = 'white';
    thisObj.prefCaptionsSize = '100%';
    thisObj.prefModeUsage = 'visionPlus';
    $('#' + thisObj.mediaId + '_' + 'prefCaptionsFont').val('Arial');
    $('#' + thisObj.mediaId + '_' + 'prefCaptionsColor').val('white');
    $('#' + thisObj.mediaId + '_' + 'prefCaptionsSize').val('100%');
    thisObj.updateCookie('prefCaptionsFont');
    thisObj.updateCookie('prefCaptionsColor');
    thisObj.updateCookie('prefCaptionsSize');
    thisObj.updateCookie('prefModeUsage');
    $('.able-captions').css('font-family', thisObj.prefCaptionsFont);
    $('.able-captions').css('color', thisObj.prefCaptionsColor);
    $('.able-captions').css('font-size', thisObj.prefCaptionsSize);
    $('.able-descriptions').css('font-family', thisObj.prefCaptionsFont);
    $('.able-descriptions').css('color', thisObj.prefCaptionsColor);
    $('.able-descriptions').css('font-size', thisObj.prefCaptionsSize);

    //mettre le contraste
    var vids = $(document.getElementsByTagName('video'));
    for (var i=0; i<vids.length; i++) {
      $(vids[i]).css('filter','grayscale(100%) contrast(150%)');
      $(vids[i]).css('filter','grayscale(100%) contrast(150%)');
      $(vids[i]).css('background-color','black');
    }
    $('.vidcontr').text('');
    $('.vidcontr').append("<svg class=\"captions\" style='box-shadow:1px 1px 0px #aaa;margin-left:"+$('#copy-play').find('svg').css('margin-left')+"'></svg><span id=\"\" '>"+thisObj.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
    $('#alertspeed').remove();
    $("<p id='alertspeed' style='color:transparent' role='alert'>"+thisObj.tt.vidcontr+" activée</p>").appendTo(document.body);
    $('.vidcontr').addClass('vidcontrno');
    $('.vidcontr').attr('aria-label',thisObj.tt.vidcontr);
    $('.vidcontr').attr('aria-checked',true);
    //Attention faire aussi apparaitre le bouton bacule de vitesse de la vidéo
    $('#speedMain').css('display','block');

    if(thisObj.getCookie()['preferences']['prefCaptions'] == '0'){//si ss pas activer, les activer
      thisObj.getCaptionOffFunction();
      thisObj.handleCaptionToggleOnOffOrange();
    }

  }

  thisObj.checkContextVidTranscr();
  
});

$('#sansVisionPlus').on('click',function(event){
  if($('#sansVisionPlus').attr('aria-pressed') === 'true'){
    
      // $('#sansVisionPlus').attr('aria-pressed','false');
      // $('#sansVisionPlus').removeClass('aria-no-checked');
      // $('#audiodesc').attr('aria-checked','false');
      // $('#audiodesc').removeClass('aria-no-checked');
      // $('#audiodesc').children('span').text(thisObj.tt.audiodescact);
      // $('#audiodesc').children('svg').children('line').css('display','block');
      // $('#speedMain').css('display','none');
      // thisObj.setDefaultPref();
      
      // thisObj.$buttonProfilDefaut.click();
      // thisObj.accessPopup.find('input').last().onclick();
  } else {
    
      for (var q=0;q<thisObj.accessPopup.find('input:radio').length;q++){
        thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked',false)
        thisObj.accessPopup.find('li').removeClass('able-focus')
      }
      thisObj.accessPopup.find('input:radio[value=' + 1 + ']').prop('checked',true)
      $('#vidcontr2').css('display','none');
      thisObj.setDefaultPref();
      $('#sansVisionPlus').attr('aria-pressed','true');
      $('#sansVisionPlus').addClass('aria-no-checked');
      $('#audiodesc').attr('aria-pressed','true');
      $('#audiodesc').addClass('aria-no-checked');
      $('#audiodesc').children('span').text(thisObj.tt.audiodescno);
      $('#audiodesc').children('svg').children('line').css('display','none');
      if($('#audiodesc').attr('aria-pressed') == 'false'){
        thisObj.handleDescriptionToggle();
      } else {
        $('#audiodesc').attr('aria-pressed','true');
        $('#audiodesc').addClass('aria-no-checked');
        $('#audiodesc').children('span').text(thisObj.tt.audiodescno);
        $('#audiodesc').children('svg').children('line').css('display','none');
      }
      
      thisObj.prefDesc = 1; 
      thisObj.prefModeUsage = 'sansVisionPlus';
      thisObj.updateCookie('prefDesc');
      thisObj.updateCookie('prefModeUsage');
      thisObj.refreshingDesc = true;
      thisObj.initDescription();
      thisObj.refreshControls();
      $('#speedMain').css('display','block');
      if(thisObj.getCookie()['preferences']['prefCaptions'] == '1'){//si ss activer, les désactiver
        
        thisObj.handleCaptionToggleOnOffOrange();
        thisObj.getCaptionOffFunction();
        thisObj.captionsPopup.find('input').last().prop('checked',true);
      }
  }
  thisObj.checkContextVidTranscr();
  
});
$('#auditionPlus').on('click',function(event){
  if($('#auditionPlus').attr('aria-pressed') === 'true'){
      // $('#auditionPlus').attr('aria-pressed','false');
      // $('#auditionPlus').removeClass('aria-no-checked');
      // thisObj.setDefaultPref();

	    // $('.able-captions').removeClass('audplus');
      // thisObj.$buttonProfilDefaut.click();
      // thisObj.accessPopup.find('input').last().onclick();
  } else {
    
    for (var q=0;q<thisObj.accessPopup.find('input:radio').length;q++){
      thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked',false)
      thisObj.accessPopup.find('li').removeClass('able-focus')
    }
    thisObj.accessPopup.find('input:radio[value=' + 4 + ']').prop('checked',true)
    $('#vidcontr2').css('display','none');
    $('#speedMain').css('display','none');
    thisObj.setDefaultPref();
    $('#auditionPlus').attr('aria-pressed','true');
    $('#auditionPlus').addClass('aria-no-checked');
    thisObj.prefModeUsage = 'auditionPlus';
    thisObj.updateCookie('prefModeUsage');
	  $('.able-captions').addClass('audplus');
    $('.translateLg').addClass('audplus');
    if(thisObj.getCookie()['preferences']['prefCaptions'] == '0'){//si ss pas activer, les activer
      thisObj.getCaptionOffFunction();
      thisObj.handleCaptionToggleOnOffOrange();
    }
  }
  thisObj.checkContextVidTranscr();
  
});
$('#lsfPlus').on('click',function(event){
  if($('#lsfPlus').attr('aria-pressed') === 'true'){
      // $('#lsfPlus').attr('aria-pressed','false');
      // $('#lsfPlus').removeClass('aria-no-checked');
      // $('#lsf').attr('aria-checked','false');
      // $('#lsf').removeClass('aria-no-checked');
      // $('#lsf').children('span').text(thisObj.tt.lsfact);
      // $('#lsf').children('svg').children('line').css('display','block');
      // thisObj.setDefaultPref();
      // if (thisObj.isMuted() === true) {
      //   thisObj.handleMute();
      // }
      // $('#vidcontr2').css('display','none');
      // if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src'))){
      //   //save Time
      //   var elapsed = thisObj.getElapsed();
      //   if(thisObj.getCookie()['preferences']['prefTranscript'] === 0){
      //     thisObj.$ableDiv.css('width','100%');
      //   }  else {
      //     thisObj.$transcriptArea.css('top','0px');
      //   }
      //   var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src; 
      //   //put video sign in the second container
      //   thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
      //   thisObj.$mediaContainer.find('video')[0].load();
      //   //put video in the first containre
      //   thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
      //   thisObj.$signWindow.find('video')[0].load();
      //   thisObj.swappingSrc = true;
      //   thisObj.swapTime = elapsed;

      // }
      
      // thisObj.$buttonProfilDefaut.click();
      // thisObj.accessPopup.find('input').last().onclick();
  } else {
    for (var q=0;q<thisObj.accessPopup.find('input:radio').length;q++){
      thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked',false)
      thisObj.accessPopup.find('li').removeClass('able-focus')
    }
    thisObj.accessPopup.find('input:radio[value=' + 2 + ']').prop('checked',true)
    $('#speedMain').css('display','none');
    thisObj.setDefaultPref();
    $('#lsfPlus').attr('aria-pressed','true');
    $('#lsfPlus').addClass('aria-no-checked');
    $('#lsf').attr('aria-checked','true');
    $('#lsf').addClass('aria-no-checked');
    $('#lsf').children('span').text(thisObj.tt.lsfno);
    thisObj.prefModeUsage = 'lsfPlus';
    thisObj.updateCookie('prefModeUsage');
    thisObj.positionDraggableWindow('sign');
    $('#lsf').children('svg').children('line').css('display','none');
    thisObj.$signWindow.show();
    if(thisObj.$signButton != undefined){
      thisObj.$signButton.removeClass('buttonOff').attr('aria-label',thisObj.tt.hideSign);
      thisObj.$signButton.find('span.able-clipped').text(thisObj.tt.hideSign);
    }
    thisObj.prefSign = 1; 
    if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) === false){
      //save Time
      var elapsed = thisObj.getElapsed();
      thisObj.$ableDiv.css('width','67%');
      thisObj.$signWindow.css('width','33%');
      thisObj.$signWindow.css('left','67%');
      thisObj.$signWindow.css('position','absolute');
      thisObj.$signWindow.css('top','0px');
      thisObj.$signWindow.css('margin','0px');
      //put video sign in the first container
      var svgVideoSrc = thisObj.$mediaContainer.find('video').find('source')[0].src; 
      thisObj.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
      thisObj.$mediaContainer.find('video')[0].load();
      //put video in the second containre
      thisObj.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
      thisObj.$signWindow.find('video')[0].load();
      thisObj.swappingSrc = true;
      thisObj.swapTime = elapsed;
    }
    thisObj.updateCookie('prefSign');
    if (thisObj.isMuted() === false) {
      thisObj.handleMute();
    }
    if(thisObj.getCookie()['preferences']['prefCaptions'] == '1'){//si sous tittre activé, les désactiver
      
      thisObj.handleCaptionToggleOnOffOrange();
      thisObj.getCaptionOffFunction();
      thisObj.captionsPopup.find('input').last().prop('checked',true);
    }
    thisObj.$playerDiv.css('width',(thisObj.$ableWrapper.width())+'px');
    $('#vidcontr2').css('display','block');
    thisObj.checkContextVidTranscr();
    
  }
  
});
$('#profDef').on('click',function(event){
  
  
  if($('#profDef').attr('aria-pressed') === 'true'){
      $('#profDef').attr('aria-pressed','false');
      $('#profDef').removeClass('aria-no-checked');
  } else {
    thisObj.setDefaultPref();
    //reload all pref to def
    thisObj.$buttonOutNo.click();
    thisObj.$button100.click();
    thisObj.$buttonArial.click();
    $('.able-captions').css('color', 'white');
    $('#profDef').attr('aria-pressed','true');
    $('#profDef').addClass('aria-no-checked');
    thisObj.setCaptionsOn(false,thisObj.captionLang);
    for (var q=0;q<thisObj.accessPopup.find('input:radio').length;q++){
      
      
      thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked',false)
      thisObj.accessPopup.find('li').removeClass('able-focus');
    }
    thisObj.accessPopup.find('input:radio[value=' + 5 + ']').prop('checked',true)
    if(thisObj.prefAccessMenu == "true"){
      thisObj.prefAccessMenu = "false";
      thisObj.updateCookie('prefAccessMenu');
    }
    //$('#acc-menu-id').click();
    $('#' + thisObj.mediaId + '_' + 'prefAccessMenu').val('false');
    $('#acc-menu-id').text(thisObj.tt.showAccMenu);
    thisObj.prefModeUsage = 'profDef';
    thisObj.updateCookie('prefModeUsage');
    $('.able').css("width","100%");
    if(thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) && thisObj.getCookie()['preferences']['prefSign'] == 1){
        //save Time
        var elapsed = thisObj.getElapsed();
        if(thisObj.getCookie()['preferences']['prefTranscript'] === 0){
          thisObj.$ableDiv.css('width','100%');
        } else {
          thisObj.$transcriptArea.css('top','0px');
        }
        var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src; 
        //put video sign in the second container
        thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
        thisObj.$mediaContainer.find('video')[0].load();
        //put video in the first containre
        thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
        thisObj.$signWindow.find('video')[0].load();
        thisObj.swappingSrc = true;
        thisObj.swapTime = elapsed;
    }
    $('.controller-orange-main').attr("style","display:none");
    $('.controller-orange-volume').attr("style","display:none");
    $('.controller-orange-settings').attr("style","display:none");
    $('.controller-orange-subtitles').attr("style","display:none");
    $('.controller-orange-preferences').attr("style","display:none");
    $('.controller-orange-perception').attr("style","display:none");
    $('.controller-orange-textcolor').attr("style","display:none");
    $('.controller-orange-bgcolor').attr("style","display:none");
    $('.controller-orange-followcolor').attr("style","display:none");
    $('.controller-orange-fontsize').attr("style","display:none");
    $('.controller-orange-outfont').attr("style","display:none");
    $('.controller-orange-font').attr("style","display:none");
    $('.controller-orange-butcol').attr("style","display:none");
    $('.controller-orange-reglages').attr("style","display:none");
    thisObj.checkContextVidTranscr();
    //.css('display','none');
    
  }
});
$('#defPlus').on('click',function(event){
  if($('#defPlus').attr('aria-pressed') === 'true'){
      $('#defPlus').attr('aria-pressed','false');
      $('#defPlus').removeClass('aria-no-checked');
      $('#defPlus').removeClass('firstTime');
      thisObj.setDefaultPref();
      if (thisObj.isMuted() === true) {
        thisObj.handleMute();
      }
      $('#vidcontr2').css('display','none');
  } else {
    $('#vidcontr2').css('display','none');
    $('#speedMain').css('display','none');
    if($('#defPlus').hasClass('firstTime') === false){// this.$buttonDefPlus.addClass('firstTime');
      thisObj.setDefaultPref();
    }
    $('#defPlus').attr('aria-pressed','true');
    $('#defPlus').removeClass('firstTime');
    $('#defPlus').addClass('aria-no-checked');
    thisObj.prefModeUsage = 'defPlus';
    thisObj.updateCookie('prefModeUsage');

    thisObj.$timerOrange = setInterval(myTimer, 1000);
    
    thisObj.checkContextVidTranscr();
    
  }
  
});

$('#conPlus').on('click',function(event){
  if($('#conPlus').attr('aria-pressed') === 'true'){
      // $('#conPlus').attr('aria-pressed','false');
      // $('#conPlus').removeClass('aria-no-checked');
      // $('#transcr').attr('aria-checked','false');
      // $('#transcr').removeClass('aria-no-checked');
      // $('#transcr').children('span').text(thisObj.tt.transcract);
      // $('#transcr').children('svg').children('line').css('display','block');
      // thisObj.setDefaultPref();
      // if (thisObj.isMuted() === true) {
      //   thisObj.handleMute();
      // }
      // $('#vidcontr2').css('display','none');
      // $('#speedMain').css('display','none');
      // if(thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true' && thisObj.getCookie()['preferences']['prefSign'] === 0){
      //   thisObj.$ableDiv.css('width','100%');
      //   thisObj.$transcriptArea.css('top','0 px');
      // }
      // thisObj.checkContextVidTranscr();
      
      // thisObj.$buttonProfilDefaut.click();
      // thisObj.accessPopup.find('input').last().onclick();
  } else {
    thisObj.setDefaultPref();
    for (var q=0;q<thisObj.accessPopup.find('input:radio').length;q++){
      thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked',false)
      thisObj.accessPopup.find('li').removeClass('able-focus')
    }
    thisObj.accessPopup.find('input:radio[value=' + 3 + ']').prop('checked',true)
    $('#vidcontr2').css('display','none');
    $('#conPlus').attr('aria-pressed','true');
    $('#conPlus').addClass('aria-no-checked');
    $('#transcr').attr('aria-checked','true');
    $('#transcr').addClass('aria-no-checked');
    $('#transcr').children('span').text(thisObj.tt.transcrno);
    $('#transcr').children('svg').children('line').css('display','none');
    thisObj.prefModeUsage = 'conPlus';
    thisObj.updateCookie('prefModeUsage');
    
    if (thisObj.$transcriptDiv.is(':visible') === false) {
      thisObj.handleTranscriptToggle();
      //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
      //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
    }

    if(thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true'){
      //Orange 30/10/2020 USELESS
      // thisObj.$ableDiv.css('width','33%');
      // thisObj.$transcriptArea.css('width','66%');
      // thisObj.$transcriptArea.css('left','33%');
      // thisObj.$transcriptArea.css('position','absolute');
      
      
      
      
      
      if(thisObj.getCookie()['preferences']['prefSign'] === 1){
        var takePadding = 0;
          if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
            takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
          }
          thisObj.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
          thisObj.$playerDiv.css('width',('width',thisObj.$mediaContainer.width()+'px'));
          //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
      } else {
        thisObj.$ableDiv.css('width',100-parseInt(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
        thisObj.$transcriptToolbar.css('min-height','28px');
        thisObj.$transcriptArea.css('width',thisObj.getCookie()['preferences']['prefVidSize']+'%');
        thisObj.$transcriptArea.css('left',100-parseInt(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
        thisObj.$transcriptArea.css('top','0px');
        var heightTranscriptArea = thisObj.$mediaContainer.css('height').split("px")[0]-thisObj.$transcriptToolbar.css('min-height').split("px")[0];
        thisObj.$transcriptArea.css('height',thisObj.$mediaContainer.css('height').split("px")[0]+'px');
        thisObj.$transcriptDiv.css('height',heightTranscriptArea-5+'px');
          // thisObj.$transcriptArea.css("top","1px");
          // $('.able-transcript-area').css("top","1px");
          // thisObj.$playerDiv.css('width',('width',thisObj.$mediaContainer.width()+'px'));

          //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
          //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
      }
      // if(thisObj.$transcriptArea[0].offsetWidth<500){
      //   thisObj.$transcriptToolbar.css('min-height','28px');
      // }
      if(thisObj.getCookie()['preferences']['prefCaptions'] == '1'){//si sous tittre activé, les désactiver
        
        thisObj.handleCaptionToggleOnOffOrange();
        thisObj.getCaptionOffFunction();
        thisObj.captionsPopup.find('input').last().prop('checked',true);
      }
      thisObj.checkContextVidTranscr();
    }

    $('#speedMain').css('display','block');
    thisObj.checkContextVidTranscr();
    thisObj.resizeAccessMenu();
    
  }
  
});


function myTimer() {
  if($('.controller-orange-preferences').is(':visible')){
    if(document.activeElement === document.getElementById("allParams")){
      document.getElementById("hide-prefT").focus();
    } else if(document.activeElement === document.getElementById("hide-prefT")){
      document.getElementById("visionPlus").focus();
    } else if(document.activeElement === document.getElementById("visionPlus")){
      document.getElementById("sansVisionPlus").focus();
    } else if(document.activeElement === document.getElementById("sansVisionPlus")){
      document.getElementById("auditionPlus").focus();
    } else if(document.activeElement === document.getElementById("auditionPlus")){
      document.getElementById("lsfPlus").focus();
    } else if(document.activeElement === document.getElementById("lsfPlus")){
      document.getElementById("defPlus").focus();
    } else if(document.activeElement === document.getElementById("defPlus")){
      document.getElementById("conPlus").focus();
    } else {
      document.getElementById("allParams").focus();
    }
  }
  if($('.controller-orange-main').is(':visible')){
    if(document.activeElement === document.getElementById("copy-play")){
      document.getElementById("copy-forward").focus();
    } else if(document.activeElement === document.getElementById("copy-forward")){
      document.getElementById("copy-rewind").focus();
    } else if(document.activeElement === document.getElementById("copy-rewind")){
      document.getElementById("show-volume").focus();
    } else if(document.activeElement === document.getElementById("show-volume")){
      document.getElementById("fullscreen").focus();
    } else if(document.activeElement === document.getElementById("fullscreen")){
      document.getElementById("subtitles").focus();
    } else if(document.activeElement === document.getElementById("subtitles")){
      if($('#vidcontr2').css('display') != 'none'){
        document.getElementById("vidcontr2").focus();
      } else {
        document.getElementById("show-settings").focus();
      }
    } else if(document.activeElement === document.getElementById("show-settings")){
      document.getElementById("copy-play").focus();
    } else {
      document.getElementById("copy-play").focus();
    }
  }
  if($('.controller-orange-volume').is(':visible')){
    if(document.activeElement === document.getElementById("hide-volume")){
      document.getElementById("sound-up").focus();
    } else if(document.activeElement === document.getElementById("sound-up")){
      document.getElementById("sound-down").focus();
    } else if(document.activeElement === document.getElementById("sound-down")){
      document.getElementById("sound-mute").focus();
    } else if(document.activeElement === document.getElementById("sound-mute")){
      document.getElementById("hide-volume").focus();
    } else {
      document.getElementById("hide-volume").focus();
    }
  }

  if($('.controller-orange-subtitles').is(':visible')){
    if(document.activeElement === document.getElementById("hide-subT")){
      document.getElementById("subt").focus();
    } else if(document.activeElement === document.getElementById("subt")){
      document.getElementById("subtitlesML").focus();
    } else if(document.activeElement === document.getElementById("subtitlesFR")){
      document.getElementById("subtitlesEN").focus();
    } else if(document.activeElement === document.getElementById("subtitlesML")){
      document.getElementById("subtitlesFR").focus();
    } else if(document.activeElement === document.getElementById("subtitlesEN")){
      document.getElementById("subtitlesES").focus();
    } else if(document.activeElement === document.getElementById("subtitlesES")){
      document.getElementById("subtitlesPL").focus();
    } else if(document.activeElement === document.getElementById("subtitlesPL")){
      document.getElementById("hide-subT").focus();
    } else {
      document.getElementById("hide-subT").focus();
    }
  }

  if($('.controller-orange-settings').is(':visible')){
    if(document.activeElement === document.getElementById("hide-settings")){
      document.getElementById("speed").focus();
    } else if(document.activeElement === document.getElementById("speed")){//subtitlesParam
      document.getElementById("subtitlesParam").focus();
    } else if(document.activeElement === document.getElementById("subtitlesParam")){//subtitlesParam
      document.getElementById("lsf").focus();
    } else if(document.activeElement === document.getElementById("lsf")){
      document.getElementById("audiodesc").focus();
    } else if(document.activeElement === document.getElementById("audiodesc")){
      document.getElementById("transcr").focus();
    } else if(document.activeElement === document.getElementById("transcr")){
      document.getElementById("vidcontr").focus();
    } else if(document.activeElement === document.getElementById("vidcontr")){
      document.getElementById("perceptionParam").focus();
    } else if(document.activeElement === document.getElementById("perceptionParam")){
      document.getElementById("reglageParam").focus();
    } else if(document.activeElement === document.getElementById("reglageParam")){
      document.getElementById("hide-settings").focus();
    } else {
      document.getElementById("hide-settings").focus();
    }
  }

  if($('.controller-orange-perception').is(':visible')){
    if(document.activeElement === document.getElementById("hide-perception")){
      document.getElementById("low").focus();
    } else if(document.activeElement === document.getElementById("low")){
      document.getElementById("acute").focus();
    } else if(document.activeElement === document.getElementById("acute")){
      document.getElementById("hide-perception").focus();
    } else {
      document.getElementById("hide-perception").focus();
    }
  }

  if($('.controller-orange-reglages').is(':visible')){
    if(document.activeElement === document.getElementById("hide-reglages")){
      document.getElementById("textColor").focus();
    } else if(document.activeElement === document.getElementById("textColor")){
      document.getElementById("bgColor").focus();
    } else if(document.activeElement === document.getElementById("bgColor")){
      document.getElementById("followColor").focus();
    } else if(document.activeElement === document.getElementById("followColor")){
      document.getElementById("fontSize").focus();
    } else if(document.activeElement === document.getElementById("fontSize")){
      document.getElementById("outText").focus();
    } else if(document.activeElement === document.getElementById("outText")){
      document.getElementById("textStyle").focus();
    } else if(document.activeElement === document.getElementById("textStyle")){
      document.getElementById("reglagesSettings").focus();
    } else if(document.activeElement === document.getElementById("reglagesSettings")){
      document.getElementById("hide-reglages").focus();
    } else {
      document.getElementById("hide-reglages").focus();
    }
  }

  if($('.controller-orange-textcolor').is(':visible')){
    if(document.activeElement === document.getElementById("hide-textColor")){
      document.getElementById("whiteTextColor").focus();
    } else if(document.activeElement === document.getElementById("whiteTextColor")){
      document.getElementById("blackTextColor").focus();
    } else if(document.activeElement === document.getElementById("blackTextColor")){
      document.getElementById("redTextColor").focus();
    } else if(document.activeElement === document.getElementById("redTextColor")){
      document.getElementById("greenTextColor").focus();
    } else if(document.activeElement === document.getElementById("greenTextColor")){
      document.getElementById("blueTextColor").focus();
    } else if(document.activeElement === document.getElementById("blueTextColor")){
      document.getElementById("yellowTextColor").focus();
    } else if(document.activeElement === document.getElementById("yellowTextColor")){
      document.getElementById("magentaTextColor").focus();
    } else if(document.activeElement === document.getElementById("magentaTextColor")){
      document.getElementById("cyanTextColor").focus();
    }  else if(document.activeElement === document.getElementById("cyanTextColor")){
      document.getElementById("hide-textColor").focus();
    } else {
      document.getElementById("hide-textColor").focus();
    }
  }

  if($('.controller-orange-bgcolor').is(':visible')){
    if(document.activeElement === document.getElementById("hide-bgColor")){
      document.getElementById("whiteBGColor").focus();
    } else if(document.activeElement === document.getElementById("whiteBGColor")){
      document.getElementById("blackBGColor").focus();
    } else if(document.activeElement === document.getElementById("blackBGColor")){
      document.getElementById("redBGColor").focus();
    } else if(document.activeElement === document.getElementById("redBGColor")){
      document.getElementById("greenBGColor").focus();
    } else if(document.activeElement === document.getElementById("greenBGColor")){
      document.getElementById("blueBGColor").focus();
    } else if(document.activeElement === document.getElementById("blueBGColor")){
      document.getElementById("yellowBGColor").focus();
    } else if(document.activeElement === document.getElementById("yellowBGColor")){
      document.getElementById("magentaBGColor").focus();
    } else if(document.activeElement === document.getElementById("magentaBGColor")){
      document.getElementById("cyanBGColor").focus();
    }  else if(document.activeElement === document.getElementById("cyanBGColor")){
      document.getElementById("hide-bgColor").focus();
    } else {
      document.getElementById("hide-bgColor").focus();
    }
  }

  if($('.controller-orange-followcolor').is(':visible')){
    if(document.activeElement === document.getElementById("hide-followColor")){
      document.getElementById("whiteFollowColor").focus();
    } else if(document.activeElement === document.getElementById("whiteFollowColor")){
      document.getElementById("blackFollowColor").focus();
    } else if(document.activeElement === document.getElementById("blackFollowColor")){
      document.getElementById("redFollowColor").focus();
    } else if(document.activeElement === document.getElementById("redFollowColor")){
      document.getElementById("greenFollowColor").focus();
    } else if(document.activeElement === document.getElementById("greenFollowColor")){
      document.getElementById("blueFollowColor").focus();
    } else if(document.activeElement === document.getElementById("blueFollowColor")){
      document.getElementById("yellowFollowColor").focus();
    } else if(document.activeElement === document.getElementById("yellowFollowColor")){
      document.getElementById("magentaFollowColor").focus();
    } else if(document.activeElement === document.getElementById("magentaFollowColor")){
      document.getElementById("cyanFollowColor").focus();
    }  else if(document.activeElement === document.getElementById("cyanFollowColor")){
      document.getElementById("hide-followColor").focus();
    } else {
      document.getElementById("hide-followColor").focus();
    }
  }

  if($('.controller-orange-fontsize').is(':visible')){
    if(document.activeElement === document.getElementById("hide-fontsize")){
      document.getElementById("button50").focus();
    } else if(document.activeElement === document.getElementById("button50")){
      document.getElementById("button75").focus();
    } else if(document.activeElement === document.getElementById("button75")){
      document.getElementById("button100").focus();
    } else if(document.activeElement === document.getElementById("button100")){
      document.getElementById("button125").focus();
    } else if(document.activeElement === document.getElementById("button125")){
      document.getElementById("button150").focus();
    } else if(document.activeElement === document.getElementById("button150")){
      document.getElementById("button175").focus();
    } else if(document.activeElement === document.getElementById("button175")){
      document.getElementById("button200").focus();
    } else if(document.activeElement === document.getElementById("button200")){
      document.getElementById("button300").focus();
    }  else if(document.activeElement === document.getElementById("button300")){
      document.getElementById("button400").focus();
    } else if(document.activeElement === document.getElementById("button400")){
      document.getElementById("hide-fontsize").focus();
    } else {
      document.getElementById("hide-fontsize").focus();
    }
  }

  if($('.controller-orange-outfont').is(':visible')){
    if(document.activeElement === document.getElementById("hide-out")){
      document.getElementById("outNo").focus();
    } else if(document.activeElement === document.getElementById("outNo")){
      document.getElementById("outHigh").focus();
    } else if(document.activeElement === document.getElementById("outHigh")){
      document.getElementById("outEnforce").focus();
    } else if(document.activeElement === document.getElementById("outEnforce")){
      document.getElementById("outUniform").focus();
    } else if(document.activeElement === document.getElementById("outUniform")){
      document.getElementById("outShadow").focus();
    }  else if(document.activeElement === document.getElementById("outShadow")){
      document.getElementById("hide-out").focus();
    } else {
      document.getElementById("hide-out").focus();
    }
  }

  if($('.controller-orange-font').is(':visible')){
    if(document.activeElement === document.getElementById("hide-font")){
      document.getElementById("helvet").focus();
    } else if(document.activeElement === document.getElementById("helvet")){
      document.getElementById("consola").focus();
    } else if(document.activeElement === document.getElementById("consola")){
      document.getElementById("accessDFA").focus();
    } else if(document.activeElement === document.getElementById("accessDFA")){
      document.getElementById("comic").focus();
    } else if(document.activeElement === document.getElementById("comic")){
      document.getElementById("arial").focus();
    } else if(document.activeElement === document.getElementById("arial")){
      document.getElementById("hide-font").focus();
    }else {
      document.getElementById("hide-font").focus();
    }
  }

  if($('.controller-orange-butcol').is(':visible')){
    if(document.activeElement === document.getElementById("hide-butcol")){
      document.getElementById("blackwhite").focus();
    } else if(document.activeElement === document.getElementById("blackwhite")){
      document.getElementById("whiteblack").focus();
    } else if(document.activeElement === document.getElementById("whiteblack")){
      document.getElementById("blueyellow").focus();
    } else if(document.activeElement === document.getElementById("blueyellow")){
      document.getElementById("yellowblue").focus();
    } else if(document.activeElement === document.getElementById("yellowblue")){
      document.getElementById("bluewhite").focus();
    } else if(document.activeElement === document.getElementById("bluewhite")){
      document.getElementById("whiteblue").focus();
    } else if(document.activeElement === document.getElementById("whiteblue")){
      document.getElementById("colordef").focus();
    } else if(document.activeElement === document.getElementById("colordef")){
      document.getElementById("hide-butcol").focus();
    } else {
      document.getElementById("hide-butcol").focus();
    }
  }


}
function test(){
  //test1();
}



//end OrangeLab here

    // handle clicks anywhere on the page. If any popups are open, close them.
    $(document).on('click',function() {
      //if ($('.able-popup:visible').length || $('.able-volume-popup:visible')) {
      if ($('.able-popup:visible').length) {  
        // at least one popup is visible
        thisObj.closePopups();
      } else if($('.able-volume-popup:visible') && ($(event.target)[0] != $(thisObj.$volumeSlider)[0] && 
      $(event.target)[0] != $(thisObj.$volumeSliderTrack)[0] && $(event.target)[0] != $(thisObj.$volumeSliderHead)[0]
      && $(event.target)[0] != $(thisObj.$volumeSliderTrackOn)[0])){
        thisObj.closePopups();
      }
    });

    // handle mouse movement over player; make controls visible again if hidden
    this.$ableDiv.on('mousemove',function() {
      if (thisObj.controlsHidden) {
        thisObj.fadeControls('in');
        thisObj.controlsHidden = false;
        // after showing controls, wait another few seconds, then hide them again if video continues to play
        thisObj.hidingControls = true;
        thisObj.hideControlsTimeout = window.setTimeout(function() {
          if (typeof thisObj.playing !== 'undefined' && thisObj.playing === true) {
            thisObj.fadeControls('out');
            thisObj.controlsHidden = true;
            thisObj.hidingControls = false;
          }
        },3000);
      };
    });

    // if user presses a key from anywhere on the page, show player controls
    $(document).keydown(function() {
      if (thisObj.controlsHidden) {
        thisObj.fadeControls('in');
        thisObj.controlsHidden = false;
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

  AblePlayer.prototype.initDragDrop = function (which) {

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
    //Orange don't authorize draggable
    //$toolbar.addClass('able-draggable');

    // add resize handle selector to bottom right corner
    $resizeHandle = $('<div>', {
      'class': 'able-resizable'
    });
    // assign z-index that's slightly higher than parent window
    resizeZIndex = parseInt($window.css('z-index')) + 100;
    $resizeHandle.css('z-index', resizeZIndex);
    // if ($window == this.$transcriptArea) {
    //   $resizeHandle.css('top', ($window[0].offsetHeight+$toolbar[0].offsetHeight)+'px');
    // }
    $window.append($resizeHandle);

    // add event listener to toolbar to start and end drag
    // other event listeners will be added when drag starts
    //Orange remove handle for moving toolbar
    // $toolbar.on('mousedown', function (event) {
    //   event.stopPropagation();
    //   if (!thisObj.windowMenuClickRegistered) {
    //     thisObj.windowMenuClickRegistered = true;
    //     thisObj.startMouseX = event.pageX;
    //     thisObj.startMouseY = event.pageY;
    //     thisObj.dragDevice = 'mouse';
    //     thisObj.startDrag(which, $window);
    //   }
    //   return false;
    // });
    // $toolbar.on('mouseup', function (event) {
    //   event.stopPropagation();
    //   if (thisObj.dragging && thisObj.dragDevice === 'mouse') {
    //     thisObj.endDrag(which);
    //   }
    //   return false;
    // });

    // add event listeners for resizing
    $resizeHandle.on('mousedown', function (event) {
      
      event.stopPropagation();
      if (!thisObj.windowMenuClickRegistered) {
        thisObj.windowMenuClickRegistered = true;
        thisObj.startMouseX = event.pageX;
        thisObj.startMouseY = event.pageY;
        thisObj.startResize(which, $window);
        return false;
      }
    });
    $resizeHandle.on('mouseup', function (event) {
      
      event.stopPropagation();
      if (thisObj.resizing) {
        thisObj.endResize(which);
      }
      return false;
    });

    // whenever a window is clicked, bring it to the foreground
    //Orange don't authorize to moove draggable
    // $window.on('click', function () {
    //   
    //   if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
    //     thisObj.updateZIndex(which);
    //   }
    //   thisObj.finishingDrag = false;
    // });

    this.addWindowMenu(which, $window, windowName);
  };

  AblePlayer.prototype.addWindowMenu = function (which, $window, windowName) {


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
    $windowAlert.hide();
    $windowAlert.appendTo(this.$activeWindow);
    $windowAlert.css({
      top: $window.offset().top
    });
    
    // add button to draggable window which triggers a popup menu
    // for now, re-use preferences icon for this purpose
    $newButton = $('<button>', {
      'type': 'button',
      'tabindex': '0',
      'aria-label': this.tt.windowButtonLabel,
      'class': 'able-button-handler-preferences'
    });
    if (this.iconType === 'font') {
      $buttonIcon = $('<span>', {
        'class': 'icon-preferences',
        'aria-hidden': 'true'
      });
      $newButton.append($buttonIcon);
    }
    else if(this.iconType === 'svg') {
      $buttonIcon = $('<span>', {
        'class': 'icon-preferences',
        'aria-hidden': 'true'
      });
      $newButton.append($buttonIcon);
    }
    else {
      // use image
      buttonImgSrc = this.rootPath + 'button-icons/' + this.toolbarIconColor + '/preferences.png';
      $buttonImg = $('<img>', {
        'src': buttonImgSrc,
        'alt': '',
        'role': 'presentation'
      });
      $newButton.append($buttonImg);
    }

    // add the visibly-hidden label for screen readers that don't support aria-label on the button
    $buttonLabel = $('<span>', {
      'class': 'able-clipped'
    }).text(this.tt.windowButtonLabel);
    $newButton.append($buttonLabel);

    // add a tooltip that displays aria-label on mouseenter or focus
    tooltipId = this.mediaId + '-' + windowName + '-tooltip';
    $tooltip = $('<div>', {
      'class': 'able-tooltip',
      'id': tooltipId
    }).hide();
    $newButton.on('mouseenter focus', function (event) {
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
      $(this).on('mouseleave blur', function () {
        AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
      });
    });

    // add a popup menu
    $popup = this.createPopup(windowName);
    $optionList = $('<ul></ul>');
    radioName = this.mediaId + '-' + windowName + '-choice';

    options = [];
    // options.push({
    //   'name': 'move',
    //   'label': this.tt.windowMove
    // });
    options.push({
      'name': 'resize',
      'label': this.tt.windowResize
    });
    for (i = 0; i < options.length; i++) {
      $optionItem = $('<li style="margin:0px;padding:0px"></li>');
      option = options[i];
      radioId = radioName + '-' + i;
      $radioButton = $('<input>', {
        'type': 'radio',
        'val': option.name,
        'name': radioName,
        'id': radioId
      });
      $radioLabel = $('<label>', {
        'for': radioId,
		    'style': 'color:white;cursor:pointer;border-color:white;background-color:#757575',
      });
      $radioLabel.text(option.label);
      $radioButton.on('focus', function (e) {
        //Orange change class of Reidmmensionner, addClass more than removeClass
        $(this).parents('ul').children('li').addClass('able-focus');
        $(this).parent('li').addClass('able-focus');
      });
      $radioButton.on('click', function (e) {
        e.stopPropagation();
        if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
          thisObj.windowMenuClickRegistered = true;
          thisObj.handleMenuChoice(which, $(this).val(), e.type);
        }
      });
      // due to an apparent bug (in jquery?) clicking the label
      // does not result in a click event on the associated radio button
      // Observed this in Firefox 45.0.2 and Chrome 50
      // It works fine on a simple test page so this could be an Able Player bug
      // Added the following as a workaround rather than mess with isolating the bug
      $radioLabel.on('click mousedown', function () {
        var clickedId = $(this).attr('for');
        $('#' + clickedId).click();
      })
      $optionItem.append($radioButton, $radioLabel);
      $optionList.append($optionItem);
      $radioLabel.css('margin','0px');
    }
    $popup.append($optionList);
    $newButton.on('click mousedown keydown', function (e) {
      e.stopPropagation();
      if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
        // don't set windowMenuClickRegistered yet; that happens in handler function
        thisObj.handleWindowButtonClick(which, e);
      }
      thisObj.finishingDrag = false;
    });

    $popup.on('keydown', function (event) {
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
      this.$transcriptToolbar.append($windowAlert, $newButton, $tooltip, $popup);
    }
    else if (which === 'sign') {
      this.$signAlert = $windowAlert;
      this.$signPopupButton = $newButton;
      this.$signPopup = $popup;
      this.$signToolbar.append($windowAlert, $newButton, $tooltip, $popup);
    }

    this.addResizeDialog(which, $window);
  };

  AblePlayer.prototype.addResizeDialog = function (which, $window) {

    var thisObj, $windowPopup, $windowButton,
      widthId, heightId, startingWidth, startingHeight, aspectRatio,
      $resizeForm, $resizeWrapper,
      $resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel, $resizeWidthInputOld, $resizeWidthLabelOld, $resizeWidthPlus, $resizeWidthMoins,
      $resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel,
      tempWidth, tempHeight,
      $horizontalLogo,$horizontalButton,$verticalButton,$verticalLogo,
      $saveButton,$saveButtonOrange, $cancelButton, newWidth, newHeight, resizeDialog;

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
    //startingWidth = $window.width();
    startingWidth = thisObj.getCookie()['preferences']['prefVidSize'];//Math.round($window.width() / $window.parent().width() * 100);
    //
    startingHeight = $window.height();
    aspectRatio = startingWidth / startingHeight;

    $resizeForm = $('<div></div>', {
      'class': 'able-resize-form'
    });

    // inner container for all content, will be assigned to modal div's aria-describedby
    $resizeWrapper = $('<div style="text-align:center"></div>');

    // width field
	$resizeWidthDiv = $('<div class="resizeWidthDiv"></div>',{
      'style':'display:inline-flex',
    });
	$resizeWidthInputOld = $('<input>',{
	'class':'resizeWidthInputOld',
			'type': 'text',
			'id': widthId,
			'value': startingWidth
		});
		$resizeWidthLabelOld = $('<label>',{
		'class':'resizeWidthLabelOld',
			'for': widthId
		}).text(this.tt.width);
    $resizeWidthInput = $('<input>', {
      'type': 'number',
      'id': widthId,
      'value': startingWidth,
      'class': 'inputWidth resizeWidthInput',
      'max': 100,
      'min': 0,
      'step': 1,
      'aria-live': 'assertive'
    });
    //$resizeWidthInput.prop('readonly',true);
    $resizeWidthPlus = $('<button >', {
      'id': 'bPlus',
      'text': '+',
    });
    $resizeWidthMoins = $('<button>', {
      'id': 'bMoins',
      'text': '-',
    });
    // $resizeWidthLabel = $('<label>', {
    //   'for': widthId
    // }).text(this.tt.width);
    $resizeWidthLabelOld = $('<label>', {
	'class':'resizeWidthLabelOld',
      'for': widthId,
    }).text(this.tt.width);

	$resizeWidthLabel = $('<label>', {
	  'class':'resizeWidthLabel',
      'for': widthId,
      'style':'font-size:22px',
    }).text('%');

    // height field
    $resizeHeightDiv = $('<div></div>',{
      'style':'display:inline-flex',
    });
    $resizeHeightInput = $('<input>', {
      'type': 'text',
      'id': heightId,
	  'class':'resizeHeightInput',
      'value': startingHeight
    });
    $resizeHeightLabel = $('<label>', {
      'for': heightId,
	  'class':'resizeHeightLabel',
    }).text(this.tt.height);

    //transcript fields
    $horizontalLogo = $('<img>',{
      'id' : 'horizontalLogo',
      'src' : 'button-icons/black/vertical.png',
      'height': 'auto',
    });
    $verticalLogo = $('<img>',{
      'id' : 'verticalLogo',
      'src' : 'button-icons/black/horizontal.png',
      'height': 'auto',
    });
    $horizontalButton = $('<button>',{
      'id' : 'horizontalButton',
      'tabindex' : '-1',
      'class' : 'horizontalButton button',
      'text': this.tt.horizontalButton
    });
    $verticalButton = $('<button>',{
      'id' : 'verticalButton',
      'class' : 'verticalButton button',
      'text': this.tt.verticalButton
    });
    if (which === 'sign') {
      // make height a read-only field
      // and calculate its value based on width to preserve aspect ratio
      $resizeHeightInput.prop('readonly', true);
      $resizeWidthInput.on('input', function () {
        tempWidth = $(this).val();
        if(tempWidth > 100){
          tempWidth = 100;
        }
        tempHeight = Math.round(tempWidth / aspectRatio, 0);
        $resizeHeightInput.val(tempHeight);
        $resizeWidthInput.val(tempWidth);
      })
      $resizeWidthInput.on('change keyup mouseup', function () {
        tempWidth = $(this).val();
        if(tempWidth > 100){
          tempWidth = 100;
        }
        $('#' + widthId).val(tempWidth);
        $resizeWidthInput.val(tempWidth);
      })
    }

    $resizeWidthPlus.on('click', function () {
      var valPlusOne = parseInt($('#' + widthId).val()) + 1;
      $('#' + widthId).val(valPlusOne);
    });
    $resizeWidthMoins.on('click', function () {
      var valMoinsOne = parseInt($('#' + widthId).val()) - 1;
      $('#' + widthId).val(valMoinsOne);
    });

    $verticalButton.on('click', function () {
      thisObj.prefTranscriptOrientation = 'vertical';
      thisObj.updateCookie('prefTranscriptOrientation');
      thisObj.checkContextVidTranscr();
      resizeDialog.hide();
      $windowPopup.hide();
      $windowButton.focus();
      // if($('.able-sign-window').is(':visible') === false){
      //   $('.able-transcript-area').css('top','0px');
      //   $('.able').css('width','33%');
      //   $('.able-transcript-area').css('width','66%');
      //   $('.able-transcript-area').css('left','33%');
      // } else {
      //   $('.able-transcript-area').css('width',(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
      //   $('.able-transcript-area').css('left',100-thisObj.getCookie()['preferences']['prefVidSize']+'%');
      //   $('.able-transcript-area').css('top',$('.video-accessible-sign').height()+'px');
      // }
      // resizeDialog.hide();
      // $windowPopup.hide();
      // $windowButton.focus();
      // thisObj.$playerDiv.css('width',(thisObj.$mediaContainer.width())+'px');
    });

    $horizontalButton.on('click', function () {
      thisObj.prefTranscriptOrientation = 'horizontal';
      thisObj.updateCookie('prefTranscriptOrientation');
      thisObj.checkContextVidTranscr();
      resizeDialog.hide();
      $windowPopup.hide();
      $windowButton.focus();
      // if($('.able-sign-window').is(':visible') === false){
      //   $('.able').css('width','100%');
      //   $('.able-transcript-area').css('width','100%');
      //   $('.able-transcript-area').css('left','0%');
      //   $('.able-transcript-area').css('top',$('.able').height()+'px');
      // } else {
      //   //$('.able').css('width','100%');
      //   
      //   $('.able-transcript-area').css('width','100%');
      //   $('.able-transcript-area').css('left','0%');
      //   $('.able-transcript-area').css('top',$('.able').height()+'px');
      // }
      // resizeDialog.hide();
      // $windowPopup.hide();
      // $windowButton.focus();
      // thisObj.$playerDiv.css('width',(thisObj.$ableWrapper.width())+'px');
    });

    // Add save and cancel buttons.
    $saveButton = $('<button class="modal-button saveButton" id="saveButton">' + this.tt.save + '</button>');
    $saveButtonOrange = $('<button class="modal-button" id="saveButtonOrange">' + this.tt.save + '</button>');
    $cancelButton = $('<button class="modal-button cancelButton" id="cancelButton">' + this.tt.cancel + '</button>');
    
    $saveButtonOrange.on('click', function () {
      newWidth = $('#' + widthId).val();
      newHeight = $('#' + heightId).val();
      
      
      if (newWidth !== startingWidth || newHeight !== startingHeight) {
          
          
            $window.css({
              'width': newWidth + '%',
              'left': (100 - newWidth) + '%',
              //'width': newWidth + 'px',
              //'height': newHeight + 'px'
            });
            $('#' + thisObj.mediaId + '_' + 'prefVidSize').val(newWidth);
            thisObj.prefVidSize = newWidth;
            thisObj.updateCookie('prefVidSize');
            thisObj.updateCookie(which);
            $('.able').css('width', (100 - newWidth) + '%');
            $('.able-sign-window').css('width', (newWidth) + '%');
            $('.able-transcript-area').css('width', (newWidth) + '%');
            $('.able-transcript-area').css('left', (100 - newWidth) + '%');
            $('.able-transcript-area').css('top',$('.video-accessible').height() + 'px');
            for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
                var vidId = document.getElementsByClassName("video-accessible")[q].id;
                
                //document.getElementById(vidId+"-sign").style.maxHeight = (newHeight*aspectRatio)+"px";
                //$('#'+vidId+'-sign').css('max-height',(newWidth/aspectRatio)+'px');
                $('#'+vidId+'-sign').css('height',$('.video-accessible').height()+'px');
                thisObj.$mediaContainer.find('video').css('height',thisObj.$mediaContainer.css('height'));
                thisObj.$bigPlayButton.css('height',thisObj.$mediaContainer.css('height'));
            }
            
          resizeDialog.hide();
          $windowPopup.hide();
          $windowButton.focus();
          thisObj.checkContextVidTranscr();
        }
    });
	$saveButton.on('click', function () {
      newWidth = $('#' + widthId).val();
      newHeight = $('#' + heightId).val();
      
      
	  
	  if (newWidth !== startingWidth || newHeight !== startingHeight) {
        $window.css({
          'width': newWidth + 'px',
          'height': newHeight + 'px'
        });

        // $('.able').css('width', (100 - newWidth) + '%');
        // $('.able-transcript-area').css('left', (100 - newWidth) + '%');
        // $('.able-sign-window').css('width', (newWidth) + '%');
        // $('.able-transcript-area').css('width', (newWidth) + '%');
        thisObj.updateCookie(which);
		    resizeDialog.hide();
		    $windowPopup.hide();
		    $windowButton.focus();
      
	  }
    });
      
    $cancelButton.on('click', function () {
      resizeDialog.hide();
      $windowPopup.hide();
      $windowButton.focus();
      var oldV = parseInt(thisObj.getCookie()['preferences']['prefVidSize']);
      $('#' + widthId).val(oldV);
      $('#' + widthId).attr('value',oldV);
      $('#' + widthId).attr('defaultValue',oldV);
      $resizeWidthInput.val(oldV);
      document.getElementById(widthId).value = oldV+"";
    });

    // Now assemble all the parts
    if(which === 'sign'){
	  $resizeWidthDiv.append($resizeWidthLabelOld,$resizeWidthInputOld);
	  $resizeWidthDiv.append($resizeWidthMoins, $resizeWidthInput,$resizeWidthLabel, $resizeWidthPlus);
      $resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
      $resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
      $resizeForm.append($resizeWrapper, '<hr>', $saveButton, $saveButtonOrange, $cancelButton);
      
    }
    if(which === 'transcript'){
	/*if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){ 
		$resizeWidthDiv.append($horizontalLogo, $horizontalButton);
		$resizeHeightDiv.append($verticalLogo, $verticalButton);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeForm.append($resizeWrapper);
	  } else {*/
		$resizeWidthDiv.append($horizontalLogo, $horizontalButton);
		$resizeHeightDiv.append($verticalLogo, $verticalButton);
		$resizeWidthDiv.append($resizeWidthLabelOld,$resizeWidthInputOld);
		$resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
    $resizeForm.append($resizeWrapper, '<hr>', $saveButton, $cancelButton);
	//}
    }
    

    // must be appended to the BODY!
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog,
    // which will render the dialog unreadable by screen readers
    $('body').append($resizeForm);
    var title;
    if(which === 'sign'){
      title = this.tt.windowResizeHeading;
    } else {
      title = this.tt.windowResizeHeadingTR;
    }
    resizeDialog = new AccessibleDialog($resizeForm, $windowButton, 'alert', title, $resizeWrapper, this.tt.closeButtonLabel, '20em');
    if (which === 'transcript') {
      this.transcriptResizeDialog = resizeDialog;
      $(this.transcriptResizeDialog.modal[0].firstChild).css('display', 'none');
    }
    else if (which === 'sign') {
      this.signResizeDialog = resizeDialog;
      $(this.signResizeDialog.modal[0].firstChild).css('display', 'none');
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
      $windowPopup.hide(200, '', function () {
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
      $windowPopup.show(200, '', function () {
        $(this).find('input').first().focus().parent().addClass('able-focus, focus-visible');
        $(this).find('label').first().addClass('able-focus, focus-visible');
        $(this).find('label').first().focus();
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
    $windowPopup.hide('fast', function () {
      thisObj.windowMenuClickRegistered = false; // reset
    });
    $windowButton.focus();

    if (choice === 'move') {
      if (!this.showedAlert(which)) {
        this.showAlert(this.tt.windowMoveAlert, which);
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
	  
    
    //resizeDialog.show();
    resizeDialog.show(200, '', function () {
      
      $('#horizontalButton').addClass('able-focus');
      //thisObj.windowMenuClickRegistered = false; // reset
    });
    $('#video1-resize-sign-width').addClass('able-focus');
    document.getElementById('video1-resize-sign-width').focus();
    $('#video1-resize-sign-width').get(0).focus();
    setTimeout(function() {
      $('#video1-resize-sign-width').focus();
    }, 420); // After 420 ms
    
    if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
	  if(which === 'sign'){
      //update value in resize
      
      resizeDialog.modal[0].getElementsByClassName("resizeWidthInput")[0].value = parseInt(this.getCookie()['preferences']['prefVidSize']);
      resizeDialog.modal[0].getElementsByClassName("resizeWidthInputOld")[0].value = parseInt(this.getCookie()['preferences']['prefVidSize']);
    
      $('#saveButtonOrange').css('display','block');
      $('#saveButton').css('display','none');
      $('.saveButton').css('display','none');
      $('.cancelButton').css('display','block');

      
      $('.resizeWidthLabelOld').css('display','none');
      $('.resizeWidthInputOld').css('display','none');
      $('#resizeWidthLabel').css('display','block');
      $('.resizeWidthLabel').css('display','block');
      $('.resizeWidthDiv').css('display','inline-flex');
      $('.resizeWidthInput').css('display','block');
      $('.resizeHeightLabel').css('display','none');
      $('.resizeHeightInput').css('display','none');

      
      $('#bPlus').css('display','block');
      $('#bPlus').css('width','17%');
      $('#bMoins').css('display','block');
      $('#bMoins').css('width','17%');
	  } else if(which === 'transcript'){
      $('.resizeWidthLabelOld').css('display','none');
      $('.resizeWidthInputOld').css('display','none');
      $('#resizeWidthLabel').css('display','block');
      $('.resizeWidthLabel').css('display','block');
      $('.resizeWidthDiv').css('display','inline-flex');
      $('.resizeWidthInput').css('display','block');
      $('.resizeHeightLabel').css('display','none');
      $('.resizeHeightInput').css('display','none');

      $('#saveButtonOrange').css('display','none');
      $('#saveButton').css('display','none');
      $('.saveButton').css('display','none');
      $('.cancelButton').css('display','none');

      $('#horizontalButton').css('display','block');
      $('#horizontalLogo').css('display','block');
      $('#verticalLogo').css('display','block');
      $('#verticalButton').css('display','block');
	  }
		

	  } else {
	  if(which === 'sign'){
		$('#saveButtonOrange').css('display','none');
		$('#saveButton').css('display','block');

		$('.resizeWidthLabelOld').css('display','block');
		$('.resizeWidthInputOld').css('display','block');
		$('.resizeWidthDiv').css('display','inline-flex');
		$('#resizeWidthLabel').css('display','none');
		$('.resizeWidthLabel').css('display','none');
		$('.resizeWidthInput').css('display','none');

		
		$('#bPlus').css('display','none');
		$('#bMoins').css('display','none');

		
		$('.resizeHeightLabel').css('display','block');
		$('.resizeHeightInput').css('display','block');
	} else if(which === 'transcript'){
		$('.resizeWidthLabelOld').css('display','block');
		$('.resizeWidthInputOld').css('display','block');
		$('#resizeWidthLabel').css('display','none');
		$('.resizeWidthLabel').css('display','block');
		$('.resizeWidthDiv').css('display','inline-flex');
		$('.resizeWidthInput').css('display','block');
		$('.resizeHeightLabel').css('display','block');
		$('.resizeHeightInput').css('display','block');

		$('#saveButtonOrange').css('display','block');
		$('#saveButton').css('display','block');
		$('.saveButton').css('display','block');
		$('.cancelButton').css('display','block');

		$('#horizontalButton').css('display','none');
		$('#horizontalLogo').css('display','none');
		$('#verticalLogo').css('display','none');
		$('#verticalButton').css('display','none');
	  }
	  }
    }
  };

  AblePlayer.prototype.startDrag = function (which, $element) {

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
      this.showAlert(this.tt.windowMoveAlert, which);
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
      $(document).on('mousemove', function (e) {
        if (thisObj.dragging) {
          // calculate new top left based on current mouse position - offset
          newX = e.pageX - thisObj.dragOffsetX;
          newY = e.pageY - thisObj.dragOffsetY;
          thisObj.resetDraggedObject(newX, newY);
        }
      });
    }
    else if (this.dragDevice === 'keyboard') {
      this.$activeWindow.on('keydown', function (e) {
        if (thisObj.dragging) {
          thisObj.dragKeys(which, e);
        }
      });
    }
    return false;
  };

  AblePlayer.prototype.dragKeys = function (which, e) {

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
    this.resetDraggedObject(this.dragKeyX, this.dragKeyY);
    if (e.preventDefault) {
      e.preventDefault();
    }
    return false;
  };

  AblePlayer.prototype.resetDraggedObject = function (x, y) {
    this.$activeWindow.css({
      'left': x + 'px',
      'top': y + 'px'
    });
  },

    AblePlayer.prototype.resizeObject = function (which, width, height,mediaVideoWidth,mediaVideoHeight) {

      var innerHeight;
      //
      //if((mediaVideoWidth+width)<this.$playerDiv.width()){
        //hich is either 'transcript' or 'sign'
        this.$activeWindow.css({
          'width': width + 'px',
          'height': height + 'px'
        });
      //}

      if (which === 'sign') {
        // if((mediaVideoWidth+width)<this.$playerDiv.width()){
        //   this.$mediaContainer.find('video').css({
        //     'width': mediaVideoWidth + 'px',
        //     'height': mediaVideoHeight + 'px'
        //   });
        //   this.$mediaContainer.css({
        //     'width': mediaVideoWidth + 'px',
        //     'height': mediaVideoHeight + 'px'
        //   });
        //   this.$bigPlayButton.css({
        //     'width': mediaVideoWidth + 'px',
        //     'height': mediaVideoHeight + 'px'
        //   });
        //   this.$vidcapContainer.css({
        //     'width': mediaVideoWidth + 'px',
        //     'height': mediaVideoHeight + 'px'
        //   });
        // }
      }

      if (which === 'transcript') {
        // $activeWindow is the outer $transcriptArea
        // but the inner able-transcript also needs to be resized proporitionally
        // (it's 50px less than its outer container)
        //Maybe useless now
        innerHeight = height - 50;
        this.$transcriptDiv.css('height', innerHeight + 'px');
      }
    };

  AblePlayer.prototype.endDrag = function (which) {

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
    setTimeout(function () {
      this.finishingDrag = false;
    }, 100);
  };

  AblePlayer.prototype.isCloseToCorner = function ($window, mouseX, mouseY) {

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
    if ((Math.abs(bottom - mouseY) <= tolerance) && (Math.abs(right - mouseX) <= tolerance)) {
      return true;
    }
    return false;
  };

  AblePlayer.prototype.startResize = function (which, $element) {

    var thisObj, $windowPopup, zIndex, startPos, newWidth, newHeight;
    thisObj = this;

    this.$activeWindow = $element;
    this.resizing = true;

    if (which === 'transcript') {
      $windowPopup = this.$transcriptPopup;
      this.$activeWindow = this.$mediaContainer.find('video');
    }
    else if (which === 'sign') {
      $windowPopup = this.$signPopup;
      this.$activeWindow = this.$mediaContainer.find('video');//this.$vidcapContainer;//
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

    this.mediaVideoWidth = this.$mediaContainer.find('video').width();
    this.mediaVideoHeight = this.$mediaContainer.find('video').height();
    // add event listeners
    $(document).on('mousemove', function (e) {
      if (thisObj.resizing) {
        
        // calculate new width and height based on changes to mouse position
        newWidth = thisObj.dragStartWidth + (e.pageX - thisObj.startMouseX);
        newHeight = thisObj.dragStartHeight + (e.pageY - thisObj.startMouseY);
        var newMediaWidth = thisObj.mediaVideoWidth + newWidth;
        var oldWidth = thisObj.$signWindow.css('width').split('px')[0];
        var oldWidthPD = thisObj.$playerDiv.css('width').split('px')[0];
        //prevent not to be outside the div
        if(Math.round((100 - ((100-(newWidth*100/oldWidthPD))))) > 95){
          newWidth = thisObj.$activeWindow.css('width').split('px')[0];
        } 
        
        if(Math.round((100 - ((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))))) <= 95){
          thisObj.resizeObject(which, newWidth, thisObj.$activeWindow.css('height'),newMediaWidth,thisObj.mediaVideoHeight);
          // thisObj.$signWindow.css('width',(100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))+'%')
          // thisObj.$signWindow.css('left',((thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))+'%')
          // thisObj.$signWindow.css('height',thisObj.$activeWindow.css('height'));

          //NEW TEST to act the same way as the button
          thisObj.$signWindow.css({
            'width': (100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)) + '%',
            'left': (100 - ((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)))) + '%',
          });
          //impossible if context 5
          if(thisObj.getCookie()['preferences']['prefSign'] != 1 || thisObj.getCookie()['preferences']['prefTranscript'] != 1){
            
            //thisObj.$transcriptArea.css('width', ((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))) + '%');
            //thisObj.$transcriptArea.css('left', (((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)))) + '%');
            //$('.able-transcript-area').css('top',thisObj.$activeWindow.css('height'));
            thisObj.$transcriptArea.css({
              'width': (100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)) + '%',
              'left': (100 - ((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)))) + '%',
            });
          } 
          $('#' + thisObj.mediaId + '_' + 'prefVidSize').val((thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD));
          thisObj.prefVidSize = (100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD));
          for(var q=0;q<$('.inputWidth').length;q++){
            if($('.inputWidth')[q].value == thisObj.getCookie()['preferences']['prefVidSize']){
              $('.inputWidth')[q].value = (thisObj.prefVidSize);
            }
          }
          thisObj.prefTrSize = thisObj.prefVidSize;
          thisObj.updateCookie('prefVidSize');
          thisObj.updateCookie(which);
          thisObj.updateCookie('prefTrSize');
          thisObj.updateCookie(which);
          thisObj.$ableDiv.css('width', (100 - ((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)))) + '%');
          
          for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
              var vidId = document.getElementsByClassName("video-accessible")[q].id;
              //document.getElementById(vidId+"-sign").style.maxHeight = (newHeight*aspectRatio)+"px";
              //$('#'+vidId+'-sign').css('max-height',(newWidth/aspectRatio)+'px');
              //
              $('#'+vidId+'-sign').css('height',thisObj.$mediaContainer.css('height').split('px')[0]+10+"px");
          }
          thisObj.$mediaContainer.find('video').css('height',thisObj.$mediaContainer.css('height'));
          thisObj.$bigPlayButton.css('height',thisObj.$mediaContainer.css('height'));
        } 

        
      }
    });
    $(document).on('mouseup', function (e) {
      
      e.stopPropagation();
      if (thisObj.resizing) {
        thisObj.endResize(which);
      }
    });
    return false;
  };

  AblePlayer.prototype.endResize = function (which) {

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
    setTimeout(function () {
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
          
        }
        this.hasSignLanguage = true;
        this.injectSignPlayerCode();
      }
      else {
        this.hasSignLanguage = false;
      }
    }
    for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
      var vidId = document.getElementsByClassName("video-accessible")[q].id;
        document.getElementsByClassName("video-accessible")[q].addEventListener('loadeddata', function() {
        //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
        document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
        document.getElementById(vidId+"-sign").style.backgroundColor = "black";
        
      }, false);
    }
    
    this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('height'));
    this.$bigPlayButton.css('height',this.$mediaContainer.css('height'));
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
      'tabindex' : '-1',
      'class' : 'video-accessible-sign',
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
	    'role' : 'tab',
      'aria-label' : this.tt.sign,
      'tabindex': '0'
    });
    this.$signToolbar = $('<div>',{
      'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
    });
    this.$signToolbar.css('display','contents');

    this.$signWindow.append(this.$signToolbar, this.$signVideo);

    this.$ableWrapper.append(this.$signWindow);

    // make it draggable
    this.initDragDrop('sign');

    if (this.prefSign === 1) {
      // sign window is on. Go ahead and position it and show it 
      
      this.positionDraggableWindow('sign',this.getDefaultWidth('sign'))
      if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
        this.$ableDiv.css('width','67%');
        this.$ableDiv.css('width',(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%');
        this.$signWindow.css('width','33%');
        this.$signWindow.css('width',thisObj.getCookie()['preferences']['prefVidSize']+'%');
        this.$signWindow.css('left','66%');
        this.$signWindow.css('left',(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%');
        this.$signWindow.css('position','absolute');
        this.$signWindow.css('top','0px');
        this.$signWindow.css('margin','0px');
        //put video sign in the first container
        var svgVideoSrc = this.$mediaContainer.find('video').find('source')[0].src; 
        this.$mediaContainer.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
        this.$mediaContainer.find('video')[0].load();
        //put video in the second containre
        this.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
        this.$signWindow.find('video')[0].load();
        this.$signWindow.find('video')[0].muted = true;
        this.$mediaContainer.find('video')[0].muted = true;
        this.$mediaContainer.css('background-color','lightgray');
        this.$buttonSoundMute.attr('aria-pressed','false');
        this.$buttonSoundMute.attr('aria-label',this.tt.mute);
        this.$buttonSoundMute.addClass('aria-no-checked');
        this.$buttonHideVol.text('');
	      this.$buttonHideVol.append("<i class=\"arrow left\"></i><span id=\"\">"+this.tt.volume+" "+(parseInt(this.volume) / 10 * 100)+"%</span>");
        this.$buttonSoundMute.text('');
        this.$buttonSoundMute.addClass('vmuteno')
        this.$buttonSoundMute.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z'</path></svg><span style='margin-left:-25%'> "+this.tt.mute+"</span>");
   
        if (this.prefTranscript === 1) {
          // var takePadding = 0;
          // if(parseInt(this.$signToolbar.css('padding').replace('px',''))){
          //   takePadding = parseInt(this.$signToolbar.css('padding').replace('px',''));
          // }
          //this.$transcriptArea .css('top',(this.$signWindow.height()+this.$signToolbar.height()+takePadding)+'px');
          
        } else {
          
          this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
          //this.$playerDiv.css('width',(this.$ableWrapper.css('max-width')));
        }
        //If sign window is visible, change it size due to size of first video
        // document.getElementById("video1").addEventListener('loadeddata', function() {
        //   document.getElementById("video1-sign").style.maxHeight = document.getElementById("video1").offsetHeight+"px";
        //   document.getElementById("video1-sign").style.backgroundColor = "black";

        // }, false);
        for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
          var vidId = document.getElementsByClassName("video-accessible")[q].id;
          document.getElementsByClassName("video-accessible")[q].addEventListener('loadeddata', function() {
            //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.backgroundColor = "black";
            
            
            document.getElementById(vidId+"-sign").addEventListener('ended',function(){
              document.getElementById(vidId+"-sign").load();
            });
          }, false);
        }
        
        this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('height'));
        this.$bigPlayButton.css('height',this.$mediaContainer.css('height'));
        
        $(window).resize(function() {
          //
          for(var q=0;q<document.getElementsByClassName("video-accessible").length;q++){
            var vidId = document.getElementsByClassName("video-accessible")[q].id;
            //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.height = document.getElementById(vidId).offsetHeight+"px";
            document.getElementById(vidId+"-sign").style.backgroundColor = "black"; 
            //if (this.prefTranscript === 1) {
              //document.getElementsByClassName("able-transcript-area")[0].style.top = document.getElementById(vidId).offsetHeight+"px";
            //}
          }
          
          thisObj.$bigPlayButton.css('height',thisObj.$mediaContainer.css('height'));         

        });

        if(this.$signWindow.is(':visible')=== false){
          
        } else {
          
        }
        
        
        //this.$signWindow.css('width',this.$mediaContainer.width()+"px");
        //this.$signWindow.css('height',this.$vidcapContainer.height()+"px");
        
      }
    }
    else {
      this.$signWindow.hide();
      // if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
      //   var svgVideoSrc = this.$signWindow.find('video').find('source')[0].src; 
      //   //put video sign in the second container
      //   this.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
      //   this.$mediaContainer.find('video')[0].load();
      //   //put video in the first containre
      //   this.$signWindow.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
      //   this.$signWindow.find('video')[0].load();
      // }
    }
    this.checkContextVidTranscr();
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
    var langs = ['ca','de','en','es','fr','it','ja','nb'];
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