(function ($) {
	// Media events
	AblePlayer.prototype.onMediaUpdateTime = function (duration, elapsed) {

		// duration and elapsed are passed from callback functions of Vimeo API events
		// duration is expressed as sss.xxx
		// elapsed is expressed as sss.xxx
		var thisObj = this;
		this.getMediaTimes(duration,elapsed).then(function(mediaTimes) {
			thisObj.duration = mediaTimes['duration'];
			thisObj.elapsed = mediaTimes['elapsed'];
			if (thisObj.duration > 0) {
				// do all the usual time-sync stuff during playback
				if (thisObj.prefHighlight === 1) {
					thisObj.highlightTranscript(thisObj.elapsed);
				}
				thisObj.updateCaption(thisObj.elapsed);
				thisObj.showDescription(thisObj.elapsed);
				thisObj.updateChapter(thisObj.elapsed);
				thisObj.updateMeta(thisObj.elapsed);
				thisObj.refreshControls('timeline', thisObj.duration, thisObj.elapsed);
			}
		});
	};

	AblePlayer.prototype.onMediaPause = function () {

		if (this.controlsHidden) {
			this.fadeControls('in');
			this.controlsHidden = false;
		}
		if (this.hideControlsTimeoutStatus === 'active') {
			window.clearTimeout(this.hideControlsTimeout);
			this.hideControlsTimeoutStatus = 'clear';

		}
		this.refreshControls('playpause');
	};

	AblePlayer.prototype.onMediaComplete = function () {
		// if there's a playlist, advance to next item and start playing
		if (this.hasPlaylist && !this.cueingPlaylistItem) {
			if (this.playlistIndex === (this.$playlist.length - 1)) {
				// this is the last track in the playlist
				if (this.loop) {
					this.playlistIndex = 0;
					this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
					this.cuePlaylistItem(0);
				} else {
					this.playing = false;
					this.paused = true;
				}
			} else {
				// this is not the last track. Play the next one.
				this.playlistIndex++;
				this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
				this.cuePlaylistItem(this.playlistIndex)
			}
		}
		this.refreshControls();
	};

	AblePlayer.prototype.onMediaNewSourceLoad = function () {

		var loadIsComplete = false;

		if (this.cueingPlaylistItem) {
			// this variable was set to address bugs caused by multiple firings of media 'end' event
			// safe to reset now
			this.cueingPlaylistItem = false;
		}
		if (this.recreatingPlayer) {
			// same as above; different bugs
			this.recreatingPlayer = false;
		}
		if (this.playbackRate) {
			// user has set playbackRate on a previous src or track
			// use that setting on the new src or track too
			this.setPlaybackRate(this.playbackRate);
		}
		if (this.userClickedPlaylist) {
			if (!this.startedPlaying || this.okToPlay) {
				// start playing; no further user action is required
				this.playMedia();
				loadIsComplete = true;
			 }
		} else if (this.seekTrigger == 'restart' ||
				this.seekTrigger == 'chapter' ||
				this.seekTrigger == 'transcript' ||
				this.seekTrigger == 'search'
				) {
			// by clicking on any of these elements, user is likely intending to play
			// Not included: elements where user might click multiple times in succession
			// (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
			this.playMedia();
			loadIsComplete = true;
		} else if (this.swappingSrc) {
			// new source file has just been loaded
			if (this.hasPlaylist) {
				// a new source file from the playlist has just been loaded
				if ((this.playlistIndex !== this.$playlist.length) || this.loop) {
					// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
					this.playMedia();
					loadIsComplete = true;
				}
			} else if (this.swapTime > 0) {
				if (this.seekStatus === 'complete') {
					if (this.okToPlay) {
						// should be able to resume playback
						this.playMedia();
					}
					loadIsComplete = true;
				} else if (this.seekStatus === 'seeking') {
					// Do nothing.
				} else {
					if (this.swapTime === this.elapsed) {
						// seek is finished!
						this.seekStatus = 'complete';
						if (this.okToPlay) {
							// should be able to resume playback
							this.playMedia();
						}
						loadIsComplete = true;
					} else {
						// seeking hasn't started yet
						// first, determine whether it's possible
						if (this.hasDescTracks) {
							// do nothing. Unable to seek ahead if there are descTracks
							loadIsComplete = true;
						} else if (this.durationsAreCloseEnough(this.duration,this.prevDuration)) {
							// durations of two sources are close enough to making seek ahead in new source ok
							this.seekStatus = 'seeking';
							this.seekTo(this.swapTime);
						} else {
							// durations of two sources are too dissimilar to support seeking ahead to swapTime.
							loadIsComplete = true;
						}
					}
				}
			} else {
				// swapTime is 0. No seeking required.
				if (this.playing) {
					this.playMedia();
					// swap is complete. Reset vars.
					loadIsComplete = true;
				}
			}
		} else if (!this.startedPlaying) {
			if (this.startTime > 0) {
				if (this.seeking) {
					// a seek has already been initiated
					// since canplaythrough has been triggered, the seek is complete
					this.seeking = false;
					if (this.okToPlay) {
						this.playMedia();
					}
					loadIsComplete = true;
				} else {
					// haven't started seeking yet
					this.seekTo(this.startTime);
				}
			} else if (this.defaultChapter && typeof this.selectedChapters !== 'undefined') {
				this.seekToChapter(this.defaultChapter);
			} else {
				// there is no startTime, therefore no seeking required
				if (this.okToPlay) {
					this.playMedia();
				}
				loadIsComplete = true;
			}
		} else if (this.hasPlaylist) {
			// new source media is part of a playlist, but user didn't click on it
			// (and somehow, swappingSrc is false)
			// this may happen when the previous track ends and next track loads
			// this same code is called above when swappingSrc is true
			if ((this.playlistIndex !== this.$playlist.length) || this.loop) {
				// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
				this.playMedia();
				loadIsComplete = true;
			}
		} else {
			// None of the above.
			// User is likely seeking to a new time, but not loading a new media source
			// need to reset vars
			loadIsComplete = true;
		}
		if (loadIsComplete) {
			// reset vars
			this.swappingSrc = false;
			this.seekStatus = null;
			this.swapTime = 0;
			this.seekTrigger = null;
			this.seekingFromTranscript = false;
			this.userClickedPlaylist = false;
			this.okToPlay = false;
		}
		this.refreshControls();
		if (this.$focusedElement) {
			this.restoreFocus();
			this.$focusedElement = null;
			this.activeMedia = null;
		}
	};

	AblePlayer.prototype.durationsAreCloseEnough = function(d1,d2) {

		// Compare the durations of two media sources to determine whether it's ok to seek ahead after swapping src
		// The durations may not be exact, but they might be "close enough"
		// returns true if "close enough", otherwise false

		var tolerance, diff;

		tolerance = 1;  // number of seconds between rounded durations that is considered "close enough"
		diff = Math.abs(Math.round(d1) - Math.round(d2));

		return (diff <= tolerance) ? true : false;
	};

	AblePlayer.prototype.restoreFocus = function() {

		// function called after player has been rebuilt (during media swap)
		// the original focusedElement no longer exists,
		// but this function finds a match in the new player
		// and places focus there

		var classList, $mediaParent;

		if ( this.$focusedElement && null !== this.activeMedia ) {
			$mediaParent = $( '#' + this.activeMedia ).closest( '.able' );
			if ( (this.$focusedElement).attr('role') === 'button' ) {
				classList = this.$focusedElement.attr("class").split(/\s+/);
				$.each(classList, function(index, item) {
					if (item.substring(0,20) === 'able-button-handler-') {
						$mediaParent.find('div.able-controller div.' + item).trigger('focus');
					}
				});
			}
		}

	};

	AblePlayer.prototype.addSeekbarListeners = function () {

		var thisObj = this;

		// Handle seek bar events.
		this.seekBar.bodyDiv.on('startTracking', function (e) {
			thisObj.pausedBeforeTracking = thisObj.paused;
			thisObj.pauseMedia();
		}).on('tracking', function (e, position) {
			// Scrub transcript, captions, and metadata.
			thisObj.highlightTranscript(position);
			thisObj.updateCaption(position);
			thisObj.showDescription(position);
			thisObj.updateChapter(thisObj.convertChapterTimeToVideoTime(position));
			thisObj.updateMeta(position);
			thisObj.refreshControls();
		}).on('stopTracking', function (e, position) {
			if (thisObj.useChapterTimes) {
				thisObj.seekTo(thisObj.convertChapterTimeToVideoTime(position));
			} else {
				thisObj.seekTo(position);
			}
			if (!thisObj.pausedBeforeTracking) {
				setTimeout(function () {
					thisObj.playMedia();
				}, 200);
			}
		});
	};

	AblePlayer.prototype.onClickPlayerButton = function (el) {
		var whichButton, prefsPopup;
		whichButton = this.getButtonNameFromClass($(el).attr('class'));
		switch ( whichButton ) {
			case 'play':
				this.clickedPlay = true;
				this.handlePlay();
				break;
			case 'restart':
				this.seekTrigger = 'restart';
				this.handleRestart();
				break;
			case 'previous':
				this.userClickedPlaylist = true;
				this.okToPlay = true;
				this.seekTrigger = 'previous';
				this.buttonWithFocus = 'previous';
				this.handlePrevTrack();
				break;
			case 'next':
				this.userClickedPlaylist = true;
				this.okToPlay = true;
				this.seekTrigger = 'next';
				this.buttonWithFocus = 'next';
				this.handleNextTrack();
				break;
			case 'rewind':
				this.seekTrigger = 'rewind';
				this.handleRewind();
				break;
			case 'forward':
				this.seekTrigger = 'forward';
				this.handleFastForward();
				break;
			case 'mute':
				this.handleMute();
				break;
			case 'volume':
				this.handleVolumeButtonClick();
				break;
			case 'faster':
				this.handleRateIncrease();
				break;
			case 'slower':
				this.handleRateDecrease();
				break;
			case 'captions':
				this.handleCaptionToggle();
				break;
			case 'chapters':
				this.handleChapters();
				break;
			case 'descriptions':
				this.handleDescriptionToggle();
				break;
			case 'sign':
				if ( ! this.closingSign ) {
					this.handleSignToggle();
				}
				break;
			case 'preferences':
				if ($(el).attr('data-prefs-popup') === 'menu') {
					this.handlePrefsClick();
				} else {
					this.showingPrefsDialog = true; // stopgap
					this.closePopups();
					prefsPopup = $(el).attr('data-prefs-popup');
					if (prefsPopup === 'keyboard') {
						this.keyboardPrefsDialog.show();
					} else if (prefsPopup === 'captions') {
						this.captionPrefsDialog.show();
					} else if (prefsPopup === 'descriptions') {
						this.descPrefsDialog.show();
					} else if (prefsPopup === 'transcript') {
						this.transcriptPrefsDialog.show();
					}
					this.showingPrefsDialog = false;
				}
				break;
			case 'transcript':
				if ( !this.closingTranscript ) {
					this.handleTranscriptToggle();
				}
				break;
			case 'fullscreen':
				this.clickedFullscreenButton = true;
				this.handleFullscreenToggle();
				break;
		}
	};

	AblePlayer.prototype.getButtonNameFromClass = function (classString) {
		// player control buttons all have class="able-button-handler-x"  where x is the identifier
		// buttons might also have other classes assigned though
		var classes, i;

		classes = classString.split(' ');
		for (i = 0; i < classes.length; i++) {
			if (classes[i].substring(0,20) === 'able-button-handler-') {
				return classes[i].substring(20);
			}
		}
		return classString;
	}

	AblePlayer.prototype.okToHandleKeyPress = function () {
		let defaultReturn = true;
		if ( this.prefNoKeyShortcuts === 1 ) {
			defaultReturn = false;
		}
		// returns true unless user's focus is on a UI element or user has disabled keyboard shortcuts.
		// that is likely to need supported keystrokes, including space
		var activeElement = AblePlayer.getActiveDOMElement();

		return ($(activeElement).prop('tagName') === 'INPUT') ? false : defaultReturn;
	};

	AblePlayer.prototype.onPlayerKeyPress = function (e) {

		// handle keystrokes (using DHTML Style Guide recommended key combinations)
		// https://web.archive.org/web/20130127004544/http://dev.aol.com/dhtml_style_guide/#mediaplayer
		// Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
		// - Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
		// The rest are reasonable best choices
		// - If there are multiple players on a single page, keystroke handlers
		// are only bound to the FIRST player
		// - The DHTML Style Guide is now the W3C WAI-ARIA Authoring Guide and has undergone many revisions
		// including removal of the "media player" design pattern. There's an issue about that:
		// https://github.com/w3c/aria-practices/issues/27

		var key, $thisElement;

		// Convert to lower case.
		key = e.key;
		$thisElement = $(document.activeElement);

		if (key === 'Escape') {
			if (this.$transcriptArea && $.contains(this.$transcriptArea[0],$thisElement[0]) && !this.hidingPopup) {
				// This element is part of transcript area.
				this.handleTranscriptToggle();
				return false;
			}
		}
		if (!this.okToHandleKeyPress()) {
			return false;
		}

		// Only use keypress to control player if focus is NOT on a form field or contenteditable element
		// (or a textarea element with player in stenoMode)
		if (!(
			$(':focus').is('[contenteditable]') ||
			$(':focus').is('input') ||
			($(':focus').is('textarea') && !this.stenoMode) ||
			$(':focus').is('select') ||
			e.target.hasAttribute('contenteditable') ||
			e.target.tagName === 'INPUT' ||
			(e.target.tagName === 'TEXTAREA' && !this.stenoMode) ||
			e.target.tagName === 'SELECT'
		)){
			if (key === 'Escape') {
				this.closePopups();
				this.$tooltipDiv.hide();
				this.seekBar.hideSliderTooltips();
			} else if (key === ' ') {
				// disable spacebar support for play/pause toggle as of 4.2.10
				// spacebar should not be handled everywhere on the page, since users use that to scroll the page
				// when the player has focus, most controls are buttons so spacebar should be used to trigger the buttons
				if ($thisElement.attr('role') === 'button') {
					// register a click on this element
					e.preventDefault();
					$thisElement.trigger( 'click' );
				}
			} else if ( key === 'p' ) {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePlay();
				}
			} else if (key === 's') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleRestart();
				}
			} else if (key === 'm') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleMute();
				}
			} else if (key === 'v') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleVolumeButtonClick();
				}
			} else if (key >= 0 && key <= 9) {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleVolumeKeystroke(key);
				}
			} else if (key === 'c') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleCaptionToggle();
				}
			} else if (key === 'd') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleDescriptionToggle();
				}
			} else if (key === 'f') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleFastForward();
				}
			} else if (key === 'r') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleRewind();
				}
			} else if (key === 'b') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePrevTrack();
				}
			} else if (key === 'n') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleNextTrack();
				}
			} else if (key === 'e') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePrefsClick();
				}
			} else if (key === 'Enter') {
				if ($thisElement.attr('role') === 'button' || $thisElement.prop('tagName') === 'SPAN') {
					// register a click on this element
					// if it's a transcript span the transcript span click handler will take over
					$thisElement.trigger( 'click' );
				} else if ($thisElement.prop('tagName') === 'LI') {
					$thisElement.trigger( 'click' );
				}
			}
		}
	};

	AblePlayer.prototype.addHtml5MediaListeners = function () {

		var thisObj = this;

		// NOTE: iOS and some browsers do not support autoplay
		// and no events are triggered until media begins to play
		// Able Player gets around this by automatically loading media in some circumstances
		// (see initialize.js > initPlayer() for details)

		this.$media
			.on('emptied',function() {
				// do something
			})
			.on('loadedmetadata',function() {
				// should be able to get duration now
				thisObj.duration = thisObj.media.duration;
			})
			.on('canplay',function() {
				// previously handled seeking to startTime here
				// but it's probably safer to wait for canplaythrough
				// so we know player can seek ahead to anything
			})
			.on('canplaythrough',function() {
				// previously onMediaNewSourceLoad() was called on 'loadedmetadata'
				// but that proved to be too soon for some of this functionality.
				// TODO: Monitor this. If moving it here causes performance issues,
				// consider moving some or all of this functionality to 'canplay'
				thisObj.onMediaNewSourceLoad();
			})
			.on('play',function() {
				// 'play' indicates that the play method has been called.
				// Don't do anything until playback has actually started.
			})
			.on('playing',function() {
				// 'playing' indicates that the video is playing.
				thisObj.playing = true;
				thisObj.paused = false;
				thisObj.swappingSrc = false;
				thisObj.refreshControls('playpause');
			})
			.on('ended',function() {
				thisObj.playing = false;
				thisObj.paused = true;
				thisObj.onMediaComplete();
			})
			.on('progress', function() {
				thisObj.refreshControls('timeline');
			})
			.on('waiting',function() {
				// could fire a notification about loss of data.
			})
			.on('durationchange',function() {
				// Display new duration.
				thisObj.refreshControls('timeline');
			})
			.on('timeupdate',function() {
				thisObj.onMediaUpdateTime(); // includes a call to refreshControls()
			})
			.on('pause',function() {
				if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
					// this happens in some browsers when swapping source
					// (e.g., between tracks in a playlist or swapping description)
					if (thisObj.hasPlaylist || thisObj.swappingSrc) {
						// do NOT set playing to false.
						// doing so prevents continual playback after new track is loaded
					} else {
						thisObj.playing = false;
						thisObj.paused = true;
					}
				} else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
				thisObj.clickedPlay = false; // done with this variable
				thisObj.onMediaPause(); // includes a call to refreshControls()
			})
			.on('ratechange',function() {
				// do something
			})
			.on('volumechange',function() {
				thisObj.volume = thisObj.getVolume();
			})
			.on('error',function() {
				if (thisObj.debug) {
					switch (thisObj.media.error.code) {
						case 1:
							console.log('HTML5 Media Error: MEDIA_ERR_ABORTED');
							break;
						case 2:
							console.log('HTML5 Media Error: MEDIA_ERR_NETWORK ');
							break;
						case 3:
							console.log('HTML5 Media Error: MEDIA_ERR_DECODE ');
							break;
						case 4:
							console.log('HTML5 Media Error: MEDIA_ERR_SRC_NOT_SUPPORTED ');
							break;
					}
				}
			});
	};

	AblePlayer.prototype.addVimeoListeners = function () {

		var thisObj = this;

		// Vimeo doesn't seem to support chaining of on() functions
		// so each event listener must be attached separately
		this.vimeoPlayer.on('loaded', function(vimeoId) {
			 // Triggered when a new video is loaded in the player
			thisObj.onMediaNewSourceLoad();
		 });
		this.vimeoPlayer.on('play', function(data) {
			// Triggered when the video plays
			thisObj.playing = true;
			thisObj.startedPlaying = true;
			thisObj.paused = false;
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('ended', function(data) {
			// Triggered any time the video playback reaches the end.
			// Note: when loop is turned on, the ended event will not fire.
			thisObj.playing = false;
			thisObj.paused = true;
			thisObj.onMediaComplete();
		});
		this.vimeoPlayer.on('bufferstart', function() {
			// Triggered when buffering starts in the player.
			// This is also triggered during preload and while seeking.
			// There is no associated data with this event.
		});
		this.vimeoPlayer.on('bufferend', function() {
			// Triggered when buffering ends in the player.
			// This is also triggered at the end of preload and seeking.
			// There is no associated data with this event.
		});
		this.vimeoPlayer.on('progress', function(data) {
			// Triggered as the video is loaded.
			 // Reports back the amount of the video that has been buffered (NOT the amount played)
			 // Data has keys duration, percent, and seconds
		});
		this.vimeoPlayer.on('seeking', function(data) {
		 	// Triggered when the player starts seeking to a specific time.
			 // A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('seeked', function(data) {
			// Triggered when the player seeks to a specific time.
			// A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('timeupdate',function(data) {
			// Triggered as the currentTime of the video updates.
			 // It generally fires every 250ms, but it may vary depending on the browser.
			thisObj.onMediaUpdateTime(data['duration'], data['seconds']);
		});
		this.vimeoPlayer.on('pause',function(data) {
			// Triggered when the video pauses
			if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
				// this happens in some browsers (not Chrome, as of 70.x)
				// when swapping source (e.g., between tracks in a playlist, or swapping description)
				if (thisObj.hasPlaylist || thisObj.swappingSrc) {
						// do NOT set playing to false.
					// doing so prevents continual playback after new track is loaded
				} else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
			} else {
				thisObj.playing = false;
				thisObj.paused = true;
			}
			thisObj.clickedPlay = false; // done with this variable
			thisObj.onMediaPause();
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('playbackratechange',function(data) {
			// Triggered when the playback rate of the video in the player changes.
			// The ability to change rate can be disabled by the creator
			// and the event will not fire for those videos.
			// data contains one key: 'playbackRate'
			thisObj.vimeoPlaybackRate = data['playbackRate'];
		});
		this.vimeoPlayer.on('texttrackchange', function(data) {
			// Triggered when the active text track (captions/subtitles) changes.
			// The values will be null if text tracks are turned off.
			// data contains three keys: kind, label, language
		});
		this.vimeoPlayer.on('volumechange',function(data) {
			// Triggered when the volume in the player changes.
			// Some devices do not support setting the volume of the video
			// independently from the system volume,
			// so this event will never fire on those devices.
			thisObj.volume = data['volume'] * 10;
		});
		this.vimeoPlayer.on('error',function(data) {
			// do something with the available data
			// data contains three keys: message, method, name
			// message: A user-friendly error message
			// method: The Vimeo API method call that triggered the error
			// name: Name of the error (not necesssarily user-friendly)
		});
	};

	AblePlayer.prototype.addEventListeners = function () {

		var thisObj = this;

		// Appropriately resize media player for full screen.
		$(window).on('resize',function () {
			thisObj.resizePlayer();
		});

		// Refresh player if it changes from hidden to visible
		// There is no event triggered by a change in visibility
		// but MutationObserver works in most browsers (but NOT in IE 10 or earlier)
		// http://caniuse.com/#feat=mutationobserver
		if (window.MutationObserver) {
			var target = this.$ableDiv[0];
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
						// the player's style attribute has changed. Check to see if it's visible
						if (thisObj.$ableDiv.is(':visible')) {
							thisObj.refreshControls();
						}
					}
				});
			});
			var config = { attributes: true, childList: true, characterData: true };
			observer.observe(target, config);
		}
		if (typeof this.seekBar !== 'undefined') {
			this.addSeekbarListeners();
		} else {
			// wait a bit and try again
			// TODO: Should set this up to keep trying repeatedly.
			// Seekbar listeners are critical.
			setTimeout(function() {
				if (typeof thisObj.seekBar !== 'undefined') {
					thisObj.addSeekbarListeners();
				}
			},2000);
		}

		// handle clicks on player buttons
		this.$controllerDiv.find('div[role="button"]').on('click',function(e){
			e.stopPropagation();
			thisObj.onClickPlayerButton(this);
		});

		// handle clicks (left only) anywhere on the page. If any popups are open, close them.
		$('body').on('click', function(e) {

			if (e.button !== 0) { // not a left click
				return false;
			}
			if ($('.able-popup:visible').length || $('.able-volume-slider:visible').length ) {
				// at least one popup is visible
				thisObj.closePopups();
			}
			if (e.target.tagName === 'VIDEO') {
				// user clicked the video (not an element that sits on top of the video)
				// handle this as a play/pause toggle click
				thisObj.clickedPlay = true;
			}
		});

		// handle mouse movement over player; make controls visible again if hidden
		this.$ableDiv.on('mousemove',function() {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					// after showing controls, hide them again after a brief timeout
					thisObj.invokeHideControlsTimeout();
				}
			} else {
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		// if user presses a key from anywhere on the page, show player controls
		$(document).on( 'keydown', function(e) {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					// after showing controls, hide them again after a brief timeout
					thisObj.invokeHideControlsTimeout();
				}
			} else {
				// controls are visible
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';

					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		// handle local keydown events if this isn't the only player on the page;
		// otherwise these are dispatched by global handler (see ableplayer-base.js)
		this.$ableDiv.on( 'keydown', function (e) {
			if (AblePlayer.nextIndex > 1) {
				thisObj.onPlayerKeyPress(e);
			}
		});

		// If stenoMode is enabled in an iframe, handle keydown events from the iframe
		if (this.stenoMode && (typeof this.stenoFrameContents !== 'undefined')) {
			this.stenoFrameContents.on('keydown',function(e) {
				thisObj.onPlayerKeyPress(e);
			});
		};

		// transcript is not a child of this.$ableDiv
		// therefore, must be added separately
		if (this.$transcriptArea) {
			this.$transcriptArea.on('keydown',function (e) {
				if (AblePlayer.nextIndex > 1) {
					thisObj.onPlayerKeyPress(e);
				}
			});
		}

		// handle clicks on playlist items
		if (this.$playlist) {
			this.$playlist.on( 'click', function(e) {
				if (!thisObj.userClickedPlaylist) {
					// stopgap in case multiple clicks are fired on the same playlist item
					thisObj.userClickedPlaylist = true; // will be set to false after new src is loaded & canplaythrough is triggered
					thisObj.playlistIndex = $(this).index();
					thisObj.cuePlaylistItem(thisObj.playlistIndex);
				}
			});
		}

		// Also play/pause when clicking on the media.
		this.$media.on( 'click', function () {
			thisObj.handlePlay();
		});

		// add listeners for media events
		if (this.player === 'html5') {
			this.addHtml5MediaListeners();
		} else if (this.player === 'vimeo') {
			 this.addVimeoListeners();
		} else if (this.player === 'youtube') {
			// Youtube doesn't give us time update events, so we just periodically generate them ourselves
			setInterval(function () {
				thisObj.onMediaUpdateTime();
			}, 300);
		}
	};
})(jQuery);
