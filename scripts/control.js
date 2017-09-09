(function ($) {
  AblePlayer.prototype.seekTo = function (newTime) {

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
      if (typeof this.$posterImg !== 'undefined') {
        this.$posterImg.hide();
      }
      this.stoppingYouTube = false;
    }
    this.startedPlaying = true;
  };

  AblePlayer.prototype.refreshControls = function() {

    var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
      updateLive, textByState, timestamp, widthUsed,
      leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
      buffered, newTop, svgLink, newSvgLink,
      statusBarHeight, speedHeight, statusBarWidthBreakpoint;

    thisObj = this;
    if (this.swappingSrc) {
      // wait until new source has loaded before refreshing controls
      return;
    }

    duration = this.getDuration();
    elapsed = this.getElapsed();

    if (this.useChapterTimes) {
      this.chapterDuration = this.getChapterDuration();
      this.chapterElapsed = this.getChapterElapsed();
    }

    if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && duration > 0) {
      // couldn't calculate seekInterval previously; try again.
      this.setSeekInterval();
    }

    if (this.seekBar) {

      if (this.useChapterTimes) {
        lastChapterIndex = this.selectedChapters.cues.length-1;
        if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
          // this is the last chapter
          if (this.currentChapter.end !== duration) {
            // chapter ends before or after video ends
            // need to adjust seekbar duration to match video end
            this.seekBar.setDuration(duration - this.currentChapter.start);
          }
          else {
            this.seekBar.setDuration(this.chapterDuration);
          }
        }
        else {
          // this is not the last chapter
          this.seekBar.setDuration(this.chapterDuration);
        }
      }
      else {
        this.seekBar.setDuration(duration);
      }
      if (!(this.seekBar.tracking)) {
        // Only update the aria live region if we have an update pending (from a
        // seek button control) or if the seekBar has focus.
        // We use document.activeElement instead of $(':focus') due to a strange bug:
        //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
        updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
        this.liveUpdatePending = false;
        if (this.useChapterTimes) {
          this.seekBar.setPosition(this.chapterElapsed, updateLive);
        }
        else {
          this.seekBar.setPosition(elapsed, updateLive);
        }
      }

      // When seeking, display the seek bar time instead of the actual elapsed time.
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
      this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
    }
    else {
      this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(duration));
    }
    this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));

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
          // TODO: Add play/pause toggle for SVG
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
              // Not currently working. SVG is a work in progress
              this.$playpauseButton.find('svg').removeClass('svg-pause').addClass('svg-play');
              svgLink = this.$playpauseButton.find('use').attr('xlink:href');
              newSvgLink = svgLink.replace('svg-pause','svg-play');
              this.$playpauseButton.find('use').attr(newSvgLink);
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
            else if (this.iconType === 'svg') {
              // Not currently working. SVG is a work in progress
              this.$playpauseButton.find('svg').removeClass('svg-play').addClass('svg-pause');
              svgLink = this.$playpauseButton.find('use').attr('xlink:href');
              newSvgLink = svgLink.replace('svg-play','svg-pause');
              this.$playpauseButton.find('use').attr(newSvgLink);
              this.$playpauseButton.find('span.able-clipped').text(this.tt.pause);
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
    if (this.seekBar) {
      widthUsed = 0;
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
        seekbarWidth = this.$ableWrapper.width() - widthUsed - seekbarSpacer;
      }
      // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
      if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
        this.seekBar.setWidth(seekbarWidth);
      }
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
          // Not currently working. SVG is a work in progress.
          this.$fullscreenButton.find('svg').removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
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
        else if (this.iconType === 'svg') {
          // Not currently working. SVG is a work in progress.
          this.$fullscreenButton.find('svg').removeClass('icon-fullscreen-expand').addClass('icon-fullscreen-collapse');
          this.$fullscreenButton.find('span.able-clipped').text(this.tt.exitFullScreen);
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
      }
      else {
        this.$bigPlayButton.hide();
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
      if (this.autoScrollTranscript && this.currentHighlight) {
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
          if (this.seekBar) {
            this.seekBar.setBuffered(buffered / this.chapterDuration);
          }
        }
        else {
          if (this.seekBar) {
            this.seekBar.setBuffered(buffered / duration);
          }
        }
      }
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      if (this.seekBar) {
        this.seekBar.setBuffered(this.jwPlayer.getBuffer() / 100);
      }
    }
    else if (this.player === 'youtube') {
      if (this.seekBar) {
        this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
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

    elapsed = this.getElapsed();
    targetTime = elapsed - this.seekInterval;
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

    elapsed = this.getElapsed();
    duration = this.getDuration();
    lastChapterIndex = this.chapters.length-1;
    targetTime = elapsed + this.seekInterval;

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
    this.prefDesc = + this.descOn; // convert boolean to integer
    this.updateCookie('prefDesc');
    this.refreshingDesc = true;
    this.initDescription();
    this.refreshControls();
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
    }
    else {
      this.closePopups();
      this.prefsPopup.show();
      prefsButtonPosition = this.$prefsButton.position();
      prefsMenuRight = this.$ableDiv.width() - 5;
      prefsMenuLeft = prefsMenuRight - this.prefsPopup.width();
      this.prefsPopup.css('top', prefsButtonPosition.top - this.prefsPopup.outerHeight());
      this.prefsPopup.css('left', prefsMenuLeft);
      // remove prior focus and set focus on first item
      this.prefsPopup.find('li').removeClass('able-focus');
      this.prefsPopup.find('input').first().focus().parent().addClass('able-focus');
    }
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
      this.prefTranscript = 0;
    }
    else {
      this.positionDraggableWindow('transcript');
      this.$transcriptArea.show();
      this.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.tt.hideTranscript);
      this.$transcriptButton.find('span.able-clipped').text(this.tt.hideTranscript);
      this.prefTranscript = 1;
    }
    this.updateCookie('prefTranscript');
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
      }
      // add event handlers for changes in full screen mode
      // currently most changes are made in response to windowResize event
      // However, that alone is not resulting in a properly restored player size in Opera Mac
      // More on the Opera Mac bug: https://github.com/ableplayer/ableplayer/issues/162
      // this fullscreen event handler added specifically for Opera Mac,
      // but includes event listeners for all browsers in case its functionality could be expanded
      // Added functionality in 2.3.45 for handling YouTube return from fullscreen as well
      $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function() {
        if (!thisObj.isFullscreen()) {
          // user has just exited full screen
          thisObj.restoringAfterFullScreen = true;
          thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
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
        })
        this.$vidcapContainer.css({
          'height': height + 'px',
          'width': width
        });
        this.$media.css({
          'height': height + 'px',
          'width': width
        })
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
  };

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

    if (transcriptZ === signZ) {
      // the two windows are equal; move the target window the top
      newHighZ = transcriptZ + 1000;
      newLowZ = transcriptZ;
    }
    else if (transcriptZ > signZ) {
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
      this.$transcriptArea.css('z-index',newHighZ);
      this.$signWindow.css('z-index',newLowZ);
    }
    else if (which === 'sign') {
      this.$signWindow.css('z-index',newHighZ);
      this.$transcriptArea.css('z-index',newLowZ);
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

})(jQuery);
