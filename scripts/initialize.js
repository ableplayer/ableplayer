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
