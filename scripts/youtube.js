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
