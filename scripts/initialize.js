(function ($) {
  // Set default variable values.
  AblePlayer.prototype.setDefaults = function () {

    // Debug - set to true to write messages to console; otherwise false
    this.debug = false;
    
    // Path to root directory of referring website 
    this.rootPath = this.getRootWebSitePath();

    // Volume range is 0 to 10. Don't crank it to avoid overpowering screen readers
    this.defaultVolume = 7;
    this.volume = this.defaultVolume;

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

    // useChaptersButton - on by default if there's a track with kind="chapters"
    // However, if chapters is written to an external div via data-chapters-div 
    // it might be desirable for the chapters to always be ON, with no toggle 
    // This can be overridden with data-chapters-button="false" 
    this.useChaptersButton = true; 
    
    this.playing = false; // will change to true after 'playing' event is triggered

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
    
    // NOTE: volume button images are now set dynamically within volume.js 
  
    this.imgPath = '../images/' + this.iconColor + '/';
    
    this.playButtonImg = this.imgPath + 'play.png';
    this.pauseButtonImg = this.imgPath + 'pause.png';
    this.rewindButtonImg = this.imgPath + 'rewind.png';
    this.forwardButtonImg = this.imgPath + 'forward.png';
    this.fasterButtonImg = this.imgPath + 'slower.png';
    this.slowerButtonImg = this.imgPath + 'faster.png';
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

    var thisObj, prefsGroups, i; 
    thisObj = this;

    // TODO: Ensure when recreating player that we carry over the mediaId
    if (!this.player) {
      console.log("Can't create player; no appropriate player type detected.");
      return;
    }

    this.setMediaAttributes();

    this.loadCurrentPreferences();
    
    this.injectPlayerCode();
    this.initSignLanguage();
    this.setupTracks().then(function() {
      
      thisObj.setupAltCaptions().then(function() {  
        thisObj.setupPopups();
        thisObj.initDescription();
        thisObj.initializing = false;
        thisObj.initPlayer();
        thisObj.initDefaultCaption(); 

        // inject each of the hidden forms that will be accessed from the Preferences popup menu
        prefsGroups = thisObj.getPreferencesGroups(); 
        for (i in prefsGroups) { 
          thisObj.injectPrefsForm(prefsGroups[i]);        
        }
        
        thisObj.updateCaption();
        thisObj.updateTranscript(); 
        thisObj.showSearchResults();      
        if (thisObj.defaultChapter) { 
          thisObj.seekToDefaultChapter(); 
        }        
      });
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
      thisObj.initializing = false; // well, which is it??? 
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
