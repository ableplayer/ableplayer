import $ from 'jquery';
import DOMPurify from 'dompurify';

function addControlFunctions(AblePlayer) {

	AblePlayer.prototype.seekTo = function (newTime) {

		var thisObj = this;

		// define variables to be used for analytics
		// e.g., to measure the extent to which users seek back and forward
		this.seekFromTime = this.media.currentTime;
		this.seekToTime = newTime;

		this.seeking = true;
		this.liveUpdatePending = true;

		if (this.speakingDescription) {
			this.synth.cancel();
		}

		this.syncSignVideo( {'time' : this.startTime } );

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
				this.seekStatus = 'complete';
				this.syncSignVideo( { 'time' : this.startTime } );
			}
		} else if (this.player === 'youtube') {
			this.youTubePlayer.seekTo(newTime,true);
			if (newTime > 0) {
				if (typeof this.$posterImg !== 'undefined') {
					this.$posterImg.hide();
				}
			}
			this.syncSignVideo( {'time' : newTime } );
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.setCurrentTime(newTime).then(function() {
				// seek finished.
				// successful completion also fires a 'seeked' event (see event.js)
				thisObj.elapsed = newTime;
				thisObj.refreshControls('timeline');
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

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		if (typeof duration !== 'undefined' && typeof elapsed !== 'undefined') {
			mediaTimes['duration'] = duration;
			mediaTimes['elapsed'] = elapsed;
			deferred.resolve(mediaTimes);
		} else {
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
		var deferred, promise;

		deferred = new this.defer();
		promise = deferred.promise();

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				 this.vimeoPlayer.getDuration().then(function(duration) {
					if (duration === undefined || isNaN(duration) || duration === -1) {
						deferred.resolve(0);
					} else {
						deferred.resolve(duration);
					}
				});
			} else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		} else {
			var duration;
			if (this.player === 'html5') {
				duration = this.media.duration;
			} else if (this.player === 'youtube') {
				if (this.youTubePlayerReady) {
					if (this.duration > 0) {
						// duration was already retrieved while checking for captions
						duration = this.duration;
					} else {
						duration = this.youTubePlayer.getDuration();
					}
				} else { // the YouTube player hasn't initialized yet
					duration = 0;
				}
			}
			if (duration === undefined || isNaN(duration) || duration === -1) {
				deferred.resolve(0);
			} else {
				deferred.resolve(duration);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getElapsed = function () {

		// returns elapsed time of the current media, expressed in seconds
		// function is called by getMediaTimes, and return value is sanitized there

		var deferred, promise;

		deferred = new this.defer();
		promise = deferred.promise();

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				this.vimeoPlayer.getCurrentTime().then(function(elapsed) {
					if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
						deferred.resolve(0);
					} else {
						deferred.resolve(elapsed);
					}
				});
			} else { // vimeoPlayer hasn't been initialized yet.
				deferred.resolve(0);
			}
		} else {
			var elapsed;
			if (this.player === 'html5') {
				elapsed = this.media.currentTime;
			} else if (this.player === 'youtube') {
				if (this.youTubePlayerReady) {
					elapsed = this.youTubePlayer.getCurrentTime();
				} else { // the YouTube player hasn't initialized yet
					elapsed = 0;
				}
			}
			if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
				deferred.resolve(0);
			} else {
				deferred.resolve(elapsed);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getPlayerState = function () {

		// Returns one of the following states:
		// - 'stopped' - Not yet played for the first time, or otherwise reset to unplayed.
		// - 'ended' - Finished playing.
		// - 'paused' - Not playing, but not stopped or ended.
		// - 'buffering' - Momentarily paused to load, but will resume once data is loaded.
		// - 'playing' - Currently playing.

		var deferred, promise, thisObj;
		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'html5') {
			if (this.media.ended) {
				deferred.resolve('ended');
			} else if (this.media.paused) {
				deferred.resolve('paused');
			} else if (this.media.readyState !== 4) {
				deferred.resolve('buffering');
			} else {
				deferred.resolve('playing');
			}
		} else if (this.player === 'youtube' && this.youTubePlayerReady) {
			var state = this.youTubePlayer.getPlayerState();
			if (state === -1 || state === 5) {
				deferred.resolve('stopped');
			} else if (state === 0) {
				deferred.resolve('ended');
			} else if (state === 1) {
				deferred.resolve('playing');
			} else if (state === 2) {
				deferred.resolve('paused');
			} else if (state === 3) {
				deferred.resolve('buffering');
			}
		} else if (this.player === 'vimeo' && this.vimeoPlayer) {
				// curiously, Vimeo's API has no getPlaying(), getBuffering(), or getState() methods
			// so maybe if it's neither paused nor ended, it must be playing???
			this.vimeoPlayer.getPaused().then(function(paused) {
				if (paused) {
					deferred.resolve('paused');
				} else {
					thisObj.vimeoPlayer.getEnded().then(function(ended) {
						if (ended) {
							deferred.resolve('ended');
						} else {
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
			return (this.media.playbackRate) ? true : false;
		} else if (this.player === 'youtube') {
			// Youtube supports varying playback rates per video.
			// Only expose controls if more than one playback rate is available.
			if (this.youTubePlayerReady) {
				return (this.youTubePlayer.getAvailablePlaybackRates().length > 1) ? true : false;
			} else {
				return false;
			}
		} else if (this.player === 'vimeo') {
			// since this takes longer to determine, it was set previously in initVimeoPlayer()
			return this.vimeoSupportsPlaybackRateChange;
		}
	};

	AblePlayer.prototype.setPlaybackRate = function (rate) {

		rate = Math.max(0.5, rate);

		if (this.hasClosedDesc && this.descMethod === 'text') {
			// keep speech rate in sync with playback rate even if descOn is false
			this.syncSpeechToPlaybackRate(rate);
		}

		this.syncSignVideo( {'rate' : rate } );

		if (this.player === 'html5') {
			this.media.playbackRate = rate;
		} else if (this.player === 'youtube') {
			this.youTubePlayer.setPlaybackRate(rate);
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.setPlaybackRate(rate);
		}
		this.syncSignVideo( { 'rate' : rate } );
		this.playbackRate = rate;
		this.$speed.text( this.translate( 'speed', 'Speed' ) + ': ' + rate.toFixed(2).toString() + 'x');
	};

	AblePlayer.prototype.getPlaybackRate = function () {

		if (this.player === 'html5') {
			return this.media.playbackRate;
		} else if (this.player === 'youtube' && (this.youTubePlayerReady)) {
			return this.youTubePlayer.getPlaybackRate();
		}
	};

	AblePlayer.prototype.isPaused = function () {

		// Note there are three player states that count as paused in this sense,
		// and one of them is named 'paused'.
		// A better name would be 'isCurrentlyNotPlayingOrBuffering'

		if (this.player === 'vimeo') {
			// just rely on value of this.playing
			return (this.playing) ? false : true;
		} else {
			this.getPlayerState().then(function(state) {
				// if any of the following is true, consider the media 'paused'
				return state === 'paused' || state === 'stopped' || state === 'ended';
			});
		}
	};

	AblePlayer.prototype.syncSignVideo = function(options) {
		if (this.hasSignLanguage && ( this.signVideo || this.signYoutube ) ) {
			if (options && typeof options.time !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.currentTime = options.time;
				} else {
					this.youTubeSignPlayer.seekTo(options.time,true);
				}
			}
			if (options && typeof options.rate !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.playbackRate = options.rate;
				} else {
					this.youTubeSignPlayer.setPlaybackRate(options.rate);
				}
			}
			if (options && typeof options.pause !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.pause(true);
				} else {
					this.youTubeSignPlayer.pauseVideo();
				}
			}
			if (options && typeof options.play !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.play(true);
				} else {
					this.youTubeSignPlayer.playVideo();
				}
			}
			if (options && typeof options.volume !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.volume = 0;
				}
			}
		}
	};

	AblePlayer.prototype.pauseMedia = function () {

		this.syncSignVideo( { 'pause' : true } );

		if (this.player === 'html5') {
			this.media.pause(true);
		} else if (this.player === 'youtube') {
			this.youTubePlayer.pauseVideo();
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.pause();
		}
	};

	AblePlayer.prototype.playMedia = function () {

		this.syncSignVideo( { 'play' : true } );

		if (this.player === 'html5') {
			this.media.play(true);
		} else if (this.player === 'youtube') {

			this.youTubePlayer.playVideo();
			if (typeof this.$posterImg !== 'undefined') {
				this.$posterImg.hide();
			}
			this.stoppingYouTube = false;
		} else if (this.player === 'vimeo') {
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

		// After the player fades, it's replaced by an empty space
		// Would be better if the video and captions expanded to fill the void
		// replace JS animation with CSS animation in 12/2025.

		if (direction == 'out') {
			// get the original height of two key components:
			this.$playerDiv.addClass( 'fade-out' ).removeClass( 'fade-in' );
		} else if (direction == 'in') {
			this.$playerDiv.addClass( 'fade-in' ).removeClass( 'fade-out' );
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

	AblePlayer.prototype.refreshControls = function(context = 'init', duration, elapsed) {

		// context is one of the following:
		// 'init' - initial build (or subsequent change that requires full rebuild)
		// 'timeline' - a change may effect time-related controls
		// 'captions' - a change may effect caption-related controls
		// 'descriptions' - a change may effect description-related controls
		// 'transcript' - a change may effect the transcript window or button
		// 'fullscreen' - a change has been triggered by full screen toggle
		// 'playpause' - a change triggered by either a 'play' or 'pause' event

		// Normalize context to a known value.
		if (['init', 'timeline', 'captions', 'descriptions', 'transcript', 'fullscreen', 'playpause'].indexOf(context) === -1) {
			context = 'init';
		}

		// duration and elapsed are passed from callback functions of Vimeo API events
		// duration is expressed as sss.xxx
		// elapsed is expressed as sss.xxx

		var thisObj, textByState, volumeStatus, timestamp,  captionsCount, newTop,	statusBarWidthBreakpoint;

		thisObj = this;
		// wait until new source has loaded before refreshing controls
		// some critical events won't fire until playback of new media starts
		if ( this.swappingSrc && this.playing ) {
			return;
		}

		if ( context === 'timeline' || context === 'init' ) {
			// Update timeline controls.
			var lastChapterIndex, displayElapsed, updateLive, widthUsed,
				leftControls, rightControls, seekbarWidth, buffered, mediaDuration;
			// all timeline-related functionality requires duration
			if (typeof this.duration === 'undefined') {
				// wait until duration is known before proceeding with refresh
				return;
			}
			if (this.useChapterTimes) {
				this.chapterDuration = this.getChapterDuration();
				this.chapterElapsed = this.getChapterElapsed();
			}

			if ( !this.useFixedSeekInterval && !this.seekIntervalCalculated && this.duration > 0) {
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
						} else {
							this.seekBar.setDuration(this.chapterDuration);
						}
					} else {
						// this is not the last chapter
						this.seekBar.setDuration(this.chapterDuration);
					}
				} else if ( !(this.duration === undefined || isNaN(this.duration) || this.duration === -1) ) {
					this.seekBar.setDuration(this.duration);
				}
				if (!(this.seekBar.tracking)) {
					// Only update the aria live region if we have an update pending
					// (from a seek button control) or if the seekBar has focus.
					// We use document.activeElement instead of $(':focus') due to a strange bug:
					// When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
					updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
					this.liveUpdatePending = false;
					if (this.useChapterTimes) {
						this.seekBar.setPosition(this.chapterElapsed, updateLive);
					} else {
						this.seekBar.setPosition(this.elapsed, updateLive);
					}
				}

				// When seeking, display the seek bar time instead of the actual elapsed time.
				if (this.seekBar.tracking) {
					displayElapsed = this.seekBar.lastTrackPosition;
				} else {
					displayElapsed = ( this.useChapterTimes ) ? this.chapterElapsed : this.elapsed;
				}
			}
			// update elapsed & duration
			if (typeof this.$durationContainer !== 'undefined') {
				if (this.useChapterTimes) {
					this.$durationContainer.text( this.formatSecondsAsColonTime(this.chapterDuration));
				} else {
					this.$durationContainer.text( this.formatSecondsAsColonTime(this.duration));
				}
			}
			if (typeof this.$elapsedTimeContainer !== 'undefined') {
				this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
			}

			if (this.skin === 'legacy') {
				// Update seekbar width.
				// To do this, we need to calculate the width of all buttons surrounding it.
				if (this.seekBar) {
					let controlWrapper = this.seekBar.wrapperDiv.parent().parent();
					leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
					rightControls = leftControls.next('div.able-right-controls');
					widthUsed = leftControls.outerWidth(true);
					rightControls.children().each(function () {
						if ( $(this).is('button') ) {
							widthUsed += $(this).outerWidth(true) + 5;
						}
					});
					if (this.fullscreen) {
						seekbarWidth = $(window).width() - widthUsed;
					} else {
						// seekbar is wide enough to fill the remaining space
						// include a 10px buffer to account for minor browser differences or custom styles.
						seekbarWidth = controlWrapper.width() - widthUsed - 10;
					}
					// Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
					if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
						this.seekBar.setWidth(seekbarWidth);
					}
				}
			}

			// Update buffering progress.
			// TODO: Currently only using the first HTML5 buffered interval,
			// but this fails sometimes when buffering is split into two or more intervals.
			if (this.player === 'html5' && this.media.buffered.length > 0) {
				mediaDuration = (typeof duration !== 'undefined' && !isNaN(duration) && duration > 0) ? duration : this.duration;
				buffered = this.media.buffered.end(0);
				if (this.useChapterTimes) {
					if (buffered > this.chapterDuration) {
						buffered = this.chapterDuration;
					}
					if (this.seekBar && this.chapterDuration > 0) {
						this.seekBar.setBuffered(buffered / this.chapterDuration);
					}
				} else if ( this.seekBar && !isNaN(buffered) && !isNaN(mediaDuration) && mediaDuration > 0 ) {
					this.seekBar.setBuffered(buffered / mediaDuration);
				}
			} else if (this.player === 'youtube' && this.seekBar && this.youTubePlayerReady ) {
				this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
			} else if (this.player === 'vimeo') {
				// TODO: Add support for Vimeo buffering update
			}
		}

		if (context === 'descriptions' || context == 'init') {
			if (this.$descButton) {
				this.toggleButtonState(
					this.$descButton,
					this.descOn,
					this.translate( 'turnOffDescriptions', 'Turn off descriptions' ),
					this.translate( 'turnOnDescriptions', 'Turn on descriptions' ),
				);
			}
		}

		if (context === 'captions' || context == 'init') {

			if (this.$ccButton) {

				captionsCount = this.captions.length;
				if (captionsCount > 1) {
					this.$ccButton.attr({
						'aria-haspopup': 'true',
						'aria-controls': this.mediaId + '-captions-menu'
					});
				}
				var ariaLabelOn = ( captionsCount > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'showCaptions', 'Show captions' );
				var ariaLabelOff = ( captionsCount > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'hideCaptions', 'Hide captions' );
				var ariaPressed = ( captionsCount > 1 ) ? true : false;

				this.toggleButtonState(
					this.$ccButton,
					this.captionsOn,
					ariaLabelOff,
					ariaLabelOn,
					ariaPressed
				);
			}
		}

		if (context === 'fullscreen' || context == 'init'){
			if (this.$fullscreenButton) {
				if (!this.fullscreen) {
					this.$fullscreenButton.attr( 'aria-label', this.translate( 'enterFullScreen', 'Enter full screen' ) );
					this.getIcon( this.$fullscreenButton, 'fullscreen-expand' );
				} else {
					this.$fullscreenButton.attr('aria-label', this.translate( 'exitFullScreen', 'Exit full screen' ) );
					this.getIcon( this.$fullscreenButton, 'fullscreen-collapse' );
				}
			}
		}
		if (context === 'playpause' || context == 'init'){
			if (typeof this.$bigPlayButton !== 'undefined' && typeof this.seekBar !== 'undefined') {
				// Choose show/hide for big play button and adjust position.
				if (this.paused && !this.seekBar.tracking) {
					if (!this.hideBigPlayButton) {
						this.$bigPlayButton.show();
						this.$bigPlayButton.attr('aria-hidden', 'false');
					}
				} else {
					this.$bigPlayButton.hide();
					this.$bigPlayButton.attr('aria-hidden', 'true');
				}
			}
		}

		if (context === 'transcript' || context == 'init'){

			if (this.transcriptType) {
				// Sync checkbox and autoScrollTranscript with user preference
				if (this.prefAutoScrollTranscript === 1) {
					this.autoScrollTranscript = true;
					this.$autoScrollTranscriptCheckbox.prop('checked',true);
				} else {
					this.autoScrollTranscript = false;
					this.$autoScrollTranscriptCheckbox.prop('checked',false);
				}

				// If transcript locked, scroll transcript to current highlight location.
				if (this.autoScrollTranscript && this.currentHighlight) {
					newTop = Math.floor(this.$transcriptDiv.scrollTop() +
						$(this.currentHighlight).position().top -
						(this.$transcriptDiv.height() / 2) +
						($(this.currentHighlight).height() / 2));
					if (newTop !== Math.floor(this.$transcriptDiv.scrollTop())) {
						// Set a flag to ignore the coming scroll event.
						// there's no other way I know of to differentiate programmatic and user-initiated scroll events.
						this.scrollingTranscript = true;
						// only scroll once after moving a highlight
						if (this.movingHighlight) {
							this.$transcriptDiv.scrollTop(newTop);
							this.movingHighlight = false;
						}
					}
				}
			}
		}

		if (context === 'init') {

			if (this.$chaptersButton) {
				this.$chaptersButton.attr({
					'aria-label': this.translate( 'chapters', 'Chapters' ),
					'aria-haspopup': 'true',
					'aria-controls': this.mediaId + '-chapters-menu'
				});
			}
		}

		if (context === 'timeline' || context === 'playpause' || context === 'init') {

			// update status
			textByState = {
				'stopped': this.translate( 'statusStopped', 'Stopped' ),
				'paused': this.translate( 'statusPaused', 'Paused' ),
				'playing': this.translate( 'statusPlaying', 'Playing' ),
				'buffering': this.translate( 'statusBuffering', 'Buffering' ),
				'ended': this.translate( 'statusEnd', 'End of track' )
			};

			if (this.stoppingYouTube) {
				// stoppingYouTube is true temporarily while video is paused and seeking to 0
				// See notes in handleRestart()
				// this.stoppingYouTube will be reset when seek to 0 is finished (in event.js > onMediaUpdateTime())
				if (this.$status.text() !== this.translate( 'statusStopped', 'Stopped' ) ) {
					this.$status.text( this.translate( 'statusStopped', 'Stopped' ) );
				}
				this.getIcon( this.$playpauseButton, 'play' );
			} else if (typeof this.$status !== 'undefined' && typeof this.seekBar !== 'undefined') {
				// Update the text only if it's changed since it has role="alert";
				// also don't update while tracking, since this may Pause/Play the player but we don't want to send a Pause/Play update.
				this.getPlayerState().then(function(currentState) {
					volumeStatus = thisObj.getVolume() === 0 ? thisObj.translate( 'statusMuted', 'Muted' ) : '';
					volumeStatus = (volumeStatus) ? ', ' + volumeStatus : '';
					let currentMessage = textByState[currentState] + ' ' + volumeStatus;
					if (thisObj.$status.text() !== currentMessage && !thisObj.seekBar.tracking) {
						// Debounce updates; only update after status has stayed steadily different for a while
						// "A while" is defined differently depending on context
						if (thisObj.swappingSrc) {
							// this is where most of the chatter occurs (e.g., playing, paused, buffering, playing),
							// so set a longer wait time before writing a status message
							if (!thisObj.debouncingStatus) {
								thisObj.statusMessageThreshold = 2000; // in ms (2 seconds)
							}
						} else if (!thisObj.debouncingStatus) {
							// for all other contexts (e.g., users clicks Play/Pause)
							// user should receive more rapid feedback
							thisObj.statusMessageThreshold = 250; // in ms
						}
						timestamp = (new Date()).getTime();
						if (!thisObj.statusDebounceStart) {
							thisObj.statusDebounceStart = timestamp;
							// Call refreshControls() again after allotted time has passed
							thisObj.debouncingStatus = true;
							thisObj.statusTimeout = setTimeout(function () {
								thisObj.debouncingStatus = false;
								thisObj.refreshControls(context);
							}, thisObj.statusMessageThreshold);
						} else if ((timestamp - thisObj.statusDebounceStart) > thisObj.statusMessageThreshold) {
							thisObj.$status.text(currentMessage);
							thisObj.statusDebounceStart = null;
							clearTimeout(thisObj.statusTimeout);
							thisObj.statusTimeout = null;
						}
					} else {
						thisObj.statusDebounceStart = null;
						thisObj.debouncingStatus = false;
						clearTimeout(thisObj.statusTimeout);
						thisObj.statusTimeout = null;
					}
					// Don't change play/pause button display while using the seek bar (or if YouTube stopped)
					if (!thisObj.seekBar.tracking && !thisObj.stoppingYouTube) {
						if (currentState === 'paused' || currentState === 'stopped' || currentState === 'ended') {
							thisObj.$playpauseButton.attr('aria-label', thisObj.translate( 'play', 'Play' ) );
							thisObj.getIcon( thisObj.$playpauseButton, 'play' );
						} else {
							thisObj.$playpauseButton.attr('aria-label', thisObj.translate( 'pause', 'Pause' ) );
							thisObj.getIcon( thisObj.$playpauseButton, 'pause' );
						}
					}
				});
			}
		}

		// Show/hide status bar content conditionally
		if (!this.fullscreen) {
			statusBarWidthBreakpoint = 300;
			if (this.$statusBarDiv.width() < statusBarWidthBreakpoint) {
				// Player is too small for a speed span
				this.$statusBarDiv.find('span.able-speed').hide();
				this.hidingSpeed = true;
			} else {
				if (this.hidingSpeed) {
					this.$statusBarDiv.find('span.able-speed').show();
					this.hidingSpeed = false;
				}
			}
		}

	};

	AblePlayer.prototype.handlePlay = function(e) {
		if (this.paused) {
			// user clicked play
			this.okToPlay = true;
			this.playMedia();
			if (this.synth.paused) {
				// media was paused while description was speaking
				// resume utterance
				this.synth.resume();
			}
		} else {
			// user clicked pause
			this.okToPlay = false;
			this.pauseMedia();
			if (this.speakingDescription) {
				// pause the current utterance
				// it will resume when the user presses play
				this.synth.pause();
			}
		}
		if (this.speechEnabled === null) {
			this.initSpeech('play');
		}
	};

	AblePlayer.prototype.handleRestart = function() {

		if (this.speakingDescription) {
			// cancel audio description
			this.synth.cancel();
		}
		this.seekTo(0);
	};

	AblePlayer.prototype.handlePrevTrack = function() {

		// currently on the first track
		// wrap to bottom and play the last track
		let newIndex = (this.playlistIndex === 0) ? this.$playlist.length - 1 : this.playlistIndex - 1;
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
		this.cuePlaylistItem(newIndex);
	};

	AblePlayer.prototype.handleNextTrack = function() {

		// currently on the last track
		// wrap to top and play the first track
		let newIndex = (this.playlistIndex === this.$playlist.length - 1) ? 0 : this.playlistIndex + 1;
		this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
		this.cuePlaylistItem(newIndex);
	};

	AblePlayer.prototype.handleRewind = function() {

		var targetTime;

		targetTime = this.elapsed - this.seekInterval;
		if (this.useChapterTimes && (targetTime < this.currentChapter.start)) {
			targetTime = this.currentChapter.start;
		} else if (targetTime < 0) {
			targetTime = 0;
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
				} else if (this.duration % targetTime < this.seekInterval) {
					// nothing left but pocket change after seeking to targetTime
					// go ahead and seek to end of video (or chapter), whichever is earliest
					targetTime = Math.min(this.duration, this.currentChapter.end);
				}
			} else {
				// this is not the last chapter
				if (targetTime > this.currentChapter.end) {
					// targetTime would exceed the end of the chapter
					// scrub exactly to end of chapter
					targetTime = this.currentChapter.end;
				}
			}
		} else {
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
	AblePlayer.prototype.changeRate = function (dir,change = true) {

		var rates, currentRate, index, newRate, vimeoMin, vimeoMax;

		if (this.player === 'html5') {
			if ( change ) {
				// increase or decrease by 0.25x
				this.setPlaybackRate(this.getPlaybackRate() + (0.25 * dir));
			} else {
				return this.getPlaybackRate() + (0.25 * dir);
			}
		} else if (this.player === 'youtube') {
			if (this.youTubePlayerReady) {
				rates = this.youTubePlayer.getAvailablePlaybackRates();
				currentRate = this.getPlaybackRate();
				index = rates.indexOf(currentRate);
				if (index === -1) {
					console.log('ERROR: Youtube returning unknown playback rate ' + currentRate.toString());
				} else {
					index += dir;
					// Can only increase or decrease rate if there's another rate available.
					if (index < rates.length && index >= 0) {
						if ( change ) {
							this.setPlaybackRate(rates[index]);
						} else {
							return rates[index];
						}
					}
				}
			}
		} else if (this.player === 'vimeo') {
			// range is 0.5 to 2
			// increase/decrease in inrements of 0.5
			vimeoMin = 0.5;
			vimeoMax = 2;
			if (dir === 1) {
				newRate = (this.vimeoPlaybackRate + 0.5 <= vimeoMax) ? this.vimeoPlaybackRate + 0.5 : vimeoMax;
			} else if (dir === -1) {
				newRate = (this.vimeoPlaybackRate - 0.5 >= vimeoMin) ? this.vimeoPlaybackRate - 0.5 : vimeoMin;
			}
			if ( change ) {
				this.setPlaybackRate(newRate);
			} else {
				return newRate;
			}
		}
	};

	AblePlayer.prototype.handleCaptionToggle = function() {

		var thisObj = this;
		var captions, ariaPressed;
		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}

		captions = (this.captions.length) ? this.captions : [];
		if (captions.length === 1) {
			// When there's only one set of captions, just do an on/off toggle.
			if (this.captionsOn === true) {
				// turn them off
				this.captionsOn = false;
				this.prefCaptions = 0;
				ariaPressed = false;
				this.updatePreferences('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.unloadModule('captions');
				} else if (this.usingVimeoCaptions) {
					this.vimeoPlayer.disableTextTrack();
				} else {
					this.$captionsWrapper.hide();
				}
			} else {
				// captions are off. Turn them on.
				this.captionsOn = true;
				this.prefCaptions = 1;
				ariaPressed = true;
				this.updatePreferences('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.loadModule('captions');
				} else if (this.usingVimeoCaptions) {
					this.vimeoPlayer.enableTextTrack(this.captionLang).catch(function(error) {
						switch (error.name) {
							case 'InvalidTrackLanguageError':
								// There is no text track for the specified language
								console.log(`No Vimeo text track is available in the specified language (${this.captionLang})`);
								break;
							case 'InvalidTrackError':
								// There is no such text track
								console.log('No Vimeo text track is available');
								break;
							default:
								// some other error occurred
								console.log('Error enabling Vimeo text track');
								break;
						}
					});
				} else {
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
		} else {
			// there is more than one caption track.
			// clicking on a track is handled via caption.js > getCaptionClickFunction()
			if (this.captionsPopup && this.captionsPopup.is(':visible')) {
				this.captionsPopup.hide();
				this.hidingPopup = false;
				this.$ccButton.attr('aria-expanded', 'false')
				this.waitThenFocus(this.$ccButton);
			} else {
				this.closePopups();
				if (this.captionsPopup) {
					this.captionsPopup.show();
					this.$ccButton.attr('aria-expanded','true');

					// Gives time to "register" expanded ccButton
					setTimeout(function() {
						thisObj.captionsPopup.css('top', thisObj.$ccButton.position().top - thisObj.captionsPopup.outerHeight() - 4 );
						thisObj.captionsPopup.css('left', thisObj.$ccButton.position().left)
						// Place focus on the first button (even if another button is checked)
						thisObj.captionsPopup.find('li').removeClass('able-focus');
						thisObj.captionsPopup.find('li').first().trigger('focus').addClass('able-focus');
					}, 50);
				}
			}
		}
		var ariaLabelOn = ( captions.length > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'showCaptions', 'Show captions' );
		var ariaLabelOff = ( captions.length > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'hideCaptions', 'Hide captions' );

		this.toggleButtonState(
			this.$ccButton,
			this.captionsOn,
			ariaLabelOff,
			ariaLabelOn,
			ariaPressed
		);
	};

	/**
	 * Gives enough time for DOM changes to take effect before adjusting focus.
	 * Helpful for allowing screen reading of elements whose state is intermittently changed.
	 *
	 * @param {*} $el element to focus on
	 * @param {*} timeout optional wait time in milliseconds before focus
	 */
	AblePlayer.prototype.waitThenFocus = function($el, timeout) {

		// Default wait time of 50 ms
		var _timeout = (timeout === undefined || timeout === null) ? 50 : timeout;

		setTimeout(function() {
			$el.trigger('focus');
		}, _timeout);
	}

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
			this.$chaptersButton.attr('aria-expanded','false').trigger('focus');
		} else {
			this.closePopups();
			this.chaptersPopup.show();
			this.$chaptersButton.attr('aria-expanded','true');
			this.chaptersPopup.css('top', this.$chaptersButton.position().top - this.chaptersPopup.outerHeight() - 4 );
			this.chaptersPopup.css('left', this.$chaptersButton.position().left)

			// Highlight the current chapter, if any chapters are checked
			// Otherwise, place focus on the first chapter
			this.chaptersPopup.find('li').removeClass('able-focus');
			if (this.chaptersPopup.find('li[aria-checked="true"]').length) {
				this.chaptersPopup.find('li[aria-checked="true"]').trigger('focus').addClass('able-focus');
			} else {
				this.chaptersPopup.find('li').first().addClass('able-focus').attr('aria-checked','true').trigger('focus');
			}
		}
	};

	AblePlayer.prototype.handleDescriptionToggle = function() {

		this.descOn = !this.descOn;
		this.prefDesc = + this.descOn; // convert boolean to integer
		this.updatePreferences('prefDesc');
		if (typeof this.$descDiv !== 'undefined') {
			if (!this.$descDiv.is(':hidden')) {
				this.$descDiv.hide();
			}
			// NOTE: now showing $descDiv here if previously hidden
			// that's handled elsewhere, dependent on whether there's text to show
		}
		this.initDescription();
		this.refreshControls('descriptions');
	};

	AblePlayer.prototype.handlePrefsClick = function(pref) {

		// NOTE: the prefs menu is positioned near the right edge of the player
		// This assumes the Prefs button is also positioned in that vicinity
		// (last or second-last button the right)

		// NOTE: If previously unable to fully populate the Description dialog
		// because the Web Speech API failed to getVoices()
		// now is a good time to try again
		// so the Description dialog can be rebuilt before the user requests it

		var thisObj, prefsButtonPosition, prefsMenuRight, prefsMenuLeft;

		thisObj = this;

		if (this.speechEnabled === null) {
			this.initSpeech('prefs');
		}
		if (this.hidingPopup) {
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it
			this.hidingPopup = false;
			return false;
		}
		if (this.prefsPopup.is(':visible')) {
			this.prefsPopup.hide();
			this.$prefsButton.attr('aria-expanded','false');
			// restore each menu item to original hidden state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			if (!this.showingPrefsDialog) {
				this.$prefsButton.trigger('focus');
			}
			// wait briefly, then reset hidingPopup
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		} else {
			this.closePopups();
			this.prefsPopup.show();
			this.$prefsButton.attr('aria-expanded','true');
			this.$prefsButton.trigger('focus'); // focus first on prefs button to announce expanded state
			// give time for focus on button then adjust popup settings and focus
			setTimeout(function() {
				prefsButtonPosition = thisObj.$prefsButton.position();
				prefsMenuRight = thisObj.$ableDiv.width() - 5;
				prefsMenuLeft = prefsMenuRight - thisObj.prefsPopup.width();
				thisObj.prefsPopup.css('top', prefsButtonPosition.top - thisObj.prefsPopup.outerHeight() - 4);
				thisObj.prefsPopup.css('left', prefsMenuLeft);
				// remove prior focus and set focus on first item; also change tabindex from -1 to 0
				thisObj.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','0');
				thisObj.prefsPopup.find('li').first().trigger('focus').addClass('able-focus');
			}, 50);
		}
	};

	AblePlayer.prototype.handleTranscriptToggle = function () {
		var thisObj = this;
		var visible = this.$transcriptDiv.is(':visible');
		if ( visible ) {
			this.$transcriptArea.hide();
			this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
			this.prefTranscript = 0;
			if ( this.transcriptType === 'popup' ) {
				this.$transcriptButton.trigger('focus').addClass('able-focus');
				// wait briefly before resetting stopgap var
				// otherwise the keypress used to select 'Close' will trigger the transcript button
				// Benchmark tests: If this is gonna happen, it typically happens in around 3ms; max 12ms
				// Setting timeout to 100ms is a virtual guarantee of proper functionality
				setTimeout(function() {
					thisObj.closingTranscript = false;
				}, 100);
			}
		} else {
			if ( this.transcriptType === 'popup' ) {
				this.positionDraggableWindow('transcript');
				this.$transcriptArea.show();
				// showing transcriptArea has a cascading effect of showing all content *within* transcriptArea
				// need to re-hide the popup menu
				this.$transcriptPopup.hide();
				this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
				this.prefTranscript = 1;
				// move focus to first focusable element (window options button)
				this.focusNotClick = true;
				this.$transcriptArea.find('button').first().trigger('focus');
				// wait briefly before resetting stopgap var
				setTimeout(function() {
					thisObj.focusNotClick = false;
				}, 100);
			} else {
				this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
				this.$transcriptArea.show();
			}
		}
		this.updatePreferences('prefTranscript');
	};

	AblePlayer.prototype.handleSignToggle = function () {

		var thisObj = this;
		var visible = this.$signWindow.is(':visible');
		if ( visible ) {
			this.$signWindow.hide();
			this.toggleButtonState( this.$signButton, ! visible, this.translate( 'hideSign', 'Hide sign language' ), this.translate( 'showSign', 'Show sign language' ) );
			this.prefSign = 0;
			this.$signButton.trigger('focus').addClass('able-focus');
			// wait briefly before resetting stopgap var
			// otherwise the keypress used to select 'Close' will trigger the transcript button
			setTimeout(function() {
				thisObj.closingSign = false;
			}, 100);
		} else {
			this.positionDraggableWindow('sign');
			this.$signWindow.show();
			// showing signWindow has a cascading effect of showing all content *within* signWindow
			// need to re-hide the popup menu
			this.$signPopup.hide();
			this.toggleButtonState( this.$signButton, ! visible, this.translate( 'hideSign', 'Hide sign language' ), this.translate( 'showSign', 'Show sign language' ) );
			this.prefSign = 1;
			this.focusNotClick = true;
			this.$signWindow.find('button').first().trigger('focus');
			// wait briefly before resetting stopgap var
			// otherwise the keypress used to select 'Close' will trigger the transcript button
			setTimeout(function() {
				thisObj.focusNotClick = false;
			}, 100);
		}
		this.updatePreferences('prefSign');
	};

	AblePlayer.prototype.setFullscreen = function (fullscreen) {

		if (this.fullscreen == fullscreen) {
			return;
		}
		var thisObj = this;
		var $el = this.$ableWrapper;
		var el = $el[0];

		if (this.nativeFullscreenSupported()) {
			// Note: many varying names for options for browser compatibility.
			if (fullscreen) {
				var scroll = {
					x: window.pageXOffset || 0,
					y: window.pageYOffset || 0
				}
				if (this.prefTranscript === 1) {
					// transcript is on. Go ahead and reposition it
					this.rePositionDraggableWindow("transcript");
				}
				if (this.prefSign === 1) {
					// sign is on. Go ahead and reposition it
					this.rePositionDraggableWindow("sign");
				}
				this.scrollPosition = scroll;
				// Initialize fullscreen
				if (el.requestFullscreen) {
					el.requestFullscreen();
				} else if (el.webkitRequestFullscreen) {
					el.webkitRequestFullscreen();
				}
				this.fullscreen = true;
			} else {
				// Exit fullscreen
				this.restoringAfterFullscreen = true;
				if (document.exitFullscreen) {
					document.exitFullscreen();
				} else if (document.webkitExitFullscreen) {
					document.webkitExitFullscreen();
				} else if (document.webkitCancelFullscreen) {
					document.webkitCancelFullscreen();
				}
				if (this.prefTranscript === 1) {
					// transcript is on. Go ahead and reposition it
					this.positionDraggableWindow("transcript");
				}
				if (this.prefSign === 1) {
					// sign is on. Go ahead and reposition it
					this.positionDraggableWindow("sign");
				}
				this.fullscreen = false;
			}
		} else {
			// Removed non-native fullscreen mode in 4.8, which only supported iOS.
			// Native fullscreen is on iOS 18+ devices behind a feature flag
			// The polyfill hasn't worked for years.
		}
		// add event handlers for changes in fullscreen mode.
		// Browsers natively trigger this event with the Escape key,
		// in addition to clicking the exit fullscreen button
		$(document).on('fullscreenchange webkitfullscreenchange', function(e) {
			// NOTE: e.type = the specific event that fired (in case needing to control for browser-specific idiosyncrasies)
			if (!thisObj.fullscreen) {
				// user has just exited full screen
				thisObj.restoringAfterFullscreen = true;
			} else if (!thisObj.clickedFullscreenButton) {
				// user triggered fullscreenchange without clicking fullscreen button
				thisObj.fullscreen = false;
				thisObj.restoringAfterFullscreen = true;
			}
			thisObj.resizePlayer();
			thisObj.refreshControls('fullscreen');
			// Reset scrollPosition after closing fullscreen.
			if ( thisObj.scrollPosition ) {
				scroll = thisObj.scrollPosition;
				window.scrollTo( scroll.x, scroll.y );
			}
			// NOTE: The fullscreenchange (or browser-equivalent) event is triggered twice
			// when exiting fullscreen via the "Exit fullscreen" button (only once if using Escape)
			// Not sure why, but consequently we need to be sure thisObj.clickedFullscreenButton
			// continues to be true through both events
			// Could use a counter variable to control that (reset to false after the 2nd trigger)
			// However, since I don't know why it's happening, and whether it's 100% reliable
			// resetting clickedFullscreenButton after a timeout seems to be better approach
			setTimeout(function() {
				thisObj.clickedFullscreenButton = false;
				thisObj.restoringAfterFullscreen = false;
			},100);
		});
	};

	AblePlayer.prototype.handleFullscreenToggle = function () {

		var stillPaused = this.paused;
		this.setFullscreen(!this.fullscreen);
		if (stillPaused) {
			this.pauseMedia(); // when toggling fullscreen and media is just paused, keep media paused.
		} else if (!stillPaused) {
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
		} else {
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
		// don't resizePlayer yet; that will be called in response to the window resize event
	};

	AblePlayer.prototype.handleTranscriptLockToggle = function (val) {

		this.autoScrollTranscript = val; // val is boolean
		this.prefAutoScrollTranscript = +val; // convert boolean to numeric 1 or 0 for cookie
		this.updatePreferences('prefAutoScrollTranscript');
		this.refreshControls('transcript');
	};

	AblePlayer.prototype.getIcon = function( $button, id) {
		// Remove existing HTML before generating.
		// iconData: [0 = svg viewbox, 1 = svg path]
		// Font and image icon functionality was removed in 5.0.0 in favor of SVG.
		var iconData;
		if ( Object.hasOwn( this.options, 'icons' ) && Object.hasOwn( this.options.icons, id ) ) {
			iconData = this.options.icons[id];
		} else {
			iconData = this.getIconData( id );
		}

		var existingIcon = $button.find( 'svg#ableplayer-' + id );
		// Avoid repainting icon if there's no change.
		if ( existingIcon.length > 0 ) {
			return;
		}
		$button.find('svg').remove();

		// Function to create SVG nodes.
		function getNode(n, v) {
			n = document.createElementNS("http://www.w3.org/2000/svg", n);
			for (var p in v) {
				n.setAttributeNS(null, p.replace(/[A-Z]/g, function(m) {
					return "-" + m.toLowerCase();
				}), v[p]);
			}
			return n;
		}
		var icon = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		icon.setAttribute( 'focusable', 'false' );
		icon.setAttribute( 'aria-hidden', 'true');
		icon.setAttribute( 'viewBox', iconData[0] );
		icon.setAttribute( 'id', 'ableplayer-' + id );
		let paths = iconData[1];
		paths.forEach( function( pathData ) {
			let path = getNode( 'path', { d: pathData } );
			icon.appendChild( path );
		});
		let cleanSVG = DOMPurify.sanitize(icon.outerHTML, {RETURN_DOM_FRAGMENT: true});
		icon = cleanSVG.firstChild;
		$button.append( icon );
		// Refresh the DOM.
		$button.html($button.html());
	};

	AblePlayer.prototype.setText = function( $button, text ) {
		$button.attr( 'aria-label', text );
	};

	AblePlayer.prototype.toggleButtonState = function($button, isOn, onLabel, offLabel, ariaPressed = false, ariaExpanded = false) {
		// isOn means "the feature is being turned on".
		let buttonOff = ( $button.hasClass( 'buttonOff' ) ) ? true : false;
		if ( buttonOff && ! isOn || ! buttonOff && isOn ) {
			// Only toggle state if button state does not match feature state.
			return;
		}
		if (! isOn) {
			$button.addClass('buttonOff').attr('aria-label', offLabel);
			if ( ariaPressed ) {
				$button.attr('aria-pressed', 'false');
			}
			if ( ariaExpanded ) {
				$button.attr( 'aria-expanded', 'false' );
			}
		} else {
			$button.removeClass('buttonOff').attr('aria-label', onLabel);
			if ( ariaPressed ) {
				$button.attr('aria-pressed', 'true');
			}
			if ( ariaExpanded ) {
				$button.attr( 'aria-expanded', 'true' );
			}
		}
	};

	AblePlayer.prototype.showTooltip = function($tooltip) {

		$tooltip.show();
	};

	AblePlayer.prototype.showAlert = function( msg, location = 'main' ) {

		// location is either of the following:
		// 'main' (default)
		// 'screenreader (visibly hidden)
		// 'sign' (sign language window)
		// 'transcript' (transcript window)
		var thisObj, $alertBox, $parentWindow;

		thisObj = this;
		$alertBox = thisObj.$alertBox;
		$parentWindow = thisObj.$ableDiv;
		if (location === 'transcript') {
			$parentWindow = thisObj.$transcriptArea;
		} else if (location === 'sign') {
			$parentWindow = thisObj.$signWindow;
		} else if (location === 'screenreader') {
			$alertBox = thisObj.$srAlertBox;
		}
		$alertBox.find('span').text(msg);
		$alertBox.appendTo($parentWindow)
		$alertBox.css( {'display': 'flex'} );

		if (location !== 'screenreader') {
			setTimeout( function () {
				$alertBox.hide();
			}, 30000 );
		}
	};

	AblePlayer.prototype.showedAlert = function (which) {

		// returns true if the target alert has already been shown
		// useful for throttling alerts that only need to be shown once
		// e.g., move alerts with instructions for dragging a window
		if (which === 'transcript') {
			return this.showedTranscriptAlert ?? false;
		} else if (which === 'sign') {
			return this.showedSignAlert ?? false;
		}
		return false;
	}

	// Resizes all relevant player attributes.
	AblePlayer.prototype.resizePlayer = function (width, height) {

		var captionSize, newWidth, newHeight, $iframe;

		if (this.mediaType === 'audio') {
			return;
		}
		if (typeof width !== 'undefined' && typeof height !== 'undefined') {
			// this is being called the first time a player is initialized
			// width and height were collected from the HTML, YouTube, or Vimeo media API
			// so are reflective of the actual size of the media
			// use these values to calculate aspectRatio
			this.aspectRatio = height / width;
			if (this.playerWidth) {
				// default width is already defined via a width or data-width attribute. Use that.
				newWidth = this.playerWidth;
				if (this.playerHeight) {
					newHeight = this.playerHeight;
				} else {
					newHeight = Math.round(newWidth * this.aspectRatio);
					this.playerHeight = newHeight;
				}
			} else {
				// playerWidth was not defined via HTML attributes
				newWidth = (this.player === 'html5') ? $(window).width() : this.$ableWrapper.width();
				newHeight = Math.round(newWidth * this.aspectRatio);
			}
		} else if (this.fullscreen) {
			this.$ableWrapper.addClass('fullscreen');
			newWidth = $(window).width();
			// the 5 pixel buffer is arbitrary, but results in a better fit for all browsers
			newHeight = $(window).height() - this.$playerDiv.outerHeight() - 5;
			this.positionCaptions('overlay');
		} else { // not fullscreen, and not first time initializing player
			this.$ableWrapper.removeClass('fullscreen');
			if (this.player === 'html5') {
				newWidth = (this.playerWidth) ? this.playerWidth : $(window).width();
			} else {
				newWidth = this.$ableWrapper.width();
			}
			newHeight = Math.round(newWidth * this.aspectRatio);
			this.positionCaptions(this.prefCaptionsPosition);
		}
		if (this.debug) {
			console.log('resizePlayer to ' + newWidth + 'x' + newHeight);
		}
		// Now size the player with newWidth and newHeight
		if (this.player === 'youtube' || this.player === 'vimeo') {
			$iframe = this.$ableWrapper.find('iframe');
			if (this.player === 'youtube' && this.youTubePlayer) {
				// alternatively, YouTube API offers a method for setting the video size
				// this adds width and height attributes to the iframe
				// but might have other effects, so best to do it this way
				this.youTubePlayer.setSize(newWidth,newHeight);
			} else {
				// Vimeo API does not have a method for changing size of player
				// Therefore, need to change iframe attributes directly
				$iframe.attr({
					'width': newWidth,
					'height': newHeight
				});
			}
			if (this.playerWidth && this.playerHeight) {
				if (this.fullscreen) {
					// remove constraints
					$iframe.css({
						'max-width': '',
						'max-height': ''
					});
				} else {
					// use CSS on iframe to enforce explicitly defined size constraints
					$iframe.css({
						'max-width': this.playerWidth + 'px',
						'max-height': this.playerHeight + 'px'
					});
				}
			}
		} else if (this.player === 'html5') {
			if (this.fullscreen) {
				this.$media.attr({
					'width': newWidth,
					'height': newHeight
				});
				this.$ableWrapper.css({
					'width': newWidth,
					'height': newHeight
				});
			} else {
					// No constraints. Let CSS handle the positioning.
				this.$media.removeAttr('width height');
				this.$ableWrapper.removeAttr( 'style' );
			}
		}
		// Resize captions
		if (typeof this.$captionsDiv !== 'undefined') {

			// Font-size is too small in full screen view
			// use viewport units (vw) for large viewports
			// % units work fine if not fullscreen
			// prefCaptionSize is expressed as a percentage
			var isSmallScreen = false;
			var windowWidth = window.screen.width;
			if ( windowWidth < 1200 ) {
				isSmallScreen = true;
			}
			captionSize = parseInt(this.prefCaptionsSize,10);
			if (this.fullscreen && ! isSmallScreen ) {
				captionSize = (captionSize / 100) + 'vw';
			} else if ( this.fullscreen && isSmallScreen ) {
				captionSize = '1.2rem';
			} else {
				captionSize = captionSize + '%';
			}
			this.$captionsDiv.css({
				'font-size': captionSize
			});
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
		} else if (which == 'sign') {
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

	AblePlayer.prototype.updateZIndex = function(which) {

		// update z-index of 'transcript' or 'sign', relative to each other
		// direction is always 'up' (i.e., move window to top)
		// windows come to the top when the user clicks on them
		var defHighZ, defLowZ, transcriptZ, signZ, newHighZ, newLowZ;

		// set the default z-indexes, as defined in ableplayer.css
		defHighZ = 8000; // by default, assigned to the sign window
		defLowZ = 7000; // by default, assigned to the transcript area

		// Previously collected the highest z-index. Removed in 4.6.
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
			} else if (typeof this.$signWindow !== 'undefined') {
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
		} else if (transcriptZ > signZ) {
			if (which === 'transcript') {
				// transcript is already on top; nothing to do
				return false;
			} else {
				// swap z's
				newHighZ = transcriptZ;
				newLowZ = signZ;
			}
		} else { // signZ is greater
			if (which === 'sign') {
				// sign is already on top; nothing to do
				return false;
			} else {
				newHighZ = signZ;
				newLowZ = transcriptZ;
			}
		}
		// now assign the new values
		if (which === 'transcript') {
			this.$transcriptArea.css('z-index',newHighZ);
			this.$signWindow.css('z-index',newLowZ);
		} else if (which === 'sign') {
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
		// Change the transcript language if the transcript is not currently visible.
		if ( ( ! this.$transcriptArea.is(':visible') && source === 'captions' ) || source === 'init' || source === 'transcript' ) {
			console.log('syncTrackLanguages: transcript is not visible, so changing transcript language to ' + language);
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
			this.transcriptLang = language;
		}
		if (source === 'init' || source === 'captions') {
			this.captionLang = language;
			this.selectedCaptions = captions;
			this.selectedChapters = chapters;
			this.selectedDescriptions = descriptions;
			this.selectedMeta = meta;
			this.updateChaptersList();
		}
		if (this.selectedDescriptions) {
			// updating description voice to match new description language
			this.setDescriptionVoice();
			if (this.$sampleDescDiv) {
				if (this.sampleText) {
					for (i = 0; i < this.sampleText.length; i++) {
						if (this.sampleText[i].lang === this.selectedDescriptions.language) {
							this.currentSampleText = this.sampleText[i]['text'];
							this.$sampleDescDiv.html(this.currentSampleText);
						}
					}
				}
			}
		}
		this.updateTranscript();
	};

}

export default addControlFunctions;
