(function ($) {
	AblePlayer.prototype.seekTo = function (newTime) {

		// define variables to be used for analytics
		// e.g., to measure the extent to which users seek back and forward
		this.seekFromTime = this.media.currentTime;
		this.seekToTime = newTime;

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
		else if (this.player === 'youtube') {
			this.youTubePlayer.seekTo(newTime,true);
			if (newTime > 0) {
				if (typeof this.$posterImg !== 'undefined') {
					this.$posterImg.hide();
				}
			}
		}
		else if (this.player === 'vimeo') {
			this.vimeoPlayer.setCurrentTime(newTime).then(function() {
				// seek finished.
				// could do something here
				// successful completion also fires a 'seeked' event (see event.js)
			})
		}
		this.refreshControls('timeline');
	};

	AblePlayer.prototype.getMediaTimes = function (duration, elapsed) {

		 // Returns an array with keys 'duration' and 'elapsed'
		 // Vars passed to this function come courtesy of select Vimeo events
		 // Use those if they're available.
		 // Otherwise, will need to call the relevant media API
		 // This function should only be called from onMediaUpdateTime()
		 // If duration and elapsed are needed other times, use this.duration and this.elapsed

		// both values are expressed in seconds, and all player APIs are similar:
		// they return a value that is rounded to the nearest second before playback begins,
		// then to the nearest thousandth of a second after playback begins
		// With HTML5 media API, some browsers are more precise (e.g., Firefox rounds to 6 decimal points)
		// but inconsistent (values with 9 decimal points have been sporadically observed in Safari)
		// For standardization, values are rounded to 6 decimal points before they're returned

		var deferred, promise, thisObj, mediaTimes;
		mediaTimes = {};

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (typeof duration !== 'undefined' && typeof elapsed !== 'undefined') {
			mediaTimes['duration'] = duration;
			mediaTimes['elapsed'] = elapsed;
			deferred.resolve(mediaTimes);
		}
		else {
			this.getDuration().then(function(duration) {
				mediaTimes['duration'] = thisObj.roundDown(duration,6);
				thisObj.getElapsed().then(function(elapsed) {
					mediaTimes['elapsed'] = thisObj.roundDown(elapsed,6);
					deferred.resolve(mediaTimes);
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.getDuration = function () {

		// returns duration of the current media, expressed in seconds
		// function is called by getMediaTimes, and return value is sanitized there

		var deferred, promise, thisObj;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				 this.vimeoPlayer.getDuration().then(function(duration) {
					if (duration === undefined || isNaN(duration) || duration === -1) {
						deferred.resolve(0);
					}
					else {
						deferred.resolve(duration);
					}
				});
			}
			else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		}
		else {
			var duration;
			if (this.player === 'html5') {
				duration = this.media.duration;
			}
			else if (this.player === 'youtube') {
				if (this.youTubePlayer) {
					duration = this.youTubePlayer.getDuration();
				}
				else { // the YouTube player hasn't initialized yet
					duration = 0;
				}
			}
			if (duration === undefined || isNaN(duration) || duration === -1) {
				deferred.resolve(0);
			}
			else {
				deferred.resolve(duration);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getElapsed = function () {

		// returns elapsed time of the current media, expressed in seconds
		// function is called by getMediaTimes, and return value is sanitized there

		var deferred, promise, thisObj;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				this.vimeoPlayer.getCurrentTime().then(function(elapsed) {
					if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
						deferred.resolve(0);
					}
					else {
						deferred.resolve(elapsed);
					}
				});
			}
			else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		}
		else {
			var elapsed;
			if (this.player === 'html5') {
				elapsed = this.media.currentTime;
			}
			else if (this.player === 'youtube') {
				if (this.youTubePlayer) {
					elapsed = this.youTubePlayer.getCurrentTime();
				}
				else { // the YouTube player hasn't initialized yet
					elapsed = 0;
				}
			}
			if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
				deferred.resolve(0);
			}
			else {
				deferred.resolve(elapsed);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getPlayerState = function () {

		// Returns one of the following states:
		//	'stopped' - Not yet played for the first time, or otherwise reset to unplayed.
		//	'ended' - Finished playing.
		//	'paused' - Not playing, but not stopped or ended.
		//	'buffering' - Momentarily paused to load, but will resume once data is loaded.
		//	'playing' - Currently playing.

		// Commented out the following in 3.2.1 - not sure of its intended purpose
		// It can be useful to know player state even when swapping src
		// and the overhead is seemingly minimal
		/*
		if (this.swappingSrc) {
			return;
		}
		*/

		var deferred, promise, thisObj, duration, elapsed;
		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'html5') {
			if (this.media.ended) {
				deferred.resolve('ended');
			}
			else if (this.media.paused) {
				deferred.resolve('paused');
			}
			else if (this.media.readyState !== 4) {
				deferred.resolve('buffering');
			}
			else {
				deferred.resolve('playing');
			}
		}
		else if (this.player === 'youtube' && this.youTubePlayer) {
			var state = this.youTubePlayer.getPlayerState();
			if (state === -1 || state === 5) {
				deferred.resolve('stopped');
			}
			else if (state === 0) {
				deferred.resolve('ended');
			}
			else if (state === 1) {
				deferred.resolve('playing');
			}
			else if (state === 2) {
				deferred.resolve('paused');
			}
			else if (state === 3) {
				deferred.resolve('buffering');
			}
		}
		else if (this.player === 'vimeo' && this.vimeoPlayer) {
				// curiously, Vimeo's API has no getPlaying(), getBuffering(), or getState() methods
			// so maybe if it's neither paused nor ended, it must be playing???
			this.vimeoPlayer.getPaused().then(function(paused) {
				if (paused) {
					deferred.resolve('paused');
				}
				else {
					thisObj.vimeoPlayer.getEnded().then(function(ended) {
						if (ended) {
							deferred.resolve('ended');
						}
						else {
							deferred.resolve('playing');
						}
					});
				}
			});
		}
		return promise;
	};

	AblePlayer.prototype.isPlaybackRateSupported = function () {

		if (this.player === 'html5') {
			if (this.media.playbackRate) {
				return true;
			}
			else {
				return false;
			}
		}
		else if (this.player === 'youtube') {
			// Youtube supports varying playback rates per video.	 Only expose controls if more than one playback rate is available.
			if (this.youTubePlayer.getAvailablePlaybackRates().length > 1) {
				return true;
			}
			else {
				return false;
			}
		}
		else if (this.player === 'vimeo') {
			// since this takes longer to determine, it was set previous in initVimeoPlayer()
			return this.vimeoSupportsPlaybackRateChange;
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
		else if (this.player === 'vimeo') {
			this.vimeoPlayer.setPlaybackRate(rate);
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
		else if (this.player === 'youtube') {
			return this.youTubePlayer.getPlaybackRate();
		}
	};

	AblePlayer.prototype.isPaused = function () {

		 // Note there are three player states that count as paused in this sense,
		// and one of them is named 'paused'.
		// A better name would be 'isCurrentlyNotPlayingOrBuffering'

		var state;

		if (this.player === 'vimeo') {
			// just rely on value of this.playing
			if (this.playing) {
				return false;
			}
			else {
				return true;
			}
		}
		else {
			this.getPlayerState().then(function(state) {
				// if any of the following is true, consider the media 'paused'
				return state === 'paused' || state === 'stopped' || state === 'ended';
			});
		}
	};

	AblePlayer.prototype.pauseMedia = function () {

		var thisObj = this;

		if (this.player === 'html5') {
			this.media.pause(true);
			if (this.hasSignLanguage && this.signVideo) {
				this.signVideo.pause(true);
			}
		}
		else if (this.player === 'youtube') {
			this.youTubePlayer.pauseVideo();
		}
		else if (this.player === 'vimeo') {
			this.vimeoPlayer.pause();
		}
	};

	AblePlayer.prototype.playMedia = function () {

		var thisObj = this;

		if (this.player === 'html5') {
			this.media.play(true);
			if (this.hasSignLanguage && this.signVideo) {
				this.signVideo.play(true);
			}
		}
		else if (this.player === 'youtube') {
			this.youTubePlayer.playVideo();
			if (typeof this.$posterImg !== 'undefined') {
				this.$posterImg.hide();
			}
			this.stoppingYouTube = false;
		}
		else if (this.player === 'vimeo') {
			 this.vimeoPlayer.play();
		}
		this.startedPlaying = true;
		if (this.hideControls) {
			// wait briefly after playback begins, then hide controls
			this.hidingControls = true;
			this.invokeHideControlsTimeout();
		}
	};

	AblePlayer.prototype.fadeControls = function(direction) {

		// Visibly fade controls without hiding them from screen reader users

		// direction is either 'out' or 'in'

		// TODO: This still needs work.
		// After the player fades, it's replaced by an empty space
		// Would be better if the video and captions expanded to fill the void
		// Attempted to fade out to 0 opacity, then move the playerDiv offscreen
		// and expand the mediaContainer to fill the vacated space
		// However, my attempts to do this have been choppy and buggy
		// Code is preserved below and commented out

		var thisObj, mediaHeight, playerHeight, newMediaHeight;
		var thisObj = this;

		if (direction == 'out') {
			// get the original height of two key components:
			mediaHeight = this.$mediaContainer.height();
			playerHeight = this.$playerDiv.height();
			newMediaHeight = mediaHeight + playerHeight;

			// fade slowly to transparency
			this.$playerDiv.fadeTo(2000,0,function() {
				/*
				// when finished, position playerDiv offscreen
				// thisObj.$playerDiv.addClass('able-offscreen');
				// Expand the height of mediaContainer to fill the void (needs work)
				thisObj.$mediaContainer.animate({
					height: newMediaHeight
				},500);
				*/
			});
		}
		else if (direction == 'in') {
			// restore vidcapContainer to its original height (needs work)
			// this.$mediaContainer.removeAttr('style');
			// fade relatively quickly back to its original position with full opacity
			// this.$playerDiv.removeClass('able-offscreen').fadeTo(100,1);
			this.$playerDiv.fadeTo(100,1);
		}
	};

	AblePlayer.prototype.invokeHideControlsTimeout = function () {

		// invoke timeout for waiting a few seconds after a mouse move or key down
		// before hiding controls again
		var thisObj = this;
		this.hideControlsTimeout = window.setTimeout(function() {
			if (typeof thisObj.playing !== 'undefined' && thisObj.playing === true && thisObj.hideControls) {
				thisObj.fadeControls('out');
				thisObj.controlsHidden = true;
			}
		},5000);
		this.hideControlsTimeoutStatus = 'active';
	};

	AblePlayer.prototype.refreshControls = function(context, duration, elapsed) {

		// context is one of the following:
		// 'init' - initial build (or subsequent change that requires full rebuild)
		// 'timeline' - a change may effect time-related controls
		// 'captions' - a change may effect caption-related controls
		// 'descriptions' - a change may effect description-related controls
		// 'transcript' - a change may effect the transcript window or button
		// 'fullscreen' - a change has been triggered by full screen toggle
		// 'playpause' - a change triggered by either a 'play' or 'pause' event

		// NOTE: context is not currently supported.
		// The steps in this function have too many complex interdependencies
		// The gains in efficiency are offset by the possibility of introducing bugs
		// For now, executing everything
		context = 'init';

		// duration and elapsed are passed from callback functions of Vimeo API events
		// duration is expressed as sss.xxx
		// elapsed is expressed as sss.xxx

		var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
			updateLive, textByState, timestamp, widthUsed,
			leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
			buffered, newTop, statusBarHeight, speedHeight, statusBarWidthBreakpoint,
			newSvgData;

		thisObj = this;
		if (this.swappingSrc) {
			// wait until new source has loaded before refreshing controls
			return;
		}

		if (context === 'timeline' || context === 'init') {
			// all timeline-related functionality requires both duration and elapsed
			if (typeof this.duration === 'undefined') {
			 	// wait until duration is known before proceeding with refresh
			 	return;
			}
			if (this.useChapterTimes) {
				this.chapterDuration = this.getChapterDuration();
				this.chapterElapsed = this.getChapterElapsed();
			}

			if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && this.duration > 0) {
				// couldn't calculate seekInterval previously; try again.
				this.setSeekInterval();
			}

			if (this.seekBar) {
				if (this.useChapterTimes) {
					lastChapterIndex = this.selectedChapters.cues.length-1;
					if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
						// this is the last chapter
						if (this.currentChapter.end !== this.duration) {
							// chapter ends before or after video ends
							// need to adjust seekbar duration to match video end
							this.seekBar.setDuration(this.duration - this.currentChapter.start);
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
					if (!(this.duration === undefined || isNaN(this.duration) || this.duration === -1)) {
						this.seekBar.setDuration(this.duration);
					}
				}
				if (!(this.seekBar.tracking)) {
					// Only update the aria live region if we have an update pending
					// (from a seek button control) or if the seekBar has focus.
					// We use document.activeElement instead of $(':focus') due to a strange bug:
					// 	When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
					updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
					this.liveUpdatePending = false;
					if (this.useChapterTimes) {
						this.seekBar.setPosition(this.chapterElapsed, updateLive);
					}
					else {
						this.seekBar.setPosition(this.elapsed, updateLive);
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
						displayElapsed = this.elapsed;
					}
				}
			}
			// update elapsed & duration
			if (typeof this.$durationContainer !== 'undefined') {
				if (this.useChapterTimes) {
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
				}
				else {
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.duration));
				}
			}
			if (typeof this.$elapsedTimeContainer !== 'undefined') {
				this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
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
				if (this.fullscreen) {
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

			// Update buffering progress.
			// TODO: Currently only using the first HTML5 buffered interval,
			// but this fails sometimes when buffering is split into two or more intervals.
			if (this.player === 'html5') {
				if (this.media.buffered.length > 0) {
					buffered = this.media.buffered.end(0);
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
			else if (this.player === 'youtube') {
				if (this.seekBar) {
					this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
				}
			}
			else if (this.player === 'vimeo') {
				// TODO: Add support for Vimeo buffering update
			}
		} // end if context == 'timeline' or 'init'

		if (context === 'descriptions' || context == 'init'){

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
		}

		if (context === 'captions' || context == 'init'){

			if (this.$ccButton) {

				captionsCount = this.captions.length;

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
						'aria-controls': this.mediaId + '-captions-menu',
						'aria-expanded': 'false'
					});
					this.$ccButton.find('span.able-clipped').text(this.tt.captions);
				}
			}
		}

		if (context === 'fullscreen' || context == 'init'){

			if (this.$fullscreenButton) {
				if (!this.fullscreen) {
					this.$fullscreenButton.attr('aria-label', this.tt.enterFullScreen);
					if (this.iconType === 'font') {
						this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
						this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullScreen);
					}
					else if (this.iconType === 'svg') {
						newSvgData = this.getSvgData('fullscreen-expand');
						this.$fullscreenButton.find('svg').attr('viewBox',newSvgData[0]);
						this.$fullscreenButton.find('path').attr('d',newSvgData[1]);
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
						newSvgData = this.getSvgData('fullscreen-collapse');
						this.$fullscreenButton.find('svg').attr('viewBox',newSvgData[0]);
						this.$fullscreenButton.find('path').attr('d',newSvgData[1]);
					}
					else {
						this.$fullscreenButton.find('img').attr('src',this.fullscreenCollapseButtonImg);
					}
				}
			}
		}

		if (context === 'playpause' || context == 'init'){
			if (typeof this.$bigPlayButton !== 'undefined' && typeof this.seekBar !== 'undefined') {
				// Choose show/hide for big play button and adjust position.
				if (this.paused && !this.seekBar.tracking) {
					if (!this.hideBigPlayButton) {
						this.$bigPlayButton.show();
					}
					if (this.fullscreen) {
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
		}

		if (context === 'transcript' || context == 'init'){

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
		}

		if (context === 'init') {

			if (this.$chaptersButton) {
				this.$chaptersButton.attr({
					'aria-label': this.tt.chapters,
					'aria-haspopup': 'true',
					'aria-controls': this.mediaId + '-chapters-menu',
					'aria-expanded': 'false'
				});
			}
		}

		if (context === 'timeline' || context === 'playpause' || context === 'init') {

			// update status
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
						newSvgData = this.getSvgData('play');
						this.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
						this.$playpauseButton.find('path').attr('d',newSvgData[1]);
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
					this.getPlayerState().then(function(currentState) {
						if (thisObj.$status.text() !== textByState[currentState] && !thisObj.seekBar.tracking) {
							// Debounce updates; only update after status has stayed steadily different for 250ms.
							timestamp = (new Date()).getTime();
							if (!thisObj.statusDebounceStart) {
								thisObj.statusDebounceStart = timestamp;
								// Make sure refreshControls gets called again at the appropriate time to check.
								thisObj.statusTimeout = setTimeout(function () {
									thisObj.refreshControls(context);
								}, 300);
							}
							else if ((timestamp - thisObj.statusDebounceStart) > 250) {
								thisObj.$status.text(textByState[currentState]);
								thisObj.statusDebounceStart = null;
								clearTimeout(thisObj.statusTimeout);
								thisObj.statusTimeout = null;
							}
						}
						else {
							thisObj.statusDebounceStart = null;
							clearTimeout(thisObj.statusTimeout);
							thisObj.statusTimeout = null;
						}

						// Don't change play/pause button display while using the seek bar (or if YouTube stopped)
						if (!thisObj.seekBar.tracking && !thisObj.stoppingYouTube) {
							if (currentState === 'paused' || currentState === 'stopped') {
								thisObj.$playpauseButton.attr('aria-label',thisObj.tt.play);

								if (thisObj.iconType === 'font') {
									thisObj.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
									thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.play);
								}
								else if (thisObj.iconType === 'svg') {
									newSvgData = thisObj.getSvgData('play');
									thisObj.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
									thisObj.$playpauseButton.find('path').attr('d',newSvgData[1]);
								}
								else {
									thisObj.$playpauseButton.find('img').attr('src',thisObj.playButtonImg);
								}
							}
							else {
								thisObj.$playpauseButton.attr('aria-label',thisObj.tt.pause);

								if (thisObj.iconType === 'font') {
									thisObj.$playpauseButton.find('span').first().removeClass('icon-play').addClass('icon-pause');
									thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.pause);
								}
								else if (thisObj.iconType === 'svg') {
									newSvgData = thisObj.getSvgData('pause');
									thisObj.$playpauseButton.find('svg').attr('viewBox',newSvgData[0]);
									thisObj.$playpauseButton.find('path').attr('d',newSvgData[1]);
								}
								else {
									thisObj.$playpauseButton.find('img').attr('src',thisObj.pauseButtonImg);
								}
							}
						}
					});
				}
			}
		}

		// Show/hide status bar content conditionally
		if (!this.fullscreen) {
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

		if (this.paused) {
			this.playMedia();
		}
		else {
			this.pauseMedia();
		}
	};

	AblePlayer.prototype.handleRestart = function() {

		this.seekTo(0);
	};

	AblePlayer.prototype.handleRewind = function() {

		var targetTime;

		targetTime = this.elapsed - this.seekInterval;
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

		var targetTime, lastChapterIndex;

		lastChapterIndex = this.chapters.length-1;
		targetTime = this.elapsed + this.seekInterval;

		if (this.useChapterTimes) {
			if (this.chapters[lastChapterIndex] == this.currentChapter) {
				// this is the last chapter
				if (targetTime > this.duration || targetTime > this.currentChapter.end) {
					// targetTime would exceed the end of the video (or chapter)
					// scrub to end of whichever is earliest
					targetTime = Math.min(this.duration, this.currentChapter.end);
				}
				else if (this.duration % targetTime < this.seekInterval) {
					// nothing left but pocket change after seeking to targetTime
					// go ahead and seek to end of video (or chapter), whichever is earliest
					targetTime = Math.min(this.duration, this.currentChapter.end);
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
			if (targetTime > this.duration) {
				targetTime = this.duration;
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

		var rates, currentRate, index, newRate, vimeoMin, vimeoMax;

		if (this.player === 'html5') {
			this.setPlaybackRate(this.getPlaybackRate() + (0.25 * dir));
		}
		else if (this.player === 'youtube') {
			rates = this.youTubePlayer.getAvailablePlaybackRates();
			currentRate = this.getPlaybackRate();
			index = rates.indexOf(currentRate);
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
		else if (this.player === 'vimeo') {
			// range is 0.5 to 2
			// increase/decrease in inrements of 0.5
			vimeoMin = 0.5;
			vimeoMax = 2;
			if (dir === 1) {
				if (this.vimeoPlaybackRate + 0.5 <= vimeoMax) {
					newRate = this.vimeoPlaybackRate + 0.5;
				}
				else {
					newRate = vimeoMax;
				}
			}
			else if (dir === -1) {
				if (this.vimeoPlaybackRate - 0.5 >= vimeoMin) {
					newRate = this.vimeoPlaybackRate - 0.5;
				}
				else {
					newRate = vimeoMin;
				}
			}
			this.setPlaybackRate(newRate);
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
			this.refreshControls('captions');
		}
		else {
			// there is more than one caption track.
			// clicking on a track is handled via caption.js > getCaptionClickFunction()
			if (this.captionsPopup && this.captionsPopup.is(':visible')) {
				this.captionsPopup.hide();
				this.hidingPopup = false;
				this.$ccButton.attr('aria-expanded','false').focus();
			}
			else {
				this.closePopups();
				if (this.captionsPopup) {
					this.captionsPopup.show();
					this.$ccButton.attr('aria-expanded','true');
					this.captionsPopup.css('top', this.$ccButton.position().top - this.captionsPopup.outerHeight());
					this.captionsPopup.css('left', this.$ccButton.position().left)
					// Place focus on the first button (even if another button is checked)
					this.captionsPopup.find('li').removeClass('able-focus');
					this.captionsPopup.find('li').first().focus().addClass('able-focus');
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
			this.$chaptersButton.attr('aria-expanded','false').focus();
		}
		else {
			this.closePopups();
			this.chaptersPopup.show();
			this.$chaptersButton.attr('aria-expanded','true');
			this.chaptersPopup.css('top', this.$chaptersButton.position().top - this.chaptersPopup.outerHeight());
			this.chaptersPopup.css('left', this.$chaptersButton.position().left)

			// Highlight the current chapter, if any chapters are checked
			// Otherwise, place focus on the first chapter
			this.chaptersPopup.find('li').removeClass('able-focus');
			if (this.chaptersPopup.find('li[aria-checked="true"]').length) {
				this.chaptersPopup.find('li[aria-checked="true"]').focus().addClass('able-focus');
			}
			else {
				this.chaptersPopup.find('li').first().addClass('able-focus').attr('aria-checked','true').focus();
			}
		}
	};

	AblePlayer.prototype.handleDescriptionToggle = function() {
		this.descOn = !this.descOn;
		this.prefDesc = + this.descOn; // convert boolean to integer
		this.updateCookie('prefDesc');
		this.refreshingDesc = true;
		this.initDescription();
		this.refreshControls('descriptions');
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
			this.$prefsButton.attr('aria-expanded','false').focus();
			// restore each menu item to original hidden state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
		}
		else {
			this.closePopups();
			this.prefsPopup.show();
			this.$prefsButton.attr('aria-expanded','true');
			prefsButtonPosition = this.$prefsButton.position();
			prefsMenuRight = this.$ableDiv.width() - 5;
			prefsMenuLeft = prefsMenuRight - this.prefsPopup.width();
			this.prefsPopup.css('top', prefsButtonPosition.top - this.prefsPopup.outerHeight());
			this.prefsPopup.css('left', prefsMenuLeft);
			// remove prior focus and set focus on first item; also change tabindex from -1 to 0
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','0');
			this.prefsPopup.find('li').first().focus().addClass('able-focus');
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
			this.$transcriptButton.focus().addClass('able-focus');
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
			this.$signButton.focus().addClass('able-focus');
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

		// NOTE: This has been largely replaced as of 3.2.5 with a Boolean this.fullscreen,
		// which is defined in setFullscreen()
		// This function returns true if *any* element is fullscreen
		// but doesn't tell us whether a particular element is in fullscreen
		// (e.g., if there are multiple players on the page)
		// The Boolean this.fullscreen is defined separately for each player instance

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

		if (this.fullscreen == fullscreen) {
			// replace isFullscreen() with a Boolean. see function for explanation
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
				this.fullscreen = true;
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
				this.fullscreen = false;
			}
			// add event handlers for changes in full screen mode
			// currently most changes are made in response to windowResize event
			// However, that alone is not resulting in a properly restored player size in Opera Mac
			// More on the Opera Mac bug: https://github.com/ableplayer/ableplayer/issues/162
			// this fullscreen event handler added specifically for Opera Mac,
			// but includes event listeners for all browsers in case its functionality could be expanded
			// Added functionality in 2.3.45 for handling YouTube return from fullscreen as well
			$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function(e) {
				// NOTE: e.type = the specific event that fired (in case needing to control for browser-specific idiosyncrasies)
				if (!thisObj.fullscreen) {
					// user has just exited full screen
					thisObj.restoringAfterFullScreen = true;
					thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
				}
				else if (!thisObj.clickedFullscreenButton) {
					// user triggered fullscreenchange without clicking (or pressing) fullscreen button
					// this is only possible if they pressed Escape to exit fullscreen mode
					thisObj.fullscreen = false;
					thisObj.restoringAfterFullScreen = true;
					thisObj.resizePlayer(thisObj.preFullScreenWidth,thisObj.preFullScreenHeight);
				}
				// NOTE: The fullscreenchange (or browser-equivalent) event is triggered twice
				// when exiting fullscreen via the "Exit fullscreen" button (only once if using Escape)
				// Not sure why, but consequently we need to be sure thisObj.clickedFullScreenButton
				// continues to be true through both events
				// Could use a counter variable to control that (reset to false after the 2nd trigger)
				// However, since I don't know why it's happening, and whether it's 100% reliable
				// resetting clickedFullScreenButton after a timeout seems to be better approach
				setTimeout(function() {
					thisObj.clickedFullscreenButton = false;
				},1000);
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
			var wasPaused = this.paused;

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

			// Resume playback if moving stopped it.
			if (!wasPaused && this.paused) {
				this.playMedia();
			}
		}
		this.refreshControls('fullscreen');
	};

	AblePlayer.prototype.handleFullscreenToggle = function () {

		var stillPaused = this.paused;
		this.setFullscreen(!this.fullscreen);
		if (stillPaused) {
			this.pauseMedia(); // when toggling fullscreen and media is just paused, keep media paused.
		}
		else if (!stillPaused) {
			this.playMedia(); // when toggling fullscreen and media is playing, continue playing.
		}
		// automatically hide controller in fullscreen mode
		// then reset back to original setting after exiting fullscreen mode
		if (this.fullscreen) {
			this.hideControls = true;
			if (this.playing) {
				// go ahead and hide the controls
				this.fadeControls('out');
				this.controlsHidden = true;
			}
		}
		else {
			// exit fullscreen mode
			this.hideControls = this.hideControlsOriginal;
			if (!this.hideControls) { // do not hide controls
				if (this.controlsHidden) {
					this.fadeControls('in');
					this.controlsHidden = false;
				}
				// if there's an active timeout to fade controls out again, clear it
				if (this.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(this.hideControlsTimeout);
					this.hideControlsTimeoutStatus = 'clear';
				}
			}
		}
	};

	AblePlayer.prototype.handleTranscriptLockToggle = function (val) {

		this.autoScrollTranscript = val; // val is boolean
		this.prefAutoScrollTranscript = +val; // convert boolean to numeric 1 or 0 for cookie
		this.updateCookie('prefAutoScrollTranscript');
		this.refreshControls('transcript');
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
		// 'screenreader (visibly hidden)
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
		$alertBox.text(msg).show();
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

		var captionSizeOkMin, captionSizeOkMax, captionSize, newCaptionSize, newLineHeight;

		if (this.fullscreen) { // replace isFullscreen() with a Boolean. see function for explanation
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

		// resize YouTube
		if (this.player === 'youtube' && this.youTubePlayer) {
			this.youTubePlayer.setSize(width, height);
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
		this.refreshControls('captions');
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

		// exclude the Able Player dialogs and windows
		$elements = $('body *').not('.able-modal-dialog,.able-modal-dialog *,.able-modal-overlay,.able-modal-overlay *,.able-sign-window,.able-transcript-area');

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
		var defHighZ, defLowZ, highestZ, transcriptZ, signZ, newHighZ, newLowZ;

		// set the default z-indexes, as defined in ableplayer.css
		defHighZ = 8000; // by default, assigned to the sign window
		defLowZ = 7000; // by default, assigned to the transcript area
		highestZ = this.getHighestZIndex(); // highest z-index on the page, excluding Able Player windows & modals

		// NOTE: Although highestZ is collected here, it currently isn't used.
		// If something on the page has a higher z-index than the transcript or sign window, do we care?
		// Excluding it here assumes "No". Our immediate concern is with the relationship between our own components.
		// If we elevate our z-indexes so our content is on top, we run the risk of starting a z-index war.

		if (typeof this.$transcriptArea === 'undefined' || typeof this.$signWindow === 'undefined' ) {
			// at least one of the windows doesn't exist, so there's no conflict
			// since z-index may have been stored to a cookie on another page, need to restore default
			if (typeof this.$transcriptArea !== 'undefined') {
				transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
				if (transcriptZ > defLowZ) {
					// restore to the default
					this.$transcriptArea.css('z-index',defLowZ);
				}
			}
			else if (typeof this.$signWindow !== 'undefined') {
				signZ = parseInt(this.$signWindow.css('z-index'));
				if (signZ > defHighZ) {
					// restore to the default
					this.$signWindow.css('z-index',defHighZ);
				}
			}
			return false;
		}

		// both windows exist

		// get current values
		transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
		signZ = parseInt(this.$signWindow.css('z-index'));

		if (transcriptZ === signZ) {
			// the two windows are equal; restore defaults (the target window will be on top)
			newHighZ = defHighZ;
			newLowZ = defLowZ;
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
				// sign is already on top; nothing to do
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
			// the following was commented out in Oct/Nov 2018.
			// chapters popup is setup automatically when setupPopups() is called later with no param
			// not sure why it was included here.
			// this.setupPopups('chapters');
		}
		else if (source === 'transcript') {
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
		}
		this.updateTranscript();
	};

})(jQuery);
