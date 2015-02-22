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

  // 
  $(window).keydown(function(e) {
    if (AblePlayer.nextIndex === 1) {
      // Only one player on the page; dispatch global key presses to it.
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
      console.log('ERROR: No media specified.');
      return;
    }

    if ($(media).attr('autoplay') !== undefined && $(media).attr('autoplay') !== "false") { 
      this.autoplay = true; 
    }
    else { 
      this.autoplay = false;
    }
    
    // override defaults with values of data-* attributes 
    
    var includeTranscript = media.data('include-transcript');
    if (includeTranscript === undefined || includeTranscript === "")  {
      // If there are caption tracks and no default provided, include transcript.
      if (media.find('track[kind="captions"], track[kind="subtitles"]').length > 0) {
        includeTranscript = true;
      }
    }
    if (includeTranscript) {
      this.includeTranscript = true;
    }
    else {
      this.includeTranscript = false;
    }
    
    if ($(media).data('start-time') !== undefined && $(media).data('start-time') !== "") { 
      this.startTime = $(media).data('start-time'); 
    }
    else { 
      this.startTime = 0;
    }

    if ($(media).data('transcript-div') !== undefined && $(media).data('transcript-div') !== "") { 
      this.transcriptDivLocation = $(media).data('transcript-div'); 
    }

    if ($(media).data('use-transcript-button') !== undefined && $(media).data('use-transcript-button') === false) { 
      this.useTranscriptButton = false; 
    }

    if ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== "false") { 
      this.lyricsMode = true; 
    }

    if ($(media).data('transcript-title') !== undefined) { 
      // NOTE: empty string is valid; results in no title being displayed  
      this.transcriptTitle = $(media).data('transcript-title'); 
    }

    if ($(media).data('youtube-id') !== undefined && $(media).data('youtube-id') !== "") { 
      this.youtubeId = $(media).data('youtube-id'); 
    }

    if ($(media).data('youtube-desc-id') !== undefined && $(media).data('youtube-desc-id') !== "") { 
      this.youtubeDescId = $(media).data('youtube-desc-id'); 
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
    
    if ($(media).data('icon-type') !== undefined && $(media).data('icon-type') !== "") { 
      var iconType = $(media).data('icon-type');
      if (iconType === 'font' || iconType == 'image') {
        this.iconType = iconType; 
      }
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
    
    if ($(media).data('fallback') !== undefined && $(media).data('fallback') !== "") { 
      var fallback =  $(media).data('fallback');
      if (fallback === 'jw') { 
        this.fallback = fallback; 
      }
    }

    if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== "false") { 
      this.testFallback = true; 
    }
    
    if ($(media).data('fallback-path') !== undefined && $(media).data('fallback-path') !== "false") { 
      this.fallbackPath = $(media).data('fallback-path'); 
    }
    
    if ($(media).data('translation-path') !== undefined && $(media).data('translation-path') !== "false") { 
      this.translationPath = $(media).data('translation-path'); 
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
    this.tt = []; 
    var thisObj = this;
    $.when(this.getTranslationText()).then(
      function () { 
        if (thisObj.countProperties(thisObj.tt) > 50) { 
          // close enough to ensure that most text variables are populated 
          thisObj.setup();
          if (thisObj.startTime > 0 && !thisObj.autoplay) { 
            // scrub ahead to startTime, but don't start playing 
            // can't do this in media event listener   
            // because in some browsers no media events are fired until media.play is requested 
            // even if preload="auto" 
            thisObj.onMediaUpdateTime();            
          }          
        } 
        else { 
          // can't continue loading player with no text
          console.log('ERROR: Failed to load translation table');         
        }
      }
    );
  };

  // Index to increment every time new player is created.
  AblePlayer.nextIndex = 0;

  AblePlayer.prototype.setup = function() {
    var thisObj = this;
    if (this.debug && this.startTime > 0) {
      console.log('Will start media at ' + this.startTime + ' seconds');
    }
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

  AblePlayer.youtubeIframeAPIReady = false;
  AblePlayer.loadingYoutubeIframeAPI = false;
})(jQuery);
(function ($) {
  // Set default variable values.
  AblePlayer.prototype.setDefaults = function () {

    // Debug - set to true to write messages to console; otherwise false
    this.debug = false;

    // Volume range is 0 to 1. Don't crank it to avoid overpowering screen readers
    this.defaultVolume = 0.5;

    // Default video height and width 
    // Can be overwritten with height and width attributes on HTML <video> element
    this.playerWidth = 480;
    this.playerHeight = 360; 

    // Button color 
    // Media controller background color can be customized in able.css 
    // Choose 'white' if your controller has a dark background, 'black' if a light background
    // Use a contrast checker to ensure your color scheme has sufficient contrast
    // e.g., http://www.paciellogroup.com/resources/contrastAnalyser
    this.iconColor = 'white';

    // Icon type 
    // By default, AblePlayer uses scalable icomoon fonts for the player controls 
    // and falls back to images if the user has a custom style sheet that overrides font-family 
    // set this to 'image' to always use images for player controls; otherwise leave set to 'font'
    this.iconType = 'font';   
  
    // seekInterval = Number of seconds to seek forward or back with these buttons    
    // NOTE: Unless user overrides this default with data-seek-interval attribute, 
    // this value is replaced by 1/10 the duration of the media file, once the duration is known 
    this.seekInterval = 10;
    
    // useFixedSeekInterval = Force player to use the hard-coded value of this.seekInterval  
    // rather than override it with 1/10 the duration of the media file 
    this.useFixedSeekInterval = false; 

    // In ABLE's predecessor (AAP) progress sliders were included in supporting browsers 
    // However, this results in an inconsistent interface across browsers 
    // most notably, Firefox as of 16.x still did not support input[type="range"] (i.e., sliders)
    // The following variable can be used in the future to add conditional slider support if desired
    // Note that the related code has not been updated for ABLE. 
    // Therefore, this should NOT be set to true at this point. 
    this.useSlider = true;
  
    // showNowPlaying - set to true to show 'Now Playing:' plus title of current track above player 
    // Otherwise set to false 
    // This is only used when there is a playlist 
    this.showNowPlaying = true;

    // fallback - set to 'jw' if implementation includes JW Player as fallback 
    // JW Player is licensed separately 
    // JW Player files must be included in thirdparty folder 
    // JW Player will be loaded as needed in browsers that don't support HTML5 media 
    // No other fallback solution is supported at this time
    // If NOT using JW Player, set to false. An error message will be displayed if browser can't play the media.  
    this.fallback = 'jw'; 
  
    // fallback path - specify path to fallback player files 
    this.fallbackPath = '../thirdparty/';  
    
    // testFallback - set to true to force browser to use the fallback player (for testing)
    // Note: JW Player does not support offline playback (a Flash restriction)
    // Therefore testing must be performed on a web server 
    this.testFallback = false;

    // translationPath - specify path to translation files 
    this.translationPath = '../translations/';
    
    // lang - default language of the player
    this.lang = 'en'; 
  
    // forceLang - set to true to force player to use default player language 
    // set to false to reset this.lang to language of the web page or user's browser,
    // if either is detectable and if a matching translation file is available 
    this.forceLang = false;

    // loop - if true, will start again at top after last item in playlist has ended
    // NOTE: This is not fully supported yet - needs work 
    this.loop = true; 
          
    // lyricsMode - line breaks in WebVTT caption file are always supported in captions 
    // but they're removed by default form transcripts in order to form a more seamless reading experience 
    // Set lyricsMode to true to add line breaks between captions, and within captions if there are "\n" 
    this.lyricsMode = false; 
    
    // transcriptTitle - override default transcript title 
    // Note: If lyricsMode is true, default is automatically replaced with "Lyrics" 
    this.transcriptTitle = 'Transcript';
    
    // useTranscriptButton - on by default if there's a transcript 
    // However, if transcript is written to an external div via data-transcript-div 
    // it might be desirable for the transcript to always be ON, with no toggle 
    // This can be overridden with data-transcript-button="false" 
    this.useTranscriptButton = true; 

    this.setButtonImages();
  };

  AblePlayer.prototype.setButtonImages = function() { 
  
    var imgPath = '../images/' + this.iconColor + '/';
    
    this.playButtonImg = imgPath + 'play.png';
    this.pauseButtonImg = imgPath + 'pause.png';
    this.rewindButtonImg = imgPath + 'rewind.png';
    this.forwardButtonImg = imgPath + 'forward.png';
    this.fasterButtonImg = imgPath + 'slower.png';
    this.slowerButtonImg = imgPath + 'faster.png';
    this.volumeMuteButtonImg = imgPath + 'volume-mute.png';
    this.volumeLoudButtonImg = imgPath + 'volume-loud.png';
    this.volumeIncreaseButtonImg = imgPath + 'volume-up.png';
    this.volumeDecreaseButtonImg = imgPath + 'volume-down.png';
    this.captionsButtonImg = imgPath + 'captions.png';
    this.chaptersButtonImg = imgPath + 'chapters.png';
    this.signButtonImg = imgPath + 'sign.png';
    this.transcriptButtonImg = imgPath + 'transcript.png';
    this.descriptionsButtonImg = imgPath + 'descriptions.png';
    this.fullscreenExpandButtonImg = imgPath + 'fullscreen-expand.png';
    this.fullscreenCollapseButtonImg = imgPath + 'fullscreen-collapse.png';
    this.prefsButtonImg = imgPath + 'preferences.png';
    this.helpButtonImg = imgPath + 'help.png';
  };
  
  // Initialize player based on data on page.
  // This sets some variables, but does not modify anything.  Safe to call multiple times.
  // Can call again after updating this.media so long as new media element has the same ID.
  AblePlayer.prototype.reinitialize = function () {
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    // if F12 Developer Tools aren't open in IE (through 9, no longer a problen in IE10)
    // console.log causes an error - can't use debug without a console to log messages to 
    if (! window.console) { 
      this.debug = false;
    }

    this.startedPlaying = false;
    // TODO: Move this setting to cookie.
    this.autoScrollTranscript = true;

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
      if (this.debug) { 
        console.log('You initialized Able Player with ' + this.mediaId + ', which is a ' + this.mediaType + ' element.'); 
        console.log('Able Player only works with HTML audio or video elements.');
        console.log('The element with id ' + this.mediaId + ' is a ' + this.mediaType + ' element.');
        console.log('Expecting an audio or video element.'); 
      }
      deferred.fail();
      return promise;
    }
    
    this.$sources = this.$media.find('source');
    if (this.debug) { 
      console.log('found ' + this.$sources.length + ' media sources');
    }

    this.player = this.getPlayer();
    this.setIconType();
    this.setDimensions();

    deferred.resolve();
    return promise;
  };

  AblePlayer.prototype.setDimensions = function() { 
    // override default dimensions with width and height attributes of media element, if present
    if (this.$media.attr('width')) { 
      this.playerWidth = parseInt(this.$media.attr('width'), 10);
    }
    if (this.$media.attr('height')) { 
      this.playerHeight = parseInt(this.$media.attr('height'), 10);
    }
  };

  AblePlayer.prototype.setIconType = function() { 
    // returns either "font" or "image" 
    // create a temporary play span and check to see if button has font-family == "icomoon" (the default) 
    // if it doesn't, user has a custom style sheet and icon fonts will not display properly 
    // use images as fallback 

    var $tempButton;
     
    // Note: webkit doesn't return calculated styles unless element has been added to the DOM 
    // and is visible; use clip method to satisfy this need yet hide it  
    $tempButton = $('<span>',{ 
      'class': 'icon-play able-clipped'
    });
    $('body').append($tempButton);

    if (this.iconType === 'font') {   
      // check to be sure user can display icomoon fonts 
      // if not, fall back to images 
      if (window.getComputedStyle) {
        // the following retrieves the computed value of font-family
        // tested in Firefox with "Allow pages to choose their own fonts" unchecked - works! 
        // tested in IE with user-defined style sheet enables - works! 
        // It does NOT account for users who have "ignore font styles on web pages" checked in IE 
        // There is no known way to check for that 
        this.controllerFont = window.getComputedStyle($tempButton.get(0), null).getPropertyValue('font-family');
        if (this.controllerFont) {
          this.controllerFont = this.controllerFont.replace(/["']/g, ''); // strip out single or double quotes 
          this.iconType = 'font';
        }
        else { 
          this.iconType = 'image';
        }
      }
      else { // IE 8 and earlier  
        // There is no known way to detect computed font in IE8 and earlier  
        // The following retrieves the value from the style sheet, not the computed font 
        // this.controllerFont = $tempButton.get(0).currentStyle.fontFamily;
        // It will therefore return "icomoon", even if the user is overriding that with a custom style sheet 
        // To be safe, use images   
        this.iconType = 'image';
      }
    }
    if (this.debug) {
      console.log('Using ' + this.iconType + 's for player controls');
      if (this.iconType === 'font') { 
        console.log('User font for controller is ' + this.controllerFont);
      }
    }
    $tempButton.remove();
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
    var thisObj = this;
    // TODO: Ensure when recreating player that we carry over the mediaId
    if (!this.player) {
      console.log("Can't create player; no appropriate player type detected.");
      return;
    }

    this.setMediaAttributes();

    this.loadCurrentPreferences();
    this.injectPlayerCode();
    this.setupTracks().then(function () {
      thisObj.setupPopups();
      thisObj.initDescription();
      thisObj.initializing = false;
      thisObj.initPlayer();
    });
  };

  AblePlayer.prototype.initPlayer = function () {
    var thisObj = this;
    var playerPromise;

    if (this.debug && this.player) { 
      console.log ('Using the ' + this.player + ' media player');
    }
    // First run player specific initialization.
    if (this.player === 'html5') {
      playerPromise = this.initHtml5Player();
    }
    else if (this.player === 'jw') {
      playerPromise = this.initJwPlayer();
    }
    else if (this.player === 'youtube') {
      playerPromise = this.initYoutubePlayer();
    }

    // After player specific initialization is done, run remaining general initialization.
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    playerPromise.done(function () {
      thisObj.addControls();
      thisObj.addEventListeners();
      // Calling these set functions also initializes some icons.
      thisObj.setMute(false);
      thisObj.setFullscreen(false);
      thisObj.setVolume(thisObj.defaultVolume);
      thisObj.initializing = true;
      // If using open description (as determined previously based on prefs & availability)
      // swap media file now 
      thisObj.updateDescription();
      thisObj.updateCaption();
      thisObj.updateTranscript();
      thisObj.showSearchResults();
      thisObj.initializing = false;
      thisObj.refreshControls();

      // After done messing with the player, this is necessary to fix playback on iOS
      if (thisObj.player === 'html5' && thisObj.isIOS()) {
        thisObj.$media[0].load();
      }
      if (thisObj.useFixedSeekInterval === false) { 
        // 10 steps in seek interval; waited until now to set this so we can fetch a duration
        // If duration is still unavailable (JW Player), try again in refreshControls()
        var duration = thisObj.getDuration();
        if (duration > 0) {
          thisObj.seekInterval = Math.max(thisObj.seekInterval, duration / 10);
          thisObj.seekIntervalCalculated = true;
        }
        else { 
          thisObj.seekIntervalCalculated = false;
        }
      }
      
      deferred.resolve();
    });
    
    return promise;
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

    // attempt to load jwplayer script
    $.getScript(this.fallbackPath + 'jwplayer.js') 
      .done(function( script, textStatus ) {
        if (thisObj.debug) {
          console.log ('Successfully loaded the JW Player');
        }

        // add an id to div.able-media-container (JW Player needs this) 
        thisObj.jwId = thisObj.mediaId + '_fallback';            
        thisObj.$mediaContainer.attr('id', thisObj.jwId);

        if (thisObj.mediaType === 'audio') { 
          // JW Player always shows its own controls if height <= 40 
          // Must set height to 0 to hide them 
          // My bug report: 
          // http://www.longtailvideo.com/support/forums/jw-player/setup-issues-and-embedding/29814
          jwHeight = '0px';   
        }
        else { 
          jwHeight = thisObj.playerHeight;
        }
        var sources = [];
        $.each(thisObj.$sources, function (ii, source) {
          sources.push({file: $(source).attr('src')});      
        });
        
        var flashplayer = thisObj.fallbackPath + 'jwplayer.flash.swf';
        // var flashplayer = '../thirdparty/jwplayer.flash.swf';
        var html5player = thisObj.fallbackPath + 'jwplayer.html5.js';
        // var html5player = '../thirdparty/jwplayer.html5.js';
        
        if (thisObj.mediaType === 'video') { 
          thisObj.jwPlayer = jwplayer(thisObj.jwId).setup({
            playlist: [{
              sources: sources
            }],
            flashplayer: flashplayer,
            html5player: html5player,
            image: thisObj.$media.attr('poster'), 
            controls: false,
            volume: thisObj.defaultVolume * 100,
            height: jwHeight,
            width: thisObj.playerWidth,
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
            height: jwHeight,
            fallback: false, 
            primary: 'flash'
          });                             
        }
        // remove the media element - we're done with it
        // keeping it would cause too many potential problems with HTML5 & JW event listeners both firing
        thisObj.$media.remove();

        // Done with JW Player initialization.
        deferred.resolve();
      })
      .fail(function( jqxhr, preferences, exception ) {
        if (thisObj.debug) { 
          console.log ('Unable to load JW Player.');
        }
        thisObj.player = null;
        deferred.fail();
      });


    return promise;
  };

  AblePlayer.prototype.initYoutubePlayer = function () {
    var thisObj = this;

    var deferred = new $.Deferred();
    var promise = deferred.promise();

    // This is called once we're sure the Youtube APi is loaded -- see below.
    var finalizeYoutubeInitialization = function () {
      var containerId = thisObj.mediaId + '_youtube';
      thisObj.$mediaContainer.prepend($('<div>').attr('id', containerId));

      var youTubeId; 
      // if a described version is available && user prefers desription 
      // give them the described version 
      if (thisObj.youtubeDescId && thisObj.prefDesc) { 
        youTubeId = thisObj.youtubeDescId; 
        // TODO: add alert informing the user that the described version is being loaded
      }
      else { 
        youTubeId = thisObj.youtubeId;
      }
      
      thisObj.youtubePlayer = new YT.Player(containerId, {
        videoId: youTubeId,
        height: thisObj.playerHeight.toString(),
        width: thisObj.playerWidth.toString(),
        playerVars: {
          start: thisObj.startTime,
          controls: 0
        },
        events: {
          onReady: function () {
            deferred.resolve();
          },
          onError: function (x) {
            deferred.fail();
          }
        }
      });

      thisObj.$media.remove();
    };

    if (AblePlayer.youtubeIframeAPIReady) {
      // Script already loaded and ready.
      finalizeYoutubeInitialization();
    }
    else {
      if (!AblePlayer.loadingYoutubeIframeAPI) {
        // Need to load script; skipped if another player has already started loading.
        $.getScript('https://www.youtube.com/iframe_api')
          .fail(function () {
            if (thisObj.debug) {
              console.log('Unable to load Youtube API.');
            }
          });
      }
      
      // Catch script load event.
      $('body').on('youtubeIframeAPIReady', function () {
        finalizeYoutubeInitialization();
      });
    }

    return promise;
  };

  // Sets media/track/source attributes; is called whenever player is recreated since $media may have changed.
  AblePlayer.prototype.setMediaAttributes = function () {
    // Firefox puts videos in tab order; remove.
    this.$media.attr('tabindex', -1);

    // Keep native player from displaying captions/subtitles.
    // This *should* work but isn't supported in all browsers 
    // For example, Safari 8.0.2 always displays captions if default attribute is present 
    // even if textTracks.mode is 'disabled' or 'hidden'  
    // Still using this here in case it someday is reliable 
    // Meanwhile, the only reliable way to suppress browser captions is to remove default attribute
    // We're doing that in track.js > setupCaptions() 
    var textTracks = this.$media.get(0).textTracks;
    if (textTracks) {
      var i = 0;
      while (i < textTracks.length) {
        // mode is either 'disabled', 'hidden', or 'showing'
        // neither 'disabled' nor 'hidden' hides default captions in Safari 8.0.2 
        textTracks[i].mode = 'disabled'; 
        i += 1;
      }
    }    
  };
  
  AblePlayer.prototype.getPlayer = function() { 
    // Determine which player to use, if any 
    // return 'html5', 'jw' or null 
    var i, sourceType, $newItem;
    if (this.youtubeId) {
      if (this.mediaType !== 'video') {
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
        return null;
      }
    }
    else if (this.media.canPlayType) {
      return 'html5';
    }
    else { 
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
    $.cookie.json = true;
    if ($.isFunction($.cookie)) { 
      // set cookie that expires in 90 days 
      $.cookie('Able-Player', cookieValue, 90);  
    }
  };

  AblePlayer.prototype.getCookie = function() {
    var defaultCookie = {
      preferences: {}
    };

    $.cookie.json = true;
    if ($.isFunction($.cookie)) { 
      var cookie;
      try {
        cookie = $.cookie('Able-Player');
      }
      catch (err) {
        // Original cookie can't be parsed; update to default.
        this.setCookie(defaultCookie);
        cookie = defaultCookie;
      }
      if (cookie) {
        return cookie;
      }
      else {
        return defaultCookie;
      }
    }
  };

  AblePlayer.prototype.getAvailablePreferences = function() { 
    // Return the list of currently available preferences.

    var prefs = [];
    
    // modifier keys preferences apply to both audio and video 
    prefs.push({
      'name': 'prefAltKey', // use alt key with shortcuts 
      'label': this.tt.prefAltKey,
      'default': 1 
    });
    
    prefs.push({
      'name': 'prefCtrlKey', // use ctrl key with shortcuts
      'label': this.tt.prefCtrlKey,
      'default': 1 
    });
    
    prefs.push({
      'name': 'prefShiftKey',
      'label': this.tt.prefShiftKey,
      'default': 0
    });
    if (this.mediaType === 'video') { // features prefs apply only to video
      prefs.push({
        'name': 'prefCaptions', // closed captions default state 
        'label': this.tt.prefCaptions,
        'default': 1 // on because many users can benefit
      });
      
      prefs.push({
        'name': 'prefDesc', // audio description default state 
        'label': this.tt.prefDesc,
        'default': 0 // off because users who don't need it might find it distracting
      });
      
      prefs.push({
        'name': 'prefClosedDesc', // use closed description if available
        'label': this.tt.prefClosedDesc,
        'default': 0 // off because experimental
      });
      
      prefs.push({
        'name': 'prefDescPause', // automatically pause when closed description starts
        'label': this.tt.prefDescPause,
        'default': 0 // off because it burdens user with restarting after every pause 
      });

      prefs.push({
        'name': 'prefVisibleDesc', // visibly show closed description (if avilable and used)
        'label': this.tt.prefVisibleDesc,
        'default': 1 // on because sighted users probably want to see this cool feature in action 
      });
      
      prefs.push({
        'name': 'prefTranscript', // transcript default state
        'label': this.tt.prefTranscript,
        'default': 0 // off because turning it on has a certain WOW factor 
      });

      prefs.push({
        'name': 'prefHighlight', // highlight transcript as media plays
        'label': this.tt.prefHighlight,
        'default': 1 // on because many users can benefit
      });
      
      prefs.push({
        'name': 'prefTabbable', // tab-enable transcript 
        'label': this.tt.prefTabbable,
        'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
      });
    }
    else { 

      prefs.push({
        'name': 'prefTranscript', // transcript default state
        'label': this.tt.prefTranscript,
        'default': 0 // off because turning it on has a certain WOW factor 
      });

      prefs.push({
        'name': 'prefHighlight', // highlight transcript as media plays
        'label': this.tt.prefHighlight,
        'default': 1 // on because many users can benefit
      });      

      prefs.push({
        'name': 'prefTabbable', // tab-enable transcript 
        'label': this.tt.prefTabbable,
        'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page    
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

  // Creates the preferences form and injects it.
  AblePlayer.prototype.injectPrefsForm = function () {
    var prefsDiv, introText, prefsIntro, 
    featuresFieldset, featuresLegend, 
    keysFieldset, keysLegend, 
    i, thisPref, thisDiv, thisId, thisLabel, thisCheckbox, 
    thisObj, available; 
    
    thisObj = this;
    available = this.getAvailablePreferences();

    // outer container, will be assigned role="dialog"
    prefsDiv = $('<div>',{ 
      'class': 'able-prefs-form'
    });

    introText = '<p>' + this.tt.prefIntro + '</p>\n';
    
    prefsIntro = $('<p>',{ 
      html: introText
    });
    
    featuresFieldset = $('<fieldset>');
    featuresLegend = $('<legend>' + this.tt.prefFeatures + '</legend>');      
    featuresFieldset.append(featuresLegend);  
    
    keysFieldset = $('<fieldset>');
    keysLegend = $('<legend>' + this.tt.prefKeys + '</legend>');       
    keysFieldset.append(keysLegend);  
    
    for (i=0; i<available.length; i++) { 
      thisPref = available[i]['name'];
      thisDiv = $('<div>');
      thisId = this.mediaId + '_' + thisPref;   
      thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
      thisCheckbox = $('<input>',{
        type: 'checkbox',
        name: thisPref,
        id: thisId,
        value: 'true'
      });
      thisDiv.append(thisCheckbox).append(thisLabel);
      // check current active value for this preference 
      if (this[thisPref] === 1) { 
        thisCheckbox.prop('checked',true);
      }     
      // TODO: We need to indicate this in the prefs structure itself.
      if (i === 0 || i === 1 || i === 2) { // this is a key preference
        keysFieldset.append(thisDiv);     
      }
      else { // this is a feature preference
        featuresFieldset.append(thisDiv);
      }     
    }
    // Now assemble all the parts   
    prefsDiv
      .append(prefsIntro)
      .append(keysFieldset)
      .append(featuresFieldset);

    // must be appended to the BODY! 
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog, 
    // which will render the dialog unreadable by screen readers 
    // this.$ableDiv.append(prefsDiv); 
    $('body').append(prefsDiv);
    
    var dialog = new AccessibleDialog(prefsDiv, 'dialog', thisObj.tt.prefTitle, prefsIntro, thisObj.tt.closeButtonLabel, '32em');
    
    // Add save and cancel buttons.
    prefsDiv.append('<hr>');
    var saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
    var cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
    saveButton.click(function () {
      dialog.hide();
      thisObj.savePrefsFromForm();
    });
    cancelButton.click(function () {
      dialog.hide();
    });
    
    prefsDiv.append(saveButton);
    prefsDiv.append(cancelButton);
    this.prefsDialog = dialog;
  };

  // Return a prefs object constructed from the form.
  AblePlayer.prototype.savePrefsFromForm = function () {
    // called when user saves the Preferences form
    // update cookie with new value 
  
    var numChanges;  

    numChanges = 0;
    var cookie = this.getCookie();
    var available = this.getAvailablePreferences();
    for (var ii = 0; ii < available.length; ii++) {
      var prefName = available[ii]['name'];
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
    if (numChanges > 0) {     
      this.setCookie(cookie);
      this.showAlert(this.tt.prefSuccess);
    } 
    else { 
      this.showAlert(this.tt.prefNoChange);   
    }

    this.updatePrefs();
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
    this.updateCaption();
    this.updateDescription();
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
  AblePlayer.prototype.parseWebVTT = function(text) {

    // Normalize line ends to \n.
    text = text.replace(/(\r\n|\n|\r)/g,'\n');
    
    var parserState = {
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
      console.log('Line: ' + parserState.line + '\nColumn: ' + parserState.column);
      console.log(err);
    }
    
    return parserState;
  }
  
  function actList(state, list) {
    var results = [];
    for (var ii in list) {
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
    for (var ii in cutText) {
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
      else if ($.trim(nextLine).length !== 0) {
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
    if (nextLine.indexOf('-->') === -1) {
      cueId = cutLine(state);
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
      if (nextLine.indexOf('-->') !== -1) {
        break;
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
        // Define token.parent; added by Terrill to fix bug on Line 296
        token.parent = current; 
        if ($.inArray(token.tagName, ['c', 'i', 'b', 'u', 'ruby']) !== -1) {
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
          // Fixed (I think) by assigning current token to token.parent  on Line 260
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
      state.error = 'Unable to parse timestamp.';
      return;
    }
    var time = 0;
    var hours = results[2];
    var minutes = results[4];
    
    if (minutes) {
      if (parseInt(minutes, 10) > 59) {
        state.error = 'Invalid minute range.';
        return;
      }
      if (hours) {
        time += 3600 * parseInt(hours, 10);
      }
      time += 60 * parseInt(minutes, 10);
      var seconds = results[5];
      if (parseInt(seconds, 10) > 59) {
        state.error = 'Invalid second range.';
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
    
    var thisObj = this;

    // create $mediaContainer and $ableDiv and wrap them around the media element
    this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();        
    this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
    this.$mediaContainer.width(this.playerWidth);
    if (this.mediaType == 'video') {     
      this.$mediaContainer.height(this.playerHeight);
    }
    this.$ableDiv.width(this.playerWidth);
    
    this.injectOffscreenHeading();
    
    // youtube adds its own big play button
    if (this.mediaType === 'video' && this.player !== 'youtube') {
      this.injectBigPlayButton();

      // add container that captions or description will be appended to
      // Note: new Jquery object must be assigned _after_ wrap, hence the temp vidcapContainer variable  
      var vidcapContainer = $('<div>',{ 
        'class' : 'able-vidcap-container'
      });
      this.$vidcapContainer = this.$mediaContainer.wrap(vidcapContainer).parent();
    }

    this.injectPlayerControlArea();
    this.injectTextDescriptionArea();

    if (this.includeTranscript) {
      this.injectTranscriptArea();
      this.addTranscriptAreaEvents();
    }    

    this.injectAlert();
    this.injectPlaylist();
    // create the hidden form that will be triggered by a click on the Preferences button
    this.injectPrefsForm();        

  };

  AblePlayer.prototype.injectOffscreenHeading = function () {
    // Add offscreen heading to the media container.
    // To fine the nearest heading in the ancestor tree, 
    // loop over each parent of $ableDiv until a heading is found 
    // If multiple headings are found beneath a given parent, get the closest
    // The heading injected in $ableDiv is one level deeper than the closest heading 
    var headingType; 
    
    var $parents = this.$ableDiv.parents();
    $parents.each(function(){
      var $this = $(this); 
      var $thisHeadings = $this.find('h1, h2, h3, h4, h5, h6'); 
      var numHeadings = $thisHeadings.length;
      if(numHeadings){
        headingType = $thisHeadings.eq(numHeadings-1).prop('tagName');
        return false;
      }
    });
    if (typeof headingType === 'undefined') { 
      var headingType = 'h1';
    }
    else { 
      // Increment closest heading by one if less than 6.
      var headingNumber = parseInt(headingType[1]);
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
      headingType = 'h' + headingNumber.toString();
    }
    this.playerHeadingLevel = headingNumber;
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

    this.$mediaContainer.prepend(this.$bigPlayButton);
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
      'role' : 'alert'
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
      'role' : 'alert'
    }).text(this.tt.speed + ': 1x'); 
    
    this.$status = $('<span>',{
      'class' : 'able-status',
      'role' : 'alert'
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
      'role': 'alert'
    });
    // Start off with description hidden.
    this.$descDiv.hide();
    // TODO: Does this need to be changed when preference is changed?
    if (this.prefClosedDesc === 0 || this.prefVisibleDesc === 0) { 
      this.$descDiv.addClass('able-clipped');                
    }

    this.$ableDiv.append(this.$descDiv);
  };

  AblePlayer.prototype.injectTranscriptArea = function() {
    this.$transcriptArea = $('<div>', {
      'class': 'able-transcript-area'
    });
    
    this.$transcriptToolbar = $('<div>', {
      'class': 'able-transcript-toolbar'
    });
    
    this.$transcriptDiv = $('<div>', {
      'class' : 'able-transcript'
    });
    
    // Transcript toolbar content:
    this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
    this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);
    this.$transcriptLanguageSelect = $('<select id="transcript-language-select">');
    // Add a default "Unknown" option; this will be deleted later if there are any
    // elements with a language.
    this.$unknownTranscriptOption = $('<option val="unknown">' + this.tt.unknown + '</option>');
    this.$transcriptLanguageSelect.append(this.$unknownTranscriptOption);
    this.$transcriptLanguageSelect.prop('disabled', true);

    var floatRight = $('<div style="float: right;">');
    this.$transcriptLanguageSelectContainer = floatRight;
    
    floatRight.append($('<label for="transcript-language-select">' + this.tt.language + ': </label>'), this.$transcriptLanguageSelect);
    this.$transcriptToolbar.append(floatRight);
    
    this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);

    // If client has provided separate transcript location, put it there instead.
    if (this.transcriptDivLocation) {
      $('#' + this.transcriptDivLocation).append(this.$transcriptArea);
    }
    else {
      // Place adjacent to player with reactive flow.
      this.$ableColumnLeft = this.$ableDiv.wrap('<div class="able-column-left">').parent();
      this.$ableColumnLeft.width(this.playerWidth);
      this.$transcriptArea.insertAfter(this.$ableColumnLeft);
      this.$ableColumnRight = this.$transcriptArea.wrap('<div class="able-column-right">').parent();
      this.$ableColumnRight.width(this.playerWidth);
    }
    
    // If client has provided separate transcript location, override user's preference for hiding transcript
    if (!this.prefTranscript && !this.transcriptDivLocation) { 
      this.$transcriptArea.hide(); 
    }
  };

  AblePlayer.prototype.injectAlert = function () {
    this.alertBox = $('<div role="alert"></div>');
    this.alertBox.addClass('able-tooltip');
    this.alertBox.appendTo(this.$ableDiv);
    this.alertBox.css({
      top: this.$mediaContainer.offset().top
    });

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
      if (this.debug) { 
        console.log('after initializing playlist, there are ' + this.$sources.length + ' media sources');
      }
    } 

  };
  
  AblePlayer.prototype.addTranscriptAreaEvents = function() {
    var thisObj = this;

    this.$autoScrollTranscriptCheckbox.click(function () {
      thisObj.handleTranscriptLockToggle(thisObj.$autoScrollTranscriptCheckbox.prop('checked'));
    });

    this.$transcriptDiv.bind('mousewheel DOMMouseScroll click scroll', function (event) {
      // Propagation is stopped in seekpoint click handler, so clicks are on the scrollbar
      // or outside of a seekpoint.
      if (!thisObj.scrollingTranscript) {
        thisObj.autoScrollTranscript = false;
        thisObj.refreshControls();
      }
      thisObj.scrollingTranscript = false;
    });

    this.$transcriptLanguageSelect.change(function () {
      var language = thisObj.$transcriptLanguageSelect.val();
      for (var ii in thisObj.captions) {
        if (thisObj.captions[ii].language === language) {
          thisObj.transcriptCaptions = thisObj.captions[ii];
        }
      }
      for (var ii in thisObj.descriptions) {
        if (thisObj.descriptions[ii].language === language) {
          thisObj.transcriptDescriptions = thisObj.descriptions[ii];
        }
      }
      thisObj.updateTranscript();
    });
  };

  // Create popup div and append to player 
  // 'which' parameter is either 'captions' or 'chapters'
  AblePlayer.prototype.createPopup = function (which) {
    
    var thisObj, popup, $thisButton, $thisListItem, $prevButton, $nextButton, 
        selectedTrackIndex, selectedTrack;
    thisObj = this;
    popup = $('<div>',{
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup' 
    });

    popup.keydown(function (e) {
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
    this.$controllerDiv.append(popup);
    return popup;
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
  };

  // Create and fill in the popup menu forms for various controls.
  AblePlayer.prototype.setupPopups = function () {
    
    var popups, thisObj, hasDefault, i, j, tracks, trackList, trackItem, track,  
        radioName, radioId, trackButton, trackLabel; 
    
    popups = [];     
    if (this.captions.length > 0) { 
      popups.push('captions');
    }
    if (this.chapters.length > 0) { 
      popups.push('chapters');
    }
    if (popups.length > 0) { 
      thisObj = this;
      for (var i=0; i<popups.length; i++) {         
        var popup = popups[i];              
        hasDefault = false;
        if (popup == 'captions') {
          this.captionsPopup = this.createPopup('captions');
          tracks = this.captions;           
        }
        else if (popup == 'chapters') { 
          this.chaptersPopup = this.createPopup('chapters');
          tracks = this.chapters; 
        }
        var trackList = $('<ul></ul>');
        radioName = this.mediaId + '-' + popup + '-choice';
        for (j in tracks) {
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
            trackButton.attr('checked','checked');            
            hasDefault = true;
          }          
          trackLabel = $('<label>',{ 
            'for': radioId
          });
          if (track.language !== 'undefined') { 
            trackButton.attr('lang',track.language);
          }
          if (popup == 'captions') { 
            trackLabel.text(track.label || track.language);          
            trackButton.click(this.getCaptionClickFunction(track));
            //trackButton.click(this.handleCaptionRadioSelect(track));
            // trackButton.keypress(function() { alert('hey!');});
          }
          else if (popup == 'chapters') { 
            trackLabel.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
            var getClickFunction = function (time) {
              return function () {
                thisObj.seekTo(time);
                thisObj.hidingPopup = true; 
                thisObj.chaptersPopup.hide();
                thisObj.$chaptersButton.focus();
              }
            }
            trackButton.on('click keypress',getClickFunction(track.start));
          }
          trackItem.append(trackButton,trackLabel);
          trackList.append(trackItem);      
        }
        if (popup == 'captions') { 
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
          trackButton.click(this.getCaptionOffFunction());
          trackItem.append(trackButton,trackLabel);
          trackList.append(trackItem);          
        }
        if (!hasDefault) { 
          // check the first button 
          trackList.find('input').first().attr('checked','checked');          
        }
        if (popup == 'captions') {
          this.captionsPopup.append(trackList);
        }
        else if (popup == 'chapters') { 
          this.chaptersPopup.append(trackList);
        }
      }
    }    
  };

  AblePlayer.prototype.provideFallback = function(reason) {             
    // provide ultimate fallback for users who are unable to play the media
    // reason is either 'No Support' or a specific error message     

    var fallback, fallbackText, fallbackContainer, showBrowserList, browsers, i, b, browserList, poster, posterImg;
    
    // use fallback content that's nested inside the HTML5 media element, if there is any
    // any content other than div, p, and ul is rejected 

    fallback = this.$media.find('div,p,ul');
    showBrowserList = false;

    if (fallback.length === 0) {       
      if (reason !== 'No Support' && typeof reason !== 'undefined') { 
        fallback = $('<p>').text(reason); 
      }
      else {
        fallbackText =  this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
        fallbackText += this.tt.fallbackError2 + ':';
        fallback = $('<p>').text(fallbackText);
        showBrowserList = true;         
      }  
    }
    fallbackContainer = $('<div>',{
      'class' : 'able-fallback',
      'role' : 'alert',
      'width' : this.playerWidth
    });
    this.$media.before(fallbackContainer);     
    fallbackContainer.html(fallback);  
    if (showBrowserList) { 
      browserList = $('<ul>');
      browsers = this.getSupportingBrowsers();
      for (i=0; i<browsers.length; i++) { 
        b = $('<li>');
        b.text(browsers[i].name + ' ' + browsers[i].minVersion + ' ' + this.tt.orHigher);
        browserList.append(b);
      }
      fallbackContainer.append(browserList);      
    }
    
    // if there's a poster, show that as well 
    if (this.$media.attr('poster')) { 
      poster = this.$media.attr('poster'); 
      var posterImg = $('<img>',{
        'src' : poster,
        'alt' : "",
        'role': "presentation"
      });
      fallbackContainer.append(posterImg);      
    }
    
    // now remove the media element. 
    // It doesn't work anyway 
    this.$media.remove();     
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

  AblePlayer.prototype.addHelp = function() {   
    // create help text that will be displayed in a modal dialog 
    // if user clicks the Help button   
  
    var $helpDiv, $helpTextWrapper, $helpIntro, $helpDisclaimer, helpText, i, label, key, $okButton; 
  
    // outer container, will be assigned role="dialog"  
    $helpDiv = $('<div></div>',{ 
      'class': 'able-help-div'
    });
    
    // inner container for all text, will be assigned to modal div's aria-describedby 
    $helpTextWrapper = $('<div></div>');
    
    $helpIntro = $('<p></p>').text(this.tt.helpKeys);    
    $helpDisclaimer = $('<p></p>').text(this.tt.helpKeysDisclaimer);
    helpText = '<ul>\n';
    for (i=0; i<this.controls.length; i++) { 
      if (this.controls[i] === 'play') { 
        label = this.tt.play + '/' + this.tt.pause;
        key = 'p </span><em>' + this.tt.or + '</em><span class="able-help-modifiers"> ' + this.tt.spacebar;
      }
      else if (this.controls[i] === 'stop') { 
        label = this.tt.stop;
        key = 's';
      }
      else if (this.controls[i] === 'rewind') { 
        label = this.tt.rewind;
        key = 'r';
      }
      else if (this.controls[i] === 'forward') { 
        label = this.tt.forward;
        key = 'f';
      }
      else if (this.controls[i] === 'mute') { 
        label = this.tt.mute;
        key = 'm';
      }
      else if (this.controls[i] === 'volumeUp') { 
        label = this.tt.volumeUp;
        key = 'u </b><em>' + this.tt.or + '</em><b> 1-5';
      }
      else if (this.controls[i] === 'volumeDown') { 
        label = this.tt.volumeDown;
        key = 'd </b><em>' + this.tt.or + '</em><b> 1-5';
      }
      else if (this.controls[i] === 'captions') { 
        if (this.captions.length > 1) { 
          // caption button launches a Captions popup menu
          label = this.tt.captions;
        }        
        else { 
          // there is only one caption track
          // therefore caption button is a toggle
          if (this.captionsOn) { 
            label = this.tt.hideCaptions;
          }
          else { 
            label = this.tt.showCaptions;
          }
        }
        key = 'c';
      }
      else if (this.controls[i] === 'descriptions') { 
        if (this.descOn) {     
          label = this.tt.turnOffDescriptions;
        }
        else { 
          label = this.tt.turnOnDescriptions;
        }
        key = 'n';
      }
      else if (this.controls[i] === 'prefs') { 
        label = this.tt.preferences;
        key = 't';
      }
      else if (this.controls[i] === 'help') { 
        label = this.tt.help;
        key = 'h';
      }
      else { 
        label = false;
      }
      if (label) { 
        helpText += '<li><span class="able-help-modifiers">'; 
        if (this.prefAltKey === 1) { 
          helpText += this.tt.prefAltKey + ' + ';
        }
        if (this.prefCtrlKey === 1) { 
          helpText += this.tt.prefCtrlKey + ' + ';
        }
        if (this.prefShiftKey === 1) {
          helpText += this.tt.prefShiftKey + ' + ';
        }
        helpText += key + '</span> = ' + label + '</li>\n';
      }
    }
    helpText += '</ul>\n';
    
    // Now assemble all the parts   
    $helpTextWrapper.append($helpIntro);
    $helpTextWrapper.append(helpText);
    $helpTextWrapper.append($helpDisclaimer);
    $helpDiv.append($helpTextWrapper);
    
    // must be appended to the BODY! 
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog, 
    // which will render the dialog unreadable by screen readers 
    $('body').append($helpDiv);

    // Tip from Billy Gregory at AHG2014: 
    // If dialog does not collect information, use role="alertdialog" 
    var dialog = new AccessibleDialog($helpDiv, 'alertdialog', this.tt.helpTitle, $helpTextWrapper, this.tt.closeButtonLabel, '40em');

    $helpDiv.append('<hr>');
    $okButton = $('<button>' + this.tt.ok + '</button>');
    $okButton.click(function () {
      dialog.hide();
    });

    $helpDiv.append($okButton);
    this.helpDialog = dialog;
  };

  // Calculates the layout for controls based on media and options.
  // Returns an object with keys 'ul', 'ur', 'bl', 'br' for upper-left, etc.
  // Each associated value is array of control names to put at that location.
  AblePlayer.prototype.calculateControlLayout = function () {
    // Removed rewind/forward in favor of seek bar.
    var controlLayout = {
      'ul': ['play','stop'],
      'ur': [],
      'bl': [],
      'br': []
    }
        
    if (this.useSlider) {
      controlLayout['ur'].push('rewind');
      controlLayout['ur'].push('seek');
      controlLayout['ur'].push('forward');
    }
    
    // Calculate the two sides of the bottom-left grouping to see if we need separator pipe.
    var bll = [];
    // test for browser support for volume before displaying volume-related buttons 
    if (this.browserSupportsVolume()) { 
      bll.push('mute');
      bll.push('volume-up');
      bll.push('volume-down');
    }

    var blr = [];
    if (this.mediaType === 'video') { 
      if (this.hasCaptions) {
        blr.push('captions'); //closed captions
      }
      if (this.hasOpenDesc || this.hasClosedDesc) { 
        blr.push('descriptions'); //audio description 
      }
      if (this.hasSignLanguage) { 
        blr.push('sign'); // sign language
      }
    }

    if (this.includeTranscript && this.useTranscriptButton) {
      blr.push('transcript');
    }

    if (this.isPlaybackRateSupported()) {
      blr.push('slower'); 
      blr.push('faster');
    }

    if (this.mediaType === 'video' && this.hasChapters) {
      blr.push('chapters');
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
        
    controlLayout['br'].push('preferences');
    controlLayout['br'].push('help');

    // TODO: JW currently has a bug with fullscreen, anything that can be done about this?
    if (this.mediaType === 'video' && this.player !== 'jw') {
      controlLayout['br'].push('fullscreen');
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
    i, j, controls, controllerSpan, tooltipId, tooltipDiv, tooltipX, tooltipY, control, 
    buttonImg, buttonImgSrc, buttonTitle, newButton, iconClass, buttonIcon,
    leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle, 
    controllerStyles, vidcapStyles, captionLabel;  
    
    var thisObj = this;
    
    var baseSliderWidth = 100;

    // Initializes the layout into the this.controlLayout variable.
    var controlLayout = this.calculateControlLayout();
    
    var sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};
    
    // add an empty div to serve as a tooltip
    tooltipId = this.mediaId + '-tooltip';
    tooltipDiv = $('<div>',{
      'id': tooltipId,
      'class': 'able-tooltip' 
    });
    this.$controllerDiv.append(tooltipDiv);
    
    // step separately through left and right controls
    for (i = 0; i <= 3; i++) {
      controls = controlLayout[sectionByOrder[i]];
      if ((i % 2) === 0) {        
        controllerSpan = $('<span>',{
          'class': 'able-left-controls'
        });
      }
      else { 
        controllerSpan = $('<span>',{
          'class': 'able-right-controls'
        });
      }
      this.$controllerDiv.append(controllerSpan);
      
      for (j=0; j<controls.length; j++) { 
        control = controls[j];
        if (control === 'seek') { 
          var sliderDiv = $('<div class="able-seekbar"></div>');
          controllerSpan.append(sliderDiv);
          
          this.seekBar = new AccessibleSeekBar(sliderDiv, baseSliderWidth);
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
              src: '../images/' + this.iconColor + '/pipe.png',
              alt: '',
              role: 'presentation'
            });
            pipe.append(pipeImg);
          }
          controllerSpan.append(pipe);
        }
        else {        
          // this control is a button 
          if (control === 'mute') { 
            buttonImgSrc = '../images/' + this.iconColor + '/volume-mute.png';
          }
          else if (control === 'fullscreen') { 
            buttonImgSrc = '../images/' + this.iconColor + '/fullscreen-expand.png';            
          }
          else { 
            buttonImgSrc = '../images/' + this.iconColor + '/' + control + '.png';
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
          if (this.iconType === 'font') {
            iconClass = 'icon-' + control; 
            buttonIcon = $('<span>',{ 
              'class': iconClass,
              'aria-hidden': 'true'
            })               
            newButton.append(buttonIcon);
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
            if ($(this).closest('span').hasClass('able-right-controls')) { 
              // this control is on the right side 
              if ($(this).is(':last-child')) { 
                // this is the last control on the right 
                // position tooltip using the "right" property 
                centerTooltip = false;
                // var tooltipX = thisObj.playerWidth - position.left - buttonWidth;
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
            
            $('#' + tooltipId).text(label).css(tooltipStyle).show().delay(4000).fadeOut(1000);
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
          
          controllerSpan.append(newButton);
          // create variables of buttons that are referenced throughout the class 
          if (control === 'play') { 
            this.$playpauseButton = newButton;
          }
          else if (control === 'captions') { 
            this.$ccButton = newButton;
          }
          else if (control === 'descriptions') {        
            this.$descButton = newButton; 
            // gray out description button if description is not active 
            if (!this.descOn) {  
              this.$descButton.addClass('buttonOff').attr('title',this.tt.turnOnDescriptions);
            }
          }
          else if (control === 'mute') { 
            this.$muteButton = newButton;
          }
          else if (control === 'transcript') {
            this.$transcriptButton = newButton;
          }
          else if (control === 'fullscreen') {
            this.$fullscreenButton = newButton;
          }
          else if (control === 'chapters') {
            this.$chaptersButton = newButton;
          }
        }
      }
      if ((i % 2) == 1) {
        this.$controllerDiv.append('<div style="clear:both;"></div>');
      }
    }
  
    if (this.mediaType === 'video') { 
      // also set width and height of div.able-vidcap-container
      vidcapStyles = {
        'width': this.playerWidth+'px',
        'height': this.playerHeight+'px'
      }     
      if (this.$vidcapContainer) { 
        this.$vidcapContainer.css(vidcapStyles); 
      }   
      // also set width of the captions and descriptions containers 
      if (this.$captionDiv) { 
        this.$captionDiv.css('width',this.playerWidth+'px');
      }
      if (this.$descDiv) {
        this.$descDiv.css('width',this.playerWidth+'px');
      }
    }
    
    
    // combine left and right controls arrays for future reference 
    this.controls = [];
    for (var sec in controlLayout) {
      this.controls = this.controls.concat(controlLayout[sec]);
    }
    
    // construct help dialog that includes keystrokes for operating the included controls 
    this.addHelp();     
    // Update state-based display of controls.
    this.refreshControls();
  };

  // Change media player source file, for instance when moving to the next element in a playlist.
  // TODO: Add some sort of playlist support for tracks?
  AblePlayer.prototype.swapSource = function(sourceIndex) { 
    
    // replace default media source elements with those from playlist   
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
    if (control === 'playpause') { 
      return this.tt.play; 
    }
    else if (control === 'play') { 
      return this.tt.play; 
    }
    else if (control === 'pause') { 
      return this.tt.pause; 
    }
    else if (control === 'stop') { 
      return this.tt.stop; 
    }
    else if (control === 'rewind') { 
      return this.tt.rewind;
    }
    else if (control === 'forward') { 
      return this.tt.forward;
    }
    else if (control === 'captions') {  
      if (this.captionsOn) {
        return this.tt.hideCaptions;
      }
      else { 
        return this.tt.showCaptions;
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
    else if (control === 'sign') { // not yet supported 
      return this.tt.sign;
    }
    else if (control === 'mute') { 
      if (this.getVolume() > 0) { 
        return this.tt.mute;
      }
      else { 
        return this.tt.unmute;
      }
    }
    else if (control === 'volume-up') { 
      return this.tt.volumeUp;
    }   
    else if (control === 'volume-down') { 
      return this.tt.volumeDown;
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
      return this.tt.help; 
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
  AblePlayer.prototype.setupTracks = function() {
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

      if (!trackSrc) {
        // Nothing to load!
        continue;
      }

      var loadingPromise = this.loadTextObject(trackSrc);
      var thisObj = this;
      loadingPromises.push(loadingPromise);
      loadingPromise.then((function (track, kind) {
        return function (trackText) {
          var cues = thisObj.parseWebVTT(trackText).cues;
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
    var trackLabel = track.getAttribute('label') || trackLang;
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

      // create a div for displaying captions  
      // includes aria-hidden="true" because otherwise 
      // captions being added and removed causes sporadic changes to focus in JAWS
      // (not a problem in NVDA or VoiceOver)
      if (!this.$captionDiv) {
        this.$captionDiv = $('<div>',{
          'class': 'able-captions',
          'aria-hidden': 'true' 
        });
        this.$vidcapContainer.append(this.$captionDiv);
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
    if (this.includeTranscript) {
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
    if (this.includeTranscript) { 
      var options = this.$transcriptLanguageSelect.find('option');      
    }
    if (this.captions.length === 0) { // this is the first 
      this.captions.push({
        'cues': cues,
        'language': trackLang,
        'label': trackLabel,
        'def': isDefaultTrack
      });
      if (this.includeTranscript) { 
        if (isDefaultTrack) { 
          option.attr('selected', 'selected');
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
          if (this.includeTranscript) {
            if (isDefaultTrack) { 
              option.attr('selected', 'selected');
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
        if (this.includeTranscript) {
          if (isDefaultTrack) { 
            option.attr('selected', 'selected');
          }
          this.$transcriptLanguageSelect.append(option);
        }
        this.captionLabels.push(trackLabel);
      }
    }
    if (this.includeTranscript) {
      if (this.$transcriptLanguageSelect.find('option').length > 1) {
        // More than one option now, so enable the select.
        this.$transcriptLanguageSelect.prop('disabled', false);
      }
    }
  };

  AblePlayer.prototype.setupDescriptions = function (track, cues) {
    var trackLang = track.getAttribute('srclang');

    // descriptions are off unless determined to be available & preferred 
    this.descOn = false;
    
    // prepare closed description, even if user doesn't prefer it 
    // this way it's available if needed 
    this.hasClosedDesc = true;
    // Display the description div.
    //this.$descDiv.show();
    this.currentDescription = -1;
    if ((this.prefDesc === 1) && (this.prefClosedDesc === 1)) { 
      this.descOn = true;
    }

    this.descriptions.push({
      cues: cues,
      language: trackLang
    });
  };

  AblePlayer.prototype.setupChapters = function (track, cues) {
    // NOTE: WebVTT supports nested timestamps (to form an outline) 
    // This is not currently supported.
    this.hasChapters = true;
    this.chapters = cues;
  };

  AblePlayer.prototype.setupMetadata = function(track, cues) {
    // NOTE: Metadata is currently only supported if data-meta-div is provided 
    // The player does not display metadata internally 
    if (this.metaDiv) {
      if ($('#' + this.metaDiv)) { 
        // container exists 
        this.$metaDiv = $('#' + this.metaDiv); 
        this.hasMeta = true;
      }
    }
    this.meta = cues;
  }
      
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
        deferred.resolve(trackText);
      }
      $tempDiv.remove();
    });

    return promise;
  };
})(jQuery);
(function ($) {


  // Events:
  //   startTracking(event, position)
  //   tracking(event, position)
  //   stopTracking(event, position)

  window. AccessibleSeekBar = function(div, width) {
    var thisObj = this;

    // Initialize some variables.
    this.position = 0; // Note: position does not change while tracking.
    this.tracking = false;
    this.trackDevice = null; // 'mouse' or 'keyboard'
    this.keyTrackPosition = 0;
    this.lastTrackPosition = 0;
    this.nextStep = 1;
    this.inertiaCount = 0;

    this.bodyDiv = $(div);

    // Add a loaded indicator and a seek head.
    this.loadedDiv = $('<div></div>');
    this.playedDiv = $('<div></div>');
    this.seekHead = $('<div class="able-seek-head"></div>');
    // Make head focusable.
    this.seekHead.attr('tabindex', '0');
    // Since head is focusable, it gets the aria roles/titles.
    this.seekHead.attr('role', 'slider');
    this.seekHead.attr('aria-value-min', 0);

    this.timeTooltip = $('<div>');
    this.bodyDiv.append(this.timeTooltip);
  
    this.timeTooltip.attr('role', 'tooltip');
    this.timeTooltip.addClass('able-tooltip');

    this.bodyDiv.append(this.loadedDiv);
    this.bodyDiv.append(this.playedDiv);
    this.bodyDiv.append(this.seekHead);

    this.bodyDiv.wrap('<div></div>');
    this.wrapperDiv = this.bodyDiv.parent();

    // TODO: Move this all to CSS file.
    this.wrapperDiv.width(width);
    this.wrapperDiv.css({
      'display': 'inline-block',
      'vertical-align': 'middle'
    });

    this.bodyDiv.css({
      'position': 'relative',
      'height': '0.5em',
      'border': '1px solid',
      'background-color': '#000000',
      'margin': '0 3px',
      'border-style': 'solid',
      'border-width': '2px',
      'border-color': '#ffffff'
    });

    this.loadedDiv.width(0);
    this.loadedDiv.css({
      'display': 'inline-block',
      'position': 'absolute',
      'left': 0,
      'top': 0,
      'height': '0.5em',
      'background-color': '#464646',
      'z-index': 1
    });

    this.playedDiv.width(0);
    this.playedDiv.css({
      'display': 'inline-block',
      'position': 'absolute',
      'left': 0,
      'top': 0,
      'height': '0.5em',
      'background-color': '#DADADA',
      'z-index': 2
    });

    var seekHeadSize = '0.8em';
    this.seekHead.css({
      'display': 'inline-block',
      'position': 'relative',
      'left': 0,
      'top': '-0.45em',
      'height': seekHeadSize,
      'width': seekHeadSize,
      'border': '1px solid',
      'background-color': '#FDFDFD',
      'border-radius': seekHeadSize,
      '-webkit-border-radius': seekHeadSize,
      '-moz-border-radius': seekHeadSize,
      '-o-border-radius': seekHeadSize,
      'z-index': 3
    });

    // Set a default duration.  User should call this and change it.
    this.setDuration(100);

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
      else {
        return;
      }
      event.preventDefault();
    });
    
    this.bodyDiv.keyup(function (event) {
      if (event.which === 35 || event.which === 36 || event.which === 37 || event.which === 38 || event.which === 39 || event.which === 40) {
        if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
          thisObj.stopTracking(thisObj.keyTrackPosition);
        }
        event.preventDefault();
      }
    });
  }
  
  AccessibleSeekBar.prototype.arrowKeyDown = function (multiplier) {
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
  
  AccessibleSeekBar.prototype.pageXToPosition = function (pageX) {
    var offset = pageX - this.bodyDiv.offset().left;
    var position = this.duration * (offset / this.bodyDiv.width());
    return this.boundPos(position);
  };
  
  AccessibleSeekBar.prototype.boundPos = function (position) {
    return Math.max(0, Math.min(position, this.duration));
  }
  
  AccessibleSeekBar.prototype.setDuration = function (duration) {
    if (duration !== this.duration) {
      this.duration = duration;
      this.resetHeadLocation();
      this.seekHead.attr('aria-value-max', duration);
    }
  };
  
  AccessibleSeekBar.prototype.setWidth = function (width) {
    this.wrapperDiv.width(width);
    this.resizeDivs();
    this.resetHeadLocation();
  };

  AccessibleSeekBar.prototype.getWidth = function () {
    return this.wrapperDiv.width();
  };

  AccessibleSeekBar.prototype.resizeDivs = function () {
    this.playedDiv.width(this.bodyDiv.width() * (this.position / this.duration));
    this.loadedDiv.width(this.bodyDiv.width() * this.buffered);
  };
  
  // Stops tracking, sets the head location to the current position.
  AccessibleSeekBar.prototype.resetHeadLocation = function () {
    var ratio = this.position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.seekHead.css('left', center - (this.seekHead.width() / 2));
    
    if (this.tracking) {
      this.stopTracking(this.position);
    }
  };
  
  AccessibleSeekBar.prototype.setPosition = function (position, updateLive) {
    this.position = position;
    this.resetHeadLocation();
    this.refreshTooltip();
    this.resizeDivs();
    this.updateAriaValues(position, updateLive);
  }
  
  // TODO: Native HTML5 can have several buffered segments, and this actually happens quite often.  Change this to display them all.
  AccessibleSeekBar.prototype.setBuffered = function (ratio) {
    this.buffered = ratio;
    this.redrawDivs;
  }
  
  AccessibleSeekBar.prototype.startTracking = function (device, position) {
    if (!this.tracking) {
      this.trackDevice = device;
      this.tracking = true;
      this.bodyDiv.trigger('startTracking', [position]);
    }
  };
  
  AccessibleSeekBar.prototype.stopTracking = function (position) {
    this.trackDevice = null;
    this.tracking = false;
    this.bodyDiv.trigger('stopTracking', [position]);
    this.setPosition(position, true);
  };
  
  AccessibleSeekBar.prototype.trackHeadAtPageX = function (pageX) {
    var position = this.pageXToPosition(pageX);
    var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
    newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
    this.lastTrackPosition = position;
    this.seekHead.css('left', newLeft);
    this.reportTrackAtPosition(position);
  };
  
  AccessibleSeekBar.prototype.trackHeadAtPosition = function (position) {
    var ratio = position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.lastTrackPosition = position;
    this.seekHead.css('left', center - (this.seekHead.width() / 2));
    this.reportTrackAtPosition(position);
  };
  
  AccessibleSeekBar.prototype.reportTrackAtPosition = function (position) {
    this.bodyDiv.trigger('tracking', [position]);
    this.updateAriaValues(position, true);
  };
  
  AccessibleSeekBar.prototype.updateAriaValues = function (position, updateLive) {
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
        ' ' + pHourword +
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

    /* Uncomment to use aria values instead of separate live region.    
    this.seekHead.attr('aria-value-text', descriptionText);
    this.seekHead.attr('aria-valuenow', Math.floor(position).toString());*/
  };
  
  AccessibleSeekBar.prototype.trackImmediatelyTo = function (position) {
    this.startTracking('keyboard', position);
    this.trackHeadAtPosition(position);
    this.keyTrackPosition = position;
  };
  
  AccessibleSeekBar.prototype.refreshTooltip = function () {
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
  
  AccessibleSeekBar.prototype.setTooltipPosition = function (x) {
    this.timeTooltip.css({
      left: x - (this.timeTooltip.width() / 2) - 10,
      bottom: this.seekHead.height() + 10
    });
  };
  
  AccessibleSeekBar.prototype.positionToStr = function (position) {
    var minutes = Math.floor(position / 60);
    var seconds = Math.floor(position % 60);
    
    if (seconds < 10) {
      seconds = '0' + seconds;
    }
    
    return minutes + ':' + seconds;
  };
})(jQuery);
(function ($) {
  var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

  // Based on the incredible accessible modal dialog.
  window.AccessibleDialog = function(modalDiv, dialogRole, title, descDiv, closeButtonLabel, width, fullscreen, escapeHook) {

    this.title = title;
    this.closeButtonLabel = closeButtonLabel;
    this.escapeHook = escapeHook;
    this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
    var thisObj = this;
    var modal = modalDiv;
    this.modal = modal;    
    modal.css({
      'width': width || '50%',
      'top': (fullscreen ? '0' : '25%')
    });
    modal.addClass('modalDialog');

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
      
      descDiv.attr('id', 'modalDesc-' + this.baseId);
      
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
    
    $('body > *').not('.modalOverlay').not('.modalDialog').attr('aria-hidden', 'false');
  };
  
  AccessibleDialog.prototype.show = function () {
    if (!this.overlay) {
      // Generate overlay.
      var overlay = $('<div></div>').attr({
         'class': 'modalOverlay', 
         'tabindex': '-1'
      });
      this.overlay = overlay;
      $('body').append(overlay);
      
      // Keep from moving focus out of dialog when clicking outside of it.
      overlay.on('mousedown.accessibleModal', function (event) {
        event.preventDefault();
      });
    }
    
    $('body > *').not('.modalOverlay').not('.modalDialog').attr('aria-hidden', 'true');
    
    this.overlay.css('display', 'block');
    this.modal.css('display', 'block');
    this.modal.attr({
      'aria-hidden': 'false', 
      'tabindex': '-1'
    });
    
    this.focusedElementBeforeModal = $(':focus');
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
    $('body > *').not('.modalOverlay').not('.modalDialog').attr('aria-hidden', 'false');
    
    this.focusedElementBeforeModal.focus();
  };
})(jQuery);
(function ($) {
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

  // Takes seconds and converts to string of form mm:ss
  AblePlayer.prototype.formatSecondsAsColonTime = function (seconds) {
    var dMinutes = Math.floor(seconds / 60);
    var dSeconds = Math.floor(seconds % 60);
    if (dSeconds < 10) { 
      dSeconds = '0' + dSeconds;
    }

    return dMinutes + ':' + dSeconds;
  };

})(jQuery);
(function ($) {
  AblePlayer.prototype.initDescription = function() { 
    // set default mode for delivering description (open vs closed) 
    // based on availability and user preference        

    // first, check to see if there's an open-described version of this video  
    // checks only the first source 
    // Therefore, if a described version is provided, 
    // it must be provided for all sources  
    this.descFile = this.$sources.first().attr('data-desc-src');
    if (this.descFile) { 
      if (this.debug) {
        console.log('This video has a described version: ' + this.descFile);      
      }
      this.hasOpenDesc = true;
      if (this.prefDesc) {
        this.descOn = true;
      }
    }
    else { 
      if (this.debug) {
        console.log('This video does not have a described version');      
      }
      this.hasOpenDesc = false;              
    }
    
    this.updateDescription();
  };

  AblePlayer.prototype.updateDescription = function (time) {
    var useAudioDesc;
    
    if (this.descOn) {
      if (this.prefClosedDesc) {
        useAudioDesc = false;
        if (this.hasClosedDesc) {
          if (this.prefVisibleDesc) {
            this.$descDiv.show();
            this.$descDiv.removeClass('able-clipped');
          }
          else {
            this.$descDiv.hide();
            this.$descDiv.addClass('able-clipped');
          }
          this.showDescription(time || this.getElapsed());
        }
      }
      else {
        useAudioDesc = true;
      }
    }
    else {
      this.$descDiv.hide();
      useAudioDesc = false;
    }
    
    if (this.hasOpenDesc && this.usingAudioDescription() !== useAudioDesc) {
      this.swapDescription();   
    }
  };

  // Returns true if currently using audio description, false otherwise.
  AblePlayer.prototype.usingAudioDescription = function () {
    return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
  };

  AblePlayer.prototype.swapDescription = function() { 
    // swap described and non-described source media, depending on which is playing
    // this function is only called in two circumstances: 
    // 1. Swapping to described version when initializing player (based on user prefs & availability)
    // 2. User is toggling description 

    var i, origSrc, descSrc, srcType, jwSourceIndex, newSource;

    if (!this.usingAudioDescription()) {
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
      if (this.initializing) { // user hasn't pressed play yet 
        this.swappingSrc = false; 
      }
      else { 
        this.swappingSrc = true; 
      }
    }   
    else { 
      // the described version is currently playing
      // swap back to the original 
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
    // now reload the source file.
    if (this.player === 'html5') {
      this.media.load();
    }
    else if (this.player === 'jw') { 
      newSource = this.$sources[jwSourceIndex].getAttribute('src');
      this.jwPlayer.load({file: newSource}); 
    }
    else if (this.player === 'youtube') {
      // Can't switch youtube tracks, so do nothing.
      // TODO: Disable open descriptions button with Youtube.
    }
  };

  AblePlayer.prototype.showDescription = function(now) { 

    // there's a lot of redundancy between this function and showCaptions 
    // Trying to combine them ended up in a mess though. Keeping as is for now. 

    var d, thisDescription;
    var flattenComponentForDescription = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponentForDescription(component.children[ii]));
        }
      }
      return result.join('');
    }
  
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
    for (d in cues) {
      if ((cues[d].start <= now) && (cues[d].end > now)) {      
        thisDescription = d;
        break;
      }
    }
    if (typeof thisDescription !== 'undefined') {  
      if (this.currentDescription !== thisDescription) { 
        // load the new description into the container div 
        this.$descDiv.html(flattenComponentForDescription(cues[thisDescription].components));
        if (this.prefDescPause) { 
          this.pauseMedia();
        }
        this.currentDescription = thisDescription;
        if (this.$descDiv.is(':hidden')) { 
          this.$descDiv.show();
        }
      } 
    }
    else {     
      this.$descDiv.html('');
      this.currentDescription = -1;
    } 
  };

})(jQuery);
(function ($) {

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

  AblePlayer.prototype.isUserAgent = function(which) {
    var userAgent; 
    
    userAgent = navigator.userAgent.toLowerCase();
    if (this.debug) { 
      console.log('User agent: ' + userAgent);
    }  
    if (userAgent.indexOf(which) !== -1) {
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
    if (this.player === 'html5') {
      var seekable;
  
      this.startTime = newTime;
      // Check HTML5 media "seekable" property to be sure media is seekable to startTime
      seekable = this.media.seekable;
      
      if (seekable.length > 0 && this.startTime >= seekable.start(0) && this.startTime <= seekable.end(0)) { 
        this.media.currentTime = this.startTime;
      } 
    }
    else if (this.player === 'jw') {
      // pause JW Player temporarily. 
      // When seek has successfully reached newTime, 
      // onSeek event will be called, and playback will be resumed
      this.jwSeekPause = true;
      this.jwPlayer.seek(newTime);
    }
    else if (this.player === 'youtube') {
      this.youtubePlayer.seekTo(newTime);
    }

    this.liveUpdatePending = true;

    this.refreshControls();
  };

  AblePlayer.prototype.getDuration = function () {
    var duration;
    if (this.player === 'html5') {
      duration = this.media.duration;
    }
    else if (this.player === 'jw') {
      duration = this.jwPlayer.getDuration();
    }
    else if (this.player === 'youtube') {
      duration = this.youtubePlayer.getDuration();
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
    else if (this.player === 'jw') {
      if (this.jwPlayer.getState() === 'IDLE') {
        return 0;
      }
      position = this.jwPlayer.getPosition();
    }
    else if (this.player === 'youtube') {
      position = this.youtubePlayer.getCurrentTime();
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
    else if (this.player === 'jw') {
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
    else if (this.player === 'youtube') {
      var state = this.youtubePlayer.getPlayerState();
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

  AblePlayer.prototype.isMuted = function () {
    if (!this.browserSupportsVolume()) {
      return false;
    }

    if (this.player === 'html5') {
      return this.media.muted;
    }
    else if (this.player === 'jw') {
      return this.jwPlayer.getMute();
    }
    else if (this.player === 'youtube') {
      return this.youtubePlayer.isMuted();
    }
  };

  AblePlayer.prototype.setMute = function(mute) {
    if (!this.browserSupportsVolume()) {
      return;
    }
    if (!mute) {
      this.$muteButton.attr('aria-label',this.tt.mute); 
      this.$muteButton.find('span.able-clipped').text(this.tt.mute);
    }
    else {
      this.$muteButton.attr('aria-label',this.tt.unmute); 
      this.$muteButton.find('span.able-clipped').text(this.tt.unmute);
    }
    
    if (this.player === 'html5') {
      this.media.muted = mute;
    }
    else if (this.player === 'jw') { 
      this.jwPlayer.setMute(mute);
    }
    else if (this.player === 'youtube') {
      if (mute) {
        this.youtubePlayer.mute();
      }
      else {
        this.youtubePlayer.unMute();
      }
    }
    
    if (!mute) {
      // TODO: Is this necessary?
      // Restore volume to last value.
      if (this.lastVolume) {
        this.setVolume(this.lastVolume);
      }
    }
  };
  
  AblePlayer.prototype.setVolume = function (volume) {
    if (!this.browserSupportsVolume()) {
      return;
    }

    if (this.player === 'html5') {
      this.media.volume = volume;
    }
    else if (this.player === 'jw') {
      this.jwPlayer.setVolume(volume * 100);
    }
    else if (this.player === 'youtube') {
      this.youtubePlayer.setVolume(volume * 100);
    }
    
    this.lastVolume = volume;
  };

  AblePlayer.prototype.getVolume = function (volume) {
    if (!this.browserSupportsVolume()) {
      return 1;
    }

    if (this.player === 'html5') {
      return this.media.volume;
    }
    else if (this.player === 'jw') {
      return this.jwPlayer.getVolume() / 100;
    }
    else if (this.player === 'youtube') {
      return this.youtubePlayer.getVolume() / 100;
    }
  };

  AblePlayer.prototype.isPlaybackRateSupported = function () {
    if (this.player === 'html5') {
      return this.media.playbackRate ? true : false;
    }
    else if (this.player === 'jw') {
      // Not directly supported by JW player; can hack for HTML5 version by finding the dynamically generated video tag, but decided not to do that.
      return false;
    }
    else if (this.player === 'youtube') {
      // Youtube always supports a finite list of playback rates.  Only expose controls if more than one is available.
      return (this.youtubePlayer.getAvailablePlaybackRates().length > 1);
    }
  };

  AblePlayer.prototype.setPlaybackRate = function (rate) {
    rate = Math.max(0.5, rate);
    if (this.player === 'html5') {
      this.media.playbackRate = rate;
    }
    else if (this.player === 'youtube') {
      this.youtubePlayer.setPlaybackRate(rate);
    }
    this.$speed.text(this.tt.speed + ': ' + rate.toFixed(2).toString() + 'x');
  };

  AblePlayer.prototype.getPlaybackRate = function () {
    if (this.player === 'html5') {
      return this.media.playbackRate;
    }
    else if (this.player === 'jw') {
      // Unsupported, always the normal rate.
      return 1;
    }
    else if (this.player === 'youtube') {
      return this.youtubePlayer.getPlaybackRate();
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
    }
    else if (this.player === 'jw') {
      this.jwPlayer.pause(true);
    }
    else if (this.player === 'youtube') {
      this.youtubePlayer.pauseVideo();
    }
  };

  AblePlayer.prototype.playMedia = function () {
    if (this.player === 'html5') {
      this.media.play(true);
    }
    else if (this.player === 'jw') {
      this.jwPlayer.play(true);
    }
    else if (this.player === 'youtube') {
      this.youtubePlayer.playVideo();
    }
    this.startedPlaying = true;    
  };

  // Right now, update the seekBar values based on current duration and time.
  // Later, move all non-destructive control updates based on state into this function?
  AblePlayer.prototype.refreshControls = function() {
    var thisObj = this;
    var duration = this.getDuration();
    var elapsed = this.getElapsed();

    if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && duration > 0) { 
      // couldn't calculate seekInterval previously; try again. 
      if (duration > 0) {
        this.seekInterval = Math.max(this.seekInterval, duration / 10);
        this.seekIntervalCalculated = true;
      }
    }
        
    if (this.seekBar) {
      this.seekBar.setDuration(duration);
      if (!this.seekBar.tracking) {
        // Only update the aria live region if we have an update pending (from a 
        // seek button control) or if the seekBar has focus.
        // We use document.activeElement instead of $(':focus') due to a strange bug:
        //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
        var updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
        this.liveUpdatePending = false;
        this.seekBar.setPosition(elapsed, updateLive);
      }
    }

    var displayElapsed;
    // When seeking, display the seek bar time instead of the actual elapsed time.
    if (this.seekBar.tracking) {
      displayElapsed = this.seekBar.lastTrackPosition;
    }
    else {
      displayElapsed = elapsed;
    }

    this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(duration));
    this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));

    var textByState = {
      'stopped': this.tt.statusStopped,
      'paused': this.tt.statusPaused,
      'playing': this.tt.statusPlaying,
      'buffering': this.tt.statusBuffering,
      'ended': this.tt.statusEnd
    };

    // Update the text only if it's changed since it has role="alert"; 
    // also don't update while tracking, since this may Pause/Play the player but we don't want to send a Pause/Play update.
    if (this.$status.text() !== textByState[this.getPlayerState()] && !this.seekBar.tracking) {
      // Debounce updates; only update after status has stayed steadily different for 250ms.
      var timestamp = (new Date()).getTime();
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

    // Don't change play/pause button display while using the seek bar.
    if (!this.seekBar.tracking) {
      if (this.isPaused()) {    
        this.$playpauseButton.attr('aria-label',this.tt.play); 
        
        if (this.iconType === 'font') {
          this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
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
        else { 
          this.$playpauseButton.find('img').attr('src',this.pauseButtonImg); 
        }
      }
    }

    // Update seekbar width.
    // To do this, we need to calculate the width of all elements surrounding it.
    // NOTE: Would be excellent if there were a way to do this with CSS...
    if (this.seekBar) {
      var widthUsed = 0;
      // Elements on the left side of the control panel.
      var leftControls = this.seekBar.wrapperDiv.parent().prev();
      leftControls.children().each(function () {
        widthUsed += $(this).width();
      });

      // Elements to the left and right of the seekbar on the right side.
      var prev = this.seekBar.wrapperDiv.prev();
      while (prev.length > 0) {
        widthUsed += prev.width();
        prev = prev.prev();
      }

      var next = this.seekBar.wrapperDiv.next();
      while (next.length > 0) {
        widthUsed += next.width();
        next = next.next();
      }

      var width = this.$playerDiv.width() - widthUsed - 20;
      // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
      if (Math.abs(width - this.seekBar.getWidth()) > 5) {
        this.seekBar.setWidth(width);
      }
    }

    // Update buttons on/off display.
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
      // Button has a different title depending on the number of captions.
      // If only one caption track, this is "Show captions" and "Hide captions"
      // Otherwise, it is just always "Captions"
      if (!this.captionsOn) {
        this.$ccButton.addClass('buttonOff');
        if (this.captions.length === 1) {
          this.$ccButton.attr('aria-label',this.tt.showCaptions);
          this.$ccButton.find('span.able-clipped').text(this.tt.showCaptions);
        }
      }
      else {
        this.$ccButton.removeClass('buttonOff');
        if (this.captions.length === 1) {
          this.$ccButton.attr('aria-label',this.tt.hideCaptions);
          this.$ccButton.find('span.able-clipped').text(this.tt.hideCaptions);
        }
      }

      if (this.captions.length > 1) {
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

    if (this.$muteButton) {
      if (!this.isMuted()) {
        if (this.iconType === 'font') {
          this.$muteButton.find('span').first().removeClass('icon-volume-mute').addClass('icon-volume-loud'); 
          this.$muteButton.find('span.able-clipped').text(this.tt.mute);
        }
        else { 
          this.$muteButton.find('img').attr('src',this.volumeLoudButtonImg); 
        }
      }
      else {
        if (this.iconType === 'font') {
          this.$muteButton.find('span').first().removeClass('icon-volume-loud').addClass('icon-volume-mute'); 
          this.$muteButton.find('span.able-clipped').text(this.tt.unmute);
        }
        else { 
          this.$muteButton.find('img').attr('src',this.volumeMuteButtonImg); 
        }
      }
    }

    if (this.$fullscreenButton) {
      if (!this.isFullscreen()) {
        this.$fullscreenButton.attr('aria-label', this.tt.enterFullScreen); 
        if (this.iconType === 'font') {
          this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand'); 
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
        else { 
          this.$fullscreenButton.find('img').attr('src',this.fullscreenCollapseButtonImg); 
        }
      }
    }
    
    // TODO: Move all button updates here.

    if (typeof this.$bigPlayButton !== 'undefined') { 
      // Choose show/hide for big play button and adjust position.
      if (this.isPaused() && !this.seekBar.tracking) {
        this.$bigPlayButton.show();
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

    if (this.includeTranscript) {
      // Sync checkbox with autoScrollTranscript variable.
      if (this.autoScrollTranscript !== this.$autoScrollTranscriptCheckbox.prop('checked')) {
        this.$autoScrollTranscriptCheckbox.prop('checked', this.autoScrollTranscript);
      }
    
      // If transcript locked, scroll transcript to current highlight location.
      if (this.autoScrollTranscript && this.currentHighlight) {
        var newTop = Math.floor($('.able-transcript').scrollTop() +
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
        this.seekBar.setBuffered(this.media.buffered.end(0) / this.getDuration())
      }
    }
    else if (this.player === 'jw') {
      this.seekBar.setBuffered(this.jwPlayer.getBuffer() / 100);
    }
    else if (this.player === 'youtube') {
      this.seekBar.setBuffered(this.youtubePlayer.getVideoLoadedFraction());
    }
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

  AblePlayer.prototype.handleStop = function() { 
    if (this.player == 'html5') {
      this.pauseMedia();
      this.seekTo(0);
    }
    else if (this.player == 'jw') { 
      this.jwPlayer.stop();
    }
    this.refreshControls();
  };

  AblePlayer.prototype.handleRewind = function() { 
    var targetTime = this.getElapsed() - this.seekInterval;
    if (targetTime < 0) {
      this.seekTo(0);
    }
    else {
      this.seekTo(targetTime);
    }
  };

  AblePlayer.prototype.handleFastForward = function() { 
    var targetTime = this.getElapsed() + this.seekInterval;    
    if (targetTime > this.getDuration()) {
      this.seekTo(this.getDuration());
    }
    else {
      this.seekTo(targetTime);
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

  AblePlayer.prototype.handleVolume = function(direction) {
    var volume;
    
    if (this.isMuted()) {
      this.setMute(false);
    }
    
    volume = this.getVolume();
    
    if (direction === 'up') {
      if (volume < 0.9) {        
        volume = Math.round((volume + 0.1) * 10) / 10;
      }
      else {
        volume = 1;
      }
    }
    else if (direction === 'down') {
      if (volume > 0.1) {        
        volume = Math.round((volume - 0.1) * 10) / 10;
      }
      else {
        volume = 0;
      }
    }
    else if (direction >= 49 || direction <= 53) { 
      // TODO: What is this for?
      volume = (direction-48) * 0.2;
    }
    
    this.setVolume(volume);
    
    if (volume === 0) {
      this.setMute(true);
    }
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
      var rates = this.youtubePlayer.getAvailablePlaybackRates();
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

    if (this.hidingPopup) { 
      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it 
      this.hidingPopup = false;      
      return false; 
    }
    
    if (this.captions.length === 1) {
      // When there's only one set of captions, just do an on/off toggle.
      if (this.captionsOn === true) { 
        // captions are on. Turn them off. 
        this.captionsOn = false;
        this.$captionDiv.hide();
      }
      else { 
        // captions are off. Turn them on. 
        this.captionsOn = true;
        this.$captionDiv.show();
        this.selectedCaptions = this.captions[0];
        if (this.descriptions.length >= 0) {
          this.selectedDescriptions = this.descriptions[0];
        }
      }
      this.refreshControls();
    }
    else {   
      if (this.captionsPopup.is(':visible')) {
        this.captionsPopup.hide();
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
    this.updateDescription();
    this.refreshControls();
  };

  AblePlayer.prototype.handlePrefsClick = function() { 
    this.setFullscreen(false);
    this.prefsDialog.show();
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
    }
    else {
      this.$transcriptArea.show();
      this.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.tt.hideTranscript);
      this.$transcriptButton.find('span.able-clipped').text(this.tt.hideTranscript);
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
    var $el = this.$ableDiv;
    var el = $el[0];
    
    if (this.nativeFullscreenSupported()) {
      // Note: many varying names for options for browser compatibility.
      if (fullscreen) {
        // If not in full screen, initialize it.
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
        // If in fullscreen, exit it.
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
    }
    else {
      // Non-native fullscreen support through modal dialog.
      
      // Create dialog on first run through.
      if (!this.fullscreenDialog) {
        var dialogDiv = $('<div>');
        this.fullscreenDialog = new AccessibleDialog(dialogDiv, 'Fullscreen dialog', 'Fullscreen video player', '100%', true, function () { thisObj.handleFullscreenToggle() });
        $('body').append(dialogDiv);
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
          newHeight -= thisObj.$descDiv.height();
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
        this.resizePlayer(this.playerWidth, this.playerHeight);
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
    this.setFullscreen(!this.isFullscreen());
  };
  
  AblePlayer.prototype.handleTranscriptLockToggle = function (val) {
    this.autoScrollTranscript = val;
    this.refreshControls();
  };

  AblePlayer.prototype.showAlert = function(msg) { 
    var thisObj = this;
    this.alertBox.show();
    this.alertBox.text(msg);
    // Center at top of vidcap container; use vidcap container instead of media container due to an IE8 sizing bug.
    this.alertBox.css({
      left: this.$playerDiv.offset().left + (this.$playerDiv.width() / 2) - (this.alertBox.width() / 2)
    });
    setTimeout(function () {
      thisObj.alertBox.fadeOut(300);
    }, 3000);
  };

  // Resizes all relevant player attributes.
  AblePlayer.prototype.resizePlayer = function (width, height) {
    this.$media.height(height);
    this.$media.width(width);

    if (this.$captionDiv) {
      this.$captionDiv.width(width);
      // TODO: Font-size is currently stored in CSS and is not calculable cross-browser.
      // Instead, store it just here and update appropriately.
      // For now, just clear font-size when player is reset to default height, so at least it'll be consistent in that case.
      if (height !== this.playerHeight) {
        this.$captionDiv.css('font-size', (height / this.playerHeight) * 18);
      }
      else {
        this.$captionDiv.css('font-size', '');
      }
    }

    if (this.$descDiv) {
      this.$descDiv.width(width);
    }

    if (this.$vidcapContainer) {
      this.$vidcapContainer.height(height);
      this.$vidcapContainer.width(width); 
    }

    this.$ableDiv.width(width);
    
    if (this.jwPlayer) {
      this.jwPlayer.resize(width, height);
    }
    else if (this.youtubePlayer) {
      this.youtubePlayer.setSize(width, height);
    }
        
    this.refreshControls();
  };
})(jQuery);
(function ($) {
  AblePlayer.prototype.updateCaption = function (time) {
    if (this.captionsOn) {
      this.$captionDiv.show();
      this.showCaptions(time || this.getElapsed());
    }
    else if (this.$captionDiv) {
      this.$captionDiv.hide();
    }
  };

  // Returns the function used when a caption is clicked in the captions menu.
  AblePlayer.prototype.getCaptionClickFunction = function (track) {
    var thisObj = this;
    return function () {
      thisObj.captionsOn = true;
      thisObj.selectedCaptions = track;
      thisObj.currentCaption = -1;
      // Try and find a matching description track.
      for (var ii in thisObj.descriptions) {
        if (thisObj.descriptions[ii].language === track.language) {
          thisObj.selectedDescriptions = thisObj.descriptions[ii];
          thisObj.currentDescription = -1;
        }
      }
      thisObj.hidingPopup = true;     
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.focus();
      thisObj.refreshControls();
      thisObj.updateCaption();
      thisObj.updateDescription();
    }
  };

  // Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      thisObj.captionsOn = false;
      thisObj.currentCaption = -1;
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.focus();
      thisObj.refreshControls();
      thisObj.updateCaption();
    }
  };

  AblePlayer.prototype.showCaptions = function(now) { 
    var c, thisCaption; 
  
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
    for (c in cues) {
      if ((cues[c].start <= now) && (cues[c].end > now)) {      
        thisCaption = c;
        break;
      }
    }
    if (typeof thisCaption !== 'undefined') {  
      if (this.currentCaption !== thisCaption) { 
        // it's time to load the new caption into the container div 
        this.$captionDiv.html(this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>'));
        this.currentCaption = thisCaption;
      } 
    }
    else {     
      this.$captionDiv.html('');
      this.currentCaption = -1;
    } 
  };

  // Takes a cue and returns the caption text to display for it.
  AblePlayer.prototype.flattenCueForCaption = function (cue) {
    var result = [];

    var flattenComponent = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else if (component.type === 'v') {
        result.push('[' + component.value + ']');
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join('');
    }
    
    for (var ii in cue.components.children) {
      result.push(flattenComponent(cue.components.children[ii]));
    }
    
    return result.join('');
  };

})(jQuery);
(function ($) {
  AblePlayer.prototype.updateMeta = function (time) {
    if (this.hasMeta) {
      this.$metaDiv.show();
      this.showMeta(time || this.getElapsed());
    }
  };

  AblePlayer.prototype.showMeta = function(now) { 
    var m, thisMeta, cues; 
    if (this.meta.length >= 1) {
      cues = this.meta;
    }
    else {
      cues = [];
    }
    for (m in cues) {
      if ((cues[m].start <= now) && (cues[m].end > now)) {      
        thisMeta = m;
        break;
      }
    }
    if (typeof thisMeta !== 'undefined') {  
      if (this.currentMeta !== thisMeta) { 
        // it's time to load the new metadata cue into the container div 
        this.$metaDiv.html(this.flattenCueForMeta(cues[thisMeta]).replace('\n', '<br>'));
        this.currentMeta = thisMeta;
      } 
    }
    else {     
      this.$metaDiv.html('');
      this.currentMeta = -1;
    } 
  };

  // Takes a cue and returns the metadata text to display for it.
  AblePlayer.prototype.flattenCueForMeta = function (cue) {
    var result = [];

    var flattenComponent = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else if (component.type === 'v') {
        result.push('[' + component.value + ']');
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join('');
    }
    
    for (var ii in cue.components.children) {
      result.push(flattenComponent(cue.components.children[ii]));
    }
    
    return result.join('');
  };

})(jQuery);
(function ($) {
  AblePlayer.prototype.getSupportedLangs = function() {
    // returns an array of languages for which AblePlayer has translation tables 
    var langs = ['en','de'];
    return langs;
  };

  AblePlayer.prototype.getTranslationText = function() { 
    // determine language, then get labels and prompts from corresponding translation file (in JSON)
    // finally, populate this.tt object with JSON data
    // return true if successful, otherwise false 
    var gettingText, lang, thisObj, msg; 

    gettingText = $.Deferred(); 

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
    thisObj = this;
    // get content of JSON file 
    $.getJSON(this.translationPath + this.lang + '.js',
              function(data, textStatus, jqxhr) { 
                if (textStatus === 'success') { 
                  thisObj.tt = data;
                  if (thisObj.debug) { 
                    console.log('Successfully assigned JSON data to trans');
                    console.log(thisObj.tt);           
                  }
                }
                else { 
                  return false; 
                }
              }
             ).then( 
               function(){ // success 
                 // resolve deferred variable
                 gettingText.resolve();  
               },
               function() { // failure 
                 return false; 
               }
             );
    return gettingText.promise(); 
  };
})(jQuery);
(function ($) {
  AblePlayer.prototype.updateTranscript = function() {
    if (!this.includeTranscript) {
      return;
    }
    // Update transcript.
    var captions;
    var descriptions;
    var captionLang;
    if (this.transcriptCaptions) {
      captionLang = this.transcriptCaptions.language;
      captions = this.transcriptCaptions.cues;
    }
    else if (this.captions.length > 0) {
      captionLang = this.captions[0].language;
      captions = this.captions[0].cues;
    }
    if (this.transcriptDescriptions) {
      descriptions = this.transcriptDescriptions.cues;
    }
    else if (this.descriptions.length > 0) {
      // Try and match the caption language.
      if (captionLang) {
        for (var ii in this.descriptions) {
          if (this.descriptions[ii].language === captionLang) {
            descriptions = this.descriptions[ii].cues;
          }
        }
      }
      if (!descriptions) {
        descriptions = this.descriptions[0].cues;
      }
    }
    var div = this.generateTranscript(captions || [], descriptions || []);
    this.$transcriptDiv.html(div);
    
    var thisObj = this;
    
    // Make transcript tabbable if preference is turned on.
    if (this.prefTabbable === 1) { 
      $('.able-transcript span.able-transcript-seekpoint').attr('tabindex','0');
    }     
    
    // handle clicks on text within transcript 
    // Note #1: Only one transcript per page is supported
    // Note #2: Pressing Enter on an element that is not natively clickable does NOT trigger click() 
    // Forcing this elsewhere, in the keyboard handler section  
    if ($('.able-transcript').length > 0) {  
      $('.able-transcript span.able-transcript-seekpoint').click(function(event) { 
        var spanStart = parseFloat($(this).attr('data-start'));
        // Add a tiny amount so that we're inside the span.
        spanStart += .01;
        thisObj.seekTo(spanStart);
      });
    }
  };

  AblePlayer.prototype.highlightTranscript = function (currentTime) { 
    if (!this.includeTranscript) {
      return;
    }

    //show highlight in transcript marking current caption
    var start, end; 
    var thisObj = this;

    currentTime = parseFloat(currentTime);

    // Highlight the current transcript item.
    $('.able-transcript span.able-transcript-caption').each(function() { 
      start = parseFloat($(this).attr('data-start'));
      end = parseFloat($(this).attr('data-end'));
      if (currentTime >= start && currentTime <= end) { 
        // move all previous highlights before adding one to current span
        $('.able-highlight').removeClass('able-highlight');
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

  AblePlayer.prototype.generateTranscript = function(captions, descriptions) {
    var thisObj = this; 
    
    var main = $('<div class="able-transcript-container"></div>');
    
    // TODO: Make scrolling optional?
    
    var transcriptTitle = 'Transcript';
    if (typeof this.transcriptTitle !== 'undefined') { 
      transcriptTitle = this.transcriptTitle;
    }
    else if (this.lyricsMode) { 
      transcriptTitle = 'Lyrics';
    }

    if (typeof this.transcriptDivLocation === 'undefined' && transcriptTitle != '') { 
      // only add an HTML heading to internal transcript 
      // external transcript is expected to have its own heading  
      var headingNumber = this.playerHeadingLevel; 
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
      var transcriptHeading = 'h' + headingNumber.toString();
      var transcriptHeadingTag = '<' + transcriptHeading + ' class="able-transcript-heading">'; 
      transcriptHeadingTag += transcriptTitle; 
      transcriptHeadingTag += '</' + transcriptHeading + '>';
       main.append(transcriptHeadingTag); 
    }

    var nextCap = 0;
    var nextDesc = 0;  

    var addDescription = function(div, desc) {
      var descDiv = $('<div class="able-desc"><span class="hidden">Description: </span></div>');

      var flattenComponentForDescription = function(comp) {
        var result = [];
        if (comp.type === 'string') {
          result.push(comp.value);
        }
        else {
          for (var ii in comp.children) {
            result = result.concat(flattenComponentForDescription(comp.children[ii]));
          }
        }
        return result;
      }
      
      var descSpan = $('<span class="able-transcript-seekpoint"></span>');
      for (var ii in desc.components.children) {
        var results = flattenComponentForDescription(desc.components.children[ii]);
        for (var jj in results) {
          descSpan.append(results[jj]);
        }
      }
      descSpan.attr('data-start', desc.start.toString());
      descSpan.attr('data-end', desc.end.toString());
      descDiv.append(descSpan);
      
      div.append(descDiv);
    };
    
    var addCaption = function(div, cap) {
      var capSpan = $('<span class="able-transcript-seekpoint able-transcript-caption"></span>');
      
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
            result.push($('<div></div><span class="able-unspoken">' + str.substring(openBracket, closeBracket + 1) + '</span>'));
            result = result.concat(flattenString(str.substring(closeBracket + 1)));
          }
          else if (hasParens) {
            result = result.concat(flattenString(str.substring(0, openParen)));
            result.push($('<div></div><span class="able-unspoken">' + str.substring(openParen, closeParen + 1) + '</span>'));
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
          var vSpan = $('<div></div><span class="able-unspoken">[' + comp.value + ']</span>');
          result.push(vSpan);
          for (var ii in comp.children) {
            var subResults = flattenComponentForCaption(comp.children[ii]);
            for (var jj in subResults) {
              result.push(subResults[jj]);
            }
          }
        }
        else {
          for (var ii in comp.children) {
            result = result.concat(flattenComponentForCaption(comp.children[ii]));
          }
        }
        return result;
      };
      
      for (var ii in cap.components.children) {
        var results = flattenComponentForCaption(cap.components.children[ii]);
        for (var jj in results) {
          var result = results[jj];
          if (typeof result === 'string' && thisObj.lyricsMode) {    
            // add <br> BETWEEN each caption and WITHIN each caption (if payload includes "\n") 
            result = result.replace('\n','<br>') + '<br>';
          }
          capSpan.append(result);
        }
      }
      
      capSpan.attr('data-start', cap.start.toString());
      capSpan.attr('data-end', cap.end.toString());
      div.append(capSpan);      
      div.append('\n');
    };
    
    while ((nextCap < captions.length) || (nextDesc < descriptions.length)) {
      if ((nextCap < captions.length) && (nextDesc < descriptions.length)) {
        if (descriptions[nextDesc].start <= captions[nextCap].start) {
          addDescription(main, descriptions[nextDesc]);
          nextDesc += 1;
        }
        else {
          addCaption(main, captions[nextCap]);
          nextCap += 1;
        }
      }
      else if (nextCap < captions.length) {
        addCaption(main, captions[nextCap]);
        nextCap += 1;
      }
      else if (nextDesc < descriptions.length) {
        addDescription(main, descriptions[nextDesc]);
        nextDesc += 1;
      }
    }
    
    return main;
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
          for (var i in resultsArray) { 
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
        for (i in captions) { 
          if (captions[i].components.children[0]['type'] === 'string') { 
            caption = captions[i].components.children[0]['value'];  
            for (j in searchTerms) { 
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
    
    var hours = parseInt( totalSeconds / 3600 ) % 24;
    var minutes = parseInt( totalSeconds / 60 ) % 60;
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
    if (!this.startedPlaying) {
      if (this.startTime) { 
        if (this.startTime === this.media.currentTime) { 
          // media has already scrubbed to start time
          if (this.autoplay || this.seeking) { 
            this.playMedia();
            this.seeking = false;            
          }   
        }
        else { 
          // continue seeking ahead until currentTime == startTime 
          this.seekTo(this.startTime);
        }
      }
      else { 
        // autoplay should generally be avoided unless a startTime is provided 
        // but we'll trust the developer to be using this feature responsibly 
        if (this.autoplay) {
          this.playMedia();
        } 
      }       
    }
    
    // show highlight in transcript 
    if (this.prefHighlight === 1) {
      this.highlightTranscript(this.getElapsed()); 
    }

    this.updateCaption();
    this.updateDescription();
    this.updateMeta();
    this.refreshControls();
  };

  AblePlayer.prototype.onMediaPause = function () {
    if (this.debug) { 
      console.log('media pause event');       
    }
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
      // should be able to play 
      
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
      this.swappingSrc = false; // swapping is finished
      this.refreshControls();
    }
  };

  // End Media events

  AblePlayer.prototype.onWindowResize = function () {
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        this.modalFullscreenActive) {
      var newHeight = $(window).height() - this.$playerDiv.height();
      if (!this.$descDiv.is(':hidden')) {
        newHeight -= this.$descDiv.height();
      }
      this.resizePlayer($(window).width(), newHeight);
    }
    else {
      this.resizePlayer(this.playerWidth, this.playerHeight);
    }
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
      thisObj.updateDescription(position);
      thisObj.updateMeta(position);
      thisObj.refreshControls();
    }).on('stopTracking', function (event, position) {
      thisObj.seekTo(position);

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
    else if (whichButton === 'stop') { 
      this.handleStop();
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
    else if (whichButton === 'volume-up') { 
      this.handleVolume('up');
    }
    else if (whichButton === 'volume-down') { 
      this.handleVolume('down');
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
    else if (whichButton.substr(0,4) === 'sign') { 
      // not yet supported
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
    if (which === 27) { // Escape - TODO: Not listed in help file, should it be?
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
    else if (which === 115) { // s = stop 
      if (this.usingModifierKeys(e)) { 
        this.handleStop();
      }
    }
    else if (which === 109) { // m = mute 
      if (this.usingModifierKeys(e)) { 
        this.handleMute();
      }
    }
    else if (which === 117) { // u = volume up 
      if (this.usingModifierKeys(e)) { 
        this.handleVolume('up');
      }
    }
    else if (which === 100) { // d = volume down 
      if (this.usingModifierKeys(e)) { 
        this.handleVolume('down');
      }
    }
    else if (which >= 49 && which <= 53) { // set volume 1-5
      if (this.usingModifierKeys(e)) { 
        this.handleVolume(which);
      }
    }
    else if (which === 99) { // c = caption toggle 
      if (this.usingModifierKeys(e)) { 
        this.handleCaptionToggle();      
      }
    }
    else if (which === 102) { // f = forward 
      if (this.usingModifierKeys(e)) { 
        this.handleFastForward();
      }
    }
    else if (which === 114) { // r = rewind (could use B for back???) 
      if (this.usingModifierKeys(e)) { 
        this.handleRewind();
      }
    }
    else if (which === 110) { // n = narration (description)
      if (this.usingModifierKeys(e)) { 
        this.handleDescriptionToggle();
      }
    }     
    else if (which === 104) { // h = help
      if (this.usingModifierKeys(e)) { 
        this.handleHelpClick();
      }
    }     
    else if (which === 116) { // t = preferences
      if (this.usingModifierKeys(e)) { 
        this.handlePrefsClick();
      }
    }     
    else if (which === 104) { // h = help
      if (this.usingModifierKeys(e)) { 
        this.handleHelpClick();
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
        if (thisObj.debug) { 
          console.log('media has been emptied');        
        }
      })        
      .on('loadedmetadata',function() {
        if (thisObj.debug) {
          console.log('meta data has loaded');  
        }
        thisObj.onMediaNewSourceLoad();
      })
      .on('canplay',function() { 
        if (thisObj.debug) {
          console.log('canplay event');  
        }
        if (thisObj.startTime && !thisObj.startedPlaying) { 
          thisObj.seekTo(thisObj.startTime);
        }
      })
      .on('canplaythrough',function() { 
        if (thisObj.debug) {
          console.log('canplaythrough event');  
        }
        if (thisObj.startTime && !thisObj.startedPlaying) { 
          // try again, if seeking failed on canplay
          thisObj.seekTo(thisObj.startTime);
        }
      })
      .on('playing',function() { 
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
        if (thisObj.debug) { 
          console.log('media ratechange');        
        }
      })
      .on('volumechange',function() { 
        if (thisObj.debug) { 
          console.log('media volume change');       
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

    this.addSeekbarListeners();

    // handle clicks on player buttons 
    this.$controllerDiv.find('button').click(function(){
      thisObj.onClickPlayerButton(this);
    });

    // handle local key-presses if we're not the only player on the page; otherwise these are dispatched by global handler.
    this.$ableDiv.keydown(function (e) {
      if (AblePlayer.nextIndex > 1) {
        thisObj.onPlayerKeyPress(e);
      }
    });
    
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
      setInterval(function () {
        // Youtube doesn't give us time update events, so we just periodically generate them ourselves.
        thisObj.onMediaUpdateTime();
      }, 300);
    }
  };
})(jQuery);
