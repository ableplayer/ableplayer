/* 
  // JavaScript for Able Player 
  
  // HTML5 Media API: 
  // http://www.w3.org/TR/html5/embedded-content-0.html#htmlmediaelement
  // http://dev.w3.org/html5/spec-author-view/video.html

  // W3C API Test Page: 
  // http://www.w3.org/2010/05/video/mediaevents.html
  
  // Uses JW Player as fallback 
  // JW Player configuration options: 
  // http://www.longtailvideo.com/support/jw-player/28839/embedding-the-player
  // (NOTE: some options are not documented, e.g., volume) 
  // JW Player API reference: 
  // http://www.longtailvideo.com/support/jw-player/28851/javascript-api-reference

  // YouTube Player API for iframe Embeds 
  https://developers.google.com/youtube/iframe_api_reference  
*/

/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */
/*global $, jQuery */
"use strict";

(function () {
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

    if ($(media).data('youtube-id') !== undefined && $(media).data('youtube-id') !== "") { 
      this.youtubeId = $(media).data('youtube-id'); 
    }

    if ($(media).data('debug') !== undefined && $(media).data('debug') !== "false") { 
      this.debug = true; 
    }

    if ($(media).data('youtube-id') !== undefined && $(media).data('youtube-id') !== "") { 
      // add validation 
      this.youtubeId = $(media).data('youtube-id'); 
    }

    if ($(media).data('volume') !== undefined && $(media).data('volume') !== "") { 
      // add validation 
      this.defaultVolume = $(media).data('volume'); 
    }
    
    if ($(media).data('icon-type') !== undefined && $(media).data('icon-type') !== "") { 
      // add validation 
      this.iconType = $(media).data('icon-type'); 
    }
    
    if ($(media).data('seek-interval') !== undefined && $(media).data('seek-interval') !== "") { 
      // add validation 
      this.seekInterval = $(media).data('seek-interval'); 
    }
console.log('seekInterval is ' + this.seekInterval);    
    
    if ($(media).data('show-now-playing') !== undefined && $(media).data('show-now-playing') !== "false") { 
      this.showNowPlaying = true; 
    }
    
    if ($(media).data('fallback') !== undefined && $(media).data('fallback') !== "") { 
      // add validation 
      this.fallback = $(media).data('fallback'); 
    }
    
    if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== "false") { 
      this.testFallback = true; 
    }
    
    if ($(media).data('lang') !== undefined && $(media).data('lang') !== "") { 
      this.lang = $(media).data('lang'); 
    }
    
    if ($(media).data('lang-override') !== undefined && $(media).data('lang-override') !== "false") { 
      this.langOverride = true; 
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
      console.log('Will start media at ' + startTime + ' seconds');
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
})();














































