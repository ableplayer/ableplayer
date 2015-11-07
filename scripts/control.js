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
    var stillPaused = this.isPaused();
    this.setFullscreen(!this.isFullscreen());
    if (stillPaused) {
      this.pauseMedia();
    }
    else if (!stillPaused) {
      this.playMedia();
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
