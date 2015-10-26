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
