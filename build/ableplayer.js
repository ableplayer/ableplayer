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
    this.tt = {};
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
    
    // Path to root directory of referring website 
    this.rootPath = this.getRootWebSitePath();

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
    this.fallbackPath = this.rootPath + '/thirdparty/';  
    
    // testFallback - set to true to force browser to use the fallback player (for testing)
    // Note: JW Player does not support offline playback (a Flash restriction)
    // Therefore testing must be performed on a web server 
    this.testFallback = false;

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

    this.getUserAgent();
    this.setButtonImages();
  };

  AblePlayer.prototype.getRootWebSitePath = function() { 

    var _location = document.location.toString();
    var domainNameIndex = _location.indexOf('/', _location.indexOf('://') + 3);
    var domainName = _location.substring(0, domainNameIndex) + '/';
    var webFolderIndex = _location.indexOf('/', _location.indexOf(domainName) + domainName.length);
    var webFolderFullPath = _location.substring(0, webFolderIndex);
    return webFolderFullPath;
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
    this.initSignLanguage();
    this.setupTracks().then(function () {
      thisObj.setupPopups();
      thisObj.initDescription();
      thisObj.updateDescription();      
      thisObj.initializing = false;
      thisObj.initPlayer();
      thisObj.initDefaultCaption(); 
      thisObj.updateCaption();
      thisObj.updateTranscript(); 
      thisObj.showSearchResults();      
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
      playerPromise = this.initYouTubePlayer();
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
      // Moved this block to recreatePlayer() 
      // Preserved here to ensure there are no problems
/*
      thisObj.updateDescription();
      thisObj.updateCaption();
      thisObj.updateTranscript();
      thisObj.showSearchResults();
*/      
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
  
  AblePlayer.prototype.initDefaultCaption = function () { 
    
    var i; 
    if (this.captions.length > 0) { 
      for (i=0; i<this.captions.length; i++) { 
        if (this.captions[i].def === true) { 
          this.captionLang = this.captions[i].language;
          this.selectedCaptions = this.captions[i];
        }
      }
      if (typeof this.captionLang === 'undefined') { 
        // No caption track was flagged as default 
        // find and use a caption language that matches the player language       
        for (i=0; i<this.captions.length; i++) { 
          if (this.captions[i].language === this.lang) { 
            this.captionLang = this.captions[i].language;
            this.selectedCaptions = this.captions[i];
          }
        }
      }
      if (typeof this.captionLang === 'undefined') { 
        // Still no matching caption track 
        // just use the first track 
        this.captionLang = this.captions[0].language;
        this.selectedCaptions = this.captions[0];
      }
      if (typeof this.captionLang !== 'undefined') { 
        // reset transcript selected <option> to this.captionLang
        if (this.$transcriptLanguageSelect) { 
          this.$transcriptLanguageSelect.find('option[lang=' + this.captionLang + ']').attr('selected','selected');
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
        // var flashplayer = '../thirdparty/jwplayer.flash.swf';
        var html5player = thisObj.fallbackPath + 'jwplayer.html5.js';
        // var html5player = '../thirdparty/jwplayer.html5.js';

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
            width: 0,
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

  AblePlayer.prototype.initYouTubePlayer = function () {
    var thisObj = this;
    
    var resettingYouTubeCaptions = false;

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
        thisObj.showAlert(thisObj.tt.alertDescribedVersion);
      }
      else { 
        youTubeId = thisObj.youtubeId;
      }
      
      thisObj.youTubeCaptionsReady = false; 
      // if video already has captions handled by Able Player via <track>, turn off YouTube captions 
      if (thisObj.hasCaptions) { 
        // force YouTube captions to be off, despite user's caption preference on YouTube
        var ccLoadPolicy = 0; 
      } 
      else { 
        // force YouTube captions to be on 
        // Otherwise the YouTube 'cc' module isn't loaded 
        // which is needed for determining whether there are captions, & what languages
        var ccLoadPolicy = 1; 
      }
      
      thisObj.youTubePlayer = new YT.Player(containerId, {
        videoId: youTubeId,
        height: thisObj.playerHeight.toString(),
        width: thisObj.playerWidth.toString(),
        playerVars: {
          start: thisObj.startTime,
          controls: 0, // no controls, using our own
          cc_load_policy: ccLoadPolicy,
          // enablejsapi: 1, // deprecated; but we don't even need it???
          hl: thisObj.lang, // use the default language UI
          modestbranding: 1, // no YouTube logo in controller
          rel: 0, // do not show related videos when video ends            
          html5: 1 // force html5 if browser supports it (undocumented parameter; 0 does NOT force Flash)
        },
        events: {
          onReady: function () {
            deferred.resolve();
            // In order to trigger onApiChange event (and therefore load captions), play just a little 
            thisObj.ytPlayingJustEnough = true; 
            thisObj.playMedia();
          },
          onError: function (x) {
            deferred.fail();
          },
          onStateChange: function (x) { 
            if (thisObj.ytPlayingJustEnough) { 
              thisObj.handleStop();
              thisObj.ytPlayingJustEnough = false; 
            } 

            // do something
          },
          onPlaybackQualityChange: function () { 
            // do something
          },
          onApiChange: function (x) { 
            // fires to indicate that the player has loaded (or unloaded) a module with exposed API methods
            // it isn't fired until the video starts playing 
            // if captions are available for this video (automated captions don't count) 
            // the 'captions' (or 'cc') module is loaded. If no captions are available, this event never fires 
            if (typeof thisObj.ytCaptionModule === 'undefined') { 
              // YouTube captions have already been initialized 
              // Only need to do this once 
              thisObj.initYouTubeCaptions();
            }
            if (thisObj.resettingYouTubeCaptions) { 
              // even though caption module has loaded 
              // setting the language at this point does not reliable set the caption language to thisObj.captionLang
              // (the language selected from the popup menu) 
              // Instead, it sometimes reverts to the most recent language 
              // This is especially true in Firefox on Mac, which is very slow anyway with the html5 player  
              // Adding a brief timeout helps, but causes captions to load briefly in the most recent language, then switch 
              // which creates a flash and is kind of clunky (ommitting the timeout for now) 
              // setTimeout(function() { 
                thisObj.youTubePlayer.setOption(thisObj.ytCaptionModule, 'track', {'languageCode': thisObj.captionLang}); 
                thisObj.resettingYouTubeCaptions = false;
              // }, 1000);
            }
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

  AblePlayer.prototype.initYouTubeCaptions = function () {

    // called when YouTube onApiChange event is fired 
    // fires to indicate that the player has loaded (or unloaded) a module with exposed API methods
    // it isn't fired until the video starts playing 
    // and only fires if captions are available for this video (automated captions don't count) 
    // If no captions are available, onApichange event never fires & this function is never called
    
    // YouTube iFrame API documentation is incomplete related to captions 
    // Found undocumented features on user forums and by playing around 
    // Details are here: http://terrillthompson.com/blog/
    // Summary: 
    // User might get either the AS3 (Flash) or HTML5 YouTube player  
    // The API uses a different caption module for each player (AS3 = 'cc'; HTML5 = 'captions') 
    // There are differences in the data exposed by these modules 
    // Since none of this is mentioned in the API documentation, using it at all is probably risky 
    // This function is therefore conservative in what data it uses 

    var thisObj, options, module, tooltip,
        defTrack, defLang, tracks, track, trackLang, trackKind, trackName, isDefault,
        fontSize, displaySettings, 
        newButton, captionLabel, buttonTitle, buttonLabel, buttonIcon, buttonImg;

    thisObj = this;
    this.ytCaptions = [];     
    options = this.youTubePlayer.getOptions(); 
    if (options.length) {
      for (var i=0; i<options.length; i++) { 
        if (options[i] == 'cc') { // this is the AS3 (Flash) player 
          this.ytCaptionModule = 'cc';          
          break;
        }
        else if (options[i] == 'captions') { // this is the HTML5 player 
          this.ytCaptionModule = 'captions';
          break;
        } 
      }
   
      if (this.ytCaptionModule == 'cc' || this.ytCaptionModule == 'captions') { 
        // captions are available 

        // check to see if video already has captions handled by Able Player via <track> 
        if (this.hasCaptions) { 
          // disable YouTube captions. Local captions take precedence. 
          this.usingYouTubeCaptions = false; 
          this.youTubePlayer.unloadModule(this.ytCaptionModule);           
        }
        else { // there are no local captions. Use YouTube captions
          this.usingYouTubeCaptions = true; 
          // get array of available captions/subtitle tracks
          tracks = this.youTubePlayer.getOption(this.ytCaptionModule,'tracklist');        

          // get default track 
          // (this works in the 'cc' module, but in 'captions' the track option always returns an empty object) 
          defTrack = this.youTubePlayer.getOption(this.ytCaptionModule,'track');
          if (typeof defTrack.languageCode !== 'undefined') { 
            defLang = defTrack.languageCode; 
          }
          else { 
            defLang = false; 
          }
          if (tracks.length) {       
            for (var i=0; i<tracks.length; i++) { 
              trackLang = tracks[i].languageCode; 

              // get track name 
              if (this.ytCaptionModule == 'cc') { 
                trackName = tracks[i].name; // this seems to always be an empty string 
              }
              else if (this.ytCaptionModule == 'captions') { 
                trackName = tracks[i].languageName; // displayName seems to have the same value  
              }
              if (trackName == '') { 
                trackName = this.getLanguageName(trackLang);
              }

              // determine whether this is the default track 
              if (defLang) { 
                if (trackLang == defLang) { 
                  isDefault = true;
                }
                else { 
                  isDefault = false;
                }
              }
              else { 
                if (tracks[i].is_default) { 
                  isDefault = true; 
                  defLang = trackLang;
                }
                else { 
                  isDefault = false;
                }
              }
              // ytCaptions has all the same keys that this.captions has *except* no cues
              this.ytCaptions.push({
                'language': trackLang,
                'label': trackName,
                'def': isDefault
              });
            }
      
            if (!defLang) { 
              // YouTube did not reveal the default track, either with track or tracklist.is_defult  
              // How does YouTube decide which language to use as default? Terrill's test results:
              // Set lang to French in browser prefs (Firefox & Chrome); default captions are English 
              // Set lang to French in OS settings (Mac OS X); default captions are English 
              // Might be doing some more sophisticated geolocating, or they might just always serve up English 
              // For now, Able Player will just assume the default captions are in English ... 
              for (var i in this.ytCaptions) {
                if (this.ytCaptions[i].language == 'en') {
                  this.ytCaptions[i].def = true;
                  break; 
                }
              }
            }
            
            // get user's preferred fontSize       
            fontSize = this.youTubePlayer.getOption(this.ytCaptionModule,'fontSize');

            // get user's displaySettings 
            displaySettings = this.youTubePlayer.getOption(this.ytCaptionModule,'displaySettings'); 
      
            // TODO: Use fontSize and displaySettings to customize appearance of captions 

            // check to see if video already has captions handled by Able Player via <track> 
            if (typeof this.$ccButton === 'undefined') { 

              // there is no cc button. add one 
              // TODO: Fix the redundancy with buildplayer.js > addControls() 
                      
              if (!this.prefCaptions || this.prefCaptions !== 1) { 
                // captions are available, but user has them turned off 
                this.captionsOn = false;
                if (tracks.length > 1) { 
                  captionLabel = this.tt.captions;
                }
                else { 
                  captionLabel = this.tt.showCaptions;
                }
              }
              else { 
                this.captionsOn = true; 
                if (tracks.length > 1) { 
                  captionLabel = this.tt.captions;
                }
                else { 
                  captionLabel = this.tt.hideCaptions;
                }            
              }
              buttonTitle = this.getButtonTitle('captions')
          
              newButton = $('<button>',{ 
                'type': 'button',
                'tabindex': '0',
                'aria-label': captionLabel,
                'class': 'able-button-handler-captions'
              });        
              
              if (this.iconType === 'font') {
                buttonIcon = $('<span>',{ 
                  'class': 'icon-captions',
                  'aria-hidden': 'true'
                });               
                newButton.append(buttonIcon);
              }
              else { 
                // use images
                buttonImg = $('<img>',{ 
                  'src': '../images/' + this.iconColor + '/captions.png',
                  'alt': '',
                  'role': 'presentation'
                });
                newButton.append(buttonImg);
              }
              // add the visibly-hidden label for screen readers that don't support aria-label on the button
              buttonLabel = $('<span>',{
                'class': 'able-clipped'
              }).text(buttonTitle);
              newButton.append(buttonLabel);
          
              if (!this.captionsOn) {
                newButton.addClass('buttonOff').attr('title',captionLabel);
              }
          
              this.$ccButton = newButton; 
          
              // append button to the lower left span in the controller 
              this.$controllerDiv.children('span.able-left-controls').eq(1).append(this.$ccButton);
          
              // add new button to this.controls array for future reference 
              this.controls.push('captions'); 

              // add a popup menu of caption/subtitle languages            
              this.setupPopups();

              // add an event listener that displays a tooltip on mouseenter or focus 
              this.$ccButton.on('mouseenter focus',function(event) { 
                var label = $(this).attr('aria-label');
                // get position of this button 
                var position = $(this).position(); 
                var buttonHeight = $(this).height();
                var buttonWidth = $(this).width();
                var tooltipY = position.top - buttonHeight - 15;
                var centerTooltip = true; 
                var tooltipId = thisObj.mediaId + '-tooltip';
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
                tooltip = $('#' + tooltipId).text(label).css(tooltipStyle); 
                thisObj.showTooltip(tooltip);
                
                $(this).on('mouseleave blur',function() { 
                  $('#' + tooltipId).text('').hide();
                });
              });
            
              // add an event listener for a click 
              this.$ccButton.click(function(){
                thisObj.onClickPlayerButton(this);
              });

              // TODO: might need to adjust width and height of div.able-vidcap-container
              // Only used if !this.usingYouTubeCaptions
              /*
              var vidcapStyles = {
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
              */

              this.refreshControls();      
      
            } // end if there is no cc button 
          } // end if there is at least one track
        } // end else if there are no local captions (therefore, using YouTube 
      } // end if captions are available via YouTube  
      else { 
        // onApiChange event fired, but no captions module is available 
        // must have been some other module being loaded or unloaded
      }
    } // end if this.getOptions() returns any modules 
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
    if (Cookies.enabled) {
      Cookies.set('Able-Player', cookieValue, {expires: 90});
    }
  };

  AblePlayer.prototype.getCookie = function() {
   // var cookie;
    // cookie = Cookies.getJSON('Able-Player');
   //  return cookie;

    var defaultCookie = {
      preferences: {}
    };

      var cookie;
      try {
        cookie = Cookies.getJSON('Able-Player');
      }
      catch (err) {
        // Original cookie can't be parsed; update to defau
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
        'name': 'prefSignLanguage', // use sign language if available
        'label': this.tt.prefSignLanguage,
        'default': 1 // on because in rare cases that it's actually available, users should be exposed to it
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
    
    var thisObj = this;

    // create $mediaContainer and $ableDiv and wrap them around the media element
    this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();        
    this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
    // width and height of this.$mediaContainer are not updated when switching to full screen 
    // However, I don't think they're needed at all. Commented out on 4/12/15, but 
    // preserved here just in case there are unanticipated problems... 
    /*    
    this.$mediaContainer.width(this.playerWidth);
    if (this.mediaType == 'video') {     
      this.$mediaContainer.height(this.playerHeight);
    }
    */
    this.$ableDiv.width(this.playerWidth);
    
    this.injectOffscreenHeading();
    
    // youtube adds its own big play button
    // if (this.mediaType === 'video' && this.player !== 'youtube') {
    if (this.mediaType === 'video') { 
      if (this.player !== 'youtube') {      
        this.injectBigPlayButton();
      }

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
    else if (this.$ableColumnRight) {
      this.$ableColumnRight.prepend(this.$transcriptArea);
    }
    else {
      this.splitPlayerIntoColumns('transcript');
    }
        
    // If client has provided separate transcript location, override user's preference for hiding transcript
    if (!this.prefTranscript && !this.transcriptDivLocation) { 
      this.$transcriptArea.hide(); 
    }
  };

  AblePlayer.prototype.splitPlayerIntoColumns = function (feature) { 
    // feature is either 'transcript' or 'sign' 
    // if present, player is split into two column, with this feature in the right column
    this.$ableColumnLeft = this.$ableDiv.wrap('<div class="able-column-left">').parent();
    this.$ableColumnLeft.width(this.playerWidth);
    if (feature === 'transcript') {
      this.$transcriptArea.insertAfter(this.$ableColumnLeft);
      this.$ableColumnRight = this.$transcriptArea.wrap('<div class="able-column-right">').parent();
    }
    else if (feature == 'sign') { 
      this.$signArea.insertAfter(this.$ableColumnLeft);
      this.$ableColumnRight = this.$signArea.wrap('<div class="able-column-right">').parent();      
    }
    this.$ableColumnRight.width(this.playerWidth);
  };
  
  AblePlayer.prototype.injectAlert = function () {
    this.alertBox = $('<div role="alert"></div>');
    this.alertBox.addClass('able-alert');
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
  // 'which' parameter is either 'captions', 'chapters', or 'X-window' (e.g., "sign-window")
  AblePlayer.prototype.createPopup = function (which) {
    
    var thisObj, $popup, $thisButton, $thisListItem, $prevButton, $nextButton, 
        selectedTrackIndex, selectedTrack;
    thisObj = this;
    $popup = $('<div>',{
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup' 
    });

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
    if (this.$windowPopup && this.$windowPopup.is(':visible')) {
      this.$windowPopup.hide();
      this.$windowButton.show().focus();
    }    
  };

  // Create and fill in the popup menu forms for various controls.
  AblePlayer.prototype.setupPopups = function () {
    
    var popups, thisObj, hasDefault, i, j, tracks, trackList, trackItem, track,  
        radioName, radioId, trackButton, trackLabel; 
    
    popups = [];     
    
    if (typeof this.ytCaptions !== 'undefined') { 
      // special call to this function for setting up a YouTube caption popup
      if (this.ytCaptions.length) { 
        popups.push('ytCaptions');
      }
      else { 
        return false;
      }
    }
    else { 
      if (this.captions.length > 0) { 
        popups.push('captions');
      }            
      if (this.chapters.length > 0) { 
        popups.push('chapters');
      }
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
        else if (popup == 'ytCaptions') { 
          this.captionsPopup = this.createPopup('captions');
          tracks = this.ytCaptions;
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
          trackButton.click(this.getCaptionOffFunction());
          trackItem.append(trackButton,trackLabel);
          trackList.append(trackItem);          
        }
        if (!hasDefault) { 
          // check the first button 
          trackList.find('input').first().attr('checked','checked');          
        }
        if (popup == 'captions' || popup == 'ytCaptions') {
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
    $helpTextWrapper.append($helpIntro, helpText, $helpDisclaimer);
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
      if (this.hasSignLanguage) { 
        blr.push('sign'); // sign language
      }
      if (this.hasOpenDesc || this.hasClosedDesc) { 
        blr.push('descriptions'); //audio description 
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
          
          controllerSpan.append(newButton);
          // create variables of buttons that are referenced throughout the class 
          if (control === 'play') { 
            this.$playpauseButton = newButton;
          }
          else if (control === 'captions') { 
            this.$ccButton = newButton;
          }
          else if (control === 'sign') { 
            this.$signButton = newButton;
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
      
      var isDefaultTrack = track.getAttribute('default'); 

      if (!trackSrc) {
        // Nothing to load!
        continue;
      }

      var loadingPromise = this.loadTextObject(trackSrc);
      var thisObj = this;
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
        deferred.resolve(src, trackText); 
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

    this.wrapperDiv.width(width);
    this.wrapperDiv.addClass('able-seekbar-wrapper');

    this.loadedDiv.width(0);
    this.loadedDiv.addClass('able-seekbar-loaded'); 

    this.playedDiv.width(0);
    this.playedDiv.addClass('able-seekbar-played'); 

    var seekHeadSize = '0.8em';
    this.seekHead.addClass('able-seekhead').css({
      'height': seekHeadSize,
      'width': seekHeadSize,
      'border-radius': seekHeadSize,
      '-webkit-border-radius': seekHeadSize,
      '-moz-border-radius': seekHeadSize,
      '-o-border-radius': seekHeadSize
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
  
  AccessibleSeekBar.prototype.positionToStr = function (seconds) {
    
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
    else if (this.player === 'jw' && this.jwPlayer) { 
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

<<<<<<< HEAD
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
=======
  AblePlayer.prototype.getUserAgent = function() {

    // Whenever possible we avoid browser sniffing. Better to do feature detection. 
    // However, in case it's needed...  
    // this function defines a userAgent array that can be used to query for common browsers and OSs 
    // NOTE: This would be much simpler with jQuery.browser but that was removed from jQuery 1.9
    // http://api.jquery.com/jQuery.browser/
    this.userAgent = {}; 
    this.userAgent.browser = {}; 
    this.userAgent.os = {}; 
    
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
    if (this.debug) { 
      console.log('User agent:' + navigator.userAgent);
      console.log('Vendor: ' + navigator.vendor);
      console.log('Browser: ' + this.userAgent.browser.name);
      console.log('Version: ' + this.userAgent.browser.version);
>>>>>>> 41cb70aa64e9496a390074b155768ae0a2e20302
    }
  };

  AblePlayer.prototype.isUserAgent = function(which) {
    var userAgent = navigator.userAgent.toLowerCase();
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
    if (this.player === 'html5') {
      var seekable;
  
      this.startTime = newTime;
      // Check HTML5 media "seekable" property to be sure media is seekable to startTime
      seekable = this.media.seekable;
      
      if (seekable.length > 0 && this.startTime >= seekable.start(0) && this.startTime <= seekable.end(0)) { 
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
    }

    this.liveUpdatePending = true;

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
    else if (this.player === 'youtube') {
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
    else if (this.player === 'youtube') {
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

  AblePlayer.prototype.isMuted = function () {

    if (!this.browserSupportsVolume()) {
      return false;
    }

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
    if (!this.browserSupportsVolume()) {
      return;
    }
    if (!mute) {
      this.$muteButton.attr('aria-label',this.tt.mute); 
      this.$muteButton.find('span').first().removeClass('icon-volume-mute').addClass('icon-volume-loud');       
      this.$muteButton.find('span.able-clipped').text(this.tt.mute); 
    }
    else {
      this.$muteButton.attr('aria-label',this.tt.unmute); 
      this.$muteButton.find('span').first().removeClass('icon-volume-loud').addClass('icon-volume-mute');       
      this.$muteButton.find('span.able-clipped').text(this.tt.unmute);
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
      if (this.hasSignLanguage && this.signVideo) { 
        this.signVideo.volume = 0; // always mute
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      this.jwPlayer.setVolume(volume * 100);
    }
    else if (this.player === 'youtube') {
      this.youTubePlayer.setVolume(volume * 100);
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
    else if (this.player === 'jw' && this.jwPlayer) {
      return this.jwPlayer.getVolume() / 100;
    }
    else if (this.player === 'youtube') {
      return this.youTubePlayer.getVolume() / 100;
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
      this.stoppingYouTube = false;
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

    if (this.stoppingYouTube) { 
      // YouTube reports 'paused' but we're trying to emulate 'stopped' 
      // See notes in handleStop() 
      // this.stoppingYouTube will be reset when playback resumes in play() 
      if (this.$status.text() !== this.tt.statusStopped) {
        this.$status.text(this.tt.statusStopped);
      }
      if (this.$playpauseButton.find('span').first().hasClass('icon-pause')) { 
        if (this.iconType === 'font') {
          this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
          this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
        }
        else { 
          this.$playpauseButton.find('img').attr('src',this.playButtonImg); 
        }
      }
    }
    else { 
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

      // Don't change play/pause button display while using the seek bar (or if YouTube stopped)
      if (!this.seekBar.tracking && !this.stoppingYouTube) {
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
    }
    
    // Update seekbar width. 
    // To do this, we need to calculate the width of all elements surrounding it.
    if (this.seekBar) {
      var widthUsed = 0;
      // Elements on the left side of the control panel.
      var leftControls = this.seekBar.wrapperDiv.parent().prev();
      leftControls.children().each(function () {
        if ($(this).is(':hidden')) {
          // jQuery width() returns 0 for hidden elements 
          // thisObj.getHiddenWidth() is a workaround 
          widthUsed += thisObj.getHiddenWidth($(this)); 
        }
        else { 
          widthUsed += $(this).width(); 
        }
      });
      // Elements to the left and right of the seekbar on the right side.
      var prev = this.seekBar.wrapperDiv.prev();
      while (prev.length > 0) {
        if (prev.is(':hidden')) { 
          widthUsed += thisObj.getHiddenWidth(prev); 
        }
        else { 
          widthUsed += prev.width();
        }
        prev = prev.prev();
      }
      var next = this.seekBar.wrapperDiv.next();
      while (next.length > 0) {
        if (next.is(':hidden')) { 
          widthUsed += thisObj.getHiddenWidth(next); 
        }
        else { 
          widthUsed += next.width();
        }
        next = next.next();
      }
      var seekbarWidth = this.playerWidth - widthUsed - 20;
      // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
      if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
        this.seekBar.setWidth(seekbarWidth);
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
      if (this.usingYouTubeCaptions) { 
        var captionsCount = this.ytCaptions.length;
      }
      else { 
        var captionsCount = this.captions.length; 
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
    else if (this.player === 'jw' && this.jwPlayer) {
      this.seekBar.setBuffered(this.jwPlayer.getBuffer() / 100);
    }
    else if (this.player === 'youtube') {
      this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
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

  AblePlayer.prototype.handleStop = function() { 
    if (this.player == 'html5') {
      this.pauseMedia();
      this.seekTo(0);
    }
    else if (this.player === 'jw' && this.jwPlayer) { 
      this.jwPlayer.stop();
    }
    else if (this.player === 'youtube') { 
      // YouTube API function stopVideo() does not reset video to 0
      // However, the stopped video is not seekable 
      // so we can't call seekTo(0) after calling stopVideo() 
      // Workaround is to use pauseVideo() instead, then seek to 0
      this.youTubePlayer.pauseVideo();
      this.seekTo(0);
      // Unfortunately, pausing the video doesn't change playerState to 'Stopped' 
      // which has an effect on the player UI. 
      // the following Boolean is used  in refreshControls() to emulate a 'stopped' state
      this.stoppingYouTube = true; 
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
    if (this.usingYouTubeCaptions) { 
      
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
        if (this.usingYouTubeCaptions) { 
          this.youTubePlayer.unloadModule(this.ytCaptionModule);       
        }
        else { 
          this.$captionDiv.hide();
        }
      }
      else { 
        // captions are off. Turn them on. 
        this.captionsOn = true;
        if (this.usingYouTubeCaptions) { 
          this.youTubePlayer.loadModule(this.ytCaptionModule);
        }
        else {          
          this.$captionDiv.show();
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

  AblePlayer.prototype.handleSignToggle = function () {
    if (this.$signWindow.is(':visible')) {
      this.$signWindow.hide();
      this.$signButton.addClass('buttonOff').attr('aria-label',this.tt.showSign);
      this.$signButton.find('span.able-clipped').text(this.tt.showSign);
    }
    else {
      this.$signWindow.show();
      // get starting position of element; used for drag & drop
      var signWinPos = this.$signWindow.offset();
      this.dragStartX = signWinPos.left;
      this.dragStartY = signWinPos.top;      
      this.$signButton.removeClass('buttonOff').attr('aria-label',this.tt.hideSign);
      this.$signButton.find('span.able-clipped').text(this.tt.hideSign);
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
    this.autoScrollTranscript = val;
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
    
    // location is either 'main' (default) or 'sign' (i.e., sign language window) 
    var thisObj = this;
    var alertBox, alertLeft; 
    if (location === 'sign') { 
      alertBox = this.$windowAlert; 
    }
    else { 
      alertBox = this.alertBox;
    }
    alertBox.show();
    alertBox.text(msg);
    if (location === 'sign') { 
      if (this.$signWindow.width() > alertBox.width()) { 
        alertLeft = this.$signWindow.width() / 2 - alertBox.width() / 2; 
      }
      else { 
        // alert box is wider than its container. Position it far left and let it wrap
        alertLeft = 10;
      }
      // position alert in the lower third of the sign window (to avoid covering the signer) 
      alertBox.css({
        top: (this.$signWindow.height() / 3) * 2,
        left: alertLeft
      });
    }
    else { 
      // Center at top of vidcap container; use vidcap container instead of media container due to an IE8 sizing bug.
      alertBox.css({
        left: this.$playerDiv.offset().left + (this.$playerDiv.width() / 2) - (alertBox.width() / 2)
      });      
    }
    setTimeout(function () {
      alertBox.fadeOut(300);
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
    else if (this.youTubePlayer) {
      this.youTubePlayer.setSize(width, height);
    }
        
    this.refreshControls();
  };
})(jQuery);

(function ($) {
  AblePlayer.prototype.updateCaption = function (time) {   
    if (!this.usingYouTubeCaptions) {     
      if (this.captionsOn) {
        this.$captionDiv.show();
        this.showCaptions(time || this.getElapsed());
      }
      else if (this.$captionDiv) {
        this.$captionDiv.hide();
      }
    }
  };

  // Returns the function used when a caption is clicked in the captions menu.
  AblePlayer.prototype.getCaptionClickFunction = function (track) {
    var thisObj = this;
    return function () {
      thisObj.selectedCaptions = track;
      thisObj.captionLang = track.language;
      thisObj.currentCaption = -1;
      if (thisObj.usingYouTubeCaptions) { 
        if (thisObj.captionsOn) { 
          // captions are already on. Just need to change the language 
          thisObj.youTubePlayer.setOption(thisObj.ytCaptionModule, 'track', {'languageCode': thisObj.captionLang}); 
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
        // Try and find a matching description track for rebuilding transcript
        for (var ii in thisObj.descriptions) {
          if (thisObj.descriptions[ii].language === track.language) {
            thisObj.selectedDescriptions = thisObj.descriptions[ii];
            thisObj.currentDescription = -1;
          }
        }
        thisObj.updateCaption();
        thisObj.updateDescription();
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
  AblePlayer.prototype.updateTranscript = function() {
    
    if (!this.includeTranscript) {
      return;
    }
    // Update transcript.
    var captions;
    var descriptions;
    var captionLang;
    if (this.transcriptCaptions) {   
      // use this independently of this.selectedCaptions 
      // user might want captions in one language, transcript in another   
      captionLang = this.transcriptCaptions.language;
      captions = this.transcriptCaptions.cues;
    }
    else if (this.selectedCaptions) { 
      captionLang = this.captionLang; 
      captions = this.selectedCaptions.cues;
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
    // Note: This event listeners handles clicks only, not keydown events 
    // Pressing Enter on an element that is not natively clickable does NOT trigger click() 
    // Keydown events are handled elsehwere, both globally (ableplayer-base.js) and locally (event.js) 
    if (this.$transcriptArea.length > 0) { 
      this.$transcriptArea.find('.able-transcript span.able-transcript-seekpoint').click(function(event) { 
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
    this.$transcriptArea.find('.able-transcript span.able-transcript-caption').each(function() { 
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
        this.modalFullscreenActive ) {

      var newHeight; 
    
      if (window.outerHeight >= window.innerHeight) { 
        newHeight = window.outerHeight - this.$playerDiv.outerHeight();
      }
      else { 
        // not sure why innerHeight > outerHeight, but observed this in Safari 9.0.1
        // Maybe window is already adjusted for controller height? 
        // Anyway, no need to subtract player height if window.outerHeight is already reduced
        newHeight = window.outerHeight;         
      }
    
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
  
  AblePlayer.prototype.initDragDrop = function ( $element ) {

    // Accessible Drag & Drop based on these resources: 
    // Accessible Drag and Drop Using WAI-ARIA 
    // http://dev.opera.com/articles/accessible-drag-and-drop/
    // Accessible Drag and Drop script on quirksmode 
    // http://www.quirksmode.org/js/this.html
    var thisObj = this;

    this.$activeWindow = $element;
    
    // able-sign-window is currently the only draggable window, 
    // but this functionality could ultimately be extended to other windows    
    if ($element.is('.able-sign-window')) { 
      this.windowName = 'sign-window';
    }    
    this.addWindowMenu();    
  };
  
  AblePlayer.prototype.addWindowMenu = function() { 

    var thisObj = this; 
    
    // add alert div to window 
    this.$windowAlert = $('<div role="alert"></div>');
    this.$windowAlert.addClass('able-alert');
    this.$windowAlert.appendTo(this.$activeWindow);
    this.$windowAlert.css({
      top: this.$activeWindow.offset().top
    });
    
    // add button to draggable window which triggers a popup menu 
    // for now, re-use preferences icon for this purpose
    var $newButton = $('<button>',{ 
      'type': 'button',
      'tabindex': '0',
      'aria-label': this.tt.windowButtonLabel,
      'class': 'able-button-handler-preferences' 
    });        
    if (this.iconType === 'font') {
      var $buttonIcon = $('<span>',{ 
        'class': 'icon-preferences',
        'aria-hidden': 'true'
      });               
      $newButton.append($buttonIcon);
    }
    else { 
      // use image
      var buttonImgSrc = '../images/' + this.iconColor + '/preferences.png';
      var $buttonImg = $('<img>',{ 
        'src': buttonImgSrc,
        'alt': '',
        'role': 'presentation'
      });
      $newButton.append($buttonImg);
    }
    
    // add the visibly-hidden label for screen readers that don't support aria-label on the button
    var $buttonLabel = $('<span>',{
      'class': 'able-clipped'
    }).text(this.tt.windowButtonLabel);
    $newButton.append($buttonLabel);

    // add an event listener that displays a tooltip on mouseenter or focus 
    var tooltipId = this.mediaId + '-' + this.windowName + '-tooltip';
    var $tooltip = $('<div>',{ 
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

    this.addResizeDialog();
    
    // add a popup menu 
    var $popup = this.createPopup(this.windowName);
    var $optionList = $('<ul></ul>');
    var radioName = this.mediaId + '-' + this.windowName + '-choice';
    if (this.windowName == 'sign-window') { 
      var options = []; 
      options.push({
        'name': 'move',
        'label': this.tt.windowMove
      });
      options.push({
        'name': 'resize',
        'label': this.tt.windowResize
      });
      if (this.$activeWindow.css('z-index') > 0) { 
        options.push({
          'name': 'sendBack',
          'label': this.tt.windowSendBack
        });
      }
      else { 
        options.push({
          'name': 'bringTop',
          'label': this.tt.windowBringTop
        });        
      }
      for (var i in options) {
        var $optionItem = $('<li></li>');
        var option = options[i];    
        var radioId = radioName + '-' + i;
        var $radioButton = $('<input>',{ 
          'type': 'radio',
          'val': option.name,
          'name': radioName,
          'id': radioId
        });
        var $radioLabel = $('<label>',{ 
          'for': radioId
        });
        $radioLabel.text(option.label);          
        $radioButton.on('click keypress',function(e) {
          e.preventDefault();
          thisObj.handleMenuChoice($(this).val());
        });
        $optionItem.append($radioButton,$radioLabel);
        $optionList.append($optionItem);
      }      
    } 
    $popup.append($optionList);
    $newButton.on('click keydown',function(e) {   
      thisObj.handleWindowButtonClick(e);          
    });
    this.$activeWindow.append($newButton,$tooltip,$popup);    
    this.$windowButton = $newButton;
    this.$windowPopup = $popup;    
  };
  
  AblePlayer.prototype.addResizeDialog = function () { 
    
    var thisObj = this; 
    var widthId = this.mediaId + '-resize-width';
    var heightId = this.mediaId + '-resize-height'; 
    var startingWidth = this.$activeWindow.width();
    var startingHeight = this.$activeWindow.height();
    
    var $resizeForm = $('<div></div>',{
      'class' : 'able-resize-form'
    }); 
    
    // inner container for all content, will be assigned to modal div's aria-describedby 
    var $resizeWrapper = $('<div></div>');

    // width field
    var $resizeWidthDiv = $('<div></div>');    
    var $resizeWidthInput = $('<input>',{ 
      'type': 'text',
      'id': widthId,
      'value': startingWidth      
    });
    var $resizeWidthLabel = $('<label>',{ 
      'for': widthId
    }).text(this.tt.width);

    /* // Don't prompt for height 
      
    // height field
    var $resizeHeightDiv = $('<div></div>');    
    var $resizeHeightInput = $('<input>',{ 
      'type': 'text',
      'id': heightId,
      'value': this.$activeWindow.height()      
    });
    var $resizeHeightLabel = $('<label>',{ 
      'for': heightId
    }).text(this.tt.height);
    */
    
    // Add save and cancel buttons.
    var $saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
    var $cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
    $saveButton.click(function () {
      var newWidth = $('#' + widthId).val(); 
      if (newWidth !== startingWidth) { 
        // var newHeight = Math.round(newWidth * (startingHeight/startingWidth),0);
        thisObj.$activeWindow.css('width',newWidth);
        thisObj.$activeWindow.find('video').css({
          'width' : newWidth + 'px'
          //'height' : newHeight + 'px'
        });
      }
      thisObj.resizeDialog.hide();
      thisObj.$windowPopup.hide();
      thisObj.$windowButton.show().focus();
    });
    $cancelButton.click(function () {
      dialog.hide();
    });

    // Now assemble all the parts   
    $resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
    // $resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
    $resizeWrapper.append($resizeWidthDiv);
    $resizeForm.append($resizeWrapper,'<hr>',$saveButton,$cancelButton);
    
    // must be appended to the BODY! 
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog, 
    // which will render the dialog unreadable by screen readers 
    $('body').append($resizeForm);
    this.resizeDialog = new AccessibleDialog($resizeForm, 'alert', this.tt.windowResizeHeading, $resizeWrapper, this.tt.closeButtonLabel, '20em');
  };
  
  AblePlayer.prototype.handleWindowButtonClick = function (e) { 

    if (e.which > 1) { 
      // user pressed a key 
      if (!(e.which === 32 || e.which === 13)) { 
        // this was not Enter or space. Ignore it 
        return false;
      }  
    } 
       
    if (this.hidingPopup) { 
      // stopgap to prevent keydown from reopening popup
      // immediately after closing it 
      this.hidingPopup = false;      
      return false; 
    }
    
    this.$windowButton.hide();
    this.$windowPopup.show();
    // Focus on the checked button, if any buttons are checked 
    // Otherwise, focus on the first button 
    this.$windowPopup.find('li').removeClass('able-focus');
    if (this.$windowPopup.find('input:checked').val()) { 
      this.$windowPopup.find('input:checked').focus().parent().addClass('able-focus');
    }
    else { 
      this.$windowPopup.find('input').first().focus().parent().addClass('able-focus');
    }
    e.preventDefault();
  };
  
  AblePlayer.prototype.handleMenuChoice = function ( choice ) { 

    var thisObj = this;
    if (choice == 'move') { 
      this.showAlert(this.tt.windowMoveAlert,'sign');
      thisObj.startDrag(); 
      this.$windowPopup.hide().parent().focus(); 
    }
    else if (choice == 'resize') { 
      this.resizeDialog.show();
      this.showAlert(this.tt.windowResizeAlert,'sign');
    }
    else if (choice == 'sendBack') { 
      this.$activeWindow.css('z-index','0');
      // this has the side-effect of making the popup unclickable       
      this.$windowPopup.css('z-index','4000').hide(); 
      this.$windowButton.show().focus();
      this.showAlert(this.tt.windowSendBackAlert,'sign');
      // change content of radio button       
      var $thisRadio = this.$windowPopup.find('input:last'); 
      $thisRadio.val('bringTop'); 
      $thisRadio.next('label').text(this.tt.windowBringTop);
    }
    else if (choice == 'bringTop') { 
      this.$activeWindow.css({
        'z-index':'4000'
      });
      this.$windowPopup.hide(); 
      this.$windowButton.show().focus();
      this.showAlert(this.tt.windowBringTopAlert,'sign');                  
      // change content of radio button       
      var $thisRadio = this.$windowPopup.find('input:last'); 
      $thisRadio.val('sendBack'); 
      $thisRadio.next('label').text(this.tt.windowSendBack);      
    }    
  };
  
  AblePlayer.prototype.startDrag = function() { 

    var thisObj, startPos, newX, newY;
    thisObj = this;
    
    // prepare element for dragging
    this.$activeWindow.addClass('able-drag').css({
      'position': 'absolute',
      'top': this.dragStartY + 'px',
      'left': this.dragStartX + 'px'
    });

    // get starting position of element
    startPos = this.$activeWindow.offset();
    this.dragStartX = this.dXKeys = startPos.left;
    this.dragStartY = this.dYKeys = startPos.top;     
    
    // add listeners 
    $(document).on('mousedown',function(e) { 
      thisObj.dragging = true; 
      
    // get starting position of mouse 
      thisObj.startMouseX = e.pageX;
      thisObj.startMouseY = e.pageY;    
      // get offset between mouse position and top left corner of draggable element
      thisObj.dragOffsetX = thisObj.startMouseX - thisObj.dragStartX;
      thisObj.dragOffsetY = thisObj.startMouseY - thisObj.dragStartY;
    });

    $(document).on('mousemove',function(e) { 
      if (thisObj.dragging) { 
        // calculate new top left based on current mouse position - offset 
        newX = e.pageX - thisObj.dragOffsetX;
        newY = e.pageY - thisObj.dragOffsetY;
        thisObj.resetDraggedObject( newX, newY );
      }
    });
    
    $(document).on('mouseup',function() { 
      if (thisObj.dragging) {
        // finalize the drop
        thisObj.dragEnd();
      }
    });

    this.startingDrag = true;    
    this.$activeWindow.on('keydown',function(e) { 
      thisObj.dragKeys(e);
    });    
    
    return false;
  };

  AblePlayer.prototype.dragKeys = function(e) {

    var key, keySpeed;    
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
			  this.dXKeys -= keySpeed;
        break;
      case 38:	// up
      case 63232:
				this.dYKeys -= keySpeed;
        break;
      case 39:	// right
      case 63235:
				this.dXKeys += keySpeed;
        break;
      case 40:	// down
      case 63233:
				this.dYKeys += keySpeed;
        break;
      case 13: 	// enter
      case 27: 	// escape
				this.dragEnd();
        return false;
      default:      
				return false;
		}		
    this.resetDraggedObject(this.dXKeys,this.dYKeys);
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
  AblePlayer.prototype.dragEnd = function() {
    $(document).off('mousemove mouseup');
    this.$activeWindow.off('keydown').removeClass('able-drag'); 
    // stopgap to prevent spacebar in Firefox from reopening popup
    // immediately after closing it (used in handleWindowButtonClick())
    this.hidingPopup = true; 
    this.$windowPopup.hide();
    // Ensure stopgap gets cancelled if handleWindowButtonClick() isn't called 
    // e.g., if user triggered button with Enter or mouse click, not spacebar 
    setTimeout(function() { 
      this.hidingPopup = false;
    }, 100);
    this.$windowButton.show().focus();
    this.dragging = false;
  };
  
})(jQuery);

(function ($) {
  AblePlayer.prototype.initSignLanguage = function() { 
    
    // Sign language is only currently supported in HTML5 player, not fallback or YouTube
    // only initialize sign language if user wants it 
    // since it requires downloading a second video & consumes bandwidth
    if (this.player === 'html5' && this.prefSignLanguage) {     
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
    
    var thisObj, signVideoId, i, signSrc, srcType, $signSource; 

    thisObj = this;

    signVideoId = this.mediaId + '-sign';
    this.$signVideo = $('<video>',{ 
      'id' : signVideoId,
      'width' : this.playerWidth,
      'tabindex' : '-1' // remove from tab order
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
      'draggable': 'true',
      'tabindex': '-1'
    });
    this.$signWindow.append(this.$signVideo).hide();
    
    // Place sign window in div.able-column-right
    // If div doesn't exist yet, create it 
    if (this.$ableColumnRight) { 
      this.$ableColumnRight.append(this.$signWindow);
    }
    else { 
      this.splitPlayerIntoColumns('sign');
    }

    this.initDragDrop(this.$signWindow); 
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
    var langs = ['en','de','es','nl'];
    return langs;
  };

  AblePlayer.prototype.getTranslationText = function() { 

    // determine language, then get labels and prompts from corresponding translation var
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

    // in final build, all language variables are contatenated into this function below...
    // translation2.js is then contanenated onto the end to finish this function
        

var de = {  "playerHeading": "Media Player","faster": "Schneller","slower": "Langsamer","chapters": "Kapitel","play": "Abspielen", "pause": "Pause","stop": "Anhalten","rewind": "Zurück springen", "forward": "Vorwärts springen", "captions": "Untertitel","showCaptions": "Untertitel anzeigen","hideCaptions": "Untertitel verstecken","captionsOff": "Untertitel ausschalten", "showTranscript": "Transkription anzeigen","hideTranscript": "Transkription entfernen","turnOnDescriptions": "Audiodeskription einschalten","turnOffDescriptions": "Audiodeskription ausschalten","language": "Sprache","sign": "Gebärdensprache","showSign": "Gebärdensprache anzeigen","hideSign": "Gebärdensprache verstecken","mute": "Ton ausschalten","unmute": "Ton einschalten","volume": "Lautstärke", "volumeUp": "Lauter","volumeDown": "Leiser","preferences": "Einstellungen","enterFullScreen": "Vollbildmodus einschalten","exitFullScreen": "Vollbildmodus verlassen","fullScreen": "Vollbildmodus","speed": "Geschwindigkeit","or": "oder", "spacebar": "Leertaste","autoScroll": "Automatisch scrollen","unknown": "Unbekannt", "statusPlaying": "Gestartet","statusPaused": "Pausiert","statusStopped": "Angehalten","statusWaiting": "Wartend","statusBuffering": "Daten werden empfangen...","statusUsingDesc": "Version mit Audiodeskription wird verwendet","statusLoadingDesc": "Version mit Audiodeskription wird geladen","statusUsingNoDesc": "Version ohne Audiodeskription wird verwendet","statusLoadingNoDesc": "Version ohne Audiodeskription wird geladen","statusLoadingNext": "Der nächste Titel wird geladen","statusEnd": "Ende des Titels","selectedTrack": "Ausgewählter Titel","alertDescribedVersion": "Audiodeskription wird verwendet für dieses Video","fallbackError1": "Abspielen ist mit diesem Browser nicht möglich","fallbackError2": "Folgende Browser wurden mit AblePlayer getestet","orHigher": "oder höher","prefTitle": "Einstellungen","prefIntro": "Beachten: es werden Cookies verwendet, um Ihre persönliche Einstellungen zu speichern.","prefFeatures": "Funktionen","prefKeys": "Tastenkombination für Kurzwahl (siehe Hilfe)","prefAltKey": "Alt-Taste","prefCtrlKey": "Strg-Taste","prefShiftKey": "Umschalttaste", "prefCaptions": "Untertitel automatisch einschalten","prefSignLanguage": "Gebärdensprache automatisch einschalten","prefDesc": "Audiodeskription automatisch einschalten","prefClosedDesc": "Textbasierte Szenenbeschreibungen verwenden, wenn vorhanden","prefDescPause": "Video automatisch anhalten, wenn textbasierte Szenenbeschreibungen eingeblendet werden", "prefVisibleDesc": "Textbasierte Szenenbeschreibungen einblenden, wenn diese aktiviert sind","prefTranscript": "Transkription standardmäßig einschalten","prefHighlight": "Transkription hervorheben, während das Medium abgespielt wird","prefTabbable": "Transkription per Tastatur ein-/ausschaltbar machen","prefSuccess": "Ihre Änderungen wurden gespeichert.","prefNoChange": "Es gab keine Änderungen zu speichern.","help": "Hilfe", "helpTitle": "Hilfe","helpKeys": "Der Media-Player in dieser Webseite kann mit Hilfe der folgenden Tasten direkt bedient werden:","helpKeysDisclaimer": "Beachten Sie, dass die Tastenkürzel (Umschalt-, Alt- und Strg-Tastenkombinationen) in den Einstellungen zugewiesen werden können. Falls gewisse Tastenkürzel nicht funktionieren (weil sie bereits vom Browser oder anderen Applikationen verwendet werden), empfehlen wir, andere Tastenkombinationen auszuprobieren.","save": "Speichern","cancel": "Abbrechen","ok": "Ok", "done": "Fertig", "closeButtonLabel": "Schließen", "windowButtonLabel": "Fenster Manipulationen","windowMove": "Verschieben", "windowMoveAlert": "Fenster mit Pfeiltasten oder Maus verschieben; beenden mit Eingabetaste","windowResize": "Größe verändern", "windowResizeHeading": "Größe des Gebärdensprache-Fenster","windowResizeAlert": "Die Größe wurde angepasst.","width": "Breite","height": "Höhe","windowSendBack": "In den Hintergrund verschieben", "windowSendBackAlert": "Dieses Fenster ist jetzt im Hintergrund und wird von anderen Fenstern verdeckt.","windowBringTop": "In den Vordergrund holen","windowBringTopAlert": "Dieses Fenster ist jetzt im Vordergrund."}; 
var en = {
  
"playerHeading": "Media player",

"faster": "Faster",

"slower": "Slower",

"play": "Play", 

"pause": "Pause",

"stop": "Stop",

"rewind": "Rewind",

"forward": "Forward",

"captions": "Captions",

"showCaptions": "Show captions",

"hideCaptions": "Hide captions",

"captionsOff": "Captions off",

"showTranscript": "Show transcript",

"hideTranscript": "Hide transcript", 

"turnOnDescriptions": "Turn on descriptions", 

"turnOffDescriptions": "Turn off descriptions", 

"chapters": "Chapters",

"language": "Language",

"sign": "Sign language",

"showSign": "Show sign language",

"hideSign": "Hide sign language",

"mute": "Mute",

"unmute": "Unmute",

"volume": "Volume", 

"volumeUp": "Volume up",

"volumeDown": "Volume down",

"preferences": "Preferences",

"enterFullScreen": "Enter full screen",

"exitFullScreen": "Exit full screen",

"fullScreen": "Full screen",

"speed": "Speed",

"or": "or", 

"spacebar": "spacebar",

"autoScroll": "Auto scroll",

"unknown": "Unknown", 

"statusPlaying": "Playing",

"statusPaused": "Paused",

"statusStopped": "Stopped",

"statusWaiting": "Waiting",

"statusBuffering": "Buffering",

"statusUsingDesc": "Using described version",

"statusLoadingDesc": "Loading described version",

"statusUsingNoDesc": "Using non-described version",

"statusLoadingNoDesc": "Loading non-described version",

"statusLoadingNext": "Loading next track",

"statusEnd": "End of track",

"selectedTrack": "Selected Track",

"alertDescribedVersion": "Using the audio described version of this video",

"fallbackError1": "Sorry, your browser is unable to play this",

"fallbackError2": "The following browsers are known to work with this media player",

"orHigher": "or higher",

"prefTitle": "Preferences",

"prefIntro": "Saving your preferences requires cookies.",

"prefFeatures": "Features",

"prefKeys": "Modifier keys used for shortcuts (see help)",

"prefAltKey": "Alt",

"prefCtrlKey": "Control",

"prefShiftKey": "Shift",

"prefCaptions": "Closed captions on by default",

"prefSignLanguage": "Show sign language if available",

"prefDesc": "Description on by default",

"prefClosedDesc": "Use text-based description if available",

"prefDescPause": "Automatically pause video when text-based description starts",

"prefVisibleDesc": "If using text-based description,make it visible",

"prefTranscript": "Transcript on by default",

"prefHighlight": "Highlight transcript as media plays",

"prefTabbable": "Keyboard-enable transcript",

"prefSuccess": "Your changes have been saved.",

"prefNoChange": "You didn't make any changes.",

"help": "Help",

"helpTitle": "Help",

"helpKeys": "The media player on this web page can be operated from anywhere on the page using the following keystrokes:",

"helpKeysDisclaimer": "Note that modifier keys (Shift, Alt, and Control) can be assigned within Preferences. Some shortcut key combinations might conflict with keys used by your browser and/or other software applications. Try various combinations of modifier keys to find one that works for you.",

"save": "Save",

"cancel": "Cancel",

"ok": "ok", 

"done": "Done",

"closeButtonLabel": "Close dialog",

"windowButtonLabel": "Window options",

"windowMove": "Move", 

"windowMoveAlert": "Drag or use arrow keys to move the window; Enter to stop",

"windowResize": "Resize", 

"windowResizeHeading": "Resize Interpreter Window",

"windowResizeAlert": "The window has been resized.",

"width": "Width",

"height": "Height",

"windowSendBack": "Send to back", 

"windowSendBackAlert": "This window is now behind other objects on the page.",

"windowBringTop": "Bring to front",

"windowBringTopAlert": "This window is now in front of other objects on the page."

};

var es = {
  
"playerHeading": "Media player",

"faster": "Rápido",

"slower": "Lento",

"play": "Play", 

"pause": "Pausa",

"stop": "Detener",

"rewind": "Rebobinar",

"forward": "Adelantar",

"captions": "Subtítulos",

"showCaptions": "Mostrar subtítulos",

"hideCaptions": "Ocultar subtítulos",

"captionsOff": "Quitar subtítulos",

"showTranscript": "Mostrar transcripción",

"hideTranscript": "Ocultar transcripción", 

"turnOnDescriptions": "Habilitar descripciones", 

"turnOffDescriptions": "Deshabilitar descripciones", 

"chapters": "Capítulos",

"language": "Idioma",

"sign": "Lengua de señas",

"showSign": "Mostrar lengua de señas",

"hideSign": "Ocultar lengua de señas",

"mute": "Silenciar",

"unmute": "Reactivar sonido",

"volume": "Volumen", 

"volumeUp": "Subir volumen",

"volumeDown": "Bajar volumen",

"preferences": "Preferencias",

"enterFullScreen": "Ver a pantalla completa",

"exitFullScreen": "Salir de pantalla completa",

"fullScreen": "Pantalla completa",

"speed": "Velocidad",

"or": "o", 

"spacebar": "Barra espaciadora",

"autoScroll": "Desplazamiento automático",

"unknown": "Desconocido", 

"statusPlaying": "Reproduciendo",

"statusPaused": "Pausado",

"statusStopped": "Detenido",

"statusWaiting": "Esperando",

"statusBuffering": "Almacenando",

"statusUsingDesc": "Utilizando versión descrita",

"statusLoadingDesc": "Cargando versión descrita",

"statusUsingNoDesc": "Utilizando versión no descrita",

"statusLoadingNoDesc": "Cargando versión no descrita",

"statusLoadingNext": "Cargando la siguiente pista",

"statusEnd": "Fin de pista",

"selectedTrack": "Pista seleccionada",

"alertDescribedVersion": "Utilizando la versión audiodescrita del vídeo",

"fallbackError1": "Lo sentimos, su navegador no puede reproducir esto",

"fallbackError2": "Los siguientes navegadores se sabe pueden trabajar con este reproductor",

"orHigher": "o superior",

"prefTitle": "Preferencias",

"prefIntro": "Guardar sus preferencias requiere el uso de cookies.",

"prefFeatures": "Características",

"prefKeys": "Teclas modificadoras",

"prefAltKey": "Alt",

"prefCtrlKey": "Control",

"prefShiftKey": "Mayúscula",

"prefCaptions": "Subtítulos habilitados por defecto",

"prefSignLanguage": "Mostrar lengua de señas si está disponible",

"prefDesc": "Habilitar descripción por defecto",

"prefClosedDesc": "Utilizar descripciones en texto si están disponibles",

"prefDescPause": "Pausar automáticamente el video cuando arranque una descripción en texto",

"prefVisibleDesc": "Hacer visibles las descripciones en texto si se están usando",

"prefTranscript": "Habilitar transcripción por defecto",

"prefHighlight": "Resaltar la transcripción según avanza el contenido",

"prefTabbable": "Transcripción manejable por teclado",

"prefSuccess": "Los cambios han sido guardados.",

"prefNoChange": "No se ha hecho ningún cambio.",

"help": "Ayuda",

"helpTitle": "Ayuda",

"helpKeys": "El reproductor en esta página pude ser manejado desde cualquier parte de la pa´gina utilizando los siguientes atajos de teclado:",

"helpKeysDisclaimer": "Tengan en cuenta que las teclas modificadoras (Mayúsculas, Alt, y Control) pueden ser asignadas en las preferencias. Algunas combinaaciones de atajos de teclado pueden entrar en conflicto con teclas utilizadas por su navegador y/o otras aplicaciones. Pruebe varias combinaciones de teclas modificadoras hasta encontrar la que funcione en su caso.",

"save": "Guardar",

"cancel": "Cancelar",

"ok": "ok", 

"done": "Hecho",

"closeButtonLabel": "Cerrar cuadro de diálogo",

"windowButtonLabel": "Opciones en Windows",

"windowMove": "Mover", 

"windowMoveAlert": "Arrastre o use las teclas de flecha para mover la ventana, pulse Enter para parar.",

"windowResize": "Redimensionar", 

"windowResizeHeading": "Redimensionar la ventana con el intérprete",

"windowResizeAlert": "La ventana ha sido redimensionada.",

"width": "Ancho",

"height": "Alto",

"windowSendBack": "Enviar atrás", 

"windowSendBackAlert": "Esta ventana no se encuentra tras otros objetos en la página.",

"windowBringTop": "Traer al frente",

"windowBringTopAlert": "Esta ventan está ahora en el frente de otros objetos en la página."

};

var nl = {
  
"playerHeading": "Mediaspeler",

"faster": "Sneller",

"slower": "Langzamer",

"play": "Afspelen", 

"pause": "Pauzeren",

"stop": "Stoppen",

"rewind": "Terug",

"forward": "Verder",

"captions": "Ondertiteling",

"showCaptions": "Toon ondertiteling",

"hideCaptions": "Verberg ondertiteling",

"captionsOff": "Ondertiteling uit",

"showTranscript": "Toon transcript",

"hideTranscript": "Vergerg transcript", 

"turnOnDescriptions": "Beschrijvingen aanzetten", 

"turnOffDescriptions": "Beschrijvingen uitzetten", 

"chapters": "Hoofdstukken",

"language": "Taal",

"sign": "Gebarentaal",

"showSign": "Toon gebarentaal",

"hideSign": "Verberg gebarentaal",

"mute": "Dempen",

"unmute": "Dempen uit",

"volume": "Volume", 

"volumeUp": "Volume hoger",

"volumeDown": "Volume lager",

"preferences": "Voorkeuren",

"enterFullScreen": "Ga naar volledig scherm",

"exitFullScreen": "Verlaat volledig scherm",

"fullScreen": "Volledig scherm",

"speed": "Snelheid",

"audio": "audio",

"video": "video",

"or": "of", 

"spacebar": "spatietoets",

"autoScroll": "Auto scroll",

"unknown": "Onbekend", 

"statusPlaying": "Aan het spelen",

"statusPaused": "Gepauzeerd",

"statusStopped": "Gestopt",

"statusWaiting": "Aan het wachten",

"statusBuffering": "Aan het bufferen",

"statusUsingDesc": "Versie met beschrijving wordt gebruikt",

"statusLoadingDesc": "Versie met beschrijving wordt geladen",

"statusUsingNoDesc": "Versie zonder beschrijving wordt gebruikt",

"statusLoadingNoDesc": "Versie zonder beschrijving wordt geladen",

"statusLoadingNext": "Volgende track wordt geladen",

"statusEnd": "Einde van track",

"selectedTrack": "Geselecteerde Track",

"alertDescribedVersion": "Versie met audiobeschrijving wordt gebruikt",

"fallbackError1": "Sorry, je browser kan dit mediabestand niet afspelen",

"fallbackError2": "De volgende browsers kunnen met deze mediaspeler overweg:",

"orHigher": "of hoger",

"prefTitle": "Voorkeuren",

"prefIntro": "Om je voorkeuren op te slaan moet je cookies toestaan",

"prefFeatures": "Kenmerken",

"prefKeys": "Aangepaste toetsen",

"prefAltKey": "Alt",

"prefCtrlKey": "Control",

"prefShiftKey": "Shift",

"prefCaptions": "Ondertiteling standaard aan",

"prefSignLanguage": "Toon gebarentaal als deze beschikbaar is",

"prefDesc": "Beschrijving standaard aan",

"prefClosedDesc": "Gebruik tekst-gebaseerde beschrijving als deze beschikbaar is",

"prefDescPause": "Pauzeer video automatisch als tekst-gebaseerde beschrijving aan wordt gezet",

"prefVisibleDesc": "Als er een tekst-gebaseerde beschrijving is, maak deze dan zichtbaar",

"prefTranscript": "Transcript standaard aan",

"prefHighlight": "Transcript highlighten terwijl media speelt",

"prefTabbable": "Maak transcript bedienbaar met toetsenbord",

"prefSuccess": "Je wijzigingen zijn opgeslagen.",

"prefNoChange": "Je hebt geen wijzigingen gemaakt.",

"help": "Help",

"helpTitle": "Help",

"helpKeys": "De mediaspeler op deze pagina kan van elke locatie op de pagina bediend worden met de volgende toetsenbordaanslagen:",

"helpKeysDisclaimer": "De toetsen om te bewerken (Shift, Alt, and Control) kunnen bij Voorkeuren ingesteld worden. Sommige combinaties conflicteren misschien met andere instellingen van uw computer of browser. Probeer een aantal combinaties tot je iets hebt gevonden dat werkt.",

"save": "Opslaan",

"cancel": "Annuleren",

"ok": "ok", 

"done": "Klaar",

"closeButtonLabel": "Sluit venster",

"windowButtonLabel": "Venster instellingen",

"windowMove": "Verplaats", 

"windowMoveAlert": "Versleep of gebruik de pijltjestoetsen om te verplaatsen. Druk op Enter om te stoppen.",

"windowResize": "Verkleinen of vergroten", 

"windowResizeHeading": "Verander grootte van scherm met gebarentolk",

"windowResizeAlert": "Het venster is van grootte veranderd.",

"width": "Breedte",

"height": "Hoogte",

"windowSendBack": "Verplaats naar achteren", 

"windowSendBackAlert": "Het scherm staat nu achter andere objecten op deze pagina.",

"windowBringTop": "Verplaats naar voren",

"windowBringTopAlert": "Het scherm staat nu voor andere objecten op deze pagina."

};

// end getTranslationText function, which began in translation1.js     

    this.tt = eval(this.lang);
    
    // resolve deferred variable
    gettingText.resolve();  
    return gettingText.promise(); 
  };
})(jQuery);
