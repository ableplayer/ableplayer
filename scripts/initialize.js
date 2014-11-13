(function () {
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
  
    // Browsers that don't support seekbar sliders will use rewind and forward buttons 
    // seekInterval = Number of seconds to seek forward or back with these buttons    
    // NOTE: Unless user overrides this default with data-seek-interval attribute, 
    // this value is replaced by 1/10 the duration of the media file, once the duration is known 
    this.seekInterval = 10;

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
  
    // testFallback - set to true to force browser to use the fallback player (for testing)
    // Note: JW Player does not support offline playback (a Flash restriction)
    // Therefore testing must be performed on a web server 
    this.testFallback = false;
    
    // loop - if true, will start again at top after last item in playlist has ended
    // NOTE: This is not fully supported yet - needs work 
    this.loop = true; 
  
    // lang - default language of the player
    this.lang = 'en'; 
  
    // langOverride - set to true to reset this.lang to language of the web page, if detectable  
    // set to false to force player to use this.lang
    this.langOverride = true;
    
    // translationPath - specify path to translation files 
    this.translationPath = '../translations/';

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
      thisObj.setupTooltips();
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
      thisObj.initializing = false;
      thisObj.refreshControls();

      // After done messing with the player, this is necessary to fix playback on iOS
      if (thisObj.player === 'html5' && thisObj.isIOS()) {
        thisObj.$media[0].load();
      }

      if (this.useFixedSeekInterval === false) { 
        // 10 steps in seek interval; wait until the end so that we can fetch a duration.
        thisObj.seekInterval = Math.max(10, thisObj.getDuration() / 10);
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
    var thisObj = this;
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    // attempt to load jwplayer script
    // TODO: Allow dynamically setting thirdparty folder.
    $.getScript('../thirdparty/jwplayer.js') 
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
        var sources = [];
        $.each(thisObj.$sources, function (ii, source) {
          sources.push({file: $(source).attr('src')});      
        });

        if (thisObj.mediaType === 'video') { 
          thisObj.jwPlayer = jwplayer(thisObj.jwId).setup({
            playlist: [{
              sources: sources
            }],
            // TODO: allow dynamically setting thirdparty folder
            flashplayer: '../thirdparty/jwplayer.flash.swf',
            html5player: '../thirdparty/jwplayer.html5.js',
            image: thisObj.$media.attr('poster'), 
            controls: false,
            volume: thisObj.defaultVolume * 100,
            height: thisObj.playerHeight,
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
            flashplayer: '../thirdparty/jwplayer.flash.swf',
            html5player: '../thirdparty/jwplayer.html5.js',
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

      thisObj.youtubePlayer = new YT.Player(containerId, {
        videoId: thisObj.youtubeId,
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

    // Keep native player from displaying subtitles.
    var textTracks = this.$media.get(0).textTracks;
    // textTracks is not supported in all browsers, but these browsers also do not automatically display captions.
    if (textTracks) {
      var ii = 0;
      while (ii < textTracks.length) {
        textTracks[ii].mode = 'disabled';
        ii += 1;
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
             (this.isIOS() && !this.isIOS(7))) {
      // the user wants to test the fallback player, or  
      // the user is using IE9, which has buggy implementation of HTML5 video 
      // e.g., plays only a few seconds of MP4 than stops and resets to 0
      // even in native HTML player with no JavaScript 
      // Couldn't figure out a solution to this problem - IE10 fixes it. Meanwhile, use JW for IE9 video 
      if (this.fallback === 'jw') {            
        if (this.$sources.length > 0) { // this media has one or more <source> elements
          for (i = 0; i < this.$sources.length; i++) { 
            sourceType = this.$sources[i].getAttribute('type'); 
            //if ((this.mediaType === 'video' && sourceType === 'video/mp4') || 
            //  (this.mediaType === 'audio' && sourceType === 'audio/mpeg')) { 
            // JW Player can play this 
            return 'jw';
            //}
          }
        }
        else if (this.$playlist.length > 0) { 
          // see if the first item in the playlist is a type JW player an play 
          $newItem = this.$playlist.eq(0);
          // check data-* attributes for a type JW can play  
          if (this.mediaType === 'audio') { 
            if ($newItem.attr('data-mp3')) { 
              return 'jw';
            }
          }
          else if (this.mediaType === 'video') {
            if ($newItem.attr('data-mp4')) { 
              return 'jw';
            }
          }
        }
        else { 
          // there is no source, nor playlist 
          return null;
        }
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

})();
